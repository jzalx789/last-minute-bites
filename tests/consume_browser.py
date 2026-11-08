"""Compact consumption UX: no checkboxes, recipe presets, inline legacy setup."""
import os,sys,uuid
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
sys.path.insert(0,str(Path(__file__).resolve().parent))
from browser_smoke import register,navigate,click,request,read_state
base=os.getenv('LMB_WEB_BASE_URL','http://127.0.0.1:8790')
assert base.startswith('http://127.0.0.1:') or os.getenv('LMB_CONSUME_LIVE')=='1','Remote synthetic UI checks require LMB_CONSUME_LIVE=1.'
artifacts=Path(__file__).resolve().parents[1]/'artifacts/consume';artifacts.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.webkit.launch(executable_path=os.getenv('LMB_TEST_WEBKIT_EXECUTABLE',p.webkit.executable_path),headless=True) if os.getenv('LMB_WEB_ENGINE')=='webkit' else p.chromium.launch(executable_path=os.getenv('LMB_TEST_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 register(page,base,'consume-'+uuid.uuid4().hex[:10]+'@example.test');page.locator('[data-form=create-kitchen] [name=name]').fill('Compact food usage');page.locator('h1').click();page.wait_for_timeout(5300);expect(page.locator('[data-form=create-kitchen] [name=name]')).to_have_value('Compact food usage');page.locator('[data-form=create-kitchen] button').click();expect(page.locator('h1')).to_have_text('What’s in your kitchen?')
 ids=[]
 for food in [dict(name='番茄',ingredient='tomato',quantity=4,unit='pcs'),dict(name='雞蛋',ingredient='egg'),dict(name='三文魚',quantity=1,unit='pcs')]:
  result=request(page,'food/create',dict(date_source='unknown',**food));assert result['status']==200;ids.append(result['body']['id'])
 # Direct API seeding does not refresh the open page; load the committed state explicitly.
 page.reload();expect(page.locator('h1')).to_have_text('What’s in your kitchen?')
 navigate(page,'category/all');expect(page.locator('.food-row')).to_have_count(3)
 for box in page.locator('[data-select]').all():box.check()
 click(page,'batch-used');expect(page.locator('#used-picker')).to_be_visible();expect(page.locator('#used-foods input[type=checkbox]')).to_have_count(0)
 rows=page.locator('.consume-item');expect(rows).to_have_count(3)
 main=page.locator('#used-picker').bounding_box();assert page.locator('#used-confirm').bounding_box()['y']+page.locator('#used-confirm').bounding_box()['height'] <= main['y']+main['height']
 assert page.locator('#used-foods').evaluate('(e)=>e.scrollHeight<=e.clientHeight+1'),'Three ordinary rows should fit without internal scrolling'
 page.screenshot(path=str(artifacts/'compact-three-foods-phone.png'))
 # A keyboard can pan the viewport after a lower batch row receives focus.
 amount=rows.last.locator('[data-consume-amount]');amount.fill('0.5')
 page.evaluate("""() => {
  const vv=visualViewport;
  Object.defineProperty(vv,'height',{value:300,configurable:true});
  Object.defineProperty(vv,'offsetTop',{value:120,configurable:true});
  vv.dispatchEvent(new Event('resize'));vv.dispatchEvent(new Event('scroll'));
 }""")
 page.wait_for_function("""() => {
  const vv=visualViewport,d=document.querySelector('#used-picker').getBoundingClientRect(),
   list=document.querySelector('#used-foods').getBoundingClientRect(),
   f=document.activeElement.getBoundingClientRect(),b=document.querySelector('#used-confirm').getBoundingClientRect();
  return d.top>=vv.offsetTop && d.bottom<=vv.offsetTop+vv.height &&
   f.top>=list.top-1 && f.bottom<=list.bottom+1 && b.bottom<=vv.offsetTop+vv.height;
 }""")
 expect(amount).to_be_focused();expect(amount).to_have_value('0.5')
 page.evaluate("() => {const vv=visualViewport;delete vv.height;delete vv.offsetTop;vv.dispatchEvent(new Event('resize'));vv.dispatchEvent(new Event('scroll'));}")

 egg=page.locator(f'.consume-item[data-id="{ids[1]}"]');egg.locator('[data-consume-amount]').fill('2');expect(egg.locator('.consume-setup')).to_have_attribute('open','');egg.locator('[data-consume-before]').fill('6');expect(egg.locator('.consume-remainder')).to_have_text('Left 4 pcs')
 # In-modal data is a draft until confirmed; cancel cannot alter a legacy record.
 page.locator('#used-cancel').click();assert next(f for f in read_state(page)['foods'] if f['id']==ids[1])['quantity'] is None
 click(page,'batch-used');egg=page.locator(f'.consume-item[data-id="{ids[1]}"]');egg.locator('[data-consume-amount]').fill('2');egg.locator('[data-consume-before]').fill('6')
 salmon=page.locator(f'.consume-item[data-id="{ids[2]}"]');salmon.locator('[data-consume-all]').click();salmon.locator('[data-consume-all]').click();expect(salmon.locator('[data-consume-amount]')).to_have_value('1')
 page.locator('#used-confirm').click();expect(page.locator('#used-picker')).not_to_be_visible();foods=read_state(page)['foods'];assert next(f for f in foods if f['id']==ids[1])['quantity']==4;assert next(f for f in foods if f['id']==ids[0])['quantity']==4;assert next(f for f in foods if f['id']==ids[2])['status']=='used'
 if base.startswith('http://127.0.0.1:'):
  # Fresh recipe quantities are prefilled; skipping one ingredient requires one tap.
  navigate(page,'recipes');page.locator('[name=scope]').select_option('all');page.locator('[name=count]').select_option('1');page.locator('[data-form=ai-recipes] button.primary').click();expect(page.locator('.recipe-card')).to_have_count(1);before=read_state(page)['foods'];click(page,'cooked-recipe');expect(page.locator('[data-consume-amount]').first).not_to_have_value('');assert read_state(page)['foods']==before
  page.locator('[data-consume-reset]').first.click();expect(page.locator('[data-consume-amount]').first).to_have_value('');# A recipe can now cover every selected ingredient, so clear all remaining presets.
  for reset in page.locator('[data-consume-reset]').all()[1:]:reset.click()
  page.locator('#used-confirm').click();expect(page.locator('#used-error')).to_contain_text('Enter an amount');page.locator('#used-cancel').click();assert read_state(page)['foods']==before
 # Responsive controls also work with large text and keyboard-sized viewports.
 navigate(page,'preferences');page.locator('[name=text_size]').select_option('large');page.locator('[name=language]').select_option('zh-Hant');page.locator('[data-form=preferences] button').click();expect(page.locator('h1')).to_have_text('個人偏好')
 for width,height in [(320,480),(390,844),(1365,900)]:
  page.set_viewport_size({'width':width,'height':height});navigate(page,'category/all');page.locator(f'[data-food-id="{ids[1]}"] [data-action=row-used]').click();expect(page.locator('#used-picker')).to_be_visible();assert page.locator('#used-picker').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1');b=page.locator('#used-confirm').bounding_box();assert b['y']+b['height']<=height
  page.locator('[data-consume-amount]').fill('1');page.screenshot(path=str(artifacts/f'compact-large-{width}.png'));page.locator('#used-cancel').click()
 assert not errors,errors
 browser.close()
print('PASS: compact three-food list without checkboxes/scrolling, typed amount selects itself, inline legacy quantity+consume, safe cancel, one-tap All, preserved setup draft, and large-text/short-screen controls.')
