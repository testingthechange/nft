import assert from 'node:assert/strict';
import {pingNftPipeline} from '../scripts/ping-nft-pipeline.mjs';
const good=await pingNftPipeline({statusReader:async()=>({
 connected:true,chain_id:80002,block_number:123,read_only:true,mint_enabled:false,wallet_configured:false
})});
assert.equal(good.passed,true);
assert.equal(good.fixtureOnly,true);
assert.equal(good.stages.assembly,'prepared-not-minted');
assert.equal(good.stages.handoff,true);
assert.equal(good.broadcast,false);
assert.equal(good.minted,false);
const bad=await pingNftPipeline({statusReader:async()=>({
 connected:true,chain_id:137,read_only:true,mint_enabled:false
})});
assert.equal(bad.passed,false);
console.log('PASS: synthetic board-to-Amoy ping and wrong-chain fail-closed');
