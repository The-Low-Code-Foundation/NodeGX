// The ships of the map.
//
// A component is a capital ship: its deck is the plate its nodes sit on, and the hull is built
// around and under the deck. The bow points -z (ahead), the engines glow at +z (astern). Each class
// keeps its real proportions: the hull grows to fit the deck instead of stretching around it.
//   Empire: small = Imperial light cruiser, medium = Victory-class Star Destroyer,
//           large = Imperial Star Destroyer (a long component gets a Super Star Destroyer).
//           All daggers: a flat upper hull, a sharp equator edge, a narrower keel, a stepped
//           superstructure astern, a bridge tower with two shield domes, blue engines.
//   Rebels: small = Corellian corvette (hammerhead cockpit, a cluster of eleven red engines),
//           medium = Nebulon-B escort frigate (front hull, spar, engine block, hanging pod),
//           large = Mon Calamari cruiser (smooth, bulging organic hull, a ring of blue engines).
// Hulls are panelled (one procedural texture, tinted per material), carry lit windows and
// turbolaser turrets, and are merged into a few meshes per ship. Each design is seeded by the
// component's key, so the same app always gets the same fleet.
//
// Fighters (TIE fighters, X-wings) are built the same way, nose at +z (Object3D.lookAt).

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const SIDES = { empire: 'empire', rebels: 'rebels' };

export const SHIP_NAMES = {
  empire: { small: 'Imperial light cruiser', medium: 'Victory-class Star Destroyer', large: 'Imperial Star Destroyer', super: 'Super Star Destroyer' },
  rebels: { small: 'Corellian corvette', medium: 'Nebulon-B escort frigate', large: 'Mon Calamari cruiser' }
};

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

/** The ship's size class from its component's node count and the project's terciles. */
export function shipClass(count, t1, t2) {
  return count <= t1 ? 'small' : count <= t2 ? 'medium' : 'large';
}

// --- materials ----------------------------------------------------------------------------

/** Hull plating: grey panels of slightly different shades, panel lines and a few vents. Tinted by each material's colour. */
let panelTexture = null;
function panels() {
  if (panelTexture) return panelTexture;
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  const rand = seeded('panels');
  g.fillStyle = '#c4c4c4';
  g.fillRect(0, 0, 512, 512);
  // Panels in a loose grid, wrapping at the edges so the texture tiles.
  for (let i = 0; i < 260; i++) {
    const w = 16 * (1 + Math.floor(rand() * 5));
    const h = 16 * (1 + Math.floor(rand() * 3));
    const x = Math.floor(rand() * 32) * 16;
    const y = Math.floor(rand() * 32) * 16;
    const v = 186 + Math.floor(rand() * 28);
    g.fillStyle = `rgb(${v},${v},${v})`;
    for (const [dx, dy] of [[0, 0], [-512, 0], [0, -512], [-512, -512]]) g.fillRect(x + dx, y + dy, w, h);
  }
  // Panel lines.
  g.strokeStyle = 'rgba(60,60,60,0.35)';
  g.lineWidth = 1.5;
  for (let i = 0; i <= 512; i += 32) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i, 512);
    g.stroke();
    g.beginPath();
    g.moveTo(0, i);
    g.lineTo(512, i);
    g.stroke();
  }
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(40,40,40,${0.15 + rand() * 0.25})`;
    g.fillRect(Math.floor(rand() * 64) * 8, Math.floor(rand() * 64) * 8, 6 + rand() * 18, 3 + rand() * 6);
  }
  panelTexture = new THREE.CanvasTexture(c);
  panelTexture.wrapS = panelTexture.wrapT = THREE.RepeatWrapping;
  panelTexture.colorSpace = THREE.SRGBColorSpace;
  panelTexture.anisotropy = 4;
  return panelTexture;
}

const materials = new Map();
/** The shared materials, by name. Every ship and fighter uses these; none is ever disposed. */
export function material(name) {
  if (materials.has(name)) return materials.get(name);
  const plated = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, map: panels(), roughness: 0.72, metalness: 0.28, flatShading: true, side: THREE.DoubleSide, ...opts });
  const plain = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.35, flatShading: true, side: THREE.DoubleSide, ...opts });
  const lit = (color) => new THREE.MeshBasicMaterial({ color });
  const table = {
    imperial: () => plated('#c9cdd3'),
    imperialDark: () => plated('#7c818a'),
    imperialDeck: () => plated('#8c919a'),
    gunmetal: () => plain('#4d5259'),
    rebelHull: () => plated('#e3ddd0'),
    rebelGrey: () => plated('#aaa69c'),
    rebelDeck: () => plated('#a39e93'),
    rebelRed: () => plain('#a5302a'),
    monCal: () => plated('#8d9cb2', { flatShading: false }),
    monCalDark: () => plated('#66758a', { flatShading: false }),
    monCalDeck: () => plated('#7a889c'),
    window: () => lit('#ffe8b0'),
    bridge: () => lit('#bfe4ff'),
    glowBlue: () => lit('#b4e1ff'),
    glowRed: () => lit('#ffb08f'),
    glowOrange: () => lit('#ffc890'),
    tieBody: () => plain('#8b9199'),
    tieWing: () => plain('#3b4049', { roughness: 0.55 }),
    tieFrame: () => plain('#9aa0a8'),
    canopy: () => plain('#16191f', { roughness: 0.2, metalness: 0.6 }),
    xwBody: () => plated('#dad8d1'),
    xwRed: () => plain('#a8322a'),
    xwDark: () => plain('#3b3f46'),
    astromech: () => plain('#3d6fb6')
  };
  const m = table[name]();
  materials.set(name, m);
  return m;
}

/** The deck plating for a ship's side and class. */
export function deckMaterial(side, cls) {
  if (side === SIDES.empire) return material('imperialDeck');
  return material(cls === 'large' ? 'monCalDeck' : 'rebelDeck');
}

/** UVs from position, by each face's facing (box mapping), so plating keeps one scale on every ship. */
export function planarUV(geometry, scale = 64) {
  const pos = geometry.attributes.position;
  const nor = geometry.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const ax = Math.abs(nor.getX(i)), ay = Math.abs(nor.getY(i)), az = Math.abs(nor.getZ(i));
    let u, v;
    if (ay >= ax && ay >= az) [u, v] = [x, z];
    else if (ax >= az) [u, v] = [z, y];
    else [u, v] = [x, y];
    uv[i * 2] = u / scale;
    uv[i * 2 + 1] = v / scale;
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geometry;
}

// --- the builder --------------------------------------------------------------------------

const UP = new THREE.Vector3(0, 1, 0);

/** Collects shaped parts by material and merges each material's parts into one mesh. */
class Builder {
  constructor(rand) {
    this.rand = rand;
    this.parts = new Map();
  }

  add(geometry, mat, matrix = null, { smooth = false } = {}) {
    let g = geometry.index ? geometry.toNonIndexed() : geometry;
    geometry !== g && geometry.dispose();
    if (matrix) g.applyMatrix4(matrix);
    if (!smooth || !g.attributes.normal) g.computeVertexNormals();
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal'].includes(name)) g.deleteAttribute(name);
    planarUV(g);
    if (!this.parts.has(mat)) this.parts.set(mat, []);
    this.parts.get(mat).push(g);
    return g;
  }

  /** An axis-aligned box from corner to corner. */
  box(x0, y0, z0, x1, y1, z1, mat) {
    const w = Math.abs(x1 - x0), h = Math.abs(y1 - y0), d = Math.abs(z1 - z0);
    if (w < 0.01 || h < 0.01 || d < 0.01) return;
    this.add(new THREE.BoxGeometry(w, h, d), mat, new THREE.Matrix4().makeTranslation((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2));
  }

  /** A box with rounded edges, centred at (x, y, z). */
  rounded(w, h, d, x, y, z, mat, radius = Math.min(w, h, d) * 0.18) {
    this.add(new RoundedBoxGeometry(w, h, d, 2, radius), mat, new THREE.Matrix4().makeTranslation(x, y, z));
  }

  /** A cylinder from a to b (Vector3s), radius r1 at a and r2 at b. */
  cylinder(a, b, r1, r2, mat, segments = 12) {
    const dir = b.clone().sub(a);
    const len = dir.length();
    const g = new THREE.CylinderGeometry(r2, r1, len, segments);
    const m = new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize()), new THREE.Vector3(1, 1, 1));
    this.add(g, mat, m);
  }

  sphere(at, r, mat, scale = new THREE.Vector3(1, 1, 1), segments = 16) {
    const g = new THREE.SphereGeometry(r, segments, Math.max(6, segments / 2));
    this.add(g, mat, new THREE.Matrix4().compose(at, new THREE.Quaternion(), scale), { smooth: true });
  }

  /** A solid between loops of points (each loop the same count, going round the same way), capped at both ends. */
  loft(loops, mat) {
    const pos = [];
    const tri = (a, b, c) => pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    for (let l = 0; l < loops.length - 1; l++) {
      const A = loops[l], B = loops[l + 1];
      for (let i = 0; i < A.length; i++) {
        const j = (i + 1) % A.length;
        tri(A[i], B[i], B[j]);
        tri(A[i], B[j], A[j]);
      }
    }
    for (const loop of [loops[0], loops[loops.length - 1]]) for (let i = 1; i < loop.length - 1; i++) tri(loop[0], loop[i], loop[i + 1]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    this.add(g, mat);
  }

  /** A turbolaser turret: a round base and twin barrels pointing `out` (+1 or -1 along x). Returns the muzzle. */
  turret(at, s, out) {
    this.cylinder(at, at.clone().add(new THREE.Vector3(0, s * 0.7, 0)), s, s * 0.85, material('gunmetal'), 10);
    for (const dz of [-0.28, 0.28]) {
      const a = at.clone().add(new THREE.Vector3(0, s * 0.45, dz * s));
      this.cylinder(a, a.clone().add(new THREE.Vector3(out * s * 2.4, 0, 0)), s * 0.12, s * 0.1, material('gunmetal'), 6);
    }
    return at.clone().add(new THREE.Vector3(out * s * 2.5, s * 0.45, 0));
  }

  /** An engine nozzle along +z ending at z1: a housing and a glowing disc. Returns its glow position. */
  engine(x, y, z0, z1, r, glowMat, housing = material('gunmetal')) {
    this.cylinder(new THREE.Vector3(x, y, z0), new THREE.Vector3(x, y, z1), r * 1.12, r * 1.2, housing, 16);
    this.cylinder(new THREE.Vector3(x, y, z1), new THREE.Vector3(x, y, z1 + 0.08 + r * 0.04), r, r, glowMat, 16);
    return new THREE.Vector3(x, y, z1 + r * 0.25);
  }

  build() {
    const group = new THREE.Group();
    for (const [mat, list] of this.parts) {
      const merged = mergeGeometries(list);
      for (const g of list) g.dispose();
      const mesh = new THREE.Mesh(merged, mat);
      mesh.userData.sharedMaterial = true;
      group.add(mesh);
    }
    return group;
  }
}

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/**
 * Designs one capital ship around a deck W × D (world units; deck-local x ∈ [0, W], z ∈ [0, D],
 * deck top at y = 0). Returns { group, bbox, turrets, engines, hull, name }: group is in
 * deck-local coordinates; turrets carry their muzzle; engines are { at, size, color } for glow
 * sprites; hull is the box lasers aim at.
 */
export function designShip(side, cls, W, D, seed) {
  const rand = seeded(seed);
  const b = new Builder(rand);
  const ship = side === SIDES.empire ? dagger(b, cls, W, D, rand) : cls === 'large' ? monCalamari(b, W, D, rand) : cls === 'medium' ? nebulonB(b, W, D, rand) : corvette(b, W, D, rand);
  const group = b.build();
  return { group, bbox: new THREE.Box3().setFromObject(group), turrets: ship.turrets, engines: ship.engines, hull: ship.hull, name: SHIP_NAMES[side][ship.kind ?? cls] };
}

// --- the Empire: daggers ------------------------------------------------------------------

function dagger(b, cls, W, D, rand) {
  const m = { small: 4, medium: 6, large: 8 }[cls];
  const isSuper = cls === 'large' && D / Math.max(W, 1) > 3.2;
  const ratio = isSuper ? 0.2 : { small: 0.5, medium: 0.56, large: 0.62 }[cls]; // width over length
  const sFrac = isSuper ? 0.07 : { small: 0.09, medium: 0.13, large: 0.17 }[cls]; // superstructure astern of the deck
  const minL = { small: 70, medium: 120, large: 190 }[cls];
  // The flat top is a triangle inset from the hull edge; the deck must fit inside it, ahead of the superstructure.
  const fits = (L) => {
    const zt = 0.06 * L;
    const zr = L - sFrac * L - 1;
    const zf = zr - D;
    if (zf < zt + 2) return false;
    return 0.82 * ((ratio * L) / 2) * ((zf - zt) / (L - zt)) >= W / 2 + m;
  };
  let L = Math.max(minL, (D + 3) / (0.9 - sFrac));
  while (!fits(L)) L *= 1.04;
  const halfW = (ratio * L) / 2;
  const zf = L - sFrac * L - 1 - D; // the deck's front, measured from the tip
  const tip = -zf; // so the deck's front is at deck-local z = 0
  const rear = L - zf;
  const cx = W / 2;
  const T = L * (isSuper ? 0.045 : { small: 0.1, medium: 0.11, large: 0.115 }[cls]); // hull depth
  const top = -0.15;
  const mid = -T * 0.42;
  const bot = -T;
  const zAt = (k) => tip + k * L;
  // The hull: flat top, sharp equator, narrower keel.
  b.loft(
    [
      [V(cx, top, zAt(0.06)), V(cx + halfW * 0.82, top, rear), V(cx - halfW * 0.82, top, rear)],
      [V(cx, mid, tip), V(cx + halfW, mid, rear), V(cx - halfW, mid, rear)],
      [V(cx, bot, zAt(0.18)), V(cx + halfW * 0.42, bot, rear), V(cx - halfW * 0.42, bot, rear)]
    ],
    material('imperial')
  );
  // The equator trim and the centre trench ahead of the deck.
  b.loft(
    [
      [V(cx, mid + 0.25, tip - 0.2), V(cx + halfW + 0.2, mid + 0.25, rear), V(cx - halfW - 0.2, mid + 0.25, rear)],
      [V(cx, mid - 0.25, tip - 0.2), V(cx + halfW + 0.2, mid - 0.25, rear), V(cx - halfW - 0.2, mid - 0.25, rear)]
    ],
    material('imperialDark')
  );
  if (zAt(0.06) < -4) b.box(cx - Math.max(0.6, W * 0.04), top - 0.3, zAt(0.1), cx + Math.max(0.6, W * 0.04), top + 0.05, -2, material('imperialDark'));
  // The superstructure astern: stepped tiers, then the bridge tower, its bridge and two shield domes.
  const z0 = D + 1;
  const z1 = rear - 0.5;
  const hwAt = (z) => 0.82 * halfW * ((z - zAt(0.06)) / (rear - zAt(0.06)));
  const tiers = { small: 1, medium: 2, large: 3 }[cls] + (isSuper ? 0 : 0);
  let w = hwAt(z0) * 1.5;
  let y = top;
  let tz = z0;
  const tierH = Math.max(1.2, T * (isSuper ? 0.25 : 0.14));
  for (let i = 0; i < tiers; i++) {
    b.box(cx - w / 2, y, tz, cx + w / 2, y + tierH, z1, material(i % 2 ? 'imperialDark' : 'imperial'));
    // Lit window rows along each tier's sides.
    for (let k = 0; k < 6; k++) {
      const wz = tz + ((z1 - tz) * (k + 0.5)) / 6;
      for (const sx of [-1, 1]) b.box(cx + sx * (w / 2 + 0.02) - 0.05, y + tierH * 0.45, wz - 0.4, cx + sx * (w / 2 + 0.02) + 0.05, y + tierH * 0.6, wz + 0.4, material('window'));
    }
    y += tierH;
    w *= 0.62;
    tz += (z1 - tz) * 0.25;
  }
  if (cls !== 'small') {
    const neckW = Math.max(1.4, halfW * 0.08);
    const neckH = T * (isSuper ? 0.5 : 0.32);
    const bz0 = z1 - Math.max(4, (z1 - z0) * 0.35);
    b.box(cx - neckW / 2, y, bz0 + 0.5, cx + neckW / 2, y + neckH, z1 - 0.5, material('imperial'));
    const bridgeW = Math.max(6, halfW * (isSuper ? 0.5 : 0.42));
    const bridgeH = Math.max(1, T * 0.09);
    const by = y + neckH;
    b.box(cx - bridgeW / 2, by, bz0, cx + bridgeW / 2, by + bridgeH, z1, material('imperial'));
    b.box(cx - bridgeW / 2 + 0.3, by + bridgeH * 0.35, bz0 - 0.06, cx + bridgeW / 2 - 0.3, by + bridgeH * 0.6, bz0, material('bridge'));
    if (cls === 'large') {
      for (const sx of [-1, 1]) {
        const dr = Math.max(0.9, bridgeH * 0.95);
        const dx = cx + sx * (bridgeW / 2 - dr * 1.3);
        b.cylinder(V(dx, by + bridgeH, (bz0 + z1) / 2), V(dx, by + bridgeH + dr * 0.6, (bz0 + z1) / 2), dr * 0.3, dr * 0.3, material('imperial'), 8);
        b.sphere(V(dx, by + bridgeH + dr * 1.3, (bz0 + z1) / 2), dr, material('imperial'));
      }
    }
  }
  // Engines on the stern, glowing blue.
  const engines = [];
  const big = { small: 2, medium: 3, large: 3 }[cls];
  const r = Math.min(halfW * (isSuper ? 0.16 : 0.11), T * 0.28);
  for (let i = 0; i < big; i++) {
    const x = cx + (i - (big - 1) / 2) * r * 2.6;
    const at = b.engine(x, mid + T * 0.05, rear - r, rear + r * 0.9, r, material('glowBlue'));
    engines.push({ at, size: r * 2.8, color: '#5fb4ff' });
  }
  const small = cls === 'small' ? 0 : 2;
  for (let s = 1; s <= small; s++) {
    for (const sx of [-1, 1]) {
      const x = cx + sx * ((big - 1) / 2 * r * 2.6 + r * 1.6 + (s - 1) * r * 1.3);
      const at = b.engine(x, mid - T * 0.08, rear - r * 0.6, rear + r * 0.5, r * 0.45, material('glowBlue'));
      engines.push({ at, size: r * 1.4, color: '#5fb4ff' });
    }
  }
  // Turbolaser turrets along both top edges, beside the deck.
  const turrets = [];
  const per = { small: 3, medium: 5, large: 7 }[cls];
  const ts = Math.max(0.7, Math.min(2.4, T * 0.07));
  for (let i = 0; i < per; i++) {
    const z = D * ((i + 0.5) / per);
    const hw = hwAt(z);
    for (const sx of [-1, 1]) {
      const x = cx + sx * Math.max(W / 2 + ts * 1.5, hw - ts * 1.6);
      turrets.push({ muzzle: b.turret(V(x, top, z), ts, sx) });
    }
  }
  // Rows of lit windows along the equator.
  const nWin = Math.floor(L / 6);
  for (let i = 0; i < nWin; i++) {
    const k = 0.15 + 0.82 * rand();
    const z = tip + k * L;
    const hw = halfW * k;
    for (const sx of [-1, 1]) {
      if (rand() < 0.4) continue;
      const x = cx + sx * (hw - 0.1);
      b.box(x - 0.08, mid + 0.4, z - 0.3, x + 0.08, mid + 0.65, z + 0.3, material('window'));
    }
  }
  return { kind: isSuper ? 'super' : cls, turrets, engines, hull: { x0: cx - halfW, x1: cx + halfW, y0: bot, y1: mid + 0.5, z0: tip + L * 0.3, z1: rear } };
}

// --- the Rebels ---------------------------------------------------------------------------

function monCalamari(b, W, D, rand) {
  const m = 6;
  const Wp = W + 2 * m;
  const Dp = D + 2 * m;
  // The hull is an ellipsoid with its top sliced flat for the deck; the deck rectangle's corners touch the slice.
  const cut = 0.893; // the slice's size against the ellipsoid's, with the centre 0.45 of the height below it
  // 1.15 more across and 1.1 more along: room for the bulges and the tapered stern.
  let rx = ((Wp / 2) * Math.SQRT2 / cut) * 1.15;
  let rz = ((Dp / 2) * Math.SQRT2 / cut) * 1.1;
  rz = Math.max(rz, rx * 2.1, 55);
  rx = Math.max(rx, 22);
  const ry = rx * 0.55;
  const cx = W / 2;
  const cz = D / 2;
  const cy = -0.15 - ry * 0.45;
  const top = -0.15;
  const g = new THREE.SphereGeometry(1, 64, 32);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    // Organic bulges, and a slightly fuller bow and a tapered stern.
    const bulge = 1 + 0.05 * Math.sin(z * 9 + x * 3) * Math.cos(y * 4) + 0.035 * Math.sin(z * 23);
    const taper = z > 0 ? 1 - 0.18 * z * z : 1;
    let X = x * rx * bulge * taper, Y = y * ry * bulge, Z = z * rz;
    Y = Math.min(Y + cy, top);
    p.setXYZ(i, X + cx, Y, Z + cz);
  }
  g.computeVertexNormals();
  b.add(g, material('monCal'), null, { smooth: true });
  // Pods and ridges along the flanks.
  const pods = 4 + Math.floor(rand() * 4);
  for (let i = 0; i < pods; i++) {
    const k = -0.7 + 1.4 * ((i + 0.5) / pods);
    const z = cz + k * rz;
    const halfAt = rx * Math.sqrt(Math.max(0.05, 1 - k * k)) * 0.95;
    for (const sx of [-1, 1]) {
      if (rand() < 0.3) continue;
      const s = rx * (0.12 + rand() * 0.1);
      b.sphere(V(cx + sx * halfAt, cy + ry * 0.1, z), s, material('monCalDark'), V(1, 0.7, 2.2), 14);
    }
  }
  // A dorsal ridge astern of the deck, and lit windows in bands along the sides.
  b.sphere(V(cx, top, cz + rz * 0.72), rx * 0.18, material('monCalDark'), V(1, 0.9, 2.4), 14);
  for (let i = 0; i < Math.floor(rz / 2.5); i++) {
    const k = -0.85 + 1.7 * rand();
    const z = cz + k * rz;
    const band = rand() < 0.5 ? 0.15 : -0.25;
    const halfAt = rx * Math.sqrt(Math.max(0, 1 - k * k)) * Math.sqrt(Math.max(0, 1 - band * band));
    if (halfAt < 2) continue;
    for (const sx of [-1, 1]) if (rand() < 0.6) b.box(cx + sx * halfAt - 0.08, cy + band * ry, z - 0.35, cx + sx * halfAt + 0.08, cy + band * ry + 0.3, z + 0.35, material('window'));
  }
  // A ring of engines at the stern.
  const engines = [];
  const ring = 7;
  const er = Math.min(rx * 0.075, ry * 0.2);
  const sz = cz + rz * 0.93;
  for (let i = 0; i < ring; i++) {
    const a = (i / ring) * Math.PI * 2;
    const x = cx + Math.cos(a) * rx * 0.26;
    const y = cy + Math.sin(a) * ry * 0.35;
    const at = b.engine(x, y, sz - er * 3, sz + er * 0.8, er, material('glowBlue'), material('monCalDark'));
    engines.push({ at, size: er * 2.8, color: '#6fc4ff' });
  }
  const turrets = [];
  for (let i = 0; i < 6; i++) {
    const z = D * ((i + 0.5) / 6);
    const k = (z - cz) / rz;
    const halfTop = rx * cut * Math.sqrt(Math.max(0, 1 - k * k));
    for (const sx of [-1, 1]) turrets.push({ muzzle: b.turret(V(cx + sx * Math.max(W / 2 + 2, halfTop - 2), top, z), 1.3, sx) });
  }
  return { turrets, engines, hull: { x0: cx - rx, x1: cx + rx, y0: cy - ry * 0.8, y1: cy + ry * 0.2, z0: cz - rz * 0.7, z1: cz + rz * 0.8 } };
}

function nebulonB(b, W, D, rand) {
  const m = 4;
  const Wf = Math.max(W + 2 * m, 24);
  const Lf = Math.max(D + 2 * m, Wf * 1.45);
  const Hf = Wf * 0.36;
  const cx = W / 2;
  const zf0 = D / 2 - Lf / 2;
  const zf1 = zf0 + Lf;
  const top = -0.15;
  const cy = top - Hf / 2;
  // The front hull, its bow sloping down, a command tower ahead of the deck.
  b.rounded(Wf, Hf, Lf, cx, cy, (zf0 + zf1) / 2, material('rebelHull'), Hf * 0.25);
  b.loft(
    [
      [V(cx - Wf / 2, top, zf0 + 0.5), V(cx + Wf / 2, top, zf0 + 0.5), V(cx + Wf / 2, top - Hf, zf0 + 0.5), V(cx - Wf / 2, top - Hf, zf0 + 0.5)],
      [V(cx - Wf * 0.3, top - Hf * 0.45, zf0 - Lf * 0.16), V(cx + Wf * 0.3, top - Hf * 0.45, zf0 - Lf * 0.16), V(cx + Wf * 0.3, top - Hf * 0.95, zf0 - Lf * 0.16), V(cx - Wf * 0.3, top - Hf * 0.95, zf0 - Lf * 0.16)]
    ],
    material('rebelHull')
  );
  if (zf0 < -3) b.rounded(Wf * 0.3, Hf * 0.5, Math.min(-zf0 - 1, Lf * 0.12), cx, top + Hf * 0.2, zf0 + Math.min(-zf0 - 1, Lf * 0.12) / 2 + 0.5, material('rebelGrey'));
  for (const sx of [-1, 1]) b.box(cx + sx * (Wf / 2) - 0.12, cy - Hf * 0.1, zf0 + 1, cx + sx * (Wf / 2) + 0.12, cy + Hf * 0.12, zf1 - 1, material('rebelRed'));
  // The spar, climbing astern to the engine block.
  const spar = Lf * 1.05;
  const rise = Hf * 1.2;
  b.cylinder(V(cx, cy, zf1 - 2), V(cx, cy + rise, zf1 + spar), Wf * 0.07, Wf * 0.06, material('rebelGrey'), 6);
  const ez0 = zf1 + spar - 2;
  const eL = Lf * 0.4;
  const eW = Wf * 0.62;
  const eH = Hf * 2.1;
  const ey = cy + rise;
  b.rounded(eW, eH, eL, cx, ey, ez0 + eL / 2, material('rebelHull'), eW * 0.08);
  b.box(cx - eW / 2 - 0.1, ey - eH * 0.08, ez0 + 0.5, cx + eW / 2 + 0.1, ey + eH * 0.08, ez0 + eL - 0.5, material('rebelRed'));
  const engines = [];
  const er = Math.min(eW * 0.16, eH * 0.17);
  const spots = [[-0.55, 0.45, 1.25], [0.55, 0.45, 1.25], [-0.6, -0.4, 0.8], [0, -0.4, 0.8], [0.6, -0.4, 0.8]];
  for (const [fx, fy, s] of spots) {
    const at = b.engine(cx + fx * eW * 0.42, ey + fy * eH * 0.5, ez0 + eL - er, ez0 + eL + er * 0.6, er * s, material('glowOrange'));
    engines.push({ at, size: er * s * 2.8, color: '#ff7a3a' });
  }
  // The pod hanging below on its strut.
  const px = cx + Wf * 0.3;
  b.box(px - Wf * 0.04, cy - Hf * 1.4, D * 0.4, px + Wf * 0.04, cy - Hf * 0.4, D * 0.55, material('rebelGrey'));
  b.rounded(Wf * 0.32, Hf * 0.7, Lf * 0.55, px, cy - Hf * 1.75, D * 0.48, material('rebelHull'));
  const turrets = [];
  for (let i = 0; i < 4; i++) {
    const z = D * ((i + 0.5) / 4);
    for (const sx of [-1, 1]) turrets.push({ muzzle: b.turret(V(cx + sx * (Wf / 2 - 1.4), top, z), 1, sx) });
  }
  for (let i = 0; i < Lf / 3; i++) {
    const z = zf0 + 2 + rand() * (Lf - 4);
    for (const sx of [-1, 1]) if (rand() < 0.5) b.box(cx + sx * (Wf / 2) - 0.14, cy + Hf * 0.22, z - 0.3, cx + sx * (Wf / 2) + 0.14, cy + Hf * 0.32, z + 0.3, material('window'));
  }
  return { turrets, engines, hull: { x0: cx - Wf / 2, x1: cx + Wf / 2, y0: top - Hf, y1: top - 0.5, z0: zf0, z1: zf1 } };
}

function corvette(b, W, D, rand) {
  const m = 3;
  const Wb = Math.max(W + 2 * m, 16);
  const Lb = Math.max(D + 2 * m, Wb * 2.1);
  const Hb = Wb * 0.42;
  const cx = W / 2;
  const top = -0.15;
  const cy = top - Hb / 2;
  const zb0 = D / 2 - Lb / 2;
  const zb1 = zb0 + Lb;
  // The long body, a red band along each side, and a dorsal turret behind the deck.
  b.rounded(Wb, Hb, Lb, cx, cy, (zb0 + zb1) / 2, material('rebelHull'), Hb * 0.3);
  for (const sx of [-1, 1]) b.box(cx + sx * Wb / 2 - 0.12, cy - Hb * 0.06, zb0 + 1, cx + sx * Wb / 2 + 0.12, cy + Hb * 0.08, zb1 - 1, material('rebelRed'));
  // The hammerhead: a neck and the wide cockpit section, its windows looking ahead.
  const neckL = Lb * 0.14;
  b.cylinder(V(cx, cy, zb0 + 1), V(cx, cy, zb0 - neckL), Hb * 0.32, Hb * 0.3, material('rebelGrey'), 10);
  const hL = Lb * 0.16;
  const hz = zb0 - neckL - hL / 2;
  b.rounded(Wb * 1.2, Hb * 0.75, hL, cx, cy, hz, material('rebelHull'), Hb * 0.2);
  b.box(cx - Wb * 0.5, cy + Hb * 0.05, hz - hL / 2 - 0.06, cx + Wb * 0.5, cy + Hb * 0.18, hz - hL / 2 + 0.02, material('bridge'));
  b.box(cx - Wb * 0.62, cy - Hb * 0.06, hz - hL / 2 + 0.5, cx + Wb * 0.62, cy + Hb * 0.06, hz + hL / 2 - 0.5, material('rebelRed'));
  // The engine block, wider and taller than the body, eleven red engines in two banks.
  const eL = Lb * 0.3;
  const eW = Wb * 1.3;
  const eH = Hb * 1.55;
  const ez = zb1 + eL / 2 - 1;
  b.rounded(eW, eH, eL, cx, cy, ez, material('rebelHull'), eH * 0.15);
  b.box(cx - eW / 2 - 0.1, cy - eH * 0.05, ez - eL / 2 + 0.5, cx + eW / 2 + 0.1, cy + eH * 0.05, ez + eL / 2 - 0.5, material('rebelRed'));
  const engines = [];
  const er = Math.min(eW / 15, eH * 0.18);
  const rows = [[6, 0.24], [5, -0.24]];
  for (const [n, fy] of rows) {
    for (let i = 0; i < n; i++) {
      const x = cx + (i - (n - 1) / 2) * er * 2.35;
      const at = b.engine(x, cy + fy * eH, ez + eL / 2 - er, ez + eL / 2 + er * 0.9, er, material('glowRed'));
      engines.push({ at, size: er * 2.8, color: '#ff4a2a' });
    }
  }
  const turrets = [];
  for (let i = 0; i < 3; i++) {
    const z = D * ((i + 0.5) / 3);
    for (const sx of [-1, 1]) turrets.push({ muzzle: b.turret(V(cx + sx * (Wb / 2 - 1), top, z), 0.8, sx) });
  }
  for (let i = 0; i < Lb / 2.5; i++) {
    const z = zb0 + 1.5 + rand() * (Lb - 3);
    for (const sx of [-1, 1]) if (rand() < 0.5) b.box(cx + sx * Wb / 2 - 0.13, cy + Hb * 0.18, z - 0.25, cx + sx * Wb / 2 + 0.13, cy + Hb * 0.27, z + 0.25, material('window'));
  }
  return { turrets, engines, hull: { x0: cx - Wb / 2, x1: cx + Wb / 2, y0: top - Hb, y1: top - 0.5, z0: zb0, z1: zb1 } };
}

// --- fighters -----------------------------------------------------------------------------

let fighterModels = null;

/** The two fighter models, built once; each fighter is a clone (sharing geometry and material). */
export function fighterModel(kind) {
  fighterModels ??= { tie: buildTie(), xwing: buildXwing() };
  return fighterModels[kind].clone();
}

function buildTie() {
  const b = new Builder(seeded('tie'));
  b.sphere(V(0, 0, 0), 0.85, material('tieBody'), undefined, 18);
  // The round window: a dark glass disc in a frame, looking ahead.
  b.cylinder(V(0, 0, 0.7), V(0, 0, 0.86), 0.48, 0.48, material('canopy'), 8);
  b.add(new THREE.TorusGeometry(0.48, 0.07, 6, 8), material('tieFrame'), new THREE.Matrix4().makeTranslation(0, 0, 0.86));
  for (const sx of [-1, 1]) {
    // The pylon to each wing, and the hexagonal wing: a dark panel in a frame, with spokes from its hub.
    b.cylinder(V(sx * 0.7, 0, 0), V(sx * 2.0, 0, 0), 0.2, 0.16, material('tieBody'), 8);
    const wing = new THREE.Matrix4().makeRotationZ(Math.PI / 2).premultiply(new THREE.Matrix4().makeTranslation(sx * 2.05, 0, 0));
    b.add(new THREE.CylinderGeometry(2.5, 2.5, 0.07, 6), material('tieWing'), wing);
    // The frame: a six-sided torus turned to lie on the wing, its corners on the wing's corners.
    const rim = new THREE.Matrix4().makeRotationY(Math.PI / 2).premultiply(new THREE.Matrix4().makeTranslation(sx * 2.05, 0, 0));
    b.add(new THREE.TorusGeometry(2.45, 0.13, 4, 6), material('tieFrame'), rim);
    b.cylinder(V(sx * 1.95, 0, 0), V(sx * 2.15, 0, 0), 0.45, 0.45, material('tieFrame'), 6);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      const end = V(sx * 2.1, Math.sin(a) * 2.4, Math.cos(a) * 2.4);
      b.cylinder(V(sx * 2.1, 0, 0), end, 0.09, 0.09, material('tieFrame'), 4);
    }
  }
  b.box(-0.3, -0.18, -0.92, -0.08, 0.18, -0.8, material('glowRed'));
  b.box(0.08, -0.18, -0.92, 0.3, 0.18, -0.8, material('glowRed'));
  const g = b.build();
  g.scale.setScalar(1.15);
  g.userData.guns = [V(-0.35, -0.5, 0.9), V(0.35, -0.5, 0.9)];
  return g;
}

function buildXwing() {
  const body = new Builder(seeded('xwing'));
  body.rounded(0.95, 0.8, 2.8, 0, 0, -0.6, material('xwBody'), 0.15);
  // The long nose, square in section and tapering, with a red stripe.
  const nose = new THREE.CylinderGeometry(0.17, 0.5, 3.6, 4);
  body.add(nose, material('xwBody'), new THREE.Matrix4().makeRotationY(Math.PI / 4).premultiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)).premultiply(new THREE.Matrix4().makeTranslation(0, 0, 2.6)));
  body.box(-0.25, 0.25, 1.2, 0.25, 0.3, 2.4, material('xwRed'));
  body.rounded(0.55, 0.4, 1.1, 0, 0.45, 0.55, material('canopy'), 0.12);
  body.sphere(V(0, 0.42, -0.45), 0.24, material('astromech'), V(1, 0.8, 1), 12);
  const g = body.build();
  // Four S-foils in attack position, each with its engine, cannon and red markings.
  for (const [sx, sy] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const w = new Builder(seeded(`xw${sx}${sy}`));
    const X = (x) => sx * x;
    w.box(X(0.45), -0.05, -1.8, X(3.4), 0.05, -0.35, material('xwBody'));
    w.box(X(2.3), -0.06, -1.81, X(2.9), 0.06, -0.34, material('xwRed'));
    w.box(X(0.9), -0.06, -1.81, X(1.3), 0.06, -0.34, material('xwRed'));
    w.cylinder(V(X(0.82), sy * 0.08, -2.3), V(X(0.82), sy * 0.08, -0.2), 0.34, 0.3, material('xwBody'), 12);
    w.cylinder(V(X(0.82), sy * 0.08, -0.2), V(X(0.82), sy * 0.08, 0.05), 0.28, 0.28, material('xwDark'), 12);
    w.cylinder(V(X(0.82), sy * 0.08, -2.36), V(X(0.82), sy * 0.08, -2.3), 0.26, 0.26, material('glowRed'), 12);
    w.cylinder(V(X(3.42), 0, -1.4), V(X(3.42), 0, 1.6), 0.07, 0.06, material('xwDark'), 6);
    w.cylinder(V(X(3.42), 0, 1.6), V(X(3.42), 0, 2.1), 0.11, 0.05, material('xwDark'), 6);
    const wing = w.build();
    wing.rotation.z = sx * sy * 0.22;
    wing.position.y = sy * 0.12;
    g.add(wing);
  }
  g.userData.guns = [V(-3.35, 0.75, 2.1), V(3.35, 0.75, 2.1), V(-3.35, -0.75, 2.1), V(3.35, -0.75, 2.1)];
  return g;
}
