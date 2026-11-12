// Boarding: inside a hull that is not yours, with a rifle. The walk controller does the legs; this does the
// shooting both ways. Defenders see you by a ray through the walls, close to a few metres, strafe and fire.
// Reach the bridge, hold E at the console, and the ship is yours.

import * as THREE from 'three';
import { Walker } from './walk.mjs';
import { rand, clamp } from '../util.mjs';
import { kick } from '../people.mjs';

const _ray = new THREE.Raycaster();
const _dir = new THREE.Vector3();
const _from = new THREE.Vector3();
const _wdir = new THREE.Vector3();
const TRACER = new THREE.BoxGeometry(0.04, 0.04, 1); // one box for every tracer, stretched to its length

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
      const rook = ship.side === 'rooks';
      const p = interior.person(rook ? `Rook ${i + 1}` : `Guard ${i + 1}`, rook ? { accent: 3 } : { shirt: 4, accent: 1, hairStyle: 'cap' }, interior.defenderSpots[i].x, interior.defenderSpots[i].z, Math.PI, { kind: rook ? 'armour' : 'crew', gun: true, pose: 'idle' });
      this.defenders.push({ mesh: p, hp: 60, cool: rand(0.5, 1.5), strafe: 0, strafeFor: 0, seen: false, alive: true, name: p.userData.name });
    }
    // The boarding party (the Crew tab's post): up to two follow a step behind you and shoot what they can see, as
    // well as their Combat lets them (game.crewEffect).
    this.party = g.crewIn('party').map((id, i) => {
      const c = g.crewInfo(id);
      const fx = g.crewEffect(id, 'party');
      const p = interior.person(c.name, c.look, interior.spawn.x + (i ? -1 : 1), interior.spawn.z + 1, 0, { gun: true, pose: 'idle' });
      return { id, name: c.name, mesh: p, hp: fx.hp, hpMax: fx.hp, cool: 1, fx, slot: i ? -1 : 1 };
    });
    this.weapon = { every: 0.16, damage: g.ship.rifleDamage, spread: 0.012 };
  }

  exit() {
    for (const d of this.defenders) d.mesh.removeFromParent();
    for (const m of this.party ?? []) m.mesh.removeFromParent();
    for (const t of this.tracers) t.material.dispose(), t.removeFromParent();
    this.tracers = [];
  }

  frame(f, dt) {
    const g = this.game;
    this.flash = Math.max(0, this.flash - dt * 3);
    this.cool -= dt;
    this.walker.frame(f, dt);
    if ((f.trigger || f.keys.has('Space')) && this.cool <= 0 && (g.viewmodel?.fire() ?? true)) this.shoot();
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.userData.t -= dt;
      t.material.opacity = Math.max(0, t.userData.t * 6);
      if (t.userData.t <= 0) {
        t.material.dispose();
        t.removeFromParent();
        this.tracers.splice(i, 1);
      }
    }
    for (const d of this.defenders) if (d.alive) this.defender(d, dt);
    for (const m of this.party) if (m.hp > 0) this.partyFrame(m, dt);
    this.interior.tick(dt);
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

  /** Where a ray from `from` toward `dir` (both in the ship's frame, like everything aboard) first lands inside the hull:
   *  a wall, a defender, or nothing. The point comes back in the ship's frame too. The raycaster works in the world, so
   *  the ray goes out through the ship's matrix: s1 cast the ship-frame ray straight into the world, where it met
   *  nothing unless the ship sat at the origin, so no rifle shot ever landed and defenders saw through walls (TS-S3-BOARDRAY). */
  cast(from, dir, far = 60, ignore = null) {
    const host = this.ship.obj;
    host.updateMatrixWorld();
    _ray.set(_from.copy(from).applyMatrix4(host.matrixWorld), _wdir.copy(dir).transformDirection(host.matrixWorld));
    _ray.far = far;
    const hits = _ray.intersectObject(this.interior.group, true);
    for (const h of hits) {
      let o = h.object;
      while (o && o.parent !== this.interior.group) o = o.parent;
      if (!o || o === ignore) continue;
      const d = this.defenders.find((x) => x.mesh === o);
      if (d && !d.alive) continue;
      if (this.party.some((m) => m.mesh === o) || o === this.game.avatar) continue;
      if (o === this.interior.cratesGroup) continue;
      if (h.object.material?.transparent) continue;
      return { point: this.interior.group.worldToLocal(h.point.clone()), defender: d ?? null, distance: h.distance };
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
    // The tracer leaves the rifle's muzzle (the viewmodel's, in the first person), not your eyes.
    const vm = this.game.viewmodel;
    let from = eye.clone().add(new THREE.Vector3(0.25, -0.2, 0).applyQuaternion(w.quat()));
    if (vm && !this.game.chase.board) {
      vm.place(this.game.camera);
      from = this.interior.group.worldToLocal(vm.muzzleWorld(new THREE.Vector3()));
    }
    this.tracer(from, end, '#58f0ff');
    if (this.game.chase.board && this.game.avatar) kick(this.game.avatar);
    this.game.sfx?.play('xwing', 0);
    if (hit?.defender) this.hurt(hit.defender, this.weapon.damage);
    return true;
  }

  hurt(d, amount) {
    d.hp -= amount;
    d.seen = true;
    if (d.hp <= 0 && d.alive) {
      d.alive = false;
      d.mesh.userData.pose = 'dead';
      d.mesh.userData.speed = 0;
      this.kills++;
      this.game.toast(`${d.name} down · ${this.defendersLeft()} left`, this.defendersLeft() ? 'warn' : 'good');
    }
  }

  tracer(a, b, color) {
    const len = a.distanceTo(b);
    const m = new THREE.Mesh(TRACER, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, toneMapped: false }));
    m.scale.z = Math.max(0.01, len);
    m.position.copy(a).lerp(b, 0.5);
    m.lookAt(b);
    m.userData.t = 0.16;
    this.interior.group.add(m);
    this.tracers.push(m);
  }

  /** A defender: sees you (or one of your party) by a ray, closes to seven metres, strafes and fires at whoever it
   *  sees nearest. Unseen, it waits at its post. */
  defender(d, dt) {
    const g = this.game;
    const w = this.walker;
    const p = d.mesh.position;
    const head = p.clone().add(new THREE.Vector3(0, 1.5, 0));
    const marks = [{ eye: w.eye(new THREE.Vector3()), you: true }].concat(this.party.filter((m) => m.hp > 0).map((m) => ({ eye: m.mesh.position.clone().add(new THREE.Vector3(0, 1.5, 0)), m })));
    let mark = null, dist = Infinity;
    for (const k of marks) {
      const dd = k.eye.distanceTo(head);
      if (dd > 40 || dd > dist) continue;
      _dir.copy(k.eye).sub(head).normalize();
      if (this.cast(head, _dir, dd - 0.3, d.mesh)) continue; // a wall between
      (mark = k), (dist = dd);
    }
    if (mark) d.seen = true;
    if (!d.seen) return;
    // Seen once, it comes for you even round a corner.
    const goal = mark ?? marks[0];
    if (!mark) dist = goal.eye.distanceTo(head);
    _dir.copy(goal.eye).sub(head).normalize();
    d.mesh.rotation.y = Math.atan2(-_dir.x, -_dir.z);
    d.cool -= dt;
    // Closes to seven metres, then strafes; shoots when it sees its mark.
    const step = new THREE.Vector3();
    if (dist > 7) step.addScaledVector(_dir, 2.4 * dt);
    d.strafeFor -= dt;
    if (d.strafeFor <= 0) {
      d.strafe = rand(-1, 1);
      d.strafeFor = rand(0.6, 1.6);
    }
    step.add(new THREE.Vector3(-_dir.z, 0, _dir.x).multiplyScalar(d.strafe * 1.6 * dt));
    step.y = 0;
    p.add(step);
    this.pushOut(p);
    d.mesh.userData.pose = mark ? 'aim' : 'walk';
    d.mesh.userData.speed = step.length() / Math.max(dt, 1e-3);
    d.mesh.userData.aim = Math.asin(clamp(_dir.y, -1, 1));
    if (mark && d.cool <= 0 && this.alive()) {
      d.cool = 0.9;
      kick(d.mesh);
      const aim = _dir.clone().add(new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(0.06)).normalize();
      const muzzle = head.clone().add(new THREE.Vector3(0, -0.3, 0));
      const h = this.cast(muzzle, aim, 60, d.mesh);
      const toMark = mark.eye.clone().sub(muzzle);
      const closest = muzzle.clone().addScaledVector(aim, Math.max(0, toMark.dot(aim)));
      const landed = closest.distanceTo(mark.eye) < 0.55 && (!h || h.distance > dist - 1);
      this.tracer(muzzle, landed ? mark.eye : h ? h.point : muzzle.clone().addScaledVector(aim, 40), '#ff5540');
      g.sfx?.play('tie', dist * 4);
      if (landed && mark.you) {
        this.hp -= 8 * g.ship.armour;
        this.flash = 1;
        g.sfx?.play('hit', 0);
        if (this.hp <= 0) g.boardingLost();
      } else if (landed && mark.m) {
        mark.m.hp -= 8 * g.ship.armour;
        if (mark.m.hp <= 0) {
          mark.m.mesh.userData.pose = 'dead';
          g.toast(`${mark.m.name} is down: she will live, but she is out of this fight.`, 'bad');
        }
      }
    }
  }

  /** A member of your boarding party: keeps a step behind and to one side of you, and shoots a defender she can see,
   *  as often, as straight and as hard as her Combat allows. */
  partyFrame(m, dt) {
    const w = this.walker;
    const fwd = w.forward(new THREE.Vector3());
    fwd.y = 0;
    fwd.normalize();
    const want = w.pos.clone().addScaledVector(fwd, -1.5).add(new THREE.Vector3(-fwd.z, 0, fwd.x).multiplyScalar(m.slot * 0.9));
    want.y = this.interior.floorY;
    const before = m.mesh.position.clone();
    m.mesh.position.lerp(want, Math.min(1, dt * 3));
    this.pushOut(m.mesh.position);
    m.mesh.userData.speed = before.distanceTo(m.mesh.position) / Math.max(dt, 1e-3);
    m.cool -= dt;
    const head = m.mesh.position.clone().add(new THREE.Vector3(0, 1.4, 0));
    let shot = null;
    for (const d of this.defenders) {
      if (!d.alive) continue;
      const target = d.mesh.position.clone().add(new THREE.Vector3(0, 1, 0));
      const dir = target.clone().sub(head);
      const dist = dir.length();
      if (dist > 30) continue;
      dir.normalize();
      const hit = this.cast(head, dir, dist + 0.5);
      if (hit?.defender === d) {
        shot = { d, target, dir };
        break;
      }
    }
    if (shot) {
      m.mesh.rotation.y = Math.atan2(-shot.dir.x, -shot.dir.z);
      m.mesh.userData.pose = 'aim';
      if (m.cool <= 0) {
        m.cool = m.fx.every;
        kick(m.mesh);
        const miss = Math.random() < m.fx.spread * 4;
        this.tracer(head, miss ? shot.target.clone().add(new THREE.Vector3(rand(-1, 1), rand(0, 1), rand(-1, 1))) : shot.target, '#39d27a');
        if (!miss) this.hurt(shot.d, m.fx.damage);
      }
    } else {
      m.mesh.rotation.y = w.yaw;
      m.mesh.userData.pose = m.mesh.userData.speed > 0.4 ? 'walk' : 'idle';
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
