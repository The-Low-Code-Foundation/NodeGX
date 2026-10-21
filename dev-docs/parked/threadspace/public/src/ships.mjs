// Every hull in the game, built from boxes and cylinders: flat colours, hard edges. A ship's nose points
// along -z (the way a camera looks). Each builder returns a Group with the places other code needs in
// `userData`: engines to glow, a turret to aim, an airlock to dock at, a bay to launch from.

import * as THREE from 'three';
import { box, cyl, at, mat, glow, mulberry } from './util.mjs';

const DARK = '#2a2e35';
const TRIM = '#3c4350';

/** The player's frigate: a long hull, a bridge block at the bow, a turret on the spine, a fighter bay door astern. */
export function frigate({ paint = '#9aa3ad', engine = '#58b0ff' } = {}) {
  const g = new THREE.Group();
  const hullMat = new THREE.MeshLambertMaterial({ color: paint, flatShading: true });
  const engMat = new THREE.MeshBasicMaterial({ color: engine, toneMapped: false });
  g.userData.hullMat = hullMat;
  g.userData.engMat = engMat;
  g.add(at(box(14, 8, 56, hullMat), 0, 0, 2)); // main hull
  g.add(at(box(10, 6, 16, hullMat), 0, 0.5, -28)); // bow, the bridge is in here
  g.add(at(box(8, 2.6, 8, glow('#0d1b2a')), 0, 2.2, -30)); // the canopy band
  g.add(at(cyl(0.8, 2.4, 12, hullMat, 6), 0, -3.4, -42, -Math.PI / 2)); // the prow, low under the helm's eye line
  g.add(at(box(0.4, 0.4, 2, glow('#ff5540')), 0, -2.2, -47.5)); // the running light on the nose
  g.add(at(box(16, 4, 12, hullMat), 0, -1, 24)); // the stern block: the bay
  g.add(at(box(14, 3.2, 2, DARK), 0, -1, 30.5)); // the bay door
  for (const s of [-1, 1]) {
    g.add(at(box(10, 1.2, 14, hullMat), s * 11, -1, 8)); // wings
    g.add(at(cyl(1.6, 1.6, 10, TRIM), s * 14, -1, 12, Math.PI / 2)); // nacelles
    g.add(at(cyl(1.4, 1.4, 0.8, engMat), s * 14, -1, 17.2, Math.PI / 2));
    g.add(at(cyl(2, 2, 1, engMat), s * 4, 0, 30.8, Math.PI / 2)); // main engines
  }
  g.add(at(box(2, 5, 6, TRIM), 0, 6, 0)); // the spine mast
  // The turret: a yaw ring on the spine with a pitching barrel. Aimed by the gunner or by you.
  const turret = new THREE.Group();
  const yaw = new THREE.Group();
  yaw.add(at(cyl(2.2, 2.4, 1.2, DARK), 0, 0.6, 0));
  const pitch = new THREE.Group();
  pitch.position.set(0, 1.4, 0);
  pitch.add(at(box(2.6, 1.4, 2.4, TRIM), 0, 0, 0));
  for (const s of [-1, 1]) pitch.add(at(cyl(0.22, 0.22, 4, DARK), s * 0.7, 0.1, -2.6, Math.PI / 2));
  yaw.add(pitch);
  turret.add(yaw);
  turret.position.set(0, 4, -8);
  g.add(turret);
  g.userData.turret = { group: turret, yaw, pitch, tip: new THREE.Vector3(0, 0.1, -4.8) };
  g.userData.turretEye = new THREE.Vector3(0, 2.4, 2.6); // where the gunner's eyes are, in the pitch frame
  g.userData.airlock = new THREE.Vector3(-7.5, 0, -6); // the port airlock: EVA out of here, back in here
  g.userData.bayExit = new THREE.Vector3(0, -1, 40); // the fighter appears here, flying astern
  g.userData.bayLand = new THREE.Vector3(0, -1, 60); // land from here
  g.userData.lights = [];
  for (const [x, z] of [[-7, -20], [7, -20], [-7, 10], [7, 10]]) {
    const l = at(box(0.6, 0.6, 0.6, glow('#ffd9a0')), x, 4.1, z);
    g.add(l);
  }
  return g;
}

/** The fighter in the bay and the Rook raider share a body: a cockpit pod, two wings, two cannons. */
export function fighter({ rook = false, paint = '#d8d2c2', engine = '#58b0ff' } = {}) {
  const g = new THREE.Group();
  const hullMat = rook ? mat('#4a2a2a') : new THREE.MeshLambertMaterial({ color: paint, flatShading: true });
  const engMat = new THREE.MeshBasicMaterial({ color: rook ? '#ff5540' : engine, toneMapped: false });
  g.userData.hullMat = hullMat;
  g.userData.engMat = engMat;
  const body = at(box(2.2, 1.6, 7, hullMat), 0, 0, 0);
  const canopy = at(box(1.4, 0.9, 2.2, glow(rook ? '#2a0c0c' : '#0d1b2a')), 0, 0.9, -0.8);
  body.userData.cockpitHidden = canopy.userData.cockpitHidden = true;
  g.add(body, canopy);
  g.add(at(cyl(0.3, 0.6, 2.6, hullMat, 6), 0, -0.35, -4.6, -Math.PI / 2)); // nose, well under the eye line
  for (const s of [-1, 1]) {
    g.add(at(box(5, 0.25, 3, hullMat), s * 3.5, rook ? 0 : -0.3, 0.6, 0, 0, rook ? 0 : s * 0.12)); // wings
    g.add(at(cyl(0.18, 0.18, 3.6, TRIM), s * 5.4, rook ? 0 : -0.6, -0.4, Math.PI / 2)); // cannons
    if (rook) g.add(at(box(0.3, 4.4, 3, '#3a1e1e'), s * 6, 0, 0.6)); // the Rooks hang fins off the wingtips
  }
  const eng = at(cyl(0.9, 0.9, 0.5, engMat), 0, 0, 3.6, Math.PI / 2);
  eng.userData.cockpitHidden = true;
  g.add(eng);
  g.userData.muzzles = [new THREE.Vector3(-5.4, rook ? 0 : -0.6, -2.2), new THREE.Vector3(5.4, rook ? 0 : -0.6, -2.2)];
  g.userData.eye = new THREE.Vector3(0, 1.25, -0.6);
  return g;
}

/** A Rook corvette: a fat hull with a bridge tower, a turret fore and aft, a belly airlock you can hack. */
export function corvette() {
  const g = new THREE.Group();
  const hullMat = mat('#4a3030');
  g.add(at(box(18, 10, 70, hullMat), 0, 0, 0));
  g.add(at(box(12, 6, 22, hullMat), 0, 0, -38)); // bow
  g.add(at(box(8, 8, 10, '#5a3a3a'), 0, 8, 8)); // bridge tower
  g.add(at(box(7, 2, 3, glow('#2a0c0c')), 0, 9, 3)); // tower windows
  for (const s of [-1, 1]) {
    g.add(at(box(6, 2, 24, '#3a2424'), s * 11, 0, 10)); // sponsons
    g.add(at(cyl(2.2, 2.2, 1, glow('#ff5540')), s * 5, 0, 35.6, Math.PI / 2)); // engines
  }
  const turrets = [];
  for (const z of [-22, 24]) {
    const yaw = new THREE.Group();
    yaw.position.set(0, 5.6, z);
    yaw.add(at(cyl(2, 2.2, 1.2, DARK), 0, 0, 0));
    const pitch = new THREE.Group();
    pitch.position.set(0, 1.2, 0);
    pitch.add(at(box(2.4, 1.2, 2, TRIM), 0, 0, 0));
    pitch.add(at(cyl(0.25, 0.25, 4, DARK), 0, 0, -2.4, Math.PI / 2));
    yaw.add(pitch);
    g.add(yaw);
    turrets.push({ yaw, pitch, tip: new THREE.Vector3(0, 0, -4.4) });
  }
  g.userData.turrets = turrets;
  // The airlock: a lit ring under the belly, aft. Hold a fighter beside it and hack it.
  const ring = at(cyl(2.6, 2.6, 0.6, glow('#ffb347'), 12), 0, -5.2, 18);
  g.add(ring);
  g.userData.airlock = new THREE.Vector3(0, -9, 18); // where a fighter docks, below the ring
  g.userData.airlockRing = ring;
  g.userData.nameplate = 'CARRION';
  return g;
}

/** A Guild hauler: containers on a spine, a cab at the bow, slow and worth boarding. */
export function freighter() {
  const g = new THREE.Group();
  g.add(at(box(4, 4, 76, TRIM), 0, 0, 0)); // spine
  g.add(at(box(12, 10, 14, mat('#8a6a2a')), 0, 0, -34)); // cab
  g.add(at(box(8, 2, 2, glow('#1a1408')), 0, 2, -41.2));
  const rand = mulberry(3);
  for (let i = 0; i < 5; i++) {
    for (const s of [-1, 1]) {
      g.add(at(box(8, 7, 11, mat(['#c98b2a', '#9aa3ad', '#3d5a80', '#7a2e2e'][Math.floor(rand() * 4)])), s * 6.2, 0, -16 + i * 12.5));
    }
  }
  for (const s of [-1, 1]) g.add(at(cyl(2.4, 2.4, 1, glow('#ffb347')), s * 3, 0, 38.6, Math.PI / 2));
  g.userData.turrets = [];
  g.userData.airlock = new THREE.Vector3(0, -8, -26);
  g.userData.airlockRing = at(cyl(2.4, 2.4, 0.6, glow('#ffb347'), 12), 0, -4.2, -26);
  g.add(g.userData.airlockRing);
  g.userData.nameplate = 'GUILD HAULER';
  return g;
}

/** A station: a ring round a hub, docking arms, lit windows. The docking point is the end of one arm. */
export function station({ faction = 'concord', seed = 1 } = {}) {
  const g = new THREE.Group();
  const main = mat(faction === 'rooks' ? '#3a2a2a' : '#6f7782');
  const light = faction === 'rooks' ? '#ff8c42' : '#9fd4ff';
  g.add(at(new THREE.Mesh(new THREE.TorusGeometry(150, 16, 8, 32), main), 0, 0, 0, Math.PI / 2));
  g.add(at(cyl(30, 30, 90, main, 12), 0, 0, 0));
  g.add(at(cyl(50, 50, 20, mat(TRIM), 12), 0, 0, 0));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    g.add(at(box(8, 8, 120, mat(TRIM)), Math.cos(a) * 90, 0, Math.sin(a) * 90, 0, -a + Math.PI / 2));
  }
  const rand = mulberry(seed);
  for (let i = 0; i < 90; i++) {
    const a = rand() * Math.PI * 2;
    const y = (rand() - 0.5) * 20;
    g.add(at(box(3, 1.2, 0.6, glow(light)), Math.cos(a) * 166.5, y, Math.sin(a) * 166.5, 0, -a));
  }
  // The docking arm: out of the plane, so a frigate parks above the ring and the concourse looks down on it.
  const arm = at(box(10, 60, 10, mat(TRIM)), 0, 75, 0);
  g.add(arm);
  g.add(at(cyl(14, 14, 6, glow(light), 12), 0, 108, 0));
  g.userData.dock = new THREE.Vector3(0, 130, 0); // park here
  g.userData.dockRadius = 110;
  g.userData.light = light;
  return g;
}

/** A thread gate: a ring of pale light. Fly into it and press J. */
export function gate() {
  const g = new THREE.Group();
  g.add(at(new THREE.Mesh(new THREE.TorusGeometry(40, 3, 6, 24), mat(TRIM)), 0, 0, 0));
  const disc = new THREE.Mesh(new THREE.CircleGeometry(37, 24), new THREE.MeshBasicMaterial({ color: '#b48cff', transparent: true, opacity: 0.28, side: THREE.DoubleSide, toneMapped: false, depthWrite: false }));
  g.add(disc);
  g.userData.disc = disc;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.add(at(box(1.5, 1.5, 1.5, glow('#d9c7ff')), Math.cos(a) * 40, Math.sin(a) * 40, 0));
  }
  return g;
}

/** A dead ship: a hull torn in two, no lights, drifting. The Meridian's data core sits in its wound. */
export function derelict() {
  const g = new THREE.Group();
  const m = mat('#3a3d44');
  g.add(at(box(14, 9, 34, m), 0, 0, -20, 0.1, 0, 0.3));
  g.add(at(box(14, 9, 26, m), 4, -3, 22, -0.2, 0.15, -0.4));
  g.add(at(box(2, 6, 10, mat('#23252b')), -2, 0, 2, 0.4, 0.3, 0.2)); // the broken spine
  g.add(at(cyl(2, 2, 1, mat('#2a2a2a')), 0, -3, 36, Math.PI / 2));
  g.userData.nameplate = 'MERIDIAN';
  return g;
}

/** A cargo pod or a data core: a small spinning octahedron with a light in it. */
export function pod({ core = false } = {}) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.OctahedronGeometry(1.6), mat(core ? '#2a3a5a' : '#6b6f78')));
  g.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.7), glow(core ? '#58b0ff' : '#ffb347')));
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
  return new THREE.Mesh(geo, mat(['#5a5f66', '#6b5a4a', '#4a4f58'][Math.floor(rand() * 3)]));
}

/** A floating name over a hull, for the HUD to read; nothing is drawn here. */
export function nameOf(kind) {
  return { frigate: 'KESTREL', fighter: 'WREN', pirate: 'ROOK RAIDER', corvette: 'CARRION', freighter: 'GUILD HAULER', station: 'STATION', gate: 'THREAD GATE', derelict: 'MERIDIAN', pod: 'POD' }[kind] ?? kind.toUpperCase();
}
