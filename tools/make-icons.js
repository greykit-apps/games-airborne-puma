#!/usr/bin/env node
/*
 * Writes icon.svg: the ranger's puma head, pixel for pixel from js/art.js
 * (HEADS.pumaF and the ranger's colours), on the family's navy plate.
 *
 *   node tools/make-icons.js
 *
 * The PNG favicons, apple-touch-icon.png and favicon.ico are rendered from
 * icon.svg, and og.png from tools/og.html, in a browser (this machine has no
 * rsvg-convert): serve the repo, open tools/og.html, and save what it draws.
 * The outputs are committed; nothing renders at deploy time.
 */
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const art = fs.readFileSync(path.join(root, "js", "art.js"), "utf8");
const pal = fs.readFileSync(path.join(root, "js", "palette.js"), "utf8");
const C64 = eval(pal.match(/c64: (\[[\s\S]*?\]),/)[1]);
const head = eval(art.match(/pumaF: (\[[^\]]*\])/)[1]);
const map = { H: 16, h: 17, m: 18, k: 19, e: 0 };

/* the head, the collar of his fatigues, then a one-pixel outline */
const rows = head.concat([".UUUUU.", "UUUUUUU"]);
const w = rows[0].length + 2, h = rows.length + 2;
const grid = Array.from({ length: h }, () => new Array(w).fill(-1));
rows.forEach((r, y) => [...r].forEach((c, x) => { if (c === "U") grid[y + 1][x + 1] = 5; else if (map[c] !== undefined) grid[y + 1][x + 1] = map[c]; }));
const src = grid.map(r => r.slice());
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  if (src[y][x] !== -1) continue;
  const n = (yy, xx) => yy >= 0 && yy < h && xx >= 0 && xx < w && src[yy][xx] > 0;
  if (n(y - 1, x) || n(y + 1, x) || n(y, x - 1) || n(y, x + 1)) grid[y][x] = 0;
}
const S = 13, ox = Math.floor((S - w) / 2), oy = S - h;
let rects = "";
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (grid[y][x] >= 0) rects += `<rect x="${x + ox}" y="${y + oy}" width="1" height="1" fill="${C64[grid[y][x]]}"/>`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" shape-rendering="crispEdges" role="img" aria-label="Airborne Puma">
<title>Airborne Puma</title>
<!-- The ranger's head from js/art.js (HEADS.pumaF), outlined.
     Written by tools/make-icons.js; edit the sprite, not this file. -->
<rect width="${S}" height="${S}" rx="2" fill="#05070f"/>
<rect x="0" y="${S - 3}" width="${S}" height="3" fill="#0d1424"/>
${rects}
</svg>
`;
fs.writeFileSync(path.join(root, "icon.svg"), svg);
console.log("wrote icon.svg");

/* The PNGs, straight from the same grid: no rasteriser needed for pixels. */
const zlib = require("zlib");
function png(n) {
  const k = n / S, buf = Buffer.alloc((n * 4 + 1) * n);
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const at = (x, y) => {
    const gx = Math.floor(x / k), gy = Math.floor(y / k);
    const cx = gx - ox, cy = gy - oy;
    if (cx >= 0 && cy >= 0 && cx < w && cy < h && grid[cy][cx] >= 0) return [...hex(C64[grid[cy][cx]]), 255];
    /* the plate: rounded corners, a darker band along the foot */
    const r = 2 * k, px = x + 0.5, py = y + 0.5;
    const cxr = Math.min(Math.max(px, r), n - r), cyr = Math.min(Math.max(py, r), n - r);
    if (Math.hypot(px - cxr, py - cyr) > r) return [0, 0, 0, 0];
    return gy >= S - 3 ? [13, 20, 36, 255] : [5, 7, 15, 255];
  };
  for (let y = 0; y < n; y++) { buf[y * (n * 4 + 1)] = 0; for (let x = 0; x < n; x++) at(x, y).forEach((v, i) => { buf[y * (n * 4 + 1) + 1 + x * 4 + i] = v; }); }
  const crc = b => { let c = ~0; for (const v of b) { c ^= v; for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1)); } return ~c >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const hdr = Buffer.alloc(13); hdr.writeUInt32BE(n, 0); hdr.writeUInt32BE(n, 4); hdr[8] = 8; hdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", hdr), chunk("IDAT", zlib.deflateSync(buf)), chunk("IEND", Buffer.alloc(0))]);
}
for (const [f, n] of [["favicon-16x16.png", 16], ["favicon-32x32.png", 32], ["apple-touch-icon.png", 180], ["icon-48.png", 48]]) fs.writeFileSync(path.join(root, f), png(n));
console.log("wrote the favicons and apple-touch-icon.png; favicon.ico next, from icon-48.png");
