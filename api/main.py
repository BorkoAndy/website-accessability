from http.server import BaseHTTPRequestHandler
import json
import os
import sys
from urllib.parse import urlparse

# Add api directory to path so sibling modules can be imported
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import health
import analyze

class handler(BaseHTTPRequestHandler):

    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, x-api-key")

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        self._route()

    def do_POST(self):
        self._route()

    def _route(self):
        path = urlparse(self.path).path.rstrip("/")

        if path == "/api/health":
            health.handler.do_GET(self)

        elif path == "/api/analyze":
            if self.command == "POST":
                analyze.handler.do_POST(self)
            else:
                self.send_response(405)
                self._send_cors_headers()
                self.end_headers()

        else:
            self.send_response(404)
            self._send_cors_headers()
            self.send_header("Content-Type", "application/json")
            body = json.dumps({"error": "Endpoint not found", "path": path}).encode()
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

    def log_message(self, *args):
        pass
