/**
 * Combat tracker popout on displays. DESIGN.md §8.2, §17.8.
 *
 * The rows-shown rule and the saved position are adapted from Monk's Common Display (GPL-3.0),
 * `renderCombatTracker` and `persistCombatPosition` in monks-common-display.js.
 */

import { HOOK_CHANGED, MODULE_ID } from "./const.mjs";
import { isDisplayUser, profile } from "./displays.mjs";

const POSITION_FLAG = "combatPosition";
const DEFAULT_POSITION = Object.freeze({ top: 15, left: 5 });

/** The popout's pending render, so a close waits for it (§8.2). */
let opening = null;

function wanted() {
  return isDisplayUser() && !!profile().ui.combatPopout && !!game.combat?.started;
}

/** Open the popout while this scene's combat runs, close it when none does. */
export async function syncPopout() {
  if (!ui.combat) return;
  if (wanted()) {
    if (opening || ui.combat.popout?.rendered) return;
    opening = ui.combat.renderPopout();
    try {
      await opening;
    } finally {
      opening = null;
    }
    return;
  }
  // Closing mid-render leaves a half-built window behind.
  if (opening) await opening.catch(() => {});
  if (!wanted() && ui.combat.popout?.rendered) await ui.combat.popout.close();
}

// The current turn, then `combatShown` more, wrapping into the next round. Players never get hidden
// combatants; defeated ones won't act, so they're skipped.
function markRows(element) {
  const rows = [...element.querySelectorAll("li.combatant")];
  for (const row of rows) {
    row.classList.remove("ps-shown");
    row.style.removeProperty("order");
  }
  const current = rows.findIndex((row) => row.classList.contains("active"));
  if (current < 0) return;
  const shown = [rows[current]];
  const more = profile().combatShown ?? 0;
  for (let i = 1; (i < rows.length) && (shown.length <= more); i++) {
    const row = rows[(current + i) % rows.length];
    if (!row.classList.contains("defeated")) shown.push(row);
  }
  shown.forEach((row, i) => {
    row.classList.add("ps-shown");
    row.style.order = String(i);
  });
}

function onRenderTracker(app, element, _context, options) {
  if (!app.isPopout || !isDisplayUser()) return;
  if (options.isFirstRender) {
    const at = game.user.getFlag(MODULE_ID, POSITION_FLAG) ?? DEFAULT_POSITION;
    app.setPosition({ top: at.top, left: at.left });
  }
  const round = game.combat?.round;
  if (round && app.window?.title) app.window.title.textContent = game.i18n.format("COMBAT.Round", { round });
  markRows(element);
}

// Whoever drags the popout on the display's own machine sets where it opens next time.
const savePosition = foundry.utils.debounce(({ top, left }) => {
  const saved = game.user.getFlag(MODULE_ID, POSITION_FLAG);
  if ((saved?.top === top) && (saved?.left === left)) return;
  game.user.setFlag(MODULE_ID, POSITION_FLAG, { top, left });
}, 1000);

function trackPosition(wrapped, ...args) {
  const position = wrapped(...args);
  if (this.isPopout && position && isDisplayUser() && game.combat?.started) savePosition(position);
  return position;
}

export function registerCombat() {
  libWrapper.register(MODULE_ID, "foundry.applications.sidebar.tabs.CombatTracker.prototype.setPosition", trackPosition, "WRAPPER");
  Hooks.on("renderCombatTracker", onRenderTracker);
  for (const hook of ["createCombat", "updateCombat", "deleteCombat", "canvasReady", HOOK_CHANGED]) {
    Hooks.on(hook, () => syncPopout());
  }
  Hooks.once("ready", () => syncPopout());
}
