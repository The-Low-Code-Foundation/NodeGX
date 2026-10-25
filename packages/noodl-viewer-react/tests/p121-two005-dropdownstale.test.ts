/**
 * P121-TWO005-DROPDOWNSTALE — a Dropdown whose Items are wired reported "Option 1" as its Value until someone picked,
 * while the screen showed the placeholder.
 *
 * `initialize` seeds the value with the default list's first option (Richard, 2026-09-04: a placed Dropdown shows a real
 * option). When a wired Items list replaced the default items, the seed stayed: it matched none of the new options, so
 * the `<select>` showed the placeholder, and the Value output still said "Option 1". The community template's Report page
 * ("Choose why") sent it. Now an unoffered seed is cleared to `''` and Value is sent — `''`, because `undefined` is never
 * sent and a wire made earlier already holds the seed. A value somebody wrote or picked is never touched.
 */

/* eslint-env jest */

import { createCorpusGraph } from '../../noodl-runtime/test/corpus/graph-harness';

(globalThis as unknown as { Noodl: unknown }).Noodl = { deployed: true, baseUrl: '/' };

/* eslint-disable @typescript-eslint/no-var-requires */
const OptionsModule = require('../src/nodes/controls/options').default;
/* eslint-enable @typescript-eslint/no-var-requires */

interface DrivableNode {
  setInputValue(name: string, value: unknown): void;
  getOutput(name: string): { value: unknown };
  props: Record<string, unknown> & { valueChanged(value: string): void };
}

const REASONS = [
  { Label: 'Unkind', Value: 'unkind' },
  { Label: 'Spam', Value: 'spam' }
];

async function makeDropdown() {
  const graph = await createCorpusGraph({
    modules: [OptionsModule as never],
    data: { components: [{ name: '/root', nodes: [{ id: 'dropdown', type: OptionsModule.node.name, parameters: {} }] }] } as never
  });
  (graph.context as unknown as { styles: unknown }).styles = { getTextStyle: () => ({}), resolveColor: (c: unknown) => c };
  graph.update();
  const node = graph.node('dropdown') as unknown as DrivableNode;
  const write = (name: string, value: unknown) => {
    node.setInputValue(name, value);
    graph.update();
  };
  /** What the Value output holds, what the `<select>` is told to select. */
  const value = () => ({ output: node.getOutput('value').value, shown: node.props.value });
  return { node, write, value };
}

describe('P121-TWO005-DROPDOWNSTALE', () => {
  it('🔴 wired Items without the seed: Value is cleared, and says what the screen shows', async () => {
    const d = await makeDropdown();
    expect(d.value()).toEqual({ output: 'Option 1', shown: 'Option 1' });
    // what `Select`'s mount effect does on the page (Select.tsx: `valueChanged(props.value)`) — the value it shows, unchanged
    d.node.props.valueChanged(d.node.props.value as string);

    d.write('items', REASONS);

    expect(d.value()).toEqual({ output: '', shown: '' });
  });

  it('🔴 a list that offered the seed, then one that does not: cleared when it stops being offered', async () => {
    const d = await makeDropdown();
    d.write('items', [{ Label: 'Option 1', Value: 'Option 1' }, ...REASONS]);
    expect(d.value()).toEqual({ output: 'Option 1', shown: 'Option 1' });

    d.write('items', REASONS);
    expect(d.value()).toEqual({ output: '', shown: '' });
  });

  it('(known-firing) a Value somebody wrote is kept, offered or not, and is what the output says', async () => {
    const d = await makeDropdown();
    d.write('value', 'mine');
    d.write('items', REASONS);
    expect(d.value()).toEqual({ output: 'mine', shown: 'mine' });
  });

  it('(known-firing) a person\'s pick is kept when a new list does not offer it', async () => {
    const d = await makeDropdown();
    d.write('items', [{ Label: 'Option 1', Value: 'Option 1' }, ...REASONS]);
    d.node.props.valueChanged('spam');
    d.write('items', [{ Label: 'Kind', Value: 'kind' }]);
    expect(d.value()).toEqual({ output: 'spam', shown: 'spam' });
  });
});
