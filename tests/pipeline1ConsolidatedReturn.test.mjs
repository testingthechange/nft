import test from 'node:test';
import assert from 'node:assert/strict';
import {assemblePipeline1OwnershipReturn as assemble} from '../server/pipeline1ConsolidatedReturn.mjs';
const registration={registration_id:'reg-1',album_id:'album-1',album_copy_number:'12',registered_owner_id:'owner-1',purchase_transaction_id:'pi_test_1',registration_date:'2026-11-22T12:00:00Z'};
const purchase={transactionId:'pi_test_1',albumId:'album-1',orderNumber:'order-1',pricePaidCents:999,currency:'USD',cardLast4:'4242'};
const ownership={registrationId:'reg-1',albumId:'album-1',copyNumber:'12',ownerId:'owner-1',ownershipKey:'own-1'};
test('consolidates all streams without exposing card data or releasing synthetic ownership',()=>{
 const p=assemble({registration,purchase,ownership});
 assert.equal(p.identity.copyNumber,'12');assert.equal(p.purchase.pricePaidCents,999);
 assert.equal(p.ownership.ownershipKey,'own-1');assert.equal(p.releaseAuthorized,false);
 assert.equal(p.delivered,false);assert.equal(JSON.stringify(p).includes('4242'),false);
});
test('mismatched identity fails closed',()=>{
 assert.throws(()=>assemble({registration,purchase,ownership:{...ownership,copyNumber:'13'}}),/ownership_identity_mismatch/);
 assert.throws(()=>assemble({registration,purchase:{...purchase,transactionId:'wrong'},ownership}),/purchase_identity_mismatch/);
});
