#!/usr/bin/env node
/* Proves the map generator: every mission, at every difficulty, over many
 * seeds. Fails on a throw, a target or the pickup out of reach from the drop
 * zone, a person standing where nobody can, a counted installation (SAM
 * launchers, fighters, antennas, mini-bunkers) in the wrong number, a gap in
 * the badlands, a seed that does not make the same ground twice, or the
 * fallback path-cutting being needed too often.
 *
 *   node tools/mapcheck.js [--seeds N] [--show mission:seed]
 */
"use strict";
const { load } = require("./lib.js");
const AP = load();
const args = process.argv.slice(2);
const seeds = +(args[args.indexOf("--seeds") + 1] || 0) || 25;
const show = args.includes("--show") ? args[args.indexOf("--show") + 1] : null;

function hash(a) { let h = 2166136261; for (const v of a) { h ^= v; h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); }
function draw(map) {
  const ch = {}; for (const [c, t] of Object.entries(AP.TILECH)) ch[t] = c; ch[AP.T.BAD] = " "; ch[AP.T.CRATER] = "c";
  const rows = [];
  for (let y = 0; y < map.h; y++) {
    let s = "";
    for (let x = 0; x < map.w; x++) {
      const o = AP.objAt(map, x, y);
      s += o ? Object.entries(AP.OBJCH).find(([, k]) => k === o.k)[0] : ch[map.tiles[y * map.w + x]] || "?";
    }
    rows.push(s);
  }
  for (const s of map.spawns) { const r = rows[Math.floor(s.y)]; const x = Math.floor(s.x); rows[Math.floor(s.y)] = r.slice(0, x) + (s.k[0].toUpperCase() === s.k[0] ? s.k[0] : "&") + r.slice(x + 1); }
  return rows.join("\n");
}

if (show) {
  const [m, s, d] = show.split(":");
  console.log(draw(AP.genMap({ mission: m, diff: +(d || 2), seed: +(s || 1) })));
  process.exit(0);
}

let fail = 0, maps = 0, carved = 0;
const bad = msg => { fail++; if (fail < 30) console.log("FAIL " + msg); };
for (const m of AP.MISSIONS) for (let diff = 0; diff < 4; diff++) for (let seed = 1; seed <= seeds; seed++) {
  const tag = `${m.id} diff ${diff} seed ${seed}`;
  let map;
  try { map = AP.genMap({ mission: m.id, diff, seed }); } catch (e) { bad(`${tag}: threw ${e.stack}`); continue; }
  maps++;
  if (map.carved) carved++;
  const miss = AP.unreachable(map, Math.floor(map.w / 2), map.h - 20);
  if (miss.length) bad(`${tag}: out of reach: ${miss.map(n => n.what).join(", ")}`);
  for (const s of map.spawns) if (!AP.passable(map, Math.floor(s.x), Math.floor(s.y), "p")) bad(`${tag}: ${s.k} stands in a wall at ${s.x},${s.y}`);
  const count = k => map.objs.filter(o => o.k === k).length, D = AP.C.DIFF;
  const want = { sam: m.id === "sam" ? D.launchers[diff] : 0, minib: m.id === "sam" ? D.minib[diff] : 0,
    plane: m.id === "aircraft" ? D.planes[diff] : 0, dish: m.id === "radar" ? D.dishes[diff] : 0 };
  for (const [k, n] of Object.entries(want)) if (count(k) !== n) bad(`${tag}: ${count(k)} ${k}, want ${n}`);
  for (let y = 0; y < map.h; y++) for (const x of [0, map.w - 1]) if (map.tiles[y * map.w + x] !== AP.T.BAD) bad(`${tag}: no badlands at ${x},${y}`);
  for (let x = 0; x < map.w; x++) for (const y of [0, map.h - 1]) if (map.tiles[y * map.w + x] !== AP.T.BAD) bad(`${tag}: no badlands at ${x},${y}`);
  const again = AP.genMap({ mission: m.id, diff, seed });
  if (hash(again.tiles) !== hash(map.tiles) || JSON.stringify(again.spawns) !== JSON.stringify(map.spawns)) bad(`${tag}: not the same ground twice`);
}
const rate = carved / maps;
console.log(`${maps} maps; ${carved} needed a path cut (${(rate * 100).toFixed(1)}%)`);
if (rate > 0.05) bad(`path cutting needed on ${(rate * 100).toFixed(1)}% of maps, over 5%`);
if (fail) { console.log(`mapcheck: ${fail} failure(s)`); process.exit(1); }
console.log("mapcheck: every map provably finishable");
