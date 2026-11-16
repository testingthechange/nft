import test from 'node:test';
import assert from 'node:assert/strict';
import {betaSignalCors,validateBetaSignal,betaSignalReply,BETA_SIGNAL_PATH,syntheticBetaPurchasePreview,completeBetaRegistrationPreview} from '../server/betaRegistrationSignal.mjs';
import {previewRegistration} from '../server/registrationPreview.mjs';
const signal={schema_version:1,beta_only:true,registration_write_succeeded:true,data_transferred:false};

test('correct route and allowlisted third-party origin',()=>{
  assert.equal(BETA_SIGNAL_PATH,'/api/integrations/registration/beta-signal');
  assert.equal(betaSignalCors('https://thirdparty-tz9x.onrender.com'),'https://thirdparty-tz9x.onrender.com');
  assert.equal(betaSignalCors('https://untrusted.example'),null);
});
test('accepts only four metadata booleans and version',()=>{
  assert.equal(validateBetaSignal(signal),true);
  assert.equal(validateBetaSignal({...signal,customer_id:'user_123'}),false);
  assert.equal(validateBetaSignal({...signal,order_number:'ORD-001'}),false);
  assert.equal(validateBetaSignal({...signal,registration_write_succeeded:false}),false);
  assert.equal(validateBetaSignal({...signal,data_transferred:true}),false);
});
test('returns no writes, no payment, no ownership',()=>{
  const reply=betaSignalReply();
  assert.equal(reply.ok,true);
  assert.equal(reply.dry_run,true);
  assert.equal(reply.stored,false);
  assert.equal(reply.data_transferred,false);
  assert.equal(reply.payment_verified,false);
  assert.equal(reply.registration_created,false);
});

test('valid beta completion executes existing six-field purchase preview without storage',()=>{
  const result=completeBetaRegistrationPreview(signal,previewRegistration);
  assert.equal(result.ok,true);
  assert.equal(result.beta_purchase_preview_processed,true);
  assert.equal(result.dry_run,true);
  assert.equal(result.stored,false);
  assert.equal(result.payment_verified,false);
  assert.equal(result.registration_created,false);
  assert.equal(result.destination,'Abum_Registration');
  assert.deepEqual(result.mapped_fields,[
    'registration_id','album_id','album_copy_number',
    'registered_owner_id','purchase_transaction_id','registration_date'
  ]);
});
test('synthetic fixture cannot contain actual buyer identities',()=>{
  const fixture=syntheticBetaPurchasePreview();
  assert.equal(fixture.payment_status,'test_only');
  for(const field of ['registration_id','album_id','album_copy_number',
    'registered_owner_id','purchase_transaction_id']) {
    assert.match(fixture[field],/BETA/);
  }
});
test('invalid completion signal cannot execute purchase preview',()=>{
  let calls=0;
  const result=completeBetaRegistrationPreview({...signal,email:'buyer@example.com'},()=>{
    calls++;
    return previewRegistration(syntheticBetaPurchasePreview());
  });
  assert.equal(result.ok,false);
  assert.equal(calls,0);
});
test('failed purchase preview must not claim success',()=>{
  const result=completeBetaRegistrationPreview(signal,()=>({ok:false}));
  assert.equal(result.ok,false);
  assert.equal(result.error,'beta_purchase_preview_failed');
});
