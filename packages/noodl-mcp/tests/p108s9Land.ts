/**
 * P108 session 9 — a building, once built, stays built (Richard, 2026-10-03, after the children played on the tablets):
 *
 *   "when you get the robots to build a building, it doesn't show as built until you go back to the island and return to
 *   the plot of land. And sometimes it even goes back to being unbuilt … Once built, they should be permanent and out of
 *   the game modes."
 *
 * ## What was measured (the code, s9)
 *
 * - The Workshop on her land never wrote a part to her save: only the island tick did (`Island keep` → `landKeep`). Each
 *   Play and each Start over began again from the land as the save held it, so what a robot built in the Workshop was
 *   gone at the next Play, and came back only once her robots had rebuilt it on the island.
 * - The island keeps its running state across pages (`gardenIsland`, global by name) and goes on from it whenever the
 *   build is the same — and the build never moves with a part's `have` (iw7bLandKey: which buildings stand where). So a
 *   part her save gained elsewhere was drawn unbuilt on a kept island.
 *
 * ## The rule now
 *
 * - **The Workshop writes each part the moment it is delivered** (`Logic/Land keep here`, after every runner tick on her
 *   land): a part's `have` only ever rises (landKeep's own rule, buildings only — the sources and the bowls stay the
 *   island's).
 * - **The Workshop starts from what her save holds** (`Logic/Land start` for the drawn start, `Logic/Land lift` for the
 *   runner, the pad and Teach): every part lifted to her save's `have`, with its stage and its building's. Start world
 *   itself is untouched, so a write never resets the Workshop (it would clear her program).
 * - **The island lifts its kept land the same way** (`iw9LiftLand` in Island world, after the kept state is taken).
 *
 * 🔴 No backtick and no dollar-brace inside any script text (README §7): these are template literals.
 *
 * @module noodl-mcp/tests/p108s9Land
 */
import { LAND_ID } from './cg002Content';
import { ENGINE, SAVE_HELPERS } from './cg002Scripts';
import { LAND_HELPERS } from './iw007Land';

/**
 * The two helpers (after ENGINE and SAVE_HELPERS: landOf, isSet, stageOf, restage):
 * `iw9LiftLand(things, land)` lifts every building part in `things` to her save's have (never lowers one), its stage and
 * its building's stage with it — true when anything rose; `iw9KeepBuilt(land, things)` writes the parts in `things` onto
 * her save's land, a part's have only rising — true when anything rose.
 */
export const LAND_LIFT = `
// ── P108 s9: a building, once built, stays built ──
var IW9_LAND_ID = ${JSON.stringify(LAND_ID)};
function iw9LiftLand(things, rawLand) {
  if (!Array.isArray(things) || !rawLand) return false;
  var land = landOf(rawLand), have = {}, lifted = false;
  for (var i = 0; i < land.buildings.length; i++) { var b = land.buildings[i]; for (var k in b.have) have[b.id + '-' + k] = Number(b.have[k]) || 0; }
  for (var j = 0; j < things.length; j++) {
    var t = things[j];
    if (!t || t.kind !== 'site' || !isSet(t.of)) continue;
    var h = have[String(t.id)];
    if (h !== undefined && h > (Number(t.have) || 0)) { t.have = Math.min(h, Number(t.need) || h); t.stage = stageOf(t); lifted = true; }
  }
  if (lifted) restage({ things: things });
  return lifted;
}
function iw9KeepBuilt(raw, things) {
  var list = Array.isArray(things) ? things : [], bs = raw && Array.isArray(raw.buildings) ? raw.buildings : [], rose = false;
  for (var i = 0; i < list.length; i++) {
    var t = list[i];
    if (!t || t.kind !== 'site' || !isSet(t.of)) continue;
    for (var b = 0; b < bs.length; b++) {
      if (bs[b].id !== String(t.of)) continue;
      var h = Math.floor(Number(t.have)) || 0, was = Math.floor(Number(bs[b].have && bs[b].have[t.item])) || 0;
      if (!bs[b].have) bs[b].have = {};
      if (h > was) { bs[b].have[t.item] = Math.min(h, Number(t.need) || h); rose = true; }
    }
  }
  return rose;
}
`;

/**
 * `Logic/Land keep here` (go: after each runner tick) — on her land, the parts the run has delivered written into HER save.
 * Inputs: `model` (the store's), `requestId` (the Workshop's), `world` (the runner's). `wrote` says the model is to be
 * written (Model is set only then).
 */
export const LAND_KEEP_HERE_SCRIPT = `${ENGINE}${SAVE_HELPERS}${LAND_HELPERS}${LAND_LIFT}
var w = Inputs.world && typeof Inputs.world === 'object' ? Inputs.world : null;
var wrote = false;
if (String(Inputs.requestId || '') === IW9_LAND_ID && w && Array.isArray(w.things)) {
  var model = modelOf(Inputs.model), p = null;
  for (var j = 0; j < model.profiles.length; j++) if (model.profiles[j].id === model.island.activeId) p = model.profiles[j];
  if (p && p.island.land && iw9KeepBuilt(p.island.land, w.things)) { Outputs.model = model; wrote = true; }
}
Outputs.wrote = wrote;
`;

/**
 * `Logic/Land start` (go: after Start world) and `Logic/Land lift` (runs when an input changes) — the Workshop's start
 * world, on her land with every part lifted to what her save holds. Any other request: the world as it came.
 * Inputs: `world` (Start world's), `requestId`, `land` (her save's land, Read family's).
 */
export const LAND_START_SCRIPT = `${ENGINE}${SAVE_HELPERS}${LAND_HELPERS}${LAND_LIFT}
var w = Inputs.world && typeof Inputs.world === 'object' ? JSON.parse(JSON.stringify(Inputs.world)) : null;
if (w && String(Inputs.requestId || '') === IW9_LAND_ID && Inputs.land) iw9LiftLand(w.things, Inputs.land);
Outputs.world = w;
`;

/** Session 9's glue scripts, registered at the END of GLUE_SCRIPTS (cg003Scripts). */
export const P108S9_LAND_SCRIPTS: ReadonlyArray<{ component: string; script: string; seam: string }> = [
  { component: 'Logic/Land keep here', script: LAND_KEEP_HERE_SCRIPT, seam: 'on her land, each part the Workshop’s robot delivered written into her save at once (a building never un-builds)' },
  { component: 'Logic/Land start', script: LAND_START_SCRIPT, seam: 'the Workshop’s start on her land, every part lifted to what her save holds (after Start world)' },
  { component: 'Logic/Land lift', script: LAND_START_SCRIPT, seam: 'the world the runner, the pad and Teach start from on her land, every part lifted to what her save holds' }
];
