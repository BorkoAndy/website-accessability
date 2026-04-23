# AI Image Generator — Setup Guide

## Architecture
```
DomainTechnik (index.php + save.php)
     ↓ POST {prompt, api_key}
Vercel (api/generate.py)
     ├── Cloudflare Workers AI (primary)
     └── Hugging Face (fallback)
     ↓ returns base64 image
DomainTechnik → user approves → save.php → /uploads/
```

---

## 1. Cloudflare Workers AI Setup (Free)

1. Go to https://dash.cloudflare.com
2. Left sidebar → **Workers & Pages** → **Workers AI**
3. Note your **Account ID** (shown in the right panel on any Workers page)
4. Go to **My Profile** → **API Tokens** → **Create Token**
   - Use template: **Workers AI**
   - Permissions: `Workers AI — Read`
5. Copy the token — you won't see it again

---

## 2. Hugging Face Setup (Free)

1. Go to https://huggingface.co/settings/tokens
2. Click **New token**
   - Name: `image-gen`
   - Role: `Read`
3. Copy the token

---

## 3. Deploy to Vercel

### Option A: Vercel CLI
```bash
npm i -g vercel
cd vercel-app/
vercel deploy
```

### Option B: GitHub
1. Push `vercel-app/` to a GitHub repo
2. Go to https://vercel.com/new → import the repo
3. Vercel auto-detects Python

### Set Environment Variables in Vercel
Go to your project → **Settings** → **Environment Variables** and add:

| Key | Value |
|-----|-------|
| `CLOUDFLARE_ACCOUNT_ID` | your CF account ID |
| `CLOUDFLARE_API_TOKEN` | your CF API token |
| `HF_API_TOKEN` | your Hugging Face token |
| `API_SECRET` | any password you choose (e.g. `mySecret123`) |

---

## 4. Deploy to DomainTechnik

1. Upload `index.php` and `save.php` to your hosting via FTP/cPanel
2. Create an `uploads/` folder and set permissions to `755`
3. Edit `index.php` — update these two lines:
   ```js
   const VERCEL_API = 'https://YOUR-PROJECT.vercel.app/api/generate';
   const API_KEY    = 'mySecret123'; // same as API_SECRET env var on Vercel
   ```

---

## 5. Test It

1. Open `index.php` in your browser
2. Enter a prompt and click **Generate Image**
3. Wait 10–40 seconds (Cloudflare is faster, HF can be slow on cold start)
4. Approve → check your `uploads/` folder for the saved PNG

---

## File Structure

```
vercel-app/                  → deploy to Vercel
├── api/
│   └── generate.py          → main endpoint (POST /api/generate)
├── services/
│   ├── cloudflare.py        → Cloudflare Workers AI
│   ├── huggingface.py       → Hugging Face fallback
│   └── __init__.py
├── requirements.txt         → httpx
└── vercel.json

domaintechnik/               → upload to shared hosting
├── index.php                → frontend UI
├── save.php                 → saves approved images
└── uploads/                 → generated images land here (auto-created)
```

---

## Troubleshooting

**"Both generation services failed"**
→ Check your Vercel env vars are set correctly. Redeploy after adding them.

**Cloudflare fails, HF works**
→ Normal — CF may hit rate limits. Fallback is working as designed.

**HF returns 503 for a long time**
→ Model is cold-starting. First request of the day can take 30–60s.

**Image not saving**
→ Check `uploads/` folder exists and has write permissions (755) on DomainTechnik.

**CORS error in browser**
→ Make sure `index.php` and `save.php` are on the same domain.
