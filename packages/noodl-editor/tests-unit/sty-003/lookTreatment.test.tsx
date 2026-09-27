/**
 * P94 STY-003 rules 2 and 3 — what the panel DRAWS about where a value came from.
 *
 * `fieldState.test.ts` beside this grades the DECISION (`readField`): which of linked / overridden
 * / own / default a field is in. This grades the drawing of it, and the two halves are deliberately
 * separate — the decision is a pure function of ownership, and the row must not be able to reach a
 * second opinion about it.
 *
 * 🔴 **The case that matters most is the one that looks like a no-op.** A linked field and an own
 * field can hold the same resolved value, so any treatment written as "highlight it if it differs"
 * is invisible in exactly the case a person most needs it
 * ([[a-css-property-whose-default-equals-the-test-value]]). `matchesLook` below is that case, and
 * it is armed here as its own test rather than left to the model's.
 *
 * ⚠️ `jest.config.js` sets `testEnvironment: 'node'`, so there is no DOM: `support/renderElements`
 * evaluates the element tree. `PropertyRow` is hook-free for exactly this reason; `ControlHost` is
 * not rendered here.
 *
 * 🔴 **What this cannot see, and what therefore stays open:** that the two treatments are legible
 * on the element a person actually looks at, in both themes. A class or an attribute in a tree is
 * not a colour on a screen ([[a-ring-must-be-read-on-the-element-a-person-sees]]), and STY-003 AC5
 * is explicitly a reading off the rendered element in a running editor. AC8 — Richard's look — is
 * the only thing that closes the task.
 */
import React from 'react';

import { readField, treatmentOf, displayableValue } from '../../src/editor/src/models/Looks/fieldState';
import {
  LOOK_OVERRIDE_CLASS,
  LOOK_REVERT_CLASS,
  LOOK_TREATMENT_ATTRIBUTE,
  PropertyRow,
  type PropertyRowLook
} from '../../src/editor/src/views/panels/propertyeditor/components/PropertyRow';

import { byClass, byTestId, render, text, walk } from '../support/renderElements';

const CONTROL = <input data-test="the-control" />;

const row = (look?: PropertyRowLook) => render(<PropertyRow look={look}>{CONTROL}</PropertyRow>);

/** The row element itself — the one carrying the treatment attribute. */
const rowNode = (node: ReturnType<typeof render>) =>
  walk(node).find((n) => n.props[LOOK_TREATMENT_ATTRIBUTE] !== undefined);

describe('STY-003 rule 2 — a plain row says nothing', () => {
  // Design §3.2: "No linked treatment anywhere — the absence of it is itself the signal."
  it('draws no treatment attribute at all when there is no Look', () => {
    const node = row(undefined);

    expect(rowNode(node)).toBeUndefined();
    // …and the control still arrived, so the absence above is not a failure to render.
    expect(walk(node).some((n) => n.props['data-test'] === 'the-control')).toBe(true);
  });

  it('draws no override line on a plain row', () => {
    expect(byClass(row(undefined), LOOK_OVERRIDE_CLASS)).toHaveLength(0);
  });
});

describe('STY-003 rule 2 — a linked row names its source', () => {
  const linked: PropertyRowLook = { treatment: 'linked', lookName: 'Primary Button' };

  it('marks the row linked and records the Look by name', () => {
    const marked = rowNode(row(linked));

    expect(marked?.props[LOOK_TREATMENT_ATTRIBUTE]).toBe('linked');
    expect(marked?.props['data-look-name']).toBe('Primary Button');
  });

  // Design §3.1 — the section header names the source once "so the per-field labels do not have to
  // shout". A line under every linked field would put the Look's name on ten rows at once.
  it('draws no per-row sentence', () => {
    expect(byClass(row(linked), LOOK_OVERRIDE_CLASS)).toHaveLength(0);
  });
});

describe('STY-003 rule 3 — an override is loud and reversible', () => {
  const overridden: PropertyRowLook = {
    treatment: 'overridden',
    lookName: 'Primary Button',
    lookValueText: '8px',
    onRevert: () => undefined
  };

  it('marks the row overridden — a different treatment from linked, not a louder one', () => {
    expect(rowNode(row(overridden))?.props[LOOK_TREATMENT_ATTRIBUTE]).toBe('overridden');
  });

  it('states what the Look wanted', () => {
    expect(text(byClass(row(overridden), LOOK_OVERRIDE_CLASS)[0])).toContain('Primary Button says 8px');
  });

  it('offers a revert', () => {
    expect(byClass(row(overridden), LOOK_REVERT_CLASS)).toHaveLength(1);
  });

  // 🔴 A dead button is worse than no button: it says an escape exists and then refuses it.
  it('draws no revert button when there is nothing to call', () => {
    const noHandler = row({ treatment: 'overridden', lookName: 'Primary Button', lookValueText: '8px' });

    expect(byClass(noHandler, LOOK_REVERT_CLASS)).toHaveLength(0);
    // The sentence still arrives — rule 3's "states what the Look wanted" does not depend on it.
    expect(text(byClass(noHandler, LOOK_OVERRIDE_CLASS)[0])).toContain('Primary Button says 8px');
  });

  // `displayableValue` declines to quote an object rather than printing `[object Object]`.
  it('falls back to naming the Look when its value cannot be quoted', () => {
    const line = byClass(row({ treatment: 'overridden', lookName: 'Primary Button' }), LOOK_OVERRIDE_CLASS)[0];

    expect(text(line)).toContain('Overrides Primary Button');
    expect(text(line)).not.toContain('object');
  });
});

describe('STY-003 §2 — the trap: a treatment must not be a value comparison', () => {
  // 🔴 THE TEST THIS FILE EXISTS FOR. The node owns `fontSize` and happens to own exactly what the
  // Look offers. Edit the Look and this field will NOT follow — which is precisely the situation a
  // person cannot see today. An implementation that compared values would draw nothing here.
  const NODE = { parameters: { fontSize: '18px' } };
  const LOOK = { name: 'Primary Button', parameters: { fontSize: '18px' } };

  it('reads overridden even though the two values are identical', () => {
    const reading = readField(NODE, LOOK, 'fontSize');

    expect(reading.source).toBe('overridden');
    expect(reading.matchesLook).toBe(true);
  });

  it('draws the override treatment in that case, rather than going quiet', () => {
    const reading = readField(NODE, LOOK, 'fontSize');
    const treatment = treatmentOf(reading.source);

    expect(treatment).toBe('overridden');

    const drawn = rowNode(
      row({
        treatment: treatment as 'overridden',
        lookName: reading.lookName as string,
        lookValueText: displayableValue(reading.lookValue)
      })
    );
    expect(drawn?.props[LOOK_TREATMENT_ATTRIBUTE]).toBe('overridden');
  });

  // The control: the SAME assertions against a field the node does not own. Without this pair, a
  // component that marked every row `overridden` would pass everything above
  // ([[a-negative-arm-needs-its-control-in-the-same-run]]).
  it('and the same field, unowned, reads and draws linked', () => {
    const reading = readField({ parameters: {} }, LOOK, 'fontSize');

    expect(reading.source).toBe('linked');
    expect(
      rowNode(row({ treatment: 'linked', lookName: reading.lookName as string }))?.props[LOOK_TREATMENT_ATTRIBUTE]
    ).toBe('linked');
  });
});

describe('STY-003 rule 2 — the naming half', () => {
  // A treatment can make a row look different; only a name can say WHICH Look. The group heading
  // carries it (design §3.1), and `GroupHeading` is graded here because it is hook-free too.
  it('the group heading names the Look once, without changing the group name', () => {
    const {
      GroupHeading
    } = require('../../src/editor/src/views/panels/propertyeditor/components/PropertyGroups');

    const heading = render(
      React.createElement(GroupHeading, { name: 'Style', isExpanded: true, lookSource: 'Primary Button' })
    );

    expect(text(byTestId(heading, 'group-look-source')[0])).toBe('— from Primary Button');
    // 🔴 The group's identity is still `Style`: `onToggleGroup`, `isGroupExpanded` and the
    // persisted expansion preference are all keyed by that string.
    expect(byClass(heading, 'property-group-name').map(text)).toEqual(['Style']);
  });

  it('and says nothing on a group with no Look', () => {
    const {
      GroupHeading
    } = require('../../src/editor/src/views/panels/propertyeditor/components/PropertyGroups');

    const heading = render(React.createElement(GroupHeading, { name: 'Style', isExpanded: true }));

    expect(byTestId(heading, 'group-look-source')).toHaveLength(0);
  });
});
