/*
 * NFT Directus registration storage adapter (trusted server only).
 * Not invoked by the current beta/preview routes.
 * Exact registration_id is the idempotency identity.
 * Fail closed on ambiguous existing rows; database uniqueness must be added
 * before any production activation to prevent concurrent duplicate writes.
 */
const DEFAULT_URL = "https://directus-on-nft.onrender.com";

export function mapRegistrationToNftDirectus(record) {
  return Object.freeze({
    registration_id: record.registration_id,
    album_id: record.album_id,
    album_copy_number: record.album_copy_number,
    registered_owner_id: record.registered_owner_id,
    purchase_transaction_id: record.purchase_transaction_id,
    registration_date: record.registration_date,
    registration_status: "received",
  });
}

export async function inspectNftRegistration(record, { token, fetchImpl = fetch, baseUrl = DEFAULT_URL } = {}) {
  if (!token) throw Error("nft_directus_token_required");
  const headers = { Authorization: "Bearer " + token };
  const filter = encodeURIComponent(JSON.stringify({ registration_id: { _eq: record.registration_id } }));
  const url = baseUrl + "/items/Abum_Registration?limit=2&fields=id,registration_id,album_id,album_copy_number,registered_owner_id,purchase_transaction_id,registration_date&filter=" + filter;
  const response = await fetchImpl(url, { headers, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw Error("nft_registration_lookup_failed");
  const json = await response.json();
  if (!Array.isArray(json?.data)) throw Error("invalid_nft_registration_lookup");
  if (json.data.length > 1) throw Error("duplicate_registration_conflict");
  const existing = json.data[0];
  if (!existing) return Object.freeze({ status: "absent", existing: null });
  const incoming = mapRegistrationToNftDirectus(record);
  for (const key of ["registration_id","album_id","album_copy_number","registered_owner_id","purchase_transaction_id"]) {
    if (String(existing[key] ?? "") !== String(incoming[key] ?? "")) throw Error("registration_identity_conflict");
  }
  if (Number.isNaN(Date.parse(String(existing.registration_date ?? ""))) ||
      Date.parse(String(existing.registration_date)) !== Date.parse(String(incoming.registration_date)))
    throw Error("registration_identity_conflict");
  return Object.freeze({ status: "exists", existing: Object.freeze(existing) });
}

// Called only after trusted payment verification, a server-side registration
// read-back and database unique(registration_id) are implemented. No current
// route may grant these claims through an HTTP request body.
export async function persistVerifiedNftRegistration(record, {
  token, verifiedPayment, registrationReadBack, uniqueConstraintConfirmed,
  fetchImpl = fetch, baseUrl = DEFAULT_URL
} = {}) {
  if (verifiedPayment !== true || registrationReadBack !== true || uniqueConstraintConfirmed !== true)
    throw Error("unverified_registration_write_denied");
  const inspected = await inspectNftRegistration(record, { token, fetchImpl, baseUrl });
  if (inspected.status === "exists") return Object.freeze({ status: "already_registered" });
  const response = await fetchImpl(baseUrl + "/items/Abum_Registration", {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify(mapRegistrationToNftDirectus(record)),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw Error("nft_registration_write_failed");
  const body = await response.json();
  if (!body?.data?.id) throw Error("nft_registration_write_unconfirmed");
  return Object.freeze({ status: "registered", id: String(body.data.id) });
}
