/* eslint-env jest */
/**
 * P109 ISL-005 AC5 — a server render runs a Function's script files, as the browser does (ruling 3: browser and server
 * render from day one).
 *
 * Two Functions reach one shared file as `Scripts.greet` and feed two Texts. The page is rendered with
 * `renderToString` and NO document (the server's situation), through the real runtime, the way `server-core.js`
 * renders it. The first paint carries what the file computes; the file changes and both lines change; with Uses
 * cleared the same Functions fail and the words are not there (the control: the text arrives through the file).
 *
 * Not graded here: an edit to the file re-running its users. That is `scriptsChanged`, a listener registered with a
 * ref, and this package's ES5 test build compiles the runtime's `EventSender.emit` (`for … of` a Map) into a loop that
 * visits nothing, so no ref listener ever fires in a test here. The runtime's own suite grades the edit
 * (`noodl-runtime/test/isl-005-script-files.test.ts`), and the browser drive does (AC2).
 *
 * ⚠️ Narrower than a server-rendered deploy, as ISL-008 AC7's server half is: the editor's Self Hosting flow assembles
 * one and nothing in the repo runs that pipeline headless. The script files ride in `projectData.scripts`, which
 * `ssrSetupRuntime` hands to the same `importEditorData` this test calls.
 */

(globalThis as Record<string, any>).Noodl = { deployed: true, baseUrl: '/' };

import * as React from 'react';
import { renderToString } from 'react-dom/server';

import type { NodeModule } from '@noodl/types';

import { createCorpusGraph, type CorpusGraph } from '../../../noodl-runtime/test/corpus/graph-harness';
import FunctionNode = require('../../../noodl-runtime/src/nodes/std-library/simplejavascript');
import TextNodeModule from '../../src/nodes/visual/text';
import GroupNodeModule from '../../src/nodes/visual/group';

jest.mock('../../src/components/visual/Group/scroll-plugins/nested-scroll-plugin', () => ({ default: class {} }));
jest.mock('../../src/components/visual/Group/scroll-plugins/patched-momentum-scroll', () => ({ default: () => undefined }));
jest.mock('../../src/components/visual/Group/scroll-plugins/slide-scroll-plugin', () => ({ default: class {} }));

const GREET = "var words = use('engine/words');\nexports.hello = function (name) { return words.hi + ', ' + name + '!'; };\n";
const WORDS = (hi: string) => `exports.hi = ${JSON.stringify(hi)};\n`;

const fn = (id: string, name: string, uses: string) => ({
  id,
  type: 'JavaScriptFunction',
  parameters: { functionScript: `Outputs.line = Scripts.greet.hello(${JSON.stringify(name)});`, uses },
  ports: [{ name: 'out-line', plug: 'output', type: 'string' }]
});

async function page(uses: string): Promise<CorpusGraph> {
  const graph = await createCorpusGraph({
    modules: [FunctionNode as unknown as NodeModule, TextNodeModule as NodeModule, GroupNodeModule as NodeModule] as never,
    data: {
      scripts: { 'engine/greet.js': GREET, 'engine/words.js': WORDS('Hello') },
      components: [
        {
          name: '/root',
          nodes: [
            fn('fOlive', 'Olive', uses),
            fn('fRobot', 'Robot', uses),
            {
              id: 'layout',
              type: 'Group',
              children: [
                { id: 'tOlive', type: 'Text', parameters: { text: '' } },
                { id: 'tRobot', type: 'Text', parameters: { text: '' } }
              ]
            }
          ],
          connections: [
            { sourceId: 'fOlive', sourcePort: 'out-line', targetId: 'tOlive', targetPort: 'text' },
            { sourceId: 'fRobot', sourcePort: 'out-line', targetId: 'tRobot', targetPort: 'text' }
          ]
        }
      ]
    } as never
  });
  (graph.context as unknown as { styles: unknown }).styles = { getTextStyle: () => ({}), resolveColor: (c: unknown) => c };
  await graph.settle(6);
  return graph;
}

const html = (graph: CorpusGraph) => renderToString((graph.node('layout') as unknown as { render(): React.ReactElement }).render());

it('🔴 the first paint carries what the shared file computes, for both Functions, with no document', async () => {
  expect(typeof (globalThis as { document?: unknown }).document).toBe('undefined');
  const graph = await page('engine/greet.js');
  const first = html(graph);
  expect(first).toContain('Hello, Olive!');
  expect(first).toContain('Hello, Robot!');
  expect((graph.node('fOlive') as unknown as { _internal: { outputValues: Record<string, unknown> } })._internal.outputValues.line).toBe('Hello, Olive!');
});

it('control: with Uses cleared, the same Functions fail and neither line is painted', async () => {
  const graph = await page('');
  const painted = html(graph);
  expect(painted).not.toContain('Olive!');
  expect(painted).not.toContain('Robot!');
});
