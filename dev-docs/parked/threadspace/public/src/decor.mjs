// The dressing for rooms: panelled walls, deck plating and ceiling tiles as canvas textures mapped in metres, lit signs
// over doors, glowing console screens, hazard stripes, pipes, and `bake`, which merges every still mesh of a room into
// one mesh per material. A room has a few hundred boxes and would cost a few hundred draw calls; baked, a dozen or two.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mulberry } from './util.mjs';

const cache = new Map();

function canvasTex(key, w, h, draw, { repeat = true } = {}) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  cache.set(key, t);
  return t;
}

/** A wall panel 1.5 m wide and the room's height tall: a dark kick panel to 0.9 m, a rail, a light upper panel with an
 *  inset, seams, rivets, a vent here and there. Multiplied by the material's colour, so one texture dresses every room. */
function wallTex() {
  return canvasTex('wall', 256, 512, (g, w, h) => {
    const r = mulberry(5);
    g.fillStyle = '#d4d8de';
    g.fillRect(0, 0, w, h);
    const kick = h * 0.7; // canvas y of the rail: the bottom 30% is the kick panel (≈0.9 m of 3)
    g.fillStyle = '#8e949d';
    g.fillRect(0, kick, w, h - kick);
    g.fillStyle = '#5c626b';
    g.fillRect(0, kick - 10, w, 14); // the rail
    g.fillStyle = '#b8bdc5';
    g.fillRect(0, kick - 12, w, 3);
    g.strokeStyle = 'rgba(40,44,52,0.55)';
    g.lineWidth = 3;
    g.strokeRect(14, 22, w - 28, kick - 52); // the upper panel's inset
    g.fillStyle = 'rgba(255,255,255,0.18)';
    g.fillRect(16, 24, w - 32, 3);
    g.fillStyle = '#3c424b';
    g.fillRect(0, 0, 4, h);
    g.fillRect(w - 4, 0, 4, h); // seams between panels
    g.fillRect(0, 0, w, 8); // the cove under the ceiling
    g.fillStyle = '#6a7079';
    for (const y of [36, kick - 40, kick + 30, h - 26]) for (const x of [22, w - 22]) g.fillRect(x - 3, y - 3, 6, 6); // rivets
    if (r() < 2) {
      g.fillStyle = '#4a5059';
      g.fillRect(w * 0.3, kick + 40, w * 0.4, 46);
      g.fillStyle = '#2a2f36';
      for (let k = 0; k < 6; k++) g.fillRect(w * 0.32, kick + 46 + k * 7, w * 0.36, 3); // a vent in the kick panel
    }
    g.fillStyle = 'rgba(30,34,40,0.35)';
    g.fillRect(w * 0.5 - 1, 30, 2, kick - 70);
  });
}

/** Deck plating, 2 m a tile: four plates with dark seams, a tread of dots, bolts at the corners. */
function floorTex() {
  return canvasTex('floor', 256, 256, (g, w, h) => {
    g.fillStyle = '#c4c8ce';
    g.fillRect(0, 0, w, h);
    for (const [x, y] of [[0, 0], [128, 0], [0, 128], [128, 128]]) {
      const grd = g.createLinearGradient(x, y, x + 128, y + 128);
      grd.addColorStop(0, '#cdd1d7');
      grd.addColorStop(1, '#b4b9c0');
      g.fillStyle = grd;
      g.fillRect(x + 3, y + 3, 122, 122);
      g.fillStyle = 'rgba(60,64,72,0.35)';
      for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) g.fillRect(x + 12 + i * 14 + (j % 2) * 7, y + 12 + j * 14, 4, 2);
      g.fillStyle = '#6a7079';
      for (const [bx, by] of [[10, 10], [118, 10], [10, 118], [118, 118]]) g.fillRect(x + bx - 3, y + by - 3, 6, 6);
    }
    g.fillStyle = '#4a5059';
    g.fillRect(0, 0, w, 3);
    g.fillRect(0, 126, w, 4);
    g.fillRect(0, 0, 3, h);
    g.fillRect(126, 0, 4, h);
  });
}

/** Ceiling tiles, 1.5 m: a grid of panels with a vent in some. */
function ceilTex() {
  return canvasTex('ceil', 256, 256, (g, w, h) => {
    g.fillStyle = '#9ca2ab';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#5a6069';
    g.fillRect(0, 0, w, 6);
    g.fillRect(0, 0, 6, h);
    g.fillStyle = '#868c95';
    g.fillRect(40, 40, 176, 176);
    g.fillStyle = '#5a6069';
    for (let k = 0; k < 9; k++) g.fillRect(60, 60 + k * 16, 136, 5);
  });
}

/** Yellow and black, diagonal. */
export function hazardTex() {
  return canvasTex('hazard', 128, 128, (g, w, h) => {
    g.fillStyle = '#e8b830';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#1e1e1e';
    for (let i = -4; i < 8; i++) {
      g.beginPath();
      g.moveTo(i * 32, 0);
      g.lineTo(i * 32 + 16, 0);
      g.lineTo(i * 32 + 16 + 128, 128);
      g.lineTo(i * 32 + 128, 128);
      g.closePath();
      g.fill();
    }
  });
}

/** A room's surfaces, tinted: `wall`, `floor`, `ceil`, `trim`. World-mapped (bake rewrites their uv in metres). */
export function surfaces({ wall = '#8a929e', floor = '#6d737c', ceil = '#7a808a', trim = '#30353d' } = {}) {
  const key = `surf|${wall}|${floor}|${ceil}|${trim}`;
  if (cache.has(key)) return cache.get(key);
  const m = (color, map, uv) => {
    const x = new THREE.MeshLambertMaterial({ color, map, flatShading: true });
    x.userData.uv = uv; // metres per texture repeat across, and up
    return x;
  };
  const s = { wall: m(wall, wallTex(), [1.5, 3]), floor: m(floor, floorTex(), [2, 2]), ceil: m(ceil, ceilTex(), [1.5, 1.5]), trim: new THREE.MeshLambertMaterial({ color: trim, flatShading: true }) };
  cache.set(key, s);
  return s;
}

export function hazardMat() {
  if (!cache.has('hazardMat')) {
    const m = new THREE.MeshLambertMaterial({ map: hazardTex(), flatShading: true });
    m.userData.uv = [0.6, 0.6];
    cache.set('hazardMat', m);
  }
  return cache.get('hazardMat');
}

/** A lit sign: words on a dark plate with a coloured edge, glowing so it reads in a dim corridor. */
export function sign(text, color = '#9fd4ff', { w = 1.6, h = 0.34 } = {}) {
  const key = `sign|${text}|${color}`;
  const tex = canvasTex(key, 512, Math.round((512 * h) / w), (g, cw, ch) => {
    g.fillStyle = '#0b1018';
    g.fillRect(0, 0, cw, ch);
    g.strokeStyle = color;
    g.lineWidth = 6;
    g.strokeRect(5, 5, cw - 10, ch - 10);
    g.fillStyle = color;
    g.font = `600 ${Math.round(ch * 0.52)}px ui-monospace, Menlo, monospace`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, cw / 2, ch / 2 + 2);
  }, { repeat: false });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
}

/** A console screen: `kind` is radar, nav, status, target, reactor, manifest or text, drawn once in `color`. */
export function screen(kind, color = '#58b0ff', w = 0.9, h = 0.5) {
  const key = `screen|${kind}|${color}`;
  const tex = canvasTex(key, 256, Math.round((256 * h) / w), (g, cw, ch) => {
    const r = mulberry(kind.length * 7 + color.length);
    g.fillStyle = '#04080e';
    g.fillRect(0, 0, cw, ch);
    g.strokeStyle = color;
    g.fillStyle = color;
    g.lineWidth = 2;
    g.globalAlpha = 0.9;
    const cx = cw / 2, cy = ch / 2, R = Math.min(cw, ch) * 0.42;
    if (kind === 'radar' || kind === 'target') {
      for (const k of [1, 0.66, 0.33]) (g.beginPath(), g.arc(cx, cy, R * k, 0, Math.PI * 2), g.stroke());
      g.beginPath();
      g.moveTo(cx - R, cy);
      g.lineTo(cx + R, cy);
      g.moveTo(cx, cy - R);
      g.lineTo(cx, cy + R);
      g.stroke();
      if (kind === 'radar') {
        g.globalAlpha = 0.35;
        g.beginPath();
        g.moveTo(cx, cy);
        g.arc(cx, cy, R, -0.9, -0.2);
        g.fill();
        g.globalAlpha = 1;
        for (let i = 0; i < 6; i++) g.fillRect(cx + (r() - 0.5) * R * 1.4, cy + (r() - 0.5) * R * 1.4, 5, 5);
      } else {
        g.strokeRect(cx + R * 0.2, cy - R * 0.5, R * 0.4, R * 0.4);
        g.fillText('LOCK', cx + R * 0.2, cy + R * 0.2);
      }
    } else if (kind === 'nav') {
      g.globalAlpha = 0.5;
      for (let i = 0; i < 40; i++) g.fillRect(r() * cw, r() * ch, 2, 2);
      g.globalAlpha = 1;
      const pts = [[0.12, 0.7], [0.4, 0.35], [0.66, 0.6], [0.88, 0.25]];
      g.setLineDash([6, 5]);
      g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(x * cw, y * ch) : g.moveTo(x * cw, y * ch)));
      g.stroke();
      g.setLineDash([]);
      for (const [x, y] of pts) (g.beginPath(), g.arc(x * cw, y * ch, 7, 0, Math.PI * 2), g.stroke());
    } else if (kind === 'reactor') {
      g.beginPath();
      for (let x = 0; x < cw; x += 4) g.lineTo(x, cy + Math.sin(x * 0.08) * ch * 0.25 + (r() - 0.5) * 6);
      g.stroke();
      g.fillRect(12, ch - 22, cw * 0.7, 8);
    } else {
      // status, manifest, text: rows of bars and lines
      const rows = Math.floor(ch / 22);
      for (let i = 0; i < rows; i++) {
        g.globalAlpha = 0.85;
        g.fillRect(12, 12 + i * 22, 30 + r() * (cw * 0.35), 8);
        g.globalAlpha = 0.4;
        g.fillRect(cw * 0.55, 12 + i * 22, (cw * 0.4) * (0.3 + r() * 0.7), 8);
      }
    }
    g.globalAlpha = 0.25;
    g.strokeRect(3, 3, cw - 6, ch - 6);
  }, { repeat: false });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
}

/** A pipe from a to b (host-frame points), `r` thick. */
export function pipe(a, b, r = 0.06, material) {
  const d = new THREE.Vector3().subVectors(b, a);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 6), material);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return m;
}

/** Merges every still mesh directly or deeply under `group` (not those marked `userData.live`, not `skip`) into one mesh
 *  per material, in the group's frame. Materials with `userData.uv` get their uv rewritten in metres from each face's
 *  facing, so a 3 m wall and a 30 m wall carry their panels at the same size. Returns the number of meshes merged. */
export function bake(group, { skip = [], floorY = 0 } = {}) {
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const byMat = new Map();
  const dead = [];
  group.traverse((o) => {
    if (!o.isMesh || o.userData.live || skip.some((s) => s === o || isUnder(o, s)) || hasLive(o)) return;
    if (Array.isArray(o.material) || o.isInstancedMesh || o.isSkinnedMesh) return;
    let geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
    if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((geo.attributes.position.count) * 2), 2));
    if (!geo.attributes.normal) geo.computeVertexNormals();
    geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    const uv = o.material.userData.uv;
    if (uv) worldUV(geo, uv, floorY);
    if (!byMat.has(o.material)) byMat.set(o.material, []);
    byMat.get(o.material).push(geo);
    dead.push(o);
  });
  for (const o of dead) o.removeFromParent();
  for (const [material, geos] of byMat) {
    const merged = mergeGeometries(geos, false);
    if (!merged) continue;
    const m = new THREE.Mesh(merged, material);
    m.userData.baked = true;
    if (material.transparent) m.renderOrder = 1;
    group.add(m);
  }
  return dead.length;
}

function isUnder(o, s) {
  for (let p = o.parent; p; p = p.parent) if (p === s) return true;
  return false;
}

function hasLive(o) {
  for (let p = o.parent; p; p = p.parent) if (p.userData?.live) return true;
  return false;
}

/** uv from position by the face's main axis: walls run (along, up), floors and ceilings (x, z). */
function worldUV(geo, [su, sv], floorY) {
  const p = geo.attributes.position, n = geo.attributes.normal, t = geo.attributes.uv;
  for (let i = 0; i < p.count; i += 3) {
    // one normal per triangle (flat shading), from its first vertex
    const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i)), nz = Math.abs(n.getZ(i));
    for (let k = i; k < i + 3; k++) {
      const x = p.getX(k), y = p.getY(k), z = p.getZ(k);
      if (ny >= nx && ny >= nz) t.setXY(k, x / su, z / sv);
      else if (nx >= nz) t.setXY(k, z / su, (y - floorY) / sv);
      else t.setXY(k, x / su, (y - floorY) / sv);
    }
  }
  t.needsUpdate = true;
}
