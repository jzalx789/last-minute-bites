"""Server-backed food classification and non-food prevention (local test RPC)."""
import os,sys,uuid
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from web_api_contract import Client
base=os.getenv('LMB_WEB_BASE_URL','http://127.0.0.1:8790')
assert base.startswith('http://127.0.0.1:')
a,b=Client(base),Client(base);suffix=uuid.uuid4().hex[:10]
for n,c in [('a',a),('b',b)]:c.register('class-'+n+suffix+'@example.test');c.post('kitchen/create',dict(name='Food identification '+n))
for name in ['Phone','洗潔精','雞蛋玩具','Apple Watch','<script>bad()</script>','12345']:
 result=a.post('food/classify',dict(name=name,allow_ai=False))['assessment'];assert result['status']=='non_food'
 a.post('food/create',dict(name=name,category='produce',ingredient='egg',date_source='unknown',food_confirmed=True),422)
assert not a.state()['foods']
check=a.post('food/classify',dict(name='雞蛋',allow_ai=False))['assessment'];assert check['category']=='dairy' and check['source']=='rules'
egg=a.food(name='雞蛋',category='other');assert next(f for f in a.state()['foods'] if f['id']==egg['id'])['category']=='dairy'
a.post('food/create',dict(name='Skyr',date_source='unknown',food_confirmed=True),422)
result=a.post('food/classify',dict(name='Skyr'))['assessment'];assert result['status']=='food' and result['category']=='dairy' and result['source']=='test-fixture'
skyr=a.food(name='Skyr',category='other');assert next(f for f in a.state()['foods'] if f['id']==skyr['id'])['category']=='dairy'
b.post('food/create',dict(name='Skyr',date_source='unknown',food_confirmed=True),422)
ambiguous=a.post('food/classify',dict(name='小白'))['assessment'];assert ambiguous['status']=='uncertain'
a.post('food/create',dict(name='小白',date_source='unknown'),422)
item=a.post('food/create',dict(name='小白',date_source='unknown',food_confirmed=True))
food=next(f for f in a.state()['foods'] if f['id']==item['id']);assert food['food_verification']['confirmed']
a.post('food/update',dict(food,note='Confirmed brand label'))
food=next(f for f in a.state()['foods'] if f['id']==item['id'])
a.post('food/update',dict(food,name='Phone',food_confirmed=True),422)
assert next(f for f in a.state()['foods'] if f['id']==item['id'])['name']=='小白'
assert a.post('food/classify',dict(name='榫卯夾具'))['assessment']['status']=='non_food'
a.post('food/create',dict(name='榫卯夾具',date_source='unknown',food_confirmed=True),422)
unavailable=a.post('food/classify',dict(name='Unavailable food'))['assessment'];assert unavailable['source']=='unavailable'
a.post('food/create',dict(name='Unavailable food',date_source='unknown'),422)
a.post('food/create',dict(name='Unavailable food',date_source='unknown',food_confirmed=True))
manual=a.post('food/create',dict(name='Egg',category='other',category_mode='manual',date_source='unknown'))
assert next(f for f in a.state()['foods'] if f['id']==manual['id'])['category']=='other'
manual_food=next(f for f in a.state()['foods'] if f['id']==manual['id'])
assert manual_food['category_mode']=='manual'
a.post('food/update',dict(manual_food,note='Keep my corrected category'))
assert next(f for f in a.state()['foods'] if f['id']==manual['id'])['category']=='other'
assert a.request('food/classify',dict(name='Egg'),{'X-CSRF-Token':''})[0]==403
print('PASS: rule recommendations, automatic categories, server cache of assessed uncommon foods, per-account isolation, non-food rejection on create/rename despite forged flags, assessed-uncertain confirmation, unavailable-service fallback, manual category override and CSRF.')
