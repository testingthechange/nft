import test from 'node:test';
import assert from 'node:assert/strict';
import { readPolygonAmoyStatus, POLYGON_AMOY_CHAIN_ID } from '../server/polygonAmoy.mjs';

function mockProvider(chain = '0x13882', block = '0x40') {
  const calls = [];
  const provider = {
    async send(method, params) {
      calls.push([method, params]);
      if (method === 'eth_chainId') return chain;
      if (method === 'eth_blockNumber') return block;
      throw Error('unexpected RPC method');
    },
    destroy() { calls.push(['destroy']); },
  };
  return { provider, calls };
}

test('correct Polygon Amoy chain id', () => {
  assert.equal(POLYGON_AMOY_CHAIN_ID, 80002);
});
test('Amoy RPC responds with verified chain and block, read-only', async () => {
  const { provider, calls } = mockProvider();
  const result = await readPolygonAmoyStatus({
    rpcUrl: 'https://rpc-amoy.polygon.technology/',
    makeProvider: () => provider
  });
  assert.deepEqual(result, {
    connected: true, network: 'polygon-amoy', chain_id: 80002, block_number: 64,
    read_only: true, mint_enabled: false, wallet_configured: false
  });
  assert.deepEqual(calls, [['eth_chainId', []], ['eth_blockNumber', []], ['destroy']]);
});
test('rejects wrong chain before reading block', async () => {
  const { provider, calls } = mockProvider('0x89');
  const result = await readPolygonAmoyStatus({rpcUrl: 'https://example.org',makeProvider: () => provider});
  assert.equal(result.connected,false);
  assert.equal(result.reason,'unexpected_chain');
  assert.deepEqual(calls, [['eth_chainId',[]],['destroy']]);
});
test('invalid block response is rejected', async () => {
  const { provider } = mockProvider('0x13882', 'bad');
  const result = await readPolygonAmoyStatus({rpcUrl: 'https://example.org',makeProvider: () => provider});
  assert.equal(result.reason,'invalid_block_number');
});
test('rejects insecure RPC URL', async () => {
  let called=false;
  const result=await readPolygonAmoyStatus({rpcUrl:'http://localhost:8545',makeProvider:()=>{called=true;}});
  assert.equal(result.reason,'invalid_rpc_configuration');
  assert.equal(called,false);
});
test('RPC errors do not leak details', async () => {
  const { provider }=mockProvider();
  provider.send=async()=>{throw Error('private node details');};
  const result=await readPolygonAmoyStatus({rpcUrl:'https://example.org',makeProvider:()=>provider});
  assert.deepEqual(result,{connected:false,reason:'rpc_unavailable'});
});
