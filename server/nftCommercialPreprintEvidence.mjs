import {readVerifiedBetaRegistration,readLatestVerifiedBetaRegistration} from './pipeline1BetaNftRegistrationEvidence.mjs';
// Independent Registration evidence readback. The NFT service does not infer payment
// from submitted JSON or accept untrusted caller verification flags.
export async function readCommercialPreprintRegistration(registrationId,{fetcher=fetch,env=process.env}={}){
 const latest=registrationId===undefined||registrationId===null||registrationId==='';
 if(!latest&&!/^[1-9][0-9]*$/.test(String(registrationId??'')))
   throw Error('INVALID_PREPRINT_REGISTRATION_ID');
 if(env.AJINE_DIRECTUS_PREPRINT_READ_ENABLED==='true'){
   try {
     return await (latest?readLatestVerifiedBetaRegistration({env}):readVerifiedBetaRegistration({registrationId,env}));
   } catch(error) {
     console.warn('AJINE_DIRECTUS_PREPRINT_FAILED',JSON.stringify({code:['REGISTRATION_NOT_FOUND','EXACT_COPY_OWNERSHIP_READBACK_FAILED','REGISTRATION_PAYMENT_RECORD_INVALID','DATABASE_IDENTITY_MISMATCH'].includes(error?.message)?error.message:'READBACK_UNAVAILABLE'}));
     throw Error('PREPRINT_REGISTRATION_READBACK_FAILED');
   }
 }
 const token=env.AJINE_PIPELINE1_RETURN_TOKEN;
 if(!token||token.length<32)throw Error('PREPRINT_EVIDENCE_TOKEN_UNAVAILABLE');
 let response;
 for(let attempt=0;attempt<2;attempt++){
   response=await fetcher('https://stripe-beta.onrender.com/api/registration/pipeline1/nft-preprint-evidence',{
  method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
  body:JSON.stringify(latest?{lookup:'latest_verified_beta'}:{registrationId:String(registrationId)}),
  signal:AbortSignal.timeout(90000),redirect:'error'
 });
   if(![502,503,504].includes(response.status)||attempt===1)break;
   console.warn('AJINE_PREPRINT_READBACK_RETRY',JSON.stringify({status:response.status}));
   await response.body?.cancel();
 }
 if(!response.ok){
   console.warn('AJINE_PREPRINT_READBACK_HTTP',JSON.stringify({status:response.status}));
   throw Error('PREPRINT_REGISTRATION_READBACK_FAILED');
 }
 const body=await response.json();
 const e=body?.evidence;
 if(body.ok!==true||body.mintAuthorized!==false||
   e?.source!=='commercial-postgres-readback'||e.registrationVerified!==true||
   e.paymentRecordMatched!==true||e.ownershipVerified!==true||
   (!/^[1-9][0-9]*$/.test(String(e.registrationId??''))||(!latest&&e.registrationId!==String(registrationId))))
   throw Error('PREPRINT_REGISTRATION_EVIDENCE_INVALID');
 return Object.freeze(e);
}
