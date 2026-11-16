import { createServer } from 'node:http';

// Dedicated private-token API service. The public Vite website remains a Render Static Site.
const PORT = Number(process.env.PORT || 3000);
const DIRECTUS_URL = 'https://directus-on-nft.onrender.com';
const TOKEN = process.env.AJINE_DIRECTUS_TOKEN;

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

createServer(async (req, res) => {
  try {
    if (req.method !== 'GET') {
      res.writeHead(405, { Allow: 'GET' });
      res.end();
      return;
    }
    const path = new URL(req.url, 'http://localhost').pathname;
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
