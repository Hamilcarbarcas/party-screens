/**
 * One socket channel for camera commands, view reports, GM feeds and content. DESIGN.md §6.5, §8.3,
 * §17.5.
 *
 * Every message carries `type`; `to` (a user id) addresses one client, absent means everyone.
 * Foundry never echoes a socket message to its sender.
 */

import { MODULE_ID } from "./const.mjs";

const CHANNEL = `module.${MODULE_ID}`;
/** type → handlers, run in registration order. */
const handlers = new Map();

export function emit(type, payload = {}) {
  game.socket.emit(CHANNEL, { ...payload, type, from: game.user.id });
}

export function onMessage(type, handler) {
  if (!handlers.has(type)) handlers.set(type, []);
  handlers.get(type).push(handler);
}

export function registerSocket() {
  game.socket.on(CHANNEL, (message) => {
    if (!message?.type) return;
    if (message.to && (message.to !== game.user.id)) return;
    for (const handler of handlers.get(message.type) ?? []) {
      try {
        handler(message);
      } catch (err) {
        console.error(`${MODULE_ID} | socket "${message.type}" failed`, err);
      }
    }
  });
}
