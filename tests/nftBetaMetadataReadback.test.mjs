import test from 'node:test';
import assert from 'node:assert/strict';
import {readVerifiedBetaMetadata as verify} from '../server/nftBetaMetadataReadback.mjs';
const identity={registrationId:'7',albumId:'ALBUM-BETA-share_475784',copyNumber:'COPY-BETA-3'};
const metadataUri='ipfs://bafybeigdyrzt5sfp7udm7hu76uhza5kd4wzttby6ckmpn6hz23l563ql6a';
const body={...identity,name:'AJINE Beta Copy',description:'Testnet album copy'};
const response=(metadata)=>({ok:true,headers:{get:()=>null},text:async()=>JSON.stringify(metadata)});
test('accepts matching pinned metadata and produces no write',async()=>{
 let called;
 const result=await verify({metadataUri,identity,fetcher:async(url,options)=>{called={url,options};return response(body);}});
 assert.equal(result.verified,true);
 assert.equal(result.copyNumber,identity.copyNumber);
 assert.equal(called.options.method,'GET');
 assert.equal(called.url,'https://ipfs.io/ipfs/'+metadataUri.slice(7));
});
test('rejects wrong NFT copy number',async()=>{
 await assert.rejects(verify({metadataUri,identity,fetcher:async()=>response({...body,copyNumber:'COPY-BETA-4'})}),/METADATA_COPY_IDENTITY_MISMATCH/);
});
test('rejects missing IPFS CID',async()=>{
 await assert.rejects(verify({metadataUri:'https://example.org/metadata',identity}),/METADATA_IPFS_CID_REQUIRED/);
});
test('rejects personal data in NFT metadata',async()=>{
 await assert.rejects(verify({metadataUri,identity,fetcher:async()=>response({...body,userEmail:'buyer@example.com'})}),/METADATA_PRIVATE_FIELD_FORBIDDEN/);
});
test('rejects unsupported gateway',async()=>{
 await assert.rejects(verify({metadataUri,identity,gateway:'http://127.0.0.1:8000'}),/METADATA_GATEWAY_NOT_ALLOWED/);
});
