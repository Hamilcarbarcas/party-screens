# Changelog

All notable changes to this module are documented here. Release notes are taken from the section
matching each release tag.

## [Unreleased]

### Added
- Party screens: mark a player account as a **table** or **wall** screen from the player list.
  Screens are marked with an icon there.
- A screen sees through every player-owned token without owning any actor. Hidden tokens, tokens
  without vision, and tokens no player owns are never seen through.
- On a screen, **Owner** and **Hovered by Owner** token bars and nameplates show for player-owned
  tokens.
- **Remove Screen's Actor Ownership**: lists the actors a screen owns and sets them to Observer or
  removes the ownership.
- Screen camera: physical scale, fit scene, initial view, mirror GM, follow party, combat, GM
  selection or chosen tokens. Panning, zooming and other moves by anything else are blocked on
  screens. Replaces Lock View and Monk's Common Display's screen mode.
- Screen frames: each screen's view shows on the GM's canvas in the new **Party Screens** scene
  controls, or everywhere with Always Show Screen Frames. Drag one to move that screen; turn the
  wheel while dragging to zoom it (not at physical scale or in pan-only follow modes).
- A GM's pull-ping centers screens too.
- Calibration for physical scale: measure a square on the screen and enter its width.
- Focus: narrow a screen's vision to the current combatant, the GM's selection, or listed tokens,
  per scene or by default.
- Screen UI: screens hide Foundry's interface. Per screen: chat log (hidden, new messages only, or
  the full log), scene navigation, token bar, combat tracker, camera views, notifications. Alt+U
  shows the interface on a screen until it reloads. Replaces Monk's Common Display.
- Combat tracker on screens: opens when combat starts and closes when it ends, showing the current
  turn and the next few.
- Shared images and journals on screens: on or off per screen, close after a delay, close when the
  GM closes, and clear buttons and keys.
- **Party Screens** panel (Party Screens controls, or module settings), one tab per screen: label, preset,
  ownership removal, camera mode per scene and default, follow scale, scene fit, followed tokens,
  Send My View, Reset View, Calibrate, focus, and screen UI. A General tab adds screens and holds
  the world settings.
- Maximum follow zoom per screen (default 1), so follow modes don't zoom in too far.
- astora-mod's action tracker as a screen UI option, listing player-owned characters only.
- API at `game.modules.get("party-screens").api` and the `partyScreensChanged` hook.

Earlier releases: see the [GitHub Releases page](https://github.com/Hamilcarbarcas/party-screens/releases).
