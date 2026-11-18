// Synthetic-only return projection. NOT the commercial site's real My Collection Board.
import {buildMyCollectionReturn} from './nftMyCollectionReturn.mjs';
export function inspectMyCollectionNftSlot(payload){
  if(payload?.schemaVersion!=='ajine.my-collection.nft-return.v1' ||
    payload.destination!=='thirdparty.myCollection.board.nftSlot')throw Error('wrong_return_contract');
  if(payload.fixtureOnly!==true || payload.deliveryStatus!=='not_sent' ||
    payload.stored!==false || payload.minted!==false ||
    payload.nft?.verificationStatus!=='pending' || payload.nft?.ownershipConfirmed!==false)
    throw Error('synthetic_safety_violation');
  const slot=Object.freeze({
    slot:'myCollection.board.nftSlot',mode:'synthetic_preview',status:'preview_ready',
    registrationId:payload.registrationId,albumId:payload.albumId,copyNumber:payload.copyNumber,
    rarity:payload.rarity,layerTwoRarity:payload.layerTwoRarity,
    network:payload.nft.network,verificationStatus:'pending',ownershipConfirmed:false
  });
  return Object.freeze({accepted:true,slot,delivered:false,ownershipPageRendered:false});
}
export function pingMyCollectionReturn(){
  const fixture=buildMyCollectionReturn({
    registrationId:'PING-REG-001',albumId:'ALBUM-BETA-PING',copyNumber:'COPY-BETA-PING',
    rarity:null,layerTwoRarity:null,synthetic:true
  });
  const projection=inspectMyCollectionNftSlot(fixture);
  return Object.freeze({test:'synthetic-return-slot-contract',passed:projection.accepted,
    source:'nft.return-json',destination:fixture.destination,
    slotStatus:projection.slot.status,registrationMatched:projection.slot.registrationId===fixture.registrationId,
    copyMatched:projection.slot.copyNumber===fixture.copyNumber,
    rarityAssigned:false,layerTwoRarityAssigned:false,polygonProofVerified:false,
    liveThirdPartyDelivery:false,ownershipPageRendered:false,
    stored:false,minted:false});
}
