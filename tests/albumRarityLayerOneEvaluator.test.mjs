import test from "node:test";
import assert from "node:assert/strict";
import {buildNftGatheringBoard} from "../server/nftGatheringBoard.mjs";
import {evaluateAlbumCopyNumberPreview,validateLayerOnePolicy} from "../server/albumRarityLayerOneEvaluator.mjs";
import {previewLayerOneOnGatheringBoard} from "../server/albumRarityLayerOneBoardConnection.mjs";
const fixture={registration_id:"REG-TEST-001",album_id:"ALBUM-TEST-001",
 registered_owner_id:"OWNER-TEST-001",purchase_transaction_id:"ORD-TEST-001",
 registration_date:"2026-11-18T00:00:00.000Z"};
const policy=Object.freeze({
 version:"draft-layer1-v1",firstIssueEnd:100,
 milestones:Object.freeze([100,500,1000,5000]),
 roundNumbers:Object.freeze([10000,100000]),
 minRepeatLength:3,minSequenceLength:3,minPalindromeLength:3,
 priority:Object.freeze(["lucky_clover","first_issue","milestone","round_number",
  "repeating","sequential","palindrome"]),
});
function board(n){return buildNftGatheringBoard({
 verifiedRegistration:{verified:true,record:{...fixture,album_copy_number:String(n)}}
});}
test("draft only; thresholds and priorities must be supplied and versioned",()=>{
 assert.equal(validateLayerOnePolicy(policy),null);
 assert.equal(validateLayerOnePolicy(null),"missing_policy");
 assert.equal(validateLayerOnePolicy({...policy,version:"live"}),"policy_not_draft_versioned");
 assert.equal(validateLayerOnePolicy({...policy,priority:["first_issue"]}),"invalid_priority");
 assert.equal(validateLayerOnePolicy({...policy,luckyNumbers:[7,77,777]}),"lucky_numbers_fixed");
 assert.equal(evaluateAlbumCopyNumberPreview(board(7),null).assigned,false);
});
test("all seven collector groups plus Standard are reachable",()=>{
 const cases=[
  [1,["first_issue"],"First Issue"],
  [7,["first_issue","lucky_clover"],"Lucky Clover"],
  [777,["repeating","lucky_clover","palindrome"],"Lucky Clover"],
  [7777,["repeating","lucky_clover","palindrome"],"Lucky Clover"],
  [100,["first_issue","milestone"],"First Issue"],
  [1000,["milestone"],"Milestone Edition"],
  [111,["repeating","palindrome"],"Repeating Edition"],
  [1234,["sequential"],"Sequential Edition"],
  [1221,["palindrome"],"Mirror Edition"],
  [10000,["round_number"],"Round Number Edition"],
  [4568,[],"Standard Edition"],
 ];
 for(const [copy,groups,title] of cases){
  const result=evaluateAlbumCopyNumberPreview(board(copy),policy);
  assert.equal(result.ok,true,String(copy));
  assert.deepEqual(result.qualifyingGroups,groups,String(copy));
  assert.equal(result.primaryTitle,title,String(copy));
  assert.equal(result.stage,"design_preview");
  assert.equal(result.assigned,false);
  assert.equal(result.finalized,false);
  assert.equal(result.persisted,false);
  assert.equal(result.stamp,null);
 }
});
test("explicit priority is configurable; all overlapping matches survive",()=>{
 const revised={...policy,version:"draft-layer1-priority-v2",
  priority:["repeating","lucky_clover","first_issue","milestone","round_number","sequential","palindrome"]};
 const a=evaluateAlbumCopyNumberPreview(board(777),policy);
 const b=evaluateAlbumCopyNumberPreview(board(777),revised);
 assert.deepEqual(a.qualifyingGroups,b.qualifyingGroups);
 assert.equal(a.primaryTitle,"Lucky Clover");
 assert.equal(b.primaryTitle,"Repeating Edition");
});
test("mock fixture cannot be interpreted as customer copy; no registration writes",()=>{
 const b=buildNftGatheringBoard({mockRegistration:{accepted:true,record:{...fixture,album_copy_number:"COPY-BETA-001"}}});
 const r=evaluateAlbumCopyNumberPreview(b,policy);
 assert.equal(r.ok,false);
 assert.equal(r.reason,"numeric_copy_required");
 const projected=previewLayerOneOnGatheringBoard(b,policy);
 assert.equal(projected.board.groups.albumRarity.tier.status,"not_connected");
 assert.equal(projected.board.groups.albumRarity.layerOnePreview.value,null);
});
test("preview projects only its diagnostic slot, no authoritative rarity, stamp or DB fields",()=>{
 const original=board(777);
 const projected=previewLayerOneOnGatheringBoard(original,policy);
 assert.equal(projected.ok,true);
 assert.equal(projected.board.groups.albumRarity.layerOnePreview.status,"design_preview");
 assert.equal(projected.board.groups.albumRarity.layerOnePreview.value.title,"Lucky Clover");
 assert.equal(projected.board.groups.albumRarity.tier.status,"not_connected");
 assert.equal(projected.board.groups.albumRarity.assignmentId.status,"not_connected");
 assert.equal(projected.board.groups.albumRarity.stampUrl.status,"not_connected");
 assert.equal(original.groups.albumRarity.layerOnePreview,undefined);
 assert.ok(Object.isFrozen(projected.board));
 assert.ok(Object.isFrozen(projected.result));
});
test("no numeric leading-zero workaround and sequence does not wrap",()=>{
 assert.equal(evaluateAlbumCopyNumberPreview(board("00123"),policy).ok,false);
 assert.equal(evaluateAlbumCopyNumberPreview(board(7890),policy).qualifyingGroups.includes("sequential"),false);
});
