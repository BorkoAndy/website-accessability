import httpx
import base64
import os

CLOUDFLARE_ACCOUNT_ID = os.environ.get("CLOUDFLARE_ACCOUNT_ID")
CLOUDFLARE_API_TOKEN = os.environ.get("CLOUDFLARE_API_TOKEN")

# Model: SDXL Lightning — fast, free, good quality
CF_MODEL = "@cf/bytedance/stable-diffusion-xl-lightning"

async def generate(prompt: str) -> str:
    """
    Generate image via Cloudflare Workers AI.
    Returns base64-encoded PNG string.
    Raises Exception on failure.
    """
    if not CLOUDFLARE_ACCOUNT_ID or not CLOUDFLARE_API_TOKEN:
        raise Exception("Cloudflare credentials not configured")

    url = f"https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/ai/run/{CF_MODEL}"

    headers = {
        "Authorization": f"Bearer {CLOUDFLARE_API_TOKEN}",
        "Content-Type": "application/json",
    }

    payload = {
        "prompt": prompt,
        "num_steps": 4,  # Lightning model works best with 4 steps
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(url, headers=headers, json=payload)

    if response.status_code != 200:
        raise Exception(f"Cloudflare API error {response.status_code}: {response.text}")

    # CF returns raw image bytes
    image_bytes = response.content
    if not image_bytes:
        raise Exception("Cloudflare returned empty image")

    return base64.b64encode(image_bytes).decode("utf-8")
