"""Keyboard resize/pan must preserve auth scrolling and signed-in field positions.
Viewport events are simulated; Chromium/WebKit are real, not physical iOS keyboards.
"""
import os,sys,uuid
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
sys.path.insert(0,str(Path(__file__).resolve().parent))
from browser_smoke import launch_browser,click,navigate,read_state
base=os.getenv('LMB_WEB_BASE_URL','http://127.0.0.1:8794')
artifacts=Path(__file__).resolve().parents[1]/'artifacts/auth-keyboard';artifacts.mkdir(parents=True,exist_ok=True)
KEYBOARD=r'''(()=>{
 const vv=window.visualViewport;if(!vv)return;
 const getHeight=Object.getOwnPropertyDescriptor(VisualViewport.prototype,'height').get;
 const getOffset=Object.getOwnPropertyDescriptor(VisualViewport.prototype,'offsetTop').get;
 let height=null,offset=null;
 Object.defineProperty(vv,'height',{get:()=>height??getHeight.call(vv)});
 Object.defineProperty(vv,'offsetTop',{get:()=>offset??getOffset.call(vv)});
 window.__keyboardViewport=(h,top)=>{height=h;offset=top;vv.dispatchEvent(new Event('resize'));vv.dispatchEvent(new Event('scroll'));};
})();'''
with sync_playwright() as p:
 b=launch_browser(p)
 context=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,extra_http_headers=({'CF-Connecting-IP':'synthetic-auth-keyboard'} if base.startswith('http://127.0.0.1:') else {}));context.add_init_script(KEYBOARD);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(base);expect(page.locator('[data-form=auth]')).to_be_visible();click(page,'auth-register');expect(page.locator('[name=confirm_password]')).to_be_visible()
 email='keyboard-'+uuid.uuid4().hex[:10]+'@example.test';password='synthetic-keyboard-password'
 page.locator('[name=email]').fill(email)
 # Mimic Safari reducing and panning the visual viewport while its layout viewport stays tall.
 page.evaluate('__keyboardViewport(310,240)');assert page.locator('#app').evaluate("(e)=>e.style.height===''"),'Auth shell must not shrink into a clipped inner scroller'
 assert page.locator('#main').evaluate("(e)=>getComputedStyle(e).overflowY==='visible'")
 assert page.evaluate("document.querySelector('#app').getBoundingClientRect().height>=document.querySelector('.auth-panel').getBoundingClientRect().height")
 # A real short viewport verifies all fields remain reachable by document scrolling.
 page.set_viewport_size({'width':390,'height':360})
 page.locator('[name=password]').fill(password);page.locator('[name=confirm_password]').fill(password)
 for name in ['email','password','confirm_password','email']:
  page.locator(f'[name={name}]').scroll_into_view_if_needed();page.locator(f'[name={name}]').click();page.evaluate('__keyboardViewport(280,210)')
  expect(page.locator(f'[name={name}]')).to_be_focused()
 expect(page.locator('[name=email]')).to_have_value(email);expect(page.locator('[name=password]')).to_have_value(password);expect(page.locator('[name=confirm_password]')).to_have_value(password)
 page.locator('[data-show-password]').check();expect(page.locator('[name=password]')).to_have_attribute('type','text');page.locator('[data-show-password]').uncheck()
 page.locator('[name=confirm_password]').scroll_into_view_if_needed();page.screenshot(path=str(artifacts/'register-short-keyboard.png'))
 page.locator('[name=terms_accepted]').check()
 with page.expect_response(lambda r:r.url.endswith('/api/register')) as response:page.locator('[data-form=auth] button.primary').click()
 assert response.value.status==200,response.value.json();expect(page.locator('[data-form=create-kitchen]')).to_be_visible();assert not page.locator('html').evaluate("e=>e.classList.contains('auth-screen')")
 page.evaluate('__keyboardViewport(null,null)');page.set_viewport_size({'width':390,'height':844});page.locator('[data-form=create-kitchen] [name=name]').fill('Keyboard regression kitchen');page.locator('[data-form=create-kitchen] button').click();expect(page.locator('h1')).to_have_text('What’s in your kitchen?');expect(page.locator('.app-dock')).to_be_visible();assert page.evaluate('scrollY===0')
 # Signed-in forms follow a reduced and panned visual viewport without losing focus.
 navigate(page,'food');expect(page.locator('[data-form=food]')).to_be_visible()
 page.locator('[name=name]').fill('Tomato');page.locator('[name=quantity]').fill('6')
 note=page.locator('[name=note]');note.fill('Keep this draft 雞蛋');note.evaluate('(e)=>e.setSelectionRange(4,4)')
 for height,offset in [(310,180),(280,210),(320,0)]:
  page.evaluate('([h,top])=>__keyboardViewport(h,top)',[height,offset])
  page.wait_for_function("""() => {
   const vv=visualViewport,a=document.querySelector('#app').getBoundingClientRect(),
    m=document.querySelector('#main').getBoundingClientRect(),f=document.activeElement.getBoundingClientRect();
   return Math.abs(a.top-vv.offsetTop)<1 && Math.abs(a.height-vv.height)<1 &&
    f.top>=m.top && f.bottom<=m.bottom && a.bottom<=vv.offsetTop+vv.height+1;
  }""")
  expect(note).to_be_focused();expect(note).to_have_value('Keep this draft 雞蛋')
  assert note.evaluate('(e)=>e.selectionStart===4')
  expect(page.locator('[name=quantity]')).to_have_value('6')
 page.evaluate('__keyboardViewport(null,null)')
 page.wait_for_function("document.querySelector('#app').getBoundingClientRect().top===0 && !document.documentElement.classList.contains('keyboard-open')")
 # Confirmations with a text field must fit the keyboard's visible viewport too.
 navigate(page,'settings');click(page,'clear-kitchen');expect(page.locator('#confirm')).to_be_visible()
 page.locator('#confirm-input').fill('Unsubmitted confirmation')
 page.evaluate('__keyboardViewport(300,120)')
 assert page.locator('#confirm').evaluate('(e)=>{const r=e.getBoundingClientRect(),v=visualViewport;return r.top>=v.offsetTop && r.bottom<=v.offsetTop+v.height;}'), 'Confirmation extends behind keyboard'
 page.locator('#confirm-cancel').scroll_into_view_if_needed();page.locator('#confirm-cancel').click()
 assert read_state(page)['kitchen']['name']=='Keyboard regression kitchen'
 page.evaluate('__keyboardViewport(null,null)')
 navigate(page,'settings');click(page,'sign-out');expect(page.locator('[data-form=auth]')).to_be_visible();click(page,'auth-login');assert page.locator('html').evaluate("e=>e.classList.contains('auth-screen')")
 page.evaluate('__keyboardViewport(300,230)');page.set_viewport_size({'width':320,'height':360});page.locator('[name=email]').fill(email);page.locator('[name=password]').fill(password);page.locator('[data-form=auth] button.primary').click();expect(page.locator('h1')).to_have_text('What’s in your kitchen?');assert read_state(page)['kitchen']['name']=='Keyboard regression kitchen'
 page.evaluate('__keyboardViewport(null,null)');page.set_viewport_size({'width':390,'height':844});assert not errors,errors;b.close()
print('PASS: register/sign-in remain native document scrollers under keyboard resize/pan events, short viewports and field focus changes; values, show-password, submit, setup, signed-in fields/caret, panned dialogs, logout and returning dock remain functional. No physical iPhone keyboard claim.')
