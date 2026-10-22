import { Desk, Graph, RawNode, placeAll, writeDeskProject } from './root-desk';

/**
 * "Store Desk" (P18 session 139, EXP-021 AC4): rocket-school's write idiom, smallest. `a-persisted-store-travels.test.ts`
 * grades it against the runtime's own nodes (`runtime-mounted-arm.js`, with the runtime's Global Store, Subscribe and Set),
 * predicted first in `dev-docs/tasks/phase-18-code-export-v2/s139-persisted-store/EXPECTED.md`.
 *
 * - **Store** (`/Logic/Store`): App store less its kit node — a Global Store `desk` with Persist on and Storage Key
 *   `store-desk`, a Subscribe of `app` into the output `app`, a Set of `app` (merge off) from the input `app` on `write`.
 * - **Add** (`/Logic/Add`) and **Drop** (`/Logic/Drop`): Save question set's and Delete question set's shape — the app in,
 *   a new app out, then `done`. Both `app`s feed Store's one `app` (last-writer-wins) and both `done`s its `write`.
 * - **Show** (`/Logic/Show`): no Run; the page's one Text reads its `line`.
 * - **Editor** (`/Form/Editor`, drawn): Next counts into **Word** (`/Logic/Word`, no Run), whose `word` goes straight to the
 *   Editor's own output (the pass-through: the Editor's `items` in rocket-school); Save sends `save`, into Add's `run`.
 * - Variant **Bad** (`/Form/Bad`, drawn): Bad write runs two Functions whose `app`s both feed its output `app` (the Header's
 *   shape, which the export refuses), the second's `done` sends `write`; both go into Store's.
 *
 * The logic components are written as the templates write them: registry type `visual`, no visual root.
 */

export const STORE_KEY = 'noodl_store_store-desk';

export const button = (id: string, label: string, parent: string): RawNode => ({ id, type: 'net.noodl.controls.button', label, parent, parameters: { label } });

/** A Function, its run-on-change boxes written out as the editor's load leaves them (the Hook Desk's note, NDA-017). */
const fn = (id: string, label: string, script: string, io: { inputs: string[]; outputs: string[]; signals?: string[]; runWired?: boolean }): RawNode => ({
  id,
  type: 'JavaScriptFunction',
  label,
  parameters: { functionScript: script, ...Object.fromEntries(io.inputs.map((i) => [`runOnChange-in-${i}`, io.runWired !== true])) },
  ports: [
    ...io.inputs.map((name) => ({ name: `in-${name}`, plug: 'input' as const, type: '*' })),
    ...io.outputs.map((name) => ({ name: `out-${name}`, plug: 'output' as const, type: '*' })),
    ...(io.signals ?? []).map((name) => ({ name: `out-${name}`, plug: 'output' as const, type: 'signal' }))
  ]
});

export const ADD_SCRIPT =
  'var a = Inputs.app && Array.isArray(Inputs.app.items) ? Inputs.app.items : [];\nOutputs.app = { items: a.concat([String(Inputs.word)]) };\nOutputs.done();';
export const DROP_SCRIPT = 'var a = Inputs.app && Array.isArray(Inputs.app.items) ? Inputs.app.items : [];\nOutputs.app = { items: a.slice(1) };\nOutputs.done();';
export const SHOW_SCRIPT =
  "var a = Inputs.app && Array.isArray(Inputs.app.items) ? Inputs.app.items : null;\nOutputs.line = a === null ? 'none' : a.length === 0 ? 'empty' : a.join(',');";
export const WORD_SCRIPT = "Outputs.word = 'w' + (Number(Inputs.n) || 0);";
export const BUMP_SCRIPT = 'this.n = (this.n || 0) + 1;\nOutputs.n = this.n;';
export const BAD_A_SCRIPT = "Outputs.app = { items: ['badA'] };";
export const BAD_B_SCRIPT = "Outputs.app = { items: ['bad'] };\nOutputs.done();";

/** A logic component: Component Inputs → one Function → Component Outputs, every port wired straight through (the Hook Desk's). */
export const logicGraph = (prefix: string, script: string, ins: Array<{ name: string; type: string }>, outs: Array<{ name: string; type: string }>): Graph => {
  const valueIns = ins.filter((p) => p.type !== 'signal');
  const signalIns = ins.filter((p) => p.type === 'signal');
  const valueOuts = outs.filter((p) => p.type !== 'signal');
  const signalOuts = outs.filter((p) => p.type === 'signal');
  return {
    nodes: placeAll([
      { id: `${prefix}In`, type: 'Component Inputs', label: 'Inputs', parameters: {}, ports: ins.map((p) => ({ name: p.name, plug: 'output' as const, type: p.type })) },
      fn(`${prefix}Fn`, 'Work', script, { inputs: valueIns.map((p) => p.name), outputs: valueOuts.map((p) => p.name), signals: signalOuts.map((p) => p.name), runWired: signalIns.length > 0 }),
      { id: `${prefix}Out`, type: 'Component Outputs', label: 'Outputs', parameters: {}, ports: outs.map((p) => ({ name: p.name, plug: 'input' as const, type: p.type })) }
    ]),
    connections: [
      ...valueIns.map((p) => ({ fromId: `${prefix}In`, fromProperty: p.name, toId: `${prefix}Fn`, toProperty: `in-${p.name}` })),
      ...signalIns.map((p) => ({ fromId: `${prefix}In`, fromProperty: p.name, toId: `${prefix}Fn`, toProperty: 'run' })),
      ...outs.map((p) => ({ fromId: `${prefix}Fn`, fromProperty: `out-${p.name}`, toId: `${prefix}Out`, toProperty: p.name }))
    ]
  };
};

/** rocket-school's `/Logic/App store`, less the kit node and the outputs nothing here reads. */
export const storeGraph = (): Graph => ({
  nodes: placeAll([
    {
      id: 'stIn',
      type: 'Component Inputs',
      label: 'A write',
      parameters: {},
      ports: [
        { name: 'write', plug: 'output', type: 'signal' },
        { name: 'app', plug: 'output', type: 'object' }
      ]
    },
    { id: 'stStore', type: 'net.noodl.GlobalStore', label: 'The persisted store', parameters: { storeName: 'desk', persist: true, storageKey: 'store-desk' } },
    { id: 'stRead', type: 'net.noodl.GlobalStore.Subscribe', label: 'Read the app object', parameters: { storeName: 'desk', keys: 'app' } },
    { id: 'stWrite', type: 'net.noodl.GlobalStore.Set', label: 'Write the app object', parameters: { storeName: 'desk', key: 'app', merge: false } },
    { id: 'stOut', type: 'Component Outputs', label: 'The store, read', parameters: {}, ports: [{ name: 'app', plug: 'input', type: 'object' }] }
  ]),
  connections: [
    { fromId: 'stIn', fromProperty: 'app', toId: 'stWrite', toProperty: 'value' },
    { fromId: 'stIn', fromProperty: 'write', toId: 'stWrite', toProperty: 'set' },
    { fromId: 'stRead', fromProperty: 'value', toId: 'stOut', toProperty: 'app' }
  ]
});

const editorGraph = (): Graph => ({
  nodes: placeAll([
    { id: 'edRoot', type: 'Group', label: 'Editor', children: ['edNext', 'edSave'], parameters: { flexDirection: 'row' } },
    button('edNext', 'Next', 'edRoot'),
    button('edSave', 'Save', 'edRoot'),
    fn('edBump', 'Count Next', BUMP_SCRIPT, { inputs: [], outputs: ['n'] }),
    { id: 'edWord', type: '/Logic/Word', label: 'The word', parameters: {} },
    {
      id: 'edOut',
      type: 'Component Outputs',
      label: 'The word, and Save',
      parameters: {},
      ports: [
        { name: 'word', plug: 'input', type: 'string' },
        { name: 'save', plug: 'input', type: 'signal' }
      ]
    }
  ]),
  connections: [
    { fromId: 'edNext', fromProperty: 'onClick', toId: 'edBump', toProperty: 'run' },
    { fromId: 'edBump', fromProperty: 'out-n', toId: 'edWord', toProperty: 'n' },
    { fromId: 'edWord', fromProperty: 'word', toId: 'edOut', toProperty: 'word' },
    { fromId: 'edSave', fromProperty: 'onClick', toId: 'edOut', toProperty: 'save' }
  ]
});

const badGraph = (): Graph => ({
  nodes: placeAll([
    { id: 'bdRoot', type: 'Group', label: 'Bad', children: ['bdBtn'], parameters: {} },
    button('bdBtn', 'Bad write', 'bdRoot'),
    fn('bdA', 'First app', BAD_A_SCRIPT, { inputs: [], outputs: ['app'] }),
    fn('bdB', 'Second app', BAD_B_SCRIPT, { inputs: [], outputs: ['app'], signals: ['done'] }),
    {
      id: 'bdOut',
      type: 'Component Outputs',
      label: 'The app, and write',
      parameters: {},
      ports: [
        { name: 'app', plug: 'input', type: 'object' },
        { name: 'write', plug: 'input', type: 'signal' }
      ]
    }
  ]),
  connections: [
    { fromId: 'bdBtn', fromProperty: 'onClick', toId: 'bdA', toProperty: 'run' },
    { fromId: 'bdBtn', fromProperty: 'onClick', toId: 'bdB', toProperty: 'run' },
    { fromId: 'bdA', fromProperty: 'out-app', toId: 'bdOut', toProperty: 'app' },
    { fromId: 'bdB', fromProperty: 'out-app', toId: 'bdOut', toProperty: 'app' },
    { fromId: 'bdB', fromProperty: 'out-done', toId: 'bdOut', toProperty: 'write' }
  ]
});

const homeGraph = (bad: boolean): Graph => ({
  nodes: placeAll([
    { id: 'page', type: 'Page', label: 'Home', parameters: { title: 'Store Desk', urlPath: 'home' }, children: ['shell'] },
    {
      id: 'shell',
      type: 'Group',
      label: 'Shell',
      parent: 'page',
      children: ['lineText', 'editor', 'dropBtn', ...(bad ? ['bad'] : [])],
      parameters: { flexDirection: 'column' }
    },
    { id: 'lineText', type: 'Text', label: 'line', parent: 'shell', parameters: {} },
    { id: 'editor', type: '/Form/Editor', label: 'Editor', parent: 'shell', parameters: {} },
    button('dropBtn', 'Drop', 'shell'),
    ...(bad ? [{ id: 'bad', type: '/Form/Bad', label: 'Bad', parent: 'shell', parameters: {} }] : []),
    { id: 'store', type: '/Logic/Store', label: 'The store', parameters: {} },
    { id: 'add', type: '/Logic/Add', label: 'Add', parameters: {} },
    { id: 'drop', type: '/Logic/Drop', label: 'Drop', parameters: {} },
    { id: 'show', type: '/Logic/Show', label: 'Show', parameters: {} }
  ]),
  connections: [
    { fromId: 'store', fromProperty: 'app', toId: 'add', toProperty: 'app' },
    { fromId: 'store', fromProperty: 'app', toId: 'drop', toProperty: 'app' },
    { fromId: 'store', fromProperty: 'app', toId: 'show', toProperty: 'app' },
    { fromId: 'editor', fromProperty: 'word', toId: 'add', toProperty: 'word' },
    { fromId: 'editor', fromProperty: 'save', toId: 'add', toProperty: 'run' },
    { fromId: 'dropBtn', fromProperty: 'onClick', toId: 'drop', toProperty: 'run' },
    { fromId: 'add', fromProperty: 'app', toId: 'store', toProperty: 'app' },
    { fromId: 'add', fromProperty: 'done', toId: 'store', toProperty: 'write' },
    { fromId: 'drop', fromProperty: 'app', toId: 'store', toProperty: 'app' },
    { fromId: 'drop', fromProperty: 'done', toId: 'store', toProperty: 'write' },
    ...(bad
      ? [
          { fromId: 'bad', fromProperty: 'app', toId: 'store', toProperty: 'app' },
          { fromId: 'bad', fromProperty: 'write', toId: 'store', toProperty: 'write' }
        ]
      : []),
    { fromId: 'show', fromProperty: 'line', toId: 'lineText', toProperty: 'text' }
  ]
});

/** The desk; `bad` adds the variant's `/Form/Bad`. */
export const storeDesk = (bad = false): Desk => ({
  components: {
    'Pages/Home': homeGraph(bad),
    'Logic/Store': storeGraph(),
    'Logic/Add': logicGraph(
      'ad',
      ADD_SCRIPT,
      [
        { name: 'app', type: 'object' },
        { name: 'word', type: 'string' },
        { name: 'run', type: 'signal' }
      ],
      [
        { name: 'app', type: 'object' },
        { name: 'done', type: 'signal' }
      ]
    ),
    'Logic/Drop': logicGraph(
      'dr',
      DROP_SCRIPT,
      [
        { name: 'app', type: 'object' },
        { name: 'run', type: 'signal' }
      ],
      [
        { name: 'app', type: 'object' },
        { name: 'done', type: 'signal' }
      ]
    ),
    'Logic/Show': logicGraph('sh', SHOW_SCRIPT, [{ name: 'app', type: 'object' }], [{ name: 'line', type: 'string' }]),
    'Logic/Word': logicGraph('wd', WORD_SCRIPT, [{ name: 'n', type: 'number' }], [{ name: 'word', type: 'string' }]),
    'Form/Editor': editorGraph(),
    ...(bad ? { 'Form/Bad': badGraph() } : {})
  }
});

/** The desk written as a v2 project, into `dir` (or a new temporary folder), after `edit`. */
export const writeStoreDesk = (opts: { bad?: boolean; edit?: (d: Desk) => void } = {}, dir?: string): { dir: string; desk: Desk } => {
  const desk = storeDesk(opts.bad === true);
  opts.edit?.(desk);
  return { dir: writeDeskProject(desk, { name: 'Store Desk', idBase: 'b8d20e00-0000-4000-8000-0000000139', prefix: 'store-desk-' }, dir), desk };
};
