"""Resize a live session and inject asymmetric safe areas / visual viewport events.

These are browser regressions, not an iPhone Duo hardware or OS simulator claim.
"""
import os
from pathlib import Path
import uuid
from playwright.sync_api import sync_playwright, expect
from browser_smoke import launch_browser, register, navigate, click, set_stock, read_state

base = os.getenv('LMB_WEB_BASE_URL', 'http://127.0.0.1:8790')
assert base.startswith('http://127.0.0.1:'), 'Use the local fixture, never production'
artifacts = Path(__file__).resolve().parents[1] / 'artifacts/responsive' / os.getenv('LMB_WEB_ENGINE', 'chromium')
artifacts.mkdir(parents=True, exist_ok=True)
VIEWPORT = r'''(() => {
  const vv = window.visualViewport;
  if (!vv) return;
  let values = {};
  for (const key of ['width', 'height', 'offsetLeft', 'offsetTop', 'scale']) {
    const read = Object.getOwnPropertyDescriptor(VisualViewport.prototype, key).get;
    Object.defineProperty(vv, key, {get: () => values[key] ?? read.call(vv)});
  }
  window.__viewport = (next = {}) => {
    values = next;
    vv.dispatchEvent(new Event('resize'));
    vv.dispatchEvent(new Event('scroll'));
  };
})();'''


def safe_area(page, left=0, right=0, top=0, bottom=0):
    page.evaluate('''(insets) => {
      for (const [edge, value] of Object.entries(insets))
        document.documentElement.style.setProperty('--safe-' + edge, value + 'px');
    }''', dict(left=left, right=right, top=top, bottom=bottom))


def fit(page, selector='#main'):
    page.wait_for_function('''(selector) => {
      const s = getComputedStyle(document.documentElement), vv = visualViewport;
      const left = vv.offsetLeft + parseFloat(s.getPropertyValue('--safe-left'));
      const right = vv.offsetLeft + vv.width - parseFloat(s.getPropertyValue('--safe-right'));
      const e = document.querySelector(selector), r = e.getBoundingClientRect();
      const top = vv.offsetTop + parseFloat(s.getPropertyValue('--safe-top'));
      const bottom = vv.offsetTop + vv.height - parseFloat(s.getPropertyValue('--safe-bottom'));
      return r.width > 0 && r.left >= left - 1 && r.right <= right + 1 &&
        e.scrollWidth <= e.clientWidth + 1 &&
        (e.tagName !== 'DIALOG' || (r.top >= top - 1 && r.bottom <= bottom + 1));
    }''', arg=selector)


with sync_playwright() as p:
    browser = launch_browser(p)
    context = browser.new_context(viewport={'width': 390, 'height': 844},
                                  is_mobile=True, has_touch=True, service_workers='block')
    context.add_init_script(VIEWPORT)
    page = context.new_page()
    errors, writes = [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    register(page, base, 'resize-' + uuid.uuid4().hex[:10] + '@example.test')
    assert 'viewport-fit=cover' in page.locator('meta[name=viewport]').get_attribute('content')
    page.locator('[data-form=create-kitchen] [name=name]').fill('Resize kitchen')
    page.locator('[data-form=create-kitchen] button').click()
    expect(page.locator('h1')).to_have_text('What’s in your kitchen?')
    navigate(page, 'food')
    page.locator('[name=name]').fill('Tomato')
    set_stock(page, 6)
    page.locator('[data-form=food] button.primary').click()
    expect(page.locator('h1')).to_have_text('What’s in your kitchen?')
    navigate(page, 'food')
    page.locator('[name=name]').fill('Egg')
    set_stock(page, 3)
    note = page.locator('[name=note]')
    note.fill('Keep this draft 雞蛋')
    note.evaluate('(e) => e.setSelectionRange(4, 4)')
    page.on('request', lambda r: writes.append(r.url) if r.method == 'POST' else None)

    # Resize the same document across narrow, wide, short and split-window shapes.
    for width, height in [(344, 882), (932, 600), (600, 932), (540, 360), (280, 653), (390, 844)]:
        page.set_viewport_size({'width': width, 'height': height})
        for left, right in [(0, 0), (0, 48), (48, 0)]:
            safe_area(page, left, right, 24, 20)
            fit(page)
            expect(note).to_be_focused()
            expect(note).to_have_value('Keep this draft 雞蛋')
            expect(page.locator('[name=name]')).to_have_value('Egg')
            expect(page.locator('[name=quantity]')).to_have_value('3')
            assert note.evaluate('(e) => e.selectionStart === 4')
    assert not writes, writes

    # A narrowed/panned visible window must not leave a wide layout or dialog behind.
    page.set_viewport_size({'width': 900, 'height': 700})
    page.evaluate('__viewport({width: 480, height: 440, offsetLeft: 100, offsetTop: 80})')
    safe_area(page, 32, 16, 20, 16)
    fit(page)
    page.wait_for_function('''() => {
      const r = document.querySelector('#app').getBoundingClientRect();
      return r.left === 100 && r.width === 480 && r.top === 80 && r.height === 440;
    }''')
    page.screenshot(path=str(artifacts / 'resized-draft.png'))
    page.evaluate('__viewport()')
    safe_area(page)

    # Confirm/cancel after resize must retain food; overlays stay inside all safe edges.
    navigate(page, 'settings')
    click(page, 'clear-kitchen')
    expect(page.locator('#confirm')).to_be_visible()
    page.locator('#confirm-input').fill('Not a confirmation')
    for width, height, left, right in [(390, 844, 48, 0), (900, 600, 0, 64), (540, 360, 32, 16)]:
        page.set_viewport_size({'width': width, 'height': height})
        safe_area(page, left, right, 24, 20)
        fit(page, '#confirm')
        expect(page.locator('#confirm-input')).to_have_value('Not a confirmation')
    page.locator('#confirm-cancel').click()
    assert len(read_state(page)['foods']) == 1

    page.set_viewport_size({'width': 390, 'height': 844})
    safe_area(page, 0, 48, 24, 20)
    navigate(page, 'category/all')
    page.locator('[data-select]').check()
    click(page, 'batch-used')
    fit(page, '#used-picker')
    page.screenshot(path=str(artifacts / 'safe-area-consumption.png'))
    page.locator('#used-cancel').click()
    assert len(read_state(page)['foods']) == 1

    # Zoom uses native browser layout rather than snapping the app to a tiny viewport.
    page.evaluate('__viewport({width: 195, height: 422, offsetLeft: 30, scale: 2})')
    assert page.evaluate("document.documentElement.style.getPropertyValue('--visible-width') === '100%'")
    page.evaluate('__viewport()')
    safe_area(page, 48, 0, 24, 20)
    navigate(page, 'settings')
    click(page, 'sign-out')
    expect(page.locator('[data-form=auth]')).to_be_visible()
    fit(page)
    assert page.locator('#app').evaluate("e => getComputedStyle(e).position === 'static'")
    page.locator('.skip').focus()
    fit(page, '.skip')
    assert not errors, errors
    browser.close()

print('PASS: live resize preserves draft/focus/caret without writes; asymmetric safe areas, '
      'horizontal viewport pan, confirm/consume dialogs, auth and native zoom fallback. '
      'Browser simulation only, not iPhone Duo hardware/OS verification.')
