// First-print acceptance contract: fail closed before any irreversible Polygon call.
// Evidence must be supplied by trusted server-side database readbacks, never browser flags.
const required=(v)=>typeof v==='string'&&v.trim().length>0;
const fields=['character','tier','editionNumber','editionLimit','assignmentId'];
export function assertFirstPrintAcceptance({board,authorization,metadataUri,verifiedEvidence}={}){
 const id=board?.identity;
 if(board?.mode!=='verified_projection'||!required(id?.registrationId)||!required(id?.albumId)||!required(id?.copyNumber))
   throw Error('FIRST_PRINT_REGISTRATION_NOT_VERIFIED');
 if(verifiedEvidence?.source!=='trusted-server-readback'||verifiedEvidence?.registrationVerified!==true||
    verifiedEvidence?.paymentVerified!==true||verifiedEvidence?.ownershipVerified!==true)
   throw Error('FIRST_PRINT_PAYMENT_AND_OWNERSHIP_EVIDENCE_REQUIRED');
 for(const key of ['registrationId','albumId','copyNumber']){
   if(verifiedEvidence[key]!==id[key]||authorization?.[key]!==id[key])
     throw Error('FIRST_PRINT_IDENTITY_MISMATCH');
 }
 const rarity=board.groups?.albumRarity;
 if(!fields.every(k=>rarity?.[k]?.status==='ready'&&rarity[k].value!=null))
   throw Error('FIRST_PRINT_ALBUM_RARITY_NOT_FINALIZED');
 const layer2=rarity?.layerTwo;
 if(layer2?.status!=='assigned'||!['characterId','tier','assignmentId'].every(k=>layer2[k]?.status==='ready'&&layer2[k]?.value!=null))
   throw Error('FIRST_PRINT_LAYER_TWO_NOT_FINALIZED');
 if(verifiedEvidence.rarityPersisted!==true||verifiedEvidence.layerTwoPersisted!==true||
    verifiedEvidence.rarityAssignmentId!==rarity.assignmentId.value||
    verifiedEvidence.layerTwoAssignmentId!==layer2.assignmentId.value)
   throw Error('FIRST_PRINT_RARITY_READBACK_MISMATCH');
 if(authorization?.registrationVerified!==true||authorization?.rarityVerified!==true||authorization?.layerTwoRarityVerified!==true)
   throw Error('FIRST_PRINT_AUTHORIZATION_HELD');
 if(!/^ipfs:\/\/[a-zA-Z0-9]+(?:\/[^\s]*)?$/.test(metadataUri??'')||
    verifiedEvidence.metadataVerified!==true||verifiedEvidence.metadataUri!==metadataUri||
    verifiedEvidence.metadataRegistrationId!==id.registrationId||
    verifiedEvidence.metadataAlbumId!==id.albumId||
    verifiedEvidence.metadataCopyNumber!==id.copyNumber)
   throw Error('FIRST_PRINT_METADATA_READBACK_REQUIRED');
 return true;
}
