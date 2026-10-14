// Pixel-art scenes drawn on small canvases and scaled up with crisp pixels.

const SKY = ["#1b1d3f", "#21244a", "#282b57", "#323466", "#433f78", "#5b4a86", "#7c5689", "#a8687f"];
const LANTERN = [
  "...k...",
  "..kkk..",
  ".kfffk.",
  ".kfgfk.",
  ".kfgfk.",
  ".kfffk.",
  "..kkk..",
];

function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

/** Candle flicker in 0..1 for a lantern at time t (seconds); a few slow waves so it never looks mechanical. */
export const flicker = (t, i) => 0.5 + 0.25 * Math.sin(t * 3.1 + i * 1.7) + 0.15 * Math.sin(t * 7.3 + i * 2.9) + 0.1 * Math.sin(t * 13 + i);

export function drawLantern(ctx, x, y, lit, scale = 1, post = 0, glow = 0.5, flare = 0) {
  const colors = lit
    ? { k: "#1a1626", f: glow > 0.6 ? "#ffd56a" : "#ffc94e", g: glow > 0.45 ? "#fff6cf" : "#ffe7a0" }
    : { k: "#1a1626", f: "#4b4b6e", g: "#5f5f86" };
  if (lit) {
    ctx.fillStyle = `rgba(255, 196, 90, ${(0.12 + glow * 0.1 + flare * 0.25).toFixed(3)})`;
    const reach = 6 + glow * 1.5 + flare * 5;
    for (let r = reach; r >= 3; r -= 1.5) {
      ctx.fillRect(Math.round(x + (3.5 - r) * scale), Math.round(y + (3.5 - r) * scale), Math.round(r * 2 * scale), Math.round(r * 2 * scale));
    }
  }
  LANTERN.forEach((row, ry) => {
    [...row].forEach((ch, rx) => {
      if (ch !== ".") px(ctx, x + rx * scale, y + ry * scale, scale, scale, colors[ch]);
    });
  });
  if (post > 0) px(ctx, x + 3 * scale, y + 7 * scale, scale, post * scale, "#1a1626");
}

function sky(ctx, w, h, bands) {
  const bh = Math.ceil(h / bands.length);
  bands.forEach((c, i) => px(ctx, 0, i * bh, w, bh, c));
}

function stars(ctx, w, h, count, seed, t = 0) {
  const r = seeded(seed);
  for (let i = 0; i < count; i++) {
    const x = Math.floor(r() * w);
    const y = Math.floor(r() * h);
    const bright = r() > 0.7;
    const phase = r() * 6.28;
    const twinkle = Math.sin(t * (0.8 + (i % 5) * 0.35) + phase);
    if (twinkle < -0.75) continue;
    px(ctx, x, y, 1, 1, bright || twinkle > 0.85 ? "#fff6cf" : "#b9b6e6");
  }
}

// Fireflies drift along gentle waves and blink softly.
function fireflies(ctx, w, h, count, seed, t, top = 0) {
  if (!t) return;
  const r = seeded(seed);
  for (let i = 0; i < count; i++) {
    const speed = 2 + r() * 4;
    const dir = r() > 0.5 ? 1 : -1;
    const x0 = r() * w;
    const y0 = top + r() * (h - top);
    const phase = r() * 6.28;
    const x = (((x0 + dir * speed * t) % w) + w) % w;
    const y = y0 + Math.sin(t * 0.9 + phase) * 2.5;
    const blink = Math.sin(t * 1.7 + phase);
    if (blink < -0.2) continue;
    px(ctx, x, y, 1, 1, blink > 0.5 ? "#fff3a8" : "#d9c26a");
  }
}

export function drawHome(canvas, boards, t = 0) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  sky(ctx, W, 52, SKY);
  stars(ctx, W, 30, 40, 7, t);
  px(ctx, 128, 8, 8, 8, "#fff1c4");
  px(ctx, 127, 9, 1, 6, "#fff1c4");
  px(ctx, 136, 9, 1, 6, "#fff1c4");
  px(ctx, 130, 9, 3, 3, "#efe0a8");

  for (let x = 0; x < W; x++) {
    const far = 40 + Math.round(Math.sin(x / 17) * 4 + Math.sin(x / 7) * 1.5);
    px(ctx, x, far, 1, H - far, "#34325f");
  }
  for (let x = 0; x < W; x++) {
    const near = 50 + Math.round(Math.sin(x / 23 + 1) * 3);
    px(ctx, x, near, 1, H - near, "#25254c");
  }
  const roadY = (x) => 60 + Math.round(Math.sin(x / 20) * 2);
  for (let x = 0; x < W; x++) {
    px(ctx, x, roadY(x), 1, 4, "#a77d52");
    px(ctx, x, roadY(x), 1, 1, "#d6ab72");
  }

  // Fireflies first, so they drift behind the lanterns.
  fireflies(ctx, W, 58, 6, 11, t, 34);
  const count = 8;
  const lit = boards <= 0 ? 0 : ((boards - 1) % count) + 1;
  for (let i = 0; i < count; i++) {
    const x = 8 + i * 19;
    const base = roadY(x + 3);
    drawLantern(ctx, x, base - 16, i < lit, 1, 9, t ? flicker(t, i) : 0.5);
  }
}

/** `flare` is { index, age } for a lantern that just lit up; age in seconds. */
export function drawStrip(canvas, total, found, t = 0, flare = null) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  sky(ctx, W, H, ["#262a52", "#2b2e5c", "#323466", "#3a3c72"]);
  stars(ctx, W, 10, 14 + Math.floor(W / 20), total * 31 + 3, t);
  px(ctx, 0, H - 2, W, 2, "#a77d52");
  fireflies(ctx, W, H - 3, 3 + Math.floor(W / 60), total * 7 + 1, t);
  const n = Math.max(total, 1);
  const gap = W / n;
  for (let i = 0; i < total; i++) {
    const x = Math.round(gap * i + gap / 2 - 3.5);
    const burst = flare && flare.index === i && flare.age < 1.2 ? 1 - flare.age / 1.2 : 0;
    drawLantern(ctx, x, 3, i < found, 1, H - 12, t ? flicker(t, i) : 0.5, burst);
  }
}

export function drawComplete(canvas) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  stars(ctx, W, H, 10, 99);
  drawLantern(ctx, 13, 6, true, 3);
}
