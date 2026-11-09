import { check, integer, text } from "./domain.js";

// Atomic, once-only SQLite migration. Existing IDs, memberships, sessions and
// food records stay in the same Durable Object; no new namespace or reseeding.
export function migrateKitchens(storage) {
  const sql = storage.sql;
  sql.exec("CREATE TABLE IF NOT EXISTS schema_migrations(tag TEXT PRIMARY KEY)");
  if (sql.exec("SELECT tag FROM schema_migrations WHERE tag='multi-kitchens-v1'").toArray().length) return;
  storage.transactionSync(() => {
    sql.exec("CREATE TABLE memberships_multi(user_id INTEGER NOT NULL REFERENCES users(id),kitchen_id INTEGER NOT NULL REFERENCES kitchens(id),role TEXT NOT NULL CHECK(role IN ('owner','editor')),PRIMARY KEY(user_id,kitchen_id))");
    sql.exec("INSERT INTO memberships_multi SELECT * FROM memberships");
    sql.exec("DROP TABLE memberships");
    sql.exec("ALTER TABLE memberships_multi RENAME TO memberships");
    sql.exec("CREATE UNIQUE INDEX one_owner ON memberships(kitchen_id) WHERE role='owner'");
    sql.exec("ALTER TABLE sessions ADD COLUMN kitchen_id INTEGER");
    sql.exec("ALTER TABLE kitchens ADD COLUMN kind TEXT NOT NULL DEFAULT 'home'");
    sql.exec("ALTER TABLE kitchens ADD COLUMN expires REAL");
    sql.exec("ALTER TABLE kitchens ADD COLUMN ended REAL");
    sql.exec("CREATE TABLE party_sources(party_id INTEGER NOT NULL REFERENCES kitchens(id),source_id INTEGER NOT NULL REFERENCES kitchens(id),owner_id INTEGER NOT NULL REFERENCES users(id),PRIMARY KEY(party_id,source_id))");
    sql.exec("INSERT INTO schema_migrations VALUES('multi-kitchens-v1')");
  });
}

export const partyEnded = (k, now = Date.now()) => k?.kind === "party" && (!!k.ended || k.expires <= now);

export class KitchenAccess {
  constructor(store) { this.s = store; }
  list(uid) {
    return this.s.rows("SELECT k.*,m.role FROM memberships m JOIN kitchens k ON k.id=m.kitchen_id WHERE m.user_id=? ORDER BY k.id", uid)
      .map(k => ({...k, closed: partyEnded(k)}));
  }
  member(session, requested = null, {fallback = false, allowEnded = false} = {}) {
    const id = requested == null ? session.kitchen_id : Number(requested);
    if (requested != null) integer(id);
    let row = id == null ? null : this.s.one("SELECT m.*,k.name,k.kind,k.expires,k.ended FROM memberships m JOIN kitchens k ON k.id=m.kitchen_id WHERE m.user_id=? AND m.kitchen_id=?", session.user_id, id);
    if (!row && (fallback || requested == null)) row = this.s.one("SELECT m.*,k.name,k.kind,k.expires,k.ended FROM memberships m JOIN kitchens k ON k.id=m.kitchen_id WHERE m.user_id=? ORDER BY k.id LIMIT 1", session.user_id);
    if (!row && fallback) return null;
    check(row, "no_kitchen", 403);
    check(allowEnded || !partyEnded(row), "party_ended", 409);
    return row;
  }
  sources(kid) {
    // A source grant remains valid only while its owner owns that source and
    // is still in the party. Ordinary kitchens can never pool other inventory.
    return this.s.rows(`SELECT k.id,k.name,p.owner_id FROM party_sources p
      JOIN kitchens party ON party.id=p.party_id AND party.kind='party'
      JOIN kitchens k ON k.id=p.source_id AND k.kind='home'
      JOIN memberships owner ON owner.user_id=p.owner_id AND owner.kitchen_id=p.source_id AND owner.role='owner'
      JOIN memberships participant ON participant.user_id=p.owner_id AND participant.kitchen_id=p.party_id
      WHERE p.party_id=? AND party.ended IS NULL AND party.expires>? ORDER BY k.id`, kid, Date.now());
  }
  scope(kid) { return [kid, ...this.sources(kid).map(k => k.id)]; }
  food(id, kid) {
    const scope = this.scope(kid);
    return this.s.one(`SELECT * FROM food_items WHERE id=? AND kitchen_id IN (${scope.map(() => '?').join(',')})`, id, ...scope);
  }
  activate(session, kid) {
    this.s.sql.exec("UPDATE sessions SET kitchen_id=? WHERE token=?", kid, session.token);
  }
  addSource(uid, party, source) {
    integer(source);
    check(party.kind === 'party', 'not_party', 400);
    const row = this.s.one("SELECT k.id FROM kitchens k JOIN memberships m ON m.kitchen_id=k.id WHERE k.id=? AND k.kind='home' AND m.user_id=? AND m.role='owner'", source, uid);
    check(row, 'source_owner_only', 403);
    check(this.sources(party.kitchen_id).length < 8 || this.sources(party.kitchen_id).some(k => k.id === source), 'kitchen_limit', 400);
    this.s.sql.exec("INSERT INTO party_sources VALUES(?,?,?) ON CONFLICT(party_id,source_id) DO UPDATE SET owner_id=excluded.owner_id", party.kitchen_id, source, uid);
  }
  route(session, requested, path, data) {
    const s = this.s, uid = session.user_id;
    if (path === '/api/kitchen/switch') {
      integer(data.kitchen_id);
      this.member(session, data.kitchen_id, {allowEnded: true});
      this.activate(session, data.kitchen_id);
      return {ok:true,kitchen_id:data.kitchen_id};
    }
    if (path === '/api/kitchen/create') {
      check(this.list(uid).length < 20, 'kitchen_limit', 400);
      const kind = data.kind ?? 'home';
      check(['home','party'].includes(kind));
      const hours = data.hours ?? 24;
      if (kind === 'party') check([24,48,168].includes(hours));
      const kid = s.insert("INSERT INTO kitchens(name,kind,expires) VALUES(?,?,?)", text(data.name,80), kind, kind === 'party' ? Date.now()+hours*3600000 : null);
      s.sql.exec("INSERT INTO memberships VALUES(?,?,'owner')", uid, kid);
      const sources = data.source_ids ?? [];
      check(Array.isArray(sources) && sources.length <= 8 && new Set(sources).size === sources.length);
      check(kind === 'party' || sources.length === 0, 'not_party', 400);
      const party = {kitchen_id:kid, kind};
      for (const source of sources) this.addSource(uid, party, source);
      this.activate(session, kid);
      return {ok:true,kitchen_id:kid};
    }
    if (!path.startsWith('/api/party/')) return null;
    const member = this.member(session, requested);
    check(member.kind === 'party','not_party',400);
    if (path === '/api/party/source/add') {
      check(data.confirmed === true,'confirmation_required');
      this.addSource(uid, member, data.source_id);
    } else if (path === '/api/party/source/remove') {
      integer(data.source_id);
      check(data.confirmed === true,'confirmation_required');
      const source = s.one("SELECT * FROM party_sources WHERE party_id=? AND source_id=?", member.kitchen_id,data.source_id);
      check(source && (member.role === 'owner' || source.owner_id === uid),'owner_only',403);
      s.sql.exec("DELETE FROM party_sources WHERE party_id=? AND source_id=?",member.kitchen_id,data.source_id);
    } else if (path === '/api/party/end') {
      check(member.role === 'owner','owner_only',403);
      check(data.confirmed === true,'confirmation_required');
      s.sql.exec("UPDATE kitchens SET ended=? WHERE id=?",Date.now(),member.kitchen_id);
      s.sql.exec("DELETE FROM invitations WHERE kitchen_id=?",member.kitchen_id);
      s.sql.exec("DELETE FROM push_subscriptions WHERE kitchen_id=?",member.kitchen_id);
    } else return null;
    return {ok:true};
  }
}
