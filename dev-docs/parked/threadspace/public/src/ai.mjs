// The other hands: Rook raiders that hunt the nearest thing of yours, the corvette's turrets, the hauler on
// its lane, your own crew flying the Kestrel and manning her turret, and captured ships that follow you.

import * as THREE from 'three';
import { Flight } from './controllers/fly.mjs';
import { SHIPS } from './data.mjs';
import { rand, forwardOf, turnToward } from './util.mjs';

const _to = new THREE.Vector3();
const _lead = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _m = new THREE.Vector3();
const _q = new THREE.Quaternion();

export class AI {
  constructor(game) {
    this.game = game;
  }

  /** Who a Rook goes for: the nearest of your ships (the fighter you fly, the Kestrel, your followers), or Concord. */
  preyFor(e) {
    const g = this.game;
    let best = null;
    let d2 = Infinity;
    for (const t of g.world.entities) {
      if (!t.alive || !t.hittable || t === e) continue;
      if (!g.hostile(e.side, t.side)) continue;
      const d = t.obj.position.distanceToSquared(e.obj.position);
      const bias = t === g.playerBody() ? 0.5 : 1; // the thing you are in draws fire
      if (d * bias < d2) (d2 = d * bias), (best = t);
    }
    return best;
  }

  leadPoint(from, target, boltSpeed, out = _lead) {
    const d = target.obj.position.distanceTo(from);
    return out.copy(target.obj.position).addScaledVector(target.vel, d / boltSpeed);
  }

  frame(dt) {
    const g = this.game;
    for (const e of g.world.entities) {
      if (!e.alive) continue;
      if (e.kind === 'pirate') this.raider(e, dt);
      else if (e.kind === 'corvette') this.corvette(e, dt);
      else if (e.kind === 'freighter') this.freighter(e, dt);
      else if (e.kind === 'follower') this.follower(e, dt);
    }
  }

  raider(e, dt) {
    const g = this.game;
    e.flight ??= new Flight(e, SHIPS.pirate);
    e.mode ??= 'attack';
    e.cool = (e.cool ?? 0) - dt;
    e.retarget = (e.retarget ?? 0) - dt;
    if (e.retarget <= 0 || !e.prey?.alive) {
      e.prey = this.preyFor(e);
      e.retarget = 1.5;
    }
    const f = e.flight;
    if (!e.prey) {
      f.throttle = 0.3;
      f.apply(0, 0.15, 0, dt);
      return;
    }
    const prey = e.prey;
    const d = prey.obj.position.distanceTo(e.obj.position);
    if (e.mode === 'attack') {
      this.leadPoint(e.obj.position, prey, 420);
      const angle = turnToward(e.obj, _lead, SHIPS.pirate.turn, dt);
      f.throttle = d > 400 ? 1 : 0.55;
      f.bank += ((angle > 0.2 ? 0.5 : 0) - f.bank) * Math.min(1, dt * 3);
      f.move(dt);
      const aligned = angle < 0.06;
      if (aligned && d < 650 && e.cool <= 0) {
        e.cool = 0.38;
        forwardOf(e.obj, _fwd);
        const miss = new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(0.04);
        for (const m of e.obj.userData.muzzles) {
          _m.copy(m).applyQuaternion(e.obj.quaternion).add(e.obj.position);
          g.combat.fire('rooks', _m, _fwd.clone().add(miss).normalize(), { damage: 12, speed: 420, owner: e, sound: 'tie', camera: g.camera });
        }
      }
      if (d < 90) {
        e.mode = 'break';
        e.breakFor = 1.6 + Math.random();
        e.breakDir = new THREE.Vector3(rand(-1, 1), rand(-0.5, 0.5), rand(-1, 1)).normalize();
      }
    } else {
      e.breakFor -= dt;
      _to.copy(e.obj.position).addScaledVector(e.breakDir, 500);
      turnToward(e.obj, _to, SHIPS.pirate.turn, dt);
      f.throttle = 1;
      f.move(dt);
      if (e.breakFor <= 0) e.mode = 'attack';
    }
  }

  /** The corvette: turns slowly toward whoever it is fighting and works its two turrets; stops dead when boarded. */
  corvette(e, dt) {
    const g = this.game;
    if (e.boarded || e.captured) {
      e.vel.set(0, 0, 0);
      return;
    }
    e.flight ??= new Flight(e, SHIPS.corvette);
    e.retarget = (e.retarget ?? 0) - dt;
    if (e.retarget <= 0 || !e.prey?.alive) {
      e.prey = this.preyFor(e);
      e.retarget = 2;
    }
    const prey = e.prey;
    if (prey && prey.obj.position.distanceTo(e.obj.position) < 1600) {
      e.flight.throttle = 0.6;
      turnToward(e.obj, prey.obj.position, SHIPS.corvette.turn, dt);
      e.flight.move(dt);
      this.turrets(e, prey, dt, { every: 1.4, damage: 14, speed: 380, range: 900 });
    } else {
      e.patrol ??= new THREE.Vector3(rand(-800, 800), rand(-100, 100), rand(-800, 800));
      if (e.flight.toward(e.patrol, dt, { stop: 80 }) < 100) e.patrol = null;
    }
  }

  turrets(e, prey, dt, { every, damage, speed, range }) {
    const g = this.game;
    e.cool = (e.cool ?? 0) - dt;
    this.leadPoint(e.obj.position, prey, speed);
    const d = prey.obj.position.distanceTo(e.obj.position);
    // Under her guns: a turret cannot depress onto something hugging the hull. Get in close and you are safe.
    const canFire = d < range && d > 90 && e.cool <= 0;
    for (const t of e.obj.userData.turrets) {
      aimTurret(t, e.obj, _lead, dt, 2.5);
      if (canFire) {
        const tip = t.pitch.localToWorld(t.tip.clone());
        const dir = _lead.clone().sub(tip).normalize().add(new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(0.015)).normalize();
        g.combat.fire(e.side, tip, dir, { damage, speed, range, len: 7, width: 0.45, owner: e, sound: 'turbolaser', camera: g.camera });
      }
    }
    if (canFire) e.cool = every;
  }

  /** The hauler plods between its two points. Shot at, it runs for the gate. */
  freighter(e, dt) {
    if (e.boarded || e.captured) return;
    e.flight ??= new Flight(e, SHIPS.freighter);
    e.leg ??= 0;
    const to = e.route[e.leg];
    if (e.flight.toward(to, dt, { stop: 60 }) < 80) e.leg = (e.leg + 1) % e.route.length;
  }

  /** A ship of your fleet: keeps station off the Kestrel's quarter, shoots Rooks it can see. */
  follower(e, dt) {
    const g = this.game;
    e.flight ??= new Flight(e, e.cls);
    const k = g.player.obj;
    const slot = new THREE.Vector3(e.slot === 1 ? 120 : -120, -20, 90).applyQuaternion(k.quaternion).add(k.position);
    e.flight.toward(slot, dt, { stop: 20, slow: 300 });
    if (e.obj.userData.turrets?.length) {
      const prey = this.preyFor(e);
      if (prey && prey.obj.position.distanceTo(e.obj.position) < 900) this.turrets(e, prey, dt, { every: 0.9, damage: 26, speed: 400, range: 900 });
    }
  }

  /** Your own crew. Vex at the helm flies the nav target or holds; Dag at the turret shoots the nearest Rook. */
  crew(dt) {
    const g = this.game;
    const k = g.player;
    const f = g.helmFlight;
    if (g.crewAt('helm') && g.phase !== 'helm') {
      if (g.nav && g.nav.alive !== false) f.toward(g.navPoint(), dt, { stop: g.nav.kind === 'station' ? 160 : 120, slow: 700 });
      else f.hold(dt);
    } else if (g.phase !== 'helm') {
      f.hold(dt); // nobody at the helm: she coasts to a stop
    }
    if (g.crewAt('turret') && g.phase !== 'turret') {
      const t = k.obj.userData.turret;
      g.turretCool = (g.turretCool ?? 0) - dt;
      const prey = this.preyFor(k);
      if (prey && prey.obj.position.distanceTo(k.obj.position) < 800) {
        this.leadPoint(k.obj.position, prey, 460);
        aimTurret(t, k.obj, _lead, dt, 3);
        if (g.turretCool <= 0) {
          g.turretCool = g.ship.turretEvery;
          g.fireTurret(_lead);
        }
      }
    }
  }
}

/** Points a turret (yaw ring, pitch barrel) at a world point, at `rate` radians a second. */
export function aimTurret(t, host, worldPoint, dt, rate) {
  const local = t.yaw.parent.worldToLocal(worldPoint.clone()).sub(t.yaw.position);
  const wantYaw = Math.atan2(-local.x, -local.z);
  const flat = Math.hypot(local.x, local.z);
  const wantPitch = Math.atan2(local.y - t.pitch.position.y, flat);
  t.yaw.rotation.y = approach(t.yaw.rotation.y, wantYaw, rate * dt);
  t.pitch.rotation.x = approach(t.pitch.rotation.x, Math.max(-0.2, Math.min(1.2, wantPitch)), rate * dt);
}

function approach(a, b, max) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + Math.max(-max, Math.min(max, d));
}
