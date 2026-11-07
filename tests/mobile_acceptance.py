"""Mobile/PWA acceptance with actual QR frames through a simulated camera device.

This validates the browser pipeline, not a physical phone camera. WebKit checks
run when LMB_TEST_WEBKIT=1 and its supported browser runtime is installed.
"""
import base64
import io
import json
import os
from pathlib import Path
import subprocess
import tempfile
import threading
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from PIL import Image
from playwright.sync_api import sync_playwright,expect
from server import AppServer
from test_app import Client
from browser_smoke import click,navigate,confirm,register,read_state

ROOT=Path(__file__).resolve().parents[1]
EVIDENCE=ROOT/'artifacts/mobile-evidence'
EVIDENCE.mkdir(parents=True,exist_ok=True)


def qr_image(code):
    javascript="const fs=require('fs');const qr=require('./static/vendor/qrcode.js')(0,'M');qr.addData(JSON.parse(fs.readFileSync(0,'utf8')));qr.make();process.stdout.write(qr.createDataURL(8,4));"
    data=subprocess.check_output(['node','-e',javascript],input=json.dumps('lmb-invite:'+code).encode(),cwd=ROOT).decode()
    return Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).convert('RGB')


def camera_fixture(code,path):
    image=qr_image(code)
    image.thumbnail((360,360))
    frame=Image.new('RGB',(640,480),'white')
    frame.paste(image,((640-image.width)//2,(480-image.height)//2))
    y,cb,cr=frame.convert('YCbCr').split()
    pixels=y.tobytes()+cb.resize((320,240)).tobytes()+cr.resize((320,240)).tobytes()
    with open(path,'wb') as output:
        output.write(b'YUV4MPEG2 W640 H480 F5:1 Ip A1:1 C420jpeg\n')
        for _ in range(80):output.write(b'FRAME\n'+pixels)


def login(page,base,email,password):
    page.goto(base)
    page.locator('[name=email]').fill(email)
    page.locator('[name=password]').fill(password)
    page.locator('[data-form=auth] button.primary').click()
    expect(page.locator('h1')).to_have_text('What’s in your kitchen?')


def main():
    errors=[]
    with tempfile.TemporaryDirectory(prefix='lmb-mobile-') as directory:
        server=AppServer(('127.0.0.1',0),Path(directory)/'kitchen.sqlite3')
        thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        base=f'http://127.0.0.1:{server.server_port}'
        owner=Client(base);owner.register('owner@evidence.example');owner.post('kitchen/create',dict(name='Our green kitchen'))
        food=owner.food()
        owner.food(name='Egg',category='dairy',ingredient='egg',date_source='printed',date_kind='best_before',effective_date=owner.state()['today'])
        owner.food(name='Old tofu',ingredient='tofu',date_source='printed',date_kind='use_by',effective_date='2000-01-01')
        code=owner.post('invitation/replace')['code']
        fixture=Path(directory)/'invitation.y4m';camera_fixture(code,fixture)
        try:
            with sync_playwright() as p:
                browser=p.chromium.launch(executable_path=os.getenv('LMB_TEST_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--use-fake-device-for-media-stream','--use-file-for-fake-video-capture='+str(fixture)])
                context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,permissions=['camera'])
                page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
                page.goto(base);expect(page.locator('[data-form=auth]')).to_be_visible()
                page.screenshot(path=str(EVIDENCE/'01-login.png'),full_page=True)
                login(page,base,'owner@evidence.example','test-password-123')
                page.screenshot(path=str(EVIDENCE/'02-kitchen.png'),full_page=True)
                click(page,'category','[data-category=all]');expect(page.locator('.food-row')).to_have_count(3)
                expect(page.locator('.food-row').filter(has_text='Old tofu').locator('input')).to_be_disabled()
                page.locator('[data-select]:enabled').first.check()
                page.screenshot(path=str(EVIDENCE/'03-food-list.png'),full_page=True)
                click(page,'edit');expect(page.locator('[data-form=food]')).to_be_visible()
                page.screenshot(path=str(EVIDENCE/'04-food-form.png'),full_page=True)
                navigate(page,'recipes');expect(page.locator('.recipe-card').first).to_be_visible()
                page.screenshot(path=str(EVIDENCE/'05-recipes.png'),full_page=False)
                navigate(page,'shared');click(page,'invite');confirm(page)
                expect(page.locator('.invite-qr')).to_be_visible()
                code=page.locator('#generated-code').input_value();camera_fixture(code,fixture)
                page.screenshot(path=str(EVIDENCE/'06-shared-qr.png'),full_page=True)
                # Chrome may have opened the fake device file only on getUserMedia: use the new current QR frame.
                scanner_context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,permissions=['camera'])
                scanner=scanner_context.new_page();scanner.on('pageerror',lambda e:errors.append(str(e)))
                scanner.add_init_script("const realGet=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=async(...args)=>{const stream=await realGet(...args);window.testCameraTracks=stream.getTracks();return stream;}")
                register(scanner,base,'scanner@evidence.example')
                click(scanner,'scan-invite')
                # Capture the real getUserMedia pipeline with a deterministic synthetic Y4M camera.
                expect(scanner.locator('[name=code]')).to_have_value(code,timeout=20000)
                expect(scanner.locator('#scanner')).not_to_be_visible()
                assert scanner.evaluate('document.getElementById("qr-video").srcObject === null')
                assert scanner.evaluate('window.testCameraTracks.length > 0 && window.testCameraTracks.every(t => t.readyState === "ended")')
                scanner.screenshot(path=str(EVIDENCE/'07-camera-scanned.png'),full_page=True)
                scanner.locator('[data-form=preview-invite] button:not([type=button])').click()
                expect(scanner.locator('.invitation-preview')).to_be_visible()
                click(scanner,'accept-invite');expect(scanner.locator('h1')).to_have_text('What’s in your kitchen?')
                # Explicitly simulated permission denial; manual entry remains available.
                denied_context=browser.new_context(viewport={'width':390,'height':844})
                denied=denied_context.new_page()
                denied.add_init_script("Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:async()=>{throw new DOMException('Test denial','NotAllowedError')}})")
                register(denied,base,'denied@evidence.example');click(denied,'scan-invite')
                expect(denied.locator('#scanner-status')).to_contain_text('denied')
                denied.screenshot(path=str(EVIDENCE/'07-camera-permission.png'),full_page=True)
                denied.locator('#scanner-close').click();expect(denied.locator('[name=code]')).to_be_enabled()
                # PWA metadata, service worker and privacy boundaries.
                navigate(page,'settings');click(page,'install')
                expect(page.locator('#install-guide')).to_be_visible()
                page.screenshot(path=str(EVIDENCE/'08-install-settings.png'),full_page=True)
                manifest=page.evaluate('async()=>await(await fetch("/manifest.webmanifest")).json()')
                assert manifest['display']=='standalone' and len(manifest['icons'])==2
                page.evaluate('async()=>await navigator.serviceWorker.ready')
                page.wait_for_function('navigator.serviceWorker.controller !== null')
                cached=page.evaluate('async()=>{const keys=await caches.keys();return (await Promise.all(keys.map(async key=>(await(await caches.open(key)).keys()).map(r=>r.url)))).flat()}')
                assert cached and not any('/api/' in url for url in cached)
                context.set_offline(True);page.goto(base)
                expect(page.locator('[role=alert]')).to_contain_text('You are offline')
                expect(page.locator('.food-row')).to_have_count(0)
                page.screenshot(path=str(EVIDENCE/'09-offline.png'),full_page=True)
                context.set_offline(False);click(page,'retry');expect(page.locator('h1')).to_have_text('What’s in your kitchen?')
                assert errors==[],errors
                browser.close()
                print('PASS: mobile touch layout, exact QR encoding/decoding via simulated camera, camera-denial fallback, expired checkbox, app manifest, service-worker offline shell and private API cache exclusion.')
                if os.getenv('LMB_TEST_WEBKIT')=='1':
                    webkit=p.webkit.launch(executable_path=os.getenv("LMB_TEST_WEBKIT_EXECUTABLE",p.webkit.executable_path),headless=True)
                    safari=webkit.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
                    tab=safari.new_page();tab.on('pageerror',lambda e:errors.append(str(e)))
                    login(tab,base,'owner@evidence.example','test-password-123')
                    click(tab,'category','[data-category=all]');expect(tab.locator('.food-row')).to_have_count(3)
                    tab.locator('[data-select]:enabled').first.check();click(tab,'find-recipes');expect(tab.locator('.recipe-card').first).to_be_visible()
                    assert tab.evaluate('document.documentElement.scrollWidth <= innerWidth')
                    tab.screenshot(path=str(EVIDENCE/'10-webkit-mobile.png'),full_page=True)
                    webkit.close();assert errors==[],errors
                    print('PASS: WebKit mobile engine login, stored food, selection, API recipe matching and responsive layout (not a physical iPhone).')
        finally:
            server.shutdown();server.server_close();thread.join()


if __name__=='__main__':main()
