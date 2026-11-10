import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { AccountService, ACCOUNT_SCHEMA } from '../../web/account.js';
import { KitchenAccess } from '../../web/kitchens.js';
import { LEGAL_VERSION, legalDocuments } from '../../web/legal.js';

function fixture() {
 const db=new DatabaseSync(':memory:');
 db.exec(`PRAGMA foreign_keys=ON;
 CREATE TABLE users(id INTEGER PRIMARY KEY,email TEXT,password TEXT);
 CREATE TABLE kitchens(id INTEGER PRIMARY KEY,name TEXT,kind TEXT DEFAULT 'home',expires REAL,ended REAL);
 CREATE TABLE memberships(user_id INTEGER REFERENCES users(id),kitchen_id INTEGER REFERENCES kitchens(id),role TEXT,PRIMARY KEY(user_id,kitchen_id));
 CREATE UNIQUE INDEX one_owner ON memberships(kitchen_id) WHERE role='owner';
 CREATE TABLE sessions(token TEXT PRIMARY KEY,user_id INTEGER REFERENCES users(id),csrf TEXT,expires REAL);
 CREATE TABLE user_preferences(user_id INTEGER PRIMARY KEY REFERENCES users(id),data TEXT);
 CREATE TABLE food_items(id INTEGER PRIMARY KEY,kitchen_id INTEGER REFERENCES kitchens(id),data TEXT);
 CREATE TABLE party_sources(party_id INTEGER REFERENCES kitchens(id),source_id INTEGER REFERENCES kitchens(id),owner_id INTEGER REFERENCES users(id),PRIMARY KEY(party_id,source_id));
 CREATE TABLE invitations(code TEXT,kitchen_id INTEGER REFERENCES kitchens(id));
 CREATE TABLE recipe_generations(id TEXT,user_id INTEGER,kitchen_id INTEGER,data TEXT,created REAL);
 CREATE TABLE food_assessments(user_id INTEGER,kitchen_id INTEGER,data TEXT,created REAL);
 CREATE TABLE ai_usage(user_id INTEGER,day TEXT,kind TEXT,count INTEGER,PRIMARY KEY(day,kind,user_id));
 CREATE TABLE mutation_keys(user_id INTEGER REFERENCES users(id),kitchen_id INTEGER REFERENCES kitchens(id));
 CREATE TABLE push_subscriptions(id TEXT,user_id INTEGER,kitchen_id INTEGER);
 INSERT INTO users VALUES(1,'a@example.test','not-a-real-hash'),(2,'b@example.test','another-hash');
 INSERT INTO kitchens(id,name) VALUES(11,'Shared A'),(22,'Private B'),(33,'Private A');
 INSERT INTO memberships VALUES(1,11,'owner'),(2,11,'editor'),(2,22,'owner'),(1,33,'owner');
 INSERT INTO user_preferences VALUES(1,'{"timezone":"Asia/Hong_Kong"}'),(2,'{"timezone":"Asia/Hong_Kong"}');
 INSERT INTO sessions VALUES('private-session',1,'private-csrf',9999999999999);
 INSERT INTO food_items VALUES(31,11,'shared'),(32,22,'other private'),(33,33,'own private');
 INSERT INTO mutation_keys VALUES(1,33);
 INSERT INTO invitations VALUES('private-invitation',33);
 INSERT INTO recipe_generations VALUES('saved',1,11,'{}',1);
 INSERT INTO food_assessments VALUES(1,11,'{}',1);
 ${ACCOUNT_SCHEMA}`);
 const sql={exec(q,...a){const rows=db.prepare(q).all(...a);return {toArray:()=>rows};}};
 const store={sql,rows:(q,...a)=>sql.exec(q,...a).toArray(),one(q,...a){return this.rows(q,...a)[0]??null;},transaction(fn){db.exec('BEGIN');try{const out=fn();db.exec('COMMIT');return out;}catch(e){db.exec('ROLLBACK');throw e;}}};
 store.kitchenAccess=new KitchenAccess(store);
 return {db,store,account:new AccountService(store)};
}

test('legacy accounts keep data, default to no optional AI, and require versioned explicit acceptance',()=>{
 const {db,store:s,account:a}=fixture();
 assert.equal(a.consent(1).accepted,false);assert.equal(a.consent(1).ai_text,false);
 assert.equal(s.one('SELECT data FROM food_items WHERE id=31').data,'shared');
 assert.throws(()=>a.requireTerms(1),e=>e.code==='agreement_required');
 assert.throws(()=>a.accept(1,{accepted:true,version:'old'}),e=>e.code==='agreement_required');
 a.accept(1,{accepted:true,version:LEGAL_VERSION});
 assert.throws(()=>a.requireAI(1,'text'),e=>e.code==='ai_consent_required');
 a.privacy(1,{ai_text:true});a.requireAI(1,'text');
 assert.throws(()=>a.requireAI(1,'photo'),e=>e.code==='ai_consent_required');
 assert.throws(()=>a.privacy(1,{ai_photo:'true'}));
 s.sql.exec("UPDATE user_consents SET terms_version='old' WHERE user_id=1");
 a.accept(1,{accepted:true,version:LEGAL_VERSION});
 assert.equal(a.consent(1).ai_text,false);
 const docs=legalDocuments();assert.equal(docs.contact,'Bite.limited@gmail.com');
 assert.ok(docs.terms.every(x=>x.body.en && x.body['zh-Hant']));db.close();
});

test('history erasure and changed permissions invalidate earlier consent revisions without touching stock',()=>{
 const {db,store:s,account:a}=fixture();
 a.accept(1,{accepted:true,version:LEGAL_VERSION});a.privacy(1,{ai_text:true,ai_photo:true});
 const before=a.consent(1).revision;a.clearHistory(1);
 assert.ok(a.consent(1).revision>before);assert.equal(s.rows('SELECT * FROM recipe_generations').length,0);
 assert.equal(s.rows('SELECT * FROM food_items').length,3);
 const changed=a.consent(1).revision;a.privacy(1,{ai_photo:false});
 assert.ok(a.consent(1).revision>changed);assert.equal(a.consent(1).ai_text,true);
 assert.equal(s.one('SELECT email FROM users WHERE id=2').email,'b@example.test');db.close();
});

test('shared ownership blocks deletion; transfer revokes grants and deletion preserves other members and kitchens',()=>{
 const {db,store:s,account:a}=fixture();
 assert.throws(()=>s.transaction(()=>a.delete(1,'a@example.test')),e=>e.code==='transfer_required');
 assert.equal(s.rows('SELECT * FROM food_items').length,3);
 s.sql.exec("INSERT INTO kitchens VALUES(44,'Party','party',?,NULL)",Date.now()+86400000);
 s.sql.exec("INSERT INTO memberships VALUES(1,44,'owner')");s.sql.exec('INSERT INTO party_sources VALUES(44,11,1)');
 assert.throws(()=>s.transaction(()=>a.transfer(1,11,999)),e=>e.code==='member_not_found');
 s.transaction(()=>a.transfer(1,11,2));assert.equal(s.rows('SELECT * FROM party_sources').length,0);
 s.sql.exec("INSERT INTO ai_usage VALUES(1,'2026-11-10','recipes',3)");
 s.transaction(()=>a.delete(1,'a@example.test'));
 assert.equal(s.one("SELECT count FROM ai_usage WHERE user_id=0 AND kind='recipes'").count,3);
 assert.equal(s.rows("SELECT * FROM ai_usage WHERE user_id=1").length,0);
 assert.equal(s.one('SELECT * FROM users WHERE id=1'),null);
 assert.equal(s.one('SELECT role FROM memberships WHERE user_id=2 AND kitchen_id=11').role,'owner');
 assert.equal(s.one('SELECT data FROM food_items WHERE id=31').data,'shared');
 assert.equal(s.one('SELECT data FROM food_items WHERE id=32').data,'other private');
 assert.equal(s.one('SELECT * FROM kitchens WHERE id=33'),null);db.close();
});

test('an unexpected deletion constraint rolls the complete account transaction back',()=>{
 const {db,store:s,account:a}=fixture();s.transaction(()=>a.transfer(1,11,2));
 db.exec('CREATE TABLE extra_hold(user_id INTEGER REFERENCES users(id));INSERT INTO extra_hold VALUES(1)');
 assert.throws(()=>s.transaction(()=>a.delete(1,'a@example.test')));
 assert.equal(s.one('SELECT email FROM users WHERE id=1').email,'a@example.test');
 assert.equal(s.one('SELECT data FROM food_items WHERE id=33').data,'own private');
 assert.equal(s.one("SELECT token FROM sessions WHERE user_id=1").token,'private-session');db.close();
});
