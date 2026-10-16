---
name: Airborne Puma
description: Airborne Ranger's tilted overhead battlefield redrawn as modern hi-bit pixel art, under a paper map sheet marked in grease pencil.
colors:
  map-stock: "#ebe5cc"
  map-inset: "#e4ddc2"
  input-stock: "#f4efdc"
  ink: "#22201b"
  ink-muted: "#5a5446"
  ink-faint: "#6b6452"
  hairline: "rgba(34,32,27,.22)"
  edge-line: "rgba(34,32,27,.55)"
  grid-blue: "rgba(70,98,120,.2)"
  contour-brown: "#96683a"
  grease-red: "#b02e25"
  ready-green: "#2b6e31"
  suspicion-amber: "#8a520a"
  danger-red: "#b02e25"
  puma-tawny: "#8f5420"
  night-page: "#1a1812"
  sprite-outline: "#1d1917"
  desert-shade: "#9893d2"
  temperate-shade: "#8f9ab8"
  arctic-shade: "#9fb0d8"
typography:
  display:
    fontFamily: "Archivo, Arial Narrow, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "clamp(64px, 6.8vw, 96px)"
    fontWeight: 800
    fontStretch: "66%"
    lineHeight: 0.84
  headline:
    fontFamily: "Archivo, Arial Narrow, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 800
    fontStretch: "70%"
    lineHeight: 1.05
  title:
    fontFamily: "Archivo, Arial Narrow, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 800
    fontStretch: "72%"
    lineHeight: 1.1
  body:
    fontFamily: "Archivo, Arial Narrow, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 500
    fontStretch: "88%"
    lineHeight: 1.45
  label:
    fontFamily: "Archivo, Arial Narrow, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    fontStretch: "80%"
    letterSpacing: "0.16em"
  grease:
    fontFamily: "Kalam, Segoe Print, Bradley Hand, cursive"
    fontSize: "18px to 21px"
    fontWeight: 400
    lineHeight: 1.1
  numeral:
    fontFamily: "Pixelify Sans, ui-monospace, monospace"
    fontSize: "34px"
    fontWeight: 400
    lineHeight: 1
  key:
    fontFamily: "Pixelify Sans, ui-monospace, monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1
rounded:
  everything: "0"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    border: "1.5px solid {colors.ink}"
    padding: "8px 16px"
  button-focus:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.map-stock}"
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.map-stock}"
  button-primary-focus:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.map-stock}"
    shadow: "4px 4px 0 {colors.grease-red}"
  button-danger:
    textColor: "{colors.danger-red}"
    border: "1.5px solid {colors.danger-red}"
  button-danger-focus:
    backgroundColor: "{colors.danger-red}"
    textColor: "{colors.map-stock}"
  button-quiet:
    textColor: "{colors.ink-muted}"
  legend-row:
    textColor: "{colors.ink}"
    height: "44px to 46px"
    focus: "a grease-red loop drawn round the row"
  keycap:
    textColor: "{colors.ink}"
    typography: "{typography.key}"
    border: "1.5px solid {colors.ink}, 3px at the bottom"
  input:
    backgroundColor: "{colors.input-stock}"
    border: "1.5px solid {colors.ink}"
  sheet:
    backgroundColor: "{colors.map-stock}"
    border: "1.5px ink, with a second hairline 4px inside: the neatline"
    shadow: "7px 7px 0 rgba(20,18,12,.55)"
    width: "min(880px, 100%), or 1180px wide"
  hud-label:
    backgroundColor: "{colors.map-stock}"
    border: "1.5px solid {colors.ink}"
    shadow: "4px 4px 0 rgba(20,18,12,.6)"
---

# Design System: Airborne Puma

## Overview

**Creative North Star: "The Map You Carried In"**

Airborne Puma is the overhead, north-facing, tilted battlefield of *Airborne Ranger*, redrawn as hi-bit pixel art and lit by a low south-west sun. The field is the whole screen. Everything with height shows its roof and its south face, and every grounded thing throws a long blue-violet shadow to the north-east. Dust haze, a warm wash from the lower left and a soft vignette sit over the pixels as light, not as an effect. People stand upright in front, back and side poses inside a dark outline. The puma reads tawny and the wolves read grey, so the cast is clear at a glance.

The chrome is the map a ranger would carry: a sheet of buff map stock with a blue kilometre grid and brown contour lines, a double neatline, margin data, and ink words in a condensed sans. Marks that matter are made in grease pencil, the china marker used on map acetate: a red loop round the chosen row, the goal, the notes on the flight plan. Sheets are opaque and lift off the field by a hard ink offset, never by a blur or a glow. Numbers and keys stay in a pixel face, which is how the paper joins the pixel field without mimicking it. The look was chosen to step away from the dark translucent glass the other greykit games share.

The world rejects two things by name: an emulated C64 screen (the retired 16-colour palette, CRT framing) and a flat top-down token board. Per PRODUCT.md it must also never look like a mobile game. That rules out glossy or bevelled buttons, cartoon gloss and free-to-play energy, and it is why the grease pencil stays rare.

**Key Characteristics:**
- A 480x300 pixel canvas with 24px tiles, scaled up by whole numbers only.
- A low south-west sun: shadows lean north-east and are multiplied over the ground in a single pass, in each zone's own shade colour.
- Three zones (desert, temperate, arctic) painted by the same painters from separate seven-step ground ramps.
- Opaque paper chrome: map stock, grid, contours, neatline, ink; square corners; hard offset shadows.
- Grease-pencil red for the chosen thing and the few notes that matter.
- Green, amber and red mean ready, suspicion and danger. They are never decoration.
- Three voices: a condensed sans for words, a pixel face for numbers and keys, a marker hand for grease pencil only.

## Colors

The world has two palettes. The field is warm, sunlit and ramp-built. The chrome is printed paper and ink, with grease pencil and three signal colours on top. Every colour used as words on the stock meets WCAG AA.

### The sheet
- **Map Stock** (map-stock): every sheet, window, HUD label, the title sheet and the small-screen note. The CSS lays a contour pattern (contour-brown at 34%) and a 48px grid (grid-blue) over it.
- **Map Inset** (map-inset): pod slots, the memorial card: things set into the sheet.
- **Input Stock** (input-stock): text fields and HUD keycaps, a shade lighter than the sheet.
- **Ink** (ink, 12.9:1): every word, every border, the neatline, a filled (chosen) control.
- **Ink Muted** (ink-muted, 6.0:1) and **Ink Faint** (ink-faint, 4.7:1): secondary words, metadata, margin data, placeholders.
- **Hairline / Edge Line**: dividers inside a sheet; the 1.5px rule under a heading is full ink.
- **Night Page** (night-page): behind everything; the dim over the field when a sheet is up is this at 62%.

### Marks
- **Grease Red** (grease-red, 5.1:1): the hand-drawn loop round the focused legend row, the focus ring on cards and pod slots, the underline under PUMA, the flight plan's objective loop and pickup cross, the goal written under the enlargement, link underlines, and the offset under a focused primary button. It is drawn, never a fill, so it cannot be mistaken for danger.
- **Puma Tawny** (puma-tawny): "PUMA" in the title mark only; in the field the puma fur ramp in the art kit.

### Signals
- **Ready Green** (ready-green, 4.9:1): the "Quiet" alert state, a met goal, destroyed-target pips, the green light.
- **Suspicion Amber** (suspicion-amber, 5.1:1): "Suspicious", high fatigue, honours.
- **Danger Red** (danger-red): "Full alert" and its label's edge, wounds, the low clock, winded fatigue, danger buttons, red toasts (filled, stock-coloured words).

In the field, canvas-drawn signals (vision cones, minimap marks, edge arrows) keep the brighter `K.UI` values in `js/kit.js`, because they sit on terrain, not on paper.

### Named Rules
**The Three Signals Rule.** Green means ready, amber suspicion, red danger. They carry state and nothing else, and state never travels by colour alone: the alert says QUIET, SUSPICIOUS or FULL ALERT, stamped, and fills one, two or three meter segments.

**The One Marker Rule.** Grease pencil marks what the player should look at now: the focused row, the objective, the goal. One loop per screen; a note only where the paper would really carry one. Never as decoration.

**The Cool Shade Rule.** Grounded shadows on the field are the zone's shade colour multiplied over the ground, never grey or black. Only airborne things (the Osprey, a parachute, a falling pod) cast a soft dark ellipse in sprite-outline at 28 to 40% alpha.

## Typography

**Word Font:** Archivo (variable, width 62 to 125%), self-hosted, set condensed: body at 88% width, headings at 66 to 72%, labels at 80%.
**Number Font:** Pixelify Sans, self-hosted, for numerals and keycaps only.
**Marker Font:** Kalam 400, self-hosted, for grease-pencil notes only.

### Hierarchy
- **Display**: the title mark, "AIRBORNE / PUMA", 800 weight at 66% width, PUMA underlined in grease pencil.
- **Headline**: sheet titles (30px). The pause window raises this to 44px.
- **Title**: a mission's name (26px); the flight plan's at 34px; the debrief's outcome at 44px in its signal colour.
- **Body**: sheet prose, capped at 70ch.
- **Label**: uppercase map-margin labels and section headings, the headings ruled underneath in ink.
- **Grease**: the notes on the flight plan, the goal under the enlargement, "start here" on the first mission card.
- **Numeral / Key**: the clock, round counts, merit figures; every keycap.

### Named Rules
**The Three Voices Rule.** Words in Archivo; numbers you act on and keys you press in Pixelify Sans; grease pencil in Kalam. Never set prose in either of the other two.

## Layout

The play field fills the window: a 480x300 canvas scaled up by whole numbers and letterboxed on black, with four light layers over it (sun, cool shade, haze, vignette) and the HUD above them as DOM. HUD labels hold the corners at a 16px inset: status top left (262px), the alert top centre, minimap and objective top right (236px), loadout bottom left (330px), the key hint bottom centre, pause and sound bottom right. The pause window stands right of centre (min(440px, 100%)) over a field dimmed from the right, so the ranger stays visible. Sheets centre over a 62% dim, no blur, at min(880px, 100%) or 1180px wide, the body padded 20px 42px. The title is one sheet (min(440px, 100%)) in a left column inset clamp(24px, 6vw, 110px), over the battlefield. Desktop only: below 760x480 a note replaces the game.

### The flight plan
The orders screen is the whole mission strip from the generator, turned a quarter to the left so it reads along the Osprey's track as a strip chart does: north and the objective at the left, the drop zone at the right. It is drawn at a whole number of pixels a tile (3 to 6) to fit the sheet. Over it, in grease pencil: a loop round the objective with its target count, a cross on the pickup, the dashed track with its arrow, a dashed box round the drop zone, and a red hatch on every tile `AP.podSafe` says loses a pod. A scale bar, the hatch's key and "turned to the track" sit under it; then three columns: the situation, an enlargement of the objective with the goal written under it, and the pods to pack. The clock and "Board the Osprey" sit at the head, always in view. Below 1100px the situation spans both remaining columns.

### Named Rules
**The Clear Field Rule.** Chrome holds the edges and corners. Nothing covers the ranger's surroundings during play, and windows over the field stand off-centre or over a dim, never over a blank page.

**The Whole Pixel Rule.** All field art is drawn on whole pixels at 480x300 and upscaled by integers with `image-rendering: pixelated`. Never scale by fractions, smooth, or mix resolutions.

## Elevation & Depth

The field has real light: a low south-west sun, shadows leaning north-east at 1.05 px east and 0.42 px north per pixel of height, tapered, all gathered and multiplied in one pass, plus the warm glow, cool corner, haze and vignette. The chrome has no light at all: paper lies flat, and lifts only by a hard, unblurred ink offset.

### Shadow Vocabulary
- **Sheet lift** (`7px 7px 0 rgba(20,18,12,.55)`): sheets, windows, the title sheet, the map view.
- **Label lift** (`4px 4px 0 rgba(20,18,12,.6)`): HUD labels; at full alert the alert label's goes red-brown.
- **Card lift** (`4px 4px 0 ink`): a focused mission or difficulty card.
- **Neatline** (`inset 0 0 0 4px stock, inset 0 0 0 5px ink` inside a 1.5px ink border): every sheet's double rule.

### Named Rules
**The Low Sun Rule.** Every standing object and person in the field casts its shadow north-east along the kit's lean (SX 1.05, SY -0.42), multiplied in the zone shade. Never use a CSS drop shadow or a south-falling shadow on field art.

**The Flat Paper Rule.** No translucency, no backdrop blur, no glow, no gradient fill on chrome. A sheet is opaque stock; depth is a hard offset.

## Shapes

Every corner in the chrome is square. Borders are 1.5px ink, hairlines 1px. Keycaps carry a 3px bottom edge so they read as keys. In the field, sprites carry a one-pixel dark outline and are built from rows of pixels. Small indicators are pixel grids drawn in ink (`js/hud.js` icons), pixel art (`js/insignia.js` ribbons and rank insignia), or tiny inline SVG (back, close, pause, sound, the declination diagram). Grease-pencil marks are SVG strokes, the flight plan's roughened by a displacement filter. There are no glyph-font icons.

## Components

### Buttons
Ink on paper, inked in when chosen.
- **Default:** transparent, a 1.5px ink border, ink words at 600. Focus fills it with ink and turns the words to stock. The pointer moves focus, so hover and focus are the same state.
- **Primary:** ink-filled at rest. Focus adds a hard grease-red offset under it.
- **Danger:** a red border and red words; focus fills it red.
- **Quiet:** borderless and muted; focus draws the ink border.
- **Disabled:** 45% opacity.

### Toggle Pills
Transparent buttons led by an 11px square, outlined when off and filled with ink when on; the "on" pill takes a full ink border.

### Legend Rows (title menu, pause window)
The signature selection device. The title's menu is the sheet's legend: a keycap, the item, a dotted leader, and what the item says about itself. The pause window's rows are the same without the leader. The focused row gets a grease-red loop drawn round it, and nothing else changes. Title rows arrive one at a time (0.32s, 45ms stagger, 8px from the left), skipped under reduced motion. The foot of the title sheet carries the declination diagram and the credit.

### Cards (missions, difficulty) and Pod Slots
Paper cards with an ink border. A focused card takes a 3px grease-red ring and a hard ink offset. The last difficulty chosen is ink-filled. Pod slots are inset stock with the item's ink icon over its name; focus is the grease ring.

### Sheets
Map stock with the neatline and sheet lift. A head (title, a quiet back or close), optional tabs (muted, a 3px grease underline when selected), and a scrolling body. Section headings are uppercase labels ruled underneath in ink.

### HUD Labels
Paper labels, 1.5px ink border, label lift. Inside: uppercase labels, pixel-face numerals, ink pixel icons, outlined bar segments filled with ink (amber, then red, as fatigue builds), outlined target diamonds filled green when done.
- **Alert:** an eye, a label, the state word stamped in its signal colour inside a tilted border, and a three-segment meter. At full alert the label's border and offset go red.
- **Toasts:** small labels stacked in the lower centre; red toasts are red-filled.

### Inputs
Input stock, a 1.5px ink border. Focus adds a 2px grease-red outline.

### Vision Cones (field)
Only with the awareness aid on: a radial wedge from an enemy that fades to clear, amber when it suspects and red-orange when it has seen, with dashed edges. A "?" or "!" mark sits over the soldier.

## Do's and Don'ts

### Do:
- **Do** draw field art on whole pixels at 480x300 with 24px tiles, and upscale only by whole numbers.
- **Do** cast grounded shadows north-east and multiply them in the zone's shade colour in one pass.
- **Do** build field colour from the zone and material ramps in `js/kit.js`.
- **Do** make chrome opaque map stock with ink borders, the neatline on sheets, and hard offset shadows.
- **Do** mark the chosen thing with grease pencil (a loop, a ring) and fill chosen controls with ink.
- **Do** keep green, amber and red for ready, suspicion and danger, each paired with a word, count or shape.
- **Do** set words in Archivo, numbers and keys in Pixelify Sans, and grease pencil in Kalam.

### Don't:
- **Don't** bring back dark translucent glass, backdrop blur, glows or rounded panels.
- **Don't** let grease pencil spread: no scribbles for decoration, no Kalam paragraphs.
- **Don't** bring back the C64 look as the default. The 16-colour palette (`js/palette.js`) and the 16px tile art (`js/art.js`) are retired legacy, overridden by the kit; scanlines are only an opt-in preference.
- **Don't** flatten the view to straight top-down tokens.
- **Don't** use glossy, bevelled or gradient-filled buttons, or cartoon gloss (PRODUCT.md: never a mobile game).
- **Don't** use black or grey drop shadows for anything standing on the ground.
- **Don't** use glyph or emoji icons. Draw icons as pixel grids or small inline SVG.
