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

/**
 * The deployed commercial site is static: it can report completion but must
 * never receive the server-only AJINE private token. This deliberately uses
 * synthetic identifiers only. It does not read/derive actual purchase records.
 * Passing the signal through the existing previewRegistration function proves
 * the full mock signal -> six-field JSON validation -> acknowledgment path.
 */
export function syntheticBetaPurchasePreview() {
  return {
    schema_version: 1,
    event_type: 'album.registration.preview',
    payment_status: 'test_only',
    registration_id: 'REG-BETA-001',
    album_id: 'ALBUM-BETA-001',
    album_copy_number: 'COPY-BETA-001',
    registered_owner_id: 'CLERK-BETA-001',
    purchase_transaction_id: 'ORD-BETA-001',
    registration_date: '2026-11-16T19:00:00.000Z',
  };
}

export function completeBetaRegistrationPreview(signal, previewRegistration) {
  if (!validateBetaSignal(signal)) {
    return {ok:false, error:'beta_signal_invalid'};
  }
  const preview = previewRegistration(syntheticBetaPurchasePreview());
  if (!preview.ok || preview.dry_run !== true || preview.stored !== false ||
      preview.payment_verified !== false) {
    return {ok:false, error:'beta_purchase_preview_failed'};
  }
  return {
    ...betaSignalReply(),
    beta_purchase_preview_processed: true,
    destination: preview.destination,
    mapped_fields: preview.mapped_fields,
  };
}
