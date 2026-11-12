// The creatures the curse made (SCOPE.md §3): cute-spooky, drawn in code, each something good the curse twisted. Beating
// one frees it: it turns back into what it was and flies away. Nothing here is ever killed.
//   moth      the Tatter Moth (Dressing Room ★): a plump dusty moth on lace wings → a silk butterfly
//   soot      the Soot Sprite (Kitchen ★★): a fuzzy soot ball with ember eyes → a hearth-fire fairy
//   grimoire  the Grumpy Grimoire (Library ★★★★): a snapping old book → a kind golden storybook
//
// A creature stands with its origin on the floor and faces +Z. The battle drives it through promises:
//   wake() rises out of the dark · hurt() flashes and reels · attack(target) resolves AT IMPACT · free() resolves when it
//   has flown away. update(dt) runs every frame, during all of them (the promises are settled from inside update).
// Geometries and textures are shared between creatures; materials are each creature's own (they flash on their own).
import * as THREE from 'three';
import { canvasTexture, dotTexture } from './look.mjs';

export const KINDS = ['moth', 'soot', 'grimoire'];

const TAU = Math.PI * 2;
const WHITE = new THREE.Color(1, 1, 1);
const lerp = (a, b, k) => a + (b - a) * k;
const easeOut = (k) => 1 - (1 - k) ** 3;
const easeIn = (k) => k * k * k;
const backOut = (k) => 1 + 2.70158 * (k - 1) ** 3 + 1.70158 * (k - 1) ** 2;
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _size = new THREE.Vector2();

// A small seeded random (mulberry32), so two soot sprites with different seeds bounce differently.
function rng(seed) {
  let s = (seed * 9301 + 49297) >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Particles: a fixed pool of soft dots in world space, each with its own colour, size, fade and drift ──────────────
const P_VERT = /* glsl */ `
uniform float uScale;
attribute float size;
attribute float alpha;
attribute vec3 tint;
varying float vAlpha;
varying vec3 vTint;
void main() {
  vAlpha = alpha;
  vTint = tint;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = size * uScale / max(0.1, -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const P_FRAG = /* glsl */ `
uniform sampler2D map;
varying float vAlpha;
varying vec3 vTint;
void main() {
  float a = texture2D(map, gl_PointCoord).a * vAlpha;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vTint, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

class Particles {
  constructor(max, additive) {
    this.max = max;
    this.next = 0;
    this.pos = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.tint = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.alpha = new Float32Array(max);
    this.life = new Float32Array(max);
    this.span = new Float32Array(max);
    this.size0 = new Float32Array(max);
    this.grav = new Float32Array(max);
    this.drag = new Float32Array(max);
    this.grow = new Float32Array(max);
    const g = new THREE.BufferGeometry();
    const attr = (name, arr, n) => g.setAttribute(name, new THREE.BufferAttribute(arr, n).setUsage(THREE.DynamicDrawUsage));
    attr('position', this.pos, 3);
    attr('tint', this.tint, 3);
    attr('size', this.size, 1);
    attr('alpha', this.alpha, 1);
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: dotTexture() }, uScale: { value: 600 } },
      vertexShader: P_VERT,
      fragmentShader: P_FRAG,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = additive ? 6 : 5;
    // World size → pixels for whatever camera and canvas draw it.
    this.points.onBeforeRender = (renderer, scene, camera) => {
      renderer.getDrawingBufferSize(_size);
      this.mat.uniforms.uScale.value = (_size.y * 0.5) / Math.tan(THREE.MathUtils.degToRad(camera.fov ?? 45) * 0.5);
    };
    this.awake = false;
  }

  attach(root) {
    if (this.points.parent !== root) root.add(this.points);
  }

  emit(x, y, z, vx, vy, vz, r, g, b, size, span, grav = 0, drag = 0, grow = 0) {
    const i = this.next;
    this.next = (i + 1) % this.max;
    const j = i * 3;
    this.pos[j] = x, this.pos[j + 1] = y, this.pos[j + 2] = z;
    this.vel[j] = vx, this.vel[j + 1] = vy, this.vel[j + 2] = vz;
    this.tint[j] = r, this.tint[j + 1] = g, this.tint[j + 2] = b;
    this.size0[i] = size;
    this.size[i] = 0;
    this.alpha[i] = 0;
    this.life[i] = this.span[i] = span;
    this.grav[i] = grav, this.drag[i] = drag, this.grow[i] = grow;
    this.geo.attributes.tint.needsUpdate = true;
    this.awake = true;
  }

  update(dt) {
    if (!this.awake) return;
    let any = false;
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.alpha[i] = this.size[i] = 0;
        continue;
      }
      any = true;
      const j = i * 3, d = Math.exp(-this.drag[i] * dt);
      this.vel[j + 1] -= this.grav[i] * dt;
      this.vel[j] *= d, this.vel[j + 1] *= d, this.vel[j + 2] *= d;
      this.pos[j] += this.vel[j] * dt, this.pos[j + 1] += this.vel[j + 1] * dt, this.pos[j + 2] += this.vel[j + 2] * dt;
      const age = this.span[i] - this.life[i];
      this.alpha[i] = Math.min(1, age / 0.06) * Math.min(1, this.life[i] / (this.span[i] * 0.45));
      this.size[i] = this.size0[i] * (1 + (this.grow[i] * age) / this.span[i]);
    }
    const a = this.geo.attributes;
    a.position.needsUpdate = a.size.needsUpdate = a.alpha.needsUpdate = true;
    this.awake = any;
  }

  dispose() {
    this.points.removeFromParent();
    this.geo.dispose();
    this.mat.dispose();
  }
}

// ── Shared pieces: textures drawn once, geometries made once ─────────────────────────────────────────────────────────
const cache = new Map();
const once = (key, make) => cache.get(key) ?? (cache.set(key, make()), cache.get(key));

// A piece of a sphere of `r`, centred on the direction `yaw` (towards +X) and `pitch` (up) from +Z, `w` × `h` radians
// across: a face decal that hugs a round head. Its texture's left is the viewer's left, its top is up.
function patchGeo(r, yaw, pitch, w, h) {
  return once(`patch ${r} ${yaw} ${pitch} ${w} ${h}`, () => new THREE.SphereGeometry(r, 10, 10, Math.PI / 2 + yaw - w / 2, w, Math.PI / 2 - pitch - h / 2, h));
}

// An anime eye, 256², with room above it for a brow. `side` 'L' is the eye on the viewer's left: its lid and brow slope
// down towards the nose (the canvas's right), which is what makes the face sulk.
function eyeTexture(style, side, glow = false) {
  return once(`eye ${style} ${side} ${glow}`, () =>
    canvasTexture(256, 256, (g) => {
      const S = {
        moth: { sclera: null, iris: ['#f4d9ff', '#b07cf0', '#5a2d9c'], pupil: '#1c0b2e', lid: '#5d4d7c', brow: '#2c1f40', ring: '#2c1f40' },
        soot: { sclera: '#fffdf6', iris: ['#ffe9a0', '#ff9a2e', '#c2410c'], pupil: '#1a0800', lid: '#121014', brow: '#0b0a0c', ring: '#0b0a0c' },
        grim: { sclera: '#3a0f2e', iris: ['#fff2a8', '#ffb21f', '#c2410c'], pupil: '#1a0410', lid: '#4a1f3d', brow: '#d9a441', ring: '#d9a441', slit: true }
      }[style];
      const flip = side === 'L' ? 1 : -1;
      g.save();
      g.translate(128, 0);
      g.scale(flip, 1);
      g.translate(-128, 0);
      // The eye's outline, lower in the canvas than its middle: the brow needs the space above.
      const eye = () => {
        g.beginPath();
        g.ellipse(128, 156, 92, 94, 0, 0, TAU);
      };
      eye();
      g.fillStyle = S.sclera ? (glow ? '#7a7a7a' : S.sclera) : S.iris[1];
      g.fill();
      g.save();
      eye();
      g.clip();
      // The iris: dark at the top, bright underneath, the way anime eyes are lit.
      const ix = 128 + 10, iy = 168, ir = S.sclera ? 64 : 92;
      const grad = g.createLinearGradient(0, iy - ir, 0, iy + ir);
      grad.addColorStop(0, S.iris[2]);
      grad.addColorStop(0.55, S.iris[1]);
      grad.addColorStop(1, S.iris[0]);
      g.fillStyle = grad;
      g.beginPath();
      g.arc(ix, iy, ir, 0, TAU);
      g.fill();
      g.fillStyle = S.pupil;
      g.beginPath();
      if (S.slit) g.ellipse(ix, iy, 13, 50, 0, 0, TAU);
      else g.arc(ix, iy - 4, S.sclera ? 30 : 40, 0, TAU);
      g.fill();
      // The sulky lid: a band across the top, lower on the inside.
      g.fillStyle = S.lid;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(256, 0);
      g.lineTo(256, 112);
      g.lineTo(0, 80);
      g.closePath();
      g.fill();
      g.strokeStyle = S.ring;
      g.lineWidth = 12;
      g.beginPath();
      g.moveTo(0, 80);
      g.lineTo(256, 112);
      g.stroke();
      g.restore();
      g.restore();
      // Highlights stay on the same side in both eyes (one light).
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(96, 140, 20, 0, TAU);
      g.fill();
      g.beginPath();
      g.arc(160, 212, 9, 0, TAU);
      g.fill();
      g.save();
      g.translate(128, 0);
      g.scale(flip, 1);
      g.translate(-128, 0);
      g.strokeStyle = S.ring;
      g.lineWidth = 9;
      eye();
      g.stroke();
      // The brow, above and steeper than the lid.
      g.strokeStyle = S.brow;
      g.lineWidth = 22;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(34, 26);
      g.quadraticCurveTo(140, 22, 226, 58);
      g.stroke();
      g.restore();
    })
  );
}

// The Grimoire's eye once it is freed: closed, happy, golden.
function happyEyeTexture() {
  return once('eye happy', () =>
    canvasTexture(256, 256, (g) => {
      const grad = g.createRadialGradient(128, 150, 10, 128, 150, 110);
      grad.addColorStop(0, '#fff6c8');
      grad.addColorStop(1, '#f0b83c');
      g.fillStyle = grad;
      g.beginPath();
      g.ellipse(128, 156, 92, 94, 0, 0, TAU);
      g.fill();
      g.strokeStyle = '#7a3f0a';
      g.lineWidth = 16;
      g.lineCap = 'round';
      g.beginPath();
      g.arc(128, 190, 52, Math.PI * 1.15, Math.PI * 1.85);
      g.stroke();
      for (const a of [1.2, 1.5, 1.8]) {
        g.beginPath();
        g.moveTo(128 + Math.cos(a * Math.PI) * 52, 190 + Math.sin(a * Math.PI) * 52);
        g.lineTo(128 + Math.cos(a * Math.PI) * 74, 190 + Math.sin(a * Math.PI) * 74);
        g.stroke();
      }
    })
  );
}

// A small grumpy mouth. `ember`: a soot sprite's, open and glowing inside.
function mouthTexture(style) {
  return once(`mouth ${style}`, () =>
    canvasTexture(128, 64, (g) => {
      g.lineCap = 'round';
      g.lineJoin = 'round';
      if (style === 'soot') {
        g.fillStyle = '#ff7a1a';
        g.beginPath();
        g.moveTo(30, 50);
        g.quadraticCurveTo(64, 0, 98, 50);
        g.quadraticCurveTo(64, 36, 30, 50);
        g.fill();
        g.fillStyle = '#ffe08a';
        g.beginPath();
        g.ellipse(64, 38, 14, 5, 0, 0, TAU);
        g.fill();
        return;
      }
      g.strokeStyle = '#2a1530';
      g.lineWidth = 8;
      g.beginPath();
      g.moveTo(26, 46);
      g.quadraticCurveTo(64, 14, 102, 46);
      g.stroke();
      // One small fang, which makes it cute rather than cross.
      g.fillStyle = '#fffaf0';
      g.beginPath();
      g.moveTo(76, 29);
      g.lineTo(88, 34);
      g.lineTo(80, 48);
      g.closePath();
      g.fill();
    })
  );
}

// The moth's wings: a dusty lace pattern, tattered at the edge. The root is at the canvas's left.
function wingTexture(which) {
  return once(`wing ${which}`, () =>
    canvasTexture(256, 256, (g) => {
      const r = rng(which === 'upper' ? 3 : 7);
      const shape = () => {
        g.beginPath();
        if (which === 'upper') {
          g.moveTo(4, 172);
          g.bezierCurveTo(50, 60, 160, 12, 250, 22);
          g.bezierCurveTo(254, 96, 236, 156, 196, 192);
          g.bezierCurveTo(136, 220, 60, 214, 4, 204);
        } else {
          g.moveTo(4, 36);
          g.bezierCurveTo(90, 26, 200, 70, 226, 146);
          g.bezierCurveTo(232, 214, 150, 252, 80, 236);
          g.bezierCurveTo(26, 216, 8, 120, 4, 36);
        }
        g.closePath();
      };
      shape();
      const grad = g.createRadialGradient(0, which === 'upper' ? 188 : 40, 10, 0, 128, 260);
      grad.addColorStop(0, '#5b4b78');
      grad.addColorStop(0.5, '#8f7fb0');
      grad.addColorStop(1, '#c8b8de');
      g.fillStyle = grad;
      g.fill();
      g.save();
      shape();
      g.clip();
      // Lace: scalloped bands round the root, little doilies, veins.
      const ox = 0, oy = which === 'upper' ? 188 : 40;
      g.strokeStyle = 'rgba(244,236,255,0.42)';
      g.lineWidth = 2;
      for (let band = 70; band < 300; band += 46) {
        const n = Math.round(band / 9);
        for (let i = 0; i < n; i++) {
          const a = -Math.PI / 2 + (Math.PI * i) / n;
          g.beginPath();
          g.arc(ox + Math.cos(a) * band, oy + Math.sin(a) * band, 9, 0, TAU);
          g.stroke();
        }
      }
      g.fillStyle = 'rgba(250,244,255,0.35)';
      for (let i = 0; i < 26; i++) {
        g.beginPath();
        g.arc(30 + r() * 210, 20 + r() * 220, 1.5 + r() * 2.5, 0, TAU);
        g.fill();
      }
      g.strokeStyle = 'rgba(40,28,60,0.5)';
      g.lineWidth = 3;
      for (let i = 0; i < 6; i++) {
        const a = -1.3 + i * 0.45;
        g.beginPath();
        g.moveTo(ox, oy);
        g.lineTo(ox + Math.cos(a) * 300, oy + Math.sin(a) * 300 * (which === 'upper' ? 1 : -1) * -1);
        g.stroke();
      }
      // An eye spot.
      const [ex, ey] = which === 'upper' ? [168, 92] : [140, 170];
      for (const [rad, col] of [[30, '#3a2a52'], [22, '#efe4ff'], [13, '#a67bd8'], [6, '#2a1a40']]) {
        g.fillStyle = col;
        g.beginPath();
        g.arc(ex, ey, rad, 0, TAU);
        g.fill();
      }
      g.restore();
      shape();
      g.strokeStyle = '#3d3056';
      g.lineWidth = 6;
      g.stroke();
      // Tattered: bites out of the very edge (found by walking out from the root until we leave the wing), a few holes.
      const bites = [];
      shape();
      for (let i = 0; i < 18; i++) {
        const a = which === 'upper' ? -1.45 + r() * 1.5 : -0.1 + r() * 1.5;
        let d = 20;
        while (d < 380 && g.isPointInPath(ox + Math.cos(a) * d, oy + Math.sin(a) * d)) d += 3;
        if (d < 380) bites.push([ox + Math.cos(a) * d, oy + Math.sin(a) * d, 4 + r() * 8]);
      }
      g.globalCompositeOperation = 'destination-out';
      for (const [x, y, rad] of bites) {
        g.beginPath();
        g.arc(x, y, rad, 0, TAU);
        g.fill();
      }
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.arc(70 + r() * 140, 70 + r() * 110, 2 + r() * 3, 0, TAU);
        g.fill();
      }
    })
  );
}

// A feathery antenna: a stem with fronds, the root at the bottom.
function featherTexture() {
  return once('feather', () =>
    canvasTexture(64, 256, (g) => {
      g.strokeStyle = '#e9ddfa';
      g.lineCap = 'round';
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(32, 252);
      g.quadraticCurveTo(26, 120, 36, 8);
      g.stroke();
      g.lineWidth = 2.5;
      for (let y = 30; y < 236; y += 9) {
        const w = 26 * Math.sin(((y - 20) / 230) * Math.PI) + 4;
        g.beginPath();
        g.moveTo(31, y);
        g.lineTo(31 - w, y - 12);
        g.moveTo(31, y);
        g.lineTo(31 + w, y - 12);
        g.stroke();
      }
    })
  );
}

// Fuzz: speckled stripes for the moth's body.
function fuzzTexture() {
  return once('fuzz', () =>
    canvasTexture(256, 256, (g) => {
      const r = rng(11);
      g.fillStyle = '#9484b4';
      g.fillRect(0, 0, 256, 256);
      for (let y = 128; y < 256; y += 30) {
        g.fillStyle = 'rgba(60,44,90,0.35)';
        g.fillRect(0, y, 256, 12);
      }
      for (let i = 0; i < 2200; i++) {
        g.fillStyle = r() < 0.5 ? 'rgba(255,248,255,0.16)' : 'rgba(40,28,64,0.18)';
        g.fillRect(r() * 256, r() * 256, 2, 3);
      }
    })
  );
}

// The butterfly the moth was: one half (both wings), pastel and glowing, the root at the left.
function silkTexture() {
  return once('silk', () =>
    canvasTexture(256, 256, (g) => {
      const shape = () => {
        g.beginPath();
        g.moveTo(6, 128);
        g.bezierCurveTo(30, 20, 190, -10, 240, 40);
        g.bezierCurveTo(260, 90, 190, 126, 120, 130);
        g.bezierCurveTo(200, 150, 230, 230, 170, 246);
        g.bezierCurveTo(110, 256, 30, 200, 6, 128);
        g.closePath();
      };
      shape();
      const grad = g.createLinearGradient(0, 0, 256, 256);
      grad.addColorStop(0, '#ffc6ec');
      grad.addColorStop(0.45, '#d9bcff');
      grad.addColorStop(1, '#a8ecff');
      g.fillStyle = grad;
      g.fill();
      g.save();
      shape();
      g.clip();
      g.strokeStyle = 'rgba(255,255,255,0.75)';
      g.lineWidth = 3;
      for (let i = 0; i < 7; i++) {
        const a = -1.1 + i * 0.36;
        g.beginPath();
        g.moveTo(6, 128);
        g.lineTo(6 + Math.cos(a) * 260, 128 + Math.sin(a) * 260);
        g.stroke();
      }
      g.restore();
      shape();
      g.strokeStyle = '#ffffff';
      g.lineWidth = 7;
      g.stroke();
      g.fillStyle = '#ffffff';
      for (const [x, y] of [[200, 50], [222, 72], [176, 220], [150, 232], [120, 40]]) {
        g.beginPath();
        g.arc(x, y, 6, 0, TAU);
        g.fill();
      }
    })
  );
}

// A soft wing for the hearth fairy (drawn additive, so it glows).
function fairyWingTexture() {
  return once('fairy wing', () =>
    canvasTexture(128, 128, (g) => {
      const grad = g.createRadialGradient(10, 64, 4, 10, 64, 120);
      grad.addColorStop(0, 'rgba(255,240,190,0.95)');
      grad.addColorStop(0.6, 'rgba(255,170,80,0.55)');
      grad.addColorStop(1, 'rgba(255,120,40,0)');
      g.fillStyle = grad;
      g.beginPath();
      g.ellipse(64, 56, 62, 34, -0.35, 0, TAU);
      g.fill();
    })
  );
}

// The grimoire's leather, tooled in gold: `gold` is how it looks once freed.
function leatherTexture(gold) {
  return once(`leather ${gold}`, () =>
    canvasTexture(256, 256, (g) => {
      const r = rng(5);
      g.fillStyle = gold ? '#f2d58c' : '#6a2a5a';
      g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 900; i++) {
        g.fillStyle = gold ? (r() < 0.5 ? 'rgba(255,255,240,0.12)' : 'rgba(160,100,20,0.1)') : r() < 0.5 ? 'rgba(120,60,100,0.16)' : 'rgba(20,6,16,0.2)';
        g.beginPath();
        g.arc(r() * 256, r() * 256, 2 + r() * 8, 0, TAU);
        g.fill();
      }
      const line = gold ? '#b0740f' : '#d9a441';
      g.strokeStyle = line;
      g.lineWidth = 5;
      g.strokeRect(14, 14, 228, 228);
      g.lineWidth = 2;
      g.strokeRect(26, 26, 204, 204);
      // A crescent moon and a star.
      g.fillStyle = line;
      g.beginPath();
      g.arc(118, 128, 46, 0, TAU);
      g.fill();
      g.fillStyle = gold ? '#f2d58c' : '#6a2a5a';
      g.beginPath();
      g.arc(136, 116, 42, 0, TAU);
      g.fill();
      g.fillStyle = line;
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5, rad = i % 2 ? 9 : 22;
        g.lineTo(162 + Math.cos(a) * rad, 150 + Math.sin(a) * rad);
      }
      g.fill();
      for (const [x, y] of [[26, 26], [230, 26], [26, 230], [230, 230]]) {
        g.beginPath();
        g.arc(x, y, 9, 0, TAU);
        g.fill();
      }
    })
  );
}

function parchmentTexture(kind) {
  return once(`parchment ${kind}`, () =>
    canvasTexture(128, 128, (g) => {
      const r = rng(kind.length * 13);
      g.fillStyle = '#ddd5c2';
      g.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 300; i++) {
        g.fillStyle = r() < 0.5 ? 'rgba(170,130,70,0.12)' : 'rgba(255,255,240,0.18)';
        g.fillRect(r() * 128, r() * 128, 3, 3);
      }
      if (kind === 'edge') {
        // The stack of page edges, seen from the front.
        for (let y = 0; y < 128; y += 4) {
          g.fillStyle = 'rgba(90,70,50,0.45)';
          g.fillRect(0, y, 128, 1.5);
        }
        return;
      }
      if (kind === 'text') {
        g.fillStyle = 'rgba(70,40,30,0.55)';
        for (let y = 14; y < 118; y += 9) {
          let x = 12;
          while (x < 114) {
            const w = 4 + r() * 14;
            g.fillRect(x, y, Math.min(w, 116 - x), 2.5);
            x += w + 4;
          }
        }
      }
    })
  );
}

function blobTexture() {
  return once('blob', () =>
    canvasTexture(64, 64, (g) => {
      const grad = g.createRadialGradient(32, 32, 2, 32, 32, 31);
      grad.addColorStop(0, 'rgba(0,0,0,0.6)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 64);
    })
  );
}

function glyphTexture(ch) {
  return once(`glyph ${ch}`, () =>
    canvasTexture(64, 64, (g) => {
      g.font = 'bold 46px Georgia, serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.shadowColor = 'rgba(255,220,140,1)';
      g.shadowBlur = 12;
      g.fillStyle = '#fff6d8';
      g.fillText(ch, 32, 34);
    })
  );
}

const GEO = {
  sphere: () => once('sphere', () => new THREE.SphereGeometry(1, 20, 14)),
  ball: () => once('ball', () => new THREE.SphereGeometry(1, 24, 16)),
  puff: () => once('puff', () => new THREE.IcosahedronGeometry(1, 1)),
  stick: () => once('stick', () => new THREE.CylinderGeometry(1, 1, 1, 6).translate(0, -0.5, 0)),
  // Planes whose root sits on the origin, reaching +X (wings) or +Y (feathers).
  wing: (w, h, rootY) => once(`wing ${w} ${h} ${rootY}`, () => new THREE.PlaneGeometry(w, h).translate(w / 2, rootY, 0)),
  feather: () => once('featherGeo', () => new THREE.PlaneGeometry(0.1, 0.34).translate(0, 0.17, 0)),
  cone: () => once('cone', () => new THREE.ConeGeometry(1, 1, 5).translate(0, 0.5, 0)),
  fur: () => once('fur', () => new THREE.ConeGeometry(1, 1, 4, 1, true).translate(0, 0.5, 0)),
  tooth: () => once('tooth', () => new THREE.ConeGeometry(0.028, 0.075, 4).translate(0, 0.0375, 0)),
  page: () => once('pageGeo', () => new THREE.PlaneGeometry(0.18, 0.24)),
  blob: () => once('blobGeo', () => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2))
};

// ── The base: placement, the action queue, flashing, particles, the parts every creature shares ─────────────────────
class Creature {
  constructor(kind, seed) {
    this.kind = kind;
    this.rand = rng(seed + 1 + KINDS.indexOf(kind) * 101);
    this.group = new THREE.Group();
    this.group.name = `creature-${kind}`;
    this.rig = new THREE.Group();
    this.group.add(this.rig);
    this.core = new THREE.Object3D();
    this.core.name = 'core';
    this.mats = [];
    this.tasks = [];
    this.extras = [];
    this.t = this.rand() * 10;
    this.hover = 0;
    this.off = new THREE.Vector3();
    this.lean = new THREE.Vector2(); // x: forward (+) / back, y: roll
    this.squash = 1;
    this.grow = 1;
    this.size = 1; // a variant's scale (VARIANTS)
    this.flash = 0;
    this.flashed = 0;
    this.freed = false;
    this.glow = new Particles(160, true);
    this.dust = new Particles(120, false);
    this.blobSize = 0.8;
    this.blobMat = new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
    this.blob = new THREE.Mesh(GEO.blob(), this.blobMat);
    this.blob.position.y = 0.01;
    this.group.add(this.blob);
  }

  // A material of this creature's own, registered to flash white when hurt.
  mat(m) {
    m.userData.e0 = m.emissive?.clone() ?? null;
    m.userData.ei0 = m.emissiveIntensity ?? 0;
    this.mats.push(m);
    return m;
  }

  // Runs fn(k, dt) for `dur` seconds (k 0 → 1) from inside update(); resolves when it ends.
  run(dur, fn = null) {
    return new Promise((res) => this.tasks.push({ t: 0, dur, fn, res }));
  }

  root() {
    let o = this.group;
    while (o.parent) o = o.parent;
    return o;
  }

  worldOf(obj, out) {
    obj.updateWorldMatrix(true, false);
    return obj.getWorldPosition(out);
  }

  // The flat direction to `target`, in the creature's own frame (+Z is straight ahead).
  dirTo(target) {
    this.group.updateWorldMatrix(true, false);
    const d = this.group.worldToLocal(_a.copy(target));
    d.y = 0;
    if (d.lengthSq() < 1e-6) d.set(0, 0, 1);
    return d.normalize().clone();
  }

  sparkle(at, n, colours, speed = 2, span = 1, size = 0.12, grav = -0.3) {
    this.glow.attach(this.root());
    for (let i = 0; i < n; i++) {
      const c = colours[i % colours.length];
      const u = this.rand() * TAU, v = Math.acos(2 * this.rand() - 1), s = speed * (0.4 + this.rand() * 0.6);
      this.glow.emit(at.x, at.y, at.z, Math.sin(v) * Math.cos(u) * s, Math.cos(v) * s, Math.sin(v) * Math.sin(u) * s, c[0], c[1], c[2], size * (0.6 + this.rand() * 0.8), span * (0.6 + this.rand() * 0.6), grav, 2.2, -0.3);
    }
  }

  puff(at, n, colour, speed = 1.2, span = 0.8, size = 0.2) {
    this.dust.attach(this.root());
    for (let i = 0; i < n; i++) {
      const u = this.rand() * TAU, v = Math.acos(2 * this.rand() - 1), s = speed * (0.3 + this.rand() * 0.7);
      this.dust.emit(at.x, at.y, at.z, Math.sin(v) * Math.cos(u) * s, Math.cos(v) * s * 0.7, Math.sin(v) * Math.sin(u) * s, colour[0], colour[1], colour[2], size * (0.6 + this.rand() * 0.8), span * (0.6 + this.rand() * 0.6), -0.1, 2, 1.6);
    }
  }

  addExtra(obj) {
    this.root().add(obj);
    if (!this.extras.includes(obj)) this.extras.push(obj);
  }

  // Back to its own spot after an attack (not awaited by anyone).
  returnHome(dur) {
    const o = this.off.clone(), lx = this.lean.x, ly = this.lean.y, sq = this.squash;
    return this.run(dur, (k) => {
      const e = easeOut(k);
      this.off.copy(o).multiplyScalar(1 - e);
      this.lean.set(lerp(lx, 0, e), lerp(ly, 0, e));
      this.squash = lerp(sq, 1, e);
    });
  }

  update(dt) {
    dt = Math.min(dt, 0.1);
    this.t += dt;
    for (let i = 0; i < this.tasks.length; i++) {
      const task = this.tasks[i];
      task.t += dt;
      const k = Math.min(1, task.t / task.dur);
      task.fn?.(k, dt);
      if (k >= 1) {
        this.tasks.splice(i--, 1);
        task.res();
      }
    }
    if (this.rig.visible) this.idle(dt);
    const s = Math.max(0.0001, this.grow), sq = this.squash, side = 1 / Math.sqrt(sq);
    this.rig.position.set(this.off.x, this.hover + this.off.y, this.off.z);
    this.rig.rotation.set(this.lean.x, 0, this.lean.y);
    this.rig.scale.set(s * side * this.size, s * sq * this.size, s * side * this.size);
    this.blob.position.set(this.off.x, 0.01, this.off.z);
    this.blob.scale.setScalar(this.blobSize * s * (1 - Math.min(0.4, Math.max(0, this.off.y + this.hover) * 0.5)));
    this.blobMat.opacity = this.rig.visible ? 0.75 * Math.min(1, s) : 0;
    if (this.flash > 0 || this.flashed > 0) {
      const f = this.flash;
      for (const m of this.mats) {
        if (!m.userData.e0) continue;
        m.emissive.copy(m.userData.e0).lerp(WHITE, f);
        m.emissiveIntensity = lerp(m.userData.ei0, Math.max(m.userData.ei0, 1.4), f);
      }
      this.flashed = f;
    }
    this.glow.update(dt);
    this.dust.update(dt);
  }

  async wake() {
    this.freed = false;
    this.group.visible = this.rig.visible = true;
    this.grow = 0.001;
    this.puff(this.group.getWorldPosition(_b).setY(this.group.getWorldPosition(_b).y + 0.15), 26, [0.12, 0.08, 0.18], 1.4, 1.1, 0.4);
    await this.run(1.0, (k) => {
      this.grow = backOut(k);
      this.flash = Math.max(0, 0.6 - k) * 0.8;
    });
    this.grow = 1;
    this.flash = 0;
  }

  async hurt() {
    this.sparkle(this.worldOf(this.core, _b), 14, [[3, 3, 3], [3, 2.4, 1.2]], 2.4, 0.5, 0.1, 0);
    this.onHurt?.();
    await this.run(0.5, (k) => {
      this.flash = k < 0.12 ? k / 0.12 : 1 - (k - 0.12) / 0.88;
      const p = Math.sin(Math.PI * Math.min(1, k * 1.4));
      this.off.set(Math.sin(k * 60) * 0.03 * (1 - k), 0, -0.3 * p);
      this.lean.x = -0.35 * p;
      this.squash = 1 - 0.16 * p;
    });
    this.flash = 0;
    this.off.set(0, 0, 0);
    this.lean.set(0, 0);
    this.squash = 1;
  }

  // Shudders, glowing whiter, for `dur`; `each` runs every frame of it too.
  shudder(dur, each) {
    return this.run(dur, (k, dt) => {
      this.flash = easeIn(k);
      this.off.x = Math.sin(this.t * 70) * 0.035;
      this.off.z = Math.cos(this.t * 53) * 0.02;
      each?.(k, dt);
    });
  }

  dispose() {
    this.tasks.length = 0;
    this.group.removeFromParent();
    for (const o of this.extras) o.removeFromParent();
    this.glow.dispose();
    this.dust.dispose();
    for (const m of this.mats) m.dispose();
    this.blobMat.dispose();
    for (const m of this.ownMats ?? []) m.dispose();
  }
}

// A standard material, rough and soft, with an optional glow.
const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, ...o });
// A face decal (eye, mouth) that glows through its own picture.
const decal = (map, glow, extra = {}) => std({ map, emissiveMap: map, emissive: new THREE.Color(1, 1, 1), emissiveIntensity: glow, alphaTest: 0.5, roughness: 0.35, ...extra });

// ── The Tatter Moth ──────────────────────────────────────────────────────────────────────────────────────────────────
class Moth extends Creature {
  constructor(seed) {
    super('moth', seed);
    this.height = 1.2;
    this.blobSize = 0.85;
    this.flapSpeed = 7;
    this.flapT = 0;
    this.dustIn = 0;
    const R = this.rig;
    const body = this.mat(std({ map: fuzzTexture(), color: 0xd8c8f8, emissive: new THREE.Color(0x2c2050), emissiveIntensity: 1 }));
    const fluff = this.mat(std({ color: 0xf0e8ff, emissive: new THREE.Color(0x4a3e6a), emissiveIntensity: 1, roughness: 1 }));
    const thorax = new THREE.Mesh(GEO.sphere(), body);
    thorax.scale.setScalar(0.17);
    thorax.position.set(0, 0.6, 0);
    const abdomen = new THREE.Mesh(GEO.sphere(), body);
    abdomen.scale.set(0.15, 0.23, 0.15);
    abdomen.position.set(0, 0.4, -0.07);
    abdomen.rotation.x = 0.35;
    const head = new THREE.Group();
    head.position.set(0, 0.79, 0.07);
    const skull = new THREE.Mesh(GEO.sphere(), body);
    skull.scale.setScalar(0.155);
    head.add(skull);
    this.head = head;
    // A fluffy collar of puffs round the neck: the cuteness.
    const collar = new THREE.InstancedMesh(GEO.puff(), fluff, 16);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU;
      p.set(Math.cos(a) * 0.15, 0.68 + Math.sin(a * 3) * 0.012, Math.sin(a) * 0.14 + 0.01);
      s.setScalar(0.058 + (i % 2) * 0.012);
      collar.setMatrixAt(i, m4.compose(p, q, s));
    }
    R.add(thorax, abdomen, collar, head);
    // Eyes and a pout, hugging the head.
    for (const [side, yaw] of [['L', -0.43], ['R', 0.43]]) {
      const eye = new THREE.Mesh(patchGeo(0.158, yaw, 0.06, 0.78, 0.86), this.mat(decal(eyeTexture('moth', side), 1.9)));
      head.add(eye);
    }
    head.add(new THREE.Mesh(patchGeo(0.157, 0, -0.42, 0.5, 0.26), decal(mouthTexture('moth'), 0.25)));
    // Feathery antennae: two crossed planes each.
    const feather = this.mat(std({ map: featherTexture(), alphaTest: 0.4, side: THREE.DoubleSide, emissive: new THREE.Color(0x9a88c4), emissiveIntensity: 0.8 }));
    this.antennae = [];
    for (const sx of [-1, 1]) {
      const a = new THREE.Group();
      a.position.set(sx * 0.055, 0.12, 0.04);
      a.rotation.set(-0.35, 0, -sx * 0.4);
      for (const ry of [0, Math.PI / 2]) {
        const f = new THREE.Mesh(GEO.feather(), feather);
        f.rotation.y = ry;
        a.add(f);
      }
      head.add(a);
      this.antennae.push(a);
    }
    // Wings: an upper and a lower each side, hinged behind the body.
    const wingMat = (which) => this.mat(std({ map: wingTexture(which), emissiveMap: wingTexture(which), emissive: new THREE.Color(0.42, 0.36, 0.55), emissiveIntensity: 0.55, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.95 }));
    const upperMat = wingMat('upper'), lowerMat = wingMat('lower');
    this.wings = [];
    for (const sx of [-1, 1]) {
      const hinge = new THREE.Group();
      hinge.position.set(sx * 0.05, 0.62, -0.12);
      hinge.scale.x = sx;
      const up = new THREE.Group(), lo = new THREE.Group();
      up.add(new THREE.Mesh(GEO.wing(0.62, 0.62, 0.62 * (128 - 188) / -256), upperMat));
      up.rotation.z = 0.28;
      lo.add(new THREE.Mesh(GEO.wing(0.44, 0.44, 0.44 * (40 - 128) / 256 + 0.0), lowerMat));
      lo.position.y = -0.05;
      lo.rotation.z = -0.55;
      hinge.add(up, lo);
      R.add(hinge);
      this.wings.push({ hinge, up, lo, sx });
    }
    // Six little legs, dangling.
    const legMat = this.mat(std({ color: 0x3a2d50, emissive: new THREE.Color(0x120c1c), emissiveIntensity: 1 }));
    this.legs = [];
    for (const sx of [-1, 1])
      for (let i = 0; i < 3; i++) {
        const leg = new THREE.Mesh(GEO.stick(), legMat);
        leg.scale.set(0.014, 0.17, 0.014);
        leg.position.set(sx * 0.1, 0.52, 0.06 - i * 0.07);
        leg.rotation.z = sx * 0.45;
        R.add(leg);
        this.legs.push(leg);
      }
    this.core.position.set(0, 0.62, 0.05);
    R.add(this.core);
    this.ownMats = [];
  }

  idle(dt) {
    this.hover = 0.06 * Math.sin(this.t * 2.1);
    this.flapT += dt * this.flapSpeed;
    const flap = 0.55 + 0.45 * Math.sin(this.flapT);
    const flapLo = 0.5 + 0.4 * Math.sin(this.flapT - 0.6);
    for (const w of this.wings) {
      w.up.rotation.y = flap;
      w.lo.rotation.y = flapLo;
    }
    for (let i = 0; i < 2; i++) this.antennae[i].rotation.x = -0.35 + 0.12 * Math.sin(this.t * 2.6 + i);
    for (let i = 0; i < this.legs.length; i++) this.legs[i].rotation.x = 0.15 * Math.sin(this.t * 3 + i);
    this.head.rotation.z = 0.06 * Math.sin(this.t * 1.3);
    // A mote of dust falls off a wing now and then.
    this.dustIn -= dt;
    if (this.dustIn <= 0 && this.group.parent) {
      this.dustIn = 0.35 + this.rand() * 0.3;
      const sx = this.rand() < 0.5 ? -1 : 1;
      this.group.localToWorld(_a.set(sx * (0.25 + this.rand() * 0.3) + this.off.x, 0.5 + this.rand() * 0.4 + this.hover, -0.15 + this.off.z));
      this.dust.attach(this.root());
      this.dust.emit(_a.x, _a.y, _a.z, 0, -0.05, 0, 0.62, 0.58, 0.72, 0.06, 1.4, 0.12, 0.5, 0.5);
    }
  }

  async attack(target) {
    const dir = this.dirTo(target);
    this.flapSpeed = 18;
    await this.run(0.35, (k) => {
      const e = easeOut(k);
      this.off.set(-dir.x * 0.25 * e, 0.18 * e, -dir.z * 0.25 * e);
      this.lean.x = -0.35 * e;
    });
    await this.run(0.22, (k) => {
      const e = easeIn(k), d = -0.25 + 0.85 * e;
      this.off.set(dir.x * d, 0.18 - 0.1 * e, dir.z * d);
      this.lean.x = -0.35 + 0.8 * e;
    });
    // A puff of grey dust, blown at her.
    const from = this.worldOf(this.core, new THREE.Vector3()), to = target.clone();
    const flight = 0.42, v = _a.copy(to).sub(from).divideScalar(flight);
    this.dust.attach(this.root());
    this.glow.attach(this.root());
    for (let i = 0; i < 46; i++) {
      const j = 1.4, lag = this.rand() * 0.25;
      this.dust.emit(from.x + (this.rand() - 0.5) * 0.3, from.y + (this.rand() - 0.5) * 0.3, from.z, v.x * (1 - lag) + (this.rand() - 0.5) * j, v.y * (1 - lag) + (this.rand() - 0.5) * j, v.z * (1 - lag) + (this.rand() - 0.5) * j, 0.55 + this.rand() * 0.12, 0.5 + this.rand() * 0.08, 0.66, 0.1 + this.rand() * 0.16, flight + 0.1 + this.rand() * 0.25, 0, 0, 2.2);
      if (i % 9 === 0) this.glow.emit(from.x, from.y, from.z, v.x * (0.85 + this.rand() * 0.3) + (this.rand() - 0.5), v.y + (this.rand() - 0.5), v.z, 1.2, 0.8, 1.8, 0.06, flight + 0.1, 0, 0, 0);
    }
    this.returnHome(0.6).then(() => (this.flapSpeed = 7));
    await this.run(flight);
    this.puff(to, 26, [0.6, 0.56, 0.68], 1.6, 0.8, 0.22);
  }

  // The silk butterfly it was.
  butterfly() {
    const g = new THREE.Group();
    const m = std({ map: silkTexture(), emissiveMap: silkTexture(), emissive: new THREE.Color(1, 1, 1), emissiveIntensity: 1.5, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.3 });
    this.ownMats.push(m);
    const halves = [];
    for (const sx of [-1, 1]) {
      const h = new THREE.Group(), flapper = new THREE.Group();
      h.scale.x = sx;
      flapper.add(new THREE.Mesh(GEO.wing(0.5, 0.5, 0), m));
      h.add(flapper);
      g.add(h);
      halves.push(flapper);
    }
    const bodyMat = std({ color: 0xfff4fb, emissive: new THREE.Color(1, 0.85, 0.95), emissiveIntensity: 1.6 });
    this.ownMats.push(bodyMat);
    const b = new THREE.Mesh(GEO.sphere(), bodyMat);
    b.scale.set(0.028, 0.12, 0.028);
    g.add(b);
    g.rotation.x = -0.25;
    g.userData = { halves, mat: m };
    return g;
  }

  async free() {
    this.flapSpeed = 26;
    const at = new THREE.Vector3();
    await this.shudder(0.6, (k) => {
      if (this.rand() < 0.5) this.sparkle(this.worldOf(this.core, at), 1, [[2.2, 1.6, 2.6]], 1.2, 0.7, 0.08);
    });
    this.worldOf(this.core, at);
    this.sparkle(at, 56, [[3, 1.8, 2.6], [1.8, 2.4, 3], [2.4, 1.8, 3], [3, 2.6, 1.4]], 2.8, 1.3, 0.13, -0.4);
    const fly = this.butterfly();
    fly.position.copy(at);
    fly.scale.setScalar(0.01);
    this.addExtra(fly);
    await this.run(0.3, (k) => {
      this.grow = 1 - easeIn(k);
      fly.scale.setScalar(easeOut(k));
    });
    this.rig.visible = false;
    this.flash = 0;
    const start = at.clone();
    await this.run(1.6, (k) => {
      const flap = 0.15 + 1.1 * Math.abs(Math.sin(this.t * 13));
      fly.userData.halves[0].rotation.y = flap;
      fly.userData.halves[1].rotation.y = flap;
      fly.position.set(start.x + Math.sin(k * 7) * 0.4 * k, start.y + 0.3 * k + 3.6 * k * k, start.z + Math.cos(k * 5) * 0.2 - 0.4 * k);
      fly.userData.mat.emissive.setHSL((this.t * 0.4) % 1, 0.6, 0.85);
      fly.scale.setScalar(k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1);
      if (this.rand() < 0.7) this.glow.emit(fly.position.x, fly.position.y, fly.position.z, 0, -0.2, 0, 2.6, 2, 2.8, 0.07, 0.7, 0, 0, 0);
    });
    fly.removeFromParent();
    this.freed = true;
  }
}

// ── The Soot Sprite ──────────────────────────────────────────────────────────────────────────────────────────────────
const SOOT_EYES = [[-0.36, 0.2], [0.36, 0.2]];
const SOOT_MOUTH = [0, -0.24];
class Soot extends Creature {
  constructor(seed) {
    super('soot', seed);
    this.height = 0.72;
    this.blobSize = 0.6;
    this.size = 0.95 + this.rand() * 0.13;
    this.phase = this.rand() * TAU;
    this.emberIn = 0;
    const R = this.rig;
    const body = new THREE.Group();
    body.position.y = 0.34;
    body.scale.setScalar(this.size);
    this.body = body;
    const black = this.mat(std({ color: 0x0c0b10, emissive: new THREE.Color(0x07070c), emissiveIntensity: 1, roughness: 1 }));
    const core = new THREE.Mesh(GEO.ball(), black);
    core.scale.setScalar(0.22);
    body.add(core);
    // Fur: cones on a Fibonacci sphere, none over the eyes and mouth.
    const furMat = this.mat(std({ color: 0xffffff, emissive: new THREE.Color(0x0b0b14), emissiveIntensity: 1, roughness: 1, side: THREE.DoubleSide }));
    const clear = [...SOOT_EYES, SOOT_MOUTH].map(([yaw, pitch]) => new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)));
    const dirs = [];
    const N = 520;
    for (let i = 0; i < N; i++) {
      const y = 1 - (2 * (i + 0.5)) / N, r = Math.sqrt(1 - y * y), a = i * 2.39996;
      const d = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
      if (clear.some((c, j) => d.angleTo(c) < (j < 2 ? 0.38 : 0.26))) continue;
      dirs.push(d);
    }
    const fur = new THREE.InstancedMesh(GEO.fur(), furMat, dirs.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), p = new THREE.Vector3(), s = new THREE.Vector3(), col = new THREE.Color();
    dirs.forEach((d, i) => {
      q.setFromUnitVectors(up, d);
      p.copy(d).multiplyScalar(0.2);
      const len = 0.055 + this.rand() * 0.07;
      s.set(0.024, len, 0.024);
      fur.setMatrixAt(i, m4.compose(p, q, s));
      const v = 0.018 + this.rand() * 0.025;
      fur.setColorAt(i, col.setRGB(v, v, v * 1.3));
    });
    body.add(fur);
    for (const [i, side] of [[0, 'L'], [1, 'R']]) {
      const [yaw, pitch] = SOOT_EYES[i];
      body.add(new THREE.Mesh(patchGeo(0.226, yaw, pitch, 0.72, 0.8), this.mat(decal(eyeTexture('soot', side), 1.7, { emissiveMap: eyeTexture('soot', side, true) }))));
    }
    body.add(new THREE.Mesh(patchGeo(0.224, SOOT_MOUTH[0], SOOT_MOUTH[1], 0.44, 0.22), this.mat(decal(mouthTexture('soot'), 2.2))));
    // Stick arms with little round hands, stick legs with round feet.
    const limb = this.mat(std({ color: 0x1d1a22, emissive: new THREE.Color(0x0a080d), emissiveIntensity: 1 }));
    this.arms = [];
    for (const sx of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(sx * 0.24, -0.02, 0.04);
      const stick = new THREE.Mesh(GEO.stick(), limb);
      stick.scale.set(0.013, 0.17, 0.013);
      const hand = new THREE.Mesh(GEO.sphere(), limb);
      hand.scale.setScalar(0.032);
      hand.position.y = -0.17;
      arm.add(stick, hand);
      arm.rotation.z = sx * 0.9;
      body.add(arm);
      this.arms.push({ arm, sx });
    }
    for (const sx of [-1, 1]) {
      const leg = new THREE.Mesh(GEO.stick(), limb);
      leg.scale.set(0.012, 0.13, 0.012);
      leg.position.set(sx * 0.08, -0.19, 0);
      const foot = new THREE.Mesh(GEO.sphere(), limb);
      foot.scale.set(0.04, 0.022, 0.05);
      foot.position.set(sx * 0.08, -0.32, 0.02);
      body.add(leg, foot);
    }
    this.core.position.set(0, 0.34, 0.05);
    R.add(body, this.core);
    this.ownMats = [];
    this.ball = null;
  }

  idle(dt) {
    const p = this.t * 3.4 + this.phase, b = Math.abs(Math.sin(p));
    this.hover = b * 0.09;
    // Squash on landing, stretch in the air.
    if (!this.tasks.length) this.squash = 1 - 0.13 * (1 - b) ** 4 + 0.05 * b;
    this.body.rotation.y = 0.15 * Math.sin(this.t * 0.9 + this.phase);
    for (const { arm, sx } of this.arms) arm.rotation.x = 0.5 * Math.sin(this.t * 6 + sx);
    // Embers drift up off it.
    this.emberIn -= dt;
    if (this.emberIn <= 0 && this.group.parent) {
      this.emberIn = 0.25 + this.rand() * 0.25;
      this.group.localToWorld(_a.set((this.rand() - 0.5) * 0.3 + this.off.x, 0.5 + this.hover, (this.rand() - 0.5) * 0.3 + this.off.z));
      this.glow.attach(this.root());
      this.glow.emit(_a.x, _a.y, _a.z, (this.rand() - 0.5) * 0.1, 0.25, 0, 3, 1.1, 0.25, 0.05, 1.2, -0.1, 0.3, -0.5);
    }
  }

  onHurt() {
    this.puff(this.worldOf(this.core, _b), 12, [0.08, 0.07, 0.09], 1.2, 0.6, 0.16);
  }

  async attack(target) {
    const dir = this.dirTo(target);
    await this.run(0.28, (k) => {
      const e = easeOut(k);
      this.squash = 1 - 0.3 * e;
      this.off.set(-dir.x * 0.1 * e, 0, -dir.z * 0.1 * e);
      for (const { arm, sx } of this.arms) arm.rotation.x = -1.4 * e;
    });
    await this.run(0.2, (k) => {
      const e = easeOut(k), d = -0.1 + 0.45 * e;
      this.squash = lerp(0.7, 1.15, e);
      this.off.set(dir.x * d, 0.25 * Math.sin(Math.PI * k), dir.z * d);
      for (const { arm } of this.arms) arm.rotation.x = lerp(-1.4, 1.2, e);
    });
    // A soot ball, trailing embers.
    if (!this.ball) {
      const m = std({ color: 0x141118, emissive: new THREE.Color(0.3, 0.08, 0), emissiveIntensity: 1, roughness: 1 });
      this.ownMats.push(m);
      this.ball = new THREE.Mesh(GEO.puff(), m);
      this.ball.scale.setScalar(0.09);
    }
    const ball = this.ball;
    const from = this.worldOf(this.core, new THREE.Vector3()), to = target.clone();
    ball.position.copy(from);
    ball.visible = true;
    this.addExtra(ball);
    this.returnHome(0.5);
    await this.run(0.45, (k) => {
      ball.position.lerpVectors(from, to, k);
      ball.position.y += 0.5 * 4 * k * (1 - k);
      ball.rotation.set(k * 9, k * 7, 0);
      this.glow.emit(ball.position.x, ball.position.y, ball.position.z, (this.rand() - 0.5) * 0.6, (this.rand() - 0.5) * 0.6, (this.rand() - 0.5) * 0.6, 3, 1.2, 0.3, 0.06, 0.45, 0.4, 1, 0);
      this.dust.attach(this.root());
      this.dust.emit(ball.position.x, ball.position.y, ball.position.z, 0, 0, 0, 0.1, 0.09, 0.11, 0.1, 0.4, -0.1, 0, 1.5);
    });
    ball.visible = false;
    this.puff(to, 28, [0.08, 0.07, 0.09], 1.8, 0.8, 0.22);
    this.sparkle(to, 16, [[3, 1.1, 0.25], [3, 1.8, 0.4]], 2.4, 0.6, 0.07, 0.5);
  }

  // The hearth fairy it was.
  fairy() {
    const g = new THREE.Group();
    const glowMat = std({ color: 0xffd28a, emissive: new THREE.Color(1, 0.62, 0.2), emissiveIntensity: 3 });
    const flameMat = std({ color: 0xff8a2a, emissive: new THREE.Color(1, 0.4, 0.08), emissiveIntensity: 2.6, transparent: true, opacity: 0.9 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x3a1600 });
    const wingMat = new THREE.MeshBasicMaterial({ map: fairyWingTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    this.ownMats.push(glowMat, flameMat, eyeMat, wingMat);
    const body = new THREE.Mesh(GEO.sphere(), glowMat);
    body.scale.setScalar(0.06);
    const flame = new THREE.Mesh(GEO.cone(), flameMat);
    flame.scale.set(0.045, -0.18, 0.045);
    flame.position.y = -0.02;
    for (const sx of [-1, 1]) {
      const e = new THREE.Mesh(GEO.sphere(), eyeMat);
      e.scale.set(0.009, 0.013, 0.006);
      e.position.set(sx * 0.022, 0.012, 0.056);
      g.add(e);
    }
    const wings = [];
    for (const sx of [-1, 1]) {
      const h = new THREE.Group();
      h.scale.x = sx;
      h.position.set(0, 0.02, -0.03);
      h.add(new THREE.Mesh(GEO.wing(0.2, 0.2, 0.05), wingMat));
      g.add(h);
      wings.push(h);
    }
    g.add(body, flame);
    g.userData = { wings, flame };
    return g;
  }

  async free() {
    const at = new THREE.Vector3();
    await this.shudder(0.6, () => {
      if (this.rand() < 0.6) this.sparkle(this.worldOf(this.core, at), 1, [[3, 1.2, 0.3]], 1.4, 0.6, 0.06, -0.5);
    });
    this.worldOf(this.core, at);
    this.sparkle(at, 44, [[3, 1.2, 0.3], [3, 2.2, 0.8], [3, 2.8, 1.6]], 2.6, 1.1, 0.1, -0.3);
    this.puff(at, 20, [0.08, 0.07, 0.09], 1.6, 0.7, 0.24);
    const f = this.fairy();
    f.position.copy(at);
    f.scale.setScalar(0.01);
    this.addExtra(f);
    await this.run(0.3, (k) => {
      this.grow = 1 - easeIn(k);
      f.scale.setScalar(easeOut(k) * 1.4);
    });
    this.rig.visible = false;
    this.flash = 0;
    const start = at.clone();
    await this.run(1.5, (k) => {
      const a = k * 14, r = 0.45 * k;
      f.position.set(start.x + Math.cos(a) * r, start.y + 3.2 * k ** 1.5, start.z + Math.sin(a) * r);
      for (const w of f.userData.wings) w.rotation.y = 0.3 + 0.8 * Math.abs(Math.sin(this.t * 30));
      f.userData.flame.scale.y = -0.18 * (0.8 + 0.4 * Math.sin(this.t * 40));
      f.scale.setScalar(1.4 * (k > 0.8 ? 1 - (k - 0.8) / 0.2 : 1));
      this.glow.emit(f.position.x, f.position.y, f.position.z, (this.rand() - 0.5) * 0.3, -0.3, (this.rand() - 0.5) * 0.3, 3, 1.6, 0.4, 0.07, 0.6, 0, 0.5, 0);
    });
    f.removeFromParent();
    this.freed = true;
  }
}

// ── The Grumpy Grimoire ──────────────────────────────────────────────────────────────────────────────────────────────
const W = 1.0, D = 0.76, CT = 0.05, PT = 0.085;
class Grimoire extends Creature {
  constructor(seed) {
    super('grimoire', seed);
    this.height = 1.7;
    this.blobSize = 1.3;
    this.mouth = 0.15;
    this.snapIn = 2;
    this.snapT = -1;
    this.spin = 0.6;
    this.orbit = 0;
    this.orbitR = 1.1;
    this.spread = 0;
    const R = this.rig;
    const book = new THREE.Group();
    book.position.set(0, 1.0, 0);
    // Nose down a little, so the tooled cover and the crest face whoever it is fighting.
    book.rotation.x = 0.28;
    book.scale.setScalar(1.25);
    this.book = book;
    const leather = this.mat(std({ map: leatherTexture(false), emissive: new THREE.Color(0x24081c), emissiveIntensity: 1, roughness: 0.7 }));
    const plain = this.mat(std({ color: 0x5a2350, emissive: new THREE.Color(0x1c0618), emissiveIntensity: 1, roughness: 0.75 }));
    const gold = this.mat(std({ color: 0xf0c058, metalness: 0.3, roughness: 0.4, emissive: new THREE.Color(0x6a4200), emissiveIntensity: 1 }));
    const pageSide = this.mat(std({ map: parchmentTexture('plain'), emissive: new THREE.Color(0x1e1c26), emissiveIntensity: 1 }));
    const pageEdge = this.mat(std({ map: parchmentTexture('edge'), emissive: new THREE.Color(0x1e1c26), emissiveIntensity: 1 }));
    const pageText = this.mat(std({ map: parchmentTexture('text'), emissive: new THREE.Color(0x1e1c26), emissiveIntensity: 1 }));
    const toothMat = this.mat(std({ color: 0xf4ead0, emissive: new THREE.Color(0x3a3020), emissiveIntensity: 1, roughness: 0.5 }));
    this.leather = leather;
    this.pageMats = [pageSide, pageEdge, pageText];
    this.teeth = [];
    // The spine at the back, with gold bands.
    const spine = new THREE.Mesh(once('spineGeo', () => new THREE.CylinderGeometry(PT + CT, PT + CT, W * 1.02, 14).rotateZ(Math.PI / 2)), plain);
    spine.position.z = -D / 2;
    book.add(spine);
    for (const x of [-0.36, 0, 0.36]) {
      const band = new THREE.Mesh(once('bandGeo', () => new THREE.CylinderGeometry(PT + CT + 0.008, PT + CT + 0.008, 0.045, 14).rotateZ(Math.PI / 2)), gold);
      band.position.set(x, 0, -D / 2);
      book.add(band);
    }
    const coverGeo = once('coverGeo', () => new THREE.BoxGeometry(W, CT, D));
    const pagesGeo = once('pagesGeo', () => new THREE.BoxGeometry(W - 0.06, PT, D - 0.04));
    const cornerGeo = once('cornerGeo', () => new THREE.BoxGeometry(0.11, CT + 0.016, 0.11));
    // The two jaws, hinged at the spine: covers, pages, teeth.
    const jaw = (up) => {
      const s = up ? 1 : -1;
      const j = new THREE.Group();
      j.position.z = -D / 2;
      // Box faces: +x −x +y −y +z −z. The tooled leather faces out; the pages show text inside and edges in front.
      const cover = new THREE.Mesh(coverGeo, up ? [plain, plain, leather, plain, plain, plain] : [plain, plain, plain, leather, plain, plain]);
      cover.position.set(0, s * (PT + CT / 2), D / 2);
      const pages = new THREE.Mesh(pagesGeo, [pageSide, pageSide, up ? pageSide : pageText, up ? pageText : pageSide, pageEdge, pageSide]);
      pages.position.set(0, s * (PT / 2), D / 2 - 0.01);
      j.add(cover, pages);
      for (const sx of [-1, 1]) {
        const c = new THREE.Mesh(cornerGeo, gold);
        c.position.set(sx * (W / 2 - 0.03), s * (PT + CT / 2), D - 0.03);
        c.rotation.y = Math.PI / 4;
        j.add(c);
      }
      const n = 11;
      for (let i = 0; i < n; i++) {
        const t = new THREE.Mesh(GEO.tooth(), toothMat);
        t.position.set(-0.43 + (0.86 * (i + (up ? 0 : 0.5))) / n, 0, D - 0.04);
        if (up) t.rotation.x = Math.PI;
        t.scale.y = i % 3 === 1 ? 1.35 : 1;
        j.add(t);
        this.teeth.push(t);
      }
      book.add(j);
      return j;
    };
    this.upper = jaw(true);
    this.lower = jaw(false);
    // The clasp: a gold crest on the top jaw's front, with the one angry eye in it.
    const crest = new THREE.Group();
    crest.position.set(0, PT + CT - 0.01, D + 0.02);
    crest.rotation.x = -0.5;
    const plate = new THREE.Mesh(once('plateGeo', () => new THREE.CylinderGeometry(0.16, 0.16, 0.03, 28).rotateX(Math.PI / 2)), gold);
    crest.add(plate);
    const gem = new THREE.Mesh(GEO.sphere(), plain);
    gem.scale.set(0.11, 0.11, 0.06);
    gem.position.z = 0.012;
    crest.add(gem);
    this.eyeMat = this.mat(decal(eyeTexture('grim', 'L'), 2.2));
    const eye = new THREE.Mesh(patchGeo(0.112, 0, 0, 1.5, 1.5), this.eyeMat);
    eye.scale.z = 0.6;
    eye.position.z = 0.014;
    crest.add(eye);
    // Gold brows in a V over the eye.
    for (const sx of [-1, 1]) {
      const brow = new THREE.Mesh(once('browGeo', () => new THREE.BoxGeometry(0.14, 0.03, 0.035)), gold);
      brow.position.set(sx * 0.065, 0.118, 0.03);
      brow.rotation.z = sx * 0.42;
      crest.add(brow);
    }
    this.upper.add(crest);
    // A ribbon bookmark for a tongue.
    const ribbonMat = this.mat(std({ color: 0xd2354f, emissive: new THREE.Color(0x3a0610), emissiveIntensity: 1, roughness: 0.35, side: THREE.DoubleSide }));
    const ribbon = new THREE.Mesh(
      once('ribbonGeo', () => {
        const g = new THREE.PlaneGeometry(0.075, 0.42, 1, 10);
        const pos = g.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const t = (0.21 - pos.getY(i)) / 0.42; // 0 inside the mouth → 1 at the tip
          const z = Math.min(t, 0.45) * 0.42, y = t > 0.45 ? -(t - 0.45) * 0.42 : 0;
          pos.setXYZ(i, pos.getX(i), y + 0.004, z);
        }
        g.computeVertexNormals();
        return g;
      }),
      ribbonMat
    );
    ribbon.position.set(0.16, 0, D - 0.14);
    this.lower.add(ribbon);
    this.ribbon = ribbon;
    // The dark inside of the mouth, glowing purple.
    const mouthMat = this.mat(
      std({
        map: once('maw', () =>
          canvasTexture(128, 64, (g) => {
            const grad = g.createRadialGradient(64, 32, 2, 64, 32, 64);
            grad.addColorStop(0, '#d86bff');
            grad.addColorStop(0.5, '#5a1580');
            grad.addColorStop(1, '#14041e');
            g.fillStyle = grad;
            g.fillRect(0, 0, 128, 64);
          })
        ),
        emissive: new THREE.Color(1, 1, 1),
        emissiveIntensity: 1.3
      })
    );
    mouthMat.emissiveMap = mouthMat.map;
    const maw = new THREE.Mesh(once('mawGeo', () => new THREE.PlaneGeometry(W - 0.1, 2 * PT)), mouthMat);
    maw.position.set(0, 0, -D / 2 + 0.08);
    book.add(maw);
    // Two pages flapping in the mouth.
    const flapGeo = once('flapGeo', () => new THREE.PlaneGeometry(W - 0.1, D - 0.08).rotateX(-Math.PI / 2).translate(0, 0, (D - 0.08) / 2));
    const flapMat = this.mat(std({ map: parchmentTexture('text'), side: THREE.DoubleSide, emissive: new THREE.Color(0x1e1c26), emissiveIntensity: 1 }));
    this.flaps = [0, 1].map(() => {
      const f = new THREE.Mesh(flapGeo, flapMat);
      f.position.z = -D / 2;
      book.add(f);
      return f;
    });
    // Loose pages, circling.
    const looseMat = this.mat(std({ map: parchmentTexture('text'), side: THREE.DoubleSide, emissive: new THREE.Color(0.35, 0.18, 0.5), emissiveIntensity: 0.9 }));
    this.loose = [];
    for (let i = 0; i < 6; i++) {
      const p = new THREE.Mesh(GEO.page(), looseMat);
      R.add(p);
      this.loose.push(p);
    }
    // The sharp pages it throws.
    this.darts = [];
    this.dartMat = looseMat;
    this.mawPt = new THREE.Object3D();
    this.mawPt.position.set(0, 0, D / 2 + 0.1);
    book.add(this.mawPt);
    this.core.position.set(0, 0.05, 0.05);
    book.add(this.core);
    R.add(book);
    this.ownMats = [];
  }

  idle(dt) {
    this.hover = 0.07 * Math.sin(this.t * 1.4);
    this.book.rotation.z = 0.05 * Math.sin(this.t * 0.9);
    let open = this.mouth;
    if (!this.tasks.length) {
      open = 0.14 + 0.06 * Math.sin(this.t * 2.3);
      // A snap now and then.
      this.snapIn -= dt;
      if (this.snapIn <= 0) (this.snapT = 0), (this.snapIn = 2.5 + this.rand() * 2.5);
      if (this.snapT >= 0) {
        this.snapT += dt;
        const k = this.snapT / 0.35;
        open = k < 0.4 ? lerp(open, 0.5, k / 0.4) : k < 0.55 ? lerp(0.5, 0, (k - 0.4) / 0.15) : lerp(0, open, (k - 0.55) / 0.45);
        if (k >= 1) this.snapT = -1;
      }
      this.mouth = open;
    }
    const sp = this.spread;
    this.upper.rotation.x = lerp(-open * 0.75, -1.5, sp);
    this.lower.rotation.x = lerp(open * 0.45, 1.5, sp);
    // Once freed, one page turns over and over, as if someone were reading it.
    this.flaps[0].rotation.x = lerp(-open * (0.25 + 0.25 * Math.sin(this.t * 7)), -1.5 + 1.4 * (0.5 + 0.5 * Math.sin(this.t * 2.2)), sp);
    this.flaps[1].rotation.x = lerp(-open * (0.45 + 0.25 * Math.sin(this.t * 6 + 2)), -1.48, sp);
    this.ribbon.rotation.x = 0.1 * Math.sin(this.t * 3);
    this.orbit += dt * this.spin;
    for (let i = 0; i < this.loose.length; i++) {
      const a = this.orbit + (i / this.loose.length) * TAU, p = this.loose[i];
      p.position.set(Math.cos(a) * this.orbitR, 1.05 + 0.25 * Math.sin(this.t * 1.3 + i * 1.7), Math.sin(a) * this.orbitR * 0.75);
      p.rotation.set(0.6 * Math.sin(this.t * 2 + i), -a, 0.4 * Math.cos(this.t * 1.6 + i));
    }
  }

  onHurt() {
    this.snapT = 0;
    const at = this.worldOf(this.core, _b);
    this.dust.attach(this.root());
    for (let i = 0; i < 10; i++) this.dust.emit(at.x, at.y + 0.1, at.z, (this.rand() - 0.5) * 2, this.rand() * 1.5, (this.rand() - 0.5) * 2, 0.92, 0.86, 0.72, 0.09, 0.8, 1.2, 1, 0);
  }

  async attack(target) {
    const dir = this.dirTo(target);
    const m0 = this.mouth;
    this.spin = 2.2;
    await this.run(0.4, (k) => {
      const e = easeOut(k);
      this.mouth = lerp(m0, 0.8, e);
      this.off.set(-dir.x * 0.3 * e, 0.15 * e, -dir.z * 0.3 * e);
      this.lean.x = -0.25 * e;
    });
    await this.run(0.16, (k) => {
      const e = easeIn(k), d = -0.3 + 0.75 * e;
      this.mouth = lerp(0.8, 0.05, e);
      this.off.set(dir.x * d, 0.15 - 0.1 * e, dir.z * d);
      this.lean.x = lerp(-0.25, 0.25, e);
    });
    // A volley of sharp pages.
    const from = this.worldOf(this.mawPt, new THREE.Vector3());
    const flights = [];
    for (let i = 0; i < 7; i++) {
      if (!this.darts[i]) this.darts[i] = new THREE.Mesh(GEO.page(), this.dartMat);
      const dart = this.darts[i];
      dart.visible = false;
      this.addExtra(dart);
      const to = target.clone().add(_a.set((this.rand() - 0.5) * 0.5, (this.rand() - 0.5) * 0.5, (this.rand() - 0.5) * 0.2));
      const delay = i * 0.05, dur = 0.38, spinA = 8 + this.rand() * 6;
      flights.push(
        this.run(delay + dur, (k) => {
          const t = (k * (delay + dur) - delay) / dur;
          if (t < 0) return;
          dart.visible = t < 1;
          dart.position.lerpVectors(from, to, t);
          dart.position.y += 0.15 * 4 * t * (1 - t);
          dart.rotation.set(t * spinA, t * 3, t * spinA * 0.5);
          if (this.rand() < 0.6) this.glow.emit(dart.position.x, dart.position.y, dart.position.z, 0, 0, 0, 1.6, 0.6, 2.6, 0.08, 0.3, 0, 0, 0);
        }).then(() => {
          dart.visible = false;
          this.dust.attach(this.root());
          for (let j = 0; j < 4; j++) this.dust.emit(to.x, to.y, to.z, (this.rand() - 0.5) * 2, this.rand() * 1.4, (this.rand() - 0.5) * 2, 0.92, 0.86, 0.72, 0.08, 0.7, 1.4, 1, 0);
        })
      );
    }
    this.glow.attach(this.root());
    this.returnHome(0.7).then(() => {
      this.spin = 0.6;
      this.mouth = m0;
    });
    await flights[0];
    this.sparkle(target, 14, [[1.8, 0.7, 2.8]], 2, 0.5, 0.1, 0);
  }

  async free() {
    const at = new THREE.Vector3();
    this.spin = 5;
    await this.shudder(0.7, (k) => {
      this.mouth = 0.2 + 0.25 * Math.abs(Math.sin(this.t * 25));
      this.orbitR = 1.1 + k * 0.5;
      if (this.rand() < 0.5) this.sparkle(this.worldOf(this.core, at), 1, [[3, 2.4, 1.2]], 1.4, 0.7, 0.08);
    });
    this.worldOf(this.core, at);
    this.sparkle(at, 60, [[3, 2.5, 1.2], [3, 2.9, 2.2], [2.4, 1.8, 3]], 3, 1.3, 0.13, -0.3);
    // It turns golden and kind: the leather, the eye, the teeth gone, the book opening flat.
    this.leather.map = leatherTexture(true);
    this.leather.emissive.setRGB(0.5, 0.32, 0.05);
    this.leather.userData.e0.setRGB(0.5, 0.32, 0.05);
    this.leather.needsUpdate = true;
    for (const m of this.pageMats) m.userData.e0.setRGB(0.5, 0.34, 0.1);
    this.eyeMat.map = this.eyeMat.emissiveMap = happyEyeTexture();
    this.eyeMat.needsUpdate = true;
    const letters = [];
    const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ★♥';
    for (let i = 0; i < 16; i++) {
      const m = new THREE.SpriteMaterial({ map: glyphTexture(LETTERS[Math.floor(this.rand() * LETTERS.length)]), color: new THREE.Color(2.4, 1.9, 1.1), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
      this.ownMats.push(m);
      const s = new THREE.Sprite(m);
      s.scale.setScalar(0.001);
      s.position.copy(at);
      s.userData = { a: this.rand() * TAU, r: 0.2 + this.rand() * 0.6, up: 1.5 + this.rand() * 1.8, delay: this.rand() * 0.6, size: 0.14 + this.rand() * 0.12 };
      this.addExtra(s);
      letters.push(s);
    }
    const rx = this.book.rotation.x;
    const floatLetters = (time) => {
      for (const s of letters) {
        const u = Math.max(0, time - s.userData.delay) / 1.6;
        if (u <= 0) continue;
        const a = s.userData.a + u * 3;
        s.position.set(at.x + Math.cos(a) * s.userData.r * (0.4 + u), at.y + 0.2 + u * s.userData.up, at.z + Math.sin(a) * s.userData.r * (0.4 + u));
        s.scale.setScalar(s.userData.size * Math.min(1, u * 5) * (u > 0.75 ? Math.max(0, 1 - (u - 0.75) / 0.25) : 1));
      }
    };
    let clock = 0;
    await this.run(0.9, (k, dt) => {
      clock += dt;
      const e = easeOut(k);
      this.flash = 1 - e * 0.85;
      this.off.set(0, 0, 0);
      this.mouth = 0.3 * (1 - e);
      this.spread = e;
      this.book.rotation.x = lerp(rx, -0.15, e);
      this.spin = lerp(5, 1, e);
      for (const t of this.teeth) t.scale.setScalar(Math.max(0.001, 1 - e * 1.4));
      floatLetters(clock);
    });
    await this.run(1.0, (k, dt) => {
      clock += dt;
      this.flash = 0.15;
      this.off.y = 3 * easeIn(k);
      this.grow = 1 - easeIn(k);
      floatLetters(clock);
    });
    this.rig.visible = false;
    this.flash = 0;
    for (const s of letters) s.removeFromParent();
    this.freed = true;
  }
}

const MAKERS = { moth: Moth, soot: Soot, grimoire: Grimoire };

// Round 2's creatures (the Swan Wing): one of the three kinds of curse in that room's colours. `tint` dyes the
// creature's pale and middle tones towards a colour (its eyes and glows keep theirs), `scale` makes it bigger.
//   offkey  Off-Key Sprite (Music Room ★★★): a soot sprite in midnight violet
//   nibble  Nibble Moth (Tea Room ★★★★): a moth the colour of burnt caramel
//   crumb   Crumb Sprite (Tea Room ★★★★): a soot sprite in cinnamon
//   queen   Midnight Moth Queen (Ballroom ★★★★★): a moth half as big again, in midnight blue and silver
export const VARIANTS = {
  offkey: { base: 'soot', tint: 0x5a3cc8, amount: 0.75, scale: 1 },
  nibble: { base: 'moth', tint: 0xb06a2a, amount: 0.65, scale: 1.05 },
  crumb: { base: 'soot', tint: 0xa0522d, amount: 0.7, scale: 0.95 },
  queen: { base: 'moth', tint: 0x2a3a9a, amount: 0.7, scale: 1.55 }
};

function dye(c, { tint, amount, scale }) {
  const to = new THREE.Color(tint);
  const hsl = {};
  c.group.traverse((o) => {
    if (!o.isMesh || o === c.blob) return;
    for (const m of [o.material].flat()) {
      if (!m?.color || m.userData.dyed) continue;
      m.userData.dyed = true;
      // Glowing parts (eyes, embers) stay as they are: they are what makes a creature readable in the dark.
      if (m.blending === THREE.AdditiveBlending) continue;
      m.color.getHSL(hsl);
      const keep = m.color.clone();
      m.color.lerp(to.clone().multiplyScalar(0.4 + hsl.l * 1.2), amount * (hsl.l > 0.92 && !m.map ? 0.3 : 1));
      if (m.map) m.color.lerp(keep, 0.15);
    }
  });
  c.size = scale;
  c.blobSize *= scale;
}

export function makeCreature(kind, { seed = 0 } = {}) {
  const v = VARIANTS[kind];
  const Make = MAKERS[v?.base ?? kind];
  if (!Make) throw new Error(`no creature called ${kind}`);
  const c = new Make(seed);
  if (v) {
    dye(c, v);
    c.variant = kind;
  }
  return c;
}
