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
 * The decision (`rulesFor`, `ruleParts`) and the drawing (`NodeRulesColumn`, the modal's left column,
 * hook-free, evaluated as an element tree by `support/renderElements`) are graded apart, and then the
 * panel's entry (`HowItWorksButton`, hooks, R33) is rendered through `react-dom/server` on all three
 * arms — because "draws nothing" and "was never called" read alike, the present arm sits beside the
 * absent one.
 */
import * as fs from 'fs';
import * as path from 'path';
import { specs } from '@nodegx/node-spec';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { HowItWorksButton } from '../../src/editor/src/views/panels/propertyeditor/spec/HowItWorksButton';
import { ruleParts, rulesFor, splitRule } from '../../src/editor/src/views/panels/propertyeditor/spec/nodeRules';
import { NodeRulesColumn } from '../../src/editor/src/views/panels/propertyeditor/spec/NodeRulesColumn';
import {
  isSpecInProgress,
  specInProgressTypes
} from '../../src/editor/src/views/panels/propertyeditor/spec/specInProgress';
import { byClass, render, text } from '../support/renderElements';

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

describe('ruleParts — a line taken apart for the modal, the words kept', () => {
  test("Counter's lines: the case, the pulses, the outcome as a chip, the silence", () => {
    expect(ruleParts('at Max Value with Limits Enabled → Unchanged; Count Changed stays silent')).toEqual({
      when: 'at Max Value with Limits Enabled',
      pulses: [],
      outcome: 'Unchanged',
      silent: 'Count Changed stays silent'
    });
    expect(ruleParts('otherwise the count goes up by one → Count Changed, Done')).toEqual({
      when: 'otherwise the count goes up by one',
      pulses: ['Count Changed'],
      outcome: 'Done',
      silent: undefined
    });
    expect(ruleParts('the first one: the count starts there too → Count Changed')).toEqual({
      when: 'the first one: the count starts there too',
      pulses: ['Count Changed'],
      outcome: undefined,
      silent: undefined
    });
    expect(ruleParts('after the first: only where Reset returns to → Count Changed stays silent')).toMatchObject({
      pulses: [],
      silent: 'Count Changed stays silent'
    });
    expect(ruleParts('always: read at the next paint')).toEqual({ when: 'always: read at the next paint', pulses: [] });
  });

  test('over every worded line in the catalog: nothing is lost — the parts put back are the line', () => {
    let lines = 0;
    for (const typeName of worded) {
      for (const group of rulesFor(typeName)!) {
        for (const line of group.lines) {
          const { when, pulses, outcome, silent } = ruleParts(line);
          const wire = [...pulses, ...(outcome ? [outcome] : [])].join(', ');
          const then = [wire, silent ?? ''].filter(Boolean).join('; ');
          expect(then ? `${when} → ${then}` : when).toBe(line);
          lines++;
        }
      }
    }
    expect(lines).toBeGreaterThan(400);
  });
});

describe('NodeRulesColumn — the drawing, as an element tree', () => {
  test('Counter: each port by display name, each case once, each outcome a chip', () => {
    const tree = render(<NodeRulesColumn groups={rulesFor('Counter')!} />)!;
    const all = text(tree);
    expect(all).toContain('The rules');
    for (const label of ['Decrease Count', 'Increase Count', 'Reset To Start', 'Start Value'])
      expect(all).toContain(label);
    expect(all).toContain('At Max Value with Limits Enabled');
    expect(all).toContain('Count Changed stays silent');
    expect(byClass(tree, 'Chip-done')).toHaveLength(3);
    expect(byClass(tree, 'Chip-unchanged')).toHaveLength(3);
    expect(byClass(tree, 'Rule')).toHaveLength(8);
  });
});

describe('HowItWorksButton — the panel’s entry, three arms', () => {
  const node = (typename: string) => ({ typename, parameters: {}, id: 'n1' } as never);

  test('present for Counter: the button, and no folds under the rows any more', () => {
    const html = renderToStaticMarkup(<HowItWorksButton model={node('Counter')} />);
    expect(html).toContain('How this node works');
    expect(html).toContain('<button');
    expect(html).not.toContain('Try this node');
    // the modal is mounted only once pressed
    expect(html).not.toContain('The rules');
  });

  test('a spec with no words: the dashed "spec in progress", never a button', () => {
    for (const typeName of specInProgressTypes()) {
      const html = renderToStaticMarkup(<HowItWorksButton model={node(typeName)} />);
      expect(html).toContain('How it works: spec in progress');
      expect(html).not.toContain('<button');
    }
  });

  test('absent for a type with no spec: nothing at all, not an empty entry', () => {
    const noSpec = catalog.nodes.find(
      (n) => n.inNodePicker && !n.isDeprecated && !n.rules && !isSpecInProgress(n.typeName)
    )?.typeName;
    expect(noSpec).toBeDefined();
    expect(renderToStaticMarkup(<HowItWorksButton model={node(noSpec as string)} />)).toBe('');
    expect(renderToStaticMarkup(<HowItWorksButton model={node('net.noodl.NoSuchNode')} />)).toBe('');
  });

  test('the in-progress snapshot is the registry today: every spec the catalog has no words for', () => {
    const wordedSet = new Set(worded);
    const computed = Object.keys(specs)
      .filter((typeName) => !wordedSet.has(typeName))
      .sort();
    // 🔴 red here = a spec gained or lost its words: rewrite spec/spec-in-progress.json to this list
    expect([...specInProgressTypes()].sort()).toEqual(computed);
    expect(computed.length).toBeGreaterThan(0);
  });
});
