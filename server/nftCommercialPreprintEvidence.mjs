// Independent Registration evidence readback. The NFT service does not infer payment
// from submitted JSON or accept untrusted caller verification flags.
export async function readCommercialPreprintRegistration(registrationId,{fetcher=fetch,env=process.env}={}){
 if(!/^[1-9][0-9]*$/.test(String(registrationId??'')))
   throw Error('INVALID_PREPRINT_REGISTRATION_ID');
 const token=env.AJINE_PIPELINE1_RETURN_TOKEN;
 if(!token||token.length<32)throw Error('PREPRINT_EVIDENCE_TOKEN_UNAVAILABLE');
 const response=await fetcher('https://stripe-beta.onrender.com/api/registration/pipeline1/nft-preprint-evidence',{
  method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
  body:JSON.stringify({registrationId:String(registrationId)}),
  signal:AbortSignal.timeout(10000),redirect:'error'
 });
 if(!response.ok)throw Error('PREPRINT_REGISTRATION_READBACK_FAILED');
 const body=await response.json();
 const e=body?.evidence;
 if(body.ok!==true||body.mintAuthorized!==false||
   e?.source!=='commercial-postgres-readback'||e.registrationVerified!==true||
   e.paymentRecordMatched!==true||e.ownershipVerified!==true||
   e.registrationId!==String(registrationId))
   throw Error('PREPRINT_REGISTRATION_EVIDENCE_INVALID');
 return Object.freeze(e);
}
