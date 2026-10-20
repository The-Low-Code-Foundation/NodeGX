/**
 * P112 OWN-012 step 2 (2026-10-18) — the drawer: a component's screen, drawn from what each node says it draws.
 *
 * In: the component's nodes as the files store them (`nodes.json`: `id`, `type`, `parent` / `children`, `parameters`),
 * the other components of the project for the ones it places, the values its wires carry (from the real app's trace,
 * or a graph runner — a drawing cannot run the graph), the viewport, and a way to measure a leaf's content (text).
 * Out: every visual node's box in viewport px, and every input the drawing needed that no spec and no part of the
 * layout model gave it.
 *
 * Nothing here reads or writes CSS, and none of the runtime's layout code is copied. The boxes come from the layout
 * model alone (layout.ts, layout-map.ts): {@link layoutOf} reads a node's settings through its spec's layout roles,
 * {@link layoutChildren} places one level, {@link hugSize} sizes a parent that hugs its children. This file is the
 * recursion over a component's visual tree that the layout check (tests/layout-check.test.ts) leaves out: that check
 * takes each parent's size from the browser and grades one level; here only the leaves' content comes from outside,
 * and every other size is the model's own.
 *
 * {@link createDrawer} takes the spec table, so a page can bring the full specs (`./draw-full`, the browser entry) or
 * the small table of inputs and layout roles the drawer reads (`./draw-only`, generated from the full specs and held
 * equal to them by tests/draw-specs.test.ts).
 *
 * **What the drawing needed that no spec gives — each reported, never guessed silently:**
 *  1. The values on the wires: `values`, by node id or by path. Nothing here runs a node.
 *  2. A leaf's content size: `measure`. The model does not measure text (layout.ts header); `./draw-canvas` is a
 *     canvas measurer a page can pass, and it reports its own limits (tabular numerals, a font it cannot see).
 *  3. The root's parent: a visual root sits in the app's root element, the viewport's size, stacked down. No node and
 *     no spec says so (`Drawing.needs`).
 *  4. A Router and a Page: the Router's spec has no size or axis role, and the Page has no spec yet. Each is drawn the
 *     way the runtime's element draws it, read once (router.tsx / page.ts `defaultCss`): a column that fills its
 *     parent's stacking axis and stretches across it; the Page starts its children at the left. The Router shows the
 *     page `pageOf` names, else its start page. Reported on the node (`needs`).
 *  5. A placed component has no box of its own: its visual roots stand in its place, as the runtime places them
 *     (componentinstance.ts `getRoots`). A component not among `components` is reported and draws nothing.
 *  6. A For Each draws one row per item; the drawer has no items and draws none. Reported on the node.
 *  7. Text that wraps: the model takes one content size per leaf (layout.ts header: "text whose height depends on its
 *     width"). When a measured leaf is wider than the box it got, that is reported as a limit on the node.
 *  8. A node whose `layoutOf(...).outside` is not empty (a `web-only` setting that is set, a token not given, `fixed` /
 *     `sticky`) is drawn as the model reads it and reported, as the layout check reports it.
 */
import { hugSize, layoutChildren, type LayoutAxis, type LayoutChild, type LayoutParent, type Rect, type Size } from './layout';
import { layoutOf, type NodeLayout } from './layout-map';

/** A node as `nodes.json` stores it: a visual node names its parent, and a parent may list its children in order. */
export interface FileNode {
  readonly id: string;
  readonly type: string;
  readonly label?: string;
  readonly parent?: string;
  readonly children?: readonly string[];
  readonly parameters?: Readonly<Record<string, unknown>>;
}

/** A component's file: its nodes, and which of them are its visual roots (else: the visual nodes with no parent). */
export interface FileComponent {
  readonly nodes: readonly FileNode[];
  readonly visualRoots?: readonly string[];
}

/** What a leaf's content is, given what it shows. `undefined`: it could not say (a need, reported on the node). */
export type MeasureContent = (
  node: FileNode,
  read: (port: string) => unknown,
  at: { readonly path: string }
) => { size: Size; needs?: readonly string[]; limits?: readonly string[] } | undefined;

/** The part of a spec the drawer reads: each input's default, its layout role and its portability class. */
export interface DrawInputDecl {
  readonly default?: unknown;
  readonly layout?: string;
  readonly portability?: string;
}
export interface DrawSpec {
  readonly inputs: Readonly<Record<string, DrawInputDecl>>;
}

export interface DrawInput {
  /** The component to draw: its nodes, or its file. */
  readonly nodes: readonly FileNode[] | FileComponent;
  /** Every component of the project by path (`/Todo/Header`), for the ones this one places. */
  readonly components?: Readonly<Record<string, FileComponent>>;
  /** Values wired in, by node id (the trace's `toNode`) or by path (`tdHeader/hdTitle`), coerced already ({@link traceValue}). */
  readonly values?: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  readonly viewport: Size;
  readonly measure?: MeasureContent;
  /** A design token's value in px (`var(--space-4)` → `token('--space-4')`). */
  readonly token?: (name: string) => number | undefined;
  /** Which page a Router shows (a component path). Default: its start page. */
  readonly pageOf?: (router: FileNode, path: string) => string | undefined;
  /**
   * The project's Body Scroll setting (`nodegx.project.json` `settings.bodyScroll`). On, the app's root element is as
   * tall as its content and at least the viewport, and the document scrolls — so a visual root whose height is a percent
   * or a share has nothing to be a share of and is its content (header 3; reported in `Drawing.needs`).
   */
  readonly bodyScroll?: boolean;
}

export interface DrawnBox {
  readonly id: string;
  /** The node's place in the tree: the ids of the components placed above it, then its own (`tdHeader/hdTitle`). */
  readonly path: string;
  readonly type: string;
  readonly label?: string;
  /** The path of the box this one sits in; none for a root. */
  readonly parent?: string;
  /** Viewport px: the layout box. */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** The box as drawn when the node has a transform (its own; an ancestor's is reported in `limits`). */
  readonly drawn?: Rect;
  readonly present: boolean;
  /** What the model does not speak, set on this node (`layoutOf(...).outside`). */
  readonly outside: readonly string[];
  /** What this node's drawing needed from outside the specs and the model. */
  readonly needs: readonly string[];
  /** What the drawing could not honour for this node (a setting the spec has that the measurer or the model cannot). */
  readonly limits: readonly string[];
}

export interface Drawing {
  readonly boxes: readonly DrawnBox[];
  /** The visual roots' paths, in file order. */
  readonly roots: readonly string[];
  /** What the whole drawing assumed that no node says. */
  readonly needs: readonly string[];
}

export interface Drawer {
  draw(input: DrawInput): Drawing;
  /** A node type draws a box when its spec gives any input a layout role. */
  isVisualType(type: string): boolean;
}

/** The runtime's node type for a repeated row's maker. */
const REPEATER = 'For Each';
/** The navigation node with no spec yet (not one of NSP-016's nineteen). */
const PAGE = 'Page';
/** The Page Router's catalog type. */
const ROUTER = 'Router';

export const ROOT_NEED = "the root's parent: the app's root element, the viewport's size, stacked down (no node, no spec says so)";
export const BODY_SCROLL_NEED =
  "the root's parent with Body Scroll on (the project's settings): the app's root element is as tall as its content, at least the viewport, and the document scrolls — a visual root's percent or share height is its content (no node says so; the project file does)";
export const VALUES_NEED = "the values on the wires: a trace or a graph runner (a drawn screen cannot run the graph)";
const ROUTER_NEED = "the Router's box: its spec has no size or axis role; drawn as a column that fills its parent and stretches across it, its page the start page unless told (the runtime's element, read once — not a description)";
const PAGE_NEED = 'the Page has no spec yet: drawn as a column that fills its parent, its children starting at the left (the runtime\'s element, read once — not a description)';
const ROWS_NEED = 'a For Each draws one row per item: no items were given, so no row is drawn (a trace or a graph runner has them)';

interface Item {
  readonly node: FileNode;
  /** The ids of the components placed above this node, then its own. */
  readonly path: string;
  /** What this node's own children's paths start with: the placed components above it. */
  readonly prefix: string;
  readonly comp: FileComponent;
  readonly kind: 'visual' | 'router' | 'page';
}

/** A drawer over one spec table. */
export function createDrawer(specs: Readonly<Record<string, DrawSpec>>): Drawer {
  const isVisualType = (type: string): boolean => {
    const spec = specs[type];
    return !!spec && Object.values(spec.inputs).some((d) => d.layout !== undefined);
  };

  function draw(input: DrawInput): Drawing {
    const { viewport } = input;
    const components = input.components ?? {};
    const componentOf = (path: string): FileComponent | undefined => components[path] ?? components[path.replace(/^\/+/, '')] ?? components['/' + path.replace(/^\/+/, '')];
    const isInstance = (type: string) => componentOf(type) !== undefined || (type.startsWith('/') && !specs[type]);
    const rootComp: FileComponent = Array.isArray(input.nodes) ? { nodes: input.nodes as readonly FileNode[] } : (input.nodes as FileComponent);

    const needs = new Map<string, string[]>();
    const limits = new Map<string, string[]>();
    const add = (m: Map<string, string[]>, path: string, what: string) => {
      const list = m.get(path) ?? m.set(path, []).get(path)!;
      if (!list.includes(what)) list.push(what);
    };
    const need = (path: string, what: string) => add(needs, path, what);
    const limit = (path: string, what: string) => add(limits, path, what);

    /** The nodes of a component that stand in its visual tree: visual types, Pages, placed components, row makers. */
    const inTree = (n: FileNode) => isVisualType(n.type) || n.type === PAGE || isInstance(n.type) || n.type === REPEATER;

    /** A node's children within its component, in the order the file gives (`children`, else file order). */
    const fileChildren = (comp: FileComponent, node: FileNode): FileNode[] => {
      const byId = new Map(comp.nodes.map((n) => [n.id, n]));
      const listed = (node.children ?? []).map((id) => byId.get(id)).filter((n): n is FileNode => !!n && inTree(n));
      const byParent = comp.nodes.filter((n) => n.parent === node.id && inTree(n) && !listed.includes(n));
      return [...listed, ...byParent];
    };
    const fileRoots = (comp: FileComponent): FileNode[] => {
      const byId = new Map(comp.nodes.map((n) => [n.id, n]));
      if (comp.visualRoots && comp.visualRoots.length > 0) return comp.visualRoots.map((id) => byId.get(id)).filter((n): n is FileNode => !!n && inTree(n));
      return comp.nodes.filter((n) => inTree(n) && (!n.parent || !byId.has(n.parent)));
    };

    /**
     * The boxes under a node's children: a placed component stands aside for its roots, a For Each for nothing.
     * `at` is the path of the node whose children these are; a placed component's id joins the path of what it holds.
     */
    const expand = (nodes: readonly FileNode[], comp: FileComponent, prefix: string): Item[] => {
      const out: Item[] = [];
      for (const n of nodes) {
        const path = prefix ? `${prefix}/${n.id}` : n.id;
        if (n.type === REPEATER) {
          need(path, ROWS_NEED);
          continue;
        }
        if (isInstance(n.type)) {
          const placed = componentOf(n.type);
          if (!placed) {
            need(path, `the component ${n.type} is not among the files given, so nothing is drawn in its place`);
            continue;
          }
          out.push(...expand(fileRoots(placed), placed, path));
          continue;
        }
        if (n.type === PAGE) {
          need(path, PAGE_NEED);
          out.push({ node: n, path, prefix, comp, kind: 'page' });
          continue;
        }
        if (n.type === ROUTER) {
          need(path, ROUTER_NEED);
          out.push({ node: n, path, prefix, comp, kind: 'router' });
          continue;
        }
        out.push({ node: n, path, prefix, comp, kind: 'visual' });
      }
      return out;
    };

    const childItems = (item: Item): Item[] => {
      if (item.kind === 'router') {
        const pages = item.node.parameters?.pages as { startPage?: string; routes?: readonly string[] } | undefined;
        const wanted = input.pageOf?.(item.node, item.path) ?? pages?.startPage ?? pages?.routes?.[0];
        if (!wanted) {
          need(item.path, 'the Router lists no page, so nothing is drawn in it');
          return [];
        }
        const page = componentOf(wanted);
        if (!page) {
          need(item.path, `the Router's page ${wanted} is not among the files given, so nothing is drawn in it`);
          return [];
        }
        // the page's roots sit in the Router: the Router is the component they are placed under
        return expand(fileRoots(page), page, item.path);
      }
      return expand(fileChildren(item.comp, item.node), item.comp, item.prefix);
    };

    const params = (item: Item): Record<string, unknown> => ({ ...(item.node.parameters ?? {}), ...(input.values?.[item.node.id] ?? {}), ...(input.values?.[item.path] ?? {}) });
    const read = (item: Item) => (port: string) => {
      const p = params(item);
      return p[port] !== undefined ? p[port] : specs[item.node.type]?.inputs[port]?.default;
    };
    const opts = (parentAxis: LayoutAxis | undefined) => ({ parentAxis, viewport, token: input.token });

    /** The node in the model: its spec's roles, or — for the Router and the Page — the runtime element's two rules (header 4). */
    const lay = (item: Item, parentAxis: LayoutAxis | undefined): NodeLayout => {
      if (item.kind === 'visual') return layoutOf(specs[item.node.type] as never, params(item), opts(parentAxis));
      const base = item.kind === 'router' ? layoutOf(specs[ROUTER] as never, params(item), opts(parentAxis)) : undefined;
      const clip = item.kind === 'router' ? read(item)('clip') : undefined;
      return {
        present: base ? base.present : true,
        child: { width: { kind: 'fill', weight: 1 }, height: { kind: 'fill', weight: 1 }, margin: { top: 0, right: 0, bottom: 0, left: 0 } },
        parent: {
          axis: 'column',
          mainAlign: 'start',
          crossAlign: item.kind === 'page' ? 'start' : 'stretch',
          gap: 0,
          padding: { top: 0, right: 0, bottom: 0, left: 0 },
          border: { top: 0, right: 0, bottom: 0, left: 0 },
          clip: clip === 'clip',
          scroll: clip === 'scroll'
        },
        outside: base ? base.outside : []
      };
    };

    // A node's content: a leaf's comes from `measure` (the model does not measure text); a parent's is what its present
    // children give it (`hugSize`) — never anything read from the app.
    const contents = new Map<string, Size>();
    const kidsCache = new Map<string, Item[]>();
    const kidsOf = (item: Item) => kidsCache.get(item.path) ?? kidsCache.set(item.path, childItems(item)).get(item.path)!;
    const contentOf = (item: Item, parentAxis: LayoutAxis | undefined): Size => {
      const self = lay(item, parentAxis);
      const kids = kidsOf(item).filter((c) => lay(c, undefined).present);
      if (kids.length > 0 && self.parent) {
        const axis = self.parent.axis;
        return hugSize(self.parent, kids.map((c) => ({ ...lay(c, axis).child, content: contentOf(c, axis) })));
      }
      if (!usesContent(self.child)) return { width: 0, height: 0 };
      if (item.kind !== 'visual') return { width: 0, height: 0 };
      const measured = input.measure?.(item.node, read(item), { path: item.path });
      if (!measured) {
        need(item.path, 'its content size (nobody measured it)');
        return { width: 0, height: 0 };
      }
      for (const w of measured.needs ?? []) need(item.path, w);
      for (const w of measured.limits ?? []) limit(item.path, w);
      contents.set(item.path, measured.size);
      return measured.size;
    };

    const out: DrawnBox[] = [];
    const place = (item: Item, at: Rect, drawnAt: Rect | undefined, parentAxis: LayoutAxis | undefined, parentPath: string | undefined, underTransform: boolean) => {
      const self = lay(item, parentAxis);
      const content = contents.get(item.path);
      if (content && content.width > at.width + 0.5 && self.child.height.kind === 'hug') {
        limit(item.path, `its content is wider than its box (${round(content.width)} px in ${round(at.width)} px): in a browser the text wraps and the box grows down; the model takes one content size per leaf`);
      }
      if (underTransform) limit(item.path, 'an ancestor is transformed: its drawn box moves with it, and the model compounds no transforms');
      out.push({
        id: item.node.id,
        path: item.path,
        type: item.node.type,
        label: item.node.label,
        parent: parentPath,
        x: at.x,
        y: at.y,
        width: at.width,
        height: at.height,
        ...(drawnAt ? { drawn: drawnAt } : {}),
        present: true,
        outside: self.outside,
        needs: needs.get(item.path) ?? [],
        limits: limits.get(item.path) ?? []
      });
      const kids = kidsOf(item);
      if (kids.length === 0 || !self.parent) return;
      const axis = self.parent.axis;
      const placed = kids.map((c) => ({ c, l: lay(c, axis) }));
      const shown = placed.filter((p) => p.l.present);
      const children: LayoutChild[] = shown.map((p) => ({ ...p.l.child, content: contentOf(p.c, axis) }));
      const result = layoutChildren({ ...self.parent, width: at.width, height: at.height } as LayoutParent, children);
      shown.forEach((p, i) => {
        const b = result.children[i];
        const box = { x: at.x + b.x, y: at.y + b.y, width: b.width, height: b.height };
        const own = p.l.child.transform !== undefined;
        const drawn = own ? { x: at.x + b.drawn.x, y: at.y + b.drawn.y, width: b.drawn.width, height: b.drawn.height } : undefined;
        place(p.c, box, drawn, axis, item.path, underTransform || own);
      });
      for (const p of placed) {
        if (p.l.present) continue;
        out.push({ id: p.c.node.id, path: p.c.path, type: p.c.node.type, label: p.c.node.label, parent: item.path, x: 0, y: 0, width: 0, height: 0, present: false, outside: [], needs: needs.get(p.c.path) ?? [], limits: [] });
      }
    };

    // A visual root sits in the app's root element, the size of the viewport, stacked down: the runtime mounts the root
    // component's visual roots there. That parent has no node and no spec; it is an assumption, graded with the rest.
    // With Body Scroll on, the root element is `height: auto; min-height: 100vh` (the deploy page): a root's percent or share
    // height has no reference and is its content, and the root element is as tall as its content, at least the viewport.
    const ROOT_AXIS: LayoutAxis = 'column';
    const roots = expand(fileRoots(rootComp), rootComp, '');
    const rootKids = roots.map((r) => ({ r, l: lay(r, ROOT_AXIS) })).filter((p) => p.l.present);
    const rootChild = (child: Omit<LayoutChild, 'content'>): Omit<LayoutChild, 'content'> => {
      if (!input.bodyScroll) return child;
      const h = child.height;
      const unreferenced = h.kind === 'fill' || (h.kind === 'length' && h.length.percent !== undefined);
      return unreferenced ? { ...child, height: { kind: 'hug' } } : child;
    };
    const topChildren: LayoutChild[] = rootKids.map((p) => ({ ...rootChild(p.l.child), content: contentOf(p.r, ROOT_AXIS) }));
    const rootHeight = input.bodyScroll ? Math.max(viewport.height, hugSize({ axis: ROOT_AXIS }, topChildren).height) : viewport.height;
    const top = layoutChildren({ axis: ROOT_AXIS, width: viewport.width, height: rootHeight }, topChildren);
    rootKids.forEach((p, i) => {
      const b = top.children[i];
      const own = p.l.child.transform !== undefined;
      place(p.r, { x: b.x, y: b.y, width: b.width, height: b.height }, own ? { x: b.drawn.x, y: b.drawn.y, width: b.drawn.width, height: b.drawn.height } : undefined, ROOT_AXIS, undefined, own);
    });
    for (const p of roots) if (!rootKids.some((k) => k.r === p)) out.push({ id: p.node.id, path: p.path, type: p.node.type, label: p.node.label, x: 0, y: 0, width: 0, height: 0, present: false, outside: [], needs: needs.get(p.path) ?? [], limits: [] });
    // what was reported on a node that drew no box (a For Each, a missing component)
    for (const [path, list] of needs) if (!out.some((b) => b.path === path)) out.push({ id: path.slice(path.lastIndexOf('/') + 1), path, type: typeAt(path), x: 0, y: 0, width: 0, height: 0, present: false, outside: [], needs: list, limits: limits.get(path) ?? [] });
    return { boxes: out, roots: roots.map((r) => r.path), needs: [input.bodyScroll ? BODY_SCROLL_NEED : ROOT_NEED, VALUES_NEED] };

    function typeAt(path: string): string {
      const ids = path.split('/');
      let comp: FileComponent | undefined = rootComp;
      let node: FileNode | undefined;
      for (const id of ids) {
        node = comp?.nodes.find((n) => n.id === id);
        if (!node) return '?';
        if (isInstance(node.type)) comp = componentOf(node.type);
        else if (node.type === ROUTER) {
          const pages = node.parameters?.pages as { startPage?: string; routes?: readonly string[] } | undefined;
          const wanted = input.pageOf?.(node, path) ?? pages?.startPage ?? pages?.routes?.[0];
          comp = wanted ? componentOf(wanted) : undefined;
        }
      }
      return node?.type ?? '?';
    }
  }

  return { draw, isVisualType };
}

/** Whether a child's box depends on its content on either axis (a hug, or a fill whose basis is the content). */
function usesContent(child: Omit<LayoutChild, 'content'>): boolean {
  const on = (r: LayoutChild['width']) => r.kind === 'hug' || (r.kind === 'fill' && r.basis === 'hug');
  return on(child.width) || on(child.height);
}

const round = (n: number) => Math.round(n * 10) / 10;

/** A trace value preview as a value: `"Focus"` → `Focus`, `"0"`/`0` → 0, `true`/`false`, anything else as it came. */
export function traceValue(preview: string): unknown {
  if (/^".*"$/s.test(preview)) return preview.slice(1, -1);
  if (preview === 'true' || preview === 'false') return preview === 'true';
  if (preview !== '' && Number.isFinite(Number(preview))) return Number(preview);
  return preview;
}

/**
 * The part of a spec table the drawer reads, as data: each input's `default`, `layout` and `portability`, for every type
 * whose spec gives any input a layout role. `./draw-specs.generated.ts` is this over the full table, and
 * tests/draw-specs.test.ts holds the two equal.
 */
export function drawSpecTable(specs: Readonly<Record<string, { readonly inputs: Readonly<Record<string, DrawInputDecl>> }>>): Record<string, DrawSpec> {
  const out: Record<string, DrawSpec> = {};
  for (const type of Object.keys(specs).sort()) {
    const inputs = specs[type].inputs;
    if (!Object.values(inputs).some((d) => d.layout !== undefined)) continue;
    const kept: Record<string, DrawInputDecl> = {};
    for (const name of Object.keys(inputs).sort()) {
      const d = inputs[name];
      const decl: { default?: unknown; layout?: string; portability?: string } = {};
      if (d.default !== undefined) decl.default = d.default;
      if (d.layout !== undefined) decl.layout = d.layout;
      if (d.portability !== undefined) decl.portability = d.portability;
      kept[name] = decl;
    }
    out[type] = { inputs: kept };
  }
  return out;
}
