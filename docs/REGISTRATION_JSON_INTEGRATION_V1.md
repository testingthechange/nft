# AJINE Registration JSON v1 — two separate websites

Third-party commercial site: `thirdparty-tz9x.onrender.com` (`testingthechange/webshell222`).
NFT site and API: `ajinenft.online` / `ajine-nft-api.onrender.com` (`testingthechange/nft`).

The integration format is JSON over authenticated server-to-server HTTPS.
The websites and Directus instances remain separate. Never place credentials
in Vite/React or transfer live customer data from the current browser simulator.

## Authority and lifecycle

1. Third-party trusted server must verify the payment, authenticated Clerk owner,
   exact published album, server-allocated unique copy, and persisted registration.
2. Third-party server maps that persisted registration into `album.registration.confirmed`
   (v1) with six fields: registration ID, album ID, copy number, registered owner ID,
   payment transaction ID, registration date.
3. NFT API validates an authenticated, idempotent request against trusted source.
   It writes to NFT Directus `Abum_Registration` only once per registration ID.
4. NFT Assembly later assigns rarity, icon, artwork, and eligible Jingle metadata.
   Polygon minting is separate and follows verification of all prerequisites.
5. NFT API returns a signed/verified JSON result, joined by exact registration ID +
   album copy, which hydrates the third-party My Collection Board slots.

The modules in this PR implement only the wire-format contract and validation.
They **do not** open a production HTTP intake, verify payments, write to Directus,
mint tokens or send real customer data. Existing beta signal remains data-free.

## Release prerequisites

- Trusted third-party backend service (current public deployment is a Static Site)
- Payment processor webhooks and verified order/copy linkage
- Transaction-safe unique copy allocation and idempotency/replay controls
- Dedicated authenticated NFT API write route with restricted permissions
- NFT Directus schema/constraints, reconciliation and retry queue
- Return-status JSON and My Collection slot hydration
- Integration acceptance tests using synthetic fixtures
- No Pipeline #2 work
