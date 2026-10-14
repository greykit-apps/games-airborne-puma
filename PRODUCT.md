# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Desktop players of all kinds, new players first: people who never played *Airborne Ranger* should find Airborne Puma inviting, and fans of the 1987 original should still recognise it. They play with a keyboard (or a gamepad) on a computer, in sessions of a mission or two; phone play is out of scope.

## Product Purpose

A remake of MicroProse's *Airborne Ranger* (C64, 1987) where the ranger is a puma and the enemy are wolves: twelve missions behind enemy lines in three zones (desert, temperate, arctic), dropped in by Osprey with three supply pods and a clock running, with a veteran roster that keeps ranks, decorations and a memorial, and a twelve-mission campaign. Success is a player who finishes a mission, wants another, and comes back to their ranger.

## Positioning

The 1987 game's full design (fly-over and pod drop, the clock, the alert system, permadeath veterans on a roster), rebuilt faithfully as its own game rather than an emulation, with a puma ranger and real US Army flavour. Classic plays as 1987 did; Field adds modern aids.

## Operating Context

Part of the greykit.games portfolio, served at greykit.com/games/airbornepuma. It opens on the shared greykit boot screen; everything after the boot is the game's own. Saves live in this browser only.

## Capabilities and Constraints

- Gameplay, rules, missions, balance and the engine (`js/engine/`) stay as they are; a visual rethink changes rendering, art, HUD and screens only.
- Everything visual is open to change: menus, HUD, sprites, terrain, effects and resolution.
- Plain scripts, no build step, nothing fetched at play time: every picture is drawn and every sound synthesised in the page.
- Desktop only; small screens get a note instead of the game.
- Keyboard first, gamepad supported; mouse aim is an aid.
- The greykit boot screen (canon) stays; games-meta STANDARD.md rules still apply (credit, Forget everything, menu keys, Settings order, sound).

## Brand Commitments

- The name Airborne Puma. The ranger is a puma; the enemy soldiers are anthropomorphic wolves (owner's decision, 2026-10-14); hostages and prisoners of war are human for now. The ranger's side is real US Army (ranks, decorations, the Osprey).
- It must not look like a mobile game (no glossy buttons, cartoon gloss, free-to-play energy).
- It must not be too serious or grim: the ranger is a puma, and the game keeps some wit.
- Retro is welcome, but not "too retro for modern audiences", and it must not look like it is running in an emulator.

## Evidence on Hand

The twelve missions' briefings, the death-cause tips and all copy are in `js/missions.js` and `js/screens.js`. No MicroProse code, art, sound or text may be used; the reference disks are gitignored.

## Product Principles

1. The game first: graphics serve reading the battlefield, the clock and the alert.
2. Faithful in play, free in look.
3. Inviting to newcomers without hiding the original's depth.
4. Wit over grimness: a puma in the Army is a little funny, and that is fine.

## Accessibility & Inclusion

Keyboard-complete play and menus; text contrast at WCAG AA; nothing essential conveyed by colour alone; respects reduced motion.
