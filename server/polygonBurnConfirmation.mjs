import {Interface,ZeroAddress,getAddress} from 'ethers';
const abi=new Interface(['event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)','function burnBetaCopy(uint256 tokenId)']);
export async function confirmAmoyBurn({provider,contractAddress,tokenId,ownerWallet,transactionHash}){
 if(BigInt(await provider.send('eth_chainId',[]))!==80002n)throw Error('WRONG_CHAIN');
 const contract=getAddress(contractAddress),owner=getAddress(ownerWallet),id=BigInt(tokenId);
 if(id<=0n||owner===ZeroAddress||!/^0x[0-9a-f]{64}$/i.test(transactionHash))throw Error('INVALID_BURN_IDENTITY');
 const receipt=await provider.getTransactionReceipt(transactionHash);
 if(!receipt||receipt.status!==1||!receipt.to||getAddress(receipt.to)!==contract||!receipt.from||getAddress(receipt.from)!==owner||await receipt.confirmations()<2)return {confirmed:false};
 const tx=await provider.getTransaction(transactionHash);
 if(!tx||!tx.to||getAddress(tx.to)!==contract||getAddress(tx.from)!==owner||tx.data!==abi.encodeFunctionData('burnBetaCopy',[id]))return {confirmed:false};
 const matched=receipt.logs.some(log=>{
  if(getAddress(log.address)!==contract)return false;
  try{const event=abi.parseLog(log);return event?.name==='Transfer'&&getAddress(event.args.from)===owner&&event.args.to===ZeroAddress&&event.args.tokenId===id;}catch{return false;}
 });
 return matched?{confirmed:true,network:'polygon-amoy',contract_address:contract,token_id:id.toString(),transaction_hash:transactionHash,block_number:receipt.blockNumber}:{confirmed:false};
}
