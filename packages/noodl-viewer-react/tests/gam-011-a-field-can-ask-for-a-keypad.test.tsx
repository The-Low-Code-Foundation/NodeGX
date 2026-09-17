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

