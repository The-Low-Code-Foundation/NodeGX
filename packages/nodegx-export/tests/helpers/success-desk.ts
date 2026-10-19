import { Desk, Graph, RawNode, placeAll, writeDeskProject } from './root-desk';

/**
 * "Success Desk" (P18 session 130, EXP-011 §98, P18-S129-FNSUCCESS): a page whose chains hang off a Function's Success,
 * built in a temporary folder so the corpus golden (hls001) does not move. `the-function-succeeds.test.ts` grades it
 * against the runtime's own nodes (`runtime-mounted-arm.js`, its `fields` reading for the Editor's field).
 *
 * The page's Texts read the Variables `said`, `echo`, `order`, `pulse`, `next`, `shown`, `doneAt`, the pick's runs and `filled`, in that order; the
 * arms read every drawn Text in document order, then the Editor's field by its placeholder.
 *
 * - **Say** runs "The greeting" (`Outputs.word = 'hello ' + Inputs.who; Outputs.ping();`, its `who` from the Variable
 *   `who`, seeded "Ann", unticked). Its Success sets `said` from the word, and that Set's Done sets `echo` from a Variable
 *   reading `said` (the Lists Editor's `leFill.success → leSetName`, then a Set's Done chain); its Success sets `order` to
 *   "success" and its Done sets it to "done" (which comes last); its own `ping` sets `pulse` to "pulse" and its Success
 *   sets it to "success" (which comes last); its Success sets `next` to "success" (a variant adds the click's second wire,
 *   which sets it to "second": the runtime finishes the run after it, P18-S121-ONEUPDATE). **Bob** sets `who` to "Bob".
 * - **Show** runs "The pick to show" (`Outputs.shown = 'shown ' + Inputs.pick;`, no signal of its own), its `pick` from
 *   the Variable `pick`, seeded "a", **ticked**: a new value runs it too, sending Success and never Done. Its Success sets
 *   `shown` and counts the run (a Counter, on the Runs Text), its Done sets `doneAt`, both from its output. **Pick b** sets `pick` to "b"; **Pick c and show** sets it to "c"
 *   and sends Show's Run in the same click (one run, the Run's, with Done).
 * - **Edit** pulses the placed Editor's `fill` (rocket-school's and star-class's Lists Editor): inside, `fill` runs "The
 *   name to edit" (`Outputs.name = 'edit ' + Inputs.name;`, its `name` the Editor's input `name0`, which the page passes
 *   as "Cleo", unticked); its Success sets `draft`, whose Done sends the field's Set. The field's Value is `draft`,
 *   unticked, so only the Set puts it in. The Success also fires the Editor's own signal output `filled` (story-engine's
 *   shape), which sets the page's `filled` to "filled yes".
 */

const button = (id: string, label: string, parent = 'shell'): RawNode => ({ id, type: 'net.noodl.controls.button', label, parent, parameters: { label } });
const text = (id: string, label: string, parent = 'shell'): RawNode => ({ id, type: 'Text', label, parent, parameters: {} });
const variable = (id: string, name: string, value?: string): RawNode => ({ id, type: 'Variable2', label: name, parameters: value === undefined ? { name } : { name, value } });
const setVar = (id: string, name: string, value?: string): RawNode => ({ id, type: 'Set Variable', label: id, parameters: value === undefined ? { name } : { name, value } });
/** A Function with its ports declared as the editor writes them; `ticked` lists the inputs whose box is ticked. */
export const fnNode = (
  id: string,
  label: string,
  script: string,
  io: { inputs: string[]; outputs: string[]; signals?: string[]; ticked?: string[] }
): RawNode => ({
  id,
  type: 'JavaScriptFunction',
  label,
  parameters: {
    functionScript: script,
    ...Object.fromEntries(io.inputs.map((i) => [`runOnChange-in-${i}`, (io.ticked ?? []).includes(i)]))
  },
  ports: [
    ...io.inputs.map((name) => ({ name: `in-${name}`, plug: 'input' as const, type: '*' })),
    ...io.outputs.map((name) => ({ name: `out-${name}`, plug: 'output' as const, type: '*' })),
    ...(io.signals ?? []).map((name) => ({ name: `out-${name}`, plug: 'output' as const, type: 'signal' }))
  ]
});

const homeGraph = (): Graph => {
  const shell = [
    'sayBtn', 'bobBtn', 'showBtn', 'pickBBtn', 'pickCBtn', 'editBtn',
    'saidText', 'echoText', 'orderText', 'pulseText', 'nextText', 'shownText', 'doneAtText', 'runsText', 'filledText', 'editor'
  ];
  const nodes: RawNode[] = [
    { id: 'page', type: 'Page', label: 'Home', parameters: { title: 'Success Desk', urlPath: 'home' }, children: ['shell'] },
    { id: 'shell', type: 'Group', label: 'Shell', parent: 'page', children: shell, parameters: { flexDirection: 'column' } },
    button('sayBtn', 'Say'),
    button('bobBtn', 'Bob'),
    button('showBtn', 'Show'),
    button('pickBBtn', 'Pick b'),
    button('pickCBtn', 'Pick c and show'),
    button('editBtn', 'Edit'),
    text('saidText', 'Said'),
    text('echoText', 'Echo'),
    text('orderText', 'Order'),
    text('pulseText', 'Pulse'),
    text('nextText', 'Next'),
    text('shownText', 'Shown'),
    text('doneAtText', 'Done at'),
    text('runsText', 'Runs'),
    text('filledText', 'Filled'),
    { id: 'editor', type: '/Components/Editor', label: 'Editor', parent: 'shell', parameters: { name0: 'Cleo' } },
    variable('saidVar', 'said', 'said nothing'),
    variable('echoVar', 'echo', 'echo nothing'),
    variable('orderVar', 'order', 'order nothing'),
    variable('pulseVar', 'pulse', 'pulse nothing'),
    variable('nextVar', 'next', 'next nothing'),
    // Unseeded: the ticked run writes it at load, and a seed would be stored again on StrictMode's second mount, over
    // that write (P18-S121-SEEDTWICE).
    variable('shownVar', 'shown'),
    variable('doneAtVar', 'doneAt', 'done nothing'),
    variable('filledVar', 'filled', 'filled nothing'),
    variable('whoVar', 'who', 'Ann'),
    variable('pickVar', 'pick', 'a'),
    fnNode('greet', 'The greeting', "Outputs.word = 'hello ' + Inputs.who;\nOutputs.ping();", { inputs: ['who'], outputs: ['word'], signals: ['ping'] }),
    fnNode('pickFn', 'The pick to show', "Outputs.shown = 'shown ' + Inputs.pick;", { inputs: ['pick'], outputs: ['shown'], ticked: ['pick'] }),
    setVar('sdSaid', 'said'),
    setVar('sdEcho', 'echo'),
    setVar('sdOrderS', 'order', 'success'),
    setVar('sdOrderD', 'order', 'done'),
    setVar('sdPulseP', 'pulse', 'pulse'),
    setVar('sdPulseS', 'pulse', 'success'),
    setVar('sdNext', 'next', 'second'),
    setVar('sdNextS', 'next', 'success'),
    setVar('sdBob', 'who', 'Bob'),
    setVar('sdShown', 'shown'),
    { id: 'pickRuns', type: 'Counter', label: 'Runs of the pick', parameters: {} },
    setVar('sdDoneAt', 'doneAt'),
    setVar('sdPickB', 'pick', 'b'),
    setVar('sdPickC', 'pick', 'c'),
    setVar('sdFilled', 'filled', 'filled yes')
  ];
  return {
    nodes: placeAll(nodes),
    connections: [
      { fromId: 'sayBtn', fromProperty: 'onClick', toId: 'greet', toProperty: 'run' },
      { fromId: 'whoVar', fromProperty: 'value', toId: 'greet', toProperty: 'in-who' },
      { fromId: 'greet', fromProperty: 'success', toId: 'sdSaid', toProperty: 'do' },
      { fromId: 'greet', fromProperty: 'out-word', toId: 'sdSaid', toProperty: 'value' },
      { fromId: 'sdSaid', fromProperty: 'done', toId: 'sdEcho', toProperty: 'do' },
      { fromId: 'saidVar', fromProperty: 'value', toId: 'sdEcho', toProperty: 'value' },
      { fromId: 'greet', fromProperty: 'success', toId: 'sdOrderS', toProperty: 'do' },
      { fromId: 'greet', fromProperty: 'done', toId: 'sdOrderD', toProperty: 'do' },
      { fromId: 'greet', fromProperty: 'out-ping', toId: 'sdPulseP', toProperty: 'do' },
      { fromId: 'greet', fromProperty: 'success', toId: 'sdPulseS', toProperty: 'do' },
      { fromId: 'greet', fromProperty: 'success', toId: 'sdNextS', toProperty: 'do' },
      { fromId: 'bobBtn', fromProperty: 'onClick', toId: 'sdBob', toProperty: 'do' },
      { fromId: 'showBtn', fromProperty: 'onClick', toId: 'pickFn', toProperty: 'run' },
      { fromId: 'pickVar', fromProperty: 'value', toId: 'pickFn', toProperty: 'in-pick' },
      { fromId: 'pickFn', fromProperty: 'success', toId: 'sdShown', toProperty: 'do' },
      { fromId: 'pickFn', fromProperty: 'out-shown', toId: 'sdShown', toProperty: 'value' },
      { fromId: 'pickFn', fromProperty: 'done', toId: 'sdDoneAt', toProperty: 'do' },
      { fromId: 'pickFn', fromProperty: 'success', toId: 'pickRuns', toProperty: 'increase' },
      { fromId: 'pickRuns', fromProperty: 'currentCount', toId: 'runsText', toProperty: 'text' },
      { fromId: 'pickFn', fromProperty: 'out-shown', toId: 'sdDoneAt', toProperty: 'value' },
      { fromId: 'pickBBtn', fromProperty: 'onClick', toId: 'sdPickB', toProperty: 'do' },
      { fromId: 'pickCBtn', fromProperty: 'onClick', toId: 'sdPickC', toProperty: 'do' },
      { fromId: 'pickCBtn', fromProperty: 'onClick', toId: 'pickFn', toProperty: 'run' },
      { fromId: 'editBtn', fromProperty: 'onClick', toId: 'editor', toProperty: 'fill' },
      { fromId: 'editor', fromProperty: 'filled', toId: 'sdFilled', toProperty: 'do' },
      { fromId: 'filledVar', fromProperty: 'value', toId: 'filledText', toProperty: 'text' },
      { fromId: 'saidVar', fromProperty: 'value', toId: 'saidText', toProperty: 'text' },
      { fromId: 'echoVar', fromProperty: 'value', toId: 'echoText', toProperty: 'text' },
      { fromId: 'orderVar', fromProperty: 'value', toId: 'orderText', toProperty: 'text' },
      { fromId: 'pulseVar', fromProperty: 'value', toId: 'pulseText', toProperty: 'text' },
      { fromId: 'nextVar', fromProperty: 'value', toId: 'nextText', toProperty: 'text' },
      { fromId: 'shownVar', fromProperty: 'value', toId: 'shownText', toProperty: 'text' },
      { fromId: 'doneAtVar', fromProperty: 'value', toId: 'doneAtText', toProperty: 'text' }
    ]
  };
};

const editorGraph = (): Graph => ({
  nodes: placeAll([
    { id: 'edRoot', type: 'Group', label: 'Editor', children: ['edField'], parameters: {} },
    {
      id: 'edField',
      type: 'net.noodl.controls.textinput',
      label: 'draft',
      parent: 'edRoot',
      parameters: { placeholder: 'draft', 'runOnChange-startValue': false }
    },
    {
      id: 'edIn',
      type: 'Component Inputs',
      label: 'Inputs',
      parameters: {},
      ports: [
        { name: 'fill', plug: 'output', type: 'signal' },
        { name: 'name0', plug: 'output', type: 'string' }
      ]
    },
    { id: 'edOut', type: 'Component Outputs', label: 'Outputs', parameters: {}, ports: [{ name: 'filled', plug: 'input', type: 'signal' }] },
    fnNode('edFill', 'The name to edit', "Outputs.name = 'edit ' + Inputs.name;", { inputs: ['name'], outputs: ['name'] }),
    variable('edDraftVar', 'draft'),
    setVar('edSetDraft', 'draft')
  ]),
  connections: [
    { fromId: 'edIn', fromProperty: 'fill', toId: 'edFill', toProperty: 'run' },
    { fromId: 'edIn', fromProperty: 'name0', toId: 'edFill', toProperty: 'in-name' },
    { fromId: 'edFill', fromProperty: 'success', toId: 'edSetDraft', toProperty: 'do' },
    { fromId: 'edFill', fromProperty: 'out-name', toId: 'edSetDraft', toProperty: 'value' },
    { fromId: 'edSetDraft', fromProperty: 'done', toId: 'edField', toProperty: 'set' },
    { fromId: 'edFill', fromProperty: 'success', toId: 'edOut', toProperty: 'filled' },
    { fromId: 'edDraftVar', fromProperty: 'value', toId: 'edField', toProperty: 'startValue' }
  ]
});

/** The desk, before any variant's edit. */
export const successDesk = (): Desk => ({
  components: {
    'Pages/Home': homeGraph(),
    'Components/Editor': editorGraph()
  }
});

/** The desk written as a v2 project, into `dir` (or a new temporary folder), after `edit`. */
export const writeSuccessDesk = (edit?: (d: Desk) => void, dir?: string): { dir: string; desk: Desk } => {
  const desk = successDesk();
  edit?.(desk);
  return { dir: writeDeskProject(desk, { name: 'Success Desk', idBase: 'b8d20e00-0000-4000-8000-0000000015', prefix: 'success-desk-' }, dir), desk };
};
