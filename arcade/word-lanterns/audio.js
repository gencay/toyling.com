// Generative relaxing music and soft sound effects with Web Audio. No audio files are needed.

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
const CHORDS = [[48, 60, 64, 67], [45, 57, 60, 64], [41, 57, 60, 65], [43, 55, 59, 62]];
const PENTA = [60, 62, 64, 67, 69, 72, 74, 76, 79];
const MODES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
};
const scale = (root, mode) => Array.from({ length: 24 }, (_, i) => root + 12 * Math.floor(i / 7) + MODES[mode][i % 7]);

// Each theme has its own genre for selecting letters: a key, a mode and an instrument.
/** Loudness of the single note for the k-th selected letter (0-based); later letters are slightly brighter. */
export const letterGain = (k) => 0.14 + Math.min(k, 8) * 0.008;

/** Share of a single note's loudness that a whole chord gets, so several notes at once never feel jarring. */
export const CHORD_LEVEL = 0.75;

/**
 * Per-note loudness when `count` selected notes sound together. Notes add up roughly by power, so dividing by
 * the square root of the count makes the whole chord about CHORD_LEVEL times as loud as one letter's note.
 */
export const chordNoteGain = (count) => {
  const n = Math.max(count, 1);
  return n === 1 ? letterGain(0) : (letterGain(n - 1) * CHORD_LEVEL) / Math.sqrt(n);
};

export const GENRES = {
  Garden: { name: "Pastoral folk", scale: scale(55, "major"), voice: "flute" },
  Kitchen: { name: "Cool jazz", scale: scale(53, "dorian"), voice: "vibes" },
  Travel: { name: "Bossa nova", scale: scale(57, "mixolydian"), voice: "guitar" },
  Birds: { name: "Baroque", scale: scale(50, "major"), voice: "harpsichord" },
  Music: { name: "Romantic piano", scale: scale(51, "major"), voice: "piano" },
  "Old Films": { name: "Swing", scale: scale(48, "mixolydian"), voice: "trumpet" },
  Holidays: { name: "Celesta carol", scale: scale(55, "major"), voice: "celesta", sparkle: true },
  Family: { name: "Lullaby", scale: scale(60, "major"), voice: "musicbox" },
};

function walk(audio) {
  const step = Math.floor(Math.random() * 5) - 2;
  audio.melody = Math.min(PENTA.length - 1, Math.max(0, (audio.melody ?? 4) + step));
  return PENTA[audio.melody];
}

export const TRACKS = {
  evening: {
    name: "Evening Piano",
    beat: 0.55,
    step(a, beat, t) {
      const chord = CHORDS[Math.floor(beat / 8) % CHORDS.length];
      if (beat % 8 === 0) {
        a.note(midi(chord[0]), t, { type: "triangle", decay: 4, gain: 0.16 });
        chord.slice(1).forEach((m, i) => a.note(midi(m), t + i * 0.12, { type: "triangle", decay: 3, gain: 0.05 }));
      }
      if (beat % 8 !== 0 && Math.random() < 0.55) a.note(midi(walk(a)), t, { type: "triangle", decay: 1.8, gain: 0.1 });
    },
  },
  musicbox: {
    name: "Music Box",
    beat: 0.4,
    step(a, beat, t) {
      const chord = CHORDS[Math.floor(beat / 8) % CHORDS.length];
      if (beat % 8 === 0) a.note(midi(chord[0] + 12), t, { type: "sine", decay: 2.5, gain: 0.1 });
      if (Math.random() < 0.7) a.note(midi(walk(a) + 12), t, { type: "sine", decay: 1.2, gain: 0.07 });
    },
  },
  night: {
    name: "Night Pads",
    beat: 0.7,
    step(a, beat, t) {
      const chord = CHORDS[Math.floor(beat / 8) % CHORDS.length];
      if (beat % 8 === 0) {
        chord.forEach((m) => a.note(midi(m), t, { type: "sawtooth", attack: 1.6, decay: 5, gain: 0.025 }));
      }
      if (Math.random() < 0.22) a.note(midi(walk(a)), t, { type: "sine", attack: 0.05, decay: 2.2, gain: 0.08 });
    },
  },
};

export class Sound {
  constructor() {
    this.ctx = null;
    this.timer = null;
    this.track = null;
    this.volume = 0.4;
    this.sfx = true;
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      const ctx = new AC();
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.connect(ctx.destination);
      this.musicGain = ctx.createGain();
      this.musicGain.gain.value = this.volume * 0.6;
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.value = 2400;
      this.musicBus = lowpass;
      lowpass.connect(this.musicGain);
      const delay = ctx.createDelay();
      delay.delayTime.value = 0.38;
      const feedback = ctx.createGain();
      feedback.gain.value = 0.3;
      const wet = ctx.createGain();
      wet.gain.value = 0.25;
      lowpass.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(wet);
      wet.connect(this.musicGain);
      this.musicGain.connect(this.master);
      this.sfxGain = ctx.createGain();
      this.sfxGain.gain.value = 0.5;
      this.sfxGain.connect(this.master);
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  }

  setVolume(v) {
    this.volume = v;
    if (this.musicGain) this.musicGain.gain.setTargetAtTime(v * 0.6, this.ctx.currentTime, 0.1);
  }

  play(id) {
    if (!this.ensure()) return;
    const track = TRACKS[id] ?? TRACKS.evening;
    if (this.timer && this.track === track) return;
    this.stop();
    this.track = track;
    this.beat = 0;
    this.next = this.ctx.currentTime + 0.15;
    this.timer = setInterval(() => this.schedule(), 100);
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
  }

  schedule() {
    const ctx = this.ctx;
    while (this.next < ctx.currentTime + 0.3) {
      this.track.step(this, this.beat, this.next);
      this.next += this.track.beat;
      this.beat++;
    }
  }

  note(freq, t, { type = "sine", attack = 0.01, decay = 1, gain = 0.1, out } = {}) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    osc.connect(g);
    g.connect(out ?? this.musicBus);
    osc.start(t);
    osc.stop(t + attack + decay + 0.05);
  }

  // A bell-like, celesta-style tone for selecting letters.
  bell(m, t, gain = 0.16, decay = 0.9) {
    const out = this.sfxGain;
    const f = midi(m);
    this.note(f, t, { type: "sine", attack: 0.005, decay, gain, out });
    this.note(f * 2, t, { type: "triangle", attack: 0.005, decay: decay * 0.5, gain: gain * 0.35, out });
    this.note(f * 3.01, t, { type: "sine", attack: 0.003, decay: decay * 0.25, gain: gain * 0.12, out });
  }

  setGenre(theme) {
    this.genre = GENRES[theme] ?? GENRES.Birds;
  }

  // One tone in the current theme's instrument.
  voice(m, t, gain) {
    const out = this.sfxGain;
    const f = midi(m);
    const n = (mult, type, decay, g, attack = 0.005) => this.note(f * mult, t, { type, attack, decay, gain: gain * g, out });
    switch ((this.genre ?? GENRES.Birds).voice) {
      case "flute":
        n(1, "sine", 0.9, 1, 0.04);
        n(2, "triangle", 0.5, 0.15, 0.05);
        break;
      case "vibes":
        n(1, "sine", 1.6, 1);
        n(4, "sine", 0.3, 0.12);
        n(1.003, "sine", 1.4, 0.4);
        break;
      case "guitar":
        n(1, "triangle", 0.8, 1, 0.003);
        n(2, "sawtooth", 0.12, 0.12, 0.002);
        break;
      case "harpsichord":
        n(1, "square", 0.45, 0.28, 0.002);
        n(2, "sine", 0.6, 0.6, 0.002);
        n(1, "sine", 0.7, 0.6, 0.002);
        break;
      case "piano":
        n(1, "triangle", 1.5, 1, 0.004);
        n(2, "sine", 0.9, 0.35);
        n(3, "sine", 0.4, 0.1);
        break;
      case "trumpet":
        n(1, "square", 0.5, 0.22, 0.03);
        n(1, "sawtooth", 0.4, 0.15, 0.03);
        n(1, "sine", 0.6, 0.6, 0.02);
        break;
      case "musicbox":
        n(1, "sine", 1.2, 0.9, 0.002);
        n(4, "sine", 0.15, 0.08, 0.002);
        break;
      default:
        this.bell(m, t, gain, 1);
        if (this.genre?.sparkle) n(6, "sine", 0.08, 0.06, 0.001);
    }
  }

  degree(i) {
    const s = (this.genre ?? GENRES.Birds).scale;
    return s[Math.min(Math.max(i, 0), s.length - 1)];
  }

  // Each selection starts on a new degree of the theme's scale and climbs one note per letter.
  letter(k, startDegree) {
    if (!this.sfx || !this.ensure()) return;
    this.voice(this.degree(startDegree + k), this.ctx.currentTime + 0.005, letterGain(k));
    this.onNote?.(1);
  }

  // All notes of the selection so far, gently strummed together like a chord.
  chord(count, startDegree) {
    if (!this.sfx || !this.ensure()) return;
    const t = this.ctx.currentTime + 0.005;
    const g = chordNoteGain(count);
    for (let k = 0; k < count; k++) this.voice(this.degree(startDegree + k), t + k * 0.028, g);
    this.onNote?.(count);
  }

  // A soft wooden knock, used when the mascot taps on a letter.
  knock() {
    if (!this.sfx || !this.ensure()) return;
    const t = this.ctx.currentTime + 0.005;
    this.note(midi(55), t, { type: "triangle", attack: 0.002, decay: 0.12, gain: 0.16, out: this.sfxGain });
    this.note(midi(67), t, { type: "sine", attack: 0.002, decay: 0.06, gain: 0.06, out: this.sfxGain });
  }

  // A small cadence in the theme's key (V then I) that rises with the combo level.
  cadence(level = 0) {
    if (!this.sfx || !this.ensure()) return;
    const t = this.ctx.currentTime + 0.02;
    const lift = Math.min(level, 4);
    [4, 6, 8, 11].forEach((d, i) => this.voice(this.degree(d + lift), t + i * 0.045, 0.08));
    [7, 9, 11, 14, 16].forEach((d, i) => this.voice(this.degree(d + lift), t + 0.22 + i * 0.06, 0.12));
  }

  effect(kind) {
    if (!this.sfx || !this.ensure()) return;
    const t = this.ctx.currentTime + 0.01;
    const out = this.sfxGain;
    const seq = {
      found: [[72, 0], [76, 0.09], [79, 0.18]],
      complete: [[60, 0], [64, 0.1], [67, 0.2], [72, 0.3], [76, 0.4], [79, 0.5], [84, 0.65]],
      hint: [[79, 0], [84, 0.12]],
      miss: [[55, 0]],
      coin: [[84, 0], [88, 0.08]],
    }[kind];
    if (!seq) return;
    for (const [m, dt] of seq) {
      this.note(midi(m), t + dt, { type: kind === "miss" ? "triangle" : "sine", decay: kind === "miss" ? 0.25 : 0.9, gain: kind === "miss" ? 0.05 : 0.18, out });
    }
  }
}
