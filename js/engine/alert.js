/* Airborne Puma -- seeing, hearing and the alarm. DOM-free.
 *
 * Two levels of trouble, as the 1987 briefings put it: being *seen* brings the
 * soldiers nearby after you; *full alert* -- a shot or an explosion anyone
 * hears, an alarm raised, too long in someone's sights -- brings the whole
 * area, and reinforcements. Without contact the alarm stands down a level at
 * a time. A knife makes no noise. Snow muffles everything. */
"use strict";
(() => {
  const C = AP.C, T = AP.T;

  /* Is the line between two points clear? lowBlocks: walls, boulders and
   * pipes hide what is behind them (a crawling ranger). */
  AP.los = (map, x0, y0, x1, y1, lowBlocks, self) => {
    const dx = x1 - x0, dy = y1 - y0, n = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) * 2);
    const ex = Math.floor(x1), ey = Math.floor(y1);
    for (let i = 1; i < n; i++) {
      const x = x0 + dx * i / n, y = y0 + dy * i / n, tx = Math.floor(x), ty = Math.floor(y);
      if (tx === ex && ty === ey) continue;
      const td = AP.TILE[AP.tileAt(map, tx, ty)];
      if (td.los) return false;
      if (lowBlocks && td.low && (Math.abs(x - x0) > 1.2 || Math.abs(y - y0) > 1.2)) return false;
      const o = AP.objAt(map, tx, ty);
      if (o && o !== self && AP.OBJ[o.k].los) return false;
    }
    return true;
  };

  /* How clearly someone at (vx, vy), facing vf, sees the ranger: 0 not at
   * all, up to 1 point blank. fov is a half-angle in 32nds (16 is all round). */
  AP.seesPlayer = (S, vx, vy, vf, fov, sight, vTrench, self) => {
    const p = S.player;
    if (p.dead || p.aboard || S.phase !== "foot" || p.sub) return 0;
    const d = AP.dist(vx, vy, p.x, p.y), pt = AP.TILE[AP.tileUnder(S, p)];
    if (pt.trench && !vTrench && d > 1.5) return 0;
    if (p.crawl && pt.cover && d > 2.5) return 0;
    const range = sight * (p.crawl ? 0.55 : p.run ? 1.2 : 1);
    if (d > range) return 0;
    if (fov < 16 && d > 1.5 && AP.dirDiff(vf, AP.dirTo(p.x - vx, p.y - vy)) > fov) return 0;
    if (!AP.los(S.map, vx, vy, p.x, p.y, p.crawl, self)) return 0;
    /* in their uniform, at a walk, a ranger is one of them -- until he is close */
    if (p.disguised && d > 1.2 && !p.run && !p.crawl) return 0;
    return 1 - d / range * 0.7;
  };

  /* A noise at (x, y) heard r tiles off. loud: a shot or an explosion, which
   * puts the area on full alert if anyone hears it. */
  AP.noise = (S, x, y, r, loud) => {
    if (S.zone === "arctic") r *= C.NOISE.arctic;
    let heard = false;
    for (const e of S.en) {
      if (e.dead || e.friend || e.st === "follow" || e.st === "flee") continue;
      if (AP.dist(e.x, e.y, x, y) > r) continue;
      heard = true;
      if (e.st === "patrol" || e.st === "post" || e.st === "return" || e.st === "investigate" || e.st === "alert") {
        e.st = "investigate"; e.known = { x, y }; e.t = 0;
      }
    }
    if (heard && loud) AP.raiseAlert(S, 2, x, y);
    return heard;
  };

  AP.raiseAlert = (S, lv, x, y) => {
    const a = S.alert;
    a.last = { x, y }; a.quiet = 0;
    if (lv <= a.lv) { if (lv === 2) wake(S, x, y); return; }
    a.lv = lv;
    S.ev.push({ t: "alert", lv });
    if (lv === 2) { if (a.fullAt < 0) a.fullAt = S.t; a.reinfT = S.t + C.DIFF.reinf[S.diff] * C.HZ; }
    wake(S, x, y);
    AP.objHook(S, "alert", lv);
  };
  /* who comes running: everyone near at a sighting, the nearest few on full alert */
  function wake(S, x, y) {
    const near = S.en.filter(e => !e.dead && !e.friend && e.k !== "officer" && e.st !== "follow" && !AP.KINDS[e.k].post)
      .map(e => [e, AP.dist(e.x, e.y, x, y)]).sort((a, b) => a[1] - b[1] || a[0].id - b[0].id);
    let n = 0;
    for (const [e, d] of near) {
      if (S.alert.lv < 2 && d > 12) break;
      if (n < C.PURSUERS) { if (e.st !== "pursue") { e.st = "pursue"; e.t = 0; } e.known = { x, y }; n++; }
      else if (e.st === "patrol" || e.st === "post") e.st = "alert";
    }
    for (const e of S.en) if (!e.dead && !e.friend && AP.KINDS[e.k].post && e.st === "post" && S.alert.lv === 2) e.st = "alert";
  }

  AP.alertTick = S => {
    const a = S.alert;
    if (a.seenT === S.t) {
      a.quiet = 0;
      if (++a.seenRun >= C.SEEN_FULL) AP.raiseAlert(S, 2, S.player.x, S.player.y);
    } else { a.seenRun = Math.max(0, a.seenRun - 2); a.quiet++; }
    if (a.lv === 2 && a.quiet > C.QUIET2 && !(AP.objNoDecay && AP.objNoDecay(S))) { a.lv = 1; a.quiet = 0; S.ev.push({ t: "alert", lv: 1 }); }
    else if (a.lv === 1 && a.quiet > C.QUIET1) {
      a.lv = 0; S.ev.push({ t: "alert", lv: 0 });
      for (const e of S.en) if (!e.dead && (e.st === "pursue" || e.st === "alert")) { e.st = "investigate"; e.t = 0; }
    }
    /* reinforcements, on full alert */
    const every = C.DIFF.reinf[S.diff];
    if (a.lv === 2 && every && S.t >= a.reinfT && !S.end) {
      a.reinfT = S.t + every * C.HZ;
      const alive = S.en.filter(e => e.reinf && !e.dead).length;
      if (alive < C.REINF_MAX) reinforce(S);
    }
  };
  function reinforce(S) {
    const p = S.player, map = S.map;
    for (let tries = 0; tries < 30; tries++) {
      const x = 4 + Math.floor(AP.rand(S) * (map.w - 8)) + 0.5, y = AP.clamp(p.y - 14 - Math.floor(AP.rand(S) * 8), 4, map.h - 5) + 0.5;
      if (!AP.passable(map, Math.floor(x), Math.floor(y), "e")) continue;
      if (AP.los(map, x, y, p.x, p.y, false) && AP.dist(x, y, p.x, p.y) < 12) continue;
      const e = AP.newEnemy(S, { k: "rifle", x, y, f: 8 });
      e.reinf = true; e.st = "pursue"; e.known = { x: p.x, y: p.y };
      S.ev.push({ t: "reinforce" });
      return;
    }
  }
  void T;
})();
