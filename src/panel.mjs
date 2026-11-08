/**
 * GM control panel. DESIGN.md §10, §17.5, §17.8, §17.11.
 *
 * One tab per display (screen, camera, focus, screen UI) and a General tab (adding screens, world
 * settings, shared content).
 */

import {
  ASTORA_TOGGLES, CAMERA_MODES, CHAT_MODES, FIT_MODES, FOCUS_MODES, FOLLOW_SCALES, HOOK_CHANGED, MODULE_ID, SETTINGS,
  UI_TOGGLES,
} from "./const.mjs";
import {
  PRESETS, displayUsers, isDisplayUser, profile, sceneOverride, setDisplay, setPreset, setSceneOverride, updateProfile,
} from "./displays.mjs";
import { hideCalibration, resetView, saveCalibration, sendView, showCalibration } from "./commands.mjs";
import { onReport, reports } from "./viewbox.mjs";
import { ownedActors, stripOwnership } from "./players.mjs";
import { clearContent } from "./content.mjs";

const { ApplicationV2, DialogV2 } = foundry.applications.api;
const esc = (value) => foundry.utils.escapeHTML(String(value ?? ""));
const t = (key, data) => (data ? game.i18n.format(`PARTYSCREENS.${key}`, data) : game.i18n.localize(`PARTYSCREENS.${key}`));

const GENERAL = "general";
/** Profile fields set straight from a same-named select. */
const PROFILE_SELECTS = new Set(["camera", "followScale", "fit", "focus"]);

function options(values, selected, labelKey) {
  return values.map((v) => `<option value="${esc(v)}" ${v === selected ? "selected" : ""}>${esc(t(`${labelKey}.${v}`))}</option>`).join("");
}

function field(label, control, tooltip) {
  const tip = tooltip ? ` data-tooltip="${esc(tooltip)}"` : "";
  return `<div class="form-group"><label${tip}>${esc(label)}</label><div class="form-fields">${control}</div></div>`;
}

function checkbox(name, checked) {
  return `<input type="checkbox" name="${esc(name)}" ${checked ? "checked" : ""}>`;
}

function header(icon, label, extra = "") {
  return `<h3 class="form-header"><i class="fa-solid ${icon}"></i> ${esc(label)}${extra}</h3>`;
}

function button(action, icon, label, { disabled = false } = {}) {
  return `<button type="button" data-action="${action}" ${disabled ? "disabled" : ""}><i class="fa-solid ${icon}"></i> ${esc(label)}</button>`;
}

function setting(key) {
  return game.settings.get(MODULE_ID, SETTINGS[key]);
}

export class PartyScreensPanel extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "party-screens-panel",
    classes: ["party-screens-panel"],
    window: { title: "PARTYSCREENS.Panel.Title", resizable: true, icon: "fa-solid fa-presentation-screen" },
    position: { width: 480, height: "auto" },
    actions: {
      // Not "tab": ApplicationV2 reserves that action for its own tab groups.
      selectTab: PartyScreensPanel.#onTab,
      addDisplay: PartyScreensPanel.#onAddDisplay,
      removeDisplay: PartyScreensPanel.#onRemoveDisplay,
      stripOwnership: PartyScreensPanel.#onStripOwnership,
      sendView: PartyScreensPanel.#onSendView,
      resetView: PartyScreensPanel.#onResetView,
      followSelected: PartyScreensPanel.#onFollowSelected,
      focusSelected: PartyScreensPanel.#onFocusSelected,
      calibrate: PartyScreensPanel.#onCalibrate,
      saveCalibration: PartyScreensPanel.#onSaveCalibration,
      cancelCalibration: PartyScreensPanel.#onCancelCalibration,
      clearImages: () => clearContent("image"),
      clearJournals: () => clearContent("journal"),
    },
  };

  static #instance = null;

  /** Open or surface the one panel. */
  static open() {
    PartyScreensPanel.#instance ??= new PartyScreensPanel();
    return PartyScreensPanel.#instance.render({ force: true });
  }

  /** A display's user id, or GENERAL. */
  tab = null;
  /** userIds with the calibration square up. */
  calibrating = new Set();
  hookIds = [];
  stopReports = null;

  static #userId(target) {
    return target.closest("[data-user-id]")?.dataset.userId;
  }

  static #selectedIds() {
    const ids = canvas.tokens?.controlled.map((tk) => tk.id) ?? [];
    if (!ids.length) ui.notifications.warn(t("Panel.NoSelection"));
    return ids;
  }

  static #onTab(_event, target) {
    this.tab = target.dataset.tab;
    this.render();
  }

  static async #onAddDisplay() {
    const userId = this.element.querySelector('select[name="addUser"]')?.value;
    const preset = this.element.querySelector('select[name="addPreset"]')?.value;
    if (!userId || !PRESETS[preset]) return;
    this.tab = userId;
    await setDisplay(userId, preset);
  }

  static async #onRemoveDisplay(_event, target) {
    const user = game.users.get(PartyScreensPanel.#userId(target));
    if (!user) return;
    const confirmed = await DialogV2.confirm({
      window: { title: "PARTYSCREENS.Panel.RemoveDisplay" },
      content: `<p>${esc(t("Panel.RemoveConfirm", { label: profile(user).label }))}</p>`,
    });
    if (confirmed) await setDisplay(user.id, null);
  }

  static async #onStripOwnership(_event, target) {
    await stripOwnership(game.users.get(PartyScreensPanel.#userId(target)));
    this.render();
  }

  static #onSendView(_event, target) {
    sendView(PartyScreensPanel.#userId(target));
  }

  static #onResetView(_event, target) {
    resetView(PartyScreensPanel.#userId(target));
  }

  static #onFollowSelected(_event, target) {
    const ids = PartyScreensPanel.#selectedIds();
    if (ids.length) setSceneOverride(canvas.scene, PartyScreensPanel.#userId(target), { camera: "tokens", tokens: ids });
  }

  static #onFocusSelected(_event, target) {
    const ids = PartyScreensPanel.#selectedIds();
    if (ids.length) setSceneOverride(canvas.scene, PartyScreensPanel.#userId(target), { focus: "tokens", focusTokens: ids });
  }

  static #onCalibrate(_event, target) {
    const userId = PartyScreensPanel.#userId(target);
    this.calibrating.add(userId);
    showCalibration(userId);
    this.render();
  }

  static #onSaveCalibration(_event, target) {
    const userId = PartyScreensPanel.#userId(target);
    const inches = Number(this.element.querySelector(`[data-user-id="${userId}"] input[name="measured"]`)?.value);
    if (!(inches > 0)) return ui.notifications.warn(t("Calibrate.Invalid"));
    saveCalibration(userId, inches);
    this.calibrating.delete(userId);
    this.render();
  }

  static #onCancelCalibration(_event, target) {
    const userId = PartyScreensPanel.#userId(target);
    hideCalibration(userId);
    this.calibrating.delete(userId);
    this.render();
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override */
  async _renderHTML() {
    const users = displayUsers();
    if ((this.tab !== GENERAL) && !users.some((u) => u.id === this.tab)) this.tab = users[0]?.id ?? GENERAL;

    const tabs = users.map((u) => {
      const icon = profile(u).preset === "table" ? "fa-table" : "fa-tv";
      return this.#tabButton(u.id, icon, profile(u).label);
    });
    tabs.push(this.#tabButton(GENERAL, "fa-gear", t("Panel.General")));

    const user = game.users.get(this.tab);
    const body = user ? this.#displayHtml(user) : this.#generalHtml();
    const root = document.createElement("div");
    root.className = "ps-body";
    root.innerHTML = `<nav class="ps-tabs">${tabs.join("")}</nav>${body}`;
    return root;
  }

  /** @override */
  _replaceHTML(result, content) {
    // A setting change re-renders; keep the GM's place in a long tab.
    const scroll = content.scrollTop;
    content.replaceChildren(result);
    content.scrollTop = scroll;
  }

  #tabButton(tab, icon, label) {
    const active = tab === this.tab ? "active" : "";
    return `<button type="button" class="ps-tab ${active}" data-action="selectTab" data-tab="${esc(tab)}"><i class="fa-solid ${icon}"></i> ${esc(label)}</button>`;
  }

  #displayHtml(user) {
    const p = profile(user);
    const override = canvas?.scene ? sceneOverride(user) : {};
    const online = user.active;
    const state = `<span class="ps-state ps-${online ? "online" : "offline"}">${esc(t(`Panel.${online ? "Online" : "Offline"}`))}</span>`;
    return `<section class="ps-display" data-user-id="${esc(user.id)}">
      ${this.#screenHtml(user, p, state)}
      ${this.#cameraHtml(user, p, override)}
      ${this.#focusHtml(p, override)}
      ${this.#uiHtml(p)}
    </section>`;
  }

  #screenHtml(user, p, state) {
    const owned = ownedActors(user).length;
    return `${header("fa-presentation-screen", t("Panel.Screen"), state)}
      ${field(t("Panel.Label"), `<input type="text" name="label" value="${esc(p.label)}">`)}
      ${field(t("Panel.Preset"), `<select name="preset">${options(Object.keys(PRESETS), p.preset, "Preset")}</select>`, t("Panel.PresetHint"))}
      ${field(t("Panel.Account"), `<span class="ps-value">${esc(user.name)}</span>`)}
      <div class="ps-buttons">
        ${owned ? button("stripOwnership", "fa-user-slash", t("Panel.Strip", { count: owned })) : ""}
        ${button("removeDisplay", "fa-xmark", t("Panel.RemoveDisplay"))}
      </div>`;
  }

  #cameraHtml(user, p, override) {
    const tokens = override.tokens?.filter((id) => canvas.scene?.tokens.has(id)).length ?? 0;
    const sceneSelect = `<select name="sceneCamera" ${canvas?.scene ? "" : "disabled"}>
      <option value="">${esc(t("Panel.UseDefault", { mode: t(`Camera.Mode.${p.camera}`) }))}</option>
      ${options(CAMERA_MODES, override.camera, "Camera.Mode")}</select>`;
    const offline = { disabled: !user.active };

    let calibration = "";
    if (this.calibrating.has(user.id)) {
      calibration = `<div class="ps-calibration">
        <p class="notes">${esc(t("Calibrate.Prompt", { label: p.label }))}</p>
        ${field(t("Calibrate.Measured"), `<input type="number" name="measured" min="0.1" step="0.01" autofocus>`)}
        <div class="ps-buttons">
          ${button("saveCalibration", "fa-check", t("Calibrate.Save"))}
          ${button("cancelCalibration", "fa-xmark", t("Calibrate.Cancel"))}
        </div></div>`;
    }

    return `${header("fa-video", t("Panel.Camera"))}
      ${field(t("Panel.ThisScene"), sceneSelect)}
      ${field(t("Panel.Default"), `<select name="camera">${options(CAMERA_MODES, p.camera, "Camera.Mode")}</select>`)}
      ${field(t("Panel.FollowScale"), `<select name="followScale">${options(FOLLOW_SCALES, p.followScale, "Camera.FollowScale")}</select>`)}
      ${field(t("Panel.Fit"), `<select name="fit">${options(FIT_MODES, p.fit, "Camera.Fit")}</select>`)}
      ${field(t("Panel.MaxZoom"), `<input type="number" name="maxZoom" min="0" step="0.05" value="${esc(p.maxZoom ?? 0)}">`, t("Panel.MaxZoomHint"))}
      ${field(t("Panel.Tokens"), `<span class="ps-value">${esc(t("Panel.TokensCount", { count: tokens }))}</span>
        ${button("followSelected", "fa-crosshairs", t("Panel.UseSelected"))}`)}
      <p class="ps-status notes">${esc(this.#statusText(user))}</p>
      <div class="ps-buttons">
        ${button("sendView", "fa-share", t("Panel.SendView"), offline)}
        ${button("resetView", "fa-arrows-rotate", t("Panel.Reset"), offline)}
        ${button("calibrate", "fa-ruler-combined", t("Panel.Calibrate"), offline)}
      </div>
      ${calibration}`;
  }

  #focusHtml(p, override) {
    const tokens = override.focusTokens?.filter((id) => canvas.scene?.tokens.has(id)).length ?? 0;
    const sceneSelect = `<select name="sceneFocus" ${canvas?.scene ? "" : "disabled"}>
      <option value="">${esc(t("Panel.UseDefault", { mode: t(`Focus.Mode.${p.focus}`) }))}</option>
      ${options(FOCUS_MODES, override.focus, "Focus.Mode")}</select>`;
    return `${header("fa-eye", t("Panel.Focus"))}
      ${field(t("Panel.ThisScene"), sceneSelect)}
      ${field(t("Panel.Default"), `<select name="focus">${options(FOCUS_MODES, p.focus, "Focus.Mode")}</select>`)}
      ${field(t("Panel.FocusTokens"), `<span class="ps-value">${esc(t("Panel.TokensCount", { count: tokens }))}</span>
        ${button("focusSelected", "fa-crosshairs", t("Panel.FocusSelected"))}`)}`;
  }

  #uiHtml(p) {
    // The token bar and action tracker rows only mean something with astora-mod installed.
    const astora = !!game.modules.get("astora-mod")?.active;
    const toggles = UI_TOGGLES.filter((key) => astora || !ASTORA_TOGGLES.includes(key));
    return `${header("fa-display", t("Panel.Ui"))}
      ${field(t("Panel.ChatLog"), `<select name="chatLog">${options(CHAT_MODES, p.ui.chatLog, "Ui.ChatLog")}</select>`)}
      <div class="ps-toggles">
        ${toggles.map((key) => `<label>${checkbox(`ui.${key}`, p.ui[key])} ${esc(t(`Ui.${key}`))}</label>`).join("")}
        <label>${checkbox("content", p.content)} ${esc(t("Ui.content"))}</label>
      </div>
      ${field(t("Panel.CombatShown"), `<input type="number" name="combatShown" min="0" max="20" step="1" value="${esc(p.combatShown)}">`)}`;
  }

  #generalHtml() {
    const candidates = game.users.filter((u) => !u.isGM && !isDisplayUser(u));
    const add = candidates.length
      ? `<div class="form-group"><div class="form-fields">
          <select name="addUser">${candidates.map((u) => `<option value="${esc(u.id)}">${esc(u.name)}</option>`).join("")}</select>
          <select name="addPreset">${options(Object.keys(PRESETS), "wall", "Preset")}</select>
          ${button("addDisplay", "fa-plus", t("Panel.Add"))}
        </div></div>`
      : `<p class="notes">${esc(t("Panel.NoCandidates"))}</p>`;
    const seconds = (key) => `<input type="number" name="${key}" min="0" step="1" value="${esc(setting(key))}">`;

    return `<section class="ps-general">
      ${header("fa-plus", t("Panel.AddDisplay"))}
      ${add}
      ${header("fa-video", t("Panel.Camera"))}
      ${field(t("Settings.InchesPerGridSquare.Name"), `<input type="number" name="inchesPerGridSquare" min="0.1" step="0.1" value="${esc(setting("inchesPerGridSquare"))}">`)}
      ${field(t("Panel.AlwaysShowFrames"), checkbox("alwaysShowFrames", setting("alwaysShowFrames")))}
      ${header("fa-display", t("Panel.Ui"))}
      ${field(t("Settings.HideUi.Name"), checkbox("hideUi", setting("hideUi")))}
      ${header("fa-images", t("Panel.Content"))}
      ${field(t("Settings.ImageCloseAfter.Name"), seconds("imageCloseAfter"))}
      ${field(t("Settings.JournalCloseAfter.Name"), seconds("journalCloseAfter"))}
      ${field(t("Settings.CloseOnGmClose.Name"), checkbox("closeOnGmClose", setting("closeOnGmClose")))}
      <div class="ps-buttons">
        ${button("clearImages", "fa-image", t("Panel.ClearImages"))}
        ${button("clearJournals", "fa-book-open", t("Panel.ClearJournals"))}
      </div>
    </section>`;
  }

  #statusText(user) {
    const r = reports.get(user.id);
    if (!user.active || !r) return t("Panel.NoReport");
    const scene = game.scenes.get(r.sceneId)?.name ?? "?";
    const ppi = r.pxPerInch ? t("Panel.Calibrated", { ppi: r.pxPerInch.toFixed(1) }) : t("Panel.Uncalibrated");
    return t("Panel.Status", { scene, mode: t(`Camera.Mode.${r.mode}`), scale: r.scale.toFixed(2), ppi });
  }

  /* -------------------------------------------- */
  /*  Changes                                     */
  /* -------------------------------------------- */

  async #onChange(event) {
    const input = event.target;
    const name = input.name;
    const userId = PartyScreensPanel.#userId(input);

    if (!userId) return this.#onGeneralChange(input);
    if (PROFILE_SELECTS.has(name)) return updateProfile(userId, { [name]: input.value });
    if (name.startsWith("ui.")) return updateProfile(userId, { [name]: input.checked });
    switch (name) {
      case "label": return input.value.trim() && updateProfile(userId, { label: input.value.trim() });
      case "preset": return setPreset(userId, input.value);
      case "sceneCamera": return setSceneOverride(canvas.scene, userId, { camera: input.value || null });
      case "sceneFocus": return setSceneOverride(canvas.scene, userId, { focus: input.value || null });
      case "chatLog": return updateProfile(userId, { "ui.chatLog": input.value });
      case "content": return updateProfile(userId, { content: input.checked });
      case "maxZoom": {
        const value = Number(input.value);
        if (value >= 0) await updateProfile(userId, { maxZoom: value });
        return;
      }
      case "combatShown": {
        const value = Math.trunc(Number(input.value));
        if (value >= 0) await updateProfile(userId, { combatShown: value });
        return;
      }
    }
  }

  async #onGeneralChange(input) {
    switch (input.name) {
      case "inchesPerGridSquare": {
        const value = Number(input.value);
        if (value > 0) await game.settings.set(MODULE_ID, SETTINGS.inchesPerGridSquare, value);
        return;
      }
      case "imageCloseAfter":
      case "journalCloseAfter": {
        const value = Number(input.value);
        if (value >= 0) await game.settings.set(MODULE_ID, SETTINGS[input.name], value);
        return;
      }
      case "alwaysShowFrames":
      case "hideUi":
      case "closeOnGmClose": return game.settings.set(MODULE_ID, SETTINGS[input.name], input.checked);
    }
  }

  /** @override */
  _onFirstRender(context, options) {
    super._onFirstRender(context, options);
    this.element.addEventListener("change", (event) => this.#onChange(event));
    const rerender = () => this.render();
    this.hookIds = [
      ["canvasReady", Hooks.on("canvasReady", rerender)],
      [HOOK_CHANGED, Hooks.on(HOOK_CHANGED, rerender)],
      ["userConnected", Hooks.on("userConnected", rerender)],
      ["updateScene", Hooks.on("updateScene", (scene, changed) => {
        if ((scene === canvas?.scene) && foundry.utils.hasProperty(changed, `flags.${MODULE_ID}`)) rerender();
      })],
    ];
    // Reports only touch the status line, so typing in the panel survives them.
    this.stopReports = onReport((userId) => {
      const user = game.users.get(userId);
      const line = this.element?.querySelector(`[data-user-id="${userId}"] .ps-status`);
      if (user && line) line.textContent = this.#statusText(user);
    });
  }

  /** @override */
  _onClose(options) {
    super._onClose(options);
    for (const [hook, id] of this.hookIds) Hooks.off(hook, id);
    this.hookIds = [];
    this.stopReports?.();
    for (const userId of this.calibrating) hideCalibration(userId);
    this.calibrating.clear();
    PartyScreensPanel.#instance = null;
  }
}

/**
 * `registerMenu` wants an ApplicationV2 class and calls `new type().render(true)`; rendering this
 * opens the one panel instead of a second window with the same id.
 */
class PartyScreensPanelMenu extends ApplicationV2 {
  /** @override */
  render() {
    return PartyScreensPanel.open();
  }
}

export function registerPanel() {
  game.settings.registerMenu(MODULE_ID, "panel", {
    name: "PARTYSCREENS.Panel.Title",
    label: "PARTYSCREENS.Panel.Open",
    icon: "fa-solid fa-presentation-screen",
    type: PartyScreensPanelMenu,
    restricted: true,
  });

  // The scene-control button lives in the Party Screens group (layer.mjs).
}
