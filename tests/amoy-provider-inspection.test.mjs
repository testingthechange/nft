import assert from 'node:assert/strict';
import {classifyAmoyProvider,inspectAmoyProvider} from '../scripts/inspect-amoy-provider.mjs';
assert.equal(classifyAmoyProvider('').provider,'public_fallback');
assert.equal(classifyAmoyProvider('https://polygon-amoy.g.alchemy.com/v2/secret-key').provider,'alchemy');
assert.equal(classifyAmoyProvider('https://polygon-amoy.api.onfinality.io/public').provider,'custom_rpc');
assert.equal(classifyAmoyProvider('http://polygon-amoy.g.alchemy.com/v2/key').provider,'invalid');
const result=await inspectAmoyProvider({rpcUrl:'https://polygon-amoy.g.alchemy.com/v2/test-secret',statusReader:async()=>({
 connected:true,chain_id:80002,read_only:true,mint_enabled:false
})});
assert.equal(result.connected,true);
assert.equal(result.provider,'alchemy');
assert.equal(JSON.stringify(result).includes('test-secret'),false);
console.log('PASS: provider selection report redacts RPC URL and key');
