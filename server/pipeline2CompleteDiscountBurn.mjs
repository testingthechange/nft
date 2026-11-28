import {executeAmoyBurn} from './polygonBurnExecution.mjs';
import {recordConfirmedAjineBurn} from './pipeline2ConfirmedBurnRegistry.mjs';
import {reconcilePreparedAmoyBurn} from './polygonBurnRecovery.mjs';

// Private service-only execution. The customer never supplies a wallet or
// onchain execution evidence. All identities come from a durable reservation,
// the NFT Registry, and the original commercial purchase record.
const base='https://directus-on-nft.onrender.com/items/';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function completeDiscountBurn({input,env=process.env,fetchImpl=fetch,
 execute=executeAmoyBurn,record=recordConfirmedAjineBurn,reconcile=reconcilePreparedAmoyBurn}={}){
 if(env.AJINE_FINAL_BURN_EXECUTION_ENABLED!=='true'||env.AJINE_AMOY_BURN_ENABLED!=='true')
  throw Error('FINAL_BURN_EXECUTION_DISABLED');
 const reservationId=input?.reservationId;
 if(input?.option==='jingles'&&env.AJINE_JINGLE_BURN_EXECUTION_ENABLED!=='true')throw Error('JINGLE_BURN_DISABLED');
 if(!uuid.test(reservationId||'')||!uuid.test(input?.agreementId||'')||
  !uuid.test(input?.agreementEventId||'')||!['discount','jingles'].includes(input?.option)||
  input?.confirmBurn!==true||!/^[1-9][0-9]*$/.test(String(input?.registrationId||'')))
  throw Error('FINAL_BURN_INPUT_INVALID');
 const token=env.AJINE_DIRECTUS_TOKEN;
 if(!token)throw Error('FINAL_BURN_DIRECTUS_UNAVAILABLE');
 async function read(path){
  const r=await fetchImpl(base+path,{headers:{Authorization:'Bearer '+token},
   signal:AbortSignal.timeout(15000),redirect:'error'});
  if(!r.ok)throw Error('FINAL_BURN_READ_HTTP_'+r.status);
  return (await r.json()).data;
 }
 const reservation=await read('NFT_Burn_Executions/'+encodeURIComponent(reservationId));
 if(reservation?.id!==reservationId||reservation.status!=='reserved'||reservation.transaction_hash!=null||
    reservation.registration_id!==input.registrationId||reservation.agreement_id!==input.agreementId||
    reservation.agreement_event_id!==input.agreementEventId)
  throw Error('FINAL_BURN_RESERVATION_MISMATCH');
 const registries=await read('NFT_Registry?filter[registration_id][_eq]='+encodeURIComponent(input.registrationId)+'&limit=2');
 if(!Array.isArray(registries)||registries.length!==1)throw Error('FINAL_BURN_REGISTRY_NOT_UNIQUE');
 const nft=registries[0];
 const identity=String(nft.contract_address||'').toLowerCase()+':'+String(nft.token_id||'');
 if(reservation.nft_identity!==identity||nft.burn_agreement_id!==input.agreementId||
  nft.burn_reward_selection!==input.option||nft.mint_status!=='minted'||nft.polygon_network!=='polygon-amoy'||
  !/^[1-9][0-9]*$/.test(String(nft.token_id||'')))
  throw Error('FINAL_BURN_NFT_IDENTITY_MISMATCH');
 const {verifyNftBurnAdmission}=await import('./pipeline2BurnAdmissionReadback.mjs');
 const {readCommercialPreprintRegistration}=await import('./nftCommercialPreprintEvidence.mjs');
 const purchase=await readCommercialPreprintRegistration(input.registrationId,{env});
 if(purchase.verified!==true||purchase.registrationVerified!==true||
    purchase.paymentRecordMatched!==true||purchase.ownershipVerified!==true||
    purchase.registeredOwnerId!==nft.burn_authorization_owner)
  throw Error('FINAL_BURN_PURCHASE_MISMATCH');
 const authorization={registrationId:input.registrationId,ownershipRecordId:Number(nft.burn_ownership_record_id),
   albumId:purchase.albumId,copyNumber:purchase.copyNumber,contractAddress:nft.contract_address,
   tokenId:String(nft.token_id),mintTransactionHash:nft.transaction_hash,network:'polygon-amoy',
   agreementId:input.agreementId,agreementVersion:nft.burn_agreement_version,
   acceptedAt:nft.burn_agreement_accepted_at,option:input.option,userId:nft.burn_authorization_owner};
 const checked=await verifyNftBurnAdmission({authorization,env,fetchImpl});
 if(checked?.verified!==true||checked.agreementEventId!==reservation.agreement_event_id||
   checked.nftIdentity!==reservation.nft_identity)throw Error('FINAL_BURN_AGREEMENT_CHANGED');
 // The reserved row is single-use: executor refuses an already prepared hash.
 // Never start another transaction if a signed one may already exist.
 const evidence={verified:true,agreementVerified:true,option:input.option,network:'polygon-amoy',
  reservationId,agreementId:input.agreementId,agreementEventId:input.agreementEventId,
  registrationId:input.registrationId,albumId:purchase.albumId,copyNumber:purchase.copyNumber,
  contractAddress:nft.contract_address,ownerWallet:nft.owner_wallet,tokenId:String(nft.token_id)};
 if(input.option==='jingles'){
  const {verifyPrivateJingleRegistry}=await import('./pipeline2PrivateJingleRegistry.mjs');
  await verifyPrivateJingleRegistry(env);
 }
 const chain=await execute({evidence,env,fetchImpl});
 if(chain?.confirmed!==true)throw Error('FINAL_BURN_CHAIN_NOT_CONFIRMED');
 const provenance=await record({reservationId,env,fetchImpl,reconcile});
 if(provenance?.stored!==true||provenance.registrationId!==input.registrationId)
  throw Error('FINAL_BURN_PROVENANCE_HELD');
 return Object.freeze({ok:true,confirmed:true,registrationId:input.registrationId,
  reservationId,agreementId:input.agreementId,agreementEventId:input.agreementEventId,
  tokenId:String(nft.token_id),transactionHash:provenance.transactionHash,
  ajineBurnNumber:provenance.ajineBurnNumber,burnRegistryId:provenance.burnRegistryId});
}

export async function recoverDiscountBurn({input,env=process.env,fetchImpl=fetch,
 record=recordConfirmedAjineBurn,reconcile=reconcilePreparedAmoyBurn}={}){
 // No signing and no broadcast. Access only via private machine-token route.
 if(env.AJINE_FINAL_BURN_RECOVERY_ENABLED!=='true')throw Error('FINAL_BURN_RECOVERY_DISABLED');
 if(!uuid.test(input?.reservationId||''))throw Error('FINAL_BURN_RECOVERY_INPUT_INVALID');
 const result=await reconcile({reservationId:input.reservationId,env,fetchImpl});
 if(result?.confirmed!==true)return Object.freeze({ok:true,confirmed:false,retryAllowed:false,reservationId:input.reservationId});
 const provenance=await record({reservationId:input.reservationId,env,fetchImpl,reconcile});
 if(provenance?.stored!==true)throw Error('FINAL_BURN_RECOVERY_PROVENANCE_HELD');
 return Object.freeze({ok:true,confirmed:true,retryAllowed:false,...provenance,reservationId:input.reservationId});
}
