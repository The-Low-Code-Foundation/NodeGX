// The control arm: the real adapter, with one fault on the way out — the new words' size, a
// number, saved as a string. The suite must say FAIL and name it, or it is not looking at the
// editor's saves at all.

import bigBlockAdapter from '../adapter.mjs';

export default function brokenBigBlockAdapter() {
  const real = bigBlockAdapter();
  return {
    ...real,
    name: 'big-block editor (broken on purpose)',
    save() {
      const files = real.save();
      const path = 'components/Pages/Sign in/nodes.json';
      files[path] = files[path].replace('"fontSize": 32', '"fontSize": "32"');
      return files;
    }
  };
}
