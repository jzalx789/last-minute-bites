"""Create an isolated instructor demo database. Never modifies an existing database."""
import argparse
from datetime import datetime,timedelta
import json
from pathlib import Path
import secrets
import sys
from zoneinfo import ZoneInfo
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from server import Store, DEFAULT_PREFS, password_hash, validate_food

ACCOUNTS = [('owner@demo.example','owner'),('editor@demo.example','editor'),('outsider@demo.example','owner')]


def seed(database):
    path=Path(database)
    if path.exists():
        raise FileExistsError('Refusing to overwrite an existing database. Use a new path for the demo.')
    credentials=path.parent/'demo-credentials.json'
    if credentials.exists():
        raise FileExistsError('Credential output already exists; choose another directory.')
    store=Store(path)
    passwords={email:'Bites-'+secrets.token_urlsafe(12) for email,_ in ACCOUNTS}
    today=datetime.now(ZoneInfo('Asia/Hong_Kong')).date()
    with store.connect() as db:
        kid=db.execute('INSERT INTO kitchens(name) VALUES(?)',('S01G10 Demo Kitchen',)).lastrowid
        other=db.execute('INSERT INTO kitchens(name) VALUES(?)',('Separate Demo Kitchen',)).lastrowid
        for index,(email,role) in enumerate(ACCOUNTS):
            uid=db.execute('INSERT INTO users(email,password) VALUES(?,?)',(email,password_hash(passwords[email]))).lastrowid
            db.execute('INSERT INTO user_preferences VALUES(?,?)',(uid,json.dumps(DEFAULT_PREFS)))
            db.execute('INSERT INTO memberships VALUES(?,?,?)',(uid,kid if index<2 else other,role))
        samples=[('Tomato','tomato','produce','fridge','printed','use_by',1),('Egg','egg','dairy','fridge','printed','best_before',5),('Rice','rice','dry','pantry','unknown','unspecified',0),('Spinach','spinach','produce','freezer','unknown','unspecified',0),('Oil','oil','condiments','pantry','printed','best_before',-2),('Salt','salt','condiments','pantry','unknown','unspecified',0),('Old tofu (demo)','tofu','protein','fridge','printed','use_by',-1)]
        for name,ingredient,category,location,source,kind,offset in samples:
            food=validate_food(dict(name=name,ingredient=ingredient,category=category,location=location,date_source=source,date_kind=kind,effective_date=(today+timedelta(days=offset)).isoformat(),note='Synthetic demonstration record. Do not treat as a food-safety recommendation.'))
            db.execute("INSERT INTO food_items(kitchen_id,status,data) VALUES(?,'active',?)",(kid,json.dumps(food)))
    with credentials.open('x') as output:
        json.dump(dict(notice='Synthetic demo accounts only. Keep this file private; distribute directly to the instructor.',accounts=[dict(email=email,password=passwords[email],role=role,kitchen='S01G10 Demo Kitchen' if index<2 else 'Separate Demo Kitchen') for index,(email,role) in enumerate(ACCOUNTS)]),output,indent=2)
    credentials.chmod(0o600)
    return credentials


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--db',default='.data/demo/kitchen.sqlite3')
    args=parser.parse_args()
    credentials=seed(args.db)
    print(f'Created isolated demo database: {args.db}')
    print(f'Credentials saved privately to: {credentials}')
    print(f'Start it with: python3 server.py --db {args.db}')
