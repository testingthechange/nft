// BETA deployment manifest: unsigned, deterministic, non-executable.
import { compileBetaAlbumNft } from './compile-beta-nft.mjs';
import { checkBetaDeploymentReadiness } from './check-amoy-beta-readiness.mjs';
import { Interface, getAddress, isAddress } from 'ethers';
export async function prepareBetaDeploymentManifest({ownerAddress, statusReader, compiler=compileBetaAlbumNft}={}) {
  if (!isAddress(ownerAddress ?? '')) throw Error('valid_owner_address_required');
  const owner=getAddress(ownerAddress);
  if (owner === '0x0000000000000000000000000000000000000000') throw Error('zero_owner_forbidden');
  const readiness=await checkBetaDeploymentReadiness({statusReader,compiler});
  if (!readiness.ok) throw Error('amoy_readiness_not_verified');
  const artifact=compiler();
  const iface=new Interface(artifact.abi);
  const deployData=iface.encodeDeploy([owner]);
  const unsignedCreationData='0x'+artifact.bytecode+deployData.slice(2);
  return Object.freeze({
    schema:'ajine-beta-amoy-deployment-manifest-v1',
    network:'polygon-amoy',chainId:80002,contract:'BetaAlbumCopyNFT',
    ownerAddress:owner,constructorArguments:[owner],
    creationDataBytes:(unsignedCreationData.length-2)/2,
    unsignedCreationData, // locally generated only; never includes a wallet key
    signerConfigured:false,transactionSubmitted:false,deployed:false,minted:false
  });
}
