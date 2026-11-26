// Internal orchestration only. No public route or automatic execution.
import {buildNftGatheringBoard} from './nftGatheringBoard.mjs';
import {assemblePipeline1OwnershipReturn} from './pipeline1ConsolidatedReturn.mjs';
import {executeInternalBetaMint} from './nftInternalBetaMint.mjs';
import {readCommercialPreprintRegistration} from './nftCommercialPreprintEvidence.mjs';
import {readVerifiedBetaMetadata} from './nftBetaMetadataReadback.mjs';
export async function prepareInternalMintReturn({verifiedRegistration,purchase,ownership,rules,metadataUri,authorization,verifiedEvidence}={}) {
 if(verifiedRegistration?.verified!==true) throw Error('REGISTRATION_NOT_VERIFIED');
 const registration=verifiedRegistration.record;
 // Independent commercial DB check occurs before any mint call.
 const commercial=await readCommercialPreprintRegistration(registration.registration_id);
 if(commercial.albumId!==registration.album_id||
    commercial.copyNumber!==registration.album_copy_number||
    commercial.registeredOwnerId!==registration.registered_owner_id||
    commercial.purchaseTransactionId!==registration.purchase_transaction_id||
    commercial.orderNumber!==purchase?.orderNumber||
    commercial.pricePaidCents!==purchase?.pricePaidCents||
    commercial.currency!==purchase?.currency||
    commercial.verified!==true)
   throw Error('PREPRINT_COMMERCIAL_REGISTRATION_MISMATCH');
 // Read and verify operator-allowlisted HTTPS or immutable IPFS metadata independently.
 const metadata=await readVerifiedBetaMetadata({metadataUri,identity:{
   registrationId:commercial.registrationId,albumId:commercial.albumId,
   copyNumber:commercial.copyNumber
 }});
 const board=buildNftGatheringBoard({verifiedRegistration});
 // Until the rarity printers provide authoritative persisted assignments,
 // never reuse caller-supplied evidence booleans to bypass mint admission.
 const trustedEvidence=Object.freeze({
   source:'trusted-server-readback',
   registrationId:commercial.registrationId,albumId:commercial.albumId,copyNumber:commercial.copyNumber,
   registrationVerified:commercial.registrationVerified,
   paymentVerified:commercial.paymentRecordMatched,
   ownershipVerified:commercial.ownershipVerified,
   rarityPersisted:false,layerTwoPersisted:false,
   metadataVerified:metadata.verified,
   metadataUri:metadata.metadataUri,
   metadataRegistrationId:metadata.registrationId,
   metadataAlbumId:metadata.albumId,
   metadataCopyNumber:metadata.copyNumber
 });
 // Validate all return streams before any irreversible transaction.
 assemblePipeline1OwnershipReturn({registration,purchase,ownership,synthetic:true});
 const proof=await executeInternalBetaMint({board,rules,metadataUri,authorization,verifiedEvidence:trustedEvidence});
 const returnedBoard=buildNftGatheringBoard({verifiedRegistration,verifiedPolygon:proof});
 const p=returnedBoard.groups.polygon;
 const polygon={verified:true,chainId:80002,contractAddress:p.contractAddress.value,tokenId:p.tokenId.value,transactionHash:p.mintTransactionHash.value,verifiedWallet:p.verifiedWallet.value};
 const returnPackage=assemblePipeline1OwnershipReturn({registration,purchase,ownership,polygon,synthetic:false,registrationAuthorized:true,polygonProofVerified:true,rarityVerified:authorization.rarityVerified===true,layerTwoRarityVerified:authorization.layerTwoRarityVerified===true,betaCoreOnly:authorization.betaCoreOnly===true});
 if(returnPackage.releaseAuthorized!==true) throw Error('RETURN_RELEASE_HELD');
 return Object.freeze({board:returnedBoard,returnPackage,stored:false,delivered:false});
}
