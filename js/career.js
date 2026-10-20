/* Airborne Puma -- the roster, the settings, and what this browser keeps.
 *
 * The 1987 game kept its veterans on a Roster Diskette; this one keeps them
 * in localStorage, under keys that all begin airbornepuma_ (greykit.games
 * STANDARD.md §5), so Settings can forget them by that prefix and nothing
 * else (§2). A practice ranger is never written down. A veteran is: his
 * merit, his rank, his decorations, every mission he flew, and how it ended.
 * A captured ranger waits in the enemy's camp until another frees him; a
 * ranger killed in action goes to the memorial. */
"use strict";
(() => {
  const KEY_ROSTER = "airbornepuma_roster_v1", KEY_PREFS = "airbornepuma_prefs_v1", KEY_MISSION = "airbornepuma_mission_v1";
  AP.KEY_MUTED = "airbornepuma_muted_v1";
  AP.KEY_MUSIC = "airbornepuma_music_v1";

  /* ---- the aids: Classic is 1987, Field is a modern helping hand ---- */
  AP.AID_LIST = [
    ["minimap", "Minimap", "A strip of the map in the corner: targets, pods and the pickup."],
    ["markers", "Edge markers", "Arrows at the screen's edge toward targets, pods and the pickup."],
    ["aware", "Who has seen you", "A ? over a soldier who suspects you, a ! over one who has you."],
    ["status", "Mission progress", "The goal's progress and the alarm state along the bottom."],
    ["lastSeen", "Soldiers on the map", "The map view shows the soldiers watching you."],
    ["drop", "Drop guidance", "The drop zone outlined, and where a pod will land."],
    ["ffDrop", "Faster fly-over", "Hold F to hurry the Osprey to the drop zone."],
    ["autoCarbine", "Back to the carbine", "After a grenade, a rocket or a bomb, the carbine is in hand again."],
    ["podTake", "Pods unpack", "A pod's contents go into your kit, up to a limit, and weigh nothing. Classic: you carry the weight."],
    ["runHold", "Hold Shift to run", "Classic: Shift toggles running, as the C64's cursor key did."],
    ["mouseAim", "Mouse aim", "The crosshair follows the mouse; the left button fires."],
    ["checkpoint", "Resume a mission", "Leave mid-mission and come back to it. Classic: a mission is played through."],
  ];
  AP.AIDS = { field: {}, classic: {} };
  for (const [k] of AP.AID_LIST) { AP.AIDS.field[k] = true; AP.AIDS.classic[k] = false; }

  AP.SPEEDS = { classic: ["Classic", 50], relaxed: ["Relaxed", 40], brisk: ["Brisk", 60] };
  AP.prefs = Object.assign({ aids: "field", over: {}, speed: "classic", palette: "c64", scanlines: false }, AP.store.get(KEY_PREFS, {}));
  if (!AP.AIDS[AP.prefs.aids]) AP.prefs.aids = "field";
  AP.savePrefs = () => AP.store.set(KEY_PREFS, AP.prefs);
  AP.aid = name => { const o = AP.prefs.over[name]; return o === undefined ? !!AP.AIDS[AP.prefs.aids][name] : !!o; };
  AP.setAids = set => { AP.prefs.aids = set; AP.prefs.over = {}; AP.savePrefs(); };
  AP.setAid = (name, on) => { if (on === !!AP.AIDS[AP.prefs.aids][name]) delete AP.prefs.over[name]; else AP.prefs.over[name] = on; AP.savePrefs(); };
  AP.aidsLabel = () => Object.keys(AP.prefs.over).length ? (AP.prefs.aids === "field" ? "Field, adjusted" : "Classic, adjusted") : AP.prefs.aids === "field" ? "Field" : "Classic";

  /* ---- the mission in progress ---- */
  AP.loadMission = () => AP.store.get(KEY_MISSION, null);
  AP.saveMission = m => AP.store.set(KEY_MISSION, m);
  AP.clearMission = () => AP.store.del(KEY_MISSION);

  /* ---- the roster ---- */
  const Roster = AP.Roster = {
    data: null,
    load() {
      const d = AP.store.get(KEY_ROSTER, null);
      Roster.data = d && Array.isArray(d.rangers) ? d : { rangers: [], memorial: [], next: 1 };
      return Roster.data;
    },
    save() { AP.store.set(KEY_ROSTER, Roster.data); },
    list() { return Roster.data.rangers; },
    get(id) { return Roster.data.rangers.find(r => r.id === id) || null; },
    create(name) {
      const d = Roster.data;
      const r = { id: d.next++, name: String(name).trim().slice(0, 12) || "Ranger", created: Date.now(), status: "active", merit: 0, rank: 0,
        awards: [], log: [], campaign: null, colonel: false };
      d.rangers.push(r); Roster.save();
      return r;
    },
    retire(id) { const d = Roster.data; d.rangers = d.rangers.filter(r => r.id !== id); Roster.save(); },
    /* a mission's debrief into a veteran's record: what changed, for the debrief screen */
    apply(id, db, campaign) {
      const r = Roster.get(id);
      if (!r) return null;
      const before = r.rank, out = { promoted: false, award: null, liberated: 0, colonel: false, campaignDone: false, kia: false };
      r.log.push({ mission: db.mission, diff: db.diff, result: db.result, goal: db.goal, merit: db.total, at: Date.now() });
      r.merit += db.total;
      if (campaign && r.campaign) {
        r.campaign.next++;
        if (db.goal) r.campaign.goals++;
        if (r.campaign.next >= AP.CAMPAIGN.length) {
          out.campaignDone = true;
          if (r.campaign.goals >= 10) { r.colonel = true; out.colonel = true; }
          if (r.campaign.goals === AP.CAMPAIGN.length && !r.awards.some(a => a.code === "CMOH")) { r.awards.push({ code: "CMOH", mission: "campaign", at: Date.now() }); out.award = "CMOH"; }
          r.campaign.done = true;
        }
      }
      if (db.result === "retrieved" && db.goal && !out.award) {
        const code = AP.awardFor(Math.round(db.total), r.awards.map(a => a.code));
        if (code) { r.awards.push({ code, mission: db.mission, at: Date.now() }); out.award = code; }
      }
      r.rank = AP.rankFor(r.merit, r.colonel);
      out.promoted = r.rank > before;
      if (db.result === "captured") r.status = "captured";
      else if (db.result === "kia") {
        r.status = "kia"; out.kia = true;
        Roster.data.memorial.push(r);
        Roster.data.rangers = Roster.data.rangers.filter(x => x !== r);
      } else r.status = "active";
      if (db.freedPOW) for (const x of Roster.data.rangers) if (x.status === "captured" && x !== r) { x.status = "active"; out.liberated++; }
      Roster.save();
      return out;
    },
  };
  Roster.load();
  AP.rankName = i => AP.C.RANKS[i][1];
  AP.rankShort = i => AP.C.RANKS[i][0];

  /* Settings' "Forget everything" (greykit.games STANDARD.md §2): every key
     the game owns, found by its prefix, and only those -- every game on
     greykit.com shares one origin, and so one storage. */
  AP.forgetEverything = () => {
    for (const area of ["localStorage", "sessionStorage"]) {
      try {
        const s = globalThis[area];
        for (let i = s.length - 1; i >= 0; i--) { const k = s.key(i); if (k && k.startsWith("airbornepuma")) s.removeItem(k); }
      } catch (e) { /* no storage */ }
    }
    location.reload();
  };
})();
