/**
 * P109 ISL-028 — P107-C31, ruled 2026-10-05 "Reach the outer popup".
 *
 * Close Popup's Popup input: "Which popup to close when popups are nested; leave blank to close the nearest enclosing
 * one". Every popup is built in the ROOT component's scope, whoever opened it, so the component walk from an inner
 * popup went inner → root and never through the outer popup: naming the outer one failed with
 * `close-popup/target-not-found`. Close Popup's walk now crosses from a popup to the component that opened it.
 *
 * Two real popups through the runtime's `showPopup`, the inner one opened from inside the outer (its `senderNode`, as
 * Show Popup passes it). The rows: naming the outer closes the outer; a BLANK Popup still closes the nearest (the
 * inner) — the behaviour every existing graph has; a name that is neither still fails and lists both.
 */

/* eslint-env jest */

import type { ComponentInstanceLike, NodeModule } from '@noodl/types';

import { createCorpusGraph, type CorpusGraph } from '../../noodl-runtime/test/corpus/graph-harness';

import ClosePopupModule from '../src/nodes/navigation/closepopup';

import { GroupModule } from './corpus/visual-container';

const realRequestAnimationFrame = (globalThis as Record<string, unknown>).requestAnimationFrame;

beforeAll(() => {
  // `showPopup` attaches a popup to its group in a rAF; the attachment is what gives it a visual parent to walk
  (globalThis as Record<string, unknown>).requestAnimationFrame = (callback: (time: number) => void) =>
    setTimeout(() => callback(0), 0) as unknown as number;
});

afterAll(() => {
  (globalThis as Record<string, unknown>).requestAnimationFrame = realRequestAnimationFrame;
});

async function nested(target: string | undefined) {
  const graph: CorpusGraph = await createCorpusGraph({
    modules: [GroupModule, ClosePopupModule as unknown as NodeModule],
    rootComponent: '/root',
    data: {
      components: [
        { name: '/root', nodes: [{ id: 'root-group', type: 'Group' }] },
        { name: '/Outer', nodes: [{ id: 'outer-group', type: 'Group' }] },
        {
          name: '/Inner',
          nodes: [
            {
              id: 'inner-group',
              type: 'Group',
              children: [{ id: 'closer', type: 'NavigationClosePopup', parameters: target === undefined ? {} : { targetComponent: target } }]
            }
          ]
        }
      ]
    } as never
  });
  await graph.settle(3);
  graph.context.setPopupCallbacks({ onShow: () => undefined, onClose: () => undefined });

  const closed: string[] = [];
  const root = graph.context.rootComponent as unknown as ComponentInstanceLike;
  await graph.context.showPopup('/Outer', {}, { senderNode: root, onClosePopup: () => closed.push('/Outer') });
  await graph.settle(3);
  const outer = (graph.context.rootComponent as unknown as { nodeScope: { getNodesWithType(t: string): ComponentInstanceLike[] } }).nodeScope.getNodesWithType('/Outer')[0];
  expect(outer).toBeDefined();
  // Show On Top, from inside the outer popup — what a Show Popup in Outer hands `showPopup`
  await graph.context.showPopup('/Inner', {}, { senderNode: outer, stackPolicy: 'stack', onClosePopup: () => closed.push('/Inner') });
  await graph.settle(3);
  expect(graph.context.popupStack).toHaveLength(2);

  graph.node('closer').setInputValue('close', true);
  for (let i = 0; i < 3; i++) {
    graph.frame();
    await graph.settle(1);
  }
  return { graph, closed };
}

describe('ISL-028 C31 — a Close Popup in a nested popup reaches the popup that opened it', () => {
  it('naming the outer popup closes the outer popup; its opener hears Closed', async () => {
    const { graph, closed } = await nested('/Outer');
    expect(closed).toEqual(['/Outer']);
    expect(graph.signalsFor('closer')).toEqual(['done', 'completed']);
    expect(graph.editorConnection.subLabels['closer']).toBe('→ /Outer');
  });

  it('(control) a blank Popup still closes the nearest — the inner one, and only it', async () => {
    const { graph, closed } = await nested(undefined);
    expect(closed).toEqual(['/Inner']);
    expect(graph.signalsFor('closer')).toEqual(['done', 'completed']);
  });

  it('naming the inner popup closes the inner one', async () => {
    const { closed } = await nested('/Inner');
    expect(closed).toEqual(['/Inner']);
  });

  it('a name that is neither still fails, and names both popups it is inside, nearest first', async () => {
    const { graph, closed } = await nested('/Nope');
    expect(closed).toEqual([]);
    expect(graph.signalsFor('closer')).toEqual(['failure', 'completed']);
    const miss = graph.errors.find((e) => e.code === 'close-popup/target-not-found');
    expect(miss && miss.message).toContain('it is inside: /Inner, /Outer');
  });
});
