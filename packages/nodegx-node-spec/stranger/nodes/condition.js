'use strict';
// Condition, from src/nodes/condition.ts: a value tested once per frame, at frame end, against
// the frame's final value; every Evaluate reports its own done.

function plain(v) {
  if (v === null) return true;
  const t = typeof v;
  return t !== 'object' && t !== 'function' && t !== 'undefined';
}
function differs(before, after) {
  if (!plain(before) || !plain(after)) return true;
  return !Object.is(before, after);
}

module.exports = {
  type: 'Condition',
  boot: () => ({ last: undefined, tested: undefined, scheduled: false, evaluated: false }),
  ports: {
    condition: { kind: 'value', coerce: 'none', default: undefined },
    eval: { kind: 'signal', outcome: true },
    'runOnChange-condition': { kind: 'value', coerce: 'not-false', default: true }
  },
  react: {
    condition: (s, v, i) => {
      if (differs(s.last, v) && i['runOnChange-condition']) return { state: { last: v, scheduled: true } };
      return { state: { last: v } };
    }
  },
  fire: {
    eval: () => ({ state: { scheduled: true }, outcome: 'done' })
  },
  outs: {
    result: (s) => (s.evaluated ? !!s.tested : null),
    isfalse: (s) => (s.evaluated ? !s.tested : null)
  },
  pulses: ['ontrue', 'onfalse'],
  frameEnd: (s) => {
    if (!s.scheduled) return null;
    return { state: { scheduled: false, evaluated: true, tested: s.last }, pulse: [s.last ? 'ontrue' : 'onfalse'] };
  }
};
