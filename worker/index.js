/* StudioMate AI relay (Cloudflare Worker).
   Holds the Gemini key as an encrypted secret (GEMINI_API_KEY) and forwards only the app's own
   requests to Google, so the key never appears in the public app. */

const MODELS = new Set([
  'gemini-3-flash-preview', 'gemini-3.1-flash-lite',
  'gemini-3.1-flash-image', 'gemini-2.5-flash-image',
]);

export default {
  async fetch(req, env) {
    const allowed = (env.ALLOWED_ORIGINS || 'https://harimhs.github.io').split(',').map(s => s.trim());
    const origin = req.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    };
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    // only the app's own pages may use it (browsers always send Origin on these requests)
    if (req.method !== 'POST' || !allowed.includes(origin)) return new Response('Forbidden', { status: 403, headers: cors });

    const url = new URL(req.url);
    // free image generation on Cloudflare Workers AI: POST /cf-image {prompt}
    if (url.pathname === '/cf-image') {
      const { prompt } = await req.json().catch(() => ({}));
      if (!prompt || prompt.length > 2000) return new Response('Bad prompt', { status: 400, headers: cors });
      const out = await env.AI.run('@cf/black-forest-labs/flux-1-schnell', { prompt, steps: 6 });
      const bytes = Uint8Array.from(atob(out.image), c => c.charCodeAt(0));
      return new Response(bytes, { headers: { ...cors, 'Content-Type': 'image/jpeg' } });
    }
    const m = url.pathname.match(/^\/v1beta\/models\/([\w.-]+):generateContent$/);
    if (!m || !MODELS.has(m[1])) return new Response('Not found', { status: 404, headers: cors });

    const body = await req.text();
    if (body.length > 8_000_000) return new Response('Too large', { status: 413, headers: cors });

    const r = await fetch(`https://generativelanguage.googleapis.com${url.pathname}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body,
    });
    return new Response(r.body, { status: r.status, headers: { ...cors, 'Content-Type': 'application/json' } });
  },
};
