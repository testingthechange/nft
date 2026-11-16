# Ajine NFT Website

React + Vite website shell for Ajine NFT. The production Node server serves the built frontend and exposes a same-origin, **read-only connectivity check** for Directus.

## Local development

```bash
npm install
npm run dev
```

The Vite development server is frontend-only. To test the production server:

```bash
npm run build
AJINE_DIRECTUS_TOKEN=<set-locally-without-committing> npm start
```

Open `http://localhost:3000/api/directus/status`.

- A configured, working server token returns HTTP 200 with `{"connected":true}`.
- Missing or rejected credentials / connectivity return HTTP 503 and `{"connected":false,"reason":"not_configured"|"unavailable"}`.
- This endpoint never returns the token, a Directus user record, or customer data.

## Render deployment — important

**Current hosting mode must be checked first.** This feature needs a Render **Web Service** running Node, not a Static Site. Do not simply merge and expect an existing Static Site to run the server. Keep the existing site running until the Web Service configuration is in place.

Suggested Web Service settings:

- Repository: `testingthechange/nft`
- Build command: `npm install && npm run build`
- Start command: `npm start`
- Environment: `AJINE_DIRECTUS_TOKEN` set as a private **server-side** secret; do not prefix with `VITE_`
- Web service listens on the `PORT` supplied by Render
- Custom domain, once verified: `ajinenft.online`

Use a dedicated **least-privilege** Directus service token. The first status check only needs `/users/me?fields=id`; broader item access should not be granted until endpoints and permissions are designed. Do not put Directus tokens or signing keys into Vite variables or commit them to GitHub.

## Connection scope

This PR adds only `GET /api/directus/status` on the same origin as the website. It validates that the **server** can authenticate to the existing Directus instance at `https://directus-on-nft.onrender.com`. It does not connect wallet identity, expose private collections, add registration or provenance APIs, mint or burn NFTs, modify Directus schemas, or enable commerce.

Directus, Polygon, wallet verification, authentication, and purchasing flows are not yet connected to website business logic.
