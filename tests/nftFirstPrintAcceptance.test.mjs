import test from 'node:test';
import assert from 'node:assert/strict';
import {assertFirstPrintAcceptance as accept} from '../server/nftFirstPrintAcceptance.mjs';
const ready=(value)=>({value,status:'ready'});
const identity={registrationId:'1',albumId:'ALBUM-BETA-share_475784',copyNumber:'COPY-BETA-1'};
const metadataUri='ipfs://bafytestcase';
const board={mode:'verified_projection',identity,groups:{albumRarity:{
 character:ready('c1'),tier:ready('common'),editionNumber:ready('1'),
 editionLimit:ready('20000'),assignmentId:ready('rarity-1'),
 layerTwo:{status:'assigned',characterId:ready('c2'),tier:ready('common'),assignmentId:ready('layer2-1')}
}}};
const authorization={...identity,registrationVerified:true,rarityVerified:true,layerTwoRarityVerified:true};
const verifiedEvidence={source:'trusted-server-readback',...identity,registrationVerified:true,paymentVerified:true,ownershipVerified:true,
 rarityPersisted:true,layerTwoPersisted:true,rarityAssignmentId:'rarity-1',layerTwoAssignmentId:'layer2-1',
 metadataVerified:true,metadataUri,metadataRegistrationId:'1',metadataAlbumId:identity.albumId,metadataCopyNumber:identity.copyNumber};
test('rejects missing independent server evidence',()=>{
 assert.throws(()=>accept({board,authorization,metadataUri}),/EVIDENCE_REQUIRED/);
});
test('rejects absent Layer 2 rarity',()=>{
 assert.throws(()=>accept({board:{...board,groups:{albumRarity:{...board.groups.albumRarity,layerTwo:null}}},authorization,metadataUri,verifiedEvidence}),/LAYER_TWO_NOT_FINALIZED/);
});
test('rejects mismatched metadata',()=>{
 assert.throws(()=>accept({board,authorization,metadataUri,verifiedEvidence:{...verifiedEvidence,metadataCopyNumber:'COPY-BETA-2'}}),/METADATA_READBACK_REQUIRED/);
});
test('rejects wrong registration',()=>{
 assert.throws(()=>accept({board,authorization:{...authorization,copyNumber:'COPY-BETA-2'},metadataUri,verifiedEvidence}),/IDENTITY_MISMATCH/);
});
test('accepts consistent trusted evidence',()=>{
 assert.equal(accept({board,authorization,metadataUri,verifiedEvidence}),true);
});
