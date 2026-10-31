// The cave world: a grassy surface, then rock all the way down, forever. Spaghetti tunnels, caverns that grow
// commoner and bigger with depth, ravines with ledges, lava pooled at the bottom of each 80-block band, coal and
// iron, glow moss and crystals in the deep, the odd supply crate, and the rooms planted from the day's plants.
import { B } from './blocks.mjs';
import { makeNoise, hash3 } from './noise.mjs';

export const CS = 16;
const ROOM = { w: 9, h: 7, d: 9 };

export function caveGenerator(seed) {
  const n1 = makeNoise(seed), n2 = makeNoise(seed + 1), n3 = makeNoise(seed + 2), n4 = makeNoise(seed + 3), n5 = makeNoise(seed + 4);
  const hcache = new Map();
  const height = (x, z) => {
    const k = x * 73856093 ^ z * 19349663;
    let h = hcache.get(k);
    if (h === undefined) {
      h = Math.floor(4 + n1.fbm2(x / 110, z / 110, 4) * 12 + n2.noise2(x / 23, z / 23) * 2);
      if (hcache.size > 200000) hcache.clear();
      hcache.set(k, h);
    }
    return h;
  };
  const rangeCache = new Map();
  const heightRange = (x0, z0, size) => {
    const k = `${x0},${z0},${size}`;
    let r = rangeCache.get(k);
    if (!r) {
      let lo = Infinity, hi = -Infinity;
      for (let z = z0; z <= z0 + size; z += 2)
        for (let x = x0; x <= x0 + size; x += 2) {
          const h = height(x, z);
          if (h < lo) lo = h;
          if (h > hi) hi = h;
        }
      r = [lo - 2, hi + 9]; // + a tree's height
      if (rangeCache.size > 5000) rangeCache.clear();
      rangeCache.set(k, r);
    }
    return r;
  };

  // Is this cell hollowed out by a cave? (Only below the surface.)
  function cave(x, y, z, h) {
    if (y > h - 3) return false;
    const depth = h - y;
    // Spaghetti: where two ridged noises are both near zero.
    const a = n3.noise3(x / 38, y / 26, z / 38), b = n4.noise3(x / 38, y / 26, z / 38);
    const w = 0.07 + Math.min(0.05, depth / 1600);
    if (a * a + b * b < w * w) return true;
    // Caverns: big blobs, more and bigger the deeper you go. Kept away from the first 18 blocks.
    if (depth > 18) {
      const bias = Math.min(0.22, (depth - 18) / 400);
      const c = n5.noise3(x / 64, y / 34, z / 64) + n3.noise3(x / 17, y / 13, z / 17) * 0.18;
      if (c > 0.52 - bias) return true;
    }
    // Ravines: thin, tall slots that wander across the map, with ledges where a smaller noise bites in.
    if (depth > 10) {
      const r = Math.abs(n2.noise2(x / 160 + 40, z / 160 - 30));
      const ledge = n4.noise3(x / 9, y / 5, z / 9) * 0.018;
      const band = y < -14 && y > -14 - 120;
      if (band && r < 0.022 + ledge + Math.min(0.012, depth / 4000)) return true;
    }
    return false;
  }

  function lavaLevel(x, z, y) {
    const band = Math.floor(y / 80) * 80;
    return band + 3 + Math.round(n1.noise2(x / 60, z / 60) * 3);
  }

  const structures = [];

  function chunk(cx, cy, cz) {
    const data = new Uint8Array(CS * CS * CS);
    const ox = cx * CS, oy = cy * CS, oz = cz * CS;
    // The cave mask with a one-cell border, so the walls know where the air is.
    const E = CS + 2;
    const hollow = new Uint8Array(E * E * E);
    const heights = new Int32Array(E * E);
    for (let z = 0; z < E; z++) for (let x = 0; x < E; x++) heights[x + z * E] = height(ox + x - 1, oz + z - 1);
    let anyCave = false;
    const topH = Math.max(...heights);
    if (oy - 1 <= topH - 3)
      for (let y = 0; y < E; y++)
        for (let z = 0; z < E; z++)
          for (let x = 0; x < E; x++) {
            const wy = oy + y - 1;
            const h = heights[x + z * E];
            if (wy > h - 3) continue;
            if (cave(ox + x - 1, wy, oz + z - 1, h)) {
              hollow[x + z * E + y * E * E] = 1;
              anyCave = true;
            }
          }
    const at = (x, y, z) => hollow[(x + 1) + (z + 1) * E + (y + 1) * E * E];

    for (let y = 0; y < CS; y++)
      for (let z = 0; z < CS; z++)
        for (let x = 0; x < CS; x++) {
          const wx = ox + x, wy = oy + y, wz = oz + z;
          const h = heights[(x + 1) + (z + 1) * E];
          const i = x + z * CS + y * CS * CS;
          if (wy > h) continue;
          if (anyCave && at(x, y, z)) {
            if (wy < -40 && wy <= lavaLevel(wx, wz, wy)) data[i] = B.LAVA;
            else if (wy < -8 && !at(x, y - 1, z) && hash3(wx, wy, wz, seed + 9) < 0.0012) data[i] = B.CRATE;
            continue;
          }
          let id;
          if (wy === h) id = B.GRASS;
          else if (wy > h - 4) id = B.DIRT;
          else {
            // Deepstone takes over below 48, dithered across the boundary.
            id = wy < -48 + Math.floor(hash3(wx, wy, wz, seed) * 8) ? B.DEEP : B.STONE;
            const depth = h - wy;
            if (n3.noise3(wx / 5, wy / 5, wz / 5) > 0.62 && hash3(wx, wy, wz, seed + 1) < 0.55) id = B.COAL;
            else if (depth > 12 && n4.noise3(wx / 4, wy / 4, wz / 4) > 0.7 && hash3(wx, wy, wz, seed + 2) < 0.5) id = B.IRON;
            else if (n5.noise3(wx / 7, wy / 5, wz / 7) > 0.72) id = B.GRAVEL;
            // The walls of the caves: glow moss, and crystal deeper down. This is the light you see far off.
            if (anyCave && depth > 16 && (at(x + 1, y, z) || at(x - 1, y, z) || at(x, y + 1, z) || at(x, y - 1, z) || at(x, y, z + 1) || at(x, y, z - 1))) {
              const r = hash3(wx, wy, wz, seed + 3);
              const crystal = Math.min(0.012, Math.max(0, (depth - 40) / 8000));
              if (r < crystal) id = B.CRYSTAL;
              else if (r < crystal + 0.014 && n1.noise3(wx / 20, wy / 20, wz / 20) > 0.1) id = B.GLOWMOSS;
            }
          }
          data[i] = id;
        }

    // Trees on the surface (each tree is decided from its own column, so it crosses chunk edges cleanly).
    if (oy + CS > Math.min(...heights) && oy <= topH + 9)
      for (let tz = oz - 3; tz < oz + CS + 3; tz++)
        for (let tx = ox - 3; tx < ox + CS + 3; tx++) {
          if (hash3(tx, 0, tz, seed + 5) > 0.012) continue;
          const th = height(tx, tz);
          if (th < -2) continue;
          const trunk = 4 + Math.floor(hash3(tx, 1, tz, seed) * 3);
          const put = (x, y, z, id, onlyAir) => {
            const lx = x - ox, ly = y - oy, lz = z - oz;
            if (lx < 0 || ly < 0 || lz < 0 || lx >= CS || ly >= CS || lz >= CS) return;
            const i = lx + lz * CS + ly * CS * CS;
            if (onlyAir && data[i] !== B.AIR) return;
            data[i] = id;
          };
          for (let y = 1; y <= trunk; y++) put(tx, th + y, tz, B.LOG);
          for (let y = trunk - 2; y <= trunk + 1; y++) {
            const r = y > trunk ? 1 : 2;
            for (let dz = -r; dz <= r; dz++)
              for (let dx = -r; dx <= r; dx++) {
                if (Math.abs(dx) === r && Math.abs(dz) === r && hash3(tx + dx, y, tz + dz, seed) < 0.6) continue;
                put(tx + dx, th + y, tz + dz, B.LEAVES, true);
              }
          }
        }

    for (const s of structures) stamp(s, data, ox, oy, oz);
    return data;
  }

  // A planted room: rune-stone walls (they glow faintly, so a crack shows them), a lectern in the middle, and a
  // portal in a frame against the far wall, dormant until the stone is answered.
  function stamp(s, data, ox, oy, oz) {
    const { x: x0, y: y0, z: z0 } = s;
    if (x0 > ox + CS || x0 + ROOM.w < ox || y0 > oy + CS || y0 + ROOM.h < oy || z0 > oz + CS || z0 + ROOM.d < oz) return;
    for (let y = 0; y < ROOM.h; y++)
      for (let z = 0; z < ROOM.d; z++)
        for (let x = 0; x < ROOM.w; x++) {
          const lx = x0 + x - ox, ly = y0 + y - oy, lz = z0 + z - oz;
          if (lx < 0 || ly < 0 || lz < 0 || lx >= CS || ly >= CS || lz >= CS) continue;
          const shell = x === 0 || z === 0 || y === 0 || x === ROOM.w - 1 || z === ROOM.d - 1 || y === ROOM.h - 1;
          let id = shell ? (y === 0 ? B.FLOOR : B.RUNE) : B.AIR;
          // The portal stands one in from the z = 0 wall: frame 5 wide × 5 tall, an opening 3 × 3.
          if (z === 1 && x >= 2 && x <= 6 && y >= 1 && y <= 5) {
            const inside = x >= 3 && x <= 5 && y >= 2 && y <= 4;
            id = inside ? (s.live ? B.PORTAL : B.DORMANT) : B.FRAME;
          }
          if (x === 4 && z === 5 && y === 1) id = B.LECTERN;
          data[lx + lz * CS + ly * CS * CS] = id;
        }
  }

  // Where to put a new room: somewhere ahead and below the player, inside rock, beside a cave if there is one.
  function placeRoom(near, salt) {
    const r = Math.abs(hash3(salt, 3, 7, seed));
    let best = null;
    for (let tries = 0; tries < 40; tries++) {
      const a = hash3(salt, tries, 1, seed) * Math.PI * 2;
      const dist = 18 + hash3(salt, tries, 2, seed) * 30;
      const x = Math.round(near.x + Math.cos(a) * dist);
      const z = Math.round(near.z + Math.sin(a) * dist);
      const y = Math.round(Math.min(near.y, height(x, z) - 12) - 6 - hash3(salt, tries, 3, seed) * 26 - r * 4);
      if (structures.some((s) => Math.abs(s.x - x) < 14 && Math.abs(s.y - y) < 10 && Math.abs(s.z - z) < 14)) continue;
      // Prefer a spot whose wall touches a cave: it can be seen glowing from the dark.
      let touches = 0;
      for (const [dx, dy, dz] of [[-2, 3, 4], [10, 3, 4], [4, 3, -2], [4, 3, 10], [4, -2, 4]])
        if (cave(x + dx, y + dy, z + dz, height(x + dx, z + dz))) touches++;
      const score = touches * 10 - Math.abs(dist - 30) * 0.1;
      if (!best || score > best.score) best = { x, y, z, score };
    }
    return { x: best.x, y: best.y, z: best.z };
  }

  return {
    sky: true,
    height,
    heightRange,
    chunk,
    structures,
    placeRoom,
    room: ROOM,
    spawn() {
      // A clearing on dry land near the origin.
      for (let r = 0; r < 60; r += 3)
        for (let a = 0; a < 8; a++) {
          const x = Math.round(Math.cos(a) * r), z = Math.round(Math.sin(a) * r);
          const h = height(x, z);
          if (h > 0) return { x: x + 0.5, y: h + 1.01, z: z + 0.5 };
        }
      return { x: 0.5, y: height(0, 0) + 1.01, z: 0.5 };
    }
  };
}

// Cells of a room by role (for the game: where the lectern is, which cells are the portal).
export function roomParts(s) {
  const portal = [];
  for (let y = 2; y <= 4; y++) for (let x = 3; x <= 5; x++) portal.push([s.x + x, s.y + y, s.z + 1]);
  return {
    lectern: [s.x + 4, s.y + 1, s.z + 5],
    portal,
    portalCentre: [s.x + 4.5, s.y + 3.5, s.z + 1.5],
    standIn: [s.x + 4.5, s.y + 1.01, s.z + 3.5],
    centre: [s.x + 4.5, s.y + 3.5, s.z + 4.5]
  };
}
