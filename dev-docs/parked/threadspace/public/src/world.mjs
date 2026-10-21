// The sector you are in: its entities (every ship, station, gate, pod and rock), built from the data tables
// with the sector's seed, and torn down when you jump. An entity is a thing with a place, a hull and a side.

import * as THREE from 'three';
import { SECTORS, STATIONS, SHIPS, FACTIONS } from './data.mjs';
import * as M from './ships.mjs';
import { mulberry, rand, UP, forwardOf } from './util.mjs';

export class Entity {
  constructor(kind, obj, { side = 'none', hull = 100, shields = 0, radius = 10, half = null, hittable = true, name = null } = {}) {
    this.kind = kind;
    this.obj = obj;
    this.side = side;
    this.hullMax = hull;
    this.hull = hull;
    this.shieldsMax = shields;
    this.shields = shields;
    this.radius = radius;
    this.half = half;
    this.hittable = hittable;
    this.alive = true;
    this.vel = new THREE.Vector3();
    this.speed = 0;
    this.name = name ?? M.nameOf(kind);
    this.ai = null;
    this.onDamage = null;
    this.onDeath = null;
    this.lastHitBy = null;
    this.hitFlash = 0;
  }

  damage(amount, at, bySide, byEntity) {
    if (!this.alive) return;
    this.lastHitBy = bySide;
    this.hitFlash = 1;
    if (this.shields > 0) {
      const s = Math.min(this.shields, amount);
      this.shields -= s;
      amount -= s;
    }
    this.hull -= amount;
    this.onDamage?.(amount, at, bySide, byEntity);
    if (this.hull <= 0) {
      this.hull = 0;
      this.alive = false;
      this.onDeath?.(bySide, byEntity);
    }
  }

  forward(t) {
    return forwardOf(this.obj, t);
  }
}

export class World {
  constructor(scene) {
    this.scene = scene;
    this.entities = [];
    this.sector = null;
    this.gates = [];
    this.station = null;
    this.corvette = null;
    this.freighter = null;
    this.derelict = null;
    this.asteroids = null;
    this.time = 0;
  }

  add(e) {
    this.entities.push(e);
    this.scene.add(e.obj);
    return e;
  }

  remove(e) {
    e.obj.removeFromParent();
    const i = this.entities.indexOf(e);
    if (i >= 0) this.entities.splice(i, 1);
  }

  clear(keep = []) {
    for (const e of [...this.entities]) if (!keep.includes(e)) this.remove(e);
    this.asteroids?.removeFromParent();
    this.asteroids = null;
    this.gates = [];
    this.station = this.corvette = this.freighter = this.derelict = null;
  }

  /** Lays the sector out: gates on a circle, the station near the middle, rocks, a derelict and the Rooks' ships. */
  load(id, { keep = [], captured = {} } = {}) {
    this.clear(keep);
    const S = SECTORS[id];
    this.sector = S;
    const rnd = mulberry(S.seed);
    // Gates: one per thread, 2.6 km out on a circle, each facing the centre.
    const threads = S.threads;
    threads.forEach((to, i) => {
      const a = (i / threads.length) * Math.PI * 2 + S.seed * 0.37;
      const g = M.gate();
      g.position.set(Math.cos(a) * 2600, (rnd() - 0.5) * 300, Math.sin(a) * 2600);
      g.lookAt(0, g.position.y, 0);
      const e = this.add(new Entity('gate', g, { side: 'none', hittable: false, radius: 45, name: `THREAD → ${SECTORS[to].name.toUpperCase()}` }));
      e.to = to;
      this.gates.push(e);
    });
    if (S.station) {
      const st = STATIONS[S.station];
      const g = M.station({ faction: st.faction, seed: S.seed });
      g.position.set(600, 0, -400);
      const e = this.add(new Entity('station', g, { side: st.faction, hittable: false, radius: 200, name: st.name.toUpperCase() }));
      e.station = st;
      this.station = e;
    }
    // Rocks: an instanced field in a thick disc, none within 400 m of the centre or the station.
    const count = S.asteroids;
    if (count) {
      const geo = M.asteroid(rnd, 1).geometry;
      const mesh = new THREE.InstancedMesh(geo, M.asteroid(rnd, 1).material, count);
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const p = new THREE.Vector3();
      const s = new THREE.Vector3();
      this.rocks = [];
      for (let i = 0; i < count; i++) {
        const a = rnd() * Math.PI * 2;
        const r = 500 + rnd() * 2200;
        p.set(Math.cos(a) * r, (rnd() - 0.5) * 500, Math.sin(a) * r);
        if (this.station && p.distanceTo(this.station.obj.position) < 400) p.y += 500;
        const size = 6 + rnd() * rnd() * 60;
        s.setScalar(size);
        q.setFromEuler(new THREE.Euler(rnd() * 6, rnd() * 6, rnd() * 6));
        mesh.setMatrixAt(i, m.compose(p, q, s));
        this.rocks.push({ pos: p.clone(), r: size });
      }
      this.scene.add(mesh);
      this.asteroids = mesh;
    }
    if (S.derelict) {
      const g = M.derelict();
      g.position.set(-900, 120, 700);
      const e = this.add(new Entity('derelict', g, { side: 'none', hittable: false, radius: 60, name: 'MERIDIAN (DERELICT)' }));
      this.derelict = e;
      // Her pods, and the core in the wound, drifting beside her.
      for (let i = 0; i < 3; i++) this.spawnPod(g.position.clone().add(new THREE.Vector3(rand(-40, 40), rand(-20, 20), rand(-40, 40))), { goods: 'parts', qty: 2 });
      this.core = this.spawnPod(g.position.clone().add(new THREE.Vector3(-2, 4, 4)), { core: true });
    }
    if (S.corvette && !captured.corvette) {
      const g = M.corvette();
      g.position.set(700, -60, 900);
      g.rotation.y = 0.8;
      const e = this.add(new Entity('corvette', g, { side: 'rooks', hull: SHIPS.corvette.hull, shields: SHIPS.corvette.shields, radius: SHIPS.corvette.radius, half: SHIPS.corvette.half, name: 'CARRION' }));
      e.cls = SHIPS.corvette;
      e.boardable = true;
      this.corvette = e;
    }
    if (S.freighter) {
      const g = M.freighter();
      const from = this.gates[0].obj.position.clone();
      g.position.copy(from).multiplyScalar(0.8);
      g.position.y += 40;
      const e = this.add(new Entity('freighter', g, { side: 'guild', hull: SHIPS.freighter.hull, shields: SHIPS.freighter.shields, radius: SHIPS.freighter.radius, half: SHIPS.freighter.half, name: 'GUILD HAULER' }));
      e.cls = SHIPS.freighter;
      e.boardable = true;
      e.route = [this.station ? this.station.obj.position.clone().add(new THREE.Vector3(0, 0, 500)) : new THREE.Vector3(0, 0, 0), (this.gates[1] ?? this.gates[0]).obj.position.clone().multiplyScalar(0.85)];
      this.freighter = e;
    }
    for (let i = 0; i < S.pirates; i++) this.spawnPirate(new THREE.Vector3(rand(-1500, 1500), rand(-200, 200), rand(-1500, 1500)));
    this.time = 0;
  }

  spawnPirate(pos, { hunter = false } = {}) {
    const g = M.fighter({ rook: true });
    g.position.copy(pos);
    g.rotation.y = rand(0, 6.28);
    const e = this.add(new Entity('pirate', g, { side: 'rooks', hull: SHIPS.pirate.hull, radius: SHIPS.pirate.radius, half: SHIPS.pirate.half, name: hunter ? 'ROOK HUNTER' : 'ROOK RAIDER' }));
    e.cls = SHIPS.pirate;
    e.hunter = hunter;
    e.speed = 60;
    return e;
  }

  spawnPod(pos, { goods = null, qty = 1, credits = 0, core = false } = {}) {
    const g = M.pod({ core });
    g.position.copy(pos);
    const e = this.add(new Entity('pod', g, { side: 'none', hittable: false, radius: 3, name: core ? 'MERIDIAN DATA CORE' : credits ? 'CREDIT CHIP' : `POD: ${goods.toUpperCase()} ×${qty}` }));
    e.pod = { goods, qty, credits, core };
    e.vel.set(rand(-1, 1), rand(-1, 1), rand(-1, 1));
    return e;
  }

  nearest(from, filter) {
    let best = null;
    let d2 = Infinity;
    for (const e of this.entities) {
      if (!e.alive || (filter && !filter(e))) continue;
      const d = e.obj.position.distanceToSquared(from);
      if (d < d2) (d2 = d), (best = e);
    }
    return best ? { entity: best, distance: Math.sqrt(d2) } : null;
  }

  frame(dt) {
    this.time += dt;
    for (const e of this.entities) {
      if (e.kind === 'pod') {
        e.obj.rotation.y += dt * e.obj.userData.spin;
        e.obj.position.addScaledVector(e.vel, dt);
      }
      if (e.kind === 'gate') e.obj.userData.disc.material.opacity = 0.22 + 0.1 * Math.sin(this.time * 2 + e.obj.position.x);
      if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - dt * 4);
    }
  }
}
