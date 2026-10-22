// The rooms' lights. Every point light in a three.js scene is paid for by every pixel of every lit surface, seen or
// not, and adding or removing one recompiles every material. So the scene holds a fixed pool of point lights, and each
// frame they are moved onto the room lights nearest the camera, in the rooms you are actually in. An interior only
// says where its lights are (`Interior.light`).
//
// 2026-10-22, s3: aboard the hauler the scene had 19 point lights (the Kestrel's 12 still burning inside her hull, out
// of sight, plus the hauler's 7) and the frame rate fell to a third of walking the Kestrel (TS-S3-BOARDFPS).

import * as THREE from 'three';

export const POOL = 8;
const _p = new THREE.Vector3();

export class LightPool {
  constructor(scene, n = POOL) {
    this.lights = [];
    for (let i = 0; i < n; i++) {
      const l = new THREE.PointLight('#ffffff', 0, 1, 1.6);
      scene.add(l);
      this.lights.push(l);
    }
  }

  /** Puts the pool on the nearest lights of `interiors` to `eye`; the rest of the pool goes dark (and costs the same). */
  update(eye, interiors) {
    const specs = [];
    for (const I of interiors) {
      if (!I) continue;
      for (const s of I.lights) {
        s.anchor.updateWorldMatrix(true, false);
        s.world = s.anchor.getWorldPosition(s.world ?? new THREE.Vector3());
        s.d = s.world.distanceToSquared(eye);
        specs.push(s);
      }
    }
    specs.sort((a, b) => a.d - b.d);
    this.lights.forEach((l, i) => {
      const s = specs[i];
      if (!s) {
        l.intensity = 0;
        return;
      }
      l.position.copy(s.world);
      l.color.copy(s.color);
      l.intensity = s.intensity;
      l.distance = s.distance;
      l.decay = s.decay;
    });
    return Math.min(specs.length, this.lights.length);
  }
}
