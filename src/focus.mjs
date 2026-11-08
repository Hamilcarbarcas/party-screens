/**
 * Standing focus: narrows a display's vision to part of the party. DESIGN.md §7.1, §17.8.
 *
 * The focused set is cached until the next §4.3 refresh or canvas draw, since `_isVisionSource`
 * asks once per token.
 */

import { HOOK_CHANGED, MODULE_ID } from "./const.mjs";
import { isDisplayUser, profile, sceneOverride } from "./displays.mjs";
import { isPartyActor, refreshVision } from "./vision.mjs";
import { emit, onMessage } from "./socket.mjs";

/** The GM selection feed, `{sceneId, ids}` (§6.2). */
let selection = null;
/** `undefined`: stale. `null`: the whole party. Otherwise a Set of token ids. */
let focused;

/** §7.1: the scene's override, else the profile's default. */
export function focusMode(user = game.user, scene = canvas?.scene) {
  return sceneOverride(user, scene).focus ?? profile(user)?.focus ?? "off";
}

function focusIds() {
  const scene = canvas.scene;
  switch (focusMode()) {
    case "combat": {
      const combatant = game.combat?.started ? game.combat.combatant : null;
      return (combatant && !combatant.hidden && (combatant.sceneId === scene.id)) ? [combatant.tokenId] : [];
    }
    case "selection": return (selection?.sceneId === scene.id) ? selection.ids : [];
    case "tokens": return sceneOverride(game.user).focusTokens ?? [];
    default: return null;
  }
}

// Only player-owned tokens narrow anything: an NPC's turn, or no party token selected, shows the
// whole party (§16.3).
function compute() {
  if (!isDisplayUser() || !canvas?.scene) return null;
  const ids = focusIds()?.filter((id) => isPartyActor(canvas.scene.tokens.get(id)?.actor));
  return ids?.length ? new Set(ids) : null;
}

export function resetFocus() {
  focused = undefined;
}

/**
 * The §7.1 condition on top of the §4.1 rule. `canSee` is the rest of the rule. Narrows only while
 * a focused token can see, so a focus on a blind or hidden token never darkens the screen.
 */
export function inFocus(token, canSee) {
  if (focused === undefined) focused = compute();
  if (!focused || focused.has(token.id)) return true;
  for (const id of focused) {
    const other = canvas.tokens.get(id);
    if (other && canSee(other)) return false;
  }
  return true;
}

function live() {
  return isDisplayUser() && !!canvas?.ready;
}

function refreshIf(mode) {
  if (live() && (focusMode() === mode)) refreshVision();
}

// A display entering `selection` asks the GM for the current selection (§17.5).
function askFeeds() {
  if (live() && (focusMode() === "selection")) emit("hello");
}

export function registerFocus() {
  Hooks.on("canvasInit", resetFocus);
  Hooks.on("canvasReady", askFeeds);
  // The displays setting's own onChange refreshes vision (§4.3).
  Hooks.on(HOOK_CHANGED, askFeeds);
  Hooks.on("updateScene", (scene, changed) => {
    if (!live() || (scene !== canvas.scene) || !foundry.utils.hasProperty(changed, `flags.${MODULE_ID}`)) return;
    refreshVision();
    askFeeds();
  });
  for (const hook of ["createCombat", "updateCombat", "deleteCombat", "updateCombatant"]) {
    Hooks.on(hook, () => refreshIf("combat"));
  }
  // A focused token turning blind or hidden hands the view back to the party.
  Hooks.on("updateToken", (doc, changed) => {
    if (live() && (("hidden" in changed) || ("sight" in changed)) && focused?.has(doc.id)) refreshVision();
  });
  onMessage("selection", (m) => {
    selection = { sceneId: m.sceneId, ids: m.ids ?? [] };
    refreshIf("selection");
  });
}
