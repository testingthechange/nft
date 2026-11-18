import assert from 'node:assert/strict';
import { buildNftGatheringBoard } from '../server/nftGatheringBoard.mjs';
import { assembleFromGatheringBoard } from '../server/nftAssemblyAdapter.mjs';
const record = { registration_id:'synthetic-reg',album_id:'synthetic-album',album_copy_number:'0007',
 registered_owner_id:'synthetic-owner',purchase_transaction_id:'synthetic-purchase',registration_date:'2026-11-18T00:00:00Z' };
const rules = { registrationId:'synthetic-reg', decision:'eligible', permissions:{burnForRewards:true} };
const mock = buildNftGatheringBoard({mockRegistration:{accepted:true,record}});
assert.throws(()=>assembleFromGatheringBoard(mock,rules),/not a verified projection/);
const disconnected = buildNftGatheringBoard();
assert.throws(()=>assembleFromGatheringBoard(disconnected,rules),/not a verified projection/);
const verified = buildNftGatheringBoard({verifiedRegistration:{verified:true,record}});
const frame = assembleFromGatheringBoard(verified,rules);
assert.equal(frame.copyNumber,'0007');
assert.equal(frame.nftReference,'registration:synthetic-reg');
assert.equal(frame.options.burnForRewards,true);
assert.equal(frame.tokenId,null);
assert.throws(()=>assembleFromGatheringBoard(verified,{...rules,registrationId:'wrong'}),/mismatch/);
assert.throws(()=>assembleFromGatheringBoard(verified,null),/Missing Rules Board/);
console.log('PASS: verified gathering projection, synthetic assembly, mock rejection, disconnected rejection, rules mismatch');
