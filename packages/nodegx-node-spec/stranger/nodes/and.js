'use strict';
// And, from src/nodes/and.ts: no declared inputs; every `input <n>` appears on first write.
// The answer: at least one input written and none of them false.

const NUMBERED = /^input \d+$/;
const boolPort = () => ({ kind: 'value', coerce: 'js-boolean', default: undefined });

function allTrue(written) {
  const names = Object.keys(written);
  if (names.length === 0) return false;
  for (const n of names) if (!written[n]) return false;
  return true;
}

module.exports = {
  type: 'And',
  boot: () => ({ written: {}, answer: undefined }),
  ports: {},
  fire: {},
  outs: { result: (s) => s.answer },
  pulses: [],
  dynamic: {
    portsFor: (params) => {
      let highest = -1;
      for (const k of Object.keys(params)) {
        if (NUMBERED.test(k)) highest = Math.max(highest, Number(k.slice(6)));
      }
      const count = highest >= 0 ? highest + 2 : 1;
      const ports = {};
      for (let i = 0; i < count; i++) ports['input ' + i] = boolPort();
      return ports;
    },
    accept: (name) => (NUMBERED.test(name) ? boolPort() : undefined),
    write: (s, name, v) => {
      const written = Object.assign({}, s.written);
      written[name] = v;
      const answer = allTrue(written);
      // the answer is re-published only when it differs from the cached one
      return answer !== s.answer ? { state: { written, answer } } : { state: { written } };
    }
  }
};
