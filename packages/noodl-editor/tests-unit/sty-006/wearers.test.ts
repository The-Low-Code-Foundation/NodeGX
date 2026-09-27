/**
 * P94 STY-006 AC1 + AC2 — **which** things name a style, and the count being the list's length.
 *
 * STY-005 shipped the number. This is the half that makes the number checkable: a row that says
 * `9×` now draws the nine underneath it, and a person pressing one lands on that node. Two things
 * can go wrong here and neither is visible in a number:
 *
 *   1. The identity is wrong — the list names a component or a node id that is not where the style
 *      is actually used, so the press lands somewhere else or nowhere. A count cannot be wrong this
 *      way, which is why STY-005's gates could not have caught it.
 *   2. The count and the list disagree. That one is prevented structurally — `styleUsageIn` is a
 *      `.length` over `styleWearersIn` — and pinned here anyway, because the structure is exactly
 *      what a future session adding "a quick count without the objects" would undo.
 */
import { lookWearersIn, styleUsageIn, styleWearersIn } from '../../src/editor/src/models/StylesModel.usage';

/** A node in the shape the walk actually reads, including what makes it a PLACE. */
function makeNode(
  id: string,
  parameters: Record<string, unknown>,
  extra: { label?: string; typename?: string; variant?: unknown; stateParameters?: Record<string, unknown> } = {}
) {
  return {
    id,
    label: extra.label,
    typename: extra.typename ?? 'net.noodl.text',
    variant: extra.variant,
    parameters,
    stateParameters: extra.stateParameters,
    getPorts: () => [
      { name: 'textColor', type: { name: 'color' } },
      { name: 'backgroundColor', type: 'color' },
      { name: 'textStyle', type: { name: 'textStyle' } },
      { name: 'label', type: { name: 'string' } }
    ]
  };
}

/**
 * A project of named components whose `forEachNode` **stops on a truthy return**, like the real one.
 *
 * 🔴 That is the fixture's whole job. A stub that walked everything regardless would let the
 * early-stop defect through green — the walk was rewritten for this task and the new body pushes
 * into an array, and `Array.prototype.push` returns the new length, which is truthy.
 * [[a-gate-can-have-a-hole-shaped-like-the-defect]].
 */
function makeProject(components: Record<string, unknown[]>, variants: unknown[] = []) {
  return {
    getComponents: () =>
      Object.entries(components).map(([name, nodes]) => ({
        name,
        graph: {
          forEachNode: (cb: (n: unknown) => unknown) => {
            for (const n of nodes) {
              if (cb(n)) return;
            }
          }
        }
      })),
    getAllVariants: () => variants
  };
}

describe('STY-006 AC1 — styleWearersIn names what it found, and where', () => {
  it('carries the component, the node id, the label and the type of each wearer', () => {
    const project = makeProject({
      '/Pages/Home': [makeNode('n1', { textColor: 'Brand' }, { label: 'Headline' })]
    });

    expect(styleWearersIn(project, 'color')['Brand'].nodes).toEqual([
      { componentName: '/Pages/Home', nodeId: 'n1', label: 'Headline', typename: 'net.noodl.text' }
    ]);
  });

  it('🔴 keeps every wearer, and does NOT stop at the first one', () => {
    // Against the real early-stopping `forEachNode`. `push` returns a truthy length, so a body
    // written as `return list.push(...)` reports exactly one wearer for every style in the project
    // — a list of one under a row that says `7×`.
    const project = makeProject({
      '/Pages/Home': Array.from({ length: 7 }, (_, i) => makeNode(`n${i}`, { textColor: 'Brand' }))
    });

    expect(styleWearersIn(project, 'color')['Brand'].nodes).toHaveLength(7);
  });

  it('🔴 lists a node ONCE when two of its ports name the same style', () => {
    // The row says "used by N nodes" and the list is what a person checks it against. A node that
    // sets both its text and its background to `Brand` is one place to go, listed once.
    const project = makeProject({
      '/Pages/Home': [makeNode('n1', { textColor: 'Brand', backgroundColor: 'Brand' })]
    });

    expect(styleWearersIn(project, 'color')['Brand'].nodes).toHaveLength(1);
  });

  it('finds wearers in every component, each labelled with its own', () => {
    const project = makeProject({
      '/Pages/Home': [makeNode('n1', { textColor: 'Brand' })],
      '/Components/Card': [makeNode('n2', { textColor: 'Brand' })]
    });

    expect(styleWearersIn(project, 'color')['Brand'].nodes.map((w) => w.componentName)).toEqual([
      '/Pages/Home',
      '/Components/Card'
    ]);
  });

  it('lists a style named only inside a visual state', () => {
    // A colour set on hover and nowhere else is still worn, and its wearer is still a place to go.
    const project = makeProject({
      '/Pages/Home': [makeNode('n1', {}, { stateParameters: { hover: { textColor: 'Brand' } } })]
    });

    expect(styleWearersIn(project, 'color')['Brand'].nodes[0].nodeId).toBe('n1');
  });

  it('🔴 keeps Looks in their own half of the answer', () => {
    // A Look is a rule with nowhere to go. Flattening it into `nodes` would put an entry in the
    // list that draws as pressable and lands nowhere — STY-006 §2.
    const project = makeProject({ '/Pages/Home': [makeNode('n1', { textColor: 'Brand' })] }, [
      { name: 'Section Heading', typename: 'net.noodl.text', parameters: { textColor: 'Brand' }, getPorts: () => [{ name: 'textColor', type: { name: 'color' } }] }
    ]);

    const brand = styleWearersIn(project, 'color')['Brand'];
    expect(brand.nodes).toHaveLength(1);
    expect(brand.variants).toEqual([{ name: 'Section Heading', typename: 'net.noodl.text' }]);
  });

  it('🔴 survives a node whose label getter throws', () => {
    // `NodeGraphNode.label` falls through to `this.type.labelForNode(this)` — on a node whose type
    // never resolved, that throws. Unguarded, it throws while the panel is rendering the list and
    // takes the editor window down, on the one project where you most want to see what is wearing
    // what. An empty label is a row that prints its type instead.
    const project = makeProject({
      '/Pages/Home': [
        {
          id: 'broken',
          typename: 'com.unknown.thing',
          get label(): string {
            throw new Error('type never resolved');
          },
          parameters: { textColor: 'Brand' },
          getPorts: () => [{ name: 'textColor', type: { name: 'color' } }]
        }
      ]
    });

    expect(() => styleWearersIn(project, 'color')).not.toThrow();
    expect(styleWearersIn(project, 'color')['Brand'].nodes[0]).toEqual({
      componentName: '/Pages/Home',
      nodeId: 'broken',
      label: '',
      typename: 'com.unknown.thing'
    });
  });

  it('reads only the ports of the type asked for', () => {
    const project = makeProject({
      '/Pages/Home': [makeNode('n1', { textStyle: 'Heading', textColor: 'Brand' })]
    });

    expect(styleWearersIn(project, 'color')['Heading']).toBeUndefined();
    expect(styleWearersIn(project, 'textStyle')['Heading'].nodes).toHaveLength(1);
  });

  it('a style nothing names is absent, which is how a row prints `unused`', () => {
    const project = makeProject({ '/Pages/Home': [makeNode('n1', { textColor: 'Brand' })] });
    expect(styleWearersIn(project, 'color')['Unloved']).toBeUndefined();
  });

  it('survives no project at all', () => {
    expect(styleWearersIn(null, 'color')).toEqual({});
    expect(lookWearersIn(null, 'net.noodl.text')).toEqual({});
  });
});

describe('STY-006 AC2 — the count IS the list', () => {
  /**
   * 🔴 **Hand-counted on purpose.** Asserting only `count === list.length` is true of two walks
   * that are both wrong in the same way, and true of a `styleUsageIn` that simply calls `.length`
   * on garbage. The numbers below were counted off the fixture by reading it: `Brand` is worn by
   * three nodes (one of which names it twice, and counts once) and by one Look; `Accent` by one
   * node and no Look. Every assertion is pinned to those, so a drift in EITHER direction reddens.
   * [[a-rule-reading-zero-in-both-arms-grades-nothing]].
   */
  const project = makeProject(
    {
      '/Pages/Home': [
        makeNode('n1', { textColor: 'Brand', backgroundColor: 'Brand' }),
        makeNode('n2', { textColor: 'Brand' }),
        makeNode('n3', { textColor: 'Accent' })
      ],
      '/Components/Card': [makeNode('n4', { backgroundColor: 'Brand' })]
    },
    [
      {
        name: 'Section Heading',
        typename: 'net.noodl.text',
        parameters: { textColor: 'Brand' },
        getPorts: () => [{ name: 'textColor', type: { name: 'color' } }]
      }
    ]
  );

  it('the number a row prints equals the number of entries under it', () => {
    const counts = styleUsageIn(project, 'color');
    const wearers = styleWearersIn(project, 'color');

    expect(counts['Brand']).toEqual({ nodeCount: 3, variantCount: 1 });
    expect(wearers['Brand'].nodes).toHaveLength(3);
    expect(wearers['Brand'].variants).toHaveLength(1);

    expect(counts['Accent']).toEqual({ nodeCount: 1, variantCount: 0 });
    expect(wearers['Accent'].nodes).toHaveLength(1);
    expect(wearers['Accent'].variants).toHaveLength(0);
  });

  it('and that holds for every style in the project, not just the one we looked at', () => {
    const counts = styleUsageIn(project, 'color');
    const wearers = styleWearersIn(project, 'color');

    expect(Object.keys(counts).sort()).toEqual(Object.keys(wearers).sort());
    for (const name of Object.keys(counts)) {
      expect(counts[name].nodeCount).toBe(wearers[name].nodes.length);
      expect(counts[name].variantCount).toBe(wearers[name].variants.length);
    }
  });
});

describe('STY-006 AC6 — a Look names what wears it', () => {
  const look = { name: 'Section Heading', typename: 'net.noodl.text' };

  it('lists every node wearing the Look, with where to find it', () => {
    const project = makeProject({
      '/Pages/Home': [
        makeNode('n1', {}, { variant: look, label: 'Title' }),
        makeNode('n2', {}, { variant: look })
      ],
      '/Components/Card': [makeNode('n3', {}, { variant: look, label: 'Card heading' })]
    });

    const worn = lookWearersIn(project, 'net.noodl.text')['Section Heading'];
    expect(worn).toHaveLength(3);
    expect(worn.map((w) => w.componentName)).toEqual(['/Pages/Home', '/Pages/Home', '/Components/Card']);
    expect(worn.map((w) => w.nodeId)).toEqual(['n1', 'n2', 'n3']);
  });

  it('🔴 does NOT stop at the first wearer', () => {
    const project = makeProject({
      '/Pages/Home': Array.from({ length: 6 }, (_, i) => makeNode(`n${i}`, {}, { variant: look }))
    });

    expect(lookWearersIn(project, 'net.noodl.text')['Section Heading']).toHaveLength(6);
  });

  it('answers for every Look of the type in ONE walk', () => {
    // The section calls this once per typename and reads each row's list out of the answer. If it
    // only ever filled in the Look it was asked about, that caching would silently report zero for
    // every other Look in the project.
    const other = { name: 'Body', typename: 'net.noodl.text' };
    const project = makeProject({
      '/Pages/Home': [makeNode('n1', {}, { variant: look }), makeNode('n2', {}, { variant: other })]
    });

    const all = lookWearersIn(project, 'net.noodl.text');
    expect(Object.keys(all).sort()).toEqual(['Body', 'Section Heading']);
  });

  it('🔴 matches by name AND typename, so a Button Look is not a Text Look', () => {
    const project = makeProject({
      '/Pages/Home': [makeNode('n1', {}, { variant: { name: 'Section Heading', typename: 'net.noodl.controls.button' } })]
    });

    expect(lookWearersIn(project, 'net.noodl.text')['Section Heading']).toBeUndefined();
    expect(lookWearersIn(project, 'net.noodl.controls.button')['Section Heading']).toHaveLength(1);
  });

  it('🔴 matches by NAME, never by object identity', () => {
    /**
     * A node can hold a `VariantModel` that is **not the project's** — measured at s7 with three
     * disagreeing names at once (STY-003 §2f defect 1). Identity matching would drop that node out
     * of the list while `variantWearerCounts`, which has always matched by name, went on counting
     * it — the list and the count disagreeing over a defect NEITHER of them caused. They are wrong
     * together about the ghost or right together about the name; never half of each.
     */
    const ghost = { name: 'Section Heading', typename: 'net.noodl.text' };
    const project = makeProject({ '/Pages/Home': [makeNode('n1', {}, { variant: ghost })] });

    expect(lookWearersIn(project, 'net.noodl.text')['Section Heading']).toHaveLength(1);
  });

  it('ignores a node wearing nothing', () => {
    const project = makeProject({ '/Pages/Home': [makeNode('n1', {})] });
    expect(lookWearersIn(project, 'net.noodl.text')).toEqual({});
  });
});
