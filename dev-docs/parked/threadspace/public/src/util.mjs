import * as THREE from 'three';

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (lo = 0, hi = 1) => lo + Math.random() * (hi - lo);
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const UP = new THREE.Vector3(0, 1, 0);
export const FWD = new THREE.Vector3(0, 0, -1);

/** A seeded random: the same sector lays out the same way every visit. */
export function mulberry(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Turns `obj` toward world point `to` by at most `rate * dt` radians. Returns the angle still to go. */
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
export function turnToward(obj, to, rate, dt, up = UP) {
  _m.lookAt(obj.position, to, up);
  _q.setFromRotationMatrix(_m);
  const angle = obj.quaternion.angleTo(_q);
  if (angle < 1e-4) return 0;
  obj.quaternion.rotateTowards(_q, rate * dt);
  return angle;
}

export function forwardOf(obj, target = new THREE.Vector3()) {
  return target.set(0, 0, -1).applyQuaternion(obj.quaternion);
}

export function fmtTime(s) {
  s = Math.max(0, Math.round(s));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null && v !== false) e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c !== null && c !== undefined && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c)));
  return e;
}

/** Flat-shaded, low-poly: every material in the game goes through here so the look stays one thing. */
const mats = new Map();
export function mat(color, opts = {}) {
  const key = `${color}|${JSON.stringify(opts)}`;
  if (!mats.has(key)) mats.set(key, new THREE.MeshLambertMaterial({ color, flatShading: true, ...opts }));
  return mats.get(key);
}
export function glow(color, opacity = 1) {
  const key = `glow|${color}|${opacity}`;
  if (!mats.has(key)) mats.set(key, new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, toneMapped: false }));
  return mats.get(key);
}
export function box(w, h, d, color, opts) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof color === 'string' || typeof color === 'number' ? mat(color, opts) : color);
}
export function cyl(rt, rb, h, color, seg = 8, opts) {
  return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), typeof color === 'string' || typeof color === 'number' ? mat(color, opts) : color);
}
export function at(mesh, x, y, z, rx = 0, ry = 0, rz = 0) {
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  return mesh;
}
