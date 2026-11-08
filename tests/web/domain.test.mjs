import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateDate,validateFood,calendarDate,eligible,passwordHash,verifyPassword,todayIn} from '../../web/domain.js';

test('calendar month/year edges and local dates',()=>{
  assert.equal(calculateDate('2024-01-31',1,'months'),'2024-02-29');
  assert.equal(calculateDate('2024-02-29',1,'years'),'2025-02-28');
  assert.equal(calculateDate('2024-12-31',2,'months'),'2025-02-28');
  assert.equal(calculateDate('2024-02-28',1,'days'),'2024-02-29');
  assert.equal(calculateDate('0099-01-31',1,'months'),'0099-02-28');
  for(const args of [['2024-01-01',0,'days'],['2024-01-01',true,'days'],['9999-12-31',1,'days']])assert.throws(()=>calculateDate(...args));
  for(const value of ['0000-01-01','2023-02-29','2024-1-1','2024-13-01'])assert.throws(()=>calendarDate(value));
  assert.match(todayIn('Asia/Hong_Kong'),/^\d{4}-\d{2}-\d{2}$/);
});

test('unknown fields clear and labels stay separate',()=>{
  const f=validateFood({name:'Tofu',date_source:'unknown',date_kind:'use_by',effective_date:'2000-01-01',production_date:'2020-01-01'});
  assert.equal(f.effective_date,null);assert.equal(f.production_date,null);assert.equal(f.date_kind,'unspecified');
  assert.equal(eligible({...f,status:'active'},'2026-11-07'),true);
  assert.equal(eligible({...f,status:'active',date_kind:'use_by',effective_date:'2000-01-01'},'2026-11-07'),false);
  assert.equal(eligible({...f,status:'active',date_kind:'best_before',effective_date:'2000-01-01'},'2026-11-07'),true);
  assert.throws(()=>validateFood({name:'x',date_source:'production',production_date:'2024-01-31',shelf_life:1,shelf_unit:'months',date_kind:'unspecified',date_confirmed:false}));
});

test('password hashing is salted and verifies without storing plaintext',async()=>{
  const a=await passwordHash('unit-test-password'),b=await passwordHash('unit-test-password');
  assert.notEqual(a,b);assert.equal(a.includes('unit-test-password'),false);
  assert.equal(await verifyPassword('unit-test-password',a),true);assert.equal(await verifyPassword('wrong-password',a),false);
});

test('personal dates are optional reminders and never acquire package expiry semantics',()=>{
  const input={name:'薯片',date_source:'personal',date_kind:'use_by',production_date:'2024-01-01',shelf_life:3,shelf_unit:'days'};
  for(const value of ['',null,undefined]){
    const food=validateFood({...input,effective_date:value});
    assert.equal(food.effective_date,null);assert.equal(food.date_kind,'unspecified');assert.equal(food.production_date,null);assert.equal(food.shelf_life,null);
  }
  const food=validateFood({...input,effective_date:'2000-01-01'});
  assert.equal(food.effective_date,'2000-01-01');assert.equal(food.date_kind,'unspecified');assert.equal(eligible({...food,status:'active'},'2026-11-08'),true);
  assert.throws(()=>validateFood({...input,effective_date:'2026-02-30'}));
  assert.equal(validateFood({...food,date_source:'unknown'}).effective_date,null);
});
