"""Three generation modes, untracked seasoning permissions and unchanged inventory (test RPC)."""
import os,sys,uuid
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from web_api_contract import Client
base=os.getenv('LMB_WEB_BASE_URL','http://127.0.0.1:8794');assert base.startswith('http://127.0.0.1:')
a=Client(base);a.register('modes-'+uuid.uuid4().hex[:12]+'@example.test');a.post('kitchen/create',dict(name='Three modes'))
food=a.food(name='Salmon',quantity=500,unit='g');before=a.state()['foods'];staples=[s['id'] for s in a.state()['pantry_staples']];assert len(staples)==7
body=dict(mode='stock_first',scope='selected',selected=[food['id']],count=1,style='meat',servings=2,portion='standard',preference='spicy',use_all=True,exact_count=True,pantry_staples=staples)
g=a.post('recipes/generate',body)['generation'];r=g['recipes'][0]
assert r['uses'][0]['food_id']==food['id'] and any(s['staple_id']=='chilli' for s in r['seasonings']);assert not r['additional'];assert g['options']['mode']=='stock_first' and g['options']['pantry_staples']==staples
replacement=a.post('recipes/replace',dict(generation_id=g['id'],recipe_id=1))['generation'];assert replacement['options']==g['options'] and replacement['recipes'][0]['seasonings']==r['seasonings']
strict=a.post('recipes/generate',dict(body,mode='use_up'))['generation'];assert not strict['recipes'][0]['seasonings'] and not strict['recipes'][0]['additional']
free=a.post('recipes/generate',dict(body,mode='plan'))['generation'];assert free['recipes'][0]['uses'][0]['food_id']==food['id'];assert free['recipes'][0]['additional'] and free['recipes'][0]['seasonings']
none=a.post('recipes/generate',dict(body,pantry_staples=[]))['generation'];assert not none['recipes'][0]['seasonings']
avoid=a.post('recipes/generate',dict(body,avoid='chilli'))['generation'];assert all(s['staple_id']!='chilli' for r in avoid['recipes'] for s in r['seasonings'])
a.post('recipes/generate',dict(body,pantry_staples=['invented_ingredient']),400)
a.post('recipes/generate',dict(body,mode='plan',selected=[99999999]),400)
assert a.state()['foods']==before
print('PASS: three modes, default home basics, spicy single-stock cooking, strict inventory-only enforcement, flexible purchases anchored in stock, explicit missing/avoided staples, stable replacement/history options and unchanged inventory (test provider).')
