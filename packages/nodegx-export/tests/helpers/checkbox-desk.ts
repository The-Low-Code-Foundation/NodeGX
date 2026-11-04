import { Desk, Graph, RawNode, placeAll, writeDeskProject } from './root-desk';

/**
 * "Checkbox Desk" (P134 HTX-003, session 5): a page of checkboxes in the shapes the templates wire them (24 boxes,
 * measured 2026-11-04 across `templates/`), built in a temporary folder. `html-lists-fields-pages.test.ts` §F grades the
 * HTML export against the runtime's own nodes (`runtime-mounted-arm.js`, its `boxes` reading: each box `[label]=on|off`
 * in document order, an unlabelled one named `#1`, `#2`…; a step `tick:<name>` clicks it as a person does).
 *
 * - **Done** (planning's Block sheet): its Checked read out (an Expression into a Text) and its Changed counted.
 *   **Check** and **Uncheck** send its Check and Uncheck, which never fire Changed, and do nothing when it already is.
 * - **Mirror**: its Checked wired from Done's Checked (the graph path, which never fires Changed); ticked by hand it holds
 *   its own value until Done's next change.
 * - **Later** (planning's Money editor): mounted while Done is ticked; its Changed counted. The runtime keeps what it
 *   holds while it is gone (the node outlives its element).
 * - **a bare box** (nightbook's Setup, gram's Join): no label; its Checked is a Function's input, the Function run by
 *   **Save** writing a Text.
 * - **Toggle**, placed (marketplace's WayToggle): its box's Checked is the component's input `isOn` (the page passes
 *   true), its Checked in words and its Changed are the component's outputs `said` and `flipped`.
 * - **Days**, placed (planning's Settings sheet, its seven day boxes): a Function run on the component's input `mon`
 *   sends its box Mon's Check or Uncheck from its own signal outputs. The page passes the Variable `monWanted` (true at
 *   load); **Want mon** and **Drop mon** write it.
 *
 * {@link withRefusedShapes} adds the three shapes the PLAN refuses in every export (the React export's report says the same
 * words): a Function run on a Variable's change whose signal sends Check and Uncheck (planning's own Function, run on a
 * component input, travels: Days), a label fed by a component input (marketplace), and a Checked read only by an
 * Expression.
 */

const button = (id: string, label: string, parent = 'shell'): RawNode => ({ id, type: 'net.noodl.controls.button', label, parent, parameters: { label } });
const text = (id: string, label: string, parent = 'shell'): RawNode => ({ id, type: 'Text', label, parent, parameters: {} });
const box = (id: string, label: string | undefined, parameters: Record<string, unknown> = {}, parent = 'shell'): RawNode => ({
  id,
  type: 'net.noodl.controls.checkbox',
  label: label ?? 'Box',
  parent,
  parameters: label === undefined ? { useLabel: false, ...parameters } : { useLabel: true, label, ...parameters }
});
const words = (id: string, name: string, on: string, off: string): RawNode => ({
  id,
  type: 'Expression',
  label: `${name} in words`,
  parameters: { expression: `ticked ? '${on}' : '${off}'` }
});
const said = (from: string, expr: string, to: string) => [
  { fromId: from, fromProperty: 'checked', toId: expr, toProperty: 'ticked' },
  { fromId: expr, fromProperty: 'result', toId: to, toProperty: 'text' }
];

const homeGraph = (): Graph => {
  const shell = [
    'checkBtn', 'uncheckBtn', 'saveBtn', 'wantMonBtn', 'dropMonBtn',
    'doneText', 'doneCountText', 'mirrorText', 'mirrorCountText', 'laterCountText', 'bareText', 'toggleText', 'flipCountText',
    'doneBox', 'mirrorBox', 'laterBox', 'bareBox', 'toggle', 'days'
  ];
  const nodes: RawNode[] = [
    { id: 'page', type: 'Page', label: 'Home', parameters: { title: 'Checkbox Desk', urlPath: 'home' }, children: ['shell'] },
    { id: 'shell', type: 'Group', label: 'Shell', parent: 'page', children: shell, parameters: { flexDirection: 'column' } },
    button('checkBtn', 'Check'),
    button('uncheckBtn', 'Uncheck'),
    button('saveBtn', 'Save'),
    button('wantMonBtn', 'Want mon'),
    button('dropMonBtn', 'Drop mon'),
    text('doneText', 'Done words'),
    text('doneCountText', 'Done changes'),
    text('mirrorText', 'Mirror words'),
    text('mirrorCountText', 'Mirror changes'),
    text('laterCountText', 'Later changes'),
    text('bareText', 'Bare words'),
    text('toggleText', 'Toggle words'),
    text('flipCountText', 'Flips'),
    box('doneBox', 'Done'),
    box('mirrorBox', 'Mirror'),
    box('laterBox', 'Later'),
    box('bareBox', undefined),
    { id: 'toggle', type: '/Components/Toggle', label: 'Toggle', parent: 'shell', parameters: { isOn: true } },
    { id: 'days', type: '/Components/Days', label: 'Days', parent: 'shell', parameters: {} },
    { id: 'monWantedVar', type: 'Variable2', label: 'monWanted', parameters: { name: 'monWanted', value: true } },
    { id: 'wantMon', type: 'Set Variable', label: 'Want mon', parameters: { name: 'monWanted', value: true } },
    { id: 'dropMon', type: 'Set Variable', label: 'Drop mon', parameters: { name: 'monWanted', value: false } },
    words('doneWords', 'Done', 'done ticked', 'done open'),
    words('mirrorWords', 'Mirror', 'mirror ticked', 'mirror open'),
    { id: 'doneCount', type: 'Counter', label: 'Done changes', parameters: {} },
    { id: 'mirrorCount', type: 'Counter', label: 'Mirror changes', parameters: {} },
    { id: 'laterCount', type: 'Counter', label: 'Later changes', parameters: {} },
    { id: 'flipCount', type: 'Counter', label: 'Flips', parameters: {} },
    {
      id: 'bareFn',
      type: 'JavaScriptFunction',
      label: 'Save it',
      // Run is wired, so its input's arrival does not run it (NDA-017: the editor's load writes the box unticked).
      parameters: { functionScript: "Outputs.said = Inputs.hidden ? 'bare ticked' : 'bare open';", 'runOnChange-in-hidden': false },
      ports: [
        { name: 'in-hidden', plug: 'input', type: '*' },
        { name: 'out-said', plug: 'output', type: '*' }
      ]
    }
  ];
  return {
    nodes: placeAll(nodes),
    connections: [
      ...said('doneBox', 'doneWords', 'doneText'),
      { fromId: 'doneBox', fromProperty: 'onChange', toId: 'doneCount', toProperty: 'increase' },
      { fromId: 'doneCount', fromProperty: 'currentCount', toId: 'doneCountText', toProperty: 'text' },
      { fromId: 'checkBtn', fromProperty: 'onClick', toId: 'doneBox', toProperty: 'check' },
      { fromId: 'uncheckBtn', fromProperty: 'onClick', toId: 'doneBox', toProperty: 'uncheck' },
      { fromId: 'doneBox', fromProperty: 'checked', toId: 'mirrorBox', toProperty: 'checked' },
      ...said('mirrorBox', 'mirrorWords', 'mirrorText'),
      { fromId: 'mirrorBox', fromProperty: 'onChange', toId: 'mirrorCount', toProperty: 'increase' },
      { fromId: 'mirrorCount', fromProperty: 'currentCount', toId: 'mirrorCountText', toProperty: 'text' },
      { fromId: 'doneBox', fromProperty: 'checked', toId: 'laterBox', toProperty: 'mounted' },
      { fromId: 'laterBox', fromProperty: 'onChange', toId: 'laterCount', toProperty: 'increase' },
      { fromId: 'laterCount', fromProperty: 'currentCount', toId: 'laterCountText', toProperty: 'text' },
      { fromId: 'bareBox', fromProperty: 'checked', toId: 'bareFn', toProperty: 'in-hidden' },
      { fromId: 'saveBtn', fromProperty: 'onClick', toId: 'bareFn', toProperty: 'run' },
      { fromId: 'bareFn', fromProperty: 'out-said', toId: 'bareText', toProperty: 'text' },
      { fromId: 'toggle', fromProperty: 'said', toId: 'toggleText', toProperty: 'text' },
      { fromId: 'toggle', fromProperty: 'flipped', toId: 'flipCount', toProperty: 'increase' },
      { fromId: 'flipCount', fromProperty: 'currentCount', toId: 'flipCountText', toProperty: 'text' },
      { fromId: 'monWantedVar', fromProperty: 'value', toId: 'days', toProperty: 'mon' },
      { fromId: 'wantMonBtn', fromProperty: 'onClick', toId: 'wantMon', toProperty: 'do' },
      { fromId: 'dropMonBtn', fromProperty: 'onClick', toId: 'dropMon', toProperty: 'do' }
    ]
  };
};

const daysGraph = (): Graph => ({
  nodes: placeAll([
    { id: 'dyRoot', type: 'Group', label: 'Days', children: ['dyMon'], parameters: {} },
    box('dyMon', 'Mon', {}, 'dyRoot'),
    { id: 'dyIn', type: 'Component Inputs', label: 'Inputs', parameters: {}, ports: [{ name: 'mon', plug: 'output', type: 'boolean' }] },
    {
      id: 'dyFn',
      type: 'JavaScriptFunction',
      label: 'Tick the days to match',
      // planning's own pattern: it remembers what it last asked for (`this.`), and asks only on a change.
      parameters: { functionScript: 'var want = Inputs.mon === true;\nif (this.last !== want) {\n  if (want) Outputs.monOn();\n  else Outputs.monOff();\n}\nthis.last = want;' },
      ports: [
        { name: 'in-mon', plug: 'input', type: '*' },
        { name: 'out-monOn', plug: 'output', type: 'signal' },
        { name: 'out-monOff', plug: 'output', type: 'signal' }
      ]
    }
  ]),
  connections: [
    { fromId: 'dyIn', fromProperty: 'mon', toId: 'dyFn', toProperty: 'in-mon' },
    { fromId: 'dyFn', fromProperty: 'out-monOn', toId: 'dyMon', toProperty: 'check' },
    { fromId: 'dyFn', fromProperty: 'out-monOff', toId: 'dyMon', toProperty: 'uncheck' }
  ]
});

const toggleGraph = (): Graph => ({
  nodes: placeAll([
    { id: 'tgRoot', type: 'Group', label: 'Toggle', children: ['tgBox'], parameters: {} },
    box('tgBox', 'Email me', {}, 'tgRoot'),
    { id: 'tgWords', type: 'Expression', label: 'Toggle in words', parameters: { expression: "ticked ? 'email on' : 'email off'" } },
    {
      id: 'tgIn',
      type: 'Component Inputs',
      label: 'Inputs',
      parameters: {},
      ports: [{ name: 'isOn', plug: 'output', type: 'boolean' }]
    },
    {
      id: 'tgOut',
      type: 'Component Outputs',
      label: 'Outputs',
      parameters: {},
      ports: [
        { name: 'said', plug: 'input', type: 'string' },
        { name: 'flipped', plug: 'input', type: 'signal' }
      ]
    }
  ]),
  connections: [
    { fromId: 'tgIn', fromProperty: 'isOn', toId: 'tgBox', toProperty: 'checked' },
    { fromId: 'tgBox', fromProperty: 'checked', toId: 'tgWords', toProperty: 'ticked' },
    { fromId: 'tgWords', fromProperty: 'result', toId: 'tgOut', toProperty: 'said' },
    { fromId: 'tgBox', fromProperty: 'onChange', toId: 'tgOut', toProperty: 'flipped' }
  ]
});

/**
 * The three shapes the plan refuses (see the desk's comment): **Wed**, checked and unchecked by a Function run on the
 * Variable `days` (**Days none**, **Days mon**); **Named**, whose label is the Toggle-like component Named's input; and
 * **Quiet**, whose Checked only an Expression reads.
 */
export const withRefusedShapes = (d: Desk): void => {
  const home = d.components['Pages/Home'];
  home.nodes.push(
    ...placeAll(([
      button('daysNoneBtn', 'Days none'),
      button('daysMonBtn', 'Days mon'),
      text('monText', 'Wed words'),
      text('quietText', 'Quiet words'),
      box('monBox', 'Wed'),
      box('quietBox', 'Quiet'),
      { id: 'named', type: '/Components/Named', label: 'Named', parent: 'shell', parameters: { name: 'Named' } },
      words('monWords', 'Wed', 'wed ticked', 'wed open'),
      words('quietWords', 'Quiet', 'quiet ticked', 'quiet open'),
      { id: 'monCount', type: 'Counter', label: 'Wed changes', parameters: {} },
      { id: 'daysVar', type: 'Variable2', label: 'days', parameters: { name: 'days', value: 'mon,tue' } },
      { id: 'daysNone', type: 'Set Variable', label: 'Days none', parameters: { name: 'days', value: 'none' } },
      { id: 'daysMon', type: 'Set Variable', label: 'Days mon', parameters: { name: 'days', value: 'mon' } },
      {
        id: 'monFn',
        type: 'JavaScriptFunction',
        label: 'Which days',
        parameters: { functionScript: "if (String(Inputs.days).indexOf('mon') >= 0) Outputs.monOn();\nelse Outputs.monOff();", 'runOnChange-in-days': true },
        ports: [
          { name: 'in-days', plug: 'input', type: '*' },
          { name: 'out-monOn', plug: 'output', type: 'signal' },
          { name: 'out-monOff', plug: 'output', type: 'signal' }
        ]
      }
    ] as RawNode[]).map((n) => ({ ...n, y: (n.y ?? 0) + 2000 })))
  );
  home.nodes.find((n) => n.id === 'shell')!.children!.push('daysNoneBtn', 'daysMonBtn', 'monText', 'quietText', 'monBox', 'quietBox', 'named');
  home.connections.push(
    { fromId: 'daysVar', fromProperty: 'value', toId: 'monFn', toProperty: 'in-days' },
    { fromId: 'daysNoneBtn', fromProperty: 'onClick', toId: 'daysNone', toProperty: 'do' },
    { fromId: 'daysMonBtn', fromProperty: 'onClick', toId: 'daysMon', toProperty: 'do' },
    { fromId: 'monFn', fromProperty: 'out-monOn', toId: 'monBox', toProperty: 'check' },
    { fromId: 'monFn', fromProperty: 'out-monOff', toId: 'monBox', toProperty: 'uncheck' },
    ...said('monBox', 'monWords', 'monText'),
    { fromId: 'monBox', fromProperty: 'onChange', toId: 'monCount', toProperty: 'increase' },
    ...said('quietBox', 'quietWords', 'quietText')
  );
  d.components['Components/Named'] = {
    nodes: placeAll([
      { id: 'nmRoot', type: 'Group', label: 'Named', children: ['nmBox'], parameters: {} },
      box('nmBox', 'Box', {}, 'nmRoot'),
      { id: 'nmIn', type: 'Component Inputs', label: 'Inputs', parameters: {}, ports: [{ name: 'name', plug: 'output', type: 'string' }] }
    ]),
    connections: [{ fromId: 'nmIn', fromProperty: 'name', toId: 'nmBox', toProperty: 'label' }]
  };
};

/** The desk, before any variant's edit. */
export const checkboxDesk = (): Desk => ({
  components: {
    'Pages/Home': homeGraph(),
    'Components/Toggle': toggleGraph(),
    'Components/Days': daysGraph()
  }
});

/** The desk written as a v2 project, into `dir` (or a new temporary folder), after `edit`. */
export const writeCheckboxDesk = (edit?: (d: Desk) => void, dir?: string): { dir: string; desk: Desk } => {
  const desk = checkboxDesk();
  edit?.(desk);
  return { dir: writeDeskProject(desk, { name: 'Checkbox Desk', idBase: 'b8d20e00-0000-4000-8000-0000000034', prefix: 'checkbox-desk-' }, dir), desk };
};
