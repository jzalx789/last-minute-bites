"""Browser acceptance against the actual Cloudflare web API, locally or deployed."""
import os
from pathlib import Path
import sys
import uuid
from playwright.sync_api import sync_playwright,expect
sys.path.insert(0,str(Path(__file__).resolve().parent))
from browser_smoke import launch_browser,set_stock,click,navigate,register,confirm

base=os.getenv('LMB_WEB_BASE_URL','http://127.0.0.1:8787')
artifacts=Path(__file__).resolve().parents[1]/'artifacts/web';artifacts.mkdir(parents=True,exist_ok=True)
errors=[]
with sync_playwright() as p:
    browser=launch_browser(p)
    context=browser.new_context(viewport={'width':1365,'height':900})
    page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
    prefix='browser-'+uuid.uuid4().hex[:10]
    register(page,base,prefix+'-owner@example.test')
    page.locator('[data-form=create-kitchen] [name=name]').fill('Browser demo kitchen')
    page.locator('[data-form=create-kitchen] button').click();expect(page.locator('h1')).to_have_text('What’s in your kitchen?')
    click(page,'add');page.locator('[name=name]').fill('Tomato');page.locator('[name=category]').select_option('produce');set_stock(page);page.locator('[data-form=food] button.primary').click();expect(page.locator('h1')).to_have_text('What’s in your kitchen?')
    click(page,'add');page.locator('[name=name]').fill('Egg');page.locator('[name=category]').select_option('dairy');set_stock(page);page.locator('[data-form=food] button.primary').click();expect(page.locator('h1')).to_have_text('What’s in your kitchen?')
    page.screenshot(path=str(artifacts/'kitchen-desktop.png'),full_page=True)
    click(page,'category','[data-category=produce]');page.locator('[data-select]').check();click(page,'go','[data-path=kitchen]');click(page,'category','[data-category=dairy]');page.locator('[data-select]').check()
    click(page,'find-recipes');expect(page.locator('[data-form=ai-recipes]')).to_be_visible();expect(page.locator('[name=scope]')).to_have_value('selected');expect(page.locator('[name=count]')).to_have_value('2')
    expect(page.locator('.recipe-card')).to_have_count(0)  # No automatic paid generation.
    navigate(page,'shared');click(page,'invite');confirm(page);expect(page.locator('#generated-code')).to_be_visible();code=page.locator('#generated-code').input_value()
    second=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);editor=second.new_page();editor.on('pageerror',lambda e:errors.append(str(e)))
    register(editor,base,prefix+'-editor@example.test');editor.locator('[name=code]').fill(code);editor.locator('[data-form=preview-invite] button:not([type=button])').click();expect(editor.locator('.invitation-preview')).to_contain_text('Browser demo kitchen');click(editor,'accept-invite');expect(editor.locator('h1')).to_have_text('What’s in your kitchen?')
    click(editor,'category','[data-category=all]');expect(editor.locator('.food-row')).to_have_count(2);expect(editor.locator('.selection')).to_have_count(0)
    editor.screenshot(path=str(artifacts/'browser-phone.png'),full_page=True)
    assert editor.evaluate('document.documentElement.scrollWidth <= innerWidth')
    navigate(page,'settings');expect(page.locator('[data-action=install]')).to_have_count(0)
    navigate(page,'preferences');expect(page.locator('[name=language]')).to_be_visible();page.locator('[name=language]').select_option('zh-Hant');page.locator('[name=text_size]').select_option('large');page.locator('[data-form=preferences] button').click();expect(page.locator('h1')).to_have_text('個人偏好')
    navigate(page,'shared');click(page,'remove-member');confirm(page);expect(editor.locator('h1')).to_have_text('Make room for good food.',timeout=12000)
    navigate(page,'settings');click(page,'sign-out');expect(page.locator('[data-form=auth]')).to_be_visible();assert errors==[],errors
    browser.close()
print('PASS: actual web backend with desktop/phone browser registration, persisted food, cross-category selection, explicit AI controls, QR invitation, isolated sessions, bilingual preferences, immediate revocation and logout; no installation required.')
