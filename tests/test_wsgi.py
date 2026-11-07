"""Run the same full HTTP contract against the deployment adapter."""
import threading
from wsgiref.simple_server import make_server, WSGIRequestHandler
import test_app
from wsgi import create_application


class QuietHandler(WSGIRequestHandler):
    def log_message(self,*args):
        pass


class WSGIIntegrationTests(test_app.IntegrationTests):
    def start_server(self):
        application=create_application(self.db_path,secure=False)
        self.server=make_server('127.0.0.1',0,application,handler_class=QuietHandler)
        self.thread=threading.Thread(target=self.server.serve_forever,daemon=True)
        self.thread.start()
        self.base=f'http://127.0.0.1:{self.server.server_port}'
