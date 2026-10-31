// The voxel world: 16³ chunks made by a generator on demand, the player's edits kept apart from them (so a chunk
// can be dropped and made again), Minecraft-style light (0–15, flood-filled from torches, lava, crystals and the
// sky) baked into the vertex colours, and one mesh per chunk built inside a per-frame time budget.
import * as THREE from 'three';
import { B, BLOCKS, isOpaque, emits, tilesOf, tileUV } from './blocks.mjs';

export const CS = 16;
const M = 14; // the light margin: no light travels further than this
const S = CS + 2 * M;
const S2 = S * S;
const idx = (x, y, z) => x + z * CS + y * CS * CS;
const key = (cx, cy, cz) => `${cx},${cy},${cz}`;
const FACES = [
  // normal, the two in-plane axes (for the corners), the tile slot (0 top, 1 side, 2 bottom), the face's shade
  { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1], t: 0, s: 1.0 },
  { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, -1], t: 2, s: 0.5 },
  { n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0], t: 1, s: 0.8 },
  { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0], t: 1, s: 0.8 },
  { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0], t: 1, s: 0.65 },
  { n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0], t: 1, s: 0.65 }
];
const AO = [0.5, 0.68, 0.84, 1];
// Gentler than Minecraft's curve: a phone in daylight still has to see a dim cave.
export const brightness = (l) => Math.max(0.025, Math.pow(0.82, 15 - l));

export class World {
  constructor({ generator, scene, texture, radius = 4, vradius = 2 }) {
    this.gen = generator;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.material = new THREE.MeshBasicMaterial({ map: texture, vertexColors: true });
    this.chunks = new Map();
    this.edits = new Map(); // chunk key → Map(index → block id)
    this.radius = radius;
    this.vradius = vradius;
    this.queue = [];
    this.center = [0, 0, 0];
    this.region = { ids: new Uint8Array(S * S * S), light: new Uint8Array(S * S * S), q: new Int32Array(S * S * S * 2) };
    this.onEdit = null;
  }

  // ── data ──
  data(cx, cy, cz) {
    const k = key(cx, cy, cz);
    let c = this.chunks.get(k);
    if (c) return c;
    const data = this.gen.chunk(cx, cy, cz);
    const ed = this.edits.get(k);
    if (ed) for (const [i, id] of ed) data[i] = id;
    c = { cx, cy, cz, k, data, mesh: null, dirty: true, light: null, lightConst: 0, emitters: 0 };
    for (let i = 0; i < data.length; i++) if (emits[data[i]]) c.emitters++;
    this.chunks.set(k, c);
    return c;
  }

  get(x, y, z) {
    const cx = Math.floor(x / CS), cy = Math.floor(y / CS), cz = Math.floor(z / CS);
    return this.data(cx, cy, cz).data[idx(x - cx * CS, y - cy * CS, z - cz * CS)];
  }

  // Light at a cell (for the monsters, the hand, the warnings): what the last mesh of that chunk computed.
  lightAt(x, y, z) {
    x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
    const cx = Math.floor(x / CS), cy = Math.floor(y / CS), cz = Math.floor(z / CS);
    const c = this.chunks.get(key(cx, cy, cz));
    if (!c) return 0;
    if (!c.light) return c.lightConst;
    return c.light[idx(x - cx * CS, y - cy * CS, z - cz * CS)];
  }

  set(x, y, z, id, { persist = true } = {}) {
    const cx = Math.floor(x / CS), cy = Math.floor(y / CS), cz = Math.floor(z / CS);
    const c = this.data(cx, cy, cz);
    const i = idx(x - cx * CS, y - cy * CS, z - cz * CS);
    const old = c.data[i];
    if (old === id) return;
    c.data[i] = id;
    if (emits[old]) c.emitters--;
    if (emits[id]) c.emitters++;
    if (persist) {
      let ed = this.edits.get(c.k);
      if (!ed) this.edits.set(c.k, (ed = new Map()));
      ed.set(i, id);
    }
    // Which meshes this touches: always its own and the neighbours it borders; every chunk in the light's reach
    // when the light could change (an emitter came or went, or something opened or closed beside a lit cell).
    const lit = emits[old] || emits[id] || (isOpaque[old] !== isOpaque[id] && this.litAround(x, y, z));
    const r = lit ? M : 1;
    for (let X = Math.floor((x - r) / CS); X <= Math.floor((x + r) / CS); X++)
      for (let Y = Math.floor((y - r) / CS); Y <= Math.floor((y + r) / CS); Y++)
        for (let Z = Math.floor((z - r) / CS); Z <= Math.floor((z + r) / CS); Z++) {
          const n = this.chunks.get(key(X, Y, Z));
          if (n) n.dirty = true;
        }
    // The player's own chunk is rebuilt now, so the hole appears on the frame of the dig.
    this.mesh(c);
    this.onEdit?.(x, y, z, id, old);
  }

  litAround(x, y, z) {
    for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]])
      if (this.lightAt(x + dx, y + dy, z + dz) > 1) return true;
    return false;
  }

  solid(x, y, z) {
    return BLOCKS[this.get(Math.floor(x), Math.floor(y), Math.floor(z))].solid;
  }

  // ── streaming ──
  update(pos, budgetMs = 6) {
    const pcx = Math.floor(pos.x / CS), pcy = Math.floor(pos.y / CS), pcz = Math.floor(pos.z / CS);
    const R = this.radius, V = this.vradius;
    if (pcx !== this.center[0] || pcy !== this.center[1] || pcz !== this.center[2] || !this.queue.length) {
      this.center = [pcx, pcy, pcz];
      const want = [];
      for (let dx = -R; dx <= R; dx++)
        for (let dz = -R; dz <= R; dz++) {
          if (dx * dx + dz * dz > (R + 0.5) * (R + 0.5)) continue;
          for (let dy = -V; dy <= V; dy++) want.push([pcx + dx, pcy + dy, pcz + dz, dx * dx + dz * dz + dy * dy * 2]);
        }
      want.sort((a, b) => a[3] - b[3]);
      this.queue = want;
      // Drop meshes out of range, and the data further out (the edits keep what the player changed).
      for (const [k, c] of this.chunks) {
        const d = Math.max(Math.abs(c.cx - pcx), Math.abs(c.cz - pcz));
        const dv = Math.abs(c.cy - pcy);
        if ((d > R + 1 || dv > V + 1) && c.mesh) {
          this.group.remove(c.mesh);
          c.mesh.geometry.dispose();
          c.mesh = null;
          c.dirty = true;
        }
        if (d > R + 3 || dv > V + 3) this.chunks.delete(k);
      }
    }
    const t0 = performance.now();
    let built = 0;
    for (const [cx, cy, cz] of this.queue) {
      const c = this.data(cx, cy, cz);
      if (!c.dirty) continue;
      this.mesh(c);
      built++;
      if (performance.now() - t0 > budgetMs) break;
    }
    return built;
  }

  pending() {
    // Nothing asked for yet is not the same as nothing left to build.
    if (!this.queue.length) return Infinity;
    let n = 0;
    for (const [cx, cy, cz] of this.queue) if (this.data(cx, cy, cz).dirty) n++;
    return n;
  }

  // ── light + mesh ──
  fillRegion(c) {
    const { ids } = this.region;
    const ox = c.cx * CS - M, oy = c.cy * CS - M, oz = c.cz * CS - M;
    for (let X = -1; X <= 1; X++)
      for (let Y = -1; Y <= 1; Y++)
        for (let Z = -1; Z <= 1; Z++) {
          const n = this.data(c.cx + X, c.cy + Y, c.cz + Z).data;
          const bx = (c.cx + X) * CS, by = (c.cy + Y) * CS, bz = (c.cz + Z) * CS;
          const x0 = Math.max(0, ox - bx), x1 = Math.min(CS, ox + S - bx);
          const y0 = Math.max(0, oy - by), y1 = Math.min(CS, oy + S - by);
          const z0 = Math.max(0, oz - bz), z1 = Math.min(CS, oz + S - bz);
          for (let y = y0; y < y1; y++)
            for (let z = z0; z < z1; z++) {
              const ri = (bx + x0 - ox) + (bz + z - oz) * S + (by + y - oy) * S2;
              const si = x0 + z * CS + y * CS * CS;
              for (let x = 0; x < x1 - x0; x++) ids[ri + x] = n[si + x];
            }
        }
  }

  // Is any light reaching this chunk's region? (Most deep rock is dark and skips the flood.)
  lightKind(c) {
    let emitters = 0;
    for (let X = -1; X <= 1; X++)
      for (let Y = -1; Y <= 1; Y++)
        for (let Z = -1; Z <= 1; Z++) emitters += this.data(c.cx + X, c.cy + Y, c.cz + Z).emitters;
    let sky = 'none';
    if (this.gen.sky) {
      const [lo, hi] = this.gen.heightRange(c.cx * CS - M, c.cz * CS - M, S);
      if (c.cy * CS - M > hi + 1) sky = 'all';
      else if (c.cy * CS + CS + M > lo) sky = 'some';
    }
    return { emitters, sky };
  }

  flood(c, sky) {
    const { ids, light, q } = this.region;
    light.fill(0);
    const ox = c.cx * CS - M, oy = c.cy * CS - M, oz = c.cz * CS - M;
    let head = 0, tail = 0;
    const heights = this.region.heights ?? (this.region.heights = new Float32Array(S2));
    if (sky) for (let z = 0; z < S; z++) for (let x = 0; x < S; x++) heights[x + z * S] = this.gen.height(ox + x, oz + z);
    for (let y = 0; y < S; y++)
      for (let z = 0; z < S; z++)
        for (let x = 0; x < S; x++) {
          const i = x + z * S + y * S2;
          const id = ids[i];
          let l = emits[id];
          if (sky && !isOpaque[id] && oy + y > heights[x + z * S]) l = 15;
          if (l) {
            light[i] = l;
            q[tail++] = i;
          }
        }
    while (head < tail) {
      const i = q[head++];
      const l = light[i] - 1;
      if (l <= 0) continue;
      const x = i % S, z = Math.floor(i / S) % S, y = Math.floor(i / S2);
      if (x > 0) spread(i - 1);
      if (x < S - 1) spread(i + 1);
      if (z > 0) spread(i - S);
      if (z < S - 1) spread(i + S);
      if (y > 0) spread(i - S2);
      if (y < S - 1) spread(i + S2);
      function spread(n) {
        if (isOpaque[ids[n]] || light[n] >= l) return;
        light[n] = l;
        q[tail++] = n;
      }
    }
  }

  mesh(c) {
    c.dirty = false;
    // A chunk of nothing but air, or of solid rock with rock all round it, has no faces.
    let solidCount = 0;
    for (let i = 0; i < c.data.length; i++) if (isOpaque[c.data[i]]) solidCount++;
    const kind = this.lightKind(c);
    const empty = c.data.every((v) => v === B.AIR);
    if (empty || (solidCount === CS * CS * CS && this.sealed(c))) {
      this.drop(c);
      c.light = null;
      c.lightConst = empty && kind.sky === 'all' ? 15 : 0;
      if (empty && kind.sky !== 'all' && (kind.emitters || kind.sky === 'some')) this.computeLightOnly(c, kind);
      return;
    }
    this.fillRegion(c);
    const { ids, light } = this.region;
    if (kind.sky === 'all') light.fill(15);
    else if (kind.emitters || kind.sky === 'some') this.flood(c, kind.sky === 'some');
    else light.fill(0);
    // Keep this chunk's own light for lightAt.
    c.light = new Uint8Array(CS * CS * CS);
    for (let y = 0; y < CS; y++)
      for (let z = 0; z < CS; z++)
        for (let x = 0; x < CS; x++) c.light[idx(x, y, z)] = light[(x + M) + (z + M) * S + (y + M) * S2];

    const pos = [], col = [], uv = [], ind = [];
    const at = (x, y, z) => (x + M) + (z + M) * S + (y + M) * S2;
    for (let y = 0; y < CS; y++)
      for (let z = 0; z < CS; z++)
        for (let x = 0; x < CS; x++) {
          const id = ids[at(x, y, z)];
          if (!id) continue;
          const b = BLOCKS[id];
          if (b.shape === 'none') continue;
          if (b.shape === 'torch') {
            torch(pos, col, uv, ind, x, y, z, brightness(Math.max(14, light[at(x, y, z)])));
            continue;
          }
          const tiles = tilesOf(id);
          for (const f of FACES) {
            const [nx, ny, nz] = f.n;
            const nid = ids[at(x + nx, y + ny, z + nz)];
            if (isOpaque[nid] || (nid === id && !b.opaque)) continue;
            const ax = x + nx, ay = y + ny, az = z + nz;
            const uvr = tileUV(tiles[f.t]);
            const base = pos.length / 3;
            // The four corners: (-,-) (+,-) (+,+) (-,+) in the face's u/v.
            const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
            const aos = [];
            for (const [su, sv] of corners) {
              const ux = f.u[0] * su, uy = f.u[1] * su, uz = f.u[2] * su;
              const vx = f.v[0] * sv, vy = f.v[1] * sv, vz = f.v[2] * sv;
              const s1 = at(ax + ux, ay + uy, az + uz);
              const s2 = at(ax + vx, ay + vy, az + vz);
              const cc = at(ax + ux + vx, ay + uy + vy, az + uz + vz);
              const o1 = isOpaque[ids[s1]], o2 = isOpaque[ids[s2]], o3 = isOpaque[ids[cc]];
              let sum = light[at(ax, ay, az)], n = 1;
              if (!o1) { sum += light[s1]; n++; }
              if (!o2) { sum += light[s2]; n++; }
              if (!o3 && !(o1 && o2)) { sum += light[cc]; n++; }
              let l = sum / n;
              if (b.light) l = Math.max(l, b.light);
              const ao = o1 && o2 ? 0 : 3 - o1 - o2 - o3;
              aos.push(ao);
              const br = brightness(l) * f.s * (b.light ? 1 : AO[ao]);
              // The corner's position: the centre of the face, pushed half a block along u and v.
              const px = x + 0.5 + nx * 0.5 + (f.u[0] * su + f.v[0] * sv) * 0.5;
              const py = y + 0.5 + ny * 0.5 + (f.u[1] * su + f.v[1] * sv) * 0.5;
              const pz = z + 0.5 + nz * 0.5 + (f.u[2] * su + f.v[2] * sv) * 0.5;
              pos.push(px, py, pz);
              col.push(br, br, br);
              uv.push(su < 0 ? uvr[0] : uvr[2], sv < 0 ? uvr[1] : uvr[3]);
            }
            // Flip the quad's diagonal when the occlusion is lopsided (no dark streak across the face).
            if (aos[0] + aos[2] > aos[1] + aos[3]) ind.push(base, base + 1, base + 2, base, base + 2, base + 3);
            else ind.push(base + 1, base + 2, base + 3, base + 1, base + 3, base);
          }
        }
    this.drop(c);
    if (!ind.length) return;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(ind);
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, this.material);
    mesh.position.set(c.cx * CS, c.cy * CS, c.cz * CS);
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    this.group.add(mesh);
    c.mesh = mesh;
  }

  computeLightOnly(c, kind) {
    this.fillRegion(c);
    this.flood(c, kind.sky === 'some');
    const { light } = this.region;
    c.light = new Uint8Array(CS * CS * CS);
    for (let y = 0; y < CS; y++)
      for (let z = 0; z < CS; z++)
        for (let x = 0; x < CS; x++) c.light[idx(x, y, z)] = light[(x + M) + (z + M) * S + (y + M) * S2];
  }

  // Solid rock whose six neighbours' touching layers are solid too: nothing of it can be seen.
  sealed(c) {
    const sides = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    for (const [dx, dy, dz] of sides) {
      const n = this.data(c.cx + dx, c.cy + dy, c.cz + dz).data;
      for (let a = 0; a < CS; a++)
        for (let b = 0; b < CS; b++) {
          const x = dx === 1 ? 0 : dx === -1 ? CS - 1 : a;
          const y = dy === 1 ? 0 : dy === -1 ? CS - 1 : dx ? a : b;
          const z = dz === 1 ? 0 : dz === -1 ? CS - 1 : b;
          if (!isOpaque[n[idx(x, y, z)]]) return false;
        }
    }
    return true;
  }

  drop(c) {
    if (!c.mesh) return;
    this.group.remove(c.mesh);
    c.mesh.geometry.dispose();
    c.mesh = null;
  }

  dispose() {
    for (const c of this.chunks.values()) this.drop(c);
    this.group.parent?.remove(this.group);
    this.material.dispose();
  }

  // ── ray cast (Amanatides & Woo): the first block that is not air, with the face it was entered through ──
  raycast(o, d, max = 6, hit = (id) => id !== B.AIR && id !== B.PORTAL) {
    let x = Math.floor(o.x), y = Math.floor(o.y), z = Math.floor(o.z);
    const sx = Math.sign(d.x), sy = Math.sign(d.y), sz = Math.sign(d.z);
    const tdx = Math.abs(1 / d.x), tdy = Math.abs(1 / d.y), tdz = Math.abs(1 / d.z);
    let tmx = sx > 0 ? (x + 1 - o.x) * tdx : sx < 0 ? (o.x - x) * tdx : Infinity;
    let tmy = sy > 0 ? (y + 1 - o.y) * tdy : sy < 0 ? (o.y - y) * tdy : Infinity;
    let tmz = sz > 0 ? (z + 1 - o.z) * tdz : sz < 0 ? (o.z - z) * tdz : Infinity;
    let n = [0, 0, 0], t = 0;
    while (t <= max) {
      const id = this.get(x, y, z);
      if (hit(id)) return { x, y, z, id, n, t };
      if (tmx < tmy && tmx < tmz) { x += sx; t = tmx; tmx += tdx; n = [-sx, 0, 0]; }
      else if (tmy < tmz) { y += sy; t = tmy; tmy += tdy; n = [0, -sy, 0]; }
      else { z += sz; t = tmz; tmz += tdz; n = [0, 0, -sz]; }
    }
    return null;
  }

  editsList() {
    const out = [];
    for (const [k, ed] of this.edits) {
      const [cx, cy, cz] = k.split(',').map(Number);
      for (const [i, id] of ed) {
        const x = i % CS, z = Math.floor(i / CS) % CS, y = Math.floor(i / (CS * CS));
        out.push([cx * CS + x, cy * CS + y, cz * CS + z, id]);
      }
    }
    return out;
  }

  loadEdits(list) {
    for (const [x, y, z, id] of list ?? []) {
      const cx = Math.floor(x / CS), cy = Math.floor(y / CS), cz = Math.floor(z / CS);
      const k = key(cx, cy, cz);
      let ed = this.edits.get(k);
      if (!ed) this.edits.set(k, (ed = new Map()));
      ed.set(idx(x - cx * CS, y - cy * CS, z - cz * CS), id);
    }
  }
}

// A torch: a stick and a flame, always bright.
function torch(pos, col, uv, ind, x, y, z, br) {
  const u = tileUV('white');
  box(x + 0.44, y, z + 0.44, x + 0.56, y + 0.6, z + 0.56, [0.42 * br, 0.28 * br, 0.16 * br]);
  box(x + 0.41, y + 0.6, z + 0.41, x + 0.59, y + 0.8, z + 0.59, [1, 0.78, 0.32]);
  function box(x0, y0, z0, x1, y1, z1, c) {
    const quads = [
      [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]],
      [[x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0]],
      [[x1, y0, z1], [x1, y1, z1], [x1, y1, z0], [x1, y0, z0]],
      [[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]],
      [[x0, y0, z1], [x0, y1, z1], [x1, y1, z1], [x1, y0, z1]],
      [[x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z0]]
    ];
    for (const q of quads) {
      const b = pos.length / 3;
      for (const p of q) {
        pos.push(...p);
        col.push(...c);
        uv.push(u[0], u[1]);
      }
      ind.push(b, b + 1, b + 2, b, b + 2, b + 3);
    }
  }
}
