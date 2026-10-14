// Lethal Company-style scrap for the arcade floor. Each builder returns a small group (about knee height or less)
// plus its name, sale value, sound and a per-frame animation. The hub picks a different handful on every page load.
import * as THREE from 'three';

const lam = (c) => new THREE.MeshLambertMaterial({ color: c });
const mesh = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); return m; };

export function buildScrap(kind, sounds) {
  const B = BUILDERS[kind];
  return B(sounds);
}

const BUILDERS = {
  engine(sounds) {
    const engine = new THREE.Group();
    const grey = lam('#8a8e94'), dark = lam('#3c3f44'), red = lam('#9e1b22'), rim = lam('#5e0f14'), metal = lam('#b9bcc0'), wire = lam('#c9b23a');
    const block = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.9, 1.1), grey); block.position.y = 1.05; engine.add(block);
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.6, 0.25), dark); back.position.set(0.05, 1.1, -0.6); engine.add(back);
    for (const x of [-0.32, 0.32]) { // twin exhaust stacks on top
      const stackM = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.55, 14, 1, true), dark); stackM.position.set(x, 2.25, -0.1); engine.add(stackM);
      const hole = new THREE.Mesh(new THREE.CircleGeometry(0.27, 14), lam('#0c0c0d')); hole.rotation.x = -Math.PI / 2; hole.position.set(x, 2.4, -0.1); engine.add(hole);
      const cap = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 6, 16), grey); cap.rotation.x = Math.PI / 2; cap.position.set(x, 2.52, -0.1); engine.add(cap);
    }
    for (const y of [0.65, 1.45]) { // red discs on the side
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.12, 18), red); disc.rotation.z = Math.PI / 2; disc.position.set(0.8, y, 0.05); engine.add(disc);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.05, 6, 18), rim); ring.rotation.y = Math.PI / 2; ring.position.set(0.86, y, 0.05); engine.add(ring);
    }
    const fins = [];
    for (let col = 0; col < 3; col++) for (let row = 0; row < 2; row++) { // cooling fins on the front
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.7, 0.3), dark); fin.position.set(-0.45 + col * 0.45, 0.6 + row * 0.85, 0.65); engine.add(fin); fins.push(fin);
    }
    const rods = [];
    for (const y of [0.55, 1.05, 1.55]) { // long rods poking through, with small spoked wheels at the ends
      const rodG = new THREE.Group();
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.4, 6), metal); rod.rotation.z = Math.PI / 2; rodG.add(rod);
      for (const x of [-1.15, 1.15]) {
        const wheel = new THREE.Group();
        for (let k = 0; k < 6; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.26, 0.02), metal); sp.rotation.x = (k / 6) * Math.PI; wheel.add(sp); }
        wheel.position.x = x; rodG.add(wheel);
      }
      rodG.position.set(0, y, 0.85); engine.add(rodG); rods.push(rodG);
    }
    const wireCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.75, 1.8, 0.2), new THREE.Vector3(-1.05, 1.3, 0.3), new THREE.Vector3(-0.9, 0.5, 0.6), new THREE.Vector3(-0.3, 0.15, 0.9)]);
    engine.add(new THREE.Mesh(new THREE.TubeGeometry(wireCurve, 20, 0.025, 5), wire));
    const wire2 = new THREE.CatmullRomCurve3([new THREE.Vector3(0.6, 2.0, -0.3), new THREE.Vector3(1.0, 1.9, 0.4), new THREE.Vector3(0.95, 1.0, 0.7)]);
    engine.add(new THREE.Mesh(new THREE.TubeGeometry(wire2, 16, 0.02, 5), wire));
    engine.scale.setScalar(0.17);
    const g = new THREE.Group(); g.add(engine);
    let kick = 0;
    return { obj: g, name: 'Engine', value: 42, sound: () => { sounds.clunk(); kick = 1; }, title: 'Heavy!',
      anim(t, dt) { kick = Math.max(0, kick - dt * 1.5);
        rods.forEach((r, i) => { r.position.x = Math.sin(t * 7 + i * 2) * (0.04 + kick * 0.15); r.children.slice(1).forEach((w) => (w.rotation.x += dt * 3)); });
        fins.forEach((f, i) => (f.rotation.z = Math.sin(t * 30 + i) * 0.02));
        engine.position.y = Math.sin(t * 40) * 0.02; } };
  },
  duck(sounds) {
    const duck = new THREE.Group();
    const yellow = lam('#ffd21f'), orange = lam('#ff8a1c');
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), yellow); body.scale.set(1.25, 0.9, 1); body.position.y = 0.14; duck.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), yellow); head.position.set(0.12, 0.3, 0); duck.add(head);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.1, 8), orange); beak.position.set(0.23, 0.29, 0); beak.rotation.z = -Math.PI / 2; duck.add(beak);
    for (const z of [-0.05, 0.05]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 4), lam('#111')); eye.position.set(0.19, 0.34, z); duck.add(eye); }
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.12, 6), yellow); tail.position.set(-0.2, 0.2, 0); tail.rotation.z = 1.1; duck.add(tail);
    return { obj: duck, name: 'Rubber ducky', value: 24, sound: sounds.squeak, title: 'Squeak!', anim(t) { duck.rotation.z = Math.sin(t * 1.3) * 0.05; } };
  },
  teeth(sounds) {
    const teeth = new THREE.Group();
    const gum = lam('#e46a7c'), tooth = lam('#f6f2e4'), feet = lam('#f0a020');
    const lower = new THREE.Group(), upper = new THREE.Group();
    const lowGum = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 0.2), gum); lower.add(lowGum);
    const upGum = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 0.2), gum); upper.add(upGum);
    for (let i = 0; i < 6; i++) {
      const t1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.04), tooth); t1.position.set(-0.11 + i * 0.044, 0.05, 0.08); lower.add(t1);
      const t2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.04), tooth); t2.position.set(-0.11 + i * 0.044, -0.05, 0.08); upper.add(t2);
    }
    lower.position.y = 0.09; upper.position.set(0, 0.2, -0.08);
    const jawPivot = new THREE.Group(); jawPivot.position.set(0, 0.12, -0.09); upper.position.set(0, 0.08, 0.01); jawPivot.add(upper);
    teeth.add(lower, jawPivot);
    for (const x of [-0.08, 0.08]) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.04, 0.12), feet); f.position.set(x, 0.02, 0); teeth.add(f); }
    const key = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 5, 10), lam('#c9c9c9')); key.position.set(0, 0.16, -0.16); teeth.add(key);
    const g = new THREE.Group(); g.add(teeth);
    return { obj: g, name: 'Chattering teeth', value: 31, sound: sounds.chatter, title: 'Chatter chatter',
      anim(t) { jawPivot.rotation.x = -Math.abs(Math.sin(t * 18)) * 0.5; teeth.position.y = Math.abs(Math.sin(t * 9)) * 0.03; teeth.rotation.z = Math.sin(t * 9) * 0.06; } };
  },
  bolt(sounds) {
    const g = new THREE.Group(), steel = lam('#9aa0a6');
    g.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.45, 10), steel, 0, 0.05, 0, 0, 0, Math.PI / 2));
    g.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 6), steel, -0.26, 0.05, 0, 0, 0, Math.PI / 2));
    for (let i = 0; i < 8; i++) g.add(mesh(new THREE.TorusGeometry(0.052, 0.008, 4, 10), lam('#7d8389'), -0.15 + i * 0.045, 0.05, 0, 0, Math.PI / 2));
    return { obj: g, name: 'Big bolt', value: 36, sound: sounds.clunk, title: 'Clank', anim() {} };
  },
  airhorn(sounds) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.16, 12), lam('#c62828'), 0, 0.08, 0));
    g.add(mesh(new THREE.ConeGeometry(0.09, 0.22, 14, 1, true), lam('#e0e0e0'), 0, 0.2, 0.1, Math.PI / 2 + 0.3));
    g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 8), lam('#222'), 0, 0.18, 0));
    return { obj: g, name: 'Airhorn', value: 52, sound: () => sounds.honk(), title: 'HOOONK', anim() {} };
  },
  mug(sounds) {
    const g = new THREE.Group(), c = lam(['#e8e1d0', '#3a6ea5', '#b23a48'][Math.floor(Math.random() * 3)]);
    g.add(mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.15, 14), c, 0, 0.075, 0));
    g.add(mesh(new THREE.TorusGeometry(0.04, 0.012, 6, 10, Math.PI), c, 0.075, 0.08, 0, 0, 0, -Math.PI / 2));
    g.add(mesh(new THREE.CircleGeometry(0.062, 14), lam('#3b2414'), 0, 0.14, 0, -Math.PI / 2));
    return { obj: g, name: 'Coffee mug', value: 18, sound: () => sounds.ting(), title: 'Ting', anim() {} };
  },
  goldbar(sounds) {
    const g = new THREE.Group();
    const bar = mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.07, 4), new THREE.MeshPhongMaterial({ color: '#e6b422', shininess: 80, specular: '#fff3b0' }), 0, 0.035, 0, 0, Math.PI / 4);
    bar.scale.set(1.6, 1, 0.8); g.add(bar);
    return { obj: g, name: 'Gold bar', value: 140, sound: sounds.cash, title: 'Jackpot', anim() {} };
  },
  robot(sounds) {
    const g = new THREE.Group(), tin = lam('#8fb8c9'), red = lam('#c0392b');
    g.add(mesh(new THREE.BoxGeometry(0.14, 0.16, 0.1), tin, 0, 0.16, 0));
    const headR = mesh(new THREE.BoxGeometry(0.11, 0.09, 0.09), tin, 0, 0.29, 0); g.add(headR);
    for (const x of [-0.025, 0.025]) g.add(mesh(new THREE.SphereGeometry(0.012, 6, 4), red, x, 0.3, 0.046));
    g.add(mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.06, 4), tin, 0, 0.36, 0));
    for (const x of [-0.04, 0.04]) g.add(mesh(new THREE.BoxGeometry(0.04, 0.08, 0.05), tin, x, 0.04, 0));
    const arms = [-1, 1].map((s) => { const a = mesh(new THREE.BoxGeometry(0.03, 0.12, 0.03), tin, s * 0.09, 0.17, 0); g.add(a); return a; });
    return { obj: g, name: 'Toy robot', value: 64, sound: () => sounds.beepboop(), title: 'Beep boop',
      anim(t) { arms.forEach((a, i) => (a.rotation.x = Math.sin(t * 4 + i * Math.PI) * 0.5)); headR.rotation.y = Math.sin(t * 1.5) * 0.4; } };
  },
  magnifier(sounds) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.TorusGeometry(0.08, 0.012, 6, 18), lam('#2b2b2b'), 0, 0.012, 0, Math.PI / 2));
    g.add(mesh(new THREE.CircleGeometry(0.075, 18), new THREE.MeshPhongMaterial({ color: '#cfe8ff', transparent: true, opacity: 0.4, shininess: 100 }), 0, 0.014, 0, -Math.PI / 2));
    g.add(mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.15, 8), lam('#6b3f1d'), 0.15, 0.014, 0, 0, 0, Math.PI / 2));
    return { obj: g, name: 'Magnifying glass', value: 28, sound: () => sounds.ting(), title: 'Hmm', anim() {} };
  },
  pickles(sounds) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.2, 14), new THREE.MeshPhongMaterial({ color: '#c8e6a0', transparent: true, opacity: 0.55 }), 0, 0.1, 0));
    for (let i = 0; i < 4; i++) g.add(mesh(new THREE.CapsuleGeometry(0.02, 0.1, 2, 6), lam('#5d7f2b'), -0.03 + (i % 2) * 0.05, 0.09, -0.02 + (i > 1 ? 0.04 : 0), 0.2 * i));
    g.add(mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.03, 14), lam('#b0b0b0'), 0, 0.215, 0));
    return { obj: g, name: 'Jar of pickles', value: 22, sound: () => sounds.ting(), title: 'Crunchy', anim() {} };
  },
  cushion(sounds) {
    const g = new THREE.Group();
    const c = mesh(new THREE.SphereGeometry(0.12, 14, 10), lam('#e84d8a'), 0, 0.03, 0); c.scale.set(1, 0.28, 1); g.add(c);
    g.add(mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.06, 8), lam('#e84d8a'), 0.13, 0.03, 0, 0, 0, Math.PI / 2));
    return { obj: g, name: 'Whoopie cushion', value: 12, sound: () => sounds.pfft(), title: 'Pfffbbt', anim() {} };
  },
  mask(sounds) {
    const g = new THREE.Group();
    const face = mesh(new THREE.SphereGeometry(0.11, 14, 10, 0, Math.PI), lam('#e8dcc4'), 0, 0.12, 0); face.scale.set(1, 1.25, 0.6); g.add(face);
    for (const x of [-0.04, 0.04]) g.add(mesh(new THREE.SphereGeometry(0.018, 6, 4), lam('#111'), x, 0.15, 0.06));
    g.add(mesh(new THREE.TorusGeometry(0.035, 0.008, 4, 10, Math.PI), lam('#111'), 0, 0.08, 0.062, 0, 0, Math.PI));
    return { obj: g, name: 'Comedy mask', value: 47, sound: () => sounds.laugh(), title: 'Heh heh', anim(t) { face.rotation.y = Math.sin(t * 0.8) * 0.1; } };
  },
};
export const SCRAP_KINDS = Object.keys(BUILDERS);

/** Fisher-Yates pick of n different kinds. */
export function pickScrap(n, rnd = Math.random) {
  const k = [...SCRAP_KINDS];
  for (let i = k.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [k[i], k[j]] = [k[j], k[i]]; }
  return k.slice(0, n);
}
