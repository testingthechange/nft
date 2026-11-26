import test from 'node:test';
import assert from 'node:assert/strict';
import {readCommercialPreprintRegistration} from '../server/nftCommercialPreprintEvidence.mjs';
const env={AJINE_PIPELINE1_RETURN_TOKEN:'a'.repeat(32)};
const evidence={source:'commercial-postgres-readback',verified:true,registrationVerified:true,
 paymentRecordMatched:true,ownershipVerified:true,registrationId:'7',
 albumId:'ALBUM-BETA-share_475784',copyNumber:'COPY-BETA-3'};
test('server-only commercial evidence readback',async()=>{
 let req;
 const fetcher=async(url,opts)=>{req={url,opts};return {ok:true,json:async()=>({ok:true,mintAuthorized:false,evidence})};};
 const result=await readCommercialPreprintRegistration('7',{env,fetcher});
 assert.equal(result.copyNumber,'COPY-BETA-3');
 assert.equal(req.opts.method,'POST');
 assert.equal(req.opts.headers.Authorization,'Bearer '+env.AJINE_PIPELINE1_RETURN_TOKEN);
 assert.equal(JSON.parse(req.opts.body).registrationId,'7');
});
test('rejects untrusted mint authorization claims',async()=>{
 const fetcher=async()=>({ok:true,json:async()=>({ok:true,mintAuthorized:true,evidence})});
 await assert.rejects(()=>readCommercialPreprintRegistration('7',{env,fetcher}),/EVIDENCE_INVALID/);
});
test('rejects evidence for another registration',async()=>{
 const fetcher=async()=>({ok:true,json:async()=>({ok:true,mintAuthorized:false,evidence:{...evidence,registrationId:'8'}})});
 await assert.rejects(()=>readCommercialPreprintRegistration('7',{env,fetcher}),/EVIDENCE_INVALID/);
});
test('requires configured server token and valid registration',async()=>{
 await assert.rejects(()=>readCommercialPreprintRegistration('0',{env}),/INVALID_PREPRINT_REGISTRATION_ID/);
 await assert.rejects(()=>readCommercialPreprintRegistration('7',{env:{}}),/TOKEN_UNAVAILABLE/);
});
