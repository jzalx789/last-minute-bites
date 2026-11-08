"""Actual Chromium Service Worker notification handling after the app page closes.
The incoming push event is injected through CDP, not delivered by a remote push provider.
"""
import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
base=os.getenv('LMB_WEB_BASE_URL','http://127.0.0.1:8794');assert base.startswith('http://127.0.0.1:')
artifacts=Path(__file__).resolve().parents[1]/'artifacts/push';artifacts.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.getenv('LMB_TEST_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox']);context=b.new_context();context.grant_permissions(['notifications'],origin=base)
 app=context.new_page();app.goto(base);app.evaluate('async()=>{await navigator.serviceWorker.ready;}');app.wait_for_function('!!navigator.serviceWorker.controller')
 keeper=context.new_page();keeper.goto(base+'/manifest.webmanifest');app.close()
 registrations=[];cdp=context.new_cdp_session(keeper);cdp.on('ServiceWorker.workerRegistrationUpdated',lambda data:registrations.extend(data['registrations']));cdp.send('ServiceWorker.enable')
 for _ in range(50):
  if any(r.get('scopeURL')==base+'/' and not r.get('isDeleted') for r in registrations):break
  keeper.wait_for_timeout(100)
 registration=next(r for r in registrations if r.get('scopeURL')==base+'/' and not r.get('isDeleted'))
 payload=dict(title='Last Minute Bites',body='Synthetic background push event',tag='lmb-push-test',url='/#kitchen')
 cdp.send('ServiceWorker.deliverPushMessage',dict(origin=base,registrationId=registration['registrationId'],data=json.dumps(payload)))
 keeper.wait_for_function("async()=>{const r=await navigator.serviceWorker.ready;return (await r.getNotifications({tag:'lmb-push-test'})).length===1;}",timeout=15000)
 result=keeper.evaluate("async()=>{const r=await navigator.serviceWorker.ready;const n=(await r.getNotifications({tag:'lmb-push-test'}))[0];return {title:n.title,body:n.body,tag:n.tag,url:n.data.url};}")
 assert result==dict(title=payload['title'],body=payload['body'],tag=payload['tag'],url='/#kitchen'),result
 keeper.evaluate("async()=>{const r=await navigator.serviceWorker.ready;for(const n of await r.getNotifications())n.close();}")
 (artifacts/'service-worker-received.json').write_text(json.dumps(result,indent=2));b.close()
print('PASS: real Service Worker displays and retains a notification after the app page closes; tested with a CDP-injected push event and granted test-context permission, not remote-service/phone delivery.')
