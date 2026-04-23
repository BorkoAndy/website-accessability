from http.server import BaseHTTPRequestHandler
import json
import os
import sys
import asyncio

# Add parent dir to path so we can import services
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services import cloudflare, huggingface

API_SECRET = os.environ.get("API_SECRET", "changeme")


def run_async(coro):
    """Run async coroutine in sync context (Vercel serverless)."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


class handler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        """Handle CORS preflight."""
        self._send_cors_headers(200)
        self.end_headers()

    def do_POST(self):
        try:
            # Read request body
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            data = json.loads(body)
        except Exception:
            return self._error(400, "Invalid JSON body")

        # Auth check
        provided_key = data.get("api_key", "")
        if provided_key != API_SECRET:
            return self._error(401, "Unauthorized — invalid API key")

        # Validate prompt
        prompt = data.get("prompt", "").strip()
        if not prompt:
            return self._error(400, "Missing or empty prompt")

        if len(prompt) > 500:
            return self._error(400, "Prompt too long (max 500 characters)")

        # Try Cloudflare first, fall back to Hugging Face
        image_base64 = None
        model_used = None
        error_cf = None
        error_hf = None

        try:
            image_base64 = run_async(cloudflare.generate(prompt))
            model_used = "cloudflare"
        except Exception as e:
            error_cf = str(e)

        if image_base64 is None:
            try:
                image_base64 = run_async(huggingface.generate(prompt))
                model_used = "huggingface"
            except Exception as e:
                error_hf = str(e)

        if image_base64 is None:
            return self._error(502, "Both generation services failed", {
                "cloudflare_error": error_cf,
                "huggingface_error": error_hf,
            })

        # Success
        self._send_cors_headers(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({
            "status": "ok",
            "model_used": model_used,
            "image": image_base64,          # base64 PNG
            "mime_type": "image/png",
            "prompt": prompt,
        }).encode())

    def _send_cors_headers(self, status_code: int):
        self.send_response(status_code)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _error(self, code: int, message: str, extra: dict = None):
        self._send_cors_headers(code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        payload = {"status": "error", "message": message}
        if extra:
            payload.update(extra)
        self.wfile.write(json.dumps(payload).encode())
