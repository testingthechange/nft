import test from 'node:test';
import assert from 'node:assert/strict';
import {
  readPolygonAmoyStatus, POLYGON_AMOY_CHAIN_ID, POLYGON_RPC_TIMEOUT_MS
} from '../server/polygonAmoy.mjs';

function mockRpc({chain='0x13882',block='0x40',httpStatus=200}={}) {
  const methods=[];
  const fetchImpl=async (_url, request) => {
    const payload=JSON.parse(request.body);
    methods.push(payload.method);
    return {
      ok: httpStatus === 200, status: httpStatus,
      async json() {return {jsonrpc:'2.0',id:payload.id,result:
        payload.method==='eth_chainId' ? chain : block};}
    };
  };
  return {fetchImpl,methods};
}
test('Polygon Amoy chain ID and bounded timeout configured', () => {
  assert.equal(POLYGON_AMOY_CHAIN_ID,80002);
  assert.equal(POLYGON_RPC_TIMEOUT_MS,7000);
});
test('valid RPC checks chain then block and returns read-only status',async()=>{
  const {fetchImpl,methods}=mockRpc();
  const result=await readPolygonAmoyStatus({rpcUrl:'https://polygon-amoy.api.onfinality.io/public',fetchImpl});
  assert.deepEqual(result,{
    connected:true,network:'polygon-amoy',chain_id:80002,block_number:64,
    read_only:true,mint_enabled:false,wallet_configured:false
  });
  assert.deepEqual(methods,['eth_chainId','eth_blockNumber']);
});
test('rejects wrong chain before reading block',async()=>{
  const {fetchImpl,methods}=mockRpc({chain:'0x89'});
  const result=await readPolygonAmoyStatus({fetchImpl});
  assert.equal(result.reason,'unexpected_chain');
  assert.deepEqual(methods,['eth_chainId']);
});
test('invalid hexadecimal block response is rejected',async()=>{
  const {fetchImpl}=mockRpc({block:'bad'});
  const result=await readPolygonAmoyStatus({fetchImpl});
  assert.equal(result.reason,'invalid_block_number');
});
test('rejects HTTP RPC URLs without issuing any call',async()=>{
  let called=false;
  const result=await readPolygonAmoyStatus({
    rpcUrl:'http://localhost:8545',fetchImpl:()=>{called=true;}
  });
  assert.equal(result.reason,'invalid_rpc_configuration');
  assert.equal(called,false);
});
test('remote RPC failure gives stage without leaking provider error',async()=>{
  const result=await readPolygonAmoyStatus({fetchImpl:async()=>{throw Error('private upstream diagnostics');}});
  assert.deepEqual(result,{connected:false,reason:'rpc_unavailable',stage:'chain_id'});
});
test('RPC rejection reports bounded upstream status and stage',async()=>{
  const {fetchImpl}=mockRpc({httpStatus:429});
  const result=await readPolygonAmoyStatus({fetchImpl});
  assert.deepEqual(result,{connected:false,reason:'rpc_http_error',stage:'chain_id',upstream_status:429});
});
test('timeout aborts hung upstream request',async()=>{
  let aborted=false;
  const fetchImpl=(_url,{signal})=>new Promise((_resolve,reject)=>{
    signal.addEventListener('abort',()=>{aborted=true;reject(Error('aborted'));},{once:true});
  });
  const result=await readPolygonAmoyStatus({fetchImpl,timeoutMs:30});
  assert.deepEqual(result,{connected:false,reason:'rpc_timeout',stage:'chain_id'});
  assert.equal(aborted,true);
});
test('timeout across second RPC call retains stage',async()=>{
  const fetchImpl=(_url,{body,signal})=>{
    const data=JSON.parse(body);
    if(data.method==='eth_chainId')return Promise.resolve({
      ok:true,async json(){return {jsonrpc:'2.0',id:data.id,result:'0x13882'};}
    });
    return new Promise((_resolve,reject)=>{
      signal.addEventListener('abort',()=>reject(Error('aborted')),{once:true});
    });
  };
  const result=await readPolygonAmoyStatus({fetchImpl,timeoutMs:30});
  assert.deepEqual(result,{connected:false,reason:'rpc_timeout',stage:'block_number'});
});
