/**
 * P108 IW-007 (session-5 base) — her land: what stands on it, where a blueprint may go, the job its robots work, and what
 * the island writes back. Written by the session-5 orchestrator BEFORE the lanes (B building, A animals); both lanes build
 * on these and never reshape them (add beside them, in your own file, and name it in your final message).
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * | helper | the question it answers |
 * |---|---|
 * | `landParts(b)` | a building's part tiles (plot coordinates), one per material: '{ x, y, item, need }' |
 * | `landPen(b)` | a refuge's pen tiles (the row below it), one per animal place: '{ x, y, slot }' |
 * | `landThings(land)` | the land's things: its three sources (LAND_SOURCES), every building's parts as `site` things (`of` the building, `build` its blueprint, `keep`), every animal's bowl at its pen place (`animal`, `name`, item its food, count = fed) |
 * | `landJob(land)` | the job its robots work: every part and every bowl a target (a finished building's parts stay full: they count as done), home LAND_HOME, and (P108 s7) `rest` — the spa's id and a tile per robot in front of it — or null when nothing stands there |
 * | `landRestTiles(land, b)` | (P108 s7) up to two free, reachable grass tiles in front of building b, facing it |
 * | `landRequest(land)` | the land as a request the island and the Workshop read like any other: id LAND_ID, plot LAND_PLOT, map LAND_MAP, its things and job, goal job_done, no reference program |
 * | `landLegal(land, bp, x, y)` | '' when the blueprint may go there (the ghost is green), else why: 'unknown' · 'built' (that blueprint stands already) · 'edge' · 'ground' (not grass) · 'taken' (a thing, home, or another building or its pen) · 'reach' (a robot could not reach a part or a pen place from home, or a source or another building would be cut off) |
 * | `landPlace(land, bp, x, y, id)` | the ghost placed: '{ ok, error, id }' — error is landLegal's; the building starts with nothing delivered |
 * | `landKeep(land, things)` | the island's things written back onto the land: a part's have only ever rises (a building never un-builds, AC3); an animal's fed follows her bowl; (P108 s8) a source's left follows the island's (`land.left`, which `landThings` lays); true when anything changed |
 *
 * Every script that uses these includes ENGINE (worldOf, blocked, the stage) and SAVE_HELPERS (landOf, blueprintSpec,
 * animalSpec, buildingDone) first: `${ENGINE}${SAVE_HELPERS}${LAND_HELPERS}` (LAND_SCRIPT below is exactly that).
 *
 * 🔴 No backtick and no dollar-brace inside the script text (it is a template literal).
 *
 * @module noodl-mcp/tests/iw007Land
 */
import { ANIMALS, LAND_HOME, LAND_ID, LAND_MAP, LAND_PLOT, LAND_SOURCES } from './cg002Content';
import { ENGINE, SAVE_HELPERS } from './cg002Scripts';

export const LAND_HELPERS = `
var LAND_ID = ${JSON.stringify(LAND_ID)};
var LAND_PLOT = ${JSON.stringify(LAND_PLOT)};
var LAND_MAP = ${JSON.stringify(LAND_MAP)};
var LAND_HOME = ${JSON.stringify(LAND_HOME)};
var LAND_SOURCES = ${JSON.stringify(LAND_SOURCES)};
var LAND_FOOD = ${JSON.stringify(Object.fromEntries(ANIMALS.map((a) => [a.id, a.eats])))};
function landParts(b) {
  var spec = b ? blueprintSpec(b.bp) : null, out = [];
  if (!spec) return out;
  for (var i = 0; i < spec.parts.length; i++) out.push({ x: Number(b.x) + spec.parts[i].dx, y: Number(b.y), item: spec.parts[i].item, need: spec.parts[i].need });
  return out;
}
function landPen(b) {
  var spec = b ? blueprintSpec(b.bp) : null, out = [];
  if (!spec || !spec.pen) return out;
  for (var i = 0; i < spec.pen; i++) out.push({ x: Number(b.x) + i, y: Number(b.y) + 1, slot: i });
  return out;
}
function landThings(raw) {
  var land = landOf(raw), out = JSON.parse(JSON.stringify(LAND_SOURCES));
  // P108 s8: each source as the island last left it (land.left, landKeep), so the Workshop shows the real amount.
  if (land.left) for (var sl = 0; sl < out.length; sl++) if (land.left[out[sl].id] !== undefined) out[sl].left = land.left[out[sl].id];
  for (var i = 0; i < land.buildings.length; i++) {
    var b = land.buildings[i], parts = landParts(b);
    for (var k = 0; k < parts.length; k++) out.push({ kind: 'site', id: b.id + '-' + parts[k].item, of: b.id, build: b.bp, keep: true, item: parts[k].item, need: parts[k].need, have: Number(b.have[parts[k].item]) || 0, x: parts[k].x, y: parts[k].y });
  }
  for (var j = 0; j < land.animals.length; j++) {
    var a = land.animals[j], spec = animalSpec(a.kind), home = null;
    for (var q = 0; q < land.buildings.length; q++) if (land.buildings[q].id === a.at) home = land.buildings[q];
    var pen = landPen(home), at = null;
    for (var s = 0; s < pen.length; s++) if (pen[s].slot === a.slot) at = pen[s];
    if (!at || !spec) continue;
    out.push({ kind: 'bowl', id: a.id, item: LAND_FOOD[a.kind] || spec.eats, capacity: spec.capacity, count: a.fed, food: a.fed, animal: a.kind, name: a.name, x: at.x, y: at.y });
  }
  return out;
}
function landJob(raw) {
  var things = landThings(raw), targets = [];
  for (var i = 0; i < things.length; i++) if (things[i].kind === 'site' || (things[i].kind === 'bowl' && things[i].animal)) targets.push(String(things[i].id));
  if (!targets.length) return null;
  var job = { targets: targets, home: { x: LAND_HOME.x, y: LAND_HOME.y, d: LAND_HOME.d } };
  // P108 s7: a building that is for resting (the spa, does 'rest') gives its robots a tile each in front of it; the engine
  // walks them there once it is finished (restOf).
  var land = landOf(raw);
  for (var b = 0; b < land.buildings.length && !job.rest; b++) {
    var spec = blueprintSpec(land.buildings[b].bp);
    if (!spec || spec.does !== 'rest') continue;
    var tiles = landRestTiles(land, land.buildings[b]);
    if (tiles.length) job.rest = { of: String(land.buildings[b].id), tiles: tiles };
  }
  return job;
}
/**
 * P108 s7: where robots rest at a building — up to two grass tiles a robot can reach, nothing on them and no pen. First
 * two rows in front of it, one tile out at each end (on the 2D island a robot is ~2½ tiles wide: on the row right under
 * the building the two robots hid it and each other — seen on the touch drive's shot); then under each part, over each
 * part, its two ends. Plot coordinates, d facing it.
 */
function landRestTiles(land, b) {
  var parts = landParts(b), cand = [];
  if (parts.length) { cand.push({ x: parts[0].x - 1, y: parts[0].y + 2, d: 0 }); cand.push({ x: parts[parts.length - 1].x + 1, y: parts[0].y + 2, d: 0 }); }
  for (var i = 0; i < parts.length; i++) cand.push({ x: parts[i].x, y: parts[i].y + 1, d: 0 });
  for (var j = 0; j < parts.length; j++) cand.push({ x: parts[j].x, y: parts[j].y - 1, d: 2 });
  if (parts.length) { cand.push({ x: parts[0].x - 1, y: parts[0].y, d: 1 }); cand.push({ x: parts[parts.length - 1].x + 1, y: parts[0].y, d: 3 }); }
  var things = landThings(land), taken = {};
  for (var t = 0; t < things.length; t++) taken[things[t].x + ',' + things[t].y] = 1;
  for (var o = 0; o < land.buildings.length; o++) { var pen = landPen(land.buildings[o]); for (var p = 0; p < pen.length; p++) taken[pen[p].x + ',' + pen[p].y] = 1; }
  taken[LAND_HOME.x + ',' + LAND_HOME.y] = 1;
  var seen = landReach(worldOf({ map: LAND_MAP.slice(), things: things, robots: [] })), out = [];
  for (var c = 0; c < cand.length && out.length < 2; c++) {
    var x = cand[c].x, y = cand[c].y, k = x + ',' + y;
    if (!(x >= 0 && y >= 0 && x < LAND_W && y < LAND_H) || String(LAND_MAP[y]).charAt(x) !== 'G' || taken[k] || !seen[k]) continue;
    taken[k] = 1;
    out.push(cand[c]);
  }
  return out;
}
function landRequest(raw) {
  var job = landJob(raw), req = { id: LAND_ID, islander: '', band: 1, plot: { x: LAND_PLOT.x, y: LAND_PLOT.y }, tricks: [], map: LAND_MAP.slice(), things: landThings(raw), robotStart: { x: LAND_HOME.x, y: LAND_HOME.y, d: LAND_HOME.d }, goal: { name: 'job_done' }, palette: [], referenceProgram: [] };
  if (job) req.job = job;
  return req;
}
/** The tiles a robot can stand on, reached from home (breadth first over tiles that do not block). */
function landReach(w) {
  var seen = {}, q = [[LAND_HOME.x, LAND_HOME.y]], head = 0;
  seen[LAND_HOME.x + ',' + LAND_HOME.y] = 1;
  while (head < q.length) {
    var c = q[head++];
    for (var d = 0; d < 4; d++) { var nx = c[0] + DX[d], ny = c[1] + DY[d], k = nx + ',' + ny; if (seen[k] || blocked(w, nx, ny)) continue; seen[k] = 1; q.push([nx, ny]); }
  }
  return seen;
}
function landBeside(seen, x, y) { for (var d = 0; d < 4; d++) if (seen[(x + DX[d]) + ',' + (y + DY[d])]) return true; return false; }
function landLegal(raw, bp, x, y) {
  var land = landOf(raw), spec = blueprintSpec(bp);
  if (!spec) return 'unknown';
  for (var i = 0; i < land.buildings.length; i++) if (land.buildings[i].bp === spec.id) return 'built';
  var b = { id: '?', bp: spec.id, x: Math.floor(Number(x)), y: Math.floor(Number(y)), have: {} };
  var tiles = landParts(b).concat(landPen(b));
  var things = landThings(land), taken = {};
  for (var t = 0; t < things.length; t++) taken[things[t].x + ',' + things[t].y] = 1;
  for (var o = 0; o < land.buildings.length; o++) { var pen = landPen(land.buildings[o]); for (var p = 0; p < pen.length; p++) taken[pen[p].x + ',' + pen[p].y] = 1; }
  taken[LAND_HOME.x + ',' + LAND_HOME.y] = 1;
  for (var k = 0; k < tiles.length; k++) {
    var tx = tiles[k].x, ty = tiles[k].y;
    if (!(tx >= 0 && ty >= 0 && tx < LAND_W && ty < LAND_H)) return 'edge';
    if (String(LAND_MAP[ty]).charAt(tx) !== 'G') return 'ground';
    if (taken[tx + ',' + ty]) return 'taken';
  }
  // Placed (its pen places counted as standing too: an animal's bowl will), can a robot from home still reach every part,
  // every pen place, every source and every other building's part?
  land.buildings.push(b);
  var after = landThings(land);
  var w = worldOf({ map: LAND_MAP.slice(), things: after.concat(landPen(b).map(function (pp) { return { kind: 'bowl', x: pp.x, y: pp.y }; })), robots: [] });
  var seen = landReach(w);
  for (var a = 0; a < after.length; a++) if (!landBeside(seen, after[a].x, after[a].y)) return 'reach';
  var penB = landPen(b);
  for (var pb = 0; pb < penB.length; pb++) if (!landBeside(seen, penB[pb].x, penB[pb].y)) return 'reach';
  return '';
}
function landPlace(raw, bp, x, y, id) {
  var why = landLegal(raw, bp, x, y);
  if (why) return { ok: false, error: why, id: '' };
  var nid = typeof id === 'string' && id ? id.slice(0, 40) : newId('b');
  var spec = blueprintSpec(bp), have = {};
  for (var i = 0; i < spec.parts.length; i++) have[spec.parts[i].item] = 0;
  raw.buildings = Array.isArray(raw.buildings) ? raw.buildings : [];
  raw.animals = Array.isArray(raw.animals) ? raw.animals : [];
  raw.buildings.push({ id: nid, bp: spec.id, x: Math.floor(Number(x)), y: Math.floor(Number(y)), have: have });
  return { ok: true, error: '', id: nid };
}
function landKeep(raw, things) {
  var list = Array.isArray(things) ? things : [], changed = false;
  var bs = raw && Array.isArray(raw.buildings) ? raw.buildings : [], as = raw && Array.isArray(raw.animals) ? raw.animals : [];
  for (var i = 0; i < list.length; i++) {
    var t = list[i];
    if (!t) continue;
    if (t.kind === 'site' && isSet(t.of)) for (var b = 0; b < bs.length; b++) {
      if (bs[b].id !== String(t.of)) continue;
      var h = Math.floor(Number(t.have)) || 0, was = Math.floor(Number(bs[b].have && bs[b].have[t.item])) || 0;
      if (!bs[b].have) bs[b].have = {};
      if (h > was) { bs[b].have[t.item] = Math.min(h, Number(t.need) || h); changed = true; }
    }
    if (t.kind === 'bowl' && t.animal) for (var a = 0; a < as.length; a++) {
      if (as[a].id !== String(t.id)) continue;
      var f = Math.max(0, Math.floor(Number(t.count)) || 0);
      if (f !== Number(as[a].fed)) { as[a].fed = f; changed = true; }
    }
    // P108 s8: a source's left follows the island's (mined down, grown back), for the Workshop's land (landThings).
    if (isSet(t.id) && String(t.id) === t.kind && LAND_LEFT_MAX[t.kind] !== undefined && t.left !== undefined && raw) {
      var lv = Math.max(0, Math.floor(Number(t.left)) || 0);
      if (!raw.left || typeof raw.left !== 'object') raw.left = {};
      if (raw.left[String(t.id)] !== lv) { raw.left[String(t.id)] = lv; changed = true; }
    }
  }
  return changed;
}
`;

/** ENGINE + SAVE_HELPERS + LAND_HELPERS: what a spec's `helper(LAND_SCRIPT, 'landLegal', …)` evaluates. */
export const LAND_SCRIPT = `${ENGINE}${SAVE_HELPERS}${LAND_HELPERS}`;
