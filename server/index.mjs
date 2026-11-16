import { timingSafeEqual } from 'node:crypto';
import { previewRegistration } from './registrationPreview.mjs';
import { createServer } from 'node:http';

// Dedicated private-token API service. The public Vite website remains a Render Static Site.
const PORT = Number(process.env.PORT || 3000);
const DIRECTUS_URL = 'https://directus-on-nft.onrender.com';
const TOKEN = process.env.AJINE_DIRECTUS_TOKEN;
const PREVIEW_ENABLED = process.env.AJINE_REGISTRATION_PREVIEW_ENABLED === 'true';
const PREVIEW_TOKEN = process.env.AJINE_REGISTRATION_PREVIEW_TOKEN;

function json(res, code, payload) {
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(JSON.stringify(payload));
}

async function checkDirectus() {
  if (!TOKEN) return { connected: false, reason: 'not_configured' };
  try {
    const response = await fetch(DIRECTUS_URL + '/users/me?fields=id', {
      headers: { Authorization: 'Bearer ' + TOKEN },
      signal: AbortSignal.timeout(7000),
    });
    return response.ok ? { connected: true } : { connected: false, reason: 'unavailable' };
  } catch {
    return { connected: false, reason: 'unavailable' };
  }
}

function authorized(req) {
  if (!PREVIEW_TOKEN || PREVIEW_TOKEN.length < 32) return false;
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return false;
  const supplied = Buffer.from(header.slice(7));
  const expected = Buffer.from(PREVIEW_TOKEN);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
async function readJson(req) {
  if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) {
    const e = Error('unsupported_media_type'); e.http = 415; throw e;
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 16384) { const e = Error('payload_too_large'); e.http = 413; throw e; }
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { const e = Error('invalid_json'); e.http = 400; throw e; }
}
createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (path === '/api/integrations/registration/preview') {
      if (req.method !== 'POST') {
        res.writeHead(405, { Allow: 'POST' }); res.end(); return;
      }
      if (!PREVIEW_ENABLED || !PREVIEW_TOKEN || PREVIEW_TOKEN.length < 32) {
        json(res, 503, { error:'preview_disabled' }); return;
      }
      if (!authorized(req)) { json(res, 401, { error:'unauthorized' }); return; }
      let body;
      try { body = await readJson(req); }
      catch (error) { json(res, error.http || 400, { error:error.message }); return; }
      const result = previewRegistration(body);
      json(res, result.ok ? 200 : 422, result);
      return;
    }
    if (req.method !== 'GET') {
      res.writeHead(405, { Allow: 'GET' });
      res.end();
      return;
    }
    if (path === '/healthz') {
      json(res, 200, { status: 'ok' });
      return;
    }
    if (path === '/api/directus/status') {
      const status = await checkDirectus();
      json(res, status.connected ? 200 : 503, status);
      return;
    }
    json(res, 404, { error: 'not_found' });
  } catch {
    json(res, 500, { error: 'server_error' });
  }
}).listen(PORT, '0.0.0.0', () => {
  console.log('AJINE NFT API listening on port ' + PORT);
});
