# Polygon Amoy read-only beta connection

The existing `ajinenft-api` Render Web Service exposes `GET /api/polygon/status`.
The endpoint uses `ethers` v6 `JsonRpcProvider` to perform ONLY two JSON-RPC calls:
`eth_chainId` (must be 80002 / Polygon Amoy) and `eth_blockNumber`.

Expected successful response (example block height only):
```json
{"connected":true,"network":"polygon-amoy","chain_id":80002,"block_number":64,"read_only":true,"mint_enabled":false,"wallet_configured":false}
```
A failed connection returns 503 with a generic failure reason; no RPC credentials are returned.

Optional server-only Render env `POLYGON_AMOY_RPC_URL` can point to a trusted HTTPS Amoy JSON-RPC endpoint (default `https://rpc-amoy.polygon.technology/`). Do not put secrets in the Static Site's `VITE_` environment.

## Local checks

```bash
npm install
node --test tests/polygonAmoy.test.mjs
npm run start:api
curl -i http://localhost:3000/api/polygon/status
```

**No wallet, seed phrase, signing key, smart-contract deployment, mint, burn, Polygon mainnet access, customer account writes, or third-party website change is included.** A read-only RPC connection is not evidence that NFTs are minted, copy numbers are registered, or third-party My Collection is connected. The NFT identity contract and the return of NFT data to the third-party website require separate design, authorization, and tests.
