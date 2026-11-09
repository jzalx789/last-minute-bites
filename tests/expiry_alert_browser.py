"""Visible past-date warnings, accurate label semantics and one-click review/removal."""
import os,sys,uuid,datetime
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
sys.path.insert(0,str(Path(__file__).resolve().parent))
from browser_smoke import register,navigate,click,request,read_state,confirm
base=os.getenv('LMB_WEB_BASE_URL','http://127.0.0.1:8794')
artifacts=Path(__file__).resolve().parents[1]/'artifacts/expiry';artifacts.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.webkit.launch(executable_path=os.getenv('LMB_TEST_WEBKIT_EXECUTABLE',p.webkit.executable_path),headless=True) if os.getenv('LMB_WEB_ENGINE')=='webkit' else p.chromium.launch(executable_path=os.getenv('LMB_TEST_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 register(page,base,'expiry-'+uuid.uuid4().hex[:12]+'@example.test')
 page.locator('[data-form=create-kitchen] [name=name]').fill('Expiry warning checks');page.locator('[data-form=create-kitchen] button').click();expect(page.locator('.app-dock')).to_be_visible()
 today=read_state(page)['today'];past=(datetime.date.fromisoformat(today)-datetime.timedelta(days=1)).isoformat();foods={}
 for name,source,kind,date in [('Milk','printed','use_by',past),('Egg','printed','best_before',past),('薯片','personal','unspecified',past),('Tofu','printed','unspecified',past),('Spinach','printed','use_by',today),('Rice','unknown','unspecified',None),('Tomato','printed','best_before',past)]:
  r=request(page,'food/create',dict(name=name,quantity=1,unit='pcs',date_source=source,date_kind=kind,effective_date=date));assert r['status']==200,r;foods[name]=r['body']
 r=request(page,'food/batch',dict(action='used',items=[dict(id=foods['Tomato']['id'],version=foods['Tomato']['version'])],confirmed=True));assert r['status']==200,r
 request(page,'preferences',dict(reminders=False));page.wait_for_load_state("networkidle");page.reload()
 alert=page.locator('.expiry-alert');expect(alert).to_be_visible();expect(alert).to_have_attribute('role','alert');expect(alert.locator('.expiry-count')).to_have_text('4');expect(alert).to_contain_text('Milk');expect(alert).to_contain_text('do not eat')
 expect(page.locator('.reminder-banner')).to_have_count(0)
 page.screenshot(path=str(artifacts/'past-use-by-phone.png'))
 page.wait_for_timeout(5500);expect(alert).to_be_visible();expect(alert).to_have_attribute('role','region')
 click(page,'review-overdue');expect(page.locator('#inventory-status')).to_have_value('overdue');expect(page.locator('.food-row')).to_have_count(4)
 milk=page.locator(f'[data-food-id="{foods["Milk"]["id"]}"]');expect(milk).to_have_class('food-row past-date-row expired-use-by');expect(milk.locator('[data-select]')).to_be_disabled();expect(milk).to_contain_text('do not eat')
 expect(page.locator(f'[data-food-id="{foods["Egg"]["id"]}"] [data-select]')).to_be_enabled()
 expect(page.locator('.food-row').filter(has_text='薯片')).to_contain_text('Past your reminder date')
 page.locator('#inventory-status').select_option('used');expect(page.locator('.food-row')).to_have_count(1);click(page,'review-overdue');expect(page.locator('.food-row')).to_have_count(4)
 # Warnings remain readable on narrow and large-text screens.
 request(page,'preferences',dict(language='zh-Hant',text_size='large'));page.wait_for_load_state("networkidle");page.reload();expect(alert).to_contain_text('請勿食用')
 for width in [280,320,390,717]:
  page.set_viewport_size({'width':width,'height':844});assert page.locator('#main').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1'),width
 page.set_viewport_size({'width':390,'height':844});page.screenshot(path=str(artifacts/'past-dates-large-chinese.png'))
 request(page,'preferences',dict(language='en',text_size='standard'));page.wait_for_load_state("networkidle");page.reload()
 # Correcting a date removes its warning; today is not already expired.
 click(page,'edit',f'[data-id="{foods["Milk"]["id"]}"]');page.locator('[name=effective_date]').fill(today);page.locator('[data-form=food] button.primary').click();expect(alert).to_be_visible();expect(alert).not_to_contain_text('do not eat');expect(alert.locator('.expiry-count')).to_have_text('3');expect(alert).to_contain_text('quality date')
 click(page,'review-overdue');expect(page.locator('.food-row')).to_have_count(3)
 # Removed records stop contributing immediately; no modal blocks browsing.
 while page.locator('.food-row').count():
  count=page.locator('.food-row').count();page.locator('.food-row [data-action=row-delete]').first.click();confirm(page);expect(page.locator('.food-row')).to_have_count(count-1)
 expect(alert).to_have_count(0);expect(page.locator('.food-row')).to_have_count(0)
 page.locator('#inventory-status').select_option('active');expect(page.locator('.food-row')).to_have_count(3);expect(page.locator('.expired-use-by')).to_have_count(0)
 navigate(page,'kitchen');expect(alert).to_have_count(0)
 assert not errors,errors;b.close()
print('PASS: always-visible overdue warning, use-by priority/do-not-eat vs quality/personal/reference dates, used/today/undated exclusions, one-click filtered review, narrow bilingual large text, correcting dates and deleting records clear warnings; no model calls.')
