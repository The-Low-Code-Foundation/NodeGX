'use strict';
// Counter, from src/nodes/counter.ts: a count, a start, and whether the first start has been seen.

const moved = (count) => ({ state: { count }, pulse: ['countChanged'], outcome: 'done' });
const still = () => ({ outcome: 'unchanged' });

module.exports = {
  type: 'Counter',
  boot: () => ({ count: 0, start: 0, startSeen: false }),
  ports: {
    increase: { kind: 'signal', outcome: true },
    decrease: { kind: 'signal', outcome: true },
    reset: { kind: 'signal', outcome: true },
    startValue: { kind: 'value', coerce: 'js-number', default: 0 },
    limitsMin: { kind: 'value', coerce: 'js-number', default: 0 },
    limitsMax: { kind: 'value', coerce: 'js-number', default: 0 },
    limitsEnabled: { kind: 'value', coerce: 'js-boolean', default: false }
  },
  react: {
    // the first Start Value seeds the count and announces; later ones only move the return point
    startValue: (s, v) => {
      if (s.startSeen) return { state: { start: v } };
      return { state: { start: v, count: v, startSeen: true }, pulse: ['countChanged'] };
    }
  },
  fire: {
    increase: (s, i) => (i.limitsEnabled && s.count >= i.limitsMax ? still() : moved(s.count + 1)),
    decrease: (s, i) => (i.limitsEnabled && s.count <= i.limitsMin ? still() : moved(s.count - 1)),
    reset: (s) => (s.count === s.start ? still() : moved(s.start))
  },
  outs: { currentCount: (s) => s.count },
  pulses: ['countChanged']
};
