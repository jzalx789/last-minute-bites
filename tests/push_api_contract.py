"""Push opt-in, account/device isolation and real scheduled handler with a test-only transport."""
import os,sys,uuid,urllib.request,json,time,datetime
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from web_api_contract import Client as BaseClient
class Client(BaseClient):
 def request(self,path,data=None,headers=None):return super().request(path,data,{'CF-Connecting-IP':'synthetic-push-contract',**(headers or {})})
base=os.getenv('LMB_WEB_BASE_URL','http://127.0.0.1:8794');assert base.startswith('http://127.0.0.1:')
a,b=Client(base),Client(base);suffix=uuid.uuid4().hex[:10]
for client,name in [(a,'a'),(b,'b')]:client.register('push-'+name+suffix+'@example.test')
a.post('kitchen/create',dict(name='Push test kitchen'))
code=a.post('invitation/replace')['code'];b.post('invitation/accept',dict(code=code,confirmed=True))
config=a.request('push/config')[1];assert config['provider']=='test-fixture' and len(config['publicKey'])==87 and set(config)=={'publicKey','provider','schedule'};assert a.request('push/config')[1]['publicKey']==config['publicKey']
ua='BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4'
def subscription(prefix='ok'):
 return dict(endpoint='https://fcm.googleapis.com/fcm/send/'+prefix+'-'+uuid.uuid4().hex,keys=dict(p256dh=ua,auth='BTBZMqHH6r4Tts7J_aSIgg'))
sub=subscription();a.post('push/subscribe',dict(subscription=sub));assert a.post('push/status',dict(endpoint=sub['endpoint']))['subscribed']
assert not b.post('push/status',dict(endpoint=sub['endpoint']))['subscribed'];b.post('push/subscribe',dict(subscription=sub),409);b.post('push/unsubscribe',dict(endpoint=sub['endpoint']));assert a.post('push/status',dict(endpoint=sub['endpoint']))['subscribed']
b.post('push/test',dict(endpoint=sub['endpoint']),409)
assert a.request('push/subscribe',dict(subscription=sub),{'X-CSRF-Token':''})[0]==403
a.post('push/subscribe',dict(subscription={**sub,'endpoint':'https://127.0.0.1/private'}),400)
a.post('push/subscribe',dict(subscription={**sub,'keys':dict(p256dh='bad',auth='bad')}),400)
assert a.post('push/test',dict(endpoint=sub['endpoint']))=={'sent':True,'provider':'test-fixture'}
status=a.post('push/status',dict(endpoint=sub['endpoint']));assert status['last_test_at'] and status['last_sent_at'] is None
state=a.state();day=state['today'];a.food(name='Egg',quantity=6,unit='pcs',date_source='personal',effective_date=day)
before=a.state()['foods'];clock=int(datetime.datetime.fromisoformat(day+'T01:00:00+00:00').timestamp()*1000)
def run_schedule(when):
 with urllib.request.urlopen(base+'/cdn-cgi/local/scheduled?time='+str(when),timeout=15) as r:assert r.status==200
 deadline=time.monotonic()+10
 while time.monotonic()<deadline:
  cfg=a.request('push/config')[1]
  if cfg['schedule']['last_run']==when:break
  time.sleep(.05)
 assert cfg['schedule']['last_run']==when,cfg
 time.sleep(.2)
run_schedule(clock);first=a.post('push/status',dict(endpoint=sub['endpoint']))['last_sent_at'];assert first==clock,first
run_schedule(clock+300000);assert a.post('push/status',dict(endpoint=sub['endpoint']))['last_sent_at']==first
assert a.state()['foods']==before
# No date or disabled reminders never create an automatic push.
a.post('preferences',dict(reminders=False));run_schedule(clock+600000);assert a.post('push/status',dict(endpoint=sub['endpoint']))['last_sent_at']==first
gone=subscription('gone');a.post('push/subscribe',dict(subscription=gone));a.post('push/test',dict(endpoint=gone['endpoint']),409);assert not a.post('push/status',dict(endpoint=gone['endpoint']))['subscribed']
retry=subscription('retry');a.post('push/subscribe',dict(subscription=retry));a.post('push/test',dict(endpoint=retry['endpoint']),503);assert a.post('push/status',dict(endpoint=retry['endpoint']))['last_error']=='service_429'
a.post('push/test',dict(endpoint=sub['endpoint']),429)
# Revocation removes a device, even if that user rejoins before the next scheduler run.
editor=subscription();b.post('push/subscribe',dict(subscription=editor));cid=b.state()['user']['id'];a.post('member/remove',dict(user_id=cid,confirmed=True));b.post('push/test',dict(endpoint=editor['endpoint']),403);b.post('invitation/accept',dict(code=code,confirmed=True));assert not b.post('push/status',dict(endpoint=editor['endpoint']))['subscribed']
a.post('push/unsubscribe',dict(endpoint=sub['endpoint']));assert not a.post('push/status',dict(endpoint=sub['endpoint']))['subscribed']
a.post('push/subscribe',dict(subscription=sub));a.post('logout');a.post('login',dict(email='push-a'+suffix+'@example.test',password='test-password-123'));assert not a.post('push/status',dict(endpoint=sub['endpoint']))['subscribed']
assert a.request('push/schedule',{})[0]==404
print('PASS: stable public VAPID key, authenticated consent/subscriptions, scoped status/disable/test, CSRF and endpoint/key validation, encrypted test transport, real cron handler/time zone, daily deduplication, preferences, expired endpoints, retries/rate limits, revocation and logout; food unchanged. Transport is test-only, not a real phone delivery.')
