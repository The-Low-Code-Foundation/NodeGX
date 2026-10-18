/**
 * P112 OWN-012 step 1 — the screen, drawn from what each node says it draws.
 *
 * In: one component's nodes as the files store them, the values its wires carry (from the real app's trace, or a graph
 * runner), the viewport, and a way to measure a leaf's content (text). Out: every visual node's box in viewport px, and
 * every input the drawing needed that no spec and no part of the layout model gave it.
 *
 * Nothing here reads or writes CSS. The boxes come from `@nodegx/node-spec`'s layout model alone: `layoutOf` reads a
 * node's settings through its spec's layout roles, `layoutChildren` places one level, `hugSize` sizes a parent that hugs
 * its children. This file is the recursion over a component's visual tree that the layout check
 * (`packages/nodegx-node-spec/tests/layout-check.test.ts`) does not do: that check takes each parent's size from the
 * browser and grades one level; here only the leaves' content comes from outside, and every other size is the model's.
 *
 * What the model does not say is not guessed: a node whose `layoutOf(...).outside` is not empty is drawn as the model
 * reads it and reported, and a leaf whose content nobody measured is drawn with no content and reported as a need.
 */
import { hugSize, layoutChildren, layoutOf, specs, type LayoutAxis, type LayoutChild, type Size } from '../../../../packages/nodegx-node-spec/src/browser';

/** A node as `nodes.json` stores it: a visual node names its parent. */
export interface FileNode {
  readonly id: string;
  readonly type: string;
  readonly label?: string;
  readonly parent?: string;
  readonly parameters?: Readonly<Record<string, unknown>>;
}

/** What a leaf's content is, given what it shows. `undefined`: it could not say (a need, reported). */
export type MeasureContent = (
  node: FileNode,
  read: (port: string) => unknown
) => { size: Size; needs?: readonly string[]; limits?: readonly string[] } | undefined;

export interface DrawInput {
  readonly nodes: readonly FileNode[];
  /** Values wired in, by node id and input port, already coerced from the trace (`"Focus"` → `Focus`, `"0"` → 0). */
  readonly values?: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  readonly viewport: Size;
  readonly measure?: MeasureContent;
  readonly token?: (name: string) => number | undefined;
}

export interface DrawnBox {
  readonly id: string;
  readonly type: string;
  readonly label?: string;
  readonly parent?: string;
  /** Viewport px: the layout box (the drawn box when transformed is `drawn`). */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly present: boolean;
  /** What the model does not speak, set on this node (from `layoutOf`). */
  readonly outside: readonly string[];
  /** What this node's drawing needed from outside the specs and the model. */
  readonly needs: readonly string[];
  /** What the measurer said it cannot do for this node (a setting the spec has and the measurer cannot honour). */
  readonly limits: readonly string[];
}

export interface Drawing {
  readonly boxes: readonly DrawnBox[];
  /** The visual roots, in file order. */
  readonly roots: readonly string[];
}

type AnySpec = { inputs: Record<string, { default?: unknown; layout?: string }> };
const allSpecs = specs as unknown as Record<string, AnySpec>;

/** A node type draws a box when its spec gives any input a layout role. */
export function isVisualType(type: string): boolean {
  const spec = allSpecs[type];
  return !!spec && Object.values(spec.inputs).some((d) => d.layout !== undefined);
}

export function draw(input: DrawInput): Drawing {
  const { viewport } = input;
  const visual = input.nodes.filter((n) => isVisualType(n.type));
  const byId = new Map(visual.map((n) => [n.id, n]));
  const kidsOf = new Map<string, FileNode[]>();
  for (const n of visual) if (n.parent && byId.has(n.parent)) (kidsOf.get(n.parent) ?? kidsOf.set(n.parent, []).get(n.parent)!).push(n);
  const roots = visual.filter((n) => !n.parent || !byId.has(n.parent));

  const params = (n: FileNode): Record<string, unknown> => ({ ...(n.parameters ?? {}), ...(input.values?.[n.id] ?? {}) });
  const read = (n: FileNode) => (port: string) => {
    const p = params(n);
    return p[port] !== undefined ? p[port] : allSpecs[n.type]?.inputs[port]?.default;
  };
  const opts = (parentAxis: LayoutAxis | undefined) => ({ parentAxis, viewport, token: input.token });
  const lay = (n: FileNode, parentAxis: LayoutAxis | undefined) => layoutOf(allSpecs[n.type] as never, params(n), opts(parentAxis));
  const needs = new Map<string, string[]>();
  const limits = new Map<string, string[]>();
  const add = (m: Map<string, string[]>, id: string, what: string) => {
    const list = m.get(id) ?? m.set(id, []).get(id)!;
    if (!list.includes(what)) list.push(what);
  };
  const need = (id: string, what: string) => add(needs, id, what);

  // A node's content: a leaf's comes from `measure` (the model does not measure text); a parent's is what its present
  // children give it (`hugSize`) — never anything read from the app.
  const contentOf = (n: FileNode, parentAxis: LayoutAxis | undefined): Size => {
    const self = lay(n, parentAxis);
    const kids = (kidsOf.get(n.id) ?? []).filter((c) => lay(c, undefined).present);
    if (kids.length > 0 && self.parent) {
      const axis = self.parent.axis;
      return hugSize(self.parent, kids.map((c) => ({ ...lay(c, axis).child, content: contentOf(c, axis) })));
    }
    if (!usesContent(self.child)) return { width: 0, height: 0 };
    const measured = input.measure?.(n, read(n));
    if (!measured) {
      need(n.id, 'its content size (nobody measured it)');
      return { width: 0, height: 0 };
    }
    for (const w of measured.needs ?? []) need(n.id, w);
    for (const w of measured.limits ?? []) add(limits, n.id, w);
    return measured.size;
  };

  const out: DrawnBox[] = [];
  const place = (n: FileNode, at: { x: number; y: number; width: number; height: number }, parentAxis: LayoutAxis | undefined, present: boolean) => {
    const self = lay(n, parentAxis);
    out.push({ id: n.id, type: n.type, label: n.label, parent: n.parent, ...at, present, outside: self.outside, needs: needs.get(n.id) ?? [], limits: limits.get(n.id) ?? [] });
    const kids = kidsOf.get(n.id) ?? [];
    if (kids.length === 0 || !self.parent) return;
    const axis = self.parent.axis;
    const placed = kids.map((c) => ({ c, l: lay(c, axis) }));
    const shown = placed.filter((p) => p.l.present);
    const children: LayoutChild[] = shown.map((p) => ({ ...p.l.child, content: contentOf(p.c, axis) }));
    const result = layoutChildren({ ...self.parent, width: at.width, height: at.height }, children);
    shown.forEach((p, i) => {
      const b = result.children[i];
      place(p.c, { x: at.x + b.x, y: at.y + b.y, width: b.width, height: b.height }, axis, true);
    });
    for (const p of placed) if (!p.l.present) out.push({ id: p.c.id, type: p.c.type, label: p.c.label, parent: n.id, x: 0, y: 0, width: 0, height: 0, present: false, outside: [], needs: [], limits: [] });
  };

  // A visual root sits in the app's root element, the size of the viewport, stacked down: the runtime mounts the root
  // component's visual roots there. That parent has no node and no spec; it is an assumption, graded with the rest.
  const ROOT_AXIS: LayoutAxis = 'column';
  const rootKids = roots.map((r) => ({ r, l: lay(r, ROOT_AXIS) })).filter((p) => p.l.present);
  const top = layoutChildren(
    { axis: ROOT_AXIS, width: viewport.width, height: viewport.height },
    rootKids.map((p) => ({ ...p.l.child, content: contentOf(p.r, ROOT_AXIS) }))
  );
  rootKids.forEach((p, i) => {
    const b = top.children[i];
    place(p.r, { x: b.x, y: b.y, width: b.width, height: b.height }, ROOT_AXIS, true);
  });
  return { boxes: out, roots: roots.map((r) => r.id) };
}

/** Whether a child's box depends on its content on either axis (a hug, or a fill whose basis is the content). */
function usesContent(child: Omit<LayoutChild, 'content'>): boolean {
  const on = (r: LayoutChild['width']) => r.kind === 'hug' || (r.kind === 'fill' && r.basis === 'hug');
  return on(child.width) || on(child.height);
}

/** A trace value preview as a value: `"Focus"` → `Focus`, `"0"`/`0` → 0, `true`/`false`, anything else as it came. */
export function traceValue(preview: string): unknown {
  if (/^".*"$/s.test(preview)) return preview.slice(1, -1);
  if (preview === 'true' || preview === 'false') return preview === 'true';
  if (preview !== '' && Number.isFinite(Number(preview))) return Number(preview);
  return preview;
}
