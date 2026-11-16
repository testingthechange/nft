#!/usr/bin/env node
// AJINE NFT only. Additive, typed Directus M2O links. Dry-run by default.
const BASE = 'https://directus-on-nft.onrender.com';
const TOKEN = process.env.AJINE_DIRECTUS_TOKEN;
const APPLY = process.argv.includes('--apply');
if (!TOKEN) { console.error('Set AJINE_DIRECTUS_TOKEN locally. Never commit it.'); process.exit(1); }
const links = [
  ['Rarity_Printer','album_registration_link','Abum_Registration'],
  ['NFT_Registry','album_registration_link','Abum_Registration'],
  ['Burn_Registry','nft_link','NFT_Registry'],
  ['Jingle_Collectibles','burn_link','Burn_Registry'],
  ['Provenance_Registry','nft_link','NFT_Registry'],
  ['Provenance_Registry','jingle_link','Jingle_Collectibles'],
  ['Commerce_Listings','provenance_link','Provenance_Registry'],
  ['Commerce_Transactions','listing_link','Commerce_Listings']
];
async function api(path, method='GET', body) {
 const r = await fetch(BASE + path,{method,headers:{Authorization:'Bearer '+TOKEN,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
 const raw=await r.text(); let j;try{j=JSON.parse(raw)}catch{j={}};
 if(!r.ok)throw Error(method+' '+path+' HTTP '+r.status+' '+JSON.stringify(j.errors||raw).slice(0,500));
 return j.data;
}
async function main(){
 await api('/users/me?fields=id');
 const collections=new Set((await api('/collections')).map(c=>c.collection));
 const relations=await api('/relations');
 if (!Array.isArray(relations)) throw Error('Expected /relations data to be an array');
 const fields={};
 const tasks=[];
 console.log('AJINE ONLY:',BASE,'|',APPLY?'APPLY':'DRY RUN');
 for(const [source,field,target] of links){
  if(!collections.has(source)||!collections.has(target))throw Error('Missing collection '+source+' or '+target);
  if(!fields[source])fields[source]=await api('/fields/'+source);
  if(!fields[target])fields[target]=await api('/fields/'+target);
  const pk=fields[target].find(f=>f.field==='id');
  if(!pk||pk.type!=='integer')throw Error('Target '+target+'.id must be integer; found '+pk?.type);
  const current=fields[source].find(f=>f.field===field);
  if(current&&current.type!=='integer')throw Error('Existing '+source+'.'+field+' has incompatible type '+current.type);
  const matches=relations.filter(r=>(r.collection??r.meta?.many_collection??r.many_collection)===source &&
   (r.field??r.meta?.many_field??r.many_field)===field);
  if(matches.length>1)throw Error('Multiple relationship definitions on '+source+'.'+field);
  const existing=matches[0];
  const related=existing&&(existing.related_collection??existing.meta?.one_collection??existing.one_collection);
  if(existing&&related!==target)throw Error('Relationship conflict on '+source+'.'+field+': '+related);
  const action=existing?'CONNECTED':current?'RELATE':'ADD + RELATE';
  console.log(action,source+'.'+field+' -> '+target+'.id');
  if(!existing)tasks.push({source,field,target,needsField:!current});
 }
 if(!APPLY){console.log('Preview complete:',tasks.length,'relationships to install; no changes made.');return;}
 // Fail closed if data exists: a separate migration is required to populate and validate links.
 for(const [source] of links){
  const data=await api('/items/'+source+'?limit=1&fields=id');
  if(data.length)throw Error('STOP: '+source+' contains records. Backfill mapping must be designed before installing relations.');
 }
 for(const task of tasks){
  if(task.needsField)await api('/fields/'+task.source,'POST',{field:task.field,type:'integer',schema:{is_nullable:true},meta:{interface:'select-dropdown-m2o',note:'Typed AJINE relationship; populate only after identity validation'}});
  await api('/relations','POST',{collection:task.source,field:task.field,related_collection:task.target,meta:{one_field:null}});
  console.log('INSTALLED',task.source+'.'+task.field,'->',task.target+'.id');
 }
 console.log('Done. Relations are nullable. Existing string identifiers remain untouched. Re-run audit and configure uniqueness, backfill, permissions separately.');
}
main().catch(e=>{console.error(e.message);process.exit(1)});
