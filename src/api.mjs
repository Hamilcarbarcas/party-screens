/**
 * `game.modules.get("party-screens").api`. DESIGN.md §3.1, §17.5, §17.8.
 */

import { displayUsers, isDisplayUser, profile, setDisplay } from "./displays.mjs";
import { isPartyActor, refreshVision } from "./vision.mjs";
import { centerDisplay, resetView, sendView } from "./commands.mjs";
import { PartyScreensPanel } from "./panel.mjs";
import { clearContent } from "./content.mjs";
import { focusMode } from "./focus.mjs";

export const api = Object.freeze({
  isDisplayUser,
  displayUsers,
  profile,
  setDisplay,
  isPartyActor,
  refreshVision,
  sendView,
  centerDisplay,
  resetView,
  focusMode,
  clearContent,
  openPanel: () => PartyScreensPanel.open(),
});
