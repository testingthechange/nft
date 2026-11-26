import {buildMyCollectionReturn} from './nftMyCollectionReturn.mjs';
import {inspectRegistrationNftReturn} from './nftRegistrationReturnGate.mjs';
// Pure assembly: no writes, minting or delivery.
export function assemblePipeline1OwnershipReturn({registration,purchase,ownership,polygon=null,synthetic=true,registrationAuthorized=false,polygonProofVerified=false,rarityVerified=false,layerTwoRarityVerified=false,betaCoreOnly=false}={}){
 if(!registration||!purchase||!ownership)throw Error('missing_pipeline1_stream');
 const {registration_id:registrationId,album_id:albumId,album_copy_number:copyNumber,registered_owner_id:ownerId,purchase_transaction_id:transactionId,registration_date:registrationDate}=registration;
 for(const [key,value] of Object.entries({registrationId,albumId,copyNumber,ownerId,transactionId,registrationDate}))
  if(typeof value!=='string'||!value.trim())throw Error('missing_'+key);
 if(!Number.isFinite(Date.parse(registrationDate)))throw Error('invalid_registration_date');
 if(ownership.registrationId!==registrationId||ownership.albumId!==albumId||ownership.copyNumber!==copyNumber||ownership.ownerId!==ownerId||!ownership.ownershipKey)throw Error('ownership_identity_mismatch');
 if(purchase.transactionId!==transactionId||purchase.albumId!==albumId||!purchase.orderNumber)throw Error('purchase_identity_mismatch');
 if(!Number.isSafeInteger(purchase.pricePaidCents)||purchase.pricePaidCents<0||typeof purchase.currency!=='string'||!/^[A-Z]{3}$/.test(purchase.currency))throw Error('invalid_purchase_amount');
 const nftReturn=buildMyCollectionReturn({registrationId,albumId,copyNumber,polygon,synthetic});
 const gate=inspectRegistrationNftReturn({original:registration,returned:nftReturn,registrationAuthorized,polygonProofVerified,rarityVerified,layerTwoRarityVerified,betaCoreOnly});
 return Object.freeze({schemaVersion:'ajine.pipeline1.consolidated-return.v1',destination:'thirdparty.registration.board.nftReturn',
 identity:Object.freeze({registrationId,albumId,copyNumber,ownerId}),
 purchase:Object.freeze({orderNumber:purchase.orderNumber,pricePaidCents:purchase.pricePaidCents,currency:purchase.currency}),
 ownership:Object.freeze({ownershipKey:ownership.ownershipKey,registrationDate,ownershipStatus:'registered'}),
 nft:nftReturn.nft,releaseAuthorized:gate.releaseAuthorized,status:gate.releaseAuthorized?'release_eligible':'hold',delivered:false,stored:false,fixtureOnly:synthetic});
}
