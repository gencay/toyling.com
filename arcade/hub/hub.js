// Toyling arcade hub: a dim 3D arcade room (Lethal Company-ish: low-res, foggy, flickering lamps, amber HUD).
// Each game is a 1990s cabinet showing its screenshot. Clicking a cabinet zooms into its screen and opens the game.
import * as THREE from 'three';
import { createProps, salary } from './props.js';

const ENTRIES = window.ARCADE ?? [];
// Where the page runs: the home arcade has a sign-up endpoint; toyling.com/arcade/ (a static site) has none.
const SITE = window.ARCADE_SITE ?? { signup: '/hub/api/signup' };
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = document.getElementById('scene');
const selEl = document.getElementById('sel');
const fade = document.getElementById('fade');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setPixelRatio(1);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#040404');
scene.fog = new THREE.FogExp2('#050403', 0.045);
const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 80);
const LOW_RES = 540; // internal render height: chunky pixels
function resize() {
  const h = Math.min(LOW_RES, innerHeight);
  const w = Math.round((innerWidth / innerHeight) * h);
  renderer.setSize(w, h, false);
  camera.aspect = innerWidth / innerHeight;
  // widen the view on narrow windows so the whole row of machines always fits on screen
  const need = (typeof ROW_SPAN === 'number' ? ROW_SPAN + 2 * HEAD_MAX : 1.6) + 0.1;
  camera.fov = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(need / 2) / camera.aspect)), 60, 110);
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

// ---------- textures ----------
const tex = (c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; return t; };
function canvas2d(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; }
function hash(s) { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; }
function rng(seed) { return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296); }

const floorTex = tex(canvas2d(128, 128, (g) => {
  g.fillStyle = '#1b1a18'; g.fillRect(0, 0, 128, 128);
  const r = rng(3);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${r() * 0.08})`; g.fillRect(r() * 128, r() * 128, 2, 2); }
  g.strokeStyle = '#0b0b0a'; g.lineWidth = 3; g.strokeRect(0, 0, 128, 128);
  g.fillStyle = '#2a2824'; for (let x = 8; x < 128; x += 16) for (let y = 8; y < 128; y += 16) g.fillRect(x, y, 3, 3);
}));
floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
floorTex.repeat.set(30, 15);
const wallTex = tex(canvas2d(256, 256, (g) => {
  g.fillStyle = '#26231f'; g.fillRect(0, 0, 256, 256);
  const r = rng(9);
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.25})`; g.fillRect(r() * 256, r() * 256, r() * 40, r() * 80); }
  g.fillStyle = '#121110'; for (let x = 0; x < 256; x += 64) g.fillRect(x, 0, 3, 256);
  for (let x = -40; x < 300; x += 28) { g.fillStyle = '#d9a400'; g.beginPath(); g.moveTo(x, 200); g.lineTo(x + 14, 200); g.lineTo(x + 30, 226); g.lineTo(x + 16, 226); g.fill(); }
  g.fillStyle = '#111'; g.fillRect(0, 196, 256, 4); g.fillRect(0, 226, 256, 4);
}));
wallTex.wrapS = THREE.RepeatWrapping;
wallTex.repeat.set(12, 1);

const noiseCanvas = canvas2d(96, 72, () => {});
const noiseTex = tex(noiseCanvas);
function drawNoise(label) {
  const g = noiseCanvas.getContext('2d');
  const img = g.createImageData(96, 72);
  for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 200; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  g.putImageData(img, 0, 0);
  g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, 28, 96, 16);
  g.fillStyle = '#ff8a2a'; g.font = 'bold 10px monospace'; g.textAlign = 'center'; g.fillText(label, 48, 40);
  noiseTex.needsUpdate = true;
}
drawNoise('NO SIGNAL');
// offline machines show the ship radar: crew dots marked DECEASED
const radarCanvas = canvas2d(128, 96, () => {});
const radarTex = tex(radarCanvas);
function drawRadar(t) {
  const g = radarCanvas.getContext('2d'), w = 128, h = 96;
  g.fillStyle = '#020a04'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(61,255,110,.18)'; g.lineWidth = 1;
  for (let x = 0; x < w; x += 12) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  for (let y = 0; y < h; y += 12) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  g.strokeStyle = 'rgba(61,255,110,.6)'; g.strokeRect(30, 26, 68, 44); g.strokeRect(54, 16, 20, 10);
  g.save(); g.translate(w / 2, h / 2); g.rotate(t * 1.2); g.fillStyle = 'rgba(61,255,110,.25)'; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 90, -0.3, 0); g.fill(); g.restore();
  g.strokeStyle = '#ff3b2f'; g.lineWidth = 2;
  for (const [x, y] of [[42, 40], [80, 36], [60, 58], [88, 60]]) { g.beginPath(); g.moveTo(x - 3, y - 3); g.lineTo(x + 3, y + 3); g.moveTo(x + 3, y - 3); g.lineTo(x - 3, y + 3); g.stroke(); }
  g.fillStyle = '#ff3b2f'; g.font = 'bold 9px monospace'; g.textAlign = 'center'; g.fillText('CREW: DECEASED', w / 2, 88);
  g.fillStyle = '#3dff6e'; g.fillText('SIGNAL LOST', w / 2, 10);
  radarTex.needsUpdate = true;
}
drawRadar(0);

function stickerTex(hue) {
  return tex(canvas2d(192, 128, (g, w, h) => {
    g.translate(w / 2, h / 2);
    g.fillStyle = '#f2c200'; g.beginPath(); g.roundRect(-88, -56, 176, 112, 14); g.fill();
    g.save(); g.beginPath(); g.roundRect(-88, -56, 176, 112, 14); g.clip();
    for (let x = -140; x < 140; x += 28) { g.fillStyle = '#141414'; g.beginPath(); g.moveTo(x, 56); g.lineTo(x + 14, 56); g.lineTo(x + 34, 36); g.lineTo(x + 20, 36); g.fill(); }
    g.restore();
    g.fillStyle = '#141414'; g.font = '900 54px Impact, "Arial Black", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('NEW', 0, -14);
    g.font = '700 20px "Courier New", monospace'; g.fillText('GAME!', 0, 20);
    g.globalCompositeOperation = 'destination-out'; // worn, scratched sticker
    const r = rng(hue + 7); for (let i = 0; i < 70; i++) { g.globalAlpha = r() * 0.6; g.fillRect(-90 + r() * 180, -58 + r() * 116, 2 + r() * 6, 1 + r() * 2); }
  }));
}

function marqueeTex(text, hue, tool) {
  return tex(canvas2d(512, 128, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, tool ? '#ffcc00' : `hsl(${hue},90%,55%)`); grd.addColorStop(1, tool ? '#b88a00' : `hsl(${(hue + 40) % 360},90%,30%)`);
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    if (tool) for (let x = -60; x < w; x += 50) { g.fillStyle = '#111'; g.beginPath(); g.moveTo(x, h); g.lineTo(x + 24, h); g.lineTo(x + 54, h - 20); g.lineTo(x + 30, h - 20); g.fill(); }
    g.font = `900 ${text.length > 14 ? 46 : 60}px Impact, "Arial Black", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 10; g.strokeStyle = '#120600'; g.strokeText(text.toUpperCase(), w / 2, h / 2 - 4, w - 30);
    g.fillStyle = '#fff6e0'; g.fillText(text.toUpperCase(), w / 2, h / 2 - 4, w - 30);
  }));
}
function sideTex(hue, tool, seed) {
  return tex(canvas2d(64, 128, (g, w, h) => {
    g.fillStyle = tool ? '#2a2410' : `hsl(${hue},45%,16%)`; g.fillRect(0, 0, w, h);
    const r = rng(seed);
    for (let i = 0; i < 5; i++) { g.fillStyle = tool ? '#d9a400' : `hsl(${(hue + i * 30) % 360},85%,${45 + r() * 15}%)`; g.save(); g.translate(w / 2, 20 + i * 22); g.rotate(-0.5); g.fillRect(-60, 0, 120, 6 + r() * 6); g.restore(); }
    g.fillStyle = 'rgba(0,0,0,.35)'; for (let i = 0; i < 40; i++) g.fillRect(r() * w, r() * h, 2, r() * 6);
  }));
}

// ---------- room ----------
const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), new THREE.MeshLambertMaterial({ map: floorTex }));
floor.rotation.x = -Math.PI / 2;
scene.add(floor);
// Cabinets stand on an arc around the player, who stays in the middle: a small turn of the head reaches any machine.
const SLOT = 1.22; // arc length per cabinet (m)
const SOON_GAP = 0.9; // the coming-soon machine stands a little apart on the left
const TOOL_GAP = 0.6;
const units = [];
let u = SLOT + SOON_GAP;
ENTRIES.forEach((e, i) => { if (i && e.section === 'tools' && ENTRIES[i - 1].section !== 'tools') u += TOOL_GAP; units.push(u); u += SLOT; });
const arcLen = Math.max(0, u - SLOT);
const SOON_UNIT = 0;
// Every machine fits on one screen: the row spans about 86 degrees and the head turns at most ±7 degrees (14 total).
var ROW_SPAN = 1.5, HEAD_MAX = 0.12;
const RADIUS = Math.max(3.4, arcLen / ROW_SPAN);
const angles = units.map((v) => (v - arcLen / 2) / RADIUS);
const soonAngle = (SOON_UNIT - arcLen / 2) / RADIUS;
const aMax = Math.max(0.4, ...angles.map(Math.abs), Math.abs(soonAngle));
const onArc = (a, r, y = 0) => new THREE.Vector3(Math.sin(a) * r, y, -Math.cos(a) * r);
const wallGeo = new THREE.CylinderGeometry(RADIUS + 1.3, RADIUS + 1.3, 6, 48, 1, true, Math.PI - aMax - 0.9, 2 * (aMax + 0.9));
wallTex.repeat.set(Math.round((RADIUS + 1.3) * 2 * (aMax + 0.9) / 2.5), 1);
const wall = new THREE.Mesh(wallGeo, new THREE.MeshLambertMaterial({ map: wallTex, side: THREE.DoubleSide }));
wall.position.y = 3;
scene.add(wall);
const ceil = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), new THREE.MeshLambertMaterial({ color: '#0d0c0b' }));
ceil.rotation.x = Math.PI / 2; ceil.position.y = 3.6;
scene.add(ceil);
scene.add(new THREE.AmbientLight('#3a3226', 0.9));

// a few hanging lamps; one flickers
const lamps = [];
for (let la = -aMax; la <= aMax + 0.01; la += Math.max(0.5, (2 * aMax) / Math.max(1, Math.round(arcLen / 2.6)))) {
  const lp = onArc(la, RADIUS - 1.2), lt = onArc(la, RADIUS);
  const l = new THREE.SpotLight('#ffcf8a', 14, 9, 0.75, 0.6, 1.4);
  l.position.set(lp.x, 3.4, lp.z);
  l.target.position.set(lt.x, 0, lt.z);
  scene.add(l, l.target);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.25, 8, 1, true), new THREE.MeshBasicMaterial({ color: '#1a1a1a', side: THREE.DoubleSide }));
  shade.position.set(lp.x, 3.45, lp.z);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: '#fff0c8' }));
  bulb.position.set(lp.x, 3.33, lp.z);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.3), new THREE.MeshBasicMaterial({ color: '#000' }));
  cord.position.set(lp.x, 3.6, lp.z);
  scene.add(shade, bulb, cord);
  lamps.push({ l, bulb, base: 14 });
}
const flicker = lamps[Math.min(1, lamps.length - 1)];

// ---------- cabinets ----------
const loader = new THREE.TextureLoader();
const cabinets = [];
function cabinet(e, i, angle = angles[i]) {
  const tool = e.section === 'tools';
  const hue = hash(e.slug) % 360;
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: tool ? '#1d1a12' : new THREE.Color().setHSL(hue / 360, 0.35, 0.12) });
  const side = new THREE.MeshLambertMaterial({ map: sideTex(hue, tool, hash(e.slug)) });
  const box = (w, h, d, mat, px, py, pz, rx = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(px, py, pz); m.rotation.x = rx; g.add(m); return m; };
  for (const sx of [-0.43, 0.43]) box(0.06, 1.95, 0.85, side, sx, 0.975, 0);
  box(0.8, 1.95, 0.08, bodyMat, 0, 0.975, -0.39);
  box(0.8, 0.95, 0.06, bodyMat, 0, 0.475, 0.39);
  // coin door
  box(0.34, 0.36, 0.02, new THREE.MeshLambertMaterial({ color: '#2b2b2b' }), 0, 0.55, 0.43);
  for (const cx of [-0.07, 0.07]) {
    const slot = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.08), new THREE.MeshBasicMaterial({ color: e.ok ? '#ff3020' : '#3a0a06' }));
    slot.position.set(cx, 0.62, 0.441); g.add(slot);
  }
  // control deck
  const deck = box(0.8, 0.06, 0.38, new THREE.MeshLambertMaterial({ color: '#141414' }), 0, 1.0, 0.48, 0.25);
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.13), new THREE.MeshLambertMaterial({ color: '#888' }));
  stick.position.set(-0.2, 1.09, 0.48); g.add(stick);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshLambertMaterial({ color: tool ? '#ffcc00' : new THREE.Color().setHSL(hue / 360, 0.9, 0.5) }));
  ball.position.set(-0.2, 1.16, 0.48); g.add(ball);
  const btnCols = ['#ff3040', '#30a0ff', '#ffd030'];
  btnCols.forEach((c, k) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 10), new THREE.MeshBasicMaterial({ color: c })); b.position.set(0.05 + k * 0.1, 1.05, 0.48 - (k % 2) * 0.04); b.rotation.x = 0.25; g.add(b); });
  // screen bezel + screen
  box(0.8, 0.7, 0.06, new THREE.MeshLambertMaterial({ color: '#0a0a0a' }), 0, 1.42, 0.22, -0.2);
  const screenMat = new THREE.MeshBasicMaterial({ map: e.ok ? noiseTex : radarTex, color: '#ffffff' });
  if (e.shot && e.ok) loader.load(e.shot, (t) => { t.colorSpace = THREE.SRGBColorSpace; screenMat.map = t; screenMat.needsUpdate = true; });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.48), screenMat);
  screen.position.set(0, 1.42, 0.255); screen.rotation.x = -0.2;
  g.add(screen);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.48), new THREE.MeshBasicMaterial({ color: '#9fd8ff', transparent: true, opacity: 0.05 }));
  glass.position.set(0, 1.42, 0.262); glass.rotation.x = -0.2; g.add(glass);
  // marquee
  box(0.8, 0.26, 0.3, bodyMat, 0, 1.92, 0.05);
  const marqMat = new THREE.MeshBasicMaterial({ map: marqueeTex(e.name, hue, tool), color: e.ok ? '#d8d8d8' : '#4a4a4a' });
  const marq = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.2), marqMat);
  marq.position.set(0, 1.92, 0.205); g.add(marq);
  if (e.isNew && !tool) {
    const st = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.27), new THREE.MeshBasicMaterial({ map: stickerTex(hue), transparent: true }));
    st.position.set(0.17, 0.24, 0.424); st.rotation.z = -0.18; g.add(st);
  }
  // a little glow onto the floor
  const glow = new THREE.PointLight(tool ? '#ffcc33' : new THREE.Color().setHSL(hue / 360, 0.8, 0.6), e.ok ? 0.8 : 0.15, 2.2, 1.5);
  glow.position.set(0, 1.4, 0.7); g.add(glow);
  g.position.copy(onArc(angle, RADIUS));
  g.rotation.y = -angle + Math.sin(hash(e.slug)) * 0.04;
  scene.add(g);
  g.updateMatrixWorld(true);
  const hit = new THREE.Mesh(new THREE.BoxGeometry(0.95, 2.1, 1.1), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.set(0, 1.05, 0.1); g.add(hit);
  return { e, g, screen, marqMat, glow, hit, i, okColor: e.ok ? 0.8 : 0.15 };
}
ENTRIES.forEach((e, i) => cabinets.push(cabinet(e, i)));
// a machine for the next game: not playable yet, it takes TestFlight sign-ups
const soon = cabinet({ slug: 'coming-soon', name: 'Coming soon', section: 'soon', ok: true, isNew: false, shot: null, blurb: '', tag: '' }, -1, soonAngle);
soon.screen.material.map = tex(canvas2d(160, 120, (g, w, h) => {
  g.fillStyle = '#0a0f14'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#ffcc00'; g.lineWidth = 3; g.strokeRect(6, 6, w - 12, h - 12);
  g.textAlign = 'center'; g.fillStyle = '#ffcc00'; g.font = '900 26px Impact, sans-serif'; g.fillText('COMING', w / 2, 44); g.fillText('SOON', w / 2, 72);
  g.fillStyle = '#3dff6e'; g.font = 'bold 11px monospace'; g.fillText('PRESS TO JOIN', w / 2, 94); g.fillText('THE TESTFLIGHT', w / 2, 107);
}));
soon.screen.material.needsUpdate = true;
resize();
const noisy = cabinets.filter((c) => !c.e.shot && c.e.ok);
const anyOffline = cabinets.some((c) => !c.e.ok);
const props = createProps({ scene, onArc, radius: RADIUS, aMax });
// The girl: now and then she peeks out from between two machines for a moment. Stand still for 1 second and she
// steps out and walks toward you. Any input and she is gone.
const IDLE_MS = 1000;
let lastInput = performance.now();
const girlState = { mode: 'none', until: 0, nextPeek: performance.now() + 9000 + Math.random() * 12000, from: new THREE.Vector3() };
const poke = () => { lastInput = performance.now(); if (girlState.mode === 'walk') { props.ghost.hide(); girlState.mode = 'none'; } };
for (const ev of ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart']) addEventListener(ev, poke, { passive: true });
function gapAngle() {
  // a random gap between neighbouring machines, nudged so a cabinet hides half of her
  if (cabinets.length < 2) return { a: (angles[0] ?? 0) + 0.12, side: 1 };
  const i = Math.floor(Math.random() * (cabinets.length - 1));
  const side = Math.random() < 0.5 ? -1 : 1;
  return { a: (angles[i] + angles[i + 1]) / 2 + side * (0.14 / RADIUS), side };
}
function faceCamera(obj) { obj.rotation.set(0, Math.atan2(camera.position.x - obj.position.x, camera.position.z - obj.position.z), 0); }
function ghostTick(now, dt) {
  const g = props.ghost, busy = zoom || !computer.hidden || !peekEl.hidden || dlg.open;
  if (busy || !cabinets.length) { if (g.visible) g.hide(); girlState.mode = 'none'; return; }
  if (girlState.mode === 'peek' && now > girlState.until) { g.hide(); girlState.mode = 'none'; }
  if (girlState.mode === 'none' && now - lastInput > IDLE_MS) {
    const { a } = gapAngle();
    g.show(a, RADIUS + 0.15); faceCamera(g.obj);
    girlState.mode = 'walk';
  } else if (girlState.mode === 'none' && now > girlState.nextPeek) {
    const { a } = gapAngle();
    g.show(a, RADIUS + 0.1); faceCamera(g.obj);
    girlState.mode = 'peek'; girlState.until = now + 1100 + Math.random() * 900;
    girlState.nextPeek = now + 15000 + Math.random() * 20000;
  }
  if (girlState.mode === 'walk' && !reduceMotion) {
    const o = g.obj;
    const target = new THREE.Vector3(camera.position.x, 0, camera.position.z);
    const to = target.clone().sub(new THREE.Vector3(o.position.x, 0, o.position.z));
    const dist = to.length();
    if (dist > 1.4) {
      o.position.addScaledVector(to.normalize(), Math.min(dist - 1.4, 0.6 * dt));
      o.position.y = Math.abs(Math.sin(now / 260)) * 0.035; // stiff little steps
      o.rotation.z = Math.sin(now / 520) * 0.05;
    } else { o.position.y = 0; o.rotation.z = 0; }
    faceCamera(o); o.rotation.z = dist > 1.4 ? Math.sin(now / 520) * 0.05 : 0;
  }
}

// ---------- selection / HUD ----------
const params = new URLSearchParams(location.search);
let sel = 0;
const ago = (t) => {
  if (!t) return 'never played';
  const m = Math.round((Date.now() - t) / 60000);
  return m < 1 ? 'played just now' : m < 60 ? `played ${m} min ago` : m < 1440 ? `played ${Math.round(m / 60)} h ago` : `played ${Math.round(m / 1440)} d ago`;
};
const escText = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
function select(i) {
  if (!cabinets.length) { selEl.innerHTML = '<div class="nm">No machines</div>'; return; }
  sel = (i + cabinets.length) % cabinets.length;
  const e = cabinets[sel].e;
  selEl.innerHTML = `<div class="nm">${escText(e.name)}</div>
    <div class="meta">${e.section === 'tools' ? 'TOOL' : 'GAME'} ${sel + 1}/${cabinets.length}${e.port ? ` · :${e.port}` : ''} · <span class="${e.ok ? '' : 'bad'}">${escText(e.status)}</span> · ${ago(e.lastOpened)}</div>
    <div class="bl">${escText(e.blurb)}${!e.ok && e.start ? ` Start it with ${escText(e.start)}` : ''}</div>`;
}
select(0);

// ---------- camera ----------
const EYE = new THREE.Vector3(0, 1.6, 0.9);
const HEAD_TURN = aMax > 0 ? HEAD_MAX / aMax : 0; // arrows turn the head only a little; the wide view covers the rest
const lookFor = (i, extra = 0) => onArc((angles[i] ?? 0) * HEAD_TURN + extra, RADIUS, 1.35);
const camPos = EYE.clone();
const camLook = lookFor(0);
// head turning is a slightly under-damped spring on the yaw angle: quick, with a soft settle
const head = { yaw: (angles[0] ?? 0) * HEAD_TURN, v: 0, pitch: 0, pv: 0 };
const SPRING = 70, DAMP = 2 * Math.sqrt(SPRING) * 0.85;
camera.position.copy(camPos);
let zoom = null; // { from, to, lookFrom, lookTo, t0, path }
const mouse = new THREE.Vector2(0, 0);
let hover = -1;

function launch(i) {
  if (zoom) return;
  const c = cabinets[i];
  select(i);
  const center = new THREE.Vector3(); c.screen.getWorldPosition(center);
  const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(c.screen.getWorldQuaternion(new THREE.Quaternion()));
  if (!c.e.ok) {
    // offline: step up to the machine and look at its radar; you stay in the arcade
    zoom = { peek: c, from: camera.position.clone(), to: center.clone().addScaledVector(normal, 1.25).setY(1.55), lookFrom: camLook.clone(), lookTo: center, t0: performance.now(), dur: reduceMotion ? 1 : 700, done: false };
    return;
  }
  if (reduceMotion) { location.assign(c.e.path); return; }
  zoom = { from: camera.position.clone(), to: center.clone().addScaledVector(normal, 0.36), lookFrom: camLook.clone(), lookTo: center, t0: performance.now(), dur: 1300, path: c.e.path, done: false };
}
// ---------- offline machine: a close look at its monitor, overlaid on the arcade ----------
const peekEl = document.getElementById('peek');
const peekCanvas = document.getElementById('peekRadar');
let peekRaf = 0;
function openPeek(c) {
  document.getElementById('peekTitle').textContent = c.e.name;
  document.getElementById('peekBody').textContent = `${c.e.name} is offline. ${c.e.status === 'not built' ? 'Its build is missing.' : 'Its server is not running.'}${c.e.start ? ` To revive: ${c.e.start}` : ''}`;
  peekEl.hidden = false;
  document.getElementById('peekClose').focus();
  const g = peekCanvas.getContext('2d');
  const crew = [[0.3, 0.38], [0.66, 0.34], [0.48, 0.62], [0.72, 0.66]];
  const draw = (t) => {
    const w = peekCanvas.width, h = peekCanvas.height;
    g.fillStyle = '#020a04'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(61,255,110,.15)'; g.lineWidth = 1;
    for (let x = 0; x < w; x += 20) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let y = 0; y < h; y += 20) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.strokeStyle = 'rgba(61,255,110,.6)'; g.lineWidth = 2; g.strokeRect(w * 0.22, h * 0.28, w * 0.56, h * 0.48); g.strokeRect(w * 0.42, h * 0.16, w * 0.16, h * 0.12); g.strokeRect(w * 0.28, h * 0.48, w * 0.14, h * 0.18);
    g.save(); g.translate(w / 2, h / 2); g.rotate(reduceMotion ? 0 : t / 900);
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(61,255,110,.35)'); gr.addColorStop(1, 'rgba(61,255,110,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, w, -0.25, 0); g.fill(); g.restore();
    g.font = 'bold 12px "Courier New", monospace'; g.textAlign = 'center';
    crew.forEach(([cx, cy], i) => {
      const x = cx * w, y = cy * h;
      g.strokeStyle = '#ff3b2f'; g.lineWidth = 3; g.beginPath(); g.moveTo(x - 6, y - 6); g.lineTo(x + 6, y + 6); g.moveTo(x + 6, y - 6); g.lineTo(x - 6, y + 6); g.stroke();
      g.fillStyle = '#ff3b2f'; g.fillText(`EMPLOYEE #${i + 1}`, x, y - 12); g.fillText('DECEASED', x, y + 20);
    });
    if (!peekEl.hidden && !reduceMotion) peekRaf = requestAnimationFrame(draw);
  };
  draw(0);
}
function closePeek() {
  cancelAnimationFrame(peekRaf);
  peekEl.hidden = true;
  if (zoom?.peek) {
    camPos.copy(camera.position);
    head.yaw = Math.atan2(zoom.lookTo.x, -zoom.lookTo.z); head.v = 0;
    zoom = null;
  }
}
document.getElementById('peekClose').addEventListener('click', closePeek);
peekEl.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' || ev.key === 'Tab') { ev.preventDefault(); closePeek(); } });

addEventListener('pageshow', (ev) => {
  if (ev.persisted) { zoom = null; fade.classList.remove('on'); }
});

const ray = new THREE.Raycaster();
function pick(ev) {
  const r = canvas.getBoundingClientRect();
  mouse.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(mouse, camera);
  const hits = ray.intersectObjects([...cabinets.map((c) => c.hit), soon.hit, ...props.items.map((p) => p.hit)]);
  hoverProp = null; hoverSoon = hits[0]?.object === soon.hit;
  if (!hits.length || hoverSoon) return -1;
  const prop = props.items.find((p) => p.hit === hits[0].object);
  if (prop) { hoverProp = prop; return -1; }
  return cabinets.find((c) => c.hit === hits[0].object).i;
}
let hoverProp = null, hoverSoon = false;
const scanEl = document.getElementById('scan');
const tipEl = document.getElementById('tip');
const salaryEl = document.getElementById('salary');
const showSalary = () => (salaryEl.textContent = `$${salary.get()}`);
showSalary();
function showScan(ev) {
  const p = hoverProp && (!p?.obj || p.obj.visible) ? hoverProp : null;
  if (!p) { scanEl.hidden = true; return; }
  const i = p.info();
  scanEl.hidden = false;
  scanEl.className = i.scrap ? 'scrap' : '';
  scanEl.innerHTML = `<b>${escText(i.title)}</b><span>${escText(i.line)}</span>`;
  scanEl.style.transform = `translate(${ev.clientX + 18}px, ${ev.clientY - 10}px)`;
}
function tip(title, body) {
  tipEl.innerHTML = `<b>${escText(title)}</b><span>${escText(body)}</span>`;
  tipEl.hidden = false;
  tipEl.classList.remove('show'); void tipEl.offsetWidth; tipEl.classList.add('show');
  clearTimeout(tip.h); tip.h = setTimeout(() => (tipEl.hidden = true), 4200);
}
function floatText(text, x, y) {
  const d = document.createElement('div');
  d.className = 'float'; d.textContent = text; d.style.left = `${x}px`; d.style.top = `${y}px`;
  document.body.append(d); setTimeout(() => d.remove(), 1300);
}
function useProp(p, ev) {
  const r = p.click(performance.now());
  if (!r) return;
  if (r.earned) { salary.add(r.earned); showSalary(); floatText(`+$${r.earned}`, ev.clientX, ev.clientY); salaryEl.classList.remove('bump'); void salaryEl.offsetWidth; salaryEl.classList.add('bump'); }
  tip(r.title, r.body);
}
let drag = null;
canvas.addEventListener('pointermove', (ev) => {
  if (drag && Math.abs(ev.clientX - drag.x) > 40) { select(sel + (ev.clientX < drag.x ? 1 : -1)); drag.x = ev.clientX; drag.moved = true; return; }
  hover = pick(ev);
  showScan(ev);
  canvas.style.cursor = hover >= 0 || hoverProp || (hoverSoon && SITE.signup) ? 'pointer' : 'default';
});
canvas.addEventListener('pointerdown', (ev) => { drag = { x: ev.clientX, moved: false }; });
canvas.addEventListener('pointerup', (ev) => {
  if (zoom?.peek) { if (zoom.done) closePeek(); return; }
  const moved = drag?.moved; drag = null;
  if (moved) return;
  const i = pick(ev);
  if (hoverProp) { useProp(hoverProp, ev); showScan(ev); return; }
  if (hoverSoon) { openSignup('coming-soon'); return; }
  if (i >= 0) launch(i);
});
canvas.addEventListener('wheel', (ev) => { ev.preventDefault(); if (Math.abs(ev.deltaY) + Math.abs(ev.deltaX) > 20) select(sel + Math.sign(ev.deltaY || ev.deltaX)); }, { passive: false });

const term = document.getElementById('term');
const listBtn = document.getElementById('listBtn');
function toggleList(open = term.hidden) {
  term.hidden = !open;
  listBtn.setAttribute('aria-expanded', String(open));
  if (open) term.querySelector('a')?.focus();
}
listBtn.addEventListener('click', () => openComputer());
addEventListener('keydown', (ev) => {
  if (zoom || dlg.open || !computer.hidden || ev.target.closest?.('input, select, textarea')) return;
  if (ev.key === 't' || ev.key === 'T') { ev.preventDefault(); openComputer(); return; }
  if (ev.key === 's' || ev.key === 'S') { openSignup(); return; }
  if (ev.key === 'l' || ev.key === 'L') { toggleList(); return; }
  if (!term.hidden) { if (ev.key === 'Escape') { toggleList(false); listBtn.focus(); } return; }
  if (ev.key === 'ArrowRight' || ev.key === 'd') select(sel + 1);
  else if (ev.key === 'ArrowLeft' || ev.key === 'a') select(sel - 1);
  else if (ev.key === 'Home') select(0);
  else if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); launch(sel); }
});

// ---------- crisp name plates over each marquee (the low-res 3D text alone is hard to read) ----------
const labelBox = document.getElementById('labels');
const labels = cabinets.map((c) => {
  const d = document.createElement('div');
  d.className = `plate${c.e.section === 'tools' ? ' tool' : ''}${c.e.ok ? '' : ' off'}`;
  d.textContent = c.e.name;
  d.style.setProperty('--hue', String(hash(c.e.slug) % 360));
  labelBox.append(d);
  return d;
});
const soonLabel = document.createElement('div');
soonLabel.className = 'plate soon'; soonLabel.textContent = SITE.signup ? 'Coming soon · sign up' : 'Coming soon';
labelBox.append(soonLabel);
const tmpV = new THREE.Vector3();
// The girl is drawn in 3D but the plates are HTML on top; when she is nearer than a machine and overlaps its plate,
// hide that plate so her head reads in front of it.
function girlRect() {
  const o = props.ghost.obj;
  if (!props.ghost.visible) return null;
  o.updateMatrixWorld();
  const pts = [[0, 1.85, 0], [0, 0, 0], [-0.7, 1.2, 0], [0.7, 1.2, 0]].map(([x, y, z]) => o.localToWorld(new THREE.Vector3(x, y, z)).project(camera));
  const xs = pts.map((p) => (p.x * 0.5 + 0.5) * innerWidth), ys = pts.map((p) => (-p.y * 0.5 + 0.5) * innerHeight);
  return { l: Math.min(...xs) - 30, r: Math.max(...xs) + 30, t: Math.min(...ys) - 50, b: Math.max(...ys), d: o.position.distanceTo(camera.position) };
}
function placePlate(el, obj, i, girl) {
  obj.localToWorld(tmpV.set(0, 2.3, 0.2));
  const dist = tmpV.distanceTo(camera.position);
  tmpV.project(camera);
  if (zoom || tmpV.z > 1 || Math.abs(tmpV.x) > 1.2) { el.style.display = 'none'; return; }
  el.style.display = '';
  const px = (tmpV.x * 0.5 + 0.5) * innerWidth, py = (-tmpV.y * 0.5 + 0.5) * innerHeight;
  const scale = Math.max(0.72, Math.min(1, 6 / dist));
  el.style.transform = `translate(-50%, -100%) translate(${px.toFixed(1)}px, ${py.toFixed(1)}px) scale(${scale.toFixed(3)})`;
  el.classList.toggle('low', i % 2 === 1); // stagger neighbouring plates so they never overlap
  const behindGirl = girl && girl.d < dist && px > girl.l && px < girl.r && py > girl.t && py - 40 < girl.b;
  el.style.opacity = behindGirl ? '0' : '';
}
function placeLabels() {
  camera.updateMatrixWorld();
  const girl = girlRect();
  placePlate(soonLabel, soon.g, 1, girl);
  soonLabel.classList.toggle('sel', hoverSoon);
  cabinets.forEach((c, i) => {
    placePlate(labels[i], c.g, i, girl);
    labels[i].classList.toggle('sel', i === sel || i === hover);
  });
}

// ---------- loop ----------
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
let last = performance.now();
let noiseT = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (zoom) {
    const t = Math.min(1, (now - zoom.t0) / zoom.dur);
    const k = ease(t);
    camera.position.lerpVectors(zoom.from, zoom.to, k);
    camLook.lerpVectors(zoom.lookFrom, zoom.lookTo, k);
    camera.lookAt(camLook);
    if (zoom.peek) { if (t >= 1 && !zoom.done) { zoom.done = true; openPeek(zoom.peek); } }
    else {
      if (t > 0.78) fade.classList.add('on');
      if (t >= 1 && !zoom.done) { zoom.done = true; setTimeout(() => location.assign(zoom.path), 200); }
    }
  } else if (cabinets.length) {
    camPos.lerp(new THREE.Vector3(EYE.x + mouse.x * 0.12, EYE.y + mouse.y * 0.06, EYE.z), Math.min(1, dt * 5));
    const edge = Math.sign(mouse.x) * Math.max(0, Math.abs(mouse.x) - 0.8) * 2.5; // only the far screen edge glances at the bunks or the TV
    const yawT = (angles[sel] ?? 0) * HEAD_TURN + mouse.x * 0.05 + edge * 0.5;
    if (reduceMotion) { head.yaw += (yawT - head.yaw) * Math.min(1, dt * 12); head.v = 0; head.pitch = mouse.y * 0.3; }
    else {
      head.v += ((yawT - head.yaw) * SPRING - head.v * DAMP) * dt; head.yaw += head.v * dt;
      head.pv += ((mouse.y * 0.3 - head.pitch) * SPRING - head.pv * DAMP) * dt; head.pitch += head.pv * dt;
    }
    camLook.copy(onArc(head.yaw, RADIUS, 1.05 + head.pitch));
    camera.position.copy(camPos);
    if (!reduceMotion) camera.position.y += Math.sin(now / 900) * 0.008 + Math.abs(head.v) * 0.004; // breathing, slight bob when turning
    camera.lookAt(camLook);
    if (!reduceMotion) camera.rotateZ(THREE.MathUtils.clamp(-head.v * 0.025, -0.05, 0.05)); // lean into the turn
  }
  cabinets.forEach((c, i) => {
    const on = i === sel || i === hover;
    c.marqMat.color.setScalar(c.e.ok ? (on ? 1 : 0.75) : on ? 0.5 : 0.3);
    c.glow.intensity = c.okColor * (on ? 2 : 1);
  });
  if (!reduceMotion) {
    const f = Math.random() < 0.04 ? 0.15 : Math.random() < 0.02 ? 0.5 : 1;
    flicker.l.intensity = flicker.base * f;
    flicker.bulb.material.color.setScalar(f);
    noiseT += dt;
    if (noiseT > 0.08) { noiseT = 0; if (noisy.length) drawNoise('NO SIGNAL'); if (anyOffline) drawRadar(now / 1000); }
  }
  props.update(dt, now / 1000, now);
  ghostTick(now, dt);
  placeLabels();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
if (params.has('debug')) window.__hub = { cabinets, camera, props, mouse, select, launch, render: () => { renderer.render(scene, camera); return canvas.toDataURL('image/jpeg', 0.7); }, step: (n = 60) => { for (let k = 0; k < n; k++) frame(last + 16.7); return canvas.toDataURL('image/jpeg', 0.7); } };

// ---------- TestFlight sign-up (stored server-side in Azure Table Storage) ----------
const dlg = document.getElementById('signup');
const form = document.getElementById('signupForm');
const msg = document.getElementById('sfMsg');
let signupSource = 'arcade';
function openSignup(source = 'arcade') { if (!SITE.signup) return; signupSource = typeof source === 'string' ? source : 'arcade'; msg.textContent = ''; msg.className = ''; dlg.showModal(); document.getElementById('sfEmail').focus(); }
document.getElementById('signupBtn').addEventListener('click', openSignup);
document.getElementById('sfClose').addEventListener('click', () => dlg.close());
form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const fd = new FormData(form);
  const email = String(fd.get('email') ?? '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg.className = 'bad'; msg.textContent = 'Please enter a valid email address.'; return; }
  msg.className = ''; msg.textContent = 'Signing you up…';
  try {
    const res = await fetch(SITE.signup, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, consent: true, website: fd.get('website') ?? '', source: signupSource }) });
    const out = await res.json();
    if (!out.ok) { msg.className = 'bad'; msg.textContent = out.error ?? 'Could not sign you up. Please try again.'; return; }
    form.reset();
    dlg.close();
    tip("You're on the list", "We'll email you about new games and TestFlight betas.");
  } catch {
    msg.className = 'bad'; msg.textContent = 'No connection. Please try again.';
  }
});
if (params.has('debug') && params.has('look')) { const lk = Number(params.get('look')); mouse.x = lk; select(lk > 0 ? cabinets.length - 1 : 0); }

// ---------- ship terminal: type a game name to route the autopilot there ----------
const computer = document.getElementById('computer');
const tOut = document.getElementById('tOut');
const tIn = document.getElementById('tIn');
const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i').toLowerCase().replace(/[^a-z0-9]/g, '');
let pending = null;
function catalogue() {
  const line = (c) => `* ${c.e.name}${c.e.ok ? (c.e.isNew ? ' (New)' : '') : ' (Offline)'}`;
  const games = cabinets.filter((c) => c.e.section === 'games'), tools = cabinets.filter((c) => c.e.section === 'tools');
  return `Welcome to the arcade catalogue.
To route the autopilot to a game, use the word ROUTE.
To learn about any game, use the word INFO.
____________________________

* The Company building   //   Buying at 30%.

${games.map(line).join('\n')}
${tools.length ? `\n${tools.map(line).join('\n')}\n` : ''}
`;
}
const HELP = `>HELP
To see the list of games, type CATALOGUE.
ROUTE [game]  : fly the autopilot to a game.
INFO [game]   : learn about a game.
SIGNUP        : join the TestFlight crew.
LIST          : plain list of links.
QUIT          : leave the terminal. [TAB]
`;
const NOPE = `\nThere was no object supplied with the action, or your word was typed incorrectly or does not exist.\n`;
function find(q) {
  const n = norm(q);
  if (n.length < 2) return null;
  return cabinets.find((c) => norm(c.e.name) === n || norm(c.e.slug) === n)
    ?? cabinets.find((c) => norm(c.e.name).startsWith(n) || norm(c.e.slug).startsWith(n))
    ?? (n.length >= 3 ? cabinets.find((c) => norm(c.e.name).includes(n)) : null);
}
function print(text) { tOut.textContent = text; tOut.scrollTop = 0; }
function openComputer() {
  computer.hidden = false; pending = null;
  document.getElementById('tCredits').textContent = String(salary.get());
  print(catalogue()); tIn.value = ''; tIn.focus();
}
function closeComputer() { computer.hidden = true; listBtn.focus(); }
function routeTo(c) {
  pending = c;
  print(`The cost to route to ${c.e.name} is $0. It is currently ${c.e.ok ? c.e.status : 'OFFLINE: all crew deceased'}.

Please CONFIRM or DENY.
`);
}
function run(raw) {
  const cmd = raw.trim();
  if (!cmd) return;
  const [w, ...rest] = cmd.split(/\s+/);
  const word = w.toLowerCase(), arg = rest.join(' ');
  if (pending) {
    const c = pending; pending = null;
    if ('confirm'.startsWith(word) && word.length >= 1) {
      print(`Routing autopilot to ${c.e.name}.\nYour new balance is $${salary.get()}.\n\nPlease enjoy your flight.\n`);
      setTimeout(() => { computer.hidden = true; launch(c.i); }, 900);
      return;
    }
    print(catalogue()); return;
  }
  if (['quit', 'exit', 'q'].includes(word)) return closeComputer();
  if (['help', '?'].includes(word)) return print(HELP);
  if (['catalogue', 'catalog', 'moons', 'games', 'clear'].includes(word)) return print(catalogue());
  if (word === 'signup' || word === 'sign') { closeComputer(); return openSignup(); }
  if (word === 'list') { computer.hidden = true; return toggleList(true); }
  if (word === 'company') return print(`>COMPANY\nThe Company is buying your fun at 30%.\nThere is nothing to sell here. Yet.\n`);
  if (word === 'route' || word === 'go' || word === 'play') {
    if (!arg) return print(`\n[There was no action supplied with the word.]\n`);
    const c = find(arg); return c ? routeTo(c) : print(NOPE);
  }
  if (word === 'info') {
    if (!arg) return print(`\n[There was no action supplied with the word.]\n`);
    const c = find(arg);
    if (!c) return print(NOPE);
    return print(`>${c.e.name.toUpperCase()}
${c.e.blurb}

TYPE: ${c.e.tag}${c.e.port ? `\nPORT: ${c.e.port}` : ''}
STATUS: ${c.e.ok ? c.e.status : 'OFFLINE. Crew status: DECEASED.'}${!c.e.ok && c.e.start ? `\nTO REVIVE: ${c.e.start}` : ''}
LAST VISITED: ${ago(c.e.lastOpened)}
`);
  }
  const c = find(cmd);
  return c ? routeTo(c) : print(NOPE);
}
document.getElementById('tForm').addEventListener('submit', (ev) => { ev.preventDefault(); run(tIn.value); tIn.value = ''; });
computer.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape') { ev.preventDefault(); closeComputer(); return; }
});
// clicking outside the monitor leaves the terminal; clicking on it keeps typing
// Closing an overlay by clicking outside it must not also click whatever is behind it (a machine, a toy):
// stop this press and swallow the rest of the same gesture (pointerup, click) before anything else sees it.
let swallowUntil = 0;
function dismissOutside(ev, close) {
  ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
  swallowUntil = performance.now() + 600;
  close();
}
for (const type of ['pointerup', 'click', 'mouseup', 'touchend']) {
  addEventListener(type, (ev) => {
    if (performance.now() < swallowUntil) { ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); if (type === 'click' || type === 'pointerup') swallowUntil = type === 'click' ? 0 : swallowUntil; }
  }, { capture: true, passive: false });
}
computer.addEventListener('pointerdown', (ev) => { if (!ev.target.closest('.monitor')) dismissOutside(ev, closeComputer); else tIn.focus(); });
peekEl.addEventListener('pointerdown', (ev) => { if (!ev.target.closest('.monitor')) dismissOutside(ev, closePeek); });
// the sign-up dialog closes on a backdrop press the same way
dlg.addEventListener('pointerdown', (ev) => { if (ev.target === dlg) { const r = dlg.getBoundingClientRect(); if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) dismissOutside(ev, () => dlg.close()); } });
if (params.has('debug') && params.has('term')) { openComputer(); if (params.get('term')) run(params.get('term')); }
if (params.has('debug') && params.has('ghost')) { lastInput = -1e9; }
if (params.has('debug')) Object.assign(window.__hub ?? {}, { girlState });
if (params.has('debug') && params.has('peek')) { const c = cabinets.find((x) => !x.e.ok); if (c) launch(c.i); }
