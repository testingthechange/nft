// Canonical beta identity translation. No database writes or blockchain calls.
export function betaNftIdentity({registrationId,shareId,copyNumber}={}) {
 const reg=String(registrationId??'');
 const copy=String(copyNumber??'');
 if(!/^[1-9][0-9]*$/.test(reg)||!/^[1-9][0-9]*$/.test(copy)||
 typeof shareId!=='string'||!/^share_[A-Za-z0-9_-]{1,80}$/.test(shareId))
 throw Error('INVALID_BETA_REGISTRATION_IDENTITY');
 return Object.freeze({
 registrationId:reg,
 albumId:'ALBUM-BETA-'+shareId,
 copyNumber:'COPY-BETA-'+copy,
 directusCopyId:'BETA-'+reg,
 directusCopyNumber:'BETA-'+copy,
 shareId
 });
}
