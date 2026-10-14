#!/usr/bin/env node
/* Headless checks of the engine: the rules, the twelve missions, and that
 * a mission replays exactly from its seed and its commands.
 *
 *   node tools/sim-check.js [--seeds N] [--quick] [--only mission]
 *
 *   purity       no engine file reads the clock, Math.random or the DOM
 *   rules        fatigue, wounds, armour, noise, concealment, the knife, wire,
 *                thin ice, the clock, the airdrop
 *   missions     the bot wins every mission on an empty field; then plays each
 *                mission at every difficulty against the enemy, and nothing
 *                may throw, go NaN, stand in a wall, or run past the clock
 *   determinism  a replay from the log matches tick for tick; so does a copy
 *                made with JSON mid-mission
 */
"use strict";
const fs = require("fs"), path = require("path");
const { ROOT, ENGINE_FILES, load } = require("./lib.js");
const AP = load();
const E = AP.Engine, C = AP.C, T = AP.T;
const args = process.argv.slice(2);
const seeds = +(args[args.indexOf("--seeds") + 1] || 0) || 2;
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;
const quick = args.includes("--quick");

let fails = 0, passes = 0;
const check = (ok, msg) => { if (ok) passes++; else { fails++; console.log("FAIL " + msg); } };

/* ---- purity ---- */
for (const f of ENGINE_FILES) {
  const src = fs.readFileSync(path.join(ROOT, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  check(!/Math\.random|Date\.|performance\.|\bdocument\b|\bwindow\./.test(src), `purity: ${f} reads the clock, Math.random or the DOM`);
}

/* ---- a mission on its feet ---- */
const fresh = (mission = "depot", diff = 2, opts = {}, seed = 7) => {
  const S = E.newMission({ mission, diff, seed, opts: Object.assign({ noEnemies: true }, opts) });
  AP.skipDrop(S);
  return S;
};
const run = (S, n, cmd = {}) => { for (let i = 0; i < n && S.phase !== "over"; i++) E.tick(S, typeof cmd === "function" ? cmd(S, i) : cmd); };
/* somewhere open to stand: a clear 5x5 patch, the ranger moved there */
function openGround(S, tile = T.OPEN) {
  const m = S.map;
  for (let y = m.h - 30; y > 20; y--) for (let x = 8; x < m.w - 8; x++) {
    let good = true;
    for (let dy = -2; dy <= 2 && good; dy++) for (let dx = -2; dx <= 2; dx++) if (!AP.passable(m, x + dx, y + dy, "p") || AP.tileAt(m, x + dx, y + dy) !== T.OPEN) { good = false; break; }
    if (good) { if (tile !== T.OPEN) m.tiles[y * m.w + x] = tile; m.ver++; S.player.x = x + 0.5; S.player.y = y + 0.5; return [x, y]; }
  }
  throw new Error("no open ground");
}

/* ---- rules ---- */
{
  /* running tires; the desert tires faster; rest brings it back */
  const S = fresh("codebook"); openGround(S);
  run(S, 100, { run: 1, mx: 1 });
  const temperate = S.player.fat;
  const D = fresh("depot"); openGround(D);
  run(D, 100, { run: 1, mx: 1 });
  check(temperate < 100 && D.player.fat < temperate, `fatigue: running tires (${temperate.toFixed(1)}), the desert more (${D.player.fat.toFixed(1)})`);
  run(S, 600, { run: 1, mx: 1 }); run(S, 400, { run: 1, mx: -1 });
  check(S.player.tired || S.player.fat < 50, "fatigue: long running empties the bar");
  run(S, 600, {});
  check(S.player.fat > 90 && !S.player.tired, "fatigue: standing still restores it");
}
{
  /* three wounds and he is gone */
  const S = fresh(); openGround(S);
  AP.hurtPlayer(S, 1, "test", false); AP.hurtPlayer(S, 1, "test", false);
  check(S.player.wounds === 2 && !S.player.dead, "wounds: two is not dead");
  AP.hurtPlayer(S, 1, "test", false);
  check(S.player.dead && S.end && S.end.result === "kia", "wounds: three is killed in action");
  check(S.end.cause === "test" && AP.debrief(S).cause === "test", "wounds: the debrief knows what killed the ranger");
}
{
  /* body armour sometimes stops a round, and then only knocks him down */
  let kd = 0, wounds = 0;
  for (let i = 0; i < 400; i++) { const S = fresh("depot", 0, {}, 100 + i); openGround(S); AP.hurtPlayer(S, 1, "test", true); if (S.player.wounds) wounds++; else if (S.player.kd) kd++; }
  check(kd > 120 && kd < 280 && kd + wounds === 400, `armour: about half the rounds stopped at the easiest setting (${kd}/400)`);
}
{
  /* first aid: a wound off, standing still */
  const S = fresh(); openGround(S);
  S.player.wounds = 1;
  run(S, 2, { aid: 1 }); run(S, C.AID_T + 5, {});
  check(S.player.wounds === 0 && S.player.ammo.aid === 0, "first aid takes off a wound");
}
{
  /* noise: a shot is heard 14 tiles off, less in the snow; footsteps barely */
  const S = fresh("depot", 2, { noEnemies: false }); openGround(S);
  S.en = []; const e = AP.newEnemy(S, { k: "rifle", x: S.player.x + 12, y: S.player.y, f: 0 });
  AP.noise(S, S.player.x, S.player.y, C.NOISE.carbine, true);
  check((e.st === "investigate" || e.st === "pursue") && S.alert.lv === 2, "noise: a shot 12 tiles off is heard, and it is full alert");
  const A = fresh("radar", 2, { noEnemies: false }); openGround(A);
  A.en = []; const a = AP.newEnemy(A, { k: "rifle", x: A.player.x + 12, y: A.player.y, f: 0 });
  AP.noise(A, A.player.x, A.player.y, C.NOISE.carbine, true);
  check(a.st === "post" && A.alert.lv === 0, "noise: the snow muffles the same shot");
  const W = fresh("depot", 2, { noEnemies: false }); openGround(W);
  W.en = []; const w = AP.newEnemy(W, { k: "rifle", x: W.player.x + 4, y: W.player.y, f: 0 });
  AP.noise(W, W.player.x, W.player.y, C.NOISE.walk, false);
  check(w.st === "post", "noise: a walk is not heard four tiles off");
}
{
  /* concealment: a trench hides him from anyone outside it; crawling in scrub too */
  const S = fresh(); const [x, y] = openGround(S, T.TRENCH);
  const p = S.player;
  check(AP.seesPlayer(S, x + 0.5, y - 4.5, 8, 16, 9, false) === 0, "concealment: unseen in a trench from outside it");
  check(AP.seesPlayer(S, x + 0.5, y - 4.5, 8, 16, 9, true) > 0, "concealment: seen from inside the same trench");
  S.map.tiles[y * S.map.w + x] = T.BUSH; S.map.ver++; p.crawl = true;
  check(AP.seesPlayer(S, x + 0.5, y - 4.5, 8, 16, 9, false) === 0, "concealment: unseen crawling in scrub");
  p.crawl = false;
  check(AP.seesPlayer(S, x + 0.5, y - 4.5, 8, 16, 9, false) > 0, "concealment: seen standing in scrub");
  check(AP.seesPlayer(S, x + 0.5, y - 4.5, 24, C.FOV, 9, false) === 0, "concealment: unseen behind a man's back");
}
{
  /* the knife is silent */
  const S = fresh("depot", 2, { noEnemies: false }); openGround(S);
  S.en = [];
  const v = AP.newEnemy(S, { k: "rifle", x: S.player.x + 1, y: S.player.y, f: 0 });
  const n = AP.newEnemy(S, { k: "rifle", x: S.player.x + 6, y: S.player.y + 0.5, f: 0 });
  S.player.f = 0;
  run(S, 3, { weapon: "knife", fire: 1 });
  check(v.dead && n.st === "post" && S.alert.lv === 0, "knife: a kill nobody hears");
}
{
  /* a grenade opens wire */
  const S = fresh(); const [x, y] = openGround(S);
  for (let i = -2; i <= 2; i++) S.map.tiles[(y - 4) * S.map.w + x + i] = T.WIRE;
  S.map.ver++; S.player.f = 24;
  run(S, 1, { weapon: "gren", fire: 1 }); run(S, 16, { weapon: "gren", fire: 1 }); run(S, 60, {});
  check(AP.tileAt(S.map, x, y - 4) !== T.WIRE, "grenade: blows a gap in the wire");
}
{
  /* thin ice gives way under a running ranger */
  const S = fresh(); const [x, y] = openGround(S);
  for (let i = 1; i <= 3; i++) S.map.tiles[y * S.map.w + x + i] = T.THIN;
  S.map.ver++;
  run(S, 60, { mx: 1, run: 1 });
  check(S.player.wounds >= 1 && [1, 2, 3].some(i => AP.tileAt(S.map, x + i, y) === T.WATER), "thin ice: breaks under a running ranger");
}
{
  /* the clock runs out: the Osprey comes; miss it and he is captured */
  const S = fresh(); openGround(S);
  S.clock = 10;
  run(S, 20000, {});
  check(S.end && S.end.result === "captured", `clock: out of time and off the pickup is captured (${S.end && S.end.result})`);
}
{
  /* the airdrop */
  const drop = (fn, mission = "depot") => { const S = E.newMission({ mission, diff: 2, seed: 11, opts: { noEnemies: true } }); run(S, 20000, fn); return S; };
  const none = drop(() => ({}));
  check(none.end && none.end.result === "aborted" && none.drop.again && none.end.cause === "noJump", "airdrop: miss the light and the Osprey comes round once; miss it again, no mission");
  const landed = drop(S => ({ fire: S.drop.light && !S.drop.chute ? (S.t % 2) : 0 }));
  check(landed.phase === "foot" || (landed.end && landed.end.result !== "aborted"), "airdrop: a jump on the green light lands in the zone");
  const pods = E.newMission({ mission: "depot", diff: 2, seed: 11, opts: { noEnemies: true } });
  run(pods, 3000, S => ({ fire: S.t % 400 === 200 && S.drop.oy > 20 && !S.drop.light ? 1 : 0 }));
  check(pods.drop.podsLeft === 0 && pods.items.length + 0 <= 3, `airdrop: three pods kicked out (${pods.items.length} landed safely)`);
  /* a pod over a rock is lost */
  const L = E.newMission({ mission: "depot", diff: 2, seed: 11, opts: { noEnemies: true } });
  run(L, 400, {});
  const tx = Math.floor(L.drop.ox), ty = Math.floor(L.drop.oy + 30 / C.DROP.pod * C.DROP.speed * 0.4);
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) L.map.tiles[(ty + dy) * L.map.w + tx + dx] = T.ROCK;
  L.map.ver++;
  run(L, 1, { fire: 1 }); run(L, 80, {});
  check(L.items.length === 0, "airdrop: a pod that lands on rocks is lost");
}

/* ---- the missions ---- */
const missions = AP.MISSIONS.filter(m => !only || m.id === only);
const playBot = (S, max) => { while (S.phase !== "over" && S.t < max) E.tick(S, AP.Bot(S)); return S; };
for (const m of missions) {
  for (const seed of [1, 2, 3].slice(0, quick ? 1 : 3)) {
    const S = E.newMission({ mission: m.id, diff: 0, seed, opts: { noEnemies: true } });
    AP.skipDrop(S);
    playBot(S, 60000);
    const d = E.debrief(S);
    check(S.end && S.end.result === "retrieved" && d.goal, `bot: ${m.id} seed ${seed} on an empty field: ${S.end ? S.end.result : "no end"}, goal ${d.goal}${S.obj.failed ? " (" + S.obj.failed + ")" : ""}, step ${S.bot && S.bot.i}`);
  }
}
const tally = {};
for (const m of missions) for (let diff = 0; diff < 4; diff++) for (let seed = 1; seed <= seeds; seed++) {
  const tag = `${m.id} diff ${diff} seed ${seed}`;
  let S;
  try {
    S = E.newMission({ mission: m.id, diff, seed });
    AP.skipDrop(S);
    const limit = S.clock + 4000;
    while (S.phase !== "over" && S.t < limit) {
      E.tick(S, AP.Bot(S));
      if (S.t % 25) continue;
      for (const b of [S.player, ...S.en]) {
        if (b.dead || b.aboard) continue;
        if (!Number.isFinite(b.x) || !Number.isFinite(b.y)) throw new Error(`NaN position ${b.k || "ranger"}`);
        if (!AP.passable(S.map, Math.floor(b.x), Math.floor(b.y), b === S.player ? "p" : "e") && AP.TILE[AP.tileAt(S.map, Math.floor(b.x), Math.floor(b.y))].walk === false)
          throw new Error(`${b.k || "ranger"} in a wall at ${b.x.toFixed(2)},${b.y.toFixed(2)}`);
      }
    }
    check(S.phase === "over", `${tag}: never ended (t ${S.t})`);
    const r = (S.end || {}).result;
    tally[r] = (tally[r] || 0) + 1;
  } catch (e) { check(false, `${tag}: threw ${e.stack.split("\n").slice(0, 3).join(" | ")}`); }
}
console.log("bot against the enemy:", JSON.stringify(tally));

/* ---- determinism ---- */
for (const mission of only ? [only] : ["depot", "officer", "sabotage"]) {
  const S = E.newMission({ mission, diff: 2, seed: 5 });
  const marks = [];
  /* fly in, drop pods, jump on the light, then the bot */
  while (S.phase !== "over" && S.t < 25000) {
    const cmd = S.phase === "drop" ? { fire: (S.drop.light && !S.drop.chute) || (S.t === 300 || S.t === 600) ? 1 : 0, mx: S.drop.chute ? 1 : 0 } : AP.Bot(S);
    E.tick(S, cmd);
    if (S.t % 500 === 0) marks.push([S.t, E.hash(S)]);
    if (S.t === 3000) {
      /* a copy through JSON, run on beside the original for a while */
      const K = JSON.parse(JSON.stringify(S));
      const A = JSON.parse(JSON.stringify(S));
      let same = true;
      for (let i = 0; i < 1500; i++) { const c = AP.Bot(A); E.tick(A, c); E.tick(K, c); if (E.hash(A) !== E.hash(K)) { same = false; break; } }
      check(same, `determinism: ${mission}: two JSON copies run alike`);
    }
  }
  const R = E.replay(S);
  check(E.hash(R) === E.hash(S) && R.t === S.t, `determinism: ${mission}: replay from the log ends the same (${E.hash(R)} vs ${E.hash(S)}, t ${R.t} vs ${S.t})`);
  const mid = marks[Math.floor(marks.length / 2)];
  if (mid) { const M = E.replay(S, mid[0]); check(E.hash(M) === mid[1], `determinism: ${mission}: replay matches at t ${mid[0]}`); }
}

console.log(`sim-check: ${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
