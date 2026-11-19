import test from "node:test";
import assert from "node:assert/strict";
import {buildNftGatheringBoard} from "../server/nftGatheringBoard.mjs";
import {connectMysteryCardCoverToGatheringBoard} from "../server/albumCoverMysteryCardBoard.mjs";
const registration={verified:true,record:{registration_id:"r1",album_id:"a1",album_copy_number:20001}};
test("unassigned cover is disabled",()=>{
 const b=buildNftGatheringBoard({verifiedRegistration:registration});
 const x=connectMysteryCardCoverToGatheringBoard(b);
 assert.equal(x.ok,true);assert.equal(x.ready,false);
 assert.equal(x.board.groups.albumCoverStamps.coverMysteryCard.enabled,false);
 assert.equal(x.board.groups.albumCoverStamps.smartBridgeSealUrl.value,null);
});
test("finalized matching character yields a read-only link contract",()=>{
 const b=buildNftGatheringBoard({verifiedRegistration:registration});
 const x=connectMysteryCardCoverToGatheringBoard(b,{registrationId:"r1",albumId:"a1",copyNumber:20001,finalized:true,persisted:true,assigned:true,assignmentId:"p1",characterId:"AJINE-12"});
 assert.equal(x.ready,true);
 assert.equal(x.board.groups.albumCoverStamps.coverMysteryCard.destination,"my_collection.character_detail");
 assert.equal(x.board.groups.albumCoverStamps.coverMysteryCard.returnDestination,"my_collection.album");
 assert.equal(x.board.groups.albumCoverStamps.coverMysteryCard.position,"lower_left");
 assert.equal(x.board.groups.albumRarity.layerTwo,undefined);
});
test("mismatched receipt fails closed",()=>{
 const b=buildNftGatheringBoard({verifiedRegistration:registration});
 const x=connectMysteryCardCoverToGatheringBoard(b,{registrationId:"r1",albumId:"wrong",copyNumber:20001});
 assert.equal(x.ok,false);assert.equal(x.reason,"character_identity_mismatch");
});
test("mock registrations cannot create active links",()=>{
 const b=buildNftGatheringBoard({mockRegistration:{accepted:true,record:{registration_id:"r1",album_id:"a1",album_copy_number:20001}}});
 const x=connectMysteryCardCoverToGatheringBoard(b,{registrationId:"r1",albumId:"a1",copyNumber:20001,finalized:true,persisted:true,assigned:true,assignmentId:"p1",characterId:"AJINE-12"});
 assert.equal(x.ready,false);
});
