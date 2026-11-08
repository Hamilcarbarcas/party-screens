/**
 * Display UI: what a screen shows besides the scene. DESIGN.md §8.1, §17.8.
 *
 * Body classes on display clients; the stylesheet does the hiding. The allowlist there is adapted
 * from Monk's Common Display (GPL-3.0).
 */

import { CHAT_MODES, HOOK_CHANGED, MODULE_ID, SETTINGS, UI_TOGGLES } from "./const.mjs";
import { isDisplayUser, profile } from "./displays.mjs";
import { onLayout } from "./camera.mjs";

const ROOT = "party-screens-ui";

/** The display-only keybinding's local override; a reload hides again. */
let shownLocally = false;

export function hidingUi() {
  return isDisplayUser() && !!game.settings.get(MODULE_ID, SETTINGS.hideUi) && !shownLocally;
}

// Collapsed, the chat log shows new messages as fading popups (core's chat notifications).
function setSidebar(chatLog) {
  if (!ui.sidebar?.rendered) return;
  if (chatLog === "expanded") {
    ui.sidebar.changeTab("chat", "primary");
    ui.sidebar.expand();
  } else {
    ui.sidebar.collapse();
  }
}

export function applyUi() {
  const on = hidingUi();
  const p = on ? profile() : null;
  const classes = document.body.classList;
  classes.toggle(ROOT, on);
  for (const key of UI_TOGGLES) classes.toggle(`ps-show-${key}`, on && !!p.ui[key]);
  for (const mode of CHAT_MODES) classes.toggle(`ps-chat-${mode}`, on && (p.ui.chatLog === mode));
  classes.toggle("ps-no-content", on && !p.content);
  if (on) setSidebar(p.ui.chatLog);
  onLayout();
}

/** Keybinding: show or hide the UI on this display only, until reload. */
export function toggleUiLocally() {
  if (!isDisplayUser()) return false;
  shownLocally = !shownLocally;
  applyUi();
  return true;
}

// MIXED: a display with no party token in sight isn't a player missing a character (§2.1).
function suppressNoVision(wrapped, message, ...args) {
  if ((message === "TOKEN.WarningNoVision") && isDisplayUser()) return;
  return wrapped(message, ...args);
}

export function registerUi() {
  libWrapper.register(MODULE_ID, "foundry.applications.ui.Notifications.prototype.warn", suppressNoVision, "MIXED");
  // Before the UI renders, so nothing flashes on a display; again once the sidebar exists.
  applyUi();
  Hooks.once("renderSidebar", () => applyUi());
  Hooks.once("ready", () => applyUi());
  Hooks.on(HOOK_CHANGED, () => applyUi());
}
