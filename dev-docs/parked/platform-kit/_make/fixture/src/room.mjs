// A room of the tower: a box with its front cut away, a lamp in the ceiling.
import * as THREE from 'three';
import { knobs, num, colour, model } from '../kit/index.mjs';

export const R = knobs('room', {
  width: num(8, [4, 14], 'm', 'Room width'),
  height: num(3.2, [2.6, 5], 'm', 'Room height'),
  depth: num(4, [2, 8], 'm', 'Room depth', 'How far back the back wall is. People walk 2 m in.'),
  wall: colour('#8a7f72', 'Wall colour'),
  floor: colour('#4a4844', 'Floor colour'),
  lamp: colour('#fff4dd', 'Lamp colour', 'The light the lamp gives and the colour of its glass.'),
  lampSize: num(0.8, [0.2, 2], 'm', 'Lamp length'),
  lampDepth: num(0.3, [0.1, 1], 'm', 'Lamp width'),
  wallThickness: num(0.2, [0.05, 0.6], 'm', 'Side wall thickness')
});

const box = (w, h, d, colour, x, y, z) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color: colour }));
  m.position.set(x, y, z);
  return m;
};
const SLAB = 0.25; // why: a floor's thickness in the cutaway, not something anyone tunes
const SKIN = 0.1; // why: the back wall is a skin; its thickness never shows from the front
const GLASS = 0.08; // why: a lamp's glass is a sliver seen edge-on; lampDepth is the size that shows

export const room = model('room', {
  help: 'One room of the tower, front wall cut away. Its left edge is x = 0, its floor y = 0, its back wall z = 0.',
  knobs: R,
  parts: {
    back: (S) => box(S.width, S.height, SKIN, S.wall, S.width / 2, S.height / 2, 0),
    floor: (S) => box(S.width, SLAB, S.depth, S.floor, S.width / 2, -SLAB / 2, S.depth / 2),
    ceiling: (S) => box(S.width, SLAB, S.depth, S.floor, S.width / 2, S.height + SLAB / 2, S.depth / 2),
    sides: (S) => {
      const g = new THREE.Group();
      const t = S.wallThickness;
      g.add(box(t, S.height, S.depth, S.wall, 0, S.height / 2, S.depth / 2), box(t, S.height, S.depth, S.wall, S.width, S.height / 2, S.depth / 2));
      return g;
    },
    lamp: (S) => {
      const glass = new THREE.Mesh(new THREE.BoxGeometry(S.lampSize, GLASS, S.lampDepth), new THREE.MeshBasicMaterial({ color: S.lamp }));
      glass.position.set(S.width / 2, S.height - GLASS / 2, S.depth / 2);
      return glass;
    }
  }
});
