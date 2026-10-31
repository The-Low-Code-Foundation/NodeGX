// What is in your hand: the pick (with torches), rubble to build with, the hunting rifle, the bow. The hand is
// drawn on top of the world (no depth test), Minecraft-style blocky.
import * as THREE from 'three';
import { BLOCKS } from './blocks.mjs';
import { sfx } from './audio.mjs';

export const SLOTS = [
  { id: 'pick', label: 'Pick', key: 'torches' },
  { id: 'rubble', label: 'Rubble', key: 'rubble' },
  { id: 'rifle', label: 'Rifle', key: 'rounds' },
  { id: 'bow', label: 'Bow', key: 'arrows' }
];

const mat = (c) => new THREE.MeshBasicMaterial({ color: c, depthTest: false, depthWrite: false, transparent: true });
function part(group, w, h, d, x, y, z, color) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  m.position.set(x, y, z);
  m.renderOrder = 999;
  group.add(m);
  return m;
}

function models() {
  const pick = new THREE.Group();
  part(pick, 0.05, 0.55, 0.05, 0, 0, 0, 0x7a5432);
  part(pick, 0.42, 0.07, 0.07, 0, 0.26, 0, 0x9aa0a8).rotation.z = 0.12;
  const torch = new THREE.Group();
  part(torch, 0.045, 0.32, 0.045, -0.16, -0.05, 0.02, 0x7a5432);
  part(torch, 0.07, 0.08, 0.07, -0.16, 0.14, 0.02, 0xffc850);
  pick.add(torch);
  const rubble = new THREE.Group();
  part(rubble, 0.22, 0.22, 0.22, 0, 0, 0, 0x8a8a88);
  const rifle = new THREE.Group();
  part(rifle, 0.06, 0.07, 0.75, 0, 0, -0.2, 0x3b2a1c); // the stock and fore-end
  part(rifle, 0.035, 0.035, 0.55, 0, 0.045, -0.55, 0x202326); // the barrel
  part(rifle, 0.05, 0.05, 0.26, 0, 0.11, -0.25, 0x15171a); // the scope
  part(rifle, 0.07, 0.07, 0.03, 0, 0.11, -0.12, 0x15171a);
  part(rifle, 0.025, 0.06, 0.025, 0.05, 0.03, -0.12, 0x9aa0a8); // the bolt
  const flash = part(rifle, 0.12, 0.12, 0.12, 0, 0.045, -0.86, 0xffe08a);
  flash.visible = false;
  const bow = new THREE.Group();
  const limbs = [];
  for (let i = -4; i <= 4; i++) {
    const a = (i / 4) * 0.9;
    const seg = part(bow, 0.035, 0.13, 0.035, 0, Math.sin(a) * 0.36, -Math.cos(a) * 0.12 + 0.12, 0x5a3c22);
    seg.rotation.x = a;
    limbs.push(seg);
  }
  const string = part(bow, 0.008, 0.66, 0.008, 0, 0, 0.12, 0xdddddd);
  const nocked = part(bow, 0.02, 0.02, 0.6, 0, 0, -0.05, 0xc8b08a);
  return { pick, torch, rubble, rifle, flash, bow, string, nocked };
}

export class Hand {
  constructor(camera, scene, world, mobs) {
    this.camera = camera;
    this.scene = scene;
    this.world = world;
    this.mobs = mobs;
    this.root = new THREE.Group();
    camera.add(this.root);
    this.m = models();
    for (const k of ['pick', 'rubble', 'rifle', 'bow']) {
      this.root.add(this.m[k]);
      this.m[k].visible = false;
    }
    this.slot = 0;
    this.swing = 0;
    this.cooldown = 0;
    this.draw = 0;
    this.aimT = 0;
    this.recoil = 0;
    this.arrows = [];
    this.particles = [];
    this.select(0);
  }

  get id() {
    return SLOTS[this.slot].id;
  }

  weapon() {
    return this.id === 'rifle' || this.id === 'bow' ? this.id : null;
  }

  select(i) {
    this.slot = (i + SLOTS.length) % SLOTS.length;
    for (const k of ['pick', 'rubble', 'rifle', 'bow']) this.m[k].visible = k === this.id;
    this.draw = 0;
  }

  // Fire (or start drawing). Returns a short message for the HUD when there is nothing to fire.
  trigger(pack, eye, dir, aiming, hooks) {
    if (this.id === 'rifle') {
      if (this.cooldown > 0) return null;
      if (pack.rounds <= 0) return 'No rounds. Craft them from iron and coal (menu).';
      pack.rounds--;
      this.cooldown = 1.15;
      this.recoil = 1;
      this.m.flash.visible = true;
      setTimeout(() => (this.m.flash.visible = false), 50);
      sfx.rifle();
      setTimeout(() => sfx.bolt(), 420);
      const spread = aiming ? 0.002 : 0.025;
      const d = dir.clone().add(new THREE.Vector3((Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread)).normalize();
      const block = this.world.raycast(eye, d, 120, (id) => BLOCKS[id].solid || BLOCKS[id].opaque);
      const mob = this.mobs.rayHit(eye, d, block ? block.t : 120);
      if (mob) {
        const dead = this.mobs.damage(mob.mob, mob.head ? 30 : 10);
        sfx.hit();
        this.burst(eye.clone().addScaledVector(d, mob.t), 0x9a2a1a, 10);
        hooks.hitMarker(mob.head);
        if (dead) hooks.killed(mob.mob);
      } else if (block) this.burst(eye.clone().addScaledVector(d, block.t - 0.05), 0xbbbbbb, 6);
      hooks.flash();
      return null;
    }
    return null;
  }

  // Let go of the bowstring. The draw is timed from the press to the release, not counted in frames, so a slow
  // frame rate never weakens the shot.
  loose(pack, eye, dir, held = 0) {
    this.draw = Math.min(1, Math.max(this.draw, held / 900));
    if (this.id !== 'bow' || this.draw < 0.15) {
      this.draw = 0;
      return null;
    }
    if (pack.arrows <= 0) {
      this.draw = 0;
      return 'No arrows. Craft them from flint (menu): dig gravel to find flint.';
    }
    pack.arrows--;
    const power = this.draw;
    this.draw = 0;
    sfx.bow();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.7), new THREE.MeshBasicMaterial({ color: 0xc8b08a }));
    const pos = eye.clone().addScaledVector(dir, 0.6);
    mesh.position.copy(pos);
    this.scene.add(mesh);
    this.arrows.push({ mesh, pos, vel: dir.clone().multiplyScalar(14 + 34 * power), dmg: 3 + Math.round(7 * power), stuck: false, age: 0 });
    return null;
  }

  burst(at, color, n) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.07), new THREE.MeshBasicMaterial({ color }));
      m.position.copy(at);
      this.scene.add(m);
      this.particles.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 4, (Math.random() - 0.5) * 4), life: 0.5 + Math.random() * 0.4 });
    }
  }

  update(dt, I, { digging, aiming, pack, player, hooks }) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.recoil = Math.max(0, this.recoil - dt * 4);
    this.aimT += ((aiming ? 1 : 0) - this.aimT) * Math.min(1, dt * 12);
    if (this.id === 'bow' && I.primary && pack.arrows > 0) {
      if (this.draw === 0) sfx.draw();
      this.draw = Math.min(1, Math.max(0.01, (performance.now() - (I.downAt ?? performance.now())) / 900));
    }
    // The hand's pose.
    this.swing = digging ? this.swing + dt * 9 : 0;
    const walk = Math.hypot(player.vel.x, player.vel.z) > 0.5 && player.onGround ? player.bob : 0;
    const sway = Math.sin(walk * 2) * 0.012;
    const r = this.root;
    if (this.id === 'pick') {
      r.position.set(0.32, -0.32 + sway, -0.55);
      r.rotation.set(-0.3 - Math.abs(Math.sin(this.swing)) * 0.9, 0.2, 0.25);
    } else if (this.id === 'rubble') {
      r.position.set(0.34, -0.34 + sway, -0.6);
      r.rotation.set(0.2 - Math.abs(Math.sin(this.swing)) * 0.5, 0.6, 0);
    } else if (this.id === 'rifle') {
      const a = this.aimT;
      r.position.set(0.22 * (1 - a), -0.22 * (1 - a) - 0.11 * a + sway * (1 - a), -0.32 + this.recoil * 0.08);
      r.rotation.set(this.recoil * 0.12, 0, 0);
    } else {
      r.position.set(0.12, -0.18 + sway, -0.5);
      r.rotation.set(0, 0, 0.25);
      this.m.string.position.z = 0.12 + this.draw * 0.2;
      this.m.nocked.visible = pack.arrows > 0;
      this.m.nocked.position.z = -0.05 + this.draw * 0.2;
    }
    // The arrows in flight, and the ones stuck in walls (walk over one to take it back).
    for (const a of [...this.arrows]) {
      a.age += dt;
      if (a.stuck) {
        // Walk over it to take it back (not the moment it lands in the wall in front of you).
        const feet = player.pos.clone().add(new THREE.Vector3(0, 0.6, 0));
        if (a.age > 1 && a.mesh.position.distanceTo(feet) < 1.3) {
          pack.arrows++;
          hooks.toast('+1 arrow');
          this.scene.remove(a.mesh);
          this.arrows.splice(this.arrows.indexOf(a), 1);
        } else if (a.age > 90) {
          this.scene.remove(a.mesh);
          this.arrows.splice(this.arrows.indexOf(a), 1);
        }
        continue;
      }
      a.vel.y -= 14 * dt;
      const step = a.vel.clone().multiplyScalar(dt);
      const len = step.length();
      const d = step.clone().normalize();
      const block = this.world.raycast(a.pos, d, len, (id) => BLOCKS[id].solid);
      const mob = this.mobs.rayHit(a.pos, d, block ? block.t : len);
      if (mob) {
        const dead = this.mobs.damage(mob.mob, mob.head ? a.dmg * 2 : a.dmg);
        sfx.hit();
        hooks.hitMarker(mob.head);
        this.burst(a.pos.clone().addScaledVector(d, mob.t), 0x9a2a1a, 6);
        if (dead) hooks.killed(mob.mob);
        this.scene.remove(a.mesh);
        this.arrows.splice(this.arrows.indexOf(a), 1);
        continue;
      }
      if (block) {
        a.pos.addScaledVector(d, Math.max(0, block.t - 0.25));
        a.stuck = true;
        a.age = 0;
        sfx.thunk();
      } else a.pos.add(step);
      a.mesh.position.copy(a.pos);
      a.mesh.lookAt(a.pos.clone().add(a.vel));
      if (a.age > 12) {
        this.scene.remove(a.mesh);
        this.arrows.splice(this.arrows.indexOf(a), 1);
      }
    }
    for (const p of [...this.particles]) {
      p.life -= dt;
      p.v.y -= 12 * dt;
      p.m.position.addScaledVector(p.v, dt);
      if (p.life <= 0) {
        this.scene.remove(p.m);
        this.particles.splice(this.particles.indexOf(p), 1);
      }
    }
  }

  clearWorldBits() {
    for (const a of this.arrows) this.scene.remove(a.mesh);
    for (const p of this.particles) this.scene.remove(p.m);
    this.arrows = [];
    this.particles = [];
  }
}
