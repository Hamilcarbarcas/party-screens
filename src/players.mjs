/**
 * Player list: marking display users, and stripping their actor ownership. DESIGN.md §3.
 */

import { isDisplayUser, profile, setDisplay } from "./displays.mjs";

const { DialogV2 } = foundry.applications.api;

function userOf(li) {
  return game.users.get(li.dataset.userId);
}

function canMark(li) {
  const user = userOf(li);
  return game.user.isGM && !!user && !user.isGM && !isDisplayUser(user);
}

export function ownedActors(user) {
  const OWNER = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
  return game.actors.filter((a) => a.ownership[user.id] === OWNER);
}

export async function stripOwnership(user) {
  const actors = ownedActors(user);
  if (!actors.length) return;

  const items = actors.map((a) => `<li>${foundry.utils.escapeHTML(a.name)}</li>`).join("");
  const choice = await DialogV2.wait({
    window: { title: "PARTYSCREENS.Strip.Title" },
    classes: ["party-screens-strip"],
    content: `<p>${game.i18n.format("PARTYSCREENS.Strip.Body", { user: foundry.utils.escapeHTML(user.name) })}</p><ul>${items}</ul>`,
    buttons: [
      { action: "observer", label: "PARTYSCREENS.Strip.Observer", icon: "fa-solid fa-eye", default: true },
      { action: "remove", label: "PARTYSCREENS.Strip.Remove", icon: "fa-solid fa-user-slash" },
      { action: "cancel", label: "Cancel", icon: "fa-solid fa-xmark" },
    ],
  });
  if ((choice !== "observer") && (choice !== "remove")) return;

  const key = choice === "observer" ? `ownership.${user.id}` : `ownership.-=${user.id}`;
  const value = choice === "observer" ? CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER : null;
  await Actor.implementation.updateDocuments(actors.map((a) => ({ _id: a.id, [key]: value })));
  ui.notifications.info(game.i18n.format("PARTYSCREENS.Strip.Done", { count: actors.length, user: user.name }));
}

function onContextOptions(_app, options) {
  options.push(
    {
      name: game.i18n.localize("PARTYSCREENS.Menu.MakeTable"),
      icon: '<i class="fa-solid fa-table"></i>',
      condition: canMark,
      callback: (li) => setDisplay(li.dataset.userId, "table"),
    },
    {
      name: game.i18n.localize("PARTYSCREENS.Menu.MakeWall"),
      icon: '<i class="fa-solid fa-tv"></i>',
      condition: canMark,
      callback: (li) => setDisplay(li.dataset.userId, "wall"),
    },
    {
      name: game.i18n.localize("PARTYSCREENS.Menu.Strip"),
      icon: '<i class="fa-solid fa-user-slash"></i>',
      condition: (li) => {
        const user = userOf(li);
        return game.user.isGM && isDisplayUser(user) && (ownedActors(user).length > 0);
      },
      callback: (li) => stripOwnership(userOf(li)),
    },
    {
      name: game.i18n.localize("PARTYSCREENS.Menu.Remove"),
      icon: '<i class="fa-solid fa-xmark"></i>',
      condition: (li) => game.user.isGM && isDisplayUser(userOf(li)),
      callback: (li) => setDisplay(li.dataset.userId, null),
    },
  );
}

function onRenderPlayers(_app, html) {
  for (const li of html.querySelectorAll("li.player[data-user-id]")) {
    const user = game.users.get(li.dataset.userId);
    if (!isDisplayUser(user)) continue;
    const icon = document.createElement("i");
    icon.className = "fa-solid fa-presentation-screen party-screens-marker";
    icon.dataset.tooltip = game.i18n.format("PARTYSCREENS.Marker", { label: profile(user).label });
    li.append(icon);
  }
}

export function registerPlayers() {
  Hooks.on("getUserContextOptions", onContextOptions);
  Hooks.on("renderPlayers", onRenderPlayers);
}
