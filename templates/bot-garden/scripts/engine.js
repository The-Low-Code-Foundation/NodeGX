var DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
var BLOCKING_TILES = { W: 1, R: 1, T: 1, H: 1, L: 1 };
// IG-002: a rock (a mineable thing on grass) and a sign block a move like a tulip; a note on the ground does not.
var BLOCKING_THINGS = { tulip: 1, bowl: 1, rock: 1, sign: 1, basket: 1, store: 1, can: 1, hen: 1, postbox: 1, door: 1, tree: 1, patch: 1 };
// P108 IW-002: the job model (brief §4.2) — its kinds and their roles, a container's item, the wear clock (island ticks only).
var JOB_KINDS = {"tulip":"target","site":"target","basket":"container","bowl":"container","store":"container","can":"carrier","rock":"source","hen":"source","postbox":"source","door":"container","tree":"source","patch":"source"};
var JOB_ITEMS = {"site":"stone","basket":"egg","bowl":"food","store":"stone","rock":"stone","door":"letter","tree":"plank","patch":"carrot"};
var WEAR = {"tulip":60,"site":120,"bowl":60,"basket":90,"store":120,"rock":30,"hen":20,"postbox":90,"door":90,"tree":40,"patch":30};
var HEN_CAPACITY = 4;
var SITE_STAGES = ["dirt","gravel","cobbles","path"];
var CAN_MAX = 3;
var PICKABLE = { letter: 1, egg: 1, stone: 1, food: 1, ball: 1, plank: 1, carrot: 1 };
// P108 IW-007 (s5 base): a source a pick mines (one of its item per pick, its left shrinking; one with a max regrows) and
// each blueprint's number of stages (a building's parts share one stage, bstage, by the share of ALL its materials in).
var SOURCE_ITEMS = {"rock":"stone","tree":"plank","patch":"carrot"};
/** P108 s8: the items a place can want that the robot names when it is handed another (sayWants<Item>). */
var WANTS_SAID = { stone: 1, plank: 1, egg: 1, food: 1, ball: 1, carrot: 1 };
/** P108 s8: the sources that grow back and say so when picked empty (sayGrows<Kind>). */
var GROWS_SAID = { rock: 1, tree: 1, patch: 1 };
var BUILD_STAGES = {"spa":4,"refuge":4};
var UNTIL_GUARD = 40;
var MAX_TRICK_DEPTH = 8;
var MAX_TICKS = 2000;
var DIAL_TEMPERATURE = [0,0.8,1.2];
var ASK_SHAPE = {"say-thanks":"sentence","read":"one_of","is-it-a":"yes_no","count-tulips":"integer","maths":"integer","no-letter-e":"sentence","tall-tales":"sentence","translate":"sentence","voice-hint":"sentence"};
var ASK_TEMPERATURE = {"say-thanks":0.8,"read":0.2,"is-it-a":0.2,"count-tulips":0.2,"maths":0.2,"no-letter-e":0.8,"tall-tales":0.8,"translate":0.2,"voice-hint":0.5};
var ASK_BLOCK = {"avancer":"fwd","gauche":"left","droite":"right","arroser":"water"};
var ASK_RESERVED = { rung: 1, args: 1, shape: 1, dial: 1, options: 1, times: 1 };

var OLIVE_OBJECT = {"red_tulip":{"en":"red tulip","fr":"tulipe rouge"},"yellow_tulip":{"en":"yellow tulip","fr":"tulipe jaune"},"tulip":{"en":"tulip","fr":"tulipe"},"rock":{"en":"rock","fr":"rocher"},"stone":{"en":"stone","fr":"pierre"},"letter":{"en":"letter","fr":"lettre"},"bowl":{"en":"bowl","fr":"gamelle"},"egg":{"en":"egg","fr":"œuf"}};
var OLIVE_AHEAD = {"red_tulip":{"en":"a red tulip","fr":"une tulipe rouge"},"yellow_tulip":{"en":"a yellow tulip","fr":"une tulipe jaune"},"tulip":{"en":"a tulip","fr":"une tulipe"},"rock":{"en":"a rock","fr":"un rocher"},"stone":{"en":"a stone","fr":"une pierre"},"letter":{"en":"a letter","fr":"une lettre"},"bowl":{"en":"a bowl","fr":"une gamelle"},"egg":{"en":"an egg","fr":"un œuf"},"note":{"en":"a note","fr":"un petit mot"},"sign":{"en":"a sign","fr":"un panneau"},"grass":{"en":"some grass","fr":"de l'herbe"},"path":{"en":"a path","fr":"un chemin"},"water":{"en":"some water","fr":"de l'eau"},"tree":{"en":"a tree","fr":"un arbre"},"house":{"en":"a house","fr":"une maison"},"postbox":{"en":"a post box","fr":"une boîte aux lettres"}};
var OLIVE_TILE_AHEAD = {"G":"grass","F":"grass","P":"path","W":"water","R":"rock","T":"tree","H":"house","B":"postbox"};
var OLIVE_BUBBLE = {"oliveReadSay":{"en":"Olive read: {x}","fr":"Olive a lu : {x}"},"oliveSaysBubble":{"en":"Olive: {x}","fr":"Olive : {x}"},"oliveVote":{"en":"{n} of {of} said {x}","fr":"{n} sur {of} ont dit {x}"},"oliveVote1":{"en":"{n} of {of} said {x}","fr":"{n} sur {of} a dit {x}"}};
var OLIVE_YES = { yes: 1, oui: 1, 'true': 1 };
var OLIVE_NOTES = {"fr":["Les rouges, pas les jaunes.","Les tulipes veulent de l'eau aujourd'hui.","Porte la lettre à Mamie Rose.","Pour Mamie Rose.","Pour Sami.","Pour Biscuit.","Les jaunes, pas les rouges."],"en":["The red ones, not the yellow.","The tulips want water today.","Take the letter to Mamie Rose.","For Mamie Rose.","For Sami.","For Biscuit.","The yellow ones, not the red."]};
var OLIVE_SLOT_LISTS = {"say-thanks":{"to":{"fr":["Mamie Rose","Sami","Biscuit","Pip"],"en":["Mamie Rose","Sami","Biscuit","Pip"]},"deed":{"fr":["arrosé ses trois tulipes","porté sa lettre","rempli la gamelle de Biscuit","planté ses graines"],"en":["watered her three tulips","carried her letter","filled Biscuit's bowl","planted her seeds"]}},"read":{"note":{"fr":["Les rouges, pas les jaunes.","Les tulipes veulent de l'eau aujourd'hui.","Porte la lettre à Mamie Rose.","Pour Mamie Rose.","Pour Sami.","Pour Biscuit.","Les jaunes, pas les rouges."],"en":["The red ones, not the yellow.","The tulips want water today.","Take the letter to Mamie Rose.","For Mamie Rose.","For Sami.","For Biscuit.","The yellow ones, not the red."]}},"is-it-a":{"thing":{"fr":["une rose","un chat","un pissenlit","une tulipe rouge","un rocher","un arrosoir","une tulipe","une tulipe jaune","une pierre","un petit mot","un panneau","une gamelle","un œuf","une lettre","de l'herbe","un chemin","de l'eau","un arbre","une maison","une boîte aux lettres"],"en":["a rose","a cat","a dandelion","a red tulip","a rock","a watering can","a tulip","a yellow tulip","a stone","a note","a sign","a bowl","an egg","a letter","some grass","a path","some water","a tree","a house","a post box"]},"kind":{"fr":["une fleur","un animal","une tulipe","une plante"],"en":["a flower","an animal","a tulip","a plant"]}}};
function oliveL(lang) { return String(lang) === 'fr' ? 'fr' : 'en'; }
function oliveFill(t, vars) { var out = String(t || ''); for (var k in vars) out = out.split('{' + k + '}').join(String(vars[k])); return out; }
/** A thing as read's object id: a tulip by its colour, the rest by kind; '' for a thing she does not name. */
function oliveObjectOf(t) {
  if (!t || typeof t !== 'object') return '';
  if (t.kind === 'tulip') return t.color === 'red' ? 'red_tulip' : t.color === 'yellow' ? 'yellow_tulip' : 'tulip';
  return OLIVE_OBJECT[t.kind] ? String(t.kind) : '';
}
/** A note's text in the run's language: the table's notes are index-aligned, so either language's text finds its twin. */
function oliveNoteIn(text, lang) {
  var L = oliveL(lang), t = String(text || '');
  for (var k in OLIVE_NOTES) { var i = OLIVE_NOTES[k].indexOf(t); if (i !== -1) return OLIVE_NOTES[L][i] || t; }
  return t;
}
/** The note read reads: the note or sign on the tile ahead, else the first on the plot; '' when there is none. */
function oliveNoteOf(w, r, lang) {
  var f = r ? front(r) : null, first = null;
  for (var i = 0; i < w.things.length; i++) {
    var t = w.things[i];
    if (!t || (t.kind !== 'note' && t.kind !== 'sign')) continue;
    if (f && t.x === f.x && t.y === f.y) return oliveNoteIn(t.text, lang);
    if (first === null) first = t.text;
  }
  return first === null ? '' : oliveNoteIn(first, lang);
}
/** The things on the plot read chooses from, in the world's order, each once, in the language. */
function oliveObjectsOf(w, lang) {
  var seen = {}, out = [], L = oliveL(lang);
  for (var i = 0; i < w.things.length; i++) { var id = oliveObjectOf(w.things[i]); if (id && !seen[id]) { seen[id] = 1; out.push(OLIVE_OBJECT[id][L]); } }
  return out;
}
/** The thing ahead, named: a thing on the tile ahead (not a puddle), else the tile. */
function oliveAheadOf(w, r, lang) {
  var L = oliveL(lang);
  if (!r) return OLIVE_AHEAD.grass[L];
  var f = front(r), th = thingsAt(w, f.x, f.y);
  for (var i = 0; i < th.length; i++) {
    var id = th[i].kind === 'note' || th[i].kind === 'sign' ? th[i].kind : oliveObjectOf(th[i]);
    if (id && OLIVE_AHEAD[id]) return OLIVE_AHEAD[id][L];
  }
  var tile = OLIVE_TILE_AHEAD[tileAt(w, f.x, f.y)] || 'grass';
  return OLIVE_AHEAD[tile][L];
}
/** Her word back to read's object id (either language), for the olive_read sensor. */
function oliveObjectId(v) {
  var got = String(v === undefined || v === null ? '' : v).trim().toLowerCase();
  for (var id in OLIVE_OBJECT) if (OLIVE_OBJECT[id].en.toLowerCase() === got || OLIVE_OBJECT[id].fr.toLowerCase() === got) return id;
  return '';
}
/**
 * A list word in the run's language: a block keeps the word it was given in the language it was placed in; the lists
 * are index-aligned, so "a flower" is sent as "une fleur" when the run is French (else the shell refuses it).
 */
function oliveInLang(rung, slot, v, lang) {
  var lists = OLIVE_SLOT_LISTS[rung], l = lists ? lists[slot] : null, L = oliveL(lang);
  if (!l || typeof v !== 'string') return v;
  for (var k in l) { var i = l[k].indexOf(v); if (i !== -1) return l[L][i] || v; }
  return v;
}
/** The slots and options the engine sends for an Olive step: the block's own, plus what only the world knows. */
function oliveRequestOf(s, w, run) {
  var args = clone(s.args) || {}, options = s.options || null, r = robotOf(w, run.robotId);
  if (!Array.isArray(args)) for (var slot in args) args[slot] = oliveInLang(s.rung, slot, args[slot], run.lang);
  if (s.rung === 'read' && !Array.isArray(args)) { args.note = oliveNoteOf(w, r, run.lang); options = oliveObjectsOf(w, run.lang); }
  // P108 IW-003 (lane P): an envelope in hand (or ahead) is what she reads; her choices are the doors' owners.
  if (s.rung === 'read' && !Array.isArray(args)) options = mailRead(s, w, r, run.lang, args, options);
  if (s.rung === 'is-it-a' && !Array.isArray(args)) args.thing = oliveAheadOf(w, r, run.lang);
  return { slots: args, options: options };
}
/**
 * An answer to an Olive step, before the run moves on. The vote (is it a…? asked 3 times): each answer is one vote; until
 * the last, the step asks again ('again'); then the majority is the answer if Olive says yes reads, with the count on the
 * robot. read: the object she named (for if Olive read), "Olive read: …" on the robot. is it a…? once: "Olive: yes".
 */
function oliveAnswered(run, s, a) {
  var L = oliveL(run.lang), out = { again: false, say: '' };
  var v = a.value !== undefined && a.value !== null ? a.value : a.text;
  if (s.rung === 'is-it-a' && s.times > 1) {
    var here = run.steps[run.pc];
    if (!Array.isArray(here.votes)) here.votes = [];
    here.votes.push(OLIVE_YES[String(v === undefined || v === null ? '' : v).trim().toLowerCase()] ? 1 : 0);
    if (here.votes.length < s.times) { out.again = true; out.vote = { yes: sumOf(here.votes), of: here.votes.length, times: s.times }; return out; }
    var yes = sumOf(here.votes), word = L === 'fr' ? 'oui' : 'yes';
    run.lastAnswer.value = yes * 2 > s.times ? word : L === 'fr' ? 'non' : 'no';
    run.lastAnswer.vote = { yes: yes, of: s.times };
    out.vote = { yes: yes, of: s.times, times: s.times };
    out.say = oliveFill(OLIVE_BUBBLE[yes === 1 ? 'oliveVote1' : 'oliveVote'][L], { n: yes, of: s.times, x: word });
    here.votes = [];
    return out;
  }
  // A thank-you Olive wrote is a thing the robot SAID (a request's said goal counts it, like the say block).
  if (s.rung === 'say-thanks') run.said = (Number(run.said) || 0) + 1;
  if (s.rung === 'read') run.lastAnswer.object = '';
  // P108 IW-003 (lane P): an envelope read with no word back (no Olive on the tick) reads the name, as the written answer does.
  v = mailFallback(run, s, v);
  if (v === undefined || v === null || String(v) === '') return out;
  if (s.rung === 'read') { run.lastAnswer.object = oliveObjectId(v); out.say = oliveFill(OLIVE_BUBBLE.oliveReadSay[L], { x: String(v) }); }
  else if (s.rung === 'is-it-a') out.say = oliveFill(OLIVE_BUBBLE.oliveSaysBubble[L], { x: String(v) });
  return out;
}
function sumOf(list) { var n = 0; for (var i = 0; i < list.length; i++) n += Number(list[i]) || 0; return n; }


function rngOf(w) {
  return function () {
    var a = ((Number(w.seed) >>> 0) + 0x6D2B79F5) >>> 0;
    w.seed = a;
    var t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** A request's seeded layout on its world: a wall tile at one column of wallAt (on wallRow, else the robot's row); eggs on count of the tiles among. */
function layOut(w, seeded, rs) {
  var rnd = rngOf(w), sd = seeded && typeof seeded === 'object' ? seeded : {};
  if (Array.isArray(sd.wallAt) && sd.wallAt.length === 2 && Array.isArray(w.map)) {
    var lo = Math.floor(Number(sd.wallAt[0])), hi = Math.floor(Number(sd.wallAt[1]));
    if (hi < lo) { var sw = lo; lo = hi; hi = sw; }
    var wx = lo + Math.floor(rnd() * (hi - lo + 1));
    var wy = sd.wallRow !== undefined && sd.wallRow !== null && sd.wallRow !== '' ? Math.floor(Number(sd.wallRow)) : Math.floor(Number(rs && rs.y) || 0);
    if (wy >= 0 && wy < w.map.length && wx >= 0 && wx < String(w.map[wy]).length) { var row = String(w.map[wy]); w.map[wy] = row.slice(0, wx) + "L" + row.slice(wx + 1); }
  }
  if (sd.eggs && typeof sd.eggs === 'object' && Array.isArray(sd.eggs.among)) {
    var pool = sd.eggs.among.slice(), n = Math.max(0, Math.min(pool.length, Math.floor(Number(sd.eggs.count)) || 0));
    if (!Array.isArray(w.things)) w.things = [];
    for (var e = 0; e < n; e++) {
      var k = e + Math.floor(rnd() * (pool.length - e)), pk = pool[k];
      pool[k] = pool[e]; pool[e] = pk;
      w.things.push({ kind: 'egg', x: Math.floor(Number(pk[0])), y: Math.floor(Number(pk[1])) });
    }
  }
  // P108 IW-003 (s3 base): three more layouts, each over things named by their id, drawn AFTER the wall and the eggs (so
  // a seed lays those exactly as before). choose: one value of among into a thing's field (today's note, a colour);
  // shuffle: the values dealt one to each thing (the envelopes' names); place: a thing moved to one tile of among.
  var byId = function (id) { for (var q = 0; q < (w.things || []).length; q++) if (w.things[q] && String(w.things[q].id) === String(id)) return w.things[q]; return null; };
  if (Array.isArray(sd.choose)) for (var ci = 0; ci < sd.choose.length; ci++) {
    var ch = sd.choose[ci], cth = ch && byId(ch.thing);
    if (cth && ch.field && Array.isArray(ch.among) && ch.among.length) { var ck = Math.floor(rnd() * ch.among.length); cth[ch.field] = JSON.parse(JSON.stringify(ch.among[ck])); chosenTargets(w, ch, ck); }
  }
  if (sd.shuffle && Array.isArray(sd.shuffle.things) && Array.isArray(sd.shuffle.values) && sd.shuffle.field) {
    var deck = sd.shuffle.values.slice();
    for (var si = deck.length - 1; si > 0; si--) { var sj = Math.floor(rnd() * (si + 1)), sv = deck[si]; deck[si] = deck[sj]; deck[sj] = sv; }
    for (var st = 0; st < sd.shuffle.things.length && st < deck.length; st++) { var sth = byId(sd.shuffle.things[st]); if (sth) sth[sd.shuffle.field] = JSON.parse(JSON.stringify(deck[st])); }
  }
  if (Array.isArray(sd.place)) for (var pi = 0; pi < sd.place.length; pi++) {
    var pl = sd.place[pi], pth = pl && byId(pl.thing);
    if (pth && Array.isArray(pl.among) && pl.among.length) { var pt = pl.among[Math.floor(rnd() * pl.among.length)]; pth.x = Math.floor(Number(pt[0])); pth.y = Math.floor(Number(pt[1])); }
  }
  // P108 IW-003 (lane B): a thing laid beside the wall this seed drew (Biscuit's ball rolled into its corner); no draw.
  if (Array.isArray(sd.byWall) && wx !== undefined) layByWall(w, sd.byWall, wx, wy, byId);
  return w;
}
/**
 * P108 IW-003 (lane B): byWall — each { thing, dx, dy, spotOn } moves the thing with that id to the wall's tile plus
 * (dx, dy), and writes that tile as the spot of the container spotOn names (where the thing goes back when the container
 * wears: rollOut). Laid after place; it draws nothing from the seed, so every other layout lays exactly as before.
 */
function layByWall(w, list, wx, wy, byId) {
  for (var i = 0; i < list.length; i++) {
    var e = list[i], t = e && byId(e.thing);
    if (!t) continue;
    t.x = wx + (Math.floor(Number(e.dx)) || 0); t.y = wy + (Math.floor(Number(e.dy)) || 0);
    var box = e.spotOn ? byId(e.spotOn) : null;
    if (box) box.spot = [t.x, t.y];
  }
}
/** The world a run starts on, given its seed (none: one is picked): the job copied in, the seeded layout laid. A request with neither is untouched. */
function seedWorld(world, req, seed) {
  if (!world || !req || (!req.seeded && !req.job)) return world;
  world.seed = seed !== undefined && seed !== null && seed !== '' && isFinite(Number(seed)) ? Number(seed) >>> 0 : (Date.now() ^ Math.floor(Math.random() * 4294967296)) >>> 0;
  if (req.job) world.job = JSON.parse(JSON.stringify(req.job));
  if (req.seeded) layOut(world, req.seeded, req.robotStart);
  return world;
}
// P108 IW-003 (lane M): a choose may carry the job's targets for each of its values (index-aligned): the value drawn
// sets the targets too, so the job follows the day (Mamie's note says the yellow ones: the yellow row is the job). No draw.
function chosenTargets(w, ch, k) {
  if (!Array.isArray(ch.targets) || !Array.isArray(ch.targets[k]) || !w.job || typeof w.job !== 'object') return;
  w.job.targets = JSON.parse(JSON.stringify(ch.targets[k]));
}

function clone(v) { return v === undefined || v === null ? v : JSON.parse(JSON.stringify(v)); }
function worldOf(raw) {
  var w = raw && typeof raw === 'object' ? clone(raw) : {};
  if (!Array.isArray(w.map)) w.map = [];
  w.h = w.map.length;
  w.w = w.h ? String(w.map[0]).length : 0;
  if (!Array.isArray(w.things)) w.things = [];
  if (!Array.isArray(w.robots)) w.robots = [];
  if (!Array.isArray(w.events)) w.events = [];
  if (!Array.isArray(w.schedule)) w.schedule = [];
  for (var i = 0; i < w.robots.length; i++) {
    var r = w.robots[i];
    if (!r.id) r.id = 'r' + i;
    r.x = Number(r.x) || 0; r.y = Number(r.y) || 0; r.d = ((Number(r.d) || 0) % 4 + 4) % 4;
    if (!Array.isArray(r.carry)) r.carry = [];
  }
  // P108 IW-002: a job names its targets by id; one named by its tile [x, y] is given an id (t + its index) here.
  var jb = jobOf(w);
  if (jb) {
    for (var ti = 0; ti < jb.targets.length; ti++) {
      var tg = jb.targets[ti];
      if (!Array.isArray(tg)) { jb.targets[ti] = String(tg); continue; }
      var hit = null;
      for (var q = 0; q < w.things.length && !hit; q++) { var cand = w.things[q]; if (cand && cand.x === Number(tg[0]) && cand.y === Number(tg[1]) && (JOB_KINDS[cand.kind] === 'target' || JOB_KINDS[cand.kind] === 'container')) hit = cand; }
      if (hit && !hit.id) hit.id = 't' + w.things.indexOf(hit);
      jb.targets[ti] = hit ? String(hit.id) : '';
    }
  }
  for (var si = 0; si < w.things.length; si++) if (w.things[si] && w.things[si].kind === 'site') w.things[si].stage = stageOf(w.things[si]);
  restage(w);
  return w;
}
/**
 * P108 IW-007 (s5 base): a building's stage. Its parts (sites with the same of) share ONE stage by the share of all their
 * materials delivered: 0 nothing yet (the pegs) · 1 .. n − 2 on the way · n − 1 finished (every part full). n is its
 * blueprint's stages (BUILD_STAGES by its build; 4 when unknown). Written on every part as bstage.
 */
function buildStage(have, need, n) {
  var k = Math.max(2, Math.floor(Number(n)) || 4);
  if (!(have > 0)) return 0;
  if (have >= need) return k - 1;
  return Math.min(k - 2, 1 + Math.floor((k - 2) * have / need));
}
function restage(w) {
  var sum = {};
  for (var i = 0; i < w.things.length; i++) { var t = w.things[i]; if (!t || t.kind !== 'site' || !isSet(t.of)) continue; var m = meterOf(t), k = String(t.of); if (!sum[k]) sum[k] = { have: 0, need: 0, n: BUILD_STAGES[String(t.build)] || 4 }; sum[k].have += m.have; sum[k].need += m.need; }
  for (var j = 0; j < w.things.length; j++) { var u = w.things[j]; if (u && u.kind === 'site' && isSet(u.of) && sum[String(u.of)]) u.bstage = buildStage(sum[String(u.of)].have, sum[String(u.of)].need, sum[String(u.of)].n); }
}
/** IW-002: a full path site reads as path (P) whatever the map says under it; the site thing stays (wear can take a stone back). */
function tileAt(w, x, y) {
  if (x < 0 || y < 0 || y >= w.h || x >= w.w) return '';
  var c = String(w.map[y]).charAt(x);
  // P108 IW-003 (lane S): a path square only (pathSite) — a finished bench is not path.
  if (c !== 'P' && Array.isArray(w.things)) for (var i = 0; i < w.things.length; i++) { var t = w.things[i]; if (t && pathSite(t) && t.x === x && t.y === y && isFull(t)) return 'P'; }
  return c;
}
function thingsAt(w, x, y, kind) {
  var out = [];
  for (var i = 0; i < w.things.length; i++) { var t = w.things[i]; if (t.x === x && t.y === y && (!kind || t.kind === kind)) out.push(t); }
  return out;
}
function blocked(w, x, y) {
  var c = tileAt(w, x, y);
  if (c === '') return true;
  if (BLOCKING_TILES[c]) return true;
  var th = thingsAt(w, x, y);
  for (var i = 0; i < th.length; i++) if (BLOCKING_THINGS[th[i].kind] || buildSite(th[i])) return true;
  return false;
}
function robotOf(w, id) { for (var i = 0; i < w.robots.length; i++) if (w.robots[i].id === id) return w.robots[i]; return w.robots[0] || null; }
function front(r) { return { x: r.x + DX[r.d], y: r.y + DY[r.d] }; }
function basketOf(r) { return Math.max(1, Math.floor(Number(r.basket)) || 4); }
/** IG-002: the can. null = this robot has no can (water is free, as before IG-002); a number is the waters it holds. */
function canOf(r) { if (!r || r.can === undefined || r.can === null || r.can === '' || !isFinite(Number(r.can))) return null; return Math.max(0, Math.floor(Number(r.can))); }
function canMaxOf(r) { return Number(r.canMax) > 0 ? Math.floor(Number(r.canMax)) : CAN_MAX; }
/** A tile whose rock was mined to nothing (the world's spent list: the rock thing itself is gone). */
function spentAt(w, x, y) { return Array.isArray(w.spent) && w.spent.indexOf(x + ',' + y) !== -1; }
function tulipsOf(w) { var n = 0, wet = 0; for (var i = 0; i < w.things.length; i++) if (w.things[i].kind === 'tulip') { n++; if (w.things[i].watered) wet++; } return { total: n, watered: wet }; }
// ── P108 IW-002: the job model — meters, containers, the can as a thing, the finish line, the walk home, wear ──
function jobOf(w) { return w && w.job && typeof w.job === 'object' && Array.isArray(w.job.targets) ? w.job : null; }
function thingById(w, id) { if (id === undefined || id === null || id === '') return null; for (var i = 0; i < w.things.length; i++) if (w.things[i] && String(w.things[i].id) === String(id)) return w.things[i]; return null; }
/** The thing a delta names: by its id, else the first of its kind on its tile. */
function thingOf(w, ref, kinds) {
  var t = ref && ref.id ? thingById(w, ref.id) : null;
  if (t) return t;
  for (var i = 0; i < w.things.length; i++) { var c = w.things[i]; if (c && c.x === ref.x && c.y === ref.y && (kinds ? kinds[c.kind] : c.kind === ref.kind)) return c; }
  return null;
}
function itemOf(t) { return String((t && t.item) || JOB_ITEMS[t && t.kind] || ''); }
/** A tulip with a meter (have or need set). One without keeps today's watered flag: need 1, one pour. */
function hasMeter(t) { return !!t && ((t.need !== undefined && t.need !== null) || (t.have !== undefined && t.have !== null)); }
/** A thing's meter: a tulip's drinks, a site's stones, a container's count of its capacity (none: never full). */
function meterOf(t) {
  if (!t) return { have: 0, need: 0 };
  if (t.kind === 'tulip') {
    var nd = Number(t.need) > 0 ? Math.floor(Number(t.need)) : 1;
    var hv = t.have !== undefined && t.have !== null && isFinite(Number(t.have)) ? Math.max(0, Math.floor(Number(t.have))) : (t.watered ? nd : 0);
    return { have: Math.min(hv, nd), need: nd };
  }
  if (t.kind === 'site') { var sn = Number(t.need) > 0 ? Math.floor(Number(t.need)) : 1; return { have: Math.max(0, Math.min(sn, Math.floor(Number(t.have)) || 0)), need: sn }; }
  if (JOB_KINDS[t.kind] === 'container') {
    var cn = t.count !== undefined && t.count !== null ? t.count : t.food;
    return { have: Math.max(0, Math.floor(Number(cn)) || 0), need: Number(t.capacity) > 0 ? Math.floor(Number(t.capacity)) : Infinity };
  }
  return { have: 0, need: 0 };
}
function isFull(t) { var m = meterOf(t); return m.need > 0 && m.have >= m.need; }
function meterDelta(t, x, y, have) { var m = meterOf(t); return { id: String(t.id || ''), x: x, y: y, have: have, need: isFinite(m.need) ? m.need : 0 }; }
/** A site's look: dirt (0) · gravel (under half) · cobbles (under full) · path (full). */
function stageOf(t) { var m = meterOf(t); return SITE_STAGES[m.have <= 0 ? 0 : m.have * 2 < m.need ? 1 : m.have < m.need ? 2 : 3]; }
/** Write a meter (never below 0, never above the need): a tulip's drinks and watered flag, a site's stones and stage, a container's count (a bowl's food too). */
function setMeter(t, have) {
  var m = meterOf(t), h = Math.max(0, Math.floor(Number(have)) || 0);
  if (isFinite(m.need)) h = Math.min(m.need, h);
  if (t.kind === 'tulip') { if (hasMeter(t)) t.have = h; t.watered = h >= m.need; }
  else if (t.kind === 'site') { t.have = h; t.stage = stageOf(t); }
  else if (JOB_KINDS[t.kind] === 'container') { t.count = h; if (t.kind === 'bowl') t.food = h; }
}
/** A can world: a can lies on the map, or a robot holds one, or a robot row says it needs one. There, fill and water need the can in hand. */
function canWorld(w) {
  for (var i = 0; i < w.things.length; i++) if (w.things[i] && w.things[i].kind === 'can') return true;
  for (var j = 0; j < w.robots.length; j++) if (w.robots[j].holds === 'can' || w.robots[j].needsCan === true) return true;
  return false;
}
/** How much of the job is done: its targets, and how many are full. */
function jobProgress(w) {
  var j = jobOf(w), full = 0, total = 0;
  if (!j) return { full: 0, total: 0 };
  for (var i = 0; i < j.targets.length; i++) { total++; if (isFull(thingById(w, j.targets[i]))) full++; }
  return { full: full, total: total };
}
function jobDone(w) { var p = jobProgress(w); return p.total > 0 && p.full === p.total; }
/**
 * P108 s7: her land's spa, once FINISHED (every part of building job.rest.of full), is where its robots rest when a job
 * is done — a tile each in front of it (job.rest.tiles, by the robot's place in the world: the first robot the first tile).
 * Read live, so the walk after the last plank already goes there. Null while the spa is going up, or with no job.rest.
 */
function restOf(w, r) {
  var j = jobOf(w);
  if (!j || !j.rest || !Array.isArray(j.rest.tiles) || !j.rest.tiles.length) return null;
  var parts = 0;
  for (var i = 0; i < w.things.length; i++) {
    var t = w.things[i];
    if (!t || t.kind !== 'site' || String(t.of) !== String(j.rest.of)) continue;
    if (!(Number(t.have) >= Number(t.need))) return null;
    parts++;
  }
  if (!parts) return null;
  var k = 0;
  for (var q = 0; q < w.robots.length; q++) if (r && w.robots[q] && String(w.robots[q].id) === String(r.id)) { k = q; break; }
  return j.rest.tiles[Math.min(k, j.rest.tiles.length - 1)];
}
/** The robot's home: the finished spa's rest (P108 s7), else its own (r.home as a tile), else the job's. */
function homeOf(w, r) {
  var rest = restOf(w, r);
  if (rest) return rest;
  if (r && r.home && typeof r.home === 'object' && isFinite(Number(r.home.x)) && isFinite(Number(r.home.y))) return r.home;
  var j = jobOf(w);
  return j && j.home && typeof j.home === 'object' && isFinite(Number(j.home.x)) && isFinite(Number(j.home.y)) ? j.home : null;
}
/** The first tile of a shortest path from one tile to another over tiles that do not block (breadth first; up, right, down, left). */
function bfsNext(w, fx, fy, tx, ty) {
  if (fx === tx && fy === ty) return null;
  var from = {}, start = fx + ',' + fy, q = [[fx, fy]], head = 0;
  from[start] = '';
  while (head < q.length) {
    var c = q[head++];
    if (c[0] === tx && c[1] === ty) break;
    for (var d = 0; d < 4; d++) {
      var nx = c[0] + DX[d], ny = c[1] + DY[d], k = nx + ',' + ny;
      if (from[k] !== undefined || blocked(w, nx, ny)) continue;
      from[k] = c[0] + ',' + c[1];
      q.push([nx, ny]);
    }
  }
  var cur = tx + ',' + ty;
  if (from[cur] === undefined) return null;
  while (from[cur] !== start) cur = from[cur];
  var p = cur.split(',');
  return { x: Number(p[0]), y: Number(p[1]) };
}
/** One tick of the walk home (the engine's, not the child's program): a turn or a step on the shortest path; at home, face home.d, then the home event. */
function homeStep(w, run, s, delta) {
  var r = robotOf(w, run.robotId), hm = r ? homeOf(w, r) : null;
  delta.op = 'home';
  s.guard = (Number(s.guard) || 0) + 1;
  if (!r || !hm || s.guard > (w.w * w.h + 4) * 3) { delta.nothing = true; if (r) delta.lost = { id: r.id, x: r.x, y: r.y }; run.pc++; return; }
  var hx = Math.floor(Number(hm.x)), hy = Math.floor(Number(hm.y)), want = r.d;
  if (r.x === hx && r.y === hy) {
    if (hm.d !== undefined && hm.d !== null && hm.d !== '' && isFinite(Number(hm.d))) want = ((Math.floor(Number(hm.d)) % 4) + 4) % 4;
    if (want === r.d) { delta.home = { id: r.id, x: r.x, y: r.y }; delta.sayKey = 'sayHome'; run.pc++; return; }
  } else {
    var nx = bfsNext(w, r.x, r.y, hx, hy);
    if (!nx) { delta.nothing = true; delta.lost = { id: r.id, x: r.x, y: r.y }; run.pc++; return; }
    for (var d = 0; d < 4; d++) if (r.x + DX[d] === nx.x && r.y + DY[d] === nx.y) want = d;
    if (want === r.d) { delta.move = { id: r.id, x: nx.x, y: nx.y }; return; }
  }
  delta.turn = { id: r.id, d: (want - r.d + 4) % 4 === 3 ? (r.d + 3) % 4 : (r.d + 1) % 4 };
}
/**
 * Wear (R2, D7): what the world loses and grows at island tick age — ONLY the island tick calls this, never step or
 * runToEnd. One thing of each worn kind per period (a tulip, a bowl, a basket, a store: picked by the seed; a site: the
 * most walked), never below 0; a rock with a max regrows a stone; a hen lays on a free tile of her pen; a letter comes.
 * Returns deltas for apply (the only writer); the last carries the seed when a draw was made.
 */
function wearOf(worldIn, age) {
  var w = worldOf(worldIn), out = [], n = Math.floor(Number(age)) || 0, drew = false;
  if (n <= 0) return out;
  var rnd = rngOf(w);
  function due(kind) { return Number(WEAR[kind]) > 0 && n % Number(WEAR[kind]) === 0; }
  var picked = ['tulip', 'bowl', 'basket', 'store'];
  for (var k = 0; k < picked.length; k++) {
    if (!due(picked[k])) continue;
    var pool = [];
    for (var i = 0; i < w.things.length; i++) if (w.things[i] && w.things[i].kind === picked[k] && meterOf(w.things[i]).have > 0) pool.push(w.things[i]);
    if (!pool.length) continue;
    var t = pool[Math.floor(rnd() * pool.length)];
    drew = true;
    out.push({ wear: { id: String(t.id || ''), kind: t.kind, x: t.x, y: t.y, have: meterOf(t).have - 1 } });
  }
  if (due('site')) {
    var best = null;
    // P108 IW-007 (s5 base): a building's part (keep) never wears — a building never un-builds (R2, IW-007 AC3).
    for (var s2 = 0; s2 < w.things.length; s2++) { var st = w.things[s2]; if (st && st.kind === 'site' && !st.keep && meterOf(st).have > 0 && (!best || (Number(st.walked) || 0) > (Number(best.walked) || 0))) best = st; }
    if (best) out.push({ wear: { id: String(best.id || ''), kind: 'site', x: best.x, y: best.y, have: meterOf(best).have - 1 } });
  }
  // P108 IW-007 (s5 base): every source with a max regrows one on its own clock (rock 30, tree 40, patch 30).
  for (var r2 = 0; r2 < w.things.length; r2++) { var rk = w.things[r2]; if (rk && SOURCE_ITEMS[rk.kind] && due(rk.kind) && Number(rk.max) > 0 && (Math.floor(Number(rk.left)) || 0) < Math.floor(Number(rk.max))) out.push({ regrow: { id: String(rk.id || ''), kind: rk.kind, x: rk.x, y: rk.y, left: (Math.floor(Number(rk.left)) || 0) + 1 } }); }
  if (due('hen')) for (var h = 0; h < w.things.length; h++) {
    var hen = w.things[h];
    if (!hen || hen.kind !== 'hen' || !Array.isArray(hen.pen) || hen.pen.length !== 4) continue;
    var x0 = Math.min(hen.pen[0], hen.pen[2]), x1 = Math.max(hen.pen[0], hen.pen[2]), y0 = Math.min(hen.pen[1], hen.pen[3]), y1 = Math.max(hen.pen[1], hen.pen[3]);
    var cap = Number(hen.capacity) > 0 ? Math.floor(Number(hen.capacity)) : HEN_CAPACITY, eggs = 0, free = [];
    for (var py = y0; py <= y1; py++) for (var px = x0; px <= x1; px++) {
      eggs += thingsAt(w, px, py, 'egg').length;
      if (tileAt(w, px, py) !== '' && !blocked(w, px, py) && !thingsAt(w, px, py).length) free.push({ x: px, y: py });
    }
    if (eggs >= cap || !free.length) continue;
    var at = free[Math.floor(rnd() * free.length)];
    drew = true;
    out.push({ lay: { x: at.x, y: at.y } });
  }
  if (due('postbox')) for (var b = 0; b < w.things.length; b++) { var pb = w.things[b]; if (pb && pb.kind === 'postbox' && !thingsAt(w, pb.x, pb.y, 'letter').length) out.push({ letter: { x: pb.x, y: pb.y } }); }
  // P108 IW-003 (lane P): a door's owner takes a letter in; the post box's new letter is addressed.
  if (mailWear(w, n, rnd, out)) drew = true;
  if (drew) out.push({ seed: w.seed });
  return out;
}
/** The last Olive answer, read as a word. yes/oui/true and no/non/false are one word each. */
function oliveSays(run, arg) {
  var a = run && run.lastAnswer;
  if (!a || typeof a !== 'object') return false;
  var v = a.value !== undefined && a.value !== null ? a.value : a.text;
  if (v === undefined || v === null) return false;
  var got = String(v).trim().toLowerCase();
  var want = String(arg === undefined || arg === null ? 'yes' : arg).trim().toLowerCase();
  var YES = { yes: 1, oui: 1, 'true': 1 }, NO = { no: 1, non: 1, 'false': 1 };
  if (want === 'yes' || want === 'oui') return !!YES[got];
  if (want === 'no' || want === 'non') return !!NO[got];
  return got === want;
}
/** A sensor reads the world JSON and the run. Nothing else. */
function sense(w, run, name, arg) {
  var r = robotOf(w, run.robotId);
  if (!r) return false;
  var f = front(r);
  if (name === 'wall_ahead') return blocked(w, f.x, f.y);
  if (name === 'tulip_ahead') return thingsAt(w, f.x, f.y, 'tulip').length > 0;
  if (name === 'bowl_empty') { var b = thingsAt(w, f.x, f.y, 'bowl'); return b.length > 0 && !(Number(b[0].food) > 0); }
  if (name === 'basket_full') return r.carry.length >= basketOf(r);
  if (name === 'can_empty') { var cn = canOf(r); return cn !== null && cn <= 0; }
  if (name === 'count_is') return (Number(run.count) || 0) === Number(arg);
  if (name === 'olive_says') return oliveSays(run, arg);
  // IG-001 D7: the picker offers "Olive says yes" / "Olive says no" as one sensor value each (olive_says:yes, olive_says:no).
  if (name.indexOf('olive_says:') === 0) return oliveSays(run, name.slice(11));
  // IG-006 AC2: "if Olive read [red tulip]" — the thing her last read answer named (its id, so either language matches).
  if (name.indexOf('olive_read:') === 0) return !!run.lastAnswer && run.lastAnswer.object === name.slice(11);
  return false;
}
// ── P108 IW-005 (lane J): conditions and values (brief 4.3), seek (go to nearest, go to), reservation ──────────
/** An expression nested deeper than this is malformed: the whole of it reads as false / 0 (it never throws out, never hangs). */
var EXPR_DEPTH = 32;
function exprText(v) { return String(v === undefined || v === null ? '' : v).trim().toLowerCase(); }
function exprNum(v) { if (typeof v === 'number') return isFinite(v) ? v : null; if (typeof v === 'string' && v.trim() !== '' && isFinite(Number(v))) return Number(v); return null; }
function isSet(v) { return v !== undefined && v !== null && v !== ''; }
function reservedOf(w) { return w && w.reserved && typeof w.reserved === 'object' && !Array.isArray(w.reserved) ? w.reserved : {}; }
/** A thing's id for a reservation: its own, else one minted from its kind and tile (kind@x,y, then #2, #3 when taken). */
function mintId(w, t) {
  if (isSet(t.id)) return String(t.id);
  var base = String(t.kind) + '@' + t.x + ',' + t.y, id = base, n = 1;
  while (thingById(w, id)) id = base + '#' + (++n);
  return id;
}
/**
 * The thing Olive's last read names: the first thing whose id, name or owner is her object (or whose read-object id is,
 * so red_tulip finds the red tulip); then, when her word is no object id (a name: "Mamie"), the first whose id, name or
 * owner is that word. null when she read nothing.
 */
function readThing(w, run) {
  var a = run && run.lastAnswer;
  if (!a || typeof a !== 'object') return null;
  var obj = exprText(a.object), said = a.value !== undefined && a.value !== null ? a.value : a.text;
  var word = Array.isArray(said) || typeof said === 'object' ? '' : exprText(said);
  var keys = [obj, word];
  for (var p = 0; p < keys.length; p++) {
    if (!keys[p]) continue;
    for (var i = 0; i < w.things.length; i++) {
      var t = w.things[i];
      if (!t) continue;
      if (exprText(t.id) === keys[p] || exprText(t.name) === keys[p] || exprText(t.owner) === keys[p] || (p === 0 && oliveObjectOf(t) === keys[p])) return t;
    }
  }
  return null;
}
/**
 * A REF resolved against the world: { kind, x, y } plus thing (a thing on the map), tile (ahead / here), held (what the
 * robot carries: kind can when it holds the can, else kind held = its carry list) or robot. null = not found.
 */
function refOf(w, run, r, ref) {
  if (!ref || typeof ref !== 'object' || Array.isArray(ref) || !r) return null;
  var which = ref.ref;
  if (which === 'ahead' || which === 'here') { var p = which === 'ahead' ? front(r) : { x: r.x, y: r.y }; return { kind: which, tile: true, x: p.x, y: p.y }; }
  if (which === 'held') return { kind: r.holds === 'can' ? 'can' : 'held', held: true, x: r.x, y: r.y };
  if (which === 'robot') return { kind: 'robot', robot: true, x: r.x, y: r.y };
  if (which === 'read') { var rt = readThing(w, run); return rt ? { kind: String(rt.kind), thing: rt, x: rt.x, y: rt.y } : null; }
  if (isSet(which)) return null;
  // A chip picked on the world: by its id, else the first thing of its kind on its tile, else (a can) the can the robot holds.
  var byId = isSet(ref.id) ? thingById(w, ref.id) : null;
  if (byId) return { kind: String(byId.kind), thing: byId, x: byId.x, y: byId.y };
  var k = String(ref.kind || ''), x = Math.floor(Number(ref.x)), y = Math.floor(Number(ref.y));
  for (var i = 0; i < w.things.length; i++) { var t = w.things[i]; if (t && t.kind === k && t.x === x && t.y === y) return { kind: k, thing: t, x: t.x, y: t.y }; }
  if (k === 'can' && r.holds === 'can') return { kind: 'can', held: true, x: r.x, y: r.y };
  return null;
}
function carried(r, what) { var n = 0; for (var i = 0; i < r.carry.length; i++) if (String(r.carry[i]) === what) n++; return n; }
/** How many of what the thing holds (VAL count): a container's count of its own item; what the robot carries; the things on a tile; a hen's eggs in her pen. */
function countIn(w, r, it, what) {
  if (!it) return 0;
  if (it.tile) return thingsAt(w, it.x, it.y, what).length;
  if (it.robot || it.held) return carried(r, what);
  var t = it.thing;
  if (JOB_KINDS[t.kind] === 'container') return itemOf(t) === what ? meterOf(t).have : 0;
  if (t.kind === 'hen' && what === 'egg' && Array.isArray(t.pen) && t.pen.length === 4) {
    var n = 0, x0 = Math.min(t.pen[0], t.pen[2]), x1 = Math.max(t.pen[0], t.pen[2]), y0 = Math.min(t.pen[1], t.pen[3]), y1 = Math.max(t.pen[1], t.pen[3]);
    for (var py = y0; py <= y1; py++) for (var px = x0; px <= x1; px++) n += thingsAt(w, px, py, 'egg').length;
    return n;
  }
  return 0;
}
/** A thing's level (VAL level): a can's water (held or on the map), a container's count, a target's have, a rock's stones; held with no can, or the robot: how many it carries. */
function levelIn(w, r, it) {
  if (!it || it.tile) return 0;
  if (it.robot) return r.carry.length;
  if (it.held) return it.kind === 'can' ? canOf(r) || 0 : r.carry.length;
  var t = it.thing;
  if (t.kind === 'can') return Math.max(0, Math.floor(Number(t.level)) || 0);
  if (SOURCE_ITEMS[t.kind]) return Math.max(0, Math.floor(Number(t.left)) || 0);
  if (t.kind === 'tulip' || t.kind === 'site' || JOB_KINDS[t.kind] === 'container') return meterOf(t).have;
  return 0;
}
/** Is the thing in that state (COND is; the states by kind, brief 4.3). Unknown state or thing: false. */
function stateOf(w, r, it, state, n, what) {
  if (!it) return false;
  var need = isSet(n) && isFinite(Number(n)) ? Number(n) : 1;
  if (state === 'front') { var f = front(r); return !it.held && !it.robot && it.x === f.x && it.y === f.y; }
  if (it.tile) {
    if (state === 'wall') return blocked(w, it.x, it.y);
    var on = thingsAt(w, it.x, it.y), real = [];
    for (var i = 0; i < on.length; i++) if (on[i].kind !== 'puddle') real.push(on[i]);
    if (state === 'nothing') return !real.length && !blocked(w, it.x, it.y);
    if (state === 'has') { if (!isSet(what)) return real.length > 0; for (var j = 0; j < real.length; j++) if (real[j].kind === String(what)) return true; return false; }
    return false;
  }
  if ((it.held && it.kind === 'held') || it.robot) {
    if (state === 'empty') return r.carry.length === 0;
    if (state === 'full') return r.carry.length >= basketOf(r);
    if (state === 'has') return (isSet(what) ? carried(r, String(what)) : r.carry.length) >= need;
    return false;
  }
  var lv = null, mx = 0;
  if (it.held) { lv = canOf(r) || 0; mx = canMaxOf(r); }
  else if (it.thing.kind === 'can') { lv = Math.max(0, Math.floor(Number(it.thing.level)) || 0); mx = Number(it.thing.max) > 0 ? Math.floor(Number(it.thing.max)) : CAN_MAX; }
  if (lv !== null) { if (state === 'empty') return lv <= 0; if (state === 'full') return lv >= mx; if (state === 'has') return lv >= need; return false; }
  var t = it.thing, m = meterOf(t);
  if (JOB_KINDS[t.kind] === 'container') { if (state === 'empty') return m.have <= 0; if (state === 'full') return isFinite(m.need) && m.have >= m.need; if (state === 'has') return m.have >= need; return false; }
  if (t.kind === 'tulip') { if (state === 'drunk') return isFull(t); if (state === 'thirsty') return !isFull(t); return false; }
  if (t.kind === 'site') { if (state === 'done') return isFull(t); if (state === 'dirt') return m.have <= 0; return false; }
  // P108 IW-007 (s5 base): every source reads like the rock (stones: something left to pick; used: nothing left).
  if (SOURCE_ITEMS[t.kind]) { var left = Math.floor(Number(t.left)) || 0; if (state === 'stones') return left > 0; if (state === 'used') return left <= 0; return false; }
  return false;
}
function valOf(w, run, r, v, depth) {
  if (depth > EXPR_DEPTH) throw new Error('deep');
  if (!v || typeof v !== 'object' || Array.isArray(v)) return 0;
  if (v.op === 'num') { var n = Number(v.n); return isFinite(n) ? n : 0; }
  if (v.op === 'text') return isSet(v.s) && typeof v.s !== 'object' ? String(v.s) : '';
  if (v.op === 'var') { var vs = run.vars && typeof run.vars === 'object' ? run.vars : {}, k = String(v.name); var x = Object.prototype.hasOwnProperty.call(vs, k) ? vs[k] : 0; return typeof x === 'number' || typeof x === 'string' ? x : 0; }
  if (v.op === 'read') { var a = run.lastAnswer; if (!a || typeof a !== 'object') return ''; if (isSet(a.object)) return String(a.object); var said = a.value !== undefined && a.value !== null ? a.value : a.text; return isSet(said) && typeof said !== 'object' ? String(said) : ''; }
  if (v.op === 'count') return countIn(w, r, refOf(w, run, r, v.thing), String(v.what || ''));
  if (v.op === 'level') return levelIn(w, r, refOf(w, run, r, v.thing));
  return 0;
}
function condOf(w, run, r, c, depth) {
  if (depth > EXPR_DEPTH) throw new Error('deep');
  if (!c || typeof c !== 'object' || Array.isArray(c)) return false;
  var subA = !!c.a && typeof c.a === 'object', subB = !!c.b && typeof c.b === 'object';
  if (c.op === 'and') return subA && subB && condOf(w, run, r, c.a, depth + 1) && condOf(w, run, r, c.b, depth + 1);
  if (c.op === 'or') return subA && subB && (condOf(w, run, r, c.a, depth + 1) || condOf(w, run, r, c.b, depth + 1));
  if (c.op === 'not') return subA && !condOf(w, run, r, c.a, depth + 1);
  if (c.op === 'sensor') return sense(w, run, String(c.sensor || ''), c.arg);
  if (c.op === 'cmp') {
    if (!subA || !subB) return false;
    var a = valOf(w, run, r, c.a, depth + 1), b = valOf(w, run, r, c.b, depth + 1), na = exprNum(a), nb = exprNum(b);
    if (na !== null && nb !== null) return c.cmp === 'eq' ? na === nb : c.cmp === 'lt' ? na < nb : c.cmp === 'gt' ? na > nb : false;
    return c.cmp === 'eq' && typeof a === 'string' && typeof b === 'string' ? exprText(a) === exprText(b) : false;
  }
  if (c.op === 'is') return stateOf(w, r, refOf(w, run, r, c.thing), String(c.state || ''), c.n, c.what);
  return false;
}
/** A COND on the world and the run: never throws — a malformed expression, an unknown state, a thing not found: false. */
function evalCond(w, run, c) { try { var r = robotOf(w, run && run.robotId); return !!r && condOf(w, run || {}, r, c, 0); } catch (e) { return false; } }
/** A VAL on the world and the run: a number or a text; never throws (0). */
function evalVal(w, run, v) { try { var r = robotOf(w, run && run.robotId); return r ? valOf(w, run || {}, r, v, 0) : 0; } catch (e) { return 0; } }
/** The sensor names a COND reads (its sensor leaves), for the senses goal. */
function condSensors(c, out, depth) {
  if (!c || typeof c !== 'object' || depth > EXPR_DEPTH) return out;
  if (c.op === 'sensor' && isSet(c.sensor)) out.push(String(c.sensor));
  condSensors(c.a, out, depth + 1); condSensors(c.b, out, depth + 1);
  return out;
}
/** An until / if step's condition: its cond when it has one (the sensor and arg ignored), else its sensor as before. */
function checkOf(w, run, s) { return s.cond !== undefined ? evalCond(w, run, s.cond) : sense(w, run, s.sensor, s.arg); }
/**
 * Every tile's path length from a tile over tiles that do not block, and the tile each was reached from (breadth first:
 * up, right, down, left). The world IS the robot's plot (the island steps each plot on its own map): off the map blocks, so a search never leaves the plot.
 */
function pathsFrom(w, fx, fy) {
  var dist = {}, from = {}, q = [[fx, fy]], head = 0;
  dist[fx + ',' + fy] = 0; from[fx + ',' + fy] = '';
  while (head < q.length) {
    var c = q[head++], dc = dist[c[0] + ',' + c[1]];
    for (var d = 0; d < 4; d++) {
      var nx = c[0] + DX[d], ny = c[1] + DY[d], k = nx + ',' + ny;
      if (dist[k] !== undefined || blocked(w, nx, ny)) continue;
      dist[k] = dc + 1; from[k] = c[0] + ',' + c[1];
      q.push([nx, ny]);
    }
  }
  return { dist: dist, from: from };
}
/** The tile to face a thing from: of its four neighbours (up, right, down, left of it) the one the robot reaches soonest (the first on a tie). */
function standFor(ps, t) {
  var best = null;
  for (var d = 0; d < 4; d++) { var sx = t.x + DX[d], sy = t.y + DY[d], n = ps.dist[sx + ',' + sy]; if (n !== undefined && (!best || n < best.n)) best = { x: sx, y: sy, d: (d + 2) % 4, n: n }; }
  return best;
}
/** The tiles from the robot to a stand tile, first step first. */
function routeTo(ps, st) {
  var out = [], cur = st.x + ',' + st.y;
  while (ps.from[cur]) { var p = cur.split(','); out.unshift([Number(p[0]), Number(p[1])]); cur = ps.from[cur]; }
  return out;
}
/**
 * go to nearest: of the things of that kind not reserved by another robot, the one the robot reaches in the fewest
 * steps; a tie goes to the upper one, then the left one (then the first in the world). null = none reachable.
 */
function nearestOf(w, r, kind, ps) {
  var res = reservedOf(w), best = null;
  for (var i = 0; i < w.things.length; i++) {
    var t = w.things[i];
    if (!t || t.kind !== kind) continue;
    if (seekSkips(t)) continue; // P108 IW-003 (lane S)
    if (isSet(t.id) && res[String(t.id)] && res[String(t.id)] !== r.id) continue;
    var st = standFor(ps, t);
    if (!st) continue;
    if (!best || st.n < best.st.n || (st.n === best.st.n && (t.y < best.t.y || (t.y === best.t.y && t.x < best.t.x)))) best = { t: t, st: st };
  }
  return best;
}
/** Does this robot hold a reservation (a run that ends releases them). */
function heldBy(w, id) { var res = reservedOf(w); for (var k in res) if (res[k] === id) return true; return false; }
/**
 * One tick of go to nearest (op seek) or go to (op goto): one move or one quarter turn toward the tile facing the thing,
 * the block ending on the tick the robot stands there facing it. The route is searched once and kept on the step until
 * the thing moves or goes, or its next tile blocks (then searched again; s.searches and run.searches count the searches).
 * Nothing to reach: the none event and sayNone, and the block ends.
 */
function seekStep(w, run, s, delta) {
  var r = robotOf(w, run.robotId);
  delta.op = s.op === 'goto' ? 'go_to' : 'go_nearest';
  if (!r) { delta.nothing = true; run.pc++; return; }
  s.guard = (Number(s.guard) || 0) + 1;
  var t = null, kind = s.op === 'goto' ? String((s.ref && (s.ref.kind || s.ref.ref)) || '') : String(s.kind || '');
  // The target the step already walks to: still there, on the same tile, and (seek) still this robot's.
  if (s.target) {
    t = isSet(s.target.id) ? thingById(w, s.target.id) : null;
    if (!t && s.op === 'goto') { var again = refOf(w, run, r, s.ref); t = again && again.thing ? again.thing : null; }
    var res = reservedOf(w);
    if (!t || t.x !== s.target.x || t.y !== s.target.y || (s.op === 'seek' && isSet(t.id) && res[String(t.id)] && res[String(t.id)] !== r.id)) { t = null; s.route = null; }
  }
  if (s.route && s.route.length) { var nx = s.route[0]; if (blocked(w, nx[0], nx[1]) || Math.abs(nx[0] - r.x) + Math.abs(nx[1] - r.y) !== 1) s.route = null; }
  if (!t || !s.route) {
    var ps = pathsFrom(w, r.x, r.y), st = null, old = s.target ? s.target.id : '';
    s.searches = (Number(s.searches) || 0) + 1;
    run.searches = (Number(run.searches) || 0) + 1;
    if (s.op === 'seek') {
      var found = t ? { t: t, st: standFor(ps, t) } : null;
      if (!found || !found.st) found = nearestOf(w, r, kind, ps);
      if (found) { t = found.t; st = found.st; } else t = null;
    } else {
      var it = t ? { thing: t } : refOf(w, run, r, s.ref);
      if (it && (it.held || (it.tile && it.kind === 'ahead'))) { delta.nothing = true; run.pc++; return; }
      if (it && it.thing) { t = it.thing; st = standFor(ps, t); } else t = null;
    }
    if (!t || !st || s.guard > (w.w * w.h + 4) * 3) {
      if (s.op === 'seek' && isSet(old) && reservedOf(w)[String(old)] === r.id) delta.release = { robot: r.id, thing: String(old) };
      delta.none = { id: r.id, kind: kind }; delta.sayKey = 'sayNone'; run.pc++; return;
    }
    var tid = mintId(w, t);
    if (s.op === 'seek' && reservedOf(w)[tid] !== r.id) {
      if (isSet(old) && String(old) !== tid && reservedOf(w)[String(old)] === r.id) delta.release = { robot: r.id, thing: String(old) };
      delta.reserve = { thing: tid, robot: r.id, kind: String(t.kind), x: t.x, y: t.y };
    }
    s.target = { id: tid, kind: String(t.kind), x: t.x, y: t.y };
    s.stand = { x: st.x, y: st.y, d: st.d };
    s.route = routeTo(ps, st);
    delta.aim = { id: r.id, x: st.x, y: st.y };
  }
  var want = r.d, x = r.x, y = r.y;
  if (s.route.length) {
    var nt = s.route[0];
    for (var d = 0; d < 4; d++) if (r.x + DX[d] === nt[0] && r.y + DY[d] === nt[1]) want = d;
    if (want === r.d) { delta.move = { id: r.id, x: nt[0], y: nt[1] }; s.route.shift(); x = nt[0]; y = nt[1]; }
    else delta.turn = { id: r.id, d: (want - r.d + 4) % 4 === 3 ? (r.d + 3) % 4 : (r.d + 1) % 4 };
  } else if (r.d !== s.stand.d) delta.turn = { id: r.id, d: (s.stand.d - r.d + 4) % 4 === 3 ? (r.d + 3) % 4 : (r.d + 1) % 4 };
  var nd = delta.turn ? delta.turn.d : r.d;
  if (!s.route.length && x === s.stand.x && y === s.stand.y && nd === s.stand.d) run.pc++;
}
/** set and change (brief 4.3): run.vars[name] = value, or += by (default 1); the delta's vars are every var after it. */
function varStep(w, run, s, delta) {
  delta.op = s.op;
  var name = isSet(s.name) ? String(s.name) : '';
  run.pc++;
  if (!name) { delta.nothing = true; return; }
  if (!run.vars || typeof run.vars !== 'object' || Array.isArray(run.vars)) run.vars = {};
  if (s.op === 'set') run.vars[name] = evalVal(w, run, s.value);
  else { var by = s.by === undefined || s.by === null ? 1 : exprNum(evalVal(w, run, s.by)); run.vars[name] = (exprNum(run.vars[name]) || 0) + (by === null ? 0 : by); }
  delta.vars = clone(run.vars);
}
// ── P108 IW-006 (lane H): the shop's helpers on one job (AC4). A helper is used on a job (a plot): the rain cloud fills
// every tulip there at once and is gone; the self-filling can and the wheelbarrow ride on that job until it crosses its
// finish line (the island tick puts them on the job's world before each step and takes them off at the finish line).
/** What the wheelbarrow lets a robot carry (the shop's line: "Carries eight, for one job"). */
var BARROW_CARRY = 8;
/** The rain cloud: every tulip of the world full (its meter at its need). Returns how many it filled. */
function helperRain(w) {
  var n = 0, list = w && Array.isArray(w.things) ? w.things : [];
  for (var i = 0; i < list.length; i++) if (list[i] && list[i].kind === 'tulip' && !isFull(list[i])) { setMeter(list[i], meterOf(list[i]).need); n++; }
  return n;
}
/** A riding helper put on a job's world: the self-filling can keeps every can (held, or lying on the plot) full; the wheelbarrow lets the robots carry BARROW_CARRY. */
function helperOn(w, h) {
  var bots = w && Array.isArray(w.robots) ? w.robots : [], list = w && Array.isArray(w.things) ? w.things : [];
  for (var i = 0; i < bots.length; i++) {
    var r = bots[i];
    if (!r) continue;
    if (h === 'selfcan' && canOf(r) !== null) r.can = canMaxOf(r);
    if (h === 'barrow') r.basket = Math.max(basketOf(r), BARROW_CARRY);
  }
  if (h === 'selfcan') for (var j = 0; j < list.length; j++) if (list[j] && list[j].kind === 'can') list[j].level = Number(list[j].max) > 0 ? Math.floor(Number(list[j].max)) : CAN_MAX;
  return w;
}
/**
 * Does a helper do anything for this job, as it stands? Never for a job that is done. Rain: a tulip not full. The
 * self-filling can: a job with a can (lying on the plot, held, or the robot's own). The wheelbarrow: a job whose targets
 * take carried things (a site, a basket, a bowl, a crate, a door).
 */
function helperFits(w, h) {
  if (!w || jobDone(w)) return false;
  var list = Array.isArray(w.things) ? w.things : [], bots = Array.isArray(w.robots) ? w.robots : [];
  if (h === 'rain') { for (var i = 0; i < list.length; i++) if (list[i] && list[i].kind === 'tulip' && !isFull(list[i])) return true; return false; }
  if (h === 'selfcan') { if (canWorld(w)) return true; for (var k = 0; k < bots.length; k++) if (canOf(bots[k]) !== null) return true; return false; }
  if (h === 'barrow') { var j = jobOf(w); if (!j) return false; for (var t = 0; t < j.targets.length; t++) { var th = thingById(w, j.targets[t]); if (th && (th.kind === 'site' || JOB_KINDS[th.kind] === 'container')) return true; } return false; }
  return false;
}
// ── P108 IW-003 (lane P): the post — a door takes letters, an addressed letter goes only into its owner's door, and
// Olive reads the name on an envelope (IW-005 dev. 6). The carry stays a list of plain strings (letter, stone, egg…):
// an addressed letter keeps its name in carryTo, a list BESIDE it (carryTo[i] is the name on carry[i], '' for none),
// which a robot has only while an addressed letter is in its hands — every other robot's JSON is exactly as before.
/** What an envelope says, by the name on it, in both languages (the shell's notes_read entries, cg005Olive.ts). */
var MAIL_NOTES = {"Mamie Rose":{"en":"For Mamie Rose.","fr":"Pour Mamie Rose."},"Sami":{"en":"For Sami.","fr":"Pour Sami."},"Biscuit":{"en":"For Biscuit.","fr":"Pour Biscuit."}};
function sameName(a, b) { return isSet(a) && isSet(b) && exprText(a) === exprText(b); }
/** The name on the thing the robot would put next (the last carried), '' when none. */
function mailTopTo(r) { return r && Array.isArray(r.carryTo) && r.carry.length && r.carryTo.length === r.carry.length ? String(r.carryTo[r.carry.length - 1] || '') : ''; }
/** pick: a letter taken from the post box keeps its name on the delta; a letter taken back out of a door wears its owner's. */
function mailPick(t, delta) {
  if (!t || !delta.pick) return;
  if (t.kind === 'letter' && isSet(t.to)) delta.pick.to = String(t.to);
  else if (t.kind === 'door' && isSet(t.owner)) delta.pick.to = String(t.owner);
}
/**
 * put with a door ahead (a door blocks, so nothing else can be put there): only its item (a letter) goes in, one at a
 * time, up to its capacity; a letter with a name goes only into the door whose owner is that name — else the wrongDoor
 * event, the letter stays in hand and the robot says so. true = handled (the put is over).
 */
function mailPut(w, run, r, f, delta) {
  var doors = thingsAt(w, f.x, f.y, 'door');
  if (!doors.length) return false;
  var door = doors[0], top = r.carry.length ? String(r.carry[r.carry.length - 1]) : '', to = mailTopTo(r);
  if (!top || top !== itemOf(door)) { delta.nothing = true; return true; }
  if (to && isSet(door.owner) && !sameName(to, door.owner)) { run.wrongDoors = (Number(run.wrongDoors) || 0) + 1; delta.wrongDoor = { id: r.id, x: f.x, y: f.y, to: to, owner: String(door.owner) }; delta.sayKey = 'iw3pWrongDoor'; return true; }
  var dm = meterOf(door);
  if (dm.have >= dm.need) { delta.full = { id: String(door.id || ''), x: f.x, y: f.y }; delta.sayKey = 'sayFull'; return true; }
  delta.post = { id: r.id, x: f.x, y: f.y, into: String(door.id || ''), owner: String(door.owner || ''), to: to };
  delta.meter = meterDelta(door, f.x, f.y, dm.have + 1); delta.sayKey = 'iw3pPosted';
  return true;
}
/**
 * Wear (the island tick only, from wearOf): every WEAR.door ticks a door's owner takes one letter in (the seed picks the
 * door), and a letter the post box gets this tick is addressed to that owner (else to a door still waiting). true = a
 * draw was made (wearOf then writes the seed back).
 */
function mailWear(w, n, rnd, out) {
  var drew = false, worn = null, pool = [];
  if (Number(WEAR.door) > 0 && n % Number(WEAR.door) === 0) {
    for (var i = 0; i < w.things.length; i++) if (w.things[i] && w.things[i].kind === 'door' && meterOf(w.things[i]).have > 0) pool.push(w.things[i]);
    if (pool.length) { worn = pool[Math.floor(rnd() * pool.length)]; drew = true; out.push({ wear: { id: String(worn.id || ''), kind: 'door', x: worn.x, y: worn.y, have: meterOf(worn).have - 1 } }); }
  }
  for (var k = 0; k < out.length; k++) {
    if (!out[k].letter || isSet(out[k].letter.to)) continue;
    var to = worn && isSet(worn.owner) ? String(worn.owner) : '';
    for (var j = 0; j < w.things.length && !to; j++) { var dj = w.things[j]; if (dj && dj.kind === 'door' && isSet(dj.owner) && !isFull(dj)) to = String(dj.owner); }
    if (to) out[k].letter.to = to;
  }
  return drew;
}
/**
 * apply's post half (after the rest of apply): a letter posted through a door; the names beside the carry kept in step
 * with it (both lists pop and push at their ends — a letter put on the ground keeps its name there); a letter the post
 * box got wears its name.
 */
function mailApply(w, d) {
  if (d.post) {
    var rp = robotOf(w, d.post.id), door = thingOf(w, { id: d.post.into, x: d.post.x, y: d.post.y }, { door: 1 });
    if (rp && door && rp.carry.length) { rp.carry.pop(); setMeter(door, meterOf(door).have + 1); }
  }
  if (d.put) {
    var ru = robotOf(w, d.put.id);
    if (ru && Array.isArray(ru.carryTo) && ru.carryTo.length > ru.carry.length && ru.carryTo[ru.carry.length]) for (var p = w.things.length - 1; p >= 0; p--) { var lp = w.things[p]; if (lp && lp.kind === d.put.kind && lp.x === d.put.x && lp.y === d.put.y) { lp.to = String(ru.carryTo[ru.carry.length]); break; } }
  }
  for (var i = 0; i < w.robots.length; i++) {
    var r = w.robots[i];
    if (!Array.isArray(r.carryTo)) continue;
    while (r.carryTo.length > r.carry.length) r.carryTo.pop();
    while (r.carryTo.length < r.carry.length) r.carryTo.push('');
  }
  if (d.pick && isSet(d.pick.to)) {
    var rk = robotOf(w, d.pick.id);
    if (rk && rk.carry.length) { if (!Array.isArray(rk.carryTo)) rk.carryTo = []; while (rk.carryTo.length < rk.carry.length) rk.carryTo.push(''); rk.carryTo[rk.carry.length - 1] = String(d.pick.to); }
  }
  for (var j = 0; j < w.robots.length; j++) { var rj = w.robots[j], any = false; if (!Array.isArray(rj.carryTo)) continue; for (var q = 0; q < rj.carryTo.length; q++) if (rj.carryTo[q]) any = true; if (!any) delete rj.carryTo; }
  if (d.letter && isSet(d.letter.to)) for (var t = w.things.length - 1; t >= 0; t--) { var lt = w.things[t]; if (lt && lt.kind === 'letter' && lt.x === d.letter.x && lt.y === d.letter.y && !isSet(lt.to)) { lt.to = String(d.letter.to); break; } }
}
/** The name on the envelope Olive would read: the letter in hand (the last carried), else the letter a pick would take from the tile ahead. */
function mailEnvelopeTo(w, r) {
  if (!r) return '';
  var to = mailTopTo(r);
  if (to) return to;
  var f = front(r), th = thingsAt(w, f.x, f.y);
  for (var i = 0; i < th.length; i++) if (PICKABLE[th[i].kind]) return th[i].kind === 'letter' && isSet(th[i].to) ? String(th[i].to) : '';
  return '';
}
/**
 * read with an envelope: what she reads is the envelope (the table's note for that name, in the run's language) and her
 * choices are the doors' owners on the plot. The step keeps the name (s.envelope): an ask that comes back with no word
 * (the island's tick and runToEnd take the fallback with none) reads it, as the shell's written answer does. Returns
 * the options.
 */
function mailRead(s, w, r, lang, args, options) {
  var to = mailEnvelopeTo(w, r), note = null, L = oliveL(lang);
  for (var k in MAIL_NOTES) if (sameName(k, to)) note = MAIL_NOTES[k];
  if (!note) { delete s.envelope; return options; }
  var out = [], seen = {};
  for (var i = 0; i < w.things.length; i++) { var dr = w.things[i]; if (dr && dr.kind === 'door' && isSet(dr.owner) && MAIL_NOTES[String(dr.owner)] && !seen[String(dr.owner)]) { seen[String(dr.owner)] = 1; out.push(String(dr.owner)); } }
  args.note = note[L];
  s.envelope = to;
  return out.length ? out : options;
}
/** An envelope read that came back with no word: the name on the envelope (the written answer's own). */
function mailFallback(run, s, v) {
  if (s.rung !== 'read' || !isSet(s.envelope) || (v !== undefined && v !== null && String(v) !== '')) return v;
  run.lastAnswer.value = String(s.envelope);
  return String(s.envelope);
}
/** Did this run's Olive read an envelope (the after-run line then names the door, not "the right row"). */
function mailRan(run) {
  var st = run && Array.isArray(run.steps) ? run.steps : [];
  for (var i = 0; i < st.length; i++) if (st[i] && st[i].op === 'ask' && st[i].rung === 'read' && isSet(st[i].envelope)) return true;
  return false;
}
// P108 IW-003 (lane B): a container that remembers a spot (layByWall) puts back on it the one it lost to wear —
// Biscuit takes his ball out of the basket and it rolls back to the wall, so the job reopens with a ball to fetch.
function rollOut(w, t) {
  if (!t || !Array.isArray(t.spot) || t.spot.length !== 2 || JOB_KINDS[t.kind] !== 'container') return;
  var it = itemOf(t), sx = Math.floor(Number(t.spot[0])), sy = Math.floor(Number(t.spot[1]));
  if (!PICKABLE[it] || !isFinite(sx) || !isFinite(sy)) return;
  w.things.push({ kind: it, x: sx, y: sy });
}

// ── P108 IW-003 (lane S): Sami's stones — go to nearest skips what is not worth the walk; a build site (the bench) ──
/**
 * go to nearest passes over a thing not worth the walk (IW-005 dev. 5; the mockup's rule): a rock with no stones left
 * (left 0 — a rock with a max stays on the map to regrow) and a target already full (a site or a tulip at its need).
 */
function seekSkips(t) {
  if (!t) return true;
  if (SOURCE_ITEMS[t.kind]) return !(Number(t.left) > 0);
  if (JOB_KINDS[t.kind] === 'target') return isFull(t);
  return false;
}
/** A path square: a site with no build. A full one reads as path (P); a site with a build (the bench) never does. */
function pathSite(t) { return !!t && t.kind === 'site' && !isSet(t.build); }
/** A build site (build: 'bench'): robots walk round it at every stage, and a finished bench is furniture Sami sits on. */
function buildSite(t) { return !!t && t.kind === 'site' && isSet(t.build); }
function slotsOf(b) { return b && b.slots && typeof b.slots === 'object' ? b.slots : {}; }
function bodyOf(b) { return b && Array.isArray(b.body) ? b.body : []; }
function collectTricks(list, out) {
  for (var i = 0; i < list.length; i++) { var b = list[i]; if (!b) continue; if (b.t === 'trick') out[String(slotsOf(b).name || '')] = bodyOf(b); if (b.body) collectTricks(bodyOf(b), out); if (Array.isArray(b.else)) collectTricks(b.else, out); }
  return out;
}
function collectHandlers(list, out) {
  for (var i = 0; i < list.length; i++) { var b = list[i]; if (!b) continue; if (b.t === 'when') out.push({ id: b.id, event: String(slotsOf(b).event || 'meow'), body: bodyOf(b) }); else { if (b.body) collectHandlers(bodyOf(b), out); if (Array.isArray(b.else)) collectHandlers(b.else, out); } }
  return out;
}
function countUses(list, type) {
  var n = 0;
  for (var i = 0; i < list.length; i++) { var b = list[i]; if (!b) continue; if (b.t === type) n++; if (b.body) n += countUses(bodyOf(b), type); if (Array.isArray(b.else)) n += countUses(b.else, type); }
  return n;
}
function countBlocks(list) { var n = 0; for (var i = 0; i < list.length; i++) { if (!list[i]) continue; n++; if (list[i].body) n += countBlocks(bodyOf(list[i])); if (Array.isArray(list[i].else)) n += countBlocks(list[i].else); } return n; }
function hasContainer(list) { for (var i = 0; i < list.length; i++) if (list[i] && list[i].body) return true; return false; }
function isAsk(b) { return b.t === 'ask' || String(b.t).indexOf('olive:') === 0; }
/**
 * An ask block as a step (CG-005). The rung is slots.rung, else the palette type's suffix (ask:<rung>). The slot values
 * are slots.args (a list or an object), else every other slot key (the kit writes slots flat, as strings). No dial:
 * the rung's own temperature. The shape: the block's, else the rung's.
 */
function askStep(b, slots) {
  var rung = slots.rung !== undefined && slots.rung !== null && slots.rung !== '' ? slots.rung : String(b.t).replace(/^olive:/, '');
  var args;
  if (Array.isArray(slots.args)) args = slots.args;
  else if (slots.args && typeof slots.args === 'object') args = clone(slots.args);
  else { args = {}; for (var k in slots) if (!ASK_RESERVED[k]) args[k] = slots[k]; }
  var hasDial = slots.dial !== undefined && slots.dial !== null && slots.dial !== '';
  var options = Array.isArray(slots.options) ? slots.options : typeof slots.options === 'string' && slots.options ? slots.options.split(',') : null;
  // IG-006: times — is it a…? asked once, or 3 times and the majority (the vote).
  var times = Math.floor(Number(slots.times)) === 3 ? 3 : 1;
  return { id: b.id, op: 'ask', rung: rung, args: args, shape: String(slots.shape || ASK_SHAPE[rung] || 'word'), dial: hasDial ? Math.max(0, Math.min(2, Math.floor(Number(slots.dial) || 0))) : -1, options: options, times: times };
}
/** The program as flat steps. Static where it can be (repeat, do), dynamic where the world decides (until, if, an Olive count). */
function flatten(list, tricks, out, depth) {
  out = out || []; depth = depth || 0;
  for (var i = 0; i < list.length; i++) {
    var b = list[i];
    if (!b || typeof b !== 'object') continue;
    var body = bodyOf(b), slots = slotsOf(b);
    if (b.t === 'repeat') {
      if (slots.n === 'olive') { out.push({ id: b.id, op: 'repeat_olive', body: body }); continue; }
      var n = Math.max(0, Math.min(99, Math.floor(Number(b.n) || 0)));
      for (var k = 0; k < n; k++) { out.push({ id: b.id, op: 'noop' }); flatten(body, tricks, out, depth); }
    } else if (b.t === 'until') { var us = { id: b.id, op: 'until', sensor: String(slots.sensor || 'wall_ahead'), arg: slots.arg, body: body, guard: 0 }; if (isSet(slots.cond)) us.cond = slots.cond; out.push(us); }
    else if (b.t === 'if') {
      // P108 IW-005: a cond (brief 4.3) is evaluated instead of the sensor; an else list runs when the check is false.
      var fs = { id: b.id, op: 'if', sensor: String(slots.sensor || 'tulip_ahead'), arg: slots.arg, body: body };
      if (isSet(slots.cond)) fs.cond = slots.cond;
      if (Array.isArray(b.else)) fs.alt = b.else;
      out.push(fs);
    }
    else if (b.t === 'go_nearest') out.push({ id: b.id, op: 'seek', kind: String(slots.kind || ''), guard: 0 });
    else if (b.t === 'go_to') out.push({ id: b.id, op: 'goto', ref: slots.thing && typeof slots.thing === 'object' ? clone(slots.thing) : null, guard: 0 });
    else if (b.t === 'set') out.push({ id: b.id, op: 'set', name: slots.name, value: slots.value === undefined ? null : clone(slots.value) });
    else if (b.t === 'change') out.push({ id: b.id, op: 'change', name: slots.name, by: slots.by === undefined ? null : clone(slots.by) });
    else if (b.t === 'when' || b.t === 'trick') continue;
    else if (b.t === 'do') { var tr = tricks[String(slots.name || '')]; out.push({ id: b.id, op: 'noop' }); if (tr && depth < MAX_TRICK_DEPTH) flatten(tr, tricks, out, depth + 1); }
    else if (isAsk(b)) out.push(askStep(b, slots));
    else out.push({ id: b.id, op: String(b.t), text: slots.text });
  }
  return out;
}
function newRun(program, robotId, lang, runId) {
  var prog = Array.isArray(program) ? program : [];
  var tricks = collectTricks(prog, {});
  return {
    robotId: String(robotId || ''), lang: String(lang) === 'fr' ? 'fr' : 'en',
    runId: runId !== undefined && runId !== null && runId !== '' ? String(runId) : 'run' + Date.now().toString(36) + Math.floor(Math.random() * 2176782336).toString(36),
    proposal: null, sensed: {},
    steps: flatten(prog, tricks), pc: 0, tick: 0, count: 0, bumps: 0, puddles: 0, watered: 0, said: 0, guardHits: 0, dries: 0, rockGone: 0,
    handled: {}, handlers: collectHandlers(prog, []), tricks: tricks, lastAnswer: null, waiting: false, askSeq: 0, done: false,
    blocks: countBlocks(prog)
  };
}
/** What one primitive does, as a delta. Reads the world; never writes it. */
function exec(w, run, s, delta) {
  var r = robotOf(w, run.robotId);
  if (!r) { delta.nothing = true; return; }
  var f = front(r);
  if (s.op === 'left' || s.op === 'right') { delta.turn = { id: r.id, d: s.op === 'left' ? (r.d + 3) % 4 : (r.d + 1) % 4 }; return; }
  if (s.op === 'fwd') {
    if (blocked(w, f.x, f.y)) { run.bumps++; delta.bump = { id: r.id, x: f.x, y: f.y }; delta.sayKey = 'sayBump'; return; }
    delta.move = { id: r.id, x: f.x, y: f.y }; return;
  }
  if (s.op === 'water') {
    // IG-002: a robot with a can spends one water per pour; an EMPTY can pours nothing — no water, no puddle — and the
    // dry event is the error message. A robot with no can (null) waters for free, as before.
    // P108 IW-002: in a can world the can must be in hand (else noCan, and nothing changes).
    if (canWorld(w) && r.holds !== 'can') { run.noCans = (Number(run.noCans) || 0) + 1; delta.noCan = { id: r.id }; delta.sayKey = 'sayNoCan'; return; }
    var can = canOf(r);
    if (can !== null && can <= 0) { run.dries++; delta.dry = { id: r.id, x: f.x, y: f.y }; delta.sayKey = 'sayDry'; return; }
    var tul = thingsAt(w, f.x, f.y, 'tulip');
    // IW-002: a tulip with a meter takes one drink up to its need; a full one refuses (nothing spent) and says so.
    if (tul.length && hasMeter(tul[0])) {
      var tm = meterOf(tul[0]);
      if (tm.have >= tm.need) { delta.full = { id: String(tul[0].id || ''), x: f.x, y: f.y }; delta.sayKey = 'sayFull'; return; }
      if (tm.have + 1 >= tm.need) run.watered++;
      delta.water = { x: f.x, y: f.y }; delta.meter = meterDelta(tul[0], f.x, f.y, tm.have + 1); delta.sayKey = 'sayDrink';
      if (can !== null) delta.can = { id: r.id, can: can - 1 };
      return;
    }
    if (tul.length) { if (!tul[0].watered) run.watered++; delta.water = { x: f.x, y: f.y }; delta.sayKey = 'sayDrink'; if (can !== null) delta.can = { id: r.id, can: can - 1 }; return; }
    var c = tileAt(w, f.x, f.y);
    if (c !== '' && c !== 'W') { if (!thingsAt(w, f.x, f.y, 'puddle').length) { run.puddles++; delta.puddle = { x: f.x, y: f.y }; } delta.splash = { x: f.x, y: f.y }; delta.sayKey = 'saySplash'; if (can !== null) delta.can = { id: r.id, can: can - 1 }; return; }
    delta.nothing = true; return;
  }
  // IG-002: fill at the water ahead fills the can to canMax; with no water ahead it is a no-op (no bump).
  if (s.op === 'fill') {
    if (canWorld(w) && r.holds !== 'can') { run.noCans = (Number(run.noCans) || 0) + 1; delta.noCan = { id: r.id }; delta.sayKey = 'sayNoCan'; return; }
    if (tileAt(w, f.x, f.y) === 'W') { delta.fill = { id: r.id, x: f.x, y: f.y }; delta.can = { id: r.id, can: canMaxOf(r) }; delta.sayKey = 'sayFill'; return; }
    delta.nothing = true; return;
  }
  if (s.op === 'pick') {
    var th = thingsAt(w, f.x, f.y), it = null, rock = null, box = null, rock0 = null, canT = null;
    for (var i = 0; i < th.length && !it; i++) if (PICKABLE[th[i].kind]) it = th[i];
    // P108 IW-007 (s5 base): any source (SOURCE_ITEMS: the rock, a tree, a patch) gives its item; the delta keeps rock: true.
    for (var ri = 0; ri < th.length && !rock; ri++) if (SOURCE_ITEMS[th[ri].kind] && Number(th[ri].left) > 0) rock = th[ri];
    // P108 IW-002: the can is a thing the robot picks up (it holds it; the can leaves the map with its level)…
    for (var ci = 0; ci < th.length && !canT; ci++) if (th[ci].kind === 'can') canT = th[ci];
    if (canT && r.holds !== 'can') { delta.holds = { id: r.id, what: 'can', x: f.x, y: f.y, level: Math.max(0, Math.floor(Number(canT.level)) || 0), max: Number(canT.max) > 0 ? Math.floor(Number(canT.max)) : 0 }; delta.sayKey = 'sayPick'; return; }
    // …a container gives one of its item; a rock with a max stays on the map at 0 (it regrows on island ticks).
    for (var bi = 0; bi < th.length && !box; bi++) if (JOB_KINDS[th[bi].kind] === 'container' && meterOf(th[bi]).have > 0) box = th[bi];
    for (var r0 = 0; r0 < th.length && !rock0; r0++) if (SOURCE_ITEMS[th[r0].kind] && !(Number(th[r0].left) > 0) && Number(th[r0].max) > 0) rock0 = th[r0];
    if (it && r.carry.length < basketOf(r)) { delta.pick = { id: r.id, kind: it.kind, x: f.x, y: f.y }; mailPick(it, delta); delta.sayKey = 'sayPick'; return; }
    // IG-002: a rock ahead gives one stone per pick (the basket bounds it); apply shrinks the rock and removes it at 0.
    if (!it && rock && r.carry.length < basketOf(r)) { delta.pick = { id: r.id, kind: SOURCE_ITEMS[rock.kind], x: f.x, y: f.y, rock: true }; if (rock.kind !== 'rock') delta.pick.source = rock.kind; delta.sayKey = 'sayPick'; return; }
    if (!it && !rock && box && r.carry.length < basketOf(r)) { delta.pick = { id: r.id, kind: itemOf(box), x: f.x, y: f.y, box: true, from: String(box.id || '') }; delta.meter = meterDelta(box, f.x, f.y, meterOf(box).have - 1); mailPick(box, delta); delta.sayKey = 'sayPick'; return; }
    // A pick where a rock was used up: a bump with nothing carried (the rockGone hint names why).
    // P108 s8 (ruled: "keep the wait, but show it"): a source that grows back says so (sayGrows<Kind>), not a plain bump.
    if (!it && !rock && (spentAt(w, f.x, f.y) || rock0)) { run.rockGone++; run.bumps++; delta.bump = { id: r.id, x: f.x, y: f.y }; delta.rockGone = { x: f.x, y: f.y }; delta.sayKey = rock0 && GROWS_SAID[rock0.kind] ? 'sayGrows' + rock0.kind.charAt(0).toUpperCase() + rock0.kind.slice(1) : 'sayBump'; return; }
    delta.nothing = true; return;
  }
  if (s.op === 'put') {
    // P108 IW-003 (lane P): a door ahead takes the letter (its owner's only), or refuses.
    if (mailPut(w, run, r, f, delta)) return;
    // P108 IW-002: a site, a basket or a store ahead takes its own item, one at a time, to its need; a full one refuses
    // (the item stays carried) and says so. Anything else carried is not put there.
    var top = r.carry.length ? String(r.carry[r.carry.length - 1]) : '', into = null, ahead = thingsAt(w, f.x, f.y);
    for (var ai = 0; ai < ahead.length && !into; ai++) if (ahead[ai].kind === 'site' || ahead[ai].kind === 'basket' || ahead[ai].kind === 'store') into = ahead[ai];
    if (into && top) {
      // P108 s8: the wrong item for this place stays carried, and the robot says what the place wants (it said nothing).
      if (top !== itemOf(into)) { var want = String(itemOf(into) || ''); delta.nothing = true; delta.wrong = { id: r.id, x: f.x, y: f.y, wants: want, has: top }; delta.sayKey = WANTS_SAID[want] ? 'sayWants' + want.charAt(0).toUpperCase() + want.slice(1) : 'sayWrongItem'; return; }
      var im = meterOf(into);
      if (im.have >= im.need) { delta.full = { id: String(into.id || ''), x: f.x, y: f.y }; delta.sayKey = 'sayFull'; return; }
      delta.stow = { id: r.id, kind: top, x: f.x, y: f.y, into: String(into.id || ''), target: into.kind };
      delta.meter = meterDelta(into, f.x, f.y, im.have + 1); delta.sayKey = 'sayPut';
      return;
    }
    // The can put back down, with its level, on a free tile ahead.
    if (r.holds === 'can' && tileAt(w, f.x, f.y) !== '' && !blocked(w, f.x, f.y) && !ahead.length) { delta.holds = { id: r.id, what: '', x: f.x, y: f.y, level: canOf(r) || 0, max: canMaxOf(r) }; delta.sayKey = 'sayPut'; return; }
    if (!r.carry.length) { delta.nothing = true; return; }
    var kind = String(r.carry[r.carry.length - 1]);
    var bowl = thingsAt(w, f.x, f.y, 'bowl');
    // IW-002: a bowl with a capacity refuses when full and shows its meter; one without fills as before.
    if (bowl.length && kind === itemOf(bowl[0]) && isFull(bowl[0])) { delta.full = { id: String(bowl[0].id || ''), x: f.x, y: f.y }; delta.sayKey = 'sayFull'; return; }
    if (bowl.length && kind === itemOf(bowl[0]) && Number(bowl[0].capacity) > 0) delta.meter = meterDelta(bowl[0], f.x, f.y, meterOf(bowl[0]).have + 1);
    // P108 IW-007 (s5 base): a bowl takes its own item (food, or an animal's carrots), nothing else.
    // P108 s8: anything else stays carried, and the robot says what the bowl wants.
    if (bowl.length) { if (kind === itemOf(bowl[0])) { delta.feed = { id: r.id, x: f.x, y: f.y }; delta.sayKey = 'sayPut'; return; } var bw = String(itemOf(bowl[0]) || ''); delta.nothing = true; delta.wrong = { id: r.id, x: f.x, y: f.y, wants: bw, has: kind }; delta.sayKey = WANTS_SAID[bw] ? 'sayWants' + bw.charAt(0).toUpperCase() + bw.slice(1) : 'sayWrongItem'; return; }
    if (tileAt(w, f.x, f.y) !== '' && !blocked(w, f.x, f.y)) { delta.put = { id: r.id, kind: kind, x: f.x, y: f.y }; delta.sayKey = 'sayPut'; return; }
    delta.nothing = true; return;
  }
  // IG-001 D6: a say block speaks its line — the word key (or a typed text) as the plain bubble's sayKey.
  if (s.op === 'say') { run.said++; var said = s.text === undefined || s.text === null || s.text === '' ? 'thanksMamie' : String(s.text); delta.say = { id: r.id, text: said }; delta.sayKey = said; delta.sayStyle = 'plain'; return; }
  if (s.op === 'count_inc') { run.count = (Number(run.count) || 0) + 1; delta.count = run.count; return; }
  delta.nothing = true;
}
/** One tick. Returns { run, delta, glowId, done, waiting, request }. Never touches the world it was given. */
function step(runIn, worldIn, answer) {
  var run = runIn && typeof runIn === 'object' && Array.isArray(runIn.steps) ? clone(runIn) : newRun([], '', 'en'), w = worldOf(worldIn);
  var delta = { tick: run.tick, robot: run.robotId };
  if (run.done) { delta.idle = true; return { run: run, delta: delta, glowId: null, done: true, waiting: false, request: null }; }
  // The world arms the handlers: its scheduled events for this tick, and any it queued.
  var events = [];
  for (var i = 0; i < w.schedule.length; i++) if (Number(w.schedule[i].tick) === run.tick) events.push(String(w.schedule[i].event));
  for (var j = 0; j < w.events.length; j++) events.push(String(w.events[j]));
  if (events.length) {
    delta.events = events;
    for (var e = 0; e < events.length; e++) {
      for (var h = 0; h < run.handlers.length; h++) {
        if (run.handlers[h].event !== events[e]) continue;
        run.handled[events[e]] = (run.handled[events[e]] || 0) + 1;
        var spliced = [{ id: run.handlers[h].id, op: 'noop' }].concat(flatten(run.handlers[h].body, run.tricks));
        run.steps.splice.apply(run.steps, [run.pc, 0].concat(spliced));
        break;
      }
    }
  }
  // P108 IW-002: the finish line. The tick the job's last target is full, the walk home is appended (the engine's own
  // steps, after whatever is left of the child's program); the run ends at home.
  if (!run.jobDone && jobDone(w)) { run.jobDone = true; run.steps.push({ id: null, op: 'home', guard: 0 }); delta.jobDone = true; }
  if (run.pc >= run.steps.length) {
    var pending = false;
    for (var p = 0; p < w.schedule.length; p++) if (Number(w.schedule[p].tick) > run.tick) pending = true;
    delta.idle = true;
    run.tick++;
    if (pending) return { run: run, delta: delta, glowId: null, done: false, waiting: false, request: null };
    run.done = true;
    // P108 IW-005: a run that ends releases what its go to nearest reserved.
    var ender = robotOf(w, run.robotId);
    if (ender && heldBy(w, ender.id)) delta.release = { robot: ender.id };
    return { run: run, delta: delta, glowId: null, done: true, waiting: false, request: null };
  }
  var s = run.steps[run.pc];
  var glowId = s.id;
  if (s.op === 'ask') {
    var a = answer && typeof answer === 'object' ? answer : null;
    if (!run.waiting) { run.waiting = true; run.askSeq++; a = null; }
    else if (a && a.seq !== undefined && a.seq !== null && Number(a.seq) !== run.askSeq) a = null;
    // The abandoned arm (CG-005): a reply stamped with ANOTHER run (the child pressed Start over while Olive thought) is
    // dropped, even when its seq matches this run's first park.
    else if (a && a.run !== undefined && a.run !== null && a.run !== '' && String(a.run) !== String(run.runId)) a = null;
    if (!a) {
      delta.waiting = true;
      // IG-006: the note on the plot, the things on it, the thing ahead — named by the engine from the world.
      var ctx = oliveRequestOf(s, w, run);
      var req = { seq: run.askSeq, rung: s.rung, slots: ctx.slots, lang: run.lang, shape: s.shape, temperature: s.dial >= 0 ? DIAL_TEMPERATURE[s.dial] : ASK_TEMPERATURE[s.rung] };
      if (ctx.options) req.options = ctx.options;
      return { run: run, delta: delta, glowId: glowId, done: false, waiting: true, request: req };
    }
    run.lastAnswer = { ok: !!a.ok, value: a.value, text: a.text, fallback: !!a.fallback, reason: a.reason };
    // IG-006 AC3: the vote asks again until its last answer; the run stays parked on the same block.
    var olive = oliveAnswered(run, s, a);
    if (olive.again) {
      run.askSeq++;
      delta.waiting = true;
      delta.vote = olive.vote;
      var again = oliveRequestOf(s, w, run);
      var req2 = { seq: run.askSeq, rung: s.rung, slots: again.slots, lang: run.lang, shape: s.shape, temperature: s.dial >= 0 ? DIAL_TEMPERATURE[s.dial] : ASK_TEMPERATURE[s.rung] };
      if (again.options) req2.options = again.options;
      return { run: run, delta: delta, glowId: glowId, done: false, waiting: true, request: req2 };
    }
    if (olive.vote) delta.vote = olive.vote;
    run.waiting = false;
    delta.answered = clone(run.lastAnswer);
    // A blocks answer is a PROPOSAL the child accepts or not: never spliced into the run (CG-005 AC1).
    if (s.shape === 'blocks' && Array.isArray(a.value)) {
      var proposed = [];
      for (var q = 0; q < a.value.length; q++) if (ASK_BLOCK[a.value[q]]) proposed.push(ASK_BLOCK[a.value[q]]);
      run.proposal = { askId: s.id, blocks: proposed };
      delta.proposal = clone(run.proposal);
    } else {
      // IG-001 D6: every other answer (hers or the written one) is spoken by the robot, in the olive bubble.
      var spoken = a.value !== undefined && a.value !== null ? a.value : a.text;
      if (spoken !== undefined && spoken !== null && String(spoken) !== '') { delta.sayText = Array.isArray(spoken) ? spoken.join(', ') : String(spoken); delta.sayStyle = 'olive'; }
    }
    // IG-006 AC2/AC3: read and is it a…? say WHAT she answered ("Olive read: red tulip", "Olive: yes", "2 of 3 said yes").
    if (olive.say) { delta.sayText = olive.say; delta.sayStyle = 'olive'; }
    run.pc++; run.tick++;
    return { run: run, delta: delta, glowId: glowId, done: false, waiting: false, request: null };
  }
  if (s.op === 'until' || s.op === 'if') {
    // What the program READ (for a goal like "count to 4 and check it": CG-006's eggs, the senses predicate).
    if (!run.sensed || typeof run.sensed !== 'object') run.sensed = {};
    // P108 IW-005: a cond counts as read 'cond', and each legacy sensor inside it as itself.
    var reads = s.cond !== undefined ? ['cond'].concat(condSensors(s.cond, [], 0)) : [s.sensor];
    for (var rd = 0; rd < reads.length; rd++) run.sensed[reads[rd]] = (run.sensed[reads[rd]] || 0) + 1;
  }
  if (s.op === 'until') {
    var met = checkOf(w, run, s);
    if (met || s.guard >= UNTIL_GUARD) { if (s.guard >= UNTIL_GUARD) run.guardHits++; run.pc++; }
    else {
      var again = clone(s); again.guard = s.guard + 1;
      var loop = flatten(s.body, run.tricks).concat([again]);
      run.steps.splice.apply(run.steps, [run.pc + 1, 0].concat(loop));
      run.pc++;
    }
    delta.check = s.cond !== undefined ? { sensor: 'cond', on: true, cond: true, value: met } : { sensor: s.sensor, on: true };
  } else if (s.op === 'if') {
    var yes = checkOf(w, run, s);
    if (yes) run.steps.splice.apply(run.steps, [run.pc + 1, 0].concat(flatten(s.body, run.tricks)));
    else if (Array.isArray(s.alt)) run.steps.splice.apply(run.steps, [run.pc + 1, 0].concat(flatten(s.alt, run.tricks)));
    run.pc++;
    delta.check = s.cond !== undefined ? { sensor: 'cond', on: true, cond: true, value: yes } : { sensor: s.sensor, on: true };
  } else if (s.op === 'repeat_olive') {
    var la = run.lastAnswer, n = la ? Math.max(0, Math.min(9, Math.floor(Number(la.value)) || 0)) : 0;
    var body = [];
    for (var k = 0; k < n; k++) body = body.concat([{ id: s.id, op: 'noop' }], flatten(s.body, run.tricks));
    run.steps.splice.apply(run.steps, [run.pc + 1, 0].concat(body));
    run.pc++;
    delta.repeat = n;
  } else if (s.op === 'home') {
    homeStep(w, run, s, delta);
  } else if (s.op === 'seek' || s.op === 'goto') {
    seekStep(w, run, s, delta);
  } else if (s.op === 'set' || s.op === 'change') {
    varStep(w, run, s, delta);
  } else if (s.op === 'noop') {
    run.pc++;
    delta.noop = true;
  } else {
    exec(w, run, s, delta);
    delta.op = s.op;
    run.pc++;
  }
  run.tick++;
  return { run: run, delta: delta, glowId: glowId, done: false, waiting: false, request: null };
}
/** The world after a delta. The only writer. */
function apply(worldIn, delta) {
  var w = worldOf(worldIn), d = delta && typeof delta === 'object' ? delta : {};
  if (d.events) w.events = [];
  var r = d.robot !== undefined ? robotOf(w, d.robot) : null;
  if (d.turn) { var rt = robotOf(w, d.turn.id) || r; if (rt) rt.d = d.turn.d; }
  if (d.move) {
    var rm = robotOf(w, d.move.id) || r; if (rm) { rm.x = d.move.x; rm.y = d.move.y; }
    // IW-002: a site remembers how often it is walked on (wear takes its stone from the most walked).
    var ws = thingsAt(w, d.move.x, d.move.y, 'site'); for (var wi = 0; wi < ws.length; wi++) ws[wi].walked = (Number(ws[wi].walked) || 0) + 1;
  }
  if (d.water) {
    var tul = thingsAt(w, d.water.x, d.water.y, 'tulip');
    // IW-002: a tulip with a meter takes one drink up to its need; the rest are watered as before. Full again: no droop.
    for (var i = 0; i < tul.length; i++) { if (hasMeter(tul[i])) setMeter(tul[i], meterOf(tul[i]).have + 1); else tul[i].watered = true; if (tul[i].droop && tul[i].watered) tul[i].droop = false; }
  }
  if (d.puddle) w.things.push({ kind: 'puddle', x: d.puddle.x, y: d.puddle.y });
  if (d.pick) {
    var rp = robotOf(w, d.pick.id) || r;
    if (d.pick.rock) {
      // IG-002: the rock ahead gives a stone and shrinks; at 0 it is removed and its tile remembered as spent.
      for (var k = 0; k < w.things.length; k++) {
        var rk = w.things[k];
        if (rk.x !== d.pick.x || rk.y !== d.pick.y || rk.kind !== (d.pick.source || 'rock')) continue;
        rk.left = Math.max(0, Math.floor(Number(rk.left)) - 1);
        if (!(rk.left > 0) && !(Number(rk.max) > 0)) { w.things.splice(k, 1); w.spent = (Array.isArray(w.spent) ? w.spent : []).concat([d.pick.x + ',' + d.pick.y]); }
        break;
      }
    } else if (d.pick.box) { var bx = thingOf(w, { id: d.pick.from, x: d.pick.x, y: d.pick.y }, { basket: 1, bowl: 1, store: 1 }); if (bx) setMeter(bx, meterOf(bx).have - 1); }
    else for (var j = 0; j < w.things.length; j++) if (w.things[j].x === d.pick.x && w.things[j].y === d.pick.y && w.things[j].kind === d.pick.kind) { if (isSet(w.things[j].id) && w.reserved && typeof w.reserved === 'object') delete w.reserved[String(w.things[j].id)]; w.things.splice(j, 1); break; }
    if (rp) rp.carry.push(d.pick.kind);
  }
  if (d.can) { var rc = robotOf(w, d.can.id) || r; if (rc) rc.can = Math.max(0, Math.floor(Number(d.can.can)) || 0); }
  if (d.put) { var ru = robotOf(w, d.put.id) || r; if (ru) ru.carry.pop(); w.things.push({ kind: d.put.kind, x: d.put.x, y: d.put.y }); }
  if (d.feed) { var rf = robotOf(w, d.feed.id) || r; if (rf) rf.carry.pop(); var bowl = thingsAt(w, d.feed.x, d.feed.y, 'bowl'); if (bowl.length) setMeter(bowl[0], meterOf(bowl[0]).have + 1); }
  // ── P108 IW-002: the job model's deltas ──
  if (d.stow) { var rs = robotOf(w, d.stow.id) || r; var into = thingOf(w, { id: d.stow.into, x: d.stow.x, y: d.stow.y }, { site: 1, basket: 1, store: 1 }); if (rs && into) { rs.carry.pop(); setMeter(into, meterOf(into).have + 1); } }
  if (d.holds) {
    var rh = robotOf(w, d.holds.id) || r;
    if (d.holds.what === 'can') {
      for (var hc = 0; hc < w.things.length; hc++) if (w.things[hc].kind === 'can' && w.things[hc].x === d.holds.x && w.things[hc].y === d.holds.y) { w.things.splice(hc, 1); break; }
      if (rh) { rh.holds = 'can'; rh.can = Math.max(0, Math.floor(Number(d.holds.level)) || 0); if (Number(d.holds.max) > 0) rh.canMax = Math.floor(Number(d.holds.max)); }
    } else if (rh) { w.things.push({ kind: 'can', x: d.holds.x, y: d.holds.y, level: canOf(rh) || 0, max: canMaxOf(rh) }); delete rh.holds; rh.can = null; }
  }
  if (d.wear) { var wt = thingOf(w, d.wear); if (wt) { setMeter(wt, d.wear.have); if (wt.kind === 'tulip') wt.droop = true; rollOut(w, wt); } }
  if (d.regrow) { var rg = thingOf(w, { id: d.regrow.id, x: d.regrow.x, y: d.regrow.y, kind: d.regrow.kind || 'rock' }); if (rg) rg.left = Math.max(0, Math.min(Math.floor(Number(rg.max)) || 0, Math.floor(Number(d.regrow.left)) || 0)); }
  if (d.lay) w.things.push({ kind: 'egg', x: d.lay.x, y: d.lay.y });
  if (d.letter) w.things.push({ kind: 'letter', x: d.letter.x, y: d.letter.y });
  if (d.seed !== undefined && d.seed !== null && isFinite(Number(d.seed))) w.seed = Number(d.seed) >>> 0;
  // ── P108 IW-005: reservations — a found thing is its robot's until picked (above) or the run ends (release) ──
  if (d.release) { var rl = reservedOf(w); for (var rk2 in rl) if (rl[rk2] === String(d.release.robot) && (!isSet(d.release.thing) || rk2 === String(d.release.thing))) delete rl[rk2]; }
  if (d.reserve) {
    var rv = thingOf(w, { id: d.reserve.thing, x: d.reserve.x, y: d.reserve.y, kind: d.reserve.kind });
    if (rv) {
      if (!isSet(rv.id)) rv.id = String(d.reserve.thing);
      if (!w.reserved || typeof w.reserved !== 'object' || Array.isArray(w.reserved)) w.reserved = {};
      w.reserved[String(rv.id)] = String(d.reserve.robot);
    }
  }
  // P108 IW-003 (lane P): a letter through a door, the names beside the carry, an addressed letter in the post box.
  mailApply(w, d);
  // P108 IW-007 (s5 base): a drop on a building's part moves the whole building's stage.
  if (d.stow || d.wear) restage(w);
  return w;
}
/** Run a program to its end with no Olive (every ask takes the fallback). For Predict and the gate. */
function runToEnd(program, worldIn, robotId, lang) {
  var run = newRun(program, robotId, lang), w = worldOf(worldIn), ticks = 0, known = false;
  while (ticks < MAX_TICKS) {
    var st = step(run, w, null);
    if (st.waiting) st = step(st.run, w, { seq: st.request.seq, ok: false, fallback: true });
    run = st.run; w = apply(w, st.delta); ticks++;
    if (st.done) { known = true; break; }
  }
  return { run: run, world: w, ticks: ticks, known: known };
}
/** A goal predicate over the world, the run and the program. A list means all of them. */
function goalMet(w, run, program, goal) {
  var goals = Array.isArray(goal) ? goal : goal ? [goal] : [];
  var missing = [], done = 0, total = 0, prog = Array.isArray(program) ? program : [];
  var r = robotOf(w, run.robotId);
  for (var i = 0; i < goals.length; i++) {
    var g = goals[i] || {}, a = Array.isArray(g.args) ? g.args : [], ok = false;
    if (g.name === 'every_tulip_watered') { var t = tulipsOf(w); ok = t.total > 0 && t.watered === t.total; done += t.watered; total += t.total; }
    else if (g.name === 'thing_at') { ok = thingsAt(w, Number(a[1]), Number(a[2]), String(a[0])).length > 0; total++; if (ok) done++; }
    else if (g.name === 'bowl_has') { var b = thingsAt(w, Number(a[0]), Number(a[1]), 'bowl'); ok = b.length > 0 && (Number(b[0].food) || 0) === Number(a[2]); total++; if (ok) done++; }
    else if (g.name === 'robot_at') { ok = !!r && r.x === Number(a[0]) && r.y === Number(a[1]); total++; if (ok) done++; }
    else if (g.name === 'facing') { ok = !!r && r.d === Number(a[0]); }
    else if (g.name === 'carrying') { var n = 0; if (r) for (var c = 0; c < r.carry.length; c++) if (r.carry[c] === String(a[0])) n++; ok = n === Number(a[1]); done += Math.min(n, Number(a[1])); total += Number(a[1]); }
    else if (g.name === 'uses') ok = countUses(prog, String(a[0])) >= (Number(a[1]) || 1);
    else if (g.name === 'senses') ok = ((run.sensed && run.sensed[String(a[0])]) || 0) >= (Number(a[1]) || 1);
    else if (g.name === 'handled') ok = (run.handled && run.handled[String(a[0])] || 0) >= (Number(a[1]) || 1);
    else if (g.name === 'said') ok = (Number(run.said) || 0) >= (Number(a[0]) || 1);
    else if (g.name === 'no_puddle') { var pud = 0; for (var p = 0; p < w.things.length; p++) if (w.things[p].kind === 'puddle') pud++; ok = pud === 0; }
    // IG-006: exactly n tulips of one colour watered (Mamie's note: the red row, and none of the yellow).
    else if (g.name === 'tulips_watered') { var tw = 0; for (var q = 0; q < w.things.length; q++) if (w.things[q].kind === 'tulip' && String(w.things[q].color || '') === String(a[0]) && w.things[q].watered) tw++; ok = tw === (Number(a[1]) || 0); done += Math.min(tw, Number(a[1]) || 0); total += Number(a[1]) || 0; }
    // P108 IW-002: the finish line — every target of the job full, and the robot at its home.
    // P108 IW-003 (lane B): the run bumped into nothing (Biscuit's wall: sense it, never crash into it).
    else if (g.name === 'no_bump') ok = !(Number(run.bumps) > 0);
    else if (g.name === 'job_done') { var jp = jobProgress(w), jh = homeOf(w, r); done += jp.full; total += jp.total; ok = jp.total > 0 && jp.full === jp.total && !!r && (!jh || (r.x === Math.floor(Number(jh.x)) && r.y === Math.floor(Number(jh.y)))); }
    // P108 IW-007 (s6): her land — the run FINISHED a part (one of the targets named, none full when the run began: a
    // building's part, an animal's bowl). Each robot of her crew learns its own part of the job. Not "and home": the
    // engine walks a robot home only when the WHOLE job is done, and on the island it goes home at the lap's end.
    else if (g.name === 'part_done') { var pf = 0; for (var pa = 0; pa < a.length; pa++) if (isFull(thingById(w, a[pa]))) pf++; total += 1; done += pf > 0 ? 1 : 0; ok = pf > 0; }
    if (!ok) missing.push(String(g.name));
  }
  return { met: goals.length > 0 && missing.length === 0, missing: missing, done: done, total: total };
}

// What this file gives: Scripts.engine.<name> in a Function, use('engine') in another file.
exports.ASK_BLOCK = ASK_BLOCK; exports.ASK_RESERVED = ASK_RESERVED; exports.ASK_SHAPE = ASK_SHAPE;
exports.ASK_TEMPERATURE = ASK_TEMPERATURE; exports.BARROW_CARRY = BARROW_CARRY;
exports.BLOCKING_THINGS = BLOCKING_THINGS; exports.BLOCKING_TILES = BLOCKING_TILES;
exports.BUILD_STAGES = BUILD_STAGES; exports.CAN_MAX = CAN_MAX; exports.DIAL_TEMPERATURE = DIAL_TEMPERATURE;
exports.DX = DX; exports.DY = DY; exports.EXPR_DEPTH = EXPR_DEPTH; exports.GROWS_SAID = GROWS_SAID;
exports.HEN_CAPACITY = HEN_CAPACITY; exports.JOB_ITEMS = JOB_ITEMS; exports.JOB_KINDS = JOB_KINDS;
exports.MAIL_NOTES = MAIL_NOTES; exports.MAX_TICKS = MAX_TICKS; exports.MAX_TRICK_DEPTH = MAX_TRICK_DEPTH;
exports.OLIVE_AHEAD = OLIVE_AHEAD; exports.OLIVE_BUBBLE = OLIVE_BUBBLE; exports.OLIVE_NOTES = OLIVE_NOTES;
exports.OLIVE_OBJECT = OLIVE_OBJECT; exports.OLIVE_SLOT_LISTS = OLIVE_SLOT_LISTS;
exports.OLIVE_TILE_AHEAD = OLIVE_TILE_AHEAD; exports.OLIVE_YES = OLIVE_YES; exports.PICKABLE = PICKABLE;
exports.SITE_STAGES = SITE_STAGES; exports.SOURCE_ITEMS = SOURCE_ITEMS; exports.UNTIL_GUARD = UNTIL_GUARD;
exports.WANTS_SAID = WANTS_SAID; exports.WEAR = WEAR; exports.apply = apply; exports.askStep = askStep;
exports.basketOf = basketOf; exports.bfsNext = bfsNext; exports.blocked = blocked; exports.bodyOf = bodyOf;
exports.buildSite = buildSite; exports.buildStage = buildStage; exports.canMaxOf = canMaxOf;
exports.canOf = canOf; exports.canWorld = canWorld; exports.carried = carried; exports.checkOf = checkOf;
exports.chosenTargets = chosenTargets; exports.clone = clone; exports.collectHandlers = collectHandlers;
exports.collectTricks = collectTricks; exports.condOf = condOf; exports.condSensors = condSensors;
exports.countBlocks = countBlocks; exports.countIn = countIn; exports.countUses = countUses;
exports.evalCond = evalCond; exports.evalVal = evalVal; exports.exec = exec; exports.exprNum = exprNum;
exports.exprText = exprText; exports.flatten = flatten; exports.front = front; exports.goalMet = goalMet;
exports.hasContainer = hasContainer; exports.hasMeter = hasMeter; exports.heldBy = heldBy;
exports.helperFits = helperFits; exports.helperOn = helperOn; exports.helperRain = helperRain;
exports.homeOf = homeOf; exports.homeStep = homeStep; exports.isAsk = isAsk; exports.isFull = isFull;
exports.isSet = isSet; exports.itemOf = itemOf; exports.jobDone = jobDone; exports.jobOf = jobOf;
exports.jobProgress = jobProgress; exports.layByWall = layByWall; exports.layOut = layOut;
exports.levelIn = levelIn; exports.mailApply = mailApply; exports.mailEnvelopeTo = mailEnvelopeTo;
exports.mailFallback = mailFallback; exports.mailPick = mailPick; exports.mailPut = mailPut;
exports.mailRan = mailRan; exports.mailRead = mailRead; exports.mailTopTo = mailTopTo;
exports.mailWear = mailWear; exports.meterDelta = meterDelta; exports.meterOf = meterOf;
exports.mintId = mintId; exports.nearestOf = nearestOf; exports.newRun = newRun;
exports.oliveAheadOf = oliveAheadOf; exports.oliveAnswered = oliveAnswered; exports.oliveFill = oliveFill;
exports.oliveInLang = oliveInLang; exports.oliveL = oliveL; exports.oliveNoteIn = oliveNoteIn;
exports.oliveNoteOf = oliveNoteOf; exports.oliveObjectId = oliveObjectId;
exports.oliveObjectOf = oliveObjectOf; exports.oliveObjectsOf = oliveObjectsOf;
exports.oliveRequestOf = oliveRequestOf; exports.oliveSays = oliveSays; exports.pathSite = pathSite;
exports.pathsFrom = pathsFrom; exports.readThing = readThing; exports.refOf = refOf;
exports.reservedOf = reservedOf; exports.restOf = restOf; exports.restage = restage; exports.rngOf = rngOf;
exports.robotOf = robotOf; exports.rollOut = rollOut; exports.routeTo = routeTo; exports.runToEnd = runToEnd;
exports.sameName = sameName; exports.seedWorld = seedWorld; exports.seekSkips = seekSkips;
exports.seekStep = seekStep; exports.sense = sense; exports.setMeter = setMeter; exports.slotsOf = slotsOf;
exports.spentAt = spentAt; exports.stageOf = stageOf; exports.standFor = standFor; exports.stateOf = stateOf;
exports.step = step; exports.sumOf = sumOf; exports.thingById = thingById; exports.thingOf = thingOf;
exports.thingsAt = thingsAt; exports.tileAt = tileAt; exports.tulipsOf = tulipsOf; exports.valOf = valOf;
exports.varStep = varStep; exports.wearOf = wearOf; exports.worldOf = worldOf;
