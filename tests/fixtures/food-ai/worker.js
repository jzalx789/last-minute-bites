// Test-only service. This file is never copied into the deployment mirror.
import {WorkerEntrypoint} from 'cloudflare:workers';
export class FoodAI extends WorkerEntrypoint {
 async recipes(input){
  if(input.preference==='__test_delay__')await new Promise(r=>setTimeout(r,1500));
  const zh=input.language==='zh-Hant';
  const recipes=Array.from({length:input.count},(_,i)=>({title:(zh?'測試菜式':'Test dish')+' '+(i+1),kind:['auto','mixed'].includes(input.style)?(i?'vegetable':'main'):input.style,minutes:15,servings:2,uses:[{food_id:input.preference==='__test_invalid__'?999999:input.selected[i%input.selected.length],amount:zh?'適量':'to taste'}],additional:[],steps:zh?['洗淨食材並切好。','徹底煮熟後享用。']:['Wash and prepare the ingredients.','Cook thoroughly and serve.'],pairing:zh?'可配白飯，需自行準備。':'Serve with rice if you have it.',notes:''}));
  return {provider:'test-fixture',model:'test-only',data:{recipes}};
 }
 async recognize(input){return {provider:'test-fixture',model:'test-only',data:{foods:[{name:input.language==='zh-Hant'?'番茄':'Tomato',category:'produce',ingredient:'tomato',effective_date:'2099-01-01'},{name:input.language==='zh-Hant'?'雞蛋':'Egg',category:'dairy',ingredient:'egg'}]}};}
}
export default {fetch(){return new Response('test fixture only');}};
