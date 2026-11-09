import { check, sha } from "./domain.js";
import {
  createVapidKeys,
  validateSubscription,
  pushEndpoint,
  pushRequest,
  deliverPush,
} from "./web-push.js";
export const PUSH_SCHEMA = `
CREATE TABLE IF NOT EXISTS push_configuration(id INTEGER PRIMARY KEY CHECK(id=1),data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS push_subscriptions(id TEXT PRIMARY KEY,user_id INTEGER NOT NULL,kitchen_id INTEGER NOT NULL,session_token TEXT NOT NULL,data TEXT NOT NULL,revision TEXT NOT NULL,created REAL NOT NULL,last_sent_day TEXT,last_sent_at REAL,last_test_at REAL,retry_after REAL NOT NULL DEFAULT 0,lease_until REAL NOT NULL DEFAULT 0,last_attempt REAL NOT NULL DEFAULT 0,last_error TEXT);
CREATE TABLE IF NOT EXISTS push_scheduler(id INTEGER PRIMARY KEY CHECK(id=1),last_run REAL NOT NULL);
`;
export function reminderPlan(foods, prefs, when = Date.now()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: prefs.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(when))
      .map((p) => [p.type, p.value]),
  );
  const day = `${parts.year}-${parts.month}-${parts.day}`;
  const active = foods.filter((f) => f.status === "active" && !f.food_warning &&
    (f.quantity == null || f.quantity > 0) && f.effective_date &&
    Number.isFinite(Date.parse(f.effective_date)));
  const overdue = active.filter((f) => f.effective_date < day);
  const due = active.filter((f) => {
    const days = (Date.parse(f.effective_date) - Date.parse(day)) / 86400000;
    return days >= 0 && days <= prefs.reminder_days;
  });
  return {
    day,
    inWindow: prefs.reminders === true && parts.hour === "09",
    due,
    overdue,
  };
}
export class PushService {
  constructor(store, env) {
    this.store = store;
    this.env = env;
    this.running = false;
  }
  async keys() {
    let row = this.store.one("SELECT data FROM push_configuration WHERE id=1");
    if (row) return JSON.parse(row.data);
    const keys = await createVapidKeys();
    this.store.sql.exec(
      "INSERT INTO push_configuration VALUES(1,?)",
      JSON.stringify(keys),
    );
    return keys;
  }
  async config(prefs) {
    return {
      publicKey: (await this.keys()).publicKey,
      provider: this.env.PUSH_TRANSPORT ? "test-fixture" : "web-push",
      schedule: {
        hour: 9,
        timezone: prefs.timezone,
        cron: "*/5 * * * *",
        last_run:
          this.store.one("SELECT last_run FROM push_scheduler WHERE id=1")
            ?.last_run ?? null,
      },
    };
  }
  removeSession(token) {
    this.store.sql.exec(
      "DELETE FROM push_subscriptions WHERE session_token=?",
      token,
    );
  }
  removeMember(uid, kid) {
    this.store.sql.exec(
      "DELETE FROM push_subscriptions WHERE user_id=? AND kitchen_id=?",
      uid,
      kid,
    );
  }
  async subscribe(session, member, data) {
    const sub = await validateSubscription(data.subscription),
      id = await sha(sub.endpoint),
      uid = session.user_id,
      kid = member.kitchen_id;
    const old = this.store.one(
      "SELECT * FROM push_subscriptions WHERE id=?",
      id,
    );
    check(!old || old.user_id === uid, "push_in_use", 409);
    if (
      old &&
      old.kitchen_id === kid &&
      old.session_token === session.token &&
      old.data === JSON.stringify(sub)
    )
      return { subscribed: true };
    if (!old) {
      check(
        this.store.one(
          "SELECT COUNT(*) AS n FROM push_subscriptions WHERE user_id=?",
          uid,
        ).n < 5,
        "push_limit",
        409,
      );
      check(
        this.store.one("SELECT COUNT(*) AS n FROM push_subscriptions").n < 1000,
        "push_limit",
        409,
      );
    }
    this.store.sql.exec(
      `INSERT INTO push_subscriptions(id,user_id,kitchen_id,session_token,data,revision,created) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET kitchen_id=excluded.kitchen_id,session_token=excluded.session_token,data=excluded.data,revision=excluded.revision,retry_after=0,lease_until=0,last_error=NULL`,
      id,
      uid,
      kid,
      session.token,
      JSON.stringify(sub),
      crypto.randomUUID(),
      Date.now(),
    );
    return { subscribed: true };
  }
  async status(session, member, data) {
    const id = await sha(pushEndpoint(data.endpoint));
    const row = this.store.one(
      "SELECT last_sent_at,last_test_at,last_error FROM push_subscriptions WHERE id=? AND user_id=? AND kitchen_id=? AND session_token=?",
      id,
      session.user_id,
      member.kitchen_id,
      session.token,
    );
    return {
      subscribed: !!row,
      last_sent_at: row?.last_sent_at ?? null,
      last_test_at: row?.last_test_at ?? null,
      last_error: row?.last_error ?? null,
    };
  }
  async unsubscribe(session, data) {
    if (data.endpoint) {
      const id = await sha(pushEndpoint(data.endpoint));
      this.store.sql.exec(
        "DELETE FROM push_subscriptions WHERE id=? AND user_id=? AND session_token=?",
        id,
        session.user_id,
        session.token,
      );
    } else this.removeSession(session.token);
    return { subscribed: false };
  }
  async prepareTest(auth, data) {
    const id = await sha(pushEndpoint(data.endpoint)),
      row = this.store.one(
        "SELECT * FROM push_subscriptions WHERE id=? AND user_id=? AND kitchen_id=? AND session_token=?",
        id,
        auth.session.user_id,
        auth.member.kitchen_id,
        auth.session.token,
      );
    check(row, "push_not_subscribed", 409);
    return {
      row,
      keys: await this.keys(),
      language: auth.preferences.language,
    };
  }
  payload(language, test = false, kind = "upcoming") {
    return {
      title: kind === "expired" && !test
        ? language === "zh-Hant" ? "過期警告 · Last Minute Bites" : "Use-by warning · Last Minute Bites"
        : "Last Minute Bites",
      body: language === "zh-Hant"
        ? test ? "推播已成功連接。之後可收到食材日期提醒。"
          : kind === "expired" ? "有食材已超過食用期限，請勿食用。開啟 App 查看並處理。"
          : kind === "overdue" ? "有食物日期已過，請立即開啟 App 檢查標示及處理。"
          : "你的食材日期有新的提醒，開啟 App 查看。"
        : test ? "Push is connected. Food date reminders can now reach this device."
          : kind === "expired" ? "Some food is past its use-by date. Do not eat it. Open the app to review."
          : kind === "overdue" ? "Some food dates have passed. Open the app to check labels and review."
          : "You have food date reminders. Open the app to view them.",
      url: "/#kitchen",
      tag: test ? "lmb-push-test" : "lmb-food-dates",
    };
  }
  async send(row, keys, language, test = false, kind = "upcoming") {
    const request = await pushRequest(
      JSON.parse(row.data),
      this.payload(language, test, kind),
      keys,
      this.env.PUBLIC_ORIGIN ||
        "https://last-minute-bites-demo.jzalx789.workers.dev",
    );
    if (!test && kind === "expired") request.headers.Urgency = "high";
    return deliverPush(request, this.env.PUSH_TRANSPORT);
  }
  finish(row, result, when, day = null) {
    const s = this.store;
    if ([404, 410].includes(result.status)) {
      s.sql.exec(
        "DELETE FROM push_subscriptions WHERE id=? AND revision=?",
        row.id,
        row.revision,
      );
      return;
    }
    if (result.status >= 200 && result.status < 300) {
      if (day)
        s.sql.exec(
          "UPDATE push_subscriptions SET last_sent_day=?,last_sent_at=?,lease_until=0,retry_after=0,last_error=NULL WHERE id=? AND revision=?",
          day,
          when,
          row.id,
          row.revision,
        );
      else
        s.sql.exec(
          "UPDATE push_subscriptions SET last_test_at=?,last_error=NULL WHERE id=? AND revision=?",
          when,
          row.id,
          row.revision,
        );
    } else if (day)
      s.sql.exec(
        "UPDATE push_subscriptions SET lease_until=0,retry_after=?,last_error=? WHERE id=? AND revision=?",
        when + Math.max(300, result.retryAfter || 300) * 1000,
        "service_" + result.status,
        row.id,
        row.revision,
      );
    else
      s.sql.exec(
        "UPDATE push_subscriptions SET last_error=? WHERE id=? AND revision=?",
        "service_" + result.status,
        row.id,
        row.revision,
      );
  }
  async scheduled(when = Date.now()) {
    if (this.running) return { busy: true };
    this.running = true;
    const s = this.store;
    let sent = 0,
      failed = 0;
    try {
      const jobs = await s.locked(async () => {
        s.sql.exec(
          "INSERT INTO push_scheduler VALUES(1,?) ON CONFLICT(id) DO UPDATE SET last_run=excluded.last_run",
          when,
        );
        s.sql.exec(
          "DELETE FROM push_subscriptions WHERE NOT EXISTS(SELECT 1 FROM sessions WHERE token=push_subscriptions.session_token AND user_id=push_subscriptions.user_id AND expires>?) OR NOT EXISTS(SELECT 1 FROM memberships WHERE user_id=push_subscriptions.user_id AND kitchen_id=push_subscriptions.kitchen_id) OR EXISTS(SELECT 1 FROM kitchens k WHERE k.id=push_subscriptions.kitchen_id AND k.kind='party' AND (k.ended IS NOT NULL OR k.expires<=?))",
          when,
          when,
        );
        const rows = s.rows(
            "SELECT p.*,u.data AS preferences FROM push_subscriptions p JOIN user_preferences u ON u.user_id=p.user_id WHERE lease_until<=? AND retry_after<=? ORDER BY last_attempt ASC",
            when,
            when,
          ),
          picked = [];
        for (const row of rows) {
          const prefs = JSON.parse(row.preferences);
          const clock = reminderPlan([], prefs, when);
          if (!clock.inWindow || row.last_sent_day === clock.day) continue;
          const plan = reminderPlan(
            s.foods(row.kitchen_id, new Date(when).toISOString().slice(0, 10)),
            prefs,
            when,
          );
          if (
            !plan.inWindow ||
            !(plan.due.length || plan.overdue.length) ||
            row.last_sent_day === plan.day
          )
            continue;
          const sub = JSON.parse(row.data);
          if (sub.expirationTime && sub.expirationTime <= when) {
            s.sql.exec("DELETE FROM push_subscriptions WHERE id=?", row.id);
            continue;
          }
          s.sql.exec(
            "UPDATE push_subscriptions SET lease_until=?,last_attempt=? WHERE id=?",
            when + 300000,
            when,
            row.id,
          );
          picked.push({ ...row, day: plan.day, language: prefs.language });
          if (picked.length === 100) break;
        }
        if (!picked.length) return [];
        const keys = await this.keys();
        return picked.map((row) => ({ row, keys }));
      });
      // Limit network fan-out and keep all push-service waits outside the actor lock.
      for (let i = 0; i < jobs.length; i += 5)
        await Promise.all(
          jobs.slice(i, i + 5).map(async ({ row, keys }) => {
            const allowed = await s.locked(() => {
              const current = s.one(
                "SELECT p.*,u.data AS preferences FROM push_subscriptions p JOIN user_preferences u ON u.user_id=p.user_id JOIN memberships m ON m.user_id=p.user_id AND m.kitchen_id=p.kitchen_id JOIN sessions t ON t.token=p.session_token AND t.user_id=p.user_id WHERE p.id=? AND p.revision=? AND t.expires>?",
                row.id,
                row.revision,
                when,
              );
              if (!current) return false;
              const kitchen = s.one("SELECT kind,expires,ended FROM kitchens WHERE id=?",row.kitchen_id);
              if (kitchen?.kind === "party" && (kitchen.ended || kitchen.expires <= when)) return false;
              const prefs = JSON.parse(current.preferences),
                plan = reminderPlan(
                  s.foods(
                    row.kitchen_id,
                    new Date(when).toISOString().slice(0, 10),
                  ),
                  prefs,
                  when,
                );
              if (!plan.inWindow || !(plan.due.length || plan.overdue.length)) {
                s.sql.exec(
                  "UPDATE push_subscriptions SET lease_until=0 WHERE id=?",
                  row.id,
                );
                return false;
              }
              return {
                language: prefs.language,
                kind: plan.overdue.some((f) => f.date_source !== "personal" && f.date_kind === "use_by")
                  ? "expired" : plan.overdue.length ? "overdue" : "upcoming",
              };
            });
            if (!allowed) return;
            let result;
            try {
              result = await this.send(row, keys, allowed.language, false, allowed.kind);
            } catch {
              result = { status: 0 };
            }
            await s.locked(() => this.finish(row, result, when, row.day));
            if (result.status >= 200 && result.status < 300) sent++;
            else failed++;
          }),
        );
      return { sent, failed };
    } finally {
      this.running = false;
    }
  }
}
