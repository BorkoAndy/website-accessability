from http.server import BaseHTTPRequestHandler
import json
import os
import sys
from urllib.parse import urlparse

# Import our handlers
import health
import analyze

class handler(BaseHTTPRequestHandler):

    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-API-Key")

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        self._route()

    def do_POST(self):
        self._route()

    def _route(self):
        path = urlparse(self.path).path.rstrip("/")
        
        # In the working project, we handle static asset fallback here
        if path == "" or path == "/index.html":
            try:
                base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                index_file = os.path.join(base_dir, "index.html")
                if os.path.exists(index_file):
                    with open(index_file, "rb") as f:
                        content = f.read()
                    self.send_response(200)
                    self.send_header("Content-Type", "text/html")
                    self.send_header("Content-Length", str(len(content)))
                    self._send_cors_headers()
                    self.end_headers()
                    self.wfile.write(content)
                    return
            except Exception:
                pass

        # Handle API calls
        if path.startswith("/api"):
            # ROUTING
            if path == "/api/health":
                # We forward the current request context to health.py
                health.handler.do_GET(self)
                return
                
            elif path == "/api/analyze":
                if self.command == "POST":
                    # We forward the current request context to analyze.py
                    analyze.handler.do_POST(self)
                else:
                    self.send_response(405)
                    self._send_cors_headers()
                    self.end_headers()
                return
                
            else:
                self.send_response(404)
                self._send_cors_headers()
                self.send_header("Content-Type", "application/json")
                body = json.dumps({"error": "Endpoint not found", "path": path}).encode()
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return
                
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"Not found")

    def log_message(self, *args):
        pass
