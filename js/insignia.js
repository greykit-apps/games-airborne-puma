/* Airborne Puma -- the menus' small pictures, in the play screen's hi-bit
 * finish: the ranger's ID portrait, his rank insignia and his ribbons.
 * Loaded after js/art.js and js/people.js; it replaces art.js's C64-palette
 * AP.portraitArt, AP.insigniaArt and AP.ribbonArt with these.
 *
 * AP.portraitArt(look)  44x48, look "alive" | "captured" | "memorial"
 * AP.insigniaArt(rank)  36x44, transparent, rank 0..11 (PFC .. COL)
 * AP.ribbonArt(code)    52x20, COM1 COM2 BSTR SSTR DSC CMOH
 *
 * The menus show them at half their size times a whole scale, so scale 2
 * is one to one. Light comes from the upper left, as on a photo or a pin. */
"use strict";
(() => {
  const K = AP.K;
  const cl = (v, a, b) => v < a ? a : v > b ? b : v;
  const tone = (ramp, t) => ramp[cl(Math.round(t), 0, ramp.length - 1)];

  /* ================= embossed pieces: a label map, lit at its seams =================
   * Each pixel belongs to a region { ramp, t (base tone), z (height), f (x, y) -> tone
   * offset }. An edge facing the upper left catches light; one facing the lower right
   * falls dark; a higher neighbour on the light side casts a shadow. */
  const lab = (w, h) => ({ w, h, id: new Int16Array(w * h), regs: [null] });
  const reg = (L, o) => { L.regs.push({ t: 2, z: 1, ...o }); return L.regs.length - 1; };
  const fill = (L, id, test) => { for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) if (test(x + 0.5, y + 0.5, x, y)) L.id[y * L.w + x] = id; };
  const poly = pts => (x, y) => {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
  const ell = (cx, cy, rx, ry) => (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  const box = (x0, y0, x1, y1) => (x, y) => x >= x0 && x < x1 && y >= y0 && y < y1;
  /* a thick segment, round ended */
  const seg = (x0, y0, x1, y1, r) => (x, y) => {
    const dx = x1 - x0, dy = y1 - y0, t = cl(((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy || 1), 0, 1);
    return Math.hypot(x - x0 - dx * t, y - y0 - dy * t) <= r;
  };
  const renderLab = L => {
    const c = K.mk(L.w, L.h), g = c.getContext("2d"), { w, h, id, regs } = L;
    const at = (x, y) => x < 0 || y < 0 || x >= w || y >= h ? 0 : id[y * w + x];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const r = at(x, y);
      if (!r) continue;
      const R = regs[r];
      let t = R.t + (R.f ? R.f(x, y) : 0);
      for (const [dx, dy] of [[-1, 0], [0, -1]]) {
        const n = at(x + dx, y + dy);
        if (n === r) continue;
        if (!n || regs[n].z <= R.z) t -= 1; else t += 1;
      }
      for (const [dx, dy] of [[1, 0], [0, 1]]) {
        const n = at(x + dx, y + dy);
        if (n === r) continue;
        if (!n || regs[n].z <= R.z) t += 1;
      }
      g.fillStyle = tone(R.ramp, t); g.fillRect(x, y, 1, 1);
    }
    return c;
  };

  /* ================= ramps ================= */
  const RAMP = {
    fur:   ["#fde4b5", "#f2c78b", "#e2ab6b", "#ca8d50", "#a46b38", "#774c26", "#523219"],
    muz:   ["#fffbf2", "#f7ecd6", "#e6d5b6", "#cdb892", "#a99271"],
    earIn: ["#f0b8a8", "#e3a497", "#c98479", "#a8665e", "#7d4a45"],
    olive: ["#bcc77e", "#a0ad64", "#87944f", "#6f7c40", "#566131", "#3f4824", "#2c331a"],
    brown: ["#a98a62", "#8e6e49", "#755839", "#5d442c", "#463220", "#322316", "#241910"],
    green: ["#6d7a4a", "#5d6840", "#4a5432", "#3b4428", "#2e351f", "#222816", "#171b0e"],
    black: ["#4a4a40", "#3a3a32", "#2c2c26", "#22221d", "#1a1a16", "#131310", "#0d0d0b"],
    steel: ["#dfe3e8", "#c3c9d0", "#a3aab3", "#7f8792", "#5c636e", "#3d434c", "#272b31"],
    gold:  ["#fff7cf", "#f7df86", "#e6bf55", "#c4943a", "#946a26", "#634416", "#3c2810"],
    silver:["#ffffff", "#e8ecf1", "#c8ced6", "#a1a9b4", "#78818d", "#535a64", "#353a41"],
    thread:["#fff1a8", "#f4cf5c", "#dcab3a", "#b78528", "#865e1b", "#5a3d12"],
    cloth: ["#88905a", "#6c7542", "#565e33", "#424926", "#30351b", "#222613"],
  };
  const LINE = "#1d1612";          /* the figure's outline */

  /* ================= the portrait ================= */
  const W = 44, H = 48;
  /* light from the upper left, a little in front */
  const LX = -0.5, LY = -0.62, LZ = 0.6, LN = Math.hypot(LX, LY, LZ);
  const lam = (nx, ny) => { const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)); return (nx * LX + ny * LY + nz * LZ) / LN; };
  const inE = (x, y, cx, cy, rx, ry) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
  const nE = (x, y, cx, cy, rx, ry) => lam((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry);
  const mir = x => 43 - x;          /* the face is symmetric about x = 22 */

  /* the puma, with no ground behind him: a 44x48 canvas, transparent round him */
  const figure = look => {
    const c = K.mk(W, H), g = c.getContext("2d");
    const P = (x, y, col) => { g.fillStyle = col; g.fillRect(x, y, 1, 1); };
    const each = (fn) => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) fn(x, y); };
    const tired = look === "captured";

    /* ---- the fatigues: woodland camouflage over the shoulders ---- */
    const BY = 48.6;
    const body = (x, y) => inE(x, y, 22, BY, 22.6, 16.4);
    const camo = (x, y) => {
      const a = K.vn(x / 4.6 + 3.1, y / 3.2 + 11.7), b = K.vn(x / 3.4 + 40.2, y / 2.7 + 5.3), k = K.vn(x / 2.6 + 70, y / 2.2 + 21);
      return k > 0.78 ? "black" : a > 0.6 ? "brown" : b > 0.56 ? "green" : "olive";
    };
    /* the open collar: two flaps folded over the shoulders, a V of cream chest fur */
    const flapL = poly([[9, 35], [15.2, 31.6], [19, 34.8], [22, 42], [17.4, 40], [13.2, 38.6]]);
    const flapR = (x, y) => flapL(44 - x, y);
    const vee = poly([[16.2, 31.2], [27.8, 31.2], [22, 41.4]]);
    each((x, y) => {
      if (!body(x, y)) return;
      const nx = (x + 0.5 - 22) / 23, ny = (y + 0.5 - BY) / 17;
      const s = lam(nx * 0.9, ny * 0.9);
      let t = 3.6 - s * 2.6;
      if (vee(x + 0.5, y + 0.5)) {
        /* chest fur, shadowed under the chin */
        P(x, y, tone(RAMP.muz, 2.2 - s * 1.2 + (y < 35 ? 1 : 0)));
        return;
      }
      if (flapL(x + 0.5, y + 0.5) || flapR(x + 0.5, y + 0.5)) t -= 0.8;
      P(x, y, tone(RAMP[camo(x, y)], t));
    });
    /* the collar's edges: a dark seam under each flap, a shadowed rim round the V */
    each((x, y) => {
      if (!body(x, y)) return;
      const f = flapL(x + 0.5, y + 0.5) || flapR(x + 0.5, y + 0.5), above = flapL(x + 0.5, y - 0.5) || flapR(x + 0.5, y - 0.5);
      if (!f && above && !vee(x + 0.5, y + 0.5)) P(x, y, "#202615");
      const inV = vee(x + 0.5, y + 0.5), edge = !vee(x - 0.5, y + 0.5) || !vee(x + 1.5, y + 0.5);
      if (inV && edge) P(x, y, "#5a4a32");
    });
    /* name tape (viewer's left) and U.S. ARMY tape (viewer's right) */
    const tape = (x0, y0, seed) => {
      for (let x = x0; x < x0 + 9; x++) { P(x, y0, "#9aa16c"); P(x, y0 + 1, "#7d8656"); P(x, y0 + 2, "#5f683f"); }
      const r = K.rng("tape", seed);
      for (let x = x0 + 1; x < x0 + 8; x++) if (r() < 0.62) P(x, y0 + 1, "#23281a");
    };
    tape(6, 40, 1); tape(29, 40, 2);

    /* ---- the neck: short and thick ---- */
    each((x, y) => {
      if (y < 25 || y > 36 || x < 14 || x > 29) return;
      if (vee(x + 0.5, y + 0.5) || (y < 33 && !body(x, y))) {
        const s = lam((x + 0.5 - 22) / 9, 0.2);
        P(x, y, tone(RAMP.fur, 4.1 - s * 1.6 + (y < 31 ? 0.7 : 0)));
      }
    });

    /* ---- the ears, behind the head: round, dark rimmed ---- */
    for (const side of [0, 1]) {
      const ex = side ? 32 : 12, ey = 10.2;
      each((x, y) => {
        if (!inE(x, y, ex, ey, 4.3, 4.3)) return;
        const s = nE(x, y, ex, ey, 4.6, 4.6), dx = x + 0.5 - ex, dy = y + 0.5 - ey;
        let t = 3.4 - s * 2.4;
        /* the dark back of a puma's ear shows round its rim */
        if (Math.hypot(dx, dy) > 3.1 && dy < 0.5 && dx * (side ? 1 : -1) > -1.5) t += 1.6;
        P(x, y, tone(RAMP.fur, t));
        const ix = side ? 31.4 : 12.6;
        if (inE(x, y, ix, 11, 2.2, 2.6)) P(x, y, tone(RAMP.earIn, 1.4 + s * 1.8));
      });
    }

    /* ---- the head: a round skull and broad cheeks ---- */
    const skull = (x, y) => inE(x, y, 22, 18.4, 11.2, 9.9), cheek = (x, y) => inE(x, y, 22, 23, 12.4, 6.4);
    const head = (x, y) => skull(x, y) || cheek(x, y);
    each((x, y) => {
      if (!head(x, y)) return;
      const s = skull(x, y) && (!cheek(x, y) || y < 21) ? nE(x, y, 22, 18.4, 11.8, 10.6) : nE(x, y, 22, 23, 13, 7.2);
      let t = 3.7 - s * 2.9;
      /* the darker brow between the eyes */
      if (inE(x, y, 22, 13.2, 2.4, 4)) t += 0.6;
      P(x, y, tone(RAMP.fur, t + K.bayer(x, y) * 0.3));
    });
    /* shadow of the jaw on the neck */
    each((x, y) => { if (!head(x, y) && head(x, y - 1) && y > 26 && x > 12 && x < 31 && !body(x, y)) P(x, y, RAMP.fur[6]); });

    /* pale spots above the eyes */
    for (const [x, y] of [[16, 15], [17, 15]]) { P(x, y, RAMP.muz[2]); P(mir(x), y, RAMP.muz[3]); }
    /* the muzzle: two cream lobes round the nose, a chin under them */
    each((x, y) => {
      const lob = inE(x, y, 19.6, 24.4, 3.4, 2.5) || inE(x, y, 24.4, 24.4, 3.4, 2.5);
      const chin = inE(x, y, 22, 27.2, 2.8, 1.6);
      if (!lob && !chin) return;
      let s;
      if (lob) s = x < 22 ? nE(x, y, 19.6, 24.4, 4.2, 3.3) : nE(x, y, 24.4, 24.4, 4.2, 3.3);
      else s = nE(x, y, 22, 26.6, 3.6, 2.4) - 0.6;
      P(x, y, tone(RAMP.muz, 2.2 - s * 2));
    });
    /* the dark whisker patch at each side of the lip */
    for (const [x, y] of [[16, 24], [16, 25]]) { P(x, y, "#6b4426"); P(mir(x), y, "#5e3b20"); }

    /* the bruise, round the eye he did not see coming */
    if (tired) each((x, y) => {
      if (!inE(x, y, 28, 19.6, 4.4, 3.4) || !head(x, y)) return;
      const d = g.getImageData(x, y, 1, 1).data;
      P(x, y, K.mix(K.hex([d[0], d[1], d[2]]), "#6a4d70", 0.36));
    });

    /* ---- the eyes: amber, dark rimmed, the light caught in them ---- */
    const EYE = tired
      ? ["......", ".KKKK.", "KaaPaK", ".KKKK."]
      : [".KKKK.", "KAAPAK", "KaaPaK", ".KKKK."];
    const epal = { K: "#2a1a10", A: "#e4bf52", a: "#b88a2c", P: "#120b07" };
    K.grid(g, EYE, 14, 17, epal);
    K.grid(g, EYE, 24, 17, epal);
    if (tired) { for (let x = 15; x < 19; x++) { P(x, 17, RAMP.fur[4]); P(mir(x), 17, RAMP.fur[4]); } P(16, 19, "#f2e7c8"); P(26, 19, "#f2e7c8"); }
    else { P(16, 18, "#fffaf0"); P(26, 18, "#fffaf0"); }
    /* pale fur under each eye, and the soft dark tear line toward the lip */
    for (let x = 15; x < 18; x++) { P(x, 21, RAMP.muz[2]); P(mir(x), 21, RAMP.muz[3]); }
    for (const [x, y] of [[19, 21], [18, 22]]) { P(x, y, "#7a4f2c"); P(mir(x), y, "#6b4426"); }

    /* ---- nose and mouth ---- */
    K.grid(g, ["NNNNNN", ".NnnN.", "..dd.."], 19, 21, { N: "#d48c80", n: "#b86e64", d: "#5a3029" });
    P(20, 21, "#eab0a4"); P(21, 21, "#e39d91");
    P(21, 24, "#5a3a2a"); P(22, 24, "#5a3a2a");
    P(20, 25, "#5a3a2a"); P(23, 25, "#5a3a2a");
    if (!tired) { P(19, 25, "#8a6650"); P(24, 25, "#8a6650"); }

    /* ---- what the cell left on him: a plaster on the brow, a smudge of dirt ---- */
    if (tired) {
      K.grid(g, ["..pp..", "ppqqpp", "ppqqpp", "..pp.."], 12, 11, { p: "#ead6b0", q: "#cbb08a" });
      for (const [x, y] of [[13, 14], [16, 14], [17, 13]]) P(x, y, "#a88d68");
      for (const [x, y] of [[29, 25], [31, 24], [12, 26]]) P(x, y, "#7a5434");
    }

    K.outline(c, LINE);
    return c;
  };

  /* the photo's ground: a soft gradient, a lighter halo behind the head */
  const ground = (top, bot, halo, amt) => {
    const c = K.mk(W, H), g = c.getContext("2d");
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const d = Math.hypot((x + 0.5 - 22) / 22, (y + 0.5 - 18) / 20);
      let col = K.mix(top, bot, cl(y / (H - 1) + K.bayer(x, y) * 0.12, 0, 1));
      const h = cl(1 - d, 0, 1) * amt;
      col = K.mix(col, halo, cl(Math.round((h + K.bayer(x + 1, y) * 0.1) * 4) / 4, 0, 1));
      g.fillStyle = col; g.fillRect(x, y, 1, 1);
    }
    return c;
  };

  AP.portraitArt = (look = "alive") => K.get(`ins-por-${look}`, () => {
    const c = K.mk(W, H), g = c.getContext("2d");
    if (look === "memorial") {
      g.drawImage(ground("#1b1c1f", "#0d0e10", "#2a2b2f", 0.8), 0, 0);
      const f = figure("alive"), fg = f.getContext("2d"), d = fg.getImageData(0, 0, W, H);
      for (let i = 0; i < d.data.length; i += 4) {
        if (!d.data[i + 3]) continue;
        const l = (d.data[i] * 0.3 + d.data[i + 1] * 0.59 + d.data[i + 2] * 0.11) / 255;
        const v = 14 + Math.pow(l, 1.1) * 190;
        d.data[i] = v; d.data[i + 1] = v + 1; d.data[i + 2] = v + 4;
      }
      fg.putImageData(d, 0, 0);
      g.drawImage(f, 0, 0);
      /* a thin frame, as on the wall of the memorial */
      g.fillStyle = "#3a3b40"; g.fillRect(0, 0, W, 1); g.fillRect(0, H - 1, W, 1); g.fillRect(0, 0, 1, H); g.fillRect(W - 1, 0, 1, H);
      return c;
    }
    if (look === "captured") {
      g.drawImage(ground("#3a3d43", "#24262b", "#4a4d52", 0.5), 0, 0);
      /* cinder blocks behind him */
      g.fillStyle = "#2c2f34";
      for (let y = 5; y < H; y += 8) { g.fillRect(0, y, W, 1); for (let x = (y % 16 === 5 ? 6 : 16); x < W; x += 20) g.fillRect(x, y - 7, 1, 7); }
      g.drawImage(figure("captured"), 0, 0);
      /* the bars, in front */
      const S = RAMP.steel, bars = [1, 9, 32, 40];
      for (const x0 of bars) {
        for (let y = 0; y < H; y++) {
          g.fillStyle = S[1]; g.fillRect(x0, y, 1, 1);
          g.fillStyle = S[3]; g.fillRect(x0 + 1, y, 1, 1);
          g.fillStyle = S[4]; g.fillRect(x0 + 2, y, 1, 1);
          g.fillStyle = "#16181c"; g.fillRect(x0 + 3, y, 1, 1);
        }
        g.fillStyle = S[0]; for (let y = 2; y < H; y += 9) g.fillRect(x0, y, 1, 2);
      }
      for (let x = 0; x < W; x++) {
        if (bars.some(b => x >= b && x < b + 3)) continue;
        g.fillStyle = S[1]; g.fillRect(x, 36, 1, 1);
        g.fillStyle = S[3]; g.fillRect(x, 37, 1, 1);
        g.fillStyle = S[4]; g.fillRect(x, 38, 1, 1);
        g.fillStyle = "#16181c"; g.fillRect(x, 39, 1, 1);
      }
      for (const x0 of bars) { g.fillStyle = S[2]; g.fillRect(x0, 36, 3, 3); g.fillStyle = S[0]; g.fillRect(x0, 36, 1, 1); g.fillStyle = S[5]; g.fillRect(x0 + 2, 38, 1, 1); }
      return c;
    }
    g.drawImage(ground("#59614f", "#353b33", "#6f7862", 0.6), 0, 0);
    g.drawImage(figure("alive"), 0, 0);
    return c;
  });

  /* ================= rank insignia ================= */
  const IW = 36, IH = 44, CX = 18;
  const INK = "#120f0b";

  /* enlisted: gold thread chevrons and rockers on an olive patch */
  const SL = 0.9, HW = 15, TH = 3, PITCH = 4, CURVE = 4.5;
  const enlisted = (nChev, nRock, star) => {
    const shapes = [];
    for (let i = 0; i < nChev; i++) {
      const Y = i * PITCH;
      shapes.push({ side: 1, test: (x, y, oy) => { const u = x - CX, d = y - oy - (Y + SL * Math.abs(u)); return Math.abs(u) <= HW && d >= 0 && d < TH; } });
    }
    const R0 = (nChev - 1) * PITCH + SL * HW + TH + 1;
    for (let i = 0; i < nRock; i++) {
      const Y = R0 + i * PITCH;
      shapes.push({ side: 0, test: (x, y, oy) => { const u = x - CX, d = y - oy - (Y + CURVE * (1 - (u / HW) ** 2)); return Math.abs(u) <= HW && d >= 0 && d < TH; } });
    }
    const sy = (nChev - 1) * PITCH + TH + 9.4;
    if (star) {
      const pts = [];
      for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 2.3 : 5.6; pts.push([CX + Math.cos(a) * r, sy + Math.sin(a) * r]); }
      const st = poly(pts);
      shapes.push({ side: 2, test: (x, y, oy) => st(x, y - oy) });
    }
    /* how tall, to centre it */
    let top = IH, bot = 0;
    for (let y = -10; y < IH + 10; y++) for (let x = 0; x < IW; x++) if (shapes.some(s => s.test(x + 0.5, y + 0.5, 0))) { top = Math.min(top, y); bot = Math.max(bot, y); }
    const oy = Math.round((IH - (bot - top + 1)) / 2) - top;
    const L = lab(IW, IH);
    const gold = new Uint8Array(IW * IH);
    shapes.forEach((s, i) => {
      const id = reg(L, { ramp: RAMP.thread, t: 1.6, z: 2, f: (x, y) => {
        /* satin stitches, slanting across the stripe */
        const u = x - CX;
        const st = s.side === 2 ? 0 : ((u < 0 ? x + y : x - y + 300) % 3 === 0 ? 0.6 : 0);
        return st + (y + x * 0.3) / IH * 0.6 - 0.2;
      } });
      fill(L, id, (x, y, px, py) => { if (s.test(x, y, oy)) { gold[py * IW + px] = 1; return true; } return false; });
    });
    /* the olive patch: everything between the top and bottom thread in each column, plus a margin */
    const back = new Uint8Array(IW * IH);
    for (let x = 0; x < IW; x++) {
      let a = -1, b = -1;
      for (let y = 0; y < IH; y++) if (gold[y * IW + x]) { if (a < 0) a = y; b = y; }
      if (a >= 0) for (let y = a; y <= b; y++) back[y * IW + x] = 1;
    }
    const cloth = reg(L, { ramp: RAMP.cloth, t: 2, z: 1, f: (x, y) => ((x + 2 * y) % 7 === 0 ? 0.6 : 0) });
    for (let y = 0; y < IH; y++) for (let x = 0; x < IW; x++) {
      if (gold[y * IW + x]) continue;
      const near = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const X = x + dx, Y = y + dy; return X >= 0 && Y >= 0 && X < IW && Y < IH && back[Y * IW + X]; });
      if (near) L.id[y * IW + x] = cloth;
    }
    return renderLab(L);
  };

  /* officers: pins of gold and silver */
  const metalSheen = (x0, y0, w, h, k = 1.4) => (x, y) => {
    const u = (x - x0) / w, v = (y - y0) / h;
    const band = Math.abs(u * 0.8 + v * 0.45 - 0.42) < 0.09 ? -1 : 0;
    return (u * 0.6 + v - 0.8) * k + band;
  };
  const bar = (L, ramp, x0, y0, w, h) => {
    const rim = reg(L, { ramp, t: 2, z: 2, f: metalSheen(x0, y0, w, h, 1.2) });
    const face = reg(L, { ramp, t: 2, z: 1, f: metalSheen(x0, y0, w, h, 1.6) });
    fill(L, rim, (x, y) => box(x0, y0, x0 + w, y0 + h)(x, y) && !(((x < x0 + 1) || (x > x0 + w - 1)) && ((y < y0 + 1) || (y > y0 + h - 1))));
    fill(L, face, box(x0 + 2, y0 + 2, x0 + w - 2, y0 + h - 2));
  };
  const leaf = (L, ramp) => {
    /* the oak leaf: lobed halves meeting at a raised midrib, a short stem */
    const TOP = 3, LEN = 31;
    const half = v => {
      const env = Math.pow(Math.sin(Math.PI * cl(v * 0.93 + 0.04, 0, 1)), 0.75) * (0.86 + 0.14 * v);
      const lobes = 0.56 + 0.44 * Math.pow(Math.abs(Math.cos(Math.PI * (v * 3.6 + 0.15))), 0.45);
      return 14.6 * env * (v < 0.1 ? 0.9 : lobes);
    };
    const inLeaf = (x, y) => { const v = (y - TOP) / LEN; return v >= 0 && v <= 1 && Math.abs(x - CX) <= half(v); };
    const lobeOf = (y) => Math.floor(((y - TOP) / LEN) * 3.6 + 0.15 + 0.5);
    const ids = {};
    for (const side of [0, 1]) for (let k = 0; k < 6; k++) ids[side + "," + k] = reg(L, { ramp, t: side ? 2.6 : 1.7, z: 1, f: metalSheen(4, TOP, 28, LEN, 0.9) });
    for (let y = 0; y < IH; y++) for (let x = 0; x < IW; x++) {
      const X = x + 0.5, Y = y + 0.5;
      if (!inLeaf(X, Y)) continue;
      L.id[y * IW + x] = ids[(X < CX ? 0 : 1) + "," + cl(lobeOf(Y + Math.abs(X - CX) * 0.45), 0, 5)];
    }
    const rib = reg(L, { ramp, t: 1.6, z: 2, f: (x, y) => (y - TOP) / LEN * 1.4 });
    fill(L, rib, (x, y) => (Math.abs(x - CX) < 1 && y > TOP + 3 && y < TOP + LEN + 0.5));
    fill(L, rib, seg(CX, TOP + LEN - 1, CX - 1.2, TOP + LEN + 6, 1.05));
  };
  const eagle = (L, ramp) => {
    const sheen = metalSheen(2, 2, 32, 40, 1.0);
    const R = (t, z = 1, f = sheen) => reg(L, { ramp, t, z, f });
    /* the wings: feathers fanning up and out from each shoulder, mirrored */
    const FEATHERS = [
      [[14.2, 21], [5.4, 27.4], 2],
      [[13.6, 19], [2.8, 22.4], 2.2],
      [[13, 17], [2, 16.4], 2.2],
      [[12.4, 15], [2.6, 10.4], 2.2],
      [[12, 13], [4.4, 4.8], 2],
    ];
    for (const side of [0, 1]) {
      const m = x => side ? 36 - x : x;
      FEATHERS.forEach(([[bx, by], [tx, ty], r], i) => {
        const id = R(side ? 2.6 : 1.8);
        fill(L, id, seg(m(bx), by, m(tx), ty, r));
      });
      const cov = R(side ? 2.4 : 1.5, 2);
      fill(L, cov, poly([[m(15.6), 23], [m(16), 15], [m(13.6), 10.4], [m(9.4), 8.6], [m(8.6), 13.2], [m(10.6), 19.4]].map(p => p)));
    }
    /* the tail, fanned below */
    [[[18, 30], [13.6, 39], 1.7], [[18, 30], [18, 40.6], 1.7], [[18, 30], [22.4, 39], 1.7]].forEach(([[bx, by], [tx, ty], r], i) => fill(L, R(1.6 + i * 0.5), seg(bx, by, tx, ty, r)));
    /* arrows in one talon, the olive branch in the other */
    fill(L, R(2.2), seg(13.4, 30.4, 7.6, 36, 0.75));
    fill(L, R(1.6), poly([[7.4, 34.4], [6, 37.6], [9.2, 36.2]]));
    fill(L, R(2.8), seg(22.6, 30.4, 28.4, 36, 0.75));
    for (const [x, y] of [[25.5, 32.2], [27.3, 34.3], [29.4, 36.4]]) fill(L, R(2.4), ell(x, y - 1.2, 1.1, 1.3));
    /* the body, the shield on the breast */
    fill(L, R(2, 3), ell(18, 24, 4.9, 7.6));
    const chief = R(1.4, 4), pale1 = R(1.8, 4), pale2 = R(3.2, 4);
    const shield = poly([[14.6, 19.2], [21.4, 19.2], [21.4, 25.6], [18, 29.6], [14.6, 25.6]]);
    fill(L, pale1, shield);
    fill(L, pale2, (x, y) => shield(x, y) && y > 21.4 && (Math.floor(x) % 2 === 1));
    fill(L, chief, (x, y) => shield(x, y) && y <= 21.4);
    /* the head, turned to its right, and the hooked beak */
    fill(L, R(1.6, 3), poly([[15.6, 18.6], [20.4, 18.6], [19.2, 13.8], [16.4, 13.8]]));
    fill(L, R(1.2, 4), ell(16.2, 11.6, 3.4, 3.1));
    fill(L, R(2.2, 4), poly([[13.4, 10.4], [10.4, 11.6], [11.2, 13.6], [13.6, 13]]));
  };

  AP.insigniaArt = rank => K.get(`ins-rank-${rank}`, () => {
    let c;
    if (rank <= 5) {
      c = [() => enlisted(1, 1), () => enlisted(2, 0), () => enlisted(3, 0), () => enlisted(3, 1), () => enlisted(3, 2), () => enlisted(3, 3, true)][Math.max(0, rank)]();
    } else {
      const L = lab(IW, IH);
      if (rank === 6) bar(L, RAMP.gold, 13, 8, 10, 28);
      else if (rank === 7) bar(L, RAMP.silver, 13, 8, 10, 28);
      else if (rank === 8) { bar(L, RAMP.silver, 7, 8, 9, 28); bar(L, RAMP.silver, 20, 8, 9, 28); }
      else if (rank === 9) leaf(L, RAMP.gold);
      else if (rank === 10) leaf(L, RAMP.silver);
      else eagle(L, RAMP.silver);
      c = renderLab(L);
      if (rank === 11) { const g = c.getContext("2d"); g.fillStyle = "#353a41"; g.fillRect(15, 11, 1, 1); }
      if (rank === 9 || rank === 10) {
        /* the side veins, cut into the metal */
        const g = c.getContext("2d"), dark = (rank === 9 ? RAMP.gold : RAMP.silver)[4], d = g.getImageData(0, 0, IW, IH).data;
        for (let k = 0; k < 4; k++) {
          const y0 = 9 + k * 6.6;
          for (let s = 1; s <= 7; s++) for (const dir of [-1, 1]) {
            const x = Math.round(CX - 0.5 + dir * (s + 0.5)), y = Math.round(y0 - s * 0.55);
            if (d[(y * IW + x) * 4 + 3]) { g.fillStyle = dark; g.fillRect(x, y, 1, 1); }
          }
        }
      }
    }
    K.outline(c, INK);
    return c;
  });

  /* ================= ribbons =================
   * Stripe widths from the regulation specs (in 64ths of 1 3/8 inch), fitted to 50 pixels. */
  const RC = {
    W: "#f1eee6",      /* white */
    G: "#1f5d40",      /* myrtle green */
    S: "#c42b38",      /* scarlet */
    U: "#2b3f93",      /* ultramarine blue */
    R: "#b4233a",      /* old glory red */
    I: "#24479a",      /* imperial blue */
    L: "#5d9fd9",      /* light blue */
  };
  const STRIPES = {
    /* white 3/32, green 25/64, then five white 1/32 stripes 1/16 apart about the centre */
    COM: [["W", 3], ["G", 15], ["W", 1], ["G", 2], ["W", 1], ["G", 2], ["W", 1], ["G", 2], ["W", 1], ["G", 2], ["W", 1], ["G", 16], ["W", 3]],
    /* white 1/32, scarlet 9/16, white 1/32, blue 1/8 at the centre */
    BSTR: [["W", 1], ["S", 21], ["W", 1], ["U", 4], ["W", 1], ["S", 21], ["W", 1]],
    /* blue 3/32, white 3/64, blue 7/32, white 7/32, red 7/32 at the centre */
    SSTR: [["U", 3], ["W", 2], ["U", 8], ["W", 8], ["R", 8], ["W", 8], ["U", 8], ["W", 2], ["U", 3]],
    /* red 1/8, white 1/16, imperial blue 1 inch */
    DSC: [["R", 5], ["W", 2], ["I", 36], ["W", 2], ["R", 5]],
    CMOH: [["L", 50]],
  };
  const STAR = ["...#...", "..###..", "#######", ".#####.", "..###..", ".##.##.", ".#...#."];
  const CLUSTER = ["..L.L....L.L..", ".LLLLL..LLLLL.", "LllllLAALllllL", ".LLLLLaaLLLLL.", "..L.L.ss.L.L.."];

  AP.ribbonArt = code => K.get(`ins-rib-${code}`, () => {
    const RW = 52, RH = 20, c = K.mk(RW, RH), g = c.getContext("2d");
    const st = STRIPES[code] || STRIPES.COM;
    g.fillStyle = "#14120f"; g.fillRect(0, 0, RW, RH);
    let x = 1;
    for (const [k, w] of st) {
      const base = K.rgb(RC[k]);
      for (let xx = x; xx < x + w; xx++) for (let y = 1; y < RH - 1; y++) {
        const t = (y - 1) / (RH - 3);
        /* a soft roll top to bottom, a lit top edge, the grosgrain rib */
        let f = 1.07 - 0.24 * Math.pow(t, 1.5) + (y === 1 ? 0.07 : 0) - (xx % 2 ? 0.025 : 0) - (y === RH - 2 ? 0.05 : 0);
        if (xx === 1 || xx === RW - 2) f -= 0.06;
        const lift = k === "W" ? 0 : 6 * (1 - t);
        g.fillStyle = K.hex(base.map(v => v * f + lift)); g.fillRect(xx, y, 1, 1);
      }
      x += w;
    }
    if (code === "CMOH") {
      /* five white stars in the form of an M */
      [[5, 9], [14, 4], [23, 9], [32, 4], [41, 9]].forEach(([sx, sy]) => {
        K.grid(g, STAR, sx + 1, sy + 1, { "#": "#4a88c2" });
        K.grid(g, STAR, sx, sy, { "#": "#ffffff" });
        g.fillStyle = "#dde8f3";
        STAR.forEach((r, yy) => { if (yy >= 4) for (let xx = 0; xx < r.length; xx++) if (r[xx] === "#") g.fillRect(sx + xx, sy + yy, 1, 1); });
      });
    }
    if (code === "COM2") {
      /* the second award: a bronze oak-leaf cluster */
      const o = K.mk(16, 7);
      K.grid(o.getContext("2d"), CLUSTER, 1, 1, { L: "#d39a55", l: "#9a6630", a: "#b5793a", A: "#e2b27a", s: "#8a5a28" });
      K.outline(o, "#2a1a0c");
      g.drawImage(o, 18, 7);
    }
    return c;
  });
})();
