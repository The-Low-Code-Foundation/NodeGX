import { Desk, Graph, RawNode, placeAll, writeDeskProject } from './root-desk';
import { fnNode } from './success-desk';

/**
 * "Arrival Desk" (P18 session 133, EXP-019 slice 2): Functions whose bodies carry a host trait and that have **no Run
 * wire**, so nothing but their inputs' arrival runs them (`simplejavascript.ts`: the `functionScript` setter schedules a run
 * at load, and `setScriptInputValue` one per ticked input whose value changed). Built in a temporary folder;
 * `the-script-runs-on-arrival.test.ts` grades it against the runtime's own nodes (`runtime-mounted-arm.js`), predicted
 * first in `dev-docs/tasks/phase-18-code-export-v2/s133-arrival/EXPECTED.md`.
 *
 * The page places **Tally** twice, then its own Texts; the arms read every drawn Text in document order:
 * A.count · B.count · runs · greeting · stamp · loaded · seen · bumped · echo, then the field (`fields: true`).
 *
 * - **Tally** (`Components/Tally`): its input `label` feeds "The tally" (`this.n` counts its runs, `Outputs.count` is the
 *   label and the count). A's label is the Variable `name` (Ann, then Bo); B's is the literal "B". Two placements, two `this`.
 * - **The stamp**, fed `name`: counts its runs on `this`, greets, and reads the clock.
 * - **The clock**, no inputs at all: runs once, at load, and never again.
 * - **The watch**, fed `name`: sends its signal `isBo` when the name is Bo; a Set Variable writes "seen Bo".
 * - **The echo**, fed the field's Text (`onTextChanged`, the port's name): counts its runs and echoes the text.
 * - **Bump** increases a Counter a Text shows: a re-render that delivers nothing to any Function (none per render).
 * - **Set Bo** sets `name` to Bo; pressed twice, the second delivers the value already held (no run, DEF-046).
 * - **Clear** Do's a Set Variable with no Value on `name`: `undefined` is never sent, so nothing runs.
 */

const button = (id: string, label: string, parent = 'shell'): RawNode => ({ id, type: 'net.noodl.controls.button', label, parent, parameters: { label } });
const text = (id: string, label: string, parent = 'shell'): RawNode => ({ id, type: 'Text', label, parent, parameters: {} });
const variable = (id: string, name: string, value?: string): RawNode => ({ id, type: 'Variable2', label: name, parameters: value === undefined ? { name } : { name, value } });
const setVar = (id: string, name: string, value?: string): RawNode => ({ id, type: 'Set Variable', label: id, parameters: value === undefined ? { name } : { name, value } });

export const TALLY_SCRIPT = 'this.n = (this.n || 0) + 1;\nOutputs.count = Inputs.label + \' \' + this.n;';
export const STAMP_SCRIPT = [
  'this.runs = (this.runs || 0) + 1;',
  "Outputs.runs = 'runs ' + this.runs;",
  "Outputs.greeting = 'hi ' + Inputs.name;",
  "Outputs.stamp = Date.now() > 1 ? 'stamped' : 'unstamped';"
].join('\n');
export const CLOCK_SCRIPT = "this.c = (this.c || 0) + 1;\nOutputs.loaded = 'loaded ' + this.c + ' ' + typeof window;";
export const WATCH_SCRIPT = "if (Inputs.name === 'Bo' && Date.now() > 1) Outputs.isBo();";
export const ECHO_SCRIPT = "this.e = (this.e || 0) + 1;\nOutputs.echo = 'echo ' + this.e + ' ' + Inputs.text;";

const homeGraph = (): Graph => {
  const shell = ['tallyA', 'tallyB', 'bumpBtn', 'setBoBtn', 'clearBtn', 'runsText', 'greetText', 'stampText', 'loadedText', 'seenText', 'bumpedText', 'echoText', 'nameField'];
  const nodes: RawNode[] = [
    { id: 'page', type: 'Page', label: 'Home', parameters: { title: 'Arrival Desk', urlPath: 'home' }, children: ['shell'] },
    { id: 'shell', type: 'Group', label: 'Shell', parent: 'page', children: shell, parameters: { flexDirection: 'column' } },
    { id: 'tallyA', type: '/Components/Tally', label: 'Tally A', parent: 'shell', parameters: {} },
    { id: 'tallyB', type: '/Components/Tally', label: 'Tally B', parent: 'shell', parameters: { label: 'B' } },
    button('bumpBtn', 'Bump'),
    button('setBoBtn', 'Set Bo'),
    button('clearBtn', 'Clear'),
    text('runsText', 'Runs'),
    text('greetText', 'Greeting'),
    text('stampText', 'Stamp'),
    text('loadedText', 'Loaded'),
    text('seenText', 'Seen'),
    text('bumpedText', 'Bumped'),
    text('echoText', 'Echo'),
    { id: 'nameField', type: 'net.noodl.controls.textinput', label: 'Name', parent: 'shell', parameters: { placeholder: 'Name' } },
    variable('nameVar', 'name', 'Ann'),
    variable('seenVar', 'seen', 'seen nothing'),
    { id: 'bumps', type: 'Counter', label: 'Bumps', parameters: {} },
    setVar('sdName', 'name', 'Bo'),
    setVar('sdClear', 'name'),
    setVar('sdSeen', 'seen', 'seen Bo'),
    fnNode('stamp', 'The stamp', STAMP_SCRIPT, { inputs: ['name'], outputs: ['runs', 'greeting', 'stamp'], ticked: ['name'] }),
    fnNode('clock', 'The clock', CLOCK_SCRIPT, { inputs: [], outputs: ['loaded'] }),
    fnNode('watch', 'The watch', WATCH_SCRIPT, { inputs: ['name'], outputs: [], signals: ['isBo'], ticked: ['name'] }),
    fnNode('echo', 'The echo', ECHO_SCRIPT, { inputs: ['text'], outputs: ['echo'], ticked: ['text'] })
  ];
  return {
    nodes: placeAll(nodes),
    connections: [
      { fromId: 'nameVar', fromProperty: 'value', toId: 'tallyA', toProperty: 'label' },
      { fromId: 'bumpBtn', fromProperty: 'onClick', toId: 'bumps', toProperty: 'increase' },
      { fromId: 'bumps', fromProperty: 'currentCount', toId: 'bumpedText', toProperty: 'text' },
      { fromId: 'setBoBtn', fromProperty: 'onClick', toId: 'sdName', toProperty: 'do' },
      { fromId: 'clearBtn', fromProperty: 'onClick', toId: 'sdClear', toProperty: 'do' },
      { fromId: 'nameVar', fromProperty: 'value', toId: 'stamp', toProperty: 'in-name' },
      { fromId: 'stamp', fromProperty: 'out-runs', toId: 'runsText', toProperty: 'text' },
      { fromId: 'stamp', fromProperty: 'out-greeting', toId: 'greetText', toProperty: 'text' },
      { fromId: 'stamp', fromProperty: 'out-stamp', toId: 'stampText', toProperty: 'text' },
      { fromId: 'clock', fromProperty: 'out-loaded', toId: 'loadedText', toProperty: 'text' },
      { fromId: 'nameVar', fromProperty: 'value', toId: 'watch', toProperty: 'in-name' },
      { fromId: 'watch', fromProperty: 'out-isBo', toId: 'sdSeen', toProperty: 'do' },
      { fromId: 'seenVar', fromProperty: 'value', toId: 'seenText', toProperty: 'text' },
      { fromId: 'nameField', fromProperty: 'onTextChanged', toId: 'echo', toProperty: 'in-text' },
      { fromId: 'echo', fromProperty: 'out-echo', toId: 'echoText', toProperty: 'text' }
    ]
  };
};

const tallyGraph = (): Graph => ({
  nodes: placeAll([
    { id: 'tlRoot', type: 'Group', label: 'Tally', children: ['tlCountText'], parameters: { flexDirection: 'column' } },
    { id: 'tlCountText', type: 'Text', label: 'Count', parent: 'tlRoot', parameters: {} },
    { id: 'tlIn', type: 'Component Inputs', label: 'Inputs', parameters: {}, ports: [{ name: 'label', plug: 'output', type: 'string' }] },
    fnNode('tally', 'The tally', TALLY_SCRIPT, { inputs: ['label'], outputs: ['count'], ticked: ['label'] })
  ]),
  connections: [
    { fromId: 'tlIn', fromProperty: 'label', toId: 'tally', toProperty: 'in-label' },
    { fromId: 'tally', fromProperty: 'out-count', toId: 'tlCountText', toProperty: 'text' }
  ]
});

export const BELL_SCRIPT = "setTimeout(function () {\n  Outputs.rung = 'rung ' + typeof window;\n  Outputs.rang();\n}, 0);";
export const CHIME_SCRIPT = "setTimeout(() => {\n  Outputs.chimed = 'chimed';\n}, 0);";
export const PROMISE_SCRIPT = "Promise.resolve('kept').then(function (v) {\n  Outputs.promised = 'promise ' + v;\n  Outputs.kept();\n});";

/**
 * The Bell variant (s133, after reading the gained nodes' emitted code): two bodies that write after their run has
 * returned. **The bell** (no Run, no inputs) writes `rung` and sends `rang` from a zero timer; `rang` increases a Counter
 * "Rings". **The chime** (Run from a button "Chime") writes `chimed` from a zero timer. Three Texts after the field: bell,
 * rings, chimed. **The promise** (no Run, no inputs) writes `promised` and sends `kept` from a `.then` callback; `kept`
 * increases a Counter "Keeps". Two Texts after: promised, keeps.
 */
export const addBell = (d: Desk): void => {
  const home = d.components['Pages/Home'];
  const shell = home.nodes.find((n) => n.id === 'shell')!;
  shell.children = [...(shell.children ?? []), 'chimeBtn', 'bellText', 'ringsText', 'chimedText', 'promisedText', 'keepsText'];
  home.nodes.push(
    ...placeAll([
      button('chimeBtn', 'Chime'),
      text('bellText', 'Bell'),
      text('ringsText', 'Rings text'),
      text('chimedText', 'Chimed'),
      text('promisedText', 'Promised'),
      text('keepsText', 'Keeps text'),
      { id: 'keeps', type: 'Counter', label: 'Keeps', parameters: {} },
      fnNode('promise', 'The promise', PROMISE_SCRIPT, { inputs: [], outputs: ['promised'], signals: ['kept'] }),
      { id: 'rings', type: 'Counter', label: 'Rings', parameters: {} },
      fnNode('bell', 'The bell', BELL_SCRIPT, { inputs: [], outputs: ['rung'], signals: ['rang'] }),
      fnNode('chime', 'The chime', CHIME_SCRIPT, { inputs: [], outputs: ['chimed'] })
    ])
  );
  home.connections.push(
    { fromId: 'bell', fromProperty: 'out-rung', toId: 'bellText', toProperty: 'text' },
    { fromId: 'bell', fromProperty: 'out-rang', toId: 'rings', toProperty: 'increase' },
    { fromId: 'rings', fromProperty: 'currentCount', toId: 'ringsText', toProperty: 'text' },
    { fromId: 'chimeBtn', fromProperty: 'onClick', toId: 'chime', toProperty: 'run' },
    { fromId: 'chime', fromProperty: 'out-chimed', toId: 'chimedText', toProperty: 'text' },
    { fromId: 'promise', fromProperty: 'out-promised', toId: 'promisedText', toProperty: 'text' },
    { fromId: 'promise', fromProperty: 'out-kept', toId: 'keeps', toProperty: 'increase' },
    { fromId: 'keeps', fromProperty: 'currentCount', toId: 'keepsText', toProperty: 'text' }
  );
};

/** The desk, before any variant's edit. */
export const arrivalDesk = (): Desk => ({
  components: {
    'Pages/Home': homeGraph(),
    'Components/Tally': tallyGraph()
  }
});

/** The desk written as a v2 project, into `dir` (or a new temporary folder), after `edit`. */
export const writeArrivalDesk = (edit?: (d: Desk) => void, dir?: string): { dir: string; desk: Desk } => {
  const desk = arrivalDesk();
  edit?.(desk);
  return { dir: writeDeskProject(desk, { name: 'Arrival Desk', idBase: 'b8d20e00-0000-4000-8000-0000000019', prefix: 'arrival-desk-' }, dir), desk };
};
