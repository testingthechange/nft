// Regression checks for Pipeline 1 and Pipeline 2 transport boundaries.
import assert from 'node:assert/strict';
import { validateConfirmedRegistrationJson } from '../server/confirmedRegistrationContract.mjs';
import { validatePipeline2Handshake, pipeline2ConnectionEnabled } from '../server/pipeline2Connection.mjs';
import { buildNftOptionBoard, selectNftUsage } from '../server/nftOptionBoard.mjs';

const registration = {
  schema_version: 1, event_type: 'album.registration.confirmed',
  registration_id: 'REG-TEST', album_id: 'ALBUM-TEST',
  album_copy_number: 'COPY-TEST', registered_owner_id: 'OWNER-TEST',
  purchase_transaction_id: 'TX-TEST', registration_date: '2026-11-21T00:00:00Z'
};
assert.equal(validateConfirmedRegistrationJson(registration).ok, true);
assert.equal(validateConfirmedRegistrationJson({...registration, admin_token:'leak'}).ok, false);
assert.equal(validateConfirmedRegistrationJson({...registration, registration_id:''}).ok, false);
const ping = {schema_version:1,event_type:'pipeline2.connection.ping',request_id:'TESTREQUEST001'};
const ack = validatePipeline2Handshake(ping);
assert.equal(ack.ok,true);
assert.equal(ack.stored,false);
assert.equal(ack.routed,false);
assert.equal(validatePipeline2Handshake({...ping, owner_id:'forbidden'}).ok,false);
assert.equal(validatePipeline2Handshake({...ping, event_type:'pipeline2.nft.burn'}).ok,false);
const nft = {nftId:'NFT-TEST',registrationId:'REG-TEST',albumId:'ALBUM-TEST',copyNumber:'COPY-TEST',ownerId:'OWNER-TEST',status:'active'};
assert.equal(buildNftOptionBoard({verified:false,nft}).ok,false);
const board=buildNftOptionBoard({verified:true,nft});
assert.deepEqual(board.options,['burn','export']);
const choice=selectNftUsage(board,'burn','discount');
assert.equal(choice.ok,true);
assert.equal(choice.dispatched,false);
assert.equal(choice.statusUpdated,false);
const priorToken=process.env.AJINE_PIPELINE2_CONNECTION_TOKEN;
const priorEnabled=process.env.AJINE_PIPELINE2_CONNECTION_ENABLED;
process.env.AJINE_PIPELINE2_CONNECTION_ENABLED='true';
process.env.AJINE_PIPELINE2_CONNECTION_TOKEN='short';
assert.equal(pipeline2ConnectionEnabled(),false);
if(priorToken===undefined)delete process.env.AJINE_PIPELINE2_CONNECTION_TOKEN;else process.env.AJINE_PIPELINE2_CONNECTION_TOKEN=priorToken;
if(priorEnabled===undefined)delete process.env.AJINE_PIPELINE2_CONNECTION_ENABLED;else process.env.AJINE_PIPELINE2_CONNECTION_ENABLED=priorEnabled;
console.log('Pipeline 1 / Pipeline 2 contract security checks passed (offline only).');
