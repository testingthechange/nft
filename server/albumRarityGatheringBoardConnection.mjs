/*
 * One read-only integration boundary between NFT Gathering Board and
 * Album Rarity Engine Frame. No runtime endpoint, DB write or mint.
 * The rarity engine is the future execution owner; this adapter displays
 * its status in the Board without creating an assignment.
 */
import {prepareAlbumRarityFrame,createAlbumRarityFrameReceipt} from "./albumRarityEngineFrame.mjs";
const statusSlot = (value) => Object.freeze({
  value, source:"nft.album-rarity-engine-frame",
  destination:"nft.gathering-board.albumRarity", status:"frame_ready",
});

export function connectAlbumRarityEngineFrame(gatheringBoard) {
  const frame = prepareAlbumRarityFrame(gatheringBoard);
  const receipt = createAlbumRarityFrameReceipt(frame);
  if(!gatheringBoard || gatheringBoard.version !== "ajine-nft-gathering-board-v1")
    return Object.freeze({ok:false,frame,receipt,board:null});
  // Rarity tier, edition, character, stamp, assignment ID remain unconnected.
  // Only diagnostic readiness/version slots are attached to a new projection.
  const albumRarity = Object.freeze({
    ...gatheringBoard.groups.albumRarity,
    frameStatus: statusSlot(receipt.status),
    frameVersion: statusSlot(receipt.frameVersion),
  });
  const board = Object.freeze({
    ...gatheringBoard,
    groups:Object.freeze({...gatheringBoard.groups,albumRarity}),
  });
  return Object.freeze({ok:receipt.ok,frame,receipt,board});
}
