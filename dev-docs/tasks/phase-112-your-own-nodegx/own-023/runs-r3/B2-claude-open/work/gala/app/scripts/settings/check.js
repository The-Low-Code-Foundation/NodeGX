// GENERATED from tools/check.src.js by tools/sync-check.mjs — edit that file and run it again.
// What a grown-up may change, and how far. The same code runs in the cloud function that saves a change (so a child
// cannot get round it from the page) and in the browser before a change is laid over the game (so a bad row that got
// into the database some other way never reaches the screen). It has no imports: the ids it knows are written in by
// tools/sync-check.mjs from gala-rules/src/data.js.
const KNOWN = {"moves":["plie","releve","bras","chasseD","chasseG","avance","recule","tourne","saute","reception","clap","vague","descente","remonte","pirouette","arabesque","sautChat","kick","roulade","moonwalk","toprock","grandJete","fouette","freeze","echange","reverence"],"outfits":["justaucorps","jupette","tutu","robe","marin","fee","papillon","cygne","lapin","flocon","etoile","flamenco","princesse","street","abeille","disco"],"hairs":["chignon","queue","tresses","carre","couettes","laches","macarons","couronne","ruban","afro"],"shoes":["demi","pieds","pointes","jazz","baskets","paillettes","claquettes"],"accs":["aucun","noeud","tiare","fleurs","ailes","oreilles","casquette","beret","baguette","antennes"],"pieces":["miroir","banc","portant","chaise","plante","lampe","tapis","coiffeuse","etagere","pouf","canape","paravent","fontaine","fruits","enceinte","barre","ventilo","doudous","sieste","horloge"],"snacks":["rien","bonbons","fruits","barres","tartines"],"upgrades":["sieges","confort","buvette","projecteurs","boule","scene","decorForet","decorMer","decorVille","logeXL","placeur","covoit","navette","rangee"],"numbers":["P1","P2","M1","M2","G1","G2","A1","A2","F1"],"icons":["💃","🕺","🩰","🎀","👑","🌸","🌼","🌙","⭐","🌟","✨","💫","🦋","🐝","🐞","🦄","🐬","🐧","🦊","🐼","🐸","🌈","☀️","❄️","🔥","🍀","🎈","🎉","🎵","🎶","🥁","🎻","🎺","🪄","🧚","🧜","🦢","🕊️","🌊","🌀","🔄","⬆️","⬇️","➡️","⬅️","👏","🙌","🤸","🧘","🦵","👣","💎","🪩","🧢","👗","👘","🥻","🩱","👒","🎩","🙇","⏬","⏫","🐇","🛬","〰️","⤵️","⤴️","🐈","🌪️","🦌","🧊","🔀","⚓","🐰","🪞","🪑","💺","🪴","💡","🟪","💄","👟","🟣","🛋️","🎎","🚰","🍎","🔊","🧸","😴","🕰️","🚫","🍬","🍌","🥣","🍞","🥤","🔦","🎭","🌳","🏙️","🧱","🦺","🚙","🚐","🅿️"],"styles":["classique","contemporain","jazz","hiphop"],"themes":["lucioles","lapins","vent","marins","lumiere","lac","street","battle","disco"]};

// every table a grown-up may touch, the fields of an existing row they may change, and the fields a new row must have
const TABLES = {
  moves: { edit: ['fr', 'en', 'd', 'c', 'icon'], add: ['fr', 'en', 'd', 'c', 'icon', 'a', 'b', 'st'], optional: ['dx', 'dz'] },
  outfits: { edit: ['fr', 'en', 'price', 'min', 'icon', 'themes'], add: ['fr', 'en', 'min', 'icon'], optional: ['price', 'themes'] },
  hairs: { edit: ['fr', 'en', 'price', 'min'], add: ['fr', 'en', 'min'], optional: ['price'] },
  shoes: { edit: ['fr', 'en', 'price'] },
  accs: { edit: ['fr', 'en', 'price', 'themes'], add: ['fr', 'en'], optional: ['price', 'themes'] },
  pieces: { edit: ['fr', 'en', 'price'] },
  snacks: { edit: ['fr', 'en', 'price'] },
  upgrades: { edit: ['fr', 'en', 'price'] },
  numbers: { edit: ['fr', 'en'] },
  start: { edit: ['stars'], one: true },
};
const RANGES = { d: [1, 3], price: [0, 300], min: [1, 15], stars: [0, 9999], a: [0, 2], b: [0, 2], dx: [-1, 1], dz: [-1, 1] };

// words nobody wants on a child's screen, in French and English; matched on the letters only, accents and look-alike
// digits removed, so "C0NN@RD" and "connard" are the same word. Short ones must stand alone; long ones anywhere.
const ALONE = ['cul', 'con', 'cons', 'conne', 'pd', 'nik', 'nique', 'niquer', 'bite', 'zob', 'tg', 'fdp', 'ass', 'arse', 'tit', 'tits', 'fag', 'cum', 'wank', 'twat', 'nazi', 'sex', 'sexe', 'porn', 'porno', 'crap', 'piss', 'poo', 'caca', 'pipi', 'prout'];
const ANYWHERE = ['merde', 'putain', 'pute', 'salope', 'connard', 'connasse', 'encule', 'enculer', 'batard', 'bordel', 'couille', 'chier', 'nichon', 'branle', 'bouffon', 'abruti', 'debile', 'cretin', 'idiot', 'pouffiasse', 'fuck', 'shit', 'bitch', 'bastard', 'dick', 'cock', 'pussy', 'slut', 'whore', 'cunt', 'asshole', 'bollock', 'bugger', 'wanker', 'stupid', 'dumb', 'hitler', 'drogue', 'cocaine', 'weed', 'beer', 'biere', 'vodka', 'whisky'];
const LOOK_ALIKE = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's', '€': 'e', '!': 'i', '|': 'i' };
function plainLetters(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split('').map((ch) => LOOK_ALIKE[ch] || ch).join('');
}
function rude(s) {
  const plain = plainLetters(s), joined = plain.replace(/[^a-z]/g, ''), squeezed = joined.replace(/(.)\1+/g, '$1');
  const words = plain.split(/[^a-z]+/).filter(Boolean);
  if (words.some((x) => ALONE.includes(x) || ALONE.includes(x.replace(/(.)\1+/g, '$1')))) return true;
  return ANYWHERE.some((bad) => joined.includes(bad) || squeezed.includes(bad));
}

// a name: short plain text, letters, digits, spaces and everyday punctuation only — no markup, no links, nothing rude.
// Returns the tidied name, '' for an empty one, or null when it is refused.
const NAME_CHARS = /^[\p{L}\p{N} '’\-.,!?&()«»“”:]*$/u;
function cleanName(s, max) {
  const name = String(s === undefined || s === null ? '' : s).normalize('NFC').replace(/\s+/g, ' ').trim();
  if (!name) return '';
  if (name.length > (max || 30) || !NAME_CHARS.test(name) || rude(name)) return null;
  return name;
}

// check one change. table, rowId, fields: what the grown-up sent, laid over what they had already saved for that row.
// Returns { ok: true, fields } with only allowed, tidied values, or { ok: false, reason } — the reason is a key of the
// grown-ups' words.
function checkChange(table, rowId, fields) {
  const T = TABLES[table];
  if (!T) return { ok: false, reason: 'badTable' };
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return { ok: false, reason: 'badFields' };
  const id = T.one ? 'row' : String(rowId || '');
  const exists = T.one || (KNOWN[table] || []).includes(id);
  if (!exists) {
    if (!T.add) return { ok: false, reason: 'cannotAdd' };
    if (!/^[a-z][a-zA-Z0-9]{2,19}$/.test(id) || ['constructor', 'prototype', 'toString', 'valueOf'].includes(id)) return { ok: false, reason: 'badId' };
  }
  const allowed = exists ? T.edit : [...T.add, ...(T.optional || [])];
  const out = {};
  for (const [k, v] of Object.entries(fields)) {
    if (!allowed.includes(k)) return { ok: false, reason: 'badField' };
    if (k === 'fr' || k === 'en') {
      const name = cleanName(v, 30);
      if (!name) return { ok: false, reason: name === null ? 'nameRefused' : 'nameEmpty' };
      out[k] = name;
    } else if (k === 'icon') {
      if (!KNOWN.icons.includes(v)) return { ok: false, reason: 'badIcon' };
      out[k] = v;
    } else if (k === 'c') {
      if (v !== 4 && v !== 8) return { ok: false, reason: 'badCounts' };
      out[k] = v;
    } else if (k === 'st') {
      const list = String(v).split(' ').filter(Boolean);
      if (!(v === '*' || (list.length && list.every((x) => KNOWN.styles.includes(x))))) return { ok: false, reason: 'badStyle' };
      out[k] = v === '*' ? '*' : list.join(' ');
    } else if (k === 'themes') {
      if (!Array.isArray(v) || v.length > 4 || !v.every((x) => KNOWN.themes.includes(x))) return { ok: false, reason: 'badTheme' };
      out[k] = [...new Set(v)];
    } else {
      const [lo, hi] = RANGES[k];
      if (typeof v !== 'number' || !Number.isInteger(v) || v < lo || v > hi) return { ok: false, reason: `range_${k}` };
      if ((k === 'dx' || k === 'dz') && v === 0) continue;
      out[k] = v;
    }
  }
  if (!exists) for (const k of T.add) if (out[k] === undefined) return { ok: false, reason: 'missing' };
  if (Object.keys(out).length === 0) return { ok: false, reason: 'nothing' };
  return { ok: true, fields: out, isNew: !exists };
}

// every saved change → the `over` that gala-rules' applyRows takes; changes that fail the check are left out
function toRows(changes) {
  const over = {}, refused = [];
  for (const c of changes || []) {
    let fields = c.fields;
    if (typeof fields === 'string') { try { fields = JSON.parse(fields); } catch (e) { fields = null; } }
    const r = checkChange(c.table, c.rowId, fields);
    if (!r.ok) { refused.push(`${c.table}/${c.rowId}`); continue; }
    if (TABLES[c.table].one) over[c.table] = r.fields;
    else (over[c.table] = over[c.table] || {})[c.rowId] = r.fields;
  }
  return { over, refused };
}

Object.assign(exports, { TABLES, KNOWN, cleanName, rude, checkChange, toRows });
