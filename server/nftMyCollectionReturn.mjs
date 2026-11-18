// Pipeline 1 return contract. Read-only; never asserts ownership without proof.
export function buildMyCollectionReturn({registrationId,albumId,copyNumber,rarity=null,layerTwoRarity=null,polygon=null,synthetic=false}={}) {
  for(const [key,value] of Object.entries({registrationId,albumId,copyNumber})){
    if(typeof value!=='string'||!value.trim())throw Error('missing_'+key);
  }
  const verified=polygon?.verified===true && polygon?.chainId===80002 &&
    typeof polygon.contractAddress==='string' && /^0x[0-9a-fA-F]{40}$/.test(polygon.contractAddress) &&
    typeof polygon.tokenId==='string' && /^\d+$/.test(polygon.tokenId) &&
    typeof polygon.transactionHash==='string' && /^0x[0-9a-fA-F]{64}$/.test(polygon.transactionHash);
  return Object.freeze({
    schemaVersion:'ajine.my-collection.nft-return.v1',
    destination:'thirdparty.registration.board.nftReturn',
    registrationId,albumId,copyNumber,rarity,layerTwoRarity,
    nft:{network:'polygon-amoy',chainId:80002,
      contractAddress:verified?polygon.contractAddress:null,
      tokenId:verified?polygon.tokenId:null,
      transactionHash:verified?polygon.transactionHash:null,
      verificationStatus:verified&&!synthetic?'verified':'pending',
      ownershipConfirmed:verified&&!synthetic},
    fixtureOnly:synthetic,deliveryStatus:'not_sent',stored:false,minted:false
  });
}
