/* eslint-env jest */
/**
 * P109 ISL-008 AC7, the server half: a server render has no `document`, so the defaults gather in
 * `globalThis.__noodlDefaultStyleRules`, and `server-core.js` writes them first in `<head>` (`inject-default-styles.js`).
 *
 * This renders real Groups through the runtime with `renderToString` and NO document — the server's situation — and
 * passes the page through the real `injectDefaultStyles`. It grades the markup. With `ISL008_SSR_OUT=<dir>` it also
 * writes the page as `<dir>/index.html`, which `scripts/devtools/drive-isl008-win-card.js` reads in Chrome with no
 * scripts at all: the first paint, before any hydration could fix anything.
 *
 * ⚠️ Narrower than a server-rendered deploy (the editor's Self Hosting flow assembles one; nothing in the repo runs
 * that pipeline headless). What it does not cover: `server-core.js` calling the injector, which is one line and is
 * read in review.
 */

(globalThis as Record<string, any>).Noodl = { deployed: true, baseUrl: '/' };
jest.mock('../../src/components/visual/Group/scroll-plugins/nested-scroll-plugin', () => ({ default: class {} }));
jest.mock('../../src/components/visual/Group/scroll-plugins/patched-momentum-scroll', () => ({ default: () => undefined }));
jest.mock('../../src/components/visual/Group/scroll-plugins/slide-scroll-plugin', () => ({ default: class {} }));

import * as fs from 'fs';
import * as path from 'path';

import * as React from 'react';
import { renderToString } from 'react-dom/server';

import type { NodeModule } from '@noodl/types';

import { createCorpusGraph } from '../../../noodl-runtime/test/corpus/graph-harness';
import GroupNodeModule from '../../src/nodes/visual/group';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { injectDefaultStyles } = require('../../static/ssr/inject-default-styles');

const CSS =
  '.win, .win-set { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; }\n' +
  '.win-imp { position: fixed !important; inset: 0 !important; display: flex !important; align-items: center !important; justify-content: center !important; }';

function overlay(id: string, cls: string | undefined, extra: Record<string, unknown> = {}) {
  return {
    id,
    type: 'Group',
    parameters: { ...(cls ? { cssClassName: cls } : {}), dataAttributes: 'data-isl008', 'data-isl008': id, ...extra },
    children: [
      {
        id: id + 'Card',
        type: 'Group',
        parameters: {
          sizeMode: 'explicit',
          width: { value: 200, unit: 'px' },
          height: { value: 100, unit: 'px' },
          backgroundColor: '#ffd54f',
          dataAttributes: 'data-isl008-card',
          'data-isl008-card': id
        }
      }
    ]
  };
}

it('a server render carries the defaults sheet FIRST in <head>, and no default inline', async () => {
  expect(typeof (globalThis as { document?: unknown }).document).toBe('undefined');

  const graph = await createCorpusGraph({
    modules: [GroupNodeModule as NodeModule] as never,
    data: {
      components: [
        {
          name: '/root',
          nodes: [
            {
              id: 'layout',
              type: 'Group',
              children: [overlay('bare', undefined), overlay('forced', 'win-imp'), overlay('set', 'win-set', { alignItems: 'flex-start' }), overlay('plain', 'win')]
            }
          ],
          connections: []
        }
      ]
    } as never
  });
  (graph.context as unknown as { styles: unknown }).styles = { getTextStyle: () => ({}), resolveColor: (c: unknown) => c };
  await graph.settle(4);

  const body = renderToString((graph.node('layout') as unknown as { render(): React.ReactElement }).render());
  const template =
    '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">' +
    `<style>html,body{margin:0;height:100%}</style><style id="author">${CSS}</style></head>` +
    `<body><p>isl008 page drew</p><div id="root">${body}</div></body></html>`;
  const rules = (globalThis as { __noodlDefaultStyleRules?: string[] }).__noodlDefaultStyleRules;
  expect(rules && rules.length).toBeGreaterThan(0);
  const html = injectDefaultStyles(template, rules);

  // The sheet is the first thing in <head>, before the author's own stylesheet.
  expect(html.indexOf('<head><style id="noodl-default-styles">')).toBeGreaterThan(-1);
  expect(html.indexOf('noodl-default-styles')).toBeLessThan(html.indexOf('id="author"'));
  // The plain overlay carries its class and the defaults class, and no inline default.
  const plain = /<div([^>]*data-isl008="plain"[^>]*)>/.exec(html)![1];
  expect(plain).toMatch(/class="win ndl-d-[a-z0-9]+"/);
  expect(plain).not.toMatch(/align-items/);

  if (process.env.ISL008_SSR_OUT) {
    fs.mkdirSync(process.env.ISL008_SSR_OUT, { recursive: true });
    fs.writeFileSync(path.join(process.env.ISL008_SSR_OUT, 'index.html'), html);
  }
});
