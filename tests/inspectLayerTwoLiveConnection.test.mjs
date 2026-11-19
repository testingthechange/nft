import test from "node:test";
import assert from "node:assert/strict";
import {inspectLayerTwoLiveConnection} from "../server/inspectLayerTwoLiveConnection.mjs";
const rows=Array.from({length:12},(_,i)=>({id:i+1,character_code:"AJINE-"+String(i+1).padStart(2,"0"),character_name:"Character "+(i+1),status:"draft"}));
test("catalog and empty board connection succeed without assignments",async()=>{
 const result=await inspectLayerTwoLiveConnection({token:"fixture",fetcher:async()=>({ok:true,json:async()=>({data:rows})})});
 assert.equal(result.ok,true);
 assert.equal(result.characterCount,12);
 assert.equal(result.gatheringBoardReceiptReady,true);
 assert.equal(result.layerTwoAssigned,false);
 assert.equal(result.directusWrites,false);
 assert.equal(result.polygonMinted,false);
});
test("403 reports blocked catalog without modifying board",async()=>{
 const result=await inspectLayerTwoLiveConnection({token:"fixture",fetcher:async()=>({ok:false,status:403})});
 assert.equal(result.ok,false);
 assert.equal(result.reason,"nft_directus_read_http_403");
 assert.equal(result.gatheringBoardReceiptReady,true);
});
