import { buildNftOptionBoard } from './nftOptionBoard.mjs';

// Pipeline 2 API ownership gate. Only trusted server-side resolvers may supply
// identity and NFT records. Never accept a browser-supplied verified flag.
const id = value => typeof value === 'string' && value.length > 0 && value.length <= 200;
export async function resolveNftOptionBoard({ session, nftId, resolveOwner, resolveNft } = {}) {
  const blocked = reason => ({ ok: false, reason, stored: false, dispatched: false });
  if (!id(nftId) || !session || typeof resolveOwner !== 'function' || typeof resolveNft !== 'function')
    return blocked('ownership_verification_unavailable');
  try {
    const authenticatedOwnerId = await resolveOwner(session);
    if (!id(authenticatedOwnerId)) return blocked('authentication_required');
    const nft = await resolveNft(nftId);
    if (!nft || nft.nftId !== nftId || nft.ownerId !== authenticatedOwnerId)
      return blocked('ownership_not_verified');
    // This is an eligibility projection, not permission to execute a burn or export.
    return buildNftOptionBoard({ verified: true, nft });
  } catch {
    return blocked('ownership_verification_unavailable');
  }
}
