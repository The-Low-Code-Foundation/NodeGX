/**
 * GAM-027 — a button can be told not to take the cursor.
 *
 * A click focuses the button it lands on, so a keypad built from ordinary Buttons loses the caret
 * on every key: measured in Chromium (GAM-011 §8 s21) typing `123` with the caret after the `1`
 * and clicking a `9` wired to `Insert Text` gives `1923` either way, but a plain click leaves
 * focus on the button and the caret at the end. The only escape was cancelling `mousedown` from a
 * page script, which a graph cannot do.
 *
 * 🔒 R26 (Richard, s24): **a `Keeps Focus` port on the Button, default off, and Button only.**
 * "A Button never takes the caret from a text field" was offered and declined, so unset is
 * today's behaviour everywhere.
 *
 * ## What this file can and cannot grade
 *
 * 🔴 **jsdom never moves focus on a pointer press.** Measured before this file was written: with
 * an `<input>` focused, dispatching `mousedown` on a `<button>` — and calling `.click()` — leaves
 * `document.activeElement` on the input, and the event's `defaultPrevented` is false. So an arm
 * here asserting "focus moved to the button" would read the same in both arms and grade nothing.
 *
 * What is real here is the **mechanism**: focusing the pressed element is the default action of
 * `mousedown`, so the whole fix is whether that event is cancelled. This file grades exactly that,
 * plus the thing a cancel could plausibly break — the Click signal and the pointer ports still
 * firing. The **consequence** (the caret stays in the field, the next typed digit lands there) is
 * a browser reading, in the task's §8.
 *
 * `jest-environment-jsdom` is not in this tree, so jsdom is built by hand as the GAM-009 and
 * NDA-012 suites do.
 *
 * @module noodl-viewer-react/tests/gam-027-a-button-can-keep-the-cursor
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

const ButtonModule = require('../src/nodes/controls/button').default;
/* eslint-enable @typescript-eslint/no-var-requires */

interface ButtonNode extends NodeInstance {
  render(): React.ReactElement | undefined;
  props: Record<string, unknown>;
}

async function build(parameters: Record<string, unknown> = {}) {
  const graph: CorpusGraph = await createCorpusGraph({
    modules: [ButtonModule],
    data: {
      components: [{ name: '/root', nodes: [{ id: 'key', type: ButtonModule.node.name, parameters }] }]
    } as never
  });
  (graph.context as unknown as { styles: unknown }).styles = {
    getTextStyle: () => ({}),
    resolveColor: (c: unknown) => c
  };
  (graph.context as unknown as { setNodeFocused: unknown }).setNodeFocused = () => undefined;
  graph.update();

  const node = graph.node('key') as unknown as ButtonNode;
  const container = dom.window.document.createElement('div');
  dom.window.document.body.appendChild(container);
  const root = createRoot(container);

  const view = {
    graph,
    node,
    button: () => container.querySelector('button') as HTMLButtonElement | null,
    /** Signals the graph has sent from this node so far, by port name. */
    signals: (name: string) => graph.signalsFor('key').filter((s) => s === name).length,
    /**
     * A real press. Returns the event, so the arm can read whether its default action — focusing
     * the pressed element — was cancelled. That is the whole of the mechanism under test.
     */
    press() {
      const button = view.button();
      if (!button) throw new Error('no button on the page to press');
      const down = new dom.window.MouseEvent('mousedown', { bubbles: true, cancelable: true });
      button.dispatchEvent(down);
      button.dispatchEvent(new dom.window.MouseEvent('mouseup', { bubbles: true, cancelable: true }));
      button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
      graph.update();
      return down;
    },
    async paint() {
      await act(async () => {
        root.render(React.createElement(React.Fragment, null, node.render() ?? null));
      });
      graph.update();
    }
  };

  await view.paint();
  return view;
}

describe('GAM-027 AC1 — the press that steals the cursor, and the one that does not', () => {
  it('(the control the arm needs) a Button is on the page and its press is cancellable', async () => {
    const v = await build();
    expect(v.button()).not.toBeNull();
    const down = v.press();
    expect(down.cancelable).toBe(true);
  });

  it('RED at HEAD: with the port unset, nothing cancels the press, so the browser moves the focus', async () => {
    const v = await build();
    expect(v.press().defaultPrevented).toBe(false);
  });

  it('with Keeps Focus on, the press is cancelled and the keyboard stays where it was', async () => {
    const v = await build({ keepsFocus: true });
    expect(v.press().defaultPrevented).toBe(true);
  });

  it('the port is off unless the author turns it on', async () => {
    const v = await build();
    expect(v.node.props.keepsFocus).toBeFalsy();
  });
});

describe('GAM-027 AC4 — cancelling the press costs the graph nothing', () => {
  /**
   * The risk in cancelling an event is taking something else with it. `Click` is what a keypad key
   * is wired to, and `Pointer Down` / `Pressed` read the very event being cancelled — so all three
   * are read in both arms, and the counts must agree.
   */
  it.each([
    ['off', {}],
    ['on', { keepsFocus: true }]
  ])('with Keeps Focus %s, Click still fires exactly once', async (_label, parameters) => {
    const v = await build(parameters as Record<string, unknown>);
    const before = v.signals('onClick');
    v.press();
    expect(v.signals('onClick') - before).toBe(1);
  });

  it.each([
    ['off', {}],
    ['on', { keepsFocus: true }]
  ])('with Keeps Focus %s, Pointer Down still fires on the cancelled press', async (_label, parameters) => {
    const v = await build(parameters as Record<string, unknown>);
    const before = v.signals('pointerDown');
    v.press();
    expect(v.signals('pointerDown') - before).toBe(1);
  });
});
