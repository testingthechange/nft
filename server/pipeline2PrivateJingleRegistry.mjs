import pg from 'pg';
import {randomBytes,randomUUID,createCipheriv,createDecipheriv} from 'node:crypto';
async function connect(env){
 const key=env.AJINE_JINGLE_REGISTRY_KEY;
 if(!/^[a-f0-9]{64}$/i.test(key||'')||!env.AJINE_JINGLE_REGISTRY_DATABASE_URL)throw Error('PRIVATE_REGISTRY_NOT_CONFIGURED');
 const db=new pg.Client({connectionString:env.AJINE_JINGLE_REGISTRY_DATABASE_URL,connectionTimeoutMillis:5000,query_timeout:8000});
 await db.connect();return {db,key:Buffer.from(key,'hex')};
}
export async function verifyPrivateJingleRegistry(env){
 const {db,key}=await connect(env);
 try{
 const q=await db.query("SELECT to_regclass('ajine_private.jingle_burns') AS registry");
 if(!q.rows[0]?.registry)throw Error('PRIVATE_REGISTRY_MISSING');
 await db.query('SELECT reservation_id,payload FROM ajine_private.jingle_burns LIMIT 0');
 const id=randomUUID(), iv=randomBytes(12), sample=randomBytes(32);
 const cipher=createCipheriv('aes-256-gcm',key,iv);
 cipher.setAAD(Buffer.from(id));
 const payload=Buffer.concat([iv,Buffer.alloc(16),cipher.update(sample),cipher.final()]);
 cipher.getAuthTag().copy(payload,12);
 await db.query('BEGIN');
 try{
  await db.query('INSERT INTO ajine_private.jingle_burns(reservation_id,payload) VALUES($1,$2)',[id,payload]);
  const result=await db.query('SELECT payload FROM ajine_private.jingle_burns WHERE reservation_id=$1',[id]);
  const p=result.rows[0]?.payload;
  if(!p)throw Error('PRIVATE_REGISTRY_TEST_READBACK_MISSING');
  const decipher=createDecipheriv('aes-256-gcm',key,p.subarray(0,12));
  decipher.setAAD(Buffer.from(id));decipher.setAuthTag(p.subarray(12,28));
  if(!Buffer.concat([decipher.update(p.subarray(28)),decipher.final()]).equals(sample))throw Error('PRIVATE_REGISTRY_TEST_MISMATCH');
 }finally{await db.query('ROLLBACK');}
 const check=await db.query('SELECT reservation_id FROM ajine_private.jingle_burns WHERE reservation_id=$1',[id]);
 if(check.rowCount!==0)throw Error('PRIVATE_REGISTRY_TEST_ROLLBACK_FAILED');
 }finally{await db.end();}
}
export async function recordPrivateJingleBurn({execution,nft,env}){
 const {db,key}=await connect(env);
 const id=execution.id;
 try{
 const number='AJINE-BURN-'+randomBytes(32).toString('hex').toUpperCase();
 const value={number,transactionHash:execution.transaction_hash,nftIdentity:execution.nft_identity,registrationId:execution.registration_id,agreementId:execution.agreement_id};
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);
 cipher.setAAD(Buffer.from(id));
 const encrypted=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);
 const payload=Buffer.concat([iv,cipher.getAuthTag(),encrypted]);
 await db.query('INSERT INTO ajine_private.jingle_burns(reservation_id,payload) VALUES($1,$2) ON CONFLICT(reservation_id) DO NOTHING',[id,payload]);
 const q=await db.query('SELECT payload FROM ajine_private.jingle_burns WHERE reservation_id=$1',[id]);
 const p=q.rows[0]?.payload;if(!p)throw Error('PRIVATE_REGISTRY_READBACK_MISSING');
 const decipher=createDecipheriv('aes-256-gcm',key,p.subarray(0,12));decipher.setAAD(Buffer.from(id));decipher.setAuthTag(p.subarray(12,28));
 const stored=JSON.parse(Buffer.concat([decipher.update(p.subarray(28)),decipher.final()]).toString('utf8'));
 for(const field of ['transactionHash','nftIdentity','registrationId','agreementId'])if(stored[field]!==value[field])throw Error('PRIVATE_REGISTRY_MISMATCH');
 if(!/^AJINE-BURN-[A-F0-9]{64}$/.test(stored.number))throw Error('PRIVATE_REGISTRY_NUMBER_INVALID');
 return Object.freeze({ok:true,stored:true,ajineBurnNumber:stored.number,burnRegistryId:id,agreementId:stored.agreementId,registrationId:stored.registrationId,transactionHash:stored.transactionHash});
 }finally{await db.end();}
}
