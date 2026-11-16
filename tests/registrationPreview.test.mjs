import test from 'node:test';
import assert from 'node:assert/strict';
import { previewRegistration } from '../server/registrationPreview.mjs';

const valid = {
  schema_version: 1,
  event_type: 'album.registration.preview',
  payment_status: 'test_only',
  registration_id: 'REG-TEST-001',
  album_id: 'ALBUM-TEST',
  album_copy_number: '001',
  registered_owner_id: 'OWNER-TEST',
  purchase_transaction_id: 'ORDER-TEST',
  registration_date: '2026-11-16T19:00:00.000Z'
};

test('valid test data is accepted but never persisted', () => {
  const result = previewRegistration(valid);
  assert.equal(result.ok, true);
  assert.equal(result.stored, false);
  assert.equal(result.payment_verified, false);
  assert.equal(result.destination, 'Abum_Registration');
});

test('rejects any claimed production payment', () => {
  assert.equal(previewRegistration({...valid,payment_status:'succeeded'}).ok,false);
});

test('rejects missing identity fields', () => {
  assert.deepEqual(previewRegistration({...valid,album_copy_number:''}).error,'invalid_field');
});

test('rejects unrecognized event version', () => {
  assert.equal(previewRegistration({...valid,schema_version:2}).ok,false);
});

test('rejects invalid JSON shapes', () => {
  assert.equal(previewRegistration(null).ok,false);
  assert.equal(previewRegistration([]).ok,false);
});
