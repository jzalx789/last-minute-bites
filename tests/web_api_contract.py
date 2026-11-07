"""Black-box checks for the deployed web API, using isolated synthetic accounts."""
import os
from pathlib import Path
import sys
import uuid
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0,str(Path(__file__).resolve().parent))
from test_app import Client as BaseClient

BROWSER_AGENT="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36"

class Client(BaseClient):
    def request(self,path,data=None,headers=None):
        return super().request(path,data,dict({"User-Agent":BROWSER_AGENT},**(headers or {})))


def run(base):
    prefix='web-'+uuid.uuid4().hex[:10]
    owner,editor,other=[Client(base) for _ in range(3)]
    owner.register(prefix+'-owner@example.test');editor.register(prefix+'-editor@example.test');other.register(prefix+'-other@example.test')
    owner.post('kitchen/create',dict(name='Web contract '+prefix))
    other.post('kitchen/create',dict(name='Private other '+prefix))
    code=owner.post('invitation/replace')['code']
    preview=editor.post('invitation/preview',dict(code=code))
    assert preview['role']=='editor' and editor.state()['kitchen'] is None
    editor.post('invitation/accept',dict(code=code,confirmed=True))
    oid=owner.state()['user']['id'];eid=editor.state()['user']['id']
    assert owner.state().get('web_app') is True
    assert owner.request('food/create',{}, {'X-CSRF-Token':''})[0]==403
    request=urllib.request.Request(base+'/api/food/create',data=b'{}',headers={'User-Agent':BROWSER_AGENT,'Content-Type':'application/json','Origin':'https://unrelated.example','X-CSRF-Token':owner.csrf})
    try:
        owner.opener.open(request,timeout=10)
        raise AssertionError('Cross-origin write was accepted')
    except urllib.error.HTTPError as error:
        assert error.code==403
        error.close()
    for endpoint,data in [('invitation/replace',{}),('member/remove',dict(user_id=oid,confirmed=True)),('kitchen/clear',dict(confirmed=True,kitchen_name='Web contract '+prefix))]:editor.post(endpoint,data,403)
    owner.post('member/remove',dict(user_id=oid,confirmed=True),403)
    owner.post('kitchen/leave',dict(confirmed=True),403)
    # Shared CRUD, exact dates and stale input normalization.
    produced=owner.post('food/create',dict(name='Egg',ingredient='egg',category='dairy',location='freezer',date_source='production',date_kind='unspecified',production_date='2024-01-31',shelf_life=1,shelf_unit='months',date_confirmed=True))
    food=next(f for f in editor.state()['foods'] if f['id']==produced['id'])
    assert food['effective_date']=='2024-02-29' and food['location']=='freezer'
    owner.post('food/update',dict(food,date_source='unknown'))
    food=next(f for f in editor.state()['foods'] if f['id']==produced['id'])
    assert food['effective_date'] is None and food['production_date'] is None
    assert other.state()['foods']==[]
    other.post('food/update',dict(food,name='cross-kitchen'),404)
    editor.post('food/update',dict(food,name='Edited egg'))
    owner.post('food/update',dict(food,name='Stale edit'),409)
    editor.post('food/delete',dict(id=food['id'],version=food['version'],confirmed=True),409)
    latest=next(f for f in owner.state()['foods'] if f['id']==food['id'])
    with ThreadPoolExecutor(2) as pool:
        outcomes=list(pool.map(lambda pair:pair[0].request('food/update',dict(latest,name=pair[1]))[0],[(owner,'Concurrent owner edit'),(editor,'Concurrent editor edit')]))
    assert sorted(outcomes)==[200,409]
    # Calendar validation on the actual Worker, not only pure helper tests.
    for source,amount,unit,result in [('2024-02-29',1,'years','2025-02-28'),('2023-01-31',1,'months','2023-02-28'),('2024-02-28',1,'days','2024-02-29')]:
        assert owner.post('date/preview',dict(production_date=source,shelf_life=amount,shelf_unit=unit))['effective_date']==result
    owner.post('date/preview',dict(production_date='2024-02-30',shelf_life=1,shelf_unit='days'),400)
    owner.post('date/preview',dict(production_date='2024-01-01',shelf_life=0,shelf_unit='days'),400)
    # Request replay protection is per account and content.
    request_id=str(uuid.uuid4());body=dict(name='Tomato',ingredient='tomato',date_source='unknown',request_id=request_id)
    tomato=owner.post('food/create',body);assert owner.post('food/create',body)==tomato
    owner.post('food/create',dict(body,name='changed payload'),409)
    owner.post('food/create',dict(name='Old rice',ingredient='rice',date_source='printed',date_kind='use_by',effective_date='2000-01-01'))
    quality=owner.post('food/create',dict(name='Oil',ingredient='oil',date_source='printed',date_kind='best_before',effective_date='2000-01-01'))
    foods=owner.state()['foods'];old=next(f for f in foods if f['name']=='Old rice')
    assert not old['eligible'] and next(f for f in foods if f['name']=='Oil')['eligible']
    matched=owner.post('recipes',dict(selected=[f['id'] for f in foods]))
    assert old['id'] in matched['removed'] and matched['recipes'][0]['id']==1
    assert 'rice' in matched['recipes'][0]['missing']
    owner.post('food/used',dict(id=tomato['id'],version=1,confirmed=True))
    assert tomato['id'] in owner.post('recipes',dict(selected=[tomato['id']]))['removed']
    owner.post('food/delete',dict(id=quality['id'],version=1,confirmed=True))
    assert quality['id'] in owner.post('recipes',dict(selected=[quality['id']]))['removed']
    # Private preferences and literal user data.
    owner.post('preferences',dict(language='zh-Hant',text_size='large',reminders=False,reminder_days=7,date_format='dmy'))
    assert owner.state()['preferences']['language']=='zh-Hant' and editor.state()['preferences']['language']=='en'
    owner.post('preferences',dict(reminders='false'),400)
    injected='<img src=x onerror="alert(1)">'
    owner.post('food/create',dict(name=injected,date_source='unknown',note='<script>bad()</script>'))
    assert any(f['name']==injected for f in editor.state()['foods'])
    # Rotation, revocation and re-join are server enforced.
    newcode=owner.post('invitation/replace')['code']
    owner.post('member/remove',dict(user_id=eid,confirmed=True))
    assert editor.state()['kitchen'] is None and editor.state()['foods']==[]
    for path in ['food/create','food/update','food/delete','recipes']:editor.post(path,{},403)
    editor.post('invitation/accept',dict(code=code,confirmed=True),404)
    editor.post('invitation/accept',dict(code=newcode,confirmed=True))
    editor.post('kitchen/leave',dict(confirmed=True));assert len(owner.state()['members'])==1
    # Clear affects only this test kitchen, and preserves accounts/preferences.
    other.food()
    owner.post('kitchen/clear',dict(confirmed=False,kitchen_name='Web contract '+prefix),400)
    owner.post('kitchen/clear',dict(confirmed=True,kitchen_name='Web contract '+prefix))
    assert owner.state()['foods']==[] and len(other.state()['foods'])==1
    assert owner.state()['preferences']['language']=='zh-Hant'
    owner.post('logout');assert owner.state()['user'] is None
    owner.post('login',dict(email=prefix+'-owner@example.test',password='wrong-password-123'),401)
    owner.post('login',dict(email=prefix+'-owner@example.test',password='test-password-123'))
    assert owner.state()['kitchen']['name']=='Web contract '+prefix
    print('PASS: live web API auth/CSRF, shared roles, scoped CRUD, calendar dates, retry keys, stale versions, recipe exclusions, private preferences, invitation rotation, immediate revocation, leave, clear and login persistence.')


if __name__=='__main__':run(os.getenv('LMB_WEB_BASE_URL','http://127.0.0.1:8787'))
