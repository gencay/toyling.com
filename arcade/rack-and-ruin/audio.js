// Synthesized table sounds (no audio files). Every sound is built from noise and oscillators, shaped to resemble
// the real thing: a leather tip on phenolic, a ball dropping onto a rubber pocket liner, a ball rumbling through the
// wooden return gully under the table, and the clack of balls meeting in the return tray.

let ctx = null;
let master = null;
let noiseBuf = null;
let enabled = true;

export function setSound(on) {
  enabled = on;
}

function audio() {
  if (!enabled) return null;
  try {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createDynamicsCompressor();
      master.threshold.value = -18;
      master.ratio.value = 4;
      master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      let brown = 0;
      for (let i = 0; i < d.length; i++) {
        brown = (brown + 0.02 * (Math.random() * 2 - 1)) / 1.02; // brown noise: deep rumble for rolling
        d[i] = brown * 3.5;
      }
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function out(pan = 0) {
  const p = ctx.createStereoPanner();
  p.pan.value = Math.max(-1, Math.min(1, pan));
  p.connect(master);
  return p;
}

function env(node, t0, peak, attack, decay) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
  node.connect(g);
  return g;
}

function whiteBurst(t0, dur, freq, q, peak, dest) {
  const n = ctx.createBufferSource();
  const len = Math.ceil(ctx.sampleRate * dur);
  const b = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  n.buffer = b;
  const f = ctx.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = freq;
  f.Q.value = q;
  n.connect(f);
  env(f, t0, peak, 0.001, dur).connect(dest);
  n.start(t0);
  n.stop(t0 + dur + 0.02);
}

function tone(t0, freq, endFreq, dur, peak, dest, type = "sine") {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  o.frequency.exponentialRampToValueAtTime(endFreq, t0 + dur);
  env(o, t0, peak, 0.002, dur).connect(dest);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

// Cue tip on the cue ball: a soft leather thock with a bright phenolic ping that grows with power.
export function strike(power, pan = 0) {
  if (!audio()) return;
  const t = ctx.currentTime;
  const dest = out(pan);
  whiteBurst(t, 0.03, 1800, 1.2, 0.25 + power * 0.35, dest);
  tone(t, 2600, 2300, 0.05 + power * 0.04, 0.05 + power * 0.12, dest);
  tone(t, 180, 120, 0.06, 0.15, dest, "triangle");
}

// Ball meets ball: the hard, bright "clack" of two phenolic resin balls. Modal synthesis: a very short noise
// transient (the contact) excites a few high, slightly inharmonic partials that ring for only a few tens of
// milliseconds, over a short low "tock" from the ball bodies. Harder hits are louder and brighter (upper partials
// rise faster than the fundamental); each hit is detuned a little so repeated clicks never sound identical.
const CLACK_MODES = [
  // [frequency Hz, decay s, relative level]
  [3050, 0.034, 1.0],
  [4480, 0.026, 0.62],
  [6210, 0.018, 0.42],
  [8740, 0.011, 0.26],
];

export function clack(strength = 0.6, pan = 0, pitch = 1) {
  if (!audio()) return;
  const t = ctx.currentTime;
  const dest = out(pan);
  const s = Math.max(0.05, Math.min(1, strength));
  const level = 0.06 + 0.5 * s ** 0.8;
  const detune = pitch * (1 + (Math.random() - 0.5) * 0.06);
  // contact transient: 3-5 ms of high-passed noise
  const n = ctx.createBufferSource();
  const len = Math.ceil(ctx.sampleRate * 0.006);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.18));
  n.buffer = buf;
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 1800 + 2200 * s;
  const ng = ctx.createGain();
  ng.gain.value = level * 0.9;
  n.connect(hp).connect(ng).connect(dest);
  n.start(t);
  // ringing partials
  CLACK_MODES.forEach(([f, decay, rel], k) => {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = f * detune * (1 + (Math.random() - 0.5) * 0.02);
    const g = ctx.createGain();
    const bright = k === 0 ? 1 : s ** (0.6 + k * 0.4); // soft taps lose the upper partials
    const peak = level * rel * bright * 0.55;
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay * (0.8 + s * 0.4));
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + decay + 0.03);
  });
  // body "tock"
  tone(t, 1250 * detune, 1100 * detune, 0.014, level * 0.22, dest, "sine");
}

// A ball dropping into a pocket: a muffled thud on the rubber liner, then a hollow knock inside the table.
export function pocketDrop(pan = 0) {
  if (!audio()) return;
  const t = ctx.currentTime;
  const dest = out(pan);
  whiteBurst(t, 0.05, 420, 1.4, 0.5, dest);
  tone(t, 140, 70, 0.18, 0.45, dest);
  tone(t + 0.07, 260, 190, 0.12, 0.18, dest, "triangle");
}

// The ball rolling through the return gully: a filtered rumble that pans from the pocket toward the tray.
export function gullyRoll(duration, panFrom, panTo) {
  if (!audio()) return;
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(260, t);
  lp.frequency.linearRampToValueAtTime(420, t + duration);
  const body = ctx.createBiquadFilter();
  body.type = "peaking";
  body.frequency.value = 180;
  body.gain.value = 9;
  body.Q.value = 3;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.5, t + 0.08);
  g.gain.setValueAtTime(0.5, t + duration * 0.8);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  // wobble as the ball ticks over the gully joints
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 11;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.18;
  lfo.connect(lfoGain).connect(g.gain);
  const p = ctx.createStereoPanner();
  p.pan.setValueAtTime(panFrom, t);
  p.pan.linearRampToValueAtTime(panTo, t + duration);
  src.connect(lp).connect(body).connect(g).connect(p).connect(master);
  src.start(t);
  lfo.start(t);
  src.stop(t + duration + 0.05);
  lfo.stop(t + duration + 0.05);
}

// A ball arriving in the return tray: a wooden knock, then a clack if it meets another ball.
export function trayLand(hitsBall, pan = 0) {
  if (!audio()) return;
  const t = ctx.currentTime;
  const dest = out(pan);
  tone(t, 320, 230, 0.09, 0.25, dest, "triangle");
  whiteBurst(t, 0.03, 900, 1.5, 0.25, dest);
  if (hitsBall) setTimeout(() => clack(0.45, pan, 0.92), 70);
}

// Round won / soft UI cues.
export function chime(freqs, gap = 0.08) {
  if (!audio()) return;
  const t = ctx.currentTime;
  const dest = out(0);
  freqs.forEach((f, i) => tone(t + i * gap, f, f * 0.995, 0.35, 0.12, dest, "triangle"));
}

export function blip(freq = 440, vol = 0.08) {
  if (!audio()) return;
  tone(ctx.currentTime, freq, freq, 0.07, vol, out(0), "square");
}

// A ball hitting a cushion: a soft rubber thump.
export function cushion(strength = 0.5, pan = 0) {
  if (!audio()) return;
  const t = ctx.currentTime;
  const dest = out(pan);
  whiteBurst(t, 0.04, 380, 1.1, 0.12 + strength * 0.3, dest);
  tone(t, 120, 85, 0.09, 0.08 + strength * 0.2, dest);
}

// A sweet, music-box-like note for musical collisions: a sine with a soft octave and twelfth, a quick attack and a
// gentle decay. Louder hits ring louder and a little longer.
export function note(freq, strength = 0.6, pan = 0, level = 1) {
  if (!audio()) return;
  const t = ctx.currentTime;
  const dest = out(pan);
  const s = Math.max(0.15, Math.min(1, strength));
  const dur = 0.6 + s * 0.6;
  const peak = (0.05 + 0.13 * s) * level;
  [
    [1, 1],
    [2, 0.35],
    [3, 0.12],
  ].forEach(([mult, rel]) => {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = freq * mult;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak * rel, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur / mult);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
  });
}
