// Adapter for the existing AJINE NFT Gathering Board v1.
// Fail closed: mock and unverified registrations cannot become mint-ready.
import { assembleNftFrame } from '../../src/nft/assembly-frame.mjs';
export function assembleFromGatheringBoard(board, rules) {
  if (board?.version !== 'ajine-nft-gathering-board-v1') throw new Error('Unsupported Gathering Board contract');
  if (board.mode !== 'verified_projection') throw new Error('Gathering Board is not a verified projection');
  if (board.stored !== false || board.minted !== false) throw new Error('Unexpected Gathering Board state');
  const slots = board.groups?.registration;
  const names = ['registrationId', 'albumId', 'copyNumber'];
  for (const name of names) {
    if (slots?.[name]?.status !== 'ready' || slots[name].value == null) throw new Error('Registration slot not ready: '+name);
  }
  // A rules snapshot is required; this adapter does not invent eligibility.
  if (!rules || typeof rules !== 'object') throw new Error('Missing Rules Board snapshot');
  const ref = board.groups?.polygon?.tokenId;
  if (ref?.status === 'ready') throw new Error('Unexpected pre-existing token assignment');
  return assembleNftFrame({
    gathering: {
      registrationId: slots.registrationId.value,
      albumId: slots.albumId.value,
      copyNumber: slots.copyNumber.value,
      // Deterministic reference for a prepared package, NOT a minted NFT ID.
      nftReference: 'registration:' + slots.registrationId.value
    },
    rules
  });
}
