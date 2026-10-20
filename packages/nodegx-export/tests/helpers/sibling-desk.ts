import { Desk, placeAll, writeDeskProject } from './root-desk';

/**
 * "Sibling Desk" (P18 session 128, EXP-011 §96, P18-S127-SIBLINGVALUE): one placed component's value output wired into
 * another's input, the second pulsed by the first's signal (todo-list's Task list → Dialog flow, small), built in a
 * temporary folder so the corpus golden (hls001) does not move. `the-sibling-value-arrives.test.ts` grades it against
 * the runtime's own nodes (`runtime-mounted-arm.js`).
 *
 * - **Picker**: Pick A and Pick B set the Variable `pickedId`, which feeds the Picker's value output `picked`; each Set's
 *   Done sends the Picker's signal output `chose` (the value first, then the signal, as the templates do).
 * - **Shower**: a value input `which` and a signal input `show`; `show` runs a Set Variable writing the page's `said` from
 *   `which`.
 * - The page: `picker.picked → shower.which`, `picker.chose → shower.show`; a Text reads `said`. Choose C sets `pickedId`
 *   from the page and pulses `show` itself (the value goes round through the Picker's output).
 */
export const siblingDesk = (): Desk => ({
  components: {
    'Pages/Home': {
      nodes: placeAll([
        { id: 'page', type: 'Page', label: 'Home', parameters: { title: 'Sibling Desk', urlPath: 'home' }, children: ['shell'] },
        { id: 'shell', type: 'Group', label: 'Shell', parent: 'page', children: ['saidText', 'chooseC', 'picker', 'shower'], parameters: {} },
        { id: 'saidText', type: 'Text', label: 'Said', parent: 'shell', parameters: {} },
        { id: 'chooseC', type: 'net.noodl.controls.button', label: 'Choose C', parent: 'shell', parameters: { label: 'Choose C' } },
        { id: 'picker', type: '/Components/Picker', label: 'Picker', parent: 'shell', parameters: {} },
        { id: 'shower', type: '/Components/Shower', label: 'Shower', parent: 'shell', parameters: {} },
        { id: 'saidVar', type: 'Variable2', label: 'Said', parameters: { name: 'said', value: 'said nothing' } },
        { id: 'setC', type: 'Set Variable', label: 'Pick c', parameters: { name: 'pickedId', value: 'task c' } }
      ]),
      connections: [
        { fromId: 'picker', fromProperty: 'picked', toId: 'shower', toProperty: 'which' },
        { fromId: 'picker', fromProperty: 'chose', toId: 'shower', toProperty: 'show' },
        { fromId: 'chooseC', fromProperty: 'onClick', toId: 'setC', toProperty: 'do' },
        { fromId: 'chooseC', fromProperty: 'onClick', toId: 'shower', toProperty: 'show' },
        { fromId: 'saidVar', fromProperty: 'value', toId: 'saidText', toProperty: 'text' }
      ]
    },
    'Components/Picker': {
      nodes: placeAll([
        { id: 'pkRoot', type: 'Group', label: 'Picker', children: ['pkA', 'pkB'], parameters: {} },
        { id: 'pkA', type: 'net.noodl.controls.button', label: 'Pick A', parent: 'pkRoot', parameters: { label: 'Pick A' } },
        { id: 'pkB', type: 'net.noodl.controls.button', label: 'Pick B', parent: 'pkRoot', parameters: { label: 'Pick B' } },
        { id: 'pkVar', type: 'Variable2', label: 'Picked', parameters: { name: 'pickedId' } },
        { id: 'pkSetA', type: 'Set Variable', label: 'Pick a', parameters: { name: 'pickedId', value: 'task a' } },
        { id: 'pkSetB', type: 'Set Variable', label: 'Pick b', parameters: { name: 'pickedId', value: 'task b' } },
        {
          id: 'pkOut',
          type: 'Component Outputs',
          label: 'Outputs',
          parameters: {},
          ports: [
            { name: 'picked', plug: 'input', type: 'string' },
            { name: 'chose', plug: 'input', type: 'signal' }
          ]
        }
      ]),
      connections: [
        { fromId: 'pkA', fromProperty: 'onClick', toId: 'pkSetA', toProperty: 'do' },
        { fromId: 'pkB', fromProperty: 'onClick', toId: 'pkSetB', toProperty: 'do' },
        { fromId: 'pkSetA', fromProperty: 'done', toId: 'pkOut', toProperty: 'chose' },
        { fromId: 'pkSetB', fromProperty: 'done', toId: 'pkOut', toProperty: 'chose' },
        { fromId: 'pkVar', fromProperty: 'value', toId: 'pkOut', toProperty: 'picked' }
      ]
    },
    'Components/Shower': {
      nodes: placeAll([
        { id: 'shRoot', type: 'Group', label: 'Shower', children: ['shText'], parameters: {} },
        { id: 'shText', type: 'Text', label: 'Shower text', parent: 'shRoot', parameters: { text: 'the shower' } },
        {
          id: 'shIn',
          type: 'Component Inputs',
          label: 'Inputs',
          parameters: {},
          ports: [
            { name: 'which', plug: 'output', type: 'string' },
            { name: 'show', plug: 'output', type: 'signal' }
          ]
        },
        { id: 'shSay', type: 'Set Variable', label: 'Say which', parameters: { name: 'said' } }
      ]),
      connections: [
        { fromId: 'shIn', fromProperty: 'show', toId: 'shSay', toProperty: 'do' },
        { fromId: 'shIn', fromProperty: 'which', toId: 'shSay', toProperty: 'value' }
      ]
    }
  }
});

/** The desk written as a v2 project, into `dir` (or a new temporary folder), after `edit`. */
export const writeSiblingDesk = (edit?: (d: Desk) => void, dir?: string): { dir: string; desk: Desk } => {
  const desk = siblingDesk();
  edit?.(desk);
  return { dir: writeDeskProject(desk, { name: 'Sibling Desk', idBase: 'b8d20e00-0000-4000-8000-0000000014', prefix: 'sibling-desk-' }, dir), desk };
};
