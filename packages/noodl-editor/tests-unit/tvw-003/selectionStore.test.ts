/**
 * TVW-003 AC2 — the store the canvas, the preview and Layers share.
 *
 * Three fake subscribers stand in for the three surfaces. What is graded is the contract every
 * later slice leans on: a write from one surface reaches the other two and not itself; a write
 * equal to what is already selected reaches nobody (or two surfaces echo forever); hover never
 * touches the selection; and a node inside an instance keeps the instance in its address.
 */

import type { ComponentModel } from '../../src/editor/src/models/componentmodel';
import {
  authoredPath,
  nodeIdOf,
  NodePath,
  Selection,
  SelectionSource,
  SelectionStore
} from '../../src/editor/src/models/selection/selectionStore';

const home = { name: '/Home' } as unknown as ComponentModel;
const hero = { name: '/Hero' } as unknown as ComponentModel;

function fakeSurface(store: SelectionStore, surface: SelectionSource) {
  const selections: Selection[] = [];
  const hovers: (NodePath | null)[] = [];
  const unsubscribe = store.subscribe({
    surface,
    onSelection: (selection) => selections.push(selection),
    onHover: (hover) => hovers.push(hover)
  });
  return { selections, hovers, unsubscribe };
}

function threeSurfaces() {
  const store = new SelectionStore();
  return {
    store,
    canvas: fakeSurface(store, 'canvas'),
    preview: fakeSurface(store, 'preview'),
    layers: fakeSurface(store, 'layers')
  };
}

describe('TVW-003 selection store', () => {
  it('starts with nothing selected and nothing hovered', () => {
    const store = new SelectionStore();
    expect(store.selection.component).toBeNull();
    expect(store.selection.nodes).toEqual([]);
    expect(store.hover).toBeNull();
  });

  it.each<SelectionSource>(['canvas', 'preview', 'layers'])(
    'a write from %s is read by the other two and not played back to it',
    (writer) => {
      const surfaces = threeSurfaces();
      surfaces.store.select(writer, hero, [['headline']]);

      for (const name of ['canvas', 'preview', 'layers'] as const) {
        const expected = name === writer ? 0 : 1;
        expect(surfaces[name].selections.length).toBe(expected);
      }
      expect(surfaces.store.selection.source).toBe(writer);
      expect(surfaces.store.selection.nodes).toEqual([['headline']]);
    }
  );

  it('a write equal to the current value notifies nobody, whoever writes it', () => {
    const { store, canvas, preview, layers } = threeSurfaces();
    store.select('preview', hero, [['headline']]);
    const counts = () => [canvas.selections.length, preview.selections.length, layers.selections.length];
    expect(counts()).toEqual([1, 0, 1]);

    // The canvas applying what the preview selected writes it back: that is the echo, not a change.
    store.select('canvas', hero, [['headline']]);
    store.select('layers', hero, [['headline']]);
    expect(counts()).toEqual([1, 0, 1]);
  });

  it('a different component, node, node order or instance is a change', () => {
    const { store, preview } = threeSurfaces();
    store.select('canvas', hero, [['a'], ['b']]);
    store.select('canvas', home, [['a'], ['b']]);
    store.select('canvas', home, [['b'], ['a']]);
    store.select('canvas', home, [['b']]);
    store.select('canvas', home, [['card1', 'b']]);
    expect(preview.selections.length).toBe(5);
  });

  it('hover never clears or replaces the selection', () => {
    const { store, canvas, preview, layers } = threeSurfaces();
    store.select('canvas', hero, [['headline']]);
    const before = store.selection;

    store.setHover('canvas', ['eyebrow']);
    store.setHover('canvas', null);

    expect(store.selection).toBe(before);
    expect(preview.selections.length).toBe(1);
    expect(layers.selections.length).toBe(1);
    expect(canvas.hovers).toEqual([]);
    expect(preview.hovers).toEqual([['eyebrow'], null]);
    expect(layers.hovers).toEqual([['eyebrow'], null]);
  });

  it('an unchanged hover notifies nobody', () => {
    const { store, preview } = threeSurfaces();
    store.setHover('canvas', ['eyebrow']);
    store.setHover('layers', ['eyebrow']);
    store.setHover('canvas', null);
    store.setHover('canvas', []);
    expect(preview.hovers).toEqual([['eyebrow'], null]);
  });

  it('a node inside an instance keeps the instance in its address (AC3)', () => {
    const { store, canvas } = threeSurfaces();
    store.select('preview', home, [['card1', 'title']]);
    store.select('preview', home, [['card2', 'title']]);

    expect(canvas.selections.length).toBe(2);
    expect(store.selection.nodes).toEqual([['card2', 'title']]);
    // The canvas, showing the definition, highlights the same node for either card.
    expect(nodeIdOf(canvas.selections[0].nodes[0])).toBe('title');
    expect(nodeIdOf(canvas.selections[1].nodes[0])).toBe('title');
  });

  it('clearing nodes keeps the component', () => {
    const { store, preview } = threeSurfaces();
    store.select('canvas', hero, [['headline']]);
    store.clearNodes('canvas');
    expect(store.selection.component).toBe(hero);
    expect(store.selection.nodes).toEqual([]);
    expect(preview.selections.length).toBe(2);
  });

  it('drops empty paths, and a caller mutating its array afterwards changes nothing', () => {
    const { store } = threeSurfaces();
    const path = ['card2', 'title'];
    const nodes = [path, []];
    store.select('preview', home, nodes);
    path.push('oops');
    nodes.push(['other']);
    expect(store.selection.nodes).toEqual([['card2', 'title']]);
  });

  it('an unsubscribed surface hears nothing, and unsubscribing mid-notify skips no neighbour', () => {
    const store = new SelectionStore();
    const heard: string[] = [];
    const unsubscribeFirst = store.subscribe({
      surface: 'canvas',
      onSelection: () => {
        heard.push('canvas');
        unsubscribeFirst();
      }
    });
    store.subscribe({ surface: 'layers', onSelection: () => heard.push('layers') });

    store.select('preview', hero, [['a']]);
    store.select('preview', hero, [['b']]);
    expect(heard).toEqual(['canvas', 'layers', 'layers']);
  });
});

describe('authoredPath — what the store keeps of a preview click', () => {
  const authored = new Set(['homeHero', 'headline', 'card2', 'title']);
  const isAuthored = (id: string) => authored.has(id);

  it('drops a runtime instance (a router page guid) and keeps the authored instances in order', () => {
    expect(authoredPath(['page-guid', 'homeHero', 'headline'], isAuthored)).toEqual(['homeHero', 'headline']);
  });

  it('keeps the node itself even when the project cannot find it', () => {
    expect(authoredPath(['page-guid', 'row-guid', 'unsaved'], isAuthored)).toEqual(['unsaved']);
  });

  it('leaves a fully authored path as it was — AC3’s second card', () => {
    expect(authoredPath(['card2', 'title'], isAuthored)).toEqual(['card2', 'title']);
  });
});
