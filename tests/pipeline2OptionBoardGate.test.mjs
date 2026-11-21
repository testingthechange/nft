import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveNftOptionBoard } from '../server/pipeline2OptionBoardGate.mjs';

const nft = { nftId:'n1', registrationId:'r1', albumId:'a1', copyNumber:'12', ownerId:'owner1', status:'active' };
const valid = { session:'opaque-session', nftId:'n1', resolveOwner:async()=> 'owner1', resolveNft:async()=> nft };
test('trusted matching ownership projects options without dispatch', async () => {
 const result = await resolveNftOptionBoard(valid);
 assert.equal(result.ok,true); assert.deepEqual(result.options,['burn','export']);
 assert.equal(result.dispatched,false); assert.equal(result.stored,false);
});
test('browser-supplied verified cannot bypass missing trusted resolvers', async () => {
 const result = await resolveNftOptionBoard({ session:'x', nftId:'n1', verified:true, nft });
 assert.equal(result.ok,false);
});
test('mismatched owner fails closed', async () => {
 const result = await resolveNftOptionBoard({...valid,resolveOwner:async()=> 'other'});
 assert.equal(result.ok,false);
});
test('resolver error fails closed', async () => {
 const result = await resolveNftOptionBoard({...valid,resolveNft:async()=> {throw Error('secret');}});
 assert.equal(result.ok,false); assert.equal(result.reason,'ownership_verification_unavailable');
});
test('inactive NFT has no options', async () => {
 const result = await resolveNftOptionBoard({...valid,resolveNft:async()=>({...nft,status:'exported'})});
 assert.deepEqual(result.options,[]);
});
