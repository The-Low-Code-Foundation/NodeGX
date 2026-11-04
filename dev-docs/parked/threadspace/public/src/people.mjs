// People: blocky, Minecraft-proportioned crew, EVA suits, Rook armour and station folk, plus the rifle they carry and
// the first-person rifle you hold. A person is 32 "pixels" tall (8 head, 12 body, 12 legs, 4-pixel limbs) at 0.056 m a
// pixel: 1.79 m, feet at y = 0, facing -z like everything else in the game. Each body part is ONE mesh: its boxes are
// merged into a single vertex-coloured geometry, so a person costs about a dozen meshes and three or four materials
// however many collars, belts and plates it wears. The face is a 16x16 pixel-art canvas on the head's front.
//
// Knees and elbows are real joints (Minecraft has none) so a person can sit at a console with its shins down and hold a
// rifle with both hands. The arms find the rifle with a two-bone reach, not by hand-tuned angles.

import * as THREE from 'three';
import { mat, clamp } from './util.mjs';

/** Metres per pixel of the Minecraft grid. */
export const PX = 0.056;

// --- the wardrobe -----------------------------------------------------------------------------------------------

/** Every choice the wardrobe offers. Colours are hex strings; styles and faces are names. */
export const LOOKS = {
  skin: ['#f6d8c4', '#ecc3a3', '#dba882', '#c48a60', '#a66d46', '#875334', '#653c24', '#45281a'],
  hair: ['#17130f', '#3b2618', '#6e4526', '#d9b85e', '#a8401e', '#a3a29d', '#3a6fe0', '#e45aac'],
  hairStyle: ['short', 'long', 'mohawk', 'bun', 'bald', 'cap', 'buzz'],
  face: ['calm', 'grin', 'stern', 'beard', 'scar', 'freckles'],
  eyes: ['#4a2c16', '#2f62a8', '#3a7d4a', '#6c7078', '#1e1612'],
  // Mid values: dim interiors are lit at a third of daylight, and a navy or a black shirt reads as a hole there.
  shirt: ['#4a6a96', '#c98b2a', '#3a805a', '#94383a', '#6e5aa4', '#8e949e', '#d8d2c2', '#2f8d9c'],
  pants: ['#2e333c', '#454b58', '#5a4632', '#33476a', '#66665c', '#2a3a30', '#7a6650', '#4a3448'],
  accent: ['#58b0ff', '#ff9a3c', '#7bd88f', '#ff5a5a', '#f2d24b', '#c78bff', '#5ae0d0', '#f4f4f0']
};

/** The look a new captain starts in. */
export const DEFAULT_LOOK = { skin: '#dba882', hair: '#3b2618', hairStyle: 'short', face: 'calm', eyes: '#4a2c16', shirt: '#4a6a96', pants: '#2e333c', accent: '#58b0ff' };

/** A random look, colours as palette indices (what the save and the locker keep); pass a seeded `rand` (util's
 *  `mulberry`) to get the same crowd every visit. */
export function randomLook(rand = Math.random) {
  const i = (a) => Math.floor(rand() * a.length);
  const pick = (a) => a[i(a)];
  return { skin: i(LOOKS.skin), hair: i(LOOKS.hair), hairStyle: pick(LOOKS.hairStyle), face: pick(LOOKS.face), eyes: i(LOOKS.eyes), shirt: i(LOOKS.shirt), pants: i(LOOKS.pants), accent: i(LOOKS.accent) };
}

/** A look with every colour as a hex: a number is an index into that key's palette (the game's crew and the save keep
 *  indices), a string is used as it is. */
export function resolveLook(look = {}) {
  const L = { ...DEFAULT_LOOK };
  for (const [k, v] of Object.entries(look ?? {})) {
    if (v === undefined || v === null) continue;
    L[k] = typeof v === 'number' && Array.isArray(LOOKS[k]) ? LOOKS[k][((v % LOOKS[k].length) + LOOKS[k].length) % LOOKS[k].length] : v;
  }
  return L;
}

// --- colour helpers (canvas side: plain sRGB hex) ---------------------------------------------------------------

const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex = (a) => '#' + a.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
const shade = (h, k) => hex(rgb(h).map((v) => v * k));
const mix = (a, b, t) => {
  const x = rgb(a), y = rgb(b);
  return hex(x.map((v, i) => v + (y[i] - v) * t));
};

// --- geometry: many coloured boxes, one mesh --------------------------------------------------------------------

const UNIT = new THREE.BoxGeometry(1, 1, 1);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const _v = new THREE.Vector3(), _n = new THREE.Vector3(), _n3 = new THREE.Matrix3(), _c = new THREE.Color();
const geos = new Map();

/** One geometry from a list of boxes `[w, h, d, x, y, z, colour, rx?, ry?, rz?]`, sizes in `unit`s (pixels by default).
 *  Cached by its list, so ten people in the same uniform share one geometry per part. */
function blocks(list, unit = PX) {
  const key = unit + JSON.stringify(list);
  if (geos.has(key)) return geos.get(key);
  const P = UNIT.attributes.position, N = UNIT.attributes.normal, I = UNIT.index.array, nv = P.count;
  const pos = new Float32Array(list.length * nv * 3), nor = new Float32Array(pos.length), col = new Float32Array(pos.length);
  const idx = new Uint16Array(list.length * I.length);
  list.forEach(([w, h, d, x, y, z, c, rx = 0, ry = 0, rz = 0], b) => {
    _m.compose(_p.set(x * unit, y * unit, z * unit), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(w * unit, h * unit, d * unit));
    _n3.getNormalMatrix(_m);
    _c.set(c); // linear working colour, the same conversion `mat()` makes
    for (let i = 0; i < nv; i++) {
      const o = (b * nv + i) * 3;
      _v.fromBufferAttribute(P, i).applyMatrix4(_m).toArray(pos, o);
      _n.fromBufferAttribute(N, i).applyMatrix3(_n3).normalize().toArray(nor, o);
      col[o] = _c.r, col[o + 1] = _c.g, col[o + 2] = _c.b;
    }
    for (let i = 0; i < I.length; i++) idx[b * I.length + i] = I[i] + b * nv;
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  geos.set(key, g);
  return g;
}

const PAINT = () => mat('#ffffff', { vertexColors: true }); // every body part: lit, flat, coloured per vertex
let _lamp;
const LAMP = () => (_lamp ??= new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })); // lights that glow
let _visor;
/** The suit's glass: dark, see-through enough to show the face, with a hard highlight. */
const VISOR = () => (_visor ??= new THREE.MeshPhongMaterial({ color: '#13233a', specular: '#c8daf0', shininess: 80, transparent: true, opacity: 0.55, flatShading: true, depthWrite: false }));

const cloth = (geometry, material) => {
  const m = new THREE.Mesh(geometry, material);
  m.userData.cloth = true;
  return m;
};

// --- the head: one box, a six-face pixel atlas ------------------------------------------------------------------

let _headGeo;
/** The 8-pixel head cube, sitting on its neck pivot, its UVs squeezed so face i reads sixteenth-pixel strip i of the
 *  atlas (+x, -x, top, bottom, back, front: BoxGeometry's face order). */
function headGeo() {
  if (_headGeo) return _headGeo;
  _headGeo = new THREE.BoxGeometry(8 * PX, 8 * PX, 8 * PX).translate(0, 4 * PX, 0);
  const uv = _headGeo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setX(i, (Math.floor(i / 4) + 0.003 + uv.getX(i) * 0.994) / 6);
  return _headGeo;
}

const heads = new Map();
/** The head's material for a look: a 96x16 canvas (six 16x16 faces) drawn once per skin/hair/style/face/eyes. */
function headMat(L) {
  const key = [L.skin, L.hair, L.hairStyle, L.face, L.eyes].join('|');
  if (heads.has(key)) return heads.get(key);
  const cv = document.createElement('canvas');
  cv.width = 96;
  cv.height = 16;
  const g = cv.getContext('2d');
  const put = (f, x, y, w, h, c, flip = false) => ((g.fillStyle = c), g.fillRect(f * 16 + (flip ? 16 - x - w : x), y, w, h));
  const { skin, hair, hairStyle: st } = L;
  const fuzz = mix(skin, hair, 0.55), stubble = mix(skin, hair, 0.22), ear = shade(skin, 0.84);
  // Faces 0 and 1 are the sides (front at the right on +x, mirrored on -x), 2 top, 3 bottom, 4 back, 5 front.
  for (let f = 0; f < 6; f++) put(f, 0, 0, 16, 16, f === 3 ? shade(skin, 0.8) : skin);
  for (const [f, flip] of [[0, false], [1, true]]) {
    const s = (x, y, w, h, c) => put(f, x, y, w, h, c, flip);
    s(6, 7, 3, 3, ear);
    if (st === 'short') s(0, 0, 16, 4, hair), s(0, 4, 6, 7, hair), s(11, 4, 2, 4, hair);
    if (st === 'long') s(0, 0, 16, 4, hair), s(0, 4, 13, 12, hair);
    if (st === 'bun') s(0, 0, 16, 3, hair), s(0, 3, 7, 5, hair);
    if (st === 'buzz') s(0, 0, 16, 3, fuzz), s(0, 3, 6, 7, fuzz), s(11, 3, 2, 3, fuzz);
    if (st === 'mohawk') s(0, 0, 16, 3, stubble), s(0, 3, 5, 6, stubble);
    if (st === 'cap') s(0, 4, 7, 6, hair), s(12, 4, 1, 3, hair);
  }
  // Top and back.
  const top = { short: hair, long: hair, bun: hair, cap: hair, buzz: fuzz, mohawk: stubble, bald: shade(skin, 1.05) }[st];
  put(2, 0, 0, 16, 16, top);
  if (st === 'mohawk') put(2, 6, 0, 4, 16, hair);
  if (st === 'long') put(2, 7, 0, 2, 9, shade(hair, 0.8));
  const back = { short: 11, long: 16, bun: 9, cap: 10, buzz: 11, mohawk: 13, bald: 0 }[st];
  if (back) put(4, 0, st === 'cap' ? 4 : 0, 16, back - (st === 'cap' ? 4 : 0), st === 'buzz' ? fuzz : st === 'mohawk' ? stubble : hair);
  if (st === 'mohawk') put(4, 6, 0, 4, 14, hair);
  // The face.
  const F = (x, y, w, h, c) => put(5, x, y, w, h, c);
  const brow = shade(hair, 0.7), lip = mix(shade(skin, 0.62), '#7a2a2a', 0.35), dark = shade(skin, 0.5);
  if (st === 'short') F(0, 0, 16, 3, hair), F(0, 3, 2, 2, hair), F(14, 3, 2, 2, hair), F(3, 3, 4, 1, hair);
  if (st === 'long') F(0, 0, 16, 3, hair), F(0, 3, 2, 10, hair), F(14, 3, 2, 10, hair), F(7, 0, 2, 2, shade(hair, 0.8));
  if (st === 'bun') F(0, 0, 16, 2, hair), F(0, 2, 1, 3, hair), F(15, 2, 1, 3, hair);
  if (st === 'buzz') F(0, 0, 16, 2, fuzz), F(0, 2, 1, 2, fuzz), F(15, 2, 1, 2, fuzz);
  if (st === 'mohawk') F(0, 0, 16, 2, stubble), F(6, 0, 4, 2, hair);
  if (st === 'cap') F(0, 4, 1, 3, hair), F(15, 4, 1, 3, hair);
  F(7, 9, 2, 2, shade(skin, 0.8)); // nose
  F(3, 7, 4, 2, '#f2f0ea'), F(9, 7, 4, 2, '#f2f0ea'); // whites, then irises toward the nose, a dark pupil in each
  F(5, 7, 2, 2, L.eyes), F(9, 7, 2, 2, L.eyes);
  F(5, 7, 1, 1, '#0c0a0a'), F(10, 7, 1, 1, '#0c0a0a');
  const face = L.face;
  if (face === 'stern' || face === 'scar') F(3, 5, 2, 1, brow), F(5, 6, 2, 1, brow), F(9, 6, 2, 1, brow), F(11, 5, 2, 1, brow);
  else F(3, 5, 4, 1, brow), F(9, 5, 4, 1, brow);
  if (face === 'beard') {
    const b = shade(hair, 0.92);
    F(1, 10, 14, 6, b), F(0, 7, 2, 4, b), F(14, 7, 2, 4, b), F(5, 11, 6, 1, shade(hair, 0.8)), F(6, 12, 4, 1, lip);
  } else if (face === 'grin' || face === 'freckles') {
    F(5, 11, 1, 1, lip), F(10, 11, 1, 1, lip), F(5, 12, 6, 1, lip), F(6, 12, 4, 1, '#f4f2ea'), F(6, 13, 4, 1, lip);
  } else if (face === 'stern' || face === 'scar') F(5, 12, 6, 1, dark);
  else F(6, 12, 4, 1, lip);
  if (face === 'scar') for (const [x, y] of [[11, 4], [11, 5], [12, 6], [12, 7], [12, 8], [13, 9], [13, 10]]) F(x, y, 1, 1, mix(skin, '#f0c8c0', 0.7));
  if (face === 'freckles') for (const [x, y] of [[3, 10], [5, 10], [4, 11], [11, 10], [13, 10], [12, 11], [2, 9], [14, 9]]) F(x, y, 1, 1, mix(skin, '#7a3a14', 0.4));
  const tex = new THREE.CanvasTexture(cv);
  tex.magFilter = tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.MeshLambertMaterial({ map: tex });
  heads.set(key, m);
  return m;
}

// --- outfits: the box lists of every part, per kind -------------------------------------------------------------
// Part spaces (pixels): torso from its hip-joint origin up 12; head from the neck up 8; an upper arm hangs from the
// shoulder pivot (+2 to -4), the forearm from the elbow (0 to -6, the hand its last 3); a thigh hangs 6 from the hip,
// the shin 6 from the knee, the sole at -6. Faces are at -z.

const SUIT = { W: '#d6dbe2', G: '#8c949e', D: '#4a5260' };
const ROOK = { U: '#3a2a24', P: '#8e3e2a', P2: '#6a3022', M: '#4a4542', K: '#221a17', slit: '#ff8a2a' };

/** The box lists for one look and kind: `{ torso, lamps, upper: [L, R], fore: [L, R], thigh, shin, hair, helmet,
 *  helmetLamps, visor, face, shoulder, hip }`. */
function outfit(kind, L) {
  const { shirt, pants, accent, skin, hair } = L;
  const o = { lamps: [], helmet: [], helmetLamps: [], hair: [], visor: false, face: true, shoulder: 6, hip: 2 };
  const pair = (fn) => [fn(-1), fn(1)];
  if (kind === 'suit') {
    const { W, G, D } = SUIT;
    o.shoulder = 7.1, o.hip = 2.4, o.visor = true;
    o.torso = [[9.4, 12, 5.4, 0, 6, 0, W], [5, 3.6, 0.6, 0, 8.4, -2.9, G], [9.6, 0.9, 5.6, 0, 4.2, 0, accent], [9.6, 1.4, 5.6, 0, 0.8, 0, G],
      [6.4, 1.2, 6.4, 0, 12, 0, G], [8, 9, 3.4, 0, 6.6, 4.3, '#c4c9d0'], [6.4, 1, 0.5, 0, 10.2, 6.1, G], [2, 7, 1.6, -2.4, 6, 6.4, G],
      [2, 7, 1.6, 2.4, 6, 6.4, G], [0.5, 3.4, 0.5, -3.2, 12.6, 4.6, D]];
    o.lamps = [[1, 1, 0.3, 1.3, 8.6, -3.25, accent], [1, 1, 0.3, -1.3, 8.6, -3.25, '#7bd88f'], [1.6, 1.2, 0.4, 0, 3.3, 6.2, '#ff5a3a']];
    o.upper = pair(() => [[4.8, 6, 4.8, 0, -1, 0, W], [5, 0.9, 5, 0, -3.1, 0, accent]]);
    o.fore = pair(() => [[4.6, 3.6, 4.6, 0, -1.8, 0, W], [5, 0.8, 5, 0, -3.4, 0, D], [4.2, 3, 4.2, 0, -4.9, 0, G]]);
    o.thigh = [[4.8, 6, 4.8, 0, -3, 0, W], [5, 0.9, 5, 0, -1.6, 0, accent]];
    o.shin = [[4.8, 3.6, 4.8, 0, -1.8, 0, W], [5.1, 2.6, 5.5, 0, -4.7, -0.3, G], [5.2, 0.6, 5.7, 0, -5.7, -0.3, D]];
    o.helmet = [[10, 10, 1, 0, 4.3, 4.5, W], [10, 1, 10, 0, 8.8, 0, W], [1, 10, 9, -4.5, 4.3, -0.5, W], [1, 10, 9, 4.5, 4.3, -0.5, W],
      [8, 2.5, 1, 0, 8.05, -4.5, W], [8, 2.5, 1, 0, 0.55, -4.5, W], [0.4, 5, 1, -3.8, 4.3, -4.5, W], [0.4, 5, 1, 3.8, 4.3, -4.5, W],
      [1.6, 0.4, 10.2, 0, 9.4, 0, accent], [1.2, 2.4, 1.2, 5.4, 5, -1.5, G]];
    o.helmetLamps = [[0.6, 1, 0.8, 5.4, 5, -2.5, '#fff2c0']];
  } else if (kind === 'armour') {
    const { U, P, P2, M, K } = ROOK;
    o.face = false;
    o.torso = [[8, 12, 4, 0, 6, 0, U], [9, 6, 5, 0, 8.7, 0, P], [8.4, 3, 4.6, 0, 4.3, 0, P2], [9.2, 0.6, 5.2, 0, 5.8, 0, M],
      [8.6, 1.4, 4.6, 0, 0.8, 0, M], [6, 1.6, 5.4, 0, 11.8, 0, P2], [2, 2, 0.3, 0, 9.2, -2.6, '#d8b04a'], [3, 0.8, 0.3, 0, 7.4, -2.6, P2]];
    o.upper = pair((s) => [[4, 6, 4, 0, -1, 0, U], [5.4, 3.2, 5.4, 0.3 * s, 1, 0, P], [5.6, 0.6, 5.6, 0.3 * s, -0.6, 0, M]]);
    o.fore = pair(() => [[4.6, 3.6, 4.6, 0, -1.8, 0, P2], [3.8, 3, 3.8, 0, -4.6, 0, K]]);
    o.thigh = [[4, 6, 4, 0, -3, 0, U], [4.4, 4, 1, 0, -3, -2.2, P]];
    o.shin = [[4, 3.6, 4, 0, -1.8, 0, U], [4.6, 3.8, 4.8, 0, -2.6, -0.2, P2], [4.4, 2.4, 4.8, 0, -4.8, -0.4, K]];
    o.helmet = [[9, 9, 9, 0, 4.3, 0, P2], [7.4, 5, 0.6, 0, 3.2, -4.7, M], [1.6, 2, 8, 0, 9.6, 0.5, P], [6.8, 1.8, 0.3, 0, 4.9, -5.1, '#120a08'],
      [1, 3, 2, -4.8, 1.8, -2.5, M], [1, 3, 2, 4.8, 1.8, -2.5, M], [9.4, 1, 9.4, 0, 0.3, 0, M]];
    o.helmetLamps = [[6, 0.8, 0.4, 0, 4.9, -5.2, ROOK.slit]];
  } else if (kind === 'civilian') {
    o.torso = [[8, 12, 4, 0, 6, 0, shirt], [8.1, 2, 4.1, 0, 1, 0, pants], [4, 0.8, 0.3, 0, 11.6, -2.1, accent], [8.2, 0.8, 4.2, 0, 2.4, 0, shade(shirt, 0.75)]];
    o.upper = pair(() => [[4, 3, 4, 0, 0.5, 0, shirt], [3.6, 3, 3.6, 0, -2.5, 0, skin]]);
    o.fore = pair(() => [[3.6, 6, 3.6, 0, -3, 0, skin]]);
    o.thigh = [[4, 6, 4, 0, -3, 0, pants]];
    o.shin = [[4, 4.4, 4, 0, -2.2, 0, pants], [4.2, 1.6, 4.6, 0, -5.2, -0.3, '#3a2a20']];
  } else {
    // crew: a ship's jumpsuit, the accent at the collar, on the shoulders and as a chest badge
    const seam = shade(shirt, 0.72);
    o.torso = [[8, 12, 4, 0, 6, 0, shirt], [8.4, 1.2, 4.4, 0, 0.8, 0, '#2a2622'], [1.4, 1, 0.3, 0, 0.8, -2.3, '#b8a060'],
      [4, 1.2, 0.3, 0, 11.4, -2.1, accent], [0.6, 9, 0.2, 0, 5.8, -2.05, seam], [1.6, 1.6, 0.3, -2.3, 9, -2.1, accent]];
    o.upper = pair((s) => [[4, 6, 4, 0, -1, 0, shirt], [4.2, 0.7, 4.2, 0, 1.75, 0, accent], ...(s < 0 ? [[0.3, 1.8, 1.8, -2.1, -0.8, 0, accent]] : [])]);
    o.fore = pair(() => [[4, 3, 4, 0, -1.5, 0, shirt], [4.2, 0.7, 4.2, 0, -2.75, 0, seam], [3.6, 3, 3.6, 0, -4.5, 0, skin]]);
    o.thigh = [[4, 6, 4, 0, -3, 0, pants]];
    o.shin = [[4, 3.5, 4, 0, -1.75, 0, pants], [4.3, 2.5, 4.6, 0, -4.75, -0.3, '#1e1e22'], [4.4, 0.5, 4.8, 0, -5.75, -0.3, '#111114']];
  }
  if (kind !== 'suit' && kind !== 'armour') {
    const st = L.hairStyle, hat = [8.5, 1.2, 8.5, 0, 8.25, 0.1, hair];
    o.hair = {
      short: [hat],
      long: [hat, [8.6, 11, 1.2, 0, 3, 4.4, hair], [0.8, 8, 4, -4.3, 4, 1.5, hair], [0.8, 8, 4, 4.3, 4, 1.5, hair]],
      mohawk: [[2, 3, 9, 0, 9.4, 0.3, hair], [2, 3, 1, 0, 7.5, 4.6, hair]],
      bun: [hat, [3.4, 3.4, 3, 0, 7.4, 5, hair]],
      cap: [[8.8, 2.8, 8.8, 0, 7.6, 0, accent], [8.2, 0.7, 3.6, 0, 6.5, -5.6, shade(accent, 0.7)], [2, 1.2, 0.3, 0, 7.8, -4.45, '#f4f4f0']]
    }[st] ?? [];
  }
  return o;
}

// --- a person ---------------------------------------------------------------------------------------------------

const group = (parent, x = 0, y = 0, z = 0, order = 'XYZ') => {
  const g = new THREE.Group();
  g.position.set(x * PX, y * PX, z * PX);
  g.rotation.order = order;
  parent.add(g);
  return g;
};

/** A person, as a Group: feet at y = 0, facing -z, Minecraft-blocky. `kind` is 'crew' (a ship's jumpsuit), 'suit' (EVA:
 *  helmet and visor, backpack), 'armour' (a Rook defender: plates and an orange visor slit) or 'civilian'. `gun` puts a
 *  rifle in its hands (slung on its back in poses that need the hands). `userData.parts` holds the pivots:
 *  { rig (whole body, pivots at the feet), hips, torso, head, armL, armR, foreL, foreR, legL, legR, shinL, shinR, gun }.
 *  Left is the person's own left (-x). Drive it with `animatePerson` every frame. */
export function makePerson(look = DEFAULT_LOOK, { kind = 'crew', gun = false } = {}) {
  const p = new THREE.Group();
  const rig = group(p);
  const hips = group(rig, 0, 12);
  const torso = group(hips, 0, 0, 0, 'YXZ');
  const head = group(torso, 0, 12, 0, 'YXZ');
  const [armL, armR] = [-1, 1].map((s) => group(torso, 6 * s, 10, 0, 'YXZ'));
  const [foreL, foreR] = [armL, armR].map((a) => group(a, 0, -4));
  const [legL, legR] = [-1, 1].map((s) => group(hips, 2 * s));
  const [shinL, shinR] = [legL, legR].map((l) => group(l, 0, -6));
  const gunG = group(torso, 0, 0, 0, 'YXZ');
  p.userData.parts = { rig, hips, torso, head, armL, armR, foreL, foreR, legL, legR, shinL, shinR, gun: gunG };
  p.userData.kind = kind;
  if (gun) {
    const r = rifle({ accent: kind === 'armour' ? ROOK.slit : '#58f0ff', body: kind === 'armour' ? '#3e3836' : '#363d48' });
    gunG.add(r);
    p.userData.rifle = r;
  }
  p.userData.anim = { t: 0, phase: 0, since: 0, pose: 'idle', kick: 0, fall: 0, seed: Math.random() * 6.28, j: { ...REST }, tgt: { ...REST } };
  setLook(p, look);
  animatePerson(p, 0);
  return p;
}

/** Re-dresses `person` in `look` in place (its pose, rifle and place are kept): the wardrobe recolours its preview with
 *  this as you click. */
export function setLook(person, look) {
  const L = resolveLook(look);
  const P = person.userData.parts, kind = person.userData.kind;
  const o = outfit(kind, L);
  for (const g of Object.values(P)) for (const c of [...g.children]) if (c.userData.cloth) g.remove(c);
  person.userData.look = L;
  P.armL.position.x = -o.shoulder * PX, P.armR.position.x = o.shoulder * PX;
  P.legL.position.x = -o.hip * PX, P.legR.position.x = o.hip * PX;
  person.userData.shoulder = o.shoulder;
  P.torso.add(cloth(blocks(o.torso), PAINT()));
  if (o.lamps.length) P.torso.add(cloth(blocks(o.lamps), LAMP()));
  [P.armL, P.armR].forEach((a, i) => a.add(cloth(blocks(o.upper[i]), PAINT())));
  [P.foreL, P.foreR].forEach((a, i) => a.add(cloth(blocks(o.fore[i]), PAINT())));
  for (const l of [P.legL, P.legR]) l.add(cloth(blocks(o.thigh), PAINT()));
  for (const s of [P.shinL, P.shinR]) s.add(cloth(blocks(o.shin), PAINT()));
  if (o.face) P.head.add(cloth(headGeo(), headMat(L)));
  if (o.hair.length) P.head.add(cloth(blocks(o.hair), PAINT()));
  if (o.helmet.length) P.head.add(cloth(blocks(o.helmet), PAINT()));
  if (o.helmetLamps.length) P.head.add(cloth(blocks(o.helmetLamps), LAMP()));
  if (o.visor) P.head.add(cloth(blocks([[7.4, 5.2, 0.4, 0, 4.3, -4.4, '#ffffff']]), VISOR()));
  return person;
}

// --- poses ------------------------------------------------------------------------------------------------------
// A pose is a set of joint angles (radians) and offsets (pixels). Each frame the pose's targets are worked out, the
// person's joints move toward them on an exponential ease, and the result goes onto the pivots.

const REST = {
  rx: 0, rz: 0, hy: 0, hz: 0, tx: 0, ty: 0, hx: 0, hyaw: 0,
  lLx: 0, lLz: 0, lRx: 0, lRz: 0, kL: 0, kR: 0,
  aLx: 0, aLy: 0, aLz: -0.07, aRx: 0, aRy: 0, aRz: 0.07, eL: 0.12, eR: 0.12,
  gx: 0, gy: 6, gz: 3.2, gp: 0.8, gyaw: Math.PI / 2 // the rifle slung across the back
};
const UPPER = 4, LOWER = 4.6; // shoulder pivot to elbow, elbow to the middle of the hand (pixels)
const GRIP = new THREE.Vector3(0, -0.03, 0.02).divideScalar(PX), FORE = new THREE.Vector3(0, 0.0, -0.2).divideScalar(PX);
const _g = new THREE.Object3D();
_g.rotation.order = 'YXZ';
const _t = new THREE.Vector3();

/** Two-bone reach: the angles that put arm `side` ('L' | 'R')'s hand on torso-space point `to` (pixels), elbow down.
 *  The arm hangs along -y; its rotation is yaw (y) of a forward swing (x), and the elbow bends forward about x. */
function reach(T, side, sx, to) {
  const dx = to.x - sx, dy = to.y - 10, dz = to.z;
  const D = Math.max(0.01, Math.hypot(dx, dy, dz)), Dc = clamp(D, 1.5, UPPER + LOWER - 0.05);
  const a = Math.acos(clamp(-dy / D, -1, 1)), yaw = Math.atan2(-dx, -dz);
  const alpha = Math.acos(clamp((UPPER * UPPER + Dc * Dc - LOWER * LOWER) / (2 * UPPER * Dc), -1, 1));
  const bend = Math.PI - Math.acos(clamp((UPPER * UPPER + LOWER * LOWER - Dc * Dc) / (2 * UPPER * LOWER), -1, 1));
  T[`a${side}x`] = a - alpha, T[`a${side}y`] = yaw, T[`a${side}z`] = 0, T[`e${side}`] = bend;
}

/** Puts the rifle at hips-space grip (gx, gy, gz) aimed by pitch gp / yaw gyaw (it lives in the torso, so the torso's
 *  own yaw is taken back out), and both hands on it. */
function holdGun(T, sx, gx, gy, gz, gp, gyaw) {
  const c = Math.cos(T.ty), s = Math.sin(T.ty);
  T.gx = gx * c - gz * s, T.gz = gx * s + gz * c, T.gy = gy, T.gp = gp, T.gyaw = gyaw - T.ty;
  _g.position.set(T.gx, T.gy, T.gz);
  _g.rotation.set(T.gp, T.gyaw, 0);
  _g.updateMatrix();
  reach(T, 'R', sx, _t.copy(GRIP).applyMatrix4(_g.matrix));
  reach(T, 'L', -sx, _t.copy(FORE).applyMatrix4(_g.matrix));
}

function targets(person, pose, speed, aim) {
  const A = person.userData.anim, T = Object.assign(A.tgt, REST), t = A.t, s = A.seed;
  const sx = person.userData.shoulder ?? 6, armed = !!person.userData.rifle;
  const breath = Math.sin(t * 1.7 + s);
  let hold = null;
  if (pose === 'walk') {
    const run = speed > 5, amp = run ? 0.95 : clamp(speed / 3, 0.15, 0.6), ph = A.phase, sw = Math.sin(ph) * amp;
    T.lLx = sw, T.lRx = -sw;
    T.kL = -(0.06 + (run ? 1.6 : 0.9) * amp * Math.max(0, Math.cos(ph)));
    T.kR = -(0.06 + (run ? 1.6 : 0.9) * amp * Math.max(0, -Math.cos(ph)));
    T.aLx = -sw * 0.9 + (run ? 0.35 : 0), T.aRx = sw * 0.9 + (run ? 0.35 : 0);
    T.eL = T.eR = run ? 1.5 : 0.25;
    T.tx = run ? -0.24 : -0.03, T.hx = run ? 0.2 : 0.02;
    T.hy = -Math.abs(Math.sin(ph)) * (run ? 1 : 0.5);
    T.ty = Math.sin(ph) * (run ? 0.12 : 0.06);
    if (armed) hold = 'low';
  } else if (pose === 'sit' || pose === 'console') {
    const sit = pose === 'sit';
    if (sit) T.hy = -1.1, T.lLx = T.lRx = 1.08, T.kL = T.kR = -1.0, T.lLz = -0.06, T.lRz = 0.06;
    T.tx = sit ? -0.14 : -0.08, T.hx = sit ? -0.18 : -0.32;
    T.hyaw = Math.sin(t * 0.3 + s) * 0.15;
    // Hands on the desk: about 0.4 m ahead, at desk height (0.85 m seated, 0.95 m standing), typing.
    const y = sit ? 4.6 : 5, z = sit ? -6.6 : -6.4;
    reach(T, 'L', -sx, _t.set(-3, y + Math.max(0, Math.sin(t * 11)) * 0.6, z));
    reach(T, 'R', sx, _t.set(3, y + Math.max(0, Math.sin(t * 11 + 2.2)) * 0.6, z));
  } else if (pose === 'aim') {
    T.lLx = 0.28, T.lRx = -0.18, T.kL = -0.12, T.kR = -0.08, T.lLz = -0.04, T.lRz = 0.08;
    T.ty = -0.45, T.tx = -0.04 + breath * 0.01, T.hyaw = 0.4, T.hx = aim * 0.75 - 0.06;
    if (armed) hold = 'aim';
    else T.aLx = T.aRx = Math.PI / 2 + aim - 0.05, T.aLy = -0.15, T.aRy = 0.15;
  } else if (pose === 'float') {
    T.rx = Math.sin(t * 0.4 + s) * 0.1, T.rz = Math.sin(t * 0.29 + s) * 0.08, T.hy = Math.sin(t * 0.6 + s) * 1.2;
    T.aLz = -0.65 - Math.sin(t * 0.7 + s) * 0.2, T.aRz = 0.6 + Math.sin(t * 0.63 + s) * 0.2;
    T.aLx = 0.3 + Math.sin(t * 0.5) * 0.15, T.aRx = 0.2 + Math.sin(t * 0.45 + 1) * 0.15, T.eL = T.eR = 0.55;
    T.lLx = 0.3 + Math.sin(t * 0.37) * 0.12, T.lRx = -0.1 + Math.sin(t * 0.41 + 2) * 0.12, T.kL = -0.6, T.kR = -0.35;
    T.lLz = -0.12, T.lRz = 0.14, T.tx = -0.06, T.hx = 0.12;
  } else if (pose === 'dead') {
    T.aLz = -1.35, T.aRz = 1.15, T.aLx = 0.25, T.aRx = -0.15, T.eL = 0.35, T.eR = 0.7;
    T.lLz = -0.14, T.lRz = 0.16, T.kL = -0.3, T.kR = -0.05, T.hyaw = 0.55, T.hx = -0.1;
    T.gx = sx + 3.5, T.gy = 4, T.gz = 1.5, T.gp = Math.PI / 2, T.gyaw = 0.25; // dropped by its side
  } else if (pose === 'wave') {
    T.aRz = 2.6 + Math.sin(t * 9) * 0.3, T.aRx = 0.15, T.eR = 0.3, T.hyaw = 0.12, T.hx = 0.06, T.tx = breath * 0.012;
  } else {
    // idle: breathing, a glance round now and then
    T.tx = breath * 0.012, T.hy = breath * 0.1, T.aLz = -0.07 - breath * 0.015, T.aRz = 0.07 + breath * 0.015;
    T.hyaw = Math.sin(t * 0.37 + s * 3) * Math.sin(t * 0.11 + s) * 0.45, T.hx = Math.sin(t * 0.23 + s) * 0.05;
    if (armed) hold = 'low';
  }
  if (hold === 'aim') holdGun(T, sx, 0.5, 10.4, -4.6, aim, 0);
  if (hold === 'low') (T.ty += -0.25), holdGun(T, sx, 0.8, 6.6, -4.6, -0.6, 0.35);
  return T;
}

/** Moves `person` toward `pose` by `dt` seconds; call every frame. Poses: 'idle', 'walk' (limbs swing with `speed` m/s,
 *  a run above 5), 'sit' (on a 0.5 m seat, hands on a desk ~0.4 m ahead), 'console' (standing, hands on the console),
 *  'aim' (rifle shouldered; `aim` = pitch in radians, up positive), 'float' (EVA drift), 'dead' (falls flat on its
 *  back over 0.4 s) and 'wave'. Changes of pose blend; the person keeps its own phase in `userData.anim`. */
export function animatePerson(person, dt, { pose = 'idle', speed = 0, aim = 0 } = {}) {
  const A = person.userData.anim, P = person.userData.parts;
  dt = clamp(dt, 0, 0.1); // a negative or huge step would throw the easing past its target and on to infinity
  A.t += dt;
  if (pose !== A.pose) (A.pose = pose), (A.since = 0);
  A.since += dt;
  if (pose === 'walk') A.phase += dt * speed * ((Math.PI * 2) / (speed > 5 ? 2.4 : 1.5));
  const T = targets(person, pose, speed, aim), j = A.j, k = 1 - Math.exp(-dt * 10);
  for (const key in T) j[key] += (T[key] - j[key]) * k;
  // The fall is timed, not eased: it speeds up like a fall and lands with a small bounce.
  if (pose === 'dead') {
    const u = Math.min(1, A.since / 0.4), after = Math.max(0, A.since - 0.4);
    A.fall = Math.max(A.fall, u * u) - Math.sin(after * 22) * Math.exp(-after * 10) * 0.035;
  } else A.fall = Math.max(0, A.fall - dt * 2.5);
  A.kick *= Math.exp(-dt * 14);
  const kk = A.kick, fall = (A.fall * Math.PI) / 2;
  P.rig.rotation.set(j.rx + fall, 0, j.rz);
  P.rig.position.set(0, Math.sin(fall) * 3.2 * PX, 0);
  P.hips.position.set(0, (12 + j.hy) * PX, j.hz * PX);
  P.torso.rotation.set(j.tx + kk * 0.07, j.ty, 0);
  P.head.rotation.set(j.hx, j.hyaw, 0);
  P.legL.rotation.set(j.lLx, 0, j.lLz), P.legR.rotation.set(j.lRx, 0, j.lRz);
  P.shinL.rotation.x = j.kL, P.shinR.rotation.x = j.kR;
  P.armL.rotation.set(j.aLx + kk * 0.1, j.aLy, j.aLz), P.armR.rotation.set(j.aRx + kk * 0.1, j.aRy, j.aRz);
  P.foreL.rotation.x = j.eL, P.foreR.rotation.x = j.eR;
  P.gun.position.set(j.gx * PX, j.gy * PX, (j.gz + kk * 1.1) * PX);
  P.gun.rotation.set(j.gp + kk * 0.14, j.gyaw, 0);
  return person;
}

/** A recoil twitch for a person who just fired: shoulders and muzzle jump, then settle in a few frames. */
export function kick(person) {
  person.userData.anim.kick = Math.min(1.5, person.userData.anim.kick + 1);
  return person;
}

// --- the rifle --------------------------------------------------------------------------------------------------

let _flashMat;
/** The muzzle flash's star: a hot centre and four spikes, additive. */
function flashMat() {
  if (_flashMat) return _flashMat;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const g = cv.getContext('2d');
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,240,1)');
  r.addColorStop(0.25, 'rgba(255,210,120,0.9)');
  r.addColorStop(0.6, 'rgba(255,120,40,0.25)');
  r.addColorStop(1, 'rgba(255,80,20,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = 'rgba(255,230,170,0.85)';
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, d = i % 2 ? 7 : 31;
    g.lineTo(32 + Math.cos(a) * d, 32 + Math.sin(a) * d);
  }
  g.fill();
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  _flashMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  return _flashMat;
}

let _flashGeo;
/** Three crossed quads: one facing back down the barrel, two lengthwise so the flash has a side view too. */
function flashGeo() {
  if (_flashGeo) return _flashGeo;
  const parts = [
    new THREE.PlaneGeometry(0.2, 0.2),
    new THREE.PlaneGeometry(0.16, 0.34).rotateX(-Math.PI / 2).translate(0, 0, -0.15),
    new THREE.PlaneGeometry(0.16, 0.34).rotateX(-Math.PI / 2).rotateZ(Math.PI / 2).translate(0, 0, -0.15)
  ];
  const pos = [], uv = [], idx = [];
  for (const p of parts) {
    const base = pos.length / 3;
    pos.push(...p.attributes.position.array);
    uv.push(...p.attributes.uv.array);
    idx.push(...[...p.index.array].map((i) => i + base));
  }
  _flashGeo = new THREE.BufferGeometry();
  _flashGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  _flashGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  _flashGeo.setIndex(idx);
  return _flashGeo;
}

/** A blocky sci-fi rifle, 0.85 m, barrel along -z, the pistol grip at the origin. Four meshes: the body, the magazine,
 *  the glowing parts (energy cell in `accent`, a red sight dot) and the flash. `userData.muzzle` is the barrel tip
 *  (local), `userData.mag` the magazine mesh (its rest place in `mag.userData.home`), `userData.flash` the hidden
 *  muzzle flash. */
export function rifle({ accent = '#58f0ff', body = '#363d48' } = {}) {
  const g = new THREE.Group();
  const mid = '#535c6a', light = '#76808e', black = '#1d2025';
  const solid = blocks([
    [0.07, 0.085, 0.34, 0, 0.06, -0.12, body], // receiver
    [0.074, 0.016, 0.22, 0, 0.11, -0.13, mid], // top rail
    [0.058, 0.062, 0.22, 0, 0.064, -0.39, mid], // barrel shroud
    [0.062, 0.012, 0.03, 0, 0.064, -0.33, black], [0.062, 0.012, 0.03, 0, 0.064, -0.39, black], [0.062, 0.012, 0.03, 0, 0.064, -0.45, black],
    [0.026, 0.026, 0.08, 0, 0.068, -0.53, black], // barrel
    [0.042, 0.042, 0.035, 0, 0.068, -0.585, body], // muzzle brake
    [0.048, 0.07, 0.19, 0, 0.045, 0.14, mid], // stock
    [0.054, 0.1, 0.03, 0, 0.035, 0.245, black], // butt pad
    [0.04, 0.1, 0.05, 0, -0.025, 0.0, black, 0.28], // pistol grip
    [0.012, 0.012, 0.07, 0, -0.008, -0.045, black], // trigger guard
    [0.008, 0.03, 0.008, 0, 0.004, -0.04, light], // trigger
    [0.032, 0.036, 0.065, 0, 0.135, -0.08, black], // sight
    [0.036, 0.012, 0.07, 0, 0.158, -0.08, light],
    [0.03, 0.065, 0.034, 0, 0.0, -0.31, black] // foregrip
  ], 1);
  g.add(new THREE.Mesh(solid, PAINT()));
  const mag = new THREE.Mesh(blocks([[0.042, 0.13, 0.065, 0, -0.065, 0, '#3c434c'], [0.046, 0.02, 0.07, 0, -0.125, 0, black], [0.044, 0.05, 0.004, 0, -0.06, 0.034, accent]], 1), PAINT());
  mag.position.set(0, 0.03, -0.14);
  mag.rotation.x = 0.18;
  mag.userData.home = { position: mag.position.clone(), rx: mag.rotation.x };
  g.add(mag);
  g.add(new THREE.Mesh(blocks([[0.01, 0.026, 0.09, 0.037, 0.062, -0.18, accent], [0.01, 0.026, 0.09, -0.037, 0.062, -0.18, accent], [0.012, 0.012, 0.004, 0, 0.136, -0.047, '#ff3a3a']], 1), LAMP()));
  const flash = new THREE.Mesh(flashGeo(), flashMat());
  flash.position.set(0, 0.068, -0.61);
  flash.visible = false;
  g.add(flash);
  g.userData = { muzzle: new THREE.Vector3(0, 0.068, -0.61), mag, flash };
  return g;
}

// --- the first-person rifle -------------------------------------------------------------------------------------

const smooth = (u) => u * u * (3 - 2 * u);
/** Piecewise interpolation through `[time, [x, y, z]]` keys, smoothstepped per segment. */
function track(keys, t, out) {
  if (t <= keys[0][0]) return out.fromArray(keys[0][1]);
  for (let i = 1; i < keys.length; i++) {
    const [t1, b, ease] = keys[i];
    if (t <= t1) {
      const [t0, a] = keys[i - 1], u = (t - t0) / (t1 - t0), w = ease === 'in' ? u * u : smooth(u);
      return out.set(a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w, a[2] + (b[2] - a[2]) * w);
    }
  }
  return out.fromArray(keys[keys.length - 1][1]);
}

// The reload, 1.6 s, in rifle space: the magazine's offset from its seat, and where the left hand is.
const RELOAD = 1.6;
const MAG_KEYS = [[0.32, [0, 0, 0]], [0.42, [0, -0.03, 0.005]], [0.78, [0.03, -0.55, 0.06], 'in'], [0.85, [0, -0.36, 0.04]], [1.05, [0, -0.05, 0]], [1.15, [0, 0, 0]]];
const HAND_HOME = [0, -0.01, -0.3];
const HAND_KEYS = [[0, HAND_HOME], [0.3, [0, -0.13, -0.14]], [0.42, [0, -0.16, -0.14]], [0.62, [-0.04, -0.46, -0.08]], [0.85, [0, -0.47, -0.12]],
  [1.05, [0, -0.18, -0.13]], [1.15, [0, -0.13, -0.13]], [1.4, HAND_HOME]];
const REST_AT = new THREE.Vector3(0.21, -0.235, -0.6);

/** A gloved hand and forearm on its wrist: +z runs up the arm toward the elbow. */
function vmArm(look) {
  look = resolveLook(look);
  const g = new THREE.Group();
  g.add(new THREE.Mesh(blocks([[0.075, 0.085, 0.105, 0, 0, 0, '#5a5048'], [0.079, 0.022, 0.06, 0, 0.034, -0.022, '#3e3832'],
    [0.088, 0.088, 0.04, 0, 0, 0.07, look.accent], [0.086, 0.086, 0.4, 0, 0, 0.29, look.shirt]], 1), PAINT()));
  return g;
}

/** The rifle you hold in first person. It has its own scene and lights and is drawn in a second pass after a depth
 *  clear, so it never sinks into a wall:
 *    renderer.autoClear = false; renderer.clear(); renderer.render(scene, cam);
 *    renderer.clearDepth(); viewmodel.place(cam); renderer.render(viewmodel.scene, viewmodel.camera);
 *  Call `frame(dt, …)` every frame. `fire()` answers false when the magazine is empty (it starts a reload) or a reload
 *  is running; `ammo`, `magSize` and `reloading` are for the HUD. `muzzleWorld(v)` is where a tracer starts. */
export class Viewmodel {
  constructor({ look = DEFAULT_LOOK, accent = '#58f0ff', magSize = 24 } = {}) {
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.HemisphereLight('#9fb4d8', '#1a1410', 1.1));
    const sun = new THREE.DirectionalLight('#fff4e0', 1.5);
    sun.position.set(0.6, 0.8, 0.3);
    this.scene.add(sun);
    this.camera = new THREE.PerspectiveCamera(70, 1, 0.01, 10);
    this.scene.add(this.camera);
    // A fill from over the left shoulder, riding with the camera, so the side of the rifle you see is never black.
    const fill = new THREE.DirectionalLight('#c8d8f0', 0.9);
    fill.position.set(-0.6, 0.5, 0.4);
    fill.target.position.set(0, 0, -1);
    this.camera.add(fill, fill.target);
    this.hold = new THREE.Group(); // sway, bob, sprint, equip, the reload's tilt
    this.camera.add(this.hold);
    this.recoil = new THREE.Group(); // fire's kick
    this.hold.add(this.recoil);
    this.rifle = rifle({ accent });
    this.recoil.add(this.rifle);
    this.handR = vmArm(look);
    this.handL = vmArm(look);
    this.rifle.add(this.handR, this.handL);
    this.aimArm(this.handR, _vm.set(0, -0.035, 0.03), _vm2.set(0.11, -0.2, 0.32));
    this.magSize = magSize;
    this.ammo = magSize;
    this.reloading = false;
    this.t = 0;
    this.rt = 0; // time into the reload
    this.eq = 1; // 0 lowered out of view … 1 up
    this.kz = this.kp = this.kr = 0; // recoil: back, muzzle up, roll
    this.sprintK = this.moveK = this.swayX = this.swayY = 0;
    this.flashT = 0;
    this.frame(0);
  }

  /** Points an arm group from its wrist at rifle-space `wrist` up toward `elbow`. */
  aimArm(arm, wrist, elbow) {
    arm.position.copy(wrist);
    arm.quaternion.setFromRotationMatrix(_vmM.lookAt(elbow, wrist, _vmUp));
  }

  /** Matches the main camera: its world place, field of view and aspect. */
  place(camera) {
    camera.updateMatrixWorld();
    camera.matrixWorld.decompose(this.camera.position, this.camera.quaternion, _vm);
    if (this.camera.fov !== camera.fov || this.camera.aspect !== camera.aspect) {
      this.camera.fov = camera.fov;
      this.camera.aspect = camera.aspect;
      this.camera.updateProjectionMatrix();
    }
    this.camera.updateMatrixWorld();
  }

  /** Raises the rifle into view over 0.4 s. */
  equip() {
    this.eq = 0;
  }

  /** One shot: recoil, a 50 ms flash, a little roll. False (and no shot) when empty or reloading. */
  fire() {
    if (this.reloading) return false;
    if (this.ammo <= 0) return this.reload(), false;
    this.ammo--;
    this.kz = Math.min(0.12, this.kz + 0.05);
    this.kp = Math.min(0.3, this.kp + 0.075);
    this.kr += (Math.random() - 0.5) * 0.08;
    this.flashT = 0.05;
    const f = this.rifle.userData.flash;
    f.rotation.z = Math.random() * Math.PI;
    f.scale.setScalar(0.8 + Math.random() * 0.45);
    if (this.ammo === 0) this.reload();
    return true;
  }

  /** The 1.6 s magazine change; false if one is running or the magazine is full. */
  reload() {
    if (this.reloading || this.ammo === this.magSize) return false;
    this.reloading = true;
    this.rt = 0;
    return true;
  }

  /** Animates one frame. `moving`/`sprint` from the walker's keys, `bob` its bob phase (`walker.bob`), `lookDx`/
   *  `lookDy` this frame's mouse movement in pixels (the rifle lags against it). */
  frame(dt, { moving = false, sprint = false, bob = 0, lookDx = 0, lookDy = 0 } = {}) {
    dt = clamp(dt, 0, 0.1);
    const e = (r) => 1 - Math.exp(-dt * r);
    this.t += dt;
    this.sprintK += ((moving && sprint ? 1 : 0) - this.sprintK) * e(8);
    this.moveK += ((moving ? 1 : 0) - this.moveK) * e(6);
    this.swayX += (clamp(-lookDx * 0.0005, -0.035, 0.035) - this.swayX) * e(9);
    this.swayY += (clamp(lookDy * 0.0005, -0.03, 0.03) - this.swayY) * e(9);
    this.eq = Math.min(1, this.eq + dt / 0.4);
    const up = 1 - (1 - this.eq) ** 3;
    const d = Math.exp(-dt * 16);
    this.kz *= d, this.kp *= d, this.kr *= Math.exp(-dt * 9);
    // Hold: rest place, idle drift, walk bob (vertical with each step, sideways every two), look lag, sprint, equip.
    const amp = this.moveK * (1 + this.sprintK * 0.9), s = this.sprintK, t = this.t;
    let rl = 0;
    if (this.reloading) {
      this.rt += dt;
      rl = smooth(clamp(this.rt / 0.3, 0, 1)) * (1 - smooth(clamp((this.rt - 1.3) / 0.3, 0, 1)));
      if (this.rt >= 1.15 && this.ammo < this.magSize) this.ammo = this.magSize;
      if (this.rt >= RELOAD) this.reloading = false;
    }
    this.hold.position.set(
      REST_AT.x + Math.sin(t * 0.9) * 0.003 + Math.sin(bob * 0.5) * 0.013 * amp + this.swayX - s * 0.05 - rl * 0.07,
      REST_AT.y + Math.sin(t * 1.3) * 0.003 + Math.sin(bob) * 0.009 * amp + this.swayY - s * 0.08 - (1 - up) * 0.32 + rl * 0.05,
      REST_AT.z + s * 0.05 + rl * 0.06
    );
    // The reload rolls the rifle clockwise and lifts its muzzle, turning the magazine well toward you.
    this.hold.rotation.set(-s * 0.45 - (1 - up) * 0.9 + this.swayY * 0.8 + rl * 0.3, this.swayX * 1.4 + s * 0.5 + 0.03, s * 0.25 - rl * 0.6 + Math.sin(bob * 0.5) * 0.02 * amp);
    this.recoil.position.set(0, this.kp * 0.06, this.kz);
    this.recoil.rotation.set(this.kp, 0, this.kr);
    // The magazine and the left hand.
    const { mag, flash } = this.rifle.userData, home = mag.userData.home;
    const r = this.reloading ? this.rt : 99;
    track(MAG_KEYS, r, _vm);
    mag.position.copy(home.position).add(_vm);
    mag.rotation.x = home.rx + (r > 0.42 && r < 0.8 ? (r - 0.42) * 3 : 0);
    mag.visible = !(r > 0.78 && r < 0.85);
    track(HAND_KEYS, r, _vm);
    this.aimArm(this.handL, _vm, _vm2.copy(_vm).add(_vmL));
    this.flashT -= dt;
    flash.visible = this.flashT > 0;
  }

  /** The muzzle in the main camera's world (call after `place`): where a tracer starts. */
  muzzleWorld(target = new THREE.Vector3()) {
    this.rifle.updateWorldMatrix(true, false);
    return target.copy(this.rifle.userData.muzzle).applyMatrix4(this.rifle.matrixWorld);
  }
}
const _vm = new THREE.Vector3(), _vm2 = new THREE.Vector3(), _vmM = new THREE.Matrix4(), _vmUp = new THREE.Vector3(0, 1, 0);
const _vmL = new THREE.Vector3(-0.15, -0.25, 0.3); // the left forearm runs from the wrist down and back to the elbow
