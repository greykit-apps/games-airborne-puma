/* Airborne Puma -- the namespace and the small helpers everything shares.
 *
 * DOM-free: tools/sim-check.js and tools/mapcheck.js load this file, and the
 * engine, under node. Nothing here may read the clock or Math.random: the
 * engine's dice are AP.rand(S), so a mission is the same mission every time
 * it is played from the same seed and the same commands. */
"use strict";
var AP = globalThis.AP || {};
globalThis.AP = AP;

/* mulberry32, stepping the state it is handed: S.rs in a mission */
AP.rand = o => {
  let t = (o.rs = (o.rs + 0x6D2B79F5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
/* a private stream, for the map generator and the art's noise */
AP.mulberry = seed => { const o = { rs: seed | 0 }; return () => AP.rand(o); };
AP.ri = (r, n) => Math.floor(r() * n);           /* integer below n from a stream r() */
AP.pick = (r, a) => a[Math.floor(r() * a.length)];

AP.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
AP.dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

/* Thirty-two aim directions, as the C64's crosshair has: 0 east, 8 south,
 * 16 west, 24 north (y grows down the map). Eight walking directions are
 * every fourth one. */
AP.DIR32 = Array.from({ length: 32 }, (_, i) => {
  const a = i / 32 * Math.PI * 2;
  return [Math.round(Math.cos(a) * 1e6) / 1e6, Math.round(Math.sin(a) * 1e6) / 1e6];
});
AP.dirTo = (dx, dy) => ((Math.round(Math.atan2(dy, dx) / (Math.PI * 2) * 32) % 32) + 32) % 32;
AP.dirDiff = (a, b) => { const d = Math.abs(a - b) % 32; return d > 16 ? 32 - d : d; };
/* one step from a toward b, the short way round */
AP.turnToward = (a, b) => { if (a === b) return a; const d = ((b - a) % 32 + 32) % 32; return (a + (d < 16 ? 1 : 31)) % 32; };

AP.esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/* localStorage, tolerant of a private window or none at all */
AP.store = {
  get(k, d = null) { try { const v = globalThis.localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { globalThis.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* no storage */ } },
  del(k) { try { globalThis.localStorage.removeItem(k); } catch (e) { /* no storage */ } },
};
