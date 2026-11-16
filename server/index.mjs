import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const PORT=Number(process.env.PORT||3000);
const HOST='0.0.0.0';
const DIRECTUS_URL='https://directus-on-nft.onrender.com';
const TOKEN=process.env.AJINE_DIRECTUS_TOKEN;
const DIST=resolve(process.cwd(),'dist');
const MIME={
 '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8','.svg':'image/svg+xml',
 '.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg',
 '.webp':'image/webp','.gif':'image/gif','.ico':'image/x-icon',
 '.json':'application/json; charset=utf-8','.woff2':'font/woff2'
};
function sendJson(res,code,data){
 res.writeHead(code,{'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
 res.end(JSON.stringify(data));
}
async function directusStatus(){
 if(!TOKEN)return {connected:false,reason:'not_configured'};
 try{
  const result=await fetch(DIRECTUS_URL+'/users/me?fields=id',{
   headers:{Authorization:'Bearer '+TOKEN},
   signal:AbortSignal.timeout(7000)
  });
  return result.ok?{connected:true}:{connected:false,reason:'unavailable'};
 }catch{return {connected:false,reason:'unavailable'};}
}
const server=createServer(async(req,res)=>{
 try{
  if(req.method!=='GET'&&req.method!=='HEAD'){
   res.writeHead(405,{'Allow':'GET, HEAD'});res.end();return;
  }
  const path=new URL(req.url,'http://localhost').pathname;
  if(path==='/api/directus/status'){
   const status=await directusStatus();
   sendJson(res,status.connected?200:503,status);return;
  }
  if(path.startsWith('/api/')){sendJson(res,404,{error:'not_found'});return;}
  let decoded;
  try{decoded=decodeURIComponent(path);}catch{sendJson(res,400,{error:'bad_path'});return;}
  if(decoded.includes('\\')||decoded.includes('\0')){sendJson(res,400,{error:'bad_path'});return;}
  let file=resolve(DIST,'.'+decoded);
  if(!file.startsWith(DIST+sep)&&file!==DIST){sendJson(res,403,{error:'forbidden'});return;}
  if(decoded==='/'||!extname(decoded))file=resolve(DIST,'index.html');
  try{
   const info=await stat(file);
   if(!info.isFile())throw Error('not a file');
   const body=await readFile(file);
   res.writeHead(200,{'Content-Type':MIME[extname(file)]||'application/octet-stream',
    'X-Content-Type-Options':'nosniff','Cache-Control':extname(file)==='.html'?'no-cache':'public, max-age=300'});
   res.end(req.method==='HEAD'?undefined:body);
  }catch{sendJson(res,404,{error:'not_found'});}
 }catch{sendJson(res,500,{error:'server_error'});}
});
server.listen(PORT,HOST,()=>console.log('AJINE NFT server listening on port '+PORT));
