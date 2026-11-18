import test from "node:test";
import assert from "node:assert/strict";
import {buildNftGatheringBoard} from "../server/nftGatheringBoard.mjs";
import {connectAlbumRarityEngineFrame} from "../server/albumRarityGatheringBoardConnection.mjs";
test("single adapter projects engine readiness back into Gathering Board without rarity assignment",()=>{
 const record={registration_id:"REG-BETA-001",album_id:"ALBUM-BETA-001",
  album_copy_number:"COPY-BETA-001",registered_owner_id:"CLERK-BETA-001",
  purchase_transaction_id:"ORD-BETA-001",registration_date:"2026-11-16T19:00:00.000Z"};
 const original=buildNftGatheringBoard({mockRegistration:{accepted:true,record}});
 const connected=connectAlbumRarityEngineFrame(original);
 assert.equal(connected.ok,true);
 assert.equal(connected.frame.status,"preview_ready");
 assert.equal(connected.board.groups.albumRarity.frameStatus.value,"preview_ready");
 assert.equal(connected.board.groups.albumRarity.frameStatus.status,"frame_ready");
 assert.equal(connected.board.groups.albumRarity.frameVersion.value,"ajine-album-rarity-frame-v1");
 assert.equal(connected.board.groups.albumRarity.tier.value,null);
 assert.equal(connected.board.groups.albumRarity.assignmentId.status,"not_connected");
 assert.equal(original.groups.albumRarity.frameStatus,undefined);
 assert.ok(Object.isFrozen(connected.board.groups.albumRarity));
 assert.equal(connected.receipt.assigned,false);
});
test("empty Board reports blocked status, never an assignment",()=>{
 const connected=connectAlbumRarityEngineFrame(buildNftGatheringBoard());
 assert.equal(connected.ok,false);
 assert.equal(connected.board.groups.albumRarity.frameStatus.value,"blocked");
 assert.equal(connected.board.groups.albumRarity.tier.status,"not_connected");
});
