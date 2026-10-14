/* Airborne Puma -- the play screen: 320 by 200, as the C64's, scaled up
 * square-pixelled to fit the window.
 *
 * On foot the ground scrolls in every direction with the ranger; trees,
 * buildings, installations and people are drawn back to front by where their
 * feet are, then what is in the air (grenades, rockets, the Osprey, smoke),
 * then the crosshair. The fly-over shows the whole width of the strip at half
 * scale; under the parafoil the view drops to full scale over the shadow. */
"use strict";
(() => {
  const TS = 16, VW = 320, VH = 200;
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

  R.init = cv => { R.cv = cv; R.g = cv.getContext("2d"); R.g.imageSmoothingEnabled = false; };
  const variant = (x, y) => ((x * 7 + y * 13 + ((x * y) >> 2)) & 3);

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
    const tx = AP.clamp(fx * TS - VW / 2, 0, map.w * TS - VW), ty = AP.clamp(fy * TS - VH / 2 - 8, 0, map.h * TS - VH);
    const dx = tx - R.cam.x, dy = ty - R.cam.y;
    /* locked on, except after a jump in the target (landing, the ladder), which it eases to */
    if (snap) { R.cam.x = tx; R.cam.y = ty; }
    else { R.cam.x += Math.abs(dx) > 48 ? dx * 0.2 : dx; R.cam.y += Math.abs(dy) > 48 ? dy * 0.2 : dy; }
  }
  R.snap = S => { R.look.x = R.look.y = 0; R.pf = null; R.prevP = null; R.prevE.clear(); R.prevD = null; aimCamera(S, true); };

  /* is the ranger's pose and frame */
  function playerPose(S) {
    const p = S.player;
    if (p.dead) return ["dead", 0];
    if (p.sub) return ["sub", 0];
    if (p.kd > 0 || p.crawl) return ["crawl", p.moving ? ((S.t / 9) | 0) & 3 : 0];
    if (p.moving) return ["walk", (S.t / (p.run ? 4 : 7) | 0) & 3];
    return ["stand", 0];
  }

  R.draw = (S, ui) => {
    const g = R.g;
    R.frame++;
    if (S.phase === "drop" && !S.drop.chute && !S.drop.landed) { drawFlyover(S, ui); return; }
    aimCamera(S, false);
    const cx = Math.round(R.cam.x), cy = Math.round(R.cam.y), map = S.map, zone = S.zone;
    const tx0 = Math.floor(cx / TS), ty0 = Math.floor(cy / TS), tx1 = Math.ceil((cx + VW) / TS), ty1 = Math.ceil((cy + VH) / TS);
    /* the ground */
    for (let ty = ty0; ty < ty1; ty++) for (let tx = tx0; tx < tx1; tx++) {
      const id = AP.tileAt(map, tx, ty);
      g.drawImage(AP.tileArt(zone, id, variant(tx, ty)), tx * TS - cx, ty * TS - cy);
    }
    /* everything standing up, back to front */
    const list = [];
    for (let ty = ty0; ty < ty1 + 2; ty++) for (let tx = tx0; tx < tx1; tx++)
      if (AP.tileAt(map, tx, ty) === AP.T.TREE) list.push([ty + 0.98, AP.treeArt(zone, variant(tx, ty)), tx * TS - 1 - cx, (ty + 1) * TS - 30 - cy]);
    for (const o of map.objs) {
      if (o.hidden || o.flown) continue;
      if ((o.x + o.w) * TS < cx || o.x * TS > cx + VW || (o.y + o.h) * TS < cy || o.y * TS > cy + VH + 40) continue;
      const a = AP.objArt(o.k, o.dead, zone, o.pulled ? 1 : 0);
      list.push([o.y + o.h - 0.01, a.c, o.x * TS - cx, (o.y + o.h) * TS - a.c.height - cy]);
    }
    for (const it of S.items) if (!it.taken) list.push([it.y, AP.podArt(false), it.x * TS - 7 - cx, it.y * TS - 16 - cy]);
    for (const b of S.bombs) list.push([b.y, AP.miscArt("bomb"), b.x * TS - 3 - cx, b.y * TS - 4 - cy, (R.frame >> 3) & 1 ? 0 : 1]);
    for (const e of S.en) {
      if (e.aboard) continue;
      if (e.dead && S.t - e.deadT > 500) continue;
      if (e.x * TS < cx - 24 || e.x * TS > cx + VW + 24 || e.y * TS < cy - 8 || e.y * TS > cy + VH + 24) continue;
      const last = R.prevE.get(e.id), moving = !!last && (Math.abs(last[0] - e.x) + Math.abs(last[1] - e.y) > 0.002);
      const [exd, eyd] = ipos(last, e.x, e.y);
      let img;
      if (e.k === "tank") img = AP.tankArt(e.f, moving ? (S.t >> 2) & 1 : 0);
      else {
        const look = e.k === "guard" ? "rifle" : e.k;
        const pose = e.dead ? "dead" : e.prone ? "crawl" : moving ? "walk" : "stand";
        img = AP.personArt(look, e.f, pose, pose === "walk" ? ((S.t / 8 + e.id) | 0) & 3 : 0);
      }
      list.push([eyd + (e.dead ? -0.3 : 0), img, Math.round(exd * TS - img.width / 2 - cx), Math.round(eyd * TS - img.height + 3 - cy), 0, e]);
    }
    const p = S.player;
    const [px, py] = ipos(R.prevP, p.x, p.y);
    /* the sprite turns only when the aim has really moved: a hand on the mouse is never quite still */
    if (R.pf == null || AP.dirDiff(p.f, R.pf) >= 2 || (p.f % 4 === 0 && AP.dirDiff(p.f, R.pf) >= 1)) R.pf = p.f;
    if (!p.aboard && S.phase === "foot") {
      const [pose, fr] = playerPose(S);
      if (pose === "sub") list.push([py, null, 0, 0, 0, "bubbles"]);
      else {
        const img = AP.personArt(p.disguised ? "disguise" : "ranger", p.climbing ? 24 : R.pf, pose, fr);
        const lift = p.climbing ? Math.round((AP.C.CLIMB - p.climbing) / AP.C.CLIMB * 24) : 0;
        list.push([py + 0.001, img, Math.round(px * TS - img.width / 2 - cx), Math.round(py * TS - img.height + 3 - cy - lift), 0, "p"]);
      }
    }
    list.sort((a, b) => a[0] - b[0]);
    for (const [, img, x, y, hide, who] of list) {
      if (who === "bubbles") { if ((R.frame >> 4) & 1) { g.fillStyle = AP.color(1); g.fillRect(Math.round(px * TS - cx), Math.round(py * TS - cy) - 3, 1, 1); g.fillRect(Math.round(px * TS - cx) + 2, Math.round(py * TS - cy) - 5, 1, 1); } continue; }
      if (hide) continue;
      g.drawImage(img, x, y);
      if (ui.aids.aware && who && typeof who === "object" && !who.dead && !who.friend && who.st !== "follow") mark(g, who, x + img.width / 2, y);
    }
    /* the air */
    for (const n of S.nades) { const x = n.x * TS - cx, y = n.y * TS - cy; g.fillStyle = "rgba(0,0,0,.4)"; g.fillRect(x - 1, y, 3, 1); g.drawImage(AP.miscArt("nade"), Math.round(x - 2), Math.round(y - 2 - n.z * 14)); }
    for (const k of S.rockets) { const x = k.x * TS - cx, y = k.y * TS - cy; g.fillStyle = AP.color(12); g.fillRect(Math.round(x - 2), Math.round(y - 6), 4, 2); g.fillStyle = AP.color(R.frame & 1 ? 7 : 2); g.fillRect(Math.round(x - 2 - k.dx * 4), Math.round(y - 6 - k.dy * 4), 2, 2); }
    for (const f of S.fx) {
      if (f.k === "tracer") { g.strokeStyle = AP.color(f.e ? 10 : 7); g.lineWidth = 1; g.beginPath(); g.moveTo(f.x0 * TS - cx + 0.5, f.y0 * TS - cy - 6.5); g.lineTo(f.x1 * TS - cx + 0.5, f.y1 * TS - cy - 6.5); g.stroke(); }
      else if (f.k === "flame") { for (let i = 0; i < 10; i++) { const k = i / 10, x = f.x0 + (f.x1 - f.x0) * k, y = f.y0 + (f.y1 - f.y0) * k; g.fillStyle = AP.color([7, 8, 2, 10][(i + R.frame) & 3]); g.fillRect(Math.round(x * TS - cx + Math.sin(i + R.frame) * 2), Math.round(y * TS - cy - 6), 3, 3); } }
      else if (f.k === "boom") boom(g, f.x * TS - cx, f.y * TS - cy, f.r * TS, 1 - f.t / f.T);
    }
    /* the Osprey over the pickup */
    const o = S.osprey;
    if (o && (o.st === "hover" || o.st === "in" || (o.st === "gone" && S.t - (o.re - AP.C.REAGAIN) < 200) || p.aboard)) {
      const pk = map.pickup;
      let oy = pk.y * TS - 62, ox = pk.x * TS;
      if (o.st === "in") oy -= Math.min(400, o.t * 2);
      if (o.st === "gone" || (p.aboard && S.end)) oy -= Math.max(0, (S.t - (S.end ? S.end.t : o.re - AP.C.REAGAIN)) * 2);
      const leaving = o.st === "gone" || (p.aboard && S.end);
      const img = AP.ospreyArt(R.frame >> 1 & 7, false, leaving);
      g.globalAlpha = 0.35; g.fillStyle = AP.color(0); g.beginPath(); g.ellipse(pk.x * TS - cx, pk.y * TS - cy + 2, 24, 6, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
      if (o.st === "hover") g.drawImage(AP.miscArt("ladder"), Math.round(ox - 3 - cx), Math.round(oy + 34 - cy));
      g.drawImage(img, Math.round(ox - img.width / 2 - cx), Math.round(oy - cy));
    }
    /* the parafoil, on the way down */
    if (S.phase === "drop" && S.drop.chute) {
      const ch = S.drop.chute, [chx, chy] = ipos(R.prevD && [R.prevD[2], R.prevD[3]], ch.x, ch.y), x = chx * TS - cx, y = chy * TS - cy, lift = ch.alt * 0.6;
      g.globalAlpha = 0.45; g.fillStyle = AP.color(0); g.beginPath(); g.ellipse(x, y + 2, 5 + ch.alt / 30, 2, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
      g.drawImage(AP.personArt("ranger", 8, "stand", 0), Math.round(x - 10), Math.round(y - 21 - lift));
      g.drawImage(AP.chuteArt(), Math.round(x - 11), Math.round(y - 36 - lift));
    }
    /* the crosshair */
    if (S.phase === "foot" && !p.dead && !p.aboard && !S.end) {
      const [dx, dy] = AP.DIR32[p.f];
      let d = 4;
      if (p.weapon === "gren") d = AP.C.GREN.min + (AP.C.GREN.max - AP.C.GREN.min) * p.charge / AP.C.GREN.charge;
      if (p.weapon !== "knife" && p.weapon !== "bomb" && p.weapon !== "aid") g.drawImage(AP.miscArt("cross"), Math.round((px + dx * d) * TS - 3 - cx), Math.round((py + dy * d) * TS - 9 - cy));
    }
  };

  function mark(g, e, x, y) {
    const ch = e.st === "pursue" || e.st === "alert" ? "!" : e.see > 0.05 || e.st === "investigate" ? "?" : null;
    if (!ch) return;
    const tx = Math.round(x) - 1, ty = Math.round(y) - 5;
    if (ch === "!") { for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) AP.text(g, ch, tx + dx, ty + dy, 2, 0, null); AP.text(g, ch, tx, ty, 1, 0, null); }
    else AP.text(g, ch, tx, ty, 7, 0, 0);
  }
  function boom(g, x, y, r, k) {
    const rr = r * (0.4 + k * 0.8);
    for (const [s, c] of [[1, 9], [0.8, 2], [0.6, 8], [0.4, 7], [0.2, 1]]) {
      if (k > 0.6 && c === 1) continue;
      g.fillStyle = AP.color(k > 0.7 ? (c === 9 ? 11 : 12) : c);
      g.beginPath(); g.ellipse(x, y - rr * 0.3, rr * s, rr * s * 0.75, 0, 0, Math.PI * 2); g.fill();
    }
  }

  /* ---- the fly-over: the strip at half scale, the Osprey heading south ---- */
  function smallMap(S) {
    const map = S.map;
    if (R.small && R.small.map === map && R.small.ver === map.ver && R.small.pal === AP.palName) return R.small.c;
    const c = document.createElement("canvas");
    c.width = map.w * 8; c.height = map.h * 8;
    const g = c.getContext("2d");
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) g.drawImage(AP.tileArtSmall(S.zone, AP.tileAt(map, x, y), variant(x, y)), x * 8, y * 8);
    g.imageSmoothingEnabled = true;
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) if (AP.tileAt(map, x, y) === AP.T.TREE) { const t = AP.treeArt(S.zone, variant(x, y)); g.drawImage(t, x * 8 - 1, y * 8 + 8 - 15, 9, 15); }
    for (const o of map.objs) if (!o.hidden) { const a = AP.objArt(o.k, o.dead, S.zone); g.drawImage(a.c, o.x * 8, (o.y + o.h) * 8 - a.c.height / 2, a.c.width / 2, a.c.height / 2); }
    R.small = { map, ver: map.ver, pal: AP.palName, c };
    return c;
  }
  R.smallMap = smallMap;
  /* rows y0..y0+rows of a map, px pixels a tile: the reconnaissance photo and the mission cards */
  R.thumb = (map, zone, y0, rows, px) => {
    const c = document.createElement("canvas");
    c.width = map.w * px; c.height = rows * px;
    const g = c.getContext("2d");
    g.imageSmoothingEnabled = px < 16;
    for (let y = 0; y < rows; y++) for (let x = 0; x < map.w; x++) g.drawImage(AP.tileArt(zone, AP.tileAt(map, x, y0 + y), variant(x, y0 + y)), x * px, y * px, px, px);
    const k = px / 16;
    for (let y = 0; y < rows + 2; y++) for (let x = 0; x < map.w; x++) if (AP.tileAt(map, x, y0 + y) === AP.T.TREE) { const t = AP.treeArt(zone, variant(x, y0 + y)); g.drawImage(t, (x * 16 - 1) * k, ((y + 1) * 16 - 30) * k, t.width * k, t.height * k); }
    for (const o of map.objs) {
      if (o.hidden || o.y + o.h < y0 || o.y > y0 + rows) continue;
      const a = AP.objArt(o.k, false, zone);
      g.drawImage(a.c, o.x * px, (o.y + o.h - y0) * px - a.c.height * k, a.c.width * k, a.c.height * k);
    }
    return c;
  };
  function drawFlyover(S, ui) {
    const g = R.g, d = S.drop, map = S.map, sm = smallMap(S);
    const [dox, doy] = ipos(R.prevD, d.ox, d.oy);
    const cy = Math.round(AP.clamp(doy * 8 - 60, 0, map.h * 8 - VH));
    R.cam.x = AP.clamp(d.ox * TS - VW / 2, 0, map.w * TS - VW); R.cam.y = AP.clamp(d.oy * TS - VH / 2, 0, map.h * TS - VH);
    g.drawImage(sm, 0, Math.round(cy), VW, VH, 0, 0, VW, VH);
    if (ui.aids.drop) {
      const z = map.drop;
      g.strokeStyle = AP.color(d.light ? 13 : 7); g.setLineDash([3, 3]); g.strokeRect(z.x0 * 8 + 0.5, z.y0 * 8 - cy + 0.5, (z.x1 - z.x0) * 8, (z.y1 - z.y0) * 8); g.setLineDash([]);
      if (!d.light && d.podsLeft) {
        const steps = 30 / AP.C.DROP.pod, lx = d.ox * 8, ly = (d.oy + steps * AP.C.DROP.speed * 0.4) * 8 - cy;
        const t = AP.tileAt(map, Math.floor(d.ox), Math.floor(d.oy + steps * AP.C.DROP.speed * 0.4));
        const bad = !AP.TILE[t].walk || [AP.T.TRENCH, AP.T.WIRE, AP.T.MINE, AP.T.WATER, AP.T.THIN, AP.T.PIPE].includes(t) || AP.objAt(map, Math.floor(d.ox), Math.floor(d.oy + steps * AP.C.DROP.speed * 0.4));
        g.fillStyle = AP.color(bad ? 2 : 13);
        g.fillRect(lx - 3, ly, 7, 1); g.fillRect(lx, ly - 3, 1, 7);
      }
    }
    for (const it of S.items) if (!it.taken) g.drawImage(AP.podArt(false), Math.round(it.x * 8 - 4), Math.round(it.y * 8 - cy - 8), 7, 9);
    for (const p of d.falling) {
      const x = p.x * 8, y = p.y * 8 - cy;
      g.fillStyle = "rgba(0,0,0,.4)"; g.fillRect(Math.round(x - 2), Math.round(y), 4, 2);
      g.drawImage(AP.podArt(true), Math.round(x - 7), Math.round(y - 18 - p.z));
    }
    for (const f of S.fx) if (f.k === "boom") boom(g, f.x * 8, f.y * 8 - cy, f.r * 8, 1 - f.t / f.T);
    const img = AP.ospreyArt(R.frame >> 1 & 7, true);
    g.globalAlpha = 0.3; g.fillStyle = "#000"; g.beginPath(); g.ellipse(dox * 8 + 10, doy * 8 - cy + 14, 16, 5, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
    g.drawImage(img, Math.round(dox * 8 - img.width / 2), Math.round(doy * 8 - cy - img.height / 2));
  }

  /* ---- the title's backdrop: night, the Osprey crossing, chutes coming down ---- */
  R.titleScene = (cv, t) => {
    const g = cv.getContext("2d"), W = cv.width, H = cv.height;
    g.imageSmoothingEnabled = false;
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#05070f"); sky.addColorStop(0.6, "#0c1020"); sky.addColorStop(1, "#231a17");
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    const s = Math.max(2, Math.floor(Math.min(W / 320, H / 200) * 1.5));
    for (let i = 0; i < 140; i++) { const x = (i * 97 % W), y = (i * 61 % (H * 0.6)); g.fillStyle = i % 9 ? "#47609c" : "#dbe4fb"; if ((i + (t >> 5)) % 23) g.fillRect(x, y, 1 + (i % 3 === 0), 1); }
    /* the hills */
    g.fillStyle = "#0a0e1a";
    g.beginPath(); g.moveTo(0, H);
    for (let x = 0; x <= W; x += 8) g.lineTo(x, H * 0.78 + Math.sin(x / 90) * 18 + Math.sin(x / 33) * 6);
    g.lineTo(W, H); g.fill();
    g.fillStyle = "#05070f";
    g.beginPath(); g.moveTo(0, H);
    for (let x = 0; x <= W; x += 6) g.lineTo(x, H * 0.88 + Math.sin(x / 60 + 2) * 10);
    g.lineTo(W, H); g.fill();
    /* the Osprey, side to side, high */
    const ox = ((t * 0.6) % (W + 400)) - 200, oy = H * 0.3 + Math.sin(t / 90) * 6;
    const img = AP.ospreyArt((t >> 1) & 7, false);
    g.save(); g.translate(ox, oy); g.rotate(-Math.PI / 2); g.drawImage(img, -img.width * s / 2, -img.height * s / 2, img.width * s, img.height * s); g.restore();
    /* parafoils drifting down behind it */
    for (let i = 0; i < 3; i++) {
      const age = (t - i * 70) % 600;
      if (age < 0) continue;
      const x = ((ox - 120 - i * 60) + W + 400) % (W + 400) - 200, y = oy + 30 + age * 0.35;
      if (y > H * 0.85) continue;
      g.drawImage(AP.chuteArt(), x, y, 22 * s * 0.6, 16 * s * 0.6);
      g.drawImage(AP.personArt("ranger", 8, "stand", 0), x + 3 * s * 0.6, y + 14 * s * 0.6, 20 * s * 0.6, 24 * s * 0.6);
    }
  };
})();
