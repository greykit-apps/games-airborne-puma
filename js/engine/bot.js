/* Airborne Puma -- a ranger with no imagination, for the tests. DOM-free.
 *
 * AP.Bot(S) returns the next tick's command. For each mission it follows a
 * plain plan -- walk to the target, throw a grenade or plant a bomb or stand
 * by the radio, call the Osprey, walk to the pickup -- by breadth-first paths
 * that keep off mines and thin ice. tools/sim-check.js uses it to show every
 * mission can be won, and as a body for the enemy to shoot at. It is not
 * loaded by the page. */
"use strict";
(() => {
  const T = AP.T;
  const N8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  const ok = (map, x, y) => AP.passable(map, x, y, "p") && AP.tileAt(map, x, y) !== T.MINE && AP.tileAt(map, x, y) !== T.THIN;

  function pathTo(S, pred) {
    const map = S.map, W = map.w, p = S.player, sx = Math.floor(p.x), sy = Math.floor(p.y);
    const from = new Int32Array(W * map.h).fill(-2), q = [sy * W + sx];
    from[q[0]] = -1;
    for (let i = 0; i < q.length; i++) {
      const x = q[i] % W, y = (q[i] / W) | 0;
      if (pred(x, y)) {
        const out = [];
        for (let j = q[i]; j >= 0; j = from[j]) out.unshift([j % W + 0.5, ((j / W) | 0) + 0.5]);
        return out;
      }
      for (const [dx, dy] of N8) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= map.h || from[ny * W + nx] !== -2 || !ok(map, nx, ny)) continue;
        if (dx && dy && (!ok(map, x + dx, y) || !ok(map, x, y + dy))) continue;
        from[ny * W + nx] = q[i]; q.push(ny * W + nx);
      }
    }
    return null;
  }

  const ctr = o => ({ x: o.x + o.w / 2, y: o.y + o.h / 2 });
  const objs = (S, k) => S.map.objs.filter(o => o.k === k);
  const byId = (S, id) => S.map.objs.find(o => o.id === id);
  const grenAt = o => [{ go: S => ctr(byId(S, o.id)), r: 5, min: 3.4, skip: S => byId(S, o.id).dead }, { gren: o.id }];

  function plan(S) {
    const P = [];
    switch (S.mission) {
      case "depot": for (const k of ["shack", "magazine", "fuel"]) for (const o of objs(S, k)) P.push(...grenAt(o)); break;
      case "aircraft": for (const o of objs(S, "plane")) P.push(...grenAt(o)); break;
      case "radar": for (const o of objs(S, "dish")) P.push(...grenAt(o)); break;
      case "sam": for (const o of objs(S, "sam")) P.push(...grenAt(o)); break;
      case "codebook": { const r = objs(S, "radio")[0]; P.push({ go: () => ctr(r), r: 1.8 }, { until: S => S.obj.have, max: 400 }); break; }
      case "officer": {
        const id = S.obj.officer;
        P.push({ go: S => S.en.find(e => e.id === id), r: 0.9, live: true, weapon: "carbine" }, { until: S => S.obj.taken, max: 300 });
        break;
      }
      case "pipeline": { const o = objs(S, "pump")[0]; P.push({ go: () => ctr(o), r: 2.6 }, { bomb: 10 }, { away: 8 }, { until: () => o.dead, max: 1200 }); break; }
      case "pow": { const y = objs(S, "pyramid")[0], l = objs(S, "lever")[0]; P.push(...grenAt(y), { go: () => ({ x: l.x + 0.5, y: l.y + 0.5 }), r: 1.4 }, { use: true }); break; }
      case "photo": { const h = S.map.hangar; P.push({ go: () => ({ x: (h.x0 + h.x1) / 2, y: (h.y0 + h.y1) / 2 }), r: 1.6 }, { until: S => S.obj.goal, max: 900 }); break; }
      case "hostages": { P.push({ recall: true }, ...grenAt(objs(S, "door")[0])); break; }
      case "diversion": P.push({ until: S => S.obj.alarm, max: 30000 }, { go: S => S.map.pickup, r: 0.4, noise: true }, { until: S => S.obj.goal, max: 30000, noise: true }); break;
      case "sabotage": { const o = objs(S, "avfuel")[0]; P.push({ go: () => ctr(o), r: 2.4 }, { bomb: 15 }, { away: 8 }, { until: () => o.dead, max: 2500 }); break; }
    }
    if (AP.recallAllowed(S)) P.push({ recall: true });
    P.push({ go: S => S.map.pickup, r: 0.3 }, { until: S => !!S.end, max: 99999 });
    return P;
  }

  AP.Bot = S => {
    const c = { mx: 0, my: 0, aim: null, fire: false, use: false, aid: false, recall: false, run: false, crawl: false, weapon: null, fuse: 0 };
    if (S.phase !== "foot" || S.end) return c;
    const b = S.bot || (S.bot = { plan: null, i: 0, path: null, pi: 0, t: 0, n: 0, from: null, last: null });
    if (!b.plan) b.plan = plan(S);
    const p = S.player, step = b.plan[b.i];
    if (!step) return c;
    const next = () => { b.i++; b.path = null; b.t = 0; b.n = 0; };
    b.t++;
    if (p.wounds > 0 && p.ammo.aid > 0 && !p.aidT && step.go) { c.aid = !S.player.pa; return c; }
    if (step.noise && b.t % 50 < 10) { c.weapon = "carbine"; c.fire = true; c.aim = 24; }
    if (step.skip && step.skip(S)) { next(); return c; }

    if (step.go) {
      const tgt = step.go(S);
      if (!tgt) { next(); return c; }
      if (step.weapon) c.weapon = step.weapon;
      const d = AP.dist(p.x, p.y, tgt.x, tgt.y);
      if (d <= step.r && (!step.min || d >= step.min)) { next(); return c; }
      if (!b.path || b.t % (step.live ? 50 : 400) === 0 || (b.stuck || 0) > 80) {
        b.path = pathTo(S, (x, y) => { const e = AP.dist(x + 0.5, y + 0.5, tgt.x, tgt.y); return e <= step.r && (!step.min || e >= step.min); });
        b.pi = 0; b.stuck = 0;
        if (!b.path) { next(); return c; }
      }
      let [nx, ny] = b.path[Math.min(b.pi, b.path.length - 1)];
      if (AP.dist(p.x, p.y, nx, ny) < 0.25 && b.pi < b.path.length - 1) { b.pi++; [nx, ny] = b.path[b.pi]; }
      const dx = nx - p.x, dy = ny - p.y;
      c.mx = Math.abs(dx) > 0.08 ? Math.sign(dx) : 0;
      c.my = Math.abs(dy) > 0.08 ? Math.sign(dy) : 0;
      if (!c.mx && !c.my && b.pi >= b.path.length - 1) { c.mx = Math.sign(tgt.x - p.x); c.my = Math.sign(tgt.y - p.y); }
      const at = Math.round(p.x * 100) + "," + Math.round(p.y * 100);
      b.stuck = at === b.last ? (b.stuck || 0) + 1 : 0; b.last = at;
      if (step.noise) { c.fire = b.t % 50 < 10; c.weapon = "carbine"; if (c.fire) { c.aim = 24; } }
      return c;
    }
    if (step.gren !== undefined) {
      const o = byId(S, step.gren);
      if (o.dead || (p.ammo.gren === 0 && !p.charge)) { next(); return c; }
      const t = ctr(o), d = AP.dist(p.x, p.y, t.x, t.y);
      const need = Math.max(1, Math.min(50, Math.round((d - 2) / 6 * 50)));
      c.weapon = "gren"; c.aim = AP.dirTo(t.x - p.x, t.y - p.y);
      if (b.n === 0) { c.fire = true; if (p.charge >= need) b.n = 1; return c; }
      if (++b.n > 90) { if (o.dead || !p.ammo.gren || b.t > 400) next(); else b.n = 0; }
      return c;
    }
    if (step.bomb) {
      c.weapon = "bomb"; c.fuse = step.bomb;
      if (b.t === 2) c.fire = true;
      if (b.t > 4) { b.from = { x: p.x, y: p.y }; next(); }
      return c;
    }
    if (step.away) {
      const from = b.from || { x: p.x, y: p.y };
      b.from = from;
      if (AP.dist(p.x, p.y, from.x, from.y) >= step.away) { next(); return c; }
      if (!b.path) { b.path = pathTo(S, (x, y) => AP.dist(x + 0.5, y + 0.5, from.x, from.y) >= step.away); b.pi = 0; if (!b.path) { next(); return c; } }
      let [nx, ny] = b.path[Math.min(b.pi, b.path.length - 1)];
      if (AP.dist(p.x, p.y, nx, ny) < 0.25 && b.pi < b.path.length - 1) { b.pi++; [nx, ny] = b.path[b.pi]; }
      c.mx = Math.abs(nx - p.x) > 0.08 ? Math.sign(nx - p.x) : 0; c.my = Math.abs(ny - p.y) > 0.08 ? Math.sign(ny - p.y) : 0;
      if (!c.mx && !c.my) next();
      return c;
    }
    if (step.use) { c.use = b.t === 2; if (b.t > 4) next(); return c; }
    if (step.recall) { c.recall = b.t === 2; if (b.t > 4) next(); return c; }
    if (step.until) { if (step.until(S) || b.t > step.max) next(); return c; }
    next();
    return c;
  };
})();
