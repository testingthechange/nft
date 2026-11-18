import assert from 'node:assert/strict';
import { checkBetaDeploymentReadiness } from '../scripts/check-amoy-beta-readiness.mjs';
const abi=['copyKey','tokenIdForCopy','mintBetaCopy','owner'].map(name=>({type:'function',name}));
const compiler=()=>({abi,bytecode:'aabbcc'});
const status={connected:true,chain_id:80002,read_only:true,mint_enabled:false,wallet_configured:false,block_number:100};
const ok=await checkBetaDeploymentReadiness({statusReader:async()=>status,compiler});
assert.equal(ok.ok,true);
assert.equal(ok.deployed,false);
assert.equal(ok.minted,false);
assert.equal(ok.deployment_authorized,false);
for (const change of [{chain_id:137},{connected:false},{mint_enabled:true},{wallet_configured:true},{read_only:false}]) {
 const result=await checkBetaDeploymentReadiness({statusReader:async()=>({...status,...change}),compiler});
 assert.equal(result.ok,false);
}
await assert.rejects(()=>checkBetaDeploymentReadiness({statusReader:async()=>status,
 compiler:()=>({abi:abi.slice(1),bytecode:'aabbcc'})}),/Missing required/);
console.log('PASS: Amoy deployment readiness is read-only, fail-closed, and never deploys');
