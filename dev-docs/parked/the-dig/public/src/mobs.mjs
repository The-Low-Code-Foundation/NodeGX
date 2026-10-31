// The things that live down there. Crawlers keep to the dark (a torch keeps them off: they will not step into
// bright light), stalkers come deeper, and their eyes glow, so you see them on the far ledges before they see you.
// Behind the portals: bugs in the research stations, robots at the ruins, beasts in the open.
import * as THREE from 'three';
import { BLOCKS } from './blocks.mjs';
import { brightness } from './world.mjs';

const KINDS = {
  crawler: { w: 0.45, h: 0.7, hp: 8, speed: 3.3, wander: 1.1, dmg: 2, sense: 16, body: 0x3d4a3a, eye: 0xff3322, fearsLight: true, legs: 6 },
  stalker: { w: 0.35, h: 2.2, hp: 14, speed: 3.9, wander: 1.3, dmg: 3, sense: 22, body: 0x2a2630, eye: 0x7dff5a, fearsLight: true, legs: 2 },
  bug: { w: 0.3, h: 0.45, hp: 3, speed: 5.2, wander: 2.2, dmg: 1, sense: 14, body: 0x9a5a1a, eye: 0xffd040, legs: 6 },
  robot: { w: 0.45, h: 1.7, hp: 16, speed: 2.3, wander: 0.8, dmg: 3, sense: 18, body: 0x7f8a96, eye: 0x40c8ff, legs: 2 },
  beast: { w: 0.5, h: 0.95, hp: 10, speed: 5.4, wander: 1.6, dmg: 2, sense: 20, body: 0x6b5340, eye: 0xffaa33, legs: 4 }
};

function build(kind) {
  const k = KINDS[kind];
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshBasicMaterial({ color: k.body });
  const eyeMat = new THREE.MeshBasicMaterial({ color: k.eye });
  const add = (w, h, d, x, y, z, m = bodyMat) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    g.add(mesh);
    return mesh;
  };
  const legs = [];
  if (kind === 'crawler' || kind === 'bug') {
    const s = kind === 'bug' ? 0.6 : 1;
    add(0.8 * s, 0.35 * s, 1.0 * s, 0, 0.42 * s, 0);
    add(0.5 * s, 0.3 * s, 0.4 * s, 0, 0.45 * s, -0.6 * s);
    add(0.09 * s, 0.09 * s, 0.05 * s, -0.12 * s, 0.5 * s, -0.81 * s, eyeMat);
    add(0.09 * s, 0.09 * s, 0.05 * s, 0.12 * s, 0.5 * s, -0.81 * s, eyeMat);
    for (let i = 0; i < 6; i++) {
      const side = i % 2 ? 1 : -1;
      const leg = add(0.6 * s, 0.07 * s, 0.07 * s, side * 0.6 * s, 0.25 * s, (-0.35 + Math.floor(i / 2) * 0.35) * s);
      leg.rotation.z = side * 0.6;
      legs.push(leg);
    }
  } else if (kind === 'stalker') {
    add(0.4, 1.1, 0.3, 0, 1.3, 0);
    add(0.32, 0.36, 0.32, 0, 2.02, 0);
    add(0.07, 0.05, 0.04, -0.08, 2.05, -0.17, eyeMat);
    add(0.07, 0.05, 0.04, 0.08, 2.05, -0.17, eyeMat);
    for (const side of [-1, 1]) {
      legs.push(add(0.12, 0.8, 0.12, side * 0.13, 0.4, 0));
      const arm = add(0.08, 1.0, 0.08, side * 0.28, 1.25, -0.1);
      arm.rotation.x = -0.3;
    }
  } else if (kind === 'robot') {
    add(0.7, 0.75, 0.45, 0, 1.05, 0);
    add(0.45, 0.35, 0.4, 0, 1.6, 0);
    add(0.38, 0.08, 0.04, 0, 1.62, -0.21, eyeMat);
    for (const side of [-1, 1]) legs.push(add(0.18, 0.65, 0.2, side * 0.2, 0.33, 0));
  } else {
    add(0.55, 0.45, 1.2, 0, 0.7, 0);
    add(0.38, 0.35, 0.45, 0, 0.85, -0.75);
    add(0.07, 0.06, 0.04, -0.1, 0.92, -0.98, eyeMat);
    add(0.07, 0.06, 0.04, 0.1, 0.92, -0.98, eyeMat);
    for (let i = 0; i < 4; i++) legs.push(add(0.13, 0.5, 0.13, (i % 2 ? 1 : -1) * 0.2, 0.25, i < 2 ? -0.45 : 0.45));
  }
  return { group: g, bodyMat, legs };
}

export class Mobs {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.list = [];
    this.spawnTimer = 0;
    this.caveSpawning = false;
    this.surface = () => 0;
  }

  add(kind, x, y, z) {
    const k = KINDS[kind];
    const { group, bodyMat, legs } = build(kind);
    group.position.set(x, y, z);
    this.scene.add(group);
    const m = { kind, k, group, bodyMat, legs, pos: group.position, vel: new THREE.Vector3(), hp: k.hp, heading: Math.random() * 6.28, think: 0, attackAt: 0, onGround: false, growlAt: performance.now() / 1000 + Math.random() * 6, hurtFlash: 0, phase: Math.random() * 6 };
    this.list.push(m);
    return m;
  }

  clear() {
    for (const m of this.list) this.scene.remove(m.group);
    this.list = [];
  }

  remove(m) {
    this.scene.remove(m.group);
    this.list.splice(this.list.indexOf(m), 1);
  }

  solidAt(x, y, z) {
    return BLOCKS[this.world.get(Math.floor(x), Math.floor(y), Math.floor(z))].solid;
  }

  collides(m, x, y, z) {
    const w = m.k.w;
    for (let yy = Math.floor(y); yy <= Math.floor(y + m.k.h - 0.01); yy++)
      for (const [dx, dz] of [[-w, -w], [w, -w], [-w, w], [w, w]]) if (this.solidAt(x + dx, yy, z + dz)) return true;
    return false;
  }

  sees(m, eye) {
    const from = new THREE.Vector3(m.pos.x, m.pos.y + m.k.h * 0.8, m.pos.z);
    const d = eye.clone().sub(from);
    const dist = d.length();
    const hit = this.world.raycast(from, d.normalize(), dist, (id) => BLOCKS[id].opaque);
    return !hit;
  }

  // Cave spawning: out of sight in the dark, 18–40 blocks off, below the surface.
  spawnCave(player, dt) {
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;
    this.spawnTimer = 1.5;
    const depth = this.surface(player.pos.x, player.pos.z) - player.pos.y;
    if (depth < 10) return;
    const cap = Math.min(9, 3 + Math.floor(depth / 30));
    if (this.list.length >= cap) return;
    for (let tries = 0; tries < 10; tries++) {
      const a = Math.random() * Math.PI * 2, d = 18 + Math.random() * 22;
      const x = Math.floor(player.pos.x + Math.cos(a) * d), z = Math.floor(player.pos.z + Math.sin(a) * d);
      for (let dy = -12; dy <= 12; dy++) {
        const y = Math.floor(player.pos.y) + dy;
        if (this.world.get(x, y, z) !== 0 || this.world.get(x, y + 1, z) !== 0 || !BLOCKS[this.world.get(x, y - 1, z)].solid) continue;
        if (this.world.lightAt(x, y, z) > 4) continue;
        if (y > this.surface(x, z) - 8) continue;
        const kind = depth > 60 && Math.random() < 0.35 ? 'stalker' : 'crawler';
        if (kind === 'stalker' && this.world.get(x, y + 2, z) !== 0) continue;
        this.add(kind, x + 0.5, y, z + 0.5);
        return;
      }
    }
  }

  update(dt, player, now, hooks) {
    if (this.caveSpawning) this.spawnCave(player, dt);
    const eye = player.eye();
    for (const m of [...this.list]) {
      const k = m.k;
      const toP = new THREE.Vector3(player.pos.x - m.pos.x, 0, player.pos.z - m.pos.z);
      const dist = Math.hypot(toP.x, player.pos.y - m.pos.y, toP.z);
      if (this.caveSpawning && dist > 70) {
        this.remove(m);
        continue;
      }
      m.think -= dt;
      if (m.think <= 0) {
        m.think = 0.25 + Math.random() * 0.2;
        m.chasing = dist < k.sense && this.sees(m, eye);
        if (!m.chasing && Math.random() < 0.3) m.heading = Math.random() * Math.PI * 2;
      }
      let speed = m.chasing ? k.speed : k.wander;
      let dir = m.chasing ? Math.atan2(toP.x, toP.z) : m.heading;
      // The cave things will not walk into torchlight; caught in it, they back off.
      if (k.fearsLight) {
        const here = this.world.lightAt(m.pos.x, m.pos.y + 0.5, m.pos.z);
        const ax = m.pos.x + Math.sin(dir) * 1.2, az = m.pos.z + Math.cos(dir) * 1.2;
        const ahead = this.world.lightAt(ax, m.pos.y + 0.5, az);
        if (here >= 11) {
          dir += Math.PI;
          speed = k.speed;
        } else if (ahead >= 10) speed = 0;
      }
      const vx = Math.sin(dir) * speed, vz = Math.cos(dir) * speed;
      m.vel.x += (vx - m.vel.x) * Math.min(1, 8 * dt);
      m.vel.z += (vz - m.vel.z) * Math.min(1, 8 * dt);
      m.vel.y -= 30 * dt;
      // Move, stepping up one block when blocked.
      const nx = m.pos.x + m.vel.x * dt;
      if (!this.collides(m, nx, m.pos.y, m.pos.z)) m.pos.x = nx;
      else if (m.onGround && !this.collides(m, nx, m.pos.y + 1.05, m.pos.z)) m.vel.y = 8.5;
      else m.heading += 1.5;
      const nz = m.pos.z + m.vel.z * dt;
      if (!this.collides(m, m.pos.x, m.pos.y, nz)) m.pos.z = nz;
      else if (m.onGround && !this.collides(m, m.pos.x, m.pos.y + 1.05, nz)) m.vel.y = 8.5;
      else m.heading -= 1.5;
      const ny = m.pos.y + Math.max(-1, m.vel.y * dt);
      if (this.collides(m, m.pos.x, ny, m.pos.z)) {
        if (m.vel.y < 0) {
          m.pos.y = Math.floor(ny) + 1;
          m.onGround = true;
        }
        m.vel.y = 0;
      } else {
        m.pos.y = ny;
        m.onGround = false;
      }
      if (m.pos.y < -2000) this.remove(m);
      // Face where it is going; legs scuttle.
      m.group.rotation.y = Math.atan2(m.vel.x, m.vel.z) + Math.PI;
      m.phase += dt * Math.hypot(m.vel.x, m.vel.z) * 3;
      m.legs.forEach((l, i) => (l.rotation.x = Math.sin(m.phase + i * 1.7) * 0.5));
      // Lit by the world's light like the blocks are.
      const l = this.world.lightAt(m.pos.x, m.pos.y + 0.5, m.pos.z);
      const b = brightness(l);
      m.hurtFlash = Math.max(0, m.hurtFlash - dt * 4);
      m.bodyMat.color.setHex(k.body).multiplyScalar(b).lerp(new THREE.Color(1, 0.2, 0.1), m.hurtFlash);
      // Attack.
      if (dist < k.w + 0.9 && Math.abs(player.pos.y - m.pos.y) < 1.6 && now > m.attackAt) {
        m.attackAt = now + 0.9;
        hooks.bite(k.dmg, m);
      }
      if (m.chasing && now > m.growlAt) {
        m.growlAt = now + 3 + Math.random() * 5;
        hooks.growl(dist);
      }
    }
  }

  // The nearest creature a ray hits within max (a box test against each one).
  rayHit(o, d, max) {
    let best = null;
    for (const m of this.list) {
      const w = m.k.w + 0.15;
      const min = [m.pos.x - w, m.pos.y, m.pos.z - w], mx = [m.pos.x + w, m.pos.y + m.k.h, m.pos.z + w];
      let t0 = 0, t1 = max;
      const oo = [o.x, o.y, o.z], dd = [d.x, d.y, d.z];
      let ok = true;
      for (let a = 0; a < 3; a++) {
        if (Math.abs(dd[a]) < 1e-9) {
          if (oo[a] < min[a] || oo[a] > mx[a]) ok = false;
          continue;
        }
        let ta = (min[a] - oo[a]) / dd[a], tb = (mx[a] - oo[a]) / dd[a];
        if (ta > tb) [ta, tb] = [tb, ta];
        t0 = Math.max(t0, ta);
        t1 = Math.min(t1, tb);
        if (t0 > t1) ok = false;
      }
      if (ok && (!best || t0 < best.t)) best = { mob: m, t: t0, head: o.y + d.y * t0 > m.pos.y + m.k.h * 0.78 };
    }
    return best;
  }

  damage(m, n) {
    m.hp -= n;
    m.hurtFlash = 1;
    m.chasing = true;
    m.vel.y = 4;
    return m.hp <= 0;
  }
}
