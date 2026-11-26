// Strict, read-only verification of the pinned NFT metadata before any mint.
// This function does NOT pin or invent IPFS content, authorize payment, or mint.
const cidPattern=/^(bafy[a-z2-7]{20,}|Qm[1-9A-HJ-NP-Za-km-z]{44})(?:\/(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]+)?$/;
const fields=['registrationId','albumId','copyNumber'];
export async function readVerifiedBetaMetadata({metadataUri,identity,fetcher=fetch,gateway='https://ipfs.io'}={}){
 if(typeof metadataUri!=='string'||!metadataUri.startsWith('ipfs://')||
   !cidPattern.test(metadataUri.slice(7)))throw Error('METADATA_IPFS_CID_REQUIRED');
 if(!identity||fields.some(k=>typeof identity[k]!=='string'||!identity[k].trim()))
   throw Error('METADATA_IDENTITY_REQUIRED');
 const url=new URL(gateway);
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||
   url.pathname!=='/'||!['ipfs.io','gateway.pinata.cloud','cloudflare-ipfs.com'].includes(url.hostname))
   throw Error('METADATA_GATEWAY_NOT_ALLOWED');
 const response=await fetcher(url.origin+'/ipfs/'+metadataUri.slice(7),{
   method:'GET',headers:{Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(10000)
 });
 if(!response.ok)throw Error('METADATA_IPFS_UNAVAILABLE');
 const length=Number(response.headers?.get?.('content-length')??0);
 if(length>65536)throw Error('METADATA_TOO_LARGE');
 const raw=await response.text();
 if(raw.length>65536)throw Error('METADATA_TOO_LARGE');
 let metadata;
 try{metadata=JSON.parse(raw);}catch{throw Error('METADATA_INVALID_JSON');}
 if(!metadata||typeof metadata!=='object'||Array.isArray(metadata))
   throw Error('METADATA_INVALID_JSON');
 if(fields.some(k=>metadata[k]!==identity[k]))throw Error('METADATA_COPY_IDENTITY_MISMATCH');
 if(typeof metadata.name!=='string'||!metadata.name.trim()||
    typeof metadata.description!=='string'||!metadata.description.trim())
   throw Error('METADATA_REQUIRED_FIELDS_MISSING');
 // No buyer ID, email, Stripe transaction or wallet secret may be pinned.
 if(['ownerId','registeredOwnerId','email','userEmail','paymentTransactionId','privateKey','stripeSessionId']
   .some(k=>Object.hasOwn(metadata,k)))throw Error('METADATA_PRIVATE_FIELD_FORBIDDEN');
 return Object.freeze({verified:true,source:'ipfs-gateway-readback',metadataUri,
   registrationId:identity.registrationId,albumId:identity.albumId,copyNumber:identity.copyNumber});
}
