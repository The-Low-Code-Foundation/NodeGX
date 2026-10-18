// The ships of the map, built from blocks (voxels) for a simple, Minecraft-like look.
//
// A component is a capital ship: its deck is the plate its nodes sit on, and the hull is built
// around and under the deck. The bow points -z (ahead), the engines glow at +z (astern). Two sides,
// three sizes each, chosen by how many nodes the component has:
//   Empire: small = light cruiser (plain wedge), medium = Victory-style wedge with a low tower,
//           large = Star Destroyer (wedge, stepped superstructure, bridge tower, two shield domes).
//   Rebels: small = Corellian corvette (hammerhead bow, long hull, a wall of red engines),
//           medium = Nebulon-B frigate (front hull, thin neck, engine block, hanging pod),
//           large = Mon Calamari cruiser (rounded, lumpy hull, a ring of blue engines).
// Each design is seeded by the component's key, so the same app always gets the same fleet.
//
// Fighters (TIE fighters, X-wings) are small block models with their nose at +z (Object3D.lookAt).

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const SIDES = { empire: 'empire', rebels: 'rebels' };

/** A small deterministic random stream (mulberry32) from a string. */
export function seeded(text) {
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BLOCK = 1.5; // the voxel grid: widths snap to it, so slopes come out as stairs
const snap = (v) => Math.max(BLOCK, Math.round(v / BLOCK) * BLOCK);

const hullMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
const glowMaterial = new THREE.MeshBasicMaterial({ vertexColors: true });

/** Collects boxes into two merged meshes: the hull (lit) and the glowing bits (engines, windows). */
class Voxels {
  constructor(rand) {
    this.rand = rand;
    this.hull = [];
    this.glow = [];
  }

  /** A box from corner to corner, in one colour with a little per-block variation (the Minecraft look). */
  box(x0, y0, z0, x1, y1, z1, color, { glow = false, vary = 0.08 } = {}) {
    const w = Math.abs(x1 - x0), h = Math.abs(y1 - y0), d = Math.abs(z1 - z0);
    if (w < 0.01 || h < 0.01 || d < 0.01) return;
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    const c = new THREE.Color(color);
    if (vary) c.multiplyScalar(1 - vary + this.rand() * vary * 2);
    const n = g.attributes.position.count;
    const colors = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) colors.set([c.r, c.g, c.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    (glow ? this.glow : this.hull).push(g);
  }

  build() {
    const group = new THREE.Group();
    for (const [list, mat] of [[this.hull, hullMaterial], [this.glow, glowMaterial]]) {
      if (!list.length) continue;
      const merged = mergeGeometries(list);
      for (const g of list) g.dispose();
      const mesh = new THREE.Mesh(merged, mat);
      mesh.userData.sharedMaterial = true;
      group.add(mesh);
    }
    return group;
  }
}

/** The ship's size class from its component's node count and the project's terciles. */
export function shipClass(count, t1, t2) {
  return count <= t1 ? 'small' : count <= t2 ? 'medium' : 'large';
}

/**
 * Designs one capital ship around a deck W × D (world units; deck-local x ∈ [0, W], z ∈ [0, D],
 * deck top at y = 0). Returns { group, bbox, turrets, engines, hull, deckColor }:
 * group is in deck-local coordinates; turrets are muzzle points; engines are { at, size, color }
 * for glow sprites; hull is the box lasers aim at.
 */
export function designShip(side, cls, W, D, seed) {
  const rand = seeded(seed);
  const v = new Voxels(rand);
  const ship = side === SIDES.empire ? empireShip(v, cls, W, D, rand) : rebelShip(v, cls, W, D, rand);
  const group = v.build();
  // Turret blocks: a base and a barrel pointing out over the side.
  const tv = new Voxels(rand);
  for (const t of ship.turrets) {
    const s = t.size;
    tv.box(t.at.x - s, t.at.y - 0.2, t.at.z - s, t.at.x + s, t.at.y + s * 1.1, t.at.z + s, ship.turretColor);
    const out = t.out;
    tv.box(t.at.x + (out > 0 ? s * 0.6 : -s * 2.6), t.at.y + s * 0.4, t.at.z - s * 0.18, t.at.x + (out > 0 ? s * 2.6 : -s * 0.6), t.at.y + s * 0.75, t.at.z + s * 0.18, '#3a3d42');
    t.muzzle = new THREE.Vector3(t.at.x + out * s * 2.6, t.at.y + s * 0.6, t.at.z);
  }
  group.add(...tv.build().children);
  const bbox = new THREE.Box3().setFromObject(group);
  return { group, bbox, turrets: ship.turrets, engines: ship.engines, hull: ship.hull, deckColor: ship.deckColor };
}

const MIN_WIDTH = { small: 28, medium: 52, large: 86 };

function turretsAlong(list, W, D, ledge, y, perSide, size) {
  for (let i = 0; i < perSide; i++) {
    const z = D * ((i + 0.5) / perSide);
    list.push({ at: new THREE.Vector3(-ledge * 0.55, y, z), out: -1, size });
    list.push({ at: new THREE.Vector3(W + ledge * 0.55, y, z), out: 1, size });
  }
}

// --- the Empire ---------------------------------------------------------------------------

function empireShip(v, cls, W, D, rand) {
  const grey = '#a7abb1';
  const dark = '#7d8288';
  const ledge = cls === 'large' ? 7 : 5;
  const HW = snap(Math.max(W + ledge * 2, MIN_WIDTH[cls]));
  const cx = W / 2;
  const T = snap(4 + HW * (cls === 'large' ? 0.14 : 0.1)); // hull thickness
  const bowLen = HW * (cls === 'small' ? 0.75 : 0.95);
  const tip = -bowLen - 2;
  const rearLen = { small: 9, medium: 15, large: 24 }[cls];
  const zEnd = D + rearLen;
  const maxW = HW * (cls === 'large' ? 1.3 : 1.15);
  const STEP = 3;
  let widest = HW;
  for (let z = tip; z < zEnd; z += STEP) {
    const zm = z + STEP / 2;
    let w = zm < 0 ? (HW * (zm - tip)) / -tip : Math.min(maxW, HW + (zm * (maxW - HW)) / Math.max(D + rearLen, 1));
    w = snap(w);
    widest = Math.max(widest, w);
    // The upper wedge, its top just under the deck; the lower wedge narrower: the Star Destroyer's double hull.
    v.box(cx - w / 2, -T * 0.55, z, cx + w / 2, -0.12, z + STEP, grey);
    v.box(cx - (w * 0.7) / 2, -T, z, cx + (w * 0.7) / 2, -T * 0.55, z + STEP, dark);
    // The seam between the two wedges.
    v.box(cx - w / 2 + 0.3, -T * 0.6, z, cx + w / 2 - 0.3, -T * 0.5, z + STEP, '#5d6167', { vary: 0 });
    // Greebles on the hull top outside the deck: the city-like surface.
    if (zm < -1 || zm > D + 1 || w > W + 2) {
      const n = Math.floor(w / 16);
      for (let i = 0; i < n; i++) {
        const x = cx - w / 2 + 1 + rand() * (w - 2);
        if (zm >= 0 && zm <= D && x > -0.5 && x < W + 0.5) continue; // never on the deck
        const s = 0.6 + rand() * 1.4;
        v.box(x - s / 2, -0.12, zm - s / 2, x + s / 2, -0.12 + 0.4 + rand() * 0.9, zm + s / 2, rand() < 0.5 ? grey : dark);
      }
    }
  }
  // The superstructure astern of the deck.
  if (cls !== 'small') {
    const z0 = D + 1;
    const z1 = zEnd - 2;
    const w1 = snap(HW * 0.5);
    v.box(cx - w1 / 2, -0.12, z0, cx + w1 / 2, 3, z1, grey);
    const w2 = snap(w1 * 0.6);
    v.box(cx - w2 / 2, 3, z0 + 2, cx + w2 / 2, 6, z1, dark);
    // The bridge tower and its wide flat bridge.
    const towerH = cls === 'large' ? 11 : 7;
    v.box(cx - 1.5, 6, z1 - 6, cx + 1.5, towerH, z1 - 2, grey);
    const bw = cls === 'large' ? HW * 0.32 : HW * 0.2;
    v.box(cx - bw / 2, towerH, z1 - 6.5, cx + bw / 2, towerH + 2, z1 - 1.5, grey);
    v.box(cx - bw / 2 + 0.5, towerH + 0.6, z1 - 6.6, cx + bw / 2 - 0.5, towerH + 1.2, z1 - 6.4, '#cfe8ff', { glow: true, vary: 0 }); // bridge windows
    if (cls === 'large') {
      for (const sx of [-1, 1]) {
        const dx = cx + sx * (bw / 2 - 1.5);
        v.box(dx - 1.4, towerH + 2, z1 - 5, dx + 1.4, towerH + 4.6, z1 - 2.4, '#b8bcc2'); // the shield domes, in blocks
        v.box(dx - 0.9, towerH + 4.6, z1 - 4.5, dx + 0.9, towerH + 5.3, z1 - 2.9, '#b8bcc2');
      }
    }
  }
  // Engines on the stern: blocks with glowing faces.
  const engines = [];
  const big = { small: 2, medium: 3, large: 3 }[cls];
  const es = snap(T * (cls === 'large' ? 0.62 : 0.55));
  const wEnd = snap(Math.min(maxW, HW + ((D + rearLen) * (maxW - HW)) / Math.max(D + rearLen, 1)));
  for (let i = 0; i < big; i++) {
    const x = cx + (i - (big - 1) / 2) * (es * 1.5);
    const y = -T * 0.42;
    v.box(x - es / 2, y - es / 2, zEnd, x + es / 2, y + es / 2, zEnd + 2, '#6c7076');
    v.box(x - es * 0.38, y - es * 0.38, zEnd + 2, x + es * 0.38, y + es * 0.38, zEnd + 2.3, '#bfe6ff', { glow: true, vary: 0 });
    engines.push({ at: new THREE.Vector3(x, y, zEnd + 2.6), size: es * 2.6, color: '#7cc8ff' });
  }
  if (cls === 'large') {
    for (const sx of [-1, 1]) {
      for (const k of [1.4, 2.3]) {
        const x = cx + sx * es * k * 1.1;
        const y = -T * 0.78;
        v.box(x - es * 0.22, y - es * 0.22, zEnd - 1, x + es * 0.22, y + es * 0.22, zEnd + 1.2, '#bfe6ff', { glow: true, vary: 0 });
        engines.push({ at: new THREE.Vector3(x, y, zEnd + 1.5), size: es * 1.2, color: '#7cc8ff' });
      }
    }
  }
  const turrets = [];
  turretsAlong(turrets, W, D, Math.max(ledge, (HW - W) / 2), -0.12, { small: 2, medium: 3, large: 4 }[cls], cls === 'large' ? 1.3 : 1);
  return {
    turrets,
    engines,
    turretColor: '#8d9298',
    deckColor: '#4a4f57',
    hull: { x0: cx - widest / 2, x1: cx + widest / 2, y0: -T, y1: -0.5, z0: tip * 0.5, z1: zEnd }
  };
}

// --- the Rebels ---------------------------------------------------------------------------

function rebelShip(v, cls, W, D, rand) {
  if (cls === 'large') return monCalamari(v, W, D, rand);
  if (cls === 'medium') return nebulonB(v, W, D, rand);
  return corvette(v, W, D, rand);
}

function monCalamari(v, W, D, rand) {
  const body = '#8a95a6';
  const dark = '#6b7586';
  const ledge = 7;
  const HW = Math.max(W + ledge * 2, MIN_WIDTH.large);
  const cx = W / 2;
  const zc = D / 2;
  const h = D / 2 + 6;
  const a = h / 0.8; // the hull's half-length: the deck's ends sit where the hull is still HW wide
  const b = HW / 2 / Math.sqrt(1 - 0.64);
  const T = snap(8 + HW * 0.12);
  const STEP = 3;
  let widest = 0;
  for (let z = zc - a; z < zc + a; z += STEP) {
    const zm = z + STEP / 2;
    const k = Math.max(0, 1 - ((zm - zc) / a) ** 2);
    const half = b * Math.sqrt(k);
    if (half < 1) continue;
    widest = Math.max(widest, half * 2);
    // Rounded belly: layers narrowing as they go down.
    const layers = 4;
    for (let l = 0; l < layers; l++) {
      const f = Math.sqrt(1 - (l / layers) ** 2);
      const hw = snap(half * f * 2) / 2;
      v.box(cx - hw, -((l + 1) * T) / layers, z, cx + hw, l === 0 ? -0.12 : -(l * T) / layers, z + STEP, l % 2 ? dark : body);
    }
    // Lumps and bulges along the sides: the organic Mon Calamari hull.
    if (rand() < 0.55) {
      const sx = rand() < 0.5 ? -1 : 1;
      const s = 1.5 + rand() * 3;
      const x = cx + sx * (half - s * 0.3);
      v.box(x - s / 2, -T * 0.5 - s / 2, zm - s, x + s / 2, -T * 0.5 + s / 2, zm + s, rand() < 0.5 ? body : dark);
    }
    // Lit portholes along the sides.
    if (rand() < 0.35) {
      for (const sx of [-1, 1]) v.box(cx + sx * half - 0.2, -T * 0.35, zm - 0.4, cx + sx * half + 0.2, -T * 0.28, zm + 0.4, '#fff2b0', { glow: true, vary: 0 });
    }
  }
  const zEnd = zc + a;
  const engines = [];
  const ring = 7;
  const r = Math.min(b * 0.35, T * 0.9);
  for (let i = 0; i < ring; i++) {
    const ang = (i / ring) * Math.PI * 2;
    const x = cx + Math.cos(ang) * r;
    const y = -T * 0.5 + Math.sin(ang) * r * 0.5;
    const s = T * 0.22;
    v.box(x - s, y - s, zEnd - 6, x + s, y + s, zEnd + 0.5, '#5d6676');
    v.box(x - s * 0.7, y - s * 0.7, zEnd + 0.5, x + s * 0.7, y + s * 0.7, zEnd + 0.8, '#d6f0ff', { glow: true, vary: 0 });
    engines.push({ at: new THREE.Vector3(x, y, zEnd + 1.2), size: s * 4.5, color: '#8fd3ff' });
  }
  const turrets = [];
  turretsAlong(turrets, W, D, Math.max(ledge, (HW - W) / 2) * 0.8, -0.12, 4, 1.3);
  return { turrets, engines, turretColor: '#9aa4b3', deckColor: '#525a66', hull: { x0: cx - widest / 2, x1: cx + widest / 2, y0: -T, y1: -0.5, z0: zc - a * 0.8, z1: zEnd } };
}

function nebulonB(v, W, D, rand) {
  const white = '#dcd8cf';
  const grey = '#b9b5ad';
  const red = '#a8352d';
  const ledge = 5;
  const HW = snap(Math.max(W + ledge * 2, MIN_WIDTH.medium));
  const cx = W / 2;
  const T = snap(5 + HW * 0.09);
  const bow = HW * 0.4;
  const STEP = 3;
  // The front hull, holding the deck, its bow tapering.
  for (let z = -bow - 2; z < D + 3; z += STEP) {
    const zm = z + STEP / 2;
    const w = snap(zm < 0 ? HW * (0.55 + (0.45 * (zm + bow + 2)) / (bow + 2)) : HW);
    v.box(cx - w / 2, -T * 0.6, z, cx + w / 2, -0.12, z + STEP, white);
    v.box(cx - w * 0.4, -T, z, cx + w * 0.4, -T * 0.6, z + STEP, grey);
    v.box(cx - w / 2 - 0.05, -T * 0.42, z, cx - w / 2 + 0.3, -T * 0.3, z + STEP, red, { vary: 0 }); // the red stripe
    v.box(cx + w / 2 - 0.3, -T * 0.42, z, cx + w / 2 + 0.05, -T * 0.3, z + STEP, red, { vary: 0 });
  }
  // The thin neck, stepping down as it goes aft.
  const neck = Math.max(26, D * 0.45);
  const zN0 = D + 3;
  for (let i = 0, z = zN0; z < zN0 + neck; z += STEP, i++) {
    const drop = Math.min(T * 0.8, i * 0.4);
    v.box(cx - 1.4, -T * 0.55 - drop, z, cx + 1.4, -T * 0.55 - drop + 2.4, z + STEP, grey);
  }
  // The engine block, taller than the hull.
  const zE0 = zN0 + neck;
  const zEnd = zE0 + 12;
  const ew = snap(HW * 0.45);
  v.box(cx - ew / 2, -T * 2, zE0, cx + ew / 2, T * 0.5, zEnd, white);
  v.box(cx - ew / 2 - 0.1, -T * 0.9, zE0, cx + ew / 2 + 0.1, -T * 0.7, zEnd, red, { vary: 0 });
  const engines = [];
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      const x = cx + (c - 1) * (ew / 3.2);
      const y = -T * 1.5 + r * T * 1.2;
      const s = Math.min(ew / 8, T * 0.4);
      v.box(x - s, y - s, zEnd, x + s, y + s, zEnd + 0.3, '#ffb27a', { glow: true, vary: 0 });
      engines.push({ at: new THREE.Vector3(x, y, zEnd + 0.8), size: s * 4.5, color: '#ff8a4a' });
    }
  }
  // The pod hanging below on its strut.
  const px = cx + HW * 0.32;
  v.box(px - 1, -T * 1.6, D * 0.45, px + 1, -T * 0.9, D * 0.55 + 1, grey);
  v.box(px - HW * 0.12, -T * 2.6, D * 0.2, px + HW * 0.12, -T * 1.6, D * 0.8 + 2, white);
  const turrets = [];
  turretsAlong(turrets, W, D, Math.max(ledge, (HW - W) / 2), -0.12, 3, 1);
  return { turrets, engines, turretColor: '#c9c5bc', deckColor: '#5a5650', hull: { x0: cx - HW / 2, x1: cx + HW / 2, y0: -T, y1: -0.5, z0: -bow * 0.5, z1: D + 3 } };
}

function corvette(v, W, D, rand) {
  const cream = '#e6e1d4';
  const red = '#b3342b';
  const grey = '#bdb8ac';
  const ledge = 4;
  const HW = snap(Math.max(W + ledge * 2, MIN_WIDTH.small));
  const cx = W / 2;
  const T = snap(4 + HW * 0.1);
  const STEP = 3;
  // The long body around the deck, with a red band along each side.
  for (let z = -2; z < D + 2; z += STEP) {
    v.box(cx - HW / 2, -T * 0.65, z, cx + HW / 2, -0.12, z + STEP, cream);
    v.box(cx - HW * 0.38, -T, z, cx + HW * 0.38, -T * 0.65, z + STEP, grey);
    v.box(cx - HW / 2 - 0.05, -T * 0.5, z, cx + HW / 2 + 0.05, -T * 0.38, z + STEP, red, { vary: 0 });
  }
  // The hammerhead bow and its cockpit.
  const bow = snap(Math.max(8, HW * 0.3));
  const hw = snap(HW * 1.25);
  v.box(cx - hw / 2, -T * 0.9, -2 - bow, cx + hw / 2, 0.6, -2, cream);
  v.box(cx - hw / 2, -T * 0.55, -2.4 - bow, cx + hw / 2, -T * 0.4, -2 - bow + 0.2, red, { vary: 0 });
  v.box(cx - 2, 0.6, -bow - 1.5, cx + 2, 2.2, -bow + 2.5, grey);
  v.box(cx - 1.6, 1.3, -bow - 1.6, cx + 1.6, 1.9, -bow - 1.45, '#cfe8ff', { glow: true, vary: 0 });
  // The engine bank: taller and wider than the hull, a row of red engines across its stern.
  const zE0 = D + 2;
  const zEnd = zE0 + 12;
  const ew = snap(HW * 1.15);
  v.box(cx - ew / 2, -T * 1.3, zE0, cx + ew / 2, T * 0.45, zEnd, cream);
  v.box(cx - ew / 2 - 0.05, -T * 0.5, zE0, cx + ew / 2 + 0.05, -T * 0.35, zEnd, red, { vary: 0 });
  const engines = [];
  const n = Math.max(3, Math.min(11, Math.floor(ew / 2.6)));
  for (let i = 0; i < n; i++) {
    const x = cx + (i - (n - 1) / 2) * (ew / n);
    const y = -T * 0.42;
    const s = Math.min(ew / n / 2.6, T * 0.45);
    v.box(x - s, y - s * 1.6, zEnd, x + s, y + s * 1.6, zEnd + 0.3, '#ff9a7a', { glow: true, vary: 0 });
    engines.push({ at: new THREE.Vector3(x, y, zEnd + 0.8), size: s * 5, color: '#ff5a3a' });
  }
  const turrets = [];
  turretsAlong(turrets, W, D, Math.max(ledge, (HW - W) / 2), -0.12, 2, 0.9);
  return { turrets, engines, turretColor: '#d8d2c4', deckColor: '#5a5650', hull: { x0: cx - HW / 2, x1: cx + HW / 2, y0: -T, y1: -0.5, z0: -2, z1: zEnd } };
}

// --- fighters -----------------------------------------------------------------------------

let fighterModels = null;

/** The two fighter models, built once; each fighter is a clone (sharing geometry and material). */
export function fighterModel(kind) {
  if (!fighterModels) {
    fighterModels = { tie: buildTie(), xwing: buildXwing() };
  }
  return fighterModels[kind].clone();
}

function buildTie() {
  const v = new Voxels(seeded('tie'));
  v.box(-0.6, -0.6, -0.6, 0.6, 0.6, 0.6, '#4a4f58'); // the ball cockpit, in blocks
  v.box(-0.45, -0.45, 0.6, 0.45, 0.45, 0.7, '#14171c', { vary: 0 }); // the window
  v.box(-1.45, -0.18, -0.18, 1.45, 0.18, 0.18, '#3c4048'); // the wing struts
  for (const sx of [-1, 1]) {
    v.box(sx * 1.45 - 0.08, -1.7, -1.4, sx * 1.45 + 0.08, 1.7, 1.4, '#2c3038'); // the wing
    v.box(sx * 1.45 - 0.1, -1.2, -1.0, sx * 1.45 + 0.1, 1.2, 1.0, '#1b1e24', { vary: 0 }); // its dark panel
  }
  v.box(-0.35, -0.2, -0.72, -0.1, 0.2, -0.62, '#ff6a4a', { glow: true, vary: 0 }); // twin ion engines
  v.box(0.1, -0.2, -0.72, 0.35, 0.2, -0.62, '#ff6a4a', { glow: true, vary: 0 });
  const g = v.build();
  g.scale.setScalar(1.3);
  return g;
}

function buildXwing() {
  const v = new Voxels(seeded('xwing'));
  v.box(-0.4, -0.35, -2.1, 0.4, 0.35, 2.1, '#d9d8d2'); // fuselage
  v.box(-0.25, -0.22, 2.1, 0.25, 0.22, 3.9, '#d9d8d2'); // nose
  v.box(-0.22, 0.35, 0.3, 0.22, 0.65, 1.3, '#1d2230', { vary: 0 }); // canopy
  v.box(-0.3, -0.36, 1.4, 0.3, -0.34, 2.6, '#b73a2f', { vary: 0 }); // nose stripe
  const g = v.build();
  // Four wings in an X: two above, two below, each tilted away from the fuselage.
  for (const [sx, sy] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const w = new Voxels(seeded(`xw${sx}${sy}`));
    // Built on its own side (x times sx), not mirrored by a negative scale, which would turn the faces inside out.
    const bx = (x0, y0, z0, x1, y1, z1, color, opts) => w.box(sx * x0, y0, z0, sx * x1, y1, z1, color, opts);
    bx(0.3, -0.06, -1.6, 3.3, 0.06, -0.3, '#cfcec7'); // the wing
    bx(2.2, -0.07, -1.61, 2.9, 0.07, -0.29, '#b73a2f', { vary: 0 }); // the red stripe
    bx(3.2, -0.08, -1.2, 3.42, 0.08, 1.2, '#8c8c86'); // the laser cannon at the tip
    bx(0.35, -0.25, -2.3, 0.85, 0.25, -0.9, '#8c8c86'); // the engine
    bx(0.4, -0.2, -2.42, 0.8, 0.2, -2.3, '#ff7a4a', { glow: true, vary: 0 }); // its glow
    const wing = w.build();
    wing.rotation.z = sx * sy * 0.24;
    wing.position.y = sy * 0.15;
    g.add(wing);
  }
  g.scale.setScalar(1.15);
  return g;
}
