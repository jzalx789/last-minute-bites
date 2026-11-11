"""Recommended stock-first, anchored flexible meals and strict stock-only mode."""
import os,sys,uuid
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
sys.path.insert(0,str(Path(__file__).resolve().parent))
from browser_smoke import launch_browser,register,navigate,request,read_state,click
base=os.getenv('LMB_WEB_BASE_URL','http://127.0.0.1:8794');assert base.startswith('http://127.0.0.1:')
artifacts=Path(__file__).resolve().parents[1]/'artifacts/recipe-modes';artifacts.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=launch_browser(p)
 page=b.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,service_workers='block');errors=[];calls=[]
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:calls.append(r) if r.url.endswith('/api/recipes/generate') else None)
 register(page,base,'recipe-modes-'+uuid.uuid4().hex[:10]+'@example.test')
 page.locator('[data-form=create-kitchen] [name=name]').fill('Salmon with home basics');page.locator('[data-form=create-kitchen] button').click();expect(page.locator('.app-dock')).to_be_visible()
 r=request(page,'food/create',dict(name='Salmon',quantity=500,unit='g',date_source='unknown'));assert r['status']==200,r
 page.wait_for_load_state("networkidle");page.reload();expect(page.locator('.app-dock')).to_be_visible();before=read_state(page)['foods'];navigate(page,'recipes');expect(page.locator('[name=mode]')).to_have_value('stock_first')
 assert page.locator('[name=mode] option').evaluate_all('(els)=>els.map(e=>e.value)')==['stock_first','plan','use_up'];assert not calls
 page.locator('[name=count]').select_option('1');page.locator('[name=style]').select_option('meat');page.locator('[name=preference]').fill('spicy')
 page.locator('.pantry-preferences summary').click();expect(page.locator('[name=pantry_staples]')).to_have_count(7);page.locator('[name=pantry_staples][value=soy_sauce]').uncheck();expect(page.locator('#pantry-count')).to_have_text('6')
 def generate():
  with page.expect_response(lambda response:response.url.endswith('/api/recipes/generate')) as response:page.locator('[data-form=ai-recipes] button.primary').click()
  assert response.value.status==200,response.value.json();expect(page.locator('.recipe-card')).to_have_count(1);return response.value.json()['generation']
 first=generate();assert any(s['staple_id']=='chilli' for s in first['recipes'][0]['seasonings']);assert not first['recipes'][0]['additional'];expect(page.locator('.recipe-basics')).to_contain_text('Dried chilli');expect(page.locator('.shopping-list')).to_have_count(0)
 assert read_state(page)['foods']==before
 click(page,'recipe-detail');expect(page.locator('.recipe-seasonings')).to_contain_text('Dried chilli');click(page,'cooked-recipe');expect(page.locator('.consume-item')).to_have_count(1);expect(page.locator('#used-foods')).to_contain_text('Salmon');page.locator('#used-cancel').click();assert read_state(page)['foods']==before
 navigate(page,'recipes');expect(page.locator('[name=mode]')).to_have_value('stock_first');page.locator('[name=mode]').select_option('plan');assert len(calls)==1
 free=generate();assert free['recipes'][0]['uses'] and free['recipes'][0]['additional'];expect(page.locator('.shopping-list')).to_contain_text('Potato');expect(page.locator('.shopping-list')).not_to_contain_text('Dried chilli')
 page.wait_for_load_state("networkidle");page.reload();expect(page.locator('[name=mode]')).to_have_value('plan');expect(page.locator('[data-action=replace-recipe]')).to_be_enabled()
 page.locator('[name=mode]').select_option('use_up');expect(page.locator('.pantry-preferences')).not_to_be_visible()
 strict=generate();assert not strict['recipes'][0]['seasonings'] and not strict['recipes'][0]['additional'];expect(page.locator('.recipe-basics')).to_have_count(0)
 page.locator('[name=mode]').select_option('stock_first');expect(page.locator('.pantry-preferences')).to_be_visible();page.locator('.pantry-preferences summary').click();expect(page.locator('[name=pantry_staples][value=soy_sauce]')).not_to_be_checked()
 page.locator('.recipe-preferences summary').click();page.locator('[name=avoid]').fill('chilli');avoided=generate();assert all(s['staple_id']!='chilli' for s in avoided['recipes'][0]['seasonings']);assert len(calls)==4 and read_state(page)['foods']==before
 # Old two-mode history is preserved, while the new builder starts with recommended mode 1.
 def legacy_history(route):
  response=route.fetch();data=response.json();data['generation']['options'].pop('pantry_staples',None);data['generation']['options']['mode']='use_up'
  for recipe in data['generation']['recipes']:recipe.pop('seasonings',None)
  route.fulfill(response=response,json=data)
 page.route('**/api/recipes/history',legacy_history);page.wait_for_load_state("networkidle");page.reload();expect(page.locator('[name=mode]')).to_have_value('stock_first');expect(page.locator('.recipe-card')).to_have_count(1);expect(page.locator('.recipe-input-changed')).to_be_visible();assert len(calls)==4;page.unroute('**/api/recipes/history')
 request(page,'preferences',dict(language='zh-Hant',text_size='large'));page.wait_for_load_state("networkidle");page.reload();expect(page.locator('[name=mode] option:checked')).to_contain_text('推薦')
 page.locator('.pantry-preferences summary').click()
 for width in [280,320,390,717]:
  page.set_viewport_size({'width':width,'height':844});assert page.locator('#main').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1'),width
 page.set_viewport_size({'width':390,'height':844});page.locator('[name=mode]').scroll_into_view_if_needed();page.screenshot(path=str(artifacts/'three-modes-phone.png'))
 assert not errors,errors;b.close()
print('PASS: recommended 1→2→3 modes, spicy single-stock seasoning, per-item home-basics choices, no pantry shopping/consumption, flexible anchored additions, strict boundaries, saved settings/replacement readiness, avoid precedence, no automatic AI calls and narrow bilingual large text (test provider).')
