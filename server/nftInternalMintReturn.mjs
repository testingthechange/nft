// Internal orchestration only. No public route or automatic execution.
import {buildNftGatheringBoard} from './nftGatheringBoard.mjs';
import {assemblePipeline1OwnershipReturn} from './pipeline1ConsolidatedReturn.mjs';
import {executeInternalBetaMint} from './nftInternalBetaMint.mjs';
export async function prepareInternalMintReturn({verifiedRegistration,purchase,ownership,rules,metadataUri,authorization,verifiedEvidence}={}) {
 if(verifiedRegistration?.verified!==true) throw Error('REGISTRATION_NOT_VERIFIED');
 const registration=verifiedRegistration.record;
 const board=buildNftGatheringBoard({verifiedRegistration});
 // Validate all return streams before any irreversible transaction.
 assemblePipeline1OwnershipReturn({registration,purchase,ownership,synthetic:true});
 const proof=await executeInternalBetaMint({board,rules,metadataUri,authorization,verifiedEvidence});
 const returnedBoard=buildNftGatheringBoard({verifiedRegistration,verifiedPolygon:proof});
 const p=returnedBoard.groups.polygon;
 const polygon={verified:true,chainId:80002,contractAddress:p.contractAddress.value,tokenId:p.tokenId.value,transactionHash:p.mintTransactionHash.value,verifiedWallet:p.verifiedWallet.value};
 const returnPackage=assemblePipeline1OwnershipReturn({registration,purchase,ownership,polygon,synthetic:false,registrationAuthorized:true,polygonProofVerified:true,rarityVerified:authorization.rarityVerified===true,layerTwoRarityVerified:authorization.layerTwoRarityVerified===true});
 if(returnPackage.releaseAuthorized!==true) throw Error('RETURN_RELEASE_HELD');
 return Object.freeze({board:returnedBoard,returnPackage,stored:false,delivered:false});
}
