/*
 * Explicit preview-only connection. Never fills authoritative album rarity
 * assignment slots, never issues an edition or Clover stamp.
 */
import {evaluateAlbumCopyNumberPreview} from "./albumRarityLayerOneEvaluator.mjs";
export function previewLayerOneOnGatheringBoard(board,policy){
 const result=evaluateAlbumCopyNumberPreview(board,policy);
 if(!board||board.version!=="ajine-nft-gathering-board-v1")
   return Object.freeze({ok:false,result,board:null});
 const albumRarity=Object.freeze({
  ...board.groups.albumRarity,
  layerOnePreview:Object.freeze({
   value: result.ok ? Object.freeze({
    groups:result.qualifyingGroups,
    title:result.primaryTitle,
    policyVersion:result.policyVersion,
   }) : null,
   source:"nft.album-rarity-engine.layer-one-preview",
   destination:"nft.gathering-board.albumRarity.preview",
   status:result.ok?"design_preview":"not_connected",
  }),
 });
 return Object.freeze({
  ok:result.ok,result,
  board:Object.freeze({...board,groups:Object.freeze({...board.groups,albumRarity})}),
 });
}
