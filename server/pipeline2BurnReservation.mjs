import {randomUUID} from 'node:crypto';
import {verifyNftBurnAdmission} from './pipeline2BurnAdmissionReadback.mjs';

// Internal function only, deliberately NOT exposed by an HTTP route.
// The commercial API must issue a distinct, authenticated final authorization
// before this is ever invoked. No Polygon transaction is submitted here.
const base='https://directus-on-nft.onrender.com/items/NFT_Burn_Executions';
export async function reserveVerifiedNftBurn({authorization,env=process.env,fetchImpl=fetch,verify=verifyNftBurnAdmission}={}){
 if(env.AJINE_BURN_RESERVATION_ENABLED!=='true')throw Error('BURN_RESERVATION_DISABLED');
 const verified=await verify({authorization,env,fetchImpl});
 if(authorization?.confirmBurn!==true||authorization?.reserveOnly!==true||authorization?.verificationOnly===true||
    authorization?.expectedEventId!==verified?.agreementEventId)throw Error('BURN_FINAL_EVENT_MISMATCH');
 if(verified?.verified!==true||verified.burn_enabled!==false||
    !verified.agreementEventId||!verified.agreementId||!verified.registrationId||
    !verified.nftIdentity||!verified.tokenId)throw Error('BURN_RESERVATION_NOT_VERIFIED');
 const token=env.AJINE_DIRECTUS_TOKEN;
 if(!token)throw Error('BURN_RESERVATION_DIRECTUS_UNAVAILABLE');
 const url=base+'?filter[nft_identity][_eq]='+encodeURIComponent(verified.nftIdentity)+'&limit=2';
 async function read(){
  const r=await fetchImpl(url,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(15000),redirect:'error'});
  if(!r.ok)throw Error('BURN_RESERVATION_READ_HTTP_'+r.status);
  const rows=(await r.json()).data;
  if(!Array.isArray(rows)||rows.length>1)throw Error('BURN_RESERVATION_IDENTITY_CONFLICT');
  return rows[0]??null;
 }
 // Existing reservations are never replaced or automatically retried.
 if(await read())throw Error('BURN_RESERVATION_ALREADY_EXISTS');
 const item={id:randomUUID(),nft_identity:verified.nftIdentity,
  registration_id:verified.registrationId,agreement_id:verified.agreementId,
  agreement_event_id:verified.agreementEventId,status:'reserved',
  authorized_at:new Date().toISOString()};
 if(!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(item.id))throw Error('BURN_RESERVATION_ID_INVALID');
 let response;
 try{
  response=await fetchImpl(base,{method:'POST',
   headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
   body:JSON.stringify(item),redirect:'error',signal:AbortSignal.timeout(15000)});
 }catch(error){
  // Network uncertainty: never attempt a second reservation blindly.
  console.warn('AJINE_BURN_RESERVATION_WRITE_UNCERTAIN');
  throw Error('BURN_RESERVATION_RECONCILIATION_REQUIRED');
 }
 if(!response.ok)throw Error('BURN_RESERVATION_POST_HELD_'+response.status);
 const recorded=await read();
 if(!recorded||recorded.id!==item.id||recorded.nft_identity!==item.nft_identity||
    recorded.registration_id!==item.registration_id||recorded.agreement_id!==item.agreement_id||
    recorded.agreement_event_id!==item.agreement_event_id||recorded.status!=='reserved'||
    recorded.transaction_hash!=null||!Number.isFinite(Date.parse(recorded.authorized_at)))
    throw Error('BURN_RESERVATION_READBACK_MISMATCH');
 console.info('AJINE_BURN_RESERVATION_RECORDED',JSON.stringify({registrationId:item.registration_id,reservationId:item.id}));
 return Object.freeze({reserved:true,reservationId:item.id,agreementEventId:item.agreement_event_id,
  registrationId:item.registration_id,tokenId:verified.tokenId,burn_enabled:false});
}
