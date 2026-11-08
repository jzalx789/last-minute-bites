"""Regression for user-reported layout, image assist, AI and food-removal flows.
Uses the explicitly test-only local FoodAI binding; paid inference is tested separately.
"""
import os,sys,uuid,tempfile
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright,expect
sys.path.insert(0,str(Path(__file__).resolve().parent))
from browser_smoke import set_stock,click,navigate,register,confirm
base=os.getenv('LMB_WEB_BASE_URL','http://127.0.0.1:8790')
assert base.startswith('http://127.0.0.1:'), 'Fixture browser tests require the local test-only service; use live_ai_browser.py for explicit real inference.'
artifacts=Path(__file__).resolve().parents[1]/'artifacts/fixes';artifacts.mkdir(parents=True,exist_ok=True)
errors=[];generations=[]

def assert_dock_layout(page):
    # Hash navigation and resize can replace the nodes between protocol calls.
    # Read both rectangles in one browser task after a visible layout is ready.
    page.wait_for_function("""() => {
        const main=document.querySelector('#main'), dock=document.querySelector('.app-dock');
        if (!main || !dock) return false;
        const m=main.getBoundingClientRect(), d=dock.getBoundingClientRect();
        return m.height>0 && d.height>0 && m.bottom<=d.top+1;
    }""", timeout=5000)
with tempfile.TemporaryDirectory() as directory,sync_playwright() as p:
    browser=p.webkit.launch(executable_path=os.getenv('LMB_TEST_WEBKIT_EXECUTABLE',p.webkit.executable_path),headless=True) if os.getenv('LMB_WEB_ENGINE')=='webkit' else p.chromium.launch(executable_path=os.getenv('LMB_TEST_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':320,'height':568},is_mobile=True,has_touch=True)
    page=context.new_page();page.on('pageerror',lambda error:errors.append(str(error)));page.on('request',lambda r:generations.append(r.url) if r.url.endswith('/api/recipes/generate') else None)
    register(page,base,'fixes-'+uuid.uuid4().hex[:10]+'@example.test')
    page.locator('[data-form=create-kitchen] [name=name]').fill('PhoneKitchen'+'LongName'*8);page.locator('[data-form=create-kitchen] button').click();expect(page.locator('h1')).to_have_text('What’s in your kitchen?')
    assert 'Shared food refreshes' not in page.locator('#main').inner_text()
    assert 'Categories help you navigate' not in page.locator('#main').inner_text()
    click(page,'add')
    image=Path(directory)/'food.jpg';Image.new('RGB',(1400,900),'red').save(image)
    page.locator('#food-photo').set_input_files(str(image));expect(page.locator('.photo-candidates button')).to_have_count(2,timeout=15000)
    click(page,'photo-fill');expect(page.locator('[name=name]')).to_have_value('Tomato');expect(page.locator('[name=date_source]')).to_have_value('unknown')
    set_stock(page);page.locator('[data-form=food] button.primary').click();expect(page.locator('h1')).to_have_text('What’s in your kitchen?')
    click(page,'add');page.locator('[name=name]').fill('Egg');page.locator('[name=category]').select_option('dairy');set_stock(page);page.locator('[data-form=food] button.primary').click();expect(page.locator('h1')).to_have_text('What’s in your kitchen?')
    navigate(page,'category/all');expect(page.locator('.food-row')).to_have_count(2)
    # Used-up is available directly on the inventory row, before any recipe.
    egg=page.locator('.food-row').filter(has_text='Egg');egg.locator('[data-action=row-used]').click();page.locator('#used-foods [data-consume-all]').click();page.locator('#used-confirm').click();expect(page.locator('.food-row')).to_have_count(1)
    page.locator('#inventory-status').select_option('used');expect(page.locator('.food-row')).to_have_count(1);click(page,'row-restore');confirm(page);expect(page.locator('.food-row')).to_have_count(0)
    page.locator('#inventory-status').select_option('active');expect(page.locator('.food-row')).to_have_count(2)
    # Delete can be cancelled or confirmed without opening a food form/recipe.
    egg=page.locator('.food-row').filter(has_text='Egg');egg.locator('[data-action=row-delete]').click();page.locator('#confirm-cancel').click();expect(page.locator('.food-row')).to_have_count(2)
    egg.locator('[data-action=row-delete]').click();confirm(page);expect(page.locator('.food-row')).to_have_count(1)
    # Selection dock never overlays the scrolling main panel.
    page.locator('[data-select]').check();expect(page.locator('.selection')).to_be_visible()
    assert_dock_layout(page)
    click(page,'find-recipes');expect(page.locator('[data-form=ai-recipes]')).to_be_visible();assert len(generations)==0
    page.locator('[name=style]').select_option('mixed');page.locator('[name=count]').select_option('2');page.locator('[data-form=ai-recipes] button.primary').click();expect(page.locator('.recipe-card')).to_have_count(2,timeout=15000)
    page.wait_for_timeout(5300);assert len(generations)==1,'Polling unexpectedly made a paid AI generation request'
    # A rejected provider response keeps both the previous result and the controls.
    page.locator('.recipe-preferences summary').click();page.locator('[name=preference]').fill('__test_invalid__');page.locator('[data-form=ai-recipes] button.primary').click()
    expect(page.locator('[data-form=ai-recipes] .error')).not_to_be_empty();expect(page.locator('.recipe-card')).to_have_count(2);expect(page.locator('[data-form=ai-recipes] button.primary')).to_be_enabled()
    click(page,'recipe-detail');expect(page.locator('.recipe-detail')).to_be_visible();click(page,'cooked-recipe');expect(page.locator('#used-picker')).to_be_visible();page.locator('#used-foods [data-consume-all]').first.click();page.locator('#used-confirm').click();expect(page.locator('#used-picker')).not_to_be_visible()
    navigate(page,'category/all');expect(page.locator('.food-row')).to_have_count(0)
    # Current and used records have distinct, clear places.
    page.locator('#inventory-status').select_option('used');expect(page.locator('.food-row')).to_have_count(1)
    click(page,'row-restore');confirm(page);page.locator('#inventory-status').select_option('active');expect(page.locator('.food-row')).to_have_count(1)
    # Background refresh must preserve main-scroll position.
    navigate(page,'food');expect(page.locator('[data-form=food]')).to_be_visible()
    page.locator('[name=name]').fill('Unsaved draft');page.locator('[data-form=food] button.primary').scroll_into_view_if_needed()
    point=page.locator('[data-form=food] button.primary').bounding_box();assert point['y']+point['height'] <= page.locator('.app-dock').bounding_box()['y']+1
    expect(page.locator('[name=name]')).to_have_value('Unsaved draft')
    # Folding/unfolding and split-window resize preserve the same live draft.
    page.locator('[name=quantity]').fill('6');note=page.locator('[name=note]');note.fill('Keep this draft')
    note.evaluate('(e)=>e.setSelectionRange(4,4)')
    for width,height in [(344,882),(717,512),(540,720)]:
        page.set_viewport_size({'width':width,'height':height})
        expect(page.locator('[name=name]')).to_have_value('Unsaved draft')
        expect(page.locator('[name=quantity]')).to_have_value('6')
        expect(note).to_have_value('Keep this draft');expect(note).to_be_focused()
        assert note.evaluate('(e)=>e.selectionStart===4')
    # Keyboard-size viewports, large text, landscape, and ordinary phone/desktop sizes.
    for width,height in [(280,653),(320,480),(360,640),(390,844),(540,720),(717,512),(844,390),(768,1024),(1365,900)]:
        page.set_viewport_size({'width':width,'height':height})
        for route in ['kitchen','category/all','food','recipes','settings','shared','preferences','reminders','help']:
            navigate(page,route);expect(page.locator('#main')).to_be_visible()
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),(width,height,route,'document overflow')
            if not page.locator('#main').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1'):
                page.screenshot(path=str(artifacts/'overflow-debug.png'))
                print(page.locator('#main').evaluate('(e)=>({width:e.clientWidth,scroll:e.scrollWidth,children:[...e.querySelectorAll("*")].filter(c=>c.getBoundingClientRect().right>e.getBoundingClientRect().right+1).map(c=>({tag:c.tagName,classes:c.className,width:c.getBoundingClientRect().width,right:c.getBoundingClientRect().right,text:c.textContent.slice(0,90)}))})'))
                raise AssertionError((width,height,route,'main overflow'))
            assert_dock_layout(page)
    page.set_viewport_size({'width':360,'height':640});navigate(page,'preferences');page.locator('[name=text_size]').select_option('large');page.locator('[name=language]').select_option('zh-Hant');page.locator('[data-form=preferences] button').click();expect(page.locator('h1')).to_have_text('個人偏好')
    navigate(page,'category/all');expect(page.locator('.food-row')).to_have_count(1)
    assert page.locator('#main').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
    # Large-text landscape must retain enough space to scroll and select stock.
    for width,height in [(320,568),(667,375),(568,320)]:
        page.set_viewport_size({'width':width,'height':height})
        navigate(page,'category/all');expect(page.locator('[data-select]')).to_have_count(1)
        page.locator('[data-select]').check();expect(page.locator('.selection')).to_be_visible()
        page.wait_for_function("() => document.querySelector('#main').clientHeight>=80")
        assert_dock_layout(page)
        click(page,'batch-used');expect(page.locator('#used-picker')).to_be_visible()
        assert page.locator('#used-foods').evaluate('(e)=>e.clientHeight>=30')
        assert page.locator('#used-confirm').evaluate('(e)=>e.getBoundingClientRect().bottom<=innerHeight+1')
        page.locator('#used-cancel').click();click(page,'clear-selection')
    page.set_viewport_size({'width':280,'height':653})
    for route in ['recipes','food','category/all','shared']:
        navigate(page,route);expect(page.locator('#main')).to_be_visible()
        assert page.locator('#main').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1'),('large narrow cover screen',route)
    page.set_viewport_size({'width':360,'height':640});navigate(page,'category/all')
    page.screenshot(path=str(artifacts/'phone-large-inventory.png'))
    navigate(page,'food');page.locator('[data-form=food] button.primary').scroll_into_view_if_needed();page.screenshot(path=str(artifacts/'phone-food-form-bottom.png'))
    assert errors==[],errors
    browser.close()
print('PASS: 320px/short/landscape/large-text layouts, no footer overlays, removed copy, photo confirmation, independent use/delete/restore, explicit 1–2 AI dishes without polling calls, and cooking-confirmed removal.')
