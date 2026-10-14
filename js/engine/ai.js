/* Airborne Puma -- the enemy. DOM-free.
 *
 * Soldiers patrol their routes or stand their posts. A noise sends them to
 * look; a sighting sends them after you; on full alert the nearest few close
 * in on where you were last seen and the rest stand ready. They lie down to
 * shoot at range, lob grenades at a ranger in cover (not on the easiest
 * setting), and keep off their own minefields. Officers run for the alarm.
 *
 * Machine-gun nests and bunkers cover an arc; turrets turn. Automated
 * mini-bunkers fire at anything that moves upright, their own side included.
 * Minitanks patrol, follow you into trenches, and fire rockets.
 *
 * Soldiers think every eighth tick, staggered; they move every tick. Pursuit
 * follows one shared flow field toward the target, so no soldier searches a
 * path of his own. */
"use strict";
(() => {
  const C = AP.C, T = AP.T;
  const E_WALK = 0.032, E_RUN = 0.05;

  AP.newEnemy = (S, s) => {
    const kd = AP.KINDS[s.k];
    const e = { id: S.nextId++, k: s.k, x: s.x, y: s.y, f: s.f ?? 8, st: kd.friend ? "wait" : s.route ? "patrol" : "post", t: 0,
      hp: kd.hp || 1, home: { x: s.x, y: s.y, f: s.f ?? 8 }, route: s.route || null, ri: 0, known: null, see: 0, seeing: false,
      lastSeen: -999, cool: 0, burst: 0, gren: kd.gren ? 1 : 0, prone: !!kd.prone, dead: false, friend: !!kd.friend, stuck: 0,
      wounded: false, aboard: false, away: 0 };
    S.en.push(e);
    return e;
  };

  /* ---- the flow field: steps toward a tile, shared by every pursuer ---- */
  const N8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  function field(map, tx, ty) {
    const W = map.w, Hh = map.h, f = new Uint16Array(W * Hh).fill(65535), q = [ty * W + tx];
    f[q[0]] = 0;
    for (let i = 0; i < q.length; i++) {
      const x = q[i] % W, y = (q[i] / W) | 0, d = f[q[i]] + 1;
      for (const [dx, dy] of N8) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= Hh || f[ny * W + nx] !== 65535) continue;
        if (!AP.passable(map, nx, ny, "e")) continue;
        if (dx && dy && (!AP.passable(map, x + dx, y, "e") || !AP.passable(map, x, y + dy, "e"))) continue;
        f[ny * W + nx] = d; q.push(ny * W + nx);
      }
    }
    return f;
  }
  AP.flowStep = (S, e, tx, ty) => {
    const map = S.map, c = AP.mapCache(map), W = map.w;
    tx = AP.clamp(Math.floor(tx), 0, W - 1); ty = AP.clamp(Math.floor(ty), 0, map.h - 1);
    const key = ty * W + tx;
    let f = c.ff.get(key);
    if (!f) { if (c.ff.size > 8) c.ff.clear(); f = field(map, tx, ty); c.ff.set(key, f); }
    const ex = Math.floor(e.x), ey = Math.floor(e.y);
    let best = f[ey * W + ex], bx = -1, by = -1;
    for (const [dx, dy] of N8) {
      const nx = ex + dx, ny = ey + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= map.h) continue;
      if (dx && dy && (!AP.passable(map, ex + dx, ey, "e") || !AP.passable(map, ex, ey + dy, "e"))) continue;
      if (f[ny * W + nx] < best) { best = f[ny * W + nx]; bx = nx; by = ny; }
    }
    return bx < 0 ? null : [bx + 0.5, by + 0.5];
  };

  /* walk straight at a point; true on arrival */
  function stepTo(S, e, tx, ty, sp) {
    const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
    if (d < 0.15) return true;
    const k = Math.min(sp, d) / d;
    const moved = AP.moveBody(S, e, dx * k, dy * k, "e");
    e.f = AP.dirTo(dx, dy);
    e.stuck = moved < sp * 0.3 ? e.stuck + 1 : 0;
    return d < 0.3;
  }
  /* get to a point, round whatever is in the way */
  function goTo(S, e, tx, ty, sp) {
    const d = AP.dist(e.x, e.y, tx, ty);
    if (d < 2.5 || (e.stuck < 20 && AP.los(S.map, e.x, e.y, tx, ty, true))) {
      const arrived = stepTo(S, e, tx, ty, sp);
      if (e.stuck < 30) return arrived;
    }
    const n = AP.flowStep(S, e, tx, ty);
    if (!n) return d < 0.6;
    stepTo(S, e, n[0], n[1], sp);
    return false;
  }
  const inTrench = (S, e) => AP.TILE[AP.tileUnder(S, e)].trench;

  /* one person, for the test bot's empty field: friends and the officer only */
  AP.aiOne = (S, e) => { if (e.dead || e.aboard) return; if (e.friend || e.st === "follow") friend(S, e); else soldier(S, e); };

  AP.aiTick = S => {
    for (const e of S.en) {
      if (e.dead || e.aboard) continue;
      if (e.friend || e.st === "follow") friend(S, e);
      else if (e.k === "tank") tank(S, e);
      else soldier(S, e);
    }
    for (const o of S.map.objs) if (!o.dead && AP.OBJ[o.k].gun) gun(S, o);
    if (S.en.length > 160) S.en = S.en.filter(e => !e.dead || S.t - e.deadT < 400);
  };

  /* ---- soldiers ---- */
  function look(S, e, kd) {
    const wide = e.st === "alert" || e.st === "pursue" || e.st === "investigate";
    const vis = AP.seesPlayer(S, e.x, e.y, e.f, wide ? 16 : C.FOV, kd.sight * (e.st === "alert" ? 1.2 : 1), inTrench(S, e));
    if (vis > 0) {
      e.see = Math.min(1, e.see + 0.1 + vis * 0.4);
      if (e.see < 1) { e.f = AP.turnToward(e.f, AP.dirTo(S.player.x - e.x, S.player.y - e.y)); return false; }
      return true;
    }
    e.see = Math.max(0, e.see - 0.1);
    return false;
  }
  function spotted(S, e) {
    const p = S.player;
    e.known = { x: p.x, y: p.y }; e.lastSeen = S.t;
    if (e.st !== "pursue" && e.st !== "flee") { e.st = "pursue"; e.t = 0; e.cool = Math.max(e.cool, C.REACT + Math.floor(AP.rand(S) * C.REACT)); S.ev.push({ t: "spotted", x: e.x, y: e.y }); }
    AP.raiseAlert(S, 1, p.x, p.y);
  }

  function soldier(S, e) {
    const kd = AP.KINDS[e.k], p = S.player;
    if (e.cool > 0) e.cool--;
    e.t++;
    if ((S.t + e.id) % 8 === 0) {
      e.seeing = look(S, e, kd);
      if (e.seeing) {
        if (e.k === "officer") officerSees(S, e);
        else spotted(S, e);
      }
    }
    if (e.seeing) S.alert.seenT = S.t;
    const d = AP.dist(e.x, e.y, p.x, p.y);
    switch (e.st) {
      case "patrol": {
        if (!e.route) { e.st = "post"; break; }
        const [tx, ty] = e.route[e.ri];
        if (stepTo(S, e, tx, ty, E_WALK) || e.stuck > 60) { e.ri = (e.ri + 1) % e.route.length; e.stuck = 0; }
        break;
      }
      case "post":
        if (AP.dist(e.x, e.y, e.home.x, e.home.y) > 0.4) { goTo(S, e, e.home.x, e.home.y, E_WALK); break; }
        if (e.t % 300 === 0) e.f = (e.home.f + [0, 4, 28, 0][Math.floor(AP.rand(S) * 4)]) % 32;
        break;
      case "investigate": {
        if (!e.known) { e.st = "return"; break; }
        if (AP.dist(e.x, e.y, e.known.x, e.known.y) > 0.8 && e.t < 900) { goTo(S, e, e.known.x, e.known.y, E_WALK * 1.4); e.arr = e.t; }
        else {
          if (e.t % 40 === 0) e.f = (e.f + 8) % 32;
          if (e.t - (e.arr || 0) > 200) { e.st = S.alert.lv === 2 ? "alert" : "return"; e.t = 0; }
        }
        break;
      }
      case "return":
        if (goTo(S, e, e.home.x, e.home.y, E_WALK) || e.t > 1500) { e.st = e.route ? "patrol" : "post"; e.f = e.home.f; e.t = 0; }
        break;
      case "alert":
        if (e.t % 60 === 0 && S.alert.last) e.f = AP.dirTo(S.alert.last.x - e.x, S.alert.last.y - e.y);
        if (S.alert.lv < 2 && e.t > 200) { e.st = "return"; e.t = 0; }
        break;
      case "flee": {
        const box = S.map.objs.find(o => o.k === "alarm");
        if (!box) { e.st = "post"; break; }
        if (goTo(S, e, box.x + 0.5, box.y + 1.5, E_RUN)) { AP.raiseAlert(S, 2, e.x, e.y); S.ev.push({ t: "alarm" }); e.st = "post"; e.home = { x: e.x, y: e.y, f: 8 }; }
        if (e.k === "officer" && d < 1.3 && AP.canCapture(S)) AP.capture(S, e);
        break;
      }
      case "pursue": {
        if (e.seeing && d <= kd.range) {
          e.f = AP.dirTo(p.x - e.x, p.y - e.y);
          if (!e.prone && d > 4 && (e.k === "rifle" || e.k === "elite") && AP.rand(S) < 0.02) e.prone = true;
          fire(S, e, kd, d);
        } else {
          if (!kd.prone) e.prone = false;
          const tgt = e.seeing ? p : S.alert.lv > 0 && S.alert.last ? S.alert.last : e.known;
          if (tgt) goTo(S, e, tgt.x, tgt.y, S.alert.lv === 2 ? E_RUN : E_WALK * 1.5);
          if (!e.seeing && S.t - e.lastSeen > 600 && e.t > 600) { e.st = "investigate"; e.t = 0; e.known = e.known || S.alert.last; }
        }
        break;
      }
    }
    /* the enemy walks on thin ice like anyone else, and runs onto it in a chase */
    const tx = Math.floor(e.x), ty = Math.floor(e.y);
    if (AP.tileAt(S.map, tx, ty) === T.THIN && (e.st === "pursue" || AP.rand(S) < 0.004)) {
      S.map.tiles[ty * S.map.w + tx] = T.WATER; S.map.ver++;
      S.ev.push({ t: "ice", x: tx + 0.5, y: ty + 0.5 });
      AP.hurtEnemy(S, e, 9, "x", "ice");
    }
  }

  /* fire, in bursts; grenades at a ranger in cover */
  function fire(S, e, kd, d) {
    if (e.cool > 0) return;
    const p = S.player, pt = AP.TILE[AP.tileUnder(S, p)];
    if (kd.gren && e.gren > 0 && C.DIFF.gren[S.diff] && d >= 4 && d <= 8 && (pt.trench || pt.cover || p.crawl) && AP.rand(S) < 0.25) {
      e.gren--;
      AP.throwGren(S, e.x, e.y, p.x + (AP.rand(S) - 0.5) * 2, p.y + (AP.rand(S) - 0.5) * 2, "e");
      e.cool = 120; return;
    }
    if (kd.flame) {
      S.fx.push({ k: "flame", x0: e.x, y0: e.y, x1: p.x, y1: p.y, t: 12 });
      S.ev.push({ t: "flame", x: e.x, y: e.y });
      if (AP.rand(S) < kd.acc) AP.hurtPlayer(S, 2, "flame", false);
      e.cool = kd.rate; AP.noise(S, e.x, e.y, 8, true); return;
    }
    if (kd.rocket) {
      const a = Math.atan2(p.y - e.y, p.x - e.x) + (AP.rand(S) - 0.5) * 0.15;
      AP.fireRocket(S, e.x, e.y, Math.cos(a), Math.sin(a), "e", kd.range + 4);
      e.cool = kd.rate; AP.noise(S, e.x, e.y, C.NOISE.carbine, true); return;
    }
    if (e.burst <= 0) { e.burst = kd.burst; AP.noise(S, e.x, e.y, C.NOISE.carbine, true); }
    shootAt(S, e.x, e.y, kd.acc, kd.range, d, e.prone, e.k);
    e.burst--;
    e.cool = e.burst > 0 ? 6 : kd.rate + Math.floor(AP.rand(S) * 30);
  }
  /* one round at the ranger from (x, y): the hit is rolled, the tracer drawn */
  function shootAt(S, x, y, acc, range, d, prone, cause = "rifle") {
    const p = S.player, pt = AP.TILE[AP.tileUnder(S, p)];
    let hit = acc * C.DIFF.acc[S.diff] * (1 - Math.min(0.75, d / range * 0.6));
    hit *= p.crawl ? 0.45 : p.run ? 0.7 : p.moving ? 0.85 : 1;
    if (pt.trench) hit *= 0.35;
    else if (pt.cover && p.crawl) hit *= 0.5;
    if (prone) hit *= 1.15;
    const ok = AP.rand(S) < hit;
    const mx = ok ? 0 : (AP.rand(S) - 0.5) * 2, my = ok ? 0 : (AP.rand(S) - 0.5) * 2;
    S.fx.push({ k: "tracer", x0: x, y0: y, x1: p.x + mx, y1: p.y + my, t: 3, e: true });
    S.ev.push({ t: "shot", by: "e", x, y });
    if (ok) AP.hurtPlayer(S, 1, cause, true);
    else {
      /* a miss can find someone following him */
      const f = S.en.find(o => o.st === "follow" && !o.dead && AP.dist(o.x, o.y, p.x + mx, p.y + my) < 0.8);
      if (f && AP.rand(S) < 0.3) AP.hurtEnemy(S, f, 1, "e", "carbine");
    }
  }

  /* ---- the officer ---- */
  AP.canCapture = S => { const p = S.player; return !p.dead && (p.weapon === "carbine" || p.weapon === "law") && !p.kd; };
  AP.capture = (S, e) => {
    e.st = "follow"; e.t = 0; e.away = 0;
    S.ev.push({ t: "surrender", x: e.x, y: e.y });
    AP.objHook(S, "capture", e);
  };
  function officerSees(S, e) {
    const p = S.player, d = AP.dist(e.x, e.y, p.x, p.y);
    if (d < 1.3 && AP.canCapture(S)) { AP.capture(S, e); return; }
    if (d > 3 && e.st !== "flee") { e.st = "flee"; e.t = 0; S.ev.push({ t: "flee", x: e.x, y: e.y }); }
  }

  /* ---- hostages, prisoners, and an officer in hand ---- */
  function friend(S, e) {
    if (e.st !== "follow") {
      if (e.k === "officer") soldier(S, e);
      return;
    }
    const p = S.player;
    if (p.aboard || p.dead) return;
    const d = AP.dist(e.x, e.y, p.x, p.y);
    if (d > 1.6) goTo(S, e, p.x, p.y, E_RUN * 0.95);
    else e.f = AP.dirTo(p.x - e.x, p.y - e.y);
    /* left alone, an officer makes a break for it */
    if (e.k === "officer") {
      e.away = d > 6 ? e.away + 1 : 0;
      if (e.away > 150) { e.st = "flee"; e.t = 0; S.ev.push({ t: "flee", x: e.x, y: e.y }); }
    }
  }

  /* ---- minitanks ---- */
  function tank(S, e) {
    const kd = AP.KINDS.tank, p = S.player;
    if (e.cool > 0) e.cool--;
    e.t++;
    if ((S.t + e.id) % 8 === 0) {
      e.seeing = look(S, e, kd);
      if (e.seeing) spotted(S, e);
    }
    if (e.seeing) S.alert.seenT = S.t;
    const d = AP.dist(e.x, e.y, p.x, p.y);
    if (e.st === "pursue") {
      if (e.seeing && d <= kd.range && e.cool <= 0) {
        const a = Math.atan2(p.y - e.y, p.x - e.x);
        AP.fireRocket(S, e.x, e.y, Math.cos(a), Math.sin(a), "e", kd.range + 4);
        e.cool = kd.rate; AP.noise(S, e.x, e.y, C.NOISE.carbine, true);
      }
      goTo(S, e, (e.seeing ? p : e.known || p).x, (e.seeing ? p : e.known || p).y, 0.045);
      if (!e.seeing && S.t - e.lastSeen > 800) { e.st = e.route ? "patrol" : "post"; e.t = 0; }
    } else if (e.route) {
      const [tx, ty] = e.route[e.ri];
      if (stepTo(S, e, tx, ty, 0.03) || e.stuck > 60) { e.ri = (e.ri + 1) % e.route.length; e.stuck = 0; }
    } else if (e.st === "investigate" && e.known) {
      if (goTo(S, e, e.known.x, e.known.y, 0.035)) e.st = "post";
    }
    if (d < 0.75 && !p.dead && !p.aboard) AP.hurtPlayer(S, 3, "tank", false);
  }

  /* ---- guns in the ground ---- */
  function gun(S, o) {
    const g = AP.OBJ[o.k].gun, p = S.player, cx = o.x + o.w / 2, cy = o.y + o.h / 2;
    if (o.f === undefined) { o.f = 8; o.cool = 0; o.burst = 0; o.see = 0; }
    if (o.cool > 0) o.cool--;
    if ((S.t + o.id * 3) % 8 === 0) {
      o.tgt = null;
      if (g.motion) {
        /* anything moving upright, the ranger first */
        if (!p.dead && !p.aboard && S.phase === "foot" && p.moving && !p.crawl && !p.sub && AP.dist(cx, cy, p.x, p.y) <= g.range && AP.los(S.map, cx, cy, p.x, p.y, false, o)) o.tgt = "p";
        else {
          const e = S.en.find(e => !e.dead && !e.aboard && e.k !== "tank" && e.st !== "post" && e.st !== "wait" && e.st !== "alert" && !e.prone && AP.dist(cx, cy, e.x, e.y) <= g.range && AP.los(S.map, cx, cy, e.x, e.y, false, o));
          if (e) o.tgt = e.id;
        }
      } else {
        const vis = AP.seesPlayer(S, cx, cy, o.f, S.alert.lv === 2 ? 16 : g.arc, g.range, false, o);
        o.see = vis > 0 ? Math.min(1, o.see + 0.2 + vis * 0.4) : Math.max(0, o.see - 0.1);
        if (o.see >= 1) { if (!o.had) { o.had = true; o.cool = Math.max(o.cool, C.REACT); } o.tgt = "p"; S.alert.seenT = S.t; AP.raiseAlert(S, 1, p.x, p.y); }
        else {
          o.had = false;
          if (g.turn && S.alert.last && S.alert.lv) o.f = AP.turnToward(o.f, AP.dirTo(S.alert.last.x - cx, S.alert.last.y - cy));
        }
      }
    }
    if (o.tgt === "p") S.alert.seenT = S.t;
    if (!o.tgt || o.cool > 0) return;
    if (o.tgt === "p") {
      const d = AP.dist(cx, cy, p.x, p.y);
      if (g.turn) o.f = AP.dirTo(p.x - cx, p.y - cy);
      if (o.burst <= 0) { o.burst = g.burst; AP.noise(S, cx, cy, C.NOISE.carbine, true); }
      shootAt(S, cx, cy, g.acc, g.range, d, false, o.k);
    } else {
      const e = S.en.find(e => e.id === o.tgt);
      if (e && !e.dead) {
        S.fx.push({ k: "tracer", x0: cx, y0: cy, x1: e.x, y1: e.y, t: 3, e: true });
        S.ev.push({ t: "shot", by: "e", x: cx, y: cy });
        if (o.burst <= 0) o.burst = g.burst;
        if (AP.rand(S) < 0.5) AP.hurtEnemy(S, e, 1, "x", "carbine");
      }
    }
    o.burst--;
    o.cool = o.burst > 0 ? 6 : g.rate;
  }
})();
