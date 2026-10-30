// A day in the life: one person walks through the app the way it sends them, page by page, and at each step we ask
// the real backend what it hands them. The route and every decision on it come from the app's own graph:
//
//   - which page they start on (the Router's start page), where signing in takes them (the Log In node's next page),
//     and which buttons in the band they can see (a button's `mounted`, worked out from the app's own logic);
//   - what a page asks the backend for when it opens, and whether it asks at all for this person (a Query Records
//     whose fetch waits for the band's "Member" signal, say) — by playing the page's logic nodes: its JavaScript
//     Function scripts run as written, its Cloud Function nodes are called on the backend AS this person;
//   - what came back: a function's answer, searched for rows by the kit's own `rowsIn`; a table read by the page, row
//     by row through the backend's own rule check.
//
// Nothing that changes data is ever run: a button that writes is listed with what it would touch, never pressed.

import vm from 'node:vm';
import { analyseProject, asPerson, loadWorld, personName, personColumns, runnable, idOf, words } from '@nodegx/backend-kit';
// `rowsIn` (how the suite finds rows in a function's answer) isn't a named export of the kit, so it's taken from the
// kit's own file: the same code the suite grades with.
import { rowsIn } from '../node_modules/@nodegx/backend-kit/lib/reach.mjs';

const SIGNAL = Symbol('signal');
const FETCH_PORTS = new Set(['fetch', 'storageFetch', 'refresh']);
const strip = (t) => String(t).replace(/^\/#?/, '');
const MAX_PAGES = 14;
const MAX_EVENTS = 4000;

/* ------------------------------------------------------------------ the app, read from its files */

export function readApp(project) {
  const reg = project.store.readRegistry();
  const comps = {};
  for (const key of project.store.componentKeys()) {
    const f = project.store.filesOf(key, reg.components[key]);
    const nodes = f.nodes.nodes;
    comps[key] = { key, type: reg.components[key]?.type, nodes, conns: f.connections.connections || [], byId: Object.fromEntries(nodes.map((n) => [n.id, n])) };
  }
  const router = Object.values(comps).flatMap((c) => c.nodes).find((n) => n.type === 'Router');
  const startPage = router ? strip(router.parameters?.pages?.startPage ?? '') : null;
  const pageTitle = (key) => {
    const p = comps[key]?.nodes.find((n) => n.type === 'Page');
    return p?.parameters?.title || p?.label || key.split('/').pop();
  };
  const pageUrl = (key) => comps[key]?.nodes.find((n) => n.type === 'Page')?.parameters?.urlPath ?? null;
  return { comps, startPage, pageTitle, pageUrl, analysis: null };
}

/* ------------------------------------------------------------------ the backend, read once and kept a few seconds */

export function makeWorld(be) {
  let cache = null;
  return async function world() {
    if (cache && Date.now() - cache.at < 15_000) return cache.w;
    const w = await loadWorld(be);
    const config = (await be.get('/admin/permissions')).config ?? {};
    cache = { at: Date.now(), w: { ...w, config } };
    return cache.w;
  };
}

/** The person's own name, from a row that names them (a Member row's `name`), else the kit's name from their email. */
export function displayName(u, w) {
  for (const t of w.schema.tables) {
    if (t.name === '_User') continue;
    const cols = personColumns(t).map((c) => c.name);
    if (!cols.length || !t.columns.some((c) => c.name === 'name')) continue;
    const row = (w.rowsByTable[t.name] ?? []).find((r) => cols.some((c) => idOf(r[c]) === u.objectId) && typeof r.name === 'string' && r.name.trim());
    if (row) return { name: row.name.trim(), from: `their ${t.name} row` };
  }
  return { name: personName(u), from: 'their email' };
}

export async function listPeople(world) {
  const w = await world();
  return (w.rowsByTable._User ?? []).map((u) => {
    const n = displayName(u, w);
    return { id: u.objectId, name: n.name, nameFrom: n.from, email: u.email ?? null, roles: u.roles ?? [], groups: groupWords(u.roles ?? []), disabled: !!u.disabled };
  });
}

const groupWords = (roles) => (roles.length ? roles.map((r) => `the ${r} group`).join(' and ') : 'in no group yet');

/* ------------------------------------------------------------------ filters a Query Records applies on the server */

const OPS = {
  'equal to': (a, b) => a === b,
  'not equal to': (a, b) => a !== b,
  'greater than': (a, b) => a > b,
  'greater than or equal to': (a, b) => a >= b,
  'less than': (a, b) => a < b,
  'less than or equal to': (a, b) => a <= b,
  exist: (a) => a !== undefined && a !== null,
  'not exist': (a) => a === undefined || a === null,
  contain: (a, b) => typeof a === 'string' && a.includes(b)
};

function applyFilter(rows, filter, params) {
  if (!filter?.rules?.length) return { rows, words: null, unknown: null };
  const tests = [];
  const said = [];
  for (const r of filter.rules) {
    const op = OPS[r.operator];
    if (!op || r.rules) return { rows, words: null, unknown: `a filter the tool can’t read (“${r.operator ?? 'a group of rules'}”), so every row the rules allow is shown` };
    const value = r.input !== undefined ? params[r.input] : r.value;
    tests.push((row) => op(row[r.property], value));
    said.push(`${r.property} ${r.operator} ${value === undefined ? `(${r.input}, not set)` : JSON.stringify(value)}`);
  }
  const any = filter.combinator === 'or';
  return { rows: rows.filter((row) => (any ? tests.some((t) => t(row)) : tests.every((t) => t(row)))), words: said.join(any ? ' or ' : ' and '), unknown: null };
}

function applySort(rows, sort) {
  if (!sort?.length) return rows;
  return [...rows].sort((a, b) => {
    for (const s of sort) {
      const x = a[s.property];
      const y = b[s.property];
      if (x === y) continue;
      const c = x === undefined ? 1 : y === undefined ? -1 : x < y ? -1 : 1;
      return s.order === 'descending' ? -c : c;
    }
    return 0;
  });
}

/** A row in a few words, for the page. */
export function rowLabel(row) {
  for (const k of ['title', 'name', 'subject', 'label', 'email', 'username']) if (typeof row?.[k] === 'string' && row[k].trim()) return row[k].trim().slice(0, 80);
  return row?.objectId ?? '?';
}

/* ------------------------------------------------------------------ playing one page */

/**
 * Plays one page for one person: mounts it and its parts, delivers each signal along the app's own wires, runs its
 * scripts, and asks the backend whenever the page would. `ctx` holds who it is and the doors to the backend.
 */
async function playPage(app, pageKey, pageParams, ctx) {
  const touches = []; // what the page asked of the backend, in order
  const navigations = []; // RouterNavigate nodes that fired, with their params
  const notes = [];
  const queue = [];
  let events = 0;
  const instances = [];

  function makeInstance(key, parent = null, parentNodeId = null) {
    const comp = app.comps[key];
    const inst = { key, comp, parent, parentNodeId, inputs: {}, out: {}, children: {}, ran: new Set() };
    instances.push(inst);
    for (const n of comp.nodes) {
      const k = strip(n.type);
      if (app.comps[k] && !k.startsWith('__cloud__/')) inst.children[n.id] = makeInstance(k, inst, n.id);
    }
    return inst;
  }

  // NodeGX runs a node once for everything that reached it in the same moment (a value and a "run" together), so a
  // node asked twice before it got to run runs once, with everything it was given.
  const scheduled = new Set();
  function once(inst, n, work) {
    const key = instances.indexOf(inst) + ':' + n.id;
    if (scheduled.has(key)) return;
    scheduled.add(key);
    queue.push(async () => {
      scheduled.delete(key);
      await work();
    });
  }
  function fanOut(inst, nodeId, port, value) {
    for (const c of inst.comp.conns) if (c.fromId === nodeId && c.fromProperty === port) queue.push(() => deliver(inst, c.toId, c.toProperty, value));
  }
  const label = (n) => n.label || n.type;
  const inside = (inst) => (inst.key === pageKey ? null : inst.key);

  async function deliver(inst, nodeId, port, value) {
    const n = inst.comp.byId[nodeId];
    if (!n) return;
    const box = (inst.inputs[nodeId] ??= {});
    if (value !== SIGNAL) box[port] = value;
    const p = n.parameters || {};
    const child = inst.children[nodeId];
    if (child) {
      const ci = child.comp.nodes.find((x) => x.type === 'Component Inputs');
      if (ci) fanOut(child, ci.id, port, value);
      return;
    }
    switch (n.type) {
      case 'Component Outputs':
        if (value !== SIGNAL) inst.out[port] = value;
        else inst.out[port] = (inst.out[port] ?? 0) + 1;
        if (inst.parent) fanOut(inst.parent, inst.parentNodeId, port, value);
        return;
      case 'JavaScriptFunction':
        if (port === 'run' || (port.startsWith('in-') && value !== SIGNAL && p[`runOnChange-${port}`])) once(inst, n, () => runScript(inst, n));
        return;
      case 'Expression':
        return;
      case 'CloudFunction2':
        if (port === 'call') once(inst, n, () => callFunction(inst, n));
        return;
      case 'DbCollection2':
        if (FETCH_PORTS.has(port)) once(inst, n, () => query(inst, n));
        else if (port.startsWith('qp-') && value !== SIGNAL && !hasFetchWire(inst, n) && paramsReady(inst, n)) once(inst, n, () => query(inst, n, `its filter being given “${port.slice(3)}”, after ${triggerWords(inst, n)}`));
        return;
      case 'DbModel2':
        if (port === 'fetch') once(inst, n, () => getOne(inst, n));
        return;
      case 'RouterNavigate':
        if (port === 'navigate') navigations.push({ target: strip(p.target ?? ''), label: label(n), from: inst.key, params: Object.fromEntries(Object.entries(box).filter(([k]) => k.startsWith('pm-')).map(([k, v]) => [k.slice(3), v])) });
        return;
      default:
        return;
    }
  }

  const hasFetchWire = (inst, n) => inst.comp.conns.some((c) => c.toId === n.id && FETCH_PORTS.has(c.toProperty));
  const qpWires = (inst, n) => inst.comp.conns.filter((c) => c.toId === n.id && c.toProperty.startsWith('qp-')).map((c) => c.toProperty);
  const paramsReady = (inst, n) => qpWires(inst, n).every((q) => inst.inputs[n.id]?.[q] !== undefined);

  function runScript(inst, n) {
    const box = inst.inputs[n.id] ?? {};
    const Inputs = Object.fromEntries(Object.entries(box).filter(([k]) => k.startsWith('in-')).map(([k, v]) => [k.slice(3), v]));
    const emitted = [];
    const Outputs = new Proxy(
      {},
      {
        get: (_, k) => () => emitted.push([`out-${String(k)}`, SIGNAL]),
        set: (_, k, v) => (emitted.push([`out-${String(k)}`, v]), true)
      }
    );
    try {
      vm.runInNewContext(`(function(){\n${n.parameters.functionScript}\n})()`, { Inputs, Outputs, console: { log() {}, warn() {}, error() {} }, Noodl: undefined }, { timeout: 250 });
    } catch (e) {
      notes.push(`The script “${n.label || 'a JavaScript Function'}” in ${inst.key} stopped (${e.message}); what came after it isn’t shown.`);
    }
    for (const [port, v] of emitted) fanOut(inst, n.id, port, v);
  }

  async function callFunction(inst, n) {
    const fn = n.parameters.function;
    const box = inst.inputs[n.id] ?? {};
    const args = Object.fromEntries(Object.entries(box).filter(([k]) => k.startsWith('in-')).map(([k, v]) => [k.slice(3), v]));
    const step = { kind: 'function', fn, page: pageKey, inside: inside(inst), node: label(n), args, why: triggerWords(inst, n) };
    touches.push(step);
    const r = await ctx.callAs(fn, args);
    Object.assign(step, r);
    if (r.status === 'ran') {
      const v = r.value && typeof r.value === 'object' ? r.value : { result: r.value };
      for (const [k, val] of Object.entries(v)) fanOut(inst, n.id, `out-${k}`, val);
      fanOut(inst, n.id, 'done', SIGNAL);
    } else fanOut(inst, n.id, 'failure', SIGNAL);
  }

  async function query(inst, n, why) {
    const p = n.parameters;
    const table = p.collectionName;
    const box = inst.inputs[n.id] ?? {};
    const params = Object.fromEntries(Object.entries(box).filter(([k]) => k.startsWith('qp-')).map(([k, v]) => [k.slice(3), v]));
    const step = { kind: 'query', table, page: pageKey, inside: inside(inst), node: label(n), why: why ?? triggerWords(inst, n) };
    touches.push(step);
    const read = await ctx.readTable(table);
    Object.assign(step, read);
    if (read.status !== 'read') return fanOut(inst, n.id, 'failure', SIGNAL);
    const f = applyFilter(read.rowsData, p.visualFilter, params);
    const rows = applySort(f.rows, p.visualSort);
    step.filter = f.words;
    step.filterUnknown = f.unknown;
    step.sort = (p.visualSort ?? []).map((s) => `${s.property}, ${s.order === 'descending' ? 'newest or largest first' : 'oldest or smallest first'}`).join('; ') || null;
    step.rowsData = rows;
    step.allowedButFiltered = read.rowsData.length - rows.length;
    fanOut(inst, n.id, 'items', rows.map((r) => ({ ...r, id: r.objectId })));
    fanOut(inst, n.id, 'count', rows.length);
    fanOut(inst, n.id, 'fetched', SIGNAL);
  }

  async function getOne(inst, n) {
    const table = n.parameters.collectionName;
    const id = inst.inputs[n.id]?.modelId;
    const step = { kind: 'record', table, id, page: pageKey, inside: inside(inst), node: label(n), why: 'the page opening with that row’s id in its address' };
    touches.push(step);
    const read = await ctx.readRow(table, id);
    Object.assign(step, read);
    if (read.status !== 'read') return fanOut(inst, n.id, 'failure', SIGNAL);
    for (const [k, v] of Object.entries(read.row)) fanOut(inst, n.id, `prop-${k}`, v);
    fanOut(inst, n.id, 'fetched', SIGNAL);
  }

  /** What made a node act, in words: the wire into it, followed back a few steps. */
  function triggerWords(inst, n) {
    const into = (id) => inst.comp.conns.filter((c) => c.toId === id);
    let frontier = into(n.id);
    for (let d = 0; d < 4 && frontier.length; d++) {
      for (const c of frontier) {
        const src = inst.comp.byId[c.fromId];
        if (!src) continue;
        if (inst.children[src.id]) return `${/^the /i.test(src.label ?? '') ? src.label.replace(/^The/, 'the') : `the ${src.label || 'part'}`}’s “${c.fromProperty}” signal`;
        if (c.fromProperty === 'didMount') return 'the page opening';
        if (src.type === 'Component Inputs') return `the ${inst.key.split('/').pop()} part being asked (“${c.fromProperty}”)`;
      }
      frontier = frontier.flatMap((c) => into(c.fromId));
    }
    return 'the page opening';
  }

  const root = makeInstance(pageKey);
  // Mount: the address's values, then every "did mount", then each Query Records that runs by itself on opening.
  const mount = (inst) => {
    for (const n of inst.comp.nodes) {
      if (n.type === 'PageInputs') for (const [k, v] of Object.entries(pageParams ?? {})) fanOut(inst, n.id, `pm-${k}`, v);
    }
    for (const n of inst.comp.nodes) if (inst.comp.conns.some((c) => c.fromId === n.id && c.fromProperty === 'didMount')) fanOut(inst, n.id, 'didMount', SIGNAL);
    for (const n of inst.comp.nodes) {
      if (n.type === 'DbCollection2' && !hasFetchWire(inst, n) && !qpWires(inst, n).length) queue.push(() => query(inst, n, 'the page opening'));
    }
    for (const c of Object.values(inst.children)) mount(c);
  };
  mount(root);
  while (queue.length) {
    if (++events > MAX_EVENTS) {
      notes.push('The page’s logic kept going past what the tool follows; it stopped there.');
      break;
    }
    await queue.shift()();
  }
  return { root, instances, touches, navigations, notes };
}

/* ------------------------------------------------------------------ the route */

/** The buttons a person can see on a played page that take them to another page, in the order they sit. */
function waysOn(app, played) {
  const out = [];
  for (const inst of played.instances) {
    for (const n of inst.comp.nodes) {
      if (!/button/i.test(n.type)) continue;
      const nav = inst.comp.conns
        .filter((c) => c.fromId === n.id && c.fromProperty === 'onClick')
        .map((c) => inst.comp.byId[c.toId])
        .find((t) => t?.type === 'RouterNavigate');
      if (!nav) continue;
      const shown = isShown(inst, n);
      out.push({ label: n.parameters?.label || n.label, target: strip(nav.parameters?.target ?? ''), shown, part: inst.key });
    }
  }
  return out;
}

/** Whether a node is on the screen: it and every part it sits in are mounted, as the page's logic left them. */
function isShown(inst, n) {
  for (let node = n; node; node = node.parent ? inst.comp.byId[node.parent] : null) {
    const wired = inst.inputs[node.id]?.mounted;
    if (wired !== undefined ? wired !== true : node.parameters?.mounted === false) return false;
  }
  return inst.parent ? isShown(inst.parent, inst.parent.comp.byId[inst.parentNodeId]) : true;
}

/** A list on a page whose row opens another page with the row's id: For Each → template → RouterNavigate pm-*. */
function detailOf(app, played, step) {
  for (const inst of played.instances) {
    for (const fe of inst.comp.nodes.filter((n) => n.type === 'For Each')) {
      const fedBy = inst.comp.conns.find((c) => c.toId === fe.id && c.toProperty === 'items');
      const src = fedBy && inst.comp.byId[fedBy.fromId];
      if (!src || src.parameters?.collectionName !== step.table || src.label !== step.node) continue;
      const tpl = app.comps[strip(fe.parameters?.template ?? '')];
      const nav = tpl?.nodes.find((n) => n.type === 'RouterNavigate');
      const pm = tpl?.conns.find((c) => c.toId === nav?.id && c.toProperty.startsWith('pm-'));
      const button = tpl?.conns.find((c) => c.toId === nav?.id && c.toProperty === 'navigate');
      const btn = button && tpl.byId[button.fromId];
      if (nav && pm) return { target: strip(nav.parameters.target), param: pm.toProperty.slice(3), press: btn?.parameters?.label || btn?.label || 'a row' };
    }
  }
  return null;
}

/** What a page offers that changes data, with whether the backend would let this person do it. Never pressed. */
async function wouldChange(app, pageKey, ctx, played) {
  const a = app.analysis;
  const out = [];
  // whether the button is on their screen: found by its label among the page's played parts
  const shownFor = (words) => {
    const label = words.match(/“(.+)”/)?.[1];
    if (!label) return null;
    for (const inst of played.instances) {
      const n = inst.comp.nodes.find((x) => (x.parameters?.label ?? x.label) === label && /button|checkbox/i.test(x.type));
      if (n) return isShown(inst, n);
    }
    return null;
  };
  for (const c of a.calls.filter((x) => x.screen === pageKey && x.trigger.kind === 'press')) {
    const f = a.functions.find((x) => x.name === c.fn);
    const safe = runnable(f, ctx.toolOf?.[c.fn]);
    if (safe.ok) continue;
    const writes = (f?.touches ?? []).filter((t) => t.hows.some((h) => ['creates', 'changes', 'deletes'].includes(h)));
    out.push({ how: `${c.trigger.words} runs ${c.fn}`, touches: writes.map((t) => `${t.hows.filter((h) => h !== 'reads').join(' and ')} ${t.table}`).join('; ') || 'what its description says', allowed: ctx.toolOf ? !!ctx.toolOf[c.fn] : null, shown: shownFor(c.trigger.words), why: safe.why });
  }
  for (const u of a.uses.filter((x) => x.screen === pageKey && x.how !== 'reads')) {
    const op = { creates: 'create', changes: 'update', deletes: 'delete' }[u.how];
    out.push({ how: `${u.trigger.words} ${u.how === 'creates' ? 'adds a row to' : u.how === 'deletes' ? 'removes a row of' : 'changes a row of'} ${u.table}`, touches: `${u.how} ${u.table}`, allowed: await ctx.mayDo(u.table, op), shown: shownFor(u.trigger.words), why: 'it changes data, so the tool never presses it' });
  }
  return out;
}

/**
 * The whole day for one person. Returns { person, pages: [{ page, title, signedIn, arrivedBy, touches, offers, … }] }.
 * `be` is the kit's backend client (admin credential, kept in the server), `project` the kit's openProject.
 */
export async function playDay({ be, project, world, personId, emit = () => {} }) {
  const w = await world();
  const u = (w.rowsByTable._User ?? []).find((x) => x.objectId === personId);
  if (!u) throw new Error('No such person in the backend.');
  const app = readApp(project);
  app.analysis = analyseProject(project, w.schema.tables.map((t) => t.name));
  const fnByName = Object.fromEntries(app.analysis.functions.map((f) => [f.name, f]));
  const index = w.index;
  const base = { userId: u.objectId };
  const person = { id: u.objectId, email: u.email ?? null, roles: u.roles ?? [], groups: groupWords(u.roles ?? []), ...displayName(u, w) };
  const tableRule = (t) => words.ruleWords(words.tableRule(w.config, t).permissions.find);

  const check = async (principal, table, op, record) => {
    try {
      return await be.post('/admin/permissions/check', { principal, collection: table, op, ...(record ? { record } : {}) });
    } catch (e) {
      return { allowed: false, reason: e.message };
    }
  };

  /** The rows of a table the backend's rule check lets this principal read, row by row (as the suite asks). */
  const readRows = async (principal, table) => {
    if (!w.schema.tables.some((t) => t.name === table)) return { status: 'no-table', why: `the backend has no ${table} table yet` };
    const all = (w.rowsByTable[table] ?? []).slice(0, 200);
    const whole = await check(principal, table, 'find');
    const rowsData = [];
    for (const row of all) {
      const r = await check(principal, table, 'find', row);
      if (r?.narrow) return { status: 'narrow', why: 'a rule decides row by row from the request’s path, which the backend’s check can’t answer one row at a time', rowsData: [] };
      if (r?.allowed && r.recordAllowed !== false) rowsData.push(row);
    }
    if (!rowsData.length && !whole.allowed) return { status: 'refused', why: `the backend’s rule for ${table}: reading is for ${tableRule(table).replace(/^The/, 'the')}`, reason: whole.reason ?? '', rowsData: [] };
    return { status: 'read', rowsData, total: all.length, rule: tableRule(table) };
  };

  return asPerson(be).withKey(u, async (k) => {
    const tools = await k.tools();
    const toolOf = Object.fromEntries(tools.map((t) => [t.name, t]));
    let signedIn = false;
    const ctx = {
      toolOf,
      async callAs(fn, args) {
        if (!signedIn) {
          const call = w.config.functions?.[fn]?.call;
          return { status: 'not-run', why: `nobody is signed in yet, and no key can act as someone not signed in (who may call it: ${words.ruleWords(call ?? 'nobody')})` };
        }
        if (!toolOf[fn]) return { status: 'not-allowed', why: `the backend doesn’t let ${person.name} run ${fn} (who may: ${words.ruleWords(w.config.functions?.[fn]?.call ?? 'nobody')})`, rows: {} };
        const safe = runnable(fnByName[fn], toolOf[fn]);
        if (!safe.ok) return { status: 'not-run', why: safe.why };
        const r = await k.call(fn, args);
        if (!r.ok) return { status: 'refused', why: r.error, ms: r.ms, rows: {} };
        const found = rowsIn(r.value, index, base);
        const rows = Object.fromEntries(Object.entries(found).map(([t, ids]) => [t, [...ids]]));
        return { status: 'ran', value: r.value, ms: r.ms, rows, rowsData: Object.entries(rows).flatMap(([t, ids]) => ids.map((id) => ({ table: t, ...(w.rowsByTable[t]?.find((x) => x.objectId === id) ?? { objectId: id }) }))) };
      },
      readTable: (table) => readRows(signedIn ? { kind: 'user', userId: u.objectId } : { kind: 'anonymous' }, table),
      async readRow(table, id) {
        const row = (w.rowsByTable[table] ?? []).find((r) => r.objectId === id);
        if (!row) return { status: 'refused', why: `there is no ${table} row ${id}` };
        const r = await check(signedIn ? { kind: 'user', userId: u.objectId } : { kind: 'anonymous' }, table, 'get', row);
        if (!(r.allowed && r.recordAllowed !== false)) return { status: 'refused', why: `the backend’s rule for ${table}: getting a row is for ${words.ruleWords(words.tableRule(w.config, table).permissions.get)}` };
        return { status: 'read', row, rowsData: [row] };
      },
      mayDo: async (table, op) => !!(await check({ kind: 'user', userId: u.objectId }, table, op)).allowed
    };

    const pages = [];
    const visited = new Set();
    const visit = async (pageKey, { arrivedBy, params = null }) => {
      if (pages.length >= MAX_PAGES || !app.comps[pageKey]) return null;
      const played = await playPage(app, pageKey, params, ctx);
      const entry = {
        n: pages.length + 1,
        page: pageKey,
        title: app.pageTitle(pageKey),
        url: '/' + String(app.pageUrl(pageKey) ?? '').replace(/\{(\w+)\}/g, (_, p) => params?.[p] ?? `{${p}}`),
        signedIn,
        arrivedBy,
        touches: played.touches.map(clean),
        sentOn: played.navigations.map((x) => ({ target: x.target, title: app.pageTitle(x.target), by: x.label })),
        offers: signedIn ? await wouldChange(app, pageKey, ctx, played) : [],
        notes: played.notes
      };
      pages.push(entry);
      visited.add(pageKey + JSON.stringify(params ?? {}));
      emit({ type: 'page', page: entry });
      return { entry, played };
    };

    // 1. They arrive at the app's start page, not signed in yet.
    const start = app.startPage;
    const first = await visit(start, { arrivedBy: 'opening the app' });
    // 2. They sign in: the page with a Log In node, reached by the button that leads there.
    const signInPage = Object.values(app.comps).find((c) => c.key.startsWith('Pages/') && c.nodes.some((n) => n.type === 'net.noodl.user.LogIn'));
    let next = null;
    if (signInPage) {
      const button = first ? waysOn(app, first.played).find((b) => b.target === signInPage.key && b.shown) : null;
      await visit(signInPage.key, { arrivedBy: button ? `pressing “${button.label}”` : 'going to sign in' });
      const login = signInPage.nodes.find((n) => n.type === 'net.noodl.user.LogIn');
      const nav = signInPage.conns.filter((c) => c.fromId === login.id && c.fromProperty === 'done').map((c) => signInPage.byId[c.toId]).find((n) => n?.type === 'RouterNavigate');
      next = nav ? strip(nav.parameters.target) : null;
    }
    signedIn = true;
    if (!next) return { person, pages, tools: tools.map((t) => t.name), note: 'The app has no sign-in page the tool could find, so the day stops before signing in.' };

    // 3. Where signing in takes them, then each page the band's buttons lead to (only the buttons they can see),
    //    opening the first item of each list that opens a page of its own.
    const plan = [{ page: next, arrivedBy: `signing in as ${person.email}` }];
    while (plan.length && pages.length < MAX_PAGES) {
      const step = plan.shift();
      if (visited.has(step.page + JSON.stringify(step.params ?? {}))) continue;
      const v = await visit(step.page, step);
      if (!v) continue;
      // a page that sends them away when it opens (a refused reader sent to sign in): that's where they go next
      const away = v.played.navigations.find((x) => x.target && x.target !== step.page);
      if (away) {
        plan.unshift({ page: away.target, arrivedBy: `${step.title ?? app.pageTitle(step.page)} sending them on (“${away.label}”)`, params: Object.keys(away.params).length ? away.params : null });
        continue;
      }
      const detailFirst = [];
      for (const t of v.played.touches.filter((x) => x.kind === 'query' && x.rowsData?.length)) {
        const d = detailOf(app, v.played, t);
        if (d) detailFirst.push({ page: d.target, params: { [d.param]: t.rowsData[0].objectId }, arrivedBy: `pressing “${d.press}” on “${rowLabel(t.rowsData[0])}”, the first in the list` });
      }
      plan.unshift(...detailFirst);
      for (const b of waysOn(app, v.played)) {
        if (!b.shown || !b.target.startsWith('Pages/') || b.target === signInPage?.key || b.target === start) continue;
        if (plan.some((p) => p.page === b.target) || [...visited].some((x) => x.startsWith(b.target + '{'))) continue;
        plan.push({ page: b.target, arrivedBy: `pressing “${b.label}”` });
      }
    }
    // Over the whole day: each table, how many of its rows reached them, and on which page first.
    const got = {};
    for (const p of pages) {
      for (const t of p.touches) {
        for (const [table, ids] of Object.entries(t.rows ?? {})) {
          const g = (got[table] ??= { ids: new Set(), first: null });
          if (ids.length && !g.first) g.first = p.n;
          ids.forEach((id) => g.ids.add(id));
        }
      }
    }
    const tables = w.schema.tables
      .filter((t) => t.name !== '_User')
      .map((t) => ({ table: t.name, got: got[t.name]?.ids.size ?? 0, total: (w.rowsByTable[t.name] ?? []).length, firstPage: got[t.name]?.first ?? null, rule: tableRule(t.name) }));
    return { person, pages, tools: tools.map((t) => t.name), tables, at: new Date().toISOString() };
  });
}

/** A touch made ready for the page: rows by id, each with a label, and none of the raw values that aren't shown. */
function clean(t) {
  const out = { ...t };
  const data = t.rowsData ?? [];
  if (t.kind === 'function') out.rows = t.rows ?? {};
  else if (t.kind === 'query' || t.kind === 'record') out.rows = t.status === 'read' ? { [t.table]: data.map((r) => r.objectId) } : {};
  out.items = data.map((r) => ({ table: r.table ?? t.table, id: r.objectId, label: rowLabel(r), fields: Object.fromEntries(Object.entries(r).filter(([k, v]) => !['ACL', 'objectId', 'table', 'createdAt', 'updatedAt'].includes(k) && !/token|secret|password/i.test(k) && (typeof v !== 'object' || v === null)).map(([k, v]) => [k, typeof v === 'string' ? v.slice(0, 160) : v])) }));
  delete out.rowsData;
  delete out.row;
  return out;
}

/**
 * What the suite grades: each step the day shows, in order. A function run as them, or a table the page read
 * itself. A row opened by its id on a page of its own isn't a step here: the suite checks a table step against every
 * row the person may read, and that page reads one (the day still shows it).
 */
export function handedSteps(day) {
  const steps = [];
  for (const p of day.pages) {
    if (!p.signedIn) continue; // before signing in nobody can be graded as them
    for (const t of p.touches) {
      if (t.kind === 'function' && t.status !== 'not-run') steps.push({ fn: t.fn, args: t.args ?? {}, rows: t.rows ?? {} });
      if (t.kind === 'query' && !['narrow', 'no-table'].includes(t.status) && !t.allowedButFiltered) steps.push({ table: t.table, rows: t.rows ?? {} });
    }
  }
  return steps;
}
