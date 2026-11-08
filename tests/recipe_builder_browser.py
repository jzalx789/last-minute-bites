"""Visible meal ingredients, non-destructive edits, four dishes and individual swaps."""
import os,sys,uuid
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
sys.path.insert(0,str(Path(__file__).resolve().parent))
from browser_smoke import register,click,navigate,read_state,request
base=os.getenv('LMB_WEB_BASE_URL','http://127.0.0.1:8790');assert base.startswith('http://127.0.0.1:')
artifacts=Path(__file__).resolve().parents[1]/'artifacts/recipe-builder';artifacts.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.webkit.launch(executable_path=os.getenv('LMB_TEST_WEBKIT_EXECUTABLE',p.webkit.executable_path),headless=True) if os.getenv('LMB_WEB_ENGINE')=='webkit' else p.chromium.launch(executable_path=os.getenv('LMB_TEST_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
 # Block service workers only in this fault-injection test so page.route can intercept API requests.
 page=b.new_page(service_workers='block',viewport={'width':390,'height':844},is_mobile=True,has_touch=True);errors=[];calls=[]
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:calls.append(r.url) if r.url.endswith(('/api/recipes/generate','/api/recipes/replace')) else None)
 register(page,base,'meal-browser-'+uuid.uuid4().hex[:10]+'@example.test');page.locator('[name=name]').fill('Meal builder');page.locator('[data-form=create-kitchen] button').click();expect(page.locator('h1')).to_have_text('What’s in your kitchen?')
 foods=[]
 for name in ['Egg','Tomato','Tofu','Spinach','Rice','Milk']:
  r=request(page,'food/create',dict(name=name,quantity=8,unit='pcs',date_source='unknown',purchased_date='2026-11-08'));assert r['status']==200,r;foods.append(r['body'])
 page.reload();expect(page.locator('h1')).to_have_text('What’s in your kitchen?');navigate(page,'category/all')
 for food in foods[:5]:page.locator(f'[data-select="{food["id"]}"]').check()
 click(page,'find-recipes');expect(page.locator('[data-recipe-food]')).to_have_count(5);expect(page.locator('#recipe-foods')).to_contain_text('8 pcs');before=read_state(page)['foods']
 # A wrapped caption must not push its control below its neighbour.
 for width in [320, 360, 390, 412, 768]:
  page.set_viewport_size({'width':width,'height':844})
  page.wait_for_function("""() => [...document.querySelectorAll('.recipe-controls .two-fields')].every(row => {
   const controls=[...row.querySelectorAll('input, select')].map(el=>el.getBoundingClientRect());
   return controls.length===2 && Math.abs(controls[0].top-controls[1].top)<1 &&
    controls.every(rect=>rect.left>=0 && rect.right<=innerWidth);
  })""")
 page.set_viewport_size({'width':390,'height':844})
 page.locator('[name=servings]').fill('4');page.locator('[name=portion]').select_option('hearty');page.locator('[name=count]').select_option('4');page.locator('[name=style]').select_option('mixed')
 page.locator(f'[data-action=recipe-remove-food][data-id="{foods[1]["id"]}"]').click();expect(page.locator('[data-recipe-food]')).to_have_count(4)
 page.locator('.recipe-food-picker summary').click();page.locator('#recipe-food-search').fill('Milk');page.locator(f'[data-action=recipe-add-food][data-id="{foods[5]["id"]}"]').click();expect(page.locator('[data-recipe-food]')).to_have_count(5);expect(page.locator('[name=servings]')).to_have_value('4');expect(page.locator('[name=portion]')).to_have_value('hearty');assert read_state(page)['foods']==before;page.locator('.recipe-preferences summary').click();page.locator('[name=avoid]').fill('milk');expect(page.locator('[data-recipe-food]')).to_have_count(4);expect(page.locator('#recipe-foods')).to_contain_text('Excluded by your ingredient preferences');page.locator('[name=avoid]').fill('');expect(page.locator('[data-recipe-food]')).to_have_count(5);assert calls==[]
 with page.expect_response(lambda r:r.url.endswith('/api/recipes/generate')) as response:page.locator('[data-form=ai-recipes] button.primary').click()
 first=response.value.json()['generation'];expect(page.locator('.recipe-card')).to_have_count(4);assert len(first['recipes'])==4
 chosen={f['id'] for i,f in enumerate(foods) if i!=1};assert {u['food_id'] for r in first['recipes'] for u in r['uses']}==chosen
 expect(page.locator('[data-action=replace-recipe]').first).to_be_enabled()
 with page.expect_response(lambda r:r.url.endswith('/api/recipes/replace')) as response:page.locator('[data-action=replace-recipe]').first.click()
 second=response.value.json()['generation'];expect(page.locator('.recipe-card')).to_have_count(4);assert second['recipes'][1:]==first['recipes'][1:];assert second['recipes'][0]['title']!=first['recipes'][0]['title'];assert read_state(page)['foods']==before
 # Saved selections and settings remain usable after a full reload.
 page.reload();expect(page.locator('.recipe-card')).to_have_count(4);expect(page.locator('.recipe-card h2').first).to_have_text(second['recipes'][0]['title']);expect(page.locator('[name=count]')).to_have_value('4');expect(page.locator('[name=servings]')).to_have_value('4');expect(page.locator('[data-recipe-food]')).to_have_count(5);expect(page.locator('[data-action=replace-recipe]').first).to_be_enabled()
 # An unavailable replacement leaves all previous recipes visible.
 page.route('**/api/recipes/replace',lambda route:route.fulfill(status=503,content_type='application/json',body='{"error":{"code":"ai_unavailable"}}'))
 page.locator('[data-action=replace-recipe]').first.click();expect(page.locator('#toast')).to_contain_text('unavailable');expect(page.locator('.recipe-card')).to_have_count(4);expect(page.locator('.recipe-card h2').first).to_have_text(second['recipes'][0]['title']);page.unroute('**/api/recipes/replace')
 # Removing every chosen food never silently switches back to the full inventory.
 while page.locator('[data-recipe-food]').count():page.locator('[data-action=recipe-remove-food]').first.click()
 before_calls=len(calls);expect(page.locator('[name=scope]')).to_have_value('selected');page.locator('[data-form=ai-recipes] button.primary').click();expect(page.locator('[data-form=ai-recipes] .error')).to_contain_text('Choose at least one');assert len(calls)==before_calls
 if not page.locator('.recipe-food-picker').evaluate('(e)=>e.open'):page.locator('.recipe-food-picker summary').click()
 page.locator('#recipe-food-search').fill('');page.locator('[data-action=recipe-add-food]').first.click();expect(page.locator('[data-recipe-food]')).to_have_count(1);expect(page.locator('.recipe-input-changed')).to_be_visible();expect(page.locator('[data-action=replace-recipe]').first).to_be_disabled();assert read_state(page)['foods']==before
 navigate(page,'preferences');page.locator('[name=language]').select_option('zh-Hant');page.locator('[name=text_size]').select_option('large');page.locator('[data-form=preferences] button').click();expect(page.locator('h1')).to_have_text('個人偏好')
 navigate(page,'recipes');page.set_viewport_size({'width':320,'height':480});expect(page.locator('#recipe-foods')).to_contain_text('這次使用的食材');assert page.locator('#main').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1');page.screenshot(path=str(artifacts/'recipe-foods-phone.png'));assert not errors,errors
 b.close()
print('PASS: selected ingredient names/batches/amounts, search/add/remove without inventory changes or losing settings, four dishes with selected-only coverage, individual swap retaining other dishes, failed-swap preservation, empty-selection protection and Chinese large-text phone layout.')
