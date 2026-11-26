// Post-mint delivery to commercial Registration. Never claims delivered until the
// commercial service verifies Polygon proof and commits the Directus projection.
export async function deliverVerifiedBetaMint({originalRegistration,returnPackage,env=process.env,fetcher=fetch}={}){
 if(env.AJINE_BETA_MINT_DELIVERY_READY!=='true')throw Error('BETA_DELIVERY_DISABLED');
 const token=env.AJINE_PIPELINE1_RETURN_TOKEN;
 if(!token||token.length<32)throw Error('BETA_DELIVERY_TOKEN_REQUIRED');
 if(originalRegistration?.registration_id!=='6'||returnPackage?.identity?.registrationId!=='6'||
    returnPackage?.fixtureOnly!==false||returnPackage?.releaseAuthorized!==true||
    returnPackage?.nft?.verificationStatus!=='verified')
   throw Error('BETA_DELIVERY_PROOF_REQUIRED');
 const response=await fetcher('https://stripe-beta.onrender.com/api/registration/pipeline1/return',{
   method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
   body:JSON.stringify({originalRegistration,returnPackage}),
   redirect:'error',signal:AbortSignal.timeout(20000)
 });
 if(!response.ok)throw Error('BETA_DELIVERY_HTTP_'+response.status);
 const body=await response.json();
 if(body.ok!==true||body.stored!==true||body.validated!==true&&body.status!=='stored')
   throw Error('BETA_DELIVERY_STORAGE_NOT_CONFIRMED');
 return Object.freeze({stored:true,delivered:true,idempotent:body.idempotent===true});
}
