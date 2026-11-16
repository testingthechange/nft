# AJINE NFT — third-party registration intake contract (preview only)

**Status:** Preview-only, disabled by default. No production payment claims accepted, no Directus writes, no ownership grants, and no Polygon operations.

This is an **additional endpoint in the existing** AJINE NFT API Web Service, not a new service. The existing public Static Site remains unchanged.

## Endpoint

`POST /api/integrations/registration/preview`

The endpoint is inaccessible until both **server-only** Render environment variables are configured:

- `AJINE_REGISTRATION_PREVIEW_ENABLED=true`
- `AJINE_REGISTRATION_PREVIEW_TOKEN`: independently generated random secret, at least 32 characters (not the Directus token). Send as `Authorization: Bearer <preview token>`.

Keep disabled until ready to run controlled tests. Do not place the preview token in Vite, browser code, URL parameters or GitHub.

Accepts application/json with a maximum 16 KiB request body. Example synthetic payload:

```json
{
  "schema_version": 1,
  "event_type": "album.registration.preview",
  "payment_status": "test_only",
  "registration_id": "REG-TEST-001",
  "album_id": "ALBUM-TEST-001",
  "album_copy_number": "001",
  "registered_owner_id": "CLERK-TEST-001",
  "purchase_transaction_id": "ORDER-TEST-001",
  "registration_date": "2026-11-16T19:00:00.000Z"
}
```

200 reply contains `{"ok":true,"dry_run":true,"stored":false,"destination":"Abum_Registration",...}`. IDs are not echoed. All other payment statuses, including `succeeded`, are rejected. Preview disabled -> 503. No/incorrect preview credential -> 401.

## Current field mapping

| Third-party registration concept | AJINE NFT `Abum_Registration` |
| --- | --- |
| server-assigned registration ID (future) | `registration_id` |
| shareId or authoritative album ID | `album_id` |
| server-allocated album copy number (future) | `album_copy_number` |
| Clerk user ID | `registered_owner_id` |
| verified order/payment reference (future) | `purchase_transaction_id` |
| registration time | `registration_date` |

This mapping is a **proposal**. Current third-party checkout uses simulated `fake_stripe` success and generates copy/order IDs in browser code. Do not treat those values as verified purchases or permanent copy identities.

## Before real records

- Finalize purchase verification against trusted payment provider/server events.
- Allocate registration and copy identities server-side with transaction-safe deduplication and uniqueness constraints.
- Confirm data protection/backups and permissions decisions.
- Add signed server-to-server authentication and replay protection for production integration.
- Introduce production write endpoint as a separate, reviewed feature; preserve existing third-party purchase and account behavior until proven.
- Test failure/retry cases and reconciliation without duplicate registrations.

Run local parser tests: `node --test tests/registrationPreview.test.mjs`.

No code in this PR calls the third-party site, writes to Directus, or modifies existing registrations.
