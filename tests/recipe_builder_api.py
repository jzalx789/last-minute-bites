"""Meal selection, four dishes and private, stock-aware one-dish replacement (test RPC)."""
import os,sys,uuid,json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from web_api_contract import Client
base=os.getenv('LMB_WEB_BASE_URL','http://127.0.0.1:8790');assert base.startswith('http://127.0.0.1:')
a,b=Client(base),Client(base);suffix=uuid.uuid4().hex[:10]
for c,n in [(a,'a'),(b,'b')]:c.register('meal-'+n+suffix+'@example.test');c.post('kitchen/create',dict(name='Meal builder '+n))
foods=[a.food(name=n,quantity=8,unit='pcs') for n in ['Egg','Tomato','Tofu','Spinach','Rice','Milk']]
ids=[f['id'] for f in foods[:5]];before=a.state()['foods']
body=dict(scope='selected',selected=ids,count=4,style='mixed',mode='use_up',servings=2,portion='standard',use_all=True,exact_count=True)
a.post('recipes/generate',dict(body,count=5),400)
g=a.post('recipes/generate',body)['generation'];assert len(g['recipes'])==4
assert {u['food_id'] for r in g['recipes'] for u in r['uses']}==set(ids)
assert a.state()['foods']==before
b.post('recipes/replace',dict(generation_id=g['id'],recipe_id=1),404)
a.post('recipes/replace',dict(generation_id=g['id'],recipe_id=5),400)
new=a.post('recipes/replace',dict(generation_id=g['id'],recipe_id=1))['generation'];assert len(new['recipes'])==4 and new['id']!=g['id'];assert new['recipes'][0]['title']!=g['recipes'][0]['title']
assert new['recipes'][1:]==g['recipes'][1:];assert new['options']==g['options'];assert a.state()['foods']==before
assert a.request('recipes/history')[1]['generation']['id']==new['id']
a.post('recipes/replace',dict(generation_id=g['id'],recipe_id=1),409)
food=a.state()['foods'][0];a.post('food/update',dict(food,quantity=7))
a.post('recipes/replace',dict(generation_id=new['id'],recipe_id=1),409)
assert a.request('recipes/history')[1]['generation']['id']==new['id']
b.food(name='Egg',quantity=6,unit='pcs');shopping=b.post('recipes/generate',dict(body,mode='plan',scope='selected',selected=[],count=1))['generation'];assert shopping['options']['scope']=='selected' and shopping['selected']==[] and all(not r['uses'] and r['additional'] for r in shopping['recipes'])
assert a.request('recipes/replace',dict(generation_id=new['id'],recipe_id=1),{'X-CSRF-Token':''})[0]==403
print('PASS: four distinct dishes cover selected food only, replacement preserves other dishes/settings, reserves quantities, saves private history, rejects foreign/invalid/stale requests, and never changes inventory (test provider).')
