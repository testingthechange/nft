import test from 'node:test';
import assert from 'node:assert/strict';
import {AbiCoder,keccak256} from 'ethers';
import {compileBetaAlbumNft} from '../scripts/compile-beta-nft.mjs';

test('beta ERC721 compiles with expected owner-gated mint and provenance lookups',()=>{
  const {abi,bytecode}=compileBetaAlbumNft();
  assert.ok(bytecode.length>0);
  const functions=new Set(abi.filter(item=>item.type==='function').map(item=>item.name));
  for(const name of ['mintBetaCopy','copyKey','tokenIdForCopy',
    'copyKeyOfToken','tokenURI','ownerOf','transferFrom','owner']) {
    assert.ok(functions.has(name),'missing '+name);
  }
  const mint=abi.find(item=>item.type==='function' && item.name==='mintBetaCopy');
  assert.equal(mint.stateMutability,'nonpayable');
  assert.deepEqual(mint.inputs.map(item=>item.type),['address','string','string','string']);
  assert.equal(mint.outputs[0].type,'uint256');
  assert.ok(abi.some(item=>item.type==='event'&&item.name==='BetaAlbumCopyMinted'));
});
test('demo copy identity is deterministic and unique for different albums or copies',()=>{
  const coder=AbiCoder.defaultAbiCoder();
  const key=(album,copy)=>keccak256(coder.encode(['string','string'],[album,copy]));
  const first=key('ALBUM-BETA-001','COPY-BETA-001');
  assert.match(first,/^0x[0-9a-f]{64}$/);
  assert.equal(first,key('ALBUM-BETA-001','COPY-BETA-001'));
  assert.notEqual(first,key('ALBUM-BETA-001','COPY-BETA-002'));
  assert.notEqual(first,key('ALBUM-BETA-002','COPY-BETA-001'));
});

test('retained NFT printer requires metadata URI and beta copy identity',()=>{
  const {abi}=compileBetaAlbumNft();
  const mint=abi.find(item=>item.type==='function'&&item.name==='mintBetaCopy');
  assert.equal(mint.inputs[3].name,'metadataUri');
  const lookup=abi.find(item=>item.type==='function'&&item.name==='tokenIdForCopy');
  assert.equal(lookup.stateMutability,'view');
  assert.deepEqual(lookup.inputs.map(item=>item.type),['string','string']);
});
