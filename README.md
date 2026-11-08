# Party Screens

**Manifest URL:** `https://github.com/Hamilcarbarcas/party-screens/releases/latest/download/module.json`

## Requirements

- Foundry VTT v13
- Any game system
- [libWrapper](https://github.com/ruipin/fvtt-lib-wrapper)

## Contents

- [Overview](#overview)
- [Setting up a screen](#setting-up-a-screen)
  - [Table and wall screens](#table-and-wall-screens)
  - [Removing the screen's ownership](#removing-the-screens-ownership)
  - [Replacing Lock View and Monk's Common Display](#replacing-lock-view-and-monks-common-display)
- [What a screen sees](#what-a-screen-sees)
  - [Focus](#focus)
- [Token bars and names](#token-bars-and-names)
- [The screen's camera](#the-screens-camera)
  - [Camera modes](#camera-modes)
  - [Moving a screen](#moving-a-screen)
  - [Calibrating physical scale](#calibrating-physical-scale)
- [What else a screen shows](#what-else-a-screen-shows)
  - [Screen UI](#screen-ui)
  - [Combat tracker](#combat-tracker)
  - [Shared images and journals](#shared-images-and-journals)
- [The Party Screens panel](#the-party-screens-panel)
- [Settings](#settings)
- [Keys](#keys)
- [API](#api)

## Overview

Party Screens is for in-person play with a shared TV: one lying on the table under the minis, one on
the wall, or both. Each screen logs in as its own player account.

Normally that account has to own every character for the screen to see through them. Owning them
has side effects: the screen counts as a player for anything that asks who owns a character, and
every character lists an extra owner. With Party Screens, a screen sees through every token a
player owns without owning any of them.

## Setting up a screen

1. Create a player account for the screen, as usual.
2. In the player list, right-click the account and pick **Make Table Screen** or **Make Wall
   Screen**. Or use **Add a Screen** on the [panel's](#the-party-screens-panel) General tab. A
   <i class="fa-solid fa-presentation-screen"></i> marks it in the player list from then on.
3. Remove the account's ownership of your actors (below).

To undo, right-click the account and pick **Stop Being a Party Screen**, or use **Stop Being a
Screen** in the panel.

Only a GM can mark screens. A GM account can't be one.

### Table and wall screens

The two kinds start from different presets: a table screen for the play surface, a wall screen for
everyone to glance at.

- **Table:** physical scale, so one grid square matches your minis' bases. It moves only when you
  move it. Shows the scene and nothing else.
- **Wall:** follows the party, zooming to fit. Shows the chat log, the combat tracker during
  combat, the token bar, and images and journals you share.

Everything can be changed per screen in the [panel](#the-party-screens-panel). Switching a screen
to the other preset resets its settings to that preset's.

### Removing the screen's ownership

Right-click a screen that still owns actors and pick **Remove Screen's Actor Ownership**, or use
**Remove Ownership** on its tab in the panel. The dialog lists every actor the account owns and
offers:

- **Set to Observer**: their sheets can still open on the screen.
- **Remove**: back to the actor's default.

### Replacing Lock View and Monk's Common Display

Party Screens does everything both did for a screen, so disable both. While either is still on, it
can fight Party Screens for the screen: Party Screens blocks their camera moves on screens, but
not their UI hiding or token selection.

## What a screen sees

A screen sees through every token that:

- has vision enabled,
- isn't hidden, and
- is owned by a player (a non-GM account that isn't itself a screen).

That holds whether or not the actor's own vision sharing is turned on. A screen never sees through
anything else, so it only ever shows what the party can see. Selecting a token on a screen doesn't
narrow its view; [focus](#focus) does.

### Focus

Focus narrows what a screen sees to part of the party. Set it per screen, with a default and an
optional choice for each scene:

| Focus | The screen sees through |
| --- | --- |
| Whole party | Every player-owned token (no narrowing). |
| Current combatant | The combatant whose turn it is. On an NPC's turn, the whole party. |
| GM selection | The player-owned tokens the GM has selected. With none selected, the whole party. |
| Listed tokens | A fixed set of tokens, picked with **Focus Selected** in the panel. |

Focus only ever narrows to player-owned tokens. If none of the focused tokens can see (hidden, or
no vision), the screen shows the whole party rather than going dark.

## Token bars and names

On a screen, token bars and nameplates set to **Owner** or **Hovered by Owner** show for
player-owned tokens, as they do for the players themselves. A screen has no mouse to hover with, so
both settings mean "always". The same settings on other tokens stay hidden from screens.

## The screen's camera

Nobody at the table can move a screen's view by accident: dragging, the mouse wheel, the arrow keys
and anything else that pans do nothing on a screen. Only the screen's camera moves it, following
the mode you pick, and you move it from the GM's side.

### Camera modes

| Mode | The screen shows |
| --- | --- |
| Physical scale | One grid square at its real size (see [calibrating](#calibrating-physical-scale)). Moves only when you move it. |
| Fit scene | The whole scene, or the scene filling the screen, or fit to its width or height. |
| Initial view | The scene's saved initial view. |
| Mirror GM view | Wherever the GM is looking. |
| Follow party | Every player-owned token that isn't hidden or defeated. |
| Follow combat | The current combatant and whatever its player (or the GM, on an NPC's turn) has targeted. |
| Follow GM selection | The tokens the GM has selected. |
| Follow tokens | A fixed set of tokens, picked with **Follow Selected** in the panel. |

The follow modes re-frame once tokens stop moving, not on every step, and fall back to the party
when there's nothing to follow (no combat, nothing selected). **Follow scale** decides whether they
zoom to fit or only pan at physical scale. Pan-only is the one to use on a table with minis on it.
**Maximum follow zoom** stops them zooming in further than a set zoom (1 by default; the panel's
status line shows a screen's current zoom).

If the chat log is open on a wall screen, framing leaves room for it.

### Moving a screen

- **Screen frames:** pick the **Party Screens** controls (<i class="fa-solid fa-presentation-screen"></i>
  in the scene controls, beside token and measurement controls) and each connected screen on the
  scene shows as a labeled frame. Drag a frame to move that screen. Turn the mouse wheel while
  dragging to zoom it, except at physical scale or in a pan-only follow mode. In a follow mode,
  the zoom lasts until the screen next re-frames, as a drag does; to keep it from zooming in too
  far, set **Maximum follow zoom**.
- **Always Show Screen Frames** (a toggle in the Party Screens controls) shows the frames in the
  other controls too. There, only a frame's edge and label grab, so clicks inside it still reach
  your tokens.
- **Pull-ping:** a GM's pull-ping (Shift while pinging) centers every screen on that spot, at the
  screen's own zoom, as well as moving the players.
- **Send My View** in the panel: the screen jumps to where you're looking. A physical-scale screen
  keeps its own zoom.
- **Reset View** in the panel: back to what the mode shows, dropping any of the moves above.

A table screen remembers where it was on each scene, so reloading it puts the view back under the
minis.

### Calibrating physical scale

Physical scale needs to know how big a pixel is on that TV. Measure it once per screen:

1. Open the panel and pick **Calibrate** on the screen's card. A square appears on the screen.
2. Measure the square's width with a ruler, edge to edge.
3. Enter the width in inches and **Save**.

Recalibrate if you change the screen's resolution or the browser zoom on that machine. Set
**Inches per grid square** in the panel if your grid isn't one inch.

## What else a screen shows

### Screen UI

A screen hides Foundry's interface: no scene controls, player list, hotbar, sidebar tabs, chat
input, or windows anyone opens on it. What it can show, per screen:

- **Chat log:** hidden, new messages only (they appear for a moment and fade), or the full log.
- **Scene navigation**, **camera views**, **notifications**.
- **Token bar** and **action tracker**, if astora-mod is in use. The action tracker opens with
  combat and lists only player-owned characters.
- **Combat tracker** and **shared images and journals** (below).

Dice animations and a few other modules' overlays always show.

To see the whole interface on a screen while setting it up, press **Alt+U** on that screen. It
lasts until the screen reloads. **Hide screen UI** in the settings turns hiding off on every
screen.

### Combat tracker

On a screen with the combat tracker turned on, it opens when combat starts and closes when it
ends. It shows the round, then the current turn and the next few turns, with portraits and names
only. **Turns shown after the current one** sets how many. Defeated combatants are skipped; hidden
ones never show.

It opens at the top left. If someone drags it on the screen's own machine, it opens there from
then on.

### Shared images and journals

A screen gets whatever you show to all players. To show something to screens only, untick **All
Players** in the Show To dialog and tick the screens' accounts. A screen with **Shared images and journals** turned off closes them as soon as they arrive,
so nothing covers the table.

- **Close shared images after** and **Close shared journals after:** seconds before they close on
  screens. 0 leaves them open.
- **Close on screens when the GM closes:** closing your own copy closes it on screens too.
- **Clear Images** and **Clear Journals** (panel, or Ctrl+Comma and Ctrl+Period) close every
  shared image or journal on every screen.

## The Party Screens panel

GM only. Open it from the <i class="fa-solid fa-sliders"></i> button in the Party Screens
controls, or from the module's settings. Each screen has its own tab, and there's no limit on how
many screens you add:

- **Screen:** its label, its preset, the account, **Remove Ownership** (while it still owns
  actors) and **Stop Being a Screen**.
- **Camera:**
  - **This scene:** the camera mode for the current scene, or the screen's default.
  - **Default camera:** the mode on every scene without its own.
  - **Follow scale**, **Scene fit** and **Maximum follow zoom:** see [camera modes](#camera-modes).
  - **Followed tokens / Follow Selected:** follow the tokens you have selected, on this scene.
  - **Send My View**, **Reset View**, **Calibrate**. The line above them shows what the screen is
    doing right now.
- **Focus:** this scene's focus, the default, and **Focus Selected** to focus on the tokens you
  have selected, on this scene. See [focus](#focus).
- **Screen UI:** see [screen UI](#screen-ui).

The **General** tab adds screens, and holds inches per grid square, **Always show screen
frames**, **Hide screen UI**, and the [shared content](#shared-images-and-journals) settings and
buttons.

## Settings

| Setting | Does |
| --- | --- |
| Inches per grid square | Size of one grid square at physical scale. Also in the panel. |
| Screen pixels per inch | Per machine. Set by calibration; 0 means not calibrated. |
| Follow padding | Grid squares of margin around followed tokens. |
| Pan duration | How long each screen camera move takes, in milliseconds. 0 jumps. |
| Hide screen UI | Off shows the full interface on every screen, for troubleshooting. Also in the panel. |
| Close shared images after | Seconds before a shared image closes on screens. 0: never. Also in the panel. |
| Close shared journals after | The same for journals. |
| Close on screens when the GM closes | Closing your copy of a shared image or journal closes it on screens. Also in the panel. |

## Keys

| Key | Does |
| --- | --- |
| Alt+U | On a screen only: show or hide its interface until it reloads. |
| Ctrl+Comma | GM: close shared images on every screen. |
| Ctrl+Period | GM: close shared journals on every screen. |

All three can be changed in Foundry's controls settings.

## API

`game.modules.get("party-screens").api`:

| Call | Returns |
| --- | --- |
| `isDisplayUser(user = game.user)` | `true` if the user is a party screen. |
| `displayUsers()` | Every party screen account, online or not. |
| `profile(user = game.user)` | The screen's settings (`preset`, `label` and the preset's values), or `null`. |
| `isPartyActor(actor)` | `true` if a player who isn't a screen owns the actor. |
| `setDisplay(userId, preset)` | GM only. `"table"` or `"wall"` marks the user; `null` unmarks them. |
| `refreshVision()` | Re-decides which tokens this client sees through. |
| `sendView(userId)` | GM only. The screen takes the GM's current view. |
| `centerDisplay(userId, x, y, {instant})` | GM only. Centers the screen on a canvas point. |
| `resetView(userId)` | GM only. Back to what the screen's mode shows. |
| `focusMode(user = game.user, scene = canvas.scene)` | The screen's [focus](#focus) on that scene: `"off"`, `"combat"`, `"selection"` or `"tokens"`. |
| `clearContent(kind)` | GM only. Closes every shared `"image"` or `"journal"` on every screen. |
| `openPanel()` | Opens the Party Screens panel. |

The `partyScreensChanged` hook fires on every client when screens are added or removed, with the
current list of screen accounts.
