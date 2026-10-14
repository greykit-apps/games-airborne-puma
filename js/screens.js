/* Airborne Puma -- the screens with words on them, each a whole C64 screen
 * of its own (css/airbornepuma.css): a title bar in reverse video, our 8x8
 * type, and the game's own pixel art inside: the ranger's portrait, rank
 * insignia, ribbons, and the ground itself from the map generator.
 *
 * The 1987 order: report to the personnel officer (a practice ranger, or a
 * veteran from the roster), pick a mission, set the difficulty, read the
 * orders, pack the supply pods, board the Osprey. Every step has a way back.
 * After the mission, the assessment: how the ranger came back, and why not,
 * the merit, the rank, the decorations, and a way to fly it again. */
"use strict";
(() => {
  const esc = AP.esc, C = AP.C;
  const UI = AP.UI = { sheet: null, aidOpen: false };
  const CREDIT = UI.CREDIT = 'Built by <a href="https://greykit.com/" target="_blank" rel="noopener">greykit.com</a>';
  const ITEM = { mag: "Magazine", gren: "Grenade", law: "LAW rocket", bomb: "Time bomb", aid: "First aid" };
  const ITEMS = { mag: ["magazine", "magazines"], gren: ["grenade", "grenades"], law: ["LAW rocket", "LAW rockets"], bomb: ["time bomb", "time bombs"], aid: ["first aid kit", "first aid kits"] };
  const RESULT = { retrieved: "Retrieved", captured: "Captured", kia: "Killed in action", aborted: "Aborted" };
  const ZONE_ORDER = ["desert", "temperate", "arctic"];
  const img = (c, w, h, cls = "px", alt = "") => `<img class="${cls}" src="${AP.artURL(c)}" width="${w}" height="${h}" alt="${esc(alt)}">`;

  /* the title bar's two icons, drawn: a chevron back, a cross */
  const ICON_BACK = '<svg class="ic" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M7.5 2 L3.5 6 L7.5 10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square"/></svg>';
  const ICON_X = '<svg class="ic" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M3 3 L9 9 M9 3 L3 9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square"/></svg>';
  /* ---- the sheet: a screen of its own, over whatever was showing; or, with
   * popup, a window over it, the screen behind dithered dark ---- */
  UI.open = (title, { tabs, html, onClick, onClose, onKey, back, tab = 0, wide = false, closable = true, popup = false }) => {
    UI.close(true);
    const el = document.createElement("div");
    el.className = "ap-sheet " + (popup ? "ap-pop" : "full") + (wide ? " wide" : "");
    el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", title);
    const draw = () => {
      el.innerHTML = '<div class="' + (popup ? "ap-win" : "sh-box") + '"><header class="sh-head">' + (back ? '<button data-back title="Back (Esc)">' + ICON_BACK + "Back</button>" : "") + "<h2>" + esc(title) + "</h2>" +
        (closable && !back && !popup ? '<button data-x title="Close (Esc)">' + ICON_X + "Close</button>" : "") + "</header>" +
        (tabs ? '<div class="sh-tabs" role="tablist" aria-label="' + esc(title) + '">' + tabs.map(([t], i) => '<button role="tab" id="tab-' + i + '" data-tab="' + i + '" aria-selected="' + (i === tab) + '" aria-controls="tabpanel" tabindex="' + (i === tab ? 0 : -1) + '">' + esc(t) + "</button>").join("") + "</div>" : "") +
        '<div class="sh-body"' + (tabs ? ' id="tabpanel" role="tabpanel" aria-labelledby="tab-' + tab + '" tabindex="0"' : "") + '><div class="sh-in">' + (tabs ? tabs[tab][1] : html()) + "</div></div></div>";
    };
    draw();
    const api = { refresh: () => { const b = el.querySelector(".sh-body"), y = b.scrollTop, f = document.activeElement && document.activeElement.dataset; draw(); el.querySelector(".sh-body").scrollTop = y; if (f) for (const k of ["set", "slot", "act"]) if (f[k]) { const n = el.querySelector(`[data-${k}="${f[k]}"]`); if (n) n.focus({ preventScroll: true }); } }, close: () => UI.close(), el };
    const setTab = i => { tab = (i + tabs.length) % tabs.length; draw(); el.querySelector('[data-tab="' + tab + '"]').focus(); };
    el.addEventListener("click", ev => {
      if (popup && ev.target === el && closable) return UI.close();
      const b = ev.target.closest("button"); if (!b) return;
      AP.SFX.play("menu");
      if (b.hasAttribute("data-x")) return UI.close();
      if (b.hasAttribute("data-back")) return goBack();
      if (b.dataset.tab !== undefined) return setTab(+b.dataset.tab);
      if (onClick) onClick(b, api, ev);
    });
    el.addEventListener("contextmenu", ev => { const b = ev.target.closest("button"); if (b && onClick && b.dataset.slot) { ev.preventDefault(); onClick(b, api, ev, true); } });
    el.addEventListener("toggle", ev => { if (ev.target.classList && ev.target.classList.contains("aid-list")) UI.aidOpen = ev.target.open; }, true);
    function goBack() { UI.close(true); back(); }
    document.body.appendChild(el);
    UI.sheet = { el, onClose, onKey, closable, back: back ? goBack : null, tabs: tabs ? setTab : null, tabAt: () => tab };
    for (const id of ["game", "title"]) { const n = document.getElementById(id); if (n) n.inert = true; }
    (el.querySelector("[autofocus]") || el.querySelector(".sh-body .primary") || el.querySelector('[role="tab"][aria-selected="true"]') || el.querySelector(".sh-body button") || el.querySelector("button")).focus({ preventScroll: true });
    return api;
  };
  UI.close = quiet => {
    if (!UI.sheet) return;
    const s = UI.sheet; UI.sheet = null;
    s.el.remove();
    for (const id of ["game", "title"]) { const n = document.getElementById(id); if (n) n.inert = false; }
    if (s.onClose && !quiet) s.onClose();
    if (!quiet && AP.game.mode === "title") AP.game.refreshTitle();
  };
  /* the arrows: from the focused control to the nearest one that way, by
   * where they sit on the screen, so a grid walks as a grid and a list as a
   * list. true when focus moved. */
  UI.walk = (root, key) => {
    const d = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[key], a = document.activeElement;
    if (!d || !a || !root.contains(a)) return false;
    const box = n => { const r = n.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, r }; }, o = box(a);
    let best = null, bestS = Infinity;
    for (const n of root.querySelectorAll("button:not(:disabled), summary")) {
      if (n === a || n.offsetParent === null || n.getAttribute("role") === "tab" || n.closest(".sh-head")) continue;
      const b = box(n), dx = b.x - o.x, dy = b.y - o.y, along = dx * d[0] + dy * d[1];
      /* only what lies that way, past the edge of the one we are on */
      if (along <= (d[0] ? o.r.width : o.r.height) / 4) continue;
      const s = along + Math.abs(d[0] ? dy : dx) * 3;
      if (s < bestS) { bestS = s; best = n; }
    }
    if (!best) return false;
    best.focus({ preventScroll: true }); best.scrollIntoView({ block: "nearest" });
    return true;
  };
  /* keys while a sheet is up: Escape goes back (or closes), Tab stays inside, arrows walk the tabs and the buttons */
  UI.key = ev => {
    const s = UI.sheet;
    if (s.onKey && s.onKey(ev)) return;
    if (ev.key === "Escape") { ev.preventDefault(); if (s.back) s.back(); else if (s.closable) UI.close(); return; }
    if (s.tabs && document.activeElement && document.activeElement.getAttribute("role") === "tab" && (ev.key === "ArrowRight" || ev.key === "ArrowLeft")) {
      ev.preventDefault(); s.tabs(s.tabAt() + (ev.key === "ArrowRight" ? 1 : -1)); return;
    }
    if (ev.key.startsWith("Arrow") && !(ev.target.closest && ev.target.closest("input")) && UI.walk(s.el, ev.key)) { ev.preventDefault(); return; }
    if (ev.key === "Tab") {
      const f = [...s.el.querySelectorAll('button:not(:disabled), input, summary, a[href], [tabindex]:not([tabindex="-1"])')].filter(n => n.offsetParent !== null);
      if (!f.length) return;
      ev.preventDefault();
      const i = f.indexOf(document.activeElement), d = ev.shiftKey ? -1 : 1;
      f[i < 0 ? 0 : (i + d + f.length) % f.length].focus();
    }
  };

  /* A question before something that cannot be undone, in a window over the
   * screen. Cancel has the focus, so a stray Enter keeps things as they are;
   * Escape and the dithered backdrop cancel. */
  UI.ask = (question, yes, title = yes + "?") => new Promise(resolve => {
    const back = document.activeElement;
    const el = document.createElement("div");
    el.className = "ap-ask";
    el.setAttribute("role", "alertdialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", title);
    el.innerHTML = '<div class="ap-win"><header class="sh-head"><h2>' + esc(title) + '</h2></header><div class="sh-body"><p>' + esc(question) +
      '</p><div class="row end"><button data-no class="primary">Cancel</button><button data-yes class="danger">' + esc(yes) + "</button></div></div></div>";
    const done = v => { document.removeEventListener("keydown", onKey, true); el.remove(); if (back && back.isConnected && back.focus) back.focus({ preventScroll: true }); resolve(v); };
    const onKey = ev => {
      if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); done(false); return; }
      if (ev.key === "Tab" || ev.key === "ArrowLeft" || ev.key === "ArrowRight") { const bs = [...el.querySelectorAll("button")], i = bs.indexOf(document.activeElement); ev.preventDefault(); bs[(i + (ev.shiftKey || ev.key === "ArrowLeft" ? -1 : 1) + bs.length) % bs.length].focus(); }
      ev.stopPropagation();
    };
    el.addEventListener("click", ev => { if (ev.target === el) return done(false); const b = ev.target.closest("button"); if (b) done(b.hasAttribute("data-yes")); });
    document.addEventListener("keydown", onKey, true);
    document.body.appendChild(el);
    el.querySelector("[data-no]").focus();
  });

  /* ---- pieces ---- */
  const portrait = (r, scale = 3) => {
    const look = !r ? "alive" : r.status === "kia" ? "memorial" : r.status === "captured" ? "captured" : "alive";
    return img(AP.portraitArt(look), 22 * scale, 24 * scale, "px portrait", r ? `${r.name}, ${look === "memorial" ? "killed in action" : look === "captured" ? "held by the enemy" : "on the roster"}` : "a practice ranger");
  };
  const insignia = (rank, scale = 2) => img(AP.insigniaArt(rank), 18 * scale, 22 * scale, "px insignia", AP.rankName(rank));
  const ribbons = (r, scale = 1) => r.awards.map(a => img(AP.ribbonArt(a.code), 26 * scale, 10 * scale, "px ribbon", AP.awardName(a.code))).join("");
  const statusOf = r => r.status === "captured" ? "held by the enemy" : r.status === "kia" ? "killed in action" : r.campaign && !r.campaign.done ? `campaign: mission ${r.campaign.next + 1} of 12` : `${r.log.length} mission${r.log.length === 1 ? "" : "s"}`;
  const rangerRow = (r, act) => `<li class="ranger ${r.status}">${portrait(r, 2)}<div class="who"><b>${esc(AP.rankName(r.rank))} ${esc(r.name)}</b>
      <span class="note">${r.merit} merit · ${statusOf(r)}</span><span class="ribbons">${ribbons(r, 2)}</span></div>${insignia(r.rank, 2)}${act ? `<div class="act">${act}</div>` : ""}</li>`;

  /* the installation, drawn from a generated map: the cards' pictures, cached */
  const thumbs = new Map();
  const missionThumb = id => {
    if (!thumbs.has(id)) {
      const map = AP.genMap({ mission: id, diff: 2, seed: 7 }), g = map.goal;
      thumbs.set(id, AP.artURL(AP.Render.thumb(map, map.zone, Math.max(0, g.y0), Math.min(18, g.y1 - g.y0), 8)));
    }
    return thumbs.get(id);
  };

  /* ---- 1. the personnel officer ---- */
  UI.assignment = ({ campaign = false } = {}) => {
    let naming = false;
    UI.open(campaign ? "Campaign: choose a ranger" : "Report to the personnel officer", { wide: true, back: () => AP.game.toTitle(),
      html: () => {
        const list = AP.Roster.list();
        return `${campaign ? `<p class="lede">A campaign is all twelve missions in the order your superiors set, at one difficulty, flown by one ranger. Only a campaign ranger can make Colonel, or earn the Medal of Honor.</p>` :
          `<div class="practice">${portrait(null, 2)}<div><button class="primary" data-act="practice">Practice ranger</button><p class="note">An average ranger from the ranks. Any mission, any difficulty; nothing is recorded.</p></div></div>`}
          <h3>Veteran rangers</h3>
          ${list.length ? `<ul class="roster">${list.map(r => rangerRow(r, `<button data-assign="${r.id}" ${r.status === "captured" ? "disabled" : ""}>${r.status === "captured" ? "Held" : campaign ? (r.campaign && !r.campaign.done ? "Continue" : "Begin") : "Assign"}</button><button data-retire="${r.id}" class="quiet">Retire</button>`)).join("")}</ul>` :
          `<p class="note">No veterans yet. Enlist one: everything they do is recorded here, in this browser.</p>`}
          ${naming ? `<div class="row"><label class="sr" for="ap-name">The new ranger's name</label><input id="ap-name" maxlength="12" placeholder="Name" autocomplete="off"><button data-act="enlist" class="primary">Enlist</button><button data-act="cancel">Cancel</button></div>` :
          `<div class="row"><button data-act="new"${campaign && !list.length ? ' class="primary"' : ""}>Enlist a new ranger</button></div>`}`;
      },
      onKey: ev => { if (naming && ev.key === "Enter" && document.activeElement && document.activeElement.id === "ap-name") { ev.preventDefault(); enlist(); return true; } return false; },
      onClick: async (b, api) => {
        if (b.dataset.act === "practice") { UI.close(true); UI.missions({ rangerId: null }); return; }
        if (b.dataset.act === "new") { naming = true; api.refresh(); const i = document.getElementById("ap-name"); if (i) i.focus(); return; }
        if (b.dataset.act === "cancel") { naming = false; api.refresh(); return; }
        if (b.dataset.act === "enlist") { enlist(); return; }
        if (b.dataset.assign) {
          const r = AP.Roster.get(+b.dataset.assign);
          UI.close(true);
          if (campaign) UI.campaign(r, () => UI.assignment({ campaign })); else UI.missions({ rangerId: r.id });
          return;
        }
        if (b.dataset.retire) {
          const r = AP.Roster.get(+b.dataset.retire);
          if (await UI.ask(`Retire ${AP.rankName(r.rank)} ${r.name}? A retired ranger is gone from the roster for good.`, "Retire")) { AP.Roster.retire(r.id); api.refresh(); }
        }
      },
    });
    function enlist() {
      const i = document.getElementById("ap-name"), name = i && i.value.trim();
      if (!name) { if (i) i.focus(); return; }
      const r = AP.Roster.create(name);
      UI.close(true);
      if (campaign) UI.campaign(r, () => UI.assignment({ campaign })); else UI.missions({ rangerId: r.id });
    }
  };

  /* a ranger's campaign: begun at a difficulty, or carried on */
  UI.campaign = (r, back) => {
    if (r.campaign && !r.campaign.done) { AP.game.brief({ rangerId: r.id, campaign: true, mission: AP.CAMPAIGN[r.campaign.next], diff: r.campaign.diff }, back); return; }
    UI.difficulty(diff => { r.campaign = { next: 0, goals: 0, diff, done: false }; AP.Roster.save(); AP.game.brief({ rangerId: r.id, campaign: true, mission: AP.CAMPAIGN[0], diff }, () => UI.campaign(r, back)); }, "Campaign difficulty", back);
  };

  /* ---- 2. the mission ---- */
  UI.missions = run => {
    const r = run.rangerId ? AP.Roster.get(run.rangerId) : null, fresh = !r || !r.log.length;
    UI.open("Mission selection", { wide: true, back: () => UI.assignment(),
      html: () => `<p class="lede">${r ? `${esc(AP.rankName(r.rank))} <b>${esc(r.name)}</b> reporting.` : "A practice ranger reporting."} Four missions in each zone.${fresh ? " New to it? Start with the depot: noise is allowed." : ""}</p>` +
        ZONE_ORDER.map(z => `<h3>${esc(AP.ZONES[z].name)}</h3><div class="missions">` + AP.MISSIONS.filter(m => m.zone === z).map(m => {
          const done = r && r.log.filter(l => l.mission === m.id && l.goal).length;
          return `<button data-m="${m.id}" class="${fresh && m.n === 1 ? "suggest" : ""}"><img class="thumb" src="${missionThumb(m.id)}" alt="" width="160" height="72"><b>${m.n}. ${esc(m.name)}</b><span>${esc(m.goalText)}${done ? ` · done ${done}×` : ""}${fresh && m.n === 1 ? " · start here" : ""}</span></button>`;
        }).join("") + "</div>").join("") +
        (r ? `<h3>Campaign</h3><div class="row"><button data-camp="1">${r.campaign && !r.campaign.done ? `Continue the campaign: mission ${r.campaign.next + 1} of 12` : "Begin a campaign: all twelve"}</button></div>` : ""),
      onClick: b => {
        if (b.dataset.camp) { UI.close(true); UI.campaign(r, () => UI.missions(run)); return; }
        if (b.dataset.m) {
          const m = b.dataset.m; UI.close(true);
          UI.difficulty(diff => AP.game.brief(Object.assign({}, run, { mission: m, diff }), () => UI.missions(run)), "Difficulty", () => UI.missions(run));
        }
      },
    });
  };

  /* ---- 3. difficulty ---- */
  const DIFF_NOTE = [
    "Fewer soldiers, worse shots, no grenades thrown at you; the body armour stops half the rounds. Merit at half.",
    "Grenades come back at you. Reinforcements on full alert. Merit at three quarters.",
    "The full garrison. Merit as it stands.",
    "More of them, better shots, reinforcements sooner; the Osprey waits less. Merit and a quarter.",
  ];
  UI.difficulty = (then, title = "Difficulty", back = null) => {
    const last = AP.prefs.diff ?? 1;
    UI.open(title, { back,
      html: () => `<div class="diffs">${C.DIFF.name.map((n, i) => `<button data-d="${i}" class="${i === last ? "primary" : ""}"><b><kbd>${i + 1}</kbd> ${esc(n)}</b><span>${esc(DIFF_NOTE[i])}</span></button>`).join("")}</div>`,
      onKey: ev => { const n = +ev.key; if (n >= 1 && n <= 4) { ev.preventDefault(); pick(n - 1); return true; } return false; },
      onClick: b => { if (b.dataset.d !== undefined) pick(+b.dataset.d); },
    });
    function pick(d) { AP.prefs.diff = d; AP.savePrefs(); UI.close(true); then(d); }
  };

  /* ---- 4. the orders, and the pods ---- */
  const tally = pods => {
    const n = {}; for (const p of pods) for (const k of p) n[k] = (n[k] || 0) + 1;
    return C.POD_ITEMS.filter(k => n[k]).map(k => `${n[k]} ${ITEMS[k][n[k] === 1 ? 0 : 1]}`).join(", ");
  };
  UI.briefing = (run, back) => {
    const m = AP.MISSION[run.mission], r = run.rangerId ? AP.Roster.get(run.rangerId) : null, z = AP.ZONES[m.zone];
    const pods = run.pods, clock = m.clock || C.CLOCK_S;
    /* the reconnaissance photo: the objective, from this mission's own map */
    const map = AP.genMap({ mission: run.mission, diff: run.diff, seed: run.seed }), g = map.goal;
    const recon = AP.artURL(AP.Render.thumb(map, map.zone, Math.max(0, g.y0), Math.min(20, g.y1 - g.y0), 8));
    const slotLabel = (i, j, it) => `Pod ${i + 1}, slot ${j + 1}: ${ITEM[it]}. Click for the next item, right-click for the one before.`;
    UI.open("Mission orders", { wide: true, back,
      html: () => `<h3 class="mname">${m.n}. ${esc(m.name)}</h3>
        <p class="meta">${run.campaign ? `Campaign, mission ${(r.campaign.next || 0) + 1} of 12 · ` : ""}${esc(z.name)} · ${esc(C.DIFF.name[run.diff])} · ${Math.floor(clock / 60)}:${String(clock % 60).padStart(2, "0")} on the clock · ${r ? `${esc(AP.rankName(r.rank))} ${esc(r.name)}` : "practice ranger"}</p>
        <div class="orders"><div class="text">
          <p>${esc(m.brief)}</p>
          <p><b>Goal:</b> ${esc(m.goalText)}.</p>
          <p class="note">${esc(z.note)}${m.recall === false ? " The Osprey cannot be recalled on this mission." : ""}</p>
        </div><figure class="recon"><img class="px" src="${recon}" alt="Reconnaissance photograph of the objective" width="320" height="${Math.min(20, g.y1 - g.y0) * 8}"><figcaption>Reconnaissance: the objective, north end of the area.</figcaption></figure></div>
        <h3>Supply pods</h3>
        <p class="note">Three pods, four things in each. Kick them out over open ground on the way in: a pod that lands in a ditch, on rocks or trees, on wire or in water is lost. Click a slot for the next item; right-click for the one before.</p>
        <div class="pods">${pods.map((p, i) => `<div class="pod" role="group" aria-label="Pod ${i + 1}"><span>Pod ${i + 1}</span>${p.map((it, j) => `<button data-slot="${i}.${j}" class="it-${it}" aria-label="${esc(slotLabel(i, j, it))}">${esc(ITEM[it])}</button>`).join("")}</div>`).join("")}</div>
        <p class="kit"><b>You land with</b> a carbine and 4 magazines, 3 grenades, 1 LAW rocket, 1 time bomb, 1 first aid kit, and the knife.<br><b>In the pods:</b> <span id="ap-tally">${tally(pods)}</span>.</p>
        <div class="row end"><button data-act="go" class="primary">Board the Osprey</button></div>`,
      onClick: (b, api, ev, prev) => {
        if (b.dataset.slot) {
          const [i, j] = b.dataset.slot.split(".").map(Number), list = C.POD_ITEMS;
          const step = prev || (ev && ev.shiftKey) ? list.length - 1 : 1;
          pods[i][j] = list[(list.indexOf(pods[i][j]) + step) % list.length];
          b.className = "it-" + pods[i][j]; b.textContent = ITEM[pods[i][j]]; b.setAttribute("aria-label", slotLabel(i, j, pods[i][j]));
          const t = document.getElementById("ap-tally"); if (t) t.textContent = tally(pods);
          AP.game.saveBriefing(run);
          return;
        }
        if (b.dataset.act === "go") { UI.close(true); AP.game.launch(run); }
      },
      onClose: () => AP.game.toTitle(),
    });
  };

  /* ---- 5. after the mission ---- */
  /* how it ended, in a sentence, and what to do about it next time */
  const CAUSE = {
    rifle: ["Shot by a rifleman.", "Crawl from cover to cover and fire first: a soldier has to see you before they can aim."],
    guard: ["Shot by a sentry.", "Sentries watch one way. Come at them from the side, or use the knife."],
    elite: ["Shot by an elite soldier.", "Elites take two hits. Fight them from a trench, not in the open."],
    sniper: ["Shot by a sniper lying in wait.", "Snipers lie still and see far. Cross open ground crawling, or go round."],
    officer: ["Shot by an officer's pistol.", "Officers are poor shots but not harmless. Close in fast with a gun in hand."],
    at: ["Hit by an anti-tank rocket.", "Rocket troops fire at range and at men in cover. Keep moving and close the distance."],
    rocket: ["Hit by a rocket.", "Rockets come from anti-tank troops and minitanks. Keep moving; a LAW stops a minitank."],
    flamer: ["Caught by a flamethrower.", "Flamethrowers reach three tiles. Keep your distance and shoot first."],
    flame: ["Caught by a flamethrower.", "Flamethrowers reach three tiles. Keep your distance and shoot first."],
    mg: ["Cut down by a machine-gun nest.", "A nest covers an arc in front of it. Come at it from the side and lob a grenade."],
    bunker: ["Shot from a bunker.", "Bunkers need a LAW or a time bomb. Stay out of the slit's arc until you have one."],
    turret: ["Shot by a turret.", "Turrets turn to follow you. A LAW stops one; until then, stay out of its sight."],
    minib: ["Shot by an automated mini-bunker.", "Mini-bunkers fire at anything moving upright. Crawl past them, or grenade them."],
    tank: ["Run down by a minitank.", "Minitanks follow you into trenches. Keep a LAW for them and fire from cover."],
    mine: ["Stepped on a mine.", "Minefields are marked on the ground. Find the clear lane, or open one with a grenade."],
    prox: ["Set off a proximity bomb.", "The bombs on posts go off at a step. Crawl past them."],
    gren: ["Caught by an enemy grenade.", "Soldiers throw grenades at a ranger in cover. Move when one comes over."],
    "gren:own": ["Caught in your own grenade's blast.", "Hold fire longer to throw further: nothing near the burst is safe."],
    "law:own": ["Caught in your own rocket's blast.", "A LAW fired at something close hits you too. Back off before firing."],
    "bomb:own": ["Caught by your own time bomb.", "Press 5 again for a 10 or 15 second fuse, and be well away."],
    ice: ["Fell through thin ice.", "Thin ice gives way under a runner at once, and under anyone who stands too long. Walk, or go round."],
    drowning: ["Drowned.", "Crawling through water hides you, but not for long."],
    landing: ["Hurt on landing.", "Steer the parafoil clear of trenches and wire; turning spills air, so steer early."],
    badlands: ["Came down in the badlands and was taken.", "Steer the parafoil early: turning spills air and brings you down faster."],
    missed: ["Not at the pickup when the Osprey left, with the clock run out.", "Call the Osprey (Q) with time to spare, and be at the X when it comes."],
    noJump: ["Never jumped.", "Fire on the green light to jump. The Osprey comes round once more if you miss it."],
    abort: ["Aborted from the field.", ""],
  };
  UI.debrief = (run, db, out) => {
    const m = AP.MISSION[db.mission], r = run.rangerId ? AP.Roster.get(run.rangerId) || (AP.Roster.data.memorial.find(x => x.id === run.rangerId)) : null;
    const win = db.result === "retrieved" && db.goal;
    const head = db.result === "retrieved" ? (db.goal ? "Mission accomplished" : "Retrieved, goal not met") : RESULT[db.result];
    const tone = win ? "ok" : db.result === "kia" ? "danger" : db.result === "aborted" ? "dim" : "warn";
    const cause = CAUSE[db.cause] || null;
    const nextCamp = run.campaign && r && r.status === "active" && r.campaign && !r.campaign.done;
    const retry = !run.campaign && (!r || r.status === "active");
    const fallen = out && out.kia;
    const hero = r ? (fallen ? `<figure class="memorial">${portrait(r, 4)}<figcaption><b>${esc(AP.rankName(r.rank))} ${esc(r.name)}</b><span>Killed in action: ${esc(m.name)}</span>
        <span>${r.log.length} mission${r.log.length === 1 ? "" : "s"} · ${r.merit} merit</span><span class="ribbons">${ribbons(r, 2)}</span><span class="note">On the memorial, with the roster.</span></figcaption></figure>`
      : `<figure class="hero">${portrait(r, 4)}${insignia(r.rank, 4)}</figure>`) : `<figure class="hero">${img(AP.portraitArt(db.result === "kia" ? "memorial" : db.result === "captured" ? "captured" : "alive"), 88, 96, "px portrait", "")}</figure>`;
    UI.open("After the mission", { wide: true, closable: false,
      html: () => `<div class="debrief">${hero}<div class="report">
        <h3 class="mname big ${tone}">${esc(head)}</h3>
        <p class="meta">${m.n}. ${esc(m.name)} · ${esc(C.DIFF.name[db.diff])}</p>
        ${cause ? `<p class="cause"><b>${esc(cause[0])}</b>${cause[1] ? ` ${esc(cause[1])}` : ""}</p>` : ""}
        ${db.failed ? `<p class="cause"><b>${esc(db.failed)}.</b></p>` : ""}
        <table class="merit">${db.lines.map(([t, n]) => `<tr><td>${esc(t)}</td><td class="num">${n > 0 ? "+" : ""}${n}</td></tr>`).join("")}
        <tr class="sum"><td>Merit${db.mult !== 1 ? ` (× ${db.mult} for difficulty)` : ""}${db.result === "captured" ? ", halved: captured" : ""}${db.result === "aborted" ? ": none for an aborted mission" : ""}</td><td class="num">${db.total}</td></tr></table>
        ${r && !fallen ? `<p>${esc(AP.rankName(r.rank))} ${esc(r.name)}, ${r.merit} merit.${db.result === "captured" ? " Held in the enemy's camp until another ranger frees them on mission 8." : ""}</p>` : ""}
        ${!r ? `<p class="note">A practice ranger: nothing is recorded.</p>` : ""}
        </div></div>
        ${out && out.promoted && !fallen ? `<div class="honour">${insignia(r.rank, 4)}<p><b>Promoted to ${esc(AP.rankName(r.rank))}.</b></p></div>` : ""}
        ${out && out.award ? `<div class="honour">${img(AP.ribbonArt(out.award), 104, 40, "px ribbon", AP.awardName(out.award))}<p><b>Awarded the ${esc(AP.awardName(out.award))}.</b></p></div>` : ""}
        ${out && out.liberated ? `<p class="ok">${out.liberated} captured ranger${out.liberated === 1 ? "" : "s"} back on active duty.</p>` : ""}
        ${out && out.campaignDone ? `<p><b>Campaign complete:</b> ${r.campaign.goals} of 12 goals.${out.colonel ? " Promoted to Colonel." : ""}</p>` : ""}
        <div class="row end">${nextCamp ? `<button data-act="next" class="primary">Next campaign mission</button>` : ""}
          ${retry ? `<button data-act="retry" class="${nextCamp || win ? "" : "primary"}">Fly it again</button>` : ""}
          ${retry ? `<button data-act="again" class="${win && !nextCamp ? "primary" : ""}">Another mission</button>` : ""}
          <button data-act="title" ${!nextCamp && !retry ? 'class="primary"' : ""}>Title</button></div>`,
      onClick: b => {
        const a = b.dataset.act;
        if (a === "next") { UI.close(true); AP.game.brief({ rangerId: r.id, campaign: true, mission: AP.CAMPAIGN[r.campaign.next], diff: r.campaign.diff }); }
        if (a === "retry") { UI.close(true); AP.game.brief({ rangerId: run.rangerId, campaign: false, mission: run.mission, diff: run.diff, seed: run.seed, pods: run.pods.map(p => p.slice()) }); }
        if (a === "again") { UI.close(true); UI.missions({ rangerId: r ? r.id : null }); }
        if (a === "title") { UI.close(true); AP.game.toTitle(); }
      },
    });
  };

  /* ---- the roster, to read ---- */
  UI.roster = () => {
    const d = AP.Roster.data;
    const recent = r => r.log.slice(-3).reverse().map(l => `${esc(AP.MISSION[l.mission].name)}: ${esc(RESULT[l.result])}${l.goal ? ", goal met" : ""} (${l.merit})`).join("<br>");
    UI.open("Veteran roster", { wide: true,
      html: () => `${d.rangers.length ? `<ul class="roster">${d.rangers.map(r => rangerRow(r, `<span class="note recent">${recent(r)}</span>`)).join("")}</ul>` : `<p class="note">No veterans. Enlist one from New mission or Campaign.</p>`}
        <div class="row"><button data-act="enlist">Enlist or assign a ranger</button></div>
        ${d.memorial.length ? `<h3>The memorial</h3><ul class="roster memorial">${d.memorial.map(r => rangerRow(r, `<span class="note recent">${recent(r)}</span>`)).join("")}</ul>` : ""}
        <h3>Ranks</h3><div class="ranks">${C.RANKS.map((rk, i) => `<span>${insignia(i, 2)}<b>${rk[0]}</b> ${esc(rk[1])}</span>`).join("")}</div>
        <p class="note">Merit earns the rank; Colonel is for a campaign ranger with ten goals or more.</p>
        <h3>Decorations</h3><div class="ranks decos">${C.AWARDS.map(a => `<span>${img(AP.ribbonArt(a[0]), 52, 20, "px ribbon", "")}<b>${esc(a[1])}</b><i class="note">${isFinite(a[2]) ? `${a[2]} merit in one mission` : "a campaign, every goal met"}</i></span>`).join("")}</div>`,
      onClick: b => { if (b.dataset.act === "enlist") { UI.close(true); UI.assignment(); } },
    });
  };

  /* ---- pause ---- */
  UI.pause = () => {
    const S = AP.game.S, onFoot = S.phase === "foot";
    UI.open("Paused", { popup: true,
      html: () => `<h3 class="mname">${esc(AP.MISSION[S.mission].name)}</h3>
        <p class="meta">${AP.HUD.mmss(S.clock)} on the clock · ${esc(AP.objStatus(S))}</p>
        <div class="col"><button data-act="resume" class="primary">Resume</button>
        <button data-act="map" ${onFoot ? "" : "disabled"}>Map <kbd>Tab</kbd>${onFoot ? "" : " <span>(on the ground)</span>"}</button>
        <button data-act="settings">Settings</button><button data-act="help">Help</button>
        <button data-act="abort">${AP.aid("checkpoint") ? "Leave: resume it later" : "Abort the mission"}</button></div>
        <p class="note keys">${[["Space", "fire"], ["Shift", "run"], ["C", "crawl"], ["1</kbd>–<kbd>6", "weapons"], ["E", "use"], ["H", "first aid"], ["Q", "Osprey"], ["Tab", "map"]].map(([k, w]) => `<span><kbd>${k}</kbd> ${w}</span>`).join(" · ")}</p>`,
      onClick: async b => {
        const a = b.dataset.act;
        if (a === "resume") UI.close();
        if (a === "map") { UI.close(); AP.game.openMap(); }
        if (a === "settings") { UI.close(true); UI.settings(() => UI.pause()); }
        if (a === "help") { UI.close(true); UI.help(0, () => UI.pause()); }
        if (a === "abort") {
          if (AP.aid("checkpoint")) { UI.close(true); AP.game.leave(); return; }
          if (await UI.ask("Abort the mission? It counts for nothing, and a veteran's record says so.", "Abort")) { UI.close(true); AP.game.abort(); }
        }
      },
      onClose: () => AP.game.unpause(),
    });
  };

  /* ---- Settings (greykit.games STANDARD.md §7: the game's own, Sound, speed, This browser) ---- */
  function showSettings() {
    const pill = (on, label, act) => `<button data-set="${act}" class="pill${on ? " on" : ""}" aria-pressed="${on}">${label}</button>`;
    const sw = (k, n) => `<button data-set="aidt:${k}" role="switch" aria-checked="${AP.aid(k)}" aria-label="${esc(n)}" class="pill switch${AP.aid(k) ? " on" : ""}">${AP.aid(k) ? "On" : "Off"}</button>`;
    UI.open("Settings", { wide: true,
      html: () => { const changed = Object.keys(AP.prefs.over).length, adj = changed ? ", adjusted" : ""; return `
        <h3>Aids</h3>
        <div class="row">${pill(AP.prefs.aids === "classic", "Classic" + (AP.prefs.aids === "classic" ? adj : ""), "aids:classic")}${pill(AP.prefs.aids === "field", "Field" + (AP.prefs.aids === "field" ? adj : ""), "aids:field")}</div>
        <p class="note">Classic is the 1987 game: the indicators in the corner and nothing else, run and crawl as toggles, pods carried as weight, a mission played through. Field adds the helps below. <kbd>L</kbd> switches between them in a mission.</p>
        <details class="aid-list"${UI.aidOpen ? " open" : ""}><summary>Set each aid on its own${changed ? ` (${changed} changed)` : ""}</summary>
        <table class="aids">${AP.AID_LIST.map(([k, n, note]) => `<tr><td><b>${esc(n)}</b><br><span class="note">${esc(note)}</span></td><td class="act">${sw(k, n)}</td></tr>`).join("")}</table></details>
        <h3>Look</h3>
        <div class="row">${pill(!AP.prefs.scanlines, "No scanlines", "scan:0")}${pill(AP.prefs.scanlines, "Scanlines", "scan:1")}</div>
        <p class="note">Faint lines across the field, as an old television drew it.</p>
        <h3>Sound</h3>
        <div class="row">${pill(!AP.SFX.muted, "On", "mute:0")}${pill(AP.SFX.muted, "Off", "mute:1")}</div>
        <p class="note">Gunfire, footsteps, the Osprey, the alarms; the march on the title. <kbd>M</kbd> switches it anywhere.</p>
        <h3>Game speed</h3>
        <div class="row">${Object.entries(AP.SPEEDS).map(([k, [n, hz]]) => pill(AP.prefs.speed === k, `${n} (${hz})`, "speed:" + k)).join("")}</div>
        <p class="note">Steps of the game each second; Classic is the C64's fifty. Every distance is in steps, so a slower clock changes nothing but time.</p>
        <h3>This browser</h3>
        <div class="row"><button data-set="forget" class="danger">Forget everything</button></div>
        <p class="note">Clears everything Airborne Puma keeps in this browser: the veteran roster and the memorial, a mission in progress, and these settings.</p>`; },
      onClick: async (b, api) => {
        const v = b.dataset.set; if (!v) return;
        if (v === "forget") {
          if (await UI.ask("Forget everything Airborne Puma has saved in this browser: every ranger on the roster, the memorial, a mission in progress, and your settings? This cannot be undone.", "Forget everything")) AP.forgetEverything();
          return;
        }
        const [k, a, c] = v.split(":");
        if (k === "aids") AP.setAids(a);
        else if (k === "aidt") AP.setAid(a, !AP.aid(a));
        else if (k === "pal") { AP.prefs.palette = a; AP.savePrefs(); AP.buildArt(a); AP.Render.small = null; thumbs.clear(); }
        else if (k === "scan") { AP.prefs.scanlines = a === "1"; AP.savePrefs(); AP.game.applyLook(); }
        else if (k === "mute") { if ((a === "1") !== AP.SFX.muted) AP.game.toggleMute(); }
        else if (k === "speed") { AP.prefs.speed = a; AP.savePrefs(); AP.game.applySpeed(); }
        void c;
        AP.game.syncAids();
        api.refresh();
      },
      onClose: () => { const f = UI.settingsAfter; UI.settingsAfter = null; if (f) f(); },
    });
  }
  UI.settings = after => { UI.settingsAfter = after; showSettings(); };

  /* ---- Help and About ---- */
  const KEYS_TABLE = `<table class="keys">
    <tr><td>Move</td><td><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd>, <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or the numpad</td></tr>
    <tr><td>Fire</td><td><kbd>Space</kbd> or <kbd>J</kbd>; hold it and press a direction to swing the crosshair without walking</td></tr>
    <tr><td>Fine aim</td><td><kbd>,</kbd> <kbd>.</kbd> a step either way; with Mouse aim, point and click</td></tr>
    <tr><td>Run</td><td><kbd>Shift</kbd> (held with Field aids, a toggle in Classic), or <kbd>R</kbd> to toggle</td></tr>
    <tr><td>Crawl</td><td><kbd>C</kbd> or <kbd>X</kbd>, toggle</td></tr>
    <tr><td>Weapons</td><td><kbd>1</kbd> carbine <kbd>2</kbd> grenade <kbd>3</kbd> LAW <kbd>4</kbd> knife <kbd>5</kbd> time bomb (again: the next fuse) <kbd>6</kbd> first aid; or <kbd>F1</kbd> <kbd>F3</kbd> <kbd>F5</kbd> <kbd>F7</kbd> as on the C64</td></tr>
    <tr><td>Use</td><td><kbd>E</kbd>: open a pod, kick a lever, raid a shack</td></tr>
    <tr><td>First aid</td><td><kbd>H</kbd> or <kbd>Delete</kbd>, standing still</td></tr>
    <tr><td>Call the Osprey</td><td><kbd>Q</kbd> or <kbd>\`</kbd></td></tr>
    <tr><td>Map</td><td><kbd>Tab</kbd>, on the ground: the game waits</td></tr>
    <tr><td>Pause</td><td><kbd>Esc</kbd> or <kbd>P</kbd></td></tr>
    <tr><td>Aids</td><td><kbd>L</kbd> Classic or Field</td></tr>
    <tr><td>Sound</td><td><kbd>M</kbd></td></tr>
    <tr><td>Fly-over</td><td>Left and right drift the Osprey. <kbd>Space</kbd> kicks out a pod; on the green light it jumps. Under the parafoil, the arrow keys steer. <kbd>F</kbd> hurries the Osprey (Field).</td></tr>
    </table><p class="note">A gamepad works too: stick to move, A fire, B crawl, X use, Y next weapon, LB run, RB call the Osprey, LT first aid, Back map, Start pause.</p>`;
  UI.helpTabs = () => [
    ["Mission", `<p><b>You are an Airborne Ranger</b>, and a puma. The Osprey takes you in over the north end of the mission area, past the objective, to the drop zone at the south. On the way, kick out your three <b>supply pods</b> where you will want them; on the green light, jump.</p>
      <p>On the ground, the <b>clock</b> is running. Get to the objective, do what the orders say, then <b>call the Osprey</b>: it comes back to the pickup point (the X on the map), lets down a ladder and waits a little while. Climb it. If the clock runs out the Osprey comes anyway, once. Miss it, and you are captured.</p>
      <p>A <b>practice ranger</b> is anyone; nothing is kept. A <b>veteran</b> is yours: their merit, rank and decorations are kept in this browser, every mission they fly is on their record, and if they are killed in action they go to the memorial. A captured veteran waits in the enemy's camp until another ranger frees them on mission 8. The <b>campaign</b> is all twelve missions in order: only there can a ranger make Colonel.</p>
      <p class="gk-credit">${CREDIT}</p>`],
    ["Keys", KEYS_TABLE],
    ["On foot", `<p><b>Walking</b> rests you; <b>running</b> fills the fatigue bar (green, then blue, then red), and when it is full you walk until you have your breath back. Wounds, the weight of what you carry and the desert heat all make it fill faster.</p>
      <p><b>Crawling</b> is slow and quiet. Behind a wall or a boulder, in scrub or a snow drift, a crawling ranger is hard to see. In a <b>trench</b> or a ravine you are hidden from anyone not in it with you, standing or crawling. Crawl through <b>water</b> and you are under it, hidden, but not for long.</p>
      <p>Three <b>wounds</b> and you are dead: each fills one of the three boxes. Body armour stops some rounds and only knocks you down. <b>First aid</b> takes off a wound if you stand still long enough.</p>
      <p><b>Mines</b> are marked on the ground; grenades clear a way through them. <b>Wire</b> stops you until a grenade opens it. <b>Thin ice</b> takes a walking ranger a moment to break, a running one at once. The <b>badlands</b> round the edge cannot be crossed.</p>`],
    ["Weapons", `<table><tr><td><b>Carbine</b></td><td>Automatic while you hold fire; thirty rounds a magazine. Kills soldiers, not installations. Every shot is heard a long way off.</td></tr>
      <tr><td><b>Grenade</b></td><td>Hold fire longer to throw further. Machine-gun nests, mini-bunkers, wire, mines, doors, tents, soldiers in cover. Mind the blast.</td></tr>
      <tr><td><b>LAW rocket</b></td><td>Straight and far: bunkers, turrets, minitanks, anything a grenade will not touch.</td></tr>
      <tr><td><b>Knife</b></td><td>At arm's length, and silent. A soldier who has not seen you goes down without a sound; one who has, half the time. Knife the guard by a guard house and you can wear their uniform.</td></tr>
      <tr><td><b>Time bomb</b></td><td>Planted where you stand, with a 5, 10 or 15 second fuse. The only thing heavy enough for armour like a pumping station. Be elsewhere.</td></tr>
      <tr><td><b>First aid</b></td><td>One wound off, standing still.</td></tr></table>
      <p><b>Pods</b> hold four things each, chosen at the briefing. Walk onto one and press Use. In Classic you carry what you take, and the weight tells on your running until you have used it up.</p>`],
    ["The enemy", `<p>Soldiers patrol or stand guard. A noise brings them to look; seeing you brings them after you. A shot or an explosion anyone hears puts the whole area on <b>full alert</b>: the nearest close in on where you were last seen, the rest stand ready, and reinforcements arrive. Without contact the alert stands down, a level at a time.</p>
      <p>They lie down to shoot at range, and (above the easiest setting) throw grenades at a ranger in cover. <b>Elite</b> troops take two hits. Some carry <b>flamethrowers</b> or <b>anti-tank rockets</b>: either is two wounds at once. <b>Officers</b> wear a different uniform and run for the alarm.</p>
      <p><b>Machine-gun nests</b> and <b>bunkers</b> cover an arc; <b>turrets</b> turn. <b>Mini-bunkers</b> are automatic: they fire at anything that moves upright, their own side included, and they whine. Crawl past them. <b>Minitanks</b> patrol, follow you into trenches, fire rockets, and only a LAW or a bomb will stop one.</p>`],
    ["Zones", `<p><b>Desert:</b> the heat; you run out of breath sooner. <b>Temperate:</b> hedges, ruins, rivers to ford. <b>Arctic:</b> snow swallows sound, yours and theirs; frozen ponds and rivers hold thin ice that breaks.</p>
      <h3>The twelve missions</h3><ol>${AP.MISSIONS.map(m => `<li><b>${esc(m.name)}</b> (${esc(AP.ZONES[m.zone].name)}): ${esc(m.goalText)}.</li>`).join("")}</ol>`],
    ["Classic and Field", `<p><b>Classic</b> plays as the 1987 game did: the indicators in the corner, the map when you ask for it, and nothing else. Run and crawl are toggles, pods are carried as weight, and a mission is played through to the end.</p>
      <p><b>Field</b>, the default, adds a minimap, arrows to what matters, the goal's progress and the alarm state, the keys along the bottom for your first moments on the ground, ? and ! over soldiers who suspect or see you, guidance on the fly-over, Shift held to run, mouse aim, the carbine back in hand after a throw, pods that unpack, and leaving a mission to come back to it.</p>
      <p>Settings has each on its own. <kbd>L</kbd> switches between the two sets in a mission.</p>`],
  ];
  UI.help = (tab = 0, after) => UI.open("Help", { wide: true, tab, tabs: UI.helpTabs(), onClose: after });
  UI.aboutHTML = () => `<p><b>Airborne Puma</b> is a remake of <i>Airborne Ranger</i> (MicroProse, 1987) for the Commodore 64: twelve missions behind enemy lines in three zones, the Osprey and its supply pods, a veteran roster with ranks and decorations, and a campaign.</p>
    <p>The original was designed by Lawrence Schick and programmed by Scott Spanburg, with graphics by Iris Leigh Idokogi and music by Ken Lagace. This is not affiliated with MicroProse; no code, art or audio from the original is used. Everything here is drawn and synthesised in the page, the title march included, and the ranger is a puma.</p>
    <p>Classic plays it as it was; the Field aids are for now. The briefings, the maps and the numbers are ours, guessed where the 1987 manual is silent.</p>
    <p class="gk-credit">${CREDIT}</p>`;
  UI.about = after => UI.open("About", { html: UI.aboutHTML, onClose: after });
})();
