/* Airborne Puma -- the mission area. DOM-free.
 *
 * As in 1987, the area is a tall strip assembled from modular pieces, laid
 * out new for every mission: the pickup clearing at the north end, the
 * mission's installation under it (the template in js/missions.js), then
 * band after band of trenches, wire, minefields, woods and the rest, down to
 * the open drop zone at the south end. Badlands close it in on every side.
 *
 * Every map is proved before it is used: a breadth-first walk from the drop
 * zone must reach every target and the pickup. When a band happens to seal
 * the way, the cheapest path through is cut open and the map proved again;
 * tools/mapcheck.js keeps count of how often that is needed.
 *
 * The generator has its own random stream, seeded from the mission seed, so
 * a seed always makes the same ground whatever happens on it. */
"use strict";
(() => {
  const T = AP.T;

  /* which bands each zone is built from, and how often */
  const BANDS = {
    desert:    [["field", 3], ["trench", 2], ["wire", 2], ["mines", 1.4], ["sandbags", 1.5], ["bunker", 1], ["ditch", 1.5], ["rocks", 1.5]],
    temperate: [["field", 3], ["trench", 2], ["wire", 1.5], ["mines", 1], ["hedge", 2], ["traps", 1], ["river", 1], ["ruins", 1.5], ["woods", 1.5], ["bunker", 1]],
    arctic:    [["field", 3], ["trench", 2], ["wire", 1.5], ["mines", 1], ["woods", 2], ["pond", 1.5], ["drifts", 1.5], ["bunker", 1], ["turrets", 0.8]],
  };
  /* what grows in an open field, per zone: [tile, chance] */
  const SCATTER = {
    desert:    [[T.ROCK, 0.025], [T.BUSH, 0.05]],
    temperate: [[T.BUSH, 0.07], [T.TREE, 0.03]],
    arctic:    [[T.TREE, 0.045], [T.BUSH, 0.06], [T.ROCK, 0.01]],
  };
  const TARGET_KINDS = new Set(["sam", "plane", "dish", "shack", "magazine", "fuel", "pump", "radio", "avfuel", "craft", "door", "pyramid", "lever", "guardhouse"]);

  AP.genMap = function ({ mission, diff = 2, seed = 1 }) {
    const C = AP.C, W = C.W, H = C.H, m = AP.MISSION[mission];
    const r = AP.mulberry((seed ^ 0x9E37) | 0), ri = n => AP.ri(r, n);
    const zone = m.zone;
    const tiles = new Array(W * H).fill(T.OPEN);
    const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
    const get = (x, y) => inb(x, y) ? tiles[y * W + x] : T.BAD;
    const set = (x, y, t) => { if (inb(x, y)) tiles[y * W + x] = t; };
    const objs = [], spawns = [];
    const addObj = (k, x, y, extra) => { const d = AP.OBJ[k]; const o = Object.assign({ id: objs.length, k, x, y, w: d.w, h: d.h, hp: d.hp || 1, dead: false }, extra || {}); objs.push(o); return o; };
    const spawn = (k, x, y, extra) => { spawns.push(Object.assign({ k, x: x + 0.5, y: y + 0.5, f: 8 }, extra || {})); };
    const D = AP.C.DIFF;

    /* ground texture */
    for (let i = 0; i < tiles.length; i++) if (r() < 0.06) tiles[i] = T.ROUGH;

    /* the badlands: a ragged edge down both sides */
    const lw = [], rw = [];
    let a = 3, b = 3;
    for (let y = 0; y < H; y++) {
      if (r() < 0.25) a = AP.clamp(a + (r() < 0.5 ? -1 : 1), 2, 4);
      if (r() < 0.25) b = AP.clamp(b + (r() < 0.5 ? -1 : 1), 2, 4);
      lw.push(a); rw.push(b);
    }
    const L = 5, R = W - 6;          /* gaps and lanes are kept inside these columns */

    const scatter = (y0, y1, k = 1) => {
      for (let y = y0; y < y1; y++) for (let x = 0; x < W; x++) {
        if (get(x, y) !== T.OPEN && get(x, y) !== T.ROUGH) continue;
        for (const [t, p] of SCATTER[zone]) if (r() < p * k) { set(x, y, t); break; }
      }
    };
    const route = (x0, y0, x1, y1) => [[x0 + 0.5, y0 + 0.5], [x1 + 0.5, y0 + 0.5], [x1 + 0.5, y1 + 0.5], [x0 + 0.5, y1 + 0.5]];
    const patrol = (y0, y1, k = "rifle") => {
      const x0 = L + ri(R - L - 10), x1 = x0 + 6 + ri(8), ya = y0 + ri(Math.max(1, y1 - y0 - 1));
      const yb = Math.min(y1 - 1, ya + 1 + ri(3));
      spawn(k, x0, ya, { route: route(x0, ya, Math.min(R, x1), yb) });
    };
    /* a row across the strip with gaps of n tiles, returning the gaps' x */
    const gappy = (y, t, gaps = 1, width = 2) => {
      for (let x = 0; x < W; x++) set(x, y, t);
      const out = [];
      for (let g = 0; g < gaps; g++) {
        const gx = L + ri(R - L - width);
        for (let i = 0; i < width; i++) set(gx + i, y, T.OPEN);
        out.push(gx);
      }
      return out;
    };

    /* ---- the bands ---- */
    const band = {
      field(y, h) { scatter(y, y + h); if (r() < 0.7) patrol(y, y + h); return h; },
      trench(y, h) {
        let ty = y + 2 + ri(Math.max(1, h - 4));
        for (let x = 0; x < W; x++) {
          set(x, ty, T.TRENCH);
          if (r() < 0.12 && ty > y + 1 && ty < y + h - 2) { ty += r() < 0.5 ? -1 : 1; set(x, ty, T.TRENCH); }
        }
        scatter(y, y + h, 0.6);
        const x0 = L + ri(8), x1 = R - ri(8);
        spawn("rifle", x0, ty, { route: [[x0 + 0.5, ty + 0.5], [x1 + 0.5, ty + 0.5]] });
        if (r() < 0.5) { const mx = L + ri(R - L - 2); if (ty - 3 >= y) { addObj("mg", mx, ty - 3); clear(mx - 1, ty - 4, 4, 1); } }
        return h;
      },
      ditch(y, h) {
        for (let n = 0; n < 2; n++) {
          let x = L + ri(R - L);
          for (let yy = y; yy < y + h; yy++) { set(x, yy, T.TRENCH); if (r() < 0.2) { x = AP.clamp(x + (r() < 0.5 ? -1 : 1), L, R); set(x, yy, T.TRENCH); } }
        }
        scatter(y, y + h, 0.8);
        if (r() < 0.6) patrol(y, y + h);
        return h;
      },
      wire(y, h) {
        const wy = y + 2 + ri(Math.max(1, h - 4));
        const gaps = gappy(wy, T.WIRE, 1 + ri(2), 2 + ri(2));
        for (const gx of gaps) if (r() < 0.8) spawn("guard", gx + (r() < 0.5 ? -1 : 2), wy - 1, { f: 8, post: true });
        if (r() < 0.4) { const wy2 = wy - 2; if (wy2 > y) gappy(wy2, T.WIRE, 2, 3); }
        scatter(y, y + h, 0.5);
        return h;
      },
      mines(y, h) {
        let lx = L + ri(R - L - 2);
        for (let yy = y + 1; yy < y + h - 1; yy++) {
          for (let x = 0; x < W; x++) if (x < lx || x > lx + 1) set(x, yy, T.MINE);
          if (r() < 0.4) lx = AP.clamp(lx + (r() < 0.5 ? -1 : 1), L, R - 2);
        }
        return h;
      },
      sandbags(y, h) {
        for (const yy of [y + 2, y + h - 3]) {
          for (let x = L; x < R; x += 3 + ri(4)) { const n = 3 + ri(4); for (let i = 0; i < n && x + i < W; i++) set(x + i, yy, T.WALL); x += n; }
          if (r() < 0.6) spawn("guard", L + ri(R - L), yy - 1, { f: 8, post: true });
        }
        scatter(y, y + h, 0.4);
        return h;
      },
      bunker(y, h) {
        const n = 1 + (r() < 0.4 ? 1 : 0);
        for (let i = 0; i < n; i++) { const bx = L + ri(R - L - 3); addObj("bunker", bx, y + 2); clear(bx - 1, y + 4, 5, 1); }
        const ty = y + 5;
        for (let x = 0; x < W; x++) if (r() < 0.8) set(x, ty, T.TRENCH);
        spawn("guard", L + ri(R - L), ty, { f: 8, post: true });
        scatter(y, y + h, 0.5);
        return h;
      },
      turrets(y, h) {
        const tx = L + ri(R - L - 2); addObj("turret", tx, y + 2);
        gappy(y + 5, T.WIRE, 2, 3);
        scatter(y, y + h, 0.5);
        if (r() < 0.6) patrol(y, y + h);
        return h;
      },
      rocks(y, h) { scatter(y, y + h, 3); if (r() < 0.6) patrol(y, y + h); return h; },
      hedge(y, h) {
        for (const yy of [y + 1 + ri(2), y + h - 2 - ri(2)]) for (let x = 0; x < W; x++) if (r() < 0.85) set(x, yy, r() < 0.2 ? T.TREE : T.BUSH);
        scatter(y, y + h, 0.5);
        if (r() < 0.7) patrol(y, y + h);
        return h;
      },
      traps(y, h) {
        for (let yy = y + 2; yy < y + h - 2; yy += 2) for (let x = (yy & 2) ? 1 : 2; x < W; x += 3) set(x, yy, T.TRAP);
        if (r() < 0.5) patrol(y, y + h);
        return h;
      },
      river(y, h) {
        const ry = y + 2, rh = 3 + ri(2);
        for (let yy = ry; yy < ry + rh; yy++) for (let x = 0; x < W; x++) set(x, yy, T.WATER);
        const fx = L + ri(R - L - 3);
        for (let yy = ry; yy < ry + rh; yy++) for (let x = fx; x < fx + 3; x++) set(x, yy, T.ROUGH);
        spawn("guard", fx + 1, ry - 1, { f: 8, post: true });
        scatter(y, y + h, 0.5);
        return h;
      },
      ruins(y, h) {
        for (let n = 0; n < 3; n++) {
          const x0 = L + ri(R - L - 6), y0 = y + 1 + ri(Math.max(1, h - 6)), w = 4 + ri(4), hh = 3 + ri(2);
          for (let x = x0; x < x0 + w; x++) for (const yy of [y0, y0 + hh]) if (r() < 0.7) set(x, yy, r() < 0.3 ? T.HWALL : T.WALL);
          for (let yy = y0; yy <= y0 + hh; yy++) for (const x of [x0, x0 + w - 1]) if (r() < 0.6) set(x, yy, T.WALL);
          if (r() < 0.5) spawn("guard", x0 + 1 + ri(w - 2), y0 + 1, { f: 8, post: true });
        }
        if (r() < 0.6) patrol(y, y + h);
        return h;
      },
      woods(y, h) {
        for (let yy = y; yy < y + h; yy++) for (let x = 0; x < W; x++) if (r() < 0.32) set(x, yy, T.TREE);
        /* a path or two through */
        for (let n = 0; n < 2; n++) {
          let x = L + ri(R - L);
          for (let yy = y; yy < y + h; yy++) { set(x, yy, T.OPEN); set(x + 1, yy, T.OPEN); if (r() < 0.35) x = AP.clamp(x + (r() < 0.5 ? -1 : 1), L, R - 1); }
        }
        if (r() < 0.5) patrol(y, y + h);
        return h;
      },
      pond(y, h) {
        const cx = L + 4 + ri(R - L - 8), cy = y + h / 2, rx = 5 + ri(6), ry = Math.max(2, h / 2 - 1);
        for (let yy = y; yy < y + h; yy++) for (let x = 0; x < W; x++) {
          const d = ((x - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2;
          if (d < 1) set(x, yy, d < 0.25 ? T.WATER : r() < 0.25 ? T.THIN : T.ICE);
        }
        scatter(y, y + h, 0.4);
        if (r() < 0.6) patrol(y, y + h);
        return h;
      },
      drifts(y, h) {
        for (let n = 0; n < 6; n++) { const cx = ri(W), cy = y + ri(h); for (let i = 0; i < 8; i++) set(cx + ri(4) - 2, cy + ri(3) - 1, T.BUSH); }
        scatter(y, y + h, 0.5);
        if (r() < 0.6) patrol(y, y + h);
        return h;
      },
    };
    function clear(x, y, w, h) { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) set(xx, yy, T.OPEN); }

    /* ---- north to south ---- */
    const pickup = { x: 12 + ri(W - 24) + 0.5, y: 6.5 };
    scatter(3, 10, 0.3);
    clear(Math.floor(pickup.x) - 2, 4, 5, 5);

    /* the installation */
    const piece = m.piece, pw = Math.max(...piece.map(s => s.length)), ph = piece.length;
    const px = Math.floor((W - pw) / 2) + ri(3) - 1, py = 10;
    const marks = {};
    piece.forEach((row, yy) => [...row.padEnd(pw, ".")].forEach((ch, xx) => {
      const x = px + xx, y = py + yy;
      if (AP.TILECH[ch] !== undefined) { set(x, y, AP.TILECH[ch]); return; }
      const near = [[0, -1], [0, 1], [-1, 0], [1, 0]].some(([dx, dy]) => (piece[yy + dy] || "")[xx + dx] === "f");
      set(x, y, near ? T.FLOOR : T.OPEN);
      if (AP.OBJCH[ch]) (marks[AP.OBJCH[ch]] = marks[AP.OBJCH[ch]] || []).push([x, y]);
      else if (AP.ACTCH[ch]) (marks["@" + AP.ACTCH[ch]] = marks["@" + AP.ACTCH[ch]] || []).push([x, y]);
    }));
    /* how many of the counted things there are, by difficulty */
    const keep = (k, n) => { const a = marks[k]; if (!a) return; while (a.length > n) a.splice(ri(a.length), 1); };
    keep("sam", D.launchers[diff]); keep("minib", D.minib[diff]); keep("plane", D.planes[diff]); keep("dish", D.dishes[diff]);
    for (const [k, list] of Object.entries(marks)) for (const [x, y] of list) {
      if (k[0] === "@") {
        const kind = k.slice(1);
        if (kind === "rifle" || kind === "elite" || kind === "tank") spawn(kind, x, y, { tpl: true, route: route(Math.max(L, x - 3), y, Math.min(R, x + 3), y + 2) });
        else spawn(kind, x, y, { tpl: true, f: 8, post: true });
      } else {
        const o = addObj(k, x, y);
        if (k === "lever") o.hidden = true;           /* under the pyramid until it goes */
        if (k === "plane") o.hp = AP.OBJ.plane.hp;
      }
    }
    const goal = { x0: px - 1, y0: py - 1, x1: px + pw + 1, y1: py + ph + 1 };
    let hangar = null;
    if (mission === "photo") {
      let x0 = W, y0 = H, x1 = 0, y1 = 0;
      for (let y = py; y < py + ph; y++) for (let x = px; x < px + pw; x++) if (get(x, y) === T.FLOOR) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x + 1); y1 = Math.max(y1, y + 1); }
      hangar = { x0, y0, x1, y1 };
    }

    /* the bands */
    const dropTop = H - 36;
    let y = py + ph + 1;
    const total = BANDS[zone].reduce((s, [, w]) => s + w, 0);
    while (y < dropTop - 6) {
      let p = r() * total, name = BANDS[zone][0][0];
      for (const [n, w] of BANDS[zone]) { p -= w; if (p <= 0) { name = n; break; } }
      const h = Math.min(dropTop - y, 7 + ri(8));
      if (h < 5) break;
      band[name](y, h);
      y += h;
    }
    /* the drop zone: open ground, sparse cover */
    scatter(dropTop, H - 3, 0.5);
    if (diff >= 2) patrol(dropTop, dropTop + 10);
    const drop = { x0: 5, y0: dropTop + 2, x1: W - 6, y1: H - 5 };

    /* badlands over everything */
    for (let yy = 0; yy < H; yy++) for (let x = 0; x < W; x++)
      if (yy < 3 || yy >= H - 3 || x < lw[yy] || x >= W - rw[yy]) set(x, yy, T.BAD);
    /* nothing built in the badlands */
    for (const o of objs) for (let yy = o.y; yy < o.y + o.h; yy++) for (let x = o.x; x < o.x + o.w; x++) if (get(x, yy) === T.BAD) o.gone = true;
    const live = objs.filter(o => !o.gone);
    live.forEach((o, i) => { o.id = i; delete o.gone; });

    const map = { w: W, h: H, zone, mission, seed, tiles, objs: live, pickup, drop, goal, hangar, spawns: [], carved: 0, ver: 0 };
    /* people only where people can stand */
    map.spawns = spawns.filter(s => {
      const tx = Math.floor(s.x), ty = Math.floor(s.y), t = AP.TILE[get(tx, ty)];
      return t.walk && get(tx, ty) !== T.MINE && !AP.objAt(map, tx, ty);
    });
    /* the drop zone's middle is always clear ground */
    const dc = { x: Math.floor(W / 2), y: H - 20 };
    clear(dc.x - 1, dc.y - 1, 3, 3);
    for (const s of map.spawns) if (s.route) s.route = s.route.filter(([x, y]) => AP.TILE[get(Math.floor(x), Math.floor(y))].enemy && !AP.objAt(map, Math.floor(x), Math.floor(y)));
    for (const s of map.spawns) if (s.route && s.route.length < 2) delete s.route;
    map.ver++;

    /* the proof: drop zone to every target and the pickup */
    for (let tries = 0; tries < 20; tries++) {
      const miss = AP.unreachable(map, dc.x, dc.y);
      if (!miss.length) break;
      AP.carve(map, dc.x, dc.y, miss[0]);
      map.carved++;
    }
    map.ver++;
    return map;
  };

  /* ---- solid ground, and what stands on it ---- */
  const cache = new WeakMap();
  /* the object standing on a tile, or null; rebuilt whenever map.ver moves */
  AP.objAt = (map, tx, ty) => {
    let c = cache.get(map);
    if (!c || c.ver !== map.ver) {
      const a = new Int16Array(map.w * map.h).fill(-1);
      for (const o of map.objs) {
        if (o.dead || o.hidden) continue;
        for (let y = o.y; y < o.y + o.h; y++) for (let x = o.x; x < o.x + o.w; x++) if (x >= 0 && y >= 0 && x < map.w && y < map.h) a[y * map.w + x] = o.id;
      }
      c = { ver: map.ver, a, ff: new Map() };
      cache.set(map, c);
    }
    if (tx < 0 || ty < 0 || tx >= map.w || ty >= map.h) return null;
    const i = c.a[ty * map.w + tx];
    return i < 0 ? null : map.objs[i];
  };
  AP.mapCache = map => { AP.objAt(map, 0, 0); return cache.get(map); };
  AP.tileAt = (map, tx, ty) => (tx < 0 || ty < 0 || tx >= map.w || ty >= map.h) ? T.BAD : map.tiles[ty * map.w + tx];
  /* can someone stand here? who: "p" the ranger, "e" the enemy */
  AP.passable = (map, tx, ty, who = "p") => {
    const t = AP.TILE[AP.tileAt(map, tx, ty)];
    if (!(who === "e" ? t.enemy : t.walk)) return false;
    const o = AP.objAt(map, tx, ty);
    return !o;
  };

  /* ---- the proof ---- */
  const N8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  function proofPass(map, x, y) {
    const t = AP.tileAt(map, x, y);
    if (!AP.TILE[t].walk || t === T.MINE) return false;
    const o = AP.objAt(map, x, y);
    return !o || o.k === "door";             /* a door is a grenade away from open */
  }
  function reach(map, sx, sy) {
    const W = map.w, seen = new Uint8Array(W * map.h), q = [sy * W + sx];
    seen[q[0]] = 1;
    for (let i = 0; i < q.length; i++) {
      const x = q[i] % W, y = (q[i] / W) | 0;
      for (const [dx, dy] of N8) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= map.h || seen[ny * W + nx]) continue;
        if (!proofPass(map, nx, ny)) continue;
        if (dx && dy && (!proofPass(map, x + dx, y) || !proofPass(map, x, y + dy))) continue;
        seen[ny * W + nx] = 1; q.push(ny * W + nx);
      }
    }
    return seen;
  }
  /* every place the mission needs reached: [x, y] tiles, a target's ring of neighbours counting as reaching it */
  function needs(map) {
    const out = [{ what: "pickup", tiles: [[Math.floor(map.pickup.x), Math.floor(map.pickup.y)]] }];
    for (const o of map.objs) {
      if (!TARGET_KINDS.has(o.k) && !AP.OBJ[o.k].gun) continue;
      const ring = [];
      for (let y = o.y - 1; y <= o.y + o.h; y++) for (let x = o.x - 1; x <= o.x + o.w; x++)
        if (x < o.x || y < o.y || x >= o.x + o.w || y >= o.y + o.h) ring.push([x, y]);
      out.push({ what: o.k, obj: o.id, tiles: ring });
    }
    for (const s of map.spawns) if (s.k === "officer" || s.k === "hostage") out.push({ what: s.k, tiles: [[Math.floor(s.x), Math.floor(s.y)]] });
    return out;
  }
  AP.unreachable = (map, sx, sy) => {
    const seen = reach(map, sx, sy);
    return needs(map).filter(n => !n.tiles.some(([x, y]) => x >= 0 && y >= 0 && x < map.w && y < map.h && seen[y * map.w + x]));
  };
  /* Cut the cheapest way open from (sx, sy) to a need: open ground costs 1,
   * anything in the way but the badlands and built things costs 25, and
   * whatever was in the way on the chosen path becomes open ground. */
  AP.carve = (map, sx, sy, need) => {
    const W = map.w, Hh = map.h, INF = 1e9, cost = new Float64Array(W * Hh).fill(INF), from = new Int32Array(W * Hh).fill(-1);
    const goal = new Set(need.tiles.filter(([x, y]) => x >= 0 && y >= 0 && x < W && y < Hh).map(([x, y]) => y * W + x));
    const buckets = [[sy * W + sx]];
    cost[sy * W + sx] = 0;
    let end = -1;
    for (let c = 0; c < buckets.length && end < 0; c++) {
      const b = buckets[c]; if (!b) continue;
      for (const i of b) {
        if (cost[i] !== c) continue;
        if (goal.has(i)) { end = i; break; }
        const x = i % W, y = (i / W) | 0;
        for (const [dx, dy] of N8.slice(0, 4)) {
          const nx = x + dx, ny = y + dy;
          if (nx < 1 || ny < 1 || nx >= W - 1 || ny >= Hh - 1) continue;
          const t = AP.tileAt(map, nx, ny), o = AP.objAt(map, nx, ny);
          if (t === T.BAD || (o && o.k !== "door")) continue;
          const step = proofPass(map, nx, ny) ? 1 : 25, nc = c + step, j = ny * W + nx;
          if (nc < cost[j]) { cost[j] = nc; from[j] = i; (buckets[nc] = buckets[nc] || []).push(j); }
        }
      }
    }
    for (let i = end; i >= 0; i = from[i]) {
      const x = i % W, y = (i / W) | 0;
      if (!proofPass(map, x, y)) map.tiles[i] = T.ROUGH;
    }
    map.ver++;
  };
})();
