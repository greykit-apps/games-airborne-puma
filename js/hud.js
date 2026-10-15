/* Airborne Puma -- what is written over the play screen: flat dark panels
 * at the corners of the field, in the page, over the canvas.
 *
 * Top left, the 1987 indicators: the clock, the wounds, the fatigue, how the
 * ranger is moving. Bottom left, the weapon in hand and what is left of
 * everything. The Field aids add the alarm state (top centre), a minimap and
 * the mission's progress (top right), arrows at the edge of the field to
 * what matters, and the keys for the first moments on the ground; Classic
 * leaves all of that out. The map view pauses the game and shows the strip,
 * the pods, the pickup and the kit carried.
 *
 * The panels are written only when what they say changes. */
"use strict";
(() => {
  const H = AP.HUD = { toasts: [] };
  const C = AP.C, K = AP.K, UI = K.UI;
  const mmss = ticks => { const s = Math.max(0, Math.ceil(ticks / C.HZ)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
  H.mmss = mmss;
  /* the colour words the game's events speak in, as the panels' tones */
  const TONE = { 2: "red", 10: "red", 13: "green", 5: "green", 7: "amber", 8: "amber" };

  /* ---- pixel icons ---- */
  const ICONS = {
    clock: [["..xxxxx..", ".x.....x.", "x...x...x", "x...x...x", "x...xx..x", "x.......x", "x.......x", ".x.....x.", "..xxxxx.."], { x: "#e9e4d8" }],
    woundOn: [["..xxx..", "..xhx..", "xxxhxxx", "xhhhhhx", "xxxhxxx", "..xhx..", "..xxx.."], { x: "#e4572e", h: "#ff8a63" }],
    woundOff: [["..xxx..", "..x.x..", "xxx.xxx", "x.....x", "xxx.xxx", "..x.x..", "..xxx.."], { x: "rgba(233,228,216,.4)" }],
    eye: [["..xxxxx..", ".x..x..x.", "x..xxx..x", ".x..x..x.", "..xxxxx.."], { x: "#e9e4d8" }],
    carbine: [["........aa.........a..", "aaa....abbaaaaaaaaaa..", "abbaaaabbbbbbccbbbbaaa", "abbbbbbbbbbbbccbbbbb..", "abbaaaaccbbccaaaaaa...", "aba.....cc..cc........", "aa......cc...cc.......", ".........c....cc......"], { a: "#e9e4d8", b: "#a8a294", c: "#77726a" }],
    mag: [["aaaaa.", "abbba.", "abbba.", ".abbba", ".abbba", ".abbba", "..abba", "..cccc"], { a: "#e9e4d8", b: "#8f8a80", c: "#c9c3b6" }],
    gren: [["..ccc..", "...ac.c", "..aaa..", ".abbba.", "abbabba", "abababa", "abbabba", ".abbba.", "..aaa.."], { a: "#e9e4d8", b: "#8e9a68", c: "#b9b3a6" }],
    law: [["..aa..........aa..", "aaaaaaaaaaaaaaaaaa", "abbbbbbbccbbbbbbba", "aaaaaaaaaaaaaaaaaa", "......c..c........"], { a: "#e9e4d8", b: "#8e9a68", c: "#a8a294" }],
    knife: [["aaaaaaaaabbbbb.", ".aaaaaaa.bbbbbb"], { a: "#e9e4d8", b: "#8a6a48" }],
    bomb: [["....c....", "aaaaaaaaa", "abbbbbbba", "abbdbdbba", "abbbbbbba", "aaaaaaaaa"], { a: "#e9e4d8", b: "#a9824f", c: "#e4572e", d: "#e8a33d" }],
    aid: [["aaaaaaa", "aaacaaa", "aacccaa", "aaacaaa", "aaaaaaa"], { a: "#e9e4d8", c: "#e4572e" }],
    pod: [["aaaaaaaa", "abbbbbba", "abaaaaba", "abbbbbba", "aaaaaaaa"], { a: "#e9e4d8", b: "#a9824f" }],
    chev: [["x...", "xx..", "xxx.", "xxxx", "xxx.", "xx..", "x..."], { x: "#7fb069" }],
  };
  const iconURL = new Map();
  /* one icon pixel is one field pixel: the size is set in CSS from --fp */
  function icon(name, cls = "") {
    const [m, pal] = ICONS[name], h = m.length, w = Math.max(...m.map(r => r.length));
    if (!iconURL.has(name)) {
      const c = K.mk(w, h), g = c.getContext("2d");
      m.forEach((r, y) => [...r].forEach((ch, x) => { const col = pal[ch]; if (!col) return; g.fillStyle = col; g.fillRect(x, y, 1, 1); }));
      iconURL.set(name, c.toDataURL());
    }
    return `<img class="ico ${cls}" src="${iconURL.get(name)}" style="--w:${w};--h:${h}" alt="">`;
  }
  H.icon = icon;

  /* ---- the panels ---- */
  let root = null;
  const $ = sel => root.querySelector(sel);
  const last = new Map();
  /* write only what changed */
  function put(sel, html) { if (last.get(sel) === html) return; last.set(sel, html); const n = $(sel); if (n) n.innerHTML = html; }
  function vis(sel, on) { const k = sel + ":vis"; if (last.get(k) === on) return; last.set(k, on); const n = $(sel); if (n) n.hidden = !on; }
  function cls(sel, c, on) { const k = sel + ":" + c; if (last.get(k) === on) return; last.set(k, on); const n = $(sel); if (n) n.classList.toggle(c, on); }
  function attr(sel, a, v) { const k = sel + "@" + a; if (last.get(k) === v) return; last.set(k, v); const n = $(sel); if (n) n.setAttribute(a, v); }

  function build() {
    root = document.getElementById("hud");
    root.innerHTML = `
      <div class="hp" id="h-status">
        <div class="h-top">${icon("clock")}<span class="h-clock num">0:00</span><div class="h-mission"><span class="lbl" id="h-mno"></span><span class="h-zone" id="h-zone"></span></div></div>
        <div class="h-row" id="h-wrow"><span class="lbl">Wounds</span><span class="h-pips" id="h-wounds"></span><span class="h-val num" id="h-wval"></span></div>
        <div class="h-row" id="h-frow"><span class="lbl">Fatigue</span><span class="h-bar" id="h-fat"></span></div>
        <div class="h-row" id="h-srow"><span class="lbl">Moving</span><span class="h-stance" id="h-stance"></span><span class="h-val" id="h-extra"></span></div>
        <div class="h-row" id="h-pods" hidden><span class="lbl">Pods</span><span class="h-pips" id="h-podi"></span><span class="h-val num" id="h-podn"></span></div>
        <div class="h-row" id="h-jump" hidden><span class="lbl">Jump</span><span class="h-light" id="h-light"></span><span class="h-val num" id="h-alt"></span></div>
      </div>
      <div class="hp h-pill" id="h-alert" hidden><span class="h-eye">${icon("eye")}</span><span class="lbl">Alert</span><span class="h-sep"></span><span class="h-state" id="h-astate"></span><span class="h-meter"><i></i><i></i><i></i></span></div>
      <div class="hp h-pill h-osprey" id="h-osprey" hidden><span class="lbl">Osprey</span><span class="h-sep"></span><span class="h-ost" id="h-ost"></span></div>
      <div class="hp" id="h-mapbox" hidden><canvas id="h-mini" width="220" height="136"></canvas><div class="h-obj"><span class="lbl">Objective</span><span class="h-tpips" id="h-tpips"></span></div><div class="h-objt" id="h-objt"></div></div>
      <div class="hp" id="h-arms">
        <div class="h-slots" id="h-slots"></div>
        <div class="h-main"><span id="h-wicon"></span><span class="h-wname" id="h-wname"></span><div class="h-ammo"><span class="h-rounds num" id="h-rounds"></span><span class="h-mags" id="h-mags"></span></div></div>
        <div class="h-subw" id="h-subw"></div>
      </div>
      <div class="h-toasts" id="h-toasts" aria-hidden="true"></div>
      <div class="hp h-pill h-hint" id="h-hint" hidden></div>
      <div class="hp h-pill h-ff" id="h-ff" hidden><kbd>F</kbd> hold: faster</div>
      <div class="hp h-end" id="h-end" hidden></div>
      <div class="h-mapview" id="h-mapview" hidden><div class="hp h-mvbox"><canvas id="h-mvmap"></canvas><div class="h-mvkit" id="h-mvkit"></div></div></div>`;
    last.clear();
  }

  H.toast = (text, col = 1, ms = 2200) => {
    H.toasts.push({ text: String(text), tone: TONE[col] || "", until: performance.now() + ms });
    if (H.toasts.length > 3) H.toasts.shift();
    /* and to a screen reader, through the page's live region */
    const live = globalThis.document && document.getElementById("live");
    if (live) live.textContent = String(text);
  };
  /* the key for an action, as the player last used them */
  const key = a => (AP.Input && AP.Input.device === "pad" ? { fire: "A", map: "Back", recall: "RB", crawl: "B" } : { fire: "Space", map: "Tab", recall: "Q", crawl: "C" })[a];
  H.key = key;
  const kbd = k => `<kbd>${k}</kbd>`;

  H.draw = (S, g, ui) => {
    if (!root || !root.isConnected) build();
    const drop = S.phase === "drop" && !S.drop.landed, p = S.player, d = S.drop;
    /* status */
    put("#h-mno", `Mission ${AP.MISSION[S.mission].n}`);
    put("#h-zone", AP.ZONES[S.zone].name);
    put(".h-clock", mmss(S.clock));
    cls(".h-clock", "warn", S.clock < 60 * C.HZ && !drop);
    vis("#h-wrow", !drop); vis("#h-frow", !drop); vis("#h-srow", !drop);
    vis("#h-pods", drop); vis("#h-jump", drop);
    if (drop) {
      put("#h-podi", [0, 1, 2].map(i => icon("pod", i < 3 - d.podsLeft ? "dim" : "")).join(""));
      put("#h-podn", `<b>${d.podsLeft}</b>/3`);
      cls("#h-light", "go", !!d.light);
      put("#h-alt", d.chute ? `${Math.max(0, Math.round(d.chute.alt * 3))} ft` : d.light ? "Go" : "");
    } else {
      put("#h-wounds", [0, 1, 2].map(i => icon(i < p.wounds ? "woundOn" : "woundOff")).join(""));
      put("#h-wval", `<b>${p.wounds}</b>/3`);
      const tired = 100 - p.fat, on = Math.round(tired / 10);
      put("#h-fat", Array.from({ length: 10 }, (_, i) => `<i class="${i < on ? "on" : ""}"></i>`).join(""));
      cls("#h-fat", "winded", !!p.tired); cls("#h-fat", "high", tired >= 75 && !p.tired);
      put("#h-stance", p.sub ? "Under water" : p.crawl ? "Crawling" : p.run ? "Running" : p.tired ? "Winded" : "Walking");
      cls("#h-stance", "warn", !!p.tired || !!p.sub);
      put("#h-extra", p.aidT ? "First aid" : p.burden ? "Load " + "+".repeat(p.burden) : p.disguised ? "In uniform" : "");
    }
    /* the alarm, and the Osprey */
    const aware = ui.aids.status && !drop;
    vis("#h-alert", aware);
    if (aware) {
      const lv = S.alert.lv;
      put("#h-astate", ["Quiet", "Suspicious", "Full alert"][lv]);
      attr("#h-alert", "data-lv", String(lv));
    }
    const o = S.osprey, ost = o && !S.end ? (o.st === "in" ? `Inbound ${mmss(o.t)}` : o.st === "hover" ? `Waiting ${mmss(o.wait)}` : "") : "";
    vis("#h-osprey", !!ost);
    if (ost) { put("#h-ost", ost); cls("#h-osprey", "hover", o.st === "hover"); cls("#h-osprey", "low", aware); }
    /* the minimap and the goal */
    const mm = ui.aids.minimap && !drop;
    vis("#h-mapbox", mm);
    if (mm) { minimap(S); put("#h-objt", AP.esc(AP.objStatus(S))); }
    /* the weapon */
    vis("#h-arms", !drop);
    if (!drop) arms(S);
    /* the drop's guidance, or the keys for the first moments on the ground */
    const guide = drop && ui.aids.drop && !d.chute;
    const msg = !guide ? "" : d.light ? `<b class="go">Green light</b> ${kbd(key("fire"))} to jump` : d.podsLeft ? `${kbd(key("fire"))} drop a pod over open ground` : "Wait for the green light";
    const fresh = !drop && ui.aids.status && S.landT !== undefined && S.t - S.landT < 15 * C.HZ && !S.end;
    const hint = msg || (fresh ? `${kbd("↑↓←→")} move ${kbd(key("fire"))} fire ${kbd(key("crawl"))} crawl ${kbd(key("map"))} map ${kbd(key("recall"))} Osprey` : "");
    vis("#h-hint", !!hint);
    if (hint) put("#h-hint", hint);
    vis("#h-ff", guide && !d.light && !!ui.aids.ffDrop);
    /* the end */
    vis("#h-end", !!S.end);
    if (S.end) {
      const r = S.end.result;
      put("#h-end", `<span class="lbl">${AP.esc(AP.MISSION[S.mission].name)}</span><b>${{ retrieved: "Retrieved", captured: "Captured", kia: "Killed in action", aborted: "Mission aborted" }[r]}</b>`);
      attr("#h-end", "data-r", r);
    }
    toasts();
    /* on the field: arrows at its edge to what matters */
    if (ui.aids.markers && !drop && !ui.mapView) markers(S, g);
    vis("#h-mapview", !!ui.mapView);
    if (ui.mapView) mapView(S, ui);
  };

  function arms(S) {
    const p = S.player, a = p.ammo, W = C.WEAPONS;
    put("#h-slots", W.map((w, i) => `<span class="${w === p.weapon ? "on" : ""}">${i + 1}</span>`).join("") + "<em>Loadout</em>");
    put("#h-wicon", icon(p.weapon));
    put("#h-wname", { carbine: "Carbine", gren: "Grenade", law: "LAW rocket", knife: "Knife", bomb: "Time bomb", aid: "First aid" }[p.weapon]);
    const empty = p.weapon === "carbine" && !p.rnd && !a.mag;
    let big = "", mags = "";
    if (p.weapon === "carbine") {
      big = empty ? "Empty" : p.reload ? "--" : String(p.rnd);
      mags = `<span class="of num">+${a.mag}</span>` + icon("mag").repeat(Math.min(4, a.mag));
    } else if (p.weapon === "bomb") { big = String(a.bomb); mags = `<span class="of">${p.fuse}s fuse</span>`; }
    else if (p.weapon !== "knife") big = String(a[p.weapon]);
    put("#h-rounds", big);
    cls("#h-rounds", "warn", empty || big === "0");
    put("#h-mags", mags);
    const sub = [["gren", "Grenades"], ["law", "LAW"], ["bomb", "Bombs"], ["aid", "Aid"]].filter(([w]) => w !== p.weapon);
    put("#h-subw", sub.map(([w, n]) => `<div class="${a[w] ? "" : "none"}" title="${n}">${icon(w)}<span class="n num">${a[w]}</span></div>`).join(""));
  }

  function toasts() {
    const now = performance.now();
    H.toasts = H.toasts.filter(t => t.until > now);
    put("#h-toasts", H.toasts.map(t => `<div class="hp h-toast ${t.tone}">${AP.esc(t.text)}</div>`).join(""));
  }

  /* ---- Field aids ---- */
  function minimap(S) {
    const cv = $("#h-mini"), g = cv.getContext("2d"), map = S.map, p = S.player, sm = AP.Render.smallMap(S), k = sm.width / map.w;
    const W = cv.width, Hh = cv.height, span = Math.round(Hh / W * map.w);
    const ty0 = AP.clamp(Math.floor(p.y) - span / 2, 0, map.h - span);
    g.imageSmoothingEnabled = true;
    g.drawImage(sm, 0, ty0 * k, map.w * k, span * k, 0, 0, W, Hh);
    g.fillStyle = "rgba(20,22,28,.38)"; g.fillRect(0, 0, W, Hh);
    const sx = W / map.w, sy = Hh / span, at = (x, y) => [x * sx, (y - ty0) * sy];
    for (const o of map.objs) if (AP.OBJ[o.k].target && !o.hidden) { const [X, Y] = at(o.x, o.y); g.strokeStyle = o.dead ? UI.green : UI.red; g.lineWidth = 1.5; g.strokeRect(Math.round(X) + 0.5, Math.round(Y) + 0.5, Math.max(3, o.w * sx), Math.max(3, o.h * sy)); }
    for (const it of S.items) if (!it.taken) { const [X, Y] = at(it.x, it.y); g.fillStyle = "#cfd59a"; g.fillRect(Math.round(X) - 1, Math.round(Y) - 1, 3, 3); }
    const [kx, ky] = at(map.pickup.x, map.pickup.y);
    g.strokeStyle = UI.green; g.lineWidth = 1.5; g.beginPath(); g.moveTo(kx - 4, ky - 4); g.lineTo(kx + 4, ky + 4); g.moveTo(kx + 4, ky - 4); g.lineTo(kx - 4, ky + 4); g.stroke();
    /* the field of view, and the ranger */
    const cam = AP.Render.cam, [vx, vy] = at(cam.x / K.TS, cam.y / K.TS);
    g.strokeStyle = "rgba(233,228,216,.35)"; g.lineWidth = 1; g.strokeRect(Math.round(vx) + 0.5, Math.round(vy) + 0.5, K.VW / K.TS * sx, K.VH / K.TS * sy);
    const [px, py] = at(p.x, p.y);
    /* a dashed line to the nearest target still standing, and north */
    let next = null, nd = Infinity;
    for (const o of map.objs) if (AP.OBJ[o.k].target && !o.hidden && !o.dead) { const d = AP.dist(p.x, p.y, o.x + o.w / 2, o.y + o.h / 2); if (d < nd) { nd = d; next = o; } }
    if (next && nd > 2) {
      const [tx, ty] = at(next.x + next.w / 2, next.y + next.h / 2), a = Math.atan2(ty - py, tx - px), L = Math.min(Math.hypot(tx - px, ty - py) - 6, 70);
      if (L > 8) {
        const ex = px + Math.cos(a) * L, ey = py + Math.sin(a) * L;
        g.strokeStyle = "#e9e4d8"; g.lineWidth = 1.5; g.setLineDash([3, 2]); g.beginPath(); g.moveTo(px, py); g.lineTo(ex, ey); g.stroke(); g.setLineDash([]);
        g.fillStyle = "#e9e4d8"; g.beginPath(); g.moveTo(ex + Math.cos(a) * 5, ey + Math.sin(a) * 5); g.lineTo(ex + Math.cos(a + 2.5) * 5, ey + Math.sin(a + 2.5) * 5); g.lineTo(ex + Math.cos(a - 2.5) * 5, ey + Math.sin(a - 2.5) * 5); g.closePath(); g.fill();
      }
    }
    g.fillStyle = "rgba(233,228,216,.7)"; g.font = "500 10px 'Pixelify Sans', monospace"; g.textBaseline = "top"; g.fillText("N", 6, 4); g.fillRect(8, 16, 1, 5);
    g.fillStyle = "#14161c"; g.fillRect(Math.round(px) - 3, Math.round(py) - 3, 6, 6);
    g.fillStyle = (AP.Render.frame >> 4) & 1 ? UI.green : "#e9e4d8"; g.fillRect(Math.round(px) - 2, Math.round(py) - 2, 4, 4);
    const tg = map.objs.filter(o => AP.OBJ[o.k].target && !o.hidden);
    put("#h-tpips", tg.length > 1 && tg.length <= 6 ? tg.map(o => `<i class="${o.dead ? "done" : ""}"></i>`).join("") : "");
  }
  function markers(S, g) {
    const p = S.player, cam = AP.Render.cam, TS = K.TS, VW = K.VW, VH = K.VH, want = [];
    for (const o of S.map.objs) if (!o.dead && !o.hidden && (AP.OBJ[o.k].target || (o.k === "lever" && !o.pulled))) want.push([o.x + o.w / 2, o.y + o.h / 2, UI.red]);
    for (const it of S.items) if (!it.taken) want.push([it.x, it.y, "#cfd59a"]);
    if (S.osprey && S.osprey.st !== "gone" || S.obj.goal) want.push([S.map.pickup.x, S.map.pickup.y, UI.green]);
    for (const [x, y, c] of want) {
      const sx = x * TS - cam.x, sy = y * TS - cam.y;
      if (sx > 6 && sx < VW - 6 && sy > 6 && sy < VH - 6) continue;
      const dx = x - p.x, dy = y - p.y, k = Math.min((VW / 2 - 12) / Math.max(1e-6, Math.abs(dx * TS)), (VH / 2 - 12) / Math.max(1e-6, Math.abs(dy * TS)));
      const ex = AP.clamp(VW / 2 + dx * TS * k, 10, VW - 10), ey = AP.clamp(VH / 2 + dy * TS * k, 10, VH - 10), a = Math.atan2(dy, dx);
      /* a small arrowhead, dark-edged, pointing the way */
      const tri = (r, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(ex + Math.cos(a) * r, ey + Math.sin(a) * r); g.lineTo(ex + Math.cos(a + 2.4) * r, ey + Math.sin(a + 2.4) * r); g.lineTo(ex + Math.cos(a - 2.4) * r, ey + Math.sin(a - 2.4) * r); g.closePath(); g.fill(); };
      tri(7, "rgba(20,22,28,.85)"); tri(5, c);
    }
  }

  /* ---- the map view ---- */
  function mapView(S, ui) {
    const map = S.map, p = S.player, cv = $("#h-mvmap"), sm = AP.Render.smallMap(S), k = sm.width / map.w;
    const box = $(".h-mvbox"), avail = Math.max(240, (box ? box.clientHeight : 600) - 48);
    const sc = Math.max(4, Math.floor(avail / 56)), span = Math.floor(avail / sc), W = map.w * sc;
    if (cv.width !== W || cv.height !== span * sc) { cv.width = W; cv.height = span * sc; }
    let ty0 = ui.mapY ?? Math.floor(p.y - span / 2);
    ty0 = AP.clamp(ty0, 0, map.h - span); ui.mapY = ty0;
    const g = cv.getContext("2d");
    g.imageSmoothingEnabled = true;
    g.drawImage(sm, 0, ty0 * k, map.w * k, span * k, 0, 0, W, span * sc);
    g.imageSmoothingEnabled = false;
    const at = (x, y) => [x * sc, (y - ty0) * sc];
    const X = (x, y, c) => { const [sx, sy] = at(x, y); g.beginPath(); g.moveTo(sx - 4, sy - 4); g.lineTo(sx + 4, sy + 4); g.moveTo(sx + 4, sy - 4); g.lineTo(sx - 4, sy + 4); g.strokeStyle = "rgba(20,22,28,.9)"; g.lineWidth = 4; g.stroke(); g.strokeStyle = c; g.lineWidth = 2; g.stroke(); };
    for (const o of map.objs) if (!o.hidden && AP.OBJ[o.k].target) { const [sx, sy] = at(o.x, o.y); g.lineWidth = 2; g.strokeStyle = "rgba(20,22,28,.9)"; g.strokeRect(sx - 1, sy - 1, o.w * sc + 2, o.h * sc + 2); g.strokeStyle = o.dead ? UI.green : UI.red; g.strokeRect(sx, sy, o.w * sc, o.h * sc); }
    for (const it of S.items) if (!it.taken) X(it.x, it.y, "#cfd59a");
    X(map.pickup.x, map.pickup.y, UI.green);
    if (ui.aids.lastSeen) for (const e of S.en) if (!e.dead && !e.friend && e.seeing) { const [sx, sy] = at(e.x, e.y); g.fillStyle = UI.red; g.fillRect(sx - 2, sy - 2, 4, 4); }
    if ((AP.Render.frame >> 4) & 1) { const [sx, sy] = at(p.x, p.y); g.fillStyle = "#e9e4d8"; g.fillRect(sx - 3, sy - 3, 6, 6); g.fillStyle = UI.green; g.fillRect(sx - 2, sy - 2, 4, 4); }
    const a = p.ammo, row = (n, v, c = "") => `<div class="h-kr ${c}"><span>${n}</span><b class="num">${v}</b></div>`;
    put("#h-mvkit", `<span class="lbl">Map</span><h2>${AP.esc(AP.MISSION[S.mission].name)}</h2><p class="h-mvst">${AP.esc(AP.objStatus(S))}</p>
      ${row("Clock", mmss(S.clock))}${row("Wounds", `${p.wounds}/3`, p.wounds ? "warn" : "")}
      <div class="h-kgap"></div>${row("Magazines", a.mag + (p.rnd > 0 ? 1 : 0))}${row("Rounds", p.rnd)}${row("Grenades", a.gren)}${row("LAW rockets", a.law)}${row("Time bombs", a.bomb)}${row("First aid", a.aid)}
      <div class="h-legend"><span><i class="lx g"></i>Pickup</span><span><i class="lx p"></i>Pod</span><span><i class="ls"></i>Target</span></div>
      <p class="h-mvkeys">${kbd("↑")} ${kbd("↓")} scroll · ${kbd("Tab")} or ${kbd("Esc")} back</p>`);
  }
})();
