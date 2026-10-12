/**
 * P107 R24 (NSP-021 s90, "Card title + type"): an unlabelled node whose card is titled by one of its own ports — a
 * Variable by its name, a Text by its text — is named to the agent by that title, with its type beside it.
 */
import { describeComponent } from '../src/describe';
import type { ComponentFiles } from '../src/graph';

const files = {
  component: { path: '/Cards' },
  nodes: {
    nodes: [
      { id: 'g', type: 'Group', children: ['t'] },
      { id: 't', type: 'Text', parent: 'g', parameters: { text: 'Hello\nthere' } },
      { id: 'v', type: 'Variable2', parameters: { name: 'screenWidth' } },
      { id: 'w', type: 'Variable2', label: 'Mine', parameters: { name: 'ignored' } },
      { id: 'e', type: 'Variable2', parameters: { name: { mode: 'expression', expression: 'Variables.w', fallback: 1 } } },
      { id: 'u', type: 'Variable2' }
    ]
  },
  connections: {
    connections: [
      { fromId: 'v', fromProperty: 'value', toId: 't', toProperty: 'text' },
      { fromId: 'w', fromProperty: 'value', toId: 'g', toProperty: 'opacity' },
      { fromId: 'e', fromProperty: 'value', toId: 'g', toProperty: 'opacity' },
      { fromId: 'u', fromProperty: 'value', toId: 'g', toProperty: 'opacity' }
    ]
  }
} as unknown as ComponentFiles;

const d = describeComponent('Cards', files);

describe('a node titled by its own port', () => {
  it('is named by its card title with its type beside it', () => {
    expect(d.dataFlow[0]).toEqual({ from: 'Variable "screenWidth" [v].value', to: 'Text "Hello\\nthere" [t].text' });
  });

  it('shows an expression by its text', () => {
    expect(d.dataFlow[2].from).toBe('Variable "Variables.w" [e].value');
  });

  it('keeps a label the author typed, and the type alone when the port is empty (controls)', () => {
    expect(d.dataFlow[1].from).toBe('Mine [w].value');
    expect(d.dataFlow[3].from).toBe('Variable [u].value');
    expect(d.dataFlow[1].to).toBe('Group [g].opacity');
  });

  it('carries the title on the tree and logic rows', () => {
    expect(d.visualTree[0].children?.[0].title).toBe('Hello\nthere');
    expect('title' in d.visualTree[0]).toBe(false);
    const rows = Object.fromEntries(d.logicNodes.map((r) => [r.id, r]));
    expect(rows.v.title).toBe('screenWidth');
    expect('title' in rows.w).toBe(false);
    expect('title' in rows.u).toBe(false);
  });
});
