import {Contract,JsonRpcProvider,Wallet,getAddress,keccak256,AbiCoder,Transaction} from 'ethers';
import {confirmAmoyBurn} from './polygonBurnConfirmation.mjs';

// Internal executor only. Do not attach to a customer/public HTTP route yet.
// Durable rule: signed transaction hash is written before broadcast. An
// uncertain transaction is NEVER retried automatically with a fresh nonce.
const abi=['function ownerOf(uint256) view returns(address)','function tokenIdForCopy(string,string) view returns(uint256)','function copyKeyOfToken(uint256) view returns(bytes32)','function burnBetaCopy(uint256)'];
const base='https://directus-on-nft.onrender.com/items/NFT_Burn_Executions/';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const hash=/^0x[0-9a-f]{64}$/i;
let busy=false;
export async function executeAmoyBurn({evidence,env=process.env,fetchImpl=fetch}={}){
 if(env.AJINE_AMOY_BURN_ENABLED!=='true')throw Error('BURN_DISABLED');
 if(!evidence||evidence.verified!==true||evidence.agreementVerified!==true||
    evidence.option!=='discount'||evidence.network!=='polygon-amoy'||
    !uuid.test(evidence.reservationId||'')||!uuid.test(evidence.agreementId||'')||
    !uuid.test(evidence.agreementEventId||'')||!/^[1-9][0-9]*$/.test(String(evidence.registrationId||''))||
    !/^ALBUM-BETA-.+$/.test(evidence.albumId||'')||
    !/^COPY-BETA-[1-9][0-9]*$/.test(evidence.copyNumber||'')||
    !/^[1-9][0-9]*$/.test(String(evidence.tokenId||'')))throw Error('BURN_NOT_AUTHORIZED');
 const address=getAddress(env.AJINE_AMOY_NFT_CONTRACT),custody=getAddress(env.AJINE_AMOY_CUSTODY_ADDRESS);
 if(address.toLowerCase()!=='0xa8d7598d2be127727f15667f4f5b4773ff1ec361'||
    getAddress(evidence.contractAddress)!==address||getAddress(evidence.ownerWallet)!==custody)
   throw Error('BURN_IDENTITY_MISMATCH');
 if(!env.AJINE_DIRECTUS_TOKEN)throw Error('BURN_DIRECTUS_TOKEN_REQUIRED');
 if(busy)throw Error('BURN_IN_PROGRESS');
 busy=true;
 const url=base+encodeURIComponent(evidence.reservationId);
 const headers={Authorization:'Bearer '+env.AJINE_DIRECTUS_TOKEN,'Content-Type':'application/json'};
 async function read(){
  const response=await fetchImpl(url,{headers,redirect:'error',signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('BURN_RECORD_READ_HTTP_'+response.status);
  return (await response.json()).data;
 }
 const identity=address.toLowerCase()+':'+String(evidence.tokenId);
 const matches=r=>r&&r.id===evidence.reservationId&&r.nft_identity===identity&&
   r.registration_id===String(evidence.registrationId)&&r.agreement_id===evidence.agreementId&&
   r.agreement_event_id===evidence.agreementEventId;
 let provider;
 try{
  const initial=await read();
  if(!matches(initial)||initial.status!=='reserved'||initial.transaction_hash!=null)
   throw Error('BURN_RESERVATION_NOT_READY');
  provider=new JsonRpcProvider(env.POLYGON_AMOY_RPC_URL);
  if((await provider.getNetwork()).chainId!==80002n)throw Error('WRONG_CHAIN');
  const signer=new Wallet(env.AJINE_AMOY_MINT_PRIVATE_KEY,provider);
  if(signer.address!==custody)throw Error('SIGNER_NOT_CUSTODY');
  const contract=new Contract(address,abi,signer),id=BigInt(evidence.tokenId);
  const key=keccak256(AbiCoder.defaultAbiCoder().encode(['string','string'],[evidence.albumId,evidence.copyNumber]));
  if(await contract.tokenIdForCopy(evidence.albumId,evidence.copyNumber)!==id||
     await contract.copyKeyOfToken(id)!==key||
     getAddress(await contract.ownerOf(id))!==custody)throw Error('BURN_COPY_MISMATCH');
  const fee=await provider.getFeeData();
  const gas=await contract.burnBetaCopy.estimateGas(id);
  const tx={to:address,from:custody,
    data:contract.interface.encodeFunctionData('burnBetaCopy',[id]),
    chainId:80002n,nonce:await provider.getTransactionCount(custody,'pending'),
    gasLimit:gas*120n/100n,
    ...(fee.maxFeePerGas!=null&&fee.maxPriorityFeePerGas!=null?
      {type:2,maxFeePerGas:fee.maxFeePerGas,maxPriorityFeePerGas:fee.maxPriorityFeePerGas}:
      {type:0,gasPrice:fee.gasPrice})};
  if(tx.gasPrice==null&&tx.maxFeePerGas==null)throw Error('BURN_FEE_UNAVAILABLE');
  const signed=await signer.signTransaction(tx);
  const signedHash=Transaction.from(signed).hash;
  if(!hash.test(signedHash||''))throw Error('BURN_SIGNED_HASH_INVALID');
  // Conditional update binds the hash to the reserved NFT before any network broadcast.
  const updateUrl='https://directus-on-nft.onrender.com/items/NFT_Burn_Executions'+
    '?filter[id][_eq]='+encodeURIComponent(evidence.reservationId)+
    '&filter[status][_eq]=reserved&filter[transaction_hash][_null]=true';
  const response=await fetchImpl(updateUrl,{
   method:'PATCH',headers,redirect:'error',signal:AbortSignal.timeout(15000),
   body:JSON.stringify({status:'prepared',transaction_hash:signedHash.toLowerCase()})
  });
  if(!response.ok)throw Error('BURN_PREBROADCAST_WRITE_HELD_'+response.status);
  const affected=(await response.json()).data;
  if(!Array.isArray(affected)||affected.length!==1||affected[0]?.id!==evidence.reservationId)
   throw Error('BURN_PREBROADCAST_CONDITIONAL_UPDATE_HELD');
  const prepared=await read();
  if(!matches(prepared)||prepared.status!=='prepared'||
     String(prepared.transaction_hash).toLowerCase()!==signedHash.toLowerCase())
    throw Error('BURN_PREBROADCAST_READBACK_HELD');
  // The transaction is now an immutable reconciliation obligation.
  // A crash before or after broadcast must NEVER allocate another nonce.
  let broadcast;
  try{
   broadcast=await provider.broadcastTransaction(signed);
   if(broadcast.hash.toLowerCase()!==signedHash.toLowerCase())
     throw Error('BURN_BROADCAST_HASH_CONFLICT');
  }catch{
   console.error('AJINE_BURN_RECONCILIATION_REQUIRED',JSON.stringify({
    reservationId:evidence.reservationId,transactionHash:signedHash
   }));
   throw Error('BURN_RECONCILIATION_REQUIRED');
  }
  console.info('AJINE_BURN_SUBMITTED',JSON.stringify({reservationId:evidence.reservationId,transactionHash:signedHash}));
  try{
   await broadcast.wait(2);
   const proof=await confirmAmoyBurn({provider,contractAddress:address,tokenId:id,
     ownerWallet:custody,transactionHash:signedHash});
   if(proof.confirmed!==true)throw Error('BURN_PROOF_NOT_CONFIRMED');
   const verifiedRow=await read();
   if(!matches(verifiedRow)||String(verifiedRow.transaction_hash).toLowerCase()!==signedHash.toLowerCase()||
      verifiedRow.status!=='prepared')throw Error('BURN_RECORD_CHANGED');
   const saved=await fetchImpl('https://directus-on-nft.onrender.com/items/NFT_Burn_Executions'+
      '?filter[id][_eq]='+encodeURIComponent(evidence.reservationId)+
      '&filter[status][_eq]=prepared'+
      '&filter[transaction_hash][_eq]='+encodeURIComponent(signedHash.toLowerCase()),
      {method:'PATCH',headers,redirect:'error',signal:AbortSignal.timeout(15000),
       body:JSON.stringify({status:'confirmed'})});
   if(!saved.ok)throw Error('BURN_CONFIRMATION_WRITE_HELD_'+saved.status);
   const affectedConfirmed=(await saved.json()).data;
   if(!Array.isArray(affectedConfirmed)||affectedConfirmed.length!==1||
      affectedConfirmed[0]?.id!==evidence.reservationId)throw Error('BURN_CONFIRMATION_CONDITIONAL_UPDATE_HELD');
   const confirmed=await read();
   if(!matches(confirmed)||confirmed.status!=='confirmed'||String(confirmed.transaction_hash).toLowerCase()!==signedHash.toLowerCase())
     throw Error('BURN_CONFIRMATION_READBACK_HELD');
   return proof;
  }catch{
   console.error('AJINE_BURN_RECONCILIATION_REQUIRED',JSON.stringify({
     reservationId:evidence.reservationId,transactionHash:signedHash
   }));
   throw Error('BURN_RECONCILIATION_REQUIRED');
  }
 }finally{busy=false;provider?.destroy();}
}
