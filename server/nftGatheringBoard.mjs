/*
 * AJINE NFT Gathering Board — read-only contract, version 1.
 *
 * This board is a projection of independently owned data, not a database,
 * printer, minting service, validator of payment, or delivery queue.
 * It never changes the frozen mock registration intake.
 */
const slot = (source, destination, value = null) => Object.freeze({
  value: value === "" || value === undefined ? null : value,
  source,
  destination,
  status: value === null || value === "" || value === undefined ? "not_connected" : "ready",
});
const group = fields => Object.freeze(fields);
const REGISTRATION = "thirdparty.verified-registration";
const RARITY = "nft.album-rarity-printer";
const POLYGON = "polygon.verified-readback";
const STAMP = "nft.album-cover-stamp-printer";
const ASSEMBLY = "nft.album-assembly";
const RETURN = "nft.verified-return-json";
const BURN = "future.pipeline-2";

export const NFT_GATHERING_BOARD_GROUPS = Object.freeze([
  "registration", "albumRarity", "polygon", "provenance",
  "albumArtwork", "albumCoverStamps", "returnToThirdParty", "futureBurnJingleCards",
]);

export function buildNftGatheringBoard({ verifiedRegistration = null } = {}) {
  // A test-only preview MUST NOT be presented as a confirmed customer registration.
  // Actual authorization/payment checks belong to the trusted registration service.
  const r = verifiedRegistration?.verified === true ? verifiedRegistration.record ?? {} : {};
  const registration = group({
    registrationId: slot(REGISTRATION, "nft.Abum_Registration", r.registration_id),
    albumId: slot(REGISTRATION, "nft.Abum_Registration", r.album_id),
    copyNumber: slot(REGISTRATION, "nft.Abum_Registration", r.album_copy_number),
    registeredOwnerId: slot(REGISTRATION, "nft.Abum_Registration", r.registered_owner_id),
    purchaseTransactionId: slot(REGISTRATION, "nft.Abum_Registration", r.purchase_transaction_id),
    registrationDate: slot(REGISTRATION, "nft.Abum_Registration", r.registration_date),
  });
  return Object.freeze({
    version: "ajine-nft-gathering-board-v1",
    identity: group({
      registrationId: registration.registrationId.value,
      albumId: registration.albumId.value,
      copyNumber: registration.copyNumber.value,
    }),
    groups: Object.freeze({
      registration,
      albumRarity: group({
        character: slot(RARITY, "nft.album-assembly+thirdparty.myCollection"),
        tier: slot(RARITY, "nft.album-assembly+thirdparty.myCollection"),
        stampUrl: slot(RARITY, "nft.album-cover-stamps+thirdparty.myCollection"),
        editionNumber: slot(RARITY, "nft.album-assembly+thirdparty.myCollection"),
        editionLimit: slot(RARITY, "nft.album-assembly+thirdparty.myCollection"),
        assignmentId: slot(RARITY, "nft.album-rarity-record"),
      }),
      polygon: group({
        network: slot(POLYGON, "nft.NFT_Registry+thirdparty.myCollection"),
        contractAddress: slot(POLYGON, "nft.NFT_Registry+thirdparty.myCollection"),
        tokenId: slot(POLYGON, "nft.NFT_Registry+thirdparty.myCollection"),
        mintTransactionHash: slot(POLYGON, "nft.NFT_Registry+thirdparty.myCollection"),
        verifiedWallet: slot(POLYGON, "nft.NFT_Registry"),
      }),
      provenance: group({
        proofOfOwnership: slot(POLYGON, "thirdparty.myCollection"),
        ownershipHistoryReference: slot(POLYGON, "thirdparty.myCollection"),
        verificationStatus: slot(POLYGON, "nft.provenance+thirdparty.myCollection"),
      }),
      albumArtwork: group({
        originalCoverUrl: slot("thirdparty.published-album", "nft.album-assembly"),
        releaseYear: slot("thirdparty.published-album", "nft.album-assembly+thirdparty.myCollection"),
        assembledMetadataUri: slot(ASSEMBLY, "nft.NFT_Registry+thirdparty.myCollection"),
      }),
      // Deferred stamping: preserve original cover without modification.
      albumCoverStamps: group({
        smartBridgeSealUrl: slot(STAMP, "thirdparty.myCollection.albumCoverStamps"),
        provenanceSealUrl: slot(STAMP, "thirdparty.myCollection.albumCoverStamps"),
        rarityStampUrl: slot(STAMP, "thirdparty.myCollection.albumCoverStamps"),
        stampedCoverUrl: slot(STAMP, "thirdparty.myCollection.albumCoverStamps"),
        stampVersion: slot(STAMP, "thirdparty.myCollection.albumCoverStamps"),
        stampStatus: slot(STAMP, "thirdparty.myCollection.albumCoverStamps"),
      }),
      returnToThirdParty: group({
        registrationId: slot(RETURN, "thirdparty.myCollection.nftReturn"),
        albumId: slot(RETURN, "thirdparty.myCollection.nftReturn"),
        copyNumber: slot(RETURN, "thirdparty.myCollection.nftReturn"),
        payloadVersion: slot(RETURN, "thirdparty.myCollection.nftReturn"),
        verifiedResultReference: slot(RETURN, "thirdparty.myCollection.nftReturn"),
        deliveryStatus: slot("nft.outbound-delivery", "thirdparty.myCollection.nftReturn"),
      }),
      // Intentionally separate from the album rarity printer and its database.
      // No card engine, burn, Jingle release or Swag delivery is activated.
      futureBurnJingleCards: group({
        burnProofReference: slot(BURN, "nft.future-burn-registry"),
        cardRarityAssignment: slot("future.card-rarity-printer", "nft.future-card-rarity-database"),
        jingleReleaseReference: slot(BURN, "thirdparty.swag"),
      }),
    }),
  });
}
