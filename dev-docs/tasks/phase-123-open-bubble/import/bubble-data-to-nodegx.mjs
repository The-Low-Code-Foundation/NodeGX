#!/usr/bin/env node
// bubble-data-to-nodegx — a Bubble app's data (the Data tab's exports) → files the NodeGX backend imports.
//
//   node bubble-data-to-nodegx.mjs <export.json> <folder of Bubble data exports> <NodeGX project dir> [--tz Europe/Paris]
//
// <export.json> is the app definition bubble2nodegx.mjs read (it names each type's fields and their types). The
// folder holds Bubble's exports, one per data type, as Bubble names them (`export_All-<Type>s_<date>.json` or `.csv`).
// For each one this writes `<project>/backend/data/<collection>.json` in the backend's own collection format, and
// `backend/data/IMPORT-DATA.md` with the commands that load them and every value it could not read.
// Bubble writes dates as text in the exporting browser's time zone, to the minute: `--tz` names that zone (default:
// this machine's). No dependencies.
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2); const tzAt = args.indexOf('--tz'); const tz = tzAt >= 0 ? args.splice(tzAt, 2)[1] : Intl.DateTimeFormat().resolvedOptions().timeZone;
const [srcPath, dataDir, projectDir] = args;
if (!srcPath || !dataDir || !projectDir) { console.error('usage: bubble-data-to-nodegx.mjs <export.json> <data folder> <project dir> [--tz <IANA zone>]'); process.exit(2); }
const app = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
const userTypes = app.user_types || {}; const optionSets = app.option_sets || {};
const live = (o) => Object.entries(o || {}).filter(([, x]) => x && typeof x === 'object' && !x.deleted);
const typeName = (k) => k === 'user' ? '_User' : userTypes[k]?.display || k; // as bubble2nodegx.mjs names the collection
const findings = []; const note = (where, what) => findings.push({ where, what });

// ---------------------------------------------------------------- reading Bubble's exported text
const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
// the offset of `zone` at a UTC instant, in ms (Intl, no dependencies)
function zoneOffset(ms, zone) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }).formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - ms;
}
// "Oct 17, 2026 3:05 pm" (the zone's wall clock) → ISO
function bubbleDate(s) {
  if (/^\d{4}-\d{2}-\d{2}T/.test(String(s))) { const d = new Date(s); return Number.isNaN(d.getTime()) ? undefined : d.toISOString(); } // the Data API's ISO dates (a paid plan's)
  const m = /^([A-Za-z]{3})[a-z]* (\d{1,2}), (\d{4})(?:,? (\d{1,2}):(\d{2})(?::(\d{2}))? ?([ap]m)?)?$/i.exec(String(s).trim());
  if (!m || MONTHS[m[1].toLowerCase()] === undefined) return undefined;
  let h = +(m[4] || 0); const ap = (m[7] || '').toLowerCase(); if (ap === 'pm' && h < 12) h += 12; if (ap === 'am' && h === 12) h = 0;
  const wall = Date.UTC(+m[3], MONTHS[m[1].toLowerCase()], +m[2], h, +(m[5] || 0), +(m[6] || 0));
  let utc = wall - zoneOffset(wall, tz); utc = wall - zoneOffset(utc, tz); // twice, for the hour a clock change moves
  return new Date(utc).toISOString();
}
const UNIT_MS = { second: 1e3, minute: 6e4, hour: 36e5, day: 864e5, week: 6048e5 };
// "0 seconds", "2 days 3 hours" → ms
function bubbleInterval(s) { let ms = 0, any = false; for (const m of String(s).matchAll(/(-?[\d.]+)\s*(second|minute|hour|day|week)s?/gi)) { ms += +m[1] * UNIT_MS[m[2].toLowerCase()]; any = true; } return any ? ms : undefined; }
const list = (s) => Array.isArray(s) ? s : String(s).split(/\s*,\s*/).filter(Boolean); // Bubble joins a list with ", "
const BUBBLE_ID = /^\d{13}x\d{15,}$/; // a thing's unique id: "1792241441972x125425336514852770"

// one exported value of a field of Bubble type `t` → the value the column holds, or { error }
function value(t, raw, field) {
  if (raw === '' || raw === null || raw === undefined) return null;
  if (t.startsWith('list.')) { const inner = t.slice(5); const xs = list(raw).map((x) => value(inner, x, field)); const bad = xs.find((x) => x && x.error); return bad || xs.filter((x) => x !== null); }
  if (t === 'user' && !BUBBLE_ID.test(String(raw)) && /@/.test(String(raw))) return { userEmail: String(raw) }; // Bubble exports a link to a User as the user's email
  if (t === 'user' || t.startsWith('custom.')) return BUBBLE_ID.test(String(raw)) ? String(raw) : { error: `"${raw}" is not a unique id, so the link cannot be kept` };
  if (t.startsWith('option.')) { const set = optionSets[t.slice(7)]; const hit = live(set?.values).find(([k, o]) => o.display === raw || o.db_value === raw || k === raw); return hit ? hit[1].db_value ?? hit[0] : { error: `"${raw}" is not an option of ${set?.display || t.slice(7)}` }; }
  switch (t) {
    case 'text': return String(raw);
    case 'number': { const n = Number(String(raw).replace(/,/g, '')); return Number.isNaN(n) ? { error: `"${raw}" is not a number` } : n; }
    case 'boolean': { const s = String(raw).toLowerCase(); return s === 'yes' || s === 'true' ? true : s === 'no' || s === 'false' ? false : { error: `"${raw}" is not yes or no` }; }
    case 'date': { const d = bubbleDate(raw); return d ?? { error: `"${raw}" is not a date Bubble writes` }; }
    case 'image': case 'file': return String(raw).startsWith('//') ? `https:${raw}` : String(raw);
    case 'dateinterval': { const ms = bubbleInterval(raw); return ms ?? { error: `"${raw}" is not an interval` }; }
    case 'date_range': case 'number_range': {
      let pair; try { pair = JSON.parse(raw); } catch { return { error: `"${raw}" is not a range` }; }
      if (!Array.isArray(pair) || pair.every((x) => x === '' || x == null)) return null;
      const one = (x) => x === '' || x == null ? null : t === 'date_range' ? bubbleDate(x) ?? x : Number(x);
      return { start: one(pair[0]), end: one(pair[1]) };
    }
    case 'geographic_address': return typeof raw === 'object' ? raw : { address: String(raw) };
    default: return String(raw);
  }
}

// ---------------------------------------------------------------- the files
function readRows(file) {
  const text = fs.readFileSync(file, 'utf8');
  if (file.endsWith('.json')) { const j = JSON.parse(text); return Array.isArray(j) ? j : j?.response?.results ?? j?.results ?? []; } // the Data tab's array, or a Data API page
  const rows = []; let row = [], f = '', q = false; // RFC 4180
  for (let i = 0; i < text.length; i++) { const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c; }
    else if (c === '"') q = true; else if (c === ',') { row.push(f); f = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); f = ''; rows.push(row); row = []; } else f += c; }
  if (f || row.length) { row.push(f); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.some((x) => x !== ''));
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.replace(/^﻿/, ''), r[i] ?? ''])));
}
// "export_All-someOtherDataTypes_2026-10-17_13-22-17.json" → the type whose name (or its plural) is in it
function typeOf(file) {
  const m = /^export_All-(.+?)_\d{4}-\d{2}-\d{2}/.exec(path.basename(file)); const n = (m ? m[1] : path.basename(file, path.extname(file))).toLowerCase();
  const byName = live(userTypes).find(([k, t]) => { const d = String(t.display || k).toLowerCase(); return [d, `${d}s`, `${d}es`, d.replace(/y$/, 'ies')].includes(n); })?.[0];
  if (byName) return byName;
  // a view's export is named after the view ("export_ids_…"): the type whose fields the columns name
  const cols = new Set(Object.keys(readRows(path.join(dataDir, file))[0] || {}));
  const scored = live(userTypes).map(([k, t]) => [k, live(t.fields).filter(([fk, fd]) => cols.has(fd.display || fk)).length + (k === 'user' && cols.has('email') ? 1 : 0)]).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]);
  return scored.length && (scored.length === 1 || scored[0][1] > scored[1][1]) ? scored[0][0] : undefined;
}

const outDir = path.join(projectDir, 'backend', 'data'); fs.mkdirSync(outDir, { recursive: true });
// one file per type: the newest export (Bubble stamps the name with its time), JSON or CSV
const stamp = (f) => (/_(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})/.exec(f) || [, f])[1];
const newest = new Map();
for (const f of fs.readdirSync(dataDir).filter((f) => /\.(json|csv)$/i.test(f)).sort((a, b) => stamp(a).localeCompare(stamp(b)))) {
  const key = typeOf(f); if (!key) { note(f, 'no data type of the app matches this file name; skipped'); continue; }
  if (newest.has(key)) note(newest.get(key), `an older export of the same type than ${f}; skipped`); newest.set(key, f);
}
const files = [...newest.values()];
if (!files.length) { console.error(`no .json or .csv exports in ${dataDir}`); process.exit(2); }
const tables = [];
for (const f of files) {
  const key = typeOf(f);
  const t = userTypes[key]; const coll = typeName(key);
  const fields = Object.fromEntries(live(t.fields).filter(([fk, fd]) => !/^(unique[ _]?id|_id|bubble[ _]?id)$/i.test(fd.display || fk)).map(([fk, fd]) => [fd.display || fk, { key: fk, type: typeof fd.value === 'string' ? fd.value : 'text' }]));
  const rows = readRows(path.join(dataDir, f)); const records = []; const extra = new Set(); let noId = 0;
  rows.forEach((row, i) => {
    const rec = {};
    for (const [k, raw] of Object.entries(row)) {
      const lk = k.toLowerCase();
      if (/^(unique[ _]?id|_id|bubble[ _]?id)$/i.test(k)) { if (raw) rec.objectId = String(raw); continue; } // Bubble's unique id: the Data API's `_id`, or a text field filled with "This thing's unique id" (no Data tab export carries it)
      if (lk === 'creation date' || lk === 'created date') { const d = raw && bubbleDate(raw); if (d) rec.createdAt = d; continue; }
      if (lk === 'modified date') { const d = raw && bubbleDate(raw); if (d) rec.updatedAt = d; continue; }
      if (lk === 'creator' || lk === 'created by') { if (BUBBLE_ID.test(String(raw))) rec.createdBy = String(raw); else if (/@/.test(String(raw))) rec.createdBy = { userEmail: String(raw) }; continue; } // "(App admin)": made in the editor, no user
      if (lk === 'slug') { if (raw) { rec.Slug = String(raw); extra.add('Slug'); } continue; }
      if (key === 'user' && lk === 'email') { if (raw) { rec.email = String(raw); rec.username = String(raw); } continue; } // NodeGX signs in by username; the converter's sign-up sets it to the email
      const fd = fields[k]; if (!fd && (raw === '' || raw == null)) continue;
      if (!fd) { note(`${coll} row ${i + 1}`, `"${k}" is not a field of ${t.display || key} (deleted, or a built-in this does not know); left out`); continue; }
      const v = value(fd.type, raw, k);
      if (v && typeof v === 'object' && v.error) note(`${coll} row ${i + 1}`, `${k}: ${v.error}; left empty`);
      else if (v !== null) rec[k] = v;
    }
    if (!rec.objectId) noId++;
    records.push(rec);
  });
  // the columns, as bubble2nodegx.mjs declares them, so the backend types each value
  const COL = { text: 'String', number: 'Number', boolean: 'Boolean', date: 'Date', image: 'String', file: 'String', geographic_address: 'Object', number_range: 'Object', date_range: 'Object', dateinterval: 'Number' };
  const columns = Object.entries(fields).map(([name, fd]) => ({ name, ...(fd.type.startsWith('list.') ? { type: 'Array' } : fd.type === 'user' || fd.type.startsWith('custom.') ? { type: 'Pointer', targetClass: typeName(fd.type.replace(/^custom\./, '')) } : { type: COL[fd.type] || 'String' }) }));
  if (records.some((r) => r.createdBy)) columns.push({ name: 'createdBy', type: 'Pointer', targetClass: '_User' });
  for (const x of extra) columns.push({ name: x, type: 'String' });
  if (key === 'user') columns.push({ name: 'email', type: 'String' }, { name: 'username', type: 'String' });
  tables.push({ key, coll, f, fields, columns, records });
}

// The unique ids. No Data tab export carries a row's own id, but a Bubble id starts with its thing's creation time in
// ms ("1792241441972x…" = 12:50:41.972Z) and the export gives each row's Creation Date to the minute. So an id another
// table links to names the minute its row was made: when exactly one row of the linked type was created in that
// minute, that row is the one, and it takes the id (and its creation time back to the millisecond).
const refs = new Map(); // linked type key → ids
const ref = (tk, id) => { if (BUBBLE_ID.test(String(id))) (refs.get(tk) ?? refs.set(tk, new Set()).get(tk)).add(String(id)); };
for (const tb of tables) for (const rec of tb.records) {
  for (const [name, fd] of Object.entries(tb.fields)) { const target = fd.type.replace(/^list\./, ''); if (target === 'user' || target.startsWith('custom.')) for (const id of [].concat(rec[name] ?? [])) ref(target.replace(/^custom\./, ''), id); }
  if (rec.createdBy) ref('user', rec.createdBy);
}
let recovered = 0; const minuteOf = (ms) => Math.floor(ms / 6e4); const at = (ms) => new Date(ms).toISOString().slice(0, 16) + 'Z';
for (const [tk, ids] of refs) {
  const tb = tables.find((x) => x.key === tk);
  if (!tb) { note(typeName(tk), `other tables link to ${ids.size} of its records, but it was not exported: those links point nowhere`); continue; }
  const known = new Set(tb.records.map((r) => r.objectId).filter(Boolean)); const byMinute = new Map();
  for (const id of ids) if (!known.has(id)) { const m = minuteOf(Number(id.split('x')[0])); (byMinute.get(m) ?? byMinute.set(m, []).get(m)).push(id); }
  for (const [m, wanted] of byMinute) {
    const rows = tb.records.filter((r) => !r.objectId && r.createdAt && minuteOf(Date.parse(r.createdAt)) === m);
    if (wanted.length === 1 && rows.length === 1) { rows[0].objectId = wanted[0]; rows[0].createdAt = new Date(Number(wanted[0].split('x')[0])).toISOString(); if (rows[0].updatedAt && rows[0].updatedAt < rows[0].createdAt) rows[0].updatedAt = rows[0].createdAt; recovered++; } // a minute-rounded Modified Date can fall before the exact creation time
    else for (const id of wanted) note(tb.coll, rows.length ? `${id}: ${rows.length} rows were created in its minute (${at(m * 6e4)}) and ${wanted.length} linked ids name it, so which is which cannot be told; links to it point nowhere` : `${id}: no exported row was created in its minute (${at(m * 6e4)}): deleted, not exported, or --tz is not the zone the export was made in; links to it point nowhere`);
  }
}
// links to Users by email → the user's id (the users' export carries their email and, from a view, their unique id)
const users = tables.find((x) => x.key === 'user')?.records || []; let byEmail = 0;
const userId = (v, where) => { if (!v || typeof v !== 'object' || !v.userEmail) return v; const u = users.find((r) => r.email && r.email.toLowerCase() === v.userEmail.toLowerCase()); if (u?.objectId) { byEmail++; return u.objectId; } note(where, `${v.userEmail}: ${u ? 'that user has no unique id in the export' : 'no exported user has that email'}; the link points nowhere`); return undefined; };
for (const tb of tables) tb.records.forEach((rec, i) => { for (const [k, v] of Object.entries(rec)) { const where = `${tb.coll} row ${i + 1}`; if (Array.isArray(v) && v.some((x) => x && x.userEmail)) rec[k] = v.map((x) => userId(x, where)).filter((x) => x !== undefined); else if (v && v.userEmail) { const id = userId(v, where); if (id === undefined) delete rec[k]; else rec[k] = id; } } });
const written = []; let withoutIds = 0;
for (const { key, coll, f, columns, records } of tables) {
  // an id's first part is its creation time in ms: the exact time behind the minute the export wrote
  for (const r of records) if (r.objectId && BUBBLE_ID.test(r.objectId) && r.createdAt && minuteOf(Number(r.objectId.split('x')[0])) === minuteOf(Date.parse(r.createdAt))) { r.createdAt = new Date(Number(r.objectId.split('x')[0])).toISOString(); if (r.updatedAt && r.updatedAt < r.createdAt) r.updatedAt = r.createdAt; }
  const noId = records.filter((r) => !r.objectId).length; withoutIds += noId;
  if (noId) note(coll, `${noId} of ${records.length} rows have no unique id and nothing links to them: each gets a new one on import`);
  const out = path.join(outDir, `${coll}.json`);
  fs.writeFileSync(out, JSON.stringify({ format: 'nodegx-collection', version: 1, collection: coll, exportedAt: new Date().toISOString(), source: { bubbleType: key, file: f, timeZone: tz }, schema: { columns }, count: records.length, records }, null, 2) + '\n');
  written.push({ coll, file: path.basename(out), count: records.length, from: f });
}
if (written.some((w) => w.coll === '_User')) note('_User', 'Bubble never exports passwords: every imported user needs a password reset (or a sign-up) before they can sign in');

const report = [
  '# Data import', '',
  `From the Bubble data exports in \`${path.basename(dataDir)}\`. Dates were read as wall-clock times in **${tz}** (Bubble writes them in the exporting browser's zone, to the minute). ${recovered} unique ids were recovered: a linked record's id begins with its creation time, which matched one exported row.`, '',
  '| collection | rows | from |', '|---|---|---|', ...written.map((w) => `| ${w.coll} | ${w.count} | ${w.from} |`), '',
  'Load them into a bound backend (the backend must be stopped, or use its admin import):', '', '```sh',
  ...written.map((w) => `nodegx-backend import ${w.coll} backend/data/${w.file} --format json --data-dir <the backend's data dir>`), '```', '',
  `## Findings (${findings.length})`, '', '| where | what |', '|---|---|', ...findings.map((x) => `| ${x.where} | ${x.what.replace(/\|/g, '\\|')} |`), ''].join('\n');
fs.writeFileSync(path.join(outDir, 'IMPORT-DATA.md'), report);
console.log(`${written.map((w) => `${w.coll} ${w.count}`).join(', ')} → ${path.relative(process.cwd(), outDir) || outDir}; dates read in ${tz}; ids recovered from creation times ${recovered}; links to users by email ${byEmail}; findings ${findings.length}${withoutIds ? `; ${withoutIds} rows given a new id` : ''}`);
