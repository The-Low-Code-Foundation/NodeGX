// The grown-ups' settings: which fields of which rows they may change, the limits of each, and the file that keeps them.
// Pure (no DOM): the page, the server and the tests all use it. A settings file is { v: 1, rows: { …EDITABLE tables… } };
// sanitize() keeps what is known, of the right type and within limits, quietly drops the rest, and never throws.
import { MOVES, OUTFITS, HAIRS, SHOES, ACCS, PIECES, SNACKS, UPGRADES, CLASSES, NUMBERS, NAMES, START, STYLES, applyRows } from './data.js';
import { clean } from './words.js';

export const SETTINGS_V = 1;
export const MAX_NEW = 12;    // new steps, new costumes: at most this many of each
export const NAME_MAX = 24, DANCER_MAX = 16;
const copy = (o) => JSON.parse(JSON.stringify(o));
// the game's own rows, taken before any change is laid over them: "back to default" reads these
export const DEFAULTS = copy({
  moves: MOVES, outfits: OUTFITS, hairs: HAIRS, shoes: SHOES, accs: ACCS, pieces: PIECES, snacks: SNACKS, upgrades: UPGRADES,
  classes: Object.fromEntries(CLASSES.map((c) => [c.id, c])), numbers: NUMBERS, names: NAMES, start: { start: START },
});

// the icons a grown-up picks from (never typed: an icon is one of these or nothing)
export const ICONS = [...new Set([...Object.values(MOVES), ...Object.values(OUTFITS)].map((r) => r.icon).concat(
  ['🌸', '🌈', '🦄', '🐬', '🌙', '☀️', '🍀', '🎈', '🎩', '🧣', '🐠', '🦩', '🐞', '🍓', '👸', '🤴', '🧜', '🦋', '🌻', '🍭', '🎀', '💎', '🔥', '❤️', '💜', '💙', '💚', '💛', '🤸', '🙆', '👐', '🦶', '✨', '🌟', '🎵', '🐉', '🦊', '🐼', '🐱', '🐸']))];
export const THEMES = [...new Set(Object.values(NUMBERS).map((n) => n.theme))];
const STYLE_IDS = Object.keys(STYLES);

// field kinds: text (a name), int (min..max), pick (one of a list), styles (some of the four, or all), themes (some numbers)
const NAME = { kind: 'text', max: NAME_MAX };
const PRICE = { kind: 'int', min: 0, max: 500 };
const MINUTES = { kind: 'int', min: 1, max: 15 };
const ICON = { kind: 'pick', of: ICONS };
// per table: the fields every row has; `priced`: the price only where the game's row has one (a free costume stays free);
// `extra`: the fields only a new row has; `add`: whether new rows may be added
export const SCHEMA = {
  moves: { fields: { fr: NAME, en: NAME, d: { kind: 'int', min: 1, max: 3 } }, add: true,
    extra: { icon: ICON, c: { kind: 'pick', of: [4, 8] }, a: { kind: 'int', min: 0, max: 2 }, b: { kind: 'int', min: 0, max: 2 }, st: { kind: 'styles' }, like: { kind: 'pick', of: Object.keys(DEFAULTS.moves) } } },
  outfits: { fields: { fr: NAME, en: NAME, min: MINUTES }, priced: true, add: true,
    extra: { icon: ICON, price: PRICE, themes: { kind: 'themes' }, look: { kind: 'pick', of: Object.keys(DEFAULTS.outfits) } } },
  hairs: { fields: { fr: NAME, en: NAME, min: MINUTES }, priced: true },
  shoes: { fields: { fr: NAME, en: NAME }, priced: true },
  accs: { fields: { fr: NAME, en: NAME }, priced: true },
  pieces: { fields: { fr: NAME, en: NAME }, priced: true },
  snacks: { fields: { fr: NAME, en: NAME }, priced: true },
  upgrades: { fields: { fr: NAME, en: NAME }, priced: true },
  classes: { fields: { fr: NAME, en: NAME } },
  numbers: { fields: { fr: NAME, en: NAME } },
  names: { list: { kind: 'text', max: DANCER_MAX } },
  start: { fields: { stars: { kind: 'int', min: 0, max: 9999 } } },
};
// what a new row starts as (and what fills any field a file leaves out of one)
const TEMPLATE = {
  moves: { fr: 'Mon pas', en: 'My step', icon: '✨', c: 4, d: 1, a: 1, b: 1, st: '*', like: 'tourne' },
  outfits: { fr: 'Mon costume', en: 'My costume', icon: '🌸', min: 3, price: 20, themes: [], look: 'jupette' },
};
// a one-row table (start) is kept in the file as that row itself: { start: { stars: 50 } }; its only row's id is its name
const ONE_ROW = ['start'];
const rowsOf = (table, T) => (ONE_ROW.includes(table) ? { [table]: T } : T);
export const isNewId =(id) => /^new([1-9]|1[0-2])$/.test(id) && +id.slice(3) <= MAX_NEW;
const own = (o, k) => o != null && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k);
const isObj = (o) => o != null && typeof o === 'object' && !Array.isArray(o);

// the fields of one row: the table's own, plus the price where the game's row has one, plus a new row's extras
export function fieldsOf(table, id) {
  const S = SCHEMA[table]; if (!S || !S.fields) return {};
  const base = { ...S.fields };
  if (S.priced && !isNewId(id) && DEFAULTS[table][id] && DEFAULTS[table][id].price) base.price = PRICE;
  return isNewId(id) && S.add ? { ...base, ...S.extra } : base;
}
const rowExists = (table, id) => table === 'start' ? id === 'start' : (own(DEFAULTS[table], id) || (isNewId(id) && !!SCHEMA[table]?.add));

// one value checked: { ok: true, value } or { ok: false, why } — why: field, empty, long, rude, nan, whole, range, choice
export function check(table, id, field, value) {
  if (!rowExists(table, id)) return { ok: false, why: 'field' };
  const spec = table === 'names' ? (Number.isInteger(field) && field >= 0 && field < DEFAULTS.names[id].length ? SCHEMA.names.list : null) : fieldsOf(table, id)[field];
  if (!spec) return { ok: false, why: 'field' };
  switch (spec.kind) {
    case 'text': {
      if (typeof value !== 'string') return { ok: false, why: 'empty' };
      const s = value.replace(/\s+/g, ' ').trim();
      if (!s) return { ok: false, why: 'empty' };
      if ([...s].length > spec.max) return { ok: false, why: 'long' };
      const c = clean(s, null, spec.max);
      return c === null ? { ok: false, why: 'rude' } : { ok: true, value: c };
    }
    case 'int': {
      const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
      if (typeof n !== 'number' || !Number.isFinite(n)) return { ok: false, why: 'nan' };
      if (!Number.isInteger(n)) return { ok: false, why: 'whole' };
      if (n < spec.min || n > spec.max) return { ok: false, why: 'range' };
      return { ok: true, value: n };
    }
    case 'pick': { const v = spec.of.find((x) => x === value || (typeof x === 'number' && String(x) === value)); return v === undefined ? { ok: false, why: 'choice' } : { ok: true, value: v }; }
    case 'styles': {
      if (value === '*') return { ok: true, value };
      const parts = typeof value === 'string' ? value.split(' ').filter(Boolean) : [];
      if (!parts.length || parts.some((p) => !STYLE_IDS.includes(p))) return { ok: false, why: 'choice' };
      return { ok: true, value: STYLE_IDS.filter((p) => parts.includes(p)).join(' ') };
    }
    case 'themes': {
      if (!Array.isArray(value) || value.length > THEMES.length || value.some((x) => !THEMES.includes(x))) return { ok: false, why: 'choice' };
      return { ok: true, value: THEMES.filter((x) => value.includes(x)) };
    }
  }
  return { ok: false, why: 'field' };
}

// an old file: the bare rows (as applyRows takes them), no version → { v: 1, rows }
function migrate(input) {
  if (!isObj(input)) return { v: SETTINGS_V, rows: {} };
  if (input.v === undefined && !own(input, 'rows')) return { v: SETTINGS_V, rows: input };
  return { v: SETTINGS_V, rows: isObj(input.rows) ? input.rows : {} };
}

// keep what is known and valid; count what was left out. Never throws, whatever it is given.
export function sanitize(input) {
  let dropped = 0; const rows = {};
  try {
    const src = migrate(input).rows;
    for (const table of Object.keys(src)) {
      if (!own(SCHEMA, table) || !isObj(src[table])) { dropped++; continue; }
      const out = {}, T = rowsOf(table, src[table]);
      for (const id of Object.keys(T)) {
        const row = T[id];
        if (!rowExists(table, id)) { dropped++; continue; }
        if (table === 'names') {
          if (!Array.isArray(row)) { dropped++; continue; }
          const def = DEFAULTS.names[id], list = def.map((d, i) => { const c = check('names', id, i, row[i]); if (!c.ok && row[i] !== undefined) dropped++; return c.ok ? c.value : d; });
          if (list.some((x, i) => x !== def[i])) out[id] = list;
          continue;
        }
        if (!isObj(row)) { dropped++; continue; }
        const keep = {};
        for (const f of Object.keys(row)) { const c = check(table, id, f, row[f]); if (c.ok) keep[f] = c.value; else dropped++; }
        // a new row is always whole: what the file leaves out (or gets wrong) comes from the template
        if (isNewId(id)) { const tpl = TEMPLATE[table]; for (const f of Object.keys(tpl)) if (keep[f] === undefined) keep[f] = copy(tpl[f]); }
        if (Object.keys(keep).length) out[id] = keep;
      }
      if (Object.keys(out).length) rows[table] = ONE_ROW.includes(table) ? out[table] : out;
    }
  } catch { return { file: { v: SETTINGS_V, rows: {} }, dropped: dropped + 1 }; }
  return { file: { v: SETTINGS_V, rows }, dropped };
}

// the rows applyRows lays over the game (the file's tables have the same names, `start` is its one row)
export function toRows(file) {
  const over = {};
  for (const [table, rows] of Object.entries(file.rows || {})) over[table] = copy(rows);
  return over;
}
// sanitize, then change the game's rows; returns the clean file and how much was left out
export function applySettings(input) {
  const r = sanitize(input);
  applyRows(toRows(r.file));
  return r;
}

// a copy of the file with one field set (or removed, when value is undefined); empty rows and tables are tidied away
export function withField(file, table, id, field, value) {
  const f = copy(file); f.rows = f.rows || {};
  const T = (f.rows[table] = f.rows[table] || {});
  if (table === 'names') {
    const list = T[id] ? [...T[id]] : [...DEFAULTS.names[id]];
    list[field] = value === undefined ? DEFAULTS.names[id][field] : value;
    if (list.every((x, i) => x === DEFAULTS.names[id][i])) delete T[id]; else T[id] = list;
  } else if (ONE_ROW.includes(table)) {
    if (value === undefined) delete T[field]; else T[field] = value;
  } else {
    const row = (T[id] = T[id] || {});
    if (value === undefined) delete row[field]; else row[field] = value;
    if (!Object.keys(row).length) delete T[id];
  }
  if (!Object.keys(T).length) delete f.rows[table];
  return f;
}
// the value shown for a field: the file's, or the game's own
export function valueOf(file, table, id, field) {
  const r = ONE_ROW.includes(table) ? file.rows?.[table] : file.rows?.[table]?.[id];
  if (table === 'names') return (r || DEFAULTS.names[id])[field];
  if (r && r[field] !== undefined) return r[field];
  return isNewId(id) ? undefined : DEFAULTS[table][id]?.[field];
}
// the next free new id of a table, and the row it starts as
export function newRow(table, file) {
  const used = Object.keys(file.rows?.[table] || {});
  for (let k = 1; k <= MAX_NEW; k++) if (!used.includes(`new${k}`)) return { id: `new${k}`, row: copy(TEMPLATE[table]) };
  return { id: null, row: null };
}
export const newIds = (file, table) => Object.keys(file.rows?.[table] || {}).filter(isNewId);
