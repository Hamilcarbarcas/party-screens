/**
 * View boxes on GM clients: one outline per connected display, dragged by its edge to move that
 * display. DESIGN.md §6.5, §17.5.
 */

import { HOOK_CHANGED, MODULE_ID, SETTINGS } from "./const.mjs";
import { isDisplayUser, profile } from "./displays.mjs";
import { centerDisplay } from "./commands.mjs";
import { emit, onMessage } from "./socket.mjs";

const { PreciseText } = foundry.canvas.containers;

/** Grab band either side of the outline, in screen px. */
const BAND_PX = 10;
const LINE_PX = 3;

/** userId → the display's last report. Read by the panel. */
export const reports = new Map();
const listeners = new Set();
const boxes = new Map();
let container = null;
let drag = null;

/** The panel's status line follows reports. */
export function onReport(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function enabled() {
  return game.user.isGM && game.settings.get(MODULE_ID, SETTINGS.viewBox);
}

function ensureContainer() {
  if (container && !container.destroyed) return container;
  container = canvas.controls.addChild(new PIXI.Container());
  container.eventMode = "passive";
  container.interactiveChildren = true;
  return container;
}

function modeLabel(mode) {
  return mode ? game.i18n.localize(`PARTYSCREENS.Camera.Mode.${mode}`) : "";
}

function paint(box, user, r) {
  const scale = canvas.stage.scale.x;
  const w = r.w / r.scale;
  const h = r.h / r.scale;
  const x = r.x - (w / 2);
  const y = r.y - (h / 2);
  const band = BAND_PX / scale;
  const pad = 4 / scale;
  const [g, label] = box.children;

  label.text = [profile(user)?.label ?? user.name, modeLabel(r.mode)].filter(Boolean).join(" · ");
  label.scale.set(1 / scale);
  label.position.set(x + band + pad, y + band + pad);
  const lw = label.width + (2 * pad);
  const lh = label.height + (2 * pad);

  g.clear()
    .lineStyle(LINE_PX / scale, Number(user.color), 0.9)
    .drawRect(x, y, w, h)
    .lineStyle(0)
    .beginFill(0x000000, 0.55)
    .drawRect(x + band, y + band, lw, lh)
    .endFill();

  // The edge band and the label are grabbable; the inside stays clickable for the GM (§17.5).
  box.hitArea = {
    contains: (px, py) => {
      const outer = (px >= x - band) && (px <= x + w + band) && (py >= y - band) && (py <= y + h + band);
      const inner = (px > x + band) && (px < x + w - band) && (py > y + band) && (py < y + h - band);
      const onLabel = (px >= x + band) && (px <= x + band + lw) && (py >= y + band) && (py <= y + band + lh);
      return (outer && !inner) || onLabel;
    },
  };
}

function makeBox(userId) {
  const box = ensureContainer().addChild(new PIXI.Container());
  box.eventMode = "static";
  box.cursor = "move";
  box.addChild(new PIXI.Graphics());
  box.addChild(new PreciseText("", PreciseText.getTextStyle({ fontSize: 16 })));
  box.on("pointerdown", (event) => startDrag(event, userId, box));
  boxes.set(userId, box);
  return box;
}

export function drawBoxes() {
  if (!canvas?.ready || !game.user.isGM) return;
  const shown = new Set();
  if (enabled()) {
    for (const [userId, r] of reports) {
      const user = game.users.get(userId);
      if (!user?.active || !isDisplayUser(user) || (r.sceneId !== canvas.scene.id)) continue;
      shown.add(userId);
      const at = (drag?.userId === userId) ? { ...r, x: drag.x, y: drag.y } : r;
      paint(boxes.get(userId) ?? makeBox(userId), user, at);
    }
  }
  for (const [userId, box] of boxes) {
    if (shown.has(userId)) continue;
    box.destroy({ children: true });
    boxes.delete(userId);
  }
}

function startDrag(event, userId, box) {
  const r = reports.get(userId);
  if ((event.button !== 0) || !r) return;
  // Keep the canvas from starting a selection rectangle under the box.
  event.stopPropagation();
  const p = event.getLocalPosition(container);
  drag = { userId, dx: r.x - p.x, dy: r.y - p.y, x: r.x, y: r.y, timer: null };

  const sendNow = () => {
    drag.timer = null;
    centerDisplay(userId, drag.x, drag.y, { instant: true });
  };
  const move = (e) => {
    const q = e.getLocalPosition(container);
    drag.x = q.x + drag.dx;
    drag.y = q.y + drag.dy;
    drawBoxes();
    drag.timer ??= setTimeout(sendNow, 100);
  };
  const end = () => {
    box.off("globalpointermove", move);
    box.off("pointerup", end);
    box.off("pointerupoutside", end);
    clearTimeout(drag.timer);
    sendNow();
    // Hold the box where it was dropped until the display's next report.
    Object.assign(r, { x: drag.x, y: drag.y });
    drag = null;
    drawBoxes();
  };
  box.on("globalpointermove", move);
  box.on("pointerup", end);
  box.on("pointerupoutside", end);
}

export function registerViewBox() {
  onMessage("report", (m) => {
    if (!game.user.isGM) return;
    reports.set(m.from, m);
    drawBoxes();
    for (const fn of listeners) fn(m.from);
  });
  if (!game.user.isGM) return;

  Hooks.on("canvasReady", () => {
    container?.destroy({ children: true });
    container = null;
    boxes.clear();
    drawBoxes();
    emit("ask");
  });
  // Line widths and labels stay a fixed screen size.
  Hooks.on("canvasPan", () => drawBoxes());
  Hooks.on(HOOK_CHANGED, () => drawBoxes());
  Hooks.on("userConnected", (user, connected) => {
    if (!connected) reports.delete(user.id);
    drawBoxes();
    for (const fn of listeners) fn(user.id);
  });
}
