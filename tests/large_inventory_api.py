"""Selecting a small recipe subset still works with more than 80 stock records."""
import os,sys,uuid
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from web_api_contract import Client
base=os.getenv('LMB_WEB_BASE_URL','http://127.0.0.1:8794');assert base.startswith('http://127.0.0.1:')
c=Client(base);c.register('large-stock-'+uuid.uuid4().hex[:10]+'@example.test');c.post('kitchen/create',dict(name='Large inventory regression'))
foods=[c.food(name='Tomato',quantity=2,unit='pcs') for _ in range(81)]
before=c.state()['foods'];body=dict(scope='selected',selected=[foods[0]['id']],count=1,mode='stock_first')
g=c.post('recipes/generate',body)['generation'];assert g['provider']=='test-fixture'
assert {u['food_id'] for r in g['recipes'] for u in r['uses']}=={foods[0]['id']}
status,result=c.request('recipes/generate',dict(body,scope='all'));assert status==400 and result['error']['code']=='too_many_foods'
assert c.state()['foods']==before
print('PASS: selected-only AI works with 81 available batches, all-stock requests receive actionable limits, and inventory stays unchanged (test provider).')
