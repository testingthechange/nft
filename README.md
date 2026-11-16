# AJINE NFT Website and API

This repo contains **two separate Render services**:

1. **Existing Static Site** `ajinenft-web`: React/Vite public website at `ajinenft.online`. Keep its existing build/publish settings and custom domain unchanged.
2. **New Web Service** `ajinenft-api`: small Node API, separate Render service, using server-only Directus credentials. The API does **not** serve the website or take over its custom domain.

## Existing Static Site — unchanged

- Repo: `testingthechange/nft`, branch `main`
- Build: `npm install && npm run build`
- Publish directory: `dist`
- Domain: `ajinenft.online`

Do not convert this Static Site into a Web Service. No `VITE_` variable may contain a Directus token or any other secret.

## New Render Web Service — API only

Create **New > Web Service** in Render and choose the same GitHub repo `testingthechange/nft`.

- Name: `ajinenft-api`
- Runtime: Node
- Branch: `main` (after merging this PR)
- Build command: `npm install`
- Start command: `npm run start:api`
- Health check path: `/healthz`
- Environment variable: `AJINE_DIRECTUS_TOKEN`, **Secret**, supplied through the Render dashboard, not committed or pasted into chat
- Use the new service's `*.onrender.com` URL; **do not** attach `ajinenft.online` to this API service

Use a **dedicated least-privilege Directus service token**. Status checks only use `GET /users/me?fields=id`. Do not reuse a full administrator token in the eventual customer-facing product.

## Connection checks

- `GET https://<api-service-host>.onrender.com/healthz` -> HTTP 200, `{"status":"ok"}` proves the Node API is running, **not** that Directus is connected
- `GET https://<api-service-host>.onrender.com/api/directus/status` -> HTTP 200, `{"connected":true}` proves that the API can authenticate to the existing Directus service
- Missing or rejected token / unavailable Directus returns HTTP 503 with `{"connected":false,"reason":"not_configured"|"unavailable"}`

No endpoint returns credentials, Directus user details, private records, or owner information.

## Local development

```bash
npm install
npm run dev          # static frontend Vite dev server
npm run start:api    # independent API server on port 3000
```

This is a **foundation connection only**. The static website does not yet call this API. We must design authenticated user access and approved provenance lookups before wiring browser requests. No minting, burning, payment, data writes, owner queries, or public Directus access are enabled.
