#!/usr/bin/env node
// Read-only AJINE schema relationship and safety audit.
const base = 'https://directus-on-nft.onrender.com';
const token = process.env.AJINE_DIRECTUS_TOKEN;
if (!token) { console.error('AJINE_DIRECTUS_TOKEN is required'); process.exit(1); }
async function get(path) {
 const response = await fetch(base + path,{headers:{Authorization:'Bearer '+token}});
 const json = await response.json();
 if (!response.ok) throw Error(path + ': HTTP ' + response.status + ' ' + JSON.stringify(json.errors || []));
 return json.data;
}
const links = [
 ['Rarity_Printer','registration_id','Abum_Registration','registration_id'],
 ['NFT_Registry','registration_id','Abum_Registration','registration_id'],
 ['Burn_Registry','nft_id','NFT_Registry','id'],
 ['Jingle_Collectibles','burn_number','Burn_Registry','id'],
 ['Provenance_Registry','nft_reference','NFT_Registry','id'],
 ['Provenance_Registry','jingle_reference','Jingle_Collectibles','id'],
 ['Commerce_Listings','collectible_id','Provenance_Registry','collectible_id'],
 ['Commerce_Transactions','listing_id','Commerce_Listings','id']
];
async function main() {
 const collections = new Set((await get('/collections')).map(x=>x.collection));
 const relations = await get('/relations');
 console.log('READ ONLY — AJINE NFT relationship audit');
 console.log('Target:',base);
 let needs = 0;
 for (const [from,field,to,target] of links) {
   if (!collections.has(from)||!collections.has(to)) {console.log('MISSING COLLECTION',from,to);needs++;continue;}
   const [source,targetFields] = await Promise.all([get('/fields/'+from),get('/fields/'+to)]);
   const a=source.find(x=>x.field===field), b=targetFields.find(x=>x.field===target);
   const rel=relations.find(x=>x.many_collection===from && x.many_field===field && x.one_collection===to);
   const status=rel?'CONNECTED':!a||!b?'FIELD MISSING':'NOT CONNECTED';
   console.log(status,from+'.'+field+' -> '+to+'.'+target,'('+String(a?.type)+' -> '+String(b?.type)+')');
   if(!rel) needs++;
 }
 console.log('Unconnected/missing:',needs);
 console.log('No database changes made. Do not auto-create foreign keys on existing string fields without reviewing key types and data.');
}
main().catch(e=>{console.error(e.message);process.exit(1);});
