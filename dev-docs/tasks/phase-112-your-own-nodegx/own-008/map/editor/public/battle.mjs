// The battle around the fleet. Nothing here touches the project: it is scenery.
//
// - Capital ships fire turbolasers at the nearest ships of the other side: green bolts from the
//   Empire, red from the Rebels. A bolt that arrives bursts on the target's hull side. Capital
//   ships are never destroyed.
// - TIE fighters and X-wings drop out of hyperspace around the map (half of them near where you
//   are looking), each picks an enemy fighter, chases it banking into its turns, and fires twin
//   bolts from its own cannons when the target is close and dead ahead; some shots kill. A killed
//   fighter goes up in a fireball with a shockwave ring; a replacement arrives a few seconds later.
// - `onSound(kind, position, size)` is called for every shot and explosion, for the sound effects.

import * as THREE from 'three';
import { fighterModel, SIDES } from '/ships.mjs';

const BOLT = {
  [SIDES.empire]: { core: '#effff0', glow: '#3dff4a' },
  [SIDES.rebels]: { core: '#fff0ec', glow: '#ff2414' }
};
const FIGHTERS_PER_SIDE = 12;
const CAPITAL_SHOTS_PER_SECOND = 7;

export class Battle {
  constructor(scene, glowSprite) {
    this.scene = scene;
    this.glowSprite = glowSprite; // (color, size) → an additive glow sprite (shared texture, own material)
    this.group = new THREE.Group();
    scene.add(this.group);
    this.ships = [];
    this.bolts = [];
    this.effects = [];
    this.fighters = [];
    this.respawnAt = [];
    this.enabled = true;
    this.shotDebt = 0;
    this.time = 0;
    this.onSound = null;
    this.unitBox = new THREE.BoxGeometry(1, 1, 1);
    this.ringGeo = new THREE.RingGeometry(0.82, 1, 64);
    this.mats = {};
    for (const side of Object.values(SIDES)) {
      this.mats[side] = {
        core: new THREE.MeshBasicMaterial({ color: BOLT[side].core }),
        glow: new THREE.MeshBasicMaterial({ color: BOLT[side].glow, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })
      };
    }
    this.sparkMat = new THREE.MeshBasicMaterial({ color: '#ffd27a' });
    this.debrisMat = new THREE.MeshStandardMaterial({ color: '#3b3d42', roughness: 0.8 });
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
    for (const o of [...this.bolts, ...this.effects, ...this.fighters]) this.group.remove(o.obj);
    for (const e of this.effects) e.dispose?.();
    this.bolts = [];
    this.effects = [];
    this.fighters = [];
    this.respawnAt = [];
  }

  // --- bolts and explosions -------------------------------------------------------------------

  /** A bolt from `from` to `to`: a white-hot core in a coloured glow. On arrival `onHit` runs. */
  fire(side, from, to, { speed = 700, len = 9, width = 0.45, onHit = null, sound = 'turbolaser' } = {}) {
    if (this.bolts.length > 260) return;
    const dir = to.clone().sub(from);
    const dist = dir.length();
    dir.normalize();
    const obj = new THREE.Group();
    const core = new THREE.Mesh(this.unitBox, this.mats[side].core);
    core.scale.set(width * 0.55, width * 0.55, len);
    const glow = new THREE.Mesh(this.unitBox, this.mats[side].glow);
    glow.scale.set(width * 2.4, width * 2.4, len * 1.12);
    obj.add(core, glow);
    obj.position.copy(from);
    obj.lookAt(from.clone().add(dir));
    this.group.add(obj);
    this.bolts.push({ obj, from: from.clone(), dir, dist, speed, t: 0, onHit });
    if (sound) this.onSound?.(sound, from, side);
  }

  /** An effect that lives `life` seconds; `step(k, dt)` runs every frame with k from 0 to 1. */
  effect(obj, life, step, dispose) {
    if (this.effects.length > 120) {
      dispose?.();
      return;
    }
    this.group.add(obj);
    this.effects.push({ obj, life, step, dispose, t: 0 });
  }

  /** A burst of fire: a white flash, an orange fireball going red, sparks and debris; for a fighter, a shockwave ring too. */
  explode(at, size, { ring = false, debris = 8 } = {}) {
    const obj = new THREE.Group();
    const flash = this.glowSprite('#ffffff', size * 0.6);
    const ball = this.glowSprite('#ff9a2a', size * 0.3);
    const smoke = this.glowSprite('#ff4a10', size * 0.2);
    for (const s of [flash, ball, smoke]) s.position.copy(at);
    obj.add(smoke, ball, flash);
    const bits = [];
    for (let i = 0; i < debris; i++) {
      const spark = i % 3 !== 0;
      const b = new THREE.Mesh(this.unitBox, spark ? this.sparkMat : this.debrisMat);
      const s = size * (spark ? 0.02 + Math.random() * 0.02 : 0.04 + Math.random() * 0.05);
      b.scale.set(s, s, spark ? s * 6 : s);
      b.position.copy(at);
      const v = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(size * (spark ? 3 + Math.random() * 3 : 0.8 + Math.random() * 1.5));
      b.lookAt(at.clone().add(v));
      bits.push({ b, v, s, spark });
      obj.add(b);
    }
    let shock = null;
    if (ring) {
      shock = new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ color: '#ffe2b0', transparent: true, opacity: 0.9, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
      shock.position.copy(at);
      shock.rotation.set(-Math.PI / 2 + (Math.random() - 0.5) * 0.9, 0, (Math.random() - 0.5) * 0.9);
      obj.add(shock);
    }
    const life = 1 + size * 0.012;
    this.effect(
      obj,
      life,
      (k, dt) => {
        flash.scale.setScalar(size * (0.5 + 2 * Math.min(1, k * 8)));
        flash.material.opacity = Math.max(0, 1 - k * 4);
        ball.scale.setScalar(size * (0.35 + 1.3 * Math.sqrt(k)));
        ball.material.opacity = Math.max(0, 1 - k * 1.4);
        smoke.scale.setScalar(size * (0.4 + 1.8 * k));
        smoke.material.opacity = 0.6 * (1 - k);
        for (const d of bits) {
          d.b.position.addScaledVector(d.v, dt);
          if (!d.spark) d.b.rotation.x += dt * 4;
          d.b.scale.setScalar(d.s * (1 - k));
          if (d.spark) d.b.scale.z = d.s * 6 * (1 - k);
        }
        if (shock) {
          shock.scale.setScalar(size * (0.3 + 4 * k));
          shock.material.opacity = 0.9 * (1 - k) ** 1.5;
        }
      },
      () => {
        for (const s of [flash, ball, smoke]) s.material.dispose();
        shock?.material.dispose();
      }
    );
    this.onSound?.('boom', at, size);
  }

  /** A fighter dropping out of hyperspace: a white streak along its line of flight, gone in a moment. */
  hyperspace(at, dir) {
    const streak = new THREE.Mesh(this.unitBox, new THREE.MeshBasicMaterial({ color: '#e8f2ff', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    const glow = this.glowSprite('#cfe4ff', 10);
    glow.position.copy(at);
    const obj = new THREE.Group();
    obj.add(streak, glow);
    this.effect(
      obj,
      0.4,
      (k) => {
        const len = 140 * (1 - k);
        streak.scale.set(0.35 * (1 - k) + 0.05, 0.35 * (1 - k) + 0.05, Math.max(0.1, len));
        streak.position.copy(at).addScaledVector(dir, -len / 2);
        streak.lookAt(at);
        streak.material.opacity = 0.9 * (1 - k);
        glow.material.opacity = 1 - k;
      },
      () => {
        streak.material.dispose();
        glow.material.dispose();
      }
    );
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
    this.fire(shooter.side, from, to, { len: 18, width: 0.9, sound: 'turbolaser', onHit: () => this.explode(to, 14 + Math.random() * 14, { debris: 10 }) });
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
    // Fighters drop out of hyperspace heading the fleet's way, roughly.
    const vel = new THREE.Vector3((Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.2, -1).normalize();
    obj.position.copy(at);
    obj.lookAt(at.clone().add(vel));
    this.group.add(obj);
    this.hyperspace(at, vel);
    const guns = (obj.userData.guns ?? []).map((g) => new THREE.Vector3(g.x, g.y, g.z));
    this.fighters.push({ obj, side, kind, vel, guns, gun: 0, roll: 0, speed: 55 + Math.random() * 25, turn: 1.4 + Math.random() * 0.8, target: null, retarget: 0, cooldown: Math.random(), alive: true });
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
    const before = new THREE.Vector3();
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
      // Stay over the fleet, above the decks.
      const b = this.bounds;
      if (p.x < b.min.x - 250 || p.x > b.max.x + 250 || p.z < b.min.z - 250 || p.z > b.max.z + 250) desired.add(center.clone().sub(p).normalize().multiplyScalar(1.5));
      if (p.y < 18) desired.y += 1.2;
      if (p.y > 260) desired.y -= 1.2;
      desired.normalize();
      before.copy(f.vel);
      f.vel.lerp(desired, Math.min(1, f.turn * dt)).normalize();
      p.addScaledVector(f.vel, f.speed * dt);
      // Bank into the turn: roll by how fast the heading swings left or right.
      const yawRate = dt > 0 ? before.clone().cross(f.vel).y / dt : 0;
      const want = THREE.MathUtils.clamp(-yawRate * 0.9, -1.1, 1.1);
      f.roll += (want - f.roll) * Math.min(1, dt * 3);
      f.obj.lookAt(p.clone().add(f.vel));
      f.obj.rotateZ(f.roll);
      f.obj.updateMatrixWorld(); // so the muzzles below are where the guns are this frame
      // Fire twin bolts when the target is close and dead ahead.
      f.cooldown -= dt;
      if (f.target && f.cooldown <= 0) {
        const to = f.target.obj.position.clone().sub(p);
        const d = to.length();
        if (d < 170 && to.normalize().dot(f.vel) > 0.96) {
          f.cooldown = 0.32 + Math.random() * 0.25;
          const victim = f.target;
          const hit = Math.random() < 0.18;
          const pair = f.kind === 'tie' ? [0, 1] : f.gun++ % 2 ? [0, 3] : [1, 2];
          pair.forEach((gi, n) => {
            const g = f.guns[gi] ?? new THREE.Vector3();
            const muzzle = f.obj.localToWorld(g.clone());
            const sound = n === 0 ? (f.kind === 'tie' ? 'tie' : 'xwing') : null;
            if (hit && n === 0) {
              this.fire(f.side, muzzle, victim.obj.position.clone(), { speed: 340, len: 3.6, width: 0.24, sound, onHit: () => this.kill(victim) });
            } else {
              const miss = muzzle.clone().addScaledVector(f.vel, 240).add(new THREE.Vector3((Math.random() - 0.5) * 24, (Math.random() - 0.5) * 24, (Math.random() - 0.5) * 24));
              this.fire(f.side, muzzle, hit ? victim.obj.position.clone() : miss, { speed: 340, len: 3.6, width: 0.24, sound });
            }
          });
        }
      }
    }
  }

  kill(f) {
    if (!f.alive) return;
    f.alive = false;
    this.explode(f.obj.position.clone(), 18, { ring: true, debris: 16 });
    this.group.remove(f.obj);
    this.fighters = this.fighters.filter((x) => x !== f);
    this.kills = (this.kills ?? 0) + 1;
  }

  // --- every frame ----------------------------------------------------------------------------

  frame(dt, camera) {
    this.time += dt;
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
    this.effects = this.effects.filter((e) => {
      e.t += dt;
      const k = e.t / e.life;
      if (k >= 1) {
        this.group.remove(e.obj);
        e.dispose?.();
        return false;
      }
      e.step(k, dt);
      return true;
    });
  }

  stats() {
    return { bolts: this.bolts.length, effects: this.effects.length, blasts: this.effects.length, fighters: this.fighters.length, ties: this.fighters.filter((f) => f.kind === 'tie').length, xwings: this.fighters.filter((f) => f.kind === 'xwing').length, kills: this.kills ?? 0 };
  }
}
