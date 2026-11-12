// The château's insides, made in code: the Grand Hall and the three rooms of the toy. Every place is built twice over
// in one: a DARK state (cold moonlight, fog, dust, cobwebs, boarded windows, tattered things) and a WON state (warm
// sun, candles, colour, sparkles). `Mood` holds both and blends them; `sweep()` is the moment a room is won, light
// running out from where she stands (SCOPE.md §1, promise 1).
//
// A place: { id, scene, bounds, blockers, spawn, doors, battle, feature, setRestored(f), sweep(from), update(dt) }.
// Units are metres; +Z is towards the camera when you walk in; the floor is y = 0.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { canvasTexture, dotTexture, glow, shaftMaterial, envMap, runeTexture, QUALITY } from './look.mjs';
import { makeOwl, makeFrog, makeButterfly } from './friends.mjs';

const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const ease = (t) => t * t * (3 - 2 * t);
const rand = mulberry(7);
function mulberry(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- textures ----------
const TEX = {};
function tex(name, make) {
  return (TEX[name] ??= make());
}
const marble = () =>
  tex('marble', () =>
    canvasTexture(512, 512, (g, w) => {
      const s = w / 2;
      for (let y = 0; y < 2; y++)
        for (let x = 0; x < 2; x++) {
          g.fillStyle = (x + y) % 2 ? '#2b2a36' : '#ece6dc';
          g.fillRect(x * s, y * s, s, s);
        }
      g.globalAlpha = 0.25;
      for (let i = 0; i < 26; i++) {
        g.strokeStyle = i % 2 ? '#8e8aa0' : '#ffffff';
        g.lineWidth = 1 + rand() * 2;
        g.beginPath();
        let x = rand() * w, y = rand() * w;
        g.moveTo(x, y);
        for (let k = 0; k < 6; k++) g.lineTo((x += (rand() - 0.5) * 90), (y += (rand() - 0.3) * 90));
        g.stroke();
      }
      g.globalAlpha = 1;
      g.strokeStyle = 'rgba(0,0,0,0.35)';
      g.lineWidth = 3;
      g.strokeRect(0, 0, s, s);
      g.strokeRect(s, s, s, s);
    }, { repeat: [8, 7] })
  );
const parquet = () =>
  tex('parquet', () =>
    canvasTexture(512, 512, (g, w) => {
      g.fillStyle = '#7a4a2c';
      g.fillRect(0, 0, w, w);
      const plank = 32;
      for (let y = -plank * 4; y < w + plank * 4; y += plank)
        for (let x = 0; x < w; x += plank * 2) {
          for (const flip of [0, 1]) {
            g.save();
            g.translate(x + flip * plank, y + flip * plank);
            g.rotate(flip ? -Math.PI / 4 : Math.PI / 4);
            const l = 40 + rand() * 30;
            g.fillStyle = `hsl(${22 + rand() * 10}, ${45 + rand() * 15}%, ${28 + rand() * 14}%)`;
            g.fillRect(0, 0, plank * 2.6, plank * 0.92);
            g.fillStyle = `rgba(255,220,180,${0.04 + rand() * 0.05})`;
            g.fillRect(0, 2, l, 3);
            g.restore();
          }
        }
    }, { repeat: [3, 3] })
  );
const tiles = () =>
  tex('tiles', () =>
    canvasTexture(512, 512, (g, w) => {
      const n = 8, s = w / n;
      for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++) {
          g.fillStyle = `hsl(${14 + rand() * 8}, ${48 + rand() * 12}%, ${44 + rand() * 10}%)`;
          g.fillRect(x * s + 2, y * s + 2, s - 4, s - 4);
        }
      g.strokeStyle = '#d8c7b0';
      g.lineWidth = 4;
      for (let i = 0; i <= n; i++) {
        g.beginPath();
        g.moveTo(i * s, 0);
        g.lineTo(i * s, w);
        g.moveTo(0, i * s);
        g.lineTo(w, i * s);
        g.stroke();
      }
    }, { repeat: [3, 3] })
  );
// Damask wallpaper: a repeating flourish in a lighter tone on the ground colour.
const damask = (ground, ink, key) =>
  tex(`damask-${key}`, () =>
    canvasTexture(256, 256, (g, w) => {
      g.fillStyle = ground;
      g.fillRect(0, 0, w, w);
      g.fillStyle = ink;
      g.strokeStyle = ink;
      const motif = (cx, cy, s) => {
        g.save();
        g.translate(cx, cy);
        g.scale(s, s);
        g.beginPath();
        g.moveTo(0, -46);
        g.bezierCurveTo(20, -30, 26, -6, 0, 10);
        g.bezierCurveTo(-26, -6, -20, -30, 0, -46);
        g.fill();
        for (const sx of [-1, 1]) {
          g.beginPath();
          g.moveTo(0, 10);
          g.bezierCurveTo(sx * 30, 10, sx * 40, 30, sx * 22, 44);
          g.bezierCurveTo(sx * 10, 52, sx * 4, 40, sx * 14, 34);
          g.lineWidth = 5;
          g.stroke();
        }
        g.beginPath();
        g.arc(0, 30, 6, 0, TAU);
        g.fill();
        g.restore();
      };
      motif(w / 2, w / 2, 1);
      motif(0, 0, 1);
      motif(w, 0, 1);
      motif(0, w, 1);
      motif(w, w, 1);
      g.fillStyle = 'rgba(0,0,0,0.05)';
      for (let x = 0; x < w; x += 8) g.fillRect(x, 0, 2, w);
    }, { repeat: [6, 3] })
  );
// Dressed stone (ashlar): long blocks in courses, each a slightly different tone with a little speckle, fine mortar.
// `stoneBump` is the same blocks in grey for the bump map, bevelled at their edges, so the light catches them.
const ASHLAR = (() => {
  const r = mulberry(21), blocks = [];
  const rows = 8, h = 512 / rows;
  for (let row = 0; row < rows; row++) {
    const off = (row % 2) * 64;
    for (let x = -off; x < 512; x += 128) blocks.push({ x, y: row * h, w: 128, h, tone: r(), hue: r() });
  }
  return blocks;
})();
const stone = () =>
  tex('stone', () =>
    canvasTexture(512, 512, (g, w) => {
      g.fillStyle = '#b0a494';
      g.fillRect(0, 0, w, w);
      for (const b of ASHLAR) {
        g.fillStyle = `hsl(${30 + b.hue * 12}, ${12 + b.hue * 10}%, ${66 + b.tone * 10}%)`;
        g.fillRect(b.x + 2, b.y + 2, b.w - 4, b.h - 4);
        // Speckle and a soft shade towards the bottom of each block.
        for (let k = 0; k < 60; k++) {
          g.fillStyle = `rgba(${rand() < 0.5 ? '255,250,240' : '80,70,60'},${0.05 + rand() * 0.07})`;
          g.fillRect(b.x + 2 + rand() * (b.w - 6), b.y + 2 + rand() * (b.h - 6), 1 + rand() * 3, 1 + rand() * 3);
        }
        const sh = g.createLinearGradient(0, b.y, 0, b.y + b.h);
        sh.addColorStop(0, 'rgba(255,255,255,0.06)');
        sh.addColorStop(1, 'rgba(0,0,0,0.08)');
        g.fillStyle = sh;
        g.fillRect(b.x + 2, b.y + 2, b.w - 4, b.h - 4);
      }
    }, { repeat: [5, 3] })
  );
const stoneBump = () =>
  tex('stoneBump', () =>
    canvasTexture(512, 512, (g) => {
      g.fillStyle = '#000';
      g.fillRect(0, 0, 512, 512);
      for (const b of ASHLAR) {
        for (let k = 0; k < 6; k++) {
          const v = 90 + k * 30;
          g.fillStyle = `rgb(${v},${v},${v})`;
          g.fillRect(b.x + 2 + k, b.y + 2 + k, b.w - 4 - k * 2, b.h - 4 - k * 2);
        }
        for (let k = 0; k < 40; k++) {
          g.fillStyle = `rgba(0,0,0,${0.1 + rand() * 0.2})`;
          g.fillRect(b.x + 8 + rand() * (b.w - 16), b.y + 8 + rand() * (b.h - 16), 2 + rand() * 4, 2 + rand() * 4);
        }
      }
    }, { repeat: [5, 3], srgb: false })
  );
// The marble floor's alpha over its mirror: the dark squares let more reflection through than the white ones.
const marbleAlpha = () =>
  tex('marbleAlpha', () =>
    canvasTexture(64, 64, (g, w) => {
      const s = w / 2;
      for (let y = 0; y < 2; y++)
        for (let x = 0; x < 2; x++) {
          g.fillStyle = (x + y) % 2 ? '#a8a8a8' : '#f0f0f0';
          g.fillRect(x * s, y * s, s, s);
        }
    }, { repeat: [8, 7], srgb: false })
  );
// A carpet runner: crimson with a darker trellis, a gold border and a fine inner line. Repeats along its length (v).
const runner = () =>
  tex('runner', () =>
    canvasTexture(256, 256, (g, w, h) => {
      g.fillStyle = '#b3123c';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(70,0,20,0.55)';
      g.lineWidth = 6;
      for (let k = -2; k < 4; k++) {
        g.beginPath();
        g.moveTo(40, k * 80);
        g.lineTo(w - 40, k * 80 + 80);
        g.moveTo(w - 40, k * 80);
        g.lineTo(40, k * 80 + 80);
        g.stroke();
      }
      g.fillStyle = 'rgba(255,200,90,0.85)';
      for (let k = 0; k < 4; k++) {
        g.beginPath();
        g.arc(w / 2, k * 80 + 40, 7, 0, TAU);
        g.fill();
      }
      g.fillStyle = '#e6b84a';
      g.fillRect(0, 0, 22, h);
      g.fillRect(w - 22, 0, 22, h);
      g.fillStyle = '#7a0a26';
      g.fillRect(22, 0, 6, h);
      g.fillRect(w - 28, 0, 6, h);
      g.fillStyle = 'rgba(255,215,120,0.9)';
      g.fillRect(34, 0, 3, h);
      g.fillRect(w - 37, 0, 3, h);
    }, { repeat: [1, 6] })
  );
// A door leaf: dark polished wood, its grain running up, two raised panels (the top one arched) picked out in gold.
const doorLeaf = (bump) =>
  tex(`door-${bump}`, () =>
    canvasTexture(128, 256, (g, w, h) => {
      if (bump) {
        g.fillStyle = '#808080';
        g.fillRect(0, 0, w, h);
      } else {
        g.fillStyle = '#5a321e';
        g.fillRect(0, 0, w, h);
        for (let x = 0; x < w; x += 2) {
          g.fillStyle = `rgba(${rand() < 0.5 ? '30,12,4' : '140,80,45'},${0.08 + rand() * 0.12})`;
          g.fillRect(x, 0, 1 + rand() * 2, h);
        }
      }
      const panelPath = (x, y, pw, ph, arched) => {
        g.beginPath();
        g.moveTo(x, y + ph);
        g.lineTo(x, y + (arched ? pw / 2 : 0));
        if (arched) g.arc(x + pw / 2, y + pw / 2, pw / 2, Math.PI, 0);
        else g.lineTo(x + pw, y);
        g.lineTo(x + pw, y + ph);
        g.closePath();
      };
      for (const [y, ph, arched] of [[18, 130, true], [166, 72, false]]) {
        panelPath(18, y, w - 36, ph, arched);
        if (bump) {
          g.fillStyle = '#d0d0d0';
          g.fill();
          g.strokeStyle = '#202020';
          g.lineWidth = 5;
          g.stroke();
        } else {
          g.fillStyle = 'rgba(255,190,140,0.08)';
          g.fill();
          g.strokeStyle = '#e8b85a';
          g.lineWidth = 3;
          g.stroke();
          panelPath(26, y + 8, w - 52, ph - 16, arched);
          g.strokeStyle = 'rgba(240,190,100,0.6)';
          g.lineWidth = 1.5;
          g.stroke();
        }
      }
    }, { srgb: !bump })
  );
// A tongue of flame: a teardrop, white-hot at its root, fading up into nothing.
const flameTexture = () =>
  tex('flame', () =>
    canvasTexture(64, 128, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      const gr = g.createRadialGradient(w / 2, h * 0.78, 2, w / 2, h * 0.6, h * 0.55);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.3, 'rgba(255,230,160,0.9)');
      gr.addColorStop(0.7, 'rgba(255,140,40,0.35)');
      gr.addColorStop(1, 'rgba(255,80,0,0)');
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(w / 2, 0);
      g.bezierCurveTo(w * 0.62, h * 0.35, w * 0.98, h * 0.6, w * 0.82, h * 0.86);
      g.bezierCurveTo(w * 0.7, h * 1.0, w * 0.3, h * 1.0, w * 0.18, h * 0.86);
      g.bezierCurveTo(w * 0.02, h * 0.6, w * 0.38, h * 0.35, w / 2, 0);
      g.fill();
    }, { repeat: [1, 1] })
  );
// Low mist: soft blobs, tiling, for drifting layers over the floor of a cursed room.
const mistTex = () =>
  tex('mist', () =>
    canvasTexture(256, 256, (g, w) => {
      g.clearRect(0, 0, w, w);
      for (let i = 0; i < 70; i++) {
        const x = rand() * w, y = rand() * w, r = 20 + rand() * 50;
        for (const [dx, dy] of [[0, 0], [w, 0], [-w, 0], [0, w], [0, -w]]) {
          const gr = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
          gr.addColorStop(0, `rgba(255,255,255,${0.12 + rand() * 0.1})`);
          gr.addColorStop(1, 'rgba(255,255,255,0)');
          g.fillStyle = gr;
          g.fillRect(x + dx - r, y + dy - r, r * 2, r * 2);
        }
      }
    })
  );
const panel = () =>
  tex('panel', () =>
    canvasTexture(256, 128, (g, w, h) => {
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(0,0,0,0.28)';
      g.lineWidth = 6;
      g.strokeRect(18, 16, w - 36, h - 32);
      g.strokeStyle = 'rgba(255,255,255,0.9)';
      g.lineWidth = 2;
      g.strokeRect(24, 22, w - 48, h - 44);
    }, { repeat: [8, 1] })
  );
const cobweb = () =>
  tex('cobweb', () =>
    canvasTexture(256, 256, (g, w) => {
      g.strokeStyle = 'rgba(230,235,255,0.75)';
      g.lineWidth = 1.4;
      const spokes = 9;
      for (let i = 0; i < spokes; i++) {
        const a = (i / (spokes - 1)) * (Math.PI / 2);
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(Math.cos(a) * w * 1.4, Math.sin(a) * w * 1.4);
        g.stroke();
      }
      for (let r = 18; r < w * 1.3; r += 18 + r * 0.08) {
        g.beginPath();
        for (let i = 0; i < spokes; i++) {
          const a = (i / (spokes - 1)) * (Math.PI / 2);
          const rr = r * (0.94 + rand() * 0.1);
          i ? g.quadraticCurveTo(Math.cos(a - 0.1) * rr * 0.9, Math.sin(a - 0.1) * rr * 0.9, Math.cos(a) * rr, Math.sin(a) * rr) : g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        g.stroke();
      }
    }, { srgb: true })
  );
const books = () =>
  tex('books', () =>
    canvasTexture(512, 256, (g, w, h) => {
      g.fillStyle = '#2a1a12';
      g.fillRect(0, 0, w, h);
      const shelves = 4, sh = h / shelves;
      for (let s = 0; s < shelves; s++) {
        let x = 4;
        while (x < w - 6) {
          const bw = 8 + rand() * 12, bh = sh * (0.62 + rand() * 0.3);
          const hue = [350, 210, 130, 40, 280, 20][Math.floor(rand() * 6)];
          g.fillStyle = `hsl(${hue}, ${40 + rand() * 30}%, ${22 + rand() * 22}%)`;
          g.fillRect(x, s * sh + sh - bh - 6, bw, bh);
          g.fillStyle = 'rgba(240,200,110,0.7)';
          g.fillRect(x + 1, s * sh + sh - bh + 4, bw - 2, 2);
          g.fillRect(x + 1, s * sh + sh - 16, bw - 2, 2);
          x += bw + 1 + (rand() < 0.08 ? 10 : 0);
        }
        g.fillStyle = '#5a3a24';
        g.fillRect(0, s * sh + sh - 6, w, 6);
      }
    }, { repeat: [1, 1] })
  );
const stained = () =>
  tex('stained', () =>
    canvasTexture(512, 512, (g, w) => {
      const c = w / 2;
      g.fillStyle = '#1b1430';
      g.fillRect(0, 0, w, w);
      const cols = ['#ff9ad5', '#9ad8ff', '#ffe08a', '#b9a3ff', '#8ff0c8', '#ffb38a'];
      for (let ring = 4; ring >= 1; ring--)
        for (let i = 0; i < ring * 6; i++) {
          g.beginPath();
          g.moveTo(c, c);
          g.arc(c, c, (ring / 4) * c * 0.98, (i / (ring * 6)) * TAU, ((i + 1) / (ring * 6)) * TAU);
          g.closePath();
          g.fillStyle = cols[(i + ring) % cols.length];
          g.fill();
          g.strokeStyle = '#1b1430';
          g.lineWidth = 6;
          g.stroke();
        }
      g.fillStyle = '#fff6d8';
      g.beginPath();
      g.arc(c, c, c * 0.14, 0, TAU);
      g.fill();
    })
  );
// A portrait in a frame: a soft painted lady or landscape.
const portrait = (seed) =>
  tex(`portrait-${seed}`, () =>
    canvasTexture(128, 160, (g, w, h) => {
      const r = mulberry(seed);
      const bg = g.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, `hsl(${200 + r() * 80}, 35%, 30%)`);
      bg.addColorStop(1, `hsl(${20 + r() * 40}, 40%, 18%)`);
      g.fillStyle = bg;
      g.fillRect(0, 0, w, h);
      g.fillStyle = `hsl(${r() * 360}, 45%, 45%)`;
      g.beginPath();
      g.ellipse(w / 2, h * 0.95, w * 0.42, h * 0.38, 0, 0, TAU);
      g.fill();
      g.fillStyle = '#f0d2b8';
      g.beginPath();
      g.ellipse(w / 2, h * 0.42, w * 0.17, h * 0.15, 0, 0, TAU);
      g.fill();
      g.fillStyle = `hsl(${20 + r() * 30}, 50%, ${20 + r() * 40}%)`;
      g.beginPath();
      g.ellipse(w / 2, h * 0.36, w * 0.22, h * 0.14, 0, Math.PI, TAU);
      g.fill();
      g.fillStyle = '#20181a';
      g.fillRect(w * 0.43, h * 0.42, 4, 3);
      g.fillRect(w * 0.54, h * 0.42, 4, 3);
    })
  );

// ---------- materials with two moods ----------
// Mood: every material, light and object that differs between dark and won, and how to blend them.
class Mood {
  constructor(scene) {
    this.scene = scene;
    this.mats = [];
    this.lights = [];
    this.items = [];
    this.hooks = [];
    this.f = 0;
    // Shine: how strong the shared environment map is, dark and won.
    this.env = [0.12, 0.28];
    scene.environment = envMap();
  }
  // Anything else that changes with the room (a shader's colour, a sprite): `fn(f)` on every set.
  on(fn) {
    this.hooks.push(fn);
  }
  // A standard material whose colour (and glow) move from `dark` to `bright`.
  mat({ dark, bright, map = null, bumpMap = null, bumpScale = 1, alphaMap = null, roughness = 0.8, metalness = 0, emissive = [0x000000, 0x000000], ei = [0, 0], side = THREE.FrontSide, transparent = false, opacity = [1, 1], blending, depthWrite = true, flat = false }) {
    const m = new THREE.MeshStandardMaterial({ color: dark, map, bumpMap, bumpScale, alphaMap, roughness, metalness, side, transparent, flatShading: flat, depthWrite });
    if (blending) m.blending = blending;
    this.mats.push({ m, c: [new THREE.Color(dark), new THREE.Color(bright)], e: emissive.map((c) => new THREE.Color(c)), ei, opacity });
    return m;
  }
  light(l, dark, bright) {
    this.lights.push({ l, c: [new THREE.Color(dark.color), new THREE.Color(bright.color)], i: [dark.intensity, bright.intensity] });
    this.scene.add(l);
    return l;
  }
  // An object with its own change, which happens when the wave of light reaches it (`apply(f)` with f 0..1).
  item(position, apply) {
    this.items.push({ p: position.clone(), apply, f: -1 });
  }
  fog(dark, bright) {
    this.fogs = { c: [new THREE.Color(dark.color), new THREE.Color(bright.color)], d: [dark.density, bright.density] };
    this.scene.fog = new THREE.FogExp2(dark.color, dark.density);
    this.scene.background = new THREE.Color(dark.color);
  }
  // f: how won (0..1) for the whole room. wave: { origin, radius } — items beyond the radius are still dark.
  set(f, wave = null) {
    this.f = f;
    for (const { m, c, e, ei, opacity } of this.mats) {
      m.color.copy(c[0]).lerp(c[1], f);
      m.emissive.copy(e[0]).lerp(e[1], f);
      m.emissiveIntensity = lerp(ei[0], ei[1], f);
      if (m.transparent) m.opacity = lerp(opacity[0], opacity[1], f);
    }
    for (const { l, c, i } of this.lights) {
      l.color.copy(c[0]).lerp(c[1], f);
      l.intensity = lerp(i[0], i[1], f);
      l.visible = l.intensity > 0.001;
    }
    this.scene.environmentIntensity = lerp(this.env[0], this.env[1], f);
    for (const fn of this.hooks) fn(f);
    if (this.fogs) {
      this.scene.fog.color.copy(this.fogs.c[0]).lerp(this.fogs.c[1], f);
      this.scene.fog.density = lerp(this.fogs.d[0], this.fogs.d[1], f);
      this.scene.background.copy(this.scene.fog.color);
    }
    for (const it of this.items) {
      const lf = wave ? clamp01((wave.radius - it.p.distanceTo(wave.origin)) / 1.6) : f;
      if (Math.abs(lf - it.f) < 0.002) continue;
      it.f = lf;
      it.apply(ease(lf));
    }
  }
}

// ---------- building blocks ----------
function box(w, h, d, mat, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  parent?.add(m);
  return m;
}
function sphere(r, mat, x = 0, y = 0, z = 0, parent, seg = 20) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75)), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent?.add(m);
  return m;
}
function cyl(rt, rb, h, mat, x = 0, y = 0, z = 0, parent, seg = 16) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  parent?.add(m);
  return m;
}

// Gold and dark wood that every room shares (their own moods are made per room, so one room's win never brightens
// another's).
function commonMats(mood) {
  return {
    gold: mood.mat({ dark: 0x5a5444, bright: 0xf2c96b, roughness: 0.35, metalness: 0.8 }),
    wood: mood.mat({ dark: 0x2e2a2c, bright: 0x8a5634, roughness: 0.65 }),
    darkWood: mood.mat({ dark: 0x1e1a1c, bright: 0x5a3420, roughness: 0.6 }),
    cream: mood.mat({ dark: 0x4b4d5a, bright: 0xdccdb6, roughness: 0.7 }),
    candle: mood.mat({ dark: 0x5a5a5e, bright: 0xfff8ec, roughness: 0.5 }),
    flame: mood.mat({ dark: 0x000000, bright: 0xffd27a, emissive: [0x000000, 0xffb340], ei: [0, 3.2], roughness: 1 })
  };
}

// The shell: floor, ceiling, walls with wallpaper above a panelled dado, a cornice, and pilasters.
function shell(mood, M, { w, d, h, floorMap, floorDark, floorBright, wallMap, wallBump = null, wallDark, wallBright, ceilingDark = 0x15151c, ceilingBright = 0xd8cec2 }) {
  const g = new THREE.Group();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), mood.mat({ dark: floorDark, bright: floorBright, map: floorMap, roughness: 0.45, metalness: 0.05 }));
  floor.receiveShadow = true;
  floor.name = 'floor';
  g.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(Math.PI / 2), mood.mat({ dark: ceilingDark, bright: ceilingBright }));
  ceil.position.y = h;
  g.add(ceil);
  const wallMat = mood.mat({ dark: wallDark, bright: wallBright, map: wallMap, bumpMap: wallBump, bumpScale: 1.5, roughness: 0.9 });
  const dadoMat = mood.mat({ dark: 0x2c2e38, bright: 0xf7efe2, map: panel(), roughness: 0.6 });
  const walls = [
    [w, [0, 0, -d / 2], 0],
    [w, [0, 0, d / 2], Math.PI],
    [d, [-w / 2, 0, 0], Math.PI / 2],
    [d, [w / 2, 0, 0], -Math.PI / 2]
  ];
  for (const [len, [x, , z], ry] of walls) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(len, h), wallMat);
    wall.position.set(x, h / 2, z);
    wall.rotation.y = ry;
    wall.receiveShadow = true;
    g.add(wall);
    const dado = new THREE.Mesh(new THREE.BoxGeometry(len, 1.05, 0.06), dadoMat);
    dado.position.set(x, 0.525, z);
    dado.rotation.y = ry;
    dado.translateZ(0.03);
    dado.receiveShadow = true;
    g.add(dado);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.07, 0.1), M.gold);
    rail.position.set(x, 1.07, z);
    rail.rotation.y = ry;
    rail.translateZ(0.05);
    g.add(rail);
    const cornice = new THREE.Mesh(new THREE.BoxGeometry(len, 0.28, 0.26), M.cream);
    cornice.position.set(x, h - 0.14, z);
    cornice.rotation.y = ry;
    cornice.translateZ(0.13);
    g.add(cornice);
    const skirting = new THREE.Mesh(new THREE.BoxGeometry(len, 0.16, 0.1), M.darkWood);
    skirting.position.set(x, 0.08, z);
    skirting.rotation.y = ry;
    skirting.translateZ(0.07);
    g.add(skirting);
  }
  return g;
}

// A tall arched window on a wall: frame, panes that are the sky (moonlit or sunny), curtains, and in the dark, boards
// nailed across it that fall away as the light reaches them.
function windowOn(mood, M, parent, { x, z, ry, w = 1.5, h = 2.8, sill = 1.1, curtainDark = 0x2a2836, curtainBright = 0xd9577f }) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0);
  shape.lineTo(w / 2, 0);
  shape.lineTo(w / 2, h - w / 2);
  shape.absarc(0, h - w / 2, w / 2, 0, Math.PI, false);
  shape.lineTo(-w / 2, 0);
  const glass = new THREE.Mesh(new THREE.ShapeGeometry(shape, 16), mood.mat({ dark: 0x0b1230, bright: 0xe8dcc0, emissive: [0x2a3c88, 0xffe0a8], ei: [0.9, 0.7], roughness: 1 }));
  glass.position.set(0, sill, 0.02);
  g.add(glass);
  // The frame and glazing bars.
  const bar = (bw, bh, bx, by) => box(bw, bh, 0.06, M.cream, bx, sill + by, 0.05, g);
  bar(w + 0.16, 0.12, 0, -0.06);
  bar(0.1, h - w / 2, -w / 2 - 0.03, (h - w / 2) / 2);
  bar(0.1, h - w / 2, w / 2 + 0.03, (h - w / 2) / 2);
  bar(0.05, h - 0.1, 0, h / 2);
  for (let i = 1; i < 4; i++) bar(w, 0.04, 0, ((h - w / 2) * i) / 4);
  const arch = new THREE.Mesh(new THREE.TorusGeometry(w / 2 + 0.03, 0.05, 6, 24, Math.PI), M.cream);
  arch.position.set(0, sill + h - w / 2, 0.05);
  g.add(arch);
  // Curtains: two drapes, gathered, with a pelmet.
  const drape = mood.mat({ dark: curtainDark, bright: curtainBright, roughness: 0.85, side: THREE.DoubleSide });
  for (const s of [-1, 1]) {
    const geo = new THREE.PlaneGeometry(0.55, h + 0.6, 10, 8);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const px = p.getX(i), py = p.getY(i);
      p.setZ(i, Math.sin(px * 22) * 0.05 + 0.08);
      p.setX(i, px * (0.75 + 0.25 * ((py + h / 2) / h)));
    }
    geo.computeVertexNormals();
    const c = new THREE.Mesh(geo, drape);
    c.position.set(s * (w / 2 + 0.22), sill + (h + 0.6) / 2 - 0.35, 0.1);
    c.castShadow = true;
    g.add(c);
  }
  box(w + 1.3, 0.3, 0.16, M.gold, 0, sill + h + 0.3, 0.14, g);
  // Boards across it, in the dark.
  const boardMat = mood.mat({ dark: 0x3a3230, bright: 0x3a3230, roughness: 0.9 });
  for (let i = 0; i < 3; i++) {
    const b = box(w + 0.3, 0.2, 0.05, boardMat, 0, sill + 0.6 + i * 0.8, 0.12, g);
    b.rotation.z = (rand() - 0.5) * 0.5;
    const wp = new THREE.Vector3();
    mood.item(g.localToWorld(b.position.clone()), (f) => {
      b.position.y = sill + 0.6 + i * 0.8 - f * 3;
      b.rotation.x = f * 1.2;
      b.visible = f < 0.98;
    });
    void wp;
  }
  // A shaft of light falling into the room from the window: moonlight while cursed, sunlight once won.
  const shaft = lightShaft(mood, { from: [0x6f8cff, 0.2], to: [0xffd38a, 0.07], top: w * 0.45, bottom: w * 0.8, length: sill + h * 1.1, flat: 0.35 });
  shaft.position.set(0, sill + h * 0.62, 0.15);
  shaft.rotation.x = -0.62;
  g.add(shaft);
  parent.add(g);
  return g;
}

// A chandelier: rings of gold, candles, crystal drops. Dark: crooked, unlit, wrapped in cobweb. Won: lit.
function chandelier(mood, M, parent, { x, z, y, r = 0.8, candles = 8 }) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const chain = cyl(0.015, 0.015, 1.2, M.gold, 0, 0.6, 0, g, 6);
  void chain;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.035, 8, 40), M.gold);
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(r * 0.55, 0.03, 8, 30), M.gold);
  ring2.rotation.x = Math.PI / 2;
  ring2.position.y = -0.25;
  g.add(ring2);
  const crystal = mood.mat({ dark: 0x3a3f50, bright: 0xe8f4ff, emissive: [0x000000, 0x9fd0ff], ei: [0, 0.9], roughness: 0.1, metalness: 0.2, flat: true });
  const flames = [];
  for (let i = 0; i < candles; i++) {
    const a = (i / candles) * TAU;
    cyl(0.025, 0.025, 0.16, M.candle, Math.cos(a) * r, 0.08, Math.sin(a) * r, g, 8);
    const fl = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), M.flame);
    fl.scale.y = 1.8;
    fl.position.set(Math.cos(a) * r, 0.21, Math.sin(a) * r);
    g.add(fl);
    flames.push(fl);
    const halo = glow(0xffb85a, 0.35, 1.4);
    fl.add(halo);
    halo.scale.set(0.35 / 1, 0.35 / 1.8, 1);
    const drop = new THREE.Mesh(new THREE.OctahedronGeometry(0.04, 0), crystal);
    drop.scale.y = 1.8;
    drop.position.set(Math.cos(a + 0.4) * r * 0.8, -0.18, Math.sin(a + 0.4) * r * 0.8);
    g.add(drop);
  }
  const light = mood.light(new THREE.PointLight(0xffc27a, 0, 14, 1.6), { color: 0xffc27a, intensity: 0 }, { color: 0xffc98a, intensity: 5.5 });
  light.position.set(x, y - 0.1, z);
  const tilt = 0.25;
  g.rotation.z = tilt;
  mood.item(new THREE.Vector3(x, 0, z), (f) => {
    g.rotation.z = tilt * (1 - f);
    for (const fl of flames) fl.visible = f > 0.5;
  });
  parent.add(g);
  g.userData.flames = flames;
  return g;
}

// Cobwebs in the corners and hung between things; they shrink and fade as the light reaches them.
function cobwebs(mood, parent, spots) {
  const mat = new THREE.MeshBasicMaterial({ map: cobweb(), transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide, fog: true });
  for (const [x, y, z, ry, s, rz = 0] of spots) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).translate(0.5, -0.5, 0), mat.clone());
    m.position.set(x, y, z);
    m.rotation.set(0, ry, rz);
    m.scale.setScalar(s);
    parent.add(m);
    mood.item(m.position, (f) => {
      m.material.opacity = 0.55 * (1 - f);
      m.scale.setScalar(s * (1 - f * 0.7));
      m.visible = f < 0.99;
    });
  }
}

// Floating motes: dust in the dark (slow, grey-blue), sparkles once won (gold and pink, twinkling).
function motes(mood, parent, { w, d, h, n = 220 }) {
  const make = (count, colour, size) => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) pos.set([(rand() - 0.5) * w, rand() * h, (rand() - 0.5) * d], i * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: colour, size, map: dotTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    parent.add(pts);
    return pts;
  };
  const dust = make(n, 0x9fb0d8, 0.05);
  const sparkle = make(Math.round(n * 0.7), 0xffd9a8, 0.07);
  const base = dust.geometry.attributes.position.array.slice();
  const sbase = sparkle.geometry.attributes.position.array.slice();
  return (dt, t, f) => {
    dust.material.opacity = 0.55 * (1 - f);
    sparkle.material.opacity = 0.9 * f * (0.75 + 0.25 * Math.sin(t * 3));
    const a = dust.geometry.attributes.position.array;
    for (let i = 0; i < a.length; i += 3) {
      a[i] = base[i] + Math.sin(t * 0.13 + i) * 0.4;
      a[i + 1] = (base[i + 1] + t * 0.03 * ((i % 7) / 7 - 0.3) + h * 10) % h;
      a[i + 2] = base[i + 2] + Math.cos(t * 0.11 + i * 0.7) * 0.4;
    }
    dust.geometry.attributes.position.needsUpdate = true;
    const s = sparkle.geometry.attributes.position.array;
    for (let i = 0; i < s.length; i += 3) {
      s[i] = sbase[i] + Math.sin(t * 0.4 + i) * 0.25;
      s[i + 1] = (sbase[i + 1] + t * 0.12 + h * 10) % h;
      s[i + 2] = sbase[i + 2] + Math.cos(t * 0.35 + i * 0.3) * 0.25;
    }
    sparkle.geometry.attributes.position.needsUpdate = true;
  };
}

// The lights every room has: a sky light (hemisphere), the moon or the sun through the windows (with shadows), and a
// ghostly glow where the creatures wait, gone once won.
function lighting(mood, { sunFrom = [4, 7, 3], shadowBox = 7, ghost = [0, 1.5, -1] }) {
  mood.light(new THREE.HemisphereLight(0x3a4a7a, 0x0e0e16, 0.6), { color: 0x5a6a9a, intensity: 1.6 }, { color: 0xfff0dc, intensity: 0.7 });
  const sun = mood.light(new THREE.DirectionalLight(0x8fa8ff, 1), { color: 0x7f9cff, intensity: 1.0 }, { color: 0xffd9a0, intensity: 1.35 });
  sun.position.set(...sunFrom);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -shadowBox, right: shadowBox, top: shadowBox, bottom: -shadowBox, near: 0.5, far: 30 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  const ghostLight = mood.light(new THREE.PointLight(0x8f6bff, 1, 9, 1.5), { color: 0x7d5cff, intensity: 6 }, { color: 0xffb070, intensity: 0 });
  ghostLight.position.set(...ghost);
  // A cool stage light on the fight while the room is dark (Final Fantasy's arena is always readable).
  const stage = mood.light(new THREE.SpotLight(0xb8c4ff, 1, 12, 0.9, 0.85, 1.2), { color: 0xb8c4ff, intensity: 30 }, { color: 0xffe6c8, intensity: 0 });
  stage.position.set(ghost[0] + 1.6, 4.4, ghost[2] + 3.2);
  stage.target.position.set(ghost[0] + 1.6, 0, ghost[2]);
  mood.scene.add(stage.target);
  // A fill that keeps her readable in the dark.
  mood.light(new THREE.PointLight(0x9fb6ff, 1, 12, 1.2), { color: 0x9fb6ff, intensity: 5 }, { color: 0xffe6c8, intensity: 0.8 }).position.set(0, 3, 4);
  return { sun };
}

// The light sweep: a ring of light on the floor that runs out from her, the room changing behind it.
function sweeper(scene, mood, maxR) {
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xfff1c8, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 64).rotateX(-Math.PI / 2), ringMat);
  ring.position.y = 0.03;
  scene.add(ring);
  const flash = new THREE.PointLight(0xfff0d0, 0, 30, 1);
  scene.add(flash);
  // A second, fainter ring of gold a moment behind the first, and a pillar of light where she stands.
  const ring2Mat = ringMat.clone();
  ring2Mat.color.set(0xffc96a);
  const ring2 = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 64).rotateX(-Math.PI / 2), ring2Mat);
  ring2.position.y = 0.025;
  scene.add(ring2);
  const pillarMat = shaftMaterial(0xfff0c0, 0);
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 12, 24, 1, true).translate(0, 6, 0), pillarMat);
  pillar.visible = false;
  scene.add(pillar);
  const runeMat = new THREE.MeshBasicMaterial({ map: runeTexture(), color: new THREE.Color(0xffe6a0).multiplyScalar(2), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const runeDisc = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2).rotateX(-Math.PI / 2), runeMat);
  runeDisc.position.y = 0.035;
  scene.add(runeDisc);
  return (from) =>
    new Promise((resolve) => {
      const start = performance.now(), dur = 3400;
      const origin = from.clone().setY(0);
      for (const m of [ring, ring2, pillar, runeDisc]) {
        m.position.x = origin.x;
        m.position.z = origin.z;
      }
      pillar.visible = true;
      flash.position.copy(origin).setY(1.4);
      const step = () => {
        const t = Math.min(1, (performance.now() - start) / dur);
        const radius = ease(t) * (maxR + 2);
        ring.scale.setScalar(Math.max(0.01, radius));
        ringMat.opacity = 0.9 * (1 - t);
        const t2 = clamp01((t - 0.12) / 0.88);
        ring2.scale.setScalar(Math.max(0.01, ease(t2) * (maxR + 2)));
        ring2Mat.opacity = 0.7 * (1 - t2) * (t2 > 0 ? 1 : 0);
        const p = Math.sin(Math.min(1, t * 1.6) * Math.PI);
        pillarMat.uniforms.strength.value = 1.6 * p;
        pillar.scale.set(1 + t * 0.6, 1, 1 + t * 0.6);
        runeMat.opacity = Math.sin(Math.min(1, t * 1.4) * Math.PI);
        runeDisc.rotation.y = t * 2.5;
        runeDisc.scale.setScalar(0.6 + t * 1.2);
        flash.intensity = 30 * Math.sin(Math.min(1, t * 2.5) * Math.PI) * (1 - t);
        mood.set(ease(Math.min(1, t * 1.15)), { origin, radius });
        if (t < 1) requestAnimationFrame(step);
        else {
          ringMat.opacity = ring2Mat.opacity = runeMat.opacity = 0;
          pillar.visible = false;
          flash.intensity = 0;
          mood.set(1);
          resolve();
        }
      };
      step();
    });
}

// A wooden double door with an arch, panels and gold handles; `glow` is the light that leaks round it (the curse's
// violet, or warm gold once the room behind it is won).
// A cursed door also wears a turning rune of violet light; `setDoor` in the Hall takes it away once the room is won,
// and the leaves swing open on warm light.
export function makeDoor(mood, M, { w = 1.7, h = 2.8, rune = false } = {}) {
  const g = new THREE.Group();
  const frame = mood.mat({ dark: 0x3a3a46, bright: 0xe9dfcc, roughness: 0.7 });
  box(w + 0.4, 0.22, 0.25, frame, 0, h + 0.4, 0, g);
  box(0.22, h + 0.5, 0.25, frame, -w / 2 - 0.11, (h + 0.5) / 2, 0, g);
  box(0.22, h + 0.5, 0.25, frame, w / 2 + 0.11, (h + 0.5) / 2, 0, g);
  // A gilded bead inside the frame, and a keystone.
  box(w + 0.06, 0.04, 0.05, M.gold, 0, h + 0.27, 0.13, g);
  box(0.04, h + 0.27, 0.05, M.gold, -w / 2 - 0.03, (h + 0.27) / 2, 0.13, g);
  box(0.04, h + 0.27, 0.05, M.gold, w / 2 + 0.03, (h + 0.27) / 2, 0.13, g);
  box(0.26, 0.34, 0.3, M.gold, 0, h + 0.45, 0.02, g);
  // Behind the leaves: warm light, seen only when they open.
  const inside = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffc777).multiplyScalar(1.6), toneMapped: false }));
  inside.position.set(0, h / 2, -0.06);
  g.add(inside);
  const leafMat = mood.mat({ dark: 0x6a5a66, bright: 0xffffff, map: doorLeaf(false), bumpMap: doorLeaf(true), bumpScale: 3, roughness: 0.45 });
  const leaves = [];
  for (const s of [-1, 1]) {
    const leaf = new THREE.Group();
    leaf.position.set(s * w / 2, 0, 0.03);
    const p = box(w / 2 - 0.02, h, 0.08, leafMat, -s * (w / 4), h / 2, 0, leaf);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), M.gold);
    knob.position.set(-s * (w / 2 - 0.12), h * 0.45, 0.08);
    leaf.add(knob);
    const plate = box(0.07, 0.24, 0.02, M.gold, -s * (w / 2 - 0.12), h * 0.45, 0.05, leaf);
    void p;
    void plate;
    g.add(leaf);
    leaves.push(leaf);
  }
  const arch = new THREE.Mesh(new THREE.CircleGeometry(w / 2, 24, 0, Math.PI), new THREE.MeshStandardMaterial({ color: 0x241a28, map: stained(), emissiveMap: stained(), emissive: 0x6b4bff, emissiveIntensity: 0.6 }));
  arch.position.set(0, h + 0.02, 0.01);
  g.add(arch);
  let seal = null;
  if (rune) {
    seal = new THREE.Group();
    seal.position.set(0, h * 0.5, 0.16);
    const disc = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.95, w * 0.95), new THREE.MeshBasicMaterial({ map: runeTexture(), color: new THREE.Color(0xa77bff).multiplyScalar(2.2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    seal.add(disc);
    const halo = glow(0x8a5cff, w * 1.6, 0.9);
    halo.position.z = 0.05;
    seal.add(halo);
    g.add(seal);
    seal.userData.disc = disc;
  }
  g.userData = { leaves, arch, seal, inside };
  return g;
}

// ---------- the dressing of a place: columns, sconces, mist, light shafts ----------

// A shaft of light (look.mjs's `shaftMaterial`) from `top` wide to `bottom` wide over `length`, hanging down from its
// origin; `flat` squashes it (a window's shaft is wider than deep). The mood moves its colour and strength.
function lightShaft(mood, { from, to, top, bottom, length, flat = 1 }) {
  const mat = shaftMaterial(from[0], from[1]);
  const geo = new THREE.CylinderGeometry(top, bottom, length, 24, 1, true);
  geo.translate(0, -length / 2, 0);
  const m = new THREE.Mesh(geo, mat);
  m.scale.z = flat;
  m.renderOrder = 2;
  const a = new THREE.Color(from[0]), b = new THREE.Color(to[0]);
  mood.on((f) => {
    mat.uniforms.colour.value.copy(a).lerp(b, f);
    mat.uniforms.strength.value = lerp(from[1], to[1], f);
  });
  m.onBeforeRender = () => (mat.uniforms.time.value = performance.now() / 1000);
  return m;
}

// A classical column: a fluted shaft, a moulded base on a square plinth, a flared capital under a square abacus, the
// mouldings in gold.
function column(mat, gold, { x, z, h, r = 0.34 }) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const plinth = box(r * 2.9, 0.22, r * 2.9, mat, 0, 0.11, 0, g);
  void plinth;
  const base = new THREE.Mesh(new THREE.LatheGeometry([[r * 1.35, 0], [r * 1.35, 0.08], [r * 1.22, 0.16], [r * 1.15, 0.22], [r * 1.22, 0.28], [r * 1.05, 0.36], [r, 0.4]].map(([a, b]) => new THREE.Vector2(a, b)), 32), gold);
  base.position.y = 0.22;
  base.castShadow = true;
  g.add(base);
  const shaftH = h - 0.22 - 0.4 - 0.75;
  const geo = new THREE.CylinderGeometry(r * 0.9, r, shaftH, 120, 1, true);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const px = p.getX(i), pz = p.getZ(i);
    const a = Math.atan2(pz, px);
    const groove = Math.pow(Math.max(0, Math.cos(a * 22)), 2) * 0.07;
    p.setX(i, px * (1 - groove));
    p.setZ(i, pz * (1 - groove));
  }
  geo.computeVertexNormals();
  const shaft = new THREE.Mesh(geo, mat);
  shaft.position.y = 0.62 + shaftH / 2;
  shaft.castShadow = shaft.receiveShadow = true;
  g.add(shaft);
  const top = 0.62 + shaftH;
  const capital = new THREE.Mesh(new THREE.LatheGeometry([[r * 0.9, 0], [r * 1.02, 0.06], [r * 0.95, 0.12], [r * 1.05, 0.3], [r * 1.35, 0.55], [r * 1.5, 0.6]].map(([a, b]) => new THREE.Vector2(a, b)), 32), gold);
  capital.position.y = top;
  capital.castShadow = true;
  g.add(capital);
  box(r * 3.2, 0.15, r * 3.2, mat, 0, top + 0.675, 0, g);
  return g;
}

// A wall sconce: a gilded backplate and two candles. While the room is cursed they burn with cold witch-fire (green
// and ghostly, flickering); once won, warm gold. No light of their own: their glow is a sprite and the bloom.
function sconce(mood, M, parent, updates, { x, y, z, ry }) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = ry;
  box(0.16, 0.42, 0.04, M.gold, 0, 0, 0.02, g);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), M.gold);
  knob.position.set(0, -0.2, 0.06);
  g.add(knob);
  const flames = [], halos = [];
  for (const s of [-1, 1]) {
    const arm = cyl(0.012, 0.012, 0.2, M.gold, s * 0.07, -0.04, 0.09, g, 6);
    arm.rotation.set(0.5, 0, s * -1.0);
    const cup = cyl(0.04, 0.025, 0.04, M.gold, s * 0.12, 0, 0.14, g, 10);
    void cup;
    cyl(0.02, 0.02, 0.14, M.candle, s * 0.12, 0.09, 0.14, g, 8);
    const fl = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
    fl.scale.y = 2;
    fl.position.set(s * 0.12, 0.2, 0.14);
    g.add(fl);
    flames.push(fl);
    const halo = glow(0xffffff, 0.3, 1.3);
    halo.position.copy(fl.position);
    g.add(halo);
    halos.push(halo);
  }
  const witch = new THREE.Color(0x5affc8), warm = new THREE.Color(0xffb04a);
  const c = new THREE.Color();
  mood.on((f) => {
    c.copy(witch).lerp(warm, f);
    for (const fl of flames) fl.material.color.copy(c).multiplyScalar(2.2);
    for (const h of halos) h.material.color.copy(c).multiplyScalar(lerp(1.1, 1.5, f));
  });
  const seed = rand() * 10;
  updates.push((dt, t, f) => {
    const flick = 0.85 + Math.sin(t * (f > 0.5 ? 11 : 6) + seed) * 0.08 + Math.sin(t * 23 + seed * 3) * 0.06;
    flames.forEach((fl, i) => (fl.scale.y = 2 * (flick + i * 0.03)));
    halos.forEach((h) => h.scale.setScalar(0.3 * flick));
  });
  parent.add(g);
  return g;
}

// Low mist over the floor of a cursed place: three layers drifting different ways, gone once won.
function mist(mood, parent, { w, d, colour = 0x6a78b0, thick = 1 }) {
  const layers = [];
  for (const [y, speed, opacity] of [[0.1, 0.012, 0.42 * thick], [0.3, -0.008, 0.3 * thick], [0.55, 0.006, 0.16 * thick]]) {
    const t = mistTex().clone();
    t.repeat.set(w / 6, d / 6);
    t.needsUpdate = true;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: t, color: colour, transparent: true, opacity, depthWrite: false }));
    m.position.y = y;
    m.renderOrder = 1;
    parent.add(m);
    layers.push({ m, t, speed, opacity });
  }
  mood.on((f) => layers.forEach((l) => {
    l.m.material.opacity = l.opacity * (1 - f);
    l.m.visible = f < 0.99;
  }));
  return (dt) => layers.forEach((l, i) => {
    l.t.offset.x += l.speed * dt;
    l.t.offset.y += l.speed * 0.6 * dt * (i % 2 ? 1 : -1);
  });
}

// ---------- the places ----------

// The Grand Hall: the hub. Checked marble, pillars, a grand staircase up to a gallery, portraits, a chandelier, the
// three doors, and four spots where potions glow. It brightens as rooms are won (setRestored with the share won).
function buildHall() {
  const scene = new THREE.Scene();
  const mood = new Mood(scene);
  const M = commonMats(mood);
  const W = 16, D = 15, H = 8;
  mood.fog({ color: 0x0a0b1c, density: 0.03 }, { color: 0xd8c8b4, density: 0.004 });
  mood.env = [0.14, 0.3];
  const [wallMap, wallBump] = [stone(), stoneBump()].map((t) => {
    const c = t.clone();
    c.repeat.set(3.2, 2);
    c.needsUpdate = true;
    return c;
  });
  const room = shell(mood, M, { w: W, d: D, h: H, floorMap: marble(), floorDark: 0x6a6e86, floorBright: 0xe2dcd4, wallMap, wallBump, wallDark: 0x3c3f52, wallBright: 0xe0d0bc });
  scene.add(room);
  lighting(mood, { sunFrom: [6, 9, 5], shadowBox: 9, ghost: [0, 2.5, -4] });
  const blockers = [];
  const updates = [];
  // The marble is polished to a mirror (on 'high'): the floor is drawn a little see-through over a reflection of the
  // hall, the dark squares more than the white.
  if (QUALITY === 'high') {
    const floor = room.getObjectByName('floor');
    floor.material.transparent = true;
    floor.material.alphaMap = marbleAlpha();
    floor.material.roughness = 0.25;
    floor.renderOrder = -1;
    mood.mats.find((x) => x.m === floor.material).opacity = [0.8, 0.86];
    const mirror = new Reflector(new THREE.PlaneGeometry(W, D), { textureWidth: 512, textureHeight: 512, color: 0x9a9aa8, clipBias: 0.003 });
    mirror.rotation.x = -Math.PI / 2;
    mirror.position.y = -0.002;
    // The reflection reuses this frame's shadow maps rather than drawing them twice.
    const draw = mirror.onBeforeRender;
    mirror.onBeforeRender = (renderer, sc, cam) => {
      const auto = renderer.shadowMap.autoUpdate;
      renderer.shadowMap.autoUpdate = false;
      draw.call(mirror, renderer, sc, cam);
      renderer.shadowMap.autoUpdate = auto;
    };
    scene.add(mirror);
  }
  // Columns down both sides, each with a sconce on its face towards the middle of the hall.
  const pillarMat = mood.mat({ dark: 0x50525e, bright: 0xe2d9cc, roughness: 0.3 });
  for (const x of [-5.6, 5.6])
    for (const z of [-4.5, -0.5, 3.5]) {
      scene.add(column(pillarMat, M.gold, { x, z, h: H - 0.3, r: 0.34 }));
      sconce(mood, M, scene, updates, { x: x - Math.sign(x) * 0.33, y: 2.5, z, ry: -Math.sign(x) * Math.PI / 2 });
      blockers.push({ minX: x - 0.5, maxX: x + 0.5, minZ: z - 0.5, maxZ: z + 0.5 });
    }
  // A crimson runner from the front doors to the foot of the stairs.
  const runnerMat = mood.mat({ dark: 0x4a3a50, bright: 0xffffff, map: runner(), roughness: 0.95 });
  const runnerLen = D / 2 - 0.3 + 2.6;
  const carpetRun = new THREE.Mesh(new THREE.PlaneGeometry(2.4, runnerLen).rotateX(-Math.PI / 2), runnerMat);
  carpetRun.position.set(0, 0.006, D / 2 - 0.3 - runnerLen / 2);
  carpetRun.receiveShadow = true;
  scene.add(carpetRun);
  // The grand staircase up the back wall to a gallery.
  const stepMat = mood.mat({ dark: 0x4a4c5a, bright: 0xf2ece2, roughness: 0.5 });
  const carpet = mood.mat({ dark: 0x3a1a2a, bright: 0xc4204e, roughness: 0.9 });
  const steps = 12, rise = 3.6 / steps, run = 0.34;
  for (let i = 0; i < steps; i++) {
    const z = -D / 2 + 1.1 + (steps - i) * run;
    box(4, rise, run + 0.02, stepMat, 0, rise * (i + 0.5), z - 0.4, scene);
    box(2.4, 0.02, run, carpet, 0, rise * (i + 1) + 0.01, z - 0.4, scene);
    // Gold stair rods, and a baluster each side on every step.
    box(2.5, 0.025, 0.025, M.gold, 0, rise * (i + 1) + 0.02, z - 0.4 - run / 2 + 0.03, scene);
    for (const sx of [-1.9, 1.9]) cyl(0.03, 0.04, 0.9, M.cream, sx, rise * (i + 1) + 0.45, z - 0.4, scene, 6);
  }
  // The handrails, and a newel post at the foot of each with a lamp: witch-green while the hall is dark, gold after.
  const z0 = -D / 2 + 1.1 + steps * run - 0.4, z1 = -D / 2 + 1.1 + run - 0.4;
  const railLen = Math.hypot(z0 - z1, 3.6 - rise);
  for (const sx of [-1.9, 1.9]) {
    const rail = box(0.1, 0.08, railLen, M.darkWood, sx, (rise + 3.6) / 2 + 0.92, (z0 + z1) / 2, scene);
    rail.rotation.x = Math.atan2(3.6 - rise, z0 - z1);
    const newel = new THREE.Group();
    newel.position.set(sx, 0, z0 + 0.35);
    box(0.26, 1.2, 0.26, M.cream, 0, 0.6, 0, newel);
    box(0.34, 0.08, 0.34, M.gold, 0, 1.22, 0, newel);
    const globeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), globeMat);
    globe.position.y = 1.42;
    newel.add(globe);
    const halo = glow(0xffffff, 0.95, 1);
    halo.position.y = 1.42;
    newel.add(halo);
    const witch = new THREE.Color(0x4dffc0), warm = new THREE.Color(0xffd08a);
    mood.on((f) => {
      globeMat.color.copy(witch).lerp(warm, f).multiplyScalar(lerp(1.6, 2.2, f));
      halo.material.color.copy(witch).lerp(warm, f).multiplyScalar(lerp(0.9, 0.6, f));
    });
    updates.push((dt, t, f) => halo.scale.setScalar(0.95 + Math.sin(t * (2 + f * 3) + sx) * 0.06));
    scene.add(newel);
    blockers.push({ minX: sx - 0.2, maxX: sx + 0.2, minZ: z0 + 0.15, maxZ: z0 + 0.55 });
  }
  blockers.push({ minX: -2.2, maxX: 2.2, minZ: -D / 2, maxZ: -D / 2 + 1.1 + steps * run });
  // The gallery: a balcony across the back with a balustrade; thorny vines bar the top of the stairs (later rounds).
  box(W, 0.3, 1.6, stepMat, 0, 3.6, -D / 2 + 0.8, scene);
  for (let x = -W / 2 + 0.3; x < W / 2; x += 0.35) cyl(0.04, 0.05, 0.8, M.cream, x, 4.15, -D / 2 + 1.55, scene, 6);
  box(W, 0.08, 0.14, M.gold, 0, 4.58, -D / 2 + 1.55, scene);
  const thorns = mood.mat({ dark: 0x1c2a1e, bright: 0x2e5a34, roughness: 0.8 });
  for (let i = 0; i < 14; i++) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.4 + rand() * 0.4, 0.04, 5, 12, Math.PI * (1 + rand())), thorns);
    t.position.set((rand() - 0.5) * 3.6, 4 + rand() * 1.2, -D / 2 + 1.4 + rand() * 0.4);
    t.rotation.set(rand() * 3, rand() * 3, rand() * 3);
    scene.add(t);
  }
  // Portraits between the pillars.
  const frameMat = M.gold;
  const paintings = [];
  for (const [x, z, ry, seed] of [[-W / 2 + 0.05, -2.5, Math.PI / 2, 3], [-W / 2 + 0.05, 1.6, Math.PI / 2, 5], [W / 2 - 0.05, -2.5, -Math.PI / 2, 8], [W / 2 - 0.05, 1.6, -Math.PI / 2, 11]]) {
    const g = new THREE.Group();
    g.position.set(x, 3.4, z);
    g.rotation.y = ry;
    box(1.3, 1.6, 0.08, frameMat, 0, 0, 0, g);
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.4), mood.mat({ dark: 0x3a3a48, bright: 0xffffff, map: portrait(seed), roughness: 0.9 }));
    pic.position.z = 0.05;
    g.add(pic);
    // In the dark their eyes glow.
    const eyes = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.04), mood.mat({ dark: 0x000000, bright: 0x000000, emissive: [0xb6ff9a, 0x000000], ei: [2.4, 0], transparent: true, opacity: [1, 0] }));
    eyes.position.set(0, 0.07, 0.06);
    g.add(eyes);
    scene.add(g);
    paintings.push(g);
  }
  chandelier(mood, M, scene, { x: 0, z: 0, y: H - 2.2, r: 1.4, candles: 14 });
  // The rose window over the gallery: stained glass that burns sick violet while the hall is cursed and blazes once
  // it is won, with its shaft of coloured light falling across the stairs to the floor.
  const roseY = 6.15, roseZ = -D / 2 + 0.03;
  const rose = new THREE.Mesh(new THREE.CircleGeometry(1.45, 48), mood.mat({ dark: 0x15122a, bright: 0xffffff, map: stained(), emissive: [0x6a3cc8, 0xffffff], ei: [0.55, 0.8], roughness: 1 }));
  rose.material.emissiveMap = stained();
  rose.position.set(0, roseY, roseZ);
  scene.add(rose);
  for (const [r, t] of [[1.48, 0.09], [1.62, 0.05]]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, t, 8, 64), M.gold);
    ring.position.set(0, roseY, roseZ + 0.03);
    scene.add(ring);
  }
  const roseShaft = lightShaft(mood, { from: [0x8a6cff, 0.16], to: [0xffe2b0, 0.12], top: 1.35, bottom: 2.4, length: 9.5 });
  roseShaft.position.set(0, roseY, roseZ + 0.2);
  roseShaft.rotation.x = -0.72;
  scene.add(roseShaft);
  windowOn(mood, M, scene, { x: -3.4, z: D / 2 - 0.02, ry: Math.PI, w: 1.6, h: 3.6, sill: 1.6 });
  windowOn(mood, M, scene, { x: 3.4, z: D / 2 - 0.02, ry: Math.PI, w: 1.6, h: 3.6, sill: 1.6 });
  cobwebs(mood, scene, [[-W / 2 + 0.05, H - 0.2, -D / 2 + 0.05, 0, 2.2], [W / 2 - 0.05, H - 0.2, -D / 2 + 0.05, -Math.PI / 2, 2.2], [-W / 2 + 0.05, H - 0.2, D / 2 - 0.05, Math.PI / 2, 1.8], [-5.3, 6.6, -0.5, 0.4, 1.4, 0.3], [5.3, 6.6, 3.5, -0.4, 1.2, -0.2]]);
  const motesUpdate = motes(mood, scene, { w: W, d: D, h: H, n: 260 });
  updates.push(mist(mood, scene, { w: W, d: D }));
  // The doors: Dressing Room on the left, Kitchen on the right, the Library at the back under the gallery. The front
  // doors behind her lead out (to the title).
  const doorSpots = {
    dressing: { x: -W / 2 + 0.14, z: -2.5 + 2.0, ry: Math.PI / 2 },
    kitchen: { x: W / 2 - 0.14, z: -2.5 + 2.0, ry: -Math.PI / 2 },
    library: { x: -5.0, z: -D / 2 + 0.14, ry: 0 },
    // Round 2: the Swan Wing, locked until the Grumpy Grimoire gives up its key.
    wing: { x: 5.0, z: -D / 2 + 0.14, ry: 0 },
    out: { x: 0, z: D / 2 - 0.14, ry: Math.PI }
  };
  const doors = [];
  for (const [id, s] of Object.entries(doorSpots)) {
    const door = makeDoor(mood, M, id === 'out' ? { w: 2.4, h: 3.6 } : { rune: true });
    door.position.set(s.x, 0, s.z);
    door.rotation.y = s.ry;
    scene.add(door);
    const glow = new THREE.PointLight(0x8f6bff, 3, 4, 1.6);
    glow.position.copy(door.localToWorld(new THREE.Vector3(0, 1.2, 0.8)));
    if (id !== 'out') scene.add(glow);
    // Where she stands to use it: in front of it.
    const front = door.localToWorld(new THREE.Vector3(0, 0, 1.1));
    doors.push({ id, x: front.x, z: front.z, door, glow, ry: s.ry });
  }
  // Potion spots: small round tables with a glowing bottle.
  const tableMat = M.wood;
  const potionSpots = [[-3.6, 3.2, 'heart'], [3.6, 3.2, 'star'], [-3.6, -3.6, 'star'], [3.6, -3.6, 'heart']].map(([x, z, kind]) => {
    cyl(0.32, 0.32, 0.05, tableMat, x, 0.8, z, scene, 20);
    cyl(0.05, 0.08, 0.8, tableMat, x, 0.4, z, scene, 8);
    cyl(0.22, 0.26, 0.04, tableMat, x, 0.02, z, scene, 16);
    blockers.push({ minX: x - 0.35, maxX: x + 0.35, minZ: z - 0.35, maxZ: z + 0.35, tall: false });
    const bottle = makePotion(kind);
    bottle.position.set(x, 0.83, z);
    scene.add(bottle);
    // Its aura, and a pool of its colour on the floor round the table.
    const colour = kind === 'heart' ? 0xff5fa8 : 0x5fa8ff;
    const aura = glow(colour, 0.9, 1.2);
    aura.position.y = 0.1;
    bottle.add(aura);
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: dotTexture(), color: new THREE.Color(colour).multiplyScalar(0.55), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    pool.position.set(x, 0.012, z);
    pool.renderOrder = 1;
    scene.add(pool);
    return { x, z, kind, bottle, pool, back: 0 };
  });
  const place = {
    id: 'hall', scene, mood, W, D, H, hub: true,
    bounds: { minX: -W / 2 + 0.5, maxX: W / 2 - 0.5, minZ: -D / 2 + 0.5, maxZ: D / 2 - 0.5 },
    blockers, doors, potionSpots,
    spawn: { x: 0, z: 3.6, face: Math.PI },
    setRestored(f) {
      mood.set(f);
    },
    // A door's look: glowing violet while its room is cursed, warm and open once won.
    setDoor(id, won) {
      const d = doors.find((d) => d.id === id);
      if (!d || id === 'out') return;
      d.glow.color.set(won ? 0xffc77a : 0x8f6bff);
      d.door.userData.arch.material.emissive.set(won ? 0xffc06a : 0x6b4bff);
      d.door.userData.arch.material.emissiveIntensity = won ? 1.8 : 0.6;
      for (const [i, leaf] of d.door.userData.leaves.entries()) leaf.rotation.y = won ? (i ? -1 : 1) * 0.5 : 0;
      if (d.door.userData.seal) d.door.userData.seal.visible = !won;
    },
    update(dt, t) {
      motesUpdate(dt, t, mood.f);
      for (const u of updates) u(dt, t, mood.f);
      for (const d of doors) {
        const seal = d.door.userData.seal;
        if (!seal?.visible) continue;
        seal.userData.disc.rotation.z = t * 0.35;
        seal.userData.disc.material.opacity = 0.75 + Math.sin(t * 2.2 + d.x) * 0.25;
      }
      for (const p of potionSpots) {
        p.bottle.visible = p.back <= 0;
        p.pool.visible = p.back <= 0;
        p.bottle.rotation.y = t * 0.8;
        p.bottle.position.y = 0.86 + Math.sin(t * 2 + p.x) * 0.03;
        if (p.back > 0) p.back -= dt;
      }
    }
  };
  return place;
}

// A potion bottle: round flask, cork, a glowing liquid (pink hearts, blue stars).
export function makePotion(kind) {
  const g = new THREE.Group();
  const colour = kind === 'heart' ? 0xff5fa8 : 0x5fa8ff;
  const glass = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, roughness: 0.05 }));
  glass.position.y = 0.09;
  g.add(glass);
  const liquid = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), new THREE.MeshStandardMaterial({ color: colour, emissive: colour, emissiveIntensity: 3.2 }));
  liquid.position.y = 0.085;
  g.add(liquid);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.08, 10), glass.material);
  neck.position.y = 0.2;
  g.add(neck);
  const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.024, 0.04, 10), new THREE.MeshStandardMaterial({ color: 0xa0784a }));
  cork.position.y = 0.25;
  g.add(cork);
  // No light of its own (four potions would be four more lights in every shader on a slow tablet): the bloom does it.
  return g;
}

// A room of the toy: shared bones (shell, lights, window, chandelier, cobwebs, motes, the exit door, the battle
// marks), then its own furniture from `furnish`.
function buildRoom(id, spec) {
  const scene = new THREE.Scene();
  const mood = new Mood(scene);
  const M = commonMats(mood);
  const { W, D, H } = spec;
  mood.fog({ color: spec.fogDark ?? 0x080a14, density: 0.07 }, { color: spec.fogBright ?? 0xd9c8b6, density: 0.006 });
  scene.add(shell(mood, M, { w: W, d: D, h: H, ...spec.shell }));
  lighting(mood, { sunFrom: spec.sunFrom ?? [-5, 7, 2], shadowBox: Math.max(W, D) / 2 + 1, ghost: [-1.6, 1.4, -0.4] });
  for (const win of spec.windows) windowOn(mood, M, scene, { ...win, curtainBright: spec.curtain ?? 0xd9577f });
  if (spec.chandelier !== false) chandelier(mood, M, scene, { x: 0, z: 0, y: H - 1.2, r: 0.75, candles: 8 });
  cobwebs(mood, scene, [[-W / 2 + 0.05, H - 0.1, -D / 2 + 0.05, 0, 1.6], [W / 2 - 0.05, H - 0.1, -D / 2 + 0.05, -Math.PI / 2, 1.5], [-W / 2 + 0.05, H - 0.1, D / 2 - 0.05, Math.PI / 2, 1.3], [W / 2 - 0.05, 2.6, D / 2 - 0.05, Math.PI, 1.1], ...(spec.webs ?? [])]);
  const motesUpdate = motes(mood, scene, { w: W, d: D, h: H });
  const exitDoor = makeDoor(mood, M);
  exitDoor.position.set(0, 0, D / 2 - 0.14);
  exitDoor.rotation.y = Math.PI;
  scene.add(exitDoor);
  const blockers = [];
  const updates = [mist(mood, scene, { w: W, d: D, colour: spec.mist ?? 0x5a6890, thick: 0.6 })];
  for (const [x, y, z, ry] of spec.sconces ?? []) sconce(mood, M, scene, updates, { x, y, z, ry });
  const feature = spec.furnish({ scene, mood, M, blockers, updates, W, D, H });
  const sweep = sweeper(scene, mood, Math.hypot(W, D) / 2 + 1);
  return {
    id, scene, mood, W, D, H,
    bounds: { minX: -W / 2 + 0.45, maxX: W / 2 - 0.45, minZ: -D / 2 + 0.45, maxZ: D / 2 - 0.45 },
    blockers,
    doors: [{ id: 'out', x: 0, z: D / 2 - 1.2, door: exitDoor }],
    spawn: { x: 0, z: D / 2 - 1.4, face: Math.PI },
    // The battle: she stands on the right, the creatures on the left (Final Fantasy's sides), the camera between.
    battle: spec.battle,
    feature,
    setRestored(f) {
      mood.set(f);
    },
    sweep,
    update(dt, t) {
      motesUpdate(dt, t, mood.f);
      for (const u of updates) u(dt, t, mood.f);
    }
  };
}

// The Dressing Room: wardrobes, a vanity with a great oval mirror, three gowns on dress forms, hat boxes, a chaise.
function furnishDressing({ scene, mood, M, blockers, updates, W, D }) {
  const pink = mood.mat({ dark: 0x3a3440, bright: 0xffd6e6, roughness: 0.7 });
  // Two tall wardrobes on the back wall.
  for (const x of [-2.4, 2.4]) {
    const g = new THREE.Group();
    g.position.set(x, 0, -D / 2 + 0.45);
    box(1.6, 2.6, 0.7, M.cream, 0, 1.3, 0, g);
    box(1.8, 0.2, 0.8, M.gold, 0, 2.7, 0, g);
    const crest = new THREE.Mesh(new THREE.CircleGeometry(0.4, 24, 0, Math.PI), M.gold);
    crest.position.set(0, 2.8, 0.35);
    g.add(crest);
    for (const s of [-1, 1]) {
      const door = box(0.74, 2.3, 0.05, pink, s * 0.39, 1.3, 0.37, g);
      box(0.5, 0.8, 0.02, M.cream, s * 0.39, 1.75, 0.4, g);
      box(0.5, 0.8, 0.02, M.cream, s * 0.39, 0.8, 0.4, g);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), M.gold);
      knob.position.set(s * 0.08, 1.3, 0.42);
      g.add(knob);
      // Hanging off its hinges in the dark.
      const tilt = s * 0.5 + (x < 0 ? 0.2 : -0.3);
      mood.item(new THREE.Vector3(x, 0, -D / 2), (f) => {
        door.rotation.y = tilt * (1 - f);
        door.rotation.z = s * 0.08 * (1 - f);
      });
    }
    scene.add(g);
    blockers.push({ minX: x - 0.9, maxX: x + 0.9, minZ: -D / 2, maxZ: -D / 2 + 0.95 });
  }
  // The vanity and its mirror, on the right wall.
  const vanity = new THREE.Group();
  vanity.position.set(W / 2 - 0.4, 0, -0.6);
  vanity.rotation.y = -Math.PI / 2;
  box(1.6, 0.8, 0.6, M.cream, 0, 0.4, 0, vanity);
  box(1.7, 0.06, 0.66, M.gold, 0, 0.82, 0, vanity);
  const frame = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.06, 10, 40), M.gold);
  frame.scale.y = 1.35;
  frame.position.set(0, 1.9, -0.2);
  vanity.add(frame);
  const glassMat = mood.mat({ dark: 0x1a1c26, bright: 0xd8ecff, emissive: [0x10121a, 0xbfe2ff], ei: [0.2, 0.35], roughness: 0.05, metalness: 0.6 });
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.6, 32), glassMat);
  glass.scale.y = 1.35;
  glass.position.set(0, 1.9, -0.17);
  vanity.add(glass);
  // A crack across the mirror while it is cursed.
  const crack = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.02), new THREE.MeshBasicMaterial({ color: 0xdddddd }));
  crack.position.set(0.05, 2.0, -0.15);
  crack.rotation.z = 0.6;
  vanity.add(crack);
  mood.item(new THREE.Vector3(W / 2 - 0.4, 0, -0.6), (f) => (crack.visible = f < 0.5));
  for (let i = 0; i < 4; i++) {
    const bottle = cyl(0.04, 0.05, 0.14, mood.mat({ dark: 0x30303a, bright: [0xffa3c8, 0xb9a3ff, 0x9fe3ff, 0xffe28a][i], roughness: 0.2, emissive: [0, [0xff6fa8, 0x9a7bff, 0x5fc8ff, 0xffc94a][i]], ei: [0, 0.4] }), -0.55 + i * 0.12, 0.92, 0.1, vanity, 10);
    void bottle;
  }
  scene.add(vanity);
  blockers.push({ minX: W / 2 - 0.8, maxX: W / 2, minZ: -1.5, maxZ: 0.3 });
  // Three gowns on dress forms along the left wall: grey rags in the dark, colour once won.
  const gowns = [];
  for (const [i, colour] of [[0, 0xff8fc0], [1, 0xb9a3ff], [2, 0x8fe8d0]]) {
    const g = new THREE.Group();
    g.position.set(-W / 2 + 0.7, 0, -2 + i * 1.5);
    g.rotation.y = Math.PI / 2;
    cyl(0.02, 0.02, 0.5, M.darkWood, 0, 0.25, 0, g, 6);
    cyl(0.18, 0.2, 0.04, M.darkWood, 0, 0.02, 0, g, 12);
    const fabric = mood.mat({ dark: 0x3c3a42, bright: colour, roughness: 0.65, side: THREE.DoubleSide });
    const torso = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0.001, 1.55), new THREE.Vector2(0.12, 1.5), new THREE.Vector2(0.16, 1.35), new THREE.Vector2(0.12, 1.12), new THREE.Vector2(0.13, 1.02)], 20), fabric);
    g.add(torso);
    const skirtPts = [];
    for (let k = 0; k <= 10; k++) skirtPts.push(new THREE.Vector2(0.13 + Math.pow(k / 10, 1.6) * 0.42, 1.02 - (k / 10) * 0.95));
    const skirt = new THREE.Mesh(new THREE.LatheGeometry(skirtPts, 28), fabric);
    skirt.castShadow = true;
    g.add(skirt);
    // In the dark the hem is eaten: pieces scaled away.
    mood.item(g.position, (f) => {
      skirt.scale.set(0.85 + 0.15 * f, 0.75 + 0.25 * f, 0.85 + 0.15 * f);
      skirt.position.y = 0.25 * (1 - f);
    });
    scene.add(g);
    gowns.push(g);
    blockers.push({ minX: -W / 2, maxX: -W / 2 + 1.3, minZ: g.position.z - 0.55, maxZ: g.position.z + 0.55 });
  }
  // Hat boxes, a chaise longue, a round rug.
  for (const [x, z, s, c] of [[2.9, 2.3, 0.3, 0xffb3d1], [3.15, 2.0, 0.24, 0xb3e0ff], [2.95, 2.1, 0.2, 0xffe6a3]]) {
    const m = mood.mat({ dark: 0x35323a, bright: c, roughness: 0.6 });
    const b = cyl(s, s, s * 1.1, m, x, s * 0.55 + (s < 0.25 ? 0.33 : 0), z, scene, 20);
    void b;
  }
  blockers.push({ minX: 2.5, maxX: 3.6, minZ: 1.6, maxZ: 2.7, tall: false });
  const chaise = new THREE.Group();
  chaise.position.set(-1.2, 0, 2.3);
  const velvet = mood.mat({ dark: 0x2c2632, bright: 0xd04d86, roughness: 0.85 });
  box(1.8, 0.35, 0.7, velvet, 0, 0.35, 0, chaise);
  box(0.25, 0.6, 0.7, velvet, -0.85, 0.65, 0, chaise);
  for (const [x, z] of [[-0.8, -0.28], [0.8, -0.28], [-0.8, 0.28], [0.8, 0.28]]) cyl(0.03, 0.02, 0.18, M.gold, x, 0.09, z, chaise, 6);
  scene.add(chaise);
  blockers.push({ minX: -2.2, maxX: -0.2, minZ: 1.9, maxZ: 2.7, tall: false });
  const rug = new THREE.Mesh(new THREE.CircleGeometry(2.0, 40).rotateX(-Math.PI / 2), mood.mat({ dark: 0x2a2232, bright: 0xf2b6cf, roughness: 1 }));
  rug.position.y = 0.01;
  rug.receiveShadow = true;
  scene.add(rug);
  // The feature: the Enchanted Wardrobe is the left one; she stands in front of the mirror to change.
  return { kind: 'wardrobe', x: W / 2 - 1.4, z: -0.6, face: -Math.PI / 2, label: 'Open the wardrobe' };
}

// The Kitchen: a great hearth, a long table, copper pans, shelves of jars; Chef Mirabelle appears by the hearth.
function furnishKitchen({ scene, mood, M, blockers, updates, W, D }) {
  const stoneMat = mood.mat({ dark: 0x34343e, bright: 0xd8c8b0, map: stone(), roughness: 0.9 });
  // The hearth on the back wall.
  const hearth = new THREE.Group();
  hearth.position.set(0, 0, -D / 2 + 0.5);
  box(3.4, 2.6, 0.9, stoneMat, 0, 1.3, 0, hearth);
  // The opening: a dark recess on the front face, logs and the fire in front of it.
  box(2.0, 1.4, 0.04, new THREE.MeshStandardMaterial({ color: 0x0a0806 }), 0, 0.75, 0.47, hearth);
  for (const [x, r] of [[-0.25, 0.4], [0.25, -0.3]]) {
    const log = cyl(0.08, 0.08, 1.0, M.darkWood, x * 0.4, 0.12, 0.62, hearth, 8);
    log.rotation.set(0, r, Math.PI / 2);
  }
  box(3.8, 0.2, 1.1, M.darkWood, 0, 2.7, 0.1, hearth);
  // The fire: tongues of flame (sprites, so they always face her), each flickering on its own beat.
  const flames = [];
  for (let i = 0; i < 9; i++) {
    const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTexture(), color: new THREE.Color(i % 3 ? 0xffa040 : 0xffd070).multiplyScalar(1.6), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    const w0 = 0.32 + rand() * 0.2, h0 = 0.6 + rand() * 0.45;
    fl.position.set(-0.65 + i * 0.16, 0.18 + h0 / 2, 0.6 + (i % 2) * 0.05);
    fl.scale.set(w0, h0, 1);
    fl.userData = { w0, h0, y0: 0.18 };
    hearth.add(fl);
    flames.push(fl);
  }
  const fireLight = mood.light(new THREE.PointLight(0xff8a3a, 0, 8, 1.6), { color: 0xff8a3a, intensity: 0 }, { color: 0xff9a4a, intensity: 8 });
  fireLight.position.set(0, 0.8, -D / 2 + 1.4);
  // The fire's glow, and embers rising up the chimney.
  const fireGlow = glow(0xff7a2a, 1.8, 0.8);
  fireGlow.position.set(0, 0.55, 0.75);
  hearth.add(fireGlow);
  const emberN = 40, emberPos = new Float32Array(emberN * 3), emberSeed = [];
  for (let i = 0; i < emberN; i++) emberSeed.push({ x: (rand() - 0.5) * 1.4, v: 0.3 + rand() * 0.5, p: rand() });
  const emberGeo = new THREE.BufferGeometry();
  emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
  const embers = new THREE.Points(emberGeo, new THREE.PointsMaterial({ color: new THREE.Color(0xffa040).multiplyScalar(2.5), size: 0.05, map: dotTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  embers.frustumCulled = false;
  hearth.add(embers);
  updates.push((dt, t, f) => {
    flames.forEach((fl, i) => {
      const { w0, h0, y0 } = fl.userData;
      const k = 0.8 + Math.sin(t * 9 + i * 1.7) * 0.15 + Math.sin(t * 17 + i * 3.1) * 0.1;
      fl.scale.set(w0 * (1.1 - k * 0.15), h0 * k * f, 1);
      fl.position.y = y0 + (h0 * k * f) / 2;
      fl.visible = f > 0.05;
    });
    fireLight.intensity = f * (7 + Math.sin(t * 13) * 1.2);
    fireGlow.visible = embers.visible = f > 0.05;
    fireGlow.material.opacity = f * (0.85 + Math.sin(t * 11) * 0.15);
    emberSeed.forEach((e, i) => {
      const k = (e.p + t * e.v * 0.4) % 1;
      emberPos.set([e.x * (1 - k * 0.5) + Math.sin(t * 3 + i) * 0.05, 0.3 + k * 1.3, 0.6 - k * 0.2], i * 3);
    });
    emberGeo.attributes.position.needsUpdate = true;
  });
  scene.add(hearth);
  blockers.push({ minX: -1.9, maxX: 1.9, minZ: -D / 2, maxZ: -D / 2 + 1.3 });
  // Copper pans on a rack.
  const copper = mood.mat({ dark: 0x3a3230, bright: 0xd8834a, roughness: 0.3, metalness: 0.9 });
  box(4, 0.06, 0.06, M.darkWood, 0, 3.2, -D / 2 + 1.4, scene);
  for (let i = 0; i < 6; i++) {
    const pan = new THREE.Group();
    pan.position.set(-1.6 + i * 0.64, 2.85, -D / 2 + 1.4);
    cyl(0.16 + (i % 3) * 0.03, 0.14 + (i % 3) * 0.03, 0.12, copper, 0, 0, 0, pan, 16);
    cyl(0.012, 0.012, 0.3, copper, 0, 0.2, 0, pan, 6);
    scene.add(pan);
    const swing = (rand() - 0.5) * 0.6;
    mood.item(pan.position, (f) => (pan.rotation.z = swing * (1 - f)));
  }
  // The long table with a bowl, a rolling pin and a cake stand.
  const table = new THREE.Group();
  table.position.set(0, 0, 0.8);
  box(3.2, 0.1, 1.1, M.wood, 0, 0.9, 0, table);
  for (const [x, z] of [[-1.45, -0.45], [1.45, -0.45], [-1.45, 0.45], [1.45, 0.45]]) box(0.1, 0.9, 0.1, M.wood, x, 0.45, z, table);
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 10, 0, TAU, Math.PI / 2, Math.PI / 2), mood.mat({ dark: 0x3a3a44, bright: 0xa9d8ff, roughness: 0.3, side: THREE.DoubleSide }));
  bowl.position.set(-0.8, 1.17, 0);
  table.add(bowl);
  const pin = cyl(0.04, 0.04, 0.5, M.cream, 0.2, 0.99, 0.2, table, 10);
  pin.rotation.z = Math.PI / 2;
  // The cake stand: where Magic Cakes appear.
  cyl(0.2, 0.2, 0.03, M.cream, 0.9, 1.1, 0, table, 24);
  cyl(0.03, 0.06, 0.15, M.cream, 0.9, 1.02, 0, table, 10);
  scene.add(table);
  blockers.push({ minX: -1.75, maxX: 1.75, minZ: 0.15, maxZ: 1.45, tall: false });
  // Shelves of jars on the left wall.
  const shelfMat = M.darkWood;
  for (let s = 0; s < 3; s++) box(0.4, 0.05, 3, shelfMat, -W / 2 + 0.25, 1.2 + s * 0.6, -0.8, scene);
  const jarColours = [0xffc0d8, 0xffe39a, 0xb8f0c8, 0xc8b8ff, 0xffb48a];
  for (let s = 0; s < 3; s++)
    for (let i = 0; i < 6; i++) {
      const c = jarColours[(i + s) % jarColours.length];
      cyl(0.08, 0.08, 0.2 + rand() * 0.1, mood.mat({ dark: 0x30303a, bright: c, roughness: 0.25 }), -W / 2 + 0.25, 1.35 + s * 0.6, -2 + i * 0.45, scene, 12);
    }
  blockers.push({ minX: -W / 2, maxX: -W / 2 + 0.5, minZ: -2.4, maxZ: 0.8 });
  // A chequered rug-tile runner and a dresser on the right.
  const dresser = new THREE.Group();
  dresser.position.set(W / 2 - 0.35, 0, -0.5);
  dresser.rotation.y = -Math.PI / 2;
  box(2.2, 1.0, 0.6, mood.mat({ dark: 0x30343c, bright: 0x9fd0c8, roughness: 0.6 }), 0, 0.5, 0, dresser);
  box(2.2, 1.4, 0.15, mood.mat({ dark: 0x30343c, bright: 0x9fd0c8, roughness: 0.6 }), 0, 1.7, -0.22, dresser);
  for (let i = 0; i < 5; i++) {
    const plate = new THREE.Mesh(new THREE.CircleGeometry(0.16, 20), mood.mat({ dark: 0x3c3c46, bright: 0xffffff, roughness: 0.3 }));
    plate.position.set(-0.8 + i * 0.4, 1.75, -0.13);
    dresser.add(plate);
  }
  scene.add(dresser);
  blockers.push({ minX: W / 2 - 0.7, maxX: W / 2, minZ: -1.7, maxZ: 0.7 });
  return { kind: 'chef', x: 1.6, z: -D / 2 + 1.7, face: 0, label: 'Bake with Chef Mirabelle' };
}

// The Library: shelves of books up to the ceiling on three walls, a round stained-glass window, a reading desk where
// the Moonlit Staff waits, a globe, a ladder; floating candles once won.
function furnishLibrary({ scene, mood, M, blockers, updates, W, D, H }) {
  const shelfFace = mood.mat({ dark: 0x2a2a34, bright: 0xffffff, map: books(), roughness: 0.85 });
  const shelfWood = M.darkWood;
  const walls = [
    [W - 1.2, 0, -D / 2 + 0.3, 0],
    [D - 3, -W / 2 + 0.3, -0.6, Math.PI / 2],
    [D - 3, W / 2 - 0.3, -0.6, -Math.PI / 2]
  ];
  for (const [len, x, z, ry] of walls) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    box(len, H - 1.2, 0.5, shelfWood, 0, (H - 1.2) / 2, 0, g);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(len - 0.2, H - 1.5), shelfFace.clone());
    face.material.map = books().clone();
    face.material.map.repeat.set(len / 3, (H - 1.5) / 1.6);
    face.material.map.needsUpdate = true;
    mood.mats.push({ m: face.material, c: [new THREE.Color(0x2a2a34), new THREE.Color(0xffffff)], e: [new THREE.Color(0), new THREE.Color(0)], ei: [0, 0], opacity: [1, 1] });
    face.position.set(0, (H - 1.2) / 2, 0.26);
    g.add(face);
    scene.add(g);
  }
  blockers.push({ minX: -W / 2, maxX: W / 2, minZ: -D / 2, maxZ: -D / 2 + 0.6 });
  blockers.push({ minX: -W / 2, maxX: -W / 2 + 0.6, minZ: -D / 2, maxZ: D / 2 - 1.8 });
  blockers.push({ minX: W / 2 - 0.6, maxX: W / 2, minZ: -D / 2, maxZ: D / 2 - 1.8 });
  // The round stained-glass window above the back shelves.
  const rose = new THREE.Mesh(new THREE.CircleGeometry(1.1, 40), mood.mat({ dark: 0x1a1a24, bright: 0xffffff, map: stained(), emissive: [0x0a0a18, 0xffffff], ei: [0.3, 1.1], roughness: 1 }));
  rose.material.emissiveMap = stained();
  rose.position.set(0, H - 1.3, -D / 2 + 0.58);
  scene.add(rose);
  const roseFrame = new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.08, 8, 48), M.gold);
  roseFrame.position.copy(rose.position);
  scene.add(roseFrame);
  const roseShaft = lightShaft(mood, { from: [0x7a6cff, 0.07], to: [0xffdca0, 0.1], top: 1.05, bottom: 1.8, length: 7.5 });
  roseShaft.position.set(0, H - 1.3, -D / 2 + 0.7);
  roseShaft.rotation.x = -0.6;
  scene.add(roseShaft);
  // The reading desk and the pedestal for the staff.
  const desk = new THREE.Group();
  desk.position.set(1.2, 0, -1.6);
  box(2, 0.1, 0.9, M.wood, 0, 0.85, 0, desk);
  box(1.9, 0.75, 0.8, M.darkWood, 0, 0.42, 0, desk);
  const lectern = box(0.6, 0.04, 0.45, M.wood, -0.5, 1.05, 0, desk);
  lectern.rotation.x = -0.4;
  scene.add(desk);
  blockers.push({ minX: 0.1, maxX: 2.3, minZ: -2.15, maxZ: -1.05, tall: false });
  const globe = new THREE.Group();
  globe.position.set(-2.6, 0, 1.6);
  cyl(0.04, 0.12, 0.8, M.gold, 0, 0.4, 0, globe, 10);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.32, 24, 16), mood.mat({ dark: 0x2a3440, bright: 0x6fb0e0, roughness: 0.5 }));
  ball.position.y = 1.1;
  globe.add(ball);
  const meridian = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.015, 6, 32), M.gold);
  meridian.position.y = 1.1;
  globe.add(meridian);
  scene.add(globe);
  updates.push((dt, t, f) => (ball.rotation.y += dt * 0.3 * f));
  blockers.push({ minX: -3, maxX: -2.2, minZ: 1.2, maxZ: 2, tall: false });
  // Books strewn on the floor in the dark: they fly back up to the shelves when won.
  const strewn = new THREE.Group();
  const bookMats = [0x8a2a3a, 0x2a4a8a, 0x2a6a3a, 0x8a6a2a].map((c) => mood.mat({ dark: 0x2a2630, bright: c, roughness: 0.7 }));
  for (let i = 0; i < 22; i++) {
    const b = box(0.22, 0.05, 0.3, bookMats[i % 4], (rand() - 0.5) * (W - 2), 0.03 + (i % 3) * 0.05, (rand() - 0.5) * (D - 3), strewn);
    b.rotation.y = rand() * 3;
    const home = b.position.clone();
    mood.item(home, (f) => {
      b.position.y = home.y + f * 6;
      b.visible = f < 0.95;
    });
  }
  scene.add(strewn);
  // Floating candles, once won.
  const floaters = [];
  for (let i = 0; i < 14; i++) {
    const c = new THREE.Group();
    c.position.set((rand() - 0.5) * (W - 2), H - 2.2 - rand() * 1.4, (rand() - 0.5) * (D - 3));
    cyl(0.03, 0.03, 0.22, M.candle, 0, 0, 0, c, 8);
    const fl = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), M.flame);
    fl.scale.y = 1.8;
    fl.position.y = 0.15;
    c.add(fl);
    const halo = glow(0xffb85a, 0.5, 1.4);
    halo.position.y = 0.16;
    c.add(halo);
    scene.add(c);
    floaters.push(c);
    mood.item(c.position, (f) => (c.visible = f > 0.3));
  }
  updates.push((dt, t) => floaters.forEach((c, i) => (c.position.y += Math.sin(t * 1.2 + i) * 0.0015)));
  // Archivist Hoot, back on his desk once the room is won (round 2): the reading nook.
  const owl = makeOwl();
  owl.group.position.set(1.85, 0.9, -1.6);
  owl.group.rotation.y = -0.35;
  owl.group.scale.setScalar(1.25);
  scene.add(owl.group);
  mood.item(owl.group.position, (f) => (owl.group.visible = f > 0.6));
  updates.push((dt, t, f) => f > 0.6 && owl.update(dt, t));
  return { kind: 'books', x: 1.2, z: -0.7, face: Math.PI, label: 'Read with Archivist Hoot', friend: owl };
}


// ---------- round 2: the Swan Wing ----------
// A potion on a little round table, glowing, with a pool of its colour on the floor (the Hall's and the Gallery's).
function potionTable(scene, M, blockers, x, z, kind) {
  cyl(0.32, 0.32, 0.05, M.wood, x, 0.8, z, scene, 20);
  cyl(0.05, 0.08, 0.8, M.wood, x, 0.4, z, scene, 8);
  cyl(0.22, 0.26, 0.04, M.wood, x, 0.02, z, scene, 16);
  blockers.push({ minX: x - 0.35, maxX: x + 0.35, minZ: z - 0.35, maxZ: z + 0.35, tall: false });
  const bottle = makePotion(kind);
  bottle.position.set(x, 0.83, z);
  scene.add(bottle);
  const colour = kind === 'heart' ? 0xff5fa8 : 0x5fa8ff;
  const aura = glow(colour, 0.9, 1.2);
  aura.position.y = 0.1;
  bottle.add(aura);
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: dotTexture(), color: new THREE.Color(colour).multiplyScalar(0.55), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  pool.position.set(x, 0.012, z);
  pool.renderOrder = 1;
  scene.add(pool);
  return { x, z, kind, bottle, pool, back: 0 };
}

// A rose bush in a stone urn: thorny and grey in the dark, in bloom once the wing is won.
function roseUrn(mood, M, parent, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  cyl(0.28, 0.2, 0.55, M.cream, 0, 0.28, 0, g, 16);
  cyl(0.32, 0.32, 0.06, M.gold, 0, 0.56, 0, g, 16);
  const leaf = mood.mat({ dark: 0x1e2a22, bright: 0x3f8a4a, roughness: 0.8 });
  const bloom = mood.mat({ dark: 0x2a2028, bright: 0xff7aa8, roughness: 0.6, emissive: [0, 0x401020], ei: [0, 0.4] });
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.17, 0), leaf);
    b.position.set(Math.cos(a) * 0.17, 0.75 + (i % 3) * 0.12, Math.sin(a) * 0.17);
    g.add(b);
    const r = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), bloom);
    r.position.set(Math.cos(a) * 0.26, 0.82 + (i % 3) * 0.13, Math.sin(a) * 0.26);
    g.add(r);
  }
  parent.add(g);
  return g;
}

// The Swan Gallery: the long corridor of the Swan Wing (round 2), a second hub like the Hall. Its doors: the Music
// Room on the left, the Tea Room on the right, the Ballroom's great doors at the far end, and the Hall behind her.
// It brightens a third at a time as its rooms are won.
function buildGallery() {
  const scene = new THREE.Scene();
  const mood = new Mood(scene);
  const M = commonMats(mood);
  const W = 7, D = 20, H = 6;
  mood.fog({ color: 0x0b0814, density: 0.05 }, { color: 0xd8c4b8, density: 0.006 });
  mood.env = [0.12, 0.3];
  const room = shell(mood, M, { w: W, d: D, h: H, floorMap: marble(), floorDark: 0x5a5470, floorBright: 0xe2d8d4, wallMap: damask('#f0c4d0', '#fbe0e8', 'rose'), wallDark: 0x3a3040, wallBright: 0xe2d0d4 });
  scene.add(room);
  lighting(mood, { sunFrom: [-4, 8, 4], shadowBox: 10, ghost: [0, 2, -2] });
  const blockers = [], updates = [];
  // The runner, from the Hall's door to the Ballroom's.
  const runnerMat = mood.mat({ dark: 0x4a3a50, bright: 0xf2e6ea, map: runner(), roughness: 0.95 });
  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(2.0, D - 0.6).rotateX(-Math.PI / 2), runnerMat);
  carpet.position.y = 0.006;
  carpet.receiveShadow = true;
  scene.add(carpet);
  // Windows on both long walls near the Hall end, portraits further in, rose urns between.
  for (const [x, ry] of [[-W / 2 + 0.02, Math.PI / 2], [W / 2 - 0.02, -Math.PI / 2]]) windowOn(mood, M, scene, { x, z: 5.2, ry, w: 1.4, h: 3.0, sill: 1.2, curtainBright: 0xd9577f });
  const paintings = [];
  for (const [x, z, ry, seed] of [[-W / 2 + 0.05, 1.2, Math.PI / 2, 21], [W / 2 - 0.05, 1.2, -Math.PI / 2, 24], [-W / 2 + 0.05, -6.4, Math.PI / 2, 27], [W / 2 - 0.05, -6.4, -Math.PI / 2, 30]]) {
    const g = new THREE.Group();
    g.position.set(x, 2.9, z);
    g.rotation.y = ry;
    box(1.2, 1.5, 0.08, M.gold, 0, 0, 0, g);
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.3), mood.mat({ dark: 0x3a3a48, bright: 0xf0ece8, map: portrait(seed), roughness: 0.9 }));
    pic.position.z = 0.05;
    g.add(pic);
    const eyes = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.04), mood.mat({ dark: 0x000000, bright: 0x000000, emissive: [0xff9ad0, 0x000000], ei: [2.4, 0], transparent: true, opacity: [1, 0] }));
    eyes.position.set(0, 0.07, 0.06);
    g.add(eyes);
    scene.add(g);
    paintings.push(g);
  }
  for (const [x, z] of [[-W / 2 + 0.5, 3.3], [W / 2 - 0.5, 3.3], [-W / 2 + 0.5, -4.4], [W / 2 - 0.5, -4.4], [-W / 2 + 0.5, -8.3], [W / 2 - 0.5, -8.3]]) {
    roseUrn(mood, M, scene, x, z);
    blockers.push({ minX: x - 0.4, maxX: x + 0.4, minZ: z - 0.4, maxZ: z + 0.4, tall: false });
  }
  chandelier(mood, M, scene, { x: 0, z: 3, y: H - 1.3, r: 0.8, candles: 8 });
  chandelier(mood, M, scene, { x: 0, z: -5, y: H - 1.3, r: 0.8, candles: 8 });
  for (const z of [-2, 6.5]) for (const s of [-1, 1]) sconce(mood, M, scene, updates, { x: s * (W / 2 - 0.05), y: 2.4, z, ry: -s * Math.PI / 2 });
  cobwebs(mood, scene, [[-W / 2 + 0.05, H - 0.1, -D / 2 + 0.05, 0, 1.8], [W / 2 - 0.05, H - 0.1, -D / 2 + 0.05, -Math.PI / 2, 1.8], [-W / 2 + 0.05, H - 0.1, D / 2 - 0.05, Math.PI / 2, 1.4], [W / 2 - 0.05, H - 0.1, 0.5, -Math.PI / 2, 1.2]]);
  const motesUpdate = motes(mood, scene, { w: W, d: D, h: H, n: 200 });
  updates.push(mist(mood, scene, { w: W, d: D, colour: 0x6a5a90 }));
  const doorSpots = {
    music: { x: -W / 2 + 0.14, z: -2, ry: Math.PI / 2 },
    tearoom: { x: W / 2 - 0.14, z: -2, ry: -Math.PI / 2 },
    ballroom: { x: 0, z: -D / 2 + 0.14, ry: 0, big: true },
    out: { x: 0, z: D / 2 - 0.14, ry: Math.PI }
  };
  const doors = [];
  for (const [id, sp] of Object.entries(doorSpots)) {
    const door = makeDoor(mood, M, id === 'out' ? {} : sp.big ? { w: 2.4, h: 3.6, rune: true } : { rune: true });
    door.position.set(sp.x, 0, sp.z);
    door.rotation.y = sp.ry;
    scene.add(door);
    const glowL = new THREE.PointLight(0x8f6bff, 3, 4, 1.6);
    glowL.position.copy(door.localToWorld(new THREE.Vector3(0, 1.2, 0.8)));
    if (id !== 'out') scene.add(glowL);
    const front = door.localToWorld(new THREE.Vector3(0, 0, 1.1));
    doors.push({ id, x: front.x, z: front.z, door, glow: glowL, ry: sp.ry });
  }
  const potionSpots = [potionTable(scene, M, blockers, -2.2, 8.2, 'heart'), potionTable(scene, M, blockers, 2.2, 8.2, 'star')];
  return {
    id: 'gallery', scene, mood, W, D, H, hub: true,
    bounds: { minX: -W / 2 + 0.5, maxX: W / 2 - 0.5, minZ: -D / 2 + 0.5, maxZ: D / 2 - 0.5 },
    blockers, doors, potionSpots,
    spawn: { x: 0, z: D / 2 - 3.0, face: Math.PI },
    setRestored(f) {
      mood.set(f);
    },
    setDoor(id, won) {
      const d = doors.find((d) => d.id === id);
      if (!d || id === 'out') return;
      d.glow.color.set(won ? 0xffc77a : 0x8f6bff);
      d.door.userData.arch.material.emissive.set(won ? 0xffc06a : 0x6b4bff);
      d.door.userData.arch.material.emissiveIntensity = won ? 1.8 : 0.6;
      for (const [i, leaf] of d.door.userData.leaves.entries()) leaf.rotation.y = won ? (i ? -1 : 1) * 0.5 : 0;
      if (d.door.userData.seal) d.door.userData.seal.visible = !won;
    },
    update(dt, t) {
      motesUpdate(dt, t, mood.f);
      for (const u of updates) u(dt, t, mood.f);
      for (const d of doors) {
        const seal = d.door.userData.seal;
        if (!seal?.visible) continue;
        seal.userData.disc.rotation.z = t * 0.35;
        seal.userData.disc.material.opacity = 0.75 + Math.sin(t * 2.2 + d.z) * 0.25;
      }
      for (const p of potionSpots) {
        p.bottle.visible = p.pool.visible = p.back <= 0;
        p.bottle.rotation.y = t * 0.8;
        p.bottle.position.y = 0.86 + Math.sin(t * 2 + p.x) * 0.03;
        if (p.back > 0) p.back -= dt;
      }
    }
  };
}

// A grand piano: a curved case on three legs, its lid propped open, a keyboard of 15 white keys (C3 to C5) with the
// black keys between. `userData.press(i)` dips white key i of the eight the piano game uses (C4 … C5) for a moment.
export function makePiano(mood, M) {
  const g = new THREE.Group();
  const lacquer = mood.mat({ dark: 0x14141a, bright: 0x1a1420, roughness: 0.18, metalness: 0.1 });
  const outline = new THREE.Shape();
  outline.moveTo(-0.75, 0);
  outline.lineTo(0.75, 0);
  outline.lineTo(0.75, -0.55);
  outline.bezierCurveTo(0.7, -1.2, 0.2, -1.1, 0.05, -1.55);
  outline.bezierCurveTo(-0.15, -2.0, -0.6, -2.05, -0.75, -1.7);
  outline.lineTo(-0.75, 0);
  const caseGeo = new THREE.ExtrudeGeometry(outline, { depth: 0.32, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 });
  caseGeo.rotateX(Math.PI / 2);
  const body = new THREE.Mesh(caseGeo, lacquer);
  body.position.y = 1.0;
  body.castShadow = true;
  g.add(body);
  // Inside: gold strings over a cream soundboard (seen under the open lid).
  // The flat parts (the soundboard, the lid) lie face up, so they are drawn from the outline mirrored (a face-up
  // turn of the outline as it is would put them in front of the keyboard instead of over the case).
  const flat = new THREE.Shape(outline.getPoints(24).map((v) => new THREE.Vector2(v.x, -v.y)));
  const board = new THREE.Mesh(new THREE.ShapeGeometry(flat).rotateX(-Math.PI / 2), M.cream);
  board.position.y = 0.97;
  board.scale.setScalar(0.95);
  g.add(board);
  const lid = new THREE.Mesh(new THREE.ShapeGeometry(flat).rotateX(-Math.PI / 2), lacquer.clone());
  lid.material.side = THREE.DoubleSide;
  const hinge = new THREE.Group();
  hinge.position.set(-0.75, 1.0, 0);
  hinge.rotation.z = 0.75;
  lid.position.x = 0.75;
  hinge.add(lid);
  g.add(hinge);
  const prop = cyl(0.012, 0.012, 0.95, M.gold, 0.35, 1.42, -0.9, g, 6);
  prop.rotation.z = 0.7;
  for (const [x, z] of [[-0.62, -0.15], [0.62, -0.15], [-0.4, -1.6]]) cyl(0.05, 0.035, 0.68, lacquer, x, 0.34, z, g, 10);
  // The keyboard, sticking out in front (+Z).
  const keyBed = box(1.5, 0.06, 0.32, lacquer, 0, 0.66 + 0.02, 0.16, g);
  void keyBed;
  const ivory = new THREE.MeshStandardMaterial({ color: 0xfaf6ee, roughness: 0.35 });
  const ebony = new THREE.MeshStandardMaterial({ color: 0x111014, roughness: 0.3 });
  const keyW = 1.42 / 15;
  const whites = [];
  for (let i = 0; i < 15; i++) {
    const k = box(keyW * 0.94, 0.025, 0.26, ivory.clone(), -0.71 + keyW * (i + 0.5), 0.725, 0.19, g);
    whites.push(k);
    if ([0, 1, 3, 4, 5].includes(i % 7) && i < 14) box(keyW * 0.55, 0.03, 0.16, ebony, -0.71 + keyW * (i + 1), 0.75, 0.14, g);
  }
  // A music stand with a sheet on it.
  const stand = box(0.62, 0.36, 0.02, lacquer, 0, 1.2, -0.03, g);
  stand.rotation.x = -0.25;
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.3), new THREE.MeshStandardMaterial({ color: 0xffffff, map: canvasTexture(256, 160, (c, w, h) => {
    c.fillStyle = '#fbf6ea';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#3a3040';
    for (let s = 0; s < 3; s++) for (let l = 0; l < 5; l++) {
      c.beginPath();
      c.moveTo(10, 20 + s * 48 + l * 6);
      c.lineTo(w - 10, 20 + s * 48 + l * 6);
      c.stroke();
    }
    c.fillStyle = '#3a3040';
    for (let i = 0; i < 24; i++) {
      c.beginPath();
      c.ellipse(24 + (i % 8) * 28, 22 + Math.floor(i / 8) * 48 + ((i * 7) % 5) * 3, 4, 3, -0.4, 0, Math.PI * 2);
      c.fill();
    }
  }), roughness: 0.9 }));
  sheet.position.set(0, 1.21, -0.015);
  sheet.rotation.x = -0.25;
  g.add(sheet);
  const bench = new THREE.Group();
  bench.position.set(0, 0, 0.75);
  box(0.8, 0.08, 0.36, mood.mat({ dark: 0x2a2030, bright: 0x8a2a4a, roughness: 0.8 }), 0, 0.5, 0, bench);
  for (const [x, z] of [[-0.35, -0.14], [0.35, -0.14], [-0.35, 0.14], [0.35, 0.14]]) cyl(0.025, 0.02, 0.46, lacquer, x, 0.23, z, bench, 6);
  g.add(bench);
  const presses = new Map();
  g.userData = {
    whites,
    // The eight keys of the game are C4 … C5: white keys 7 … 14.
    press(i) {
      const k = whites[7 + i];
      if (!k) return;
      presses.set(k, 0.25);
      k.material.emissive.set(0xffd27a);
      k.material.emissiveIntensity = 0.8;
    },
    update(dt) {
      for (const [k, left] of presses) {
        const l = left - dt;
        k.position.y = 0.725 - (l > 0 ? 0.012 : 0);
        k.material.emissiveIntensity = Math.max(0, l * 3.2);
        if (l <= 0) presses.delete(k);
        else presses.set(k, l);
      }
    }
  };
  return g;
}

// The Music Room: the grand piano, a golden harp, music stands, a bust of a composer; Maestro Fig on the piano once
// it is won.
function furnishMusic({ scene, mood, M, blockers, updates, W, D }) {
  const piano = makePiano(mood, M);
  piano.position.set(-1.4, 0, -D / 2 + 2.6);
  scene.add(piano);
  blockers.push({ minX: -2.25, maxX: -0.55, minZ: -D / 2 + 0.5, maxZ: -D / 2 + 2.95 });
  updates.push((dt) => piano.userData.update(dt));
  // The harp: a gold frame (a curved neck, a column, a soundbox) with strings.
  const harp = new THREE.Group();
  harp.position.set(2.6, 0, -D / 2 + 1.2);
  harp.rotation.y = -0.5;
  const col = cyl(0.04, 0.05, 1.8, M.gold, -0.35, 0.9, 0, harp, 10);
  void col;
  const box1 = box(0.16, 1.5, 0.16, M.wood, 0.3, 0.8, 0, harp);
  box1.rotation.z = 0.35;
  const neck = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.035, 8, 20, Math.PI * 0.85), M.gold);
  neck.position.set(0, 1.7, 0);
  neck.rotation.z = 0.2;
  harp.add(neck);
  const strMat = mood.mat({ dark: 0x666670, bright: 0xfff2c8, roughness: 0.3, emissive: [0, 0xffe0a0], ei: [0, 0.6] });
  for (let i = 0; i < 9; i++) {
    const x = -0.28 + i * 0.065;
    const top = 1.86 - Math.abs(x - 0.0) * 0.4, bottom = 0.35 + (x + 0.3) * 0.9;
    const st = cyl(0.004, 0.004, top - bottom, strMat, x, (top + bottom) / 2, 0, harp, 4);
    st.castShadow = false;
  }
  scene.add(harp);
  blockers.push({ minX: 2.0, maxX: 3.2, minZ: -D / 2, maxZ: -D / 2 + 1.8 });
  // Music stands with sheets, and a bust on a column.
  for (const [x, z, r] of [[3.2, 1.2, -1.2], [2.6, 2.4, -1.6]]) {
    const st = new THREE.Group();
    st.position.set(x, 0, z);
    st.rotation.y = r;
    cyl(0.015, 0.015, 1.1, M.gold, 0, 0.55, 0, st, 6);
    const desk = box(0.42, 0.3, 0.02, M.gold, 0, 1.15, 0, st);
    desk.rotation.x = -0.4;
    scene.add(st);
    blockers.push({ minX: x - 0.25, maxX: x + 0.25, minZ: z - 0.25, maxZ: z + 0.25, tall: false });
  }
  const bust = new THREE.Group();
  bust.position.set(-W / 2 + 0.7, 0, 1.5);
  cyl(0.22, 0.25, 1.1, M.cream, 0, 0.55, 0, bust, 16);
  sphere(0.17, M.cream, 0, 1.38, 0, bust);
  const shoulders = sphere(0.24, M.cream, 0, 1.15, 0, bust);
  shoulders.scale.set(1, 0.45, 0.6);
  scene.add(bust);
  blockers.push({ minX: -W / 2 + 0.4, maxX: -W / 2 + 1.0, minZ: 1.2, maxZ: 1.8 });
  // Notes float up out of the piano once the room is won.
  const noteTex = canvasTexture(64, 64, (c) => {
    c.fillStyle = '#fff';
    c.font = 'bold 52px serif';
    c.textAlign = 'center';
    c.fillText('♪', 32, 50);
  });
  const notes = [];
  for (let i = 0; i < 10; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: noteTex, color: new THREE.Color([0xffd27a, 0xffb3d9, 0xb9e0ff][i % 3]).multiplyScalar(1.3), transparent: true, depthWrite: false, opacity: 0 }));
    sp.scale.setScalar(0.22);
    scene.add(sp);
    notes.push({ sp, t: i * 0.6 });
  }
  updates.push((dt, t, f) => {
    for (const n of notes) {
      n.t = (n.t + dt) % 6;
      const k = n.t / 6;
      n.sp.position.set(-1.4 + Math.sin(n.t * 1.7 + n.sp.id) * 0.6, 1.3 + k * 2.6, -D / 2 + 1.7 + Math.cos(n.t + n.sp.id) * 0.4);
      n.sp.material.opacity = f > 0.9 ? Math.sin(k * Math.PI) * 0.9 : 0;
    }
  });
  // Maestro Fig, on the piano's lid by the keyboard.
  const frog = makeFrog();
  frog.group.position.set(-0.8, 1.0, -D / 2 + 2.45);
  frog.group.rotation.y = 0.5;
  frog.group.scale.setScalar(1.3);
  scene.add(frog.group);
  mood.item(frog.group.position, (f) => (frog.group.visible = f > 0.6));
  updates.push((dt, t, f) => f > 0.6 && frog.update(dt, t));
  return { kind: 'piano', x: -1.4, z: -D / 2 + 3.8, face: Math.PI, label: 'Play the piano with Maestro Fig', friend: frog, piano };
}

// The Tea Room: round tea tables with cups and three-tier cake stands, a pastry counter with glass domes at the back
// (where Chef Praline bakes), a tea trolley.
function furnishTea({ scene, mood, M, blockers, updates, W, D }) {
  const cloth = mood.mat({ dark: 0x3a3a46, bright: 0xf2e8f0, roughness: 0.9 });
  const china = mood.mat({ dark: 0x50505c, bright: 0xfff8f2, roughness: 0.25 });
  const pinkChina = mood.mat({ dark: 0x40384a, bright: 0xffc8dc, roughness: 0.25 });
  const cakeCols = [0xffb3cc, 0xfff0b0, 0xc8ffd8, 0xd8c4ff].map((c) => mood.mat({ dark: 0x3a3440, bright: c, roughness: 0.7 }));
  const cups = [];
  for (const [x, z] of [[2.4, 0.9], [2.4, -1.9], [-2.6, 1.6]]) {
    const t = new THREE.Group();
    t.position.set(x, 0, z);
    cyl(0.55, 0.62, 0.72, cloth, 0, 0.36, 0, t, 24);
    cyl(0.6, 0.6, 0.03, cloth, 0, 0.73, 0, t, 24);
    // The cake stand: three plates on a gold rod, little cakes on each.
    cyl(0.012, 0.012, 0.5, M.gold, 0, 1.0, 0, t, 6);
    for (const [i, [y, r]] of [[0.8, 0.22], [0.98, 0.16], [1.15, 0.11]].entries()) {
      cyl(r, r, 0.012, china, 0, y, 0, t, 18);
      for (let k = 0; k < 3 + (2 - i); k++) {
        const a = (k / (5 - i)) * Math.PI * 2;
        cyl(0.035, 0.035, 0.035, cakeCols[(k + i) % 4], Math.cos(a) * r * 0.6, y + 0.025, Math.sin(a) * r * 0.6, t, 10);
      }
    }
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + 0.4;
      const cup = new THREE.Group();
      cup.position.set(Math.cos(a) * 0.4, 0.75, Math.sin(a) * 0.4);
      cyl(0.07, 0.07, 0.008, k % 2 ? pinkChina : china, 0, 0.004, 0, cup, 14);
      cyl(0.045, 0.032, 0.06, k % 2 ? pinkChina : china, 0, 0.035, 0, cup, 14);
      t.add(cup);
      cups.push(cup);
    }
    scene.add(t);
    blockers.push({ minX: x - 0.68, maxX: x + 0.68, minZ: z - 0.68, maxZ: z + 0.68, tall: false });
  }
  // The pastry counter on the back wall, with glass domes over cakes.
  const counter = new THREE.Group();
  counter.position.set(-0.6, 0, -D / 2 + 0.7);
  const front = mood.mat({ dark: 0x30343c, bright: 0xa8e0d0, roughness: 0.5 });
  box(3.4, 0.95, 0.8, front, 0, 0.475, 0, counter);
  box(3.5, 0.06, 0.9, M.cream, 0, 0.98, 0, counter);
  // Plain see-through glass: a `transmission` material makes three.js draw the whole room a second time (21.7 → 15.5 ms a frame here on the M1).
  const glass = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.22, depthWrite: false });
  for (const [i, x] of [-1.45, -0.85, -0.25].entries()) {
    cyl(0.18, 0.18, 0.1, cakeCols[i], x, 1.07, 0, counter, 16);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), glass);
    dome.position.set(x, 1.01, 0);
    counter.add(dome);
  }
  // Shelves of tins and jars above it.
  for (let s = 0; s < 2; s++) box(3.0, 0.05, 0.3, M.darkWood, 0, 1.9 + s * 0.55, -0.25, counter);
  for (let s = 0; s < 2; s++)
    for (let i = 0; i < 7; i++) cyl(0.08, 0.08, 0.2, cakeCols[(i + s) % 4], -1.3 + i * 0.43, 2.03 + s * 0.55, -0.25, counter, 12);
  scene.add(counter);
  blockers.push({ minX: -2.4, maxX: 1.2, minZ: -D / 2, maxZ: -D / 2 + 1.2 });
  // The cups rattle in the dark (the Nibble Moth is about), and sit still once the room is won.
  updates.push((dt, t, f) => {
    for (const [i, c] of cups.entries()) c.rotation.z = f < 0.5 ? Math.sin(t * 23 + i * 1.7) * 0.06 * Math.max(0, Math.sin(t * 0.9 + i)) : 0;
  });
  return { kind: 'praline', x: 0.2, z: -D / 2 + 1.9, face: 0, label: 'Bake biscuits with Chef Praline', trayAt: [0.15, 1.01, -D / 2 + 0.8], chefAt: [0.95, -D / 2 + 1.35, -1.0] };
}

// The Ballroom: the biggest room in the château. Gold columns down both sides, tall windows, two great chandeliers,
// a polished floor with a star of inlay in the middle, a dais with two gilt chairs; Madame Lune once it is won.
function furnishBallroom({ scene, mood, M, blockers, updates, W, D, H }) {
  const colMat = mood.mat({ dark: 0x4a4658, bright: 0xe8dccf, roughness: 0.35 });
  for (const x of [-W / 2 + 1.2, W / 2 - 1.2])
    for (const z of [-4, 0, 4]) {
      scene.add(column(colMat, M.gold, { x, z, h: H - 0.3, r: 0.3 }));
      blockers.push({ minX: x - 0.42, maxX: x + 0.42, minZ: z - 0.42, maxZ: z + 0.42 });
    }
  // The star inlaid in the floor, gold, glowing faintly once won.
  const starMat = mood.mat({ dark: 0x3a3440, bright: 0xf2c96b, roughness: 0.3, metalness: 0.7, emissive: [0, 0xffc860], ei: [0, 0.25] });
  const star = new THREE.Shape();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2, r = i % 2 ? 0.9 : 2.4;
    if (i) star.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    else star.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const inlay = new THREE.Mesh(new THREE.ShapeGeometry(star).rotateX(-Math.PI / 2), starMat);
  inlay.position.y = 0.008;
  inlay.receiveShadow = true;
  scene.add(inlay);
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.55, 2.65, 64).rotateX(-Math.PI / 2), starMat);
  ring.position.y = 0.008;
  scene.add(ring);
  chandelier(mood, M, scene, { x: 0, z: -2.6, y: H - 1.6, r: 1.3, candles: 12 });
  chandelier(mood, M, scene, { x: 0, z: 2.8, y: H - 1.6, r: 1.3, candles: 12 });
  // The dais at the back, with two gilt chairs.
  const dais = new THREE.Group();
  dais.position.set(0, 0, -D / 2 + 1.1);
  const velvet = mood.mat({ dark: 0x2a1a2a, bright: 0x7a1a3a, roughness: 0.9 });
  box(5, 0.25, 1.6, velvet, 0, 0.125, 0, dais);
  for (const x of [-0.8, 0.8]) {
    box(0.7, 0.12, 0.6, velvet, x, 0.72, 0.1, dais);
    box(0.7, 1.3, 0.1, M.gold, x, 1.05, -0.2, dais);
    for (const [lx, lz] of [[-0.3, -0.15], [0.3, -0.15], [-0.3, 0.35], [0.3, 0.35]]) cyl(0.03, 0.03, 0.45, M.gold, x + lx, 0.47, lz, dais, 6);
  }
  scene.add(dais);
  blockers.push({ minX: -2.5, maxX: 2.5, minZ: -D / 2, maxZ: -D / 2 + 1.95, tall: false });
  // Madame Lune, the moonlight butterfly, over the star once the room is won.
  const fly = makeButterfly();
  fly.group.position.set(-1.6, 0, -1.2);
  scene.add(fly.group);
  mood.item(fly.group.position, (f) => (fly.group.visible = f > 0.6));
  updates.push((dt, t, f) => f > 0.6 && fly.update(dt, t));
  return { kind: 'dance', x: 0, z: 0.4, face: Math.PI, label: 'Dance with Madame Lune', friend: fly };
}

const ROOM_SPECS = {
  dressing: {
    W: 9, D: 8, H: 4.4,
    shell: { floorMap: parquet(), floorDark: 0x3a3a48, floorBright: 0xd9c6bc, wallMap: damask('#f3c6d8', '#ffe3ee', 'pink'), wallDark: 0x3a3646, wallBright: 0xe2d6d6 },
    windows: [{ x: -1, z: -4 + 0.02, ry: 0, w: 1.3, h: 2.4, sill: 1.2 }],
    curtain: 0xd9577f,
    sconces: [[-4.44, 2.3, -3.2, Math.PI / 2], [4.44, 2.3, 1.6, -Math.PI / 2], [-2.2, 2.4, 3.94, Math.PI], [2.2, 2.4, 3.94, Math.PI]],
    mist: 0x6a5a90,
    battle: { hero: [1.5, -0.8], foes: [[-1.5, -1.4]], camera: [0.6, 2.2, 3.4], look: [0.35, 0.95, -1.0] },
    furnish: furnishDressing
  },
  kitchen: {
    W: 10, D: 8, H: 4.8,
    shell: { floorMap: tiles(), floorDark: 0x3a3436, floorBright: 0xeedcd2, wallMap: damask('#f6ead2', '#fff6e4', 'cream'), wallDark: 0x353640, wallBright: 0xe2d8cc },
    windows: [{ x: 3.2, z: -4 + 0.02, ry: 0, w: 1.3, h: 2.3, sill: 1.2 }],
    curtain: 0xf0a92e,
    sunFrom: [5, 7, 2],
    sconces: [[-4.94, 2.6, 2.0, Math.PI / 2], [4.94, 2.6, 2.0, -Math.PI / 2], [-2.2, 2.6, 3.94, Math.PI], [2.2, 2.6, 3.94, Math.PI]],
    mist: 0x5a6470,
    battle: { hero: [1.8, -1.4], foes: [[-1.4, -2.2], [-1.9, -0.9]], camera: [0.4, 2.2, 3.0], look: [0.35, 0.85, -1.4] },
    furnish: furnishKitchen
  },
  library: {
    W: 11, D: 10, H: 6.5,
    shell: { floorMap: parquet(), floorDark: 0x2e2e3a, floorBright: 0xb4a090, wallMap: damask('#2f5a46', '#3e7a5e', 'green'), wallDark: 0x262a34, wallBright: 0xe8e8e8 },
    windows: [],
    sunFrom: [2, 9, -4],
    sconces: [[-2.2, 2.6, 4.94, Math.PI], [2.2, 2.6, 4.94, Math.PI]],
    mist: 0x4a5a88,
    fogDark: 0x06070e,
    battle: { hero: [2.0, 0.0], foes: [[-1.8, -1.2]], camera: [0.7, 2.4, 4.0], look: [0.45, 1.25, -0.8] },
    furnish: furnishLibrary
  },
  music: {
    W: 10, D: 9, H: 5.5,
    shell: { floorMap: parquet(), floorDark: 0x33303e, floorBright: 0xc8b0a0, wallMap: damask('#d8c8f0', '#ece2ff', 'lilac'), wallDark: 0x302e40, wallBright: 0xe0d6e8 },
    windows: [{ x: 1.4, z: -4.5 + 0.02, ry: 0, w: 1.4, h: 2.8, sill: 1.1 }],
    curtain: 0x7a4ad0,
    sconces: [[-4.94, 2.6, -1.0, Math.PI / 2], [4.94, 2.6, -1.0, -Math.PI / 2], [-2.2, 2.6, 4.44, Math.PI], [2.2, 2.6, 4.44, Math.PI]],
    mist: 0x5a4a90,
    battle: { hero: [2.2, 0.6], foes: [[-1.1, -0.4], [-1.9, 0.8]], camera: [0.7, 2.3, 4.0], look: [0.35, 0.9, -0.1] },
    furnish: furnishMusic
  },
  tearoom: {
    W: 9, D: 8, H: 4.6,
    shell: { floorMap: tiles(), floorDark: 0x34343a, floorBright: 0xe8dcd8, wallMap: damask('#cdeee2', '#e6fff4', 'mint'), wallDark: 0x2e3640, wallBright: 0xdce8e2 },
    windows: [{ x: 2.4, z: -4 + 0.02, ry: 0, w: 1.3, h: 2.3, sill: 1.2 }],
    curtain: 0xe0607a,
    sunFrom: [5, 7, 2],
    sconces: [[-4.44, 2.4, -1.0, Math.PI / 2], [4.44, 2.4, 2.6, -Math.PI / 2], [-2.2, 2.4, 3.94, Math.PI], [2.2, 2.4, 3.94, Math.PI]],
    mist: 0x5a6878,
    battle: { hero: [0.9, 1.3], foes: [[-1.5, -0.6], [-0.3, -1.6]], camera: [1.0, 2.3, 3.6], look: [-0.3, 0.85, -0.3] },
    furnish: furnishTea
  },
  ballroom: {
    W: 14, D: 14, H: 8,
    shell: { floorMap: marble(), floorDark: 0x3a3848, floorBright: 0xe0d8d0, wallMap: damask('#f2dcc0', '#fff0dc', 'gold'), wallDark: 0x2a2838, wallBright: 0xe2d4c4 },
    windows: [{ x: -7 + 0.02, z: -2, ry: Math.PI / 2, w: 1.6, h: 4.0, sill: 1.2 }, { x: -7 + 0.02, z: 2.2, ry: Math.PI / 2, w: 1.6, h: 4.0, sill: 1.2 }, { x: 7 - 0.02, z: -2, ry: -Math.PI / 2, w: 1.6, h: 4.0, sill: 1.2 }, { x: 7 - 0.02, z: 2.2, ry: -Math.PI / 2, w: 1.6, h: 4.0, sill: 1.2 }],
    curtain: 0x3a4ab0,
    sunFrom: [-6, 9, 3],
    sconces: [[-3.0, 2.8, 6.94, Math.PI], [3.0, 2.8, 6.94, Math.PI]],
    mist: 0x4a5098,
    fogDark: 0x05060e,
    chandelier: false,
    battle: { hero: [2.8, 1.2], foes: [[-1.8, -0.8]], camera: [1.2, 3.0, 6.4], look: [0.3, 1.5, -0.4] },
    furnish: furnishBallroom
  }
};

export function buildPlace(id) {
  if (id === 'hall') return buildHall();
  if (id === 'gallery') return buildGallery();
  return buildRoom(id, ROOM_SPECS[id]);
}
