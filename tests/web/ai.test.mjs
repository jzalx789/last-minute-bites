import test from 'node:test';
import assert from 'node:assert/strict';
import {validateRecipes,validatePhoto,validateRecognition} from '../../web/ai.js';
const input={count:2,style:'mixed',selected:[1,2],foods:[{id:1,name:'Tomato'},{id:2,name:'Egg'}]};
const dish=(id,kind='main')=>({title:'Dish',kind,minutes:15,servings:2,uses:[{food_id:id,amount:'1'}],additional:[{name:'salt',amount:'to taste'}],steps:['Prepare ingredients.','Cook thoroughly.'],pairing:'Serve with rice if available.'});
test('generated complementary recipes preserve authoritative inventory names',()=>{
 const result=validateRecipes({recipes:[dish(1),dish(2,'vegetable')]},input);
 assert.equal(result.length,2);assert.equal(result[0].uses[0].name,'Tomato');assert.equal(result[1].uses[0].name,'Egg');
});
test('rejects invented IDs, omitted selected foods, excess/duplicate ingredients and wrong styles',()=>{
 for(const recipes of [[dish(999)],[{...dish(1),uses:[{food_id:1,amount:'1'},{food_id:1,amount:'1'}]}],[dish(1),dish(2)],[dish(1),dish(2,'vegetable'),dish(1,'soup')],[{...dish(1),steps:[]}]] )assert.throws(()=>validateRecipes({recipes},input));
 assert.throws(()=>validateRecipes({recipes:[dish(2,'soup')]},{...input,count:1,style:'soup',selected:[1]}));
 assert.throws(()=>validateRecipes({recipes:[dish(1)]},{...input,count:1,style:'cold'}));
});
test('photo data rejects remote URLs and mismatched file content',()=>{
 assert.throws(()=>validatePhoto('https://untrusted.example/image.jpg'));
 assert.throws(()=>validatePhoto('data:image/jpeg;base64,'+Buffer.alloc(64).toString('base64')));
 const bytes=Buffer.alloc(64);bytes[0]=255;bytes[1]=216;bytes[2]=255;
 assert.match(validatePhoto('data:image/jpeg;base64,'+bytes.toString('base64')),/^data:image\/jpeg/);
});
test('photo recognition never persists a date or safety inference',()=>{
 const foods=validateRecognition({foods:[{name:'Tomato',category:'produce',ingredient:'tomato',effective_date:'2099-01-01',safe:true},{name:'tomato',category:'produce'}]});
 assert.deepEqual(foods,[{name:'Tomato',category:'produce',ingredient:'tomato'}]);
});
