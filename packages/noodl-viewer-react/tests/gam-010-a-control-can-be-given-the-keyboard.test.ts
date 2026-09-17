/**
 * GAM-010 — a Button can be given the keyboard, and so can the rest of the control family.
 *
 * P87's play test said "press Enter to go on", and nothing in a graph could put the keyboard on the
 * Next button: Button, Checkbox, Radio Button, Dropdown and Slider declared no `Focus` input. Rocket
 * School reached for a script that looked the button up by its visible label.
 *
 * 🔒 R11 follows R13 (GAM-012 §5): a Focus to a **mounted** control focuses it every time; to one
 * that is not on the page it does nothing, is not held, reports `Unchanged`, and tells the builder
 * in the editor (a diagnostic), never the browser. Both go through the viewer's focus tracker, the
 * one GAM-012 corrected, so a repeated Focus lands and a Blur takes the keyboard away.
 *
 * ## Real definitions, real tracker, fake elements
 *
 * The node definitions are the shipped modules and the tracker is the shipped class. The elements
 * are small fakes, because the question is which element the node asks to focus. The wrapper
 * `div` and the real control are different fakes, so a node that focused the wrapper is caught:
 * that is AC4's sabotage arm, and the rows below are what it reddens. The browser half,
 * `document.activeElement`, is graded by the drive recorded in GAM-010 §8.
 *
 * @module noodl-viewer-react/tests/gam-010-a-control-can-be-given-the-keyboard
 */

// `node-shared-port-definitions` reads the viewer's `Noodl` global at import time.
(globalThis as unknown as Record<string, unknown>).Noodl = { deployed: false };

import { FocusTracker, FocusTrackedNode } from '../src/focus-tracker';
import ButtonModule from '../src/nodes/controls/button';
import CheckboxModule from '../src/nodes/controls/checkbox';
import OptionsModule from '../src/nodes/controls/options';
import RadioButtonModule from '../src/nodes/controls/radiobutton';
import SliderModule from '../src/nodes/controls/slider';
import TextInputModule from '../src/nodes/controls/text-input';

type Def = {
  inputs: Record<string, { type?: string; displayName?: string; valueChangedToTrue?(this: unknown): void }>;
  outputs: Record<string, { type?: string; displayName?: string; description?: string }>;
  methods: Record<string, (this: unknown, ...args: unknown[]) => unknown>;
};

const def = (module: unknown) => (module as { node: Def }).node;

interface FakeElement {
  tag: string;
  calls: string[];
  isConnected: boolean;
  children: FakeElement[];
  ownerDocument: { activeElement: FakeElement | null };
  matches(selector: string): boolean;
  querySelector(selector: string): FakeElement | null;
  focus(): void;
  blur(): void;
}

const FOCUSABLE = ['button', 'input', 'select', 'textarea'];

function element(tag: string, doc: { activeElement: FakeElement | null }, children: FakeElement[] = []): FakeElement {
  const el: FakeElement = {
    tag,
    calls: [],
    isConnected: true,
    children,
    ownerDocument: doc,
    matches: (selector) => selector.split(',').map((s) => s.trim()).includes(tag),
    querySelector(selector) {
      for (const child of el.children) {
        if (child.matches(selector)) return child;
        const deeper = child.querySelector(selector);
        if (deeper) return deeper;
      }
      return null;
    },
    focus() {
      el.calls.push('focus');
      // Only a real control takes focus, the way a browser ignores focus() on a plain div.
      if (FOCUSABLE.includes(tag)) doc.activeElement = el;
    },
    blur() {
      el.calls.push('blur');
      if (doc.activeElement === el) doc.activeElement = null;
    }
  };
  return el;
}

/** The DOM each control renders, as far as focus is concerned: root first, then the real control. */
const CONTROLS = [
  { name: 'Button', module: ButtonModule, dom: (doc) => element('button', doc) },
  { name: 'Checkbox', module: CheckboxModule, dom: (doc) => element('div', doc, [element('div', doc, [element('input', doc)])]) },
  { name: 'Radio Button', module: RadioButtonModule, dom: (doc) => element('div', doc, [element('input', doc)]) },
  { name: 'Dropdown', module: OptionsModule, dom: (doc) => element('div', doc, [element('div', doc, [element('select', doc)])]) },
  { name: 'Slider', module: SliderModule, dom: (doc) => element('div', doc, [element('input', doc)]) }
] as const satisfies ReadonlyArray<{
  name: string;
  module: unknown;
  dom: (doc: { activeElement: FakeElement | null }) => FakeElement;
}>;

/** The real control inside a rendered root: the root itself for a Button. */
const realControl = (root: FakeElement): FakeElement =>
  FOCUSABLE.includes(root.tag) ? root : (root.querySelector(FOCUSABLE.join(',')) as FakeElement);

function mount(module: unknown, root: FakeElement | null) {
  const d = def(module);
  const tracker = new FocusTracker();
  const reported: string[] = [];
  const diagnostics: Array<[string, string | null | undefined]> = [];
  const node: Record<string, unknown> = {
    _domElement: root ?? undefined,
    getDOMElement: () => (node._domElement as FakeElement | undefined) ?? null,
    contains: () => false,
    context: { setNodeFocused: (n: FocusTrackedNode, focused: boolean) => tracker.setNodeFocused(n, focused) },
    beginOutcome: () => ({}),
    reportOutcome: (_token: unknown, outcome: string) => reported.push(outcome),
    setDiagnostic: (key: string, message?: string | null) => diagnostics.push([key, message])
  };
  for (const [name, fn] of Object.entries(d.methods || {})) node[name] = fn.bind(node);
  const send = (port: string) => d.inputs[port].valueChangedToTrue!.call(node);
  return { d, node, tracker, reported, diagnostics, send };
}

describe.each(CONTROLS)('GAM-010 — $name can be given the keyboard', ({ module, dom }) => {
  it('declares Focus and Blur signals, and the outcome ports they report on', () => {
    const d = def(module);
    expect(d.inputs.focus).toMatchObject({ type: 'signal', displayName: 'Focus' });
    expect(d.inputs.blur).toMatchObject({ type: 'signal', displayName: 'Blur' });
    expect(d.outputs.done).toMatchObject({ type: 'signal' });
    expect(d.outputs.unchanged).toMatchObject({ type: 'signal' });
    expect(d.outputs.unchanged.description).toMatch(/Focus/);
  });

  it('mounted: Focus puts the keyboard on the real control, reports Done and clears the diagnostic', () => {
    const doc = { activeElement: null as FakeElement | null };
    const root = dom(doc);
    const { node, tracker, reported, diagnostics, send } = mount(module, root);

    send('focus');

    expect(doc.activeElement).toBe(realControl(root));
    expect(reported).toEqual(['done']);
    expect(tracker.nodes).toEqual([node]);
    expect(diagnostics[diagnostics.length - 1]).toEqual(['focus/not-mounted', null]);
  });

  it('AC3: five Focuses in a row, the keyboard taken away between each, land every time', () => {
    const doc = { activeElement: null as FakeElement | null };
    const root = dom(doc);
    const { send, reported } = mount(module, root);
    const control = realControl(root);

    for (let round = 1; round <= 5; round++) {
      send('focus');
      expect(doc.activeElement).toBe(control);
      doc.activeElement = null; // the verdict remounts, or the person presses Enter and focus moves on
    }
    expect(reported).toEqual(['done', 'done', 'done', 'done', 'done']);
  });

  it('not on the page: Focus reports Unchanged, sets the diagnostic, and records nothing (R13)', () => {
    const { tracker, reported, diagnostics, send } = mount(module, null);

    send('focus');

    expect(reported).toEqual(['unchanged']);
    expect(tracker.nodes).toEqual([]);
    const [key, message] = diagnostics[diagnostics.length - 1];
    expect(key).toBe('focus/not-mounted');
    expect(message).toMatch(/not on the page/);
  });

  it('an element left behind by an unmount is not on the page either', () => {
    const doc = { activeElement: null as FakeElement | null };
    const root = dom(doc);
    root.isConnected = false;
    const { reported, send } = mount(module, root);
    send('focus');
    expect(reported).toEqual(['unchanged']);
    expect(realControl(root).calls).toEqual([]);
  });

  it('Blur takes the keyboard away from the real control and reports Done', () => {
    const doc = { activeElement: null as FakeElement | null };
    const root = dom(doc);
    const { tracker, reported, send } = mount(module, root);
    send('focus');

    send('blur');

    expect(doc.activeElement).toBe(null);
    expect(realControl(root).calls).toEqual(['focus', 'blur']);
    expect(tracker.nodes).toEqual([]);
    expect(reported).toEqual(['done', 'done']);
  });
});

describe("GAM-010 — the keyboard's own click does not take the keyboard away", () => {
  /** A Group around the control: listed by a click, with no element focus of its own. */
  const group = (name: string) => {
    const g = { name, calls: [] as string[], _focus: () => g.calls.push('focus'), _blur: () => g.calls.push('blur'), contains: () => true };
    return g;
  };

  it.each(CONTROLS)('Enter or Space on a Focus-given $name keeps it focused and listed', ({ module, dom }) => {
    const doc = { activeElement: null as FakeElement | null };
    const root = dom(doc);
    const { node, tracker, send } = mount(module, root);
    const row = group('row');
    send('focus');
    const control = realControl(root);

    // The key's click lands on the control, whose element carries no noodlNode: only the row is named.
    tracker.onClickCapture({ parentNode: { noodlNode: row, parentNode: null } });

    expect(doc.activeElement).toBe(control);
    expect(control.calls).toEqual(['focus']);
    expect(tracker.nodes).toEqual([row, node]);
  });

  it('a click elsewhere, after real focus has moved, still blurs the control and drops it', () => {
    const doc = { activeElement: null as FakeElement | null };
    const root = element('button', doc);
    const { tracker, send } = mount(ButtonModule, root);
    send('focus');
    doc.activeElement = null; // the mousedown elsewhere moved focus first

    const other = group('other');
    tracker.onClickCapture({ noodlNode: other, parentNode: null });

    expect(root.calls).toEqual(['focus', 'blur']);
    expect(tracker.nodes).toEqual([other]);
  });
});

describe('GAM-010 — what did not change', () => {
  it("Text Input keeps its own Focus and Blur, with its own descriptions", () => {
    const d = def(TextInputModule);
    expect(d.inputs.focus.displayName).toBe('Focus');
    expect(d.outputs.done.description).toBe('Fires when Set, Clear, Insert Text, Backspace, Focus or Blur did something');
  });

  it("Checkbox's Check and Uncheck still own Done and Unchanged, and the descriptions say Focus too", () => {
    const d = def(CheckboxModule);
    expect(d.outputs.done.description).toMatch(/Check or Uncheck/);
    expect(d.outputs.unchanged.description).toMatch(/already in that state/);
  });
});
