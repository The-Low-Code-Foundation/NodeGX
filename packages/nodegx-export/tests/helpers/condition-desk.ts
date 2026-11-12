/**
 * "Condition Desk" (P134 session 12): a Condition with "run on change" ticked (LOGIC-TARGET §10), in the two shapes the
 * templates use it in (31 of them: bot-garden, rocket-school, star-class). `html-a-condition-tests-again.test.ts` reads it
 * in the runtime (`runtime-mounted-arm.js`, the runtime's own Condition), the React export and the HTML export.
 *
 * - **Lamp** (bot-garden's Seg, Tab, Chip: an input moves a States node): a component input `lit` into a Condition; its
 *   On True to the States' To On, its On False to To Off; a Text shows the States' `word`. On True also runs a Function
 *   that counts its runs (rocket-school's Hunt: a value that is true runs a Function), a Text shows the count. So a new
 *   value that tests true again shows: the count goes up.
 * - The page: a Variable `lamp` (start '') feeds the Lamp's `lit`; Lit sets it to "yes", Lit again to "very" (true
 *   again, a different value), Dark to '' . A second Condition on the page tests the Variable straight and says
 *   "home lit" or "home dark" in the Variable `said`.
 * - Show and Hide mount and unmount a second Lamp (a Group, Mounted from the Variable `shown`): the Condition tests
 *   again as its part is made.
 */

import { placeAll, writeDeskProject, type Desk, type Graph, type RawNode } from './root-desk';

export const COUNT_SCRIPT = "this.n = (this.n || 0) + 1;\nOutputs.count = 'lit ' + this.n;";

const lampGraph = (): Graph => ({
  nodes: placeAll([
    { id: 'lmRoot', type: 'Group', label: 'Lamp', children: ['lmWord', 'lmCount'], parameters: {} },
    { id: 'lmWord', type: 'Text', label: 'Lamp word', parent: 'lmRoot', parameters: {} },
    { id: 'lmCount', type: 'Text', label: 'Lamp count', parent: 'lmRoot', parameters: { text: 'lit 0' } },
    { id: 'lmIn', type: 'Component Inputs', label: 'Inputs', parameters: {}, ports: [{ name: 'lit', plug: 'output', type: 'string' }] },
    { id: 'lmCond', type: 'Condition', label: 'Is it lit?', parameters: {} },
    {
      id: 'lmStates',
      type: 'States',
      label: 'On or off',
      parameters: { states: 'off,on', values: 'word', useTransitions: false, 'type-word': 'string', 'value-off-word': 'lamp off', 'value-on-word': 'lamp on' }
    },
    {
      id: 'lmFn',
      type: 'JavaScriptFunction',
      label: 'Count',
      parameters: { functionScript: COUNT_SCRIPT },
      ports: [{ name: 'out-count', plug: 'output', type: '*' }]
    }
  ] as RawNode[]),
  connections: [
    { fromId: 'lmIn', fromProperty: 'lit', toId: 'lmCond', toProperty: 'condition' },
    { fromId: 'lmCond', fromProperty: 'ontrue', toId: 'lmStates', toProperty: 'to-on' },
    { fromId: 'lmCond', fromProperty: 'onfalse', toId: 'lmStates', toProperty: 'to-off' },
    { fromId: 'lmCond', fromProperty: 'ontrue', toId: 'lmFn', toProperty: 'run' },
    { fromId: 'lmStates', fromProperty: 'word', toId: 'lmWord', toProperty: 'text' },
    { fromId: 'lmFn', fromProperty: 'out-count', toId: 'lmCount', toProperty: 'text' }
  ]
});

const homeGraph = (): Graph => {
  const buttons = ['Lit', 'Lit again', 'Dark', 'Show', 'Hide'];
  const nodes: RawNode[] = [
    { id: 'page', type: 'Page', label: 'Home', parameters: { title: 'Condition Desk', urlPath: 'home' }, children: ['shell'] },
    { id: 'shell', type: 'Group', label: 'Shell', parent: 'page', children: ['saidText', 'lamp', 'box', ...buttons.map((_, i) => `b${i}`)], parameters: { flexDirection: 'column' } },
    { id: 'saidText', type: 'Text', label: 'Said', parent: 'shell', parameters: {} },
    { id: 'lamp', type: '/Components/Lamp', label: 'Lamp', parent: 'shell', parameters: {} },
    { id: 'box', type: 'Group', label: 'Second lamp box', parent: 'shell', children: ['lamp2'], parameters: { mounted: false } },
    { id: 'lamp2', type: '/Components/Lamp', label: 'Second lamp', parent: 'box', parameters: {} },
    ...buttons.map((label, i): RawNode => ({ id: `b${i}`, type: 'net.noodl.controls.button', label, parent: 'shell', parameters: { label } })),
    { id: 'lampVar', type: 'Variable2', label: 'Lamp', parameters: { name: 'lamp', value: '' } },
    { id: 'saidVar', type: 'Variable2', label: 'Said', parameters: { name: 'said', value: 'said nothing' } },
    { id: 'shownVar', type: 'Variable2', label: 'Shown', parameters: { name: 'shown', value: false } },
    { id: 'setYes', type: 'Set Variable', label: 'Light it', parameters: { name: 'lamp', value: 'yes' } },
    { id: 'setVery', type: 'Set Variable', label: 'Light it again', parameters: { name: 'lamp', value: 'very' } },
    { id: 'setDark', type: 'Set Variable', label: 'Darken it', parameters: { name: 'lamp', value: '' } },
    { id: 'setShow', type: 'Set Variable', label: 'Show it', parameters: { name: 'shown', value: true } },
    { id: 'setHide', type: 'Set Variable', label: 'Hide it', parameters: { name: 'shown', value: false } },
    { id: 'homeCond', type: 'Condition', label: 'Is the lamp lit?', parameters: {} },
    { id: 'sayLit', type: 'Set Variable', label: 'Say lit', parameters: { name: 'said', value: 'home lit' } },
    { id: 'sayDark', type: 'Set Variable', label: 'Say dark', parameters: { name: 'said', value: 'home dark' } }
  ];
  return {
    nodes: placeAll(nodes),
    connections: [
      { fromId: 'b0', fromProperty: 'onClick', toId: 'setYes', toProperty: 'do' },
      { fromId: 'b1', fromProperty: 'onClick', toId: 'setVery', toProperty: 'do' },
      { fromId: 'b2', fromProperty: 'onClick', toId: 'setDark', toProperty: 'do' },
      { fromId: 'b3', fromProperty: 'onClick', toId: 'setShow', toProperty: 'do' },
      { fromId: 'b4', fromProperty: 'onClick', toId: 'setHide', toProperty: 'do' },
      { fromId: 'lampVar', fromProperty: 'value', toId: 'lamp', toProperty: 'lit' },
      { fromId: 'lampVar', fromProperty: 'value', toId: 'lamp2', toProperty: 'lit' },
      { fromId: 'shownVar', fromProperty: 'value', toId: 'box', toProperty: 'mounted' },
      { fromId: 'lampVar', fromProperty: 'value', toId: 'homeCond', toProperty: 'condition' },
      { fromId: 'homeCond', fromProperty: 'ontrue', toId: 'sayLit', toProperty: 'do' },
      { fromId: 'homeCond', fromProperty: 'onfalse', toId: 'sayDark', toProperty: 'do' },
      { fromId: 'saidVar', fromProperty: 'value', toId: 'saidText', toProperty: 'text' }
    ]
  };
};

export const conditionDesk = (): Desk => ({ components: { 'Pages/Home': homeGraph(), 'Components/Lamp': lampGraph() } });

export const writeConditionDesk = (dir?: string): string =>
  writeDeskProject(conditionDesk(), { name: 'Condition Desk', idBase: 'c0d1a000-0000-4000-8000-0000000014', prefix: 'condition-desk-' }, dir);
