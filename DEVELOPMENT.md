# Working on Airborne Puma

Plain scripts, no build step and no dependencies at play time. The page loads its scripts in order from `index.html`, and everything the player sees is drawn and synthesised in the page. The tools in `tools/` need Node (CI uses Node 20).

Serve the repo over http while working on it, so the tools and the share card behave as they do online:

```bash
python3 -m http.server 8000
```

What the game is meant to be is in [PRODUCT.md](PRODUCT.md), and how it looks in [DESIGN.md](DESIGN.md).

## What's in here

| | |
|---|---|
| `index.html` | the page: the 480×300 play screen, the title, the note for small screens |
| `css/gk-tokens.css` | the Tactical palette, byte for byte from games-meta `canon/` (STANDARD.md §4) |
| `css/airbornepuma.css` | the page, the HUD, and the screens with words on them: flat dark panels over the field |
| `fonts/` | Barlow Semi Condensed and Pixelify Sans (SIL Open Font License; the licences are beside them) |
| `js/gk-title.js` | the greykit.games boot and default title, `@gk-title` v0.4 taken whole from games-meta `canon/` (§3); `js/main.js` gives it the menu and the battlefield behind it, and `css/airbornepuma.css` its colours |
| `js/gk-intro.js` | the integrated intro, `@gk-intro` v0.2 taken whole from games-meta `canon/` (§14): the meow under the boot's logo, the hold for a press where the browser wants one, the title's entrance, the credit under the menu, the Sound and Music switches, the menu's ticks |
| `js/engine/*.js`, `js/util.js`, `js/tiles.js`, `js/missions.js` | the game itself, with no DOM in it: map generation, the ranger, weapons, the enemy, the alert, the twelve missions, the airdrop, extraction, merit |
| `js/engine/bot.js` | a ranger with no imagination, for the tests (not loaded by the page) |
| `js/kit.js` | what the play screen's art shares: 480×300, 24-pixel tiles, the low sun and its shadows, the zones' colour ramps |
| `js/ground.js`, `js/things.js`, `js/people.js` | the ground and what stands on it; installations, the Osprey, pods and effects; the puma and the wolves |
| `js/insignia.js` | rank insignia, ribbons and the roster's portraits |
| `js/palette.js`, `js/art.js` | the old sixteen-colour art, almost all of it now replaced by the files above; it still supplies the palette setting (`AP.buildArt`) and `AP.artURL` |
| `js/render.js`, `js/hud.js` | the play screen (and the title's picture), and the panels over it |
| `js/sfx.js` | Web Audio: the effects, the loops, the title theme (on its own Music bus under the master Sound) |
| `music/` | music written for the game and kept for later, not loaded by the page: `quickstep.js`, a march in B flat, goes back into `js/sfx.js` whole |
| `js/input.js`, `js/career.js`, `js/screens.js`, `js/main.js` | controls, the roster and settings, the sheets, and the loop |
| `tools/lib.js` | loads the engine headless, with no document, canvas or sound, for the two checks below |
| `tools/sim-check.js` | the rules, the bot winning every mission, a replay matching tick for tick (`--seeds N`, `--quick`, `--only <mission>`) |
| `tools/mapcheck.js` | every mission's map at every difficulty over many seeds, provably finishable (`--seeds N`; `--show mission:seed:diff` prints one) |
| `tools/stamp-assets.js` | stamps each script and stylesheet URL in `index.html` with its content hash (`--check` only reports) |
| `tools/check-assets.js` | every file the page and the manifest name exists (games-meta STANDARD.md §10) |
| `tools/make-icons.js` | `icon.svg`, the favicons and the home-screen icon (also the GitLab avatar), from one 40×40 drawing of the ranger under his parafoil |
| `tools/og.html` | the share card, `og.png`, drawn in the play screen's own art; open it over http and save the canvas (instructions inside) |
| `screenshots/` | the pictures in the README, at twice the play screen's size |

## Before you commit

Run what CI runs:

```bash
node tools/check-assets.js
for f in js/*.js js/engine/*.js tools/*.js; do node --check "$f"; done
node tools/sim-check.js --seeds 1
node tools/mapcheck.js --seeds 10
node tools/stamp-assets.js
```

`stamp-assets.js` rewrites `index.html` with fresh hashes. CI runs it with `--check` and fails on a stale stamp. greykit.com sits behind Cloudflare, which keeps scripts and stylesheets for 30 days, so an unstamped change would not reach players.

## Testing a mission directly

The page takes a query string that skips the title and drops into a practice mission:

```
index.html?play=<mission>&diff=<0-3>&seed=<n>&land=1
```

- `land=1` skips the fly-over and the jump.
- `at=<x>,<y>` puts the ranger at a tile, and `alert=<0-2>` raises the alarm (both handy for screenshots).
- `pause=1` opens on the pause menu.

An unknown mission id falls back to the depot.

Without `play`, `hold=always` makes the boot hold for a press even where the browser would play sound already (the in-app browser, a launch from the arcade). `sheet=roster` and `demo=roster|kia` keep the plain boot, with no hold and no entrance.

## Deploy

Merge requests run the `validate` job only. On `main`, `deploy` follows it and rsyncs the repo to `greykit.com/games/airbornepuma/` on DreamHost, leaving out `.git`, `.claude`, `.gitlab-ci.yml` and `tools/`. The SSH host key is pinned in `.gitlab-ci.yml` rather than scanned. See the comments there before changing it.

## Saves

Everything is in `localStorage` under keys beginning `airbornepuma_`, versioned with a `_v1` suffix: the roster, a mission in progress, settings, sound, and music. They are defined at the top of `js/career.js`. Settings → *Forget everything* clears exactly those keys, as games-meta STANDARD.md requires.

## Reference disks

The original *Airborne Ranger* disk images may sit beside the repo for reference. They are MicroProse's and are gitignored (`*.d64`, `*.zip`, `reference/`), and nothing of theirs may be copied into the game.
