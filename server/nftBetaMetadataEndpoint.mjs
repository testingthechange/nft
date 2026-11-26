// Read-only NFT metadata based on the CURRENT published Directus manifest.
// No operator-provided artwork copy and no metadata mutation.
import {readCommercialPreprintRegistration} from './nftCommercialPreprintEvidence.mjs';
const PUBLISHED='https://smartb5ajine.onrender.com/api/manifests/';
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
 const response=await fetcher(PUBLISHED+encodeURIComponent(SHARE_ID),{
  method:'GET',redirect:'error',headers:{Accept:'application/json'},
  signal:AbortSignal.timeout(15000)
 });
 if(!response.ok)throw Error('BETA_PUBLISHED_MANIFEST_HTTP_'+response.status);
 const payload=await response.json();
 const record=object(payload?.data?.shareId?payload.data:payload);
 if(record.shareId!==SHARE_ID||!tracks(record.tracks).length||!record.publishId||!record.publishedAt)
   throw Error('BETA_PUBLISHED_MANIFEST_NOT_FOUND');
 const album=object(record.album);
 const nested=object(object(record.manifest_json||record.manifestJson||record.manifest).album);
 const meta=object(album.meta);
 const name=[meta.albumTitle,album.title,object(nested.meta).albumTitle,nested.title,record.albumTitle,record.title]
   .find(x=>typeof x==='string'&&x.trim());
 if(typeof name!=='string'||!name.trim())
    throw Error('BETA_MANIFEST_ALBUM_TITLE_MISMATCH');
 const artist=[meta.artistName,album.artist,object(nested.meta).artistName,nested.artist,record.artistName,record.artist].find(x=>typeof x==='string'&&x.trim());
 if(!artist)throw Error('BETA_MANIFEST_ARTIST_MISSING');
 const cover=[album.coverUrl,nested.coverUrl,record.coverUrl,record.cover_url,object(album.cover).previewUrl,object(nested.cover).previewUrl]
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
