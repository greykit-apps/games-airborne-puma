/* Airborne Puma -- the insertion. DOM-free.
 *
 * The Osprey comes in over the north end, past the objective, and flies south
 * at a steady speed toward the drop zone: the whole area scrolls by once, the
 * only reconnaissance there is. The stick nudges it east or west. Fire kicks
 * out a supply pod -- three of them -- until the jump light goes green; then
 * fire jumps. Under the parafoil the stick steers (turning spills air, so a
 * steered ranger comes down faster) and the shadow shows the height.
 *
 * Pods that land in a ditch, on a rock, a tree, wire or water are lost. A
 * ranger who lands in a trench or on wire is hurt; in a minefield, killed; in
 * the badlands, lost. Miss the drop zone altogether and the mission is off. */
"use strict";
(() => {
  const C = AP.C, T = AP.T;

  AP.dropInit = S => {
    S.drop = { oy: -6, ox: S.map.w / 2 + 0.5, light: false, podsLeft: 3, falling: [], chute: null, pf: false, gone: false };
  };

  AP.dropTick = (S, c) => {
    const d = S.drop, map = S.map, D = C.DROP;
    const fireEdge = c.fire && !d.pf;
    d.pf = c.fire;
    const fast = c.ff && S.opts.ffDrop && !d.chute && d.oy < map.drop.y0 - 6;
    d.oy += D.speed * (fast ? D.ff : 1);
    if (!d.chute) {
      d.ox = AP.clamp(d.ox + (c.mx | 0) * 0.06, 4, map.w - 5);
      const was = d.light;
      d.light = d.oy >= map.drop.y0 && d.oy <= map.drop.y1;
      if (d.light && !was) S.ev.push({ t: "greenlight" });
      if (fireEdge) {
        if (d.light) {
          d.chute = { x: d.ox, y: d.oy, alt: D.chute, vx: 0, vy: D.speed * 0.4 };
          S.ev.push({ t: "jump" });
        } else if (d.podsLeft > 0 && d.oy > 4) {
          d.falling.push({ x: d.ox, y: d.oy, z: 30, vx: (c.mx | 0) * 0.02, i: 3 - d.podsLeft });
          d.podsLeft--;
          S.ev.push({ t: "podDrop" });
        }
      }
      if (d.oy > map.drop.y1 + 0.5) {
        /* missed the light: the Osprey comes round once more, then the mission is off */
        if (!d.again) { d.again = true; d.oy = map.drop.y0 - 24; S.ev.push({ t: "goAround" }); }
        else { S.ev.push({ t: "noJump" }); AP.finish(S, "aborted", "noJump"); S.phase = "over"; return; }
      }
    } else {
      const ch = d.chute, mx = c.mx | 0, my = c.my | 0;
      ch.vx += mx * 0.004; ch.vy += my * 0.004;
      const v = Math.hypot(ch.vx, ch.vy), vmax = 0.07;
      if (v > vmax) { ch.vx *= vmax / v; ch.vy *= vmax / v; }
      ch.vx *= 0.985; ch.vy *= 0.985;
      ch.alt -= D.fall + (mx || my ? D.spill : 0);
      ch.x = AP.clamp(ch.x + ch.vx, 1, map.w - 2);
      ch.y = AP.clamp(ch.y + ch.vy, 1, map.h - 2);
      if (ch.alt <= 0) land(S);
    }
    /* pods on their way down */
    for (const p of d.falling) {
      p.z -= D.pod; p.x += p.vx; p.y += D.speed * 0.4;
      if (p.z > 0) continue;
      p.done = true;
      const tx = Math.floor(p.x), ty = Math.floor(p.y), t = AP.tileAt(map, tx, ty);
      const ok = AP.TILE[t].walk && ![T.TRENCH, T.WIRE, T.MINE, T.WATER, T.THIN, T.BAD, T.PIPE].includes(t) && !AP.objAt(map, tx, ty);
      if (t === T.MINE) AP.explode(S, tx + 0.5, ty + 0.5, 1.2, "mine", "x");
      if (ok) { S.items.push({ id: S.nextId++, k: "pod", x: p.x, y: p.y, contents: S.pods[p.i].slice(), taken: false }); S.ev.push({ t: "podLanded", x: p.x, y: p.y }); }
      else S.ev.push({ t: "podLost", x: p.x, y: p.y });
    }
    d.falling = d.falling.filter(p => !p.done);
  };

  /* the nearest place a ranger can stand */
  AP.nearestStand = (map, x, y) => {
    const tx = Math.floor(x), ty = Math.floor(y);
    for (let r = 0; r < 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const nx = tx + dx, ny = ty + dy;
      if (AP.passable(map, nx, ny, "p") && AP.tileAt(map, nx, ny) !== T.MINE) return [nx + 0.5, ny + 0.5];
    }
    return [x, y];
  };

  function land(S) {
    const d = S.drop, ch = d.chute, p = S.player, map = S.map;
    const tx = Math.floor(ch.x), ty = Math.floor(ch.y), t = AP.tileAt(map, tx, ty);
    p.x = ch.x; p.y = ch.y;
    d.chute = null; d.landed = true;
    S.phase = "foot"; S.landT = S.t;
    S.ev.push({ t: "landed", tile: t });
    if (t === T.BAD) { S.ev.push({ t: "badlands" }); AP.finish(S, "captured", "badlands"); return; }
    if (t === T.MINE) { AP.explode(S, tx + 0.5, ty + 0.5, 1.2, "mine", "x"); AP.hurtPlayer(S, 3, "mine", false); return; }
    const solid = !AP.passable(map, tx, ty, "p");
    if (solid) { [p.x, p.y] = AP.nearestStand(map, ch.x, ch.y); }
    if (t === T.TRENCH || t === T.WIRE || solid) AP.hurtPlayer(S, 1, "landing", false);
  }
  /* tests and the debug route put the ranger down in the middle of the drop zone */
  AP.skipDrop = S => {
    const map = S.map;
    S.drop.chute = { x: map.w / 2 + 0.5, y: map.h - 19.5, alt: 0, vx: 0, vy: 0 };
    S.drop.oy = map.h;
    land(S);
    S.drop.chute = null;
    void C;
  };
})();
