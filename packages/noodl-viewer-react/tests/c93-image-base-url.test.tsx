/**
 * P107-C93 — an Image in an app served from a sub-path added the Base URL to its source again at
 * every render: Base URL "/x/" turned "/a.png" into "/x/a.png", then "/x/x/a.png", and the picture
 * broke the first time anything re-rendered it (a hover state, an input change, the parent).
 *
 * The cause was a write-back: `Image.tsx` put the based URL into `props.dom.src`, which is the
 * node's own stored value, not a copy. A sub-path base still starts with '/', so the next render
 * matched the same guard and prepended the base again. A full-URL base ("https://cdn…/") stopped
 * after one, because its result no longer starts with '/'.
 *
 * Each arm renders the REAL component twice with ONE `dom` object, as the node does, and reads the
 * `src` the browser would receive. A single render passes against the broken build; the second is
 * the one that grows.
 */

/* eslint-env jest */

(globalThis as Record<string, any>).Noodl = { deployed: false, baseUrl: '/', Env: {} };

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { Image } from '../src/components/visual/Image/Image';

const g = globalThis as Record<string, any>;

function withBase<T>(baseUrl: string | undefined, run: () => T): T {
  const previous = g.Noodl.Env;
  g.Noodl.Env = baseUrl === undefined ? {} : { BaseUrl: baseUrl };
  try {
    return run();
  } finally {
    g.Noodl.Env = previous;
  }
}

function srcOf(html: string): string | undefined {
  const match = html.match(/ src="([^"]*)"/);
  return match ? match[1] : undefined;
}

/** Two renders of one node: the same `dom` object both times, as the node's props are. */
function renderTwice(baseUrl: string | undefined, source: string) {
  return withBase(baseUrl, () => {
    const dom = { src: source, alt: 'a picture' };
    const props = { dom, style: {}, noodlNode: { context: { frameNumber: 0 } } } as any;
    const first = srcOf(renderToStaticMarkup(React.createElement(Image, props)));
    const second = srcOf(renderToStaticMarkup(React.createElement(Image, props)));
    return { first, second, stored: dom.src };
  });
}

describe('P107-C93 — an Image adds the Base URL once, however often it renders', () => {
  it('under a sub-path Base URL: "/x/a.png" at the first render and at the second (the defect)', () => {
    expect(renderTwice('/x/', '/a.png')).toEqual({ first: '/x/a.png', second: '/x/a.png', stored: '/a.png' });
  });

  it('the node keeps the Source it was given — the base is never written back into it', () => {
    expect(renderTwice('/x/', '/a.png').stored).toBe('/a.png');
  });

  it('with no Base URL: "/a.png" both times', () => {
    expect(renderTwice(undefined, '/a.png')).toEqual({ first: '/a.png', second: '/a.png', stored: '/a.png' });
  });

  it('with a full-URL Base URL: once, both times', () => {
    const r = renderTwice('https://cdn.example/', '/a.png');
    expect([r.first, r.second]).toEqual(['https://cdn.example/a.png', 'https://cdn.example/a.png']);
  });

  it('a source that already carries the base keeps it once (the background image port\'s guard)', () => {
    const r = renderTwice('/x/', '/x/a.png');
    expect([r.first, r.second]).toEqual(['/x/a.png', '/x/a.png']);
  });

  it('an absolute http(s) source is left alone', () => {
    const r = renderTwice('/x/', 'https://pics.example/a.png');
    expect([r.first, r.second]).toEqual(['https://pics.example/a.png', 'https://pics.example/a.png']);
  });

  it('with no Source: no src attribute, no throw', () => {
    const r = renderTwice('/x/', undefined as unknown as string);
    expect([r.first, r.second]).toEqual([undefined, undefined]);
  });
});
