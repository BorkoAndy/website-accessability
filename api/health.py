from http.server import BaseHTTPRequestHandler
import json
import os
from datetime import datetime

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()

        response = {
            'status': 'ok',
            'service': 'a11y-ai-api',
            'model': 'meta-llama/llama-4-scout-17b-16e-instruct',
            'provider': 'groq',
            'env': {
                'groq_key_set': bool(os.environ.get('GROQ_API_KEY')),
                'api_password_set': bool(os.environ.get('A11Y_API_PASSWORD')),
            },
            'timestamp': datetime.utcnow().isoformat() + 'Z',
        }

        self.wfile.write(json.dumps(response).encode())
