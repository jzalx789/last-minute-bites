"""Review or apply a deployment to an existing PythonAnywhere account.

Default is a local plan only. --apply requires PA_API_TOKEN from a secure
binding and a clean Git checkout. No paid plan, account or external database is
created. Unknown existing web apps are never overwritten.
Official API contract: https://help.pythonanywhere.com/pages/API/
"""
import argparse
import getpass
import hashlib
import http.cookiejar
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import secrets
import time
import json
import os
from pathlib import Path
import re
import subprocess
import urllib.error
import urllib.parse
import urllib.request
import uuid

ROOT=Path(__file__).resolve().parents[1]
HOST='www.pythonanywhere.com'


class API:
    def __init__(self,username,token):
        self.base=f'https://{HOST}/api/v0/user/{username}'
        self.token=token

    def call(self,method,path,data=None,file=None):
        headers={'Authorization':'Token '+self.token}
        payload=None
        if file is not None:
            boundary='lmb-'+uuid.uuid4().hex
            payload=(f'--{boundary}\r\nContent-Disposition: form-data; name="content"; filename="source"\r\nContent-Type: application/octet-stream\r\n\r\n'.encode()+file+f'\r\n--{boundary}--\r\n'.encode())
            headers['Content-Type']='multipart/form-data; boundary='+boundary
        elif data is not None:
            payload=urllib.parse.urlencode(data).encode()
            headers['Content-Type']='application/x-www-form-urlencoded'
        request=urllib.request.Request(self.base+path,data=payload,headers=headers,method=method)
        try:
            with urllib.request.urlopen(request,timeout=30) as response:
                body=response.read()
                if not body:return None
                try:return json.loads(body)
                except (json.JSONDecodeError,UnicodeDecodeError):return body
        except urllib.error.HTTPError as error:
            code=error.code
            retry=error.headers.get('Retry-After','')
            error.close()
            raise RuntimeError(f'PythonAnywhere API returned HTTP {code}. '+(f'Retry after {retry} seconds.' if code==429 else 'Check the account and secure token binding; no credential values are logged.')) from None


def plan(username):
    if not re.fullmatch(r'[A-Za-z][A-Za-z0-9_-]{0,63}',username):raise ValueError('Use only your PythonAnywhere account username, not a URL or password.')
    files=[ROOT/name for name in ['server.py','wsgi.py','recipes.json']]
    files += sorted(p for p in (ROOT/'static').rglob('*') if p.is_file() and p.suffix in {'.html','.js','.css','.png','.webmanifest'})
    checksums={str(path.relative_to(ROOT)):hashlib.sha256(path.read_bytes()).hexdigest() for path in files}
    # Content identity is independent of documentation-only commits.
    release=hashlib.sha256(json.dumps(checksums,sort_keys=True).encode()).hexdigest()[:16]
    return dict(username=username,domain=username.lower()+'.pythonanywhere.com',release_directory=f'/home/{username}/last-minute-bites/releases/{release}',database=f'/home/{username}/.local/share/last-minute-bites/kitchen.sqlite3',files=checksums)


def apply(deployment,api,update=False):
    username=deployment['username'];domain=deployment['domain'];root=deployment['release_directory']
    existing=api.call('GET','/webapps/')
    if not isinstance(existing,list):raise RuntimeError('Unexpected webapp listing; no changes were made.')
    current=next((app for app in existing if app.get('domain_name')==domain),None)
    if existing and current is None:raise RuntimeError('This account already hosts another app. Refusing to change or replace it.')
    if current:
        config=api.call('GET',f'/webapps/{domain}/')
        expected=f'/home/{username}/last-minute-bites/releases/'
        if not update or not config.get('source_directory','').startswith(expected):
            raise RuntimeError('Existing app is not an explicitly requested update of this project; refusing to overwrite it.')
    versions=api.call('GET','/default_python3_version/').get('available_python3_versions',[])
    compatible=[v for v in versions if re.fullmatch(r'3\.\d+',v) and int(v.split('.')[1])>=12]
    if not compatible:raise RuntimeError('This account needs a system image offering Python 3.12+. No app configuration was changed.')
    version=max(compatible,key=lambda v:int(v.split('.')[1]))
    for name in deployment['files']:
        api.call('POST','/files/path'+urllib.parse.quote(root+'/'+name,safe='/'),file=(ROOT/name).read_bytes())
    if not current:api.call('POST','/webapps/',dict(domain_name=domain,python_version='python'+version.replace('.','')))
    config=api.call('GET',f'/webapps/{domain}/')
    wsgi_path=config.get('wsgi_configuration_file') or '/var/www/'+domain.replace('.','_')+'_wsgi.py'
    expected='/var/www/'+domain.replace('.','_')+'_wsgi.py'
    if wsgi_path!=expected:raise RuntimeError('Unexpected WSGI path; refusing to overwrite it.')
    wsgi=("# Last Minute Bites: generated deployment entry, no credentials embedded.\nimport os, sys\n"
          f"sys.path.insert(0, {root!r})\nos.environ['LMB_DB']={deployment['database']!r}\n"
          f"os.environ['LMB_ORIGIN']={'https://'+domain!r}\nos.environ['LMB_SECURE_COOKIE']='1'\n"
          "from wsgi import application\n").encode()
    api.call('POST','/files/path'+urllib.parse.quote(wsgi_path,safe='/'),file=wsgi)
    api.call('PATCH',f'/webapps/{domain}/',dict(source_directory=root,python_version='python'+version.replace('.',''),force_https='true'))
    api.call('POST',f'/webapps/{domain}/reload/',{})
    return 'https://'+domain


def verify_and_demo(address, demo=False):
    """Public-app checks never receive the hosting-management token."""
    ready=False
    for attempt in range(45):
        try:
            with urllib.request.urlopen(address+'/healthz', timeout=10) as response:
                result=json.load(response)
                if result.get('status')=='ok' and result.get('version')=='0.2':
                    ready=True;break
        except (OSError, ValueError):
            pass
        if attempt%5==0:print('Waiting for the HTTPS app to become ready...',flush=True)
        time.sleep(1)
    if not ready:raise RuntimeError('Reload was requested, but public readiness did not pass. Check the PythonAnywhere Web error log before using this as a submission URL.')
    with urllib.request.urlopen(address+'/manifest.webmanifest',timeout=15) as response:
        if json.load(response).get('display')!='standalone':raise RuntimeError('Mobile app manifest is missing.')
    if not demo:return None
    class Client:
        def __init__(self):
            self.opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
            self.csrf=None
            self.state()
        def state(self):
            with self.opener.open(address+'/api/state',timeout=20) as response:state=json.load(response)
            self.csrf=state['csrf'];return state
        def post(self,path,data):
            request=urllib.request.Request(address+'/api/'+path,data=json.dumps(data).encode(),headers={'Content-Type':'application/json','X-CSRF-Token':self.csrf,'Origin':address})
            with self.opener.open(request,timeout=20) as response:result=json.load(response)
            self.csrf=result.get('csrf',self.csrf);return result
    stamp=uuid.uuid4().hex[:8]
    accounts=[];clients=[]
    for role in ['owner','editor','outsider']:
        account=dict(role=role,email=f'{role}.{stamp}@demo.example',password='Bites-'+secrets.token_urlsafe(12))
        client=Client();client.post('register',dict(email=account['email'],password=account['password'],confirm_password=account['password'],timezone='Asia/Hong_Kong'))
        accounts.append(account);clients.append(client)
    owner,editor,outsider=clients
    owner.post('kitchen/create',dict(name='IS2023 Demo Kitchen'))
    invitation=owner.post('invitation/replace',{})['code']
    editor.post('invitation/preview',dict(code=invitation));editor.post('invitation/accept',dict(code=invitation,confirmed=True))
    outsider.post('kitchen/create',dict(name='Separate Demo Kitchen'))
    today=datetime.now(ZoneInfo('Asia/Hong_Kong')).date()
    for name,ingredient,category,location,source,kind,offset in [('Tomato','tomato','produce','fridge','printed','use_by',1),('Egg','egg','dairy','fridge','printed','best_before',5),('Rice','rice','dry','pantry','unknown','unspecified',0),('Spinach','spinach','produce','freezer','unknown','unspecified',0),('Oil','oil','condiments','pantry','printed','best_before',-1),('Salt','salt','condiments','pantry','unknown','unspecified',0),('Old tofu (demo)','tofu','protein','fridge','printed','use_by',-1)]:
        owner.post('food/create',dict(name=name,ingredient=ingredient,category=category,location=location,date_source=source,date_kind=kind,effective_date=(today+timedelta(days=offset)).isoformat(),request_id=str(uuid.uuid4()),note='Synthetic classroom demo.'))
    state=editor.state()
    if len(state['foods'])!=7 or outsider.state()['foods']:raise RuntimeError('Shared-data isolation check failed.')
    selected=[f['id'] for f in state['foods'] if f['eligible']]
    if not any(r['matched'] for r in editor.post('recipes',dict(selected=selected))['recipes']):raise RuntimeError('Recipe smoke check failed.')
    try:
        editor.post('kitchen/clear',dict(confirmed=True,kitchen_name='IS2023 Demo Kitchen'))
    except urllib.error.HTTPError as error:
        code=error.code;error.close()
        if code!=403:raise RuntimeError('Role-rejection check failed.')
    else:raise RuntimeError('Editor unexpectedly received Owner permission.')
    output=ROOT/'.data/deployment/demo-credentials.json';output.parent.mkdir(mode=0o700,parents=True,exist_ok=True)
    # Keep prior teacher handoffs when doing another intentional deployment.
    if output.exists():output=output.with_name('demo-credentials-'+stamp+'.json')
    with output.open('x') as file:json.dump(dict(url=address,notice='Synthetic classroom accounts. Provide to the instructor; never commit this file.',accounts=accounts),file,indent=2)
    output.chmod(0o600)
    return output


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--username',default=os.getenv('PA_USERNAME'))
    parser.add_argument('--apply',action='store_true')
    parser.add_argument('--update',action='store_true')
    parser.add_argument('--ask-token',action='store_true',help='Read the hosting token privately on your own terminal.')
    parser.add_argument('--demo',action='store_true',help='Create separate synthetic instructor accounts after HTTPS readiness passes.')
    args=parser.parse_args()
    if not args.username:parser.error('Provide a non-secret --username, or PA_USERNAME.')
    deployment=plan(args.username)
    if not args.apply:
        print(json.dumps(dict(deployment,notice='LOCAL PLAN ONLY. No account was contacted and no website was deployed.'),indent=2));return
    if (ROOT/'.git').exists() and subprocess.check_output(['git','status','--porcelain'],cwd=ROOT).strip():parser.error('Commit or preserve checkout changes before applying a release.')
    print(f"Target account: {deployment['username']} | Public domain: {deployment['domain']} | Source files: {len(deployment['files'])}",flush=True)
    token=getpass.getpass('Paste your NEW PythonAnywhere API Token here (hidden): ') if args.ask_token else os.getenv('PA_API_TOKEN')
    token=token.strip() if token else ''
    if not token:parser.error('Provide the token privately with --ask-token or a secure PA_API_TOKEN binding. Never paste it in chat.')
    if len(token)>4096 or any(ord(c)<32 or ord(c)==127 for c in token):parser.error('Token contains invalid control characters; copy it again privately. Its value is not logged.')
    address=apply(deployment,API(args.username,token),args.update)
    print('Configuration saved and reload requested for '+address)
    credentials=verify_and_demo(address,args.demo)
    print('HTTPS readiness and mobile manifest verified: '+address)
    if credentials:
        print('Instructor demo accounts saved on YOUR computer: '+str(credentials))
        for account in json.loads(credentials.read_text())['accounts']:
            print(f"{account['role']}: {account['email']} / {account['password']}")
    print('Next: complete installation and camera tests on your actual phone before submission.')


if __name__=='__main__':main()
