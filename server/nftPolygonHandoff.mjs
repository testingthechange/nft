// Polygon handoff contract: serialization only. Never signs, broadcasts, or mints.
export function preparePolygonHandoff(frame) {
  if (!frame || frame.schemaVersion !== 'ajine.nft.assembly.v1' ||
      frame.status !== 'prepared-not-minted') throw new Error('Invalid assembly frame');
  if (frame.decision !== 'eligible') throw new Error('Assembly not eligible');
  for (const key of ['registrationId','albumId','copyNumber','nftReference']) {
    if (typeof frame[key] !== 'string' || !frame[key].trim()) throw new Error('Missing '+key);
  }
  if (frame.chain !== null || frame.tokenId !== null) throw new Error('Already assigned on-chain');
  // This is a non-executable manifest; no wallet, RPC, chain, or contract details.
  return Object.freeze({
    schemaVersion: 'ajine.polygon.handoff.v1',
    mode: 'read-only-preview',
    action: 'none',
    readyForMint: false,
    registrationId: frame.registrationId,
    albumId: frame.albumId,
    copyNumber: frame.copyNumber,
    nftReference: frame.nftReference,
    tokenId: null,
    contractAddress: null,
    transactionHash: null
  });
}
