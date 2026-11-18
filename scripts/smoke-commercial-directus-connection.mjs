// GitHub Actions-only diagnostic; private bearer token is never printed.
const token=process.env.AJINE_REGISTRATION_PREVIEW_TOKEN;
if(!token){console.error("HOLD: missing GitHub Actions API token secret");process.exit(2);}
try{
 const r=await fetch("https://ajine-nft-api.onrender.com/api/integrations/registration/evidence/connectivity",{
  method:"POST",headers:{Authorization:"Bearer "+token},signal:AbortSignal.timeout(20000),redirect:"error"
 });
 const data=await r.json();
 const passed=r.status===200&&data.connected===true&&data.recordFound===true&&
  data.releaseAuthorized===false&&data.stored===false;
 console.log(JSON.stringify({test:"commercial-directus-connection",passed,
  httpStatus:r.status,connected:data.connected===true,recordFound:data.recordFound===true,
  reason:data.reason||data.error||null,registrationComplete:false,releaseAuthorized:false}));
 if(!passed)process.exitCode=1;
}catch{console.error("HOLD: live connection request unavailable");process.exitCode=1;}
