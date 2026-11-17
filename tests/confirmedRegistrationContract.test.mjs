import test from "node:test";
import assert from "node:assert/strict";
import {validateConfirmedRegistrationJson} from "../server/confirmedRegistrationContract.mjs";
const good={schema_version:1,event_type:"album.registration.confirmed",
  registration_id:"REG-123",album_id:"ALBUM-456",album_copy_number:"COPY-361092",
  registered_owner_id:"clerk-123",purchase_transaction_id:"pi_123",
  registration_date:"2026-11-17T20:00:00.000Z"};
test("validates exact confirmed-registration wire contract without storing",()=>{
  const result=validateConfirmedRegistrationJson(good);
  assert.equal(result.ok,true);
  assert.equal(result.record.album_copy_number,"COPY-361092");
  assert.equal(result.stored,false);
  assert.equal(result.minted,false);
  assert.equal(result.payment_verified,false);
});
test("rejects unexpected fields, malformed dates, and beta preview",()=>{
  assert.equal(validateConfirmedRegistrationJson({...good,card_number:"123"}).ok,false);
  assert.equal(validateConfirmedRegistrationJson({...good,registration_date:"yesterday"}).ok,false);
  assert.equal(validateConfirmedRegistrationJson({...good,event_type:"album.registration.preview"}).ok,false);
});
