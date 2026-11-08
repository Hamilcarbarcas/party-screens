/**
 * Shared images and journals on displays. DESIGN.md §8.3, §17.8.
 *
 * The handling follows Monk's Common Display (GPL-3.0): close after a delay, close when the GM
 * closes, and clear hotkeys. Shares themselves are core's; displays are users, so they get them.
 */

import { MODULE_ID, SETTINGS } from "./const.mjs";
import { displayUsers, isDisplayUser, profile } from "./displays.mjs";
import { emit, onMessage } from "./socket.mjs";

export const CONTENT_KINDS = Object.freeze(["image", "journal"]);

/** Auto-close timers, restarted when the same window is shown again. */
const timers = new WeakMap();

/** `{kind, key}` for a shared image or journal window, else null. */
function contentOf(app) {
  if (app instanceof foundry.applications.apps.ImagePopout) return { kind: "image", key: app.options.src };
  if (app instanceof foundry.applications.sheets.journal.JournalEntrySheet) return { kind: "journal", key: app.document?.uuid };
  return null;
}

/** Open windows of `kind`; all of them when `key` is absent. */
function windows(kind, key) {
  return [...foundry.applications.instances.values()].filter((app) => {
    const content = contentOf(app);
    return (content?.kind === kind) && ((key === undefined) || (content.key === key));
  });
}

/* -------------------------------------------- */
/*  Display side                                */
/* -------------------------------------------- */

// Nothing opens on a display except what was shared to it.
function onRender(app, _element, _context, options) {
  if (!isDisplayUser() || !(options.isFirstRender || options.force)) return;
  const content = contentOf(app);
  if (!content) return;
  if (!profile().content) {
    app.close();
    return;
  }
  const seconds = game.settings.get(MODULE_ID, content.kind === "image" ? SETTINGS.imageCloseAfter : SETTINGS.journalCloseAfter);
  clearTimeout(timers.get(app));
  if (seconds > 0) timers.set(app, setTimeout(() => app.rendered && app.close(), seconds * 1000));
}

function onContent({ kind, key }) {
  if (!isDisplayUser() || !CONTENT_KINDS.includes(kind)) return;
  for (const app of windows(kind, key ?? undefined)) app.close();
}

/* -------------------------------------------- */
/*  GM side                                     */
/* -------------------------------------------- */

function anyDisplayOnline() {
  return displayUsers().some((u) => u.active);
}

function onGmClose(app) {
  if (!game.user.isGM || !game.settings.get(MODULE_ID, SETTINGS.closeOnGmClose) || !anyDisplayOnline()) return;
  const content = contentOf(app);
  if (content?.key) emit("content", content);
}

/** Close every shared image or journal (`kind`) on every display. GM only. */
export function clearContent(kind) {
  if (!game.user.isGM || !CONTENT_KINDS.includes(kind)) return;
  emit("content", { kind });
}

export function registerContent() {
  Hooks.on("renderImagePopout", onRender);
  Hooks.on("renderJournalEntrySheet", onRender);
  Hooks.on("closeImagePopout", onGmClose);
  Hooks.on("closeJournalEntrySheet", onGmClose);
  onMessage("content", onContent);
}
