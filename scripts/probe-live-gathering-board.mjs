// Strict synthetic-only check of the deployed NFT Gathering Board receipt.
// Does not use customer data, Directus, minting, or production registration.
const endpoint="https://ajine-nft-api.onrender.com/api/integrations/registration/mock-json";
const fixture=Object.freeze({
 schema_version:1,event_type:"album.registration.preview",payment_status:"test_only",
 registration_id:"REG-BETA-001",album_id:"ALBUM-BETA-001",
 album_copy_number:"COPY-BETA-001",registered_owner_id:"CLERK-BETA-001",
 purchase_transaction_id:"ORD-BETA-001",registration_date:"2026-11-16T19:00:00.000Z"
});
const expected={
 registrationId:fixture.registration_id,albumId:fixture.album_id,
 copyNumber:fixture.album_copy_number,registeredOwnerId:fixture.registered_owner_id,
 purchaseTransactionId:fixture.purchase_transaction_id,
 registrationDate:fixture.registration_date
};
const response=await fetch(endpoint,{
 method:"POST",
 headers:{"Content-Type":"application/json",Origin:"https://thirdparty-tz9x.onrender.com"},
 body:JSON.stringify(fixture),signal:AbortSignal.timeout(60000)
});
const result=await response.json();
if(response.status!==200||result.ok!==true||result.received!==true||
 result.validated!==true||result.mock_only!==true||result.stored!==false||
 result.minted!==false||result.gathering_board?.mode!=="mock_preview"||
 result.gathering_board?.version!=="ajine-nft-gathering-board-v1"||
 result.gathering_board?.stored!==false||result.gathering_board?.minted!==false){
 throw Error("LIVE_BOARD_RECEIPT_FAILED HTTP="+response.status+" reason="+(result.error??"missing_board"));
}
for(const [name,value] of Object.entries(expected)){
 const actual=result.gathering_board.registration_slots?.[name];
 if(actual?.value!==value||actual?.status!=="mock_preview")
  throw Error("LIVE_BOARD_SLOT_FAILED "+name+" value="+String(actual?.value)+" status="+String(actual?.status));
 console.log("PASS "+name+"="+actual.value+" status=mock_preview");
}
console.log("LIVE_NFT_GATHERING_BOARD_ALL_SIX_SLOTS_PASS stored=false minted=false");
