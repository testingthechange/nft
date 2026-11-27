import {Contract,JsonRpcProvider,getAddress,AbiCoder,keccak256} from 'ethers';
import {readCommercialPreprintRegistration} from './nftCommercialPreprintEvidence.mjs';
// Internal pre-burn adapter. No public endpoint, mint, burn or Pipeline 1 mutation.
export async function storeVerifiedNftForBurn({registrationId,mintTransactionHash,expectedTokenId,env=process.env}={}){
 registrationId=String(registrationId);
 if(!/^[1-9][0-9]*$/.test(registrationId)||BigInt(registrationId)<=6n||!/^0x[0-9a-fA-F]{64}$/.test(mintTransactionHash))throw Error('INVALID_REGISTRY_INPUT');
 const token=env.AJINE_DIRECTUS_TOKEN;
 if(!token)throw Error('NFT_DIRECTUS_TOKEN_REQUIRED');
 const e=await readCommercialPreprintRegistration(registrationId,{env});
 if(e.verified!==true||e.registrationVerified!==true||e.paymentRecordMatched!==true||e.ownershipVerified!==true||e.registrationId!==registrationId||!/^ALBUM-BETA-.+$/.test(e.albumId)||!/^COPY-BETA-[1-9][0-9]*$/.test(e.copyNumber)||!e.registeredOwnerId||!e.purchaseTransactionId)throw Error('REGISTRATION_NOT_VERIFIED');
 const address=getAddress(env.AJINE_AMOY_NFT_CONTRACT),custody=getAddress(env.AJINE_AMOY_CUSTODY_ADDRESS);
 if(address.toLowerCase()!=='0xa8d7598d2be127727f15667f4f5b4773ff1ec361')throw Error('BURNABLE_CONTRACT_REQUIRED');
 const provider=new JsonRpcProvider(env.POLYGON_AMOY_RPC_URL);
 let proof;
 try{
  if((await provider.getNetwork()).chainId!==80002n)throw Error('WRONG_CHAIN');
  const c=new Contract(address,['function tokenIdForCopy(string,string) view returns(uint256)','function copyKeyOfToken(uint256) view returns(bytes32)','function ownerOf(uint256) view returns(address)','function tokenURI(uint256) view returns(string)','event BetaAlbumCopyMinted(bytes32 indexed copyKey,uint256 indexed tokenId,address indexed recipient)'],provider);
  const id=await c.tokenIdForCopy(e.albumId,e.copyNumber);
  if(expectedTokenId!==undefined&&id.toString()!==String(expectedTokenId))throw Error('EXPECTED_TOKEN_MISMATCH');
  const key=keccak256(AbiCoder.defaultAbiCoder().encode(['string','string'],[e.albumId,e.copyNumber]));
  const receipt=await provider.getTransactionReceipt(mintTransactionHash);
  if(!receipt||receipt.status!==1||getAddress(receipt.to)!==address||await receipt.confirmations()<2||id<=0n)throw Error('MINT_RECEIPT_INVALID');
  const events=receipt.logs.filter(l=>getAddress(l.address)===address).map(l=>{try{return c.interface.parseLog(l)}catch{return null}}).filter(l=>l?.name==='BetaAlbumCopyMinted');
  if(events.length!==1||events[0].args.copyKey!==key||events[0].args.tokenId!==id||getAddress(events[0].args.recipient)!==custody||await c.copyKeyOfToken(id)!==key||getAddress(await c.ownerOf(id))!==custody)throw Error('MINT_IDENTITY_MISMATCH');
  const block=await provider.getBlock(receipt.blockNumber);
  if(!block)throw Error('MINT_BLOCK_MISSING');
  proof={contract_address:address.toLowerCase(),token_id:id.toString(),polygon_network:'polygon-amoy',owner_wallet:custody.toLowerCase(),mint_status:'minted',transaction_hash:receipt.hash.toLowerCase(),metadata_url:await c.tokenURI(id),mint_confirmation_date:new Date(block.timestamp*1000).toISOString()};
 }finally{provider.destroy()}
 async function api(path,method='GET',body){
  for(let attempt=0;attempt<3;attempt++){
   const r=await fetch('https://directus-on-nft.onrender.com'+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(15000)});
   if(r.ok)return (await r.json()).data;
   if(method!=='GET'||r.status!==429||attempt===2)throw Error('NFT_DIRECTUS_'+method+'_HTTP_'+r.status);
   const header=r.headers.get('retry-after');
   const delay=header===null?1000*2**attempt:/^\d+$/.test(header)?Number(header)*1000:Math.max(0,Date.parse(header)-Date.now());
   if(!Number.isFinite(delay)||delay>10000)throw Error('NFT_DIRECTUS_GET_RATE_LIMIT_HELD');
   await r.body?.cancel();
   console.info('AJINE_PIPELINE2_DIRECTUS_READ_RETRY',JSON.stringify({attempt:attempt+1,delayMs:delay}));
   await new Promise(resolve=>setTimeout(resolve,Math.max(250,delay)));
  }
  throw Error('NFT_DIRECTUS_GET_RATE_LIMIT_HELD');
 }
 async function exact(collection,filter,record){
  const query='/items/'+collection+'?limit=2&filter='+encodeURIComponent(JSON.stringify(filter));
  let rows=await api(query);
  if(rows.length>1)throw Error('DUPLICATE_'+collection);
  if(!rows.length){
   try{await api('/items/'+collection,'POST',record)}catch(error){rows=await api(query);if(rows.length!==1)throw error;}
   rows=await api(query);
  }
  if(rows.length!==1)throw Error('READBACK_FAILED_'+collection);
  for(const [k,v] of Object.entries(record)){
   const actual=rows[0][k];
   if(k.endsWith('_date')?Date.parse(actual)!==Date.parse(v):String(actual)!==String(v))throw Error('READBACK_MISMATCH_'+collection+'_'+k);
  }
  return rows[0];
 }
 const registration={registration_id:registrationId,album_id:e.albumId,album_copy_number:e.copyNumber,registered_owner_id:e.registeredOwnerId,purchase_transaction_id:e.purchaseTransactionId,registration_date:e.registrationDate,registration_status:'verified'};
 if(!Number.isFinite(Date.parse(registration.registration_date)))throw Error('REGISTRATION_DATE_INVALID');
 const a=await exact('Abum_Registration',{registration_id:{_eq:registrationId}},registration);
 const n=await exact('NFT_Registry',{contract_address:{_eq:proof.contract_address},token_id:{_eq:proof.token_id},polygon_network:{_eq:proof.polygon_network}},{registration_id:registrationId,...proof,album_registration_link:a.id});
 return Object.freeze({stored:true,registrationId,nftRegistryId:n.id,albumRegistrationId:a.id,tokenId:proof.token_id});
}
