// The control arm: the map editor's adapter with one number parameter written as a string on the
// way out. The suite must say FAIL and name it; if it says PASS, the adapter is not being read.
import mapEditorAdapter from './adapter.mjs';

export default function () {
  const adapter = mapEditorAdapter({ broken: true });
  adapter.name = 'NodeGX map editor (broken on purpose)';
  return adapter;
}
