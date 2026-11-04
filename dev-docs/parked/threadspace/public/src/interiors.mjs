// The insides: rooms you walk through, built in the host's own frame (the ship's or the station's), so a
// bridge inside a flying frigate stays still under your feet while space moves past the canopy. An
// Interior carries its walls as colliders (boxes in the host frame) and its uses (seats, doors, consoles)
// as interactables the walk controller offers with E.
//
// s4 (Richard: "a bit more effort on a minimum of recognisability"): panelled walls and plated decks (decor.mjs), a lit
// sign over every door, consoles with screens, and each room furnished as what it is — the bridge's wraparound helm and
// command dais, the turret's ladder and hatch, the airlock's suits and hazard stripes, your bunk and locker, the engine
// room's reactor, the hold's racks and crane, the bay's pad and blast door. All of it is merged into a few meshes when
// the room is done (`bake`), so the detail costs a dozen draw calls, not hundreds.

import * as THREE from 'three';
import { box, cyl, at, mat, glow } from './util.mjs';
import { surfaces, sign, screen, pipe, hazardMat, bake } from './decor.mjs';
import { makePerson, animatePerson } from './people.mjs';
import { model as kestrelModel } from './models/kestrel.mjs';
import { defaultsOf } from './models/model.mjs';

const CONSOLE = '#1e2a3a';
const H = 3; // rooms are 3 m high unless they say otherwise
const glass = new THREE.MeshBasicMaterial({ color: '#7fb0e0', transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide });
const KESTREL = { wall: '#8d96a3', floor: '#5f666f', ceil: '#7a818b', trim: '#2b3038' };

export class Interior {
  constructor(host, floorY, look = KESTREL) {
    this.host = host;
    this.group = new THREE.Group();
    host.add(this.group);
    this.floorY = floorY;
    this.colliders = [];
    this.interactables = [];
    this.lights = []; // where its lights are; the scene's light pool shines them (lights.mjs)
    this.people = [];
    this.rooms = []; // { id, x1, x2, z1, z2, y0, y1 } in the host's frame: what the shipyard points at and checks
    this.ribs = true;
    this.strips = true;
    this.lightLevel = 1;
    this.live = []; // things that move: (dt, t) => void
    this.time = 0;
    this.spawn = new THREE.Vector3();
    this.spawnYaw = 0;
    this.doors = {}; // id → a door that moves (door): the airlock's two, the bay's blast door
    this.alarms = {}; // room id → 'red' | 'amber' | 'green' | 'vacuum' while its lamps say so (alarm)
    this.beacons = [];
    this.look(look);
  }

  /** The surfaces the next rooms are built in (a tint per ship, per room). */
  look(l) {
    this.s = surfaces(l);
    return this;
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
   *  An `open` wall is a parapet that high with a framed window above it. `strip` runs a glowing line along the foot
   *  of the walls. */
  room(cx, cz, w, d, { gaps = {}, open = {}, h = H, strip = null, id = null, doorH = 2.5 } = {}) {
    const y = this.floorY;
    const g = this.group;
    const S = this.s;
    if (!this.strips) strip = null;
    this.roomNow = id;
    if (id) this.rooms.push({ id, x1: cx - w / 2, x2: cx + w / 2, z1: cz - d / 2, z2: cz + d / 2, y0: y, y1: y + h });
    g.add(at(box(w, 0.1, d, S.floor), cx, y - 0.05, cz));
    g.add(at(box(w, 0.1, d, S.ceil), cx, y + h + 0.05, cz));
    // Ribs across the ceiling, so it reads as a roof and not as the dark.
    const across = w < d;
    const span = across ? d : w;
    for (let t = -span / 2 + 1.5; this.ribs && t < span / 2 - 0.5; t += 3) {
      g.add(across ? at(box(w, 0.16, 0.32, S.trim), cx, y + h - 0.08, cz + t) : at(box(0.32, 0.16, d, S.trim), cx + t, y + h - 0.08, cz));
    }
    const x1 = cx - w / 2, x2 = cx + w / 2, z1 = cz - d / 2, z2 = cz + d / 2;
    // north (z1) and south (z2) walls run along x; west (x1) and east (x2) along z. `inward` is the room side.
    const sides = [
      ['n', z1, x1, x2, true, 1], ['s', z2, x1, x2, true, -1], ['w', x1, z1, z2, false, 1], ['e', x2, z1, z2, false, -1]
    ];
    for (const [name, c, a, b, alongX, inward] of sides) {
      const segs = [[a, b]];
      for (const [ga, gb] of gaps[name] ?? []) {
        const last = segs.pop();
        segs.push([last[0], ga], [gb, last[1]]);
        this.doorFrame(alongX, c, ga, gb, y, h, doorH);
      }
      for (const [sa, sb] of segs) {
        if (sb - sa < 0.05) continue;
        const len = sb - sa;
        const mid = (sa + sb) / 2;
        const height = open[name] ? open[name] : h; // an "open" wall is a low parapet: a window onto space
        g.add(alongX ? at(box(len, height, 0.2, S.wall), mid, y + height / 2, c) : at(box(0.2, height, len, S.wall), c, y + height / 2, mid));
        // A dark skirting board along the foot of the wall, and a coving at the top.
        g.add(alongX ? at(box(len, 0.16, 0.26, S.trim), mid, y + 0.08, c) : at(box(0.26, 0.16, len, S.trim), c, y + 0.08, mid));
        if (!open[name]) g.add(alongX ? at(box(len, 0.12, 0.3, S.trim), mid, y + h - 0.06, c) : at(box(0.3, 0.12, len, S.trim), c, y + h - 0.06, mid));
        if (strip && len > 0.6) g.add(alongX ? at(box(len - 0.3, 0.04, 0.04, glow(strip, 0.9)), mid, y + 0.2, c + inward * 0.15) : at(box(0.04, 0.04, len - 0.3, glow(strip, 0.9)), c + inward * 0.15, y + 0.2, mid));
        if (open[name]) this.window(alongX, c, sa, sb, y + height, y + h);
        if (alongX) this.collider(sa, y, c - 0.1, sb, y + h, c + 0.1);
        else this.collider(c - 0.1, y, sa, c + 0.1, y + h, sb);
      }
    }
    return { x1, x2, z1, z2 };
  }

  /** A doorway's frame: two jambs and a lintel, in trim, with a thin light along the lintel. */
  doorFrame(alongX, c, a, b, y, h, doorH = 2.5) {
    const g = this.group;
    const S = this.s;
    const top = Math.min(h, doorH);
    for (const t of [a, b]) g.add(alongX ? at(box(0.18, top, 0.34, S.trim), t, y + top / 2, c) : at(box(0.34, top, 0.18, S.trim), c, y + top / 2, t));
    if (h > top + 0.05) {
      const len = b - a, mid = (a + b) / 2;
      g.add(alongX ? at(box(len, h - top, 0.22, S.wall), mid, y + (top + h) / 2, c) : at(box(0.22, h - top, len, S.wall), c, y + (top + h) / 2, mid));
      g.add(alongX ? at(box(len + 0.36, 0.14, 0.34, S.trim), mid, y + top, c) : at(box(0.34, 0.14, len + 0.36, S.trim), c, y + top, mid));
    }
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
  passage(along, a1, a2, b1, b2, { h = H } = {}) {
    const y = this.floorY;
    const g = this.group;
    const S = this.s;
    const [ca, la] = [(a1 + a2) / 2, Math.abs(a2 - a1) + 0.2];
    const [cb, lb] = [(b1 + b2) / 2, Math.abs(b2 - b1)];
    const flat = (hh, m, yy) => (along === 'x' ? at(box(la, hh, lb, m), ca, yy, cb) : at(box(lb, hh, la, m), cb, yy, ca));
    g.add(flat(0.1, S.floor, y - 0.05), flat(0.1, S.ceil, y + h + 0.05));
    for (const b of [b1, b2]) {
      g.add(along === 'x' ? at(box(la, h, 0.2, S.wall), ca, y + h / 2, b) : at(box(0.2, h, la, S.wall), b, y + h / 2, ca));
      if (along === 'x') this.collider(Math.min(a1, a2), y, b - 0.1, Math.max(a1, a2), y + h, b + 0.1);
      else this.collider(b - 0.1, y, Math.min(a1, a2), b + 0.1, y + h, Math.max(a1, a2));
    }
  }

  /** A ceiling light: a glowing fixture in a frame, and a place for the light pool to put a point light (lights.mjs). */
  /** A ceiling lamp. `alarmed`: its panel is its own (not baked), so a room alarm recolours the panel with the light
   *  (only the airlock's and the bay's: each is one more draw call). */
  light(x, z, color = '#ffe6c4', intensity = 18, dist = 14, y = null, { alarmed = false } = {}) {
    const anchor = new THREE.Object3D();
    const yy = y ?? this.floorY + H;
    anchor.position.set(x, yy - 0.3, z);
    this.group.add(anchor);
    const spec = { anchor, color: new THREE.Color(color), intensity: intensity * this.lightLevel, distance: dist, decay: 1.6, room: this.roomNow };
    this.lights.push(spec);
    this.group.add(at(box(1.0, 0.06, 1.0, this.s.trim), x, yy - 0.01, z));
    const panel = at(box(0.8, 0.06, 0.8, alarmed ? glow(color).clone() : glow(color)), x, yy - 0.04, z);
    if (alarmed) (panel.userData.live = true), (spec.panel = panel.material);
    this.group.add(panel);
    return anchor;
  }

  prop(mesh, x, z, { collide = true, y = 0, ry = 0 } = {}) {
    const p = at(mesh, x, this.floorY + y, z, 0, ry, 0);
    this.group.add(p);
    if (collide) {
      const b = boxIn(p, this.group);
      this.colliders.push({ min: b.min, max: b.max });
    }
    return p;
  }

  /** A sign on a wall, facing `ry` (0 faces +z), its centre at height `y` over the floor. */
  sign(text, x, y, z, ry = 0, color = '#9fd4ff', w = 1.6) {
    const m = sign(text, color, { w, h: w * 0.21 });
    this.group.add(at(m, x, this.floorY + y, z, 0, ry, 0));
    return m;
  }

  /** A screen on a wall or a desk. */
  screen(kind, x, y, z, ry = 0, color = '#58b0ff', w = 0.9, h = 0.5, rx = 0) {
    const m = screen(kind, color, w, h);
    this.group.add(at(m, x, this.floorY + y, z, rx, ry, 0));
    return m;
  }

  seat(x, z, ry = 0, color = '#4a5260', { arms = false, tall = false } = {}) {
    const s = new THREE.Group();
    s.add(at(cyl(0.12, 0.2, 0.3, mat('#2a2f36'), 8), 0, 0.15, 0));
    s.add(at(box(0.9, 0.18, 0.85, color), 0, 0.4, 0));
    s.add(at(box(0.9, tall ? 1.3 : 0.95, 0.18, color), 0, tall ? 1.05 : 0.85, 0.42));
    if (tall) s.add(at(box(0.6, 0.3, 0.2, mat('#2a2f36')), 0, 1.75, 0.44));
    if (arms) for (const sx of [-1, 1]) {
      s.add(at(box(0.14, 0.12, 0.7, mat('#2a2f36')), sx * 0.52, 0.66, 0.05));
      s.add(at(box(0.14, 0.04, 0.3, glow(color, 0.9)), sx * 0.52, 0.73, -0.12));
    }
    return this.prop(s, x, z, { ry });
  }

  /** A console: a desk with a screen tilted toward whoever stands or sits at it (on its +z side), a lit edge. */
  console(x, z, w = 2.4, ry = 0, screenColor = '#58b0ff', h = 0.9, kind = 'status') {
    const c = new THREE.Group();
    c.add(at(box(w, h - 0.08, 0.6, mat(CONSOLE)), 0, (h - 0.08) / 2, -0.1));
    c.add(at(box(w + 0.06, 0.08, 0.8, mat('#2a3442')), 0, h - 0.04, 0));
    c.add(at(box(w, 0.03, 0.03, glow(screenColor, 0.9)), 0, h - 0.02, 0.41));
    const sc = screen(kind, screenColor, Math.min(w - 0.3, 1.4), 0.45);
    c.add(at(sc, 0, h + 0.25, -0.18, -0.45));
    c.add(at(box(Math.min(w - 0.3, 1.4) + 0.1, 0.55, 0.05, mat('#151b24')), 0, h + 0.24, -0.215, -0.45));
    return this.prop(c, x, z, { ry });
  }

  /** A person standing (or sitting) here, in their look (people.mjs). */
  person(name, look, x, z, ry = 0, { pose = 'idle', kind = 'crew', gun = false } = {}) {
    const p = makePerson(look ?? {}, { kind, gun });
    p.position.set(x, this.floorY, z);
    p.rotation.y = ry;
    p.userData.name = name;
    p.userData.pose = pose;
    p.userData.live = true;
    this.group.add(p);
    this.people.push(p);
    return p;
  }

  /** Crates in the hold, one per unit of cargo, stacked in a grid: you can walk down and look at what you carry. */
  crates(items, x0, z0, cols = 4) {
    this.cratesGroup?.removeFromParent();
    this.cratesGroup = new THREE.Group();
    this.cratesGroup.userData.live = true;
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
        c.add(at(box(0.94, 0.12, 0.94, mat('#2a2e35')), 0, 0.3, 0)); // a strap
        if (id === 'core') c.add(at(box(0.5, 0.5, 0.95, glow('#58b0ff', 0.9)), 0, 0, 0));
        this.cratesGroup.add(c);
        if (level === 0) this.colliders.push({ crate: true, min: new THREE.Vector3(c.position.x - 0.45, this.floorY, c.position.z - 0.45), max: new THREE.Vector3(c.position.x + 0.45, this.floorY + 1, c.position.z + 0.45) });
        i++;
      }
    }
  }

  /** A door that moves: `mesh` (kept out of the bake) slides from where it is by `travel` (a vector) as it opens.
   *  `door(id).set(k)`: 0 shut, 1 open. A shut door can be a wall to the walker (`collide`). s6. */
  door(id, mesh, travel, { collide = null } = {}) {
    mesh.userData.live = true;
    this.group.add(mesh);
    const home = mesh.position.clone();
    const c = collide ? { min: new THREE.Vector3(...collide[0]), max: new THREE.Vector3(...collide[1]), door: id } : null;
    if (c) this.colliders.push(c);
    const d = {
      mesh, k: 0,
      set: (k) => {
        d.k = k;
        mesh.position.copy(home).addScaledVector(travel, k);
        if (c) {
          const i = this.colliders.indexOf(c);
          if (k > 0.6 && i >= 0) this.colliders.splice(i, 1);
          else if (k <= 0.6 && i < 0) this.colliders.push(c);
        }
      }
    };
    this.doors[id] = d;
    return d;
  }

  /** A turning warning lamp on a wall or a ceiling: dark until its room's alarm sounds, then it spins and throws two
   *  beams. Not a point light (the pool has eight): the room's own lamps change colour with the alarm instead. */
  beacon(x, y, z, { room = this.roomNow, color = '#ffb347', down = false } = {}) {
    const g = new THREE.Group();
    g.userData.live = true;
    g.add(at(cyl(0.16, 0.2, 0.12, mat('#2a2f36'), 10), 0, 0, 0));
    const lampMat = new THREE.MeshBasicMaterial({ color: '#3a2a14', toneMapped: false });
    g.add(at(cyl(0.12, 0.14, 0.22, lampMat, 10), 0, down ? -0.16 : 0.16, 0));
    const spin = new THREE.Group();
    spin.position.y = down ? -0.16 : 0.16;
    // A beam bright at the lamp and gone at its end (vertex colours under additive blending: black adds nothing). A flat
    // cone read as a sheet of orange paper in s6's first pictures.
    const beamMat = new THREE.MeshBasicMaterial({ color, vertexColors: true, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });
    const cone = new THREE.ConeGeometry(0.9, 4.5, 12, 4, true);
    const cp = cone.attributes.position, fade = new Float32Array(cp.count * 3);
    for (let i = 0; i < cp.count; i++) fade.fill(((cp.getY(i) + 2.25) / 4.5) ** 2, i * 3, i * 3 + 3);
    cone.setAttribute('color', new THREE.BufferAttribute(fade, 3));
    for (const s of [-1, 1]) {
      const beam = new THREE.Mesh(cone, beamMat);
      beam.rotation.z = s * Math.PI / 2;
      beam.position.x = s * 2.25;
      spin.add(beam);
    }
    spin.visible = false;
    g.add(spin);
    g.position.set(x, this.floorY + y, z);
    this.group.add(g);
    this.beacons.push({ room, lampMat, spin, color: new THREE.Color(color) });
    return g;
  }

  /** A room's alarm: 'red' (venting, pulsing), 'amber' (doors moving, pulsing), 'vacuum' (a steady dim red), 'green'
   *  (pressure back), or null (its own lamps again). */
  alarm(room, mode) {
    if (mode) this.alarms[room] = mode;
    else delete this.alarms[room];
  }

  alarmTick(dt) {
    const t = this.time;
    const RED = new THREE.Color('#ff2a1a'), AMBER = new THREE.Color('#ffa020'), GREEN = new THREE.Color('#5dff9a');
    for (const s of this.lights) {
      if (!s.room) continue;
      s.base ??= { color: s.color.clone(), intensity: s.intensity };
      const mode = this.alarms[s.room];
      if (!mode) {
        s.color.copy(s.base.color);
        s.intensity = s.base.intensity;
        s.panel?.color.copy(s.base.color);
        continue;
      }
      const pulse = 0.5 + 0.5 * Math.sin(t * (mode === 'red' ? 7 : 5));
      if (mode === 'red') s.color.copy(RED), (s.intensity = s.base.intensity * (0.25 + 1.1 * pulse));
      else if (mode === 'amber') s.color.copy(AMBER), (s.intensity = s.base.intensity * (0.4 + 0.8 * pulse));
      else if (mode === 'vacuum') s.color.copy(RED), (s.intensity = s.base.intensity * 0.3);
      else if (mode === 'green') s.color.copy(GREEN), (s.intensity = s.base.intensity * 0.9);
      s.panel?.color.copy(s.color).multiplyScalar(Math.min(1, 0.35 + 0.65 * s.intensity / s.base.intensity));
    }
    for (const b of this.beacons) {
      const mode = this.alarms[b.room];
      const on = mode === 'red' || mode === 'amber';
      b.spin.visible = on;
      if (on) b.spin.rotation.y += dt * 5.5;
      b.lampMat.color.copy(on ? b.color : mode === 'vacuum' ? RED : new THREE.Color('#3a2a14'));
    }
  }

  /** Every frame the room is seen: its people breathe and work, its live things move. */
  tick(dt) {
    this.time += dt;
    this.alarmTick(dt);
    for (const p of this.people) animatePerson(p, dt, { pose: p.userData.pose ?? 'idle', speed: p.userData.speed ?? 0, aim: p.userData.aim ?? 0 });
    for (const f of this.live) f(dt, this.time);
  }

  /** Merges the finished room into a few meshes (decor.mjs). Call once, after building and before people and crates. */
  finish() {
    this.baked = bake(this.group, { floorY: this.floorY });
    return this;
  }

  /** Takes the rooms away, and whatever they bolted onto the host's outside (`extras`). */
  dispose() {
    this.group.removeFromParent();
    for (const o of this.extras ?? []) o.removeFromParent();
  }
}

/** `obj`'s bounding box in `frame`'s coordinates (the host's). s1–s3 measured props in the world, which is the host frame
 *  only for a hull built at the origin: aboard the Carrion out in the sector, and on every station concourse, a prop's
 *  collider sat hundreds of metres from the prop, so you walked through crates, bunks and pillars. */
function boxIn(obj, frame) {
  frame.updateWorldMatrix(true, false);
  obj.updateWorldMatrix(false, true);
  const inv = new THREE.Matrix4().copy(frame.matrixWorld).invert();
  const out = new THREE.Box3();
  const m = new THREE.Matrix4();
  obj.traverse((o) => {
    if (!o.isMesh) return;
    o.geometry.computeBoundingBox();
    out.union(o.geometry.boundingBox.clone().applyMatrix4(m.multiplyMatrices(inv, o.matrixWorld)));
  });
  return out;
}

// --- furniture shared by the ships ---------------------------------------------------------------------------------

function bunk(I, x, z, ry = 0, blanket = '#5b4a8a') {
  const b = new THREE.Group();
  b.add(at(box(1.0, 0.35, 2.1, mat('#3a4049')), 0, 0.18, 0));
  b.add(at(box(0.92, 0.14, 2.0, mat('#d8d2c2')), 0, 0.42, 0));
  b.add(at(box(0.94, 0.1, 1.3, mat(blanket)), 0, 0.5, 0.33));
  b.add(at(box(0.6, 0.12, 0.35, mat('#ece6d6')), 0, 0.55, -0.75));
  b.add(at(box(1.0, 0.8, 0.1, mat('#2b3038')), 0, 0.6, -1.05));
  return I.prop(b, x, z, { ry });
}

function locker(I, x, z, ry = 0, color = '#4a525e') {
  const l = new THREE.Group();
  l.add(at(box(0.8, 2.0, 0.55, mat(color)), 0, 1.0, 0));
  l.add(at(box(0.02, 1.9, 0.02, mat('#20242a')), 0, 1.0, 0.28));
  for (const sx of [-0.2, 0.2]) {
    l.add(at(box(0.05, 0.25, 0.04, mat('#c8ccd2')), sx, 1.1, 0.29));
    for (let k = 0; k < 4; k++) l.add(at(box(0.25, 0.02, 0.02, mat('#20242a')), sx, 1.7 - k * 0.05, 0.285));
  }
  return I.prop(l, x, z, { ry });
}

function barrel(I, x, z, color = '#7a2e2e') {
  const b = new THREE.Group();
  b.add(at(cyl(0.3, 0.3, 0.9, mat(color), 10), 0, 0.45, 0));
  for (const y of [0.2, 0.7]) b.add(at(cyl(0.31, 0.31, 0.05, mat('#2a2e35'), 10), 0, y, 0));
  return I.prop(b, x, z);
}

/** Hazard stripes on the floor: a w × d patch. */
function stripes(I, x, z, w, d) {
  I.prop(box(w, 0.02, d, hazardMat()), x, z, { collide: false, y: 0.005 });
}

/** The Kestrel inside: bridge at the bow, a corridor aft past the turret pod, the airlock, your quarters and the engine
 *  room, into the hold and the bay. */
export function frigateInterior(host, v = defaultsOf(kestrelModel)) {
  // Every room's walls, deck, accent strip and lamps are the model's settings (models/kestrel.mjs): the shipyard changes them.
  const KESTREL = { wall: v.corridorWall, floor: v.corridorFloor, ceil: '#7a818b', trim: v.insideTrim };
  const L = (id) => v[`${id}Light`];
  const A = (id) => v[`${id}Accent`];
  const I = new Interior(host, -2, KESTREL);
  I.ribs = v.ribs;
  I.strips = v.strips;
  I.lightLevel = v.lightLevel;
  const T = I.s.trim;
  const Y = I.floorY;

  // --- the bridge: open at the front above a parapet, so the helm looks out over the bow ------------------------
  I.look({ wall: v.bridgeWall, floor: v.bridgeFloor, ceil: '#6f7a8a', trim: '#26303c' });
  I.room(0, -27, 9, 13, { gaps: { s: [[-1.5, 1.5]] }, open: { n: 1 }, strip: A('bridge'), id: 'bridge' });
  // The helm: a wraparound desk in three pieces, screens on it, and the pilot's seat.
  I.console(0, -32.9, 3.2, 0, '#58b0ff', 0.7, 'nav');
  I.console(-2.55, -32.35, 1.8, -0.55, '#39d27a', 0.7, 'status');
  I.console(2.55, -32.35, 1.8, 0.55, '#ffb347', 0.7, 'radar');
  I.seat(0, -31, 0, '#58b0ff', { arms: true, tall: true });
  // Side stations along the walls, each with a seat: sensors to port, weapons and comms to starboard.
  I.console(-3.7, -28.5, 2.4, Math.PI / 2, '#39d27a', 0.9, 'radar');
  I.seat(-2.75, -28.5, Math.PI / 2, '#39d27a');
  I.console(3.7, -28.5, 2.4, -Math.PI / 2, '#ff5540', 0.9, 'target');
  I.seat(2.75, -28.5, -Math.PI / 2, '#ff5540');
  // The command dais: a raised ring with a lit edge and the captain's chair.
  I.prop(cyl(1.7, 1.8, 0.22, mat('#3a4452'), 16), 0, -24.5, { y: 0.11 });
  I.prop(cyl(1.82, 1.82, 0.04, glow('#58b0ff', 0.8), 16), 0, -24.5, { collide: false, y: 0.22 });
  I.seat(0, -24.2, 0, '#b48cff', { arms: true }); // a low back: from the door you see over it to the window
  // Wall screens either side of the door, and the sector plot hanging over the dais.
  I.screen('nav', -2.9, 1.7, -20.62, Math.PI, '#58b0ff', 2.2, 1.0);
  I.screen('status', 2.9, 1.7, -20.62, Math.PI, '#39d27a', 2.2, 1.0);
  I.screen('radar', 0, 2.45, -26.2, 0, '#58b0ff', 1.2, 0.6, 0.35);
  I.prop(box(1.3, 0.7, 0.06, mat('#151b24')), 0, -26.24, { collide: false, y: 2.44 });
  I.prop(box(0.06, 0.3, 0.06, T), 0, -26.24, { collide: false, y: 2.85 });
  I.light(0, -30, L('bridge'));
  I.light(0, -23, L('bridge'));
  I.use('helm', 'Take the helm', 0, -31.6, 'helm');
  I.use('chair', "Captain's chair: the command map", 0, -24.2, 'tactical');
  I.look(KESTREL);

  // --- the corridor ---------------------------------------------------------------------------------------------
  I.room(0, -7, 3, 27, { gaps: { n: [[-1.5, 1.5]], s: [[-1.5, 1.5]], e: [[-12.5, -7.5], [-1.5, 2.5]], w: [[-8, -4], [0, 4]] }, strip: A('corridor'), id: 'corridor' });
  // Pipes and a cable tray along the top corners, bulkhead frames every few metres, a grating down the middle.
  for (const sx of [-1, 1]) {
    I.group.add(pipe(new THREE.Vector3(sx * 1.32, Y + 2.72, -20.4), new THREE.Vector3(sx * 1.32, Y + 2.72, 6.4), 0.07, mat(sx < 0 ? '#7a6a3a' : '#4a6a7a')));
    I.group.add(pipe(new THREE.Vector3(sx * 1.2, Y + 2.82, -20.4), new THREE.Vector3(sx * 1.2, Y + 2.82, 6.4), 0.05, mat('#5a6270')));
  }
  for (const z of [-17.5, -14.5, -2.5, 4.5]) {
    for (const sx of [-1, 1]) I.prop(box(0.2, 3, 0.3, T), sx * 1.38, z, { collide: false, y: 1.5 });
    I.prop(box(3, 0.24, 0.3, T), 0, z, { collide: false, y: 2.86 });
  }
  I.prop(box(0.9, 0.02, 26.5, mat('#3a4048')), 0, -7, { collide: false, y: 0.01 });
  I.sign('BRIDGE ▲', 0, 2.62, -19.9, 0, '#9fd4ff', 1.4);
  I.sign('▼ HOLD · BAY', 0, 2.62, 5.9, Math.PI, '#ffb347', 1.4);
  I.sign('TURRET', 1.38, 2.7, -10, -Math.PI / 2, '#ff8a70', 1.2);
  I.sign('AIRLOCK', -1.38, 2.7, -6, Math.PI / 2, '#ffb347', 1.2);
  I.sign('QUARTERS', -1.38, 2.7, 2, Math.PI / 2, '#d8b4ff', 1.2);
  I.sign('ENGINES', 1.38, 2.7, 0.5, -Math.PI / 2, '#39d27a', 1.2);
  I.light(0, -16, L('corridor'), 10);
  I.light(0, -4, L('corridor'), 10);
  I.light(0, 4, L('corridor'), 10);

  // --- the turret pod, starboard: a ladder up to the gun's hatch ----------------------------------------------------
  I.look({ ...KESTREL, wall: v.turretWall, floor: v.turretFloor });
  I.room(5.5, -10, 5, 5, { gaps: { w: [[-12.5, -7.5]] }, strip: A('turret'), id: 'turret' });
  for (const dz of [-0.28, 0.28]) I.prop(box(0.07, 3, 0.07, mat('#8a929e')), 7.4, -10 + dz, { collide: false, y: 1.5 });
  for (let k = 0; k < 8; k++) I.prop(box(0.06, 0.05, 0.56, mat('#8a929e')), 7.4, -10, { collide: false, y: 0.3 + k * 0.34 });
  I.prop(cyl(0.75, 0.75, 0.12, mat('#3a4049'), 16), 7.2, -10, { collide: false, y: 2.95 });
  I.prop(cyl(0.6, 0.6, 0.13, glow('#ff5540', 0.7), 16), 7.2, -10, { collide: false, y: 2.95 });
  stripes(I, 6.9, -10, 1.6, 1.6);
  I.console(5.2, -12.1, 1.8, 0, '#ff5540', 0.9, 'target');
  for (const z of [-8.3, -11.7]) {
    const rack = new THREE.Group();
    rack.add(at(box(0.5, 1.6, 1.2, mat('#3a4049')), 0, 0.8, 0));
    for (let k = 0; k < 3; k++) rack.add(at(box(0.52, 0.2, 1.0, glow('#ffb347', 0.85)), 0, 0.35 + k * 0.5, 0));
    I.prop(rack, 3.35, z);
  }
  I.light(5.5, -10, L('turret'), 10);
  I.passage('x', 1.5, 3, -12.5, -7.5);
  I.use('turret', 'Climb into the turret', 7.2, -10, 'turret');

  // --- the airlock, port: inner door frame, suits on the wall, the outer door glowing --------------------------------
  I.look({ ...KESTREL, wall: v.airlockWall, floor: v.airlockFloor });
  // s6: the outer door is a door now. It sits in a gap in the outer wall, and a short tunnel runs from it to the hull's
  // own door (the model's `airlock` part); it lifts into the ceiling when the airlock has vented.
  I.room(-5.5, -6, 4, 4, { gaps: { e: [[-8, -4]], w: [[-7.1, -4.9]] }, strip: A('airlock'), id: 'airlock', doorH: 2.6 });
  const hullX = host.userData?.airlock ? host.userData.airlock.x - 0.7 : -8.6;
  if (hullX < -7.6) I.passage('x', hullX, -7.5, -7.1, -4.9, { h: 2.6 });
  const door = new THREE.Group();
  door.add(at(box(0.16, 2.6, 2.2, mat('#5a6270')), 0, 1.3, 0));
  door.add(at(box(0.18, 2.6, 0.14, hazardMat()), 0, 1.3, -1.04));
  door.add(at(box(0.18, 2.6, 0.14, hazardMat()), 0, 1.3, 1.04));
  door.add(at(cyl(0.32, 0.32, 0.2, mat('#0e1a2a'), 14), 0.02, 1.6, 0, 0, 0, Math.PI / 2));
  door.position.set(-7.42, Y, -6);
  I.door('airlockOuter', door, new THREE.Vector3(0, 2.62, 0), { collide: [[-7.6, Y, -7.1], [-7.3, Y + 3, -4.9]] });
  I.prop(box(0.1, 0.3, 1.6, glow('#ffb347')), -7.3, -6, { collide: false, y: 2.8 });
  // The inner door: a shutter across the passage that drops from over the lintel.
  const inner = new THREE.Group();
  inner.add(at(box(0.12, 2.5, 4, mat('#6a727e')), 0, 1.25, 0));
  for (const z of [-1.2, 0, 1.2]) inner.add(at(box(0.14, 2.5, 0.08, mat('#3a4049')), 0, 1.25, z));
  inner.add(at(box(0.14, 0.18, 4, hazardMat()), 0, 0.09, 0));
  inner.add(at(box(0.15, 0.3, 0.5, glow('#39d27a', 0.9)), 0, 1.5, 0));
  inner.position.set(-3.5, Y, -6);
  // Its rest is open (up, over the lintel): 0 is shut, so it starts at 1.
  I.door('airlockInner', inner, new THREE.Vector3(0, 2.52, 0), { collide: [[-3.6, Y, -8], [-3.4, Y + 3, -4]] }).set(1);
  I.beacon(-5.5, 2.92, -6, { down: true, color: '#ff3a24' });
  stripes(I, -6.6, -6, 1.2, 3.6);
  I.prop(box(0.12, 0.5, 0.3, mat('#2a2f36')), -3.7, -7.4, { collide: false, y: 1.4 });
  I.prop(box(0.13, 0.08, 0.08, glow('#39d27a')), -3.66, -7.32, { collide: false, y: 1.55 });
  I.prop(box(0.13, 0.08, 0.08, glow('#ff5540')), -3.66, -7.48, { collide: false, y: 1.55 });
  for (const z of [-7.6, -4.4]) {
    I.prop(box(1.0, 0.08, 0.3, T), -5.6, z, { collide: false, y: 2.25 });
    const suit = makePerson({}, { kind: 'suit' });
    suit.scale.setScalar(0.92);
    I.prop(suit, -5.6, z + (z < -6 ? 0.1 : -0.1), { collide: false, y: 0.2, ry: z < -6 ? 0 : Math.PI });
  }
  I.sign('AIRLOCK · EVA', -5.5, 2.6, -4.12, Math.PI, '#ffb347', 1.3);
  I.light(-5.5, -6, L('airlock'), 8, undefined, null, { alarmed: true });
  I.passage('x', -3.5, -1.5, -8, -4);
  I.use('airlock', 'Cycle the airlock: space walk', -7, -6, 'eva');

  // --- your quarters, port aft: a bunk, a locker (your wardrobe), a desk, a poster ---------------------------------
  I.look({ ...KESTREL, wall: v.quartersWall, floor: v.quartersFloor });
  I.room(-5.5, 2, 5, 5, { gaps: { e: [[0, 4]] }, strip: A('quarters'), id: 'quarters' });
  bunk(I, -7.2, 1.3, 0, '#5b4a8a');
  locker(I, -7.55, 3.75, Math.PI / 2, '#4a5260');
  I.prop(box(1.4, 0.06, 0.6, mat('#4a3a2a')), -5.2, 4.1, { y: 0.75 });
  I.prop(box(1.3, 0.75, 0.05, mat('#3a2e22')), -5.2, 4.38, { collide: false, y: 0.37 });
  I.screen('text', -5.2, 1.15, 4.35, Math.PI, '#d8b4ff', 0.7, 0.4);
  I.seat(-5.2, 3.3, Math.PI, '#5b4a8a');
  I.prop(box(2.2, 0.02, 1.6, mat('#6a3a3a')), -5.6, 1.7, { collide: false, y: 0.01 });
  I.prop(box(0.05, 0.9, 0.7, mat('#e6d9b8')), -7.88, 1.2, { collide: false, y: 1.7 });
  I.prop(box(0.06, 0.5, 0.5, glow('#ff8c42', 0.9)), -7.86, 1.2, { collide: false, y: 1.75 });
  I.light(-5.5, 2, L('quarters'), 8);
  I.passage('x', -3, -1.5, 0, 4);
  I.use('quarters', 'Your bunk: rest', -6.8, 1.2, 'rest');
  I.use('wardrobe', 'Your locker: change your look', -7.0, 3.75, 'wardrobe', { r: 2 });

  // --- the engine room, starboard aft: the reactor in its cage, gauges, pipes to the drives -------------------------
  I.look({ ...KESTREL, wall: v.engineWall, floor: v.engineFloor });
  I.room(5.5, 0.5, 5, 5, { gaps: { w: [[-1.5, 2.5]] }, strip: A('engine'), id: 'engine' });
  const core = new THREE.Group();
  core.add(at(cyl(0.8, 0.9, 0.3, mat('#2a2f36'), 12), 0, 0.15, 0));
  core.add(at(cyl(0.8, 0.9, 0.3, mat('#2a2f36'), 12), 0, 2.85, 0));
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    core.add(at(box(0.1, 2.5, 0.1, mat('#5a6270')), Math.cos(a) * 0.78, 1.5, Math.sin(a) * 0.78));
  }
  for (const y of [0.9, 2.1]) core.add(at(cyl(0.82, 0.82, 0.08, mat('#5a6270'), 12), 0, y, 0));
  I.prop(core, 6.4, 1.2);
  const glowCore = I.prop(cyl(0.42, 0.42, 2.4, glow('#58f0ff', 0.85), 12), 6.4, 1.2, { collide: false, y: 1.5 });
  glowCore.userData.live = true;
  I.live.push((dt, t) => glowCore.scale.set(1 + 0.08 * Math.sin(t * 5), 1, 1 + 0.08 * Math.sin(t * 5)));
  I.console(4.6, -1.55, 2.0, 0, '#39d27a', 0.9, 'reactor');
  for (const [x, z] of [[7.6, -1.6], [7.6, 3.0]]) I.group.add(pipe(new THREE.Vector3(x, Y + 0.3, z), new THREE.Vector3(x, Y + 2.9, z), 0.12, mat('#4a6a7a')));
  I.group.add(pipe(new THREE.Vector3(6.4, Y + 2.9, 1.2), new THREE.Vector3(6.4, Y + 2.9, 2.9), 0.1, mat('#7a6a3a')));
  stripes(I, 6.4, 1.2, 2.4, 2.4);
  I.light(5.5, 0.5, L('engine'), 9);
  I.passage('x', 1.5, 3, -1.5, 2.5);
  I.use('engine', 'The engine room', 4.6, -0.8, 'engine', { r: 2 });

  // --- the cargo hold: racks, a crane rail, painted bays, the manifest terminal -----------------------------------
  I.look({ ...KESTREL, wall: v.holdWall, floor: v.holdFloor });
  I.room(0, 12.5, 11, 13, { gaps: { n: [[-1.5, 1.5]], s: [[-2, 2]] }, strip: A('hold'), id: 'hold' });
  for (const z of [7.4, 10.6, 13.8, 17]) {
    const rack = new THREE.Group();
    for (const dz of [-1.4, 1.4]) rack.add(at(box(0.1, 2.6, 0.1, mat('#c98b2a')), 0, 1.3, dz));
    for (const y of [0.1, 1.2, 2.3]) rack.add(at(box(1.0, 0.08, 2.9, mat('#5a5048')), 0, y, 0));
    I.prop(rack, 4.9, z === 17 ? 16.6 : z);
  }
  for (const [x, z, c] of [[4.9, 7.4, '#7a2e2e'], [4.9, 10.6, '#3d5a80'], [4.9, 13.8, '#6b5a4a']]) {
    I.prop(box(0.8, 0.7, 0.8, mat(c)), x, z - 0.8, { collide: false, y: 1.6 });
    I.prop(box(0.8, 0.7, 0.8, mat('#4a525e')), x, z + 0.7, { collide: false, y: 0.5 });
  }
  barrel(I, 3.6, 18.2, '#3d5a80');
  barrel(I, 2.9, 18.4, '#7a2e2e');
  I.prop(box(10.8, 0.2, 0.3, mat('#c98b2a')), 0, 12.5, { collide: false, y: 2.75 });
  I.prop(box(0.4, 0.3, 0.6, mat('#3a4049')), -1.5, 12.5, { collide: false, y: 2.55 });
  I.prop(box(0.03, 1.1, 0.03, mat('#20242a')), -1.5, 12.5, { collide: false, y: 1.85 });
  I.prop(box(0.4, 0.1, 0.12, mat('#c98b2a')), -1.5, 12.5, { collide: false, y: 1.3 });
  for (const [x, z, w, d] of [[-3, 7.1, 5.6, 0.08], [-3, 12.0, 5.6, 0.08], [-5.3, 9.5, 0.08, 4.9], [-0.7, 9.5, 0.08, 4.9]]) I.prop(box(w, 0.02, d, mat('#d8a830')), x, z, { collide: false, y: 0.01 });
  I.console(-1.4, 18.4, 1.8, Math.PI, '#ffb347', 0.95, 'status');
  I.sign('CARGO HOLD', 0, 2.55, 6.12, 0, '#ffb347', 1.6);
  I.light(-3, 10, L('hold'), 12);
  I.light(3, 15, L('hold'), 12);
  I.crateOrigin = [-4.5, 8];
  I.use('hold', 'Cargo manifest', -1.4, 17.6, 'cargo', { r: 2.6 });

  // --- the fighter bay: the Wren on a marked pad, nose astern; the blast door is the back wall ---------------------
  I.look({ ...KESTREL, wall: v.bayWall, floor: v.bayFloor, ceil: '#5d646e' });
  // s6: taller (4.2 m), so the Wren's canopy lifts; a gap in the back wall where the blast door is, a 2 m tunnel to the
  // stern's own door (the model's `bay` part), and lamps that go red when she vents.
  const BH = 4.2;
  I.room(0, 26.5, 13, 15, { gaps: { n: [[-2, 2]], s: [[-4, 4]] }, strip: A('bay'), id: 'bay', h: BH, doorH: 3.8 });
  I.passage('z', 34, 35.85, -4.1, 4.1, { h: 3.8 });
  I.prop(at(cyl(5, 5, 0.2, mat('#3a4049'), 24), 0, 0.1, 0), 0, 27, { collide: false });
  I.prop(at(cyl(4.6, 4.6, 0.03, glow('#ffb347', 0.85), 24), 0, 0.21, 0), 0, 27, { collide: false });
  I.prop(at(cyl(4.3, 4.3, 0.04, mat('#3a4049'), 24), 0, 0.22, 0), 0, 27, { collide: false });
  for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) I.prop(box(0.25, 0.03, 1.4, glow('#ffb347', 0.85)), Math.sin(a) * 3.4, 27 + Math.cos(a) * 3.4, { collide: false, y: 0.24, ry: a });
  // The blast door: two leaves that part, the top one up into the roof, the bottom one down under the deck.
  for (const [id, y0, hh, dy] of [['bayUpper', 1.9, 1.9, 1.95], ['bayLower', 0, 1.9, -1.95]]) {
    const leaf = new THREE.Group();
    leaf.add(at(box(8.2, hh, 0.2, mat('#3a3f46')), 0, hh / 2, 0));
    for (let k = -3; k <= 3; k += 2) leaf.add(at(box(0.12, hh, 0.25, mat('#2a2e35')), k, hh / 2, 0));
    leaf.add(at(box(8.2, 0.22, 0.26, hazardMat()), 0, id === 'bayUpper' ? 0.11 : hh - 0.11, 0));
    leaf.position.set(0, Y + y0, 33.9);
    I.door(id, leaf, new THREE.Vector3(0, dy, 0));
  }
  I.collider(-4.1, Y, 33.6, 4.1, Y + 3.8, 34.2); // you walk up to the blast door, never through it
  I.prop(at(box(9, 0.3, 0.3, glow('#ffb347')), 0, 3.95, 0), 0, 33.8, { collide: false });
  for (const x of [-5.2, 5.2]) I.beacon(x, 3.3, 33.7);
  I.beacon(0, BH - 0.02, 27, { down: true });
  // The ladder up the Wren's side: out on the deck only while someone climbs it (bayLadder).
  const ladder = new THREE.Group();
  for (const x of [-0.25, 0.25]) ladder.add(at(box(0.06, 2.0, 0.06, mat('#c8ccd2')), x, 1.0, 0));
  for (let k = 0; k < 6; k++) ladder.add(at(box(0.5, 0.05, 0.05, mat('#c8ccd2')), 0, 0.25 + k * 0.32, 0));
  ladder.position.set(-1.55, Y, 28.7);
  ladder.rotation.z = -0.18;
  ladder.visible = false;
  ladder.userData.live = true;
  I.group.add(ladder);
  I.bayLadder = ladder;
  // Tools and fuel down the sides.
  for (const z of [21.5, 31]) {
    const cab = new THREE.Group();
    cab.add(at(box(0.6, 1.2, 1.8, mat('#8a2e2e')), 0, 0.6, 0));
    for (let k = 0; k < 4; k++) cab.add(at(box(0.62, 0.02, 1.7, mat('#2a1e1e')), 0, 0.25 + k * 0.28, 0));
    I.prop(cab, -6.05, z);
  }
  for (const z of [22, 24]) I.prop(cyl(0.45, 0.45, 2.2, mat('#c98b2a'), 12), 5.9, z, { y: 1.1 });
  I.group.add(pipe(new THREE.Vector3(5.9, Y + 2.2, 23), new THREE.Vector3(3.5, Y + 2.6, 26), 0.06, mat('#2a2e35')));
  I.prop(box(0.12, 0.5, 0.6, mat('#2a2f36')), 6.38, 29, { collide: false, y: 1.4 });
  I.screen('status', 6.32, 1.45, 29, -Math.PI / 2, '#58b0ff', 0.5, 0.36);
  I.sign('FIGHTER BAY', 0, 2.75, 19.12, 0, '#9fd4ff', 1.8);
  I.prop(box(3.6, 0.02, 0.9, glow('#2f4a6a')), 0, 20.6, { collide: false, y: 0.012 });
  I.light(-4, 24, L('bay'), 16, 16, Y + BH, { alarmed: true });
  I.light(4, 30, L('bay'), 16, 16, Y + BH, { alarmed: true });
  I.fighterPad = new THREE.Vector3(0, -0.9, 27);
  I.use('fighter', 'Climb into the Wren', 0, 26, 'fighter', { r: 4.8 }); // anywhere beside her, and where the landing leaves you

  I.spawn.set(0, Y, -18.5);
  I.spawnYaw = 0;
  const V = (x, z) => new THREE.Vector3(x, Y, z);
  I.stations = {
    helm: { pos: V(0, -31.05), yaw: 0, pose: 'sit' },
    turret: { pos: V(5.2, -11.3), yaw: 0, pose: 'console' },
    engine: { pos: V(4.6, -0.75), yaw: 0, pose: 'console' },
    chair: { pos: V(0, -22.6), yaw: Math.PI },
    idle: [
      { pos: V(-2.7, -28.5), yaw: Math.PI / 2, pose: 'sit' },
      { pos: V(2.7, -28.5), yaw: -Math.PI / 2, pose: 'sit' },
      { pos: V(-0.6, -9), yaw: Math.PI * 0.6 },
      { pos: V(-2.6, 14.5), yaw: -Math.PI / 2 },
      { pos: V(-4.6, 2.6), yaw: Math.PI }
    ],
    party: [{ pos: V(-4.6, -7.2), yaw: Math.PI / 2 }, { pos: V(-4.6, -4.8), yaw: Math.PI / 2 }],
    airlock: { pos: V(-5.5, -6), yaw: -Math.PI / 2 },
    medbay: { pos: V(-5.0, 1.8), yaw: Math.PI / 2 }
  };
  return I.finish();
}

/** A Rook corvette (or a Guild hauler) inside: airlock under the belly, a long corridor, two side rooms, the bridge at
 *  the bow. Grimmer than the Kestrel: rust-red panels, bare pipes, the Rooks' marks painted on the walls. */
export function capitalInterior(host, { floorY = -3, len = 60, rook = true } = {}) {
  const I = new Interior(host, floorY, rook ? { wall: '#8a6a64', floor: '#4e4442', ceil: '#6a5a56', trim: '#2e2422' } : { wall: '#8e8a7a', floor: '#55524a', ceil: '#706c62', trim: '#2e2c26' });
  const Y = floorY;
  const ink = rook ? '#ff8a70' : '#ffd28a';
  const zA = len * 0.3; // the airlock, aft
  const zB = -len * 0.45; // the bridge, forward
  I.room(0, zA, 4, 4, { gaps: { n: [[-1.5, 1.5]] }, strip: '#ffb347' });
  I.light(0, zA, '#ffb347', 8);
  I.prop(at(box(2, 0.1, 2, glow('#ffb347', 0.6)), 0, 0.02, 0), 0, zA, { collide: false });
  stripes(I, 0, zA + 1.4, 3.6, 0.6);
  // Corridor from the airlock to the bridge: pipes overhead, ribs, a few crates against the walls for cover.
  const cz = (zA - 2 + zB + 5.5) / 2;
  const cd = zA - 2 - (zB + 5.5);
  I.room(0, cz, 3, cd, { gaps: { n: [[-1.5, 1.5]], s: [[-1.5, 1.5]], e: [[zA - 15, zA - 13]], w: [[zA - 27, zA - 25]] }, strip: rook ? '#ff5540' : '#ffb347' });
  for (const sx of [-1, 1]) I.group.add(pipe(new THREE.Vector3(sx * 1.25, Y + 2.7, zB + 5.6), new THREE.Vector3(sx * 1.25, Y + 2.7, zA - 2.1), 0.09, mat(rook ? '#6a3a2a' : '#6a6040')));
  for (let z = zB + 8; z < zA - 3; z += 5) for (const sx of [-1, 1]) I.prop(box(0.2, 3, 0.3, I.s.trim), sx * 1.38, z, { collide: false, y: 1.5 });
  for (let z = zB + 9; z < zA - 3; z += 9) I.light(0, z, rook ? '#ffc0a0' : '#ffe0b0', 8);
  I.prop(box(0.9, 0.9, 0.9, mat('#5a4a3a')), 1.0, zA - 7);
  I.prop(box(0.9, 0.9, 0.9, mat('#4a3a32')), -1.0, zA - 20);
  I.sign(rook ? '☠ BRIDGE' : 'BRIDGE ▲', 0, 2.6, zB + 5.62, 0, ink, 1.4);
  I.sign(rook ? 'CREW' : 'CREW', 1.38, 2.6, zA - 14, -Math.PI / 2, ink, 1.0);
  I.sign(rook ? 'LOOT' : 'HOLD', -1.38, 2.6, zA - 26, Math.PI / 2, ink, 1.0);
  // Side rooms: crew to starboard, hold to port.
  I.room(5.5, zA - 14, 5, 6, { gaps: { w: [[zA - 15, zA - 13]] } });
  bunk(I, 7.3, zA - 15.5, 0, rook ? '#5a2a2a' : '#4a5a3a');
  bunk(I, 7.3, zA - 12.4, Math.PI, rook ? '#3a2a2a' : '#5a4a2a');
  locker(I, 3.6, zA - 16.4, 0, '#3e3634');
  I.prop(box(0.05, 0.9, 1.2, glow(rook ? '#5a1a14' : '#3a3a2a', 0.9)), 7.9, zA - 14, { collide: false, y: 1.8 });
  I.light(5.5, zA - 14, '#ffd0c0', 8);
  I.passage('x', 1.5, 3, zA - 15, zA - 13);
  I.room(-5.5, zA - 26, 5, 6, { gaps: { e: [[zA - 27, zA - 25]] } });
  for (const [x, z, c] of [[-7, zA - 28, '#6b5a4a'], [-7, zA - 26, '#7a2e2e'], [-5.8, zA - 28, '#6b5a4a'], [-7, zA - 24, '#3d5a80']]) I.prop(box(0.9, 0.9, 0.9, mat(c)), x, z, { y: 0.45 });
  I.prop(box(0.9, 0.9, 0.9, mat('#6b5a4a')), -7, zA - 28, { collide: false, y: 1.35 });
  barrel(I, -4.2, zA - 28.2, '#7a2e2e');
  I.light(-5.5, zA - 26, '#ffd0c0', 8);
  I.passage('x', -3, -1.5, zA - 27, zA - 25);
  // The bridge: the seat of the ship. Seize it at the console.
  I.room(0, zB, 9, 11, { gaps: { s: [[-1.5, 1.5]] }, open: { n: 1 }, strip: rook ? '#ff5540' : '#ffb347' });
  I.console(0, zB - 5, 4, 0, rook ? '#ff5540' : '#ffb347', 0.9, 'nav');
  I.seat(0, zB - 3.4, 0, rook ? '#7a2e2e' : '#8a6a2a', { arms: true, tall: true });
  I.console(-3.5, zB - 1, 2, Math.PI / 2, '#ffb347', 0.9, 'radar');
  I.console(3.5, zB - 1, 2, -Math.PI / 2, '#ffb347', 0.9, 'target');
  if (rook) I.prop(box(1.6, 1.0, 0.05, mat('#1a0e0e')), 0, zB + 5.38, { collide: false, y: 1.8 }), I.sign('☠', 0, 1.8, zB + 5.35, Math.PI, '#ff5540', 0.9);
  I.light(0, zB, '#ffb0a0', 12);
  I.use('seize', 'Seize the bridge', 0, zB - 4, 'seize', { r: 2.6 });
  I.use('leave', 'Back to the airlock: leave the ship', 0, zA, 'unboard', { r: 2 });
  I.spawn.set(0, floorY, zA);
  I.spawnYaw = 0; // facing -z, up the corridor
  I.defenderSpots = [new THREE.Vector3(0, floorY, zA - 8), new THREE.Vector3(5.5, floorY, zA - 14), new THREE.Vector3(-5.5, floorY, zA - 26), new THREE.Vector3(0, floorY, zB + 2)];
  I.bridgeZ = zB;
  return I.finish();
}

/** A station concourse: one hall with a window on the dock, kiosks along the walls, people at them. */
export function concourseInterior(host, { faction = 'concord' } = {}) {
  const y = 130;
  const rook = faction === 'rooks';
  const I = new Interior(host, y, rook ? { wall: '#7a625a', floor: '#4a3e3a', ceil: '#5a4a44', trim: '#2a2020' } : { wall: '#8d96a3', floor: '#5a616b', ceil: '#6f7782', trim: '#2b3038' });
  const accent = rook ? '#ffb347' : '#9fd4ff';
  // The hall sits beside the dock at z = -40; its south wall is the window on the parked ship.
  const HALL = 6;
  I.room(0, -42, 26, 30, { open: { s: 1 }, h: HALL, strip: rook ? '#ff8c42' : '#58b0ff' });
  for (const [x, z] of [[-8, -50], [8, -50], [-8, -36], [8, -36], [0, -43]]) I.light(x, z, rook ? '#ffb380' : '#dbe9ff', 60, 30, y + HALL);
  // Pillars, a holo-table in the middle, floor stripes to the kiosks, benches and planters: a place, not a box.
  for (const [x, z] of [[-6, -50], [6, -50], [-6, -34], [6, -34]]) {
    I.prop(at(cyl(0.5, 0.6, HALL, mat(rook ? '#4a3030' : '#4a525e'), 8), 0, HALL / 2, 0), x, z);
    I.prop(at(cyl(0.62, 0.62, 0.1, glow(accent, 0.8), 8), 0, 2.4, 0), x, z, { collide: false });
  }
  const table = new THREE.Group();
  table.add(at(cyl(1.6, 1.9, 0.9, mat(rook ? '#3a2a2a' : '#2b3340'), 12), 0, 0.45, 0));
  table.add(at(cyl(1.3, 1.3, 0.05, glow(rook ? '#ff8c42' : '#58b0ff', 0.7), 12), 0, 0.93, 0));
  I.prop(table, 0, -43);
  const holo = I.prop(at(new THREE.Mesh(new THREE.OctahedronGeometry(0.5), glow(rook ? '#ffb347' : '#9fd4ff', 0.9)), 0, 0, 0), 0, -43, { collide: false, y: 1.6 });
  holo.userData.live = true;
  I.live.push((dt) => (holo.rotation.y += dt * 0.8));
  for (const [x1, z1, x2, z2] of [[0, -43, 0, -54], [0, -43, -10, -42], [0, -43, 10, -42], [0, -43, 0, -30]]) {
    const len = Math.hypot(x2 - x1, z2 - z1);
    I.prop(at(box(0.3, 0.02, len, glow(rook ? '#5a3a2a' : '#2f4a6a')), 0, 0.01, 0), (x1 + x2) / 2, (z1 + z2) / 2, { collide: false, ry: Math.atan2(x2 - x1, z2 - z1) });
  }
  for (const [x, z] of [[-9, -52], [9, -52], [-9, -31], [9, -31]]) {
    I.prop(at(cyl(0.7, 0.6, 0.7, mat('#3c4350'), 8), 0, 0.35, 0), x, z);
    I.prop(at(new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 1), mat(rook ? '#6b3a2a' : '#2f6f4e')), 0, 1.2, 0), x, z, { collide: false });
  }
  for (const x of [-3.5, 3.5]) {
    const bench = new THREE.Group();
    bench.add(at(box(2.4, 0.12, 0.6, mat('#4a3a2a')), 0, 0.45, 0));
    for (const sx of [-1, 1]) bench.add(at(box(0.1, 0.45, 0.5, mat('#2a2f36')), sx * 1.0, 0.22, 0));
    I.prop(bench, x, -37);
  }
  // A hull round the hall, seen from outside, and the strut down to the arm.
  const shell = box(28, HALL + 2, 32, mat(rook ? '#3a2a2a' : '#6f7782'));
  shell.position.set(0, y + HALL / 2, -42);
  host.add(shell);
  const strut = box(6, 30, 6, mat('#3c4350'));
  strut.position.set(0, y - 14, -28);
  host.add(strut);
  // Removed with the rooms on undocking: s1–s3 left both on the station, a new pair for every dock (found by s4's
  // scenery pass).
  I.extras = [shell, strut];
  // Kiosks: missions on the north wall, the trader west, the shipyard east, the bar by the window. Each under a sign.
  I.console(0, -55.5, 5, 0, '#58b0ff', 1.0, 'text');
  I.screen('text', 0, 3.2, -56.85, 0, accent, 6, 1.6);
  I.sign(rook ? 'THE JOB BOARD' : 'CONCORD MISSION BOARD', 0, 4.6, -56.85, 0, accent, 4);
  I.person('Clerk', { skin: 3, hair: 1, hairStyle: 'short', shirt: rook ? 1 : 0, accent: 0 }, 0, -56.4, Math.PI, { pose: 'console' });
  I.use('missions', rook ? 'The job board' : 'Concord mission board', 0, -54, 'tab:missions', { r: 3 });
  I.console(-11.5, -42, 4, Math.PI / 2, '#ffb347', 1.0, 'manifest');
  I.sign('TRADE', -12.85, 3.6, -42, Math.PI / 2, '#ffb347', 2.6);
  for (const z of [-46, -38]) for (const dy of [0, 0.95]) I.prop(box(0.9, 0.9, 0.9, mat(dy ? '#6b5a4a' : '#3d5a80')), -12.2, z, { y: 0.45 + dy });
  I.person('Trader', { skin: 5, hair: 3, hairStyle: 'bun', shirt: 4, accent: 1 }, -12.45, -42, -Math.PI / 2, { pose: 'console' });
  I.use('trade', 'Trade goods', -10.5, -42, 'tab:trade', { r: 3 });
  I.console(11.5, -42, 4, -Math.PI / 2, '#39d27a', 1.0, 'status');
  I.sign('SHIPYARD', 12.85, 3.6, -42, -Math.PI / 2, '#39d27a', 2.6);
  I.prop(cyl(0.3, 0.3, 1.6, mat('#c98b2a'), 10), 12.3, -46.5, { y: 0.8 });
  I.prop(box(0.6, 1.4, 1.2, mat('#8a2e2e')), 12.4, -37.6, { y: 0.7 });
  I.person('Yard boss', { skin: 1, hair: 4, hairStyle: 'cap', face: 'beard', shirt: 2, accent: 2 }, 12.45, -42, Math.PI / 2, { pose: 'console' });
  I.use('yard', 'Shipyard: upgrades and paint', 10.5, -42, 'tab:yard', { r: 3 });
  I.prop(box(6, 1.1, 1, mat('#4a3a2a')), -4, -31);
  I.prop(box(6.2, 0.08, 1.1, glow(rook ? '#ff8c42' : '#58b0ff', 0.5)), -4, -31, { collide: false, y: 1.12 });
  I.sign(rook ? 'THE BLACK FLAG' : 'THE QUIET LANE', -4, 3.4, -27.4, Math.PI, rook ? '#ff8c42' : '#d8b4ff', 3);
  I.person('Barkeep', { skin: 6, hair: 7, hairStyle: 'mohawk', face: 'grin', shirt: 3, accent: 4 }, -4, -29.9, 0, { pose: 'idle' });
  I.use('bar', 'The bar: hire crew, hear the wire', -4, -31.5, 'tab:crew', { r: 3 });
  for (let i = 0; i < 4; i++) I.prop(at(box(0.6, 0.5, 0.6, mat('#4a3a2a')), 0, 0.25, 0), -6.4 + i * 1.6, -32.2, { collide: false });
  I.person('Drinker', { skin: 2, hair: 2, hairStyle: 'long', shirt: 5, accent: 3 }, -5.6, -32.2, Math.PI, { pose: 'sit' });
  I.person('Spacer', { skin: 4, hair: 0, hairStyle: 'buzz', face: 'scar', shirt: 7, accent: 1 }, -2.4, -32.2, Math.PI, { pose: 'sit' });
  I.person('Traveller', { skin: 0, hair: 1, hairStyle: 'short', shirt: 1, accent: 5 }, 3.5, -37.2, Math.PI, { pose: 'sit', kind: 'civilian' });
  I.person('Pilot', { skin: 3, hair: 5, hairStyle: 'bun', face: 'freckles', shirt: 6, accent: 0 }, 5, -48, 0.6, { pose: 'idle', kind: 'civilian' });
  I.prop(at(cyl(0.5, 0.5, 0.9, mat('#3a4049'), 8), 0, 0.45, 0), 6, -46);
  I.prop(at(cyl(0.5, 0.5, 0.9, mat('#3a4049'), 8), 0, 0.45, 0), -6, -46);
  // The gangway back to the ship: the window side.
  I.prop(at(box(2.4, 0.1, 6, mat('#3c4350')), 0, 0, 0), 0, -29, { collide: false });
  I.sign('GANGWAY · KESTREL', 0, 2.8, -27.15, Math.PI, '#39d27a', 2.2);
  I.use('undock', 'Gangway: board the Kestrel and undock', 0, -28.4, 'undock', { r: 2.6 });
  I.spawn.set(0, y, -32);
  I.spawnYaw = 0; // facing -z: into the hall
  return I.finish();
}
