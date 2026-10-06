/**
 * ISL-026 / P109-S17-KITTHROWBLANKS — a kit node that throws while it draws loses itself, not the page.
 *
 * ISL-012 s17 met it in the browser: a cube kit whose three.js failed to load read `window.THREE` as
 * undefined in its `useEffect`, threw, and the whole page went blank, the Text beside it included, with
 * nothing saying which node had failed.
 *
 * Each row renders a real React root (jsdom by hand, as GAM-009 does): a host `<span>` standing in for the
 * rest of the page, beside the kit node's own `render()`. The first row is the defect, re-measured without
 * the boundary, and is the known-firing signal beside the others: the same throw, the same root, the page
 * gone. The rows after it go through `withKitBoundary`, the one line `viewer.jsx` adds when it registers a
 * kit's `reactNodes`.
 *
 * @module noodl-viewer-react/tests/isl026-a-kit-node-that-throws-stays-inside-itself
 */

/* eslint-env jest */

import React from 'react';

import { createCorpusGraph } from '../../noodl-runtime/test/corpus/graph-harness';

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

const { createNodeFromReactComponent } = require('../src/react-component-node');
const { withKitBoundary, KIT_NODE_FAILED } = require('../src/kit-node-boundary');
/* eslint-enable @typescript-eslint/no-var-requires */

/** The cube's failure: a library that did not load, read in an effect. */
function Cube() {
  React.useEffect(() => {
    const three = (window as unknown as { THREE?: { WebGLRenderer: unknown } }).THREE;
    new (three!.WebGLRenderer as new () => unknown)();
  }, []);
  return React.createElement('div', { 'data-testid': 'cube' });
}

/** A throw in render itself, the other way a component dies. */
function Broken(): React.ReactElement {
  throw new Error('render went wrong');
}

/** A healthy class component with a method, to show the ref still reaches the kit's own instance. */
class Badge extends React.Component<Record<string, unknown>> {
  ping() {
    return 'pong';
  }
  render() {
    return React.createElement('b', { 'data-testid': 'badge' }, 'ok');
  }
}

const def = (name: string, component: React.ComponentType<Record<string, unknown>>) => ({ name, getReactComponent: () => component });

async function page(nodeDef: Record<string, unknown>) {
  const graph = await createCorpusGraph({
    modules: [createNodeFromReactComponent(nodeDef)],
    data: { components: [{ name: '/root', nodes: [{ id: 'kit', type: nodeDef.name }] }] } as never
  });
  graph.update();
  const node = graph.node('kit') as unknown as { render(): React.ReactElement; innerReactComponentRef: unknown };

  const container = dom.window.document.createElement('div');
  dom.window.document.body.appendChild(container);
  const root = createRoot(container);

  const thrown: unknown[] = [];
  const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  try {
    await act(async () => {
      root.render(
        React.createElement('main', null, React.createElement('span', { id: 'text' }, 'isl026 page drew'), node.render())
      );
    });
  } catch (e) {
    thrown.push(e);
  } finally {
    spy.mockRestore();
  }
  return { graph, node, container, thrown };
}

describe('ISL-026 KITTHROWBLANKS — one kit node failing stays inside that node', () => {
  test('the defect, re-measured without the boundary: the throw takes the whole page with it', async () => {
    const { container, thrown } = await page(def('isl026.CubeBare', Cube));
    expect(thrown.length).toBe(1);
    expect(container.textContent).not.toContain('isl026 page drew');
    expect(container.querySelector('main')).toBeNull();
  });

  test('with the boundary, a throw in an effect leaves the rest of the page drawn and the node empty', async () => {
    const { container, thrown, graph } = await page(withKitBoundary(def('isl026.Cube', Cube)));
    expect(thrown).toEqual([]);
    expect(container.querySelector('#text')!.textContent).toBe('isl026 page drew');
    expect(container.querySelector('[data-testid="cube"]')).toBeNull();
    // raised once, naming the node, on the bus that reaches the editor, the console and On App Error
    expect(graph.errors.map((e) => [e.code, e.nodeType])).toEqual([[KIT_NODE_FAILED, 'isl026.Cube']]);
    expect(graph.errors[0].message).toContain('"isl026.Cube"');
    expect(graph.errors[0].message).toContain('WebGLRenderer');
    expect(graph.editorConnection.warnings.map((w) => w.message)).toEqual([graph.errors[0].message]);
  });

  test('with the boundary, a throw in render itself is contained the same way', async () => {
    const { container, thrown, graph } = await page(withKitBoundary(def('isl026.Broken', Broken)));
    expect(thrown).toEqual([]);
    expect(container.querySelector('#text')!.textContent).toBe('isl026 page drew');
    expect(graph.errors.map((e) => e.code)).toEqual([KIT_NODE_FAILED]);
    expect(graph.errors[0].message).toContain('render went wrong');
  });

  test('a healthy kit node draws as before, and its ref still reaches the kit component itself', async () => {
    const { container, thrown, graph, node } = await page(withKitBoundary(def('isl026.Badge', Badge)));
    expect(thrown).toEqual([]);
    expect(container.querySelector('[data-testid="badge"]')!.textContent).toBe('ok');
    expect(graph.errors).toEqual([]);
    expect(node.innerReactComponentRef).toBeInstanceOf(Badge);
    expect((node.innerReactComponentRef as Badge).ping()).toBe('pong');
  });

  test('a definition registered twice is wrapped once', () => {
    const d = def('isl026.Twice', Badge);
    const once = withKitBoundary(d).getReactComponent;
    expect(withKitBoundary(d).getReactComponent).toBe(once);
  });
});
