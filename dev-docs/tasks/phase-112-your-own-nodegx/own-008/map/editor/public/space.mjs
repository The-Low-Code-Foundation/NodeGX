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
    this.sky.add(planet());
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
    grad.addColorStop(0, `${col}${0.1 + rand() * 0.12})`);
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

function planet() {
  const group = new THREE.Group();
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g = c.getContext('2d');
  const rand = mulberry(3);
  // A gas giant: bands of ochre and rust.
  for (let y = 0; y < c.height; y += 4) {
    const k = 0.55 + 0.45 * Math.sin(y * 0.09 + rand() * 0.6);
    g.fillStyle = `rgb(${Math.round(150 + 80 * k)},${Math.round(95 + 60 * k)},${Math.round(60 + 40 * k)})`;
    g.fillRect(0, y, c.width, 4);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(520, 48, 32), new THREE.MeshLambertMaterial({ map: tex, fog: false }));
  group.add(ball);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(700, 1050, 96),
    new THREE.MeshBasicMaterial({ color: '#d9b98a', transparent: true, opacity: 0.35, side: THREE.DoubleSide, fog: false, depthWrite: false })
  );
  ring.rotation.x = Math.PI / 2.4;
  group.add(ring);
  group.position.set(-2600, 900, -3400);
  group.rotation.z = 0.35;
  // Its own sun, so the far side is in shadow whatever the fleet's lights do.
  const sun = new THREE.DirectionalLight('#fff2dd', 1.6);
  sun.position.set(1, 0.4, 0.6);
  sun.target = ball;
  group.add(sun);
  return group;
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
