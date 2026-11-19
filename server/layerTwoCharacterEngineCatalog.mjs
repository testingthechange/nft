import {readLayerTwoCharacterLibrary} from "./layerTwoCharacterLibraryDirectus.mjs";
import {CHARACTER_LIBRARY_CONTRACT} from "./layerTwoCharacterLibraryDirectus.mjs";
/*
 * Layer 2 engine catalog admission. Catalog read only; printing disabled.
 * Board receipt stays empty until separate assignment authority is installed.
 */
export async function prepareLayerTwoCharacterEngine({token,fetcher}={}) {
 const catalog=await readLayerTwoCharacterLibrary({token,fetcher});
 if(!catalog.ok)return Object.freeze({ok:false,status:"blocked",reason:catalog.reason,printingEnabled:false,characters:[]});
 return Object.freeze({ok:true,status:"catalog_ready",contractVersion:CHARACTER_LIBRARY_CONTRACT,
   characterCount:catalog.characters.length,characters:catalog.characters,
   printingEnabled:false,assignment:null,oddsApplied:false});
}
