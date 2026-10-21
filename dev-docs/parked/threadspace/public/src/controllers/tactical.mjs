// The captain's chair: the Kestrel from outside, the camera on a string round her, while the panel takes the
// orders. Drag to orbit, wheel to zoom. Tab or E stands you up again.

import * as THREE from 'three';
import { clamp } from '../util.mjs';

export class Tactical {
  constructor(game) {
    this.game = game;
    this.yaw = 0.6;
    this.pitch = 0.35;
    this.dist = 160;
  }

  enter() {}
  exit() {}

  frame(f, dt) {
    if (f.trigger && (f.dx || f.dy)) {
      this.yaw -= f.dx * 0.006;
      this.pitch = clamp(this.pitch + f.dy * 0.006, -1.2, 1.2);
    } else if (f.dx || f.dy) {
      this.yaw -= f.dx * 0.003;
      this.pitch = clamp(this.pitch + f.dy * 0.003, -1.2, 1.2);
    }
    if (f.keys.has('ArrowLeft')) this.yaw += dt;
    if (f.keys.has('ArrowRight')) this.yaw -= dt;
    if (f.wheel) this.dist = clamp(this.dist * (1 + f.wheel * 0.12), 60, 900);
    this.yaw += dt * 0.04; // a slow drift round her when you leave it be
  }

  placeCamera(camera) {
    const k = this.game.player.obj;
    const off = new THREE.Vector3(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch)).multiplyScalar(this.dist);
    camera.position.copy(k.position).add(off);
    camera.lookAt(k.position);
  }
}
