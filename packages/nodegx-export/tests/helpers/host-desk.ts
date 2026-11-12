import { Desk, Graph, RawNode, placeAll, writeDeskProject } from './root-desk';
import { fnNode } from './success-desk';

/**
 * "Host Desk" (P18 session 132, EXP-019 slice 1, Richard's ruling of 2026-10-21): a page whose Functions carry the host
 * traits the export used to refuse — `this` kept across runs, the clock, randomness, a timer, the browser — built in a
 * temporary folder so the corpus golden (hls001) does not move (the corpus copy is `tests/fixtures/host-desk`).
 * `the-script-travels-as-written.test.ts` grades it against the runtime's own nodes (`runtime-mounted-arm.js`).
 *
 * The page places **Tally** twice (A and B), then its own Texts; the arms read every drawn Text in document order:
 * A's count, A's again, B's count, B's again, year, later, picked, timer, win, said.
 *
 * - **Tally** (`Components/Tally`): a Button whose label is the placement's `label` input runs "The tally"
 *   (`this.n = (this.n || 0) + 1; Outputs.count = this.n;`). Two Texts read its `count` output directly (two reads of one
 *   run; each has an authored text for before the first run). Two placements must keep two counts (one `self` per kept
 *   node), and three presses must read 3 (a body re-run at a read site, or run against a fresh `this`, reads 1).
 * - **Stamp** runs "The stamp", one body with four traits: `new Date(0)`'s UTC year (1970 everywhere, so the clock is read
 *   and the reading still compares), `Date.now() > 1`, `Math.random() < 2`, a `setTimeout` and `typeof window`. Its Done
 *   sets five Variables, five Texts read them.
 * - **Say** runs the pure "The greeting" (`Outputs.word = 'hello ' + Inputs.who;`): the control, unchanged by the slice.
 */

const button = (id: string, label: string, parent = 'shell'): RawNode => ({ id, type: 'net.noodl.controls.button', label, parent, parameters: { label } });
const text = (id: string, label: string, parent = 'shell'): RawNode => ({ id, type: 'Text', label, parent, parameters: {} });
const variable = (id: string, name: string, value?: string): RawNode => ({ id, type: 'Variable2', label: name, parameters: value === undefined ? { name } : { name, value } });
const setVar = (id: string, name: string, value?: string): RawNode => ({ id, type: 'Set Variable', label: id, parameters: value === undefined ? { name } : { name, value } });

export const TALLY_SCRIPT = 'this.n = (this.n || 0) + 1;\nOutputs.count = this.n;';
export const STAMP_SCRIPT = [
  'const d = new Date(0);',
  'Outputs.year = String(d.getUTCFullYear());',
  "Outputs.later = Date.now() > 1 ? 'yes' : 'no';",
  "Outputs.picked = Math.random() < 2 ? 'picked' : 'none';",
  'setTimeout(() => {}, 0);',
  "Outputs.timer = 'set';",
  "Outputs.win = typeof window === 'object' ? 'window' : 'none';"
].join('\n');

const homeGraph = (): Graph => {
  const shell = ['tallyA', 'tallyB', 'stampBtn', 'sayBtn', 'yearText', 'laterText', 'pickedText', 'timerText', 'winText', 'saidText'];
  const nodes: RawNode[] = [
    { id: 'page', type: 'Page', label: 'Home', parameters: { title: 'Host Desk', urlPath: 'home' }, children: ['shell'] },
    { id: 'shell', type: 'Group', label: 'Shell', parent: 'page', children: shell, parameters: { flexDirection: 'column' } },
    { id: 'tallyA', type: '/Components/Tally', label: 'Tally A', parent: 'shell', parameters: { label: 'Count A' } },
    { id: 'tallyB', type: '/Components/Tally', label: 'Tally B', parent: 'shell', parameters: { label: 'Count B' } },
    button('stampBtn', 'Stamp'),
    button('sayBtn', 'Say'),
    text('yearText', 'Year'),
    text('laterText', 'Later'),
    text('pickedText', 'Picked'),
    text('timerText', 'Timer'),
    text('winText', 'Win'),
    text('saidText', 'Said'),
    variable('yearVar', 'year', 'year nothing'),
    variable('laterVar', 'later', 'later nothing'),
    variable('pickedVar', 'picked', 'picked nothing'),
    variable('timerVar', 'timer', 'timer nothing'),
    variable('winVar', 'win', 'win nothing'),
    variable('saidVar', 'said', 'said nothing'),
    variable('whoVar', 'who', 'Ann'),
    fnNode('stamp', 'The stamp', STAMP_SCRIPT, { inputs: [], outputs: ['year', 'later', 'picked', 'timer', 'win'] }),
    fnNode('greet', 'The greeting', "Outputs.word = 'hello ' + Inputs.who;", { inputs: ['who'], outputs: ['word'] }),
    setVar('sdYear', 'year'),
    setVar('sdLater', 'later'),
    setVar('sdPicked', 'picked'),
    setVar('sdTimer', 'timer'),
    setVar('sdWin', 'win'),
    setVar('sdSaid', 'said')
  ];
  return {
    nodes: placeAll(nodes),
    connections: [
      { fromId: 'stampBtn', fromProperty: 'onClick', toId: 'stamp', toProperty: 'run' },
      { fromId: 'stamp', fromProperty: 'done', toId: 'sdYear', toProperty: 'do' },
      { fromId: 'stamp', fromProperty: 'out-year', toId: 'sdYear', toProperty: 'value' },
      { fromId: 'stamp', fromProperty: 'done', toId: 'sdLater', toProperty: 'do' },
      { fromId: 'stamp', fromProperty: 'out-later', toId: 'sdLater', toProperty: 'value' },
      { fromId: 'stamp', fromProperty: 'done', toId: 'sdPicked', toProperty: 'do' },
      { fromId: 'stamp', fromProperty: 'out-picked', toId: 'sdPicked', toProperty: 'value' },
      { fromId: 'stamp', fromProperty: 'done', toId: 'sdTimer', toProperty: 'do' },
      { fromId: 'stamp', fromProperty: 'out-timer', toId: 'sdTimer', toProperty: 'value' },
      { fromId: 'stamp', fromProperty: 'done', toId: 'sdWin', toProperty: 'do' },
      { fromId: 'stamp', fromProperty: 'out-win', toId: 'sdWin', toProperty: 'value' },
      { fromId: 'sayBtn', fromProperty: 'onClick', toId: 'greet', toProperty: 'run' },
      { fromId: 'whoVar', fromProperty: 'value', toId: 'greet', toProperty: 'in-who' },
      { fromId: 'greet', fromProperty: 'done', toId: 'sdSaid', toProperty: 'do' },
      { fromId: 'greet', fromProperty: 'out-word', toId: 'sdSaid', toProperty: 'value' },
      { fromId: 'yearVar', fromProperty: 'value', toId: 'yearText', toProperty: 'text' },
      { fromId: 'laterVar', fromProperty: 'value', toId: 'laterText', toProperty: 'text' },
      { fromId: 'pickedVar', fromProperty: 'value', toId: 'pickedText', toProperty: 'text' },
      { fromId: 'timerVar', fromProperty: 'value', toId: 'timerText', toProperty: 'text' },
      { fromId: 'winVar', fromProperty: 'value', toId: 'winText', toProperty: 'text' },
      { fromId: 'saidVar', fromProperty: 'value', toId: 'saidText', toProperty: 'text' }
    ]
  };
};

const tallyGraph = (): Graph => ({
  nodes: placeAll([
    { id: 'tlRoot', type: 'Group', label: 'Tally', children: ['tlBtn', 'tlCountText', 'tlAgainText'], parameters: { flexDirection: 'column' } },
    { id: 'tlBtn', type: 'net.noodl.controls.button', label: 'Count', parent: 'tlRoot', parameters: { label: 'Count' } },
    // 🔴 Not Variables: a NodeGX Variable is one value app-wide by name, so two placements would share it (measured on the
    // runtime arm first: both Tallies read "1" after one press). The Texts read the run's output directly, with an
    // authored text for before the first run (TEXTDEFAULT's shape without the defect: the text is authored).
    { id: 'tlCountText', type: 'Text', label: 'Count', parent: 'tlRoot', parameters: { text: 'count nothing' } },
    { id: 'tlAgainText', type: 'Text', label: 'Again', parent: 'tlRoot', parameters: { text: 'again nothing' } },
    { id: 'tlIn', type: 'Component Inputs', label: 'Inputs', parameters: {}, ports: [{ name: 'label', plug: 'output', type: 'string' }] },
    fnNode('tally', 'The tally', TALLY_SCRIPT, { inputs: [], outputs: ['count'] })
  ]),
  connections: [
    { fromId: 'tlIn', fromProperty: 'label', toId: 'tlBtn', toProperty: 'label' },
    { fromId: 'tlBtn', fromProperty: 'onClick', toId: 'tally', toProperty: 'run' },
    { fromId: 'tally', fromProperty: 'out-count', toId: 'tlCountText', toProperty: 'text' },
    { fromId: 'tally', fromProperty: 'out-count', toId: 'tlAgainText', toProperty: 'text' }
  ]
});

/** The desk, before any variant's edit. */
export const hostDesk = (): Desk => ({
  components: {
    'Pages/Home': homeGraph(),
    'Components/Tally': tallyGraph()
  }
});

/** The desk written as a v2 project, into `dir` (or a new temporary folder), after `edit`. */
export const writeHostDesk = (edit?: (d: Desk) => void, dir?: string): { dir: string; desk: Desk } => {
  const desk = hostDesk();
  edit?.(desk);
  return { dir: writeDeskProject(desk, { name: 'Host Desk', idBase: 'b8d20e00-0000-4000-8000-0000000018', prefix: 'host-desk-' }, dir), desk };
};
