import test from "node:test";
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import net from "node:net";
import {MOCK_REGISTRATION,MOCK_JSON_PATH} from "../server/mockRegistrationJson.mjs";
import {buildNftGatheringBoard} from "../server/nftGatheringBoard.mjs";

const expected = {
  registrationId: "REG-BETA-001", albumId: "ALBUM-BETA-001",
  copyNumber: "COPY-BETA-001", registeredOwnerId: "CLERK-BETA-001",
  purchaseTransactionId: "ORD-BETA-001", registrationDate: "2026-11-16T19:00:00.000Z",
};
test("mock registration lands in all six board slots without verified ownership", () => {
  const board=buildNftGatheringBoard({mockRegistration:{accepted:true,record:MOCK_REGISTRATION}});
  assert.equal(board.mode,"mock_preview");
  assert.equal(board.stored,false);
  assert.equal(board.minted,false);
  assert.deepEqual(Object.fromEntries(Object.entries(board.groups.registration).map(([k,v])=>[k,v.value])),expected);
  assert.ok(Object.values(board.groups.registration).every(v=>v.status==="mock_preview" && v.source==="thirdparty.mock-registration-json"));
  for(const name of ["albumRarity","polygon","provenance","albumArtwork","albumCoverStamps","returnToThirdParty","futureBurnJingleCards"])
    assert.ok(Object.values(board.groups[name]).every(v=>v.status==="not_connected"));
});
test("unaccepted mock or no input cannot populate registration",()=>{
  for(const options of [{},{mockRegistration:{record:MOCK_REGISTRATION}},
    {mockRegistration:{accepted:false,record:MOCK_REGISTRATION}}]){
    const board=buildNftGatheringBoard(options);
    assert.equal(board.mode,"not_connected");
    assert.equal(board.identity.copyNumber,null);
  }
});
async function freePort(){
 const socket=net.createServer();
 await new Promise((resolve,reject)=>socket.once("error",reject).listen(0,"127.0.0.1",resolve));
 const port=socket.address().port;
 await new Promise(resolve=>socket.close(resolve));
 return port;
}
test("HTTP Register mock POST projects into Gathering Board and rejects changed identity",async()=>{
  const port=await freePort();
  const child=spawn(process.execPath,["server/index.mjs"],{
    env:{...process.env,PORT:String(port),AJINE_REGISTRATION_MOCK_JSON_ENABLED:"true",AJINE_DIRECTUS_TOKEN:""},
    stdio:"ignore",
  });
  const url="http://127.0.0.1:"+port;
  try{
    let ready=false;
    for(let i=0;i<40;i++){
      try { const r=await fetch(url+"/healthz"); if(r.ok){ready=true;break;} } catch {}
      await new Promise(resolve=>setTimeout(resolve,75));
    }
    assert.equal(ready,true,"local API must boot");
    const send=body=>fetch(url+MOCK_JSON_PATH,{method:"POST",
      headers:{"Content-Type":"application/json",Origin:"https://thirdparty-tz9x.onrender.com"},
      body:JSON.stringify(body)});
    const response=await send(MOCK_REGISTRATION);
    assert.equal(response.status,200);
    const receipt=await response.json();
    assert.equal(receipt.ok,true);
    assert.equal(receipt.received,true);
    assert.equal(receipt.validated,true);
    assert.equal(receipt.mock_only,true);
    assert.equal(receipt.stored,false);
    assert.equal(receipt.minted,false);
    assert.equal(receipt.gathering_board.mode,"mock_preview");
    assert.equal(receipt.gathering_board.version,"ajine-nft-gathering-board-v1");
    for(const [name,value] of Object.entries(expected))
      assert.deepEqual(receipt.gathering_board.registration_slots[name],{value,status:"mock_preview"});
    const changed=await send({...MOCK_REGISTRATION,album_copy_number:"COPY-REAL-123"});
    assert.equal(changed.status,422);
    assert.equal((await changed.json()).gathering_board,undefined);
  }finally{
    child.kill("SIGTERM");
  }
});
