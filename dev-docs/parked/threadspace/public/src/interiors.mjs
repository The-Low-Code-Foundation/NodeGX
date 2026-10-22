// The insides: rooms you walk through, built in the host's own frame (the ship's or the station's), so a
// bridge inside a flying frigate stays still under your feet while space moves past the canopy. An
// Interior carries its walls as colliders (boxes in the host frame) and its uses (seats, doors, consoles)
// as interactables the walk controller offers with E.

import * as THREE from 'three';
import { box, cyl, at, mat, glow } from './util.mjs';

const FLOOR = '#2b2f36';
const WALL = '#3a4049';
const CONSOLE = '#1e2a3a';
const TRIM = '#262b33';
const H = 3; // rooms are 3 m high unless they say otherwise
// A ceiling faces down, away from the sky light, and read as a black hole in the roof: it glows a little of its own.
const ceilMat = () => mat('#2c313a', { emissive: '#15181e' });
const glass = new THREE.MeshBasicMaterial({ color: '#7fb0e0', transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide });

export class Interior {
  constructor(host, floorY) {
    this.host = host;
    this.group = new THREE.Group();
    this.group.position.y = 0;
    host.add(this.group);
    this.floorY = floorY;
    this.colliders = [];
    this.interactables = [];
    this.lights = []; // where its lights are; the scene's light pool shines them (lights.mjs)
    this.people = [];
    this.spawn = new THREE.Vector3();
    this.spawnYaw = 0;
  }

  collider(x1, y1, z1, x2, y2, z2) {
    this.colliders.push({ min: new THREE.Vector3(Math.min(x1, x2), Math.min(y1, y2), Math.min(z1, z2)), max: new THREE.Vector3(Math.max(x1, x2), Math.max(y1, y2), Math.max(z1, z2)) });
  }

  use(id, label, x, z, fn, { r = 2.4, y = null, facing = null } = {}) {
    const u = { id, label, pos: new THREE.Vector3(x, y ?? this.floorY + 1.2, z), r, use: fn, facing };
    this.interactables.push(u);
    return u;
  }

  /** A room: floor, ceiling and four walls, each wall with optional gaps (doorways) given as [from, to] along it.
   *  An `open` wall is a parapet that high with a framed window above it. */
  room(cx, cz, w, d, { gaps = {}, floor = FLOOR, wall = WALL, open = {}, h = H } = {}) {
    const y = this.floorY;
    const g = this.group;
    g.add(at(box(w, 0.1, d, floor), cx, y - 0.05, cz));
    g.add(at(box(w, 0.1, d, ceilMat()), cx, y + h + 0.05, cz));
    // Ribs across the ceiling, so it reads as a roof and not as the dark.
    const across = w < d;
    const span = across ? d : w;
    for (let t = -span / 2 + 1.5; t < span / 2 - 0.5; t += 3) {
      g.add(across ? at(box(w, 0.14, 0.3, TRIM), cx, y + h - 0.07, cz + t) : at(box(0.3, 0.14, d, TRIM), cx + t, y + h - 0.07, cz));
    }
    const x1 = cx - w / 2, x2 = cx + w / 2, z1 = cz - d / 2, z2 = cz + d / 2;
    // north (z1) and south (z2) walls run along x; west (x1) and east (x2) along z.
    const sides = [
      ['n', z1, x1, x2, true], ['s', z2, x1, x2, true], ['w', x1, z1, z2, false], ['e', x2, z1, z2, false]
    ];
    for (const [name, c, a, b, alongX] of sides) {
      const segs = [[a, b]];
      for (const [ga, gb] of gaps[name] ?? []) {
        const last = segs.pop();
        segs.push([last[0], ga], [gb, last[1]]);
      }
      for (const [sa, sb] of segs) {
        if (sb - sa < 0.05) continue;
        const len = sb - sa;
        const mid = (sa + sb) / 2;
        const height = open[name] ? open[name] : h; // an "open" wall is a low parapet: a window onto space
        const m = alongX ? at(box(len, height, 0.2, wall), mid, y + height / 2, c) : at(box(0.2, height, len, wall), c, y + height / 2, mid);
        g.add(m);
        // A dark skirting board along the foot of the wall.
        g.add(alongX ? at(box(len, 0.16, 0.26, TRIM), mid, y + 0.08, c) : at(box(0.26, 0.16, len, TRIM), c, y + 0.08, mid));
        if (open[name]) this.window(alongX, c, sa, sb, y + height, y + h);
        if (alongX) this.collider(sa, y, c - 0.1, sb, y + h, c + 0.1);
        else this.collider(c - 0.1, y, sa, c + 0.1, y + h, sb);
      }
    }
    return { x1, x2, z1, z2 };
  }

  /** A window from `y0` to `y1` along a wall line: a frame, mullions about every 3 m, and a faint pane of glass, so
   *  it reads as a window and not as a hole in the ship. */
  window(alongX, c, a, b, y0, y1) {
    const g = this.group;
    const len = b - a, mid = (a + b) / 2, hh = y1 - y0;
    const frame = mat('#4a525e');
    const piece = (l, h2, along, cross, y) => g.add(alongX ? at(box(l, h2, 0.24, frame), along, y, cross) : at(box(0.24, h2, l, frame), cross, y, along));
    piece(len, 0.16, mid, c, y0 + 0.08); // sill
    piece(len, 0.22, mid, c, y1 - 0.11); // head
    const n = Math.max(1, Math.round(len / 3)) | 1; // odd, so no mullion stands in the middle of the helm's view
    for (let i = 0; i <= n; i++) piece(0.16, hh, a + (len * i) / n, c, y0 + hh / 2);
    g.add(alongX ? at(new THREE.Mesh(new THREE.PlaneGeometry(len, hh), glass), mid, y0 + hh / 2, c) : at(new THREE.Mesh(new THREE.PlaneGeometry(len, hh), glass), c, y0 + hh / 2, mid, 0, Math.PI / 2, 0));
  }

  /** A short passage joining two rooms' doorways across the gap between their walls: floor, roof and two side walls.
   *  `along` is the axis you walk it on; (a1, a2) its run on that axis; (b1, b2) its width on the other. */
  passage(along, a1, a2, b1, b2, { floor = FLOOR, wall = WALL, h = H } = {}) {
    const y = this.floorY;
    const g = this.group;
    const [ca, la] = [(a1 + a2) / 2, Math.abs(a2 - a1) + 0.2];
    const [cb, lb] = [(b1 + b2) / 2, Math.abs(b2 - b1)];
    const flat = (hh, col, yy) => (along === 'x' ? at(box(la, hh, lb, col), ca, yy, cb) : at(box(lb, hh, la, col), cb, yy, ca));
    g.add(flat(0.1, floor, y - 0.05), flat(0.1, ceilMat(), y + h + 0.05));
    for (const b of [b1, b2]) {
      g.add(along === 'x' ? at(box(la, h, 0.2, wall), ca, y + h / 2, b) : at(box(0.2, h, la, wall), b, y + h / 2, ca));
      if (along === 'x') this.collider(Math.min(a1, a2), y, b - 0.1, Math.max(a1, a2), y + h, b + 0.1);
      else this.collider(b - 0.1, y, Math.min(a1, a2), b + 0.1, y + h, Math.max(a1, a2));
    }
  }

  /** A ceiling light: a glowing fixture, and a place for the scene's light pool to put a point light (lights.mjs). */
  light(x, z, color = '#ffe6c4', intensity = 18, dist = 14, y = null) {
    const anchor = new THREE.Object3D();
    anchor.position.set(x, y ?? this.floorY + H - 0.3, z);
    this.group.add(anchor);
    this.lights.push({ anchor, color: new THREE.Color(color), intensity, distance: dist, decay: 1.6 });
    this.group.add(at(box(0.8, 0.08, 0.8, glow(color)), x, y ?? this.floorY + H - 0.02, z));
    return anchor;
  }

  prop(mesh, x, z, { collide = true, y = 0, ry = 0 } = {}) {
    const p = at(mesh, x, this.floorY + y, z, 0, ry, 0);
    this.group.add(p);
    if (collide) {
      const b = new THREE.Box3().setFromObject(p);
      this.colliders.push({ min: b.min, max: b.max });
    }
    return p;
  }

  seat(x, z, ry = 0, color = '#4a5260') {
    const s = new THREE.Group();
    s.add(at(box(1, 0.5, 1, color), 0, 0.25, 0));
    s.add(at(box(1, 1.1, 0.2, color), 0, 0.8, 0.45));
    return this.prop(s, x, z, { ry });
  }

  console(x, z, w = 2.4, ry = 0, screen = '#58b0ff', h = 0.9) {
    const c = new THREE.Group();
    c.add(at(box(w, h, 0.8, CONSOLE), 0, h / 2, 0));
    c.add(at(box(w - 0.3, 0.32, 0.06, glow(screen, 0.9)), 0, h + 0.18, -0.1, -0.5));
    return this.prop(c, x, z, { ry });
  }

  person(name, color, x, z, ry = 0) {
    const p = new THREE.Group();
    p.add(at(cyl(0.3, 0.34, 1.3, color), 0, 0.65, 0));
    p.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), mat('#d9b48f')), 0, 1.55, 0));
    p.add(at(box(0.5, 0.12, 0.5, mat('#2a2e35')), 0, 1.7, 0));
    p.position.set(x, this.floorY, z);
    p.rotation.y = ry;
    p.userData.name = name;
    this.group.add(p);
    this.people.push(p);
    return p;
  }

  /** Crates in the hold, one per unit of cargo, stacked in a grid: you can walk down and look at what you carry. */
  crates(items, x0, z0, cols = 4) {
    this.cratesGroup?.removeFromParent();
    this.cratesGroup = new THREE.Group();
    this.group.add(this.cratesGroup);
    this.colliders = this.colliders.filter((c) => !c.crate);
    const colors = { ore: '#6b5a4a', medicine: '#d8d2c2', parts: '#3d5a80', contraband: '#7a2e2e', mission: '#c98b2a', core: '#58b0ff' };
    let i = 0;
    for (const [id, n] of Object.entries(items)) {
      for (let k = 0; k < n; k++) {
        const col = i % cols, row = Math.floor(i / cols);
        const level = Math.floor(row / 3);
        const r = row % 3;
        const c = at(box(0.9, 0.9, 0.9, mat(colors[id] ?? '#777')), x0 + col * 1.1, this.floorY + 0.45 + level * 0.95, z0 + r * 1.1);
        this.cratesGroup.add(c);
        if (level === 0) this.colliders.push({ crate: true, min: new THREE.Vector3(c.position.x - 0.45, this.floorY, c.position.z - 0.45), max: new THREE.Vector3(c.position.x + 0.45, this.floorY + 1, c.position.z + 0.45) });
        i++;
      }
    }
  }

  dispose() {
    this.group.removeFromParent();
  }
}

/** The Kestrel inside: bridge at the bow, a corridor aft past the turret pod, the airlock and your quarters, into the hold and the bay. */
export function frigateInterior(host) {
  const I = new Interior(host, -2);
  // Bridge: open at the front above a parapet, so the helm looks out through the bow.
  I.room(0, -27, 9, 13, { gaps: { s: [[-1.5, 1.5]] }, open: { n: 1 } });
  I.console(0, -32.9, 4, 0, '#58b0ff', 0.7);
  I.seat(0, -31, 0, '#58b0ff');
  I.console(-3.5, -29, 2.2, Math.PI / 2, '#39d27a');
  I.console(3.5, -29, 2.2, -Math.PI / 2, '#ffb347');
  I.prop(box(3, 0.25, 3, mat('#3a4049')), 0, -24.5); // the dais
  I.seat(0, -24.5, 0, '#b48cff');
  I.light(0, -30, '#dbe9ff');
  I.light(0, -23);
  I.use('helm', 'Take the helm', 0, -31.6, 'helm');
  I.use('chair', "Captain's chair: tactical", 0, -24.5, 'tactical');
  // Corridor.
  I.room(0, -7, 3, 27, { gaps: { n: [[-1.5, 1.5]], s: [[-1.5, 1.5]], e: [[-12.5, -7.5]], w: [[-8, -4], [0, 4]] } });
  I.light(0, -16, '#ffe6c4', 10);
  I.light(0, -4, '#ffe6c4', 10);
  I.light(0, 4, '#ffe6c4', 10);
  // Turret pod, starboard: a ladder up to the gun.
  I.room(5.5, -10, 5, 5, { gaps: { w: [[-12.5, -7.5]] } });
  I.prop(at(box(0.6, 2.9, 0.4, mat('#5a6270')), 0, 1.45, 0), 7.5, -10, { collide: false });
  I.console(7.2, -8.2, 1.6, -Math.PI / 2, '#ff5540');
  I.light(5.5, -10, '#ffd0c0', 10);
  I.passage('x', 1.5, 3, -12.5, -7.5); // the corridor's east wall to the pod's west wall: 1.5 m that was open to space
  I.use('turret', 'Climb into the turret', 7.4, -10, 'turret');
  // Airlock, port: the outer door glows.
  I.room(-5.5, -6, 4, 4, { gaps: { e: [[-8, -4]] } });
  I.prop(at(box(0.3, 2.6, 2, mat('#5a6270')), 0, 1.3, 0), -7.4, -6, { collide: false });
  I.prop(at(box(0.1, 0.3, 1.6, glow('#ffb347')), 0, 2.75, 0), -7.3, -6, { collide: false });
  I.light(-5.5, -6, '#ffd0a0', 8);
  I.passage('x', -3.5, -1.5, -8, -4);
  I.use('airlock', 'Cycle the airlock: space walk', -7, -6, 'eva');
  // Quarters, port aft.
  I.room(-5.5, 2, 5, 5, { gaps: { e: [[0, 4]] } });
  I.prop(box(1, 0.5, 2.2, mat('#5b4a8a')), -7, 1.4);
  I.prop(box(0.6, 1.9, 1.2, mat('#3a4049')), -7.5, 3.6);
  I.light(-5.5, 2, '#ffd6e0', 8);
  I.passage('x', -3, -1.5, 0, 4);
  I.use('quarters', 'Your quarters: rest', -6.8, 1.6, 'rest');
  // Cargo hold.
  I.room(0, 12.5, 11, 13, { gaps: { n: [[-1.5, 1.5]], s: [[-2, 2]] } });
  I.light(-3, 10, '#ffe6c4', 12);
  I.light(3, 15, '#ffe6c4', 12);
  I.crateOrigin = [-4.5, 9];
  I.use('hold', 'Cargo manifest', -3, 12, 'cargo', { r: 3 });
  // Fighter bay: the Wren sits on a pad nose astern; the bay door is the back wall.
  I.room(0, 26.5, 13, 15, { gaps: { n: [[-2, 2]] }, floor: '#262a30' });
  I.prop(at(cyl(5, 5, 0.2, mat('#3a4049'), 12), 0, 0.1, 0), 0, 27, { collide: false });
  I.light(-4, 24, '#dbe9ff', 14);
  I.light(4, 30, '#dbe9ff', 14);
  I.prop(at(box(12, 0.3, 0.3, glow('#ffb347')), 0, 2.8, 0), 0, 33.8, { collide: false });
  I.fighterPad = new THREE.Vector3(0, -0.9, 27);
  I.use('fighter', 'Climb into the Wren', 0, 26, 'fighter', { r: 3.2 });
  I.spawn.set(0, -2, -18.5);
  I.spawnYaw = 0;
  I.stations = { helm: { pos: new THREE.Vector3(0, -2, -31), yaw: 0 }, turret: { pos: new THREE.Vector3(6.6, -2, -10), yaw: Math.PI / 2 }, idle: { pos: new THREE.Vector3(2.5, -2, -27), yaw: Math.PI }, idle2: { pos: new THREE.Vector3(-2.5, -2, -26), yaw: Math.PI }, medbay: { pos: new THREE.Vector3(-5.5, -2, 2), yaw: Math.PI / 2 } };
  return I;
}

/** A Rook corvette (or a Guild hauler) inside: airlock under the belly, a long corridor, two side rooms, the bridge at the bow. */
export function capitalInterior(host, { floorY = -3, len = 60 } = {}) {
  const I = new Interior(host, floorY);
  const wall = '#4a3a3a';
  const floor = '#2e2626';
  const zA = len * 0.3; // the airlock, aft
  const zB = -len * 0.45; // the bridge, forward
  I.room(0, zA, 4, 4, { gaps: { n: [[-1.5, 1.5]] }, wall, floor });
  I.light(0, zA, '#ffb347', 8);
  I.prop(at(box(2, 0.1, 2, glow('#ffb347', 0.6)), 0, 0.02, 0), 0, zA, { collide: false });
  // Corridor from the airlock to the bridge.
  const cz = (zA - 2 + zB + 5.5) / 2;
  const cd = zA - 2 - (zB + 5.5);
  I.room(0, cz, 3, cd, { gaps: { n: [[-1.5, 1.5]], s: [[-1.5, 1.5]], e: [[zA - 15, zA - 13]], w: [[zA - 27, zA - 25]] }, wall, floor });
  for (let z = zB + 9; z < zA - 3; z += 9) I.light(0, z, '#ffd0c0', 8);
  // Side rooms: crew to starboard, hold to port.
  I.room(5.5, zA - 14, 5, 6, { gaps: { w: [[zA - 15, zA - 13]] }, wall, floor });
  I.prop(box(1, 0.5, 2.2, mat('#5a3a3a')), 7, zA - 15.5);
  I.prop(box(1, 0.5, 2.2, mat('#5a3a3a')), 7, zA - 12.5);
  I.light(5.5, zA - 14, '#ffd0c0', 8);
  I.passage('x', 1.5, 3, zA - 15, zA - 13, { wall, floor });
  I.room(-5.5, zA - 26, 5, 6, { gaps: { e: [[zA - 27, zA - 25]] }, wall, floor });
  for (const [x, z] of [[-7, zA - 28], [-7, zA - 26], [-5.8, zA - 28]]) I.prop(box(0.9, 0.9, 0.9, mat('#6b5a4a')), x, z, { y: 0.45 });
  I.light(-5.5, zA - 26, '#ffd0c0', 8);
  I.passage('x', -3, -1.5, zA - 27, zA - 25, { wall, floor });
  // The bridge: the seat of the ship. Seize it at the console.
  I.room(0, zB, 9, 11, { gaps: { s: [[-1.5, 1.5]] }, wall, floor, open: { n: 1 } });
  I.console(0, zB - 5, 4, 0, '#ff5540');
  I.seat(0, zB - 3.4, 0, '#ff5540');
  I.console(-3.5, zB - 1, 2, Math.PI / 2, '#ffb347');
  I.console(3.5, zB - 1, 2, -Math.PI / 2, '#ffb347');
  I.light(0, zB, '#ffb0a0', 12);
  I.use('seize', 'Seize the bridge', 0, zB - 4, 'seize', { r: 2.6 });
  I.use('leave', 'Back to the airlock: leave the ship', 0, zA, 'unboard', { r: 2 });
  I.spawn.set(0, floorY, zA);
  I.spawnYaw = 0; // facing -z, up the corridor
  I.defenderSpots = [new THREE.Vector3(0, floorY, zA - 8), new THREE.Vector3(5.5, floorY, zA - 14), new THREE.Vector3(-5.5, floorY, zA - 26), new THREE.Vector3(0, floorY, zB + 2)];
  I.bridgeZ = zB;
  return I;
}

/** A station concourse: one hall with a window on the dock, kiosks along the walls, people at them. */
export function concourseInterior(host, { faction = 'concord' } = {}) {
  const y = 130;
  const I = new Interior(host, y);
  const rook = faction === 'rooks';
  const wall = rook ? '#3a2a2a' : '#3a4049';
  const floor = rook ? '#2a2222' : '#2b2f36';
  // The hall sits beside the dock at z = -40; its south wall is the window on the parked ship.
  const HALL = 6;
  I.room(0, -42, 26, 30, { open: { s: 1 }, wall, floor, h: HALL });
  for (const [x, z] of [[-8, -50], [8, -50], [-8, -36], [8, -36], [0, -43]]) I.light(x, z, rook ? '#ffb380' : '#dbe9ff', 60, 30, y + HALL - 0.3);
  // Pillars, a holo-table in the middle, floor stripes to the kiosks, benches and planters: a place, not a box.
  for (const [x, z] of [[-6, -50], [6, -50], [-6, -34], [6, -34]]) I.prop(at(cyl(0.5, 0.6, HALL, mat(rook ? '#4a3030' : '#4a525e'), 8), 0, HALL / 2, 0), x, z);
  const table = new THREE.Group();
  table.add(at(cyl(1.6, 1.9, 0.9, mat(rook ? '#3a2a2a' : '#2b3340'), 12), 0, 0.45, 0));
  table.add(at(cyl(1.3, 1.3, 0.05, glow(rook ? '#ff8c42' : '#58b0ff', 0.7), 12), 0, 0.93, 0));
  table.add(at(new THREE.Mesh(new THREE.OctahedronGeometry(0.5), glow(rook ? '#ffb347' : '#9fd4ff', 0.9)), 0, 1.6, 0));
  I.prop(table, 0, -43);
  for (const [x1, z1, x2, z2] of [[0, -43, 0, -54], [0, -43, -10, -42], [0, -43, 10, -42], [0, -43, 0, -30]]) {
    const len = Math.hypot(x2 - x1, z2 - z1);
    I.prop(at(box(0.3, 0.02, len, glow(rook ? '#5a3a2a' : '#2f4a6a')), 0, 0.01, 0), (x1 + x2) / 2, (z1 + z2) / 2, { collide: false, ry: Math.atan2(x2 - x1, z2 - z1) });
  }
  for (const [x, z] of [[-9, -52], [9, -52], [-9, -31], [9, -31]]) {
    I.prop(at(cyl(0.7, 0.6, 0.7, mat('#3c4350'), 8), 0, 0.35, 0), x, z);
    I.prop(at(new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 1), mat(rook ? '#6b3a2a' : '#2f6f4e')), 0, 1.2, 0), x, z, { collide: false });
  }
  I.prop(box(14, 0.08, 1, mat(rook ? '#5a3a2a' : '#3c4350')), 0, -56.8, { collide: false, y: 2.6 });
  I.prop(at(box(10, 1.2, 0.05, glow(rook ? '#ffb347' : '#9fd4ff', 0.9)), 0, 0, 0), 0, -56.85, { collide: false, y: 2.0 });
  // A hull round the hall, seen from outside, and the strut down to the arm.
  const shell = box(28, HALL + 2, 32, mat(rook ? '#3a2a2a' : '#6f7782'));
  shell.position.set(0, y + HALL / 2, -42);
  host.add(shell);
  const strut = box(6, 30, 6, mat('#3c4350'));
  strut.position.set(0, y - 14, -28);
  host.add(strut);
  const sign = (text, color) => text; // names live in the HUD
  // Kiosks: missions on the north wall, the trader west, the shipyard east, the bar by the window.
  I.console(0, -55.5, 5, 0, '#58b0ff');
  I.person('Clerk', rook ? '#7a2e2e' : '#3d5a80', 0, -54.2, Math.PI);
  I.use('missions', rook ? 'The job board' : 'Concord mission board', 0, -54, 'tab:missions', { r: 3 });
  I.console(-11.5, -42, 4, Math.PI / 2, '#ffb347');
  I.person('Trader', '#c98b2a', -10.6, -42, Math.PI / 2);
  I.use('trade', 'Trade goods', -10.5, -42, 'tab:trade', { r: 3 });
  I.console(11.5, -42, 4, -Math.PI / 2, '#39d27a');
  I.person('Yard boss', '#2f6f4e', 10.6, -42, -Math.PI / 2);
  I.use('yard', 'Shipyard: upgrades and paint', 10.5, -42, 'tab:yard', { r: 3 });
  I.prop(box(6, 1.1, 1, mat('#4a3a2a')), -4, -31);
  I.person('Barkeep', '#5b4a8a', -4, -29.6, 0);
  I.use('bar', 'The bar: hire crew, hear the wire', -4, -31.5, 'tab:crew', { r: 3 });
  for (let i = 0; i < 4; i++) I.prop(at(box(0.8, 0.5, 0.8, mat('#4a3a2a')), 0, 0.25, 0), 2 + i * 1.6, -30.4, { collide: false });
  I.prop(at(cyl(0.5, 0.5, 0.9, mat('#3a4049'), 8), 0, 0.45, 0), 6, -46);
  I.prop(at(cyl(0.5, 0.5, 0.9, mat('#3a4049'), 8), 0, 0.45, 0), -6, -46);
  // The gangway back to the ship: the window side.
  I.prop(at(box(2.4, 0.1, 6, mat('#3c4350')), 0, 0, 0), 0, -29, { collide: false });
  I.use('undock', 'Gangway: board the Kestrel and undock', 0, -28.4, 'undock', { r: 2.6 });
  I.spawn.set(0, y, -32);
  I.spawnYaw = 0; // facing -z: into the hall
  return I;
}
