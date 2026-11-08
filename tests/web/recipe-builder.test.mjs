import test from 'node:test';
import assert from 'node:assert/strict';
import {validateRecipes,replacementInput,mergeReplacement} from '../../web/ai.js';
const food={id:1,name:'Egg',quantity:6,unit:'pcs'};
const dish=(title,q,kind='main')=>({title,kind,servings:2,minutes:15,uses:[{food_id:1,quantity:q,amount:`${q} pcs`}],additional:[],steps:['Prepare food.','Cook and serve.']});
const input={foods:[food],selected:[1],count:2,style:'mixed',mode:'use_up',servings:2,use_all:true,exact_count:true,priority_ids:[1]};
test('explicit dish count and selected food coverage are enforced across the meal',()=>{
 assert.throws(()=>validateRecipes({recipes:[dish('One',1)]},input),/dish_count/);
 assert.throws(()=>validateRecipes({recipes:[dish('One',1),dish('Two',1,'vegetable')]},{...input,foods:[food,{id:2,name:'Tomato',quantity:2,unit:'pcs'}],selected:[1,2]}),/selected_food_missing/);
 assert.throws(()=>validateRecipes({recipes:[dish('One',1),dish('One!',1,'vegetable')]},input),/repeat_recipe/);
});
test('one-dish replacement reserves retained stock and preserves the other dish exactly',()=>{
 const recipes=validateRecipes({recipes:[dish('Egg main',2),dish('Egg side',4,'vegetable')]},input),generation={recipes};
 const next=replacementInput(input,generation,1);assert.equal(next.foods[0].quantity,2);assert.equal(next.count,1);assert.deepEqual(next.exclude_titles,['Egg main','Egg side']);assert.deepEqual(next.excluded_kinds,['vegetable']);assert.deepEqual(next.priority_ids,[]);
 assert.throws(()=>validateRecipes({recipes:[dish('New main',3)]},next),/stock_limit/);
 assert.throws(()=>validateRecipes({recipes:[dish('EGG MAIN!',2)]},next),/repeat_recipe/);
 assert.throws(()=>validateRecipes({recipes:[dish('New side',2,'vegetable')]},next),/duplicate_styles/);
 const changed=validateRecipes({recipes:[dish('New main',2)]},next);const merged=mergeReplacement(changed,input,generation,1);assert.deepEqual(merged[1],recipes[1]);assert.equal(merged[0].title,'New main');assert.equal(merged[0].uses[0].stock_quantity,6);
 assert.equal(input.foods[0].quantity,6);
});
test('replacement must cover selected foods not covered by retained recipes',()=>{
 const foods=[food,{id:2,name:'Tomato',quantity:4,unit:'pcs'}];
 const original={...input,foods,selected:[1,2]};
 const recipes=validateRecipes({recipes:[dish('Egg',2),{...dish('Tomato',1,'vegetable'),uses:[{food_id:2,quantity:1,amount:'1 pcs'}]}]},original);
 const next=replacementInput(original,{recipes},1);assert.deepEqual(next.selected,[1]);assert.equal(next.use_all,true);
 assert.throws(()=>replacementInput(original,{recipes},9),/not_found/);
});
