/*
 * Production registration wire-contract parser (non-writing).
 * Only a trusted, authenticated backend may eventually submit these fields.
 * This parser never verifies payment, writes Directus, or mints NFTs.
 */
const fields=Object.freeze(["registration_id","album_id","album_copy_number",
  "registered_owner_id","purchase_transaction_id","registration_date"]);
const clean=(value)=>typeof value==="string"?value.trim():"";
export function validateConfirmedRegistrationJson(body){
  if(!body||typeof body!=="object"||Array.isArray(body))
    return {ok:false,error:"invalid_json"};
  if(body.schema_version!==1||body.event_type!=="album.registration.confirmed")
    return {ok:false,error:"unsupported_registration_contract"};
  if(Object.keys(body).some(k=>!["schema_version","event_type",...fields].includes(k)))
    return {ok:false,error:"unexpected_field"};
  const record={};
  for(const name of fields){
    const value=clean(body[name]);
    if(!value||value.length>200)return {ok:false,error:"invalid_field",field:name};
    record[name]=value;
  }
  if(!/^\d{4}-\d{2}-\d{2}T/.test(record.registration_date)||
      !Number.isFinite(Date.parse(record.registration_date)))
    return {ok:false,error:"invalid_field",field:"registration_date"};
  return {ok:true,schema_version:1,record:Object.freeze(record),
    stored:false,payment_verified:false,minted:false};
}
