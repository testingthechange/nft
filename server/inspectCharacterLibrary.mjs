// Read-only character library inspection; no Directus schema or item mutations.
const ORIGIN = "https://directus-on-nft.onrender.com";
const COLLECTION = "AJINE_Characters";
const FIELDS = ["character_code","character_name","rarity_tier","print_weight","edition_limit","artwork","description"];
export async function inspectCharacterLibrary({token,fetcher=fetch}={}) {
 if(!token)return {ok:false,reason:"directus_token_not_configured"};
 const get = async path => {
   const response = await fetcher(ORIGIN+path,{method:"GET",headers:{Authorization:"Bearer "+token,Accept:"application/json"},redirect:"error",signal:AbortSignal.timeout(7000)});
   if(!response.ok)throw Error("directus_http_"+response.status);
   return (await response.json()).data;
 };
 try {
   const collections = await get("/collections");
   if(!Array.isArray(collections)||!collections.some(c=>c.collection===COLLECTION))
     return {ok:false,reason:"character_collection_missing"};
   const fields = await get("/fields/"+COLLECTION);
   const names = new Set(fields.map(f=>f.field));
   const records = await get("/items/"+COLLECTION+"?fields=id,character_code&limit=100");
   if(!Array.isArray(records))return {ok:false,reason:"invalid_records_response"};
   const codes = new Set(records.map(r=>r.character_code).filter(Boolean));
   const missingCodes = Array.from({length:12},(_,i)=>"AJINE-"+String(i+1).padStart(2,"0")).filter(c=>!codes.has(c));
   return {ok:true,mode:"dry_run",project:"nft",collection:COLLECTION,
     missingFields:FIELDS.filter(f=>!names.has(f)),missingCharacterCodes:missingCodes,
     existingRecordCount:records.length,baseFieldsPresent:["id","status","sort"].every(f=>names.has(f)),
     noWritesPerformed:true,rarityOddsActivated:false};
 }catch(e){return {ok:false,reason:/^directus_http_\d+$/.test(e.message)?e.message:"directus_unavailable"};}
}
