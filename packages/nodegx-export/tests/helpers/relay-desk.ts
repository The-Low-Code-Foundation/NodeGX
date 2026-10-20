import { Desk, RawNode, placeAll, writeDeskProject } from './root-desk';

/**
 * "Relay Desk" (P18 session 130, EXP-011 §99, the repeater's row relay): a list whose rows' values reach the page through
 * the repeater's relayed outputs (todo-list's Task list → Dialog flow, small), built in a temporary folder so the corpus
 * golden (hls001) does not move. `the-row-relays-its-values.test.ts` grades it against the runtime's own nodes
 * (`runtime-mounted-arm.js`, which draws the viewer's own For Each).
 *
 * - **Row**: inputs `id` and `title`; a Button labelled by the title sends the row's signal output `open`, one labelled by
 *   the id sends `pick`; the row's value outputs `id` and `label` are its inputs `id` and `title`, passed through (the
 *   shape of 167 of the templates' 263 relayed values).
 * - **List**: a Static Data list of tasks into a For Each of Rows; the repeater relays `open` and `pick` to the List's own
 *   `open` and `picked`, and the rows' `id` and `label` (`itemOutput-id`, `itemOutput-label`) to the List's value outputs
 *   `taskId` and `taskTitle`.
 * - **Shower**: value inputs `which` and `named`, a signal input `show`; `show` sets the page's `said` from `which` and
 *   `saidTitle` from `named`.
 * - The page: `list.taskId → shower.which`, `list.taskTitle → shower.named`, `list.open` and `list.picked → shower.show`;
 *   Texts read `said` and `saidTitle`.
 */
const button = (id: string, label: string, parent: string): RawNode => ({ id, type: 'net.noodl.controls.button', label, parent, parameters: { label } });

export const relayDesk = (): Desk => ({
  components: {
    'Pages/Home': {
      nodes: placeAll([
        { id: 'page', type: 'Page', label: 'Home', parameters: { title: 'Relay Desk', urlPath: 'home' }, children: ['shell'] },
        { id: 'shell', type: 'Group', label: 'Shell', parent: 'page', children: ['saidText', 'titleText', 'list', 'shower'], parameters: {} },
        { id: 'saidText', type: 'Text', label: 'Said', parent: 'shell', parameters: {} },
        { id: 'titleText', type: 'Text', label: 'Said title', parent: 'shell', parameters: {} },
        { id: 'list', type: '/Components/List', label: 'List', parent: 'shell', parameters: {} },
        { id: 'shower', type: '/Components/Shower', label: 'Shower', parent: 'shell', parameters: {} },
        { id: 'saidVar', type: 'Variable2', label: 'Said', parameters: { name: 'said', value: 'said nothing' } },
        { id: 'titleVar', type: 'Variable2', label: 'Said title', parameters: { name: 'saidTitle', value: 'title nothing' } }
      ]),
      connections: [
        { fromId: 'list', fromProperty: 'taskId', toId: 'shower', toProperty: 'which' },
        { fromId: 'list', fromProperty: 'taskTitle', toId: 'shower', toProperty: 'named' },
        { fromId: 'list', fromProperty: 'open', toId: 'shower', toProperty: 'show' },
        { fromId: 'list', fromProperty: 'picked', toId: 'shower', toProperty: 'show' },
        { fromId: 'saidVar', fromProperty: 'value', toId: 'saidText', toProperty: 'text' },
        { fromId: 'titleVar', fromProperty: 'value', toId: 'titleText', toProperty: 'text' }
      ]
    },
    'Components/List': {
      nodes: placeAll([
        { id: 'lsRoot', type: 'Group', label: 'List', children: ['lsEach'], parameters: {} },
        { id: 'lsEach', type: 'For Each', label: 'One row per task', parent: 'lsRoot', parameters: { template: '/Components/Row' } },
        {
          id: 'lsTasks',
          type: 'Static Data',
          label: 'Tasks',
          parameters: { type: 'json', json: JSON.stringify([{ id: 't1', title: 'Milk' }, { id: 't2', title: 'Bread' }]) }
        },
        {
          id: 'lsOut',
          type: 'Component Outputs',
          label: 'Outputs',
          parameters: {},
          ports: [
            { name: 'open', plug: 'input', type: 'signal' },
            { name: 'picked', plug: 'input', type: 'signal' },
            { name: 'taskId', plug: 'input', type: 'string' },
            { name: 'taskTitle', plug: 'input', type: 'string' }
          ]
        }
      ]),
      connections: [
        { fromId: 'lsTasks', fromProperty: 'items', toId: 'lsEach', toProperty: 'items' },
        { fromId: 'lsEach', fromProperty: 'itemOutputSignal-open', toId: 'lsOut', toProperty: 'open' },
        { fromId: 'lsEach', fromProperty: 'itemOutputSignal-pick', toId: 'lsOut', toProperty: 'picked' },
        { fromId: 'lsEach', fromProperty: 'itemOutput-id', toId: 'lsOut', toProperty: 'taskId' },
        { fromId: 'lsEach', fromProperty: 'itemOutput-label', toId: 'lsOut', toProperty: 'taskTitle' }
      ]
    },
    'Components/Row': {
      nodes: placeAll([
        { id: 'rwRoot', type: 'Group', label: 'Row', children: ['rwButton', 'rwPick'], parameters: {} },
        button('rwButton', 'Open', 'rwRoot'),
        button('rwPick', 'Pick', 'rwRoot'),
        {
          id: 'rwIn',
          type: 'Component Inputs',
          label: 'Inputs',
          parameters: {},
          ports: [
            { name: 'id', plug: 'output', type: 'string' },
            { name: 'title', plug: 'output', type: 'string' }
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
            { name: 'id', plug: 'input', type: 'string' },
            { name: 'label', plug: 'input', type: 'string' }
          ]
        }
      ]),
      connections: [
        { fromId: 'rwIn', fromProperty: 'title', toId: 'rwButton', toProperty: 'label' },
        { fromId: 'rwIn', fromProperty: 'id', toId: 'rwPick', toProperty: 'label' },
        { fromId: 'rwButton', fromProperty: 'onClick', toId: 'rwOut', toProperty: 'open' },
        { fromId: 'rwPick', fromProperty: 'onClick', toId: 'rwOut', toProperty: 'pick' },
        { fromId: 'rwIn', fromProperty: 'id', toId: 'rwOut', toProperty: 'id' },
        { fromId: 'rwIn', fromProperty: 'title', toId: 'rwOut', toProperty: 'label' }
      ]
    },
    'Components/Shower': {
      nodes: placeAll([
        { id: 'shRoot', type: 'Group', label: 'Shower', children: [], parameters: {} },
        {
          id: 'shIn',
          type: 'Component Inputs',
          label: 'Inputs',
          parameters: {},
          ports: [
            { name: 'which', plug: 'output', type: 'string' },
            { name: 'named', plug: 'output', type: 'string' },
            { name: 'show', plug: 'output', type: 'signal' }
          ]
        },
        { id: 'shSay', type: 'Set Variable', label: 'Say which', parameters: { name: 'said' } },
        { id: 'shTitle', type: 'Set Variable', label: 'Say the title', parameters: { name: 'saidTitle' } }
      ]),
      connections: [
        { fromId: 'shIn', fromProperty: 'show', toId: 'shSay', toProperty: 'do' },
        { fromId: 'shIn', fromProperty: 'which', toId: 'shSay', toProperty: 'value' },
        { fromId: 'shIn', fromProperty: 'show', toId: 'shTitle', toProperty: 'do' },
        { fromId: 'shIn', fromProperty: 'named', toId: 'shTitle', toProperty: 'value' }
      ]
    }
  }
});

/** The desk written as a v2 project, into `dir` (or a new temporary folder), after `edit`. */
export const writeRelayDesk = (edit?: (d: Desk) => void, dir?: string): { dir: string; desk: Desk } => {
  const desk = relayDesk();
  edit?.(desk);
  return { dir: writeDeskProject(desk, { name: 'Relay Desk', idBase: 'b8d20e00-0000-4000-8000-0000000016', prefix: 'relay-desk-' }, dir), desk };
};
