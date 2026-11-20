// Live synthetic-only receipt probe; never sends real registrations.
// Run on GitHub Actions runner with outbound HTTPS. No Render credentials.
import { MOCK_REGISTRATION } from "../server/mockRegistrationJson.mjs";
const url="https://ajine-nft-api.onrender.com/api/integrations/registration/mock-json";
async function probe(){
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),30000);
 try {
   const response=await fetch(url,{
     method:"POST",
     headers:{"Content-Type":"application/json","Origin":"https://thirdparty-tz9x.onrender.com"},
     body:JSON.stringify(MOCK_REGISTRATION),
     signal:controller.signal
   });
   const body=await response.json().catch(()=>null);
   if(response.status===503&&body?.error==="mock_json_disabled"){
     console.error("LIVE_MOCK_HANDOFF_DISABLED: Render variable AJINE_REGISTRATION_MOCK_JSON_ENABLED is not true");
     process.exitCode=2;return;
   }
   if(response.status===403){
     console.error("LIVE_MOCK_HANDOFF_ORIGIN_DENIED: configured origin was not accepted");
     process.exitCode=3;return;
   }
   if(response.status!==200||body?.received!==true||body?.validated!==true||
       body?.mock_only!==true||body?.stored!==false||body?.minted!==false||
       body?.registration_id!==MOCK_REGISTRATION.registration_id||
       body?.album_copy_number!==MOCK_REGISTRATION.album_copy_number){
     console.error("LIVE_MOCK_HANDOFF_NOT_CONFIRMED: HTTP "+response.status+" status="+String(body?.error||"unexpected_reply"));
     process.exitCode=4;return;
   }
   console.log("LIVE_MOCK_HANDOFF_RECEIVED_AND_VERIFIED");
   console.log("registration_id="+body.registration_id+" album_copy_number="+body.album_copy_number);
   console.log("stored=false minted=false; no real customer purchase sent");
 }catch(e){
   console.error("LIVE_MOCK_HANDOFF_UNREACHABLE: "+(e?.name||"request_failed"));
   process.exitCode=5;
 }finally{clearTimeout(timeout);}
}
await probe();
