import {JsonRpcProvider,getAddress} from 'ethers';
import {confirmAmoyBurn} from './polygonBurnConfirmation.mjs';

// Read-only onchain reconciliation until a known, confirmed burn is found.
// Never signs, broadcasts, reserves, or retries a transaction.
export async function reconcilePreparedAmoyBurn({reservationId,env=process.env,fetchImpl=fetch}={}){
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reservationId||''))throw Error('INVALID_RESERVATION');
 const token=env.AJINE_DIRECTUS_TOKEN;
 if(!token)throw Error('DIRECTUS_NOT_CONFIGURED');
 const base='https://directus-on-nft.onrender.com/items/NFT_Burn_Executions';
 const headers={Authorization:'Bearer '+token,'Content-Type':'application/json'};
 const itemUrl=base+'/'+encodeURIComponent(reservationId);
 async function read(){
  const r=await fetchImpl(itemUrl,{headers,signal:AbortSignal.timeout(15000),redirect:'error'});
  if(!r.ok)throw Error('BURN_RECONCILE_READ_HTTP_'+r.status);
  return (await r.json()).data;
 }
 const e=await read();
 if(e?.id!==reservationId||!['prepared','confirmed'].includes(e.status)||
    !/^0x[0-9a-f]{64}$/.test(e.transaction_hash||''))throw Error('BURN_RECONCILE_NOT_PREPARED');
 const parts=String(e.nft_identity||'').split(':');
 if(parts.length!==2||!/^[1-9][0-9]*$/.test(parts[1]||'')||
    !/^0x[0-9a-f]{40}$/i.test(parts[0]))throw Error('BURN_RECONCILE_NFT_IDENTITY_INVALID');
 const contract=getAddress(parts[0]);
 if(contract.toLowerCase()!=='0xa8d7598d2be127727f15667f4f5b4773ff1ec361')throw Error('BURN_RECONCILE_CONTRACT_INVALID');
 const custody=getAddress(env.AJINE_AMOY_CUSTODY_ADDRESS);
 const provider=new JsonRpcProvider(env.POLYGON_AMOY_RPC_URL);
 try{
  const proof=await confirmAmoyBurn({provider,contractAddress:contract,tokenId:parts[1],
    ownerWallet:custody,transactionHash:e.transaction_hash});
  if(proof.confirmed!==true)
    return Object.freeze({ok:true,confirmed:false,reservationId,transactionHash:e.transaction_hash,retryAllowed:false});
  if(e.status==='confirmed')
    return Object.freeze({ok:true,confirmed:true,reservationId,transactionHash:e.transaction_hash,alreadyRecorded:true,retryAllowed:false});
  const row=await read();
  if(row?.status!=='prepared'||row.transaction_hash!==e.transaction_hash||
    row.nft_identity!==e.nft_identity||row.agreement_event_id!==e.agreement_event_id)
    throw Error('BURN_RECONCILE_RECORD_CHANGED');
  const r=await fetchImpl(base,{method:'PATCH',headers,redirect:'error',signal:AbortSignal.timeout(15000),
    body:JSON.stringify({query:{filter:{_and:[
      {id:{_eq:reservationId}},{status:{_eq:'prepared'}},
      {transaction_hash:{_eq:e.transaction_hash}}
    ]}},data:{status:'confirmed'}})});
  if(!r.ok)throw Error('BURN_RECONCILE_WRITE_HTTP_'+r.status);
  const affected=(await r.json()).data;
  if(!Array.isArray(affected)||affected.length!==1||affected[0]?.id!==reservationId)
    throw Error('BURN_RECONCILE_CONDITIONAL_UPDATE_HELD');
  const final=await read();
  if(final?.status!=='confirmed'||final.transaction_hash!==e.transaction_hash)
    throw Error('BURN_RECONCILE_FINAL_READBACK_HELD');
  console.info('AJINE_BURN_RECONCILED',JSON.stringify({reservationId,transactionHash:e.transaction_hash}));
  return Object.freeze({ok:true,confirmed:true,reservationId,transactionHash:e.transaction_hash,retryAllowed:false});
 }finally{provider.destroy();}
}
