/**
 * Read-only NFT Assembly -> Polygon printing handoff.
 * There is deliberately no wallet, contract write, batch execution, or route.
 * A preview or an incomplete rarity engine must never be printed.
 */
import {NFT_RULES_BOARD, NFT_RULES_BOARD_VERSION} from "./nftRulesBoardFrame.mjs";

export const NFT_PRINT_HANDOFF_VERSION = "ajine-nft-print-handoff-v1";
const freeze = value => Object.freeze(value);
const fail = (reason, identity = null) => freeze({
  version:NFT_PRINT_HANDOFF_VERSION, ok:false, status:"blocked", reason,
  identity, printable:false, mintEnabled:false, transactionSubmitted:false,
  metadata:null, contractRequest:null,
});

export function prepareNftPolygonPrintHandoff({
  gatheringBoard, rarityResult = null, rulesBoard = NFT_RULES_BOARD,
  artwork = null, metadataUri = null,
} = {}) {
  if(gatheringBoard?.version !== "ajine-nft-gathering-board-v1")
    return fail("invalid_gathering_board");
  const identity = gatheringBoard.identity;
  if(!identity?.registrationId || !identity.albumId || !identity.copyNumber)
    return fail("missing_copy_identity");
  const safeIdentity = freeze({
    registrationId:identity.registrationId,albumId:identity.albumId,copyNumber:identity.copyNumber,
  });
  if(gatheringBoard.mode !== "verified_projection" || gatheringBoard.stored !== false)
    return fail("verified_registration_required",safeIdentity);
  if(rulesBoard?.version !== NFT_RULES_BOARD_VERSION)
    return fail("invalid_rules_board",safeIdentity);
  if(!rulesBoard.activated || !rulesBoard.polygonDeploymentAuthorized)
    return fail("rules_board_inactive",safeIdentity);
  if(rarityResult?.finalized !== true || rarityResult?.persisted !== true ||
     rarityResult?.assigned !== true)
    return fail("rarity_not_finalized",safeIdentity);
  if(rarityResult?.registrationId !== identity.registrationId ||
     rarityResult?.albumId !== identity.albumId ||
     rarityResult?.copyNumber !== identity.copyNumber)
    return fail("rarity_identity_mismatch",safeIdentity);
  if(!Array.isArray(rarityResult.layerResults) ||
     rarityResult.layerResults.length < 2 ||
     rarityResult.layerResults.some(layer => layer?.finalized !== true))
    return fail("required_layers_incomplete",safeIdentity);
  if(typeof artwork?.originalCoverUrl !== "string" || !artwork.originalCoverUrl.trim() ||
     typeof metadataUri !== "string" || !metadataUri.trim())
    return fail("metadata_not_assembled",safeIdentity);
  // Even with all prerequisites satisfied, minting belongs exclusively to a
  // future secured Polygon print adapter with verified ownership and signer.
  return fail("polygon_print_adapter_not_installed",safeIdentity);
}
