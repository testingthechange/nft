/*
 * AJINE Album Rarity Engine Frame v1.
 * Contract-first, no evaluator, no assignment, no writes, no external I/O.
 * The engine consumes a Gathering Board projection and owns only its output.
 * A future Card/Jingle engine must have a separate frame and persistence.
 */
export const ALBUM_RARITY_FRAME_VERSION = "ajine-album-rarity-frame-v1";
export const ALBUM_RARITY_OUTPUT_VERSION = 1;
export const LAYER_ONE_GROUPS = Object.freeze([
  "first_issue", "milestone", "repeating", "sequential",
  "round_number", "lucky_clover", "palindrome",
]);
export const LAYER_ONE_LUCKY_NUMBERS = Object.freeze([7, 777, 7777]);

// Registries describe capability only; evaluation is deliberately disabled.
export const ALBUM_RARITY_LAYERS = Object.freeze([
  Object.freeze({
    id: "copy_number", layer: 1, enabled: false, implementation: "not_installed",
    rulesVersion: null, groups: LAYER_ONE_GROUPS,
    fallbackTitle: "Standard Edition", luckyNumbers: LAYER_ONE_LUCKY_NUMBERS,
  }),
  Object.freeze({ id: "future_layer_2", layer: 2, enabled: false, implementation: "reserved" }),
  Object.freeze({ id: "future_layer_3", layer: 3, enabled: false, implementation: "reserved" }),
]);
const owns = (value,key) => Object.prototype.hasOwnProperty.call(value,key);
const numericCopy = (value) => {
  if(typeof value !== "string" && typeof value !== "number") return false;
  const str = String(value);
  return /^[1-9][0-9]*$/.test(str) && Number.isSafeInteger(Number(str));
};
const emptyFrame = (status, reason = null) => Object.freeze({
  frameVersion: ALBUM_RARITY_FRAME_VERSION,
  outputVersion: ALBUM_RARITY_OUTPUT_VERSION,
  status, reason, owner: "nft.album-rarity-engine",
  collectibleType: "album_nft",
  identity: null, rulesVersion: null,
  layers: ALBUM_RARITY_LAYERS,
  layerResults: Object.freeze([]),
  primaryTitle: null,
  classifications: Object.freeze([]),
  stamp: null,
  assignmentId: null,
  persisted: false, finalized: false,
});

/**
 * Read only the Gathering Board's named registration slots.
 * Strictly distinguish synthetic mock data from trusted verified registration.
 * There is intentionally no client-supplied \u201cverified\u201d flag bypass here:
 * the upstream trusted service remains responsible for verification.
 */
export function prepareAlbumRarityFrame(gatheringBoard) {
  if(gatheringBoard?.version !== "ajine-nft-gathering-board-v1")
    return emptyFrame("blocked", "invalid_gathering_board");
  const mode = gatheringBoard.mode;
  if(mode !== "mock_preview" && mode !== "verified_projection")
    return emptyFrame("blocked", "registration_not_ready");
  const fields = gatheringBoard.groups?.registration;
  if(!fields || typeof fields !== "object")
    return emptyFrame("blocked", "missing_registration_slots");
  const expectedStatus = mode === "mock_preview" ? "mock_preview" : "ready";
  const keys = ["registrationId","albumId","copyNumber"];
  if(keys.some(key => !owns(fields,key) || fields[key]?.status !== expectedStatus ||
      typeof fields[key].value !== "string" || !fields[key].value.trim()))
    return emptyFrame("blocked", "invalid_registration_identity");
  if(fields.copyNumber.value.startsWith("COPY-BETA-")) {
    if(mode !== "mock_preview") return emptyFrame("blocked", "synthetic_copy_not_verified");
  } else if(!numericCopy(fields.copyNumber.value)) {
    return emptyFrame("blocked", "copy_number_not_numeric");
  }
  const identity = Object.freeze({
    registrationId: fields.registrationId.value,
    albumId: fields.albumId.value,
    copyNumber: fields.copyNumber.value,
  });
  return Object.freeze({
    ...emptyFrame(mode === "mock_preview" ? "preview_ready" : "input_ready"),
    reason: null, identity,
  });
}

/**
 * Future engine-to-Gathering Board output envelope. Output is always
 * non-final in Stage 1. The Board may display status but may not assign rarity.
 */
export function createAlbumRarityFrameReceipt(frame) {
  if(!frame || frame.frameVersion !== ALBUM_RARITY_FRAME_VERSION)
    return Object.freeze({ok:false, reason:"invalid_frame"});
  return Object.freeze({
    ok: frame.status === "input_ready" || frame.status === "preview_ready",
    frameVersion: ALBUM_RARITY_FRAME_VERSION,
    outputVersion: ALBUM_RARITY_OUTPUT_VERSION,
    status: frame.status,
    registrationId: frame.identity?.registrationId ?? null,
    albumId: frame.identity?.albumId ?? null,
    copyNumber: frame.identity?.copyNumber ?? null,
    assigned: false, finalized: false, persisted: false,
    layerResults: Object.freeze([]),
    primaryTitle: null, stamp: null,
  });
}
