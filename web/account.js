import { check, integer, text, verifyPassword, passwordHash, todayIn } from "./domain.js";
import { LEGAL_VERSION } from "./legal.js";

export const ACCOUNT_SCHEMA = `CREATE TABLE IF NOT EXISTS user_consents(user_id INTEGER PRIMARY KEY REFERENCES users(id),terms_version TEXT,accepted_at REAL,ai_text INTEGER NOT NULL DEFAULT 0,ai_photo INTEGER NOT NULL DEFAULT 0,updated_at REAL,revision INTEGER NOT NULL DEFAULT 0);`;

export function migrateAccount(storage) {
  if (!storage.sql.exec("PRAGMA table_info(user_consents)").toArray().some(c=>c.name === "revision"))
    storage.transactionSync(()=>storage.sql.exec("ALTER TABLE user_consents ADD COLUMN revision INTEGER NOT NULL DEFAULT 0"));
}

export class AccountService {
  constructor(store) { this.s = store; }
  consent(uid) {
    const row = this.s.one("SELECT * FROM user_consents WHERE user_id=?",uid);
    return {version:LEGAL_VERSION,accepted:row?.terms_version === LEGAL_VERSION,accepted_at:row?.accepted_at ?? null,ai_text:row?.ai_text === 1,ai_photo:row?.ai_photo === 1,updated_at:row?.updated_at ?? null,revision:row?.revision ?? 0};
  }
  requireTerms(uid) { check(this.consent(uid).accepted,"agreement_required",428); }
  requireAI(uid,kind) {
    this.requireTerms(uid);
    check(this.consent(uid)[kind === "photo" ? "ai_photo" : "ai_text"],"ai_consent_required",403);
  }
  accept(uid,data) {
    check(data.accepted === true && data.version === LEGAL_VERSION,"agreement_required",428);
    this.s.sql.exec("INSERT INTO user_consents(user_id,terms_version,accepted_at,updated_at) VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET ai_text=CASE WHEN user_consents.terms_version=excluded.terms_version THEN user_consents.ai_text ELSE 0 END,ai_photo=CASE WHEN user_consents.terms_version=excluded.terms_version THEN user_consents.ai_photo ELSE 0 END,revision=user_consents.revision+CASE WHEN user_consents.terms_version=excluded.terms_version THEN 0 ELSE 1 END,terms_version=excluded.terms_version,accepted_at=excluded.accepted_at,updated_at=excluded.updated_at",uid,LEGAL_VERSION,Date.now(),Date.now());
  }
  privacy(uid,data) {
    for (const key of ["ai_text","ai_photo"]) if (Object.hasOwn(data,key)) check(typeof data[key] === "boolean");
    if (data.ai_text === true || data.ai_photo === true) this.requireTerms(uid);
    const before = this.consent(uid);
    const textAI = data.ai_text ?? before.ai_text, photoAI = data.ai_photo ?? before.ai_photo;
    this.s.sql.exec("INSERT INTO user_consents(user_id,ai_text,ai_photo,updated_at) VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET revision=user_consents.revision+CASE WHEN user_consents.ai_text<>excluded.ai_text OR user_consents.ai_photo<>excluded.ai_photo THEN 1 ELSE 0 END,ai_text=excluded.ai_text,ai_photo=excluded.ai_photo,updated_at=excluded.updated_at",uid,Number(textAI),Number(photoAI),Date.now());
    if (textAI !== before.ai_text) this.s.sql.exec("DELETE FROM food_assessments WHERE user_id=?",uid);
    if ((!textAI && before.ai_text) || (!photoAI && before.ai_photo)) this.clearHistory(uid);
    return this.consent(uid);
  }
  clearHistory(uid) {
    this.s.sql.exec("INSERT INTO user_consents(user_id,revision) VALUES(?,1) ON CONFLICT(user_id) DO UPDATE SET revision=user_consents.revision+1",uid);
    this.s.sql.exec("DELETE FROM recipe_generations WHERE user_id=?",uid);
    this.s.sql.exec("DELETE FROM food_assessments WHERE user_id=?",uid);
  }
  cleanup(when = Date.now()) {
    this.s.sql.exec("DELETE FROM food_assessments WHERE created<?",when-86400000);
    this.s.sql.exec("DELETE FROM ai_usage WHERE day<?",new Date(when-30*86400000).toISOString().slice(0,10));
  }
  status(uid) {
    return {sessions:this.s.one("SELECT COUNT(*) AS count FROM sessions WHERE user_id=? AND expires>?",uid,Date.now()).count,
      owned:this.s.rows("SELECT k.id,k.name,k.kind,COUNT(other.user_id) AS other_members FROM memberships own JOIN kitchens k ON k.id=own.kitchen_id LEFT JOIN memberships other ON other.kitchen_id=k.id AND other.user_id<>own.user_id WHERE own.user_id=? AND own.role='owner' GROUP BY k.id ORDER BY k.id",uid)};
  }
  export(uid) {
    const kitchens=this.s.kitchenAccess.list(uid);
    const prefs=JSON.parse(this.s.one("SELECT data FROM user_preferences WHERE user_id=?",uid).data);
    return {format:"last-minute-bites-export-v1",exported_at:new Date().toISOString(),
      account:this.s.one("SELECT id,email FROM users WHERE id=?",uid),
      preferences:prefs,
      privacy:this.consent(uid),
      kitchens:kitchens.map(k=>({id:k.id,name:k.name,kind:k.kind,role:k.role,closed:k.closed,foods:this.s.foods(k.id,todayIn(prefs.timezone))})),
      recipes:this.s.rows("SELECT g.data FROM recipe_generations g JOIN memberships m ON m.user_id=g.user_id AND m.kitchen_id=g.kitchen_id WHERE g.user_id=? ORDER BY g.created DESC",uid).map(r=>JSON.parse(r.data))};
  }
  async reauthenticate(uid,password) {
    this.s.rate("account_password:"+uid,5);
    const row=this.s.one("SELECT password FROM users WHERE id=?",uid);
    check(typeof password === "string" && password.length<=128 && row && await verifyPassword(password,row.password),"invalid_credentials",401);
  }
  transfer(uid,kid,target) {
    integer(target);
    check(target !== uid,"invalid_input");
    check(this.s.one("SELECT 1 FROM memberships WHERE user_id=? AND kitchen_id=? AND role='owner'",uid,kid),"owner_only",403);
    check(this.s.one("SELECT 1 FROM memberships WHERE user_id=? AND kitchen_id=? AND role='editor'",target,kid),"member_not_found",404);
    this.s.sql.exec("UPDATE memberships SET role='editor' WHERE user_id=? AND kitchen_id=?",uid,kid);
    this.s.sql.exec("UPDATE memberships SET role='owner' WHERE user_id=? AND kitchen_id=?",target,kid);
    this.s.sql.exec("DELETE FROM party_sources WHERE source_id=?",kid);
  }
  delete(uid,email) {
    const account=this.s.one("SELECT email FROM users WHERE id=?",uid);
    check(email === account?.email,"confirmation_required");
    const owned=this.status(uid).owned;
    check(!owned.some(k=>k.other_members>0),"transfer_required",409);
    const sql=this.s.sql;
    sql.exec("DELETE FROM party_sources WHERE owner_id=?",uid);
    for (const k of owned) {
      sql.exec("DELETE FROM party_sources WHERE party_id=? OR source_id=?",k.id,k.id);
      sql.exec("DELETE FROM invitations WHERE kitchen_id=?",k.id);
      sql.exec("DELETE FROM push_subscriptions WHERE kitchen_id=?",k.id);
      sql.exec("DELETE FROM food_assessments WHERE kitchen_id=?",k.id);
      sql.exec("DELETE FROM recipe_generations WHERE kitchen_id=?",k.id);
      sql.exec("DELETE FROM mutation_keys WHERE kitchen_id=?",k.id);
      sql.exec("DELETE FROM food_items WHERE kitchen_id=?",k.id);
      sql.exec("DELETE FROM memberships WHERE kitchen_id=?",k.id);
      sql.exec("DELETE FROM kitchens WHERE id=?",k.id);
    }
    // Retain only an anonymous aggregate so delete/re-register cannot reset the
    // site's daily provider budget. No account identifier survives in this row.
    sql.exec("INSERT INTO ai_usage(day,kind,user_id,count) SELECT day,kind,0,count FROM ai_usage WHERE user_id=? ON CONFLICT(day,kind,user_id) DO UPDATE SET count=ai_usage.count+excluded.count",uid);
    for (const table of ["push_subscriptions","sessions","food_assessments","recipe_generations","ai_usage","mutation_keys","memberships","user_preferences","user_consents"]) sql.exec(`DELETE FROM ${table} WHERE user_id=?`,uid);
    sql.exec("DELETE FROM users WHERE id=?",uid);
  }
  async route(session,requested,path,data,method) {
    const uid=session.user_id,s=this.s;
    if (method === "GET" && path === "/api/account/status") return this.status(uid);
    if (method === "GET" && path === "/api/account/export") {s.rate("account_export:"+uid,6);return this.export(uid);}
    if (method !== "POST") return null;
    if (path === "/api/legal/accept") {this.accept(uid,data);return {ok:true,consent:this.consent(uid)};}
    if (path === "/api/privacy") return s.transaction(()=>({ok:true,consent:this.privacy(uid,data)}));
    if (path === "/api/account/history/clear") {
      check(data.confirmed === true,"confirmation_required");
      s.transaction(()=>this.clearHistory(uid));return {ok:true};
    }
    if (["/api/account/password","/api/account/logout-all","/api/account/delete","/api/kitchen/transfer"].includes(path)) {
      await this.reauthenticate(uid,data.password);
      if (path === "/api/account/password") {
        check(typeof data.new_password === "string" && data.new_password.length>=10 && data.new_password.length<=128,"password_length");
        check(data.new_password === data.confirm_password,"password_mismatch");
        check(data.new_password !== data.password,"password_unchanged");
        const hash=await passwordHash(data.new_password);
        s.transaction(()=>{
          s.sql.exec("UPDATE users SET password=? WHERE id=?",hash,uid);
          s.sql.exec("DELETE FROM push_subscriptions WHERE user_id=? AND session_token<>?",uid,session.token);
          s.sql.exec("DELETE FROM sessions WHERE user_id=? AND token<>?",uid,session.token);
        });return {ok:true};
      }
      check(data.confirmed === true,"confirmation_required");
      if (path === "/api/kitchen/transfer") {
        const member=s.kitchenAccess.member(session,requested,{allowEnded:true});
        s.transaction(()=>this.transfer(uid,member.kitchen_id,data.user_id));return {ok:true};
      }
      if (path === "/api/account/delete") s.transaction(()=>this.delete(uid,text(data.email,254).toLowerCase()));
      else s.transaction(()=>{
        s.sql.exec("DELETE FROM push_subscriptions WHERE user_id=?",uid);
        s.sql.exec("DELETE FROM sessions WHERE user_id=?",uid);
      });
      await s.newSession();return {ok:true,csrf:s.session.csrf};
    }
    return null;
  }
}
