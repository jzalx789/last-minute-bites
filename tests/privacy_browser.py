"""Real browser privacy choices, policy links, permissions and account deletion."""
import os,sys,uuid,json,base64
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
sys.path.insert(0,str(Path(__file__).resolve().parent))
from browser_smoke import launch_browser,click,navigate,confirm,set_stock
base=os.getenv('LMB_WEB_BASE_URL','http://127.0.0.1:8794');assert base.startswith('http://127.0.0.1:')
art=Path(__file__).resolve().parents[1]/'artifacts/privacy';art.mkdir(parents=True,exist_ok=True)
errors=[];requests=[]
with sync_playwright() as p:
 browser=launch_browser(p)
 context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,accept_downloads=True)
 context.add_init_script('''window.__cameraCalls=0;window.__permissionCalls=0;
 const fakeMedia={getUserMedia:async()=>{window.__cameraCalls++;throw new DOMException('denied','NotAllowedError');}};
 Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:fakeMedia});
 class PermissionFixture {};
 PermissionFixture.permission='default';PermissionFixture.requestPermission=async()=>{window.__permissionCalls++;return 'denied';};
 Object.defineProperty(window,'Notification',{configurable:true,value:PermissionFixture});''')
 page=context.new_page();page.set_extra_http_headers({'CF-Connecting-IP':'synthetic-privacy-'+uuid.uuid4().hex})
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url))
 page.goto(base+'/#privacy-policy');expect(page.locator('h1')).to_have_text('Privacy policy')
 expect(page.locator('.legal-document')).to_contain_text('Bite.limited@gmail.com')
 expect(page.locator('.legal-document')).to_contain_text('DeepSeek')
 click(page,'language');expect(page.locator('h1')).to_have_text('隱私政策');expect(page.locator('.legal-document')).to_contain_text('中國');click(page,'language')
 navigate(page,'kitchen');click(page,'auth-register')
 email='privacy-ui-'+uuid.uuid4().hex[:10]+'@example.test';password='browser-privacy-password'
 page.locator('[name=email]').fill(email);page.locator('[name=password]').fill(password);page.locator('[name=confirm_password]').fill(password)
 with page.expect_popup() as popup:page.locator('a[href="/#terms"]').click()
 policy=popup.value;expect(policy.locator('h1')).to_have_text('Terms of use');policy.close()
 expect(page.locator('[name=email]')).to_have_value(email)
 page.locator('[data-form=auth] button.primary').click()
 assert not any('/api/register' in r for r in requests)
 page.evaluate('state.legal.version="outdated-policy";render()')
 page.locator('[name=terms_accepted]').check()
 with page.expect_response(lambda r:r.url.endswith('/api/register')) as stale:page.locator('[data-form=auth] button.primary').click()
 assert stale.value.status==428
 expect(page.locator('[name=terms_accepted]')).not_to_be_checked();expect(page.locator('[name=email]')).to_have_value(email);expect(page.locator('[name=password]')).to_have_value(password)
 page.locator('[name=terms_accepted]').check();page.locator('[data-form=auth] button.primary').click()
 expect(page.locator('[data-form=create-kitchen]')).to_be_visible()
 assert not page.evaluate('state.consent.ai_text || state.consent.ai_photo')
 page.locator('[data-form=create-kitchen] [name=name]').fill('Privacy browser kitchen')
 page.locator('[data-form=create-kitchen] button').click();expect(page.locator('.kitchen-name')).to_be_visible()
 navigate(page,'privacy');expect(page.locator('h1')).to_have_text('Privacy & data')
 expect(page.locator('[name=ai_text]')).not_to_be_checked();expect(page.locator('[name=ai_photo]')).not_to_be_checked()
 assert page.evaluate('__cameraCalls===0 && __permissionCalls===0')
 with page.expect_download() as download:click(page,'export-data')
 exported=json.loads(Path(download.value.path()).read_text());assert exported['account']['email']==email
 assert 'password' not in exported['account'] and not exported['privacy']['ai_text']
 # Camera is requested only by an explicit scan action; rejection retains manual entry.
 navigate(page,'kitchens');click(page,'scan-invite');expect(page.locator('#scanner')).to_be_visible()
 expect(page.locator('#scanner-status')).to_contain_text('denied');assert page.evaluate('__cameraCalls')==1,page.evaluate('__cameraCalls')
 page.locator('#scanner-close').click();expect(page.locator('[name=code]')).to_be_visible()
 # Local food rules and manual inventory work without AI consent.
 navigate(page,'kitchen');click(page,'add');page.locator('[data-form=food] [name=name]').fill('Egg');set_stock(page,6)
 page.locator('[data-form=food] button.primary').click();expect(page.locator('.kitchen-name')).to_be_visible()
 stock=page.evaluate('JSON.stringify(state.foods)')
 navigate(page,'recipes');form=page.locator('[data-form=ai-recipes]');form.locator('button.primary').click()
 expect(page.locator('#confirm')).to_be_visible();expect(page.locator('#confirm-message')).to_contain_text('DeepSeek')
 expect(page.locator('#confirm-yes')).to_have_text('Yes')
 page.locator('#confirm-cancel').click();expect(page.locator('#confirm')).not_to_be_visible()
 assert not any('/api/recipes/generate' in r for r in requests)
 form.locator('button.primary').click();confirm(page);expect(page.locator('.recipe-card')).to_have_count(2)
 assert page.evaluate('state.consent.ai_text && !state.consent.ai_photo')
 assert page.evaluate('JSON.stringify(state.foods)')==stock
 # A photo requires separate permission; cancelling never sends it or leaves a spinner.
 navigate(page,'food');image=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=')
 page.locator('#food-photo').set_input_files({'name':'food.png','mimeType':'image/png','buffer':image})
 expect(page.locator('#confirm')).to_be_visible();expect(page.locator('#confirm-yes')).to_have_text('Yes');page.locator('#confirm-cancel').click()
 expect(page.locator('#food-photo')).to_be_enabled();expect(page.locator('#photo-results')).to_be_empty()
 assert not any('/api/food/recognize' in r for r in requests)
 navigate(page,'privacy');page.locator('[name=ai_text]').uncheck()
 with page.expect_response(lambda r:r.url.endswith('/api/privacy') and r.request.method=='POST') as withdrawn:
  page.locator('[data-form=privacy] button').click()
 assert withdrawn.value.status==200
 page.wait_for_function('state.consent.ai_text===false')
 expect(page.locator('[name=ai_text]')).not_to_be_checked()
 assert page.evaluate('state.foods.length')==1
 assert page.evaluate('api("recipes/history")')['generation'] is None
 # Phone/large-text policies and account forms stay inside the visible width.
 page.evaluate('async()=>{await api("preferences",{language:"zh-Hant",text_size:"large"});await refresh();}');page.set_viewport_size({'width':320,'height':560})
 for route in ['privacy','account','privacy-policy','terms']:
  navigate(page,route);expect(page.locator('h1')).to_be_visible()
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  assert page.locator('#main').evaluate('e=>e.scrollWidth<=e.clientWidth+1')
 page.screenshot(path=str(art/'terms-phone-large.png'),full_page=True)
 page.set_viewport_size({'width':390,'height':844});navigate(page,'account')
 delete=page.locator('[data-form=delete-account]');delete.locator('[name=email]').fill(email);delete.locator('[name=password]').fill(password)
 delete.locator('button').click();assert not any('/api/account/delete' in r for r in requests)
 delete.locator('[name=confirmed]').check();delete.locator('button').click();expect(page.locator('[data-form=auth]')).to_be_visible()
 assert page.evaluate('state.user') is None
 assert not errors,errors
 browser.close()
print('PASS: public bilingual policies, unchecked required agreement, draft-preserving policy links, default-off AI, no automatic camera/notification asks, real export download, independent AI confirmations/cancellation, history erasure, narrow large text and confirmed account deletion (test provider).')
