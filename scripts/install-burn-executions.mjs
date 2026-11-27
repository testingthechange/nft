// Operator-only schema installation. No Polygon calls or runtime activation.
const token=process.env.AJINE_DIRECTUS_TOKEN;
if(!token)throw Error("AJINE_DIRECTUS_TOKEN_REQUIRED");
const apply=process.argv.includes("--apply");
const collection="NFT_Burn_Executions";
async function api(path,method="GET",body){
 const r=await fetch("https://directus-on-nft.onrender.com"+path,{method,headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},...(body?{body:JSON.stringify(body)}:{}),redirect:"error",signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error(method+" "+path+" HTTP "+r.status);
 return r.status===204?null:(await r.json()).data;
}
const fields=[
 {field:"nft_identity",type:"string",schema:{is_unique:true,is_nullable:false,max_length:255}},
 {field:"registration_id",type:"string",schema:{is_unique:true,is_nullable:false}},
 {field:"agreement_id",type:"uuid",schema:{is_unique:true,is_nullable:false}},
 {field:"agreement_event_id",type:"uuid",schema:{is_nullable:false}},
 {field:"status",type:"string",schema:{is_nullable:false}},
 {field:"authorized_at",type:"timestamp",schema:{is_nullable:false}},
 {field:"transaction_hash",type:"string",schema:{is_unique:true,is_nullable:true,max_length:66}}
];
const exists=(await api("/collections")).some(c=>c.collection===collection);
if(!exists){
 console.log(apply?"INSTALL":"WOULD_INSTALL",collection);
 if(apply)await api("/collections","POST",{collection,meta:{icon:"lock"},schema:{},fields:[{field:"id",type:"uuid",schema:{is_primary_key:true,has_auto_increment:false}}]});
}
function matches(f,s){return f&&f.type===s.type&&f.schema?.is_nullable===s.schema.is_nullable&&(!s.schema.is_unique||f.schema?.is_unique===true)&&(!s.schema.max_length||f.schema?.max_length===s.schema.max_length);}
if(exists||apply){
 const current=await api("/fields/"+collection);
 for(const spec of fields){
  const f=current.find(x=>x.field===spec.field);
  if(f){if(!matches(f,spec))throw Error("FIELD_MISMATCH_"+spec.field);continue;}
  console.log(apply?"INSTALL":"WOULD_INSTALL",spec.field);
  if(apply)await api("/fields/"+collection,"POST",{...spec,meta:{required:!spec.schema.is_nullable}});
 }
 if(apply){
  const actual=await api("/fields/"+collection);
  if(!actual.some(f=>f.field==="id"&&f.type==="uuid"&&f.schema?.is_primary_key===true)||!fields.every(s=>matches(actual.find(f=>f.field===s.field),s)))throw Error("READBACK_FAILED");
 }
}
console.log(apply?"BURN_EXECUTION_SCHEMA_VERIFIED":"DRY_RUN_ONLY");
