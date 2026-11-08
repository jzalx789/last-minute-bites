"""Browser regression for purchase batches, actual consumption, and recipe goals.
Uses test-only FoodAI fixtures by default; live inference is a separate opt-in test.
"""
import os,sys,uuid
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
sys.path.insert(0,str(Path(__file__).resolve().parent))
from browser_smoke import set_stock,click,navigate,register,confirm,read_state
base=os.getenv('LMB_WEB_BASE_URL','http://127.0.0.1:8790')
assert base.startswith('http://127.0.0.1:'), 'Fixture browser tests require the local test-only service; use live_ai_browser.py for explicit real inference.'
artifacts=Path(__file__).resolve().parents[1]/'artifacts/stock';artifacts.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
    browser=p.webkit.launch(executable_path=os.getenv('LMB_TEST_WEBKIT_EXECUTABLE',p.webkit.executable_path),headless=True) if os.getenv('LMB_WEB_ENGINE')=='webkit' else p.chromium.launch(executable_path=os.getenv('LMB_TEST_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':360,'height':640},is_mobile=True,has_touch=True)
    page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    register(page,base,'stock-browser-'+uuid.uuid4().hex[:10]+'@example.test')
    page.locator('[data-form=create-kitchen] [name=name]').fill('Two egg purchases');page.locator('[data-form=create-kitchen] button').click();expect(page.locator('h1')).to_have_text('What’s in your kitchen?')
    for quantity,purchase in [(6,'2026-11-01'),(10,'2026-11-03')]:
        click(page,'add');page.locator('[name=name]').fill('Egg');page.locator('[name=category]').select_option('dairy')
        # New purchases require an explicit amount, rather than silently guessing one.
        page.locator('[data-form=food] button.primary').click();assert page.locator('[name=quantity]').evaluate('(e)=>e.validity.valueMissing')
        set_stock(page,quantity,'pcs',purchase);page.locator('[data-form=food] button.primary').click();expect(page.locator('h1')).to_have_text('What’s in your kitchen?')
    foods=read_state(page)['foods'];first,third=[f['id'] for f in foods]
    navigate(page,'category/all');expect(page.locator('.food-row')).to_have_count(2)
    expect(page.locator('.food-row').first).to_contain_text('2026-11-01')
    row=page.locator(f'[data-food-id="{first}"]');expect(row.locator('.stock-quantity')).to_have_text('Remaining: 6 pcs')
    row.locator('[data-action=row-used]').click();page.locator('[data-consume-amount]').fill('2');expect(page.locator('.consume-remainder')).to_have_text('Left 4 pcs')
    page.locator('#used-cancel').click();assert next(f for f in read_state(page)['foods'] if f['id']==first)['quantity']==6
    row.locator('[data-action=row-used]').click();page.locator('[data-consume-amount]').fill('2');page.locator('#used-confirm').click();expect(page.locator('#used-picker')).not_to_be_visible()
    expect(row.locator('.stock-quantity')).to_have_text('Remaining: 4 pcs');expect(page.locator(f'[data-food-id="{third}"] .stock-quantity')).to_have_text('Remaining: 10 pcs')
    page.screenshot(path=str(artifacts/'two-egg-batches-4-and-10.png'))
    row.locator('[data-action=row-used]').click();page.locator('[data-consume-all]').click();page.locator('#used-confirm').click();expect(page.locator('.food-row')).to_have_count(1)
    page.locator('#inventory-status').select_option('used');expect(page.locator('.stock-quantity')).to_have_text('Remaining: 0 pcs')
    click(page,'row-restore');expect(page.locator('#confirm-message')).to_contain_text('4 pcs');confirm(page);expect(page.locator('.food-row')).to_have_count(0)
    page.locator('#inventory-status').select_option('active');expect(page.locator('.food-row')).to_have_count(2)
    click(page,'add');page.locator('[name=name]').fill('Milk');page.locator('[name=category]').select_option('dairy');set_stock(page,.3,'l');page.locator('[data-form=food] button.primary').click();expect(page.locator('h1')).to_have_text('What’s in your kitchen?')
    navigate(page,'category/all');milk=page.locator('.food-row').filter(has_text='Milk');milk.locator('[data-action=row-used]').click();page.locator('[data-consume-amount]').fill('0.1');page.locator('#used-confirm').click();expect(page.locator('#used-picker')).not_to_be_visible();expect(milk.locator('.stock-quantity')).to_have_text('Remaining: 0.2 L')
    milk.locator('[data-action=row-used]').click();page.locator('[data-consume-amount]').fill('0.4');page.locator('#used-confirm').click();expect(page.locator('#used-picker')).to_be_visible();assert page.locator('[data-consume-amount]').evaluate('(e)=>e.validity.rangeOverflow');page.locator('#used-cancel').click()
    navigate(page,'recipes');page.locator('[name=servings]').fill('4');page.locator('[name=portion]').select_option('hearty');page.locator('[name=style]').select_option('mixed');page.locator('.recipe-preferences summary').click();page.locator('[name=max_minutes]').select_option('15');page.locator('[name=avoid]').fill('milk')
    with page.expect_response(lambda r:r.url.endswith('/api/recipes/generate')) as response:
        page.locator('[data-form=ai-recipes] button.primary').click()
    result=response.value.json();assert response.value.status==200,result
    data=response.value.request.post_data_json;assert data['mode']=='use_up' and data['servings']==4 and data['portion']=='hearty' and data['max_minutes']==15 and data['avoid']=='milk'
    expect(page.locator('.recipe-card')).to_have_count(2);expect(page.locator('.recipe-source').first).to_contain_text('4 servings');expect(page.locator('.shopping-list')).to_have_count(0)
    assert all(not r['additional'] and r['servings']==4 for r in result['generation']['recipes'])
    before=read_state(page)['foods']
    page.locator('[name=mode]').select_option('plan');expect(page.locator('#mode-hint')).to_contain_text('shopping list');page.locator('[name=servings]').fill('3');page.locator('[name=portion]').select_option('light');page.locator('[name=count]').select_option('1');page.locator('[data-form=ai-recipes] button.primary').click()
    expect(page.locator('.recipe-card')).to_have_count(1);expect(page.locator('.shopping-list')).to_contain_text('Potato');expect(page.locator('.recipe-source').first).to_contain_text('3 servings');assert read_state(page)['foods']==before
    page.reload();expect(page.locator('[name=mode]')).to_have_value('plan');expect(page.locator('[name=servings]')).to_have_value('3');expect(page.locator('[name=portion]')).to_have_value('light');expect(page.locator('[name=count]')).to_have_value('1')
    # All controls and batch rows remain reachable with large text on a narrow screen.
    navigate(page,'preferences');page.locator('[name=language]').select_option('zh-Hant');page.locator('[name=text_size]').select_option('large');page.locator('[data-form=preferences] button').click();expect(page.locator('h1')).to_have_text('個人偏好')
    for route in ['food','category/all','recipes']:
        navigate(page,route);assert page.locator('#main').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
    page.screenshot(path=str(artifacts/'custom-goals-people-portions-phone.png'))
    navigate(page,'category/all');page.locator(f'[data-food-id="{first}"] [data-action=row-used]').click();expect(page.locator('#used-picker')).to_be_visible();assert page.locator('#used-picker').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1');page.locator('[data-consume-amount]').fill('1');page.locator('[data-consume-amount]').scroll_into_view_if_needed();button=page.locator('#used-confirm').bounding_box();dialog=page.locator('#used-picker').bounding_box();assert button['y']+button['height'] <= dialog['y']+dialog['height'];page.screenshot(path=str(artifacts/'partial-consumption-phone.png'));page.locator('#used-cancel').click()
    assert not errors,errors
    browser.close()
print('PASS: two egg purchase batches (6/10 -> 4/10), explicit quantities, partial consumption/cancel, full use and exact restore, decimal limits, 4-person hearty stock cleanup vs 3-person light meal plan and shopping list, and narrow/large-text UI.')
