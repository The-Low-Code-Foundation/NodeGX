/**
 * TVW-003 — the app's canvas bound to the store, against a fake canvas.
 *
 * The binding imports the editor by type only, so it loads in plain Node. The fake does what the
 * real canvas does at the seams the binding touches: `switchToComponent(c, { node })` clears and
 * selects that node, and every selection action settles by calling `onSelectionChanged`.
 *
 * The property graded hardest is the echo: the canvas applying the preview's
 * `[heroInstance, headline]` on Home can only select `heroInstance`, and must not write that back.
 */

import type { ComponentModel } from '../../src/editor/src/models/componentmodel';
import { Selection, SelectionStore } from '../../src/editor/src/models/selection/selectionStore';
import type { NodeGraphEditor } from '../../src/editor/src/views/nodegrapheditor';
import { bindSelectionStore } from '../../src/editor/src/views/nodegrapheditor/SelectionStoreBinding';

function component(name: string, nodeIds: string[]) {
  const nodes = new Map(nodeIds.map((id) => [id, { id }]));
  return { name, graph: { findNodeWithId: (id: string) => nodes.get(id) }, nodeIds } as unknown as ComponentModel & {
    nodeIds: string[];
  };
}

const home = component('/Home', ['heroInstance', 'footer']);
const hero = component('/Hero', ['headline', 'eyebrow']);

function fakeCanvas(start: typeof home) {
  const listeners: { event: string; fn: () => void; group: object }[] = [];
  const calls: string[] = [];

  const canvas = {
    readOnly: false,
    activeComponent: start,
    selected: [] as string[],
    selectionActions: { onSelectionChanged: undefined as undefined | (() => void) },
    selector: {
      get nodes() {
        return canvas.selected.map((id) => ({ model: { id } }));
      },
      select(views: { model: { id: string } }[]) {
        canvas.selected = views.map((v) => v.model.id);
      }
    },
    findNodeWithId(id: string) {
      return canvas.activeComponent.nodeIds.includes(id) ? { model: { id } } : undefined;
    },
    settle() {
      canvas.selectionActions.onSelectionChanged?.();
    },
    /** A person's click on the canvas. */
    click(id: string) {
      canvas.selected = [id];
      canvas.settle();
    },
    switchToComponent(to: typeof home, args?: { node?: { id: string }; pushHistory?: boolean }) {
      calls.push(`switch ${to.name} ${args?.node?.id ?? '-'}${args?.pushHistory ? ' +history' : ''}`);
      if (canvas.activeComponent !== to) {
        canvas.activeComponent = to;
        canvas.selected = [];
        canvas.settle();
        listeners.filter((l) => l.event === 'activeComponentChanged').forEach((l) => l.fn());
      }
      if (args?.node) canvas.click(args.node.id);
    },
    deselect() {
      calls.push('deselect');
      canvas.selected = [];
      canvas.settle();
    },
    clearSelection() {
      canvas.deselect();
    },
    repaint() {},
    on(event: string, fn: () => void, group: object) {
      listeners.push({ event, fn, group });
    },
    off(group: object) {
      for (let i = listeners.length - 1; i >= 0; i--) if (listeners[i].group === group) listeners.splice(i, 1);
    },
    calls,
    listeners
  };
  return canvas;
}

function bound(start = home) {
  const store = new SelectionStore();
  const canvas = fakeCanvas(start);
  const preview: Selection[] = [];
  const hovers: (readonly string[] | null)[] = [];
  store.subscribe({ surface: 'preview', onSelection: (s) => preview.push(s), onHover: (h) => hovers.push(h) });
  const editor = canvas as unknown as NodeGraphEditor;
  const unbind = bindSelectionStore(editor, store);
  return { store, canvas, editor, preview, hovers, unbind };
}

describe('TVW-003 the canvas bound to the store', () => {
  it('a click on the canvas is written as a one-element path in its component', () => {
    const { store, canvas, preview } = bound();
    canvas.click('footer');

    expect(preview).toHaveLength(1);
    expect(store.selection.component).toBe(home);
    expect(store.selection.nodes).toEqual([['footer']]);
    expect(store.selection.source).toBe('canvas');
  });

  it("applies the preview's instance path on Home without moving, and does not echo the lossy version", () => {
    const { store, canvas, preview } = bound();
    store.select('preview', hero, [['heroInstance', 'headline']]);

    expect(canvas.activeComponent).toBe(home);
    expect(canvas.selected).toEqual(['heroInstance']);
    expect(preview).toEqual([]);
    expect(store.selection.nodes).toEqual([['heroInstance', 'headline']]);
  });

  it('moves to the definition, with history, only when nothing on the path is on this canvas', () => {
    const { store, canvas, preview } = bound();
    store.select('preview', hero, [['headline']]);

    expect(canvas.calls).toContain('switch /Hero headline +history');
    expect(canvas.activeComponent).toBe(hero);
    expect(canvas.selected).toEqual(['headline']);
    expect(preview).toEqual([]);
  });

  it('writes again once applying is over — the next click is heard', () => {
    const { store, canvas, preview } = bound();
    store.select('preview', hero, [['heroInstance', 'headline']]);
    canvas.click('footer');

    expect(preview.map((s) => s.nodes)).toEqual([[['footer']]]);
  });

  it('a read-only canvas neither writes nor applies', () => {
    const { store, canvas, preview } = bound();
    canvas.readOnly = true;
    canvas.click('footer');
    store.select('panel', hero, [['headline']]);

    expect(preview).toHaveLength(1); // the panel's write only
    expect(canvas.activeComponent).toBe(home);
  });

  it('hovering a node tells the preview its one-element path, and moving off clears it', () => {
    const { store, editor, preview, hovers } = bound();
    editor.setPreviewHover('footer', true);
    editor.setPreviewHover('footer', true);
    editor.setPreviewHover('footer', false);

    expect(hovers).toEqual([['footer'], null]);
    expect(preview).toEqual([]);
    expect(store.hover).toBeNull();
  });

  it('hover never touches the selection', () => {
    const { store, canvas, editor } = bound();
    canvas.click('footer');
    editor.setPreviewHover('heroInstance', true);
    editor.setPreviewHover('heroInstance', false);

    expect(store.selection.nodes).toEqual([['footer']]);
  });

  it("leaving a node the pointer already left for another does not clear the other's outline", () => {
    const { store, editor, hovers } = bound();
    editor.setPreviewHover('footer', true);
    editor.setPreviewHover('heroInstance', true);
    editor.setPreviewHover('footer', false);

    expect(store.hover).toEqual(['heroInstance']);
    expect(hovers).toEqual([['footer'], ['heroInstance']]);
  });

  it('unbinding takes the hover writer away and clears an outline it left', () => {
    const { store, editor, hovers, unbind } = bound();
    editor.setPreviewHover('footer', true);
    unbind();

    expect(editor.setPreviewHover).toBeUndefined();
    expect(store.hover).toBeNull();
    expect(hovers).toEqual([['footer'], null]);
  });

  it('unbinding stops both directions and removes its listener', () => {
    const { store, canvas, preview, unbind } = bound();
    unbind();
    canvas.click('footer');
    store.select('panel', hero, [['headline']]);

    expect(preview).toHaveLength(1);
    expect(canvas.activeComponent).toBe(home);
    expect(canvas.listeners).toHaveLength(0);
    expect(canvas.selectionActions.onSelectionChanged).toBeUndefined();
  });
});
