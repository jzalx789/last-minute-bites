from pathlib import Path
import importlib.util
import json
import tempfile
import unittest
from server import Store

spec=importlib.util.spec_from_file_location('seed_demo',Path(__file__).resolve().parents[1]/'scripts/seed_demo.py')
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class DemoTests(unittest.TestCase):
    def test_demo_seeding_is_isolated_and_does_not_overwrite(self):
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'demo.sqlite3'
            credentials=module.seed(path)
            accounts=json.loads(credentials.read_text())['accounts']
            self.assertEqual(len(accounts),3)
            self.assertEqual(len({a['password'] for a in accounts}),3)
            with Store(path).connect() as db:
                self.assertEqual(db.execute('SELECT COUNT(*) FROM users').fetchone()[0],3)
                self.assertEqual(db.execute('SELECT COUNT(*) FROM food_items').fetchone()[0],7)
            with self.assertRaises(FileExistsError):module.seed(path)
