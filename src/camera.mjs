/**
 * A display's camera: the one writer of its view. DESIGN.md §6, §17.5.
 *
 * Everything here acts only on a display client. Other clients register the wrappers and hooks
 * but return at the first `live()` check.
 */

import { FOLLOW_MODES, HOOK_CHANGED, MODULE_ID, SETTINGS } from "./const.mjs";
import { cameraMode, isDisplayUser, profile, sceneOverride } from "./displays.mjs";
import { initialView, physicalScale, targetView } from "./framing.mjs";
import { hideSquare, showSquare } from "./calibration.mjs";
import { emit, onMessage } from "./socket.mjs";

const { CanvasAnimation } = foundry.canvas.animation;

const ANIMATION = `${MODULE_ID}.camera`;
/** Wide enough for physical scale and any fit on a display, which no one zooms by hand (§6.4). */
const ZOOM = Object.freeze({ min: 0.05, max: 8 });
/** Modes that keep a commanded view until their target changes (§6.5). */
const STATIC_MODES = new Set(["fit", "initial"]);
const FOLLOW_KEYS = ["x", "y", "width", "height", "hidden"];

let issuing = false;
/** `{sceneId, x, y, scale}` from the last GM command. */
let manual = null;
/** GM feeds (§6.2 `selection`, `mirror`). */
let selection = null;
let mirror = null;
let configKey = null;
let insets = { left: 0, right: 0 };
let savedZoom = null;
let observer = null;
let scheduleTimer = null;
let resizeTimer = null;
let reportTimer = null;

function live() {
  return isDisplayUser() && !!canvas?.ready;
}

function panDuration() {
  return game.settings.get(MODULE_ID, SETTINGS.panDuration) ?? 600;
}

function current() {
  return { x: canvas.stage.pivot.x, y: canvas.stage.pivot.y, scale: canvas.stage.scale.x };
}

/* -------------------------------------------- */
/*  Pans                                        */
/* -------------------------------------------- */

// The flag is set and cleared synchronously around the one call, never across an await (§2.3.2).
function issue(view) {
  issuing = true;
  try {
    canvas.pan(view);
  } finally {
    issuing = false;
  }
}

// WRAPPER on Canvas#pan: on a display, any pan not issued here keeps the current view (§6.3).
function guardPan(wrapped, view, ...args) {
  if (issuing || !live()) return wrapped(view, ...args);
  return wrapped(current(), ...args);
}

// WRAPPER on ControlsLayer#handlePing: a GM's pull-ping recenters the display through the camera
// and still draws the ping (§6.3).
function routePing(wrapped, user, position, data, ...args) {
  if (live() && data?.pull && user?.isGM && position && (data.scene === canvas.scene.id)) {
    command({ x: position.x, y: position.y }, panDuration());
    return wrapped(user, position, { ...data, pull: false }, ...args);
  }
  return wrapped(user, position, data, ...args);
}

function close(a, b) {
  return (Math.abs(a.x - b.x) < 0.5) && (Math.abs(a.y - b.y) < 0.5) && (Math.abs(a.scale - b.scale) < (b.scale * 0.001));
}

function moveTo(view, duration) {
  if (!view) return;
  CanvasAnimation.terminateAnimation(ANIMATION);
  // Compare after core's clamp, or an out-of-range target re-animates on every trigger.
  const target = canvas._constrainView(view);
  const from = current();
  if (close(from, target)) return;
  if (!(duration > 0)) return issue(target);
  const position = { ...from };
  CanvasAnimation.animate([
    { parent: position, attribute: "x", to: target.x },
    { parent: position, attribute: "y", to: target.y },
    { parent: position, attribute: "scale", to: target.scale },
  ], {
    name: ANIMATION,
    duration,
    easing: CanvasAnimation.easeInOutCosine,
    ontick: () => issue(position),
  });
}

/* -------------------------------------------- */
/*  Physical position                           */
/* -------------------------------------------- */

// Kept on the display machine so a reload puts the view back under the minis (§17.5).
function storageKey() {
  return `${MODULE_ID}.physical.${canvas.scene.id}`;
}

function loadPhysical() {
  try {
    return JSON.parse(localStorage.getItem(storageKey()) ?? "null");
  } catch (_) {
    return null;
  }
}

function savePhysical(at) {
  try {
    if (at) localStorage.setItem(storageKey(), JSON.stringify({ x: at.x, y: at.y }));
    else localStorage.removeItem(storageKey());
  } catch (_) {
    // Storage blocked: the position lasts until reload.
  }
}

function manualHere() {
  return (manual?.sceneId === canvas.scene.id) ? manual : null;
}

function physicalView() {
  const at = manualHere() ?? loadPhysical() ?? initialView();
  return { x: at.x, y: at.y, scale: physicalScale() };
}

/* -------------------------------------------- */
/*  Applying the mode                           */
/* -------------------------------------------- */

function area() {
  return {
    width: Math.max(window.innerWidth - insets.left - insets.right, 1),
    height: window.innerHeight,
    left: insets.left,
    right: insets.right,
  };
}

/** Re-decide the view from the mode. Physical always jumps: minis sit on it (§9.2). */
export function apply({ duration } = {}) {
  if (!live()) return;
  const mode = cameraMode();
  const p = profile();
  const override = sceneOverride(game.user);

  const key = JSON.stringify([canvas.scene.id, mode, p.followScale, p.fit, override.tokens ?? null]);
  if (key !== configKey) {
    configKey = key;
    manual = null;
    // The feeds only flow while someone needs them; ask for the current values (§17.5).
    if ((mode === "mirror") || (mode === "selection")) emit("hello");
  }

  if (mode === "physical") return moveTo(physicalView(), 0);
  const view = (STATIC_MODES.has(mode) && manualHere()) || targetView(mode, { profile: p, override, area: area(), selection, mirror });
  moveTo(view, duration ?? panDuration());
}

/** Follow modes re-frame on movement and combat changes, coalesced (§6.2). */
function schedule() {
  if (!live() || !FOLLOW_MODES.includes(cameraMode())) return;
  clearTimeout(scheduleTimer);
  scheduleTimer = setTimeout(() => apply(), 150);
}

/**
 * A GM command: `center` keeps the display's scale, `view` and `zoom` set it too, except in
 * physical mode. Follow modes keep either only until their next re-frame (§17.10).
 */
function command({ x, y, scale }, duration) {
  const physical = cameraMode() === "physical";
  manual = { sceneId: canvas.scene.id, x, y, scale: physical ? physicalScale() : (scale ?? canvas.stage.scale.x) };
  if (physical) savePhysical(manual);
  moveTo(manual, physical ? 0 : duration);
}

function calibrate({ action, px, pxPerInch }) {
  if (action === "show") return showSquare(px);
  hideSquare();
  if ((action === "set") && (pxPerInch > 0)) game.settings.set(MODULE_ID, SETTINGS.pxPerInch, pxPerInch);
}

function onCamera(message) {
  if (!live()) return;
  if (message.command === "calibrate") return calibrate(message);
  if (message.sceneId && (message.sceneId !== canvas.scene.id)) return;
  const duration = message.instant ? 0 : panDuration();
  switch (message.command) {
    case "view": return command({ x: message.x, y: message.y, scale: message.scale }, duration);
    case "center": return command({ x: message.x, y: message.y }, duration);
    case "zoom": return command({ x: message.x, y: message.y, scale: message.scale }, duration);
    case "reset":
      manual = null;
      if (cameraMode() === "physical") savePhysical(null);
      return apply();
  }
}

/* -------------------------------------------- */
/*  Layout                                      */
/* -------------------------------------------- */

/** The sidebar is the only docked element the wall keeps over the canvas (§6.2). */
function measureInsets() {
  const el = document.getElementById("sidebar");
  const r = el?.getBoundingClientRect();
  const visible = !!r && (r.width > 0) && (el.checkVisibility?.() ?? true);
  insets = { left: 0, right: visible ? Math.max(window.innerWidth - r.left, 0) : 0 };
}

// Measured once the layout settles, never mid-transition (§2.3.3). Also called when the display UI
// changes (§8.1).
export function onLayout() {
  if (!isDisplayUser()) return;
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (!live()) return;
    measureInsets();
    apply({ duration: 0 });
    report();
  }, 250);
}

function observeLayout() {
  if (observer) return;
  const el = document.getElementById("sidebar");
  if (!el) return;
  observer = new ResizeObserver(onLayout);
  observer.observe(el);
}

/** On a display, the zoom range covers the camera's scales, and core's resize keeps it (§2.3.1). */
function applyZoomRange() {
  if (isDisplayUser()) {
    savedZoom ??= { min: CONFIG.Canvas.minZoom, max: CONFIG.Canvas.maxZoom };
    CONFIG.Canvas.minZoom = ZOOM.min;
    CONFIG.Canvas.maxZoom = ZOOM.max;
    const scale = canvas?.dimensions?.scale;
    if (scale) Object.assign(scale, { min: ZOOM.min, max: ZOOM.max });
  } else if (savedZoom) {
    CONFIG.Canvas.minZoom = savedZoom.min;
    CONFIG.Canvas.maxZoom = savedZoom.max;
    savedZoom = null;
    if (canvas?.ready) canvas._onResize();
  }
}

/* -------------------------------------------- */
/*  Reports                                     */
/* -------------------------------------------- */

/** The view box on GM clients (§6.5), trailing by 200 ms. */
function report() {
  if (reportTimer || !live()) return;
  reportTimer = setTimeout(() => {
    reportTimer = null;
    if (!live()) return;
    const [w, h] = canvas.screenDimensions;
    emit("report", {
      sceneId: canvas.scene.id,
      ...current(),
      w,
      h,
      mode: cameraMode(),
      pxPerInch: game.settings.get(MODULE_ID, SETTINGS.pxPerInch) || 0,
    });
  }, 200);
}

/* -------------------------------------------- */
/*  Registration                                */
/* -------------------------------------------- */

function onCanvasReady() {
  if (!isDisplayUser()) return;
  configKey = null;
  observeLayout();
  measureInsets();
  apply({ duration: 0 });
  report();
}

function onDisplaysChanged() {
  applyZoomRange();
  if (live()) {
    observeLayout();
    measureInsets();
    apply();
    report();
    return;
  }
  CanvasAnimation.terminateAnimation(ANIMATION);
  hideSquare();
  configKey = null;
}

/** Called by the settings that change the physical scale. */
export function onScaleSettingChange() {
  if (!live()) return;
  apply({ duration: 0 });
  report();
}

/** `setup`: before the first canvas draw, so the zoom range is in place for it. */
export function registerCamera() {
  libWrapper.register(MODULE_ID, "foundry.canvas.Canvas.prototype.pan", guardPan, "WRAPPER");
  libWrapper.register(MODULE_ID, "foundry.canvas.layers.ControlsLayer.prototype.handlePing", routePing, "WRAPPER");
  applyZoomRange();

  Hooks.on("canvasReady", onCanvasReady);
  Hooks.on("canvasPan", () => report());
  Hooks.on(HOOK_CHANGED, onDisplaysChanged);
  Hooks.on("updateScene", (scene, changed) => {
    if ((scene === canvas?.scene) && foundry.utils.hasProperty(changed, `flags.${MODULE_ID}`)) apply();
  });
  window.addEventListener("resize", onLayout, { passive: true });

  Hooks.on("updateToken", (doc, changed) => {
    if ((doc.parent === canvas?.scene) && FOLLOW_KEYS.some((k) => k in changed)) schedule();
  });
  for (const hook of ["createToken", "deleteToken", "updateCombat", "deleteCombat", "updateCombatant",
    "targetToken", "createActiveEffect", "deleteActiveEffect"]) {
    Hooks.on(hook, () => schedule());
  }
  Hooks.on("updateActor", (_actor, changed) => {
    if ("ownership" in changed) schedule();
  });

  onMessage("camera", onCamera);
  onMessage("ask", () => report());
  onMessage("mirror", (m) => {
    mirror = m;
    if (live() && (cameraMode() === "mirror")) apply({ duration: 200 });
  });
  onMessage("selection", (m) => {
    selection = { sceneId: m.sceneId, ids: m.ids ?? [] };
    if (live() && (cameraMode() === "selection")) apply();
  });
}
