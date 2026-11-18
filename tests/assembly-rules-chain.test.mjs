import assert from 'node:assert/strict';
import { validateNftRulesBoard } from '../server/nftRulesBoardContract.mjs';
import { buildNftGatheringBoard } from '../server/nftGatheringBoard.mjs';
import { assembleFromGatheringBoard } from '../server/nftAssemblyAdapter.mjs';
const record = {registration_id:'synthetic-r1',album_id:'synthetic-a1',album_copy_number:'0009',
 registered_owner_id:'synthetic-o1',purchase_transaction_id:'synthetic-p1',registration_date:'2026-11-18T00:00:00Z'};
const board=buildNftGatheringBoard({verifiedRegistration:{verified:true,record}});
const input={version:'ajine-nft-rules-board-v1',registrationId:'synthetic-r1',decision:'eligible',
 permissions:{burnForRewards:true,convertToCollectibles:true,exportToWallet:false}};
const frame=assembleFromGatheringBoard(board,validateNftRulesBoard(input));
assert.equal(frame.copyNumber,'0009');
assert.equal(frame.options.convertToCollectibles,true);
assert.equal(frame.options.exportToWallet,false);
assert.equal(frame.tokenId,null);
const held=assembleFromGatheringBoard(board,validateNftRulesBoard({...input,decision:'hold'}));
assert.equal(held.options.burnForRewards,false);
assert.throws(()=>validateNftRulesBoard({...input,version:'unknown'}),/Unsupported/);
assert.throws(()=>validateNftRulesBoard({...input,permissions:{...input.permissions,exportToWallet:'true'}}),/Invalid/);
assert.throws(()=>assembleFromGatheringBoard(board,validateNftRulesBoard({...input,registrationId:'other'})),/mismatch/);
console.log('PASS: Gathering -> Rules contract -> Assembly (synthetic only)');
