// AJINE NFT Assembly Frame — pure, read-only contract.
// Inputs are snapshots from the Gathering Board and Rules Board.
// This module performs no I/O, minting, burns, writes, or network requests.
const required = (value, name) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Missing '+name);
  return value.trim();
};
const allowedDecisions = new Set(['hold', 'eligible', 'ineligible']);
export function assembleNftFrame({ gathering, rules }) {
  if (!gathering || typeof gathering !== 'object' || Array.isArray(gathering)) throw new Error('Missing Gathering Board snapshot');
  if (!rules || typeof rules !== 'object' || Array.isArray(rules)) throw new Error('Missing Rules Board snapshot');
  const registrationId = required(gathering.registrationId, 'registrationId');
  const copyNumber = required(gathering.copyNumber, 'copyNumber');
  const albumId = required(gathering.albumId, 'albumId');
  const nftReference = required(gathering.nftReference, 'nftReference');
  if (rules.registrationId !== registrationId) throw new Error('Board registration mismatch');
  if (!allowedDecisions.has(rules.decision)) throw new Error('Invalid Rules Board decision');
  const options = rules.decision === 'eligible' ? {
    retain: true,
    burnForRewards: rules.permissions?.burnForRewards === true,
    convertToCollectibles: rules.permissions?.convertToCollectibles === true,
    exportToWallet: rules.permissions?.exportToWallet === true
  } : { retain: true, burnForRewards: false, convertToCollectibles: false, exportToWallet: false };
  return Object.freeze({
    schemaVersion: 'ajine.nft.assembly.v1',
    status: 'prepared-not-minted',
    registrationId, albumId, copyNumber, nftReference,
    decision: rules.decision,
    options: Object.freeze(options),
    provenance: Object.freeze({ source: 'gathering-board', rulesSource: 'rules-board' }),
    chain: null,
    tokenId: null
  });
}
