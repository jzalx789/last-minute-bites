import { DurableObject } from "cloudflare:workers";
import {
  STYLES,
  validateRecipes,
  validatePhoto,
  validateRecognition,
} from "./ai.js";
import {
  Problem,
  check,
  text,
  integer,
  ingredients,
  defaults,
  calculateDate,
  todayIn,
  validateFood,
  eligible,
  equal,
  token,
  sha,
  passwordHash,
  verifyPassword,
} from "./domain.js";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS recipe_generations(id TEXT PRIMARY KEY,user_id INTEGER NOT NULL,kitchen_id INTEGER NOT NULL,cache_key TEXT NOT NULL,data TEXT NOT NULL,created REAL NOT NULL);
CREATE TABLE IF NOT EXISTS ai_usage(day TEXT NOT NULL,kind TEXT NOT NULL,user_id INTEGER NOT NULL,count INTEGER NOT NULL,PRIMARY KEY(day,kind,user_id));
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL,password TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id INTEGER REFERENCES users(id),csrf TEXT NOT NULL,expires REAL NOT NULL);
CREATE TABLE IF NOT EXISTS kitchens(id INTEGER PRIMARY KEY,name TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS memberships(user_id INTEGER PRIMARY KEY REFERENCES users(id),kitchen_id INTEGER NOT NULL REFERENCES kitchens(id),role TEXT NOT NULL CHECK(role IN ('owner','editor')));
CREATE UNIQUE INDEX IF NOT EXISTS one_owner ON memberships(kitchen_id) WHERE role='owner';
CREATE TABLE IF NOT EXISTS invitations(code TEXT PRIMARY KEY,kitchen_id INTEGER UNIQUE NOT NULL REFERENCES kitchens(id),expires REAL NOT NULL);
CREATE TABLE IF NOT EXISTS food_items(id INTEGER PRIMARY KEY AUTOINCREMENT,kitchen_id INTEGER NOT NULL REFERENCES kitchens(id),version INTEGER NOT NULL DEFAULT 1,status TEXT NOT NULL CHECK(status IN ('active','used')),data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS user_preferences(user_id INTEGER PRIMARY KEY REFERENCES users(id),data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS mutation_keys(user_id INTEGER NOT NULL REFERENCES users(id),request_key TEXT NOT NULL,kitchen_id INTEGER NOT NULL REFERENCES kitchens(id),body_hash TEXT NOT NULL,result TEXT NOT NULL,PRIMARY KEY(user_id,request_key));
`;
const securityHeaders = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(self), microphone=(), geolocation=()",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; worker-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
};
function respond(data, status = 200, cookie = null, secure = false) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    ...securityHeaders,
  };
  if (cookie)
    headers["Set-Cookie"] =
      `lmb_session=${cookie}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${secure ? "; Secure" : ""}`;
  if (secure) headers["Strict-Transport-Security"] = "max-age=31536000";
  return new Response(JSON.stringify(data), { status, headers });
}

export class KitchenStore extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.attempts = new Map();
    this.aiBusy = new Set();
    ctx.blockConcurrencyWhile(async () => {
      this.sql.exec(SCHEMA);
    });
  }
  rows(query, ...bindings) {
    return this.sql.exec(query, ...bindings).toArray();
  }
  one(query, ...bindings) {
    return this.rows(query, ...bindings)[0] ?? null;
  }
  insert(query, ...bindings) {
    this.sql.exec(query, ...bindings);
    return this.one("SELECT last_insert_rowid() AS id").id;
  }
  transaction(callback) {
    return this.ctx.storage.transactionSync(callback);
  }
  rate(key, count = 20) {
    const now = Date.now(),
      cutoff = now - 300000;
    for (const [k, v] of this.attempts)
      if (!v.length || v.at(-1) < cutoff) this.attempts.delete(k);
    const attempts = (this.attempts.get(key) || []).filter((t) => t >= cutoff);
    check(attempts.length < count, "rate_limited", 429);
    attempts.push(now);
    this.attempts.set(key, attempts);
  }
  async newSession(userId = null) {
    const value = token() + token(),
      csrf = token() + token(),
      hash = await sha(value);
    this.sql.exec(
      "INSERT INTO sessions VALUES(?,?,?,?)",
      hash,
      userId,
      csrf,
      Date.now() + 604800000,
    );
    this.cookie = value;
    this.session = { token: hash, user_id: userId, csrf };
  }
  member(owner = false) {
    const row = this.one(
      "SELECT m.*,k.name FROM memberships m JOIN kitchens k ON k.id=m.kitchen_id WHERE user_id=?",
      this.session.user_id,
    );
    check(row, "no_kitchen", 403);
    check(!owner || row.role === "owner", "owner_only", 403);
    return row;
  }
  prefs() {
    return JSON.parse(
      this.one(
        "SELECT data FROM user_preferences WHERE user_id=?",
        this.session.user_id,
      ).data,
    );
  }
  foods(kid, today) {
    return this.rows("SELECT * FROM food_items WHERE kitchen_id=?", kid).map(
      (r) => {
        const f = {
          ...JSON.parse(r.data),
          id: r.id,
          version: r.version,
          status: r.status,
        };
        f.eligible = eligible(f, today);
        return f;
      },
    );
  }
  async fetch(request) {
    if (
      ["/api/recipes/generate", "/api/food/recognize"].includes(
        new URL(request.url).pathname,
      )
    )
      return this.aiFetch(request);
    // Serializes the short crypto/transaction boundary as well as reads. SQLite
    // transactionSync supplies rollback for every multi-statement mutation.
    return this.ctx.blockConcurrencyWhile(async () => {
      this.cookie = null;
      this.session = null;
      const url = new URL(request.url),
        secure = url.protocol === "https:";
      try {
        if (url.pathname === "/healthz") {
          this.one("SELECT COUNT(*) AS count FROM users");
          return respond(
            { status: "ok", version: "0.4", storage: "persistent-sqlite" },
            200,
            null,
            secure,
          );
        }
        this.sql.exec("DELETE FROM sessions WHERE expires<?", Date.now());
        const raw = /\blmb_session=([A-Za-z0-9_-]+)/.exec(
          request.headers.get("Cookie") || "",
        )?.[1];
        this.session = this.one(
          "SELECT * FROM sessions WHERE token=? AND expires>?",
          await sha(raw || ""),
          Date.now(),
        );
        if (!this.session) {
          check(
            request.method === "GET" && url.pathname === "/api/state",
            "unauthorized",
            401,
          );
          await this.newSession();
        }
        let data = {};
        if (request.method === "POST") {
          const origin = request.headers.get("Origin");
          check(!origin || origin === url.origin, "csrf", 403);
          check(
            equal(request.headers.get("X-CSRF-Token") || "", this.session.csrf),
            "csrf",
            403,
          );
          const length = Number(request.headers.get("Content-Length") || 0);
          check(length <= 16384, "invalid_input", 413);
          const body = await request.text();
          check(
            new TextEncoder().encode(body).length <= 16384,
            "invalid_input",
            413,
          );
          try {
            data = JSON.parse(body);
          } catch {
            throw new Problem(400, "invalid_input");
          }
          check(data && typeof data === "object" && !Array.isArray(data));
        }
        const result = await this.route(request, url.pathname, data);
        return respond(result, 200, this.cookie, secure);
      } catch (error) {
        if (error instanceof Problem)
          return respond(
            { error: { code: error.code } },
            error.status,
            null,
            secure,
          );
        // Never return SQL text, submitted values, passwords or cookies in errors.
        console.error("kitchen_request_failed", error?.name || "Error");
        return respond(
          { error: { code: "storage_unavailable" } },
          503,
          null,
          secure,
        );
      } finally {
        this.cookie = null;
        this.session = null;
      }
    });
  }
  async locked(callback) {
    // blockConcurrencyWhile resets a Durable Object if its callback rejects.
    // Convert request/validation failures to values inside the lock, then throw
    // outside it so one failed AI request cannot restart unrelated requests.
    const result = await this.ctx.blockConcurrencyWhile(async () => {
      try {
        return { value: await callback() };
      } catch (error) {
        return {
          failure: {
            status: error instanceof Problem ? error.status : 503,
            code: error instanceof Problem ? error.code : "ai_unavailable",
          },
        };
      }
    });
    if (result.failure)
      throw new Problem(result.failure.status, result.failure.code);
    return result.value;
  }
  async aiAuth(request, maxBytes) {
    check(request.method === "POST", "not_found", 404);
    const url = new URL(request.url),
      origin = request.headers.get("Origin");
    check(!origin || origin === url.origin, "csrf", 403);
    const raw = /\blmb_session=([A-Za-z0-9_-]+)/.exec(
        request.headers.get("Cookie") || "",
      )?.[1],
      hash = await sha(raw || "");
    const session = this.one(
      "SELECT * FROM sessions WHERE token=? AND expires>?",
      hash,
      Date.now(),
    );
    check(session?.user_id, "unauthorized", 401);
    check(
      equal(request.headers.get("X-CSRF-Token") || "", session.csrf),
      "csrf",
      403,
    );
    const member = this.one(
      "SELECT * FROM memberships WHERE user_id=?",
      session.user_id,
    );
    check(member, "no_kitchen", 403);
    check(
      Number(request.headers.get("Content-Length") || 0) <= maxBytes,
      "invalid_input",
      413,
    );
    const body = await request.text();
    check(
      new TextEncoder().encode(body).length <= maxBytes,
      "invalid_input",
      413,
    );
    let data;
    try {
      data = JSON.parse(body);
    } catch {
      throw new Problem(400, "invalid_input");
    }
    check(data && typeof data === "object" && !Array.isArray(data));
    const preferences = JSON.parse(
      this.one(
        "SELECT data FROM user_preferences WHERE user_id=?",
        session.user_id,
      ).data,
    );
    return { session, member, preferences, data };
  }
  consumeAI(uid, kind) {
    this.rate(kind + ":" + uid, 6);
    const day = todayIn("Asia/Hong_Kong"),
      limit = kind === "image" ? 12 : 24,
      globalLimit = kind === "image" ? 60 : 150;
    this.transaction(() => {
      const count =
          this.one(
            "SELECT count FROM ai_usage WHERE day=? AND kind=? AND user_id=?",
            day,
            kind,
            uid,
          )?.count || 0,
        total = this.one(
          "SELECT COALESCE(SUM(count),0) AS total FROM ai_usage WHERE day=? AND kind=?",
          day,
          kind,
        ).total;
      check(count < limit && total < globalLimit, "ai_limit", 429);
      this.sql.exec(
        "INSERT INTO ai_usage VALUES(?,?,?,1) ON CONFLICT(day,kind,user_id) DO UPDATE SET count=count+1",
        day,
        kind,
        uid,
      );
    });
  }
  async aiFetch(request) {
    const image = new URL(request.url).pathname === "/api/food/recognize",
      secure = new URL(request.url).protocol === "https:";
    let busyKey,
      busyOwned = false;
    try {
      const snapshot = await this.locked(async () => {
        const auth = await this.aiAuth(request, image ? 1200000 : 16384),
          uid = auth.session.user_id,
          kid = auth.member.kitchen_id;
        check(this.env.FOOD_AI, image ? "photo_failed" : "ai_unavailable", 503);
        const input = { language: auth.preferences.language };
        let fingerprint, cacheKey;
        if (image) input.image = validatePhoto(auth.data.image);
        else {
          const foods = this.foods(kid, todayIn(auth.preferences.timezone))
            .filter((f) => f.eligible)
            .sort((a, b) => a.id - b.id);
          check(foods.length > 0, "no_food");
          check(foods.length <= 80, "invalid_input");
          check(STYLES.includes(auth.data.style ?? "auto"));
          check([1, 2].includes(auth.data.count ?? 2));
          const selected =
            auth.data.scope === "all"
              ? foods.map((f) => f.id)
              : auth.data.selected;
          check(
            Array.isArray(selected) &&
              selected.length <= 80 &&
              selected.every(Number.isSafeInteger),
          );
          const valid = selected.filter((id) => foods.some((f) => f.id === id));
          check(valid.length > 0, "no_food");
          const preference = auth.data.preference ?? "";
          check(typeof preference === "string" && preference.length <= 120);
          Object.assign(input, {
            foods: foods.map((f) => ({
              id: f.id,
              name: f.name,
              category: f.category,
              location: f.location,
            })),
            selected: [...new Set(valid)],
            style: auth.data.style ?? "auto",
            count: auth.data.count ?? 2,
            preference,
          });
          fingerprint = JSON.stringify(foods.map((f) => [f.id, f.version]));
          cacheKey = await sha(JSON.stringify({ input, fingerprint }));
          if (!auth.data.regenerate) {
            const cached = this.one(
              "SELECT data FROM recipe_generations WHERE user_id=? AND kitchen_id=? AND cache_key=? AND created>? ORDER BY created DESC LIMIT 1",
              uid,
              kid,
              cacheKey,
              Date.now() - 900000,
            );
            if (cached) return { cached: JSON.parse(cached.data) };
          }
        }
        busyKey = uid + ":" + (image ? "image" : "recipes");
        check(!this.aiBusy.has(busyKey), "ai_busy", 429);
        this.consumeAI(uid, image ? "image" : "recipes");
        this.aiBusy.add(busyKey);
        busyOwned = true;
        return {
          uid,
          kid,
          hash: auth.session.token,
          input,
          fingerprint,
          cacheKey,
        };
      });
      if (snapshot.cached)
        return respond({ generation: snapshot.cached }, 200, null, secure);
      let result;
      try {
        result = image
          ? await this.env.FOOD_AI.recognize(snapshot.input)
          : await this.env.FOOD_AI.recipes(snapshot.input);
      } catch {
        throw new Problem(503, image ? "photo_failed" : "ai_unavailable");
      }
      check(!result?.error, result?.error || "ai_unavailable", 503);
      return await this.locked(async () => {
        check(
          this.one(
            "SELECT 1 FROM sessions WHERE token=? AND user_id=? AND expires>?",
            snapshot.hash,
            snapshot.uid,
            Date.now(),
          ),
          "unauthorized",
          401,
        );
        check(
          this.one(
            "SELECT 1 FROM memberships WHERE user_id=? AND kitchen_id=?",
            snapshot.uid,
            snapshot.kid,
          ),
          "no_kitchen",
          403,
        );
        let output;
        try {
          output = image
            ? validateRecognition(result.data)
            : validateRecipes(result.data, snapshot.input);
        } catch {
          throw new Problem(502, "ai_invalid");
        }
        if (image)
          return respond(
            { foods: output, provider: result.provider, model: result.model },
            200,
            null,
            secure,
          );
        const prefs = JSON.parse(
            this.one(
              "SELECT data FROM user_preferences WHERE user_id=?",
              snapshot.uid,
            ).data,
          ),
          current = this.foods(snapshot.kid, todayIn(prefs.timezone))
            .filter((f) => f.eligible)
            .sort((a, b) => a.id - b.id);
        check(
          prefs.language === snapshot.input.language &&
            snapshot.fingerprint ===
              JSON.stringify(current.map((f) => [f.id, f.version])),
          "generation_stale",
          409,
        );
        const generation = {
          id: crypto.randomUUID(),
          created: Date.now(),
          language: snapshot.input.language,
          provider: result.provider,
          model: result.model,
          recipes: output,
          selected: snapshot.input.selected,
          versions: Object.fromEntries(current.map((f) => [f.id, f.version])),
        };
        this.transaction(() => {
          this.sql.exec(
            "INSERT INTO recipe_generations VALUES(?,?,?,?,?,?)",
            generation.id,
            snapshot.uid,
            snapshot.kid,
            snapshot.cacheKey,
            JSON.stringify(generation),
            Date.now(),
          );
          this.sql.exec(
            "DELETE FROM recipe_generations WHERE user_id=? AND id NOT IN (SELECT id FROM recipe_generations WHERE user_id=? ORDER BY created DESC LIMIT 5)",
            snapshot.uid,
            snapshot.uid,
          );
        });
        return respond({ generation }, 200, null, secure);
      });
    } catch (error) {
      return respond(
        {
          error: {
            code:
              error instanceof Problem
                ? error.code
                : image
                  ? "photo_failed"
                  : "ai_unavailable",
          },
        },
        error instanceof Problem ? error.status : 503,
        null,
        secure,
      );
    } finally {
      if (busyOwned) this.aiBusy.delete(busyKey);
    }
  }
  async route(request, path, data) {
    const uid = this.session.user_id;
    if (request.method === "GET" && path === "/api/recipes/history") {
      check(uid !== null, "unauthorized", 401);
      const member = this.member();
      const row = this.one(
        "SELECT data FROM recipe_generations WHERE user_id=? AND kitchen_id=? ORDER BY created DESC LIMIT 1",
        uid,
        member.kitchen_id,
      );
      if (!row) return { generation: null };
      const generation = JSON.parse(row.data);
      if (generation.language !== this.prefs().language)
        return { generation: null };
      const current = new Map(
        this.foods(member.kitchen_id, todayIn(this.prefs().timezone)).map(
          (f) => [f.id, f],
        ),
      );
      generation.stale = generation.recipes.some((r) =>
        r.uses.some(
          (use) =>
            !current.get(use.food_id)?.eligible ||
            current.get(use.food_id)?.version !==
              generation.versions[use.food_id],
        ),
      );
      return { generation };
    }
    if (request.method === "GET" && path === "/api/state") {
      const state = { csrf: this.session.csrf, user: null, web_app: true };
      if (!uid) return state;
      const user = this.one("SELECT id,email FROM users WHERE id=?", uid),
        preferences = this.prefs(),
        today = todayIn(preferences.timezone);
      const member = this.one(
        "SELECT m.*,k.name FROM memberships m JOIN kitchens k ON k.id=m.kitchen_id WHERE user_id=?",
        uid,
      );
      Object.assign(state, {
        user,
        preferences,
        today,
        kitchen: null,
        foods: [],
        members: [],
        ingredients,
      });
      if (member) {
        state.kitchen = {
          id: member.kitchen_id,
          name: member.name,
          role: member.role,
        };
        state.foods = this.foods(member.kitchen_id, today);
        state.members = this.rows(
          "SELECT u.id,u.email,m.role FROM memberships m JOIN users u ON u.id=m.user_id WHERE kitchen_id=? ORDER BY m.role DESC,u.id",
          member.kitchen_id,
        );
      }
      return state;
    }
    check(request.method === "POST", "not_found", 404);
    if (["/api/register", "/api/login"].includes(path)) {
      this.rate(
        "auth-ip:" + (request.headers.get("CF-Connecting-IP") || "local"),
        30,
      );
      const email = text(data.email, 254).toLowerCase();
      check(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), "invalid_email");
      const password = data.password;
      check(
        typeof password === "string" &&
          password.length >= 10 &&
          password.length <= 128,
        "password_length",
      );
      this.rate("auth-email:" + email, 15);
      const user = this.one("SELECT * FROM users WHERE email=?", email);
      let id;
      if (path.endsWith("register")) {
        check(data.confirm_password === password, "password_mismatch");
        check(!user, "registration_unavailable", 409);
        const hashed = await passwordHash(password),
          preferences = { ...defaults };
        try {
          if (typeof data.timezone === "string") {
            new Intl.DateTimeFormat("en", { timeZone: data.timezone });
            preferences.timezone = data.timezone;
          }
        } catch {}
        id = this.transaction(() => {
          const id = this.insert(
            "INSERT INTO users(email,password) VALUES(?,?)",
            email,
            hashed,
          );
          this.sql.exec(
            "INSERT INTO user_preferences VALUES(?,?)",
            id,
            JSON.stringify(preferences),
          );
          return id;
        });
      } else {
        const stored =
          user?.password ||
          `pbkdf2-sha256:100000:${"00".repeat(16)}:${"00".repeat(32)}`;
        check(
          (await verifyPassword(password, stored)) && user,
          "invalid_credentials",
          401,
        );
        id = user.id;
      }
      // Random material and hashes are prepared before the atomic session swap.
      const value = token() + token(),
        csrf = token() + token(),
        hash = await sha(value),
        previous = this.session.token;
      this.transaction(() => {
        this.sql.exec("DELETE FROM sessions WHERE token=?", previous);
        this.sql.exec(
          "INSERT INTO sessions VALUES(?,?,?,?)",
          hash,
          id,
          csrf,
          Date.now() + 604800000,
        );
      });
      this.cookie = value;
      this.session = { token: hash, user_id: id, csrf };
      return { ok: true, csrf };
    }
    check(uid !== null, "unauthorized", 401);
    if (path === "/api/logout") {
      this.sql.exec("DELETE FROM sessions WHERE token=?", this.session.token);
      await this.newSession();
      return { ok: true, csrf: this.session.csrf };
    }
    if (path === "/api/date/preview")
      return {
        effective_date: calculateDate(
          data.production_date,
          data.shelf_life,
          data.shelf_unit,
        ),
      };
    let food = null,
      bodyHash = null,
      codeHash = null;
    if (path === "/api/food/create") {
      this.member();
      food = validateFood(data);
      bodyHash = await sha(JSON.stringify(food));
    }
    if (["/api/invitation/preview", "/api/invitation/accept"].includes(path)) {
      check(
        !this.one("SELECT 1 FROM memberships WHERE user_id=?", uid),
        "already_member",
        409,
      );
      codeHash = await sha(text(data.code, 100));
    }
    if (path === "/api/invitation/replace") {
      this.member(true);
      const code = token(),
        expires = Date.now() + 604800000,
        hash = await sha(code);
      this.transaction(() => {
        const kid = this.member(true).kitchen_id;
        this.sql.exec("DELETE FROM invitations WHERE kitchen_id=?", kid);
        this.sql.exec(
          "INSERT INTO invitations VALUES(?,?,?)",
          hash,
          kid,
          expires,
        );
      });
      return { code, expires: expires / 1000 };
    }
    return this.transaction(() => {
      if (path === "/api/preferences") {
        const prefs = this.prefs(),
          options = {
            language: ["en", "zh-Hant"],
            text_size: ["standard", "large"],
            default_view: ["categories", "use_first"],
            date_format: ["iso", "dmy", "mdy"],
            reminder_days: [1, 3, 7],
          };
        for (const [key, choices] of Object.entries(options))
          if (Object.hasOwn(data, key)) {
            check(choices.includes(data[key]));
            prefs[key] = data[key];
          }
        if (Object.hasOwn(data, "reminders")) {
          check(typeof data.reminders === "boolean");
          prefs.reminders = data.reminders;
        }
        this.sql.exec(
          "UPDATE user_preferences SET data=? WHERE user_id=?",
          JSON.stringify(prefs),
          uid,
        );
        return { ok: true };
      }
      if (path === "/api/kitchen/create") {
        check(
          !this.one("SELECT 1 FROM memberships WHERE user_id=?", uid),
          "already_member",
          409,
        );
        const kid = this.insert(
          "INSERT INTO kitchens(name) VALUES(?)",
          text(data.name, 80),
        );
        this.sql.exec("INSERT INTO memberships VALUES(?,?,'owner')", uid, kid);
        return { ok: true };
      }
      if (
        ["/api/invitation/preview", "/api/invitation/accept"].includes(path)
      ) {
        this.rate("invite:" + uid);
        check(
          !this.one("SELECT 1 FROM memberships WHERE user_id=?", uid),
          "already_member",
          409,
        );
        const invitation = this.one(
          "SELECT i.*,k.name FROM invitations i JOIN kitchens k ON k.id=i.kitchen_id WHERE code=? AND expires>?",
          codeHash,
          Date.now(),
        );
        check(invitation, "invalid_invitation", 404);
        if (path.endsWith("accept")) {
          check(data.confirmed === true, "confirmation_required");
          this.sql.exec(
            "INSERT INTO memberships VALUES(?,?,'editor')",
            uid,
            invitation.kitchen_id,
          );
        }
        return {
          name: invitation.name,
          role: "editor",
          expires: invitation.expires / 1000,
        };
      }
      const member = this.member(),
        kid = member.kitchen_id;
      if (path === "/api/food/batch") {
        check(data.confirmed === true, "confirmation_required");
        check(["used", "delete", "restore"].includes(data.action));
        check(
          Array.isArray(data.items) &&
            data.items.length > 0 &&
            data.items.length <= 100,
        );
        const seen = new Set();
        const rows = data.items.map((item) => {
          integer(item.id);
          integer(item.version);
          check(!seen.has(item.id));
          seen.add(item.id);
          const row = this.one(
            "SELECT * FROM food_items WHERE id=? AND kitchen_id=?",
            item.id,
            kid,
          );
          check(row, "food_not_found", 404);
          check(row.version === item.version, "conflict", 409);
          if (data.action === "used")
            check(row.status === "active", "conflict", 409);
          if (data.action === "restore")
            check(row.status === "used", "conflict", 409);
          return row;
        });
        for (const row of rows)
          if (data.action === "delete")
            this.sql.exec("DELETE FROM food_items WHERE id=?", row.id);
          else
            this.sql.exec(
              "UPDATE food_items SET status=?,version=version+1 WHERE id=?",
              data.action === "used" ? "used" : "active",
              row.id,
            );
        return { ok: true, changed: rows.length };
      }
      if (path === "/api/member/remove") {
        this.member(true);
        integer(data.user_id);
        check(data.confirmed === true, "confirmation_required");
        this.sql.exec(
          "DELETE FROM memberships WHERE kitchen_id=? AND user_id=? AND role='editor'",
          kid,
          data.user_id,
        );
        check(
          this.one("SELECT changes() AS count").count === 1,
          "member_not_removable",
          403,
        );
        return { ok: true };
      }
      if (path === "/api/kitchen/leave") {
        check(member.role === "editor", "owner_cannot_leave", 403);
        check(data.confirmed === true, "confirmation_required");
        this.sql.exec("DELETE FROM memberships WHERE user_id=?", uid);
        return { ok: true };
      }
      if (path === "/api/kitchen/clear") {
        this.member(true);
        check(
          data.confirmed === true && data.kitchen_name === member.name,
          "confirmation_required",
        );
        this.sql.exec("DELETE FROM food_items WHERE kitchen_id=?", kid);
        return { ok: true };
      }
      if (path === "/api/food/create") {
        const key = data.request_id;
        if (key !== undefined) {
          check(typeof key === "string" && /^[A-Za-z0-9-]{16,64}$/.test(key));
          const old = this.one(
            "SELECT * FROM mutation_keys WHERE user_id=? AND request_key=?",
            uid,
            key,
          );
          if (old) {
            check(
              old.kitchen_id === kid && old.body_hash === bodyHash,
              "request_reused",
              409,
            );
            const result = JSON.parse(old.result);
            check(
              this.one(
                "SELECT 1 FROM food_items WHERE id=? AND kitchen_id=?",
                result.id,
                kid,
              ),
              "request_reused",
              409,
            );
            return result;
          }
        }
        const id = this.insert(
            "INSERT INTO food_items(kitchen_id,status,data) VALUES(?,'active',?)",
            kid,
            JSON.stringify(food),
          ),
          result = { id, version: 1 };
        if (key !== undefined)
          this.sql.exec(
            "INSERT INTO mutation_keys VALUES(?,?,?,?,?)",
            uid,
            key,
            kid,
            bodyHash,
            JSON.stringify(result),
          );
        return result;
      }
      if (
        ["/api/food/update", "/api/food/delete", "/api/food/used"].includes(
          path,
        )
      ) {
        integer(data.id);
        integer(data.version);
        const row = this.one(
          "SELECT * FROM food_items WHERE id=? AND kitchen_id=?",
          data.id,
          kid,
        );
        check(row, "food_not_found", 404);
        check(row.version === data.version, "conflict", 409);
        if (path.endsWith("delete")) {
          check(data.confirmed === true, "confirmation_required");
          this.sql.exec("DELETE FROM food_items WHERE id=?", data.id);
        } else if (path.endsWith("used")) {
          check(data.confirmed === true, "confirmation_required");
          this.sql.exec(
            "UPDATE food_items SET status='used',version=version+1 WHERE id=?",
            data.id,
          );
        } else {
          check(row.status === "active", "food_used", 409);
          const updated = validateFood(data);
          this.sql.exec(
            "UPDATE food_items SET data=?,version=version+1 WHERE id=?",
            JSON.stringify(updated),
            data.id,
          );
        }
        return { ok: true };
      }
      if (path === "/api/recipes") throw new Problem(409, "upgrade_required");
      throw new Problem(404, "not_found");
    });
  }
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path.startsWith("/api/") || path === "/healthz")
      return env.KITCHENS.get(
        env.KITCHENS.idFromName("shared-kitchens-v1"),
      ).fetch(request);
    const response = await env.ASSETS.fetch(request),
      headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(securityHeaders))
      headers.set(key, value);
    if (new URL(request.url).protocol === "https:")
      headers.set("Strict-Transport-Security", "max-age=31536000");
    return new Response(response.body, { status: response.status, headers });
  },
};
