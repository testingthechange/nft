import test from "node:test";
import assert from "node:assert/strict";
import {buildNftGatheringBoard} from "../server/nftGatheringBoard.mjs";
import {connectLayerTwoRarityToGatheringBoard} from "../server/albumRarityLayerTwoBoardConnection.mjs";

const registration = {verified:true,record:{
 registration_id:"r-1",album_id:"a-1",album_copy_number:"7",
 registered_owner_id:"u-1",purchase_transaction_id:"p-1",registration_date:"2026-11-18"
}};
test("empty Layer 2 connection preserves Layer 1 and board identity",()=>{
 const board=buildNftGatheringBoard({verifiedRegistration:registration});
 const out=connectLayerTwoRarityToGatheringBoard(board);
 assert.equal(out.ok,true);
 assert.equal(out.assigned,false);
 assert.equal(out.board.groups.albumRarity.layerTwo.characterId.value,null);
 assert.equal(out.board.groups.albumRarity.layerTwo.status,"awaiting_character_rarity");
 assert.deepEqual(out.board.groups.albumRarity.character,board.groups.albumRarity.character);
 assert.deepEqual(out.board.identity,board.identity);
 assert.equal(out.board.minted,false);
});
test("rejects results for a different album copy",()=>{
 const board=buildNftGatheringBoard({verifiedRegistration:registration});
 const out=connectLayerTwoRarityToGatheringBoard(board,{registrationId:"r-2",albumId:"a-1",copyNumber:"7"});
 assert.equal(out.ok,false);
 assert.equal(out.reason,"rarity_identity_mismatch");
});
test("accepts finalized matching rarity without minting",()=>{
 const board=buildNftGatheringBoard({verifiedRegistration:registration});
 const out=connectLayerTwoRarityToGatheringBoard(board,{
 registrationId:"r-1",albumId:"a-1",copyNumber:"7",
 characterId:"c-1",characterName:"Character 1",tier:"Rare",
 artworkUrl:"https://example.com/art.png",editionNumber:1,editionLimit:100,
 assignmentId:"assignment-1",finalized:true,persisted:true,assigned:true,
 });
 assert.equal(out.assigned,true);
 assert.equal(out.board.groups.albumRarity.layerTwo.tier.value,"Rare");
 assert.equal(out.board.minted,false);
});
