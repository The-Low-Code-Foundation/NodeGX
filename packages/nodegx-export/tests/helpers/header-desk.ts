import { Desk, Graph, RawNode, placeAll, writeDeskProject } from './root-desk';
import { DROP_SCRIPT, SHOW_SCRIPT, button, logicGraph, storeGraph } from './store-desk';

/**
 * "Header Desk" (P18 session 141, EXP-021): rocket-school's Header, smallest. `a-header-writes-the-store.test.ts` grades it
 * against the runtime's own nodes (`runtime-mounted-arm.js`, with the runtime's Global Store, Subscribe and Set), predicted
 * first in `dev-docs/tasks/phase-18-code-export-v2/s141-header-app/EXPECTED.md`.
 *
 * - **Store** and **Show**: the Store Desk's (App store less its kit node; the page's one Text reads Show's `line`).
 * - **Mark** (`/Logic/Mark`): Update settings' shape — the app in, a new app out with the tag appended, then `done`.
 * - **Drop** (`/Logic/Drop`): Delete profile's shape, the Store Desk's.
 * - **Header** (`/Form/Header`, drawn): places Mark twice (tags `a` and `b`, as the Header places Update settings for a
 *   setting and for the edited player) and Drop once, each run by its own button. All three `app`s feed the Header's one
 *   output `app`, all three `done`s its `write`: the Header's three wires into one Component Outputs port.
 * - **Solo** (`/Form/Solo`, drawn): one Mark (tag `s`), its `app` the component's output `app`, its `done` the output
 *   `write`: a single pass-through, with the pulse its own run sends.
 *
 * The page hands each the store's `app` and wires each one's `app` and `write` into the Store's, as rocket-school's pages
 * wire the Header. The logic components are written as the templates write them: registry type `visual`, no visual root.
 */

export const MARK_SCRIPT =
  'var a = Inputs.app && Array.isArray(Inputs.app.items) ? Inputs.app.items : [];\nOutputs.app = { items: a.concat([String(Inputs.tag)]) };\nOutputs.done();';

const APP_IN = { name: 'app', type: 'object' };
const RUN_IN = { name: 'run', type: 'signal' };
const APP_OUT = { name: 'app', type: 'object' };
const DONE_OUT = { name: 'done', type: 'signal' };

/** A drawn component placing `marks` (id → tag) and, with `drop`, one Drop; one button each; every `app` and `done` out. */
const writerGraph = (prefix: string, title: string, writers: Array<{ id: string; type: string; tag?: string; press: string }>): Graph => ({
  nodes: placeAll([
    { id: `${prefix}In`, type: 'Component Inputs', label: 'The store', parameters: {}, ports: [{ name: 'app', plug: 'output', type: 'object' }] },
    { id: `${prefix}Root`, type: 'Group', label: title, children: writers.map((w) => `${w.id}Btn`), parameters: { flexDirection: 'row' } },
    ...writers.map((w): RawNode => button(`${w.id}Btn`, w.press, `${prefix}Root`)),
    ...writers.map((w): RawNode => ({ id: w.id, type: w.type, label: w.press, parameters: w.tag === undefined ? {} : { tag: w.tag } })),
    {
      id: `${prefix}Out`,
      type: 'Component Outputs',
      label: 'The app, and write',
      parameters: {},
      ports: [
        { name: 'app', plug: 'input', type: 'object' },
        { name: 'write', plug: 'input', type: 'signal' }
      ]
    }
  ]),
  connections: writers.flatMap((w) => [
    { fromId: `${prefix}In`, fromProperty: 'app', toId: w.id, toProperty: 'app' },
    { fromId: `${w.id}Btn`, fromProperty: 'onClick', toId: w.id, toProperty: 'run' },
    { fromId: w.id, fromProperty: 'app', toId: `${prefix}Out`, toProperty: 'app' },
    { fromId: w.id, fromProperty: 'done', toId: `${prefix}Out`, toProperty: 'write' }
  ])
});

export interface HeaderDeskOpts {
  /** Place the Header (three writers into one output). Default true. */
  header?: boolean;
  /** Place Solo (one writer passed through). Default true. */
  solo?: boolean;
  /**
   * The Header's Drop is a `/Logic/Twice` instead: two Functions on one run into its own `app` (the Store Desk's Bad shape,
   * which the export refuses), so one of the Header's three writers does not lift.
   */
  unlifted?: boolean;
}

/** Two Functions run by one `run`, both into `app` (refused: the order is the runtime's), the second's `done` out. */
const twiceGraph = (): Graph => ({
  nodes: placeAll([
    { id: 'twIn', type: 'Component Inputs', label: 'Inputs', parameters: {}, ports: [{ name: 'app', plug: 'output', type: 'object' }, { name: 'run', plug: 'output', type: 'signal' }] },
    fn('twA', 'First', DROP_SCRIPT, ['app'], ['app'], ['done']),
    fn('twB', 'Second', DROP_SCRIPT, ['app'], ['app'], ['done']),
    {
      id: 'twOut',
      type: 'Component Outputs',
      label: 'Outputs',
      parameters: {},
      ports: [
        { name: 'app', plug: 'input', type: 'object' },
        { name: 'done', plug: 'input', type: 'signal' }
      ]
    }
  ]),
  connections: [
    { fromId: 'twIn', fromProperty: 'app', toId: 'twA', toProperty: 'in-app' },
    { fromId: 'twIn', fromProperty: 'app', toId: 'twB', toProperty: 'in-app' },
    { fromId: 'twIn', fromProperty: 'run', toId: 'twA', toProperty: 'run' },
    { fromId: 'twIn', fromProperty: 'run', toId: 'twB', toProperty: 'run' },
    { fromId: 'twA', fromProperty: 'out-app', toId: 'twOut', toProperty: 'app' },
    { fromId: 'twB', fromProperty: 'out-app', toId: 'twOut', toProperty: 'app' },
    { fromId: 'twB', fromProperty: 'out-done', toId: 'twOut', toProperty: 'done' }
  ]
});

/** A Function with its run wired (run-on-change boxes off, as the editor's load leaves a Run-wired one). */
const fn = (id: string, label: string, script: string, inputs: string[], outputs: string[], signals: string[]): RawNode => ({
  id,
  type: 'JavaScriptFunction',
  label,
  parameters: { functionScript: script, ...Object.fromEntries(inputs.map((i) => [`runOnChange-in-${i}`, false])) },
  ports: [
    ...inputs.map((name) => ({ name: `in-${name}`, plug: 'input' as const, type: '*' })),
    ...outputs.map((name) => ({ name: `out-${name}`, plug: 'output' as const, type: '*' })),
    ...signals.map((name) => ({ name: `out-${name}`, plug: 'output' as const, type: 'signal' }))
  ]
});

const homeGraph = ({ header = true, solo = true }: HeaderDeskOpts): Graph => {
  const placed = [...(header ? ['header'] : []), ...(solo ? ['solo'] : [])];
  return {
    nodes: placeAll([
      { id: 'page', type: 'Page', label: 'Home', parameters: { title: 'Header Desk', urlPath: 'home' }, children: ['shell'] },
      { id: 'shell', type: 'Group', label: 'Shell', parent: 'page', children: ['lineText', ...placed], parameters: { flexDirection: 'column' } },
      { id: 'lineText', type: 'Text', label: 'line', parent: 'shell', parameters: {} },
      ...(header ? [{ id: 'header', type: '/Form/Header', label: 'Header', parent: 'shell', parameters: {} }] : []),
      ...(solo ? [{ id: 'solo', type: '/Form/Solo', label: 'Solo', parent: 'shell', parameters: {} }] : []),
      { id: 'store', type: '/Logic/Store', label: 'The store', parameters: {} },
      { id: 'show', type: '/Logic/Show', label: 'Show', parameters: {} }
    ]),
    connections: [
      { fromId: 'store', fromProperty: 'app', toId: 'show', toProperty: 'app' },
      ...placed.flatMap((id) => [
        { fromId: 'store', fromProperty: 'app', toId: id, toProperty: 'app' },
        { fromId: id, fromProperty: 'app', toId: 'store', toProperty: 'app' },
        { fromId: id, fromProperty: 'write', toId: 'store', toProperty: 'write' }
      ]),
      { fromId: 'show', fromProperty: 'line', toId: 'lineText', toProperty: 'text' }
    ]
  };
};

/** The desk. */
export const headerDesk = (opts: HeaderDeskOpts = {}): Desk => ({
  components: {
    'Pages/Home': homeGraph(opts),
    'Logic/Store': storeGraph(),
    'Logic/Show': logicGraph('sh', SHOW_SCRIPT, [APP_IN], [{ name: 'line', type: 'string' }]),
    'Logic/Mark': logicGraph('mk', MARK_SCRIPT, [APP_IN, { name: 'tag', type: 'string' }, RUN_IN], [APP_OUT, DONE_OUT]),
    'Logic/Drop': logicGraph('dr', DROP_SCRIPT, [APP_IN, RUN_IN], [APP_OUT, DONE_OUT]),
    'Form/Header': writerGraph('hd', 'Header', [
      { id: 'markA', type: '/Logic/Mark', tag: 'a', press: 'Mark A' },
      { id: 'markB', type: '/Logic/Mark', tag: 'b', press: 'Mark B' },
      { id: 'hdDrop', type: opts.unlifted === true ? '/Logic/Twice' : '/Logic/Drop', press: 'Header drop' }
    ]),
    ...(opts.unlifted === true ? { 'Logic/Twice': twiceGraph() } : {}),
    'Form/Solo': writerGraph('so', 'Solo', [{ id: 'soMark', type: '/Logic/Mark', tag: 's', press: 'Solo' }])
  }
});

/** The desk written as a v2 project, into `dir` (or a new temporary folder), after `edit`. */
export const writeHeaderDesk = (opts: HeaderDeskOpts & { edit?: (d: Desk) => void } = {}, dir?: string): { dir: string; desk: Desk } => {
  const desk = headerDesk(opts);
  opts.edit?.(desk);
  return { dir: writeDeskProject(desk, { name: 'Header Desk', idBase: 'b8d20e00-0000-4000-8000-0000000141', prefix: 'header-desk-' }, dir), desk };
};

/**
 * P18-S141-MOUNTEDIN. s126's Root Desk (`root-desk.ts`, `writeDesk(edit)`) with two more placements on its page: **Ask**
 * declares `mounted` among its inputs and mounts its root on `m === true` (rocket-school's New player form and Confirm),
 * placed with Mounted wired from the Variable `open`; **Unless** mounts its root on `m !== false` (the Choice row's and the
 * Editor's form), placed with nothing wired.
 */
export const addAskAndUnless = (desk: Desk): void => {
  const gated = (prefix: string, words: string, expression: string): Graph => ({
    nodes: placeAll([
      { id: `${prefix}Root`, type: 'Group', label: words, children: [`${prefix}Text`], parameters: {} },
      { id: `${prefix}Text`, type: 'Text', label: `${words} text`, parent: `${prefix}Root`, parameters: { text: `the ${words.toLowerCase()}` } },
      { id: `${prefix}In`, type: 'Component Inputs', label: 'Inputs', parameters: {}, ports: [{ name: 'mounted', plug: 'output', type: 'boolean' }] },
      { id: `${prefix}Shown`, type: 'Expression', label: 'Shown?', parameters: { expression } }
    ]),
    connections: [
      { fromId: `${prefix}In`, fromProperty: 'mounted', toId: `${prefix}Shown`, toProperty: 'm' },
      { fromId: `${prefix}Shown`, fromProperty: 'result', toId: `${prefix}Root`, toProperty: 'mounted' }
    ]
  });
  desk.components['Components/Ask'] = gated('ak', 'Ask', 'm === true');
  desk.components['Components/Unless'] = gated('ul', 'Unless', 'm !== false');
  const home = desk.components['Pages/Home'];
  const shell = home.nodes.find((n) => n.id === 'shell')!;
  shell.children = [...(shell.children ?? []), 'ask', 'unless'];
  home.nodes.push(
    ...placeAll([
      { id: 'ask', type: '/Components/Ask', label: 'Ask', parent: 'shell', parameters: {} },
      { id: 'unless', type: '/Components/Unless', label: 'Unless', parent: 'shell', parameters: {} }
    ])
  );
  home.connections.push({ fromId: 'openVar', fromProperty: 'value', toId: 'ask', toProperty: 'mounted' });
};
