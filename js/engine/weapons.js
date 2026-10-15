/* Airborne Puma -- the ranger's weapons, and what they do to the world.
 * DOM-free.
 *
 *   carbine   automatic while the button is held; unarmoured troops only
 *   grenade   hold the button to throw further; troops, MG nests, wire, mines,
 *             doors, tents, anything soft
 *   LAW       one rocket, long range: bunkers, turrets, minitanks
 *   knife     silent, at arm's length
 *   time bomb a 5, 10 or 15 second fuse; the only thing heavy enough for some
 *   first aid takes off a wound, standing still
 */
"use strict";
(() => {
  const C = AP.C, T = AP.T;
  const SOFT_POWERS = new Set(["gren", "law", "bomb", "mine", "prox"]);

  AP.useWeapon = (S, c, fireEdge) => {
    const p = S.player, w = p.weapon;
    if (p.stab === C.STAB - C.STAB_HIT) stab(S, p);
    if (w === "carbine") {
      if (c.fire && p.cool === 0 && p.reload === 0) {
        if (p.rnd > 0) {
          p.rnd--; p.cool = C.CARBINE.rate;
          AP.unmask(S);
          fireCarbine(S, p);
          if (p.rnd === 0 && p.ammo.mag > 0) { p.ammo.mag--; p.reload = C.CARBINE.reload; S.ev.push({ t: "reload" }); }
        } else if (fireEdge) S.ev.push({ t: "empty" });
      }
    } else if (w === "gren") {
      if (c.fire && p.ammo.gren > 0) p.charge = Math.min(C.GREN.charge, p.charge + 1);
      else if (fireEdge && !p.ammo.gren) S.ev.push({ t: "empty" });
      if (!c.fire && p.charge > 0) {
        const d = C.GREN.min + (C.GREN.max - C.GREN.min) * p.charge / C.GREN.charge, [dx, dy] = AP.DIR32[p.f];
        p.charge = 0; p.ammo.gren--;
        AP.unmask(S);
        AP.throwGren(S, p.x, p.y, p.x + dx * d, p.y + dy * d, "p");
        after(S);
      }
    } else if (w === "law" && fireEdge) {
      if (p.ammo.law > 0) {
        p.ammo.law--; AP.unmask(S);
        const [dx, dy] = AP.DIR32[p.f];
        AP.fireRocket(S, p.x, p.y, dx, dy, "p", C.LAW.range);
        after(S);
      } else S.ev.push({ t: "empty" });
    } else if (w === "knife" && fireEdge && !p.stab) { p.stab = C.STAB; S.ev.push({ t: "knife" }); }
    else if (w === "bomb" && fireEdge) {
      if (p.ammo.bomb > 0) {
        p.ammo.bomb--;
        const b = { x: p.x, y: p.y, t: p.fuse * C.HZ, by: "p" };
        S.bombs.push(b);
        S.ev.push({ t: "plant", fuse: p.fuse });
        AP.objHook(S, "plant", b);
        after(S);
      } else S.ev.push({ t: "empty" });
    }
  };
  /* Field option: back to the carbine after a throw, a rocket or a bomb */
  function after(S) { if (S.opts.autoCarbine) S.player.weapon = "carbine"; }

  /* ---- the carbine: a ray, stopped by the first thing it meets ---- */
  function fireCarbine(S, p) {
    const a = p.f / 32 * Math.PI * 2 + (AP.rand(S) - 0.5) * 2 * C.CARBINE.spread;
    const dx = Math.cos(a), dy = Math.sin(a);
    let x = p.x, y = p.y, s = 0;
    const hit = AP.ray(S, p.x, p.y, dx, dy, C.CARBINE.range, "p");
    x = hit.x; y = hit.y; s = hit.s;
    if (hit.e) {
      const e = hit.e, chance = e.prone || AP.TILE[AP.tileUnder(S, e)].trench ? 0.5 : 0.9;
      if (AP.rand(S) < chance) AP.hurtEnemy(S, e, 1, "p", "carbine");
    } else if (hit.o) AP.damageObj(S, hit.o, "carbine", "p");
    S.fx.push({ k: "tracer", x0: p.x, y0: p.y, x1: x, y1: y, t: 3 });
    S.ev.push({ t: "shot", by: "p", x: p.x, y: p.y });
    p.fired = S.t;
    AP.noise(S, p.x, p.y, C.NOISE.carbine, true);
    AP.objHook(S, "noise", { x: p.x, y: p.y, n: 1 });
    void s;
  }

  /* Walk a line until it meets something: a tile that stops bullets, a
   * thing built on the ground, or a person. by: "p" the ranger's (finds
   * enemies), "e" an enemy's (finds nobody; the hit is rolled elsewhere). */
  AP.ray = (S, x0, y0, dx, dy, range, by) => {
    const map = S.map;
    const t0x = Math.floor(x0), t0y = Math.floor(y0);
    for (let s = 0.35; s <= range; s += 0.2) {
      const x = x0 + dx * s, y = y0 + dy * s, tx = Math.floor(x), ty = Math.floor(y);
      const td = AP.TILE[AP.tileAt(map, tx, ty)];
      if (td.los) return { x, y, s };
      /* low cover (walls, boulders, a pipe) stops the rounds of a man firing from the ground, not over it */
      if (td.low && s > 1.2 && (tx !== t0x || ty !== t0y) && by === "p" && S.player.crawl) return { x, y, s };
      const o = AP.objAt(map, tx, ty);
      if (o && o.k !== "pit") return { x, y, s, o };
      if (by === "p") {
        for (const e of S.en) {
          if (e.dead || e.aboard) continue;
          if (Math.abs(e.x - x) < 0.4 && Math.abs(e.y - y) < 0.45) return { x, y, s, e };
        }
      }
    }
    return { x: x0 + dx * range, y: y0 + dy * range, s: range };
  };

  /* ---- the knife: it lands a moment after the button, as the blow does ---- */
  function stab(S, p) {
    let best = null, bd = C.KNIFE;
    for (const e of S.en) {
      if (e.dead || e.friend || e.k === "tank") continue;
      const d = AP.dist(p.x, p.y, e.x, e.y);
      if (d > bd || AP.dirDiff(p.f, AP.dirTo(e.x - p.x, e.y - p.y)) > 6) continue;
      best = e; bd = d;
    }
    if (!best) return;
    if (best.st !== "pursue" || AP.rand(S) < 0.5) {
      const uniform = best.k === "guard" && S.map.objs.some(o => o.k === "guardhouse" && AP.dist(o.x + 1.5, o.y + 1, best.x, best.y) < 3.5);
      AP.hurtEnemy(S, best, best.hp, "p", "knife");
      if (uniform && !p.disguised) { p.disguised = true; S.ev.push({ t: "uniform" }); }
    }
  }

  /* ---- grenades, rockets, bombs ---- */
  AP.throwGren = (S, x0, y0, x1, y1, by) => {
    const d = AP.dist(x0, y0, x1, y1);
    S.nades.push({ x0, y0, x1, y1, x: x0, y: y0, z: 0, t: 0, T: Math.max(10, Math.round(C.GREN.flight * (0.5 + d / C.GREN.max * 0.5))), by });
    S.ev.push({ t: "throw", by });
  };
  AP.fireRocket = (S, x, y, dx, dy, by, range) => {
    S.rockets.push({ x, y, x0: x, y0: y, dx, dy, left: range, by });
    S.ev.push({ t: "rocket", by, x, y });
  };

  AP.weaponsTick = S => {
    /* grenades fly over walls and burst where they land */
    for (const g of S.nades) {
      g.t++;
      const k = g.t / g.T;
      g.x = g.x0 + (g.x1 - g.x0) * k; g.y = g.y0 + (g.y1 - g.y0) * k; g.z = Math.sin(Math.PI * k) * 1.5;
      if (g.t >= g.T) { g.done = true; AP.explode(S, g.x1, g.y1, C.GREN.r, "gren", g.by); }
    }
    S.nades = S.nades.filter(g => !g.done);
    /* rockets go straight until they hit */
    for (const k of S.rockets) {
      const step = C.LAW.speed;
      k.x += k.dx * step; k.y += k.dy * step; k.left -= step;
      const tx = Math.floor(k.x), ty = Math.floor(k.y), td = AP.TILE[AP.tileAt(S.map, tx, ty)];
      const far = AP.dist(k.x, k.y, k.x0, k.y0) > 1.2;
      let boom = k.left <= 0 || td.los || (td.low && far);
      const o = AP.objAt(S.map, tx, ty);
      if (o && o.k !== "pit") boom = true;
      if (k.by === "p") { for (const e of S.en) if (!e.dead && !e.friend && AP.dist(e.x, e.y, k.x, k.y) < 0.5) boom = true; }
      else if (AP.dist(S.player.x, S.player.y, k.x, k.y) < 0.5 && !S.player.aboard) boom = true;
      if (boom) { k.done = true; AP.explode(S, k.x, k.y, C.LAW.r, "law", k.by); }
    }
    S.rockets = S.rockets.filter(k => !k.done);
    /* time bombs count down */
    for (const b of S.bombs) if (--b.t <= 0) { b.done = true; AP.explode(S, b.x, b.y, C.BOMB.r, "bomb", b.by); }
    S.bombs = S.bombs.filter(b => !b.done);
    /* things that go up a moment after something else does */
    for (const q of S.pending) if (--q.d <= 0) { q.done = true; AP.explode(S, q.x, q.y, q.r, q.power, q.by); }
    S.pending = S.pending.filter(q => !q.done);
    /* the look of it */
    for (const f of S.fx) f.t--;
    S.fx = S.fx.filter(f => f.t > 0);
  };

  /* ---- explosions ---- */
  AP.explode = (S, x, y, r, power, by) => {
    const map = S.map, p = S.player;
    S.fx.push({ k: "boom", x, y, r, t: 18, T: 18 });
    S.ev.push({ t: "boom", x, y, power, by });
    /* people */
    for (const e of S.en) {
      if (e.dead || e.aboard) continue;
      if (AP.dist(e.x, e.y, x, y) <= r) AP.hurtEnemy(S, e, 9, by, power);
    }
    if (!p.dead && !p.aboard && S.phase === "foot") {
      const d = AP.dist(p.x, p.y, x, y);
      if (d <= r) AP.hurtPlayer(S, d < r * 0.5 ? 2 : 1, by === "p" ? power + ":own" : by === "e" && power === "law" ? "rocket" : power, false);
    }
    /* things built on the ground */
    for (const o of map.objs) {
      if (o.dead || o.hidden) continue;
      const cx = AP.clamp(x, o.x, o.x + o.w), cy = AP.clamp(y, o.y, o.y + o.h);
      if (AP.dist(cx, cy, x, y) <= r * 0.8) AP.damageObj(S, o, power, by);
    }
    /* the ground */
    const R = Math.ceil(r);
    for (let ty = Math.floor(y) - R; ty <= Math.floor(y) + R; ty++) for (let tx = Math.floor(x) - R; tx <= Math.floor(x) + R; tx++) {
      if (AP.dist(tx + 0.5, ty + 0.5, x, y) > r) continue;
      const t = AP.tileAt(map, tx, ty), i = ty * map.w + tx;
      if (t === T.WIRE) { map.tiles[i] = T.ROUGH; map.ver++; }
      /* a grenade or a rocket sets off the mines it reaches; a mine going off does not set off the field */
      else if (t === T.MINE) { map.tiles[i] = T.CRATER; map.ver++; if (power !== "mine" && AP.dist(tx + 0.5, ty + 0.5, x, y) > 0.3) S.pending.push({ x: tx + 0.5, y: ty + 0.5, r: 1.1, power: "mine", by, d: 4 + (AP.rand(S) * 6 | 0) }); }
      else if (t === T.THIN || t === T.ICE) { if (power !== "mine") { map.tiles[i] = T.WATER; map.ver++; } }
    }
    const ct = AP.tileAt(map, Math.floor(x), Math.floor(y));
    if (ct === T.OPEN || ct === T.ROUGH || ct === T.BUSH) { map.tiles[Math.floor(y) * map.w + Math.floor(x)] = T.CRATER; map.ver++; }
    AP.noise(S, x, y, C.NOISE.boom, true);
    AP.objHook(S, "noise", { x, y, n: 5 });
  };

  /* what each kind of armour gives way to */
  AP.damageObj = (S, o, power, by) => {
    if (o.dead) return;
    const armor = AP.OBJ[o.k].armor;
    if (o.k === "plane" && power === "carbine") { if (--o.hp > 0) return; }
    else if (armor === "none") return;
    else if (armor === "soft" && !SOFT_POWERS.has(power)) return;
    else if (armor === "hard" && power !== "law" && power !== "bomb") return;
    else if (armor === "heavy" && power !== "bomb") { S.ev.push({ t: "clang", x: o.x + o.w / 2, y: o.y + o.h / 2 }); return; }
    AP.destroyObj(S, o, by);
  };
  AP.destroyObj = (S, o, by) => {
    if (o.dead) return;
    o.dead = true;
    S.map.ver++;
    const cx = o.x + o.w / 2, cy = o.y + o.h / 2, d = AP.OBJ[o.k];
    S.ev.push({ t: "objdown", k: o.k, x: cx, y: cy });
    if (by === "p") S.merit.inst[o.k] = (S.merit.inst[o.k] || 0) + 1;
    if (d.blast) S.pending.push({ x: cx, y: cy, r: d.blast, power: "bomb", by, d: 8 });
    if (o.k === "prox") S.pending.push({ x: cx, y: cy, r: 1.5, power: "prox", by: "x", d: 1 });
    AP.objHook(S, "obj", o, by);
  };

  /* a hit on a person. Hard targets (minitanks) shrug off all but a LAW or a bomb. */
  AP.hurtEnemy = (S, e, n, by, power) => {
    if (e.dead || e.aboard) return;
    if (AP.KINDS[e.k].armor === "hard" && power !== "law" && power !== "bomb") { S.ev.push({ t: "clang", x: e.x, y: e.y }); return; }
    e.hp -= n;
    if (e.friend || e.k === "officer") e.wounded = true;
    if (e.hp > 0) { if (!e.friend && e.st !== "follow") { e.st = "pursue"; e.known = { x: S.player.x, y: S.player.y }; } return; }
    e.dead = true; e.deadT = S.t;
    S.ev.push({ t: "die", k: e.k, x: e.x, y: e.y, quiet: power === "knife" });
    if (by === "p" && !e.friend) S.merit.kill[e.k] = (S.merit.kill[e.k] || 0) + 1;
    AP.objHook(S, "kill", e, by);
  };
})();
