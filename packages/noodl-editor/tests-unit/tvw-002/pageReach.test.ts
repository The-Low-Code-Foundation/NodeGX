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
    component('/Orphan', [node('g', 'Group')], ['g'])
  ]);
}

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
