// Run inside a trusted server environment; never print tokens or customer identifiers.
// Required env: AJINE_REGISTRATION_PREVIEW_TOKEN, AJINE_REGISTRATION_TEST_ID,
// AJINE_REGISTRATION_TEST_ALBUM_ID, AJINE_REGISTRATION_TEST_COPY_NUMBER.
// Optional: AJINE_NFT_API_BASE_URL (defaults to localhost).
const base=process.env.AJINE_NFT_API_BASE_URL||"http://127.0.0.1:3000";
const token=process.env.AJINE_REGISTRATION_PREVIEW_TOKEN;
const registrationId=process.env.AJINE_REGISTRATION_TEST_ID;
const albumId=process.env.AJINE_REGISTRATION_TEST_ALBUM_ID;
const copyNumber=process.env.AJINE_REGISTRATION_TEST_COPY_NUMBER;
if(!token||!registrationId||!albumId||!copyNumber){
 console.error("HOLD: missing private test credentials or authoritative record identifiers");
 process.exitCode=2;
}else{
 try{
  const url=new URL("/api/integrations/registration/evidence/inspect",base);
  if(url.protocol!=="https:"&&!["127.0.0.1","localhost"].includes(url.hostname))
   throw Error("non_tls_target");
  const response=await fetch(url,{
   method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},
   body:JSON.stringify({registrationId,albumId,copyNumber}),
   signal:AbortSignal.timeout(12000),redirect:"error"
  });
  const result=await response.json();
  const passed=response.status===200&&result.matched===true&&
   result.status==="registration_evidence_matched"&&
   result.registrationAuthorized===false&&result.polygonProofVerified===false&&
   result.releaseAuthorized===false&&result.delivered===false&&result.stored===false;
  console.log(JSON.stringify({test:"private-registration-evidence-live-smoke",
   passed,httpStatus:response.status,status:result.status||"hold",
   reason:result.reason||null,releaseAuthorized:false,stored:false}));
  if(!passed)process.exitCode=1;
 }catch(e){
  console.error(JSON.stringify({test:"private-registration-evidence-live-smoke",
   passed:false,reason:"request_failed",errorCode:e.message==="non_tls_target"?"non_tls_target":"unavailable"}));
  process.exitCode=1;
 }
}
