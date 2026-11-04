// The scenery: the two stations, the rock fields and the wreck of the Meridian. Built from the hulls' own parts
// (lofts, plated metal, flat shading), but big and still, so every builder bolts its pieces into a `Kit` that merges
// them into one mesh per material: a station is about a dozen draw calls however many windows, girders and lamps it
// carries. A lamp is a glowing box with an additive halo, and all of a builder's halos are one Points cloud that
// blinks in its own shader: never a light (the game owns a fixed pool of eight). What moves hangs `tick(dt, t)` on
// its userData for the world to call: beacons, traffic, sparks, tumbling debris.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { loft, metal } from './ships.mjs';
import { mulberry } from './util.mjs';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const X = V(1, 0, 0), Y = V(0, 1, 0), Z = V(0, 0, 1);
const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
const randDir = (r) => { const z = r() * 2 - 1, a = r() * TAU, s = Math.sqrt(1 - z * z); return V(Math.cos(a) * s, z, Math.sin(a) * s); };

/** A transform from a place, an Euler turn and a scale. */
function mtx(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  return new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V(sx, sy, sz));
}
/** A frame standing on a surface: +y along the normal `n`, +x level (square to world up), turned `spin` about +y. */
function stand(p, n, spin = 0) {
  const y = n.clone().normalize();
  const x = Math.abs(y.y) > 0.98 ? X.clone() : new THREE.Vector3().crossVectors(Y, y).normalize();
  const z = new THREE.Vector3().crossVectors(x, y);
  return new THREE.Matrix4().makeBasis(x, y, z).setPosition(p).multiply(mtx(0, 0, 0, 0, spin));
}

// --- noise ----------------------------------------------------------------------------------------------------

function hash(x, y, z, s) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1274126177) ^ Math.imul(s, 1103515245);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, y, z, s) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const f = (t) => t * t * (3 - 2 * t);
  const u = f(x - xi), v = f(y - yi), w = f(z - zi);
  const L = (a, b, t) => a + (b - a) * t;
  const c = (i, j, k) => hash(xi + i, yi + j, zi + k, s);
  return L(L(L(c(0, 0, 0), c(1, 0, 0), u), L(c(0, 1, 0), c(1, 1, 0), u), v), L(L(c(0, 0, 1), c(1, 0, 1), u), L(c(0, 1, 1), c(1, 1, 1), u), v), w);
}
/** Fractal value noise, about 0..1 round 0.5. */
function fbm(x, y, z, s, oct = 4) {
  let a = 1, f = 1, sum = 0, n = 0;
  for (let i = 0; i < oct; i++) {
    sum += a * vnoise(x * f, y * f, z * f, s + i * 31);
    n += a;
    a *= 0.5;
    f *= 2.07;
  }
  return sum / n;
}

// --- materials ------------------------------------------------------------------------------------------------

let _halo, _solar, _mats;
function haloTexture() {
  if (_halo) return _halo;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.12, 'rgba(255,255,255,0.85)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.22)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return (_halo = new THREE.CanvasTexture(c));
}
/** Solar cells: dark blue squares in a silver grid, tiled by the metre like the plating. */
function solarTexture() {
  if (_solar) return _solar;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#7d8796';
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++) {
      const grad = g.createLinearGradient(0, j * 32, 0, j * 32 + 32);
      grad.addColorStop(0, '#22345a');
      grad.addColorStop(1, '#101a30');
      g.fillStyle = grad;
      g.fillRect(i * 32 + 2, j * 32 + 2, 28, 28);
    }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return (_solar = t);
}
/** The shared materials, all painted per vertex so one material carries every colour of a structure. */
function MATS() {
  if (_mats) return _mats;
  const hull = metal('#ffffff', { rough: 0.55, metalness: 0.35 });
  hull.vertexColors = true;
  const wreck = metal('#ffffff', { rough: 0.85, metalness: 0.25 });
  wreck.vertexColors = true;
  wreck.side = THREE.DoubleSide; // a torn hull shows its inside
  return (_mats = {
    hull,
    wreck,
    bare: new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.62, metalness: 0.45, flatShading: true }),
    rock: new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.93, metalness: 0.04, flatShading: true }),
    glow: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
    cone: new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.045, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }),
    solar: new THREE.MeshStandardMaterial({ map: solarTexture(), roughness: 0.32, metalness: 0.7, emissive: '#04080f', flatShading: true, vertexColors: true })
  });
}
/** The world drops a sector's scenery on a jump and never disposes it, and a station is megabytes of merged buffers:
 *  each builder frees its previous build's own buffers, textures and materials (never the shared ones) as it makes
 *  the next. The previous build is already out of the scene by then (World.load clears before it builds). */
const built = {};
function rebuilt(kind, g) {
  const keep = new Set([...Object.values(MATS()), ...(_rockGeos ? [..._rockGeos.big, ..._rockGeos.small] : [])]);
  built[kind]?.traverse((o) => {
    if (o.isInstancedMesh) o.dispose();
    if (o.geometry && !keep.has(o.geometry)) o.geometry.dispose();
    if (o.material && !keep.has(o.material)) o.material.dispose();
    o.userData.ownTexture?.dispose();
  });
  return (built[kind] = g);
}
const TILES = { hull: 24, wreck: 9, bare: 5, solar: 8, rock: 10, glow: 1, cone: 1 };

/** Plating laid by the metre: each face takes its texture from the plane it most faces, so a 300 m ring and a 3 m
 *  hatch carry panels of the same size (a box's own UVs would stretch one tile over a whole face). */
function boxUV(geo, tile) {
  const p = geo.attributes.position, n = p.count, uv = new Float32Array(n * 2);
  const a = V(), b = V(), c = V(), e1 = V(), e2 = V();
  for (let i = 0; i < n; i += 3) {
    a.fromBufferAttribute(p, i);
    b.fromBufferAttribute(p, i + 1);
    c.fromBufferAttribute(p, i + 2);
    e1.subVectors(b, a).cross(e2.subVectors(c, a));
    const ax = Math.abs(e1.x), ay = Math.abs(e1.y), az = Math.abs(e1.z);
    for (let k = 0; k < 3; k++) {
      const v = k === 0 ? a : k === 1 ? b : c;
      const [u, w] = ax >= ay && ax >= az ? [v.z, v.y] : ay >= az ? [v.x, v.z] : [v.x, v.y];
      uv[(i + k) * 2] = u / tile;
      uv[(i + k) * 2 + 1] = w / tile;
    }
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

// --- the kit --------------------------------------------------------------------------------------------------

/** Parts bolted together under a stack of frames, painted per vertex, merged per material at the end. */
class Kit {
  constructor() {
    this.parts = {};
    this.frames = [new THREE.Matrix4()];
  }
  get frame() {
    return this.frames[this.frames.length - 1];
  }
  push(m) {
    this.frames.push(this.frame.clone().multiply(m.isMatrix4 ? m : mtx(...m)));
    return this;
  }
  pop() {
    this.frames.pop();
    return this;
  }
  /** A geometry under `key`, moved by `m` (a Matrix4 or mtx's arguments), painted `color` (null: it brings its own). */
  add(key, geo, m = null, color = '#ffffff') {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    geo.dispose();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && !(k === 'color' && color === null)) g.deleteAttribute(k);
    const M = this.frame.clone();
    if (m) M.multiply(m.isMatrix4 ? m : mtx(...m));
    g.applyMatrix4(M);
    if (color !== null) {
      const c = new THREE.Color(color), n = g.attributes.position.count, a = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) c.toArray(a, i * 3);
      g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    }
    (this.parts[key] ??= []).push(g);
    return this;
  }
  box(key, w, h, d, m, color) {
    return this.add(key, new THREE.BoxGeometry(w, h, d), m, color);
  }
  cyl(key, rt, rb, h, seg, m, color, open = false) {
    return this.add(key, new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), m, color);
  }
  lathe(key, pts, seg, m, color) {
    return this.add(key, new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg), m, color);
  }
  /** A square-section girder from `a` to `b`. */
  beam(key, a, b, w, color, h = w) {
    const d = V().subVectors(b, a), L = d.length();
    if (L < 1e-3) return this;
    const m = new THREE.Matrix4().compose(V().addVectors(a, b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(Z, d.normalize()), V(1, 1, 1));
    return this.add(key, new THREE.BoxGeometry(w, h, L), m, color);
  }
  /** A lattice mast from `a` to `b`, `w` square: four legs, a ring of rails every bay, one diagonal per face per bay. */
  lattice(key, a, b, w, { step = w * 1.3, color = '#555', t = Math.max(0.25, w * 0.07) } = {}) {
    const d = V().subVectors(b, a), L = d.length();
    this.push(new THREE.Matrix4().compose(a, new THREE.Quaternion().setFromUnitVectors(Y, d.normalize()), V(1, 1, 1)));
    const h = w / 2, cs = [[h, h], [-h, h], [-h, -h], [h, -h]];
    const n = Math.max(1, Math.round(L / step)), s = L / n;
    for (const [x, z] of cs) this.beam(key, V(x, 0, z), V(x, L, z), t * 1.5, color);
    for (let i = 0; i <= n; i++)
      for (let k = 0; k < 4; k++) {
        const [x1, z1] = cs[k], [x2, z2] = cs[(k + 1) % 4];
        this.beam(key, V(x1, i * s, z1), V(x2, i * s, z2), t, color);
        if (i < n) {
          const f = (i + k) % 2;
          this.beam(key, V(x1, (i + f) * s, z1), V(x2, (i + 1 - f) * s, z2), t * 0.8, color);
        }
      }
    return this.pop();
  }
  /** A cone of lamp light from `a` (radius r0) to `b` (radius r1): additive, faint, depth-blind. */
  cone(a, b, r0, r1, color) {
    const d = V().subVectors(b, a), L = d.length();
    const m = new THREE.Matrix4().compose(V().addVectors(a, b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(Y, d.normalize().negate()), V(1, 1, 1));
    return this.add('cone', new THREE.CylinderGeometry(r0, r1, L, 14, 1, true), m, color);
  }
  /** A lamp: a dark housing, a lit face, a halo in `H` (the halo's place goes through the current frame too). */
  lamp(H, p, color, size, blink, { housing = 0.7, dark = '#25262b' } = {}) {
    if (housing) this.box('bare', housing * 1.4, housing, housing * 1.4, [p.x, p.y - housing * 0.4, p.z], dark);
    if (housing) this.box('glow', housing * 0.9, housing * 0.5, housing * 0.9, [p.x, p.y + housing * 0.1, p.z], color);
    H.add(p.clone().applyMatrix4(this.frame), color, size, blink);
    return this;
  }
  /** One merged geometry per material, faces flat, plating laid by the metre. */
  geos(tiles = TILES) {
    const out = {};
    for (const [key, list] of Object.entries(this.parts)) {
      const geo = mergeGeometries(list);
      for (const g of list) g.dispose();
      geo.computeVertexNormals();
      boxUV(geo, tiles[key] ?? 10);
      geo.computeBoundingSphere();
      out[key] = geo;
    }
    this.parts = {};
    return out;
  }
  build(tiles = TILES) {
    const g = new THREE.Group();
    for (const [key, geo] of Object.entries(this.geos(tiles))) {
      const m = new THREE.Mesh(geo, MATS()[key]);
      m.name = key;
      g.add(m);
    }
    return g;
  }
}

/** The halos of a structure's lamps, one Points cloud. `blink` is [period s, phase 0..1, duty 0..1]: period 0 burns
 *  steady, a negative one flickers at −period rad/s. The blinking runs in the vertex shader, off `time`. */
const BLINK = `attribute float psize;
attribute vec3 blink;
uniform float uTime;
float blinkOf(vec3 b) {
  if (b.x > 0.0) return step(fract(uTime / b.x + b.y), b.z);
  if (b.x < 0.0) return 0.62 + 0.38 * sin(uTime * -b.x + b.y * 6.283) * sin(uTime * -b.x * 1.73 + b.y * 3.1);
  return 1.0;
}
`;
class Halos {
  constructor() {
    this.pos = [];
    this.col = [];
    this.size = [];
    this.blink = [];
  }
  add(p, color, size, blink = [0, 0, 1]) {
    const c = new THREE.Color(color);
    this.pos.push(p.x, p.y, p.z);
    this.col.push(c.r, c.g, c.b);
    this.size.push(size);
    this.blink.push(...blink);
    return this;
  }
  build() {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    geo.setAttribute('psize', new THREE.Float32BufferAttribute(this.size, 1));
    geo.setAttribute('blink', new THREE.Float32BufferAttribute(this.blink, 3));
    const time = { value: 0 };
    const m = new THREE.PointsMaterial({ map: haloTexture(), vertexColors: true, size: 1, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = time;
      sh.vertexShader = BLINK + sh.vertexShader.replace('gl_PointSize = size;', 'gl_PointSize = size * psize * blinkOf( blink );');
    };
    m.customProgramCacheKey = () => 'halos';
    const pts = new THREE.Points(geo, m);
    pts.userData.time = time;
    return pts;
  }
}

/** A sign: glowing letters on a transparent plane, `w` metres wide, facing +z. */
function sign(text, color, w, h, { font = 'bold 150px "Arial Narrow", Arial, sans-serif', lit = true } = {}) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = Math.round((1024 * h) / w);
  const g = c.getContext('2d');
  g.font = font;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = color;
  if (lit) {
    g.shadowColor = color;
    g.shadowBlur = 24;
  }
  g.fillText(text, 512, c.height / 2 + 6);
  if (lit) g.fillText(text, 512, c.height / 2 + 6);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = lit
    ? new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending })
    : new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.85, metalness: 0.1, depthWrite: false });
  return { tex, mat, geo: new THREE.PlaneGeometry(w, h), canvas: c };
}

/** A dish: a shallow bowl (and its inside, a mirrored copy) of radius `R` opening along +y from the frame's origin. */
function dish(K, key, R, color, open = 0.75) {
  const cap = () => new THREE.SphereGeometry(R, 18, 4, 0, TAU, 0, open);
  K.add(key, cap(), [0, R, 0, Math.PI, 0, 0], color);
  K.add(key, cap(), [0, R + 0.15, 0, Math.PI, 0, 0, -1, 1, 1], color);
  K.beam('bare', V(0, 0.2, 0), V(0, R * 0.62, 0), R * 0.05, '#2a2d33');
  K.box('bare', R * 0.14, R * 0.14, R * 0.14, [0, R * 0.65, 0], '#3a3f48');
}

// --- traffic --------------------------------------------------------------------------------------------------

/** Little ships on slow orbits round a structure: instanced, one draw call for their bodies, one for their lights. */
function traffic(g, orbits, { paint, stripe, engine, tug = false }) {
  const K = new Kit();
  if (tug) {
    K.box('hull', 5, 3.4, 8, [0, 0, 0], paint);
    K.box('hull', 3.4, 2.4, 3, [0, 2.4, -2], stripe);
    K.box('bare', 7, 1, 2, [0, -1, 2.5], '#2a2420');
    K.box('bare', 1, 1, 4, [0, -1.6, -4.5], '#2a2420'); // the grab arms
    K.box('glow', 2.4, 0.6, 0.2, [0, 2.8, -3.55], '#ffd0a0');
    for (const s of [-1, 1]) K.box('glow', 1.4, 1.4, 0.2, [s * 1.6, 0, 4.05], engine);
  } else {
    K.add('hull', loft([{ z: -5.5, w: 1.6, h: 1.2, y: -0.3 }, { z: -3.4, w: 3.8, h: 2.6 }, { z: 3.6, w: 4.2, h: 2.9 }, { z: 5, w: 3.4, h: 2.2 }]).geometry, null, paint);
    K.box('hull', 10, 0.35, 2.6, [0, -0.7, 2.4], paint);
    K.box('hull', 4.3, 0.6, 1.4, [0, 0.1, -0.5], stripe);
    K.box('bare', 0.3, 1.6, 2.2, [0, 1.9, 3.8], stripe);
    K.box('glow', 2.6, 0.5, 0.2, [0, 0.6, -3.65, -0.5], '#bfe0ff');
    K.box('glow', 2.6, 1.4, 0.15, [0, 0, 5.05], engine);
    for (const s of [-1, 1]) K.box('glow', 0.4, 0.3, 0.4, [s * 5, -0.7, 2.4], s > 0 ? '#39d27a' : '#ff5540');
  }
  const geos = K.geos({ hull: 3, bare: 2, glow: 1 });
  const n = orbits.length, M = MATS();
  const meshes = Object.entries(geos).map(([k, geo]) => new THREE.InstancedMesh(geo, M[k], n));
  const H = new Halos();
  for (let i = 0; i < n; i++) H.add(V(), engine, tug ? 6 : 7, [-9, i / n, 1]);
  const pts = H.build();
  pts.geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
  for (const o of [...meshes, pts]) (o.frustumCulled = false), g.add(o);
  const m = new THREE.Matrix4(), p = V(), q = V(), e = V();
  const at = (o, t, out) => {
    const a = o.ph + o.w * t;
    return out.set(Math.cos(a) * o.r, 0, Math.sin(a) * o.r).applyAxisAngle(X, o.tilt).applyAxisAngle(Y, o.yaw).add(o.c);
  };
  return (t) => {
    orbits.forEach((o, i) => {
      at(o, t, p);
      at(o, t + 0.4, q);
      m.lookAt(p, q, Y).setPosition(p);
      for (const mesh of meshes) mesh.setMatrixAt(i, m);
      e.set(0, 0, tug ? 4.6 : 5.8).applyMatrix4(m);
      pts.geometry.attributes.position.setXYZ(i, e.x, e.y, e.z);
    });
    for (const mesh of meshes) mesh.instanceMatrix.needsUpdate = true;
    pts.geometry.attributes.position.needsUpdate = true;
    pts.userData.time.value = t;
  };
}

// --- rocks ----------------------------------------------------------------------------------------------------

/** A rock's radius in each direction: value noise, craters with raised rims, flat fracture faces where random planes
 *  cut it (what makes it read as broken stone rather than a blob), and optionally a cave mouth bored in along `mouth.d`.
 *  Returns [radius, tag]: 0 rough, 1 crater floor, 2 fracture face, 3 cave. */
function rockShape(seed, { cuts = 5, cutDepth = [0.72, 0.92], craters = 4, amp = 0.16, freq = 1.6, mouth = null, top = null } = {}) {
  const r = mulberry(seed);
  const planes = Array.from({ length: cuts }, () => ({ n: randDir(r), o: cutDepth[0] + r() * (cutDepth[1] - cutDepth[0]) }));
  if (top) planes.push({ n: Y.clone(), o: top });
  const pits = Array.from({ length: craters }, () => ({ d: randDir(r), s: 0.16 + r() * 0.3, k: 0.04 + r() * 0.08 }));
  const o = r() * 50;
  return (d) => {
    let rad = 1 + amp * (fbm(d.x * freq + o, d.y * freq + o, d.z * freq + o, seed) - 0.5) * 4;
    let tag = 0;
    for (const p of pits) {
      const a = Math.acos(clamp(d.dot(p.d), -1, 1)) / p.s;
      if (a < 1) {
        rad += p.k * (a * a - 1 + 0.5 * a ** 6);
        if (a < 0.8) tag = 1;
      } else if (a < 1.6) rad += p.k * 0.5 * (1 - (a - 1) / 0.6) ** 2;
    }
    for (const p of planes) {
      const c = d.dot(p.n);
      if (c > 0.02 && p.o / c < rad) (rad = p.o / c), (tag = 2);
    }
    if (mouth) {
      const k = smooth(1, 0.72, Math.acos(clamp(d.dot(mouth.d), -1, 1)) / mouth.a);
      if (k > 0 && mouth.floor < rad) {
        rad += (mouth.floor - rad) * k;
        if (k > 0.25) tag = 3;
      }
    }
    return [rad, tag];
  };
}

/** A displaced icosphere, faceted, each face painted one tone by `shade(color, centre, tag, faceIndex)`. */
function rockGeometry(shape, detail, stretch = [1, 1, 1], shade) {
  const geo = new THREE.IcosahedronGeometry(1, detail);
  const p = geo.attributes.position, n = p.count, tags = new Uint8Array(n), d = V();
  for (let i = 0; i < n; i++) {
    d.fromBufferAttribute(p, i).normalize();
    const [rad, t] = shape(d);
    p.setXYZ(i, d.x * rad * stretch[0], d.y * rad * stretch[1], d.z * rad * stretch[2]);
    tags[i] = t;
  }
  const col = new Float32Array(n * 3), c = new THREE.Color(), m = V();
  for (let i = 0; i < n; i += 3) {
    m.set(0, 0, 0);
    for (let k = 0; k < 3; k++) m.add(d.fromBufferAttribute(p, i + k));
    m.multiplyScalar(1 / 3);
    const t = tags[i] === tags[i + 1] || tags[i] === tags[i + 2] ? tags[i] : tags[i + 1];
    shade(c, m, t, i / 3);
    for (let k = 0; k < 3; k++) c.toArray(col, (i + k) * 3);
  }
  geo.deleteAttribute('normal');
  geo.deleteAttribute('uv');
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  return geo;
}
/** The field's stone: near-white tones (the instance colour brings the hue), dark crater floors, pale fracture faces. */
const stoneShade = (seed) => (c, m, t, f) => {
  let v = 0.86 + (fbm(m.x * 2.3, m.y * 2.3, m.z * 2.3, seed) - 0.5) * 0.9 + (hash(f, seed, 7, 3) - 0.5) * 0.12;
  if (t === 1) v *= 0.66;
  if (t === 2) v *= 1.14;
  c.setRGB(v, v * (t === 2 ? 1.0 : 0.97), v * (t === 2 ? 1.02 : 0.93));
};

const ROCKS = [
  { seed: 11, cuts: 6, craters: 3, amp: 0.12, stretch: [1, 0.9, 1] }, // a blocky boulder
  { seed: 23, cuts: 3, craters: 5, amp: 0.15, stretch: [1.5, 0.8, 0.9] }, // a potato
  { seed: 37, cuts: 8, cutDepth: [0.55, 0.8], craters: 1, amp: 0.08, stretch: [1.3, 1, 0.7] }, // a shard
  { seed: 41, cuts: 2, craters: 2, amp: 0.3, freq: 2.4, stretch: [1, 1, 1] }, // a lumpy one
  { seed: 53, cuts: 5, craters: 3, amp: 0.12, stretch: [1.2, 0.55, 1.1] }, // a slab
  { seed: 67, cuts: 2, craters: 9, amp: 0.1, stretch: [1, 0.95, 1] }, // an old cratered moonlet
  { seed: 79, cuts: 4, craters: 3, amp: 0.34, freq: 1.1, stretch: [1.4, 0.9, 0.9] } // a contact binary
];
const PEBBLES = [
  { seed: 5, cuts: 5, craters: 0, amp: 0.15, stretch: [1.2, 0.8, 1] },
  { seed: 9, cuts: 6, cutDepth: [0.5, 0.8], craters: 0, amp: 0.1, stretch: [1.4, 1, 0.7] }
];
const PALETTES = {
  haven: ['#8a8c90', '#7a766f', '#93887a', '#6f737a'],
  drift: ['#7e6e58', '#8a7a60', '#6a6458', '#94805f', '#5f5a50'],
  cinder: ['#5a443a', '#4a3e3a', '#6a4a3a', '#3e3836', '#704a36']
};
let _rockGeos;
function rockGeos() {
  if (_rockGeos) return _rockGeos;
  const big = ROCKS.map((o) => rockGeometry(rockShape(o.seed, o), 3, o.stretch, stoneShade(o.seed)));
  const small = PEBBLES.map((o) => rockGeometry(rockShape(o.seed, o), 0, o.stretch, stoneShade(o.seed)));
  return (_rockGeos = { big, small });
}

/** A field of `count` rocks, 6–66 m, in a thick disc (radius 500–2700 m, y ±250), none inside any `avoid` sphere
 *  ({pos, r}: pushed out of it), with pebbles and gravel round them for depth. Seven rock shapes, each instanced once;
 *  every rock its own turn, size and tint from the sector's palette. `userData.rocks` is [{pos, r}] for the game. */
export function asteroidField(rnd, count, { avoid = [], kind = 'haven' } = {}) {
  const g = new THREE.Group();
  const { big, small } = rockGeos();
  const pal = PALETTES[kind] ?? PALETTES.haven;
  const M = MATS();
  const rocks = [];
  const lists = big.map(() => []);
  const tint = (k) => new THREE.Color(pal[Math.floor(rnd() * pal.length)]).multiplyScalar(0.8 + rnd() * 0.35 * k);
  const push = (p) => {
    for (const a of avoid) {
      const d = p.distanceTo(a.pos);
      if (d < a.r) p.sub(a.pos).normalize().multiplyScalar(a.r + rnd() * 160).add(a.pos);
    }
    return p;
  };
  for (let i = 0; i < count; i++) {
    const a = rnd() * TAU, r = 500 + rnd() * 2200;
    const p = push(V(Math.cos(a) * r, (rnd() - 0.5) * 500, Math.sin(a) * r));
    const size = 6 + rnd() * rnd() * 60;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd() * 6, rnd() * 6, rnd() * 6));
    lists[Math.floor(rnd() * big.length)].push({ m: new THREE.Matrix4().compose(p, q, V(size, size, size)), c: tint(1) });
    rocks.push({ pos: p.clone(), r: size });
  }
  const instanced = (geo, list) => {
    if (!list.length) return;
    const mesh = new THREE.InstancedMesh(geo, M.rock, list.length);
    list.forEach((it, i) => (mesh.setMatrixAt(i, it.m), mesh.setColorAt(i, it.c)));
    mesh.computeBoundingSphere();
    g.add(mesh);
  };
  big.forEach((geo, k) => instanced(geo, lists[k]));
  // Gravel: most of it hangs round the big rocks (they shed it), the rest loose in the disc.
  const bits = small.map(() => []);
  const nBits = Math.min(1400, count * 6);
  for (let i = 0; i < nBits && rocks.length; i++) {
    let p, size;
    if (rnd() < 0.75) {
      const host = rocks[Math.floor(rnd() * rocks.length)];
      p = randDir(rnd).multiplyScalar(host.r * (1.4 + rnd() * 2.6)).add(host.pos);
      size = 0.5 + rnd() * rnd() * host.r * 0.14;
    } else {
      const a = rnd() * TAU, r = 450 + rnd() * 2300;
      p = V(Math.cos(a) * r, (rnd() - 0.5) * 520, Math.sin(a) * r);
      size = 0.6 + rnd() * rnd() * 4;
    }
    if (avoid.some((a) => p.distanceTo(a.pos) < a.r * 0.8)) continue;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd() * 6, rnd() * 6, rnd() * 6));
    bits[Math.floor(rnd() * small.length)].push({ m: new THREE.Matrix4().compose(p, q, V(size, size * (0.6 + rnd() * 0.5), size)), c: tint(0.8) });
  }
  small.forEach((geo, k) => instanced(geo, bits[k]));
  g.userData.rocks = rocks;
  return rebuilt('field', g);
}

// --- the stations ---------------------------------------------------------------------------------------------

/** A station: Haven (Concord) or Rook's Hollow (the Rooks), by `faction`. The Kestrel parks at `userData.dock`,
 *  (0, 130, 0), turned broadside along x; nothing is built in the box round her (x ±60, y 115..150, z ±20) or where
 *  the concourse goes (interiors.mjs: a hall at (0, 133, −42) and its strut down to the docking head at y 101). */
export function station({ faction = 'concord', seed = 1 } = {}) {
  const g = faction === 'rooks' ? hollow(seed) : haven(seed);
  g.userData.dock = new THREE.Vector3(0, 130, 0);
  g.userData.dockRadius = 110;
  g.userData.light = faction === 'rooks' ? '#ff8c42' : '#9fd4ff';
  return rebuilt('station', g);
}

/** The berth both stations share: a docking head under the parked ship (the concourse's strut lands on it), yokes
 *  either side, and four clamp pylons standing round her with floodlights on top. `lattice` builds it Rook-fashion. */
function berth(K, H, { hull, trim, deck, edge, lamp, lattice = false }) {
  K.box('hull', 28, 7, 56, [0, 97.5, -12], deck); // the head: top at y 101, z −40..16
  if (lattice) {
    for (const z of [-26, 26]) K.lattice('bare', V(-42, 97, z), V(42, 97, z), 5, { color: trim });
    K.lattice('bare', V(-36, 111, 26), V(36, 111, 26), 3, { color: trim });
    for (const s of [-1, 1]) K.lattice('bare', V(s * 36, 111, -26), V(s * 7, 111, -26), 3, { color: trim }); // parted round the concourse strut
    for (const x of [-13.6, 13.6]) for (let k = 0; k < 14; k++) K.box('bare', 0.4, 0.25, 2, [x, 101.15, -39 + k * 4], k % 2 ? '#1a1a1a' : '#d0a020'); // hazard edges
  } else {
    for (const z of [-26, 26]) K.box('hull', 84, 5, 6, [0, 97.5, z], trim);
    for (const z of [16.15, -40.15]) K.box('glow', 28, 0.4, 0.3, [0, 100.6, z], edge);
    for (const x of [14.15, -14.15]) K.box('glow', 0.3, 0.4, 56, [x, 100.6, -12], edge);
    for (const x of [-6, 6]) K.box('glow', 0.5, 0.06, 40, [x, 101.03, -12], '#2c4462');
  }
  for (const x of [-36, 36])
    for (const z of [-26, 26]) {
      const s = Math.sign(z);
      if (lattice) K.lattice('bare', V(x, 30, z), V(x, 149, z), 5, { color: trim, step: 6 });
      else {
        K.box('hull', 5, 50, 5, [x, 123, z], hull);
        K.box('bare', 7, 2, 7, [x, 149, z], trim);
        for (const y of [108, 118]) K.box('glow', 5.2, 0.4, 5.2, [x, y, z], edge);
      }
      K.box('hull', 3, 3, 5, [x, 131, z - s * 3.2], trim); // the clamp, its pad stopping short of her (z ±20)
      K.box('bare', 3.4, 4, 0.6, [x, 131, z - s * 5.6], '#2a2c30');
      K.lamp(H, V(x, 131, z - s * 5.95), '#ffb347', 4, [1.6, (x > 0 ? 0.5 : 0) + (z > 0 ? 0.25 : 0), 0.5], { housing: 0 });
      K.lamp(H, V(x, 151, z), lamp, 12, [0, 0, 1]);
    }
  // Guide lights along the yokes, running in toward her.
  for (const z of [-26, 26]) for (let x = -40; x <= 40; x += 8) if (Math.abs(x) > 4) H.add(V(x, 100.8, z).applyMatrix4(K.frame), edge, 3.5, [2.2, -Math.abs(x) / 100, 0.2]);
}

/** Haven: a clean Concord station. A stepped hub on a long spire, a habitat ring on four spokes and eight cables (the
 *  ring is the spinner), solar wings, radiators, a dish and masts, the docking tower and berth on top. Blue-white
 *  windows, navy bands, white strobes; four shuttles circling. */
function haven(seed) {
  const g = new THREE.Group(), r = mulberry(seed * 31 + 7);
  const K = new Kit(), RK = new Kit(), H = new Halos();
  const c = { hull: '#c8cdd5', panel: '#a7aeb9', trim: '#646d7a', dark: '#2b3038', navy: '#2d4b7d', glass: '#132033', white: '#dfe3e8' };
  const win = () => (r() < 0.2 ? '#ffd9a0' : r() < 0.1 ? '#36485e' : '#cfe8ff');
  // around(radius, angle, y): a part on a circle, its x along the tangent and its z pointing out.
  const around = (rad, a, y, rx = 0) => [Math.cos(a) * rad, y, Math.sin(a) * rad, rx, -a + Math.PI / 2, 0];
  // The hub, top to bottom one lathe in bands: antenna spire, lower hull, the belt, a navy collar, the command deck.
  K.lathe('bare', [[0.01, -188], [1.2, -186], [1.6, -152], [3, -150]], 8, null, c.trim);
  K.lathe('hull', [[3, -150], [9, -147], [9, -133], [14, -129], [16, -97], [22, -93], [24, -61], [34, -55], [36, -35], [46, -29], [48, -15]], 24, null, c.hull);
  K.lathe('hull', [[48, -15], [50.5, -12.5], [50.5, 12.5], [48, 15]], 24, null, c.panel);
  K.lathe('hull', [[48, 15], [46, 27], [36, 30]], 24, null, c.navy);
  K.lathe('hull', [[36, 30], [34, 44], [30, 48]], 24, null, c.hull);
  K.lathe('hull', [[30, 48], [27, 56], [20, 60], [14, 63], [0.01, 63]], 24, null, c.trim);
  for (const y of [-14.6, 14.6]) K.lathe('bare', [[y < 0 ? 48.6 : 50.9, y - 0.8], [y < 0 ? 50.9 : 48.6, y + 0.8]], 24, null, c.dark);
  // The belt: two rows of windows round six bays, each bay a dark mouth in an amber frame.
  const bays = [0, 1, 2, 3, 4, 5].map((i) => (i / 6) * TAU + TAU / 12);
  for (const y of [-6, 6])
    for (let i = 0; i < 84; i++) {
      const a = (i / 84) * TAU;
      if (r() < 0.1 || bays.some((b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < 0.12)) continue;
      K.box('glow', 2.4, 1.3, 0.3, around(50.55, a, y), win());
    }
  for (const a of bays) {
    K.box('bare', 9, 7, 1, around(50.4, a, 0), c.dark);
    for (const y of [-3.8, 3.8]) K.box('glow', 9.6, 0.35, 0.3, around(50.95, a, y), '#ffb347');
    H.add(V(Math.cos(a) * 52, 0, Math.sin(a) * 52), '#ffb347', 5, [0, 0, 1]);
  }
  // The command deck's glass band and its lit slits; window rings down the lower hull.
  K.lathe('bare', [[35.45, 34.5], [34.65, 40.5]], 24, null, c.glass);
  for (let i = 0; i < 48; i++) if (r() > 0.15) K.box('glow', 1.6, 3.4, 0.3, around(35.0, (i / 48) * TAU, 37.5), r() < 0.25 ? '#ffe2b8' : '#bfe0ff');
  for (let i = 0; i < 40; i++) if (r() > 0.25) K.box('glow', 1.6, 1, 0.3, around(35.15, (i / 40) * TAU, -44), win());
  for (let i = 0; i < 24; i++) if (r() > 0.3) K.box('glow', 1.4, 0.9, 0.3, around(22.95, (i / 24) * TAU, -78), win());
  // Radiators: three white fins on the spire, ribbed.
  for (const a of [Math.PI / 2, Math.PI / 2 + TAU / 3, Math.PI / 2 + (2 * TAU) / 3]) {
    K.box('bare', 0.8, 46, 32, around(40, a, -62), c.white);
    for (let k = 0; k < 8; k++) K.box('bare', 1.1, 0.5, 32, around(40, a, -82 + k * 6), c.trim);
  }
  // Solar wings on a truss boom along x, low on the spire: five pairs of panels a side.
  for (const s of [-1, 1]) {
    K.lattice('bare', V(s * 12, -116, 0), V(s * 206, -116, 0), 4, { color: c.trim, step: 6 });
    K.cyl('bare', 4, 4, 6, 12, [s * 22, -116, 0, 0, 0, Math.PI / 2], c.dark);
    for (let k = 0; k < 5; k++) {
      const x = s * (44 + k * 34);
      for (const z of [-1, 1]) {
        K.box('solar', 31, 0.5, 30, [x, -116, z * 19], '#ffffff');
        K.box('bare', 31.6, 0.9, 0.9, [x, -116, z * 34.2], c.trim);
        K.beam('bare', V(x, -116, z * 2), V(x, -116, z * 34), 0.7, c.trim);
      }
    }
  }
  // Masts on the command deck, a dish on a boom.
  [Math.PI / 6, (5 * Math.PI) / 6, (3 * Math.PI) / 2].forEach((a, i) => {
    K.cyl('bare', 0.35, 0.8, 24, 6, [Math.cos(a) * 22, 70, Math.sin(a) * 22], c.trim);
    K.lamp(H, V(Math.cos(a) * 22, 82.6, Math.sin(a) * 22), '#ff4a3a', 7, [2.6, i * 0.33, 0.4], { housing: 0.6 });
  });
  const da = (7 * Math.PI) / 6;
  K.beam('bare', V(Math.cos(da) * 26, 50, Math.sin(da) * 26), V(Math.cos(da) * 46, 58, Math.sin(da) * 46), 2, c.trim);
  K.push(new THREE.Matrix4().compose(V(Math.cos(da) * 47, 58, Math.sin(da) * 47), new THREE.Quaternion().setFromUnitVectors(Y, V(Math.cos(da), 1.1, Math.sin(da)).normalize()), V(1, 1, 1)));
  dish(K, 'hull', 12, c.white);
  K.pop();
  // The docking tower out of the top, chase lights climbing it, and the berth.
  K.add('hull', loft([{ z: 56, w: 24, h: 24 }, { z: 62, w: 15, h: 15 }, { z: 90, w: 15, h: 15 }, { z: 94.5, w: 20, h: 20 }]).geometry, [0, 0, 0, -Math.PI / 2], c.panel);
  for (let i = 0; i < 5; i++)
    for (const [x, z] of [[7.6, 0], [-7.6, 0], [0, 7.6], [0, -7.6]]) {
      K.box('glow', x ? 0.3 : 3, 0.5, z ? 0.3 : 3, [x, 66 + i * 5, z], '#9fd4ff');
      H.add(V(x * 1.05, 66 + i * 5, z * 1.05), '#9fd4ff', 4, [2.0, -i * 0.12, 0.2]);
    }
  for (const z of [-36, 12]) K.beam('bare', V(0, 86, z > 0 ? 7 : -7), V(0, 94.5, z), 2.2, c.trim);
  berth(K, H, { hull: c.panel, trim: c.trim, deck: c.panel, edge: '#7fc0ff', lamp: '#d8ecff' });
  // Navigation: red to port, green to starboard on the belt, white strobes round it and on the spire's tip.
  H.add(V(-52, 13, 0), '#ff4a3a', 7);
  H.add(V(52, 13, 0), '#39d27a', 7);
  for (let i = 0; i < 4; i++) H.add(V(Math.cos(i * 1.571 + 0.785) * 49, 16, Math.sin(i * 1.571 + 0.785) * 49), '#ffffff', 11, [1.7, i * 0.25, 0.06]);
  H.add(V(0, -189, 0), '#ffffff', 14, [2.2, 0.1, 0.05]);
  // The ring, which turns: a lathed box section, windows in and out, collars, navy bands, skylights, spokes, cables.
  RK.lathe('hull', [[138, -6], [141, -11], [159, -11], [162, -6], [162, 6], [159, 11], [141, 11], [138, 6], [138, -6]], 80, null, c.hull);
  for (const y of [-8.4, 7.2]) RK.lathe('hull', [[162.12, y], [162.12, y + 1.2]], 80, null, c.navy);
  const collars = Array.from({ length: 16 }, (_, k) => (k / 16) * TAU);
  const nearCollar = (a, rad) => collars.some((b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) * rad < 4);
  for (const [rad, y, n] of [[162.1, -3.2, 260], [162.1, 3.2, 260], [137.9, 0, 210]])
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      if (r() < 0.14 || nearCollar(a, rad)) continue;
      RK.box('glow', 2.2, 1.3, 0.3, around(rad, a, y), win());
    }
  collars.forEach((a, k) => {
    RK.box('bare', 5, 25, 28, around(150, a, 0), c.trim);
    for (const h of [0.3, 0.7]) RK.box('glow', 20, 0.3, 2.2, around(150, a + (h * TAU) / 16, 11.05), '#4d6f92');
    if (k % 4 === 0) {
      RK.add('hull', loft([{ z: 47, w: 13, h: 13 }, { z: 53, w: 8, h: 8 }, { z: 86, w: 8, h: 8 }, { z: 89, w: 13, h: 12 }, { z: 99, w: 13, h: 12 }, { z: 102, w: 8, h: 8 }, { z: 134, w: 8, h: 8 }, { z: 140, w: 13, h: 13 }]).geometry, [0, 0, 0, 0, Math.PI / 2 - a], c.panel);
      for (const s of [-1, 1]) RK.box('glow', 0.3, 1.2, 6, [Math.cos(a) * 94 - Math.sin(a) * s * 6.6, 0, Math.sin(a) * 94 + Math.cos(a) * s * 6.6, 0, Math.PI / 2 - a], '#cfe8ff');
    }
  });
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * TAU + TAU / 16;
    RK.beam('bare', V(Math.cos(a) * 12, 64, Math.sin(a) * 12), V(Math.cos(a) * 141, 10.5, Math.sin(a) * 141), 0.7, c.trim);
  }
  const ring = RK.build();
  g.add(K.build(), ring);
  const halos = H.build();
  g.add(halos);
  const fly = traffic(
    g,
    [
      { r: 250, w: 0.06, ph: 0, tilt: 0.25, yaw: 0.3, c: V(0, 20, 0) },
      { r: 290, w: -0.045, ph: 2, tilt: -0.15, yaw: 1.2, c: V(0, -30, 0) },
      { r: 240, w: 0.07, ph: 4, tilt: 0.45, yaw: 2.6, c: V(0, 60, 0) },
      { r: 320, w: 0.04, ph: 5, tilt: 0.1, yaw: 4.1, c: V(0, -60, 0) }
    ],
    { paint: '#dfe3e8', stripe: '#2d4b7d', engine: '#7fc8ff' }
  );
  g.userData.spinner = ring;
  g.userData.tick = (dt, t) => {
    halos.userData.time.value = t;
    fly(t);
  };
  return g;
}

/** Rook's Hollow: a pirate base dug into a big rock. A hangar bored into one face behind a lit door, under girders and
 *  a sign; habitat modules, tank farms, container stacks, gantry cranes and a turning radar bolted onto the stone;
 *  rows of windows cut into it; lamps everywhere, orange. The docking head sits on a lattice tower off the flat top,
 *  its clamps on scaffold pylons standing out of the rock. Three tugs circling. */
function hollow(seed) {
  const g = new THREE.Group(), r = mulberry(seed * 17 + 5);
  const K = new Kit(), H = new Halos();
  const C0 = V(0, -12, 0), R = 100, ST = [1.2, 0.78, 1.05];
  const MOUTH = V(-0.83, -0.04, 0.55).normalize(), M0 = 0.5;
  const shape = rockShape(seed * 13 + 5, { cuts: 7, cutDepth: [0.82, 0.96], craters: 10, amp: 0.15, freq: 1.3, mouth: { d: MOUTH, a: M0, floor: 0.4 }, top: 0.82 });
  const A = new THREE.Color('#8c7a62'), B = new THREE.Color('#6c6862'), IRON = new THREE.Color('#7a4632'), SOOT = new THREE.Color('#1e1a16'), CAVE = new THREE.Color('#2a231d');
  const rockGeo = rockGeometry(shape, 22, ST, (c, m, t, f) => {
    const d = m.clone().normalize();
    const v = 0.9 + (fbm(m.x * 4, m.y * 4, m.z * 4, 9) - 0.5) * 0.7 + (hash(f, 3, 7, 1) - 0.5) * 0.1;
    c.copy(A).lerp(B, smooth(0.4, 0.6, fbm(m.x * 1.3, m.y * 1.3, m.z * 1.3, 4))).multiplyScalar(t === 1 ? v * 0.7 : t === 2 ? v * 1.12 : v);
    c.lerp(IRON, smooth(0.58, 0.7, fbm(m.x * 2.2, m.y * 2.2, m.z * 2.2, 11)) * 0.7);
    if (t === 3) c.copy(CAVE).multiplyScalar(v);
    c.lerp(SOOT, smooth(M0 * 2, M0, d.angleTo(MOUTH)) * 0.55);
  });
  K.add('rock', rockGeo, [C0.x, C0.y, C0.z, 0, 0, 0, R], null);
  // The rock's surface where a direction from its centre meets it, and the normal there.
  const surf = (d) => {
    const [rad] = shape(d.clone().normalize());
    const u = d.clone().normalize().multiplyScalar(rad);
    return V(u.x * ST[0], u.y * ST[1], u.z * ST[2]).multiplyScalar(R).add(C0);
  };
  const surface = (d) => {
    d = d.clone().normalize();
    const t1 = new THREE.Vector3().crossVectors(d, Math.abs(d.y) > 0.9 ? X : Y).normalize(), t2 = new THREE.Vector3().crossVectors(d, t1);
    const e = 0.02;
    const n = new THREE.Vector3().crossVectors(surf(d.clone().addScaledVector(t1, e)).sub(surf(d.clone().addScaledVector(t1, -e))), surf(d.clone().addScaledVector(t2, e)).sub(surf(d.clone().addScaledVector(t2, -e)))).normalize();
    if (n.dot(d) < 0) n.negate();
    return { p: surf(d), n };
  };
  const rust = ['#6a3a2c', '#5a4a3c', '#7a5a3a', '#4a4440', '#6a2e26'];
  const pick = (a) => a[Math.floor(r() * a.length)];
  const ORANGE = '#ff8c42', AMBER = '#ffb347', WARM = '#ffd0a0';

  // The hangar, bored in along MOUTH: a door with light in its seam, hazard chevrons, lamps and guide lights.
  const floor = surf(MOUTH);
  K.push(stand(floor, MOUTH));
  K.box('bare', 66, 10, 44, [0, -3, 0], '#2a2420');
  for (const s of [-1, 1]) K.box('hull', 29.5, 1.4, 36, [s * 15.2, 2.6, 0], '#4e4a46');
  for (const s of [-1, 1]) for (let k = 0; k < 6; k++) K.box('bare', 0.6, 0.5, 36, [s * (4 + k * 4.6), 3.5, 0], '#2e2a26');
  K.box('glow', 1.0, 0.3, 36, [0, 2.9, 0], AMBER);
  K.box('hull', 64, 4, 4, [0, 3.8, -20], '#6a4a2a');
  for (let k = 0; k < 16; k++) K.box('bare', 3.9, 0.3, 3.4, [-30 + k * 4, 5.9, -20], k % 2 ? '#1a1a1a' : '#d0a020');
  for (const x of [-28, -10, 10, 28]) K.lamp(H, V(x, 6.6, -22.2), AMBER, 8, [0, 0, 1]);
  for (let k = 0; k < 9; k++) for (const x of [-26, 26]) K.lamp(H, V(x, 7 + k * 5, 8), ORANGE, 4, [2.4, -k * 0.09, 0.22], { housing: 0.7 });
  K.lattice('bare', V(-62, 46, -14), V(62, 46, -14), 4.5, { color: '#4a3a30' });
  K.lattice('bare', V(-60, 40, 20), V(60, 40, 20), 4, { color: '#4a3a30' });
  for (const x of [-36, 0, 36]) K.lamp(H, V(x, 43.5, -14), WARM, 9, [0, 0, 1]);
  for (const x of [-30, 30]) K.cone(V(x, 44, -14), V(x * 0.3, 3, 0), 1, 11, '#ffb070');
  H.add(V(0, 14, 0).applyMatrix4(K.frame), '#7a3a14', 80); // the hangar's light, filling the hollow
  const signM = K.frame.clone().multiply(mtx(0, 54, -58, -Math.PI / 2 + 0.25));
  K.beam('bare', V(-26, 46, -54), V(-26, 54, -58), 0.9, '#3a302a');
  K.beam('bare', V(26, 46, -54), V(26, 54, -58), 0.9, '#3a302a');
  K.pop();
  const s1 = sign("ROOK'S HOLLOW", '#ff9a50', 58, 9);
  const signMesh = new THREE.Mesh(s1.geo, s1.mat);
  signMesh.userData.ownTexture = s1.tex;
  signMesh.applyMatrix4(signM);
  g.add(signMesh);

  // Bolt-ons, scattered over the stone clear of the mouth, the top and the pylons.
  const keepOut = [[MOUTH, M0 + 0.18], [Y, 0.5]];
  for (const x of [-36, 36]) for (const z of [-26, 26]) keepOut.push([V(x, 50, z).sub(C0).normalize(), 0.16]);
  const spots = [];
  const find = (sep, lo = -0.55, hi = 0.85, toMouth = 4) => {
    for (let k = 0; k < 600; k++) {
      const d = randDir(r);
      if (d.y < lo || d.y > hi || d.angleTo(MOUTH) > toMouth) continue;
      if (keepOut.some(([o, a]) => d.angleTo(o) < a) || spots.some((s) => s.angleTo(d) < sep)) continue;
      spots.push(d);
      return surface(d);
    }
    return null;
  };
  const hab = () => {
    const L = 22 + r() * 18, w = 10 + r() * 4, h = w * 0.85, col = pick(rust), y0 = h / 2 + 2.2;
    K.box('bare', w * 0.8, 12, L * 0.75, [0, -4, 0], '#2a2522');
    if (r() < 0.6) K.lattice('bare', V(-w / 2 - 2, -3, L / 2 - 2), V(-w / 2 - 2, y0 + h / 2 + 4, L / 2 - 2), 2.2, { color: '#5a4430', t: 0.2 });
    K.add('hull', loft([{ z: -L / 2, w: w * 0.7, h: h * 0.7 }, { z: -L / 2 + 1.6, w, h }, { z: L / 2 - 1.6, w, h }, { z: L / 2, w: w * 0.7, h: h * 0.7 }]).geometry, [0, y0, 0], col);
    for (const z of [-L / 2 + 3.2, L / 2 - 3.2]) K.box('bare', w + 0.5, h * 0.75, 0.9, [0, y0, z], '#2a2522');
    for (const s of [-1, 1]) for (let z = -L / 2 + 5; z <= L / 2 - 5; z += 2.3) if (r() > 0.25) K.box('glow', 0.2, 0.8, 1.3, [s * (w / 2 + 0.05), y0 + 0.6, z], r() < 0.3 ? '#ffe2b8' : AMBER);
    K.box('bare', 3, 1.4, 4, [0, y0 + h / 2 + 0.5, L / 4], '#3a3430');
    K.cyl('bare', 0.2, 0.3, 7, 5, [w / 4, y0 + h / 2 + 3.5, -L / 4], '#3a3430');
    K.lamp(H, V(0, y0 + h / 2 + 1.2, -L / 2 + 1), ORANGE, 6, [0, 0, 1]);
    if (r() < 0.5) K.lamp(H, V(w / 4, y0 + h / 2 + 7.2, -L / 4), '#ff4a3a', 5, [2.4, r(), 0.35], { housing: 0.4 });
  };
  const tanks = () => {
    const col = pick(['#8a7a5a', '#7a5a3a', '#6a6a60']);
    K.box('bare', 18, 10, 18, [0, -3, 0], '#2a2522');
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * TAU, x = Math.cos(a) * 5, z = Math.sin(a) * 5, hgt = 14 + r() * 8;
      K.cyl('hull', 4, 4, hgt, 12, [x, hgt / 2 + 1, z], col);
      K.add('hull', new THREE.SphereGeometry(4, 12, 4, 0, TAU, 0, Math.PI / 2), [x, hgt + 1, z], col);
      for (const y of [3, hgt - 2]) K.cyl('bare', 4.2, 4.2, 0.8, 12, [x, y, z], '#2a2522');
      K.cyl('bare', 4.15, 4.15, 1.2, 12, [x, hgt * 0.55, z], '#c9a22a');
    }
    K.beam('bare', V(-5, 6, 0), V(5, 6, 0), 0.8, '#3a3430');
    K.lamp(H, V(0, 3, 0), ORANGE, 5, [0, 0, 1]);
  };
  const stack = () => {
    K.box('bare', 16, 10, 28, [0, -3.5, 0], '#2a2522');
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 2; j++) {
        const n = 1 + Math.floor(r() * 3);
        for (let k = 0; k < n; k++) {
          const x = -3.2 + i * 6.4, z = -6.5 + j * 13, y = 4.3 + k * 5.6;
          K.box('hull', 5.6, 5.4, 12.4, [x, y, z, 0, (r() - 0.5) * 0.08, 0], pick(['#7a2e22', '#8a5a1e', '#3d4a5a', '#5a5a30', '#2f4a3e', '#6a6a6a']));
          K.box('bare', 5.75, 0.3, 12.55, [x, y + 2.6, z], '#1e1e1e');
        }
      }
    K.lamp(H, V(8.5, 2.5, 0), WARM, 6, [0, 0, 1]);
  };
  const gantry = () => {
    const h = 30 + r() * 22;
    K.box('bare', 9, 4, 9, [0, -1, 0], '#2a2522');
    K.lattice('bare', V(0, 0, 0), V(0, h, 0), 5, { color: '#5a4430' });
    K.box('bare', 8, 1, 8, [0, h + 0.5, 0], '#3a3430');
    K.lattice('bare', V(0, h - 2.5, -5), V(0, h - 2.5, 24), 2.8, { color: '#c9a22a', t: 0.25 });
    K.lattice('bare', V(0, h - 2.5, 4), V(0, h - 2.5, -11), 2.8, { color: '#c9a22a', t: 0.25 });
    K.box('bare', 3.5, 3.5, 4, [0, h - 2.5, -12], '#3a3430');
    K.beam('bare', V(0, h - 4, 22), V(0, h - 18, 22), 0.15, '#111111');
    K.box('bare', 1.6, 1.6, 1.6, [0, h - 18.5, 22], '#c9a22a');
    K.lamp(H, V(0, h + 1.4, 0), '#ff4a3a', 7, [1.8, r(), 0.3], { housing: 0.6 });
    K.lamp(H, V(3.6, h - 4, 3.6), ORANGE, 7, [0, 0, 1]);
    K.cone(V(0, h - 4, 18), V(0, 0, 18), 0.8, 7, '#ffb070');
  };
  const windowsInRock = () => {
    const n = 5 + Math.floor(r() * 7), x0 = -((n - 1) * 3.8) / 2;
    K.box('bare', n * 3.8 + 2.4, 4, 3.6, [0, -1.2, 0], '#24201c');
    K.box('glow', n * 3.8 + 1.6, 0.4, 0.25, [0, 0.95, -1.55], '#c86a2a');
    for (let k = 0; k < n; k++) if (r() > 0.15) K.box('glow', 3, 0.5, 1.7, [x0 + k * 3.8, 0.85, 0.2], r() < 0.3 ? '#ffe2b8' : AMBER);
  };
  const lampOnly = () => {
    K.box('bare', 1.2, 4, 1.2, [0, 1, 0], '#3a3430');
    K.lamp(H, V(0, 3.6, 0), pick([ORANGE, AMBER, WARM]), 7, [0, 0, 1]);
  };
  const plan = [hab, hab, hab, hab, hab, hab, stack, stack, stack, gantry, gantry, windowsInRock, windowsInRock, windowsInRock, windowsInRock, windowsInRock, windowsInRock, hab, hab, hab, hab, tanks, tanks, tanks, tanks, stack, stack, gantry, gantry, windowsInRock, windowsInRock, windowsInRock, windowsInRock, windowsInRock, windowsInRock];
  plan.forEach((build, i) => {
    const s = find(build === windowsInRock ? 0.2 : 0.3, build === tanks ? -0.75 : -0.6, 0.85, i < 17 ? 1.45 : 4); // the first half crowd round the mouth
    if (!s) return;
    K.push(stand(s.p.clone().addScaledVector(s.n, build === windowsInRock ? -0.4 : -1.2), s.n, r() * TAU));
    build();
    K.pop();
  });
  for (let i = 0; i < 26; i++) {
    const s = find(0.12, -0.8, 0.95);
    if (!s) continue;
    K.push(stand(s.p.clone().addScaledVector(s.n, -0.5), s.n));
    lampOnly();
    K.pop();
  }
  // The radar: its own little group, turned by the tick.
  const rs = find(0.3, 0.2, 0.8);
  const radar = new THREE.Group();
  if (rs) {
    K.push(stand(rs.p.clone().addScaledVector(rs.n, -1), rs.n));
    K.box('bare', 8, 4, 8, [0, 0, 0], '#2a2522');
    K.cyl('bare', 1, 1.4, 14, 8, [0, 8, 0], '#4a3a30');
    radar.applyMatrix4(K.frame.clone().multiply(mtx(0, 15, 0)));
    K.pop();
    const RK = new Kit();
    RK.box('bare', 3, 2, 3, [0, 0, 0], '#3a3430');
    RK.push([0, 1, 0, 1.25, 0, 0]);
    dish(RK, 'hull', 7, '#8a8070');
    RK.pop();
    radar.add(RK.build());
    g.add(radar);
  }
  // The docking tower on the flat top, a lift shaft up its middle, and the berth on scaffold pylons.
  K.lattice('bare', V(0, 30, 0), V(0, 94, 0), 12, { color: '#4a3a30', step: 8, t: 0.9 });
  K.box('hull', 5, 60, 5, [0, 64, 0], '#5a4038');
  for (let y = 46; y < 94; y += 12) K.lamp(H, V(6.6, y, 6.6), ORANGE, 5, [0, 0, 1], { housing: 0.5 });
  for (const z of [-36, 12]) K.beam('bare', V(0, 86, z > 0 ? 6 : -6), V(0, 95, z), 2.2, '#4a3a30');
  berth(K, H, { hull: '#5a4038', trim: '#5a4430', deck: '#4a3a32', edge: AMBER, lamp: '#ffd8a8', lattice: true });
  g.add(K.build());
  const halos = H.build();
  g.add(halos);
  const fly = traffic(
    g,
    [
      { r: 200, w: 0.05, ph: 1, tilt: 0.2, yaw: 0.5, c: V(0, -10, 0) },
      { r: 230, w: -0.04, ph: 3, tilt: -0.3, yaw: 2.0, c: V(0, 10, 0) },
      { r: 260, w: 0.035, ph: 5, tilt: 0.1, yaw: 3.7, c: V(0, -40, 0) }
    ],
    { paint: '#b8902a', stripe: '#5a3a2a', engine: '#ff8a40', tug: true }
  );
  g.userData.tick = (dt, t) => {
    halos.userData.time.value = t;
    radar.rotation.y += dt * 0.6;
    s1.mat.opacity = t % 7 < 0.12 || (t % 7 > 0.3 && t % 7 < 0.38) ? 0.35 : 1; // a tube on the blink
    fly(t);
  };
  return g;
}

// --- the derelict ---------------------------------------------------------------------------------------------

/** Sections every `step` metres between the given ones: the same hull, more rings, so paint can vary along it. */
function refine(sections, step) {
  const out = [];
  for (let i = 0; i < sections.length - 1; i++) {
    const a = sections[i], b = sections[i + 1], n = Math.max(1, Math.round((b.z - a.z) / step));
    for (let k = 0; k < n; k++) {
      const t = k / n, L = (p, q) => (p ?? 0) + ((q ?? 0) - (p ?? 0)) * t;
      out.push({ z: L(a.z, b.z), w: L(a.w, b.w), h: L(a.h, b.h), y: L(a.y, b.y), x: L(a.x, b.x), c: a.c });
    }
  }
  out.push({ ...sections[sections.length - 1] });
  return out;
}
/** A loft's corners at a section (the same octagon `loft` draws), scaled by `k`. */
function octagon(s, k = 1) {
  const a = (s.w / 2) * k, b = (s.h / 2) * k, c = Math.min(a, b) * (s.c ?? 0.32), x = s.x ?? 0, y = s.y ?? 0;
  return [[a, b - c], [a - c, b], [-(a - c), b], [-a, b - c], [-a, -(b - c)], [-(a - c), -b], [a - c, -b], [a, -(b - c)]].map(([px, py]) => V(x + px, y + py, s.z));
}
/** A loft with one end left open and torn: the open ring's corners pulled back by up to `tear` metres and dented. */
function tornLoft(sections, open, r, tear = 4) {
  const geo = loft(sections).geometry;
  const sides = (sections.length - 1) * 16 * 3;
  const pos = geo.attributes.position.array;
  const keep = open === 'end' ? pos.slice(0, sides * 3 + 24 * 3) : [...pos.slice(0, sides * 3), ...pos.slice(sides * 3 + 24 * 3)];
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(keep, 3));
  const z0 = open === 'end' ? sections[sections.length - 1].z : sections[0].z, dir = open === 'end' ? -1 : 1;
  const moved = new Map(), p = out.attributes.position;
  for (let i = 0; i < p.count; i++) {
    if (Math.abs(p.getZ(i) - z0) > 1e-4) continue;
    const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)}`;
    if (!moved.has(key)) moved.set(key, [dir * r() * tear, 0.9 + r() * 0.12]);
    const [dz, k] = moved.get(key);
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, z0 + dz);
  }
  return out;
}
/** Paint a wreck's hull per vertex: survey cream, rust blooms, soot burnt back from the break and in streaks. */
function scorch(geo, breakZ, seed) {
  const PAINT = new THREE.Color('#c4bca8'), RUST = new THREE.Color('#6a4630'), SOOT = new THREE.Color('#141110');
  const p = geo.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color(), v = V();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const ang = Math.atan2(v.y, v.x);
    const burn = clamp(1 - Math.abs(v.z - breakZ) / 14) ** 1.2 + smooth(0.55, 0.7, fbm(v.z * 0.09, ang * 1.4, 2, seed)) * 0.75;
    c.copy(PAINT).lerp(RUST, smooth(0.5, 0.72, fbm(v.x * 0.15, v.y * 0.15, v.z * 0.15, seed + 5)) * 0.7).lerp(SOOT, clamp(burn));
    c.toArray(col, i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

/** The Meridian, a survey ship torn in two. The bow half and the stern half drift apart round a gap at the origin
 *  (the data core floats in it, at about (−2, 4, 4)); their torn ends are open, burnt black, ragged with peeled plates,
 *  ribs and stringers sticking out, decks showing, cables strung between the halves and trailing loose, embers glowing
 *  and sparks spitting. Her sensor dish is bent, her boom snapped; a red distress beacon still double-flashes on her
 *  back. Plates, girders and chunks tumble round her. */
export function derelict() {
  const g = new THREE.Group(), r = mulberry(114);
  const K = new Kit(), H = new Halos();
  const CORE = V(-2, 4, 4);
  const SOOT = '#1a1715', FRAME = '#35302b', EMBERS = ['#ff7a2a', '#ffb347', '#ff4a1a'];
  const FORE = refine([{ z: -54, w: 3, h: 2.6, y: -0.6 }, { z: -46, w: 10, h: 7.5, y: -0.2 }, { z: -36, w: 14.5, h: 10 }, { z: -14, w: 16, h: 11 }, { z: -2, w: 16, h: 11 }], 2.4);
  const AFT = refine([{ z: 9, w: 16, h: 11 }, { z: 31, w: 15.5, h: 10.5 }, { z: 41, w: 13, h: 9 }, { z: 46, w: 10, h: 7 }], 2.4);
  const foreM = mtx(0, 0, -2).multiply(mtx(0, 0, 0, 0.07, -0.1, 0.24)).multiply(mtx(0, 0, 2));
  const aftM = mtx(5, -4, 5).multiply(mtx(0, 0, 9)).multiply(mtx(0, 0, 0, -0.32, 0.38, -0.6)).multiply(mtx(0, 0, -9));
  const emitters = [];

  /** One half: the torn skin, a sooty inner skin and bulkhead, decks, ribs, stringers, peeled plates, embers. */
  const half = (S, open, breakZ, dir, seed) => {
    K.add('wreck', scorch(tornLoft(S, open, r, 4.5), breakZ, seed), null, null);
    const inner = S.filter((s) => (dir < 0 ? s.z >= breakZ - 13 && s.z <= breakZ - 1 : s.z <= breakZ + 13 && s.z >= breakZ + 1)).map((s) => ({ ...s, w: s.w * 0.9, h: s.h * 0.88 }));
    const ig = loft(inner).geometry, ip = ig.attributes.position;
    for (let i = 0; i < ip.count; i += 3) {
      const x = ip.getX(i + 1), y = ip.getY(i + 1), z = ip.getZ(i + 1);
      ip.setXYZ(i + 1, ip.getX(i + 2), ip.getY(i + 2), ip.getZ(i + 2));
      ip.setXYZ(i + 2, x, y, z);
    }
    K.add('bare', ig, null, SOOT);
    const sec = S[open === 'end' ? S.length - 1 : 0];
    for (const [y, w] of [[-2, 12.6], [2.2, 12]])
      for (let k = 0; k < 4; k++) {
        const len = 13 + r() * 3.5, x = -w / 2 + (k + 0.5) * (w / 4);
        K.box('bare', w / 4 - 0.1, 0.35, len, [x, y, breakZ + dir * (len / 2 - 1.5 - r() * 2.5), (r() - 0.5) * 0.06, 0, (r() - 0.5) * 0.08], k % 2 ? '#3a3632' : '#2c2926');
      }
    // Frames round the break, some missing, some bent out; stringers along the corners, torn off at odd lengths.
    for (const dz of [-1.5, 1.2]) {
      const C = octagon({ ...sec, z: breakZ + dir * dz }, 0.96);
      for (let k = 0; k < 8; k++) {
        if (r() < 0.25) continue;
        const a = C[k], b = C[(k + 1) % 8].clone();
        if (r() < 0.35) b.lerp(a, 0.2 + r() * 0.4).add(V(a.x, a.y, 0).normalize().multiplyScalar(1 + r() * 2.5)).add(V(0, 0, -dir * r() * 2));
        K.beam('bare', a, b, 0.55, FRAME);
        if (r() < 0.6) emitters.push(b.clone().applyMatrix4(K.frame)), K.lamp(H, b, EMBERS[Math.floor(r() * 3)], 3 + r() * 3.5, [-(3 + r() * 6), r(), 1], { housing: 0.35, dark: SOOT });
      }
    }
    const corners = octagon({ ...sec, z: 0 }, 0.95);
    corners.forEach((c0, k) => {
      if (r() < 0.3) return;
      const a = V(c0.x, c0.y, breakZ + dir * 7), b = V(c0.x * (1 + r() * 0.15), c0.y * (1 + r() * 0.15), breakZ - dir * (0.5 + r() * 5));
      K.beam('bare', a, b, 0.45, k % 2 ? FRAME : '#4a4038');
    });
    // Peeled plates: hull panels hinged on the torn edge, bent outward.
    for (let k = 0; k < 8; k++) {
      if (r() < 0.25) continue;
      const C = octagon({ ...sec, z: breakZ + dir * 2 });
      const a = C[k], b = C[(k + 1) % 8], t = V().subVectors(b, a).normalize(), n = V(-t.y, t.x, 0);
      if (n.dot(V().addVectors(a, b)) < 0) n.negate();
      const zz = V(0, 0, -dir), xx = new THREE.Vector3().crossVectors(n, zz);
      const base = new THREE.Matrix4().makeBasis(xx, n, zz).setPosition(a.clone().lerp(b, 0.25 + r() * 0.5));
      const len = 2.5 + r() * 4, wd = 1.5 + r() * 2.5, peel = 0.3 + r() * 1.0;
      K.box('wreck', wd, 0.18, len, base.clone().multiply(mtx(0, 0, 0, -peel, (r() - 0.5) * 0.5)).multiply(mtx(0, 0, len / 2)), r() < 0.5 ? '#2a2420' : '#8a8272');
    }
    // The rim smoulders: embers along the torn edge, a dull glow filling the wound.
    const rim = octagon({ ...sec, z: breakZ + dir * 1.2 }, 0.99);
    for (let k = 0; k < 8; k++) {
      if (r() < 0.3) continue;
      const e = rim[k].clone().lerp(rim[(k + 1) % 8], r());
      emitters.push(e.clone().applyMatrix4(K.frame));
      K.lamp(H, e, EMBERS[Math.floor(r() * 3)], 3 + r() * 4, [-(4 + r() * 6), r(), 1], { housing: 0.4, dark: SOOT });
    }
    H.add(V(0, 0, breakZ + dir * 2.5).applyMatrix4(K.frame), '#c2400f', 22, [-1.3, seed * 0.3, 1]);
    // A dim red emergency lamp still going deep inside.
    K.lamp(H, V(0, 0.2, breakZ + dir * 9), '#ff3a2a', 6, [3.2, seed * 0.1, 0.55], { housing: 0.4, dark: SOOT });
  };

  // The bow half.
  K.push(foreM);
  half(FORE, 'end', -2, -1, 1);
  const hw = (z) => 7.25 + ((z + 36) / 22) * 0.75; // her half-width between z −36 and −14
  const slope = Math.atan(0.75 / 22);
  for (const s of [-1, 1]) K.box('wreck', 0.12, 1.1, 22, [s * (hw(-25) + 0.06), 0.4, -25, 0, s * slope], '#a8562c'); // the survey stripe
  K.add('bare', new THREE.SphereGeometry(3.2, 12, 5, 0, TAU, 0, Math.PI / 2), [0, -5.2, -30, Math.PI], '#0e1a2a'); // sensor blister
  K.push(new THREE.Matrix4().compose(V(2.5, 5.4, -38), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.9, 0.5, 0.4)), V(1, 1, 1)));
  dish(K, 'wreck', 5, '#b8b09c');
  K.pop();
  K.cyl('bare', 0.6, 0.9, 2, 6, [2.5, 5.2, -38], FRAME);
  K.beam('bare', V(-3, 5.2, -42), V(-3, 7.5, -60), 0.5, FRAME); // the boom, snapped and hanging
  K.beam('bare', V(-3, 7.5, -60), V(-1, 3.5, -66), 0.45, FRAME);
  K.cyl('bare', 0.7, 0.7, 1.4, 8, [0, 5.9, -24], '#2a2c30');
  K.box('glow', 0.5, 0.5, 0.5, [0, 6.8, -24], '#ff2a1a');
  H.add(V(0, 7, -24).applyMatrix4(K.frame), '#ff2a1a', 16, [2.4, 0, 0.1]); // the distress beacon, double-flashing
  H.add(V(0, 7, -24).applyMatrix4(K.frame), '#ff2a1a', 16, [2.4, 0.83, 0.1]);
  const nameM = K.frame.clone();
  K.pop();

  // The stern half: dead drives, one torn off, a radiator snapped, a lab pod on her back.
  K.push(aftM);
  half(AFT, 'start', 9, 1, 2);
  for (const [x, y, gone] of [[-3.6, -0.8, false], [3.6, -0.8, true], [0, 2.4, false]]) {
    if (gone) {
      K.cyl('bare', 1.4, 1.6, 1.2, 10, [x, y, 46.6, Math.PI / 2], SOOT);
      continue;
    }
    K.cyl('bare', 2.2, 3, 4, 12, [x, y, 48, Math.PI / 2], '#2a2826');
    K.cyl('bare', 1.6, 1.6, 0.2, 12, [x, y, 50.05, Math.PI / 2], '#120f0e');
  }
  for (const s of [-1, 1]) {
    const len = s > 0 ? 14 : 6;
    K.box('wreck', len, 0.4, 9, [s * (7.6 + len / 2), 1, 30, 0, 0, s > 0 ? 0.05 : -0.5], '#9a9484');
  }
  K.box('wreck', 8, 3.4, 13, [0, 6.6, 27], '#b0a894');
  K.box('bare', 8.2, 0.4, 13.2, [0, 8.4, 27], FRAME);
  K.box('bare', 0.1, 2.4, 4, [-7.75, -1, 22], SOOT); // a breach in her side
  K.pop();

  // Cables strung across the gap, and loose ones trailing out of each break.
  const cable = (pts, color, rad = 0.16) => K.add('bare', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 22, rad, 5), null, color);
  const fo = (x, y, z) => V(x, y, z).applyMatrix4(foreM), af = (x, y, z) => V(x, y, z).applyMatrix4(aftM);
  for (let k = 0; k < 6; k++) {
    const a = fo((r() - 0.5) * 10, (r() - 0.5) * 6, -2.5), b = af((r() - 0.5) * 10, (r() - 0.5) * 6, 9.5);
    const m = a.clone().lerp(b, 0.5).add(randDir(r).multiplyScalar(2 + r() * 4));
    if (m.distanceTo(CORE) < 4) m.add(V(0, -5, 0));
    cable([a, m, b], ['#1c1c1c', '#7a2a1a', '#8a7a2a', '#2a2a2a'][k % 4], 0.12 + r() * 0.1);
  }
  for (const [M, z, dir] of [[foreM, -2.5, 1], [aftM, 9.5, -1]])
    for (let k = 0; k < 5; k++) {
      const a = V((r() - 0.5) * 11, (r() - 0.5) * 7, z), pts = [a];
      for (let i = 1; i < 4; i++) pts.push(a.clone().add(V((r() - 0.5) * 4 * i, (r() - 0.6) * 4 * i, dir * i * (1.5 + r() * 2))));
      cable(pts.map((p) => p.applyMatrix4(M)), k % 2 ? '#1c1c1c' : '#6a2a1a', 0.1 + r() * 0.08);
    }

  g.add(K.build());
  // Her name on both flanks, faded paint, sooted.
  const nm = sign('MERIDIAN  ·  SV-114', '#d8d2c0', 16, 2.2, { lit: false, font: 'bold 120px "Arial Narrow", Arial, sans-serif' });
  const nameGeo = mergeGeometries([-1, 1].map((s) => nm.geo.clone().applyMatrix4(nameM.clone().multiply(mtx(s * (hw(-25) + 0.14), -1.9, -25, 0, s * (Math.PI / 2 + slope))))));
  const nameMesh = new THREE.Mesh(nameGeo, nm.mat);
  nameMesh.userData.ownTexture = nm.tex;
  g.add(nameMesh);
  const halos = H.build();
  g.add(halos);

  // Sparks: a few dozen hot points spat from the torn frames now and then, fading as they fly.
  const NS = 48, SP = new Halos();
  for (let i = 0; i < NS; i++) SP.add(V(), i % 3 ? '#ffd28a' : '#ff9a40', 2.6);
  const sparks = SP.build();
  const sp = sparks.geometry.attributes.position, ss = sparks.geometry.attributes.psize;
  sp.setUsage(THREE.DynamicDrawUsage);
  ss.setUsage(THREE.DynamicDrawUsage);
  for (let i = 0; i < NS; i++) ss.setX(i, 0);
  const vel = Array.from({ length: NS }, () => V()), life = new Float32Array(NS);
  sparks.frustumCulled = false;
  g.add(sparks);
  let nextBurst = 0.5, head = 0;

  // The debris: one instanced box, scaled into plates, girders and chunks, each tumbling on its own axis.
  const ND = 230, debris = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).toNonIndexed(), MATS().wreck, ND);
  debris.geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(debris.geometry.attributes.position.count * 3).fill(1), 3));
  const parts = [];
  const tints = ['#c4bca8', '#8a8272', '#3a3430', '#1c1916', '#6a4630'];
  while (parts.length < ND) {
    const p = randDir(r).multiplyScalar(6 + r() ** 1.8 * 60).multiply(V(1, 0.55, 1.1)).add(V(1, 0, 4));
    if (p.distanceTo(CORE) < 7) continue;
    const k = parts.length % 6;
    const s = k < 2 ? V(0.8 + r() * 2.6, 0.12 + r() * 0.1, 0.8 + r() * 2.4) : k < 4 ? V(0.35, 0.45, 2 + r() * 6) : V(0.3 + r() * 1.1, 0.3 + r() * 0.9, 0.3 + r() * 1.1);
    parts.push({ p, s, q0: new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 6, r() * 6, r() * 6)), axis: randDir(r), w: 0.04 + r() * 0.3 });
    debris.setColorAt(parts.length - 1, new THREE.Color(tints[Math.floor(r() * tints.length)]));
  }
  const dm = new THREE.Matrix4(), dq = new THREE.Quaternion();
  const tumble = (t) => {
    parts.forEach((o, i) => debris.setMatrixAt(i, dm.compose(o.p, dq.setFromAxisAngle(o.axis, o.w * t).multiply(o.q0), o.s)));
    debris.instanceMatrix.needsUpdate = true;
  };
  tumble(0);
  debris.computeBoundingSphere();
  g.add(debris);

  g.userData.nameplate = 'MERIDIAN';
  g.userData.tick = (dt, t) => {
    halos.userData.time.value = sparks.userData.time.value = t;
    tumble(t);
    if ((nextBurst -= dt) < 0 && emitters.length) {
      nextBurst = 0.6 + r() * 2.8;
      const e = emitters[Math.floor(r() * emitters.length)].clone();
      for (let k = 0; k < 7; k++, head = (head + 1) % NS) {
        sp.setXYZ(head, e.x, e.y, e.z);
        vel[head].copy(randDir(r)).multiplyScalar(4 + r() * 10);
        life[head] = 0.6 + r() * 1.2;
      }
    }
    for (let i = 0; i < NS; i++) {
      if (life[i] <= 0) continue;
      life[i] -= dt;
      sp.setXYZ(i, sp.getX(i) + vel[i].x * dt, sp.getY(i) + vel[i].y * dt, sp.getZ(i) + vel[i].z * dt);
      ss.setX(i, life[i] > 0 ? Math.min(1, life[i]) * 1.4 : 0);
    }
    sp.needsUpdate = ss.needsUpdate = true;
  };
  return rebuilt('derelict', g);
}
