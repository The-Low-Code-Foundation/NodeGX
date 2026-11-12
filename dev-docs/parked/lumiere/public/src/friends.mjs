// The castle's friends from round 2, drawn in code (SCOPE.md §8: "mini-games with funny castle characters"):
//   makeOwl()        Archivist Hoot, the Library's owl, in round spectacles (the reading nook)
//   makeFrog()       Maestro Fig, the Music Room's frog in a tailcoat, with a baton (the piano)
//   makeButterfly()  Madame Lune, the moonlight butterfly the Midnight Moth Queen turns back into (the ball)
// Each returns { group, update(dt, t), mood(name) }: `group` stands on its origin and faces +Z; `mood('happy')` makes
// it bounce (a right answer, a finished tune), `mood('think')` tilts its head, anything else is calm.
import * as THREE from 'three';
import { canvasTexture, glow } from './look.mjs';

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });
function sphere(r, mat, x = 0, y = 0, z = 0, parent, seg = 20) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75)), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent?.add(m);
  return m;
}
// An eye that looks about and blinks: a white ball, an iris, a pupil, a glint, and a lid that closes over it.
function eye(r, iris, parent, x, y, z, lidColour) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  sphere(r, std(0xffffff, { roughness: 0.25 }), 0, 0, 0, g);
  const look = new THREE.Group();
  g.add(look);
  const ir = sphere(r * 0.62, std(iris, { roughness: 0.3, emissive: iris, emissiveIntensity: 0.15 }), 0, 0, r * 0.52, look);
  ir.scale.z = 0.5;
  const pu = sphere(r * 0.34, std(0x120c10, { roughness: 0.2 }), 0, 0, r * 0.74, look);
  pu.scale.z = 0.5;
  sphere(r * 0.12, new THREE.MeshBasicMaterial({ color: 0xffffff }), r * 0.18, r * 0.2, r * 0.9, look, 8);
  const lid = new THREE.Mesh(new THREE.SphereGeometry(r * 1.06, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), std(lidColour));
  lid.rotation.x = -Math.PI / 2 + 0.2;
  lid.scale.setScalar(1);
  g.add(lid);
  return { g, look, lid };
}

// Blinking and glancing, shared by all three.
function blinker(eyes) {
  let next = 1.5, shut = 0, gaze = 0;
  return (dt, t) => {
    next -= dt;
    if (next < 0) {
      shut = 0.14;
      next = 2 + Math.random() * 3;
    }
    shut = Math.max(0, shut - dt);
    const closed = shut > 0 ? Math.sin((shut / 0.14) * Math.PI) : 0;
    gaze += dt;
    const gx = Math.sin(t * 0.7) * 0.25, gy = Math.sin(t * 0.45 + 1) * 0.12;
    for (const e of eyes) {
      e.lid.rotation.x = -Math.PI / 2 + 0.2 + closed * 1.9;
      e.look.rotation.set(gy, gx, 0);
    }
  };
}

// ── Archivist Hoot ────────────────────────────────────────────────────────────────────────────────────────────────
const featherTex = () =>
  canvasTexture(128, 128, (g, w, h) => {
    g.fillStyle = '#a07a58';
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < 9; y++)
      for (let x = 0; x < 9; x++) {
        g.fillStyle = (x + y) % 2 ? '#8a6446' : '#b48c68';
        g.beginPath();
        g.arc(x * 16 + (y % 2) * 8, y * 16, 9, 0, Math.PI);
        g.fill();
      }
  });
export function makeOwl() {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const brown = std(0xffffff, { map: featherTex(), roughness: 0.85 });
  const cream = std(0xf4e2c4, { roughness: 0.85 });
  const orange = std(0xf0a040, { roughness: 0.5 });
  const torso = sphere(0.17, brown, 0, 0.19, 0, body);
  torso.scale.set(1, 1.2, 0.95);
  const belly = sphere(0.13, cream, 0, 0.17, 0.07, body);
  belly.scale.set(1, 1.2, 0.6);
  const head = new THREE.Group();
  head.position.y = 0.4;
  body.add(head);
  const skull = sphere(0.15, brown, 0, 0, 0, head);
  skull.scale.set(1.12, 0.95, 0.95);
  for (const s of [-1, 1]) {
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.075, 24), cream);
    disc.position.set(s * 0.062, 0.0, 0.135);
    disc.rotation.y = s * 0.25;
    head.add(disc);
    const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.11, 8), brown);
    tuft.position.set(s * 0.11, 0.15, 0);
    tuft.rotation.z = -s * 0.45;
    head.add(tuft);
    const wing = sphere(0.12, brown, s * 0.16, 0.2, -0.01, body);
    wing.scale.set(0.35, 1.1, 0.85);
    wing.name = s < 0 ? 'wingL' : 'wingR';
    for (const t of [-1, 0, 1]) {
      const toe = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.04, 4, 6), orange);
      toe.rotation.x = Math.PI / 2;
      toe.position.set(s * 0.06 + t * 0.02, 0.012, 0.06);
      body.add(toe);
    }
  }
  const eyes = [-1, 1].map((s) => eye(0.045, 0xf2a019, head, s * 0.062, 0.005, 0.12, 0x9a7454));
  // Round gold spectacles: he is the archivist.
  const goldM = std(0xf3cf6b, { metalness: 0.85, roughness: 0.3 });
  for (const s of [-1, 1]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.006, 6, 24), goldM);
    rim.position.set(s * 0.062, 0.005, 0.175);
    head.add(rim);
  }
  const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.03, 6), goldM);
  bridge.rotation.z = Math.PI / 2;
  bridge.position.set(0, 0.02, 0.178);
  head.add(bridge);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.06, 8), orange);
  beak.rotation.x = Math.PI / 2 + 0.6;
  beak.position.set(0, -0.045, 0.16);
  head.add(beak);
  const wings = ['wingL', 'wingR'].map((n) => body.getObjectByName(n));
  const blink = blinker(eyes);
  let mood = 'calm', moodT = 0;
  return {
    group,
    mood(m) {
      mood = m;
      moodT = 0;
    },
    update(dt, t) {
      blink(dt, t);
      moodT += dt;
      const happy = mood === 'happy' && moodT < 1.6;
      body.position.y = happy ? Math.abs(Math.sin(moodT * 9)) * 0.06 : 0;
      for (const [i, w] of wings.entries()) w.rotation.z = (i ? -1 : 1) * (happy ? 0.3 + Math.sin(moodT * 22) * 0.5 : Math.sin(t * 1.3) * 0.03);
      // An owl turns its head about, now and then all the way to one side.
      head.rotation.z = mood === 'think' ? 0.35 : Math.sin(t * 0.6) * 0.08;
      head.rotation.y = Math.sin(t * 0.33) * 0.5 * Math.max(0, Math.sin(t * 0.21));
      body.scale.y = 1 + Math.sin(t * 2) * 0.012;
    }
  };
}

// ── Maestro Fig ───────────────────────────────────────────────────────────────────────────────────────────────────
export function makeFrog() {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const green = std(0x6cc24a, { roughness: 0.45 });
  const pale = std(0xd8f0a0, { roughness: 0.5 });
  const black = std(0x1a1622, { roughness: 0.55 });
  const white = std(0xffffff, { roughness: 0.6 });
  const torso = sphere(0.13, green, 0, 0.13, 0, body);
  torso.scale.set(1.15, 1, 0.95);
  const tum = sphere(0.1, white, 0, 0.12, 0.05, body);
  tum.scale.set(0.8, 1, 0.6);
  // The tailcoat: a black shell round the back, its tails hanging behind him.
  const coat = new THREE.Mesh(new THREE.SphereGeometry(0.14, 20, 14, Math.PI * 0.25, Math.PI * 1.5), black);
  coat.position.y = 0.13;
  coat.scale.set(1.18, 1.03, 1);
  coat.rotation.y = Math.PI;
  body.add(coat);
  for (const s of [-1, 1]) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.015), black);
    tail.position.set(s * 0.04, 0.03, -0.13);
    tail.rotation.set(0.25, 0, s * 0.1);
    body.add(tail);
  }
  const head = new THREE.Group();
  head.position.y = 0.27;
  body.add(head);
  const skull = sphere(0.12, green, 0, 0, 0, head);
  skull.scale.set(1.3, 0.8, 1);
  const chin = sphere(0.1, pale, 0, -0.03, 0.04, head);
  chin.scale.set(1.3, 0.6, 0.9);
  const eyes = [-1, 1].map((s) => {
    const bulb = sphere(0.06, green, s * 0.085, 0.08, 0.02, head);
    return eye(0.048, 0xb88a2a, head, s * 0.085, 0.085, 0.045, 0x5aa83c);
  });
  // A wide smile.
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.008, 6, 24, Math.PI * 0.8), std(0x2a4a20));
  smile.rotation.set(0, 0, Math.PI + Math.PI * 0.1);
  smile.position.set(0, 0.0, 0.105);
  smile.scale.y = 0.55;
  head.add(smile);
  // A red bow tie.
  const red = std(0xd8304a, { roughness: 0.45 });
  for (const s of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.05, 4), red);
    wing.rotation.z = s * Math.PI / 2;
    wing.position.set(s * 0.025, 0.205, 0.11);
    body.add(wing);
  }
  sphere(0.014, red, 0, 0.205, 0.115, body, 8);
  // Legs folded under him, an arm holding the baton up.
  for (const s of [-1, 1]) {
    const thigh = sphere(0.06, green, s * 0.11, 0.05, 0.03, body);
    thigh.scale.set(0.8, 0.6, 1.3);
    const foot = sphere(0.035, green, s * 0.13, 0.01, 0.12, body);
    foot.scale.set(1.3, 0.35, 1.2);
  }
  const arm = new THREE.Group();
  arm.position.set(0.13, 0.17, 0.03);
  body.add(arm);
  const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.08, 4, 8), black);
  fore.position.y = 0.05;
  arm.add(fore);
  sphere(0.025, green, 0, 0.11, 0, arm, 10);
  const baton = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.005, 0.16, 6), white);
  baton.position.set(0, 0.17, 0.03);
  baton.rotation.x = 0.4;
  arm.add(baton);
  const blink = blinker(eyes);
  let mood = 'calm', moodT = 0;
  return {
    group,
    mood(m) {
      mood = m;
      moodT = 0;
    },
    update(dt, t) {
      blink(dt, t);
      moodT += dt;
      const happy = mood === 'happy' && moodT < 1.8;
      // He conducts, all the time: a three-beat waltz with the baton.
      const beat = (t * 2.2) % 3;
      arm.rotation.z = -0.5 + Math.sin(t * 2.2 * Math.PI * (2 / 3)) * 0.35;
      arm.rotation.x = -0.2 + Math.cos(t * 2.2 * Math.PI * (2 / 3)) * 0.2;
      body.position.y = happy ? Math.abs(Math.sin(moodT * 8)) * 0.12 : beat < 0.15 ? 0.008 : 0;
      head.rotation.z = mood === 'think' ? -0.3 : Math.sin(t * 1.1) * 0.06;
      body.scale.set(1 + Math.sin(t * 3) * 0.015, 1 - Math.sin(t * 3) * 0.015, 1);
    }
  };
}

// ── Madame Lune ───────────────────────────────────────────────────────────────────────────────────────────────────
const wingTex = () =>
  canvasTexture(256, 256, (g, w, h) => {
    const grad = g.createRadialGradient(w * 0.15, h * 0.85, 10, w * 0.15, h * 0.85, w * 1.05);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.35, '#c8d8ff');
    grad.addColorStop(0.75, '#7a8af0');
    grad.addColorStop(1, '#2a2a80');
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(w * 0.05, h * 0.95);
    g.bezierCurveTo(w * 0.1, h * 0.1, w * 0.9, -h * 0.05, w * 0.95, h * 0.35);
    g.bezierCurveTo(w, h * 0.7, w * 0.4, h * 0.85, w * 0.05, h * 0.95);
    g.fill();
    g.fillStyle = 'rgba(255, 245, 200, 0.95)';
    for (const [x, y, r] of [[0.62, 0.3, 14], [0.78, 0.42, 9], [0.45, 0.45, 7]]) {
      g.beginPath();
      g.arc(w * x, h * y, r, 0, Math.PI * 2);
      g.fill();
    }
    g.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    g.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      g.beginPath();
      g.moveTo(w * 0.06, h * 0.94);
      g.lineTo(w * (0.4 + i * 0.12), h * (0.15 + i * 0.1));
      g.stroke();
    }
  });
export function makeButterfly() {
  const group = new THREE.Group();
  const body = new THREE.Group();
  body.position.y = 1.3;
  group.add(body);
  const tex = wingTex();
  const wm = new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.05, side: THREE.DoubleSide, roughness: 0.4, emissive: 0x8090ff, emissiveMap: tex, emissiveIntensity: 0.45 });
  const wings = [];
  for (const s of [-1, 1])
    for (const [up, size] of [[1, 0.5], [-1, 0.34]]) {
      const pivot = new THREE.Group();
      body.add(pivot);
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(size, size), wm);
      // The texture's root corner sits on the body; the wing spreads out to the side, up (fore) or down (hind).
      plane.position.set(s * size * 0.48, up * size * 0.45, 0);
      plane.scale.set(s, up, 1);
      pivot.add(plane);
      wings.push({ pivot, s });
    }
  const silver = std(0xdfe6ff, { metalness: 0.6, roughness: 0.3, emissive: 0x8fa0ff, emissiveIntensity: 0.3 });
  const thorax = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.22, 6, 10), silver);
  body.add(thorax);
  const headB = sphere(0.045, silver, 0, 0.17, 0, body, 14);
  const eyes = [-1, 1].map((s) => eye(0.022, 0x6a5adf, body, s * 0.03, 0.18, 0.03, 0xdfe6ff));
  for (const s of [-1, 1]) {
    const pts = [new THREE.Vector3(s * 0.01, 0.2, 0), new THREE.Vector3(s * 0.05, 0.3, 0.02), new THREE.Vector3(s * 0.1, 0.36, 0.0)];
    const ant = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, 0.004, 5), silver);
    body.add(ant);
    sphere(0.012, std(0xfff0b0, { emissive: 0xffe08a, emissiveIntensity: 2.2 }), s * 0.1, 0.36, 0, body, 8);
  }
  void headB;
  const halo = glow(0xa8b8ff, 1.4, 1.1);
  body.add(halo);
  const blink = blinker(eyes);
  let mood = 'calm', moodT = 0;
  return {
    group,
    mood(m) {
      mood = m;
      moodT = 0;
    },
    update(dt, t) {
      blink(dt, t);
      moodT += dt;
      const happy = mood === 'happy' && moodT < 2;
      const flap = Math.sin(t * (happy ? 16 : 7));
      for (const { pivot, s } of wings) pivot.rotation.y = s * (0.2 + flap * 0.65);
      // She floats in a slow figure of eight, higher when happy.
      body.position.set(Math.sin(t * 0.5) * 0.25, 1.3 + Math.sin(t * 1.0) * 0.1 + (happy ? 0.25 : 0), Math.sin(t * 1.0) * 0.12);
      body.rotation.z = Math.sin(t * 0.5) * 0.15;
    }
  };
}
