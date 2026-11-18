// Synthetic-only return projection. NOT the commercial site's real My Collection Board.
import {buildMyCollectionReturn} from './nftMyCollectionReturn.mjs';
import {inspectRegistrationNftReturn} from './nftRegistrationReturnGate.mjs';
export function inspectMyCollectionNftSlot(payload){
  if(payload?.schemaVersion!=='ajine.my-collection.nft-return.v1' ||
    payload.destination!=='thirdparty.registration.board.nftReturn')throw Error('wrong_return_contract');
  if(payload.fixtureOnly!==true || payload.deliveryStatus!=='not_sent' ||
    payload.stored!==false || payload.minted!==false ||
    payload.nft?.verificationStatus!=='pending' || payload.nft?.ownershipConfirmed!==false)
    throw Error('synthetic_safety_violation');
  const gate=inspectRegistrationNftReturn({original:{registration_id:payload.registrationId,album_id:payload.albumId,album_copy_number:payload.copyNumber},returned:payload});
  if(gate.releaseAuthorized)throw Error('synthetic_release_forbidden');
  const slot=Object.freeze({
    slot:'myCollection.board.nftSlot',mode:'synthetic_preview',status:'preview_ready',
    registrationId:payload.registrationId,albumId:payload.albumId,copyNumber:payload.copyNumber,
    rarity:payload.rarity,layerTwoRarity:payload.layerTwoRarity,
    network:payload.nft.network,verificationStatus:'pending',ownershipConfirmed:false
  });
  return Object.freeze({accepted:true,slot,gate,delivered:false,ownershipPageRendered:false});
}
export function pingMyCollectionReturn(){
  const fixture=buildMyCollectionReturn({
    registrationId:'PING-REG-001',albumId:'ALBUM-BETA-PING',copyNumber:'COPY-BETA-PING',
    rarity:null,layerTwoRarity:null,synthetic:true
  });
  const projection=inspectMyCollectionNftSlot(fixture);
  return Object.freeze({test:'synthetic-return-slot-contract',passed:projection.accepted,
    source:'nft.return-json',destination:fixture.destination,
    slotStatus:projection.slot.status,registrationStatus:projection.gate.registrationStatus,
    releaseAuthorized:projection.gate.releaseAuthorized,registrationMatched:projection.slot.registrationId===fixture.registrationId,
    copyMatched:projection.slot.copyNumber===fixture.copyNumber,
    rarityAssigned:false,layerTwoRarityAssigned:false,polygonProofVerified:false,
    liveThirdPartyDelivery:false,ownershipPageRendered:false,
    stored:false,minted:false});
}
