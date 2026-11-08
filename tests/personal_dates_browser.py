"""Optional self-managed food dates, persistence and package-date boundaries.
Uses only rule-recognised synthetic food; no model requests on local or public sites.
"""
import os,sys,uuid
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
sys.path.insert(0,str(Path(__file__).resolve().parent))
from browser_smoke import register,click,navigate,set_stock,read_state,request
base=os.getenv('LMB_WEB_BASE_URL','http://127.0.0.1:8790')
artifacts=Path(__file__).resolve().parents[1]/'artifacts/personal-dates';artifacts.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.webkit.launch(executable_path=os.getenv('LMB_TEST_WEBKIT_EXECUTABLE',p.webkit.executable_path),headless=True) if os.getenv('LMB_WEB_ENGINE')=='webkit' else p.chromium.launch(executable_path=os.getenv('LMB_TEST_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 register(page,base,'personal-dates-'+uuid.uuid4().hex[:10]+'@example.test');page.locator('[name=name]').fill('Self-managed dates');page.locator('[data-form=create-kitchen] button').click();expect(page.locator('h1')).to_have_text('What’s in your kitchen?')
 click(page,'add');page.locator('[name=name]').fill('薯片');set_stock(page,1,'pack');page.locator('[name=date_source]').select_option('personal')
 expect(page.locator('[name=date_source] option:checked')).to_have_text('Decide myself / after opening');expect(page.locator('#personal-date-hint')).to_be_visible();expect(page.locator('#package-label')).not_to_be_visible();assert not page.locator('[name=effective_date]').evaluate('(e)=>e.required')
 page.locator('[data-form=food] button.primary').click();expect(page.locator('h1')).to_have_text('What’s in your kitchen?');food=read_state(page)['foods'][0];assert food['date_source']=='personal' and food['effective_date'] is None and food['eligible']
 navigate(page,'category/all');expect(page.locator('.food-row')).to_contain_text('Self-managed, no fixed date')
 navigate(page,'food/'+str(food['id']));expect(page.locator('[name=date_source]')).to_have_value('personal');today=read_state(page)['today'];page.locator('[name=effective_date]').fill(today);page.locator('[data-form=food] button.primary').click();expect(page.locator('h1')).to_have_text('What’s in your kitchen?');expect(page.locator('.reminder-banner')).to_contain_text('Personal reminder')
 expect(page.locator('.reminder-details')).not_to_be_visible()
 page.locator('.reminder-banner summary').click();expect(page.locator('.reminder-details')).to_be_visible()
 expect(page.locator('.reminder-details')).to_contain_text('Personal reminder')
 click(page,'view-first');expect(page.locator('.reminder-details')).to_be_visible()
 page.locator('.reminder-banner summary').click();expect(page.locator('.reminder-details')).not_to_be_visible()
 page.reload();expect(page.locator('h1')).to_have_text('What’s in your kitchen?');food=read_state(page)['foods'][0];assert food['effective_date']==today and food['date_kind']=='unspecified'
 navigate(page,'food/'+str(food['id']));page.locator('[name=effective_date]').fill('2000-01-01');page.locator('[data-form=food] button.primary').click();expect(page.locator('h1')).to_have_text('What’s in your kitchen?');navigate(page,'category/all');expect(page.locator('.food-row')).to_contain_text('Past your reminder date');assert read_state(page)['foods'][0]['eligible']
 # The user can clear an existing reminder without replacing it with a guessed date.
 navigate(page,'food/'+str(food['id']));page.locator('[name=effective_date]').fill('');page.locator('[data-form=food] button.primary').click();expect(page.locator('h1')).to_have_text('What’s in your kitchen?');assert read_state(page)['foods'][0]['effective_date'] is None
 # Switching to a real printed use-by restores the existing restriction.
 navigate(page,'food/'+str(food['id']));page.locator('[name=date_source]').select_option('printed');expect(page.locator('#package-label')).to_be_visible();page.locator('[name=date_kind]').select_option('use_by');page.locator('[name=effective_date]').fill('2000-01-01');page.locator('[data-form=food] button.primary').click();expect(page.locator('h1')).to_have_text('What’s in your kitchen?');assert not read_state(page)['foods'][0]['eligible']
 # Server normalisation prevents stale/forged package fields leaking into personal mode.
 food=read_state(page)['foods'][0];result=request(page,'food/update',dict(food,date_source='personal',effective_date='',date_kind='use_by',production_date='2024-01-01',shelf_life=2,shelf_unit='days'));assert result['status']==200,result
 food=read_state(page)['foods'][0];assert food['effective_date'] is None and food['date_kind']=='unspecified' and food['production_date'] is None and food['eligible']
 invalid=request(page,'food/update',dict(food,effective_date='2026-02-30'));assert invalid['status']==400,invalid
 assert read_state(page)['foods'][0]['effective_date'] is None
 navigate(page,'preferences');page.locator('[name=language]').select_option('zh-Hant');page.locator('[name=text_size]').select_option('large');page.locator('[data-form=preferences] button').click();expect(page.locator('h1')).to_have_text('個人偏好');navigate(page,'food/'+str(food['id']));expect(page.locator('[name=date_source] option:checked')).to_have_text('自行決定／開封後');expect(page.locator('#food-date-label')).to_have_text('預計吃完日（選填）');page.locator('[name=effective_date]').fill(today)
 assert page.locator('#main').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1');page.screenshot(path=str(artifacts/'personal-date-phone.png'));assert not errors,errors
 b.close()
print('PASS: optional personal date, no-date persistence, reminders, past reminder stays eligible, clear/edit/reload, printed use-by unchanged, server normalisation/invalid date rejection and Chinese large-text phone layout; no model calls.')
