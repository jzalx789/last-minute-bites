import concurrent.futures
import http.cookiejar
import json
from pathlib import Path
import sqlite3
import tempfile
import threading
import time
import unittest
import urllib.error
import urllib.request
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from server import AppServer, Problem, calculate_date, validate_food


class Client:
    def __init__(self, base):
        self.base = base
        self.jar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))
        self.csrf = self.state()['csrf']

    def request(self, path, data=None, headers=None):
        h = {'Content-Type': 'application/json', 'X-CSRF-Token': self.csrf} if data is not None else {}
        h.update(headers or {})
        request = urllib.request.Request(self.base + '/api/' + path, data=None if data is None else json.dumps(data).encode(), headers=h)
        try:
            response = self.opener.open(request, timeout=10)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            result = json.load(response)
            if 'csrf' in result:
                self.csrf = result['csrf']
            return response.status, result

    def state(self):
        status, result = self.request('state')
        assert status == 200, result
        return result

    def post(self, path, data=None, expected=200):
        status, result = self.request(path, data or {})
        assert status == expected, (path, status, result)
        return result

    def register(self, email):
        return self.post('register', dict(email=email, password='test-password-123', confirm_password='test-password-123', timezone='Asia/Hong_Kong'))

    def food(self, **overrides):
        return self.post('food/create', dict(dict(name='Tomato', category='produce', location='fridge', date_source='unknown', ingredient='tomato'), **overrides))


class IntegrationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp.name) / 'test.sqlite3'
        self.start_server()
        self.owner = Client(self.base)
        self.owner.register('owner@example.test')
        self.owner.post('kitchen/create', {'name': 'Our kitchen'})
        self.editor = Client(self.base)
        self.editor.register('editor@example.test')
        self.code = self.owner.post('invitation/replace')['code']
        self.editor.post('invitation/preview', {'code': self.code})
        self.editor.post('invitation/accept', {'code': self.code, 'confirmed': True})
        self.other = Client(self.base)
        self.other.register('other@example.test')
        self.other.post('kitchen/create', {'name': 'Other kitchen'})

    def start_server(self):
        self.server = AppServer(('127.0.0.1', 0), self.db_path)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.base = f'http://127.0.0.1:{self.server.server_port}'

    def stop_server(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()

    def tearDown(self):
        self.stop_server()
        self.temp.cleanup()

    def test_auth_rotation_password_hash_logout_and_login(self):
        client = Client(self.base)
        old = next(iter(client.jar)).value
        client.register('fourth@example.test')
        self.assertNotEqual(old, next(iter(client.jar)).value)
        self.assertEqual(client.state()['user']['email'], 'fourth@example.test')
        with sqlite3.connect(self.db_path) as db:
            stored = db.execute('SELECT password FROM users WHERE email=?', ('fourth@example.test',)).fetchone()[0]
        self.assertNotIn('test-password', stored)
        client.post('logout')
        self.assertIsNone(client.state()['user'])
        client.post('login', dict(email='fourth@example.test', password='wrong-password-123'), 401)
        client.post('login', dict(email='fourth@example.test', password='test-password-123'))
        self.assertEqual(client.state()['user']['email'], 'fourth@example.test')

    def test_registration_validation_and_no_orphan_accounts(self):
        guest = Client(self.base)
        guest.post('register', dict(email='bad', password='test-password-123', confirm_password='test-password-123'), 400)
        guest.post('register', dict(email='valid@example.test', password='short', confirm_password='short'), 400)
        guest.post('register', dict(email='valid@example.test', password='test-password-123', confirm_password='different'), 400)
        self.assertIsNone(guest.state()['user'])
        self.assertEqual(len(self.owner.state()['members']), 2)

    def test_csrf_origin_cookie_flags_and_static_isolation(self):
        self.assertEqual(self.owner.request('food/create', {}, {'X-CSRF-Token': ''})[0], 403)
        self.assertEqual(self.owner.request('food/create', {}, {'Origin': 'https://evil.example'})[0], 403)
        with urllib.request.urlopen(self.base) as response:
            self.assertIn("script-src 'self'", response.headers['Content-Security-Policy'])
            self.assertIn(b'app.js', response.read())
        for path in ['/server.py', '/.data/kitchen.sqlite3', '/../server.py']:
            with self.assertRaises(urllib.error.HTTPError) as error:
                urllib.request.urlopen(self.base+path)
            self.assertEqual(error.exception.code, 404)
            error.exception.close()
        with urllib.request.urlopen(self.base+'/api/state') as response:
            cookie = response.headers['Set-Cookie']
            self.assertIn('HttpOnly', cookie)
            self.assertIn('SameSite=Lax', cookie)

    def test_shared_crud_scoping_and_persistence(self):
        created = self.owner.food()
        food = self.editor.state()['foods'][0]
        self.assertEqual(food['id'], created['id'])
        self.assertEqual(self.other.state()['foods'], [])
        self.other.post('food/update', dict(food, name='stolen'), 404)
        self.other.post('food/delete', dict(id=food['id'], version=1, confirmed=True), 404)
        self.editor.post('food/update', dict(food, name='Tomatoes updated'))
        food = self.owner.state()['foods'][0]
        self.assertEqual(food['name'], 'Tomatoes updated')
        self.assertEqual(food['version'], 2)
        self.editor.post('food/used', dict(id=food['id'], version=2, confirmed=True))
        food = self.owner.state()['foods'][0]
        self.assertEqual(food['status'], 'used')
        self.assertFalse(food['eligible'])
        self.assertEqual(food['version'], 3)
        self.owner.post('food/delete', dict(id=food['id'], version=3, confirmed=True))
        self.assertEqual(self.editor.state()['foods'], [])

    def test_editor_management_denied_and_owner_cannot_be_removed(self):
        oid = self.owner.state()['user']['id']
        for path, data in [('invitation/replace', {}), ('member/remove', {'user_id': oid, 'confirmed': True}), ('kitchen/clear', {'confirmed': True, 'kitchen_name': 'Our kitchen'})]:
            self.editor.post(path, data, 403)
        self.owner.post('member/remove', dict(user_id=oid, confirmed=True), 403)
        self.owner.post('kitchen/leave', dict(confirmed=True), 403)
        self.assertEqual(len(self.editor.state()['members']), 2)

    def test_invite_replacement_expiry_and_one_kitchen_rule(self):
        guest = Client(self.base)
        guest.register('guest@example.test')
        preview = guest.post('invitation/preview', {'code': self.code})
        self.assertEqual(preview['name'], 'Our kitchen')
        self.assertIsNone(guest.state()['kitchen'])
        new_code = self.owner.post('invitation/replace')['code']
        guest.post('invitation/accept', dict(code=self.code, confirmed=True), 404)
        guest.post('invitation/accept', dict(code=new_code, confirmed=False), 400)
        self.assertEqual(len(self.editor.state()['members']), 2)
        with sqlite3.connect(self.db_path) as db:
            db.execute('UPDATE invitations SET expires=?', (time.time()-1,))
        guest.post('invitation/preview', dict(code=new_code), 404)
        self.other.post('invitation/accept', dict(code=new_code, confirmed=True), 409)
        self.editor.post('kitchen/create', dict(name='Second kitchen'), 409)

    def test_revocation_rechecks_every_read_and_write(self):
        self.owner.food()
        eid = self.editor.state()['user']['id']
        self.owner.post('member/remove', dict(user_id=eid, confirmed=True))
        state = self.editor.state()
        self.assertIsNone(state['kitchen'])
        self.assertEqual(state['foods'], [])
        self.assertEqual(state['members'], [])
        for endpoint in ['food/create', 'food/update', 'food/delete', 'recipes', 'invitation/replace']:
            self.editor.post(endpoint, {}, 403)
        self.assertEqual(len(self.owner.state()['foods']), 1)
        self.editor.post('kitchen/create', dict(name='A new kitchen'))
        self.assertEqual(self.editor.state()['foods'], [])

    def test_editor_leave_keeps_food_and_can_rejoin(self):
        self.editor.food()
        self.editor.post('kitchen/leave', dict(confirmed=False), 400)
        self.editor.post('kitchen/leave', dict(confirmed=True))
        self.assertIsNone(self.editor.state()['kitchen'])
        self.assertEqual(len(self.owner.state()['foods']), 1)
        self.editor.post('invitation/accept', dict(code=self.code, confirmed=True))
        self.assertEqual(len(self.editor.state()['foods']), 1)

    def test_clear_confirmation_scope_preferences_and_accounts(self):
        self.owner.food()
        self.other.food()
        self.owner.post('preferences', dict(language='zh-Hant', reminder_days=7))
        self.owner.post('kitchen/clear', dict(confirmed=False, kitchen_name='Our kitchen'), 400)
        self.owner.post('kitchen/clear', dict(confirmed=True, kitchen_name='wrong'), 400)
        self.assertEqual(len(self.editor.state()['foods']), 1)
        self.owner.post('kitchen/clear', dict(confirmed=True, kitchen_name='Our kitchen'))
        state = self.owner.state()
        self.assertEqual(state['foods'], [])
        self.assertEqual(len(state['members']), 2)
        self.assertEqual(state['preferences']['reminder_days'], 7)
        self.assertEqual(len(self.other.state()['foods']), 1)
        self.assertIsNotNone(state['user'])

    def test_real_concurrent_writes_reject_stale_version(self):
        self.owner.food()
        food = self.owner.state()['foods'][0]
        with concurrent.futures.ThreadPoolExecutor(2) as pool:
            results = list(pool.map(lambda pair: pair[0].request('food/update', dict(food, name=pair[1]))[0], [(self.owner, 'Owner edit'), (self.editor, 'Editor edit')]))
        self.assertEqual(sorted(results), [200, 409])
        self.assertEqual(self.owner.state()['foods'][0]['version'], 2)
        self.editor.post('food/delete', dict(id=food['id'], version=1, confirmed=True), 409)

    def test_date_modes_normalize_stale_fields_and_validation(self):
        data = dict(name='Frozen spinach', date_source='production', date_kind='unspecified', production_date='2024-01-31', shelf_life=1, shelf_unit='months', date_confirmed=True, category='produce', location='freezer', ingredient='spinach')
        self.owner.post('food/create', dict(data, date_confirmed=False), 400)
        self.owner.post('food/create', dict(data, shelf_life=0), 400)
        self.owner.post('food/create', dict(data, production_date='2024-02-30'), 400)
        self.owner.post('food/create', data)
        food = self.editor.state()['foods'][0]
        self.assertEqual(food['effective_date'], '2024-02-29')
        self.assertEqual(food['location'], 'freezer')
        self.owner.post('food/update', dict(food, date_source='unknown'))
        normalized = self.editor.state()['foods'][0]
        for key in ['effective_date','production_date','shelf_life','shelf_unit']:
            self.assertIsNone(normalized[key])
        self.assertEqual(normalized['date_kind'], 'unspecified')

    def test_matching_excludes_expired_used_deleted_and_foreign_items(self):
        def create(name, ingredient, **kwargs):
            return self.owner.post('food/create', dict(dict(name=name, ingredient=ingredient, date_source='unknown'), **kwargs))['id']
        tomato = create('Tomato', 'tomato')
        egg = create('Egg', 'egg')
        expired = create('Old rice', 'rice', **{'date_source':'printed', 'date_kind':'use_by', 'effective_date':'2001-01-01'})
        # Best-before remains distinct from safety restrictions.
        quality = create('Oil', 'oil', **{'date_source':'printed', 'date_kind':'best_before', 'effective_date':'2001-01-01'})
        used = create('Used salt', 'salt')
        self.owner.post('food/used', dict(id=used, version=1, confirmed=True))
        deleted = create('Deleted rice', 'rice')
        self.owner.post('food/delete', dict(id=deleted, version=1, confirmed=True))
        foreign = self.other.food()['id']
        result = self.owner.post('recipes', dict(selected=[tomato, egg, expired, quality, used, deleted, foreign, 99999]))
        self.assertEqual(set(result['selected']), {tomato,egg,quality})
        self.assertEqual(set(result['removed']), {expired,used,deleted,foreign,99999})
        first = result['recipes'][0]
        self.assertEqual(first['id'], 1)
        self.assertEqual(set(first['matched']), {tomato,egg,quality})
        self.assertIn('rice', first['missing'])
        self.assertIn('salt', first['check_at_home'])
        self.assertNotIn('rice', first['available'])
        self.assertEqual(len(result['recipes']), 4)
        self.assertEqual(len(self.owner.state()['foods']), 5)
        empty = self.owner.post('recipes', dict(selected=[]))
        self.assertTrue(all(not r['matched'] for r in empty['recipes']))

    def test_preferences_are_private_and_validate_types(self):
        self.owner.post('preferences', dict(language='zh-Hant', text_size='large', default_view='use_first', date_format='dmy', reminders=False, reminder_days=7))
        self.assertEqual(self.owner.state()['preferences']['language'], 'zh-Hant')
        self.assertEqual(self.editor.state()['preferences']['language'], 'en')
        self.assertTrue(self.editor.state()['preferences']['reminders'])
        self.owner.post('preferences', dict(reminders='false'), 400)
        self.owner.post('preferences', dict(reminder_days=True), 400)
        self.owner.post('preferences', dict(language='xx'), 400)

    def test_plain_text_payload_round_trip(self):
        name = '<img src=x onerror="window.injected=1">'
        self.owner.post('food/create', dict(name=name, note='<script>alert(1)</script>',date_source='unknown'))
        food = self.editor.state()['foods'][0]
        self.assertEqual(food['name'], name)
        self.assertEqual(food['note'], '<script>alert(1)</script>')

    def test_restart_preserves_auth_kitchen_food_and_preferences(self):
        self.owner.food()
        self.owner.post('preferences', dict(language='zh-Hant'))
        self.stop_server()
        self.start_server()
        self.owner.base = self.base
        state = self.owner.state()
        self.assertEqual(state['kitchen']['name'], 'Our kitchen')
        self.assertEqual(state['foods'][0]['name'], 'Tomato')
        self.assertEqual(state['preferences']['language'], 'zh-Hant')

    def test_rate_limits_and_unauthenticated_write_denial(self):
        self.assertEqual(Client(self.base).request('food/create', {})[0], 401)
        for _ in range(20):
            self.other.post('invitation/preview', dict(code='bad'), 409)
        self.other.post('invitation/preview', dict(code='bad'), 429)
        for _ in range(3):
            self.owner.food()
        self.assertEqual(len(self.owner.state()['foods']), 3)

    def test_full_partial_and_no_recipe_matches_do_not_change_food(self):
        ids = []
        for key in ['tomato', 'egg', 'rice', 'oil', 'salt']:
            ids.append(self.owner.food(name=key, ingredient=key)['id'])
        state = self.owner.state()['foods']
        matched = self.owner.post('recipes', dict(selected=ids))['recipes'][0]
        self.assertEqual(matched['id'], 1)
        self.assertEqual(len(matched['matched']), 5)
        self.assertEqual(matched['missing'], [])
        partial = self.owner.post('recipes', dict(selected=[ids[0]]))['recipes']
        self.assertTrue(any(r['matched'] for r in partial))
        unmapped = self.owner.food(name='unrecognised food', ingredient='')['id']
        no_match = self.owner.post('recipes', dict(selected=[unmapped]))
        self.assertTrue(all(not r['matched'] for r in no_match['recipes']))
        self.assertEqual(self.owner.state()['foods'][:5], state)

    def test_storage_failure_rolls_back_and_can_retry(self):
        with sqlite3.connect(self.db_path) as db:
            db.execute("CREATE TRIGGER block_insert BEFORE INSERT ON food_items BEGIN SELECT RAISE(ABORT, 'storage failure'); END")
        self.owner.post('food/create', dict(name='Retained input',date_source='unknown'), 503)
        self.assertEqual(self.owner.state()['foods'], [])
        with sqlite3.connect(self.db_path) as db:
            db.execute('DROP TRIGGER block_insert')
        self.owner.food(name='Retained input')
        self.assertEqual(self.editor.state()['foods'][0]['name'], 'Retained input')

    def test_expired_session_is_not_reused(self):
        with sqlite3.connect(self.db_path) as db:
            db.execute('UPDATE sessions SET expires=0 WHERE user_id=?', (self.editor.state()['user']['id'],))
        self.assertIsNone(self.editor.state()['user'])
        self.editor.post('food/create', dict(name='Denied',date_source='unknown'), 401)

    def test_add_retry_is_idempotent_and_scoped(self):
        import uuid
        key=str(uuid.uuid4())
        food=dict(name='Retry-safe tomato', date_source='unknown',request_id=key)
        first=self.owner.post('food/create',food)
        self.assertEqual(self.owner.post('food/create',food),first)
        self.assertEqual(len(self.owner.state()['foods']),1)
        self.owner.post('food/create',dict(food,name='changed payload'),409)
        self.assertNotEqual(self.other.post('food/create',food)['id'],first['id'])
        self.owner.post('food/delete',dict(first,confirmed=True))
        self.owner.post('food/create',food,409)

    def test_mobile_shell_and_health_are_available(self):
        for path,expected in [('/healthz',b'0.2'),('/manifest.webmanifest',b'standalone'),('/sw.js',b'/api/'),('/mobile.js',b'getUserMedia'),('/icons/icon-192.png',b'PNG')]:
            with urllib.request.urlopen(self.base+path) as response:
                self.assertEqual(response.status,200)
                self.assertIn(expected,response.read())
        with urllib.request.urlopen(self.base+'/') as response:
            self.assertIn('camera=(self)',response.headers['Permissions-Policy'])



class DateTests(unittest.TestCase):
    def test_calendar_edges(self):
        for args, expected in [(('2024-02-29',1,'years'),'2025-02-28'),(('2023-01-31',1,'months'),'2023-02-28'),(('2024-12-31',2,'months'),'2025-02-28'),(('2024-02-28',1,'days'),'2024-02-29')]:
            self.assertEqual(calculate_date(*args), expected)
        for args in [('9999-12-31',1,'days'),('2024-01-01',True,'months'),('2024-01-01',1.5,'years'),('2024-01-01',-1,'days'),('2024-1-1',1,'days')]:
            with self.assertRaises(Problem):
                calculate_date(*args)


if __name__ == '__main__':
    unittest.main()
