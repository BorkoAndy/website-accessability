# A11y AI API

AI-powered web accessibility analyser. A small Vercel serverless API backed by
Groq (llama-4-scout-17b) that accepts a DOM snapshot and returns structured,
actionable accessibility fixes — plus a drop-in client widget.

---

## Project structure

```
a11y-api/
├── api/
│   ├── analyze.js       ← POST /api/analyze  (main endpoint)
│   └── health.js        ← GET  /api/health   (status check)
├── public/
│   ├── index.html       ← Demo page with intentional a11y issues
│   └── a11y-widget.js   ← Drop-in client script for any website
├── .env.example
├── .gitignore
├── package.json
└── vercel.json
```

---

## Deploy to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "initial"
gh repo create a11y-ai-api --public --push --source=.
```

### 2. Import in Vercel

Go to https://vercel.com/new → Import your repo → Deploy (no build command needed).

### 3. Set environment variables

In your Vercel project → **Settings → Environment Variables**, add:

| Name | Value |
|---|---|
| `GROQ_API_KEY` | Your key from https://console.groq.com |
| `A11Y_API_PASSWORD` | Any strong random string (this is your client password) |

Redeploy after saving.

### 4. Verify

```bash
curl https://YOUR_APP.vercel.app/api/health
```

Should return:
```json
{
  "status": "ok",
  "env": { "groq_key_set": true, "api_password_set": true }
}
```

---

## API reference

### POST /api/analyze

Analyse a page for accessibility issues.

**Headers**

| Header | Required | Description |
|---|---|---|
| `Content-Type` | yes | `application/json` |
| `x-api-key` | yes | Your `A11Y_API_PASSWORD` value |

**Request body**

```json
{
  "url": "https://example.com",
  "html": "<html>...</html>",
  "styles": [
    {
      "selector": "h1.hero",
      "color": "rgb(170,170,170)",
      "backgroundColor": "rgb(255,255,255)",
      "fontSize": "32px",
      "fontWeight": "700"
    }
  ]
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `html` | string | yes | Full page HTML. Max 200 000 chars. Trim to `<body>` if needed. |
| `styles` | array | no | Computed styles sample — greatly improves contrast analysis |
| `url` | string | no | Page URL, passed to the model for context only |

**Response 200**

```json
{
  "issues": [
    {
      "id": "a11y-1",
      "selector": "img.hero-banner",
      "type": "missing_alt",
      "severity": "critical",
      "description": "Image has no alt attribute. Screen readers will announce the filename instead.",
      "fix": { "attribute": "alt", "value": "Team photo showing five colleagues at a whiteboard" }
    },
    {
      "id": "a11y-2",
      "selector": "p.subtitle",
      "type": "low_contrast",
      "severity": "critical",
      "description": "Text color #aaaaaa on white background has a contrast ratio of ~2.3:1, below the WCAG AA minimum of 4.5:1.",
      "fix": { "style": "color", "value": "#767676" }
    },
    {
      "id": "a11y-3",
      "selector": "input[name='email']",
      "type": "missing_label",
      "severity": "critical",
      "description": "Input has no associated <label>. Screen readers cannot announce its purpose.",
      "fix": { "insertBefore": "<label for=\"email\" style=\"display:block;font-size:14px;margin-bottom:4px\">Email address</label>" }
    }
  ],
  "summary": "Found 5 issues: 3 critical, 1 warning, 1 suggestion.",
  "model": "meta-llama/llama-4-scout-17b-16e-instruct",
  "ms": 1340
}
```

**Fix object types**

| Shape | Effect |
|---|---|
| `{ "style": "color", "value": "#595959" }` | Sets `element.style.color` |
| `{ "attribute": "alt", "value": "..." }` | Sets an HTML attribute |
| `{ "removeAttribute": "aria-hidden" }` | Removes an attribute |
| `{ "insertBefore": "<label>...</label>" }` | Inserts HTML before the element |
| `{ "textContent": "Read more about pricing" }` | Replaces element text |

**Issue types**

`missing_alt` · `low_contrast` · `missing_label` · `wrong_heading_order` ·
`small_touch_target` · `missing_role` · `keyboard_trap` · `missing_lang` ·
`empty_link` · `color_only_info` · `auto_play_media` · `missing_skip_link` · `other`

**Error responses**

| Status | Meaning |
|---|---|
| 400 | Missing or invalid `html` field |
| 401 | Wrong or missing `x-api-key` |
| 413 | HTML payload over 200 000 chars |
| 502 | Groq API unreachable or returned an error |

---

### GET /api/health

Public — no auth required. Returns service status.

```json
{
  "status": "ok",
  "service": "a11y-ai-api",
  "model": "meta-llama/llama-4-scout-17b-16e-instruct",
  "provider": "groq",
  "env": { "groq_key_set": true, "api_password_set": true },
  "timestamp": "2025-04-23T10:00:00.000Z"
}
```

---

## Client widget

Drop one `<script>` tag into any page:

```html
<script
  src="https://YOUR_APP.vercel.app/a11y-widget.js"
  data-api="https://YOUR_APP.vercel.app/api/analyze"
  data-key="YOUR_API_PASSWORD"
></script>
```

Or initialise manually (useful if you load it via a bundler):

```js
A11yWidget.init({
  api: 'https://YOUR_APP.vercel.app/api/analyze',
  key: 'YOUR_API_PASSWORD',
});
```

The widget adds a fixed ♿ button to the page. On click it:
1. Captures the DOM and computed styles
2. Calls `/api/analyze`
3. Shows a panel listing every issue with severity badges
4. Lets the user apply or undo each fix individually, or all at once
5. Highlights the affected element on hover

---

## Testing with curl

```bash
export API="https://YOUR_APP.vercel.app"
export KEY="YOUR_API_PASSWORD"

curl -s -X POST "$API/api/analyze" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $KEY" \
  -d '{
    "url": "https://example.com",
    "html": "<html lang=\"\"><body><img src=\"hero.jpg\"><p style=\"color:#bbb\">Hello world</p><a href=\"/\"></a></body></html>",
    "styles": [
      { "selector": "p", "color": "rgb(187,187,187)", "backgroundColor": "rgb(255,255,255)", "fontSize": "16px", "fontWeight": "400" }
    ]
  }' | jq .
```

---

## Groq free tier limits

The free tier on Groq allows ~30 requests/minute for llama-4-scout-17b.
For high-traffic use, add rate limiting middleware or upgrade your Groq plan.
