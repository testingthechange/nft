#!/usr/bin/env node
// READ ONLY: AJINE NFT permission inventory and unauthenticated-access smoke check.
// Never prints tokens, row values, permission filters, or user identities.
const BASE='https://directus-on-nft.onrender.com';
const TOKEN=process.env.AJINE_DIRECTUS_TOKEN;
if(!TOKEN){console.error('Set AJINE_DIRECTUS_TOKEN locally.');process.exit(1);}
const collections=[
 'Abum_Registration','Rarity_Printer','NFT_Registry','Burn_Registry',
 'Jingle_Collectibles','Provenance_Registry','Commerce_Listings',
 'Commerce_Transactions','Owners_Accounts','Integration_Events'
];
async function request(path,authorized=true){
 const response=await fetch(BASE+path,{
  headers:authorized?{Authorization:'Bearer '+TOKEN}:{}
 });
 const body=await response.text();
 let json=null;
 try{json=JSON.parse(body);}catch{}
 return {status:response.status,ok:response.ok,data:json?.data};
}
async function getAll(path){
 let offset=0,result=[];
 while(true){
  const p=new URLSearchParams({limit:'500',offset:String(offset)});
  const res=await request(path+'?'+p);
  if(!res.ok||!Array.isArray(res.data))
   throw Error('Authenticated GET '+path+' failed (HTTP '+res.status+'). Audit incomplete.');
  result.push(...res.data);
  if(res.data.length<500)break;
  offset+=res.data.length;
  if(offset>100000)throw Error(path+' exceeded safe audit limit');
 }
 return result;
}
async function main(){
 console.log('READ ONLY — AJINE NFT access review');
 console.log('Target:',BASE);
 const permissions=await getAll('/permissions');
 const access=await getAll('/access');
 const policies=await getAll('/policies');
 const roles=await getAll('/roles');
 console.log('ACCESS METADATA','permissions='+permissions.length,
  'access_assignments='+access.length,'policies='+policies.length,'roles='+roles.length);
 console.log('Note: assignments and policies may combine; counts do not establish effective access.');
 let exposed=0,uncertain=0;
 for(const collection of collections){
  const rules=permissions.filter(p=>p.collection===collection);
  const actions=[...new Set(rules.map(p=>p.action))].sort();
  console.log('POLICY RULES',collection,'rules='+rules.length,
   'actions='+(actions.join(',')||'none'));
  // No Authorization header: tests only whether unauthenticated reads are accepted.
  // Do not output returned items even if public GET succeeds.
  const res=await request('/items/'+encodeURIComponent(collection)+'?limit=1&fields=id',false);
  const state=res.status===200?'PUBLIC READ ALLOWED':
   [401,403].includes(res.status)?'PUBLIC READ DENIED':'INDETERMINATE HTTP '+res.status;
  console.log('PUBLIC GET',collection,state);
  if(res.status===200)exposed++;
  else if(![401,403].includes(res.status))uncertain++;
 }
 console.log('Publicly readable collections:',exposed+'/'+collections.length);
 console.log('Indeterminate public tests:',uncertain);
 console.log('No database changes made. This review does not validate item/field restrictions, authenticated owner access, or system collection exposure.');
 if(exposed||uncertain)process.exitCode=2;
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
