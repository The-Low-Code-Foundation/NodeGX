import { Desk, Graph, RawNode, placeAll, writeDeskProject } from './root-desk';
import { fnNode } from './success-desk';

/**
 * "Component Desk" (P18 session 135, EXP-020 slice 2): a page whose Functions read and write their component's record,
 * `Component.Object` — gram's and marketplace's shape (`var keep = Component.Object; … keep.get('links') … keep.set('links',
 * links)`), built in a temporary folder so the corpus golden (hls001) does not move (the corpus copy is
 * `tests/fixtures/component-desk`). `the-component-record-travels.test.ts` grades it against the runtime's own nodes
 * (`runtime-mounted-arm.js`), predicted first in `dev-docs/tasks/phase-18-code-export-v2/s135-componentrecord/EXPECTED.md`.
 *
 * The page places **Keep** three times (A, B, and C inside a Group whose Mounted the page's Toggle drives, authored false),
 * then the Toggle button. The arms read every drawn Text in document order: each drawn Keep's `n` and `got`.
 *
 * - **Keep** (`Components/Keep`): two Buttons, labelled by the placement's `addLabel` and `readLabel` inputs. "Add one"
 *   counts in the record (`get` / `set` through an alias, then a property write) and shows the count; "Read it" awaits
 *   first, as gram's bodies do, then reads the record back every way the runtime's record answers: `get`, a property
 *   read, the property written, its own keys, its id kept against a write (read-only), and the id's prefix. Two Functions
 *   in one instance must share one record; two placements must keep two.
 * - **Toggle** (`this.shown = !this.shown; Outputs.shown = this.shown;`) mounts and unmounts C's Group: the runtime keeps
 *   a component instance while it is not drawn (P18-S128-SEEDREMOUNT's reading), so C's record outlives the hiding there.
 */

const button = (id: string, label: string, parent: string): RawNode => ({ id, type: 'net.noodl.controls.button', label, parent, parameters: { label } });

export const ADD_SCRIPT = [
  'var keep = Component.Object;',
  "var n = (keep.get('n') || 0) + 1;",
  "keep.set('n', n);",
  "Component.Object.word = 'w' + n;",
  'Outputs.n = String(n);'
].join('\n');

export const READ_SCRIPT = [
  'await Promise.resolve();',
  'var o = Component.Object;',
  'var before = o.id;',
  "o.id = 'other';",
  "var kept = o.id === before && o.getId() === before ? 'kept' : 'moved';",
  "var prefix = String(before).indexOf('componentState') === 0 ? 'state' : 'other';",
  "Outputs.got = ['got', o.get('n'), o.n, o.get('word'), Object.keys(o).join(','), kept, prefix].join('|');"
].join('\n');

export const TOGGLE_SCRIPT = 'this.shown = !this.shown;\nOutputs.shown = this.shown;';

const homeGraph = (): Graph => ({
  nodes: placeAll([
    { id: 'page', type: 'Page', label: 'Home', parameters: { title: 'Component Desk', urlPath: 'home' }, children: ['shell'] },
    { id: 'shell', type: 'Group', label: 'Shell', parent: 'page', children: ['keepA', 'keepB', 'hideable', 'toggleBtn'], parameters: { flexDirection: 'column' } },
    { id: 'keepA', type: '/Components/Keep', label: 'Keep A', parent: 'shell', parameters: { addLabel: 'Add A', readLabel: 'Read A' } },
    { id: 'keepB', type: '/Components/Keep', label: 'Keep B', parent: 'shell', parameters: { addLabel: 'Add B', readLabel: 'Read B' } },
    { id: 'hideable', type: 'Group', label: 'Hideable', parent: 'shell', children: ['keepC'], parameters: { mounted: false } },
    { id: 'keepC', type: '/Components/Keep', label: 'Keep C', parent: 'hideable', parameters: { addLabel: 'Add C', readLabel: 'Read C' } },
    button('toggleBtn', 'Toggle', 'shell'),
    fnNode('toggle', 'The toggle', TOGGLE_SCRIPT, { inputs: [], outputs: ['shown'] })
  ]),
  connections: [
    { fromId: 'toggleBtn', fromProperty: 'onClick', toId: 'toggle', toProperty: 'run' },
    { fromId: 'toggle', fromProperty: 'out-shown', toId: 'hideable', toProperty: 'mounted' }
  ]
});

const keepGraph = (): Graph => ({
  nodes: placeAll([
    { id: 'kpRoot', type: 'Group', label: 'Keep', children: ['kpAdd', 'kpRead', 'kpNText', 'kpGotText'], parameters: { flexDirection: 'column' } },
    { id: 'kpAdd', type: 'net.noodl.controls.button', label: 'Add', parent: 'kpRoot', parameters: { label: 'Add' } },
    { id: 'kpRead', type: 'net.noodl.controls.button', label: 'Read', parent: 'kpRoot', parameters: { label: 'Read' } },
    // Authored texts for before the first run, as the Host Desk's Tally has them (P18-S132-AUTHOREDTEXT's shape).
    { id: 'kpNText', type: 'Text', label: 'N', parent: 'kpRoot', parameters: { text: 'n nothing' } },
    { id: 'kpGotText', type: 'Text', label: 'Got', parent: 'kpRoot', parameters: { text: 'got nothing' } },
    {
      id: 'kpIn',
      type: 'Component Inputs',
      label: 'Inputs',
      parameters: {},
      ports: [
        { name: 'addLabel', plug: 'output', type: 'string' },
        { name: 'readLabel', plug: 'output', type: 'string' }
      ]
    },
    fnNode('add', 'Add one', ADD_SCRIPT, { inputs: [], outputs: ['n'] }),
    fnNode('read', 'Read it', READ_SCRIPT, { inputs: [], outputs: ['got'] })
  ]),
  connections: [
    { fromId: 'kpIn', fromProperty: 'addLabel', toId: 'kpAdd', toProperty: 'label' },
    { fromId: 'kpIn', fromProperty: 'readLabel', toId: 'kpRead', toProperty: 'label' },
    { fromId: 'kpAdd', fromProperty: 'onClick', toId: 'add', toProperty: 'run' },
    { fromId: 'kpRead', fromProperty: 'onClick', toId: 'read', toProperty: 'run' },
    { fromId: 'add', fromProperty: 'out-n', toId: 'kpNText', toProperty: 'text' },
    { fromId: 'read', fromProperty: 'out-got', toId: 'kpGotText', toProperty: 'text' }
  ]
});

/** The desk, before any variant's edit. */
export const componentDesk = (): Desk => ({
  components: {
    'Pages/Home': homeGraph(),
    'Components/Keep': keepGraph()
  }
});

/** The desk written as a v2 project, into `dir` (or a new temporary folder), after `edit`. */
export const writeComponentDesk = (edit?: (d: Desk) => void, dir?: string): { dir: string; desk: Desk } => {
  const desk = componentDesk();
  edit?.(desk);
  return { dir: writeDeskProject(desk, { name: 'Component Desk', idBase: 'b8d20e00-0000-4000-8000-0000000021', prefix: 'component-desk-' }, dir), desk };
};
