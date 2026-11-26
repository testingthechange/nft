import test from 'node:test';
import assert from 'node:assert/strict';
import {deliverVerifiedBetaReturn} from '../server/nftBetaReturnDelivery.mjs';

const registration={registration_id:'6',album_id:'ALBUM-BETA-share_475784',album_copy_number:'COPY-BETA-1'};
const pack={identity:{registrationId:'6'},fixtureOnly:false,releaseAuthorized:true,
  nft:{verificationStatus:'verified',ownershipConfirmed:true}};
const env={AJINE_PIPELINE1_RETURN_TOKEN:'a'.repeat(40)};
test('verified beta return only succeeds after independent commercial storage confirmation',async()=>{
 let calls=0;
 const fetcher=async(url,request)=>{
   calls++;
   assert.equal(url,'https://stripe-beta.onrender.com/api/registration/pipeline1/return');
   assert.equal(request.method,'POST');
   assert.equal(JSON.parse(request.body).originalRegistration.registration_id,'6');
   return {ok:true,json:async()=>({ok:true,validated:true,registrationMatched:true,stored:true,idempotent:false})};
 };
 assert.deepEqual(await deliverVerifiedBetaReturn({originalRegistration:registration,returnPackage:pack,env,fetcher}),{stored:true,idempotent:false});
 assert.equal(calls,1);
});
test('server must not claim delivery if commercial storage fails or response is only accepted',async()=>{
 const fetcher=async()=>({ok:true,json:async()=>({ok:true,validated:true,registrationMatched:true,stored:false})});
 await assert.rejects(deliverVerifiedBetaReturn({originalRegistration:registration,returnPackage:pack,env,fetcher}),/NOT_CONFIRMED_STORED/);
});
test('unverified return, other registration or absent token must never call commercial endpoint',async()=>{
 let calls=0;const fetcher=async()=>{calls++;throw Error('unexpected network')};
 await assert.rejects(deliverVerifiedBetaReturn({originalRegistration:{...registration,registration_id:'7'},returnPackage:pack,env,fetcher}),/VERIFIED_BETA_RETURN_REQUIRED/);
 await assert.rejects(deliverVerifiedBetaReturn({originalRegistration:registration,returnPackage:{...pack,fixtureOnly:true},env,fetcher}),/VERIFIED_BETA_RETURN_REQUIRED/);
 await assert.rejects(deliverVerifiedBetaReturn({originalRegistration:registration,returnPackage:pack,env:{},fetcher}),/BETA_RETURN_TOKEN_REQUIRED/);
 assert.equal(calls,0);
});
