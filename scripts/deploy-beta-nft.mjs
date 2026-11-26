// Explicit operator-only Polygon Amoy contract deployment. Never prints private keys.
import {ContractFactory,JsonRpcProvider,Wallet,getAddress,ZeroAddress} from 'ethers';
import {compileBetaAlbumNft} from './compile-beta-nft.mjs';

async function main(){
  const rpc=process.env.POLYGON_AMOY_RPC_URL;
  const key=process.env.AJINE_AMOY_MINT_PRIVATE_KEY;
  if(!rpc||!key)throw Error('RPC_AND_PRIVATE_KEY_REQUIRED');
  if(process.env.AJINE_AMOY_DEPLOY_CONFIRM!=='DEPLOY_AMOY_BETA')throw Error('EXPLICIT_DEPLOY_CONFIRMATION_REQUIRED');
  const provider=new JsonRpcProvider(rpc);
  try{
    const network=await provider.getNetwork();
    if(network.chainId!==80002n)throw Error('WRONG_CHAIN_EXPECTED_AMOY_80002');
    const signer=new Wallet(key,provider);
    const custody=process.env.AJINE_AMOY_CUSTODY_ADDRESS;
    if(custody && getAddress(custody)!==signer.address)throw Error('CUSTODY_AND_SIGNER_MISMATCH');
    const balance=await provider.getBalance(signer.address);
    if(balance===0n)throw Error('SIGNER_NOT_FUNDED');
    const {abi,bytecode}=compileBetaAlbumNft();
    const factory=new ContractFactory(abi,'0x'+bytecode,signer);
    const deployment=await factory.getDeployTransaction(signer.address);
    const gas=await provider.estimateGas({...deployment,from:signer.address});
    const fee=await provider.getFeeData();
    const gasPrice=fee.maxFeePerGas??fee.gasPrice;
    if(!gasPrice||balance<(gas*12n/10n)*gasPrice)throw Error('INSUFFICIENT_DEPLOYMENT_GAS');
    const contract=await factory.deploy(signer.address,{gasLimit:gas*12n/10n});
    const tx=contract.deploymentTransaction();
    if(!tx)throw Error('DEPLOYMENT_TRANSACTION_MISSING');
    console.log(JSON.stringify({status:'broadcast',chainId:80002,signer:signer.address,transactionHash:tx.hash}));
    const receipt=await tx.wait(2);
    if(!receipt||receipt.status!==1||!receipt.contractAddress)throw Error('DEPLOYMENT_RECEIPT_FAILED');
    const address=getAddress(receipt.contractAddress);
    if(address===ZeroAddress||await provider.getCode(address)==='0x')throw Error('CONTRACT_CODE_MISSING');
    const onChainOwner=getAddress(await contract.owner());
    if(onChainOwner!==signer.address)throw Error('CONTRACT_OWNER_MISMATCH');
    console.log(JSON.stringify({ok:true,network:'polygon-amoy',chainId:80002,contractAddress:address,owner:onChainOwner,transactionHash:receipt.hash,deployed:true,minted:false}));
  }finally{provider.destroy();}
}
main().catch(error=>{console.error('DEPLOY_FAILED:',error?.shortMessage||error?.message||'unknown_error');process.exitCode=1;});
