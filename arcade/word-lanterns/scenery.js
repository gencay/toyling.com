// Colorful procedural backdrops, one look per theme, drawn in parallax layers behind the play area.
// Generation and the note "pulse" are pure so tests can check them; drawScene only needs a 2D context.

/** Per-theme sky gradient, hill colors and the props that float in each layer (far to near). */
export const SCENES = {
  Garden: {
    sky: ["#6fd3ff", "#bff3ff", "#fff6c9"],
    hills: ["#7ee08a", "#4cc56a", "#2fa957"],
    props: [["cloud"], ["flower", "butterfly"], ["flower", "sparkle"]],
    colors: ["#ff6fa3", "#ffd84d", "#ffffff", "#c49bff", "#ff9a4d"],
  },
  Kitchen: {
    sky: ["#ffb3c7", "#ffd6a5", "#fff3d6"],
    hills: ["#ff8fb1", "#ff6f9c", "#e9507f"],
    props: [["bubble"], ["candy", "heart"], ["sparkle", "candy"]],
    colors: ["#ff6fa3", "#6fd6ff", "#ffd84d", "#8ef07a", "#ffffff"],
  },
  Travel: {
    sky: ["#3fc1ff", "#8ee6ff", "#d9fbff"],
    hills: ["#3be0c8", "#20c3b0", "#0fa597"],
    props: [["cloud"], ["kite", "cloud"], ["sparkle", "bubble"]],
    colors: ["#ff6f61", "#ffd84d", "#ffffff", "#ff9a4d", "#c49bff"],
  },
  Birds: {
    sky: ["#ff9ec4", "#ffc58f", "#fff0a8"],
    hills: ["#9be27a", "#6fcf5c", "#4fb54a"],
    props: [["cloud"], ["bird", "cloud"], ["sparkle", "leaf"]],
    colors: ["#5aa9ff", "#ff6fa3", "#ffffff", "#ffd84d", "#8ef07a"],
  },
  Music: {
    sky: ["#9b6bff", "#d18cff", "#ffc2f0"],
    hills: ["#7a5cff", "#6447e8", "#4e33cf"],
    props: [["star"], ["note", "star"], ["note", "sparkle"]],
    colors: ["#ffd84d", "#6fd6ff", "#ff6fa3", "#ffffff", "#8ef07a"],
  },
  "Old Films": {
    sky: ["#ff6f61", "#ffa86b", "#ffe08a"],
    hills: ["#e4485d", "#c93450", "#a92345"],
    props: [["star"], ["reel", "star"], ["sparkle", "star"]],
    colors: ["#ffd84d", "#ffffff", "#ff6fa3", "#6fd6ff", "#8a6bff"],
  },
  Holidays: {
    sky: ["#5aa9ff", "#a7c8ff", "#e9e3ff"],
    hills: ["#ffffff", "#e8f1ff", "#d3e3ff"],
    props: [["snow"], ["gift", "snow"], ["sparkle", "heart"]],
    colors: ["#ff6fa3", "#8ef07a", "#ffd84d", "#ff6f61", "#c49bff"],
  },
  Family: {
    sky: ["#ffd84d", "#ffb3c7", "#ffe6f0"],
    hills: ["#ffa3c4", "#ff86b0", "#f2699b"],
    props: [["bubble"], ["heart", "balloon"], ["sparkle", "heart"]],
    colors: ["#ff6fa3", "#6fd6ff", "#ff9a4d", "#8ef07a", "#c49bff"],
  },
};

// Layer depth: 0 = far (slow, large, soft), 1 = near (faster, small, crisp).
const DEPTHS = [0.25, 0.6, 1];
const COUNTS = [5, 7, 9];

function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

/** Builds a scene for a theme. The same theme and seed always give the same scene. Coordinates are 0..1 of the view. */
export function generateScene(themeName, seed) {
  const def = SCENES[themeName] ?? SCENES.Garden;
  const r = seeded(seed * 7 + 13);
  const layers = DEPTHS.map((depth, li) => ({
    depth,
    hill: { color: def.hills[li], base: 0.62 + li * 0.12, amp: 0.035 + r() * 0.03, freq: 1.5 + r() * 2, phase: r() * 6.28 },
    items: Array.from({ length: COUNTS[li] }, () => ({
      kind: def.props[li][Math.floor(r() * def.props[li].length)],
      x: r(),
      y: li === 0 ? 0.05 + r() * 0.35 : 0.08 + r() * 0.75,
      size: (li === 0 ? 0.09 : li === 1 ? 0.055 : 0.03) * (0.7 + r() * 0.6),
      color: def.colors[Math.floor(r() * def.colors.length)],
      phase: r() * 6.28,
    })),
  }));
  return { theme: themeName, sky: def.sky, layers };
}

/**
 * A soft, smoothed reaction to played notes. kick() raises a target; step() eases the value toward it and lets the
 * target fade, so the scene breathes with the music without jumping.
 */
export class Pulse {
  constructor() {
    this.value = 0;
    this.target = 0;
  }
  kick(amount = 0.2) {
    this.target = Math.min(1, this.target + amount);
  }
  step(dt) {
    const d = Math.min(Math.max(dt, 0), 0.1);
    this.target *= Math.exp(-d * 1.5);
    this.value += (this.target - this.value) * (1 - Math.exp(-d * 5));
    return this.value;
  }
}

/** How far a layer has drifted sideways at time t, as a share of the view width (wraps 0..1). */
export const drift = (depth, t) => (((t * 0.006 * (0.4 + depth)) % 1) + 1) % 1;

// ---- Drawing ----

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  return `rgb(${ch(n >> 16)}, ${ch((n >> 8) & 255)}, ${ch(n & 255)})`;
}

function glossy(ctx, x, y, r, color) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, shade(color, 0.28));
  g.addColorStop(0.7, color);
  g.addColorStop(1, shade(color, -0.12));
  ctx.fillStyle = g;
}

function drawProp(ctx, kind, x, y, s, color, t, phase) {
  ctx.save();
  ctx.translate(x, y);
  switch (kind) {
    case "cloud": {
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      for (const [dx, dy, r] of [[-0.6, 0.1, 0.45], [0, -0.1, 0.6], [0.6, 0.1, 0.45], [0.2, 0.2, 0.45], [-0.25, 0.2, 0.45]]) {
        ctx.beginPath();
        ctx.arc(dx * s, dy * s, r * s, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "bubble": {
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = Math.max(1.5, s * 0.08);
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.beginPath();
      ctx.arc(-s * 0.18, -s * 0.2, s * 0.09, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "flower": {
      ctx.rotate(t * 0.2 + phase);
      glossy(ctx, 0, 0, s * 0.3, color);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * s * 0.3, Math.sin(a) * s * 0.3, s * 0.24, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#ffe066";
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.17, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "butterfly": {
      const flap = 0.55 + 0.45 * Math.abs(Math.sin(t * 3 + phase));
      ctx.fillStyle = color;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(side * s * 0.22 * flap, -s * 0.08, s * 0.24 * flap, s * 0.3, side * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#3b2a4a";
      ctx.fillRect(-s * 0.04, -s * 0.25, s * 0.08, s * 0.45);
      break;
    }
    case "candy": {
      ctx.rotate(Math.sin(t * 0.5 + phase) * 0.4);
      glossy(ctx, 0, 0, s * 0.32, color);
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-s * 0.3, 0); ctx.lineTo(-s * 0.62, -s * 0.2); ctx.lineTo(-s * 0.62, s * 0.2); ctx.closePath();
      ctx.moveTo(s * 0.3, 0); ctx.lineTo(s * 0.62, -s * 0.2); ctx.lineTo(s * 0.62, s * 0.2); ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth = Math.max(1, s * 0.06);
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.18, -2.4, -0.6);
      ctx.stroke();
      break;
    }
    case "heart":
    case "balloon": {
      if (kind === "balloon") {
        ctx.strokeStyle = "rgba(80,60,90,0.45)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, s * 0.45);
        ctx.quadraticCurveTo(s * 0.15, s * 0.8, 0, s * 1.1);
        ctx.stroke();
        glossy(ctx, 0, 0, s * 0.45, color);
        ctx.beginPath();
        ctx.ellipse(0, 0, s * 0.36, s * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        glossy(ctx, 0, 0, s * 0.45, color);
        ctx.beginPath();
        ctx.moveTo(0, s * 0.35);
        ctx.bezierCurveTo(-s * 0.6, -s * 0.05, -s * 0.3, -s * 0.5, 0, -s * 0.18);
        ctx.bezierCurveTo(s * 0.3, -s * 0.5, s * 0.6, -s * 0.05, 0, s * 0.35);
        ctx.fill();
      }
      break;
    }
    case "star":
    case "sparkle":
    case "snow": {
      const spikes = kind === "snow" ? 6 : kind === "star" ? 5 : 4;
      const inner = kind === "sparkle" ? 0.18 : kind === "snow" ? 0.25 : 0.42;
      const tw = kind === "sparkle" ? 0.7 + 0.3 * Math.sin(t * 2.2 + phase) : 1;
      ctx.rotate(kind === "sparkle" ? 0 : t * 0.15 + phase);
      ctx.fillStyle = kind === "snow" ? "rgba(255,255,255,0.95)" : color;
      ctx.beginPath();
      for (let i = 0; i < spikes * 2; i++) {
        const rr = (i % 2 ? inner : 1) * s * 0.5 * tw;
        const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "note": {
      ctx.rotate(Math.sin(t * 0.7 + phase) * 0.2);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(-s * 0.12, s * 0.25, s * 0.2, s * 0.15, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(s * 0.04, -s * 0.4, s * 0.08, s * 0.66);
      ctx.beginPath();
      ctx.moveTo(s * 0.12, -s * 0.4);
      ctx.quadraticCurveTo(s * 0.45, -s * 0.25, s * 0.3, 0);
      ctx.lineTo(s * 0.12, -s * 0.2);
      ctx.fill();
      break;
    }
    case "kite": {
      ctx.rotate(Math.sin(t * 0.8 + phase) * 0.15);
      glossy(ctx, 0, 0, s * 0.5, color);
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.5); ctx.lineTo(s * 0.35, 0); ctx.lineTo(0, s * 0.5); ctx.lineTo(-s * 0.35, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, s * 0.5);
      ctx.quadraticCurveTo(s * 0.2, s * 0.8, -s * 0.05, s * 1.1);
      ctx.stroke();
      break;
    }
    case "bird": {
      const flap = Math.sin(t * 4 + phase) * 0.25;
      ctx.strokeStyle = "#3b2a4a";
      ctx.lineWidth = Math.max(1.5, s * 0.1);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-s * 0.5, -s * flap);
      ctx.quadraticCurveTo(-s * 0.25, -s * 0.3, 0, 0);
      ctx.quadraticCurveTo(s * 0.25, -s * 0.3, s * 0.5, -s * flap);
      ctx.stroke();
      break;
    }
    case "leaf": {
      ctx.rotate(t * 0.4 + phase);
      glossy(ctx, 0, 0, s * 0.4, "#6fd36a");
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.4, s * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "reel": {
      ctx.rotate(t * 0.3 + phase);
      glossy(ctx, 0, 0, s * 0.5, color);
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * s * 0.25, Math.sin(a) * s * 0.25, s * 0.09, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "gift": {
      ctx.rotate(Math.sin(t * 0.6 + phase) * 0.2);
      glossy(ctx, 0, 0, s * 0.45, color);
      ctx.fillRect(-s * 0.32, -s * 0.25, s * 0.64, s * 0.55);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-s * 0.06, -s * 0.25, s * 0.12, s * 0.55);
      ctx.fillRect(-s * 0.32, -s * 0.02, s * 0.64, s * 0.1);
      ctx.beginPath();
      ctx.ellipse(-s * 0.12, -s * 0.32, s * 0.12, s * 0.07, 0.4, 0, Math.PI * 2);
      ctx.ellipse(s * 0.12, -s * 0.32, s * 0.12, s * 0.07, -0.4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

/**
 * Draws the scene filling w × h. t is seconds (0 for a still frame); pulse (0..1) gently lifts and brightens
 * the near layers in time with the notes.
 */
export function drawScene(ctx, scene, w, h, t = 0, pulse = 0) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  scene.sky.forEach((c, i) => sky.addColorStop(i / (scene.sky.length - 1), c));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // A soft sun glow that swells a little with the music.
  const sun = ctx.createRadialGradient(w * 0.82, h * 0.16, 0, w * 0.82, h * 0.16, Math.max(w, h) * (0.32 + pulse * 0.03));
  sun.addColorStop(0, `rgba(255,255,255,${(0.55 + pulse * 0.15).toFixed(3)})`);
  sun.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, h);

  const unit = Math.min(Math.max(w, h), 1100);
  for (const layer of scene.layers) {
    const off = drift(layer.depth, t) * w;
    const lift = pulse * layer.depth * 6;

    const hill = layer.hill;
    ctx.fillStyle = hill.color;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w + 8; x += 8) {
      const u = (x + off * 0.5) / w;
      const y = h * (hill.base + Math.sin(u * Math.PI * 2 * hill.freq + hill.phase) * hill.amp) - lift * 0.5;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    for (const it of layer.items) {
      const x = ((((it.x * w - off) % w) + w) % w);
      const bob = t ? Math.sin(t * (0.5 + layer.depth * 0.4) + it.phase) * (3 + layer.depth * 4) : 0;
      const y = it.y * h + bob - lift * Math.abs(Math.sin(it.phase));
      const s = it.size * unit * (1 + pulse * 0.05 * layer.depth);
      drawProp(ctx, it.kind, x, y, s, it.color, t, it.phase);
      if (x > w - s) drawProp(ctx, it.kind, x - w, y, s, it.color, t, it.phase);
    }
  }
}
