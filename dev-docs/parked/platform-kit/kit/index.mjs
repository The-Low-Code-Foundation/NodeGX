// The play kit, in one import:
//   import { knobs, num, on, colour, pick, model, place, loadPlaces, loadDesigns, expose, loadPeople, makeCrowd } from '../kit/index.mjs';
export { knobs, num, int, on, colour, text, pick, show } from './knobs.mjs';
export { model, tag, partOf } from './model.mjs';
export { place, loadPlaces } from './place.mjs';
export { loadDesigns, reloadDesigns, saveKnobs, readDesign, writeDesign } from './design.mjs';
export { registry, register, what } from './registry.mjs';
export { expose } from './checks.mjs';
export { loadPeople, makeCrowd, PARTS } from './people.mjs';
export { strings, loadStrings, say } from './strings.mjs';
