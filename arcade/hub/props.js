// Ship props around the arcade, Lethal Company style: a blue bunk bed, an old TV, a different handful of scrap
// to collect on every visit (one featured under a spotlight), and the girl.
import * as THREE from 'three';
import { buildScrap, pickScrap } from './scrap.js';

const SALARY_KEY = 'toyling-arcade-salary';
export const salary = {
  get: () => Number(localStorage.getItem(SALARY_KEY) ?? 0) || 0,
  add(n) { const v = salary.get() + n; localStorage.setItem(SALARY_KEY, String(v)); return v; },
};

let audio;
function ctx() { return (audio ??= new (window.AudioContext || window.webkitAudioContext)()); }
function beep({ f = 440, f2 = f, dur = 0.12, type = 'square', vol = 0.08 }) {
  try {
    const a = ctx(), o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f, a.currentTime); o.frequency.exponentialRampToValueAtTime(Math.max(30, f2), a.currentTime + dur);
    g.gain.setValueAtTime(vol, a.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
    o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + dur);
  } catch { /* audio is optional */ }
}
export const sounds = {
  squeak: () => { beep({ f: 900, f2: 1500, dur: 0.09, type: 'triangle', vol: 0.1 }); setTimeout(() => beep({ f: 1400, f2: 700, dur: 0.12, type: 'triangle', vol: 0.08 }), 90); },
  chatter: () => { for (let i = 0; i < 6; i++) setTimeout(() => beep({ f: 2200, f2: 1800, dur: 0.025, type: 'square', vol: 0.05 }), i * 55); },
  cash: () => { beep({ f: 660, dur: 0.08 }); setTimeout(() => beep({ f: 990, dur: 0.14 }), 80); },
  clunk: () => beep({ f: 120, f2: 50, dur: 0.25, type: 'sawtooth', vol: 0.12 }),
  honk: () => { beep({ f: 330, dur: 0.5, type: 'sawtooth', vol: 0.12 }); beep({ f: 415, dur: 0.5, type: 'sawtooth', vol: 0.08 }); },
  ting: () => beep({ f: 1760, f2: 1700, dur: 0.3, type: 'sine', vol: 0.08 }),
  beepboop: () => { beep({ f: 880, dur: 0.08 }); setTimeout(() => beep({ f: 440, dur: 0.12 }), 100); },
  pfft: () => beep({ f: 90, f2: 60, dur: 0.5, type: 'sawtooth', vol: 0.15 }),
  laugh: () => { for (let i = 0; i < 3; i++) setTimeout(() => beep({ f: 520 - i * 40, f2: 380, dur: 0.1, type: 'triangle', vol: 0.08 }), i * 140); },
};

const lam = (c) => new THREE.MeshLambertMaterial({ color: c });

export function createProps({ scene, onArc, radius, aMax }) {
  const items = []; // { hit, name, value?, info(), click() }
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const placeFacing = (obj, a, r) => { obj.position.copy(onArc(a, r)); obj.rotation.y = -a; scene.add(obj); };
  const hitBox = (grp, w, h, d, y = h / 2, z = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ visible: false })); m.position.set(0, y, z); grp.add(m); return m; };

  // ---- bunk bed + TV (right) ----
  const bunk = new THREE.Group();
  const frame = lam('#2f5fa8'), blanket = lam('#2a4f8f'), blanket2 = lam('#3d74c4'), sheet = lam('#c8cfd8');
  for (const x of [-1, 1]) for (const z of [-0.45, 0.45]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.3, 0.08), frame); p.position.set(x, 1.15, z); bunk.add(p); }
  [[0.45, blanket], [1.55, blanket2]].forEach(([y, mat]) => {
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.08, 1), frame); base.position.y = y; bunk.add(base);
    const mattress = new THREE.Mesh(new THREE.BoxGeometry(2, 0.18, 0.9), sheet); mattress.position.y = y + 0.13; bunk.add(mattress);
    const cover = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.06, 0.92), mat); cover.position.set(0.3, y + 0.24, 0); bunk.add(cover);
    const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.6), lam('#e6e0d0')); pillow.position.set(-0.75, y + 0.28, 0); bunk.add(pillow);
  });
  for (let i = 0; i < 5; i++) { const rung = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.3), frame); rung.position.set(1.05, 0.35 + i * 0.35, 0.3); rung.rotation.x = Math.PI / 2; bunk.add(rung); }
  placeFacing(bunk, -(aMax + 0.65), radius - 0.4);
  bunk.rotation.y += Math.PI / 2;
  items.push({ hit: hitBox(bunk, 2.2, 2.3, 1.1), name: 'Bunk bed', kind: 'bed',
    info: () => ({ title: 'BUNK BEDS', line: 'Sleep is not in the quota' }),
    click: () => ({ title: 'Rest denied', body: 'You may sleep after the quota is met. The quota is never met.' }) });

  const tv = new THREE.Group();
  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.6), lam('#5a4632')); stand.position.y = 0.35; tv.add(stand);
  const set = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.6), lam('#3a3a36')); set.position.y = 1.05; tv.add(set);
  const tvCanvas = Object.assign(document.createElement('canvas'), { width: 96, height: 72 });
  const tvTex = new THREE.CanvasTexture(tvCanvas); tvTex.magFilter = THREE.NearestFilter;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.5), new THREE.MeshBasicMaterial({ map: tvTex })); screen.position.set(0, 1.05, 0.301); tv.add(screen);
  for (const s of [-1, 1]) { const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.6, 5), lam('#999')); ant.position.set(s * 0.15, 1.6, 0); ant.rotation.z = s * -0.5; tv.add(ant); }
  const tvGlow = new THREE.PointLight('#9fd0ff', 0.9, 3, 1.5); tvGlow.position.set(0, 1.05, 0.7); tv.add(tvGlow);
  placeFacing(tv, aMax + 0.45, radius - 1.0);
  let tvOn = true, tvChannel = 0;
  const channels = ['TOYLING TV', 'BUY DUCKS', 'QUOTA: $∞', 'NO SIGNAL'];
  const drawTv = (t) => {
    const g = tvCanvas.getContext('2d');
    if (!tvOn) { g.fillStyle = '#050505'; g.fillRect(0, 0, 96, 72); tvTex.needsUpdate = true; return; }
    const cols = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'];
    cols.forEach((c, i) => { g.fillStyle = c; g.fillRect(i * 14, 0, 14, 72); });
    const img = g.getImageData(0, 0, 96, 72);
    for (let i = 0; i < img.data.length; i += 4) { const n = (Math.random() - 0.5) * 70; img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n; }
    g.putImageData(img, 0, 0);
    g.fillStyle = 'rgba(0,0,0,.7)'; g.fillRect(0, 26, 96, 20);
    g.fillStyle = '#ffb347'; g.font = 'bold 11px monospace'; g.textAlign = 'center'; g.fillText(channels[tvChannel], 48 + Math.sin(t * 2) * 4, 40);
    tvTex.needsUpdate = true;
  };
  items.push({ hit: hitBox(tv, 1, 1.5, 0.7), name: 'Television', kind: 'tv',
    info: () => ({ title: 'TELEVISION', line: tvOn ? 'Click to change channel' : 'Click to turn on' }),
    click() {
      const state = ((tvOn ? tvChannel : channels.length) + 1) % (channels.length + 1);
      tvOn = state < channels.length;
      tvChannel = tvOn ? state : 0;
      tvGlow.intensity = tvOn ? 0.9 : 0;
      sounds.clunk();
      return null;
    } });

  // ---- scrap: a different handful of Lethal Company items every visit, one of them under a spotlight ----
  const crate = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.4, 0.6), lam('#6b5536'));
  placeFacing(crate, 0.55, 3.2); crate.position.y = 0.2;
  const crateTop = (dx) => { const p = onArc(0.55, 3.2); const side = new THREE.Vector3(Math.cos(0.55), 0, Math.sin(0.55)); return p.addScaledVector(side, dx * 0.75).setY(0.4); };
  const [featuredKind, ...benchKinds] = pickScrap(4);
  const scrap = [];
  const addScrap = (kind, pos, yaw, scale = 1) => {
    const s2 = buildScrap(kind, sounds);
    s2.obj.position.copy(pos); s2.obj.rotation.y = yaw; s2.obj.scale.multiplyScalar(scale); scene.add(s2.obj);
    const it = { hit: hitBox(s2.obj, 0.5, 0.45, 0.5, 0.18), name: s2.name, kind: 'scrap', value: s2.value, obj: s2.obj, back: 0, anim: s2.anim,
      info: () => ({ title: s2.name.toUpperCase(), line: `Value: $${it.value}`, scrap: true }),
      click(now) {
        if (!s2.obj.visible) return null;
        s2.sound(); s2.obj.visible = false; it.back = now + 20000;
        const got = it.value; it.value = s2.value + Math.floor(Math.random() * 12);
        return { earned: got, title: s2.title, body: `Collected ${s2.name}. Sold for $${got}.` };
      } };
    items.push(it); scrap.push(it);
    return it;
  };
  // a warm work lamp over the bench so its items read clearly
  const benchPos = onArc(0.55, 3.2);
  const benchLamp = new THREE.SpotLight('#fff3dc', 14, 5, 0.55, 0.45, 1.1);
  benchLamp.position.set(benchPos.x, 2.6, benchPos.z + 0.6); benchLamp.target.position.set(benchPos.x, 0.4, benchPos.z);
  scene.add(benchLamp, benchLamp.target);
  const benchFill = new THREE.PointLight('#ffe8c8', 1.2, 2.2, 1.2); benchFill.position.set(benchPos.x, 0.9, benchPos.z + 0.5); scene.add(benchFill);
  benchKinds.forEach((k, i) => addScrap(k, crateTop(-0.45 + i * 0.45), 0.55 + Math.PI + (i - 1) * 0.4, 1.4));
  // the featured piece sits on the floor in front of you under its own light
  const featPos = onArc(-0.5, 2.6);
  const featured = addScrap(featuredKind, featPos, 0.5, 1.6);
  const spot = new THREE.SpotLight('#fff1d6', 9, 5, 0.32, 0.5, 1.2);
  spot.position.set(featPos.x, 3.2, featPos.z + 0.3); spot.target = featured.obj; scene.add(spot);

  // ---- the girl: shows up behind the machines if you stand still long enough ----
  // Cel-shaded with black outlines, red patterned dress, pale face, dark bob, arms held stiffly out and down.
  const girl = new THREE.Group();
  const flat = (c, map) => new THREE.MeshBasicMaterial({ color: c, map });
  const outline = new THREE.MeshBasicMaterial({ color: '#000', side: THREE.BackSide });
  const part = (geo, mat, pos, rot, scl, line = 1.06) => {
    const m = new THREE.Mesh(geo, mat); m.position.copy(pos); if (rot) m.rotation.set(...rot); if (scl) m.scale.set(...scl);
    if (line) { const o = new THREE.Mesh(geo, outline); o.scale.setScalar(line); m.add(o); }
    girl.add(m); return m;
  };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const skin = flat('#d9cbb4');
  const dressC = Object.assign(document.createElement('canvas'), { width: 128, height: 128 });
  { const g = dressC.getContext('2d'); g.fillStyle = '#a3262b'; g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 140; i++) { const x = Math.random() * 128, y = Math.random() * 128; g.fillStyle = ['#d8545c', '#6e1418', '#c9a95c', '#4f7f75', '#e6c2b8'][i % 5];
      g.beginPath(); g.ellipse(x, y, 2 + Math.random() * 3, 1 + Math.random() * 2, Math.random() * 3, 0, 7); g.fill(); } }
  const dressTex = new THREE.CanvasTexture(dressC); dressTex.wrapS = dressTex.wrapT = THREE.RepeatWrapping; dressTex.repeat.set(2, 2); dressTex.colorSpace = THREE.SRGBColorSpace;
  const dress = flat('#ffffff', dressTex);
  const faceC = Object.assign(document.createElement('canvas'), { width: 128, height: 128 });
  { const g = faceC.getContext('2d'); g.fillStyle = '#d9cbb4'; g.fillRect(0, 0, 128, 128);
    g.setTransform(0.42, 0, 0, 1, 64 * 0.58, 0); // the sphere wraps the whole width, so squeeze features to the front
    g.fillStyle = 'rgba(60,40,30,.55)'; g.beginPath(); g.ellipse(46, 58, 12, 8, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(82, 58, 12, 8, 0, 0, 7); g.fill(); // sunken eyes
    g.fillStyle = '#16100c'; g.beginPath(); g.ellipse(46, 59, 6, 4, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(82, 59, 6, 4, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(70,50,40,.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(64, 62); g.lineTo(60, 80); g.lineTo(67, 82); g.stroke(); // nose
    g.fillStyle = '#7a3a3a'; g.beginPath(); g.ellipse(64, 96, 12, 4, 0, 0, 7); g.fill(); // thin, slightly smiling lips
    g.strokeStyle = '#3a1a1a'; g.lineWidth = 2; g.beginPath(); g.moveTo(52, 95); g.quadraticCurveTo(64, 101, 76, 95); g.stroke(); }
  const faceTex = new THREE.CanvasTexture(faceC); faceTex.colorSpace = THREE.SRGBColorSpace;
  const hairM = flat('#3a2016');
  // dress: fitted bodice, flared skirt to below the knee, puffed short sleeves
  const skirtPts = [V(0.13, 0, 0), V(0.2, -0.2, 0), V(0.3, -0.5, 0), V(0.36, -0.68, 0), V(0.34, -0.7, 0)].map((p) => new THREE.Vector2(p.x, p.y));
  part(new THREE.LatheGeometry(skirtPts, 18), flat('#ffffff', dressTex), V(0, 0.98, 0), null, null, 0).material.side = THREE.DoubleSide;
  part(new THREE.CylinderGeometry(0.14, 0.13, 0.36, 14), dress, V(0, 1.16, 0), null, [1, 1, 0.75]);
  for (const sx of [-1, 1]) {
    part(new THREE.SphereGeometry(0.075, 10, 8), dress, V(sx * 0.15, 1.29, 0), null, [1.1, 0.9, 1]);
    // arms held out and down, slightly bent at the wrist
    part(new THREE.CylinderGeometry(0.026, 0.032, 0.5, 8), skin, V(sx * 0.37, 1.13, 0.02), [0, 0, sx * 1.05]);
    part(new THREE.BoxGeometry(0.06, 0.1, 0.025), skin, V(sx * 0.6, 1.0, 0.03), [0, 0, sx * 0.6]);
    part(new THREE.CylinderGeometry(0.035, 0.03, 0.26, 8), skin, V(sx * 0.07, 0.15, 0)); // legs
    part(new THREE.BoxGeometry(0.06, 0.03, 0.12), skin, V(sx * 0.07, 0.015, 0.03)); // bare feet
  }
  part(new THREE.CylinderGeometry(0.04, 0.045, 0.08, 8), skin, V(0, 1.37, 0));
  const headM = part(new THREE.SphereGeometry(0.12, 16, 14), flat('#ffffff', faceTex), V(0, 1.53, 0), null, [0.88, 1.12, 0.9]);
  headM.rotation.y = -Math.PI / 2; // face texture centre toward +z
  // dark bob with a centre parting, falling to the chin
  part(new THREE.SphereGeometry(0.135, 16, 12, Math.PI * 0.68, Math.PI * 1.64, 0, Math.PI * 0.72), hairM, V(0, 1.54, -0.005), null, [0.95, 1.18, 0.98], 1.03);
  for (const sx of [-1, 1]) part(new THREE.BoxGeometry(0.05, 0.22, 0.12), hairM, V(sx * 0.105, 1.45, 0.0), [0, 0, sx * 0.08], null, 1.04);
  girl.scale.setScalar(1.05);
  girl.visible = false;
  scene.add(girl);
  const ghost = {
    get visible() { return girl.visible; },
    obj: girl,
    show(angle, r = radius + 0.45) { girl.position.copy(onArc(angle, r)); girl.rotation.y = -angle; girl.visible = true; },
    hide() { girl.visible = false; },
  };

  let tvT = 0;
  function update(dt, t, now) {
    for (const it of scrap) {
      if (!it.obj.visible && now > it.back) it.obj.visible = true;
      if (!reduceMotion && it.obj.visible) it.anim(t, dt);
    }
    tvT += dt; if (tvT > 0.12) { tvT = 0; drawTv(t); }
  }
  return { items, update, ghost };
}

function labelTex(text, fg, bg) {
  const c = Object.assign(document.createElement('canvas'), { width: 256, height: 80 });
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 256, 80);
  for (let x = -40; x < 256; x += 32) { g.fillStyle = fg; g.beginPath(); g.moveTo(x, 80); g.lineTo(x + 14, 80); g.lineTo(x + 30, 66); g.lineTo(x + 16, 66); g.fill(); }
  g.fillStyle = fg; g.font = '900 40px "Courier New", monospace'; g.textAlign = 'center'; g.fillText(text, 128, 46);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
