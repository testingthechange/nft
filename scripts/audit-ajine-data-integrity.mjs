#!/usr/bin/env node
// AJINE NFT only. Read-only data integrity and schema constraint audit.
// Prints counts only, never row values, credentials, or personal information.
const BASE='https://directus-on-nft.onrender.com';
const TOKEN=process.env.AJINE_DIRECTUS_TOKEN;
if(!TOKEN){console.error('Set AJINE_DIRECTUS_TOKEN locally.');process.exit(1);}
const collections=[
 'Abum_Registration','Rarity_Printer','NFT_Registry','Burn_Registry',
 'Jingle_Collectibles','Provenance_Registry','Commerce_Listings',
 'Commerce_Transactions','Owners_Accounts','Integration_Events'
];
const links=[
 ['Rarity_Printer','album_registration_link','Abum_Registration'],
 ['NFT_Registry','album_registration_link','Abum_Registration'],
 ['Burn_Registry','nft_link','NFT_Registry'],
 ['Jingle_Collectibles','burn_link','Burn_Registry'],
 ['Provenance_Registry','nft_link','NFT_Registry'],
 ['Provenance_Registry','jingle_link','Jingle_Collectibles'],
 ['Commerce_Listings','provenance_link','Provenance_Registry'],
 ['Commerce_Transactions','listing_link','Commerce_Listings']
];
const keys={
 Abum_Registration:[['registration_id'],['album_id','album_copy_number']],
 NFT_Registry:[['contract_address','token_id','polygon_network']],
 Jingle_Collectibles:[['serial_number']],
 Provenance_Registry:[['collectible_id'],['qr_code_reference']],
 Commerce_Listings:[['collectible_id']]
};
async function get(path){
 const res=await fetch(BASE+path,{headers:{Authorization:'Bearer '+TOKEN}});
 const raw=await res.text();let body;
 try{body=JSON.parse(raw);}catch{throw Error(path+': non-JSON HTTP '+res.status);}
 if(!res.ok)throw Error(path+': HTTP '+res.status+' '+JSON.stringify(body.errors||[]).slice(0,300));
 return body.data;
}
async function rows(collection,fields){
 const result=[];let offset=0;
 while(true){
  const q=new URLSearchParams({limit:'500',offset:String(offset),fields:fields.join(',')});
  const page=await get('/items/'+encodeURIComponent(collection)+'?'+q);
  if(!Array.isArray(page))throw Error(collection+': unexpected items response');
  result.push(...page);
  if(page.length<500)break;
  offset+=page.length;
  if(offset>100000)throw Error(collection+': exceeds 100000 rows; audit aborted rather than report partial results');
 }
 return result;
}
function keyOf(row,fields){
 const vals=fields.map(f=>row[f]);
 if(vals.some(v=>v===null||v===undefined||v===''))return null;
 return JSON.stringify(vals.map(String));
}
async function main(){
 console.log('READ ONLY — AJINE NFT data integrity audit');
 console.log('Target:',BASE);
 const metadata=new Map(),data=new Map();
 let warnings=0;
 for(const c of collections){
  const fields=await get('/fields/'+encodeURIComponent(c));
  metadata.set(c,fields);
  const names=new Set(fields.map(f=>f.field));
  const wanted=new Set(['id']);
  for(const [source,field] of links)if(source===c)wanted.add(field);
  for(const combo of keys[c]||[])for(const field of combo)wanted.add(field);
  const missing=[...wanted].filter(f=>!names.has(f));
  if(missing.length){console.log('MISSING FIELDS',c,missing.join(','));warnings++;continue;}
  const records=await rows(c,[...wanted]);
  data.set(c,records);
  console.log('COLLECTION',c,'records='+records.length);
  for(const combo of keys[c]||[]){
   const seen=new Set();let duplicates=0,blank=0;
   for(const row of records){
    const k=keyOf(row,combo);
    if(k===null){blank++;continue;}
    if(seen.has(k))duplicates++;else seen.add(k);
   }
   const constraints=combo.map(f=>{
    const field=fields.find(x=>x.field===f);
    return f+':'+(field?.schema?.is_unique===true?'unique':'not-confirmed');
   }).join(',');
   console.log('IDENTITY',c,combo.join('+'),'duplicates='+duplicates,'blank='+blank,'field_constraints='+constraints);
   if(duplicates)warnings++;
  }
 }
 for(const [source,field,target] of links){
  if(!data.has(source)||!data.has(target))continue;
  const ids=new Set(data.get(target).map(x=>String(x.id)));
  let filled=0,missing=0;
  for(const row of data.get(source)){
   const value=row[field];
   if(value===null||value===undefined||value==='')continue;
   filled++;
   if(!ids.has(String(typeof value==='object'?value.id:value)))missing++;
  }
  console.log('REFERENCE',source+'.'+field,'->',target+'.id','populated='+filled,'orphans='+missing);
  if(missing)warnings++;
 }
 console.log('Warnings:',warnings);
 console.log('Scope: read-only row/duplicate/orphan counts and reported field uniqueness; does not certify database indexes, permissions, ownership, or business rules.');
 console.log('No database changes made.');
 if(warnings)process.exitCode=2;
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
