// Public, data-free beta signal only. This must never become a customer registration API.
export const BETA_SIGNAL_ORIGIN = 'https://thirdparty-tz9x.onrender.com';
export const BETA_SIGNAL_PATH = '/api/integrations/registration/beta-signal';
const ALLOWED_ORIGINS = new Set([BETA_SIGNAL_ORIGIN, 'http://localhost:5173']);
export function betaSignalCors(origin) {
  return ALLOWED_ORIGINS.has(origin) ? origin : null;
}
export function validateBetaSignal(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return false;
  const keys = Object.keys(body);
  // Exact metadata fields only. Refuse all IDs, emails, purchase and payment fields.
  if (keys.length !== 4 || keys.some(key => ![
    'schema_version', 'beta_only', 'registration_write_succeeded', 'data_transferred'
  ].includes(key))) return false;
  return body.schema_version === 1 &&
    body.beta_only === true &&
    body.registration_write_succeeded === true &&
    body.data_transferred === false;
}
export function betaSignalReply() {
  return {ok:true, beta_only:true, dry_run:true, stored:false,
    data_transferred:false, payment_verified:false, registration_created:false};
}
