# This file is used as the global entrypoint for Vercel's Python builder
from http.server import BaseHTTPRequestHandler
import json

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({
            'message': 'A11y API entrypoint'
        }).encode())

# Vercel's newest builder sometimes requires an 'app' WSGI/ASGI variable 
# in the entrypoint file to recognize it as a valid Python project.
def app(environ, start_response):
    start_response('200 OK', [('Content-Type', 'application/json')])
    return [b'{"message": "A11y API root"}']
