/* Airborne Puma -- the engine's face: a mission begun, a tick, a fingerprint.
 * DOM-free.
 *
 * S, the whole state of a mission, is plain data: JSON.parse(JSON.stringify(S))
 * is a perfect copy, which is how a mission in progress is saved. Every die
 * thrown is AP.rand(S), so the same seed and the same commands give the same
 * mission; S.log keeps the commands (only when they change), and replaying
 * them from the seed reproduces it exactly -- tools/sim-check.js holds the
 * engine to that.
 *
 * A command, once a tick, from the keyboard, a pad, the touch screen, the
 * test bot or a replay:
 *   mx, my   -1, 0 or 1: the stick
 *   aim      0..31 to point the crosshair straight there (mouse aim), or null
 *   turn     -1, 0, 1: nudge the crosshair a step
 *   fire, use, aid, recall   buttons, held
 *   run, crawl               the stances wanted (toggling is the input's job)
 *   weapon   carbine | gren | law | knife | bomb | aid, or null
 *   fuse     5, 10 or 15 to set the bomb's, or 0
 *   ff       the fly-over hurried along (a Field aid)
 */
"use strict";
(() => {
  const C = AP.C;
  const KEYS = ["mx", "my", "aim", "turn", "fire", "use", "aid", "recall", "run", "crawl", "weapon", "fuse", "ff"];
  const encode = c => KEYS.map(k => c[k] === undefined || c[k] === null || c[k] === false || c[k] === 0 ? "" : c[k] === true ? 1 : c[k]).join(",");
  const decode = s => {
    const v = s.split(","), c = {};
    KEYS.forEach((k, i) => {
      const x = v[i];
      if (k === "weapon") c[k] = x || null;
      else if (k === "aim") c[k] = x === "" ? null : +x;
      else c[k] = x === "" ? 0 : +x;
    });
    return c;
  };

  AP.Engine = {
    newMission({ mission, diff = 2, seed = 1, pods = null, opts = {} }) {
      const m = AP.MISSION[mission];
      const map = AP.genMap({ mission, diff, seed });
      const S = {
        v: 1, seed, rs: (seed * 2654435761) ^ 0x51ED, t: 0, phase: "drop", mission, zone: m.zone, diff,
        opts: { autoCarbine: !!opts.autoCarbine, podTake: !!opts.podTake, ffDrop: !!opts.ffDrop, noEnemies: !!opts.noEnemies },
        map, pods: (pods || m.pods).map(a => a.slice()), player: AP.newPlayer(map.w / 2 + 0.5, map.h - 19.5),
        en: [], fx: [], nades: [], rockets: [], bombs: [], items: [], pending: [],
        alert: { lv: 0, last: null, quiet: 0, reinfT: 0, fullAt: -1, seenRun: 0, seenT: -1 },
        obj: {}, clock: (m.clock || C.CLOCK_S) * C.HZ, clockOut: false,
        merit: { kill: {}, inst: {}, wounds: 0, pen: 0, notes: [] },
        osprey: null, drop: null, ev: [], log: [], last: null, end: null, nextId: 1,
      };
      /* the garrison: the installation's own people always; the rest thinned or thickened by difficulty */
      {
        const k = C.DIFF.enemies[diff];
        for (const s of map.spawns) {
          const kd = AP.KINDS[s.k];
          if (S.opts.noEnemies && !kd.friend && s.k !== "officer") continue;
          if (!s.tpl && !kd.friend && AP.rand(S) > k) continue;
          let kind = s.k;
          if (kind === "rifle" || kind === "guard") {
            const r = AP.rand(S), mix = m.mix || {};
            if (r < (mix.elite || 0)) kind = "elite";
            else if (r < (mix.elite || 0) + (mix.at || 0)) kind = "at";
            else if (r < (mix.elite || 0) + (mix.at || 0) + (mix.flamer || 0)) kind = "flamer";
          }
          const e = AP.newEnemy(S, Object.assign({}, s, { k: kind }));
          if (s.k === "guard") e.route = null;
          if (k > 1 && !s.tpl && !kd.friend && s.route && AP.rand(S) < k - 1) AP.newEnemy(S, Object.assign({}, s, { x: s.route[1][0], y: s.route[1][1] }));
        }
        if (S.opts.noEnemies) for (const o of map.objs) if (AP.OBJ[o.k].gun) o.disarmed = true;
      }
      AP.objInit(S);
      AP.dropInit(S);
      return S;
    },

    tick(S, cmd = {}) {
      S.ev = [];
      if (S.phase === "over") return S.ev;
      const s = encode(cmd);
      if (s !== S.last) { S.log.push([S.t, s]); S.last = s; }
      if (S.phase === "drop") {
        AP.dropTick(S, cmd);
        AP.weaponsTick(S);
      } else if (S.phase === "foot") {
        AP.playerTick(S, S.end ? {} : cmd);
        AP.weaponsTick(S);
        if (!S.opts.noEnemies) AP.aiTick(S);
        else for (const e of S.en) if (e.friend || e.st === "follow" || e.k === "officer") AP.aiOne(S, e);
        AP.alertTick(S);
        AP.objTick(S);
        AP.extractTick(S);
      }
      if (S.end && S.phase !== "over" && S.t - S.end.t > (S.end.result === "retrieved" ? 60 : 150)) { S.phase = "over"; S.ev.push({ t: "over" }); }
      S.t++;
      return S.ev;
    },

    /* a short fingerprint of the state, for the determinism checks */
    hash(S) {
      let h = 2166136261;
      const mix = v => { h ^= Math.round(v * 1000) | 0; h = Math.imul(h, 16777619); };
      mix(S.t); mix(S.rs); mix(S.player.x); mix(S.player.y); mix(S.player.wounds); mix(S.player.fat); mix(S.alert.lv); mix(S.clock);
      for (const e of S.en) { mix(e.x); mix(e.y); mix(e.dead ? 1 : 0); }
      for (const o of S.map.objs) mix(o.dead ? 1 : 0);
      return (h >>> 0).toString(16);
    },
    debrief: S => AP.debrief(S),
    encode, decode,
    /* the same mission again, from its seed and its log */
    replay(S0, upTo = Infinity) {
      const S = AP.Engine.newMission({ mission: S0.mission, diff: S0.diff, seed: S0.seed, pods: S0.pods, opts: S0.opts });
      const log = S0.log;
      let i = 0, cmd = {};
      while (S.phase !== "over" && S.t < upTo) {
        while (i < log.length && log[i][0] === S.t) { cmd = decode(log[i][1]); i++; }
        AP.Engine.tick(S, cmd);
        if (S.t > 200000) break;
      }
      return S;
    },
  };
})();
