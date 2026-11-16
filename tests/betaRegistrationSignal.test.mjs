import test from 'node:test';
import assert from 'node:assert/strict';
import {betaSignalCors,validateBetaSignal,betaSignalReply,BETA_SIGNAL_PATH} from '../server/betaRegistrationSignal.mjs';
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
