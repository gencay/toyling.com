// DOM-free helpers shared by the page and the tests.

export const PHASE = { AIM: 0, ROLLING: 1, SHOP: 2, LOST: 3, WON: 4 };
// Shot types, in the core's order (SINGLE = 0 … CLEARANCE = 7), with a one-line rule for the Shots panel.
export const SHOT_TYPES = [
  { name: "Single", rule: "1 ball potted" },
  { name: "Double", rule: "2 balls in one shot" },
  { name: "Treble", rule: "3+ balls in one shot" },
  { name: "Bank", rule: "Off a cushion first" },
  { name: "Combo", rule: "A ball knocks another in" },
  { name: "Kiss", rule: "Cue ball touches 2+ balls" },
  { name: "Long pot", rule: "Crosses half the table" },
  { name: "Clearance", rule: "Clears the table" },
];

export const POCKET_NAMES = ["Top left", "Top right", "Side left", "Side right", "Bottom left", "Bottom right"];

// The standard American pool ball set: 1-7 solids, 8 black, 9-15 stripes in the same colours as 1-7.
export const BALLS = [
  { n: 0, name: "cue", color: "#f4efe2", stripe: false },
  { n: 1, name: "yellow", color: "#f5c542", stripe: false },
  { n: 2, name: "blue", color: "#2f5fd0", stripe: false },
  { n: 3, name: "red", color: "#e0362c", stripe: false },
  { n: 4, name: "purple", color: "#7b4bc4", stripe: false },
  { n: 5, name: "orange", color: "#f08a2c", stripe: false },
  { n: 6, name: "green", color: "#2f9e5a", stripe: false },
  { n: 7, name: "maroon", color: "#7a2418", stripe: false },
  { n: 8, name: "black", color: "#1d1d24", stripe: false },
  { n: 9, name: "yellow", color: "#f5c542", stripe: true },
  { n: 10, name: "blue", color: "#2f5fd0", stripe: true },
  { n: 11, name: "red", color: "#e0362c", stripe: true },
  { n: 12, name: "purple", color: "#7b4bc4", stripe: true },
  { n: 13, name: "orange", color: "#f08a2c", stripe: true },
  { n: 14, name: "green", color: "#2f9e5a", stripe: true },
  { n: 15, name: "maroon", color: "#7a2418", stripe: true },
];

export function ballStyle(n) {
  const b = BALLS[n] ?? BALLS[0];
  return { color: b.color, stripe: b.stripe };
}

// Descriptions are short and use {text|kind} tags for highlighted keywords (see richParts):
//   pts = points (blue), mult = multipliers (red), money (gold), shot (green), pocket (orange), type (white).
export function offerLabel(kind, arg) {
  switch (kind) {
    case 0: return { title: `Polish ${arg}-ball`, text: `{+3 pts|pts} on the ${arg}-ball.` };
    case 1: return { title: "Hot pocket coin", text: `{×+1|mult} on the {${POCKET_NAMES[arg].toLowerCase()}|pocket} pocket.` };
    case 2: return { title: "Mult coin", text: "{+3 Mult|mult} on every scoring shot." };
    case 3: return { title: "Extra shot coin", text: "{+1 shot|shot} every round." };
    case 5: return { title: `Chalk: ${SHOT_TYPES[arg].name}`, text: `Use: {${SHOT_TYPES[arg].name}|type} {+${SHOT_MULT_STEP[arg]} Mult|mult}.` };
    default: return { title: `New ball: ${arg}`, text: `Adds the ${arg}-ball: {${arg} pts|pts}.` };
  }
}

// Mult a Chalk level adds to each shot type (mirrors TYPE_TABLE in src/game.zig).
export const SHOT_MULT_STEP = [1, 1, 2, 1, 2, 1, 1, 2];

// Splits "{+3 Mult|mult} on…" into [{ t: "+3 Mult", cls: "mult" }, { t: " on…", cls: "" }].
export function richParts(text) {
  const parts = [];
  const re = /\{([^|}]+)\|(\w+)\}/g;
  let i = 0;
  for (let m; (m = re.exec(text)); ) {
    if (m.index > i) parts.push({ t: text.slice(i, m.index), cls: "" });
    parts.push({ t: m[1], cls: m[2] });
    i = m.index + m[0].length;
  }
  if (i < text.length) parts.push({ t: text.slice(i), cls: "" });
  return parts;
}

export function plainText(text) {
  return richParts(text).map((p) => p.t).join("");
}

// What a coin changes, shown as its colour in the coin tray: "pts" (blue) adds points, "mult" (red) adds to a
// multiplier (Hot pocket, Mult, Chalk), "shot" (green) gives shots.
export function coinEffect(kind) {
  if (kind === 1 || kind === 2 || kind === 5) return "mult";
  if (kind === 3) return "shot";
  return "pts";
}

// What a tapped ball is: its colour, solid or stripe, and points.
export function ballInfo(n, points) {
  if (n === 0) return { title: "Cue ball", text: "Potting it: {−1 shot|shot}." };
  const b = BALLS[n];
  return { title: `${n}-ball`, text: `${b.name[0].toUpperCase() + b.name.slice(1)} ${b.stripe ? "stripe" : "solid"}. {${points} pts|pts} × {pocket|mult}.` };
}

export function shotBreakdown(points, mult, score) {
  if (score === 0) return "No pot";
  return `${points} × ${mult} = ${score}`;
}

// Angle from the cue ball to a point, in radians (table y grows downward).
export function aimAngle(cx, cy, px, py) {
  return Math.atan2(py - cy, px - cx);
}

// Power from a pull fraction: 0..1, with a small dead zone that cancels the shot.
export function powerFromDrag(fraction) {
  const p = Math.max(0, Math.min(1, fraction));
  return p < 0.04 ? 0 : p;
}

export const MOUSE_CHARGE_RANGE = 22.5; // table units of mouse movement along the charge direction for full power
const AXIS_SLOP = 1.2; // the first movement this long after locking sets the charge direction
// ---------------------------------------------------------------- touch controls (Pocket Run + Ultrapool)
// Aim: touch and rotate anywhere outside the dead-zone circle around the cue ball; the aim turns by the angle your
// finger sweeps around the cue ball, so far from the ball even big movements make fine adjustments.
// Shoot: press one of the power buttons beside the table and pull down; the pull sets the speed, pushing back up
// lowers it, and letting go shoots (at zero speed nothing happens). A second finger cancels the pull.
export const DEADZONE = 3.2; // dead-zone radius around the cue ball, in ball radii
export const PULL_PX = 170; // CSS pixels of pull for full power

export function inDeadzone(p, cue, ballR) {
  return Math.hypot(p[0] - cue[0], p[1] - cue[1]) < DEADZONE * ballR;
}

// The new aim after the finger moved from prev to cur (table units) around the cue ball.
export function rotateAim(angle, cue, prev, cur) {
  const a0 = Math.atan2(prev[1] - cue[1], prev[0] - cue[0]);
  const a1 = Math.atan2(cur[1] - cue[1], cur[0] - cue[0]);
  let d = a1 - a0;
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return angle + d;
}

// Power from how far the finger has pulled down from where it pressed the power button (CSS pixels).
export function pullPower(startY, y) {
  return powerFromDrag((y - startY) / PULL_PX);
}

// Shot input in table units: aim, lock, then move to build speed.
//   After locking, the first movement (any direction) sets the charge direction. Moving further that way raises
//   speed; moving back the opposite way lowers it again, down to zero, where releasing does not shoot.
//   Mouse: hover aims; press locks; drag to set speed; release shoots (release at zero speed cancels).
//   Escape or right-click cancels. Touch screens use rotateAim and pullPower below instead.
export function createShotInput(initialAngle = -Math.PI / 2) {
  const s = { angle: initialAngle, power: 0, locked: false, active: false, last: null, axis: null, kind: "mouse" };
  const aimAt = (p, cue) => {
    if (Math.hypot(p[0] - cue[0], p[1] - cue[1]) > 1) s.angle = aimAngle(cue[0], cue[1], p[0], p[1]);
  };
  // s.last is the anchor where this charge started; s.axis the unit direction that adds speed.
  const charge = (p) => {
    const dx = p[0] - s.last[0];
    const dy = p[1] - s.last[1];
    if (!s.axis) {
      const d = Math.hypot(dx, dy);
      if (d < AXIS_SLOP) return;
      s.axis = [dx / d, dy / d];
    }
    s.power = powerFromDrag((dx * s.axis[0] + dy * s.axis[1]) / MOUSE_CHARGE_RANGE);
  };
  const unlock = () => {
    s.locked = false;
    s.power = 0;
    s.last = null;
    s.axis = null;
  };
  return {
    state: s,
    // press: locks the aim where it is
    down(p) {
      s.active = true;
      s.locked = true;
      s.power = 0;
      s.last = p;
      s.axis = null;
    },
    move(p, cue) {
      if (s.active && s.locked) charge(p);
      else if (!s.active) aimAt(p, cue);
    },
    hover(p, cue) {
      this.move(p, cue);
    },
    // release: returns the power to shoot with, or 0
    up() {
      const out = s.active && s.locked ? s.power : 0;
      s.active = false;
      unlock();
      return out;
    },
    cancel() {
      s.active = false;
      unlock();
    },
    nudge(da) {
      if (!s.locked) s.angle += da;
    },
  };
}

// ---------------------------------------------------------------- rolling balls
// Orientation is a 3x3 matrix whose columns are the ball's body axes in table space (x right, y down, z up).
// Body axis 0 points at the number spot, axis 2 is the stripe's pole.
export function identity() {
  return [0, 0, 1, 1, 0, 0, 0, 1, 0]; // number spot faces up, digits read left to right
}

// Rolls the ball by a displacement (table units) without slipping.
export function roll(m, dx, dy, r) {
  const d = Math.hypot(dx, dy);
  if (d < 1e-6) return m;
  const ax = -dy / d, ay = dx / d; // axis = z × direction
  const a = d / r;
  const c = Math.cos(a), sn = Math.sin(a);
  const out = m.slice();
  for (let col = 0; col < 3; col++) {
    const vx = m[col * 3], vy = m[col * 3 + 1], vz = m[col * 3 + 2];
    const dot = ax * vx + ay * vy;
    // Rodrigues: v c + (k × v) s + k (k·v)(1 − c), with k = (ax, ay, 0)
    const kx = ay * vz, ky = -ax * vz, kz = ax * vy - ay * vx;
    out[col * 3] = vx * c + kx * sn + ax * dot * (1 - c);
    out[col * 3 + 1] = vy * c + ky * sn + ay * dot * (1 - c);
    out[col * 3 + 2] = vz * c + kz * sn;
  }
  return out;
}

function hexRgb(h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}

// Renders a ball as pixel art into RGBA pixels (size × size), in the chunky style of Balatro: a 4-step lighting
// ramp with ordered (Bayer) dithering between steps, a hard white highlight, a dark one-pixel rim and no
// anti-aliasing. Solids (1–8) are coloured all over with a small white number circle on two opposite sides;
// stripes (9–15) are white with a coloured band. Number circles and stripes roll with the ball (orientation m).
// dim (0..1) darkens the ball as it drops into a pocket.
const SPOT = 0.92; // |cos| beyond which a point is inside the number circle (radius about 0.39 of the ball's)
const SPOT_WIDE = 0.84; // for two-digit numbers (radius about 0.54 of the ball's)
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const RAMP = [0.5, 0.74, 0.94, 1.12];
const L = (() => {
  const v = [-0.45, -0.6, 0.66];
  const n = Math.hypot(...v);
  return v.map((c) => c / n);
})();
const HALF = (() => {
  const v = [L[0], L[1], L[2] + 1];
  const n = Math.hypot(...v);
  return v.map((c) => c / n);
})();

export function ballPixels(n, m, size, dim = 0) {
  const px = new Uint8ClampedArray(size * size * 4);
  const r = size / 2;
  const st = ballStyle(n);
  const base = hexRgb(st.color);
  const white = [246, 240, 226];
  const ink = [26, 22, 34];
  const label = n > 0 ? String(n) : "";
  const cols = label.length * 4 - 1;
  const fk = Math.max(1, Math.round(size / 24)); // sprite pixels per font pixel
  const cell = fk / r;
  const spot = label.length > 1 ? SPOT_WIDE : SPOT; // two-digit numbers get a slightly wider circle
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const x = (i + 0.5 - r) / r;
      const y = (j + 0.5 - r) / r;
      const q = x * x + y * y;
      if (q > 1) continue;
      const z = Math.sqrt(1 - q);
      const b0 = m[0] * x + m[1] * y + m[2] * z;
      const b1 = m[3] * x + m[4] * y + m[5] * z;
      const b2 = m[6] * x + m[7] * y + m[8] * z;
      let c = st.stripe && Math.abs(b2) >= 0.55 ? white : base;
      const onSpot = n > 0 && Math.abs(b0) > spot - 0.04;
      if (n > 0 && Math.abs(b0) > spot) {
        c = white;
        const sg = Math.sign(b0);
        const col = Math.floor((b1 * sg) / cell + cols / 2);
        const row = Math.floor(b2 / cell + 2.5);
        if (row >= 0 && row < 5 && col >= 0 && col < cols && col % 4 !== 3 && DIGITS[label[Math.floor(col / 4)]][row][col % 4] === "1") c = ink;
      }
      const ndl = Math.max(0, x * L[0] + y * L[1] + z * L[2]);
      const ndh = Math.max(0, x * HALF[0] + y * HALF[1] + z * HALF[2]);
      // lighting value, dithered onto a 4-step ramp
      const v = 0.3 + 0.85 * ndl + (BAYER[(j % 4) * 4 + (i % 4)] - 0.5) * 0.22;
      let k = RAMP[Math.max(0, Math.min(3, Math.floor((v - 0.32) / 0.22)))];
      if (q > 1 - 2.2 / r) k *= 0.62; // dark one-pixel rim
      k *= 1 - dim * 0.8;
      const o = (j * size + i) * 4;
      if (ndh > 0.988 && dim < 0.5 && !onSpot) {
        px[o] = px[o + 1] = px[o + 2] = 255; // hard highlight, kept off the number
      } else {
        px[o] = c[0] * k;
        px[o + 1] = c[1] * k;
        px[o + 2] = c[2] * k;
      }
      px[o + 3] = 255;
    }
  }
  return px;
}

// ---------------------------------------------------------------- pocket drop and ball return
export const SINK_TIME = 0.3;

// A ball dropping into a pocket: it carries a little of its speed over the lip, slides to the back of the hole
// and falls, shrinking and darkening as it goes down. No spinning; real pockets just swallow the ball.
export function sinkPose(t, s) {
  const u = Math.min(1, t / SINK_TIME);
  const carry = (1 - Math.exp(-10 * t)) / 10;
  const fx = s.x + s.vx * carry * 0.5;
  const fy = s.y + s.vy * carry * 0.5;
  const e = u * u * (3 - 2 * u);
  return {
    x: fx + (s.px - fx) * e,
    y: fy + (s.py - fy) * e,
    scale: 1 - 0.42 * u * u,
    dim: Math.min(1, u * 1.1),
    done: t >= SINK_TIME,
    dx: s.vx * 0.016 * (1 - u),
    dy: s.vy * 0.016 * (1 - u),
  };
}

// The return gully runs inside the rails: from each pocket out to the rail's centre line, along the side rail to
// the foot rail, along the foot rail to the middle, then down into the tray window in the apron (like a coin-op
// table returning balls to its front). g: { W, H, rail (centre-line offset outside the bed), trayY }.
export function returnPath(pocket, g) {
  const { W, H, rail, trayY } = g;
  const sideX = pocket.x < W / 2 ? -rail : W + rail;
  const footY = H + rail;
  const pts = [[pocket.x, pocket.y]];
  if (pocket.y > H) pts.push([pocket.x, footY]);
  else pts.push([sideX, pocket.y], [sideX, footY]);
  pts.push([W / 2, footY], [W / 2, trayY]);
  return pts;
}

export function pathLength(pts) {
  let d = 0;
  for (let i = 1; i < pts.length; i++) d += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return d;
}

export function pointAlong(pts, d) {
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const l = Math.hypot(x1 - x0, y1 - y0);
    if (d <= l || i === pts.length - 1) {
      const t = l === 0 ? 1 : Math.max(0, Math.min(1, d / l));
      return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t];
    }
    d -= l;
  }
  return pts[pts.length - 1];
}

// Balls settle in the tray from the middle outward: centre, right, left, right, left…
export function traySlot(k, W, gap) {
  if (k === 0) return W / 2;
  return W / 2 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * gap;
}

// Colour of the power ring: mint at soft shots, gold in the middle, red near full power.
export function ringColor(power) {
  return power < 0.4 ? "#5fd6a4" : power < 0.75 ? "#f5c542" : "#e2574c";
}

export function bestKey() {
  return "rack-and-ruin.best.v1";
}

export function readBest(storage) {
  try {
    const raw = storage.getItem(bestKey());
    const v = raw ? JSON.parse(raw) : null;
    return v && Number.isFinite(v.total) ? v : { total: 0, round: 0 };
  } catch {
    return { total: 0, round: 0 };
  }
}

export function writeBest(storage, total, round) {
  const best = readBest(storage);
  if (total > best.total || round > best.round) {
    const next = { total: Math.max(total, best.total), round: Math.max(round, best.round) };
    storage.setItem(bestKey(), JSON.stringify(next));
    return next;
  }
  return best;
}

// 3x5 pixel digits for ball numbers and pocket values.
export const DIGITS = {
  0: ["111", "101", "101", "101", "111"],
  1: ["010", "110", "010", "010", "111"],
  2: ["111", "001", "111", "100", "111"],
  3: ["111", "001", "011", "001", "111"],
  4: ["101", "101", "111", "001", "001"],
  5: ["111", "100", "111", "001", "111"],
  6: ["111", "100", "111", "101", "111"],
  7: ["111", "001", "010", "010", "010"],
  8: ["111", "101", "111", "101", "111"],
  9: ["111", "101", "111", "001", "111"],
  "+": ["000", "010", "111", "010", "000"],
  x: ["000", "101", "010", "101", "000"],
};

export function textWidth(s) {
  return s.length * 4 - 1;
}

// Long, thick coloured streaks for a billiard-saloon carpet tile (see CARPETS in config.js). Each streak is a bent
// line of two segments at its own angle, so the pattern is asymmetric. Deterministic for a given seed.
export function carpetStreaks(spec, size, seed = 11) {
  let s = seed;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const out = [];
  for (let i = 0; i < spec.count; i++) {
    const angle = (i / spec.count) * Math.PI + (rnd() - 0.5) * 0.9;
    const len = size * (spec.length[0] + rnd() * (spec.length[1] - spec.length[0]));
    const bend = (rnd() - 0.5) * 0.8;
    const x0 = rnd() * size, y0 = rnd() * size;
    const x1 = x0 + Math.cos(angle) * len * 0.5, y1 = y0 + Math.sin(angle) * len * 0.5;
    const x2 = x1 + Math.cos(angle + bend) * len * 0.5, y2 = y1 + Math.sin(angle + bend) * len * 0.5;
    out.push({
      color: spec.colors[i % spec.colors.length],
      width: Math.round(spec.width[0] + rnd() * (spec.width[1] - spec.width[0])),
      points: [[x0, y0], [x1, y1], [x2, y2]],
      angle,
      length: len,
    });
  }
  return out;
}

