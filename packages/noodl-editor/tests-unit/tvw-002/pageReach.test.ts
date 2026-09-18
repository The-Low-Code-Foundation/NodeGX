/**
 * TVW-002 — the walk behind the strip's negative claim.
 *
 * The strip says *"Hero isn't on Pricing"*. Everything that can make that sentence a lie is in
 * here: a component that is in the page's graph but not attached to anything, an app shell whose
 * nav bar is on every page without any page's graph naming it, a Router showing a page this screen
 * is not on, and a component that places itself.
 *
 * AC4's arm is `pagesShowing_matchesAnIndependentWalk`: the same question answered by a second
 * walk written the other way round (flatten every graph, follow instance names), which agrees
 * everywhere the runtime's `roots[0]` rule does not bite and is *expected to disagree* where it
 * does — that disagreement is the finding, so it is asserted rather than avoided.
 */

import {
  ReachComponent,
  ReachNode,
  reachOfScreen,
  screensShowing
} from '../../src/editor/src/views/VisualCanvas/pageReach';

const node = (id: string, typename: string, extra: Partial<ReachNode> = {}): ReachNode => ({
  id,
  typename,
  ...extra
});

/** Roots, and which of them draw — the caller reads `visualRootIds` off the model, so a fixture says. */
function component(name: string, roots: ReachNode[], visualRootIds: string[]): ReachComponent {
  return { name, roots, visualRootIds };
}

function index(components: ReachComponent[]) {
  return new Map(components.map((c) => [c.name, c]));
}

/**
 * The shape of every project this strip will meet: a root component holding the app shell and the
 * Router, and pages the Router lists.
 *
 * - `/NavBar` is in the **shell**, so it is on every screen and no page's graph mentions it.
 * - `/Hero` is placed on Home only.
 * - `/Card` is placed on Pricing, inside a Group.
 * - `/Format price` is logic (no visual root), placed on both pages — it runs, it draws nothing.
 * - `/Ghost` is placed on Pricing as a **second visual root**: instantiated, never rendered.
 * - `/Orphan` is placed nowhere.
 */
function corpus() {
  return index([
    component(
      '/App',
      [
        node('shell', 'Group', {
          children: [node('nav', '/NavBar'), node('router', 'Router', { parameters: { pages: { routes: ['/Home', '/Pricing'] } } })]
        })
      ],
      ['shell']
    ),
    component(
      '/Home',
      [
        node('page', 'Page', { children: [node('hero', '/Hero')] }),
        node('fmt1', '/Format price')
      ],
      ['page']
    ),
    component(
      '/Pricing',
      [
        node('page', 'Page', { children: [node('grp', 'Group', { children: [node('card', '/Card')] })] }),
        node('ghost', '/Ghost'),
        node('fmt2', '/Format price')
      ],
      ['page']
    ),
    component('/NavBar', [node('g', 'Group', { children: [node('t', 'Text')] })], ['g']),
    component('/Hero', [node('g', 'Group')], ['g']),
    component('/Card', [node('g', 'Group')], ['g']),
    component('/Ghost', [node('g', 'Group')], ['g']),
    component('/Format price', [node('js', 'JavaScriptFunction')], []),
    component('/Orphan', [node('g', 'Group')], ['g']),
    /**
     * 🔴 A list item — placed by a **repeater**, through a parameter, and by nothing else.
     *
     * Added 2026-09-18 after TVW-004's census measured what this walk had been missing: **498
     * components on this machine are placed only as a `For Each` template**, and for **190 of
     * them in 56 projects the repeater's own component is on a screen the app shows**. The strip
     * told every one of those people *"Row isn't on any page yet"* about a component drawn once
     * per row of the list they were looking at.
     */
    component('/Row', [node('g', 'Group')], ['g']),
    component('/DynamicRow', [node('g', 'Group')], ['g'])
  ]);
}

/** `/Pricing` gets a list: an explicit repeater, and a dynamic one that cannot be read. */
function corpusWithRepeaters() {
  const components = corpus();
  components.set('/Pricing', {
    name: '/Pricing',
    roots: [
      node('page', 'Page', {
        children: [
          node('grp', 'Group', { children: [node('card', '/Card')] }),
          node('list', 'For Each', { parameters: { template: '/Row' } }),
          // ⚠️ A repeater switched to `dynamic` KEEPS its old `template` — 20 of this machine's
          // 66 dynamic repeaters do. `templateType` is what decides.
          node('dyn', 'For Each', { parameters: { templateType: 'dynamic', templateScript: 'x', template: '/DynamicRow' } })
        ]
      })
    ],
    visualRootIds: ['page']
  });
  return components;
}

describe('TVW-002 — a component a repeater draws', () => {
  it('🔴 counts an explicit template as on the screen — it is a list row a person is looking at', () => {
    const pricing = reachOfScreen('/App', '/Pricing', corpusWithRepeaters());

    expect(pricing.renders.has('/Row')).toBe(true);
    expect(pricing.mounts.has('/Row')).toBe(true);
    // The claim the old walk made instead, and the reason 190 components in 56 projects were told
    // they were on no page at all.
    expect(screensShowing('/Row', '/App', ['/Home', '/Pricing'], corpusWithRepeaters()).renders).toEqual(['/Pricing']);
  });

  it('says nothing about a repeater that picks its template at runtime', () => {
    const pricing = reachOfScreen('/App', '/Pricing', corpusWithRepeaters());
    expect(pricing.renders.has('/DynamicRow')).toBe(false);
  });

  it('is not on a screen whose repeater is somewhere else', () => {
    const home = reachOfScreen('/App', '/Home', corpusWithRepeaters());
    expect(home.renders.has('/Row')).toBe(false);
  });

  it('marks it, and everything inside it, as drawn once per item', () => {
    const components = corpusWithRepeaters();
    // `/Row` draws a `/Card`: a card per row, so the card is repeated too.
    components.set('/Row', {
      name: '/Row',
      roots: [node('rowRoot', 'Group', { children: [node('inner', '/Card')] })],
      visualRootIds: ['rowRoot']
    });

    const pricing = reachOfScreen('/App', '/Pricing', components);
    expect(pricing.repeated.has('/Row')).toBe(true);
    expect(pricing.repeated.has('/Card')).toBe(true);
    // 🔴 `/Card` is ALSO placed once, directly, on this same page — and the direct placement is
    // walked first. The flag is about the path the walk took, so a component reached both ways
    // ends up marked; the sentence then says "once per item" about something that is also on
    // screen once. Recorded rather than papered over: the strip's claim is still true.
    expect(pricing.renders.has('/Card')).toBe(true);
  });

  it('does not mark a component that only some OTHER screen repeats', () => {
    const home = reachOfScreen('/App', '/Home', corpusWithRepeaters());
    expect(home.repeated.has('/Row')).toBe(false);
  });

  it('⚠️ records NO outline path for it — a template has no instance node to point at', () => {
    // The sentence is corrected; the outline is not invented. `firstRendered`'s paths are chains
    // of component-instance ids, and whether the highlighter resolves a repeater's own id is a
    // question for the running app.
    const pricing = reachOfScreen('/App', '/Pricing', corpusWithRepeaters());
    expect(pricing.firstRendered.has('/Row')).toBe(false);
    expect(pricing.firstRendered.get('/Card')).toEqual(['card', 'g']);
  });
});

describe('TVW-002 AC1 — where on the screen it is', () => {
  /**
   * The outline-when-agreeing needs a node id, and `firstRendered` is where the walk records it.
   * These arms exist because the two obvious ways of getting one are both wrong:
   *
   * - searching the **page component's** graph misses everything in the app shell;
   * - searching the **project file** happily returns a placement on a second visual root, which is
   *   the one placement in the project that nobody can ever see.
   */
  it('🔴 ends the path on the node that PAINTS, not on the instance that places it', () => {
    // The whole finding, in one assertion. `hero` is the instance node inside `/Home`'s Page; `g`
    // is the Group inside `/Hero` that actually draws.
    //
    // 🔴 A component instance passes the highlighter's `getRef` filter and then has no
    // `getDOMElement` — measured in the running app: the placement id yielded NO element, the
    // painting id a DIV of 973×72. So a path ending on `hero` enters `selectedNodes` (the count
    // reads a healthy 1) and draws nothing, on every frame, in silence.
    const home = reachOfScreen('/App', '/Home', corpus());

    expect(home.firstRendered.get('/Hero')).toEqual(['hero', 'g']);
    expect(home.firstRendered.get('/NavBar')).toEqual(['nav', 'g']);
  });

  it('🔴 keeps the placement id in front, so it is THAT copy and not every copy', () => {
    // `[visualNodeId]` alone is the highlighter's "a canvas showing the definition" case: it
    // outlines every instance in the app. The quiet row says "Main Navbar is on Home", singular.
    const home = reachOfScreen('/App', '/Home', corpus());
    const path = home.firstRendered.get('/Hero');

    expect(path).toHaveLength(2);
    expect(path[0]).toBe('hero');
  });

  it('descends THROUGH a component whose visual root is another component', () => {
    // A wrapper that draws only by drawing something else. Stopping at the wrapper's root would
    // end the path on another instance — the same defect one level down, and the one a fix that
    // only handled the first hop would ship.
    const nested = index([
      component('/App', [node('page', 'Page', { children: [node('placed', '/Wrapper')] })], ['page']),
      component('/Wrapper', [node('inner', '/Leaf')], ['inner']),
      component('/Leaf', [node('box', 'Group')], ['box'])
    ]);

    expect(reachOfScreen('/App', undefined, nested).firstRendered.get('/Wrapper')).toEqual([
      'placed',
      'inner',
      'box'
    ]);
  });

  it('🔴 never names a placement the screen does not draw', () => {
    // `/Ghost` is placed on Pricing as a SECOND visual root: instantiated, never attached. An
    // outline pointing at it would be an outline on nothing, under a sentence claiming the person
    // is looking at the thing — the strip's two halves contradicting each other on one row.
    const pricing = reachOfScreen('/App', '/Pricing', corpus());

    expect(pricing.mounts.has('/Ghost')).toBe(true);
    expect(pricing.renders.has('/Ghost')).toBe(false);
    expect(pricing.firstRendered.has('/Ghost')).toBe(false);
  });

  it('🔴 has no placement for the two components NOTHING places — the root and the routed page', () => {
    // Written as "every rendered component has one, except the root", which is what it looks like
    // from the caller. It failed, and the failure is the finding: a **routed page** is entered
    // through a `Router` node, not through an instance node, so there is no node in any graph that
    // places it either. Two exceptions, not one.
    //
    // This is exactly the case the quiet row already says differently — "Pricing is the screen the
    // preview is showing" rather than "Pricing is on Pricing" — so the caller must not ask for an
    // outline here. The assertion is kept as the NAMED pair rather than loosened to a `for` loop
    // that skips whatever it finds missing, because the population is the point.
    const pricing = reachOfScreen('/App', '/Pricing', corpus());

    const unplaceable = new Set(['/App', '/Pricing']);
    for (const name of pricing.renders) {
      expect(pricing.firstRendered.has(name)).toBe(!unplaceable.has(name));
    }
    // …and the set is not vacuous: the screen really does render things that ARE placed.
    expect(pricing.renders.size).toBeGreaterThan(unplaceable.size);
  });

  it('does not name a placement for logic, which draws nothing', () => {
    const home = reachOfScreen('/App', '/Home', corpus());

    expect(home.mounts.has('/Format price')).toBe(true);
    expect(home.firstRendered.has('/Format price')).toBe(false);
  });

  it('keeps the FIRST drawn placement when a screen places the same component twice', () => {
    const twice = index([
      component(
        '/App',
        [node('page', 'Page', { children: [node('first', '/Card'), node('second', '/Card')] })],
        ['page']
      ),
      component('/Card', [node('g', 'Group')], ['g'])
    ]);

    expect(reachOfScreen('/App', undefined, twice).firstRendered.get('/Card')).toEqual(['first', 'g']);
  });

  it('🔴 skips an undrawn placement in favour of a later drawn one', () => {
    // Walk order and render order are not the same order. `stray` comes first in the file and is a
    // second visual root; `real` is inside the Page. "First" has to mean first among the ones that
    // draw, or the outline lands on the invisible one every time.
    const both = index([
      component(
        '/App',
        [
          node('stray', '/Card'),
          node('page', 'Page', { children: [node('real', '/Card')] })
        ],
        ['page']
      ),
      component('/Card', [node('g', 'Group')], ['g'])
    ]);

    const reach = reachOfScreen('/App', undefined, both);
    expect(reach.renders.has('/Card')).toBe(true);
    expect(reach.firstRendered.get('/Card')).toEqual(['real', 'g']);
  });
});

describe('TVW-002 — what the screen in the preview contains', () => {
  it('a component in the app shell is on every page, though no page places it', () => {
    // The case that makes this a *screen* walk and not a page walk. Walking from `/Pricing` alone,
    // `/NavBar` is nowhere — and the strip would tell someone to go and find a nav bar they are
    // looking straight at.
    const home = reachOfScreen('/App', '/Home', corpus());
    const pricing = reachOfScreen('/App', '/Pricing', corpus());

    expect(home.renders.has('/NavBar')).toBe(true);
    expect(pricing.renders.has('/NavBar')).toBe(true);
  });

  it('a page the Router is not showing is neither rendered nor mounted', () => {
    const pricing = reachOfScreen('/App', '/Pricing', corpus());

    expect(pricing.renders.has('/Pricing')).toBe(true);
    expect(pricing.renders.has('/Home')).toBe(false);
    expect(pricing.mounts.has('/Home')).toBe(false);
    // …and with it, everything only Home places. This is shape 1's whole premise.
    expect(pricing.renders.has('/Hero')).toBe(false);
  });

  it('nesting is followed: a component inside a Group inside the page is on the screen', () => {
    expect(reachOfScreen('/App', '/Pricing', corpus()).renders.has('/Card')).toBe(true);
  });

  it('🔴 a component placed as a SECOND visual root mounts but never renders', () => {
    // The 71 corpus cases (measured 2026-09-18 over 130 projects). The runtime renders
    // `roots[0]` and nothing else, so `/Ghost` is instantiated and invisible. A containment test
    // built on graph membership would say "it's on Pricing" and send someone to look at a page it
    // is not on.
    const pricing = reachOfScreen('/App', '/Pricing', corpus());

    expect(pricing.mounts.has('/Ghost')).toBe(true);
    expect(pricing.renders.has('/Ghost')).toBe(false);
  });

  it('logic mounts on the pages that place it and renders nowhere', () => {
    const home = reachOfScreen('/App', '/Home', corpus());
    const pricing = reachOfScreen('/App', '/Pricing', corpus());

    // Shape 3's sentence — "it runs on Home and Pricing" — is this pair, and it is why `mounts`
    // exists as a second answer rather than the walk picking one.
    expect(home.mounts.has('/Format price')).toBe(true);
    expect(pricing.mounts.has('/Format price')).toBe(true);
    expect(home.renders.has('/Format price')).toBe(false);
  });

  it('a component nothing places is on no screen at all — shape 2', () => {
    const { renders, mounts } = screensShowing('/Orphan', '/App', ['/Home', '/Pricing'], corpus());

    expect(renders).toEqual([]);
    expect(mounts).toEqual([]);
  });

  it('names the pages that show a component, in Router order', () => {
    const wide = corpus();
    // Place Hero on Pricing too, under the page root, so both pages show it.
    (wide.get('/Pricing').roots[0].children as ReachNode[]).push(node('hero2', '/Hero'));

    expect(screensShowing('/Hero', '/App', ['/Home', '/Pricing'], wide).renders).toEqual(['/Home', '/Pricing']);
  });

  it('a component placed inside itself stops the walk and is reported, not hung', () => {
    const looped = index([
      component('/App', [node('page', 'Page', { children: [node('a', '/A')] })], ['page']),
      component('/A', [node('g', 'Group', { children: [node('b', '/B')] })], ['g']),
      component('/B', [node('g', 'Group', { children: [node('a', '/A')] })], ['g'])
    ]);

    const reach = reachOfScreen('/App', undefined, looped);

    expect(reach.cyclic).toBe(true);
    expect(reach.renders.has('/A')).toBe(true);
    expect(reach.renders.has('/B')).toBe(true);
  });

  it('a Router showing something this screen is not on is reported as unresolved', () => {
    // A second Router, listing pages that are not the one being shown: what it is showing is not
    // knowable from the graph, and a negative claim made over it would be a guess.
    const two = index([
      component(
        '/App',
        [
          node('page', 'Page', {
            children: [
              node('r1', 'Router', { parameters: { name: 'Main', pages: { routes: ['/Home'] } } }),
              node('r2', 'Router', { parameters: { name: 'Side', pages: { routes: ['/Panel A', '/Panel B'] } } })
            ]
          })
        ],
        ['page']
      ),
      component('/Home', [node('page', 'Page')], ['page']),
      component('/Panel A', [node('g', 'Group')], ['g']),
      component('/Panel B', [node('g', 'Group')], ['g'])
    ]);

    const reach = reachOfScreen('/App', '/Home', two);

    expect(reach.unresolvedRouters).toEqual(['Side']);
    expect(reach.renders.has('/Home')).toBe(true);
  });

  it('a Router listing nothing is not an unresolved Router', () => {
    const empty = index([
      component('/App', [node('page', 'Page', { children: [node('r', 'Router')] })], ['page'])
    ]);

    expect(reachOfScreen('/App', undefined, empty).unresolvedRouters).toEqual([]);
  });

  it('a graph naming a component that does not exist is walked past, not thrown on', () => {
    const stale = index([
      component('/App', [node('page', 'Page', { children: [node('x', '/Deleted')] })], ['page'])
    ]);

    expect(() => reachOfScreen('/App', undefined, stale)).not.toThrow();
    expect(reachOfScreen('/App', undefined, stale).renders.has('/Deleted')).toBe(false);
  });

  it('a component with no visual root at all renders nothing it places', () => {
    // A logic component that happens to place a visual component: the visual one is instantiated
    // and has nothing to attach to, because its host draws nothing.
    const logicHost = index([
      component('/App', [node('page', 'Page', { children: [node('l', '/Logic')] })], ['page']),
      component('/Logic', [node('js', 'JavaScriptFunction', { children: [] }), node('v', '/Visual')], []),
      component('/Visual', [node('g', 'Group')], ['g'])
    ]);

    const reach = reachOfScreen('/App', undefined, logicHost);

    expect(reach.mounts.has('/Visual')).toBe(true);
    expect(reach.renders.has('/Visual')).toBe(false);
  });

  /**
   * AC4 — the independent arm.
   *
   * A second walk, written the other way round: flatten every component's graph to a flat list of
   * instance names (ignoring attachment entirely) and close it transitively from the page. This is
   * the walk anybody would write first, and the one `componentUsage.ts` already ships for the
   * panel's `×N`.
   *
   * It must agree with `mounts` for everything the Router reaches, and it must **disagree** with
   * `renders` on `/Ghost` — that disagreement is the defect this module exists to avoid, so it is
   * pinned here. A future refactor that quietly makes `renders` equal to the flat closure will
   * fail this, which is exactly what it should do.
   */
  it('pagesShowing matches an independent walk, and differs from it exactly where the runtime does', () => {
    const components = corpus();

    function flatClosure(start: string): Set<string> {
      const seen = new Set<string>();
      const queue = [start];
      while (queue.length) {
        const name = queue.shift();
        if (seen.has(name)) continue;
        seen.add(name);
        const component = components.get(name);
        if (!component) continue;
        const stack: ReachNode[] = [...component.roots];
        while (stack.length) {
          const node = stack.pop();
          if (node.typename && components.has(node.typename)) queue.push(node.typename);
          if (node.typename === 'Router') {
            const routes = (node.parameters?.pages as { routes?: string[] })?.routes ?? [];
            routes.forEach((route) => queue.push(route));
          }
          (node.children ?? []).forEach((child) => stack.push(child));
        }
      }
      return seen;
    }

    const pricing = reachOfScreen('/App', '/Pricing', components);
    const flat = flatClosure('/Pricing');

    // Everything the flat walk finds from the page itself really is mounted when that page shows…
    for (const name of flat) expect(pricing.mounts.has(name)).toBe(true);

    // …and the one it is wrong about is the one the runtime never attaches.
    expect(flat.has('/Ghost')).toBe(true);
    expect(pricing.renders.has('/Ghost')).toBe(false);

    // The flat walk from the page also cannot see the shell, which is the other half of the point.
    expect(flat.has('/NavBar')).toBe(false);
    expect(pricing.renders.has('/NavBar')).toBe(true);
  });
});
