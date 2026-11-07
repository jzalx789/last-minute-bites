"""Real-browser acceptance checks. Optional dependency: Playwright + Chromium."""
from pathlib import Path
import os
import sys
import tempfile
import threading
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from server import AppServer
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / 'artifacts'
ARTIFACTS.mkdir(exist_ok=True)


def click(page, action, extra=''):
    page.locator(f'[data-action="{action}"]{extra}').first.click()


def navigate(page, route):
    page.evaluate('(route) => { location.hash=route; }', route)
    page.wait_for_function('(route) => location.hash === "#"+route', arg=route)


def register(page, base, email):
    page.goto(base)
    click(page, 'auth-register')
    page.locator('[name=email]').fill(email)
    page.locator('[name=password]').fill('browser-test-password')
    page.locator('[name=confirm_password]').fill('browser-test-password')
    page.locator('[data-form=auth] button.primary').click()
    expect(page.locator('h1')).to_have_text('Make room for good food.')


def set_stock(page, quantity=1, unit='pcs', purchased_date=None):
    page.locator('[data-form=food] [name=quantity]').fill(str(quantity))
    page.locator('[data-form=food] [name=unit]').select_option(unit)
    if purchased_date is not None:
        page.locator('[data-form=food] [name=purchased_date]').fill(purchased_date)


def request(page, path, data):
    return page.evaluate('async ([path,data]) => {const s=await (await fetch("/api/state")).json(); const r=await fetch("/api/"+path,{method:"POST",headers:{"Content-Type":"application/json","X-CSRF-Token":s.csrf},body:JSON.stringify(data)});return {status:r.status, body:await r.json()};}', [path,data])


def read_state(page):
    return page.evaluate('async () => (await fetch("/api/state")).json()')


def confirm(page):
    expect(page.locator('#confirm')).to_be_visible()
    page.locator('#confirm-yes').click()


def run():
    errors=[]
    with tempfile.TemporaryDirectory(prefix='lmb-browser-') as temp:
        server=AppServer(('127.0.0.1',0), Path(temp)/'test.sqlite3')
        thread=threading.Thread(target=server.serve_forever,daemon=True)
        thread.start()
        base=f'http://127.0.0.1:{server.server_port}'
        try:
            with sync_playwright() as p:
                browser=p.chromium.launch(executable_path=os.getenv('LMB_TEST_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
                ctx=browser.new_context(viewport={'width':1280,'height':950},timezone_id='Asia/Hong_Kong')
                owner=ctx.new_page()
                owner.on('pageerror',lambda e:errors.append(str(e)))
                register(owner,base,'owner@example.test')
                owner.locator('[data-form=create-kitchen] [name=name]').fill('Little green kitchen')
                owner.locator('[data-form=create-kitchen] button').click()
                expect(owner.locator('h1')).to_have_text('What’s in your kitchen?')
                expect(owner.locator('.fridge-category')).to_have_count(7)
                owner.screenshot(path=str(ARTIFACTS/'kitchen-desktop.png'),full_page=True)
                # Category-prefilled add form, exact alias mapping, and printed use-by date.
                click(owner,'category','[data-category=produce]')
                click(owner,'add')
                expect(owner.locator('[name=category]')).to_have_value('produce')
                owner.locator('[name=name]').fill('Tomato')
                click(owner,'clear-selection')
                expect(owner.locator('[name=name]')).to_have_value('Tomato')
                owner.locator('[name=date_source]').select_option('printed')
                expect(owner.locator('[name=ingredient]')).to_have_value('tomato')
                owner.locator('[name=date_kind]').select_option('use_by')
                today=read_state(owner)['today']
                owner.locator('[name=effective_date]').fill(today)
                owner.locator('[data-form=food] button.primary').click()
                expect(owner.locator('h1')).to_have_text('What’s in your kitchen?')
                # Production-date calendar math with explicit confirmation.
                click(owner,'add')
                owner.locator('[name=name]').fill('Egg')
                owner.locator('[name=date_source]').select_option('production')
                owner.locator('[name=category]').select_option('dairy')
                owner.locator('[name=production_date]').fill('2024-01-31')
                owner.locator('[name=shelf_life]').fill('1')
                owner.locator('[name=shelf_unit]').select_option('months')
                click(owner,'calculate')
                expect(owner.locator('#calculation-result')).to_contain_text('2024-02-29')
                owner.locator('[name=date_confirmed]').check()
                owner.locator('[data-form=food] button.primary').click()
                expect(owner.locator('h1')).to_have_text('What’s in your kitchen?')
                # Cross-category selection, recipes, return and reload persistence.
                click(owner,'category','[data-category=produce]')
                owner.locator('[data-select]').check()
                click(owner,'go','[data-path=kitchen]')
                click(owner,'category','[data-category=dairy]')
                owner.locator('[data-select]').check()
                expect(owner.locator('#selected-count')).to_have_text('2')
                click(owner,'find-recipes')
                expect(owner.locator('.recipe-card').first).to_contain_text('Tomato & egg rice')
                click(owner,'recipe-detail')
                expect(owner.locator('.recipe-detail')).to_contain_text('Tomato')
                click(owner,'go','[data-path=recipes]')
                expect(owner.locator('#selected-count')).to_have_text('2')
                owner.reload()
                expect(owner.locator('#selected-count')).to_have_text('2')
                # Invitation via UI and a distinct browser session.
                click(owner,'go','[data-path=settings]')
                click(owner,'go','[data-path=shared]')
                click(owner,'invite')
                confirm(owner)
                expect(owner.locator('#generated-code')).to_be_visible()
                code=owner.locator('#generated-code').input_value()
                editor_ctx=browser.new_context(viewport={'width':390,'height':844})
                editor=editor_ctx.new_page()
                editor.on('pageerror',lambda e:errors.append(str(e)))
                register(editor,base,'editor@example.test')
                editor.locator('[name=code]').fill(code)
                editor.locator('[data-form=preview-invite] button:not([type=button])').click()
                expect(editor.locator('.invitation-preview')).to_contain_text('Little green kitchen')
                click(editor,'accept-invite')
                expect(editor.locator('h1')).to_have_text('What’s in your kitchen?')
                expect(editor.locator('#selected-count')).to_have_text('0')
                editor.screenshot(path=str(ARTIFACTS/'kitchen-mobile.png'),full_page=True)
                assert editor.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Mobile horizontal overflow'
                # Third account sees neither the shared name nor food.
                outsider_ctx=browser.new_context()
                outsider=outsider_ctx.new_page()
                register(outsider,base,'outsider@example.test')
                assert read_state(outsider)['foods']==[]
                # Editor direct management request is refused.
                assert request(editor,'kitchen/clear',{'confirmed':True,'kitchen_name':'Little green kitchen'})['status']==403
                # Optimistic conflict preserves typed input; reload explicitly discards it.
                navigate(owner,'category/all')
                expect(owner.locator('.food-row')).to_have_count(2)
                click(owner,'edit')
                food_id=int(owner.locator('[data-form=food]').get_attribute('data-id'))
                owner.locator('[name=name]').fill('My unsaved edit')
                food=next(f for f in read_state(editor)['foods'] if f['id']==food_id)
                assert request(editor,'food/update',dict(food,name='Roommate update',date_confirmed=True))['status']==200
                owner.locator('[data-form=food] button.primary').click()
                expect(owner.locator('form .error')).to_contain_text('Someone changed this record')
                expect(owner.locator('[name=name]')).to_have_value('My unsaved edit')
                click(owner,'reload-record')
                confirm(owner)
                expect(owner.locator('[name=name]')).to_have_value('Roommate update')
                # Request failures retain inputs without a success message.
                owner.locator('[name=name]').fill('Kept on network failure')
                owner.route('**/api/food/update',lambda route:route.abort())
                owner.locator('[data-form=food] button.primary').click()
                expect(owner.locator('form .error')).to_contain_text('Could not connect')
                expect(owner.locator('[name=name]')).to_have_value('Kept on network failure')
                owner.unroute('**/api/food/update')
                # Cancel delete and mark-used remain separate behaviors.
                click(owner,'delete-food')
                owner.locator('#confirm-cancel').click()
                assert len(read_state(owner)['foods'])==2
                click(owner,'mark-used')
                confirm(owner)
                expect(owner.locator('h1')).to_have_text('What’s in your kitchen?')
                expect(owner.locator('#selected-count')).to_have_text('1')
                assert len(read_state(owner)['foods'])==2
                # Literal markup is rendered as text, never inserted as DOM.
                click(owner,'add')
                payload='<img src=x onerror="window.injected=1">'
                owner.locator('[name=name]').fill(payload)
                owner.locator('[name=note]').fill('<script>window.injected=2</script>')
                owner.locator('[data-form=food] button.primary').click()
                expect(owner.locator('h1')).to_have_text('What’s in your kitchen?')
                click(owner,'category','[data-category=all]')
                expect(owner.locator('.food-row').filter(has_text=payload)).to_be_visible()
                assert owner.locator('.food-row img').count()==0
                assert owner.evaluate('window.injected||null') is None
                # Search, date formats, translations, large type, default view, reminders.
                owner.locator('#search').fill('not-a-food')
                expect(owner.locator('.empty')).to_contain_text('No food matches')
                owner.locator('#search').fill('')
                navigate(owner,'preferences')
                expect(owner.locator('[name=language]')).to_be_visible()
                owner.locator('[name=language]').select_option('zh-Hant')
                owner.locator('[name=text_size]').select_option('large')
                owner.locator('[name=default_view]').select_option('use_first')
                owner.locator('[name=date_format]').select_option('dmy')
                owner.locator('[data-form=preferences] button').click()
                expect(owner.locator('h1')).to_have_text('個人偏好')
                expect(owner.locator('html')).to_have_attribute('lang','zh-Hant')
                assert owner.evaluate('getComputedStyle(document.documentElement).fontSize')=='20px'
                assert read_state(editor)['preferences']['language']=='en'
                navigate(owner,'reminders')
                expect(owner.locator('[name=reminders]')).to_be_visible()
                owner.locator('[name=reminders]').uncheck()
                owner.locator('[name=reminder_days]').select_option('7')
                owner.locator('[data-form=reminders] button').click()
                expect(owner.locator('[name=reminders]')).not_to_be_checked()
                navigate(owner,'kitchen')
                expect(owner.locator('[data-action=view-first]')).to_have_class('chosen')
                expect(owner.locator('.reminder-banner')).to_have_count(0)
                y,m,d=today.split('-')
                expect(owner.locator('.food-rows').first).to_contain_text(f'{d}/{m}/{y}')
                owner.set_viewport_size({'width':360,'height':800})
                owner.screenshot(path=str(ARTIFACTS/'use-first-zh-mobile.png'),full_page=True)
                assert owner.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Large text overflow'
                # Keyboard focus visible and narrow layouts on all form/settings pages.
                for route in ['food','preferences','reminders','shared','settings','recipes','help']:
                    navigate(owner,route)
                    owner.wait_for_timeout(70)
                    assert owner.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'Overflow on {route}'
                owner.keyboard.press('Tab')
                assert owner.evaluate('document.activeElement !== document.body')
                # Revocation clears already-loaded food and independent selections on polling.
                navigate(owner,'shared')
                click(editor,'category','[data-category=all]')
                expect(editor.locator('.food-row')).to_have_count(2)
                editor.locator('[data-select]:enabled').first.check()
                click(owner,'remove-member')
                confirm(owner)
                expect(editor.locator('h1')).to_have_text('Make room for good food.',timeout=12000)
                expect(editor.locator('.food-row')).to_have_count(0)
                expect(editor.locator('.selection')).to_have_count(0)
                assert request(editor,'food/create',{'name':'Denied','date_source':'unknown'})['status']==403
                # Clear requires typed kitchen name, can cancel, leaves membership/preferences.
                navigate(owner,'settings')
                click(owner,'clear-kitchen')
                owner.locator('#confirm-cancel').click()
                assert len(read_state(owner)['foods'])==3
                click(owner,'clear-kitchen')
                owner.locator('#confirm-input').fill('Little green kitchen')
                with owner.expect_response('**/api/kitchen/clear') as cleared:
                    confirm(owner)
                assert cleared.value.status==200
                expect(owner.locator('#toast')).to_have_text('已儲存變更')
                assert read_state(owner)['foods']==[]
                assert len(read_state(owner)['members'])==1
                click(owner,'sign-out')
                expect(owner.locator('[data-form=auth]')).to_be_visible()
                assert read_state(owner)['user'] is None
                assert errors==[],errors
                browser.close()
                print('PASS: browser auth, fridge, date modes, cross-category selection, recipes, sharing, conflict/recovery, failure retention, XSS text, preferences, mobile layouts, revocation, clear and sign-out; no uncaught JS errors.')
        finally:
            server.shutdown();server.server_close();thread.join()


if __name__=='__main__':
    run()
