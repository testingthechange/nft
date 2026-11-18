import assert from 'node:assert/strict';
import { buildNftGatheringBoard } from '../server/nftGatheringBoard.mjs';
import { assembleFromGatheringBoard } from '../server/nftAssemblyAdapter.mjs';
import { inspectPolygonTestnetHandoff } from '../server/nftPolygonTestnetConnection.mjs';
const record={registration_id:'synthetic-rpc',album_id:'synthetic-album',album_copy_number:'0011',
 registered_owner_id:'synthetic-owner',purchase_transaction_id:'synthetic-purchase',registration_date:'2026-11-18T00:00:00Z'};
const board=buildNftGatheringBoard({verifiedRegistration:{verified:true,record}});
const rules={version:'ajine-nft-rules-board-v1',registrationId:'synthetic-rpc',decision:'eligible',
 permissions:{burnForRewards:false,convertToCollectibles:false,exportToWallet:false}};
const frame=assembleFromGatheringBoard(board,rules);
const good=await inspectPolygonTestnetHandoff(frame,{statusReader:async()=>({
 connected:true,chain_id:80002,read_only:true,mint_enabled:false,block_number:12345})});
assert.equal(good.connected,true);
assert.equal(good.broadcast,false);
assert.equal(good.minted,false);
assert.equal(good.block_number,12345);
for(const bad of [
 {connected:true,chain_id:137,read_only:true,mint_enabled:false},
 {connected:true,chain_id:80002,read_only:false,mint_enabled:false},
 {connected:true,chain_id:80002,read_only:true,mint_enabled:true},
 {connected:false,chain_id:80002,read_only:true,mint_enabled:false}
]) {
 const result=await inspectPolygonTestnetHandoff(frame,{statusReader:async()=>bad});
 assert.equal(result.connected,false);
 assert.equal(result.broadcast,false);
}
console.log('PASS: Amoy chain gating, no wallet, no mint, no broadcast');
