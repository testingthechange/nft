# AJINE NFT Directus schema installer

Target is hardcoded to `https://directus-on-nft.onrender.com`. It does **not** contact Third Party Directus.

Requirements: Node.js 18+, an AJINE Directus admin access token. Do not paste tokens into chat, GitHub, or Render build settings.

From a local terminal in this repository:

```sh
read -s AJINE_DIRECTUS_TOKEN
export AJINE_DIRECTUS_TOKEN
node scripts/install-ajine-schema.mjs
node scripts/install-ajine-schema.mjs --apply
unset AJINE_DIRECTUS_TOKEN
```

First command previews changes; the second applies them. Do not run `--apply` before reviewing the preview and taking a database backup. The installer is additive: it leaves existing fields and records unchanged and preserves the existing misspelled `Abum_Registration` collection. It creates missing collections with Directus default primary keys and the listed basic fields. It does **not** yet configure relational links, uniqueness constraints, security policies, public API exposure, rarity allocation, blockchain minting, or commerce payments. Those require a separate reviewed migration and testing.

If the first command errors, stop and share only the error text with credentials removed.
