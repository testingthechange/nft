// Explicit operator migration; no runtime or burn changes.
const token=process.env.AJINE_DIRECTUS_TOKEN;
if(!token)throw Error("AJINE_DIRECTUS_TOKEN_REQUIRED");
const apply=process.argv.includes("--apply");
async function api(path,method="GET",body){
 const r=await fetch("https://directus-on-nft.onrender.com"+path,{method,headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},...(body?{body:JSON.stringify(body)}:{}),redirect:"error",signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error(method+" "+path+" HTTP "+r.status);
 return r.status===204?null:(await r.json()).data;
}
const collection="NFT_Agreement_Events";
const fields=[{field:"agreement_id",type:"uuid"},{field:"registration_id",type:"string"},{field:"event_type",type:"string"},{field:"occurred_at",type:"timestamp"}];
const exists=(await api("/collections")).some(c=>c.collection===collection);
if(!exists){
 console.log(apply?"INSTALL":"WOULD_INSTALL",collection);
 if(apply)await api("/collections","POST",{collection,meta:{icon:"history"},schema:{},fields:[{field:"id",type:"uuid",schema:{is_primary_key:true,has_auto_increment:false}}]});
}
if(exists||apply){
 const current=await api("/fields/"+collection);
 for(const spec of fields){
  const f=current.find(x=>x.field===spec.field);
  if(f){if(f.type!==spec.type||f.schema?.is_nullable!==false)throw Error("FIELD_MISMATCH_"+spec.field);continue;}
  console.log(apply?"INSTALL":"WOULD_INSTALL",spec.field);
  if(apply)await api("/fields/"+collection,"POST",{...spec,schema:{is_nullable:false},meta:{required:true}});
 }
 if(apply){
  const actual=await api("/fields/"+collection);
  if(!actual.some(f=>f.field==="id"&&f.type==="uuid"&&f.schema?.is_primary_key===true)||!fields.every(s=>actual.some(f=>f.field===s.field&&f.type===s.type&&f.schema?.is_nullable===false)))throw Error("READBACK_FAILED");
 }
}
console.log(apply?"AGREEMENT_EVENT_SCHEMA_VERIFIED":"DRY_RUN_ONLY");
