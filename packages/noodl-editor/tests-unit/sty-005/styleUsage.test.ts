/**
 * P94 STY-005 AC3 — "what uses it", counted correctly.
 *
 * Every row in the Styles panel prints this number, and a Delete reads it before it offers to
 * remove anything, so a wrong count is a person deleting a style that eleven nodes are wearing
 * because the panel said `unused`.
 *
 * 🔴 The two defects these tests exist to catch are both invisible to a naive assertion:
 *   1. `forEachNode` stops walking on a TRUTHY return, so an accumulator that returns its own
 *      value reports **1** for every style in the project — a plausible-looking number on every row.
 *   2. Counting port *references* instead of *nodes* makes "used by N nodes" wrong for any node
 *      that points two ports at one style, which is the ordinary case for a colour.
 */
import { styleUsageIn } from '../../src/editor/src/models/StylesModel.usage';

/** A node or Look, in the shape the walk actually reads. */
function makeNode(parameters: Record<string, unknown>, stateParameters?: Record<string, unknown>) {
  return {
    parameters,
    stateParameters,
    getPorts: () => [
      { name: 'textColor', type: { name: 'color' } },
      { name: 'backgroundColor', type: 'color' },
      { name: 'textStyle', type: { name: 'textStyle' } },
      { name: 'label', type: { name: 'string' } }
    ]
  };
}

/**
 * A project whose `forEachNode` behaves like the real one: **it stops on a truthy return.**
 *
 * That is the whole point of the fixture. A stub that walked every node regardless would let the
 * early-stop defect through green, which is [[a-gate-can-have-a-hole-shaped-like-the-defect]].
 */
function makeProject(nodes: unknown[], variants: unknown[] = []) {
  return {
    getComponents: () => [
      {
        graph: {
          forEachNode: (cb: (n: unknown) => unknown) => {
            for (const n of nodes) {
              if (cb(n)) return;
            }
          }
        }
      }
    ],
    getAllVariants: () => variants
  };
}

describe('STY-005 AC3 — styleUsageIn counts what names a style', () => {
  it('counts one node per style it names', () => {
    const project = makeProject([
      makeNode({ textColor: 'Brand' }),
      makeNode({ textColor: 'Brand' }),
      makeNode({ textColor: 'Accent' })
    ]);

    const usage = styleUsageIn(project, 'color');
    expect(usage['Brand'].nodeCount).toBe(2);
    expect(usage['Accent'].nodeCount).toBe(1);
  });

  it('🔴 does NOT stop at the first node that names a style', () => {
    // Against the real early-stopping `forEachNode`. If the walk returned anything truthy, every
    // count here would be 1 and the two above would still have passed.
    const project = makeProject(Array.from({ length: 7 }, () => makeNode({ textColor: 'Brand' })));

    expect(styleUsageIn(project, 'color')['Brand'].nodeCount).toBe(7);
  });

  it('🔴 counts a node ONCE when two of its ports name the same style', () => {
    // The delete-confirm modal says "used by N nodes". One node, two ports, one node.
    const project = makeProject([makeNode({ textColor: 'Brand', backgroundColor: 'Brand' })]);

    expect(styleUsageIn(project, 'color')['Brand'].nodeCount).toBe(1);
  });

  it('counts a style named only inside a visual state', () => {
    // A colour set on hover and nowhere else is still used, and deleting it still breaks something.
    const project = makeProject([makeNode({}, { hover: { textColor: 'Brand' } })]);

    expect(styleUsageIn(project, 'color')['Brand'].nodeCount).toBe(1);
  });

  it('counts Looks separately from nodes', () => {
    const project = makeProject([makeNode({ textColor: 'Brand' })], [makeNode({ textColor: 'Brand' })]);

    const usage = styleUsageIn(project, 'color');
    expect(usage['Brand']).toEqual({ nodeCount: 1, variantCount: 1 });
  });

  it('reads only the ports of the type asked for', () => {
    // `textStyle: 'Heading'` must not show up as a colour called `Heading`.
    const project = makeProject([makeNode({ textStyle: 'Heading', textColor: 'Brand' })]);

    const colours = styleUsageIn(project, 'color');
    expect(colours['Heading']).toBeUndefined();
    expect(colours['Brand'].nodeCount).toBe(1);

    const texts = styleUsageIn(project, 'textStyle');
    expect(texts['Heading'].nodeCount).toBe(1);
    expect(texts['Brand']).toBeUndefined();
  });

  it('a style nothing names is absent, which is how a row prints `unused`', () => {
    const project = makeProject([makeNode({ textColor: 'Brand' })]);

    // 🔴 Absent, NOT zero. The panel turns `undefined` into 0 at the row, and the difference
    // between "counted, nothing uses it" and "never asked" is a distinction `StyleRow` keeps.
    expect(styleUsageIn(project, 'color')['Unloved']).toBeUndefined();
  });

  it('an empty string is not a style name', () => {
    // An unset port comes back as '' from some editors; a row called '' would be unclickable.
    const project = makeProject([makeNode({ textColor: '' })]);
    expect(Object.keys(styleUsageIn(project, 'color'))).toEqual([]);
  });

  it('survives no project at all', () => {
    expect(styleUsageIn(null, 'color')).toEqual({});
  });
});
