/**
 * TPL-008 AC10 — the gate over the browser-only demo (`templates/todo-list-demo/`).
 *
 * What a browser does with it is graded by the drive,
 * `packages/nodegx-backend/tests/tpl008-todo-demo-drive.test.ts`. This file grades:
 *
 * - §1 two builds agree byte for byte, and the artefact on disk is that build;
 * - §2 nothing in it talks to a backend — with the same rule run over the template as
 *   the control that it finds backend nodes where they are;
 * - §3 **it is in step with the template**: every record write is a browser write at
 *   the same node with the same wires, every other node is the template's, and the
 *   only interface changes are the two it declares;
 * - §4 the store's scripts, run against a fake browser — including one whose storage
 *   throws — and the example list read through the template's own row scripts;
 * - §5 the Run On Value Change rule (D71) still holds after the transform.
 *
 * @module noodl-mcp/tests/tpl008Demo.test
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { LegacyComponent, LegacyNode, LegacyProject } from '../../noodl-editor/src/editor/src/io/ProjectExporter';

import { readAsLegacyProject } from './templateArtefact';
import { C, DECIDE_HISTORY_SCRIPT, SELECTED_SCRIPT, TASK_ROWS_SCRIPT, TPL008_COMPONENTS } from './tpl008Components';
import {
  backendQueries,
  BACKEND_NODE_TYPES,
  DEMO_CHANGED,
  DEMO_READ_SCRIPT,
  DEMO_RESET_SCRIPT,
  DEMO_STORAGE_KEY,
  demoWriteScript,
  TPL008_DEMO_COMPONENTS
} from './tpl008Demo';
import { AuthoredTemplate, buildTodoTemplateProject, DEMO_ID, POLICY_FILE, prepareTodoDemoArtefact, TEMPLATE_ID } from './tpl008Template';

jest.setTimeout(300_000);

const REPO = path.join(__dirname, '..', '..', '..');
const ARTEFACT = path.join(REPO, 'templates', DEMO_ID);
const TEMPLATE_ARTEFACT = path.join(REPO, 'templates', TEMPLATE_ID);

let built: AuthoredTemplate;
let rebuilt = '';
let template: LegacyProject;

const componentsOf = (p: LegacyProject): LegacyComponent[] => p.components ?? [];

function nodesOf(component: LegacyComponent): LegacyNode[] {
  const out: LegacyNode[] = [];
  const walk = (list: LegacyNode[]) => {
    for (const n of list ?? []) {
      out.push(n);
      if (n.children) walk(n.children);
    }
  };
  walk(component.graph?.roots ?? []);
  return out;
}

const allNodes = (p: LegacyProject) => componentsOf(p).flatMap((c) => nodesOf(c).map((node) => ({ component: c.name, node })));

function files(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else out.push(path.relative(dir, p));
    }
  };
  walk(dir);
  return out.sort();
}

beforeAll(async () => {
  built = await buildTodoTemplateProject({ variant: 'demo' });
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tpl008-demo-gate-')), DEMO_ID);
  prepareTodoDemoArtefact(built, out);
  rebuilt = out;
  template = readAsLegacyProject(TEMPLATE_ARTEFACT);
});

const COMMANDS = TPL008_COMPONENTS.filter((c) => c.path.startsWith('Commands/')).map((c) => `/${c.path}`);

// ── §1 ─────────────────────────────────────────────────────────────────────

describe('§1 the artefact is the build', () => {
  it('the door refused nothing and raised no warning or error', () => {
    expect(built.diagnostics.filter((d) => d.severity !== 'info')).toEqual([]);
  });

  it('templates/todo-list-demo is byte-identical to a fresh build — the same files, the same bytes', () => {
    expect(files(ARTEFACT)).toEqual(files(rebuilt));
    const differing = files(rebuilt).filter((f) => !fs.readFileSync(path.join(ARTEFACT, f)).equals(fs.readFileSync(path.join(rebuilt, f))));
    expect(differing).toEqual([]);
  });

  it('holds every template component but Sign in, and routes only the list', () => {
    const names = componentsOf(built.project).map((c) => c.name).sort();
    expect(names).toEqual(['/App', ...TPL008_COMPONENTS.map((c) => `/${c.path}`).filter((n) => n !== C.pageSignIn)].sort());
    const router = allNodes(built.project).find((n) => n.node.type === 'Router')?.node;
    expect((router?.parameters as { pages?: unknown })?.pages).toEqual({ startPage: C.pageTodo, routes: [C.pageTodo] });
  });
});

// ── §2 ─────────────────────────────────────────────────────────────────────

describe('§2 nothing in it talks to a backend', () => {
  const backendTypes = (p: LegacyProject) =>
    [...new Set(allNodes(p).map((n) => String(n.node.type)).filter((t) => (BACKEND_NODE_TYPES as readonly string[]).includes(t)))].sort();

  it('no query, record write, delete or user node — and the same rule finds them in the template (control)', () => {
    expect(backendTypes(built.project)).toEqual([]);
    expect(backendTypes(template)).toEqual(BACKEND_NODE_TYPES.filter((t) => t !== 'DeleteDbModelProperties').sort());
  });

  it('ships no policy, no backend binding and no cloud functions', () => {
    expect(fs.existsSync(path.join(ARTEFACT, POLICY_FILE))).toBe(false);
    const project = JSON.parse(fs.readFileSync(path.join(ARTEFACT, 'nodegx.project.json'), 'utf8')) as { metadata?: { cloudservices?: unknown } };
    expect(project.metadata?.cloudservices).toBeUndefined();
    expect(fs.existsSync(path.join(ARTEFACT, 'components', '__cloud__'))).toBe(false);
  });
});

// ── §3 ─────────────────────────────────────────────────────────────────────

describe('§3 it is in step with the template', () => {
  it('changes exactly the components that write, read or sign in', () => {
    expect([...DEMO_CHANGED].sort()).toEqual([C.header, C.todoData, C.pageTodo, C.writeHistory, ...COMMANDS].sort());
  });

  it('every interface is the template’s, except Reset demo and the reset it sends', () => {
    const ports = (list: ReadonlyArray<{ path: string; inputs?: Array<{ name: string }>; outputs?: Array<{ name: string }> }>) =>
      new Map(list.map((c) => [c.path, { in: (c.inputs ?? []).map((p) => p.name), out: (c.outputs ?? []).map((p) => p.name) }]));
    const t = ports(TPL008_COMPONENTS.filter((c) => `/${c.path}` !== C.pageSignIn));
    const d = ports(TPL008_DEMO_COMPONENTS);
    expect([...d.keys()]).toEqual([...t.keys()]);
    const differing = [...t.keys()].filter((k) => JSON.stringify(t.get(k)) !== JSON.stringify(d.get(k)));
    expect(differing.sort()).toEqual(['Logic/Todo data', 'Todo/Header']);
    const data = t.get('Logic/Todo data');
    expect(d.get('Logic/Todo data')).toEqual({ in: [...(data?.in ?? []), 'reset'], out: data?.out });
    const header = t.get('Todo/Header');
    expect(d.get('Todo/Header')).toEqual({ in: header?.in, out: header?.out.map((n) => (n === 'signOut' ? 'reset' : n)) });
  });

  it('🔴 every record write in the template is a browser write in the demo — the same node id, the same wires in and out', () => {
    const RECORD = ['NewDbModelProperties', 'SetDbModelProperties'];
    const mapIn = (p: string) => (p === 'store' ? 'run' : p === 'modelId' ? 'in-modelId' : p.startsWith('prop-') ? `in-${p.slice(5)}` : `UNMAPPED ${p}`);
    const seen: string[] = [];
    const loud: string[] = [];
    for (const c of componentsOf(template)) {
      const demoC = componentsOf(built.project).find((x) => x.name === c.name);
      for (const w of nodesOf(c).filter((n) => RECORD.includes(String(n.type)))) {
        seen.push(`${c.name} ${w.id}`);
        const dn = demoC ? nodesOf(demoC).find((n) => n.id === w.id) : undefined;
        if (dn?.type !== 'JavaScriptFunction') {
          loud.push(`${c.name} ${w.id} is ${dn?.type ?? 'missing'} in the demo`);
          continue;
        }
        const touching = (list: Array<{ fromId: string; fromProperty: string; toId: string; toProperty: string }>) =>
          list.filter((x) => x.toId === w.id || x.fromId === w.id);
        const expected = touching(c.graph?.connections ?? [])
          .map((x) => (x.toId === w.id ? `${x.fromId}.${x.fromProperty} → ${mapIn(x.toProperty)}` : `out-${x.fromProperty} → ${x.toId}.${x.toProperty}`))
          .sort();
        const actual = touching(demoC?.graph?.connections ?? [])
          .map((x) => (x.toId === w.id ? `${x.fromId}.${x.fromProperty} → ${x.toProperty}` : `${x.fromProperty} → ${x.toId}.${x.toProperty}`))
          .sort();
        if (JSON.stringify(expected) !== JSON.stringify(actual)) loud.push(`${c.name} ${w.id}: ${JSON.stringify({ expected, actual })}`);
      }
    }
    // The known-firing half: the rule reached every record write the template's SOURCES declare.
    const declared = TPL008_COMPONENTS.flatMap((c) => (c.nodes as Array<{ type: string }>).filter((n) => RECORD.includes(n.type)));
    expect(declared.length).toBeGreaterThan(0);
    expect(seen).toHaveLength(declared.length);
    expect(loud).toEqual([]);
  });

  it('every other node of the template is in the demo at the same id and type — less the queries and the sign-in machinery', () => {
    const RECORD = ['NewDbModelProperties', 'SetDbModelProperties'];
    const missing: string[] = [];
    for (const c of componentsOf(template).filter((x) => x.name !== C.pageSignIn)) {
      const demoC = componentsOf(built.project).find((x) => x.name === c.name);
      for (const n of nodesOf(c).filter((x) => !RECORD.includes(String(x.type)))) {
        const dn = demoC ? nodesOf(demoC).find((x) => x.id === n.id) : undefined;
        if (!dn || dn.type !== n.type) missing.push(`${c.name} ${n.id}`);
      }
    }
    expect(missing.sort()).toEqual(
      [
        '/Logic/Todo data dtActions',
        '/Logic/Todo data dtEvents',
        '/Logic/Todo data dtHasTask',
        '/Logic/Todo data dtRecent',
        '/Logic/Todo data dtTasks',
        '/Pages/Todo tdAuth',
        '/Pages/Todo tdLogOut',
        '/Pages/Todo tdToSignIn',
        '/Pages/Todo tdUser',
        '/Todo/Header hdSignOut'
      ].sort()
    );
  });
});

// ── §4 ─────────────────────────────────────────────────────────────────────

/** A browser with a `localStorage`, or one whose storage throws on every call. */
function fakeBrowser(blocked = false) {
  const map = new Map<string, string>();
  const guard = () => {
    if (blocked) throw new Error('storage is blocked');
  };
  const win: Record<string, unknown> = {
    localStorage: {
      getItem: (k: string) => (guard(), map.has(k) ? (map.get(k) as string) : null),
      setItem: (k: string, v: string) => (guard(), void map.set(k, String(v))),
      removeItem: (k: string) => (guard(), void map.delete(k))
    }
  };
  return { win, map };
}

/** Run a Function node's script the way the runtime does: `Inputs` in, `Outputs` out, signals as calls. */
function run(script: string, inputs: Record<string, unknown>, win?: Record<string, unknown>) {
  const signals: string[] = [];
  const outputs = new Proxy({} as Record<string, unknown>, {
    get(target, key: string) {
      if (key in target) return target[key];
      return () => signals.push(key);
    }
  });
  // eslint-disable-next-line no-new-func
  new Function('Inputs', 'Outputs', 'window', script)(inputs, outputs, win);
  return { outputs: { ...outputs } as Record<string, unknown>, signals };
}

type Row = Record<string, unknown>;
const SEED_TITLES = ['Write the release notes', 'Book the van in for its MOT', 'Chase the accountant about VAT', 'Renew the domain'];

describe('§4 the store', () => {
  it('reads what the template’s queries ask for — collection, order, filter and limit, off the backend nodes', () => {
    expect(backendQueries()).toEqual([
      { output: 'tasks', collection: 'Task', sort: { property: 'position', order: 'ascending' }, limit: 1000 },
      { output: 'actions', collection: 'Action', sort: { property: 'position', order: 'ascending' }, limit: 1000 },
      { output: 'events', collection: 'Event', sort: { property: 'at', order: 'descending' }, limit: 1000, filter: { property: 'taskId', input: 'taskId' } },
      { output: 'recent', collection: 'Event', sort: { property: 'at', order: 'descending' }, limit: 300 }
    ]);
  });

  it('an empty browser gets the example list once; a change is still there on the next read', () => {
    const b = fakeBrowser();
    const first = run(DEMO_READ_SCRIPT, { taskId: '' }, b.win);
    expect(first.signals).toEqual([]);
    expect((first.outputs.tasks as Row[]).map((t) => t.title)).toEqual(SEED_TITLES);
    expect(first.outputs.events).toEqual([]);
    expect((first.outputs.recent as Row[]).length).toBe(13);
    expect(b.map.has(DEMO_STORAGE_KEY)).toBe(true);

    const created = run(demoWriteScript('create', 'Task', ['title', 'position', 'status']), { title: 'Order a chair', position: 9, status: 'open' }, b.win);
    expect(created.signals).toEqual(['done']);
    expect(String(created.outputs.id)).toMatch(/^d/);
    const second = run(DEMO_READ_SCRIPT, { taskId: '' }, b.win);
    expect((second.outputs.tasks as Row[]).map((t) => t.title)).toEqual([...SEED_TITLES, 'Order a chair']);
    expect((second.outputs.tasks as Row[])[4]).toMatchObject({ title: 'Order a chair', position: 9, status: 'open' });
  });

  it('a task’s history is that task’s lines only, newest first; the recent log stops at the backend’s limit', () => {
    const b = fakeBrowser();
    const events = run(DEMO_READ_SCRIPT, { taskId: 'seed-task-notes' }, b.win).outputs.events as Row[];
    expect(events.map((e) => e.taskId)).toEqual(new Array(7).fill('seed-task-notes'));
    const ats = events.map((e) => String(e.at));
    expect(ats).toEqual([...ats].sort().reverse());

    const store = JSON.parse(String(b.map.get(DEMO_STORAGE_KEY))) as { Event: Row[] };
    for (let i = 0; i < 350; i++) store.Event.push({ id: `bulk${i}`, taskId: 'x', kind: 'note', summary: 'Note', at: new Date(2020, 0, 1, 0, i).toISOString() });
    b.map.set(DEMO_STORAGE_KEY, JSON.stringify(store));
    expect((run(DEMO_READ_SCRIPT, { taskId: '' }, b.win).outputs.recent as Row[]).length).toBe(300);
  });

  it('an update writes only the fields wired into it; an id that is not there fails and writes nothing', () => {
    const b = fakeBrowser();
    run(DEMO_READ_SCRIPT, { taskId: '' }, b.win);
    const close = demoWriteScript('update', 'Task', ['status', 'closingNote']);
    const done = run(close, { modelId: 'seed-task-mot', status: 'done', closingNote: 'Booked.' }, b.win);
    expect([done.signals, done.outputs.id]).toEqual([['done'], 'seed-task-mot']);
    const mot = (JSON.parse(String(b.map.get(DEMO_STORAGE_KEY))) as { Task: Row[] }).Task.find((t) => t.id === 'seed-task-mot');
    expect(mot).toMatchObject({ status: 'done', closingNote: 'Booked.', title: 'Book the van in for its MOT', position: 2 });

    const before = b.map.get(DEMO_STORAGE_KEY);
    expect(run(close, { modelId: 'not-there', status: 'done', closingNote: 'x' }, b.win).signals).toEqual(['failure']);
    expect(b.map.get(DEMO_STORAGE_KEY)).toBe(before);
  });

  it('with storage blocked the demo still works for the visit', () => {
    const b = fakeBrowser(true);
    expect((run(DEMO_READ_SCRIPT, { taskId: '' }, b.win).outputs.tasks as Row[]).length).toBe(4);
    expect(run(demoWriteScript('create', 'Task', ['title']), { title: 'Kept in memory' }, b.win).signals).toEqual(['done']);
    expect((run(DEMO_READ_SCRIPT, { taskId: '' }, b.win).outputs.tasks as Row[]).map((t) => t.title)).toContain('Kept in memory');
  });

  it('reset forgets the visitor’s list, and the next read puts the example list back', () => {
    const b = fakeBrowser();
    run(DEMO_READ_SCRIPT, { taskId: '' }, b.win);
    run(demoWriteScript('create', 'Task', ['title']), { title: 'Gone after reset' }, b.win);
    expect(run(DEMO_RESET_SCRIPT, {}, b.win).signals).toEqual(['done']);
    expect([b.map.has(DEMO_STORAGE_KEY), b.win.__todoListDemo]).toEqual([false, null]);
    expect((run(DEMO_READ_SCRIPT, { taskId: '' }, b.win).outputs.tasks as Row[]).map((t) => t.title)).toEqual(SEED_TITLES);
  });

  it('the example list draws the way the template draws a real one — order, next action, overdue in red, history', () => {
    const seeded = run(DEMO_READ_SCRIPT, { taskId: 'seed-task-notes' }, fakeBrowser().win).outputs;
    const rows = run(TASK_ROWS_SCRIPT, { tasks: seeded.tasks, actions: seeded.actions, selectedId: '' }).outputs;
    const open = rows.openRows as Row[];
    expect(open.map((r) => [r.title, r.meta])).toEqual([
      ['Write the release notes', 'Due tomorrow · Next: Lead with the templates'],
      ['Book the van in for its MOT', 'Next: Ring the garage for a Saturday slot'],
      ['Chase the accountant about VAT', 'Overdue by 1 day']
    ]);
    expect(open.map((r) => r.metaColor)).toEqual(['var(--muted-foreground)', 'var(--muted-foreground)', 'var(--destructive)']);
    expect([rows.listLabel, rows.doneLabel]).toEqual(['List (3)', 'Done (1)']);

    const sel = run(SELECTED_SCRIPT, { tasks: seeded.tasks, actions: seeded.actions, events: seeded.events, selectedId: 'seed-task-notes' }).outputs;
    expect((sel.actionRows as Row[]).map((r) => [r.id, r.num])).toEqual([['seed-action-lead', '1'], ['seed-action-shipped', '']]);
    expect((sel.historyRows as Row[]).length).toBe(7);
    expect(String(sel.rankLine)).toMatch(/^#1 of 3/);
  });

  it('every example history line is a kind a command writes, and the move says what Write history would say', () => {
    const kinds = new Set(
      TPL008_COMPONENTS.flatMap((c) => (c.nodes as Array<{ type: string; parameters?: { kind?: string } }>).filter((n) => n.type === C.writeHistory).map((n) => String(n.parameters?.kind)))
    );
    const recent = run(DEMO_READ_SCRIPT, { taskId: '' }, fakeBrowser().win).outputs.recent as Row[];
    expect(recent.map((e) => String(e.kind)).filter((k) => !kinds.has(k))).toEqual([]);
    const moved = recent.find((e) => e.kind === 'moved');
    expect(moved?.summary).toBe(run(DECIDE_HISTORY_SCRIPT, { taskId: 't', kind: 'moved', from: 3, to: 1, last: {} }).outputs.summary);
  });
});

// ── §5 ─────────────────────────────────────────────────────────────────────

describe('§5 the rules the template holds itself to', () => {
  it('🔴 every Function whose run is wired has Run On Value Change OFF on every input wired into it (D71)', () => {
    const loud: string[] = [];
    let checked = 0;
    for (const c of componentsOf(built.project)) {
      const wires = c.graph?.connections ?? [];
      for (const n of nodesOf(c).filter((x) => x.type === 'JavaScriptFunction')) {
        if (!wires.some((w) => w.toId === n.id && w.toProperty === 'run')) continue;
        for (const w of wires.filter((x) => x.toId === n.id && String(x.toProperty).startsWith('in-'))) {
          checked++;
          if ((n.parameters as Record<string, unknown>)?.[`runOnChange-${w.toProperty}`] !== false) loud.push(`${c.name} ${n.id}.${w.toProperty}`);
        }
      }
    }
    expect(checked).toBeGreaterThan(50);
    expect(loud).toEqual([]);
  });
});
