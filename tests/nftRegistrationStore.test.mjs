import test from "node:test";
import assert from "node:assert/strict";
import {inspectNftRegistration,persistVerifiedNftRegistration,mapRegistrationToNftDirectus} from "../server/nftRegistrationStore.mjs";
import {readFileSync} from "node:fs";
const record={registration_id:"REG-1",album_id:"ALBUM-1",album_copy_number:"COPY-361092",registered_owner_id:"clerk-1",purchase_transaction_id:"pi_1",registration_date:"2026-11-17T20:00:00.000Z"};
test("NFT store adapter preserves exact registration and copy keys",()=>{
 const mapped=mapRegistrationToNftDirectus(record);
 assert.equal(mapped.registration_id,"REG-1");
 assert.equal(mapped.album_copy_number,"COPY-361092");
 assert.equal(mapped.registration_status,"received");
});
test("NFT write remains denied without trusted verification and uniqueness",async()=>{
 await assert.rejects(persistVerifiedNftRegistration(record,{token:"test",fetchImpl:()=>{throw Error("called");}}),/unverified_registration_write_denied/);
});
test("existing registration is idempotent and mismatched identities fail closed",async()=>{
 const fetchImpl=async()=>({ok:true,json:async()=>({data:[{id:1,...record}]})});
 const checked=await inspectNftRegistration(record,{token:"test",fetchImpl});
 assert.equal(checked.status,"exists");
 const stored=await persistVerifiedNftRegistration(record,{token:"test",verifiedPayment:true,registrationReadBack:true,uniqueConstraintConfirmed:true,fetchImpl});
 assert.equal(stored.status,"already_registered");
 await assert.rejects(inspectNftRegistration({...record,album_copy_number:"COPY-2"},{token:"test",fetchImpl}),/registration_identity_conflict/);
});
test("inspection endpoint is default-off and contains no database writer",()=>{
 const src=readFileSync("server/index.mjs","utf8");
 const route=src.split("if (path === '/api/integrations/registration/inspect')")[1]?.split("if (path === '/api/integrations/registration/preview')")[0];
 assert.ok(route);
 assert.match(route,/INTAKE_INSPECT_ENABLED/);
 assert.match(route,/authorized\(req\)/);
 assert.match(route,/stored:false/);
 assert.ok(!route.includes("persistVerifiedNftRegistration"));
});
