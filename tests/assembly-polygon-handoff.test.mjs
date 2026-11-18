import assert from 'node:assert/strict';
import { buildNftGatheringBoard } from '../server/nftGatheringBoard.mjs';
import { assembleFromGatheringBoard } from '../server/nftAssemblyAdapter.mjs';
import { preparePolygonHandoff } from '../server/nftPolygonHandoff.mjs';
const record={registration_id:'synthetic-1',album_id:'synthetic-album',album_copy_number:'0003',
 registered_owner_id:'synthetic-owner',purchase_transaction_id:'synthetic-tx',registration_date:'2026-11-18T00:00:00Z'};
const board=buildNftGatheringBoard({verifiedRegistration:{verified:true,record}});
const rules={version:'ajine-nft-rules-board-v1',registrationId:'synthetic-1',decision:'eligible',
 permissions:{burnForRewards:true,convertToCollectibles:false,exportToWallet:false}};
const frame=assembleFromGatheringBoard(board,rules);
const handoff=preparePolygonHandoff(frame);
assert.equal(handoff.copyNumber,'0003');
assert.equal(handoff.action,'none');
assert.equal(handoff.readyForMint,false);
assert.equal(handoff.contractAddress,null);
assert.equal(handoff.transactionHash,null);
assert.throws(()=>preparePolygonHandoff(assembleFromGatheringBoard(board,{...rules,decision:'hold'})),/not eligible/);
assert.throws(()=>preparePolygonHandoff({...frame,tokenId:'123'}),/Already assigned/);
console.log('PASS: read-only Polygon handoff; no mint, wallet, RPC, or transaction');
