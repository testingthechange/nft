// Read-only connection diagnostic. Does not inspect or disclose ownership data.
const ORIGIN="https://directus-otul.onrender.com";
export async function inspectCommercialDirectusConnection({fetcher=fetch,env=process.env}={}){
 const token=env.AJINE_COMMERCIAL_DIRECTUS_READ_TOKEN;
 if(typeof token!=="string"||!token.trim())return {connected:false,recordFound:false,reason:"token_not_configured"};
 if(env.AJINE_COMMERCIAL_DIRECTUS_URL){
  try{const u=new URL(env.AJINE_COMMERCIAL_DIRECTUS_URL);
   if(u.origin!==ORIGIN||u.pathname!=="/")return {connected:false,recordFound:false,reason:"origin_mismatch"};
  }catch{return {connected:false,recordFound:false,reason:"origin_mismatch"};}
 }
 try{
  const response=await fetcher(ORIGIN+"/items/ownership_records/132?fields=id",{
   method:"GET",headers:{Authorization:"Bearer "+token,Accept:"application/json"},
   signal:AbortSignal.timeout(7000),redirect:"error"
  });
  if(!response.ok)return {connected:false,recordFound:false,reason:"read_unavailable"};
  const record=(await response.json())?.data;
  const found=String(record?.id??"")==="132";
  return {connected:found,recordFound:found,reason:found?null:"record_not_found",
   registrationComplete:false,releaseAuthorized:false,stored:false};
 }catch{return {connected:false,recordFound:false,reason:"read_unavailable"};}
}
