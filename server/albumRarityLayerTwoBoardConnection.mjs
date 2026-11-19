/*
 * Layer 2 character rarity -> Gathering Board connection.
 * Transport only: no rarity calculation, Directus access, assignment, mint, or write.
 * Layer 1 and existing album rarity slots remain unchanged.
 */
export const LAYER_TWO_BOARD_CONTRACT = "ajine-layer-two-board-v1";
const fields = ["characterId","characterName","tier","artworkUrl","editionNumber","editionLimit","assignmentId"];
const slot = (key, value, status) => Object.freeze({
  value, status,
  source: "nft.layer-two-character-rarity-engine",
  destination: "nft.gathering-board.albumRarity.layerTwo." + key,
});
export function connectLayerTwoRarityToGatheringBoard(board, result = null) {
  if (board?.version !== "ajine-nft-gathering-board-v1" || !board.groups?.albumRarity)
    return Object.freeze({ok:false,reason:"invalid_gathering_board",board:null});
  const identity = board.identity;
  const matching = result != null &&
    result.registrationId === identity?.registrationId &&
    result.albumId === identity?.albumId &&
    String(result.copyNumber) === String(identity?.copyNumber);
  if (result != null && !matching)
    return Object.freeze({ok:false,reason:"rarity_identity_mismatch",board:null});
  const finalized = matching && board.mode === "verified_projection" &&
    result.finalized === true && result.persisted === true && result.assigned === true &&
    fields.every(key => result[key] !== null && result[key] !== undefined && result[key] !== "");
  const status = finalized ? "ready" : "not_connected";
  const layerTwo = Object.freeze({
    contractVersion:LAYER_TWO_BOARD_CONTRACT,
    status:finalized ? "assigned" : "awaiting_character_rarity",
    ...Object.fromEntries(fields.map(key => [key,slot(key,finalized ? result[key] : null,status)])),
  });
  return Object.freeze({
    ok:true,
    assigned:finalized,
    board:Object.freeze({
      ...board,
      groups:Object.freeze({
        ...board.groups,
        albumRarity:Object.freeze({...board.groups.albumRarity,layerTwo}),
      }),
    }),
  });
}
