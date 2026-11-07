"""Exercise the actual Gunicorn entry point and restart against persistent SQLite."""
import os
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from test_app import Client


def main():
    executable=os.getenv('LMB_TEST_GUNICORN') or shutil.which('gunicorn')
    if not executable:raise RuntimeError('Install the pinned requirements-deploy.txt to run this check.')
    with tempfile.TemporaryDirectory(prefix='lmb-deploy-') as directory:
        with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
        base=f'http://127.0.0.1:{port}'
        env=dict(os.environ,LMB_DB=str(Path(directory)/'persistent.sqlite3'),LMB_ORIGIN=base,LMB_SECURE_COOKIE='0')
        command=[executable,'--bind',f'127.0.0.1:{port}','--workers','1','--threads','4','wsgi:application']
        def start():
            process=subprocess.Popen(command,cwd=Path(__file__).resolve().parents[1],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
            try:
                for _ in range(100):
                    if process.poll() is not None:raise RuntimeError(process.stderr.read().decode())
                    try:
                        with urllib.request.urlopen(base+'/healthz',timeout=.5) as response:
                            if response.status==200:return process
                    except (OSError,urllib.error.URLError):time.sleep(.05)
                raise RuntimeError('Gunicorn readiness timed out.')
            except Exception:
                process.terminate();process.communicate(timeout=10);raise
        process=start()
        try:
            client=Client(base);client.register('deployment@example.test');client.post('kitchen/create',dict(name='Deployment test'));client.food()
        finally:process.terminate();process.communicate(timeout=10)
        process=start()
        try:
            state=client.state();assert state['foods'][0]['name']=='Tomato' and state['kitchen']['name']=='Deployment test'
            assert client.post('recipes',dict(selected=[state['foods'][0]['id']]))['recipes'][0]['matched']
            client.post('logout');assert client.state()['user'] is None
        finally:process.terminate();process.communicate(timeout=10)
    print('PASS: actual Gunicorn WSGI startup, auth, writes, persistence across restart, matching and logout. Public HTTPS deployment still requires a host.')


if __name__=='__main__':main()
