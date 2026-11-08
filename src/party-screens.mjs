import { MODULE_ID } from "./const.mjs";
import { primeDisplays, registerDisplaySettings } from "./displays.mjs";
import { registerVision } from "./vision.mjs";
import { registerPlayers } from "./players.mjs";
import { registerSettings, registerKeybindings } from "./settings.mjs";
import { registerSocket } from "./socket.mjs";
import { registerCamera } from "./camera.mjs";
import { registerCommands } from "./commands.mjs";
import { registerViewBox } from "./viewbox.mjs";
import { registerFocus } from "./focus.mjs";
import { registerUi } from "./ui.mjs";
import { registerCombat } from "./combat.mjs";
import { registerContent } from "./content.mjs";
import { registerPanel } from "./panel.mjs";
import { api } from "./api.mjs";

let available = false;

Hooks.once("init", () => {
  registerDisplaySettings();
  registerSettings();
  registerKeybindings();

  if (!game.modules.get("lib-wrapper")?.active) {
    console.error(`${MODULE_ID} | libWrapper is not active; party screens are disabled.`);
    return;
  }
  available = true;
  registerPlayers();
  registerPanel();
  game.modules.get(MODULE_ID).api = api;
});

// Before the first canvas draw, so a display's zoom range is in place for it (§6.4), and before the
// UI renders, so a display's hidden UI never flashes (§8.1).
Hooks.once("setup", () => {
  primeDisplays();
  if (!available) return;
  registerVision();
  registerSocket();
  registerCamera();
  registerCommands();
  registerViewBox();
  registerFocus();
  registerUi();
  registerCombat();
  registerContent();
});
