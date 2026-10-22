// The grown-ups' page: the rows they can edit (the game's own values with their saved changes laid over), the change a
// row's inputs make, and a new step or costume composed from the one it is based on. What is allowed is decided by
// checkChange (gala/rows.js) on the server; this file only prepares what to send. Every function takes the game's data
// module (`d`: MOVES, OUTFITS, …) as an argument, because a script file can't import it.

const TABLES = [
  { table: 'moves', key: 'MOVES', editable: ['fr', 'en', 'd'], icon: null },
  { table: 'outfits', key: 'OUTFITS', editable: ['fr', 'en', 'price', 'min'], icon: null },
  { table: 'hairs', key: 'HAIRS', editable: ['fr', 'en', 'price', 'min'], icon: '💇' },
  { table: 'shoes', key: 'SHOES', editable: ['fr', 'en', 'price'], icon: '👟' },
  { table: 'accs', key: 'ACCS', editable: ['fr', 'en', 'price'], icon: '🎀' },
];
const NEW_EDITABLE = { moves: ['fr', 'en', 'd'], outfits: ['fr', 'en', 'price', 'min'] };
const isAdded = (rowId) => /^x\d\d$/.test(rowId);

// the icons a new step or costume may wear: the same list as checkChange's ICONS (tests/editing.test.mjs checks)
const ICONS = ['✨', '🌟', '⭐', '💫', '🌈', '🌸', '🌺', '🌼', '🍀', '🦋', '🐞', '🐝', '🐬', '🦄', '🐱', '🐶', '🐰', '🦊', '🐻', '🐼', '🐸', '🐧', '🦩', '🦚', '🎀', '🎈', '🎵', '🥁', '🎺', '🎻', '💃', '🕺', '🩰', '👑', '💎', '❄️', '☀️', '🌙', '🌊', '🍓', '🧁', '👗', '🩱', '🧚', '🚀', '⚡', '🌀'];

// one saved change, as plain values: a Query Records row gives `fields` back with an `id` of its own
function plainRecord(r) {
  const read = (k) => (r && typeof r.get === 'function' ? r.get(k) : r && r[k]);
  let fields = read('fields');
  if (fields && typeof fields === 'object') {
    fields = { ...(fields.data && typeof fields.data === 'object' ? fields.data : fields) };
    delete fields.id;
  }
  return { table: read('table'), rowId: read('rowId'), fields };
}

const dots = (d) => '●'.repeat(d) + '○'.repeat(Math.max(0, 3 - d));
function describe(table, row) {
  const parts = [];
  if (table === 'moves') parts.push(`difficulty ${dots(row.d)}`);
  if (row.price) parts.push(`${row.price} ⭐`);
  if (!row.price && table !== 'moves') parts.push('free');
  if (row.min) parts.push(`${row.min} min`);
  return parts.join(' · ');
}

// every row a grown-up can edit, table by table, plus the start row; `changed` says whether a saved change applies
function rowsToEdit(records, d) {
  const saved = {};
  for (const r of (records || []).map(plainRecord)) if (r.table && r.rowId && r.fields) saved[`${r.table}:${r.rowId}`] = r.fields;
  const out = {};
  const startBase = { stars: d.START.stars };
  const startNow = { ...startBase, ...(saved['start:start'] || {}) };
  out.start = [{
    id: 'start:start', table: 'start', rowId: 'start', icon: '⭐', name: 'Stars a new school starts with',
    showStars: true, stars: startNow.stars, editable: ['stars'], base: startBase, current: startNow,
    changed: !!saved['start:start'], isNew: false, note: `The game's own: ${startBase.stars} ⭐`,
  }];
  for (const t of TABLES) {
    const T = d[t.key], rows = [];
    for (const [rowId, base] of Object.entries(T)) {
      const editable = t.editable.filter((f) => f !== 'price' || base.price);
      const current = { ...base, ...(saved[`${t.table}:${rowId}`] || {}) };
      rows.push(rowOf(t, rowId, base, current, editable, !!saved[`${t.table}:${rowId}`], false));
    }
    for (const [key, fields] of Object.entries(saved)) {
      const [table, rowId] = key.split(':');
      if (table !== t.table || !isAdded(rowId) || T[rowId]) continue;
      rows.push(rowOf(t, rowId, fields, fields, NEW_EDITABLE[t.table] || [], true, true));
    }
    out[t.table] = rows;
  }
  return out;
}
function rowOf(t, rowId, base, current, editable, changed, isNew) {
  const has = (f) => editable.includes(f);
  return {
    id: `${t.table}:${rowId}`, table: t.table, rowId, icon: current.icon || t.icon || '',
    name: `${current.fr} · ${current.en}`, fr: current.fr, en: current.en, d: current.d, price: current.price, min: current.min,
    showNames: true, showD: has('d'), showPrice: has('price'), showMin: has('min'), showStars: false,
    editable, base: isNew ? { ...current } : { ...base }, current: { ...current }, full: isNew ? { ...current } : null,
    changed, isNew,
    note: isNew ? `Added by a grown-up · ${describe(t.table, current)}` : `The game's own: ${base.fr} · ${base.en} · ${describe(t.table, base)}`,
  };
}

// what a row's inputs ask for: save these fields, or (nothing differs from the game's own) undo the saved change
function changeFromRow(rowOrObject, values) {
  // a Repeater's row may arrive as the runtime's Object, whose values are under .data
  const row = rowOrObject && rowOrObject.data && typeof rowOrObject.get === 'function' ? rowOrObject.data : rowOrObject;
  if (!row || !row.table) return { action: 'none' };
  const text = (v) => (typeof v === 'string' ? v.trim().split(/\s+/).join(' ') : v);
  const num = (v) => (v === '' || v === undefined || v === null ? undefined : Number(v));
  const picked = { fr: text(values.fr), en: text(values.en), d: num(values.d), price: num(values.price), min: num(values.min), stars: num(values.stars) };
  const key = `${row.table}:${row.rowId}`;
  const now = (f) => (picked[f] === undefined ? row.current[f] : picked[f]);
  if (row.isNew) {
    const fields = { ...row.full };
    for (const f of row.editable) fields[f] = now(f);
    return { action: 'save', key, table: row.table, rowId: row.rowId, fields };
  }
  const fields = {};
  for (const f of row.editable) if (now(f) !== row.base[f]) fields[f] = now(f);
  if (!Object.keys(fields).length) return { action: 'remove', key, table: row.table, rowId: row.rowId };
  return { action: 'save', key, table: row.table, rowId: row.rowId, fields };
}

// the first of the grown-ups' ids (x01 … x20) a table hasn't used yet; '' when all twenty are taken
function freeId(records, table) {
  const used = new Set((records || []).map(plainRecord).filter((r) => r.table === table).map((r) => r.rowId));
  for (let i = 1; i <= 20; i++) { const id = `x${String(i).padStart(2, '0')}`; if (!used.has(id)) return id; }
  return '';
}

// a new step dances like the step it is based on: its counts, levels, travel and styles come from there
function newStep(form, d) {
  const like = d.MOVES[form.like];
  if (!like) return { error: 'Choose the step it dances like.' };
  return { fields: {
    fr: form.fr, en: form.en, c: like.c, d: Number(form.d), a: like.a, b: like.b, dx: like.dx || 0, dz: like.dz || 0,
    st: like.st, icon: form.icon, like: form.like,
  } };
}
// a new costume looks like the costume it is based on, and suits the same numbers
function newCostume(form, d) {
  const like = d.OUTFITS[form.like];
  if (!like) return { error: 'Choose the costume it looks like.' };
  return { fields: {
    fr: form.fr, en: form.en, min: Number(form.min), price: Number(form.price), icon: form.icon,
    themes: (like.themes || []).slice(0, 4), like: form.like,
  } };
}

// the dropdowns' options
function choices(d) {
  const label = (id, r) => `${r.icon || ''} ${r.fr} · ${r.en}`.trim();
  return {
    steps: Object.entries(d.MOVES).filter(([id, r]) => !isAdded(id) && !r.swap).map(([id, r]) => ({ Label: label(id, r), Value: id })),
    outfits: Object.entries(d.OUTFITS).filter(([id]) => !isAdded(id)).map(([id, r]) => ({ Label: label(id, r), Value: id })),
    icons: ICONS.map((icon) => ({ Label: icon, Value: icon })),
    difficulty: [{ Label: '●○○ easy', Value: '1' }, { Label: '●●○ medium', Value: '2' }, { Label: '●●● hard', Value: '3' }],
  };
}

exports.plainRecord = plainRecord;
exports.rowsToEdit = rowsToEdit;
exports.changeFromRow = changeFromRow;
exports.freeId = freeId;
exports.newStep = newStep;
exports.newCostume = newCostume;
exports.choices = choices;
exports.ICONS = ICONS;
