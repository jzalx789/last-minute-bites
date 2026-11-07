"""Opt-in paid-provider smoke test. Uses one public food photo and synthetic food records.
Run explicitly with LMB_LIVE_AI=1 and LMB_TEST_FOOD_PHOTO pointing to an inspected photo.
No fixture responses or TLS bypasses are used.
"""
import json,os,sys,uuid
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
sys.path.insert(0,str(Path(__file__).resolve().parent))
from browser_smoke import click,navigate,register,read_state
if os.getenv('LMB_LIVE_AI')!='1':
    raise SystemExit('Set LMB_LIVE_AI=1 to explicitly enable two real provider requests.')
photo=Path(os.environ['LMB_TEST_FOOD_PHOTO']);assert photo.is_file()
base=os.environ['LMB_WEB_BASE_URL']
artifacts=Path(__file__).resolve().parents[1]/'artifacts/live-ai';artifacts.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
    browser=p.webkit.launch(executable_path=os.getenv('LMB_TEST_WEBKIT_EXECUTABLE',p.webkit.executable_path),headless=True) if os.getenv('LMB_WEB_ENGINE')=='webkit' else p.chromium.launch(executable_path=os.getenv('LMB_TEST_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
    page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    register(page,base,'live-ai-'+uuid.uuid4().hex[:10]+'@example.test')
    page.locator('[data-form=create-kitchen] [name=name]').fill('Live AI synthetic test');page.locator('[data-form=create-kitchen] button').click();expect(page.locator('h1')).to_have_text('What’s in your kitchen?')
    navigate(page,'preferences');page.locator('[name=language]').select_option('zh-Hant');page.locator('[data-form=preferences] button').click();expect(page.locator('h1')).to_have_text('個人偏好')
    click(page,'go','[data-path=kitchen]');click(page,'add')
    with page.expect_response(lambda r:r.url.endswith('/api/food/recognize'),timeout=90000) as photo_request:
        page.locator('#food-photo').set_input_files(str(photo))
    response=photo_request.value;recognition=response.json();assert response.status==200,recognition
    assert recognition['provider']=='deepseek' and recognition['model']=='deepseek-flash',recognition
    assert any('番茄' in f['name'] or '蕃茄' in f['name'] for f in recognition['foods']),recognition
    expect(page.locator('.photo-candidates button').first).to_be_visible();assert len(read_state(page)['foods'])==0
    click(page,'photo-fill');expect(page.locator('[name=date_source]')).to_have_value('unknown');page.locator('[data-form=food] button.primary').click();expect(page.locator('h1')).to_have_text('冰箱裡有什麼？')
    for name,category in [('雞蛋','dairy'),('豆腐','protein'),('菠菜','produce')]:
        click(page,'add');page.locator('[name=name]').fill(name);page.locator('[name=category]').select_option(category);page.locator('[data-form=food] button.primary').click();expect(page.locator('h1')).to_have_text('冰箱裡有什麼？')
    navigate(page,'recipes');page.locator('[name=style]').select_option('mixed');page.locator('[name=count]').select_option('2')
    with page.expect_response(lambda r:r.url.endswith('/api/recipes/generate'),timeout=90000) as recipe_request:
        page.locator('[data-form=ai-recipes] button.primary').click()
    response=recipe_request.value;result=response.json();assert response.status==200,result
    generation=result['generation'];assert generation['provider']=='deepseek' and generation['model']=='deepseek-flash'
    assert len(generation['recipes'])==2 and len({r['kind'] for r in generation['recipes']})==2,generation
    assert len(read_state(page)['foods'])==4 and all(f['status']=='active' for f in read_state(page)['foods'])
    expect(page.locator('.recipe-card')).to_have_count(2);page.locator('.recipe-card').first.scroll_into_view_if_needed();page.screenshot(path=str(artifacts/'real-deepseek-two-dishes.png'))
    click(page,'recipe-detail');expect(page.locator('.recipe-detail')).to_be_visible();assert page.locator('[data-form=ai-recipes]').count()==0
    page.screenshot(path=str(artifacts/'real-deepseek-recipe-detail.png'))
    click(page,'cooked-recipe');expect(page.locator('#used-picker')).to_be_visible();page.locator('#used-foods input').first.check();page.locator('#used-confirm').click();expect(page.locator('#used-picker')).not_to_be_visible()
    page.wait_for_function('async()=>{const s=await(await fetch("/api/state")).json();return s.foods.filter(f=>f.status==="used").length===1}')
    assert len(read_state(page)['foods'])==4
    navigate(page,'category/all');expect(page.locator('.food-row')).to_have_count(3)
    page.locator('#inventory-status').select_option('used');expect(page.locator('.food-row')).to_have_count(1)
    assert errors==[],errors
    (artifacts/'provider-result.json').write_text(json.dumps({'recognition':recognition,'generation':generation},ensure_ascii=False,indent=2))
    print('PASS: real DeepSeek image recognition (tomatoes), Traditional Chinese complementary dishes, 390px WebKit UI, explicit cooking confirmation and exactly one used record.')
    print('Generated dishes:', ' / '.join(r['title'] for r in generation['recipes']))
    browser.close()
