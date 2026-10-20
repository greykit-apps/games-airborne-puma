/* Airborne Puma -- a title march kept for later: a quick-step for a field band in B flat, 120 to the
 * quarter. A bugle call over the drums (three bars, the count-in), then cornets over the tuba's oom-pah
 * and the drum line: a first strain, a second in G minor, a trio in E flat, and round, 48 bars.
 *
 * Written 2026-10-20 for the title and set aside the same day: too quick and too cheerful for the title,
 * which took a slow, dark theme instead. Kept to use elsewhere -- a campaign won, a ceremony, a medal.
 *
 * Nothing loads this file. It is the block that sat in js/sfx.js between "the title march" and
 * A.stopTune, and goes back there whole: it uses sfx.js's A (ctx, music, muted, musicOn, tune) and its
 * noiseBuf, and defines A.COUNT_IN and A.startTune(intro). Measured offline: the strains at -29.5 dB RMS,
 * as loud as the old title march, the trio 4 dB under them, peak 0.22. */
  /* ---- the title march: ours, a quick-step for a field band in B flat. A bugle call over the drums, then
     cornets over the tuba's oom-pah and the drum line: a first strain, a second in G minor, a trio in E flat,
     and round again. 120 to the quarter, a 2/4 bar a second ---- */
  const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const pc = n => PC[n[0]] + (n[1] === "b" ? -1 : n[1] === "#" ? 1 : 0);
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  const N = n => { const m = /^([A-G][b#]?)(\d)$/.exec(n); return hz(pc(m[1]) + (+m[2] + 1) * 12); };
  /* a strain's tune: bars of "note:sixteenths" between bars' |s, eight sixteenths to a bar */
  const tune = s => s.split("|").map(b => b.trim().split(/\s+/).map(t => { const [n, l] = t.split(":"); return [n === "r" ? 0 : N(n), +l]; }));
  /* a chord: "Bb", "Gm", "C7", "Ebm", "Eb/Bb"; its tones as semitones over C, and the note in the bass */
  const chord = c => {
    const m = /^([A-G][b#]?)(m?)(7?)(?:\/([A-G][b#]?))?$/.exec(c), r = pc(m[1]);
    return { tones: [0, m[2] ? 3 : 4, 7].concat(m[3] ? [10] : []).map(i => r + i), bass: m[4] ? pc(m[4]) : r, seventh: !!m[3] };
  };
  /* a pitch class put in the octave from midi note lo */
  const at = (p, lo) => lo + (((p - lo) % 12) + 12) % 12;
  /* each bar's chords, one or two (on the beats) */
  const harm = s => s.trim().split(/\s*,\s*/).map(b => b.split(/\s+/).map(chord));

  const BUGLE = tune(`r:2 F4:1 F4:1 Bb4:2 D5:2 | F5:3 D5:1 Bb4:2 D5:2 | F5:8`);
  const STRAINS = [
    { part: "a", lead: tune(`D5:3 D5:1 F5:2 D5:2 | Bb5:4 F5:4 | G5:3 G5:1 Eb5:2 G5:2 | F5:4 D5:2 Bb4:2 |
        G5:3 F5:1 E5:2 G5:2 | A5:4 F5:4 | G5:3 A5:1 Bb5:2 G5:2 | A5:6 r:2 |
        D5:3 D5:1 F5:2 D5:2 | Bb5:4 F5:4 | C6:3 Bb5:1 G5:2 Eb5:2 | Gb5:4 Eb5:2 C5:2 |
        D5:3 Eb5:1 F5:2 Bb5:2 | G5:3 F5:1 D5:2 B4:2 | E5:2 G5:2 Eb5:2 C5:2 | Bb4:4 r:4`),
      chords: harm(`Bb, Bb, Eb, Bb, C7, F, C7, F, Bb, Bb, Eb, Ebm, Bb/F, G7, C7 F7, Bb`) },
    { part: "b", lead: tune(`G5:3 G5:1 D5:2 G5:2 | Bb5:3 A5:1 G5:2 D5:2 | F#5:3 G5:1 A5:2 D5:2 | G5:6 r:2 |
        C6:3 Bb5:1 G5:2 Eb5:2 | D5:3 G5:1 Bb5:2 D6:2 | C6:2 Bb5:2 A5:2 F#5:2 | G5:6 r:2 |
        Eb5:3 F5:1 G5:2 Bb5:2 | D6:4 Bb5:4 | C6:3 Bb5:1 A5:2 F5:2 | Bb5:4 D5:4 |
        G5:3 A5:1 Bb5:2 G5:2 | E5:3 F5:1 G5:2 Bb5:2 | A5:3 G5:1 F5:2 Eb5:2 | D5:4 r:4`),
      chords: harm(`Gm, Gm, D7, Gm, Cm, Gm, D7, Gm, Eb, Bb, F7, Bb, Gm, C7, F7, Bb`) },
    { part: "t", lead: tune(`G4:4 Bb4:4 | Eb5:6 D5:2 | C5:4 Ab4:4 | Bb4:6 r:2 |
        G4:4 Bb4:4 | C5:3 D5:1 Eb5:2 C5:2 | Bb4:4 F5:4 | D5:6 r:2 |
        G4:4 Bb4:4 | Eb5:6 F5:2 | Ab5:4 Eb5:4 | Cb5:4 Ab4:4 |
        Bb4:4 Eb5:4 | G5:3 F5:1 E5:2 G5:2 | F5:2 Eb5:2 D5:2 Ab4:2 | Eb5:6 r:2`),
      chords: harm(`Eb, Eb, Ab, Eb, Eb, F7, Bb7, Bb7, Eb, Eb, Ab, Abm, Eb/Bb, C7, F7 Bb7, Eb`) },
  ];
  /* the whole march, a bar at a time */
  const SONG = [];
  for (const s of STRAINS) s.lead.forEach((lead, n) => SONG.push({ part: s.part, n, lead, chords: s.chords[n] }));
  const STEP = 0.125, BAR = 8 * STEP, IN_BARS = BUGLE.length;
  /* the count-in, under the title's entrance: the bugle call, so the march itself comes in with the menu */
  A.COUNT_IN = IN_BARS * BAR;
  /* the drum line, a bar at a time: [sixteenth, level, flam] */
  const SNARE = {
    a: [[[0, 1, 1], [2, 0.5], [3, 0.45], [4, 0.9], [6, 0.6]], [[0, 1, 1], [2, 0.5], [4, 0.9, 1], [6, 0.6], [7, 0.45]]],
    b: [[[0, 1, 1], [2, 0.6], [3, 0.4], [4, 1, 1], [6, 0.6], [7, 0.45]], [[0, 1, 1], [1, 0.4], [2, 0.6], [4, 1, 1], [5, 0.4], [6, 0.7], [7, 0.5]]],
    t: [[[2, 0.3], [6, 0.3]], [[2, 0.3], [6, 0.3], [7, 0.22]]],
  };

  A.startTune = (intro = false) => {
    if (A.muted || !A.musicOn || !A.ctx || A.tune) return;
    const a = A.ctx, g = a.createGain();
    g.gain.value = 0.5; g.connect(A.music);
    /* a little of the parade ground's walls */
    const room = a.createDelay(1), fb = a.createGain(), wet = a.createGain(), damp = a.createBiquadFilter();
    room.delayTime.value = 0.11; fb.gain.value = 0.28; wet.gain.value = 0.16; damp.type = "lowpass"; damp.frequency.value = 2400;
    const send = a.createGain(); send.connect(room); room.connect(damp); damp.connect(fb); fb.connect(room); damp.connect(wet); wet.connect(g);
    const bus = a.createGain(); bus.connect(g); bus.connect(send);
    const st = { g, t0: a.currentTime + 0.1 + (intro ? A.COUNT_IN : 0), bar: 0, timer: null, intro };

    /* brass: a saw and a square, the filter opening on the attack as a cornet's does, a vibrato on a held note */
    const brass = (f, t, dur, vol, { bright = 3000, vib = 0.004, held = 0.8, type2 = "square" } = {}) => {
      if (!f) return;
      const o1 = a.createOscillator(), o2 = a.createOscillator(), lp = a.createBiquadFilter(), e = a.createGain();
      o1.type = "sawtooth"; o2.type = type2; o1.frequency.value = f; o2.frequency.value = f * 1.004;
      lp.type = "lowpass"; lp.Q.value = 1.5;
      lp.frequency.setValueAtTime(f * 1.2, t); lp.frequency.linearRampToValueAtTime(Math.min(bright * 1.4, f * 8), t + 0.03); lp.frequency.setTargetAtTime(Math.min(bright, f * 5), t + 0.04, 0.08);
      const end = t + Math.max(0.06, dur * held);
      e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(vol, t + 0.018); e.gain.setTargetAtTime(vol * 0.75, t + 0.03, 0.08);
      e.gain.setValueAtTime(vol * 0.75, end); e.gain.linearRampToValueAtTime(0, end + 0.05);
      if (dur > 0.35 && vib) {
        const l = a.createOscillator(), lg = a.createGain();
        l.frequency.value = 5.5; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * vib, t + 0.35);
        l.connect(lg); lg.connect(o1.frequency); lg.connect(o2.frequency); l.start(t); l.stop(end + 0.06);
      }
      o1.connect(lp); o2.connect(lp); lp.connect(e); e.connect(bus);
      o1.start(t); o2.start(t); o1.stop(end + 0.06); o2.stop(end + 0.06);
    };
    /* a plain voice: the trombone under the cornets, the horns' pah, the trio's held chord */
    const voice = (f, t, dur, vol, type = "triangle", cut = 1800) => {
      const o = a.createOscillator(), lp = a.createBiquadFilter(), e = a.createGain();
      o.type = type; o.frequency.value = f; lp.type = "lowpass"; lp.frequency.value = cut;
      e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(vol, t + 0.012); e.gain.setValueAtTime(vol, t + dur * 0.7); e.gain.linearRampToValueAtTime(0, t + dur);
      o.connect(lp); lp.connect(e); e.connect(bus); o.start(t); o.stop(t + dur + 0.02);
    };
    /* the tuba: a buzzing saw, dark */
    const tuba = (f, t, dur, vol) => {
      const o = a.createOscillator(), s = a.createOscillator(), lp = a.createBiquadFilter(), e = a.createGain();
      o.type = "sawtooth"; s.type = "sine"; o.frequency.value = f; s.frequency.value = f;
      lp.type = "lowpass"; lp.frequency.setValueAtTime(700, t); lp.frequency.setTargetAtTime(380, t + 0.02, 0.06);
      e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(vol, t + 0.02); e.gain.setTargetAtTime(vol * 0.6, t + 0.04, 0.08); e.gain.linearRampToValueAtTime(0, t + dur);
      o.connect(lp); s.connect(lp); lp.connect(e); e.connect(g); o.start(t); s.start(t); o.stop(t + dur + 0.02); s.stop(t + dur + 0.02);
    };
    const noise = (t, dur, vol, type, freq, q = 0.8, to = g) => {
      const s = a.createBufferSource(), f = a.createBiquadFilter(), e = a.createGain();
      s.buffer = noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = q;
      e.gain.setValueAtTime(vol, t); e.gain.exponentialRampToValueAtTime(0.001, t + dur);
      s.connect(f); f.connect(e); e.connect(to); s.start(t, Math.random()); s.stop(t + dur + 0.02);
    };
    /* the snare: a crack of noise on a short drum body; a flam has its grace note a moment before */
    const snare = (t, vol, flam = false, rim = false) => {
      if (flam) snare(t - 0.028, vol * 0.4);
      noise(t, rim ? 0.05 : 0.13, 0.2 * vol, "bandpass", rim ? 3800 : 2300, rim ? 2 : 0.7, bus);
      const o = a.createOscillator(), e = a.createGain();
      o.type = "triangle"; o.frequency.setValueAtTime(rim ? 420 : 210, t); o.frequency.exponentialRampToValueAtTime(rim ? 300 : 150, t + 0.06);
      e.gain.setValueAtTime(0.12 * vol, t); e.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      o.connect(e); e.connect(g); o.start(t); o.stop(t + 0.08);
    };
    /* a press roll: strokes too quick to count, swelling from one level to another */
    const roll = (t, dur, v0, v1) => { const n = Math.round(dur / 0.032); for (let i = 0; i < n; i++) snare(t + i * 0.032, v0 + (v1 - v0) * i / n); };
    const bass = (t, vol = 1) => {
      const o = a.createOscillator(), e = a.createGain();
      o.type = "sine"; o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.22);
      e.gain.setValueAtTime(0.55 * vol, t); e.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      o.connect(e); e.connect(g); o.start(t); o.stop(t + 0.32);
      noise(t, 0.06, 0.25 * vol, "lowpass", 300);
    };
    const cymbal = (t, vol, crash = false) => noise(t, crash ? 1.4 : 0.16, (crash ? 0.13 : 0.07) * vol, "highpass", crash ? 5200 : 6500, 0.6, bus);

    /* the bugle call over the drums, and a roll into a crash on the march's first note */
    if (intro) {
      const b0 = st.t0 - A.COUNT_IN;
      let t = b0;
      for (const bar of BUGLE) for (const [f, l] of bar) { brass(f, t, l * STEP, 0.075, { bright: 2200, vib: 0.007, held: l >= 4 ? 0.92 : 0.72, type2: "triangle" }); t += l * STEP; }
      for (let i = 0; i < IN_BARS - 1; i++) {
        const b = b0 + i * BAR;
        bass(b, 0.6); snare(b + 2 * STEP, 0.35, false, true); snare(b + 6 * STEP, 0.35, false, true);
        if (i === 1) snare(b + 7 * STEP, 0.3, false, true);
      }
      bass(b0 + (IN_BARS - 1) * BAR, 0.7);
      roll(b0 + (IN_BARS - 1) * BAR, BAR - 0.02, 0.2, 0.9);
    }

    const playBar = (bar, t) => {
      const { part, n, lead, chords } = bar, trio = part === "t", end = n % 8 === 7;
      /* the tune: the cornets, and the trombones an octave under them; the trio's a softer, rounder voice */
      let x = 0;
      for (const [f, l] of lead) {
        const s = t + x * STEP, d = l * STEP;
        if (f) {
          if (trio) brass(f, s, d, 0.05, { bright: 1500, vib: 0.005, held: 0.92, type2: "triangle" });
          else { brass(f, s, d, 0.06, { held: l >= 4 ? 0.88 : 0.68 }); voice(f / 2, s, d * (l >= 4 ? 0.88 : 0.68), 0.07, "triangle", 1200); }
        }
        x += l;
      }
      /* oom: the tuba on each beat, root then fifth, or each chord's root where it changes on the beat */
      const [c1, c2] = chords;
      const low = p => hz(at(p, 38));
      tuba(low(c1.bass), t, 0.24, trio ? 0.16 : 0.2);
      tuba(c2 ? low(c2.bass) : low(c1.tones[2]), t + 4 * STEP, 0.24, trio ? 0.13 : 0.17);
      /* pah: the horns on the off-beats; in the trio, the chord held under the tune instead */
      for (const [k, c] of [[2, c1], [6, c2 || c1]]) {
        const tones = c.seventh ? c.tones.slice(1) : c.tones;
        if (trio) { if (k === 2 || c2) for (const p of tones.slice(1, 3)) voice(hz(at(p, 55)), t + (k - 2) * STEP, (c2 ? 4 : 8) * STEP, 0.022, "triangle", 1400); }
        else for (const p of tones) voice(hz(at(p, 60)), t + k * STEP, 0.11, 0.032, "square", 2000);
      }
      /* the drums: the bass drum on the beats, the cymbals with it on the second, a crash at each strain's
         head, and at a phrase's end the snare fills it */
      bass(t, trio ? 0.5 : 1);
      if (!trio) { bass(t + 4 * STEP, 0.75); cymbal(t + 4 * STEP, part === "b" ? 1 : 0.7); }
      if (n === 0 && !trio) cymbal(t, 1, true);
      if (end && !trio) { for (let i = 0; i < 8; i++) snare(t + i * STEP, 0.45 + i * 0.07, i === 0 || i === 4); }
      else if (end) roll(t + 4 * STEP, 4 * STEP - 0.02, 0.12, 0.35);
      else for (const [k, v, fl] of SNARE[part][n % 2]) snare(t + k * STEP, v, !!fl, trio);
    };

    /* schedule a bar at a time, a little ahead */
    const sched = () => {
      while (st.t0 + st.bar * BAR < a.currentTime + 1.5) { playBar(SONG[st.bar % SONG.length], st.t0 + st.bar * BAR); st.bar++; }
    };
    sched();
    st.timer = setInterval(sched, 250);
    A.tune = st;
  };
