/**
 * P108 IW-007 (session 5, lane B `iw007-build`) — building: her land on the island, the robots that work it, what the
 * island writes back, the Workshop on the land.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * ## What is here
 *
 * | name | the question it answers |
 * |---|---|
 * | {@link LAND_WORLD} | the island world's land helpers (SAVE_HELPERS + LAND_HELPERS + the lane's): the land as a plot of the island (`iw7bLandRequest`), what a rebuild keeps of its live job (`iw7bLandOnto`), the build key (`iw7bLandKey`), teach again on the land (`iw7bLandStale`) |
 * | {@link LAND_TICK} | the island tick's land rule: a drop that raises a building is a moment the save is written at (`iw7bDropMoment`) |
 * | {@link LAND_KEEP} | the Island keep's land write (`landKeep`, iw007Land — a building never un-builds) |
 * | {@link LAND_REQUEST_SCRIPT} (`Logic/Land request`) | the requests with her land as one more, for the Workshop (`gardenRequestId` = `land`) |
 *
 * ## The island contract (brief §4.2) as built
 *
 * - **Read family** outputs `land` (the active profile's `island.land`, or null).
 * - **Island world** takes `Inputs.land` and adds the land as a plot (id LAND_ID, at LAND_PLOT): drawn whether or not
 *   anything stands on it (the meadow and its three sources). Status: `working` when a robot of hers is pinned there AND
 *   something stands on it (a job); otherwise `open` — never `locked` (the land needs no robot kind and no band), never
 *   `won` (a Workshop win on the land pins a robot; the building rises on the island).
 * - **Working the land**: `plots[LAND_ID]` pinned like any plot; a second robot of ANY kind helps with `helps: LAND_ID`
 *   (the crew's same-kind rule is not applied on the land).
 * - **The live job after a rebuild** (a building placed, a robot sent): the land's buildings and bowls come from the land
 *   (the save's truth, kept by Island keep), the sources from the live job the save kept (their `left`, by id).
 * - **The build hash** moves with which buildings stand where and which animals are kept, never with `have` or `fed`.
 * - **Island keep** writes the land back with `landKeep` at every moment of the land plot; on the land a drop that raises
 *   a building is a moment too (each drop is saved: a reload never loses a wall).
 * - **Teach again on the land (`islStale`, decided here):** the land's job is shared, so no program wins it alone. The
 *   land plot is judged by its TEAM: it is stale when the job lacks something and NEITHER the pinned program NOR the
 *   helper's, each run alone to its end from the land as it stands, fills a single step of it (e.g. both carry planks to
 *   a spa whose planks are in, or both were taught for a building finished since). Then both robots wait at home and the
 *   card asks her to teach again; a program that fills even one step keeps its robot working.
 *
 * 🔴 No backtick and no dollar-brace inside any script text (README §7): these are template literals.
 *
 * @module noodl-mcp/tests/iw007Building
 */
import { LAND_ID } from './cg002Content';
import { SAVE_HELPERS } from './cg002Scripts';
import { LAND_HELPERS } from './iw007Land';

/** The blocks the land's Workshop offers (a carrying job: walk, pick, put, loop until a part is done). */
export const LAND_PALETTE: ReadonlyArray<string> = ['fwd', 'left', 'right', 'repeat', 'pick', 'put', 'until', 'go_nearest', 'go_to'];

/** The land as a request, shared by the island and the Workshop (needs SAVE_HELPERS + LAND_HELPERS before it). */
const LAND_REQUEST_FN = `
// ── P108 IW-007 (lane B): her land as a plot of the island and a request of the Workshop ──
var IW7B_PALETTE = ${JSON.stringify(LAND_PALETTE)};
function iw7bLandRequest(raw) {
  var req = landRequest(landOf(raw));
  req.needs = '';
  req.palette = IW7B_PALETTE.slice();
  req.copyKeys = { title: 'iw7bLandTitle', blurb: 'iw7bLandBlurb', line: 'iw7bLandLine', reward: '' };
  req.reward = null;
  return req;
}
`;

/** Island world: SAVE_HELPERS, LAND_HELPERS and the lane's helpers (ISLAND_ENGINE before it). */
export const LAND_WORLD = `${SAVE_HELPERS}${LAND_HELPERS}${LAND_REQUEST_FN}
/** What the build hash reads of her land: which buildings stand where, which animals live where — never have or fed. */
function iw7bLandKey(raw) {
  var l = landOf(raw), out = [];
  if (!l.buildings.length && !l.animals.length) return null;
  for (var i = 0; i < l.buildings.length; i++) out.push([l.buildings[i].id, l.buildings[i].bp, l.buildings[i].x, l.buildings[i].y]);
  for (var j = 0; j < l.animals.length; j++) out.push([l.animals[j].id, l.animals[j].kind, l.animals[j].name, l.animals[j].at, l.animals[j].slot]);
  return out;
}
/**
 * A land plot built from a save's live job: its buildings and bowls are the land's (laid from the save's land: what
 * Island keep wrote), its sources the live job's (how much each has left), anything new on the land added.
 */
function iw7bLandOnto(cur, laidThings) {
  if (!cur || !Array.isArray(laidThings)) return cur;
  var old = {}, list = Array.isArray(cur.things) ? cur.things : [];
  for (var i = 0; i < list.length; i++) if (list[i] && isSet(list[i].id)) old[String(list[i].id)] = list[i];
  var out = [];
  for (var j = 0; j < laidThings.length; j++) {
    var t = islClone(laidThings[j]), o = old[String(t.id)];
    if (o && SOURCE_ITEMS[t.kind] && o.kind === t.kind) { if (o.left !== undefined) t.left = o.left; }
    out.push(t);
  }
  cur.things = out;
  return cur;
}
/** The steps of a job one program fills, run alone to its end from this world (no Olive: the written answer). */
function iw7bFills(w0, prog, bot) {
  if (!Array.isArray(prog) || !prog.length || !bot) return 0;
  var w = { map: w0.map.slice(), things: islClone(w0.things), robots: [islClone(bot)], events: [], schedule: [], job: islClone(w0.job), seed: w0.seed };
  var end = runToEnd(prog, w, String(bot.id), 'en');
  return iw6Steps(iw6Gain({}, iw6Meters(worldOf(w)), iw6Meters(end.world)));
}
/** Teach again on the land: the job lacks something and neither robot's program, run alone, fills one step of it. */
function iw7bLandStale(plot, cur) {
  if (!plot || !plot.job || !cur) return false;
  var w0 = worldOf({ map: plot.map.slice(), things: islClone(cur.things), robots: [], job: islClone(plot.job), seed: Number(cur.seed) >>> 0 });
  if (jobDone(w0)) return false;
  if (iw7bFills(w0, plot.program, cur.robot) > 0) return false;
  if (plot.mate && cur.mate && iw7bFills(w0, plot.mate.program, cur.mate.robot) > 0) return false;
  return true;
}
`;

/** The island tick (appended to ISLAND_ENGINE): on her land, a drop that raises a building is a moment (Island keep writes it). */
export const LAND_TICK = `
// ── P108 IW-007 (lane B): her land on the island tick ──
var IW7B_LAND_ID = ${JSON.stringify(LAND_ID)};
function iw7bHaves(things) { var out = {}, l = Array.isArray(things) ? things : []; for (var i = 0; i < l.length; i++) { var t = l[i]; if (t && t.kind === 'site' && isSet(t.of)) out[String(t.id)] = meterOf(t).have; } return out; }
function iw7bDropMoment(cur, out) {
  if (!out || out === cur || out.moment) return out;
  var was = iw7bHaves(cur.things), now = iw7bHaves(out.things);
  for (var k in now) if (now[k] > (Number(was[k]) || 0)) { out.moment = true; break; }
  return out;
}
`;

/** The Island keep (appended after SAVE_HELPERS): landKeep and what it reads (ENGINE's isSet, the same rule). */
export const LAND_KEEP = `${LAND_HELPERS}
function isSet(v) { return v !== undefined && v !== null && v !== ''; }
`;

/**
 * `Logic/Land request` — the Workshop's requests with her land as one more (id LAND_ID: the land as it stands, its
 * sources, every part and bowl a target), so the Workshop opens the land like any plot (`gardenRequestId` = `land`).
 * Inputs: `requests` (the catalogue's), `land` (Read family's). Outputs: `requests`.
 */
export const LAND_REQUEST_SCRIPT = `${SAVE_HELPERS}${LAND_HELPERS}
function isSet(v) { return v !== undefined && v !== null && v !== ''; }
${LAND_REQUEST_FN}
var reqs = Array.isArray(Inputs.requests) ? Inputs.requests.slice() : [];
var out = [];
for (var i = 0; i < reqs.length; i++) if (reqs[i] && reqs[i].id !== LAND_ID) out.push(reqs[i]);
out.push(iw7bLandRequest(Inputs.land));
Outputs.requests = out;
`;

/** Lane B's glue scripts, registered at the END of GLUE_SCRIPTS (cg003Scripts). */
export const IW007_BUILD_SCRIPTS: ReadonlyArray<{ component: string; script: string; seam: string }> = [
  { component: 'Logic/Land request', script: LAND_REQUEST_SCRIPT, seam: 'the requests with her land as one more, so the Workshop opens the land like any plot' }
];
