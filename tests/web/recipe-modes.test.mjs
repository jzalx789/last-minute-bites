import test from 'node:test';
import assert from 'node:assert/strict';
import {pantrySelection,validateRecipes,recipePrompt,replacementInput,mergeReplacement,priorityFoodIds} from '../../web/ai.js';
const food={id:1,name:'Salmon',quantity:500,unit:'g'};
const pantry=pantrySelection(undefined,'','en');
const input={foods:[food],selected:[1],count:1,style:'meat',mode:'stock_first',servings:2,pantry:pantry.pantry,pantry_staples:pantry.ids,use_all:true,require_selected:true,exact_count:true,priority_ids:[1],preference:'I want spicy food'};
const dish=(extra=[])=>({title:'Pan-seared salmon with chilli sauce',kind:'meat',minutes:20,servings:2,uses:[{food_id:1,quantity:250,amount:'250 g'}],additional:extra,seasonings:[{staple_id:'chilli',amount:'a pinch'}],steps:['Mix the dried chilli sauce.','Pan-sear the salmon and serve with the sauce.']});
const extra=(name)=>({name,amount:'1 serving'});
test('home basics are a finite user selection and dietary exclusions override defaults',()=>{
 assert.equal(pantry.ids.length,7);assert.equal(pantry.pantry.length,7);
 assert.deepEqual(pantrySelection([]).pantry,[]);
 assert.equal(pantrySelection(undefined,'soy, chilli').pantry.length,5);
 assert(!pantrySelection(undefined,'gluten').pantry.some(s=>s.id==='soy_sauce'));
 assert.throws(()=>pantrySelection(['salmon']));assert.throws(()=>pantrySelection('salt'));
});
test('stock-first can season a single inventory food without inventing stock or purchases',()=>{
 const r=validateRecipes({recipes:[dish()]},input)[0];
 assert.equal(r.uses[0].food_id,1);assert.equal(r.uses[0].quantity,250);assert.equal(r.seasonings[0].name,'Dried chilli flakes');assert.deepEqual(r.additional,[]);
 assert.equal(food.quantity,500);assert.match(recipePrompt(input),/STOCK FIRST/);assert.match(recipePrompt(input),/sauces/);
});
test('stock-first limits new ingredient types for the whole meal and recognises approved pantry entries',()=>{
 assert.equal(validateRecipes({recipes:[dish([extra('Potato'),extra('Carrot')])]},input)[0].additional.length,2);
 assert.throws(()=>validateRecipes({recipes:[dish([extra('Potato'),extra('Carrot'),extra('Onion')])]},input),/purchase_limit/);
 const r=validateRecipes({recipes:[dish([extra('Salt')])]},input)[0];assert.equal(r.additional.length,0);assert(r.seasonings.some(s=>s.staple_id==='salt'));
 const wheat=pantrySelection(undefined,'wheat');assert.throws(()=>validateRecipes({recipes:[dish([extra('Soy sauce')])]},{...input,avoid:'wheat',pantry:wheat.pantry}));
});
test('flexible mode allows more new ingredients and a new-ingredient side while retaining selected stock',()=>{
 const main=dish([extra('Potato'),extra('Carrot'),extra('Onion')]);
 const side={...dish([extra('Lettuce')]),title:'Salad to serve with salmon',kind:'cold',uses:[],seasonings:[]};
 assert.equal(validateRecipes({recipes:[main,side]},{...input,mode:'plan',count:2,style:'mixed'}).length,2);
 assert.throws(()=>validateRecipes({recipes:[side]},{...input,mode:'plan',style:'cold'}),/selected_food_missing/);
});
test('strict stock-only cannot bypass its boundaries using pantry or extra purchases',()=>{
 const strict={...input,mode:'use_up'};
 assert.throws(()=>validateRecipes({recipes:[dish()]},strict));
 assert.throws(()=>validateRecipes({recipes:[{...dish([extra('Salt')]),seasonings:[]}]},strict),/stock_only_extras/);
 assert.deepEqual(validateRecipes({recipes:[{...dish(),seasonings:[]}]},strict)[0].seasonings,[]);
 assert.match(recipePrompt(strict),/additional and seasonings MUST both be empty/);
});
test('disabled or avoided pantry items cannot re-enter as declared seasonings',()=>{
 assert.throws(()=>validateRecipes({recipes:[dish()]},{...input,pantry:pantrySelection(['salt']).pantry}));
 assert.throws(()=>validateRecipes({recipes:[{...dish(),seasonings:[{staple_id:'fish_sauce',amount:'1 tsp'}]}]},input));
});
test('replacement reserves both retained stock and retained purchase types',()=>{
 const original={...input,count:2,style:'mixed'};
 const first={...dish([extra('Potato')]),title:'Salmon main'};
 const second={...dish([extra('Carrot')]),title:'Salmon side',kind:'vegetable',uses:[{food_id:1,quantity:200,amount:'200 g'}]};
 const generation={recipes:validateRecipes({recipes:[first,second]},original)};
 const next=replacementInput(original,generation,1);
 assert.equal(next.foods[0].quantity,300);assert.deepEqual(next.purchase_reservations,['Carrot']);
 assert.throws(()=>validateRecipes({recipes:[{...dish([extra('Potato'),extra('Onion')]),title:'Different salmon'}]},next),/purchase_limit/);
 const replacement=validateRecipes({recipes:[{...dish([extra('Potato')]),title:'Different salmon'}]},next);
 assert.deepEqual(mergeReplacement(replacement,original,generation,1)[1],generation.recipes[1]);
});
test('stock-first prioritises passed non-safety dates among already eligible selected foods',()=>{
 assert.deepEqual(priorityFoodIds([{id:1,effective_date:'2026-11-12'},{id:2,date_kind:'best_before',effective_date:'2026-11-07'}],[1,2],'2026-11-09'),[2]);
});
