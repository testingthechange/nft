// Explicit operator migration; dry run by default.
const token=process.env.AJINE_DIRECTUS_TOKEN;
if(!token)throw Error('AJINE_DIRECTUS_TOKEN_REQUIRED');
const apply=process.argv.includes('--apply');
async function api(path,method='GET',body){
 const r=await fetch('https://directus-on-nft.onrender.com'+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error(method+' '+path+' HTTP '+r.status);
 return r.status===204?null:(await r.json()).data;
}
const specs=[
 ['Abum_Registration',{field:'registration_id',schema:{is_unique:true}}],
 ['NFT_Registry',{field:'registration_id',schema:{is_unique:true}}],
 ...['burn_agreement_id','burn_agreement_version','burn_agreement_accepted_at','burn_reward_selection','burn_authorization_owner','burn_ownership_record_id'].map(field=>['NFT_Registry',{field,type:'string',schema:{is_nullable:true,max_length:255,...(field==='burn_agreement_id'?{is_unique:true}:{})},meta:{interface:'input'}}])
];
for(const [collection,spec] of specs){
 const fields=await api('/fields/'+collection);
 const f=fields.find(x=>x.field===spec.field);
 if(!f&&!spec.type)throw Error('MISSING_FIELD_'+spec.field);
 if(f&&spec.type&&f.type!==spec.type)throw Error('FIELD_TYPE_MISMATCH_'+spec.field);
 const ready=f&&Object.entries(spec.schema).every(([k,v])=>f.schema?.[k]===v);
 if(ready){console.log('READY',collection,spec.field);continue;}
 console.log(apply?'INSTALL':'WOULD_INSTALL',collection,spec.field);
 if(apply){
  if(f)await api('/fields/'+collection+'/'+spec.field,'PATCH',{schema:spec.schema});
  else await api('/fields/'+collection,'POST',spec);
  const actual=(await api('/fields/'+collection)).find(x=>x.field===spec.field);
  if(!actual||!Object.entries(spec.schema).every(([k,v])=>actual.schema?.[k]===v))throw Error('READBACK_FAILED_'+spec.field);
 }
}
console.log(apply?'BURN_AUTHORIZATION_SCHEMA_VERIFIED':'DRY_RUN_ONLY');
