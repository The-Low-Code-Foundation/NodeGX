import { Desk, Graph, RawNode, placeAll, writeDeskProject } from './root-desk';

/**
 * "Hook Desk" (P18 session 136, EXP-021 slice 1): a page that places logic components — components with no visual node,
 * the templates' commonest shape (Component Inputs → a Function → Component Outputs, 223 of their 332) — built in a
 * temporary folder so the corpus golden (hls001) does not move. `a-logic-component-is-a-hook.test.ts` grades it against
 * the runtime's own nodes (`runtime-mounted-arm.js`), predicted first in
 * `dev-docs/tasks/phase-18-code-export-v2/s136-hooks/EXPECTED.md`.
 *
 * The page draws More, the Texts y and label, Go A, Go B, the Texts total A, total B, dones, echo and rows. Beside them, not drawn:
 * the Function bump (More runs it), and four placements:
 *
 * - **Double** (`/Logic/Double`, x ← bump.n): a Function with no Run, `y = x * 2`. The page's y reads it.
 * - **Label** (`/Logic/Label`, y ← Double.y): the same shape, fed by another logic component. The page's label reads it.
 * - **Tally A** and **Tally B** (`/Logic/Tally`, authored step 1 and 10, `go` ← Go A / Go B): the signal `go` runs a
 *   Function that keeps a total on `this` and says `done`; total A / total B read `total`, and both `done`s run the page's
 *   Function dones.
 * - **Echo** (`/Logic/Echo`, `said` ← Tally A's total, `take` ← Tally A's done): todo-list's lists' shape (s122), a value
 *   and the signal that goes with it; Run by `take`, it says 'echo ' + said. The page's echo reads it.
 * - **Stamp** (`/Logic/Stamp`, x ← bump.n; P18 session 137): a Function with no Run that reads the clock, so it is an
 *   arrival run (EXP-019 slice 2), as todo-list's Task rows, Today rows and Log rows are; it says 'rows ' + x * 3. The
 *   page's rows reads it (`s137-todo-drive/EXPECTED.md`).
 *
 * The logic components are written as the templates write them: registry type `visual`, no visual root.
 */

const text = (id: string, label: string): RawNode => ({ id, type: 'Text', label, parent: 'shell', parameters: {} });
const button = (id: string, label: string): RawNode => ({ id, type: 'net.noodl.controls.button', label, parent: 'shell', parameters: { label } });

/**
 * A Function, its run-on-change boxes written out as the editor's load leaves them (NDA-017: a box left unset reads
 * ticked, but unticked where Run is wired; `runtime-mounted-arm.js` does not migrate, so an unset box would read ticked
 * there and run a Run-wired Function on its inputs' arrival, which neither the editor nor the export does).
 */
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

export const BUMP_SCRIPT = 'this.n = (this.n || 0) + 1;\nOutputs.n = this.n;';
export const DONES_SCRIPT = "this.k = (this.k || 0) + 1;\nOutputs.k = 'dones ' + this.k;";
export const DOUBLE_SCRIPT = 'Outputs.y = (Number(Inputs.x) || 0) * 2;';
export const LABEL_SCRIPT = "Outputs.text = 'y is ' + Inputs.y;";
export const ECHO_SCRIPT = "Outputs.echo = 'echo ' + Inputs.said;";
/** Reads the clock, so it runs on its inputs' arrival (a host trait); what it says does not depend on the time. */
export const STAMP_SCRIPT = "var now = new Date();\nOutputs.rows = 'rows ' + (Number(Inputs.x) || 0) * 3 + (now.getTime() > 0 ? '' : '?');";
export const TALLY_SCRIPT = [
  'this.total = (this.total || 0) + (Number(Inputs.step) || 0);',
  "Outputs.total = 'total ' + this.total;",
  'Outputs.done();'
].join('\n');

const homeGraph = (): Graph => ({
  nodes: placeAll([
    { id: 'page', type: 'Page', label: 'Home', parameters: { title: 'Hook Desk', urlPath: 'home' }, children: ['shell'] },
    {
      id: 'shell',
      type: 'Group',
      label: 'Shell',
      parent: 'page',
      children: ['moreBtn', 'yText', 'labelText', 'goABtn', 'goBBtn', 'totalAText', 'totalBText', 'donesText', 'echoText', 'rowsText'],
      parameters: { flexDirection: 'column' }
    },
    button('moreBtn', 'More'),
    text('yText', 'y'),
    text('labelText', 'label'),
    button('goABtn', 'Go A'),
    button('goBBtn', 'Go B'),
    text('totalAText', 'total A'),
    text('totalBText', 'total B'),
    text('donesText', 'dones'),
    text('echoText', 'echo'),
    text('rowsText', 'rows'),
    fn('bump', 'Bump', BUMP_SCRIPT, { inputs: [], outputs: ['n'] }),
    fn('dones', 'Count dones', DONES_SCRIPT, { inputs: [], outputs: ['k'] }),
    { id: 'double', type: '/Logic/Double', label: 'Double', parameters: {} },
    { id: 'label', type: '/Logic/Label', label: 'Label', parameters: {} },
    { id: 'tallyA', type: '/Logic/Tally', label: 'Tally A', parameters: { step: 1 } },
    { id: 'tallyB', type: '/Logic/Tally', label: 'Tally B', parameters: { step: 10 } },
    { id: 'echo', type: '/Logic/Echo', label: 'Echo', parameters: {} },
    { id: 'stamp', type: '/Logic/Stamp', label: 'Stamp', parameters: {} }
  ]),
  connections: [
    { fromId: 'moreBtn', fromProperty: 'onClick', toId: 'bump', toProperty: 'run' },
    { fromId: 'bump', fromProperty: 'out-n', toId: 'double', toProperty: 'x' },
    { fromId: 'double', fromProperty: 'y', toId: 'yText', toProperty: 'text' },
    { fromId: 'double', fromProperty: 'y', toId: 'label', toProperty: 'y' },
    { fromId: 'label', fromProperty: 'text', toId: 'labelText', toProperty: 'text' },
    { fromId: 'goABtn', fromProperty: 'onClick', toId: 'tallyA', toProperty: 'go' },
    { fromId: 'goBBtn', fromProperty: 'onClick', toId: 'tallyB', toProperty: 'go' },
    { fromId: 'tallyA', fromProperty: 'total', toId: 'totalAText', toProperty: 'text' },
    { fromId: 'tallyB', fromProperty: 'total', toId: 'totalBText', toProperty: 'text' },
    { fromId: 'tallyA', fromProperty: 'done', toId: 'dones', toProperty: 'run' },
    { fromId: 'tallyB', fromProperty: 'done', toId: 'dones', toProperty: 'run' },
    { fromId: 'dones', fromProperty: 'out-k', toId: 'donesText', toProperty: 'text' },
    // todo-list's lists' shape (s122): a value and the signal that goes with it, from one placed component into another.
    { fromId: 'tallyA', fromProperty: 'total', toId: 'echo', toProperty: 'said' },
    { fromId: 'tallyA', fromProperty: 'done', toId: 'echo', toProperty: 'take' },
    { fromId: 'echo', fromProperty: 'echo', toId: 'echoText', toProperty: 'text' },
    // todo-list's row builders' shape (s137): an arrival run's value, lifted to the page.
    { fromId: 'bump', fromProperty: 'out-n', toId: 'stamp', toProperty: 'x' },
    { fromId: 'stamp', fromProperty: 'rows', toId: 'rowsText', toProperty: 'text' }
  ]
});

/** A logic component: Component Inputs → one Function → Component Outputs, every port wired straight through. */
const logicGraph = (
  prefix: string,
  script: string,
  ins: Array<{ name: string; type: string }>,
  outs: Array<{ name: string; type: string }>
): Graph => {
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

/** The desk, before any variant's edit. */
export const hookDesk = (): Desk => ({
  components: {
    'Pages/Home': homeGraph(),
    'Logic/Double': logicGraph('db', DOUBLE_SCRIPT, [{ name: 'x', type: 'number' }], [{ name: 'y', type: 'number' }]),
    'Logic/Label': logicGraph('lb', LABEL_SCRIPT, [{ name: 'y', type: 'number' }], [{ name: 'text', type: 'string' }]),
    'Logic/Stamp': logicGraph('st', STAMP_SCRIPT, [{ name: 'x', type: 'number' }], [{ name: 'rows', type: 'string' }]),
    'Logic/Echo': logicGraph(
      'ec',
      ECHO_SCRIPT,
      [
        { name: 'said', type: 'string' },
        { name: 'take', type: 'signal' }
      ],
      [{ name: 'echo', type: 'string' }]
    ),
    'Logic/Tally': logicGraph(
      'tl',
      TALLY_SCRIPT,
      [
        { name: 'step', type: 'number' },
        { name: 'go', type: 'signal' }
      ],
      [
        { name: 'total', type: 'string' },
        { name: 'done', type: 'signal' }
      ]
    )
  }
});

/** The desk written as a v2 project, into `dir` (or a new temporary folder), after `edit`. */
export const writeHookDesk = (edit?: (d: Desk) => void, dir?: string): { dir: string; desk: Desk } => {
  const desk = hookDesk();
  edit?.(desk);
  return { dir: writeDeskProject(desk, { name: 'Hook Desk', idBase: 'b8d20e00-0000-4000-8000-0000000022', prefix: 'hook-desk-' }, dir), desk };
};
