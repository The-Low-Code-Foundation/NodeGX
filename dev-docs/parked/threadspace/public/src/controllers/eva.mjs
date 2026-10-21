// Outside, in a suit: a jetpack with six degrees of freedom. W S forward and back, A D sideways, R F up and
// down, Shift burns harder, the mouse looks. E grabs a pod within reach, goes back in at your own airlock, or
// docks at a hull's airlock to hack it. The suit has three minutes of air.

import * as THREE from 'three';
import { clamp } from '../util.mjs';

export const O2_SECONDS = 180;
const _v = new THREE.Vector3();

export class Eva {
  constructor(game) {
    this.game = game;
    this.pos = new THREE.Vector3();
    this.quat = new THREE.Quaternion();
    this.vel = new THREE.Vector3();
    this.o2 = O2_SECONDS;
  }

  /** Out of the Kestrel's port airlock, drifting at her speed. */
  enter() {
    const k = this.game.player;
    const door = k.obj.localToWorld(k.obj.userData.airlock.clone().add(new THREE.Vector3(-6, 0, 0)));
    this.pos.copy(door);
    this.quat.copy(k.obj.quaternion).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2));
    this.vel.copy(k.vel);
    this.o2 = O2_SECONDS;
  }

  exit() {}

  frame(f, dt) {
    const k = f.keys;
    if (f.dx || f.dy) {
      const yaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -f.dx * 0.0022);
      const pitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -f.dy * 0.0022);
      this.quat.multiply(yaw).multiply(pitch);
    }
    if (k.has('ArrowLeft')) this.quat.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), dt * 1.4));
    if (k.has('ArrowRight')) this.quat.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -dt * 1.4));
    if (k.has('ArrowUp')) this.quat.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), dt * 1.0));
    if (k.has('ArrowDown')) this.quat.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -dt * 1.0));
    const thrust = new THREE.Vector3();
    if (k.has('KeyW')) thrust.z -= 1;
    if (k.has('KeyS')) thrust.z += 1;
    if (k.has('KeyA')) thrust.x -= 1;
    if (k.has('KeyD')) thrust.x += 1;
    if (k.has('KeyR')) thrust.y += 1;
    if (k.has('KeyF')) thrust.y -= 1;
    const boost = k.has('ShiftLeft') || k.has('ShiftRight') ? 2.2 : 1;
    if (thrust.lengthSq()) {
      thrust.normalize().applyQuaternion(this.quat);
      this.vel.addScaledVector(thrust, 14 * boost * dt);
    }
    // The pack brakes you when you let go: a suit, not a rock.
    const k2 = this.game.player.vel;
    this.vel.lerp(k2, Math.min(1, dt * 0.9));
    const rel = _v.copy(this.vel).sub(k2);
    const max = 22 * boost;
    if (rel.length() > max) this.vel.copy(k2).addScaledVector(rel.normalize(), max);
    this.pos.addScaledVector(this.vel, dt);
    this.o2 -= dt;
  }

  placeCamera(camera) {
    camera.position.copy(this.pos);
    camera.quaternion.copy(this.quat);
  }

  /** The nearest thing E does out here, or null: a pod to grab, your airlock, a hull's airlock to hack. */
  nearestUse() {
    const g = this.game;
    const k = g.player;
    const list = [];
    const own = k.obj.localToWorld(k.obj.userData.airlock.clone().add(new THREE.Vector3(-3, 0, 0)));
    const dOwn = own.distanceTo(this.pos);
    if (dOwn < 9) list.push({ id: 'inside', label: 'Back inside the Kestrel', d: dOwn });
    for (const e of g.world.entities) {
      if (!e.alive) continue;
      if (e.kind === 'pod') {
        const d = e.obj.position.distanceTo(this.pos);
        if (d < 7) list.push({ id: 'grab', label: `Grab: ${e.name}`, d, pod: e });
      } else if (e.boardable && !e.captured) {
        const a = e.obj.localToWorld(e.obj.userData.airlock.clone());
        const d = a.distanceTo(this.pos);
        if (d < 9) list.push({ id: 'hack', label: `Hack the airlock of ${e.name}`, d, ship: e });
      }
    }
    list.sort((a, b) => a.d - b.d);
    return list[0] ?? null;
  }
}
