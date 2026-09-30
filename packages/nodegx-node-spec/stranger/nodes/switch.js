'use strict';
// Switch, from src/nodes/switch.ts: a latch with three actions and a setter that always announces.

const go = (on) => ({ state: { on }, pulse: [on ? 'switchedToOn' : 'switchedToOff', 'switched'], outcome: 'done' });

module.exports = {
  type: 'Switch',
  boot: () => ({ on: false }),
  ports: {
    on: { kind: 'signal', outcome: true },
    off: { kind: 'signal', outcome: true },
    flip: { kind: 'signal', outcome: true },
    onFromStart: { kind: 'value', coerce: 'js-boolean', default: false }
  },
  react: {
    // every write announces, even one to the state already held; no outcome
    onFromStart: (s, v) => ({ state: { on: v }, pulse: [v ? 'switchedToOn' : 'switchedToOff', 'switched'] })
  },
  fire: {
    on: (s) => (s.on ? { outcome: 'unchanged' } : go(true)),
    off: (s) => (s.on ? go(false) : { outcome: 'unchanged' }),
    flip: (s) => go(!s.on)
  },
  outs: { state: (s) => s.on },
  pulses: ['switched', 'switchedToOn', 'switchedToOff']
};
