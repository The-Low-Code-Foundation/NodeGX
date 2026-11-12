// The grown-ups' settings: the rows of each table they may change, as the game has them now (with their earlier
// changes already laid over), and what a "Save" sends. Every check that matters happens again in the cloud function.
const D = use('rules/data');
const { TABLES, KNOWN, checkChange } = use('settings/check');

// which table, its rows, and which numbers a grown-up may change in it
const TABLE_OF = { moves: D.MOVES, outfits: D.OUTFITS, hairs: D.HAIRS, shoes: D.SHOES, accs: D.ACCS, pieces: D.PIECES, snacks: D.SNACKS, upgrades: D.UPGRADES, numbers: D.NUMBERS };
const NUMBERS_OF = { moves: ['d', 'c'], outfits: ['price', 'min'], hairs: ['price', 'min'], shoes: ['price'], accs: ['price'], pieces: ['price'], snacks: ['price'], upgrades: ['price'], numbers: [] };
const TABLE_KEYS = ['moves', 'outfits', 'hairs', 'shoes', 'accs', 'pieces', 'snacks', 'upgrades', 'numbers', 'start'];

const plainChange = (c) => ({ table: typeof c.get === 'function' ? c.get('table') : c.table, rowId: typeof c.get === 'function' ? c.get('rowId') : c.rowId });

function tables(current, w) {
  return TABLE_KEYS.map((k) => ({ id: k, label: w(`gt_${k}`), pressed: k === current }));
}

function rows(table, changes, w) {
  if (table === 'start') return [];
  const T = TABLE_OF[table] || {}, nums = NUMBERS_OF[table] || [], changed = new Set((changes || []).map(plainChange).filter((c) => c.table === table).map((c) => c.rowId));
  return Object.entries(T).map(([id, r]) => {
    const [a, b] = nums;
    return {
      id, icon: r.icon || '', fr: r.fr || '', en: r.en || '', changed: changed.has(id), isNew: !(KNOWN[table] || []).includes(id),
      aShow: !!a, aLabel: a ? w(`gf_${a}`) : '', a: a && r[a] !== undefined ? String(r[a]) : '',
      bShow: !!b, bLabel: b ? w(`gf_${b}`) : '', b: b && r[b] !== undefined ? String(r[b]) : '',
    };
  });
}

// what a row's Save sends: only what differs from the row as the game has it now
function rowChange(table, id, values) {
  const r = (TABLE_OF[table] || {})[id];
  if (!r) return null;
  const fields = {}, [a, b] = NUMBERS_OF[table] || [];
  if (values.fr !== undefined && String(values.fr).trim() !== r.fr) fields.fr = String(values.fr);
  if (values.en !== undefined && String(values.en).trim() !== r.en) fields.en = String(values.en);
  for (const [k, v] of [[a, values.a], [b, values.b]]) {
    if (!k || v === undefined || v === null || String(v).trim() === '') continue;
    const n = Number(String(v).replace(',', '.'));
    if (n !== r[k]) fields[k] = n;
  }
  return { table, rowId: id, fields };
}

// a new step or a new costume: a fresh id the grown-up never has to see
const freshId = (prefix) => `${prefix}${Date.now().toString(36)}`;
function newStep(v) {
  return { table: 'moves', rowId: freshId('pas'), fields: { fr: v.fr, en: v.en || v.fr, d: Number(v.d) || 1, c: Number(v.c) || 4, icon: v.icon || '💃', a: Number(v.a ?? 1), b: Number(v.b ?? 1), st: v.st || '*' } };
}
function newCostume(v) {
  const fields = { fr: v.fr, en: v.en || v.fr, min: Number(v.min) || 3, icon: v.icon || '👗' };
  if (v.price !== undefined && String(v.price).trim() !== '') fields.price = Number(v.price);
  if (v.theme) fields.themes = [v.theme];
  return { table: 'outfits', rowId: freshId('tenue'), fields };
}

// the same check the cloud function will make, so the grown-up hears at once what is wrong
function precheck(change, w) {
  if (!change || !Object.keys(change.fields || {}).length) return { ok: false, message: w('gm_nothing') };
  const r = checkChange(change.table, change.rowId, change.fields);
  return r.ok ? { ok: true } : { ok: false, message: w(`gm_${r.reason}`) || r.reason };
}

// the lists the forms offer
const options = (w) => ({
  icons: KNOWN.icons.slice(0, 60).map((i) => ({ Label: i, Value: i })),
  styles: [{ Label: w('gs_all'), Value: '*' }, ...KNOWN.styles.map((s) => ({ Label: w.nm(D.STYLES[s]), Value: s }))],
  levels: [0, 1, 2].map((l) => ({ Label: D.LEVELS[w.lang][l], Value: String(l) })),
  diffs: [1, 2, 3].map((d) => ({ Label: '●'.repeat(d) + '○'.repeat(3 - d), Value: String(d) })),
  counts: [4, 8].map((c) => ({ Label: String(c), Value: String(c) })),
  themes: [{ Label: '—', Value: '' }, ...KNOWN.themes.map((t) => ({ Label: t, Value: t }))],
});

Object.assign(exports, { tables, rows, rowChange, newStep, newCostume, precheck, options, TABLE_KEYS });
