import { Desk, Graph, RawNode, placeAll, writeDeskProject } from './root-desk';

/**
 * "Set Desk" (P18 session 128, EXP-011 §95, P18-S127-SETDONE): a page whose chains hang off a Set Variable's Done, built in
 * a temporary folder so the corpus golden (hls001) does not move. `the-set-runs-its-done-chain.test.ts` grades it against
 * the runtime's own nodes (`runtime-mounted-arm.js`).
 *
 * The page's Texts read the Variables `said`, `echo`, `order`, `told` and `gameText`; the arms read every drawn Text in
 * document order. (The Game's Variable is the page's, seeded there: a Variable seeded inside a component the same click
 * mounts and pulses is stored again on StrictMode's second mount, over the pulse's write, P18-S121-SEEDTWICE and P18-S128-SEEDREMOUNT; and the
 * Game's own Text is a literal, as a wired Text with no value yet reads "Text" in the runtime only, P18-S122-TEXTDEFAULT.)
 *
 * - **Ready** (rocket-school's Round: "set the outcome, then show the banner"): the click sets `said` to "ready"; its Done
 *   sets `echo` from a Variable that reads `said` (what a reader of the variable sees when Done fires), and pulses the
 *   Banner's `show` (a States opens the Banner's root); its Completed sets `told` to "told ready" (after the Done chain).
 * - **Order**: the click's first wire sets `order` to "first", whose Done sets it to "done after" and whose Completed sets it
 *   to "completed after"; the click's second wire sets it to "second". Which the page shows is the order the runtime runs
 *   a Done chain in, against the click's later wires (and, with the wires the other way round, Completed after Done).
 * - **Play** (rocket-school's Monster and Race: `zgSetPlaying.done` into the game's `start`): the click sets `playing`,
 *   which mounts the box the Game sits in, and its Done pulses the Game's `start`. Inside, `start` sets `gameText` to
 *   "game on", whose Done sets `told` (a Done chain run from a signal input, in the child's effect).
 * - **Quiz** (the templates' `Component Outputs.answered`): its button Answer sets `answer`, whose Done fires the Quiz's
 *   own signal output `answered`; on the page, `answered` sets `said` from a Variable reading `answer`.
 */

const inputs = (id: string, ports: Array<[string, string]>): RawNode => ({
  id,
  type: 'Component Inputs',
  label: 'Inputs',
  parameters: {},
  ports: ports.map(([name, type]) => ({ name, plug: 'output' as const, type }))
});

const homeGraph = (): Graph => {
  const shell = ['readyBtn', 'orderBtn', 'playBtn', 'saidText', 'echoText', 'orderText', 'toldText', 'gameText', 'banner', 'quiz', 'gameBox'];
  const nodes: RawNode[] = [
    { id: 'page', type: 'Page', label: 'Home', parameters: { title: 'Set Desk', urlPath: 'home' }, children: ['shell'] },
    { id: 'shell', type: 'Group', label: 'Shell', parent: 'page', children: shell, parameters: { flexDirection: 'column' } },
    { id: 'readyBtn', type: 'net.noodl.controls.button', label: 'Ready', parent: 'shell', parameters: { label: 'Ready' } },
    { id: 'orderBtn', type: 'net.noodl.controls.button', label: 'Order', parent: 'shell', parameters: { label: 'Order' } },
    { id: 'playBtn', type: 'net.noodl.controls.button', label: 'Play', parent: 'shell', parameters: { label: 'Play' } },
    { id: 'saidText', type: 'Text', label: 'Said', parent: 'shell', parameters: {} },
    { id: 'echoText', type: 'Text', label: 'Echo', parent: 'shell', parameters: {} },
    { id: 'orderText', type: 'Text', label: 'Order', parent: 'shell', parameters: {} },
    { id: 'toldText', type: 'Text', label: 'Told', parent: 'shell', parameters: {} },
    { id: 'gameText', type: 'Text', label: 'Game', parent: 'shell', parameters: {} },
    { id: 'banner', type: '/Components/Banner', label: 'Banner', parent: 'shell', parameters: {} },
    { id: 'quiz', type: '/Components/Quiz', label: 'Quiz', parent: 'shell', parameters: {} },
    { id: 'gameBox', type: 'Group', label: 'Game box', parent: 'shell', children: ['game'], parameters: { mounted: false } },
    { id: 'game', type: '/Components/Game', label: 'Game', parent: 'gameBox', parameters: {} },
    { id: 'saidVar', type: 'Variable2', label: 'Said', parameters: { name: 'said', value: 'said nothing' } },
    { id: 'echoVar', type: 'Variable2', label: 'Echo', parameters: { name: 'echo', value: 'echo nothing' } },
    { id: 'orderVar', type: 'Variable2', label: 'Order', parameters: { name: 'order', value: 'order nothing' } },
    { id: 'toldVar', type: 'Variable2', label: 'Told', parameters: { name: 'told', value: 'told nothing' } },
    { id: 'gameVar', type: 'Variable2', label: 'Game', parameters: { name: 'gameText', value: 'game idle' } },
    { id: 'playingVar', type: 'Variable2', label: 'Playing?', parameters: { name: 'playing' } },
    { id: 'answerVar', type: 'Variable2', label: 'Answer', parameters: { name: 'answer' } },
    { id: 'sdReady', type: 'Set Variable', label: 'Say ready', parameters: { name: 'said', value: 'ready' } },
    { id: 'sdEcho', type: 'Set Variable', label: 'Echo what was said', parameters: { name: 'echo' } },
    { id: 'sdToldReady', type: 'Set Variable', label: 'Tell ready', parameters: { name: 'told', value: 'told ready' } },
    { id: 'sdFirst', type: 'Set Variable', label: 'Order first', parameters: { name: 'order', value: 'first' } },
    { id: 'sdAfter', type: 'Set Variable', label: 'Order after', parameters: { name: 'order', value: 'done after' } },
    { id: 'sdLast', type: 'Set Variable', label: 'Order completed', parameters: { name: 'order', value: 'completed after' } },
    { id: 'sdSecond', type: 'Set Variable', label: 'Order second', parameters: { name: 'order', value: 'second' } },
    { id: 'sdPlay', type: 'Set Variable', label: 'Playing', parameters: { name: 'playing', value: true } },
    { id: 'sdHeard', type: 'Set Variable', label: 'Say the answer', parameters: { name: 'said' } }
  ];
  return {
    nodes: placeAll(nodes),
    connections: [
      { fromId: 'readyBtn', fromProperty: 'onClick', toId: 'sdReady', toProperty: 'do' },
      { fromId: 'sdReady', fromProperty: 'done', toId: 'sdEcho', toProperty: 'do' },
      { fromId: 'saidVar', fromProperty: 'value', toId: 'sdEcho', toProperty: 'value' },
      { fromId: 'sdReady', fromProperty: 'done', toId: 'banner', toProperty: 'show' },
      { fromId: 'sdReady', fromProperty: 'completed', toId: 'sdToldReady', toProperty: 'do' },
      { fromId: 'orderBtn', fromProperty: 'onClick', toId: 'sdFirst', toProperty: 'do' },
      { fromId: 'sdFirst', fromProperty: 'done', toId: 'sdAfter', toProperty: 'do' },
      { fromId: 'sdFirst', fromProperty: 'completed', toId: 'sdLast', toProperty: 'do' },
      { fromId: 'orderBtn', fromProperty: 'onClick', toId: 'sdSecond', toProperty: 'do' },
      { fromId: 'playBtn', fromProperty: 'onClick', toId: 'sdPlay', toProperty: 'do' },
      { fromId: 'sdPlay', fromProperty: 'done', toId: 'game', toProperty: 'start' },
      { fromId: 'playingVar', fromProperty: 'value', toId: 'gameBox', toProperty: 'mounted' },
      { fromId: 'quiz', fromProperty: 'answered', toId: 'sdHeard', toProperty: 'do' },
      { fromId: 'answerVar', fromProperty: 'value', toId: 'sdHeard', toProperty: 'value' },
      { fromId: 'saidVar', fromProperty: 'value', toId: 'saidText', toProperty: 'text' },
      { fromId: 'echoVar', fromProperty: 'value', toId: 'echoText', toProperty: 'text' },
      { fromId: 'orderVar', fromProperty: 'value', toId: 'orderText', toProperty: 'text' },
      { fromId: 'toldVar', fromProperty: 'value', toId: 'toldText', toProperty: 'text' },
      { fromId: 'gameVar', fromProperty: 'value', toId: 'gameText', toProperty: 'text' }
    ]
  };
};

const bannerGraph = (): Graph => ({
  nodes: placeAll([
    { id: 'bnRoot', type: 'Group', label: 'Banner', children: ['bnText'], parameters: { mounted: false } },
    { id: 'bnText', type: 'Text', label: 'Banner text', parent: 'bnRoot', parameters: { text: 'the banner' } },
    inputs('bnIn', [['show', 'signal']]),
    {
      id: 'bnOpen',
      type: 'States',
      label: 'Open or closed',
      parameters: { states: 'closed,open', values: 'isOpen', useTransitions: false, 'type-isOpen': 'boolean', 'value-closed-isOpen': false, 'value-open-isOpen': true }
    }
  ]),
  connections: [
    { fromId: 'bnIn', fromProperty: 'show', toId: 'bnOpen', toProperty: 'to-open' },
    { fromId: 'bnOpen', fromProperty: 'isOpen', toId: 'bnRoot', toProperty: 'mounted' }
  ]
});

const quizGraph = (): Graph => ({
  nodes: placeAll([
    { id: 'qzRoot', type: 'Group', label: 'Quiz', children: ['qzBtn'], parameters: {} },
    { id: 'qzBtn', type: 'net.noodl.controls.button', label: 'Answer', parent: 'qzRoot', parameters: { label: 'Answer' } },
    { id: 'qzSet', type: 'Set Variable', label: 'Answer yes', parameters: { name: 'answer', value: 'answer yes' } },
    { id: 'qzOut', type: 'Component Outputs', label: 'Outputs', parameters: {}, ports: [{ name: 'answered', plug: 'input', type: 'signal' }] }
  ]),
  connections: [
    { fromId: 'qzBtn', fromProperty: 'onClick', toId: 'qzSet', toProperty: 'do' },
    { fromId: 'qzSet', fromProperty: 'done', toId: 'qzOut', toProperty: 'answered' }
  ]
});

const gameGraph = (): Graph => ({
  nodes: placeAll([
    { id: 'gmRoot', type: 'Group', label: 'Game', children: ['gmText'], parameters: {} },
    { id: 'gmText', type: 'Text', label: 'Game text', parent: 'gmRoot', parameters: { text: 'the game' } },
    inputs('gmIn', [['start', 'signal']]),
    { id: 'gmSet', type: 'Set Variable', label: 'Game on', parameters: { name: 'gameText', value: 'game on' } },
    { id: 'gmTell', type: 'Set Variable', label: 'Tell the page', parameters: { name: 'told', value: 'told game' } }
  ]),
  connections: [
    { fromId: 'gmIn', fromProperty: 'start', toId: 'gmSet', toProperty: 'do' },
    { fromId: 'gmSet', fromProperty: 'done', toId: 'gmTell', toProperty: 'do' }
  ]
});

/** The desk, before any variant's edit. */
export const setDesk = (): Desk => ({
  components: {
    'Pages/Home': homeGraph(),
    'Components/Banner': bannerGraph(),
    'Components/Quiz': quizGraph(),
    'Components/Game': gameGraph()
  }
});

/** The desk written as a v2 project, into `dir` (or a new temporary folder), after `edit`. */
export const writeSetDesk = (edit?: (d: Desk) => void, dir?: string): { dir: string; desk: Desk } => {
  const desk = setDesk();
  edit?.(desk);
  return { dir: writeDeskProject(desk, { name: 'Set Desk', idBase: 'b8d20e00-0000-4000-8000-0000000013', prefix: 'set-desk-' }, dir), desk };
};
