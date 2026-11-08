/**
 * GM side of the camera: commands to one display, and the mirror and selection feeds. DESIGN.md
 * §6.2, §6.5.
 */

import { cameraMode, displayUsers } from "./displays.mjs";
import { SQUARE_PX } from "./calibration.mjs";
import { emit, onMessage } from "./socket.mjs";

function send(userId, command, payload = {}) {
  if (!game.user.isGM) return;
  emit("camera", { ...payload, to: userId, command });
}

/** The display takes the GM's pivot; its scale too, unless it is in physical mode. */
export function sendView(userId) {
  if (!canvas?.ready) return;
  const { x, y } = canvas.stage.pivot;
  send(userId, "view", { sceneId: canvas.scene.id, x, y, scale: canvas.stage.scale.x });
}

export function centerDisplay(userId, x, y, { instant = false } = {}) {
  if (!canvas?.ready) return;
  send(userId, "center", { sceneId: canvas.scene.id, x, y, instant });
}

/** Center and zoom at once, from a frame drag with the wheel (§17.11). Not for physical mode. */
export function zoomDisplay(userId, x, y, scale) {
  if (!canvas?.ready) return;
  send(userId, "zoom", { sceneId: canvas.scene.id, x, y, scale, instant: true });
}

/** Back to what the mode asks for, dropping any commanded view. */
export function resetView(userId) {
  send(userId, "reset");
}

export function showCalibration(userId) {
  send(userId, "calibrate", { action: "show", px: SQUARE_PX });
}

export function hideCalibration(userId) {
  send(userId, "calibrate", { action: "hide" });
}

/** `inches`: the square's measured width. §6.4 */
export function saveCalibration(userId, inches) {
  if (!(inches > 0)) return;
  send(userId, "calibrate", { action: "set", pxPerInch: SQUARE_PX / inches });
}

/* -------------------------------------------- */
/*  Feeds                                       */
/* -------------------------------------------- */

// One GM feeds the displays, so two GMs never fight over them.
function isFeeder() {
  return game.user.isGM && (game.users.activeGM === game.user);
}

function anyDisplayIn(mode) {
  return displayUsers().some((u) => u.active && (u.viewedScene === canvas.scene?.id) && (cameraMode(u, canvas.scene) === mode));
}

function sendMirror(to) {
  if (!canvas?.ready) return;
  const { x, y } = canvas.stage.pivot;
  emit("mirror", { to, sceneId: canvas.scene.id, x, y, scale: canvas.stage.scale.x });
}

function sendSelection(to) {
  if (!canvas?.ready) return;
  emit("selection", { to, sceneId: canvas.scene.id, ids: canvas.tokens.controlled.map((t) => t.id) });
}

let mirrorTimer = null;
let selectionTimer = null;

export function registerCommands() {
  if (!game.user.isGM) return;

  Hooks.on("canvasPan", () => {
    if (mirrorTimer || !isFeeder() || !anyDisplayIn("mirror")) return;
    mirrorTimer = setTimeout(() => {
      mirrorTimer = null;
      sendMirror();
    }, 150);
  });

  Hooks.on("controlToken", () => {
    if (!isFeeder()) return;
    clearTimeout(selectionTimer);
    selectionTimer = setTimeout(() => sendSelection(), 100);
  });

  // A display entering mirror or selection mode asks for the current values.
  onMessage("hello", (m) => {
    if (!isFeeder()) return;
    sendMirror(m.from);
    sendSelection(m.from);
  });
}
