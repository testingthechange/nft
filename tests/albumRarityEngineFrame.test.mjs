import test from "node:test";
import assert from "node:assert/strict";
import {buildNftGatheringBoard} from "../server/nftGatheringBoard.mjs";
import {
  ALBUM_RARITY_LAYERS, ALBUM_RARITY_FRAME_VERSION,
  LAYER_ONE_GROUPS, LAYER_ONE_LUCKY_NUMBERS,
  prepareAlbumRarityFrame, createAlbumRarityFrameReceipt
} from "../server/albumRarityEngineFrame.mjs";

const record = {
  registration_id:"REG-BETA-001", album_id:"ALBUM-BETA-001",
  album_copy_number:"COPY-BETA-001",
  registered_owner_id:"CLERK-BETA-001",
  purchase_transaction_id:"ORD-BETA-001",
  registration_date:"2026-11-16T19:00:00.000Z",
};
test("frame declares seven copy-number groups + Standard, and only Lucky 7,777,7777",()=>{
  assert.equal(LAYER_ONE_GROUPS.length,7);
  assert.deepEqual(LAYER_ONE_LUCKY_NUMBERS,[7,777,7777]);
  assert.equal(ALBUM_RARITY_LAYERS[0].fallbackTitle,"Standard Edition");
  assert.equal(ALBUM_RARITY_LAYERS[0].enabled,false);
  assert.ok(ALBUM_RARITY_LAYERS.every(layer=>layer.enabled===false));
});
test("frame consumes mock registration only as preview with no assignment",()=>{
  const board=buildNftGatheringBoard({mockRegistration:{accepted:true,record}});
  const frame=prepareAlbumRarityFrame(board);
  assert.equal(frame.frameVersion,ALBUM_RARITY_FRAME_VERSION);
  assert.equal(frame.status,"preview_ready");
  assert.deepEqual(frame.identity,{
    registrationId:"REG-BETA-001",albumId:"ALBUM-BETA-001",copyNumber:"COPY-BETA-001",
  });
  assert.equal(frame.persisted,false);
  assert.equal(frame.finalized,false);
  assert.equal(frame.primaryTitle,null);
  assert.deepEqual(frame.layerResults,[]);
  const receipt=createAlbumRarityFrameReceipt(frame);
  assert.equal(receipt.ok,true);
  assert.equal(receipt.assigned,false);
  assert.equal(receipt.stamp,null);
  assert.equal(board.groups.albumRarity.tier.status,"not_connected");
});
test("frame refuses missing board or incomplete identity",()=>{
  for(const b of [null,{},buildNftGatheringBoard(),{
    ...buildNftGatheringBoard({mockRegistration:{accepted:true,record}}),
    groups:{registration:{copyNumber:{value:"COPY-BETA-001",status:"mock_preview"}}}
  }]){
    const result=prepareAlbumRarityFrame(b);
    assert.equal(result.status,"blocked");
    assert.equal(createAlbumRarityFrameReceipt(result).assigned,false);
  }
});
test("numeric album copy may be prepared, but cannot be printed in Stage 1",()=>{
  const board=buildNftGatheringBoard({verifiedRegistration:{verified:true,record:{...record,album_copy_number:"4568"}}});
  const frame=prepareAlbumRarityFrame(board);
  assert.equal(frame.status,"input_ready");
  assert.equal(frame.identity.copyNumber,"4568");
  assert.equal(frame.layerResults.length,0);
});
test("frame blocks invalid numeric numbers and synthetic copies presented as verified",()=>{
  for(const number of ["0","0001","-7","12.3","1e3","9007199254740992","COPY-BETA-001"]){
    const board=buildNftGatheringBoard({verifiedRegistration:{verified:true,record:{...record,album_copy_number:number}}});
    assert.equal(prepareAlbumRarityFrame(board).status,"blocked");
  }
});
test("receipt rejects unknown frame",()=>{
  assert.deepEqual(createAlbumRarityFrameReceipt({frameVersion:"other"}),{ok:false,reason:"invalid_frame"});
  assert.ok(Object.isFrozen(ALBUM_RARITY_LAYERS));
});
