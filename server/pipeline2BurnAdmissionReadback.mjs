import {createHash} from 'node:crypto';
import {readCommercialPreprintRegistration} from './nftCommercialPreprintEvidence.mjs';

// Internal read-only preflight. No burns and no execution reservation in this module.
const nftDirectus='https://directus-on-nft.onrender.com';
const commercial='https://stripe-beta.onrender.com/api/pipeline2/burn/verified-commercial-readback';
const uuid=seed=>{const h=createHash('sha256').update(seed).digest('hex');return h.slice(0,8)+'-'+h.slice(8,12)+'-8'+h.slice(13,16)+'-a'+h.slice(17,20)+'-'+h.slice(20,32);};
const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const hexHash=/^0x[0-9a-f]{64}$/i;
const contract='0xa8d7598d2be127727f15667f4f5b4773ff1ec361';
const canonicalTime=s=>{if(typeof s!=='string'||!Number.isFinite(Date.parse(s)))throw Error('INVALID_LIFECYCLE_TIME');return new Date(s).toISOString();};

export async function verifyNftBurnAdmission({authorization:a,env=process.env,fetchImpl=fetch,readRegistration=readCommercialPreprintRegistration}={}){
 if(!a||!uuidPattern.test(a.agreementId||'')||!/^[1-9][0-9]*$/.test(String(a.registrationId??''))||
    !/^[1-9][0-9]*$/.test(String(a.tokenId??''))||!hexHash.test(a.mintTransactionHash||'')||
    a.option!=='discount'||a.agreementVersion!=='discount-v1'||a.network!=='polygon-amoy'||
    typeof a.userId!=='string'||!a.userId||a.userId.length>200||
    typeof a.albumId!=='string'||!/^ALBUM-BETA-[A-Za-z0-9_-]+$/.test(a.albumId)||
    !/^COPY-BETA-[1-9][0-9]*$/.test(a.copyNumber||'')||
    String(a.contractAddress||'').toLowerCase()!==contract||!Number.isSafeInteger(a.ownershipRecordId)||
    a.ownershipRecordId<1)throw Error('BURN_ADMISSION_INPUT_INVALID');
 const acceptedAt=canonicalTime(a.acceptedAt);
 if(Date.parse(acceptedAt)>Date.now())throw Error('BURN_ACCEPTANCE_IN_FUTURE');
 const token=env.AJINE_DIRECTUS_TOKEN,connection=env.AJINE_PIPELINE2_CONNECTION_TOKEN;
 if(!token||!connection||connection.length<32)throw Error('BURN_ADMISSION_CONNECTION_UNAVAILABLE');
 const purchase=await readRegistration(a.registrationId,{env});
 if(purchase.verified!==true||purchase.registrationVerified!==true||purchase.paymentRecordMatched!==true||
    purchase.ownershipVerified!==true||purchase.registrationId!==a.registrationId||
    purchase.registeredOwnerId!==a.userId||purchase.albumId!==a.albumId||purchase.copyNumber!==a.copyNumber)throw Error('BURN_PURCHASE_READBACK_HELD');
 async function nftRead(path){
  const response=await fetchImpl(nftDirectus+path,{
   headers:{Authorization:'Bearer '+token},redirect:'error',signal:AbortSignal.timeout(15000)
  });
  if(!response.ok)throw Error('NFT_BURN_READBACK_HTTP_'+response.status);
  return (await response.json()).data;
 }
 const registry=await nftRead('/items/NFT_Registry?filter[registration_id][_eq]='+encodeURIComponent(a.registrationId)+'&limit=2');
 if(!Array.isArray(registry)||registry.length!==1)throw Error('NFT_REGISTRY_IDENTITY_NOT_UNIQUE');
 const n=registry[0];
 if(n.registration_id!==a.registrationId||String(n.token_id)!==a.tokenId||
    String(n.contract_address||'').toLowerCase()!==contract||n.polygon_network!=='polygon-amoy'||
    n.mint_status!=='minted'||String(n.transaction_hash||'').toLowerCase()!==a.mintTransactionHash.toLowerCase()||
    String(n.owner_wallet||'').toLowerCase()!==String(env.AJINE_AMOY_CUSTODY_ADDRESS||'').toLowerCase()||
    n.burn_agreement_id!==a.agreementId||n.burn_agreement_version!==a.agreementVersion||
    canonicalTime(n.burn_agreement_accepted_at)!==acceptedAt||
    n.burn_reward_selection!=='discount'||n.burn_authorization_owner!==a.userId||
    String(n.burn_ownership_record_id)!==String(a.ownershipRecordId))throw Error('NFT_BURN_REGISTRY_EVIDENCE_MISMATCH');
 const response=await fetchImpl(commercial,{
  method:'POST',headers:{Authorization:'Bearer '+connection,'Content-Type':'application/json'},
  body:JSON.stringify({agreementId:a.agreementId,registrationId:a.registrationId,tokenId:a.tokenId,userId:a.userId}),
  redirect:'error',signal:AbortSignal.timeout(30000)
 });
 if(!response.ok)throw Error('COMMERCIAL_BURN_READBACK_HTTP_'+response.status);
 const c=await response.json();
 if(c.ok!==true||c.burn_enabled!==false||c.currentStatus!=='pending'||c.agreementId!==a.agreementId||
    c.registrationId!==a.registrationId||c.tokenId!==a.tokenId||!uuidPattern.test(c.currentEventId||'')||
    !Number.isSafeInteger(c.eventCount)||!Array.isArray(c.events)||c.events.length!==c.eventCount||
    c.events.length<1||c.events.length>1000)throw Error('COMMERCIAL_BURN_READBACK_INVALID');
 const events=await nftRead('/items/NFT_Agreement_Events?filter[agreement_id][_eq]='+encodeURIComponent(a.agreementId)+'&limit=1001&sort=occurred_at');
 if(!Array.isArray(events)||events.length!==c.events.length||events.length<1||events.length>1000)throw Error('BURN_EVENT_HISTORY_LENGTH_MISMATCH');
 const first=uuid('ajine:agreement:pending:'+a.agreementId);
 let prev=null;
 for(let i=0;i<events.length;i++){
  const e=events[i],r=c.events[i];
  const type=prev?(prev.event_type==='pending'?'withdrawn':'pending'):'pending';
  const id=!prev?first:prev.id===first?uuid('ajine:agreement:withdrawn:'+a.agreementId):uuid('ajine:agreement:'+type+':'+a.agreementId+':'+prev.id);
  const t=canonicalTime(e.occurred_at);
  if(e.id!==id||e.event_type!==type||e.agreement_id!==a.agreementId||
     e.registration_id!==a.registrationId||(!prev?t!==acceptedAt:Date.parse(t)<=Date.parse(prev.occurred_at))||
     r.id!==id||r.agreement_id!==a.agreementId||r.registration_id!==a.registrationId||
     r.event_type!==type||canonicalTime(r.occurred_at)!==t)throw Error('BURN_EVENT_HISTORY_CONFLICT');
  prev={id,event_type:type,occurred_at:t};
 }
 if(prev.event_type!=='pending'||prev.id!==c.currentEventId)throw Error('BURN_AGREEMENT_WITHDRAWN_OR_STALE');
 // Recheck latest NFT chain after commercial request to reduce stale-read window.
 // Final atomic reservation must still pin this event under the database trigger.
 const latest=await nftRead('/items/NFT_Agreement_Events?filter[agreement_id][_eq]='+encodeURIComponent(a.agreementId)+'&limit=1&sort=-occurred_at');
 if(!Array.isArray(latest)||latest.length!==1||latest[0].id!==prev.id||latest[0].event_type!=='pending')
  throw Error('BURN_EVENT_CHANGED_DURING_READBACK');
 return Object.freeze({verified:true,registrationId:a.registrationId,
  agreementId:a.agreementId,agreementEventId:prev.id,tokenId:a.tokenId,
  nftIdentity:contract+':'+a.tokenId,nftRegistryId:n.id,eventCount:events.length,
  burn_enabled:false});
}
