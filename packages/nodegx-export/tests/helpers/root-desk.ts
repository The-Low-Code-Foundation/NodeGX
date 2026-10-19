import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * "Root Desk" (P18 session 126, EXP-011 §93): a page that places components whose ROOT's Mounted is wired, built in a
 * temporary folder so the corpus golden (hls001) does not move. `the-root-is-mounted-when-it-says.test.ts` grades it
 * against the runtime's own nodes; `dev-docs/tasks/phase-18-code-export-v2/s126-mounted/write-desk.ts` writes it out for a
 * drive.
 *
 * The page: Open and Close set the Variable `open`; Reset clears `seen`. Every Text is a `<p>` in the export and a Text
 * node in the runtime; both arms read the drawn Texts in document order.
 *
 * - **Sheet**: placed with its `shown` input wired from `open`. Its root is authored Mounted false (todo-list's Note dialog,
 *   bot-garden's Form) and mounted from the Component Inputs `shown`. Inside: a Text, a button "Inside" (sets `said`), and a
 *   Group whose Did Mount sets `seen` (a trigger under a root a value mounts), and a field whose Value goes to `named` (it
 *   announces its start value as it mounts: TextInput.tsx componentDidMount).
 * - **Card**: placed with nothing passed to `shown`; its root's Mounted is the default (true) and wired from `shown`
 *   (planning's sheets). The runtime never delivers `undefined` over a wire, so the root keeps its own Mounted.
 * - **Ghost**: the same, its root authored Mounted false: never delivered, never drawn.
 * - **Gate**: its root mounted by an Expression over the Variable `open` read inside it (rocket-school's Choice row).
 * - **Flag box**, on the page itself, not a root: its Mounted is the default and wired from a Variable nothing sets.
 */

export interface RawNode {
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
export interface RawWire {
  fromId: string;
  fromProperty: string;
  toId: string;
  toProperty: string;
}
export interface Graph {
  nodes: RawNode[];
  connections: RawWire[];
}
export interface Desk {
  /** Component path (no leading slash) → its graph. */
  components: Record<string, Graph>;
}

const T = '2026-10-19T12:00:00.000Z';

export const placeAll = (nodes: RawNode[]): RawNode[] => {
  let y = 40;
  for (const n of nodes) {
    n.x = n.x ?? (n.parent !== undefined || n.children !== undefined ? 100 : 700);
    n.y = n.y ?? (y += 80);
  }
  return nodes;
};

const homeGraph = (): Graph => {
  const shell = ['openBtn', 'closeBtn', 'resetBtn', 'saidText', 'seenText', 'namedText', 'flagBox', 'sheet', 'card', 'ghost', 'gate'];
  const nodes: RawNode[] = [
    { id: 'page', type: 'Page', label: 'Home', parameters: { title: 'Root Desk', urlPath: 'home' }, children: ['shell'] },
    { id: 'shell', type: 'Group', label: 'Shell', parent: 'page', children: shell, parameters: { flexDirection: 'column' } },
    { id: 'openBtn', type: 'net.noodl.controls.button', label: 'Open', parent: 'shell', parameters: { label: 'Open' } },
    { id: 'closeBtn', type: 'net.noodl.controls.button', label: 'Close', parent: 'shell', parameters: { label: 'Close' } },
    { id: 'resetBtn', type: 'net.noodl.controls.button', label: 'Reset', parent: 'shell', parameters: { label: 'Reset' } },
    { id: 'saidText', type: 'Text', label: 'Said', parent: 'shell', parameters: {} },
    { id: 'seenText', type: 'Text', label: 'Seen', parent: 'shell', parameters: {} },
    { id: 'namedText', type: 'Text', label: 'Named', parent: 'shell', parameters: {} },
    { id: 'flagBox', type: 'Group', label: 'Flag box', parent: 'shell', children: ['flagText'], parameters: {} },
    { id: 'flagText', type: 'Text', label: 'Flag text', parent: 'flagBox', parameters: { text: 'the flag box' } },
    { id: 'sheet', type: '/Components/Sheet', label: 'Sheet', parent: 'shell', parameters: {} },
    { id: 'card', type: '/Components/Card', label: 'Card', parent: 'shell', parameters: {} },
    { id: 'ghost', type: '/Components/Ghost', label: 'Ghost', parent: 'shell', parameters: {} },
    { id: 'gate', type: '/Components/Gate', label: 'Gate', parent: 'shell', parameters: {} },
    { id: 'openSet', type: 'Set Variable', label: 'Open it', parameters: { name: 'open', value: true } },
    { id: 'closeSet', type: 'Set Variable', label: 'Close it', parameters: { name: 'open', value: false } },
    { id: 'resetSet', type: 'Set Variable', label: 'Forget it', parameters: { name: 'seen', value: 'seen nothing' } },
    { id: 'openVar', type: 'Variable2', label: 'Open?', parameters: { name: 'open' } },
    { id: 'saidVar', type: 'Variable2', label: 'Said', parameters: { name: 'said', value: 'said nothing' } },
    { id: 'seenVar', type: 'Variable2', label: 'Seen', parameters: { name: 'seen', value: 'seen nothing' } },
    { id: 'namedVar', type: 'Variable2', label: 'Named', parameters: { name: 'named', value: 'named nobody' } },
    { id: 'flagVar', type: 'Variable2', label: 'Flag', parameters: { name: 'flag' } }
  ];
  const connections: RawWire[] = [
    { fromId: 'openBtn', fromProperty: 'onClick', toId: 'openSet', toProperty: 'do' },
    { fromId: 'closeBtn', fromProperty: 'onClick', toId: 'closeSet', toProperty: 'do' },
    { fromId: 'resetBtn', fromProperty: 'onClick', toId: 'resetSet', toProperty: 'do' },
    { fromId: 'saidVar', fromProperty: 'value', toId: 'saidText', toProperty: 'text' },
    { fromId: 'seenVar', fromProperty: 'value', toId: 'seenText', toProperty: 'text' },
    { fromId: 'namedVar', fromProperty: 'value', toId: 'namedText', toProperty: 'text' },
    { fromId: 'openVar', fromProperty: 'value', toId: 'sheet', toProperty: 'shown' },
    { fromId: 'flagVar', fromProperty: 'value', toId: 'flagBox', toProperty: 'mounted' }
  ];
  return { nodes: placeAll(nodes), connections };
};

const inputs = (id: string, names: string[]): RawNode => ({
  id,
  type: 'Component Inputs',
  label: 'Inputs',
  parameters: {},
  ports: names.map((name) => ({ name, plug: 'output' as const, type: 'boolean' }))
});

const sheetGraph = (): Graph => ({
  nodes: placeAll([
    { id: 'shRoot', type: 'Group', label: 'Sheet', children: ['shText', 'shBtn', 'shMount', 'shField'], parameters: { mounted: false } },
    { id: 'shText', type: 'Text', label: 'Sheet text', parent: 'shRoot', parameters: { text: 'the sheet' } },
    { id: 'shBtn', type: 'net.noodl.controls.button', label: 'Inside', parent: 'shRoot', parameters: { label: 'Inside' } },
    { id: 'shMount', type: 'Group', label: 'Mount me', parent: 'shRoot', parameters: {} },
    { id: 'shField', type: 'net.noodl.controls.textinput', label: 'Name box', parent: 'shRoot', parameters: { startValue: 'named Ann' } },
    { id: 'shNamed', type: 'Variable2', label: 'Named', parameters: { name: 'named' } },
    inputs('shIn', ['shown']),
    { id: 'shSay', type: 'Set Variable', label: 'Say inside', parameters: { name: 'said', value: 'said inside' } },
    { id: 'shSeen', type: 'Set Variable', label: 'Say seen', parameters: { name: 'seen', value: 'seen the sheet' } }
  ]),
  connections: [
    { fromId: 'shIn', fromProperty: 'shown', toId: 'shRoot', toProperty: 'mounted' },
    { fromId: 'shBtn', fromProperty: 'onClick', toId: 'shSay', toProperty: 'do' },
    { fromId: 'shMount', fromProperty: 'didMount', toId: 'shSeen', toProperty: 'do' },
    { fromId: 'shField', fromProperty: 'onTextChanged', toId: 'shNamed', toProperty: 'value' }
  ]
});

const plainGraph = (prefix: string, words: string, authoredFalse: boolean): Graph => ({
  nodes: placeAll([
    { id: `${prefix}Root`, type: 'Group', label: words, children: [`${prefix}Text`], parameters: authoredFalse ? { mounted: false } : {} },
    { id: `${prefix}Text`, type: 'Text', label: `${words} text`, parent: `${prefix}Root`, parameters: { text: `the ${words.toLowerCase()}` } },
    inputs(`${prefix}In`, ['shown'])
  ]),
  connections: [{ fromId: `${prefix}In`, fromProperty: 'shown', toId: `${prefix}Root`, toProperty: 'mounted' }]
});

const gateGraph = (): Graph => ({
  nodes: placeAll([
    { id: 'gtRoot', type: 'Group', label: 'Gate', children: ['gtText'], parameters: {} },
    { id: 'gtText', type: 'Text', label: 'Gate text', parent: 'gtRoot', parameters: { text: 'the gate' } },
    { id: 'gtVar', type: 'Variable2', label: 'Open?', parameters: { name: 'open' } },
    { id: 'gtExpr', type: 'Expression', label: 'Is it open', parameters: { expression: 'open === true' } }
  ]),
  connections: [
    { fromId: 'gtVar', fromProperty: 'value', toId: 'gtExpr', toProperty: 'open' },
    { fromId: 'gtExpr', fromProperty: 'result', toId: 'gtRoot', toProperty: 'mounted' }
  ]
});

/** The desk, before any variant's edit. */
export const rootDesk = (): Desk => ({
  components: {
    'Pages/Home': homeGraph(),
    'Components/Sheet': sheetGraph(),
    'Components/Card': plainGraph('cd', 'Card', false),
    'Components/Ghost': plainGraph('gh', 'Ghost', true),
    'Components/Gate': gateGraph()
  }
});

const write = (root: string, rel: string, data: unknown) => {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

/** The desk written as a v2 project, into `dir` (or a new temporary folder), after `edit`. */
export const writeDesk = (edit?: (d: Desk) => void, dir?: string): { dir: string; desk: Desk } => {
  const desk = rootDesk();
  edit?.(desk);
  return { dir: writeDeskProject(desk, { name: 'Root Desk', idBase: 'b8d20e00-0000-4000-8000-0000000009', prefix: 'root-desk-' }, dir), desk };
};

/**
 * Any desk written as a v2 project (P18 session 127 reuses it for the Pulse Desk): its App router lists `/Pages/Home`, a
 * component under `Pages/` is a page and every other one visual. `idBase` is a uuid less its last two digits.
 */
export const writeDeskProject = (desk: Desk, named: { name: string; idBase: string; prefix: string }, dir?: string): string => {
  const at = dir ?? fs.mkdtempSync(path.join(os.tmpdir(), named.prefix));
  write(at, 'nodegx.project.json', {
    $schema: 'https://opennoodl.dev/schemas/project-v2.json', name: named.name, id: `${named.idBase}01`,
    version: '4', nodegxVersion: '0.2.0', runtimeVersion: 'react19', created: T, modified: T,
    settings: { htmlTitle: named.name, navigationPathType: 'path' }, structure: { componentsDir: 'components' }
  });
  const all: Record<string, { type: string; graph: Graph }> = {
    App: {
      type: 'root',
      graph: {
        nodes: [{ id: 'router', type: 'Router', label: 'Main Router', parameters: { name: 'Main', pages: { startPage: '/Pages/Home', routes: ['/Pages/Home'] } }, x: 40, y: 40 }],
        connections: []
      }
    },
    ...Object.fromEntries(Object.entries(desk.components).map(([p, graph]) => [p, { type: p.startsWith('Pages/') ? 'page' : 'visual', graph }]))
  };
  const ids = Object.keys(all);
  write(at, 'components/_registry.json', {
    $schema: 'https://opennoodl.dev/schemas/registry-v2.json', version: 1, lastUpdated: T,
    components: Object.fromEntries(Object.entries(all).map(([p, c]) => [p, { path: p, type: c.type, nodeCount: c.graph.nodes.length, connectionCount: c.graph.connections.length, created: T, modified: T }]))
  });
  for (const [p, c] of Object.entries(all)) {
    const id = `${named.idBase}${String(10 + ids.indexOf(p)).padStart(2, '0')}`;
    const roots = c.graph.nodes.filter((n) => n.parent === undefined && (n.children !== undefined || n.type === 'Router')).map((n) => n.id);
    write(at, `components/${p}/component.json`, { $schema: 'https://opennoodl.dev/schemas/component-v2.json', id, name: p.split('/').pop(), path: `/${p}`, type: c.type, modified: T });
    write(at, `components/${p}/nodes.json`, { $schema: 'https://opennoodl.dev/schemas/nodes-v2.json', componentId: id, version: 1, nodes: c.graph.nodes, visualRoots: roots });
    write(at, `components/${p}/connections.json`, { $schema: 'https://opennoodl.dev/schemas/connections-v2.json', componentId: id, version: 1, connections: c.graph.connections });
  }
  return at;
};
