/**
 * P108 IW-007 (session 5, lane A) — the animals: the shop's Animals shelf (shut until a refuge on her land is finished), an
 * animal bought and named on the purchase card, and the words the shop says about them.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * | piece | where it is read | the question it answers |
 * |---|---|---|
 * | {@link IW7A_SHOP_SHARED} | appended to the shop's shared script (iw006Shop.ts `SHOP_SHARED`), so every shop script has it | is the Animals shelf open (a FINISHED refuge on her land)? is a place of a pen free? the name an animal takes when she types none; the shut line; the card's refusal; the line after Buy |
 * | {@link IW7A_DEFAULT_NAMES} | the shop card (placeholder) and Buy (the name when the box is empty) | an animal's name when she gives none: the kind's own name, numbered when one already wears it |
 *
 * The rules (IW-007 §2, brief §4.3 "The Animals tab (A)"):
 * - **Shut until a refuge is finished.** The Animals tab sells nothing and says one line ("Build the refuge first…")
 *   until a refuge on her land has every material (`buildingDone`, SAVE_HELPERS) — the same test `buyItem` makes, so the
 *   shelf never offers what Buy would refuse with `refuge`.
 * - **Open:** the two animals, each a card. Its purchase card has the copy's name box (an empty box takes the default
 *   name, as a robot copy's does); a pen with no free place says so (`pen`) and has no Buy.
 * - **Bought:** the card says who is waiting by her bowl on her land (the bowl starts empty — `buyItem` pushes `fed 0`).
 *
 * Words: every key is `iw7a…` (cg003Content PAGE_WORDS, lane A's block). 🔴 No backtick and no dollar-brace inside the
 * script text.
 *
 * @module noodl-mcp/tests/iw007Animals
 */
import { ANIMALS } from './cg002Content';

/** An animal's name when she types none (EN / FR), per kind; numbered when one already wears it ("Hazel 2"). */
export const IW7A_DEFAULT_NAMES: Readonly<Record<string, { en: string; fr: string }>> = {
  rabbit: { en: 'Hazel', fr: 'Noisette' },
  sheep: { en: 'Cloud', fr: 'Nuage' }
};

/** What the shop scripts share about animals (appended to iw006Shop's SHOP_SHARED; SAVE_HELPERS is always above it). */
export const IW7A_SHOP_SHARED = `
// ── P108 IW-007 (lane A): the Animals shelf ──
var IW7A_DEFAULT_NAMES = ${JSON.stringify(IW7A_DEFAULT_NAMES)};
var IW7A_KINDS = ${JSON.stringify(ANIMALS.map((a) => a.id))};
/** Her land's finished refuges (a building whose blueprint does 'animals' and has every material). */
function iw7aRefuges(p) {
  var out = [];
  if (!p || !p.island) return out;
  var land = landOf(p.island.land);
  for (var i = 0; i < land.buildings.length; i++) { var spec = blueprintSpec(land.buildings[i].bp); if (spec && spec.does === 'animals' && spec.pen && buildingDone(land.buildings[i])) out.push(land.buildings[i]); }
  return out;
}
/** The Animals shelf is open: a refuge on her land is finished (buyItem's own test for 'refuge'). */
function iw7aOpen(p) { return iw7aRefuges(p).length > 0; }
/** A free place in a finished refuge's pen (buyItem's own test for 'pen'). */
function iw7aPenFree(p) {
  var rs = iw7aRefuges(p), land = landOf(p && p.island ? p.island.land : null);
  for (var i = 0; i < rs.length; i++) {
    var spec = blueprintSpec(rs[i].bp);
    for (var s = 0; s < spec.pen; s++) { var used = false; for (var a = 0; a < land.animals.length; a++) if (land.animals[a].at === rs[i].id && land.animals[a].slot === s) used = true; if (!used) return true; }
  }
  return false;
}
/** Does the shop show this animal? Only once the shelf is open. */
function iw7aShows(p, it) { return !!it && it.kind === 'animal' && IW7A_KINDS.indexOf(it.animal) !== -1 && iw7aOpen(p); }
/** The name an animal of this kind takes when she types none: the kind's name in her language, numbered when taken. */
function iw7aDefaultName(p, kind) {
  var names = IW7A_DEFAULT_NAMES[kind];
  if (!names) return '';
  var base = names[p && p.lang === 'fr' ? 'fr' : 'en'], taken = {};
  var land = landOf(p && p.island ? p.island.land : null);
  for (var a = 0; a < land.animals.length; a++) taken[land.animals[a].name] = 1;
  if (!taken[base]) return base;
  for (var n = 2; n < 99; n++) if (!taken[base + ' ' + n]) return base + ' ' + n;
  return base;
}
/** The line an open tab says: the Animals tab, shut, says build the refuge first; open, nothing. Other tabs as they were. */
function iw7aLater(tab, later, p, W) {
  if (tab !== 'animals') return later;
  return iw7aOpen(p) ? '' : W.iw7aShut || later;
}
/** Why an animal's card has no Buy ('' when it may be bought): no finished refuge, or every place of its pen taken. */
function iw7aRefusal(p, W) {
  if (!iw7aOpen(p)) return W.iw7aNoRefuge || '';
  if (!iw7aPenFree(p)) return W.iw7aPenFull || '';
  return '';
}
/** The line after Buy: the newest animal of that kind is waiting by her bowl on her land. */
function iw7aBoughtLine(p, it, W) {
  var land = landOf(p && p.island ? p.island.land : null), last = null;
  for (var a = 0; a < land.animals.length; a++) if (land.animals[a].kind === it.animal) last = land.animals[a];
  if (!last) return '';
  var line = W['iw7aBought_' + it.animal] || W.iw7aBought_rabbit || '';
  return line.split('{name}').join(last.name || iw7aDefaultName(p, it.animal));
}
`;
