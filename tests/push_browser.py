"""Push UI with synthetic permission/PushManager; real SW and server, test-only transport."""
import os,sys,uuid,json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
sys.path.insert(0,str(Path(__file__).resolve().parent))
from browser_smoke import register,navigate,read_state
base=os.getenv('LMB_WEB_BASE_URL','http://127.0.0.1:8794');assert base.startswith('http://127.0.0.1:')
artifacts=Path(__file__).resolve().parents[1]/'artifacts/push';artifacts.mkdir(parents=True,exist_ok=True)
MOCK=r'''(()=>{
 let calls=0;window.__pushPermissionCalls=()=>calls;
 Object.defineProperty(Notification,'permission',{configurable:true,get:()=>sessionStorage.getItem('push-granted')?'granted':'default'});
 Notification.requestPermission=async()=>{calls++;sessionStorage.setItem('push-granted','yes');return 'granted';};
 function current(){const data=JSON.parse(sessionStorage.getItem('push-subscription')||'null');return data?{endpoint:data.endpoint,toJSON:()=>data,unsubscribe:async()=>{sessionStorage.removeItem('push-subscription');return true;}}:null;}
 PushManager.prototype.getSubscription=async()=>current();
 PushManager.prototype.subscribe=async(options)=>{if(!options.userVisibleOnly || options.applicationServerKey.length!==65)throw Error('Invalid push options');const data={endpoint:'https://fcm.googleapis.com/fcm/send/ui-'+crypto.randomUUID(),keys:{p256dh:'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',auth:'BTBZMqHH6r4Tts7J_aSIgg'}};sessionStorage.setItem('push-subscription',JSON.stringify(data));return current();};
})();'''
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.getenv('LMB_TEST_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox']);ctx=b.new_context(viewport={'width':390,'height':844},extra_http_headers={'CF-Connecting-IP':'synthetic-push-browser'});ctx.add_init_script(MOCK);page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 register(page,base,'push-ui-'+uuid.uuid4().hex[:10]+'@example.test');page.locator('[data-form=create-kitchen] [name=name]').fill('Notification UI');page.locator('[data-form=create-kitchen] button').click();expect(page.locator('h1')).to_have_text('What’s in your kitchen?')
 navigate(page,'reminders');expect(page.locator('#push-status')).to_contain_text('not enabled');assert page.evaluate('__pushPermissionCalls()')==0
 page.locator('[data-action=enable-push]').click();expect(page.locator('#push-status')).to_contain_text('enabled on this device');assert page.evaluate('__pushPermissionCalls()')==1
 page.locator('[data-action=test-push]').click();expect(page.locator('#toast')).to_contain_text('Test sent');before=read_state(page)['foods'];page.reload();expect(page.locator('#push-status')).to_contain_text('enabled on this device');assert page.evaluate('__pushPermissionCalls()')==0
 page.locator('[name=reminders]').uncheck();page.locator('[data-form=reminders] button').click();expect(page.locator('#push-panel')).to_contain_text('scheduled push is paused');assert read_state(page)['foods']==before
 page.locator('[data-action=disable-push]').click();expect(page.locator('#push-status')).to_contain_text('not enabled');expect(page.locator('[data-action=test-push]')).to_be_disabled()
 # Permission denied is represented without trying to prompt again.
 page.evaluate("() => { Object.defineProperty(Notification,'permission',{configurable:true,get:()=> 'denied'}); }");page.locator('[data-action=refresh-push]').click();expect(page.locator('#push-status')).to_contain_text('blocked');expect(page.locator('[data-action=enable-push]')).to_be_disabled();assert page.evaluate('__pushPermissionCalls()')==0
 # iPhone Safari requires Home Screen installation; sharing the synthetic sign-in avoids new accounts.
 ios=b.new_context(storage_state=ctx.storage_state(),viewport={'width':390,'height':844},is_mobile=True,has_touch=True,user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',extra_http_headers={'CF-Connecting-IP':'synthetic-push-browser'});iphone=ios.new_page();iphone.goto(base+'/#reminders');expect(iphone.locator('#push-status')).to_contain_text('Add to Home Screen');expect(iphone.locator('[data-action=enable-push]')).to_be_disabled()
 navigate(page,'preferences');page.locator('[name=language]').select_option('zh-Hant');page.locator('[name=text_size]').select_option('large');page.locator('[data-form=preferences] button').click();expect(page.locator('h1')).to_have_text('個人偏好');navigate(page,'reminders');page.set_viewport_size({'width':320,'height':480});expect(page.locator('#push-panel')).to_contain_text('裝置推播通知');assert page.locator('#main').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1');page.locator('#push-panel').scroll_into_view_if_needed();page.screenshot(path=str(artifacts/'push-settings-phone.png'));assert not errors,errors
 b.close()
print('PASS: explicit opt-in only, permission granted/denied, enable/test/disable, reload, master pause, iPhone installation guidance and Chinese large-text layout. Permission/subscription and transport are synthetic; this is not phone receipt proof.')
