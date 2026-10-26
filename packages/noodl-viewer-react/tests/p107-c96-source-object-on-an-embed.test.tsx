/**
 * P107-C96 — a Video showing a YouTube or Vimeo link, with something on Source Object.
 *
 * `setSourceObject` read `this.video.srcObject`, and an embed draws an `<iframe>`, never a `<video>`: placed with a Source Object
 * (a camera stream that has sent nothing yet is null), the Video threw in its first draw. It once blanked the page; since built-in
 * nodes sit inside `KitNodeBoundary` the page keeps drawing, but the Video shows nothing: the person loses the player. That is why
 * the conformance scenario stopped firing (it sees the throw no more) while the defect stayed — so this is graded here, on the
 * player being drawn, on a real node: the corpus harness builds it, React mounts its own render into jsdom.
 *
 * @module noodl-viewer-react/tests/p107-c96-source-object-on-an-embed
 */

/* eslint-env jest */

import React from 'react';

import { createCorpusGraph, type CorpusGraph } from '../../noodl-runtime/test/corpus/graph-harness';

// a file's Source is resolved against `Noodl.Env.BaseUrl` (`getAbsoluteUrl`)
(globalThis as unknown as { Noodl: unknown }).Noodl = { deployed: true, baseUrl: '/', Env: { BaseUrl: '/' } };

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

const VideoModule = require('../src/nodes/visual/video').default;
/* eslint-enable @typescript-eslint/no-var-requires */

const EMBED = 'https://youtu.be/dQw4w9WgXcQ';

async function build(parameters: Record<string, unknown>) {
  const graph: CorpusGraph = await createCorpusGraph({
    modules: [VideoModule as never],
    data: { components: [{ name: '/root', nodes: [{ id: 'v', type: VideoModule.node.name, parameters }] }] } as never
  });
  (graph.context as unknown as { styles: unknown }).styles = { getTextStyle: () => ({}), resolveColor: (c: unknown) => c };
  graph.update();
  const node = graph.node('v') as unknown as { render(): React.ReactElement | undefined; setInputValue(name: string, v: unknown): void };
  const container = dom.window.document.createElement('div');
  dom.window.document.body.appendChild(container);
  const root = createRoot(container);
  // the boundary reports a failed draw through console.error; collected, so a row can say the draw did not fail
  const failed: string[] = [];
  const spy = jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    failed.push(args.map(String).join(' '));
  });
  try {
    await act(async () => {
      root.render(React.createElement(React.Fragment, null, node.render() ?? null));
    });
    graph.update();
  } finally {
    spy.mockRestore();
  }
  return { graph, node, container, failed };
}

describe('P107-C96 — Source Object on an embedded player', () => {
  it('(the control) a YouTube link with nothing on Source Object draws the player', async () => {
    const v = await build({ src: EMBED });
    expect(v.container.querySelector('iframe')).not.toBeNull();
    expect(v.failed).toEqual([]);
  });

  it('placed with Source Object null, the player is still drawn and nothing failed', async () => {
    const v = await build({ src: EMBED, srcObject: null });
    expect(v.failed.filter((f) => f.includes('srcObject'))).toEqual([]);
    expect(v.container.querySelector('iframe')).not.toBeNull();
  });

  it('Source Object written after the player is drawn changes nothing and does not throw', async () => {
    const v = await build({ src: EMBED });
    expect(() => {
      v.node.setInputValue('srcObject', null);
      v.graph.update();
    }).not.toThrow();
    expect(v.container.querySelector('iframe')).not.toBeNull();
  });

  it('(the twin) on a video file the <video> is drawn and takes it', async () => {
    const v = await build({ src: 'clip.mp4', srcObject: null });
    expect(v.container.querySelector('video')).not.toBeNull();
    expect(v.failed.filter((f) => f.includes('srcObject'))).toEqual([]);
  });
});
