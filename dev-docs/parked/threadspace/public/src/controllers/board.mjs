// Boarding: inside a hull that is not yours, with a rifle. The walk controller does the legs; this does the
// shooting both ways. Defenders see you by a ray through the walls, close to a few metres, strafe and fire.
// Reach the bridge, hold E at the console, and the ship is yours.

import * as THREE from 'three';
import { Walker } from './walk.mjs';
import { rand, clamp, glow, cyl, mat, at, box } from '../util.mjs';

const _ray = new THREE.Raycaster();
const _dir = new THREE.Vector3();
const _from = new THREE.Vector3();

export class Boarding {
  constructor(game) {
    this.game = game;
    this.hp = 100;
    this.cool = 0;
    this.kills = 0;
    this.flash = 0;
    this.seizing = 0;
    this.tracers = [];
  }

  /** Into `ship` through its airlock. `interior` is its built inside; defenders stand at its spots. */
  enter(ship, interior) {
    this.ship = ship;
    this.interior = interior;
    this.walker = new Walker(interior);
    this.hp = 100;
    this.kills = 0;
    this.seizing = 0;
    this.defenders = [];
    const g = this.game;
    const n = Math.min(interior.defenderSpots.length, ship.kind === 'corvette' ? 4 : 3);
    for (let i = 0; i < n; i++) {
      const p = interior.person(`Rook ${i + 1}`, ship.side === 'rooks' ? '#7a2e2e' : '#8a6a2a', interior.defenderSpots[i].x, interior.defenderSpots[i].z, Math.PI);
      const gun = at(box(0.12, 0.12, 0.7, mat('#1e2228')), 0.3, 1.1, -0.3);
      p.add(gun);
      this.defenders.push({ mesh: p, hp: 60, cool: rand(0.5, 1.5), strafe: 0, strafeFor: 0, seen: false, alive: true, name: p.userData.name });
    }
    // The marine, if hired: walks a step behind you and shoots what you can see.
    this.marine = null;
    if (g.state.hired.includes('moss')) {
      const p = interior.person('Moss', '#2f6f4e', interior.spawn.x + 1, interior.spawn.z + 1, 0);
      this.marine = { mesh: p, hp: 120, cool: 1 };
    }
    this.weapon = { every: 0.16, damage: g.ship.rifleDamage, spread: 0.012 };
  }

  exit() {
    for (const d of this.defenders) d.mesh.removeFromParent();
    this.marine?.mesh.removeFromParent();
    for (const t of this.tracers) t.removeFromParent();
    this.tracers = [];
  }

  frame(f, dt) {
    const g = this.game;
    this.flash = Math.max(0, this.flash - dt * 3);
    this.cool -= dt;
    this.walker.frame(f, dt);
    if ((f.trigger || f.keys.has('Space')) && this.cool <= 0) this.shoot();
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.userData.t -= dt;
      t.material.opacity = Math.max(0, t.userData.t * 6);
      if (t.userData.t <= 0) {
        t.removeFromParent();
        this.tracers.splice(i, 1);
      }
    }
    for (const d of this.defenders) if (d.alive) this.defender(d, dt);
    if (this.marine) this.marineFrame(dt);
    // Seizing the bridge: hold E at the console with every defender down.
    const use = this.walker.nearestUse();
    if (use?.use === 'seize' && f.keys.has('KeyE') && this.alive() && this.defendersLeft() === 0) {
      this.seizing = Math.min(1, this.seizing + dt / 2);
      if (this.seizing >= 1) g.captured(this.ship);
    } else this.seizing = Math.max(0, this.seizing - dt);
  }

  alive() {
    return this.hp > 0;
  }

  defendersLeft() {
    return this.defenders.filter((d) => d.alive).length;
  }

  /** Where a ray from `from` toward `dir` first lands inside the hull: a wall, a defender, or nothing. */
  cast(from, dir, far = 60, ignore = null) {
    _ray.set(from, dir);
    _ray.far = far;
    const hits = _ray.intersectObject(this.interior.group, true);
    for (const h of hits) {
      let o = h.object;
      while (o && o.parent !== this.interior.group) o = o.parent;
      if (!o || o === ignore) continue;
      const d = this.defenders.find((x) => x.mesh === o);
      if (d && !d.alive) continue;
      if (this.marine && o === this.marine.mesh) continue;
      if (o === this.interior.cratesGroup) continue;
      if (h.object.material?.transparent) continue;
      return { point: h.point, defender: d ?? null, distance: h.distance };
    }
    return null;
  }

  shoot() {
    this.cool = this.weapon.every;
    const w = this.walker;
    const host = this.ship.obj;
    const eye = w.eye(new THREE.Vector3());
    const dir = w.forward(new THREE.Vector3()).add(new THREE.Vector3(rand(-1, 1), rand(-1, 1), 0).multiplyScalar(this.weapon.spread)).normalize();
    const hit = this.cast(eye, dir);
    const end = hit ? hit.point : eye.clone().addScaledVector(dir, 40);
    this.tracer(eye.clone().add(new THREE.Vector3(0.25, -0.2, 0).applyQuaternion(w.quat())), end, '#58f0ff');
    this.game.sfx?.play('xwing', 0);
    if (hit?.defender) this.hurt(hit.defender, this.weapon.damage);
  }

  hurt(d, amount) {
    d.hp -= amount;
    d.seen = true;
    if (d.hp <= 0 && d.alive) {
      d.alive = false;
      d.mesh.rotation.z = Math.PI / 2;
      d.mesh.position.y = this.interior.floorY + 0.35;
      this.kills++;
      this.game.toast(`${d.name} down · ${this.defendersLeft()} left`, this.defendersLeft() ? 'warn' : 'good');
    }
  }

  tracer(a, b, color) {
    const len = a.distanceTo(b);
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, len), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, toneMapped: false }));
    m.position.copy(a).lerp(b, 0.5);
    m.lookAt(b);
    m.userData.t = 0.16;
    this.interior.group.add(m);
    this.tracers.push(m);
  }

  defender(d, dt) {
    const g = this.game;
    const w = this.walker;
    const p = d.mesh.position;
    const eye = w.eye(new THREE.Vector3());
    const head = p.clone().add(new THREE.Vector3(0, 1.5, 0));
    _dir.copy(eye).sub(head);
    const dist = _dir.length();
    _dir.normalize();
    const hit = dist < 40 ? this.cast(head, _dir, dist - 0.3, d.mesh) : { point: null };
    const sees = dist < 40 && !hit; // nothing between its head and your eyes
    if (sees) d.seen = true;
    if (!d.seen) return;
    d.mesh.rotation.y = Math.atan2(-_dir.x, -_dir.z);
    d.cool -= dt;
    // Closes to seven metres, then strafes; shoots when it sees you.
    const step = new THREE.Vector3();
    if (dist > 7) step.addScaledVector(_dir, 2.4 * dt);
    d.strafeFor -= dt;
    if (d.strafeFor <= 0) {
      d.strafe = rand(-1, 1);
      d.strafeFor = rand(0.6, 1.6);
    }
    step.add(new THREE.Vector3(-_dir.z, 0, _dir.x).multiplyScalar(d.strafe * 1.6 * dt));
    step.y = 0;
    const was = p.clone();
    p.add(step);
    this.pushOut(p);
    if (sees && d.cool <= 0 && this.alive()) {
      d.cool = 0.9;
      const aim = _dir.clone().add(new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(0.06)).normalize();
      const muzzle = head.clone().add(new THREE.Vector3(0, -0.3, 0));
      const h = this.cast(muzzle, aim, 60, d.mesh);
      const toYou = eye.clone().sub(muzzle);
      const closest = muzzle.clone().addScaledVector(aim, Math.max(0, toYou.dot(aim)));
      const landed = closest.distanceTo(eye) < 0.55 && (!h || h.distance > dist - 1);
      this.tracer(muzzle, landed ? eye : h ? h.point : muzzle.clone().addScaledVector(aim, 40), '#ff5540');
      g.sfx?.play('tie', dist * 4);
      if (landed) {
        this.hp -= 8 * g.ship.armour;
        this.flash = 1;
        g.sfx?.play('hit', 0);
        if (this.hp <= 0) g.boardingLost();
      }
    }
  }

  marineFrame(dt) {
    const m = this.marine;
    const w = this.walker;
    const behind = w.pos.clone().add(w.forward(new THREE.Vector3()).multiplyScalar(-1.4));
    behind.y = this.interior.floorY;
    m.mesh.position.lerp(behind, Math.min(1, dt * 3));
    m.mesh.rotation.y = w.yaw;
    m.cool -= dt;
    if (m.cool > 0) return;
    const head = m.mesh.position.clone().add(new THREE.Vector3(0, 1.4, 0));
    for (const d of this.defenders) {
      if (!d.alive) continue;
      const target = d.mesh.position.clone().add(new THREE.Vector3(0, 1, 0));
      const dir = target.clone().sub(head);
      const dist = dir.length();
      if (dist > 30) continue;
      dir.normalize();
      const hit = this.cast(head, dir, dist + 0.5);
      if (hit?.defender === d) {
        m.cool = 1.2;
        this.tracer(head, target, '#39d27a');
        this.hurt(d, 20);
        break;
      }
    }
  }

  pushOut(p) {
    const R = 0.35;
    for (const c of this.interior.colliders) {
      const nx = clamp(p.x, c.min.x, c.max.x);
      const nz = clamp(p.z, c.min.z, c.max.z);
      const ex = p.x - nx, ez = p.z - nz;
      const d2 = ex * ex + ez * ez;
      if (d2 >= R * R || d2 < 1e-6) continue;
      const d = Math.sqrt(d2);
      p.x = nx + (ex / d) * R;
      p.z = nz + (ez / d) * R;
    }
  }

  placeCamera(camera) {
    this.walker.placeCamera(camera, this.ship.obj);
  }
}
