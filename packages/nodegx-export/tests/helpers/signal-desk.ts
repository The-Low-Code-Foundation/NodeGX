import { Desk, Graph, RawNode, placeAll, writeDeskProject } from './root-desk';

/**
 * "Signal Desk" (P18 session 127, EXP-011 §94, P18-S126-INSIGNAL): a page that sends signals INTO components, built in a
 * temporary folder so the corpus golden (hls001) does not move. `the-signal-arrives-in-the-component.test.ts` grades it
 * against the runtime's own nodes (`runtime-mounted-arm.js`, the runtime's component instances).
 *
 * The page's Text reads the Variable `said`; the arms read every drawn Text in document order.
 *
 * - **Banner** (rocket-school's Feedback banner, its shape): signal inputs `show`, `hide`, `wipe` and a value input
 *   `message`. `show` goes to a States' To Open and to a Set Variable writing `said` from `message`; `hide` to To Closed
 *   and a Set Variable "said hidden"; the root is authored Mounted false and mounted by the States' `isOpen`. Inside, a
 *   field (start value "note Ann") whose text a Text beside it shows, cleared by `wipe` (bot-garden's Form reset,
 *   todo-list's clearNew). Its text goes to no Variable: a Clear does not send the text on in the export (P18-S127-CLEAROUT).
 * - The page: Show and Hide pulse the Banner from a click; Change sets the page's Variable `msg`, which feeds the
 *   Banner's `message`, and then pulses `show`, two wires off one click in that order (rocket-school's Round: the outcome
 *   set, then the banner shown; a Set Variable's own Done is not carried by the export, P18-S127-SETDONE);
 *   Wipe pulses `wipe`.
 * - **Asker**: a button "Ask" inside, its click a Component Outputs signal `asked`; on the page, `asked` pulses the
 *   Relay's `ping` (todo-list's Dialog flow: one instance's output into another's input).
 * - **Relay**: passes its signal input `ping` straight into its own Lamp's `light` (rocket-school's Round, `ask` into the
 *   banner's `hide`), and counts it too: `ping` into a Counter's Increase, the count on a Text.
 * - **Lamp**: `light` into a Set Variable that writes the Lamp's own Text "lamp lit".
 * - **Picker** (rocket-school's Focus picker, its Setup's "open the chooser and fill it"): placed in a Group authored Mounted
 *   false and mounted from the Variable `pickerOn`; Pick sets it and pulses `fill` off the same click. The runtime's instance exists
 *   while it is not drawn, so the pulse runs the chain inside ("picked filled") though the export draws the Picker only
 *   from that click's render.
 */

const inputs = (id: string, ports: Array<[string, string]>): RawNode => ({
  id,
  type: 'Component Inputs',
  label: 'Inputs',
  parameters: {},
  ports: ports.map(([name, type]) => ({ name, plug: 'output' as const, type }))
});

const homeGraph = (): Graph => {
  const shell = ['showBtn', 'hideBtn', 'changeBtn', 'wipeBtn', 'pickBtn', 'saidText', 'pickedText', 'banner', 'asker', 'relay', 'pickerBox'];
  const nodes: RawNode[] = [
    { id: 'page', type: 'Page', label: 'Home', parameters: { title: 'Signal Desk', urlPath: 'home' }, children: ['shell'] },
    { id: 'shell', type: 'Group', label: 'Shell', parent: 'page', children: shell, parameters: { flexDirection: 'column' } },
    { id: 'showBtn', type: 'net.noodl.controls.button', label: 'Show', parent: 'shell', parameters: { label: 'Show' } },
    { id: 'hideBtn', type: 'net.noodl.controls.button', label: 'Hide', parent: 'shell', parameters: { label: 'Hide' } },
    { id: 'changeBtn', type: 'net.noodl.controls.button', label: 'Change', parent: 'shell', parameters: { label: 'Change' } },
    { id: 'wipeBtn', type: 'net.noodl.controls.button', label: 'Wipe', parent: 'shell', parameters: { label: 'Wipe' } },
    { id: 'pickBtn', type: 'net.noodl.controls.button', label: 'Pick', parent: 'shell', parameters: { label: 'Pick' } },
    { id: 'saidText', type: 'Text', label: 'Said', parent: 'shell', parameters: {} },
    { id: 'pickedText', type: 'Text', label: 'Picked', parent: 'shell', parameters: {} },
    { id: 'banner', type: '/Components/Banner', label: 'Banner', parent: 'shell', parameters: {} },
    { id: 'asker', type: '/Components/Asker', label: 'Asker', parent: 'shell', parameters: {} },
    { id: 'relay', type: '/Components/Relay', label: 'Relay', parent: 'shell', parameters: {} },
    { id: 'pickerBox', type: 'Group', label: 'Picker box', parent: 'shell', children: ['picker'], parameters: { mounted: false } },
    { id: 'picker', type: '/Components/Picker', label: 'Picker', parent: 'pickerBox', parameters: {} },
    { id: 'pickerVar', type: 'Variable2', label: 'Picker on?', parameters: { name: 'pickerOn' } },
    { id: 'pickerSet', type: 'Set Variable', label: 'Picker on', parameters: { name: 'pickerOn', value: true } },
    { id: 'pickedVar', type: 'Variable2', label: 'Picked', parameters: { name: 'picked', value: 'picked nothing' } },
    { id: 'msgVar', type: 'Variable2', label: 'Message', parameters: { name: 'msg', value: 'hello one' } },
    { id: 'msgSet', type: 'Set Variable', label: 'Change the message', parameters: { name: 'msg', value: 'hello two' } },
    { id: 'saidVar', type: 'Variable2', label: 'Said', parameters: { name: 'said', value: 'said nothing' } }
  ];
  return {
    nodes: placeAll(nodes),
    connections: [
      { fromId: 'showBtn', fromProperty: 'onClick', toId: 'banner', toProperty: 'show' },
      { fromId: 'hideBtn', fromProperty: 'onClick', toId: 'banner', toProperty: 'hide' },
      { fromId: 'changeBtn', fromProperty: 'onClick', toId: 'msgSet', toProperty: 'do' },
      { fromId: 'changeBtn', fromProperty: 'onClick', toId: 'banner', toProperty: 'show' },
      { fromId: 'wipeBtn', fromProperty: 'onClick', toId: 'banner', toProperty: 'wipe' },
      { fromId: 'pickBtn', fromProperty: 'onClick', toId: 'pickerSet', toProperty: 'do' },
      { fromId: 'pickBtn', fromProperty: 'onClick', toId: 'picker', toProperty: 'fill' },
      { fromId: 'pickerVar', fromProperty: 'value', toId: 'pickerBox', toProperty: 'mounted' },
      { fromId: 'pickedVar', fromProperty: 'value', toId: 'pickedText', toProperty: 'text' },
      { fromId: 'msgVar', fromProperty: 'value', toId: 'banner', toProperty: 'message' },
      { fromId: 'asker', fromProperty: 'asked', toId: 'relay', toProperty: 'ping' },
      { fromId: 'saidVar', fromProperty: 'value', toId: 'saidText', toProperty: 'text' }
    ]
  };
};

const bannerGraph = (): Graph => ({
  nodes: placeAll([
    { id: 'bnRoot', type: 'Group', label: 'Banner', children: ['bnText', 'bnField', 'bnNoteText'], parameters: { mounted: false } },
    { id: 'bnText', type: 'Text', label: 'Banner text', parent: 'bnRoot', parameters: { text: 'the banner' } },
    { id: 'bnField', type: 'net.noodl.controls.textinput', label: 'Note box', parent: 'bnRoot', parameters: { startValue: 'note Ann' } },
    { id: 'bnNoteText', type: 'Text', label: 'Note text', parent: 'bnRoot', parameters: {} },
    inputs('bnIn', [['show', 'signal'], ['hide', 'signal'], ['wipe', 'signal'], ['message', 'string']]),
    {
      id: 'bnOpen',
      type: 'States',
      label: 'Open or closed',
      parameters: { states: 'closed,open', values: 'isOpen', useTransitions: false, 'type-isOpen': 'boolean', 'value-closed-isOpen': false, 'value-open-isOpen': true }
    },
    { id: 'bnSay', type: 'Set Variable', label: 'Say the message', parameters: { name: 'said' } },
    { id: 'bnHid', type: 'Set Variable', label: 'Say hidden', parameters: { name: 'said', value: 'said hidden' } }
  ]),
  connections: [
    { fromId: 'bnIn', fromProperty: 'show', toId: 'bnOpen', toProperty: 'to-open' },
    { fromId: 'bnIn', fromProperty: 'hide', toId: 'bnOpen', toProperty: 'to-closed' },
    { fromId: 'bnOpen', fromProperty: 'isOpen', toId: 'bnRoot', toProperty: 'mounted' },
    { fromId: 'bnIn', fromProperty: 'show', toId: 'bnSay', toProperty: 'do' },
    { fromId: 'bnIn', fromProperty: 'message', toId: 'bnSay', toProperty: 'value' },
    { fromId: 'bnIn', fromProperty: 'hide', toId: 'bnHid', toProperty: 'do' },
    { fromId: 'bnIn', fromProperty: 'wipe', toId: 'bnField', toProperty: 'clear' },
    { fromId: 'bnField', fromProperty: 'onTextChanged', toId: 'bnNoteText', toProperty: 'text' }
  ]
});

const askerGraph = (): Graph => ({
  nodes: placeAll([
    { id: 'akRoot', type: 'Group', label: 'Asker', children: ['akBtn'], parameters: {} },
    { id: 'akBtn', type: 'net.noodl.controls.button', label: 'Ask', parent: 'akRoot', parameters: { label: 'Ask' } },
    { id: 'akOut', type: 'Component Outputs', label: 'Outputs', parameters: {}, ports: [{ name: 'asked', plug: 'input', type: 'signal' }] }
  ]),
  connections: [{ fromId: 'akBtn', fromProperty: 'onClick', toId: 'akOut', toProperty: 'asked' }]
});

const relayGraph = (): Graph => ({
  nodes: placeAll([
    { id: 'rlRoot', type: 'Group', label: 'Relay', children: ['rlLamp', 'rlCountText'], parameters: {} },
    { id: 'rlLamp', type: '/Components/Lamp', label: 'Lamp', parent: 'rlRoot', parameters: {} },
    { id: 'rlCountText', type: 'Text', label: 'Pings text', parent: 'rlRoot', parameters: {} },
    inputs('rlIn', [['ping', 'signal']]),
    { id: 'rlCount', type: 'Counter', label: 'Pings', parameters: {} }
  ]),
  connections: [
    { fromId: 'rlIn', fromProperty: 'ping', toId: 'rlLamp', toProperty: 'light' },
    { fromId: 'rlIn', fromProperty: 'ping', toId: 'rlCount', toProperty: 'increase' },
    { fromId: 'rlCount', fromProperty: 'currentCount', toId: 'rlCountText', toProperty: 'text' }
  ]
});

const lampGraph = (): Graph => ({
  nodes: placeAll([
    { id: 'lpRoot', type: 'Group', label: 'Lamp', children: ['lpText'], parameters: {} },
    { id: 'lpText', type: 'Text', label: 'Lamp text', parent: 'lpRoot', parameters: {} },
    inputs('lpIn', [['light', 'signal']]),
    { id: 'lpVar', type: 'Variable2', label: 'Lamp', parameters: { name: 'lamp', value: 'lamp dark' } },
    { id: 'lpSet', type: 'Set Variable', label: 'Light it', parameters: { name: 'lamp', value: 'lamp lit' } }
  ]),
  connections: [
    { fromId: 'lpIn', fromProperty: 'light', toId: 'lpSet', toProperty: 'do' },
    { fromId: 'lpVar', fromProperty: 'value', toId: 'lpText', toProperty: 'text' }
  ]
});

const pickerGraph = (): Graph => ({
  nodes: placeAll([
    { id: 'pkRoot', type: 'Group', label: 'Picker', children: ['pkText'], parameters: {} },
    { id: 'pkText', type: 'Text', label: 'Picker text', parent: 'pkRoot', parameters: { text: 'the picker' } },
    inputs('pkIn', [['fill', 'signal']]),
    { id: 'pkSet', type: 'Set Variable', label: 'Fill it', parameters: { name: 'picked', value: 'picked filled' } }
  ]),
  connections: [{ fromId: 'pkIn', fromProperty: 'fill', toId: 'pkSet', toProperty: 'do' }]
});

/** The desk, before any variant's edit. */
export const signalDesk = (): Desk => ({
  components: {
    'Pages/Home': homeGraph(),
    'Components/Banner': bannerGraph(),
    'Components/Asker': askerGraph(),
    'Components/Relay': relayGraph(),
    'Components/Lamp': lampGraph(),
    'Components/Picker': pickerGraph()
  }
});

/** The desk written as a v2 project, into `dir` (or a new temporary folder), after `edit`. */
export const writeSignalDesk = (edit?: (d: Desk) => void, dir?: string): { dir: string; desk: Desk } => {
  const desk = signalDesk();
  edit?.(desk);
  return { dir: writeDeskProject(desk, { name: 'Signal Desk', idBase: 'b8d20e00-0000-4000-8000-0000000012', prefix: 'signal-desk-' }, dir), desk };
};
