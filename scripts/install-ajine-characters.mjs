/**
 * NFT Directus AJINE_Characters installer. DRY RUN by default.
 * Usage: node scripts/install-ajine-characters.mjs [--apply]
 * Run only in the NFT backend environment with AJINE_DIRECTUS_TOKEN.
 * Never edits Rarity_Printer, Layer 1, or commercial Directus.
 */
const ORIGIN = "https://directus-on-nft.onrender.com";
const COLLECTION = "AJINE_Characters";
const apply = process.argv.includes("--apply");
const token = process.env.AJINE_DIRECTUS_TOKEN;
if (!token) { console.error("AJINE_DIRECTUS_TOKEN not configured"); process.exitCode = 1; }
else {
  const definitions = [
    ["character_code","string"],["character_name","string"],
    ["rarity_tier","string"],["print_weight","integer"],
    ["edition_limit","integer"],["artwork","uuid"],["description","text"],
  ];
  const request = async (path,method="GET",body) => {
    const res = await fetch(ORIGIN+path,{
      method,headers:{Authorization:"Bearer "+token,Accept:"application/json",
        ...(body?{"Content-Type":"application/json"}:{})},
      ...(body?{body:JSON.stringify(body)}:{}),
      redirect:"error",signal:AbortSignal.timeout(10000),
    });
    if (!res.ok) throw Error(method+" "+path+" returned HTTP "+res.status);
    return (await res.json())?.data;
  };
  try {
    const collections = await request("/collections");
    if (!collections.some(c=>c.collection===COLLECTION)) throw Error("AJINE_Characters missing in NFT Directus");
    const existing = await request("/fields/"+COLLECTION);
    const existingNames = new Set(existing.map(f=>f.field));
    if (!["id","status","sort"].every(x=>existingNames.has(x)))
      throw Error("Expected base character fields missing; manual review required");
    const records = await request("/items/"+COLLECTION+"?fields=id,character_code&limit=100");
    const existingCodes = new Set(records.map(r=>r.character_code).filter(Boolean));
    const missingFields = definitions.filter(([name])=>!existingNames.has(name));
    const missingRecords = Array.from({length:12},(_,i)=>({
      character_code:"AJINE-"+String(i+1).padStart(2,"0"),
      character_name:"Character "+String(i+1).padStart(2,"0")+" (placeholder)",
      status:"draft",sort:i+1,
    })).filter(r=>!existingCodes.has(r.character_code));
    console.log(JSON.stringify({project:ORIGIN,collection:COLLECTION,mode:apply?"apply":"dry_run",
      missingFields:missingFields.map(([name])=>name),
      missingRecords:missingRecords.map(r=>r.character_code),
      existingRecordCount:records.length,oddsActive:false},null,2));
    if (apply) {
      if (records.length && records.some(r=>!r.character_code))
        throw Error("Existing records without character_code; refusing to write");
      for (const [field,type] of missingFields)
        await request("/fields/"+COLLECTION,"POST",{field,type,meta:{interface:type==="integer"?"input":"input"}});
      for (const record of missingRecords)
        await request("/items/"+COLLECTION,"POST",record);
      console.log("Installation complete. Rarity odds remain inactive.");
    }
  } catch(error) { console.error("Installer stopped:",error.message); process.exitCode=1; }
}
