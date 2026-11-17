/*
 * Strict public synthetic-only mock handoff. No customer data, DB writes,
 * wallet, payment, or minting. The sole fixture is shared by sender tests.
 */
export const MOCK_JSON_PATH = "/api/integrations/registration/mock-json";
export const MOCK_REGISTRATION = Object.freeze({
  schema_version: 1,
  event_type: "album.registration.preview",
  payment_status: "test_only",
  registration_id: "REG-BETA-001",
  album_id: "ALBUM-BETA-001",
  album_copy_number: "COPY-BETA-001",
  registered_owner_id: "CLERK-BETA-001",
  purchase_transaction_id: "ORD-BETA-001",
  registration_date: "2026-11-16T19:00:00.000Z",
});
export function inspectMockJson(body, previewRegistration) {
  if (!body || typeof body !== "object" || Array.isArray(body) ||
      Object.keys(body).length !== Object.keys(MOCK_REGISTRATION).length ||
      Object.keys(MOCK_REGISTRATION).some(k => body[k] !== MOCK_REGISTRATION[k]))
    return {ok:false, error:"mock_fixture_only"};
  const validated = previewRegistration(body);
  if (!validated.ok || validated.stored !== false) return {ok:false,error:"invalid_mock_json"};
  return {
    ok:true, received:true, validated:true, mock_only:true, stored:false, minted:false,
    registration_id:MOCK_REGISTRATION.registration_id,
    album_copy_number:MOCK_REGISTRATION.album_copy_number,
    destination:"ajine-nft-api",
  };
}
