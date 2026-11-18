// Private, read-only commercial Directus registration evidence lookup.
// Commercial My Collection reads ownership_records from directus-otul.
// No user-supplied URL, ownership write, or browser authorization.
const COMMERCIAL_DIRECTUS_ORIGIN="https://directus-otul.onrender.com";
const clean=(v)=>typeof v==="string"&&v.trim()?v.trim():null;
const first=(record,keys)=>keys.map(k=>record?.[k]).find(v=>v!==null&&v!==undefined&&v!=="");
const hold=(reason)=>Object.freeze({matched:false,status:"hold",reason,
  registrationAuthorized:false,polygonProofVerified:false,releaseAuthorized:false,
  stored:false,delivered:false});
export async function inspectCommercialRegistrationEvidence({registrationId,albumId,copyNumber,fetcher=fetch,env=process.env}={}){
  const id=clean(registrationId),album=clean(albumId),copy=clean(copyNumber);
  if(!id||!album||!copy||!/^[A-Za-z0-9_-]{1,100}$/.test(id))return hold("invalid_identity");
  const token=clean(env.AJINE_COMMERCIAL_DIRECTUS_READ_TOKEN);
  const configured=clean(env.AJINE_COMMERCIAL_DIRECTUS_URL);
  if(!token)return hold("commercial_directus_not_configured");
  if(configured){
    try{
      if(new URL(configured).origin!==COMMERCIAL_DIRECTUS_ORIGIN ||
        new URL(configured).pathname!=="/")return hold("commercial_directus_origin_mismatch");
    }catch{return hold("commercial_directus_origin_mismatch");}
  }
  try{
    const url=new URL("/items/ownership_records/"+encodeURIComponent(id),COMMERCIAL_DIRECTUS_ORIGIN);
    // Request the whole single record to avoid failing on optional or absent
    // fields. Never expose it in the response; only compare assigned identities.
    const response=await fetcher(url.toString(),{
      method:"GET",headers:{Authorization:"Bearer "+token,Accept:"application/json"},
      signal:AbortSignal.timeout(7000),redirect:"error"
    });
    if(!response.ok)return hold("commercial_registration_unavailable");
    const record=(await response.json())?.data;
    const recordId=first(record,["id"]);
    const recordAlbum=first(record,["albumId","album_id"]);
    const recordCopy=first(record,["copyNumber","copy_number","album_copy_number"]);
    const status=first(record,["ownershipStatus","ownership_status"]);
    const registeredAt=first(record,["registeredAt","registered_at"]);
    // If album identity isn't present on the persisted record, fail closed:
    // share_id is not an interchangeable album ID.
    if(recordAlbum===undefined)return hold("commercial_album_identity_unassigned");
    const matched=String(recordId??"")===id&&String(recordAlbum)===album&&
      String(recordCopy??"")===copy&&String(status??"").toLowerCase()==="registered"&&
      Boolean(registeredAt);
    return matched?Object.freeze({matched:true,status:"registration_evidence_matched",reason:null,
      registrationAuthorized:false,polygonProofVerified:false,releaseAuthorized:false,
      stored:false,delivered:false}):hold("registration_evidence_mismatch");
  }catch{return hold("commercial_registration_unavailable");}
}
