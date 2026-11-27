// Read-only first-mint readiness report. Never signs, mints, or writes ownership.
import {buildFirstBetaMetadata} from './nftBetaMetadataEndpoint.mjs';
import {readVerifiedBetaMetadata} from './nftBetaMetadataReadback.mjs';
import {resolveBetaMetadataUrl} from './nftBetaMetadataUri.mjs';

export async function checkBlockRadiusPreMint({
  env=process.env,
  registrationId='6',
  buildMetadata=buildFirstBetaMetadata,
  verifyMetadata=readVerifiedBetaMetadata
}={}) {
  const expected='https://ajine-nft-api.onrender.com/beta/block-radius-copy'+(registrationId==='6'?'':'/'+registrationId)+'.json';
  const checks={
    mintEndpointLocked:env.AJINE_BETA_MINT_ENDPOINT_ENABLED!=='true'||
      env.AJINE_AMOY_MINT_ENABLED!=='true'||env.AJINE_BETA_MINT_DELIVERY_READY!=='true',
    operatorTokenConfigured:typeof env.AJINE_BETA_MINT_OPERATOR_TOKEN==='string'&&env.AJINE_BETA_MINT_OPERATOR_TOKEN.length>=32,
    commercialReturnTokenConfigured:typeof env.AJINE_PIPELINE1_RETURN_TOKEN==='string'&&env.AJINE_PIPELINE1_RETURN_TOKEN.length>=32,
    amoyConnectionConfigured:!!env.POLYGON_AMOY_RPC_URL&&!!env.AJINE_AMOY_MINT_PRIVATE_KEY&&
      !!env.AJINE_AMOY_NFT_CONTRACT&&!!env.AJINE_AMOY_CUSTODY_ADDRESS,
    metadataUrlConfigured:registrationId!=='6'||env.AJINE_BETA_METADATA_HTTPS_URL===expected,
    registrationAndManifestVerified:false,
    metadataReadbackVerified:false
  };
  let blockReason=null,identity=null;
  try {
    resolveBetaMetadataUrl(expected,{env});
    const metadata=await buildMetadata({env,registrationId});
    if(metadata?.registrationId!==registrationId||
      metadata?.albumId!=='ALBUM-BETA-share_475784'||
      !/^COPY-BETA-[1-9][0-9]*$/.test(metadata?.copyNumber??'')||
      typeof metadata.image!=='string'||!metadata.image.startsWith('https://')||
      typeof metadata.albumTitle!=='string'||!metadata.albumTitle.trim()||
      typeof metadata.artist!=='string'||!metadata.artist.trim()||
      metadata.name!==metadata.albumTitle+' — Beta Album Copy')
      throw Error('BETA_METADATA_IDENTITY_INVALID');
    checks.registrationAndManifestVerified=true;
    identity={registrationId,albumId:metadata.albumId,copyNumber:metadata.copyNumber};
    const verified=await verifyMetadata({metadataUri:expected,identity});
    checks.metadataReadbackVerified=verified?.verified===true;
    if(!checks.metadataReadbackVerified)blockReason='METADATA_READBACK_UNVERIFIED';
  }catch(error){
    // No URLs, tokens, PII or raw upstream errors in the response.
    const msg=String(error?.message||'UNKNOWN');
    const allowed=['METADATA_HTTPS_NOT_ALLOWLISTED','BETA_MANIFEST_READ_TOKEN_REQUIRED',
      'BETA_REGISTRATION_NOT_VERIFIED','BETA_PUBLISHED_MANIFEST_NOT_FOUND',
      'BETA_MANIFEST_ALBUM_TITLE_MISMATCH','BETA_MANIFEST_ARTIST_MISSING','BETA_MANIFEST_COVER_MISSING',
      'BETA_MANIFEST_COVER_URL_INVALID','BETA_METADATA_IDENTITY_INVALID',
      'METADATA_COPY_IDENTITY_MISMATCH'];
    blockReason=allowed.includes(msg)?msg:'METADATA_OR_UPSTREAM_READ_UNAVAILABLE';
  }
  // This service cannot inspect commercial Stripe/Directus feature flags.
  // Never present this as all-systems-go for an irreversible transaction.
  const localReady=checks.operatorTokenConfigured&&checks.commercialReturnTokenConfigured&&
    checks.amoyConnectionConfigured&&checks.metadataUrlConfigured&&
    checks.registrationAndManifestVerified&&checks.metadataReadbackVerified;
  return Object.freeze({registrationId,network:'polygon-amoy',readOnly:true,
    localReady,mintAuthorized:false,
    commercialWriteVerified:false,
    checks,blockReason});
}
