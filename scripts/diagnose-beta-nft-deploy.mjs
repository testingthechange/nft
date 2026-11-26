// Read-only diagnostic for Polygon Amoy contract deployment.
// Does not require a private key, sign, broadcast, or spend POL.
import { ContractFactory, JsonRpcProvider, getAddress, formatEther, formatUnits } from 'ethers';
import { compileBetaAlbumNft } from './compile-beta-nft.mjs';

const rpc = process.env.POLYGON_AMOY_RPC_URL;
const inputAddress = process.env.AJINE_AMOY_CUSTODY_ADDRESS;
if (!rpc || !inputAddress) {
  console.error('Set POLYGON_AMOY_RPC_URL and AJINE_AMOY_CUSTODY_ADDRESS. No private key needed.');
  process.exit(1);
}
const address = getAddress(inputAddress);
const provider = new JsonRpcProvider(rpc, {name: 'polygon-amoy', chainId: 80002}, {staticNetwork:true});
const report={network:'polygon-amoy',chainId:80002,address,readOnly:true,broadcast:false,checks:{}};
const errorInfo = e => ({
  code: String(e?.code??'UNKNOWN').slice(0,100),
  shortMessage: String(e?.shortMessage??e?.message??'unknown').replace(/https?:\/\/[^\s)]+/g,'[RPC_URL_REDACTED]').slice(0,260),
  rpcCode: e?.info?.error?.code??e?.error?.code??null,
  rpcMessage: String(e?.info?.error?.message??e?.error?.message??'').slice(0,220)
});
async function check(name, fn) {
  try { report.checks[name]={ok:true,...await fn()}; }
  catch(e){report.checks[name]={ok:false,error:errorInfo(e)};}
}
try{
  await check('rpcChain',async()=>{const id=await provider.send('eth_chainId',[]);if(BigInt(id)!==80002n)throw Error('WRONG_CHAIN');return {chainId:Number(BigInt(id))};});
  await check('balance',async()=>({pol:formatEther(await provider.getBalance(address))}));
  await check('nonce',async()=>({confirmed:await provider.getTransactionCount(address,'latest'),pending:await provider.getTransactionCount(address,'pending')}));
  await check('feeData',async()=>{const f=await provider.getFeeData();return {gasPriceGwei:f.gasPrice==null?null:formatUnits(f.gasPrice,'gwei'),maxFeeGwei:f.maxFeePerGas==null?null:formatUnits(f.maxFeePerGas,'gwei')};});
  await check('deploymentGasEstimate',async()=>{
    const {abi,bytecode}=compileBetaAlbumNft();
    const factory=new ContractFactory(abi,'0x'+bytecode);
    const tx=await factory.getDeployTransaction(address);
    const gas=await provider.estimateGas({...tx,from:address});
    return {estimatedGas:gas.toString(),bytecodeBytes:bytecode.length/2};
  });
  report.passed=Object.values(report.checks).every(c=>c.ok);
  console.log(JSON.stringify(report,null,2));
  if(!report.passed)process.exitCode=1;
} finally {provider.destroy();}
