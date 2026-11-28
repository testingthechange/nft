import {createHash,randomBytes} from 'node:crypto';
import {reconcilePreparedAmoyBurn} from './polygonBurnRecovery.mjs';

// Provenance is issued only after a verified, confirmed Polygon burn.
// Deterministic AJINE number makes uncertain HTTP writes recoverable.
export async function recordConfirmedAjineBurn({reservationId,env=process.env,fetchImpl=fetch,
  reconcile=reconcilePreparedAmoyBurn}={}){
 const proof=await reconcile({reservationId,env,fetchImpl});
 if(proof?.confirmed!==true||proof.retryAllowed!==false)throw Error('AJINE_BURN_CHAIN_NOT_CONFIRMED');
 const token=env.AJINE_DIRECTUS_TOKEN;
 if(!token)throw Error('AJINE_BURN_DIRECTUS_UNAVAILABLE');
 const headers={Authorization:'Bearer '+token,'Content-Type':'application/json'};
 const base='https://directus-on-nft.onrender.com/items/';
 async function read(path){
  const r=await fetchImpl(base+path,{headers,signal:AbortSignal.timeout(15000),redirect:'error'});
  if(!r.ok)throw Error('AJINE_BURN_READ_HTTP_'+r.status);
  return (await r.json()).data;
 }
 const execution=await read('NFT_Burn_Executions/'+encodeURIComponent(reservationId));
 if(!execution||execution.id!==reservationId||execution.status!=='confirmed'||
   execution.transaction_hash!==proof.transactionHash||!/^[1-9][0-9]*$/.test(String(execution.registration_id||'')))
  throw Error('AJINE_BURN_EXECUTION_NOT_CONFIRMED');
 const records=await read('NFT_Registry?filter[registration_id][_eq]='+encodeURIComponent(execution.registration_id)+'&limit=2');
 if(!Array.isArray(records)||records.length!==1)throw Error('AJINE_BURN_NFT_NOT_UNIQUE');
 const nft=records[0],identity=String(nft.contract_address||'').toLowerCase()+':'+String(nft.token_id);
 if(!Number.isSafeInteger(nft.id)||nft.id<1||identity!==execution.nft_identity||
   nft.burn_agreement_id!==execution.agreement_id||nft.polygon_network!=='polygon-amoy')
  throw Error('AJINE_BURN_NFT_MISMATCH');
 const option=nft.burn_reward_selection;
 if(!['discount','jingles'].includes(option))throw Error('BURN_REWARD_INVALID');
 const discountNumber='AJINE-BURN-'+execution.registration_id+'-'+
   createHash('sha256').update(execution.nft_identity+':'+execution.transaction_hash)
   .digest('hex').slice(0,16).toUpperCase();
 const existing=await read('Burn_Registry?filter[nft_link][_eq]='+encodeURIComponent(nft.id)+'&limit=2');
 if(!Array.isArray(existing)||existing.length>1)throw Error('AJINE_BURN_REGISTRY_CONFLICT');
 const number=option==='discount'?discountNumber:(existing[0]?.ajine_burn_number??'AJINE-BURN-'+randomBytes(32).toString('hex').toUpperCase());
 if(option==='jingles'&&!/^AJINE-BURN-[A-F0-9]{64}$/.test(number))throw Error('JINGLE_BURN_NUMBER_INVALID');
 const matches=r=>r&&r.nft_link===nft.id&&r.burn_transaction_hash===execution.transaction_hash&&
  r.ajine_burn_number===number&&r.reward_selection===option&&r.burn_status==='confirmed';
 if(existing.length===1){
  if(!matches(existing[0]))throw Error('AJINE_BURN_ALREADY_REGISTERED_DIFFERENTLY');
  return Object.freeze({ok:true,stored:true,ajineBurnNumber:number,burnRegistryId:existing[0].id,
    agreementId:execution.agreement_id,registrationId:execution.registration_id,transactionHash:execution.transaction_hash,recovered:true});
 }
 const item={nft_link:nft.id,nft_id:String(nft.token_id),
   original_album_copy_number:'BETA-'+execution.registration_id,
   burn_transaction_hash:execution.transaction_hash,burn_status:'confirmed',
   reward_selection:option,burn_date:new Date().toISOString(),ajine_burn_number:number};
 let response;
 try{
  response=await fetchImpl(base+'Burn_Registry',{method:'POST',headers,
   body:JSON.stringify(item),redirect:'error',signal:AbortSignal.timeout(15000)});
 }catch{
  console.warn('AJINE_BURN_REGISTRY_WRITE_UNCERTAIN',JSON.stringify({reservationId}));
  throw Error('AJINE_BURN_REGISTRY_RECONCILIATION_REQUIRED');
 }
 if(!response.ok)throw Error('AJINE_BURN_REGISTRY_WRITE_HELD_'+response.status);
 const check=await read('Burn_Registry?filter[nft_link][_eq]='+encodeURIComponent(nft.id)+'&limit=2');
 if(!Array.isArray(check)||check.length!==1||!matches(check[0]))
  throw Error('AJINE_BURN_REGISTRY_READBACK_HELD');
 console.info('AJINE_BURN_REGISTRY_CONFIRMED',JSON.stringify({registrationId:execution.registration_id,option}));
 return Object.freeze({ok:true,stored:true,ajineBurnNumber:number,burnRegistryId:check[0].id,
   agreementId:execution.agreement_id,registrationId:execution.registration_id,transactionHash:execution.transaction_hash,recovered:false});
}
