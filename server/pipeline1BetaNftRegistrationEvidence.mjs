// Authoritative read-only beta registration evidence for the NFT mint gate.
// Read from the saved registration and its exact purchased-copy projection.
import pg from 'pg';
import {betaNftIdentity} from './pipeline1BetaNftIdentity.mjs';
export async function readVerifiedBetaRegistration({registrationId,env=process.env,connect}={}){
 const regId=String(registrationId??'');
 if(!/^[1-9][0-9]*$/.test(regId)||!env.AJINE_COMMERCIAL_READONLY_DATABASE_URL||
   env.AJINE_DIRECTUS_PREPRINT_READ_ENABLED!=='true')
   throw Error('REGISTRATION_EVIDENCE_UNAVAILABLE');
 const db=connect??(async()=>{
   const c=new pg.Client({connectionString:env.AJINE_COMMERCIAL_READONLY_DATABASE_URL,connectionTimeoutMillis:5000,statement_timeout:7000});
   await c.connect();return c;
 });
 const client=await db();
 try{
   await client.query('BEGIN READ ONLY');
   const name=(await client.query('SELECT current_database() AS name')).rows[0]?.name;
   if(name!=='directus_h9v5')throw Error('DATABASE_IDENTITY_MISMATCH');
   const rows=(await client.query(
     'SELECT id,share_id,copy_number,clerk_user_id,transaction_number,order_number,amount_cents,stripe_session_id FROM public.ajine_sandbox_registrations WHERE id::text=$1',
     [regId])).rows;
   if(rows.length!==1)throw Error('REGISTRATION_NOT_FOUND');
   const reg=rows[0];
   const identity=betaNftIdentity({registrationId:reg.id,shareId:reg.share_id,copyNumber:reg.copy_number});
   if(!/^cs_test_[A-Za-z0-9_]+$/.test(reg.stripe_session_id??'')||
      !String(reg.transaction_number??'').trim()||!String(reg.order_number??'').trim()||
      !/^user_[A-Za-z0-9]+$/.test(reg.clerk_user_id??'')||
      !Number.isSafeInteger(Number(reg.amount_cents))||Number(reg.amount_cents)<0)
     throw Error('REGISTRATION_PAYMENT_RECORD_INVALID');
   const owned=(await client.query(
     'SELECT id,share_id,copy_id,copy_number,clerk_user_id,ownership_status,playback_rights,provenance_status,"Order_Number__" AS order_number,"Transaction_Number_" AS transaction_number,registered_at FROM public.ownership_records WHERE copy_id=$1 AND copy_number=$2 AND share_id=$3 AND clerk_user_id=$4',
     [identity.directusCopyId,identity.directusCopyNumber,identity.shareId,reg.clerk_user_id])).rows;
   if(owned.length!==1||owned[0].ownership_status!=='beta_registered'||
      owned[0].playback_rights!=='none'||!owned[0].registered_at||
      owned[0].order_number!==reg.order_number||owned[0].transaction_number!==reg.transaction_number)
      throw Error('EXACT_COPY_OWNERSHIP_READBACK_FAILED');
   await client.query('ROLLBACK');
   return Object.freeze({verified:true,source:'commercial-postgres-readback',
     registrationVerified:true,paymentRecordMatched:true,ownershipVerified:true,
     registrationId:identity.registrationId,albumId:identity.albumId,copyNumber:identity.copyNumber,
     registeredOwnerId:reg.clerk_user_id,purchaseTransactionId:reg.transaction_number,
     orderNumber:reg.order_number,pricePaidCents:Number(reg.amount_cents),currency:'USD',
     registrationDate:new Date(owned[0].registered_at).toISOString()});
 }catch(e){await client.query('ROLLBACK').catch(()=>{});throw e}
 finally{await client.end().catch(()=>{})}
}

/**
 * Read-only latest eligible beta fixture lookup for operator pre-print diagnostics.
 * The caller must use the same authenticated private endpoint as exact-ID lookups.
 * Never guesses a registration ID or modifies a registration/copy.
 */
export async function readLatestVerifiedBetaRegistration({env=process.env,connect}={}){
 if(!env.AJINE_COMMERCIAL_READONLY_DATABASE_URL||
    env.AJINE_DIRECTUS_PREPRINT_READ_ENABLED!=='true')
   throw Error('REGISTRATION_EVIDENCE_UNAVAILABLE');
 const db=connect??(async()=>{
   const c=new pg.Client({connectionString:env.AJINE_COMMERCIAL_READONLY_DATABASE_URL,
     connectionTimeoutMillis:5000,statement_timeout:7000});
   await c.connect();return c;
 });
 const client=await db();
 let ids=[];
 try{
   await client.query('BEGIN READ ONLY');
   if((await client.query('SELECT current_database() AS name')).rows[0]?.name!=='directus_h9v5')
      throw Error('DATABASE_IDENTITY_MISMATCH');
   const result=await client.query(
     'SELECT id FROM public.ajine_sandbox_registrations WHERE share_id=$1 ORDER BY id DESC LIMIT 20',
     ['share_475784']);
   ids=result.rows.map(row=>String(row.id));
   await client.query('ROLLBACK');
 }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error}
 finally{await client.end().catch(()=>{})}
 for(const id of ids){
   try{return await readVerifiedBetaRegistration({registrationId:id,env,connect})}
   catch(error){
     if(['REGISTRATION_NOT_FOUND','REGISTRATION_PAYMENT_RECORD_INVALID','EXACT_COPY_OWNERSHIP_READBACK_FAILED']
       .includes(error?.message))continue;
     throw error;
   }
 }
 throw Error('NO_VERIFIED_SANDBOX_REGISTRATION');
}
