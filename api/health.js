/**
 * GET /api/health
 * Public endpoint — no auth required.
 * Returns service status and whether env vars are configured.
 */
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  res.status(200).json({
    status: 'ok',
    service: 'a11y-ai-api',
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    provider: 'groq',
    env: {
      groq_key_set: !!process.env.GROQ_API_KEY,
      api_password_set: !!process.env.A11Y_API_PASSWORD,
    },
    timestamp: new Date().toISOString(),
  });
}
