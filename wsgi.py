"""Production WSGI entry point: gunicorn --workers 1 --threads 4 wsgi:application.

The web host must terminate HTTPS, keep the SQLite directory persistent, and set
LMB_ORIGIN to the public origin. This adapter uses the same handlers as server.py.
"""
from email.message import Message
from http import HTTPStatus
import os
from pathlib import Path
from server import ApplicationHandler, ROOT, Store


class WSGIHandler(ApplicationHandler):
    def __init__(self, store, environ):
        self.server = store
        self.command = environ['REQUEST_METHOD']
        self.path = environ.get('PATH_INFO', '/')
        self.rfile = environ['wsgi.input']
        self.client_address = (environ.get('REMOTE_ADDR', 'unknown'), 0)
        self.headers = Message()
        for name, value in environ.items():
            if name.startswith('HTTP_'):
                self.headers[name[5:].replace('_', '-')] = value
        self.headers['Content-Length'] = environ.get('CONTENT_LENGTH') or '0'
        self.output = None

    def respond(self, status, body, content_type='application/json; charset=utf-8'):
        body, headers = self.response_parts(body, content_type)
        self.output = (status, headers, body)


def create_application(db_path=None, secure=None, origin=None):
    store = Store(db_path or os.getenv('LMB_DB', str(ROOT / '.data' / 'kitchen.sqlite3')),
                  secure=os.getenv('LMB_SECURE_COOKIE') == '1' if secure is None else secure,
                  origin=origin if origin is not None else os.getenv('LMB_ORIGIN'))

    def app(environ, start_response):
        handler = WSGIHandler(store, environ)
        handler.handle_request()
        status, headers, body = handler.output
        start_response(f'{status} {HTTPStatus(status).phrase}', headers)
        return [body]

    return app


application = create_application()
