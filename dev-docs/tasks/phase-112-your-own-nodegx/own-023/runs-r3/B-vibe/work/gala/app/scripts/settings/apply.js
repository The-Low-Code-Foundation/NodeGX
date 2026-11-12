// Lays the grown-ups' saved changes over the game's tables, once per visit, before anything reads them.
// Each saved change is checked again here (settings/check.js), so a row that is not allowed never reaches the game.
const { toRows } = use('settings/check');
const { applyRows } = use('rules/data');

let applied = null;
function applyOnce(changes) {
  if (applied) return applied;
  const plain = (changes || []).map((c) => ({
    table: typeof c.get === 'function' ? c.get('table') : c.table,
    rowId: typeof c.get === 'function' ? c.get('rowId') : c.rowId,
    fields: typeof c.get === 'function' ? c.get('fields') : c.fields,
  }));
  const { over, refused } = toRows(plain);
  try { applyRows(over); } catch (e) { refused.push(String(e.message)); }
  applied = { count: plain.length - refused.length, refused };
  return applied;
}
const isApplied = () => !!applied;

Object.assign(exports, { applyOnce, isApplied });
