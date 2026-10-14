/* Airborne Puma -- keys, pads and the mouse, turned into the engine's
 * command for the next tick.
 *
 * The C64's keys have their nearest modern places: F1 F3 F5 F7 still pick the
 * carbine, grenade, LAW and knife; the cursor keys still move; the left arrow
 * (the key under Esc, here) still calls the Osprey. Run and crawl toggle, as
 * CRSR and SPACE did -- or, as a Field aid, run is held on Shift. */
"use strict";
(() => {
  const I = AP.Input = { held: new Set(), pressed: new Set(), pad: new Set(), padPrev: new Set(),
    run: false, crawl: false, weapon: null, fuse: 0, mouse: { x: 0, y: 0, over: false, down: false, used: false }, device: "keys" };
  const BIND = {
    ArrowUp: "up", KeyW: "up", Numpad8: "up", ArrowDown: "down", KeyS: "down", Numpad2: "down", Numpad5: "down",
    ArrowLeft: "left", KeyA: "left", Numpad4: "left", ArrowRight: "right", KeyD: "right", Numpad6: "right",
    Numpad7: "upleft", Numpad9: "upright", Numpad1: "downleft", Numpad3: "downright",
    Space: "fire", KeyJ: "fire", Numpad0: "fire", NumpadEnter: "fire",
    ShiftLeft: "run", ShiftRight: "run", KeyR: "runToggle", KeyC: "crawl", KeyX: "crawl",
    Digit1: "w:carbine", Digit2: "w:gren", Digit3: "w:law", Digit4: "w:knife", Digit5: "w:bomb", Digit6: "w:aid", KeyB: "w:bomb",
    F1: "w:carbine", F3: "w:gren", F5: "w:law", F7: "w:knife",
    KeyE: "use", KeyH: "aid", Delete: "aid", Insert: "aid", KeyQ: "recall", Backquote: "recall",
    Comma: "turnL", Period: "turnR", KeyF: "ff",
    Tab: "map", Escape: "pause", KeyP: "pause", KeyL: "aids",
  };
  I.BIND = BIND;
  I.actionFor = code => BIND[code] || null;

  /* a key went down in play: true if it was the game's */
  I.down = (ev, S) => {
    const a = BIND[ev.code];
    if (!a) return false;
    I.device = "keys";
    if (!ev.repeat) I.press(a, S);
    I.held.add(a);
    return true;
  };
  I.up = ev => { const a = BIND[ev.code]; if (a) I.held.delete(a); };
  I.clear = () => { I.held.clear(); I.pad.clear(); I.mouse.down = false; };

  I.press = (a, S) => {
    I.pressed.add(a);
    if (a === "runToggle" || (a === "run" && !AP.aid("runHold"))) I.run = !I.run;
    if (a === "crawl") I.crawl = !I.crawl;
    if (a.startsWith("w:")) {
      const w = a.slice(2);
      /* the bomb again: the next fuse */
      if (w === "bomb" && S && S.player && S.player.weapon === "bomb") I.fuse = { 5: 10, 10: 15, 15: 5 }[S.player.fuse] || 10;
      I.weapon = w;
    }
    if (a === "cycle" && S && S.player) {
      const ws = AP.C.WEAPONS, i = ws.indexOf(S.player.weapon);
      I.weapon = ws[(i + 1) % ws.length];
    }
  };

  const on = a => I.held.has(a) || I.pad.has(a);

  /* the command for one tick */
  I.cmd = S => {
    let mx = 0, my = 0;
    if (on("left") || on("upleft") || on("downleft")) mx -= 1;
    if (on("right") || on("upright") || on("downright")) mx += 1;
    if (on("up") || on("upleft") || on("upright")) my -= 1;
    if (on("down") || on("downleft") || on("downright")) my += 1;
    if (I.stick) { if (Math.abs(I.stick.x) > 0.35) mx = Math.sign(I.stick.x); if (Math.abs(I.stick.y) > 0.35) my = Math.sign(I.stick.y); }
    mx = Math.sign(mx); my = Math.sign(my);
    let aim = null;
    if (AP.aid("mouseAim") && I.mouse.over && I.mouse.used && S.phase === "foot") {
      const cam = AP.Render.cam, p = S.player;
      aim = AP.dirTo(I.mouse.x + cam.x - p.x * AP.K.TS, I.mouse.y + cam.y + 11 - p.y * AP.K.TS);
    }
    const run = AP.aid("runHold") ? (on("run") || I.run) : I.run;
    const c = {
      mx, my, aim, turn: I.pressed.has("turnR") ? 1 : I.pressed.has("turnL") ? -1 : S.t % 6 ? 0 : on("turnR") ? 1 : on("turnL") ? -1 : 0,
      fire: on("fire") || (I.mouse.down && AP.aid("mouseAim")), use: on("use"), aid: on("aid"), recall: on("recall"),
      run, crawl: I.crawl, weapon: I.weapon, fuse: I.fuse, ff: on("ff"),
    };
    I.weapon = null; I.fuse = 0;
    /* a stance the engine refused (winded, or out of the water) is forgotten */
    if (S.player && S.player.tired) I.run = false;
    return c;
  };
  I.endTick = () => I.pressed.clear();

  /* ---- gamepads ---- */
  I.pollPad = S => {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const now = new Set();
    let sx = 0, sy = 0;
    for (const p of pads) {
      if (!p) continue;
      const b = i => p.buttons[i] && p.buttons[i].pressed;
      sx = p.axes[0] || 0; sy = p.axes[1] || 0;
      if (b(14)) now.add("left"); if (b(15)) now.add("right"); if (b(12)) now.add("up"); if (b(13)) now.add("down");
      if (b(0) || b(7)) now.add("fire");
      if (b(1)) now.add("crawl");
      if (b(2)) now.add("use");
      if (b(3)) now.add("cycle");
      if (b(4)) now.add("run");
      if (b(5)) now.add("recall");
      if (b(6)) now.add("aid");
      if (b(8)) now.add("map");
      if (b(9)) now.add("pause");
    }
    I.stick = Math.hypot(sx, sy) > 0.35 ? { x: sx, y: sy } : null;
    const fresh = [...now].filter(a => !I.padPrev.has(a));
    for (const a of fresh) { I.device = "pad"; I.press(a, S); }
    I.padPrev = now;
    I.pad = now;
    return fresh;
  };

})();
