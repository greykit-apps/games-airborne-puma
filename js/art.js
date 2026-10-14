/* Airborne Puma -- every picture, drawn here in code: no image files.
 *
 * Ground tiles are 16 pixels square, painted per zone (sand, grass or snow
 * under the same rules) with a little seeded noise so no two are alike.
 * Installations are drawn at their footprint, with height above it. People
 * are built from parts: legs that walk, a torso, a gun that points wherever
 * the crosshair does (all thirty-two ways), and a head from a small grid --
 * the puma's ears and muzzle, or an enemy helmet. Everything is cached the
 * first time it is asked for, and rebuilt when the palette changes. */
"use strict";
(() => {
  const T = AP.T, K = AP.COL;
  let P = AP.pal();
  const cache = new Map();
  const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
  const get = (key, make) => { let c = cache.get(key); if (!c) { c = make(); cache.set(key, c); } return c; };

  function pen(c) {
    const g = c.getContext("2d");
    const o = {
      g,
      px(x, y, i) { if (i == null || i < 0) return; g.fillStyle = P[i]; g.fillRect(Math.round(x), Math.round(y), 1, 1); },
      rect(x, y, w, h, i) { g.fillStyle = P[i]; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); },
      ell(cx, cy, rx, ry, i) {
        for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
          if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) o.px(x, y, i);
      },
      line(x0, y0, x1, y1, i) {
        const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
        for (let k = 0; k <= n; k++) o.px(x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n, i);
      },
      grid(rows, x, y, map, flip) {
        rows.forEach((r, yy) => [...r].forEach((ch, xx) => { if (map[ch] !== undefined) o.px(x + (flip ? r.length - 1 - xx : xx), y + yy, map[ch]); }));
      },
    };
    return o;
  }
  const seeded = (...k) => AP.mulberry(k.reduce((h, v) => Math.imul(h ^ (typeof v === "string" ? [...v].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) : v), 2654435761), 17));

  function keyline(c, col = 0) {
    const g = c.getContext("2d"), W = c.width, H = c.height, d = g.getImageData(0, 0, W, H), a = i => d.data[i * 4 + 3];
    const ring = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (a(y * W + x)) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const nx = x + dx, ny = y + dy; return nx >= 0 && ny >= 0 && nx < W && ny < H && a(ny * W + nx); })) ring.push([x, y]);
    }
    g.fillStyle = P[col];
    for (const [x, y] of ring) g.fillRect(x, y, 1, 1);
  }

  AP.buildArt = name => { AP.palName = AP.PALETTES[name] ? name : "c64"; P = AP.pal(); cache.clear(); };
  AP.color = i => P[i];

  /* ---- the zones' colours ---- */
  const ZC = {
    desert:    { base: 7, lite: 7, dark: 8, deep: 9, scrub: [8, 9], wall: [8, 9, 10], roof: [10, 8], water: [6, 14], bad: [9, 8, 0] },
    temperate: { base: 5, lite: 13, dark: 9, deep: 11, scrub: [13, 5, 11], wall: [12, 11, 15], roof: [2, 10], water: [6, 14], bad: [11, 9, 0] },
    arctic:    { base: 1, lite: 1, dark: 15, deep: 3, scrub: [1, 15, 3], wall: [15, 3, 1], roof: [1, 15], water: [6, 14], bad: [11, 12, 0] },
  };
  AP.zoneColors = ZC;

  /* ---- ground ---- */
  AP.tileArt = (zone, id, v) => get(`t${zone}${id}.${v}`, () => {
    const c = mk(16, 16), p = pen(c), z = ZC[zone], r = seeded(zone, id, v);
    const ground = (k = 1) => { p.rect(0, 0, 16, 16, z.base); for (let i = 0; i < 9 * k; i++) p.px(r() * 16, r() * 16, r() < 0.8 || z.lite === z.base ? z.dark : z.lite); };
    switch (id) {
      case T.OPEN: ground(); break;
      case T.ROUGH: ground(2); for (let i = 0; i < 4; i++) { const x = r() * 13, y = r() * 13; p.rect(x, y, 2 + r() * 2, 1, z.dark); p.px(x + 1, y - 1, z.deep); } break;
      case T.BUSH: {
        ground();
        const [a, b, cc] = z.scrub;
        const n = zone === "arctic" ? 1 : 2 + (r() * 2 | 0);
        for (let i = 0; i < n; i++) {
          const x = 4 + r() * 8, y = 5 + r() * 7, rx = zone === "arctic" ? 7 : 3 + r() * 2, ry = zone === "arctic" ? 4 : 2.5 + r();
          if (zone === "arctic") { p.ell(x, y + 1.5, rx, ry, cc); p.ell(x, y, rx, ry, b); p.ell(x - 1, y - 1, rx - 2, ry - 1.5, a); }
          else { p.ell(x, y + 1, rx, ry, cc === undefined ? b : cc); p.ell(x, y, rx, ry, b); for (let k = 0; k < 8; k++) p.px(x - rx + r() * rx * 2, y - ry + r() * ry * 1.5, a); }
        }
        break;
      }
      case T.ROCK: ground(); p.ell(8, 10, 6.5, 4.5, 11); p.ell(8, 9, 6, 4, 12); p.ell(6.5, 7.5, 3, 2, 15); p.px(5, 7, 1); break;
      case T.TREE: ground(); p.ell(9, 13, 6, 2.5, z.dark); p.rect(7, 9, 2, 6, 9); break;
      case T.WALL: {
        ground();
        const [a, b, cc] = z.wall;
        p.rect(0, 4, 16, 9, b);
        for (let x = 0; x < 16; x += 5) { p.ell(x + 2.5, 6.5, 2.6, 2, a); p.ell(x + 2.5 + (x % 10 ? 0 : 0), 10, 2.6, 2, a); }
        p.rect(0, 12, 16, 1, b); p.rect(0, 13, 16, 2, z.dark);
        for (let x = 1; x < 16; x += 5) p.px(x, 5, cc);
        break;
      }
      case T.TRENCH: {
        p.rect(0, 0, 16, 16, z.deep === 3 ? 15 : z.dark);
        p.rect(0, 0, 16, 2, z.base); p.rect(0, 2, 16, 1, z.deep);
        p.rect(0, 14, 16, 2, z.deep === 3 ? 3 : z.deep);
        for (let i = 0; i < 10; i++) p.px(r() * 16, 3 + r() * 10, z.deep);
        break;
      }
      case T.WIRE:
        ground();
        for (const x of [2, 13]) { p.rect(x, 3, 1, 11, 9); p.px(x, 2, 8); }
        for (let x = 0; x < 16; x++) { p.px(x, 6 + (x % 4 < 2 ? 0 : 1), 11); p.px(x, 10 + (x % 4 < 2 ? 1 : 0), 11); if (x % 3 === 0) p.px(x, 8, 12); }
        break;
      case T.MINE:
        ground();
        for (let i = 0; i < 2; i++) { const x = 3 + r() * 9, y = 3 + r() * 9; p.rect(x, y, 3, 2, 11); p.px(x + 1, y - 1, 12); }
        break;
      case T.WATER: {
        p.rect(0, 0, 16, 16, 6);
        for (let i = 0; i < 6; i++) { const x = r() * 12, y = r() * 15; p.rect(x, y, 3 + r() * 3, 1, 14); }
        if (zone === "arctic") for (let i = 0; i < 2; i++) p.ell(3 + r() * 10, 3 + r() * 10, 2, 1.2, 3);
        break;
      }
      case T.ICE: p.rect(0, 0, 16, 16, 3); for (let i = 0; i < 5; i++) { const x = r() * 12, y = r() * 15; p.rect(x, y, 4, 1, 1); } break;
      case T.THIN: {
        p.rect(0, 0, 16, 16, 3);
        let x = r() * 16, y = 0;
        for (let i = 0; i < 18; i++) { p.px(x, y, 14); x += (r() - 0.5) * 3; y += 1; }
        for (let i = 0; i < 6; i++) p.px(r() * 16, r() * 16, 6);
        break;
      }
      case T.BAD: {
        const [a, b, cc] = z.bad;
        p.rect(0, 0, 16, 16, a);
        for (let i = 0; i < 5; i++) { const x = r() * 16, y = r() * 16; p.ell(x, y, 2 + r() * 3, 1.5 + r() * 2, b); p.px(x - 1, y - 1, cc); }
        break;
      }
      case T.FLOOR: p.rect(0, 0, 16, 16, 12); p.rect(0, 15, 16, 1, 11); p.rect(15, 0, 1, 16, 11); for (let i = 0; i < 6; i++) p.px(r() * 16, r() * 16, 15); break;
      case T.ROAD: p.rect(0, 0, 16, 16, 11); for (let i = 0; i < 10; i++) p.px(r() * 16, r() * 16, 12); if (v % 2 === 0) p.rect(3, 7, 10, 2, 1); break;
      case T.TRAP: ground(); p.line(3, 4, 13, 13, 11); p.line(13, 4, 3, 13, 11); p.line(8, 3, 8, 14, 12); p.line(4, 4, 12, 12, 12); break;
      case T.CRATER: ground(); p.ell(8, 8.5, 7, 5.5, z.dark); p.ell(8, 9, 5, 4, z.deep === 3 ? 12 : z.deep); p.ell(8, 9.5, 2.5, 2, 0); for (let i = 0; i < 6; i++) p.px(r() * 16, r() * 16, 11); break;
      case T.PIPE: ground(); p.rect(0, 5, 16, 6, 12); p.rect(0, 5, 16, 1, 15); p.rect(0, 10, 16, 1, 11); p.rect(0, 11, 16, 2, z.dark); if (v === 0) { p.rect(7, 4, 3, 8, 15); p.rect(7, 11, 3, 1, 11); } break;
      case T.HWALL: {
        const [a, b] = z.roof;
        p.rect(0, 0, 16, 16, a);
        for (let y = 2; y < 16; y += 4) p.rect(0, y, 16, 1, b);
        p.rect(0, 15, 16, 1, 0);
        break;
      }
      default: ground();
    }
    return c;
  });
  /* the half-size ground for the fly-over and the map */
  AP.tileArtSmall = (zone, id, v) => get(`s${zone}${id}.${v}`, () => {
    const c = mk(8, 8), g = c.getContext("2d");
    g.imageSmoothingEnabled = true;
    g.drawImage(AP.tileArt(zone, id, v), 0, 0, 8, 8);
    return c;
  });

  /* trees stand up above their tile: drawn with the people, sorted by depth */
  AP.treeArt = (zone, v) => get(`tree${zone}${v}`, () => {
    const c = mk(18, 30), p = pen(c), r = seeded("tree", zone, v);
    if (zone === "arctic") {
      p.rect(8, 22, 2, 6, 9);
      for (let i = 0; i < 4; i++) { const y = 4 + i * 5, w = 2 + i * 2; p.ell(9, y + 2, w + 0.5, 2.6, 5); p.ell(9, y + 1, w - 0.5, 1.3, 1); }
      p.px(9, 2, 5); p.px(9, 3, 5);
    } else if (zone === "desert") {
      p.rect(8, 8, 3, 20, 5); p.rect(8, 8, 1, 20, 13);
      p.rect(4, 13, 2, 7, 5); p.rect(4, 19, 4, 2, 5); p.rect(13, 11, 2, 6, 5); p.rect(11, 16, 4, 2, 5);
      for (let i = 0; i < 6; i++) p.px(8 + r() * 3, 9 + r() * 18, 1);
    } else {
      p.rect(8, 18, 2, 10, 9);
      p.ell(9, 11, 8, 7.5, 11); p.ell(9, 10, 7.5, 7, 5); p.ell(7, 8, 4, 3.5, 13);
      for (let i = 0; i < 10; i++) p.px(3 + r() * 12, 5 + r() * 10, r() < 0.5 ? 13 : 11);
    }
    return c;
  });

  /* ---- things built on the ground ---- */
  /* returns { c, up }: the canvas, and how far above the footprint it reaches */
  AP.objArt = (k, dead, zone, extra) => get(`o${k}${dead ? 1 : 0}${zone}${extra || ""}`, () => {
    const d = AP.OBJ[k], W = d.w * 16, Hh = d.h * 16, up = { bunker: 6, turret: 6, guardhouse: 10, shack: 10, magazine: 6, pump: 12, radio: 20, tent: 8, avfuel: 8, fuel: 4, sam: 8, dish: 14, pyramid: 10, alarm: 12, prox: 8, plane: 2, craft: 2, door: 6 }[k] || 0;
    const c = mk(W, Hh + up), p = pen(c), z = ZC[zone], r = seeded(k, zone);
    const by = Hh + up;     /* the ground line */
    const rubble = () => { for (let i = 0; i < W * Hh / 10; i++) p.px(r() * W, up + r() * Hh, [11, 12, 0, 9][i % 4]); p.ell(W / 2, by - Hh / 2, W / 2.4, Hh / 3, 0); for (let i = 0; i < 12; i++) p.px(W / 2 + (r() - 0.5) * W * 0.8, by - Hh / 2 + (r() - 0.5) * Hh * 0.6, 12); };
    if (dead && k !== "lever" && k !== "pit" && k !== "radio" && k !== "craft") { rubble(); return { c, up }; }
    switch (k) {
      case "bunker": case "magazine":
        p.rect(1, up, W - 2, Hh - 2, 11); p.rect(1, up - 4, W - 2, Hh - 6, 12); p.rect(2, up - 3, W - 4, 2, 15);
        p.rect(4, by - 10, W - 8, 3, 0);
        if (k === "magazine") { p.rect(W / 2 - 4, up + 2, 8, 6, 7); p.px(W / 2, up + 4, 0); p.px(W / 2, up + 6, 0); }
        break;
      case "mg":
        p.ell(W / 2, by - Hh / 2, W / 2 - 1, Hh / 2 - 2, z.wall[1]);
        p.ell(W / 2, by - Hh / 2 - 1, W / 2 - 2, Hh / 2 - 3, z.wall[0]);
        p.ell(W / 2, by - Hh / 2, W / 2 - 6, Hh / 2 - 7, z.dark);
        p.rect(W / 2 - 1, by - Hh / 2, 2, 9, 0);
        break;
      case "turret":
        p.ell(W / 2, by - Hh / 2 + 2, W / 2 - 1, Hh / 2 - 3, 11);
        p.ell(W / 2, by - Hh / 2 - 2, W / 2 - 3, Hh / 2 - 4, 12);
        p.ell(W / 2 - 3, by - Hh / 2 - 5, 4, 2, 15);
        break;
      case "minib":
        p.ell(8, by - 6, 7, 5, 11); p.ell(8, by - 8, 6, 4.5, 12); p.rect(3, by - 8, 10, 1, 0); p.px(5, by - 11, 15);
        break;
      case "sam":
        p.rect(4, by - 10, W - 8, 6, 11); p.rect(6, by - 12, W - 12, 3, 12);
        for (const x of [9, 19]) { p.rect(x, up - 4, 3, 20, 1); p.rect(x, up - 6, 3, 2, 2); p.rect(x - 1, up + 13, 5, 2, 11); }
        break;
      case "plane": {
        const cx = W / 2;
        p.rect(cx - 2, up + 1, 4, Hh - 2, 12); p.rect(cx - 1, up, 2, 3, 15);
        p.line(cx - 2, up + 12, 3, up + 20, 12); p.line(cx + 2, up + 12, W - 4, up + 20, 12);
        for (let y = 0; y < 8; y++) p.line(cx - 2, up + 12 + y * 0.6, 3 + y, up + 20, 12);
        for (let y = 0; y < 8; y++) p.line(cx + 2, up + 12 + y * 0.6, W - 4 - y, up + 20, 12);
        p.rect(cx - 8, by - 6, 16, 2, 11); p.rect(cx - 1, up + 5, 2, 3, 6);
        p.rect(cx - 6, by - 4, 12, 2, z.dark);
        break;
      }
      case "craft": {
        const cx = W / 2;
        for (let y = 0; y < Hh; y++) { const w = Math.round(2 + y * 0.9); p.rect(cx - w, up + y, w * 2, 1, y % 5 === 0 ? 11 : 0); }
        p.rect(cx - 1, up + 2, 2, 4, 14);
        break;
      }
      case "dish":
        p.rect(W / 2 - 1, up + 8, 2, Hh - 4, 11);
        p.ell(W / 2, up + 6, 12, 7, 15); p.ell(W / 2, up + 5, 10, 5, 1); p.ell(W / 2, up + 5, 3, 2, 12); p.line(W / 2, up + 5, W / 2 + 6, up - 6, 11);
        break;
      case "guardhouse": case "shack": case "radio": {
        const wall = k === "shack" ? 8 : k === "radio" ? 12 : z.wall[0], roof = k === "shack" ? 9 : z.roof[1];
        p.rect(2, up + 2, W - 4, Hh - 4, wall); p.rect(2, up - 4, W - 4, 8, roof); p.rect(2, up + 4, W - 4, 1, 0);
        p.rect(W / 2 - 3, by - 12, 6, 10, 0); p.rect(5, by - 14, 5, 4, 3);
        if (k === "radio") { p.line(W - 6, up - 4, W - 6, 0, 11); p.line(W - 9, 3, W - 3, 3, 11); p.px(W - 6, 0, 2); }
        if (k === "shack") { p.rect(W - 12, by - 14, 6, 4, 7); }
        break;
      }
      case "tent":
        p.rect(3, by - 4, W - 6, 2, z.dark);
        for (let y = 0; y < Hh + up - 6; y++) { const w = Math.round((y / (Hh + up - 6)) * (W / 2 - 3)); p.rect(W / 2 - w, y + 2, w * 2, 1, y % 6 === 0 ? 9 : 5); }
        p.rect(W / 2 - 1, by - 10, 3, 8, 0);
        break;
      case "fuel": case "avfuel":
        for (let i = 0; i < (k === "fuel" ? 3 : 2); i++) {
          const x = k === "fuel" ? 8 + i * 15 : 12 + i * 22, rx = k === "fuel" ? 6 : 10;
          p.rect(x - rx, by - 18, rx * 2, 14, k === "fuel" ? 2 : 15); p.ell(x, by - 18, rx, 4, k === "fuel" ? 10 : 1); p.ell(x, by - 4, rx, 3, k === "fuel" ? 2 : 12);
          p.rect(x - 1, by - 14, 2, 6, 0);
        }
        break;
      case "pump":
        p.rect(2, up, W - 4, Hh - 2, 11); p.rect(2, up - 8, W - 4, Hh - 4, 12); p.rect(4, up - 6, W - 8, 2, 15);
        for (let x = 8; x < W - 6; x += 10) { p.ell(x, up + 6, 4, 4, 11); p.ell(x, up + 6, 2, 2, 15); }
        p.rect(W / 2 - 4, by - 12, 8, 8, 0);
        break;
      case "door": p.rect(1, up, W - 2, Hh + 0, 11); p.rect(3, up + 2, W - 6, Hh - 4, 12); for (let x = 5; x < W - 4; x += 4) p.rect(x, up + 2, 1, Hh - 4, 11); break;
      case "pyramid": for (let y = 0; y < Hh + up - 2; y++) { const w = Math.round(y / (Hh + up) * (W / 2)); p.rect(W / 2 - w, y + 1, w * 2, 1, y % 4 === 0 ? 11 : 12); } break;
      case "lever": p.rect(4, by - 6, 8, 5, 11); p.line(8, by - 6, extra ? 4 : 12, by - 14, 15); p.ell(extra ? 4 : 12, by - 14, 1.5, 1.5, 2); break;
      case "pit": p.rect(0, up + 2, W, Hh - 3, 0); for (let x = 1; x < W; x += 3) p.rect(x, up + 2, 1, Hh - 3, 12); p.rect(0, up + 2, W, 1, 15); break;
      case "alarm": p.rect(7, up, 2, Hh + 0, 11); p.rect(4, up - 4, 8, 5, 2); p.rect(5, up - 3, 6, 2, 10); break;
      case "prox": p.rect(7, up - 2, 2, Hh, 9); p.rect(5, up - 6, 6, 5, 11); p.px(8, up - 4, 2); break;
    }
    return { c, up };
  });

  /* ---- people ---- */
  const HEADS = {
    pumaF: ["h.....h", "Hh...hH", "HHHHHHH", "HeHHHeH", "HHmmmHH", ".HmkmH.", "..HHH.."],
    pumaB: ["h.....h", "Hh...hH", "HHHHHHH", "HHHHHHH", "hHHHHHh", ".hHHHh.", "..hhh.."],
    pumaS: ["..h....", ".hHh...", ".HHHHH.", ".HHHeHH", ".HHHHmm", ".hHHmmk", "..HHH.."],
    helmF: [".ccccc.", "cCCCCCc", "cCCCCCc", ".SSSSS.", ".SeSeS.", ".SSSSS.", "..SSS.."],
    helmB: [".ccccc.", "cCCCCCc", "cCCCCCc", "cCCCCCc", ".SSSSS.", ".SSSSS.", "..SSS.."],
    helmS: [".cccc..", "cCCCCc.", "cCCCCCc", ".SSSSe.", ".SSSSSS", ".SSSSS.", "..SSS.."],
  };
  /* who wears what: U uniform, u its shade, L legs, B boots and belt, G the gun, S skin or fur (hands, face) */
  const LOOKS = {
    ranger:  { head: "puma", U: 5, u: 9, L: 5, B: 0, G: 11, S: 16, H: 16, h: 17, m: 18, k: 19, e: 0, camo: 9, tail: true },
    pow:     { head: "puma", U: 15, u: 12, L: 12, B: 11, G: null, S: 16, H: 16, h: 17, m: 18, k: 19, e: 0, tail: true },
    disguise:{ head: "helm", U: 12, u: 11, L: 11, B: 0, G: 11, S: 16, C: 11, c: 0, e: 0, tail: true },
    rifle:   { head: "helm", U: 12, u: 11, L: 11, B: 0, G: 0, S: 10, C: 11, c: 0, e: 0 },
    guard:   { head: "helm", U: 12, u: 11, L: 11, B: 0, G: 0, S: 10, C: 11, c: 0, e: 0 },
    sniper:  { head: "helm", U: 9, u: 8, L: 9, B: 0, G: 0, S: 10, C: 9, c: 0, e: 0 },
    elite:   { head: "helm", U: 11, u: 0, L: 11, B: 0, G: 0, S: 10, C: 2, c: 0, e: 0 },
    at:      { head: "helm", U: 12, u: 11, L: 11, B: 0, G: 5, S: 10, C: 11, c: 0, e: 0, tube: true },
    flamer:  { head: "helm", U: 12, u: 11, L: 11, B: 0, G: 0, S: 10, C: 11, c: 0, e: 0, pack: 7 },
    officer: { head: "helm", U: 15, u: 12, L: 12, B: 9, G: null, S: 10, C: 2, c: 0, e: 0 },
    hostage: { head: "helm", U: 1, u: 15, L: 6, B: 9, G: null, S: 10, C: 9, c: 9, e: 0 },
  };
  AP.LOOKS = LOOKS;
  /* pose: stand, walk (frame 0..3), crawl (0..1), dead, climb. f: 0..31 */
  AP.personArt = (look, f, pose, frame) => get(`p${look}${f}${pose}${frame}`, () => {
    const L = LOOKS[look] || LOOKS.rifle, c = mk(20, 24), p = pen(c), [fx, fy] = AP.DIR32[f], cx = 10, foot = 22;
    const map = { H: L.H ?? L.S, h: L.h ?? L.S, m: L.m ?? L.S, k: L.k ?? 0, e: L.e, S: L.S, C: L.C, c: L.c };
    if (pose === "dead") {
      p.rect(3, 17, 13, 4, L.u); p.rect(4, 17, 11, 2, L.U); p.rect(15, 17, 3, 3, L.H ?? L.S); p.rect(2, 19, 3, 2, L.B);
      if (L.tail) p.line(2, 20, 0, 23, 17);
      p.ell(10, 21.5, 7, 1.5, 0);
      return c;
    }
    if (pose === "crawl") {
      /* Four frames: the left elbow reaches as the right knee drives, then
       * the other pair. t runs along the body (head +), s across it. The
       * view is from above and behind, so north-south lengths shrink. */
      const W2 = 28, c2 = mk(W2, 34), q = pen(c2), ox = W2 / 2, yb = 25;
      const ax = fx, ay = fy * 0.8, al = Math.hypot(ax, ay) || 1, nx = -ay / al, ny = ax / al;
      const P = (t, s) => [ox + ax * t + nx * s, yb + ay * t + ny * s];
      const seg = (t0, s0, t1, s1, col, w = 2) => {
        const [x0, y0] = P(t0, s0), [x1, y1] = P(t1, s1), n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
        for (let k = 0; k <= n; k++) q.rect(Math.round(x0 + (x1 - x0) * k / n - (w - 1) / 2), Math.round(y0 + (y1 - y0) * k / n - (w - 1) / 2), w, w, col);
      };
      const ph = [0, 1, 2, 1][frame & 3], reachL = [4.5, 2.2, 0][ph], reachR = 4.5 - reachL;
      /* the hips swing toward the driving knee */
      const sway = [-0.7, 0, 0.7, 0][frame & 3];
      if (L.tail) { const sway = [1, 0, -1, 0][frame & 3]; seg(-4, 0, -7, 1 + sway, 16, 1); seg(-7, 1 + sway, -10, 2.5 + sway * 1.5, 16, 1); const [tx, ty] = P(-10.5, 2.8 + sway * 1.5); q.px(tx, ty, 19); }
      /* legs: the driving knee is drawn up and out */
      const leg = (side, drive) => {
        const ks = side * (drive ? 3.8 : 1.6) + sway, fs = side * (drive ? 2.6 : 1.4) + sway, ft = drive ? -7 : -9.8, kt = drive ? -4.6 : -6.4;
        seg(-3, side * 1.3 + sway * 0.6, kt, ks, L.L); seg(kt, ks, ft, fs, L.L);
        const [bx, by] = P(ft - 0.6, fs); q.rect(Math.round(bx) - 1, Math.round(by) - 1, 2, 2, L.B);
      };
      leg(-1, ph === 2); leg(1, ph === 0);
      /* the torso, belt and pack */
      seg(-3, sway * 0.6, 3, 0, L.U, 4);
      seg(-2, -1.6 + sway * 0.4, 2.5, -1.6, L.u, 1);
      seg(-3.2, -1.8 + sway * 0.6, -3.2, 1.8 + sway * 0.6, L.B, 1);
      if (L.camo) for (const [t, s] of [[-1, 1], [1.5, -0.5], [0, -1.2]]) { const [x, y] = P(t, s); q.px(x, y, L.camo); }
      if (L.pack) { seg(-1.5, 0, 1.5, 0, L.pack, 3); }
      /* arms: elbows out, the reaching hand forward */
      const arm = (side, reach) => {
        const et = 3.4 + reach * 0.5, es = side * (3.6 - reach * 0.25), ht = 4.4 + reach, hs = side * 1.3;
        seg(3, side * 1.8, et, es, L.U); seg(et, es, ht, hs, L.U);
        const [hx, hy] = P(ht + 0.4, hs); q.px(hx, hy, L.S);
      };
      arm(-1, reachL); arm(1, reachR);
      if (L.G != null) seg(5.5, 0, 11, 0, L.G, 1);
      if (L.tube) seg(-2, -2, 6, -2, 5, 1);
      /* the head, from above: ears and muzzle for the puma, a helmet for the enemy */
      const [hx, hy] = P(6.6, 0);
      if (L.head === "puma") {
        q.ell(hx, hy, 2.6, 2.2, 16);
        for (const s of [-2.1, 2.1]) { const [ex, ey] = P(5.6, s); q.px(ex, ey, 17); }
        const [mx, my] = P(8.6, 0); q.px(mx, my, 18);
      } else { q.ell(hx, hy, 2.5, 2.2, L.C); const [rx, ry] = P(6.6, 0); q.px(rx, ry, L.c ?? 0); }
      /* a little dust kicked up behind, while moving */
      keyline(c2);
      if (frame & 1) { const [dx, dy] = P(-11.5, (frame & 2) ? 2.5 : -2.5); q.px(dx, dy, 15); q.px(dx - ax, dy + 1, 12); }
      return c2;
    }
    const back = fy < -0.38, front = fy > 0.38, flip = fx < 0;
    p.ell(cx, foot, 6, 1.6, 0);
    /* legs */
    const step = pose === "walk" ? [0, 1, 0, -1][frame & 3] : 0;
    const side = !back && !front;
    const legs = side ? [[cx - 2 + step * (flip ? -2 : 2), 0], [cx + 1 - step * (flip ? -2 : 2), 0]] : [[cx - 3, step > 0 ? -1 : 0], [cx + 1, step < 0 ? -1 : 0]];
    for (const [lx, ly] of legs) { p.rect(lx, 15 + ly, 2, 5, L.L); p.rect(lx, 20 + ly, 2, 1, L.B); }
    /* the tail (puma), behind him unless he faces away */
    const tail = () => {
      if (!L.tail) return;
      const tx = cx - fx * 3, ty = 14;
      const sway = pose === "walk" ? [1, 0, -1, 0][frame & 3] : 0;
      p.line(tx, ty, tx - fx * 3 + sway, ty + 4, 16); p.line(tx - fx * 3 + sway, ty + 4, tx - fx * 5 + sway, ty + 7, 16); p.px(tx - fx * 5 + sway, ty + 7, 19); p.px(tx - fx * 5 + sway, ty + 8, 19);
    };
    const gun = () => {
      if (L.G == null) { p.rect(cx - 4, 10, 1, 4, L.S); p.rect(cx + 4, 10, 1, 4, L.S); return; }
      const sx = cx + fx * 2, sy = 11 + fy, ex = cx + fx * 8, ey = 11 + fy * 5;
      p.line(sx, sy, ex, ey, L.G); p.line(sx, sy + 1, ex - fx, ey + 1, L.G);
      p.px(sx + fx, sy + fy * 0.6, L.S); p.px(cx + fx * 5, 11 + fy * 3, L.S);
      if (L.tube) { p.line(cx - fx * 3, 7, cx + fx * 6, 8 + fy * 3, 5); }
    };
    if (front) tail();
    if (back) gun();
    if (L.pack) { p.rect(cx - 3 - fx * 2, 9, 6, 6, L.pack); p.rect(cx - 3 - fx * 2, 9, 6, 1, 8); }
    /* torso */
    p.rect(cx - 3, 9, 7, 6, L.U); p.rect(fx >= 0 ? cx - 3 : cx + 3, 9, 1, 6, L.u);
    if (L.camo) for (const [x, y] of [[cx - 2, 10], [cx + 1, 12], [cx - 1, 13], [cx + 2, 9]]) p.px(x, y, L.camo);
    p.rect(cx - 3, 14, 7, 1, L.B);
    if (!back) gun();
    if (back) tail();
    /* head */
    const kind = L.head === "puma" ? "puma" : "helm", g = HEADS[kind + (front ? "F" : back ? "B" : "S")];
    p.grid(g, cx - 3, 2, map, side && flip);
    return c;
  });
  AP.tankArt = (f, frame) => get(`tank${f}${frame}`, () => {
    const c = mk(22, 20), p = pen(c), [fx, fy] = AP.DIR32[f];
    p.ell(11, 15, 9, 3, 0);
    p.rect(2, 6, 18, 9, 11); p.rect(3, 5, 16, 8, 12);
    for (let x = 3; x < 19; x += 3) { p.px(x + frame, 13, 0); p.px(x + frame, 5, 15); }
    p.ell(11, 8, 4.5, 3.5, 11); p.ell(11, 7, 4, 3, 15);
    p.line(11, 7, 11 + fx * 9, 7 + fy * 5, 0);
    return c;
  });

  /* ---- the Osprey, the parafoil, pods, small things ---- */
  /* The Osprey from above. Nose down (flying south, as on the way in) unless
   * up is asked for: climbing away north from the pickup. */
  AP.ospreyArt = (frame, small, up) => up ? ospreyUp(frame, small) : get(`ospd${frame}${small ? 1 : 0}`, () => {
    const a = ospreyUp(frame, small), c = mk(a.width, a.height), g = c.getContext("2d");
    g.translate(0, a.height); g.scale(1, -1); g.drawImage(a, 0, 0);
    return c;
  });
  const ospreyUp = (frame, small) => get(`osp${frame}${small ? 1 : 0}`, () => {
    const s = small ? 0.62 : 1, W = Math.round(56 * s), H = Math.round(44 * s), c = mk(W, H), p = pen(c), cx = W / 2;
    const S = v => v * s;
    p.rect(cx - S(4), S(4), S(8), S(34), 12); p.rect(cx - S(3), S(4), S(6), S(30), 15); p.rect(cx - S(2), S(6), S(4), S(4), 3);
    p.rect(cx - S(24), S(16), S(48), S(5), 12); p.rect(cx - S(24), S(16), S(48), S(1), 15);
    p.rect(cx - S(8), S(34), S(16), S(3), 12);
    for (const sx of [-1, 1]) {
      const nx = cx + sx * S(22);
      p.rect(nx - S(2), S(12), S(4), S(12), 11);
      const a = frame * 0.6 + (sx > 0 ? 0.5 : 0);
      for (let k = 0; k < 3; k++) { const b = a + k * Math.PI * 2 / 3; p.line(nx, S(14), nx + Math.cos(b) * S(13), S(14) + Math.sin(b) * S(13), 0); }
    }
    return c;
  });
  AP.chuteArt = () => get("chute", () => { const c = mk(22, 16), p = pen(c); p.rect(2, 1, 18, 4, 1); p.rect(2, 4, 18, 1, 15); for (let x = 2; x < 20; x += 4) p.rect(x, 1, 1, 4, 15); p.line(3, 5, 9, 15, 15); p.line(19, 5, 12, 15, 15); return c; });
  AP.podArt = chute => get(`pod${chute ? 1 : 0}`, () => {
    const c = mk(14, 18), p = pen(c);
    if (chute) { p.ell(7, 3, 6, 3, 1); p.rect(1, 3, 12, 1, 15); p.line(2, 4, 5, 11, 15); p.line(12, 4, 9, 11, 15); }
    p.rect(3, 11, 8, 6, 8); p.rect(3, 11, 8, 1, 10); p.rect(6, 11, 2, 6, 9); p.px(4, 13, 1);
    return c;
  });
  AP.miscArt = k => get(`m${k}`, () => {
    let c;
    if (k === "cross") { c = mk(7, 7); const p = pen(c); p.rect(3, 0, 1, 2, 1); p.rect(3, 5, 1, 2, 1); p.rect(0, 3, 2, 1, 1); p.rect(5, 3, 2, 1, 1); p.px(3, 3, 2); }
    else if (k === "nade") { c = mk(4, 4); const p = pen(c); p.ell(2, 2, 1.6, 1.6, 5); p.px(2, 0, 11); }
    else if (k === "bomb") { c = mk(7, 5); const p = pen(c); p.rect(0, 1, 7, 4, 8); p.rect(1, 2, 5, 2, 9); p.px(3, 0, 2); }
    else if (k === "ladder") { c = mk(6, 40); const p = pen(c); for (const x of [0, 5]) p.rect(x, 0, 1, 40, 8); for (let y = 2; y < 40; y += 4) p.rect(0, y, 6, 1, 9); }
    return c;
  });

  /* ---- the ranger's portrait, for the roster and the debrief ----
   * look: "alive", "memorial" (greys, for the fallen) or "captured" (behind bars) */
  const BUST = [
    "..hh..........hh..",
    ".hHHh........hHHh.",
    ".hHmHh......hHmHh.",
    ".hHmHHhhhhhhHHmHh.",
    "..hHHHHHHHHHHHHh..",
    "..HHHHHHHHHHHHHH..",
    ".HHHHHHHHHHHHHHHH.",
    ".HHeeHHHHHHHHeeHH.",
    ".HHewHHHHHHHHewHH.",
    ".HHHHHHmmmmHHHHHH.",
    "..HHHHmmnnmmHHHH..",
    "..HHHmmmkkmmmHHH..",
    "...HHmmkmmkmmHH...",
    "...hHHmmmmmmHHh...",
    "....hHHmmmmHHh....",
    ".....hhHHHHhh.....",
    "...UUUuhhhhuUUU...",
    ".UUUUUUuhhuUUUUUU.",
    "UUUUUUUUuuUUUUUUUU",
    "UUUUUUUUUUUUUUUUUU",
  ];
  AP.portraitArt = (look = "alive") => get(`por${look}`, () => {
    const c = mk(22, 24), p = pen(c);
    const live = { H: 16, h: 17, m: 18, k: 19, e: 0, w: 1, n: 10, U: 5, u: 9 };
    const grey = { H: 15, h: 12, m: 1, k: 11, e: 0, w: 1, n: 12, U: 11, u: 0 };
    p.rect(0, 0, 22, 24, look === "memorial" ? 0 : 6);
    p.grid(BUST, 2, 4, look === "memorial" ? grey : live);
    if (look === "captured") for (let x = 1; x < 22; x += 4) { p.rect(x, 0, 2, 24, 11); p.rect(x, 0, 1, 24, 12); }
    return c;
  });

  /* ---- rank insignia, US Army: chevrons and rockers for the enlisted ranks, bars, leaves and the eagle for officers ---- */
  AP.insigniaArt = rank => get(`ins${rank}`, () => {
    const c = mk(18, 22), p = pen(c);
    const chevron = y => { for (let t = 0; t < 2; t++) { p.line(1, y + 5 + t, 8.5, y + t, 7); p.line(9.5, y + t, 17, y + 5 + t, 7); } };
    const rocker = y => { for (let t = 0; t < 2; t++) { p.line(1, y + t, 4, y + 3 + t, 7); p.line(4, y + 3 + t, 14, y + 3 + t, 7); p.line(14, y + 3 + t, 17, y + t, 7); } };
    const bar = (x, y, col, sh) => { p.rect(x, y, 12, 4, col); p.rect(x, y + 3, 12, 1, sh); p.rect(x, y, 12, 1, 1); };
    const leaf = (col, sh) => { p.ell(9, 10, 6, 8, col); for (const [x, y] of [[3, 6], [15, 6], [2, 11], [16, 11], [4, 15], [14, 15]]) p.px(x, y, 0); p.line(9, 3, 9, 19, sh); p.rect(8, 18, 3, 3, sh); };
    const shape = [
      () => { chevron(4); rocker(12); },
      () => { chevron(3); chevron(9); },
      () => { chevron(1); chevron(7); chevron(13); },
      () => { chevron(0); chevron(5); chevron(10); rocker(15); },
      () => { chevron(0); chevron(4); chevron(8); rocker(12); rocker(16); },
      () => { chevron(0); chevron(3); chevron(6); p.ell(9, 13, 2, 2, 7); rocker(12); rocker(15); rocker(18); },
      () => bar(3, 9, 7, 8),
      () => bar(3, 9, 15, 12),
      () => { bar(3, 5, 15, 12); bar(3, 13, 15, 12); },
      () => leaf(7, 8),
      () => leaf(15, 12),
      () => { p.ell(9, 8, 2.5, 2.5, 15); p.line(9, 10, 9, 17, 15); for (let i = 0; i < 4; i++) { p.line(9, 9 + i, 1, 4 + i * 2, 15); p.line(9, 9 + i, 17, 4 + i * 2, 15); } p.rect(7, 16, 5, 3, 12); p.px(10, 7, 0); },
    ][rank] || (() => {});
    shape();
    /* a dark keyline round whatever was drawn, so it reads on any ground */
    const g = c.getContext("2d"), d = g.getImageData(0, 0, 18, 22), a = i => d.data[i * 4 + 3];
    const ring = [];
    for (let y = 0; y < 22; y++) for (let x = 0; x < 18; x++) {
      if (a(y * 18 + x)) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const nx = x + dx, ny = y + dy; return nx >= 0 && ny >= 0 && nx < 18 && ny < 22 && a(ny * 18 + nx); })) ring.push([x, y]);
    }
    for (const [x, y] of ring) p.px(x, y, 0);
    return c;
  });

  /* ---- decorations: the ribbons, in stripes of the sixteen colours ---- */
  const RIBBONS = {
    COM1: [[3, 5], [1, 1], [2, 5], [1, 1], [10, 5], [1, 1], [2, 5], [1, 1], [3, 5]],
    COM2: [[3, 5], [1, 1], [2, 5], [1, 1], [10, 5], [1, 1], [2, 5], [1, 1], [3, 5]],
    BSTR: [[9, 2], [1, 1], [4, 6], [1, 1], [9, 2]],
    SSTR: [[3, 6], [1, 1], [3, 6], [1, 1], [8, 2], [1, 1], [3, 6], [1, 1], [3, 6]],
    DSC:  [[2, 2], [1, 1], [18, 6], [1, 1], [2, 2]],
    CMOH: [[24, 14]],
  };
  AP.ribbonArt = code => get(`rib${code}`, () => {
    const c = mk(26, 10), p = pen(c), st = RIBBONS[code] || RIBBONS.COM1;
    p.rect(0, 0, 26, 10, 0);
    let x = 1;
    for (const [w, col] of st) { p.rect(x, 1, w, 8, col); x += w; }
    if (code === "COM2") { p.rect(11, 4, 4, 2, 8); p.px(12, 3, 8); }
    if (code === "CMOH") for (const [sx, sy] of [[4, 3], [9, 6], [13, 3], [17, 6], [21, 3]]) { p.px(sx, sy, 1); p.px(sx - 1, sy, 1); p.px(sx + 1, sy, 1); p.px(sx, sy - 1, 1); p.px(sx, sy + 1, 1); }
    return c;
  });
  /* any of the above as an <img> source */
  AP.artURL = c => c.toDataURL("image/png");

  /* ---- the small HUD icons: the weapon in hand ---- */
  const ICONS = {
    carbine: ["..............", "BBBBBBBBBBBBB.", ".BB...BB......", ".B....B.......", "......B......."],
    gren:    ["...BB..", "..BGGB.", ".BGGGGB", ".BGGGGB", "..BGGB."],
    law:     ["..............", "GGGGGGGGGGGGGG", "BBBBBBBBBBBBBB", "....B..B......", ".............."],
    knife:   ["...........", "WWWWWWWWBBB", ".WWWWWW.BBB", "...........", "..........."],
    bomb:    ["..R....", "OOOOOOO", "OBBBBBO", "OBBBBBO", "OOOOOOO"],
    aid:     ["WWWWWWW", "WWWRWWW", "WWRRRWW", "WWWRWWW", "WWWWWWW"],
  };
  AP.iconArt = w => get(`i${w}`, () => {
    const g = ICONS[w], c = mk(g[0].length, g.length), p = pen(c);
    p.grid(g, 0, 0, { B: 0, G: 5, W: 1, R: 2, O: 8 });
    return c;
  });

  /* ---- a 3x5 pixel font, for everything drawn on the play screen ---- */
  const FONT = {
    A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110", E: "111100110100111", F: "111100110100100",
    G: "011100101101011", H: "101101111101101", I: "111010010010111", J: "001001001101010", K: "101101110101101", L: "100100100100111",
    M: "101111111101101", N: "110101101101101", O: "010101101101010", P: "110101110100100", Q: "010101101110011", R: "110101110101101",
    S: "011100010001110", T: "111010010010010", U: "101101101101111", V: "101101101101010", W: "101101111111101", X: "101101010101101",
    Y: "101101010010010", Z: "111001010100111",
    0: "111101101101111", 1: "010110010010111", 2: "110001010100111", 3: "110001010001110", 4: "101101111001001",
    5: "111100110001110", 6: "011100111101111", 7: "111001010010010", 8: "111101111101111", 9: "111101111001110",
    ":": "000010000010000", ".": "000000000000010", ",": "000000000010100", "!": "010010010000010", "?": "110001010000010",
    "-": "000000111000000", "+": "000010111010000", "/": "001001010100100", "%": "101001010100101", "'": "010010000000000",
    "(": "001010010010001", ")": "100010010010100", ">": "100010001010100", "<": "001010100010001", "x": "000101010101000", " ": "000000000000000",
  };
  AP.glyph = (ch, col) => get(`g${ch}${col}`, () => {
    const bits = FONT[ch] || FONT[ch.toUpperCase()] || FONT["?"], c = mk(3, 5), p = pen(c);
    for (let i = 0; i < 15; i++) if (bits[i] === "1") p.px(i % 3, (i / 3) | 0, col);
    return c;
  });
  /* text at (x, y); align: 0 left, 0.5 centre, 1 right. shadow: a colour drawn under, one pixel down-right */
  AP.text = (g, s, x, y, col = 1, align = 0, shadow = 0) => {
    s = String(s);
    const w = s.length * 4 - 1, x0 = Math.round(x - w * align);
    for (let i = 0; i < s.length; i++) {
      if (shadow != null) g.drawImage(AP.glyph(s[i], shadow), x0 + i * 4 + 1, y + 1);
      g.drawImage(AP.glyph(s[i], col), x0 + i * 4, y);
    }
    return w;
  };
  AP.textWidth = s => String(s).length * 4 - 1;
  /* text on a box of its own colour: how the C64 shouted. Danger is white on red. */
  AP.textBox = (g, s, x, y, fg = 1, bg = 2, align = 0) => {
    const w = AP.textWidth(s), x0 = Math.round(x - w * align);
    g.fillStyle = P[bg]; g.fillRect(x0 - 2, y - 2, w + 4, 9);
    AP.text(g, s, x0, y, fg, 0, null);
    return w + 4;
  };
})();
