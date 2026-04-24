from http.server import BaseHTTPRequestHandler
import json
import os
import time
import requests

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, x-api-key')
        self.end_headers()

    def do_POST(self):
        # CORS
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()

        # Auth
        api_key = self.headers.get('x-api-key')
        expected_key = os.environ.get('A11Y_API_PASSWORD')
        
        if not api_key or api_key != expected_key:
            self.wfile.write(json.dumps({'error': 'Unauthorized. Provide a valid x-api-key header.'}).encode())
            return

        # Groq key
        groq_key = os.environ.get('GROQ_API_KEY')
        if not groq_key:
            self.wfile.write(json.dumps({'error': 'Server misconfiguration: GROQ_API_KEY not set.'}).encode())
            return

        # Input validation
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        try:
            data = json.loads(post_data)
        except json.JSONDecodeError:
            self.wfile.write(json.dumps({'error': 'Invalid JSON body.'}).encode())
            return

        html = data.get('html')
        styles = data.get('styles', [])
        url = data.get('url', '')

        if not html or not isinstance(html, str):
            self.wfile.write(json.dumps({'error': 'Missing required field: html (string).'}).encode())
            return

        if len(html) > 200000:
            self.wfile.write(json.dumps({'error': 'html payload too large (max 200 000 chars). Trim to <body> contents.'}).encode())
            return

        # Build prompt
        styles_block = ""
        if styles:
            styles_block = f"\n\n## Computed styles sample (selector → properties)\n{json.dumps(styles, indent=2)}"

        system_prompt = """You are an expert web accessibility auditor. 
Your job is to analyse HTML (and optional computed CSS) and return a JSON array of accessibility issues with precise, actionable fixes.

RULES:
- Return ONLY a raw JSON object — no markdown fences, no prose, no extra keys.
- Each issue must have exactly these fields:
    id          string   sequential "a11y-N"
    selector    string   valid CSS selector targeting the element
    type        string   one of: missing_alt | low_contrast | missing_label | wrong_heading_order |
                         small_touch_target | missing_role | keyboard_trap | missing_lang |
                         empty_link | color_only_info | auto_play_media | missing_skip_link | other
    severity    string   "critical" | "warning" | "suggestion"
    impact      string   "high" | "medium" | "low" (based on how many users it affects)
    wcag        string   the specific WCAG 2.1 success criteria (e.g. "1.1.1" or "1.4.3")
    description string   one sentence explaining the problem
    fix         object   exactly ONE of:
                           { "style": "<css-property>", "value": "<new-value>" }
                           { "attribute": "<attr-name>", "value": "<new-value>" }
                           { "removeAttribute": "<attr-name>" }
                           { "insertBefore": "<html-string>" }
                           { "wrapWith": "<tag>", "attributes": {} }
                           { "textContent": "<new-text>" }

- For low_contrast: calculate the WCAG contrast ratio yourself. 
- For missing_alt: generate meaningful descriptive alt text.
- Do not report issues that don't exist. Quality over quantity.
- Add a top-level "summary" string.
- Add a top-level "score" integer (0-100) where 100 is perfectly accessible and 0 is unusable.

Output schema:
{
  "issues": [ ...issue objects... ],
  "summary": "...",
  "score": 85
}"""

        user_prompt = f"""Audit this page for accessibility issues.
Page URL (reference only): {url or 'unknown'}
{styles_block}

## HTML
{html}"""

        # Call Groq
        t0 = time.time()
        try:
            response = requests.post(
                'https://api.groq.com/openai/v1/chat/completions',
                headers={
                    'Authorization': f'Bearer {groq_key}',
                    'Content-Type': 'application/json',
                },
                json={
                    'model': 'meta-llama/llama-4-scout-17b-16e-instruct',
                    'temperature': 0.1,
                    'max_tokens': 4096,
                    'response_format': {'type': 'json_object'},
                    'messages': [
                        {'role': 'system', 'content': system_prompt},
                        {'role': 'user', 'content': user_prompt},
                    ],
                }
            )
        except Exception as e:
            self.wfile.write(json.dumps({'error': 'Failed to reach Groq API.', 'detail': str(e)}).encode())
            return

        ms = int((time.time() - t0) * 1000)

        if not response.ok:
            self.wfile.write(json.dumps({
                'error': 'Groq API returned an error.',
                'status': response.status_code,
                'detail': response.text,
            }).encode())
            return

        # Parse response
        try:
            groq_data = response.json()
            raw_content = groq_data['choices'][0]['message']['content']
            parsed = json.loads(raw_content)
        except Exception as e:
            self.wfile.write(json.dumps({'error': 'Could not parse Groq response.', 'detail': str(e)}).encode())
            return

        # Return
        self.wfile.write(json.dumps({
            'issues': parsed.get('issues', []),
            'summary': parsed.get('summary', ''),
            'score': parsed.get('score', 100),
            'model': 'meta-llama/llama-4-scout-17b-16e-instruct',
            'ms': ms,
        }).encode())
