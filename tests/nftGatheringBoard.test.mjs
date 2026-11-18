import test from "node:test";
import assert from "node:assert/strict";
import { buildNftGatheringBoard, NFT_GATHERING_BOARD_GROUPS } from "../server/nftGatheringBoard.mjs";

test("all NFT Gathering Board groups and reserved cover stamp slots are present", () => {
  const board = buildNftGatheringBoard();
  assert.equal(board.version, "ajine-nft-gathering-board-v1");
  assert.deepEqual(Object.keys(board.groups), NFT_GATHERING_BOARD_GROUPS);
  assert.equal(board.groups.registration.copyNumber.status, "not_connected");
  assert.deepEqual(Object.keys(board.groups.albumCoverStamps), [
    "smartBridgeSealUrl", "provenanceSealUrl", "rarityStampUrl",
    "stampedCoverUrl", "stampVersion", "stampStatus",
  ]);
  for (const entry of Object.values(board.groups.albumCoverStamps)) {
    assert.equal(entry.value, null);
    assert.equal(entry.status, "not_connected");
    assert.ok(entry.source && entry.destination);
  }
});
test("untrusted preview never populates registration slots", () => {
  const preview = {record: {registration_id:"REG-BETA-001", album_copy_number:"COPY-BETA-001"}};
  const board = buildNftGatheringBoard({verifiedRegistration:preview});
  assert.equal(board.identity.registrationId, null);
  assert.equal(board.identity.copyNumber, null);
});
test("verified server projection matches registration ID + album ID + copy", () => {
  const record = {
    registration_id:"REG-BETA-001",album_id:"ALBUM-BETA-001",
    album_copy_number:"COPY-BETA-001",registered_owner_id:"CLERK-BETA-001",
    purchase_transaction_id:"ORD-BETA-001",registration_date:"2026-11-16T19:00:00.000Z"
  };
  const board=buildNftGatheringBoard({verifiedRegistration:{verified:true,record}});
  assert.deepEqual(board.identity,{
    registrationId:"REG-BETA-001",albumId:"ALBUM-BETA-001",copyNumber:"COPY-BETA-001"
  });
  assert.equal(board.groups.registration.copyNumber.status,"ready");
  assert.equal(board.groups.polygon.tokenId.status,"not_connected");
  assert.equal(board.groups.albumRarity.tier.status,"not_connected");
  assert.equal(board.groups.returnToThirdParty.deliveryStatus.status,"not_connected");
  assert.equal(board.groups.futureBurnJingleCards.cardRarityAssignment.status,"not_connected");
  assert.ok(Object.isFrozen(board.groups.albumRarity));
  assert.ok(Object.isFrozen(board.groups.registration.copyNumber));
});
