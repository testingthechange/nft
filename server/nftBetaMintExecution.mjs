import {assemblePipeline1OwnershipReturn} from './pipeline1ConsolidatedReturn.mjs';
// One-copy beta mint entry point. Restricted to verified Registration #6.
// Never trust caller-supplied payment, ownership, rarity or chain proof.
import {readCommercialPreprintRegistration} from './nftCommercialPreprintEvidence.mjs';
import {prepareInternalMintReturn} from './nftInternalMintReturn.mjs';
import {deliverVerifiedBetaReturn} from './nftBetaReturnDelivery.mjs';

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
    // Preserve the confirmed on-chain transaction even if commercial delivery fails.
    // This is NOT safe to retry by minting again; reconcile exact copy on Amoy.
    const proof=result.returnPackage.nft;
    let stored=false,deliveryStatus='not_confirmed';
    try{
      const delivered=await deliverVerifiedBetaReturn({
        originalRegistration:registration,returnPackage:result.returnPackage,env
      });
      stored=delivered.stored;
      deliveryStatus=stored?'stored':'not_confirmed';
    }catch(error){
      deliveryStatus='reconciliation_required';
      console.error('AJINE_BETA_MINT_RETURN_NOT_STORED',JSON.stringify({
        registrationId:'6',transactionHash:proof.transactionHash,
        reason:String(error?.message||'UNKNOWN').slice(0,100)
      }));
    }
    return Object.freeze({mintVerified:true,returnPrepared:true,stored,
      delivered:stored,deliveryStatus,reconciliationRequired:!stored,
      registrationId:e.registrationId,chainId:80002,
      contractAddress:proof.contractAddress,tokenId:proof.tokenId,
      transactionHash:proof.transactionHash,verifiedWallet:proof.verifiedWallet});
  }finally{mintInProgress=false;}
}

 // Recovery is restricted to the already confirmed first copy. No mint call.
export async function recoverFirstBetaReturn({env=process.env}={}){
 if(env.AJINE_BETA_MINT_ENDPOINT_ENABLED!=='false')throw Error('MINT_MUST_BE_LOCKED');
 const e=await readCommercialPreprintRegistration('6');
 if(e.verified!==true||e.registrationVerified!==true||e.paymentRecordMatched!==true||e.ownershipVerified!==true||e.registrationId!=='6'||e.albumId!=='ALBUM-BETA-share_475784'||e.copyNumber!=='COPY-BETA-6')throw Error('RECOVERY_IDENTITY_MISMATCH');
 const registration={registration_id:e.registrationId,album_id:e.albumId,album_copy_number:e.copyNumber,registered_owner_id:e.registeredOwnerId,purchase_transaction_id:e.purchaseTransactionId,registration_date:e.registrationDate};
 const purchase={transactionId:e.purchaseTransactionId,albumId:e.albumId,orderNumber:e.orderNumber,pricePaidCents:e.pricePaidCents,currency:e.currency};
 const ownership={registrationId:e.registrationId,albumId:e.albumId,copyNumber:e.copyNumber,ownerId:e.registeredOwnerId,ownershipKey:'BETA-6'};
 const polygon={verified:true,chainId:80002,contractAddress:'0x8EC4B43BFC77a51aeE9B6A0E2C7203755515c1C9',tokenId:'1',transactionHash:'0x5695f47daacca1d6b4f42df85355485ee90654cf5ec0cac3680c83ba3932c38b',verifiedWallet:'0xA55bD5F6621B8cbe77C9FE62744a3d8779D23A39'};
 // Registration independently verifies this fixed proof against Amoy before any write.
 const returnPackage=assemblePipeline1OwnershipReturn({registration,purchase,ownership,polygon,synthetic:false,registrationAuthorized:true,polygonProofVerified:true,betaCoreOnly:true,rarityVerified:false,layerTwoRarityVerified:false});
 const result=await deliverVerifiedBetaReturn({originalRegistration:registration,returnPackage,env});
 return {stored:result.stored,idempotent:result.idempotent,tokenId:polygon.tokenId,transactionHash:polygon.transactionHash,minted:false};
}
