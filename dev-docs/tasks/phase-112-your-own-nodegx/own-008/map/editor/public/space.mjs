// Space behind the fleet: a nebula sky, a starfield and a ringed planet, all drawn far away and
// moved with the camera (so they never come nearer), and space dust streaming past astern.
// The fleet holds formation and flies ahead (-z) at one speed; the dust going by is what shows it.

import * as THREE from 'three';

export const FLEET_SPEED = 45; // world units per second, the speed the dust streams past

export class Space {
  constructor(scene) {
    this.sky = new THREE.Group();
    scene.add(this.sky);
    this.sky.add(nebulaSphere());
    this.sky.add(starfield());
    this.sky.add(forestMoon());
    this.sky.add(deathStar());
    this.dust = dustField();
    scene.add(this.dust);
  }

  frame(camera, dt) {
    this.sky.position.copy(camera.position);
    // Dust in a box around the camera, streaming astern (+z); a mote that leaves the box comes back at the far side.
    const pos = this.dust.geometry.attributes.position;
    const half = DUST_BOX / 2;
    const c = camera.position;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i) + FLEET_SPEED * dt;
      if (z - c.z > half) z -= DUST_BOX;
      if (z - c.z < -half) z += DUST_BOX;
      if (x - c.x > half) x -= DUST_BOX;
      if (x - c.x < -half) x += DUST_BOX;
      if (y - c.y > half) y -= DUST_BOX;
      if (y - c.y < -half) y += DUST_BOX;
      pos.setXYZ(i, x, y, z);
    }
    pos.needsUpdate = true;
  }
}

const SKY_R = 5200;
const DUST_BOX = 700;

function nebulaSphere() {
  const c = document.createElement('canvas');
  c.width = 2048;
  c.height = 1024;
  const g = c.getContext('2d');
  g.fillStyle = '#02030a';
  g.fillRect(0, 0, c.width, c.height);
  const rand = mulberry(7);
  // Clouds: soft radial blobs in purples, blues and teal, laid on thickly along a band.
  const hues = ['rgba(120,60,200,', 'rgba(40,90,210,', 'rgba(30,150,170,', 'rgba(200,60,140,', 'rgba(70,40,140,'];
  for (let i = 0; i < 90; i++) {
    const x = rand() * c.width;
    const band = c.height * 0.5 + Math.sin((x / c.width) * Math.PI * 2) * c.height * 0.12;
    const y = band + (rand() - 0.5) * c.height * 0.35;
    const r = 60 + rand() * 260;
    const col = hues[Math.floor(rand() * hues.length)];
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `${col}${0.03 + rand() * 0.05})`); // faint: Star Wars space is mostly black
    grad.addColorStop(1, `${col}0)`);
    g.fillStyle = grad;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Faint background stars painted into the sky.
  for (let i = 0; i < 2500; i++) {
    const a = 0.2 + rand() * 0.5;
    g.fillStyle = `rgba(255,255,255,${a})`;
    g.fillRect(rand() * c.width, rand() * c.height, 1, 1);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.SphereGeometry(SKY_R, 48, 24), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false }));
  m.renderOrder = -10;
  return m;
}

function starfield() {
  const rand = mulberry(11);
  const n = 5000;
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const tints = [[1, 1, 1], [0.75, 0.85, 1], [1, 0.92, 0.75], [1, 0.8, 0.8]];
  for (let i = 0; i < n; i++) {
    const u = rand() * 2 - 1;
    const t = rand() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const r = SKY_R * 0.9;
    pos.set([r * s * Math.cos(t), r * u, r * s * Math.sin(t)], i * 3);
    const tint = tints[Math.floor(rand() * tints.length)];
    const b = 0.5 + rand() * 0.5;
    col.set([tint[0] * b, tint[1] * b, tint[2] * b], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ size: 2, sizeAttenuation: false, vertexColors: true, fog: false, depthWrite: false }));
  p.renderOrder = -9;
  return p;
}

/** A canvas texture of w × h painted by `paint(g, rand)`. */
function painted(w, h, seed, paint) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  paint(c.getContext('2d'), mulberry(seed), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** A forest moon: deep greens, a few lakes, swirls of white cloud, and a thin blue atmosphere. */
function forestMoon() {
  const group = new THREE.Group();
  const tex = painted(1024, 512, 21, (g, rand, w, h) => {
    g.fillStyle = '#2c5530';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      const x = rand() * w, y = rand() * h, r = 4 + rand() * 40;
      const shade = rand();
      g.fillStyle = shade < 0.45 ? 'rgba(24,62,30,0.5)' : shade < 0.85 ? 'rgba(70,110,52,0.45)' : 'rgba(40,80,110,0.55)';
      g.beginPath();
      g.ellipse(x, y, r * 1.6, r, rand() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }
    for (let i = 0; i < 160; i++) {
      const x = rand() * w, y = h * 0.1 + rand() * h * 0.8;
      g.fillStyle = `rgba(255,255,255,${0.12 + rand() * 0.3})`;
      g.beginPath();
      g.ellipse(x, y, 20 + rand() * 90, 4 + rand() * 12, (rand() - 0.5) * 0.4, 0, Math.PI * 2);
      g.fill();
    }
  });
  const moon = new THREE.Mesh(new THREE.SphereGeometry(900, 64, 32), new THREE.MeshLambertMaterial({ map: tex, fog: false }));
  group.add(moon);
  const air = new THREE.Mesh(
    new THREE.SphereGeometry(940, 64, 32),
    new THREE.MeshBasicMaterial({ color: '#7fb6ff', transparent: true, opacity: 0.12, side: THREE.BackSide, fog: false, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  group.add(air);
  group.position.set(-2300, -700, -3500);
  group.rotation.set(0.3, 0.5, 0.2);
  return group;
}

/** The battle station: a grey panelled sphere, its equatorial trench, and the superlaser dish in the northern half. */
function deathStar() {
  const tex = painted(1024, 512, 33, (g, rand, w, h) => {
    g.fillStyle = '#80858c';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5000; i++) {
      const v = 100 + Math.floor(rand() * 60);
      g.fillStyle = `rgb(${v},${v + 2},${v + 6})`;
      g.fillRect(rand() * w, rand() * h, 2 + rand() * 10, 1 + rand() * 4);
    }
    // Lines of latitude, and the trench round the equator.
    g.fillStyle = 'rgba(60,62,68,0.5)';
    for (let y = 16; y < h; y += 24) g.fillRect(0, y, w, 1);
    g.fillStyle = '#2b2d33';
    g.fillRect(0, h / 2 - 5, w, 10);
    g.fillStyle = 'rgba(255,230,170,0.6)';
    for (let i = 0; i < 400; i++) g.fillRect(rand() * w, rand() * h, 1, 1); // city lights
    // The superlaser dish: concentric rings round a darker bowl.
    const dx = w * 0.62, dy = h * 0.3, R = 62;
    const bowl = g.createRadialGradient(dx - 12, dy - 10, 4, dx, dy, R);
    bowl.addColorStop(0, '#9a9fa6');
    bowl.addColorStop(1, '#4d5057');
    g.fillStyle = bowl;
    g.beginPath();
    g.ellipse(dx, dy, R * 1.25, R, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(40,42,48,0.8)';
    for (let r = 12; r < R; r += 11) {
      g.beginPath();
      g.ellipse(dx, dy, r * 1.25, r, 0, 0, Math.PI * 2);
      g.stroke();
    }
    g.fillStyle = '#c9ffc8';
    g.beginPath();
    g.arc(dx, dy, 3, 0, Math.PI * 2);
    g.fill();
  });
  const ds = new THREE.Mesh(new THREE.SphereGeometry(330, 64, 32), new THREE.MeshLambertMaterial({ map: tex, fog: false }));
  ds.position.set(1700, 950, -3900);
  ds.rotation.y = -2.15; // turns the dish (painted at u = 0.62) to face the fleet, a little off-centre
  return ds;
}

function dustField() {
  const rand = mulberry(5);
  const n = 1400;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n * 3; i++) pos[i] = (rand() - 0.5) * DUST_BOX;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.35, color: '#a9b8ff', transparent: true, opacity: 0.5, depthWrite: false }));
  p.frustumCulled = false;
  return p;
}

function mulberry(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
