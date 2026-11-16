# BETA registration completion -> synthetic purchase JSON preview

This completes the **BETA simulation handoff**, without enrolling real buyers.

Flow:
1. Third-party static Register page finishes its existing commercial Directus registration request.
2. If the third-party `VITE_AJINE_BETA_REGISTRATION_SIGNAL=true` build setting is enabled, it sends exactly four non-identifying metadata flags to the existing AJINE API `/api/integrations/registration/beta-signal` route.
3. If `AJINE_BETA_REGISTRATION_SIGNAL_ENABLED=true` is set on the AJINE API, the route invokes the existing `previewRegistration` six-field validator **in process** on a fixed BETA-prefixed synthetic purchase payload.
4. API acknowledges `beta_purchase_preview_processed:true`, `dry_run:true`, `stored:false`, `payment_verified:false`, `registration_created:false`.

This does NOT send the real purchase record from the third-party site, create NFT ownership, persist anything in Directus, validate payments, or imply a trustworthy registration. The browser event can be forged and is deliberately treated only as a simulation trigger, never as proof of purchase.

Private `AJINE_REGISTRATION_PREVIEW_TOKEN` remains secret and used only for the separately verified authenticated server-to-server manual preview route; this beta signal endpoint does not require or expose it. No new service or endpoint was added in this PR. Avoid enabling the third-party build switch on public customer traffic; use an isolated beta environment. The AJINE API switch can remain on because this path is no-write, but can also be disabled to return 503.

Tests: `node --test tests/betaRegistrationSignal.test.mjs tests/registrationPreview.test.mjs`.

**Production integration still requires a trusted server-side verified purchase source** (payment confirmation, authoritative copy allocation, actual Clerk ownership, idempotent delivery, and data protections), then a separate production authorization procedure. The fixed BETA fixture must never be promoted to represent genuine purchase data.
