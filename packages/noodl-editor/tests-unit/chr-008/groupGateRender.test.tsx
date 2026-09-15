/**
 * CHR-008 (R8) — what a quiet row and a group line are built out of.
 *
 * `groupGate.test.ts` decides WHICH groups get one line. This grades the two drawings that decision feeds:
 * a row the line speaks for draws no sentence of its own, and the line draws one sentence and one verb.
 * The row stub is `fb-021/portGate.test.ts`'s, for the same reason that file gives (no `document` here).
 *
 * 🔴 What this cannot see: that `Ports.renderGroups` hands the line to the right group and the quiet flag to
 * the right rows. That is AC1's drive.
 */
import type { PortGateReason } from '../../src/editor/src/models/nodelibrary/portGateReason';
import {
  applyPortGate,
  GATED_PORT_CONTROL_CLASS,
  GATED_PORT_DEAD_WIRE_CLASS,
  GATED_PORT_LINK_CLASS,
  GATED_PORT_REASON_CLASS
} from '../../src/editor/src/utils/portGate';
import { GroupGateLine } from '../../src/editor/src/views/panels/propertyeditor/components/PropertyGroups';

import { render, text, walk } from '../support/renderElements';

interface StubElement {
  tag: string;
  className?: string;
  title?: string;
  textContent?: string;
  attributes: Record<string, string>;
  children: StubElement[];
  setAttribute(name: string, value: string): void;
  appendChild(child: StubElement): StubElement;
}

function createElement(tag: string): StubElement {
  const element: StubElement = {
    tag,
    attributes: {},
    children: [],
    setAttribute(name, value) {
      element.attributes[name] = value;
    },
    appendChild(child) {
      element.children.push(child);
      return child;
    }
  };
  return element;
}

function all(root: StubElement): StubElement[] {
  return [root, ...root.children.flatMap(all)];
}

const REASON: PortGateReason = {
  portName: 'boxShadowColor',
  gatePortName: 'boxShadowEnabled',
  gateLabel: 'Shadow Enabled',
  sentence: 'Shadow Color applies when Shadow Enabled is on.',
  condition: 'Shadow Enabled is on',
  turnOn: true
};

function gate(options: Record<string, unknown>) {
  const row = createElement('div');
  const wrapper = applyPortGate(row, REASON, { createElement, onFocusGate: () => undefined, ...options }) as unknown as StubElement;
  const classes = all(wrapper).map((el) => el.className);
  return { wrapper, classes };
}

describe('CHR-008 R8 — a row its group line speaks for', () => {
  it('control: an ordinary gated row draws its sentence and its link', () => {
    const { classes } = gate({});
    expect(classes).toContain(GATED_PORT_REASON_CLASS);
    expect(classes).toContain(GATED_PORT_LINK_CLASS);
  });

  it('a quiet row is still dimmed and inert', () => {
    const { wrapper, classes } = gate({ quiet: true });
    expect(classes).toContain(GATED_PORT_CONTROL_CLASS);
    const control = all(wrapper).find((el) => el.className === GATED_PORT_CONTROL_CLASS);
    expect(control.attributes['aria-disabled']).toBe('true');
  });

  it('🔴 a quiet row draws no sentence and no link — the group line is the one place it is said', () => {
    const { classes } = gate({ quiet: true });
    expect(classes).not.toContain(GATED_PORT_REASON_CLASS);
    expect(classes).not.toContain(GATED_PORT_LINK_CLASS);
  });

  it('keeps the sentence as the row tooltip, so a pointer on one row can still ask', () => {
    expect(gate({ quiet: true }).wrapper.title).toBe(REASON.sentence);
  });

  it('🔴 still says outright that a live wire is being discarded — a group line cannot carry that', () => {
    const { classes } = gate({ quiet: true, isConnected: true });
    expect(classes).toContain(GATED_PORT_DEAD_WIRE_CLASS);
  });
});

describe('CHR-008 R8 — the group line', () => {
  const calls: string[] = [];
  const line = render(
    GroupGateLine({
      sentence: 'Offset X and Color apply once Shadow Enabled is on.',
      actionLabel: 'Turn on',
      gatePortName: 'boxShadowEnabled',
      onAction: () => calls.push('action')
    })
  );

  it('draws the sentence once and the verb once', () => {
    expect(text(line)).toBe('Offset X and Color apply once Shadow Enabled is on. Turn on');
    expect(walk(line).filter((n) => n.type === 'button')).toHaveLength(1);
  });

  it('is findable by the gate it is about', () => {
    expect(line.props['data-test']).toBe('group-gate-boxShadowEnabled');
  });

  it('the verb acts, and does not let the click reach the group that would fold it', () => {
    const button = walk(line).find((n) => n.type === 'button');
    let stopped = false;
    (button.props.onClick as (e: unknown) => void)({ stopPropagation: () => (stopped = true) });
    expect(calls).toEqual(['action']);
    expect(stopped).toBe(true);
  });
});
