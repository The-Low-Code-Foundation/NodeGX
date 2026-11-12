// The grown-ups' changes to the game's rows: what a change may say, and how the saved changes become applyRows' `over`.
//
// checkChange is the one rule book. The cloud function "Grown-ups/Save Change" carries a copy of the text between the
// two CHECKCHANGE markers (script files do not run in cloud functions yet), and tests/rows-guard.test.mjs fails if the
// two copies ever differ. The server refuses whatever it says no to; the game asks it again before applying a saved
// change, so a row that reached the database some other way is still skipped.

// ---- CHECKCHANGE BEGIN ----
function checkChange(table, rowId, fields) {
  const BUILT_IN = {
    moves: ['plie', 'releve', 'bras', 'chasseD', 'chasseG', 'avance', 'recule', 'tourne', 'saute', 'reception', 'clap', 'vague', 'descente', 'remonte', 'pirouette', 'arabesque', 'sautChat', 'kick', 'roulade', 'moonwalk', 'toprock', 'grandJete', 'fouette', 'freeze', 'echange', 'reverence'],
    outfits: ['justaucorps', 'jupette', 'tutu', 'robe', 'marin', 'fee', 'papillon', 'cygne', 'lapin', 'flocon', 'etoile', 'flamenco', 'princesse', 'street', 'abeille', 'disco'],
    hairs: ['chignon', 'queue', 'tresses', 'carre', 'couettes', 'laches', 'macarons', 'couronne', 'ruban', 'afro'],
    shoes: ['demi', 'pieds', 'pointes', 'jazz', 'baskets', 'paillettes', 'claquettes'],
    accs: ['aucun', 'noeud', 'tiare', 'fleurs', 'ailes', 'oreilles', 'casquette', 'beret', 'baguette', 'antennes'],
    start: ['start'],
  };
  // only what the shop already sells has a price to change: a starter costume stays free, so no child's plan locks up
  const PRICED = {
    outfits: ['robe', 'marin', 'fee', 'papillon', 'cygne', 'lapin', 'flocon', 'etoile', 'flamenco', 'princesse', 'abeille', 'disco'],
    hairs: ['couettes', 'laches', 'macarons', 'couronne', 'ruban', 'afro'],
    shoes: ['pointes', 'jazz', 'baskets', 'paillettes', 'claquettes'],
    accs: ['tiare', 'fleurs', 'ailes', 'oreilles', 'casquette', 'beret', 'baguette', 'antennes'],
  };
  const NAME = { name: true }, PRICE = { min: 0, max: 200 }, MINUTES = { min: 1, max: 15 };
  // what may change on a row the game ships with
  const CHANGE = {
    start: { stars: { min: 0, max: 300 } },
    moves: { fr: NAME, en: NAME, d: { min: 1, max: 3 } },
    outfits: { fr: NAME, en: NAME, price: PRICE, min: MINUTES },
    hairs: { fr: NAME, en: NAME, price: PRICE, min: MINUTES },
    shoes: { fr: NAME, en: NAME, price: PRICE },
    accs: { fr: NAME, en: NAME, price: PRICE },
  };
  const ICONS = ['✨', '🌟', '⭐', '💫', '🌈', '🌸', '🌺', '🌼', '🍀', '🦋', '🐞', '🐝', '🐬', '🦄', '🐱', '🐶', '🐰', '🦊', '🐻', '🐼', '🐸', '🐧', '🦩', '🦚', '🎀', '🎈', '🎵', '🥁', '🎺', '🎻', '💃', '🕺', '🩰', '👑', '💎', '❄️', '☀️', '🌙', '🌊', '🍓', '🧁', '👗', '🩱', '🧚', '🚀', '⚡', '🌀'];
  const STYLES = ['classique', 'contemporain', 'jazz', 'hiphop'];
  const THEMES = ['lucioles', 'lapins', 'vent', 'marins', 'lumiere', 'lac', 'street', 'battle', 'disco'];
  // a new step dances like a step the game has (its `like`); swapping places is the one step that can't be copied
  const LIKE_MOVES = BUILT_IN.moves.filter((id) => id !== 'echange');
  // a new row: every field its table's rows have, nothing else (applyRows takes a new row whole)
  const ADD = {
    moves: {
      fr: NAME, en: NAME, c: { oneOf: [4, 8] }, d: { min: 1, max: 3 }, a: { min: 0, max: 2 }, b: { min: 0, max: 2 },
      dx: { min: -1, max: 1 }, dz: { min: -1, max: 1 }, st: { styles: true }, icon: { oneOf: ICONS }, like: { oneOf: LIKE_MOVES },
    },
    outfits: {
      fr: NAME, en: NAME, min: MINUTES, price: PRICE, icon: { oneOf: ICONS }, themes: { themes: true }, like: { oneOf: BUILT_IN.outfits },
    },
  };
  // the grown-ups' own rows are x01 … x20: twenty new steps and twenty new costumes at most, and an id that can't be
  // anything else (not "__proto__", not a row the game ships with)
  const ADDED_ID = /^x(0[1-9]|1[0-9]|20)$/;

  const refuse = (message) => ({ ok: false, message });
  const isPlainObject = (o) => o !== null && typeof o === 'object' && !Array.isArray(o) && Object.getPrototypeOf(o) === Object.prototype;

  // ---- the words a child must not be able to put on the screen ----
  const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', $: 's', '!': 'i' };
  const plain = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().split('').map((ch) => LEET[ch] || ch).join('');
  const squeeze = (s) => s.replace(/(.)\1+/g, '$1');
  const RUDE_WORDS = [
    'fuck', 'fucker', 'fucking', 'fucked', 'shit', 'shitty', 'bitch', 'bitches', 'bastard', 'cunt', 'dick', 'dickhead', 'cock', 'pussy',
    'ass', 'arse', 'asshole', 'arsehole', 'twat', 'wank', 'wanker', 'bollocks', 'bugger', 'slut', 'whore', 'piss', 'pissed', 'crap',
    'fag', 'faggot', 'nigger', 'nigga', 'retard', 'retarded', 'prick', 'tits', 'titties', 'boobs', 'penis', 'vagina', 'sex', 'sexy',
    'porn', 'poo', 'poop', 'butt', 'fart', 'idiot', 'stupid', 'dumb', 'moron', 'loser', 'ugly', 'fatso', 'hate', 'kill', 'nazi', 'hitler',
    'merde', 'putain', 'pute', 'putes', 'salope', 'salopes', 'salaud', 'connard', 'connards', 'connasse', 'con', 'cons', 'conne', 'connes',
    'couille', 'couilles', 'bite', 'bites', 'chier', 'chiant', 'chiante', 'encule', 'enculer', 'enculee', 'enfoire', 'batard', 'batarde',
    'bordel', 'nique', 'niquer', 'ntm', 'fdp', 'pd', 'pede', 'tapette', 'gouine', 'negre', 'bouffon', 'debile', 'cretin', 'imbecile',
    'abruti', 'abrutie', 'crotte', 'caca', 'pipi', 'prout', 'zizi', 'zezette', 'nichon', 'nichons', 'seins', 'cul', 'fesses', 'branleur',
    'branler', 'pouffiasse', 'poufiasse', 'garce', 'grognasse', 'gueule', 'moche', 'nul', 'nulle', 'tuer', 'mort', 'sexe', 'porno',
  ];
  // words that stay rude wherever they hide: "f.u.c.k", "fuuuck" and "superfuck" are refused too
  const RUDE_INSIDE = [
    'fuck', 'shit', 'cunt', 'bitch', 'nigger', 'nigga', 'faggot', 'encul', 'salope', 'connard', 'connasse', 'putain', 'whore',
    'wanker', 'asshole', 'arsehole', 'enfoire', 'pouffiasse', 'poufiasse', 'branleur', 'merde', 'porn', 'pussy', 'dick', 'couille',
  ];
  const isRude = (text) => {
    const p = plain(text);
    const words = p.split(/[^a-z]+/).filter(Boolean);
    const rudeWords = new Set(RUDE_WORDS.flatMap((w) => [w, squeeze(w)]));
    if (words.some((w) => rudeWords.has(w) || rudeWords.has(squeeze(w)))) return true;
    const joined = words.join('');
    return RUDE_INSIDE.some((w) => joined.includes(w) || squeeze(joined).includes(squeeze(w)));
  };

  const checkName = (value) => {
    if (typeof value !== 'string') return { error: 'a name must be text' };
    const name = value.normalize('NFC').trim().split(/\s+/).join(' ');
    if (name.length < 1 || name.length > 24) return { error: 'a name is 1 to 24 letters long' };
    // letters, digits, spaces and a little punctuation: no < > & " ` and no emoji, so nothing a name says can become markup
    if (!/^[\p{L}\p{M}\p{N} '’\-.,!?()]+$/u.test(name)) return { error: `"${name}" may only use letters, digits, spaces and ' - . , ! ? ( )` };
    if (!/\p{L}/u.test(name)) return { error: 'a name needs at least one letter' };
    if (isRude(name)) return { error: `"${name}" isn't a word for this game` };
    return { value: name };
  };
  const checkValue = (field, spec, value) => {
    if (spec.name) return checkName(value);
    if (spec.styles) {
      if (value === '*') return { value };
      if (typeof value !== 'string') return { error: `${field} must be the styles it belongs to` };
      const list = value.split(' ');
      if (!list.length || list.some((s) => !STYLES.includes(s)) || new Set(list).size !== list.length) return { error: `${field} must be "*" or some of: ${STYLES.join(', ')}` };
      return { value };
    }
    if (spec.themes) {
      if (!Array.isArray(value) || value.length > 4 || value.some((s) => !THEMES.includes(s)) || new Set(value).size !== value.length) return { error: `${field} must be up to 4 of: ${THEMES.join(', ')}` };
      return { value: value.slice() };
    }
    if (spec.oneOf) {
      if (!spec.oneOf.includes(value)) return { error: `${field} must be one of: ${spec.oneOf.join(' ')}` };
      return { value };
    }
    if (typeof value !== 'number' || !Number.isInteger(value) || value < spec.min || value > spec.max) return { error: `${field} must be a whole number from ${spec.min} to ${spec.max}` };
    return { value };
  };

  if (typeof table !== 'string' || !Object.prototype.hasOwnProperty.call(CHANGE, table)) return refuse(`the grown-ups can change ${Object.keys(CHANGE).join(', ')}, not "${table}"`);
  if (typeof rowId !== 'string') return refuse('which row?');
  if (!isPlainObject(fields)) return refuse('the change must be a list of fields');
  const builtIn = BUILT_IN[table].includes(rowId), added = !builtIn && ADDED_ID.test(rowId);
  if (!builtIn && !added) return refuse(`"${rowId}" is not a row of ${table}`);
  if (added && !ADD[table]) return refuse(`new rows can only be added to ${Object.keys(ADD).join(' and ')}`);
  const spec = builtIn ? CHANGE[table] : ADD[table];
  const names = Object.keys(fields);
  if (!names.length) return refuse('nothing to change');
  const unknown = names.filter((f) => !Object.prototype.hasOwnProperty.call(spec, f));
  if (unknown.length) return refuse(`${table} can't change ${unknown.join(', ')}`);
  if (builtIn && names.includes('price') && !(PRICED[table] || []).includes(rowId)) return refuse(`${rowId} is free in the game, so it has no price to change`);
  if (added) {
    const missing = Object.keys(spec).filter((f) => !names.includes(f));
    if (missing.length) return refuse(`a new row needs ${missing.join(', ')}`);
  }
  const clean = {};
  for (const f of Object.keys(spec)) {
    if (!names.includes(f)) continue;
    const r = checkValue(f, spec[f], fields[f]);
    if (r.error) return refuse(r.error);
    clean[f] = r.value;
  }
  return { ok: true, key: `${table}:${rowId}`, table, rowId, fields: clean };
}
// ---- CHECKCHANGE END ----

// The saved changes (GameChange records) as applyRows' `over`, checked once more against the rule book AND against the
// rows this version of the game has: a change to a row a newer version no longer has is skipped, never added half-made.
// `tables` is the game's data module (MOVES, OUTFITS, …), passed in because a script file can't import it.
function buildOverrides(records, tables) {
  const LIVE = { moves: tables.MOVES, outfits: tables.OUTFITS, hairs: tables.HAIRS, shoes: tables.SHOES, accs: tables.ACCS };
  const over = {}, skipped = [], seen = new Set();
  const read = (r, k) => (r && typeof r.get === 'function' ? r.get(k) : r && r[k]);
  for (const r of records || []) {
    const table = read(r, 'table'), rowId = read(r, 'rowId');
    let fields = read(r, 'fields');
    if (typeof fields === 'string') { try { fields = JSON.parse(fields); } catch (e) { fields = null; } }
    const c = checkChange(table, rowId, fields);
    if (!c.ok) { skipped.push(`${table}:${rowId}: ${c.message}`); continue; }
    if (seen.has(c.key)) { skipped.push(`${c.key}: saved twice, the first one kept`); continue; }
    seen.add(c.key);
    if (table === 'start') { over.start = c.fields; continue; }
    const live = LIVE[table], exists = Object.prototype.hasOwnProperty.call(live, rowId);
    const isNew = /^x\d\d$/.test(rowId);
    if (!isNew && !exists) { skipped.push(`${c.key}: this version of the game has no such row`); continue; }
    if (isNew && exists) { skipped.push(`${c.key}: the game already has a row with this id`); continue; }
    if (c.fields.like && !Object.prototype.hasOwnProperty.call(live, c.fields.like)) { skipped.push(`${c.key}: based on "${c.fields.like}", which this version doesn't have`); continue; }
    (over[table] = over[table] || {})[rowId] = c.fields;
  }
  return { over, skipped };
}

exports.checkChange = checkChange;
exports.buildOverrides = buildOverrides;
