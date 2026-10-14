/* Airborne Puma -- boot, title, the loop, and everything between.
 *
 * The greykit.games boot and title (the canon @gk-title block, STANDARD.md
 * §3, wired as PumaApproach wires it), then a mission: the briefing, the
 * fly-over, the ground, the debrief. The engine runs at fifty steps a second
 * of game time (or forty, or sixty: Settings), whatever the screen's rate. */
"use strict";
(() => {
  const E = AP.Engine, C = AP.C, UI = AP.UI, $ = id => document.getElementById(id);
  const game = AP.game = { mode: "boot", S: null, run: null, ui: { mapView: false, mapY: null, aids: {} }, step: 20, acc: 0, last: 0, overAt: 0, titleT: 0 };

  /* ---- sound on and off (STANDARD.md §8) ---- */
  const readMuted = () => { try { return globalThis.localStorage.getItem(AP.KEY_MUTED) === "1"; } catch (e) { return false; } };
  AP.SFX.muted = readMuted();
  game.toggleMute = () => {
    AP.SFX.unlock();
    AP.SFX.setMuted(!AP.SFX.muted);
    try { globalThis.localStorage.setItem("airbornepuma_muted_v1", AP.SFX.muted ? "1" : "0"); } catch (e) { /* no storage */ }
    syncSound();
    if (!AP.SFX.muted) { AP.SFX.play("menu"); if (game.mode === "title" && !SMALL.matches) AP.SFX.startTune(); }
    if (game.mode === "play") AP.HUD.toast(AP.SFX.muted ? "Sound off" : "Sound on", 15, 1200);
  };
  function syncSound() { const b = $("snd"); if (b) { b.setAttribute("aria-pressed", String(!AP.SFX.muted)); b.classList.toggle("muted", AP.SFX.muted); } }
  /* a phone or a small window: the page says so and stays quiet */
  const SMALL = matchMedia("(max-width: 759px), (max-height: 479px)");

  game.applySpeed = () => { game.step = 1000 / (AP.SPEEDS[AP.prefs.speed] || AP.SPEEDS.classic)[1]; };
  game.applyLook = () => { $("stage").classList.toggle("scan", !!AP.prefs.scanlines); };
  function syncAids() { const u = game.ui.aids; for (const [k] of AP.AID_LIST) u[k] = AP.aid(k); }
  game.syncAids = syncAids;

  /* ---- the title ---- */
  const TITLE_NAME = "Airborne Puma";
  function titleCfg() {
    const saved = AP.loadMission(), rangers = AP.Roster.list(), active = rangers.filter(r => r.status === "active");
    const best = active.slice().sort((a, b) => b.merit - a.merit)[0];
    const savedMeta = saved && saved.run ? `mission ${AP.MISSION[saved.run.mission].n}${saved.stage === "play" ? ", in the field" : ""}` : "";
    return {
      name: TITLE_NAME,
      primary: saved ? "resume" : "mission",
      items: [
        saved && { act: "resume", label: "Resume game", key: "R", meta: savedMeta },
        { act: "mission", label: "New mission", key: "N", meta: best ? `${AP.rankShort(best.rank)} ${best.name}` : "practice or veteran" },
        { act: "campaign", label: "Campaign", key: "P", meta: "all twelve" },
        { act: "roster", label: "Veteran roster", key: "V", meta: rangers.length ? `${rangers.length} ranger${rangers.length === 1 ? "" : "s"}` : "" },
        "gap",
        { act: "settings", label: "Settings", key: "S" },
        { act: "help", label: "Help", key: "?" },
        { act: "about", label: "About", key: "A" },
      ],
    };
  }
  function openTitle() {
    game.mode = "title";
    const el = $("title");
    el.innerHTML = titleHTML(Object.assign(titleCfg(), { scene: true }));
    el.querySelector("h1").insertAdjacentHTML("afterend", '<p class="gk-sub">Twelve missions behind enemy lines</p>');
    const cv = document.createElement("canvas");
    el.querySelector(".scene").appendChild(cv);
    sizeScene(cv);
    el.hidden = false;
    $("game").hidden = true;
    document.body.classList.add("on-title");
  }
  function sizeScene(cv) { const k = 3; cv.width = Math.ceil(innerWidth / k); cv.height = Math.ceil(innerHeight / k); }
  game.refreshTitle = () => { if (game.mode !== "title") return; openTitle(); revealTitle(); };
  game.toTitle = () => {
    UI.close(true);
    game.S = null; game.run = null; game.ui.mapView = false;
    AP.SFX.stopLoops();
    AP.Input.clear();
    openTitle(); revealTitle();
    if (!SMALL.matches) AP.SFX.startTune();
  };
  async function titleAct(a) {
    AP.SFX.unlock();
    if (a === "resume") return resume();
    if (a === "mission") return UI.assignment();
    if (a === "roster") return UI.roster();
    if (a === "campaign") return UI.assignment({ campaign: true });
    if (a === "settings") return UI.settings();
    if (a === "help") return UI.help();
    if (a === "about") return UI.about();
  }
  function titleKey(ev) {
    const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
    if (k === "Enter" || k === " " || k === "Tab" || k === "Shift") return;
    const menu = document.querySelector("#title .gk-menu"), hit = menu && titleKeyButton(menu, k);
    if (hit) { ev.preventDefault(); titleAct(hit.dataset.act); return; }
    if (menu) titleArrow(menu, ev);
  }

  /* ---- a mission, from the orders to the debrief ---- */
  game.brief = (run, back) => {
    UI.close(true);
    run = Object.assign({ campaign: false, rangerId: null }, run);
    if (!run.seed) run.seed = 1 + Math.floor(Math.random() * 2 ** 30);
    if (!run.pods) run.pods = AP.MISSION[run.mission].pods.map(p => p.slice());
    game.run = run; game.mode = "brief";
    game.saveBriefing(run);
    UI.briefing(run, back);
  };
  game.saveBriefing = run => AP.saveMission({ stage: "briefing", run });
  game.launch = run => {
    const S = E.newMission({ mission: run.mission, diff: run.diff, seed: run.seed, pods: run.pods,
      opts: { autoCarbine: AP.aid("autoCarbine"), podTake: AP.aid("podTake"), ffDrop: AP.aid("ffDrop") } });
    startPlay(S, run);
    /* a veteran's mission, once flown, is on their record however it ends */
    AP.saveMission(AP.aid("checkpoint") ? { stage: "play", run, S } : { stage: "flying", run });
    AP.HUD.toast(AP.MISSION[run.mission].name, 7, 3000);
  };
  function startPlay(S, run) {
    game.S = S; game.run = run; game.mode = "play"; game.overAt = 0;
    game.ui.mapView = false;
    AP.SFX.stopTune();
    $("title").hidden = true; $("title").innerHTML = "";
    document.body.classList.remove("on-title");
    $("game").hidden = false;
    AP.Input.clear(); AP.Input.run = false; AP.Input.crawl = !!S.player.crawl;
    syncAids(); fit();
    AP.Render.snap(S);
    game.acc = 0;
  }
  function resume() {
    const m = AP.loadMission();
    if (!m || !m.run) return;
    if (m.stage === "briefing") { game.brief(m.run); return; }
    if (m.stage === "play" && m.S) { startPlay(m.S, m.run); game.pause(); return; }
    /* a Classic mission abandoned in the field: aborted, and on the record */
    const S = E.newMission({ mission: m.run.mission, diff: m.run.diff, seed: m.run.seed, pods: m.run.pods });
    AP.finish(S, "aborted", "abort");
    const db = E.debrief(S), out = m.run.rangerId ? AP.Roster.apply(m.run.rangerId, db, m.run.campaign) : null;
    AP.clearMission();
    game.mode = "debrief";
    UI.debrief(m.run, db, out);
  }
  game.openMap = () => { if (!game.ui.mapView) toggleMap(); };
  game.pause = () => { if (game.mode !== "play" || UI.sheet) return; AP.Input.clear(); checkpoint(); UI.pause(); };
  game.unpause = () => { game.acc = 0; game.last = performance.now(); };
  game.leave = () => { checkpoint(); game.toTitle(); };
  game.abort = () => { if (!game.S) return; AP.finish(game.S, "aborted", "abort"); game.S.phase = "over"; finishMission(); };
  function checkpoint() {
    const S = game.S;
    if (!S || game.mode !== "play" || S.phase === "over" || S.end) return;
    if (AP.aid("checkpoint")) { const c = Object.assign({}, S); delete c.bot; AP.saveMission({ stage: "play", run: game.run, S: c }); }
  }
  function finishMission() {
    const S = game.S, run = game.run;
    if (!S || game.mode !== "play") return;
    AP.SFX.stopLoops();
    const db = E.debrief(S);
    const out = run.rangerId ? AP.Roster.apply(run.rangerId, db, run.campaign) : null;
    AP.clearMission();
    game.mode = "debrief";
    AP.SFX.play(db.result === "retrieved" && db.goal ? "goal" : "fail");
    UI.debrief(run, db, out);
  }

  /* ---- what happened this tick: sounds, and a word on the screen ---- */
  const TOAST = {
    podLost: ["Pod lost", 2], podLanded: null, greenlight: ["Green light", 13], noJump: ["Missed the drop zone", 2], badlands: ["Down in the badlands", 2],
    wound: ["Wounded", 2], kia: ["Killed in action", 2], winded: ["Winded", 7], uniform: ["You are wearing the enemy's uniform", 13], unmasked: ["Your disguise is blown", 2],
    raid: ["Two magazines and two grenades", 13], controls: ["The controls are exposed", 13], lever: ["The lever: the prisoners are out", 13],
    surrender: ["The officer surrenders", 13], flee: ["The officer is running", 7], pickupMoved: ["The pickup is here now", 7], pouch: ["The code pouch!", 13],
    spoiled: ["Seen! The photographs are spoiled", 2], photos: ["Photographs taken", 13], freed: ["The hostages are out", 13], execution: ["They are shooting the hostages", 2],
    alarmBeep: ["The alarm! Make some noise", 7], scramble: ["The fighters are scrambling", 2], takeoff: ["A fighter has taken off", 2], midnight: ["Set for midnight", 13],
    disarmed: ["Your bomb has been found", 2], recall: ["Osprey inbound", 7], osprey: ["The Osprey is at the pickup", 13], leaving: ["The Osprey has gone", 2],
    notYet: null, already: ["The Osprey is already coming", 15], noRecall: ["The Osprey cannot be called on this mission", 15], clockOut: ["Time is up", 2],
    goal: ["Goal: done. Get to the pickup", 13], ice: ["Thin ice!", 2], reinforce: null, pod: null,
    goAround: ["Missed the light: the Osprey comes round again", 7],
  };
  function events(S, evs) {
    const p = S.player, arctic = S.zone === "arctic";
    const at = e => e.x === undefined ? null : AP.dist(e.x, e.y, p.x, p.y);
    for (const e of evs) {
      switch (e.t) {
        case "shot": AP.SFX.play(e.by === "p" ? "shotP" : "shotE", e.by === "p" ? null : at(e), arctic && e.by !== "p"); break;
        case "boom": AP.SFX.play("boom", at(e), arctic); break;
        case "step": if (!e.crawl) AP.SFX.play(e.water ? "splash" : "step", null); break;
        case "knife": case "throw": case "empty": case "reload": case "select": case "clang": case "lever": case "click": case "mine": case "ladder": AP.SFX.play(e.t, at(e)); break;
        case "rocket": AP.SFX.play("rocket", at(e), arctic); break;
        case "flame": AP.SFX.play("flame", at(e)); break;
        case "die": AP.SFX.play("die", at(e)); break;
        case "armor": AP.SFX.play("armor"); break;
        case "wound": AP.SFX.play("wound"); break;
        case "ice": AP.SFX.play("ice", at(e)); break;
        case "spotted": if (at(e) < 12) AP.SFX.play("spotted", at(e)); break;
        case "alert":
          if (e.lv === 2) { AP.SFX.play("alert"); AP.HUD.toast("Full alert", 2); }
          else if (e.lv === 0 && game.ui.aids.status) AP.HUD.toast("The alert stands down", 13);
          break;
        case "alarmBeep": AP.SFX.play("beep"); break;
        case "pod": AP.SFX.play("pod"); AP.HUD.toast(e.contents.map(k => ({ mag: "magazine", gren: "grenade", law: "LAW", bomb: "bomb", aid: "first aid" })[k]).join(", "), 13); break;
        case "podDrop": AP.SFX.play("chute"); break;
        case "podLost": AP.SFX.play("podLost"); break;
        case "jump": AP.SFX.play("jump"); break;
        case "greenlight": AP.SFX.play("light"); break;
        case "recall": AP.SFX.play("recall"); break;
        case "plant": AP.SFX.play("click"); AP.HUD.toast(`Bomb planted: ${e.fuse} seconds`, 7); break;
        case "aid": AP.HUD.toast("First aid: stand still", 13); break;
        case "healed": AP.SFX.play("pod"); AP.HUD.toast("A wound dressed", 13); break;
        case "penalty": AP.HUD.toast(e.why, 2); break;
        case "failed": AP.SFX.play("fail"); AP.HUD.toast(e.why, 2, 3500); break;
        case "goal": AP.SFX.play("goal"); break;
        case "notYet": AP.HUD.toast(`The Osprey can come again in ${e.s}s`, 15); break;
        case "nothing": AP.SFX.play("empty"); break;
      }
      const t = TOAST[e.t];
      if (t) AP.HUD.toast(t[0], t[1]);
    }
  }
  /* the sounds that go on: rotors, and a mini-bunker's whine */
  function loops(S) {
    if (AP.SFX.muted || !AP.SFX.ctx) return;
    const o = S.osprey, p = S.player;
    let rotor = 0;
    if (S.phase === "drop" && !S.drop.chute && !S.drop.landed) rotor = 1;
    else if (S.phase === "drop" && S.drop.chute) rotor = Math.max(0, 0.6 - (S.drop.oy - S.drop.chute.y) / 20);
    else if (o && (o.st === "in" || o.st === "hover")) rotor = o.st === "hover" ? Math.max(0.15, 1 - AP.dist(p.x, p.y, S.map.pickup.x, S.map.pickup.y) / 25) : Math.max(0.05, 0.5 - o.t / 2000);
    AP.SFX.loop("rotor", rotor * (S.zone === "arctic" ? 0.6 : 1));
    let whine = 0;
    if (S.phase === "foot") for (const b of S.map.objs) if (b.k === "minib" && !b.dead) whine = Math.max(whine, 1 - AP.dist(b.x + 0.5, b.y + 0.5, p.x, p.y) / 8);
    AP.SFX.loop("whine", whine);
  }

  /* ---- the loop ---- */
  function step() {
    const S = game.S;
    const cmd = AP.Input.cmd(S);
    if (S.phase === "drop" && cmd.ff && !AP.aid("ffDrop")) cmd.ff = 0;
    AP.Render.remember(S);
    const evs = E.tick(S, cmd);
    events(S, evs);
    AP.Input.endTick();
    if (S.phase === "over" && !game.overAt) game.overAt = performance.now() + (S.end && S.end.result === "aborted" ? 1200 : 600);
  }
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(100, now - game.last); game.last = now;
    if (game.mode === "title") {
      const cv = document.querySelector("#title .scene canvas");
      if (cv) AP.Render.titleScene(cv, game.titleT++);
      return;
    }
    if (!game.S || (game.mode !== "play" && game.mode !== "debrief")) return;
    const S = game.S;
    if (game.mode === "play") {
      const fresh = AP.Input.pollPad(S);
      if (!UI.sheet) {
        if (fresh.includes("pause")) { game.pause(); return; }
        if (fresh.includes("map")) toggleMap();
      }
      if (!UI.sheet && !game.ui.mapView && S.phase !== "over") {
        game.acc += dt;
        let n = 0;
        while (game.acc >= game.step && n++ < 6) { game.acc -= game.step; step(); if (S.phase === "over") break; }
        if (n >= 6) game.acc = 0;
      }
      AP.Render.alpha = UI.sheet || game.ui.mapView ? 1 : AP.clamp(game.acc / game.step, 0, 1);
      if (game.overAt && now >= game.overAt) { game.overAt = 0; finishMission(); }
      loops(S);
    }
    AP.Render.draw(S, game.ui);
    AP.HUD.draw(S, AP.Render.g, game.ui);
  }
  function toggleMap() {
    const S = game.S;
    if (!S) return;
    if (!game.ui.mapView && S.phase !== "foot") { AP.HUD.toast("The map is for the ground", 15, 1400); return; }
    game.ui.mapView = !game.ui.mapView; game.ui.mapY = null;
    AP.SFX.play("menu");
    if (!game.ui.mapView) { game.acc = 0; }
  }

  /* ---- keys ---- */
  document.addEventListener("keydown", ev => {
    AP.SFX.unlock();
    if (game.mode === "title" && !AP.SFX.tune && !SMALL.matches) AP.SFX.startTune();
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (UI.sheet) { UI.key(ev); return; }
    const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
    if (k === "m" && !(ev.target.closest && ev.target.closest("input"))) { ev.preventDefault(); game.toggleMute(); return; }
    if (game.mode === "title") { titleKey(ev); return; }
    if (game.mode !== "play") return;
    const a = AP.Input.actionFor(ev.code);
    if (a) ev.preventDefault();
    if (game.ui.mapView) {
      if (a === "map" || a === "pause") toggleMap();
      else if (a === "up" || a === "down") game.ui.mapY = (game.ui.mapY || 0) + (a === "up" ? -6 : 6);
      return;
    }
    if (a === "pause") { game.pause(); return; }
    if (a === "map") { toggleMap(); return; }
    if (a === "aids") {
      AP.setAids(AP.prefs.aids === "field" ? "classic" : "field"); syncAids();
      AP.HUD.toast(AP.prefs.aids === "field" ? "Field aids" : "Classic", 7);
      return;
    }
    AP.Input.down(ev, game.S);
  });
  document.addEventListener("keyup", ev => AP.Input.up(ev));
  addEventListener("blur", () => { AP.Input.clear(); if (game.mode === "play") game.pause(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) { checkpoint(); if (game.mode === "play") game.pause(); } });
  addEventListener("pagehide", checkpoint);
  document.addEventListener("pointerdown", () => { AP.SFX.unlock(); if (game.mode === "title" && !AP.SFX.tune && !SMALL.matches) AP.SFX.startTune(); }, true);

  /* the mouse, for Mouse aim */
  function mouseAt(ev) { const r = $("screen").getBoundingClientRect(); AP.Input.mouse.x = (ev.clientX - r.left) / r.width * 320; AP.Input.mouse.y = (ev.clientY - r.top) / r.height * 200; }
  $("screen").addEventListener("pointermove", ev => { if (ev.pointerType !== "mouse") return; mouseAt(ev); AP.Input.mouse.over = true; AP.Input.mouse.used = true; });
  $("screen").addEventListener("pointerleave", () => { AP.Input.mouse.over = false; AP.Input.mouse.down = false; });
  $("screen").addEventListener("pointerdown", ev => { if (ev.pointerType !== "mouse" || ev.button !== 0) return; mouseAt(ev); AP.Input.mouse.used = true; AP.Input.mouse.over = true; AP.Input.mouse.down = true; });
  addEventListener("pointerup", ev => { if (ev.pointerType === "mouse") AP.Input.mouse.down = false; });
  $("screen").addEventListener("contextmenu", ev => ev.preventDefault());

  $("title").addEventListener("click", ev => { const b = ev.target.closest("[data-act]"); if (b) titleAct(b.dataset.act); });
  $("snd").addEventListener("click", () => game.toggleMute());
  $("pausebtn").addEventListener("click", () => game.pause());

  /* ---- the stage, as big as fits, square pixels ---- */
  function fit() {
    const s0 = Math.min((innerWidth - 16) / 320, (innerHeight - 16) / 200), si = Math.floor(s0);
    const s = si >= 2 && si / s0 > 0.8 ? si : s0;
    const st = $("stage");
    st.style.width = Math.floor(320 * s) + "px"; st.style.height = Math.floor(200 * s) + "px";
  }
  addEventListener("resize", () => { fit(); const cv = document.querySelector("#title .scene canvas"); if (cv) sizeScene(cv); });

  /* ---- boot ---- */
  function boot() {
    AP.buildArt(AP.prefs.palette);
    AP.Render.init($("screen"));
    game.applySpeed(); game.applyLook(); syncAids(); syncSound();
    injectTitleCSS();
    fit();
    const q = new URLSearchParams(location.search);
    if (q.has("play")) {
      /* debug: ?play=<mission>&diff=<0-3>&seed=<n>&land=1 straight into a practice mission */
      const id = AP.MISSION[q.get("play")] ? q.get("play") : "depot";
      const run = { mission: id, diff: +(q.get("diff") || 1), seed: +(q.get("seed") || 1), rangerId: null, campaign: false, pods: AP.MISSION[id].pods.map(p => p.slice()) };
      const S = E.newMission({ mission: id, diff: run.diff, seed: run.seed, pods: run.pods, opts: { autoCarbine: AP.aid("autoCarbine"), podTake: AP.aid("podTake"), ffDrop: AP.aid("ffDrop") } });
      if (q.has("land")) AP.skipDrop(S);
      startPlay(S, run);
    } else {
      const run = SMALL.matches ? { finish: async () => {}, cancel() {} } : runBoot({ lines: [bootReloadLine(), "sixteen colours: ok", "osprey on station"] });
      openTitle();
      const saved = AP.loadMission(), n = AP.Roster.list().length;
      run.finish([saved ? "a mission in progress" : n ? `${n} ranger${n === 1 ? "" : "s"} on the roster` : "roster: empty"]).then(() => revealTitle());
    }
    game.last = performance.now();
    requestAnimationFrame(frame);
  }
  boot();
})();
