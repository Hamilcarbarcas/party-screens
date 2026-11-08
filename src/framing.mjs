/**
 * Target views for each camera mode. DESIGN.md §6.2, §6.4.
 *
 * A view is `{x, y, scale}`: the canvas point at the window's center, and the zoom. `area` is the
 * part of the window the canvas shows, `{width, height, left, right}`, with `left` and `right` the
 * docked UI covering each edge (§6.2 "Visible area").
 */

import { DEFAULT_PX_PER_INCH, MODULE_ID, SETTINGS } from "./const.mjs";
import { isDisplayUser } from "./displays.mjs";
import { isPartyActor } from "./vision.mjs";

/** §6.4 */
export function physicalScale() {
  const pxPerInch = game.settings.get(MODULE_ID, SETTINGS.pxPerInch) || DEFAULT_PX_PER_INCH;
  const inches = game.settings.get(MODULE_ID, SETTINGS.inchesPerGridSquare) || 1;
  return (pxPerInch * inches) / canvas.dimensions.size;
}

function isDefeated(doc) {
  return !!(doc.combatant?.defeated || doc.actor?.statuses?.has(CONFIG.specialStatusEffects.DEFEATED));
}

function onScene(doc) {
  return !!doc && (doc.parent === canvas.scene) && !doc.hidden;
}

function tokenRect(doc) {
  const { width, height } = doc.getSize?.() ?? {
    width: doc.width * canvas.dimensions.size,
    height: doc.height * canvas.dimensions.size,
  };
  return { x: doc.x, y: doc.y, width, height };
}

function union(docs) {
  if (!docs.length) return null;
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const doc of docs) {
    const r = tokenRect(doc);
    x1 = Math.min(x1, r.x);
    y1 = Math.min(y1, r.y);
    x2 = Math.max(x2, r.x + r.width);
    y2 = Math.max(y2, r.y + r.height);
  }
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

/** Player-owned, unhidden, not defeated (§6.2 `party`). */
export function partyTokens() {
  return canvas.scene.tokens.filter((d) => !d.hidden && isPartyActor(d.actor) && !isDefeated(d));
}

/**
 * The current combatant and the tokens its controllers target. A player-owned combatant's targets
 * come from its non-GM owners; an NPC's from the GMs. `null` outside a started combat here.
 */
function combatTokens() {
  const combat = game.combat;
  if (!combat?.started) return null;
  const combatant = combat.combatant;
  const doc = combatant?.token;
  if (combatant?.hidden || !onScene(doc)) return null;

  const playerOwned = isPartyActor(combatant.actor);
  const users = game.users.filter((u) => u.active && !isDisplayUser(u)
    && (playerOwned ? (!u.isGM && combatant.actor.testUserPermission(u, "OWNER")) : u.isGM));
  const targets = users.flatMap((u) => Array.from(u.targets, (t) => t.document)).filter(onScene);
  return [doc, ...new Set(targets)];
}

function listed(ids) {
  return (ids ?? []).map((id) => canvas.scene.tokens.get(id)).filter(onScene);
}

/** Center `rect` in the visible area, padded by `padding` px a side; fixed `scale` pans only. */
function frameRect(rect, area, { scale = null, padding = 0 } = {}) {
  const width = rect.width + (2 * padding);
  const height = rect.height + (2 * padding);
  scale ??= Math.min(area.width / width, area.height / height);
  // Shift the pivot so the rect centers in the visible area, not the window (§6.2).
  const shift = (area.left - area.right) / 2;
  return {
    x: rect.x + (rect.width / 2) - (shift / scale),
    y: rect.y + (rect.height / 2),
    scale,
  };
}

function fitScene(area, fit) {
  const r = canvas.dimensions.sceneRect;
  const sx = area.width / r.width;
  const sy = area.height / r.height;
  const scale = { outside: Math.max(sx, sy), horizontal: sx, vertical: sy }[fit] ?? Math.min(sx, sy);
  return frameRect(r, area, { scale });
}

export function initialView() {
  const { x, y, scale } = canvas.scene.initial ?? {};
  const r = canvas.dimensions.rect;
  return {
    x: x ?? (r.right / 2),
    y: y ?? (r.bottom / 2),
    scale: scale ?? canvas.dimensions.scale.default,
  };
}

/**
 * The view a mode asks for, or `null` to stay put. `state` carries what the client was told:
 * `{profile, override, area, selection, mirror}`. `physical` is handled by the camera (§6.4),
 * since only commands move it.
 */
export function targetView(mode, state) {
  const { profile, override, area } = state;
  const panOnly = profile.followScale === "pan-only";
  const opts = {
    scale: panOnly ? physicalScale() : null,
    padding: (game.settings.get(MODULE_ID, SETTINGS.followPadding) ?? 0) * canvas.dimensions.size,
  };
  const follow = (docs) => {
    const rect = union(docs?.length ? docs : partyTokens());
    return rect ? frameRect(rect, area, opts) : null;
  };

  switch (mode) {
    case "fit": return fitScene(area, profile.fit);
    case "initial": return initialView();
    case "mirror": {
      const m = state.mirror;
      if (!m || (m.sceneId !== canvas.scene.id)) return null;
      return { x: m.x, y: m.y, scale: panOnly ? physicalScale() : m.scale };
    }
    case "party": return follow(null);
    case "combat": return follow(combatTokens());
    case "selection": {
      const s = state.selection;
      return follow(s?.sceneId === canvas.scene.id ? listed(s.ids) : null);
    }
    case "tokens": return follow(listed(override.tokens));
    default: return null;
  }
}
