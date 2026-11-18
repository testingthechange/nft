// Rules Board v1: read-only evaluation of a supplied policy decision.
// This is NOT a payment, ownership, burn, or mint authorization service.
const decisions = new Set(['hold','eligible','ineligible']);
export function validateNftRulesBoard(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) throw new Error('Missing Rules Board snapshot');
  if (snapshot.version !== 'ajine-nft-rules-board-v1') throw new Error('Unsupported Rules Board contract');
  if (typeof snapshot.registrationId !== 'string' || !snapshot.registrationId.trim()) throw new Error('Missing Rules Board registrationId');
  if (!decisions.has(snapshot.decision)) throw new Error('Invalid Rules Board decision');
  if (!snapshot.permissions || typeof snapshot.permissions !== 'object' || Array.isArray(snapshot.permissions)) throw new Error('Missing Rules Board permissions');
  for (const key of ['burnForRewards','convertToCollectibles','exportToWallet']) {
    if (typeof snapshot.permissions[key] !== 'boolean') throw new Error('Invalid Rules Board permission: '+key);
  }
  return Object.freeze({
    version: snapshot.version,
    registrationId: snapshot.registrationId.trim(),
    decision: snapshot.decision,
    permissions: Object.freeze({
      burnForRewards: snapshot.decision === 'eligible' && snapshot.permissions.burnForRewards,
      convertToCollectibles: snapshot.decision === 'eligible' && snapshot.permissions.convertToCollectibles,
      exportToWallet: snapshot.decision === 'eligible' && snapshot.permissions.exportToWallet
    })
  });
}
