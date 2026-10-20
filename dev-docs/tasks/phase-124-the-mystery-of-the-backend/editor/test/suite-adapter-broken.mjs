// The control: the same adapter, with one fault on the way out (the first number parameter of any
// node written as text). The suite must say FAIL and name it; if it said PASS, the adapter wouldn't
// be grading anything.
import adapter from './suite-adapter.mjs';

export default function () {
  const a = adapter();
  return {
    ...a,
    name: 'backend map (broken on purpose)',
    save() {
      const out = a.save();
      for (const file of Object.keys(out).filter((f) => f.endsWith('/nodes.json')).sort()) {
        const doc = JSON.parse(out[file]);
        for (const n of doc.nodes) {
          const key = Object.keys(n.parameters ?? {}).find((k) => typeof n.parameters[k] === 'number');
          if (key) {
            n.parameters[key] = String(n.parameters[key]);
            out[file] = JSON.stringify(doc, null, 2) + '\n';
            return out;
          }
        }
      }
      throw new Error('no number to break');
    }
  };
}
