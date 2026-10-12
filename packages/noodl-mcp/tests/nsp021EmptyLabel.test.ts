/**
 * P107-S90-EMPTYLABEL (NSP-021 s90): a node whose saved label is `""` is unlabelled on the canvas (the card shows its
 * type's name), and `get_component`'s data flow must name it the same way rather than print an empty name.
 */
import { describeComponent } from '../src/describe';
import type { ComponentFiles } from '../src/graph';

function files(label: string | undefined): ComponentFiles {
  return {
    component: { path: '/Empty' },
    nodes: {
      nodes: [
        { id: 'g', type: 'Group', ...(label === undefined ? {} : { label }), children: ['t'] },
        { id: 't', type: 'Text', parent: 'g' }
      ]
    },
    connections: { connections: [{ fromId: 'g', fromProperty: 'boundingWidth', toId: 't', toProperty: 'text' }] }
  } as unknown as ComponentFiles;
}

describe('a data-flow endpoint on a node with an empty label', () => {
  it('is named by its type, as the canvas names it', () => {
    expect(describeComponent('Empty', files('')).dataFlow[0].from).toBe('Group [g].boundingWidth');
  });

  it('agrees with a node that has no label at all (control)', () => {
    expect(describeComponent('Empty', files(undefined)).dataFlow[0].from).toBe('Group [g].boundingWidth');
  });

  it('still uses a label the author typed', () => {
    expect(describeComponent('Empty', files('Card')).dataFlow[0].from).toBe('Card [g].boundingWidth');
  });
});
