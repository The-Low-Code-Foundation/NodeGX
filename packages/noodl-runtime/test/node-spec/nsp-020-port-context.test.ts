/**
 * NSP-020 L5 (s85) — the context builder graded on saved projects: `portContextFor(project, nodeId)`
 * (`@nodegx/project-contract/port-context`) against the runtime's own hooks and the editor's cached ports.
 *
 * For every node of every saved v2 project in the corpus whose type has an oracle (a) row and a spec, three lists:
 *
 *   (A) the runtime's `setup` hook, fired over a fake graph model made from the SAVED PROJECT as it stands — the raw
 *       `metadata` (`getMetaData` reads `cloudservices`, `backendServices`, `dbCollections`, `systemCollections` as
 *       written), the component's wires, every node of a type, the Page Stacks — against `drawnPorts(spec, params,
 *       portContextFor(project, id))`. The hook resolves the backend and the schema itself, so a builder that reads
 *       them wrong is red here. One field is the builder's on both sides: a component's interface (`graphModel.
 *       components[name].inputPorts`), which the runtime is handed by the editor's exporter (`ComponentModel.getPorts`)
 *       and no runtime code computes; (B) grades that one;
 *   (B) the node's cached `dynamicports` (the last announcement the editor saved, NSP-020 §5) against the same spec draw;
 *   (C) the hook against the cache: where they differ the cache is stale (P107-S79-SILENTCACHE), and (B) is read as
 *       saying nothing about the builder for that node.
 *
 * The corpus is every v2 project committed in the repo (the export fixtures, the templates, the lessons, the island's
 * projects); `NSP_PORT_PROJECTS` (paths separated by `:`, each a project or a folder of projects) adds more.
 *
 *   npx jest test/node-spec/nsp-020-port-context.test.ts
 */
import * as fs from 'fs';
import * as path from 'path';

import { diskFiles } from '../../../nodegx-project-contract/format-node';
import { V2ProjectStore } from '../../../nodegx-project-contract/format/store';
import type { NodeV2 } from '../../../nodegx-project-contract/format/types';
import {
  portContextReader,
  portProjectFromStore,
  type PortProject,
  type PortTypeOf
} from '../../../nodegx-project-contract/port-context';
import { specs, type PortContext } from '../../../nodegx-node-spec/src';
import { PROJECT, TABLE, type TableRow } from './nsp-020-module-table';
import {
  announceFrom,
  compareWithSpec,
  fromAnnounced,
  hookOf,
  pinned,
  typeName,
  type Announced,
  type FakeGraphModel
} from './nsp-020-oracle-a';

// The viewer's modules read the `Noodl` global at import (node-shared-port-definitions.ts), as the parity test sets it.
(globalThis as unknown as Record<string, unknown>).Noodl = { deployed: false, baseUrl: '/' };

// eslint-disable-next-line @typescript-eslint/no-require-imports
const catalog = require('../../../noodl-types/src/node-catalog.json') as {
  nodes: Array<{ typeName: string; inputs?: Array<{ name: string; plug: string; type: unknown }>; outputs?: Array<{ name: string; plug: string; type: unknown }> }>;
};

const REPO = path.resolve(__dirname, '../../../..');

/** A library node's static port type, from the catalog — the resolver the MCP server passes too. */
const catalogPortType: PortTypeOf = (node, port, plug) => {
  const entry = catalog.nodes.find((n) => n.typeName === node.type);
  const list = plug === 'input' ? entry?.inputs : entry?.outputs;
  const found = list?.find((p) => p.name === port);
  return found ? typeName(found.type) : undefined;
};

function isV2(dir: string): boolean {
  return fs.existsSync(path.join(dir, 'nodegx.project.json')) && fs.existsSync(path.join(dir, 'components'));
}

/** The v2 projects under a folder: itself, or its children, two levels down (a lesson keeps its `solution/` inside). */
function projectsUnder(dir: string, depth = 2): string[] {
  if (!fs.existsSync(dir)) return [];
  const here = isV2(dir) ? [dir] : [];
  if (depth === 0) return here;
  const kids = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== 'node_modules' && e.name !== 'components' && !e.name.startsWith('.'))
    .flatMap((e) => projectsUnder(path.join(dir, e.name), depth - 1));
  return [...here, ...kids];
}

function corpus(): string[] {
  const roots = [
    'packages/nodegx-export/tests/fixtures',
    'templates',
    'project-examples/lessons',
    'dev-docs/tasks/phase-109-the-defects-the-island-found'
  ].map((r) => path.join(REPO, r));
  const extra = (process.env.NSP_PORT_PROJECTS ?? '').split(':').filter(Boolean);
  return [...new Set([...roots, ...extra].flatMap((r) => projectsUnder(r)))].sort();
}

/**
 * The saved project as the runtime's graph model would hold it, for one node's hook. Wires in the runtime's spelling
 * (`sourceId`/`sourcePort`/`targetId`/`targetPort`, record-ports.ts :224-235); `getMetaData` the project metadata as
 * written; `getNodesWithType` every node of a type in the project; a component's ports from the builder (see (A)).
 */
function projectGraph(
  project: PortProject,
  interfaces: PortContext['components']
): (nodeId: string, componentName: string) => { node: { id: string }; model: FakeGraphModel } {
  type FakeNode = {
    id: string;
    type: string;
    parameters: Record<string, unknown>;
    inputPorts: Record<string, unknown>;
    outputPorts: Record<string, unknown>;
    component?: unknown;
    on: () => void;
  };
  // nodemodel.ts :255-269 — a node's saved `ports` (never its cached `dynamicports`) become its input and output ports
  const portsOf = (n: NodeV2, plug: 'input' | 'output') =>
    Object.fromEntries(
      (n.ports ?? []).filter((p) => p.plug === plug || p.plug === 'input/output' || (plug === 'output' && p.plug === 'outputs')).map((p) => [p.name, { ...p }])
    );
  const fake = (n: NodeV2, component?: unknown): FakeNode => ({
    id: n.id,
    type: n.type,
    parameters: { ...(n.parameters ?? {}) },
    inputPorts: portsOf(n, 'input'),
    outputPorts: portsOf(n, 'output'),
    component,
    on: () => undefined
  });
  const all: Array<{ saved: NodeV2; component: unknown; in: string }> = [];
  for (const c of project.components) {
    const wires = c.connections.map((w) => ({ sourceId: w.fromId, sourcePort: w.fromProperty, targetId: w.toId, targetPort: w.toProperty }));
    const component = {
      name: c.name,
      getConnectionsTo: (id: string) => wires.filter((w) => w.targetId === id),
      getConnectionsFrom: (id: string) => wires.filter((w) => w.sourceId === id),
      getNodesWithType: (t: string) => c.nodes.filter((n) => n.type === t).map((n) => fake(n)),
      on: () => undefined
    };
    for (const n of c.nodes) all.push({ saved: n, component, in: c.name });
  }
  const components = Object.fromEntries(
    project.components.map((c) => [
      c.name,
      {
        name: c.name,
        inputPorts: interfaces?.[c.name]?.inputs ?? {},
        outputPorts: interfaces?.[c.name]?.outputs ?? {},
        getNodesWithType: (t: string) => c.nodes.filter((n) => n.type === t).map((n) => fake(n)),
        on: () => undefined
      }
    ])
  );
  // fresh fakes per drive: a hook may write onto the node it is handed, and no drive should see another's writes
  // by component and id: a node id is unique within a component only (P107 s86 — 27 of 117 local projects reuse one)
  return (nodeId, componentName) => {
    const hit = all.find((x) => x.saved.id === nodeId && x.in === componentName);
    if (!hit) throw new Error(`no node ${nodeId} in ${componentName}`);
    const node = fake(hit.saved, hit.component);
    return {
      node,
      model: {
        components,
        // the driven node's own type answers the driven node alone, as oracle (a) answers it: a hook sweeps every node of its
        // type on `editorImportComplete` and announces for each, which over 1,020 Functions is a million parses for nothing
        getNodesWithType: (t: string) =>
          t === hit.saved.type ? [node] : all.filter((x) => x.saved.type === t).map((x) => fake(x.saved, x.component)),
        getMetaData: (key: string) => project.metadata[key]
      }
    };
  };
}

/** Two announcements the same list (compared as oracle (a) compares: name, plug, type name, displayName, group, default). */
function sameList(a: readonly Announced[], b: readonly Announced[]): boolean {
  const key = (x: Announced) => JSON.stringify(fromAnnounced(x));
  const sa = a.map(key).sort();
  const sb = b.map(key).sort();
  return JSON.stringify(sa) === JSON.stringify(sb);
}

interface NodeResult {
  project: string;
  type: string;
  id: string;
  hookDiffs: string[];
  cacheDiffs?: string[];
  hookIsCache?: boolean;
  /** The context fields whose removal turns this node's (A) red — the fields this node grades. */
  graded?: string[];
  error?: string;
}

function rowsByType(): Map<string, TableRow[]> {
  const out = new Map<string, TableRow[]>();
  for (const row of TABLE) {
    if (!specs[row.type]) continue;
    out.set(row.type, [...(out.get(row.type) ?? []), row]);
  }
  return out;
}

/** The fields the builder fills that a spec may read (`derived.needs`); `routers` is filled and read by none yet. */
const BUILT_FIELDS = ['wired', 'wiredOutputs', 'backends', 'schema', 'stacks', 'components'] as const;

/**
 * Lines only this drive produces, pinned by EXACT text (on the synthetic project's own column names, so a pin cannot hide
 * a builder error anywhere else); each must still be produced, or the gate below is red and the pin comes out.
 */
const DRIVE_PINS: Record<string, string> = {
  'input prop-extra: type runtime "object", spec "*"': 'P107-S85-RESTCOLTYPES',
  'output prop-extra: type runtime "object", spec "*"': 'P107-S85-RESTCOLTYPES',
  'input prop-status: type runtime "enum", spec "*"': 'P107-S85-RESTCOLTYPES',
  'output prop-status: type runtime "enum", spec "*"': 'P107-S85-RESTCOLTYPES',
  // P107 s101 — graded since oracle (a) compares a derived port's enums and labels: the same root, the format names no backend
  // kind — a REST backend's Class picker has no Parse system classes, and a select column's choices are its enum
  'input prop-status: enums runtime ["draft","live"], spec unset': 'P107-S85-RESTCOLTYPES',
  'output prop-status: enums runtime ["draft","live"], spec unset': 'P107-S85-RESTCOLTYPES',
  'input collectionName: enums runtime ["posts"], spec ["_User","_Role","posts"]': 'P107-S85-RESTCOLTYPES',
  'input collectionName: labels runtime unset, spec {"_User":"User","_Role":"Role"}': 'P107-S85-RESTCOLTYPES'
};
const pinsSeen = new Set<string>();

/** Milliseconds per type, printed with the report (what a slow run is spending on). */
const spent = new Map<string, number>();

function drive(label: string, project: PortProject, rows: Map<string, TableRow[]>): NodeResult[] {
  const t0 = Date.now();
  const contextOf = portContextReader(project, { portType: catalogPortType });
  const results: NodeResult[] = [];
  let graphOf: ReturnType<typeof projectGraph> | undefined;
  for (const c of project.components) {
    for (const n of c.nodes) {
      const typeRows = rows.get(n.type);
      if (!typeRows) continue;
      const spec = specs[n.type];
      const params = { ...(n.parameters ?? {}) };
      const r: NodeResult = { project: label, type: n.type, id: n.id, hookDiffs: [] };
      const started = Date.now();
      try {
        const context = contextOf(n.id, c.name) as PortContext;
        graphOf = graphOf ?? projectGraph(project, context.components);
        // a type with a setup hook AND numbered inputs announces from both; the editor holds the last of each — compare the union
        const announced: Announced[] = [];
        for (const row of typeRows) {
          const { node, model } = graphOf(n.id, c.name);
          for (const a of announceFrom(hookOf(row), n.type, node, model)) if (!announced.some((x) => x.name === a.name && x.plug === a.plug)) announced.push(a);
        }
        // a line oracle (a)'s table pins (a bug row or a format GAP) is the spec's, measured there — not the builder's
        const open = (diffs: string[]) =>
          diffs.filter((d) => {
            if (typeRows.some((row) => pinned(row, d))) return false;
            if (!(d in DRIVE_PINS)) return true;
            pinsSeen.add(d);
            return false;
          });
        r.hookDiffs = open(compareWithSpec(spec, announced, params, context));
        const cached = n.dynamicports as Announced[] | undefined;
        if (cached && cached.length) {
          r.cacheDiffs = open(compareWithSpec(spec, cached, params, context));
          r.hookIsCache = sameList(announced, cached);
        }
        // REACH: a field this node's spec reads is graded here only if dropping it makes (A) disagree
        const needs = spec.derived?.needs ?? [];
        r.graded = BUILT_FIELDS.filter((f) => needs.includes(f) && context[f] !== undefined).filter((f) => {
          const without = { ...context };
          delete without[f];
          return open(compareWithSpec(spec, announced, params, without)).length > 0;
        });
      } catch (e) {
        r.error = (e as Error).message;
      }
      results.push(r);
      spent.set(n.type, (spent.get(n.type) ?? 0) + Date.now() - started);
    }
  }
  spent.set('(reading projects)', (spent.get('(reading projects)') ?? 0) + Date.now() - t0);
  return results;
}

/**
 * The backends no committed project has (reach `backends` was 0 on the corpus): the built-in endpoint beside an
 * introspected Directus, the legacy reading (backendServices v1: `_active_` is the endpoint) and the converged one (v2:
 * `_active_` is `activeBackendId`, resolveBackend.pure.ts :188-200). The Record, Query and User nodes name each Backend a
 * saved param can hold. The hook is still the judge: these projects only say what the corpus does not.
 */
function twoBackends(version: number): PortProject {
  const backends = ['', '_active_', '_endpoint_', 'rig', 'ghost'];
  const nodes = backends.flatMap((backendId, i) => [
    { id: `rec${i}`, type: 'DbModel2', parameters: { ...(backendId ? { backendId } : {}), collectionName: i % 2 ? 'posts' : 'Lesson' } },
    { id: `new${i}`, type: 'NewDbModelProperties', parameters: { ...(backendId ? { backendId } : {}), collectionName: i % 2 ? 'posts' : 'Lesson' } },
    { id: `q${i}`, type: 'DbCollection2', parameters: { ...(backendId ? { backendId } : {}), collectionName: i % 2 ? 'posts' : 'Lesson' } },
    { id: `u${i}`, type: 'net.noodl.user.User', parameters: { ...(backendId ? { backendId } : {}) } }
  ]);
  return {
    metadata: {
      cloudservices: { endpoint: 'https://built-in.example/parse', appId: 'app1' },
      backendServices: {
        version,
        activeBackendId: 'rig',
        backends: [
          {
            id: 'rig',
            name: 'Rig Directus',
            type: 'directus',
            schema: {
              collections: [
                {
                  name: 'posts',
                  fields: [
                    { name: 'id', type: 'number', nativeType: 'integer', primaryKey: true },
                    { name: 'title', type: 'string', nativeType: 'varchar' },
                    { name: 'body', type: 'text' },
                    { name: 'secret', type: 'string', hidden: true },
                    { name: 'published', type: 'date' },
                    { name: 'extra', type: 'json' },
                    { name: 'status', type: 'string', enumValues: ['draft', 'live'] }
                  ]
                }
              ]
            }
          }
        ]
      },
      dbCollections: [{ name: 'Lesson', columns: [{ name: 'title', type: 'String' }, { name: 'n', type: 'Number' }, { name: 'tags', type: 'Relation', targetClass: 'Tag' }, { name: 'owner', type: 'Pointer', targetClass: '_User' }] }],
      systemCollections: [{ name: '_User', schema: { properties: { username: { type: 'String' }, email: { type: 'String' }, nickname: { type: 'String' }, born: { type: 'Date' }, ACL: { type: 'ACL' } } } }]
    },
    components: [{ name: '/Backends', nodes: nodes as NodeV2[], connections: [] }]
  };
}

/**
 * Oracle (a)'s `PROJECT` context (nsp-020-module-table.ts) as SAVED nodes: an unnamed Page Stack (the hook and the builder
 * both read it as Main), each page's component, the Detail page's inputs wired to typed library ports and its two Pop
 * Component Stacks, a popup with two Close Popups and an output fed by a boolean, a row template with a signal in and
 * out. The component interfaces are typed by `portContextFor` from those wires; in (A) the fake hands the hook the
 * builder's interfaces, so this project grades the stack reading and the nodes inside a component, not the typing.
 */
function pagesProject(): PortProject {
  const n = (id: string, type: string, parameters: Record<string, unknown> = {}, ports?: NodeV2['ports']): NodeV2 => ({ id, type, parameters, ...(ports ? { ports } : {}) });
  const w = (fromId: string, fromProperty: string, toId: string, toProperty: string) => ({ fromId, fromProperty, toId, toProperty });
  const out = (names: string[]) => names.map((name) => ({ name, plug: 'output', type: '*' }));
  const into = (names: string[]) => names.map((name) => ({ name, plug: 'input', type: '*' }));
  return {
    metadata: {},
    components: [
      {
        name: '/App',
        nodes: [
          n('stack', 'Page Stack', { pages: [{ id: 'home', label: 'Home' }, { id: 'detail', label: 'Detail' }], 'pageComp-home': '/Pages/Home', 'pageComp-detail': '/Pages/Detail' }),
          n('push0', 'PageStackNavigate'),
          n('push1', 'PageStackNavigate', { target: 'detail' }),
          n('push2', 'PageStackNavigate', { stack: 'Gone' }),
          n('pop0', 'NavigationShowPopup', { target: '/Popups/Dialog' }),
          n('each0', 'For Each', { template: '/Rows/Row' })
        ],
        connections: []
      },
      { name: '/Pages/Home', nodes: [], connections: [] },
      {
        name: '/Pages/Detail',
        nodes: [
          n('ci', 'Component Inputs', {}, out(['id', 'n'])),
          n('t', 'Text'),
          n('num', 'Number'),
          n('back0', 'PageStackNavigateBack', { backActions: 'Save,Cancel', results: 'name,ok' }),
          n('back1', 'PageStackNavigateBack', { backActions: 'Save', results: 'ok' })
        ],
        connections: [w('ci', 'id', 't', 'text'), w('ci', 'n', 'num', 'value')]
      },
      {
        name: '/Popups/Dialog',
        nodes: [
          n('ci', 'Component Inputs', {}, out(['title', 'n'])),
          n('co', 'Component Outputs', {}, into(['ok'])),
          n('t', 'Text'),
          n('num', 'Number'),
          n('sw', 'Switch'),
          n('close0', 'NavigationClosePopup', { closeActions: 'Save,Cancel', results: 'name,ok' }),
          n('close1', 'NavigationClosePopup', { closeActions: 'Save', results: 'ok' })
        ],
        connections: [w('ci', 'title', 't', 'text'), w('ci', 'n', 'num', 'value'), w('sw', 'state', 'co', 'ok')]
      },
      {
        name: '/Rows/Row',
        nodes: [
          n('ci', 'Component Inputs', {}, out(['id', 'label', 'go'])),
          n('co', 'Component Outputs', {}, into(['Id', 'Label', 'Tapped'])),
          n('t1', 'Text'),
          n('t2', 'Text'),
          n('s1', 'String'),
          n('s2', 'String'),
          n('c', 'Counter'),
          n('b', 'net.noodl.controls.button')
        ],
        connections: [
          w('ci', 'id', 't1', 'text'),
          w('ci', 'label', 't2', 'text'),
          w('ci', 'go', 'c', 'increase'),
          w('s1', 'savedValue', 'co', 'Id'),
          w('s2', 'savedValue', 'co', 'Label'),
          w('b', 'onClick', 'co', 'Tapped')
        ]
      }
    ]
  };
}

const SYNTHETIC: Array<[string, PortProject]> = [
  ['(synthetic) pages, a popup and a row', pagesProject()],
  ['(synthetic) two backends, legacy', twoBackends(1)],
  ['(synthetic) two backends, converged', twoBackends(2)]
];

describe('NSP-020 L5 — portContextFor graded on saved projects', () => {
  const rows = rowsByType();
  const projects = corpus();
  const results = [
    ...projects.flatMap((dir) => {
      const label = path.relative(REPO, dir) || dir;
      try {
        return drive(label, portProjectFromStore(new V2ProjectStore(diskFiles(dir))), rows);
      } catch (e) {
        return [{ project: label, type: '(project)', id: '-', hookDiffs: [], error: `unreadable: ${(e as Error).message}` }];
      }
    }),
    ...SYNTHETIC.map(([label, project]) => drive(label, project, rows)).flat()
  ];

  it('reads a corpus', () => {
    process.stdout.write(`\n[nsp-020 L5] ${projects.length} projects, ${results.length} nodes with a row and a spec\n`);
    expect(projects.length).toBeGreaterThan(0);
    expect(results.length).toBeGreaterThan(0);
  });

  it('prints the three comparisons by type', () => {
    const byType = new Map<string, NodeResult[]>();
    for (const r of results) byType.set(r.type, [...(byType.get(r.type) ?? []), r]);
    const lines: string[] = [];
    for (const [type, rs] of [...byType].sort()) {
      const cached = rs.filter((r) => r.cacheDiffs);
      lines.push(
        `${type.padEnd(34)} nodes ${String(rs.length).padStart(4)}  (A) clean ${String(rs.filter((r) => !r.error && !r.hookDiffs.length).length).padStart(4)}` +
          `  cached ${String(cached.length).padStart(4)}  (B) clean ${String(cached.filter((r) => !r.cacheDiffs!.length).length).padStart(4)}` +
          `  (C) hook=cache ${String(cached.filter((r) => r.hookIsCache).length).padStart(4)}  errors ${rs.filter((r) => r.error).length}`
      );
    }
    const tallied = (pick: (r: NodeResult) => string[]) => {
      const m = new Map<string, number>();
      for (const r of results) for (const d of pick(r)) m.set(r.type + ' | ' + d, (m.get(r.type + ' | ' + d) ?? 0) + 1);
      return [...m].sort((a, b) => b[1] - a[1]);
    };
    lines.push('', '(A) hook vs spec+builder, by line:');
    for (const [d, n] of tallied((r) => r.hookDiffs).slice(0, 80)) lines.push(`  ${String(n).padStart(4)}  ${d}`);
    lines.push('', '(B) cache vs spec+builder where the hook agrees with the cache, by line:');
    for (const [d, n] of tallied((r) => (r.hookIsCache ? r.cacheDiffs ?? [] : [])).slice(0, 80)) lines.push(`  ${String(n).padStart(4)}  ${d}`);
    lines.push('', '(C) stale caches — the cache vs spec+builder where the hook does NOT agree with the cache, by line:');
    for (const [d, n] of tallied((r) => (r.cacheDiffs && !r.hookIsCache ? r.cacheDiffs : [])).slice(0, 40)) lines.push(`  ${String(n).padStart(4)}  ${d}`);
    lines.push('', 'reach — nodes whose (A) a missing field turns red:');
    for (const f of BUILT_FIELDS) lines.push(`  ${f.padEnd(14)} ${results.filter((r) => r.graded?.includes(f)).length}`);
    lines.push('', 'ms by type:');
    for (const [t, ms] of [...spent].sort((a, b) => b[1] - a[1]).slice(0, 8)) lines.push(`  ${String(ms).padStart(7)}  ${t}`);
    lines.push('', 'errors:');
    for (const r of results.filter((x) => x.error).slice(0, 20)) lines.push(`  ${r.project} ${r.type} ${r.id}: ${r.error}`);
    process.stdout.write('\n' + lines.join('\n') + '\n');
  });

  it('(A) the hook on the saved project draws what the spec draws from portContextFor — on every node', () => {
    expect(results.filter((r) => r.error).map((r) => `${r.project} ${r.type} ${r.id}: ${r.error}`)).toEqual([]);
    expect(results.flatMap((r) => r.hookDiffs.map((d) => `${r.project} ${r.type} ${r.id} | ${d}`))).toEqual([]);
  });

  it('the saved pages project gives oracle (a)\'s PROJECT: interfaces typed by their wires, the nodes inside, the unnamed stack as Main', () => {
    const ctx = portContextReader(pagesProject(), { portType: catalogPortType })('push1');
    const want = PROJECT.components!;
    const face = (name: string) => {
      const c = ctx.components![name];
      return { inputs: c.inputs, outputs: c.outputs, nodes: Object.fromEntries(Object.entries(c.nodes ?? {}).filter(([t]) => t === 'PageStackNavigateBack' || t === 'NavigationClosePopup')) };
    };
    expect(face('/Pages/Detail')).toEqual({ ...want.Detail, nodes: want.Detail.nodes });
    expect(face('/Popups/Dialog')).toEqual({ ...want.Dialog, nodes: want.Dialog.nodes });
    expect(face('/Rows/Row')).toEqual({ ...want.Row, nodes: {} });
    expect(ctx.stacks).toEqual([{ name: 'Main', pages: ['home', 'detail'], components: { home: '/Pages/Home', detail: '/Pages/Detail' }, labels: { home: 'Home', detail: 'Detail' } }]);
  });

  it('REACH — every field the builder fills is graded on some node (dropping it turns that node red)', () => {
    expect(BUILT_FIELDS.filter((f) => !results.some((r) => r.graded?.includes(f)))).toEqual([]);
  });

  it('every drive pin is still produced (a fixed one comes out)', () => {
    expect(Object.keys(DRIVE_PINS).filter((pin) => !pinsSeen.has(pin))).toEqual([]);
  });

  it('(B) where the editor\'s cached ports are the hook\'s, the spec draws them too', () => {
    expect(results.filter((r) => r.hookIsCache).flatMap((r) => (r.cacheDiffs ?? []).map((d) => `${r.project} ${r.type} ${r.id} | ${d}`))).toEqual([]);
  });
});
