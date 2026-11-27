// Operator-only Polygon Amoy deployment; no automatic rebroadcast on timeout.
// Prints the locally signed transaction hash BEFORE submitting to RPC.
import {Contract,ContractFactory,JsonRpcProvider,Wallet,getAddress,getCreateAddress,keccak256,ZeroAddress,formatEther} from 'ethers';
import {compileBurnableBetaNft} from './compile-burnable-beta-nft.mjs';

async function main(){
 const rpc=process.env.POLYGON_AMOY_RPC_URL,key=process.env.AJINE_AMOY_MINT_PRIVATE_KEY;
 if(!rpc||!key)throw Error('RPC_AND_PRIVATE_KEY_REQUIRED');
 if(process.env.AJINE_AMOY_DEPLOY_CONFIRM!=='DEPLOY_AMOY_BURNABLE_BETA')throw Error('EXPLICIT_DEPLOY_CONFIRMATION_REQUIRED');
 const provider=new JsonRpcProvider(rpc,{name:'polygon-amoy',chainId:80002},{staticNetwork:true});
 try{
  if(BigInt(await provider.send('eth_chainId',[]))!==80002n)throw Error('WRONG_CHAIN_EXPECTED_AMOY_80002');
  const signer=new Wallet(key,provider);
  const custody=process.env.AJINE_AMOY_CUSTODY_ADDRESS;
  if(custody&&getAddress(custody)!==signer.address)throw Error('CUSTODY_AND_SIGNER_MISMATCH');
  const confirmedNonce=await provider.getTransactionCount(signer.address,'latest');
  const pendingNonce=await provider.getTransactionCount(signer.address,'pending');
  if(confirmedNonce!==pendingNonce)throw Error('PENDING_SIGNER_TRANSACTION_CHECK_EXPLORER');
  const predicted=getCreateAddress({from:signer.address,nonce:pendingNonce});
  if(await provider.getCode(predicted)!=='0x')throw Error('PREDICTED_CONTRACT_ALREADY_DEPLOYED');
  const balance=await provider.getBalance(signer.address);
  if(balance===0n)throw Error('SIGNER_NOT_FUNDED');
  const {abi,bytecode}=compileBurnableBetaNft();
  const factory=new ContractFactory(abi,'0x'+bytecode,signer);
  const draft=await factory.getDeployTransaction(signer.address);
  const estimated=await provider.estimateGas({...draft,from:signer.address});
  const gasLimit=estimated*12n/10n;
  const fee=await provider.getFeeData();
  const maxFee=fee.maxFeePerGas??fee.gasPrice;
  if(!maxFee||maxFee<=0n)throw Error('GAS_PRICE_UNAVAILABLE');
  if(gasLimit*maxFee>balance)throw Error('INSUFFICIENT_DEPLOYMENT_GAS');
  const priority=fee.maxPriorityFeePerGas??1_000_000_000n;
  const transaction={
    to:null,data:draft.data,value:0n,chainId:80002,nonce:pendingNonce,gasLimit,
    type:2,maxFeePerGas:maxFee,maxPriorityFeePerGas:priority>maxFee?maxFee:priority
  };
  const raw=await signer.signTransaction(transaction);
  const hash=keccak256(raw);
  console.log(JSON.stringify({stage:'prepared',chainId:80002,signer:signer.address,
    transactionHash:hash,predictedContract:predicted,nonce:pendingNonce,
    estimatedGas:estimated.toString(),maxGasCostPOL:formatEther(gasLimit*maxFee),
    broadcast:false,action:'Save transactionHash. Check explorer before any retry.'}));
  try{
    // Exactly one broadcast call. A timeout is ambiguous: NEVER auto-resubmit.
    await provider.broadcastTransaction(raw);
  }catch(error){
    console.error('BROADCAST_UNCERTAIN:',JSON.stringify({
      transactionHash:hash,predictedContract:predicted,
      code:String(error?.code??'RPC_ERROR'),
      message:String(error?.shortMessage??error?.message??'RPC failed').replace(/https?:\/\/[^\s)]+/g,'[RPC_URL_REDACTED]').slice(0,200),
      instruction:'Search transactionHash on Amoy explorer; do not retry until reconciled.'
    }));
    process.exitCode=1;return;
  }
  console.log(JSON.stringify({stage:'submitted',transactionHash:hash,predictedContract:predicted}));
  let receipt;
  try{receipt=await provider.waitForTransaction(hash,2,120000);}
  catch(error){
    console.error('CONFIRMATION_UNCERTAIN:',JSON.stringify({transactionHash:hash,
      code:String(error?.code??'RPC_ERROR'),instruction:'Check transactionHash on Amoy explorer before rerun.'}));
    process.exitCode=1;return;
  }
  if(!receipt||receipt.status!==1||!receipt.contractAddress)throw Error('DEPLOYMENT_NOT_CONFIRMED_CHECK_HASH_'+hash);
  const deployed=getAddress(receipt.contractAddress);
  if(deployed!==getAddress(predicted)||deployed===ZeroAddress||await provider.getCode(deployed)==='0x')throw Error('CONTRACT_ADDRESS_OR_CODE_MISMATCH');
  const contract=new Contract(deployed,['function owner() view returns (address)'],provider);
  if(getAddress(await contract.owner())!==signer.address)throw Error('CONTRACT_OWNER_MISMATCH');
  console.log(JSON.stringify({ok:true,network:'polygon-amoy',chainId:80002,
    contractAddress:deployed,owner:signer.address,transactionHash:hash,deployed:true,minted:false}));
 }finally{provider.destroy();}
}
main().catch(e=>{console.error('DEPLOY_FAILED:',String(e?.shortMessage??e?.message??'unknown').replace(/https?:\/\/[^\s)]+/g,'[RPC_URL_REDACTED]').slice(0,250));process.exitCode=1;});
