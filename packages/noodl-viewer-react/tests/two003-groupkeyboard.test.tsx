/**
 * P121-TWO003-GROUPKEYBOARD — an element whose Click is wired can be reached and pressed from the keyboard.
 *
 * Ruled by Richard, 2026-10-26: *"For accessibility yes, absolutely, we must have interactive elements available to
 * screen readers that tab through the page."* So it is automatic: a wire on Click makes the element a button.
 *
 * Driven on real nodes: the corpus harness builds the node and its wire with the runtime's own `connectInput`, React
 * mounts the node's own render into jsdom, and the keys are real `KeyboardEvent`s dispatched on the element React drew.
 * The Click this grades is the graph's (`signalsFor`), reached through `pointerlisteners.ts` exactly as a pointer's is.
 *
 * Text and Image, not Group: `group.ts` cannot be imported in this package (DEF-029's spec says why). All five nodes
 * with a Click (Group, Text, Image, Circle, Video) take it from one `addPointerEventOutputs`, graded at the bottom.
 *
 * 🔴 jsdom draws no focus ring and moves no focus on Tab, so this grades the attributes and the keys; the ring and the
 * Tab order are a browser reading.
 *
 * @module noodl-viewer-react/tests/two003-groupkeyboard
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

const TextModule = require('../src/nodes/visual/text').default;
const ImageModule = require('../src/nodes/visual/image').default;
const CircleModule = require('../src/nodes/visual/circle').default;
const VideoModule = require('../src/nodes/visual/video').default;
const NodeSharedPortDefinitions = require('../src/node-shared-port-definitions').default;
const { KEYBOARD_CLICK_HOOKS } = require('../src/keyboard-click');
/* eslint-enable @typescript-eslint/no-var-requires */

interface VisualNode extends NodeInstance {
  render(): React.ReactElement | undefined;
  getDOMElement(): HTMLElement | null;
  setDOMElement(el: Element | null): void;
}

interface RuntimeNode {
  connectInput(input: string, source: unknown, port: string): void;
  removeInputConnection(input: string, sourceId: string, port: string): void;
}

/** A node with a signal input to wire Click to. */
const sinkModule = {
  node: {
    name: 'test.ClickSink',
    category: 'test',
    inputs: { go: { type: 'signal', valueChangedToTrue() {} } },
    outputs: {}
  }
};

async function build(module: { node: { name: string } }, opts: { wired: boolean; parameters?: Record<string, unknown> }) {
  const graph: CorpusGraph = await createCorpusGraph({
    modules: [module as never, sinkModule as never],
    data: {
      components: [
        {
          name: '/root',
          nodes: [
            { id: 'card', type: module.node.name, parameters: opts.parameters || {} },
            { id: 'sink', type: 'test.ClickSink', parameters: {} }
          ],
          connections: opts.wired ? [{ sourceId: 'card', sourcePort: 'onClick', targetId: 'sink', targetPort: 'go' }] : []
        }
      ]
    } as never
  });
  (graph.context as unknown as { styles: unknown }).styles = {
    getTextStyle: () => ({}),
    resolveColor: (c: unknown) => c
  };
  (graph.context as unknown as { setNodeFocused: unknown }).setNodeFocused = () => undefined;
  graph.update();

  const node = graph.node('card') as unknown as VisualNode;
  const sink = graph.node('sink') as unknown as RuntimeNode;
  const container = dom.window.document.createElement('div');
  dom.window.document.body.appendChild(container);
  const root = createRoot(container);

  const view = {
    graph,
    node,
    el: () => node.getDOMElement() as HTMLElement,
    clicks: () => graph.signalsFor('card').filter((s) => s === 'onClick').length,
    /** A key pressed and let go on `target` (the element by default). Returns the keydown, to read its cancel. */
    key(key: string, target?: Element, init: Record<string, unknown> = {}) {
      const on = target || view.el();
      const down = new dom.window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
      on.dispatchEvent(down);
      on.dispatchEvent(new dom.window.KeyboardEvent('keyup', { key, bubbles: true, cancelable: true, ...init }));
      graph.update();
      return down as KeyboardEvent;
    },
    wire: () => sink.connectInput('go', node, 'onClick'),
    unwire: () => sink.removeInputConnection('go', 'card', 'onClick'),
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

describe('a Text whose Click is wired is a button to the keyboard', () => {
  it('(the control) the element is on the page and a pointer click sends Click', async () => {
    const v = await build(TextModule, { wired: true, parameters: { text: 'Open the shop' } });
    expect(v.el()).toBeTruthy();
    expect(v.el().textContent).toBe('Open the shop');
    v.el().click();
    v.graph.update();
    expect(v.clicks()).toBe(1);
  });

  it('Tab stops on it and a screen reader announces a button named by its text', async () => {
    const v = await build(TextModule, { wired: true, parameters: { text: 'Open the shop' } });
    expect(v.el().getAttribute('tabindex')).toBe('0');
    expect(v.el().getAttribute('role')).toBe('button');
    expect(v.el().hasAttribute('data-ndl-keyboard-click')).toBe(true);
  });

  it('Enter sends Click once, and the keydown is cancelled', async () => {
    const v = await build(TextModule, { wired: true });
    const down = v.key('Enter');
    expect(v.clicks()).toBe(1);
    expect(down.defaultPrevented).toBe(true);
  });

  it('Space sends Click when the key comes up, and does not scroll the page', async () => {
    const v = await build(TextModule, { wired: true });
    const down = new dom.window.KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    v.el().dispatchEvent(down);
    v.graph.update();
    expect(v.clicks()).toBe(0);
    expect(down.defaultPrevented).toBe(true);
    v.el().dispatchEvent(new dom.window.KeyboardEvent('keyup', { key: ' ', bubbles: true, cancelable: true }));
    v.graph.update();
    expect(v.clicks()).toBe(1);
  });

  it('a held key repeating sends one Click, and a key with a modifier none', async () => {
    const v = await build(TextModule, { wired: true });
    v.key('Enter');
    v.el().dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Enter', repeat: true, bubbles: true, cancelable: true }));
    v.key('Enter', undefined, { metaKey: true });
    v.key('a');
    v.graph.update();
    expect(v.clicks()).toBe(1);
  });

  it('a key something else already handled is left to it (how a Draggable keeps Space)', async () => {
    const v = await build(TextModule, { wired: true });
    // drag-drop.ts listens on the document in the capture phase and cancels the keys it takes
    const taker = (e: KeyboardEvent) => e.preventDefault();
    dom.window.document.addEventListener('keydown', taker, true);
    try {
      v.key(' ');
      v.key('Enter');
    } finally {
      dom.window.document.removeEventListener('keydown', taker, true);
    }
    expect(v.clicks()).toBe(0);
  });

  it('a key pressed inside it is not its own (a field inside a card)', async () => {
    const v = await build(TextModule, { wired: true });
    const field = dom.window.document.createElement('input');
    v.el().appendChild(field);
    v.key('Enter', field);
    v.key(' ', field);
    expect(v.clicks()).toBe(0);
    field.remove();
  });
});

describe('only while Click is wired', () => {
  it('a Text with nothing on Click stays out of the Tab order and Enter does nothing', async () => {
    const v = await build(TextModule, { wired: false });
    expect(v.el().hasAttribute('tabindex')).toBe(false);
    expect(v.el().hasAttribute('role')).toBe(false);
    v.key('Enter');
    v.key(' ');
    expect(v.clicks()).toBe(0);
  });

  it('a wire made while the page runs makes it a button at once, with no repaint', async () => {
    const v = await build(TextModule, { wired: false });
    v.wire();
    expect(v.el().getAttribute('tabindex')).toBe('0');
    expect(v.el().getAttribute('role')).toBe('button');
    v.key('Enter');
    expect(v.clicks()).toBe(1);
  });

  it('the last wire taken off gives back what it added, and Enter does nothing again', async () => {
    const v = await build(TextModule, { wired: true });
    v.unwire();
    expect(v.el().hasAttribute('tabindex')).toBe(false);
    expect(v.el().hasAttribute('role')).toBe(false);
    expect(v.el().hasAttribute('data-ndl-keyboard-click')).toBe(false);
    v.key('Enter');
    expect(v.clicks()).toBe(0);
  });

  it('a new element (a remount) is a button too, and the old one gives it back', async () => {
    const v = await build(TextModule, { wired: true });
    const old = v.el();
    const next = dom.window.document.createElement('div');
    dom.window.document.body.appendChild(next);
    v.node.setDOMElement(next);
    expect(next.getAttribute('role')).toBe('button');
    expect(old.hasAttribute('role')).toBe(false);
    expect(old.hasAttribute('tabindex')).toBe(false);
    next.remove();
  });
});

describe('what the element already says is kept', () => {
  it('its own tabindex and role are not overwritten, nor taken off when the wire goes', async () => {
    const v = await build(TextModule, { wired: false });
    v.el().setAttribute('tabindex', '-1');
    v.el().setAttribute('role', 'link');
    v.wire();
    expect(v.el().getAttribute('tabindex')).toBe('-1');
    expect(v.el().getAttribute('role')).toBe('link');
    v.unwire();
    expect(v.el().getAttribute('tabindex')).toBe('-1');
    expect(v.el().getAttribute('role')).toBe('link');
  });

  it('a native button is left alone: it is reachable and presses itself', async () => {
    const v = await build(TextModule, { wired: false });
    const button = dom.window.document.createElement('button');
    dom.window.document.body.appendChild(button);
    v.node.setDOMElement(button);
    v.wire();
    expect(button.hasAttribute('tabindex')).toBe(false);
    expect(button.hasAttribute('role')).toBe(false);
    button.remove();
  });
});

describe('an Image whose Click is wired (a photo tile)', () => {
  it('is a button named by its alt text, and Enter sends Click', async () => {
    const v = await build(ImageModule, { wired: true, parameters: { alt: 'Ann at the lake', src: '/a.png' } });
    expect(v.el().tagName).toBe('IMG');
    expect(v.el().getAttribute('tabindex')).toBe('0');
    expect(v.el().getAttribute('role')).toBe('button');
    expect(v.el().getAttribute('alt')).toBe('Ann at the lake');
    v.key('Enter');
    expect(v.clicks()).toBe(1);
  });
});

describe('every node with a Click carries it', () => {
  it('Text, Image, Circle and Video: Click carries the hooks', () => {
    for (const [name, mod] of [
      ['Text', TextModule],
      ['Image', ImageModule],
      ['Circle', CircleModule],
      ['Video', VideoModule]
    ] as const) {
      const click = mod.node.outputs.onClick;
      expect(`${name}:${click.onFirstConnectionAdded === KEYBOARD_CLICK_HOOKS.onFirstConnectionAdded}`).toBe(`${name}:true`);
      expect(`${name}:${click.onLastConnectionRemoved === KEYBOARD_CLICK_HOOKS.onLastConnectionRemoved}`).toBe(`${name}:true`);
    }
  });

  it('Group, through the mutator group.ts calls', () => {
    const def: any = { name: 'Group', inputs: {}, outputs: {}, inputCss: {} };
    NodeSharedPortDefinitions.addPointerEventOutputs(def);
    expect(def.outputProps.onClick.onFirstConnectionAdded).toBe(KEYBOARD_CLICK_HOOKS.onFirstConnectionAdded);
    expect(def.outputProps.onClick.onLastConnectionRemoved).toBe(KEYBOARD_CLICK_HOOKS.onLastConnectionRemoved);
  });
});

describe('Tab reaching it draws the controls’ ring', () => {
  it('the stylesheet rings the attribute this module marks, in the project’s --ring, for keyboard focus only', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const css: string = require('fs').readFileSync(require('path').join(__dirname, '..', 'src', 'assets', 'style.css'), 'utf-8');
    const rule = css.match(/\[data-ndl-keyboard-click\]:focus-visible\s*\{([^}]*)\}/);
    expect(rule).not.toBeNull();
    expect(rule![1]).toContain('outline: var(--ring-width, 3px) solid var(--ring, #101010)');
    expect(css).not.toMatch(/\[data-ndl-keyboard-click\]:focus\s*\{/);
  });
});
