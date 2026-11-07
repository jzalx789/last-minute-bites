"""Opt-in paid-provider smoke test. Uses one public food photo and synthetic food records.
Run explicitly with LMB_LIVE_AI=1 and LMB_TEST_FOOD_PHOTO pointing to an inspected photo.
No fixture responses or TLS bypasses are used.
"""
import json,os,sys,uuid
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
sys.path.insert(0,str(Path(__file__).resolve().parent))
from browser_smoke import set_stock,click,navigate,register,read_state
if os.getenv('LMB_LIVE_AI')!='1':
    raise SystemExit('Set LMB_LIVE_AI=1 to explicitly enable four real AI flows (recipes permit one correction).')
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
    click(page,'photo-fill');expect(page.locator('[name=date_source]')).to_have_value('unknown');set_stock(page,3);page.locator('[data-form=food] button.primary').click();expect(page.locator('h1')).to_have_text('冰箱裡有什麼？')
    for name,category,quantity,unit in [('雞蛋','dairy',6,'pcs'),('豆腐','protein',1,'box'),('菠菜','produce',300,'g')]:
        click(page,'add');page.locator('[name=name]').fill(name);page.locator('[name=category]').select_option(category);set_stock(page,quantity,unit);page.locator('[data-form=food] button.primary').click();expect(page.locator('h1')).to_have_text('冰箱裡有什麼？')
    navigate(page,'recipes');page.locator('[name=mode]').select_option('plan');page.locator('[name=servings]').fill('4');page.locator('[name=portion]').select_option('hearty');page.locator('[name=style]').select_option('mixed');page.locator('[name=count]').select_option('2');page.locator('.recipe-preferences summary').click();page.locator('[name=max_minutes]').select_option('30');page.locator('[name=preference]').fill('粵式、清淡')
    with page.expect_response(lambda r:r.url.endswith('/api/recipes/generate'),timeout=90000) as recipe_request:
        page.locator('[data-form=ai-recipes] button.primary').click()
    response=recipe_request.value;result=response.json();assert response.status==200,result
    generation=result['generation'];assert generation['provider']=='deepseek' and generation['model']=='deepseek-flash'
    assert len(generation['recipes'])==2 and len({r['kind'] for r in generation['recipes']})==2,generation
    assert len(read_state(page)['foods'])==4 and all(f['status']=='active' for f in read_state(page)['foods']);assert generation['options']['servings']==4 and generation['options']['portion']=='hearty';assert all(r['servings']==4 and r['minutes']<=30 for r in generation['recipes']);assert any(r['additional'] for r in generation['recipes'])
    expect(page.locator('.recipe-card')).to_have_count(2);page.locator('.recipe-card').first.scroll_into_view_if_needed();page.screenshot(path=str(artifacts/'real-deepseek-two-dishes.png'))
    click(page,'recipe-detail');expect(page.locator('.recipe-detail')).to_be_visible();assert page.locator('[data-form=ai-recipes]').count()==0
    page.screenshot(path=str(artifacts/'real-deepseek-recipe-detail.png'))
    # Confirm an actual partial amount; never deduct the model suggestion automatically.
    before=read_state(page)['foods']
    click(page,'cooked-recipe');expect(page.locator('#used-picker')).to_be_visible();row=page.locator('.consume-item').first;food_id=int(row.get_attribute('data-id'));food=next(f for f in before if f['id']==food_id);used=min(1,food['quantity']/2)
    row.locator('[data-consume-select]').check();row.locator('[data-consume-amount]').fill(str(used));page.locator('#used-confirm').click();expect(page.locator('#used-picker')).not_to_be_visible()
    after=read_state(page)['foods'];assert all(f['status']=='active' for f in after)
    assert next(f for f in after if f['id']==food_id)['quantity']==food['quantity']-used
    assert all(f['quantity']==next(a for a in after if a['id']==f['id'])['quantity'] for f in before if f['id']!=food_id)
    navigate(page,'category/all');expect(page.locator('.food-row')).to_have_count(4)
    context.storage_state(path=str(Path(__file__).resolve().parents[1]/'.data/live-v5-test-state.json'))
    # Real stock-only inference: no hidden shopping items or unrecorded staples.
    navigate(page,'recipes');page.locator('[name=mode]').select_option('use_up')
    with page.expect_response(lambda r:r.url.endswith('/api/recipes/generate'),timeout=90000) as cleanup_request:
        page.locator('[data-form=ai-recipes] button.primary').click()
    response=cleanup_request.value;cleanup=response.json();(artifacts/'cleanup-result.json').write_text(json.dumps({'status':response.status,'body':cleanup},ensure_ascii=False,indent=2));assert response.status==200,cleanup
    assert cleanup['generation']['options']['mode']=='use_up' and all(not r['additional'] for r in cleanup['generation']['recipes'])
    expect(page.locator('.shopping-list')).to_have_count(0)
    # Planning a new dish with an empty kitchen remains possible.
    empty_context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
    empty=empty_context.new_page();register(empty,base,'empty-plan-'+uuid.uuid4().hex[:10]+'@example.test')
    empty.locator('[data-form=create-kitchen] [name=name]').fill('Empty planning kitchen');empty.locator('[data-form=create-kitchen] button').click();expect(empty.locator('h1')).to_have_text('What’s in your kitchen?')
    navigate(empty,'recipes');empty.locator('[name=mode]').select_option('plan');empty.locator('[name=count]').select_option('1');empty.locator('[name=style]').select_option('soup');empty.locator('[name=servings]').fill('3');empty.locator('[name=portion]').select_option('light')
    with empty.expect_response(lambda r:r.url.endswith('/api/recipes/generate'),timeout=90000) as empty_request:
        empty.locator('[data-form=ai-recipes] button.primary').click()
    response=empty_request.value;planned=response.json();assert response.status==200,planned
    assert len(planned['generation']['recipes'])==1 and planned['generation']['recipes'][0]['servings']==3 and not planned['generation']['recipes'][0]['uses'] and planned['generation']['recipes'][0]['additional']
    expect(empty.locator('.shopping-list')).to_be_visible();assert read_state(empty)['foods']==[]
    empty.screenshot(path=str(artifacts/'real-empty-kitchen-shopping-plan.png'))
    assert errors==[],errors
    (artifacts/'provider-result.json').write_text(json.dumps({'recognition':recognition,'generation':generation,'cleanup':cleanup['generation'],'empty_plan':planned['generation']},ensure_ascii=False,indent=2))
    print('PASS: real DeepSeek vision, 4-person hearty meal with stock limits/shopping, actual partial consumption, stock-only cleanup, and 3-person light soup shopping plan with an empty kitchen.')
    print('Generated dishes:', ' / '.join(r['title'] for r in generation['recipes']))
    browser.close()
