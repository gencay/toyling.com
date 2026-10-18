// The penalty after each right answer, in 3D (owner's request, October 18, 2026: a realistic goalkeeper and goal).
// Real measurements: the goal is 7.32 m wide and 2.44 m high, the penalty spot 11 m out, the ball 22 cm across, the
// keeper 1.88 m tall with a jointed body (hips, spine, neck, head, shoulders, elbows, gloves, hips, knees, boots) and
// keyframed poses (ready stance, full-stretch dive, jump). The net ripples where the ball hits. Colors come from the
// design tokens. Built on three.js r169 (web/vendor, MIT), so it works offline; app.js falls back to the 2D goal when
// WebGL is missing. Reduced motion skips straight to the end of the kick.
import * as THREE from './vendor/three.module.js';

export const GOAL = { width: 7.32, height: 2.44, spot: 11, ball: 0.11 };
const HALF = GOAL.width / 2;

const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(`--${name.replace(/([a-z])([A-Z0-9])/g, '$1-$2').toLowerCase()}`).trim() || 'gray';
const col = (name) => new THREE.Color(css(name));
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const clamp01 = (t) => Math.min(1, Math.max(0, t));

// ---- textures drawn on canvases (no image files) ----
function grassTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 512;
  const g = c.getContext('2d');
  for (let i = 0; i < 8; i++) { g.fillStyle = css(i % 2 ? 'grassStripe' : 'grass'); g.fillRect(0, i * 64, 256, 64); }
  // fine blades: tiny lighter and darker specks
  for (let i = 0; i < 9000; i++) {
    g.globalAlpha = 0.06;
    g.fillStyle = css(Math.random() < 0.5 ? 'chalk' : 'shadow');
    g.fillRect(Math.random() * 256, Math.random() * 512, 1, 2);
  }
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6, 3);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function ballTexture(color) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = css(color);
  g.fillRect(0, 0, 512, 256);
  g.fillStyle = css('ballPatch');
  // pentagons spread over the sphere (equirectangular: wider near the poles)
  const spots = [[256, 10, 1.6], [256, 246, 1.6], [64, 90, 1], [192, 90, 1], [320, 90, 1], [448, 90, 1], [0, 166, 1], [128, 166, 1], [256, 166, 1], [384, 166, 1], [512, 166, 1]];
  for (const [x, y, w] of spots) {
    g.beginPath();
    for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5; g.lineTo(x + Math.cos(a) * 22 * w, y + Math.sin(a) * 20); }
    g.closePath();
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function crowdTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = css('stand');
  g.fillRect(0, 0, 512, 128);
  const shirts = ['kitRed', 'kitYellow', 'kitWhite', 'kitSkyStripe', 'kitNavy', 'kitGreen', 'skin2', 'skin3'].map(css);
  for (let row = 0; row < 16; row++) for (let i = 0; i < 128; i++) {
    g.fillStyle = shirts[(row * 7 + i * 13 + ((i * row) % 5)) % shirts.length];
    g.globalAlpha = 0.55 + ((i * 31 + row * 17) % 40) / 100;
    g.fillRect(i * 4 + (row % 2) * 2, row * 8 + 2, 3, 5);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function boardTexture() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = css('pitchDark');
  g.fillRect(0, 0, 1024, 64);
  g.fillStyle = css('coin');
  g.font = '900 30px system-ui, sans-serif';
  g.textBaseline = 'middle';
  for (let x = 16; x < 1024; x += 512) g.fillText('KICKBOOK  ⚽  OKU · READ', x, 34);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.set(4, 1);
  return t;
}

// ---- the goal and its net ----
function buildGoal(scene) {
  const white = new THREE.MeshStandardMaterial({ color: col('post'), roughness: 0.35, metalness: 0.1 });
  const r = 0.06;
  const post = new THREE.CylinderGeometry(r, r, GOAL.height + r, 24);
  for (const x of [-HALF, HALF]) {
    const m = new THREE.Mesh(post, white);
    m.position.set(x, (GOAL.height + r) / 2, 0);
    m.castShadow = true;
    scene.add(m);
  }
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(r, r, GOAL.width + 2 * r, 24), white);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, GOAL.height, 0);
  bar.castShadow = true;
  scene.add(bar);
  // back frame: thin dark supports, 2 m deep at the ground and 1 m at the top
  const frame = new THREE.MeshStandardMaterial({ color: col('standLight'), roughness: 0.6 });
  const thin = (a, b) => {
    const d = new THREE.Vector3().subVectors(b, a);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, d.length(), 8), frame);
    m.position.copy(a).addScaledVector(d, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    scene.add(m);
  };
  for (const x of [-HALF, HALF]) {
    thin(new THREE.Vector3(x, GOAL.height, 0), new THREE.Vector3(x, GOAL.height, -1));
    thin(new THREE.Vector3(x, GOAL.height, -1), new THREE.Vector3(x, 0, -2));
    thin(new THREE.Vector3(x, 0, 0), new THREE.Vector3(x, 0, -2));
  }
  thin(new THREE.Vector3(-HALF, 0, -2), new THREE.Vector3(HALF, 0, -2));
  thin(new THREE.Vector3(-HALF, GOAL.height, -1), new THREE.Vector3(HALF, GOAL.height, -1));

  // net: a mesh of 12 cm squares on the back, roof and sides; the back can ripple
  const netMat = new THREE.LineBasicMaterial({ color: col('net'), transparent: true, opacity: 0.75 });
  const step = 0.12;
  const back = (u, v) => new THREE.Vector3(-HALF + u * GOAL.width, v * GOAL.height, -2 + v * 1);
  const nu = Math.round(GOAL.width / step), nv = Math.round(GOAL.height / step);
  const pts = [];
  const grid = [];
  for (let j = 0; j <= nv; j++) { grid[j] = []; for (let i = 0; i <= nu; i++) grid[j][i] = back(i / nu, j / nv); }
  for (let j = 0; j <= nv; j++) for (let i = 0; i < nu; i++) pts.push(grid[j][i], grid[j][i + 1]);
  for (let i = 0; i <= nu; i++) for (let j = 0; j < nv; j++) pts.push(grid[j][i], grid[j + 1][i]);
  const backGeo = new THREE.BufferGeometry().setFromPoints(pts);
  const base = Float32Array.from(backGeo.attributes.position.array);
  scene.add(new THREE.LineSegments(backGeo, netMat));
  const plane = (corner, a, b, na, nb) => {
    const p = [];
    for (let j = 0; j <= nb; j++) p.push(corner.clone().addScaledVector(b, j / nb), corner.clone().addScaledVector(b, j / nb).add(a));
    for (let i = 0; i <= na; i++) p.push(corner.clone().addScaledVector(a, i / na), corner.clone().addScaledVector(a, i / na).add(b));
    scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(p), netMat));
  };
  plane(new THREE.Vector3(-HALF, GOAL.height, 0), new THREE.Vector3(GOAL.width, 0, 0), new THREE.Vector3(0, 0, -1), nu, 8);
  for (const x of [-HALF, HALF]) {
    // side nets: triangles-ish, drawn as a grid between the post and the back frame
    const p = [];
    for (let j = 0; j <= nv; j++) { const y = (j / nv) * GOAL.height; p.push(new THREE.Vector3(x, y, 0), new THREE.Vector3(x, y, -2 + (y / GOAL.height) * 1)); }
    // vertical strands: full height under the roof (z from 0 to -1), then down the sloping back edge (z to -2)
    for (let i = 0; i <= 16; i++) { const z = -(i / 16) * 2; p.push(new THREE.Vector3(x, 0, z), new THREE.Vector3(x, z >= -1 ? GOAL.height : (z + 2) * GOAL.height, z)); }
    scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(p), netMat));
  }
  return { backGeo, base };
}

// ---- the goalkeeper: a jointed body in real proportions ----
function buildKeeper(scene) {
  const M = (c, rough = 0.75) => new THREE.MeshStandardMaterial({ color: col(c), roughness: rough });
  const jersey = M('keeper', 0.8), shorts = M('kitBlack', 0.85), socks = M('keeper', 0.9), skin = M('skin2', 0.6), hair = M('hairBlack', 0.9);
  const glove = M('glove', 0.5), trim = M('gloveTrim', 0.6), boot = M('kitBlack', 0.4);
  const part = (geo, mat, parent, pos, scale) => {
    const m = new THREE.Mesh(geo, mat);
    if (pos) m.position.set(...pos);
    if (scale) m.scale.set(...scale);
    m.castShadow = true;
    parent.add(m);
    return m;
  };
  const joint = (parent, pos) => { const g = new THREE.Group(); g.position.set(...pos); parent.add(g); return g; };
  const limb = (r, len) => new THREE.CapsuleGeometry(r, len, 6, 14);

  const root = new THREE.Group();
  scene.add(root);
  const J = { root };
  // pelvis and shorts
  part(limb(0.13, 0.12), shorts, root, [0, 0, 0], [1, 1, 0.8]).rotation.z = Math.PI / 2;
  // spine, chest, shoulders
  J.spine = joint(root, [0, 0.07, 0]);
  part(limb(0.165, 0.3), jersey, J.spine, [0, 0.24, 0], [1.12, 1, 0.72]);
  part(new THREE.SphereGeometry(0.06, 12, 10), jersey, J.spine, [0, 0.5, 0.02], [2.1, 0.7, 1.2]); // collar and shoulder line
  J.neck = joint(J.spine, [0, 0.52, 0]);
  part(new THREE.CylinderGeometry(0.05, 0.055, 0.1, 14), skin, J.neck, [0, 0.04, 0]);
  J.head = joint(J.neck, [0, 0.1, 0]);
  part(new THREE.SphereGeometry(0.105, 24, 18), skin, J.head, [0, 0.1, 0.005], [0.88, 1.12, 0.98]);
  part(new THREE.SphereGeometry(0.108, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), hair, J.head, [0, 0.125, -0.008], [0.9, 1.05, 1.0]);
  part(new THREE.SphereGeometry(0.02, 8, 6), skin, J.head, [-0.093, 0.095, 0], [0.6, 1.2, 0.9]); // ears
  part(new THREE.SphereGeometry(0.02, 8, 6), skin, J.head, [0.093, 0.095, 0], [0.6, 1.2, 0.9]);
  part(new THREE.SphereGeometry(0.016, 8, 6), skin, J.head, [0, 0.085, 0.1], [0.8, 1, 1]); // nose
  for (const side of [-1, 1]) {
    const s = side < 0 ? 'l' : 'r';
    const sh = (J[`${s}Shoulder`] = joint(J.spine, [side * 0.215, 0.46, 0]));
    part(new THREE.SphereGeometry(0.07, 14, 10), jersey, sh, [0, 0, 0]);
    part(limb(0.055, 0.22), jersey, sh, [0, -0.15, 0]);
    const el = (J[`${s}Elbow`] = joint(sh, [0, -0.3, 0]));
    part(limb(0.047, 0.2), jersey, el, [0, -0.13, 0]);
    const wr = joint(el, [0, -0.27, 0]);
    part(new THREE.CylinderGeometry(0.052, 0.05, 0.07, 14), trim, wr, [0, -0.01, 0]); // glove cuff
    part(new THREE.SphereGeometry(0.07, 16, 12), glove, wr, [0, -0.085, 0.01], [0.95, 1.35, 0.5]); // palm
    part(new THREE.CapsuleGeometry(0.022, 0.06, 4, 8), glove, wr, [side * 0.06, -0.06, 0.03], [1, 1, 1]).rotation.z = side * 0.9; // thumb
    const hp = (J[`${s}Hip`] = joint(root, [side * 0.095, -0.05, 0]));
    part(limb(0.085, 0.14), shorts, hp, [0, -0.1, 0]);
    part(limb(0.072, 0.3), skin, hp, [0, -0.25, 0]);
    const kn = (J[`${s}Knee`] = joint(hp, [0, -0.45, 0]));
    part(limb(0.058, 0.3), socks, kn, [0, -0.21, 0]);
    const an = joint(kn, [0, -0.43, 0]);
    part(new THREE.BoxGeometry(0.1, 0.07, 0.27), boot, an, [0, -0.01, 0.05]);
  }
  return J;
}

// Poses: rotations in radians for each joint, plus the body's position and roll (see the conventions in the code:
// shoulders rz lifts the arms sideways, rx < 0 brings arms or thighs forward, knees rx > 0 bend).
const READY = {
  root: { x: 0, y: 0.83, rz: 0, rx: 0 }, spine: { rx: 0.32 }, head: { rx: -0.25 },
  lShoulder: { rx: -0.45, rz: -0.85 }, rShoulder: { rx: -0.45, rz: 0.85 }, lElbow: { rx: -0.7 }, rElbow: { rx: -0.7 },
  lHip: { rx: -0.55, rz: -0.12 }, rHip: { rx: -0.55, rz: 0.12 }, lKnee: { rx: 1.0 }, rKnee: { rx: 1.0 },
};
function dive(side) {
  // side: -1 left, 1 right (from the kicker's view)
  return {
    root: { x: side * 2.35, y: 0.55, rz: -side * 1.3, rx: 0.1 }, spine: { rx: 0.05 }, head: { rx: 0 },
    // both arms stretched over the head, hands together toward the ball
    lShoulder: { rx: 0, rz: -2.98 }, rShoulder: { rx: 0, rz: 2.98 }, lElbow: { rx: -0.05 }, rElbow: { rx: -0.05 },
    lHip: { rx: -0.25, rz: side < 0 ? -0.35 : -0.05 }, rHip: { rx: -0.25, rz: side > 0 ? 0.35 : 0.05 }, lKnee: { rx: 0.35 }, rKnee: { rx: 0.2 },
  };
}
const JUMP = {
  root: { x: 0, y: 1.3, rz: 0, rx: 0 }, spine: { rx: 0 }, head: { rx: -0.2 },
  lShoulder: { rx: -0.2, rz: -2.9 }, rShoulder: { rx: -0.2, rz: 2.9 }, lElbow: { rx: 0 }, rElbow: { rx: 0 },
  lHip: { rx: -0.9, rz: -0.1 }, rHip: { rx: -0.9, rz: 0.1 }, lKnee: { rx: 1.4 }, rKnee: { rx: 1.4 },
};

function lerpPose(a, b, t) {
  const out = {};
  for (const k of Object.keys(a)) { out[k] = {}; for (const p of Object.keys(a[k])) out[k][p] = a[k][p] + ((b[k]?.[p] ?? a[k][p]) - a[k][p]) * t; }
  return out;
}
function applyPose(J, pose) {
  for (const [k, v] of Object.entries(pose)) {
    const j = J[k];
    if (!j) continue;
    if (k === 'root') { j.position.x = v.x; j.position.y = v.y; j.rotation.z = v.rz; j.rotation.x = v.rx; continue; }
    j.rotation.x = v.rx ?? 0;
    j.rotation.z = v.rz ?? 0;
  }
}

/**
 * Builds the scene in `host` and returns { shoot(zone, dive), dispose(), canvas }. zone and dive are 'left',
 * 'middle' or 'right' from the kicker's view; the keeper always dives away from the ball (the answer was right).
 */
export function createPenalty(host, { ballColor = 'ball', reduced = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.className = 'penalty-3d';
  canvas.setAttribute('aria-hidden', 'true');
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  scene.background = col('sky');
  scene.fog = new THREE.Fog(col('sky'), 40, 90);
  const camera = new THREE.PerspectiveCamera(30, 4 / 3, 0.1, 200);
  // the kicker's view: just behind the ball, eyes at about 1.5 m
  camera.position.set(0, 1.6, GOAL.spot + 4.5);
  camera.lookAt(0, 0.95, 0);

  scene.add(new THREE.HemisphereLight(col('floodlight'), col('grass'), 0.9));
  const sun = new THREE.DirectionalLight(col('floodlight'), 2.2);
  sun.position.set(-6, 14, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -4, near: 1, far: 40 });
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  // pitch with the markings near the goal
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(70, 50), new THREE.MeshStandardMaterial({ map: grassTexture(), roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.z = 8;
  ground.receiveShadow = true;
  scene.add(ground);
  const chalk = new THREE.MeshBasicMaterial({ color: col('chalk') });
  const line = (x, z, w, d) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), chalk); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.004, z); scene.add(m); };
  line(0, 0, 60, 0.12); // goal line
  line(0, 5.5, 18.32, 0.12); line(-9.16, 2.75, 0.12, 5.5); line(9.16, 2.75, 0.12, 5.5); // six-yard box
  line(0, 16.5, 40.32, 0.12); line(-20.16, 8.25, 0.12, 16.5); line(20.16, 8.25, 0.12, 16.5); // penalty area
  const spot = new THREE.Mesh(new THREE.CircleGeometry(0.11, 24), chalk);
  spot.rotation.x = -Math.PI / 2;
  spot.position.set(0, 0.005, GOAL.spot);
  scene.add(spot);

  // stadium: advertising boards, stands with a crowd, floodlight glow
  const boards = new THREE.Mesh(new THREE.BoxGeometry(44, 0.9, 0.1), new THREE.MeshStandardMaterial({ map: boardTexture(), roughness: 0.5, emissive: col('pitchDark'), emissiveIntensity: 0.15 }));
  boards.position.set(0, 0.45, -4);
  scene.add(boards);
  const crowd = crowdTexture();
  crowd.wrapS = THREE.RepeatWrapping;
  crowd.repeat.set(4, 1);
  for (let tier = 0; tier < 3; tier++) {
    const stand = new THREE.Mesh(new THREE.BoxGeometry(90, 4.2, 0.5), new THREE.MeshStandardMaterial({ map: crowd, roughness: 1 }));
    stand.position.set(0, 1.6 + tier * 4.1, -8 - tier * 3.2);
    stand.rotation.x = -0.35;
    scene.add(stand);
  }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(90, 0.6, 8), new THREE.MeshStandardMaterial({ color: col('stand'), roughness: 0.8 }));
  roof.position.set(0, 14.5, -16);
  scene.add(roof);

  const net = buildGoal(scene);
  const J = buildKeeper(scene);
  applyPose(J, READY);

  const ball = new THREE.Mesh(new THREE.SphereGeometry(GOAL.ball, 32, 24), new THREE.MeshStandardMaterial({ map: ballTexture(ballColor), roughness: 0.45 }));
  ball.castShadow = true;
  ball.position.set(0, GOAL.ball, GOAL.spot);
  scene.add(ball);

  function resize() {
    const w = host.clientWidth || 300, h = Math.round(w * 0.72);
    renderer.setSize(w, h, false);
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
    camera.aspect = w / h;
    // keep the whole goal in view on narrow phones
    camera.fov = w / h < 1.2 ? 38 : 35;
    camera.updateProjectionMatrix();
  }
  resize();
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  ro?.observe(host);

  let ripple = null; // { x, y, t0 }
  function updateNet(now) {
    if (!ripple) return;
    const t = (now - ripple.t0) / 1000;
    const pos = net.backGeo.attributes.position.array;
    const amp = 0.45 * Math.exp(-t * 3.2);
    for (let i = 0; i < pos.length; i += 3) {
      const dx = net.base[i] - ripple.x, dy = net.base[i + 1] - ripple.y;
      const d2 = dx * dx + dy * dy;
      pos[i + 2] = net.base[i + 2] - amp * Math.exp(-d2 / 0.6) * Math.cos(t * 14 - Math.sqrt(d2) * 4);
    }
    net.backGeo.attributes.position.needsUpdate = true;
    if (amp < 0.004) { pos.set(net.base); net.backGeo.attributes.position.needsUpdate = true; ripple = null; }
  }

  let raf = 0, alive = true, anim = null, t0 = performance.now();
  function frame(now) {
    if (!alive) return;
    if (anim) anim(now);
    else if (!reduced) {
      // ready stance: a small bounce on the toes
      const b = Math.sin((now - t0) / 260) * 0.012;
      J.root.position.y = READY.root.y + b;
    }
    updateNet(now);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  const TARGET = { left: -2.75, middle: 0, right: 2.75 };
  function shoot(zone, diveZone) {
    const side = { left: -1, middle: 0, right: 1 }[diveZone];
    const endPose = side === 0 ? JUMP : dive(side);
    const tx = TARGET[zone] + (zone === 'middle' ? 0.35 : 0), ty = zone === 'middle' ? 1.95 : 1.15;
    const from = new THREE.Vector3(0, GOAL.ball, GOAL.spot);
    const hit = new THREE.Vector3(tx * 1.02, ty * 0.7, -1.2 - ty * 0.25);
    const finish = () => { applyPose(J, endPose); ball.position.set(hit.x, GOAL.ball, -1.3); ripple = { x: hit.x, y: hit.y, t0: performance.now() - 2000 }; updateNet(performance.now()); renderer.render(scene, camera); };
    if (reduced) { finish(); return Promise.resolve(); }
    return new Promise((done) => {
      const start = performance.now();
      const FLIGHT = 620, REACT = 120, DIVE = 560, SETTLE = 900;
      let struck = false;
      anim = (now) => {
        const t = now - start;
        // keeper: reacts, dives (up then down for side dives), lands
        const k = clamp01((t - REACT) / DIVE);
        const pose = lerpPose(READY, endPose, ease(k));
        if (side !== 0) pose.root.y = READY.root.y + Math.sin(Math.PI * Math.min(1, k * 1.05)) * 0.45 - k * 0.28;
        else pose.root.y = READY.root.y + Math.sin(Math.PI * k) * 0.5;
        applyPose(J, pose);
        // ball: a curling arc into the net, then it drops and rolls back a little
        const f = clamp01(t / FLIGHT);
        if (f < 1) {
          ball.position.lerpVectors(from, hit, f);
          ball.position.y += Math.sin(Math.PI * f) * 0.55;
          ball.position.x += Math.sin(Math.PI * f) * (zone === 'middle' ? 0 : -Math.sign(tx) * 0.35);
          ball.rotation.x -= 0.5;
          ball.rotation.y += 0.12;
        } else {
          if (!struck) { struck = true; ripple = { x: hit.x, y: hit.y, t0: now }; }
          const g = clamp01((t - FLIGHT) / 500);
          ball.position.set(hit.x, hit.y + (GOAL.ball - hit.y) * (g * g), hit.z + 0.25 * g);
          ball.rotation.x -= 0.15 * (1 - g);
        }
        if (t > FLIGHT + SETTLE) { anim = null; t0 = now; done(); }
      };
    });
  }

  function dispose() {
    alive = false;
    cancelAnimationFrame(raf);
    ro?.disconnect();
    scene.traverse((o) => { o.geometry?.dispose(); const m = o.material; if (m) { (Array.isArray(m) ? m : [m]).forEach((x) => { x.map?.dispose(); x.dispose(); }); } });
    renderer.dispose();
    renderer.forceContextLoss?.();
    canvas.remove();
  }

  return { shoot, dispose, canvas, keeper: J };
}

/** Is WebGL available? (a hidden test canvas; no rendering) */
export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}
