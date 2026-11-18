import assert from "node:assert/strict";
import {inspectCommercialRegistrationEvidence} from "../server/commercialRegistrationEvidence.mjs";
const env={AJINE_COMMERCIAL_DIRECTUS_URL:"https://directus-otul.onrender.com",AJINE_COMMERCIAL_DIRECTUS_READ_TOKEN:"test-private-token"};
const args={registrationId:"132",albumId:"album1",copyNumber:"COPY-639033",env};
const fetcher=async(url,options)=>{
 assert.equal(new URL(url).pathname,"/items/ownership_records/132");
 assert.equal(new URL(url).origin,"https://directus-otul.onrender.com");
 assert.equal(options.method,"GET");
 return {ok:true,json:async()=>({data:{id:132,albumId:"album1",album_copy_number:"COPY-639033",ownershipStatus:"registered",registeredAt:"2026-08-24"}})};
};
const good=await inspectCommercialRegistrationEvidence({...args,fetcher});
assert.equal(good.matched,true);
assert.equal(good.releaseAuthorized,false);
assert.equal((await inspectCommercialRegistrationEvidence({...args,env:{},fetcher})).status,"hold");
assert.equal((await inspectCommercialRegistrationEvidence({...args,copyNumber:"OTHER",fetcher})).status,"hold");
assert.equal((await inspectCommercialRegistrationEvidence({...args,fetcher:async()=>({ok:false})})).status,"hold");
console.log("COMMERCIAL_REGISTRATION_EVIDENCE_TEST_GREEN");

assert.equal((await inspectCommercialRegistrationEvidence({...args,env:{...env,AJINE_COMMERCIAL_DIRECTUS_URL:"https://wrong.example"}})).reason,"commercial_directus_origin_mismatch");
