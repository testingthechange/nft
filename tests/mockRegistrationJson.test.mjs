import test from "node:test";
import assert from "node:assert/strict";
import {inspectMockJson,MOCK_REGISTRATION} from "../server/mockRegistrationJson.mjs";
import {previewRegistration} from "../server/registrationPreview.mjs";
import {readFileSync} from "node:fs";
test("NFT accepts exact synthetic JSON with explicit receipt",()=>{
 const result=inspectMockJson({...MOCK_REGISTRATION},previewRegistration);
 assert.deepEqual(result,{ok:true,received:true,validated:true,mock_only:true,stored:false,minted:false,
  registration_id:"REG-BETA-001",album_copy_number:"COPY-BETA-001",destination:"ajine-nft-api"});
});
test("NFT rejects any changed identity or extra customer field",()=>{
 for(const modified of [
  {...MOCK_REGISTRATION,registered_owner_id:"real-clerk-id"},
  {...MOCK_REGISTRATION,album_copy_number:"COPY-361092"},
  {...MOCK_REGISTRATION,payment_status:"succeeded"},
  {...MOCK_REGISTRATION,email:"customer@example.com"}
 ])assert.deepEqual(inspectMockJson(modified,previewRegistration),{ok:false,error:"mock_fixture_only"});
});
test("NFT HTTP route remains off by default and never writes",()=>{
 const src=readFileSync("server/index.mjs","utf8");
 const route=src.split("if (path === MOCK_JSON_PATH)")[1]?.split("if (path === BETA_SIGNAL_PATH)")[0];
 assert.ok(route);
 assert.match(route,/MOCK_JSON_ENABLED/);
 assert.match(route,/mock_json_disabled/);
 assert.match(route,/inspectMockJson\(body, previewRegistration\)/);
 assert.ok(!route.includes("persistVerifiedNftRegistration"));
});
