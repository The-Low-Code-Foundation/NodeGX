// The people's lives: walk to a spot in their room, work, sit, talk or stand a while, walk again.
import { knobs, num, pick } from '../kit/index.mjs';

export const L = knobs('life', {
  restMin: num(1.5, [0, 10], 's', 'Shortest rest'),
  restMax: num(6, [0.5, 30], 's', 'Longest rest'),
  spread: num(0.8, [0, 1.6], 'm', 'Depth spread', 'How far in front of or behind the walking line people stand.'),
  hero: pick('medic-f', ['soldier-f', 'firefighter-f', 'builder-f', 'medic-f', 'jacket-f', 'tee-f', 'soldier-m', 'builder-m', 'woodsman-m', 'gardener-m', 'vest-m', 'hood-m'], 'Who is in real 3D')
});
const RESTS = ['idle', 'work', 'fix', 'talk'];

export function life(crowd, people, { rooms, z, count }) {
  // why: Park and Miller's minimal standard generator (seed 7, multiplier 16807, modulus 2^31 − 1): the same crowd every run
  let seed = 7, r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647); // why: see the line above
  const folk = [];
  for (let n = 0; n < count; n++) {
    const [x0, x1] = rooms[n % rooms.length];
    const i = crowd.add(people.ids[n % people.ids.length], { x: x0 + r() * (x1 - x0), z: z + (r() - 0.5) * L.spread, phase: r() * L.restMax });
    folk.push({ i, x0, x1, state: 'rest', timer: r() * L.restMax, target: 0 });
  }
  return {
    folk,
    update(dt) {
      for (const f of folk) {
        const me = crowd.get(f.i);
        if (f.state === 'walk') {
          const step = crowd.walkSpeed(f.i) * dt, gap = f.target - me.x;
          if (Math.abs(gap) <= step) {
            crowd.move(f.i, { x: f.target });
            f.state = 'rest';
            f.timer = L.restMin + r() * (L.restMax - L.restMin);
            crowd.play(f.i, RESTS[Math.floor(r() * RESTS.length)]);
          } else crowd.move(f.i, { x: me.x + Math.sign(gap) * step });
        } else if ((f.timer -= dt) <= 0) {
          f.target = f.x0 + r() * (f.x1 - f.x0);
          f.state = 'walk';
          crowd.move(f.i, { facing: f.target >= me.x ? 1 : -1 });
          crowd.play(f.i, 'walk');
        }
      }
    }
  };
}
