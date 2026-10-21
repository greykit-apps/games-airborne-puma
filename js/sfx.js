/* Airborne Puma -- sound, all of it synthesised: no audio files.
 *
 * As in 1987 there is no music once the mission starts: the sounds are the
 * game's cues. Gunfire and footsteps carry and fade with distance, the snow
 * muffles them, a mini-bunker whines when you are near one, the Osprey's
 * rotors are heard coming. The title has a theme of our own: slow and dark,
 * the rotors in it, then the fight.
 *
 * Two switches (games-meta STANDARD.md §8, §14): Sound is the master, A.out,
 * and silences everything; Music is the theme alone, on its own bus under it,
 * so the field's sounds play on without it. */
"use strict";
(() => {
  const A = AP.SFX = { ctx: null, muted: false, musicOn: true, out: null, dry: null, wet: null, music: null, loops: {}, tune: null };
  let noiseBuf = null;

  A.unlock = () => {
    if (A.ctx) { if (A.ctx.state === "suspended") A.ctx.resume(); return; }
    try {
      const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext;
      A.ctx = new Ctx();
    } catch (e) { A.ctx = null; return; }
    const a = A.ctx;
    A.out = a.createGain(); A.out.gain.value = A.muted ? 0 : 0.5; A.out.connect(a.destination);
    A.dry = a.createGain(); A.dry.connect(A.out);
    A.lp = a.createBiquadFilter(); A.lp.type = "lowpass"; A.lp.frequency.value = 900; A.lp.connect(A.out);
    A.music = a.createGain(); A.music.gain.value = A.musicOn ? 1 : 0; A.music.connect(A.out);
    noiseBuf = a.createBuffer(1, a.sampleRate * 1.5, a.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  };
  /* the music alone: the theme stops with it, and starts again from its first bar when it comes back on */
  A.setMusic = on => { A.musicOn = on; if (A.music) A.music.gain.setTargetAtTime(on ? 1 : 0, A.ctx.currentTime, 0.05); if (!on) A.stopTune(); };
  A.setMuted = m => { A.muted = m; if (A.out) A.out.gain.value = m ? 0 : 0.5; if (m) { A.stopTune(); for (const k of Object.keys(A.loops)) A.loop(k, 0); } };

  /* a note sliding from f0 to f1 */
  function tone(f0, f1, ms, type, vol, dest, at = 0) {
    const a = A.ctx, o = a.createOscillator(), g = a.createGain(), t = a.currentTime + 0.005 + at;
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + ms / 1000);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0008, t + ms / 1000);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + ms / 1000 + 0.02);
  }
  /* a burst of noise through a filter */
  function hiss(ms, vol, freq, dest, q = 0.8, at = 0, type = "lowpass") {
    const a = A.ctx, s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime + 0.005 + at;
    s.buffer = noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + ms / 1000);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random()); s.stop(t + ms / 1000 + 0.02);
  }

  const SOUNDS = {
    shotP: d => { hiss(110, 0.55, 2600, d, 0.6); tone(220, 70, 60, "square", 0.12, d); },
    shotE: d => { hiss(130, 0.4, 1500, d, 0.6); tone(160, 60, 70, "square", 0.08, d); },
    boom: d => { hiss(900, 0.9, 500, d, 0.5); tone(90, 30, 600, "sine", 0.5, d); hiss(400, 0.4, 2400, d, 0.4, 0.03); },
    step: d => hiss(35, 0.08, 900, d, 1, 0, "bandpass"),
    splash: d => hiss(120, 0.12, 1800, d, 0.8, 0, "bandpass"),
    knife: d => { hiss(90, 0.15, 5000, d, 2, 0, "highpass"); },
    throw: d => hiss(160, 0.1, 3000, d, 1, 0, "bandpass"),
    rocket: d => { hiss(500, 0.4, 1200, d, 1, 0, "bandpass"); tone(400, 150, 400, "sawtooth", 0.06, d); },
    empty: d => tone(1600, 1500, 25, "square", 0.08, d),
    reload: d => { tone(900, 800, 30, "square", 0.08, d); tone(600, 550, 40, "square", 0.08, d, 0.12); },
    select: d => tone(1100, 1100, 20, "square", 0.05, d),
    pod: d => { tone(660, 660, 60, "square", 0.08, d); tone(990, 990, 90, "square", 0.08, d, 0.07); },
    podLost: d => tone(300, 120, 200, "square", 0.08, d),
    chute: d => hiss(400, 0.15, 600, d, 1),
    wound: d => { hiss(80, 0.4, 700, d); tone(300, 90, 250, "square", 0.16, d); },
    armor: d => { tone(1800, 900, 60, "square", 0.08, d); },
    clang: d => { tone(1300, 1250, 120, "triangle", 0.12, d); tone(1900, 1850, 90, "triangle", 0.06, d); },
    die: d => tone(500, 120, 180, "square", 0.08, d),
    spotted: d => { tone(880, 880, 50, "square", 0.08, d); },
    alert: d => { for (let i = 0; i < 3; i++) { tone(700, 700, 90, "square", 0.1, d, i * 0.2); tone(950, 950, 90, "square", 0.1, d, i * 0.2 + 0.1); } },
    beep: d => { for (let i = 0; i < 4; i++) tone(1200, 1200, 70, "square", 0.1, d, i * 0.18); },
    goal: d => { [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 120, "square", 0.08, d, i * 0.11)); },
    fail: d => { [392, 330, 262].forEach((f, i) => tone(f, f, 180, "square", 0.08, d, i * 0.16)); },
    recall: d => { tone(1500, 1500, 60, "square", 0.06, d); tone(1500, 1500, 60, "square", 0.06, d, 0.12); hiss(250, 0.08, 3000, d, 1, 0.25, "bandpass"); },
    ladder: d => { for (let i = 0; i < 4; i++) tone(700 + i * 120, 700 + i * 120, 40, "square", 0.05, d, i * 0.1); },
    click: d => { hiss(30, 0.25, 4000, d, 1, 0, "highpass"); tone(2000, 1800, 20, "square", 0.04, d, 0.04); },
    lever: d => { tone(200, 140, 120, "square", 0.12, d); hiss(200, 0.2, 800, d); },
    ice: d => { hiss(260, 0.3, 3500, d, 1, 0, "highpass"); tone(1800, 600, 200, "triangle", 0.06, d); },
    mine: d => tone(1000, 1000, 40, "square", 0.08, d),
    flame: d => hiss(400, 0.3, 700, d, 0.4),
    menu: d => tone(900, 900, 18, "square", 0.05, d),
    jump: d => { hiss(500, 0.2, 400, d, 0.8); },
    light: d => { tone(1320, 1320, 80, "square", 0.08, d); tone(1760, 1760, 120, "square", 0.08, d, 0.1); },
  };

  /* name; dist in tiles from the ranger (null: no fade); muffle: the snow */
  A.play = (name, dist = null, muffle = false) => {
    if (A.muted || !A.ctx || !SOUNDS[name]) return;
    let vol = 1;
    if (dist != null) { vol = Math.max(0, 1 - dist / 26); if (vol < 0.04) return; }
    const g = A.ctx.createGain();
    g.gain.value = vol;
    g.connect(muffle ? A.lp : A.dry);
    SOUNDS[name](g);
    setTimeout(() => g.disconnect(), 2500);
  };

  /* something that keeps sounding: level 0 is silence */
  A.loop = (name, level) => {
    if (!A.ctx) return;
    let L = A.loops[name];
    if (!L) {
      if (level <= 0 || A.muted) return;
      const a = A.ctx, g = a.createGain();
      g.gain.value = 0; g.connect(A.dry);
      if (name === "rotor") {
        const s = a.createBufferSource(), f = a.createBiquadFilter(), lfo = a.createOscillator(), lg = a.createGain();
        s.buffer = noiseBuf; s.loop = true; f.type = "lowpass"; f.frequency.value = 260;
        lfo.frequency.value = 11; lg.gain.value = 0.5; lfo.connect(lg); lg.connect(g.gain);
        s.connect(f); f.connect(g); s.start(); lfo.start();
        L = { g, stop: () => { s.stop(); lfo.stop(); } };
      } else {
        const o = a.createOscillator(); o.type = "sine"; o.frequency.value = 2900;
        const lfo = a.createOscillator(), lg = a.createGain(); lfo.frequency.value = 6; lg.gain.value = 60; lfo.connect(lg); lg.connect(o.frequency);
        o.connect(g); o.start(); lfo.start();
        L = { g, stop: () => { o.stop(); lfo.stop(); } };
      }
      A.loops[name] = L;
    }
    const v = A.muted ? 0 : Math.max(0, Math.min(1, level)) * (name === "whine" ? 0.035 : 0.5);
    L.g.gain.setTargetAtTime(v, A.ctx.currentTime, 0.1);
  };
  A.stopLoops = () => { for (const [k, L] of Object.entries(A.loops)) { try { L.stop(); } catch (e) { /* already */ } delete A.loops[k]; } };

  /* ---- the title theme: ours. Slow and dark, in D minor at 84: under it all a galloping bass, three and
     three and two to the beat. First the insertion -- the rotors, a heartbeat on the drum, the horns low;
     then the fight -- war drums, flams and toms, the horns' theme an octave up over the strings; then
     silent again, the pulse and a sonar's ping; and round. Under the title's entrance, a bar of rising wind
     and rotors, landing on one hit with the menu ---- */
  const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const pc = n => PC[n[0]] + (n[1] === "b" ? -1 : n[1] === "#" ? 1 : 0);
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  const N = n => { const m = /^([A-G][b#]?)(\d)$/.exec(n); return hz(pc(m[1]) + (+m[2] + 1) * 12); };
  /* a section's tune: bars of "note:sixteenths" between bars' |s, sixteen sixteenths to a bar */
  const tune = s => s.split("|").map(b => b.trim().split(/\s+/).map(t => { const [n, l] = t.split(":"); return [n === "r" ? 0 : N(n), +l]; }));
  /* a chord: "D", "Dm", "A7", "Gm/D"; its tones as semitones over C, and the note in the bass */
  const chord = c => {
    const m = /^([A-G][b#]?)(m?)(7?)(?:\/([A-G][b#]?))?$/.exec(c), r = pc(m[1]);
    return { tones: [0, m[2] ? 3 : 4, 7].concat(m[3] ? [10] : []).map(i => r + i), bass: m[4] ? pc(m[4]) : r };
  };
  /* a pitch class put in the octave from midi note lo */
  const at = (p, lo) => lo + (((p - lo) % 12) + 12) % 12;
  /* each bar's chords, one or two (a half bar each) */
  const harm = s => s.trim().split(/\s*,\s*/).map(b => b.split(/\s+/).map(chord));

  const SECTIONS = [
    { part: "stealth", lead: tune(`r:16 | r:16 | r:16 | r:16 | D4:8 F4:4 E4:4 | D4:12 A3:4 | Bb3:8 C4:4 D4:4 | A3:16`),
      chords: harm(`Dm, Dm, Bb, Bb, Dm, Dm, Bb, A`) },
    { part: "combat", lead: tune(`D4:6 E4:2 F4:4 A4:4 | Bb4:8 A4:4 F4:4 | G4:6 A4:2 Bb4:4 D5:4 | C#5:12 A4:4 |
        D5:8 C5:4 A4:4 | Bb4:8 A4:4 G4:4 | F4:4 E4:4 G4:4 Bb4:4 | A4:16`),
      chords: harm(`Dm, Bb, Gm, A, Dm, Bb, Gm A7, A`) },
    { part: "silent", lead: tune(`r:16 | r:16 | r:16 | r:16`), chords: harm(`Dm, Dm, Bb, A`) },
  ];
  /* the whole theme, a bar at a time */
  const SONG = [];
  for (const s of SECTIONS) s.lead.forEach((lead, n) => SONG.push({ part: s.part, n, lead, chords: s.chords[n] }));
  const STEP = 60 / 84 / 4, BAR = 16 * STEP;
  /* the count-in, under the title's entrance: a bar, so the theme itself comes in with the menu */
  A.COUNT_IN = BAR;
  /* the gallop: the sixteenths that carry the accent, three and three and two */
  const GALLOP = [0, 3, 6, 8, 11, 14];

  A.startTune = (intro = false) => {
    if (A.muted || !A.musicOn || !A.ctx || A.tune) return;
    const a = A.ctx, g = a.createGain();
    /* levelled against the boot's meow, which ends just as the count-in starts: the count-in and the
       insertion sit level with it, about -19 LUFS, and the fight a few dB over (measured offline). At
       0.5 it was 11 to 14 dB under the cat */
    g.gain.value = 2;
    /* the top taken off the whole of it: nothing in this is bright */
    const shelf = a.createBiquadFilter(); shelf.type = "highshelf"; shelf.frequency.value = 2000; shelf.gain.value = -12;
    const top = a.createBiquadFilter(); top.type = "lowpass"; top.frequency.value = 4000; top.Q.value = 0.5;
    /* a limiter, so the fight's hits peak at about -6 dBFS rather than touching 0 */
    const lim = a.createDynamicsCompressor();
    lim.threshold.value = -6; lim.knee.value = 3; lim.ratio.value = 12; lim.attack.value = 0.002; lim.release.value = 0.15;
    g.connect(shelf); shelf.connect(top); top.connect(lim); lim.connect(A.music);
    /* a long, dark room for the horns, the strings and the drums */
    const room = a.createDelay(1), fb = a.createGain(), wet = a.createGain(), damp = a.createBiquadFilter();
    room.delayTime.value = 0.23; fb.gain.value = 0.38; wet.gain.value = 0.22; damp.type = "lowpass"; damp.frequency.value = 1100;
    const send = a.createGain(); send.connect(room); room.connect(damp); damp.connect(fb); fb.connect(room); damp.connect(wet); wet.connect(g);
    const bus = a.createGain(); bus.connect(g); bus.connect(send);
    const st = { g, t0: a.currentTime + 0.1 + (intro ? A.COUNT_IN : 0), bar: 0, timer: null, intro };

    /* the horns: a saw over a triangle through a closed filter, swelling in, a slow vibrato when held */
    const horn = (f, t, dur, vol, { bright = 900, att = 0.06 } = {}) => {
      if (!f) return;
      const o1 = a.createOscillator(), o2 = a.createOscillator(), lp = a.createBiquadFilter(), e = a.createGain();
      o1.type = "sawtooth"; o2.type = "triangle"; o1.frequency.value = f; o2.frequency.value = f * 1.003;
      lp.type = "lowpass"; lp.Q.value = 0.6;
      lp.frequency.setValueAtTime(f * 1.2, t); lp.frequency.linearRampToValueAtTime(Math.min(bright, f * 3), t + att + 0.05);
      const end = t + dur * 0.94;
      e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(vol, t + att); e.gain.setValueAtTime(vol, end - 0.08); e.gain.linearRampToValueAtTime(0, end + 0.12);
      if (dur > 0.5) {
        const l = a.createOscillator(), lg = a.createGain();
        l.frequency.value = 4.8; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.004, t + 0.6);
        l.connect(lg); lg.connect(o1.frequency); lg.connect(o2.frequency); l.start(t); l.stop(end + 0.15);
      }
      o1.connect(lp); o2.connect(lp); lp.connect(e); e.connect(bus);
      o1.start(t); o2.start(t); o1.stop(end + 0.15); o2.stop(end + 0.15);
    };
    /* the strings: two saws a shade apart, slow in and out, very dark */
    const pad = (f, t, dur, vol) => {
      const e = a.createGain(), lp = a.createBiquadFilter();
      lp.type = "lowpass"; lp.frequency.value = 520; lp.Q.value = 0.4;
      e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(vol, t + Math.min(0.5, dur * 0.4)); e.gain.setValueAtTime(vol, t + dur - 0.3); e.gain.linearRampToValueAtTime(0, t + dur + 0.25);
      for (const d of [0.996, 1.004]) { const o = a.createOscillator(); o.type = "sawtooth"; o.frequency.value = f * d; o.connect(lp); o.start(t); o.stop(t + dur + 0.3); }
      lp.connect(e); e.connect(bus);
    };
    /* the gallop's bass: a short, muted pluck of saw */
    const pulse = (f, t, vol) => {
      const o = a.createOscillator(), lp = a.createBiquadFilter(), e = a.createGain();
      o.type = "sawtooth"; o.frequency.value = f;
      lp.type = "lowpass"; lp.Q.value = 3; lp.frequency.setValueAtTime(520, t); lp.frequency.exponentialRampToValueAtTime(140, t + 0.12);
      e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(vol, t + 0.006); e.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      o.connect(lp); lp.connect(e); e.connect(g); o.start(t); o.stop(t + 0.18);
    };
    const noise = (t, dur, vol, type, freq, q = 0.8, to = g) => {
      const s = a.createBufferSource(), f = a.createBiquadFilter(), e = a.createGain();
      s.buffer = noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = q;
      e.gain.setValueAtTime(vol, t); e.gain.exponentialRampToValueAtTime(0.001, t + dur);
      s.connect(f); f.connect(e); e.connect(to); s.start(t, Math.random()); s.stop(t + dur + 0.02);
    };
    /* a drum: a sine falling in pitch, with a thud of noise -- the bass drum low, the toms above it */
    const drum = (t, vol, f0 = 80, f1 = 40, len = 0.45) => {
      const o = a.createOscillator(), e = a.createGain();
      o.type = "sine"; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + len * 0.7);
      e.gain.setValueAtTime(0.6 * vol, t); e.gain.exponentialRampToValueAtTime(0.001, t + len);
      o.connect(e); e.connect(bus); o.start(t); o.stop(t + len + 0.02);
      noise(t, 0.07, 0.22 * vol, "lowpass", 260);
    };
    const tom = (t, vol, f) => drum(t, vol * 0.7, f, f * 0.6, 0.32);
    /* the snare, a field drum's, deep; a flam has its grace note a moment before; a rim is a dry click */
    const snare = (t, vol, flam = false) => {
      if (flam) snare(t - 0.03, vol * 0.4);
      noise(t, 0.16, 0.2 * vol, "bandpass", 1400, 0.6, bus);
      const o = a.createOscillator(), e = a.createGain();
      o.type = "triangle"; o.frequency.setValueAtTime(170, t); o.frequency.exponentialRampToValueAtTime(115, t + 0.07);
      e.gain.setValueAtTime(0.14 * vol, t); e.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      o.connect(e); e.connect(g); o.start(t); o.stop(t + 0.1);
    };
    const rim = (t, vol) => noise(t, 0.04, 0.16 * vol, "bandpass", 1900, 2.5, bus);
    const roll = (t, dur, v0, v1) => { const n = Math.round(dur / 0.034); for (let i = 0; i < n; i++) snare(t + i * 0.034, v0 + (v1 - v0) * i / n); };
    /* the rotors, far off: a dull whump of air */
    const rotor = (t, vol) => noise(t, 0.12, 0.09 * vol, "lowpass", 190, 1.2);
    /* the sonar: a soft sine, ringing in the room */
    const ping = (t, f, vol) => {
      const o = a.createOscillator(), e = a.createGain();
      o.type = "sine"; o.frequency.value = f;
      e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(vol, t + 0.01); e.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
      o.connect(e); e.connect(bus); o.start(t); o.stop(t + 1.65);
    };
    /* a hit: everything at once, on a section's first beat */
    const hit = (t, vol = 1) => { drum(t, vol, 70, 32, 0.9); tom(t, vol * 0.8, 120); noise(t, 1.4, 0.07 * vol, "bandpass", 2600, 0.5, bus); };

    /* the count-in: the wind rising and the rotors coming in, a roll, and the hit on the theme's first beat */
    if (intro) {
      const b = st.t0 - A.COUNT_IN;
      const s = a.createBufferSource(), f = a.createBiquadFilter(), e = a.createGain();
      s.buffer = noiseBuf; s.loop = true; f.type = "lowpass"; f.Q.value = 1;
      f.frequency.setValueAtTime(150, b); f.frequency.exponentialRampToValueAtTime(1800, st.t0);
      e.gain.setValueAtTime(0.0001, b); e.gain.exponentialRampToValueAtTime(0.09, st.t0 - 0.02); e.gain.linearRampToValueAtTime(0, st.t0);
      s.connect(f); f.connect(e); e.connect(g); s.start(b); s.stop(st.t0 + 0.02);
      for (let i = 0; i < 16; i += 2) rotor(b + i * STEP, 0.3 + i * 0.05);
      pad(N("D2"), b, BAR, 0.05);
      drum(b, 0.6); drum(b + 8 * STEP, 0.6);
      roll(b + 12 * STEP, 4 * STEP - 0.02, 0.15, 0.8);
    }

    const playBar = ({ part, n, lead, chords }, t) => {
      const fight = part === "combat", hush = part === "silent";
      /* the horns: low and soft on the insertion, the theme an octave up for the fight */
      let x = 0;
      for (const [f, l] of lead) {
        if (f) horn(f, t + x * STEP, l * STEP, fight ? 0.075 : 0.06, fight ? { bright: 1100, att: 0.05 } : { bright: 700, att: 0.14 });
        x += l;
      }
      /* the strings and the gallop, a half bar per chord where it changes at the half */
      chords.forEach((c, i) => {
        const h = t + i * BAR / chords.length, len = BAR / chords.length;
        for (const p of c.tones.slice(0, 3)) pad(hz(at(p, 50)), h, len, hush ? 0.012 : fight ? 0.03 : 0.02);
        const root = hz(at(c.bass, 38));
        for (let k = 0; k < 16 / chords.length; k++) {
          const s = k + i * 16 / chords.length, acc = GALLOP.includes(s);
          if (fight) pulse(acc && s % 8 === 0 ? root * 2 : root, h + k * STEP, acc ? 0.2 : 0.09);
          else if (acc && (!hush || s % 8 === 0)) pulse(root, h + k * STEP, hush ? 0.12 : 0.16);
        }
      });
      /* the drums */
      if (fight) {
        if (n === 0) hit(t); else drum(t, 1);
        drum(t + 6 * STEP, 0.7); drum(t + 8 * STEP, 0.9); drum(t + 11 * STEP, 0.6);
        snare(t + 4 * STEP, 0.9, true); snare(t + 12 * STEP, 0.9, true);
        if (n % 4 === 3) { tom(t + 13 * STEP, 0.9, 150); tom(t + 14 * STEP, 0.9, 120); tom(t + 15 * STEP, 1, 95); }
        else { snare(t + 14 * STEP, 0.3); snare(t + 15 * STEP, 0.4); }
      } else {
        /* a heartbeat, the rim on the fourth beat, and the rotors far off */
        drum(t, hush ? 0.5 : 0.75); drum(t + 3 * STEP, hush ? 0.3 : 0.45);
        if (!hush) { drum(t + 8 * STEP, 0.6); drum(t + 11 * STEP, 0.35); }
        rim(t + 12 * STEP, 0.5);
        if (!hush) for (let i = 0; i < 16; i += 2) rotor(t + i * STEP, i % 4 ? 0.35 : 0.55);
        if (hush && n % 2 === 0) ping(t, N("A5"), 0.035);
        if (part === "stealth" && n === 7) roll(t + 8 * STEP, 8 * STEP - 0.02, 0.1, 0.7);
      }
    };

    /* schedule a bar at a time, a little ahead */
    const sched = () => {
      while (st.t0 + st.bar * BAR < a.currentTime + 1.5) { playBar(SONG[st.bar % SONG.length], st.t0 + st.bar * BAR); st.bar++; }
    };
    sched();
    st.timer = setInterval(sched, 250);
    A.tune = st;
  };
  /* now: cut it dead rather than fade it */
  A.stopTune = (now = false) => {
    if (!A.tune) return;
    clearInterval(A.tune.timer);
    const g = A.tune.g, a = A.ctx;
    if (now) g.disconnect();
    else { g.gain.setTargetAtTime(0, a.currentTime, 0.15); setTimeout(() => g.disconnect(), 1500); }
    A.tune = null;
  };
})();
