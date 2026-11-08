/**
 * The calibration square drawn on a display. DESIGN.md §6.4.
 *
 * Sized in CSS px, the unit the canvas scale maps to, and appended to `body` so the UI scale
 * (which applies inside `#interface`) leaves it alone.
 */

export const SQUARE_PX = 480;

const ID = "party-screens-calibration";

export function showSquare(px = SQUARE_PX) {
  hideSquare();
  const root = document.createElement("div");
  root.id = ID;
  root.innerHTML = `<div class="party-screens-calibration-label">${foundry.utils.escapeHTML(
    game.i18n.format("PARTYSCREENS.Calibrate.Square", { px }),
  )}</div><div class="party-screens-calibration-square"></div>`;
  root.querySelector(".party-screens-calibration-square").style.width = `${px}px`;
  root.querySelector(".party-screens-calibration-square").style.height = `${px}px`;
  document.body.append(root);
}

export function hideSquare() {
  document.getElementById(ID)?.remove();
}
