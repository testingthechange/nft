# Commercial Registration Evidence — integration boundary

Private endpoint: `POST /api/integrations/registration/evidence/inspect`.

Disabled unless `AJINE_COMMERCIAL_REGISTRATION_EVIDENCE_ENABLED=true`. Requires existing private preview bearer token, plus `AJINE_COMMERCIAL_DIRECTUS_URL` and `AJINE_COMMERCIAL_DIRECTUS_READ_TOKEN` (server-only). No customer data in response. Does not authorize NFT release or verify Polygon.

**Before enabling:** verify the commercial Directus collection schema and record ID semantics. Current lookup assumes `ownership_records/{registrationId}` with fields `id, album_id, copy_number, ownership_status, registered_at`. The actual commercial frontend currently reads a different Directus instance, and these field names are not yet proven. Leave the feature OFF until the schema and credentials are confirmed. A read-only service credential must have least-privilege access.

Tests: `node scripts/test-commercial-registration-evidence.mjs`.

This stage implements a real server-side lookup path but does **not** establish that the external Directus connection is configured or working.
