/**
 * GAM-009 — what someone typed is still there when the field comes back.
 *
 * P87 RKT-006 found it: a child types player two's name, starts a race, taps *Change the race*,
 * and the name box is empty. The React field seeds its state from `props.startValue`, typing
 * writes only React state, and the node's `props.startValue` is written by `Set` and `Clear`
 * alone. So a remount starts from the author's Value, not from what is in the field.
 *
 * 🔒 R10 (Richard, 2026-09-14): **(a)** typing writes the start value, and `Set` still means the
 * author's last Value. **And a remount fires `Value Changed` only on a real change.**
 *
 * ## The harness, and why it is this one
 *
 * A real Text Input node from the corpus graph, rendered through its **own** `render()` into a
 * real `createRoot`, so the node's own output handlers and its `Mounted` gate are what run. §7's
 * first trap: a spec that calls `node.setText` to "type" does not type. Typing here is a real
 * `input` event on the `<input>`, dispatched after the native value setter, which is what React's
 * `onChange` listens to. Nothing calls `.focus()`, so the field is unfocused throughout (§7's
 * third trap), and the focused path is ERG-001's rows.
 *
 * `jest-environment-jsdom` is not in this tree, so jsdom is built by hand, as the NDA-012 radio
 * and FLD-001 suites do.
 *
 * @module noodl-viewer-react/tests/gam-009-typed-text-survives-a-remount
 */

/* eslint-env jest */

import React from 'react';

import type { NodeInstance } from '@noodl/types';

import { createCorpusGraph, type CorpusGraph } from '../../noodl-runtime/test/corpus/graph-harness';

(globalThis as unknown as { Noodl: unknown }).Noodl = { deployed: true, baseUrl: '/' };

/* eslint-disable @typescript-eslint/no-var-requires */
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>');
const g = globalThis as never as Record<string, unknown>;
g.window = dom.window;
g.document = dom.window.document;
g.navigator = dom.window.navigator;
g.HTMLElement = dom.window.HTMLElement;
g.Element = dom.window.Element;
g.Node = dom.window.Node;
g.requestAnimationFrame = (cb: () => void) => setTimeout(cb, 0);
g.IS_REACT_ACT_ENVIRONMENT = true;

const { createRoot } = require('react-dom/client');
const { act } = require('react');

const TextInputModule = require('../src/nodes/controls/text-input').default;
/* eslint-enable @typescript-eslint/no-var-requires */

interface FieldNode extends NodeInstance {
  setInputValue(name: string, value: unknown): void;
  render(): React.ReactElement | undefined;
  outputPropValues: Record<string, unknown>;
  props: Record<string, unknown>;
  flagOutputDirty(name: string): void;
}

async function build(parameters: Record<string, unknown> = {}) {
  const graph: CorpusGraph = await createCorpusGraph({
    modules: [TextInputModule],
    data: {
      components: [{ name: '/root', nodes: [{ id: 'field', type: TextInputModule.node.name, parameters }] }]
    } as never
  });
  (graph.context as unknown as { styles: unknown }).styles = {
    getTextStyle: () => ({}),
    resolveColor: (c: unknown) => c
  };
  (graph.context as unknown as { setNodeFocused: unknown }).setNodeFocused = () => undefined;
  graph.update();

  const node = graph.node('field') as unknown as FieldNode;

  // Every write to the Value output, in order, whether or not the value moved. The output handler
  // in `react-component-node.ts` flags the output dirty with no equality check, so a flag is an
  // emission downstream.
  const valueWrites: unknown[] = [];
  const flag = node.flagOutputDirty.bind(node);
  node.flagOutputDirty = (name: string) => {
    if (name === 'onTextChanged') valueWrites.push(node.outputPropValues.onTextChanged);
    flag(name);
  };

  const container = dom.window.document.createElement('div');
  dom.window.document.body.appendChild(container);
  const root = createRoot(container);

  const view = {
    graph,
    node,
    valueWrites,
    /** How many `Value Changed` signals the field has sent so far. */
    valueChanged: () => graph.signalsFor('field').filter((s) => s === 'textChanged').length,
    /** The `<input>` on the page, or null while the field is not mounted. */
    input: () => container.querySelector('input') as HTMLInputElement | null,
    /** Re-render the root from the node's own `render()`, which honours `Mounted`. */
    async paint() {
      await act(async () => {
        root.render(React.createElement(React.Fragment, null, node.render() ?? null));
      });
      graph.update();
    },
    async setMounted(value: boolean) {
      node.setInputValue('mounted', value);
      graph.update();
      await view.paint();
    },
    /** A person typing: the native setter, then the `input` event React's `onChange` hears. */
    async type(text: string) {
      const input = view.input();
      if (!input) throw new Error('no input on the page to type into');
      const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set;
      await act(async () => {
        setter.call(input, text);
        input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
      });
      graph.update();
    },
    async unmountRoot() {
      await act(async () => root.unmount());
    }
  };

  await view.paint();
  return view;
}

describe('GAM-009 AC1 — typed text, a hide, and a show', () => {
  it('(known-firing) typing reaches the field and the Value output before the field is hidden', async () => {
    const v = await build();
    expect(v.input()).not.toBeNull();
    const changedBefore = v.valueChanged();

    await v.type('Tom');

    expect(v.input()!.value).toBe('Tom');
    expect(v.node.outputPropValues.onTextChanged).toBe('Tom');
    expect(v.valueChanged()).toBe(changedBefore + 1);
    await v.unmountRoot();
  });

  it('hidden with Mounted, the field is off the page (the hide really unmounts)', async () => {
    const v = await build();
    await v.type('Tom');
    await v.setMounted(false);
    expect(v.input()).toBeNull();
    await v.unmountRoot();
  });

  it('shown again, the field holds what was typed', async () => {
    const v = await build();
    await v.type('Tom');
    await v.setMounted(false);
    await v.setMounted(true);

    expect(v.input()).not.toBeNull();
    expect(v.input()!.value).toBe('Tom');
    await v.unmountRoot();
  });

  it('shown again, the Value output still reads what was typed', async () => {
    const v = await build();
    await v.type('Tom');
    await v.setMounted(false);
    await v.setMounted(true);

    expect(v.node.outputPropValues.onTextChanged).toBe('Tom');
    await v.unmountRoot();
  });

  it('a remount that shows the same value sends no Value Changed and writes no Value (R10)', async () => {
    const v = await build();
    await v.type('Tom');
    await v.setMounted(false);
    const changed = v.valueChanged();
    const writes = v.valueWrites.length;

    await v.setMounted(true);

    expect(v.valueChanged()).toBe(changed);
    expect(v.valueWrites.slice(writes)).toEqual([]);
    await v.unmountRoot();
  });
});

/**
 * AC4 — ERG-001 §4 still holds with real focus and real typing. The corpus rows in
 * `erg-001-visual-outcomes.test.ts` use a stand-in component that cannot be typed into, so the typed
 * half lives here, and those rows are run unchanged beside it.
 */
describe('GAM-009 AC4 — a Set while the person is typing', () => {
  const outcomes = (v: Awaited<ReturnType<typeof build>>) =>
    v.graph.signalsFor('field').filter((s) => s === 'done' || s === 'unchanged' || s === 'failure');

  it('focused: the Set is Unchanged and the typed text stays in the field', async () => {
    const v = await build({ startValue: 'Ann' });
    v.input()!.focus();
    expect(dom.window.document.activeElement).toBe(v.input());
    await v.type('Tom');

    v.node.setInputValue('set', true);
    v.node.setInputValue('set', false);
    v.graph.update();
    await v.paint();

    expect(outcomes(v)).toEqual(['unchanged']);
    expect(v.input()!.value).toBe('Tom');
    expect(v.node.outputPropValues.onTextChanged).toBe('Tom');
    await v.unmountRoot();
  });

  it('(control) unfocused: the same Set is Done and lands', async () => {
    const v = await build({ startValue: 'Ann' });
    await v.type('Tom');
    expect(dom.window.document.activeElement).not.toBe(v.input());

    v.node.setInputValue('set', true);
    v.node.setInputValue('set', false);
    v.graph.update();
    await v.paint();

    expect(outcomes(v)).toEqual(['done']);
    expect(v.input()!.value).toBe('Ann');
    await v.unmountRoot();
  });

  /**
   * Measured, not changed. `setText` writes `props.startValue` on every path, the abstaining ones
   * included, and its comment says why: it is the value a later mount starts from. So a Set that was
   * absorbed while the person typed still decides what the field shows after a remount. GAM-009 does
   * not move that rule. §8 records it for Richard.
   */
  it('focused, then hidden and shown: an absorbed Set is what the field comes back with (ERG-001’s written rule)', async () => {
    const v = await build({ startValue: 'Ann' });
    v.input()!.focus();
    await v.type('Tom');
    v.node.setInputValue('set', true);
    v.node.setInputValue('set', false);
    v.graph.update();
    v.input()!.blur();

    await v.setMounted(false);
    await v.setMounted(true);

    expect(v.input()!.value).toBe('Ann');
    await v.unmountRoot();
  });
});

describe('GAM-009 — what R10 keeps', () => {
  it('the first mount still publishes the empty value once (unset to empty is a real change)', async () => {
    const v = await build();
    expect(v.valueWrites).toEqual(['']);
    expect(v.valueChanged()).toBe(1);
    await v.unmountRoot();
  });

  /**
   * ⚠️ Found by this spec's first run at HEAD, and not in the task file. While the field is away, the
   * node's `setText` writes the Value output and flags it, and sends **no** `Value Changed`. Today that
   * signal arrives at the next mount. So a remount check that compared against the output's value would
   * drop it for ever. The check compares against what was last *announced*, which keeps today's count
   * and today's timing here.
   */
  it('a Value the author sends while the field is hidden is what it shows, and Value Changed still comes at the show', async () => {
    const v = await build();
    await v.type('Tom');
    await v.setMounted(false);
    const changed = v.valueChanged();

    v.node.setInputValue('startValue', 'Ann');
    v.graph.update();
    expect(v.node.outputPropValues.onTextChanged).toBe('Ann');
    expect(v.valueChanged()).toBe(changed);

    await v.setMounted(true);

    expect(v.input()!.value).toBe('Ann');
    expect(v.valueChanged()).toBe(changed + 1);
    await v.unmountRoot();
  });

  it('Set still means the author’s last Value: typed over, an unfocused Set puts the Value back', async () => {
    const v = await build({ startValue: 'Ann' });
    expect(v.input()!.value).toBe('Ann');
    await v.type('Tom');
    expect(v.input()!.value).toBe('Tom');

    v.node.setInputValue('set', true);
    v.node.setInputValue('set', false);
    v.graph.update();
    await v.paint();

    expect(v.input()!.value).toBe('Ann');
    expect(v.node.outputPropValues.onTextChanged).toBe('Ann');
    await v.unmountRoot();
  });

  it('a Number field keeps a half-typed "1." across a remount, as text, and publishes 1', async () => {
    const v = await build({ type: 'number' });
    const input = v.input()!;
    input.type = 'text'; // jsdom sanitises "1." out of a number input; the browser keeps it while typing
    await v.type('1.');
    expect(v.node.outputPropValues.onTextChanged).toBe(1);

    await v.setMounted(false);
    await v.setMounted(true);

    expect(v.node.props.startValue).toBe('1.');
    expect(v.node.outputPropValues.onTextChanged).toBe(1);
    await v.unmountRoot();
  });
});
