// Pipeline 1 SOP: Registration is the only authority for My Collection release.
// Pure contract validation; this module does not store, deliver, or claim payment proof.
export function inspectRegistrationNftReturn({original,returned,registrationAuthorized=false,polygonProofVerified=false,rarityVerified=false,layerTwoRarityVerified=false,betaCoreOnly=false}={}){
  if(!original||!returned)throw Error('missing_registration_or_return');
  if(returned.schemaVersion!=='ajine.my-collection.nft-return.v1'||
    returned.destination!=='thirdparty.registration.board.nftReturn')throw Error('return_must_target_registration');
  const matches=original.registration_id===returned.registrationId &&
    original.album_id===returned.albumId &&
    original.album_copy_number===returned.copyNumber;
  const synthetic=returned.fixtureOnly===true;
  const verified=returned.nft?.verificationStatus==='verified' &&
    returned.nft?.ownershipConfirmed===true;
  const releasable=matches&&!synthetic&&registrationAuthorized===true &&
    polygonProofVerified===true&&verified&&
    ((rarityVerified===true&&layerTwoRarityVerified===true)||
      (betaCoreOnly===true&&/^[1-9][0-9]*$/.test(original.registration_id)&&
       /^ALBUM-BETA-/.test(original.album_id)&&/^COPY-BETA-/.test(original.album_copy_number)&&
       rarityVerified===false&&layerTwoRarityVerified===false));
  return Object.freeze({
    registrationMatched:matches,fixtureOnly:synthetic,
    registrationAuthorized:registrationAuthorized===true,
    polygonProofVerified:polygonProofVerified===true,
    rarityVerified:rarityVerified===true,layerTwoRarityVerified:layerTwoRarityVerified===true,
    registrationStatus:releasable?'release_eligible':'hold',
    releaseTo:'thirdparty.myCollection.board.nftSlot',
    releaseAuthorized:releasable,delivered:false,stored:false
  });
}
