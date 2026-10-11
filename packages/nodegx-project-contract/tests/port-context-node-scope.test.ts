/**
 * P107-S86-NODEIDSCOPE — `portContextFor` finds the node in the component it is asked about.
 *
 * A node id is unique within a component, not across a project: 27 of Richard's 117 local projects reuse one in a
 * second component (a component copied on disk). Found by id alone, the second node was handed the FIRST one's wires,
 * so an And wired at `input 2` was drawn as if wired at `input 0`. The component's legacy name now scopes the lookup;
 * without it the first node found is still read, as before.
 */
import { findPortNode, portContextFor, portContextReader, type PortProject } from '../port-context';

const component = (name: string, wiredAt: string) => ({
  name,
  nodes: [
    { id: 'flag', type: 'Boolean' },
    { id: 'both', type: 'And' }
  ],
  connections: [{ fromId: 'flag', fromProperty: 'savedValue', toId: 'both', toProperty: wiredAt }]
});

const PROJECT = { metadata: {}, components: [component('/Ands/One', 'input 0'), component('/Ands/Three', 'input 2')] } as unknown as PortProject;

describe('P107-S86-NODEIDSCOPE — a reused node id is read in its own component', () => {
  it('each component hands its own node its own wires', () => {
    expect(portContextFor(PROJECT, 'both', {}, '/Ands/One').wired).toEqual(['input 0']);
    expect(portContextFor(PROJECT, 'both', {}, '/Ands/Three').wired).toEqual(['input 2']);
    const reader = portContextReader(PROJECT);
    expect([reader('both', '/Ands/Three').wired, reader('both', '/Ands/One').wired]).toEqual([['input 2'], ['input 0']]);
  });

  it('a node the named component does not hold is not found, and the reader says where it looked', () => {
    expect(findPortNode(PROJECT, 'both', '/Ands/Two')).toBeUndefined();
    expect(() => portContextReader(PROJECT)('both', '/Ands/Two')).toThrow('portContextFor: no node both in /Ands/Two');
  });

  it('without a component, the first node with the id is read, as before', () => {
    expect(portContextFor(PROJECT, 'both').wired).toEqual(['input 0']);
    expect(findPortNode(PROJECT, 'both')?.component.name).toBe('/Ands/One');
  });
});
