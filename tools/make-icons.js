#!/usr/bin/env node
/*
 * Airborne Puma's icons, from one pixel drawing: the puma ranger under his
 * parafoil, coming down through a dusk sky.
 *
 *   node tools/make-icons.js
 *
 * Writes icon.svg (crisp rects), favicon-16x16.png, favicon-32x32.png,
 * apple-touch-icon.png (180, also the GitLab project's avatar) and
 * favicon.ico (16, 32, 48, each a PNG inside). No dependencies: the PNG and
 * ICO writers are below. The share card is tools/og.html, rendered in a
 * browser.
 */
"use strict";
const fs = require("fs"), path = require("path"), zlib = require("zlib");
const ROOT = path.join(__dirname, "..");

/* the drawing, 40 x 40: AP.chuteArt() and AP.personArt("ranger", 8, "stand")
 * from js/things.js and js/people.js, over a dusk sky dithered in seven steps.
 * Composed in the browser by iconArt() in tools/og.html and kept here as
 * pixels, so this tool needs nothing but node. Redraw the sprites there, then
 * paste what iconArt() prints over PAL and ART. */
const PAL = { "0": "#80848c", "1": "#8e6e49", "2": "#7a4a48", "3": "#5f5b44", "4": "#5d6067", "5": "#222816", "6": "#566131", "7": "#b0684a", "8": "#836a55", "9": "#685443", a: "#0a1022", b: "#1d1917", c: "#fffaf0", d: "#a8522a", e: "#f6b98a", f: "#c7bca0", g: "#111a33", h: "#f1ead8", i: "#e07a3c", j: "#8090c0", k: "#e8ecff", l: "#d7cec3", m: "#d9cfb6", n: "#c0602f", o: "#ada087", p: "#ccc2b1", q: "#a99e84", r: "#3a2b22", s: "#9a4a24", t: "#baae97", u: "#c9c4b5", v: "#968972", w: "#433328", x: "#c7c2b2", y: "#1b2442", z: "#b8ad90", A: "#cac5b7", B: "#e2ab6b", C: "#ca8d50", D: "#f2c78b", E: "#e3a497", F: "#fde4b5", G: "#1a120c", H: "#2c2c4a", I: "#f7ecd6", J: "#d48c80", K: "#a46b38", L: "#4a2a22", M: "#3b4428", N: "#6f7c40", O: "#e6d5b6", P: "#2e351f", Q: "#87944f", R: "#5d442c", S: "#4a5432", T: "#4c4836", U: "#4a3a4a", V: "#755839", W: "#43464c", X: "#2e3035", Y: "#3a2618", Z: "#a0ad64", "@": "#524234", "#": "#403328", "$": "#2f261d" };
const ART = [
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "aaaaaaaaaaaaaaabbbbbbbbbbaaaaaaaaaaaaaaa",
  "aaaaaaaaaaabbbbcccdeeeefcbbbbaaaaaaaaaaa",
  "gaaagaaagbbeeefhhhdiiiifhccdebbagaaagaaa",
  "aaaaaaabbdeiiifhhhdiiiifhhhdieebbjaaaaaa",
  "aagakbbccdiiiifhhhdiiiifhhhdiiiefbbaaaga",
  "aaaabllhhdiiiifmmmdnnnnfmhhdiiiifllbaaaa",
  "gagbopphhdinnnfmmmdnnnnfmmmdniiifpplbaga",
  "agabopphhdnnnnfqrqrsrsrqrmmdnnnifpppbgag",
  "gagboppmmdnsrsrqrqrsrsrqrqrsrnnnfpppbaga",
  "agabottmmsrsrsrbbbbbbbbbbqrsrsrnfttpbgag",
  "gggbottqrsrbbbbbubgggggbubbbbsrsrtttbggg",
  "aggbovwqrbbubggbxbggaggbxbggabbsrvwtbggg",
  "gggbwvwbbggbubgbubgggggbubggbubbbvwvbggg",
  "gggbwbbggggbubggbubgggbubggbubgggbbvbggg",
  "ygybzbAbbgygbubgbbbgygbbbgybAbygbbAzbgyg",
  "gggbzbbAubgygbubBCbyggbBCbbAbggbuubzbggy",
  "ygybzzbbbubbybbDEBCbbbDBECbbybbAbbzzbgyy",
  "gygybbgygbuAbybbFFDDDDDBBbbybAubgybbgygy",
  "yyyyyyyyyybbAbbFFDDDDDDDBBbbAbbyyyyyyyyy",
  "yyyyyyyyyyyybAbFDcGDDDcGBBbAbyyyyyyykyyy",
  "yyHyyyHyyyHyybbDDGGDDDGGBCbbyyHyyyHyyyHy",
  "yHyyyHyyyHyyyHbDFDDIJIDDBCbyyHyyyHyyyHyy",
  "HHHyHHHyHHHyHHHbBKIILIIKCbHyHHHyHHHyHHHy",
  "yHyHyHyHyHyHyHybbBIIIIICbbyHyHyHyHyHyHyH",
  "HHHHHHHHHHHHHHbMNbOOOOObMPbHHHHHHHHHHHHH",
  "HHHHHHHHHHHHHHbQRSTMMQTRQNbHHHHHHHHHHHHH",
  "UHjHUHUHUHbHUHbVRWXSMQTRVNbHUHUHUHUHUHUH",
  "HUHUHUHUHbYbHUbVRBBXZQTRMNbUHUHUHUHUHUHU",
  "UUUUUUUUUbYbUUbZQVN0XV1QMNbUUUUUUUUUUUUU",
  "UUUUUUUUbBYCbUbbXXTBBZQQQNbUUUUUUUUUUUUU",
  "2UUU2UUUbDBBCbFDB3TZQQQNbbUU2UUU2UUU2UUU",
  "UUU2UUU2UbDBBBDBB1VR4QN5bUU2UUU2UUU2UUU2",
  "2U222U222UbDBBDBB1VNb4R6bU222U222U222U22",
  "22U222U222UbDDBbb1VNbQR6b2U222U222U222U2",
  "222222222222bbb2bZQNbMP6b222222222222222",
  "2222222222222222b1VNbQN6b222222222222222",
  "7272727272727272b89@b9@#b272727272727272",
  "7727772777277727b@#$b@#$b727772777277727",
  "77777777777777777bbb7bbb7777777777777777",
];
const N = ART.length, R = 4;   /* the plate's corner radius, in cells */

/* ---- icon.svg: one rect per run of a colour along a row ---- */
const rects = [];
ART.forEach((row, y) => {
  for (let x = 0; x < N;) {
    let e = x + 1;
    while (e < N && row[e] === row[x]) e++;
    rects.push(`<rect x="${x}" y="${y}" width="${e - x}" height="1" fill="${PAL[row[x]]}"/>`);
    x = e;
  }
});
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${N} ${N}" shape-rendering="crispEdges" role="img" aria-label="Airborne Puma">
<title>Airborne Puma</title>
<!-- The ranger under his parafoil. Written by tools/make-icons.js; edit the drawing there, not this file. -->
<clipPath id="p"><rect width="${N}" height="${N}" rx="${R}"/></clipPath>
<g clip-path="url(#p)">
${rects.join("\n")}
</g>
</svg>
`;
fs.writeFileSync(path.join(ROOT, "icon.svg"), svg);

/* ---- rasters. Small ones average 4x4 samples of the drawing per pixel, so
 * 16 and 32 keep the canopy's stripes as colour rather than losing every
 * other row; big ones take the nearest cell, so the pixels stay pixels. ---- */
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const cellAt = (gx, gy) => {
  const cx = Math.min(Math.max(gx, R), N - R), cy = Math.min(Math.max(gy, R), N - R);
  if (Math.hypot(gx - cx, gy - cy) > R) return null;
  return hex(PAL[ART[Math.min(N - 1, Math.floor(gy))][Math.min(N - 1, Math.floor(gx))]]);
};
function raster(size) {
  const px = Buffer.alloc(size * size * 4), S = size >= 2 * N ? 1 : 4;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) {
      const c = cellAt((x + (sx + 0.5) / S) / size * N, (y + (sy + 0.5) / S) / size * N);
      if (c) { r += c[0]; g += c[1]; b += c[2]; a++; }
    }
    const i = (y * size + x) * 4;
    if (a) { px[i] = r / a; px[i + 1] = g / a; px[i + 2] = b / a; px[i + 3] = 255 * a / (S * S); }
  }
  return png(size, size, px);
}

/* ---- a minimal PNG writer: RGBA, no filtering ---- */
const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = buf => { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]), crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
function png(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}
/* ---- ICO: a directory of PNGs ---- */
function ico(images) {
  const head = Buffer.alloc(6); head.writeUInt16LE(1, 2); head.writeUInt16LE(images.length, 4);
  let off = 6 + 16 * images.length;
  const dir = images.map(([size, data]) => {
    const e = Buffer.alloc(16);
    e[0] = size % 256; e[1] = size % 256; e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8); e.writeUInt32LE(off, 12); off += data.length;
    return e;
  });
  return Buffer.concat([head, ...dir, ...images.map(([, d]) => d)]);
}

fs.writeFileSync(path.join(ROOT, "favicon-16x16.png"), raster(16));
fs.writeFileSync(path.join(ROOT, "favicon-32x32.png"), raster(32));
fs.writeFileSync(path.join(ROOT, "apple-touch-icon.png"), raster(180));
fs.writeFileSync(path.join(ROOT, "favicon.ico"), ico([[16, raster(16)], [32, raster(32)], [48, raster(48)]]));
console.log("wrote icon.svg, favicon-16x16.png, favicon-32x32.png, apple-touch-icon.png, favicon.ico");
