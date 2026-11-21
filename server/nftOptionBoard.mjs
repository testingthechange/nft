/*
 * Pipeline 2 / Stage 1 — NFT Option Board (contract only).
 * Pipeline 1 owns registration and delivery. This board accepts only an
 * authenticated upstream's already-verified NFT projection; it does not
 * authenticate requests, establish ownership, or persist records.
 * No burn, export, reward, ledger write, or My Collection update occurs here.
 */
export const NFT_OPTION_BOARD_VERSION = 'ajine-pipeline2-option-board-v1';
export const NFT_OPTION_ROUTES = Object.freeze({
  burn: Object.freeze({ choices: Object.freeze(['jingles', 'discount']) }),
  export: Object.freeze({ choices: Object.freeze([]) }),
});
const clean = value => typeof value === 'string' ? value.trim() : '';
const required = ['nftId', 'registrationId', 'albumId', 'copyNumber', 'ownerId'];
export function buildNftOptionBoard(input = {}) {
  if (input.verified !== true || !input.nft || typeof input.nft !== 'object')
    return Object.freeze({ ok: false, reason: 'verified_nft_required', stored: false });
  const nft = {};
  for (const key of required) {
    const value = clean(input.nft[key]);
    if (!value || value.length > 200)
      return Object.freeze({ ok: false, reason: 'invalid_nft_identity', field: key, stored: false });
    nft[key] = value;
  }
  const status = clean(input.nft.status);
  if (!['active', 'exported', 'out_of_circulation'].includes(status))
    return Object.freeze({ ok: false, reason: 'invalid_nft_status', stored: false });
  const available = status === 'active' ? ['burn', 'export'] : [];
  return Object.freeze({
    ok: true, version: NFT_OPTION_BOARD_VERSION, stage: 1,
    mode: 'verified_projection', nft: Object.freeze({ ...nft, status }),
    options: Object.freeze(available), routes: NFT_OPTION_ROUTES,
    stored: false, dispatched: false, statusUpdated: false,
  });
}
export function selectNftUsage(board, action, burnPurpose = null) {
  if (!board?.ok || !board.options?.includes(action))
    return Object.freeze({ ok: false, reason: 'option_unavailable', dispatched: false });
  if (action === 'burn' && !NFT_OPTION_ROUTES.burn.choices.includes(burnPurpose))
    return Object.freeze({ ok: false, reason: 'burn_purpose_required', dispatched: false });
  if (action === 'export' && burnPurpose !== null)
    return Object.freeze({ ok: false, reason: 'unexpected_burn_purpose', dispatched: false });
  return Object.freeze({
    ok: true, nftId: board.nft.nftId, registrationId: board.nft.registrationId,
    action, ...(action === 'burn' ? { burnPurpose } : {}),
    target: action === 'burn' ? 'pipeline2.shared-burn-engine' : 'pipeline2.wallet-export',
    dispatchStatus: 'not_connected', dispatched: false, statusUpdated: false,
  });
}
