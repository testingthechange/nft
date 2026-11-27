// Beta metadata authority: one operator-configured HTTPS JSON URL per deployment.
// A request may never choose an arbitrary URL (SSRF protection). IPFS remains supported.
const ipfsCid=/^(bafy[a-z2-7]{20,}|Qm[1-9A-HJ-NP-Za-km-z]{44})(?:\/(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]+)?$/;
export function resolveBetaMetadataUrl(metadataUri,{env=process.env,gateway='https://ipfs.io'}={}){
  if(typeof metadataUri!=='string'||metadataUri.length>2048)throw Error('METADATA_URI_INVALID');
  if(metadataUri.startsWith('ipfs://')){
    if(!ipfsCid.test(metadataUri.slice(7)))throw Error('METADATA_IPFS_CID_REQUIRED');
    const url=new URL(gateway);
    if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||
      url.pathname!=='/'||!['ipfs.io','gateway.pinata.cloud','cloudflare-ipfs.com'].includes(url.hostname))
      throw Error('METADATA_GATEWAY_NOT_ALLOWED');
    return Object.freeze({url:url.origin+'/ipfs/'+metadataUri.slice(7),source:'ipfs-gateway-readback'});
  }
  // Never accept arbitrary caller-selected HTTPS URLs, localhost, or IP literals.
  const expected=env.AJINE_BETA_METADATA_HTTPS_URL;
  if(typeof expected!=='string'||!expected||(metadataUri!==expected&&!/^https:\/\/ajine-nft-api\.onrender\.com\/beta\/block-radius-copy\/[1-9][0-9]*\.json$/.test(metadataUri)))
    throw Error('METADATA_HTTPS_NOT_ALLOWLISTED');
  let url;
  try{url=new URL(metadataUri);}catch{throw Error('METADATA_HTTPS_URL_INVALID');}
  if(url.protocol!=='https:'||url.username||url.password||url.hash||url.search||
     url.port||!url.pathname.endsWith('.json')||
     !['thirdparty-tz9x.onrender.com','ajine-nft-api.onrender.com'].includes(url.hostname))
    throw Error('METADATA_HTTPS_URL_INVALID');
  return Object.freeze({url:url.href,source:'beta-https-readback'});
}
