// The battle around the fleet. Nothing here touches the project: it is scenery.
//
// - Capital ships fire their turrets at the nearest ships of the other side: green bolts from the
//   Empire, red from the Rebels. A bolt that arrives bursts on the target's hull side. Capital ships
//   are never destroyed.
// - TIE fighters and X-wings spawn around the map (half of them near where you are looking, with a
//   hyperspace flash), pick an enemy fighter, chase it, fire when it is ahead, and some shots kill.
//   A killed fighter blows up; the population is topped up a few seconds later.
// Most of it happens near the camera, so wherever you fly there is something to see.

import * as THREE from 'three';
import { fighterModel, SIDES } from '/ships.mjs';

const BOLT = {
  [SIDES.empire]: { core: '#b6ffb0', glow: '#38ff4a' },
  [SIDES.rebels]: { core: '#ffc2b8', glow: '#ff3324' }
};
const FIGHTERS_PER_SIDE = 9;
const CAPITAL_SHOTS_PER_SECOND = 7;

export class Battle {
  constructor(scene, glowSprite) {
    this.scene = scene;
    this.glowSprite = glowSprite; // (color, size) → an additive glow sprite (shared texture)
    this.group = new THREE.Group();
    scene.add(this.group);
    this.ships = [];
    this.bolts = [];
    this.blasts = [];
    this.fighters = [];
    this.respawnAt = [];
    this.enabled = true;
    this.shotDebt = 0;
    this.boltGeo = new THREE.BoxGeometry(1, 1, 1);
    this.debrisGeo = new THREE.BoxGeometry(1, 1, 1);
    this.mats = {};
    for (const side of Object.values(SIDES)) {
      this.mats[side] = {
        core: new THREE.MeshBasicMaterial({ color: BOLT[side].core }),
        glow: new THREE.MeshBasicMaterial({ color: BOLT[side].glow, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false })
      };
    }
    this.debrisMat = new THREE.MeshBasicMaterial({ color: '#ffb347' });
    this.burntMat = new THREE.MeshLambertMaterial({ color: '#3a3a3a' });
  }

  /** The capital ships, in world space: { key, side, turrets: Vector3[], hull: Box3, center }. */
  setShips(ships) {
    this.ships = ships;
    this.bounds = new THREE.Box3();
    for (const s of ships) this.bounds.union(s.hull);
  }

  setEnabled(on) {
    this.enabled = on;
    this.group.visible = on;
    if (!on) this.clear();
  }

  clear() {
    for (const list of [this.bolts, this.blasts, this.fighters]) for (const o of list) this.group.remove(o.obj);
    this.bolts = [];
    this.blasts = [];
    this.fighters = [];
    this.respawnAt = [];
  }

  // --- capital ships --------------------------------------------------------------------------

  /** A bolt from `from` to `to`, `len` long; on arrival `onHit` (a burst, a kill) runs. */
  fire(side, from, to, { speed = 700, len = 9, width = 0.45, onHit = null, life = null } = {}) {
    if (this.bolts.length > 220) return;
    const dir = to.clone().sub(from);
    const dist = dir.length();
    dir.normalize();
    const obj = new THREE.Group();
    const core = new THREE.Mesh(this.boltGeo, this.mats[side].core);
    core.scale.set(width, width, len);
    const glow = new THREE.Mesh(this.boltGeo, this.mats[side].glow);
    glow.scale.set(width * 3, width * 3, len * 1.15);
    obj.add(core, glow);
    obj.position.copy(from);
    obj.lookAt(from.clone().add(dir));
    this.group.add(obj);
    this.bolts.push({ obj, from: from.clone(), dir, dist: life ?? dist, speed, t: 0, onHit });
  }

  /** A burst of fire: a white-hot flash, an orange fireball, and blocks flying out. */
  explode(at, size, { debris = 6, burnt = false } = {}) {
    if (this.blasts.length > 90) return;
    const flash = this.glowSprite('#fff6d8', size * 0.6);
    const ball = this.glowSprite('#ff7a1a', size * 0.3);
    flash.position.copy(at);
    ball.position.copy(at);
    const obj = new THREE.Group();
    obj.add(flash, ball);
    const bits = [];
    for (let i = 0; i < debris; i++) {
      const b = new THREE.Mesh(this.debrisGeo, burnt && i % 2 ? this.burntMat : this.debrisMat);
      const s = size * (0.04 + Math.random() * 0.06);
      b.scale.setScalar(s);
      b.position.copy(at);
      const v = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.3, Math.random() - 0.5).normalize().multiplyScalar(size * (1 + Math.random() * 2.5));
      bits.push({ b, v, s, spin: new THREE.Vector3(Math.random() * 6, Math.random() * 6, Math.random() * 6) });
      obj.add(b);
    }
    this.group.add(obj);
    this.blasts.push({ obj, flash, ball, bits, size, t: 0, life: 0.9 + size * 0.01 });
  }

  /** One capital ship fires one turret at one of the three nearest enemy ships, at the side of its hull that faces it. */
  capitalShot(camera) {
    const near = this.ships.filter((s) => s.turrets.length && s.center.distanceTo(camera.position) < 1600);
    const pool = near.length ? near : this.ships.filter((s) => s.turrets.length);
    if (!pool.length) return;
    const shooter = pool[Math.floor(Math.random() * pool.length)];
    const enemies = this.ships.filter((s) => s.side !== shooter.side).sort((a, b) => a.center.distanceTo(shooter.center) - b.center.distanceTo(shooter.center));
    if (!enemies.length) return;
    const target = enemies[Math.floor(Math.random() * Math.min(3, enemies.length))];
    const from = shooter.turrets[Math.floor(Math.random() * shooter.turrets.length)];
    const h = target.hull;
    const x = target.center.x > shooter.center.x ? h.min.x : h.max.x;
    const to = new THREE.Vector3(x, h.min.y + Math.random() * (h.max.y - h.min.y), h.min.z + Math.random() * (h.max.z - h.min.z));
    this.fire(shooter.side, from, to, { len: 18, width: 0.9, onHit: () => this.explode(to, 16 + Math.random() * 16, { debris: 8, burnt: true }) });
  }

  // --- fighters -------------------------------------------------------------------------------

  spawnFighter(side, camera) {
    if (!this.bounds || this.bounds.isEmpty()) return;
    const kind = side === SIDES.empire ? 'tie' : 'xwing';
    const obj = fighterModel(kind);
    // Half near what you are looking at, half anywhere over the fleet; above the decks.
    const at = new THREE.Vector3();
    if (Math.random() < 0.5) {
      const ahead = new THREE.Vector3();
      camera.getWorldDirection(ahead);
      at.copy(camera.position).addScaledVector(ahead, 120 + Math.random() * 200);
      at.x += (Math.random() - 0.5) * 300;
      at.z += (Math.random() - 0.5) * 300;
      at.y = Math.max(25, Math.min(220, at.y + (Math.random() - 0.5) * 80));
    } else {
      const b = this.bounds;
      at.set(b.min.x + Math.random() * (b.max.x - b.min.x), 30 + Math.random() * 150, b.min.z + Math.random() * (b.max.z - b.min.z));
    }
    obj.position.copy(at);
    const vel = new THREE.Vector3(Math.random() - 0.5, (Math.random() - 0.5) * 0.3, Math.random() - 0.5).normalize();
    obj.lookAt(at.clone().add(vel));
    this.group.add(obj);
    const flash = this.glowSprite('#dfefff', 14);
    flash.position.copy(at);
    const fl = new THREE.Group();
    fl.add(flash);
    this.group.add(fl);
    this.blasts.push({ obj: fl, flash, ball: null, bits: [], size: 14, t: 0, life: 0.35 });
    this.fighters.push({ obj, side, kind, vel, speed: 55 + Math.random() * 25, turn: 1.4 + Math.random() * 0.8, target: null, retarget: 0, cooldown: Math.random(), alive: true });
  }

  updateFighters(dt, camera) {
    for (const side of Object.values(SIDES)) {
      const count = this.fighters.filter((f) => f.side === side).length + this.respawnAt.filter((r) => r.side === side).length;
      for (let i = count; i < FIGHTERS_PER_SIDE; i++) this.respawnAt.push({ side, at: this.time + 0.2 + Math.random() * 3 });
    }
    this.respawnAt = this.respawnAt.filter((r) => {
      if (r.at > this.time) return true;
      this.spawnFighter(r.side, camera);
      return false;
    });
    const center = this.bounds.getCenter(new THREE.Vector3());
    const desired = new THREE.Vector3();
    for (const f of this.fighters) {
      f.retarget -= dt;
      if (!f.target?.alive || f.retarget <= 0) {
        const enemies = this.fighters.filter((e) => e.side !== f.side && e.alive);
        enemies.sort((a, b) => a.obj.position.distanceTo(f.obj.position) - b.obj.position.distanceTo(f.obj.position));
        f.target = enemies[Math.floor(Math.random() * Math.min(2, enemies.length))] ?? null;
        f.retarget = 2 + Math.random() * 2;
      }
      const p = f.obj.position;
      if (f.target) desired.copy(f.target.obj.position).sub(p).normalize();
      else desired.copy(center).sub(p).normalize();
      // Stay over the fleet, above the decks and below the clouds of nothing.
      const b = this.bounds;
      if (p.x < b.min.x - 250 || p.x > b.max.x + 250 || p.z < b.min.z - 250 || p.z > b.max.z + 250) desired.add(center.clone().sub(p).normalize().multiplyScalar(1.5));
      if (p.y < 18) desired.y += 1.2;
      if (p.y > 260) desired.y -= 1.2;
      desired.normalize();
      f.vel.lerp(desired, Math.min(1, f.turn * dt)).normalize();
      p.addScaledVector(f.vel, f.speed * dt);
      f.obj.lookAt(p.clone().add(f.vel));
      // Fire when the target is close and ahead.
      f.cooldown -= dt;
      if (f.target && f.cooldown <= 0) {
        const to = f.target.obj.position.clone().sub(p);
        const d = to.length();
        if (d < 170 && to.normalize().dot(f.vel) > 0.96) {
          f.cooldown = 0.28 + Math.random() * 0.25;
          const victim = f.target;
          const hit = Math.random() < 0.16;
          const muzzle = p.clone().addScaledVector(f.vel, 3);
          if (hit) {
            this.fire(f.side, muzzle, victim.obj.position.clone(), { speed: 320, len: 3.2, width: 0.2, onHit: () => this.kill(victim) });
          } else {
            const miss = muzzle.clone().addScaledVector(f.vel, 220).add(new THREE.Vector3((Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30));
            this.fire(f.side, muzzle, miss, { speed: 320, len: 3.2, width: 0.2 });
          }
        }
      }
    }
  }

  kill(f) {
    if (!f.alive) return;
    f.alive = false;
    this.explode(f.obj.position.clone(), 16, { debris: 10, burnt: true });
    this.group.remove(f.obj);
    this.fighters = this.fighters.filter((x) => x !== f);
    this.kills = (this.kills ?? 0) + 1;
  }

  // --- every frame ----------------------------------------------------------------------------

  frame(dt, camera) {
    this.time = (this.time ?? 0) + dt;
    if (!this.enabled || !this.ships.length) return;
    this.shotDebt += dt * CAPITAL_SHOTS_PER_SECOND;
    while (this.shotDebt >= 1) {
      this.shotDebt -= 1;
      this.capitalShot(camera);
    }
    this.updateFighters(dt, camera);
    this.bolts = this.bolts.filter((b) => {
      b.t += dt;
      const travelled = b.t * b.speed;
      if (travelled >= b.dist) {
        this.group.remove(b.obj);
        b.onHit?.();
        return false;
      }
      b.obj.position.copy(b.from).addScaledVector(b.dir, travelled);
      return true;
    });
    this.blasts = this.blasts.filter((x) => {
      x.t += dt;
      const k = x.t / x.life;
      if (k >= 1) {
        this.group.remove(x.obj);
        x.flash.material.dispose();
        x.ball?.material.dispose();
        return false;
      }
      // The flash blooms and fades fast; the fireball grows and goes red as it fades.
      x.flash.scale.setScalar(x.size * (0.6 + 1.6 * Math.min(1, k * 5)));
      x.flash.material.opacity = Math.max(0, 1 - k * 2.2);
      if (x.ball) {
        x.ball.scale.setScalar(x.size * (0.3 + 1.4 * k));
        x.ball.material.opacity = 1 - k;
        x.ball.material.color.setRGB(1, 0.48 * (1 - k) + 0.1, 0.1 * (1 - k));
      }
      for (const d of x.bits) {
        d.b.position.addScaledVector(d.v, dt);
        d.b.rotation.x += d.spin.x * dt;
        d.b.rotation.y += d.spin.y * dt;
        d.b.scale.setScalar(d.s * (1 - k));
      }
      return true;
    });
  }

  stats() {
    return { bolts: this.bolts.length, blasts: this.blasts.length, fighters: this.fighters.length, ties: this.fighters.filter((f) => f.kind === 'tie').length, xwings: this.fighters.filter((f) => f.kind === 'xwing').length, kills: this.kills ?? 0 };
  }
}
