"""Launch a local app on a free port and open the system browser (Mac/Windows/Linux)."""
import argparse
import json
from pathlib import Path
import sys
import threading
import webbrowser
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from server import AppServer

root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--demo',action='store_true',help='Use isolated synthetic classroom accounts.')
args=parser.parse_args()
database=root/('.data/demo/kitchen.sqlite3' if args.demo else '.data/kitchen.sqlite3')
if args.demo:
    from seed_demo import seed
    if not database.exists():seed(database)
    print('CLASSROOM DEMO ONLY: all sample data is synthetic.',flush=True)
    credentials=database.parent/'demo-credentials.json'
    if credentials.exists():
        for account in json.loads(credentials.read_text())['accounts']:
            print(f"{account['role']}: {account['email']} / {account['password']}",flush=True)
server=AppServer(('127.0.0.1',0),database)
url=f'http://127.0.0.1:{server.server_port}'
print('Last Minute Bites is opening in your browser. Keep this window open.',flush=True)
print(f'Local address: {url}',flush=True)
threading.Timer(.5,lambda:webbrowser.open(url)).start()
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
