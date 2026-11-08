/**
 * Display users and their profiles. DESIGN.md §3.
 *
 * The `displays` setting is read on every vision and bar test, so it is held in a module variable;
 * `onChange` keeps it current.
 */

import { HOOK_CHANGED, MODULE_ID, SETTINGS } from "./const.mjs";
import { refreshVision } from "./vision.mjs";

/**
 * §3.2. Stored entries hold `preset`, `label` and any overrides; the preset fills the rest.
 * `combatShown` counts the turns after the current one (§8.2); `chatLog` is one of CHAT_MODES.
 */
export const PRESETS = Object.freeze({
  table: Object.freeze({
    camera: "physical",
    followScale: "pan-only",
    fit: "inside",
    focus: "off",
    moveFocus: true,
    ui: Object.freeze({
      sceneNavigation: false,
      chatLog: "off",
      tokenBar: false,
      combatPopout: false,
      cameraViews: false,
      notifications: false,
    }),
    combatShown: 1,
    content: false,
  }),
  wall: Object.freeze({
    camera: "party",
    followScale: "fit",
    fit: "inside",
    focus: "off",
    moveFocus: false,
    ui: Object.freeze({
      sceneNavigation: false,
      chatLog: "expanded",
      tokenBar: true,
      combatPopout: true,
      cameraViews: false,
      notifications: false,
    }),
    combatShown: 3,
    content: true,
  }),
});

let displays = {};

function read() {
  try {
    return foundry.utils.deepClone(game.settings.get(MODULE_ID, SETTINGS.displays) ?? {});
  } catch (_) {
    return {};
  }
}

export function isDisplayUser(user = game.user) {
  return !!user && !user.isGM && Object.hasOwn(displays, user.id);
}

export function displayUsers() {
  return Object.keys(displays)
    .map((id) => game.users.get(id))
    .filter((u) => u && !u.isGM);
}

export function profile(user = game.user) {
  if (!isDisplayUser(user)) return null;
  const entry = displays[user.id];
  const preset = PRESETS[entry.preset] ?? PRESETS.wall;
  return foundry.utils.mergeObject(foundry.utils.deepClone(preset), entry, { inplace: false });
}

/** `preset` null removes the user. GM only: the setting is world scope. */
export async function setDisplay(userId, preset) {
  if (!game.user.isGM) return;
  const next = foundry.utils.deepClone(displays);
  if (preset) {
    next[userId] = { preset, label: game.i18n.localize(`PARTYSCREENS.Preset.${preset}`) };
  } else {
    delete next[userId];
  }
  await game.settings.set(MODULE_ID, SETTINGS.displays, next);
}

/**
 * Merge `patch` into a display's stored entry. Keys may be paths (`ui.tokenBar`); a `null` value
 * drops that override. GM only.
 */
export async function updateProfile(userId, patch) {
  if (!game.user.isGM || !Object.hasOwn(displays, userId)) return;
  const next = foundry.utils.deepClone(displays);
  const entry = next[userId];
  for (const [key, value] of Object.entries(patch)) {
    if (value !== null) {
      foundry.utils.setProperty(entry, key, value);
      continue;
    }
    const parts = key.split(".");
    const last = parts.pop();
    const parent = parts.length ? foundry.utils.getProperty(entry, parts.join(".")) : entry;
    if (parent) delete parent[last];
  }
  await game.settings.set(MODULE_ID, SETTINGS.displays, next);
}

/** Switch a display to another preset, dropping its overrides. A preset-named label follows. GM only. */
export async function setPreset(userId, preset) {
  if (!game.user.isGM || !Object.hasOwn(displays, userId) || !PRESETS[preset]) return;
  const old = displays[userId];
  const oldName = game.i18n.localize(`PARTYSCREENS.Preset.${old.preset}`);
  const label = (old.label && (old.label !== oldName)) ? old.label : game.i18n.localize(`PARTYSCREENS.Preset.${preset}`);
  const next = foundry.utils.deepClone(displays);
  next[userId] = { preset, label };
  await game.settings.set(MODULE_ID, SETTINGS.displays, next);
}

/** The scene's override for one display (§3.2), or `{}`. */
export function sceneOverride(user, scene = canvas?.scene) {
  return scene?.getFlag(MODULE_ID, `displays.${user.id}`) ?? {};
}

/** A `null` value drops that key, falling back to the profile. GM only. */
export async function setSceneOverride(scene, userId, patch) {
  if (!game.user.isGM || !scene) return;
  const update = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) update[`flags.${MODULE_ID}.displays.${userId}.-=${key}`] = null;
    else update[`flags.${MODULE_ID}.displays.${userId}.${key}`] = value;
  }
  await scene.update(update);
}

/** §6.2: the scene's override, else the profile's default. */
export function cameraMode(user = game.user, scene = canvas?.scene) {
  return sceneOverride(user, scene).camera ?? profile(user)?.camera ?? null;
}

// onChange also fires when a Setting document is first created with an unchanged value.
function onDisplaysChange(value) {
  const next = foundry.utils.deepClone(value ?? {});
  if (foundry.utils.objectsEqual(next, displays)) return;

  const wasDisplay = isDisplayUser();
  displays = next;

  ui.players?.render();
  // On a display, any change can move the set of party actors (§4.1); elsewhere only a status flip matters.
  if (wasDisplay || isDisplayUser()) refreshVision();
  Hooks.callAll(HOOK_CHANGED, displayUsers());
}

export function registerDisplaySettings() {
  game.settings.register(MODULE_ID, SETTINGS.displays, {
    scope: "world",
    config: false,
    type: Object,
    default: {},
    onChange: onDisplaysChange,
  });
}

/** After registration; `onChange` keeps it current from then on. */
export function primeDisplays() {
  displays = read();
}
