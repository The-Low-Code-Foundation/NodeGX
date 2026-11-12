// The Kestrel's turret, with you in it: the view sits behind the barrels, the mouse swings the gun, click or
// Space fires. E climbs back down.

import * as THREE from 'three';
import { clamp } from '../util.mjs';

export class TurretSeat {
  constructor(game) {
    this.game = game;
    this.cool = 0;
  }

  enter() {
    const t = this.game.player.obj.userData.turret;
    this.yaw = t.yaw.rotation.y;
    this.pitch = t.pitch.rotation.x;
  }

  exit() {}

  frame(f, dt) {
    const g = this.game;
    const t = g.player.obj.userData.turret;
    if (f.dx || f.dy) {
      this.yaw -= f.dx * 0.0025;
      this.pitch = clamp(this.pitch - f.dy * 0.0025, -0.2, 1.2);
    }
    if (f.keys.has('ArrowLeft')) this.yaw += dt * 1.6;
    if (f.keys.has('ArrowRight')) this.yaw -= dt * 1.6;
    if (f.keys.has('ArrowUp')) this.pitch = clamp(this.pitch + dt, -0.2, 1.2);
    if (f.keys.has('ArrowDown')) this.pitch = clamp(this.pitch - dt, -0.2, 1.2);
    t.yaw.rotation.y = this.yaw;
    t.pitch.rotation.x = this.pitch;
    this.cool -= dt;
    if ((f.trigger || f.keys.has('Space')) && this.cool <= 0) {
      this.cool = g.ship.turretEvery;
      const tip = t.pitch.localToWorld(t.tip.clone());
      const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(t.pitch.getWorldQuaternion(new THREE.Quaternion()));
      g.fireTurret(tip.clone().addScaledVector(dir, 900));
    }
  }

  placeCamera(camera) {
    const t = this.game.player.obj.userData.turret;
    t.pitch.updateMatrixWorld();
    camera.position.copy(t.pitch.localToWorld(this.game.player.obj.userData.turretEye.clone()));
    camera.quaternion.copy(t.pitch.getWorldQuaternion(new THREE.Quaternion()));
  }
}
