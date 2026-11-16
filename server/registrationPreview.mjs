// Versioned, allowlisted mapping of third-party registration events.
// Preview ONLY: no payment verification, database writes, or ownership grants.
const required = [
  'registration_id', 'album_id', 'album_copy_number',
  'registered_owner_id', 'purchase_transaction_id', 'registration_date'
];
const clean = (value) => typeof value === 'string' ? value.trim() : '';
export function previewRegistration(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok:false, error:'invalid_json_object' };
  if (body.schema_version !== 1) return { ok:false, error:'unsupported_schema_version' };
  if (body.event_type !== 'album.registration.preview') return { ok:false, error:'unsupported_event_type' };
  const record = {};
  for (const field of required) {
    const value = clean(body[field]);
    if (!value || value.length > 200) return { ok:false, error:'invalid_field', field };
    record[field] = value;
  }
  if (!/^\d{4}-\d{2}-\d{2}T/.test(record.registration_date) ||
      !Number.isFinite(Date.parse(record.registration_date))) {
    return { ok:false, error:'invalid_field', field:'registration_date' };
  }
  // Explicitly require preview status. Never trust a browser-provided paid flag.
  if (body.payment_status !== 'test_only') return { ok:false, error:'production_payment_not_supported' };
  // No external IDs echoed; metadata describes what would map to Abum_Registration.
  return { ok:true, dry_run:true, stored:false, destination:'Abum_Registration',
    schema_version:1, mapped_fields:required,
    payment_verified:false, note:'Preview accepted; no data persisted or ownership granted' };
}
