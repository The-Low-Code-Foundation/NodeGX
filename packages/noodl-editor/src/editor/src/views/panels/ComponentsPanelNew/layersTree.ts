/**
 * TVW-004 — the rows of the Layers tab: the screen, expanded through every instance.
 *
 * The Components panel's existing tree is built from **names** (`useComponentsPanel.ts`); this one
 * is built from **graphs**, and the two must not share a builder (TVW-004 §5). What they do share
 * is the rule about what is actually on screen, and that rule is `pageReach.ts`'s — this module
 * imports its {@link ReachNode}/{@link ReachComponent} shapes and obeys the same two findings it
 * was written around, rather than opening a second walk that could drift:
 *
 * - **a component instance renders its first *visual* root and nothing else** (`componentinstance
 *   .render()` returns `roots[0].render()` over the exported `visualRoots`), so a second visual
 *   root is instantiated, runs, and is attached to nothing. 71 such placements exist in this
 *   machine's 130 projects. Layers draws what a person can see, so it descends the first visual
 *   root only;
 * - **a screen is not one component.** What the preview shows at `/pricing` is the *root* with its
 *   Router resolved to Pricing, so an app shell's nav bar is on Pricing even though Pricing's graph
 *   has never heard of it. The walk therefore starts at the root component and descends a Router
 *   into the page being shown — see {@link layersOfScreen}.
 *
 * Everything below `roots` is reached through `children[]`, and **a child is visual by
 * construction**: `ComponentModel.isCreatable` refuses a parent for a type whose `allowAsChild` is
 * false ("This node cannot be a child"). So logic is excluded by *where the walk goes*, not by a
 * type read — which matters, because `allowAsChild` reads stale until the node library has finished
 * loading and that has already filed 22 of 22 visual components under Logic once in this phase
 * ([[allowaschild-is-stale-until-the-node-library-loads]]). The one place a type answer is needed —
 * which root draws — is taken from the model's own `getVisualRootIds()`, exactly as `pageReach`
 * takes it, and for the same reason.
 *
 * Pure: no React, no editor singletons, no `ProjectModel`. The adapter that feeds it lives with the
 * hook. Graded in `tests-unit/tvw-004`.
 *
 * @module noodl-editor/views/panels/ComponentsPanelNew/layersTree
 */

import type { ReachComponent, ReachNode } from '../../VisualCanvas/pageReach';

/** A node as Layers needs it: `pageReach`'s three fields plus the label the row prints. */
export interface LayerNode extends ReachNode {
  /**
   * What the canvas card says — `NodeGraphNode.label`, which is the author's own label when there
   * is one and `type.labelForNode(node)` otherwise. Taken as a field rather than re-derived: the
   * fallback consults `usePortAsLabel` on a *resolved* type, and this module does not read types.
   */
  label?: string;
  /**
   * The canvas category this node is painted with — `node.type.color`, normalised by the adapter to
   * the set `CanvasTheme` knows. Rows colour their glyph from it through the same
   * `--theme-color-node-category-*` token, so a row and its card cannot disagree (TVW-004 §2, and
   * `componentKind.ts`'s standing rule: no second palette).
   */
  category?: string;
  children?: readonly LayerNode[];
}

export interface LayerComponent extends ReachComponent {
  roots: readonly LayerNode[];
}

export type LayersIndex = ReadonlyMap<string, LayerComponent>;

/**
 * What a row is. The tree is returned **flat with a depth**, not nested, because the list is
 * virtualised above 200 rows (§2) and because a nested shape would have to be re-flattened by the
 * one consumer that draws it.
 */
export type LayerRowKind =
  /** A visual node drawn by the graph of {@link LayerRow.owner}. */
  | 'node'
  /** A node whose type is a project component: the purple row with the diamond and `Edit ›`. */
  | 'instance'
  /** The `INSIDE SECTIONS/HERO` / `EDITING HERO` line that introduces an instance's own tree. */
  | 'band'
  /** A component placed inside itself: `↻ places itself`, and the walk stops (§4 AC4). */
  | 'cycle'
  /** A `Router` whose pages are not children of anything — see {@link ROUTER_PAGES_NOTE}. */
  | 'router-note';

export interface LayerRow {
  /**
   * Stable across a rebuild and unique in the list — the instance path joined, so the same
   * component placed twice yields two different keys for its insides.
   */
  key: string;
  kind: LayerRowKind;
  /** 0 for the screen's own outermost node; one per level of nesting *and* per band. */
  depth: number;
  label: string;
  /** The node's type name; `undefined` on a band and on the notes. */
  typename?: string;
  category: string;
  /** The component whose graph holds this node. What the tint is computed against (§2, AC3). */
  owner: string;
  /**
   * TVW-003's selection identity: the ids of the instance nodes that lead here, then the node's own
   * id. `selectNodesAtPath` wants exactly this — the last id addresses the element, the earlier ones
   * say *which* copy of it. A bare node id would light up every placement of the component, which is
   * the editor's selection semantics for a canvas showing a definition and not what a Layers row
   * means. See `pageReach`'s note on `firstRendered`, which learned it the expensive way.
   */
  path: string[];
  /** On an `instance` row and its `band`: the component being placed. */
  component?: string;
  /**
   * On an `instance` row placed by a repeater: the `For Each` that draws it once per item. The
   * count is a runtime fact this module cannot know, so the row says *how* it repeats, never `× n`
   * — see {@link REPEATED_BY}.
   */
  repeatedBy?: string;
  /** On a `band`: this is the component the canvas is editing, so it reads `EDITING X`. */
  editing?: boolean;
  /** True on every row whose {@link LayerRow.owner} is the canvas's component (§2, AC3's tint). */
  tinted: boolean;
}

export interface LayersTree {
  rows: LayerRow[];
  /** The page the rows describe — the Router's resolution, or the root when there is no Router. */
  screen: string | undefined;
  /** A cycle was found and drawn once. */
  cyclic: boolean;
  /**
   * Routers that list pages but not the one being shown. Their subtree is a note rather than a
   * guess: what they are showing is genuinely unknown to a static walk.
   */
  unresolvedRouters: string[];
}

const ROUTER_TYPE = 'Router';
const FOR_EACH_TYPE = 'For Each';

/** Same ceiling as `pageReach`'s walk: a screen is at most this many components deep. */
const MAX_DEPTH = 64;

/**
 * §5 — a Router's pages are reachable but they are not *children*, so expanding one shows nothing
 * unless the walk descended into the routed page. When it could not, the row says where they live
 * rather than drawing an empty branch that reads as "this page is empty".
 */
export const ROUTER_PAGES_NOTE = 'pages are in Components → Pages';

/** What a repeated instance's row says instead of a count it cannot have. One per repeater. */
export const REPEATED_BY = 'one per item';

export interface LayersOptions {
  /** The project's root/home component — what the viewer mounts. */
  root: string;
  /** The page the preview's route resolves to, or `undefined` when it resolves to nothing. */
  screenPage: string | undefined;
  /** The component the canvas is on, whose rows are tinted and whose band reads `EDITING`. */
  canvasComponent?: string;
  components: LayersIndex;
  /** How a component's name is shortened for a row — `benchTargetLabel` in the editor. */
  labelOf?: (componentName: string) => string;
}

/**
 * The rows of the screen: the root component, its Router resolved to `screenPage`, every instance
 * expanded.
 *
 * ⚠️ **Not memoised per component.** The same component reached twice is drawn twice, because the
 * two copies are two different things on screen and a person clicking one means that one. The cycle
 * guard is the walk stack, not a cache — the same distinction `pageReach` makes and for the same
 * reason.
 */
export function layersOfScreen(options: LayersOptions): LayersTree {
  const { root, screenPage, canvasComponent, components } = options;
  const labelOf = options.labelOf ?? defaultLabel;

  const rows: LayerRow[] = [];
  const tree: LayersTree = { rows, screen: undefined, cyclic: false, unresolvedRouters: [] };
  const onStack = new Set<string>();

  /** The instance ids that lead to where the walk currently is. */
  const trail: string[] = [];

  function push(row: LayerRow) {
    rows.push(row);
  }

  function keyFor(nodeId: string, suffix?: string): string {
    return [...trail, nodeId, suffix].filter(Boolean).join('/');
  }

  /**
   * Draw one component's rendered tree: its first visual root and everything below it.
   *
   * @param depth the row depth its outermost node gets.
   */
  function enterComponent(name: string, depth: number, callDepth: number) {
    const component = components.get(name);
    if (!component) return;

    const visual = new Set(component.visualRootIds);
    // 🔴 The first *visual* root by graph order, not `roots[0]`: a logic node authored above the
    // visual one is root 0 in the file and draws nothing.
    const first = component.roots.find((node) => visual.has(node.id));
    if (!first) return;

    visitNode(first, name, depth, callDepth);
  }

  function visitNode(node: LayerNode, owner: string, depth: number, callDepth: number) {
    const typename = node.typename;
    const placed = typename ? components.get(typename) : undefined;

    if (placed) {
      visitInstance(node, placed, owner, depth, callDepth);
      return;
    }

    push({
      key: keyFor(node.id),
      kind: 'node',
      depth,
      label: node.label || typename || 'Node',
      typename,
      category: node.category ?? 'visual',
      owner,
      path: [...trail, node.id],
      tinted: owner === canvasComponent
    });

    if (typename === ROUTER_TYPE) {
      visitRouter(node, depth + 1, callDepth);
      return;
    }

    for (const child of node.children ?? []) visitNode(child, owner, depth + 1, callDepth);

    if (typename === FOR_EACH_TYPE) visitRepeater(node, owner, depth + 1, callDepth);
  }

  /**
   * An instance: the purple row, then the band, then the component's own tree one level in again.
   *
   * ⚠️ The instance's **children** are drawn after its insides, at the instance's own depth + 1.
   * They are real — a child of an instance node is placed into the component's child root
   * (`componentinstance.getChildRoot`) — but they belong to the *placing* graph, so they keep that
   * graph as their owner and sit outside the band.
   */
  function visitInstance(node: LayerNode, placed: LayerComponent, owner: string, depth: number, callDepth: number) {
    const name = placed.name;
    const cyclic = onStack.has(name) || callDepth > MAX_DEPTH;

    push({
      key: keyFor(node.id),
      kind: 'instance',
      depth,
      label: node.label || labelOf(name),
      typename: name,
      category: node.category ?? 'component',
      owner,
      path: [...trail, node.id],
      component: name,
      tinted: owner === canvasComponent
    });

    if (cyclic) {
      tree.cyclic = true;
      push({
        key: keyFor(node.id, 'cycle'),
        kind: 'cycle',
        depth: depth + 1,
        label: '↻ places itself',
        category: 'component',
        owner,
        path: [...trail, node.id],
        component: name,
        tinted: owner === canvasComponent
      });
      return;
    }

    const editing = name === canvasComponent;
    push({
      key: keyFor(node.id, 'band'),
      kind: 'band',
      depth: depth + 1,
      label: editing ? `EDITING ${labelOf(name).toUpperCase()}` : `INSIDE ${labelOf(name).toUpperCase()}`,
      category: 'component',
      owner: name,
      path: [...trail, node.id],
      component: name,
      editing,
      tinted: editing
    });

    onStack.add(name);
    trail.push(node.id);
    enterComponent(name, depth + 2, callDepth + 1);
    trail.pop();
    onStack.delete(name);

    for (const child of node.children ?? []) visitNode(child, owner, depth + 1, callDepth);
  }

  /**
   * A `For Each` places its template through a **parameter**, not a child (§5). `templateScript`
   * chooses per item at runtime and is not readable here, so a dynamic repeater draws no band —
   * which is the honest answer, and the reason this row never claims a count.
   */
  function visitRepeater(node: LayerNode, owner: string, depth: number, callDepth: number) {
    const templateType = node.parameters?.templateType;
    if (templateType !== undefined && templateType !== 'explicit') return;

    const template = node.parameters?.template;
    if (typeof template !== 'string' || !template) return;

    const placed = components.get(template);
    if (!placed) return;

    const cyclic = onStack.has(template) || callDepth > MAX_DEPTH;

    push({
      key: keyFor(node.id, 'template'),
      kind: 'instance',
      depth,
      label: labelOf(template),
      typename: template,
      category: 'component',
      owner,
      // The repeater node itself is the only thing on screen to point at: the template has no
      // instance node of its own, so a path through one cannot be built.
      path: [...trail, node.id],
      component: template,
      repeatedBy: node.label || 'Repeater',
      tinted: owner === canvasComponent
    });

    if (cyclic) {
      tree.cyclic = true;
      push({
        key: keyFor(node.id, 'template-cycle'),
        kind: 'cycle',
        depth: depth + 1,
        label: '↻ places itself',
        category: 'component',
        owner,
        path: [...trail, node.id],
        component: template,
        tinted: owner === canvasComponent
      });
      return;
    }

    push({
      key: keyFor(node.id, 'template-band'),
      kind: 'band',
      depth: depth + 1,
      label:
        template === canvasComponent
          ? `EDITING ${labelOf(template).toUpperCase()}`
          : `INSIDE ${labelOf(template).toUpperCase()}`,
      category: 'component',
      owner: template,
      path: [...trail, node.id],
      component: template,
      editing: template === canvasComponent,
      tinted: template === canvasComponent
    });

    onStack.add(template);
    trail.push(node.id);
    enterComponent(template, depth + 2, callDepth + 1);
    trail.pop();
    onStack.delete(template);
  }

  function visitRouter(node: LayerNode, depth: number, callDepth: number) {
    const pages = node.parameters?.pages as { routes?: unknown } | undefined;
    const routes = Array.isArray(pages?.routes) ? pages.routes.filter((r): r is string => typeof r === 'string') : [];

    if (screenPage && routes.includes(screenPage)) {
      const editing = screenPage === canvasComponent;
      push({
        key: keyFor(node.id, 'page-band'),
        kind: 'band',
        depth,
        label: editing
          ? `EDITING ${labelOf(screenPage).toUpperCase()}`
          : `SHOWING ${labelOf(screenPage).toUpperCase()}`,
        category: 'component',
        owner: screenPage,
        path: [...trail, node.id],
        component: screenPage,
        editing,
        tinted: editing
      });

      onStack.add(screenPage);
      trail.push(node.id);
      enterComponent(screenPage, depth + 1, callDepth + 1);
      trail.pop();
      onStack.delete(screenPage);
      return;
    }

    if (routes.length > 0) {
      const name = (node.parameters?.name as string) || 'Main';
      if (!tree.unresolvedRouters.includes(name)) tree.unresolvedRouters.push(name);
    }

    push({
      key: keyFor(node.id, 'router-note'),
      kind: 'router-note',
      depth,
      label: ROUTER_PAGES_NOTE,
      category: 'default',
      owner: '',
      path: [...trail, node.id],
      tinted: false
    });
  }

  tree.screen = screenPage ?? root;
  enterComponent(root, 0, 0);
  return tree;
}

/** `/Sections/Hero` → `Hero`. The editor passes `benchTargetLabel`, which says the same thing. */
function defaultLabel(componentName: string): string {
  const parts = componentName.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? componentName;
}
