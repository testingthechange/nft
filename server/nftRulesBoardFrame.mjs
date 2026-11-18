/**
 * AJINE NFT Rules Board Frame v1.
 * A versioned policy projection, NOT a deployed Polygon contract.
 * Contract-enforceable rules must be independently implemented and tested in
 * Solidity before deployment. Commercial listening rights live off-chain.
 */
export const NFT_RULES_BOARD_VERSION = "ajine-nft-rules-board-v1";
const freeze = value => Object.freeze(value);
export const NFT_RULES_BOARD = freeze({
  version: NFT_RULES_BOARD_VERSION,
  status: "design_only",
  activated: false,
  polygonDeploymentAuthorized: false,
  rules: freeze({
    mint: freeze({oneTokenPerAlbumCopy:true,verifiedRegistrationRequired:true,allRequiredRarityLayersFinal:true}),
    burn: freeze({permanentTokenDestruction:true,noRemintOfCopy:true,oneRewardClaimPerBurn:true,implementation:"future_pipeline_2"}),
    export: freeze({activeTokenRequired:true,blockAfterBurn:true,commercialEntitlementChange:"requires_separate_thirdparty_action"}),
    listening: freeze({afterBurn:"retain_in_site_album_access",enforcementOwner:"thirdparty.account"}),
    rewards: freeze({owner:"future.pipeline_2.rewards",campaignDefined:true,notHardcodedInPolygon:true}),
  }),
});
export function getNftRulesBoardFrame() {
  return NFT_RULES_BOARD;
}
