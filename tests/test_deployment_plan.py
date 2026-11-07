import importlib.util
from pathlib import Path
import unittest

spec=importlib.util.spec_from_file_location('deploy_pa',Path(__file__).resolve().parents[1]/'scripts/deploy_pythonanywhere.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)


class FakeAPI:
    def __init__(self,listing,config=None):self.listing=listing;self.config=config;self.writes=[]
    def call(self,method,path,data=None,file=None):
        if method!='GET':self.writes.append((method,path));return {}
        return self.listing if path=='/webapps/' else self.config


class DeploymentPlanTests(unittest.TestCase):
    def test_foreign_existing_site_is_preserved_without_any_write(self):
        api=FakeAPI([dict(domain_name='someone-else.example')])
        with self.assertRaises(RuntimeError):module.apply(module.plan('s01g10demo'),api)
        self.assertEqual(api.writes,[])

    def test_unrelated_matching_domain_is_preserved_even_with_update(self):
        domain='s01g10demo.pythonanywhere.com'
        api=FakeAPI([dict(domain_name=domain)],dict(source_directory='/home/s01g10demo/other-project'))
        with self.assertRaises(RuntimeError):module.apply(module.plan('s01g10demo'),api,update=True)
        self.assertEqual(api.writes,[])

    def test_missing_python_prerequisite_does_not_upload_or_create(self):
        class OlderAPI(FakeAPI):
            def call(self,method,path,data=None,file=None):
                if path=='/default_python3_version/':return dict(available_python3_versions=['3.10','3.11'])
                return super().call(method,path,data,file)
        api=OlderAPI([])
        with self.assertRaises(RuntimeError):module.apply(module.plan('s01g10demo'),api)
        self.assertEqual(api.writes,[])

    def test_public_readiness_and_demo_handoff_execute_against_real_app(self):
        import json
        import tempfile
        import threading
        from server import AppServer
        with tempfile.TemporaryDirectory() as directory:
            original=module.ROOT
            module.ROOT=Path(directory)
            server=AppServer(('127.0.0.1',0),Path(directory)/'runtime.sqlite3')
            thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
            try:
                output=module.verify_and_demo(f'http://127.0.0.1:{server.server_port}',demo=True)
                handoff=json.loads(output.read_text())
                self.assertEqual(len(handoff['accounts']),3)
                self.assertEqual(output.stat().st_mode & 0o777,0o600)
                with server.connect() as db:
                    self.assertEqual(db.execute('SELECT COUNT(*) FROM food_items').fetchone()[0],7)
                    self.assertEqual(db.execute('SELECT COUNT(*) FROM memberships').fetchone()[0],3)
            finally:
                server.shutdown();server.server_close();thread.join();module.ROOT=original
