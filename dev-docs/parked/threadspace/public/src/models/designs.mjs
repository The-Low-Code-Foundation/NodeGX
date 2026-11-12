// The designs the shipyard saved: `public/ships/<id>.json` = { values, savedAt }, only the values that differ from the
// model's defaults. The game reads them once, when it loads; no file is the model as declared. `?design=default` in the
// game's URL ignores the file (for a drive that must see the declared ship whatever was saved).

import { resolve } from './model.mjs';
import { readDesign } from './store.mjs';
import { model as kestrel, build as buildKestrel } from './kestrel.mjs';

async function load(id) {
  if (new URLSearchParams(location.search).get('design') === 'default') return {};
  return readDesign(id);
}

export const saved = { kestrel: await load('kestrel') };

/** Reads the file again (the shipyard saved while the game was open). True when it changed. */
export async function reloadDesigns() {
  const next = await load('kestrel');
  const changed = JSON.stringify(next) !== JSON.stringify(saved.kestrel);
  saved.kestrel = next;
  return changed;
}

/** The Kestrel's values as saved, with the game's own choices (the paint shop, the engine colour) over them. */
export function kestrelValues(over = {}) {
  return resolve(kestrel, { ...saved.kestrel, ...over });
}

export { buildKestrel };
