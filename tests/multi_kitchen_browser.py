"""Phone UI: multiple kitchens, invited party, pooled recipe, source deduction."""
import os,sys,uuid
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
sys.path.insert(0,str(Path(__file__).resolve().parent))
from browser_smoke import launch_browser,register,click,navigate,confirm
base=os.getenv('LMB_WEB_BASE_URL','http://127.0.0.1:8794')
assert base.startswith('http://127.0.0.1:')
art=Path(__file__).resolve().parents[1]/'artifacts/party';art.mkdir(parents=True,exist_ok=True)
def call(p,path,data):return p.evaluate('([path,data])=>api(path,data)',[path,data])
def create(p,name):
    p.locator('[data-form=create-kitchen] [name=name]').fill(name)
    p.locator('[data-form=create-kitchen] button.primary').click()
    expect(p.locator('h1')).to_have_text('What’s in your kitchen?')
    return p.evaluate('state.kitchen.id')
def show_kitchens(p):
    navigate(p,'kitchens');expect(p.locator('h1')).to_have_text('Your kitchens')
def switch(p,kid):
    show_kitchens(p);click(p,'switch-kitchen',f'[data-id="{kid}"]');expect(p.locator('h1')).to_have_text('What’s in your kitchen?')
def fit(p):
    assert p.evaluate('document.documentElement.scrollWidth <= innerWidth'),p.viewport_size
    for loc in p.locator('#main input:visible,#main select:visible,#main button:visible').all():
        box=loc.bounding_box()
        if box:assert box['x']>=-1 and box['x']+box['width']<=p.viewport_size['width']+1,(box,p.viewport_size)
errors=[]
with sync_playwright() as pw:
    browser=launch_browser(pw)
    one=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
    two=browser.new_context(viewport={'width':360,'height':800},is_mobile=True,has_touch=True)
    a,b=one.new_page(),two.new_page()
    for p in [a,b]:p.on('pageerror',lambda e:errors.append(str(e)))
    suffix=uuid.uuid4().hex[:12]
    register(a,base,'party-ui-a'+suffix+'@example.test');ka=create(a,'My home')
    call(a,'food/create',dict(name='Salmon',quantity=500,unit='g',date_source='unknown'))
    a.evaluate('refresh()')
    register(b,base,'party-ui-b'+suffix+'@example.test');kb=create(b,'Guest home')
    call(b,'food/create',dict(name='Egg',quantity=8,unit='pcs',date_source='unknown'))
    b.evaluate('refresh()')
    show_kitchens(a)
    create(a,'My second home');second=a.evaluate('state.kitchen.id')
    switch(a,ka);assert len(a.evaluate('state.kitchens'))==2
    show_kitchens(a)
    a.locator('.party-create > summary').click()
    partyform=a.locator('[data-form=create-party]')
    partyform.locator('[name=name]').fill('Friends dinner')
    partyform.locator(f'[name=source_ids][value="{ka}"]').check()
    fit(a);partyform.locator('button.primary').click()
    expect(a.locator('.party-banner')).to_contain_text('Party mode')
    party=a.evaluate('state.kitchen.id')
    navigate(a,'shared');click(a,'invite');confirm(a)
    expect(a.locator('#generated-code')).to_be_visible();code=a.locator('#generated-code').input_value()
    show_kitchens(b);b.locator('[name=code]').fill(code)
    b.locator('[data-form=preview-invite] button:not([type=button])').click()
    expect(b.locator('.invitation-preview')).to_contain_text('Friends dinner')
    click(b,'accept-invite');expect(b.locator('.party-banner')).to_be_visible()
    navigate(b,'party');expect(b.locator('h1')).to_have_text('Party mode')
    b.locator('[data-form=party-source] button').click()
    expect(b.locator('.party-source-list li')).to_have_count(2)
    a.evaluate('refresh()');navigate(a,'category/all');expect(a.locator('.food-row')).to_have_count(2)
    expect(a.locator('.food-row .batch-label')).to_contain_text(['My home','Guest home'])
    expect(a.locator('.food-row [data-action=edit]')).to_have_count(0)
    for width in [280,320,390,540,768,1114]:
        a.set_viewport_size({'width':width,'height':844});fit(a)
    a.set_viewport_size({'width':390,'height':844})
    a.locator('[data-select]').first.check();a.locator('[data-select]').last.check();click(a,'find-recipes')
    expect(a.locator('.recipe-food-chip')).to_have_count(2)
    assert 'My home' in a.locator('#recipe-foods').inner_text() and 'Guest home' in a.locator('#recipe-foods').inner_text()
    form=a.locator('[data-form=ai-recipes]');form.locator('[name=use_all]').check()
    form.locator('button.primary').click();expect(a.locator('.recipe-card')).to_have_count(2)
    a.screenshot(path=str(art/'party-recipes-phone.png'),full_page=True)
    navigate(a,'category/all');expect(a.locator('.food-row')).to_have_count(2)
    click(a,'row-used');expect(a.locator('#used-picker')).to_be_visible()
    expect(a.locator('#used-foods')).to_contain_text('My home')
    a.locator('[data-consume-amount]').fill('50')
    a.locator('#used-confirm').click();expect(a.locator('#used-picker')).not_to_be_visible()
    switch(a,ka);assert next(f for f in a.evaluate('state.foods') if f['name']=='Salmon')['quantity']==450
    switch(a,party);navigate(a,'party');click(a,'party-end');confirm(a)
    expect(a.locator('.party-closed')).to_be_visible()
    navigate(a,'recipes');expect(a.locator('[data-form=ai-recipes] button.primary')).to_be_disabled()
    expect(a.locator('.recipe-card')).to_have_count(2)
    expect(a.locator('[data-action=cooked-recipe]')).to_have_count(0)
    switch(a,second);assert a.evaluate('state.foods.length')==0
    switch(a,ka);assert a.evaluate('state.foods[0].quantity')==450
    a.wait_for_load_state('networkidle');a.reload();expect(a.locator('.kitchen-name')).to_contain_text('My home')
    assert len(a.evaluate('state.kitchens'))==3
    assert not errors,errors
    browser.close()
print('PASS: phone multiple-kitchen creation/switching, existing-account party join, source consent, source labels, pooled recipes and real source deduction, read-only closure, reload, 280–1114px layout (local test AI).')
