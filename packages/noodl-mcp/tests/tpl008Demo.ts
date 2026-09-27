/**
 * TPL-008 AC10 — the todo list as a browser-only demo, for nodegx.io (Richard's R9).
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * ## Derived, never written twice
 *
 * R9 asks for *"a second data layer, to be kept in step with the backend one"*. The way
 * to keep two graphs in step is to have one: **every component here is computed from
 * `TPL008_COMPONENTS` when the template is generated**, so a change to a command, a
 * row or a script reaches the demo on the next `npm run template:todo` without anybody
 * remembering to make it. What differs is exactly this, and the demo gate lists it:
 *
 * - **Every record write** (`NewDbModelProperties` / `SetDbModelProperties`) in
 *   `Commands/` and `Logic/Write history` becomes a `Function` with the same node id,
 *   the same fields on `in-<field>`, `run` for `store`, and `out-done` / `out-id` /
 *   `out-failure` for its outputs. It writes to this browser's `localStorage`.
 * - **`Logic/Todo data`** keeps its interface (plus `reset`) and reads the same store.
 *   Its collections, sort orders, filter and limits are read off the backend queries,
 *   and it puts the example list in the store the first time it finds none.
 * - **`Pages/Sign in` is gone**, and `Pages/Todo` loads the list when it mounts.
 * - **`Todo/Header`'s Sign out is Reset demo**, which puts the example list back.
 * - A line under the header says it is a demo whose data stays in the browser.
 *
 * 🔴 Anything the transform does not recognise — a record node with a port it has not
 * mapped, a query outside `Logic/Todo data`, a page wire it expected and did not find —
 * **throws**. A demo that silently kept a backend node would load clean and save nothing.
 *
 * @module noodl-mcp/tests/tpl008Demo
 */
import {
  C,
  DATE_FNS,
  PROBLEM_TEXT,
  signalOnly,
  TPL008_COMPONENTS,
  Tpl008Component,
  VAR
} from './tpl008Components';
import { composition } from './tpl008Theme';

export const DEMO_STORAGE_KEY = 'nodegx-todo-list-demo-v1';
export const DEMO_PROBLEM_TEXT = 'That change did not save in this browser. Try again, or reset the demo.';
export const DEMO_LOAD_PROBLEM_TEXT = 'The demo list could not be read from this browser. Reset the demo to start again.';
export const DEMO_NOTICE = 'This is a demo. Nothing you type leaves this browser, and Reset demo puts the example list back.';
export const DEMO_RESET_LABEL = 'Reset demo';

const FUNCTION = 'JavaScriptFunction';
const CREATE = 'NewDbModelProperties';
const UPDATE = 'SetDbModelProperties';
const QUERY = 'DbCollection2';

/** Node types the demo must not contain — the gate checks the artefact for every one. */
export const BACKEND_NODE_TYPES = [
  QUERY,
  CREATE,
  UPDATE,
  'DeleteDbModelProperties',
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

function source(componentPath: string): Tpl008Component {
  const found = TPL008_COMPONENTS.find((c) => `/${c.path}` === componentPath);
  if (!found) throw new Error(`tpl008Demo: no component ${componentPath} in TPL008_COMPONENTS`);
  return found;
}

// ════════════════════════════════════════════════════════════════════════════
// The store
// ════════════════════════════════════════════════════════════════════════════

/**
 * Read and write the whole list as one JSON string. `localStorage` can throw (a private
 * window, blocked site data), so a copy on `window` keeps the demo working for the
 * length of the visit when it does.
 */
export const DEMO_STORE_FNS = `var DEMO_KEY = ${JSON.stringify(DEMO_STORAGE_KEY)};
function demoLoad() {
  var raw = null;
  try { raw = window.localStorage.getItem(DEMO_KEY); } catch (e) { raw = null; }
  if (raw === null && typeof window.__todoListDemo === 'string') raw = window.__todoListDemo;
  if (raw === null) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}
function demoSave(store) {
  var raw = JSON.stringify(store);
  window.__todoListDemo = raw;
  try { window.localStorage.setItem(DEMO_KEY, raw); } catch (e) {}
}
`;

/** One record write, as a Function. `fields` are the record fields wired into it, in wire order. */
export function demoWriteScript(kind: 'create' | 'update', collection: string, fields: string[]): string {
  for (const f of fields) if (!FIELD_NAME.test(f)) throw new Error(`tpl008Demo: "${f}" cannot be a Function input name`);
  const assign = fields.map((f) => `record.${f} = Inputs.${f};`).join('\n');
  const list = JSON.stringify(collection);
  if (kind === 'create') {
    return `${DEMO_STORE_FNS}var store = demoLoad() || { Task: [], Action: [], Event: [] };
var list = store[${list}] || (store[${list}] = []);
var now = new Date().toISOString();
var record = { id: 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8), createdAt: now, updatedAt: now };
${assign}
list.push(record);
try { demoSave(store); } catch (e) { Outputs.failure(); return; }
Outputs.id = record.id;
Outputs.done();`;
  }
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

// ════════════════════════════════════════════════════════════════════════════
// Record writes → Functions
// ════════════════════════════════════════════════════════════════════════════

const WRITE_OUTPUTS = ['done', 'failure', 'id'];

/** Every record write in one component becomes a browser write, at the same node id. */
function withBrowserWrites(c: Tpl008Component): Tpl008Component {
  const nodes = c.nodes as Node[];
  const wires = c.connections as Wire[];
  if (nodes.some((n) => n.type === QUERY)) throw new Error(`tpl008Demo: ${c.path} holds a query; only Logic/Todo data may`);

  const writes = new Map(nodes.filter((n) => n.type === CREATE || n.type === UPDATE).map((n) => [n.id, n]));
  const fields = new Map<string, string[]>([...writes.keys()].map((id) => [id, []]));
  const stored = new Set<string>();
  const addressed = new Set<string>();

  const rewired = wires.map((w) => {
    const into = writes.get(w.toId);
    if (into) {
      if (w.toProperty === 'store') {
        stored.add(w.toId);
        return { ...w, toProperty: 'run' };
      }
      if (w.toProperty === 'modelId') {
        if (into.type !== UPDATE) throw new Error(`tpl008Demo: ${c.path} ${w.toId} is a create with a modelId wire`);
        addressed.add(w.toId);
        return { ...w, toProperty: 'in-modelId' };
      }
      const m = /^prop-(.+)$/.exec(w.toProperty);
      if (!m) throw new Error(`tpl008Demo: ${c.path} ${w.toId}.${w.toProperty} is a record port the demo does not map`);
      const list = fields.get(w.toId) as string[];
      if (!list.includes(m[1])) list.push(m[1]);
      return { ...w, toProperty: `in-${m[1]}` };
    }
    if (writes.has(w.fromId)) {
      if (!WRITE_OUTPUTS.includes(w.fromProperty)) {
        throw new Error(`tpl008Demo: ${c.path} ${w.fromId}.${w.fromProperty} is a record output the demo does not map`);
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
    if (!collection) throw new Error(`tpl008Demo: ${c.path} ${n.id} names no collection`);
    if (!stored.has(n.id)) throw new Error(`tpl008Demo: ${c.path} ${n.id} is never told to store`);
    if (write.type === UPDATE && (params.idSource !== 'explicit' || !addressed.has(n.id))) {
      throw new Error(`tpl008Demo: ${c.path} ${n.id} is an update without an explicit, wired id`);
    }
    const kind = write.type === CREATE ? 'create' : 'update';
    const ins = [...(fields.get(n.id) as string[]), ...(kind === 'update' ? ['modelId'] : [])];
    return {
      id: n.id,
      type: FUNCTION,
      label: `${write.label ?? n.id}, in this browser`,
      parameters: {
        functionScript: demoWriteScript(kind, collection, fields.get(n.id) as string[]),
        ...signalOnly(...ins.map((f) => `in-${f}`))
      }
    };
  });

  return { ...c, nodes: rebuilt, connections: rewired };
}

// ════════════════════════════════════════════════════════════════════════════
// Logic/Todo data, reading the store
// ════════════════════════════════════════════════════════════════════════════

interface QueryShape {
  output: string;
  collection: string;
  sort: { property: string; order: string };
  limit: number;
  filter?: { property: string; input: string };
}

/** What each backend query asks for, read off the backend component — so the demo follows it. */
export function backendQueries(): QueryShape[] {
  const data = source(C.todoData);
  const nodes = data.nodes as Node[];
  const wires = data.connections as Wire[];
  const outNode = nodes.find((n) => n.type === 'Component Outputs');
  return nodes
    .filter((n) => n.type === QUERY)
    .map((n) => {
      const p = n.parameters ?? {};
      const toOut = wires.filter((w) => w.fromId === n.id && w.fromProperty === 'items' && w.toId === outNode?.id);
      if (toOut.length !== 1) throw new Error(`tpl008Demo: query ${n.id} feeds ${toOut.length} outputs, expected 1`);
      const sort = (p.visualSort as Array<{ property: string; order: string }> | undefined) ?? [];
      if (sort.length !== 1) throw new Error(`tpl008Demo: query ${n.id} sorts by ${sort.length} fields, expected 1`);
      const rules = ((p.visualFilter as { rules?: Array<{ property: string; operator: string; input: string }> } | undefined)?.rules) ?? [];
      if (rules.length > 1 || rules.some((r) => r.operator !== 'equal to')) {
        throw new Error(`tpl008Demo: query ${n.id} has a filter the demo cannot follow`);
      }
      return {
        output: toOut[0].toProperty,
        collection: String(p.collectionName),
        sort: sort[0],
        limit: Number(p.storageLimit),
        ...(rules.length ? { filter: { property: rules[0].property, input: rules[0].input } } : {})
      };
    });
}

/**
 * The example list a visitor starts with, dated relative to their visit: four tasks
 * added four days ago, one moved to the top, one given a deadline that has passed, one
 * closed with a note, and next actions on the first — one ticked with what happened.
 * Every history line says what the command that made it would have said.
 */
export const DEMO_SEED_FNS = String.raw`function demoSeed() {
  var DAY = 86400000, now = Date.now();
  function at(daysAgo, hour, minute) { var d = new Date(now - daysAgo * DAY); d.setHours(hour, minute, 0, 0); return d.toISOString(); }
  function iso(days) { var d = new Date(now + days * DAY); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function task(id, title, position, deadline, created) {
    return { id: id, title: title, position: position, status: 'open', deadline: deadline, closingNote: '', closedAt: '', createdAt: created, updatedAt: created };
  }
  function action(id, taskId, title, position, done, note, description, created) {
    return { id: id, taskId: taskId, title: title, position: position, done: done, note: note, description: description, createdAt: created, updatedAt: created };
  }
  var n = 0;
  function line(taskId, kind, summary, body, when) {
    n++;
    return { id: 'seed-event-' + n, taskId: taskId, kind: kind, summary: summary, body: body, at: when, createdAt: when, updatedAt: when };
  }
  var overdue = iso(-1);
  var tasks = [
    task('seed-task-notes', 'Write the release notes', 1, iso(1), at(4, 9, 12)),
    task('seed-task-mot', 'Book the van in for its MOT', 2, '', at(4, 9, 10)),
    task('seed-task-vat', 'Chase the accountant about VAT', 3, overdue, at(4, 9, 11)),
    task('seed-task-domain', 'Renew the domain', 4, '', at(4, 9, 14))
  ];
  tasks[3].status = 'done';
  tasks[3].closingNote = 'Renewed for two years at the same price.';
  tasks[3].closedAt = at(2, 16, 40);
  var actions = [
    action('seed-action-shipped', 'seed-task-notes', 'List what shipped', 1, true, 'Pulled it from the merged PRs.', '', at(1, 11, 0)),
    action('seed-action-lead', 'seed-task-notes', 'Lead with the templates', 2, false, '', 'Put the new templates first, then the fixes.', at(1, 11, 1)),
    action('seed-action-garage', 'seed-task-mot', 'Ring the garage for a Saturday slot', 1, false, '', '', at(1, 12, 0))
  ];
  var events = [
    line('seed-task-mot', 'created', 'Added at #1', '', at(4, 9, 10)),
    line('seed-task-vat', 'created', 'Added at #2', '', at(4, 9, 11)),
    line('seed-task-notes', 'created', 'Added at #3', '', at(4, 9, 12)),
    line('seed-task-domain', 'created', 'Added at #4', '', at(4, 9, 14)),
    line('seed-task-notes', 'moved', 'Moved #3 → #1', '', at(3, 10, 5)),
    line('seed-task-vat', 'deadline', 'Deadline set to ' + fmtDay(toDay(overdue)), '', at(3, 10, 20)),
    line('seed-task-domain', 'closed', 'Closed from #4', 'Renewed for two years at the same price.', at(2, 16, 40)),
    line('seed-task-notes', 'action-added', 'Next action added: “List what shipped”', '', at(1, 11, 0)),
    line('seed-task-notes', 'action-added', 'Next action added: “Lead with the templates”', '', at(1, 11, 1)),
    line('seed-task-notes', 'action-described', 'Description changed on “Lead with the templates”', '', at(1, 11, 2)),
    line('seed-task-mot', 'action-added', 'Next action added: “Ring the garage for a Saturday slot”', '', at(1, 12, 0)),
    line('seed-task-notes', 'action-done', 'Ticked off “List what shipped”', 'Pulled it from the merged PRs.', at(1, 14, 30)),
    line('seed-task-notes', 'note', 'Note', 'The draft is in the shared folder.', at(1, 15, 10))
  ];
  return { Task: tasks, Action: actions, Event: events };
}
`;

function readScript(queries: QueryShape[]): string {
  const outputs = queries.map((q) => {
    const sorted = `sortBy(copy(store.${q.collection})${q.filter ? `.filter(function (r) { return r.${q.filter.property} === filterValue; })` : ''}, ${JSON.stringify(q.sort.property)}, ${JSON.stringify(q.sort.order)})`;
    // A filtered query with nothing to filter on is one the backend never runs.
    return q.filter
      ? `Outputs.${q.output} = filterValue === '' ? [] : ${sorted}.slice(0, ${q.limit});`
      : `Outputs.${q.output} = ${sorted}.slice(0, ${q.limit});`;
  });
  const filters = [...new Set(queries.filter((q) => q.filter).map((q) => q.filter?.input))];
  if (filters.length > 1) throw new Error('tpl008Demo: the backend queries filter on more than one input');
  return `${DATE_FNS}${DEMO_STORE_FNS}${DEMO_SEED_FNS}function copy(list) {
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
if (!store || !store.Task || !store.Action || !store.Event) {
  store = demoSeed();
  try { demoSave(store); } catch (e) { Outputs.failure(); }
}
var filterValue = String(Inputs.${filters[0] ?? 'taskId'} || '');
${outputs.join('\n')}`;
}

export const DEMO_READ_SCRIPT = readScript(backendQueries());

export const DEMO_RESET_SCRIPT = `window.__todoListDemo = null;
try { window.localStorage.removeItem(${JSON.stringify(DEMO_STORAGE_KEY)}); } catch (e) {}
Outputs.done();`;

function demoTodoData(): Tpl008Component {
  const backend = source(C.todoData);
  const backendNodes = backend.nodes as Node[];
  const ins = [...(backend.inputs ?? []), { name: 'reset', type: 'signal' }];
  const outs = backend.outputs ?? [];
  const queries = backendQueries();
  const filterInput = queries.find((q) => q.filter)?.filter?.input ?? 'taskId';
  const selected = backendNodes.find((n) => n.type === 'Variable2');
  if (!selected) throw new Error('tpl008Demo: Logic/Todo data has no selection variable to read');
  const outId = backendNodes.find((n) => n.type === 'Component Outputs')?.id ?? 'dtOut';
  const inId = backendNodes.find((n) => n.type === 'Component Inputs')?.id ?? 'dtIn';

  return {
    path: backend.path,
    description:
      'Your tasks, next actions and history, read from this browser’s storage — the first time, it puts the example list there. Refresh reads it all again; Reset puts the example list back.',
    inputs: ins,
    outputs: outs,
    nodes: [
      { id: inId, type: 'Component Inputs', label: 'When to read', ports: ins.map((p) => ({ name: p.name, type: String(p.type), plug: 'output' })) },
      { id: outId, type: 'Component Outputs', label: 'The records', ports: outs.map((p) => ({ name: p.name, type: String(p.type), plug: 'input' })) },
      selected,
      {
        id: 'dtRead',
        type: FUNCTION,
        label: 'Read the list from this browser',
        parameters: { functionScript: DEMO_READ_SCRIPT, ...signalOnly(`in-${filterInput}`) }
      },
      { id: 'dtForget', type: FUNCTION, label: 'Forget this browser’s list', parameters: { functionScript: DEMO_RESET_SCRIPT } },
      { id: 'dtForgetLast', type: 'Set Variable', label: 'Forget the last history line', parameters: { name: VAR.lastHistory, setWith: 'emptyString' } },
      { id: 'dtLoadProblem', type: 'Set Variable', label: 'Say the list did not load', parameters: { name: VAR.problem, setWith: 'string', value: DEMO_LOAD_PROBLEM_TEXT } }
    ],
    connections: [
      { fromId: inId, fromProperty: 'refresh', toId: 'dtRead', toProperty: 'run' },
      { fromId: inId, fromProperty: 'loadHistory', toId: 'dtRead', toProperty: 'run' },
      { fromId: selected.id, fromProperty: 'value', toId: 'dtRead', toProperty: `in-${filterInput}` },
      // Reset: forget the list AND the line a move would extend — it is gone with the list.
      { fromId: inId, fromProperty: 'reset', toId: 'dtForget', toProperty: 'run' },
      { fromId: 'dtForget', fromProperty: 'out-done', toId: 'dtForgetLast', toProperty: 'do' },
      { fromId: 'dtForgetLast', fromProperty: 'done', toId: 'dtRead', toProperty: 'run' },
      { fromId: 'dtRead', fromProperty: 'out-failure', toId: 'dtLoadProblem', toProperty: 'do' },
      ...queries.map((q) => ({ fromId: 'dtRead', fromProperty: `out-${q.output}`, toId: outId, toProperty: q.output }))
    ]
  };
}

// ════════════════════════════════════════════════════════════════════════════
// The header and the page
// ════════════════════════════════════════════════════════════════════════════

function demoHeader(): Tpl008Component {
  const backend = source(C.header);
  const rename = (name: string) => (name === 'signOut' ? 'reset' : name);
  const nodes = (backend.nodes as Node[]).map((n): Node => {
    if (n.type === 'Component Outputs') return { ...n, ports: n.ports?.map((p) => ({ ...p, name: rename(p.name) })) };
    if (n.id === 'hdSignOut') return { ...n, id: 'hdReset', label: DEMO_RESET_LABEL, parameters: { ...n.parameters, label: DEMO_RESET_LABEL } };
    return n;
  });
  if (!nodes.some((n) => n.id === 'hdReset')) throw new Error('tpl008Demo: Todo/Header has no Sign out button to turn into Reset demo');
  const connections = (backend.connections as Wire[]).map((w) =>
    w.fromId === 'hdSignOut' ? { ...w, fromId: 'hdReset', toProperty: rename(w.toProperty) } : w
  );
  return {
    ...backend,
    description: 'The app name, the three views (List, Done, Log) and Reset demo. Tab is the view that is showing.',
    outputs: backend.outputs?.map((p) => ({ ...p, name: rename(p.name) })),
    nodes,
    connections
  };
}

/** The page's sign-in machinery, which the demo has no use for. Named, so drift throws. */
const PAGE_AUTH_NODES = ['tdUser', 'tdAuth', 'tdToSignIn', 'tdLogOut'];
const PAGE_AUTH_WIRES = 6;

function demoPage(): Tpl008Component {
  const backend = withBrowserWrites(source(C.pageTodo));
  const nodes = backend.nodes as Node[];
  for (const id of PAGE_AUTH_NODES) if (!nodes.some((n) => n.id === id)) throw new Error(`tpl008Demo: Pages/Todo has no ${id}`);
  const wires = backend.connections as Wire[];
  const auth = (w: Wire) => PAGE_AUTH_NODES.includes(w.fromId) || PAGE_AUTH_NODES.includes(w.toId);
  const dropped = wires.filter(auth);
  if (dropped.length !== PAGE_AUTH_WIRES) {
    throw new Error(`tpl008Demo: Pages/Todo has ${dropped.length} sign-in wires, expected ${PAGE_AUTH_WIRES}: ${JSON.stringify(dropped)}`);
  }

  const shellAt = nodes.findIndex((n) => n.id === 'tdShell');
  if (shellAt < 0) throw new Error('tpl008Demo: Pages/Todo has no tdShell');
  const notice: Node = {
    id: 'tdDemoNotice',
    type: 'Text',
    label: 'It is a demo',
    parent: 'tdShell',
    parameters: { text: DEMO_NOTICE, ...composition('meta'), sizeMode: 'contentHeight', width: { value: 100, unit: '%' } }
  };
  const kept = nodes
    .filter((n) => !PAGE_AUTH_NODES.includes(n.id))
    .map((n) => (n.id === 'tdData' ? { ...n, label: 'Your list, kept in this browser' } : n));
  kept.splice(kept.findIndex((n) => n.id === 'tdShell') + 1, 0, notice);

  return {
    ...backend,
    description:
      'The demo app: the list (or Done, or the Log) beside the selected task, kept in this browser. Holds the selection, places the data and the dialog flow, and wires every button to its command.',
    nodes: kept,
    connections: [
      { fromId: 'tdPage', fromProperty: 'didMount', toId: 'tdData', toProperty: 'refresh' },
      ...wires.filter((w) => !auth(w)),
      { fromId: 'tdHeader', fromProperty: 'reset', toId: 'tdData', toProperty: 'reset' },
      { fromId: 'tdHeader', fromProperty: 'reset', toId: 'tdDeselect', toProperty: 'do' }
    ]
  };
}

// ════════════════════════════════════════════════════════════════════════════
// The demo, in the order the plan is given
// ════════════════════════════════════════════════════════════════════════════

/** Components whose graph the demo changes. Every other component is the template's, unchanged. */
export const DEMO_CHANGED = new Set<string>();

export const TPL008_DEMO_COMPONENTS: ReadonlyArray<Tpl008Component> = TPL008_COMPONENTS.filter((c) => `/${c.path}` !== C.pageSignIn).map(
  (c) => {
    const name = `/${c.path}`;
    let out: Tpl008Component;
    if (name === C.todoData) out = demoTodoData();
    else if (name === C.header) out = demoHeader();
    else if (name === C.pageTodo) out = demoPage();
    else out = withBrowserWrites(c);
    if (JSON.stringify(out) !== JSON.stringify(c)) DEMO_CHANGED.add(name);
    return out;
  }
);
