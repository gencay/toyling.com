import { PHASE, SHOT_TYPES, ballStyle, offerLabel, coinEffect, ballInfo, richParts, plainText, rotateAim, pullPower, inDeadzone, DEADZONE, readBest, writeBest, DIGITS, textWidth, createShotInput, ringColor, identity, roll, ballPixels, sinkPose, returnPath, pathLength, pointAlong, traySlot, carpetStreaks } from "./logic.js";
import * as sfx from "./audio.js";
import { applyPockets, MUSIC, cueById, START_CUE, CARPETS, CARPET } from "./config.js";
import { createMelody, midiToHz } from "./music.js";
import { iconImg, coinImg, SHOT_ICONS, OFFER_ICONS } from "./icons.js";

const $ = (id) => document.getElementById(id);
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

const { instance } = await WebAssembly.instantiate(await (await fetch("game.wasm")).arrayBuffer(), {});
const core = instance.exports;
applyPockets(core);

// ------------------------------------------------------------ geometry
// Arcade proportions from the core: a 2:1 bed W x H units with big balls, cushions C deep, then a wooden rail.
// Below the foot rail sits an apron with the ball-return tray window, like the front of a coin-op table.
const TW = core.tableW();
const TH = core.tableH();
const BR = core.ballR();
const C = core.cushionDepth();
const MARGIN = 12; // units from cushion nose to the outside of the rail (cushion 4 + rail 8)
const APRON = 14; // units of apron below the foot rail holding the ball-return tray
const ART = 2.5; // art pixels per table unit: everything is drawn as chunky pixel art at this resolution
const AW = Math.round((TW + 2 * MARGIN) * ART);
const AH = Math.round((TH + 2 * MARGIN + APRON) * ART);
const SEGS = Array.from({ length: core.segCount() }, (_, i) => [0, 1, 2, 3].map((k) => core.seg(i, k)));
const POCKETS = Array.from({ length: 6 }, (_, p) => {
  const x = core.pocketX(p);
  const y = core.pocketY(p);
  return { x, y, mid: p === 2 || p === 3, vx: x, vy: y, hole: core.pocketHole(p) };
});
const GULLY = C + (MARGIN - C) / 2; // potted balls return along this line, hidden under the rails
const TRAY = { top: TH + MARGIN + 2.5, bottom: TH + MARGIN + APRON - 2, left: 6, right: TW - 6 };
const TRAY_Y = (TRAY.top + TRAY.bottom) / 2;
const TRAY_GAP = 2 * BR + 0.3;
const RETURN = { W: TW, H: TH, rail: GULLY, trayY: TRAY_Y };
const BALL_PX = Math.round(2 * BR * ART); // ball sprites share the art's pixel size

// The visible canvas runs at device resolution and every layer is scaled up by P with nearest-neighbour sampling,
// so pixels stay crisp. Balls are pixel sprites placed at device resolution, so they still glide smoothly.
const canvas = $("table");
const ctx = canvas.getContext("2d");
let P = 1;
const dx = (x) => (x + MARGIN) * ART * P; // table units -> device pixels
const dy = (y) => (y + MARGIN) * ART * P;
const U = () => ART * P; // device pixels per table unit

const shot = createShotInput();
let popups = [];
let sinkers = [];
let returning = [];
let tray = [];
let prevOn = [];
let orient = [];
let lastPos = [];
let clock = 0;
let sound = localStorage.getItem("rack-and-ruin.sound") !== "off";
sfx.setSound(sound);
const pan = (x) => (x / TW) * 2 - 1;

// ------------------------------------------------------------ table art (drawn once at art resolution)
const art = document.createElement("canvas");
art.width = AW;
art.height = AH;
const a = art.getContext("2d");
const ax = (x) => (x + MARGIN) * ART;
const ay = (y) => (y + MARGIN) * ART;
let artKey = "";

function rectU(x0, y0, x1, y1, color) {
  a.fillStyle = color;
  a.fillRect(Math.round(ax(x0)), Math.round(ay(y0)), Math.round((x1 - x0) * ART), Math.round((y1 - y0) * ART));
}

function circleU(x, y, r, fill) {
  a.fillStyle = fill;
  a.beginPath();
  a.arc(ax(x), ay(y), r * ART, 0, Math.PI * 2);
  a.fill();
}

function drawWood(x0, y0, w, h, base, grain, radius) {
  a.save();
  a.beginPath();
  a.roundRect(x0, y0, w, h, radius);
  a.clip();
  a.fillStyle = base;
  a.fillRect(x0, y0, w, h);
  // long grain streaks with gentle waves
  for (let y = y0; y < y0 + h; y += 3) {
    a.fillStyle = grain;
    a.globalAlpha = 0.25 + 0.25 * Math.abs(Math.sin(y * 0.37));
    for (let x = x0; x < x0 + w; x += 9) a.fillRect(x, y + Math.round(Math.sin((x + y * 3) * 0.05) * 1.2), 7, 1);
  }
  a.globalAlpha = 1;
  a.restore();
}

function drawTableArt() {
  a.clearRect(0, 0, AW, AH);
  const rr = 6 * ART;
  // cabinet apron (behind), then the rail frame with rounded corners
  drawWood(2 * ART, AH - (APRON + 4) * ART, AW - 4 * ART, (APRON + 4) * ART, "#4a2a15", "#3a200f", 4 * ART);
  a.fillStyle = "#2a170b";
  a.beginPath();
  a.roundRect(0, 0, AW, Math.round((TH + 2 * MARGIN) * ART), rr);
  a.fill();
  drawWood(3, 3, AW - 6, Math.round((TH + 2 * MARGIN) * ART) - 6, "#6b3f22", "#5a3318", rr - 3);
  // a lit bevel on the rail's inner and top edges
  a.strokeStyle = "rgba(255,220,170,0.18)";
  a.lineWidth = 1;
  a.beginPath();
  a.roundRect(5, 5, AW - 10, Math.round((TH + 2 * MARGIN) * ART) - 10, rr - 5);
  a.stroke();
  // diamonds (sights) inlaid in the rails
  const sight = (x, y) => {
    const sx = Math.round(ax(x)), sy = Math.round(ay(y));
    a.fillStyle = "#f1e6cc";
    a.fillRect(sx - 1, sy, 3, 1);
    a.fillRect(sx, sy - 1, 1, 3);
  };
  // sights sit in the rails
  for (const f of [0.25, 0.5, 0.75]) {
    sight(TW * f, -C - 1.4);
    sight(TW * f, TH + C + 1.3);
  }
  for (const f of [1 / 8, 2 / 8, 3 / 8, 5 / 8, 6 / 8, 7 / 8]) {
    sight(-C - 1.3, TH * f);
    sight(TW + C + 1.3, TH * f);
  }
  // tray window in the apron
  const tx = ax(TRAY.left), ty = ay(TRAY.top), tw = (TRAY.right - TRAY.left) * ART, th = (TRAY.bottom - TRAY.top) * ART;
  a.fillStyle = "#120a05";
  a.beginPath();
  a.roundRect(tx - 2, ty - 2, tw + 4, th + 4, 5);
  a.fill();
  const tg = a.createLinearGradient(0, ty, 0, ty + th);
  tg.addColorStop(0, "#050302");
  tg.addColorStop(1, "#24160c");
  a.fillStyle = tg;
  a.beginPath();
  a.roundRect(tx, ty, tw, th, 4);
  a.fill();
  a.strokeStyle = "#a07a3a";
  a.lineWidth = 1;
  a.beginPath();
  a.roundRect(tx - 1.5, ty - 1.5, tw + 3, th + 3, 5);
  a.stroke();

  // felt under the cushions, then the bed with a fine nap
  rectU(-C, -C, TW + C, TH + C, "#145a40");
  rectU(0, 0, TW, TH, "#1f7a5a");
  a.fillStyle = "#238460";
  for (let y = Math.round(ay(0)); y < ay(TH); y += 2) for (let x = Math.round(ax(0)) + (y % 4 === 0 ? 0 : 2); x < ax(TW); x += 4) a.fillRect(x, y, 1, 1);
  // a soft pool of lamp light in the middle of the bed
  const lamp = a.createRadialGradient(ax(TW / 2), ay(TH / 2), 0, ax(TW / 2), ay(TH / 2), TH * 0.6 * ART);
  lamp.addColorStop(0, "rgba(255,255,220,0.07)");
  lamp.addColorStop(1, "rgba(0,0,0,0.12)");
  a.fillStyle = lamp;
  a.fillRect(ax(0), ay(0), TW * ART, TH * ART);
  // markings: head string, the D and the spots
  const by = core.baulkY();
  a.fillStyle = "rgba(255,255,255,0.16)";
  a.fillRect(ax(0), Math.round(ay(by)), TW * ART, 1);
  const dr = core.dRadius() * ART;
  for (let t = 0; t <= Math.PI; t += 0.01) a.fillRect(Math.round(ax(TW / 2) + Math.cos(t) * dr), Math.round(ay(by) + Math.sin(t) * dr), 1, 1);
  for (const [sx, sy] of [[TW / 2, TH / 2], [TW / 2, TH / 4]]) circleU(sx, sy, 0.45, "rgba(255,255,255,0.22)");
  // pocket caps go under the cushions, so the jaws sit cleanly on top of the leather
  POCKETS.forEach(drawPocketCap);
  // cushions end in jaws cut toward each pocket: along the diagonal at the corners, slightly narrowing at the middles
  // each cushion runs between two jaws: nose start, nose end, then back along the jaw faces to the rail
  const jaw = (i) => [[SEGS[i][0], SEGS[i][1]], [SEGS[i][2], SEGS[i][3]]];
  const strip = (j0, j1) => [jaw(j0)[0], jaw(j1)[0], jaw(j1)[1], jaw(j0)[1]];
  const cushions = [strip(6, 8), strip(10, 12), strip(7, 14), strip(15, 11), strip(9, 16), strip(17, 13)];
  for (const q of cushions) poly(q, "#18704f");
  // lit cushion noses and jaw faces, one art pixel wide
  a.fillStyle = "#4fc293";
  for (const [x1, y1, x2, y2] of SEGS) {
    const n = Math.ceil(Math.hypot(x2 - x1, y2 - y1) * ART);
    for (let k = 0; k <= n; k++) a.fillRect(Math.floor(ax(x1 + ((x2 - x1) * k) / n)), Math.floor(ay(y1 + ((y2 - y1) * k) / n)), 1, 1);
  }
  POCKETS.forEach(drawPocketArt);
  POCKETS.forEach(drawPocketLabel);
}

function poly(pts, color) {
  a.fillStyle = color;
  a.beginPath();
  pts.forEach(([x, y], i) => (i ? a.lineTo(ax(x), ay(y)) : a.moveTo(ax(x), ay(y))));
  a.closePath();
  a.fill();
}

function pocketDir(p) {
  const ox = p.x < TW / 2 ? -1 : 1;
  const oy = p.mid ? 0 : p.y < TH / 2 ? -1 : 1;
  const ol = Math.hypot(ox, oy);
  return [ox / ol, oy / ol];
}

// A real pocket seen from above: a stitched leather cap wrapping the rail (drawn under the cushions), then a
// glossy rubber liner lip, the felt rolling over the slate edge on the table side, and a deep hole.
function drawPocketCap(p) {
  const cx = ax(p.x), cy = ay(p.y), r = p.hole * ART;
  const [ux, uy] = pocketDir(p);
  // leather cap on the rail: only outside the bed
  a.save();
  a.beginPath();
  a.rect(0, 0, AW, AH);
  a.rect(ax(0), ay(0), TW * ART, TH * ART);
  a.clip("evenodd");
  const cap = a.createRadialGradient(cx - ux * r * 0.3, cy - uy * r * 0.3, r * 0.6, cx, cy, r + 2.6 * ART);
  cap.addColorStop(0, "#3d2617");
  cap.addColorStop(0.8, "#2a180d");
  cap.addColorStop(1, "#1a0e07");
  a.fillStyle = cap;
  a.beginPath();
  a.arc(cx + ux * 0.5 * ART, cy + uy * 0.5 * ART, r + 2 * ART, 0, Math.PI * 2);
  a.fill();
  // stitching around the cap's edge
  a.fillStyle = "rgba(230,200,150,0.5)";
  for (let t = 0; t < Math.PI * 2; t += 0.22) {
    const sx = cx + ux * 0.5 * ART + Math.cos(t) * (r + 1.4 * ART);
    const sy = cy + uy * 0.5 * ART + Math.sin(t) * (r + 1.4 * ART);
    a.fillRect(Math.floor(sx), Math.floor(sy), 1, 1);
  }
  a.restore();
}

function drawPocketArt(p) {
  const cx = ax(p.x), cy = ay(p.y), r = p.hole * ART;
  const [ux, uy] = pocketDir(p);
  // rubber liner lip
  a.fillStyle = "#0c0b0d";
  a.beginPath();
  a.arc(cx, cy, r + 0.55 * ART, 0, Math.PI * 2);
  a.fill();
  // the hole: deeper (darker) toward the back, away from the bed
  const hole = a.createRadialGradient(cx + ux * r * 0.35, cy + uy * r * 0.35, r * 0.1, cx - ux * r * 0.2, cy - uy * r * 0.2, r);
  hole.addColorStop(0, "#000000");
  hole.addColorStop(0.7, "#060607");
  hole.addColorStop(1, "#141317");
  a.fillStyle = hole;
  a.beginPath();
  a.arc(cx, cy, r, 0, Math.PI * 2);
  a.fill();
  // felt rolling over the slate edge on the bed side of the hole
  a.save();
  a.beginPath();
  a.arc(cx, cy, r, 0, Math.PI * 2);
  a.clip();
  const lip = a.createLinearGradient(cx - ux * r, cy - uy * r, cx - ux * r * 0.35, cy - uy * r * 0.35);
  lip.addColorStop(0, "rgba(31,122,90,0.95)");
  lip.addColorStop(0.45, "rgba(18,80,58,0.6)");
  lip.addColorStop(1, "rgba(0,0,0,0)");
  a.fillStyle = lip;
  a.beginPath();
  a.arc(cx - ux * r * 1.55, cy - uy * r * 1.55, r * 1.25, 0, Math.PI * 2);
  a.fill();
  a.restore();
  // a highlight where lamp light catches the liner's far rim
  a.strokeStyle = "rgba(255,255,255,0.25)";
  a.lineWidth = 1;
  a.beginPath();
  const back = Math.atan2(uy, ux);
  a.arc(cx, cy, r + 0.2 * ART, back - 0.9, back + 0.9);
  a.stroke();
}

function ensureArt() {
  const key = POCKETS.map((_, i) => core.pocketMult(i)).join(",");
  if (key !== artKey) {
    artKey = key;
    drawTableArt();
  }
}

// ------------------------------------------------------------ pixel layers
// Two transparent layers at art resolution: "under" holds shadows (below the balls), "over" holds the aim aids,
// power ring, cue and score pop-ups (above the balls). Both are drawn pixel by pixel and scaled up crisply.
function layer() {
  const c = document.createElement("canvas");
  c.width = AW;
  c.height = AH;
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = false;
  return [c, g];
}
const [underC, under] = layer();
const [overC, over] = layer();

function pset(g, x, y, color) {
  g.fillStyle = color;
  g.fillRect(Math.floor(x), Math.floor(y), 1, 1);
}

function pdisc(g, cx, cy, r, color) {
  g.fillStyle = color;
  const x0 = Math.floor(cx - r), x1 = Math.ceil(cx + r), y0 = Math.floor(cy - r), y1 = Math.ceil(cy + r);
  for (let y = y0; y <= y1; y++) {
    const dy0 = y + 0.5 - cy;
    const w = r * r - dy0 * dy0;
    if (w < 0) continue;
    const h = Math.sqrt(w);
    const a0 = Math.round(cx - h), a1 = Math.round(cx + h);
    if (a1 > a0) g.fillRect(a0, y, a1 - a0, 1);
  }
}

// A pixel ring between radii r0..r1, optionally limited to an angle range (clockwise from the top).
function pring(g, cx, cy, r0, r1, color, from = 0, to = Math.PI * 2) {
  g.fillStyle = color;
  const R1 = Math.ceil(r1) + 1;
  for (let y = Math.floor(cy - R1); y <= Math.ceil(cy + R1); y++) {
    for (let x = Math.floor(cx - R1); x <= Math.ceil(cx + R1); x++) {
      const ddx = x + 0.5 - cx, ddy = y + 0.5 - cy;
      const d = Math.hypot(ddx, ddy);
      if (d < r0 || d > r1) continue;
      let ang = Math.atan2(ddy, ddx) + Math.PI / 2;
      if (ang < 0) ang += Math.PI * 2;
      if (ang >= from && ang < to) g.fillRect(x, y, 1, 1);
    }
  }
}

function pline(g, x0, y0, x1, y1, color, w = 1) {
  const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)));
  g.fillStyle = color;
  for (let k = 0; k <= n; k++) {
    const x = x0 + ((x1 - x0) * k) / Math.max(1, n);
    const y = y0 + ((y1 - y0) * k) / Math.max(1, n);
    g.fillRect(Math.floor(x - (w - 1) / 2), Math.floor(y - (w - 1) / 2), w, w);
  }
}

function ptext(g, s, cx, cy, color, k) {
  const w = textWidth(s) * k;
  let x = Math.round(cx - w / 2);
  const y = Math.round(cy - 2.5 * k);
  for (const [o, c] of [[1, "#000"], [0, color]]) {
    g.fillStyle = c;
    let xx = x + o;
    for (const ch of s) {
      DIGITS[ch]?.forEach((row, ry) => [...row].forEach((bit, rx) => bit === "1" && g.fillRect(xx + rx * k, y + o + ry * k, k, k)));
      xx += 4 * k;
    }
  }
}

// ------------------------------------------------------------ balls
// Each ball drawn in a frame gets its own sprite canvas. Safari defers drawImage from a canvas until the frame is
// flushed, so reusing one sprite canvas made every ball show the last sprite drawn (the white cue ball).
const spritePool = [];
let spriteNext = 0;
function nextSprite() {
  if (spriteNext === spritePool.length) {
    const c = document.createElement("canvas");
    c.width = c.height = BALL_PX;
    const g = c.getContext("2d");
    spritePool.push({ c, g, img: g.createImageData(BALL_PX, BALL_PX) });
  }
  return spritePool[spriteNext++];
}

// Balls are pixel sprites drawn at device resolution, so they move smoothly while keeping chunky pixels.
function drawBallAt(n, m, x, y, scale = 1, dim = 0) {
  const { c: sprite, g: sctx, img: simg } = nextSprite();
  simg.data.set(ballPixels(n, m, BALL_PX, dim));
  sctx.putImageData(simg, 0, 0);
  const size = Math.round(BALL_PX * P * scale);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sprite, Math.round(dx(x) - size / 2), Math.round(dy(y) - size / 2), size, size);
}

function ballShadow(x, y) {
  pdisc(under, ax(x + BR * 0.3), ay(y + BR * 0.4), BR * ART * 0.98, "rgba(0,0,0,0.32)");
}

// Keep each ball's orientation rolling with its motion.
function trackBalls() {
  for (let i = 0; i < core.ballCount(); i++) {
    if (!core.ballOn(i)) continue;
    const x = core.ballX(i);
    const y = core.ballY(i);
    const lp = lastPos[i];
    if (!orient[i] || !lp || Math.hypot(x - lp[0], y - lp[1]) > 6) orient[i] = identity();
    else orient[i] = roll(orient[i], x - lp[0], y - lp[1], BR);
    const vx = lp ? x - lp[0] : 0;
    const vy = lp ? y - lp[1] : 0;
    lastPos[i] = [x, y, vx, vy];
  }
}

// ------------------------------------------------------------ ball return
const RETURN_TIME = 0.6; // seconds from the drop until the ball pops into the tray
const ROLL_SOUND_TIME = 0.45; // a short rolling sound, not a continuous rumble
// A potted ball drops through the pocket and rolls, unseen and heard, under the rails to the middle of the foot
// rail, then down into the tray window, where balls settle from the centre outward and click against each other.
function startReturn(s) {
  const pk = POCKETS[s.pocket];
  const path = returnPath(pk, RETURN);
  const len = pathLength(path);
  const speed = len / RETURN_TIME; // every return takes the same short time, whichever pocket
  returning.push({ n: s.n, m: s.m, path, len, d: 0, speed, last: path[0] });
  sfx.gullyRoll(ROLL_SOUND_TIME, pan(pk.x), 0);
}

function drawReturning(dt) {
  returning = returning.filter((b) => {
    b.d += b.speed * dt;
    const [x, y] = pointAlong(b.path, b.d);
    b.m = roll(b.m, x - b.last[0], y - b.last[1], BR);
    b.last = [x, y];
    if (b.d >= b.len) {
      landInTray(b);
      return false;
    }
    return true; // rolling unseen under the table; only its sound gives it away
  });
}

// The ball pops out of the chute into the tray with a puff, then rolls to its slot with its number facing up.
function landInTray(b) {
  const k = tray.length;
  tray.push({ n: b.n, x: TW / 2, target: traySlot(k, TW, TRAY_GAP), settled: false, hits: k > 0, t: 0 });
  burst(TW / 2, TRAY.top + 0.5, 10, ["#f4efe2", "#c9a227", "#8a6a3a"], 18, 0.45);
  sfx.trayLand(false, 0);
}

function drawTray(dt) {
  for (const t of tray) {
    t.t += dt;
    if (!t.settled) {
      const step = Math.sign(t.target - t.x) * Math.min(Math.abs(t.target - t.x), 70 * dt);
      t.x += step;
      if (Math.abs(step) > 0.05 && Math.random() < 0.3) burst(t.x - Math.sign(step) * BR, TRAY_Y + BR * 0.8, 1, ["#8a6a3a"], 6, 0.3);
      if (Math.abs(t.target - t.x) < 0.01) {
        t.settled = true;
        if (t.hits) {
          sfx.clack(0.4, pan(t.x), 0.95);
          burst(t.x - Math.sign(t.target - TW / 2 || 1) * BR, TRAY_Y, 5, ["#ffffff", "#f5c542"], 12, 0.3);
        }
      }
    }
    if (t.fade !== undefined) t.fade = Math.min(1, t.fade + dt * 2.5);
    ctx.globalAlpha = 1 - (t.fade ?? 0);
    const pop = reduceMotion.matches ? 1 : Math.min(1, 0.6 + t.t * 4); // pops out of the chute
    drawBallAt(t.n, TRAY_UP, t.x, TRAY_Y - (1 - pop) * 3, pop, 0.08);
    // a big, readable number on top of each ball in the tray
    if (pop >= 1 && (t.fade ?? 0) < 0.5) {
      pdisc(over, ax(t.x), ay(TRAY_Y), BR * ART * 0.62, "#f6f0e2");
      ptext(over, String(t.n), ax(t.x), ay(TRAY_Y), "#1a1622", 2);
    }
    ctx.globalAlpha = 1;
  }
  tray = tray.filter((t) => (t.fade ?? 0) < 1);
}

const TRAY_UP = identity(); // tray balls sit with their numbers facing up

function clearTray() {
  for (const t of tray) t.fade = 0;
}

// ------------------------------------------------------------ aim aids, power ring and cue (pixel art, "over" layer)
function drawAim() {
  if (core.getPhase() !== PHASE.AIM) return;
  const { angle, power, locked } = shot.state;
  const obj = core.aim(angle);
  const cx = core.ballX(0), cy = core.ballY(0);
  const hx = core.aimHitX(), hy = core.aimHitY();
  const ux = Math.cos(angle), uy = Math.sin(angle);
  const len = Math.hypot(hx - cx, hy - cy);
  const accent = locked ? ringColor(Math.max(power, 0.01)) : "#f4efe2";
  // tracer: chunky 2×2 dots with a drop shadow, marching toward the target
  const gap = 2.4;
  const march = reduceMotion.matches ? 0 : (clock * 6) % gap;
  for (let d = BR + 1.4 + march; d < len - BR * 0.3; d += gap) {
    const x = ax(cx + ux * d), y = ay(cy + uy * d);
    over.fillStyle = "rgba(0,0,0,0.55)";
    over.fillRect(Math.floor(x), Math.floor(y), 2, 2);
    over.fillStyle = accent;
    over.fillRect(Math.floor(x) - 1, Math.floor(y) - 1, 2, 2);
  }
  // ghost ball: a pixel outline where the cue ball makes contact
  const gr = BR * ART;
  pring(over, ax(hx) + 1, ay(hy) + 1, gr - 0.6, gr + 0.6, "rgba(0,0,0,0.5)");
  pring(over, ax(hx), ay(hy), gr - 0.6, gr + 0.6, accent);
  if (obj >= 0) {
    // object ball direction: a short hint, two ball-lengths long, fading out toward its end (no arrow head),
    // and the cue ball's tangent dots (longer on thin cuts)
    const ox = core.ballX(obj), oy = core.ballY(obj);
    const nx = core.aimObjX(), ny = core.aimObjY();
    const full = Math.max(0, ux * nx + uy * ny);
    // dotted and marching like the cue ball's tracer, fading out over two ball lengths
    const L0 = BR + 0.8, L1 = L0 + GUIDE_BALLS * 2 * BR;
    const hex = ballStyle(core.ballNum(obj)).color; // the colour of the ball the cue ball will touch
    const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(",");
    for (let d = L0 + march * (1.6 / gap); d < L1; d += 1.6) {
      const fade = 1 - (d - L0) / (L1 - L0);
      const x = Math.floor(ax(ox + nx * d)), y = Math.floor(ay(oy + ny * d));
      over.fillStyle = `rgba(0,0,0,${0.55 * fade})`;
      over.fillRect(x, y, 2, 2);
      over.fillStyle = `rgba(${rgb},${fade})`;
      over.fillRect(x - 1, y - 1, 2, 2);
    }
    let tx = ux - full * nx, ty = uy - full * ny;
    const tl = Math.hypot(tx, ty);
    if (tl > 0.05) {
      tx /= tl;
      ty /= tl;
      for (let d = BR + 1; d < BR + 3 + (1 - full) * 14; d += 1.6) pset(over, ax(hx + tx * d), ay(hy + ty * d), "rgba(244,239,226,0.85)");
    }
  }
  drawPowerRing(cx, cy, power, locked);
  drawCue(cx, cy, ux, uy, power, locked);
}

// The power ring: a thick, segmented pixel gauge hugging the cue ball. Segments light clockwise from the top in
// mint → gold → red; at full power the lit ring flashes.
function drawPowerRing(cx, cy, power, locked) {
  if (!locked) return;
  const x = ax(cx), y = ay(cy);
  const r0 = (BR + 1.1) * ART, r1 = r0 + 3;
  pring(over, x, y, r0 - 1, r1 + 1, "rgba(0,0,0,0.6)");
  const N = 16;
  const seg = (Math.PI * 2) / N;
  const gapA = 0.1;
  const full = power >= 1; // at top speed the whole ring turns white (no flashing)
  for (let k = 0; k < N; k++) {
    const lit = Math.max(0, Math.min(1, power * N - k));
    pring(over, x, y, r0, r1, "rgba(255,255,255,0.12)", k * seg + gapA / 2, (k + 1) * seg - gapA / 2);
    if (lit > 0) pring(over, x, y, r0, r1, full ? "#ffffff" : ringColor((k + 1) / N), k * seg + gapA / 2, k * seg + gapA / 2 + (seg - gapA) * lit);
  }
}

// A pool cue drawn as pixel art. Proportions follow a real cue against a real ball: the tip is about a quarter of
// a ball wide and the butt about half; the shaft keeps a long parallel "pro taper" before swelling into the butt.
// Parts (fractions of the length from the tip): tip, ferrule, maple shaft, joint, ebony forearm with inlaid points,
// rings, linen wrap, sleeve and bumper. Shaded in three flat bands with a dark one-pixel outline.
const CUE_LEN = 120;
const GUIDE_BALLS = 2; // length of the object ball's direction hint, in ball lengths
const CUE_PARTS = [
  { to: 0.007, color: [63, 111, 208] }, // chalked tip
  { to: 0.024, color: [239, 233, 218] }, // ferrule
  { to: 0.5, color: [227, 196, 138] }, // maple shaft
  { to: 0.51, color: [201, 162, 39] }, // joint collar
  { to: 0.518, color: [21, 20, 26] },
  { to: 0.7, color: [72, 36, 18], points: [239, 226, 196] }, // ebony forearm
  { to: 0.706, color: [201, 162, 39] },
  { to: 0.712, color: [21, 20, 26] },
  { to: 0.9, color: [34, 33, 42], wrap: [62, 61, 76] }, // linen wrap
  { to: 0.906, color: [201, 162, 39] },
  { to: 0.99, color: [72, 36, 18] }, // butt sleeve
  { to: 1, color: [11, 11, 14] }, // bumper
];

function cueRadius(d) {
  const f = d / CUE_LEN;
  const tip = BR * 0.24;
  if (f < 0.25) return tip;
  if (f < 0.5) return tip + (BR * 0.34 - tip) * ((f - 0.25) / 0.25);
  return BR * 0.34 + (BR * 0.5 - BR * 0.34) * ((f - 0.5) / 0.5);
}

function cuePart(s) {
  const f = s / CUE_LEN;
  let from = 0;
  for (const p of CUE_PARTS) {
    if (f <= p.to) return [p, from * CUE_LEN, p.to * CUE_LEN];
    from = p.to;
  }
  return [CUE_PARTS[CUE_PARTS.length - 1], from * CUE_LEN, CUE_LEN];
}

function drawCue(cx, cy, ux, uy, power, locked) {
  const back = BR + 0.8 + power * 9 + (locked && power === 0 ? 0.4 : 0);
  const bx = -ux, by = -uy; // from the tip back toward the butt
  const sx = cx + bx * back, sy = cy + by * back; // tip position in table units
  const ex = sx + bx * CUE_LEN, ey = sy + by * CUE_LEN;
  const pad = BR;
  const x0 = Math.max(0, Math.floor(ax(Math.min(sx, ex) - pad))), x1 = Math.min(AW - 1, Math.ceil(ax(Math.max(sx, ex) + pad)));
  const y0 = Math.max(0, Math.floor(ay(Math.min(sy, ey) - pad))), y1 = Math.min(AH - 1, Math.ceil(ay(Math.max(sy, ey) + pad)));
  const px1 = 1 / ART; // one art pixel in table units
  const sample = (X, Y) => {
    const rx = X - sx, ry = Y - sy;
    const s = rx * bx + ry * by;
    if (s < 0 || s > CUE_LEN) return null;
    const t = -rx * by + ry * bx;
    const rad = cueRadius(s);
    return Math.abs(t) <= rad ? [s, t, rad] : null;
  };
  for (let j = y0; j <= y1; j++) {
    for (let i = x0; i <= x1; i++) {
      const X = (i + 0.5) / ART - MARGIN, Y = (j + 0.5) / ART - MARGIN;
      // shadow on the felt, cast down-right
      if (sample(X - 1.0, Y - 1.6)) {
        under.fillStyle = "rgba(0,0,0,0.3)";
        under.fillRect(i, j, 1, 1);
      }
      const hit = sample(X, Y);
      if (!hit) continue;
      const [s, t, rad] = hit;
      const [part, from, to] = cuePart(s);
      let c = part.color;
      if (part.wrap && Math.floor(s / 0.8) % 2 === 0) c = part.wrap;
      if (part.points) {
        const fr = (s - from) / (to - from);
        if (Math.abs(t) < rad * 0.92 * fr && Math.abs(t) > rad * 0.2 * fr) c = part.points;
      }
      // flat cylinder shading in bands, lit from the top-left of the screen
      const side = t / rad;
      const litSide = -(by * -0.6 + bx * 0.8) >= 0 ? -1 : 1; // which half faces the light
      let k = side * litSide > 0.35 ? 1.25 : side * litSide < -0.45 ? 0.72 : 1;
      if (Math.abs(t) > rad - px1 * 1.1 || s > CUE_LEN - px1) k = 0.42; // outline
      over.fillStyle = `rgb(${Math.min(255, c[0] * k)},${Math.min(255, c[1] * k)},${Math.min(255, c[2] * k)})`;
      over.fillRect(i, j, 1, 1);
    }
  }
}

// Shots left, as pips on the wood of the top rail: bright for shots left, dark for shots used.
function drawShotPips() {
  const total = core.shotsPerRound();
  const left = core.getShots();
  const gap = 3.2;
  const x0 = TW / 2 - ((total - 1) * gap) / 2;
  const y = -C - (MARGIN - C) / 2;
  for (let k = 0; k < total; k++) {
    const x = Math.round(ax(x0 + k * gap)) - 2;
    const yy = Math.round(ay(y)) - 2;
    over.fillStyle = "#1a0d06";
    over.fillRect(x - 1, yy - 1, 6, 6);
    over.fillStyle = k < left ? "#f4efe2" : "#4a2a15";
    over.fillRect(x, yy, 4, 4);
    if (k < left) {
      over.fillStyle = "#ffffff";
      over.fillRect(x, yy, 2, 1);
    }
  }
}

// Touch screens: the dead zone around the cue ball, hatched in blue (aim by rotating outside it).
function drawDeadzone() {
  if (finePointer.matches || core.getPhase() !== PHASE.AIM || theatreBusy) return;
  const cx = ax(core.ballX(0)), cy = ay(core.ballY(0));
  const r = DEADZONE * BR * ART;
  for (let y = Math.floor(cy - r); y <= cy + r; y++) {
    for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d > r) continue;
      if (d > r - 1) over.fillStyle = "rgba(90,180,230,0.75)";
      else if ((x + y) % 4 === 0) over.fillStyle = "rgba(90,180,230,0.45)";
      else continue;
      over.fillRect(x, y, 1, 1);
    }
  }
}

// ------------------------------------------------------------ hit effects
// Pixel particles and shock rings on the over layer, a short screen shake and phone vibration. Shake is skipped
// with reduced motion; vibration only where the browser supports it.
let particles = [];
let rings = [];
let shake = 0;

function burst(x, y, n, colors, speed, life) {
  for (let k = 0; k < n; k++) {
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.4 + Math.random() * 0.8);
    particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, t: 0, c: colors[k % colors.length], s: Math.random() < 0.3 ? 2 : 1 });
  }
}

function shockRing(x, y, r1, color, life) {
  rings.push({ x, y, r1, color, life, t: 0 });
}

function impact(strength, pattern) {
  if (!reduceMotion.matches) shake = Math.max(shake, strength);
  try {
    navigator.vibrate?.(pattern);
  } catch {}
}

function drawEffects(dt) {
  particles = particles.filter((p) => {
    p.t += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.9;
    p.vy *= 0.9;
    if (p.t > p.life) return false;
    if (p.t > p.life * 0.6 && Math.floor(p.t * 30) % 2) return true; // twinkle out
    over.fillStyle = p.c;
    over.fillRect(Math.floor(ax(p.x)), Math.floor(ay(p.y)), p.s, p.s);
    return true;
  });
  rings = rings.filter((r) => {
    r.t += dt;
    if (r.t > r.life) return false;
    const u = r.t / r.life;
    const rr = r.r1 * (0.3 + 0.7 * u) * ART;
    pring(over, ax(r.x), ay(r.y), rr - 1, rr, r.color);
    return true;
  });
  // screen shake: a few pixels, decaying fast
  if (shake > 0.01) {
    const sx = (Math.random() * 2 - 1) * shake * 6;
    const sy = (Math.random() * 2 - 1) * shake * 6;
    canvas.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px)`;
    shake *= Math.exp(-dt * 14);
  } else if (canvas.style.transform) {
    shake = 0;
    canvas.style.transform = "";
  }
}

// Cue tip meets cue ball: sparks of chalk and a white ring at the contact point, a kick of shake and a buzz.
function strikeEffect(power) {
  const cx = core.ballX(0), cy = core.ballY(0);
  const a = shot.state.angle;
  const hx = cx - Math.cos(a) * BR, hy = cy - Math.sin(a) * BR;
  burst(hx, hy, 6 + Math.round(power * 10), ["#ffffff", "#3f6fd0", "#9fc0ff"], 14 + power * 26, 0.35);
  shockRing(hx, hy, 2 + power * 3, "#ffffff", 0.18);
  impact(0.15 + power * 0.45, Math.round(8 + power * 22));
}

// A ball drops: a burst in the pocket's colour, a ring around the hole, a thump of shake and a double buzz.
function potEffect(pocket, n) {
  const pk = POCKETS[pocket];
  const col = n === 0 ? "#e2574c" : pocketColor(core.pocketMult(pocket));
  burst(pk.x, pk.y, 12, [col, "#ffffff", col], 26, 0.28);
  shockRing(pk.x, pk.y, pk.hole + 2.5, col, 0.18);
  impact(n === 0 ? 0.5 : 0.35, n === 0 ? [40, 30, 60] : [25, 35, 25]);
}

let cue_ = cueById(START_CUE); // the cue in play: its song drives the melody
let melody = createMelody(cue_.song);

// Contact sounds come straight from the physics: every ball-on-ball and cushion contact this frame, with its
// impact speed. The strongest few per frame are played (a break makes many at once), panned to where they happened.
function playContacts() {
  const n = core.hitCount();
  if (!n) return;
  const hits = [];
  for (let k = 0; k < n; k++) hits.push([core.hitStrength(k), core.hitKind(k), core.hitX(k)]);
  core.clearHits();
  hits.sort((a, b) => b[0] - a[0]);
  const full = core.maxSpeed();
  let sang = false;
  for (const [speed, kind, x] of hits.slice(0, 4)) {
    const strength = Math.min(1, (speed / full) * 1.4);
    if (kind === 0) {
      sfx.clack(MUSIC.enabled ? strength * 0.7 : strength, pan(x));
      // the strongest ball-on-ball contact each frame plays the next melody note, with a softer harmony a third
      // below (one note per frame, so a break doesn't stack neighbouring notes into a cluster)
      if (MUSIC.enabled && !sang) {
        sang = true;
        const { melody: m, harmony } = melody.next();
        sfx.note(midiToHz(m), strength, pan(x));
        sfx.note(midiToHz(harmony), strength, pan(x), 0.45);
      }
    }
    else sfx.cushion(strength * 0.9, pan(x));
  }
}

function drawSinkers(dt) {
  sinkers = sinkers.filter((s) => {
    s.t += dt;
    const pose = sinkPose(reduceMotion.matches ? s.t * 2 : s.t, s);
    if (pose.done) {
      sfx.pocketDrop(pan(s.px));
      potEffect(s.pocket, s.n);
      if (s.n > 0) startReturn(s);
      return false;
    }
    s.m = roll(s.m, pose.dx, pose.dy, BR);
    ctx.save();
    // once over the hole, the ball disappears below the pocket's rim
    const pk = POCKETS[s.pocket];
    if (Math.hypot(pose.x - pk.x, pose.y - pk.y) < pk.hole) {
      ctx.beginPath();
      ctx.arc(dx(pk.x), dy(pk.y), pk.hole * U(), 0, Math.PI * 2);
      ctx.clip();
    }
    drawBallAt(s.n, s.m, pose.x, pose.y, pose.scale, pose.dim);
    ctx.restore();
    return true;
  });
}

function pocketColor(mult) {
  return mult >= 3 ? "#f5c542" : mult === 2 ? "#7fe0b4" : "#f4efe2";
}

// Each pocket's multiplier ("x1" at the start), in pixel digits inside the hole (part of the table art).
function drawPocketLabel(p, i) {
  ptext(a, `x${core.pocketMult(i)}`, ax(p.x), ay(p.y), pocketColor(core.pocketMult(i)), 2);
}

function drawPopups(dt) {
  popups = popups.filter((p) => (p.t += dt) < 1.1);
  for (const p of popups) {
    const rise = reduceMotion.matches ? 0 : p.t * 6;
    if (p.t > 0.8 && Math.floor(p.t * 20) % 2) continue; // blink out
    ptext(over, p.text, ax(p.x), ay(p.y - rise), p.color, 2);
  }
}

function draw(dt) {
  clock += dt;
  spriteNext = 0;
  ensureArt();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(art, 0, 0, canvas.width, canvas.height);
  under.clearRect(0, 0, AW, AH);
  over.clearRect(0, 0, AW, AH);
  trackBalls();
  for (let i = 0; i < core.ballCount(); i++) if (core.ballOn(i)) ballShadow(core.ballX(i), core.ballY(i));
  drawShotPips();
  drawDeadzone();
  drawAim(); // fills the over layer (and the cue's shadow on the under layer)
  drawEffects(dt);
  drawPopups(dt);
  ctx.drawImage(underC, 0, 0, canvas.width, canvas.height);
  drawReturning(dt);
  drawTray(dt);
  drawSinkers(dt);
  for (let i = core.ballCount() - 1; i >= 0; i--) if (core.ballOn(i)) drawBallAt(core.ballNum(i), orient[i], core.ballX(i), core.ballY(i));
  ctx.drawImage(overC, 0, 0, canvas.width, canvas.height);
}

// ------------------------------------------------------------ HUD
function renderHud() {
  const round = core.getRound();
  const tgt = core.target(round);
  const score = core.getScore();
  $("hud-round").textContent = `R${round + 1}/${core.roundCount()}`;
  $("hud-money").textContent = `$${core.getMoney()}`;
  $("hud-mult").textContent = `+${core.getMult() - 1}`;
  $("hud-mult").title = `+${core.getMult() - 1} Mult from your cards`;
  $("btn-undo").disabled = !core.canUndo() || theatreBusy || core.getPhase() === PHASE.ROLLING;
  renderMods($("mods"));
  $("hud-score").textContent = `${score} / ${tgt}`;
  $("hud-fill").style.width = `${Math.min(100, (score / tgt) * 100)}%`;
  $("hud-progress").setAttribute("aria-valuemax", String(tgt));
  $("hud-progress").setAttribute("aria-valuenow", String(score));
  $("hud-progress").classList.toggle("done", score >= tgt);
  const total = core.shotsPerRound();
  const left = core.getShots();
  const aiming = core.getPhase() === PHASE.AIM;
  renderHint();
}

let toastTimer = 0;
function toast(msg, big = false) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.remove("show");
  void t.offsetWidth;
  t.classList.add("show");
  t.classList.toggle("big", big);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 1400);
}

function show(id) {
  for (const o of ["ov-start", "ov-shop", "ov-end", "ov-shots"]) $(o).hidden = o !== id;
  renderHint();
  if (id) $(id).querySelector(".btn.primary")?.focus();
}

function renderMap() {
  const best = readBest(localStorage);
  $("run-map").replaceChildren(
    ...Array.from({ length: core.roundCount() }, (_, r) => {
      const li = document.createElement("li");
      li.textContent = `Round ${r + 1}`;
      const b = document.createElement("span");
      b.textContent = `${core.target(r)} pts`;
      li.append(b);
      return li;
    }),
  );
  $("best").textContent = best.total ? `Best: ${best.total} points, reached round ${best.round}.` : "";
}

function renderShop() {
  $("shop-income").textContent = `+$${core.lastIncome()} (round bonus + $1 per unused shot). You have $${core.getMoney()}.`;
  $("offers").replaceChildren(
    ...[0, 1, 2].map((k) => {
      const { title, text: desc } = offerLabel(core.offerKind(k), core.offerArg(k));
      const sold = core.offerSold(k) === 1;
      const b = document.createElement("button");
      b.type = "button";
      const buyable = core.offerBuyable(k) === 1;
      const noSlot = !sold && core.getMoney() >= core.offerPrice(k) && !buyable;
      b.className = "offer" + (sold ? " sold" : "") + (!sold && !buyable ? " unavailable" : "");
      b.disabled = sold || !buyable;
      b.innerHTML = `<span class="t"></span><span class="p"></span><span class="d"></span>`;
      const kind = core.offerKind(k);
      b.prepend([1, 2, 3, 5].includes(kind) ? coinImg(kind, title) : iconImg(OFFER_ICONS[kind] ?? "polish", title));
      b.querySelector(".t").textContent = title;
      b.querySelector(".p").textContent = sold ? "Bought" : noSlot ? "No slot" : `$${core.offerPrice(k)}`;
      b.querySelector(".d").replaceChildren(...richParts(desc).map(({ t, cls }) => {
        const sp = document.createElement("span");
        sp.textContent = t;
        if (cls) sp.className = `hl hl-${cls}`;
        return sp;
      }));
      b.addEventListener("click", () => {
        if (core.buy(k)) {
          sfx.chime([880, 1320]);
          renderShop();
          renderHud();
        }
      });
      return b;
    }),
  );
  renderMods($("shop-mods"));
  const rc = core.rerollCost();
  $("btn-reroll").textContent = `Reroll $${rc}`;
  $("btn-reroll").disabled = core.getMoney() < rc;
}

function finishRun(won) {
  const best = writeBest(localStorage, core.runTotal(), core.getRound() + (won ? 1 : 0));
  $("end-title").textContent = won ? "Run cleared!" : "Out of shots";
  $("end-text").textContent = won
    ? `You beat all ${core.roundCount()} rounds with ${core.runTotal()} points. Best: ${best.total}.`
    : `Round ${core.getRound() + 1}: ${core.getScore()} of ${core.target(core.getRound())} points. Run total ${core.runTotal()}. Best: ${best.total}.`;
  $("btn-end-undo").hidden = won || !core.canUndo();
  show("ov-end");
}

// ------------------------------------------------------------ modifier bar and info pop-ups
// One coin tray: a modifier section (up to 5 coins) and a special section (up to 2). Only held coins are drawn; each
// is ringed in its effect's colour (blue points, red multipliers, green shots). Tapping one shows what it does, and
// specials get a Use button. Coins cannot be sold.
function renderMods(host) {
  const section = (cls, label, coins) => {
    const s = document.createElement("div");
    s.className = `tray-section ${cls}`;
    s.setAttribute("aria-label", label);
    s.append(...coins);
    return s;
  };
  const mods = [], specs = [];
  for (let i = 0; i < core.modSlots(); i++) if (core.modKind(i) !== 255) mods.push(coinButton(i, core.modKind(i), core.modArg(i), false));
  for (let i = 0; i < core.specialSlots(); i++) if (core.specKind(i) !== 255) specs.push(coinButton(core.modSlots() + i, core.specKind(i), core.specArg(i), true));
  host.replaceChildren(
    section("tray-mods", `Modifier coins, ${mods.length} of ${core.modSlots()}`, mods),
    section("tray-specials", `Special coins, ${specs.length} of ${core.specialSlots()}`, specs),
  );
}

function coinButton(slot, kind, arg, special) {
  const b = document.createElement("button");
  b.type = "button";
  const { title, text } = offerLabel(kind, arg);
  b.className = `coin-slot effect-${coinEffect(kind)}${special ? " special" : ""} idle`;
  b.style.animationDelay = `${(slot % 4) * -0.7}s`;
  b.append(coinImg(kind, title));
  b.setAttribute("aria-label", title);
  b.addEventListener("click", () => {
    const r = b.getBoundingClientRect();
    const busy = core.getPhase() === PHASE.ROLLING || theatreBusy;
    const actions = special && !busy
      ? [["Use", () => { if (core.useSpecial(slot - core.modSlots())) { sfx.chime([660, 880, 1320]); afterCardChange(); } }]]
      : [];
    showTip(title, text, { x: r.left + r.width / 2, y: r.bottom + 4, below: true }, actions);
  });
  return b;
}

function afterCardChange() {
  hideTip();
  renderHud();
  if (!$("ov-shop").hidden) renderShop();
  if (!$("ov-shots").hidden) renderShots();
}

// The pop-up: it scales in with a pixel step, its title letters wave, and the description types itself out.
function showTip(title, text, at, actions = []) {
  const tip = $("tip");
  const fast = reduceMotion.matches;
  $("tip-title").replaceChildren(
    ...[...title].map((ch, i) => {
      const sp = document.createElement("span");
      sp.textContent = ch === " " ? "\u00a0" : ch;
      sp.style.animationDelay = `${i * 0.06}s`;
      if (fast) sp.style.animation = "none";
      return sp;
    }),
  );
  // the description types itself out; highlighted keywords ({text|kind}) keep their colour
  let i = 0;
  $("tip-text").replaceChildren(
    ...richParts(text).flatMap(({ t, cls }) =>
      [...t].map((ch) => {
        const sp = document.createElement("span");
        sp.textContent = ch;
        if (cls) sp.className = `hl hl-${cls}`;
        sp.style.animationDelay = fast ? "0s" : `${Math.min(i++ * 0.012, 0.9)}s`;
        return sp;
      }),
    ),
  );
  tip.setAttribute("aria-label", `${title}. ${plainText(text)}`);
  $("tip-actions").replaceChildren(
    ...actions.map(([label, fn]) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "btn";
      b.textContent = label;
      b.addEventListener("click", fn);
      return b;
    }),
  );
  tip.hidden = false;
  tip.classList.toggle("below", !!at.below);
  tip.style.animation = "none";
  void tip.offsetWidth;
  tip.style.animation = "";
  const w = tip.offsetWidth, h = tip.offsetHeight;
  const left = Math.max(6, Math.min(innerWidth - w - 6, at.x - w / 2));
  tip.style.left = `${left}px`;
  tip.style.top = `${at.below ? at.y + 10 : Math.max(6, at.y - h - 14)}px`;
  tip.style.setProperty("--arrow", `${Math.max(14, Math.min(w - 14, at.x - left))}px`);
}

function hideTip() {
  $("tip").hidden = true;
}

document.addEventListener("pointerdown", (e) => {
  if ($("tip").hidden) return;
  if (e.target.closest?.("#tip, .coin-slot, .mods")) return;
  hideTip();
});

// Retry: take back the last shot, once per round (also from the end screen after running out of shots).
function undo() {
  if (theatreBusy || core.getPhase() === PHASE.ROLLING || !core.undoShot()) return;
  sinkers = [];
  returning = [];
  tray = tray.slice(0, trayBefore);
  popups = [];
  orient = [];
  lastPos = [];
  shot.cancel();
  hideTip();
  show(null);
  sfx.chime([784, 659, 523], 0.06);
  toast("Shot taken back");
  renderHud();
  renderHint();
}

// ------------------------------------------------------------ game flow
function newRun() {
  core.newRun((Math.random() * 0xffffffff) >>> 0 || 1);
  shot.cancel();
  shot.state.angle = -Math.PI / 2;
  popups = [];
  sinkers = [];
  orient = [];
  lastPos = [];
  returning = [];
  tray = [];
  melody.reset(); // every run starts the song from the beginning
  particles = [];
  rings = [];
  renderHud();
  renderHint();
  show(null);
}

let trayBefore = 0;
function fire(p) {
  if (p <= 0 || core.getPhase() !== PHASE.AIM) return;
  hideTip();
  trayBefore = tray.length;
  prevOn = Array.from({ length: core.ballCount() }, (_, i) => core.ballOn(i));
  strikeEffect(p);
  core.clearHits();
  core.shoot(shot.state.angle, p);
  sfx.strike(p, pan(core.ballX(0)));
  renderHud();
  renderHint();
}

function nearestPocket(x, y) {
  let best = 0;
  POCKETS.forEach((p, i) => {
    if (Math.hypot(x - p.x, y - p.y) < Math.hypot(x - POCKETS[best].x, y - POCKETS[best].y)) best = i;
  });
  return best;
}

// A potted ball keeps its last position and speed and drops into its pocket, then returns to the tray.
function checkPots() {
  for (let i = 0; i < core.ballCount(); i++) {
    if (!prevOn[i] || core.ballOn(i)) continue;
    prevOn[i] = 0;
    const n = core.ballNum(i);
    const x = core.ballX(i);
    const y = core.ballY(i);
    const pk = POCKETS[nearestPocket(x, y)];
    const lp = lastPos[i] ?? [x, y, 0, 0];
    const vx = lp[2] * 60;
    const vy = lp[3] * 60;
    // the drop aims at the back of the hole, away from the bed
    const back = pk.hole * 0.3;
    const bx = pk.x + (pk.x < TW / 2 ? -back : back) * (pk.mid ? 1 : 0.7);
    const by = pk.y + (pk.mid ? 0 : (pk.y < TH / 2 ? -back : back) * 0.7);
    sinkers.push({ n, m: orient[i] ?? identity(), x, y, vx, vy, px: bx, py: by, pocket: POCKETS.indexOf(pk), t: 0 });
    lastPos[i] = null;
    const off = pk.hole + 4;
    const lx = pk.x + (pk.x < TW / 2 ? off : -off);
    const ly = pk.mid ? pk.y : pk.y + (pk.y < TH / 2 ? off : -off);
    popups.push(n === 0 ? { x: lx, y: ly, text: "0", color: "#e2574c", t: 0 } : { x: lx, y: ly, text: `+${core.ballPoints(n)}`, color: "#f5c542", t: 0 });
  }
}

function settle() {
  const before = core.getRound();
  const target = core.target(before);
  const scoreBefore = core.getScore();
  const onBefore = Array.from({ length: core.ballCount() }, (_, i) => core.ballOn(i)).filter((v, i) => i > 0 && v).length;
  const got = core.endShot();
  const onAfter = Array.from({ length: core.ballCount() }, (_, i) => core.ballOn(i)).filter((v, i) => i > 0 && v).length;
  if (onBefore === 0 && onAfter > 0) setTimeout(clearTray, 900); // re-racked: the tray empties back onto the table
  const scratch = core.lastScratch() === 1;
  const t = core.lastType();
  const finish = () => {
    theatreBusy = false;
    renderHud();
    renderHint();
    const ph = core.getPhase();
    if (ph === PHASE.SHOP) {
      sfx.chime([523, 659, 784, 1047], 0.09);
      setTimeout(() => { renderShop(); $("shop-title").textContent = `Round ${before + 1} cleared!`; show("ov-shop"); }, 500);
    } else if (ph === PHASE.WON) setTimeout(() => finishRun(true), 500);
    else if (ph === PHASE.LOST) setTimeout(() => finishRun(false), 500);
  };
  if (t === 255) {
    toast(scratch ? "Scratch · −1 shot" : "No pot");
    finish();
    return;
  }
  if (scratch) toast("Scratch · −1 shot");
  const items = Array.from({ length: core.potCount() }, (_, k) => core.ballPoints(core.potBall(k)) * core.pocketMult(core.potPocket(k)));
  runTheatre({ type: t, level: core.typeLevel(t), base: core.typePoints(t), items, mult: core.lastMult(), total: got, fire: scoreBefore < target && got >= target - scoreBefore }, finish);
}

// ------------------------------------------------------------ score count-up (Balatro-style)
// The shot type and its level pop up, then each potted ball ticks its points into the blue Points box (one melody
// note per tick), the red Mult box fills, and the total lands. If this shot alone reaches the round's target, the
// total catches fire with a bigger shake.
let theatreBusy = false;

function runTheatre(d, done) {
  theatreBusy = true;
  const fast = reduceMotion.matches;
  const step = fast ? 0.06 : 0.24;
  const el = $("theatre");
  const pts = $("th-points");
  const mul = $("th-mult");
  const tot = $("th-total");
  $("th-type").replaceChildren(iconImg(SHOT_ICONS[d.type]), `${SHOT_TYPES[d.type].name}${d.level > 1 ? ` · Lv ${d.level}` : ""}`);
  let points = d.base;
  pts.textContent = String(points);
  mul.textContent = "";
  tot.textContent = "";
  tot.classList.remove("fire");
  el.hidden = false;
  const bump = (node) => {
    node.classList.remove("bump");
    void node.offsetWidth;
    node.classList.add("bump");
  };
  const sing = (strength) => {
    if (!MUSIC.enabled) return sfx.blip(520, 0.05);
    const { melody: m, harmony } = melody.next();
    sfx.note(midiToHz(m), strength);
    sfx.note(midiToHz(harmony), strength, 0, 0.45);
  };
  const beats = [
    () => {
      bump(pts);
      sing(0.5);
    },
    ...d.items.map((add) => () => {
      points += add;
      pts.textContent = String(points);
      bump(pts);
      sing(0.6);
    }),
    () => {
      mul.textContent = String(d.mult);
      bump(mul);
      sing(0.75);
    },
    () => {
      tot.textContent = d.total.toLocaleString("en-US");
      if (d.fire) {
        tot.classList.add("fire");
        impact(0.6, [20, 30, 40]);
        sfx.chime([784, 988, 1175, 1568], 0.06);
      } else sing(0.9);
    },
  ];
  beats.forEach((beat, k) => setTimeout(beat, k * step * 1000));
  setTimeout(() => {
    el.hidden = true;
    done();
  }, (beats.length * step + (fast ? 0.2 : 0.7)) * 1000);
}

function renderShots() {
  $("shot-list").replaceChildren(
    ...SHOT_TYPES.map((st, t) => {
      const li = document.createElement("li");
      li.innerHTML = `<span class="n"></span><span class="v"><i></i></span><span class="r"></span>`;
      li.prepend(iconImg(SHOT_ICONS[t], st.name));
      li.querySelector(".n").textContent = `${st.name} · Lv ${core.typeLevel(t)}`;
      li.querySelector("i").textContent = `×${core.typeMult(t)}`;
      li.querySelector(".r").textContent = `${st.rule}. Played ${core.typePlayed(t)}×.`;
      return li;
    }),
  );
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (core.getPhase() === PHASE.ROLLING) {
    core.step(dt);
    playContacts();
    checkPots();
    if (!core.moving()) settle();
  }
  draw(dt);
  drawGoo();
  requestAnimationFrame(frame);
}

// ------------------------------------------------------------ input
// Aim, lock, then move any way to build speed. See createShotInput in logic.js.
function tablePoint(e) {
  const r = canvas.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width) * AW;
  const y = ((e.clientY - r.top) / r.height) * AH;
  return [x / ART - MARGIN, y / ART - MARGIN];
}
const cue = () => [core.ballX(0), core.ballY(0)];
const canAim = () => core.getPhase() === PHASE.AIM && !theatreBusy && $("ov-start").hidden && $("ov-shop").hidden && $("ov-end").hidden && $("ov-shots").hidden;
const finePointer = matchMedia("(pointer: fine)");

// The hint text is gone; only the cursor reflects the state (hidden while pulling with the mouse).
function renderHint() {
  canvas.style.cursor = shot.state.locked ? "none" : "crosshair";

}

const nowS = () => performance.now() / 1000;
const FINE = Math.PI / 720;

// ---- touch: one gesture anywhere on the screen except balls, coins and buttons (World of Goo style pull)
// The first clear movement decides what the drag does:
//   pulling back (away from where the cue points) = power: a stretchy goo strand runs from where you touched to your
//     finger, the speed ring fills, and letting go shoots (at zero speed nothing happens);
//   anything else = aim: the aim turns by the angle your finger sweeps around the cue ball.
// Tapping a ball shows what it is (the cue never moves); a second finger cancels a pull.
let gesture = null; // { id, x0, y0, last, mode: null | "aim" | "pull", t0, ball }
const DECIDE_PX = 10;

const notGestureTarget = (el) => el.closest?.("button, .coin-slot, .mods, #tip, .overlay, .chip, a, input");

document.addEventListener(
  "pointerdown",
  (e) => {
    if (e.pointerType === "mouse") return;
    if (gesture) {
      // a second finger: cancel a pull in progress
      if (e.pointerId !== gesture.id && gesture.mode === "pull") {
        gesture = null;
        shot.cancel();
        sfx.blip(220, 0.06);
        try {
          navigator.vibrate?.([12, 40, 12]);
        } catch {}
      }
      return;
    }
    if (!canAim() || notGestureTarget(e.target)) return;
    hideTip();
    const p = tablePoint(e);
    const ball = e.target === canvas ? ballAt(p) : -1;
    gesture = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, last: p, mode: null, t0: nowS(), ball };
  },
  true,
);

document.addEventListener("pointermove", (e) => {
  if (!gesture || e.pointerId !== gesture.id) return;
  const p = tablePoint(e);
  gesture.x = e.clientX;
  gesture.y = e.clientY;
  const ddx = e.clientX - gesture.x0, ddy = e.clientY - gesture.y0;
  const ux = Math.cos(shot.state.angle), uy = Math.sin(shot.state.angle);
  const back = -(ddx * ux + ddy * uy); // how far the finger moved away from where the cue points
  if (!gesture.mode && Math.hypot(ddx, ddy) > DECIDE_PX && gesture.ball < 0) {
    gesture.mode = back > Math.abs(ddx * uy - ddy * ux) ? "pull" : "aim";
    if (gesture.mode === "pull") {
      shot.state.locked = true;
      shot.state.power = 0;
    }
  }
  if (gesture.mode === "aim" && canAim() && !inDeadzone(p, cue(), BR) && !inDeadzone(gesture.last, cue(), BR))
    shot.state.angle = rotateAim(shot.state.angle, cue(), gesture.last, p);
  if (gesture.mode === "pull") shot.state.power = pullPower(0, back);
  gesture.last = p;
});

function endGesture(e) {
  if (!gesture || e.pointerId !== gesture.id) return;
  const g = gesture;
  gesture = null;
  if (g.mode === "pull") {
    const power = shot.state.power;
    shot.cancel();
    if (power > 0 && canAim()) fire(power);
  } else if (!g.mode && g.ball >= 0 && nowS() - g.t0 < 0.5) showBallTip(g.ball);
  renderHint();
}
document.addEventListener("pointerup", endGesture);
document.addEventListener("pointercancel", (e) => {
  if (gesture && e.pointerId === gesture.id) {
    gesture = null;
    shot.cancel();
  }
});

// The goo strand: drawn as chunky pixel art on a screen-wide overlay while pulling.
const goo = $("goo");
const gctx = goo.getContext("2d");
const GOO_PX = 3; // screen pixels per goo pixel
function drawGoo() {
  const w = Math.ceil(innerWidth / GOO_PX), h = Math.ceil(innerHeight / GOO_PX);
  if (goo.width !== w || goo.height !== h) {
    goo.width = w;
    goo.height = h;
  }
  gctx.clearRect(0, 0, w, h);
  if (!gesture || gesture.mode !== "pull") return;
  const ax0 = gesture.x0 / GOO_PX, ay0 = gesture.y0 / GOO_PX;
  const bx = gesture.x / GOO_PX, by = gesture.y / GOO_PX;
  const len = Math.hypot(bx - ax0, by - ay0);
  const power = shot.state.power;
  const col = power >= 1 ? "#ffffff" : ringColor(Math.max(power, 0.01));
  // the strand thins as it stretches and sags a little, wobbling like goo
  const thick = Math.max(1.6, 5 - len / 25);
  const sag = Math.min(8, len / 6) + (reduceMotion.matches ? 0 : Math.sin(clock * 9) * 0.8);
  const nx = -(by - ay0) / (len || 1), ny = (bx - ax0) / (len || 1);
  const pt = (t) => [ax0 + (bx - ax0) * t + nx * sag * 4 * t * (1 - t), ay0 + (by - ay0) * t + ny * sag * 4 * t * (1 - t)];
  const disc = (x, y, r, c) => {
    gctx.fillStyle = c;
    for (let j = Math.floor(y - r); j <= y + r; j++)
      for (let i = Math.floor(x - r); i <= x + r; i++) if (Math.hypot(i + 0.5 - x, j + 0.5 - y) <= r) gctx.fillRect(i, j, 1, 1);
  };
  const steps = Math.max(2, Math.ceil(len));
  for (const [r, c] of [[1.2, "#0b0a10"], [0, "#2a2436"], [-0.9, col]]) {
    for (let k = 0; k <= steps; k++) {
      const [x, y] = pt(k / steps);
      const taper = 0.75 + 0.25 * Math.abs(k / steps - 0.5) * 2; // thinner in the middle
      disc(x, y, Math.max(0.6, thick * taper + r), c);
    }
  }
  // blobs at both ends, with a highlight
  for (const [x, y, r] of [[ax0, ay0, 6], [bx, by, 5]]) {
    disc(x, y, r + 1, "#0b0a10");
    disc(x, y, r, "#2a2436");
    disc(x, y, r - 1.5, col);
    gctx.fillStyle = "#ffffff";
    gctx.fillRect(Math.floor(x - r / 2), Math.floor(y - r / 2), 2, 1);
  }
  // the speed as pixel digits beside the finger
  const pct = String(Math.round(power * 100));
  gctx.fillStyle = "#0b0a10";
  let tx = Math.round(bx + 9), ty = Math.round(by - 3);
  for (const ch of pct) {
    DIGITS[ch]?.forEach((row, ry) => [...row].forEach((bit, rx) => bit === "1" && gctx.fillRect(tx + rx + 1, ty + ry + 1, 1, 1)));
    tx += 4;
  }
  gctx.fillStyle = col;
  tx = Math.round(bx + 9);
  for (const ch of pct) {
    DIGITS[ch]?.forEach((row, ry) => [...row].forEach((bit, rx) => bit === "1" && gctx.fillRect(tx + rx, ty + ry, 1, 1)));
    tx += 4;
  }
}

// ---- mouse on the table: point to aim, press, drag back, release; a click on a ball shows what it is
let mouseDown = null;
canvas.addEventListener("pointerdown", (e) => {
  if (e.pointerType !== "mouse" || !canAim() || e.button > 0) return;
  hideTip();
  const p = tablePoint(e);
  try {
    canvas.setPointerCapture(e.pointerId);
  } catch {}
  mouseDown = { id: e.pointerId, start: { t: nowS(), x: e.clientX, y: e.clientY, p, angle: shot.state.angle }, moved: false };
  shot.down(p);
  renderHint();
});
canvas.addEventListener("pointermove", (e) => {
  if (e.pointerType !== "mouse") return;
  if (mouseDown && Math.hypot(e.clientX - mouseDown.start.x, e.clientY - mouseDown.start.y) > 6) mouseDown.moved = true;
  if (canAim()) shot.hover(tablePoint(e), cue());
});
canvas.addEventListener("pointerup", (e) => {
  if (e.pointerType !== "mouse" || !mouseDown || e.pointerId !== mouseDown.id) return;
  const { start, moved } = mouseDown;
  mouseDown = null;
  const ball = !moved && nowS() - start.t < 0.35 ? ballAt(start.p) : -1;
  if (ball >= 0) {
    shot.cancel();
    shot.state.angle = start.angle; // looking at a ball never moves the cue
    showBallTip(ball);
  } else fire(shot.up());
  renderHint();
});

function showBallTip(ball) {
  const n = core.ballNum(ball);
  const { title, text } = ballInfo(n, n ? core.ballPoints(n) : 0);
  const r = canvas.getBoundingClientRect();
  showTip(title, text, { x: r.left + (dx(core.ballX(ball)) / canvas.width) * r.width, y: r.top + (dy(core.ballY(ball) - BR) / canvas.height) * r.height });
}

function ballAt([x, y]) {
  for (let i = 0; i < core.ballCount(); i++) {
    if (core.ballOn(i) && Math.hypot(core.ballX(i) - x, core.ballY(i) - y) < BR * 1.4) return i;
  }
  return -1;
}
canvas.addEventListener("pointercancel", (e) => {
  if (mouseDown && e.pointerId === mouseDown.id) {
    mouseDown = null;
    shot.cancel();
  }
});
canvas.addEventListener("contextmenu", (e) => { e.preventDefault(); shot.cancel(); mouseDown = null; renderHint(); });

// Keyboard: arrows aim, Up/Down lock and set speed, Enter or Space shoots, Escape unlocks.
document.addEventListener("keydown", (e) => {
  if (!$("ov-start").hidden || !$("ov-shop").hidden || !$("ov-end").hidden) return;
  if (!canAim()) return;
  const s = shot.state;
  const turn = e.shiftKey ? FINE * 10 : FINE * 2;
  if (e.key === "ArrowLeft") shot.nudge(-turn);
  else if (e.key === "ArrowRight") shot.nudge(turn);
  else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
    s.locked = true;
    s.power = Math.max(0, Math.min(1, s.power + (e.key === "ArrowUp" ? 0.05 : -0.05)));
  } else if ((e.key === " " || e.key === "Enter") && s.power > 0) {
    const p = s.power;
    shot.cancel();
    fire(p);
  } else if (e.key === "Escape") shot.cancel();
  else return;
  renderHint();
  e.preventDefault();
});

// Fit the table to the space available at its exact proportions, rendering at device resolution.
function fitTable() {
  const wrap = $("table-wrap");
  const k = Math.min((wrap.clientWidth - 8) / AW, (wrap.clientHeight - 8) / AH);
  const cssW = Math.floor(AW * k);
  const cssH = Math.floor(AH * k);
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(canvas.width * (AH / AW));
  P = canvas.width / AW;
}
new ResizeObserver(fitTable).observe($("table-wrap"));

$("btn-start").addEventListener("click", () => { sfx.blip(440); newRun(); });
$("btn-shots").addEventListener("click", () => {
  if (core.getPhase() === PHASE.ROLLING || theatreBusy) return;
  renderShots();
  show("ov-shots");
});
$("btn-shots-close").addEventListener("click", () => show(null));
$("btn-undo").addEventListener("click", undo);
$("btn-end-undo").addEventListener("click", undo);
$("btn-again").addEventListener("click", () => { renderMap(); show("ov-start"); });
$("btn-reroll").addEventListener("click", () => { if (core.reroll()) { sfx.blip(300); renderShop(); renderHud(); } });
$("btn-next").addEventListener("click", () => { clearTray(); core.nextRound(); renderHud(); show(null); toast(`Round ${core.getRound() + 1}: ${core.target(core.getRound())} pts`, true); });
function renderSound() {
  $("btn-sound").setAttribute("aria-pressed", String(sound));
  $("btn-sound").setAttribute("aria-label", sound ? "Sound on" : "Sound off");
}
$("btn-sound").addEventListener("click", () => {
  sound = !sound;
  sfx.setSound(sound);
  localStorage.setItem("rack-and-ruin.sound", sound ? "on" : "off");
  renderSound();
});

// ------------------------------------------------------------ carpet under the table (CARPETS in config.js)
// A pixel tile of fibre strands on a base colour, repeated over the page.
function carpetTile(c) {
  const N = c.size ?? 64;
  const t = document.createElement("canvas");
  t.width = t.height = N;
  const g = t.getContext("2d");
  g.fillStyle = c.base;
  g.fillRect(0, 0, N, N);
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const pile = (density) => {
    for (let k = 0; k < N * N * density; k++) {
      const x = Math.floor(rnd() * N), y = Math.floor(rnd() * N);
      g.fillStyle = c.pile[Math.floor(rnd() * c.pile.length)];
      const len = 1 + Math.floor(rnd() * c.tuft);
      const lean = rnd() < 0.5 ? -1 : 1;
      for (let i = 0; i < len; i++) g.fillRect((x + (i % 2 ? lean : 0) + N) % N, (y + i) % N, 1, 1);
    }
  };
  pile(c.density);
  if (c.streaks) {
    // Drawn 9 times (shifted by the tile size) so streaks crossing an edge continue on the next tile seamlessly.
    g.lineCap = "square";
    g.lineJoin = "miter";
    for (const st of carpetStreaks(c.streaks, N)) {
      g.strokeStyle = st.color;
      g.lineWidth = st.width;
      for (const dx of [-N, 0, N]) for (const dy of [-N, 0, N]) {
        g.beginPath();
        st.points.forEach(([x, y], i) => (i ? g.lineTo(x + dx, y + dy) : g.moveTo(x + dx, y + dy)));
        g.stroke();
      }
    }
    // A light pass of pile over the streaks so they look woven in, not painted on.
    pile(c.density * 0.25);
  }
  return t.toDataURL();
}

function applyCarpet(id = CARPET) {
  const c = CARPETS[id] ?? CARPETS.highPile;
  document.body.style.backgroundColor = c.base;
  document.body.style.backgroundImage = `url(${carpetTile(c)})`;
  document.body.style.backgroundSize = `${(c.size ?? 64) * 3}px`;
}

// ------------------------------------------------------------ boot
// ?debug exposes the core for scripted captures (tools/capture.ts); normal play never uses it.
if (new URLSearchParams(location.search).has("debug")) window.rr = { core, shot, fire, renderHud, renderShop, show };
core.newRun(1);
applyCarpet();
renderSound();
renderMap();
renderHud();
renderHint();
fitTable();
show("ov-start");
requestAnimationFrame(frame);
