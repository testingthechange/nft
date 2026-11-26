// One-copy beta mint entry point. Restricted to verified Registration #6.
// Never trust caller-supplied payment, ownership, rarity or chain proof.
import {readCommercialPreprintRegistration} from './nftCommercialPreprintEvidence.mjs';
import {prepareInternalMintReturn} from './nftInternalMintReturn.mjs';

let mintInProgress=false;
export async function runFirstBetaMint({registrationId,metadataUri,env=process.env}={}){
  if(env.AJINE_BETA_MINT_ENDPOINT_ENABLED!=='true'||
     env.AJINE_AMOY_MINT_ENABLED!=='true'||
     env.AJINE_BETA_MINT_DELIVERY_READY!=='true')throw Error('BETA_MINT_LOCKED');
  if(String(registrationId)!=='6')throw Error('BETA_REGISTRATION_NOT_ALLOWED');
  if(mintInProgress)throw Error('BETA_MINT_ALREADY_IN_PROGRESS');
  mintInProgress=true;
  try{
    const e=await readCommercialPreprintRegistration('6');
    if(e.verified!==true||e.registrationVerified!==true||
       e.paymentRecordMatched!==true||e.ownershipVerified!==true||
       e.registrationId!=='6'||!e.albumId?.startsWith('ALBUM-BETA-')||
       !e.copyNumber?.startsWith('COPY-BETA-'))
      throw Error('BETA_REGISTRATION_NOT_VERIFIED');
    const registration=Object.freeze({
      registration_id:e.registrationId,album_id:e.albumId,
      album_copy_number:e.copyNumber,registered_owner_id:e.registeredOwnerId,
      purchase_transaction_id:e.purchaseTransactionId,
      registration_date:e.registrationDate
    });
    const purchase=Object.freeze({
      transactionId:e.purchaseTransactionId,albumId:e.albumId,
      orderNumber:e.orderNumber,pricePaidCents:e.pricePaidCents,currency:e.currency
    });
    // BETA-6 is the persisted Directus purchased-copy ID verified by the commercial readback.
    const ownership=Object.freeze({
      registrationId:e.registrationId,albumId:e.albumId,copyNumber:e.copyNumber,
      ownerId:e.registeredOwnerId,ownershipKey:'BETA-'+e.registrationId
    });
    const rules=Object.freeze({
      version:'ajine-nft-rules-board-v1',registrationId:e.registrationId,
      decision:'eligible',
      permissions:Object.freeze({burnForRewards:false,convertToCollectibles:false,exportToWallet:false})
    });
    const authorization=Object.freeze({
      registrationId:e.registrationId,albumId:e.albumId,copyNumber:e.copyNumber,
      registrationVerified:true,betaCoreOnly:true,
      rarityVerified:false,layerTwoRarityVerified:false
    });
    const result=await prepareInternalMintReturn({
      verifiedRegistration:{verified:true,record:registration},
      purchase,ownership,rules,metadataUri,authorization
    });
    // Never claim commercial delivery: this internal function currently only prepares the return.
    return Object.freeze({mintVerified:true,returnPrepared:true,stored:false,delivered:false,
      registrationId:e.registrationId,returnPackage:result.returnPackage});
  }finally{mintInProgress=false;}
}
