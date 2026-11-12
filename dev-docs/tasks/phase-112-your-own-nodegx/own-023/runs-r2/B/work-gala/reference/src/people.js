// The dancers: the castle's box people, dressed for each number. A costume is { outfit, color, shoes, acc }, the hair is the
// class's. Every look is built from boxes and cylinders so that a new costume is one more `if` here and one row in data.js.
import * as T from 'three';
import { std, box, cyl, M } from './world.js';
import { CLASSES, SHOES } from './data.js';
import { rngFor } from './engine.js';

export const P_SCALE = 0.47;   // the castle's people are 3.4 units tall: a senior is 1.6 m
const SKINS = ['#f1c9a5', '#e8b48f', '#d9a076', '#b07a4b', '#7a4b2b', '#4a2e1b'], HAIRC = ['#2b1b10', '#7a4a1f', '#e3b04b', '#c4392f', '#3b2416', '#d8c08a'];
export function lookOf(cls, i) { const r = rngFor(CLASSES.findIndex((c) => c.id === cls) * 101 + i * 7 + 3); return { skin: SKINS[Math.floor(r() * SKINS.length)], hair: HAIRC[Math.floor(r() * HAIRC.length)], face: r() < 0.25 ? 'freckles' : r() < 0.4 ? 'blush' : 'none' }; }
export const lighter = (hex, k = 0.35) => new T.Color(hex).lerp(new T.Color(0xffffff), k);
const darker = (hex, k = 0.35) => new T.Color(hex).lerp(new T.Color(0x000000), k);
const limb = (w, h, d, mat, x, y, z) => { const p = new T.Group(); p.position.set(x, y, z); p.add(box(w, h, d, mat, 0, -h / 2, 0)); return p; };
const ball = (r, mat, x, y, z, detail = 0) => { const m = new T.Mesh(new T.IcosahedronGeometry(r, detail), mat); m.position.set(x, y, z); m.castShadow = true; return m; };
const glassy = (c, o = 0.55) => new T.MeshStandardMaterial({ color: c, transparent: true, opacity: o, roughness: 0.3, flatShading: true, side: T.DoubleSide });

function wings(body, mat, big) {
  for (const s of [-1, 1]) {
    const w = new T.Group(); w.position.set(s * 0.2, 2.0, -0.3); w.rotation.y = s * 0.5;
    w.add(box(big ? 1.0 : 0.7, big ? 1.1 : 0.8, 0.03, mat, s * (big ? 0.5 : 0.35), 0.2, 0));
    w.add(box(big ? 0.7 : 0.5, 0.55, 0.03, mat, s * (big ? 0.4 : 0.3), -0.45, 0));
    body.add(w);
  }
}
export function makeDancer(look, cos, hairId, scale) {
  const g = new T.Group(), body = new T.Group(); g.add(body);
  const c = cos.color, skin = std(look.skin), hair = std(look.hair), suit = std(c), tights = std(0xf6d3c6);
  const shoeDef = SHOES[cos.shoes] || SHOES.demi, shoes = std(shoeDef.color || look.skin);
  // the head and the face
  body.add(box(0.9, 0.9, 0.9, skin, 0, 2.55, 0));
  for (const ex of [-0.2, 0.2]) { body.add(box(0.22, 0.17, 0.04, M.white, ex, 2.6, 0.455)); body.add(box(0.11, 0.15, 0.05, M.black, ex + (ex < 0 ? 0.04 : -0.04), 2.6, 0.47)); }
  body.add(box(0.24, 0.05, 0.04, std(0xc0405a), 0, 2.3, 0.46));
  if (look.face === 'freckles') for (const [x, y] of [[-0.3, 2.45], [-0.22, 2.4], [0.22, 2.4], [0.3, 2.45]]) body.add(box(0.05, 0.05, 0.03, std(0xb5683c), x, y, 0.46));
  if (look.face === 'blush') for (const s of [-1, 1]) body.add(box(0.17, 0.08, 0.03, std(0xff8fa3), s * 0.3, 2.42, 0.46));
  // the hair
  const ribbon = std(c);
  if (hairId === 'afro') body.add(box(1.3, 1.0, 1.25, hair, 0, 2.95, -0.08));
  else { body.add(box(0.95, 0.32, 0.95, hair, 0, 2.96, 0)); if (!['carre', 'laches'].includes(hairId)) body.add(box(0.95, 0.5, 0.2, hair, 0, 2.62, -0.4)); }
  if (hairId === 'chignon') { body.add(box(0.48, 0.42, 0.48, hair, 0, 3.15, -0.3)); body.add(box(0.52, 0.08, 0.52, ribbon, 0, 3.0, -0.3)); }
  if (hairId === 'queue') { body.add(box(0.3, 0.9, 0.3, hair, 0, 2.3, -0.6)); body.add(box(0.22, 0.6, 0.22, hair, 0, 1.75, -0.7)); body.add(box(0.34, 0.1, 0.34, ribbon, 0, 2.75, -0.6)); }
  if (hairId === 'tresses') for (const s of [-1, 1]) { body.add(box(0.2, 0.6, 0.6, hair, s * 0.5, 2.6, -0.1)); body.add(box(0.22, 0.95, 0.22, hair, s * 0.45, 1.85, 0.2)); body.add(box(0.26, 0.1, 0.26, ribbon, s * 0.45, 1.45, 0.2)); }
  if (hairId === 'carre') { body.add(box(0.2, 0.7, 0.95, hair, -0.5, 2.5, 0)); body.add(box(0.2, 0.7, 0.95, hair, 0.5, 2.5, 0)); body.add(box(0.95, 0.7, 0.2, hair, 0, 2.5, -0.45)); }
  if (hairId === 'couettes') for (const s of [-1, 1]) { body.add(box(0.3, 0.3, 0.3, ribbon, s * 0.55, 2.85, -0.1)); body.add(box(0.26, 0.75, 0.26, hair, s * 0.72, 2.45, -0.1)); }
  if (hairId === 'laches') { body.add(box(0.2, 1.15, 0.95, hair, -0.5, 2.3, -0.02)); body.add(box(0.2, 1.15, 0.95, hair, 0.5, 2.3, -0.02)); body.add(box(0.95, 1.4, 0.2, hair, 0, 2.2, -0.45)); }
  if (hairId === 'macarons') for (const s of [-1, 1]) { body.add(box(0.42, 0.42, 0.42, hair, s * 0.35, 3.2, -0.05)); body.add(box(0.44, 0.07, 0.44, ribbon, s * 0.35, 3.02, -0.05)); }
  if (hairId === 'couronne') { const b = std(darker(look.hair, 0.15)); body.add(box(1.02, 0.16, 0.16, b, 0, 2.95, 0.43)); body.add(box(1.02, 0.16, 0.16, b, 0, 2.95, -0.43)); body.add(box(0.16, 0.16, 1.02, b, 0.43, 2.95, 0)); body.add(box(0.16, 0.16, 1.02, b, -0.43, 2.95, 0)); for (let i = 0; i < 4; i++) body.add(box(0.1, 0.1, 0.1, std(0xffffff), -0.3 + i * 0.2, 3.05, 0.5)); }
  if (hairId === 'ruban') { body.add(box(0.32, 0.32, 0.32, hair, 0, 3.2, -0.35)); body.add(box(0.26, 1.0, 0.26, hair, 0, 2.6, -0.62)); body.add(box(0.7, 0.24, 0.12, ribbon, 0, 3.22, -0.2)); body.add(box(0.16, 0.5, 0.06, ribbon, 0.12, 2.95, -0.18)); }
  // the body, arms and legs
  const top = cos.outfit === 'street' ? std(c) : suit, legMat = cos.outfit === 'street' ? std(darker(c, 0.3)) : cos.outfit === 'disco' ? std(c, { metalness: 0.5, roughness: 0.3 }) : tights;
  body.add(box(cos.outfit === 'street' ? 0.96 : 0.86, 1.1, cos.outfit === 'street' ? 0.56 : 0.48, cos.outfit === 'disco' ? std(c, { metalness: 0.5, roughness: 0.3 }) : top, 0, 1.55, 0));
  const armMat = ['street', 'princesse', 'marin', 'disco'].includes(cos.outfit) ? std(cos.outfit === 'marin' ? 0xffffff : c) : skin;
  const armL = limb(0.26, 1.0, 0.26, armMat, -0.58, 2.05, 0), armR = limb(0.26, 1.0, 0.26, armMat, 0.58, 2.05, 0); body.add(armL); body.add(armR);
  for (const a of [armL, armR]) { a.add(box(0.28, 0.14, 0.28, top, 0, -0.07, 0)); if (armMat !== skin) a.add(box(0.27, 0.16, 0.27, skin, 0, -0.95, 0)); }
  const legL = limb(0.38, 1.0, 0.38, legMat, -0.21, 1.0, 0), legR = limb(0.38, 1.0, 0.38, legMat, 0.21, 1.0, 0);
  for (const lg of [legL, legR]) {
    if (cos.shoes === 'baskets') { lg.add(box(0.44, 0.24, 0.56, shoes, 0, -0.9, 0.06)); lg.add(box(0.45, 0.06, 0.4, std(c), 0, -0.86, 0.02)); }
    else if (cos.shoes === 'jazz') lg.add(box(0.4, 0.36, 0.48, shoes, 0, -0.86, 0.05));
    else if (cos.shoes === 'pointes') { lg.add(box(0.34, 0.2, 0.5, shoes, 0, -0.92, 0.08)); for (const y of [-0.75, -0.6]) lg.add(box(0.4, 0.04, 0.4, std(0xffb6c8), 0, y, 0)); }
    else if (cos.shoes !== 'pieds') lg.add(box(0.36, 0.2, 0.46, shoes, 0, -0.92, 0.05));
    if (cos.outfit === 'disco') lg.add(box(0.5, 0.25, 0.5, legMat, 0, -0.75, 0));
  }
  body.add(legL); body.add(legR);
  body.add(box(0.9, 0.24, 0.52, cos.outfit === 'street' ? legMat : suit, 0, 0.98, 0));
  // the outfit's own pieces
  const o = cos.outfit, lc = lighter(c), lc2 = lighter(c, 0.6);
  if (o === 'tutu' || o === 'fee' || o === 'flocon' || o === 'cygne') { body.add(cyl(1.0, 1.0, 0.1, std(lc), 0, 1.05, 0, 12)); body.add(cyl(0.9, 0.92, 0.09, std(lc2), 0, 1.13, 0, 12)); }
  if (o === 'jupette') body.add(cyl(0.5, 0.75, 0.42, suit, 0, 0.82, 0, 10));
  if (o === 'robe') { body.add(cyl(0.48, 0.85, 1.05, suit, 0, 0.5, 0, 12)); body.add(cyl(0.86, 0.9, 0.08, std(lc), 0, 0.02, 0, 12)); }
  if (o === 'marin') { for (const y of [1.25, 1.5, 1.75]) body.add(box(0.88, 0.07, 0.5, std(0x1d3b8a), 0, y, 0)); body.add(box(0.8, 0.12, 0.3, std(0x1d3b8a), 0, 2.08, -0.15)); body.add(cyl(0.5, 0.72, 0.4, std(0x1d3b8a), 0, 0.82, 0, 10)); body.add(box(0.14, 0.14, 0.05, std(0xc23652), 0, 1.95, 0.26)); }
  if (o === 'fee') { wings(body, glassy(lc2, 0.5), false); for (let i = 0; i < 6; i++) body.add(box(0.06, 0.06, 0.06, std(0xfff3c4, { emissive: 0xffe08a, emissiveIntensity: 1 }), Math.cos(i) * 0.95, 1.12, Math.sin(i) * 0.95)); }
  if (o === 'papillon') { wings(body, glassy(c, 0.75), true); body.add(cyl(0.5, 0.7, 0.36, std(lc), 0, 0.85, 0, 10)); for (const s of [-1, 1]) body.add(box(0.25, 0.25, 0.02, std(0x2b2236), s * 0.75, 2.3, -0.5)); }
  if (o === 'cygne') { body.add(cyl(1.1, 1.1, 0.06, std(0xffffff), 0, 1.0, 0, 14)); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const f = box(0.14, 0.04, 0.4, std(0xffffff), Math.cos(a) * 0.45, 2.02, Math.sin(a) * 0.3); f.rotation.y = -a; body.add(f); } }
  if (o === 'lapin') { body.add(ball(0.26, std(0xffffff), 0, 1.05, -0.36)); body.add(box(0.6, 0.7, 0.05, std(0xffd6e0), 0, 1.55, 0.25)); body.add(cyl(0.5, 0.7, 0.34, suit, 0, 0.85, 0, 10)); }
  if (o === 'flocon') for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; body.add(box(0.16, 0.03, 0.03, std(0xffffff), Math.cos(a) * 0.85, 1.12, Math.sin(a) * 0.85)); body.add(box(0.03, 0.03, 0.16, std(0xffffff), Math.cos(a) * 0.85, 1.12, Math.sin(a) * 0.85)); }
  if (o === 'etoile') { for (let i = 0; i < 14; i++) body.add(box(0.07, 0.07, 0.02, std(0xffe08a, { emissive: 0xffd24a, emissiveIntensity: 0.8 }), -0.35 + (i % 5) * 0.17, 1.15 + Math.floor(i / 5) * 0.32, 0.25)); body.add(cyl(0.5, 0.7, 0.3, std(lc, { metalness: 0.6, roughness: 0.3 }), 0, 0.88, 0, 10)); }
  if (o === 'flamenco') { [0.75, 0.55, 0.3].forEach((y, k) => body.add(cyl(0.55 + k * 0.17, 0.65 + k * 0.2, 0.26, std(k % 2 ? lc : c), 0, y, 0, 12))); body.add(ball(0.18, std(0xc23652), 0.35, 3.0, 0.1)); }
  if (o === 'princesse') { body.add(cyl(0.5, 1.05, 1.0, suit, 0, 0.55, 0, 14)); body.add(cyl(1.06, 1.08, 0.08, std(lc2), 0, 0.06, 0, 14)); for (const s of [-1, 1]) body.add(ball(0.24, std(lc), s * 0.55, 2.0, 0)); }
  if (o === 'street') { body.add(box(0.7, 0.6, 0.22, std(darker(c, 0.15)), 0, 2.4, -0.55)); body.add(box(0.5, 0.2, 0.04, std(0xffffff), 0, 1.65, 0.29)); }
  if (o === 'abeille') { for (const y of [1.3, 1.65]) body.add(box(0.9, 0.14, 0.52, std(0x1b1720), 0, y, 0)); wings(body, glassy(0xffffff, 0.6), false); body.add(cyl(0.5, 0.65, 0.3, std(0x1b1720), 0, 0.85, 0, 10)); }
  if (o === 'disco') body.add(box(0.5, 0.3, 0.05, std(0xffffff, { metalness: 0.8, roughness: 0.2 }), 0, 1.9, 0.26));
  // the accessory
  const a = cos.acc, gold = std(0xf5d76e, { metalness: 0.5, roughness: 0.35 });
  if (a === 'noeud') { body.add(box(0.5, 0.25, 0.12, std(c), 0, 3.15, -0.2)); body.add(box(0.14, 0.14, 0.14, std(darker(c, 0.2)), 0, 3.15, -0.2)); }
  if (a === 'tiare') { body.add(box(0.8, 0.08, 0.08, gold, 0, 3.15, 0.25)); for (const x of [-0.25, 0, 0.25]) body.add(box(0.08, x ? 0.18 : 0.28, 0.06, gold, x, 3.25 + (x ? 0 : 0.05), 0.25)); }
  if (a === 'fleurs') for (let i = 0; i < 10; i++) { const ang = (i / 10) * Math.PI * 2; body.add(ball(0.09, std([0xff9ec7, 0xfff1a8, 0xffffff, 0xb48cff][i % 4]), Math.cos(ang) * 0.5, 3.1, Math.sin(ang) * 0.5)); }
  if (a === 'ailes') wings(body, glassy(0xffffff, 0.5), true);
  if (a === 'oreilles') for (const s of [-1, 1]) { body.add(box(0.2, 0.75, 0.1, std(0xffffff), s * 0.25, 3.5, 0)); body.add(box(0.1, 0.55, 0.11, std(0xffb6c8), s * 0.25, 3.5, 0.01)); }
  if (a === 'casquette') { body.add(box(1.0, 0.25, 1.0, std(c), 0, 3.12, 0)); body.add(box(0.8, 0.06, 0.5, std(darker(c, 0.2)), 0, 3.02, 0.6)); }
  if (a === 'beret') { body.add(cyl(0.55, 0.55, 0.14, std(0x1d3b8a), 0, 3.17, 0, 12)); body.add(ball(0.1, std(0xc23652), 0, 3.3, 0)); }
  if (a === 'baguette') { armR.add(box(0.05, 0.7, 0.05, std(0xffffff), 0, -1.25, 0.15)); armR.add(box(0.2, 0.2, 0.05, gold, 0, -1.6, 0.15)); }
  if (a === 'antennes') for (const s of [-1, 1]) { body.add(box(0.04, 0.5, 0.04, std(0x1b1720), s * 0.2, 3.3, 0.1)); body.add(ball(0.08, std(c), s * 0.2, 3.58, 0.1)); }
  g.scale.setScalar(scale * P_SCALE);
  Object.assign(g.userData, { arms: [armL, armR], legs: [legL, legR], body, h: 3.4 * scale * P_SCALE });
  return g;
}

/* ---------------- thought bubbles ---------------- */
const bubbleTex = new Map();
export function bubbleOf(emoji) {
  if (bubbleTex.has(emoji)) return bubbleTex.get(emoji);
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d');
  g.fillStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.ellipse(64, 56, 54, 46, 0, 0, 7); g.fill(); g.beginPath(); g.arc(40, 108, 8, 0, 7); g.fill(); g.beginPath(); g.arc(30, 122, 4, 0, 7); g.fill();
  g.font = '58px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(emoji, 64, 60);
  const tx = new T.CanvasTexture(cv); tx.colorSpace = T.SRGBColorSpace; const m = new T.SpriteMaterial({ map: tx, transparent: true, depthWrite: false }); bubbleTex.set(emoji, m); return m;
}

/* ---------------- poses ---------------- */
// p: { aL, aR (arms out to the side), afL, afR (arms forward), lL, lR (legs forward +, back −), y (rise, metres),
//      bow (lean forward), spin, sit (0 standing .. 1 on the floor), side (lean sideways), roll }
export const REST = { aL: 0.08, aR: 0.08, afL: 0, afR: 0, lL: 0, lR: 0, y: 0, bow: 0, spin: 0, sit: 0, side: 0, roll: 0 };
export function applyPose(d, p) {
  const u = d.g.userData, q = { ...REST, ...p };
  u.arms[0].rotation.set(-q.afL, 0, -q.aL); u.arms[1].rotation.set(-q.afR, 0, q.aR);
  u.legs[0].rotation.x = q.lL + q.sit * 1.45; u.legs[1].rotation.x = q.lR + q.sit * 1.45;
  u.body.rotation.set(q.bow, q.spin, q.side + q.roll);
  u.body.position.y = q.y / P_SCALE * 0.5 - q.sit * 0.92;
}
