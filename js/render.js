/* Airborne Puma -- the play screen: 480 by 300, scaled up square-pixelled
 * to fit the window, in the 1987 game's tilted overhead view.
 *
 * On foot the ground scrolls in every direction with the ranger. The ground
 * goes down first (js/ground.js paints each tile, knowing which neighbours
 * are the same), then every shadow at once, multiplied in the zone's shadow
 * colour, then everything standing up -- walls, wire, trees, buildings,
 * installations, pods, people -- back to front by where it meets the ground,
 * then what is in the air (grenades, rockets, the Osprey, smoke), then the
 * crosshair. The fly-over shows the whole width of the strip at half scale;
 * under the parafoil the view drops to full scale over the shadow. */
"use strict";
(() => {
  const K = AP.K, TS = K.TS, VW = K.VW, VH = K.VH;
  const R = AP.Render = { cv: null, g: null, cam: { x: 0, y: 0 }, small: null, frame: 0,
    /* Drawing between steps. The game steps fifty times a second; a screen
     * draws sixty or more. Every moving thing is drawn part of the way from
     * where it was at the last step to where it is now (alpha), so motion is
     * even on any display instead of stepping on five frames in six. */
    alpha: 1, prevP: null, prevE: new Map(), prevD: null, look: { x: 0, y: 0 }, pf: null };
  R.remember = S => {
    R.prevP = [S.player.x, S.player.y];
    R.prevE.clear();
    for (const e of S.en) R.prevE.set(e.id, [e.x, e.y]);
    const d = S.drop;
    R.prevD = d ? [d.ox, d.oy, d.chute ? d.chute.x : null, d.chute ? d.chute.y : null] : null;
  };
  /* where to draw something that was at prev at the last step and is at (x, y) now */
  const ipos = (prev, x, y) => {
    if (!prev || prev[0] == null || Math.abs(prev[0] - x) > 1 || Math.abs(prev[1] - y) > 1) return [x, y];
    return [prev[0] + (x - prev[0]) * R.alpha, prev[1] + (y - prev[1]) * R.alpha];
  };

  /* the shadows of a frame, gathered, then laid on the ground in one pass */
  let shc = null, shg = null;
  R.init = cv => {
    R.cv = cv; R.g = cv.getContext("2d"); R.g.imageSmoothingEnabled = false;
    shc = K.mk(VW, VH); shg = shc.getContext("2d");
  };
  const variant = (x, y) => ((x * 7 + y * 13 + ((x * y) >> 2)) & 3);
  /* which neighbours are the same kind of ground: 1 north, 2 east, 4 south, 8 west */
  const WET = new Set([AP.T.WATER, AP.T.ICE, AP.T.THIN]);
  const kind = id => WET.has(id) ? AP.T.WATER : id;
  function nb(map, x, y) {
    const k = kind(AP.tileAt(map, x, y)), s = (dx, dy) => kind(AP.tileAt(map, x + dx, y + dy)) === k;
    return (s(0, -1) ? 1 : 0) | (s(1, 0) ? 2 : 0) | (s(0, 1) ? 4 : 0) | (s(-1, 0) ? 8 : 0);
  }
  R.nb = nb;
  /* a sprite's anchor: where it meets the ground (people: their feet) */
  const ax = c => c.ax ?? c.width / 2, ay = c => c.ay ?? c.height - 3;

  /* where the camera wants to be: the ranger, a little ahead of his aim */
  function aimCamera(S, snap) {
    const map = S.map, p = S.player;
    let fx, fy;
    if (S.phase === "drop" && S.drop.chute) [fx, fy] = ipos(R.prevD && [R.prevD[2], R.prevD[3]], S.drop.chute.x, S.drop.chute.y);
    else if (p.aboard && S.osprey) { fx = map.pickup.x; fy = map.pickup.y - 2; }
    else {
      [fx, fy] = ipos(R.prevP, p.x, p.y);
      /* lead a little in the direction of travel, eased in and out: never where he aims */
      const vx = R.prevP ? p.x - R.prevP[0] : 0, vy = R.prevP ? p.y - R.prevP[1] : 0;
      R.look.x += (AP.clamp(vx, -0.1, 0.1) * 28 - R.look.x) * 0.025;
      R.look.y += (AP.clamp(vy, -0.1, 0.1) * 22 - R.look.y) * 0.025;
      fx += R.look.x; fy += R.look.y;
    }
    const tx = AP.clamp(fx * TS - VW / 2, 0, map.w * TS - VW), ty = AP.clamp(fy * TS - VH / 2 - 12, 0, map.h * TS - VH);
    const dx = tx - R.cam.x, dy = ty - R.cam.y;
    /* locked on, except after a jump in the target (landing, the ladder), which it eases to */
    if (snap) { R.cam.x = tx; R.cam.y = ty; }
    else { R.cam.x += Math.abs(dx) > 72 ? dx * 0.2 : dx; R.cam.y += Math.abs(dy) > 72 ? dy * 0.2 : dy; }
  }
  R.snap = S => { R.look.x = R.look.y = 0; R.pf = null; R.prevP = null; R.prevE.clear(); R.prevD = null; aimCamera(S, true); };

  /* is the ranger's pose and frame */
  function playerPose(S) {
    const p = S.player;
    if (p.dead) return ["dead", 0];
    if (p.sub) return ["sub", 0];
    if (p.kd > 0 || p.crawl) return ["crawl", p.moving ? ((S.t / 9) | 0) & 3 : 0];
    /* the knife: drawn back, driven home, recovered */
    if (p.stab > 0) { const t = AP.C.STAB - p.stab; return ["stab", t < AP.C.STAB_HIT ? 0 : t < 10 ? 1 : 2]; }
    if (p.moving) return ["walk", (S.t / (p.run ? 4 : 7) | 0) & 3];
    return ["stand", 0];
  }
  /* the buildings that burn on after they are destroyed */
  const SMOKES = new Set(["shack", "magazine", "fuel", "avfuel", "pump", "guardhouse", "bunker", "sam", "plane", "dish", "tent", "turret", "mg", "craft"]);
  const CHEST = 11;                       /* how high a shot flies over the ground, in pixels */

  R.draw = (S, ui) => {
    const g = R.g;
    R.frame++;
    if (S.phase === "drop" && !S.drop.chute && !S.drop.landed) { drawFlyover(S, ui); return; }
    aimCamera(S, false);
    const cx = Math.round(R.cam.x), cy = Math.round(R.cam.y), map = S.map, zone = S.zone;
    /* a new map: the ground painted for the last one can go */
    if (R.mapRef !== map) { R.mapRef = map; if (AP.groundReset) AP.groundReset(); }
    const tx0 = Math.floor(cx / TS), ty0 = Math.floor(cy / TS), tx1 = Math.ceil((cx + VW) / TS), ty1 = Math.ceil((cy + VH) / TS);
    /* the ground */
    for (let ty = ty0; ty < ty1; ty++) for (let tx = tx0; tx < tx1; tx++)
      g.drawImage(AP.tileArt(zone, AP.tileAt(map, tx, ty), variant(tx, ty), nb(map, tx, ty), tx, ty), tx * TS - cx, ty * TS - cy);
    /* everything standing up: [where it meets the ground, canvas, x, y, hidden, who] */
    const list = [];
    for (let ty = ty0 - 1; ty < ty1 + 3; ty++) for (let tx = tx0 - 3; tx < tx1 + 1; tx++) {
      const id = AP.tileAt(map, tx, ty), c = AP.standArt(zone, id, variant(tx, ty), nb(map, tx, ty));
      if (c) list.push([ty + 0.98, c, tx * TS - ax(c) - cx, (ty + 1) * TS - ay(c) - cy]);
    }
    for (const o of map.objs) {
      if (o.hidden || o.flown) continue;
      if ((o.x + o.w + 3) * TS < cx || (o.x - 1) * TS > cx + VW || (o.y + o.h) * TS < cy || (o.y - 3) * TS > cy + VH) continue;
      const c = AP.objArt(o.k, o.dead, zone, o.pulled ? 1 : 0);
      list.push([o.y + o.h - 0.01, c, o.x * TS - (c.ax || 0) - cx, o.y * TS - (c.ay || 0) - cy]);
    }
    for (const it of S.items) if (!it.taken) { const c = AP.podArt(false); list.push([it.y, c, Math.round(it.x * TS - ax(c) - cx), Math.round(it.y * TS - ay(c) - cy)]); }
    for (const b of S.bombs) { const c = AP.miscArt("bomb"); list.push([b.y, c, Math.round(b.x * TS - ax(c) - cx), Math.round(b.y * TS - ay(c) - cy), (R.frame >> 3) & 1 ? 0 : 0]); }
    for (const e of S.en) {
      if (e.aboard) continue;
      if (e.dead && S.t - e.deadT > 500) continue;
      if (e.x * TS < cx - 36 || e.x * TS > cx + VW + 36 || e.y * TS < cy - 12 || e.y * TS > cy + VH + 36) continue;
      const last = R.prevE.get(e.id), moving = !!last && (Math.abs(last[0] - e.x) + Math.abs(last[1] - e.y) > 0.002);
      const [exd, eyd] = ipos(last, e.x, e.y);
      let c;
      if (e.k === "tank") c = AP.tankArt(e.f, moving ? (S.t >> 2) & 1 : 0);
      else {
        const look = e.k === "guard" ? "rifle" : e.k;
        const pose = e.dead ? "dead" : e.prone ? "crawl" : moving ? "walk" : "stand";
        c = AP.personArt(look, e.f, pose, pose === "walk" ? ((S.t / 8 + e.id) | 0) & 3 : 0);
      }
      list.push([eyd + (e.dead ? -0.3 : 0), c, Math.round(exd * TS - ax(c) - cx), Math.round(eyd * TS - ay(c) - cy), 0, e]);
    }
    const p = S.player;
    const [px, py] = ipos(R.prevP, p.x, p.y);
    /* the sprite turns only when the aim has really moved: a hand on the mouse is never quite still */
    if (R.pf == null || AP.dirDiff(p.f, R.pf) >= 2 || (p.f % 4 === 0 && AP.dirDiff(p.f, R.pf) >= 1)) R.pf = p.f;
    if (!p.aboard && S.phase === "foot") {
      const [pose, fr] = playerPose(S);
      if (pose === "sub") list.push([py, null, 0, 0, 0, "bubbles"]);
      else {
        const c = AP.personArt(p.disguised ? "disguise" : "ranger", p.climbing ? 24 : R.pf, pose, fr);
        const lift = p.climbing ? Math.round((AP.C.CLIMB - p.climbing) / AP.C.CLIMB * 36) : 0;
        list.push([py + 0.001, c, Math.round(px * TS - ax(c) - cx), Math.round(py * TS - ay(c) - cy - lift), 0, "p"]);
      }
    }
    list.sort((a, b) => a[0] - b[0]);
    /* the shadows, all at once, in the zone's own shade */
    shg.globalCompositeOperation = "source-over";
    shg.clearRect(0, 0, VW, VH);
    for (const [, c, x, y, hide] of list) if (c && c.sh && !hide) shg.drawImage(c.sh, x + c.shx, y + c.shy);
    shg.globalCompositeOperation = "source-in";
    shg.fillStyle = K.Z[zone].shadow; shg.fillRect(0, 0, VW, VH);
    g.globalCompositeOperation = "multiply"; g.drawImage(shc, 0, 0); g.globalCompositeOperation = "source-over";
    if (ui.aids.aware) cones(g, S, cx, cy);
    for (const [, c, x, y, hide, who] of list) {
      if (who === "bubbles") { if ((R.frame >> 4) & 1) { const bx = Math.round(px * TS - cx), by = Math.round(py * TS - cy); g.fillStyle = "#e6f3f8"; g.fillRect(bx, by - 4, 2, 2); g.fillRect(bx + 3, by - 8, 1, 1); } continue; }
      if (hide) continue;
      g.drawImage(c, x, y);
      if (ui.aids.aware && who && typeof who === "object" && !who.dead && !who.friend && who.st !== "follow") mark(g, who, x + ax(c), y);
    }
    /* the air: smoke over what burns, grenades, rockets, tracers, flame, blasts */
    for (const o of map.objs) if (o.dead && !o.hidden && SMOKES.has(o.k) && (o.x + o.w) * TS > cx && o.x * TS < cx + VW && o.y * TS < cy + VH + 24 && (o.y + o.h) * TS > cy)
      AP.drawSmoke(g, Math.round((o.x + o.w / 2) * TS - cx), Math.round((o.y + o.h * 0.5) * TS - cy), S.t + o.x * 37);
    for (const n of S.nades) {
      const x = n.x * TS - cx, y = n.y * TS - cy, c = AP.miscArt("nade");
      g.fillStyle = "rgba(0,0,0,.3)"; g.fillRect(Math.round(x - 2), Math.round(y), 4, 2);
      g.drawImage(c, Math.round(x - c.width / 2), Math.round(y - c.height - n.z * 22));
    }
    for (const k of S.rockets) {
      const x = k.x * TS - cx, y = k.y * TS - cy - CHEST;
      g.fillStyle = "#5c636e"; g.fillRect(Math.round(x - 3), Math.round(y - 1), 6, 3);
      g.fillStyle = R.frame & 1 ? "#ffd36b" : "#ff9a3c"; g.fillRect(Math.round(x - 2 - k.dx * 6), Math.round(y - k.dy * 6), 3, 2);
    }
    for (const f of S.fx) {
      if (f.k === "tracer") {
        g.strokeStyle = f.e ? AP.FX.tracerE : AP.FX.tracerP; g.lineWidth = 1;
        g.beginPath(); g.moveTo(f.x0 * TS - cx + 0.5, f.y0 * TS - cy - CHEST + 0.5); g.lineTo(f.x1 * TS - cx + 0.5, f.y1 * TS - cy - CHEST + 0.5); g.stroke();
      } else if (f.k === "flame") {
        for (let i = 0; i < 14; i++) { const k = i / 14, x = f.x0 + (f.x1 - f.x0) * k, y = f.y0 + (f.y1 - f.y0) * k, s = 2 + Math.round(k * 3); g.fillStyle = AP.FX.flame[(i + R.frame) % AP.FX.flame.length]; g.fillRect(Math.round(x * TS - cx + Math.sin(i + R.frame) * 2), Math.round(y * TS - cy - CHEST), s, s); }
      } else if (f.k === "boom") AP.drawBoom(g, f.x * TS - cx, f.y * TS - cy, f.r * TS, 1 - f.t / f.T);
    }
    /* the Osprey over the pickup */
    const o = S.osprey;
    if (o && (o.st === "hover" || o.st === "in" || (o.st === "gone" && S.t - (o.re - AP.C.REAGAIN) < 200) || p.aboard)) {
      const pk = map.pickup, gx = Math.round(pk.x * TS - cx), gy = Math.round(pk.y * TS - cy);
      let up = 0;
      if (o.st === "in") up = Math.min(600, o.t * 3);
      if (o.st === "gone" || (p.aboard && S.end)) up = Math.max(0, (S.t - (S.end ? S.end.t : o.re - AP.C.REAGAIN)) * 3);
      const leaving = o.st === "gone" || (p.aboard && S.end);
      const c = AP.ospreyArt(R.frame >> 1 & 7, false, leaving);
      /* its shadow on the ground, and the rotor wash's ring */
      g.globalAlpha = Math.max(0.12, 0.38 - up / 1600); g.fillStyle = "#1d1917"; g.beginPath(); g.ellipse(gx + 10, gy - 4, 34, 9, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
      if (o.st === "hover") { const l = AP.miscArt("ladder"); g.drawImage(l, gx - (l.width >> 1), gy - l.height + 2); }
      g.drawImage(c, gx - ax(c), gy - ay(c) - up);
    }
    /* the parafoil, on the way down */
    if (S.phase === "drop" && S.drop.chute) {
      const ch = S.drop.chute, [chx, chy] = ipos(R.prevD && [R.prevD[2], R.prevD[3]], ch.x, ch.y), x = Math.round(chx * TS - cx), y = Math.round(chy * TS - cy), lift = Math.round(ch.alt * 0.9);
      g.globalAlpha = 0.4; g.fillStyle = "#1d1917"; g.beginPath(); g.ellipse(x + 3, y, 6 + ch.alt / 24, 2.5, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
      const man = AP.personArt("ranger", 8, "stand", 0), can = AP.chuteArt();
      const top = y - ay(man) - lift;
      g.drawImage(man, x - ax(man), top);
      g.drawImage(can, x - (can.width >> 1), top - can.height - 4);
    }
    /* the crosshair */
    if (S.phase === "foot" && !p.dead && !p.aboard && !S.end) {
      const [dx, dy] = AP.DIR32[p.f];
      let d = 4;
      if (p.weapon === "gren") d = AP.C.GREN.min + (AP.C.GREN.max - AP.C.GREN.min) * p.charge / AP.C.GREN.charge;
      const c = AP.miscArt("cross");
      if (p.weapon !== "knife" && p.weapon !== "bomb" && p.weapon !== "aid") g.drawImage(c, Math.round((px + dx * d) * TS - c.width / 2 - cx), Math.round((py + dy * d) * TS - CHEST - c.height / 2 - cy));
    }
  };

  /* What a soldier can see, laid on the ground (a Field aid), once they
   * suspect something (amber) or have seen the ranger (red): their real
   * field of view and sight, fading with distance. A calm patrol shows none,
   * so the field stays readable. */
  const CONE = { susp: [240, 150, 30, 0.42], seen: [228, 70, 40, 0.42] };
  function cones(g, S, cx, cy) {
    for (const e of S.en) {
      if (e.dead || e.friend || e.aboard || e.k === "tank" || e.st === "follow") continue;
      const x = e.x * TS - cx, y = e.y * TS - cy;
      if (x < -120 || x > VW + 120 || y < -120 || y > VH + 120) continue;
      const k = AP.KINDS[e.k] || AP.KINDS.rifle, st = e.st === "pursue" || e.st === "alert" ? "seen" : e.see > 0.05 || e.st === "investigate" ? "susp" : null;
      if (!st) continue;
      const [r, gg, b, a] = CONE[st], len = (k.sight || 7) * (e.st === "alert" ? 1.2 : 1) * TS, half = Math.min(Math.PI, ((k.fov || AP.C.FOV) / 32) * Math.PI * 2);
      const ang = Math.atan2(AP.DIR32[e.f][1], AP.DIR32[e.f][0]);
      const grad = g.createRadialGradient(x, y, 4, x, y, len);
      grad.addColorStop(0, `rgba(${r},${gg},${b},${a})`); grad.addColorStop(1, `rgba(${r},${gg},${b},0)`);
      g.fillStyle = grad; g.beginPath(); g.moveTo(x, y); g.arc(x, y, len, ang - half, ang + half); g.closePath(); g.fill();
      /* its two edges, dashed, so the wedge reads on pale ground too */
      g.strokeStyle = `rgba(${r},${gg},${b},0.75)`; g.lineWidth = 1; g.setLineDash([3, 3]);
      for (const s of [-half, half]) { if (half >= Math.PI) break; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(ang + s) * len * 0.6, y + Math.sin(ang + s) * len * 0.6); g.stroke(); }
      g.setLineDash([]);
    }
  }

  /* ? over a soldier who suspects, ! over one who has seen */
  function mark(g, e, x, top) {
    const ch = e.st === "pursue" || e.st === "alert" ? "!" : e.see > 0.05 || e.st === "investigate" ? "?" : null;
    if (!ch) return;
    const m = AP.markArt(ch);
    g.drawImage(m, Math.round(x - m.width / 2), Math.round(top - m.height - 1));
  }

  /* ---- the fly-over: the strip at half scale, the Osprey heading south ---- */
  const HS = TS / 2;
  function smallMap(S) {
    const map = S.map;
    if (R.small && R.small.map === map && R.small.ver === map.ver) return R.small.c;
    const c = K.mk(map.w * HS, map.h * HS), g = c.getContext("2d");
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) g.drawImage(AP.tileArtSmall(S.zone, AP.tileAt(map, x, y), variant(x, y)), x * HS, y * HS);
    g.imageSmoothingEnabled = true;
    const things = [];
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
      const a = AP.standArt(S.zone, AP.tileAt(map, x, y), variant(x, y), nb(map, x, y));
      if (a) things.push([y + 1, a, x * HS - ax(a) / 2, (y + 1) * HS - ay(a) / 2]);
    }
    for (const o of map.objs) if (!o.hidden) { const a = AP.objArt(o.k, o.dead, S.zone); things.push([o.y + o.h, a, o.x * HS - (a.ax || 0) / 2, o.y * HS - (a.ay || 0) / 2]); }
    things.sort((a, b) => a[0] - b[0]);
    for (const [, a, x, y] of things) g.drawImage(a, x, y, a.width / 2, a.height / 2);
    R.small = { map, ver: map.ver, c };
    return c;
  }
  R.smallMap = smallMap;
  /* rows y0..y0+rows of a map, px pixels a tile: the reconnaissance photo and the mission cards */
  R.thumb = (map, zone, y0, rows, px) => {
    const c = K.mk(map.w * px, rows * px), g = c.getContext("2d"), k = px / TS;
    g.imageSmoothingEnabled = k < 1;
    for (let y = 0; y < rows; y++) for (let x = 0; x < map.w; x++) g.drawImage(AP.tileArt(zone, AP.tileAt(map, x, y0 + y), variant(x, y0 + y), nb(map, x, y0 + y), x, y0 + y), x * px, y * px, px, px);
    const things = [];
    for (let y = 0; y < rows + 2; y++) for (let x = 0; x < map.w; x++) {
      const a = AP.standArt(zone, AP.tileAt(map, x, y0 + y), variant(x, y0 + y), nb(map, x, y0 + y));
      if (a) things.push([y + 1, a, x * px - ax(a) * k, (y + 1) * px - ay(a) * k]);
    }
    for (const o of map.objs) {
      if (o.hidden || o.y + o.h < y0 || o.y > y0 + rows) continue;
      const a = AP.objArt(o.k, false, zone);
      things.push([o.y - y0 + o.h, a, o.x * px - (a.ax || 0) * k, (o.y - y0) * px - (a.ay || 0) * k]);
    }
    things.sort((a, b) => a[0] - b[0]);
    /* the shadows first, in one pass, as on the play screen */
    const sc = K.mk(c.width, c.height), sg = sc.getContext("2d");
    sg.imageSmoothingEnabled = k < 1;
    for (const [, a, x, y] of things) if (a.sh) sg.drawImage(a.sh, x + a.shx * k, y + a.shy * k, a.sh.width * k, a.sh.height * k);
    sg.globalCompositeOperation = "source-in"; sg.fillStyle = K.Z[zone].shadow; sg.fillRect(0, 0, sc.width, sc.height);
    g.globalCompositeOperation = "multiply"; g.drawImage(sc, 0, 0); g.globalCompositeOperation = "source-over";
    for (const [, a, x, y] of things) g.drawImage(a, x, y, a.width * k, a.height * k);
    return c;
  };
  function drawFlyover(S, ui) {
    const g = R.g, d = S.drop, map = S.map, sm = smallMap(S);
    const [dox, doy] = ipos(R.prevD, d.ox, d.oy);
    const cy = Math.round(AP.clamp(doy * HS - 90, 0, map.h * HS - VH));
    R.cam.x = AP.clamp(d.ox * TS - VW / 2, 0, map.w * TS - VW); R.cam.y = AP.clamp(d.oy * TS - VH / 2, 0, map.h * TS - VH);
    g.fillStyle = "#14161c"; g.fillRect(0, 0, VW, VH);
    g.drawImage(sm, 0, Math.round(cy), VW, VH, 0, 0, VW, VH);
    if (ui.aids.drop) {
      const z = map.drop;
      g.strokeStyle = d.light ? K.UI.green : K.UI.amber; g.lineWidth = 1; g.setLineDash([4, 3]); g.strokeRect(z.x0 * HS + 0.5, z.y0 * HS - cy + 0.5, (z.x1 - z.x0) * HS, (z.y1 - z.y0) * HS); g.setLineDash([]);
      if (!d.light && d.podsLeft) {
        const steps = 30 / AP.C.DROP.pod, ly0 = d.oy + steps * AP.C.DROP.speed * 0.4, lx = d.ox * HS, ly = ly0 * HS - cy;
        const t = AP.tileAt(map, Math.floor(d.ox), Math.floor(ly0));
        const bad = !AP.TILE[t].walk || [AP.T.TRENCH, AP.T.WIRE, AP.T.MINE, AP.T.WATER, AP.T.THIN, AP.T.PIPE].includes(t) || AP.objAt(map, Math.floor(d.ox), Math.floor(ly0));
        g.fillStyle = "rgba(20,22,28,.8)"; g.fillRect(lx - 6, ly - 1, 13, 3); g.fillRect(lx - 1, ly - 6, 3, 13);
        g.fillStyle = bad ? K.UI.red : K.UI.green; g.fillRect(lx - 5, ly, 11, 1); g.fillRect(lx, ly - 5, 1, 11);
      }
    }
    for (const it of S.items) if (!it.taken) { const c = AP.podArt(false); g.drawImage(c, Math.round(it.x * HS - c.width / 4), Math.round(it.y * HS - cy - c.height / 2), c.width / 2, c.height / 2); }
    for (const p of d.falling) {
      const x = p.x * HS, y = p.y * HS - cy, c = AP.podArt(true);
      g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(Math.round(x - 3), Math.round(y), 6, 2);
      g.drawImage(c, Math.round(x - c.width / 2), Math.round(y - c.height - p.z));
    }
    for (const f of S.fx) if (f.k === "boom") AP.drawBoom(g, f.x * HS, f.y * HS - cy, f.r * HS, 1 - f.t / f.T);
    const c = AP.ospreyArt(R.frame >> 1 & 7, true);
    g.globalAlpha = 0.28; g.fillStyle = "#000"; g.beginPath(); g.ellipse(dox * HS + 16, doy * HS - cy + 20, 22, 7, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
    g.drawImage(c, Math.round(dox * HS - ax(c)), Math.round(doy * HS - cy - (c.ay ?? c.height / 2)));
  }

  /* ---- the title's picture: the depot from the air, panning slowly, in
   * the play screen's own art. The Osprey crosses and puts out three
   * rangers; each comes down on the parafoil, lands, gets their bearings,
   * and jogs off to the east. Three quiet seconds, and the next pass. t is
   * sixtieths of a second from the title's reveal (js/main.js), so a fresh
   * title starts a fresh pass. ---- */
  let ground = null, pass = null;
  function titleGround() {
    if (ground) return ground;
    const map = AP.genMap({ mission: "depot", diff: 1, seed: 11 }), gl = map.goal;
    const y0 = Math.max(0, gl.y0 - 5), rows = Math.min(map.h - y0, 24);
    ground = R.thumb(map, map.zone, y0, rows, TS);
    return ground;
  }
  R.titleScene = (cv, t) => {
    const g = cv.getContext("2d"), W = cv.width, H = cv.height, bg = titleGround();
    g.imageSmoothingEnabled = false;
    /* the camera drifts east and back over the depot */
    const camx = Math.round(Math.max(0, bg.width - W) * (0.5 - 0.5 * Math.cos(t / 2400))), camy = Math.round(Math.max(0, (bg.height - H) / 2));
    g.fillStyle = "#c79a62"; g.fillRect(0, 0, W, H);
    g.drawImage(bg, -camx, -camy);
    if (!pass || t < pass.t || pass.W !== W) pass = { W, t, t0: t, men: [], done: null };
    const k = Math.min(6, t - pass.t); pass.t = t;
    /* the Osprey: from the west, high, once a pass, seen from above */
    const tt = t - pass.t0, ox = Math.round(tt * 1.1 - 90), oy = Math.round(H * 0.3 + Math.sin(t / 70) * 2);
    /* three jumps over the first half of the screen; the men keep to the ground, which moves with the camera */
    for (let j = 0; j < 3; j++) if (!pass.men[j] && ox >= W * (0.5 + 0.1 * j)) pass.men[j] = { x: ox + camx - 8, gy: Math.round(H * (0.56 + 0.07 * j)) + camy, z: Math.round(H * 0.56 + H * 0.07 * j - oy) + 10, st: "chute", n: 0 };
    for (const m of pass.men) {
      if (!m) continue;
      if (m.st === "chute") { m.x += 0.12 * k; m.z -= 0.28 * k; if (m.z <= 0) { m.z = 0; m.st = "down"; m.n = 0; } }
      else if (m.st === "down") { if ((m.n += k) > 50) { m.st = "run"; m.n = 0; } }
      else { m.x += 0.45 * k; m.n += k; }
      const x = Math.round(m.x - camx), y = Math.round(m.gy - camy);
      if (x > W + 30) continue;
      g.globalAlpha = 0.32; g.fillStyle = "#1d1917"; g.beginPath(); g.ellipse(x + 4 + m.z * 0.3, y - m.z * 0.12, 6, 2.5, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
      if (m.st === "chute") {
        const man = AP.personArt("ranger", 8, "stand", 0), can = AP.chuteArt(), top = y - (man.ay ?? man.height - 3) - Math.round(m.z);
        g.drawImage(man, x - (man.ax ?? man.width / 2), top);
        g.drawImage(can, x - (can.width >> 1), top - can.height - 4);
      } else {
        if (m.st === "down" && m.n < 40) { const can = AP.chuteArt(); g.drawImage(can, x + 2, y - 7, can.width, 7); }
        const man = AP.personArt("ranger", m.st === "run" ? 0 : 8, m.st === "run" ? "walk" : "stand", m.st === "run" ? Math.floor(m.n / 8) & 3 : 0);
        g.drawImage(man, x - (man.ax ?? man.width / 2), y - (man.ay ?? man.height - 3));
      }
    }
    if (ox < W + 90) {
      const a = AP.ospreyArt((t >> 1) & 7, true);
      g.globalAlpha = 0.28; g.fillStyle = "#1d1917"; g.beginPath(); g.ellipse(ox + 46, oy + 44, 34, 11, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
      g.save(); g.translate(ox, oy); g.rotate(-Math.PI / 2); g.drawImage(a, -a.width, -a.height, a.width * 2, a.height * 2); g.restore();
    }
    /* all three gone and the Osprey with them: three quiet seconds, then the next pass */
    if (pass.men.length === 3 && ox >= W + 90 && pass.men.every(m => m.x - camx > W + 30)) {
      if (pass.done === null) pass.done = t;
      else if (t - pass.done > 180) { pass.men = []; pass.t0 = t; pass.done = null; }
    }
  };
})();
