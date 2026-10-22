
// ---- the change itself: only a grown-up, only what the checker above lets through ----
if (Inputs.rows === undefined || Inputs.roles === undefined) return;
const refuse = (reason) => { Outputs.reason = reason; Outputs.refused(); };
if (!(Inputs.roles || []).includes('grownup')) return refuse('notGrownup');
let fields = Inputs.fields;
if (typeof fields === 'string') { try { fields = JSON.parse(fields); } catch (e) { fields = null; } }
if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return refuse('badFields');
const table = String(Inputs.table || '');
if (!TABLES[table]) return refuse('badTable');
const rowId = TABLES[table].one ? 'row' : String(Inputs.rowId || '');
const get = (o, k) => (o && typeof o.get === 'function' ? o.get(k) : o && o[k]);
const old = (Inputs.rows || []).find((r) => get(r, 'table') === table && get(r, 'rowId') === rowId);
let before = {};
if (old) { try { before = JSON.parse(get(old, 'fields')) || {}; } catch (e) { before = {}; } }
const result = checkChange(table, rowId, { ...before, ...fields });
if (!result.ok) return refuse(result.reason);
Outputs.table = table;
Outputs.rowId = rowId;
Outputs.fieldsJson = JSON.stringify(result.fields);
Outputs.existingId = old ? get(old, 'id') || old.id : '';
if (old) Outputs.update(); else Outputs.create();
