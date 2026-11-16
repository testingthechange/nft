#!/usr/bin/env node
// Read-only verification of installed AJINE NFT typed M2O relationships.
const BASE = 'https://directus-on-nft.onrender.com';
const token = process.env.AJINE_DIRECTUS_TOKEN;
if (!token) { console.error('Set AJINE_DIRECTUS_TOKEN locally.'); process.exit(1); }
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
async function get(path) {
 const response = await fetch(BASE+path,{headers:{Authorization:'Bearer '+token}});
 const raw=await response.text(); let json;
 try { json=JSON.parse(raw); } catch { throw Error(path+': invalid JSON HTTP '+response.status); }
 if (!response.ok) throw Error(path+': HTTP '+response.status+' '+JSON.stringify(json.errors||[]));
 return json.data;
}
async function main() {
 const relations=await get('/relations');
 if (!Array.isArray(relations)) throw Error('Expected /relations data to be an array');
 const fields=new Map();
 let passed=0;
 console.log('READ ONLY — AJINE NFT typed relationship verification');
 console.log('Target:',BASE);
 for (const [source,field,target] of links) {
  for (const collection of [source,target]) if (!fields.has(collection))
   fields.set(collection,await get('/fields/'+encodeURIComponent(collection)));
  const sourceField=fields.get(source).find(x=>x.field===field);
  const targetField=fields.get(target).find(x=>x.field==='id');
  const matches=relations.filter(x=>(x.collection??x.meta?.many_collection??x.many_collection)===source &&
   (x.field??x.meta?.many_field??x.many_field)===field);
  const relation=matches[0];
  const valid=sourceField?.type==='integer' && targetField?.type==='integer' &&
   matches.length===1 &&
   (relation.related_collection??relation.meta?.one_collection??relation.one_collection)===target &&
   (relation.schema?.foreign_key_column==null || relation.schema.foreign_key_column==='id');
  console.log(valid?'VERIFIED':'FAIL',source+'.'+field+' -> '+target+'.id',
   '(field='+String(sourceField?.type)+', target='+String(targetField?.type)+
   ', relation='+String(relation&&(relation.related_collection??relation.meta?.one_collection??relation.one_collection))+', count='+matches.length+')');
  if(valid)passed++;
 }
 console.log('Verified:',passed+'/'+links.length);
 console.log('No database changes made. This checks schema wiring, not record mapping, uniqueness or permissions.');
 if(passed!==links.length)process.exitCode=1;
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
