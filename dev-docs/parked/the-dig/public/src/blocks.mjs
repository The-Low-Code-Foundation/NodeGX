// The blocks, and the texture atlas painted for them in code (16 × 16 pixel tiles, Minecraft-style, no image files).
// A world can repaint the atlas with its own palette (the secret worlds do: an amber forest, a blue tundra…).
import * as THREE from 'three';
import { rng } from './noise.mjs';

export const B = {
  AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, DEEP: 4, COAL: 5, IRON: 6, GRAVEL: 7, LAVA: 8, GLOWMOSS: 9, CRYSTAL: 10,
  LOG: 11, LEAVES: 12, TORCH: 13, RUNE: 14, FLOOR: 15, LECTERN: 16, FRAME: 17, DORMANT: 18, PORTAL: 19,
  SAND: 20, SANDSTONE: 21, SNOW: 22, ICE: 23, METAL: 24, METALFLOOR: 25, CACTUS: 26, CRATE: 27, COBBLE: 28,
  PILLAR: 29, FLOWERS: 30, BEACON: 31
};

// solid: the player collides. opaque: hides the faces behind it and stops light. hard: seconds to dig with the pick
// (Infinity = cannot be dug). light: what it gives off (0–15). drop: what digging it puts in the pack.
const def = (name, o) => ({ name, solid: true, opaque: true, hard: 0.6, light: 0, drop: 'rubble', shape: 'cube', ...o });
export const BLOCKS = [];
BLOCKS[B.AIR] = def('air', { solid: false, opaque: false, shape: 'none', drop: null });
BLOCKS[B.GRASS] = def('grass', { hard: 0.45, tiles: ['grass_top', 'grass_side', 'dirt'] });
BLOCKS[B.DIRT] = def('dirt', { hard: 0.4, tiles: ['dirt'] });
BLOCKS[B.STONE] = def('stone', { hard: 0.75, tiles: ['stone'] });
BLOCKS[B.DEEP] = def('deepstone', { hard: 1.0, tiles: ['deep'] });
BLOCKS[B.COAL] = def('coal ore', { hard: 0.8, tiles: ['coal'], drop: 'coal' });
BLOCKS[B.IRON] = def('iron ore', { hard: 1.0, tiles: ['iron'], drop: 'iron' });
BLOCKS[B.GRAVEL] = def('gravel', { hard: 0.45, tiles: ['gravel'], drop: 'gravel' });
BLOCKS[B.LAVA] = def('lava', { solid: false, opaque: false, hard: Infinity, light: 15, tiles: ['lava'], drop: null, liquid: true, hurts: 4 });
BLOCKS[B.GLOWMOSS] = def('glow moss', { hard: 0.3, light: 9, tiles: ['glowmoss'], drop: 'rubble' });
BLOCKS[B.CRYSTAL] = def('crystal', { hard: 0.9, light: 12, tiles: ['crystal'], drop: 'crystal' });
BLOCKS[B.LOG] = def('log', { hard: 0.6, tiles: ['log_top', 'log_side', 'log_top'] });
BLOCKS[B.LEAVES] = def('leaves', { hard: 0.2, tiles: ['leaves'], drop: null });
BLOCKS[B.TORCH] = def('torch', { solid: false, opaque: false, hard: 0.05, light: 14, shape: 'torch', drop: 'torch', tiles: ['white'] });
BLOCKS[B.RUNE] = def('rune stone', { hard: 1.6, light: 10, tiles: ['rune'] });
BLOCKS[B.FLOOR] = def('worked floor', { hard: 1.6, tiles: ['floor'] });
BLOCKS[B.LECTERN] = def('lectern', { hard: Infinity, light: 9, tiles: ['lectern_top', 'lectern_side', 'lectern_side'], drop: null });
BLOCKS[B.FRAME] = def('portal frame', { hard: Infinity, light: 7, tiles: ['frame'], drop: null });
BLOCKS[B.DORMANT] = def('dormant portal', { hard: Infinity, tiles: ['dormant'], drop: null });
BLOCKS[B.PORTAL] = def('portal', { solid: false, opaque: false, hard: Infinity, light: 13, shape: 'none', drop: null });
BLOCKS[B.SAND] = def('sand', { hard: 0.4, tiles: ['sand'] });
BLOCKS[B.SANDSTONE] = def('sandstone', { hard: 0.7, tiles: ['sandstone_top', 'sandstone', 'sandstone_top'] });
BLOCKS[B.SNOW] = def('snow', { hard: 0.35, tiles: ['snow'] });
BLOCKS[B.ICE] = def('ice', { hard: 0.5, tiles: ['ice'] });
BLOCKS[B.METAL] = def('hull plate', { hard: 2.0, tiles: ['metal'] });
BLOCKS[B.METALFLOOR] = def('deck', { hard: 2.0, tiles: ['metalfloor'] });
BLOCKS[B.CACTUS] = def('cactus', { hard: 0.3, tiles: ['cactus_top', 'cactus', 'cactus_top'], drop: null });
BLOCKS[B.CRATE] = def('supply crate', { hard: 0.35, tiles: ['crate'], drop: 'crate' });
BLOCKS[B.COBBLE] = def('rubble', { hard: 0.6, tiles: ['cobble'] });
BLOCKS[B.PILLAR] = def('old pillar', { hard: 1.2, tiles: ['pillar_top', 'pillar', 'pillar_top'] });
BLOCKS[B.FLOWERS] = def('meadow', { hard: 0.45, tiles: ['flowers', 'grass_side', 'dirt'] });
BLOCKS[B.BEACON] = def('beacon', { hard: Infinity, light: 15, tiles: ['beacon'], drop: null });

export const isOpaque = new Uint8Array(256);
export const isSolid = new Uint8Array(256);
export const emits = new Uint8Array(256);
for (let i = 0; i < BLOCKS.length; i++) {
  if (!BLOCKS[i]) continue;
  isOpaque[i] = BLOCKS[i].opaque ? 1 : 0;
  isSolid[i] = BLOCKS[i].solid ? 1 : 0;
  emits[i] = BLOCKS[i].light;
}

// The cave's colours. A secret world passes its own (sky, ground, accent) and gets a repainted atlas.
export const CAVE_PALETTE = {
  grass: '#5f9a3a', dirt: '#7a5536', stone: '#7d7d7d', deep: '#4b4a55', leaves: '#3f7a2c', log: '#6b4a2a',
  sand: '#d9c58b', snow: '#eef3f7', metal: '#8a949c', glow: '#58e0c0', crystal: '#b98cff', accent: '#e8b04a'
};

const TILE = 16;
const ORDER = [
  'white', 'grass_top', 'grass_side', 'dirt', 'stone', 'deep', 'coal', 'iron', 'gravel', 'lava', 'glowmoss', 'crystal',
  'log_top', 'log_side', 'leaves', 'rune', 'floor', 'lectern_top', 'lectern_side', 'frame', 'dormant', 'sand',
  'sandstone', 'sandstone_top', 'snow', 'ice', 'metal', 'metalfloor', 'cactus', 'cactus_top', 'crate', 'cobble',
  'pillar', 'pillar_top', 'flowers', 'beacon'
];
export const TILE_INDEX = Object.fromEntries(ORDER.map((n, i) => [n, i]));
const PER_ROW = 8;
const ATLAS = PER_ROW * TILE;

// [u0, v0, u1, v1] of a tile, inset half a texel so neighbours never bleed in.
export function tileUV(name) {
  const i = TILE_INDEX[name] ?? 0;
  const x = (i % PER_ROW) * TILE;
  const y = Math.floor(i / PER_ROW) * TILE;
  const e = 0.02;
  return [(x + e) / ATLAS, 1 - (y + TILE - e) / ATLAS, (x + TILE - e) / ATLAS, 1 - (y + e) / ATLAS];
}

const hex = (c) => {
  const n = parseInt(c.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const shade = (rgb, f) => rgb.map((v) => Math.max(0, Math.min(255, Math.round(v * f))));

export function paintAtlas(palette = CAVE_PALETTE, seed = 7) {
  const pal = { ...CAVE_PALETTE };
  for (const [k, v] of Object.entries(palette ?? {})) if (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)) pal[k] = v;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = ATLAS;
  const g = canvas.getContext('2d');
  const img = g.createImageData(ATLAS, ATLAS);
  const r = rng(seed);
  const put = (tile, x, y, rgb) => {
    const i = TILE_INDEX[tile];
    const px = (i % PER_ROW) * TILE + x;
    const py = Math.floor(i / PER_ROW) * TILE + y;
    const o = (py * ATLAS + px) * 4;
    img.data[o] = rgb[0];
    img.data[o + 1] = rgb[1];
    img.data[o + 2] = rgb[2];
    img.data[o + 3] = 255;
  };
  const each = (tile, fn) => {
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) put(tile, x, y, fn(x, y));
  };
  const speckle = (tile, base, spread = 0.18) => each(tile, () => shade(hex(base), 1 - spread + r() * spread * 2));
  const ore = (tile, base, oreRgb) => {
    const spots = new Set();
    for (let k = 0; k < 6; k++) {
      const cx = 2 + Math.floor(r() * 12), cy = 2 + Math.floor(r() * 12);
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1], [-1, 0]]) if (r() < 0.8) spots.add(`${cx + dx},${cy + dy}`);
    }
    each(tile, (x, y) => (spots.has(`${x},${y}`) ? shade(oreRgb, 0.8 + r() * 0.4) : shade(hex(base), 0.82 + r() * 0.36)));
  };

  each('white', () => [255, 255, 255]);
  speckle('grass_top', pal.grass, 0.2);
  speckle('dirt', pal.dirt, 0.2);
  each('grass_side', (x, y) => {
    const fringe = 3 + ((x * 7 + 3) % 3);
    return y < fringe ? shade(hex(pal.grass), 0.8 + r() * 0.35) : shade(hex(pal.dirt), 0.8 + r() * 0.4);
  });
  each('flowers', (x, y) => {
    if (r() < 0.08) return r() < 0.5 ? [240, 220, 90] : shade(hex(pal.accent), 1.1);
    return shade(hex(pal.grass), 0.8 + r() * 0.4);
  });
  speckle('stone', pal.stone, 0.16);
  speckle('deep', pal.deep, 0.18);
  ore('coal', pal.stone, [28, 28, 30]);
  ore('iron', pal.stone, [214, 160, 122]);
  each('gravel', () => shade([128, 120, 114], 0.65 + r() * 0.6));
  each('lava', (x, y) => {
    const t = Math.sin(x * 0.9 + Math.sin(y * 0.7) * 2) * 0.5 + 0.5;
    return [255, Math.round(90 + t * 120), Math.round(20 + t * 30)];
  });
  each('glowmoss', () => (r() < 0.45 ? shade(hex(pal.glow), 0.8 + r() * 0.5) : shade(hex(pal.deep), 0.8 + r() * 0.3)));
  each('crystal', (x, y) => {
    const facet = ((x + y) % 5 === 0 || (x - y + 16) % 6 === 0) ? 1.35 : 0.85 + r() * 0.25;
    return shade(hex(pal.crystal), facet);
  });
  each('log_side', (x) => shade(hex(pal.log), (x % 4 === 0 ? 0.7 : 1) * (0.85 + r() * 0.3)));
  each('log_top', (x, y) => {
    const d = Math.hypot(x - 7.5, y - 7.5);
    return shade(hex(pal.log), d > 6.5 ? 0.7 : (Math.floor(d) % 2 ? 1.25 : 1.05));
  });
  each('leaves', () => (r() < 0.15 ? shade(hex(pal.leaves), 0.55) : shade(hex(pal.leaves), 0.8 + r() * 0.4)));
  // The planted rooms: dark worked stone with glyphs that glow in the accent colour.
  const glyph = new Set();
  for (let k = 0; k < 5; k++) {
    const gx = 2 + Math.floor(r() * 10), gy = 2 + Math.floor(r() * 10);
    const len = 2 + Math.floor(r() * 4);
    const vertical = r() < 0.5;
    for (let s = 0; s < len; s++) glyph.add(vertical ? `${gx},${gy + s}` : `${gx + s},${gy}`);
  }
  each('rune', (x, y) => (glyph.has(`${x},${y}`) ? shade(hex(pal.accent), 1.1) : shade([58, 54, 66], 0.85 + r() * 0.3)));
  each('floor', (x, y) => shade([92, 86, 98], (x % 8 === 0 || y % 8 === 0 ? 0.7 : 1) * (0.9 + r() * 0.2)));
  each('lectern_top', (x, y) => (x > 2 && x < 13 && y > 3 && y < 12 ? shade([236, 222, 186], 0.9 + r() * 0.1) : shade([96, 66, 40], 0.9 + r() * 0.2)));
  each('lectern_side', (x, y) => shade([96, 66, 40], (y % 5 === 0 ? 0.7 : 1) * (0.9 + r() * 0.2)));
  each('frame', (x, y) => (x === 0 || y === 0 || x === 15 || y === 15 ? shade(hex(pal.accent), 0.7) : shade([30, 22, 44], 0.8 + r() * 0.4)));
  each('dormant', (x, y) => shade([24, 20, 34], 0.8 + 0.4 * Math.abs(Math.sin(x * 0.6 + y * 0.4))));
  speckle('sand', pal.sand, 0.1);
  each('sandstone', (x, y) => shade(hex(pal.sand), (y % 6 === 0 ? 0.78 : 0.95) * (0.92 + r() * 0.14)));
  speckle('sandstone_top', pal.sand, 0.08);
  speckle('snow', pal.snow, 0.05);
  each('ice', (x, y) => shade([160, 200, 240], (x === y || x === 15 - y ? 1.15 : 0.95) * (0.95 + r() * 0.1)));
  each('metal', (x, y) => shade(hex(pal.metal), (x === 0 || y === 0 ? 1.2 : x === 15 || y === 15 ? 0.6 : 1) * ((x === 3 || x === 12) && (y === 3 || y === 12) ? 0.6 : 0.95 + r() * 0.08)));
  each('metalfloor', (x, y) => shade(hex(pal.metal), ((x + y) % 4 === 0 ? 0.75 : 0.95) * (0.95 + r() * 0.1)));
  each('cactus', (x) => shade([70, 140, 60], (x % 4 === 1 ? 0.7 : 1) * (0.9 + r() * 0.2)));
  each('cactus_top', () => shade([90, 160, 70], 0.9 + r() * 0.2));
  each('crate', (x, y) => shade([150, 105, 55], (x < 2 || y < 2 || x > 13 || y > 13 || x === y || x === 15 - y ? 0.65 : 1) * (0.9 + r() * 0.2)));
  each('cobble', (x, y) => shade(hex(pal.stone), ((x * 3 + y * 5) % 7 === 0 ? 0.65 : 0.85 + r() * 0.3)));
  each('pillar', (x) => shade([200, 192, 176], (x % 5 === 0 ? 0.75 : 1) * (0.9 + r() * 0.15)));
  each('pillar_top', (x, y) => shade([200, 192, 176], (x === 0 || y === 0 || x === 15 || y === 15 ? 0.75 : 1) * (0.9 + r() * 0.15)));
  each('beacon', (x, y) => shade(hex(pal.accent), 1.1 - Math.hypot(x - 7.5, y - 7.5) * 0.04));

  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// [top, side, bottom] tile names for a block.
export function tilesOf(id) {
  const t = BLOCKS[id]?.tiles ?? ['white'];
  return t.length === 1 ? [t[0], t[0], t[0]] : t;
}
