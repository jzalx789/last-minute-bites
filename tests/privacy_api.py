"""Real local Worker privacy/account boundaries, without paid providers."""
import os,sys,uuid,json,time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0,str(Path(__file__).resolve().parent))
from web_api_contract import Client
base=os.getenv('LMB_WEB_BASE_URL','http://127.0.0.1:8794');assert base.startswith('http://127.0.0.1:')
a,b,c=Client(base),Client(base),Client(base)
suffix=uuid.uuid4().hex[:10];email='privacy-a-'+suffix+'@example.test';pw='test-password-123';newpw='different-password-456'
status,policy=c.request('legal');assert status==200 and policy['contact']=='Bite.limited@gmail.com'
version=policy['version'];assert all(s['body']['en'] and s['body']['zh-Hant'] for s in policy['privacy']+policy['terms'])
body=dict(email=email,password=pw,confirm_password=pw,timezone='Asia/Hong_Kong')
a.post('register',body,428);a.post('register',dict(body,terms_accepted=True,legal_version='old'),428)
a.post('register',dict(body,terms_accepted=True,legal_version=version))
assert a.state()['consent']['accepted'] and not a.state()['consent']['ai_text'] and not a.state()['consent']['ai_photo']
a.post('privacy',dict(ai_text='true'),400)
ka=a.post('kitchen/create',dict(name='Privacy home'))['kitchen_id'];food=a.food(name='Egg',quantity=8,unit='pcs')
unknown=a.post('food/classify',dict(name='Auntie special snack',allow_ai=True))['assessment'];assert unknown['reason']=='ai_disabled'
a.food(name='Auntie special snack',food_confirmed=True,quantity=1,unit='pack')
recipe=dict(scope='selected',selected=[food['id']],count=1,mode='stock_first',servings=2)
a.post('recipes/generate',recipe,403);a.post('food/recognize',dict(image='not-an-image'),403)
a.post('legal/accept',dict(accepted=True,version='old'),428)
consent=a.post('privacy',dict(ai_text=True))['consent'];assert consent['ai_text'] and not consent['ai_photo']
g=a.post('recipes/generate',recipe)['generation'];assert g['provider']=='test-fixture'
assert a.request('recipes/history')[1]['generation']['id']==g['id']
# Withdraw consent while provider work is running: no response may be cached.
with ThreadPoolExecutor(1) as pool:
 pending=pool.submit(a.request,'recipes/generate',dict(recipe,regenerate=True,preference='__test_delay__'))
 time.sleep(.3);a.post('privacy',dict(ai_text=False))
 status,result=pending.result();assert status==403 and result['error']['code']=='ai_consent_required'
assert a.request('recipes/history')[1]['generation'] is None
assert next(f for f in a.state()['foods'] if f['id']==food['id'])['quantity']==8
# Independent photo permission cannot silently enable text processing.
a.post('privacy',dict(ai_photo=True));assert not a.state()['consent']['ai_text']
a.post('food/recognize',dict(image='not-an-image'),400)
a.post('privacy',dict(ai_photo=False));a.post('privacy',dict(ai_text=True))
with ThreadPoolExecutor(1) as pool:
 pending=pool.submit(a.request,'recipes/generate',dict(recipe,regenerate=True,preference='__test_delay__'))
 time.sleep(.3);a.post('account/history/clear',dict(confirmed=True))
 a.post('privacy',dict(ai_text=False));a.post('privacy',dict(ai_text=True))
 status,result=pending.result();assert status==409 and result['error']['code']=='privacy_changed'
assert a.request('recipes/history')[1]['generation'] is None

with ThreadPoolExecutor(1) as pool:
 pending=pool.submit(a.request,'food/classify',dict(name='Delayed Skyr',allow_ai=True))
 time.sleep(.2);a.post('privacy',dict(ai_text=False))
 status,result=pending.result();assert status==403 and result['error']['code']=='ai_consent_required'
# Export is authenticated and contains no credentials or other user profiles.
b.register('privacy-b-'+suffix+'@example.test');kb=b.post('kitchen/create',dict(name='B private'))['kitchen_id'];bfood=b.food(quantity=6)
b.post('account/password',dict(password='wrong',new_password=newpw,confirm_password=newpw),401)
b.post('account/password',dict(password=pw,new_password=newpw,confirm_password='mismatch'),400)
b.post('account/delete',dict(password=pw,email=b.state()['user']['email'],confirmed=False),400)
assert c.request('account/export')[0]==401
export=a.request('account/export')[1];assert export['account']['email']==email
assert kb not in {k['id'] for k in export['kitchens']}
def keys(value):
 if isinstance(value,dict):
  for k,v in value.items():yield k;yield from keys(v)
 elif isinstance(value,list):
  for v in value:yield from keys(v)
assert not set(keys(export))&{'password','token','csrf','privateKey','subscription','session_token'}
assert b.state()['user']['email'] not in json.dumps(export)
# A second sign-in is revoked on password change, the current session remains.
second=Client(base);second.post('login',dict(email=email,password=pw))
a.post('account/password',dict(password=pw,new_password=newpw,confirm_password=newpw))
assert second.state()['user'] is None and a.state()['user']['email']==email
second.post('login',dict(email=email,password=pw),401)
# Ordinary owner cannot delete the shared kitchen out from under an editor.
a.post('kitchen/switch',dict(kitchen_id=ka));code=a.post('invitation/replace')['code'];b.post('invitation/accept',dict(code=code,confirmed=True))
party=a.post('kitchen/create',dict(name='Private party',kind='party',source_ids=[ka]))['kitchen_id']
private=a.food(name='Rice',quantity=2,unit='kg',request_id=str(uuid.uuid4()))
a.post('account/delete',dict(password=newpw,email=email,confirmed=True),409)
a.post('kitchen/switch',dict(kitchen_id=ka));a.post('kitchen/transfer',dict(password=newpw,user_id=999999,confirmed=True),404)
a.post('kitchen/transfer',dict(password=newpw,user_id=b.state()['user']['id'],confirmed=True))
assert a.state()['kitchen']['role']=='editor' and b.state()['kitchen']['role']=='owner'
a.post('kitchen/switch',dict(kitchen_id=party));assert not a.state()['kitchen']['sources']
# Delete is scoped to the caller and their private kitchens; other shared records survive.
a.post('account/delete',dict(password=newpw,email=email,confirmed=True));assert a.state()['user'] is None
a.post('login',dict(email=email,password=newpw),401)
assert b.state()['kitchen']['id']==ka and next(f for f in b.state()['foods'] if f['id']==food['id'])['quantity']==8
b.post('kitchen/switch',dict(kitchen_id=kb));assert b.state()['foods'][0]['id']==bfood['id']
# Sign-out-all invalidates the present and another authenticated session.
bs=b.state();be=bs['user']['email'];other=Client(base);other.post('login',dict(email=be,password=pw))
b.post('account/logout-all',dict(password=pw,confirmed=True));assert b.state()['user'] is None and other.state()['user'] is None
print('PASS: versioned required agreement, default-off separate AI choices, manual fallback, in-flight consent revocation, scoped export, password/session security, protected ownership transfer and atomic account deletion preserving others (test provider).')
