---
name: Airborne Puma
description: Airborne Ranger's tilted overhead battlefield redrawn as modern hi-bit pixel art, under calm dark panels.
colors:
  signal-green: "#7fb069"
  signal-green-lit: "#9fcf88"
  suspicion-amber: "#e8a33d"
  danger-red-orange: "#e4572e"
  danger-text: "#ff9475"
  puma-tawny: "#d8a868"
  night-page: "#0c0d11"
  field-panel: "rgba(20,22,28,.94)"
  hud-panel: "rgba(20,22,28,.86)"
  panel-ink: "#14161c"
  control-rest: "#1c1f27"
  control-lit: "#262a35"
  bone-text: "#e9e4d8"
  dust-muted: "#aaa69c"
  dust-faint: "#8f8b82"
  hairline: "rgba(233,228,216,.10)"
  edge-line: "rgba(233,228,216,.18)"
  sprite-outline: "#1d1917"
  desert-shade: "#9893d2"
  temperate-shade: "#8f9ab8"
  arctic-shade: "#9fb0d8"
typography:
  display:
    fontFamily: "Barlow Semi Condensed, Bahnschrift SemiCondensed, Bahnschrift, Arial Narrow, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(56px, 6.4vw, 92px)"
    fontWeight: 700
    lineHeight: 0.9
    letterSpacing: "0.005em"
  headline:
    fontFamily: "Barlow Semi Condensed, Bahnschrift SemiCondensed, Bahnschrift, Arial Narrow, Segoe UI, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 600
    lineHeight: 1.1
  title:
    fontFamily: "Barlow Semi Condensed, Bahnschrift SemiCondensed, Bahnschrift, Arial Narrow, Segoe UI, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.15
  body:
    fontFamily: "Barlow Semi Condensed, Bahnschrift SemiCondensed, Bahnschrift, Arial Narrow, Segoe UI, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: 1.45
  label:
    fontFamily: "Barlow Semi Condensed, Bahnschrift SemiCondensed, Bahnschrift, Arial Narrow, Segoe UI, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    letterSpacing: "0.14em"
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
  pixel: "2px"
  key: "3px"
  control: "4px"
  panel: "6px"
  sheet: "8px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button:
    backgroundColor: "{colors.control-rest}"
    textColor: "{colors.bone-text}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
  button-focus:
    backgroundColor: "{colors.control-lit}"
    textColor: "{colors.bone-text}"
  button-primary:
    backgroundColor: "{colors.signal-green}"
    textColor: "{colors.panel-ink}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
  button-primary-focus:
    backgroundColor: "{colors.signal-green-lit}"
    textColor: "{colors.panel-ink}"
  button-danger:
    textColor: "{colors.danger-text}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
  button-danger-focus:
    backgroundColor: "{colors.danger-red-orange}"
    textColor: "{colors.panel-ink}"
  button-quiet:
    textColor: "{colors.dust-muted}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
  menu-row:
    textColor: "{colors.bone-text}"
    height: "50px"
    padding: "0 22px"
  keycap:
    textColor: "{colors.bone-text}"
    typography: "{typography.key}"
    rounded: "{rounded.key}"
    padding: "3px 6px"
  input:
    backgroundColor: "{colors.night-page}"
    textColor: "{colors.bone-text}"
    rounded: "{rounded.control}"
    padding: "8px 10px"
  sheet:
    backgroundColor: "{colors.field-panel}"
    textColor: "{colors.bone-text}"
    rounded: "{rounded.sheet}"
    width: "min(880px, 100%)"
  hud-panel:
    backgroundColor: "{colors.hud-panel}"
    textColor: "{colors.bone-text}"
    rounded: "{rounded.panel}"
    padding: "12px 14px"
---

# Design System: Airborne Puma

## Overview

**Creative North Star: "The 1987 View, Today's Finish"**

Airborne Puma is the overhead, north-facing, tilted battlefield of *Airborne Ranger*, redrawn as hi-bit pixel art and lit by a low south-west sun. The field is the whole screen. Everything with height shows its roof and its south face, and every grounded thing throws a long blue-violet shadow to the north-east. Dust haze, a warm wash from the lower left and a soft vignette sit over the pixels as light, not as an effect. People stand upright in eight headings inside a dark outline; they also crawl prone and fall, and the ranger draws back and lunges with the knife. The puma reads tawny and the wolves read grey, so the cast is clear at a glance.

The chrome is the opposite material: flat, dark, translucent panels with hairline edges, set at the corners of the field so the ranger and the ground stay clear. Words use a condensed workhorse sans. Numbers and keys use a pixel face, which is how the panels join the pixel field without mimicking it. The menus are the same calm panels laid over a dimmed field or the title battlefield. No page anywhere is a separate "app".

The world rejects two things by name: an emulated C64 screen (the retired 16-colour palette, CRT framing) and a flat top-down token board. Per PRODUCT.md it must also never look like a mobile game. That rules out glossy or bevelled buttons, cartoon gloss and free-to-play energy.

**Key Characteristics:**
- A 480x300 pixel canvas with 24px tiles, scaled up by a whole number when that fills at least 86% of the window, otherwise by the exact fraction that fits, and always nearest-neighbour.
- A low south-west sun: shadows lean north-east and are multiplied over the ground in a single pass, in each zone's own shade colour.
- Three zones (desert, temperate, arctic) painted by the same painters from separate seven-step ground ramps.
- Dark translucent panels, hairline borders, off-white words.
- Three signal colours (green, amber, red-orange) that mean ready, suspicion and danger. They are never used as decoration.
- Two voices: a condensed sans for words and a pixel face for numbers and keys.

## Colors

The world has two palettes. The field is warm, sunlit and ramp-built. The chrome is near-black and bone-white, with three signal colours on top.

### Primary
- **Signal Green** (signal-green): ready, chosen, the way forward. It fills the primary button, marks the selected tab underline (Signal Green Lit on the focused tab), the focused menu row's wash and chevron, the "Quiet" alert state, the active weapon slot, destroyed-target pips and the green light for the jump. **Signal Green Lit** (signal-green-lit) is used for the focused primary button and for links.

### Secondary
- **Suspicion Amber** (suspicion-amber): someone has noticed. It marks the "Suspicious" alert state, high fatigue, suspicion vision cones (drawn in the canvas as rgb 240,150,30), honours panels and the time-bomb pod swatch.

### Tertiary
- **Danger Red-Orange** (danger-red-orange): seen, hurt, out of time. It marks the full-alert state and its panel edge, wounds, the low clock, winded fatigue, enemy targets on the minimap, the "seen" cones and danger-button fills. When danger is set as words on a panel, use **Danger Text** (danger-text) for contrast.
- **Puma Tawny** (puma-tawny): the ranger's own colour. In chrome it appears only on "PUMA" in the title mark. In the field it is the puma fur ramp in the art kit.

### Neutral
- **Night Page** (night-page): the page behind everything, input fields, the memorial card.
- **Field Panel** (field-panel): sheets, the pause window and the title menu at 94% opacity.
- **HUD Panel** (hud-panel): HUD panels at 86% opacity, so the field shows through a little more during play. The direction contract named ~88%. The build settled on 86% for the HUD and 94% for sheets, The art kit defines `K.UI.panel` at 88%, but nothing draws with it: canvas-drawn chrome uses the panel colour at 38 to 90% as each mark needs.
- **Panel Ink** (panel-ink): dark text set on green or red fills, and the backing of the fly-over view.
- **Control Rest / Control Lit** (control-rest, control-lit): a button at rest and a button under the cursor.
- **Bone Text** (bone-text): every word, at 14.9:1 on a panel. Menu rows at rest use it at 86% alpha.
- **Dust Muted** (dust-muted, 7.4:1) and **Dust Faint** (dust-faint, 5.2:1): secondary words, metadata and placeholders. HUD labels use bone text at 66% alpha.
- **Hairline / Edge Line** (hairline, edge-line): dividers inside panels, and the outer edge of panels and controls.
- **Sprite Outline** (sprite-outline): the one-pixel dark ring round people and small things, and the soft ellipse shadow under anything airborne.
- **Zone Shades** (desert-shade, temperate-shade, arctic-shade): the colour each zone's shadow pass is multiplied in. They are cool and blue-violet, never black.

The field's ground, dirt, scrub, rock, wall, roof, water, ice and trench ramps per zone, and the shared material ramps (olive, steel, concrete, wood, canvas, red, fire, smoke, puma, wolf), live in `js/kit.js` and `js/people.js`. They are defined in `K.Z` and `K.MAT` in `js/kit.js`, and the people's ramps in `js/people.js`. Ramps run from light to dark, and the art picks steps from them by light and noise. Do not mix free hexes into the field.

### Named Rules
**The Three Signals Rule.** Green means ready or chosen, amber means suspicion, red-orange means danger. These three hues carry state and nothing else, and state never travels by colour alone: the alert pill says QUIET, SUSPICIOUS or FULL ALERT and fills one, two or three meter segments.

**The Cool Shade Rule.** Grounded shadows on the field are the zone's shade colour multiplied over the ground, never grey or black. Only airborne things (the Osprey, a parachute, a falling pod) cast a soft dark shadow, because they are off the ground: an ellipse in sprite-outline at 12 to 40% alpha in the field (the Osprey's fades as it climbs), and plain black at 28 to 35% on the fly-over.

## Typography

**Display Font:** Barlow Semi Condensed 500/600/700, self-hosted (falling back to Bahnschrift SemiCondensed, Arial Narrow and system-ui)
**Body Font:** Barlow Semi Condensed
**Label/Mono Font:** Pixelify Sans, self-hosted (falling back to ui-monospace), for numerals and keycaps only

**Character:** A condensed military workhorse sans keeps words tight and readable over the field. The pixel face sets the clock, round counts, scores and keys, so the numbers you act on share the field's grain.

### Hierarchy
- **Display** (display): the title mark only, "AIRBORNE / PUMA", in uppercase with a soft text shadow over the battlefield.
- **Headline** (headline): sheet titles. The pause window raises this to 40px, and the end-of-mission banner uses 36px.
- **Title** (title): a mission's name. Debrief raises it to 38px, coloured by outcome (green retrieved, amber, danger text, muted).
- **Body** (body): sheet prose, capped at 70ch. Menu rows use 19 to 20px at weight 500. The HUD runs at 15px with a 1.2 line height.
- **Label** (label): uppercase field labels beside data (WOUNDS, FATIGUE, LOADOUT, OBJECTIVE, POD 1) and section headings inside sheets, in muted colour.
- **Numeral** (numeral): the HUD clock at 34px, rounds at 40px, merit-table figures, pip counts.
- **Key** (key): every keycap, at 12 to 13px.

### Named Rules
**The Two Voices Rule.** Words are Barlow Semi Condensed and numbers you act on and keys you press are Pixelify Sans. Never set prose in the pixel face, and never set the clock in the sans.

## Layout

The play field fills the window: a 480x300 canvas scaled up by a whole number when that fills at least 86% of the window, otherwise by the exact fraction that fits, and always nearest-neighbour, letterboxed on black. Four light layers sit over it (sun, cool shade, haze, vignette), and the HUD sits above them as DOM. HUD panels hold the corners at a 16px inset. The status panel (268px) is top left, the alert pill is top centre (with the Osprey's status pill beside it, or below it at 64px), the minimap and objective (236px) are top right, the loadout (330px) is bottom left, and the key-hint pill is bottom centre. Pause and sound sit bottom right at 36px. The pause window stands right of centre (min(440px, 100%)) over a field dimmed by a left-to-right gradient, so the ranger stays visible. Sheets centre over a 74% dim with a 3px blur at min(880px, 100%), or min(1180px, 100%) for wide sheets, inside a 32px margin, with 24px side padding inside. The title sets the mark and menu panel (min(460px, 100%)) in a left column inset clamp(32px, 7vw, 120px), with the battlefield behind it shaded from the left. The spacing rhythm is 4/8/16/24/32, with 12, 14 and 22 inside dense panels. Desktop only: below 760x480 a note replaces the game. Mission orders collapse to one column below 1024px wide.

### Named Rules
**The Clear Field Rule.** Chrome holds the edges and corners. Nothing opaque covers the ranger's surroundings during play, and windows over the field stand off-centre or over a dim, never over a blank page.

**The Whole Pixel Rule.** All field art is drawn on whole pixels at 480x300 and upscaled with `image-rendering: pixelated`, by a whole number whenever that fills at least 86% of the window. Never smooth or mix resolutions. The one exception today is the Tab map view, which smooths the small map as it enlarges it.

## Elevation & Depth

The field has real light: a low south-west sun, shadows leaning north-east at 1.05 px east and 0.42 px north per pixel of height, tapered, all gathered and multiplied in one pass. A warm soft-light glow sits at the lower left, a cool multiply at the upper right, a thin dust haze at the top and a violet-black vignette. The chrome is flat panels lifted by soft ambient shadows. They read as glass over the field, not as cards.

### Shadow Vocabulary
- **Sheet lift** (`box-shadow: 0 24px 70px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.04)`): sheets and windows.
- **Title menu lift** (`box-shadow: 0 18px 50px rgba(0,0,0,.45)`): the title menu panel.
- **HUD lift** (`box-shadow: inset 0 1px 0 rgba(255,255,255,.035), 0 8px 22px rgba(0,0,0,.28)`): HUD panels.
- **Focus ring** (`box-shadow: 0 0 0 1px #7fb069`; primary: `0 0 0 2px #0c0d11, 0 0 0 4px #e9e4d8`): the lit control.

### Named Rules
**The Low Sun Rule.** Every standing object and person in the field casts its shadow north-east along the kit's lean (SX 1.05, SY -0.42), multiplied in the zone shade. Never use a CSS drop shadow or a south-falling shadow on field art.

## Shapes

Corners are small and consistent. Weapon slots and toggle squares use a 2px pixel radius, and the HUD's bar and meter segments 1px. Keycaps use 3px, with a heavier 2px bottom edge so they read as keys. Controls and inputs use 4px, HUD panels, mission cards, pods and recon images use 6px, and sheets, the title menu and the memorial card use 8px. Borders are always 1px hairlines. In the field, sprites carry a one-pixel dark outline, and sprite shapes are built from rows of pixels, not vector paths. Small indicators are drawn as pixel grids (`js/hud.js` icons, `js/insignia.js` ribbons and rank insignia) or as tiny inline SVG (back, close, pause, sound). There are no glyph-font icons.

## Components

### Buttons
Matte and quiet, lit only when focused.
- **Shape:** gently squared (control radius).
- **Default:** control-rest fill, edge-line border, bone text at weight 600. Focus switches to control-lit with a green border and a 1px green ring. The pointer moves focus, so hover and focus are the same state.
- **Primary:** a signal-green fill with panel-ink text. Focus brightens it to green-lit with a double ring (page, then bone).
- **Danger:** transparent, with a red-orange border at 70% and danger-text words. Focus fills it red-orange with panel-ink text.
- **Quiet:** transparent and muted. Focus gives it the default button's face.
- **Disabled:** 45% opacity.

### Toggle Pills
- **Style:** transparent buttons led by a 10px square (pixel radius), outlined when off and filled green when on. The "on" pill gets a 12% green wash and a 65% green border.

### Menu Rows (title menu, pause window)
The signature selection device. Rows run edge to edge at 46 to 50px with no border. A keycap sits on the left and muted metadata on the right. The focused row gets a green wash fading left to right (`linear-gradient(90deg, rgba(127,176,105,.26), rgba(127,176,105,.06) 75%, transparent)`), turns weight 600, and shows a solid green triangle: at the left edge on the title, at the right end in the pause window. Title rows arrive one at a time (0.32s, 45ms stagger, slide in 8px from the left), which is skipped under reduced motion.

### Keycaps
- **Style:** pixel face, bone text, 6% bone fill, 28% bone border with a 2px bottom edge, key radius. In a focused menu row the keycap's border turns green.

### Sheets / Containers
- **Corner Style:** sheet radius. **Background:** field-panel. **Border:** edge-line. **Shadow:** sheet lift.
- **Structure:** a head (title, plus a quiet back or close with an inline SVG chevron or cross), optional tabs (muted, a 2px green underline when selected, 22px apart), and a scrolling body padded 22px 24px 26px. Pods and inset panels use 22% black and a hairline at panel radius.

### HUD Panels
- **Style:** hud-panel fill, an 8% bone border, panel radius, HUD lift. Inside: uppercase labels, pixel-face numerals, pixel-grid icons, segmented bars (12x10 segments, 3px gaps) and diamond target pips.
- **Alert pill:** 40px high, centred. An eye icon, a label, the state word in its signal colour, and a three-segment meter. At full alert the panel border turns red-orange.
- **Toasts:** small panels stacked in the lower centre, tinted by signal. Red toasts take a deep red fill.

### Inputs / Fields
- **Style:** night-page fill, edge-line border, control radius. **Focus:** the border turns green and there is no glow. Placeholder text is dust-faint.

### Vision Cones (field)
These appear only with the awareness aid on. Each is a radial wedge from an enemy that fades to clear, amber when it suspects and red-orange when it has seen, with dashed edges so it reads on pale ground. A "?" or "!" mark sits over the soldier.

## Do's and Don'ts

### Do:
- **Do** draw field art on whole pixels at 480x300 with 24px tiles, and upscale by whole numbers wherever they fill the window.
- **Do** cast grounded shadows north-east along SX 1.05 / SY -0.42 and multiply them in the zone's shade colour in one pass.
- **Do** build field colour from the zone and material ramps in `js/kit.js`, light to dark, and outline people and small things in sprite-outline.
- **Do** keep chrome as flat dark translucent panels with 1px hairlines: HUD at 86%, sheets and menus at 94%.
- **Do** reserve green, amber and red-orange for ready, suspicion and danger, and pair each with a word, count or shape.
- **Do** set words in Barlow Semi Condensed and numbers and keys in Pixelify Sans.
- **Do** light only the focused control: green fill or wash for the way forward, everything else matte.

### Don't:
- **Don't** bring back the C64 look as the default. The 16-colour palette (`js/palette.js`) and the 16px tile art (`js/art.js`) are retired legacy, overridden by the kit, and the scanline overlay is only an opt-in player preference.
- **Don't** flatten the view to straight top-down tokens: standing things show their roof and south face, and people are drawn upright, not as tokens.
- **Don't** use glossy, bevelled or gradient-filled buttons, or cartoon gloss (PRODUCT.md: never a mobile game). The focused row's fading green wash is the only gradient on a control; elsewhere gradients are only the dims and shades behind windows and the title.
- **Don't** use black or grey drop shadows for anything standing on the ground.
- **Don't** set prose in the pixel face or use a system display face for the title mark.
- **Don't** use glyph or emoji icons. Draw icons as pixel grids or small inline SVG.
