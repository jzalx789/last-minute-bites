"""Owner-only kitchen rename and exact-name destructive confirmation, local only."""
import os
import uuid
from web_api_contract import Client

base = os.getenv('LMB_WEB_BASE_URL', 'http://127.0.0.1:8790')
assert base.startswith('http://127.0.0.1:')
owner, editor = Client(base), Client(base)
for client in [owner, editor]:
    client.register('kitchen-settings-' + uuid.uuid4().hex + '@example.test')
first = owner.post('kitchen/create', {'name': 'Original kitchen'})['kitchen_id']
egg = owner.food(name='Egg', quantity=2, unit='pcs')
code = owner.post('invitation/replace')['code']
editor.post('invitation/accept', {'code': code, 'confirmed': True})
members = owner.state()['members']
second = owner.post('kitchen/create', {'name': 'Other kitchen'})['kitchen_id']
rice = owner.food(name='Rice', quantity=1, unit='kg')
context = {'X-Kitchen-ID': str(first)}

for name in ['', '  ', 'x' * 81, None]:
    assert owner.request('kitchen/rename', {'name': name}, context)[0] == 400
assert owner.request('kitchen/rename', {'name': 'Denied'}, {'X-Kitchen-ID': '999999'})[0] == 403
editor.post('kitchen/rename', {'name': 'Denied'}, 403)
assert owner.request('kitchen/rename', {'name': '試用冰箱 08'}, {**context, 'X-CSRF-Token': ''})[0] == 403
assert owner.request('kitchen/rename', {'name': '  試用冰箱 08  '}, context)[0] == 200
assert owner.state()['kitchen']['id'] == second
assert owner.state()['foods'][0]['id'] == rice['id']
shared = editor.state()
assert shared['kitchen']['id'] == first and shared['kitchen']['name'] == '試用冰箱 08'
assert shared['members'] == members and shared['foods'][0]['id'] == egg['id']
assert shared['foods'][0]['quantity'] == 2

status, result = owner.request('kitchen/clear', {'confirmed': False, 'kitchen_name': '試用冰箱 08'}, context)
assert status == 400 and result['error']['code'] == 'confirmation_required'
for name in ['試用冰箱08', '試用冰箱 09', None]:
    status, result = owner.request('kitchen/clear', {'confirmed': True, 'kitchen_name': name}, context)
    assert status == 400 and result['error']['code'] == 'kitchen_name_mismatch'
    assert editor.state()['foods'][0]['quantity'] == 2
assert owner.request('kitchen/clear', {'confirmed': True, 'kitchen_name': '試用冰箱 08'}, context)[0] == 200
assert editor.state()['foods'] == []
assert owner.state()['foods'][0]['id'] == rice['id']
print('PASS: owner-only scoped rename, shared name updates, preserved food/members/default kitchen, validation/CSRF, exact-name clear errors and unchanged foreign kitchen.')
