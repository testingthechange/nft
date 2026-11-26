import test from 'node:test';
import assert from 'node:assert/strict';
import {assertFirstPrintAcceptance} from '../server/nftFirstPrintAcceptance.mjs';
import {inspectRegistrationNftReturn} from '../server/nftRegistrationReturnGate.mjs';

const id={registrationId:'6',albumId:'ALBUM-BETA-share_475784',copyNumber:'COPY-BETA-1'};
const metadataUri='https://ajine-nft-api.onrender.com/beta/block-radius-copy.json';
const oldUrl=process.env.AJINE_BETA_METADATA_HTTPS_URL;
process.env.AJINE_BETA_METADATA_HTTPS_URL=metadataUri;
const board={mode:'verified_projection',identity:id,groups:{albumRarity:{}}};
const authorization={...id,betaCoreOnly:true,registrationVerified:true,rarityVerified:false,layerTwoRarityVerified:false};
const verifiedEvidence={source:'trusted-server-readback',...id,registrationVerified:true,paymentVerified:true,ownershipVerified:true,
  rarityPersisted:false,layerTwoPersisted:false,metadataVerified:true,metadataUri,
  metadataRegistrationId:id.registrationId,metadataAlbumId:id.albumId,metadataCopyNumber:id.copyNumber};
const original={registration_id:id.registrationId,album_id:id.albumId,album_copy_number:id.copyNumber};
const returned={schemaVersion:'ajine.my-collection.nft-return.v1',destination:'thirdparty.registration.board.nftReturn',
  registrationId:id.registrationId,albumId:id.albumId,copyNumber:id.copyNumber,fixtureOnly:false,
  nft:{verificationStatus:'verified',ownershipConfirmed:true}};
const inspect=(extra={})=>inspectRegistrationNftReturn({original,returned,registrationAuthorized:true,polygonProofVerified:true,
  rarityVerified:false,layerTwoRarityVerified:false,betaCoreOnly:true,...extra});
test('core beta print needs genuine registration/payment/ownership and beta metadata',()=>{
  assert.equal(assertFirstPrintAcceptance({board,authorization,verifiedEvidence,metadataUri}),true);
  assert.throws(()=>assertFirstPrintAcceptance({board,authorization,verifiedEvidence:{...verifiedEvidence,paymentVerified:false},metadataUri}));
  assert.throws(()=>assertFirstPrintAcceptance({board,authorization,verifiedEvidence:{...verifiedEvidence,metadataVerified:false},metadataUri}));
  assert.throws(()=>assertFirstPrintAcceptance({board,authorization:{...authorization,registrationId:'7'},verifiedEvidence,metadataUri}));
});
test('rarity-less beta return only for exact registration six with Polygon proof',()=>{
  assert.equal(inspect().releaseAuthorized,true);
  assert.equal(inspect({polygonProofVerified:false}).releaseAuthorized,false);
  assert.equal(inspect({registrationAuthorized:false}).releaseAuthorized,false);
  assert.equal(inspect({betaCoreOnly:false}).releaseAuthorized,false);
  assert.equal(inspect({returned:{...returned,fixtureOnly:true}}).releaseAuthorized,false);
  assert.equal(inspect({original:{...original,registration_id:'7'}}).releaseAuthorized,false);
});
test('no arbitrary HTTPS metadata',()=>{
  assert.throws(()=>assertFirstPrintAcceptance({board,authorization,verifiedEvidence,metadataUri:'https://attacker.example/beta.json'}));
});
test.after(()=>{if(oldUrl===undefined)delete process.env.AJINE_BETA_METADATA_HTTPS_URL;else process.env.AJINE_BETA_METADATA_HTTPS_URL=oldUrl});
