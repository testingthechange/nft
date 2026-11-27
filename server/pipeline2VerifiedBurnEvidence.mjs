import {readCommercialPreprintRegistration} from './nftCommercialPreprintEvidence.mjs';
import {storeVerifiedNftForBurn} from './pipeline2NftRegistry.mjs';
// Internal staging only. Caller must be the authenticated commercial intake.
// Does not authorize execution or persist agreement acceptance.
export async function stageVerifiedBurnEvidence({authorization:a,env=process.env}={}){
 if(!a||a.option!=='discount'||a.agreementVersion!=='discount-v1'||!a.agreementId||!Number.isFinite(Date.parse(a.acceptedAt))||a.network!=='polygon-amoy')throw Error('AGREEMENT_EVIDENCE_INVALID');
 const e=await readCommercialPreprintRegistration(a.registrationId,{env});
 if(e.verified!==true||e.registrationVerified!==true||e.paymentRecordMatched!==true||e.ownershipVerified!==true||e.registrationId!==a.registrationId||e.albumId!==a.albumId||e.copyNumber!==a.copyNumber||e.registeredOwnerId!==a.userId)throw Error('BURN_REGISTRATION_MISMATCH');
 if(typeof a.contractAddress!=='string'||a.contractAddress.toLowerCase()!==String(env.AJINE_AMOY_NFT_CONTRACT).toLowerCase())throw Error('BURN_CONTRACT_MISMATCH');
 const n=await storeVerifiedNftForBurn({registrationId:a.registrationId,mintTransactionHash:a.mintTransactionHash,env,expectedTokenId:a.tokenId});
 if(n.stored!==true||n.registrationId!==a.registrationId||n.tokenId!==a.tokenId)throw Error('BURN_REGISTRY_MISMATCH');
 return Object.freeze({registrationId:a.registrationId,nftRegistryId:n.nftRegistryId,albumRegistrationId:n.albumRegistrationId,tokenId:n.tokenId,agreementId:a.agreementId,stored:true,burn_enabled:false});
}
