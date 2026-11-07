"""AI boundary tests using an explicitly test-only local service binding."""
from pathlib import Path
import sys,uuid,base64,io,time
from concurrent.futures import ThreadPoolExecutor
from PIL import Image
sys.path.insert(0,str(Path(__file__).resolve().parent))
from web_api_contract import Client

base='http://127.0.0.1:8790'
owner,other=Client(base),Client(base)
suffix=uuid.uuid4().hex[:10]
owner.register('ai-'+suffix+'@example.test');other.register('other-ai-'+suffix+'@example.test')
owner.post('kitchen/create',dict(name='AI test'));other.post('kitchen/create',dict(name='Other AI test'))
owner.post('preferences',dict(language='zh-Hant'))
a=owner.food();b=owner.food(name='Egg',ingredient='egg',category='dairy')
old=owner.food(name='Expired tofu',ingredient='tofu',date_source='printed',date_kind='use_by',effective_date='2000-01-01')
# Entire batch rolls back when any version is stale.
owner.post('food/batch',dict(action='used',confirmed=True,items=[a,dict(b,version=999)]),409)
assert all(f['status']=='active' for f in owner.state()['foods'])
other.post('food/batch',dict(action='delete',confirmed=True,items=[a]),404)
body=dict(style='mixed',count=2,scope='all',selected=[],preference='')
generation=owner.post('recipes/generate',body)['generation']
assert generation['provider']=='test-fixture' and len(generation['recipes'])==2
assert {r['kind'] for r in generation['recipes']}=={'main','vegetable'}
assert old['id'] not in [u['food_id'] for r in generation['recipes'] for u in r['uses']]
assert owner.post('recipes/generate',body)['generation']['id']==generation['id']
assert other.request('recipes/history')[1]['generation'] is None
single=owner.post('recipes/generate',dict(body,style='soup',count=1))['generation']
assert len(single['recipes'])==1 and single['recipes'][0]['kind']=='soup'
previous=owner.request('recipes/history')[1]['generation']['id']
owner.post('recipes/generate',dict(body,preference='__test_invalid__',regenerate=True),502)
assert owner.request('recipes/history')[1]['generation']['id']==previous
# A slow provider never prevents another kitchen from reading data.
with ThreadPoolExecutor(2) as pool:
    future=pool.submit(owner.post,'recipes/generate',dict(body,preference='__test_delay__',regenerate=True))
    time.sleep(.3);start=time.monotonic();other.state();assert time.monotonic()-start<1
    owner.post('recipes/generate',dict(body,regenerate=True),429)
    result=future.result();assert result['generation']['recipes']
# Revalidate inventory after inference; stale suggestions are not saved.
with ThreadPoolExecutor(2) as pool:
    future=pool.submit(owner.request,'recipes/generate',dict(body,preference='__test_delay__',regenerate=True))
    time.sleep(.3);food=next(f for f in owner.state()['foods'] if f['id']==a['id']);owner.post('food/update',dict(food,name='Updated tomato'))
    status,result=future.result();assert status==409 and result['error']['code']=='generation_stale'
# Only confirmed updates remove food; restore is explicit and updates versions.
food=next(f for f in owner.state()['foods'] if f['id']==a['id'])
owner.post('food/batch',dict(action='used',confirmed=True,items=[dict(id=food['id'],version=food['version'])]))
used=next(f for f in owner.state()['foods'] if f['id']==a['id']);assert used['status']=='used'
owner.post('food/batch',dict(action='restore',confirmed=True,items=[dict(id=used['id'],version=used['version'])]))
assert next(f for f in owner.state()['foods'] if f['id']==a['id'])['status']=='active'
image=Image.new('RGB',(64,64),'red');buffer=io.BytesIO();image.save(buffer,format='JPEG')
before=len(owner.state()['foods']);recognized=owner.post('food/recognize',dict(image='data:image/jpeg;base64,'+base64.b64encode(buffer.getvalue()).decode()))
assert recognized['foods'][0]['name']=='番茄' and 'effective_date' not in recognized['foods'][0]
assert len(owner.state()['foods'])==before
owner.post('food/recognize',dict(image='https://untrusted.example/food.jpg'),400)
print('PASS: AI schema, private history/cache, unrelated requests during inference, busy protection, stale-result rejection, atomic independent inventory actions, and image recognition without auto-saving/dates (test-only provider).')
