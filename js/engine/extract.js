/* Airborne Puma -- getting out. DOM-free.
 *
 * Recall (the C64's left-arrow key) and, after a short delay, the Osprey
 * comes back over the pickup point and lets down a rope ladder. It waits a
 * while, not long. Touch the ladder and climb: anyone following you (a
 * prisoner, a hostage, an officer) comes too. If the clock runs out the
 * Osprey comes anyway; miss it then and the ranger is captured. */
"use strict";
(() => {
  const C = AP.C;

  AP.recall = S => {
    if (S.phase !== "foot" || S.end) return;
    if (!AP.recallAllowed(S)) { S.ev.push({ t: "noRecall" }); return; }
    const o = S.osprey;
    if (o && o.st !== "gone") { S.ev.push({ t: "already" }); return; }
    if (o && S.t < o.re) { S.ev.push({ t: "notYet", s: Math.ceil((o.re - S.t) / C.HZ) }); return; }
    S.osprey = { st: "in", t: C.INBOUND, wait: 0, re: 0 };
    S.ev.push({ t: "recall" });
  };

  AP.extractTick = S => {
    if (S.phase !== "foot") return;
    if (!S.end && S.clock > 0 && --S.clock === 0) {
      S.clockOut = true;
      S.ev.push({ t: "clockOut" });
      if (!S.osprey || S.osprey.st === "gone") S.osprey = { st: "in", t: 250, wait: 0, re: 0 };
    }
    const o = S.osprey;
    if (!o) return;
    if (o.st === "in") {
      if (--o.t <= 0) {
        o.st = "hover"; o.wait = C.DIFF.wait[S.diff] * C.HZ;
        if (S.clockOut) o.wait = Math.max(o.wait, 30 * C.HZ);
        S.ev.push({ t: "osprey" });
      }
    } else if (o.st === "hover") {
      const p = S.player, pk = S.map.pickup;
      if (!p.dead && !p.climbing && !p.aboard && !S.end && !p.kd && AP.dist(p.x, p.y, pk.x, pk.y) < 0.9) {
        p.climbing = C.CLIMB; p.x = pk.x; p.y = pk.y;
        S.ev.push({ t: "ladder" });
      }
      if (p.climbing || p.aboard || S.end) return;
      if (--o.wait <= 0) {
        o.st = "gone"; o.re = S.t + C.REAGAIN;
        S.ev.push({ t: "leaving" });
        if (S.clockOut) AP.finish(S, "captured", "missed");
      }
    } else if (o.st === "gone" && S.clockOut && !S.end) AP.finish(S, "captured", "missed");
  };

  AP.board = S => {
    const p = S.player, pk = S.map.pickup;
    p.aboard = true;
    for (const e of S.en) if (!e.dead && e.st === "follow" && (AP.dist(e.x, e.y, pk.x, pk.y) < 3.5 || AP.dist(e.x, e.y, p.x, p.y) < 3.5)) { e.aboard = true; S.ev.push({ t: "aboard", k: e.k }); }
    AP.objTick(S);
    AP.finish(S, "retrieved");
  };

  /* the end of the mission: retrieved, captured, kia or aborted */
  AP.finish = (S, result, cause = null) => {
    if (S.end) return;
    S.end = { result, t: S.t, goal: false, cause };
    S.end.goal = AP.goalMet(S);
    S.ev.push({ t: "end", result });
  };
})();
