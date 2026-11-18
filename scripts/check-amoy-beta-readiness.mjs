// AJINE Amoy BETA deployment readiness — checks only, no wallet or transaction.
import { compileBetaAlbumNft } from './compile-beta-nft.mjs';
import { readPolygonAmoyStatus } from '../server/polygonAmoy.mjs';
export async function checkBetaDeploymentReadiness({ statusReader = readPolygonAmoyStatus, compiler = compileBetaAlbumNft } = {}) {
  const status = await statusReader();
  if (status.connected !== true || status.chain_id !== 80002 || status.read_only !== true ||
      status.mint_enabled !== false || status.wallet_configured !== false) {
    return { ok:false, reason:'amoy_status_not_verified', deployed:false, minted:false };
  }
  const artifact = compiler();
  const names = artifact.abi.filter(x => x.type === 'function').map(x => x.name);
  for (const name of ['copyKey','tokenIdForCopy','mintBetaCopy','owner']) {
    if (!names.includes(name)) throw Error('Missing required BETA contract ABI method: '+name);
  }
  if (!/^[0-9a-fA-F]+$/.test(artifact.bytecode) || artifact.bytecode.length < 2)
    throw Error('Invalid BETA bytecode');
  return { ok:true, network:'polygon-amoy', chain_id:80002,
    block_number:status.block_number, contract:'BetaAlbumCopyNFT',
    abi_entries:artifact.abi.length, bytecode_bytes:artifact.bytecode.length/2,
    deployment_authorized:false, deployed:false, minted:false };
}
if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  checkBetaDeploymentReadiness().then(result=>{
    console.log(JSON.stringify(result));
    if (!result.ok) process.exitCode=1;
  }).catch(error=>{ console.error(error.message); process.exitCode=1; });
}
