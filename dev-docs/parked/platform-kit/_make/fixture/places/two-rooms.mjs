// The fixture's one place: two rooms side by side, twenty people living in them, and one in real 3D.
import * as THREE from 'three';
import { place, knobs, int, num } from '../kit/index.mjs';
import { room, R } from '../src/room.mjs';

export const P = knobs('two-rooms', {
  people: int(20, [0, 120], 'People', 'How many live in the two rooms.'),
  plane: num(2, [0.5, 3.5], 'm', 'Walking line', 'How far in front of the back wall people walk.'),
  margin: num(0.6, [0, 2], 'm', 'Wall gap', 'How close to a side wall people go.'),
  heroAt: num(4.8, [0, 16], 'm', 'Where the real one runs')
});

export default place('two-rooms', {
  label: 'Two rooms, side by side',
  size: [16, 3.2],
  spawns: { left: [4, 0], right: [12, 0] },
  build: () => {
    const g = new THREE.Group();
    const a = room.build(), b = room.build();
    b.position.x = R.width;
    g.add(a, b);
    room.live(a);
    room.live(b);
    return g;
  }
});
