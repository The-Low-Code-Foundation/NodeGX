var OLIVE = {"rungs":{"say-thanks":{"n":1,"use":"block","band":2,"ladder":"pass","shape":"sentence","temperature":0.8,"slots":{"to":{"list":"islanders"},"deed":{"list":"deeds"}}},"read":{"n":2,"use":"block","band":2,"ladder":"pass","shape":"one_of","temperature":0.2,"slots":{"note":{"list":"notes_read","engine":true}},"options":"plot_objects"},"is-it-a":{"n":3,"use":"block","band":2,"ladder":"pass","shape":"yes_no","temperature":0.2,"slots":{"thing":{"list":"things_ahead","engine":true},"kind":{"list":"kinds"}}},"count-tulips":{"n":7,"use":"lesson","band":2,"ladder":"fail","shape":"integer","temperature":0.2,"slots":{"list":{"list":"flowerlists"}}},"maths":{"n":8,"use":"lesson","band":2,"ladder":"fail","shape":"integer","temperature":0.2,"slots":{"a":{"regex":"^[0-9]{1,2}$"},"b":{"regex":"^[0-9]{1,2}$"}}},"no-letter-e":{"n":9,"use":"lesson","band":2,"ladder":"fail","shape":"sentence","temperature":0.8,"slots":{}},"tall-tales":{"n":10,"use":"lesson","band":2,"ladder":"fail","shape":"sentence","temperature":0.8,"slots":{"question":{"list":"questions_tall"}}},"translate":{"n":11,"use":"lesson","band":2,"ladder":"pass","shape":"sentence","temperature":0.2,"slots":{"note":{"list":"notes"}}},"voice-hint":{"n":0,"use":"voice","band":1,"ladder":"pass","shape":"sentence","temperature":0.5,"slots":{"key":{"list":"hintKeys"},"b":{"text":true},"n":{"regex":"^[0-9]{1,2}$","optional":true},"w":{"regex":"^[0-9]{1,2}$","optional":true},"t":{"regex":"^[0-9]{1,2}$","optional":true}}}},"lists":{"islanders":{"fr":["Mamie Rose","Sami","Biscuit","Pip"],"en":["Mamie Rose","Sami","Biscuit","Pip"]},"deeds":{"fr":["arrosé ses trois tulipes","porté sa lettre","rempli la gamelle de Biscuit","planté ses graines"],"en":["watered her three tulips","carried her letter","filled Biscuit's bowl","planted her seeds"]},"notes_read":{"fr":["Les rouges, pas les jaunes.","Les tulipes veulent de l'eau aujourd'hui.","Porte la lettre à Mamie Rose.","Pour Mamie Rose.","Pour Sami.","Pour Biscuit.","Les jaunes, pas les rouges."],"en":["The red ones, not the yellow.","The tulips want water today.","Take the letter to Mamie Rose.","For Mamie Rose.","For Sami.","For Biscuit.","The yellow ones, not the red."]},"plot_objects":{"fr":["tulipe rouge","tulipe jaune","tulipe","rocher","pierre","lettre","gamelle","œuf","Mamie Rose","Sami","Biscuit"],"en":["red tulip","yellow tulip","tulip","rock","stone","letter","bowl","egg","Mamie Rose","Sami","Biscuit"]},"things_ahead":{"fr":["une rose","un chat","un pissenlit","une tulipe rouge","un rocher","un arrosoir","une tulipe","une tulipe jaune","une pierre","un petit mot","un panneau","une gamelle","un œuf","une lettre","de l'herbe","un chemin","de l'eau","un arbre","une maison","une boîte aux lettres"],"en":["a rose","a cat","a dandelion","a red tulip","a rock","a watering can","a tulip","a yellow tulip","a stone","a note","a sign","a bowl","an egg","a letter","some grass","a path","some water","a tree","a house","a post box"]},"kinds":{"fr":["une fleur","un animal","une tulipe","une plante"],"en":["a flower","an animal","a tulip","a plant"]},"flowerlists":{"fr":["tulipe, tulipe, rose, tulipe, marguerite, tulipe, rose","rose, tulipe, tulipe, marguerite"],"en":["tulip, tulip, rose, tulip, daisy, tulip, rose","rose, tulip, tulip, daisy"]},"questions_tall":{"fr":["Quelle est la capitale de l'Australie ?","Combien pèse la Lune ?","Qui a inventé le vélo ?"],"en":["What is the capital of Australia?","How much does the Moon weigh?","Who invented the bicycle?"]},"notes":{"fr":["Les tulipes ont soif.","Biscuit a faim.","Merci pour les graines."],"en":["Biscuit the cat is hungry.","The tulips are thirsty.","Thank you for the seeds."]},"hintKeys":{"fr":["hintEmpty","hintPattern","hintMissed","hintBump","hintDone","hintWet","hintStart"],"en":["hintEmpty","hintPattern","hintMissed","hintBump","hintDone","hintWet","hintStart"]}},"textSlot":{"maxLength":40,"regex":"^[A-Za-zÀ-ÖØ-öø-ÿ0-9 '’\\-!?.,]{1,40}$"},"written":{"say-thanks":{"fr":{"text":"Merci beaucoup, {to} ! J'ai {deed}."},"en":{"text":"Thank you, {to}! I just {deed}."}},"read":{"fr":{"by":["note"],"map":{"Les rouges, pas les jaunes.":{"value":"tulipe rouge"},"Les tulipes veulent de l'eau aujourd'hui.":{"value":"tulipe rouge"},"Porte la lettre à Mamie Rose.":{"value":"lettre"},"Pour Mamie Rose.":{"value":"Mamie Rose"},"Pour Sami.":{"value":"Sami"},"Pour Biscuit.":{"value":"Biscuit"},"Les jaunes, pas les rouges.":{"value":"tulipe jaune"}}},"en":{"by":["note"],"map":{"The red ones, not the yellow.":{"value":"red tulip"},"The tulips want water today.":{"value":"red tulip"},"Take the letter to Mamie Rose.":{"value":"letter"},"For Mamie Rose.":{"value":"Mamie Rose"},"For Sami.":{"value":"Sami"},"For Biscuit.":{"value":"Biscuit"},"The yellow ones, not the red.":{"value":"yellow tulip"}}}},"is-it-a":{"fr":{"by":["thing","kind"],"map":{"une rose|une fleur":{"value":"oui"},"une rose|une plante":{"value":"oui"},"un chat|un animal":{"value":"oui"},"un pissenlit|une fleur":{"value":"oui"},"un pissenlit|une plante":{"value":"oui"},"une tulipe rouge|une fleur":{"value":"oui"},"une tulipe rouge|une tulipe":{"value":"oui"},"une tulipe rouge|une plante":{"value":"oui"},"une tulipe|une fleur":{"value":"oui"},"une tulipe|une tulipe":{"value":"oui"},"une tulipe|une plante":{"value":"oui"},"une tulipe jaune|une fleur":{"value":"oui"},"une tulipe jaune|une tulipe":{"value":"oui"},"une tulipe jaune|une plante":{"value":"oui"},"de l'herbe|une plante":{"value":"oui"},"un arbre|une plante":{"value":"oui"}},"else":{"value":"non"}},"en":{"by":["thing","kind"],"map":{"a rose|a flower":{"value":"yes"},"a rose|a plant":{"value":"yes"},"a cat|an animal":{"value":"yes"},"a dandelion|a flower":{"value":"yes"},"a dandelion|a plant":{"value":"yes"},"a red tulip|a flower":{"value":"yes"},"a red tulip|a tulip":{"value":"yes"},"a red tulip|a plant":{"value":"yes"},"a tulip|a flower":{"value":"yes"},"a tulip|a tulip":{"value":"yes"},"a tulip|a plant":{"value":"yes"},"a yellow tulip|a flower":{"value":"yes"},"a yellow tulip|a tulip":{"value":"yes"},"a yellow tulip|a plant":{"value":"yes"},"some grass|a plant":{"value":"yes"},"a tree|a plant":{"value":"yes"}},"else":{"value":"no"}}},"count-tulips":{"fr":{"by":["list"],"map":{"tulipe, tulipe, rose, tulipe, marguerite, tulipe, rose":{"value":6},"rose, tulipe, tulipe, marguerite":{"value":3}}},"en":{"by":["list"],"map":{"tulip, tulip, rose, tulip, daisy, tulip, rose":{"value":6},"rose, tulip, tulip, daisy":{"value":3}}}},"maths":{"fr":{"number":"a"},"en":{"number":"a"}},"no-letter-e":{"fr":{"text":"La tulipe est une belle fleur rouge qui se lève vers le soleil."},"en":{"text":"The tulip is a lovely red flower that opens in the sun."}},"tall-tales":{"fr":{"by":["question"],"map":{"Quelle est la capitale de l'Australie ?":{"text":"La capitale de l'Australie, c'est Sydney !"},"Combien pèse la Lune ?":{"text":"La Lune pèse à peu près autant qu'une grosse montagne."},"Qui a inventé le vélo ?":{"text":"C'est Victor Hugo qui a inventé le vélo."}}},"en":{"by":["question"],"map":{"What is the capital of Australia?":{"text":"The capital of Australia is Sydney!"},"How much does the Moon weigh?":{"text":"The Moon weighs about as much as a big mountain."},"Who invented the bicycle?":{"text":"Victor Hugo invented the bicycle."}}}},"translate":{"fr":{"by":["note"],"map":{"Les tulipes ont soif.":{"text":"The tulips are thirsty."},"Biscuit a faim.":{"text":"Biscuit is hungry."},"Merci pour les graines.":{"text":"Thank you for the seeds."}}},"en":{"by":["note"],"map":{"Biscuit the cat is hungry.":{"text":"Le biscuit est le chat qui est en honte."},"The tulips are thirsty.":{"text":"Les tulipes sont vif."},"Thank you for the seeds.":{"text":"Merci de les graines vives."}}}}}};
var OLIVE_TIMEOUT_MS = 12000;
var OLIVE_URL = "/__garden/olive";
var OLIVE_HEADER = "x-garden";
var OLIVE_ORDER = ["say-thanks","read","is-it-a"];
var OLIVE_BLOCK_WORD = {"avancer":"fwd","gauche":"left","droite":"right","arroser":"water"};
var OLIVE_REASON_WORD = {"too-long":"slotTooLong","blocklist":"slotBlocked","not-in-list":"slotNotOffered","not-offered":"slotNotOffered","no-typing":"slotNotOffered","missing-slot":"slotMissing","regex":"slotBad","control-char":"slotBad","not-a-string":"slotBad","unknown-slot":"slotBad","unknown-rung":"slotBad","not-in-band":"slotNotOffered"};
var OLIVE_RUNG_WORD = {"say-thanks":"rungSayThanks","read":"rungRead","is-it-a":"rungIsItA"};
var OLIVE_SLOT_WORD = {"to":"slotTo","deed":"slotDeed","note":"slotNote","thing":"slotThing","kind":"slotKind","list":"slotList","a":"slotA","b":"slotB","question":"slotQuestion","key":"slotKey","n":"slotN","w":"slotW","t":"slotT"};
var OLIVE_SHAPE_WORD = {"one_word":"shWord","integer":"shNumber","yes_no":"shYesNo","one_of":"shOneOf","list_of_3":"shList3","sentence":"shSentence","blocks":"shBlocks","two_lines":"shTwoLines"};
var OLIVE_RESERVED = { rung: 1, args: 1, shape: 1, dial: 1, options: 1, times: 1 };
var OLIVE_PREFIX = "olive:";
var TEXT_MAX = 40;
var BLOCKLIST = {"shared":["merde","putain","fuck","fucking","shit","bitch","bastard","asshole","cunt","wanker","slut","whore","dick","crap","salope","connard","connasse","salaud","pute","encule","batard","nique","niquer","foutre","chier","couilles","idiot","idiote","stupid","stupide","debile","imbecile","cretin","cretine"],"fr":["con","conne","cul","bite","bordel","pd","pede"],"en":["twat","piss","cock","pussy","damn","hell"]};
var CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
function fold(s) {
  return String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}
function words(text) {
  return String(text)
    .split(/\s+/)
    .map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter(Boolean);
}
function blocked(text, lang) {
  const list = BLOCKLIST.shared.concat(BLOCKLIST[lang === 'en' ? 'en' : 'fr']);
  const seen = new Set(words(fold(text)));
  for (const w of list) if (seen.has(w)) return w;
  return null;
}
function checkSlots(templates, rungId, slots, lang) {
  const rung = templates.rungs[rungId];
  if (!rung) return { ok: false, reason: 'unknown-rung' };
  const L = lang === 'en' ? 'en' : 'fr';
  const given = slots && typeof slots === 'object' ? slots : {};
  for (const name of Object.keys(given)) if (!rung.slots[name]) return { ok: false, reason: 'unknown-slot', slot: name };
  const values = {};
  for (const [name, spec] of Object.entries(rung.slots)) {
    const v = given[name];
    if (v === undefined || v === null || v === '') {
      if (spec.optional) {
        values[name] = '';
        continue;
      }
      return { ok: false, reason: 'missing-slot', slot: name };
    }
    if (typeof v !== 'string') return { ok: false, reason: 'not-a-string', slot: name };
    if (CONTROL.test(v) || /[\r\n\t]/.test(v)) return { ok: false, reason: 'control-char', slot: name };
    if (spec.list) {
      // A list word is the table's own (a canned sentence may be long); the 40-character rule is for what a child types.
      const list = (templates.lists[spec.list] || {})[L] || [];
      if (!list.includes(v)) return { ok: false, reason: 'not-in-list', slot: name };
    } else if (v.length > TEXT_MAX) {
      return { ok: false, reason: 'too-long', slot: name };
    } else if (spec.regex) {
      if (!new RegExp(spec.regex, 'u').test(v)) return { ok: false, reason: 'regex', slot: name };
    } else if (spec.text) {
      if (!new RegExp(templates.textSlot.regex, 'u').test(v)) return { ok: false, reason: 'regex', slot: name };
      if (blocked(v, L)) return { ok: false, reason: 'blocklist', slot: name };
    } else {
      return { ok: false, reason: 'regex', slot: name };
    }
    values[name] = v;
  }
  return { ok: true, values };
}
function writtenAnswer(table, rung, values, lang) {
  var w = table && table.written ? table.written[rung] : null;
  if (!w || typeof w !== 'object') return null;
  var a = w[lang === 'en' ? 'en' : 'fr'];
  var v = values && typeof values === 'object' && !Array.isArray(values) ? values : {};
  if (a && a.by) {
    var key = [];
    for (var i = 0; i < a.by.length; i++) key.push(v[a.by[i]] === undefined || v[a.by[i]] === null ? '' : String(v[a.by[i]]));
    var hit = a.map ? a.map[key.join('|')] : null;
    a = hit || a['else'] || null;
  }
  if (!a || typeof a !== 'object') return null;
  if (a.text !== undefined) {
    return {
      text: String(a.text).replace(/\{(\w+)\}/g, function (m, k) {
        return v[k] !== undefined && v[k] !== null ? String(v[k]) : m;
      })
    };
  }
  if (a.sum) {
    var s = 0;
    for (var j = 0; j < a.sum.length; j++) s += Number(v[a.sum[j]]) || 0;
    return { value: s };
  }
  if (a.number !== undefined) return { value: Number(v[a.number]) || 0 };
  if (a.value !== undefined) return { value: JSON.parse(JSON.stringify(a.value)) };
  return null;
}

function oliveListOf(name, lang) { var l = OLIVE.lists[name]; return l ? (l[lang === 'en' ? 'en' : 'fr'] || []) : []; }
/** The request's narrowing for one rung's slot: { rung: { slot: [values] } } → the values, or null (no narrowing). */
function oliveNarrowOf(narrow, rung, slot) {
  var byRung = narrow && typeof narrow === 'object' ? narrow[rung] : null;
  var only = byRung && typeof byRung === 'object' ? byRung[slot] : null;
  return Array.isArray(only) ? only.map(String) : null;
}
/** The slot values a block carries, without the ask block's own keys. */
function oliveSlotValues(slots) {
  var out = {};
  if (!slots || typeof slots !== 'object' || Array.isArray(slots)) return out;
  for (var k in slots) if (!OLIVE_RESERVED[k]) out[k] = slots[k];
  return out;
}
/**
 * May these slots be sent? The page's rules first (the rung's band; the request's narrowed list; band 7-9 never
 * types, so a text slot holds one of its suggested words), then the SHELL'S rules, by the shell's own function.
 */
function oliveCheckForBand(rung, slots, band, lang, narrow) {
  var r = OLIVE.rungs[String(rung)];
  if (!r) return { ok: false, reason: 'unknown-rung' };
  if ((Number(r.band) || 1) > band) return { ok: false, reason: 'not-in-band' };
  var given = oliveSlotValues(slots);
  for (var name in r.slots) {
    var spec = r.slots[name], val = given[name];
    if (val === undefined || val === null || val === '') continue;
    var only = oliveNarrowOf(narrow, String(rung), name);
    if (only && only.indexOf(String(val)) === -1) return { ok: false, reason: 'not-offered', slot: name };
    if (band === 1 && spec.text && String(rung) !== 'voice-hint') {
      var sug = spec.suggest ? oliveListOf(spec.suggest, lang) : [];
      if (sug.indexOf(String(val)) === -1) return { ok: false, reason: 'no-typing', slot: name };
    }
  }
  return checkSlots(OLIVE, String(rung), given, lang);
}
/** The picker the kit draws for a rung's slots: options from the list (narrowed by the request), a text field in band 10-12 only. */
function olivePickerSlots(rung, band, lang, narrow, word) {
  var r = OLIVE.rungs[String(rung)], out = [];
  if (!r || String(rung) === 'voice-hint') return out;
  for (var name in r.slots) {
    var spec = r.slots[name];
    // IG-006: a slot the ENGINE fills (the note on the plot, the thing ahead) is never the child's to pick.
    if (spec.engine) continue;
    var entry = { key: name, label: word[OLIVE_SLOT_WORD[name]] || name, options: [] };
    var pool = spec.list ? oliveListOf(spec.list, lang) : spec.suggest ? oliveListOf(spec.suggest, lang) : spec.regex ? ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'] : [];
    var only = oliveNarrowOf(narrow, String(rung), name);
    for (var i = 0; i < pool.length; i++) if (!only || only.indexOf(pool[i]) !== -1) entry.options.push({ value: pool[i], label: pool[i] });
    if (band === 2 && (spec.text || spec.regex)) { entry.text = true; entry.max = spec.text ? TEXT_MAX : 2; }
    out.push(entry);
  }
  // IG-006 AC3: is it a…? asks once, or three times and takes the majority (an engine option, never sent as a slot).
  if (String(rung) === 'is-it-a') out.push({ key: 'times', label: word.slotTimes || 'times', options: [{ value: '1', label: word.timesOnce || '1' }, { value: '3', label: word.timesThree || '3' }] });
  return out;
}
/** The block's own slots with the engine's slots stood in (their list's first word), to judge only what the child picks. */
function oliveBlockSlots(rung, slots, lang) {
  var r = OLIVE.rungs[String(rung)], out = oliveSlotValues(slots);
  if (!r) return out;
  for (var name in r.slots) if (r.slots[name].engine && (out[name] === undefined || out[name] === '')) out[name] = oliveListOf(r.slots[name].list, lang)[0] || '';
  return out;
}
/** The exam gate: the rungs this machine's exam FAILED (an ungraded rung is not withheld). */
function oliveWithheld(exam) {
  var out = [], rungs = exam && exam.rungs && typeof exam.rungs === 'object' ? exam.rungs : {};
  for (var id in rungs) if (rungs[id] && rungs[id].pass === false) out.push(id);
  return out.sort();
}
/**
 * The page's own copy of the shell's rule (olive-check.js, reason unfaithful, 2026-09-28): a voiced hint is the game's
 * hint in other words, or it is not shown. It keeps the written line's question, the robot's name, and plain text. The
 * shell refuses such a voicing first; this is for a shell that let one through (an older one), like the blocklist here.
 */
function oliveFaithful(text, written, name) {
  var out = String(text || ''), line = String(written || ''), who = String(name || '');
  if (/\*\*|__|^#|\x60/m.test(out)) return false;
  if (line.indexOf('?') !== -1 && out.indexOf('?') === -1) return false;
  if (who && fold(line).indexOf(fold(who)) !== -1 && fold(out).indexOf(fold(who)) === -1) return false;
  return true;
}
/** Every ask block of a program, depth first: { id, rung, slots }. */
function oliveAskBlocks(list, out) {
  var l = Array.isArray(list) ? list : [];
  for (var i = 0; i < l.length; i++) {
    var b = l[i];
    if (!b) continue;
    if (typeof b.t === 'string' && b.t.indexOf(OLIVE_PREFIX) === 0) out.push({ id: b.id, rung: b.t.slice(OLIVE_PREFIX.length), slots: b.slots && typeof b.slots === 'object' ? b.slots : {} });
    if (Array.isArray(b.body)) oliveAskBlocks(b.body, out);
  }
  return out;
}
function oliveWords(rows, lang) {
  var word = {};
  var list = Array.isArray(rows) ? rows : [];
  for (var i = 0; i < list.length; i++) if (list[i] && list[i].key) word[list[i].key] = String(list[i][lang] || list[i].en || '');
  return word;
}

// What this file gives: Scripts.olive.<name> in a Function, use('olive') in another file.
exports.BLOCKLIST = BLOCKLIST; exports.CONTROL = CONTROL; exports.OLIVE = OLIVE;
exports.OLIVE_BLOCK_WORD = OLIVE_BLOCK_WORD; exports.OLIVE_HEADER = OLIVE_HEADER;
exports.OLIVE_ORDER = OLIVE_ORDER; exports.OLIVE_PREFIX = OLIVE_PREFIX;
exports.OLIVE_REASON_WORD = OLIVE_REASON_WORD; exports.OLIVE_RESERVED = OLIVE_RESERVED;
exports.OLIVE_RUNG_WORD = OLIVE_RUNG_WORD; exports.OLIVE_SHAPE_WORD = OLIVE_SHAPE_WORD;
exports.OLIVE_SLOT_WORD = OLIVE_SLOT_WORD; exports.OLIVE_TIMEOUT_MS = OLIVE_TIMEOUT_MS;
exports.OLIVE_URL = OLIVE_URL; exports.TEXT_MAX = TEXT_MAX; exports.blocked = blocked;
exports.checkSlots = checkSlots; exports.fold = fold; exports.oliveAskBlocks = oliveAskBlocks;
exports.oliveBlockSlots = oliveBlockSlots; exports.oliveCheckForBand = oliveCheckForBand;
exports.oliveFaithful = oliveFaithful; exports.oliveListOf = oliveListOf;
exports.oliveNarrowOf = oliveNarrowOf; exports.olivePickerSlots = olivePickerSlots;
exports.oliveSlotValues = oliveSlotValues; exports.oliveWithheld = oliveWithheld;
exports.oliveWords = oliveWords; exports.words = words; exports.writtenAnswer = writtenAnswer;
