import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyFoodName,validateFoodAssessment} from '../../web/food-classifier.js';
import {validateRecognition} from '../../web/ai.js';
test('common Chinese and English food names receive specific automatic categories',()=>{
 for(const [name,category] of [['雞蛋','dairy'],['milk','dairy'],['番茄','produce'],['eggplant','produce'],['fish sauce','condiments'],['soy milk','other'],['三文魚','protein'],['雞蛋炒飯','cooked'],['白飯','cooked'],['pasta','dry'],['Uncle Ben rice','dry']]){const a=classifyFoodName(name);assert.equal(a.status,'food',name);assert.equal(a.category,category,name);}
});
test('obvious non-food, food-lookalike names and markup cannot pass as food',()=>{
 for(const name of ['洗潔精','手機','雞蛋玩具','milk soap','Apple Watch','coffee machine','salt lamp','https://example.test','<img src=x>','123456','😀'])assert.equal(classifyFoodName(name).status,'non_food',name);
 assert.equal(classifyFoodName('Skyr').status,'uncertain');assert.equal(classifyFoodName('小白').status,'uncertain');
});
test('low-confidence model replies remain uncertain and invalid categories are rejected',()=>{
 assert.equal(validateFoodAssessment({status:'food',confidence:'medium',category:'dairy'}).status,'uncertain');
 assert.throws(()=>validateFoodAssessment({status:'food',confidence:'high',category:'electronics'}));
 assert.throws(()=>validateFoodAssessment({status:'food',category:'dairy'}));
});
test('photo suggestions exclude non-food objects, explicit non-food and uncertain food shapes',()=>{
 assert.deepEqual(validateRecognition({foods:[{name:'Phone',category:'other',is_food:true,confidence:'high'},{name:'Tomato',category:'produce',is_food:false,confidence:'high'},{name:'Egg',category:'dairy',is_food:true,confidence:'low'}]}),[]);
 assert.deepEqual(validateRecognition({foods:[{name:'Tomato',category:'protein',is_food:true,confidence:'high'}]}),[{name:'Tomato',category:'produce',ingredient:'tomato'}]);
});

test('single-character food shortcuts keep correct ingredient mappings',()=>{for(const [name,category,ingredient] of [['茶','other',''],['水','other',''],['魚','protein',''],['飯','cooked','rice'],['米','dry','rice'],['蛋','dairy','egg'],['油','condiments','oil'],['鹽','condiments','salt']]){const a=classifyFoodName(name);assert.equal(a.category,category);assert.equal(a.ingredient,ingredient);}});

test('partial English words are not food matches and composite dish categories defer to assessment',()=>{for(const name of ['milkyway','notebook','tomato soup','蘋果汁','炒番茄'])assert.equal(classifyFoodName(name).status,'uncertain',name);});
