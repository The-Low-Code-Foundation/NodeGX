/**
 * GAM-011 — a field can ask for a keypad, and take a tapped key at the caret.
 *
 * P87 RKT-005 found it: on a tablet a number answer opened the full letter keyboard over half the
 * game, and an on-screen pad could not type into the box while the caret was in it. Rocket School
 * built its own React node (`game-kit.AnswerPad`) to get either.
 *
 * 🔒 R12 (Richard, 2026-09-17): `Input Mode = none` is enough for "no soft keyboard"; no
 * display-only box is owed.
 *
 * ## Part (a): Input Mode and Enter Key Hint
 *
 * Two enums on Text Input that reach the `<input>` (and the `<textarea>`) as `inputmode` and
 * `enterkeyhint`. **Unset means no attribute**, so nothing already built changes: that is the
 * refusal beside every acceptance below. `inputmode` does nothing in desktop Chrome (§7), so the
 * attribute is what is graded, here and in the browser.
 *
 * The harness is GAM-009's: a real Text Input node from the corpus graph, rendered through its own
 * `render()` into a real `createRoot` over hand-built jsdom (`jest-environment-jsdom` is not in this
 * tree).
 *
 * @module noodl-viewer-react/tests/gam-011-a-field-can-ask-for-a-keypad
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
  render(): React.ReactElement | undefined;
}

type EnumPort = { type: { name: string; enums: Array<{ value: string }> }; default?: unknown; group?: string };

async function render(parameters: Record<string, unknown> = {}) {
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
  const container = dom.window.document.createElement('div');
  dom.window.document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(React.createElement(React.Fragment, null, node.render() ?? null));
  });
  const element = container.querySelector('input, textarea') as HTMLElement;
  const attributes = (): Record<string, string | null> => ({
    inputmode: element.getAttribute('inputmode'),
    enterkeyhint: element.getAttribute('enterkeyhint')
  });
  return { element, attributes, unmount: () => act(async () => root.unmount()) };
}

describe('GAM-011 (a) — the ports', () => {
  // The built module folds `inputProps` into `inputs`: this is the port list the editor and catalog read.
  const inputProps = TextInputModule.node.inputs as Record<string, EnumPort>;

  it('Input Mode offers the eight keyboards, with no default', () => {
    const port = inputProps.inputMode;
    expect(port.type.name).toBe('enum');
    expect(port.type.enums.map((e) => e.value)).toEqual(['text', 'numeric', 'decimal', 'tel', 'email', 'url', 'search', 'none']);
    expect(port.default).toBeUndefined();
  });

  it('Enter Key Hint offers the seven labels, with no default', () => {
    const port = inputProps.enterKeyHint;
    expect(port.type.name).toBe('enum');
    expect(port.type.enums.map((e) => e.value)).toEqual(['enter', 'done', 'go', 'next', 'previous', 'search', 'send']);
    expect(port.default).toBeUndefined();
  });
});

describe('GAM-011 (a) — what reaches the element', () => {
  it('unset: no inputmode and no enterkeyhint, so nothing already built changes', async () => {
    const f = await render();
    expect(f.element.tagName).toBe('INPUT');
    expect(f.attributes()).toEqual({ inputmode: null, enterkeyhint: null });
    await f.unmount();
  });

  it('Input Mode = decimal and Enter Key Hint = next reach the <input>', async () => {
    const f = await render({ inputMode: 'decimal', enterKeyHint: 'next' });
    expect(f.attributes()).toEqual({ inputmode: 'decimal', enterkeyhint: 'next' });
    await f.unmount();
  });

  it('Input Mode = none reaches it too (R12: that is how a field asks for no soft keyboard)', async () => {
    const f = await render({ inputMode: 'none' });
    expect(f.attributes()).toEqual({ inputmode: 'none', enterkeyhint: null });
    await f.unmount();
  });

  it('a Text Area carries them as well', async () => {
    const f = await render({ type: 'textArea', inputMode: 'text', enterKeyHint: 'send' });
    expect(f.element.tagName).toBe('TEXTAREA');
    expect(f.attributes()).toEqual({ inputmode: 'text', enterkeyhint: 'send' });
    await f.unmount();
  });
});

/**
 * ## Part (b): Insert Text and Backspace
 *
 * An on-screen key writes at the caret the way a pressed key does, **even while the field has focus**
 * (`Set` abstains then, which is why a pad could not type into a focused box). 🔒 R12: Max length
 * holds. Backspace is included: a keypad without it is not a keypad.
 *
 * Every insert row reads the DOM value, the caret, `document.activeElement`, the Value output and
 * the outcome. The refusal beside them is the focused `Set`, still `Unchanged`.
 */
interface EditableNode extends FieldNode {
  setInputValue(name: string, value: unknown): void;
  outputPropValues: Record<string, unknown>;
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

  const node = graph.node('field') as unknown as EditableNode;
  const container = dom.window.document.createElement('div');
  dom.window.document.body.appendChild(container);
  const root = createRoot(container);

  const v = {
    graph,
    node,
    input: () => container.querySelector('input, textarea') as HTMLInputElement | null,
    outcomes: () => graph.signalsFor('field').filter((s) => s === 'done' || s === 'unchanged' || s === 'failure'),
    valueChanged: () => graph.signalsFor('field').filter((s) => s === 'textChanged').length,
    async paint() {
      await act(async () => {
        root.render(React.createElement(React.Fragment, null, node.render() ?? null));
      });
      graph.update();
    },
    async type(text: string) {
      const input = v.input()!;
      const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set;
      await act(async () => {
        setter.call(input, text);
        input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
      });
      graph.update();
    },
    /** A keypad button: set Text To Insert, pulse Insert Text, let React commit. */
    async press(text: string) {
      await act(async () => {
        node.setInputValue('textToInsert', text);
        node.setInputValue('insert', true);
        node.setInputValue('insert', false);
        graph.update();
      });
      await v.paint();
    },
    async backspace() {
      await act(async () => {
        node.setInputValue('backspace', true);
        node.setInputValue('backspace', false);
        graph.update();
      });
      await v.paint();
    },
    async focusAt(start: number, end = start) {
      await act(async () => {
        v.input()!.focus();
        v.input()!.setSelectionRange(start, end);
      });
    },
    unmount: () => act(async () => root.unmount())
  };
  await v.paint();
  return v;
}

describe('GAM-011 (b) — the ports', () => {
  const inputs = TextInputModule.node.inputs as Record<string, { type: unknown; displayName: string }>;
  it('declares Text To Insert, Insert Text and Backspace', () => {
    expect(inputs.textToInsert).toMatchObject({ type: 'string', displayName: 'Text To Insert' });
    expect(inputs.insert).toMatchObject({ type: 'signal', displayName: 'Insert Text' });
    expect(inputs.backspace).toMatchObject({ type: 'signal', displayName: 'Backspace' });
  });
});

describe('GAM-011 (b) AC3 — a key tapped while the caret is in the box', () => {
  it('(refusal, ERG-001 §4) a Set while focused is still Unchanged and the DOM keeps what was typed', async () => {
    const v = await build({ startValue: 'Ann' });
    await v.focusAt(0);
    await v.type('123');
    await act(async () => {
      v.node.setInputValue('set', true);
      v.node.setInputValue('set', false);
      v.graph.update();
    });
    await v.paint();
    expect(v.outcomes()).toEqual(['unchanged']);
    expect(v.input()!.value).toBe('123');
    await v.unmount();
  });

  it('Insert Text lands at the caret: 1|23 + 9 → 1923, caret after the 9, focus kept, Done, Value Changed once', async () => {
    const v = await build();
    await v.focusAt(0);
    await v.type('123');
    await v.focusAt(1);
    const changed = v.valueChanged();

    await v.press('9');

    expect(v.input()!.value).toBe('1923');
    expect(v.input()!.selectionStart).toBe(2);
    expect(dom.window.document.activeElement).toBe(v.input());
    expect(v.outcomes()).toEqual(['done']);
    expect(v.node.outputPropValues.onTextChanged).toBe('1923');
    expect(v.valueChanged()).toBe(changed + 1);
    await v.unmount();
  });

  it('a selection is replaced', async () => {
    const v = await build();
    await v.focusAt(0);
    await v.type('12345');
    await v.focusAt(1, 4);
    await v.press('0');
    expect(v.input()!.value).toBe('105');
    expect(v.input()!.selectionStart).toBe(2);
    await v.unmount();
  });

  it('Backspace deletes the character before the caret, and a whole emoji', async () => {
    const v = await build();
    await v.focusAt(0);
    await v.type('1😀23');
    await v.focusAt(3); // after the emoji (two UTF-16 units)
    await v.backspace();
    expect(v.input()!.value).toBe('123');
    expect(v.input()!.selectionStart).toBe(1);
    expect(v.outcomes()).toEqual(['done']);
    await v.unmount();
  });

  it('Backspace at the start changes nothing and says Unchanged', async () => {
    const v = await build();
    await v.focusAt(0);
    await v.type('12');
    await v.focusAt(0);
    await v.backspace();
    expect(v.input()!.value).toBe('12');
    expect(v.outcomes()).toEqual(['unchanged']);
    await v.unmount();
  });
});

describe('GAM-011 (b) — R12 and the edges', () => {
  it('Max length holds: what does not fit is not written, and a full field says Unchanged', async () => {
    const v = await build({ maxLength: 3 });
    await v.focusAt(0);
    await v.type('12');
    await v.focusAt(2);
    await v.press('345');
    expect(v.input()!.value).toBe('123');
    await v.press('4');
    expect(v.input()!.value).toBe('123');
    expect(v.outcomes()).toEqual(['done', 'unchanged']);
    await v.unmount();
  });

  it('a field nobody has focused appends', async () => {
    const v = await build({ startValue: 'Ann' });
    await v.press('e');
    expect(v.input()!.value).toBe('Anne');
    expect(v.outcomes()).toEqual(['done']);
    await v.unmount();
  });

  it('a Number field, which has no selection API, appends and does not throw', async () => {
    const v = await build({ type: 'number' });
    await act(async () => v.input()!.focus()); // setSelectionRange itself throws on a Number input
    expect(dom.window.document.activeElement).toBe(v.input());
    await v.press('4');
    await v.press('2');
    expect(v.input()!.value).toBe('42');
    expect(v.node.outputPropValues.onTextChanged).toBe(42);
    await v.unmount();
  });

  it('an inserted key survives the field leaving and coming back, as a typed one does (GAM-009 R10)', async () => {
    const v = await build();
    await v.focusAt(0);
    await v.type('12');
    await v.focusAt(2);
    await v.press('3');
    for (const mounted of [false, true]) {
      await act(async () => {
        v.node.setInputValue('mounted', mounted);
        v.graph.update();
      });
      await v.paint();
    }
    expect(v.input()!.value).toBe('123');
    await v.unmount();
  });

  it('not on the page: Insert Text appends to the value the field will start from, and the Value output says so', async () => {
    const v = await build({ startValue: '12', mounted: false });
    expect(v.input()).toBeNull();
    const flagged: string[] = [];
    const flag = (v.node as unknown as { flagOutputDirty(n: string): void }).flagOutputDirty.bind(v.node);
    (v.node as unknown as { flagOutputDirty(n: string): void }).flagOutputDirty = (n: string) => {
      flagged.push(n);
      flag(n);
    };
    await v.press('3');
    expect(flagged).toContain('onTextChanged'); // the output is flagged, so a wire from Value hears it
    expect(v.node.outputPropValues.onTextChanged).toBe('123');
    expect(v.outcomes()).toEqual(['done']);
    await act(async () => {
      v.node.setInputValue('mounted', true);
      v.graph.update();
    });
    await v.paint();
    expect(v.input()!.value).toBe('123');
    await v.unmount();
  });
});
