import { timingSafeEqual } from 'node:crypto';
import { inspectCommercialRegistrationEvidence } from './commercialRegistrationEvidence.mjs';
import { previewRegistration } from './registrationPreview.mjs';
import { MOCK_JSON_PATH, inspectMockJson } from './mockRegistrationJson.mjs';
import { buildNftGatheringBoard } from './nftGatheringBoard.mjs';
import { validateConfirmedRegistrationJson } from './confirmedRegistrationContract.mjs';
import { BETA_SIGNAL_PATH, betaSignalCors, validateBetaSignal, completeBetaRegistrationPreview } from './betaRegistrationSignal.mjs';
import { createServer } from 'node:http';
import { readPolygonAmoyStatus } from './polygonAmoy.mjs';
import { pingMyCollectionReturn } from './nftMyCollectionSlotPing.mjs';
import { pingNftPipeline } from '../scripts/ping-nft-pipeline.mjs';

// Dedicated private-token API service. The public Vite website remains a Render Static Site.
const PORT = Number(process.env.PORT || 3000);
const DIRECTUS_URL = 'https://directus-on-nft.onrender.com';
const TOKEN = process.env.AJINE_DIRECTUS_TOKEN;
const PREVIEW_ENABLED = process.env.AJINE_REGISTRATION_PREVIEW_ENABLED === 'true';
const PREVIEW_TOKEN = process.env.AJINE_REGISTRATION_PREVIEW_TOKEN;
const BETA_SIGNAL_ENABLED = process.env.AJINE_BETA_REGISTRATION_SIGNAL_ENABLED === 'true';
const MOCK_JSON_ENABLED = process.env.AJINE_REGISTRATION_MOCK_JSON_ENABLED === 'true';
// Transport-only verified contract inspection; no customer data is persisted.
const INTAKE_INSPECT_ENABLED = process.env.AJINE_REGISTRATION_INTAKE_INSPECT_ENABLED === 'true';

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
    if (path === MOCK_JSON_PATH) {
      if (!MOCK_JSON_ENABLED) { json(res, 503, {error:'mock_json_disabled'}); return; }
      const origin = betaSignalCors(req.headers.origin);
      if (!origin) { json(res, 403, {error:'origin_not_allowed'}); return; }
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary','Origin');
      if (req.method === 'OPTIONS') {
        res.writeHead(204, {'Access-Control-Allow-Methods':'POST, OPTIONS',
          'Access-Control-Allow-Headers':'Content-Type',
          'Cache-Control':'no-store'}); res.end(); return;
      }
      if (req.method !== 'POST') { json(res, 405, {error:'method_not_allowed'}); return; }
      let body;
      try { body = await readJson(req); }
      catch(error) { json(res, error.http || 400, {error:error.message}); return; }
      const result = inspectMockJson(body, previewRegistration);
      if (!result.ok) { json(res, 422, result); return; }
      // Only after exact mock fixture validation: project the six synthetic
      // fields onto the read-only board. No state, database, or NFT mutations.
      const board = buildNftGatheringBoard({
        mockRegistration: { accepted: true, record: body },
      });
      json(res, 200, {
        ...result,
        gathering_board: {
          version: board.version,
          mode: board.mode,
          registration_slots: Object.fromEntries(
            Object.entries(board.groups.registration).map(([name, field]) =>
              [name, { value: field.value, status: field.status }])
          ),
          stored: false,
          minted: false,
        },
      });
      return;
    }
    if (path === BETA_SIGNAL_PATH) {
      // Browser metadata ONLY. No customer IDs, token or payment data ever accepted.
      if (!BETA_SIGNAL_ENABLED) { json(res, 503, {error:'beta_signal_disabled'}); return; }
      const origin = betaSignalCors(req.headers.origin);
      if (!origin) { json(res, 403, {error:'origin_not_allowed'}); return; }
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      if (req.method === 'OPTIONS') {
        res.writeHead(204, { 'Access-Control-Allow-Methods':'POST, OPTIONS',
          'Access-Control-Allow-Headers':'Content-Type',
          'Access-Control-Max-Age':'300','Cache-Control':'no-store' });
        res.end();
        return;
      }
      if (req.method !== 'POST') { json(res, 405, {error:'method_not_allowed'}); return; }
      let body;
      try { body = await readJson(req); }
      catch (error) { json(res, error.http || 400, {error:error.message}); return; }
      if (!validateBetaSignal(body)) { json(res, 422, {error:'beta_signal_invalid'}); return; }
      // Execute the existing six-field validation in-process with synthetic BETA data only.
      // No outbound HTTP, customer data, private-token exposure, or database writes.
      const result = completeBetaRegistrationPreview(body, previewRegistration);
      json(res, result.ok ? 200 : 422, result);
      return;
    }
    if (path === '/api/integrations/registration/evidence/inspect') {
      // Private server-to-server evidence inspection; no customer data echoed.
      if (req.method !== 'POST') { json(res, 405, {error:'method_not_allowed'}); return; }
      if (process.env.AJINE_COMMERCIAL_REGISTRATION_EVIDENCE_ENABLED !== 'true') {
        json(res, 503, {error:'commercial_evidence_disabled'}); return;
      }
      if (!authorized(req)) { json(res, 401, {error:'unauthorized'}); return; }
      let body;
      try { body = await readJson(req); }
      catch(error) { json(res, error.http || 400, {error:error.message}); return; }
      const result = await inspectCommercialRegistrationEvidence({
        registrationId:body?.registrationId,albumId:body?.albumId,copyNumber:body?.copyNumber
      });
      json(res, result.matched ? 200 : 422, {
        matched:result.matched,status:result.status,reason:result.reason,
        registrationAuthorized:false,polygonProofVerified:false,
        releaseAuthorized:false,delivered:false,stored:false
      });
      return;
    }
    if (path === '/api/integrations/registration/inspect') {
      // Private backend-to-backend JSON validation only. Off by default.
      // Never writes registration records, validates payments, or mints.
      if (req.method !== 'POST') { json(res, 405, {error:'method_not_allowed'}); return; }
      if (!INTAKE_INSPECT_ENABLED) { json(res, 503, {error:'intake_inspection_disabled'}); return; }
      if (!authorized(req)) { json(res, 401, {error:'unauthorized'}); return; }
      let body;
      try { body = await readJson(req); }
      catch (error) { json(res, error.http || 400, {error:error.message}); return; }
      const result = validateConfirmedRegistrationJson(body);
      // Never echo customer IDs or payload. This is not production intake.
      json(res, result.ok ? 200 : 422, result.ok
        ? {ok:true, schema_version:1, validated:true, stored:false,
          payment_verified:false, minted:false}
        : {ok:false, error:result.error, field:result.field});
      return;
    }
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
    if (path === '/api/nft/return/ping') {
      // Contract-only synthetic return ping: no third-party delivery or page rendering.
      json(res, 200, pingMyCollectionReturn());
      return;
    }
    if (path === '/api/nft/pipeline/ping') {
      // Synthetic in-memory fixture + live read-only RPC. Never an ownership proof.
      const result = await pingNftPipeline();
      json(res, result.passed ? 200 : 503, result);
      return;
    }
    if (path === '/api/polygon/status') {
      // Read-only browser status for the explicitly approved third-party site.
      // A missing/unapproved Origin receives no CORS permission.
      const allowedOrigin = betaSignalCors(req.headers.origin);
      if (allowedOrigin) {
        res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
        res.setHeader('Vary', 'Origin');
      }
      const status = await readPolygonAmoyStatus();
      json(res, status.connected ? 200 : 503, status);
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
