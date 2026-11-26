// Read-only NFT metadata based on the CURRENT published Directus manifest.
// No operator-provided artwork copy and no metadata mutation.
import {readCommercialPreprintRegistration} from './nftCommercialPreprintEvidence.mjs';
const DIRECTUS='https://directus-otul.onrender.com';
const SHARE_ID='share_475784';
function object(v){
 if(v&&typeof v==='object'&&!Array.isArray(v))return v;
 if(typeof v==='string'){try{const x=JSON.parse(v);if(x&&typeof x==='object'&&!Array.isArray(x))return x;}catch{}}
 return {};
}
function tracks(v){if(Array.isArray(v))return v;if(typeof v==='string'){try{const a=JSON.parse(v);if(Array.isArray(a))return a;}catch{}}return [];}
function validCover(raw){
 if(typeof raw!=='string'||raw.length>2048)throw Error('BETA_MANIFEST_COVER_MISSING');
 let u;try{u=new URL(raw);}catch{throw Error('BETA_MANIFEST_COVER_URL_INVALID');}
 if(u.protocol!=='https:'||u.username||u.password||u.hash||u.port||!u.hostname||
    u.hostname==='localhost'||u.hostname.endsWith('.local')||
    /^\\d+\\.\\d+\\.\\d+\\.\\d+$/.test(u.hostname))
   throw Error('BETA_MANIFEST_COVER_URL_INVALID');
 return u.href;
}
export async function readVerifiedBlockRadiusManifest({fetcher=fetch,env=process.env}={}){
 const token=env.AJINE_COMMERCIAL_DIRECTUS_READ_TOKEN;
 if(typeof token!=='string'||token.length<16)throw Error('BETA_MANIFEST_READ_TOKEN_REQUIRED');
 const filter='?filter[_or][0][share_id][_eq]='+encodeURIComponent(SHARE_ID)+
  '&filter[_or][1][shareId][_eq]='+encodeURIComponent(SHARE_ID)+'&limit=50&fields=*';
 const response=await fetcher(DIRECTUS+'/items/player_manifests'+filter,{
  method:'GET',redirect:'error',headers:{Authorization:'Bearer '+token,Accept:'application/json'},
  signal:AbortSignal.timeout(9000)
 });
 if(!response.ok)throw Error('BETA_DIRECTUS_MANIFEST_HTTP_'+response.status);
 const records=(await response.json())?.data;
 if(!Array.isArray(records))throw Error('BETA_MANIFEST_RESPONSE_INVALID');
 const candidates=records.filter(r=>r?.share_id===SHARE_ID||r?.shareId===SHARE_ID)
    .filter(r=>tracks(r.tracks).length>0)
    .sort((a,b)=>(Date.parse(b.publishedAt)||0)-(Date.parse(a.publishedAt)||0));
 if(!candidates.length)throw Error('BETA_PUBLISHED_MANIFEST_NOT_FOUND');
 const record=candidates[0];
 const album=object(record.album);
 const nested=object(object(record.manifest_json||record.manifestJson||record.manifest).album);
 const meta=object(album.meta);
 const name=[meta.albumTitle,album.title,object(nested.meta).albumTitle,nested.title,record.albumTitle,record.title]
   .find(x=>typeof x==='string'&&x.trim());
 if(typeof name!=='string'||!name.trim())
    throw Error('BETA_MANIFEST_ALBUM_TITLE_MISMATCH');
 const artist=[meta.artistName,album.artist,object(nested.meta).artistName,nested.artist,record.artistName,record.artist].find(x=>typeof x==='string'&&x.trim());
 if(!artist)throw Error('BETA_MANIFEST_ARTIST_MISSING');
 const cover=[album.coverUrl,nested.coverUrl,record.coverUrl,record.cover_url]
   .find(x=>typeof x==='string'&&x.trim());
 return Object.freeze({albumTitle:name.trim(),artist:artist.trim(),coverUrl:validCover(cover),shareId:SHARE_ID,
    manifestId:String(record.id??''),publishedAt:String(record.publishedAt??'')});
}
export async function buildFirstBetaMetadata({env=process.env,fetcher=fetch,readRegistration=readCommercialPreprintRegistration}={}){
 const e=await readRegistration('6');
 if(e?.registrationId!=='6'||e.verified!==true||e.registrationVerified!==true||
    e.paymentRecordMatched!==true||e.ownershipVerified!==true||
    e.albumId!=='ALBUM-BETA-'+SHARE_ID||!/^COPY-BETA-[1-9][0-9]*$/.test(e.copyNumber??''))
   throw Error('BETA_REGISTRATION_NOT_VERIFIED');
 const manifest=await readVerifiedBlockRadiusManifest({fetcher,env});
 return Object.freeze({
   name:manifest.albumTitle+' — Beta Album Copy',
   description:'AJINE Polygon Amoy testnet album copy. Development prototype; not a production NFT.',
   image:manifest.coverUrl,
   albumTitle:manifest.albumTitle,artist:manifest.artist,
   registrationId:e.registrationId,albumId:e.albumId,copyNumber:e.copyNumber
 });
}
