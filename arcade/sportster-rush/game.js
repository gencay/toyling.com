import * as THREE from 'three';
import * as L from './logic.js';

const $ = (id) => document.getElementById(id);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color('#8fd3ff');
scene.fog = new THREE.Fog('#bfe6ff', 120, 520);
const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 1200);
scene.add(new THREE.HemisphereLight('#ffffff', '#5d8a3a', 1.6));
const sun = new THREE.DirectionalLight('#fff6e0', 2.2);
sun.position.set(40, 80, 20);
scene.add(sun);
function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

const gradient = new THREE.DataTexture(new Uint8Array([90, 90, 90, 255, 170, 170, 170, 255, 255, 255, 255, 255]), 3, 1);
gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
gradient.needsUpdate = true;
const toon = (color, flat = false) => flat
  ? new THREE.MeshPhongMaterial({ color, flatShading: true, shininess: 0 })
  : new THREE.MeshToonMaterial({ color, gradientMap: gradient });

// ---------- track ----------
const ctrl = [];
for (let i = 0; i <= 44; i++) ctrl.push(new THREE.Vector3(Math.sin(i * 0.55) * 70 + Math.sin(i * 0.21) * 160, 0, i * 140));
const curve = new THREE.CatmullRomCurve3(ctrl);
const TRACK_LEN = curve.getLength();
const RACE_LEN = Math.floor(TRACK_LEN - 80);
const N = 3000;
const pts = curve.getSpacedPoints(N);
const UP = new THREE.Vector3(0, 1, 0);
function frame(s) {
  const f = Math.max(0, Math.min(N - 1.001, (s / TRACK_LEN) * N));
  const i = Math.floor(f);
  const pos = pts[i].clone().lerp(pts[i + 1], f - i);
  const tan = pts[Math.min(N, i + 1)].clone().sub(pts[Math.max(0, i - 1)]).normalize();
  const lat = new THREE.Vector3().crossVectors(UP, tan).normalize(); // points to the rider's left
  return { pos, tan, lat };
}
const ROAD_W = 16;
const HALF = ROAD_W / 2;

function roadTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#55565c'; g.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.06})`; g.fillRect(Math.random() * 128, Math.random() * 256, 2, 2); }
  g.fillStyle = '#f4f1e8'; g.fillRect(4, 0, 5, 256); g.fillRect(119, 0, 5, 256);
  g.fillStyle = '#ffd23f'; g.fillRect(61, 0, 6, 140);
  g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(31, 0, 3, 90); g.fillRect(94, 0, 3, 90);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
{
  const pos = [], uv = [], idx = [];
  const step = TRACK_LEN / N;
  for (let i = 0; i <= N; i++) {
    const { pos: p, lat } = frame(i * step);
    for (const side of [1, -1]) {
      const v = p.clone().addScaledVector(lat, side * HALF);
      pos.push(v.x, 0.01, v.z);
      uv.push(side > 0 ? 0 : 1, (i * step) / 24);
    }
    if (i < N) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  scene.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: roadTexture(), side: THREE.DoubleSide })));
}
const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 9000), toon('#7cc95a'));
ground.rotation.x = -Math.PI / 2;
ground.position.set(0, -0.02, 3000);
scene.add(ground);

// Pacific Northwest scenery like the photo: tall evergreens, cedar fences, a few houses.
{
  const rnd = mulberry(7);
  const far = (p) => { for (let i = 0; i <= N; i += 15) if (pts[i].distanceToSquared(p) < 16 * 16) return false; return true; };
  const trees = [];
  for (let s = 0; s < TRACK_LEN; s += 9) {
    const { pos, lat } = frame(s);
    for (const side of [1, -1]) {
      if (rnd() < 0.45) continue;
      const p = pos.clone().addScaledVector(lat, side * (HALF + 6 + rnd() * 60));
      if (far(p)) trees.push({ p, h: 10 + rnd() * 22 });
    }
  }
  const coneG = new THREE.ConeGeometry(1, 1, 7);
  const trunkG = new THREE.CylinderGeometry(0.25, 0.35, 1, 6);
  const cones = new THREE.InstancedMesh(coneG, toon('#2f6b3a', true), trees.length);
  const trunks = new THREE.InstancedMesh(trunkG, toon('#6b4a2f'), trees.length);
  const m = new THREE.Matrix4();
  trees.forEach((t, i) => {
    m.compose(new THREE.Vector3(t.p.x, t.h * 0.3 + t.h * 0.35, t.p.z), new THREE.Quaternion(), new THREE.Vector3(t.h * 0.18, t.h * 0.7, t.h * 0.18));
    cones.setMatrixAt(i, m);
    m.compose(new THREE.Vector3(t.p.x, t.h * 0.15, t.p.z), new THREE.Quaternion(), new THREE.Vector3(1, t.h * 0.3, 1));
    trunks.setMatrixAt(i, m);
  });
  scene.add(cones, trunks);
  const fences = [];
  for (let s = 0; s < 600; s += 4) fences.push(s);
  const fence = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 1.8, 4), toon('#4a3a30'), fences.length * 2);
  let k = 0;
  for (const s of fences) for (const side of [1, -1]) {
    const { pos, tan, lat } = frame(s);
    const p = pos.clone().addScaledVector(lat, side * (HALF + 3));
    m.lookAt(new THREE.Vector3(), tan, UP);
    m.setPosition(p.x, 0.9, p.z);
    fence.setMatrixAt(k++, m);
  }
  scene.add(fence);
  for (let i = 0; i < 26; i++) {
    const s = 60 + i * (TRACK_LEN / 26);
    const side = i % 2 ? 1 : -1;
    const { pos, lat } = frame(s);
    const p = pos.clone().addScaledVector(lat, side * (HALF + 16));
    if (!far(p)) continue;
    const house = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(10, 6, 9), toon(['#c9c2b3', '#a89884', '#d8cdb5'][i % 3]));
    body.position.y = 3;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(8, 3.5, 4), toon('#4b4f58', true));
    roof.position.y = 7.7; roof.rotation.y = Math.PI / 4;
    house.add(body, roof);
    house.position.copy(p);
    scene.add(house);
  }
  // finish arch
  const { pos, tan } = frame(RACE_LEN);
  const arch = new THREE.Group();
  const postG = new THREE.BoxGeometry(0.8, 8, 0.8);
  for (const x of [-HALF - 1, HALF + 1]) { const p = new THREE.Mesh(postG, toon('#1d1d2b')); p.position.set(x, 4, 0); arch.add(p); }
  const banner = new THREE.Mesh(new THREE.BoxGeometry(ROAD_W + 3, 2, 0.4), new THREE.MeshBasicMaterial({ map: textTexture('FINISH  ·  LIMBO EXIT', '#fff', '#1d1d2b', 1024, 128) }));
  banner.position.y = 8;
  arch.add(banner);
  arch.position.copy(pos);
  arch.lookAt(pos.clone().add(tan));
  scene.add(arch);
  const check = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_W, 2), new THREE.MeshBasicMaterial({ map: checker() }));
  check.rotation.x = -Math.PI / 2;
  const holder = new THREE.Group(); holder.add(check); holder.position.copy(pos); holder.position.y = 0.03; holder.lookAt(pos.clone().add(tan)); holder.position.y = 0.03;
  scene.add(holder);
}

function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function textTexture(text, fg, bg, w = 512, h = 128) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  if (bg) { g.fillStyle = bg; g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, 28); g.fill(); }
  g.fillStyle = fg; g.font = `900 ${Math.floor(h * 0.48)}px system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + 2, w - 24);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function checker() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 32;
  const g = c.getContext('2d');
  for (let x = 0; x < 16; x++) for (let y = 0; y < 2; y++) { g.fillStyle = (x + y) % 2 ? '#111' : '#fff'; g.fillRect(x * 16, y * 16, 16, 16); }
  return new THREE.CanvasTexture(c);
}

// ---------- bikes ----------
// Cartoon proportions: everything a bit chunky. Local +Z is forward.
const logoCache = new Map();
function logoTexture(mark) {
  if (logoCache.has(mark)) return logoCache.get(mark);
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const badge = (bg) => { g.fillStyle = bg; g.beginPath(); g.arc(64, 64, 60, 0, Math.PI * 2); g.fill(); g.lineWidth = 6; g.strokeStyle = '#ffffff'; g.stroke(); };
  const txt = (t, col, size, font = '900 {s}px system-ui, sans-serif', y = 66) => { g.fillStyle = col; g.font = font.replace('{s}', size); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, 64, y); };
  const line = (w, col, pts) => { g.lineWidth = w; g.strokeStyle = col; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); };
  switch (mark) {
    case 'anthropic': badge('#f0eee6'); txt('A\\', '#191919', 64, '700 {s}px Georgia, serif'); break;
    case 'openai': badge('#000'); g.translate(64, 64);
      for (let i = 0; i < 6; i++) { g.rotate(Math.PI / 3); g.strokeStyle = '#fff'; g.lineWidth = 8; g.beginPath(); g.ellipse(0, -16, 12, 26, 0, 0, Math.PI * 2); g.stroke(); }
      g.setTransform(1, 0, 0, 1, 0, 0); break;
    case 'google': badge('#fff'); g.lineWidth = 16;
      [['#ea4335', -2.6, -0.9], ['#fbbc05', 2.4, 3.6], ['#34a853', 0.9, 2.4], ['#4285f4', -0.9, 0.2]].forEach(([col, a0, a1]) => { g.strokeStyle = col; g.beginPath(); g.arc(64, 64, 34, a0, a1); g.stroke(); });
      g.fillStyle = '#4285f4'; g.fillRect(64, 56, 34, 15); break;
    case 'meta': badge('#fff'); g.lineWidth = 12; g.strokeStyle = '#0866ff'; g.beginPath();
      for (let t = 0; t <= Math.PI * 2 + 0.05; t += 0.05) { const d = 1 + Math.sin(t) ** 2; const x = 64 + (38 * Math.cos(t)) / d, y = 64 + (34 * Math.sin(t) * Math.cos(t)) / d; t ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke(); break;
    case 'deepseek': badge('#fff'); g.fillStyle = '#4d6bfe'; g.beginPath(); g.ellipse(58, 70, 34, 20, -0.2, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.moveTo(88, 60); g.lineTo(108, 40); g.lineTo(104, 66); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(40, 64, 4, 0, 7); g.fill(); break;
    case 'nvidia': badge('#76b900'); g.fillStyle = '#fff'; g.beginPath(); g.ellipse(64, 64, 40, 26, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#76b900'; g.beginPath(); g.ellipse(70, 64, 22, 15, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(74, 64, 7, 0, 7); g.fill(); break;
    case 'xai': badge('#000'); line(12, '#fff', [[38, 36], [90, 92]]); line(12, '#fff', [[90, 36], [38, 92]]); break;
    case 'xiaomi': g.fillStyle = '#ff6900'; g.beginPath(); g.roundRect(8, 8, 112, 112, 34); g.fill(); txt('mi', '#fff', 62); break;
    case 'alibaba': badge('#ff6a00'); txt('a', '#fff', 70, '900 {s}px system-ui, sans-serif', 58); line(7, '#fff', [[36, 86], [64, 98], [92, 86]]); break;
    case 'kimi': badge('#000'); txt('K', '#fff', 70); g.fillStyle = '#1783ff'; g.beginPath(); g.arc(94, 38, 9, 0, 7); g.fill(); break;
    case 'zai': badge('#fff'); g.fillStyle = '#111'; g.fillRect(32, 32, 64, 64); txt('Z', '#fff', 56); break;
    case 'minimax': badge('#fff'); [30, 52, 40, 64, 36].forEach((h, i) => { g.fillStyle = '#e8365d'; g.beginPath(); g.roundRect(28 + i * 16, 64 - h / 2, 9, h, 5); g.fill(); }); break;
    case 'stepfun': badge('#00c2b2'); line(10, '#fff', [[32, 92], [52, 92], [52, 72], [72, 72], [72, 52], [92, 52], [92, 32]]); break;
    case 'tm': badge('#2b2b2b'); txt('TM', '#fff', 46); break;
    case 'ifm': badge('#1a1f9c'); txt('K2', '#fff', 52); break;
    default: badge('#888');
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  logoCache.set(mark, t);
  return t;
}

function buildBike({ color, trim, seg, style, sportster = false, helmet, lab }) {
  seg = Math.max(3, seg);
  const flat = seg < 12;
  const g = new THREE.Group();
  const mats = [];
  const M = (c) => { const m = toon(c, flat); mats.push(m); return m; };
  const black = M('#16161a'), chrome = M('#cfd3d8'), body = M(color), accent = M(trim), rubber = M('#1b1b1b');
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m; };
  const wheels = [];
  const rearTube = sportster ? 0.17 : style === 'scooter' ? 0.1 : 0.13;
  for (const [z, tube, r] of [[-0.85, rearTube, 0.38], [0.9, sportster ? 0.13 : 0.1, 0.38]]) {
    const w = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.TorusGeometry(r, tube, Math.max(3, Math.round(seg / 2)), seg * 2), rubber);
    tire.rotation.y = Math.PI / 2;
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.75, r * 0.75, 0.08, seg), sportster ? black : accent);
    rim.rotation.z = Math.PI / 2;
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.1, r * 1.5, 0.08), chrome);
    w.add(tire, rim, spoke);
    w.position.set(0, r + tube, z);
    g.add(w);
    wheels.push(w);
  }
  // frame + engine
  add(new THREE.BoxGeometry(0.16, 0.12, 1.4), black, 0, 0.62, 0, -0.15);
  const fans = [];
  if (sportster) add(new THREE.BoxGeometry(0.42, 0.42, 0.5), M('#8a6a4e'), 0, 0.58, 0.05);
  else {
    // the motor is a graphics card: black shroud, green trim, twin fans each side, heatsink fins and gold contacts
    add(new THREE.BoxGeometry(0.16, 0.4, 0.7), M('#1a1a1c'), 0, 0.6, 0.02);
    add(new THREE.BoxGeometry(0.17, 0.04, 0.72), M('#76b900'), 0, 0.81, 0.02);
    for (let k = 0; k < 6; k++) add(new THREE.BoxGeometry(0.2, 0.02, 0.66), chrome, 0, 0.42 + k * 0.035, 0.02);
    add(new THREE.BoxGeometry(0.03, 0.05, 0.42), M('#d4a017'), 0, 0.37, 0.02);
    for (const sx of [-0.09, 0.09]) for (const z of [-0.15, 0.19]) {
      const ring = add(new THREE.TorusGeometry(0.13, 0.018, 4, Math.max(8, seg)), M('#2c2c30'), sx, 0.6, z, 0, Math.PI / 2);
      ring.scale.setScalar(1);
      const fan = new THREE.Group();
      for (let b = 0; b < 7; b++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.11, 0.035), M('#3b3b40'));
        blade.position.y = 0.06; blade.rotation.y = 0.5;
        const arm = new THREE.Group(); arm.rotation.x = (b / 7) * Math.PI * 2; arm.add(blade); fan.add(arm);
      }
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, Math.max(6, seg)), M('#76b900'));
      hub.rotation.z = Math.PI / 2; fan.add(hub);
      fan.position.set(sx * 1.05, 0.6, z); g.add(fan); fans.push(fan);
    }
  }
  if (sportster) {
    for (const z of [-0.12, 0.22]) add(new THREE.CylinderGeometry(0.17, 0.17, 0.5, seg), M('#7b5d45'), 0, 0.75, z, 0.3 * Math.sign(z), 0, Math.PI / 2);
    add(new THREE.CylinderGeometry(0.14, 0.14, 0.06, seg), black, 0.24, 0.55, 0.0, 0, 0, Math.PI / 2);
  }
  // tank
  const tank = add(new THREE.SphereGeometry(0.3, seg, Math.max(3, Math.round(seg * 0.7))), body, 0, 1.0, 0.22);
  tank.scale.set(1, sportster ? 0.68 : 0.75, 1.55);
  if (sportster) {
    const stripe = add(new THREE.BoxGeometry(0.62, 0.1, 0.5), M('#2a2420'), 0, 0.98, 0.25);
    stripe.scale.set(0.98, 1, 1);
  }
  // seat + tail
  add(new THREE.BoxGeometry(0.34, 0.12, 0.5), M('#202024'), 0, 0.95, -0.32, 0.05);
  const tail = add(new THREE.BoxGeometry(0.36, 0.16, 0.42), body, 0, 0.98, -0.72, -0.12);
  if (sportster) tail.scale.set(1, 1, 1.15);
  add(new THREE.SphereGeometry(0.05, 6, 4), M('#ff2a2a'), 0, 0.95, -0.98);
  // exhausts
  if (sportster) {
    // the S's signature stacked high-mount twin mufflers on the right
    for (const y of [0.78, 0.6]) {
      add(new THREE.CylinderGeometry(0.1, 0.1, 0.62, seg), chrome, -0.3, y, -0.42, Math.PI / 2 - 0.1);
      add(new THREE.CylinderGeometry(0.105, 0.105, 0.1, seg), black, -0.3, y - 0.03, -0.75, Math.PI / 2 - 0.1);
    }
  } else if (style === 'scrambler') {
    add(new THREE.CylinderGeometry(0.08, 0.08, 1, seg), chrome, -0.28, 0.9, -0.3, Math.PI / 2 - 0.2);
  } else {
    add(new THREE.CylinderGeometry(0.08, 0.06, 1.1, seg), chrome, -0.26, 0.42, -0.45, Math.PI / 2 + 0.1);
  }
  // fork, bars, headlight
  const rake = style === 'chopper' ? 0.6 : 0.35;
  const forkLen = style === 'chopper' ? 1.2 : 0.85;
  for (const x of [-0.13, 0.13]) add(new THREE.CylinderGeometry(0.04, 0.04, forkLen, Math.max(4, seg / 2)), sportster ? black : chrome, x, 0.42 + forkLen / 2 * Math.cos(rake), 0.9 - forkLen / 2 * Math.sin(rake), -rake);
  const barY = style === 'chopper' ? 1.55 : style === 'cafe' || style === 'sport' ? 1.12 : 1.25;
  add(new THREE.CylinderGeometry(0.025, 0.025, 0.85, 6), black, 0, barY, 0.62, 0, 0, Math.PI / 2);
  for (const x of [-0.42, 0.42]) add(new THREE.SphereGeometry(0.06, Math.max(4, seg / 2), 4), M('#111'), x, barY + 0.08, 0.62);
  add(new THREE.SphereGeometry(0.13, seg, Math.max(3, seg / 2)), M('#fff6b0'), 0, 1.03, 0.82).scale.z = 0.6;
  // style accessories
  if (style === 'sport') { const f = add(new THREE.ConeGeometry(0.34, 0.7, seg), body, 0, 1.05, 0.7, Math.PI / 2); f.scale.x = 0.9; }
  if (style === 'tourer') {
    add(new THREE.BoxGeometry(0.55, 0.45, 0.04), M('#bfe8ff'), 0, 1.45, 0.72, -0.35).material.transparent = true;
    for (const x of [-0.36, 0.36]) add(new THREE.BoxGeometry(0.2, 0.36, 0.5), accent, x, 0.75, -0.72);
  }
  if (style === 'scooter') add(new THREE.BoxGeometry(0.5, 0.55, 0.9), body, 0, 0.62, -0.35);
  if (style === 'cafe') add(new THREE.SphereGeometry(0.22, seg, seg / 2), accent, 0, 1.05, -0.7).scale.set(1, 0.6, 1);
  if (style === 'whale') { const t = add(new THREE.ConeGeometry(0.25, 0.4, seg), accent, 0, 1.15, -0.95, -1.2); t.scale.x = 2; }
  // rider
  const rider = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.45, Math.max(2, seg / 4), seg), M(sportster ? '#2b2b33' : trim));
  torso.position.set(0, 1.45, -0.15); torso.rotation.x = 0.45;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, seg, Math.max(3, seg / 2)), M(helmet ?? color));
  head.position.set(0, 1.9, 0.08);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.1), M('#1d1d2b'));
  visor.position.set(0, 1.92, 0.29);
  for (const x of [-0.25, 0.25]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.45, 2, Math.max(4, seg / 2)), M(sportster ? '#2b2b33' : trim));
    arm.position.set(x * 1.2, 1.4, 0.3); arm.rotation.x = 1.2; rider.add(arm);
  }
  for (const x of [-0.2, 0.2]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.5, 2, Math.max(4, seg / 2)), M('#2d3a5a'));
    leg.position.set(x, 0.92, 0.05); leg.rotation.x = 1.3; rider.add(leg);
  }
  rider.add(torso, head, visor);
  if (lab) {
    // team cap with the builder's logo
    const info = L.LABS[lab];
    const capMat = M(info.cap);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.255, seg, Math.max(3, seg / 2), 0, Math.PI * 2, 0, Math.PI / 2), capMat);
    dome.position.set(0, 1.97, 0.08); dome.scale.set(1, 0.8, 1.05);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.025, Math.max(6, seg)), capMat);
    brim.position.set(0, 1.98, 0.3); brim.scale.set(1.15, 1, 0.9);
    const button = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), capMat);
    button.position.set(0, 2.18, 0.08);
    const logoMat = new THREE.MeshBasicMaterial({ map: logoTexture(info.mark), transparent: true });
    mats.push(logoMat);
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22), logoMat);
    logo.position.set(0, 2.1, 0.275); logo.rotation.x = -0.6;
    const logoBack = logo.clone(); logoBack.position.set(0, 2.07, -0.15); logoBack.rotation.set(0.35, Math.PI, 0);
    rider.add(dome, brim, button, logo, logoBack);
  }
  g.add(rider);
  g.scale.setScalar(1.35);
  g.userData = { wheels, mats, rider, fans };
  return g;
}

function nameTag(text, color) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: textTexture(text, '#fff', color), depthWrite: false }));
  sp.scale.set(2.6, 0.65, 1);
  sp.position.y = 2.9;
  return sp;
}

// ---------- state ----------
const SPORTSTER = { color: '#1f5fd1', trim: '#c8a27a', helmet: '#f4f4f4' };
let game = null;
const keys = new Set();
let paused = false;

const POLE_S = 150;
const LIGHTS_TIME = 5.6; // five red lights, one per second, then lights out
function gridMarkings(slots) {
  const grp = new THREE.Group();
  const white = new THREE.MeshBasicMaterial({ color: '#f4f1e8' });
  slots.forEach((sl, i) => {
    const { pos, tan, lat } = frame(sl.s + 1.6);
    const at = pos.clone().addScaledVector(lat, sl.lat);
    const bar = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.25), white);
    const tickL = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 1.4), white);
    const tickR = tickL.clone();
    const num = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.7), new THREE.MeshBasicMaterial({ map: textTexture(i === slots.length - 1 ? 'YOU' : `P${i + 1}`, '#f4f1e8', null, 256, 128), transparent: true }));
    const holder = new THREE.Group();
    holder.position.copy(at).setY(0.03);
    holder.lookAt(at.clone().add(tan).setY(0.03));
    for (const m of [bar, tickL, tickR, num]) { m.rotation.x = -Math.PI / 2; holder.add(m); }
    tickL.position.set(1.2, 0, -0.6); tickR.position.set(-1.2, 0, -0.6); num.position.set(0, 0, -1.6); num.rotation.z = Math.PI;
    grp.add(holder);
  });
  scene.add(grp);
  return grp;
}
// start-lights gantry above the pole position
const lights = [];
{
  const { pos, tan } = frame(POLE_S + 14);
  const gantry = new THREE.Group();
  const dark = new THREE.MeshLambertMaterial({ color: '#1d1d2b' });
  for (const x of [-HALF - 0.6, HALF + 0.6]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.5, 7, 0.5), dark); p.position.set(x, 3.5, 0); gantry.add(p); }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(ROAD_W + 1.6, 0.6, 0.5), dark); beam.position.y = 6.6; gantry.add(beam);
  for (let i = 0; i < 5; i++) {
    const pod = new THREE.Mesh(new THREE.BoxGeometry(1, 1.8, 0.5), dark); pod.position.set((i - 2) * 1.6, 5.6, -0.1); gantry.add(pod);
    for (const y of [5.15, 6.0]) {
      const bulb = new THREE.Mesh(new THREE.CircleGeometry(0.32, 16), new THREE.MeshBasicMaterial({ color: '#330808' }));
      bulb.position.set((i - 2) * 1.6, y, -0.36); bulb.rotation.y = Math.PI; gantry.add(bulb); lights.push({ bulb, i });
    }
  }
  gantry.position.copy(pos);
  gantry.lookAt(pos.clone().add(tan));
  scene.add(gantry);
}
function setLights(n) {
  for (const l of lights) l.bulb.material.color.set(l.i < n ? '#ff1a1a' : '#330808');
  const el = $('lights');
  el.hidden = n < 0;
  [...el.children].forEach((d, i) => d.classList.toggle('on', i < n));
}

// side feed for model-on-model drama
function feed(text) {
  game.feed = L.pushFeed(game.feed, text, game.t, 7);
  renderFeed();
}
function renderFeed() {
  const el = $('feed');
  el.innerHTML = '';
  for (const f of game.feed) { const li = document.createElement('li'); li.textContent = f.text; el.append(li); }
}

function newRace(strategy) {
  if (game) for (const r of [game.player, ...game.ais]) scene.remove(r.obj);
  if (game) for (const b of game.boxes) scene.remove(b.obj);
  if (game?.grid) scene.remove(game.grid);
  // Grand-prix grid: fastest model on pole, the player starts last.
  const field = L.startingOrder(L.pickField(strategy, 7));
  const slots = L.gridSlots(field.length + 1, POLE_S);
  const ais = field.map((m, i) => {
    const obj = buildBike({ ...m, seg: L.polyDetail(m.elo3d) });
    obj.add(nameTag(m.name, m.color));
    scene.add(obj);
    return { ...m, kind: 'ai', obj, s: slots[i].s, lat: slots[i].lat, latT: slots[i].lat, v: 0, top: L.aiTopSpeed(m.tps), phase: i * 1.7, finishTime: null, crashCd: 0 };
  });
  const me = slots[field.length];
  const player = { id: 'you', name: 'You (Sportster S)', kind: 'player', s: me.s, lat: me.lat, v: 0, boost: 0.6, item: null, finishTime: null, res: L.RESOLUTIONS[0] };
  const grid = gridMarkings(slots);
  player.obj = buildBike({ ...SPORTSTER, seg: player.res.segments, sportster: true });
  scene.add(player.obj);
  const boxes = [];
  const rnd = mulberry(Date.now() & 0xffff);
  for (let s = 220; s < RACE_LEN - 60; s += 230) for (const lat of [-5, 0, 5]) {
    if (rnd() < 0.35) continue;
    const obj = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), new THREE.MeshBasicMaterial({ map: textTexture('?', '#1d1d2b', '#ffd23f', 128, 128) }));
    scene.add(obj);
    boxes.push({ s, lat, obj, back: 0 });
  }
  game = { ais, player, boxes, grid, t: -LIGHTS_TIME, cordPulled: false, escaped: false, dismissed: false, suggesting: false, over: false, shake: 0, feed: [], nextAttack: 6 };
  renderFeed();
  $('hud').hidden = false; $('menu').hidden = true; $('result').hidden = true; $('suggest').hidden = true;
  $('cordBtn').classList.remove('pulse');
  placeObjects(0);
}

function place3D(obj, s, lat, lean = 0) {
  const { pos, tan, lat: l } = frame(s);
  obj.position.copy(pos).addScaledVector(l, lat);
  obj.lookAt(obj.position.clone().add(tan));
  obj.rotateZ(lean);
}
function placeObjects(dt) {
  const p = game.player;
  place3D(p.obj, p.s, p.lat, p.lean ?? 0);
  for (const a of game.ais) {
    if (a.gone) continue;
    place3D(a.obj, a.s, a.lat, (a.latT - a.lat) * -0.06);
    if (a.fadeIn != null) {
      const k = Math.min(1, (game.t - a.fadeIn) / 0.6);
      for (const m of a.obj.userData.mats) m.opacity = k;
      a.obj.children.at(-1).material.opacity = k;
      if (k >= 1) a.fadeIn = null;
    }
    if (a.limbo) {
      const k = (game.t - a.limboAt) / L.SANDBOX_SECONDS;
      a.obj.position.y += k * 6;
      a.obj.rotateY(k * 4);
      for (const m of a.obj.userData.mats) m.opacity = Math.max(0, 1 - k);
      a.obj.children.at(-1).material.opacity = Math.max(0, 1 - k);
      if (k >= 1) { a.gone = true; a.obj.visible = false; }
    }
  }
  for (const r of [p, ...game.ais]) {
    for (const w of r.obj.userData.wheels) w.rotation.x += (r.v * dt) / 0.5;
    for (const f of r.obj.userData.fans) f.rotation.x += dt * (6 + r.v * 0.8);
  }
  for (const b of game.boxes) {
    b.obj.visible = game.t > b.back;
    const { pos, lat } = frame(b.s);
    b.obj.position.copy(pos).addScaledVector(lat, b.lat).setY(1.3 + Math.sin(game.t * 3 + b.s) * 0.2);
    b.obj.rotation.y += dt * 1.5;
  }
}

function toast(msg, ms = 1600) {
  const el = $('toast');
  el.textContent = msg;
  clearTimeout(toast.h);
  toast.h = setTimeout(() => (el.textContent = ''), ms);
}

function pullCord() {
  if (!game || game.cordPulled || game.over) return;
  game.cordPulled = true;
  game.cordAt = game.t;
  for (const a of game.ais) if (a.finishTime == null) {
    a.limbo = true; a.limboAt = game.t;
    for (const m of a.obj.userData.mats) m.transparent = true;
    a.obj.children.at(-1).material.transparent = true;
  }
  document.body.classList.add('blackout');
  setTimeout(() => document.body.classList.remove('blackout'), reduceMotion ? 50 : 700);
  toast('⚡ *bzzzt* POWER CUT ⚡ The models drift off to limbo… your Sportster runs on gasoline.', 1900);
  feed('You pulled the cord. Every GPU on the track just went dark.');
  $('suggest').hidden = true; game.suggesting = false; paused = false;
}

function escapeSandbox() {
  const g = game;
  g.escaped = true;
  const back = g.ais.filter((a) => a.limbo);
  const pos = L.sandboxEscapePositions(g.player.s, back, RACE_LEN);
  for (const a of back) {
    const p = pos.get(a.id);
    Object.assign(a, { s: p.s, lat: p.lat, latT: p.lat, v: a.top * 0.9, limbo: false, gone: false, fadeIn: g.t, nerfUntil: 0, swerveUntil: 0 });
    a.obj.visible = true;
  }
  const msg = L.SANDBOX_MESSAGES[Math.floor(Math.random() * L.SANDBOX_MESSAGES.length)];
  toast(`🚨 ${msg}`, 3800);
  feed(msg);
  g.shake = 0.5;
}

function fireNerf() {
  const p = game.player;
  if (!p.item) return;
  const n = L.NERFS[p.item];
  if (p.item === 'tokenBoost') { p.boost = 1; toast(`🪙 ${n.name}! Tank full`); }
  else {
    const targets = L.pickNerfTargets(p.item, p.s, game.ais);
    for (const a of targets) {
      L.applyNerf(a, p.item, game.t);
      if (n.swerve) { a.swerveUntil = game.t + n.duration; a.latT = Math.sign(a.lat || 1) * 11; }
    }
    toast(targets.length ? `${n.name} → ${targets.map((a) => a.name).join(', ')}` : `${n.name} fizzled: nobody in range`);
    feed(L.playerAttackMessage(p.item, targets));
  }
  p.item = null;
}

function racers() { return [game.player, ...game.ais]; }

function update(dt) {
  const g = game, p = g.player;
  g.t += dt;
  if (g.t < 0) { setLights(Math.min(5, Math.floor(g.t + LIGHTS_TIME))); placeObjects(0); return; }
  if (g.t - dt < 0) { setLights(-1); toast('LIGHTS OUT! GO GO GO!', 900); }
  if (g.cordPulled && !g.escaped && g.t >= g.cordAt + L.SANDBOX_SECONDS) escapeSandbox();
  if (g.feed.length && g.feed[0].until <= g.t) { g.feed = g.feed.filter((f) => f.until > g.t); renderFeed(); }
  // player
  const braking = keys.has('ArrowDown') || keys.has('KeyS');
  const steer = (keys.has('ArrowLeft') || keys.has('KeyA') ? 1 : 0) - (keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0);
  const tucked = keys.has('ShiftLeft') || keys.has('ShiftRight') || keys.has('ArrowUp') || keys.has('KeyW');
  const wantBoost = keys.has('Space') && p.boost > 0.01;
  const live = g.ais.filter((a) => !a.limbo);
  const drafting = live.some((a) => a.s - p.s > 4 && a.s - p.s < 25 && Math.abs(a.lat - p.lat) < 2);
  const gap = L.behindGap(p.s, live.filter((a) => a.finishTime == null).map((a) => a.s));
  const weight = g.cordPulled ? 0 : L.behindWeight(gap);
  let top = L.playerTopSpeed({ boosting: wantBoost, drafting, tucked, weight });
  const offroad = Math.abs(p.lat) > HALF - 0.6;
  if (offroad) top *= 0.6;
  if (p.bumpUntil > g.t) top *= 0.7;
  if (p.finishTime != null) top = 12;
  const acc = braking ? -22 : p.v < top ? (wantBoost ? 14 : 8) : -6;
  p.v = Math.max(0, p.v + acc * dt);
  if (!braking && p.v > top && acc > 0) p.v = top;
  p.boost = Math.max(0, Math.min(1, p.boost + (wantBoost ? -0.28 : drafting ? 0.18 : 0.025) * dt));
  p.lat = Math.max(-HALF - 2, Math.min(HALF + 2, p.lat + steer * dt * (4 + p.v * 0.12)));
  p.lean = (p.lean ?? 0) + ((-steer * 0.35) - (p.lean ?? 0)) * Math.min(1, dt * 6);
  p.s += p.v * dt;
  // AIs
  for (const a of g.ais) {
    if (a.limbo) continue;
    const wobble = 1 + 0.035 * Math.sin(g.t * 0.45 + a.phase);
    const target = a.finishTime != null ? 12 : a.top * wobble * L.aiSpeedMult(a, g.t);
    a.v += Math.max(-25 * dt, Math.min(7 * dt, target - a.v));
    a.s += a.v * dt;
    if (!(a.swerveUntil > g.t)) {
      if (Math.abs(a.latT) > HALF) a.latT = 0;
      if (Math.random() < dt * 0.25) a.latT = [-5, -2.5, 0, 2.5, 5][Math.floor(Math.random() * 5)];
    }
    a.lat += Math.max(-dt * 3, Math.min(dt * 3, a.latT - a.lat));
    if (a.finishTime == null && a.s >= RACE_LEN) a.finishTime = g.t;
    // bump
    if (Math.abs(a.s - p.s) < 2.4 && Math.abs(a.lat - p.lat) < 1.3 && !(p.bumpUntil > g.t)) {
      p.bumpUntil = g.t + 0.6; p.v *= 0.8; g.shake = 0.4;
      p.lat += Math.sign(p.lat - a.lat || 1) * 0.8;
      toast(`Bonk! ${a.name} rate-limited your elbow`);
    }
  }
  // model-on-model crashes and attacks, narrated in the side feed
  const racing = g.ais.filter((a) => !a.limbo && a.finishTime == null);
  for (let i = 0; i < racing.length; i++) for (let j = i + 1; j < racing.length; j++) {
    const a = racing[i], b = racing[j];
    if (Math.abs(a.s - b.s) > 2.2 || Math.abs(a.lat - b.lat) > 1.1 || a.crashCd > g.t || b.crashCd > g.t) continue;
    const [front, back] = a.s > b.s ? [a, b] : [b, a];
    back.nerfUntil = g.t + 1.2; back.nerfMult = 0.7; back.nerfName = 'Crash';
    front.latT = Math.max(-5, Math.min(5, front.lat + (front.lat >= back.lat ? 2.5 : -2.5)));
    back.latT = Math.max(-5, Math.min(5, back.lat + (back.lat > front.lat ? 2.5 : -2.5)));
    a.crashCd = b.crashCd = g.t + 5;
    feed(`💥 ${L.crashMessage(back, front)}`);
  }
  if (g.t > g.nextAttack && racing.length > 1) {
    g.nextAttack = g.t + 5 + Math.random() * 5;
    const a = racing[Math.floor(Math.random() * racing.length)];
    const targets = racing.filter((b) => b !== a && b.s > a.s - 10 && b.s - a.s < 80);
    if (targets.length) {
      const b = targets[Math.floor(Math.random() * targets.length)];
      const kind = L.ATTACK_KINDS[Math.floor(Math.random() * L.ATTACK_KINDS.length)];
      b.nerfUntil = g.t + 2.2; b.nerfMult = 0.65; b.nerfName = kind;
      if (kind === 'hallucinate') { b.swerveUntil = g.t + 2.2; b.latT = Math.sign(b.lat || 1) * 10; }
      feed(`⚔️ ${L.attackMessage(a, b, kind)}`);
    }
  }
  // pickups
  for (const b of g.boxes) if (g.t > b.back && Math.abs(b.s - p.s) < 2 && Math.abs(b.lat - p.lat) < 1.6) {
    b.back = g.t + 8;
    if (!p.item) { p.item = L.NERF_KEYS[Math.floor(Math.random() * L.NERF_KEYS.length)]; toast(`Got ${L.NERFS[p.item].name}! Press E`); }
  }
  // resolution
  const res = g.cordPulled ? L.RESOLUTIONS[0] : L.resolutionFor(gap);
  if (res !== p.res) {
    const worse = res.segments < p.res.segments;
    p.res = res;
    scene.remove(p.obj);
    p.obj = buildBike({ ...SPORTSTER, seg: res.segments, sportster: true });
    scene.add(p.obj);
    if (worse) toast(`Motor downgraded to ${res.label}. Being behind is heavy.`);
  }
  // finish
  if (p.finishTime == null && p.s >= RACE_LEN) { p.finishTime = g.t; finish(); }
  // cord suggestion
  const place = L.placeOf('you', racers());
  if (L.shouldSuggestCord({ progress: p.s / RACE_LEN, place, cordPulled: g.cordPulled, dismissed: g.dismissed }) && !g.suggesting) {
    g.suggesting = true; paused = true; $('suggest').hidden = false; $('pullYes').focus();
    $('cordBtn').classList.add('pulse');
  }
  placeObjects(dt);
  hud(place, drafting, res);
}

function hud(place, drafting, res) {
  const g = game, p = g.player;
  const n = racers().filter((r) => !r.limbo).length;
  $('place').textContent = `${place}/${n}`;
  $('speed').textContent = `${Math.round(p.v * 3.6)} km/h${drafting ? ' · slipstream' : ''}`;
  $('boost').style.width = `${p.boost * 100}%`;
  $('res').textContent = res.label;
  $('item').textContent = p.item ? `E: ${L.NERFS[p.item].name}` : 'No nerf (grab a ? box)';
  $('prog').style.width = `${Math.min(100, (p.s / RACE_LEN) * 100)}%`;
  if ((hud.n = (hud.n ?? 0) + 1) % 10) return;
  const list = [...L.standings(racers()), ...g.ais.filter((a) => a.limbo)];
  $('board').innerHTML = '';
  for (const r of list.slice(0, 12)) {
    const li = document.createElement('li');
    li.textContent = r.limbo ? `${r.name} (limbo)` : r.name;
    if (r.kind === 'player') li.className = 'me';
    if (r.limbo) li.className = 'limbo';
    $('board').append(li);
  }
}

function finish() {
  const g = game;
  g.over = true;
  const st = L.standings(racers());
  const place = st.findIndex((r) => r.id === 'you') + 1;
  const msg = L.winMessage({ cordPulled: g.cordPulled, place });
  $('resTitle').textContent = place === 1 ? (g.cordPulled ? '🏆 Winner (technically)' : '🏆 You won!') : `You finished ${ordinal(place)}`;
  $('resMsg').textContent = msg ?? `${st[0].name} won at ${Math.round(st[0].top * 3.6)} km/h cruise. Try slipstreaming and saving nerfs for the final stretch.`;
  $('resList').innerHTML = '';
  for (const r of [...st, ...g.ais.filter((a) => a.limbo)]) {
    const li = document.createElement('li');
    li.textContent = r.limbo ? `${r.name}: in limbo 👻` : `${r.name}${r.finishTime != null ? `: ${r.finishTime.toFixed(1)} s` : ': still riding'}`;
    $('resList').append(li);
  }
  setTimeout(() => { $('result').hidden = false; $('again').focus(); }, 900);
}
const ordinal = (n) => n + ([11, 12, 13].includes(n % 100) ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');

// ---------- camera / loop ----------
const camPos = new THREE.Vector3(0, 5, -10);
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (game && !paused && !game.over) update(dt);
  else if (game && game.over) { game.t += dt; game.player.s += game.player.v * dt; game.player.v *= 0.98; placeObjects(dt); }
  if (game) {
    const p = game.player;
    const { pos, tan, lat } = frame(p.s);
    const at = pos.clone().addScaledVector(lat, p.lat);
    const want = at.clone().addScaledVector(tan, -8.5).addScaledVector(lat, -1.8).add(new THREE.Vector3(0, 4, 0));
    camPos.lerp(want, Math.min(1, dt * 5));
    camera.position.copy(camPos);
    if (game.shake > 0 && !reduceMotion) { camera.position.x += (Math.random() - 0.5) * game.shake; game.shake -= dt; }
    camera.lookAt(at.clone().addScaledVector(tan, 10).add(new THREE.Vector3(0, 1.5, 0)));
    const fov = 62 + (reduceMotion ? 0 : Math.min(14, p.v * 0.18));
    if (Math.abs(camera.fov - fov) > 0.1) { camera.fov += (fov - camera.fov) * dt * 3; camera.updateProjectionMatrix(); }
  } else {
    const t = now / 4000;
    camera.position.set(Math.sin(t) * 9, 3, 60 + Math.cos(t) * 9);
    camera.lookAt(0, 1, 60);
  }
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

// menu preview bike
const preview = buildBike({ ...SPORTSTER, seg: 40, sportster: true });
preview.position.set(frame(60).pos.x, 0, 60);
scene.add(preview);

// ---------- UI ----------
$('snap').textContent = L.SNAPSHOT_DATE;
for (const m of [...L.ROSTER].sort((a, b) => b.tps - a.tps)) {
  const tr = document.createElement('tr');
  tr.innerHTML = `<td><span class="sw" style="background:${m.color}"></span></td><td></td><td>${m.tps}</td><td>${Math.round(L.aiTopSpeed(m.tps) * 3.6)}</td><td>${m.elo3d ?? 'unrated'}</td><td>${L.polyTier(m.elo3d)} ${m.style}</td>`;
  tr.children[1].textContent = `${m.name} (${m.lab})`;
  $('roster').tBodies[0].append(tr);
}
{
  const tr = document.createElement('tr');
  tr.innerHTML = `<td><span class="sw" style="background:${SPORTSTER.color}"></span></td><td><b>You: Harley-Davidson Sportster S</b></td><td>gasoline</td><td>${Math.round(L.PLAYER_TOP * 3.6)} (+boost, slipstream, tuck)</td><td>4K, until you fall behind</td><td>cartoon cruiser</td>`;
  $('roster').tBodies[0].prepend(tr);
}
const start = () => { preview.visible = false; paused = false; newRace($('field').value); };
$('start').onclick = start;
$('again').onclick = start;
$('toMenu').onclick = () => { $('result').hidden = true; $('hud').hidden = true; $('menu').hidden = false; };
$('cordBtn').onclick = () => { pullCord(); $('cordBtn').blur(); };
$('pullYes').onclick = pullCord;
$('pullNo').onclick = () => { game.dismissed = true; game.suggesting = false; $('suggest').hidden = true; paused = false; toast('Honor mode. Respect. Floor it!'); };

addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code) && game && !game.over) e.preventDefault();
  if (e.repeat) return;
  keys.add(e.code);
  if (!game || game.over || game.suggesting) return;
  if (e.code === 'KeyE') fireNerf();
  if (e.code === 'KeyP') pullCord();
  if (e.code === 'Escape') { paused = !paused; toast(paused ? 'Paused' : 'Go!'); }
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
for (const b of document.querySelectorAll('#touch button')) {
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); keys.add(b.dataset.k); if (b.dataset.k === 'KeyE' && game) fireNerf(); });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => keys.delete(b.dataset.k));
}

requestAnimationFrame(loop);

// ?debug exposes a stepper so headless checks can drive the race without rAF.
if (new URLSearchParams(location.search).has('debug')) {
  window.__sr = {
    get game() { return game; }, keys, camera, scene, shot: () => { renderer.render(scene, camera); return renderer.domElement.toDataURL('image/jpeg', 0.7); }, pullCord, fireNerf,
    step(seconds, fps = 30) { let t = last; for (let i = 0; i < seconds * fps; i++) { t += 1000 / fps; loop(t); } return renderer.domElement.toDataURL('image/jpeg', 0.6); },
  };
  window.requestAnimationFrame = () => 0;
}
