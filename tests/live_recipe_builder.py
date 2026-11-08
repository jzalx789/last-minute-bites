"""Opt-in real DeepSeek four-dish generation and one-dish replacement; synthetic stock only."""
import os,sys,uuid,json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
sys.path.insert(0,str(Path(__file__).resolve().parent))
from browser_smoke import register,navigate,click,request,read_state
if os.getenv('LMB_LIVE_RECIPES')!='1':raise SystemExit('Set LMB_LIVE_RECIPES=1 to enable two real recipe flows (each permits one bounded schema repair).')
base=os.environ['LMB_WEB_BASE_URL'];artifacts=Path(__file__).resolve().parents[1]/'artifacts/live-recipe-builder';artifacts.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.webkit.launch(executable_path=os.getenv('LMB_TEST_WEBKIT_EXECUTABLE',p.webkit.executable_path),headless=True);page=b.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 register(page,base,'live-meal-'+uuid.uuid4().hex[:10]+'@example.test');page.locator('[name=name]').fill('Live meal builder');page.locator('[data-form=create-kitchen] button').click();expect(page.locator('h1')).to_have_text('What’s in your kitchen?')
 for name,q,u in [('雞蛋',6,'pcs'),('番茄',4,'pcs'),('豆腐',2,'box'),('菠菜',500,'g'),('白米',500,'g'),('紅蘿蔔',3,'pcs')]:
  result=request(page,'food/create',dict(name=name,quantity=q,unit=u,date_source='unknown'));assert result['status']==200,result
 request(page,'preferences',dict(language='zh-Hant'));page.reload();expect(page.locator('h1')).to_have_text('冰箱裡有什麼？')
 navigate(page,'category/all')
 for box in page.locator('[data-select]').all():box.check()
 before=read_state(page)['foods'];click(page,'find-recipes');expect(page.locator('[data-recipe-food]')).to_have_count(6);page.locator('[name=count]').select_option('4');page.locator('[name=style]').select_option('mixed');page.locator('.recipe-preferences summary').click();page.locator('[name=max_minutes]').select_option('45');page.locator('[name=preference]').fill('粵式、清淡，分成四道不同菜式；可用清蒸、水煮或烚，不使用未記錄的調味料。');page.screenshot(path=str(artifacts/'selected-food-phone.png'))
 with page.expect_response(lambda r:r.url.endswith('/api/recipes/generate'),timeout=120000) as response:page.locator('[data-form=ai-recipes] button.primary').click()
 result=response.value.json();(artifacts/'generation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));assert response.value.status==200,result
 first=result['generation'];assert first['provider']=='deepseek' and len(first['recipes'])==4;assert all(not r['additional'] for r in first['recipes']);assert {u['food_id'] for r in first['recipes'] for u in r['uses']}=={f['id'] for f in before}
 expect(page.locator('.recipe-card')).to_have_count(4);expect(page.locator('.recipe-card h2').first).to_have_text(first['recipes'][0]['title']);expect(page.locator('[data-action=replace-recipe]').first).to_be_enabled();assert read_state(page)['foods']==before
 with page.expect_response(lambda r:r.url.endswith('/api/recipes/replace'),timeout=120000) as response:page.locator('[data-action=replace-recipe]').first.click()
 result=response.value.json();(artifacts/'replacement.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));assert response.value.status==200,result
 second=result['generation'];assert second['provider']=='deepseek' and len(second['recipes'])==4 and second['recipes'][1:]==first['recipes'][1:] and second['recipes'][0]['title']!=first['recipes'][0]['title'];assert read_state(page)['foods']==before
 expect(page.locator('.recipe-card h2').first).to_have_text(second['recipes'][0]['title']);page.locator('#recipe-content').scroll_into_view_if_needed();page.screenshot(path=str(artifacts/'replacement-phone.png'));page.reload();expect(page.locator('.recipe-card')).to_have_count(4);expect(page.locator('[name=count]')).to_have_value('4');expect(page.locator('[data-recipe-food]')).to_have_count(6);expect(page.locator('[data-action=replace-recipe]').first).to_be_enabled();assert not errors,errors
 b.close()
print('PASS: real DeepSeek produces exactly four stock-only dishes covering six selected batches; one replacement preserves all other dishes, settings and stock; phone controls/history survive reload.')
