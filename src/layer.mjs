/**
 * The Party Screens scene control group and its canvas layer. DESIGN.md §6.5, §17.11.
 *
 * The layer draws nothing itself; the frames live on `canvas.controls` so they can also show, edge
 * draggable, while another control group is active. Selecting this group shows them and makes
 * their whole area draggable, since tokens take no clicks here.
 */

import { MODULE_ID, SETTINGS } from "./const.mjs";
import { drawBoxes } from "./viewbox.mjs";
import { PartyScreensPanel } from "./panel.mjs";

export const LAYER = "partyScreens";

export class PartyScreensLayer extends foundry.canvas.layers.InteractionLayer {
  /** @override */
  static get layerOptions() {
    return foundry.utils.mergeObject(super.layerOptions, { name: LAYER, zIndex: 0 });
  }

  /** @override */
  static prepareSceneControls() {
    if (!game.user.isGM) return null;
    return {
      name: LAYER,
      order: 20,
      title: "PARTYSCREENS.Controls.Title",
      layer: LAYER,
      icon: "fa-solid fa-presentation-screen",
      onChange: (_event, active) => {
        if (active) canvas[LAYER]?.activate();
      },
      tools: {
        frames: {
          name: "frames",
          order: 1,
          title: "PARTYSCREENS.Controls.Frames",
          icon: "fa-solid fa-expand",
        },
        alwaysShow: {
          name: "alwaysShow",
          order: 2,
          title: "PARTYSCREENS.Controls.AlwaysShow",
          icon: "fa-solid fa-eye",
          toggle: true,
          active: !!game.settings.get(MODULE_ID, SETTINGS.alwaysShowFrames),
          onChange: (_event, toggled) => game.settings.set(MODULE_ID, SETTINGS.alwaysShowFrames, toggled),
        },
        panel: {
          name: "panel",
          order: 3,
          title: "PARTYSCREENS.Panel.Title",
          icon: "fa-solid fa-sliders",
          button: true,
          onChange: () => PartyScreensPanel.open(),
        },
      },
      activeTool: "frames",
    };
  }

  /** @override */
  _activate() {
    super._activate();
    drawBoxes();
  }

  /** @override */
  _deactivate() {
    super._deactivate();
    drawBoxes();
  }
}

export function framesLayerActive() {
  return !!canvas?.[LAYER]?.active;
}

/** The setting changed elsewhere (the panel): keep the control's toggle in step. */
export function syncAlwaysShowTool(value) {
  const tool = ui.controls?.controls?.[LAYER]?.tools?.alwaysShow;
  if (!tool || (tool.active === !!value)) return;
  tool.active = !!value;
  ui.controls.render();
}

/** `init`: before the canvas builds its layers. */
export function registerLayer() {
  CONFIG.Canvas.layers[LAYER] = { layerClass: PartyScreensLayer, group: "interface" };
}
