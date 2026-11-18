// Pipeline 1 return contract. Read-only; never asserts ownership without proof.
export function buildMyCollectionReturn({registrationId,albumId,copyNumber,rarity=null,layerTwoRarity=null,polygon=null,verifiedOwnershipAt=null,now=new Date(),synthetic=false}={}) {
  for(const [key,value] of Object.entries({registrationId,albumId,copyNumber})){
    if(typeof value!=='string'||!value.trim())throw Error('missing_'+key);
  }
  const verified=polygon?.verified===true && polygon?.chainId===80002 &&
    typeof polygon.contractAddress==='string' && /^0x[0-9a-fA-F]{40}$/.test(polygon.contractAddress) &&
    typeof polygon.tokenId==='string' && /^\d+$/.test(polygon.tokenId) &&
    typeof polygon.transactionHash==='string' && /^0x[0-9a-fA-F]{64}$/.test(polygon.transactionHash);
  let ownershipAgeDays=null;
  if(verified && !synthetic && verifiedOwnershipAt){
    const start=new Date(verifiedOwnershipAt).getTime();
    const end=new Date(now).getTime();
    if(!Number.isFinite(start)||!Number.isFinite(end)||start>end)throw Error('invalid_verified_ownership_date');
    ownershipAgeDays=Math.floor((end-start)/86400000);
  }
  return Object.freeze({
    schemaVersion:'ajine.my-collection.nft-return.v1',
    destination:'thirdparty.myCollection.ownershipAge',
    registrationId,albumId,copyNumber,rarity,layerTwoRarity,
    nft:{network:'polygon-amoy',chainId:80002,
      contractAddress:verified?polygon.contractAddress:null,
      tokenId:verified?polygon.tokenId:null,
      transactionHash:verified?polygon.transactionHash:null,
      verificationStatus:verified&&!synthetic?'verified':'pending',
      ownershipAgeDays,verifiedOwnershipAt:ownershipAgeDays===null?null:new Date(verifiedOwnershipAt).toISOString()},
    fixtureOnly:synthetic,deliveryStatus:'not_sent',stored:false,minted:false
  });
}
