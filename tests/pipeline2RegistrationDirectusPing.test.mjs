import test from 'node:test';
import assert from 'node:assert/strict';
import { pingPipeline2RegistrationDirectus } from '../server/pipeline2RegistrationDirectusPing.mjs';
const fields=['registration_id','album_id','album_copy_number','registered_owner_id','purchase_transaction_id','registration_date'];
test('six-field Directus read-only ping confirms accessible record', async()=>{
 let method='GET',query='';
 const fetchImpl=async(url,options)=>{method=options.method||'GET';query=url.searchParams.get('fields');return {ok:true,json:async()=>({data:[Object.fromEntries(fields.map(k=>[k,'test']))]})};};
 const result=await pingPipeline2RegistrationDirectus({token:'x'.repeat(32),fetchImpl});
 assert.equal(result.ok,true);assert.equal(result.registration_sample_present,true);
 assert.equal(result.ownership_verified,false);assert.equal(method,'GET');assert.equal(query,fields.join(','));
});
test('empty Directus collection is accessible but not populated',async()=>{
 const result=await pingPipeline2RegistrationDirectus({token:'x'.repeat(32),fetchImpl:async()=>({ok:true,json:async()=>({data:[]})})});
 assert.equal(result.ok,true);assert.equal(result.registration_sample_present,false);
});
test('missing registration field fails closed',async()=>{
 const result=await pingPipeline2RegistrationDirectus({token:'x'.repeat(32),fetchImpl:async()=>({ok:true,json:async()=>({data:[{registration_id:'r'}]})})});
 assert.equal(result.ok,false);
});
test('Directus auth or network failure fails closed',async()=>{
 const result=await pingPipeline2RegistrationDirectus({token:'x'.repeat(32),fetchImpl:async()=>({ok:false})});
 assert.equal(result.ok,false);
});
test('missing token fails closed',async()=>{
 const result=await pingPipeline2RegistrationDirectus({});
 assert.equal(result.ok,false);
});

test('upstream status categories are sanitized without response body', async () => {
 for (const [status, reason] of [[401,'directus_auth_rejected'],[403,'directus_access_denied'],[404,'directus_collection_not_found'],[400,'directus_query_rejected'],[503,'directus_server_unavailable']]) {
  const result=await pingPipeline2RegistrationDirectus({token:'x'.repeat(32),fetchImpl:async()=>({ok:false,status,json:async()=>({secret:'must-not-appear'})})});
  assert.equal(result.ok,false); assert.equal(result.reason,reason);
  assert.equal(result.upstream_http_status,status);
  assert.equal(JSON.stringify(result).includes('must-not-appear'),false);
 }
});
