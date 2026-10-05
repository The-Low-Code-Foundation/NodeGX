var SAVE_VERSION = 5;
var MAX_PROFILES = 6;
var ROBOT_NAME_MAX = 16;
var CARDS_MAX = 64;
var TRICK_KEYS = ["n1","n2","n3","n4","n5","n6","n7"];
var FIRST_ROBOT_ID = "r1";
var ROBOTS = [{"id":"pip","defaultName":{"en":"Pip","fr":"Pip"},"colour":"#FF7A59","accessory":"can","palette":["water","fill","olive:read"],"canMax":3,"basket":4,"upgrade":"can+","lentBy":null,"unlockedBy":null},{"id":"cobble","defaultName":{"en":"Cobble","fr":"Cobble"},"colour":"#7A8CA3","accessory":"hod","palette":["pick","put"],"canMax":3,"basket":4,"upgrade":"basket+","lentBy":"sami","unlockedBy":"path-postbox"},{"id":"pocket","defaultName":{"en":"Pocket","fr":"Poche"},"colour":"#FFB347","accessory":"satchel","palette":["pick","put","say","olive:say-thanks","olive:read"],"canMax":3,"basket":6,"upgrade":"boots","lentBy":"biscuit","unlockedBy":"bowl-if"},{"id":"echo","defaultName":{"en":"Echo","fr":"Écho"},"colour":"#8F6BFF","accessory":"bell","palette":["water","fill","say","olive:read","olive:is-it-a","olive:say-thanks"],"canMax":3,"basket":4,"upgrade":"can+","lentBy":"mamie","unlockedBy":"mamie-note"}];
var UPGRADES = [{"id":"can+","from":"mamie","unlockedBy":"rows-trick","fits":["pip","echo"],"canMax":6},{"id":"basket+","from":"sami","unlockedBy":"path-stones","fits":["cobble"],"basket":8},{"id":"boots","from":"biscuit","unlockedBy":"wall-until","fits":["pocket"],"stepFactor":0.7}];
// P108 IW-006 / IW-008 (session-4 base): the economy's names.
var BRAIN_SIZE = 12;
var BRAIN_SIZES = [12,16,20];
var CREW_CAP = 12;
var SHOP = [{"id":"robot:pip","tab":"robots","price":30,"kind":"robot","robot":"pip","icon":"🤖","name":{"en":"A new Pip","fr":"Un nouveau Pip"},"line":{"en":"Another watering robot. You name it.","fr":"Un autre robot arroseur. Tu lui donnes un nom."}},{"id":"robot:cobble","tab":"robots","price":30,"kind":"robot","robot":"cobble","icon":"🪨","name":{"en":"A new Cobble","fr":"Un nouveau Cobble"},"line":{"en":"Another stone carrier. You name it.","fr":"Un autre porteur de pierres. Tu lui donnes un nom."}},{"id":"robot:pocket","tab":"robots","price":30,"kind":"robot","robot":"pocket","icon":"🎒","name":{"en":"A new Pocket","fr":"Un nouveau Poche"},"line":{"en":"Another carrier of letters and eggs.","fr":"Un autre porteur de lettres et d’œufs."}},{"id":"robot:echo","tab":"robots","price":30,"kind":"robot","robot":"echo","icon":"🔔","name":{"en":"A new Echo","fr":"Un nouvel Écho"},"line":{"en":"Another robot who asks Olive.","fr":"Un autre robot qui demande à Olive."}},{"id":"can+","tab":"upgrades","price":15,"kind":"upgrade","upgrade":"can+","icon":"🪣","name":{"en":"A bigger can","fr":"Un plus grand arrosoir"},"line":{"en":"Six pours instead of three.","fr":"Six arrosages au lieu de trois."}},{"id":"basket+","tab":"upgrades","price":15,"kind":"upgrade","upgrade":"basket+","icon":"🧺","name":{"en":"A bigger hod","fr":"Une plus grande hotte"},"line":{"en":"Cobble carries eight stones.","fr":"Cobble porte huit pierres."}},{"id":"boots","tab":"upgrades","price":15,"kind":"upgrade","upgrade":"boots","icon":"👢","name":{"en":"Quick boots","fr":"Des bottes rapides"},"line":{"en":"Pocket walks faster.","fr":"Poche marche plus vite."}},{"id":"brain16","tab":"upgrades","price":25,"kind":"brain","size":16,"icon":"🧠","name":{"en":"A bigger brain","fr":"Un plus grand cerveau"},"line":{"en":"One robot remembers 16 blocks.","fr":"Un robot retient 16 blocs."}},{"id":"brain20","tab":"upgrades","price":40,"kind":"brain","size":20,"icon":"🧠","name":{"en":"The biggest brain","fr":"Le plus grand cerveau"},"line":{"en":"One robot remembers 20 blocks.","fr":"Un robot retient 20 blocs."}},{"id":"rain","tab":"helpers","price":6,"kind":"helper","helper":"rain","icon":"🌧️","name":{"en":"A rain cloud","fr":"Un nuage de pluie"},"line":{"en":"Waters every tulip on one plot, once.","fr":"Arrose toutes les tulipes d’un terrain, une fois."}},{"id":"selfcan","tab":"helpers","price":8,"kind":"helper","helper":"selfcan","icon":"✨","name":{"en":"A self-filling can","fr":"Un arrosoir magique"},"line":{"en":"Never needs the pond, for one job.","fr":"Jamais besoin de la mare, pour un travail."}},{"id":"barrow","tab":"helpers","price":10,"kind":"helper","helper":"barrow","icon":"🛒","name":{"en":"A wheelbarrow","fr":"Une brouette"},"line":{"en":"Carries eight, for one job.","fr":"Porte huit choses, pour un travail."}},{"id":"spa","tab":"build","price":30,"kind":"blueprint","blueprint":"spa","icon":"🛁","name":{"en":"The robot spa","fr":"Le spa des robots"},"line":{"en":"Stones and planks. Robots rest there when a job is done.","fr":"Des pierres et des planches. Les robots s’y reposent quand un travail est fini."}},{"id":"refuge","tab":"build","price":35,"kind":"blueprint","blueprint":"refuge","icon":"🏡","name":{"en":"The animal refuge","fr":"Le refuge des animaux"},"line":{"en":"Planks and stones. Then animals can come and live.","fr":"Des planches et des pierres. Puis des animaux peuvent venir vivre."}},{"id":"rabbit","tab":"animals","price":15,"kind":"animal","animal":"rabbit","icon":"🐇","name":{"en":"A rabbit","fr":"Un lapin"},"line":{"en":"Eats carrots from her bowl. You name her.","fr":"Mange des carottes dans son bol. Tu lui donnes un nom."}},{"id":"sheep","tab":"animals","price":20,"kind":"animal","animal":"sheep","icon":"🐑","name":{"en":"A sheep","fr":"Un mouton"},"line":{"en":"Eats carrots from his bowl. You name him.","fr":"Mange des carottes dans son bol. Tu lui donnes un nom."}}];
// P108 IW-007 (session-5 base): her land — the blueprints, the animals, the plot's size.
var BLUEPRINTS = [{"id":"spa","parts":[{"dx":0,"item":"stone","need":6},{"dx":1,"item":"plank","need":4}],"stages":4,"spot":{"x":3,"y":1},"does":"rest"},{"id":"refuge","parts":[{"dx":0,"item":"plank","need":6},{"dx":1,"item":"stone","need":4}],"pen":2,"stages":4,"spot":{"x":3,"y":3},"does":"animals"}];
var ANIMALS = [{"id":"rabbit","eats":"carrot","capacity":3,"gift":{"word":"iw7sGiftClover","shells":1}},{"id":"sheep","eats":"carrot","capacity":4,"gift":{"word":"iw7sGiftWool","shells":2}}];
var LAND_W = 8, LAND_H = 6;
/** P108 s8: her land's sources by id, the most each holds (land.left, as the island last wrote it, is bounded by it). */
var LAND_LEFT_MAX = {"tree":8,"rock":8,"patch":4};
function newId(prefix) { return prefix + Date.now().toString(36) + Math.floor(Math.random() * 46656).toString(36); }
function tricksOf(raw) {
  var out = {};
  for (var i = 0; i < TRICK_KEYS.length; i++) { var v = raw && raw[TRICK_KEYS[i]]; out[TRICK_KEYS[i]] = v === 'bloom' || v === 'sprout' ? v : (TRICK_KEYS[i] === 'n1' ? 'sprout' : 'seed'); }
  return out;
}
/** IG-004: the robots of an island — every { id } row once, the first robot always there and first. */
function robotsOf(raw) {
  var out = [{ id: FIRST_ROBOT_ID }], seen = {};
  seen[FIRST_ROBOT_ID] = 1;
  var list = Array.isArray(raw) ? raw : [];
  for (var i = 0; i < list.length; i++) {
    var r = list[i], id = r && typeof r === 'object' ? String(r.id || '') : typeof r === 'string' ? r : '';
    // P108 IW-006 (v5): r1 is always first; its stored row gives it only its brain.
    if (id === FIRST_ROBOT_ID && seen[id] === 1) { crewOnto(brainOnto(out[0], r), r); seen[id] = 2; continue; }
    if (!id || seen[id]) continue;
    seen[id] = 1;
    // IG-005: a lent robot's row keeps its own kind and look (each field only when it is there and sound); r1's look
    // stays profile.robot (one source). A v4 row from session 3 is { id } and reads as it did.
    out.push(id === FIRST_ROBOT_ID ? crewOnto(brainOnto({ id: id }, r), r) : robotFields(id, r));
  }
  return out;
}
/**
 * P108 IW-008 (lane C): a row's crew fields, each only when it is there and sound — 'program' (the program the robot
 * carries: copied onto it, or kept when it came home; a list of one block at least) and 'helps' (the plot it works as a
 * second robot, beside the one pinned there). Where a robot pinned on a plot is, its program is that plot's.
 */
function crewOnto(row, r) {
  if (!r || typeof r !== 'object') return row;
  var pg = programOf(r.program);
  if (pg && pg.length) row.program = pg;
  if (typeof r.helps === 'string' && r.helps && r.helps !== 'free') row.helps = r.helps.slice(0, 40);
  return row;
}
/**
 * P108 IW-008 (lane C): a second robot works a plot only beside the one pinned there, with a program of its own, one per
 * plot (the first row that claims it), and never while it is pinned itself. Anything else goes home.
 */
function crewHelps(robots, plots) {
  var taken = {};
  for (var i = 0; i < robots.length; i++) {
    var r = robots[i];
    if (!r.helps) continue;
    var q = plots[r.helps];
    var pinnedHere = false;
    for (var id in plots) if (plots[id] && plots[id].robotId === r.id) pinnedHere = true;
    if (!q || !q.robotId || q.robotId === r.id || pinnedHere || taken[r.helps] || !r.program) { delete r.helps; continue; }
    taken[r.helps] = r.id;
  }
}
/** P108 IW-008 (lane C): how many blocks a program holds — every block, the ones inside loops and an else too (the brain's count). */
function crewBlocks(list) { var n = 0, l = Array.isArray(list) ? list : []; for (var i = 0; i < l.length; i++) { if (!l[i]) continue; n++; if (l[i].body) n += crewBlocks(l[i].body); if (Array.isArray(l[i]['else'])) n += crewBlocks(l[i]['else']); } return n; }
/** P108 IW-006 (v5): a row's brain, kept only when it is one of BRAIN_SIZES and bigger than BRAIN_SIZE (absent = BRAIN_SIZE). */
function brainOnto(row, r) {
  var b = r && typeof r === 'object' ? Math.floor(Number(r.brain)) : 0;
  if (b > BRAIN_SIZE && BRAIN_SIZES.indexOf(b) !== -1) row.brain = b;
  return row;
}
/** IG-005: a robot row's own fields, each kept only when it is there and sound (kind, name, color, eye, hat). */
function robotFields(id, r) {
  var row = { id: id };
  if (!r || typeof r !== 'object') return row;
  if (robotSpec(r.kind)) row.kind = String(r.kind);
  var n = typeof r.name === 'string' ? r.name.trim().slice(0, ROBOT_NAME_MAX) : '';
  if (n) row.name = n;
  if (typeof r.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(r.color)) row.color = r.color;
  if (r.eye === 'round' || r.eye === 'happy' || r.eye === 'wink') row.eye = r.eye;
  if (typeof r.hat === 'string' && r.hat) row.hat = r.hat;
  return crewOnto(brainOnto(row, r), r);
}
/** IG-005: the catalogue's entry for a robot kind, or null. */
function robotSpec(kind) { for (var i = 0; i < ROBOTS.length; i++) if (ROBOTS[i].id === String(kind)) return ROBOTS[i]; return null; }
/** IG-005: a row's kind — its own, else its id when that is a kind (a lent robot's id IS its kind), else Pip. */
function robotKindOf(row) {
  if (!row) return 'pip';
  if (row.id === FIRST_ROBOT_ID) return 'pip';
  if (robotSpec(row.kind)) return String(row.kind);
  return robotSpec(row.id) ? String(row.id) : 'pip';
}
/**
 * IG-005: a robot as the pages use it — its look (r1's is profile.robot; a lent one's its row, else the catalogue's
 * name in the profile's language and colour), what it can do, its can and basket with the upgrades the profile owns
 * applied, its step factor (boots), and the plot it works ('' at home).
 */
function robotRow(p, row) {
  var kind = robotKindOf(row), spec = robotSpec(kind) || ROBOTS[0], first = row.id === FIRST_ROBOT_ID;
  var lang = p && p.lang === 'fr' ? 'fr' : 'en';
  var look = first && p ? p.robot : row;
  var out = {
    id: String(row.id), kind: kind,
    name: String((look && look.name) || spec.defaultName[lang] || spec.defaultName.en).slice(0, ROBOT_NAME_MAX),
    color: String((look && look.color) || spec.colour), eye: String((look && look.eye) || 'round'), hat: String((look && look.hat) || 'none'),
    accessory: spec.accessory, palette: spec.palette.slice(), canMax: spec.canMax, basket: spec.basket, stepFactor: 1,
    upgrade: spec.upgrade, upgraded: false, lentBy: spec.lentBy || '', working: p ? plotOfRobot(p.island, String(row.id)) : '',
    brain: Number(row.brain) > BRAIN_SIZE ? Number(row.brain) : BRAIN_SIZE
  };
  // P108 IW-008 (lane C): the plot it helps on ('' when none) and the program it runs or carries (its plot's when pinned).
  out.helps = row.helps ? String(row.helps) : '';
  var runs = out.working && p && p.island.plots[out.working] ? p.island.plots[out.working].program : row.program;
  out.program = Array.isArray(runs) && runs.length ? JSON.parse(JSON.stringify(runs)) : null;
  out.blocks = crewBlocks(out.program);
  // P108 IW-006 (v5): an upgrade counts given (an islander's sticker) or bought (the shop's owned).
  var owned = (p && Array.isArray(p.stickers) ? p.stickers : []).concat(p && Array.isArray(p.owned) ? p.owned : []);
  for (var u = 0; u < UPGRADES.length; u++) {
    var up = UPGRADES[u];
    if (owned.indexOf(up.id) === -1 || up.fits.indexOf(kind) === -1) continue;
    if (up.canMax) out.canMax = up.canMax;
    if (up.basket) out.basket = up.basket;
    if (up.stepFactor) out.stepFactor = up.stepFactor;
    if (up.id === spec.upgrade) out.upgraded = true;
  }
  return out;
}
/** IG-005: every robot of a profile, resolved (r1 first). */
function robotRowsOf(p) { var out = []; var list = p && p.island ? p.island.robots : [{ id: FIRST_ROBOT_ID }]; for (var i = 0; i < list.length; i++) out.push(robotRow(p, list[i])); return out; }
/** IG-005: the robot of a profile that does a job needing this kind ('' when she has none of that kind). */
function jobRobotId(p, kind) {
  var want = robotSpec(kind) ? String(kind) : 'pip';
  var list = p && p.island ? p.island.robots : [{ id: FIRST_ROBOT_ID }];
  for (var i = 0; i < list.length; i++) if (robotKindOf(list[i]) === want) return String(list[i].id);
  return '';
}
/** IG-005: lend a robot of this kind to a profile (once): its id is its kind, its name the catalogue's in her language. */
function lendRobot(p, kind) {
  var spec = robotSpec(kind);
  if (!p || !spec || spec.id === 'pip' || jobRobotId(p, spec.id)) return false;
  p.island.robots.push({ id: spec.id, kind: spec.id, name: spec.defaultName[p.lang === 'fr' ? 'fr' : 'en'], color: spec.colour, eye: 'round', hat: 'none' });
  return true;
}
/** IG-004: a program as the save keeps it — a list (JSON text is read), else null. */
function programOf(v) {
  var p = v;
  if (typeof p === 'string') { try { p = JSON.parse(p); } catch (e) { p = null; } }
  return Array.isArray(p) ? JSON.parse(JSON.stringify(p)) : null;
}
/** IG-004: is this plot pinned (a program to run, and a robot of this island running it)? */
function pinnedPlot(plot, robots) {
  if (!plot || !Array.isArray(plot.program) || !plot.program.length || !plot.robotId) return false;
  for (var i = 0; i < robots.length; i++) if (robots[i].id === plot.robotId) return true;
  return false;
}
/** IG-004: the plots of an island. A robot pinned twice keeps the plot it won last; the other plot lets it go. */
function plotsOf(raw, robots) {
  var out = {}, ids = [];
  var src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  for (var id in src) {
    var p = src[id];
    if (!id || id === 'free' || !p || typeof p !== 'object') continue;
    out[id] = { program: programOf(p.program), robotId: String(p.robotId || ''), wonAt: Number(p.wonAt) || 0 };
    // P108 IW-006 (v5): the job as the island left it, when there is one.
    var lv = liveOf(p.live);
    if (lv) out[id].live = lv;
    if (!pinnedPlot(out[id], robots)) out[id].robotId = '';
    ids.push(id);
  }
  ids.sort(function (a, b) { return out[b].wonAt - out[a].wonAt; });
  var taken = {};
  for (var k = 0; k < ids.length; k++) {
    var q = out[ids[k]];
    if (!q.robotId) continue;
    if (taken[q.robotId]) q.robotId = '';
    else taken[q.robotId] = ids[k];
  }
  return out;
}
/**
 * P108 IW-006 (v5): a plot's live job as the save keeps it — '{ things, age, seed }' (+ 'spent', the things used up, when
 * any; + 'helper', the shop helper at work on this job until it is done, IW-006 AC4), or null when it is not one. The
 * island goes on from it after a restart (IW-002 AC3 across an app restart).
 */
function liveOf(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !Array.isArray(raw.things)) return null;
  var out = { things: JSON.parse(JSON.stringify(raw.things)), age: Math.max(0, Math.floor(Number(raw.age)) || 0), seed: Number(raw.seed) >>> 0 };
  if (Array.isArray(raw.spent) && raw.spent.length) out.spent = JSON.parse(JSON.stringify(raw.spent));
  if (typeof raw.helper === 'string' && raw.helper) out.helper = raw.helper.slice(0, 40);
  return out;
}
function islandOf(raw) {
  var i = raw && typeof raw === 'object' ? raw : {};
  var done = [];
  var list = Array.isArray(i.done) ? i.done : [];
  for (var k = 0; k < list.length; k++) if (done.indexOf(String(list[k])) === -1) done.push(String(list[k]));
  var robots = robotsOf(i.robots);
  // v3's placed is not read: nothing ever wrote it (IG-004).
  var plots = plotsOf(i.plots, robots);
  // P108 IW-008 (lane C): a second robot only where it may be.
  crewHelps(robots, plots);
  var out = { done: done, plots: plots, robots: robots };
  // P108 IW-007 (s5 base): her land, only when something stands on it (an island without one reads as before).
  var land = landOf(i.land);
  if (land.buildings.length || land.animals.length) out.land = land;
  return out;
}
/** P108 IW-007: a blueprint's spec, or null. */
function blueprintSpec(id) { for (var i = 0; i < BLUEPRINTS.length; i++) if (BLUEPRINTS[i].id === String(id)) return BLUEPRINTS[i]; return null; }
/** P108 IW-007: an animal kind's spec, or null. */
function animalSpec(id) { for (var i = 0; i < ANIMALS.length; i++) if (ANIMALS[i].id === String(id)) return ANIMALS[i]; return null; }
/** P108 IW-007: a building on the land is finished when every part has its whole need. */
function buildingDone(b) {
  var spec = b ? blueprintSpec(b.bp) : null;
  if (!spec) return false;
  for (var i = 0; i < spec.parts.length; i++) if (!(Number(b.have && b.have[spec.parts[i].item]) >= spec.parts[i].need)) return false;
  return true;
}
/**
 * P108 IW-007 (s5 base): her land as the save keeps it — buildings '{ id, bp, x, y, have: { item: n } }' (one of each
 * blueprint, every part and pen tile inside the plot, have clipped to each part's need) and animals '{ id, kind, name, at,
 * slot, fed }' (at: the id of a refuge on this land; slot: a place of its pen, one animal each; fed: her bowl, clipped to
 * its capacity). Anything unsound is dropped. Never un-builds: the island writes have back only upwards (landKeep).
 */
function landOf(raw) {
  var r = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  var out = { buildings: [], animals: [] }, ids = {}, bps = {}, slots = {};
  var bl = Array.isArray(r.buildings) ? r.buildings : [];
  for (var i = 0; i < bl.length; i++) {
    var b = bl[i], spec = b && typeof b === 'object' ? blueprintSpec(b.bp) : null;
    var id = spec && typeof b.id === 'string' ? b.id.trim().slice(0, 40) : '';
    if (!spec || !id || ids[id] || bps[spec.id]) continue;
    var x = Math.floor(Number(b.x)), y = Math.floor(Number(b.y)), w = spec.parts.length, h = spec.pen ? 2 : 1;
    if (!(x >= 0 && y >= 0 && x + w <= LAND_W && y + h <= LAND_H)) continue;
    var have = {};
    for (var k = 0; k < spec.parts.length; k++) { var pt = spec.parts[k]; have[pt.item] = Math.max(0, Math.min(pt.need, Math.floor(Number(b.have && b.have[pt.item])) || 0)); }
    ids[id] = 1; bps[spec.id] = 1;
    out.buildings.push({ id: id, bp: spec.id, x: x, y: y, have: have });
  }
  var al = Array.isArray(r.animals) ? r.animals : [];
  for (var j = 0; j < al.length; j++) {
    var a = al[j], as = a && typeof a === 'object' ? animalSpec(a.kind) : null;
    var aid = as && typeof a.id === 'string' ? a.id.trim().slice(0, 40) : '';
    if (!as || !aid || ids[aid]) continue;
    var home = null;
    for (var q = 0; q < out.buildings.length; q++) if (out.buildings[q].id === String(a.at) && (blueprintSpec(out.buildings[q].bp) || {}).pen) home = out.buildings[q];
    var slot = Math.floor(Number(a.slot));
    if (!home || !(slot >= 0 && slot < blueprintSpec(home.bp).pen) || slots[home.id + ':' + slot]) continue;
    ids[aid] = 1; slots[home.id + ':' + slot] = 1;
    out.animals.push({ id: aid, kind: as.id, name: typeof a.name === 'string' ? a.name.trim().slice(0, ROBOT_NAME_MAX) : '', at: home.id, slot: slot, fed: Math.max(0, Math.min(as.capacity, Math.floor(Number(a.fed)) || 0)) });
  }
  // P108 s8 (Richard, 2026-10-02: the Workshop shows the island's real amount): what each source has left, as the island
  // last wrote it (landKeep). Optional: a land without it (every save before s8) has its sources as first laid.
  if (r.left && typeof r.left === 'object' && !Array.isArray(r.left)) {
    var left = {}, anyLeft = false;
    for (var sid in LAND_LEFT_MAX) if (isFinite(Number(r.left[sid])) && r.left[sid] !== null && r.left[sid] !== '') { left[sid] = Math.max(0, Math.min(LAND_LEFT_MAX[sid], Math.floor(Number(r.left[sid])))); anyLeft = true; }
    if (anyLeft) out.left = left;
  }
  return out;
}
/** IG-004: the plot a robot is pinned to on an island, or ''. */
function plotOfRobot(island, robotId) {
  var plots = island && island.plots ? island.plots : {};
  for (var id in plots) if (plots[id] && plots[id].robotId === robotId && Array.isArray(plots[id].program) && plots[id].program.length) return id;
  return '';
}
function profileOf(raw) {
  var p = raw && typeof raw === 'object' ? raw : {};
  var robot = p.robot && typeof p.robot === 'object' ? p.robot : {};
  var out = {
    id: String(p.id || newId('p')), name: String(p.name || '').slice(0, 24), band: Number(p.band) === 1 ? 1 : 2, lang: p.lang === 'fr' ? 'fr' : 'en',
    face: String(p.face || ''),
    robot: { name: String(robot.name || 'Pip').slice(0, ROBOT_NAME_MAX), color: String(robot.color || '#FF7A59'), eye: String(robot.eye || 'round'), hat: String(robot.hat || 'none') },
    tricks: tricksOf(p.tricks), stickers: Array.isArray(p.stickers) ? p.stickers.map(String) : [], hats: Array.isArray(p.hats) ? p.hats.map(String) : [],
    island: islandOf(p.island),
    // P108 IW-006 (v5): her shells (earned only grows; spent is a second number, D4) and what she bought.
    shells: shellsOf(p.shells), owned: ownedOf(p.owned)
  };
  // P108 IW-001 F8: the block cards this child has seen (Got it), OPTIONAL — absent is none seen, so a profile without
  // it is this very profile (adding the field owed no migration; v5, IW-006, did).
  var seen = cardsOf(p.cardsSeen);
  if (seen.length) out.cardsSeen = seen;
  return out;
}
/** IW-001 F8: a cards-seen list as the save keeps it — text ids, trimmed, once each, first seen first, at most CARDS_MAX. */
function cardsOf(raw) {
  var out = [], list = Array.isArray(raw) ? raw : [];
  for (var i = 0; i < list.length && out.length < CARDS_MAX; i++) {
    var id = typeof list[i] === 'string' ? list[i].trim().slice(0, 40) : '';
    if (id && out.indexOf(id) === -1) out.push(id);
  }
  return out;
}
/** P108 IW-006 (v5): a wallet — whole shells, never below 0, never more spent than earned. */
function shellsOf(raw) {
  var r = raw && typeof raw === 'object' ? raw : {};
  var earned = Math.max(0, Math.floor(Number(r.earned)) || 0);
  return { earned: earned, spent: Math.min(earned, Math.max(0, Math.floor(Number(r.spent)) || 0)) };
}
/**
 * P108 IW-006 (v5): what she bought and still has — text ids (the shop's), trimmed, once each, in the order bought, at most
 * CARDS_MAX (a helper leaves it when used). Not filtered by the catalogue: the shell packs the same list without one.
 */
function ownedOf(raw) {
  var out = [], list = Array.isArray(raw) ? raw : [];
  for (var i = 0; i < list.length && out.length < CARDS_MAX; i++) { var id = typeof list[i] === 'string' ? list[i].trim().slice(0, 40) : ''; if (id && out.indexOf(id) === -1) out.push(id); }
  return out;
}
/** P108 IW-006: the catalogue's entry, or null. */
function shopItem(id) { for (var i = 0; i < SHOP.length; i++) if (SHOP[i].id === String(id)) return SHOP[i]; return null; }
/** P108 IW-006 (D4): what she can spend. */
function balanceOf(p) { return p && p.shells ? p.shells.earned - p.shells.spent : 0; }
/** P108 IW-006 (D2): shells earned — whole, never negative; earned only grows. Returns what was added. */
function earnShells(p, n) { var k = Math.max(0, Math.floor(Number(n)) || 0); if (p && k) p.shells.earned += k; return k; }
/**
 * P108 IW-006 / IW-008 — THE purchase rule (the purchase card's Buy; the one place spent rises). Returns
 * '{ ok, error, short, left, robotId }': error '' | 'unknown' | 'short' (short = how many more shells) | 'kind' (a copy of a
 * robot kind the island does not have) | 'cap' (CREW_CAP robots) | 'robot' (a brain for no robot of hers) | 'size' (that
 * robot's brain is not the size before this one) | 'held' (that helper is held already, unused) | 'owned' (that upgrade is hers).
 * P108 IW-007 (s5 base): a blueprint goes into 'owned' once ('owned' again after); an animal needs a FINISHED refuge on her
 * land ('refuge' when there is none, 'pen' when every place of its pen is taken), takes 'opts.name', and is placed in the
 * first free place ('animalId' its id). A blueprint is placed on the land by landPlace (iw007Land), never by buying it.
 * 'opts.robotId' names the robot a brain is for; 'opts.name' a copy's name (else the kind's name and its number).
 */
function buyItem(p, id, opts) {
  var o = opts && typeof opts === 'object' ? opts : {};
  var it = shopItem(id), out = { ok: false, error: '', short: 0, left: balanceOf(p), robotId: '' };
  if (!p || !it) { out.error = 'unknown'; return out; }
  var row = null;
  if (it.kind === 'robot') {
    if (!jobRobotId(p, it.robot)) { out.error = 'kind'; return out; }
    if (p.island.robots.length >= CREW_CAP) { out.error = 'cap'; return out; }
  } else if (it.kind === 'brain') {
    for (var r = 0; r < p.island.robots.length; r++) if (p.island.robots[r].id === String(o.robotId || '')) row = p.island.robots[r];
    if (!row) { out.error = 'robot'; return out; }
    var at = BRAIN_SIZES.indexOf(Number(row.brain) > BRAIN_SIZE ? Number(row.brain) : BRAIN_SIZE);
    if (BRAIN_SIZES[at + 1] !== it.size) { out.error = 'size'; return out; }
  } else if (it.kind === 'animal') {
    // P108 IW-007 (s5 base): an animal only beside a finished refuge, in a free place of its pen.
    var lnd = p.island.land || { buildings: [], animals: [] }, pen = null;
    for (var rf = 0; rf < lnd.buildings.length && !pen; rf++) {
      var rb = lnd.buildings[rf], rs = blueprintSpec(rb.bp);
      if (!rs || !rs.pen || !buildingDone(rb)) continue;
      for (var sl = 0; sl < rs.pen && !pen; sl++) { var used = false; for (var an = 0; an < lnd.animals.length; an++) if (lnd.animals[an].at === rb.id && lnd.animals[an].slot === sl) used = true; if (!used) pen = { at: rb.id, slot: sl }; }
      if (!pen) { out.error = 'pen'; }
    }
    if (!pen) { if (!out.error) out.error = 'refuge'; return out; }
    out.error = '';
  } else if (p.owned.indexOf(it.id) !== -1 || (it.kind === 'upgrade' && p.stickers.indexOf(it.upgrade) !== -1)) { out.error = it.kind === 'helper' ? 'held' : 'owned'; return out; }
  if (balanceOf(p) < it.price) { out.error = 'short'; out.short = it.price - balanceOf(p); return out; }
  p.shells.spent += it.price;
  if (it.kind === 'robot') {
    var spec = robotSpec(it.robot), lang = p.lang === 'fr' ? 'fr' : 'en', n = 1;
    for (var k = 0; k < p.island.robots.length; k++) if (robotKindOf(p.island.robots[k]) === it.robot) n++;
    var nm = typeof o.name === 'string' ? o.name.trim().slice(0, ROBOT_NAME_MAX) : '';
    var nid = newId('r');
    p.island.robots.push({ id: nid, kind: spec.id, name: nm || (spec.defaultName[lang] + ' ' + n).slice(0, ROBOT_NAME_MAX), color: spec.colour, eye: 'round', hat: 'none' });
    out.robotId = nid;
  } else if (it.kind === 'brain') row.brain = it.size;
  else if (it.kind === 'animal') {
    // P108 IW-007 (s5 base): her name for it, else the shop's name; its bowl starts empty (she feeds it).
    var anm = typeof o.name === 'string' ? o.name.trim().slice(0, ROBOT_NAME_MAX) : '';
    var aid = newId('a');
    if (!p.island.land) p.island.land = { buildings: [], animals: [] };
    p.island.land.animals.push({ id: aid, kind: it.animal, name: anm, at: pen.at, slot: pen.slot, fed: 0 });
    out.animalId = aid;
  }
  else p.owned.push(it.id);
  out.ok = true;
  out.left = balanceOf(p);
  return out;
}
/** A stored model older than the current version (v5) that has anyone in it: the page writes the migrated model back at once. */
function migrationDue(raw) {
  return !!raw && typeof raw === 'object' && Array.isArray(raw.profiles) && raw.profiles.length > 0 && !(Number(raw.v) >= SAVE_VERSION);
}
function modelOf(raw) {
  var m = raw && typeof raw === 'object' ? raw : {};
  var fam = m.family && typeof m.family === 'object' ? m.family : {};
  var isl = m.island && typeof m.island === 'object' ? m.island : {};
  // v1/v2 had ONE island for the family; v3 (ruling 8) and v4 keep one per profile.
  var old = !(Number(m.v) >= 3);
  var profiles = [];
  var list = Array.isArray(m.profiles) ? m.profiles : [];
  for (var i = 0; i < list.length && i < MAX_PROFILES; i++) {
    var p = profileOf(list[i]);
    // v1/v2: the family had one island. Every existing profile keeps what it had done (the rule, CG-002 §8).
    if (old) p.island = islandOf({ done: isl.done });
    profiles.push(p);
  }
  var model = { v: SAVE_VERSION, family: { id: String(fam.id || newId('f')), created: Number(fam.created) || Date.now() }, profiles: profiles, island: null };
  return activate(model, String(isl.activeId || (profiles[0] ? profiles[0].id : '')));
}
/** The profile playing: model.island becomes its island (the same objects), never a copy that could go stale. */
function activate(model, id) {
  var active = null;
  for (var j = 0; j < model.profiles.length; j++) if (model.profiles[j].id === id) active = model.profiles[j];
  model.island = { activeId: String(id || ''), done: active ? active.island.done : [], plots: active ? active.island.plots : {}, robots: active ? active.island.robots : [{ id: FIRST_ROBOT_ID }] };
  // P108 IW-007 (s5 base): her land, the same object, when she has one.
  if (active && active.island.land) model.island.land = active.island.land;
  return model;
}
function toB64(str) {
  var bytes = unescape(encodeURIComponent(str));
  var b64 = typeof btoa === 'function' ? btoa(bytes) : Buffer.from(bytes, 'binary').toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64(code) {
  var b64 = String(code || '').trim().replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  var bytes = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
  return decodeURIComponent(escape(bytes));
}

// What this file gives: Scripts.save.<name> in a Function, use('save') in another file.
exports.ANIMALS = ANIMALS; exports.BLUEPRINTS = BLUEPRINTS; exports.BRAIN_SIZE = BRAIN_SIZE;
exports.BRAIN_SIZES = BRAIN_SIZES; exports.CARDS_MAX = CARDS_MAX; exports.CREW_CAP = CREW_CAP;
exports.FIRST_ROBOT_ID = FIRST_ROBOT_ID; exports.LAND_H = LAND_H; exports.LAND_LEFT_MAX = LAND_LEFT_MAX;
exports.LAND_W = LAND_W; exports.MAX_PROFILES = MAX_PROFILES; exports.ROBOTS = ROBOTS;
exports.ROBOT_NAME_MAX = ROBOT_NAME_MAX; exports.SAVE_VERSION = SAVE_VERSION; exports.SHOP = SHOP;
exports.TRICK_KEYS = TRICK_KEYS; exports.UPGRADES = UPGRADES; exports.activate = activate;
exports.animalSpec = animalSpec; exports.balanceOf = balanceOf; exports.blueprintSpec = blueprintSpec;
exports.brainOnto = brainOnto; exports.buildingDone = buildingDone; exports.buyItem = buyItem;
exports.cardsOf = cardsOf; exports.crewBlocks = crewBlocks; exports.crewHelps = crewHelps;
exports.crewOnto = crewOnto; exports.earnShells = earnShells; exports.fromB64 = fromB64;
exports.islandOf = islandOf; exports.jobRobotId = jobRobotId; exports.landOf = landOf;
exports.lendRobot = lendRobot; exports.liveOf = liveOf; exports.migrationDue = migrationDue;
exports.modelOf = modelOf; exports.newId = newId; exports.ownedOf = ownedOf; exports.pinnedPlot = pinnedPlot;
exports.plotOfRobot = plotOfRobot; exports.plotsOf = plotsOf; exports.profileOf = profileOf;
exports.programOf = programOf; exports.robotFields = robotFields; exports.robotKindOf = robotKindOf;
exports.robotRow = robotRow; exports.robotRowsOf = robotRowsOf; exports.robotSpec = robotSpec;
exports.robotsOf = robotsOf; exports.shellsOf = shellsOf; exports.shopItem = shopItem; exports.toB64 = toB64;
exports.tricksOf = tricksOf;
