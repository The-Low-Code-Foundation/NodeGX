// A model: a thing a person could point at, built from named parts. Each part is a function that builds it, and every
// mesh it makes carries the part's name, so "that bit" is always a name from the scene, never a guess at a mesh:
//
//   const S = knobs('rat', { tail: num(0.3, [0.1, 0.8], 'm', 'Tail length'), … });
//   export const rat = model('rat', {
//     help: 'An irradiated rat. Swims, climbs, bites.',
//     knobs: S,
//     parts: { body: (S) => …, tail: (S) => …, eyes: (S) => … },   // each returns an Object3D
//   });
//   const r = rat.build();      // a Group; r.userData.model === 'rat'
//   rat.live(r);                // rebuilds its parts in place whenever one of its knobs changes
//
// A part can be another model (`parts: { exhaust: (S) => smoke.build() }`): its meshes keep their own part names
// under this one's ("exhaust.plume"). To replace how a part is made, give it a new builder under the same name;
// nothing outside it moves.
import * as THREE from 'three';
import { register } from './registry.mjs';

/** Puts a part's name on every mesh under `object` (and on the object itself). */
export function tag(object, part) {
  object.userData.part = object.userData.part ? `${part}.${object.userData.part}` : part;
  object.traverse((o) => {
    if (o === object) return;
    if (o.isMesh || o.isPoints || o.isLine || o.isSprite) o.userData.part = o.userData.part ? `${part}.${o.userData.part}` : part;
  });
  return object;
}

/** The part a scene object belongs to, and the model: { model, part } or null. */
export function partOf(object) {
  let part = null;
  for (let o = object; o; o = o.parent) {
    part ??= o.userData.part ?? null;
    if (o.userData.model) return { model: o.userData.model, part };
  }
  return part ? { model: null, part } : null;
}

function dispose(object) {
  object.traverse((o) => {
    o.geometry?.dispose();
    for (const m of [o.material ?? []].flat()) m.dispose?.();
  });
}

export function model(id, { parts, knobs: S = null, help = '', checks = [] }) {
  if (!/^[a-z][a-z0-9-]{0,39}$/.test(id)) throw new Error(`model: "${id}" is not a model name (lower case, digits, dashes)`);
  if (!parts || !Object.keys(parts).length) throw new Error(`model ${id}: no parts`);
  for (const [name, fn] of Object.entries(parts)) if (typeof fn !== 'function') throw new Error(`model ${id}: part "${name}" is not a builder function`);
  const buildPart = (name, ctx) => {
    const object = parts[name](S, ctx);
    if (!object?.isObject3D) throw new Error(`model ${id}: part "${name}" built ${object}, not an Object3D`);
    return tag(object, name);
  };
  const M = {
    id, help, parts, knobs: S, checks,
    /** A Group with every part in it, each tagged. `ctx` reaches every builder (the game's own choices). */
    build(ctx = {}) {
      const root = new THREE.Group();
      root.name = id;
      root.userData.model = id;
      root.userData.ctx = ctx;
      for (const name of Object.keys(parts)) root.add(buildPart(name, ctx));
      return root;
    },
    /** Rebuilds the parts of a built model in place (the knobs changed), keeping where it stands. */
    refit(root, only = null) {
      for (const child of [...root.children]) {
        const name = child.userData.part?.split('.')[0];
        if (!name || !(name in parts) || (only && !only.includes(name))) continue;
        const next = buildPart(name, root.userData.ctx);
        root.add(next);
        root.remove(child);
        dispose(child);
      }
    },
    /** Rebuilds `root` whenever this model's knobs change. Returns the function that stops it. */
    live(root) {
      return S ? S.$.onChange(() => M.refit(root)) : () => {};
    }
  };
  register('models', id, M);
  return M;
}
