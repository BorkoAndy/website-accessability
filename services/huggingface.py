import httpx
import base64
import os
import time

HF_API_TOKEN = os.environ.get("HF_API_TOKEN")

# Model: SDXL — best free quality on HF
HF_MODEL = "stabilityai/stable-diffusion-xl-base-1.0"
HF_URL = f"https://api-inference.huggingface.co/models/{HF_MODEL}"

# Max wait time for model to load (HF sometimes cold-starts)
MAX_WAIT_SECONDS = 60
POLL_INTERVAL = 5

async def generate(prompt: str) -> str:
    """
    Generate image via Hugging Face Inference API.
    Handles model loading/queued states automatically.
    Returns base64-encoded PNG string.
    Raises Exception on failure.
    """
    if not HF_API_TOKEN:
        raise Exception("Hugging Face API token not configured")

    headers = {
        "Authorization": f"Bearer {HF_API_TOKEN}",
        "Content-Type": "application/json",
    }

    payload = {
        "inputs": prompt,
        "options": {
            "wait_for_model": True,  # wait instead of returning 503
            "use_cache": False,
        },
        "parameters": {
            "num_inference_steps": 25,
            "guidance_scale": 7.5,
        }
    }

    elapsed = 0
    async with httpx.AsyncClient(timeout=120.0) as client:
        while elapsed < MAX_WAIT_SECONDS:
            response = await client.post(HF_URL, headers=headers, json=payload)

            # Model still loading — wait and retry
            if response.status_code == 503:
                estimated = response.json().get("estimated_time", POLL_INTERVAL)
                wait = min(float(estimated), POLL_INTERVAL)
                time.sleep(wait)
                elapsed += wait
                continue

            if response.status_code != 200:
                raise Exception(f"Hugging Face API error {response.status_code}: {response.text}")

            image_bytes = response.content
            if not image_bytes:
                raise Exception("Hugging Face returned empty image")

            return base64.b64encode(image_bytes).decode("utf-8")

    raise Exception("Hugging Face model did not become ready in time")
