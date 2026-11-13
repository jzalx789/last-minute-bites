"""Bilingual kitchen naming, exact-name feedback and consent button labels."""
import os
import uuid
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from browser_smoke import launch_browser, register, navigate, click, set_stock, read_state

base = os.getenv('LMB_WEB_BASE_URL', 'http://127.0.0.1:8790')
assert base.startswith('http://127.0.0.1:')
artifacts = Path(__file__).resolve().parents[1] / 'artifacts/kitchen-settings'
artifacts.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = launch_browser(p)
    page = browser.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    errors, clears = [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('request', lambda request: clears.append(request.url) if request.url.endswith('/api/kitchen/clear') else None)
    register(page, base, 'settings-ui-' + uuid.uuid4().hex + '@example.test')
    page.locator('[data-form=create-kitchen] [name=name]').fill('Original kitchen')
    page.locator('[data-form=create-kitchen] button').click()
    expect(page.locator('.kitchen-name')).to_be_visible()
    click(page, 'add')
    page.locator('[name=name]').fill('Egg')
    set_stock(page, 2)
    page.locator('[data-form=food] button.primary').click()
    expect(page.locator('.kitchen-name')).to_be_visible()
    before = read_state(page)

    navigate(page, 'settings')
    page.locator('details:has([data-form=rename-kitchen]) summary').click()
    form = page.locator('[data-form=rename-kitchen]')
    form.locator('[name=name]').fill('試用冰箱 08')
    form.locator('button').click()
    expect(page.locator('[data-path=kitchens]').last).to_be_visible()
    page.wait_for_function('state.kitchen.name === "試用冰箱 08"')
    renamed = read_state(page)
    assert renamed['kitchen']['id'] == before['kitchen']['id']
    assert renamed['foods'][0]['id'] == before['foods'][0]['id']
    assert renamed['foods'][0]['quantity'] == 2
    assert renamed['members'] == before['members']
    page.reload()
    expect(page.locator('#main')).to_contain_text('試用冰箱 08')

    click(page, 'clear-kitchen')
    expect(page.locator('#confirm-input-label')).to_contain_text('試用冰箱 08')
    page.locator('#confirm-input').fill('試用冰箱08')
    page.locator('#confirm-yes').click()
    expect(page.locator('#confirm')).to_be_visible()
    expect(page.locator('#confirm-error')).to_contain_text('including spaces')
    assert not clears and read_state(page)['foods'][0]['quantity'] == 2
    page.locator('#confirm-cancel').click()
    expect(page.locator('#confirm')).not_to_be_visible()

    # Chinese, large text, and a short phone viewport retain actionable feedback.
    page.evaluate('async()=>{await api("preferences",{language:"zh-Hant",text_size:"large"});await refresh();}')
    page.set_viewport_size({'width': 320, 'height': 560})
    click(page, 'clear-kitchen')
    expect(page.locator('#confirm-error')).to_be_empty()
    page.locator('#confirm-input').fill('試用冰箱08')
    page.locator('#confirm-yes').click()
    expect(page.locator('#confirm-error')).to_contain_text('保留空格')
    assert page.locator('#confirm').evaluate('e=>e.scrollWidth<=e.clientWidth+1')
    page.screenshot(path=str(artifacts / 'name-mismatch-zh.png'))
    assert not clears
    page.locator('#confirm-input').fill('試用冰箱 08')
    page.locator('#confirm-yes').click()
    page.wait_for_function('state.foods.length === 0')
    assert len(clears) == 1 and read_state(page)['foods'] == []

    # Exercise the same photo-consent gate without sending any photo or AI call.
    page.evaluate('async()=>{const result=await api("privacy",{ai_photo:false});state.consent=result.consent;}')
    page.evaluate('void ensureAI("photo")')
    expect(page.locator('#confirm-yes')).to_have_text('是')
    expect(page.locator('#confirm-message')).to_contain_text('DeepSeek')
    page.locator('#confirm-cancel').click()
    page.wait_for_function('!document.querySelector("#confirm").open')
    assert not read_state(page)['consent']['ai_photo']
    assert not errors, errors
    browser.close()
print('PASS: persistent owner rename preserves stock/members; bilingual exact-name feedback keeps the dialog open, cancel preserves stock, only the corrected name clears once, and photo consent says Yes/是.')
