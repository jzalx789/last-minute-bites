import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { migrateKitchens, KitchenAccess, partyEnded } from '../../web/kitchens.js';

function fixture() {
  const db = new DatabaseSync(':memory:');
  db.exec(`PRAGMA foreign_keys=ON;
    CREATE TABLE users(id INTEGER PRIMARY KEY,email TEXT);
    CREATE TABLE kitchens(id INTEGER PRIMARY KEY,name TEXT NOT NULL);
    CREATE TABLE memberships(user_id INTEGER PRIMARY KEY REFERENCES users(id),kitchen_id INTEGER NOT NULL REFERENCES kitchens(id),role TEXT NOT NULL);
    CREATE UNIQUE INDEX one_owner ON memberships(kitchen_id) WHERE role='owner';
    CREATE TABLE sessions(token TEXT PRIMARY KEY,user_id INTEGER,csrf TEXT,expires REAL);
    CREATE TABLE food_items(id INTEGER PRIMARY KEY,kitchen_id INTEGER REFERENCES kitchens(id),data TEXT);
    CREATE TABLE push_subscriptions(id TEXT,kitchen_id INTEGER);
    CREATE TABLE invitations(code TEXT,kitchen_id INTEGER);
    INSERT INTO users VALUES(1,'owner'),(2,'guest');
    INSERT INTO kitchens VALUES(11,'Original kitchen'),(22,'Guest kitchen');
    INSERT INTO memberships VALUES(1,11,'owner'),(2,22,'owner');
    INSERT INTO sessions VALUES('session',1,'csrf',9999999999999);
    INSERT INTO food_items VALUES(31,11,'untouched');`);
  const sql = {exec(query,...args) { return {toArray:() => db.prepare(query).all(...args)}; }};
  // Cloudflare exec executes immediately; preserve that contract for writes.
  sql.exec = (query,...args) => { const rows=db.prepare(query).all(...args); return {toArray:()=>rows}; };
  const storage = {sql,transactionSync(fn) { db.exec('BEGIN'); try {const out=fn();db.exec('COMMIT');return out;} catch(e) {db.exec('ROLLBACK');throw e;} }};
  const store = {sql,rows:(q,...a)=>sql.exec(q,...a).toArray(),one(q,...a){return this.rows(q,...a)[0] ?? null;},insert(q,...a){sql.exec(q,...a);return Number(db.prepare('SELECT last_insert_rowid() AS id').get().id);}};
  return {db,storage,store};
}

test('atomic multi-kitchen migration preserves old IDs, ownership, foods and sessions and is idempotent',()=>{
  const {db,storage,store:s}=fixture();
  migrateKitchens(storage); migrateKitchens(storage);
  assert.equal(s.one('SELECT data FROM food_items WHERE id=31').data,'untouched');
  assert.equal(s.one("SELECT csrf FROM sessions WHERE token='session'").csrf,'csrf');
  assert.equal(s.one('SELECT kind FROM kitchens WHERE id=11').kind,'home');
  s.sql.exec("INSERT INTO memberships VALUES(1,22,'editor')");
  assert.equal(s.rows('SELECT * FROM memberships WHERE user_id=1').length,2);
  assert.throws(()=>s.sql.exec("INSERT INTO memberships VALUES(2,11,'owner')"));
  db.close();
});

test('failed migration rolls back before retry without losing existing memberships',()=>{
  const {db,storage,store:s}=fixture();
  const exec=storage.sql.exec;let fail=true;
  storage.sql.exec=(q,...a)=>{if(fail && q.startsWith('ALTER TABLE sessions'))throw Error('interruption');return exec(q,...a);};
  assert.throws(()=>migrateKitchens(storage),/interruption/);
  assert.equal(s.rows('SELECT * FROM memberships').length,2);
  assert.equal(s.rows('PRAGMA table_info(memberships)').find(c=>c.name==='user_id').pk,1);
  fail=false;migrateKitchens(storage);
  assert.equal(s.rows('SELECT * FROM memberships').length,2);
  db.close();
});

test('only live parties pool owner-approved sources, and departure/revocation/expiry stop sharing',()=>{
  const {db,storage,store:s}=fixture();migrateKitchens(storage);
  const access=new KitchenAccess(s),session={user_id:1,token:'session'};
  const party=access.route(session,null,'/api/kitchen/create',{name:'Gathering',kind:'party',hours:24,source_ids:[11]}).kitchen_id;
  assert.deepEqual(access.scope(11),[11]);
  assert.deepEqual(access.scope(party),[party,11]);
  assert.equal(access.food(31,party).kitchen_id,11);
  assert.throws(()=>access.addSource(1,{kind:'party',kitchen_id:party},22),e=>e.code==='source_owner_only');
  s.sql.exec("INSERT INTO memberships VALUES(2,?,'editor')",party);
  access.addSource(2,{kind:'party',kitchen_id:party},22);
  assert.deepEqual(access.scope(party),[party,11,22]);
  s.sql.exec('DELETE FROM memberships WHERE user_id=2 AND kitchen_id=?',party);
  assert.deepEqual(access.scope(party),[party,11]);
  s.sql.exec('UPDATE kitchens SET expires=? WHERE id=?',Date.now()-1,party);
  assert.deepEqual(access.scope(party),[party]);
  assert.throws(()=>access.member(session,party),e=>e.code==='party_ended');
  assert.equal(access.member(session,party,{allowEnded:true}).kind,'party');
  assert.equal(partyEnded({kind:'home',expires:1}),false);
  db.close();
});

test('explicit tab context is independent of session default and never falls back on writes',()=>{
  const {db,storage,store:s}=fixture();migrateKitchens(storage);
  const access=new KitchenAccess(s),session={user_id:1,token:'session',kitchen_id:22};
  s.sql.exec("INSERT INTO memberships VALUES(1,22,'editor')");
  assert.equal(access.member(session,11).kitchen_id,11);
  assert.equal(access.member(session,22).role,'editor');
  assert.throws(()=>access.member(session,999),e=>e.code==='no_kitchen');
  assert.equal(access.member(session,999,{fallback:true}).kitchen_id,11);
  db.close();
});

test('renaming updates only the explicitly selected kitchen and preserves stock, membership and sharing',()=>{
  const {db,storage,store:s}=fixture();migrateKitchens(storage);
  const access=new KitchenAccess(s),session={user_id:1,token:'session',kitchen_id:22};
  s.sql.exec("INSERT INTO memberships VALUES(1,22,'editor')");
  const party=access.route(session,11,'/api/kitchen/create',{name:'Party',kind:'party',source_ids:[11]}).kitchen_id;
  const before=s.rows('SELECT * FROM memberships');
  assert.deepEqual(access.route(session,11,'/api/kitchen/rename',{name:'  試用冰箱 08  '}),{ok:true,name:'試用冰箱 08'});
  assert.equal(s.one('SELECT name FROM kitchens WHERE id=11').name,'試用冰箱 08');
  assert.equal(s.one('SELECT name FROM kitchens WHERE id=22').name,'Guest kitchen');
  assert.equal(s.one('SELECT data FROM food_items WHERE id=31').data,'untouched');
  assert.deepEqual(s.rows('SELECT * FROM memberships'),before);
  assert.equal(access.sources(party)[0].name,'試用冰箱 08');
  db.close();
});

test('rename requires active ownership, validates names and rejects a foreign tab context',()=>{
  const {db,storage,store:s}=fixture();migrateKitchens(storage);
  const access=new KitchenAccess(s),session={user_id:1,token:'session',kitchen_id:11};
  s.sql.exec("INSERT INTO memberships VALUES(2,11,'editor')");
  assert.throws(()=>access.route({user_id:2},11,'/api/kitchen/rename',{name:'Denied'}),e=>e.code==='owner_only');
  assert.throws(()=>access.route(session,22,'/api/kitchen/rename',{name:'Denied'}),e=>e.code==='no_kitchen');
  for (const name of ['', '   ', 'x'.repeat(81), null])
    assert.throws(()=>access.route(session,11,'/api/kitchen/rename',{name}),e=>e.code==='invalid_input');
  const party=access.route(session,null,'/api/kitchen/create',{name:'Party',kind:'party'}).kitchen_id;
  s.sql.exec('UPDATE kitchens SET ended=? WHERE id=?',Date.now(),party);
  assert.throws(()=>access.route(session,party,'/api/kitchen/rename',{name:'Denied'}),e=>e.code==='party_ended');
  assert.equal(s.one('SELECT name FROM kitchens WHERE id=11').name,'Original kitchen');
  db.close();
});
