/*
 * Protected read-only Layer 2 live connection diagnostic.
 * Reads NFT Directus character catalog, checks engine admission, and tests
 * the pre-existing empty Gathering Board receipt using synthetic registration.
 * Never assigns odds, prints, persists, mints, or exposes customer data.
 */
import {prepareLayerTwoCharacterEngine} from "./layerTwoCharacterEngineCatalog.mjs";
import {buildNftGatheringBoard} from "./nftGatheringBoard.mjs";
import {connectLayerTwoRarityToGatheringBoard} from "./albumRarityLayerTwoBoardConnection.mjs";

export async function inspectLayerTwoLiveConnection({token,fetcher}={}) {
 const engine=await prepareLayerTwoCharacterEngine({token,fetcher});
 const board=buildNftGatheringBoard({mockRegistration:{accepted:true,record:{
   registration_id:"L2-DIAGNOSTIC",album_id:"L2-DIAGNOSTIC",
   album_copy_number:"COPY-BETA-DIAGNOSTIC"
 }}});
 const receipt=connectLayerTwoRarityToGatheringBoard(board);
 const boardReady=receipt.ok===true && receipt.assigned===false &&
   receipt.board?.groups?.albumRarity?.layerTwo?.status==="awaiting_character_rarity" &&
   receipt.board?.minted===false;
 return Object.freeze({
   ok:engine.ok===true && boardReady,
   test:"nft-layer-two-character-live-connection",
   source:"nft-directus",
   characterCatalogRead:engine.ok===true,
   characterCount:engine.ok?engine.characterCount:0,
   engineStatus:engine.status,
   reason:engine.ok?null:engine.reason,
   gatheringBoardReceiptReady:boardReady,
   layerTwoAssigned:false,printingEnabled:false,oddsApplied:false,
   directusWrites:false,polygonMinted:false,syntheticBoardOnly:true
 });
}
