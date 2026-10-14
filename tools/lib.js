/* The engine, loaded headless: the DOM-free scripts, in the page's order,
 * into a bare context with no document, no canvas and no sound. Shared by
 * tools/sim-check.js and tools/mapcheck.js. */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..");
const ENGINE_FILES = ["js/util.js", "js/tiles.js", "js/engine/const.js", "js/engine/mapgen.js", "js/engine/actors.js",
  "js/engine/weapons.js", "js/engine/alert.js", "js/engine/ai.js", "js/engine/objectives.js", "js/engine/airdrop.js",
  "js/engine/extract.js", "js/engine/scoring.js", "js/engine/world.js", "js/missions.js", "js/engine/bot.js"];
function load(files = ENGINE_FILES) {
  const ctx = { console, Math, JSON, Map, Set, WeakMap, Int16Array, Int32Array, Uint8Array, Uint16Array, Float64Array, Array, Object, Number, String, Infinity, NaN };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of files) {
    if (!fs.existsSync(path.join(ROOT, f))) continue;
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx, { filename: f });
  }
  return ctx.AP;
}
module.exports = { ROOT, ENGINE_FILES, load };
