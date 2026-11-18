// Private, read-only commercial Directus registration evidence lookup.
// Never trust browser-provided registration completion or proof flags.
const clean=(v)=>typeof v==="string"&&v.trim()?v.trim():null;
export async function inspectCommercialRegistrationEvidence({registrationId,albumId,copyNumber,fetcher=fetch,env=process.env}={}){
  const id=clean(registrationId),album=clean(albumId),copy=clean(copyNumber);
  if(!id||!album||!copy||!/^[A-Za-z0-9_-]{1,100}$/.test(id))
    return Object.freeze({matched:false,status:"hold",reason:"invalid_identity"});
  const base=clean(env.AJINE_COMMERCIAL_DIRECTUS_URL);
  const token=clean(env.AJINE_COMMERCIAL_DIRECTUS_READ_TOKEN);
  if(!base||!token||!/^https:\/\//.test(base))
    return Object.freeze({matched:false,status:"hold",reason:"commercial_directus_not_configured"});
  try{
    const url=new URL("/items/ownership_records/"+encodeURIComponent(id),base);
    url.searchParams.set("fields","id,album_id,copy_number,ownership_status,registered_at");
    const response=await fetcher(url.toString(),{
      method:"GET",headers:{Authorization:"Bearer "+token,Accept:"application/json"},
      signal:AbortSignal.timeout(7000),redirect:"error"
    });
    if(!response.ok)return Object.freeze({matched:false,status:"hold",reason:"commercial_registration_unavailable"});
    const record=(await response.json())?.data;
    const matched=String(record?.id??"")===id &&
      String(record?.album_id??"")===album &&
      String(record?.copy_number??"")===copy &&
      String(record?.ownership_status??"").toLowerCase()==="registered" &&
      Boolean(record?.registered_at);
    return Object.freeze({matched,status:matched?"registration_evidence_matched":"hold",
      reason:matched?null:"registration_evidence_mismatch",
      registrationAuthorized:false,polygonProofVerified:false,releaseAuthorized:false,
      stored:false,delivered:false});
  }catch{
    return Object.freeze({matched:false,status:"hold",reason:"commercial_registration_unavailable"});
  }
}
