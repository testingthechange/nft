# Commercial Registration Evidence — source alignment

Commercial website's authoritative ownership source: `https://directus-otul.onrender.com/items/ownership_records`.

NFT API private endpoint: `POST /api/integrations/registration/evidence/inspect`. Feature OFF unless `AJINE_COMMERCIAL_REGISTRATION_EVIDENCE_ENABLED=true`; requires existing private bearer token and server-only `AJINE_COMMERCIAL_DIRECTUS_READ_TOKEN`. Optional `AJINE_COMMERCIAL_DIRECTUS_URL` must exactly match the commercial origin, otherwise HOLD. No customer record data echoed.

Read-only lookup of `ownership_records/{registrationId}` checks `id`, `albumId/album_id`, `copyNumber/copy_number/album_copy_number`, `ownershipStatus/ownership_status`, and `registeredAt/registered_at`. The commercial My Collection Board supports those same field variants. **Do not equate ownership key, registration ID, album ID, and share ID.** If album ID is absent from the persisted record, HOLD rather than guessing it from share ID.

Before enabling: verify commercial Directus token read access and whether its record `id` is the registration ID used by NFT returns. The actual persisted album ID field and token permission have not been confirmed. Even a successful lookup only provides registration evidence, never approval to release or Polygon ownership proof.

Tests: `node scripts/test-commercial-registration-evidence.mjs`. No database writes, minting or live NFT delivery.
