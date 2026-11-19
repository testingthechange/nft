/*
 * Album cover mystery-card navigation board.
 * Read-only view contract; does not assign rarity, mint, fetch or navigate.
 * Consumer UI owns route navigation and Back behavior.
 */
export const MYSTERY_CARD_COVER_CONTRACT = "ajine-mystery-card-cover-v1";
const freeze = value => Object.freeze(value);
export function connectMysteryCardCoverToGatheringBoard(board, characterReceipt = null) {
  if (board?.version !== "ajine-nft-gathering-board-v1" || !board.groups?.albumCoverStamps || !board.groups?.albumRarity)
    return freeze({ok:false,reason:"invalid_gathering_board",board:null});
  const identity = board.identity ?? {};
  const matched = characterReceipt !== null &&
    board.mode === "verified_projection" &&
    characterReceipt.registrationId === identity.registrationId &&
    characterReceipt.albumId === identity.albumId &&
    String(characterReceipt.copyNumber) === String(identity.copyNumber);
  if (characterReceipt !== null && !matched)
    return freeze({ok:false,reason:"character_identity_mismatch",board:null});
  const ready = matched && characterReceipt.finalized === true &&
    characterReceipt.persisted === true && characterReceipt.assigned === true &&
    typeof characterReceipt.assignmentId === "string" && characterReceipt.assignmentId.length > 0 &&
    typeof characterReceipt.characterId === "string" && characterReceipt.characterId.length > 0;
  const coverMysteryCard = freeze({
    contractVersion:MYSTERY_CARD_COVER_CONTRACT,
    position:"lower_left",
    status:ready ? "ready" : "awaiting_character_assignment",
    enabled:ready,
    characterId:ready ? characterReceipt.characterId : null,
    assignmentId:ready ? characterReceipt.assignmentId : null,
    albumId:ready ? identity.albumId : null,
    copyNumber:ready ? identity.copyNumber : null,
    // Navigation destination is an internal route key, not an untrusted URL.
    destination:ready ? "my_collection.character_detail" : null,
    returnDestination:ready ? "my_collection.album" : null,
    source:"nft.layer-two-character-rarity-engine",
    consumer:"thirdparty.myCollection.albumCover",
  });
  return freeze({
    ok:true,ready,
    board:freeze({
      ...board,
      groups:freeze({
        ...board.groups,
        albumCoverStamps:freeze({...board.groups.albumCoverStamps,coverMysteryCard}),
      }),
    }),
  });
}
