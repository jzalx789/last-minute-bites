"""Quantity, batch isolation, concurrency, and customised recipe contracts."""
import os,sys,uuid
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0,str(Path(__file__).resolve().parent))
from web_api_contract import Client
base=os.getenv('LMB_WEB_BASE_URL','http://127.0.0.1:8790')
owner,editor,other=[Client(base) for _ in range(3)]
suffix=uuid.uuid4().hex[:10]
for n,c in [('owner',owner),('editor',editor),('other',other)]:c.register('stock-'+n+suffix+'@example.test')
owner.post('kitchen/create',dict(name='Stock tests'));other.post('kitchen/create',dict(name='Other stock tests'))
code=owner.post('invitation/replace')['code'];editor.post('invitation/accept',dict(code=code,confirmed=True))
a=owner.food(name='Egg',ingredient='egg',quantity=6,unit='pcs',purchased_date='2026-11-01')
b=owner.food(name='Egg',ingredient='egg',quantity=10,unit='pcs',purchased_date='2026-11-03')
def current(c,id):return next(f for f in c.state()['foods'] if f['id']==id)
def consume(c,food,quantity=None,all=False,expected=200):return c.post('food/consume',dict(items=[dict(id=food['id'],version=food['version'],quantity=quantity,all=all)],confirmed=True),expected)
consume(owner,current(owner,a['id']),2)
assert current(editor,a['id'])['quantity']==4 and current(editor,b['id'])['quantity']==10
consume(other,current(owner,a['id']),1,expected=404)
consume(owner,current(owner,a['id']),5,expected=409)
# Replayed/stale submissions cannot subtract a second time.
consume(owner,dict(a,version=1),1,expected=409)
for quantity in [0,-1,True,'2',.0001]:consume(owner,current(owner,a['id']),quantity,expected=400)
# Batch validation rolls everything back, including the earlier valid deduction.
owner.post('food/consume',dict(items=[dict(id=a['id'],version=current(owner,a['id'])['version'],quantity=1),dict(id=b['id'],version=999,quantity=1)],confirmed=True),409)
assert current(owner,a['id'])['quantity']==4
food=current(owner,a['id'])
with ThreadPoolExecutor(2) as pool:
    outcomes=list(pool.map(lambda c:c.request('food/consume',dict(items=[dict(id=food['id'],version=food['version'],quantity=1)],confirmed=True))[0],[owner,editor]))
assert sorted(outcomes)==[200,409] and current(owner,a['id'])['quantity']==3
consume(owner,current(owner,a['id']),3);used=current(owner,a['id']);assert used['quantity']==0 and used['status']=='used'
owner.post('food/batch',dict(action='restore',items=[dict(id=used['id'],version=used['version'])],confirmed=True))
assert current(owner,a['id'])['quantity']==3 # restores only the last deduction, never all 6 purchased
legacy=owner.food(name='Legacy tofu',ingredient='tofu');assert current(owner,legacy['id'])['quantity'] is None
consume(owner,current(owner,legacy['id']),1,expected=400)
consume(owner,current(owner,legacy['id']),all=True)
# Inline legacy quantity setup is a single atomic consumption; it cannot replace known stock.
inline=owner.food(name='Inline egg',ingredient='egg')
owner.post('food/consume',dict(items=[dict(inline,initial_quantity=6,unit='pcs',quantity=2)],confirmed=True))
assert current(owner,inline['id'])['quantity']==4 and current(owner,inline['id'])['unit']=='pcs'
owner.post('food/consume',dict(items=[dict(id=inline['id'],version=2,initial_quantity=99,unit='pcs',quantity=1)],confirmed=True),409)
assert current(owner,inline['id'])['quantity']==4
rollback=owner.food(name='Rollback tomato')
owner.post('food/consume',dict(items=[dict(rollback,initial_quantity=6,unit='pcs',quantity=2),dict(id=b['id'],version=999,quantity=1)],confirmed=True),409)
assert current(owner,rollback['id'])['quantity'] is None
# Old client whole-use path preserves known quantities and restoration metadata too.
owner.post('food/used',dict(id=b['id'],version=current(owner,b['id'])['version'],confirmed=True));used=current(owner,b['id']);assert used['quantity']==0 and used['restore_quantity']==10
owner.post('food/batch',dict(action='restore',items=[dict(id=used['id'],version=used['version'])],confirmed=True))
# API updates from older clients preserve quantity and batch date when those fields are omitted.
old_payload={k:v for k,v in current(owner,b['id']).items() if k not in ['quantity','unit','purchased_date']}
owner.post('food/update',dict(old_payload,note='Updated without quantity fields'))
assert current(owner,b['id'])['quantity']==10 and current(owner,b['id'])['purchased_date']=='2026-11-03'
print('PASS: independent 6/10 egg purchase batches, partial and decimal validation, shared updates, atomic rollback, version/replay protection, no cross-kitchen deduction, exact full use/restore, and safe legacy migration.')
if os.getenv('LMB_STOCK_FIXTURE','1' if base.startswith('http://127.0.0.1:') else '0')=='1':
    assert base.startswith('http://127.0.0.1:'), 'Fixture inference tests require the local test-only service.'
    body=dict(mode='use_up',scope='all',selected=[],count=2,style='mixed',servings=4,portion='hearty',max_minutes=15,avoid='',preference='')
    result=owner.post('recipes/generate',body)['generation'];assert result['provider']=='test-fixture';assert result['options']['servings']==4 and result['options']['portion']=='hearty'
    assert all(r['servings']==4 and r['minutes']<=15 and not r['additional'] for r in result['recipes'])
    assert any(u['food_id']==a['id'] for r in result['recipes'] for u in r['uses'])
    for invalid in [dict(servings=0),dict(servings=True),dict(servings=13),dict(portion='huge'),dict(max_minutes=0),dict(mode='invalid')]:owner.post('recipes/generate',dict(body,**invalid),400)
    owner.post('recipes/generate',dict(body,scope='selected',selected=[a['id']],avoid='egg'),400)
    no_stock=other.post('recipes/generate',dict(body,mode='plan'))['generation'];assert all(not r['uses'] and r['additional'] for r in no_stock['recipes'])
    other.post('recipes/generate',body,400)
    print('PASS: custom diners/portions/time, restricted stock-only mode, oldest batch priority, avoidance, and a shopping plan with empty inventory (test provider).')
