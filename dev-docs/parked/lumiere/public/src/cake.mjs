// Chef Mirabelle's Magic Cakes: a cake made from a recipe, on a porcelain stand with a gold rim and a paper doily.
// Each tier shows its sponge (with a cream layer) under glossy icing that drips down the sides, a piped cream border
// round its top and its base, and the toppings: a ring of fruit, macarons or flowers on every tier, sprinkles, and stars,
// hearts or candles on the top. Candle flames glow (bloom).
//   const cake = makeCake({ sponge: 'vanilla', tiers: 2, icing: 'pink', toppings: ['strawberries', 'candles'] });
//   scene.add(cake); each frame: cake.userData.update(dt) (the flames flicker); disposeCake(cake) before the next.
// Origin at the bottom of the stand; about 0.5 m tall with one tier. The toppings' shapes and materials are made once
// and shared (marked userData.shared); a cake's own icing, drips and sponge are freed by disposeCake.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { canvasTexture } from './look.mjs';

export const CAKE_OPTIONS = {
  sponge: [
    { id: 'vanilla', name: 'Vanilla', color: '#f3d9a0' },
    { id: 'chocolate', name: 'Chocolate', color: '#6b3b26' },
    { id: 'strawberry', name: 'Strawberry', color: '#f4a6b4' },
    { id: 'blueberry', name: 'Blueberry', color: '#a99be0' },
    { id: 'pistachio', name: 'Pistachio', color: '#c3d99a' }
  ],
  tiers: [1, 2, 3],
  icing: [
    { id: 'pink', name: 'Pink', color: '#ff9fc4' },
    { id: 'white', name: 'Snow white', color: '#fff8f2' },
    { id: 'lilac', name: 'Lilac', color: '#c9a7f5' },
    { id: 'mint', name: 'Mint', color: '#9fe8c9' },
    { id: 'lemon', name: 'Lemon', color: '#fff09a' },
    { id: 'chocolate', name: 'Chocolate', color: '#5a2e1c' }
  ],
  toppings: [
    { id: 'strawberries', name: 'Strawberries' },
    { id: 'cherries', name: 'Cherries' },
    { id: 'sprinkles', name: 'Sprinkles' },
    { id: 'stars', name: 'Stars' },
    { id: 'macarons', name: 'Macarons' },
    { id: 'candles', name: 'Candles' },
    { id: 'flowers', name: 'Flowers' },
    { id: 'hearts', name: 'Hearts' }
  ]
};

const byId = (list, id) => list.find((o) => o.id === id) ?? list[0];
const RING = ['strawberries', 'cherries', 'macarons', 'flowers'];
const PLATE_Y = 0.24, BASE_R = 0.22, BASE_H = 0.17;

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) + 0x9e3779b9) >>> 0), (s >>> 8) / 16777216);
}
const hash = (str) => [...str].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261);

// --- Shared pieces, made once.
let SHARED;
function shared() {
  if (SHARED) return SHARED;
  const mark = (o) => ((o.userData.shared = true), o);
  const lathe = (pts, seg = 24) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);

  // The stand: a foot, a slim stem, and a plate with a raised rim.
  const stand = lathe([[0, 0], [0.14, 0], [0.145, 0.012], [0.12, 0.02], [0.06, 0.035], [0.03, 0.06], [0.026, 0.1], [0.034, 0.13], [0.026, 0.16], [0.03, 0.19], [0.06, 0.215], [0.24, 0.228], [0.29, 0.236], [0.305, 0.248], [0.298, 0.252], [0.28, PLATE_Y + 0.003], [0, PLATE_Y + 0.003]], 48);
  const porcelain = new THREE.MeshPhysicalMaterial({ color: 0xfbeef3, roughness: 0.25, clearcoat: 0.8, clearcoatRoughness: 0.15 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xf0c66a, roughness: 0.25, metalness: 0.95 });
  const rim = new THREE.TorusGeometry(0.302, 0.005, 6, 64).rotateX(Math.PI / 2).translate(0, 0.25, 0);
  const band = new THREE.TorusGeometry(0.142, 0.004, 6, 48).rotateX(Math.PI / 2).translate(0, 0.012, 0);
  const knot = new THREE.TorusGeometry(0.03, 0.006, 6, 24).rotateX(Math.PI / 2).translate(0, 0.13, 0);
  // A scalloped paper doily with lace holes.
  const doilyShape = new THREE.Shape();
  for (let i = 0; i <= 96; i++) {
    const a = (i / 96) * Math.PI * 2, rr = 0.268 + Math.abs(Math.sin(a * 12)) * 0.012;
    i ? doilyShape.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : doilyShape.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  const doily = new THREE.ShapeGeometry(doilyShape, 2).rotateX(-Math.PI / 2).translate(0, PLATE_Y + 0.004, 0);
  {
    const p = doily.attributes.position, uv = doily.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 0.6 + 0.5, p.getZ(i) / 0.6 + 0.5);
  }
  const lace = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#fff';
    g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'destination-out';
    for (let ring = 0; ring < 6; ring++) {
      const rr = 30 + ring * 17, n = 12 + ring * 6;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + ring * 0.2;
        g.beginPath();
        g.arc(128 + Math.cos(a) * rr, 128 + Math.sin(a) * rr, 3 + ring * 0.6, 0, Math.PI * 2);
        g.fill();
      }
    }
  });
  const doilyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: lace, alphaTest: 0.5, roughness: 0.9, side: THREE.DoubleSide });

  // A piped rosette: a star-tip swirl (a lathe with ridges twisted up it).
  const rosette = lathe([[0, 0], [0.013, 0], [0.016, 0.006], [0.013, 0.013], [0.008, 0.019], [0.003, 0.025], [0, 0.028]], 16);
  {
    const p = rosette.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x);
      const k = 1 + 0.18 * Math.sin(a * 8 + y * 260);
      p.setXYZ(i, x * k, y, z * k);
    }
    rosette.computeVertexNormals();
  }
  const cream = new THREE.MeshStandardMaterial({ color: 0xfff6ea, roughness: 0.55 });

  // Strawberries: a seeded red cone, tip up, on green leaves.
  const berry = lathe([[0, 0], [0.012, 0.002], [0.017, 0.01], [0.015, 0.02], [0.009, 0.029], [0.003, 0.034], [0, 0.035]], 14);
  const seeds = canvasTexture(64, 64, (g) => {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#ffe28a';
    for (let y = 4; y < 64; y += 9) for (let x = (y % 18) / 2; x < 64; x += 9) g.fillRect(x, y, 2, 3);
  }, { repeat: [3, 2] });
  const berryMat = new THREE.MeshPhysicalMaterial({ color: 0xe8213f, map: seeds, roughness: 0.3, clearcoat: 0.7 });
  const leaf = new THREE.ConeGeometry(0.016, 0.006, 5).translate(0, 0.002, 0);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x3fa34d, roughness: 0.6, flatShading: true });

  // Cherries: a glossy ball and a curved stem.
  const cherry = new THREE.SphereGeometry(0.014, 14, 10).translate(0, 0.013, 0);
  const cherryMat = new THREE.MeshPhysicalMaterial({ color: 0xa3001c, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05 });
  const stem = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0.025, 0), new THREE.Vector3(0.004, 0.045, 0), new THREE.Vector3(0.014, 0.055, 0)), 8, 0.0012, 4);
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x4d6b23, roughness: 0.7 });

  // Macarons: two shells and a filling, standing on edge; each its own pastel (instance colour).
  const shellA = new THREE.SphereGeometry(0.018, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.5, 1);
  const shellB = shellA.clone().rotateX(Math.PI);
  const macaron = mergeGeometries([shellA.translate(0, 0.004, 0), shellB.translate(0, -0.004, 0), new THREE.CylinderGeometry(0.017, 0.017, 0.006, 16)].map((g) => g.toNonIndexed()));
  const macaronMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });

  // Sprinkles: little capsules, every colour.
  const sprinkle = new THREE.CapsuleGeometry(0.0026, 0.009, 2, 5);
  const sprinkleMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });

  // Stars and hearts: puffy extruded shapes.
  const starShape = new THREE.Shape();
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2, rr = i % 2 ? 0.01 : 0.024;
    i ? starShape.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : starShape.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  const extrude = { depth: 0.004, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 2, curveSegments: 10 };
  const star = new THREE.ExtrudeGeometry(starShape, extrude).translate(0, 0.024, -0.002);
  const starMat = new THREE.MeshStandardMaterial({ color: 0xffd36b, roughness: 0.2, metalness: 0.7, emissive: 0xffb83a, emissiveIntensity: 0.35 });
  const heartShape = new THREE.Shape();
  heartShape.moveTo(0, -0.02);
  heartShape.bezierCurveTo(-0.004, -0.014, -0.024, -0.004, -0.022, 0.008);
  heartShape.bezierCurveTo(-0.02, 0.02, -0.004, 0.022, 0, 0.01);
  heartShape.bezierCurveTo(0.004, 0.022, 0.02, 0.02, 0.022, 0.008);
  heartShape.bezierCurveTo(0.024, -0.004, 0.004, -0.014, 0, -0.02);
  const heart = new THREE.ExtrudeGeometry(heartShape, extrude).translate(0, 0.022, -0.002);
  const heartMat = new THREE.MeshPhysicalMaterial({ color: 0xff4f8b, roughness: 0.25, clearcoat: 0.8 });
  const pick = new THREE.CylinderGeometry(0.0012, 0.0012, 0.03, 4).translate(0, 0.005, 0);
  const pickMat = new THREE.MeshStandardMaterial({ color: 0xfff0d0, roughness: 0.6 });

  // Flowers: five round petals and a yellow heart.
  const petals = mergeGeometries([0, 1, 2, 3, 4].map((k) => new THREE.SphereGeometry(0.008, 8, 6).scale(1, 0.35, 0.65).translate(0.009, 0, 0).rotateY((k / 5) * Math.PI * 2).toNonIndexed()));
  const petalMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
  const centre = new THREE.SphereGeometry(0.005, 8, 6).scale(1, 0.6, 1).translate(0, 0.002, 0);
  const centreMat = new THREE.MeshStandardMaterial({ color: 0xffc928, roughness: 0.5 });

  // Candles: a striped stick, a wick, and a flame that glows.
  const stripes = canvasTexture(32, 64, (g) => {
    g.fillStyle = '#fff4fb';
    g.fillRect(0, 0, 32, 64);
    g.strokeStyle = '#ff7fb0';
    g.lineWidth = 6;
    for (let y = -64; y < 128; y += 16) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(32, y + 24);
      g.stroke();
    }
  });
  const candle = new THREE.CylinderGeometry(0.0055, 0.0055, 0.075, 10).translate(0, 0.0375, 0);
  const candleMat = new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.5 });
  const wick = new THREE.CylinderGeometry(0.0008, 0.0008, 0.008, 4).translate(0, 0.079, 0);
  const wickMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
  const flame = new THREE.SphereGeometry(0.006, 10, 8).scale(1, 2.1, 1).translate(0, 0.011, 0);
  const flameMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.6, 0.55) });

  const all = { stand, rim, band, knot, doily, rosette, berry, leaf, cherry, stem, macaron, sprinkle, star, heart, pick, petals, centre, candle, wick, flame };
  const mats = { porcelain, gold, doilyMat, cream, berryMat, leafMat, cherryMat, stemMat, macaronMat, sprinkleMat, starMat, heartMat, pickMat, petalMat, centreMat, candleMat, wickMat, flameMat };
  Object.values(all).forEach(mark);
  Object.values(mats).forEach(mark);
  SHARED = { ...all, ...mats };
  return SHARED;
}

// The sponge's side: crumb, and a cream (and jam) layer through the middle.
const spongeTextures = new Map();
function spongeTexture(sp) {
  if (spongeTextures.has(sp.id)) return spongeTextures.get(sp.id);
  const r = rng(hash(sp.id));
  const t = canvasTexture(256, 128, (g, w, h) => {
    g.fillStyle = sp.color;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(80,40,10,0.12)';
      g.beginPath();
      g.arc(r() * w, r() * h, 1 + r() * 2.5, 0, Math.PI * 2);
      g.fill();
    }
    // The filling, wavy.
    const band = (y, th, col) => {
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(0, y);
      // Waves that repeat exactly across the width, so the texture has no seam.
      for (let x = 0; x <= w; x += 8) g.lineTo(x, y + Math.sin((x / w) * Math.PI * 6) * 2);
      for (let x = w; x >= 0; x -= 8) g.lineTo(x, y + th + Math.sin((x / w) * Math.PI * 4 + 1) * 2);
      g.fill();
    };
    band(h * 0.47, h * 0.08, sp.id === 'chocolate' ? '#f4e2cf' : '#fff6ea');
    if (sp.id === 'strawberry' || sp.id === 'vanilla') band(h * 0.55, h * 0.035, '#d8344f');
    if (sp.id === 'blueberry') band(h * 0.55, h * 0.035, '#4b2a8a');
  }, { repeat: [3, 1] });
  t.userData.shared = true;
  spongeTextures.set(sp.id, t);
  return t;
}

// The icing's drip skirt round a tier of radius R whose top is at y = top: a band that hangs down by a length that
// changes round the cake, rounded drops at the long ends.
function dripSkirt(R, top, r) {
  const N = 360;
  const drips = [];
  const count = 9 + Math.floor(R * 40);
  for (let k = 0; k < count; k++) drips.push({ a: ((k + r() * 0.6) / count) * Math.PI * 2, len: 0.016 + r() * 0.05, w: (0.016 + r() * 0.012) / R });
  const len = (a) => {
    let L = 0.012;
    for (const d of drips) {
      let da = Math.abs(((a - d.a + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      // A rounded drop: steep sides, a round bottom (a half ellipse), eased into the band above.
      if (da < d.w) {
        const u = da / d.w;
        L = Math.max(L, 0.012 + d.len * Math.sqrt(Math.max(0, 1 - u * u * u * u)));
      }
    }
    return L;
  };
  // Rows down the skirt: the rounded lip, the side, and the drop's round bottom.
  const rows = [[0.004, 0.008], [0.008, 0], [0.007, -1], [0.0035, -1.06], [0.0, -1.08]];
  const pos = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2, L = len(a);
    for (const [dr, dy] of rows) {
      const y = dy > 0 ? top + dy : dy === 0 ? top : top + dy * L;
      pos.push(Math.cos(a) * (R + dr), y, Math.sin(a) * (R + dr));
    }
  }
  const per = rows.length;
  for (let i = 0; i < N; i++)
    for (let j = 0; j < per - 1; j++) {
      const a = i * per + j, b = (i + 1) * per + j;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // A drop at the end of each long drip.
  const tips = drips.filter((d) => d.len > 0.03).map((d) => ({ a: d.a, y: top - len(d.a) + 0.001 }));
  return { geometry: g, tips };
}

// Instanced placements, collected and then made into one InstancedMesh per piece.
function placer() {
  const lists = new Map();
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), v = new THREE.Vector3();
  return {
    add(key, x, y, z, ry = 0, scale = 1, rx = 0, rz = 0, color = null) {
      if (!lists.has(key)) lists.set(key, []);
      e.set(rx, ry, rz, 'YXZ');
      lists.get(key).push({ mat: m.compose(v.set(x, y, z), q.setFromEuler(e), s.setScalar(scale)).clone(), color });
    },
    build(group, S) {
      for (const [key, items] of lists) {
        const [geo, mat] = key.split(':');
        const mesh = new THREE.InstancedMesh(S[geo], S[mat], items.length);
        items.forEach((it, i) => {
          mesh.setMatrixAt(i, it.mat);
          if (it.color) mesh.setColorAt(i, it.color);
        });
        mesh.castShadow = true;
        mesh.userData.instances = true;
        mesh.name = geo;
        group.add(mesh);
      }
    }
  };
}

export function makeCake(recipe = {}) {
  const S = shared();
  const sp = byId(CAKE_OPTIONS.sponge, recipe.sponge);
  const ic = byId(CAKE_OPTIONS.icing, recipe.icing);
  const tiers = Math.max(1, Math.min(3, recipe.tiers | 0 || 1));
  const tops = new Set(recipe.toppings ?? []);
  const r = rng(hash(JSON.stringify([sp.id, ic.id, tiers, [...tops].sort()])));

  const group = new THREE.Group();
  group.name = 'cake';
  const standMesh = new THREE.Mesh(S.stand, S.porcelain);
  standMesh.castShadow = true;
  group.add(standMesh, new THREE.Mesh(S.rim, S.gold), new THREE.Mesh(S.band, S.gold), new THREE.Mesh(S.knot, S.gold), new THREE.Mesh(S.doily, S.doilyMat));

  // This cake's own materials.
  const icingMat = new THREE.MeshPhysicalMaterial({ color: ic.color, roughness: ic.id === 'chocolate' ? 0.18 : 0.3, clearcoat: 0.7, clearcoatRoughness: 0.18 });
  const spongeMat = new THREE.MeshStandardMaterial({ map: spongeTexture(sp), roughness: 0.95 });
  // Piping a shade lighter than the icing (white on chocolate), so the border reads.
  const pipeColor = ic.id === 'chocolate' ? new THREE.Color('#fff2e2') : new THREE.Color(ic.color).lerp(new THREE.Color('#ffffff'), 0.55);
  const pipeMat = new THREE.MeshStandardMaterial({ color: pipeColor, roughness: 0.5 });
  const P = placer();
  const local = { ...S, icingMat, pipeMat };

  const PASTELS = ['#ffb3cf', '#b8f0d8', '#d9c2ff', '#fff1a8', '#ffd0a8', '#a8dcff'].map((c) => new THREE.Color(c));
  const RAINBOW = ['#ff5f8f', '#ffd23f', '#5fd6ff', '#9b7bff', '#7bf0a2', '#ffffff', '#ff9a3c'].map((c) => new THREE.Color(c));
  const FLOWER = ['#ffffff', '#ffc0dc', '#ffe3f0'].map((c) => new THREE.Color(c));
  const ring = RING.filter((t) => tops.has(t));
  const flames = [];

  let y = PLATE_Y;
  let R = BASE_R, H = BASE_H;
  const tierInfo = [];
  for (let t = 0; t < tiers; t++) {
    const top = y + H;
    const sponge = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 64, 1, true), spongeMat);
    sponge.position.y = y + H / 2;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.004, R + 0.004, 0.012, 64), icingMat);
    cap.position.y = top + 0.002;
    const { geometry, tips } = dripSkirt(R, top, r);
    const skirt = new THREE.Mesh(geometry, icingMat);
    for (const m of [sponge, cap, skirt]) (m.castShadow = true), (m.receiveShadow = true), group.add(m);
    for (const tip of tips) P.add('centre:icingMat', Math.cos(tip.a) * (R + 0.004), tip.y, Math.sin(tip.a) * (R + 0.004), 0, 1.25);
    tierInfo.push({ R, top });
    y = top + 0.006;
    R *= 0.7;
    H *= 0.9;
  }

  tierInfo.forEach(({ R, top }, t) => {
    const last = t === tiers - 1;
    const surface = top + 0.008;
    // Piping round the top edge, and round the base (on the plate, or on the tier below).
    const nTop = Math.floor((Math.PI * 2 * R) / 0.028);
    for (let k = 0; k < nTop; k++) {
      const a = (k / nTop) * Math.PI * 2;
      P.add('rosette:pipeMat', Math.cos(a) * (R - 0.012), surface - 0.004, Math.sin(a) * (R - 0.012), a * 3, 0.9);
    }
    const baseY = t === 0 ? PLATE_Y + 0.004 : tierInfo[t - 1].top + 0.004;
    const nBase = Math.floor((Math.PI * 2 * (R + 0.014)) / 0.03);
    for (let k = 0; k < nBase; k++) {
      const a = (k / nBase) * Math.PI * 2 + 0.1;
      P.add('rosette:pipeMat', Math.cos(a) * (R + 0.012), baseY, Math.sin(a) * (R + 0.012), a * 5, 1.05);
    }
    // The ring of fruit, macarons or flowers: on the top tier, inside its piping; on a lower one, on the ledge
    // between its piping and the next tier.
    const inner = last ? 0 : tierInfo[t + 1].R;
    const ringR = last ? R * 0.66 : (R - 0.012 + inner + 0.014) / 2;
    const scale = last ? 1 : 0.8;
    if (ring.length) {
      const n = Math.max(5, Math.floor((Math.PI * 2 * ringR) / (last ? 0.05 : 0.045)));
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + t * 0.3;
        const kind = ring[k % ring.length];
        const x = Math.cos(a) * ringR, z = Math.sin(a) * ringR;
        if (kind === 'strawberries') {
          P.add('leaf:leafMat', x, surface, z, r() * 3, scale);
          P.add('berry:berryMat', x, surface + 0.002, z, r() * 3, scale, (r() - 0.5) * 0.3, (r() - 0.5) * 0.3);
        } else if (kind === 'cherries') {
          P.add('cherry:cherryMat', x, surface, z, a, scale);
          P.add('stem:stemMat', x, surface, z, -a + Math.PI / 2, scale);
        } else if (kind === 'macarons') {
          // On edge, facing out, leaning back a little.
          P.add('macaron:macaronMat', x, surface + 0.017 * scale, z, -a, scale, 0, Math.PI / 2 - 0.25, PASTELS[(k + t) % PASTELS.length]);
        } else {
          P.add('petals:petalMat', x, surface + 0.003, z, r() * 3, scale * 1.45, (r() - 0.5) * 0.2, (r() - 0.5) * 0.2, FLOWER[k % FLOWER.length]);
          P.add('centre:centreMat', x, surface + 0.004, z, 0, scale * 1.45);
        }
      }
    }
    // Sprinkles on every top, inside the ring.
    if (tops.has('sprinkles')) {
      const area = last ? ringR - 0.02 : R - 0.02;
      const n = last ? 110 : 60;
      for (let k = 0; k < n; k++) {
        const a = r() * Math.PI * 2, d = last ? Math.sqrt(r()) * area : inner + 0.02 + r() * (R - inner - 0.04);
        P.add('sprinkle:sprinkleMat', Math.cos(a) * d, surface - 0.002, Math.sin(a) * d, r() * 6, 1, Math.PI / 2, 0, RAINBOW[k % RAINBOW.length]);
      }
    }
    if (!last) return;
    // The top's crown: candles in a little circle, then stars and hearts on picks standing among them.
    const crown = [];
    if (tops.has('candles')) {
      const n = R > 0.12 ? 5 : R > 0.08 ? 3 : 1;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + 0.4, d = n === 1 ? 0 : R * 0.32;
        const x = Math.cos(a) * d, z = Math.sin(a) * d;
        P.add('candle:candleMat', x, surface, z);
        P.add('wick:wickMat', x, surface, z);
        crown.push(a);
        flames.push(new THREE.Vector3(x, surface + 0.08, z));
      }
    }
    const shapes = ['stars', 'hearts'].filter((s) => tops.has(s));
    if (shapes.length) {
      const n = crown.length ? 2 * shapes.length : 1 + 2 * shapes.length;
      for (let k = 0; k < n; k++) {
        const kind = shapes[k % shapes.length];
        const a = (k / n) * Math.PI * 2 + (crown.length ? 0.4 + Math.PI / 5 : 0);
        const d = !crown.length && k === 0 ? 0 : R * (crown.length ? 0.4 : 0.38);
        const big = !crown.length && k === 0 ? 1.5 : 1.05;
        const x = Math.cos(a) * d, z = Math.sin(a) * d;
        // Facing out from the middle (the one in the middle faces the front).
        const face = d === 0 ? 0 : Math.PI / 2 - a;
        P.add('pick:pickMat', x, surface, z, 0, big);
        P.add(kind === 'stars' ? 'star:starMat' : 'heart:heartMat', x, surface + 0.012 * big, z, face, big, -0.1, (r() - 0.5) * 0.25);
      }
    }
    // Nothing on top at all: a single big strawberry or rosette, so the top is never bare.
    if (!crown.length && !shapes.length && !ring.length) P.add('rosette:pipeMat', 0, surface - 0.004, 0, 0, 1.8);
  });

  P.build(group, local);
  // The flames: their own meshes so each flickers on its own.
  const flameMeshes = flames.map((p, i) => {
    const f = new THREE.Mesh(S.flame, S.flameMat);
    f.position.copy(p);
    f.userData.phase = i * 1.7;
    group.add(f);
    return f;
  });
  let time = 0;
  group.userData.update = (dt) => {
    time += dt;
    for (const f of flameMeshes) {
      const k = 1 + Math.sin(time * 17 + f.userData.phase) * 0.08 + Math.sin(time * 7.3 + f.userData.phase * 2) * 0.06;
      f.scale.set(1 / Math.sqrt(k), k, 1 / Math.sqrt(k));
      f.rotation.z = Math.sin(time * 3 + f.userData.phase) * 0.12;
    }
  };
  group.userData.recipe = { sponge: sp.id, tiers, icing: ic.id, toppings: [...tops] };
  group.userData.height = y + (tops.has('candles') ? 0.1 : tops.has('stars') || tops.has('hearts') ? 0.07 : 0.04);
  // Where a little candle light could go (the game may add one PointLight there; the cake adds none, for the tablet).
  group.userData.flames = flames;
  return group;
}

// Frees what this cake made for itself (its icing, sponge sides, drips and materials); the shared toppings stay.
export function disposeCake(group) {
  if (!group) return;
  group.removeFromParent();
  const seen = new Set();
  group.traverse((o) => {
    if (o.isInstancedMesh) o.dispose();
    for (const x of [o.geometry, ...[o.material ?? []].flat()]) {
      if (!x || x.userData?.shared || seen.has(x)) continue;
      seen.add(x);
      x.dispose?.();
    }
  });
}
