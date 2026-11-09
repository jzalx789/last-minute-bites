"""Real Worker contract: multiple memberships and owner-approved party stock."""
import os,sys,uuid
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import time
sys.path.insert(0,str(Path(__file__).resolve().parent))
from web_api_contract import Client
base=os.getenv('LMB_WEB_BASE_URL','http://127.0.0.1:8794')
assert base.startswith('http://127.0.0.1:')
prefix='party-'+uuid.uuid4().hex[:12]
a,b,c=[Client(base) for _ in range(3)]
for client,label in [(a,'a'),(b,'b'),(c,'c')]:
    client.register(prefix+label+'@example.test')
    client.post('kitchen/create',dict(name=label+' home'))
ka,kb,kc=[cl.state()['kitchen']['id'] for cl in [a,b,c]]
fa=a.food(name='Salmon',quantity=500,unit='g');fb=b.food(name='Egg',quantity=8,unit='pcs');fc=c.food(name='Rice',quantity=500,unit='g')
# Creating more kitchens preserves first membership and stock; invalid source
# sharing rolls back the entire creation, including the new membership.
before=a.state()['kitchens']
a.post('kitchen/create',dict(name='Invalid party',kind='party',source_ids=[kb]),403)
assert a.state()['kitchens']==before
second=a.post('kitchen/create',dict(name='A second home'))['kitchen_id']
assert len(a.state()['kitchens'])==2 and a.state()['foods']==[]
a.post('kitchen/switch',dict(kitchen_id=ka));assert a.state()['foods'][0]['id']==fa['id']
a.post('kitchen/switch',dict(kitchen_id=kb),403)
# Ordinary kitchens cannot query, consume or generate from foreign stock.
a.post('food/consume',dict(confirmed=True,items=[dict(id=fb['id'],version=1,quantity=1)]),404)
a.post('recipes/generate',dict(selected=[fb['id']],mode='stock_first',count=1),400)
a.post('kitchen/create',dict(name='No home pooling',source_ids=[ka]),400)
party=a.post('kitchen/create',dict(name='Dinner party',kind='party',hours=24,source_ids=[ka]))['kitchen_id']
assert a.state()['kitchen']['kind']=='party'
assert {f['id'] for f in a.state()['foods']}=={fa['id']}
code=a.post('invitation/replace')['code']
b.post('invitation/preview',dict(code=code));b.post('invitation/accept',dict(code=code,confirmed=True))
assert {k['id'] for k in b.state()['kitchens']}=={kb,party}
b.post('party/source/add',dict(source_id=ka,confirmed=True),403)
b.post('party/source/add',dict(source_id=kb,confirmed=False),400)
b.post('party/source/add',dict(source_id=kb,confirmed=True))
assert {f['id'] for f in a.state()['foods']}=={fa['id'],fb['id']}
assert {f['kitchen_name'] for f in a.state()['foods']}=={'a home','b home'}
assert c.state()['foods'][0]['id']==fc['id']
assert c.request('state',headers={'X-Kitchen-ID':str(party)})[1]['kitchen']['id']==kc
assert c.request('food/consume',dict(confirmed=True,items=[dict(id=fa['id'],version=1,quantity=1)]),{'X-Kitchen-ID':str(party)})[0]==403
b.post('party/source/remove',dict(source_id=ka,confirmed=True),403)
# Stock remains separate, but one recipe can use both sources in party mode.
body=dict(selected=[fa['id'],fb['id']],count=2,mode='stock_first',style='mixed',use_all=True,exact_count=True)
g=a.post('recipes/generate',body)['generation']
assert {u['food_id'] for recipe in g['recipes'] for u in recipe['uses']}=={fa['id'],fb['id']}
assert {u['kitchen_id'] for recipe in g['recipes'] for u in recipe['uses']}=={ka,kb}
assert all(f['quantity'] in [500,8] for f in a.state()['foods'])
# An explicit context pins each tab; changing the session default cannot cause
# a write to land in another tab's kitchen.
a.post('kitchen/switch',dict(kitchen_id=second))
status,_=a.request('food/create',dict(name='Tomato',quantity=2,unit='pcs',date_source='unknown'),{'X-Kitchen-ID':str(ka)})
assert status==200 and a.state()['foods']==[]
a.post('kitchen/switch',dict(kitchen_id=party))
# All-or-nothing deduction across sources, stale version fails the whole batch.
a.post('food/consume',dict(confirmed=True,items=[dict(id=fa['id'],version=1,quantity=50),dict(id=fb['id'],version=999,quantity=2)]),409)
assert next(f for f in a.state()['foods'] if f['id']==fa['id'])['quantity']==500
a.post('food/consume',dict(confirmed=True,items=[dict(id=fa['id'],version=1,quantity=50),dict(id=fb['id'],version=1,quantity=2)]))
a.post('food/batch',dict(action='delete',confirmed=True,items=[dict(id=fa['id'],version=2)]),403)
a.post('food/update',dict(id=fa['id'],version=2,name='Changed',quantity=1),404)
a.post('kitchen/switch',dict(kitchen_id=ka));assert next(f for f in a.state()['foods'] if f['id']==fa['id'])['quantity']==450
b.post('kitchen/switch',dict(kitchen_id=kb));assert b.state()['foods'][0]['quantity']==6
# Source owner can withdraw consent, and removing them from just the party
# preserves their separate kitchen membership while invalidating the grant.
b.post('kitchen/switch',dict(kitchen_id=party))
a.post('kitchen/switch',dict(kitchen_id=party))
with ThreadPoolExecutor(1) as pool:
    pending=pool.submit(a.request,'recipes/generate',dict(body,preference='__test_delay__',regenerate=True))
    time.sleep(.25)
    b.post('party/source/remove',dict(source_id=kb,confirmed=True))
    status,result=pending.result()
    assert status==409 and result['error']['code']=='generation_stale'
assert fb['id'] not in {f['id'] for f in b.state()['foods']}
b.post('party/source/add',dict(source_id=kb,confirmed=True))
a.post('kitchen/switch',dict(kitchen_id=party))
a.post('member/remove',dict(user_id=b.state()['user']['id'],confirmed=True))
assert b.state()['kitchen']['id']==kb
assert fb['id'] not in {f['id'] for f in a.state()['foods']}
a.post('food/consume',dict(confirmed=True,items=[dict(id=fb['id'],version=2,quantity=1)]),404)
b.post('invitation/accept',dict(code=code,confirmed=True))
assert fb['id'] not in {f['id'] for f in b.state()['foods']} # no automatic re-sharing
b.post('party/source/add',dict(source_id=kb,confirmed=True))
b.post('kitchen/leave',dict(confirmed=True))
assert b.state()['kitchen']['id']==kb
assert fb['id'] not in {f['id'] for f in a.state()['foods']}

# Closed parties retain saved recipes and memberships, revoke live sharing and
# invitations, and reject changes at the server (even bypassing disabled UI).
a.post('party/end',dict(confirmed=True))
assert a.state()['kitchen']['closed'] and a.state()['kitchen']['sources']==[]
assert a.state()['foods']==[]
assert a.request('recipes/history')[1]['generation']['id']==g['id']
for endpoint,data in [('food/create',dict(name='Egg')),('recipes/generate',body),('party/source/add',dict(source_id=ka,confirmed=True)),('invitation/replace',{})]:a.post(endpoint,data,409)
c.post('invitation/accept',dict(code=code,confirmed=True),404)
a.post('kitchen/switch',dict(kitchen_id=ka));assert next(f for f in a.state()['foods'] if f['id']==fa['id'])['quantity']==450
assert len(a.state()['kitchens'])==3 and len(b.state()['kitchens'])==1
print('PASS: existing and multiple kitchens, independent tab context, per-kitchen roles, transactional source sharing and deduction, party-only cross-kitchen recipes, revocation, party closure and retained history (local test AI).')
