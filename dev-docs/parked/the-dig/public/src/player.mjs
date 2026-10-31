// The player: a 0.6 × 1.8 box that walks, runs, jumps (and on the phone steps up a block by itself), falls and
// hurts from a long fall, burns in lava, and looks through a first-person camera at eye height.
import * as THREE from 'three';
import { BLOCKS, B } from './blocks.mjs';

const W = 0.3, H = 1.8, EYE = 1.62;
const GRAVITY = 30, JUMP = 9.2, WALK = 4.4, RUN = 6.2;

export class Player {
  constructor(camera) {
    this.camera = camera;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.onGround = false;
    this.health = 20;
    this.maxHealth = 20;
    this.fallFrom = null;
    this.hurtAt = -1e9;
    this.bob = 0;
    this.inLava = false;
  }

  eye() {
    return new THREE.Vector3(this.pos.x, this.pos.y + EYE, this.pos.z);
  }

  forward() {
    return new THREE.Vector3(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch));
  }

  collides(world, x, y, z) {
    const x0 = Math.floor(x - W), x1 = Math.floor(x + W - 1e-6);
    const y0 = Math.floor(y), y1 = Math.floor(y + H - 1e-6);
    const z0 = Math.floor(z - W), z1 = Math.floor(z + W - 1e-6);
    for (let yy = y0; yy <= y1; yy++)
      for (let zz = z0; zz <= z1; zz++)
        for (let xx = x0; xx <= x1; xx++) if (BLOCKS[world.get(xx, yy, zz)].solid) return true;
    return false;
  }

  touching(world, id) {
    const x0 = Math.floor(this.pos.x - W), x1 = Math.floor(this.pos.x + W);
    const y0 = Math.floor(this.pos.y), y1 = Math.floor(this.pos.y + H);
    const z0 = Math.floor(this.pos.z - W), z1 = Math.floor(this.pos.z + W);
    for (let yy = y0; yy <= y1; yy++) for (let zz = z0; zz <= z1; zz++) for (let xx = x0; xx <= x1; xx++) if (world.get(xx, yy, zz) === id) return [xx, yy, zz];
    return null;
  }

  update(dt, I, world, { aiming = false } = {}) {
    // Look.
    const sens = aiming ? 0.45 : 1;
    this.yaw -= I.look.x * sens;
    this.pitch = Math.max(-1.55, Math.min(1.55, this.pitch - I.look.y * sens));

    // The body moves in steps of at most 1/60 s, so a fast fall never passes through a floor.
    const steps = Math.max(1, Math.ceil(dt / (1 / 60)));
    let fell = 0;
    for (let k = 0; k < steps; k++) fell += this.physics(dt / steps, I, world, aiming);

    // The camera.
    const moving = this.onGround && Math.hypot(this.vel.x, this.vel.z) > 0.5;
    this.bob += moving ? dt * Math.hypot(this.vel.x, this.vel.z) * 1.6 : 0;
    const e = this.eye();
    this.camera.position.set(e.x, e.y + (moving ? Math.sin(this.bob * 2) * 0.04 : 0), e.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    return { fell };
  }

  physics(dt, I, world, aiming) {
    // Walk.
    this.inLava = !!this.touching(world, B.LAVA);
    const speed = (I.sprint && I.move.z > 0 ? RUN : WALK) * (this.inLava ? 0.4 : 1) * (aiming ? 0.6 : 1);
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    const wx = (-sin * I.move.z + cos * I.move.x) * speed;
    const wz = (-cos * I.move.z - sin * I.move.x) * speed;
    const accel = this.onGround ? 14 : 4;
    this.vel.x += (wx - this.vel.x) * Math.min(1, accel * dt);
    this.vel.z += (wz - this.vel.z) * Math.min(1, accel * dt);
    if (I.jump && this.onGround) {
      this.vel.y = JUMP;
      this.onGround = false;
    }
    if (this.inLava && I.jump) this.vel.y = Math.max(this.vel.y, 3);
    this.vel.y -= GRAVITY * dt * (this.inLava ? 0.3 : 1);
    this.vel.y = Math.max(this.vel.y, -50);

    // Move one axis at a time against the blocks.
    const p = this.pos;
    let nx = p.x + this.vel.x * dt;
    if (this.collides(world, nx, p.y, p.z)) {
      if (this.stepUp(world, nx, p.z, I)) nx = p.x + this.vel.x * dt;
      else {
        nx = p.x;
        this.vel.x = 0;
      }
    }
    p.x = nx;
    let nz = p.z + this.vel.z * dt;
    if (this.collides(world, p.x, p.y, nz)) {
      if (this.stepUp(world, p.x, nz, I)) nz = p.z + this.vel.z * dt;
      else {
        nz = p.z;
        this.vel.z = 0;
      }
    }
    p.z = nz;
    const ny = p.y + this.vel.y * dt;
    const wasGround = this.onGround;
    if (this.collides(world, p.x, ny, p.z)) {
      if (this.vel.y < 0) {
        p.y = Math.max(Math.floor(ny) + 1, Math.min(p.y, Math.floor(ny) + 1));
        this.onGround = true;
      }
      this.vel.y = 0;
    } else {
      p.y = ny;
      this.onGround = false;
    }

    // Fall damage, Minecraft's way: three blocks free, then a point a block.
    let fell = 0;
    if (!this.onGround && this.fallFrom === null) this.fallFrom = p.y;
    if (!this.onGround && this.fallFrom !== null && p.y > this.fallFrom) this.fallFrom = p.y;
    if (this.onGround && !wasGround && this.fallFrom !== null) {
      const d = this.fallFrom - p.y;
      if (d > 3.4 && !this.inLava) fell = Math.floor(d - 3);
      this.fallFrom = null;
    }
    if (this.inLava) this.fallFrom = null;
    return fell;
  }

  // Auto-jump onto a one-block step (on the phone, where jumping while steering is hard).
  stepUp(world, x, z, I) {
    if (!I.autoJump || !this.onGround) return false;
    if (this.collides(world, x, this.pos.y + 1.01, z)) return false;
    if (this.collides(world, this.pos.x, this.pos.y + 1.01, this.pos.z)) return false;
    this.vel.y = JUMP * 0.8;
    this.onGround = false;
    return false;
  }

  // Put the camera where the body is (also while the game is paused, after a jump between worlds).
  place() {
    const e = this.eye();
    this.camera.position.set(e.x, e.y, e.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }

  hurt(n, now) {
    this.health = Math.max(0, this.health - n);
    this.hurtAt = now;
  }
}
