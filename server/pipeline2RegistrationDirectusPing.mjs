// Pipeline 2 read-only six-field Directus connectivity probe.
// This verifies the existing Pipeline 1 registration collection is readable.
// It is NOT an NFT ownership proof or authorization to use an option.
const FIELDS = Object.freeze([
  'registration_id', 'album_id', 'album_copy_number',
  'registered_owner_id', 'purchase_transaction_id', 'registration_date'
]);
const DEFAULT_URL = 'https://directus-on-nft.onrender.com';
export async function pingPipeline2RegistrationDirectus({
  token, baseUrl = DEFAULT_URL, fetchImpl = fetch
} = {}) {
  const fail = reason => ({ ok:false, reason, six_fields_accessible:false,
    ownership_verified:false, stored:false, routed:false, status_updated:false });
  if (!token || token.length < 16) return fail('directus_not_configured');
  try {
    const url = new URL('/items/Abum_Registration', baseUrl);
    url.searchParams.set('limit', '1');
    url.searchParams.set('fields', FIELDS.join(','));
    const response = await fetchImpl(url, {
      headers: { Authorization: 'Bearer ' + token },
      signal: AbortSignal.timeout(8000),
      redirect: 'error'
    });
    if (!response.ok) {
      // Status-only diagnosis: never return upstream response bodies or tokens.
      const status = Number(response.status);
      const category = status === 401 ? 'directus_auth_rejected'
        : status === 403 ? 'directus_access_denied'
        : status === 404 ? 'directus_collection_not_found'
        : status === 400 ? 'directus_query_rejected'
        : status === 429 ? 'directus_rate_limited'
        : status >= 500 && status <= 599 ? 'directus_server_unavailable'
        : 'directus_read_failed';
      return { ...fail(category), upstream_http_status:
        Number.isInteger(status) && status >= 100 && status <= 599 ? status : null };
    }
    const payload = await response.json();
    if (!Array.isArray(payload?.data)) return fail('invalid_directus_response');
    if (payload.data.length > 1) return fail('invalid_directus_response');
    const sample = payload.data[0];
    if (sample && (typeof sample !== 'object' || Array.isArray(sample) ||
      !FIELDS.every(field => Object.hasOwn(sample, field))))
      return fail('six_field_schema_mismatch');
    // An empty collection proves query accessibility, not a populated registration.
    return { ok:true, connection:'pipeline2-directus-registration',
      six_fields_accessible:true, registration_sample_present: Boolean(sample),
      ownership_verified:false, stored:false, routed:false, status_updated:false };
  } catch {
    return fail('directus_unavailable');
  }
}
