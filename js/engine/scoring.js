/* Airborne Puma -- merit, rank and decorations. DOM-free.
 *
 * Merit comes from the goal, from every enemy soldier and installation the
 * ranger accounts for, from staying unseen, and from time left on the clock;
 * wounds, lost prisoners and the missions' own penalties take it away. The
 * whole is scaled by difficulty. A captured ranger keeps half; an aborted
 * mission is worth nothing. */
"use strict";
(() => {
  const C = AP.C;

  AP.debrief = S => {
    const M = C.MERIT, m = AP.MISSION[S.mission], end = S.end || { result: "aborted" };
    const goal = AP.goalMet(S), lines = [];
    let kills = 0, nk = 0, inst = 0, ni = 0;
    for (const [k, n] of Object.entries(S.merit.kill)) { kills += (M[k] || 5) * n; nk += n; }
    for (const [k, n] of Object.entries(S.merit.inst)) { inst += (M[k] || 10) * n; ni += n; }
    if (nk) lines.push([`Enemy accounted for: ${nk}`, kills]);
    if (ni) lines.push([`Installations destroyed: ${ni}`, inst]);
    if (goal) lines.push(["Mission goal", m.bonus]);
    const quiet = goal && S.alert.fullAt < 0;
    if (quiet) lines.push(["Never on full alert", M.stealth]);
    const secs = Math.floor(S.clock / C.HZ);
    if (goal && end.result === "retrieved" && secs >= 10) lines.push([`${secs} seconds to spare`, Math.floor(secs / 10)]);
    if (S.merit.wounds) lines.push([`Wounds: ${S.merit.wounds}`, M.wound * S.merit.wounds]);
    const lost = S.en.filter(e => e.friend && e.dead).length;
    if (lost) lines.push([`${lost} ${S.mission === "pow" ? "prisoner" : "hostage"}${lost === 1 ? "" : "s"} lost`, M.lostFriend * lost]);
    for (const [why, n] of S.merit.notes) lines.push([why, n]);
    const raw = Math.max(0, lines.reduce((s, l) => s + l[1], 0));
    const mult = C.DIFF.merit[S.diff];
    let total = Math.round(raw * mult);
    if (end.result === "captured") total = Math.round(total / 2);
    if (end.result === "aborted") total = 0;
    return { mission: S.mission, diff: S.diff, result: end.result, cause: end.cause || null, goal, failed: S.obj.failed, lines, raw, mult, total,
      quiet, secs, freedPOW: S.mission === "pow" && goal && end.result === "retrieved" };
  };

  /* the rank a career's merit earns; Colonel is the campaign's alone */
  AP.rankFor = (merit, colonel) => {
    if (colonel) return C.RANKS.length - 1;
    let r = 0;
    for (let i = 0; i < C.RANKS.length - 1; i++) if (merit >= C.RANKS[i][2]) r = i;
    return r;
  };
  /* the decoration one mission's merit earns: the highest not yet held, the
   * second Commendation only after the first */
  AP.awardFor = (merit, held) => {
    let best = null;
    for (const [code, , need] of C.AWARDS) {
      if (merit < need || held.includes(code)) continue;
      if (code === "COM2" && !held.includes("COM1")) continue;
      best = code;
    }
    return best;
  };
  AP.awardName = code => (C.AWARDS.find(a => a[0] === code) || [code, code])[1];
})();
