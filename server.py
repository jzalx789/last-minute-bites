"""Last Minute Bites: same-origin, standard-library prototype server."""
import argparse
import calendar
from collections import defaultdict, deque
from contextlib import contextmanager
from datetime import date, datetime, timedelta
import hashlib
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import re
import secrets
import sqlite3
import threading
import time
import unicodedata
from urllib.parse import urlsplit
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

ROOT = Path(__file__).resolve().parent
CATEGORIES = ['produce', 'dairy', 'protein', 'cooked', 'condiments', 'dry', 'other']
LOCATIONS = ['fridge', 'freezer', 'pantry', 'other']
INGREDIENTS = {
    'tomato': ['tomato', 'tomatoes', '番茄', '蕃茄'],
    'egg': ['egg', 'eggs', '雞蛋', '蛋'],
    'rice': ['rice', 'cooked rice', '米飯', '白飯', '飯'],
    'spinach': ['spinach', '菠菜'],
    'pasta': ['pasta', 'spaghetti', '意粉', '意大利麵'],
    'tofu': ['tofu', '豆腐'],
    'soy_sauce': ['soy sauce', '豉油', '醬油'],
    'oil': ['oil', 'cooking oil', '食油', '油'],
    'salt': ['salt', '鹽'],
}
SCHEMA = '''
PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, csrf TEXT NOT NULL, expires REAL NOT NULL);
CREATE TABLE IF NOT EXISTS kitchens(id INTEGER PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS memberships(user_id INTEGER PRIMARY KEY REFERENCES users(id), kitchen_id INTEGER NOT NULL REFERENCES kitchens(id), role TEXT NOT NULL CHECK(role IN ('owner','editor')));
CREATE UNIQUE INDEX IF NOT EXISTS one_owner ON memberships(kitchen_id) WHERE role='owner';
CREATE TABLE IF NOT EXISTS invitations(code TEXT PRIMARY KEY, kitchen_id INTEGER UNIQUE NOT NULL REFERENCES kitchens(id), expires REAL NOT NULL);
CREATE TABLE IF NOT EXISTS food_items(id INTEGER PRIMARY KEY AUTOINCREMENT, kitchen_id INTEGER NOT NULL REFERENCES kitchens(id), version INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL CHECK(status IN ('active','used')), data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS user_preferences(user_id INTEGER PRIMARY KEY REFERENCES users(id), data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS mutation_keys(user_id INTEGER NOT NULL REFERENCES users(id), request_key TEXT NOT NULL, kitchen_id INTEGER NOT NULL REFERENCES kitchens(id), body_hash TEXT NOT NULL, result TEXT NOT NULL, PRIMARY KEY(user_id,request_key));
PRAGMA user_version=2;
'''
DEFAULT_PREFS = dict(language='en', text_size='standard', default_view='categories', date_format='iso', reminders=True, reminder_days=3, timezone='Asia/Hong_Kong')


class Problem(Exception):
    def __init__(self, status, code):
        self.status, self.code = status, code


def require(condition, code='invalid_input', status=400):
    if not condition:
        raise Problem(status, code)


def text_value(value, maximum=120):
    require(isinstance(value, str) and 0 < len(value.strip()) <= maximum)
    return value.strip()


def integer(value, low, high):
    require(type(value) is int and low <= value <= high)
    return value


def calendar_date(value):
    require(isinstance(value, str) and bool(re.fullmatch(r'\d{4}-\d{2}-\d{2}', value)), 'invalid_date')
    try:
        return date.fromisoformat(value)
    except ValueError:
        raise Problem(400, 'invalid_date')


def calculate_date(production, amount, unit):
    start = calendar_date(production)
    integer(amount, 1, 10000)
    require(unit in ['days', 'months', 'years'])
    try:
        if unit == 'days':
            return (start + timedelta(days=amount)).isoformat()
        months = start.year * 12 + start.month - 1 + amount * (12 if unit == 'years' else 1)
        year, month = divmod(months, 12)
        month += 1
        return date(year, month, min(start.day, calendar.monthrange(year, month)[1])).isoformat()
    except (ValueError, OverflowError):
        raise Problem(400, 'invalid_date')


def normal(value):
    return ' '.join(unicodedata.normalize('NFKC', value).lower().split())


def validate_food(data):
    result = dict(name=text_value(data.get('name')), category=data.get('category', 'other'), location=data.get('location', 'other'))
    require(result['category'] in CATEGORIES and result['location'] in LOCATIONS)
    note = data.get('note', '')
    require(isinstance(note, str) and len(note) <= 1000)
    result['note'] = note.strip()
    ingredient = data.get('ingredient', '')
    require(ingredient == '' or ingredient in INGREDIENTS)
    result['ingredient'] = ingredient
    source = data.get('date_source')
    require(source in ['printed', 'production', 'unknown'])
    result.update(date_source=source, date_kind='unspecified', effective_date=None, production_date=None, shelf_life=None, shelf_unit=None)
    if source != 'unknown':
        kind = data.get('date_kind')
        require(kind in ['use_by', 'best_before', 'unspecified'])
        result['date_kind'] = kind
        if source == 'printed':
            result['effective_date'] = calendar_date(data.get('effective_date')).isoformat()
        else:
            result.update(production_date=data.get('production_date'), shelf_life=data.get('shelf_life'), shelf_unit=data.get('shelf_unit'))
            result['effective_date'] = calculate_date(result['production_date'], result['shelf_life'], result['shelf_unit'])
            require(data.get('date_confirmed') is True, 'confirm_calculation')
    return result


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def password_hash(value, salt=None):
    salt = salt or secrets.token_hex(16)
    hashed = hashlib.scrypt(value.encode(), salt=bytes.fromhex(salt), n=16384, r=8, p=1).hex()
    return f'{salt}:{hashed}'


def eligible(food, today):
    return food['status'] == 'active' and not (food['date_kind'] == 'use_by' and food['effective_date'] and food['effective_date'] < today)


class Store:
    """Application state shared by the development HTTP and deployment WSGI adapters."""

    def __init__(self, db_path, secure=False, origin=None):
        self.db_path, self.secure, self.origin = str(db_path), secure, origin
        Path(db_path).parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        new_database = not Path(db_path).exists()
        with self.connect() as db:
            db.executescript(SCHEMA)
        if new_database:
            Path(db_path).chmod(0o600)
        self.recipes = json.loads((ROOT / 'recipes.json').read_text())
        self.rate_lock = threading.Lock()
        self.attempts = defaultdict(deque)

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.db_path, timeout=10)
        db.row_factory = sqlite3.Row
        db.execute('PRAGMA foreign_keys=ON')
        try:
            with db:
                yield db
        finally:
            db.close()

    def rate_limit(self, key, count=20, window=300):
        now = time.time()
        with self.rate_lock:
            for old in list(self.attempts):
                if not self.attempts[old] or self.attempts[old][-1] < now - window:
                    del self.attempts[old]
            queue = self.attempts[key]
            while queue and queue[0] < now - window:
                queue.popleft()
            require(len(queue) < count, 'rate_limited', 429)
            queue.append(now)


class ApplicationHandler:
    def log_message(self, fmt, *args):
        # Never log request bodies, cookies, invitation codes or query strings.
        pass

    def do_GET(self):
        self.handle_request()

    def do_POST(self):
        self.handle_request()

    def response_parts(self, body, content_type):
        if not isinstance(body, bytes):
            body = json.dumps(body, ensure_ascii=False).encode()
        headers = [
            ('Content-Type', content_type), ('Content-Length', str(len(body))),
            ('Cache-Control', 'no-store'), ('X-Content-Type-Options', 'nosniff'),
            ('Referrer-Policy', 'no-referrer'),
            ('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()'),
            ('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; worker-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'")
        ]
        if getattr(self, 'cookie', None):
            flags = '; Secure' if self.server.secure else ''
            headers.append(('Set-Cookie', f'lmb_session={self.cookie}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800{flags}'))
        return body, headers

    def new_session(self, db, user_id=None):
        token, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
        db.execute('INSERT INTO sessions VALUES(?,?,?,?)', (digest(token), user_id, csrf, time.time() + 7 * 86400))
        self.cookie = token
        self.session = dict(token=digest(token), user_id=user_id, csrf=csrf)

    def handle_request(self):
        self.cookie = None
        path = urlsplit(self.path).path
        try:
            if not path.startswith('/api/'):
                require(self.command == 'GET', 'not_found', 404)
                if path == '/healthz':
                    with self.server.connect() as db:
                        db.execute('SELECT 1 FROM users LIMIT 1').fetchone()
                    return self.respond(200, {'status': 'ok', 'version': '0.2'})
                files = {
                    '/': ('index.html', 'text/html; charset=utf-8'),
                    '/app.js': ('app.js', 'text/javascript; charset=utf-8'),
                    '/mobile.js': ('mobile.js', 'text/javascript; charset=utf-8'),
                    '/style.css': ('style.css', 'text/css; charset=utf-8'),
                    '/sw.js': ('sw.js', 'text/javascript; charset=utf-8'),
                    '/manifest.webmanifest': ('manifest.webmanifest', 'application/manifest+json'),
                    '/icons/icon-192.png': ('icons/icon-192.png', 'image/png'),
                    '/icons/icon-512.png': ('icons/icon-512.png', 'image/png'),
                    '/icons/apple-touch-icon.png': ('icons/apple-touch-icon.png', 'image/png'),
                    '/vendor/jsQR.js': ('vendor/jsQR.js', 'text/javascript; charset=utf-8'),
                    '/vendor/qrcode.js': ('vendor/qrcode.js', 'text/javascript; charset=utf-8'),
                }
                require(path in files, 'not_found', 404)
                filename, mime = files[path]
                return self.respond(200, (ROOT / 'static' / filename).read_bytes(), mime)
            with self.server.connect() as db:
                # Serialize writes, including membership checks and optimistic versions.
                db.execute('BEGIN IMMEDIATE')
                db.execute('DELETE FROM sessions WHERE expires < ?', (time.time(),))
                cookies = SimpleCookie()
                try:
                    cookies.load(self.headers.get('Cookie', ''))
                except Exception:
                    pass
                token = cookies.get('lmb_session')
                self.session = db.execute('SELECT * FROM sessions WHERE token=? AND expires>?', (digest(token.value) if token else '', time.time())).fetchone()
                if not self.session:
                    require(self.command == 'GET' and path == '/api/state', 'unauthorized', 401)
                    self.new_session(db)
                data = {}
                if self.command == 'POST':
                    origin = self.headers.get('Origin')
                    expected_origin = self.server.origin or ('https://' if self.server.secure else 'http://') + self.headers.get('Host', '')
                    require(origin is None or origin == expected_origin, 'csrf', 403)
                    require(secrets.compare_digest(self.headers.get('X-CSRF-Token', ''), self.session['csrf']), 'csrf', 403)
                    length = int(self.headers.get('Content-Length', '0'))
                    require(0 < length <= 16384, 'invalid_input', 413)
                    try:
                        data = json.loads(self.rfile.read(length))
                    except (ValueError, UnicodeDecodeError):
                        raise Problem(400, 'invalid_input')
                    require(isinstance(data, dict))
                result = self.route(db, path, data)
            self.respond(200, result)
        except Problem as error:
            self.respond(error.status, {'error': {'code': error.code}})
        except (ValueError, TypeError, KeyError):
            self.respond(400, {'error': {'code': 'invalid_input'}})
        except sqlite3.Error:
            self.respond(503, {'error': {'code': 'storage_unavailable'}})
        except Exception:
            import traceback
            traceback.print_exc()
            self.respond(500, {'error': {'code': 'internal_error'}})

    def membership(self, db, owner=False):
        member = db.execute('SELECT m.*, k.name FROM memberships m JOIN kitchens k ON k.id=m.kitchen_id WHERE user_id=?', (self.session['user_id'],)).fetchone()
        require(member is not None, 'no_kitchen', 403)
        require(not owner or member['role'] == 'owner', 'owner_only', 403)
        return member

    def prefs(self, db):
        row = db.execute('SELECT data FROM user_preferences WHERE user_id=?', (self.session['user_id'],)).fetchone()
        return json.loads(row['data'])

    def foods(self, db, kitchen_id, today):
        result = []
        for row in db.execute('SELECT * FROM food_items WHERE kitchen_id=?', (kitchen_id,)):
            food = dict(json.loads(row['data']), id=row['id'], version=row['version'], status=row['status'])
            food['eligible'] = eligible(food, today)
            result.append(food)
        return result

    def route(self, db, path, data):
        uid = self.session['user_id']
        if self.command == 'GET' and path == '/api/state':
            state = dict(csrf=self.session['csrf'], user=None)
            if not uid:
                return state
            user = db.execute('SELECT id,email FROM users WHERE id=?', (uid,)).fetchone()
            prefs = self.prefs(db)
            today = datetime.now(ZoneInfo(prefs['timezone'])).date().isoformat()
            member = db.execute('SELECT m.*, k.name FROM memberships m JOIN kitchens k ON k.id=m.kitchen_id WHERE user_id=?', (uid,)).fetchone()
            state.update(user=dict(user), preferences=prefs, today=today, kitchen=None, foods=[], members=[], ingredients=INGREDIENTS)
            if member:
                state['kitchen'] = dict(id=member['kitchen_id'], name=member['name'], role=member['role'])
                state['foods'] = self.foods(db, member['kitchen_id'], today)
                state['members'] = [dict(row) for row in db.execute('SELECT u.id,u.email,m.role FROM memberships m JOIN users u ON u.id=m.user_id WHERE kitchen_id=? ORDER BY m.role DESC,u.id', (member['kitchen_id'],))]
            return state
        require(self.command == 'POST', 'not_found', 404)
        if path in ['/api/register', '/api/login']:
            self.server.rate_limit(('auth-ip', self.client_address[0]), 30)
            email = text_value(data.get('email'), 254).lower()
            require(bool(re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', email)), 'invalid_email')
            password = data.get('password')
            require(isinstance(password, str) and 10 <= len(password) <= 128, 'password_length')
            self.server.rate_limit(('auth-email', email), 15)
            user = db.execute('SELECT * FROM users WHERE email=?', (email,)).fetchone()
            if path.endswith('register'):
                require(data.get('confirm_password') == password, 'password_mismatch')
                require(user is None, 'registration_unavailable', 409)
                uid = db.execute('INSERT INTO users(email,password) VALUES(?,?)', (email, password_hash(password))).lastrowid
                prefs = dict(DEFAULT_PREFS)
                tz = data.get('timezone', prefs['timezone'])
                try:
                    ZoneInfo(tz)
                    prefs['timezone'] = tz
                except (ZoneInfoNotFoundError, TypeError, ValueError):
                    pass
                db.execute('INSERT INTO user_preferences VALUES(?,?)', (uid, json.dumps(prefs)))
            else:
                stored = user['password'] if user else password_hash('dummy-password-value', '00' * 16)
                require(secrets.compare_digest(password_hash(password, stored.split(':')[0]), stored) and user is not None, 'invalid_credentials', 401)
                uid = user['id']
            db.execute('DELETE FROM sessions WHERE token=?', (self.session['token'],))
            self.new_session(db, uid)
            return dict(ok=True, csrf=self.session['csrf'])
        require(uid is not None, 'unauthorized', 401)
        if path == '/api/logout':
            db.execute('DELETE FROM sessions WHERE token=?', (self.session['token'],))
            self.new_session(db)
            return dict(ok=True, csrf=self.session['csrf'])
        if path == '/api/preferences':
            prefs = self.prefs(db)
            options = dict(language=['en', 'zh-Hant'], text_size=['standard', 'large'], default_view=['categories', 'use_first'], date_format=['iso', 'dmy', 'mdy'], reminder_days=[1, 3, 7])
            for key, choices in options.items():
                if key in data:
                    require(data[key] in choices and (key != 'reminder_days' or type(data[key]) is int))
                    prefs[key] = data[key]
            if 'reminders' in data:
                require(type(data['reminders']) is bool)
                prefs['reminders'] = data['reminders']
            db.execute('UPDATE user_preferences SET data=? WHERE user_id=?', (json.dumps(prefs), uid))
            return dict(ok=True)
        if path == '/api/kitchen/create':
            require(not db.execute('SELECT 1 FROM memberships WHERE user_id=?', (uid,)).fetchone(), 'already_member', 409)
            kid = db.execute('INSERT INTO kitchens(name) VALUES(?)', (text_value(data.get('name'), 80),)).lastrowid
            db.execute('INSERT INTO memberships VALUES(?,?,?)', (uid, kid, 'owner'))
            return dict(ok=True)
        if path in ['/api/invitation/preview', '/api/invitation/accept']:
            self.server.rate_limit(('invite', uid), 20)
            require(not db.execute('SELECT 1 FROM memberships WHERE user_id=?', (uid,)).fetchone(), 'already_member', 409)
            code = text_value(data.get('code'), 100)
            invite = db.execute('SELECT i.*,k.name FROM invitations i JOIN kitchens k ON k.id=i.kitchen_id WHERE code=? AND expires>?', (digest(code), time.time())).fetchone()
            require(invite is not None, 'invalid_invitation', 404)
            if path.endswith('accept'):
                require(data.get('confirmed') is True, 'confirmation_required')
                db.execute('INSERT INTO memberships VALUES(?,?,?)', (uid, invite['kitchen_id'], 'editor'))
            return dict(name=invite['name'], role='editor', expires=invite['expires'])
        if path == '/api/date/preview':
            return dict(effective_date=calculate_date(data.get('production_date'), data.get('shelf_life'), data.get('shelf_unit')))
        member = self.membership(db)
        kid = member['kitchen_id']
        if path == '/api/invitation/replace':
            self.membership(db, owner=True)
            code = secrets.token_urlsafe(24)
            expiry = time.time() + 7 * 86400
            db.execute('DELETE FROM invitations WHERE kitchen_id=?', (kid,))
            db.execute('INSERT INTO invitations VALUES(?,?,?)', (digest(code), kid, expiry))
            return dict(code=code, expires=expiry)
        if path == '/api/member/remove':
            self.membership(db, owner=True)
            target = integer(data.get('user_id'), 1, 2**63 - 1)
            require(data.get('confirmed') is True, 'confirmation_required')
            removed = db.execute("DELETE FROM memberships WHERE kitchen_id=? AND user_id=? AND role='editor'", (kid, target)).rowcount
            require(removed == 1, 'member_not_removable', 403)
            return dict(ok=True)
        if path == '/api/kitchen/leave':
            require(member['role'] == 'editor', 'owner_cannot_leave', 403)
            require(data.get('confirmed') is True, 'confirmation_required')
            db.execute('DELETE FROM memberships WHERE user_id=?', (uid,))
            return dict(ok=True)
        if path == '/api/kitchen/clear':
            self.membership(db, owner=True)
            require(data.get('confirmed') is True and data.get('kitchen_name') == member['name'], 'confirmation_required')
            db.execute('DELETE FROM food_items WHERE kitchen_id=?', (kid,))
            return dict(ok=True)
        if path == '/api/food/create':
            food = validate_food(data)
            key = data.get('request_id')
            body_hash = digest(json.dumps(food, sort_keys=True))
            if key is not None:
                require(isinstance(key, str) and bool(re.fullmatch(r'[A-Za-z0-9-]{16,64}', key)))
                previous = db.execute('SELECT * FROM mutation_keys WHERE user_id=? AND request_key=?', (uid, key)).fetchone()
                if previous:
                    require(previous['kitchen_id'] == kid and previous['body_hash'] == body_hash, 'request_reused', 409)
                    result = json.loads(previous['result'])
                    require(db.execute('SELECT 1 FROM food_items WHERE id=? AND kitchen_id=?', (result['id'], kid)).fetchone(), 'request_reused', 409)
                    return result
            fid = db.execute("INSERT INTO food_items(kitchen_id,status,data) VALUES(?,'active',?)", (kid, json.dumps(food))).lastrowid
            result = dict(id=fid, version=1)
            if key is not None:
                db.execute('INSERT INTO mutation_keys VALUES(?,?,?,?,?)', (uid, key, kid, body_hash, json.dumps(result)))
            return result
        if path in ['/api/food/update', '/api/food/delete', '/api/food/used']:
            fid = integer(data.get('id'), 1, 2**63 - 1)
            version = integer(data.get('version'), 1, 2**63 - 1)
            row = db.execute('SELECT * FROM food_items WHERE id=? AND kitchen_id=?', (fid, kid)).fetchone()
            require(row is not None, 'food_not_found', 404)
            require(row['version'] == version, 'conflict', 409)
            if path.endswith('delete'):
                require(data.get('confirmed') is True, 'confirmation_required')
                db.execute('DELETE FROM food_items WHERE id=?', (fid,))
            elif path.endswith('used'):
                require(data.get('confirmed') is True, 'confirmation_required')
                db.execute("UPDATE food_items SET status='used',version=version+1 WHERE id=?", (fid,))
            else:
                require(row['status'] == 'active', 'food_used', 409)
                food = validate_food(data)
                db.execute('UPDATE food_items SET data=?,version=version+1 WHERE id=?', (json.dumps(food), fid))
            return dict(ok=True)
        if path == '/api/recipes':
            ids = data.get('selected', [])
            require(isinstance(ids, list) and len(ids) <= 500 and all(type(i) is int for i in ids))
            prefs = self.prefs(db)
            today = datetime.now(ZoneInfo(prefs['timezone'])).date().isoformat()
            foods = [f for f in self.foods(db, kid, today) if f['eligible']]
            selected = [f for f in foods if f['id'] in ids]
            available = {f['ingredient'] for f in foods if f['ingredient']}
            result = []
            for recipe in self.server.recipes:
                matched = [f['id'] for f in selected if f['ingredient'] in recipe['ingredients']]
                missing = [i for i in recipe['ingredients'] if i not in available]
                result.append(dict(recipe, matched=matched, available=[i for i in recipe['ingredients'] if i in available], missing=missing, check_at_home=[i for i in missing if i in ['oil', 'salt', 'soy_sauce']]))
            result.sort(key=lambda r: (-len(r['matched']), len(r['missing']), r['id']))
            return dict(recipes=result, selected=[f['id'] for f in selected], removed=[i for i in ids if i not in {f['id'] for f in selected}])
        raise Problem(404, 'not_found')


class Handler(ApplicationHandler, BaseHTTPRequestHandler):
    def respond(self, status, body, content_type='application/json; charset=utf-8'):
        body, headers = self.response_parts(body, content_type)
        self.send_response(status)
        for key, value in headers:
            self.send_header(key, value)
        self.end_headers()
        self.wfile.write(body)


class AppServer(Store, ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, address, db_path, secure=False, origin=None):
        Store.__init__(self, db_path, secure=secure, origin=origin)
        ThreadingHTTPServer.__init__(self, address, Handler)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--host', default=os.getenv('LMB_HOST', '127.0.0.1'))
    parser.add_argument('--port', type=int, default=int(os.getenv('LMB_PORT', os.getenv('PORT', '8000'))))
    parser.add_argument('--db', default=os.getenv('LMB_DB', str(ROOT / '.data' / 'kitchen.sqlite3')))
    args = parser.parse_args()
    server = AppServer((args.host, args.port), args.db, secure=os.getenv('LMB_SECURE_COOKIE') == '1', origin=os.getenv('LMB_ORIGIN'))
    print(f'Last Minute Bites listening on {args.host}:{server.server_port}', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
