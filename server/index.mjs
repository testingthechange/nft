import { timingSafeEqual } from 'node:crypto';
import { assemblePipeline1OwnershipReturn } from './pipeline1ConsolidatedReturn.mjs';
import { pingPipeline2RegistrationDirectus } from './pipeline2RegistrationDirectusPing.mjs';
import { pipeline2ConnectionEnabled, validatePipeline2Handshake } from './pipeline2Connection.mjs';
import { inspectCharacterLibrary } from './inspectCharacterLibrary.mjs';
import { inspectLayerTwoLiveConnection } from './inspectLayerTwoLiveConnection.mjs';
import { inspectCommercialDirectusConnection } from './commercialDirectusConnection.mjs';
import { inspectCommercialRegistrationEvidence } from './commercialRegistrationEvidence.mjs';
import { readCommercialPreprintRegistration } from './nftCommercialPreprintEvidence.mjs';
import { previewRegistration } from './registrationPreview.mjs';
import { MOCK_JSON_PATH, inspectMockJson } from './mockRegistrationJson.mjs';
import { buildNftGatheringBoard } from './nftGatheringBoard.mjs';
import { validateConfirmedRegistrationJson } from './confirmedRegistrationContract.mjs';
import { BETA_SIGNAL_PATH, betaSignalCors, validateBetaSignal, completeBetaRegistrationPreview } from './betaRegistrationSignal.mjs';
import { createServer } from 'node:http';
import { readPolygonAmoyStatus } from './polygonAmoy.mjs';
import { pingMyCollectionReturn } from './nftMyCollectionSlotPing.mjs';
import { pingNftPipeline } from '../scripts/ping-nft-pipeline.mjs';

// Dedicated private-token API service. The public Vite website remains a Render Static Site.
const PORT = Number(process.env.PORT || 3000);
const DIRECTUS_URL = 'https://directus-on-nft.onrender.com';
const TOKEN = process.env.AJINE_DIRECTUS_TOKEN;
const PREVIEW_ENABLED = process.env.AJINE_REGISTRATION_PREVIEW_ENABLED === 'true';
const PREVIEW_TOKEN = process.env.AJINE_REGISTRATION_PREVIEW_TOKEN;
const BETA_SIGNAL_ENABLED = process.env.AJINE_BETA_REGISTRATION_SIGNAL_ENABLED === 'true';
const MOCK_JSON_ENABLED = process.env.AJINE_REGISTRATION_MOCK_JSON_ENABLED === 'true';
// Transport-only verified contract inspection; no customer data is persisted.
const INTAKE_INSPECT_ENABLED = process.env.AJINE_REGISTRATION_INTAKE_INSPECT_ENABLED === 'true';

function json(res, code, payload) {
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(JSON.stringify(payload));
}

async function checkDirectus() {
  if (!TOKEN) return { connected: false, reason: 'not_configured' };
  try {
    const response = await fetch(DIRECTUS_URL + '/users/me?fields=id', {
      headers: { Authorization: 'Bearer ' + TOKEN },
      signal: AbortSignal.timeout(7000),
    });
    return response.ok ? { connected: true } : { connected: false, reason: 'unavailable' };
  } catch {
    return { connected: false, reason: 'unavailable' };
  }
}

function authorized(req) {
  if (!PREVIEW_TOKEN || PREVIEW_TOKEN.length < 32) return false;
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return false;
  const supplied = Buffer.from(header.slice(7));
  const expected = Buffer.from(PREVIEW_TOKEN);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
async function readJson(req) {
  if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) {
    const e = Error('unsupported_media_type'); e.http = 415; throw e;
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 16384) { const e = Error('payload_too_large'); e.http = 413; throw e; }
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { const e = Error('invalid_json'); e.http = 400; throw e; }
}
createServer(async (req, res) => {
  // Minimal intake trace: no headers, body, tokens, or customer identifiers.
  const isRegistrationInspect = req.method === 'POST' &&
    new URL(req.url, 'http://localhost').pathname === '/api/integrations/registration/inspect';
  if (isRegistrationInspect) {
    console.info('AJINE_NFT_INTAKE_REQUEST', JSON.stringify({route:'registration.inspect',stage:'received'}));
    const originalWriteHead = res.writeHead.bind(res);
    res.writeHead = function(statusCode, ...args) {
      console.info('AJINE_NFT_INTAKE_REQUEST', JSON.stringify({route:'registration.inspect',stage:'response',httpStatus:statusCode}));
      return originalWriteHead(statusCode, ...args);
    };
  }
  try {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (path === '/api/nft/preprint/registration-check') {
      // Read-only, private check. Returns booleans only; does not return owner or payment details.
      if (req.method !== 'POST') { json(res,405,{error:'method_not_allowed'}); return; }
      if (process.env.AJINE_NFT_PREPRINT_REGISTRATION_CHECK_ENABLED !== 'true') {
        json(res,503,{passed:false,error:'preprint_registration_check_disabled',minted:false}); return;
      }
      if (!authorized(req)) { json(res,401,{error:'unauthorized'}); return; }
      let body;
      try { body=await readJson(req); }
      catch(error){ json(res,error.http||400,{error:error.message}); return; }
      try {
        const evidence=await readCommercialPreprintRegistration(body?.registrationId);
        const valid=evidence.registrationVerified===true&&
          evidence.paymentRecordMatched===true&&evidence.ownershipVerified===true;
        json(res,valid?200:422,{passed:valid,
          registrationId:evidence.registrationId,
          checks:{registration:valid,paymentRecord:valid,exactOwnershipCopy:valid},
          rarityVerified:false,metadataVerified:false,mintAuthorized:false,minted:false});
      }catch(error){
        const messages={
          INVALID_PREPRINT_REGISTRATION_ID:'invalid_registration_id',
          PREPRINT_EVIDENCE_TOKEN_UNAVAILABLE:'registration_service_token_missing',
          PREPRINT_REGISTRATION_READBACK_FAILED:'registration_readback_unavailable',
          PREPRINT_REGISTRATION_EVIDENCE_INVALID:'registration_evidence_mismatch'
        };
        json(res,422,{passed:false,error:messages[error?.message]||'registration_evidence_unavailable',
          mintAuthorized:false,minted:false});
      }
      return;
    }
    if (path === '/api/nft/polygon/mint-preflight') {
      if (req.method !== 'POST') { json(res,405,{error:'method_not_allowed'}); return; }
      if (!authorized(req)) { json(res,401,{error:'unauthorized'}); return; }
      const {JsonRpcProvider,Wallet,Contract,getAddress,ZeroAddress}=await import('ethers');
      const env=process.env;
      const checks={rpc:!!env.POLYGON_AMOY_RPC_URL,signer:!!env.AJINE_AMOY_MINT_PRIVATE_KEY,contract:!!env.AJINE_AMOY_NFT_CONTRACT,custody:!!env.AJINE_AMOY_CUSTODY_ADDRESS,
        chain:false,contractDeployed:false,signerOwnsContract:false,signerFunded:false,signerMatchesCustody:false};
      // Safe Render-value diagnostics: shape only; never return secret contents or fragments.
      const describe=(value,kind)=>{
        const v=typeof value==='string'?value:'';
        const expected=kind==='privateKey'?66:42;
        const hex=/^[0-9a-fA-F]$/;
        const prefix=v.slice(0,2)==='0x';
        // Reveal only character categories and counts, never actual secret characters.
        const invalidPositions=[...v].reduce((n,c,i)=>n+(i<2 ? (i===0?c!=='0':c!=='x') : !hex.test(c)?1:0),0);
        return {
          present:v.length>0,length:v.length,expectedLength:expected,
          leadingOrTrailingWhitespace:v!==v.trim(),
          whitespaceAnywhere:/\\s/.test(v),
          leadingWhitespace:v.length>0 && v[0].trim()==='',
          trailingWhitespace:v.length>0 && v[v.length-1].trim()==='',
          quoteWrapped:/^['"]|['"]$/.test(v),
          hasHexPrefix:prefix,
          invalidCharacterCount:invalidPositions,
          validHexShape:kind==='privateKey'?/^0x[0-9a-fA-F]{64}$/.test(v):/^0x[0-9a-fA-F]{40}$/.test(v)
        };
      };
      const environmentFormat={
        mintPrivateKey:describe(env.AJINE_AMOY_MINT_PRIVATE_KEY,'privateKey'),
        custodyAddress:describe(env.AJINE_AMOY_CUSTODY_ADDRESS,'address'),
        contractAddress:describe(env.AJINE_AMOY_NFT_CONTRACT,'address')
      };
      const failures={};
      const probe=async(name,fn)=>{
        try{checks[name]=await fn()===true;if(!checks[name])failures[name]='CHECK_FALSE';}
        catch(error){
          checks[name]=false;
          // Only return safe error category; do not expose RPC URLs, addresses, or credentials.
          const allowed=['TIMEOUT','SERVER_ERROR','NETWORK_ERROR','INVALID_ARGUMENT','CALL_EXCEPTION','BAD_DATA','UNKNOWN_ERROR'];
          failures[name]=allowed.includes(error?.code)?error.code:'RPC_OR_VALIDATION_ERROR';
        }
      };
      let provider;
      try{
        if(checks.rpc){
          provider=new JsonRpcProvider(env.POLYGON_AMOY_RPC_URL,{name:'polygon-amoy',chainId:80002},{staticNetwork:true});
          await probe('chain',async()=>BigInt(await provider.send('eth_chainId',[]))===80002n);
          if(checks.chain){
            let signer=null,contractAddress=null,custodyAddress=null;
            if(checks.signer){try{signer=new Wallet(env.AJINE_AMOY_MINT_PRIVATE_KEY,provider);}catch{failures.signer='INVALID_SIGNER_KEY';}}
            if(checks.contract){try{contractAddress=getAddress(env.AJINE_AMOY_NFT_CONTRACT);}catch{failures.contract='INVALID_CONTRACT_ADDRESS';}}
            if(checks.custody){try{custodyAddress=getAddress(env.AJINE_AMOY_CUSTODY_ADDRESS);}catch{failures.custody='INVALID_CUSTODY_ADDRESS';}}
            if(signer&&custodyAddress)await probe('signerMatchesCustody',async()=>signer.address===custodyAddress && custodyAddress!==ZeroAddress);
            if(signer)await probe('signerFunded',async()=>(await provider.getBalance(signer.address))>0n);
            if(contractAddress){
              await probe('contractDeployed',async()=>contractAddress!==ZeroAddress&&(await provider.getCode(contractAddress))!=='0x');
              if(checks.contractDeployed&&signer){
                await probe('signerOwnsContract',async()=>{
                  const contract=new Contract(contractAddress,['function owner() view returns (address)'],provider);
                  return getAddress(await contract.owner())===signer.address;
                });
              }else failures.signerOwnsContract='DEPENDENCY_NOT_READY';
            }
          }
        }
      }finally{provider?.destroy();}
      const passed=Object.values(checks).every(Boolean);
      json(res,passed?200:503,{passed,checks,failures,environmentFormat,mintEnabled:env.AJINE_AMOY_MINT_ENABLED==='true',minted:false,stored:false});
      return;
    }
    if (path === '/api/pipeline2/directus/ping') {
      if (req.method !== 'POST') { json(res,405,{error:'method_not_allowed'}); return; }
      if (!pipeline2ConnectionEnabled()) { json(res,503,{error:'connection_disabled'}); return; }
      const expected = Buffer.from(process.env.AJINE_PIPELINE2_CONNECTION_TOKEN);
      const header = req.headers.authorization || '';
      const supplied = Buffer.from(header.startsWith('Bearer ') ? header.slice(7) : '');
      if (supplied.length !== expected.length || !timingSafeEqual(supplied,expected)) {
        json(res,401,{error:'unauthorized'}); return;
      }
      const result = await pingPipeline2RegistrationDirectus({token:TOKEN,baseUrl:DIRECTUS_URL});
      json(res,result.ok?200:503,result);
      return;
    }
    if (path === '/api/pipeline2/connection/ping') {
      if (req.method !== 'POST') { json(res, 405, { error: 'method_not_allowed' }); return; }
      if (!pipeline2ConnectionEnabled()) { json(res, 503, { error: 'connection_disabled' }); return; }
      const expected = Buffer.from(process.env.AJINE_PIPELINE2_CONNECTION_TOKEN);
      const header = req.headers.authorization || '';
      const supplied = Buffer.from(header.startsWith('Bearer ') ? header.slice(7) : '');
      if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
        json(res, 401, { error: 'unauthorized' }); return;
      }
      let body;
      try { body = await readJson(req); }
      catch (error) { json(res, error.http || 400, { error: error.message }); return; }
      const result = validatePipeline2Handshake(body);
      json(res, result.ok ? 200 : 422, result);
      return;
    }
    if (path === MOCK_JSON_PATH) {
      if (!MOCK_JSON_ENABLED) { json(res, 503, {error:'mock_json_disabled'}); return; }
      const origin = betaSignalCors(req.headers.origin);
      if (!origin) { json(res, 403, {error:'origin_not_allowed'}); return; }
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary','Origin');
      if (req.method === 'OPTIONS') {
        res.writeHead(204, {'Access-Control-Allow-Methods':'POST, OPTIONS',
          'Access-Control-Allow-Headers':'Content-Type',
          'Cache-Control':'no-store'}); res.end(); return;
      }
      if (req.method !== 'POST') { json(res, 405, {error:'method_not_allowed'}); return; }
      let body;
      try { body = await readJson(req); }
      catch(error) { json(res, error.http || 400, {error:error.message}); return; }
      const result = inspectMockJson(body, previewRegistration);
      if (!result.ok) { json(res, 422, result); return; }
      // Only after exact mock fixture validation: project the six synthetic
      // fields onto the read-only board. No state, database, or NFT mutations.
      const board = buildNftGatheringBoard({
        mockRegistration: { accepted: true, record: body },
      });
      json(res, 200, {
        ...result,
        gathering_board: {
          version: board.version,
          mode: board.mode,
          registration_slots: Object.fromEntries(
            Object.entries(board.groups.registration).map(([name, field]) =>
              [name, { value: field.value, status: field.status }])
          ),
          stored: false,
          minted: false,
        },
      });
      return;
    }
    if (path === BETA_SIGNAL_PATH) {
      // Browser metadata ONLY. No customer IDs, token or payment data ever accepted.
      if (!BETA_SIGNAL_ENABLED) { json(res, 503, {error:'beta_signal_disabled'}); return; }
      const origin = betaSignalCors(req.headers.origin);
      if (!origin) { json(res, 403, {error:'origin_not_allowed'}); return; }
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      if (req.method === 'OPTIONS') {
        res.writeHead(204, { 'Access-Control-Allow-Methods':'POST, OPTIONS',
          'Access-Control-Allow-Headers':'Content-Type',
          'Access-Control-Max-Age':'300','Cache-Control':'no-store' });
        res.end();
        return;
      }
      if (req.method !== 'POST') { json(res, 405, {error:'method_not_allowed'}); return; }
      let body;
      try { body = await readJson(req); }
      catch (error) { json(res, error.http || 400, {error:error.message}); return; }
      if (!validateBetaSignal(body)) { json(res, 422, {error:'beta_signal_invalid'}); return; }
      // Execute the existing six-field validation in-process with synthetic BETA data only.
      // No outbound HTTP, customer data, private-token exposure, or database writes.
      const result = completeBetaRegistrationPreview(body, previewRegistration);
      json(res, result.ok ? 200 : 422, result);
      return;
    }
    if (path === '/api/integrations/registration/evidence/connectivity') {
      if (req.method !== 'POST') { json(res,405,{error:'method_not_allowed'}); return; }
      if (process.env.AJINE_COMMERCIAL_REGISTRATION_EVIDENCE_ENABLED !== 'true') {
        json(res,503,{error:'commercial_evidence_disabled'}); return;
      }
      if (!authorized(req)) { json(res,401,{error:'unauthorized'}); return; }
      const result=await inspectCommercialDirectusConnection();
      json(res,result.connected?200:503,{test:'commercial-directus-connection',
        ...result,releaseAuthorized:false,stored:false});
      return;
    }
    if (path === '/api/integrations/registration/evidence/inspect') {
      // Private server-to-server evidence inspection; no customer data echoed.
      if (req.method !== 'POST') { json(res, 405, {error:'method_not_allowed'}); return; }
      if (process.env.AJINE_COMMERCIAL_REGISTRATION_EVIDENCE_ENABLED !== 'true') {
        json(res, 503, {error:'commercial_evidence_disabled'}); return;
      }
      if (!authorized(req)) { json(res, 401, {error:'unauthorized'}); return; }
      let body;
      try { body = await readJson(req); }
      catch(error) { json(res, error.http || 400, {error:error.message}); return; }
      const result = await inspectCommercialRegistrationEvidence({
        registrationId:body?.registrationId,albumId:body?.albumId,copyNumber:body?.copyNumber
      });
      json(res, result.matched ? 200 : 422, {
        matched:result.matched,status:result.status,reason:result.reason,
        registrationAuthorized:false,polygonProofVerified:false,
        releaseAuthorized:false,delivered:false,stored:false
      });
      return;
    }
    if (path === '/api/integrations/registration/pipeline1/return-test') {
      // Server-to-server Pipeline 1 round-trip. No release or persistence.
      if (req.method !== 'POST') { json(res,405,{error:'method_not_allowed'}); return; }
      if (process.env.AJINE_PIPELINE1_RETURN_ENABLED !== 'true') {
        json(res,503,{error:'pipeline1_return_disabled'}); return;
      }
      if (!authorized(req)) { json(res,401,{error:'unauthorized'}); return; }
      const token = process.env.AJINE_PIPELINE1_RETURN_TOKEN;
      if (!token || token.length < 32) {
        json(res,503,{error:'return_token_not_configured'}); return;
      }
      let body;
      try { body = await readJson(req); }
      catch(error) { json(res,error.http || 400,{error:error.message}); return; }
      try {
        // Inputs are untrusted; assembler enforces identity consistency.
        // Always hold: no live payment or Polygon proof is established here.
        const {registration,purchase,ownership} = body || {};
        const returnPackage = assemblePipeline1OwnershipReturn({
          registration,purchase,ownership,synthetic:true,
          registrationAuthorized:false,polygonProofVerified:false
        });
        const response = await fetch(
          'https://stripe-beta.onrender.com/api/registration/pipeline1/return', {
            method:'POST',
            headers:{'Content-Type':'application/json',Authorization:'Bearer ' + token},
            body:JSON.stringify({originalRegistration:registration,returnPackage}),
            signal:AbortSignal.timeout(10000)
          });
        const receipt = await response.json().catch(()=>null);
        if (!response.ok || receipt?.received !== true ||
            receipt?.registrationMatched !== true || receipt?.stored !== false ||
            receipt?.delivered !== false) {
          json(res,502,{ok:false,error:'registration_return_not_confirmed',
            upstreamStatus:response.status,stored:false,delivered:false});
          return;
        }
        json(res,200,{ok:true,roundTripConfirmed:true,registrationMatched:true,
          copyNumber:receipt.copyNumber,status:'hold',
          stored:false,delivered:false});
      } catch(error) {
        json(res,422,{ok:false,error:error?.message || 'invalid_pipeline1_package',
          stored:false,delivered:false});
      }
      return;
    }
    if (path === '/api/integrations/registration/inspect') {
      // Private backend-to-backend JSON validation only. Off by default.
      // Never writes registration records, validates payments, or mints.
      if (req.method !== 'POST') { json(res, 405, {error:'method_not_allowed'}); return; }
      if (!INTAKE_INSPECT_ENABLED) { json(res, 503, {error:'intake_inspection_disabled'}); return; }
      if (!authorized(req)) { json(res, 401, {error:'unauthorized'}); return; }
      let body;
      try { body = await readJson(req); }
      catch (error) { json(res, error.http || 400, {error:error.message}); return; }
      const result = validateConfirmedRegistrationJson(body);
      // Pipeline 1 landing proof: project the validated registration contract
      // into the existing Gathering Board without persisting or echoing PII.
      const board = result.ok ? buildNftGatheringBoard({
        verifiedRegistration:{verified:true,record:result.record}
      }) : null;
      const landing = board ? Object.fromEntries(
        Object.entries(board.groups.registration).map(([field, entry]) =>
          [field, {status:entry.status, destination:entry.destination}])
      ) : null;
      const allLanded = board && Object.values(landing).every(entry => entry.status === "ready");
      json(res, result.ok ? 200 : 422, result.ok
        ? {ok:true, schema_version:1, validated:true,
          pipeline:"pipeline_1", gathering_board_version:board.version,
          gathering_board_mode:board.mode,
          registration_slots:landing, all_six_slots_landed:allLanded,
          stored:false, payment_verified:false, minted:false,
          ownership_delivery:false}
        : {ok:false, error:result.error, field:result.field});
      return;
    }
    if (path === '/api/integrations/registration/preview') {
      if (req.method !== 'POST') {
        res.writeHead(405, { Allow: 'POST' }); res.end(); return;
      }
      if (!PREVIEW_ENABLED || !PREVIEW_TOKEN || PREVIEW_TOKEN.length < 32) {
        json(res, 503, { error:'preview_disabled' }); return;
      }
      if (!authorized(req)) { json(res, 401, { error:'unauthorized' }); return; }
      let body;
      try { body = await readJson(req); }
      catch (error) { json(res, error.http || 400, { error:error.message }); return; }
      const result = previewRegistration(body);
      json(res, result.ok ? 200 : 422, result);
      return;
    }
    if (req.method !== 'GET') {
      res.writeHead(405, { Allow: 'GET' });
      res.end();
      return;
    }
    if (path === '/healthz') {
      json(res, 200, { status: 'ok' });
      return;
    }
    if (path === '/api/nft/polygon/landing-test') {
      // Isolated synthetic mapping test. No RPC proof, mint, storage or release.
      const record = {registration_id:'PING-REG-001',album_id:'ALBUM-BETA-PING',album_copy_number:'COPY-BETA-PING'};
      const fixture = {verified:true,chainId:80002,registrationId:record.registration_id,
        albumId:record.album_id,copyNumber:record.album_copy_number,
        contractAddress:'0x'+'1'.repeat(40),verifiedWallet:'0x'+'2'.repeat(40),
        transactionHash:'0x'+'3'.repeat(64),tokenId:'1'};
      const registration = {verified:true,record};
      const board = buildNftGatheringBoard({verifiedRegistration:registration,verifiedPolygon:fixture});
      const expected = {network:'polygon-amoy',contractAddress:fixture.contractAddress,
        tokenId:fixture.tokenId,mintTransactionHash:fixture.transactionHash,verifiedWallet:fixture.verifiedWallet};
      const slots = Object.fromEntries(Object.entries(expected).map(([key,value])=>[key,
        board.groups.polygon[key].status==='ready' && board.groups.polygon[key].value===value]));
      const rejects = patch => {try {buildNftGatheringBoard({verifiedRegistration:registration,
        verifiedPolygon:{...fixture,...patch}});return false;} catch {return true;}};
      const guards = {wrongChain:rejects({chainId:137}),wrongCopy:rejects({copyNumber:'OTHER'}),
        wrongAlbum:rejects({albumId:'OTHER'}),wrongRegistration:rejects({registrationId:'OTHER'}),
        unverified:rejects({verified:false}),invalidHash:rejects({transactionHash:'invalid'})};
      const passed = [...Object.values(slots),...Object.values(guards)].every(Boolean);
      json(res,passed?200:503,{passed,fixtureOnly:true,slots,guards,polygonProofVerified:false,
        minted:false,stored:false,delivered:false});
      return;
    }
    if (path === '/api/nft/registration/landing-test') {
      // Synthetic board-to-registration mapping only; never authorize release.
      const registration={registration_id:'PING-REG-001',album_id:'ALBUM-BETA-PING',
        album_copy_number:'COPY-BETA-PING',registered_owner_id:'FIXTURE-OWNER',
        purchase_transaction_id:'FIXTURE-TX',registration_date:'2026-01-01T00:00:00Z'};
      const fixture={verified:true,chainId:80002,registrationId:registration.registration_id,
        albumId:registration.album_id,copyNumber:registration.album_copy_number,
        contractAddress:'0x'+'1'.repeat(40),verifiedWallet:'0x'+'2'.repeat(40),
        transactionHash:'0x'+'3'.repeat(64),tokenId:'1'};
      const board=buildNftGatheringBoard({verifiedRegistration:{verified:true,record:registration},verifiedPolygon:fixture});
      const p=board.groups.polygon;
      const polygon={verified:Object.values(p).every(s=>s.status==='ready'),chainId:80002,
        contractAddress:p.contractAddress.value,tokenId:p.tokenId.value,transactionHash:p.mintTransactionHash.value,verifiedWallet:p.verifiedWallet.value};
      const packet=assemblePipeline1OwnershipReturn({registration,
        purchase:{transactionId:registration.purchase_transaction_id,albumId:registration.album_id,
          orderNumber:'FIXTURE-ORDER',pricePaidCents:999,currency:'USD'},
        ownership:{registrationId:board.identity.registrationId,albumId:board.identity.albumId,
          copyNumber:board.identity.copyNumber,ownerId:registration.registered_owner_id,ownershipKey:'FIXTURE-KEY'},
        polygon,synthetic:true,registrationAuthorized:false,polygonProofVerified:false});
      const checks={destination:packet.destination==='thirdparty.registration.board.nftReturn',
        identity:packet.identity.registrationId===registration.registration_id && packet.identity.albumId===registration.album_id && packet.identity.copyNumber===registration.album_copy_number,
        network:packet.nft.network===p.network.value,contractAddress:packet.nft.contractAddress===p.contractAddress.value,
        tokenId:packet.nft.tokenId===p.tokenId.value,transactionHash:packet.nft.transactionHash===p.mintTransactionHash.value,
        releaseHeld:packet.releaseAuthorized===false && packet.status==='hold' && packet.nft.ownershipConfirmed===false};
      checks.verifiedWallet=packet.nft.verifiedWallet===p.verifiedWallet.value;
      const passed=Object.values(checks).every(Boolean);
      const token=process.env.AJINE_PIPELINE1_RETURN_TOKEN;
      if (!passed || !token || token.length<32 || process.env.AJINE_PIPELINE1_RETURN_ENABLED!=='true') {
        json(res,503,{passed:false,fixtureOnly:true,checks,reason:'mapping_or_return_configuration',stored:false,delivered:false});return;
      }
      const response=await fetch('https://stripe-beta.onrender.com/api/registration/pipeline1/return',{
        method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
        body:JSON.stringify({originalRegistration:registration,returnPackage:packet}),signal:AbortSignal.timeout(10000)});
      const receipt=await response.json().catch(()=>null);
      const landed=response.ok && receipt?.received===true && receipt?.validated===true &&
        receipt?.registrationMatched===true && receipt?.stored===false && receipt?.delivered===false &&
        receipt?.nftFieldsReceived===true && receipt?.directusWriteTest?.passed===true && receipt?.directusWriteTest?.rolledBack===true;
      json(res,landed?200:503,{passed:landed,fixtureOnly:true,checks,verifiedWalletForwarded:checks.verifiedWallet,
        registrationReceiverContacted:true,registrationReceiverConfirmed:response.ok && receipt?.registrationMatched===true && receipt?.nftFieldsReceived===true,directusWriteTest:receipt?.directusWriteTest??null,upstreamStatus:response.status,stored:false,delivered:false});
      return;
    }
    if (path === '/api/nft/return/ping') {
      // Contract-only synthetic return ping: no third-party delivery or page rendering.
      json(res, 200, pingMyCollectionReturn());
      return;
    }
    if (path === '/api/nft/pipeline/ping') {
      // Synthetic in-memory fixture + live read-only RPC. Never an ownership proof.
      const result = await pingNftPipeline();
      json(res, result.passed ? 200 : 503, result);
      return;
    }
    if (path === '/api/polygon/status') {
      // Read-only browser status for the explicitly approved third-party site.
      // A missing/unapproved Origin receives no CORS permission.
      const allowedOrigin = betaSignalCors(req.headers.origin);
      if (allowedOrigin) {
        res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
        res.setHeader('Vary', 'Origin');
      }
      const status = await readPolygonAmoyStatus();
      json(res, status.connected ? 200 : 503, status);
      return;
    }
    if (path === '/api/directus/characters/layer-two/live-test') {
      if (process.env.AJINE_CHARACTER_DRY_RUN_ENABLED !== 'true') { json(res,503,{error:'dry_run_disabled'}); return; }
      if (!authorized(req)) { json(res,401,{error:'unauthorized'}); return; }
      const result=await inspectLayerTwoLiveConnection({token:TOKEN});
      json(res,result.ok?200:503,result);
      return;
    }
    if (path === '/api/directus/characters/dry-run') {
      if (req.method !== 'GET') { json(res,405,{error:'method_not_allowed'}); return; }
      if (process.env.AJINE_CHARACTER_DRY_RUN_ENABLED !== 'true') { json(res,503,{error:'dry_run_disabled'}); return; }
      if (!authorized(req)) { json(res,401,{error:'unauthorized'}); return; }
      const result = await inspectCharacterLibrary({token:TOKEN});
      json(res,result.ok?200:503,result);
      return;
    }
    if (path === '/api/directus/status') {
      const status = await checkDirectus();
      json(res, status.connected ? 200 : 503, status);
      return;
    }
    json(res, 404, { error: 'not_found' });
  } catch {
    json(res, 500, { error: 'server_error' });
  }
}).listen(PORT, '0.0.0.0', () => {
  console.log('AJINE NFT API listening on port ' + PORT);
});
