#!/usr/bin/env node
/**
 * census — every way things relate to each other in the apps on this machine, read off the apps and counted.
 * Phase 116 (the person says what their world is), ONT-000.
 *
 * Generated, never hand-typed. Writes, into the phase folder:
 *   kinds.json   one entry per relation KIND: its sentence, its question, its count per source, its evidence rows
 *   KINDS.md     the same as a page, plus the notes attributed to kinds, the depth per source, the oral list
 * and, when a private corpus is present, into the folder given by --private (OUTSIDE this repository):
 *   rows.json    the private rows with their file:line evidence
 *   depth.json   the dotted paths of the private sources with their real names
 *
 * The hand-kept inputs are `kinds.hand.json` beside the outputs (the kind list with its sentence and question;
 * the classification row id → kind for the in-repo rows; the three notes; the oral list) and, for the private
 * rows, `<private>/classification.json` (row id → kind). A classification key may use `*` for the `from` part.
 *
 * The script FAILS (exit 1) when a harvested row has no kind, when a classification names a row that was not
 * harvested from a source that is present, when a kind is used that the list does not declare, when a declared
 * kind has no row at all, and when a note is attributed to a kind the list does not declare. A kind nobody
 * read off an app is not in the list — that is acceptance criterion 1 of ONT-000 and this failure is its gate.
 *
 * SOURCES, and how each row is found (so nobody has to trust it):
 *   template:<name>  every template under templates/ whose nodegx.security.json names a collection. A field is a
 *                    `prop-<field>` port wired into a New/Set Record Properties node for that collection
 *                    (connections.json), a `property` in a Query Records visual filter, or a `runOnChange-qp-<x>`
 *                    query parameter. A field is a RELATION CANDIDATE when its name ends in Id/Ids; the target is
 *                    the collection whose name is the stem (`taskId` → Task), `_User` for userId, else `?`.
 *                    `creatorOwns` and `acl-<role>-target` are who-can-see rows. Evidence: the file and the line
 *                    of the node's id (or the collection's name in the security file).
 *   lessons          templates/digital-bricks-training/backend/schema.json — the declared schema of the NodeGX
 *                    backend that runs in production for the lessons MCP (its tools/setup-backend.mjs applies this
 *                    file through POST /admin/schema/apply). A column is a candidate when it ends in Id/Ids/Email
 *                    or is a lifecycle timestamp (removedAt, archivedAt, cancelledAt, claimedAt, readAt,
 *                    completedAt, editedAt). A table's own key (a single-field unique index) is not a relation.
 *                    `<x>Id` resolves to the table whose single-field unique index is `<x>Id`; `anchorId` beside
 *                    `anchorKind` is a link to one of several kinds. The live admin API was NOT read: no admin
 *                    token on this machine (ONT-000 §6 says so); the file is what the backend was given.
 *   acme             --acme <path>, never checked in. Field definitions in scripts/*.js that carry
 *                    `foreign_key_table` / `related_collection` / `choices`; dotted paths in src (js, svelte)
 *                    string literals and in the configuration guide's filters (docs/*.md, per `#### \`coll\``
 *                    section); plus `<private>/acme.hand.json`, the relations declared in the CMS's UI (no
 *                    script declares them) with the guide heading as evidence.
 *   tirion           --tirion <path>. FOREIGN KEY … REFERENCES and inline `REFERENCES` in db (sql); composite
 *                    primary keys (a junction); `TYPE[]` columns (a list of ids/values); JSONB provenance columns;
 *                    `tenant_id TEXT`; UNIQUE (tenant_id, external_id).
 *   sentinel         --sentinel <path>. ForeignKey(...) columns in backend/models.py with their class/table;
 *                    Table(...) junctions and relationship(secondary=...); ForeignKeyConstraint in the alembic
 *                    migrations with their create_table.
 *
 * DEPTH (ONT-000 step 4): acme — the longest dotted path whose every hop resolves to a harvested relation field;
 * tirion — the most JOINs in one SQL statement under pipelines/ and api/; sentinel — the longest attribute chain
 * in backend (py) whose middle segments are relationship names; template — the filters are one field deep by
 * construction (reported as 1); lessons — a schema carries no path (reported as n/a).
 *
 * Usage:
 *   node scripts/ontology/census.js [--acme P] [--tirion P] [--sentinel P] [--private DIR]   # regenerate
 *   node scripts/ontology/census.js --check [...]       # exit 1 if kinds.json on disk is stale
 * With no private path the private sources' counts are taken from the committed kinds.json and reported as
 * "not verified here"; --check then checks the in-repo part only.
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? path.resolve(args[i + 1]) : null;
};

const root = path.join(__dirname, '..', '..');
const rel = (p) => path.relative(root, p).split(path.sep).join('/');
const phaseDir = path.join(root, 'dev-docs', 'tasks', 'phase-116-the-person-says-what-their-world-is');
const handPath = path.join(phaseDir, 'kinds.hand.json');
const jsonOut = path.join(phaseDir, 'kinds.json');
const mdOut = path.join(phaseDir, 'KINDS.md');
const templatesDir = path.join(root, 'templates');
const lessonsSchema = path.join(templatesDir, 'digital-bricks-training', 'backend', 'schema.json');

const PRIVATE_DIR = opt('--private');
const PRIVATE_SOURCES = { acme: opt('--acme'), tirion: opt('--tirion'), sentinel: opt('--sentinel') };
const PRIVATE_NAMES = Object.keys(PRIVATE_SOURCES);

const REC_TYPES = new Set(['NewDbModelProperties', 'SetDbModelProperties', 'DbCollection2', 'DbModel2', 'DeleteDbModelProperties']);
const LIFECYCLE = /^(removedAt|archivedAt|cancelledAt|claimedAt|readAt|completedAt|editedAt|end_date|superseded_by)$/;

// ------------------------------------------------------------------ helpers --

const read = (p) => fs.readFileSync(p, 'utf8');
const readJson = (p) => JSON.parse(read(p));
const exists = (p) => p && fs.existsSync(p);

/** 1-based line of the first occurrence of `needle` in `text`, or 0. */
function lineOf(text, needle, from = 0) {
  const i = text.indexOf(needle, from);
  if (i < 0) return 0;
  return text.slice(0, i).split('\n').length;
}

function walkFiles(dir, pred, out = []) {
  if (!exists(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git' || e.name === '.venv' || e.name === 'venv' || e.name === '__pycache__') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkFiles(p, pred, out);
    else if (pred(p)) out.push(p);
  }
  return out;
}

const warnings = [];
const errors = [];

/** Rows are merged by id; a relation found twice keeps the first evidence and counts the sightings. */
class Rows {
  constructor() {
    this.byId = new Map();
  }
  add(r) {
    const id = `${r.source}|${r.from}.${r.field}`;
    const have = this.byId.get(id);
    if (have) {
      have.seen += 1;
      if (!have.how.includes(r.how)) have.how.push(r.how);
      if (have.to === '?' && r.to !== '?') have.to = r.to;
      return have;
    }
    const row = { id, source: r.source, from: r.from, field: r.field, to: r.to || '?', how: [r.how], evidence: r.evidence, note: r.note || '', seen: 1 };
    this.byId.set(id, row);
    return row;
  }
  all() {
    return [...this.byId.values()];
  }
}

// ------------------------------------------------------------ templates --

function harvestTemplates(rows) {
  const sources = [];
  for (const name of fs.readdirSync(templatesDir).sort()) {
    const secPath = path.join(templatesDir, name, 'nodegx.security.json');
    if (!exists(secPath)) continue;
    const secText = read(secPath);
    const sec = JSON.parse(secText);
    const collections = Object.keys(sec.collections || {});
    if (!collections.length) continue;
    const source = 'template:' + name;
    const lower = new Map(collections.map((c) => [c.toLowerCase(), c]));
    const resolve = (field) => {
      const stem = field.replace(/Ids?$/, '').toLowerCase();
      if (stem === 'user') return '_User';
      if (lower.has(stem)) return lower.get(stem);
      const bySuffix = collections.filter((c) => c.toLowerCase().endsWith(stem)); // itemId → MoneyItem
      return bySuffix.length === 1 ? bySuffix[0] : '?';
    };
    let fieldsSeen = 0;
    for (const c of collections) {
      const cfg = sec.collections[c] || {};
      const owns = cfg.creatorOwns !== undefined ? cfg.creatorOwns : !!(sec.defaults && sec.defaults.creatorOwns);
      if (owns) rows.add({ source, from: c, field: 'creatorOwns', to: '_User', how: 'security-creatorOwns', evidence: `${rel(secPath)}:${lineOf(secText, '"' + c + '"')}` });
    }
    const compDir = path.join(templatesDir, name, 'components');
    for (const nodesPath of walkFiles(compDir, (p) => path.basename(p) === 'nodes.json')) {
      const nodesText = read(nodesPath);
      const nodes = JSON.parse(nodesText).nodes || [];
      const connPath = path.join(path.dirname(nodesPath), 'connections.json');
      const conns = exists(connPath) ? readJson(connPath).connections || [] : [];
      for (const n of nodes) {
        if (!REC_TYPES.has(n.type)) continue;
        const p = n.parameters || {};
        const coll = p.collectionName;
        if (!coll) continue;
        const evidence = `${rel(nodesPath)}:${lineOf(nodesText, '"id": "' + n.id + '"')}`;
        const fields = new Map(); // field → how
        for (const c of conns) if (c.toId === n.id && typeof c.toProperty === 'string' && c.toProperty.startsWith('prop-')) fields.set(c.toProperty.slice(5), 'prop-port');
        const vf = p.visualFilter;
        if (vf && Array.isArray(vf.rules)) for (const r of vf.rules) if (r && r.property && !fields.has(r.property)) fields.set(r.property, 'filter');
        for (const k of Object.keys(p)) {
          const m = /^runOnChange-qp-(.+)$/.exec(k);
          if (m && !fields.has(m[1])) fields.set(m[1], 'query-param');
          const a = /^acl-(\w+)-target$/.exec(k);
          if (a) rows.add({ source, from: coll, field: 'acl-' + a[1], to: String(p[k] || '?'), how: 'acl-target', evidence, note: `role ${p['acl-' + a[1] + '-role'] || '?'}` });
        }
        for (const [field, how] of fields) {
          fieldsSeen += 1;
          if (!/Ids?$/.test(field) || field === 'objectId') continue; // objectId is the record's own id
          rows.add({ source, from: coll, field, to: resolve(field), how, evidence });
        }
      }
    }
    sources.push({ name: source, kind: 'in-repo', collections: collections.length, fieldsSeen });
  }
  return sources;
}

// -------------------------------------------------------------- lessons --

function harvestLessons(rows) {
  if (!exists(lessonsSchema)) {
    warnings.push('lessons: schema.json missing — source skipped');
    return [];
  }
  const text = read(lessonsSchema);
  const schema = JSON.parse(text);
  const tables = schema.tables || [];
  const source = 'lessons';
  // A table's OWN key is a single-field unique index `<x>Id` whose stem names the table (Cohort.cohortId,
  // CoachingSession.sessionId). A single-field unique index that does not (ProjectContext.learnerId) is a
  // one-per-target link, harvested as a row with the note "one per target".
  const isOwnKey = (table, field) => {
    const stem = field.replace(/Id$/, '').toLowerCase();
    const t = table.toLowerCase();
    return t.startsWith(stem) || t.endsWith(stem);
  };
  const keyOf = new Map(); // field → table whose own key it is
  for (const t of tables) for (const ix of t.indexes || []) if (ix.unique && ix.fields.length === 1 && isOwnKey(t.name, ix.fields[0])) {
    const f = ix.fields[0];
    keyOf.set(f, keyOf.has(f) && keyOf.get(f) !== t.name ? '?' : t.name);
  }
  const tableNames = new Set(tables.map((t) => t.name));
  const resolve = (field) => {
    if (/^(author)?userId$/i.test(field)) return '_User';
    if (/Email$/.test(field)) return '_User';
    if (keyOf.has(field)) return keyOf.get(field);
    const m = /([A-Z]\w*?Id)$/.exec(field); // claimedByLearnerId → LearnerId → learnerId
    if (m) {
      const f = m[1][0].toLowerCase() + m[1].slice(1);
      if (keyOf.has(f)) return keyOf.get(f);
    }
    const stem = field.replace(/Ids?$/, '');
    const pascal = stem[0].toUpperCase() + stem.slice(1);
    return tableNames.has(pascal) ? pascal : '?';
  };
  let columns = 0;
  for (const t of tables) {
    const tLine = lineOf(text, `"name": "${t.name}"`);
    const own = new Set((t.indexes || []).filter((ix) => ix.unique && ix.fields.length === 1 && isOwnKey(t.name, ix.fields[0])).map((ix) => ix.fields[0]));
    const onePer = new Set((t.indexes || []).filter((ix) => ix.unique && ix.fields.length === 1 && !isOwnKey(t.name, ix.fields[0])).map((ix) => ix.fields[0]));
    const junctions = (t.indexes || []).filter((ix) => ix.unique && ix.fields.length >= 2 && ix.fields.every((f) => /Id$/.test(f)));
    const colNames = new Set(t.columns.map((c) => c.name));
    for (const c of t.columns) {
      columns += 1;
      const line = lineOf(text, `"name": "${c.name}"`, text.indexOf(`"name": "${t.name}"`)) || tLine;
      const evidence = `${rel(lessonsSchema)}:${line}`;
      if (own.has(c.name)) continue;
      if (LIFECYCLE.test(c.name)) {
        rows.add({ source, from: t.name, field: c.name, to: '(lifecycle)', how: 'timestamp-column', evidence });
        continue;
      }
      if (c.name === 'anchorId' && colNames.has('anchorKind')) {
        rows.add({ source, from: t.name, field: c.name, to: '(one of several, named by anchorKind)', how: 'polymorphic-pair', evidence });
        continue;
      }
      if (!/(Id|Ids|Email)$/.test(c.name)) continue;
      const to = resolve(c.name);
      const j = junctions.find((ix) => ix.fields.includes(c.name));
      rows.add({ source, from: t.name, field: c.name, to, how: /Email$/.test(c.name) ? 'column-by-email' : onePer.has(c.name) ? 'column-id-unique' : 'column-id', evidence, note: onePer.has(c.name) ? 'one per target' : j ? `unique with ${j.fields.filter((f) => f !== c.name).join('+')}` : '' });
    }
  }
  return [{ name: source, kind: 'in-repo', collections: tables.length, fieldsSeen: columns, read: 'checked-in schema.json (the live admin API was not read: no admin token here)' }];
}

// ----------------------------------------------------------------- acme --

function harvestAcme(rows, dir, hand) {
  const source = 'acme';
  const prel = (p) => 'acme/' + path.relative(dir, p).split(path.sep).join('/');
  // 1. schema scripts
  const scripts = walkFiles(path.join(dir, 'scripts'), (p) => p.endsWith('.js'));
  const collBefore = (text, at) => {
    const head = text.slice(0, at);
    const pats = [/collection:\s*'(\w+)'/g, /createField(?:IfMissing)?\((?:token,\s*)?'(\w+)'/g, /const\s+([A-Z_]+)_FIELDS/g, /Creating (\w+) collection/g, /fields to (\w+)/g, /\/fields\/(\w+)[`'/]/g, /\.(\w+)\.\$\{(?:field|f)\.field\}/g];
    let best = null;
    for (const re of pats) {
      let m;
      while ((m = re.exec(head))) if (!best || m.index > best.index) best = { index: m.index, name: m[1] };
    }
    return best ? best.name.toLowerCase() : '?';
  };
  for (const f of scripts) {
    const text = read(f);
    const re = /(foreign_key_table|related_collection):\s*'(\w+)'/g;
    let m;
    while ((m = re.exec(text))) {
      const head = text.slice(0, m.index);
      const fm = [...head.matchAll(/field:\s*'(\w+)'/g)].pop();
      const field = fm ? fm[1] : '?';
      const from = collBefore(text, m.index);
      rows.add({ source, from, field, to: m[2], how: 'script-' + m[1], evidence: `${prel(f)}:${lineOf(text, m[0])}` });
    }
    const cre = /choices:\s*\[/g;
    while ((m = cre.exec(text))) {
      const head = text.slice(0, m.index);
      const fm = [...head.matchAll(/field:\s*'(\w+)'/g)].pop();
      rows.add({ source, from: collBefore(text, m.index), field: fm ? fm[1] : '?', to: '(one of a list)', how: 'script-choices', evidence: `${prel(f)}:${text.slice(0, m.index).split('\n').length}` });
    }
  }
  // 2. hand-declared (the CMS UI made them; no script says so)
  for (const r of hand.relations || []) rows.add({ source, from: r.from, field: r.field, to: r.to, how: 'guide-declared', evidence: r.evidence, note: r.note || '' });
  // 3. paths: guide filters and src string literals
  const paths = [];
  for (const f of walkFiles(path.join(dir, 'docs'), (p) => p.endsWith('.md'))) {
    const text = read(f);
    let section = '?';
    text.split('\n').forEach((line, i) => {
      const h = /^####\s+`(\w+)`/.exec(line);
      if (h) section = h[1];
      for (const m of line.matchAll(/`([a-z_]+(?:\.[a-z_]+)+)`/g)) paths.push({ from: section, path: m[1], evidence: `${prel(f)}:${i + 1}`, how: 'guide-filter' });
      for (const m of line.matchAll(/\{\s*([a-z_]+(?:\.[a-z_]+)+)\s*:/g)) paths.push({ from: section, path: m[1], evidence: `${prel(f)}:${i + 1}`, how: 'guide-filter' });
      for (const m of line.matchAll(/^\s*-?\s*(?:Filter|Only allowed if):?\s*`?([a-z_]+(?:\.[a-z_]+)+)`?\s+equals/g)) paths.push({ from: section, path: m[1], evidence: `${prel(f)}:${i + 1}`, how: 'guide-filter' });
    });
  }
  for (const f of walkFiles(path.join(dir, 'src'), (p) => /\.(js|svelte|ts)$/.test(p) && !/\.test\./.test(p))) {
    const text = read(f);
    text.split('\n').forEach((line, i) => {
      for (const m of line.matchAll(/'([a-z_]+(?:\.[a-z_]+)+)'/g)) paths.push({ from: '?', path: m[1], evidence: `${prel(f)}:${i + 1}`, how: 'src-literal' });
    });
  }
  return { sources: [{ name: source, kind: 'private', collections: new Set(rows.all().filter((r) => r.source === source).map((r) => r.from)).size, read: dir ? 'present' : 'absent' }], paths };
}

// --------------------------------------------------------------- tirion --

function harvestTirion(rows, dir) {
  const source = 'tirion';
  const prel = (p) => 'tirion/' + path.relative(dir, p).split(path.sep).join('/');
  const files = walkFiles(path.join(dir, 'db'), (p) => p.endsWith('.sql'));
  for (const f of files) {
    const text = read(f);
    let table = '?';
    text.split('\n').forEach((line, i) => {
      const ev = `${prel(f)}:${i + 1}`;
      let m;
      if ((m = /(?:CREATE|ALTER) TABLE(?: IF(?: NOT)? EXISTS)?\s+([\w.]+)/i.exec(line)) && m[1].toUpperCase() !== 'IF') table = m[1];
      if ((m = /FOREIGN KEY\s*\((\w+)\)\s*REFERENCES\s+([\w.]+)/.exec(line))) rows.add({ source, from: table, field: m[1], to: m[2], how: 'sql-fk', evidence: ev });
      else if ((m = /^\s*(?:ADD COLUMN IF NOT EXISTS\s+)?(\w+)\s+\w+(?:\(\d+\))?\s+REFERENCES\s+([\w.]+)/.exec(line))) rows.add({ source, from: table, field: m[1], to: m[2], how: 'sql-inline-fk', evidence: ev });
      if ((m = /PRIMARY KEY\s*\(([^)]+)\)/.exec(line))) {
        const cols = m[1].split(',').map((s) => s.trim());
        if (cols.length >= 2) rows.add({ source, from: table, field: '(key ' + cols.join('+') + ')', to: '(composite key)', how: 'sql-composite-key', evidence: ev });
      }
      if ((m = /^\s*(\w+)\s+(UUID|TEXT|INT)\[\]/.exec(line)) && !line.includes(':=')) rows.add({ source, from: table, field: m[1], to: '(list of ' + m[2].toLowerCase() + ')', how: 'sql-array', evidence: ev });
      if ((m = /^\s*(\w+)\s+JSONB/i.exec(line)) && /ref|meta|provenance/i.test(m[1])) rows.add({ source, from: table, field: m[1], to: '(another system, by its id there)', how: 'sql-jsonb-provenance', evidence: ev });
      if (/^\s*tenant_id\s+TEXT/.test(line)) rows.add({ source, from: table, field: 'tenant_id', to: '(tenant, by name)', how: 'sql-scope-text', evidence: ev });
      if ((m = /UNIQUE\s*\(tenant_id,\s*(external_id|native_id)\)/.exec(line))) rows.add({ source, from: table, field: m[1], to: '(another system, by its id there)', how: 'sql-unique-external', evidence: ev });
      if ((m = /^\s*(end_date|superseded_by|archived_at|removed_at|cancelled_at)\s/.exec(line))) rows.add({ source, from: table, field: m[1], to: '(lifecycle)', how: 'sql-lifecycle', evidence: ev });
    });
  }
  // depth: the most JOINs in one SQL statement — a .sql file splits on ';', a .py file on its triple-quoted
  // strings (Python has no statement separator; splitting a whole module on ';' would count every JOIN in it)
  let deepest = { joins: 0, evidence: '' };
  for (const f of walkFiles(dir, (p) => /\.(py|sql)$/.test(p) && !p.includes('/db/migrations/') && !p.includes('/tests/') && !p.includes('/data/'))) {
    const text = read(f);
    const units = f.endsWith('.py') ? (text.match(/("""|''')[\s\S]*?\1/g) || []).flatMap((s) => s.split(';')) : text.split(';');
    units.forEach((stmt) => {
      const joins = (stmt.match(/\bJOIN\b/g) || []).length;
      if (joins > deepest.joins) deepest = { joins, evidence: `${prel(f)}:${lineOf(text, stmt.trim().slice(0, 40))}` };
    });
  }
  return { sources: [{ name: source, kind: 'private', collections: new Set(rows.all().filter((r) => r.source === source).map((r) => r.from)).size, read: 'present' }], depth: { hops: deepest.joins, evidence: deepest.evidence, how: 'JOINs in one statement' } };
}

// ------------------------------------------------------------- sentinel --

function harvestSentinel(rows, dir) {
  const source = 'sentinel';
  const prel = (p) => 'sentinel/' + path.relative(dir, p).split(path.sep).join('/');
  const relNames = new Set();
  const models = path.join(dir, 'backend', 'models.py');
  if (exists(models)) {
    const text = read(models);
    let table = '?';
    text.split('\n').forEach((line, i) => {
      const ev = `${prel(models)}:${i + 1}`;
      let m;
      if ((m = /^class\s+(\w+)\(Base\)/.exec(line))) table = m[1];
      if ((m = /__tablename__\s*=\s*'(\w+)'/.exec(line))) table = m[1];
      if ((m = /^(\w+)\s*=\s*Table\((?:'(\w+)')?/.exec(line))) table = m[2] || m[1]; // the name may sit on the next line
      if ((m = /^\s*(?:Column\(')?(\w+)'?\s*(?:=\s*Column\()?.*ForeignKey\('([\w.]+)'\)/.exec(line))) rows.add({ source, from: table, field: m[1], to: m[2].split('.')[0], how: 'orm-fk', evidence: ev, note: /remote_side/.test(text.split('\n')[i + 1] || '') ? 'self' : '' });
      if ((m = /^\s*(\w+)\s*=\s*relationship\('(\w+)'.*secondary=(\w+)/.exec(line))) {
        relNames.add(m[1]);
        rows.add({ source, from: table, field: m[1], to: m[2], how: 'orm-secondary', evidence: ev, note: 'through ' + m[3] });
      } else if ((m = /^\s*(\w+)\s*=\s*relationship\(/.exec(line))) relNames.add(m[1]);
    });
  }
  for (const f of walkFiles(path.join(dir, 'backend', 'alembic'), (p) => p.endsWith('.py'))) {
    const text = read(f);
    let table = '?';
    let pendingName = false;
    text.split('\n').forEach((line, i) => {
      let m;
      if (pendingName && (m = /^\s*'(\w+)'/.exec(line))) {
        table = m[1];
        pendingName = false;
      }
      if ((m = /op\.create_table\(\s*(?:'(\w+)')?/.exec(line))) {
        if (m[1]) table = m[1];
        else pendingName = true; // the name sits on the next line
      }
      if ((m = /ForeignKeyConstraint\(\['(\w+)'\],\s*\['([\w.]+)'\]/.exec(line))) rows.add({ source, from: table, field: m[1], to: m[2].split('.')[0], how: 'alembic-fk', evidence: `${prel(f)}:${i + 1}` });
      if ((m = /sa\.Column\('(superseded_by|archived_at|removed_at)'/.exec(line))) rows.add({ source, from: table, field: m[1], to: '(lifecycle)', how: 'alembic-lifecycle', evidence: `${prel(f)}:${i + 1}` });
    });
  }
  // depth: attribute chains whose middle segments are relationship names
  let deepest = { hops: 0, path: '', evidence: '' };
  for (const f of walkFiles(path.join(dir, 'backend'), (p) => p.endsWith('.py') && !p.includes('alembic'))) {
    const text = read(f);
    text.split('\n').forEach((line, i) => {
      for (const m of line.matchAll(/\b([a-z_]+(?:\.[a-z_]+){2,})\b/g)) {
        const segs = m[1].split('.');
        const mids = segs.slice(1, -1);
        if (mids.length && mids.every((s) => relNames.has(s)) && mids.length + 1 > deepest.hops) deepest = { hops: mids.length + 1, path: m[1], evidence: `${prel(f)}:${i + 1}` };
      }
    });
  }
  return { sources: [{ name: source, kind: 'private', collections: new Set(rows.all().filter((r) => r.source === source).map((r) => r.from)).size, read: 'present' }], depth: { hops: deepest.hops, path: deepest.path, evidence: deepest.evidence, how: 'attribute chain over relationship names' } };
}

// ---------------------------------------------------------- acme depth --

function acmeDepth(rows, paths) {
  // resolve each path hop by hop against the harvested relation fields: from → field → to
  const fieldsOf = new Map(); // collection → Map(field → to)
  for (const r of rows.all()) {
    if (r.source !== 'acme') continue;
    if (!fieldsOf.has(r.from)) fieldsOf.set(r.from, new Map());
    fieldsOf.get(r.from).set(r.field, r.to);
  }
  const anyWith = (field) => [...fieldsOf.entries()].filter(([, m]) => m.has(field));
  const resolved = [];
  let unresolved = 0;
  for (const p of paths) {
    const segs = p.path.split('.');
    let from = p.from;
    if (from === '?') {
      const cands = anyWith(segs[0]);
      from = cands.length === 1 ? cands[0][0] : '?';
    }
    let hops = 0;
    let at = from;
    const chain = [];
    for (const s of segs) {
      const m = fieldsOf.get(at);
      if (m && m.has(s) && !m.get(s).startsWith('(')) {
        hops += 1;
        chain.push(`${at}.${s}`);
        at = m.get(s);
      } else break;
    }
    if (hops === 0) {
      unresolved += 1;
      continue;
    }
    resolved.push({ path: p.path, from, hops, chain, evidence: p.evidence, how: p.how });
  }
  const counts = new Map();
  for (const r of resolved) counts.set(r.path, (counts.get(r.path) || 0) + 1);
  const deepest = resolved.slice().sort((a, b) => b.hops - a.hops || a.path.localeCompare(b.path))[0] || { hops: 0 };
  return { hops: deepest.hops, path: deepest.path, chain: deepest.chain, evidence: deepest.evidence, how: 'dotted path, every hop a harvested relation field', paths: resolved.length, distinct: counts.size, unresolved, table: [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([p, n]) => ({ path: p, uses: n, hops: resolved.find((r) => r.path === p).hops })) };
}

// ------------------------------------------------------------ classify --

function classify(rows, hand, privateClass) {
  const kinds = hand.kinds || {};
  const lookup = (table, row) => {
    if (table[row.id]) return table[row.id];
    const star = `${row.source}|*.${row.field}`;
    if (table[star]) return table[star];
    const starTo = `${row.source}|*→${row.to}`;
    if (table[starTo]) return table[starTo];
    return null;
  };
  const used = new Set();
  for (const r of rows.all()) {
    const table = PRIVATE_NAMES.includes(r.source) ? privateClass : hand.classification || {};
    const k = lookup(table, r);
    if (!k) {
      errors.push(`unclassified row ${r.id} (→ ${r.to}; ${r.how.join(',')}; ${r.evidence})`);
      continue;
    }
    if (!kinds[k]) errors.push(`row ${r.id} is classified "${k}", which the kind list does not declare`);
    r.kind = k;
    used.add(r.id);
  }
  const present = new Set(['lessons', ...fs.readdirSync(templatesDir).map((n) => 'template:' + n), ...PRIVATE_NAMES.filter((n) => PRIVATE_SOURCES[n])]);
  for (const [table, label] of [[hand.classification || {}, 'kinds.hand.json'], [privateClass, 'private classification']]) {
    for (const key of Object.keys(table)) {
      const src = key.split('|')[0];
      if (!present.has(src)) continue;
      if (key.includes('*')) {
        const hit = rows.all().some((r) => r.kind && (key === `${r.source}|*.${r.field}` || key === `${r.source}|*→${r.to}`));
        if (!hit) errors.push(`${label}: "${key}" matches no harvested row`);
      } else if (!rows.byId.has(key)) errors.push(`${label}: "${key}" names a row that was not harvested`);
    }
  }
}

// ----------------------------------------------------------------- main --

function main() {
  if (!exists(handPath)) {
    console.error(`missing ${rel(handPath)}`);
    process.exit(1);
  }
  const hand = readJson(handPath);
  const privateClass = PRIVATE_DIR && exists(path.join(PRIVATE_DIR, 'classification.json')) ? readJson(path.join(PRIVATE_DIR, 'classification.json')) : {};
  const acmeHand = PRIVATE_DIR && exists(path.join(PRIVATE_DIR, 'acme.hand.json')) ? readJson(path.join(PRIVATE_DIR, 'acme.hand.json')) : { relations: [] };
  const rows = new Rows();
  const sources = [];
  const depth = {};

  sources.push(...harvestTemplates(rows));
  sources.push(...harvestLessons(rows));
  for (const s of sources) depth[s.name] = s.name === 'lessons' ? { hops: null, how: 'a schema carries no path' } : { hops: 1, how: 'a Query Records filter names one field of the collection it queries' };

  let acmePaths = [];
  if (PRIVATE_SOURCES.acme) {
    const a = harvestAcme(rows, PRIVATE_SOURCES.acme, acmeHand);
    sources.push(...a.sources);
    acmePaths = a.paths;
  }
  if (PRIVATE_SOURCES.tirion) {
    const t = harvestTirion(rows, PRIVATE_SOURCES.tirion);
    sources.push(...t.sources);
    depth.tirion = t.depth;
  }
  if (PRIVATE_SOURCES.sentinel) {
    const s = harvestSentinel(rows, PRIVATE_SOURCES.sentinel);
    sources.push(...s.sources);
    depth.sentinel = s.depth;
  }
  if (PRIVATE_SOURCES.acme) depth.acme = acmeDepth(rows, acmePaths);

  classify(rows, hand, privateClass);

  // counts per kind per source
  const kinds = hand.kinds || {};
  const kindIds = Object.keys(kinds);
  const committed = exists(jsonOut) ? readJson(jsonOut) : null;
  const privatePresent = PRIVATE_NAMES.filter((n) => PRIVATE_SOURCES[n]);
  const privateAbsent = PRIVATE_NAMES.filter((n) => !PRIVATE_SOURCES[n]);
  const out = {
    $comment: 'Generated by scripts/ontology/census.js (phase 116, ONT-000). Do not edit; edit kinds.hand.json (and the private classification) and regenerate.',
    sources: sources.map((s) => ({ name: s.name, kind: s.kind, collections: s.collections, fieldsSeen: s.fieldsSeen, read: s.read })),
    privateVerified: privateAbsent.length === 0,
    kinds: [],
    notes: hand.notes || [],
    depth: {},
    oral: hand.oral || { status: 'not yet taken down', rows: [] }
  };
  for (const k of kindIds) {
    const mine = rows.all().filter((r) => r.kind === k);
    const bySource = {};
    for (const r of mine) bySource[r.source] = (bySource[r.source] || 0) + 1;
    // private counts not regenerable here come from the committed file
    for (const n of privateAbsent) {
      const was = committed && committed.kinds.find((x) => x.id === k);
      if (was && was.bySource[n]) bySource[n] = was.bySource[n];
    }
    const total = Object.values(bySource).reduce((a, b) => a + b, 0);
    if (total === 0) errors.push(`kind "${k}" has no evidence row in any source — a kind nobody read off an app is refused`);
    out.kinds.push({
      id: k,
      sentence: kinds[k].sentence,
      question: kinds[k].question,
      distinguishes: kinds[k].distinguishes || '',
      projectsTo: kinds[k].projectsTo || '',
      rows: total,
      single: total === 1,
      bySource,
      evidence: mine.filter((r) => !PRIVATE_NAMES.includes(r.source)).map((r) => ({ id: r.id, to: r.to, how: r.how.join(','), evidence: r.evidence, note: r.note || undefined, seen: r.seen > 1 ? r.seen : undefined })).sort((a, b) => a.id.localeCompare(b.id))
    });
  }
  for (const n of hand.notes || []) if (!kinds[n.kind]) errors.push(`note "${n.note}" is attributed to "${n.kind}", which the kind list does not declare`);
  // depth, in a fixed order (in-repo sources, then the private ones) so the file is the same whichever
  // sources were present; raw names only for in-repo sources; private sources carry the hop count and the
  // hand sentence. An absent private source keeps its committed entry and its committed `sources` row verbatim:
  // the console says "not verified here", the file does not change for a reason nobody can regenerate.
  const order = [...Object.keys(depth).filter((n) => !PRIVATE_NAMES.includes(n)), ...PRIVATE_NAMES];
  for (const name of order) {
    const d = depth[name];
    if (!d) continue;
    const sentence = (hand.depthSentences || {})[name] || '';
    out.depth[name] = PRIVATE_NAMES.includes(name) ? { hops: d.hops, how: d.how, sentence, paths: d.paths, distinct: d.distinct, unresolved: d.unresolved } : { hops: d.hops, how: d.how, sentence };
  }
  for (const n of privateAbsent) {
    if (committed && committed.depth && committed.depth[n]) out.depth[n] = committed.depth[n];
    const was = committed && committed.sources.find((s) => s.name === n);
    if (was) out.sources.push(was);
  }
  if (privateAbsent.length && committed) out.privateVerified = committed.privateVerified;

  if (errors.length) {
    console.error(`ontology census: ${errors.length} error(s)\n  ` + errors.join('\n  '));
    process.exit(1);
  }

  const jsonText = JSON.stringify(out, null, 2) + '\n';
  if (CHECK) {
    if (!committed) {
      console.error(`--check: ${rel(jsonOut)} does not exist; run without --check first`);
      process.exit(1);
    }
    const onDisk = read(jsonOut);
    if (onDisk !== jsonText) {
      console.error(`--check: ${rel(jsonOut)} is stale (regenerate with: npm run ontology-census)${privateAbsent.length ? ` — private sources ${privateAbsent.join(', ')} not verified here` : ''}`);
      process.exit(1);
    }
    console.log(`ontology census fresh: ${out.kinds.length} kinds, ${rows.all().length} rows read${privateAbsent.length ? `; ${privateAbsent.join(', ')} counts taken from the committed file` : ''}`);
    process.exit(0);
  }

  // private outputs
  if (PRIVATE_DIR && privatePresent.length) {
    fs.mkdirSync(PRIVATE_DIR, { recursive: true });
    const priv = rows.all().filter((r) => PRIVATE_NAMES.includes(r.source)).sort((a, b) => a.id.localeCompare(b.id));
    fs.writeFileSync(path.join(PRIVATE_DIR, 'rows.json'), JSON.stringify(priv, null, 2) + '\n');
    fs.writeFileSync(path.join(PRIVATE_DIR, 'depth.json'), JSON.stringify(Object.fromEntries(PRIVATE_NAMES.filter((n) => depth[n]).map((n) => [n, depth[n]])), null, 2) + '\n');
  }

  // KINDS.md
  const today = new Date().toISOString().slice(0, 10);
  const md = [];
  md.push('# The relation kinds, read off the apps on this machine');
  md.push('');
  md.push(`**Counts are about these ${out.sources.length} sources and no others** (ONT-000 §5): ${out.sources.map((s) => `\`${s.name}\``).join(', ')}. Generated ${today} by \`scripts/ontology/census.js\` — do not edit by hand; edit \`kinds.hand.json\` and regenerate. ${out.privateVerified ? 'Every source was present.' : `Private sources ${privateAbsent.join(', ')} were absent: their counts are carried from the committed \`kinds.json\` and not verified here.`}`);
  md.push('');
  md.push('A kind enters this list only with an evidence row that names a file and a line, or a document and a heading; a kind with one row is marked **(1)**; a kind with none makes the script fail. A row is one (collection, field) pair, so a junction contributes one row per end and a relation seen in several places is one row with its sightings counted. The private sources\' rows (the membership business and the two prototypes) are held outside the repository (README R6); only their counts are here. The sentence is written per kind and read per row with the row\'s names in it.');
  md.push('');
  md.push('## Sources');
  md.push('');
  md.push('| source | kind | collections | fields seen | read from |');
  md.push('|---|---|---|---|---|');
  for (const s of out.sources) md.push(`| \`${s.name}\` | ${s.kind} | ${s.collections ?? ''} | ${s.fieldsSeen ?? ''} | ${s.read || 'the files named in the script header'} |`);
  md.push('');
  md.push('## The kinds');
  md.push('');
  const srcNames = out.sources.map((s) => s.name);
  md.push(`| kind | a person's sentence | rows | ${srcNames.map((s) => '`' + s.replace('template:', '') + '`').join(' | ')} |`);
  md.push(`|---|---|---|${srcNames.map(() => '---').join('|')}|`);
  for (const k of out.kinds) md.push(`| **${k.id}**${k.single ? ' (1)' : ''} | ${k.sentence} | ${k.rows} | ${srcNames.map((s) => k.bySource[s] || '·').join(' | ')} |`);
  md.push('');
  for (const k of out.kinds) {
    md.push(`### ${k.id}${k.single ? ' — one row only' : ''}`);
    md.push('');
    md.push(`*${k.sentence}*`);
    md.push('');
    md.push(`- **The question it asks:** ${k.question}`);
    if (k.distinguishes) md.push(`- **Told apart from its neighbours by:** ${k.distinguishes}`);
    if (k.projectsTo) md.push(`- **Projects to (P104's tiles / the contract):** ${k.projectsTo}`);
    const priv = PRIVATE_NAMES.filter((n) => k.bySource[n]).map((n) => `${n} ${k.bySource[n]}`);
    if (priv.length) md.push(`- **Private rows, held outside the repo:** ${priv.join(', ')}`);
    if (k.evidence.length) {
      md.push('- **Evidence in this repo:**');
      md.push('');
      md.push('  | row | → | found by | evidence |');
      md.push('  |---|---|---|---|');
      for (const e of k.evidence) md.push(`  | \`${e.id}\` | ${e.to} | ${e.how}${e.seen ? ' ×' + e.seen : ''}${e.note ? ' — ' + e.note : ''} | \`${e.evidence}\` |`);
    }
    md.push('');
  }
  md.push('## The three notes, read as answers (ONT-000 step 3)');
  md.push('');
  md.push('| note | kind | the question it answers, in general words |');
  md.push('|---|---|---|');
  for (const n of out.notes) md.push(`| ${n.note} | **${n.kind}** | ${n.question} |`);
  md.push('');
  md.push('## The depth number (ONT-000 step 4)');
  md.push('');
  md.push('| source | deepest path (hops) | how it was counted | the sentence it stands for |');
  md.push('|---|---|---|---|');
  for (const [name, d] of Object.entries(out.depth)) md.push(`| \`${name}\` | ${d.hops === null ? 'n/a' : d.hops}${d.paths ? ` (${d.paths} paths, ${d.distinct} distinct, ${d.unresolved} literals not resolvable to a relation)` : ''}${d.notVerifiedHere ? ' — not verified here' : ''} | ${d.how} | ${d.sentence || ''} |`);
  md.push('');
  md.push("## Richard's list (ONT-000 step 5, oral)");
  md.push('');
  md.push(`**Status: ${out.oral.status}.** ${out.oral.rows.length ? '' : 'Taken down in conversation, not read off a file; marked oral.'}`);
  if (out.oral.rows.length) {
    md.push('');
    md.push('| the mistake, in his words | mutant of kind |');
    md.push('|---|---|');
    for (const r of out.oral.rows) md.push(`| ${r.mistake} | **${r.kind}** |`);
  }
  md.push('');
  if (warnings.length) {
    md.push('## Warnings');
    md.push('');
    for (const w of warnings) md.push(`- ${w}`);
    md.push('');
  }
  fs.writeFileSync(jsonOut, jsonText);
  fs.writeFileSync(mdOut, md.join('\n') + '\n');
  console.log(`ontology census: ${out.kinds.length} kinds, ${rows.all().length} rows over ${out.sources.length} sources → ${rel(jsonOut)}, ${rel(mdOut)}${PRIVATE_DIR ? `, private rows → ${PRIVATE_DIR}` : ''}`);
}

main();
