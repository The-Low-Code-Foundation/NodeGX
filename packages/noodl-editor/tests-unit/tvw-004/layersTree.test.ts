/**
 * TVW-004 — the rows of the Layers tab.
 *
 * Layers claims to be *what is on the screen*, so everything that can make that claim a lie is in
 * here: a component placed as a second visual root (instantiated, never attached), an app shell
 * whose nav bar is on every page without any page's graph naming it, a Router showing a page this
 * screen is not on, a repeater that places its template through a parameter rather than a child,
 * and a component that places itself.
 *
 * AC2's arm is `rowCount_matchesAnIndependentWalk`: the same tree counted by a second walk written
 * the other way round — flatten each component's rendered fragment, then splice — so a shared bug
 * has to be made twice to go unnoticed.
 */

import {
  layersOfScreen,
  LayerComponent,
  LayerNode,
  LayerRow,
  REPEATED_BY,
  ROUTER_PAGES_NOTE
} from '../../src/editor/src/views/panels/ComponentsPanelNew/layersTree';

const node = (id: string, typename: string, extra: Partial<LayerNode> = {}): LayerNode => ({
  id,
  typename,
  ...extra
});

function component(name: string, roots: LayerNode[], visualRootIds: string[]): LayerComponent {
  return { name, roots, visualRootIds };
}

function index(components: LayerComponent[]): Map<string, LayerComponent> {
  return new Map(components.map((c) => [c.name, c]));
}

/**
 * The shape of nearly every routed project on this machine: a root component holding the app shell
 * and the Router, and pages the Router lists.
 *
 * ⚠️ **The shell is the norm, not a corner.** Measured over the 117 projects with a readable
 * `project.json` (2026-09-18): of the 78 with a Router, **73 have a root that draws something
 * besides the Router** — median 2 rows, p90 21. A Layers tab built from the page component alone
 * would omit on-screen content in 94% of routed projects, which is the very disorientation the
 * phase exists to end.
 *
 * - `/NavBar` is in the **shell**: on every screen, named by no page's graph.
 * - `/Hero` is placed on Home, inside the Page.
 * - `/Card` is the repeater's template on Home — placed through a parameter, not a child.
 * - `/Ghost` is placed on Pricing as a **second visual root**: instantiated, never rendered.
 * - `/Format price` is logic — no visual root at all, so nothing in Layers.
 */
function corpus() {
  return index([
    component(
      '/App',
      [
        node('shell', 'Group', {
          label: 'Shell',
          children: [
            node('nav', '/NavBar'),
            node('router', 'Router', { parameters: { pages: { routes: ['/Home', '/Pricing'] } } })
          ]
        })
      ],
      ['shell']
    ),
    component('/NavBar', [node('navRoot', 'Group', { label: 'Bar', children: [node('logo', 'Text')] })], ['navRoot']),
    component(
      '/Home',
      [
        // 🔴 **The logic root is authored FIRST, deliberately.** `roots[0]` is not the root that
        // draws in **572 of this machine's 5039 components** (11%), so a fixture whose first root
        // happens to be the visual one grades `roots[0]` and `the first visual root` identically —
        // and a mutant that swapped them survived this spec until this fixture was fixed.
        node('fmt', '/Format price'),
        node('page', 'Page', {
          children: [
            node('hero', '/Hero'),
            node('list', 'For Each', { label: 'Cards', parameters: { template: '/Card' } })
          ]
        })
      ],
      ['page']
    ),
    component(
      '/Pricing',
      [node('pricePage', 'Page', { children: [node('table', 'Group', { label: 'Table' })] }), node('ghost', '/Ghost')],
      ['pricePage', 'ghost']
    ),
    component('/Hero', [node('heroRoot', 'Group', { label: 'Hero root', children: [node('headline', 'Text')] })], [
      'heroRoot'
    ]),
    component('/Card', [node('cardRoot', 'Group', { label: 'Card root' })], ['cardRoot']),
    component('/Ghost', [node('ghostRoot', 'Group', { label: 'Ghost root' })], ['ghostRoot']),
    component('/Format price', [node('fn', 'JavaScript Function')], [])
  ]);
}

const labels = (rows: LayerRow[]) => rows.map((r) => `${r.depth}:${r.kind}:${r.label}`);

describe('TVW-004 layersTree — the screen, expanded through instances', () => {
  it('draws the shell above the routed page, and the page under a band', () => {
    const tree = layersOfScreen({ root: '/App', screenPage: '/Home', components: corpus() });

    expect(labels(tree.rows).slice(0, 6)).toEqual([
      '0:node:Shell',
      '1:instance:NavBar',
      '2:band:INSIDE NAVBAR',
      '3:node:Bar',
      '4:node:Text',
      '1:node:Router'
    ]);
    // The page's own rows follow the Router, under a band naming what the Router resolved to.
    expect(labels(tree.rows)).toContain('2:band:SHOWING HOME');
    expect(tree.screen).toBe('/Home');
    expect(tree.unresolvedRouters).toEqual([]);
  });

  it('descends only the first visual root — a second one is never on screen', () => {
    const tree = layersOfScreen({ root: '/App', screenPage: '/Pricing', components: corpus() });

    // `/Ghost` is a root of `/Pricing` and `visualRootIds` says it draws, but `/Pricing` renders
    // `roots[0]` of its visual roots and nothing else.
    expect(labels(tree.rows)).toContain('4:node:Table');
    expect(tree.rows.some((r) => r.component === '/Ghost')).toBe(false);
  });

  it('leaves logic out of the tree entirely — it is not on screen', () => {
    const tree = layersOfScreen({ root: '/App', screenPage: '/Home', components: corpus() });

    expect(tree.rows.some((r) => r.component === '/Format price')).toBe(false);
    expect(tree.rows.some((r) => r.typename === 'JavaScript Function')).toBe(false);
  });

  it('draws a repeater template as an instance that says how it repeats, never how many', () => {
    const tree = layersOfScreen({ root: '/App', screenPage: '/Home', components: corpus() });

    const card = tree.rows.find((r) => r.component === '/Card');
    expect(card).toBeDefined();
    expect(card.kind).toBe('instance');
    // The count is a runtime fact about the data; a static walk that printed `× n` would be
    // inventing one. The repeater's own label is what the row names instead.
    expect(card.repeatedBy).toBe('Cards');
    expect(card.label).not.toMatch(/×/);
    expect(labels(tree.rows)).toContain(`${card.depth + 1}:band:INSIDE CARD`);
    expect(REPEATED_BY).toBe('one per item');
  });

  it('draws no template band for a repeater that chooses its template at runtime', () => {
    const components = corpus();
    const home = components.get('/Home');
    const page = home.roots[1];
    const list = page.children[1] as LayerNode;
    components.set('/Home', {
      ...home,
      roots: [
        home.roots[0],
        {
          ...page,
          children: [
            page.children[0],
            // ⚠️ **The stale `template` stays on the node.** Switching a repeater to `dynamic`
            // does not clear the parameter it used to read: 20 of the 66 dynamic repeaters on this
            // machine still carry one. A fixture that deleted it would grade the `typeof template`
            // guard instead of the `templateType` one, and a mutant that dropped the latter
            // survived until this fixture kept it.
            { ...list, parameters: { templateType: 'dynamic', templateScript: 'x', template: '/Card' } }
          ]
        }
      ]
    });

    const tree = layersOfScreen({ root: '/App', screenPage: '/Home', components });
    expect(tree.rows.some((r) => r.component === '/Card')).toBe(false);
    // The repeater itself is still on screen and still drawn.
    expect(tree.rows.some((r) => r.label === 'Cards')).toBe(true);
  });

  it('says where a Router keeps its pages when it is showing one this screen is not on', () => {
    const tree = layersOfScreen({ root: '/App', screenPage: undefined, components: corpus() });

    const note = tree.rows.find((r) => r.kind === 'router-note');
    expect(note.label).toBe(ROUTER_PAGES_NOTE);
    expect(tree.unresolvedRouters).toEqual(['Main']);
    // The shell is still the shell: the nav bar is on screen whatever the Router resolved to.
    expect(tree.rows.some((r) => r.component === '/NavBar')).toBe(true);
  });

  it('does not descend into a page its Router does not list', () => {
    // 8 projects on this machine have a Router the walk cannot resolve. A Router that descended
    // into whatever page it was handed would draw a screen nobody is looking at.
    const tree = layersOfScreen({ root: '/App', screenPage: '/Unrouted', components: corpus() });

    expect(tree.rows.some((r) => r.kind === 'router-note')).toBe(true);
    expect(tree.rows.some((r) => r.owner === '/Unrouted')).toBe(false);
    expect(tree.unresolvedRouters).toEqual(['Main']);
  });

  describe('the editing region (AC3)', () => {
    it('tints exactly the rows the canvas component owns, and names the band EDITING', () => {
      const tree = layersOfScreen({
        root: '/App',
        screenPage: '/Home',
        canvasComponent: '/Hero',
        components: corpus()
      });

      const tinted = tree.rows.filter((r) => r.tinted);
      expect(tinted.map((r) => r.label)).toEqual(['EDITING HERO', 'Hero root', 'Text']);
      expect(tree.rows.find((r) => r.kind === 'band' && r.component === '/Hero').editing).toBe(true);
      expect(tree.rows.find((r) => r.kind === 'band' && r.component === '/NavBar').editing).toBeFalsy();
    });

    it('tints both regions when the page places the same component twice', () => {
      const components = corpus();
      const home = components.get('/Home');
      const page = home.roots[1];
      components.set('/Home', {
        ...home,
        roots: [home.roots[0], { ...page, children: [...page.children, node('hero2', '/Hero')] }]
      });

      const tree = layersOfScreen({ root: '/App', screenPage: '/Home', canvasComponent: '/Hero', components });
      expect(tree.rows.filter((r) => r.kind === 'band' && r.editing)).toHaveLength(2);
      expect(tree.rows.filter((r) => r.tinted && r.label === 'Hero root')).toHaveLength(2);
    });

    it('tints nothing when the canvas is on the page itself', () => {
      const tree = layersOfScreen({
        root: '/App',
        screenPage: '/Home',
        canvasComponent: '/Home',
        components: corpus()
      });
      // The page's own rows are owned by `/Home`, so they tint; the shell's do not. §2: "when the
      // canvas's component *is* the page, nothing is tinted" applies to the *band*, which reads
      // EDITING rather than SHOWING, and to the shell above it.
      expect(tree.rows.filter((r) => r.tinted).every((r) => r.owner === '/Home')).toBe(true);
      expect(tree.rows.some((r) => r.label === 'EDITING HOME')).toBe(true);
    });
  });

  describe('selection identity', () => {
    it('gives the two copies of one component different paths, each ending on what paints', () => {
      const components = corpus();
      const home = components.get('/Home');
      const page = home.roots[1];
      components.set('/Home', {
        ...home,
        roots: [home.roots[0], { ...page, children: [...page.children, node('hero2', '/Hero')] }]
      });

      const tree = layersOfScreen({ root: '/App', screenPage: '/Home', components });
      const headlines = tree.rows.filter((r) => r.label === 'Text' && r.owner === '/Hero');
      expect(headlines).toHaveLength(2);
      expect(headlines[0].path).toEqual(['router', 'hero', 'headline']);
      expect(headlines[1].path).toEqual(['router', 'hero2', 'headline']);
      // 🔴 A bare node id is "every instance of it" in the editor's selection semantics, which is
      // not what a Layers row means. The leading ids are what say *which* copy.
      expect(headlines[0].path).not.toEqual(['headline']);
    });

    it('keys every row uniquely, so a rebuild does not collapse two rows into one', () => {
      // ⚠️ Asked of a page that places **one component twice**: in a tree where every component
      // appears once, a key built from the node id alone is unique too, and the spec would pass on
      // a build that loses the second copy the moment a real project places anything twice.
      const components = corpus();
      const home = components.get('/Home');
      const page = home.roots[1];
      components.set('/Home', {
        ...home,
        roots: [home.roots[0], { ...page, children: [...page.children, node('hero2', '/Hero')] }]
      });

      const tree = layersOfScreen({ root: '/App', screenPage: '/Home', components });
      expect(tree.rows.filter((r) => r.owner === '/Hero')).toHaveLength(6);
      expect(new Set(tree.rows.map((r) => r.key)).size).toBe(tree.rows.length);
    });
  });

  describe('a component that places itself (AC4)', () => {
    /** Illegal in the editor (`canCreateNode` refuses it) but representable in a file. */
    function cyclic() {
      const components = corpus();
      components.set('/Hero', {
        name: '/Hero',
        roots: [node('heroRoot', 'Group', { label: 'Hero root', children: [node('again', '/Hero')] })],
        visualRootIds: ['heroRoot']
      });
      return components;
    }

    it('draws it once, says so, and stops', () => {
      const tree = layersOfScreen({ root: '/App', screenPage: '/Home', components: cyclic() });

      expect(tree.cyclic).toBe(true);
      const cycles = tree.rows.filter((r) => r.kind === 'cycle');
      expect(cycles).toHaveLength(1);
      expect(cycles[0].label).toBe('↻ places itself');
      // One Hero band, not two: the second placement is the cycle row, not a second expansion.
      expect(tree.rows.filter((r) => r.kind === 'band' && r.component === '/Hero')).toHaveLength(1);
    });

    it('terminates on a two-step cycle as well', () => {
      const components = corpus();
      components.set('/Hero', {
        name: '/Hero',
        roots: [node('heroRoot', 'Group', { label: 'Hero root', children: [node('toCard', '/Card')] })],
        visualRootIds: ['heroRoot']
      });
      components.set('/Card', {
        name: '/Card',
        roots: [node('cardRoot', 'Group', { label: 'Card root', children: [node('backToHero', '/Hero')] })],
        visualRootIds: ['cardRoot']
      });

      const tree = layersOfScreen({ root: '/App', screenPage: '/Home', components });
      expect(tree.cyclic).toBe(true);
      expect(tree.rows.length).toBeLessThan(40);
    });
  });

  describe('AC2 — an independent walk agrees', () => {
    /**
     * The same tree counted the other way round: render each component's fragment into a flat list
     * of *nodes*, then splice each instance's list in where it was placed. No shared code with
     * `layersTree` beyond the fixture, so a mistake has to be made twice to survive.
     */
    function independentCount(root: string, page: string | undefined, components: Map<string, LayerComponent>): number {
      const seen: string[] = [];

      function fragment(name: string, stack: string[]): number {
        if (stack.includes(name)) return 1; // the cycle row
        const component = components.get(name);
        if (!component) return 0;
        const visual = component.roots.filter((r) => component.visualRootIds.includes(r.id));
        if (!visual.length) return 0;
        return count(visual[0], name, [...stack, name]);
      }

      function count(n: LayerNode, owner: string, stack: string[]): number {
        seen.push(n.id);
        let total = 1;
        if (n.typename === 'Router') {
          const routes = (n.parameters?.pages as { routes?: string[] })?.routes ?? [];
          if (page && routes.includes(page)) return total + 1 + fragment(page, stack);
          return total + 1; // the note
        }
        if (n.typename && components.has(n.typename)) {
          total += 1 + fragment(n.typename, stack); // the band, then the insides
        }
        for (const child of n.children ?? []) total += count(child, owner, stack);
        if (n.typename === 'For Each') {
          const template = n.parameters?.template;
          if (typeof template === 'string' && components.has(template)) total += 2 + fragment(template, stack);
        }
        return total;
      }

      return fragment(root, []);
    }

    it.each([
      ['/Home', '/App'],
      ['/Pricing', '/App'],
      [undefined, '/App']
    ])('agrees on the row count for %s', (page, root) => {
      const components = corpus();
      const tree = layersOfScreen({ root, screenPage: page as string | undefined, components });
      expect(tree.rows.length).toBe(independentCount(root, page as string | undefined, components));
    });
  });
});
