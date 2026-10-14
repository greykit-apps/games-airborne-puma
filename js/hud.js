/* Airborne Puma -- what is written over the play screen.
 *
 * The 1987 indicators, upper left: the weapon in hand and its count, the
 * clock, the fatigue bar (green, then blue, then red), three wound boxes, and
 * RUN or CRAWL. The map view pauses the game and shows the strip, the pods,
 * the pickup and the kit carried. The Field aids add a minimap, arrows at the
 * screen's edge to what matters, the mission's progress and the alarm state;
 * Classic leaves all of that out. */
"use strict";
(() => {
  const H = AP.HUD = { toasts: [] };
  const C = AP.C, TS = 16;
  const box = (g, x, y, w, h) => { g.fillStyle = AP.color(0); g.globalAlpha = 0.72; g.fillRect(x, y, w, h); g.globalAlpha = 1; g.fillStyle = AP.color(12); g.fillRect(x, y, w, 1); g.fillRect(x, y + h - 1, w, 1); g.fillRect(x, y, 1, h); g.fillRect(x + w - 1, y, 1, h); };
  const mmss = ticks => { const s = Math.max(0, Math.ceil(ticks / C.HZ)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
  H.mmss = mmss;

  H.toast = (text, col = 1, ms = 2200) => {
    H.toasts.push({ text: String(text).toUpperCase(), col, until: performance.now() + ms });
    if (H.toasts.length > 3) H.toasts.shift();
    /* and to a screen reader, through the page's live region */
    const live = globalThis.document && document.getElementById("live");
    if (live) live.textContent = String(text);
  };
  /* the key for an action, as the player last used them */
  const key = a => (AP.Input && AP.Input.device === "pad" ? { fire: "A", map: "BACK", recall: "RB", crawl: "B" } : { fire: "SPACE", map: "TAB", recall: "Q", crawl: "C" })[a];
  H.key = key;

  H.draw = (S, g, ui) => {
    if (S.phase === "drop" && !S.drop.landed) { drawDrop(S, g, ui); toasts(g); return; }
    const p = S.player;
    box(g, 3, 3, 92, 33);
    /* the weapon and its count */
    g.drawImage(AP.iconArt(p.weapon), 7, 7);
    const a = p.ammo;
    const count = { carbine: `${a.mag + (p.rnd > 0 ? 1 : 0)}x${p.reload ? "--" : String(p.rnd).padStart(2, "0")}`, gren: a.gren, law: a.law, knife: "--", bomb: `${a.bomb} ${p.fuse}S`, aid: a.aid }[p.weapon];
    if (p.weapon === "carbine" && !p.rnd && !a.mag) AP.textBox(g, "EMPTY", 26, 8); else AP.text(g, count, 24, 8, 1);
    /* the clock */
    const low = S.clock < 60 * C.HZ;
    if (low && (AP.Render.frame >> 4) & 1) AP.textBox(g, mmss(S.clock), 91, 8, 1, 2, 1); else AP.text(g, mmss(S.clock), 91, 8, 7, 1);
    /* fatigue */
    const tired = 100 - p.fat, fw = Math.round(tired / 100 * 50);
    g.fillStyle = AP.color(0); g.fillRect(7, 19, 50, 4);
    g.fillStyle = AP.color(11); g.fillRect(7, 22, 50, 1);
    g.fillStyle = AP.color(p.tired ? ((AP.Render.frame >> 3) & 1 ? 2 : 10) : tired < 40 ? 5 : tired < 75 ? 14 : 2); g.fillRect(7, 19, fw, 4);
    /* wounds */
    for (let i = 0; i < 3; i++) {
      g.fillStyle = AP.color(15); g.fillRect(63 + i * 9, 18, 7, 6);
      g.fillStyle = AP.color(i < p.wounds ? 10 : 0); g.fillRect(64 + i * 9, 19, 5, 4);
      if (i < p.wounds) { g.fillStyle = AP.color(1); g.fillRect(64 + i * 9, 19, 1, 1); }
    }
    /* stance */
    const st = p.sub ? "UNDER" : p.crawl ? "CRAWL" : p.run ? "RUN" : p.tired ? "WINDED" : "WALK";
    if (p.tired) AP.textBox(g, st, 9, 28); else AP.text(g, st, 7, 28, p.run ? 1 : 15);
    if (p.aidT) AP.text(g, "FIRST AID", 91, 28, 13, 1);
    else if (p.burden) AP.text(g, "LOAD " + "+".repeat(p.burden), 91, 28, 7, 1);
    else if (p.disguised) AP.text(g, "UNIFORM", 91, 28, 7, 1);
    /* the Osprey */
    const o = S.osprey;
    if (o && !S.end) {
      const t = o.st === "in" ? "OSPREY " + mmss(o.t) : o.st === "hover" ? "OSPREY WAITS " + mmss(o.wait) : null;
      if (t) { const w = AP.textWidth(t) + 6; box(g, 160 - w / 2, 3, w, 10); AP.text(g, t, 160, 5, o.st === "hover" ? 13 : 7, 0.5); }
    }
    if (ui.aids.minimap) minimap(S, g);
    if (ui.aids.markers) markers(S, g);
    if (ui.aids.status) {
      const s = AP.objStatus(S), lv = S.alert.lv;
      const al = ["QUIET", "SEEN", "ALERT"][lv];
      const w = AP.textWidth(s) + 12 + AP.textWidth(al);
      box(g, 3, 186, w + 6, 11);
      if (lv === 2) AP.textBox(g, al, 7, 189); else AP.text(g, al, 7, 189, lv ? 7 : 13);
      AP.text(g, s, 14 + AP.textWidth(al), 189, 15);
      /* the first moments on the ground: which key does what */
      if (S.landT !== undefined && S.t - S.landT < 15 * C.HZ && !S.end) {
        const hint = `ARROWS MOVE  ${key("fire")} FIRE  ${key("crawl")} CRAWL  ${key("map")} MAP  ${key("recall")} OSPREY`;
        const hw = AP.textWidth(hint) + 8;
        box(g, 160 - hw / 2, 172, hw, 11); AP.text(g, hint, 160, 175, 1, 0.5);
      }
    }
    if (S.end) endBanner(S, g);
    toasts(g);
    if (ui.mapView) mapView(S, g, ui);
  };

  function toasts(g) {
    const now = performance.now();
    H.toasts = H.toasts.filter(t => t.until > now);
    H.toasts.forEach((t, i) => {
      const w = AP.textWidth(t.text) + 8, y = 150 - (H.toasts.length - 1 - i) * 12;
      if (t.col === 2) AP.textBox(g, t.text, 160, y + 3, 1, 2, 0.5);
      else { box(g, 160 - w / 2, y, w, 10); AP.text(g, t.text, 160, y + 3, t.col, 0.5); }
    });
  }

  function endBanner(S, g) {
    const r = S.end.result, txt = { retrieved: "RETRIEVED", captured: "CAPTURED", kia: "KILLED IN ACTION", aborted: "MISSION ABORTED" }[r];
    const w = AP.textWidth(txt) * 2 + 16, ok = r === "retrieved";
    if (ok) box(g, 160 - w / 2, 80, w, 20); else { g.fillStyle = AP.color(2); g.fillRect(160 - w / 2, 80, w, 20); g.fillStyle = AP.color(0); g.fillRect(160 - w / 2, 99, w, 1); }
    g.save(); g.scale(2, 2); AP.text(g, txt, 80, 43, ok ? 13 : 1, 0.5, ok ? 0 : null); g.restore();
  }

  function drawDrop(S, g, ui) {
    const d = S.drop;
    box(g, 3, 3, 92, 22);
    AP.text(g, "PODS", 7, 7, 15);
    for (let i = 0; i < 3; i++) g.drawImage(AP.podArt(false), 28 + i * 10, 2, 7, 9);
    for (let i = 0; i < 3 - d.podsLeft; i++) { g.fillStyle = AP.color(0); g.fillRect(28 + i * 10, 6, 7, 6); }
    AP.text(g, "JUMP", 7, 16, 15);
    g.fillStyle = AP.color(d.light ? 13 : 2); g.fillRect(28, 15, 7, 7);
    if (d.light && (AP.Render.frame >> 3) & 1) { g.fillStyle = AP.color(5); g.fillRect(29, 16, 5, 5); }
    if (d.chute) AP.text(g, "ALT " + Math.max(0, Math.round(d.chute.alt * 3)), 42, 16, 7);
    if (ui.aids.drop && !d.chute) {
      const msg = d.light ? `GREEN LIGHT: ${key("fire")} TO JUMP` : d.podsLeft ? `${key("fire")}: DROP A POD` : "WAIT FOR THE GREEN LIGHT";
      const w = AP.textWidth(msg) + 8;
      box(g, 160 - w / 2, 186, w, 11); AP.text(g, msg, 160, 189, d.light ? 13 : 7, 0.5);
      if (!d.light && ui.aids.ffDrop) AP.text(g, "HOLD F: FASTER", 316, 189, 15, 1);
    }
  }

  /* ---- Field aids ---- */
  function minimap(S, g) {
    const map = S.map, p = S.player, W = 40, Hh = 70, x0 = 320 - W - 4, y0 = 4;
    const ty0 = AP.clamp(Math.floor(p.y) - 35, 0, map.h - Hh);
    box(g, x0 - 1, y0 - 1, W + 2, Hh + 2);
    const sm = AP.Render.smallMap(S);
    g.drawImage(sm, 0, ty0 * 8, map.w * 8, Hh * 8, x0, y0, W, Hh);
    const dot = (x, y, c) => { if (y >= ty0 && y < ty0 + Hh) { g.fillStyle = AP.color(c); g.fillRect(Math.round(x0 + x - 1), Math.round(y0 + y - ty0 - 1), 2, 2); } };
    for (const o of map.objs) if (!o.dead && AP.OBJ[o.k].target) dot(o.x + o.w / 2, o.y + o.h / 2, 4);
    for (const it of S.items) if (!it.taken) dot(it.x, it.y, 8);
    dot(map.pickup.x, map.pickup.y, 7);
    if ((AP.Render.frame >> 3) & 1) dot(p.x, p.y, 1);
  }
  function markers(S, g) {
    const p = S.player, cam = AP.Render.cam, want = [];
    for (const o of S.map.objs) if (!o.dead && !o.hidden && (AP.OBJ[o.k].target || (o.k === "lever" && !o.pulled))) want.push([o.x + o.w / 2, o.y + o.h / 2, 4]);
    for (const it of S.items) if (!it.taken) want.push([it.x, it.y, 8]);
    if (S.osprey && S.osprey.st !== "gone" || S.obj.goal) want.push([S.map.pickup.x, S.map.pickup.y, 7]);
    for (const [x, y, c] of want) {
      const sx = x * TS - cam.x, sy = y * TS - cam.y;
      if (sx > 4 && sx < 316 && sy > 4 && sy < 196) continue;
      const dx = x - p.x, dy = y - p.y, k = Math.min(150 / Math.max(1e-6, Math.abs(dx * TS)), 92 / Math.max(1e-6, Math.abs(dy * TS)));
      const ex = AP.clamp(160 + dx * TS * k, 6, 314), ey = AP.clamp(100 + dy * TS * k, 6, 194);
      g.fillStyle = AP.color(0); g.fillRect(Math.round(ex) - 2, Math.round(ey) - 2, 5, 5);
      g.fillStyle = AP.color(c); g.fillRect(Math.round(ex) - 1, Math.round(ey) - 1, 3, 3);
    }
  }

  /* ---- the map view ---- */
  function mapView(S, g, ui) {
    const map = S.map, p = S.player, sc = 4, W = map.w * sc, x0 = 8;
    g.fillStyle = AP.color(0); g.fillRect(0, 0, 320, 200);
    const sm = AP.Render.smallMap(S), span = Math.floor(192 / sc);
    let ty0 = ui.mapY ?? Math.floor(p.y - span / 2);
    ty0 = AP.clamp(ty0, 0, map.h - span); ui.mapY = ty0;
    g.imageSmoothingEnabled = true;
    g.drawImage(sm, 0, ty0 * 8, map.w * 8, span * 8, x0, 4, W, span * sc);
    g.imageSmoothingEnabled = false;
    const at = (x, y) => [x0 + x * sc, 4 + (y - ty0) * sc];
    const X = (x, y, c) => { const [sx, sy] = at(x, y); if (sy < 2 || sy > 198) return; g.fillStyle = AP.color(c); for (let i = -2; i <= 2; i++) { g.fillRect(sx + i, sy + i, 1, 1); g.fillRect(sx + i, sy - i, 1, 1); } };
    for (const o of map.objs) if (!o.dead && !o.hidden && AP.OBJ[o.k].target) { const [sx, sy] = at(o.x, o.y); g.strokeStyle = AP.color(4); g.strokeRect(sx + 0.5, sy + 0.5, o.w * sc, o.h * sc); g.strokeStyle = AP.color(1); g.strokeRect(sx - 0.5, sy - 0.5, o.w * sc + 2, o.h * sc + 2); }
    for (const it of S.items) if (!it.taken) X(it.x, it.y, 8);
    X(map.pickup.x, map.pickup.y, 7);
    if (ui.aids.lastSeen) for (const e of S.en) if (!e.dead && !e.friend && e.seeing) { const [sx, sy] = at(e.x, e.y); g.fillStyle = AP.color(2); g.fillRect(sx - 1, sy - 1, 2, 2); }
    if ((AP.Render.frame >> 3) & 1) { const [sx, sy] = at(p.x, p.y); g.fillStyle = AP.color(1); g.fillRect(sx - 1, sy - 1, 3, 3); }
    /* the kit */
    const a = p.ammo, lx = x0 + W + 14;
    const rows = [["MAP", 7], ["", 0], [`MAGAZINES  ${a.mag + (p.rnd > 0 ? 1 : 0)}`, 1], [`ROUNDS     ${p.rnd}`, 1], [`GRENADES   ${a.gren}`, 1], [`LAW        ${a.law}`, 1], [`TIME BOMBS ${a.bomb}`, 1], [`FIRST AID  ${a.aid}`, 1],
      [`WOUNDS     ${p.wounds}`, p.wounds ? 10 : 1], ["", 0], [`CLOCK ${mmss(S.clock)}`, 7], ["", 0], [AP.MISSION[S.mission].name.toUpperCase().slice(0, 30), 15],
      [AP.objStatus(S).toUpperCase().slice(0, 30), 13], ["", 0], ["", 0], ["", 0], ["UP/DOWN: SCROLL", 15], ["TAB OR ESC: BACK", 15]];
    rows.forEach(([t, c], i) => AP.text(g, t, lx, 8 + i * 9, c));
    const ly = 8 + 15 * 9;
    AP.text(g, "X PICKUP", lx, ly, 7); AP.text(g, "X POD", lx + 44, ly, 8); AP.text(g, "[] TARGET", lx, ly + 9, 4);
  }
})();
