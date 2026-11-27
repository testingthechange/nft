import {Contract,JsonRpcProvider,Wallet,getAddress,keccak256,AbiCoder} from 'ethers';
import {confirmAmoyBurn} from './polygonBurnConfirmation.mjs';
const abi=['function ownerOf(uint256) view returns(address)','function tokenIdForCopy(string,string) view returns(uint256)','function copyKeyOfToken(uint256) view returns(bytes32)','function burnBetaCopy(uint256)'];
let busy=false;
// Internal only. No HTTP exposure. Caller must supply independently verified
// registration and agreement evidence; never pass raw customer input here.
export async function executeAmoyBurn({evidence,env=process.env}={}){
 if(env.AJINE_AMOY_BURN_ENABLED!=='true')throw Error('BURN_DISABLED');
 if(evidence?.verified!==true||evidence.agreementVerified!==true||evidence.option!=='discount'||evidence.network!=='polygon-amoy')throw Error('BURN_NOT_AUTHORIZED');
 if(!/^ALBUM-BETA-.+$/.test(evidence.albumId)||!/^COPY-BETA-[1-9][0-9]*$/.test(evidence.copyNumber)||! /^[1-9][0-9]*$/.test(String(evidence.tokenId)))throw Error('INVALID_COPY');
 const address=getAddress(env.AJINE_AMOY_NFT_CONTRACT), custody=getAddress(env.AJINE_AMOY_CUSTODY_ADDRESS);
 if(address.toLowerCase()!=='0xa8d7598d2be127727f15667f4f5b4773ff1ec361'||getAddress(evidence.contractAddress)!==address||getAddress(evidence.ownerWallet)!==custody)throw Error('BURN_IDENTITY_MISMATCH');
 if(busy)throw Error('BURN_IN_PROGRESS');
 busy=true;
 let provider;
 try{
  provider=new JsonRpcProvider(env.POLYGON_AMOY_RPC_URL);
  if((await provider.getNetwork()).chainId!==80002n)throw Error('WRONG_CHAIN');
  const signer=new Wallet(env.AJINE_AMOY_MINT_PRIVATE_KEY,provider);
  if(signer.address!==custody)throw Error('SIGNER_NOT_CUSTODY');
  const contract=new Contract(address,abi,signer), id=BigInt(evidence.tokenId);
  const key=keccak256(AbiCoder.defaultAbiCoder().encode(['string','string'],[evidence.albumId,evidence.copyNumber]));
  if(await contract.tokenIdForCopy(evidence.albumId,evidence.copyNumber)!==id||await contract.copyKeyOfToken(id)!==key||getAddress(await contract.ownerOf(id))!==custody)throw Error('BURN_COPY_MISMATCH');
  const tx=await contract.burnBetaCopy(id);
  console.info('AJINE_BURN_SUBMITTED',JSON.stringify({transactionHash:tx.hash,tokenId:id.toString()}));
  try{
   await tx.wait(2);
   const proof=await confirmAmoyBurn({provider,contractAddress:address,tokenId:id,ownerWallet:custody,transactionHash:tx.hash});
   if(!proof.confirmed)throw Error('BURN_PROOF_NOT_CONFIRMED');
   return proof;
  }catch(error){
   console.error('AJINE_BURN_RECONCILIATION_REQUIRED',JSON.stringify({transactionHash:tx.hash,tokenId:id.toString()}));
   throw Error('BURN_RECONCILIATION_REQUIRED_'+tx.hash);
  }
 }finally{busy=false;provider?.destroy();}
}
