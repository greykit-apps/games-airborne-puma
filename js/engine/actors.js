/* Airborne Puma -- bodies on the ground: the ranger, and the walking and
 * standing every soldier shares. DOM-free.
 *
 * The ranger walks, runs or crawls (the C64's CRSR and SPACE toggles), in
 * eight directions, with a crosshair that turns through thirty-two. Running
 * fills the fatigue bar; empty, he walks until he has his breath back. The
 * desert, wounds and the weight of pod contents all make it worse. */
"use strict";
(() => {
  const C = AP.C, T = AP.T;

  AP.newPlayer = (x, y) => ({
    x, y, f: 24, crawl: false, run: false, moving: false, tired: false, fat: 100, wounds: 0, kd: 0,
    weapon: "carbine", rnd: C.CARBINE.mag, ammo: { mag: C.START.mag - 1, gren: C.START.gren, law: C.START.law, bomb: C.START.bomb, aid: C.START.aid },
    reload: 0, cool: 0, stab: 0, charge: 0, fuse: 10, aidT: 0, breath: C.BREATH, drownT: 0, sub: false, iceT: 0,
    disguised: false, pods: 0, burden: 0, dead: false, climbing: 0, aboard: false, pf: false, pu: false, pa: false, pr: false,
    stepT: 0, rotT: 0, fired: -999, photo: 0,
  });

  /* Move a body by (dx, dy), one axis at a time so it slides along walls.
   * who: "p" the ranger, "e" the enemy (who keep off their own mines). */
  AP.moveBody = (S, b, dx, dy, who) => {
    const r = C.R, map = S.map;
    const free = (x, y) => {
      for (const [ox, oy] of [[-r, -r], [r, -r], [-r, r], [r, r]]) if (!AP.passable(map, Math.floor(x + ox), Math.floor(y + oy), who)) return false;
      return true;
    };
    let moved = 0;
    if (dx && free(b.x + dx, b.y)) { b.x += dx; moved += Math.abs(dx); }
    if (dy && free(b.x, b.y + dy)) { b.y += dy; moved += Math.abs(dy); }
    /* corner assist: pushing straight at the edge of something, slip round it */
    if (!moved && (!dx) !== (!dy)) {
      const sp = Math.abs(dx || dy), reach = r * 1.6;
      for (const s of [1, -1]) {
        if (dy && free(b.x + s * reach, b.y + dy) && free(b.x + s * sp, b.y)) { b.x += s * sp; return sp; }
        if (dx && free(b.x + dx, b.y + s * reach) && free(b.x, b.y + s * sp)) { b.y += s * sp; return sp; }
      }
    }
    return moved;
  };
  AP.tileUnder = (S, b) => AP.tileAt(S.map, Math.floor(b.x), Math.floor(b.y));

  /* A hit on the ranger. n wounds; armorable: a single round the body armour
   * may stop, which only knocks him down. */
  AP.hurtPlayer = (S, n, cause, armorable = true) => {
    const p = S.player;
    if (p.dead || p.aboard || S.end) return;
    if (armorable && n === 1 && AP.rand(S) < C.DIFF.armor[S.diff]) { p.kd = C.KD; S.ev.push({ t: "armor" }); return; }
    p.wounds = Math.min(3, p.wounds + n);
    p.aidT = 0; p.kd = 20;
    S.merit.wounds += n;
    S.ev.push({ t: "wound", cause });
    if (p.wounds >= 3) { p.dead = true; S.ev.push({ t: "kia", cause }); AP.finish(S, "kia", cause); }
  };

  /* how much the ranger is carrying beyond the issue load (Classic pod handling) */
  function burden(p) {
    const s = C.START;
    const extra = Math.max(0, p.ammo.mag + (p.rnd > 0 ? 1 : 0) - s.mag) + Math.max(0, p.ammo.gren - s.gren) +
      Math.max(0, p.ammo.law - s.law) * 2 + Math.max(0, p.ammo.bomb - s.bomb) * 2 + Math.max(0, p.ammo.aid - s.aid);
    return Math.min(p.pods, Math.ceil(extra / 4));
  }
  AP.burden = burden;

  AP.unmask = S => { if (S.player.disguised) { S.player.disguised = false; S.ev.push({ t: "unmasked" }); } };

  AP.playerTick = (S, c) => {
    const p = S.player;
    if (p.dead || p.aboard || S.end) return;
    const fireEdge = c.fire && !p.pf, useEdge = c.use && !p.pu, aidEdge = c.aid && !p.pa, recallEdge = c.recall && !p.pr;
    p.pf = c.fire; p.pu = c.use; p.pa = c.aid; p.pr = c.recall;
    if (recallEdge) AP.recall(S);
    if (p.climbing > 0) { if (--p.climbing === 0) AP.board(S); return; }

    if (c.weapon && C.WEAPONS.includes(c.weapon) && c.weapon !== p.weapon) { p.weapon = c.weapon; p.charge = 0; p.aidT = 0; S.ev.push({ t: "select", w: c.weapon }); }
    if (c.fuse) p.fuse = c.fuse;
    p.crawl = !!c.crawl;
    if (p.cool > 0) p.cool--;
    if (p.stab > 0) p.stab--;
    if (p.reload > 0 && --p.reload === 0) { p.rnd = C.CARBINE.mag; S.ev.push({ t: "reloaded" }); }

    if (p.kd > 0) { p.kd--; p.moving = false; p.pf = false; return; }

    /* aim and movement */
    const mx = c.mx | 0, my = c.my | 0, stick = mx || my;
    const aiming = c.fire && stick && (p.weapon === "carbine" || p.weapon === "gren") && c.aim == null;
    if (c.aim != null) p.f = ((c.aim % 32) + 32) % 32;
    else if (aiming) { if (++p.rotT >= 3) { p.rotT = 0; p.f = AP.turnToward(p.f, AP.dirTo(mx, my)); } }
    else if (stick) p.f = AP.dirTo(mx, my);
    if (c.turn) p.f = (p.f + (c.turn > 0 ? 1 : 31)) % 32;

    const tile = AP.tileUnder(S, p), td = AP.TILE[tile];
    p.run = !!c.run && !p.crawl && !p.tired;
    p.moving = false;
    if (stick && !aiming && p.aidT === 0) {
      let sp = p.crawl ? C.CRAWL : p.run ? C.RUN : C.WALK;
      sp *= td.slow;
      const k = mx && my ? Math.SQRT1_2 : 1;
      const moved = AP.moveBody(S, p, mx * sp * k, my * sp * k, "p");
      p.moving = moved > 0;
    }
    if (!p.moving) p.run = false;

    /* fatigue */
    const F = C.FAT;
    p.burden = S.opts.podTake ? 0 : burden(p);
    if (p.run) {
      p.fat -= F.run * (S.zone === "desert" ? F.desert : 1) * (1 + F.wound * p.wounds) * (1 + F.burden * p.burden);
      if (p.fat <= 0) { p.fat = 0; p.tired = true; S.ev.push({ t: "winded" }); }
    } else {
      const rec = p.moving ? (p.crawl ? F.crawl : F.walk) : F.still;
      p.fat = Math.min(100, p.fat + rec / (1 + 0.5 * p.burden));
      if (p.tired && p.fat >= F.rest) p.tired = false;
    }

    /* footsteps */
    if (p.moving && ++p.stepT >= 12) {
      p.stepT = 0;
      if (p.run) AP.noise(S, p.x, p.y, C.NOISE.run, false);
      else if (!p.crawl) AP.noise(S, p.x, p.y, C.NOISE.walk, false);
      S.ev.push({ t: "step", run: p.run, crawl: p.crawl, water: tile === T.WATER });
    }

    /* the ground underfoot */
    const tx = Math.floor(p.x), ty = Math.floor(p.y), now = AP.tileAt(S.map, tx, ty);
    if (now === T.MINE) { S.ev.push({ t: "mine" }); AP.explode(S, tx + 0.5, ty + 0.5, 1.2, "mine", "x"); }
    if (now === T.THIN) {
      p.iceT++;
      if (p.run || p.iceT > C.THIN_T) {
        S.map.tiles[ty * S.map.w + tx] = T.WATER; S.map.ver++;
        S.ev.push({ t: "ice", x: tx + 0.5, y: ty + 0.5 });
        AP.hurtPlayer(S, 1, "ice", false);
      }
    } else p.iceT = 0;
    for (const o of S.map.objs) if (o.k === "prox" && !o.dead && !p.crawl && AP.dist(p.x, p.y, o.x + 0.5, o.y + 0.5) < 1.3) AP.destroyObj(S, o, "x");

    /* under water */
    p.sub = p.crawl && now === T.WATER;
    if (p.sub) {
      if (p.breath > 0) p.breath--;
      else if (++p.drownT >= C.DROWN) { p.drownT = 0; AP.hurtPlayer(S, 1, "drowning", false); }
    } else { p.breath = Math.min(C.BREATH, p.breath + 4); p.drownT = 0; }

    if (S.end) return;

    /* first aid: standing still, a hundred ticks */
    if (aidEdge || (fireEdge && p.weapon === "aid")) {
      if (p.wounds > 0 && p.ammo.aid > 0 && !p.aidT) { p.aidT = C.AID_T; S.ev.push({ t: "aid" }); }
      else if (!p.ammo.aid || !p.wounds) S.ev.push({ t: "empty" });
    }
    if (p.aidT > 0) {
      if (p.moving) p.aidT = 0;
      else if (--p.aidT === 0) { p.wounds--; p.ammo.aid--; S.ev.push({ t: "healed" }); }
    }

    if (useEdge) { if (!AP.takePod(S)) AP.interact(S); }
    AP.useWeapon(S, c, fireEdge);
  };

  /* a supply pod underfoot */
  AP.takePod = S => {
    const p = S.player;
    const it = S.items.find(i => i.k === "pod" && !i.taken && AP.dist(i.x, i.y, p.x, p.y) < 0.9);
    if (!it) return false;
    it.taken = true;
    const caps = S.opts.podTake ? C.CAPS : null;
    for (const k of it.contents) {
      if (caps && p.ammo[k] >= caps[k]) continue;
      p.ammo[k]++;
    }
    if (!S.opts.podTake) p.pods++;
    S.ev.push({ t: "pod", contents: it.contents.slice() });
    return true;
  };
})();
