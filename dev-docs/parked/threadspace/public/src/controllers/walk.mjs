// Walking inside something: a person in the host's frame, WASD on the floor, mouse to look, a circle that
// slides along the walls, and E on the nearest thing you are facing. The host may be flying; you don't feel it.

import * as THREE from 'three';
import { clamp } from '../util.mjs';

const EYE = 1.6;
const R = 0.38;
const SPEED = 4.2;
const _v = new THREE.Vector3();
const _w = new THREE.Vector3();

export class Walker {
  constructor(interior) {
    this.interior = interior;
    this.pos = interior.spawn.clone();
    this.yaw = interior.spawnYaw;
    this.pitch = 0;
    this.bob = 0;
    this.speed = SPEED;
  }

  moveTo(pos, yaw = this.yaw) {
    this.pos.copy(pos);
    this.yaw = yaw;
    this.pitch = 0;
  }

  frame(f, dt, { canMove = true, mouseGain = 0.0022 } = {}) {
    if (f.dx || f.dy) {
      this.yaw -= f.dx * mouseGain;
      this.pitch = clamp(this.pitch - f.dy * mouseGain, -1.3, 1.3);
    }
    if (f.keys.has('ArrowLeft')) this.yaw += dt * 1.8;
    if (f.keys.has('ArrowRight')) this.yaw -= dt * 1.8;
    if (f.keys.has('ArrowUp')) this.pitch = clamp(this.pitch + dt * 1.2, -1.3, 1.3);
    if (f.keys.has('ArrowDown')) this.pitch = clamp(this.pitch - dt * 1.2, -1.3, 1.3);
    if (!canMove) return;
    let fx = 0, fz = 0;
    if (f.keys.has('KeyW')) fz -= 1;
    if (f.keys.has('KeyS')) fz += 1;
    if (f.keys.has('KeyA')) fx -= 1;
    if (f.keys.has('KeyD')) fx += 1;
    if (!fx && !fz) {
      this.bob *= Math.max(0, 1 - dt * 6);
      return;
    }
    const len = Math.hypot(fx, fz);
    fx /= len;
    fz /= len;
    const s = (f.keys.has('ShiftLeft') ? 1.6 : 1) * this.speed * dt;
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    // yaw 0 faces -z; turning left (positive yaw) swings the view toward -x.
    const dx = (fx * cos - fz * sin) * s;
    const dz = (fx * sin + fz * cos) * s;
    this.slide(dx, 0);
    this.slide(0, dz);
    this.bob += s * 2.2;
  }

  /** Moves by (dx, dz) and pushes out of any wall box; sliding comes from moving the axes one at a time. */
  slide(dx, dz) {
    const p = this.pos;
    p.x += dx;
    p.z += dz;
    const y = p.y + 0.8;
    for (const c of this.interior.colliders) {
      if (y < c.min.y || y > c.max.y + 1.2) continue;
      const nx = clamp(p.x, c.min.x, c.max.x);
      const nz = clamp(p.z, c.min.z, c.max.z);
      const ex = p.x - nx, ez = p.z - nz;
      const d2 = ex * ex + ez * ez;
      if (d2 >= R * R) continue;
      if (d2 < 1e-6) {
        // Inside the box: push out along the axis just moved.
        if (dx) p.x = dx > 0 ? c.min.x - R : c.max.x + R;
        else p.z = dz > 0 ? c.min.z - R : c.max.z + R;
        continue;
      }
      const d = Math.sqrt(d2);
      p.x = nx + (ex / d) * R;
      p.z = nz + (ez / d) * R;
    }
  }

  /** Eye position and look quaternion in the host's frame. */
  eye(target = new THREE.Vector3()) {
    return target.set(this.pos.x, this.pos.y + EYE + Math.sin(this.bob) * 0.03, this.pos.z);
  }

  quat(q = new THREE.Quaternion()) {
    return q.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
  }

  forward(t = new THREE.Vector3()) {
    return t.set(0, 0, -1).applyQuaternion(this.quat());
  }

  /** The use you are nearest and facing, or null. */
  nearestUse() {
    const eye = this.eye(_v);
    const fwd = this.forward(_w);
    let best = null;
    let score = Infinity;
    for (const u of this.interior.interactables) {
      if (u.hidden?.()) continue;
      const to = u.pos.clone().sub(eye);
      const d = to.length();
      if (d > u.r) continue;
      const dot = to.normalize().dot(fwd);
      if (dot < 0.1 && d > 1.2) continue;
      const s = d * (1.5 - dot);
      if (s < score) (score = s), (best = u);
    }
    return best;
  }

  /** Places `camera` in the world from the host's frame. */
  placeCamera(camera, host) {
    host.updateMatrixWorld();
    camera.position.copy(this.eye(_v)).applyMatrix4(host.matrixWorld);
    camera.quaternion.copy(host.getWorldQuaternion(new THREE.Quaternion())).multiply(this.quat());
  }
}
