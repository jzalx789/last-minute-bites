import { migrateKitchens, KitchenAccess, partyEnded } from "./kitchens.js";
import { DurableObject } from "cloudflare:workers";
import { PushService, PUSH_SCHEMA } from "./push-service.js";
import {
  classifyFoodName,
  foodNameKey,
  validateFoodAssessment,
} from "./food-classifier.js";
import {
  STYLES,
  validateRecipes,
  validatePhoto,
  validateRecognition,
  PORTIONS,
  avoidTerms,
  matchesAvoid,
  RECIPE_MODES,
  PANTRY_STAPLES,
  pantrySelection,
  priorityFoodIds,
  RECIPE_COUNTS,
  replacementInput,
  mergeReplacement,
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
  consumeFood,
  applyConsumption,
  restoreFood,
} from "./domain.js";

const SCHEMA = `
${PUSH_SCHEMA}
CREATE TABLE IF NOT EXISTS food_assessments(user_id INTEGER NOT NULL,kitchen_id INTEGER NOT NULL,name_key TEXT NOT NULL,data TEXT NOT NULL,created REAL NOT NULL,PRIMARY KEY(user_id,kitchen_id,name_key));
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
    this.kitchenAccess = new KitchenAccess(this);
    this.attempts = new Map();
    this.aiBusy = new Set();
    this.pushService = new PushService(this, env);
    ctx.blockConcurrencyWhile(async () => {
      this.sql.exec(SCHEMA);
      migrateKitchens(ctx.storage);
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
      "INSERT INTO sessions(token,user_id,csrf,expires) VALUES(?,?,?,?)",
      hash,
      userId,
      csrf,
      Date.now() + 604800000,
    );
    this.cookie = value;
    this.session = { token: hash, user_id: userId, csrf };
  }
  member(owner = false, allowEnded = false) {
    const row = this.kitchenAccess.member(this.session, this.requestKitchenId, {allowEnded});
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
    const scope = this.kitchenAccess.scope(kid);
    return this.rows(`SELECT f.*,k.name AS kitchen_name FROM food_items f JOIN kitchens k ON k.id=f.kitchen_id WHERE f.kitchen_id IN (${scope.map(() => '?').join(',')})`, ...scope).map(
      (r) => {
        const f = {
          quantity: null,
          unit: "pcs",
          purchased_date: null,
          ...JSON.parse(r.data),
          id: r.id,
          kitchen_id: r.kitchen_id,
          kitchen_name: r.kitchen_name,
          version: r.version,
          status: r.status,
        };
        f.eligible = eligible(f, today);
        if (classifyFoodName(f.name).status === "non_food") {
          f.eligible = false;
          f.food_warning = "not_food";
        }
        return f;
      },
    );
  }
  async fetch(request) {
    if (new URL(request.url).pathname === "/api/push/test")
      return this.pushTestFetch(request);
    if (new URL(request.url).pathname === "/api/food/classify")
      return this.classifyFetch(request);
    if (
      [
        "/api/recipes/generate",
        "/api/recipes/replace",
        "/api/food/recognize",
      ].includes(new URL(request.url).pathname)
    )
      return this.aiFetch(request);
    // Serializes the short crypto/transaction boundary as well as reads. SQLite
    // transactionSync supplies rollback for every multi-statement mutation.
    return this.ctx.blockConcurrencyWhile(async () => {
      this.cookie = null;
      this.session = null;
      this.requestKitchenId = request.headers.get("X-Kitchen-ID");
      const url = new URL(request.url),
        secure = url.protocol === "https:";
      try {
        if (url.pathname === "/healthz") {
          this.one("SELECT COUNT(*) AS count FROM users");
          return respond(
            { status: "ok", version: "1.3", storage: "persistent-sqlite" },
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
        this.requestKitchenId = null;
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
            reason: error.reason,
          },
        };
      }
    });
    if (result.failure) {
      const error = new Problem(result.failure.status, result.failure.code);
      error.reason = result.failure.reason;
      throw error;
    }
    return result.value;
  }
  async runPushSchedule(when) {
    return this.pushService.scheduled(when);
  }
  async pushTestFetch(request) {
    const secure = new URL(request.url).protocol === "https:";
    try {
      const snapshot = await this.locked(async () => {
        const auth = await this.aiAuth(request, 16384);
        this.rate("push_test:" + auth.session.user_id, 3);
        return this.pushService.prepareTest(auth, auth.data);
      });
      const result = await this.pushService.send(
        snapshot.row,
        snapshot.keys,
        snapshot.language,
        true,
      );
      await this.locked(() =>
        this.pushService.finish(snapshot.row, result, Date.now()),
      );
      check(
        ![404, 410].includes(result.status),
        "push_subscription_expired",
        409,
      );
      check(result.status >= 200 && result.status < 300, "push_failed", 503);
      return respond(
        {
          sent: true,
          provider: this.env.PUSH_TRANSPORT ? "test-fixture" : "web-push",
        },
        200,
        null,
        secure,
      );
    } catch (error) {
      return respond(
        {
          error: {
            code: error instanceof Problem ? error.code : "push_failed",
          },
        },
        error instanceof Problem ? error.status : 503,
        null,
        secure,
      );
    }
  }
  assessment(uid, kid, name) {
    const local = classifyFoodName(name);
    if (local.status !== "uncertain") return local;
    const row = this.one(
      "SELECT data,created FROM food_assessments WHERE user_id=? AND kitchen_id=? AND name_key=? AND created>?",
      uid,
      kid,
      foodNameKey(name),
      Date.now() - 86400000,
    );
    if (!row) return local;
    const result = JSON.parse(row.data);
    return result.source === "unavailable" && row.created < Date.now() - 60000
      ? local
      : result;
  }
  saveAssessment(uid, kid, name, value) {
    this.sql.exec(
      "INSERT INTO food_assessments VALUES(?,?,?,?,?) ON CONFLICT(user_id,kitchen_id,name_key) DO UPDATE SET data=excluded.data,created=excluded.created",
      uid,
      kid,
      foodNameKey(name),
      JSON.stringify(value),
      Date.now(),
    );
    this.sql.exec(
      "DELETE FROM food_assessments WHERE created<?",
      Date.now() - 86400000,
    );
  }
  checkedFood(data, uid, kid, previous = null) {
    const name = text(data.name),
      key = foodNameKey(name),
      assessment = this.assessment(uid, kid, name);
    check(assessment.status !== "non_food", "not_food", 422);
    const alreadyConfirmed =
      previous?.food_verification?.name_key === key &&
      previous.food_verification.confirmed;
    check(
      assessment.status !== "uncertain" ||
        assessment.source !== "rules" ||
        alreadyConfirmed,
      "classification_required",
      422,
    );
    check(
      assessment.status === "food" ||
        data.food_confirmed === true ||
        alreadyConfirmed,
      "food_confirmation_required",
      422,
    );
    const category =
      data.category_mode === "manual"
        ? data.category
        : assessment.status === "food"
          ? assessment.category
          : (data.category ?? "other");
    return {
      ...validateFood({
        ...data,
        category,
        ingredient: assessment.ingredient || data.ingredient || "",
      }),
      category_mode: data.category_mode === "manual" ? "manual" : "auto",
      food_verification: {
        name_key: key,
        confirmed: assessment.status !== "food",
        source: assessment.source,
      },
    };
  }
  async classifyFetch(request) {
    const secure = new URL(request.url).protocol === "https:";
    let busyKey,
      owned = false;
    try {
      const snapshot = await this.locked(async () => {
        const { session, member, preferences, data } = await this.aiAuth(
            request,
            16384,
          ),
          name = text(data.name),
          uid = session.user_id,
          kid = member.kitchen_id;
        this.rate("classify_lookup:" + uid, 90);
        const known = this.assessment(uid, kid, name);
        if (known.status !== "uncertain" || known.source !== "rules")
          return { known };
        if (data.allow_ai === false) return { known };
        if (!this.env.FOOD_AI || foodNameKey(name).length < 2) {
          const fallback = {
            ...known,
            source: this.env.FOOD_AI ? "unresolved" : "unavailable",
          };
          this.saveAssessment(uid, kid, name, fallback);
          return { known: fallback };
        }
        busyKey = uid + ":classify:" + foodNameKey(name);
        check(!this.aiBusy.has(busyKey), "ai_busy", 429);
        try {
          this.consumeAI(uid, "classify");
        } catch (error) {
          if (!(error instanceof Problem) || error.status !== 429) throw error;
          const fallback = { ...known, source: "unavailable" };
          this.saveAssessment(uid, kid, name, fallback);
          return { known: fallback };
        }
        this.aiBusy.add(busyKey);
        owned = true;
        return {
          name,
          uid,
          kid,
          token: session.token,
          language: preferences.language,
        };
      });
      if (snapshot.known)
        return respond({ assessment: snapshot.known }, 200, null, secure);
      let assessment,
        failureReason = "service_unavailable";
      try {
        const result = await this.env.FOOD_AI.classify({
          name: snapshot.name,
          language: snapshot.language,
        });
        if (result?.error) {
          const reasons = new Set([
            "output_truncated",
            "output_incomplete",
            "invalid_json",
            "invalid_assessment",
          ]);
          failureReason = reasons.has(result.reason)
            ? result.reason
            : "provider_unavailable";
          throw Error("unavailable");
        }
        failureReason = "invalid_assessment";
        assessment = validateFoodAssessment(result.data);
        if (result.provider === "test-fixture")
          assessment.source = "test-fixture";
      } catch {
        assessment = {
          status: "uncertain",
          category: "other",
          ingredient: "",
          source: "unavailable",
          reason: failureReason,
        };
      }
      return await this.locked(() => {
        check(
          this.one(
            "SELECT 1 FROM sessions WHERE token=? AND user_id=? AND expires>?",
            snapshot.token,
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
        this.kitchenAccess.member({user_id:snapshot.uid}, snapshot.kid);
        this.saveAssessment(
          snapshot.uid,
          snapshot.kid,
          snapshot.name,
          assessment,
        );
        return respond({ assessment }, 200, null, secure);
      });
    } catch (error) {
      return respond(
        {
          error: {
            code:
              error instanceof Problem
                ? error.code
                : "classification_unavailable",
          },
        },
        error instanceof Problem ? error.status : 503,
        null,
        secure,
      );
    } finally {
      if (owned) this.aiBusy.delete(busyKey);
    }
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
    const member = this.kitchenAccess.member(session, request.headers.get("X-Kitchen-ID"));
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
      limit = kind === "image" ? 12 : kind === "classify" ? 40 : 24,
      globalLimit = kind === "image" ? 60 : kind === "classify" ? 200 : 150;
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
      replacing = new URL(request.url).pathname === "/api/recipes/replace",
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
        let fingerprint, cacheKey, replacement, fullInput;
        if (image) input.image = validatePhoto(auth.data.image);
        else {
          const allFoods = this.foods(kid, todayIn(auth.preferences.timezone))
            .filter((f) => f.eligible)
            .sort((a, b) => a.id - b.id);
          if (replacing) {
            const generationId = text(auth.data.generation_id, 100);
            const row = this.one(
              "SELECT data FROM recipe_generations WHERE id=? AND user_id=? AND kitchen_id=?",
              generationId,
              uid,
              kid,
            );
            check(row, "not_found", 404);
            const generation = JSON.parse(row.data);
            const latest = this.one(
              "SELECT id FROM recipe_generations WHERE user_id=? AND kitchen_id=? ORDER BY created DESC LIMIT 1",
              uid,
              kid,
            );
            check(
              latest?.id === generation.id &&
                generation.language === auth.preferences.language &&
                JSON.stringify(generation.versions) ===
                  JSON.stringify(
                    Object.fromEntries(allFoods.map((f) => [f.id, f.version])),
                  ),
              "generation_stale",
              409,
            );
            integer(auth.data.recipe_id, 1, 4);
            replacement = { generation, recipeId: auth.data.recipe_id };
            auth.data = {
              ...generation.options,
              selected: generation.selected,
              regenerate: true,
            };
          }
          const mode = auth.data.mode ?? "use_up";
          check(RECIPE_MODES.includes(mode));
          const scope = auth.data.scope ?? "selected";
          check(["selected", "all"].includes(scope));
          auth.data.scope = scope;
          if (mode !== "plan") check(allFoods.length > 0, "no_food");
          check(allFoods.length <= 80, "invalid_input");
          const servings = auth.data.servings ?? 2,
            portion = auth.data.portion ?? "standard",
            maxMinutes = auth.data.max_minutes ?? null,
            avoid = auth.data.avoid ?? "";
          integer(servings, 1, 12);
          check(PORTIONS.includes(portion));
          if (maxMinutes !== null) integer(maxMinutes, 5, 180);
          const terms = avoidTerms(avoid);
          const foods = allFoods.filter((f) => !matchesAvoid(f, terms));
          if (mode !== "plan") check(foods.length > 0, "preference_conflict");
          check(STYLES.includes(auth.data.style ?? "auto"));
          check(RECIPE_COUNTS.includes(auth.data.count ?? 2));
          const selected =
            auth.data.scope === "all"
              ? foods.map((f) => f.id)
              : auth.data.selected;
          check(
            Array.isArray(selected) &&
              selected.length <= 80 &&
              selected.every(Number.isSafeInteger),
          );
          check(selected.every((id) => allFoods.some((f) => f.id === id)));
          const valid = selected.filter((id) => foods.some((f) => f.id === id));
          if (auth.data.use_all === true)
            check(
              valid.length <= 20 * (auth.data.count ?? 2),
              "split_foods",
              400,
            );
          if (mode !== "plan")
            check(
              valid.length > 0,
              terms.length ? "preference_conflict" : "no_food",
            );
          const preference = auth.data.preference ?? "";
          check(typeof preference === "string" && preference.length <= 120);
          const pantry = pantrySelection(auth.data.pantry_staples, avoid, input.language);
          Object.assign(input, {
            pantry_staples: pantry.ids,
            pantry: mode === "use_up" ? [] : pantry.pantry,
            foods: foods
              .filter(
                (f) => auth.data.scope !== "selected" || valid.includes(f.id),
              )
              .map((f) => ({
                id: f.id,
                name: f.name,
                category: f.category,
                location: f.location,
                quantity: f.quantity,
                unit: f.unit,
                purchased_date: f.purchased_date,
                effective_date: f.effective_date,
                date_source: f.date_source,
                date_kind: f.date_kind,
              })),
            selected: [...new Set(valid)],
            style: auth.data.style ?? "auto",
            count: auth.data.count ?? 2,
            preference,
            servings,
            portion,
            max_minutes: maxMinutes,
            avoid,
            mode,
            scope,
            require_selected: valid.length > 0,
            use_all: auth.data.use_all === true,
            exact_count: auth.data.exact_count === true,
            priority_ids:
              mode !== "plan"
                ? priorityFoodIds(
                    foods,
                    valid,
                    todayIn(auth.preferences.timezone),
                  )
                : [],
          });
          fingerprint = JSON.stringify(allFoods.map((f) => [f.id, f.version]));
          if (replacement) {
            fullInput = { ...input };
            Object.assign(
              input,
              replacementInput(
                fullInput,
                replacement.generation,
                replacement.recipeId,
              ),
            );
          }
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
          replacement,
          fullInput,
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
      if (!result || result.error) {
        const error = new Problem(
          result?.error === "ai_invalid" ? 502 : 503,
          result?.error || "ai_unavailable",
        );
        error.reason = result?.reason;
        throw error;
      }
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
        this.kitchenAccess.member({user_id:snapshot.uid}, snapshot.kid);
        let output;
        try {
          output = image
            ? validateRecognition(result.data)
            : validateRecipes(result.data, snapshot.input);
          if (snapshot.replacement)
            output = mergeReplacement(
              output,
              snapshot.fullInput,
              snapshot.replacement.generation,
              snapshot.replacement.recipeId,
            );
        } catch (failure) {
          const error = new Problem(502, "ai_invalid");
          error.reason = failure.code;
          throw error;
        }
        if (image) {
          for (const candidate of output)
            this.saveAssessment(snapshot.uid, snapshot.kid, candidate.name, {
              status: "food",
              category: candidate.category,
              ingredient: candidate.ingredient,
              source: "photo",
            });
          return respond(
            { foods: output, provider: result.provider, model: result.model },
            200,
            null,
            secure,
          );
        }
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
        const planInput = snapshot.fullInput || snapshot.input;
        const generation = {
          id: crypto.randomUUID(),
          created: Date.now(),
          language: snapshot.input.language,
          provider: result.provider,
          model: result.model,
          repair_reason: result.repair_reason ?? null,
          recipes: output.map(r => ({...r,uses:r.uses.map(use => {
            const source = current.find(f => f.id === use.food_id);
            return {...use,kitchen_id:source.kitchen_id,kitchen_name:source.kitchen_name};
          })})),
          selected: planInput.selected,
          versions: Object.fromEntries(current.map((f) => [f.id, f.version])),
          options: {
            mode: planInput.mode,
            pantry_staples: planInput.pantry_staples,
            style: planInput.style,
            count: planInput.count,
            scope: planInput.scope,
            servings: planInput.servings,
            portion: planInput.portion,
            max_minutes: planInput.max_minutes,
            avoid: planInput.avoid,
            preference: planInput.preference,
            use_all: planInput.use_all,
            exact_count: planInput.exact_count,
          },
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
            "DELETE FROM recipe_generations WHERE user_id=? AND kitchen_id=? AND id NOT IN (SELECT id FROM recipe_generations WHERE user_id=? AND kitchen_id=? ORDER BY created DESC LIMIT 5)",
            snapshot.uid,
            snapshot.kid,
            snapshot.uid,
            snapshot.kid,
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
            ...(typeof error.reason === "string" &&
            /^[a-z0-9_]{1,50}$/.test(error.reason)
              ? { reason: error.reason }
              : {}),
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
      const member = this.member(false, true);
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
      const eligibleNow = [...current.values()].filter((f) => f.eligible);
      generation.stale =
        eligibleNow.length !== Object.keys(generation.versions).length ||
        eligibleNow.some((f) => generation.versions[f.id] !== f.version);
      return { generation };
    }
    if (request.method === "GET" && path === "/api/state") {
      const state = { csrf: this.session.csrf, user: null, web_app: true };
      if (!uid) return state;
      const user = this.one("SELECT id,email FROM users WHERE id=?", uid),
        preferences = this.prefs(),
        today = todayIn(preferences.timezone);
      const member = this.kitchenAccess.member(this.session, this.requestKitchenId, {fallback:true,allowEnded:true});
      Object.assign(state, {
        user,
        preferences,
        today,
        kitchen: null,
        kitchens: this.kitchenAccess.list(uid),
        foods: [],
        members: [],
        ingredients,
        pantry_staples: PANTRY_STAPLES.map((s) => ({id:s.id,name:preferences.language === "zh-Hant" ? s.zh : s.name})),
      });
      if (member) {
        state.kitchen = {
          id: member.kitchen_id,
          name: member.name,
          role: member.role,
          kind: member.kind,
          expires: member.expires,
          closed: partyEnded(member),
          sources: this.kitchenAccess.sources(member.kitchen_id),
        };
        state.foods = this.foods(member.kitchen_id, today);
        state.members = this.rows(
          "SELECT u.id,u.email,m.role FROM memberships m JOIN users u ON u.id=m.user_id WHERE kitchen_id=? ORDER BY m.role DESC,u.id",
          member.kitchen_id,
        );
      }
      return state;
    }
    if (request.method === "GET" && path === "/api/push/config") {
      check(uid !== null, "unauthorized", 401);
      this.member();
      return this.pushService.config(this.prefs());
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
        this.pushService.removeSession(previous);
        this.sql.exec("DELETE FROM sessions WHERE token=?", previous);
        this.sql.exec(
          "INSERT INTO sessions(token,user_id,csrf,expires) VALUES(?,?,?,?)",
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
      this.pushService.removeSession(this.session.token);
      this.sql.exec("DELETE FROM sessions WHERE token=?", this.session.token);
      await this.newSession();
      return { ok: true, csrf: this.session.csrf };
    }
    if (path === "/api/push/unsubscribe")
      return this.pushService.unsubscribe(this.session, data);
    if (path === "/api/push/subscribe") {
      this.rate("push_subscribe:" + uid, 10);
      return this.pushService.subscribe(this.session, this.member(), data);
    }
    if (path === "/api/push/status")
      return this.pushService.status(this.session, this.member(), data);
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
      const membership = this.member();
      food = this.checkedFood(data, uid, membership.kitchen_id);
      const { food_verification, ...content } = food;
      bodyHash = await sha(JSON.stringify(content));
    }
    if (["/api/invitation/preview", "/api/invitation/accept"].includes(path)) {
      codeHash = await sha(text(data.code, 100));
    }
    if (path === "/api/invitation/replace") {
      this.member(true);
      const code = token(),
        expires = Math.min(Date.now() + 604800000, this.member(true).expires ?? Infinity),
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
      const kitchenResult = this.kitchenAccess.route(this.session, this.requestKitchenId, path, data);
      if (kitchenResult) return kitchenResult;
      if (
        ["/api/invitation/preview", "/api/invitation/accept"].includes(path)
      ) {
        this.rate("invite:" + uid);
        const invitation = this.one(
          "SELECT i.*,k.name,k.kind,k.expires AS party_expires,k.ended FROM invitations i JOIN kitchens k ON k.id=i.kitchen_id WHERE code=? AND i.expires>?",
          codeHash,
          Date.now(),
        );
        check(invitation, "invalid_invitation", 404);
        check(!partyEnded({...invitation,expires:invitation.party_expires}), "party_ended",409);
        check(!this.one("SELECT 1 FROM memberships WHERE user_id=? AND kitchen_id=?",uid,invitation.kitchen_id),"already_member",409);
        check(this.kitchenAccess.list(uid).length < 20,"kitchen_limit",400);
        if (path.endsWith("accept")) {
          check(data.confirmed === true, "confirmation_required");
          this.sql.exec(
            "INSERT INTO memberships VALUES(?,?,'editor')",
            uid,
            invitation.kitchen_id,
          );
          this.kitchenAccess.activate(this.session, invitation.kitchen_id);
        }
        return {
          kitchen_id: invitation.kitchen_id,
          name: invitation.name,
          role: "editor",
          expires: invitation.expires / 1000,
        };
      }
      const member = this.member(),
        kid = member.kitchen_id;
      if (path === "/api/food/consume") {
        check(data.confirmed === true, "confirmation_required");
        check(
          Array.isArray(data.items) &&
            data.items.length > 0 &&
            data.items.length <= 100,
        );
        const seen = new Set();
        const updates = data.items.map((item) => {
          integer(item.id);
          integer(item.version);
          check(!seen.has(item.id));
          seen.add(item.id);
          const row = this.kitchenAccess.food(item.id, kid);
          check(row, "food_not_found", 404);
          check(row.version === item.version, "conflict", 409);
          check(item.all === undefined || typeof item.all === "boolean");
          const food = applyConsumption(
            { ...JSON.parse(row.data), status: row.status },
            item,
          );
          return { row, food };
        });
        for (const { row, food } of updates) {
          const { status, ...saved } = food;
          this.sql.exec(
            "UPDATE food_items SET data=?,status=?,version=version+1 WHERE id=?",
            JSON.stringify(saved),
            status,
            row.id,
          );
        }
        return { ok: true, changed: updates.length };
      }
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
          const row = this.kitchenAccess.food(item.id, kid);
          check(row, "food_not_found", 404);
          check(data.action !== "delete" || row.kitchen_id === kid,"source_edit_required",403);
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
          else {
            const current = { ...JSON.parse(row.data), status: row.status };
            const { status, ...saved } =
              data.action === "used"
                ? consumeFood(current, null, true)
                : restoreFood(current);
            this.sql.exec(
              "UPDATE food_items SET data=?,status=?,version=version+1 WHERE id=?",
              JSON.stringify(saved),
              status,
              row.id,
            );
          }
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
        this.sql.exec("DELETE FROM party_sources WHERE party_id=? AND owner_id=?", kid, data.user_id);
        this.pushService.removeMember(data.user_id, kid);
        return { ok: true };
      }
      if (path === "/api/kitchen/leave") {
        check(member.role === "editor", "owner_cannot_leave", 403);
        check(data.confirmed === true, "confirmation_required");
        this.sql.exec("DELETE FROM memberships WHERE user_id=? AND kitchen_id=?", uid, kid);
        this.sql.exec("DELETE FROM party_sources WHERE party_id=? AND owner_id=?", kid, uid);
        this.pushService.removeMember(uid, kid);
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
          const { status, ...saved } = consumeFood(
            { ...JSON.parse(row.data), status: row.status },
            null,
            true,
          );
          this.sql.exec(
            "UPDATE food_items SET data=?,status=?,version=version+1 WHERE id=?",
            JSON.stringify(saved),
            status,
            data.id,
          );
        } else {
          check(row.status === "active", "food_used", 409);
          const previous = JSON.parse(row.data);
          const updated = {
            ...previous,
            ...this.checkedFood({ ...previous, ...data }, uid, kid, previous),
          };
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
  async scheduled(controller, env, ctx) {
    const job = env.KITCHENS.get(
      env.KITCHENS.idFromName("shared-kitchens-v1"),
    ).runPushSchedule(controller.scheduledTime);
    ctx.waitUntil(job);
  },
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path.startsWith("/api/") || path === "/healthz") {
      // Finish bounded request-body reads before forwarding to the actor. An
      // early auth/CSRF rejection must not race the incoming network stream.
      let forwarded = request;
      if (request.method === "POST" && request.body) {
        const limit = path === "/api/food/recognize" ? 1200000 : 16384;
        if (Number(request.headers.get("Content-Length") || 0) > limit)
          return respond({ error: { code: "invalid_input" } }, 413);
        const reader = request.body.getReader(),
          bytes = new Uint8Array(limit);
        let size = 0;
        try {
          for (;;) {
            const chunk = await reader.read();
            if (chunk.done) break;
            size += chunk.value.byteLength;
            if (size > limit) {
              await reader.cancel();
              return respond({ error: { code: "invalid_input" } }, 413);
            }
            bytes.set(chunk.value, size - chunk.value.byteLength);
          }
          forwarded = new Request(request, { body: bytes.slice(0, size) });
        } catch {
          return respond({ error: { code: "invalid_input" } }, 400);
        } finally {
          reader.releaseLock();
        }
      }
      return env.KITCHENS.get(
        env.KITCHENS.idFromName("shared-kitchens-v1"),
      ).fetch(forwarded);
    }
    const response = await env.ASSETS.fetch(request),
      headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(securityHeaders))
      headers.set(key, value);
    if (new URL(request.url).protocol === "https:")
      headers.set("Strict-Transport-Security", "max-age=31536000");
    return new Response(response.body, { status: response.status, headers });
  },
};
