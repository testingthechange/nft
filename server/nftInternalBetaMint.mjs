// Internal Amoy mint executor. No HTTP route, no customer wallet, disabled by default.
import { Contract, JsonRpcProvider, Wallet, getAddress, ZeroAddress, AbiCoder, keccak256 } from 'ethers';
import { assembleFromGatheringBoard } from './nftAssemblyAdapter.mjs';
import { assertFirstPrintAcceptance } from './nftFirstPrintAcceptance.mjs';
const abi=[
 'function owner() view returns (address)',
 'function tokenIdForCopy(string,string) view returns (uint256)',
 'function copyKeyOfToken(uint256) view returns (bytes32)',
 'function ownerOf(uint256) view returns (address)',
 'function mintBetaCopy(address,string,string,string) returns (uint256)',
 'event BetaAlbumCopyMinted(bytes32 indexed copyKey,uint256 indexed tokenId,address indexed recipient)'
];
export async function executeInternalBetaMint({board,rules,metadataUri,authorization,verifiedEvidence}={}) {
 if(process.env.AJINE_AMOY_MINT_ENABLED!=='true') throw Error('MINT_DISABLED');
 assertFirstPrintAcceptance({board,authorization,metadataUri,verifiedEvidence});
 const frame=assembleFromGatheringBoard(board,rules);
 if(frame.decision!=='eligible'||authorization?.registrationVerified!==true||
 authorization?.rarityVerified!==true||authorization?.layerTwoRarityVerified!==true||
 authorization?.registrationId!==frame.registrationId||authorization?.albumId!==frame.albumId||
 authorization?.copyNumber!==frame.copyNumber) throw Error('MINT_NOT_AUTHORIZED');
 if(!frame.albumId.startsWith('ALBUM-BETA-')||!frame.copyNumber.startsWith('COPY-BETA-')) throw Error('BETA_IDENTITY_REQUIRED');
 if(typeof metadataUri!=='string'||!/^ipfs:\/\/[a-zA-Z0-9]+(?:\/[^\s]*)?$/.test(metadataUri)) throw Error('IPFS_METADATA_REQUIRED');
 const rpc=process.env.POLYGON_AMOY_RPC_URL;
 if(!rpc) throw Error('RPC_REQUIRED');
 const provider=new JsonRpcProvider(rpc);
 try {
 if((await provider.getNetwork()).chainId!==80002n) throw Error('WRONG_CHAIN');
 const signer=new Wallet(process.env.AJINE_AMOY_MINT_PRIVATE_KEY,provider);
 const address=getAddress(process.env.AJINE_AMOY_NFT_CONTRACT);
 const custody=getAddress(process.env.AJINE_AMOY_CUSTODY_ADDRESS);
 if(address===ZeroAddress||custody===ZeroAddress||await provider.getCode(address)==='0x') throw Error('INVALID_CONTRACT_OR_CUSTODY');
 const contract=new Contract(address,abi,signer);
 if(getAddress(await contract.owner())!==signer.address) throw Error('SIGNER_NOT_CONTRACT_OWNER');
 if(await contract.tokenIdForCopy(frame.albumId,frame.copyNumber)!==0n) throw Error('COPY_ALREADY_MINTED_RECONCILE');
 const key=keccak256(AbiCoder.defaultAbiCoder().encode(['string','string'],[frame.albumId,frame.copyNumber]));
 // The transaction hash must be retained by the trusted caller for recovery.
 // Never send another mint after an uncertain broadcast without reconciling tokenIdForCopy.
 const tx=await contract.mintBetaCopy(custody,frame.albumId,frame.copyNumber,metadataUri);
 console.info('AJINE_BETA_MINT_SUBMITTED',JSON.stringify({transactionHash:tx.hash,albumId:frame.albumId,copyNumber:frame.copyNumber}));
 let receipt;
 try {receipt=await tx.wait(2);}
 catch(error){
   console.error('AJINE_BETA_MINT_CONFIRMATION_UNCERTAIN',JSON.stringify({transactionHash:tx.hash,code:String(error?.code??'UNKNOWN')}));
   throw Error('MINT_CONFIRMATION_UNCERTAIN_RECONCILE_'+tx.hash);
 }
 if(!receipt||receipt.status!==1) throw Error('MINT_RECEIPT_FAILED');
 const events=receipt.logs.filter(log=>getAddress(log.address)===address).map(log=>{try{return contract.interface.parseLog(log);}catch{return null;}}).filter(event=>event?.name==='BetaAlbumCopyMinted');
 if(events.length!==1) throw Error('MINT_EVENT_MISMATCH');
 const event=events[0];
 const token=event.args.tokenId;
 if(token<=0n||event.args.copyKey!==key||getAddress(event.args.recipient)!==custody||
 await contract.tokenIdForCopy(frame.albumId,frame.copyNumber)!==token||
 await contract.copyKeyOfToken(token)!==key||getAddress(await contract.ownerOf(token))!==custody) throw Error('MINT_PROOF_MISMATCH');
 return Object.freeze({verified:true,chainId:80002,registrationId:frame.registrationId,albumId:frame.albumId,copyNumber:frame.copyNumber,contractAddress:address,tokenId:token.toString(),transactionHash:receipt.hash,verifiedWallet:custody});
 } finally {provider.destroy();}
}
