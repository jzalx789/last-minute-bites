"""Opt-in real text/image identification against the deployed site, synthetic account only."""
import os,sys,uuid,json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
sys.path.insert(0,str(Path(__file__).resolve().parent))
from browser_smoke import register,navigate,click,set_stock,read_state,request
if os.getenv('LMB_LIVE_FOOD')!='1':raise SystemExit('Set LMB_LIVE_FOOD=1 to enable two text and two image provider flows.')
base=os.environ['LMB_WEB_BASE_URL'];photo=Path(os.environ['LMB_TEST_FOOD_PHOTO']);screen=Path(os.environ['LMB_TEST_NONFOOD_IMAGE']);assert photo.is_file() and screen.is_file()
artifacts=Path(__file__).resolve().parents[1]/'artifacts/live-classification';artifacts.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.webkit.launch(executable_path=os.getenv('LMB_TEST_WEBKIT_EXECUTABLE',p.webkit.executable_path),headless=True);page=b.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 register(page,base,'live-identify-'+uuid.uuid4().hex[:10]+'@example.test');page.locator('[data-form=create-kitchen] [name=name]').fill('Live food classification');page.locator('[data-form=create-kitchen] button').click();expect(page.locator('h1')).to_have_text('What’s in your kitchen?')
 click(page,'add')
 with page.expect_response(lambda r:r.url.endswith('/api/food/classify') and r.request.post_data_json.get('name')=='Skyr' and r.request.post_data_json.get('allow_ai') is True,timeout=45000) as response:
  page.locator('[name=name]').fill('Skyr');set_stock(page,2,'box')
 assessment=response.value.json();assert response.value.status==200 and assessment['assessment']['status']=='food' and assessment['assessment']['category']=='dairy' and assessment['assessment']['source']=='deepseek',assessment
 expect(page.locator('[name=category]')).to_have_value('dairy');expect(page.locator('#food-confirmation')).not_to_be_visible();page.locator('[data-form=food] button.primary').click();expect(page.locator('h1')).to_have_text('What’s in your kitchen?')
 assert read_state(page)['foods'][0]['category']=='dairy'
 click(page,'add')
 with page.expect_response(lambda r:r.url.endswith('/api/food/classify') and r.request.post_data_json.get('name')=='榫卯夾具' and r.request.post_data_json.get('allow_ai') is True,timeout=45000) as response:
  page.locator('[name=name]').fill('榫卯夾具');set_stock(page,1)
 rejected=response.value.json();(artifacts/'name-results.json').write_text(json.dumps(dict(food=assessment,non_food=rejected),ensure_ascii=False,indent=2));assert rejected['assessment']['status']=='non_food' and rejected['assessment']['source']=='deepseek',rejected
 expect(page.locator('[data-form=food] button.primary')).to_be_disabled()
 forged=request(page,'food/create',dict(name='榫卯夾具',date_source='unknown',category='produce',food_confirmed=True));assert forged['status']==422 and forged['body']['error']['code']=='not_food'
 assert len(read_state(page)['foods'])==1
 navigate(page,'kitchen');click(page,'add')
 with page.expect_response(lambda r:r.url.endswith('/api/food/recognize'),timeout=90000) as response:page.locator('#food-photo').set_input_files(str(photo))
 vision=response.value.json();assert response.value.status==200 and vision['provider']=='deepseek' and vision['foods'],vision
 expect(page.locator('.photo-candidates button').first).to_be_visible();click(page,'photo-fill');set_stock(page,3);expect(page.locator('[name=category]')).to_have_value('produce');page.locator('[data-form=food] button.primary').click();expect(page.locator('h1')).to_have_text('What’s in your kitchen?')
 assert len(read_state(page)['foods'])==2
 navigate(page,'kitchen');click(page,'add')
 with page.expect_response(lambda r:r.url.endswith('/api/food/recognize'),timeout=90000) as response:page.locator('#food-photo').set_input_files(str(screen))
 no_food=response.value.json();assert response.value.status==200 and no_food['foods']==[],no_food
 expect(page.locator('.photo-candidates button')).to_have_count(0);assert len(read_state(page)['foods'])==2
 page.screenshot(path=str(artifacts/'nonfood-image-no-candidates.png'))
 assert not errors,errors
 (artifacts/'results.json').write_text(json.dumps(dict(food=assessment,non_food=rejected,photo=vision,nonfood_image=no_food),ensure_ascii=False,indent=2))
 b.close()
print('PASS: real DeepSeek auto-classifies Skyr as dairy, blocks an uncommon non-food tool in UI/API, classifies a tomato photo without manual category selection, and returns no food candidates for a screen image; only confirmed food records are saved.')
