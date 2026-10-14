/* Airborne Puma -- what each mission asks, and how it is judged. DOM-free.
 *
 * Every mission keeps its own record in S.obj. The engine calls in here when
 * something happens that a mission might care about (AP.objHook: a thing
 * destroyed, a man killed, the alarm raised, a bomb planted, the officer
 * taken, a noise made) and once a tick (AP.objTick). S.obj.goal says whether
 * the mission's goal is met; S.obj.failed that it no longer can be. */
"use strict";
(() => {
  const C = AP.C;
  const live = (S, k) => S.map.objs.filter(o => o.k === k);
  const center = o => [o.x + o.w / 2, o.y + o.h / 2];
  const inGoal = S => { const g = S.map.goal, p = S.player; return p.x >= g.x0 && p.x < g.x1 && p.y >= g.y0 && p.y < g.y1; };
  function penalty(S, n, why) { S.merit.pen += n; S.merit.notes.push([why, n]); S.ev.push({ t: "penalty", why }); }
  function fail(S, why) { if (S.obj.failed) return; S.obj.failed = why; S.ev.push({ t: "failed", why }); }
  /* the quiet missions: full alert before you are inside costs you */
  function stealth(S) {
    if (!S.obj.inside && inGoal(S)) S.obj.inside = true;
  }
  function earlyAlert(S, lv) { if (lv === 2 && !S.obj.inside && !S.obj.early) { S.obj.early = true; penalty(S, -100, "Full alert before you were inside"); } }

  const M = {
    depot: {
      init(S) { S.obj.need = ["shack", "magazine", "fuel"]; },
      tick(S) { S.obj.goal = S.obj.need.every(k => live(S, k).every(o => o.dead)); },
      status(S) { return `${S.obj.need.filter(k => live(S, k).every(o => o.dead)).length}/3 destroyed`; },
    },
    codebook: {
      init(S) { S.obj.search = 0; S.obj.have = false; },
      tick(S) {
        const r = live(S, "radio")[0], p = S.player;
        if (!r || S.obj.have || p.dead) return;
        const [cx, cy] = center(r);
        if (AP.dist(cx, cy, p.x, p.y) < 2.1) { if (++S.obj.search >= 150) { S.obj.have = true; S.obj.goal = true; S.ev.push({ t: "pouch" }); } }
        else S.obj.search = Math.max(0, S.obj.search - 1);
      },
      status(S) { return S.obj.have ? "Code pouch in hand" : S.obj.search ? `Searching ${Math.floor(S.obj.search / 1.5)}%` : "Find the radio"; },
    },
    aircraft: {
      init(S) { S.obj.scramble = -1; },
      tick(S) {
        const planes = live(S, "plane");
        if (S.obj.scramble > 0 && S.t >= S.obj.scramble) {
          S.obj.scramble = 0;
          for (const o of planes) if (!o.dead) { o.dead = true; o.flown = true; S.map.ver++; S.ev.push({ t: "takeoff", x: o.x + 1.5, y: o.y + 1 }); }
        }
        S.obj.goal = planes.length > 0 && planes.every(o => o.dead && !o.flown);
        if (planes.some(o => o.flown)) fail(S, "The fighters scrambled");
      },
      onAlert(S, lv) { if (lv === 2 && S.obj.scramble < 0 && !S.obj.goal) { S.obj.scramble = S.t + 1500; S.ev.push({ t: "scramble" }); } },
      status(S) { const p = live(S, "plane"); return `${p.filter(o => o.dead && !o.flown).length}/${p.length} fighters` + (S.obj.scramble > 0 ? " -- scrambling" : ""); },
    },
    officer: {
      init(S) { const e = S.en.find(e => e.k === "officer"); S.obj.officer = e ? e.id : -1; },
      tick(S) { const e = S.en.find(e => e.id === S.obj.officer); S.obj.goal = !!(e && e.aboard); },
      capture(S, e) {
        if (S.obj.taken) return;
        S.obj.taken = true;
        S.map.pickup = { x: Math.floor(e.x) + 0.5, y: Math.floor(e.y) + 0.5 };
        S.ev.push({ t: "pickupMoved" });
      },
      kill(S, e) { if (e.id === S.obj.officer) { penalty(S, -30, "The officer was killed"); fail(S, "The officer is dead"); } },
      status(S) { const e = S.en.find(e => e.id === S.obj.officer); return !e || e.dead ? "Officer dead" : e.aboard ? "Officer aboard" : e.st === "follow" ? "Officer in hand" + (e.wounded ? ", wounded" : "") : e.st === "flee" ? "Officer running" : "Find the officer"; },
    },
    pipeline: {
      tick(S) { S.obj.goal = live(S, "pump").every(o => o.dead); },
      status(S) { return S.obj.goal ? "Pumping station destroyed" : "Pumping station standing"; },
    },
    radar: {
      tick(S) { const d = live(S, "dish"); S.obj.goal = d.filter(o => o.dead).length >= Math.ceil(d.length / 2); },
      status(S) { const d = live(S, "dish"); return `${d.filter(o => o.dead).length}/${d.length} antennas`; },
    },
    sam: {
      tick(S) { stealth(S); S.obj.goal = live(S, "sam").every(o => o.dead); },
      onAlert: earlyAlert,
      status(S) { const d = live(S, "sam"); return `${d.filter(o => o.dead).length}/${d.length} launchers`; },
    },
    pow: {
      init(S) { S.obj.pulled = false; },
      tick(S) { stealth(S); S.obj.goal = S.en.some(e => e.k === "pow" && e.aboard); },
      onAlert: earlyAlert,
      obj(S, o) { if (o.k === "pyramid") { for (const l of live(S, "lever")) l.hidden = false; S.map.ver++; S.ev.push({ t: "controls" }); } },
      use(S) {
        const p = S.player, l = live(S, "lever").find(l => !l.hidden && AP.dist(l.x + 0.5, l.y + 0.5, p.x, p.y) < 1.7);
        if (!l || S.obj.pulled) return false;
        S.obj.pulled = true; l.pulled = true;
        S.ev.push({ t: "lever" });
        for (const pit of live(S, "pit")) {
          const x = pit.x + 1, y = pit.y + 1.6;
          const e = AP.newEnemy(S, { k: "pow", x, y, f: 8 });
          e.st = "follow";
        }
        return true;
      },
      status(S) { const n = S.en.filter(e => e.k === "pow" && !e.dead).length; return S.obj.pulled ? `${n} prisoner${n === 1 ? "" : "s"} free` : live(S, "pyramid").some(o => !o.dead) ? "Blow the pyramid" : "Kick the lever"; },
    },
    photo: {
      init(S) { S.obj.photo = 0; },
      tick(S) {
        const h = S.map.hangar, p = S.player;
        if (!h || S.obj.goal || p.dead) return;
        const inside = p.x >= h.x0 && p.x < h.x1 && p.y >= h.y0 && p.y < h.y1;
        if (!inside) return;
        if (S.alert.seenT === S.t) { if (S.obj.photo > 0) S.ev.push({ t: "spoiled" }); S.obj.photo = 0; return; }
        S.obj.photo++;
        if (S.obj.photo % 50 === 0) S.ev.push({ t: "click" });
        if (S.obj.photo >= 500) { S.obj.goal = true; S.ev.push({ t: "photos" }); }
      },
      status(S) { return S.obj.goal ? "Photographs taken" : S.obj.photo ? `Photographing ${Math.floor(S.obj.photo / 5)}%` : "Get into the hangar"; },
    },
    hostages: {
      init(S) { S.obj.killT = 0; },
      tick(S) {
        S.obj.goal = S.en.some(e => e.k === "hostage" && e.aboard);
        const door = live(S, "door")[0];
        /* the prison is watched: on full alert, with the door still shut, the guards turn on them */
        if (S.alert.lv === 2 && door && !door.dead && S.t >= S.obj.killT) {
          if (S.obj.killT) {
            const h = S.en.find(e => e.k === "hostage" && !e.dead && e.st === "wait");
            if (h) { AP.hurtEnemy(S, h, 9, "e", "carbine"); S.ev.push({ t: "execution" }); }
          }
          S.obj.killT = S.t + 400;
        }
        if (!S.en.some(e => e.k === "hostage" && !e.dead)) fail(S, "Every hostage is dead");
      },
      obj(S, o) { if (o.k === "door") { for (const e of S.en) if (e.k === "hostage" && !e.dead && e.st === "wait") e.st = "follow"; S.ev.push({ t: "freed" }); } },
      status(S) { const n = S.en.filter(e => e.k === "hostage" && !e.dead).length; return live(S, "door").some(o => !o.dead) ? `${n} held` : `${n} hostage${n === 1 ? "" : "s"} with you`; },
    },
    diversion: {
      init(S) { S.obj.alarm = false; S.obj.score = 0; S.obj.lastNoise = 0; S.obj.shotT = -99; },
      tick(S) {
        const m = AP.MISSION.diversion;
        if (!S.obj.alarm && S.phase === "foot" && S.clock <= m.alarmAt * C.HZ) { S.obj.alarm = true; S.obj.lastNoise = S.t; S.ev.push({ t: "alarmBeep" }); }
        if (S.obj.alarm && !S.obj.goal && !S.obj.failed && S.t - S.obj.lastNoise > 90 * C.HZ) fail(S, "The diversion went quiet");
        S.obj.goal = S.obj.goal || (S.obj.alarm && S.obj.score >= C.DIFF.div[S.diff] && !S.obj.failed);
      },
      noise(S, n) {
        if (!S.obj.alarm) { if (!S.obj.early) { S.obj.early = true; penalty(S, -100, "Noise before the alarm"); } return; }
        if (n.n === 1) { if (S.t - S.obj.shotT < 25) return; S.obj.shotT = S.t; }
        S.obj.score += n.n; S.obj.lastNoise = S.t;
      },
      kill(S, e, by) { if (S.obj.alarm && by === "p") { S.obj.score += 5; S.obj.lastNoise = S.t; } },
      obj(S, o, by) { if (S.obj.alarm && by === "p") { S.obj.score += 10; S.obj.lastNoise = S.t; } },
      status(S) {
        if (!S.obj.alarm) return `Lie low: alarm in ${Math.max(0, Math.ceil((S.clock - AP.MISSION.diversion.alarmAt * C.HZ) / C.HZ))}s`;
        return `Diversion ${Math.min(100, Math.floor(S.obj.score / C.DIFF.div[S.diff] * 100))}%`;
      },
    },
    sabotage: {
      tick(S) {
        S.obj.goal = live(S, "avfuel").every(o => o.dead);
        for (const b of S.bombs) {
          if (!b.sab || b.done) continue;
          const finder = S.en.find(e => !e.dead && !e.friend && e.k !== "tank" && AP.dist(e.x, e.y, b.x, b.y) < 1.6 &&
            (e.st === "pursue" || e.st === "investigate" || AP.rand(S) < 0.01));
          if (finder) { b.done = true; S.ev.push({ t: "disarmed", x: b.x, y: b.y }); }
        }
        S.bombs = S.bombs.filter(b => !b.done);
      },
      plant(S, b) {
        const d = live(S, "avfuel")[0];
        if (d && !d.dead && AP.dist(d.x + 1.5, d.y + 1, b.x, b.y) < 2.8) { b.t = C.BOMB.sabotage * C.HZ; b.sab = true; S.ev.push({ t: "midnight" }); }
      },
      status(S) { return S.obj.goal ? "Fuel dump destroyed" : S.bombs.some(b => b.sab) ? "Bomb set for midnight" : "Plant the bomb at the fuel dump"; },
    },
  };

  AP.objInit = S => { S.obj = { goal: false, failed: null }; const m = M[S.mission]; if (m.init) m.init(S); };
  AP.objTick = S => {
    const m = M[S.mission], was = S.obj.goal;
    if (m.tick) m.tick(S);
    if (S.obj.goal && !was) S.ev.push({ t: "goal" });
  };
  AP.objHook = (S, what, x, by) => {
    const m = M[S.mission];
    if (!m || !S.obj) return;
    if (what === "obj" && m.obj) m.obj(S, x, by);
    else if (what === "kill" && m.kill) m.kill(S, x, by);
    else if (what === "alert" && m.onAlert) m.onAlert(S, x);
    else if (what === "plant" && m.plant) m.plant(S, x);
    else if (what === "capture" && m.capture) m.capture(S, x);
    else if (what === "noise" && m.noise) m.noise(S, x);
  };
  AP.objStatus = S => M[S.mission].status(S);
  AP.objNoDecay = S => S.mission === "pow";
  AP.goalMet = S => !!S.obj.goal && !S.obj.failed;
  AP.recallAllowed = S => AP.MISSION[S.mission].recall !== false;

  /* Use: the lever, the ammunition shack */
  AP.interact = S => {
    const m = M[S.mission], p = S.player;
    if (m.use && m.use(S)) return true;
    const shack = live(S, "shack").find(o => !o.dead && !o.raided && AP.dist(o.x + 1.5, o.y + 1, p.x, p.y) < 2.4);
    if (shack) {
      shack.raided = true;
      p.ammo.mag += 2; p.ammo.gren += 2;
      S.ev.push({ t: "raid" });
      return true;
    }
    S.ev.push({ t: "nothing" });
    return false;
  };
})();
