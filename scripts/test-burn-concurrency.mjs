// Two independent PostgreSQL sessions, all writes rolled back.
// Run: NFT_DATABASE_URL=... node scripts/test-burn-concurrency.mjs 10
// Uses an existing pending agreement as a fixture; does not alter it permanently.
// Never broadcasts a blockchain transaction.
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
const connection=process.env.NFT_DATABASE_URL;
const registration=process.argv[2];
if(!connection || !/^[1-9][0-9]*$/.test(registration||''))throw Error('DATABASE_URL_AND_REGISTRATION_REQUIRED');
// libpq PGDATABASE is a database *name*, not a connection URI.
// Split the Render URI into libpq environment fields so psql connects remotely
// without exposing the secret URL in command-line arguments.
const parsed=new URL(connection);
if(!['postgresql:','postgres:'].includes(parsed.protocol)||!parsed.hostname||!parsed.username||!parsed.pathname.slice(1))throw Error('INVALID_DATABASE_URL');
const env={...process.env,
 PGHOST:parsed.hostname,
 PGPORT:parsed.port||'5432',
 PGUSER:decodeURIComponent(parsed.username),
 PGPASSWORD:decodeURIComponent(parsed.password),
 PGDATABASE:decodeURIComponent(parsed.pathname.slice(1)),
 PGSSLMODE:parsed.searchParams.get('sslmode')||'require'
};
delete env.NFT_DATABASE_URL;
const quote=s=>"'"+String(s).replaceAll("'","''")+"'";
function run(sql){
 return new Promise((resolve,reject)=>{
  const cp=spawn('psql',['-X','-q','-A','-t','-v','ON_ERROR_STOP=1','-c',sql],{env,stdio:['ignore','pipe','pipe']});
  let out='',err='';
  cp.stdout.on('data',b=>out+=b);
  cp.stderr.on('data',b=>err+=b);
  cp.on('error',reject);
  cp.on('close',code=>resolve({code,out,err}));
 });
}
async function query(sql){
 const r=await run(sql);
 if(r.code!==0)throw Error('DB_QUERY_FAILED: '+r.err.slice(0,200));
 return r.out.trim();
}
const fixture=async()=>{
 const rows=await query(`SELECT agreement_id::text || '|' || id::text || '|' || event_type FROM "NFT_Agreement_Events" WHERE registration_id=${quote(registration)} ORDER BY occurred_at DESC LIMIT 1`);
 const [agreement,event,status]=rows.split('|');
 if(!/^[0-9a-f-]{36}$/i.test(agreement||'') || !/^[0-9a-f-]{36}$/i.test(event||'') || status!=='pending')throw Error('PENDING_FIXTURE_REQUIRED');
 const executions=await query(`SELECT COUNT(*) FROM "NFT_Burn_Executions" WHERE registration_id=${quote(registration)}`);
 if(executions!=='0')throw Error('FIXTURE_ALREADY_RESERVED');
 return {agreement,event};
};
function reservation(f,identity){
 return `INSERT INTO "NFT_Burn_Executions"(id,nft_identity,registration_id,agreement_id,agreement_event_id,status,authorized_at) VALUES (${quote(randomUUID())},${quote(identity)},${quote(registration)},${quote(f.agreement)},${quote(f.event)},'reserved',clock_timestamp());`;
}
function withdrawal(f){
 return `INSERT INTO "NFT_Agreement_Events"(id,agreement_id,registration_id,event_type,occurred_at) VALUES (${quote(randomUUID())},${quote(f.agreement)},${quote(registration)},'withdrawn',clock_timestamp());`;
}
async function compete(name,holderSql,challengerSql){
 const cp=spawn('psql',['-X','-q','-A','-t','-v','ON_ERROR_STOP=1'],{env,stdio:['pipe','pipe','pipe']});
 let stdout='',stderr='';
 const marker='AJINE_LOCK_HELD_'+randomUUID().replaceAll('-','');
 let wake,fail;
 const ready=new Promise((resolve,reject)=>{wake=resolve;fail=reject;});
 let readyDone=false;
 cp.stdout.on('data',b=>{
  stdout+=b.toString();
  if(!readyDone && stdout.includes(marker)){readyDone=true;wake();}
 });
 cp.stderr.on('data',b=>stderr+=b.toString());
 cp.on('error',e=>{if(!readyDone){readyDone=true;fail(e);}});
 cp.on('close',code=>{if(!readyDone){readyDone=true;fail(Error(name+'_HOLDER_EXIT_'+code+': '+stderr.slice(0,200)));}});
 const timeout=setTimeout(()=>{if(!readyDone){readyDone=true;fail(Error(name+'_HOLDER_TIMEOUT'));cp.kill();}},8000);
 try{
  cp.stdin.write(`BEGIN;\nSET LOCAL statement_timeout='12s';\n${holderSql}\n\\echo ${marker}\n`);
  await ready;
  clearTimeout(timeout);
  // The holder transaction is open, so the challenger must block on its advisory lock.
  const challenge=await run(`BEGIN; SET LOCAL statement_timeout='5s'; SET LOCAL lock_timeout='1000ms'; ${challengerSql} ROLLBACK;`);
  if(challenge.code===0 || !/lock timeout/i.test(challenge.err))throw Error(name+'_CHALLENGER_UNEXPECTED: '+challenge.err.slice(0,200));
  process.stdout.write('PASS '+name+' rejected conflicting concurrent write (lock timeout)\n');
 }finally{
  clearTimeout(timeout);
  if(!cp.killed && cp.exitCode===null)cp.stdin.write('ROLLBACK;\n\\q\n');
  cp.stdin.end();
  // Connection closure also rolls back an interrupted transaction.
  await new Promise(resolve=>{if(cp.exitCode!==null)return resolve();cp.once('close',resolve);setTimeout(()=>{if(cp.exitCode===null)cp.kill();resolve();},3000).unref();});
 }
}
const start=await fixture();
const prefix='ajine-concurrency-'+randomUUID();
try{
 await compete('reservation_blocks_withdrawal',reservation(start,prefix+':a'),withdrawal(start));
 await compete('withdrawal_blocks_reservation',withdrawal(start),reservation(start,prefix+':b'));
}finally{
 const after=await fixture();
 if(after.agreement!==start.agreement||after.event!==start.event)throw Error('FIXTURE_CHANGED');
 const left=await query(`SELECT COUNT(*) FROM "NFT_Burn_Executions" WHERE nft_identity LIKE ${quote(prefix+'%')}`);
 if(left!=='0')throw Error('TEST_RESERVATION_PERSISTED');
}
console.log('BURN_CONCURRENT_LOCK_TESTS_PASSED; ROLLBACK_CONFIRMED');
