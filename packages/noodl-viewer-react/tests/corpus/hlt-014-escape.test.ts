/**
 * HLT-014 — Escape is the runtime's decision, because the popup stack is.
 *
 * The viewer's one key listener asks `NodeContext.cancelTopPopup()`; everything the person can
 * observe about WHICH popup closes and WHICH signal fires is decided there. The DOM half —
 * `role`, `inert`, focus — is graded by `scripts/devtools/drive-hlt014-popup.js` in a real
 * Chrome, because this package's jest has no DOM and `inert` is nothing without a browser.
 */

/* eslint-env jest */

import type { NodeModule } from '@noodl/types';

import { createCorpusGraph, type CorpusGraph } from '../../../noodl-runtime/test/corpus/graph-harness';

import ShowPopupModule from '../../src/nodes/navigation/showpopup';

import { GroupModule } from './visual-container';

/** See the note in `nda-010-close-popup-targeting.test.ts`: `showPopup` uses rAF. */
const realRequestAnimationFrame = (globalThis as Record<string, unknown>).requestAnimationFrame;

beforeAll(() => {
  (globalThis as Record<string, unknown>).requestAnimationFrame = (callback: (time: number) => void) =>
    setTimeout(() => callback(0), 0) as unknown as number;
});

afterAll(() => {
  (globalThis as Record<string, unknown>).requestAnimationFrame = realRequestAnimationFrame;
});

interface PopupGraph {
  graph: CorpusGraph;
  shown: Array<{ id: string }>;
  closed: Array<{ id: string }>;
  /** The options the host was handed with each show, in order. */
  options: Array<{ accessibleName?: string } | undefined>;
}

type Params = Record<string, unknown>;

async function popupGraph(nodes: Array<{ id: string; parameters: Params }>): Promise<PopupGraph> {
  const graph = await createCorpusGraph({
    modules: [GroupModule, ShowPopupModule as unknown as NodeModule],
    rootComponent: '/root',
    data: {
      components: [
        {
          name: '/root',
          nodes: [
            {
              id: 'root-group',
              type: 'Group',
              children: nodes.map((n) => ({
                id: n.id,
                type: 'NavigationShowPopup',
                parameters: { target: '/Dialog', ...n.parameters }
              }))
            }
          ],
          connections: []
        },
        { name: '/Dialog', nodes: [{ id: 'dialog-group', type: 'Group' }] }
      ]
    } as never
  });

  const shown: Array<{ id: string }> = [];
  const closed: Array<{ id: string }> = [];
  const options: Array<{ accessibleName?: string } | undefined> = [];
  graph.context.setPopupCallbacks({
    onShow: (group: { id: string }, o?: { accessibleName?: string }) => {
      shown.push(group);
      options.push(o);
    },
    onClose: (group: { id: string }) => closed.push(group)
  });

  await graph.settle(3);
  return { graph, shown, closed, options };
}

async function popupFrames(graph: CorpusGraph): Promise<void> {
  for (let i = 0; i < 4; i++) {
    graph.frame();
    await graph.settle(2);
  }
}

async function open(graph: CorpusGraph, id: string): Promise<void> {
  graph.node(id).setInputValue('show', true);
  await popupFrames(graph);
}

const cancel = (graph: CorpusGraph): boolean =>
  (graph.context as unknown as { cancelTopPopup(): boolean }).cancelTopPopup();

describe('HLT-014: Escape closes the top popup and says so', () => {
  test('E1: Escape closes an open popup and fires Cancelled — never Closed', async () => {
    const { graph, shown, closed } = await popupGraph([{ id: 'popup', parameters: {} }]);
    await open(graph, 'popup');
    expect(shown).toHaveLength(1);

    expect(cancel(graph)).toBe(true);
    await popupFrames(graph);

    expect(closed.map((g) => g.id)).toEqual([shown[0].id]);
    expect(graph.node('popup').hasOutput('Cancelled')).toBe(true);
    expect(graph.signalsFor('popup')).toContain('Cancelled');
    // `Closed` is where an author commits what the popup produced. A cancel produced nothing.
    expect(graph.signalsFor('popup')).not.toContain('Closed');
    expect(graph.signalsFor('popup')).not.toContain('Dismissed');
  });

  test('E2: with nothing open, Escape is not spent', async () => {
    const { graph } = await popupGraph([{ id: 'popup', parameters: {} }]);
    expect(cancel(graph)).toBe(false);
  });

  test('E3: Close On Escape off — the key is not spent and nothing fires', async () => {
    const { graph, shown, closed } = await popupGraph([{ id: 'popup', parameters: { closeOnEscape: false } }]);
    await open(graph, 'popup');
    expect(shown).toHaveLength(1);

    expect(cancel(graph)).toBe(false);
    await popupFrames(graph);

    expect(closed).toHaveLength(0);
    expect(graph.signalsFor('popup')).not.toContain('Cancelled');
  });

  test('E4: Show On Top — Escape closes only the top one', async () => {
    const { graph, shown, closed } = await popupGraph([
      { id: 'lower', parameters: {} },
      { id: 'upper', parameters: { stackPolicy: 'stack' } }
    ]);
    await open(graph, 'lower');
    await open(graph, 'upper');
    expect(shown).toHaveLength(2);

    cancel(graph);
    await popupFrames(graph);

    expect(closed.map((g) => g.id)).toEqual([shown[1].id]);
    expect(graph.signalsFor('upper')).toContain('Cancelled');
    expect(graph.signalsFor('lower')).not.toContain('Cancelled');
  });

  test('E5: two Escapes inside one frame close ONE popup — the second does not reach through', async () => {
    // The teardown is scheduled for the next frame, so the closing popup is still on top when a
    // second key arrives. It must spend that key, not hand it to the popup underneath.
    const { graph, shown, closed } = await popupGraph([
      { id: 'lower', parameters: {} },
      { id: 'upper', parameters: { stackPolicy: 'stack' } }
    ]);
    await open(graph, 'lower');
    await open(graph, 'upper');

    expect(cancel(graph)).toBe(true);
    expect(cancel(graph)).toBe(true);
    await popupFrames(graph);

    expect(closed.map((g) => g.id)).toEqual([shown[1].id]);
    expect(graph.signalsFor('upper').filter((s) => s === 'Cancelled')).toHaveLength(1);
  });

  test('E6: a top popup that opts out does not let Escape fall through to the one beneath', async () => {
    const { graph, closed } = await popupGraph([
      { id: 'lower', parameters: {} },
      { id: 'upper', parameters: { stackPolicy: 'stack', closeOnEscape: false } }
    ]);
    await open(graph, 'lower');
    await open(graph, 'upper');

    expect(cancel(graph)).toBe(false);
    await popupFrames(graph);
    expect(closed).toHaveLength(0);
  });

  test('E7: the host is handed the Accessible Name, and nothing when it is empty', async () => {
    const { graph, options } = await popupGraph([
      { id: 'named', parameters: { accessibleName: 'Unsaved changes' } },
      { id: 'unnamed', parameters: { stackPolicy: 'stack' } }
    ]);
    await open(graph, 'named');
    await open(graph, 'unnamed');

    expect(options[0]).toEqual({ accessibleName: 'Unsaved changes', modal: true });
    // Undefined, not '': the host names an unnamed popup from its heading, and an empty string
    // would read as "the author chose no name".
    expect(options[1]).toEqual({ accessibleName: undefined, modal: true });
  });

  test('E9: Modal off — the host is told, and Escape does not take a toast', async () => {
    const { graph, closed, options } = await popupGraph([{ id: 'toast', parameters: { modal: false } }]);
    await open(graph, 'toast');
    expect(options[0]).toEqual({ accessibleName: undefined, modal: false });

    expect(cancel(graph)).toBe(false);
    await popupFrames(graph);
    expect(closed).toHaveLength(0);
  });

  test('E10: a toast over a dialog does not shield the dialog from Escape', async () => {
    // AC7's shape: the toast prefab shows its toast `Show On Top`, so it can sit above a dialog.
    // Escape is aimed at the dialog — the toast is not what the person is dismissing.
    const { graph, shown, closed } = await popupGraph([
      { id: 'dialog', parameters: {} },
      { id: 'toast', parameters: { stackPolicy: 'stack', modal: false } }
    ]);
    await open(graph, 'dialog');
    await open(graph, 'toast');
    expect(shown).toHaveLength(2);

    expect(cancel(graph)).toBe(true);
    await popupFrames(graph);
    expect(closed.map((g) => g.id)).toEqual([shown[0].id]);
    expect(graph.signalsFor('dialog')).toContain('Cancelled');
  });

  test('E8 (control): the author\'s own Close Popup path still reports Closed, not Cancelled', async () => {
    const { graph, shown } = await popupGraph([{ id: 'popup', parameters: {} }]);
    await open(graph, 'popup');
    expect(shown).toHaveLength(1);

    // What `closepopup.ts` reaches by walking up: the handler published on the popup's instance.
    const stack = (graph.context as unknown as { popupStack: Array<{ group?: { children?: unknown[] } }> }).popupStack;
    expect(stack).toHaveLength(1);
    const popupNode = (
      stack[0].group as unknown as { children: Array<{ _popupCloseHandler(a?: string, r?: Params): void }> }
    ).children[0];
    popupNode._popupCloseHandler(undefined, {});
    await popupFrames(graph);

    expect(graph.signalsFor('popup')).toContain('Closed');
    expect(graph.signalsFor('popup')).not.toContain('Cancelled');
  });
});

