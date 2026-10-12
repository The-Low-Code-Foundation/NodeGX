/**
 * NSP-020 oracle (c) / NSP-021 (s87) — a node whose ports an EDITOR ADAPTER draws, and no runtime hook announces, against
 * its spec's draw (task §3.1 decision 5 (c)).
 *
 * The adapter is the real one (`models/NodeTypeAdapters/<Type>Adapter.ts`), run over a fake project model made from a
 * SAVED project: `ProjectModel.instance.getNodesWithType` / `getComponentWithName`, each node's raw `parameters`, its
 * component's `getNodesWithType`. What it hands `setDynamicPorts` is laid over `drawnPorts(spec, params,
 * portContextFor(project, id))` — the context the agent server builds (`@nodegx/project-contract/port-context`), so the
 * builder is graded here too. Compared on name, plug, the type's name, displayName, group, default and the choices (an
 * enum's values, a component picker's components). Not compared: the order (the format has none, §3.1).
 *
 * The projects: synthetic ones for what a corpus may not hold, then every v2 project committed in the repo, then
 * `NSP_PORT_PROJECTS` (paths separated by `:`, each a project or a folder of projects — Richard's local ones).
 *
 * `ADAPTER_GRADED_TYPES` (`@nodegx/node-spec`) is held to this file's `ADAPTERS` both ways: a type the MCP draws from the
 * spec because an adapter grades it must be graded here.
 *
 *   cd packages/noodl-editor && npx jest tests-unit/nsp-020/adapter-ports
 */
import * as fs from 'fs';
import * as path from 'path';

import { ADAPTER_GRADED_TYPES, drawnPorts, specs } from '@nodegx/node-spec';
import { diskFiles } from '@nodegx/project-contract/format-node';
import { V2ProjectStore } from '@nodegx/project-contract/format/store';
import type { NodeV2 } from '@nodegx/project-contract/format/types';
import { portContextReader, portProjectFromStore, type PortProject } from '@nodegx/project-contract/port-context';

// ─── the fake project model the adapters read ─────────────────────────────────────────────────────────────────────

interface FakeNode {
  id: string;
  type: string;
  parameters: Record<string, unknown>;
  owner: { owner: FakeComponent };
  announced?: AdapterPort[];
  setParameter(name: string, value: unknown): void;
  setDynamicPorts(ports: AdapterPort[]): void;
}
interface FakeComponent {
  fullName: string;
  getNodesWithType(type: string): FakeNode[];
  getNodesWithTypeRecursive(type: string): FakeNode[];
}
interface AdapterPort {
  name: string;
  plug: string;
  type: string | { name: string; enums?: Array<{ value: string }>; components?: string[] };
  displayName?: string;
  group?: string;
  default?: unknown;
}

const model: { nodes: FakeNode[]; components: Map<string, FakeComponent> } = { nodes: [], components: new Map() };

jest.mock('@noodl-models/projectmodel', () => ({
  ProjectModel: {
    instance: {
      getNodesWithType: (type: string) => model.nodes.filter((n) => n.type === type),
      getComponentWithName: (name: string) => model.components.get(name)
    }
  }
}));
jest.mock('@noodl-models/warningsmodel', () => ({ WarningsModel: { instance: { setWarning: () => undefined } } }));
jest.mock('@noodl-models/nodegraphmodel', () => ({}));
// CloudFunctionAdapter reads `instanceof ComponentModel` in an event handler this oracle never fires
jest.mock('@noodl-models/componentmodel', () => ({ ComponentModel: class {} }));

// eslint-disable-next-line import/first
import { CloudFunctionAdapter } from '../../src/editor/src/models/NodeTypeAdapters/CloudFunctionAdapter';
// eslint-disable-next-line import/first
import { RouterNavigateAdapter } from '../../src/editor/src/models/NodeTypeAdapters/RouterNavigateAdapter';

/** The adapters this oracle runs, by type. */
const ADAPTERS: Record<string, { updatePortsForNode(node: unknown): void }> = {
  CloudFunction2: new CloudFunctionAdapter(),
  RouterNavigate: new RouterNavigateAdapter()
};

function load(project: PortProject): void {
  model.nodes = [];
  model.components = new Map();
  for (const c of project.components) {
    const nodes: FakeNode[] = [];
    const component: FakeComponent = {
      fullName: c.name,
      getNodesWithType: (type) => nodes.filter((n) => n.type === type),
      getNodesWithTypeRecursive: (type) => nodes.filter((n) => n.type === type)
    };
    for (const saved of c.nodes) {
      const node: FakeNode = {
        id: saved.id,
        type: saved.type,
        parameters: { ...(saved.parameters ?? {}) },
        owner: { owner: component },
        setParameter(name, value) {
          this.parameters[name] = value;
        },
        setDynamicPorts(ports) {
          this.announced = ports;
        }
      };
      nodes.push(node);
    }
    model.nodes.push(...nodes);
    model.components.set(c.name, component);
  }
}

// ─── the comparison ───────────────────────────────────────────────────────────────────────────────────────────────

interface Row {
  name: string;
  plug: string;
  type: string;
  displayName?: string;
  group?: string;
  default?: unknown;
  choices?: readonly string[];
}

function fromAdapter(p: AdapterPort): Row {
  const t = typeof p.type === 'string' ? { name: p.type } : p.type;
  const row: Row = { name: p.name, plug: p.plug, type: t.name };
  if (p.displayName !== undefined) row.displayName = p.displayName;
  if (p.group !== undefined) row.group = p.group;
  if (p.default !== undefined) row.default = p.default;
  if (t.enums) row.choices = t.enums.map((e) => e.value);
  // a set, in order: CloudFunctionAdapter lists a function once per Request node it holds (:59-64)
  if (t.components) row.choices = [...new Set(t.components)];
  return row;
}

const sorted = (rows: Row[]) => [...rows].sort((a, b) => (a.plug + a.name < b.plug + b.name ? -1 : 1));

/** One node's two lists, or the reason the comparison is pinned. */
function compare(project: PortProject, label: string) {
  load(project);
  const contextOf = portContextReader(project);
  const out: Array<{ type: string; where: string; adapter: Row[]; spec: Row[] }> = [];
  for (const c of project.components) {
    for (const saved of c.nodes) {
      const adapter = ADAPTERS[saved.type];
      if (!adapter) continue;
      const node = model.nodes.find((n) => n.id === saved.id && n.owner.owner.fullName === c.name)!;
      const params = { ...(saved.parameters ?? {}) }; // before the adapter writes a Router into them
      adapter.updatePortsForNode(node);
      const drawn = drawnPorts(specs[saved.type], params, contextOf(saved.id, c.name) as Parameters<typeof drawnPorts>[2]).filter((p) => p.source === 'derived');
      out.push({
        type: saved.type,
        where: `${label} ${c.name} ${saved.id}`,
        adapter: sorted((node.announced ?? []).map(fromAdapter)),
        spec: sorted(
          drawn.map((p) => {
            const row: Row = { name: p.name, plug: p.plug, type: p.type };
            if (p.displayName !== undefined) row.displayName = p.displayName;
            if (p.group !== undefined) row.group = p.group;
            if (p.default !== undefined) row.default = p.default;
            if (p.enums !== undefined) row.choices = p.enums;
            return row;
          })
        )
      });
    }
  }
  return out;
}

/**
 * Where the spec and the adapter knowingly differ — each with its reach in Richard's projects (s87), never failed, counted.
 * `NO_ROUTER`: a project with no Router — the adapter still draws an empty Target picker and the target's `pm-` ports; the
 * context holds no Routers and the spec draws nothing (1 project of 44 with a Navigate).
 */
const hasRouter = (project: PortProject) => project.components.some((c) => c.nodes.some((n) => n.type === 'Router'));

// ─── the projects ─────────────────────────────────────────────────────────────────────────────────────────────────

const node = (id: string, type: string, parameters: Record<string, unknown> = {}): NodeV2 => ({ id, type, parameters });
const project = (components: Record<string, NodeV2[]>): PortProject => ({
  metadata: {},
  components: Object.entries(components).map(([name, nodes]) => ({ name, nodes, connections: [] }))
});

const SYNTHETIC: Record<string, PortProject> = {
  'one Router, a Target with path and query parameters (a name in both, a space kept)': project({
    '/App': [node('r', 'Router', { name: 'Main', pages: { routes: ['/Pages/Home', '/Pages/Detail'] } }), node('n', 'RouterNavigate', { target: '/Pages/Detail' })],
    '/Pages/Home': [],
    '/Pages/Detail': [node('pi', 'PageInputs', { pathParams: 'id, tab', queryParams: 'tab,sort' })]
  }),
  'two Routers, the node names the second; its Target has two Page Inputs': project({
    '/App': [
      node('r1', 'Router', { name: 'Main', pages: { routes: ['/Pages/Home'] } }),
      node('r2', 'Router', { name: 'Side', pages: { routes: ['/Pages/Panel', '/Pages/Home'] } }),
      node('n', 'RouterNavigate', { router: 'Side', target: '/Pages/Panel' })
    ],
    '/Pages/Home': [],
    '/Pages/Panel': [node('a', 'PageInputs', { pathParams: 'id' }), node('b', 'PageInputs', { queryParams: 'id,q' })]
  }),
  'two Routers, the node names none (the first is read, and written)': project({
    '/App': [
      node('r1', 'Router', { name: 'Main', pages: { routes: ['/Pages/Home'] } }),
      node('r2', 'Router', { name: 'Side', pages: { routes: ['/Pages/Panel'] } }),
      node('n', 'RouterNavigate', {})
    ],
    '/Pages/Home': [],
    '/Pages/Panel': []
  }),
  'a Router name no Router has; a Target that is not a component': project({
    '/App': [node('r', 'Router', { name: 'Main', pages: { routes: ['/Pages/Home'] } }), node('n', 'RouterNavigate', { router: 'Gone', target: '/Pages/Nope' })],
    '/Pages/Home': []
  }),
  'a cloud function: two Request nodes and two Responses, a name in both; a Response elsewhere is not its': project({
    '/App': [node('cf', 'CloudFunction2', { function: 'grade' }), node('stray', 'noodl.cloud.response', { params: 'nope' })],
    '/#__cloud__/grade': [
      node('q1', 'noodl.cloud.request', { params: 'a,b' }),
      node('q2', 'noodl.cloud.request', { params: 'b, c' }),
      node('r1', 'noodl.cloud.response', { params: 'sum' }),
      node('r2', 'noodl.cloud.response', { params: ['sum', 'message'] })
    ],
    '/#__cloud__/other': [node('q3', 'noodl.cloud.request', { params: 'x' })]
  }),
  'a cloud function: none named, one that does not exist, and a project with no cloud function': project({
    '/App': [node('unset', 'CloudFunction2', {}), node('gone', 'CloudFunction2', { function: 'gone' })]
  }),
  'a list of names saved as an array, and an empty name': project({
    '/App': [node('r', 'Router', { name: 'Main', pages: { routes: ['/Pages/Home'] } }), node('n', 'RouterNavigate', { target: '/Pages/Home' })],
    '/Pages/Home': [node('pi', 'PageInputs', { pathParams: ['id', 'slug'], queryParams: 'a,,b' })]
  })
};

const REPO = path.resolve(__dirname, '..', '..', '..', '..');

function isV2(dir: string): boolean {
  return fs.existsSync(path.join(dir, 'nodegx.project.json')) && fs.existsSync(path.join(dir, 'components'));
}
function projectsUnder(dir: string, depth = 2): string[] {
  if (!fs.existsSync(dir)) return [];
  if (isV2(dir)) return [dir];
  if (depth === 0) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== 'node_modules' && !e.name.startsWith('.'))
    .flatMap((e) => projectsUnder(path.join(dir, e.name), depth - 1));
}
function corpus(): string[] {
  const roots = ['packages/nodegx-export/tests/fixtures', 'templates', 'project-examples/lessons', 'dev-docs/tasks/phase-109-the-defects-the-island-found'].map((r) => path.join(REPO, r));
  const extra = (process.env.NSP_PORT_PROJECTS ?? '').split(':').filter(Boolean);
  return [...new Set([...roots, ...extra].flatMap((r) => projectsUnder(r)))].sort();
}

// ─── the tests ────────────────────────────────────────────────────────────────────────────────────────────────────

describe('oracle (c): an editor adapter against the spec', () => {
  test('ADAPTER_GRADED_TYPES is exactly the adapters graded here, and each has a spec', () => {
    expect([...ADAPTER_GRADED_TYPES].sort()).toEqual(Object.keys(ADAPTERS).sort());
    for (const t of ADAPTER_GRADED_TYPES) expect(specs[t]).toBeDefined();
  });

  for (const [label, p] of Object.entries(SYNTHETIC)) {
    test(`synthetic: ${label}`, () => {
      const rows = compare(p, label);
      expect(rows.length).toBeGreaterThan(0);
      for (const r of rows) expect({ where: r.where, ports: r.spec }).toEqual({ where: r.where, ports: r.adapter });
    });
  }

  test('the synthetic projects reach every port the adapter draws (known-firing)', () => {
    const all = Object.entries(SYNTHETIC).flatMap(([label, p]) => compare(p, label)).flatMap((r) => r.adapter);
    expect(all.some((p) => p.name === 'router' && (p.choices ?? []).length === 2)).toBe(true);
    expect(all.some((p) => p.name === 'target' && (p.choices ?? []).length === 2)).toBe(true);
    expect(all.some((p) => p.name === 'pm-sort')).toBe(true); // a query parameter
    expect(all.some((p) => p.name === 'pm- tab')).toBe(true); // untrimmed
    expect(all.some((p) => p.name === 'pm-slug')).toBe(true); // an array, as the adapter reads one
    expect(all.some((p) => p.name === 'function' && (p.choices ?? []).length === 2)).toBe(true);
    expect(all.some((p) => p.name === 'in- c')).toBe(true);
    expect(all.some((p) => p.name === 'out-message' && p.plug === 'output')).toBe(true);
    expect(all.some((p) => p.name === 'out-nope')).toBe(false); // known-firing beside it: out-sum, out-message above
  });

  test('every saved project in the corpus: each node the same both ways, the known rows counted', () => {
    const dirs = corpus();
    let compared = 0;
    let withParams = 0;
    let noRouter = 0;
    const byType: Record<string, number> = {};
    const wrong: string[] = [];
    for (const dir of dirs) {
      const p = portProjectFromStore(new V2ProjectStore(diskFiles(dir)));
      const rows = compare(p, path.relative(REPO, dir));
      for (const r of rows) {
        if (r.type === 'RouterNavigate' && !hasRouter(p)) {
          noRouter++;
          if (r.spec.length) wrong.push(`${r.where}: no Router, yet the spec drew ${r.spec.map((x) => x.name)}`);
          continue;
        }
        compared++;
        byType[r.type] = (byType[r.type] ?? 0) + 1;
        if (r.adapter.some((x) => /^(pm|in|out)-/.test(x.name))) withParams++;
        if (JSON.stringify(r.spec) !== JSON.stringify(r.adapter)) wrong.push(`${r.where}\n  adapter ${JSON.stringify(r.adapter)}\n  spec    ${JSON.stringify(r.spec)}`);
      }
    }
    // eslint-disable-next-line no-console
    console.log(`[oracle c] ${dirs.length} projects: ${compared} nodes compared ${JSON.stringify(byType)} (${withParams} with parameter ports), ${noRouter} pinned (a Navigate, no Router), ${wrong.length} different`);
    expect(wrong).toEqual([]);
    // the REACH gate: a corpus that stops reaching an adapter grades nothing
    for (const t of Object.keys(ADAPTERS)) expect(byType[t] ?? 0).toBeGreaterThan(0);
    expect(withParams).toBeGreaterThan(0);
  });
});
