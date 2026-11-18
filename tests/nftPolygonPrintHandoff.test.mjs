import test from "node:test";
import assert from "node:assert/strict";
import {buildNftGatheringBoard} from "../server/nftGatheringBoard.mjs";
import {NFT_RULES_BOARD, getNftRulesBoardFrame} from "../server/nftRulesBoardFrame.mjs";
import {prepareNftPolygonPrintHandoff} from "../server/nftPolygonPrintHandoff.mjs";

const verifiedRecord = {
 registration_id:"REG-REAL-1",album_id:"ALBUM-1",album_copy_number:"777",
 registered_owner_id:"ACCOUNT-1",purchase_transaction_id:"TX-1",
 registration_date:"2026-11-18T00:00:00.000Z",
};
const board = () => buildNftGatheringBoard({verifiedRegistration:{verified:true,record:verifiedRecord}});
test("rules frame declares contract and account ownership without enabling minting", () => {
 assert.equal(getNftRulesBoardFrame(),NFT_RULES_BOARD);
 assert.equal(NFT_RULES_BOARD.activated,false);
 assert.equal(NFT_RULES_BOARD.polygonDeploymentAuthorized,false);
 assert.equal(NFT_RULES_BOARD.rules.listening.enforcementOwner,"thirdparty.account");
 assert.equal(NFT_RULES_BOARD.rules.burn.implementation,"future_pipeline_2");
});
test("empty board cannot print", () => {
 const v=prepareNftPolygonPrintHandoff({});
 assert.equal(v.printable,false);
 assert.equal(v.transactionSubmitted,false);
 assert.equal(v.reason,"invalid_gathering_board");
});
test("synthetic mock registration never reaches printing", () => {
 const mock=buildNftGatheringBoard({mockRegistration:{accepted:true,record:{
  registration_id:"REG-BETA-001",album_id:"ALBUM-BETA-001",album_copy_number:"COPY-BETA-001"
 }}});
 const v=prepareNftPolygonPrintHandoff({gatheringBoard:mock});
 assert.equal(v.reason,"verified_registration_required");
 assert.equal(v.contractRequest,null);
});
test("valid registration remains blocked behind inactive rules", () => {
 const v=prepareNftPolygonPrintHandoff({gatheringBoard:board()});
 assert.equal(v.reason,"rules_board_inactive");
 assert.deepEqual(v.identity,{registrationId:"REG-REAL-1",albumId:"ALBUM-1",copyNumber:"777"});
 assert.equal(v.mintEnabled,false);
});
test("fake activated policy still cannot print unfinalized rarity", () => {
 const fake={...NFT_RULES_BOARD,activated:true,polygonDeploymentAuthorized:true};
 const v=prepareNftPolygonPrintHandoff({gatheringBoard:board(),rulesBoard:fake});
 assert.equal(v.reason,"rarity_not_finalized");
});
test("fake final rarity with mismatched identity is rejected", () => {
 const fake={...NFT_RULES_BOARD,activated:true,polygonDeploymentAuthorized:true};
 const v=prepareNftPolygonPrintHandoff({gatheringBoard:board(),rulesBoard:fake,
 rarityResult:{assigned:true,finalized:true,persisted:true,registrationId:"ANOTHER",
 albumId:"ALBUM-1",copyNumber:"777"}});
 assert.equal(v.reason,"rarity_identity_mismatch");
});
test("no Polygon printing even with complete synthetic inputs", () => {
 const fake={...NFT_RULES_BOARD,activated:true,polygonDeploymentAuthorized:true};
 const rarityResult={assigned:true,finalized:true,persisted:true,
 registrationId:"REG-REAL-1",albumId:"ALBUM-1",copyNumber:"777",
 layerResults:[{finalized:true},{finalized:true}]};
 const v=prepareNftPolygonPrintHandoff({gatheringBoard:board(),rulesBoard:fake,
 rarityResult,artwork:{originalCoverUrl:"https://example.org/art.png"},
 metadataUri:"ipfs://metadata"});
 assert.equal(v.reason,"polygon_print_adapter_not_installed");
 assert.equal(v.printable,false);
 assert.equal(v.transactionSubmitted,false);
 assert.equal(v.contractRequest,null);
});
