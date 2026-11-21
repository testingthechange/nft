/*
 * Pipeline 2 transport handshake only.
 * Caller must be the trusted commercial backend; no browser CORS.
 * Acknowledgment means JSON arrived and passed transport validation only.
 */
const TOKEN_ENV = 'AJINE_PIPELINE2_CONNECTION_TOKEN';
export function pipeline2ConnectionEnabled() {
  const token = process.env[TOKEN_ENV];
  return process.env.AJINE_PIPELINE2_CONNECTION_ENABLED === 'true' &&
    typeof token === 'string' && token.length >= 32;
}
export function validatePipeline2Handshake(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      Object.keys(body).sort().join(',') !== 'event_type,request_id,schema_version')
    return { ok: false, error: 'invalid_handshake' };
  if (body.schema_version !== 1 || body.event_type !== 'pipeline2.connection.ping')
    return { ok: false, error: 'unsupported_contract' };
  if (typeof body.request_id !== 'string' ||
      !/^[a-zA-Z0-9_-]{8,100}$/.test(body.request_id))
    return { ok: false, error: 'invalid_request_id' };
  return { ok: true, schema_version: 1, request_id: body.request_id,
    acknowledgment: 'received', connection: 'pipeline2-option-board',
    nft_data_accepted: false, routed: false, stored: false,
    ownership_verified: false, status_updated: false };
}
