import test from 'node:test';
import assert from 'node:assert/strict';
import {validateFood,consumeFood,restoreFood,eligible} from '../../web/domain.js';
import {validateRecipes,priorityFoodIds,avoidTerms,matchesAvoid} from '../../web/ai.js';
const stock={name:'Egg',ingredient:'egg',date_source:'unknown',quantity:6,unit:'pcs',purchased_date:'2026-11-01'};
test('stock accepts explicit units and preserves unknown legacy quantities without inventing counts',()=>{
 assert.equal(validateFood(stock).quantity,6);
 assert.equal(validateFood({name:'Legacy egg',date_source:'unknown'}).quantity,null);
 for(const quantity of [0,-1,true,'6',NaN,Infinity,1.0001,1000001]) assert.throws(()=>validateFood({...stock,quantity}));
 assert.throws(()=>validateFood({...stock,unit:'unknown-unit'}));
 assert.throws(()=>validateFood({...stock,purchased_date:'2026-02-30'}));
});
test('decimal consumption is exact; full consumption archives and restore returns only the last amount',()=>{
 let f={...validateFood({...stock,quantity:.3,unit:'kg'}),status:'active'};
 f=consumeFood(f,.1);assert.equal(f.quantity,.2);assert.equal(f.status,'active');
 assert.throws(()=>consumeFood(f,.3),/insufficient_quantity/);
 f=consumeFood(f,.2);assert.equal(f.quantity,0);assert.equal(f.status,'used');
 assert.equal(eligible(f,'2026-11-08'),false);
 f=restoreFood(f);assert.equal(f.quantity,.2);assert.equal(f.status,'active');
 const unknown=consumeFood({...validateFood({name:'Legacy',date_source:'unknown'}),status:'active'},null,true);
 assert.equal(unknown.quantity,null);assert.equal(restoreFood(unknown).quantity,null);
 assert.throws(()=>consumeFood({...unknown,status:'active'},1),/quantity_required/);
});
const dish=(id,q,kind='main')=>({title:'Dish',kind,minutes:15,servings:4,uses:[{food_id:id,quantity:q,amount:`${q} pcs`}],additional:[],steps:['Prepare ingredients.','Cook and serve.']});
test('two dishes share batch limits; requested diners, time and avoid preferences are validated',()=>{
 const input={foods:[{id:1,...stock}],selected:[1],style:'mixed',count:2,servings:4,max_minutes:20,mode:'use_up',priority_ids:[1]};
 assert.equal(validateRecipes({recipes:[dish(1,2),dish(1,4,'vegetable')]},input).length,2);
 assert.throws(()=>validateRecipes({recipes:[dish(1,3),dish(1,4,'vegetable')]},input));
 assert.throws(()=>validateRecipes({recipes:[{...dish(1,2),servings:2}]},input));
 assert.throws(()=>validateRecipes({recipes:[{...dish(1,2),minutes:30}]},input));
 assert.throws(()=>validateRecipes({recipes:[{...dish(1,2),additional:[{name:'Oil',amount:'1 tsp'}]}]},input));
 assert.throws(()=>validateRecipes({recipes:[{...dish(1,2),additional:[{name:'Egg',amount:'2 pcs'}]}]},{...input,mode:'plan',avoid:'egg'}));
 assert.equal(matchesAvoid(stock,avoidTerms('蛋、milk')),true);
 assert.equal(matchesAvoid({name:'Eggplant'},avoidTerms('egg')),false);
});
test('priority follows upcoming expiry before purchase date; meal planning can use an empty inventory',()=>{
 const foods=[{id:1,purchased_date:'2026-11-03',effective_date:'2026-11-10'},{id:2,purchased_date:'2026-11-01',effective_date:'2026-11-10'},{id:3,purchased_date:'2026-11-04',effective_date:'2026-11-09'}];
 assert.deepEqual(priorityFoodIds(foods,[1,2,3],'2026-11-08'),[3]);
 assert.deepEqual(priorityFoodIds(foods,[1,2],'2026-11-08'),[2]);
 const recipe={...dish(1,1),uses:[],additional:[{name:'Potato',amount:'4 pcs'}]};
 assert.equal(validateRecipes({recipes:[recipe]},{foods:[],selected:[],mode:'plan',style:'auto',count:1,servings:4})[0].uses.length,0);
 assert.throws(()=>validateRecipes({recipes:[recipe]},{foods:[],selected:[],mode:'use_up',style:'auto',count:1,servings:4}));
});
