/**
 * TPL-010 AC9 — the planner as a browser-only demo, for nodegx.io.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * ## Derived, never written twice
 *
 * The demo is **computed from `TPL010_COMPONENTS` when the template is generated**,
 * the way TPL-008's is (R9): one graph, two data layers. A change to a command, a
 * tile or a script reaches the demo on the next `npm run template:planner` without
 * anybody remembering to make it. What differs is exactly this, and the gate lists it:
 *
 * - **Every record write** (`NewDbModelProperties`, `SetDbModelProperties`,
 *   `DeleteDbModelProperties`) in `Commands/` becomes a `Function` with the same node
 *   id, the same fields on `in-<field>`, `run` for `store`, and `out-done` /
 *   `out-id` / `out-failure` for its outputs. It writes to this browser's `localStorage`.
 * - **`Logic/Planner data`** keeps its whole week-nav machinery and its interface (plus
 *   `reset`); its five queries become one `Function` that reads the same store. The
 *   collections, filters, sort orders and limits are read off the backend queries, so the
 *   demo asks for exactly what the template asks for.
 * - **`Pages/Sign in` is gone**, and `Pages/Week` loads the week when it mounts.
 * - **`Week/App bar`'s Sign out is Reset demo**, which puts the example week back.
 * - A line under the app bar says it is a demo whose data stays in the browser.
 *
 * 🔴 Anything the transform does not recognise — a record node with a port it has not
 * mapped, a query outside `Logic/Planner data`, a page wire it expected and did not
 * find — **throws**. A demo that silently kept a backend node would load clean and
 * save nothing.
 *
 * ## The example week
 *
 * The seed is the approved mockup's invented week (`tpl-010-mockups/envelopes-b.html`):
 * invented clients, invented figures, no real income anywhere (the sanitisation rule on
 * the board). It is dated **relative to the visit** — the story's Wednesday is whatever
 * day you arrive on — so the week always reads as a week in progress: days behind you
 * logged, today half done, the rest planned.
 *
 * @module noodl-mcp/tests/tpl010Demo
 */
import { C, LOAD_PROBLEM_TEXT, PROBLEM_TEXT, signalOnly, TPL010_COMPONENTS, Tpl010Component } from './tpl010Components';
import { composition } from './tpl010Theme';

export const DEMO_STORAGE_KEY = 'nodegx-planner-demo-v1';
export const DEMO_PROBLEM_TEXT = 'That change did not save in this browser. Try again, or reset the demo.';
export const DEMO_LOAD_PROBLEM_TEXT = 'The example week could not be read from this browser. Reset the demo to start again.';
export const DEMO_NOTICE =
  'This is a demo with an invented week in it. Nothing you change leaves this browser, and Reset demo puts the example week back.';
export const DEMO_RESET_LABEL = 'Reset demo';

const FUNCTION = 'JavaScriptFunction';
const CREATE = 'NewDbModelProperties';
const UPDATE = 'SetDbModelProperties';
const DELETE = 'DeleteDbModelProperties';
const QUERY = 'DbCollection2';

/** Node types the demo must not contain — the gate checks the artefact for every one. */
export const BACKEND_NODE_TYPES = [
  QUERY,
  CREATE,
  UPDATE,
  DELETE,
  'net.noodl.user.User',
  'net.noodl.user.LogIn',
  'net.noodl.user.LogOut',
  'net.noodl.user.SignUp'
] as const;

interface Node {
  id: string;
  type: string;
  label?: string;
  parent?: string;
  comment?: string;
  parameters?: Record<string, unknown>;
  ports?: Array<{ name: string; type: string; plug: string }>;
}
interface Wire {
  fromId: string;
  fromProperty: string;
  toId: string;
  toProperty: string;
}

const FIELD_NAME = /^[A-Za-z][A-Za-z0-9]*$/;

function source(componentPath: string): Tpl010Component {
  const found = TPL010_COMPONENTS.find((c) => `/${c.path}` === componentPath);
  if (!found) throw new Error(`tpl010Demo: no component ${componentPath} in TPL010_COMPONENTS`);
  return found;
}

/** The collections, read off the template's own queries and writes rather than listed again. */
function storeCollections(): string[] {
  const names = new Set<string>();
  for (const c of TPL010_COMPONENTS) {
    for (const n of c.nodes as Node[]) {
      if (n.type === QUERY || n.type === CREATE || n.type === UPDATE || n.type === DELETE) {
        const name = String(n.parameters?.collectionName ?? '');
        if (!name) throw new Error(`tpl010Demo: ${c.path} ${n.id} names no collection`);
        names.add(name);
      }
    }
  }
  return [...names].sort();
}

// ════════════════════════════════════════════════════════════════════════════
// The store
// ════════════════════════════════════════════════════════════════════════════

/**
 * Read and write the whole week as one JSON string. `localStorage` can throw (a private
 * window, blocked site data), so a copy on `window` keeps the demo working for the
 * length of the visit when it does.
 */
export const DEMO_STORE_FNS = `var DEMO_KEY = ${JSON.stringify(DEMO_STORAGE_KEY)};
function demoEmpty() { return ${JSON.stringify(Object.fromEntries(storeCollections().map((c) => [c, []])))}; }
function demoLoad() {
  var raw = null;
  try { raw = window.localStorage.getItem(DEMO_KEY); } catch (e) { raw = null; }
  if (raw === null && typeof window.__plannerDemo === 'string') raw = window.__plannerDemo;
  if (raw === null) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}
function demoSave(store) {
  var raw = JSON.stringify(store);
  window.__plannerDemo = raw;
  try { window.localStorage.setItem(DEMO_KEY, raw); } catch (e) {}
}
`;

/** One record write, as a Function. `fields` are the record fields wired into it, in wire order. */
export function demoWriteScript(kind: 'create' | 'update' | 'delete', collection: string, fields: string[]): string {
  for (const f of fields) if (!FIELD_NAME.test(f)) throw new Error(`tpl010Demo: "${f}" cannot be a Function input name`);
  const assign = fields.map((f) => `record.${f} = Inputs.${f};`).join('\n');
  const list = JSON.stringify(collection);
  if (kind === 'create') {
    return `${DEMO_STORE_FNS}var store = demoLoad() || demoEmpty();
var list = store[${list}] || (store[${list}] = []);
var now = new Date().toISOString();
var record = { id: 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8), createdAt: now, updatedAt: now };
${assign}
list.push(record);
try { demoSave(store); } catch (e) { Outputs.failure(); return; }
Outputs.id = record.id;
Outputs.done();`;
  }
  if (kind === 'update') {
    return `${DEMO_STORE_FNS}var id = String(Inputs.modelId || '');
var store = demoLoad();
var list = (store && store[${list}]) || [];
var record = null;
for (var i = 0; i < list.length; i++) if (list[i] && list[i].id === id) record = list[i];
if (!record) { Outputs.failure(); return; }
${assign}
record.updatedAt = new Date().toISOString();
try { demoSave(store); } catch (e) { Outputs.failure(); return; }
Outputs.id = id;
Outputs.done();`;
  }
  // 🔴 R10 — `Block` is the only collection anything may delete, and the browser has no
  // policy to enforce that. The guard in the command is the only thing standing here, so
  // this refuses outright to delete out of any other collection rather than trusting it.
  return `${DEMO_STORE_FNS}var id = String(Inputs.modelId || '');
var store = demoLoad();
var list = (store && store[${list}]) || [];
var kept = [];
var found = false;
for (var i = 0; i < list.length; i++) {
  if (list[i] && list[i].id === id) { found = true; continue; }
  kept.push(list[i]);
}
if (!found) { Outputs.failure(); return; }
store[${list}] = kept;
try { demoSave(store); } catch (e) { Outputs.failure(); return; }
Outputs.id = id;
Outputs.done();`;
}

// ════════════════════════════════════════════════════════════════════════════
// Record writes → Functions
// ════════════════════════════════════════════════════════════════════════════

const WRITE_OUTPUTS = ['done', 'failure', 'id'];
const WRITE_TYPES: Record<string, 'create' | 'update' | 'delete'> = { [CREATE]: 'create', [UPDATE]: 'update', [DELETE]: 'delete' };

/** Every record write in one component becomes a browser write, at the same node id. */
function withBrowserWrites(c: Tpl010Component): Tpl010Component {
  const nodes = c.nodes as Node[];
  const wires = c.connections as Wire[];
  if (nodes.some((n) => n.type === QUERY) && `/${c.path}` !== C.plannerData) {
    throw new Error(`tpl010Demo: ${c.path} holds a query; only ${C.plannerData} may`);
  }

  const writes = new Map(nodes.filter((n) => WRITE_TYPES[n.type]).map((n) => [n.id, n]));
  if (writes.size === 0) return c;
  if (!c.path.startsWith('Commands/')) throw new Error(`tpl010Demo: ${c.path} writes records and is not a command`);
  const fields = new Map<string, string[]>([...writes.keys()].map((id) => [id, []]));
  const stored = new Set<string>();
  const addressed = new Set<string>();

  const rewired = wires.map((w) => {
    const into = writes.get(w.toId);
    if (into) {
      // 🔴 All three record nodes fire on `store`. Delete Record's `storageDelete` is the
      // method behind that port and not the port — the template says so, and the demo
      // refuses anything else rather than quietly accepting it.
      if (w.toProperty === 'store') {
        stored.add(w.toId);
        return { ...w, toProperty: 'run' };
      }
      if (w.toProperty === 'modelId') {
        if (WRITE_TYPES[into.type] === 'create') throw new Error(`tpl010Demo: ${c.path} ${w.toId} is a create with a modelId wire`);
        addressed.add(w.toId);
        return { ...w, toProperty: 'in-modelId' };
      }
      const m = /^prop-(.+)$/.exec(w.toProperty);
      if (!m) throw new Error(`tpl010Demo: ${c.path} ${w.toId}.${w.toProperty} is a record port the demo does not map`);
      const list = fields.get(w.toId) as string[];
      if (!list.includes(m[1])) list.push(m[1]);
      return { ...w, toProperty: `in-${m[1]}` };
    }
    if (writes.has(w.fromId)) {
      if (!WRITE_OUTPUTS.includes(w.fromProperty)) {
        throw new Error(`tpl010Demo: ${c.path} ${w.fromId}.${w.fromProperty} is a record output the demo does not map`);
      }
      return { ...w, fromProperty: `out-${w.fromProperty}` };
    }
    return w;
  });

  const rebuilt = nodes.map((n): Node => {
    if (n.type === 'Set Variable' && n.parameters?.value === PROBLEM_TEXT) {
      return { ...n, parameters: { ...n.parameters, value: DEMO_PROBLEM_TEXT } };
    }
    const write = writes.get(n.id);
    if (!write) return n;
    const params = write.parameters ?? {};
    const collection = String(params.collectionName ?? '');
    const kind = WRITE_TYPES[write.type];
    if (!collection) throw new Error(`tpl010Demo: ${c.path} ${n.id} names no collection`);
    if (!stored.has(n.id)) throw new Error(`tpl010Demo: ${c.path} ${n.id} is never told to store`);
    if (kind === 'update' && (params.idSource !== 'explicit' || !addressed.has(n.id))) {
      throw new Error(`tpl010Demo: ${c.path} ${n.id} is an update without an explicit, wired id`);
    }
    if (kind === 'delete' && !addressed.has(n.id)) throw new Error(`tpl010Demo: ${c.path} ${n.id} is a delete with no wired id`);
    const written = fields.get(n.id) as string[];
    if (kind === 'delete' && written.length > 0) throw new Error(`tpl010Demo: ${c.path} ${n.id} is a delete with fields wired into it`);
    const ins = [...written, ...(kind === 'create' ? [] : ['modelId'])];
    return {
      id: n.id,
      type: FUNCTION,
      label: `${write.label ?? n.id}, in this browser`,
      parameters: {
        functionScript: demoWriteScript(kind, collection, written),
        ...signalOnly(...ins.map((f) => `in-${f}`))
      }
    };
  });

  return { ...c, nodes: rebuilt, connections: rewired };
}

// ════════════════════════════════════════════════════════════════════════════
// Logic/Planner data, reading the store
// ════════════════════════════════════════════════════════════════════════════

interface Rule {
  property: string;
  operator: string;
  input: string;
}
interface QueryShape {
  id: string;
  output: string;
  collection: string;
  sort?: { property: string; order: string };
  limit: number;
  rules: Rule[];
}

const COMPARE: Record<string, string> = {
  'equal to': '===',
  'greater than or equal to': '>=',
  'less than or equal to': '<='
};

/** What each backend query asks for, read off `Logic/Planner data` — so the demo follows it. */
export function backendQueries(): QueryShape[] {
  const data = source(C.plannerData);
  const nodes = data.nodes as Node[];
  const wires = data.connections as Wire[];
  const outNode = nodes.find((n) => n.type === 'Component Outputs');
  return nodes
    .filter((n) => n.type === QUERY)
    .map((n) => {
      const p = n.parameters ?? {};
      const toOut = wires.filter((w) => w.fromId === n.id && w.fromProperty === 'items' && w.toId === outNode?.id);
      if (toOut.length !== 1) throw new Error(`tpl010Demo: query ${n.id} feeds ${toOut.length} outputs, expected 1`);
      const sort = (p.visualSort as Array<{ property: string; order: string }> | undefined) ?? [];
      if (sort.length > 1) throw new Error(`tpl010Demo: query ${n.id} sorts by ${sort.length} fields, expected at most 1`);
      const filter = p.visualFilter as { combinator?: string; rules?: Rule[] } | undefined;
      const rules = filter?.rules ?? [];
      if (rules.length && (filter?.combinator ?? 'and') !== 'and') throw new Error(`tpl010Demo: query ${n.id} combines its rules with or`);
      for (const r of rules) {
        if (!COMPARE[r.operator]) throw new Error(`tpl010Demo: query ${n.id} filters with "${r.operator}", which the demo cannot follow`);
        if (!FIELD_NAME.test(r.input)) throw new Error(`tpl010Demo: query ${n.id} filters on "${r.input}", which cannot be a Function input`);
      }
      const limit = Number(p.storageLimit);
      if (!isFinite(limit) || limit <= 0) throw new Error(`tpl010Demo: query ${n.id} has no limit; every query in this template carries one`);
      return { id: n.id, output: toOut[0].toProperty, collection: String(p.collectionName), sort: sort[0], limit, rules };
    });
}

/**
 * The example week a visitor starts with, dated relative to their visit.
 *
 * It is the approved mockup's week: four earning projects, three building ones, the admin
 * envelope, one hobby and four dormant clients worth a nudge — **all invented**, and so are
 * the figures. The story's Wednesday is whatever day the visitor arrives on, so the week
 * always reads mid-flight: behind you logged, today in progress, ahead of you planned.
 */
export const DEMO_SEED_FNS = String.raw`function demoSeed() {
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function key(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function plus(d, n) { var x = new Date(d.getTime()); x.setDate(x.getDate() + n); x.setHours(0, 0, 0, 0); return x; }
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  var dow = (today.getDay() + 6) % 7;
  var todayCol = dow > 5 ? 5 : dow;
  var monday = plus(today, -dow);
  var cols = [];
  for (var i = 0; i < 6; i++) cols.push(key(plus(monday, i)));
  function due(days) { return key(plus(today, days)); }
  var stamp = new Date(monday.getTime()).toISOString();

  var pos = 0;
  function project(id, name, sub, kind, rate, move, worth, when, dueDays, stop, facts, history, say) {
    pos++;
    return {
      id: 'seed-' + id, name: name, sub: sub, kind: kind, rate: rate, slot: '', rung: '',
      move: move, moveWorth: worth, moveWhen: when, moveDue: dueDays === null ? '' : due(dueDays),
      moveStop: stop, facts: facts, history: history, say: say, position: pos,
      createdAt: stamp, updatedAt: stamp
    };
  }
  var projects = [
    project('bramble', 'Bramble & Co', 'Retainer, monthly, 14 h', 'earning', 80,
      'Offer the user-testing add-on they asked about', '+€700 / mo', 'Friday, on the call', 4, false,
      [['Slot', '1 of 3, filled'], ['Notice', '30 days, none given'], ['Last paid', 'on time'], ['Budget this month', '14 of 14 h']],
      [0, 0, 1120, 1120, 1120, 1120], 'Steady. The add-on is the cheapest €700 a month you will ever earn.'),
    project('northline', 'Northline Languages', 'Training days through a broker', 'earning', 80,
      'Ask for November dates while you are in the room', '+€1,120 in November', 'Thursday', 3, false,
      [['Broker cut', '30%'], ['Days this month', '1 done, 1 Thursday'], ['Pattern', '1 to 2 days a month']],
      [1120, 0, 560, 0, 560, 1120], 'The best-proven avenue. Every extra broker like this one is another slot.'),
    project('salon', 'Salon Collective', 'Hourly, at a cheap rate', 'earning', 18,
      'Propose a fixed €800 a month for maintenance and small features', '+€400 / mo', 'With the month-end invoice', 9, false,
      [['Slot', '2 of 3, half'], ['Rate against yours', '28%'], ['Hours this month', '22'], ['Decision', 'slow burner, review in December']],
      [400, 600, 500, 400, 400, 400], 'Kept on purpose. Flag it if it passes 25 hours in a month.'),
    project('uplift', 'Uplift', 'One-off consulting', 'earning', 65,
      'Ask whether the launch needs a testing pass', '€500 one-off', 'Wednesday, on the call', 2, false,
      [['Pattern', '€500 every few months'], ['Not a slot', 'counted when it lands']],
      [500, 0, 0, 500, 0, 0], 'Nice when it comes. Never plan around it.'),
    project('coaching', 'Coaching offer', 'Rung 2 to 3 of the learning brand', 'building', 0,
      'Send the email to the 500-person list', '+€1,800 / mo if three say yes', 'Wednesday, 30 min', 2, false,
      [['Invested', '5.5 h'], ['Returned', '€0'], ['Fills', 'slot 3 if it lands'], ['Next rung due', 'end of October']],
      [0, 0, 0, 0, 0, 5.5], 'The one that turns the builder years into money. Half an hour from sent.'),
    project('builder', 'Builder tool', 'An asset, rung 1, finished', 'building', 0,
      'Fixes only. It pays through the coaching offer, not by itself', '', '', null, true,
      [['Invested', '380 h'], ['Produced', 'the list and the coaching product'], ['Returned', '€0 direct']],
      [40, 45, 50, 55, 55, 6], 'Done is done. Every hour here now is an hour the coaching email does not get.'),
    project('practice', 'Practice group', 'Rung 4', 'building', 0,
      'Set up the first free weekly call', 'feeds the coaching offer', 'Friday, 2 h', 4, false,
      [['To start', '6 h, then 1 h a week'], ['Pays through', 'the paid tier'], ['Why', 'the part of the destination you care about']],
      [0, 0, 0, 0, 0, 0], 'Cheap to run, and it is the reason for the whole thing.'),
    project('admin', 'Admin', 'Invoices, email, tooling, asks', 'admin', 0,
      '', '', '', null, true,
      [['Rule', 'invoices count here, and so do asks to dormant clients']],
      [10, 9, 11, 8, 9, 7], 'Overhead. Keep it under 12 hours.'),
    project('jazz', 'The Jazz Room', 'A website for a friend', 'hobby', 0,
      'Ask if the fundraiser is happening. If it is, it becomes a slot candidate', '€2,000 / mo, only if funded', 'By the end of October', 30, false,
      [['Since April', '61 h'], ['Returned', '€0'], ['Decision', 'hobby, no review']],
      [12, 14, 10, 8, 8, 9], 'Evenings and weekends, or not at all. No guilt either way.'),
    project('meridian', 'Meridian Events', 'Ex fractional-CTO client', 'dormant', 0,
      'Offer a two-day systems audit before their autumn event', '€1,300 one-off', 'This week', 4, false,
      [['Last paid', 'March'], ['They still run', 'the autumn conference season'], ['Relationship', 'warm, ended on budget']],
      [4500, 4500, 0, 0, 0, 0], 'They know what you can do. One email, and it is a yes or a no.'),
    project('foundera', 'Founder A', 'Ex client who asked about a retainer', 'dormant', 0,
      'Send the fixed monthly offer: security review and release testing', '+€600 / mo', 'Monday, overdue', -1, false,
      [['They asked', '26 days ago'], ['Last paid', 'June'], ['Would fill', 'slot 3']],
      [800, 1200, 600, 0, 0, 0], 'They asked you. This is the easiest slot on the board and it is 26 days late.'),
    project('copperfield', 'Copperfield', 'Ex client who offered to promote you', 'dormant', 0,
      'Send her the one paragraph she can forward, with a date on it', 'training leads', 'This week, 20 min', 4, false,
      [['Offer made', '41 days ago'], ['Her network', 'operations leads'], ['Costs you', 'one paragraph']],
      [0, 2400, 2400, 0, 0, 0], 'Offers like this die of no concrete ask, not of bad will.'),
    project('nlelearn', 'Northline e-learning', 'A delivered project', 'dormant', 0,
      'Ask if module two is on their autumn plan', '€2,000 project', 'Thursday, same trip', 3, false,
      [['Delivered', 'July'], ['Natural next phase', 'a second module']],
      [0, 0, 2000, 2000, 0, 0], 'Same trip as the workshop. Ask in person.')
  ];

  var blocks = [];
  function block(id, date, what, planned, done, actual, isMove) {
    blocks.push({
      id: 'seed-block-' + blocks.length, projectId: 'seed-' + id, date: date, what: what,
      planned: planned, actual: actual === null ? '' : actual, done: done, isMove: isMove,
      todoTaskId: '', position: blocks.length + 1, createdAt: stamp, updatedAt: stamp
    });
  }

  // The month so far, before this week: the hours the envelopes have already spent.
  // Written day by day so that a visitor arriving on the 2nd sees a nearly empty month
  // and one arriving on the 27th sees a full one — both of which are true weeks.
  var quota = { billable: 38, building: 6, admin: 7, hobby: 14 };
  var rota = [
    ['bramble', 'billable', 'Retainer hours', 2],
    ['northline', 'billable', 'Course material', 3],
    ['salon', 'billable', 'Booking fixes', 2],
    ['builder', 'building', 'Fixes from the week before', 1.5],
    ['admin', 'admin', 'Email and invoices', 0.5],
    ['jazz', 'hobby', 'Gig listings', 2]
  ];
  var cursor = new Date(monday.getFullYear(), monday.getMonth(), 1);
  while (cursor.getTime() < monday.getTime()) {
    if (cursor.getDay() !== 0) {
      var spent = 0;
      for (var r = 0; r < rota.length; r++) {
        var row = rota[r];
        if (quota[row[1]] < row[3] || spent + row[3] > 7) continue;
        quota[row[1]] -= row[3];
        block(row[0], key(cursor), row[2], row[3], true, null, false);
        spent += row[3];
      }
    }
    cursor = plus(cursor, 1);
  }

  // This week, as the mockup tells it: a fixed invented week, Monday to Saturday. What the
  // visit decides is which column is today, and therefore how much of it is already logged.
  var week = [
    ['admin', -2, 'Invoice Salon Collective for last month', 0.25, true, null, false],
    ['bramble', -2, 'Security review, the login flow', 2, true, 2.5, false],
    ['northline', -2, 'Workshop prep', 1.5, true, null, false],
    ['coaching', -2, 'Draft the mailing-list email', 1.5, true, null, false],
    ['salon', -2, 'Booking bug', 1, true, null, false],
    ['admin', -2, 'Log the day and clear email', 0.5, true, null, false],
    ['bramble', -1, 'Security review, sessions', 2, true, null, false],
    ['salon', -1, 'Stylist profile page', 1.5, true, null, false],
    ['coaching', -1, 'One-page offer with a price on it', 1.5, true, 2.5, false],
    ['jazz', -1, 'Gig listings', 1, true, null, false],
    ['admin', -1, 'Email', 0.5, true, null, false],
    ['salon', 0, 'Stylist profile page', 1.5, true, null, false],
    ['bramble', 0, 'Write up the findings', 2, true, null, false],
    ['coaching', 0, 'Send the email to 500 people', 0.5, false, null, true],
    ['uplift', 0, 'Consulting call, the launch checklist', 1, false, null, false],
    ['admin', 0, 'Email', 0.5, false, null, false],
    ['northline', 1, 'AI workshop, on site, a full day', 7, false, null, false],
    ['bramble', 2, 'Retainer hours', 1.5, false, null, false],
    ['salon', 2, 'Payments bug', 2, false, null, false],
    ['practice', 2, 'Set up the first free call', 2, false, null, true],
    ['admin', 2, 'Month-end invoices, a draft', 0.5, false, null, false],
    ['jazz', 3, 'The site, if you feel like it', 2, false, null, false]
  ];
  for (var w = 0; w < week.length; w++) {
    var b = week[w];
    // The table is written around the story's Wednesday, which is column 2.
    var col = b[1] + 2;
    // Behind you it is logged, today is as the story has it, ahead of you it is a plan.
    var done = col < todayCol ? true : col === todayCol ? b[4] : false;
    block(b[0], cols[col], b[2], b[3], done, done ? b[5] : null, b[6]);
  }

  var eom = new Date(monday.getFullYear(), monday.getMonth() + 1, 0);
  var plan = {
    id: 'seed-plan', month: monday.getFullYear() + '-' + pad2(monday.getMonth() + 1),
    billable: 55, building: 16.25, admin: 12, hobby: 0, workingDays: 25, openingBalance: 3200,
    createdAt: stamp, updatedAt: stamp
  };

  function cash(id, date, amount, label, kind, recurring) {
    return { id: 'seed-cash-' + id, date: date, amount: amount, label: label, kind: kind, recurring: recurring, createdAt: stamp, updatedAt: stamp };
  }
  var cashEvents = [
    cash('partner', key(new Date(monday.getFullYear(), monday.getMonth(), 28)), 1500, 'Partner’s contract', 'in', 'monthly'),
    cash('invoices', key(eom), 0, 'Invoices go out', 'note', ''),
    cash('household', key(new Date(monday.getFullYear(), monday.getMonth() + 1, 1)), -4500, 'Household costs', 'cost', 'monthly'),
    cash('due', key(new Date(monday.getFullYear(), monday.getMonth() + 1, 7)), 3400, 'Last month’s invoices due', 'in', '')
  ];

  var settings = {
    id: 'seed-settings', rate: 70, householdNeed: 5000, partnerIncome: 1200, focusHours: 6,
    partnerDay: 28, costsDay: 1, invoiceDay: 28, paymentTermsDays: 7, openingBalance: 3200,
    createdAt: stamp, updatedAt: stamp
  };

  return { Project: projects, Block: blocks, MonthPlan: [plan], CashEvent: cashEvents, Settings: [settings] };
}
`;

function readScript(queries: QueryShape[]): string {
  const inputs = [...new Set(queries.flatMap((q) => q.rules.map((r) => r.input)))];
  const reads = inputs.map((name) => `var ${name} = String(Inputs.${name} || '');`);
  const lines = queries.map((q) => {
    const filtered = q.rules.length
      ? `copy(store.${q.collection}).filter(function (r) { return ${q.rules
          .map((r) => `String(r.${r.property}) ${COMPARE[r.operator]} ${r.input}`)
          .join(' && ')}; })`
      : `copy(store.${q.collection})`;
    const sorted = q.sort ? `sortBy(${filtered}, ${JSON.stringify(q.sort.property)}, ${JSON.stringify(q.sort.order)})` : filtered;
    // A filter whose value has not arrived is a query the backend never runs.
    const guard = q.rules.length ? `${q.rules.map((r) => `${r.input} === ''`).join(' || ')} ? [] : ` : '';
    return `Outputs.${q.output} = ${guard}${sorted}.slice(0, ${q.limit});`;
  });
  const collections = [...new Set(queries.map((q) => q.collection))];
  return `${DEMO_STORE_FNS}${DEMO_SEED_FNS}function copy(list) {
  var out = [];
  for (var i = 0; i < (list || []).length; i++) {
    var r = {};
    for (var k in list[i]) r[k] = list[i][k];
    out.push(r);
  }
  return out;
}
function sortBy(list, field, order) {
  return list.sort(function (a, b) {
    var x = a[field], y = b[field];
    var c = x < y ? -1 : x > y ? 1 : 0;
    return order === 'descending' ? -c : c;
  });
}
var store = demoLoad();
var whole = !!store;
${collections.map((c) => `if (!store || !store.${c}) whole = false;`).join('\n')}
if (!whole) {
  store = demoSeed();
  try { demoSave(store); } catch (e) { Outputs.failure(); }
}
${reads.join('\n')}
${lines.join('\n')}
Outputs.loaded();`;
}

export const DEMO_READ_SCRIPT = readScript(backendQueries());

export const DEMO_RESET_SCRIPT = `window.__plannerDemo = null;
try { window.localStorage.removeItem(${JSON.stringify(DEMO_STORAGE_KEY)}); } catch (e) {}
Outputs.done();`;

/**
 * The five queries become one Function; everything else about this component — the week
 * variable, the two arrows, the window, the Condition that guards the read — is the
 * template's own, so the demo moves through the weeks exactly the way the app does.
 */
function demoPlannerData(): Tpl010Component {
  const src = source(C.plannerData);
  const nodes = src.nodes as Node[];
  const wires = src.connections as Wire[];
  const queries = backendQueries();
  const queryIds = new Set(queries.map((q) => q.id));
  const byId = new Map(queries.map((q) => [q.id, q]));
  const inNode = nodes.find((n) => n.type === 'Component Inputs');
  if (!inNode) throw new Error('tpl010Demo: Logic/Planner data has no Component Inputs');
  const ins = [...(src.inputs ?? []), { name: 'reset', type: 'signal' }];
  const filterInputs = [...new Set(queries.flatMap((q) => q.rules.map((r) => r.input)))];

  const kept = nodes
    .filter((n) => !queryIds.has(n.id))
    .map((n): Node => {
      if (n.id === inNode.id) return { ...n, ports: ins.map((p) => ({ name: p.name, type: String(p.type), plug: 'output' })) };
      if (n.type === 'Set Variable' && n.parameters?.value === LOAD_PROBLEM_TEXT) {
        return { ...n, parameters: { ...n.parameters, value: DEMO_LOAD_PROBLEM_TEXT } };
      }
      return n;
    });

  const seen = new Set<string>();
  const rewired: Wire[] = [];
  const add = (w: Wire): void => {
    const k = `${w.fromId}.${w.fromProperty}>${w.toId}.${w.toProperty}`;
    if (seen.has(k)) return;
    seen.add(k);
    rewired.push(w);
  };
  for (const w of wires) {
    if (queryIds.has(w.toId)) {
      if (w.toProperty === 'storageFetch') add({ ...w, toId: 'pnRead', toProperty: 'run' });
      else {
        const m = /^qp-(.+)$/.exec(w.toProperty);
        if (!m) throw new Error(`tpl010Demo: ${w.toId}.${w.toProperty} is a query port the demo does not map`);
        add({ ...w, toId: 'pnRead', toProperty: `in-${m[1]}` });
      }
      continue;
    }
    if (queryIds.has(w.fromId)) {
      if (w.fromProperty === 'items') add({ ...w, fromId: 'pnRead', fromProperty: `out-${(byId.get(w.fromId) as QueryShape).output}` });
      else if (w.fromProperty === 'fetched') add({ ...w, fromId: 'pnRead', fromProperty: 'out-loaded' });
      else if (w.fromProperty === 'failure') add({ ...w, fromId: 'pnRead', fromProperty: 'out-failure' });
      else throw new Error(`tpl010Demo: ${w.fromId}.${w.fromProperty} is a query output the demo does not map`);
      continue;
    }
    add(w);
  }
  add({ fromId: inNode.id, fromProperty: 'reset', toId: 'pnForget', toProperty: 'run' });
  add({ fromId: 'pnForget', fromProperty: 'out-done', toId: 'pnRead', toProperty: 'run' });

  return {
    ...src,
    description:
      'The example week, read from this browser’s storage — the first time, it puts the example week there. The arrows move the window the same way they do in the app; Reset puts the example week back.',
    inputs: ins,
    nodes: [
      ...kept,
      {
        id: 'pnRead',
        type: FUNCTION,
        label: 'Read the week from this browser',
        parameters: { functionScript: DEMO_READ_SCRIPT, ...signalOnly(...filterInputs.map((n) => `in-${n}`)) }
      },
      { id: 'pnForget', type: FUNCTION, label: 'Forget this browser’s week', parameters: { functionScript: DEMO_RESET_SCRIPT } }
    ],
    connections: rewired
  };
}

// ════════════════════════════════════════════════════════════════════════════
// The app bar and the page
// ════════════════════════════════════════════════════════════════════════════

/** Sign out becomes Reset demo — the only button on the bar that has no meaning here. */
function demoAppBar(): Tpl010Component {
  const src = source(C.appBar);
  const rename = (name: string) => (name === 'signOut' ? 'reset' : name);
  const nodes = (src.nodes as Node[]).map((n): Node => {
    if (n.type === 'Component Outputs') return { ...n, ports: n.ports?.map((p) => ({ ...p, name: rename(p.name) })) };
    if (n.id === 'abSignOut') return { ...n, id: 'abReset', label: DEMO_RESET_LABEL, parameters: { ...n.parameters, label: DEMO_RESET_LABEL } };
    return n;
  });
  if (!nodes.some((n) => n.id === 'abReset')) throw new Error('tpl010Demo: Week/App bar has no Sign out button to turn into Reset demo');
  const connections = (src.connections as Wire[]).map((w) =>
    w.fromId === 'abSignOut' ? { ...w, fromId: 'abReset', toProperty: rename(w.toProperty) } : w
  );
  return {
    ...src,
    description:
      'The top line: the app’s name, which week is on screen with an arrow either side, and the buttons for projects, settings, theme, shutting down and putting the example week back.',
    outputs: src.outputs?.map((p) => ({ ...p, name: rename(p.name) })),
    nodes,
    connections
  };
}

/** The page's sign-in machinery, which the demo has no use for. Named, so drift throws. */
const PAGE_AUTH_NODES = ['twUser', 'twAuth', 'twToSignIn', 'twLogOut'];
const PAGE_AUTH_WIRES = 6;

function demoPage(): Tpl010Component {
  const src = withBrowserWrites(source(C.pageWeek));
  const nodes = src.nodes as Node[];
  for (const id of PAGE_AUTH_NODES) if (!nodes.some((n) => n.id === id)) throw new Error(`tpl010Demo: Pages/Week has no ${id}`);
  const wires = src.connections as Wire[];
  const auth = (w: Wire) => PAGE_AUTH_NODES.includes(w.fromId) || PAGE_AUTH_NODES.includes(w.toId);
  const dropped = wires.filter(auth);
  if (dropped.length !== PAGE_AUTH_WIRES) {
    throw new Error(`tpl010Demo: Pages/Week has ${dropped.length} sign-in wires, expected ${PAGE_AUTH_WIRES}: ${JSON.stringify(dropped)}`);
  }

  const notice: Node = {
    id: 'twDemoNotice',
    type: 'Text',
    label: 'It is a demo',
    parent: 'twRoot',
    parameters: { text: DEMO_NOTICE, ...composition('meta'), sizeMode: 'contentHeight', width: { value: 100, unit: '%' } }
  };
  const kept = nodes
    .filter((n) => !PAGE_AUTH_NODES.includes(n.id))
    .map((n) => (n.id === 'twData' ? { ...n, label: 'Your week, kept in this browser' } : n));
  const barAt = kept.findIndex((n) => n.id === 'twBar');
  if (barAt < 0) throw new Error('tpl010Demo: Pages/Week has no twBar to put the notice under');
  kept.splice(barAt + 1, 0, notice);

  return {
    ...src,
    description:
      'The demo week: the envelopes, the moves, six days of blocks and the cash strip, all kept in this browser, with the projects card and the evening drawer over the top of it.',
    instantiates: (src.instantiates ?? []).filter((n) => n !== C.pageSignIn),
    nodes: kept,
    connections: [
      // The week loads itself when the page opens; there is nobody to sign in.
      { fromId: 'twPage', fromProperty: 'didMount', toId: 'twData', toProperty: 'thisWeek' },
      ...wires.filter((w) => !auth(w)),
      { fromId: 'twBar', fromProperty: 'reset', toId: 'twData', toProperty: 'reset' },
      { fromId: 'twBar', fromProperty: 'reset', toId: 'twClearCard', toProperty: 'do' }
    ]
  };
}

// ════════════════════════════════════════════════════════════════════════════
// The demo, in the order the plan is given
// ════════════════════════════════════════════════════════════════════════════

/** Components whose graph the demo changes. Every other component is the template's, unchanged. */
export const DEMO_CHANGED = new Set<string>();

export const TPL010_DEMO_COMPONENTS: ReadonlyArray<Tpl010Component> = TPL010_COMPONENTS.filter(
  (c) => `/${c.path}` !== C.pageSignIn
).map((c) => {
  const name = `/${c.path}`;
  let out: Tpl010Component;
  if (name === C.plannerData) out = demoPlannerData();
  else if (name === C.appBar) out = demoAppBar();
  else if (name === C.pageWeek) out = demoPage();
  else out = withBrowserWrites(c);
  if (JSON.stringify(out) !== JSON.stringify(c)) DEMO_CHANGED.add(name);
  return out;
});
