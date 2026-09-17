/**
 * TVW-003 — what the app's canvas does with a selection another surface wrote.
 *
 * AC1's first sentence is the case this exists for: the preview names the headline inside the
 * `Hero` instance, the canvas is on `Home`, and `Home`'s canvas has the instance but not the
 * headline. It must select the instance and stay on Home — not jump to Hero's definition, which is
 * what the preview click did before the store.
 */

import type { ComponentModel } from '../../src/editor/src/models/componentmodel';
import {
  elementOnCanvas,
  pathsOfCanvasSelection,
  resolveCanvasMove
} from '../../src/editor/src/models/selection/canvasSelection';
import { NodePath, Selection, SelectionStore } from '../../src/editor/src/models/selection/selectionStore';

const home = { name: '/Home' } as unknown as ComponentModel;
const hero = { name: '/Hero' } as unknown as ComponentModel;

/** Home places one Hero instance and a footer; Hero holds a headline and an eyebrow. */
const graphs = new Map<ComponentModel, string[]>([
  [home, ['heroInstance', 'footer']],
  [hero, ['headline', 'eyebrow']]
]);

function canvasOn(component: ComponentModel | null, selectedIds: string[] = []) {
  return {
    component,
    isOnCanvas: (id: string) => !!component && graphs.get(component).includes(id),
    selectedIds
  };
}

function selection(component: ComponentModel | null, nodes: NodePath[]): Selection {
  return { component, nodes, source: 'preview' };
}

describe('TVW-003 the canvas applying a selection', () => {
  it('selects the instance on Home when the preview names the headline inside it (AC1)', () => {
    const move = resolveCanvasMove(selection(hero, [['heroInstance', 'headline']]), canvasOn(home));
    expect(move).toEqual({ kind: 'select', nodeIds: ['heroInstance'] });
  });

  it('selects the headline itself when the canvas is already on Hero', () => {
    const move = resolveCanvasMove(selection(hero, [['heroInstance', 'headline']]), canvasOn(hero));
    expect(move).toEqual({ kind: 'select', nodeIds: ['headline'] });
  });

  it('moves to the component only when no element of the path is on this canvas', () => {
    const footerCanvas = { name: '/Footer' } as unknown as ComponentModel;
    graphs.set(footerCanvas, ['copyright']);

    const move = resolveCanvasMove(selection(hero, [['heroInstance', 'headline']]), canvasOn(footerCanvas));
    expect(move).toEqual({ kind: 'switch', component: hero, nodeId: 'headline' });
  });

  it('moves when a bare definition id is not on this canvas — the preview click as it was before the store', () => {
    const move = resolveCanvasMove(selection(hero, [['headline']]), canvasOn(home));
    expect(move).toEqual({ kind: 'switch', component: hero, nodeId: 'headline' });
  });

  it('prefers the innermost element when more than one is on the canvas', () => {
    expect(elementOnCanvas(['a', 'b', 'c'], (id) => id !== 'c')).toBe('b');
  });

  it('does nothing when the canvas already has exactly that selected', () => {
    const move = resolveCanvasMove(selection(hero, [['heroInstance', 'headline']]), canvasOn(home, ['heroInstance']));
    expect(move).toEqual({ kind: 'none' });
  });

  it('a component with no nodes switches to it, or clears nodes when already there', () => {
    expect(resolveCanvasMove(selection(hero, []), canvasOn(home, ['footer']))).toEqual({
      kind: 'switch',
      component: hero
    });
    expect(resolveCanvasMove(selection(home, []), canvasOn(home, ['footer']))).toEqual({ kind: 'clear' });
    expect(resolveCanvasMove(selection(home, []), canvasOn(home))).toEqual({ kind: 'none' });
  });

  it('switches when any one of several paths cannot be drawn here', () => {
    const move = resolveCanvasMove(selection(home, [['footer'], ['heroInstance', 'eyebrow'], ['stray']]), canvasOn(home));
    expect(move.kind).toBe('switch');
  });

  it('nothing selected anywhere moves nothing', () => {
    expect(resolveCanvasMove(selection(null, []), canvasOn(home, ['footer']))).toEqual({ kind: 'none' });
  });
});

describe('TVW-003 the canvas writing its selection', () => {
  it('writes one-element paths, so a canvas echo of a received selection equals it', () => {
    const store = new SelectionStore();
    const heard: Selection[] = [];
    store.subscribe({ surface: 'preview', onSelection: (s) => heard.push(s) });

    store.select('preview', hero, [['headline']]);
    store.select('canvas', hero, pathsOfCanvasSelection(['headline']));

    expect(heard).toEqual([]);
  });
});
