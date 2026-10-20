import { Desk, RawNode, placeAll, writeDeskProject } from './root-desk';

/**
 * "Read Desk" (P18 session 131, EXP-011 §100, a relayed row value read inside its holder): the nodes a row's relayed
 * signal runs inside the component that holds the repeater read that row's relayed values (rocket-school's Lists page
 * `lsSetEditId`, bot-garden's `isBlocked`, story-engine's `rdSetAt`, small), built in a temporary folder so the corpus
 * golden (hls001) does not move. `the-row-is-read-where-it-fires.test.ts` grades it against the runtime's own nodes
 * (`runtime-mounted-arm.js`, which draws the viewer's own For Each).
 *
 * - **Row**: inputs `id`, `title`, `done`, `editLabel`; Buttons labelled by the title (sends `open`), by the id (`pick`)
 *   and by `editLabel` (`edit`); value outputs `id`, `label` (its `title`) and `done`, passed straight through.
 * - **List**: two Static Data tasks into a For Each of Rows. `pick` sets `picked` from `itemOutput-id`, whose Done sets
 *   `named` from `itemOutput-label`; `open` evaluates a Condition (box unticked) on `itemOutput-done`, whose true arm sets
 *   `verdict` to "finished" and false arm sets it from `itemOutput-label`; `edit` sets `editId` from `itemOutput-id`, whose
 *   Done sends a placed Editor's `fill`; the Editor's `which` is the Variable `editId`.
 * - **Editor**: `fill` sets `editing` from `which` (the Lists Editor's shape).
 * - **Home**: Texts reading `picked`, `named`, `verdict`, `editing`.
 */
const button = (id: string, label: string, parent: string): RawNode => ({ id, type: 'net.noodl.controls.button', label, parent, parameters: { label } });

export const readDesk = (): Desk => ({
  components: {
    'Pages/Home': {
      nodes: placeAll([
        { id: 'page', type: 'Page', label: 'Home', parameters: { title: 'Read Desk', urlPath: 'home' }, children: ['shell'] },
        { id: 'shell', type: 'Group', label: 'Shell', parent: 'page', children: ['pickedText', 'namedText', 'verdictText', 'editingText', 'list'], parameters: {} },
        { id: 'pickedText', type: 'Text', label: 'Picked', parent: 'shell', parameters: {} },
        { id: 'namedText', type: 'Text', label: 'Named', parent: 'shell', parameters: {} },
        { id: 'verdictText', type: 'Text', label: 'Verdict', parent: 'shell', parameters: {} },
        { id: 'editingText', type: 'Text', label: 'Editing', parent: 'shell', parameters: {} },
        { id: 'list', type: '/Components/List', label: 'List', parent: 'shell', parameters: {} },
        { id: 'pickedVar', type: 'Variable2', label: 'Picked', parameters: { name: 'picked', value: 'picked nothing' } },
        { id: 'namedVar', type: 'Variable2', label: 'Named', parameters: { name: 'named', value: 'named nothing' } },
        { id: 'verdictVar', type: 'Variable2', label: 'Verdict', parameters: { name: 'verdict', value: 'verdict nothing' } },
        { id: 'editingVar', type: 'Variable2', label: 'Editing', parameters: { name: 'editing', value: 'editing nothing' } }
      ]),
      connections: [
        { fromId: 'pickedVar', fromProperty: 'value', toId: 'pickedText', toProperty: 'text' },
        { fromId: 'namedVar', fromProperty: 'value', toId: 'namedText', toProperty: 'text' },
        { fromId: 'verdictVar', fromProperty: 'value', toId: 'verdictText', toProperty: 'text' },
        { fromId: 'editingVar', fromProperty: 'value', toId: 'editingText', toProperty: 'text' }
      ]
    },
    'Components/List': {
      nodes: placeAll([
        { id: 'lsRoot', type: 'Group', label: 'List', children: ['lsEach', 'lsEditor'], parameters: {} },
        { id: 'lsEach', type: 'For Each', label: 'One row per task', parent: 'lsRoot', parameters: { template: '/Components/Row' } },
        { id: 'lsEditor', type: '/Components/Editor', label: 'Editor', parent: 'lsRoot', parameters: {} },
        {
          id: 'lsTasks',
          type: 'Static Data',
          label: 'Tasks',
          parameters: {
            type: 'json',
            json: JSON.stringify([
              { id: 't1', title: 'Milk', done: false, editLabel: 'Edit Milk' },
              { id: 't2', title: 'Bread', done: true, editLabel: 'Edit Bread' }
            ])
          }
        },
        { id: 'lsSetPicked', type: 'Set Variable', label: 'Pick this one', parameters: { name: 'picked' } },
        { id: 'lsSetNamed', type: 'Set Variable', label: 'Name this one', parameters: { name: 'named' } },
        { id: 'lsIsDone', type: 'Condition', label: 'Is it done?', parameters: { 'runOnChange-condition': false } },
        { id: 'lsSetFinished', type: 'Set Variable', label: 'Say finished', parameters: { name: 'verdict', value: 'finished' } },
        { id: 'lsSetOpen', type: 'Set Variable', label: 'Say its title', parameters: { name: 'verdict' } },
        { id: 'lsSetEditId', type: 'Set Variable', label: 'Edit this one', parameters: { name: 'editId' } },
        { id: 'lsEditIdVar', type: 'Variable2', label: 'The one to edit', parameters: { name: 'editId' } }
      ]),
      connections: [
        { fromId: 'lsTasks', fromProperty: 'items', toId: 'lsEach', toProperty: 'items' },
        { fromId: 'lsEach', fromProperty: 'itemOutputSignal-pick', toId: 'lsSetPicked', toProperty: 'do' },
        { fromId: 'lsEach', fromProperty: 'itemOutput-id', toId: 'lsSetPicked', toProperty: 'value' },
        { fromId: 'lsSetPicked', fromProperty: 'done', toId: 'lsSetNamed', toProperty: 'do' },
        { fromId: 'lsEach', fromProperty: 'itemOutput-label', toId: 'lsSetNamed', toProperty: 'value' },
        { fromId: 'lsEach', fromProperty: 'itemOutputSignal-open', toId: 'lsIsDone', toProperty: 'eval' },
        { fromId: 'lsEach', fromProperty: 'itemOutput-done', toId: 'lsIsDone', toProperty: 'condition' },
        { fromId: 'lsIsDone', fromProperty: 'ontrue', toId: 'lsSetFinished', toProperty: 'do' },
        { fromId: 'lsIsDone', fromProperty: 'onfalse', toId: 'lsSetOpen', toProperty: 'do' },
        { fromId: 'lsEach', fromProperty: 'itemOutput-label', toId: 'lsSetOpen', toProperty: 'value' },
        { fromId: 'lsEach', fromProperty: 'itemOutputSignal-edit', toId: 'lsSetEditId', toProperty: 'do' },
        { fromId: 'lsEach', fromProperty: 'itemOutput-id', toId: 'lsSetEditId', toProperty: 'value' },
        { fromId: 'lsSetEditId', fromProperty: 'done', toId: 'lsEditor', toProperty: 'fill' },
        { fromId: 'lsEditIdVar', fromProperty: 'value', toId: 'lsEditor', toProperty: 'which' }
      ]
    },
    'Components/Row': {
      nodes: placeAll([
        { id: 'rwRoot', type: 'Group', label: 'Row', children: ['rwOpen', 'rwPick', 'rwEdit'], parameters: {} },
        button('rwOpen', 'Open', 'rwRoot'),
        button('rwPick', 'Pick', 'rwRoot'),
        button('rwEdit', 'Edit', 'rwRoot'),
        {
          id: 'rwIn',
          type: 'Component Inputs',
          label: 'Inputs',
          parameters: {},
          ports: [
            { name: 'id', plug: 'output', type: 'string' },
            { name: 'title', plug: 'output', type: 'string' },
            { name: 'done', plug: 'output', type: 'boolean' },
            { name: 'editLabel', plug: 'output', type: 'string' }
          ]
        },
        {
          id: 'rwOut',
          type: 'Component Outputs',
          label: 'Outputs',
          parameters: {},
          ports: [
            { name: 'open', plug: 'input', type: 'signal' },
            { name: 'pick', plug: 'input', type: 'signal' },
            { name: 'edit', plug: 'input', type: 'signal' },
            { name: 'id', plug: 'input', type: 'string' },
            { name: 'label', plug: 'input', type: 'string' },
            { name: 'done', plug: 'input', type: 'boolean' }
          ]
        }
      ]),
      connections: [
        { fromId: 'rwIn', fromProperty: 'title', toId: 'rwOpen', toProperty: 'label' },
        { fromId: 'rwIn', fromProperty: 'id', toId: 'rwPick', toProperty: 'label' },
        { fromId: 'rwIn', fromProperty: 'editLabel', toId: 'rwEdit', toProperty: 'label' },
        { fromId: 'rwOpen', fromProperty: 'onClick', toId: 'rwOut', toProperty: 'open' },
        { fromId: 'rwPick', fromProperty: 'onClick', toId: 'rwOut', toProperty: 'pick' },
        { fromId: 'rwEdit', fromProperty: 'onClick', toId: 'rwOut', toProperty: 'edit' },
        { fromId: 'rwIn', fromProperty: 'id', toId: 'rwOut', toProperty: 'id' },
        { fromId: 'rwIn', fromProperty: 'title', toId: 'rwOut', toProperty: 'label' },
        { fromId: 'rwIn', fromProperty: 'done', toId: 'rwOut', toProperty: 'done' }
      ]
    },
    'Components/Editor': {
      nodes: placeAll([
        { id: 'edRoot', type: 'Group', label: 'Editor', children: [], parameters: {} },
        {
          id: 'edIn',
          type: 'Component Inputs',
          label: 'Inputs',
          parameters: {},
          ports: [
            { name: 'which', plug: 'output', type: 'string' },
            { name: 'fill', plug: 'output', type: 'signal' }
          ]
        },
        { id: 'edSet', type: 'Set Variable', label: 'Edit which', parameters: { name: 'editing' } }
      ]),
      connections: [
        { fromId: 'edIn', fromProperty: 'fill', toId: 'edSet', toProperty: 'do' },
        { fromId: 'edIn', fromProperty: 'which', toId: 'edSet', toProperty: 'value' }
      ]
    }
  }
});

/** The desk written as a v2 project, into `dir` (or a new temporary folder), after `edit`. */
export const writeReadDesk = (edit?: (d: Desk) => void, dir?: string): { dir: string; desk: Desk } => {
  const desk = readDesk();
  edit?.(desk);
  return { dir: writeDeskProject(desk, { name: 'Read Desk', idBase: 'b8d20e00-0000-4000-8000-0000000017', prefix: 'read-desk-' }, dir), desk };
};
