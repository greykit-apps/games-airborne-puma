/* Airborne Puma -- colours.
 *
 * Every picture in the game is drawn from sixteen colours, by index: the
 * Commodore 64's own (Pepto's measured palette), or the same sixteen brought
 * up to date for a modern screen. Past the sixteen come four the C64 never
 * had, for the puma alone, as Commander Poom added a tawny to EGA: g tawny,
 * h its shade, i cream (muzzle), k the dark tip of the tail. */
"use strict";
AP.PALETTES = {
  c64: ["#000000", "#ffffff", "#68372b", "#70a4b2", "#6f3d86", "#588d43", "#352879", "#b8c76f",
    "#6f4f25", "#433900", "#9a6759", "#444444", "#6c6c6c", "#9ad284", "#6c5eb5", "#959595",
    "#c8945a", "#8a5f30", "#ecdcb8", "#2e1d0e"],
  modern: ["#0b0d12", "#f4f1e8", "#a8452f", "#6fc3d4", "#8a4fb0", "#4f8a3a", "#2f4a9c", "#e3cf7a",
    "#a8733a", "#5b4320", "#d98a6e", "#3a3f47", "#7a828c", "#9fd986", "#7d8fe0", "#b9bec4",
    "#d39a55", "#94612c", "#f3e2bd", "#2b1a0c"],
};
AP.COL = { BLK: 0, WHT: 1, RED: 2, CYN: 3, PUR: 4, GRN: 5, BLU: 6, YEL: 7, ORG: 8, BRN: 9, LRED: 10, DGRY: 11, GRY: 12, LGRN: 13, LBLU: 14, LGRY: 15,
  TAW: 16, TAWD: 17, CRM: 18, TIP: 19 };
AP.palName = "c64";
AP.pal = () => AP.PALETTES[AP.palName] || AP.PALETTES.c64;
