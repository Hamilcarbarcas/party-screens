/**
 * Settings and keybindings. DESIGN.md §12. The `displays` setting lives in displays.mjs.
 */

import { MODULE_ID, SETTINGS } from "./const.mjs";
import { onScaleSettingChange } from "./camera.mjs";
import { drawBoxes } from "./viewbox.mjs";
import { applyUi, toggleUiLocally } from "./ui.mjs";
import { clearContent } from "./content.mjs";

export function registerSettings() {
  game.settings.register(MODULE_ID, SETTINGS.inchesPerGridSquare, {
    name: "PARTYSCREENS.Settings.InchesPerGridSquare.Name",
    hint: "PARTYSCREENS.Settings.InchesPerGridSquare.Hint",
    scope: "world",
    config: true,
    type: Number,
    default: 1,
    onChange: onScaleSettingChange,
  });

  game.settings.register(MODULE_ID, SETTINGS.pxPerInch, {
    name: "PARTYSCREENS.Settings.PxPerInch.Name",
    hint: "PARTYSCREENS.Settings.PxPerInch.Hint",
    scope: "client",
    config: true,
    type: Number,
    default: 0,
    onChange: onScaleSettingChange,
  });

  game.settings.register(MODULE_ID, SETTINGS.followPadding, {
    name: "PARTYSCREENS.Settings.FollowPadding.Name",
    hint: "PARTYSCREENS.Settings.FollowPadding.Hint",
    scope: "world",
    config: true,
    type: Number,
    default: 2,
  });

  game.settings.register(MODULE_ID, SETTINGS.panDuration, {
    name: "PARTYSCREENS.Settings.PanDuration.Name",
    hint: "PARTYSCREENS.Settings.PanDuration.Hint",
    scope: "world",
    config: true,
    type: Number,
    default: 600,
  });

  game.settings.register(MODULE_ID, SETTINGS.viewBox, {
    scope: "client",
    config: false,
    type: Boolean,
    default: true,
    onChange: () => drawBoxes(),
  });

  game.settings.register(MODULE_ID, SETTINGS.hideUi, {
    name: "PARTYSCREENS.Settings.HideUi.Name",
    hint: "PARTYSCREENS.Settings.HideUi.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => applyUi(),
  });

  game.settings.register(MODULE_ID, SETTINGS.imageCloseAfter, {
    name: "PARTYSCREENS.Settings.ImageCloseAfter.Name",
    hint: "PARTYSCREENS.Settings.ImageCloseAfter.Hint",
    scope: "world",
    config: true,
    type: Number,
    default: 0,
  });

  game.settings.register(MODULE_ID, SETTINGS.journalCloseAfter, {
    name: "PARTYSCREENS.Settings.JournalCloseAfter.Name",
    hint: "PARTYSCREENS.Settings.JournalCloseAfter.Hint",
    scope: "world",
    config: true,
    type: Number,
    default: 0,
  });

  game.settings.register(MODULE_ID, SETTINGS.closeOnGmClose, {
    name: "PARTYSCREENS.Settings.CloseOnGmClose.Name",
    hint: "PARTYSCREENS.Settings.CloseOnGmClose.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });
}

/** §8.1, §8.3 */
export function registerKeybindings() {
  game.keybindings.register(MODULE_ID, "toggleUi", {
    name: "PARTYSCREENS.Keys.ToggleUi.Name",
    hint: "PARTYSCREENS.Keys.ToggleUi.Hint",
    editable: [{ key: "KeyU", modifiers: ["Alt"] }],
    onDown: () => toggleUiLocally(),
  });

  game.keybindings.register(MODULE_ID, "clearImages", {
    name: "PARTYSCREENS.Keys.ClearImages.Name",
    editable: [{ key: "Comma", modifiers: ["Control"] }],
    restricted: true,
    onDown: () => {
      clearContent("image");
      return true;
    },
  });

  game.keybindings.register(MODULE_ID, "clearJournals", {
    name: "PARTYSCREENS.Keys.ClearJournals.Name",
    editable: [{ key: "Period", modifiers: ["Control"] }],
    restricted: true,
    onDown: () => {
      clearContent("journal");
      return true;
    },
  });
}
