import test from "node:test";
import assert from "node:assert/strict";
import {prepareLayerTwoCharacterEngine} from "../server/layerTwoCharacterEngineCatalog.mjs";
const rows=Array.from({length:12},(_,i)=>({id:i+1,character_code:"AJINE-"+String(i+1).padStart(2,"0"),character_name:"Character "+(i+1),status:"draft",rarity_tier:null,print_weight:null,edition_limit:null,artwork:null,description:null}));
const fetcher=async()=>({ok:true,json:async()=>({data:rows})});
test("twelve draft characters load without printing or assigning",async()=>{
 const result=await prepareLayerTwoCharacterEngine({token:"test-token",fetcher});
 assert.equal(result.ok,true);assert.equal(result.characterCount,12);
 assert.equal(result.printingEnabled,false);assert.equal(result.oddsApplied,false);
 assert.equal(result.assignment,null);assert.equal(result.characters[2].characterName,"Character 3");
});
test("Directus 403 blocks catalog admission safely",async()=>{
 const result=await prepareLayerTwoCharacterEngine({token:"test-token",fetcher:async()=>({ok:false,status:403})});
 assert.equal(result.ok,false);assert.equal(result.reason,"nft_directus_read_http_403");
 assert.equal(result.printingEnabled,false);
});
test("incomplete catalog blocks admission",async()=>{
 const result=await prepareLayerTwoCharacterEngine({token:"test-token",fetcher:async()=>({ok:true,json:async()=>({data:rows.slice(1)})})});
 assert.equal(result.ok,false);assert.equal(result.reason,"character_catalog_not_exactly_twelve");
});
