# Polygon Amoy read-only beta connection

The existing `ajinenft-api` Render Web Service exposes `GET /api/polygon/status`.
The endpoint uses `ethers` v6 `JsonRpcProvider` to perform ONLY two JSON-RPC calls:
`eth_chainId` (must be 80002 / Polygon Amoy) and `eth_blockNumber`.

Expected successful response (example block height only):
```json
{"connected":true,"network":"polygon-amoy","chain_id":80002,"block_number":64,"read_only":true,"mint_enabled":false,"wallet_configured":false}
```
A failed connection returns 503 with a generic failure reason; no RPC credentials are returned.

Optional server-only Render env `POLYGON_AMOY_RPC_URL` can point to a trusted HTTPS Amoy JSON-RPC endpoint (default `https://polygon-amoy.api.onfinality.io/public`). Do not put secrets in the Static Site's `VITE_` environment.

## Local checks

```bash
npm install
node --test tests/polygonAmoy.test.mjs
npm run start:api
curl -i http://localhost:3000/api/polygon/status
```

**No wallet, seed phrase, signing key, smart-contract deployment, mint, burn, Polygon mainnet access, customer account writes, or third-party website change is included.** A read-only RPC connection is not evidence that NFTs are minted, copy numbers are registered, or third-party My Collection is connected. The NFT identity contract and the return of NFT data to the third-party website require separate design, authorization, and tests.

## Provider note (November 2026)

Polygon deprecated its operated `rpc-amoy.polygon.technology` Amoy RPC endpoint on July 17, 2026. This patch replaces the obsolete default with OnFinality's public Amoy RPC. If existing Render environment `POLYGON_AMOY_RPC_URL` is configured, it overrides the default and MUST be updated to a working Polygon Amoy endpoint. The live Render response `rpc_unavailable` cannot distinguish an obsolete RPC from other networking errors; verify the deployed status endpoint after merge. Do not run `npm audit fix --force` without reviewing the proposed breaking upgrades.

## Timeout and diagnostics

The read-only Polygon status probe uses native Node `fetch` (the ethers SDK remains available for later contract reads) with a single 7-second abort deadline for both `eth_chainId` and `eth_blockNumber`. A failed response returns a bounded 503 with `reason` and `stage` (`chain_id` or `block_number`), and an upstream HTTP status for HTTP failures. It does not reveal credentials, full RPC URLs, or provider response bodies. A successful `/healthz` does not mean that outbound RPC is available. After deploying, check `/api/polygon/status` once; do not repeat unbounded curl commands. If response is `rpc_timeout`, `rpc_http_error`, or `rpc_unavailable`, inspect the indicated stage and upstream status before choosing another RPC endpoint.
