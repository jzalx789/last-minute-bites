"""Automatic food category, optional correction, unknown-name confirmation and blocked non-food."""
import os,sys,uuid
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
sys.path.insert(0,str(Path(__file__).resolve().parent))
from browser_smoke import launch_browser,register,navigate,click,set_stock,read_state
base=os.getenv('LMB_WEB_BASE_URL','http://127.0.0.1:8790');assert base.startswith('http://127.0.0.1:')
artifacts=Path(__file__).resolve().parents[1]/'artifacts/classification';artifacts.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=launch_browser(p)
 page=browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 register(page,base,'class-ui-'+uuid.uuid4().hex[:10]+'@example.test');page.locator('[data-form=create-kitchen] [name=name]').fill('Auto food category');page.locator('[data-form=create-kitchen] button').click();expect(page.locator('h1')).to_have_text('What’s in your kitchen?')
 click(page,'add');page.locator('[name=name]').fill('雞蛋');set_stock(page,6)
 expect(page.locator('[name=category]')).to_have_value('dairy');expect(page.locator('#food-classification')).to_contain_text('Auto category');page.locator('[data-form=food] button.primary').click();expect(page.locator('h1')).to_have_text('What’s in your kitchen?');assert read_state(page)['foods'][0]['category']=='dairy'
 click(page,'add');page.locator('[name=name]').fill('Delayed Skyr');page.locator('[name=quantity]').focus();page.locator('[name=name]').fill('洗潔精');set_stock(page,1);expect(page.locator('#food-classification')).to_contain_text('non-food');expect(page.locator('[data-form=food] button.primary')).to_be_disabled();page.wait_for_timeout(900);expect(page.locator('[data-form=food] button.primary')).to_be_disabled();assert len(read_state(page)['foods'])==1
 # A late response for the previous name cannot block a new valid food.
 page.locator('[name=name]').fill('Skyr');set_stock(page,2);expect(page.locator('[name=category]')).to_have_value('dairy');expect(page.locator('[data-form=food] button.primary')).to_be_enabled();page.locator('[data-form=food] button.primary').click();expect(page.locator('h1')).to_have_text('What’s in your kitchen?')
 click(page,'add');page.locator('[name=name]').fill('小白');set_stock(page,1);expect(page.locator('#food-confirmation')).to_be_visible();expect(page.locator('[name=food_confirmed]')).not_to_be_checked();page.locator('[data-form=food] button.primary').click();assert len(read_state(page)['foods'])==2
 page.locator('[name=food_confirmed]').check();page.locator('[data-form=food] button.primary').click();expect(page.locator('h1')).to_have_text('What’s in your kitchen?')
 click(page,'add');page.locator('[name=name]').fill('Tomato');set_stock(page,3);expect(page.locator('[name=category]')).to_have_value('produce');page.locator('[name=category]').select_option('other');expect(page.locator('#food-classification')).to_have_text('Category: Other');page.locator('[data-form=food] button.primary').click();expect(page.locator('h1')).to_have_text('What’s in your kitchen?');assert next(f for f in read_state(page)['foods'] if f['name']=='Tomato')['category']=='other'
 tomato=next(f for f in read_state(page)['foods'] if f['name']=='Tomato');navigate(page,'food/'+str(tomato['id']));expect(page.locator('#food-classification')).to_have_text('Category: Other');page.locator('[name=note]').fill('Keep my category when editing');page.locator('[data-form=food] button.primary').click();expect(page.locator('h1')).to_have_text('What’s in your kitchen?');assert next(f for f in read_state(page)['foods'] if f['id']==tomato['id'])['category']=='other'
 navigate(page,'preferences');page.locator('[name=language]').select_option('zh-Hant');page.locator('[data-form=preferences] button').click();expect(page.locator('h1')).to_have_text('個人偏好')
 navigate(page,'food');page.locator('[name=name]').fill('三文魚');set_stock(page,300,'g');expect(page.locator('[name=category]')).to_have_value('protein');page.screenshot(path=str(artifacts/'automatic-category-phone.png'));assert page.locator('#main').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
 page.locator('[name=name]').fill('手機');page.locator('[name=quantity]').focus();expect(page.locator('#food-classification')).to_contain_text('不是食物');page.screenshot(path=str(artifacts/'non-food-blocked-phone.png'));assert not errors,errors
 browser.close()
print('PASS: automatic Chinese/English categories without manual selection, blocked non-food, uncommon-name model assessment, uncertain-name confirmation, manual category correction, replacement-name race and phone layout.')
