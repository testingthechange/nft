# AJINE NFT Printer — Phase 1 (Amoy beta prototype only)

## Scope and safety
The repository retains **one compile-only** ERC-721 Solidity contract, `contracts/BetaAlbumCopyNFT.sol`, with metadata URI support and synthetic beta identifier restrictions. `AjineBetaAlbumNFT.sol` was a duplicate and has been removed. It neither deploys nor mints. No wallet, signer, private key, gas, live Polygon transaction, Directus record, production purchase, or third-party UI is connected. Existing Alchemy / Amoy RPC connectivity is preserved.

## Data contract
Synthetic record: album ID `ALBUM-BETA-001`, album copy `COPY-BETA-001`.
The permanent on-chain copy identity is `keccak256(abi.encode(albumId, copyNumber))`. Both strings must be nonempty and must use the `ALBUM-BETA-` and `COPY-BETA-` prefixes during test minting. Only the initial owner of the manually deployed contract can request minting, and minting requires a nonempty metadata URI. A single `copyKey` may mint exactly once. A nonzero `tokenIdForCopy(albumId, copyNumber)` corresponds to a token ID, and `copyKeyOfToken(tokenId)` provides the reverse lookup. Token IDs begin at 1.

The mint emits an indexed `BetaAlbumCopyMinted(copyKey, tokenId, recipient)` event. The original copy key mapping does **not** change when an NFT is transferred, and the NFT contract is distinct from the real commercial ownership registry. There are no consumer addresses, names, emails, purchase IDs, CC metadata, or other personal data in the on-chain identity.

## Compile and interface checks

```sh
npm install
npm run compile:nft:beta
node --test tests/betaAlbumNftContract.test.mjs
```

Expected compile output: `ok:true`, `contract:BetaAlbumCopyNFT`, `deployed:false`, `minted:false`. Tests verify contract compilation and stable deterministic synthetic copy keys. **These tests do not prove actual on-chain mint behavior.** Run full EVM security tests and contract review before deployment.

## Future stages (NOT implemented)

1. Deploy reviewed contract to Polygon Amoy **using an explicitly authorized testnet wallet**, then capture the Amoy contract address and deployment transaction.
2. Mint one `ALBUM-BETA-001 / COPY-BETA-001` test NFT and verify its event, token ID and copy-key mappings from the chain.
3. Implement server-side, authenticated, idempotent mapping to AJINE's master-copy registry; do not infer paid ownership from a browser notification.
4. Provide the verified contract address, token ID and copy number back to the third-party site's BETA My Collection using a controlled read API.
5. Design separate rare issuance, burn-key provenance and jingle relationships using the canonical copy key. No burn function exists in this prototype; ERC-721 transfers remain possible.
6. Production minting requires contract security review, payment confirmation, custody/wallet policy, transaction failure handling, metadata and provenance rules, privacy review, and reconciliation.

The prototype does not mutate AJINE's existing `Abum_Registration` collection. No new Render services or environment variables are required to compile it.
