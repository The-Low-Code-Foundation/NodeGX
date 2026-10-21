// Bolts, bursts and what they hit. A bolt is a glowing stick that flies a straight line until it runs out or
// passes through a hull on the other side; every frame its step is tested against every live entity that is
// not on its side. An explosion is a flash, a ring and a handful of shards.

import * as THREE from 'three';
import { glow, rand } from './util.mjs';

const POOL = 240;
const _line = new THREE.Line3();
const _near = new THREE.Vector3();
const _local = new THREE.Vector3();

export class Combat {
  constructor(scene, world, sfx) {
    this.scene = scene;
    this.world = world;
    this.sfx = sfx;
    this.bolts = [];
    this.free = [];
    this.bursts = [];
    this.geo = new THREE.BoxGeometry(0.3, 0.3, 1);
    for (let i = 0; i < POOL; i++) {
      const m = new THREE.Mesh(this.geo, glow('#ff5540'));
      m.visible = false;
      m.frustumCulled = false;
      scene.add(m);
      this.free.push(m);
    }
    this.shardGeo = new THREE.TetrahedronGeometry(0.6);
  }

  colorFor(side) {
    return { player: '#58f0ff', rooks: '#ff5540', concord: '#58b0ff', guild: '#ffb347', turret: '#ffe66d' }[side] ?? '#ffffff';
  }

  /** A bolt from `from` toward `dir`, `range` long, hitting for `damage`; `owner` is who fired (never hit). */
  fire(side, from, dir, { speed = 420, range = 800, damage = 20, len = 5, width = 0.3, owner = null, color = null, sound = null, camera = null } = {}) {
    const mesh = this.free.pop();
    if (!mesh) return null;
    mesh.visible = true;
    mesh.material = glow(color ?? this.colorFor(side));
    mesh.scale.set(width / 0.3, width / 0.3, len);
    mesh.position.copy(from);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    const b = { mesh, side, owner, pos: from.clone(), dir: dir.clone().normalize(), speed, left: range, damage };
    this.bolts.push(b);
    if (sound && camera) this.sfx?.play(sound, from.distanceTo(camera.position));
    return b;
  }

  frame(dt, camera) {
    const ents = this.world.entities;
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i];
      const step = Math.min(b.speed * dt, b.left);
      const from = b.pos.clone();
      b.pos.addScaledVector(b.dir, step);
      b.left -= step;
      b.mesh.position.copy(b.pos);
      let hit = false;
      _line.set(from, b.pos);
      for (const e of ents) {
        if (!e.alive || e === b.owner || e.side === b.side || !e.hittable) continue;
        if (e.kind === 'pod' || e.kind === 'gate') continue;
        _line.closestPointToPoint(e.obj.position, true, _near);
        const r = e.radius;
        if (_near.distanceToSquared(e.obj.position) > r * r) continue;
        // Inside the coarse sphere: the finer test is the hull's own box, in its frame.
        if (e.half) {
          let inside = false;
          for (let k = 0; k <= 4 && !inside; k++) {
            _local.copy(from).lerp(b.pos, k / 4);
            e.obj.worldToLocal(_local);
            inside = Math.abs(_local.x) <= e.half[0] && Math.abs(_local.y) <= e.half[1] && Math.abs(_local.z) <= e.half[2];
          }
          if (!inside) continue;
        }
        e.damage(b.damage, _near.clone(), b.side, b.owner);
        this.burst(_near.clone(), e.kind === 'pirate' || e.kind === 'fighter' ? 2.5 : 4, { shards: 3, camera });
        hit = true;
        break;
      }
      if (hit || b.left <= 0) {
        b.mesh.visible = false;
        this.free.push(b.mesh);
        this.bolts.splice(i, 1);
      }
    }
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const x = this.bursts[i];
      x.t += dt;
      const k = x.t / x.life;
      if (k >= 1) {
        x.group.removeFromParent();
        this.bursts.splice(i, 1);
        continue;
      }
      x.flash.scale.setScalar(x.size * (0.4 + k * 1.6));
      x.flash.material.opacity = 1 - k;
      if (x.ring) {
        x.ring.scale.setScalar(x.size * (0.5 + k * 4));
        x.ring.material.opacity = 0.8 * (1 - k);
      }
      for (const s of x.shards) {
        s.position.addScaledVector(s.userData.v, dt);
        s.rotation.x += dt * 3;
        s.rotation.y += dt * 2;
      }
    }
  }

  /** A burst of `size` metres at `at`: a flash, shards; a ring and a boom for a ship dying. */
  burst(at, size, { shards = 6, ring = false, camera = null, sound = true } = {}) {
    const group = new THREE.Group();
    group.position.copy(at);
    this.scene.add(group);
    const flash = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: ring ? '#ffd9a0' : '#ffb347', transparent: true, opacity: 1, toneMapped: false, depthWrite: false }));
    group.add(flash);
    let ringMesh = null;
    if (ring) {
      ringMesh = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 32), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.8, side: THREE.DoubleSide, toneMapped: false, depthWrite: false }));
      ringMesh.lookAt(camera ? camera.position : new THREE.Vector3(0, 1, 0));
      group.add(ringMesh);
    }
    const list = [];
    for (let i = 0; i < shards; i++) {
      const s = new THREE.Mesh(this.shardGeo, glow(i % 2 ? '#ff8c42' : '#5a5f66'));
      s.scale.setScalar(size * 0.15 + rand(0, size * 0.1));
      s.userData.v = new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize().multiplyScalar(size * rand(3, 9));
      group.add(s);
      list.push(s);
    }
    this.bursts.push({ group, flash, ring: ringMesh, shards: list, t: 0, size, life: ring ? 1.6 : 0.5 });
    if (sound && camera) this.sfx?.play(ring ? 'boom' : 'boom', at.distanceTo(camera.position), size);
  }
}
