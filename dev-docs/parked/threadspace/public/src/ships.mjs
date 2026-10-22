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
const shell = (m) => (m.layers.set(SHELL_LAYER), m);

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
const DARK = new THREE.MeshStandardMaterial({ color: '#23272e', roughness: 0.6, metalness: 0.5, flatShading: true });
const TRIM = new THREE.MeshStandardMaterial({ color: '#3a414d', roughness: 0.5, metalness: 0.5, flatShading: true });
const GLASS = new THREE.MeshStandardMaterial({ color: '#0e1a2a', roughness: 0.12, metalness: 0.9, emissive: '#0a1626', flatShading: true });

let _halo;
function haloTexture() {
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
 *  cut by `c` of the smaller half-side. Sections in increasing z. Flat-shaded, plating tiled every `uv` metres. */
export function loft(sections, material, { uv = 10, chamfer = 0.32 } = {}) {
  const rings = sections.map((s) => {
    const a = s.w / 2, b = s.h / 2, c = Math.min(a, b) * (s.c ?? chamfer), x = s.x ?? 0, y = s.y ?? 0;
    return [[a, b - c], [a - c, b], [-(a - c), b], [-a, b - c], [-a, -(b - c)], [-(a - c), -b], [a - c, -b], [a, -(b - c)]].map(([px, py]) => new THREE.Vector3(x + px, y + py, s.z));
  });
  const pos = [];
  const uvs = [];
  const tri = (p, q, r, tp, tq, tr) => {
    pos.push(p.x, p.y, p.z, q.x, q.y, q.z, r.x, r.y, r.z);
    uvs.push(...tp, ...tq, ...tr);
  };
  for (let i = 0; i < rings.length - 1; i++) {
    const A = rings[i], B = rings[i + 1];
    const us = [0];
    for (let k = 0; k < 8; k++) us.push(us[k] + A[k].distanceTo(A[(k + 1) % 8]));
    for (let k = 0; k < 8; k++) {
      const k2 = (k + 1) % 8;
      const u0 = us[k] / uv, u1 = us[k + 1] / uv, v0 = A[k].z / uv, v1 = B[k].z / uv;
      tri(A[k], A[k2], B[k2], [u0, v0], [u1, v0], [u1, v1]);
      tri(A[k], B[k2], B[k], [u0, v0], [u1, v1], [u0, v1]);
    }
  }
  const cap = (R, out) => {
    const c = R.reduce((s, p) => s.add(p), new THREE.Vector3()).multiplyScalar(1 / 8);
    for (let k = 0; k < 8; k++) {
      const k2 = (k + 1) % 8;
      const t = (p) => [p.x / uv, p.y / uv];
      if (out > 0) tri(c, R[k], R[k2], t(c), t(R[k]), t(R[k2]));
      else tri(c, R[k2], R[k], t(c), t(R[k2]), t(R[k]));
    }
  };
  cap(rings[0], -1);
  cap(rings[rings.length - 1], 1);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, material);
}

/** A wing: a slab tapering from a root chord at `x0` to a tip chord at `x1`, swept by `sweep` metres. */
function wing(x0, x1, root, tip, sweep, thick, material, { y = 0, z = 0, dihedral = 0 } = {}) {
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
function engine(g, x, y, z, r, engMat, plumeMat, { len = 1.6 } = {}) {
  g.add(at(cyl(r * 0.85, r, len, DARK, 12), x, y, z + len / 2, Math.PI / 2));
  g.add(at(cyl(r * 0.7, r * 0.7, 0.1, engMat, 12), x, y, z + len + 0.02, Math.PI / 2));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTexture(), color: engMat.color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.setScalar(r * 3.2);
  halo.position.set(x, y, z + len + 0.3);
  g.add(halo);
  g.userData.halos.push(halo);
  const plume = new THREE.Mesh(new THREE.ConeGeometry(r * 0.62, r * 6, 12, 1, true), plumeMat);
  plume.geometry.translate(0, r * 3, 0); // the cone's wide base at the origin, its tip r·6 up
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
function halfWidthAt(sections, z) {
  for (let i = 0; i < sections.length - 1; i++) {
    const a = sections[i], b = sections[i + 1];
    if (z >= a.z && z <= b.z) return (a.w + ((z - a.z) / (b.z - a.z)) * (b.w - a.w)) / 2;
  }
  return sections[sections.length - 1].w / 2;
}

/** A row of lit windows along a hull's flat side (`side` ±1), set into the loft's surface: glowing slits, some dark. */
function windows(g, sections, side, y, z0, z1, { step = 1.6, color = '#ffd9a0', seed = 1, w = 0.9 } = {}) {
  const r = mulberry(seed);
  const m = glow(color);
  for (let z = z0; z <= z1; z += step) {
    if (r() < 0.2) continue;
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

function base(engineColor) {
  const g = new THREE.Group();
  g.userData.halos = [];
  g.userData.plumes = [];
  g.userData.engMat = new THREE.MeshBasicMaterial({ color: engineColor, toneMapped: false });
  g.userData.plumeMat = plumeMaterial(engineColor);
  return g;
}

// --- the ships ------------------------------------------------------------------------------------------------

/** The Kestrel: a long plated hull with the bridge in her bow, a turret on her spine, swept wings with nacelles, a
 *  fighter bay astern between two drives. The rooms (interiors.mjs, x ±8.1, y −2..1.1, z −33.5..34) sit inside her
 *  main loft, which is the shell. */
export function frigate({ paint = '#9aa3ad', engine: engineColor = '#58b0ff' } = {}) {
  const g = base(engineColor);
  const hullMat = metal(paint);
  g.userData.hullMat = hullMat;
  const { engMat, plumeMat } = g.userData;
  const HULL = [
    { z: -48, w: 3, h: 2, y: -1.3 },
    { z: -40, w: 9, h: 5, y: -0.5 },
    { z: -34, w: 12, h: 7, y: 0 },
    { z: -20, w: 15, h: 9, y: 0.5 },
    { z: 0, w: 17, h: 9.5, y: 0.5 },
    { z: 20, w: 18, h: 9, y: 0.3 },
    { z: 36, w: 17, h: 8, y: 0 }
  ];
  g.add(shell(loft(HULL, hullMat, { uv: 12 })));
  // The bridge's glass: a dark band round the bow's brow, over the room's window line.
  g.add(at(loft([{ z: -36, w: 8.4, h: 1.4, c: 0.4 }, { z: -27, w: 10.6, h: 1.8, c: 0.4 }], GLASS, { uv: 4 }), 0, 2.9, 0));
  // A raised spine down her back with the turret on it, and a sensor mast aft of it.
  g.add(loft([{ z: -18, w: 2, h: 1, y: 5.2 }, { z: -12, w: 5, h: 1.8, y: 5.4 }, { z: 14, w: 5, h: 1.8, y: 5.1 }, { z: 26, w: 2.4, h: 1, y: 4.4 }], TRIM, { uv: 6 }));
  g.add(loft([{ z: 4, w: 0.6, h: 0.6, y: 6.5 }, { z: 6, w: 1.2, h: 4, y: 8 }, { z: 10, w: 1.2, h: 3, y: 7.4 }, { z: 12, w: 0.6, h: 0.6, y: 6.5 }], TRIM, { uv: 4 }));
  g.add(at(box(0.15, 3, 0.15, DARK), 0, 11, 8));
  // A keel along her belly, and the prow under the helm's eye line, so the helm sees her nose ahead of it.
  g.add(loft([{ z: -30, w: 1, h: 0.6, y: -4.1 }, { z: -20, w: 4, h: 1.4, y: -4.4 }, { z: 26, w: 4, h: 1.4, y: -4.6 }, { z: 34, w: 2, h: 0.8, y: -4.3 }], TRIM, { uv: 6 }));
  g.add(at(cyl(0.12, 0.5, 6, TRIM, 6), 0, -2.2, -50.5, -Math.PI / 2));
  g.add(at(box(0.4, 0.4, 0.6, glow('#ff5540')), 0, -2.2, -53.6)); // the running light on the nose
  for (const s of [-1, 1]) {
    g.add(wing(s * 8.2, s * 17, 18, 8, 7, 1.3, hullMat, { y: -1.2, z: 13 }));
    g.add(loft([{ z: 4, w: 2.2, h: 2.2, x: s * 16.5, y: -1 }, { z: 7, w: 3.4, h: 3.4, x: s * 16.5, y: -1 }, { z: 21, w: 3.4, h: 3.4, x: s * 16.5, y: -1 }, { z: 23, w: 2.8, h: 2.8, x: s * 16.5, y: -1 }], hullMat, { uv: 6 }));
    engine(g, s * 16.5, -1, 23, 1.2, engMat, plumeMat, { len: 0.8 });
    engine(g, s * 6, 1.2, 36, 1.9, engMat, plumeMat);
    windows(g, HULL, s, 0.2, -18, 14, { seed: s > 0 ? 3 : 4 });
    g.add(at(box(0.5, 0.5, 0.5, glow(s > 0 ? '#39d27a' : '#ff5540')), s * 21.5, -1.2, 18)); // wingtip lights
  }
  // The bay door between the drives, ringed in amber.
  g.add(at(box(8, 4, 0.2, DARK), 0, -1.5, 36.05));
  g.add(at(box(8.4, 0.18, 0.1, glow('#ffb347')), 0, 0.6, 36.15));
  // The port airlock's door, lit.
  const side = -halfWidthAt(HULL, -6);
  g.add(at(box(0.12, 2.6, 2.2, DARK), side - 0.04, -0.6, -6));
  g.add(at(box(0.08, 0.2, 2.2, glow('#ffb347')), side - 0.08, 0.8, -6));
  // The turret: a yaw ring on the spine with a pitching block and twin barrels. Aimed by the gunner or by you.
  const turret = new THREE.Group();
  const yaw = new THREE.Group();
  yaw.add(at(cyl(2.2, 2.5, 1, DARK, 12), 0, 0.5, 0));
  const pitch = new THREE.Group();
  pitch.position.set(0, 1.4, 0);
  pitch.add(loft([{ z: -1.4, w: 2.2, h: 1, c: 0.4 }, { z: -0.6, w: 2.8, h: 1.5, c: 0.4 }, { z: 1.4, w: 2.8, h: 1.5, c: 0.4 }], TRIM, { uv: 3 }));
  for (const s of [-1, 1]) {
    pitch.add(at(cyl(0.2, 0.24, 4.2, DARK, 8), s * 0.7, 0.1, -3.2, Math.PI / 2));
    pitch.add(at(cyl(0.3, 0.3, 0.5, DARK, 8), s * 0.7, 0.1, -5.1, Math.PI / 2));
  }
  yaw.add(pitch);
  turret.add(yaw);
  turret.position.set(0, 6.2, -8);
  g.add(turret);
  g.userData.turret = { group: turret, yaw, pitch, tip: new THREE.Vector3(0, 0.1, -5.5) };
  g.userData.turretEye = new THREE.Vector3(0, 2.4, 2.6); // where the gunner's eyes are, in the pitch frame
  g.userData.airlock = new THREE.Vector3(-7.5, 0, -6); // the port airlock: EVA out of here, back in here
  g.userData.bayExit = new THREE.Vector3(0, -1.5, 41); // the fighter appears here, flying astern
  g.userData.bayLand = new THREE.Vector3(0, -1.5, 62); // land from here
  g.userData.lights = [];
  for (const [x, z] of [[-6, -20], [6, -20], [-7, 10], [7, 10]]) g.add(at(box(0.5, 0.5, 0.5, glow('#ffd9a0')), x, 5.3, z));
  return g;
}

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
  g.add(body, canopy);
  for (const s of [-1, 1]) {
    g.add(wing(s * 1.0, s * 5.6, 3.6, 1.4, rook ? -0.6 : 1.4, 0.28, hullMat, { y: rook ? 0 : -0.3, z: 0.8, dihedral: rook ? 0 : -0.1 }));
    g.add(at(cyl(0.16, 0.2, 3.6, DARK, 8), s * 5.4, rook ? 0 : -0.75, -0.2, Math.PI / 2)); // cannons
    g.add(at(box(0.3, 0.3, 0.3, glow(rook ? '#ff5540' : '#39d27a')), s * 5.7, rook ? 0 : -0.7, 1.6));
    if (rook) g.add(at(loft([{ z: -0.4, w: 0.25, h: 1.4 }, { z: 2.4, w: 0.25, h: 4.6 }, { z: 3.0, w: 0.25, h: 4.2 }], ROOK_FIN, { uv: 3 }), s * 6, 0, 0)); // the Rooks hang fins off the wingtips
  }
  engine(g, 0, 0, 3.4, 0.75, engMat, plumeMat, { len: 0.5 });
  g.userData.muzzles = [new THREE.Vector3(-5.4, rook ? 0 : -0.75, -2.2), new THREE.Vector3(5.4, rook ? 0 : -0.75, -2.2)];
  g.userData.eye = new THREE.Vector3(0, 1.25, -0.6);
  return g;
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

/** A station: a slowly turning ring of lit windows round a stacked hub, spokes, solar wings, and the docking arm
 *  above the hub. The docking point is the end of the arm. */
export function station({ faction = 'concord', seed = 1 } = {}) {
  const g = new THREE.Group();
  const rook = faction === 'rooks';
  const main = metal(rook ? '#4a3432' : '#7a828e', { rough: 0.6 });
  const dark = metal(rook ? '#2e2222' : '#3c434e', { rough: 0.6 });
  const light = rook ? '#ff8c42' : '#9fd4ff';
  const rand = mulberry(seed);
  // The ring turns about the hub; everything else holds still, so the dock stays where the ship parks.
  const ring = new THREE.Group();
  ring.add(at(new THREE.Mesh(new THREE.TorusGeometry(150, 14, 10, 48), main), 0, 0, 0, Math.PI / 2));
  ring.add(at(new THREE.Mesh(new THREE.TorusGeometry(150, 15, 4, 48), dark), 0, 0, 0, Math.PI / 2));
  for (let i = 0; i < 140; i++) {
    const a = rand() * Math.PI * 2;
    const y = (rand() - 0.5) * 14;
    ring.add(at(box(2.6, 1, 0.5, glow(rand() < 0.15 ? '#ffd9a0' : light)), Math.cos(a) * 164.2, y, Math.sin(a) * 164.2, 0, -a + Math.PI / 2));
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    ring.add(at(box(7, 7, 110, dark), Math.cos(a) * 92, 0, Math.sin(a) * 92, 0, -a + Math.PI / 2));
  }
  g.add(ring);
  g.userData.spinner = ring;
  // The hub: a stack of drums, wide in the middle.
  g.add(at(cyl(26, 30, 30, main, 16), 0, 0, 0));
  g.add(at(cyl(48, 48, 14, dark, 24), 0, 0, 0));
  g.add(at(cyl(20, 26, 30, main, 16), 0, -30, 0));
  g.add(at(cyl(10, 20, 20, dark, 16), 0, -55, 0));
  g.add(at(cyl(30, 26, 26, main, 16), 0, 28, 0));
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    g.add(at(box(4, 1.2, 0.4, glow(light)), Math.cos(a) * 48.3, 3 * ((i % 2) * 2 - 1), Math.sin(a) * 48.3, 0, -a + Math.PI / 2));
  }
  // Solar wings off the bottom drum.
  const panel = new THREE.MeshStandardMaterial({ color: '#1a2a4a', roughness: 0.3, metalness: 0.8, emissive: '#050a14' });
  for (const s of [-1, 1]) {
    g.add(at(box(140, 0.6, 3, dark), s * 95, -30, 0));
    for (let k = 0; k < 4; k++) g.add(at(box(28, 0.4, 40, panel), s * (50 + k * 31), -30, 0));
  }
  // A dish on the top drum.
  g.add(at(new THREE.Mesh(new THREE.SphereGeometry(14, 16, 8, 0, Math.PI * 2, 0, Math.PI / 3), dark), 22, 48, 10, -2.2, 0, 0.4));
  // The docking arm: out of the plane, so a frigate parks above the ring and the concourse looks down on it.
  g.add(at(box(10, 60, 10, dark), 0, 75, 0));
  for (let y = 50; y < 104; y += 9) g.add(at(box(10.4, 0.6, 10.4, glow(light)), 0, y, 0));
  g.add(at(cyl(14, 14, 6, glow(light), 16), 0, 108, 0));
  g.userData.dock = new THREE.Vector3(0, 130, 0); // park here
  g.userData.dockRadius = 110;
  g.userData.light = light;
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

/** A dead ship: a hull torn in two, no lights, drifting. The Meridian's data core sits in its wound. */
export function derelict() {
  const g = new THREE.Group();
  const m = metal('#454850', { rough: 0.8, metalness: 0.2 });
  const fore = loft([{ z: -40, w: 3, h: 2 }, { z: -30, w: 11, h: 8 }, { z: -6, w: 14, h: 9 }, { z: -3, w: 12, h: 8, c: 0.1 }], m, { uv: 10 });
  fore.rotation.set(0.1, 0, 0.3);
  const aft = loft([{ z: 9, w: 12, h: 8, c: 0.1 }, { z: 12, w: 14, h: 9 }, { z: 32, w: 13, h: 8 }, { z: 36, w: 8, h: 5 }], m, { uv: 10 });
  aft.position.set(4, -3, 0);
  aft.rotation.set(-0.2, 0.15, -0.4);
  g.add(fore, aft);
  g.add(at(box(2, 6, 10, DARK), -2, 0, 2, 0.4, 0.3, 0.2)); // the broken spine
  for (let i = 0; i < 6; i++) g.add(at(box(0.5, 0.5, 4 + i, DARK), -3 + i * 1.3, -1 + (i % 3), 4, i * 0.4, i * 0.7, 0)); // torn frames
  g.add(at(cyl(2, 2, 1, DARK), 4, -3, 37, Math.PI / 2));
  g.userData.nameplate = 'MERIDIAN';
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

export function asteroid(rand, size) {
  const geo = new THREE.IcosahedronGeometry(size, 1);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const k = 0.75 + rand() * 0.5;
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k);
  }
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: ['#5a5f66', '#6b5a4a', '#4a4f58'][Math.floor(rand() * 3)], roughness: 0.95, metalness: 0.05, flatShading: true }));
}

/** A floating name over a hull, for the HUD to read; nothing is drawn here. */
export function nameOf(kind) {
  return { frigate: 'KESTREL', fighter: 'WREN', pirate: 'ROOK RAIDER', corvette: 'CARRION', freighter: 'GUILD HAULER', station: 'STATION', gate: 'THREAD GATE', derelict: 'MERIDIAN', pod: 'POD' }[kind] ?? kind.toUpperCase();
}
