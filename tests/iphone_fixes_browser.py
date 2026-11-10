"""Regression for the four reported iPhone mirror issues; browser engine, not hardware."""
import os,sys,uuid,json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
sys.path.insert(0,str(Path(__file__).resolve().parent))
from browser_smoke import register,navigate,click,confirm,set_stock
base=os.getenv('LMB_WEB_BASE_URL','http://127.0.0.1:8794');assert base.startswith('http://127.0.0.1:')
art=Path(__file__).resolve().parents[1]/'artifacts/iphone-fixes';art.mkdir(parents=True,exist_ok=True)
errors=[]
def blocked_once(page,path):
 page.route('**/api/'+path,lambda route:route.fulfill(status=428,content_type='application/json',body=json.dumps({'error':{'code':'agreement_required'}})),times=1)
def accept_recovery(page):
 expect(page.locator('#agreement-dialog')).to_be_visible()
 expect(page.locator('#agreement-dialog [name=accepted]')).not_to_be_checked()
 page.locator('#agreement-dialog [name=accepted]').check();page.locator('#agreement-dialog-accept').click()
 expect(page.locator('#agreement-dialog')).not_to_be_visible()
def state(page):return page.evaluate('api("state")')
def fit_dates(page):
 assert page.locator('#main').evaluate('e=>e.scrollWidth<=e.clientWidth+1')
 for field in page.locator('[data-form=food] input[type=date]:visible').all():
  bounds=field.bounding_box();parent=field.locator('..').bounding_box()
  assert bounds['x']>=parent['x']-1 and bounds['x']+bounds['width']<=parent['x']+parent['width']+1,(bounds,parent)
with sync_playwright() as p:
 b=p.webkit.launch(executable_path=os.getenv('LMB_TEST_WEBKIT_EXECUTABLE',p.webkit.executable_path),headless=True) if os.getenv('LMB_WEB_ENGINE')=='webkit' else p.chromium.launch(executable_path=os.getenv('LMB_TEST_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
 ctx=b.new_context(viewport={'width':375,'height':812},is_mobile=True,has_touch=True,service_workers='block')
 page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 register(page,base,'iphone-qa-'+uuid.uuid4().hex[:12]+'@example.test')
 page.locator('[data-form=create-kitchen] [name=name]').fill('iPhone report regression');page.locator('[data-form=create-kitchen] button').click();expect(page.locator('.kitchen-name')).to_be_visible()
 legacy=page.evaluate('api("food/create",{name:"Old tofu (demo)",date_source:"printed",date_kind:"use_by",effective_date:"2000-01-01",quantity:null,unit:"pcs"})')['id']
 milk=page.evaluate('api("food/create",{name:"Milk",date_source:"unknown",quantity:1,unit:"pcs"})')['id']
 page.evaluate('api("food/create",{name:"Salmon",date_source:"unknown",quantity:500,unit:"g"})')
 page.evaluate('refresh()')
 # Preserve unknown legacy quantity; known/new quantity remains required.
 navigate(page,'food/'+str(legacy));q=page.locator('[data-form=food] [name=quantity]');expect(q).to_have_value('');assert not q.evaluate('e=>e.required')
 page.locator('[data-form=food] button.primary').click();expect(page.locator('.kitchen-name')).to_be_visible()
 assert next(f for f in state(page)['foods'] if f['id']==legacy)['quantity'] is None
 assert next(f for f in state(page)['foods'] if f['id']==legacy)['effective_date']=='2000-01-01'
 navigate(page,'food');assert page.locator('[data-form=food] [name=quantity]').evaluate('e=>e.required')
 page.locator('[data-form=food] [name=name]').fill('QA Rice');set_stock(page,2,'kg')
 # Date controls: all modes, short/narrow widths, normal and large text.
 for size in ['standard','large']:
  page.evaluate('(size)=>{state.preferences.text_size=size;document.documentElement.classList.toggle("large",size==="large")}',size)
  for width in [280,320,375,390,430]:
   page.set_viewport_size({'width':width,'height':812})
   for mode in ['unknown','printed','production','personal']:
    page.locator('[name=date_source]').select_option(mode)
    if mode in ['printed','personal']:page.locator('[name=effective_date]').fill('2027-01-01')
    if mode=='production':page.locator('[name=production_date]').fill('2026-11-09')
    fit_dates(page)
 page.set_viewport_size({'width':375,'height':812});page.locator('[name=date_source]').select_option('unknown')
 page.screenshot(path=str(art/'date-controls-phone.png'),full_page=True)
 # A pending add can be declined without losing draft, then accepted and replayed once.
 before=len(state(page)['foods']);blocked_once(page,'food/create');page.locator('[data-form=food] button.primary').click()
 expect(page.locator('#agreement-dialog')).to_be_visible();page.locator('#agreement-dialog-cancel').click()
 expect(page.locator('[data-form=food] [name=name]')).to_have_value('QA Rice');expect(q:=page.locator('[data-form=food] [name=quantity]')).to_have_value('2')
 assert len(state(page)['foods'])==before
 blocked_once(page,'food/create');page.locator('[data-form=food] button.primary').click();accept_recovery(page)
 expect(page.locator('.kitchen-name')).to_be_visible();assert len(state(page)['foods'])==before+1
 # Recovery works above the actual quantity modal and preserves its amount.
 navigate(page,'category/all');click(page,'row-used',f'[data-id="{milk}"]');expect(page.locator('#used-picker')).to_be_visible()
 page.locator('[data-consume-amount]').fill('1');blocked_once(page,'food/consume');page.locator('#used-confirm').click();accept_recovery(page)
 expect(page.locator('#used-picker')).not_to_be_visible();assert next(f for f in state(page)['foods'] if f['id']==milk)['status']=='used'
 page.locator('#inventory-status').select_option('used');blocked_once(page,'food/batch');click(page,'row-restore',f'[data-id="{milk}"]');confirm(page);accept_recovery(page)
 assert next(f for f in state(page)['foods'] if f['id']==milk)['quantity']==1
 # Preferences save after consent recovery; no silent loss of the selected value.
 navigate(page,'preferences');page.locator('[name=date_format]').select_option('dmy');blocked_once(page,'preferences');page.locator('[data-form=preferences] button').click();accept_recovery(page)
 expect(page.locator('[name=date_format]')).to_have_value('dmy');assert state(page)['preferences']['date_format']=='dmy'
 # Recipe recovery retains servings/selection and performs no deduction.
 navigate(page,'recipes');form=page.locator('[data-form=ai-recipes]');form.locator('[name=count]').select_option('1');form.locator('[name=servings]').fill('4')
 stock=state(page)['foods'];blocked_once(page,'recipes/generate');form.locator('button.primary').click();accept_recovery(page)
 expect(page.locator('.recipe-card')).to_have_count(1);assert page.evaluate('recipeResult.options.servings')==4;assert state(page)['foods']==stock
 # Three selected actions: Delete always occupies one line in EN / ZH large text.
 navigate(page,'category/all');page.locator('#inventory-status').select_option('active')
 for box in page.locator('[data-select]:enabled').all()[:3]:box.check()
 for lang in ['en','zh-Hant']:
  for size in ['standard','large']:
   page.evaluate('([lang,size])=>{state.preferences.language=lang;state.preferences.text_size=size;render()}',[lang,size])
   for width in [280,320,375,390,430]:
    page.set_viewport_size({'width':width,'height':812})
    button=page.locator('.selection-actions [data-action=batch-delete]');expect(button).to_be_visible()
    assert button.evaluate('e=>{const r=document.createRange();r.selectNodeContents(e);return r.getClientRects().length===1 && e.scrollWidth<=e.clientWidth+1}')
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.screenshot(path=str(art/'selection-phone.png'),full_page=True)
 # A context change while consent is open must never replay a write elsewhere.
 navigate(page,'food');page.locator('[name=name]').fill('Rice');set_stock(page,1)
 before=len(state(page)['foods']);blocked_once(page,'food/create');page.locator('[data-form=food] button.primary').click()
 expect(page.locator('#agreement-dialog')).to_be_visible();page.evaluate('contextEpoch++');accept_recovery(page)
 expect(page.locator('[data-form=food] .error')).not_to_be_empty();assert len(state(page)['foods'])==before
 # Future releases show an explicit update notice; never discard a typed form automatically.
 navigate(page,'food');page.locator('[name=name]').fill('Unsaved rice')
 page.route('**/healthz',lambda route:route.fulfill(status=200,content_type='application/json',body='{"version":"future-release"}'))
 page.evaluate('lastUpdateCheck=0;window.dispatchEvent(new Event("pageshow"))');expect(page.locator('#app-update')).to_be_visible()
 expect(page.locator('[name=name]')).to_have_value('Unsaved rice')
 click(page,'reload-app');expect(page.locator('#confirm')).to_be_visible();page.locator('#confirm-cancel').click();expect(page.locator('[name=name]')).to_have_value('Unsaved rice')
 assert not errors,errors
 b.close()
print('PASS: actionable agreement recovery for add/consume/restore/preferences/recipes, safe cancellation and single replay, legacy unknown quantity edit, constrained native date controls, single-line Delete at 280–430px/large EN-ZH, and update notice preserving drafts (test provider, browser engine).')
