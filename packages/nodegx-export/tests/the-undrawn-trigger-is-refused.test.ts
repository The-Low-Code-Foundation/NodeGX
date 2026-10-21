import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { Catalog, CatalogIndex, loadCatalog } from '../src/catalog';
import { ComponentPlan, planProject } from '../src/analyze/plan';
import { emitApp, EmittedApp } from '../src/emit/emitApp';
import { parseProject } from '../src/parse/parseProject';
import { typecheckEmittedApp } from './helpers/typecheckApp';

/**
 * A trigger the export never runs is refused by name (P18 session 124, BOARD lane 6, EXP-011 §91): P18-S123-UNDRAWNTRIGGER
 * and P18-S122-DEADROW, decided after the render, attach and lift passes.
 *
 * Before: a chain on an element the export removes from the tree (its Mounted, or an element's above it, authored false
 * with nothing the export carries to mount it, or bound to a statically false value) was compiled, its nodes counted
 * "collapsed" into the element, and never printed where anything could run it. A Did Mount on an element a value mounts
 * was the same (the emitter refused it, the plan counted it). And a Function's §4f row whose run never attaches (its Run
 * from a refused Query's Fetched, or only from such an element) was read by drawn elements that showed nothing, for ever,
 * with no note. In the shipped templates: 151 nodes in 9 templates (members-area's moderator Remove, the band's menu,
 * gram's and the marketplace's refusal pages, nightbook's Tonight panels) and 11 printed rows never written (members-area's
 * Landing 8 reads).
 *
 * Now `planProject` plans every component, lifts, and then asks each plan which of its triggers never run
 * (`unreachedTriggersOf`); a component with any is planned again with them refused up front, so every pass that earns by
 * attachment decides with them gone. A node another trigger also runs keeps its disposition. A dead row's drawn readers
 * drop their wire with the Function's sentence; its other readers (a handler, a Function's input) keep reading, and the
 * report says so.
 *
 * The fixture is built here, in a temporary folder, so the corpus golden (hls001) does not move.
 */

const catalog: Catalog = loadCatalog();
const T = '2026-10-19T12:00:00.000Z';

interface RawNode {
  id: string;
  type: string;
  label?: string;
  parent?: string;
  children?: string[];
  parameters: Record<string, unknown>;
  ports?: Array<{ name: string; plug: 'input' | 'output'; type: string }>;
  x?: number;
  y?: number;
}
interface RawWire {
  fromId: string;
  fromProperty: string;
  toId: string;
  toProperty: string;
}
interface Graph {
  nodes: RawNode[];
  connections: RawWire[];
}

const fnPorts = (ins: string[], outs: string[], signals: string[] = []) => [
  ...ins.map((n) => ({ name: `in-${n}`, plug: 'input' as const, type: '*' })),
  ...outs.map((n) => ({ name: `out-${n}`, plug: 'output' as const, type: '*' })),
  ...signals.map((n) => ({ name: `out-${n}`, plug: 'output' as const, type: 'signal' }))
];

/** The page: one drawn button, and four triggers the export never runs, each beside a node a drawn trigger shares. */
const homeGraph = (): Graph => {
  const nodes: RawNode[] = [];
  const connections: RawWire[] = [];
  let y = 40;
  const node = (n: RawNode) => nodes.push({ x: n.parent !== undefined ? 100 : 700, y: (y += 80), ...n });
  const wire = (fromId: string, fromProperty: string, toId: string, toProperty: string) =>
    connections.push({ fromId, fromProperty, toId, toProperty });
  const shell = ['liveBtn', 'wordText', 'countText', 'keptText', 'panel', 'box', 'fed', 'badge', 'modPanel'];
  node({ id: 'page', type: 'Page', label: 'Home', parameters: { title: 'Undrawn Desk', urlPath: 'home' }, children: ['shell'] });
  node({ id: 'shell', type: 'Group', label: 'Shell', parent: 'page', children: shell, parameters: { flexDirection: 'column' } });
  node({ id: 'liveBtn', type: 'net.noodl.controls.button', label: 'Live', parent: 'shell', parameters: { label: 'Live' } });
  node({ id: 'wordText', type: 'Text', label: 'Word', parent: 'shell', parameters: {} });
  node({ id: 'countText', type: 'Text', label: 'Count', parent: 'shell', parameters: {} });
  node({ id: 'keptText', type: 'Text', label: 'Kept', parent: 'shell', parameters: {} });
  // 1. Authored Mounted false, and nothing mounts it.
  node({ id: 'panel', type: 'Group', label: 'Panel', parent: 'shell', children: ['goBtn'], parameters: { mounted: false } });
  node({ id: 'goBtn', type: 'net.noodl.controls.button', label: 'Go', parent: 'panel', parameters: { label: 'Go' } });
  // 2. Authored Mounted false, and the wire that mounts it is not exported (a Function the export refuses).
  node({ id: 'box', type: 'Group', label: 'Box', parent: 'shell', children: ['boxBtn'], parameters: { mounted: false } });
  node({ id: 'boxBtn', type: 'net.noodl.controls.button', label: 'Box button', parent: 'box', parameters: { label: 'Box' } });
  // 3. Mounted by a value: drawn when it says, so its child's Did Mount is not a mount effect.
  node({ id: 'fed', type: 'Group', label: 'Fed', parent: 'shell', children: ['mountMe'], parameters: {} });
  node({ id: 'mountMe', type: 'Group', label: 'Mount me', parent: 'fed', parameters: {} });
  // 4. Authored Mounted false, mounted by an instance output its component does not lift (members-area's isModerator).
  node({ id: 'badge', type: '/Components/Badge', label: 'Badge', parent: 'shell', parameters: {} });
  node({ id: 'modPanel', type: 'Group', label: 'Moderator tools', parent: 'shell', children: ['modBtn'], parameters: { mounted: false } });
  node({ id: 'modBtn', type: 'net.noodl.controls.button', label: 'Remove', parent: 'modPanel', parameters: { label: 'Remove' } });

  node({ id: 'shared', type: 'Set Variable', label: 'Say live', parameters: { name: 'said', value: 'live' } });
  node({ id: 'goSet', type: 'Set Variable', label: 'Say went', parameters: { name: 'went', value: 'yes' } });
  node({ id: 'rowFn', type: 'JavaScriptFunction', label: 'Word', parameters: { functionScript: "Outputs.word = 'hello';" }, ports: fnPorts([], ['word']) });
  node({ id: 'flagFn', type: 'JavaScriptFunction', label: 'Flag', parameters: { functionScript: 'Outputs.show = Noodl.Objects.flags.open;' }, ports: fnPorts([], ['show']) });
  node({ id: 'boxSet', type: 'Set Variable', label: 'Say boxed', parameters: { name: 'boxed', value: 'yes' } });
  node({ id: 'flagVar', type: 'Variable2', label: 'Flag value', parameters: { name: 'flag' } });
  node({ id: 'mountSet', type: 'Set Variable', label: 'Say mounted', parameters: { name: 'mountedSaid', value: 'yes' } });
  node({ id: 'query', type: 'DbCollection2', label: 'Notes', parameters: { collectionName: 'Note' } });
  node({ id: 'queryFn', type: 'JavaScriptFunction', label: 'Count', parameters: { functionScript: 'Outputs.count = String((Inputs.rows || []).length);' }, ports: fnPorts(['rows'], ['count']) });
  node({ id: 'useFn', type: 'JavaScriptFunction', label: 'Keep the count', parameters: { functionScript: "Outputs.kept = 'kept ' + Inputs.count;", 'runOnChange-in-count': false }, ports: fnPorts(['count'], ['kept']) });
  node({ id: 'keptSet', type: 'Set Variable', label: 'Keep it', parameters: { name: 'kept' } });
  node({ id: 'keptVar', type: 'Variable2', label: 'Kept value', parameters: { name: 'kept' } });
  node({ id: 'modSet', type: 'Set Variable', label: 'Say removed', parameters: { name: 'removed', value: 'yes' } });

  wire('liveBtn', 'onClick', 'shared', 'do');
  wire('goBtn', 'onClick', 'shared', 'do');
  wire('goBtn', 'onClick', 'goSet', 'do');
  wire('goBtn', 'onClick', 'rowFn', 'run');
  wire('rowFn', 'out-word', 'wordText', 'text');
  wire('flagFn', 'out-show', 'box', 'mounted');
  wire('boxBtn', 'onClick', 'boxSet', 'do');
  wire('flagVar', 'value', 'fed', 'mounted');
  wire('mountMe', 'didMount', 'mountSet', 'do');
  wire('query', 'items', 'queryFn', 'in-rows');
  wire('query', 'fetched', 'queryFn', 'run');
  wire('queryFn', 'out-count', 'countText', 'text');
  wire('queryFn', 'out-count', 'useFn', 'in-count');
  wire('liveBtn', 'onClick', 'useFn', 'run');
  wire('useFn', 'out-kept', 'keptSet', 'value');
  wire('useFn', 'done', 'keptSet', 'do');
  wire('keptVar', 'value', 'keptText', 'text');
  wire('badge', 'isMod', 'modPanel', 'mounted');
  wire('modBtn', 'onClick', 'modSet', 'do');
  return { nodes, connections };
};

/**
 * The Badge: drawn, with an output a Function the export refuses feeds, so the export does not lift it — or, `lifted`,
 * fed by a Variable, which it lifts (CONTROLLED-STATE §4d), and the parent's Mounted is then bound in the lift phase.
 */
const badgeGraph = (lifted = false): Graph => ({
  nodes: [
    { id: 'badgeRoot', type: 'Group', label: 'Badge', children: ['badgeText'], parameters: {}, x: 40, y: 40 },
    { id: 'badgeText', type: 'Text', label: 'Badge text', parent: 'badgeRoot', parameters: { text: 'A member' }, x: 100, y: 120 },
    lifted
      ? { id: 'isModFn', type: 'Variable2', label: 'Is a moderator', parameters: { name: 'moderator' }, x: 700, y: 120 }
      : { id: 'isModFn', type: 'JavaScriptFunction', label: 'Is a moderator', parameters: { functionScript: 'Outputs.mod = Noodl.Objects.flags.moderator === true;' }, ports: fnPorts([], ['mod']), x: 700, y: 120 },
    { id: 'badgeOut', type: 'Component Outputs', label: 'Badge outputs', parameters: {}, ports: [{ name: 'isMod', plug: 'input', type: '*' }], x: 700, y: 200 }
  ],
  connections: [{ fromId: 'isModFn', fromProperty: lifted ? 'value' : 'out-mod', toId: 'badgeOut', toProperty: 'isMod' }]
});

const write = (root: string, rel: string, data: unknown) => {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

/** The project in a temporary folder, the page edited first. */
const fixtureWith = (edit?: (g: Graph) => void, liftedBadge = false): { dir: string; graph: Graph } => {
  const graph = homeGraph();
  edit?.(graph);
  const badge = badgeGraph(liftedBadge);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'undrawn-desk-'));
  write(dir, 'nodegx.project.json', {
    $schema: 'https://opennoodl.dev/schemas/project-v2.json', name: 'Undrawn Desk', id: 'b8d20e00-0000-4000-8000-000000000801',
    version: '4', nodegxVersion: '0.2.0', runtimeVersion: 'react19', created: T, modified: T,
    settings: { htmlTitle: 'Undrawn Desk', navigationPathType: 'path' }, structure: { componentsDir: 'components' }
  });
  const components: Record<string, { id: string; type: string; graph: Graph; roots: string[] }> = {
    App: { id: 'b8d20e00-0000-4000-8000-000000000802', type: 'root', roots: ['router'], graph: {
      nodes: [{ id: 'router', type: 'Router', label: 'Main Router', parameters: { name: 'Main', pages: { startPage: '/Pages/Home', routes: ['/Pages/Home'] } }, x: 40, y: 40 }],
      connections: [] } },
    'Pages/Home': { id: 'b8d20e00-0000-4000-8000-000000000803', type: 'page', roots: ['page'], graph },
    'Components/Badge': { id: 'b8d20e00-0000-4000-8000-000000000804', type: 'visual', roots: ['badgeRoot'], graph: badge }
  };
  write(dir, 'components/_registry.json', {
    $schema: 'https://opennoodl.dev/schemas/registry-v2.json', version: 1, lastUpdated: T,
    components: Object.fromEntries(Object.entries(components).map(([p, c]) => [p, { path: p, type: c.type, nodeCount: c.graph.nodes.length, connectionCount: c.graph.connections.length, created: T, modified: T }]))
  });
  for (const [p, c] of Object.entries(components)) {
    write(dir, `components/${p}/component.json`, { $schema: 'https://opennoodl.dev/schemas/component-v2.json', id: c.id, name: p.split('/').pop(), path: `/${p}`, type: c.type, modified: T });
    write(dir, `components/${p}/nodes.json`, { $schema: 'https://opennoodl.dev/schemas/nodes-v2.json', componentId: c.id, version: 1, nodes: c.graph.nodes, visualRoots: c.roots });
    write(dir, `components/${p}/connections.json`, { $schema: 'https://opennoodl.dev/schemas/connections-v2.json', componentId: c.id, version: 1, connections: c.graph.connections });
  }
  return { dir, graph };
};

const PAGE = 'src/pages/Home.tsx';
const planOf = (dir: string): ComponentPlan => planProject(parseProject(dir, catalog), new CatalogIndex(catalog)).byLegacyPath.get('/Pages/Home')!;
const emitDir = (dir: string): EmittedApp => emitApp(parseProject(dir, catalog), catalog);
const reasonOf = (plan: ComponentPlan, id: string): string | undefined => {
  const d = plan.dispositions[id];
  return d?.kind === 'deferred' ? d.reason : undefined;
};
const droppedReason = (plan: ComponentPlan, key: string): string | undefined => plan.droppedWires.find((w) => w.key === key)?.reason;

const NOT_DRAWN_GO = 'its trigger, "Go" (goBtn), is not drawn: an element above it, "Panel" (panel), is authored Mounted false, and nothing mounts it';
const NOT_RUN_MOUNT =
  'its trigger, the Did Mount of "Mount me" (mountMe), is not run: an element above it, "Fed" (fed), is mounted by a value, so its Did Mount fires when that value says, and a mount effect runs when the component mounts';

const main = fixtureWith();
const plan = planOf(main.dir);
const app = emitDir(main.dir);
const page = app.files[PAGE];
// The control: every trigger drawn — the panel and the box authored mounted, the moderator tools unwired and mounted, the
// Fed group not mounted by a value, and the Count Function run by the drawn button.
const control = fixtureWith((g) => {
  for (const id of ['panel', 'box', 'modPanel']) g.nodes.find((n) => n.id === id)!.parameters.mounted = true;
  g.connections = g.connections.filter(
    (c) => !(c.toProperty === 'mounted' && ['box', 'fed', 'modPanel'].includes(c.toId)) && !(c.fromId === 'query' && c.fromProperty === 'fetched')
  );
  g.connections.push({ fromId: 'liveBtn', fromProperty: 'onClick', toId: 'queryFn', toProperty: 'run' });
});
const controlPlan = planOf(control.dir);
const controlPage = emitDir(control.dir).files[PAGE];

describe('§A A chain on an element the export never draws is refused by name', () => {
  it('A1 a Set Variable only the undrawn button runs is refused, naming the button and the authored Mounted above it', () => {
    expect(reasonOf(plan, 'goSet')).toBe(NOT_DRAWN_GO);
    expect(droppedReason(plan, 'goBtn:onClick->goSet:do')).toBe(NOT_DRAWN_GO);
  });

  it('A2 a node a drawn button also runs keeps its disposition, collapsed into the drawn one', () => {
    expect(plan.dispositions['shared']).toEqual({ kind: 'collapsed', into: 'liveBtn' });
    expect(plan.handlers['liveBtn']?.['onClick']?.length).toBeGreaterThan(0);
  });

  it('A3 no handler is attached to an undrawn element', () => {
    for (const id of ['goBtn', 'boxBtn', 'modBtn']) expect(plan.handlers[id]).toBeUndefined();
  });

  it('A4 a Mounted wire the export does not carry is named, with why', () => {
    const reason = reasonOf(plan, 'boxSet') ?? '';
    expect(reason.startsWith('its trigger, "Box button" (boxBtn), is not drawn: an element above it, "Box" (box), is authored Mounted false, and the wire into its Mounted from "Flag".out-show is not exported (')).toBe(true);
  });

  it('A5 a Mounted bound by an instance output its component does not lift is decided after the lift phase', () => {
    expect(reasonOf(plan, 'modSet')).toBe(
      'its trigger, "Remove" (modBtn), is not drawn: an element above it, "Moderator tools" (modPanel), is authored Mounted false, and the wire into its Mounted from "Badge".isMod is not exported (instance output "isMod" is not lifted by /Components/Badge — its feed defers there)'
    );
  });

  it('A6 a Mounted the lift phase binds keeps its chain: the decision waits for the lift', () => {
    const lifted = planOf(fixtureWith(undefined, true).dir);
    expect(lifted.bindings['modPanel']?.['mounted']).toBeDefined();
    expect(lifted.dispositions['modSet']).toEqual({ kind: 'collapsed', into: 'modBtn' });
  });

  it('A7 the control: every trigger drawn, every chain collapsed into its element', () => {
    expect(controlPlan.dispositions['goSet']).toEqual({ kind: 'collapsed', into: 'goBtn' });
    expect(controlPlan.dispositions['boxSet']).toEqual({ kind: 'collapsed', into: 'boxBtn' });
    expect(controlPlan.dispositions['modSet']).toEqual({ kind: 'collapsed', into: 'modBtn' });
    expect(controlPlan.dispositions['mountSet']).toEqual({ kind: 'collapsed', into: 'mountMe' });
  });
});

describe('§B A Did Mount on an element a value mounts runs when that value mounts it (P18 session 126, EXP-011 §93)', () => {
  it('B1 its chain is kept, and the page runs it keyed on the element\'s render condition (s124 refused it by name)', () => {
    expect(reasonOf(plan, 'mountSet')).toBeUndefined();
    expect(plan.dispositions['mountSet']).toEqual({ kind: 'collapsed', into: 'mountMe' });
    expect(plan.handlers['mountMe']?.['didMount']?.length).toBeGreaterThan(0);
    expect(page).not.toContain(NOT_RUN_MOUNT);
    expect(page).toContain('Mount me — Did Mount: each time it mounts, as the running app sends it: when');
  });
});

describe('§C A row nothing the export runs writes is not read by a drawn element', () => {
  it('C1 a Function run only from the undrawn button: refused, and the drawn Text reading it drops the wire with its sentence', () => {
    expect(reasonOf(plan, 'rowFn')).toBe(NOT_DRAWN_GO);
    expect(droppedReason(plan, 'rowFn:out-word->wordText:text')).toBe(
      `it reads "Word" (rowFn), which the export never runs, so its outputs are never written: its Run is sent only from "Go" (goBtn), which is not drawn: an element above it, "Panel" (panel), is authored Mounted false, and nothing mounts it`
    );
    // The row is still allocated by the run's compile; nothing binds it, so the emitter prints none (D1).
    const row = plan.stateVars.find((v) => v.origin === 'jsfun' && v.originNodeId === 'rowFn')!;
    expect(JSON.stringify(plan.bindings)).not.toContain(`"viaState":"${row.name}"`);
  });

  it('C2 a Function run from a refused Query keeps its own refusal, and its drawn reader says it', () => {
    expect(reasonOf(plan, 'queryFn')).toBe('trigger query.fetched is not a rendered element event or a receiver');
    expect(droppedReason(plan, 'queryFn:out-count->countText:text')).toBe(
      'it reads "Count" (queryFn), which the export never runs, so its outputs are never written: trigger query.fetched is not a rendered element event or a receiver'
    );
  });

  it('C3 a handler reading the same row keeps reading it, and the report says it reads nothing', () => {
    expect(plan.dispositions['useFn']).toEqual({ kind: 'collapsed', into: 'liveBtn' });
    expect(plan.notes).toContain(
      'node queryFn: a handler or a node that is not drawn still reads its outputs, and reads nothing — "Count" (queryFn), which the export never runs, so its outputs are never written: trigger query.fetched is not a rendered element event or a receiver'
    );
  });

  it('C4 the control: the row is written by the click that runs it, and read by the Text', () => {
    expect(controlPlan.dispositions['rowFn']).toEqual({ kind: 'collapsed', into: 'goBtn' });
    expect(controlPlan.droppedWires.some((w) => w.key === 'rowFn:out-word->wordText:text')).toBe(false);
    expect(controlPage).toMatch(/setWordOut\(/);
    expect(controlPage).toMatch(/wordOut\?\.word/);
  });
});

describe('§D What is emitted', () => {
  it('D1 no click handler for the undrawn buttons, no wrapper or row for the Function only they run', () => {
    expect(page).not.toContain('setWordOut');
    expect(page).not.toMatch(/function Word\(/);
    expect(page).not.toContain("'went'");
    expect(page).not.toContain('boxed');
  });

  it('D2 the drawn Text that read the dead row carries the marker, with the sentence', () => {
    expect(page).toContain('the wire into "text", from JavaScriptFunction rowFn.out-word, was dropped: it reads "Word" (rowFn), which the export never runs');
    expect(page).not.toMatch(/wordOut\?\./);
  });

  it('D3 an undrawn element\'s marker says it is not drawn, not that it renders', () => {
    expect(page).toContain('TODO(export): node goBtn is not drawn (an element above it, "Panel" (panel), is authored Mounted false, and nothing mounts it), and part of what the graph');
    expect(page).not.toContain('TODO(export): node goBtn renders');
  });

  it('D4 the emitted app and the control typecheck', () => {
    expect(typecheckEmittedApp(app)).toEqual([]);
    expect(typecheckEmittedApp(emitDir(control.dir))).toEqual([]);
  });
});
