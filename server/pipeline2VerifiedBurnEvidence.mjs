import {createHash} from 'node:crypto';
import {readCommercialPreprintRegistration} from './nftCommercialPreprintEvidence.mjs';
import {storeVerifiedNftForBurn} from './pipeline2NftRegistry.mjs';
// Internal staging only. Caller must be the authenticated commercial intake.
// Persists agreement evidence only; never authorizes execution.
export async function stageVerifiedBurnEvidence({authorization:a,env=process.env}={}){
 if(!a||a.option!=='discount'||a.agreementVersion!=='discount-v1'||!a.agreementId||!Number.isFinite(Date.parse(a.acceptedAt))||a.network!=='polygon-amoy')throw Error('AGREEMENT_EVIDENCE_INVALID');
 const e=await readCommercialPreprintRegistration(a.registrationId,{env});
 if(e.verified!==true||e.registrationVerified!==true||e.paymentRecordMatched!==true||e.ownershipVerified!==true||e.registrationId!==a.registrationId||e.albumId!==a.albumId||e.copyNumber!==a.copyNumber||e.registeredOwnerId!==a.userId)throw Error('BURN_REGISTRATION_MISMATCH');
 if(typeof a.contractAddress!=='string'||a.contractAddress.toLowerCase()!==String(env.AJINE_AMOY_NFT_CONTRACT).toLowerCase())throw Error('BURN_CONTRACT_MISMATCH');
 const n=await storeVerifiedNftForBurn({registrationId:a.registrationId,mintTransactionHash:a.mintTransactionHash,env,expectedTokenId:a.tokenId});
 if(n.stored!==true||n.registrationId!==a.registrationId||n.tokenId!==a.tokenId)throw Error('BURN_REGISTRY_MISMATCH');
 const fields={burn_agreement_id:a.agreementId,burn_agreement_version:a.agreementVersion,burn_agreement_accepted_at:a.acceptedAt,burn_reward_selection:a.option,burn_authorization_owner:a.userId,burn_ownership_record_id:String(a.ownershipRecordId)};
 const token=env.AJINE_DIRECTUS_TOKEN;
 const url='https://directus-on-nft.onrender.com/items/NFT_Registry/'+encodeURIComponent(n.nftRegistryId);
 async function api(method,body){
  const response=await fetch(url,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('AGREEMENT_STORAGE_HTTP_'+response.status);
  return (await response.json()).data;
 }
 const before=await api('GET');
 if(String(before.registration_id)!==a.registrationId||String(before.token_id)!==a.tokenId)throw Error('AGREEMENT_TARGET_MISMATCH');
 const matches=row=>Object.entries(fields).every(([k,v])=>String(row[k])===v);
 if(!matches(before)){
  if(Object.keys(fields).some(k=>before[k]!=null))throw Error('EXISTING_AGREEMENT_CONFLICT');
  // Conditional bulk update prevents overwriting an agreement accepted concurrently.
  const response=await fetch('https://directus-on-nft.onrender.com/items/NFT_Registry',{method:'PATCH',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({query:{filter:{_and:[{id:{_eq:n.nftRegistryId}},...Object.keys(fields).map(k=>({[k]:{_null:true}}))]}},data:fields}),redirect:'error',signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('AGREEMENT_WRITE_HTTP_'+response.status);
 }
 if(!matches(await api('GET')))throw Error('AGREEMENT_READBACK_MISMATCH');
 // Deterministic event identity shared with the commercial mirror.
 const hex=createHash('sha256').update('ajine:agreement:pending:'+a.agreementId).digest('hex');
 const eventId=hex.slice(0,8)+'-'+hex.slice(8,12)+'-8'+hex.slice(13,16)+'-a'+hex.slice(17,20)+'-'+hex.slice(20,32);
 const event={id:eventId,agreement_id:a.agreementId,registration_id:a.registrationId,event_type:'pending',occurred_at:new Date(a.acceptedAt).toISOString()};
 const base='https://directus-on-nft.onrender.com/items/NFT_Agreement_Events';
 async function eventApi(method,suffix,body){
  return fetch(base+suffix,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(15000)});
 }
 const query='?filter[id][_eq]='+encodeURIComponent(eventId)+'&limit=2';
 async function readEvent(){
  const response=await eventApi('GET',query);
  if(!response.ok)throw Error('AGREEMENT_EVENT_READ_HTTP_'+response.status);
  const rows=(await response.json()).data;
  if(!Array.isArray(rows)||rows.length>1)throw Error('AGREEMENT_EVENT_CONFLICT');
  return rows[0];
 }
 let recorded=await readEvent();
 if(!recorded){
  const response=await eventApi('POST','',event);
  recorded=await readEvent();
  if(!recorded)throw Error('AGREEMENT_EVENT_WRITE_HTTP_'+response.status);
 }
 if(!Object.entries(event).every(([k,v])=>k==='occurred_at'?Date.parse(recorded[k])===Date.parse(v):String(recorded[k])===v))throw Error('AGREEMENT_EVENT_READBACK_MISMATCH');
 return Object.freeze({eventId,registrationId:a.registrationId,nftRegistryId:n.nftRegistryId,albumRegistrationId:n.albumRegistrationId,tokenId:n.tokenId,agreementId:a.agreementId,stored:true,burn_enabled:false});
}
