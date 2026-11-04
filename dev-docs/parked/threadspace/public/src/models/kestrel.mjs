// The Kestrel as a model (PLY-009): her named parts, the settings a person may change, and `build(values)`, which the
// game and the shipyard both call. What the shipyard shows is what the game flies.
//
// The rooms (interiors.mjs) are fixed in her frame: x ±8.1, y −2..1.1, z −33.5..34. Everything on her outside rides the
// hull it sits on (`top`, `belly`, `side` below), so when a person widens or flattens her, the spine, the turret, the
// plates and the name move with the skin instead of floating off it or sinking into it. Whether the rooms still fit
// inside is a check the shipyard runs on every change (`checks`), not a range that forbids trying.

import * as THREE from 'three';
import { box, cyl, at, glow, mulberry } from '../util.mjs';
import { loft, metal, shell, wing, engine, windows, halfWidthAt, base, DARK } from '../ships.mjs';
import { bake } from '../decor.mjs';

const BASE_W = 17; // the widest section at the hull's middle (z 0) as she was drawn
const BASE_H = 9.5;
const BASE_NOSE = 14; // from the bridge's front section (z −34) to the tip (z −48)

const P = (id, label, scope = 'hull') => ({ id, label, scope });

export const model = {
  id: 'kestrel',
  name: 'Kestrel',
  kind: 'frigate',
  parts: [
    P('hull', 'Hull'), P('bow', 'Bow deck'), P('glass', 'Bridge glass'), P('spine', 'Spine'), P('mast', 'Sensor mast'),
    P('keel', 'Keel'), P('prow', 'Prow'), P('wings', 'Wings'), P('nacelles', 'Wing nacelles'), P('drives', 'Main drives'),
    P('bay', 'Bay door'), P('airlock', 'Airlock door'), P('turret', 'Turret'), P('lights', 'Running lights'),
    P('windows', 'Windows'), P('greebles', 'Surface detail'), P('plates', 'Armour plates'), P('radiators', 'Radiators'),
    P('stripe', 'Livery stripe'), P('name', 'Name on the hull'),
    P('room-bridge', 'Bridge', 'interior'), P('room-corridor', 'Corridor', 'interior'), P('room-turret', 'Turret pod', 'interior'),
    P('room-airlock', 'Airlock', 'interior'), P('room-quarters', 'Your quarters', 'interior'), P('room-engine', 'Engine room', 'interior'),
    P('room-hold', 'Cargo hold', 'interior'), P('room-bay', 'Fighter bay', 'interior')
  ],
  groups: ['Paint', 'Hull', 'Wings', 'Drives', 'Turret', 'Detail', 'Lights', 'Inside', 'Bridge', 'Corridor', 'Turret pod', 'Airlock', 'Quarters', 'Engine room', 'Cargo hold', 'Fighter bay'],
  settings: {
    // --- paint
    paint: { type: 'color', label: 'Paint', default: '#9aa3ad', group: 'Paint', parts: ['hull', 'wings', 'nacelles'], help: 'The plated metal of her flanks, wings and nacelles. The paint shop in the game changes this too.' },
    topShade: { type: 'number', label: 'Top lighter by', default: 0.12, min: 0, max: 0.6, step: 0.01, group: 'Paint', parts: ['hull'], help: 'Her back, a shade of the paint: 0 is the paint itself.' },
    bellyShade: { type: 'number', label: 'Belly darker by', default: 0.32, min: 0, max: 0.8, step: 0.01, group: 'Paint', parts: ['hull'], help: 'Her underside, a shade of the paint: 0 is the paint itself.' },
    trim: { type: 'color', label: 'Trim', default: '#3a414d', group: 'Paint', parts: ['spine', 'keel', 'mast', 'turret', 'prow'] },
    plating: { type: 'number', label: 'Plate size', default: 12, min: 4, max: 30, step: 1, unit: 'm', group: 'Paint', parts: ['hull', 'wings'], help: 'How big the hull panels are: small plates read as a big ship.' },
    // --- hull
    beam: { type: 'number', label: 'Beam', default: BASE_W, min: 12, max: 26, step: 0.1, unit: 'm', group: 'Hull', parts: ['hull'], handle: { axis: 'x', value: (p) => Math.abs(p.x) * 2 }, help: 'Her width across the middle.' },
    height: { type: 'number', label: 'Height', default: BASE_H, min: 6, max: 14, step: 0.1, unit: 'm', group: 'Hull', parts: ['hull'], handle: { axis: 'y', value: (p) => (0.5 - p.y) * 2 } },
    noseLength: { type: 'number', label: 'Nose length', default: BASE_NOSE, min: 6, max: 30, step: 0.5, unit: 'm', group: 'Hull', parts: ['hull', 'bow', 'prow'], handle: { axis: 'z', value: (p) => -34 - p.z } },
    chamfer: { type: 'number', label: 'Corner cut', default: 0.32, min: 0.06, max: 0.5, step: 0.01, group: 'Hull', parts: ['hull'], help: 'Low is boxy, high is nearly round.' },
    spine: { type: 'bool', label: 'Spine', default: true, group: 'Hull', parts: ['spine'] },
    keel: { type: 'bool', label: 'Keel', default: true, group: 'Hull', parts: ['keel'] },
    mastHeight: { type: 'number', label: 'Mast height', default: 4, min: 0, max: 9, step: 0.1, unit: 'm', group: 'Hull', parts: ['mast'], handle: { axis: 'y', value: (p, v, u) => p.y - u.mastBase } },
    glassTint: { type: 'color', label: 'Bridge glass', default: '#0e1a2a', group: 'Hull', parts: ['glass'] },
    // --- wings
    wingSpan: { type: 'number', label: 'Wing tip', default: 17, min: 10, max: 32, step: 0.1, unit: 'm', group: 'Wings', parts: ['wings', 'nacelles'], handle: { axis: 'x', value: (p, v, u) => u.wingRootX + (Math.abs(p.x) - u.wingRootX) / Math.cos((v.dihedral * Math.PI) / 180) }, help: 'How far out from her centreline each wing reaches.' },
    wingRoot: { type: 'number', label: 'Root chord', default: 18, min: 8, max: 28, step: 0.5, unit: 'm', group: 'Wings', parts: ['wings'] },
    wingTip: { type: 'number', label: 'Tip chord', default: 8, min: 2, max: 16, step: 0.5, unit: 'm', group: 'Wings', parts: ['wings'] },
    sweep: { type: 'number', label: 'Sweep', default: 7, min: -6, max: 18, step: 0.5, unit: 'm', group: 'Wings', parts: ['wings'] },
    dihedral: { type: 'number', label: 'Dihedral', default: 0, min: -20, max: 20, step: 1, unit: '°', group: 'Wings', parts: ['wings', 'nacelles'] },
    wingZ: { type: 'number', label: 'Wing position', default: 13, min: 2, max: 22, step: 0.5, unit: 'm', group: 'Wings', parts: ['wings', 'nacelles'], help: 'Where along her the wings sit, aft of the middle.' },
    nacelles: { type: 'bool', label: 'Nacelles', default: true, group: 'Wings', parts: ['nacelles'] },
    nacelleLength: { type: 'number', label: 'Nacelle length', default: 19, min: 8, max: 30, step: 0.5, unit: 'm', group: 'Wings', parts: ['nacelles'] },
    nacelleSize: { type: 'number', label: 'Nacelle size', default: 3.4, min: 2, max: 5.5, step: 0.1, unit: 'm', group: 'Wings', parts: ['nacelles'] },
    // --- drives
    engineGlow: { type: 'color', label: 'Drive glow', default: '#58b0ff', group: 'Drives', parts: ['drives', 'nacelles'], help: 'The game’s engine colour changes this too.' },
    drives: { type: 'int', label: 'Main drives', default: 2, min: 2, max: 4, group: 'Drives', parts: ['drives'], help: '2 either side of the bay; 3 adds one above it; 4 adds two.' },
    driveSize: { type: 'number', label: 'Drive size', default: 1.9, min: 1.2, max: 2.8, step: 0.1, unit: 'm', group: 'Drives', parts: ['drives'] },
    plume: { type: 'number', label: 'Plume length', default: 6, min: 2, max: 14, step: 0.5, unit: '×', group: 'Drives', parts: ['drives', 'nacelles'], help: 'At full throttle, in drive radii.' },
    // --- turret
    turretZ: { type: 'number', label: 'Turret position', default: -8, min: -18, max: 10, step: 0.5, unit: 'm', group: 'Turret', parts: ['turret'], handle: { axis: 'z', value: (p) => p.z } },
    barrels: { type: 'int', label: 'Barrels', default: 2, min: 1, max: 3, group: 'Turret', parts: ['turret'] },
    barrelLength: { type: 'number', label: 'Barrel length', default: 4.2, min: 2, max: 8, step: 0.1, unit: 'm', group: 'Turret', parts: ['turret'] },
    // --- detail: what makes her read as a ship and not a shape
    greebles: { type: 'number', label: 'Surface detail', default: 0.55, min: 0, max: 1, step: 0.05, group: 'Detail', parts: ['greebles'], help: 'Vents, hatches, domes and antennas over her skin. 0 is none.' },
    detailSeed: { type: 'int', label: 'Detail layout', default: 7, min: 1, max: 99, group: 'Detail', parts: ['greebles'], help: 'A different arrangement of the same amount of detail.' },
    plates: { type: 'bool', label: 'Armour plates', default: true, group: 'Detail', parts: ['plates'] },
    plateColor: { type: 'color', label: 'Plate colour', default: '#626a75', group: 'Detail', parts: ['plates'] },
    radiators: { type: 'bool', label: 'Radiators', default: true, group: 'Detail', parts: ['radiators'] },
    radiatorColor: { type: 'color', label: 'Radiator colour', default: '#b8693a', group: 'Detail', parts: ['radiators'] },
    stripe: { type: 'bool', label: 'Livery stripe', default: true, group: 'Detail', parts: ['stripe'] },
    stripeColor: { type: 'color', label: 'Stripe colour', default: '#d08a2a', group: 'Detail', parts: ['stripe'] },
    name: { type: 'text', label: 'Name on the hull', default: 'KESTREL', max: 14, group: 'Detail', parts: ['name'] },
    nameColor: { type: 'color', label: 'Name colour', default: '#e9e4d6', group: 'Detail', parts: ['name'] },
    // --- lights
    windowRows: { type: 'int', label: 'Window rows', default: 1, min: 0, max: 3, group: 'Lights', parts: ['windows'] },
    windowColor: { type: 'color', label: 'Window light', default: '#ffd9a0', group: 'Lights', parts: ['windows'] },
    windowsLit: { type: 'number', label: 'Windows lit', default: 0.8, min: 0, max: 1, step: 0.05, group: 'Lights', parts: ['windows'] },
    navLights: { type: 'bool', label: 'Running lights', default: true, group: 'Lights', parts: ['lights'] },
    // --- inside: the whole ship, then each room
    insideTrim: { type: 'color', label: 'Trim and skirting', default: '#2b3038', group: 'Inside', scope: 'interior', parts: ['room-corridor', 'room-turret', 'room-airlock', 'room-quarters', 'room-engine', 'room-hold', 'room-bay'] },
    lightLevel: { type: 'number', label: 'Brightness', default: 1, min: 0.3, max: 2, step: 0.05, unit: '×', group: 'Inside', scope: 'interior', parts: ['room-bridge', 'room-corridor', 'room-hold', 'room-bay'] },
    strips: { type: 'bool', label: 'Floor light strips', default: true, group: 'Inside', scope: 'interior', parts: ['room-bridge', 'room-corridor', 'room-hold', 'room-bay'] },
    ribs: { type: 'bool', label: 'Ceiling ribs', default: true, group: 'Inside', scope: 'interior', parts: ['room-bridge', 'room-corridor', 'room-hold', 'room-bay'] },
    ...rooms({
      bridge: ['Bridge', '#7f8ea3', '#4f5866', '#58b0ff', '#dbe9ff'],
      corridor: ['Corridor', '#8d96a3', '#5f666f', '#ffb347', '#ffe6c4'],
      turret: ['Turret pod', '#9a8a86', '#5f666f', '#ff5540', '#ffd0c0'],
      airlock: ['Airlock', '#8a8a7a', '#5f666f', '#ffb347', '#ffd0a0'],
      quarters: ['Quarters', '#9a8fa8', '#5a5560', '#d8b4ff', '#ffd6e0'],
      engine: ['Engine room', '#7a8a7e', '#4e5850', '#39d27a', '#c8ffe0'],
      hold: ['Cargo hold', '#8e8676', '#5c5a52', '#ffb347', '#ffe6c4'],
      bay: ['Fighter bay', '#6f7884', '#4a4f57', '#58b0ff', '#dbe9ff']
    })
  }
};

/** Four settings per room: its walls, its deck, its accent (the light strip at the foot of the walls), its lamps. */
function rooms(list) {
  const out = {};
  for (const [id, [group, wall, floor, accent, light]] of Object.entries(list)) {
    const parts = [`room-${id}`];
    out[`${id}Wall`] = { type: 'color', label: 'Walls', default: wall, group, scope: 'interior', parts };
    out[`${id}Floor`] = { type: 'color', label: 'Deck', default: floor, group, scope: 'interior', parts };
    out[`${id}Accent`] = { type: 'color', label: 'Accent strip', default: accent, group, scope: 'interior', parts };
    out[`${id}Light`] = { type: 'color', label: 'Lamps', default: light, group, scope: 'interior', parts };
  }
  return out;
}

// --- the shape -----------------------------------------------------------------------------------------------------

/** Her hull's sections for these values: the drawn sections, widened, heightened and with the nose drawn out. */
export function hullSections(v) {
  const kw = v.beam / BASE_W, kh = v.height / BASE_H, kn = v.noseLength / BASE_NOSE;
  return [
    { z: -34 - BASE_NOSE * kn, w: 3 * kw, h: 2 * kh, y: -1.3 },
    { z: -34 - 6 * kn, w: 9 * kw, h: 5 * kh, y: -0.5 },
    { z: -34, w: 12 * kw, h: 7 * kh, y: 0 },
    { z: -20, w: 15 * kw, h: 9 * kh, y: 0.5 },
    { z: 0, w: 17 * kw, h: 9.5 * kh, y: 0.5 },
    { z: 20, w: 18 * kw, h: 9 * kh, y: 0.3 },
    { z: 36, w: 17 * kw, h: 8 * kh, y: 0 }
  ].map((s) => ({ ...s, c: v.chamfer }));
}

/** The section at any z, interpolated: { w, h, y, c }. */
export function sectionAt(S, z) {
  if (z <= S[0].z) return { ...S[0] };
  for (let i = 0; i < S.length - 1; i++) {
    const a = S[i], b = S[i + 1];
    if (z <= b.z) {
      const t = (z - a.z) / (b.z - a.z);
      return { z, w: a.w + t * (b.w - a.w), h: a.h + t * (b.h - a.h), y: a.y + t * (b.y - a.y), c: a.c };
    }
  }
  return { ...S[S.length - 1] };
}
const topAt = (S, z) => {
  const s = sectionAt(S, z);
  return s.y + s.h / 2;
};
const bellyAt = (S, z) => {
  const s = sectionAt(S, z);
  return s.y - s.h / 2;
};
/** The flat top's half-width and the flat side's half-height at z: where a thing can sit flush. */
function flats(S, z) {
  const s = sectionAt(S, z);
  const a = s.w / 2, b = s.h / 2, c = Math.min(a, b) * s.c;
  return { a, b, c, y: s.y, topHalf: a - c, sideHalf: b - c };
}
/** Is a point inside the hull (its octagon at that z), with `margin` to spare? How far outside it is, if not. */
export function outside(S, x, y, z, margin = 0) {
  if (z < S[0].z + margin || z > S[S.length - 1].z - margin) return Math.max(S[0].z - z, z - S[S.length - 1].z) + margin;
  const { a, b, c, y: cy } = flats(S, z);
  const dx = Math.abs(x), dy = Math.abs(y - cy);
  return Math.max(dx - a, dy - b, (dx + dy - (a + b - c)) / Math.SQRT2) + margin; // > 0 is outside, by that much
}

/** The drawn hull's top and belly, so a part drawn at height y over the old hull keeps its height over the new one. */
const DRAWN = hullSections({ beam: BASE_W, height: BASE_H, noseLength: BASE_NOSE, chamfer: 0.32 });
const shade = (hex, k) => '#' + new THREE.Color(hex).lerp(new THREE.Color(k > 0 ? '#ffffff' : '#000000'), Math.abs(k)).getHexString();

function part(root, id) {
  const g = new THREE.Group();
  g.name = id;
  g.userData.part = id;
  root.add(g);
  return g;
}

/** The bay's mouth in her stern: the Wren, wings folded, through it. */
export const BAY_MOUTH = { x0: -4, x1: 4, y0: -2.2, y1: 1.6 };

/** The stern's octagon as a flat plate facing aft, with `hole` cut out of it. */
function sternPlate(sec, hole, material, uv) {
  const a = sec.w / 2, b = sec.h / 2, c = Math.min(a, b) * (sec.c ?? 0.32), x = sec.x ?? 0, y = sec.y ?? 0;
  const shape = new THREE.Shape([[a, b - c], [a - c, b], [-(a - c), b], [-a, b - c], [-a, -(b - c)], [-(a - c), -b], [a - c, -b], [a, -(b - c)]].map(([px, py]) => new THREE.Vector2(x + px, y + py)));
  shape.holes.push(new THREE.Path([[hole.x0, hole.y0], [hole.x0, hole.y1], [hole.x1, hole.y1], [hole.x1, hole.y0]].map(([px, py]) => new THREE.Vector2(px, py))));
  const geo = new THREE.ShapeGeometry(shape);
  const t = geo.attributes.uv;
  for (let i = 0; i < t.count; i++) t.setXY(i, t.getX(i) / uv, t.getY(i) / uv);
  const m = new THREE.Mesh(geo, material);
  m.position.z = sec.z;
  return m;
}

/** The bay's door: 0 shut, 1 open. */
export function setBayDoor(obj, k) {
  for (const l of obj.userData.bayDoors ?? []) l.position.y = l.userData.home + l.userData.travel * k;
}

/** The airlock's hull door: 0 shut, 1 slid forward and open. */
export function setAirlockDoor(obj, k) {
  const h = obj.userData.airlockDoor;
  if (h) h.position.z = h.userData.home - 2.4 * k;
}

/** Builds her. Returns a Group whose children are the declared parts, named, with the places the game needs in userData. */
export function build(v) {
  const root = base(v.engineGlow);
  root.name = model.name;
  const u = root.userData;
  const { engMat, plumeMat } = u;
  const hullMat = metal(v.paint);
  const topMat = metal(shade(v.paint, v.topShade));
  const bellyMat = metal(shade(v.paint, -v.bellyShade));
  const trimMat = new THREE.MeshStandardMaterial({ color: v.trim, roughness: 0.5, metalness: 0.5, flatShading: true });
  const glassMat = new THREE.MeshStandardMaterial({ color: v.glassTint, roughness: 0.12, metalness: 0.9, emissive: shade(v.glassTint, -0.3), flatShading: true });
  u.hullMat = hullMat;
  /** The paint shop's repaint: the flanks take the colour, the top and belly their shades of it. */
  u.repaint = (c) => {
    hullMat.color.set(c);
    topMat.color.set(shade(c, v.topShade));
    bellyMat.color.set(shade(c, -v.bellyShade));
  };
  const S = hullSections(v);
  u.sections = S;
  u.handles = {};
  const top = (z, y) => topAt(S, z) + (y - topAt(DRAWN, z)); // y was drawn over the old hull's top at z
  const belly = (z, y) => bellyAt(S, z) + (y - bellyAt(DRAWN, z));
  const sideX = (z) => halfWidthAt(S, z);
  const nz = (z) => -34 + (z + 34) * (v.noseLength / BASE_NOSE); // a z drawn on the nose, drawn out with it
  const kw = v.beam / BASE_W, kh = v.height / BASE_H;
  const nav = (color, o = 1) => glow(color, o);

  // --- the hull: three tones in one shell mesh (top, flanks, belly)
  const hull = part(root, 'hull');
  // Her stern is a plate with the bay's mouth cut in it (s6: the Wren flies out of it and back in), not the loft's cap.
  hull.add(shell(loft(S, [hullMat, bellyMat, topMat], { uv: v.plating, faces: [2, 2, 2, 0, 1, 1, 1, 0], cap: 0, ends: [true, false] })));
  hull.add(shell(sternPlate(S[S.length - 1], BAY_MOUTH, hullMat, v.plating)));
  u.handles.beam = new THREE.Vector3(-sideX(0), 0.5, 0);
  u.handles.height = new THREE.Vector3(0, bellyAt(S, 0), 0);

  // --- the bow as the bridge sees it: inside the shell, hidden by it from outside (s4, TS-S4-NOSE)
  const bow = part(root, 'bow');
  const deck = [
    { z: nz(-47.8), w: 2.4 * kw, h: 0.85 * kh, y: -1.3 + (-1.725 + 1.3) * kh },
    { z: nz(-40), w: 7.4 * kw, h: 1.5 * kh, y: -0.5 + (-2.15 + 0.5) * kh },
    { z: -33.65, w: 10.6 * kw, h: 2.25 * kh, y: -2.175 * kh }
  ].map((s) => ({ ...s, c: 0.32 }));
  bow.add(loft(deck, topMat, { uv: v.plating }));
  const lights = part(root, 'lights');
  lights.visible = v.navLights;
  for (const z of [-36, -40, -44].map(nz)) lights.add(at(box(0.4, 0.05, 0.4, nav('#ff5540', 0.9)), 0, topAt(deck, z) + 0.03, z));

  // --- the bridge's glass, round the bow's brow over the room's window line
  const glass = part(root, 'glass');
  glass.add(at(loft([{ z: -36, w: 8.4 * kw, h: 1.4, c: 0.4 }, { z: -27, w: 10.6 * kw, h: 1.8, c: 0.4 }], glassMat, { uv: 4 }), 0, 2.9 * kh, 0));

  // --- the spine, the mast, the keel, the prow
  const spine = part(root, 'spine');
  spine.visible = v.spine;
  spine.add(loft([{ z: -18, w: 2, h: 1, y: top(-18, 5.2) }, { z: -12, w: 5, h: 1.8, y: top(-12, 5.4) }, { z: 14, w: 5, h: 1.8, y: top(14, 5.1) }, { z: 26, w: 2.4, h: 1, y: top(26, 4.4) }], trimMat, { uv: 6 }));
  const lift = v.spine ? 0 : -0.9; // without the spine, what stood on it stands on the hull
  const mast = part(root, 'mast');
  mast.visible = v.mastHeight > 0.05;
  const mh = Math.max(0.1, v.mastHeight);
  const mb = top(8, 6) + lift; // the mast's foot
  u.mastBase = mb;
  mast.add(loft([{ z: 4, w: 0.6, h: 0.6, y: mb + 0.5 }, { z: 6, w: 1.2, h: mh, y: mb + mh / 2 }, { z: 10, w: 1.2, h: mh * 0.75, y: mb + (mh * 0.75) / 2 - 0.1 }, { z: 12, w: 0.6, h: 0.6, y: mb + 0.5 }], trimMat, { uv: 4 }));
  mast.add(at(box(0.15, 3, 0.15, DARK), 0, mb + mh + 1, 8));
  u.handles.mastHeight = new THREE.Vector3(0, mb + mh, 7);
  const keel = part(root, 'keel');
  keel.visible = v.keel;
  keel.add(loft([{ z: -30, w: 1, h: 0.6, y: belly(-30, -4.1) }, { z: -20, w: 4, h: 1.4, y: belly(-20, -4.4) }, { z: 26, w: 4, h: 1.4, y: belly(26, -4.6) }, { z: 34, w: 2, h: 0.8, y: belly(34, -4.3) }], trimMat, { uv: 6 }));
  const prow = part(root, 'prow');
  const tip = S[0];
  const py = tip.y - 0.45 * kh;
  prow.add(at(cyl(0.12, 0.5, 6, trimMat, 6), 0, py, tip.z - 2.5, -Math.PI / 2));
  lights.add(at(box(0.4, 0.4, 0.6, nav('#ff5540')), 0, py, tip.z - 5.6)); // the running light on the nose
  u.handles.noseLength = new THREE.Vector3(0, tip.y, tip.z);

  // --- the wings and their nacelles
  const wings = part(root, 'wings');
  const nacelles = part(root, 'nacelles');
  nacelles.visible = v.nacelles;
  const rootX = sideX(v.wingZ) - 0.6;
  const tipX = Math.max(v.wingSpan, rootX + 2);
  const span = tipX - rootX;
  const dih = (v.dihedral * Math.PI) / 180;
  const wingY = -1.2;
  const nx = rootX + span * Math.cos(dih) - 0.5, ny = wingY + 0.2 + span * Math.sin(dih);
  const n0 = v.wingZ - 9, n1 = n0 + v.nacelleLength, ns = v.nacelleSize;
  for (const s of [-1, 1]) {
    wings.add(wing(s * rootX, s * tipX, v.wingRoot, v.wingTip, v.sweep, 1.3, hullMat, { y: wingY, z: v.wingZ, dihedral: dih }));
    nacelles.add(loft([{ z: n0, w: ns * 0.65, h: ns * 0.65, x: s * nx, y: ny }, { z: n0 + 3, w: ns, h: ns, x: s * nx, y: ny }, { z: n1 - 2, w: ns, h: ns, x: s * nx, y: ny }, { z: n1, w: ns * 0.82, h: ns * 0.82, x: s * nx, y: ny }], hullMat, { uv: 6 }));
    // Wingtip lights on the nacelle's outer side, or on the tip itself (s4 had them floating 3 m beyond it).
    const lx = v.nacelles ? nx + ns / 2 + 0.25 : rootX + span * Math.cos(dih) + 0.25;
    lights.add(at(box(0.5, 0.5, 0.5, nav(s > 0 ? '#39d27a' : '#ff5540')), s * lx, v.nacelles ? ny : wingY + span * Math.sin(dih), v.nacelles ? n0 + 5 : v.wingZ + v.sweep + 2));
  }
  u.wingRootX = rootX;
  u.handles.wingSpan = new THREE.Vector3(rootX + span * Math.cos(dih), wingY + span * Math.sin(dih), v.wingZ + v.sweep);
  // The nacelles' drives belong to the nacelles, so hiding the nacelles hides their plumes. `engine` files each halo and
  // plume on the group it is given: hand every part the ship's own lists.
  nacelles.userData.halos = u.halos;
  nacelles.userData.plumes = u.plumes;
  for (const s of [-1, 1]) engine(nacelles, s * nx, ny, n1, ns * 0.35, engMat, plumeMat, { len: 0.8, plume: v.plume });

  // --- the main drives either side of the bay, and above it
  const drives = part(root, 'drives');
  drives.userData.halos = u.halos;
  drives.userData.plumes = u.plumes;
  const r = v.driveSize;
  const dx = Math.max(6, 4.25 + r);
  const sternTop = topAt(S, 36);
  const spots = [[-dx, 1.2, r], [dx, 1.2, r]];
  if (v.drives === 3) spots.push([0, Math.min(sternTop - r * 0.75, 2.2 + r * 0.7), r * 0.7]);
  if (v.drives === 4) for (const s of [-1, 1]) spots.push([s * 2.4, Math.min(sternTop - r * 0.65, 2.2 + r * 0.6), r * 0.6]);
  for (const [x, y, rr] of spots) engine(drives, x, y, 36, rr, engMat, plumeMat, { plume: v.plume });
  u.driveSpots = spots;

  // --- the bay door between the drives, ringed in amber; the port airlock's door, lit
  // s6: the door is two leaves just inside the mouth, the top one rising and the bottom one falling (u.bayDoors, 0 shut
  // to 1 open), and two lamps flash beside it while the bay is open or moving (u.bayLamps).
  const bay = part(root, 'bay');
  const M = BAY_MOUTH, mid = -0.6;
  u.bayDoors = [];
  for (const [y0, y1, dy] of [[mid, M.y1, M.y1 - mid + 0.1], [M.y0, mid, -(mid - M.y0) - 0.1]]) {
    const leaf = at(box(M.x1 - M.x0 + 0.3, y1 - y0, 0.18, DARK), 0, (y0 + y1) / 2, 35.86);
    leaf.add(at(box(M.x1 - M.x0 + 0.3, 0.16, 0.2, glow('#ffb347', 0.85)), 0, (dy > 0 ? -1 : 1) * ((y1 - y0) / 2 - 0.08), 0));
    leaf.userData.live = true;
    leaf.userData.home = leaf.position.y;
    leaf.userData.travel = dy;
    bay.add(leaf);
    u.bayDoors.push(leaf);
  }
  bay.add(at(box(M.x1 - M.x0 + 0.6, 0.18, 0.1, glow('#ffb347')), 0, M.y1 + 0.2, 36.06));
  for (const x of [M.x0 - 0.2, M.x1 + 0.2]) bay.add(at(box(0.18, M.y1 - M.y0, 0.1, glow('#ffb347', 0.85)), x, (M.y0 + M.y1) / 2, 36.06));
  u.bayLamps = [];
  for (const x of [M.x0 - 0.6, M.x1 + 0.6]) {
    const lamp = at(box(0.5, 0.5, 0.3, new THREE.MeshBasicMaterial({ color: '#3a2a14', toneMapped: false })), x, M.y1 + 0.4, 36.12);
    lamp.userData.live = true;
    bay.add(lamp);
    u.bayLamps.push(lamp);
  }
  // The airlock's hull door slides forward along her flank when the airlock has vented (u.airlockDoor, 0 to 1).
  const airlock = part(root, 'airlock');
  const side = -sideX(-6);
  const hatch = at(box(0.12, 2.6, 2.2, DARK), side - 0.04, -0.6, -6);
  hatch.userData.live = true;
  hatch.userData.home = hatch.position.z;
  airlock.add(hatch);
  u.airlockDoor = hatch;
  airlock.add(at(box(0.08, 0.2, 2.2, glow('#ffb347')), side - 0.08, 0.8, -6));

  // --- the turret on the spine: a yaw ring, a pitching block, its barrels
  const turretPart = part(root, 'turret');
  const turret = new THREE.Group();
  const yaw = new THREE.Group();
  yaw.add(at(cyl(2.2, 2.5, 1, DARK, 12), 0, 0.5, 0));
  const pitch = new THREE.Group();
  pitch.position.set(0, 1.4, 0);
  pitch.add(loft([{ z: -1.4, w: 2.2, h: 1, c: 0.4 }, { z: -0.6, w: 2.8, h: 1.5, c: 0.4 }, { z: 1.4, w: 2.8, h: 1.5, c: 0.4 }], trimMat, { uv: 3 }));
  const bx = { 1: [0], 2: [-0.7, 0.7], 3: [-0.9, 0, 0.9] }[v.barrels];
  const L = v.barrelLength;
  for (const x of bx) {
    pitch.add(at(cyl(0.2, 0.24, L, DARK, 8), x, 0.1, -1.1 - L / 2, Math.PI / 2));
    pitch.add(at(cyl(0.3, 0.3, 0.5, DARK, 8), x, 0.1, -1.1 - L + 0.2, Math.PI / 2));
  }
  yaw.add(pitch);
  turret.add(yaw);
  turret.position.set(0, top(v.turretZ, 6.2) + lift, v.turretZ);
  turretPart.add(turret);
  u.turret = { group: turret, yaw, pitch, tip: new THREE.Vector3(0, 0.1, -1.4 - L) };
  u.turretEye = new THREE.Vector3(0, 2.4, 2.6); // where the gunner's eyes are, in the pitch frame
  u.handles.turretZ = turret.position.clone().add(new THREE.Vector3(0, 0.5, 0));

  // --- windows down her flanks, in rows
  const win = part(root, 'windows');
  const rowsY = [0.2, 1.7, -1.3].slice(0, v.windowRows);
  for (const s of [-1, 1]) rowsY.forEach((y, i) => windows(win, S, s, y, -18, 14, { seed: (s > 0 ? 3 : 4) + i * 10, color: v.windowColor, lit: v.windowsLit }));

  // --- the detail
  const keepOut = []; // boxes the detail must not cover: {x0,x1,y0,y1,z0,z1}
  const no = (x0, x1, y0, y1, z0, z1) => keepOut.push({ x0, x1, y0, y1, z0, z1 });
  no(side - 1, side + 1, -2.2, 1.2, -7.4, -4.6); // the airlock door
  no(-dx - r - 0.4, dx + r + 0.4, -4, 5, 33, 40); // the drives and the bay door
  if (v.spine) no(-2.8, 2.8, 3, 9, -19, 27);
  no(-3, 3, 3, 12, v.turretZ - 3.2, v.turretZ + 3.2);
  if (v.mastHeight > 0.05) no(-1, 1, 3, 20, 3.5, 12.5);
  if (v.keel) no(-2.4, 2.4, -9, -2, -31, 35);
  no(-sideX(v.wingZ) - 2, sideX(v.wingZ) + 2, wingY - 0.9, wingY + 0.9, v.wingZ - 9.5, v.wingZ + 9.5 + v.sweep); // the wing roots
  no(-6 * kw, 6 * kw, -0.5, 6, -38, -24); // the bridge's brow and glass
  for (const y of rowsY) for (const s of [-1, 1]) no(s * 20 - 20, s * 20 + 20, y - 0.35, y + 0.35, -18.5, 14.5); // the window rows
  const stripeY = 0.95;
  if (v.stripe) no(-40, 40, stripeY - 0.3, stripeY + 0.3, -31, 33);
  const nameOn = v.name.trim() !== '';
  if (nameOn) no(-40, 40, 1.4, 3.3, -26, -13);
  const clear = (x, y, z, hw = 0.6) => !keepOut.some((k) => x + hw > k.x0 && x - hw < k.x1 && y > k.y0 && y < k.y1 && z + hw > k.z0 && z - hw < k.z1);

  // Armour plates: rows of raised panels on the flanks, above and below the windows, each turned to the hull's line.
  const plates = part(root, 'plates');
  plates.visible = v.plates;
  if (v.plates) {
    const pm = metal(v.plateColor, { rough: 0.5 });
    for (const s of [-1, 1]) {
      for (let z0 = -29; z0 < 31; z0 += 4.4) {
        const z1 = z0 + 4.1, zc = (z0 + z1) / 2;
        const f = flats(S, zc);
        const slope = (sideX(z1) - sideX(z0)) / (z1 - z0);
        for (const [ya, yb] of [[f.y + f.sideHalf * 0.55, f.y + f.sideHalf * 0.95], [f.y - f.sideHalf * 0.95, f.y - f.sideHalf * 0.5]]) {
          const yc = (ya + yb) / 2;
          if (!clear(s * sideX(zc), yc, zc, 0.2) || !clear(s * sideX(zc), ya + 0.05, zc, 0.2) || !clear(s * sideX(zc), yb - 0.05, zc, 0.2)) continue;
          const p = at(box(0.14, yb - ya, z1 - z0, pm), s * (sideX(zc) + 0.07), yc, zc, 0, s * Math.atan(slope), 0);
          plates.add(p);
        }
      }
    }
  }

  // Radiators: two banks of fins on her back, aft, leaning out, with a dull glow along their tops.
  const rad = part(root, 'radiators');
  rad.visible = v.radiators;
  if (v.radiators) {
    const rm = new THREE.MeshStandardMaterial({ color: v.radiatorColor, roughness: 0.45, metalness: 0.7, flatShading: true });
    const hot = glow(shade(v.radiatorColor, 0.35), 0.55);
    for (const s of [-1, 1]) {
      for (let i = 0; i < 6; i++) {
        const z = 16 + i * 1.8;
        const f = flats(S, z);
        const x = s * Math.min(f.topHalf - 0.6, 3.7);
        const fin = new THREE.Group();
        fin.add(at(box(0.07, 1.3, 1.4, rm), 0, 0.65, 0));
        fin.add(at(box(0.09, 0.06, 1.4, hot), 0, 1.3, 0));
        fin.position.set(x, topAt(S, z), z);
        fin.rotation.z = -s * 0.32;
        rad.add(fin);
      }
      rad.add(at(box(0.5, 0.3, 11, DARK), s * Math.min(flats(S, 20).topHalf - 0.6, 3.7), topAt(S, 20.5) + 0.1, 20.5)); // the manifold
    }
  }

  // The livery stripe: a band along each flank, in segments that follow the hull's line.
  const stripe = part(root, 'stripe');
  stripe.visible = v.stripe;
  if (v.stripe) {
    const sm = new THREE.MeshStandardMaterial({ color: v.stripeColor, roughness: 0.5, metalness: 0.3, flatShading: true });
    for (const s of [-1, 1]) {
      for (let z0 = -30; z0 < 32; z0 += 2) {
        const z1 = z0 + 2, zc = z0 + 1;
        if (s < 0 && zc > -8 && zc < -4) continue; // the airlock door
        const slope = (sideX(z1) - sideX(z0)) / 2;
        stripe.add(at(box(0.06, 0.34, 2.02, sm), s * (sideX(zc) + 0.035), stripeY, zc, 0, s * Math.atan(slope), 0));
      }
    }
  }

  // Her name on both flanks, forward, in the hull's own lettering.
  const namePart = part(root, 'name');
  namePart.visible = nameOn;
  if (nameOn) {
    const tex = nameTexture(v.name, v.nameColor);
    const nm = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.6, metalness: 0.1, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    for (const s of [-1, 1]) {
      const zc = -19.5;
      const slope = (sideX(-15) - sideX(-24)) / 9;
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.25), nm);
      plane.position.set(s * (sideX(zc) + 0.04), 2.35, zc);
      plane.rotation.y = s * (Math.PI / 2) + s * Math.atan(slope);
      namePart.add(plane);
    }
  }

  // Surface detail: vents, hatches, domes, antennas and conduit boxes over her back, her flanks and her belly.
  const greb = part(root, 'greebles');
  if (v.greebles > 0) greebles(greb, S, v, clear, { DARK, trimMat, top: topMat, belly: bellyMat, nav });

  // --- the places the game needs
  u.airlock = new THREE.Vector3(side + 0.7, 0, -6); // the port airlock: EVA out of here, back in here
  u.bayExit = new THREE.Vector3(0, -1.5, 41); // the fighter appears here, flying astern
  u.bayLand = new THREE.Vector3(0, -1.5, 62); // land from here
  u.lights = [];
  for (const [x, z] of [[-6, -20], [6, -20], [-7, 10], [7, 10]]) lights.add(at(box(0.5, 0.5, 0.5, nav('#ffd9a0')), x * kw, top(z, 5.3), z));
  u.parts = Object.fromEntries(root.children.filter((c) => c.userData.part).map((c) => [c.userData.part, c]));
  // Each part merged into one mesh per material, as the rooms are (decor.mjs): the detail took her from 83 draw calls to
  // 369, and on software GL the game's clock crawled (held keys moved her a tenth as far). Per part, so the shipyard can
  // still point at one. Not the turret (it turns) and not the plumes (they grow with the throttle).
  for (const [id, p] of Object.entries(u.parts)) if (id !== 'turret') bake(p, { skip: u.plumes });
  return root;
}

function nameTexture(text, color) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 128;
  const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  g.fillStyle = color;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  let size = 96;
  g.font = `800 ${size}px ui-sans-serif, system-ui, sans-serif`;
  const spaced = text.toUpperCase().split('').join(' ');
  while (g.measureText(spaced).width > 980 && size > 30) g.font = `800 ${(size -= 4)}px ui-sans-serif, system-ui, sans-serif`;
  g.fillText(spaced, 512, 66);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Scatters the skin's small things, seeded, so the same layout comes back for the same seed. */
function greebles(g, S, v, clear, M) {
  const r = mulberry(v.detailSeed * 7919);
  const n = Math.round(v.greebles * 90);
  const vent = () => {
    const o = new THREE.Group();
    o.add(at(box(1.4, 0.18, 1.0, M.DARK), 0, 0.09, 0));
    for (let k = 0; k < 4; k++) o.add(at(box(1.2, 0.05, 0.08, M.trimMat), 0, 0.2, -0.36 + k * 0.24));
    return o;
  };
  const hatch = () => {
    const o = new THREE.Group();
    o.add(at(box(1.6, 0.1, 1.6, M.trimMat), 0, 0.05, 0));
    o.add(at(box(1.2, 0.12, 1.2, M.DARK), 0, 0.07, 0));
    o.add(at(box(0.3, 0.14, 0.12, M.trimMat), 0.35, 0.08, 0));
    return o;
  };
  const dome = () => {
    const o = new THREE.Group();
    o.add(at(cyl(0.7, 0.8, 0.2, M.trimMat, 10), 0, 0.1, 0));
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#c9ced6', roughness: 0.3, metalness: 0.2, flatShading: true }));
    d.position.y = 0.2;
    o.add(d);
    return o;
  };
  const antenna = () => {
    const o = new THREE.Group();
    o.add(at(box(0.4, 0.2, 0.4, M.trimMat), 0, 0.1, 0));
    o.add(at(box(0.06, 1.8, 0.06, M.DARK), 0, 1.0, 0));
    o.add(at(box(0.12, 0.12, 0.12, M.nav('#ff5540', 0.9)), 0, 1.95, 0));
    return o;
  };
  const conduit = () => {
    const o = new THREE.Group();
    const L = 2 + r() * 3;
    o.add(at(box(0.5, 0.35, L, M.trimMat), 0, 0.17, 0));
    o.add(at(box(0.25, 0.12, L + 0.2, M.DARK), 0, 0.38, 0));
    return o;
  };
  const kinds = [[vent, 3], [hatch, 2], [conduit, 3], [dome, 1], [antenna, 1]];
  const total = kinds.reduce((s, [, w]) => s + w, 0);
  const pickKind = () => {
    let t = r() * total;
    for (const [k, w] of kinds) if ((t -= w) < 0) return k;
    return vent;
  };
  let placed = 0;
  for (let tries = 0; placed < n && tries < n * 8; tries++) {
    const z = -31 + r() * 64;
    const f = flats(S, z);
    const surface = r();
    const make = pickKind();
    let x, y, rot;
    if (surface < 0.5) {
      // her back
      x = (r() * 2 - 1) * (f.topHalf - 0.9);
      y = f.y + f.b;
      rot = [0, 0, 0];
      if (make === antenna && Math.abs(x) < 3) continue;
    } else if (surface < 0.85) {
      // a flank: stood out from the side, turned to face out
      const s = r() < 0.5 ? -1 : 1;
      if (make === antenna || make === dome) continue;
      x = s * f.a;
      y = f.y + (r() * 2 - 1) * (f.sideHalf - 0.6);
      rot = [0, 0, -s * Math.PI / 2];
    } else {
      // the belly
      if (make === antenna) continue;
      x = (r() * 2 - 1) * (f.topHalf - 0.9);
      y = f.y - f.b;
      rot = [Math.PI, 0, 0];
    }
    if (!clear(x, y, z, 1.0)) continue;
    const o = make();
    o.position.set(x, y, z);
    o.rotation.set(...rot);
    if (surface < 0.5 && make === conduit) o.rotation.y = r() < 0.3 ? Math.PI / 2 : 0;
    g.add(o);
    placed++;
  }
}

// --- checks: what the shipyard measures on every change ---------------------------------------------------------

/** The quality checks a change can break. `rooms` are the interior's rooms (Interior.rooms); `wrenSpan` the fighter's
 *  measured span. Each: { id, label, ok, level: 'bad'|'warn', detail }. */
export function checks(v, obj, { rooms = [], wrenSpan = null } = {}) {
  const S = obj.userData.sections;
  const out = [];
  // Every room inside her skin: the outer face of its walls (0.1 m out from the room's line) and its deck and ceiling.
  let worst = null;
  for (const R of rooms) {
    const W = 0.1;
    const zs = [R.z1 - W, R.z2 + W, ...S.map((s) => s.z).filter((z) => z > R.z1 && z < R.z2)];
    for (const z of zs) for (const x of [R.x1 - W, R.x2 + W]) for (const y of [R.y0 - W, R.y1 + W]) {
      const d = outside(S, x, y, z, 0);
      if (d > 0 && (!worst || d > worst.d)) worst = { d, room: R, x, y, z };
    }
  }
  out.push({
    id: 'rooms', label: 'The rooms fit inside the hull', ok: !worst, level: 'bad', part: worst ? `room-${worst.room.id}` : null,
    detail: worst ? `${roomName(worst.room.id)}'s wall comes through her skin by ${worst.d.toFixed(2)} m (at x ${worst.x.toFixed(1)}, y ${worst.y.toFixed(1)}, z ${worst.z.toFixed(1)})` : `${rooms.length} rooms, all inside`
  });
  // The airlock's outer door against the airlock room's outer wall (x −7.5): the space walk starts at that door.
  const gap = halfWidthAt(S, -6) - 7.5;
  out.push({ id: 'airlock', label: 'The airlock reaches the hull', ok: gap >= 0 && gap <= 1.4, level: 'warn', part: 'airlock', detail: gap < 0 ? `the airlock room sticks out ${(-gap).toFixed(1)} m past the door` : `the outer door is ${gap.toFixed(1)} m from the airlock room${gap > 1.4 ? ': a gap no room fills' : ''}` });
  // The drives inside the stern's outline.
  const st = sectionAt(S, 36);
  const over = Math.max(...obj.userData.driveSpots.map(([x, y, rr]) => Math.max(Math.abs(x) + rr - st.w / 2, y + rr - (st.y + st.h / 2))));
  out.push({ id: 'drives', label: 'The drives fit on the stern', ok: over <= 0.3, level: 'warn', part: 'drives', detail: over > 0.3 ? `a drive hangs ${over.toFixed(1)} m off the stern` : 'all on the stern' });
  // The nacelles clear of the hull.
  if (v.nacelles) {
    const inner = Math.min(...[0, 1, 2].map((k) => halfWidthAt(S, v.wingZ - 9 + k * v.nacelleLength / 2)));
    const nIn = obj.userData.handles.wingSpan.x - 0.5 - v.nacelleSize / 2;
    out.push({ id: 'nacelles', label: 'The nacelles stand clear of the hull', ok: nIn > inner + 0.2, level: 'warn', part: 'nacelles', detail: nIn > inner + 0.2 ? `${(nIn - inner).toFixed(1)} m clear` : 'a nacelle is buried in her side: lengthen the wings' });
  }
  // The Wren through the bay door.
  if (wrenSpan) out.push({ id: 'wren', label: 'The Wren fits through the bay door', ok: wrenSpan <= BAY_MOUTH.x1 - BAY_MOUTH.x0, level: 'warn', part: 'bay', detail: `the Wren spans ${wrenSpan.toFixed(1)} m with her wings folded; the door is ${(BAY_MOUTH.x1 - BAY_MOUTH.x0).toFixed(1)} m wide` });
  return out;
}

const roomName = (id) => model.parts.find((p) => p.id === `room-${id}`)?.label ?? id;
