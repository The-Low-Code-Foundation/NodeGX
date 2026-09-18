/**
 * TVW-005 — what a drag in Layers is allowed to mean.
 *
 * Every row of the task's §2 table is here, and the two §5 landmines with it. The rows the planner
 * sees are **built by `layersOfScreen`**, not written by hand: the decision is about owners, bands
 * and parent chains, and a hand-written row list is free to be a shape the real tree never
 * produces — which is the failure `layersTree`'s own fixtures were rewritten to avoid
 * ([[a-budget-measured-on-a-fixture-is-a-budget-on-the-fixture]]).
 *
 * The one thing stubbed is legality: `canParent` stands for `ComponentModel.canCreateNode`, which
 * needs node types and a project. Refusing to stub it would mean no spec at all; stubbing it is
 * safe because the module's only job with it is to pass its message through untouched.
 */

import {
  bandRefusal,
  planComponentDrop,
  planKeyboardMove,
  planRowDrag,
  planTabHeaderDrop,
  screenRootRow,
  shortName,
  type Legality
} from '../../src/editor/src/views/panels/ComponentsPanelNew/layersDrag';
import {
  layersOfScreen,
  type LayerComponent,
  type LayerNode,
  type LayerRow
} from '../../src/editor/src/views/panels/ComponentsPanelNew/layersTree';

const node = (id: string, typename: string, extra: Partial<LayerNode> = {}): LayerNode => ({
  id,
  typename,
  ...extra
});

function component(name: string, roots: LayerNode[], visualRootIds: string[]): LayerComponent {
  return { name, roots, visualRootIds };
}

/**
 * The app in the task's own sentences: a shell with a nav bar and a Router, a Home page with a hero
 * and a work strip, and a Hero component whose insides belong to Hero.
 *
 * - `/App` owns the shell — on screen, and NOT the canvas's, so nothing in it can be dragged while
 *   the canvas is on Home. That is the band rule seen from above rather than from inside.
 * - `hero` and `work` are siblings under Home's `Page`: the reorder in AC1.
 * - `headline` is inside `/Hero`: the refusal in AC1.
 * - `strip` is a container of Home's own, so a reparent has somewhere legal to land.
 */
function app() {
  return new Map<string, LayerComponent>(
    [
      component(
        '/App',
        [
          node('shell', 'Group', {
            label: 'Shell',
            children: [
              node('nav', '/NavBar'),
              node('router', 'Router', { parameters: { pages: { routes: ['/Home'] } } })
            ]
          })
        ],
        ['shell']
      ),
      component('/NavBar', [node('navRoot', 'Group', { label: 'Bar', children: [node('logo', 'Text')] })], [
        'navRoot'
      ]),
      component(
        '/Home',
        [
          node('page', 'Page', {
            children: [
              node('hero', '/Hero'),
              node('strip', 'Group', { label: 'Work', children: [node('cardOne', 'Text', { label: 'One' })] }),
              node('footer', 'Group', { label: 'Footer' })
            ]
          })
        ],
        ['page']
      ),
      component('/Hero', [node('heroRoot', 'Group', { label: 'Hero root', children: [node('headline', 'Text')] })], [
        'heroRoot'
      ]),
      component('/Price Tag', [node('tagRoot', 'Group', { label: 'Tag' })], ['tagRoot']),
      component('/Format price', [node('fn', 'JavaScript Function')], [])
    ].map((c) => [c.name, c] as [string, LayerComponent])
  );
}

const CANVAS = '/Home';

function rowsOnHome(): LayerRow[] {
  return layersOfScreen({ root: '/App', screenPage: '/Home', canvasComponent: CANVAS, components: app() }).rows;
}

/** The row whose own node id is `id` — the identity the planner has to speak in. */
function rowFor(rows: LayerRow[], id: string): LayerRow {
  const found = rows.find((row) => row.path[row.path.length - 1] === id && row.kind !== 'band');
  if (!found) throw new Error(`no row for node ${id} — the fixture and the spec disagree`);
  return found;
}

const allowed: Legality = () => ({ ok: true });
const refused: Legality = () => ({ ok: false, message: 'This node cannot be a child of the selected node.' });

describe('TVW-005 layersDrag — reordering and reparenting from Layers', () => {
  it('plans a reorder as an anchor and a side, never as an index', () => {
    const rows = rowsOnHome();
    const plan = planRowDrag({
      rows,
      canvasComponent: CANVAS,
      sourceKey: rowFor(rows, 'strip').key,
      target: { key: rowFor(rows, 'hero').key, side: 'before' },
      canParent: allowed
    });

    // 🔴 The graph's `children[]` holds nodes the tree never draws, so an index computed from row
    // positions is right only until a logic node is parked under a visual one. The plan names the
    // sibling; the applier resolves it with `indexOf`.
    expect(plan).toEqual({
      kind: 'move',
      node: { id: 'strip', owner: '/Home' },
      parentId: 'page',
      anchor: 'hero',
      side: 'before',
      copy: false
    });
  });

  it('plans a reparent when a row is dropped ONTO a container', () => {
    const rows = rowsOnHome();
    const plan = planRowDrag({
      rows,
      canvasComponent: CANVAS,
      sourceKey: rowFor(rows, 'footer').key,
      target: { key: rowFor(rows, 'strip').key, side: 'inside' },
      canParent: allowed
    });

    expect(plan).toEqual({
      kind: 'move',
      node: { id: 'footer', owner: '/Home' },
      parentId: 'strip',
      anchor: null,
      side: 'end',
      copy: false
    });
  });

  it('refuses a row inside a band, and names the way in', () => {
    const rows = rowsOnHome();
    const plan = planRowDrag({
      rows,
      canvasComponent: CANVAS,
      sourceKey: rowFor(rows, 'headline').key,
      target: { key: rowFor(rows, 'strip').key, side: 'before' },
      canParent: allowed
    });

    expect(plan).toEqual({
      kind: 'refuse',
      reason: 'band',
      sentence: 'This is part of Hero — edit Hero to change it'
    });
  });

  it('refuses a row of the SHELL too — the band rule is about owners, not about depth', () => {
    const rows = rowsOnHome();
    // `shell` is on screen, drawn above the page, and belongs to `/App`. A rule written as "rows
    // below a band" would let this one through, because the shell is above every band there is.
    const plan = planRowDrag({
      rows,
      canvasComponent: CANVAS,
      sourceKey: rowFor(rows, 'shell').key,
      target: { key: rowFor(rows, 'strip').key, side: 'after' },
      canParent: allowed
    });

    expect(plan).toEqual({ kind: 'refuse', reason: 'band', sentence: bandRefusal('/App') });
  });

  it('refuses without a sentence when there is nothing a person did wrong', () => {
    const rows = rowsOnHome();
    // Into its own child: a no-op gesture, and the one way a drag can lose a subtree.
    const intoItself = planRowDrag({
      rows,
      canvasComponent: CANVAS,
      sourceKey: rowFor(rows, 'strip').key,
      target: { key: rowFor(rows, 'cardOne').key, side: 'inside' },
      canParent: allowed
    });
    expect(intoItself).toEqual({ kind: 'refuse', reason: 'into-itself', sentence: null });

    // A band row is a thing the tree says, not a thing the graph has.
    const band = rows.find((row) => row.kind === 'band');
    const dragBand = planRowDrag({
      rows,
      canvasComponent: CANVAS,
      sourceKey: band!.key,
      target: { key: rowFor(rows, 'strip').key, side: 'after' },
      canParent: allowed
    });
    expect(dragBand).toEqual({ kind: 'refuse', reason: 'not-a-node', sentence: null });
  });

  it('refuses an illegal reparent with the canvas own words, and no others', () => {
    const rows = rowsOnHome();
    const plan = planRowDrag({
      rows,
      canvasComponent: CANVAS,
      sourceKey: rowFor(rows, 'footer').key,
      target: { key: rowFor(rows, 'strip').key, side: 'inside' },
      canParent: refused
    });

    expect(plan).toEqual({
      kind: 'refuse',
      reason: 'illegal',
      sentence: 'This node cannot be a child of the selected node.'
    });
  });

  it("resolves a drop on a band's tail outward — the band's tail is not a slot (§5)", () => {
    const rows = rowsOnHome();
    // `headline` is the last row inside Hero's band, and the next row down is Home's own work
    // strip. The line between them is one a person will aim at, and it is two positions.
    const plan = planRowDrag({
      rows,
      canvasComponent: CANVAS,
      sourceKey: rowFor(rows, 'footer').key,
      target: { key: rowFor(rows, 'headline').key, side: 'after' },
      canParent: allowed
    });

    expect(plan).toEqual({
      kind: 'move',
      node: { id: 'footer', owner: '/Home' },
      parentId: 'page',
      anchor: 'hero',
      side: 'after',
      copy: false
    });
  });

  it('carries ⌥ through as a copy, the way the canvas does', () => {
    const rows = rowsOnHome();
    const plan = planRowDrag({
      rows,
      canvasComponent: CANVAS,
      sourceKey: rowFor(rows, 'strip').key,
      target: { key: rowFor(rows, 'hero').key, side: 'before' },
      copy: true,
      canParent: allowed
    });

    expect(plan.kind).toBe('move');
    expect((plan as { copy: boolean }).copy).toBe(true);
  });
});

describe('TVW-005 layersDrag — dragging a component in from the Components tab', () => {
  it('places a visual component beside the row it was dropped on', () => {
    const rows = rowsOnHome();
    const plan = planComponentDrop({
      rows,
      canvasComponent: CANVAS,
      target: { key: rowFor(rows, 'strip').key, side: 'after' },
      component: { name: '/Price Tag', kind: 'visual' },
      canParent: allowed
    });

    expect(plan).toEqual({
      kind: 'place',
      component: '/Price Tag',
      parentId: 'page',
      owner: '/Home',
      anchor: 'strip',
      side: 'after'
    });
  });

  it('refuses a page because of what a page IS, not because of where it was dropped', () => {
    const rows = rowsOnHome();
    const onARow = planComponentDrop({
      rows,
      canvasComponent: CANVAS,
      target: { key: rowFor(rows, 'strip').key, side: 'after' },
      component: { name: '/Pages/Checkout', kind: 'page' },
      canParent: allowed
    });
    const insideAContainer = planComponentDrop({
      rows,
      canvasComponent: CANVAS,
      target: { key: rowFor(rows, 'strip').key, side: 'inside' },
      component: { name: '/Pages/Checkout', kind: 'page' },
      canParent: allowed
    });

    // Same sentence from both positions: a person told "not here" tries somewhere else.
    expect(onARow).toEqual({
      kind: 'refuse',
      reason: 'page',
      sentence: 'Pages go in a Router, not on another page'
    });
    expect(insideAContainer).toEqual(onARow);
  });

  it('refuses a logic component by name, and says where it does go', () => {
    const rows = rowsOnHome();
    const plan = planComponentDrop({
      rows,
      canvasComponent: CANVAS,
      target: { key: rowFor(rows, 'strip').key, side: 'after' },
      component: { name: '/Format price', kind: 'component' },
      canParent: allowed
    });

    expect(plan).toEqual({
      kind: 'refuse',
      reason: 'no-screen',
      sentence: 'Format price has no screen. Drop it on the canvas.'
    });
  });

  it('refuses a drop inside a band', () => {
    const rows = rowsOnHome();
    const plan = planComponentDrop({
      rows,
      canvasComponent: CANVAS,
      target: { key: rowFor(rows, 'headline').key, side: 'inside' },
      component: { name: '/Price Tag', kind: 'visual' },
      canParent: allowed
    });

    expect(plan).toEqual({ kind: 'refuse', reason: 'band', sentence: bandRefusal('/Hero') });
  });
});

describe('TVW-005 layersDrag — the drop-target strip on the Layers tab header', () => {
  /**
   * 🔴 The measurement the next four cases rest on: **the first row of the tree is not the
   * canvas's**. The app shell is drawn above every band, so a strip that dropped into "the top of
   * the tree" would put the component in `/App` — on every page of the project at once, and in a
   * component the canvas is not showing, which is the one thing this phase exists to stop.
   */
  it('drops into the root of the component the CANVAS has open, which is not the top of the tree', () => {
    const rows = rowsOnHome();

    expect(rows[0].owner).toBe('/App');
    expect(screenRootRow(rows, CANVAS)?.path.slice(-1)[0]).toBe('page');
  });

  it('places at the END of that root — the position a drop with no row under it can honestly mean', () => {
    const rows = rowsOnHome();
    const plan = planTabHeaderDrop({
      rows,
      canvasComponent: CANVAS,
      component: { name: '/Price Tag', kind: 'visual' },
      canParent: allowed
    });

    expect(plan).toEqual({
      kind: 'place',
      component: '/Price Tag',
      parentId: 'page',
      owner: '/Home',
      anchor: null,
      side: 'end'
    });
  });

  /**
   * The canvas is on `/Hero` while the preview is showing Home, so every row `/Hero` owns is
   * *inside a band*. It is still the component being edited, and a component dropped on the strip
   * belongs to it — the band rule is about editing somebody else's file, and this is not that.
   */
  it('follows the canvas into a band, because the band is the thing being edited', () => {
    const rows = rowsOnHome();
    const plan = planTabHeaderDrop({
      rows,
      canvasComponent: '/Hero',
      component: { name: '/Price Tag', kind: 'visual' },
      canParent: allowed
    });

    expect(plan).toEqual({
      kind: 'place',
      component: '/Price Tag',
      parentId: 'heroRoot',
      owner: '/Hero',
      anchor: null,
      side: 'end'
    });
  });

  it('refuses a page and a logic component in the words the tree refuses them in', () => {
    const rows = rowsOnHome();
    const page = planTabHeaderDrop({
      rows,
      canvasComponent: CANVAS,
      component: { name: '/Pages/Checkout', kind: 'page' },
      canParent: allowed
    });
    const logic = planTabHeaderDrop({
      rows,
      canvasComponent: CANVAS,
      component: { name: '/Format price', kind: 'component' },
      canParent: allowed
    });

    // Not "the same shape" — the same sentences, asserted against the drop that already had them,
    // so a reworded refusal cannot end up meaning two things on two surfaces.
    expect(page).toEqual(
      planComponentDrop({
        rows,
        canvasComponent: CANVAS,
        target: { key: rowFor(rows, 'strip').key, side: 'after' },
        component: { name: '/Pages/Checkout', kind: 'page' },
        canParent: allowed
      })
    );
    expect(logic).toEqual({
      kind: 'refuse',
      reason: 'no-screen',
      sentence: 'Format price has no screen. Drop it on the canvas.'
    });
  });

  /**
   * The canvas is on a logic component: nothing it owns is on this screen, so there is no root to
   * drop into. A real state — it is exactly what TVW-002's strip is for — and the refusal names the
   * *destination*, which is why it has its own reason code.
   */
  it('refuses when the canvas component has no screen to put it on', () => {
    const rows = rowsOnHome();
    const plan = planTabHeaderDrop({
      rows,
      canvasComponent: '/Format price',
      component: { name: '/Price Tag', kind: 'visual' },
      canParent: allowed
    });

    expect(screenRootRow(rows, '/Format price')).toBeUndefined();
    expect(plan).toEqual({
      kind: 'refuse',
      reason: 'no-canvas-screen',
      sentence: 'Format price has no screen. Open a page to place it.'
    });
  });

  /**
   * ⚠️ The order of the two questions is load-bearing. A page dropped while the canvas is on a
   * logic component is refused *as a page* — tell someone the screen has no room for a thing that
   * could never go on a screen and they will go looking for a different screen.
   */
  it('asks what the thing IS before it asks where it would go', () => {
    const plan = planTabHeaderDrop({
      rows: rowsOnHome(),
      canvasComponent: '/Format price',
      component: { name: '/Pages/Checkout', kind: 'page' },
      canParent: allowed
    });

    expect(plan).toEqual({
      kind: 'refuse',
      reason: 'page',
      sentence: 'Pages go in a Router, not on another page'
    });
  });

  it('asks the canvas own legality rule about the root, and repeats its answer exactly', () => {
    const plan = planTabHeaderDrop({
      rows: rowsOnHome(),
      canvasComponent: CANVAS,
      component: { name: '/Price Tag', kind: 'visual' },
      canParent: refused
    });

    expect(plan).toEqual({
      kind: 'refuse',
      reason: 'illegal',
      sentence: 'This node cannot be a child of the selected node.'
    });
  });
});

describe('TVW-005 layersDrag — ⌥↑ and ⌥↓', () => {
  it('moves one step among the siblings the canvas owns', () => {
    const rows = rowsOnHome();
    const down = planKeyboardMove(rows, CANVAS, rowFor(rows, 'strip').key, 'down');
    const up = planKeyboardMove(rows, CANVAS, rowFor(rows, 'strip').key, 'up');

    expect(down).toEqual({
      kind: 'move',
      node: { id: 'strip', owner: '/Home' },
      parentId: 'page',
      anchor: 'footer',
      side: 'after',
      copy: false
    });
    expect(up).toEqual({
      kind: 'move',
      node: { id: 'strip', owner: '/Home' },
      parentId: 'page',
      anchor: 'hero',
      side: 'before',
      copy: false
    });
  });

  it('has nowhere to go at the ends, and nothing to move inside a band', () => {
    const rows = rowsOnHome();
    expect(planKeyboardMove(rows, CANVAS, rowFor(rows, 'hero').key, 'up')).toEqual({
      kind: 'refuse',
      reason: 'not-a-node',
      sentence: null
    });
    expect(planKeyboardMove(rows, CANVAS, rowFor(rows, 'headline').key, 'down')).toEqual({
      kind: 'refuse',
      reason: 'band',
      sentence: bandRefusal('/Hero')
    });
  });
});

describe('TVW-005 layersDrag — the words', () => {
  it('names a component the way a person does', () => {
    expect(shortName('/#Noodl Component System/Atoms/Layout/Limiter')).toBe('Limiter');
    expect(shortName('/Hero')).toBe('Hero');
    // A name that is already short survives, and an empty one is not allowed to become ''.
    expect(shortName('Hero')).toBe('Hero');
  });
});
