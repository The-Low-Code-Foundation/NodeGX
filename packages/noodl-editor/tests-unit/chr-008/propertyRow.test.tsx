/**
 * CHR-008 §3.2 — the row React draws is the row the decorators built.
 *
 * ## What this grades, and why it is an equivalence rather than a description
 *
 * `PropertyRow` replaces three post-render DOM mutators. A spec that simply asserted "it renders a
 * `.property-port-gated`" would pass on a row that had quietly lost its `aria-disabled`, its
 * `data-test`, or the rule that keeps the dead-wire line outside the dimmed control — all of which
 * are things `fb-021/portGate.test.ts` pins about the OLD path and nothing pinned about the new one.
 *
 * So the cases below are taken from `fb-021/portGate.test.ts` and
 * `property-editor/portDescription.test.ts` verbatim, re-asked of the component. Where the old path
 * is still the one shipping (the structural hint), that is stated rather than re-graded here.
 *
 * ⚠️ `jest.config.js` sets `testEnvironment: 'node'`, so there is no DOM: `support/renderElements`
 * evaluates the element tree instead. That is why `PropertyRow` is hook-free and `ControlHost` —
 * which cannot be — is a separate component and is NOT rendered here.
 */
import React from 'react';

import type { PortGateReason } from '../../src/editor/src/models/nodelibrary/portGateReason';
import { HINT_PORTS_ATTRIBUTE } from '../../src/editor/src/utils/portHint';
import {
  PROPERTY_ROW_CLASS,
  PropertyRow
} from '../../src/editor/src/views/panels/propertyeditor/components/PropertyRow';

import { byClass, render, text, walk } from '../support/renderElements';

const REASON: PortGateReason = {
  portName: 'width',
  gatePortName: 'sizeMode',
  gateLabel: 'Size Mode',
  sentence: 'Width applies when Size Mode is Explicit.'
};

const CONTROL = <input data-test="the-control" />;

const row = (props: Record<string, unknown> = {}) =>
  render(<PropertyRow {...props}>{CONTROL}</PropertyRow>);

const control = (node: ReturnType<typeof render>) =>
  walk(node).find((n) => n.props['data-test'] === 'the-control');

describe('CHR-008 §3.2 — the plain row', () => {
  it('is one element, carrying the control', () => {
    const node = row();
    expect(node.type).toBe('div');
    expect(String(node.props.className)).toContain(PROPERTY_ROW_CLASS);
    expect(control(node)).toBeDefined();
  });

  it('🔴 wraps nothing it has nothing to say about', () => {
    // The row exists for CHR-009's grid; a port with no description, no capability gate and no
    // condition must not grow the two wrappers the panel uses to mean "something is wrong here".
    const classes = walk(row()).map((n) => String(n.props.className ?? ''));
    expect(classes.filter((c) => c.includes('gated'))).toHaveLength(0);
  });
});

describe('CHR-008 §3.2 — ERG-004, the port description', () => {
  it('puts a real description on the row', () => {
    expect(row({ description: 'The array to repeat over' }).props.title).toBe('The array to repeat over');
  });

  it('🔴 sets no tooltip at all rather than an empty one', () => {
    // `portDescription.test.ts`'s rule: an empty `title=""` renders as a blank grey box on hover.
    for (const description of [undefined, '']) {
      expect(row({ description }).props.title).toBeUndefined();
    }
  });
});

describe('CHR-008 §3.2 — BCN-010, the capability gate', () => {
  const capability = { portName: 'realtime', state: 'unsupported', sentence: 'This backend cannot do that.' };

  it('dims an unusable control and says why', () => {
    const node = row({ capability });
    const wrapper = byClass(node, 'property-capability-gated')[0];
    expect(wrapper.props['data-capability-state']).toBe('unsupported');
    expect(wrapper.props['data-test']).toBe('capability-gated-port-realtime');
    expect(byClass(node, 'property-capability-gated-control')[0].props['aria-disabled']).toBeTruthy();
    expect(text(byClass(node, 'property-capability-reason')[0])).toBe('This backend cannot do that.');
  });

  it('🔴 leaves a degraded control live — it works, with a caveat', () => {
    const node = row({ capability: { ...capability, state: 'degraded', isUsable: true } });
    expect(byClass(node, 'property-capability-gated-control')).toHaveLength(0);
    // The caveat is still said.
    expect(byClass(node, 'property-capability-reason')).toHaveLength(1);
    expect(control(node)).toBeDefined();
  });
});

describe('CHR-008 §3.2 — FB-021, the switched-off port', () => {
  it('wraps the control in an inert, dimmed shell that still shows the value', () => {
    const node = row({ gate: { reason: REASON } });
    const wrapper = byClass(node, 'property-port-gated')[0];
    expect(wrapper.props['data-gated-port']).toBe('width');
    const dimmed = byClass(node, 'property-port-gated-control')[0];
    expect(dimmed.props['aria-disabled']).toBeTruthy();
    // The control is INSIDE the dimmed part, not replaced by it: the author can still read the
    // value that is being ignored.
    expect(walk(dimmed).find((n) => n.props['data-test'] === 'the-control')).toBeDefined();
  });

  it('puts the derived sentence under the control', () => {
    const node = row({ gate: { reason: REASON } });
    const block = byClass(node, 'property-port-gate-reason')[0];
    expect(block.props['data-test']).toBe('gate-reason-width');
    expect(text(block)).toContain(REASON.sentence);
  });

  it('draws a button to the gating control when there is somewhere to go', () => {
    const clicks: number[] = [];
    const node = row({ gate: { reason: REASON, onFocusGate: () => clicks.push(1) } });
    const link = byClass(node, 'property-port-gate-link')[0];
    expect(link.type).toBe('button');
    expect(link.ownText).toBe('Show Size Mode');
    expect(link.props.type).toBe('button');

    let stopped = false;
    (link.props.onClick as (e: unknown) => void)({ stopPropagation: () => (stopped = true) });
    expect(clicks).toHaveLength(1);
    // 🔴 Or the click folds away the very group the author is being sent into.
    expect(stopped).toBe(true);
  });

  it('draws no button rather than a dead one when there is nowhere to go', () => {
    expect(byClass(row({ gate: { reason: REASON } }), 'property-port-gate-link')).toHaveLength(0);
  });

  it('says nothing about a wire when there is no wire', () => {
    expect(byClass(row({ gate: { reason: REASON } }), 'property-port-gate-dead-wire')).toHaveLength(0);
  });

  it('says outright that a live wire is being discarded', () => {
    const dead = byClass(row({ gate: { reason: REASON, isConnected: true } }), 'property-port-gate-dead-wire')[0];
    expect(dead.props['data-test']).toBe('gate-dead-wire-width');
    expect(text(dead)).toBe('A connection is delivering a value to this port, and it is being ignored.');
  });

  it('🔴 keeps the dead-wire line OUTSIDE the dimmed control', () => {
    const node = row({ gate: { reason: REASON, isConnected: true } });
    const dimmed = byClass(node, 'property-port-gated-control')[0];
    expect(byClass(dimmed, 'property-port-gate-dead-wire')).toHaveLength(0);
    expect(byClass(byClass(node, 'property-port-gated')[0], 'property-port-gate-dead-wire')).toHaveLength(1);
  });

  it('never sets markup — the sentence carries a displayName a kit node supplies', () => {
    const node = row({ gate: { reason: { ...REASON, sentence: '<img onerror=alert(1)>' } } });
    expect(text(byClass(node, 'property-port-gate-reason')[0])).toBe('<img onerror=alert(1)>');
    expect(walk(node).some((n) => n.props.dangerouslySetInnerHTML !== undefined)).toBe(false);
  });
});

describe('CHR-008 R8 — a row whose group line speaks for it', () => {
  const quiet = { reason: { ...REASON, condition: 'Size Mode is Explicit', turnOn: true }, quiet: true };

  it('is still dimmed and inert', () => {
    expect(byClass(row({ gate: quiet }), 'property-port-gated-control')[0].props['aria-disabled']).toBeTruthy();
  });

  it('🔴 draws no sentence and no link — the group line is the one place it is said', () => {
    const node = row({ gate: quiet });
    expect(byClass(node, 'property-port-gate-reason')).toHaveLength(0);
    expect(byClass(node, 'property-port-gate-link')).toHaveLength(0);
  });

  it('keeps the sentence as the tooltip, so a pointer on one row can still ask', () => {
    expect(byClass(row({ gate: quiet }), 'property-port-gated')[0].props.title).toBe(REASON.sentence);
  });

  it('🔴 still says a live wire is being discarded — a group line cannot carry that', () => {
    expect(byClass(row({ gate: { ...quiet, isConnected: true } }), 'property-port-gate-dead-wire')).toHaveLength(1);
  });
});

describe('CHR-008 §3.2 — FB-017 AC4, the marker the live hint refresh finds', () => {
  it('marks the row with the ports it speaks for', () => {
    expect(row({ hintPorts: ['borderRadius', 'borderTopLeftRadius'] }).props[HINT_PORTS_ATTRIBUTE]).toBe(
      'borderRadius,borderTopLeftRadius'
    );
  });

  it('leaves a row it can never hint on unmarked', () => {
    for (const hintPorts of [undefined, []]) {
      expect(row({ hintPorts }).props[HINT_PORTS_ATTRIBUTE]).toBeUndefined();
    }
  });
});

describe('CHR-008 §3.2 — the nesting, which the stylesheet and the drive both depend on', () => {
  it('🔴 orders the wrappers describe → capability → gate, outermost last', () => {
    const node = row({
      description: 'what it does',
      capability: { portName: 'width', state: 'unsupported', sentence: 'no' },
      gate: { reason: REASON }
    });

    // The row carries the description; the gate is outermost inside it; capability is inside the
    // gate's dimmed control; the control is innermost.
    expect(node.props.title).toBe('what it does');
    const gated = byClass(node, 'property-port-gated')[0];
    const dimmed = byClass(gated, 'property-port-gated-control')[0];
    const cap = byClass(dimmed, 'property-capability-gated')[0];
    expect(cap).toBeDefined();
    expect(walk(cap).find((n) => n.props['data-test'] === 'the-control')).toBeDefined();
  });
});
