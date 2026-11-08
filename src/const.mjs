export const MODULE_ID = "party-screens";

export const SETTINGS = Object.freeze({
  displays: "displays",
  inchesPerGridSquare: "inchesPerGridSquare",
  pxPerInch: "pxPerInch",
  followPadding: "followPadding",
  panDuration: "panDuration",
  viewBox: "viewBox",
  hideUi: "hideUi",
  imageCloseAfter: "imageCloseAfter",
  journalCloseAfter: "journalCloseAfter",
  closeOnGmClose: "closeOnGmClose",
});

export const HOOK_CHANGED = "partyScreensChanged";

/** §6.2 */
export const CAMERA_MODES = Object.freeze(["physical", "fit", "initial", "mirror", "party", "combat", "selection", "tokens"]);
export const FOLLOW_MODES = Object.freeze(["mirror", "party", "combat", "selection", "tokens"]);
export const FIT_MODES = Object.freeze(["inside", "outside", "horizontal", "vertical"]);
export const FOLLOW_SCALES = Object.freeze(["fit", "pan-only"]);

/** §7.1 */
export const FOCUS_MODES = Object.freeze(["off", "combat", "selection", "tokens"]);

/** §8.1: profile `ui` keys shown as on/off toggles; `chatLog` takes one of CHAT_MODES. */
export const UI_TOGGLES = Object.freeze(["sceneNavigation", "tokenBar", "combatPopout", "cameraViews", "notifications"]);
export const CHAT_MODES = Object.freeze(["off", "collapsed", "expanded"]);

/** Uncalibrated displays assume the CSS inch (§6.4). */
export const DEFAULT_PX_PER_INCH = 96;
