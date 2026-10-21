// Flying: the one model under the frigate's helm and the fighter's stick. Pitch, yaw and roll at the class's
// rates; throttle between the class's speeds; the hull leans into a turn. Also the autopilot's hands.

import * as THREE from 'three';
import { clamp, forwardOf, turnToward } from '../util.mjs';

const Z = new THREE.Vector3(0, 0, 1);

export class Flight {
  constructor(ent, { speed, turn }) {
    this.ent = ent;
    this.speedMin = speed[0];
    this.speedMax = speed[1];
    this.turn = turn;
    this.throttle = 0.6;
    this.stick = { x: 0, y: 0 };
    this.bank = 0;
    this.pitch = 0;
    this.yaw = 0;
    this.roll = 0;
  }

  /** One frame of manual flying from the frame's input. */
  manual(f, dt, { mouseGain = 0.0035 } = {}) {
    const k = f.keys;
    if (f.dx || f.dy) {
      this.stick.x = clamp(this.stick.x + f.dx * mouseGain, -1, 1);
      this.stick.y = clamp(this.stick.y - f.dy * mouseGain, -1, 1);
    }
    let pitch = this.stick.y;
    let yaw = -this.stick.x;
    const decay = Math.max(0, 1 - dt * 1.8);
    this.stick.x *= decay;
    this.stick.y *= decay;
    let roll = 0;
    if (k.has('ArrowUp')) pitch += 1;
    if (k.has('ArrowDown')) pitch -= 1;
    if (k.has('ArrowLeft')) yaw += 1;
    if (k.has('ArrowRight')) yaw -= 1;
    if (k.has('KeyA')) roll += 1;
    if (k.has('KeyD')) roll -= 1;
    if (k.has('KeyW')) this.throttle = Math.min(1, this.throttle + dt * 0.5);
    if (k.has('KeyS')) this.throttle = Math.max(0, this.throttle - dt * 0.5);
    if (f.wheel) this.throttle = clamp(this.throttle - f.wheel * 0.1, 0, 1);
    this.apply(clamp(pitch, -1, 1), clamp(yaw, -1, 1), clamp(roll, -1, 1), dt);
  }

  apply(pitch, yaw, roll, dt) {
    const o = this.ent.obj;
    const t = this.turn;
    o.rotateX(pitch * t * dt);
    o.rotateY(yaw * t * 0.8 * dt);
    o.rotateZ(roll * t * 1.6 * dt);
    this.bank += (yaw * 0.35 - this.bank) * Math.min(1, dt * 4);
    this.pitch = pitch;
    this.yaw = yaw;
    this.move(dt);
  }

  move(dt) {
    const e = this.ent;
    e.speed = this.speedMin + this.throttle * (this.speedMax - this.speedMin);
    forwardOf(e.obj, e.vel).multiplyScalar(e.speed);
    e.obj.position.addScaledVector(e.vel, dt);
    e.obj.updateMatrixWorld();
  }

  /** The autopilot: turn toward `to`, throttle by distance; stops within `stop` metres. Returns the distance. */
  toward(to, dt, { stop = 150, slow = 600 } = {}) {
    const e = this.ent;
    const d = e.obj.position.distanceTo(to);
    if (d > stop) {
      const angle = turnToward(e.obj, to, this.turn * 0.8, dt);
      const want = d > slow ? 1 : clamp((d - stop) / (slow - stop), 0, 1);
      this.throttle += (want * (angle < 0.6 ? 1 : 0.3) - this.throttle) * Math.min(1, dt * 1.5);
    } else this.throttle = Math.max(0, this.throttle - dt * 0.8);
    this.bank *= Math.max(0, 1 - dt * 3);
    this.move(dt);
    return d;
  }

  hold(dt) {
    this.throttle = Math.max(0, this.throttle - dt * 0.8);
    this.bank *= Math.max(0, 1 - dt * 3);
    this.move(dt);
  }

  /** Where the camera's quaternion goes with the bank in it. */
  cameraQuat(q) {
    return q.copy(this.ent.obj.quaternion).multiply(new THREE.Quaternion().setFromAxisAngle(Z, this.bank));
  }
}
