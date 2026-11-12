// A place: a level, or the tower, as a file. `places/<id>.mjs` declares it and nothing else has to change for it to
// exist: loadPlaces() finds every file in places/ and imports it, and the checker asks for tests/<id>.json, its drive.
//
//   export default place('department-store', {
//     label: 'The department store, top floors',
//     size: [120, 30],                                  // metres, x by y, for the camera and the checks
//     spawns: { boat: [2, 0.5], exit: [118, 0.5] },
//     build: (ctx) => { … return group; },              // built from models: a place's own meshes are not parts
//   });
import { register } from './registry.mjs';

export function place(id, { label = id, size = null, spawns = {}, build, help = '' }) {
  if (!/^[a-z][a-z0-9-]{0,39}$/.test(id)) throw new Error(`place: "${id}" is not a place name (lower case, digits, dashes)`);
  if (typeof build !== 'function') throw new Error(`place ${id}: no build function`);
  const P = {
    id, label, size, spawns, help,
    drive: `tests/${id}.json`,
    build(ctx = {}) {
      const root = build(ctx);
      if (!root?.isObject3D) throw new Error(`place ${id}: build returned ${root}, not an Object3D`);
      root.userData.place = id;
      return root;
    }
  };
  register('places', id, P);
  return P;
}

/** Imports every file in places/ (the server lists them; a static copy of the game lists them in places/index.json). */
export async function loadPlaces(base = 'places/') {
  let files;
  try {
    const r = await fetch('__list/places', { cache: 'no-store' });
    if (!r.ok) throw new Error();
    files = await r.json();
  } catch {
    files = await (await fetch(`${base}index.json`)).json();
  }
  const here = new URL(base, location.href);
  await Promise.all(files.filter((f) => f.endsWith('.mjs') || f.endsWith('.js')).map((f) => import(new URL(f, here).href)));
}
