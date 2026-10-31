// A secret world behind a portal, made from the plant Claude wrote the night before: its theme (forest, field,
// desert, tundra, jungle, cavern, station, ruins), its colours, its treasure and its notes. A return portal stands at
// the landing; the places worth walking to (a shrine, a ruin, a tower, a research station) sit in a ring round it.
import { B } from './blocks.mjs';
import { makeNoise, hash3, hashString, rng } from './noise.mjs';

const CS = 16;
const THEMES = {
  forest: { top: B.GRASS, under: B.DIRT, rock: B.STONE, amp: 10, trees: 0.03, tree: 'oak' },
  field: { top: B.FLOWERS, under: B.DIRT, rock: B.STONE, amp: 6, trees: 0.004, tree: 'oak' },
  desert: { top: B.SAND, under: B.SANDSTONE, rock: B.SANDSTONE, amp: 9, trees: 0.006, tree: 'cactus', terrace: 4 },
  tundra: { top: B.SNOW, under: B.DIRT, rock: B.STONE, amp: 12, trees: 0.012, tree: 'pine', ice: true },
  jungle: { top: B.GRASS, under: B.DIRT, rock: B.STONE, amp: 14, trees: 0.06, tree: 'tall' },
  cavern: { top: B.STONE, under: B.STONE, rock: B.DEEP, amp: 8, trees: 0, tree: null, roof: true },
  station: { top: B.GRASS, under: B.DIRT, rock: B.STONE, amp: 5, trees: 0.003, tree: 'oak' },
  ruins: { top: B.GRASS, under: B.DIRT, rock: B.STONE, amp: 7, trees: 0.008, tree: 'oak' }
};
const SKIES = { forest: '#9cc8e8', field: '#a8d4f0', desert: '#86b6e0', tundra: '#cfe0ee', jungle: '#8fc49a', cavern: '#120e1c', station: '#b4c6d8', ruins: '#d8c8b0' };

export function secretGenerator(world, plantId) {
  const theme = THEMES[world.theme] ? world.theme : 'forest';
  const T = THEMES[theme];
  const seed = Number.isFinite(world.seed) ? world.seed : hashString(plantId + (world.name ?? ''));
  const n1 = makeNoise(seed), n2 = makeNoise(seed + 1), n3 = makeNoise(seed + 2);
  const random = rng(seed + 99);

  const raw = (x, z) => {
    let h = n1.fbm2(x / 90, z / 90, 4) * T.amp + n2.noise2(x / 25, z / 25) * T.amp * 0.25 + 4;
    // Flatten the landing.
    const d = Math.hypot(x, z);
    if (d < 10) h = h * (d / 10) + 4 * (1 - d / 10);
    if (T.terrace) h = Math.floor(h / T.terrace) * T.terrace + Math.min(T.terrace - 1, (h % T.terrace) * 0.3);
    return Math.floor(h);
  };
  // The places, decided once: their ground is levelled.
  const pois = [];
  const treasure = [...(world.treasure ?? [])];
  const notes = [...(world.notes ?? [])];
  const count = Math.min(6, Math.max(3, treasure.length, notes.length + 1));
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + random() * 0.6;
    const dist = 26 + random() * 34;
    const x = Math.round(Math.cos(a) * dist), z = Math.round(Math.sin(a) * dist);
    let type = ['shrine', 'ruin', 'tower'][i % 3];
    if (i === 0 && (theme === 'station' || world.enemies === 'bugs' || world.enemies === 'robots')) type = 'station';
    if (notes.length && i === count - 1) type = 'shrine';
    pois.push({ type, x, z, y: raw(x, z), treasure: null, note: null, radius: type === 'station' ? 9 : 5 });
  }
  for (const p of pois) if (p.type === 'shrine' && notes.length) p.note = notes.shift();
  for (const p of pois) if (notes.length && !p.note) p.note = notes.shift();
  for (const p of pois) if (treasure.length) p.treasure = treasure.shift();
  // Where each place keeps its treasure and its lectern (the stamp below builds them there).
  for (const p of pois) {
    const { x, y, z } = p;
    if (p.type === 'shrine') [p.item, p.lectern] = [[x + 0.5, y + 3.2, z - 0.5], [x, y + 2, z + 1]];
    else if (p.type === 'ruin') [p.item, p.lectern] = [[x + 0.5, y + 2.6, z + 0.5], [x + 1, y + 1, z]];
    else if (p.type === 'tower') [p.item, p.lectern] = [[x + 0.5, y + 15.2, z + 0.5], [x - 1, y + 14, z]];
    else [p.item, p.lectern] = [[x - 3.5, y + 1.8, z + 0.5], [x + 3, y + 1, z + 2]];
    if (!p.note) p.lectern = null;
  }
  // Spare treasure scatters along the way.
  const strays = treasure.map((t, i) => {
    const a = random() * Math.PI * 2, d = 15 + random() * 40;
    const x = Math.round(Math.cos(a) * d), z = Math.round(Math.sin(a) * d);
    return { treasure: t, x, z, y: raw(x, z) + 1 };
  });

  const height = (x, z) => {
    for (const p of pois) if (Math.abs(x - p.x) <= p.radius && Math.abs(z - p.z) <= p.radius) return p.y;
    return raw(x, z);
  };
  const ceiling = (x, z) => height(x, z) + 22 + Math.floor(n3.noise2(x / 30, z / 30) * 8);

  function chunk(cx, cy, cz) {
    const data = new Uint8Array(CS * CS * CS);
    const ox = cx * CS, oy = cy * CS, oz = cz * CS;
    const put = (x, y, z, id, onlyAir) => {
      const lx = x - ox, ly = y - oy, lz = z - oz;
      if (lx < 0 || ly < 0 || lz < 0 || lx >= CS || ly >= CS || lz >= CS) return;
      const i = lx + lz * CS + ly * CS * CS;
      if (onlyAir && data[i] !== B.AIR) return;
      data[i] = id;
    };
    for (let z = 0; z < CS; z++)
      for (let x = 0; x < CS; x++) {
        const wx = ox + x, wz = oz + z;
        const h = height(wx, wz);
        const top = T.roof ? ceiling(wx, wz) : Infinity;
        for (let y = 0; y < CS; y++) {
          const wy = oy + y;
          let id = B.AIR;
          if (wy === h) id = T.ice && h < 1 ? B.ICE : T.top;
          else if (wy < h && wy > h - 4) id = T.under;
          else if (wy <= h - 4) id = T.rock;
          else if (wy >= top) id = B.DEEP;
          if (T.roof && id !== B.AIR) {
            const touchesAir = wy === h || wy === top;
            if (touchesAir && hash3(wx, wy, wz, seed) < 0.05) id = hash3(wx, wy, wz, seed + 1) < 0.4 ? B.CRYSTAL : B.GLOWMOSS;
          }
          data[x + z * CS + y * CS * CS] = id;
        }
      }
    // Trees (and cacti, and giant crystal spires under a roof).
    for (let tz = oz - 3; tz < oz + CS + 3; tz++)
      for (let tx = ox - 3; tx < ox + CS + 3; tx++) {
        if (Math.hypot(tx, tz) < 8 || pois.some((p) => Math.abs(tx - p.x) <= p.radius + 1 && Math.abs(tz - p.z) <= p.radius + 1)) continue;
        if (T.roof) {
          if (hash3(tx, 2, tz, seed) < 0.004) {
            const h = height(tx, tz), top = ceiling(tx, tz);
            for (let y = h + 1; y < top; y++) put(tx, y, tz, B.CRYSTAL);
          }
          continue;
        }
        if (hash3(tx, 0, tz, seed + 5) > T.trees) continue;
        const th = height(tx, tz);
        if (T.tree === 'cactus') {
          const n = 2 + Math.floor(hash3(tx, 1, tz, seed) * 3);
          for (let y = 1; y <= n; y++) put(tx, th + y, tz, B.CACTUS);
          continue;
        }
        const trunk = T.tree === 'tall' ? 8 + Math.floor(hash3(tx, 1, tz, seed) * 6) : 4 + Math.floor(hash3(tx, 1, tz, seed) * 3);
        for (let y = 1; y <= trunk; y++) put(tx, th + y, tz, B.LOG);
        if (T.tree === 'pine') {
          for (let y = 2; y <= trunk + 2; y++) {
            const r = Math.max(0, Math.round((trunk + 2 - y) / 2));
            for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) if (Math.abs(dx) + Math.abs(dz) <= r) put(tx + dx, th + y, tz + dz, B.LEAVES, true);
          }
          continue;
        }
        const crown = T.tree === 'tall' ? 3 : 2;
        for (let y = trunk - crown; y <= trunk + 1; y++) {
          const r = y > trunk ? 1 : crown;
          for (let dz = -r; dz <= r; dz++)
            for (let dx = -r; dx <= r; dx++) {
              if (Math.abs(dx) === r && Math.abs(dz) === r && hash3(tx + dx, y, tz + dz, seed) < 0.6) continue;
              put(tx + dx, th + y, tz + dz, B.LEAVES, true);
            }
        }
      }
    // The landing: a pale plinth and the way home.
    for (let z = -3; z <= 3; z++) for (let x = -3; x <= 3; x++) put(x, height(0, 0), z, B.PILLAR);
    for (let y = 1; y <= 5; y++) for (let x = -2; x <= 2; x++) {
      const inside = x >= -1 && x <= 1 && y >= 2 && y <= 4;
      put(x, height(0, 0) + y, -3, inside ? B.PORTAL : B.FRAME);
    }
    for (const p of pois) {
      stampPoi(p, put);
      if (p.lectern) put(...p.lectern, B.LECTERN);
    }
    return data;
  }

  function stampPoi(p, put) {
    const { x, y, z } = p;
    if (p.type === 'shrine') {
      for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) put(x + dx, y + 1, z + dz, B.PILLAR);
      for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) for (let h = 2; h <= 5; h++) put(x + dx, y + h, z + dz, B.PILLAR);
      for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) put(x + dx, y + 6, z + dz, B.PILLAR);
      put(x, y + 7, z, B.BEACON);
    } else if (p.type === 'ruin') {
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        const px = Math.round(x + Math.cos(a) * 4), pz = Math.round(z + Math.sin(a) * 4);
        const h = 1 + Math.floor(hash3(px, 0, pz, seed) * 5);
        for (let yy = 1; yy <= h; yy++) put(px, y + yy, pz, B.PILLAR);
      }
      put(x, y + 1, z, B.PILLAR);
    } else if (p.type === 'tower') {
      const H = 12;
      for (let yy = 1; yy <= H; yy++) for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) put(x + dx, y + yy, z + dz, B.PILLAR);
      // A stair that winds round it, one step per block of height.
      const ring = [];
      for (let k = -2; k <= 2; k++) ring.push([k, -2]);
      for (let k = -1; k <= 2; k++) ring.push([2, k]);
      for (let k = 1; k >= -2; k--) ring.push([k, 2]);
      for (let k = 1; k >= -1; k--) ring.push([-2, k]);
      for (let s = 0; s < H; s++) {
        const [dx, dz] = ring[s % ring.length];
        put(x + dx, y + s + 1, z + dz, B.COBBLE);
      }
      for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) put(x + dx, y + H + 1, z + dz, B.PILLAR);
      put(x, y + H + 2, z + 2, B.BEACON);
    } else if (p.type === 'station') {
      const W = 6, D = 5, H = 5;
      for (let yy = 0; yy <= H; yy++)
        for (let dz = -D; dz <= D; dz++)
          for (let dx = -W; dx <= W; dx++) {
            const wall = Math.abs(dx) === W || Math.abs(dz) === D;
            let id = B.AIR;
            if (yy === 0) id = B.METALFLOOR;
            else if (yy === H) id = B.METAL;
            else if (wall) id = B.METAL;
            // The door, and a window band.
            if (dz === D && Math.abs(dx) <= 1 && yy >= 1 && yy <= 3) id = B.AIR;
            if (wall && yy === 3 && (Math.abs(dx) % 3 === 1) && Math.abs(dz) === D && Math.abs(dx) > 2) id = B.AIR;
            // An inner wall with a gap.
            if (dx === 0 && Math.abs(dz) < D && dz !== 0 && dz !== 1 && yy > 0 && yy < H) id = B.METAL;
            put(x + dx, y + yy, z + dz, id);
          }
      put(x - 4, y + 1, z - 3, B.CRATE);
      put(x + 4, y + 1, z - 3, B.CRATE);
    }
  }

  return {
    sky: !T.roof,
    theme,
    name: world.name ?? 'A secret place',
    skyColor: world.sky ?? SKIES[theme],
    palette: {
      grass: world.ground ?? undefined,
      leaves: world.foliage ?? world.accent ?? undefined,
      accent: world.accent ?? undefined,
      sand: theme === 'desert' && world.ground ? world.ground : undefined
    },
    height,
    heightRange(x0, z0, size) {
      if (T.roof) return [-1000, -1000];
      let lo = Infinity, hi = -Infinity;
      for (let z = z0; z <= z0 + size; z += 2)
        for (let x = x0; x <= x0 + size; x += 2) {
          const h = height(x, z);
          lo = Math.min(lo, h);
          hi = Math.max(hi, h);
        }
      return [lo - 2, hi + 16];
    },
    chunk,
    pois,
    strays,
    enemies: world.enemies ?? 'none',
    spawn: { x: 0.5, y: height(0, 0) + 1.01, z: 2.5 },
    portalCells: (() => {
      const out = [];
      for (let y = 2; y <= 4; y++) for (let x = -1; x <= 1; x++) out.push([x, height(0, 0) + y, -3]);
      return out;
    })(),
    portalCentre: [0.5, height(0, 0) + 3.5, -2.5]
  };
}
