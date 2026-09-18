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
  /** 0 for the screen's own outermost node; one per level of nesting. */
  depth: number;
  /**
   * The row this one is nested under — `undefined` at the top. What collapse is computed from:
   * a row is visible when every key on its parent chain is expanded.
   */
  parentKey?: string;
  /**
   * How far right the row is actually drawn, in levels — {@link MAX_INDENT_LEVEL} caps it.
   *
   * 🔴 **Not the same as `depth`, and that is Richard's ruling of 2026-09-18.** Measured over the
   * 47,494 rows on this machine: half sit **12+ levels deep** and **28% sit past 238px** at the
   * panel's existing 12px step — the whole width of a 240px panel, leaving no room for the name.
   * Structure keeps the true depth; the drawing stops stepping, and the indent guides carry the
   * rest.
   */
  indent: number;
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
 * Where the indent stops growing (Richard, 2026-09-18). Eight levels at the panel's step is 80px,
 * which leaves 160px for glyph and name at `MIN_PANEL_WIDTH`; the ninth level and everything below
 * it draw at the same offset, with the guides showing how deep they are.
 */
export const MAX_INDENT_LEVEL = 8;

/** The drawn offset for a true depth. Exported so the stylesheet's step has one arithmetic. */
export function indentFor(depth: number): number {
  return Math.min(depth, MAX_INDENT_LEVEL);
}

/**
 * §5 — a Router's pages are reachable but they are not *children*, so expanding one shows nothing
 * unless the walk descended into the routed page. When it could not, the row says where they live
 * rather than drawing an empty branch that reads as "this page is empty".
 */
export const ROUTER_PAGES_NOTE = 'pages are in Components → Pages';

/** What a repeated instance's row says instead of a count it cannot have. One per repeater. */
export const REPEATED_BY = 'one per item';

/** AC4 — what a component placed inside itself says, once, before the walk stops. */
export const CYCLE_ROW = '↻ places itself';

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
  /**
   * What a node's row says, when the caller can answer better than the node's own field.
   *
   * ⚠️ The editor passes a **guarded** read of `NodeGraphNode.label`, which is a getter that falls
   * through to `type.labelForNode(node)` — a call on a type that a failed module leaves
   * unresolved. A throw inside this walk would take the whole panel's React tree down, which is
   * the failure `componentKind.ts` already guards `ComponentModel.color` against.
   */
  labelOfNode?: (node: LayerNode) => string | undefined;
  /** The canvas category of a node — the editor passes a guarded read of `node.type.color`. */
  categoryOfNode?: (node: LayerNode) => string | undefined;
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
  const labelOfNode = options.labelOfNode ?? ((node: LayerNode) => node.label);
  const categoryOfNode = options.categoryOfNode ?? ((node: LayerNode) => node.category);

  const rows: LayerRow[] = [];
  const tree: LayersTree = { rows, screen: undefined, cyclic: false, unresolvedRouters: [] };
  const onStack = new Set<string>();

  /** The instance ids that lead to where the walk currently is. */
  const trail: string[] = [];

  function keyFor(nodeId: string, suffix?: string): string {
    return [...trail, nodeId, suffix].filter(Boolean).join('/');
  }

  /** Every row goes through here, so the drawn indent has exactly one arithmetic. */
  function push(row: Omit<LayerRow, 'indent'>): string {
    rows.push({ ...row, indent: indentFor(row.depth) });
    return row.key;
  }

  /**
   * Draw one component's rendered tree: its first visual root and everything below it.
   */
  function enterComponent(name: string, depth: number, parentKey: string | undefined, callDepth: number) {
    const component = components.get(name);
    if (!component) return;

    const visual = new Set(component.visualRootIds);
    // 🔴 The first *visual* root by graph order, not `roots[0]`: a logic node authored above the
    // visual one is root 0 in the file and draws nothing. It is `roots[0]` in 572 of this
    // machine's 5,039 components, which is why the spec's fixture authors one that way.
    const first = component.roots.find((node) => visual.has(node.id));
    if (!first) return;

    visitNode(first, name, depth, parentKey, callDepth);
  }

  function visitNode(node: LayerNode, owner: string, depth: number, parentKey: string | undefined, callDepth: number) {
    const typename = node.typename;
    const placed = typename ? components.get(typename) : undefined;

    if (placed) {
      visitInstance(node, placed, owner, depth, parentKey, callDepth);
      return;
    }

    const key = push({
      key: keyFor(node.id),
      kind: 'node',
      depth,
      parentKey,
      label: labelOfNode(node) || typename || 'Node',
      typename,
      category: categoryOfNode(node) ?? 'visual',
      owner,
      path: [...trail, node.id],
      tinted: owner === canvasComponent
    });

    if (typename === ROUTER_TYPE) {
      visitRouter(node, depth + 1, key, callDepth);
      return;
    }

    for (const child of node.children ?? []) visitNode(child, owner, depth + 1, key, callDepth);

    if (typename === FOR_EACH_TYPE) visitRepeater(node, owner, depth + 1, key, callDepth);
  }

  /**
   * An instance: the purple row, then the band, then the component's own tree.
   *
   * 🔴 **The band and the insides sit at the SAME depth** — one step per component boundary, not
   * two (Richard, 2026-09-18). A boundary used to cost two levels, which was p50 4 of a row's 12
   * and p90 10 of 26: a third of an indent that already ran off the panel. The band reads as a
   * heading over the rows it introduces rather than as their parent, which is what it is.
   *
   * ⚠️ The instance's **children** are drawn after its insides, at the instance's own depth + 1.
   * They are real — a child of an instance node is placed into the component's child root
   * (`componentinstance.getChildRoot`) — but they belong to the *placing* graph, so they keep that
   * graph as their owner and sit outside the band. 731 instances on this machine carry them.
   */
  function visitInstance(
    node: LayerNode,
    placed: LayerComponent,
    owner: string,
    depth: number,
    parentKey: string | undefined,
    callDepth: number
  ) {
    const name = placed.name;
    const cyclic = onStack.has(name) || callDepth > MAX_DEPTH;

    const key = push({
      key: keyFor(node.id),
      kind: 'instance',
      depth,
      parentKey,
      label: labelOfNode(node) || labelOf(name),
      typename: name,
      category: categoryOfNode(node) ?? 'component',
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
        parentKey: key,
        label: CYCLE_ROW,
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
      parentKey: key,
      label: bandLabel(editing ? 'EDITING' : 'INSIDE', name, labelOf),
      category: 'component',
      owner: name,
      path: [...trail, node.id],
      component: name,
      editing,
      tinted: editing
    });

    onStack.add(name);
    trail.push(node.id);
    enterComponent(name, depth + 1, key, callDepth + 1);
    trail.pop();
    onStack.delete(name);

    for (const child of node.children ?? []) visitNode(child, owner, depth + 1, key, callDepth);
  }

  /**
   * A `For Each` places its template through a **parameter**, not a child (§5). `templateScript`
   * chooses per item at runtime and is not readable here, so a dynamic repeater draws no band —
   * which is the honest answer, and the reason this row never claims a count.
   *
   * ⚠️ `templateType` is what decides, never the presence of `template`: **20 of this machine's 66
   * dynamic repeaters still carry a stale `template`** from before they were switched over.
   */
  function visitRepeater(node: LayerNode, owner: string, depth: number, parentKey: string, callDepth: number) {
    const templateType = node.parameters?.templateType;
    if (templateType !== undefined && templateType !== 'explicit') return;

    const template = node.parameters?.template;
    if (typeof template !== 'string' || !template) return;

    const placed = components.get(template);
    if (!placed) return;

    const cyclic = onStack.has(template) || callDepth > MAX_DEPTH;

    const key = push({
      key: keyFor(node.id, 'template'),
      kind: 'instance',
      depth,
      parentKey,
      label: labelOf(template),
      typename: template,
      category: 'component',
      owner,
      // The repeater node itself is the only thing on screen to point at: the template has no
      // instance node of its own, so a path through one cannot be built.
      path: [...trail, node.id],
      component: template,
      repeatedBy: labelOfNode(node) || 'Repeater',
      tinted: owner === canvasComponent
    });

    if (cyclic) {
      tree.cyclic = true;
      push({
        key: keyFor(node.id, 'template-cycle'),
        kind: 'cycle',
        depth: depth + 1,
        parentKey: key,
        label: CYCLE_ROW,
        category: 'component',
        owner,
        path: [...trail, node.id],
        component: template,
        tinted: owner === canvasComponent
      });
      return;
    }

    const editing = template === canvasComponent;
    push({
      key: keyFor(node.id, 'template-band'),
      kind: 'band',
      depth: depth + 1,
      parentKey: key,
      label: bandLabel(editing ? 'EDITING' : 'INSIDE', template, labelOf),
      category: 'component',
      owner: template,
      path: [...trail, node.id],
      component: template,
      editing,
      tinted: editing
    });

    onStack.add(template);
    trail.push(node.id);
    enterComponent(template, depth + 1, key, callDepth + 1);
    trail.pop();
    onStack.delete(template);
  }

  function visitRouter(node: LayerNode, depth: number, parentKey: string, callDepth: number) {
    const pages = node.parameters?.pages as { routes?: unknown } | undefined;
    const routes = Array.isArray(pages?.routes) ? pages.routes.filter((r): r is string => typeof r === 'string') : [];

    if (screenPage && routes.includes(screenPage)) {
      const editing = screenPage === canvasComponent;
      const key = push({
        key: keyFor(node.id, 'page-band'),
        kind: 'band',
        depth,
        parentKey,
        label: bandLabel(editing ? 'EDITING' : 'SHOWING', screenPage, labelOf),
        category: 'component',
        owner: screenPage,
        path: [...trail, node.id],
        component: screenPage,
        editing,
        tinted: editing
      });

      onStack.add(screenPage);
      trail.push(node.id);
      enterComponent(screenPage, depth, key, callDepth + 1);
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
      parentKey,
      label: ROUTER_PAGES_NOTE,
      category: 'default',
      owner: '',
      path: [...trail, node.id],
      tinted: false
    });
  }

  tree.screen = screenPage ?? root;
  enterComponent(root, 0, undefined, 0);

  /**
   * 🔴 **A TINT WITH NO BAND TO EXPLAIN IT IS THREE HIGHLIGHTED ROWS AND NO REASON.**
   *
   * Seen in the drive's screenshot, asked for by no arm: with the canvas on the **root**, the
   * shell's own rows tinted and nothing on screen said why — the root is entered by the walk
   * itself, not through an instance, so it has no band. §2 half-anticipated this ("when the
   * canvas's component *is* the page, nothing is tinted") but named the page, which under R-R is
   * now a **region with a band** and reads perfectly well tinted. The rule the spec was reaching
   * for is about the explanation, not about which component it is: **tint only what a band names.**
   *
   * A post-pass rather than a condition inside the walk, because "is there a band for it" is a
   * fact about the finished list — the band for a component can be emitted after rows it owns.
   */
  if (!rows.some((row) => row.kind === 'band' && row.editing)) {
    for (const row of rows) row.tinted = false;
  }

  return tree;
}

/** `INSIDE SECTIONS/HERO` — the word, then the component, in the panel's one band voice. */
function bandLabel(word: string, component: string, labelOf: (name: string) => string): string {
  return `${word} ${labelOf(component).toUpperCase()}`;
}


/** `/Sections/Hero` → `Hero`. The editor passes `benchTargetLabel`, which says the same thing. */
function defaultLabel(componentName: string): string {
  const parts = componentName.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? componentName;
}

/**
 * Which rows have rows under them — what gets a caret.
 *
 * Derived from `parentKey` rather than recorded during the walk: "has children" is a fact about the
 * finished list, and a row that *would* have had them (a cyclic instance, a dynamic repeater) must
 * not draw a caret that opens nothing.
 */
export function rowsWithChildren(rows: readonly LayerRow[]): Set<string> {
  const parents = new Set<string>();
  for (const row of rows) if (row.parentKey) parents.add(row.parentKey);
  return parents;
}

/**
 * What is open when the tab opens (Richard, 2026-09-18): **the branch you are editing, and nothing
 * else**.
 *
 * Measured before asking: fully expanded, `Prefab marketplace` → `Home` is **330 rows** and the
 * heaviest screen on this machine is **2,994**. Landing in a 330-row list to find the five nodes
 * you are working on is the surface failing at the one moment it exists for.
 *
 * So: every ancestor of the editing region is open, plus the chain down to the page the preview is
 * showing — which is what the person is looking at even when the canvas is somewhere else. Nothing
 * else is, and every row with children under it carries a caret.
 *
 * ⚠️ Returns the keys that are **open**, not the ones that are closed. A closed-set default would
 * silently open every branch a later walk invented, which is the wrong failure direction for a tab
 * whose whole claim is that you can find one thing in it.
 */
export function expandedForEditing(rows: readonly LayerRow[]): Set<string> {
  const byKey = new Map(rows.map((row) => [row.key, row]));
  const open = new Set<string>();

  const openTo = (row: LayerRow | undefined) => {
    let current = row?.parentKey ? byKey.get(row.parentKey) : undefined;
    while (current) {
      if (open.has(current.key)) break;
      open.add(current.key);
      current = current.parentKey ? byKey.get(current.parentKey) : undefined;
    }
  };

  for (const row of rows) {
    // The editing region, and the band that names it.
    if (row.tinted) openTo(row);
    // The screen's own page: `SHOWING HOME` is the row a person reads first.
    if (row.kind === 'band' && !row.component) continue;
    if (row.kind === 'band' && row.label.startsWith('SHOWING')) {
      openTo(row);
      open.add(row.key);
    }
  }

  return open;
}

/**
 * The rows a collapsed tree actually draws, in order: a row is visible when **every** key on its
 * parent chain is open.
 *
 * ⚠️ Checks the whole chain rather than the immediate parent. A row whose parent is open inside a
 * grandparent that is closed is not on screen, and a one-level check would draw it — orphaned at
 * its own indent, under a heading that is not there.
 */
export function visibleRows(rows: readonly LayerRow[], expanded: ReadonlySet<string>): LayerRow[] {
  const visible = new Map<string, boolean>();
  const out: LayerRow[] = [];

  for (const row of rows) {
    const shown = !row.parentKey || (visible.get(row.parentKey) === true && expanded.has(row.parentKey));
    visible.set(row.key, shown);
    if (shown) out.push(row);
  }

  return out;
}

/**
 * §2's **containment crumb** — `Home › Hero`, the chain of components from the screen down to the
 * one the canvas is editing.
 *
 * 🔴 Read off the **rows**, not from a fresh walk of usages. The crumb has to name the copy the
 * person is looking at: a component placed in three parents has three chains, and a walk upward
 * through `instances` would pick one of them by accident. The rows already know which, because the
 * walk that made them came down that path — `parentKey` is the way back up it.
 *
 * @returns the owners from the outermost inwards, ending on `canvasComponent`; empty when the
 *   canvas's component is not on this screen, and a single entry when it IS the screen (nothing
 *   contains it, so §2 draws no crumb).
 */
export function containmentCrumb(rows: readonly LayerRow[], canvasComponent: string | undefined): string[] {
  if (!canvasComponent) return [];

  const byKey = new Map(rows.map((row) => [row.key, row]));
  const band = rows.find((row) => row.kind === 'band' && row.editing);
  if (!band) return [];

  const chain: string[] = [];
  let current: LayerRow | undefined = band;
  while (current) {
    // A band's owner is the component it introduces; a node's owner is the graph it is drawn in.
    // Both are "whose file is this row in", which is exactly what a crumb step means.
    if (!chain.length || chain[0] !== current.owner) {
      if (current.owner) chain.unshift(current.owner);
    }
    current = current.parentKey ? byKey.get(current.parentKey) : undefined;
  }

  return chain;
}

/**
 * §2's **footer** — how many nodes of the canvas's component are not on screen, and therefore not
 * in Layers.
 *
 * ⚠️ **Counted as "everything the graph holds, minus what the screen draws"**, rather than by
 * asking each node whether it is logic. A node under the *second* visual root is not logic and is
 * still not on screen (its component renders `roots[0]` of the visual roots and nothing else), and
 * a count that called those rows logic would be telling a small lie to avoid a longer sentence.
 * The caller words it; this counts.
 */
export interface LayersFooter {
  count: number;
  text: string;
}

/**
 * §2's footer, worded from what is actually in the count.
 *
 * 🔴 §2 says *"+ 14 **logic** nodes on the canvas"*, and for **268 of this machine's 5,173
 * components (5.2%) that is false**: they hold a second visual root, whose **1,579 nodes** draw
 * nothing only because a component instance renders `roots[0]` of its visual roots and nothing
 * else. Calling those logic would be a small lie told to keep a shorter sentence — and the panel's
 * whole claim is that it says which surface shows which thing.
 *
 * So the word follows the measurement: `logic nodes` when the graph has at most one visual root,
 * and `nodes … that nothing draws` when it has more. The median component has **5** of these and
 * only 5% have none, so this line is on screen nearly always.
 */
export function offScreenFooter(component: LayerComponent | undefined): LayersFooter | null {
  const count = offScreenNodeCount(component);
  if (!count || !component) return null;

  const plural = count === 1 ? '' : 's';
  const what =
    component.visualRootIds.length > 1
      ? `${count} node${plural} on the canvas that nothing draws`
      : `${count} logic node${plural} on the canvas`;

  return { count, text: `+ ${what} — not on screen, so not in Layers` };
}

export function offScreenNodeCount(component: LayerComponent | undefined): number {
  if (!component) return 0;

  const visual = new Set(component.visualRootIds);
  const first = component.roots.find((node) => visual.has(node.id));

  let total = 0;
  const count = (node: LayerNode) => {
    total++;
    for (const child of node.children ?? []) count(child);
  };
  for (const root of component.roots) count(root);

  let drawn = 0;
  if (first) {
    const drawnCount = (node: LayerNode) => {
      drawn++;
      for (const child of node.children ?? []) drawnCount(child);
    };
    drawnCount(first);
  }

  return total - drawn;
}
