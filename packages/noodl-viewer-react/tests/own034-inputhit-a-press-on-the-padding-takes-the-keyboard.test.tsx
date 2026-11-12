/**
 * P112-OWN034-INPUTHIT — a press on a Text Input's padding puts the keyboard on the field.
 *
 * OWN-034 found it on a phone: the field is drawn as a bordered box about 40 px tall, but only the
 * `<input>` inside it (22 px) takes a press. The node's padding and border are on the
 * `inputWrapper` div, and a mousedown on a div that cannot be focused moves the keyboard to the
 * body. So a thumb near the field's edge got no keyboard.
 *
 * The node-spec cannot say "the padding": its press acts land on the control and it has no
 * geometry. So this is the GAM-009 harness: a real Text Input node, rendered through its own
 * `render()` into a real `createRoot`, and a mousedown dispatched on the wrapper as a browser
 * dispatches it, followed by the browser's default action (focus to the body) unless it is
 * cancelled. jsdom runs no default action for a mousedown, so the test runs it.
 *
 * @module noodl-viewer-react/tests/own034-inputhit-a-press-on-the-padding-takes-the-keyboard
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
  const container = dom.window.document.createElement('div');
  dom.window.document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(React.createElement(React.Fragment, null, node.render() ?? null));
  });
  graph.update();

  const document = dom.window.document;
  return {
    field: () => container.querySelector('input, textarea') as HTMLElement,
    wrapper: () => container.querySelector('[noodl-style-tag="inputWrapper"]') as HTMLElement,
    focusedSignals: () => graph.signalsFor('field').filter((s) => s === 'onFocus').length,
    /** A mouse press on `el`: the browser's events, then its default action unless a handler cancelled it. */
    async press(el: HTMLElement) {
      await act(async () => {
        const notCancelled = el.dispatchEvent(new dom.window.MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }));
        if (notCancelled) {
          const focusable = el.closest('input, textarea, [tabindex]') as HTMLElement | null;
          if (focusable) focusable.focus();
          else (document.activeElement as HTMLElement | null)?.blur();
        }
        el.dispatchEvent(new dom.window.MouseEvent('mouseup', { bubbles: true, cancelable: true, button: 0 }));
        el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
      });
      graph.update();
    },
    active: () => document.activeElement,
    unmount: () => act(async () => root.unmount())
  };
}

describe('P112-OWN034-INPUTHIT — a press on the padding takes the keyboard', () => {
  it('(known-firing) a press on the field itself focuses it and fires Focused', async () => {
    const v = await build();
    await v.press(v.field());
    expect(v.active()).toBe(v.field());
    expect(v.focusedSignals()).toBe(1);
    await v.unmount();
  });

  it('a press on the wrapper (the padding and border) focuses the field and fires Focused', async () => {
    const v = await build();
    expect(v.wrapper()).not.toBe(v.field());
    await v.press(v.wrapper());
    expect(v.active()).toBe(v.field());
    expect(v.focusedSignals()).toBe(1);
    await v.unmount();
  });

  it('the same for a Text Area', async () => {
    const v = await build({ type: 'textArea' });
    expect(v.field().tagName).toBe('TEXTAREA');
    await v.press(v.wrapper());
    expect(v.active()).toBe(v.field());
    await v.unmount();
  });

  it('a press on the padding of a disabled field takes nothing', async () => {
    const v = await build({ enabled: false });
    await v.press(v.wrapper());
    expect(v.active()).not.toBe(v.field());
    expect(v.focusedSignals()).toBe(0);
    await v.unmount();
  });
});
