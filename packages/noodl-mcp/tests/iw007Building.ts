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
import { ENGINE, SAVE_HELPERS } from './cg002Scripts';
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

// ── The Build tab (iw006Shop's rows and card include BUILD_SHOP after SAVE_HELPERS) ─────────────────────────────────

/**
 * The shop's blueprint rules: a blueprint she has not bought is sold like anything else; bought, its tag and card say
 * where it is — to place (tap her land), being built, built. Reads the land (SAVE_HELPERS' landOf, buildingDone).
 */
export const BUILD_SHOP = `
// ── P108 IW-007 (lane B): the Build tab ──
function iw7bBuiltOf(p, bp) { var l = landOf(p && p.island ? p.island.land : null); for (var i = 0; i < l.buildings.length; i++) if (l.buildings[i].bp === bp) return l.buildings[i]; return null; }
/** Where a blueprint she owns is: 'place' (bought, not placed), 'building', 'built' — '' when she does not own it. */
function iw7bBpState(p, it) {
  if (!p || !it || it.kind !== 'blueprint' || p.owned.indexOf(it.id) === -1) return '';
  var b = iw7bBuiltOf(p, it.blueprint);
  return !b ? 'place' : buildingDone(b) ? 'built' : 'building';
}
function iw7bBpTag(p, it, W) { var st = iw7bBpState(p, it); return st === 'place' ? W.iw7bTagPlace || '' : st === 'building' ? W.iw7bTagBuilding || '' : st === 'built' ? W.iw7bTagBuilt || '' : ''; }
function iw7bBpCardLine(p, it, W) { var st = iw7bBpState(p, it); return st === 'place' ? W.iw7bCardPlace || '' : st === 'building' ? W.iw7bCardBuilding || '' : st === 'built' ? W.iw7bCardBuilt || '' : ''; }
`;

// ── Placing a blueprint on her land, and the land's card ─────────────────────────────────────────────────────────

/** What the land card and the ghost share (ENGINE + SAVE_HELPERS + LAND_HELPERS before it). */
const PLACE_SHARED = `
// ── P108 IW-007 (lane B): placing ──
var IW7B_SHOP = SHOP;
function iw7bW(rows, lang) { var map = {}, list = Array.isArray(rows) ? rows : []; for (var i = 0; i < list.length; i++) if (list[i] && list[i].key) map[list[i].key] = String(list[i][lang] || list[i].en || ''); return map; }
function iw7bFill(text, vars) { var t = String(text || ''); for (var k in vars) t = t.split('{' + k + '}').join(String(vars[k])); return t; }
function iw7bActive(model) { for (var i = 0; i < model.profiles.length; i++) if (model.profiles[i].id === model.island.activeId) return model.profiles[i]; return null; }
function iw7bItemOf(bp) { for (var i = 0; i < IW7B_SHOP.length; i++) if (IW7B_SHOP[i].kind === 'blueprint' && IW7B_SHOP[i].blueprint === String(bp)) return IW7B_SHOP[i]; return null; }
/** The blueprints she owns and has not placed yet, in the shop's order. */
function iw7bToPlace(p) {
  var out = [], land = landOf(p && p.island ? p.island.land : null);
  for (var i = 0; i < IW7B_SHOP.length; i++) {
    var it = IW7B_SHOP[i];
    if (it.kind !== 'blueprint' || !p || p.owned.indexOf(it.id) === -1) continue;
    var placed = false;
    for (var b = 0; b < land.buildings.length; b++) if (land.buildings[b].bp === it.blueprint) placed = true;
    if (!placed) out.push(it.blueprint);
  }
  return out;
}
/** The ghost as the Variable holds it: '{ bp, x, y }' (plot coordinates), or none ('{ bp: "" }'). */
function iw7bGhostOf(v) { var g = v && typeof v === 'object' ? v : {}; return blueprintSpec(g.bp) ? { bp: String(g.bp), x: Math.floor(Number(g.x)) || 0, y: Math.floor(Number(g.y)) || 0 } : null; }
`;

/**
 * `Logic/Land card` — her land's part of the plot card (shown when the card is the land's): what stands on it (each
 * building, its stage and its materials), the blueprints she has to place (a chip each), and while a ghost is out, where
 * it is and why not there (EN + FR), and the ghost thing for the island to draw (island coordinates, ok or not).
 * Inputs: `requestId` (the card's plot), `model`, `ghost` (the Variable), `words`, `lang`.
 */
export const LAND_CARD_SCRIPT = `${ENGINE}${SAVE_HELPERS}${LAND_HELPERS}${PLACE_SHARED}
var lang = String(Inputs.lang) === 'fr' ? 'fr' : 'en', W = iw7bW(Inputs.words, lang);
var model = modelOf(Inputs.model && typeof Inputs.model === 'object' ? Inputs.model : {}), p = iw7bActive(model);
var land = landOf(p && p.island ? p.island.land : null);
var ghost = iw7bGhostOf(Inputs.ghost);
var STAGE_WORDS = ['iw7bStage0', 'iw7bStage1', 'iw7bStage2'];
var stands = [];
for (var i = 0; i < land.buildings.length; i++) {
  var b = land.buildings[i], spec = blueprintSpec(b.bp), it = iw7bItemOf(b.bp), have = 0, need = 0;
  for (var k = 0; k < spec.parts.length; k++) { need += spec.parts[k].need; have += Math.min(spec.parts[k].need, Number(b.have[spec.parts[k].item]) || 0); }
  var st = buildStage(have, need, spec.stages);
  var stage = st >= spec.stages - 1 ? W.iw7bStageDone || '' : W[STAGE_WORDS[Math.min(st, STAGE_WORDS.length - 1)]] || '';
  stands.push(iw7bFill(W.iw7bStands, { what: it ? it.name[lang] || it.name.en : b.bp, stage: stage, n: have, m: need }));
}
var toPlace = p ? iw7bToPlace(p) : [];
var chips = [];
for (var c = 0; c < toPlace.length; c++) { var ci = iw7bItemOf(toPlace[c]); chips.push({ id: 'landbp|' + toPlace[c], label: iw7bFill(W.iw7bPlaceChip, { what: ci ? ci.name[lang] || ci.name.en : toPlace[c] }), selected: !!ghost && ghost.bp === toPlace[c], locked: false }); }
var why = ghost ? landLegal(land, ghost.bp, ghost.x, ghost.y) : '';
var WHY = { edge: 'iw7bWhyEdge', ground: 'iw7bWhyGround', taken: 'iw7bWhyTaken', reach: 'iw7bWhyReach', built: 'iw7bWhyBuilt' };
var lines = stands.slice();
if (!land.buildings.length && !toPlace.length) lines.push(W.iw7bLandEmpty || '');
Outputs.show = String(Inputs.requestId || '') === LAND_ID;
Outputs.line = lines.join(' · ');
Outputs.chips = ghost ? [] : chips;
Outputs.showChips = !ghost && chips.length > 0;
Outputs.chipsLabel = W.iw7bLandToPlace || '';
Outputs.ghostShow = !!ghost;
Outputs.ghostOk = !!ghost && !why;
Outputs.ghostLine = !ghost ? '' : why ? iw7bFill(W.iw7bGhostNo, { why: W[WHY[why]] || why }) : W.iw7bGhostOk || '';
Outputs.why = why;
Outputs.putText = W.iw7bPutHere || '';
Outputs.cancelText = W.iw7bNotNow || '';
var gs = ghost ? blueprintSpec(ghost.bp) : null;
Outputs.ghostThing = ghost ? { kind: 'ghost', bp: ghost.bp, x: LAND_PLOT.x + ghost.x, y: LAND_PLOT.y + ghost.y, w: gs.parts.length, pen: gs.pen || 0, ok: !why, why: why } : null;
`;

/**
 * `Logic/Land ghost` (go) — the ghost of a blueprint on her land, by its `mode` (a parameter of each instance):
 * `start` (a chip: Bp is the chip's id — the ghost at the blueprint's spot), `move` (a tapped island tile: the ghost's
 * left part there, when the tile is on her land), `place` (landPlace where the ghost stands: written to her land, the
 * ghost gone — refused, nothing changes), `cancel`. Outputs `ghost` (for the Variable), `model`, `placed`, `ok`.
 */
export const LAND_GHOST_SCRIPT = `${ENGINE}${SAVE_HELPERS}${LAND_HELPERS}${PLACE_SHARED}
var mode = String(Inputs.mode || '');
var model = modelOf(Inputs.model && typeof Inputs.model === 'object' ? Inputs.model : {}), p = iw7bActive(model);
var ghost = iw7bGhostOf(Inputs.ghost), next = ghost, placed = '', ok = false;
if (mode === 'start' && p) {
  var raw = String(Inputs.bp || ''), bp = raw.slice(raw.lastIndexOf('|') + 1), todo = iw7bToPlace(p);
  if (todo.indexOf(bp) === -1) bp = todo.length ? todo[0] : '';
  var spec = blueprintSpec(bp);
  if (spec) { next = { bp: bp, x: spec.spot.x, y: spec.spot.y }; ok = true; }
} else if (mode === 'move' && ghost) {
  var lx = Math.floor(Number(Inputs.x)) - LAND_PLOT.x, ly = Math.floor(Number(Inputs.y)) - LAND_PLOT.y;
  if (lx >= 0 && ly >= 0 && lx < LAND_W && ly < LAND_H) { next = { bp: ghost.bp, x: lx, y: ly }; ok = true; }
} else if (mode === 'place' && ghost && p) {
  var land = p.island.land ? p.island.land : { buildings: [], animals: [] };
  var r = landPlace(land, ghost.bp, ghost.x, ghost.y);
  if (r.ok) { p.island.land = land; next = null; placed = ghost.bp; ok = true; }
} else if (mode === 'cancel') { next = null; ok = true; }
Outputs.ghost = next ? next : { bp: '' };
Outputs.model = model;
Outputs.placed = placed;
Outputs.ok = ok;
`;

/**
 * `Logic/With ghost` — the island's world with the ghost on it (the Land card's ghost thing), for Draw world, while Show
 * Ghost is on (a ghost is out); otherwise the world as it is.
 */
export const WITH_GHOST_SCRIPT = `
var w = Inputs.world && typeof Inputs.world === 'object' ? Inputs.world : null;
var g = Inputs.ghost && typeof Inputs.ghost === 'object' && Inputs.ghost.kind === 'ghost' ? Inputs.ghost : null;
if (w && g && Inputs.showGhost === true) {
  var out = {};
  for (var k in w) out[k] = w[k];
  out.things = (Array.isArray(w.things) ? w.things : []).concat([g]);
  Outputs.world = out;
} else Outputs.world = w;
`;

/** Lane B's glue scripts, registered at the END of GLUE_SCRIPTS (cg003Scripts). */
export const IW007_BUILD_SCRIPTS: ReadonlyArray<{ component: string; script: string; seam: string }> = [
  { component: 'Logic/Land request', script: LAND_REQUEST_SCRIPT, seam: 'the requests with her land as one more, so the Workshop opens the land like any plot' },
  { component: 'Logic/Land card', script: LAND_CARD_SCRIPT, seam: 'her land\u2019s card: what stands on it, the blueprints to place, where the ghost is and why not there' },
  { component: 'Logic/Land ghost', script: LAND_GHOST_SCRIPT, seam: 'a blueprint\u2019s ghost on her land: out, moved by a tap, placed where it is legal, or put away' },
  { component: 'Logic/With ghost', script: WITH_GHOST_SCRIPT, seam: 'the island\u2019s world with the ghost of a blueprint on it, for the drawing' }
];
