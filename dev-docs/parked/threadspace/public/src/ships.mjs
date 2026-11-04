// Every hull in the game. A ship's nose points along -z (the way a camera looks). The big shapes are lofted
// through chamfered cross-sections (`loft`), in plated metal that picks up the sector's nebula; the small parts
// are boxes and cylinders. Each builder returns a Group with the places other code needs in `userData`: engines
// to glow, plumes that grow with the throttle, a turret to aim, an airlock to dock at, a bay to launch from.

import * as THREE from 'three';
import { box, cyl, at, glow, mulberry } from './util.mjs';

/** Layer 1: the hull shell the rooms sit inside. The walking camera leaves this layer off: a camera in a corridor
 *  must not draw the hull round it (2026-10-22, the bow block's aft face filled the spawn view). Back-face culling
 *  hides a shell only from inside a convex one, which is why every loft here is kept convex: widths and heights
 *  change by ever smaller steps toward the ends, so the helm's eye inside the bow sees out through all of it. */
export const SHELL_LAYER = 1;
export const shell = (m) => (m.layers.set(SHELL_LAYER), m);

// --- materials ------------------------------------------------------------------------------------------------

let _plating;
/** Hull plating: panels of slightly different greys with dark seams and a few vents, tiled. Multiplied by the paint. */
function plating() {
  if (_plating) return _plating;
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  const r = mulberry(99);
  g.fillStyle = '#d8dbe0';
  g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; ) {
    const h = [32, 48, 64][Math.floor(r() * 3)];
    for (let x = 0; x < 512; ) {
      const w = [48, 64, 96, 128][Math.floor(r() * 4)];
      const v = 190 + Math.floor(r() * 50);
      g.fillStyle = `rgb(${v},${v + 2},${v + 6})`;
      g.fillRect(x, y, w, h);
      g.fillStyle = 'rgba(30,34,42,0.6)';
      g.fillRect(x, y, w, 2);
      g.fillRect(x, y, 2, h);
      if (r() < 0.12) {
        g.fillStyle = 'rgba(30,34,42,0.45)';
        for (let k = 0; k < 4; k++) g.fillRect(x + 8, y + 8 + k * 5, Math.min(30, w - 16), 2);
      }
      x += w;
    }
    y += h;
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return (_plating = tex);
}

/** Painted, plated metal. */
export function metal(color, { plated = true, rough = 0.55, metalness = 0.35 } = {}) {
  return new THREE.MeshStandardMaterial({ color, map: plated ? plating() : null, roughness: rough, metalness, flatShading: true });
}
export const DARK = new THREE.MeshStandardMaterial({ color: '#23272e', roughness: 0.6, metalness: 0.5, flatShading: true });
export const TRIM = new THREE.MeshStandardMaterial({ color: '#3a414d', roughness: 0.5, metalness: 0.5, flatShading: true });
export const GLASS = new THREE.MeshStandardMaterial({ color: '#0e1a2a', roughness: 0.12, metalness: 0.9, emissive: '#0a1626', flatShading: true });

let _halo;
export function haloTexture() {
  if (_halo) return _halo;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.5)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return (_halo = new THREE.CanvasTexture(c));
}

// --- shapes ---------------------------------------------------------------------------------------------------

/** A hull lofted along z through cross-sections {z, w, h, y?, x?, c?}: each an octagon, a rectangle with its corners
 *  cut by `c` of the smaller half-side. Sections in increasing z. Flat-shaded, plating tiled every `uv` metres.
 *  `material` may be a list, with `faces` naming which one each of the octagon's eight faces wears, going round from the
 *  upper starboard chamfer: [0] upper-starboard, [1] top, [2] upper-port, [3] port side, [4] lower-port, [5] belly,
 *  [6] lower-starboard, [7] starboard side. The end caps wear `cap`. That is how a hull is two-tone in one mesh. */
export function loft(sections, material, { uv = 10, chamfer = 0.32, faces = null, cap: capIndex = 0, ends = [true, true] } = {}) {
  const multi = Array.isArray(material);
  const rings = sections.map((s) => {
    const a = s.w / 2, b = s.h / 2, c = Math.min(a, b) * (s.c ?? chamfer), x = s.x ?? 0, y = s.y ?? 0;
    return [[a, b - c], [a - c, b], [-(a - c), b], [-a, b - c], [-a, -(b - c)], [-(a - c), -b], [a - c, -b], [a, -(b - c)]].map(([px, py]) => new THREE.Vector3(x + px, y + py, s.z));
  });
  const buckets = multi ? material.map(() => ({ pos: [], uvs: [] })) : [{ pos: [], uvs: [] }];
  const tri = (bi, p, q, r, tp, tq, tr) => {
    const B = buckets[multi ? bi : 0];
    B.pos.push(p.x, p.y, p.z, q.x, q.y, q.z, r.x, r.y, r.z);
    B.uvs.push(...tp, ...tq, ...tr);
  };
  for (let i = 0; i < rings.length - 1; i++) {
    const A = rings[i], B = rings[i + 1];
    const us = [0];
    for (let k = 0; k < 8; k++) us.push(us[k] + A[k].distanceTo(A[(k + 1) % 8]));
    for (let k = 0; k < 8; k++) {
      const k2 = (k + 1) % 8;
      const f = faces ? faces[k] : 0;
      const u0 = us[k] / uv, u1 = us[k + 1] / uv, v0 = A[k].z / uv, v1 = B[k].z / uv;
      tri(f, A[k], A[k2], B[k2], [u0, v0], [u1, v0], [u1, v1]);
      tri(f, A[k], B[k2], B[k], [u0, v0], [u1, v1], [u0, v1]);
    }
  }
  const cap = (R, out) => {
    const c = R.reduce((s, p) => s.add(p), new THREE.Vector3()).multiplyScalar(1 / 8);
    for (let k = 0; k < 8; k++) {
      const k2 = (k + 1) % 8;
      const t = (p) => [p.x / uv, p.y / uv];
      if (out > 0) tri(capIndex, c, R[k], R[k2], t(c), t(R[k]), t(R[k2]));
      else tri(capIndex, c, R[k2], R[k], t(c), t(R[k2]), t(R[k]));
    }
  };
  if (ends[0]) cap(rings[0], -1);
  if (ends[1]) cap(rings[rings.length - 1], 1);
  const geo = new THREE.BufferGeometry();
  const pos = buckets.flatMap((b) => b.pos);
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(buckets.flatMap((b) => b.uvs), 2));
  if (multi) {
    let start = 0;
    buckets.forEach((b, i) => {
      const n = b.pos.length / 3;
      if (n) geo.addGroup(start, n, i);
      start += n;
    });
  }
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, material);
}

/** A wing: a slab tapering from a root chord at `x0` to a tip chord at `x1`, swept by `sweep` metres. */
export function wing(x0, x1, root, tip, sweep, thick, material, { y = 0, z = 0, dihedral = 0 } = {}) {
  const s = Math.sign(x1 - x0) || 1;
  const g = new THREE.Group();
  const span = Math.abs(x1 - x0);
  // A wing is a loft along its span: built along z (the chord across x), then turned so the span runs out along ±x.
  const w = loft(
    [
      { z: 0, w: root, h: thick, c: 0.45 },
      { z: span, w: tip, h: thick * 0.6, c: 0.45, y: 0 }
    ],
    material,
    { uv: 6 }
  );
  // Sweep: shear the tip back along the chord. Turning by +90° about y sends the loft's x to world −z, by −90° to +z,
  // so "back" (+z) is −x on the starboard wing and +x on the port one. A turn, never a mirror: a mirror flips the faces.
  const p = w.geometry.attributes.position;
  for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) - s * (p.getZ(i) / span) * sweep);
  p.needsUpdate = true;
  w.geometry.computeVertexNormals();
  w.rotation.y = s * (Math.PI / 2);
  g.add(w);
  g.position.set(x0, y, z);
  g.rotation.z = s * dihedral;
  return g;
}

/** An engine: a bell, a glowing throat, a halo, and a plume behind it that the world scales with the ship's speed. */
export function engine(g, x, y, z, r, engMat, plumeMat, { len = 1.6, plume: plumeLen = 6 } = {}) {
  g.add(at(cyl(r * 0.85, r, len, DARK, 12), x, y, z + len / 2, Math.PI / 2));
  g.add(at(cyl(r * 0.7, r * 0.7, 0.1, engMat, 12), x, y, z + len + 0.02, Math.PI / 2));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTexture(), color: engMat.color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.setScalar(r * 3.2);
  halo.position.set(x, y, z + len + 0.3);
  g.add(halo);
  g.userData.halos.push(halo);
  const plume = new THREE.Mesh(new THREE.ConeGeometry(r * 0.62, r * plumeLen, 12, 1, true), plumeMat);
  plume.geometry.translate(0, (r * plumeLen) / 2, 0); // the cone's wide base at the origin, its tip r·plumeLen up
  plume.geometry.rotateX(Math.PI / 2); // up becomes astern (+z)
  plume.position.set(x, y, z + len + 0.05);
  g.add(plume);
  g.userData.plumes.push(plume);
  return plume;
}

function plumeMaterial(color) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.38, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
}

/** A loft's half-width at `z`, between its sections: where its flat side is. */
export function halfWidthAt(sections, z) {
  for (let i = 0; i < sections.length - 1; i++) {
    const a = sections[i], b = sections[i + 1];
    if (z >= a.z && z <= b.z) return (a.w + ((z - a.z) / (b.z - a.z)) * (b.w - a.w)) / 2;
  }
  return sections[sections.length - 1].w / 2;
}

/** A row of lit windows along a hull's flat side (`side` ±1), set into the loft's surface: glowing slits, some dark. */
export function windows(g, sections, side, y, z0, z1, { step = 1.6, color = '#ffd9a0', seed = 1, w = 0.9, lit = 0.8 } = {}) {
  const r = mulberry(seed);
  const m = glow(color);
  for (let z = z0; z <= z1; z += step) {
    if (r() < 1 - lit) continue; // at lit 0.8 the same windows stay dark as before it was a setting
    g.add(at(box(0.08, 0.35, w, m), side * (halfWidthAt(sections, z) + 0.02), y, z));
  }
}

/** Recolours everything that glows with the drive: the throats, the plumes, the halos. */
export function setEngineColor(obj, color) {
  const u = obj.userData;
  u.engMat?.color.set(color);
  u.plumeMat?.color.set(color);
  for (const h of u.halos ?? []) h.material.color.set(color);
}

/** The plumes grow with the speed `k` (0 stopped, 1 flat out). */
export function setThrust(obj, k) {
  const u = obj.userData;
  if (!u.plumes?.length) return;
  for (const p of u.plumes) {
    p.scale.set(1, 1, 0.12 + k);
    p.visible = k > 0.01;
  }
  u.plumeMat.opacity = 0.12 + 0.3 * Math.min(1, k);
}

export function base(engineColor) {
  const g = new THREE.Group();
  g.userData.halos = [];
  g.userData.plumes = [];
  g.userData.engMat = new THREE.MeshBasicMaterial({ color: engineColor, toneMapped: false });
  g.userData.plumeMat = plumeMaterial(engineColor);
  return g;
}

// --- the ships ------------------------------------------------------------------------------------------------

// The Kestrel is a model now: her parts, her settings and her builder are in models/kestrel.mjs, which the game and the
// shipyard both call (2026-10-29).

const ROOK_HULL = metal('#5a2b28', { rough: 0.6 });
const ROOK_FIN = metal('#3a1c1c', { plated: false, rough: 0.7 });
const ROOK_GLASS = new THREE.MeshStandardMaterial({ color: '#2a0c0c', roughness: 0.15, metalness: 0.9, emissive: '#1a0404', flatShading: true });

/** The Wren in the bay and the Rook raider share a body: a pointed fuselage, a canopy, swept wings, two cannons. */
export function fighter({ rook = false, paint = '#d8d2c2', engine: engineColor = '#58b0ff' } = {}) {
  const g = base(rook ? '#ff5540' : engineColor);
  const hullMat = rook ? ROOK_HULL : metal(paint, { metalness: 0.3 });
  g.userData.hullMat = hullMat;
  const { engMat, plumeMat } = g.userData;
  const body = loft([
    { z: -6, w: 0.3, h: 0.3, y: -0.25 },
    { z: -3.6, w: 1.5, h: 1.05, y: -0.1 },
    { z: -1, w: 2.2, h: 1.6, y: 0 },
    { z: 2, w: 2.4, h: 1.5, y: 0 },
    { z: 3.6, w: 1.9, h: 1.2, y: 0 }
  ], hullMat, { uv: 4 });
  const canopy = loft([{ z: -2.6, w: 0.5, h: 0.3, y: 0.75 }, { z: -1.4, w: 1.3, h: 0.9, y: 0.95 }, { z: 0.4, w: 1.3, h: 0.8, y: 0.95 }, { z: 1.4, w: 0.8, h: 0.4, y: 0.8 }], rook ? ROOK_GLASS : GLASS, { uv: 2 });
  body.userData.cockpitHidden = canopy.userData.cockpitHidden = true;
  g.add(body);
  // The Wren's canopy lifts on a hinge at its back (openCanopy), so you can climb in. s6.
  const hinge = new THREE.Group();
  hinge.position.set(0, 0.85, 1.3);
  canopy.position.set(0, -0.85, -1.3);
  hinge.add(canopy);
  g.add(hinge);
  g.userData.canopyHinge = hinge;
  if (rook) {
    for (const s of [-1, 1]) {
      g.add(wing(s * 1.0, s * 5.6, 3.6, 1.4, -0.6, 0.28, hullMat, { y: 0, z: 0.8 }));
      g.add(at(cyl(0.16, 0.2, 3.6, DARK, 8), s * 5.4, 0, -0.2, Math.PI / 2)); // cannons
      g.add(at(box(0.3, 0.3, 0.3, glow('#ff5540')), s * 5.7, 0, 1.6));
      g.add(at(loft([{ z: -0.4, w: 0.25, h: 1.4 }, { z: 2.4, w: 0.25, h: 4.6 }, { z: 3.0, w: 0.25, h: 4.2 }], ROOK_FIN, { uv: 3 }), s * 6, 0, 0)); // the Rooks hang fins off the wingtips
    }
  } else {
    // The Wren's wings fold: each outer panel, with its cannon and its light, hinges up at mid-span (foldWings), so
    // she is 7.6 m across, not 11.7, and goes through the Kestrel's 8 m bay door (TS-S5-WRENBAY). s6.
    const FOLD = 3.3, DIH = -0.1;
    g.userData.wingFolds = [];
    for (const s of [-1, 1]) {
      g.add(wing(s * 1.0, s * FOLD, 3.6, 2.5, 0.7, 0.28, hullMat, { y: -0.3, z: 0.8, dihedral: DIH }));
      const pivot = new THREE.Group();
      pivot.position.set(s * FOLD, -0.3 + (FOLD - 1) * Math.sin(DIH), 0.8 + 0.7);
      const outer = wing(0, s * (5.6 - FOLD), 2.5, 1.4, 0.7, 0.2, hullMat, { dihedral: DIH });
      pivot.add(outer);
      const rel = (x, y, z) => [x - pivot.position.x, y - pivot.position.y, z - pivot.position.z];
      pivot.add(at(cyl(0.16, 0.2, 3.6, DARK, 8), ...rel(s * 5.4, -0.75, -0.2), Math.PI / 2)); // cannons
      pivot.add(at(box(0.3, 0.3, 0.3, glow('#39d27a')), ...rel(s * 5.7, -0.7, 1.6)));
      pivot.userData.side = s;
      g.add(pivot);
      g.userData.wingFolds.push(pivot);
    }
  }
  engine(g, 0, 0, 3.4, 0.75, engMat, plumeMat, { len: 0.5 });
  g.userData.muzzles = [new THREE.Vector3(-5.4, rook ? 0 : -0.75, -2.2), new THREE.Vector3(5.4, rook ? 0 : -0.75, -2.2)];
  g.userData.eye = new THREE.Vector3(0, 1.25, -0.6);
  return g;
}

/** The Wren's outer wing panels: 0 spread for flight, 1 folded up over her for the bay. */
export function foldWings(g, k) {
  for (const p of g.userData.wingFolds ?? []) p.rotation.z = p.userData.side * k * 1.62;
  g.userData.folded = k;
}

/** The Wren's canopy: 0 shut, 1 lifted on its hinge. */
export function openCanopy(g, k) {
  const h = g.userData.canopyHinge;
  if (h) h.rotation.x = k * 0.62;
}

/** A Rook corvette: a fat plated hull with a bridge tower, sponsons, a turret fore and aft, a belly airlock to hack.
 *  The boarding rooms (capitalInterior, x ±8.1, y −3..0.2, z −32.5..20) sit inside her main loft. */
export function corvette() {
  const g = base('#ff5540');
  const hullMat = metal('#5a3634', { rough: 0.6 });
  const { engMat, plumeMat } = g.userData;
  const HULL = [
    { z: -50, w: 4, h: 3, y: -0.5 },
    { z: -40, w: 11, h: 7, y: 0 },
    { z: -32, w: 15, h: 9.5, y: 0.5 },
    { z: -10, w: 19.5, h: 11, y: 1 },
    { z: 20, w: 20, h: 11, y: 0.8 },
    { z: 37, w: 16, h: 9, y: 0 }
  ];
  g.add(loft(HULL, hullMat, { uv: 12 }));
  g.add(loft([{ z: 0, w: 5, h: 2, y: 6.5 }, { z: 3, w: 8, h: 6, y: 9 }, { z: 13, w: 8, h: 6, y: 9 }, { z: 15, w: 5, h: 2, y: 6.5 }], metal('#6a4240'), { uv: 6 })); // bridge tower
  g.add(at(box(6.4, 1.2, 0.2, glow('#ff8a60')), 0, 10, 2.9)); // tower windows
  for (const s of [-1, 1]) {
    g.add(loft([{ z: -8, w: 2, h: 2, x: s * 11.5 }, { z: -2, w: 5, h: 4, x: s * 11.5 }, { z: 26, w: 5, h: 4, x: s * 11.5 }, { z: 30, w: 3, h: 2.6, x: s * 11.5 }], metal('#3e2624'), { uv: 6 })); // sponsons
    engine(g, s * 5, 0.5, 37, 2.2, engMat, plumeMat);
    windows(g, HULL, s, 1.4, -24, 16, { color: '#ff9a70', step: 2, seed: s > 0 ? 7 : 8 });
  }
  engine(g, 0, 3, 37, 1.4, engMat, plumeMat);
  const turrets = [];
  for (const z of [-22, 24]) {
    const yaw = new THREE.Group();
    yaw.position.set(0, 6.6, z);
    yaw.add(at(cyl(2, 2.3, 1, DARK, 12), 0, 0, 0));
    const pitch = new THREE.Group();
    pitch.position.set(0, 1.1, 0);
    pitch.add(loft([{ z: -1.2, w: 2, h: 1, c: 0.4 }, { z: 1.2, w: 2.6, h: 1.3, c: 0.4 }], TRIM, { uv: 3 }));
    pitch.add(at(cyl(0.25, 0.3, 4, DARK, 8), 0, 0, -2.6, Math.PI / 2));
    yaw.add(pitch);
    g.add(yaw);
    turrets.push({ yaw, pitch, tip: new THREE.Vector3(0, 0, -4.6) });
  }
  g.userData.turrets = turrets;
  // The airlock: a lit ring under the belly, aft. Hold a fighter beside it and hack it.
  const ring = at(cyl(2.6, 2.6, 0.6, glow('#ffb347'), 16), 0, -5.2, 18);
  g.add(ring);
  g.userData.airlock = new THREE.Vector3(0, -9, 18); // where a fighter docks, below the ring
  g.userData.airlockRing = ring;
  g.userData.nameplate = 'CARRION';
  return g;
}

/** A Guild hauler: containers on a spine, a cab at the bow, slow and worth boarding. */
export function freighter() {
  const g = base('#ffb347');
  const { engMat, plumeMat } = g.userData;
  const cab = metal('#8a6a2a');
  g.add(at(box(4, 4, 76, TRIM), 0, 0, 0)); // spine
  g.add(loft([{ z: -44, w: 6, h: 5 }, { z: -40, w: 11, h: 9 }, { z: -28, w: 13, h: 10.5 }, { z: -25, w: 12, h: 10 }], cab, { uv: 8 })); // cab
  g.add(at(box(8, 1.4, 0.2, glow('#ffd28a')), 0, 2.6, -41.9));
  const rand = mulberry(3);
  const colors = ['#c98b2a', '#9aa3ad', '#3d5a80', '#7a2e2e', '#2f6f4e'];
  for (let i = 0; i < 5; i++) {
    for (const s of [-1, 1]) {
      const c = at(box(8, 7, 11, metal(colors[Math.floor(rand() * colors.length)], { rough: 0.7, metalness: 0.2 })), s * 6.2, 0, -16 + i * 12.5);
      g.add(c);
      g.add(at(box(8.1, 0.25, 11.1, DARK), s * 6.2, 3.4, -16 + i * 12.5)); // the lid's rim
    }
  }
  for (const s of [-1, 1]) engine(g, s * 3, 0, 38, 2.4, engMat, plumeMat);
  g.userData.turrets = [];
  g.userData.airlock = new THREE.Vector3(0, -8, -26);
  g.userData.airlockRing = at(cyl(2.4, 2.4, 0.6, glow('#ffb347'), 16), 0, -4.2, -26);
  g.add(g.userData.airlockRing);
  g.userData.nameplate = 'GUILD HAULER';
  return g;
}

/** A thread gate: a segmented ring with lit nodes round a disc of pale, breathing light. Fly into it and press J. */
export function gate() {
  const g = new THREE.Group();
  const frame = metal('#3c4350');
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const seg = at(new THREE.Mesh(new THREE.TorusGeometry(40, 3, 6, 4, (Math.PI * 2) / 16 - 0.06), frame), 0, 0, 0, 0, 0, a);
    g.add(seg);
  }
  const disc = new THREE.Mesh(new THREE.CircleGeometry(37, 48), new THREE.MeshBasicMaterial({ color: '#b48cff', transparent: true, opacity: 0.28, side: THREE.DoubleSide, toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending }));
  g.add(disc);
  g.userData.disc = disc;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.add(at(box(3.4, 3.4, 7, frame), Math.cos(a) * 42, Math.sin(a) * 42, 0, 0, 0, a));
    g.add(at(box(1.4, 1.4, 7.2, glow('#d9c7ff')), Math.cos(a) * 44, Math.sin(a) * 44, 0, 0, 0, a));
  }
  return g;
}

/** A cargo pod or a data core: a small spinning octahedron with a light in it. */
export function pod({ core = false } = {}) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.OctahedronGeometry(1.6), metal(core ? '#2a3a5a' : '#6b6f78', { plated: false })));
  g.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.7), glow(core ? '#58b0ff' : '#ffb347')));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTexture(), color: core ? '#58b0ff' : '#ffb347', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.setScalar(7);
  g.add(halo);
  g.userData.spin = core ? 1.4 : 0.6;
  return g;
}

/** A floating name over a hull, for the HUD to read; nothing is drawn here. */
export function nameOf(kind) {
  return { frigate: 'KESTREL', fighter: 'WREN', pirate: 'ROOK RAIDER', corvette: 'CARRION', freighter: 'GUILD HAULER', station: 'STATION', gate: 'THREAD GATE', derelict: 'MERIDIAN', pod: 'POD' }[kind] ?? kind.toUpperCase();
}
