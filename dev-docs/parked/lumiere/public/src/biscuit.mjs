// Chef Praline's biscuits (the Tea Room, round 2): the cake game's way of playing (pick, pick, pick, bake with a
// spell) with other things to pick. A tray of six biscuits in the shape, dough, icing and sprinkles she chose. The Moon
// shape is great-aunt's own recipe (a book in the Library): it is locked until she has read it.
import * as THREE from 'three';

export const BISCUIT_OPTIONS = {
  dough: [
    { id: 'butter', name: 'Butter', color: '#e9c487' },
    { id: 'chocolate', name: 'Chocolate', color: '#6a4028' },
    { id: 'strawberry', name: 'Strawberry', color: '#f2a6b6' },
    { id: 'pistachio', name: 'Pistachio', color: '#bcd78f' },
    { id: 'gingerbread', name: 'Gingerbread', color: '#b5652c' }
  ],
  shape: [
    { id: 'round', name: 'Round' },
    { id: 'star', name: 'Star' },
    { id: 'heart', name: 'Heart' },
    { id: 'flower', name: 'Flower' },
    { id: 'moon', name: 'Moon (great-aunt’s recipe)', needs: 'recipe' }
  ],
  icing: [
    { id: 'none', name: 'No icing' },
    { id: 'white', name: 'Snow white', color: '#fff8f2' },
    { id: 'pink', name: 'Pink', color: '#ff9fc4' },
    { id: 'lemon', name: 'Lemon', color: '#fff09a' },
    { id: 'violet', name: 'Violet', color: '#c9a7f5' },
    { id: 'gold', name: 'Gold', color: '#f3cf6b' }
  ],
  sprinkles: [
    { id: 'stars', name: 'Sugar stars' },
    { id: 'rainbow', name: 'Rainbow strands' },
    { id: 'pearls', name: 'Silver pearls' },
    { id: 'chips', name: 'Chocolate chips' }
  ]
};

function outline(shape, r) {
  const s = new THREE.Shape();
  if (shape === 'star') {
    for (let i = 0; i < 10; i++) {
      const a = Math.PI / 2 + (i / 10) * Math.PI * 2, rr = i % 2 ? r * 0.48 : r;
      i ? s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
  } else if (shape === 'heart') {
    s.moveTo(0, -r * 0.9);
    s.bezierCurveTo(r * 0.2, -r * 0.6, r * 1.1, -r * 0.1, r * 0.95, r * 0.35);
    s.bezierCurveTo(r * 0.8, r * 0.95, r * 0.1, r * 0.95, 0, r * 0.45);
    s.bezierCurveTo(-r * 0.1, r * 0.95, -r * 0.8, r * 0.95, -r * 0.95, r * 0.35);
    s.bezierCurveTo(-r * 1.1, -r * 0.1, -r * 0.2, -r * 0.6, 0, -r * 0.9);
  } else if (shape === 'flower') {
    for (let i = 0; i <= 60; i++) {
      const a = (i / 60) * Math.PI * 2, rr = r * (0.78 + 0.22 * Math.cos(a * 6));
      i ? s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
  } else if (shape === 'moon') {
    s.absarc(0, 0, r, Math.PI * 0.32, Math.PI * 1.68, false);
    s.absarc(r * 0.45, 0, r * 0.78, Math.PI * 1.45, Math.PI * 0.55, true);
  } else s.absarc(0, 0, r, 0, Math.PI * 2, false);
  return s;
}

const SPRINKLE = { stars: [0xffe28a, 0xffffff, 0xffb3d9], rainbow: [0xff6b8a, 0xffd36b, 0x7ad9a0, 0x7ab0ff, 0xc08aff], pearls: [0xe8ecf4, 0xd0d8e8], chips: [0x4a2a18, 0x5a3420] };

// A tray of six. `recipe`: { dough, shape, icing, sprinkles: [] } (ids above).
export function makeBiscuits(recipe) {
  const g = new THREE.Group();
  const r = 0.07;
  const dough = BISCUIT_OPTIONS.dough.find((d) => d.id === recipe.dough) ?? BISCUIT_OPTIONS.dough[0];
  const icing = BISCUIT_OPTIONS.icing.find((d) => d.id === recipe.icing);
  const tray = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.015, 0.44), new THREE.MeshStandardMaterial({ color: 0xc8ccd4, metalness: 0.8, roughness: 0.35 }));
  tray.position.y = 0.0075;
  g.add(tray);
  const base = new THREE.ExtrudeGeometry(outline(recipe.shape, r), { depth: 0.014, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2, curveSegments: 16 });
  base.rotateX(-Math.PI / 2);
  const top = icing && icing.id !== 'none' ? new THREE.ExtrudeGeometry(outline(recipe.shape, r * 0.84), { depth: 0.004, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.003, bevelSegments: 2, curveSegments: 16 }).rotateX(-Math.PI / 2) : null;
  const doughMat = new THREE.MeshStandardMaterial({ color: dough.color, roughness: 0.85 });
  const iceMat = top ? new THREE.MeshStandardMaterial({ color: icing.color, roughness: 0.3, emissive: icing.id === 'gold' ? 0x6a4a10 : 0x000000 }) : null;
  const dot = new THREE.SphereGeometry(0.0055, 6, 4), strand = new THREE.CapsuleGeometry(0.0026, 0.011, 2, 4);
  let seed = 3;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 6; i++) {
    const b = new THREE.Group();
    b.position.set(-0.2 + (i % 3) * 0.2, 0.017, -0.1 + Math.floor(i / 3) * 0.2);
    b.rotation.y = (rnd() - 0.5) * 0.6;
    const m = new THREE.Mesh(base, doughMat);
    m.castShadow = true;
    b.add(m);
    if (top) {
      const t = new THREE.Mesh(top, iceMat);
      t.position.y = 0.018;
      b.add(t);
    }
    for (const sp of recipe.sprinkles ?? []) {
      const cols = SPRINKLE[sp];
      for (let k = 0; k < 7; k++) {
        const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * r * 0.55;
        const piece = new THREE.Mesh(sp === 'rainbow' ? strand : dot, new THREE.MeshStandardMaterial({ color: cols[k % cols.length], roughness: 0.4, metalness: sp === 'pearls' ? 0.7 : 0, emissive: sp === 'stars' ? cols[k % cols.length] : 0, emissiveIntensity: sp === 'stars' ? 0.5 : 0 }));
        piece.position.set(Math.cos(a) * d, 0.026, Math.sin(a) * d);
        if (sp === 'rainbow') piece.rotation.set(Math.PI / 2, 0, rnd() * 3);
        if (sp === 'chips') piece.scale.set(1.4, 0.8, 1.4);
        b.add(piece);
      }
    }
    g.add(b);
  }
  return g;
}

export function disposeBiscuits(g) {
  g.traverse((o) => {
    if (!o.isMesh) return;
    o.geometry.dispose();
    o.material.dispose();
  });
}
