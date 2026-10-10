/**
 * NSP-019 AC1 — the rules show for a specced node and are ABSENT (not empty) for an unspecced one.
 *
 * ## Graded over the real catalog
 *
 * `rulesFor` reads `node-catalog.json` through `validation/catalog` — the bundled copy, never a
 * fixture — so the rows below say what the product ships: Counter's four worded ports (NSP-018 s72,
 * the first spec given words) and their display names from the same entry. The absent arm takes
 * its control from the catalog too: a placeable type with no `rules`, found rather than named, so
 * the row survives the next batch of words (memory: a frozen fixture answers a different question
 * once its subject moves).
 *
 * ## Two altitudes
 *
 * The decision (`rulesFor`) and the drawing (`NodeRulesSection`, hook-free, evaluated as an element
 * tree by `support/renderElements`) are graded apart, and then the mounting component
 * (`SpecSections`, hooks) is rendered through `react-dom/server` on both arms — because "draws
 * nothing" and "was never called" read alike, the present arm sits beside the absent one.
 */
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { rulesFor, splitRule } from '../../src/editor/src/views/panels/propertyeditor/spec/nodeRules';
import { NodeRulesSection } from '../../src/editor/src/views/panels/propertyeditor/spec/NodeRulesSection';
import { SpecSections } from '../../src/editor/src/views/panels/propertyeditor/spec/SpecSections';
import { render, text } from '../support/renderElements';

const ROOT = path.join(__dirname, '..', '..', '..');
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'noodl-types', 'src', 'node-catalog.json'), 'utf8')) as {
  nodes: Array<{ typeName: string; inNodePicker?: boolean; isDeprecated?: boolean; rules?: Record<string, string[]> }>;
};

/** A placeable type the catalog carries no rules for — the absent arm's subject, found not named. */
const unworded = catalog.nodes.find((n) => n.inNodePicker && !n.isDeprecated && !n.rules)?.typeName ?? null;
const worded = catalog.nodes.filter((n) => n.rules && Object.keys(n.rules).length > 0).map((n) => n.typeName);

describe('rulesFor — the decision, over the real catalog', () => {
  test('the populations exist, so the rows below grade something', () => {
    expect(worded.length).toBeGreaterThanOrEqual(1);
    expect(worded).toContain('Counter');
    // 🔴 If this reads null, every node has words and the absent arm needs a different control.
    expect(unworded).not.toBeNull();
  });

  test("Counter: one group per worded input, in the catalog's port order, labelled with the display names", () => {
    const groups = rulesFor('Counter');
    expect(groups).toBeDefined();
    expect(groups!.map((g) => g.port)).toEqual(['decrease', 'increase', 'reset', 'startValue']);
    expect(groups!.map((g) => g.label)).toEqual(['Decrease Count', 'Increase Count', 'Reset To Start', 'Start Value']);
    const increase = groups!.find((g) => g.port === 'increase')!;
    expect(increase.lines).toEqual([
      'at Max Value with Limits Enabled → Unchanged; Count Changed stays silent',
      'otherwise the count goes up by one → Count Changed, Done'
    ]);
  });

  test('every worded type answers at least one group with at least one line', () => {
    for (const typeName of worded) {
      const groups = rulesFor(typeName);
      expect(groups).toBeDefined();
      expect(groups!.length).toBeGreaterThan(0);
      expect(groups!.every((g) => g.lines.length > 0)).toBe(true);
    }
  });

  test('absent, not empty: an unworded type and an unknown type both answer undefined', () => {
    expect(rulesFor(unworded as string)).toBeUndefined();
    expect(rulesFor('net.noodl.NoSuchNode')).toBeUndefined();
  });

  test('splitRule: the case before the arrow, the structure after; a line with no arrow is all case', () => {
    expect(splitRule('at Max Value → Unchanged')).toEqual({ when: 'at Max Value', then: 'Unchanged' });
    expect(splitRule('always: read at the next paint')).toEqual({ when: 'always: read at the next paint' });
  });
});

describe('NodeRulesSection — the drawing, as an element tree', () => {
  test('Counter: the heading, the count, each port by display name, each line in two halves', () => {
    const groups = rulesFor('Counter')!;
    const tree = render(<NodeRulesSection groups={groups} isOpen />);
    expect(tree).not.toBeNull();
    const all = text(tree!);
    expect(all).toContain('What this node does');
    expect(all).toContain('8 rules');
    for (const label of ['Decrease Count', 'Increase Count', 'Reset To Start', 'Start Value'])
      expect(all).toContain(label);
    expect(all).toContain('at Max Value with Limits Enabled');
    expect(all).toContain('Unchanged; Count Changed stays silent');
    expect(tree!.type).toBe('details');
    expect(tree!.props.open).toBe(true);
  });

  test('folded: the same tree with `open` false — the fold is the caller’s, the content is still drawn', () => {
    const tree = render(<NodeRulesSection groups={rulesFor('Counter')!} isOpen={false} />)!;
    expect(tree.props.open).toBe(false);
    expect(text(tree)).toContain('Increase Count');
  });
});

describe('SpecSections — the mounting component, both arms', () => {
  const node = (typename: string) => ({ typename, parameters: {}, id: 'n1' } as never);

  test('present for Counter: the rules fold and the Try fold', () => {
    const html = renderToStaticMarkup(<SpecSections model={node('Counter')} />);
    expect(html).toContain('What this node does');
    expect(html).toContain('Increase Count');
    expect(html).toContain('Try this node');
  });

  test('absent for an unworded type: nothing at all, not an empty section', () => {
    expect(renderToStaticMarkup(<SpecSections model={node(unworded as string)} />)).toBe('');
    expect(renderToStaticMarkup(<SpecSections model={node('net.noodl.NoSuchNode')} />)).toBe('');
  });
});
