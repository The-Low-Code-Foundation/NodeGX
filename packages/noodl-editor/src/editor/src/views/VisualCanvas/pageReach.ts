/**
 * TVW-002 — what the page in the preview actually contains, and the two different answers to it.
 *
 * The strip's whole claim is a negative: *"Hero isn't on Pricing."* A negative about what a person
 * can see has to be computed from what the runtime renders, not from what the project file holds —
 * and in this codebase those are measurably not the same set.
 *
 * ───────────────────────────────────────────────────────────────────────────────
 * 🔴 A COMPONENT INSTANCE RENDERS ITS **FIRST VISUAL ROOT AND NOTHING ELSE.**
 *
 * `noodl-runtime/src/nodes/componentinstance.ts` `render()`:
 *
 *     if (this._internal.roots.length === 0) return null;
 *     return this._internal.roots[0].render();
 *
 * and those `roots` are the exported `visualRoots` — `NodeGraphModel.getVisualRootIds()`, the
 * parentless nodes whose type says `allowAsChild`. So:
 *
 * - a parentless **logic** node is instantiated and runs, and draws nothing;
 * - a parentless **visual** node that is not the first one is instantiated, runs, and is never
 *   attached to anything. It is invisible in the app, at any route.
 *
 * ⚠️ **That second case is not a corner.** Measured over the 130 projects on this machine
 * (2026-09-18): 525 page components hold 1504 project-component instances, and **592 of them sit
 * outside the page's `Page` root**. 521 of those are components with no visual root at all (logic,
 * which is shape 3's population) — but **71 are components that do draw**, placed as a second root
 * where the app will never show them. A containment test built on "is it somewhere in the page's
 * graph" would tell 71 people to go look at a page for something that is not on it.
 *
 * So this module answers two questions from one walk, and the strip picks per shape:
 *
 * - {@link PageReach.renders} — *can a person see it there.* Shapes 1 and 2 ("it's on Home",
 *   "nothing places it") are claims about the screen, so they use this.
 * - {@link PageReach.mounts} — *does it run there.* Shape 3's "it runs on Home and Pricing" is a
 *   claim about execution, and a logic component is never in `renders` by construction.
 *
 * ⚠️ **A screen is not one component.** What the preview shows at `/pricing` is the *root*
 * component with its Router resolved to Pricing — an app shell's nav bar is on Pricing even though
 * Pricing's graph has never heard of it. Walking from the page component alone would put a strip on
 * screen saying the nav bar is somewhere else while the person is looking straight at it. Hence
 * {@link reachOfScreen}, which starts at the root and descends a Router into the page being shown.
 *
 * Pure — no React, no editor singletons, no `ProjectModel`. The editor-side adapter that feeds it
 * lives beside it; the same shape `componentUsage.ts` uses, and for the same reason: the rule that
 * decides what a user is told is worth grading in plain Node. Graded in `tests-unit/tvw-002`.
 *
 * @module noodl-editor/views/VisualCanvas/pageReach
 */

/** The three fields of a node this walk reads. */
export interface ReachNode {
  id: string;
  /** The node's type name. For a component instance this is the component's legacy name. */
  typename?: string;
  children?: readonly ReachNode[];
  parameters?: Record<string, unknown>;
}

/** One component as this walk needs it — the graph's roots, and which of them draw. */
export interface ReachComponent {
  name: string;
  /** Every parentless node, in graph order — `NodeGraphModel.roots`. */
  roots: readonly ReachNode[];
  /**
   * The ids of the roots that draw — `NodeGraphModel.getVisualRootIds()`, in the same order.
   *
   * ⚠️ Read this from the model rather than deriving it from the type here, deliberately.
   * `isVisualRoot` consults `allowAsChild` on a *resolved* type and falls back to the file's
   * recorded `visualRoots` when the type is missing — and P93's own slice 2 drive found
   * `allowAsChild` reading stale until the node library has finished loading, which filed 22 of 22
   * visual components under Logic. A walk that re-derived it would inherit that timing bug.
   */
  visualRootIds: readonly string[];
}

export interface PageReach {
  /** Components an instance of which is attached to the rendered tree. What a person can see. */
  renders: Set<string>;
  /**
   * TVW-002 AC1 — for each component in {@link PageReach.renders}, the **path to the thing on
   * screen that the first drawn placement of it actually paints**, in walk order.
   *
   * This is what the preview outlines when the two surfaces agree: the strip says *"Hero is on
   * Pricing"* and this says **where**. Recorded in the same pass rather than by a second search,
   * because "first" has to mean first *by the walk that decided it renders at all* — a separate
   * search over the project file would happily return a placement sitting on a second visual root,
   * which is the one placement nobody can see (see this module's header).
   *
   * 🔴 **TWO rendered components have no entry, and it is not only the root.** Nothing *places* the
   * root — it is the screen. But nothing places a **routed page** either: it is entered through a
   * `Router` node rather than through an instance node, so no graph in the project holds a node
   * that puts it there. A caller that assumed `renders.has(x)` implied an entry would be wrong on
   * every page in every project. Graded in `tests-unit/tvw-002/pageReach.test.ts`.
   *
   * Both cases are ones the quiet strip row already words differently — *"Pricing is the screen the
   * preview is showing"*, not *"Pricing is on Pricing"* — so there is nothing to point at anyway.
   *
   * 🔴 **A PATH, AND THE LAST ID IS NOT THE PLACEMENT — measured in the running app.**
   *
   * The first build recorded the id of the node that *places* the component, which is the obvious
   * answer and draws nothing at all. Asked of the guest, for the same placement on the same screen:
   *
   *     placement id  →  found 1,  getRef ✅,  getDOMElement **absent**
   *     painting id   →  found 1,  getRef ✅,  getDOMElement → DIV 973×72 at (0,0)
   *
   * ⚠️ **And the first reading of that is a trap.** `getRef` is only the highlighter's *existence
   * filter* (`selectNodesAtPath`); the element it actually draws on comes from `getDOMElement()` in
   * `updateHighlights`. A component instance passes the filter — so `selectedNodes.size` goes to
   * **1**, and every count-based check reports a healthy selection — and then yields no element, so
   * the div is `remove()`d on the next frame. Nothing appears, nothing errors.
   *
   * 🔴 It is worse than silent: the highlighter's own note says a *selected* node whose element has
   * gone is never removed from `selectedNodes`, so it is revisited and its div `remove()`d on every
   * subsequent frame, for ever.
   *
   * **A count is the mechanism; a rect is the consequence.** The drive now reads the outline's
   * measured box, because `selected: 1` was true of the broken version too.
   *
   * TVW-003 had already learned the same shape in this phase: *"instance nodes have no DOM — drive
   * outlines on visual nodes"*. It was rediscovered here at full price because AC1 asked for "the
   * instance" and the instance is not a thing you can point at.
   *
   * So the path descends from the placement to the node that paints: the placement's id, then the
   * first **visual** root inside it, and again through any of those that are themselves component
   * instances. `[placementId, …, visualNodeId]` is what `selectNodesAtPath` wants — the last id
   * addresses the element, the earlier ones say **which** copy of it, via `pathAddresses`.
   *
   * ⚠️ Without the leading placement id, a component placed three times would light up all three:
   * a bare `[visualNodeId]` is "every instance", which is the editor's selection semantics for a
   * canvas showing a definition, and not what the quiet row is saying.
   */
  firstRendered: Map<string, string[]>;
  /** Components the screen instantiates at all, rendered or not. What runs. */
  mounts: Set<string>;
  /**
   * A component placed inside itself, directly or through a chain. Illegal but representable, and
   * the walk stops rather than hanging — see TVW-002 §5.
   */
  cyclic: boolean;
  /**
   * Routers the walk could not resolve: they list pages, but not the one being shown, so what they
   * are showing is unknown. A caller making a **negative** claim should soften it — "isn't on this
   * screen" is still true of what is drawn, but "it's on Home" may be a page this Router is already
   * showing somewhere on screen.
   */
  unresolvedRouters: string[];
}

const ROUTER_TYPE = 'Router';

/** A screen is at most this many components deep before the walk gives up. */
const MAX_DEPTH = 64;

export type ReachIndex = ReadonlyMap<string, ReachComponent>;

/**
 * What the screen shows, walking from `rootName` and resolving Routers to `pageName`.
 *
 * @param rootName the project's root/home component — the thing the viewer actually mounts.
 * @param pageName the page component the preview's current route resolves to, or `undefined` when
 *   the route resolves to nothing (then a Router descends nowhere and every Router is unresolved).
 */
export function reachOfScreen(rootName: string, pageName: string | undefined, components: ReachIndex): PageReach {
  const reach: PageReach = {
    renders: new Set(),
    mounts: new Set(),
    firstRendered: new Map<string, string[]>(),
    cyclic: false,
    unresolvedRouters: []
  };
  const onStack = new Set<string>();

  /**
   * @param rendered whether this component's own drawing is attached to something on screen. A
   *   component reached only through a Router the walk resolved is still rendered; one reached as a
   *   second root, or through such a component, is not.
   */
  function enterComponent(name: string, rendered: boolean, depth: number) {
    const component = components.get(name);
    if (!component) return;

    // The component itself is on the screen, not only the things it places — the root component and
    // the routed page are both things the canvas can be sitting on while the preview shows them.
    reach.mounts.add(name);
    if (rendered) reach.renders.add(name);

    if (onStack.has(name)) {
      reach.cyclic = true;
      return;
    }
    if (depth > MAX_DEPTH) {
      reach.cyclic = true;
      return;
    }

    // ⚠️ Not memoised on `name` alone. The same component can be reached twice, once attached and
    // once not, and the second visit is the one that would be dropped — leaving a component in
    // `renders` because of a path the app never draws. `onStack` is a cycle guard, not a cache.
    onStack.add(name);

    const visualRoots = new Set(component.visualRootIds);
    // 🔴 The first *visual* root, by graph order — `roots[0]` of the runtime's filtered list, not
    // `roots[0]` of the model's. A logic node authored above the visual one is root 0 in the file.
    const firstVisualRoot = component.roots.find((root) => visualRoots.has(root.id));

    for (const root of component.roots) {
      visitNode(root, rendered && root === firstVisualRoot, depth);
    }

    onStack.delete(name);
  }

  function visitNode(node: ReachNode, rendered: boolean, depth: number) {
    const typename = node.typename;

    if (typename === ROUTER_TYPE) {
      visitRouter(node, rendered, depth);
    } else if (typename && components.has(typename)) {
      // ⚠️ Recorded on the *instance node*, before descending, and only while `rendered` — the
      // first placement the walk reaches that is actually attached. Recording it inside
      // `enterComponent` instead would have nothing to record: that function knows the component
      // it is entering, not the node that placed it.
      if (rendered && !reach.firstRendered.has(typename)) {
        const path = drawnPath(node.id, typename);
        if (path) reach.firstRendered.set(typename, path);
      }
      enterComponent(typename, rendered, depth + 1);
    }

    // Children of a component instance are real: they are placed into the component's child-root
    // (`componentinstance.getChildRoot`), so they draw wherever it draws.
    for (const child of node.children ?? []) visitNode(child, rendered, depth);
  }

  function visitRouter(node: ReachNode, rendered: boolean, depth: number) {
    const pages = node.parameters?.pages as { routes?: unknown } | undefined;
    const routes = Array.isArray(pages?.routes) ? pages.routes.filter((r): r is string => typeof r === 'string') : [];

    // Every page a Router lists is *instantiated* only when it is routed to, so a page this Router
    // is not showing is neither rendered nor mounted — it is somewhere else, which is the entire
    // point of the strip.
    if (pageName && routes.includes(pageName)) {
      enterComponent(pageName, rendered, depth + 1);
      return;
    }

    if (routes.length > 0) {
      const name = (node.parameters?.name as string) || 'Main';
      if (!reach.unresolvedRouters.includes(name)) reach.unresolvedRouters.push(name);
    }
  }

  /**
   * From a placement down to the node that actually paints, following {@link PageReach.firstRendered}'s
   * rule: a component instance renders its first *visual* root and nothing else, so if that root is
   * itself an instance the descent continues.
   *
   * @returns `undefined` when nothing on this chain draws — which is a real answer, not a failure:
   *   a component with no visual root is logic, and logic is shape 3's population.
   */
  function drawnPath(placementId: string, componentName: string): string[] | undefined {
    const path = [placementId];
    let name = componentName;

    // Bounded by the same depth the walk uses. A component placed inside itself would otherwise
    // descend for ever here even though `enterComponent`'s `onStack` guard caught it — two
    // recursions, two cycle guards.
    for (let depth = 0; depth <= MAX_DEPTH; depth++) {
      const component = components.get(name);
      if (!component) return undefined;

      const visual = new Set(component.visualRootIds);
      const root = component.roots.find((candidate) => visual.has(candidate.id));
      if (!root) return undefined;

      path.push(root.id);

      // A root that is itself a component instance has no DOM either — keep going until the path
      // ends on something the highlighter can get a ref for.
      if (root.typename && components.has(root.typename)) {
        name = root.typename;
        continue;
      }

      return path;
    }

    return undefined;
  }

  enterComponent(rootName, true, 0);
  return reach;
}

/**
 * Which of `pageNames` show `target`, and which merely run it.
 *
 * One `reachOfScreen` per page: a page is a screen, and the answer for one says nothing about
 * another. Pages are returned in the order given, which is the order the Router lists them —
 * the same order the panel's `Pages` section draws, so the strip's "It's on Home" names the page
 * the person will look for first.
 */
export function screensShowing(
  target: string,
  rootName: string,
  pageNames: readonly string[],
  components: ReachIndex
): { renders: string[]; mounts: string[]; cyclic: boolean } {
  const renders: string[] = [];
  const mounts: string[] = [];
  let cyclic = false;

  for (const page of pageNames) {
    const reach = reachOfScreen(rootName, page, components);
    cyclic = cyclic || reach.cyclic;
    if (reach.renders.has(target)) renders.push(page);
    if (reach.mounts.has(target)) mounts.push(page);
  }

  return { renders, mounts, cyclic };
}
