import assert from 'node:assert/strict';
import { prepareBetaDeploymentManifest } from '../scripts/prepare-amoy-beta-deployment.mjs';
const owner='0x000000000000000000000000000000000000dEaD';
await assert.rejects(()=>prepareBetaDeploymentManifest({ownerAddress:'bad'}),/valid_owner/);
await assert.rejects(()=>prepareBetaDeploymentManifest({ownerAddress:'0x0000000000000000000000000000000000000000'}),/zero_owner/);
console.log('PASS: invalid owner rejected before network or deployment');
