/**
 * POST /api/analyze
 *
 * Headers:
 *   x-api-key: <your API password>
 *   Content-Type: application/json
 *
 * Body:
 *   {
 *     "url":  "https://example.com",          // for reference only (not fetched)
 *     "html": "<html>...</html>",              // outerHTML of document
 *     "styles": [                              // optional: computed styles per selector
 *       { "selector": "h1", "color": "#aaa", "backgroundColor": "#fff", "fontSize": "14px" },
 *       ...
 *     ]
 *   }
 *
 * Response 200:
 *   {
 *     "issues": [
 *       {
 *         "id": "a11y-1",
 *         "selector": "img.hero",
 *         "type": "missing_alt",
 *         "severity": "critical",
 *         "description": "Image has no alt attribute",
 *         "fix": { "attribute": "alt", "value": "Hero banner showing mountain scenery" }
 *       },
 *       {
 *         "id": "a11y-2",
 *         "selector": "p.subtitle",
 *         "type": "low_contrast",
 *         "severity": "critical",
 *         "description": "Text color #aaaaaa on white fails WCAG AA (ratio ~2.3:1, needs 4.5:1)",
 *         "fix": { "style": "color", "value": "#767676" }
 *       },
 *       ...
 *     ],
 *     "summary": "Found 7 issues: 3 critical, 2 warnings, 2 suggestions.",
 *     "model": "meta-llama/llama-4-scout-17b-16e-instruct",
 *     "ms": 1240
 *   }
 */

export default async function handler(req, res) {
  // ── CORS ──────────────────────────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.A11Y_API_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized. Provide a valid x-api-key header.' });
  }

  // ── Groq key ──────────────────────────────────────────────────────────────
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return res.status(500).json({ error: 'Server misconfiguration: GROQ_API_KEY not set.' });
  }

  // ── Input validation ──────────────────────────────────────────────────────
  const { html, styles = [], url = '' } = req.body ?? {};

  if (!html || typeof html !== 'string') {
    return res.status(400).json({ error: 'Missing required field: html (string).' });
  }

  if (html.length > 200_000) {
    return res.status(413).json({ error: 'html payload too large (max 200 000 chars). Trim to <body> contents.' });
  }

  // ── Build prompt ──────────────────────────────────────────────────────────
  const stylesBlock = styles.length
    ? `\n\n## Computed styles sample (selector → properties)\n${JSON.stringify(styles, null, 2)}`
    : '';

  const systemPrompt = `You are an expert web accessibility auditor. 
Your job is to analyse HTML (and optional computed CSS) and return a JSON array of accessibility issues with precise, actionable fixes.

RULES:
- Return ONLY a raw JSON object — no markdown fences, no prose, no extra keys.
- Each issue must have exactly these fields:
    id          string   sequential "a11y-N"
    selector    string   valid CSS selector targeting the element (be specific, use id/class/attribute)
    type        string   one of: missing_alt | low_contrast | missing_label | wrong_heading_order |
                         small_touch_target | missing_role | keyboard_trap | missing_lang |
                         empty_link | color_only_info | auto_play_media | missing_skip_link | other
    severity    string   "critical" | "warning" | "suggestion"
    description string   one sentence explaining the problem, including current values where relevant
    fix         object   exactly ONE of:
                           { "style": "<css-property>", "value": "<new-value>" }
                           { "attribute": "<attr-name>", "value": "<new-value>" }
                           { "removeAttribute": "<attr-name>" }
                           { "insertBefore": "<html-string>" }   // e.g. adding a skip link
                           { "wrapWith": "<tag>", "attributes": {} }
                           { "textContent": "<new-text>" }

- For low_contrast: calculate the WCAG contrast ratio yourself. Only report it if it actually fails.
  Provide the specific color value that achieves at least 4.5:1 (normal text) or 3:1 (large text ≥18px/14px bold).
- For missing_alt: generate meaningful descriptive alt text from surrounding context.
- For missing_label: suggest a concise, accurate label based on input name/placeholder/context.
- Do not report issues that don't exist. Quality over quantity.
- Add a top-level "summary" string: "Found N issues: X critical, Y warnings, Z suggestions."

Output schema:
{
  "issues": [ ...issue objects... ],
  "summary": "Found N issues: ..."
}`;

  const userPrompt = `Audit this page for accessibility issues.
Page URL (reference only): ${url || 'unknown'}
${stylesBlock}

## HTML
${html}`;

  // ── Call Groq ─────────────────────────────────────────────────────────────
  const t0 = Date.now();

  let groqRes;
  try {
    groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        temperature: 0.1,   // low temp = consistent structured output
        max_tokens: 4096,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt   },
        ],
      }),
    });
  } catch (err) {
    return res.status(502).json({ error: 'Failed to reach Groq API.', detail: err.message });
  }

  const ms = Date.now() - t0;

  if (!groqRes.ok) {
    const errBody = await groqRes.text();
    return res.status(502).json({
      error: 'Groq API returned an error.',
      status: groqRes.status,
      detail: errBody,
    });
  }

  // ── Parse response ────────────────────────────────────────────────────────
  let groqData;
  try {
    groqData = await groqRes.json();
  } catch {
    return res.status(502).json({ error: 'Could not parse Groq response as JSON.' });
  }

  const raw = groqData.choices?.[0]?.message?.content ?? '';

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Groq sometimes wraps in ```json ... ``` even with json_object mode
    const match = raw.match(/```(?:json)?\s*([\s\S]+?)```/);
    if (match) {
      try { parsed = JSON.parse(match[1]); } catch { /* fall through */ }
    }
    if (!parsed) {
      return res.status(502).json({
        error: 'Model returned non-JSON output.',
        raw: raw.slice(0, 500),
      });
    }
  }

  // ── Return ────────────────────────────────────────────────────────────────
  return res.status(200).json({
    issues:  parsed.issues  ?? [],
    summary: parsed.summary ?? '',
    model:   'meta-llama/llama-4-scout-17b-16e-instruct',
    ms,
  });
}
