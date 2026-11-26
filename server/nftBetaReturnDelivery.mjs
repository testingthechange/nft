// Private delivery of verified Polygon return to commercial Registration.
// Commercial service independently verifies the exact copy and Polygon proof
// before committing NFT fields to its Directus-backed ownership record.
export async function deliverVerifiedBetaReturn({originalRegistration,returnPackage,env=process.env,fetcher=fetch}={}){
  if(originalRegistration?.registration_id!=='6'||
     returnPackage?.identity?.registrationId!=='6'||
     returnPackage?.fixtureOnly!==false||
     returnPackage?.releaseAuthorized!==true||
     returnPackage?.nft?.verificationStatus!=='verified'||
     returnPackage?.nft?.ownershipConfirmed!==true)
    throw Error('VERIFIED_BETA_RETURN_REQUIRED');
  const token=env.AJINE_PIPELINE1_RETURN_TOKEN;
  if(typeof token!=='string'||token.length<32)throw Error('BETA_RETURN_TOKEN_REQUIRED');
  const response=await fetcher('https://stripe-beta.onrender.com/api/registration/pipeline1/return',{
    method:'POST',redirect:'error',headers:{
      'Content-Type':'application/json',
      'Authorization':'Bearer '+token
    },
    body:JSON.stringify({originalRegistration,returnPackage}),
    signal:AbortSignal.timeout(12000)
  });
  if(!response.ok){
    const rejected=await response.json().catch(()=>null);
    const code=typeof rejected?.error==='string'&&/^[A-Za-z][A-Za-z0-9_]{0,79}$/.test(rejected.error)?rejected.error:'UNCLASSIFIED';
    throw Error('BETA_RETURN_STORE_HTTP_'+response.status+'_'+code);
  }
  const data=await response.json();
  if(data?.ok!==true||data?.validated!==true||
     data?.registrationMatched!==true||data?.stored!==true)
     throw Error('BETA_RETURN_NOT_CONFIRMED_STORED');
  return Object.freeze({stored:true,idempotent:data.idempotent===true});
}
