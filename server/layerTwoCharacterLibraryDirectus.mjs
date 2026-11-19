/*
 * Read-only NFT Directus -> Layer 2 rarity engine character catalog.
 * No odds, assignments, printing, mutations, or commercial Directus access.
 */
const ORIGIN = "https://directus-on-nft.onrender.com";
const COLLECTION = "AJINE_Characters";
const FIELDS = "id,character_code,character_name,status,rarity_tier,print_weight,edition_limit,artwork,description";
export const CHARACTER_LIBRARY_CONTRACT = "ajine-character-library-v1";
const codeFor = n => "AJINE-"+String(n).padStart(2,"0");
export async function readLayerTwoCharacterLibrary({token=process.env.AJINE_DIRECTUS_TOKEN,fetcher=fetch}={}) {
  if(typeof token!=="string" || !token.trim())
    return Object.freeze({ok:false,reason:"nft_directus_token_missing",characters:[]});
  try {
    const url = ORIGIN+"/items/"+COLLECTION+"?fields="+FIELDS+"&limit=100";
    const response = await fetcher(url,{method:"GET",headers:{Authorization:"Bearer "+token,Accept:"application/json"},redirect:"error",signal:AbortSignal.timeout(8000)});
    if(!response.ok) return Object.freeze({ok:false,reason:"nft_directus_read_http_"+response.status,characters:[]});
    const data=(await response.json())?.data;
    if(!Array.isArray(data))return Object.freeze({ok:false,reason:"invalid_character_response",characters:[]});
    const byCode=new Map();
    for(const item of data) {
      if(!item || typeof item.character_code!=="string" || byCode.has(item.character_code))
        return Object.freeze({ok:false,reason:"duplicate_or_invalid_character_code",characters:[]});
      byCode.set(item.character_code,item);
    }
    const expected=Array.from({length:12},(_,i)=>codeFor(i+1));
    if(data.length!==12 || expected.some(code=>!byCode.has(code)))
      return Object.freeze({ok:false,reason:"character_catalog_not_exactly_twelve",characters:[]});
    const characters=expected.map(code=>{
      const item=byCode.get(code);
      return Object.freeze({
        id:item.id,characterCode:code,characterName:item.character_name,
        status:item.status,rarityTier:item.rarity_tier??null,
        printWeight:item.print_weight??null,editionLimit:item.edition_limit??null,
        artworkFileId:item.artwork??null,description:item.description??null,
      });
    });
    if(characters.some(c=>!c.characterName || !Number.isInteger(Number(c.id))))
      return Object.freeze({ok:false,reason:"invalid_character_record",characters:[]});
    return Object.freeze({ok:true,contractVersion:CHARACTER_LIBRARY_CONTRACT,
      source:"nft.directus.AJINE_Characters",mode:"read_only",assignmentEnabled:false,
      characters:Object.freeze(characters)});
  }catch{
    return Object.freeze({ok:false,reason:"nft_directus_read_unavailable",characters:[]});
  }
}
