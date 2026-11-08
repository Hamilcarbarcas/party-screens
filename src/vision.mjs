/**
 * Display vision and token presentation. DESIGN.md §4, §5, §7.1.
 */

import { MODULE_ID } from "./const.mjs";
import { isDisplayUser } from "./displays.mjs";
import { inFocus, resetFocus } from "./focus.mjs";

/** Owned by a non-GM user who is not a display. §4.1 */
export function isPartyActor(actor) {
  if (!actor) return false;
  return game.users.some((u) => !u.isGM && !isDisplayUser(u) && actor.testUserPermission(u, "OWNER"));
}

/** §4.1 without the focus condition. Controlled state is ignored: a display never selects. */
function canSee(token) {
  if (!canvas.visibility.tokenVision || !token.hasSight) return false;
  if (token.document.hidden) return false;
  return isPartyActor(token.actor);
}

function isDisplaySource(token) {
  return canSee(token) && inFocus(token, canSee);
}

// MIXED: display users skip the system's ownership-based answer entirely (§4.2).
function isVisionSource(wrapped, ...args) {
  if (!isDisplayUser()) return wrapped(...args);
  return isDisplaySource(this);
}

// §5. OWNER_HOVER counts as OWNER: a wall or table screen has no hover.
function canViewMode(wrapped, mode, ...args) {
  if (isDisplayUser()) {
    const modes = CONST.TOKEN_DISPLAY_MODES;
    if ((mode === modes.OWNER) || (mode === modes.OWNER_HOVER)) return isPartyActor(this.actor);
  }
  return wrapped(mode, ...args);
}

/** Re-decide vision membership and bar visibility on this client. §4.3 */
export function refreshVision() {
  resetFocus();
  if (!canvas?.ready) return;
  let changed = false;
  for (const token of canvas.tokens.placeables) {
    if (!token.vision === token._isVisionSource()) {
      token.initializeVisionSource();
      changed = true;
    }
    token.renderFlags.set({ refreshState: true });
  }
  if (changed) canvas.perception.update({ refreshVision: true });
}

/** `setup`: PF1 assigns its Token class during `init`, and its override does not call core's. */
export function registerVision() {
  libWrapper.register(MODULE_ID, "CONFIG.Token.objectClass.prototype._isVisionSource", isVisionSource, "MIXED");
  libWrapper.register(MODULE_ID, "foundry.canvas.placeables.Token.prototype._canViewMode", canViewMode, "MIXED");

  Hooks.on("updateActor", (actor, changed) => {
    if (("ownership" in changed) && isDisplayUser()) refreshVision();
  });
  Hooks.on("updateUser", (user, changed) => {
    if (("role" in changed) && isDisplayUser()) refreshVision();
  });
}
