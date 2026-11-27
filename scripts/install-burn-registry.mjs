// Explicit operator-run migration; never runs during API startup.
const base='https://directus-on-nft.onrender.com';
const token=process.env.AJINE_DIRECTUS_TOKEN;
if(!token)throw Error('AJINE_DIRECTUS_TOKEN_REQUIRED');
async function api(path,method='GET',body){
 const r=await fetch(base+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error(method+' '+path+' HTTP '+r.status);
 return r.status===204?null:(await r.json()).data;
}
const collection='Burn_Registry';
const fields=await api('/fields/'+collection);
const relations=await api('/relations');
if(!relations.some(r=>r.many_collection===collection&&r.many_field==='nft_link'&&r.one_collection==='NFT_Registry'))throw Error('NFT_LINK_REQUIRED');
const rows=await api('/items/'+collection+'?limit=1&fields=id');
if(rows.length)throw Error('EXISTING_BURNS_REQUIRE_REVIEW');
const apply=process.argv.includes('--apply');
const specs=[{field:'ajine_burn_number',type:'string',schema:{is_unique:true,is_nullable:false,max_length:64},meta:{required:true,interface:'input',note:'Permanent proprietary AJINE burn identity'}},{field:'nft_link',schema:{is_unique:true,is_nullable:false}},{field:'burn_transaction_hash',schema:{is_unique:true,is_nullable:false}}];
for(const spec of specs){
 const existing=fields.find(f=>f.field===spec.field);
 if(!existing&&spec.field!=='ajine_burn_number')throw Error('MISSING_EXISTING_FIELD_'+spec.field);
 if(existing&&spec.type&&existing.type!==spec.type)throw Error('FIELD_TYPE_MISMATCH');
 const ready=existing?.schema?.is_unique===true&&existing?.schema?.is_nullable===false;
 if(ready){console.log('READY',spec.field);continue;}
 console.log(apply?'INSTALL':'WOULD_INSTALL',spec.field);
 if(apply){
  if(existing)await api('/fields/'+collection+'/'+spec.field,'PATCH',{schema:spec.schema});
  else await api('/fields/'+collection,'POST',spec);
 }
}
if(apply){
 const actual=await api('/fields/'+collection);
 for(const spec of specs){
  const f=actual.find(x=>x.field===spec.field);
  if(f?.schema?.is_unique!==true||f?.schema?.is_nullable!==false)throw Error('READBACK_FAILED_'+spec.field);
 }
 console.log('BURN_REGISTRY_SCHEMA_VERIFIED');
}else console.log('DRY_RUN_ONLY');
