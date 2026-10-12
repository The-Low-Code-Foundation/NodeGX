/**
 * NSP-016 AC4 step 1 (R18, 2026-10-09) — the layout model: what a visual node's layout settings MEAN, apart from CSS.
 *
 * The vocabulary is the subset four native toolkits share (RESEARCH-LAYOUT-SEMANTICS.md §2: Yoga, SwiftUI, Compose,
 * Flutter): children stacked along an axis or laid over each other; main- and cross-axis alignment; a gap; padding;
 * a size that hugs its content, is a length (px plus a percent of the parent), or fills a share of what is left, with a
 * min and a max; spacers; z-order; clip; scroll; and a transform. No CSS in it (R11 / R12: no property names, no
 * strings to parse, no units but px and percent). Step 2 maps the 55 layout inputs onto it; step 5 grades the boxes it
 * computes against the ones a real browser draws.
 *
 * {@link layoutChildren} is one level: a parent's model, its own size, and its children's models with their CONTENT
 * sizes (what each would be if it hugged), to each child's box. It does not measure text or recurse: a hugging child's
 * content size is given (measured, or {@link hugSize} of its own children). Every number is a px; every box is relative
 * to the parent's outer (border-box) top-left.
 *
 * **The main axis is resolved the way flexbox resolves it** (CSS Flexbox §9.7, which Yoga implements): each child has a
 * basis; the free space left after the bases, the margins and the gaps grows the `fill` children in proportion to their
 * weight, or — when the bases do not fit — shrinks the `fill` children in proportion to weight × basis; a min or a max a
 * child would cross freezes it there and the rest is shared again. A `hug` or `length` child never grows or shrinks. That
 * is the runtime's rule as well (`Layout.size`: every node `flexShrink: 0`, except the percentage it turns into a grow).
 *
 * **What it does not say** (each a named limit, so step 5 reports it instead of guessing): wrapping onto lines (not
 * shared — §2); text whose height depends on its width (a hug child's content size is one fixed pair); a child's
 * automatic minimum (flexbox will not shrink an item below its min-content; here a child shrinks to its `floor`, 0 unless
 * given); `fixed` and `sticky` placement; baseline alignment; a stylesheet's rules (R17).
 */

/** How a parent places its children: stacked down, stacked across, or laid over each other in its padding box. */
export type LayoutAxis = 'column' | 'row' | 'overlay';

/** Where the children sit along the axis when they leave space over. */
export type MainAlign = 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly';

/** Where a child sits across the axis. `stretch` makes a child that hugs that axis as wide as the parent's content. */
export type CrossAlign = 'start' | 'center' | 'end' | 'stretch';

/** Placement inside an overlay, per axis. */
export type OverlayAlign = 'start' | 'center' | 'end';

/** A length: `px`, plus `percent` of a reference the field names (the parent's content box, unless it says otherwise). */
export interface Length {
  readonly px?: number;
  readonly percent?: number;
}

/**
 * A size along one axis.
 *  - `hug` — the child's content size.
 *  - `length` — a length of the parent's content box (an overlay child: of the parent's padding box).
 *  - `fill` — on the parent's main axis, a share of the free space by `weight`, on top of `basis` (default 0 px; `'hug'`
 *    is the content size); and it is the one size that shrinks when the bases do not fit. Across the axis, or in an
 *    overlay, `fill` is the whole of the parent's content less the child's margins.
 */
export type SizeRule =
  | { readonly kind: 'hug' }
  | { readonly kind: 'length'; readonly length: Length }
  | { readonly kind: 'fill'; readonly weight: number; readonly basis?: 'hug' | Length };

export interface Edges {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** A transform, applied after layout: it moves what is drawn, never the siblings. Order: translate, rotate, scale. */
export interface LayoutTransform {
  /** Of the child's own width. */
  readonly x?: Length;
  /** Of the child's own height. */
  readonly y?: Length;
  /** Degrees, clockwise. */
  readonly rotation?: number;
  readonly scale?: number;
  /** Of the child's own size; default the centre. */
  readonly originX?: Length;
  readonly originY?: Length;
}

export interface LayoutParent {
  readonly axis: LayoutAxis;
  readonly mainAlign?: MainAlign;
  readonly crossAlign?: CrossAlign;
  /** Between neighbouring children along the axis. */
  readonly gap?: number;
  readonly padding?: Partial<Edges>;
  /** Drawn inside the parent's size, outside its padding. */
  readonly border?: Partial<Edges>;
  /** The parent's own outer size. */
  readonly width: number;
  readonly height: number;
  /** Nothing is drawn outside the padding box. */
  readonly clip?: boolean;
  /**
   * The children scroll along the main axis. The room is the visible window unless the content is longer (ruled
   * 2026-10-09, P107-C154 / P109-S37-SCROLLROOM): a percentage is of the window, a `fill` shares what the window leaves and
   * never shrinks below its content (so a long one pushes the rest on, and the parent scrolls), and the main-axis
   * alignment applies only while the children fit, otherwise they start at the start. What a person sees is clipped
   * to the padding box.
   */
  readonly scroll?: boolean;
}

export interface LayoutChild {
  readonly width: SizeRule;
  readonly height: SizeRule;
  readonly minWidth?: Length;
  readonly maxWidth?: Length;
  readonly minHeight?: Length;
  readonly maxHeight?: Length;
  /** Space outside the child that belongs to it. */
  readonly margin?: Partial<Edges>;
  /**
   * Flexible spacers on the main axis, before and after this child. All the spacers among the children share the free
   * space equally, and while there is any, the parent's `mainAlign` does nothing (a spacer took it).
   */
  readonly spacer?: { readonly before?: boolean; readonly after?: boolean };
  /** This child's own cross-axis alignment, over the parent's. */
  readonly alignSelf?: CrossAlign;
  /** `overlay`: out of the stack, laid over the parent's padding box at `overlayAlign` (also every child of an overlay). */
  readonly place?: 'flow' | 'overlay';
  readonly overlayAlign?: { readonly x?: OverlayAlign; readonly y?: OverlayAlign };
  /** The child's size when it hugs both axes. */
  readonly content: Size;
  /** How far a shrinking `fill` may go on the main axis (default 0). */
  readonly floor?: number;
  readonly transform?: LayoutTransform;
  /** Paint order among siblings: higher on top; ties in child order. Default 0. */
  readonly z?: number;
}

export interface ChildBox extends Rect {
  /** The bounding box of what is drawn, after the transform (the layout box when there is none). */
  readonly drawn: Rect;
  /** The part of `drawn` the parent lets through when it clips or scrolls (`null`: none of it); `drawn` otherwise. */
  readonly visible: Rect | null;
}

export interface LayoutResult {
  readonly children: readonly ChildBox[];
  /** Child indexes, bottom first. */
  readonly paintOrder: readonly number[];
  /** How far the stacked children reach, from the parent's top-left, with the end padding and border: the scroll extent. */
  readonly extent: Size;
  /** The stacked children reach past the parent's padding box on the main axis. */
  readonly overflows: boolean;
}

// ---------------------------------------------------------------------------------------------------------------------

const ZERO: Edges = { top: 0, right: 0, bottom: 0, left: 0 };

function edges(e: Partial<Edges> | undefined): Edges {
  return { ...ZERO, ...(e ?? {}) };
}

/** A length against a reference; `undefined` when it has a percent and the reference is unknown. */
export function resolveLength(length: Length, reference: number | undefined): number | undefined {
  if (length.percent !== undefined && length.percent !== 0) {
    if (reference === undefined) return undefined;
    return ((length.percent / 100) * reference) + (length.px ?? 0);
  }
  return length.px ?? 0;
}

function clamp(value: number, min: number | undefined, max: number | undefined): number {
  // CSS: a min beats a max.
  let v = value;
  if (max !== undefined && v > max) v = max;
  if (min !== undefined && v < min) v = min;
  return v;
}

type Dim = 'width' | 'height';

interface AxisView {
  main: Dim;
  cross: Dim;
  /** Margin edges along main / cross: [start, end]. */
  mainEdges: ['top', 'bottom'] | ['left', 'right'];
  crossEdges: ['left', 'right'] | ['top', 'bottom'];
}

const COLUMN: AxisView = { main: 'height', cross: 'width', mainEdges: ['top', 'bottom'], crossEdges: ['left', 'right'] };
const ROW: AxisView = { main: 'width', cross: 'height', mainEdges: ['left', 'right'], crossEdges: ['top', 'bottom'] };

function minOf(child: LayoutChild, dim: Dim, reference: number | undefined): number | undefined {
  const l = dim === 'width' ? child.minWidth : child.minHeight;
  return l ? resolveLength(l, reference) : undefined;
}

function maxOf(child: LayoutChild, dim: Dim, reference: number | undefined): number | undefined {
  const l = dim === 'width' ? child.maxWidth : child.maxHeight;
  return l ? resolveLength(l, reference) : undefined;
}

/**
 * A size rule on one axis, where it does not share free space: across a stack, or in an overlay. `fill` is the whole
 * reference less the margins; `hug` is the content, unless `stretch` (then as `fill`).
 */
function crossSize(
  child: LayoutChild,
  dim: Dim,
  reference: number | undefined,
  marginSum: number,
  stretch: boolean
): number {
  const rule = child[dim];
  let size: number;
  if (rule.kind === 'length') {
    size = resolveLength(rule.length, reference) ?? child.content[dim];
  } else if (rule.kind === 'fill' || stretch) {
    size = reference === undefined ? child.content[dim] : Math.max(0, reference - marginSum);
  } else {
    size = child.content[dim];
  }
  return clamp(size, minOf(child, dim, reference), maxOf(child, dim, reference));
}

/** The flex basis on the main axis: `undefined` reference = an unbounded axis (a hugging parent). */
function basisOf(child: LayoutChild, dim: Dim, reference: number | undefined): number {
  const rule = child[dim];
  if (rule.kind === 'hug') return child.content[dim];
  if (rule.kind === 'length') return resolveLength(rule.length, reference) ?? child.content[dim];
  const basis = rule.basis ?? { px: 0 };
  if (basis === 'hug') return child.content[dim];
  // An unbounded axis has nothing to share: a percent basis falls back to the content, and so does a fill with none.
  if (reference === undefined) {
    const resolved = resolveLength(basis, undefined);
    return resolved === undefined || (rule.basis === undefined) ? child.content[dim] : resolved;
  }
  return resolveLength(basis, reference) ?? child.content[dim];
}

/**
 * CSS Flexbox §9.7, resolving flexible lengths, on one line: each child's main size. Children that are not `fill`
 * (weight 0) are inflexible. `available` undefined: an unbounded axis, every child at its clamped basis.
 */
function resolveMain(
  children: readonly LayoutChild[],
  dim: Dim,
  available: number | undefined,
  reference: number | undefined,
  outerExtra: number,
  scroll = false
): number[] {
  const n = children.length;
  const base = children.map((c) => basisOf(c, dim, reference));
  // Along a scroll a `fill` stops at its content, not its floor: the content is longer, so the parent scrolls (SCROLLROOM)
  const floorOf = (c: LayoutChild) => (scroll ? Math.max(c.floor ?? 0, c.content[dim]) : c.floor ?? 0);
  const min = children.map((c) => minOf(c, dim, reference) ?? (c[dim].kind === 'fill' ? floorOf(c) : undefined));
  const max = children.map((c) => maxOf(c, dim, reference));
  const hyp = base.map((b, i) => clamp(b, min[i], max[i]));
  const weight = children.map((c) => {
    const r = c[dim];
    return r.kind === 'fill' ? Math.max(0, r.weight) : 0;
  });
  if (available === undefined) return hyp;

  const sumHyp = hyp.reduce((a, b) => a + b, 0) + outerExtra;
  const growing = sumHyp < available;
  const target = hyp.slice();
  const frozen = children.map((_, i) => {
    if (growing) return weight[i] === 0 || base[i] > hyp[i];
    // Shrinking: the factor is 1 for a fill (the runtime's percentage → `flexShrink: 1`), 0 for the rest.
    return weight[i] === 0 || base[i] < hyp[i];
  });

  const initialFree = available - outerExtra
    - children.reduce((a, _, i) => a + (frozen[i] ? hyp[i] : base[i]), 0);

  for (let guard = 0; guard <= n; guard++) {
    if (frozen.every(Boolean)) break;
    let free = available - outerExtra - children.reduce((a, _, i) => a + (frozen[i] ? target[i] : base[i]), 0);
    const open = [...Array(n).keys()].filter((i) => !frozen[i]);
    if (growing) {
      const sumW = open.reduce((a, i) => a + weight[i], 0);
      // §9.7 4b: weights summing to less than 1 take only that fraction of the initial free space.
      if (sumW < 1 && Math.abs(initialFree * sumW) < Math.abs(free)) free = initialFree * sumW;
      for (const i of open) target[i] = sumW > 0 ? base[i] + (free * weight[i]) / sumW : base[i];
    } else {
      const scaled = open.map((i) => base[i]);
      const sumS = scaled.reduce((a, b) => a + b, 0);
      open.forEach((i, k) => {
        target[i] = sumS > 0 ? base[i] + (free * scaled[k]) / sumS : base[i];
      });
    }
    // Fix min / max violations; freeze per the sign of the total violation.
    let total = 0;
    const adjust = new Map<number, number>();
    for (const i of open) {
      const clamped = clamp(target[i], min[i] ?? 0, max[i]);
      adjust.set(i, clamped - target[i]);
      total += clamped - target[i];
      target[i] = clamped;
    }
    if (total === 0) break;
    for (const i of open) {
      const a = adjust.get(i) ?? 0;
      if ((total > 0 && a > 0) || (total < 0 && a < 0)) frozen[i] = true;
    }
    // Unfreezing is never needed: the violators keep their clamped size; the others are re-shared next pass.
    for (const i of open) if (!frozen[i]) target[i] = base[i];
  }
  return target;
}

function transformBox(box: Rect, t: LayoutTransform | undefined): Rect {
  if (!t) return box;
  const tx = resolveLength(t.x ?? {}, box.width) ?? 0;
  const ty = resolveLength(t.y ?? {}, box.height) ?? 0;
  const ox = box.x + (resolveLength(t.originX ?? { percent: 50 }, box.width) ?? 0);
  const oy = box.y + (resolveLength(t.originY ?? { percent: 50 }, box.height) ?? 0);
  const s = t.scale ?? 1;
  const rad = ((t.rotation ?? 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const corners = [
    [box.x, box.y],
    [box.x + box.width, box.y],
    [box.x, box.y + box.height],
    [box.x + box.width, box.y + box.height]
  ].map(([px, py]) => {
    const dx = (px - ox) * s;
    const dy = (py - oy) * s;
    return [ox + tx + dx * cos - dy * sin, oy + ty + dx * sin + dy * cos];
  });
  const xs = corners.map((c) => c[0]);
  const ys = corners.map((c) => c[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

function intersect(a: Rect, b: Rect): Rect | null {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const r = Math.min(a.x + a.width, b.x + b.width);
  const bt = Math.min(a.y + a.height, b.y + b.height);
  if (r <= x || bt <= y) return null;
  return { x, y, width: r - x, height: bt - y };
}

function placeOverlay(child: LayoutChild, pad: Rect): Rect {
  const m = edges(child.margin);
  const width = crossSize(child, 'width', pad.width, m.left + m.right, false);
  const height = crossSize(child, 'height', pad.height, m.top + m.bottom, false);
  const ax = child.overlayAlign?.x ?? 'start';
  const ay = child.overlayAlign?.y ?? 'start';
  const x =
    ax === 'start' ? pad.x + m.left : ax === 'end' ? pad.x + pad.width - width - m.right : pad.x + pad.width / 2 + m.left - width / 2;
  const y =
    ay === 'start' ? pad.y + m.top : ay === 'end' ? pad.y + pad.height - height - m.bottom : pad.y + pad.height / 2 + m.top - height / 2;
  return { x, y, width, height };
}

/** One level of layout: each child's box, from the parent's model and size and each child's model and content size. */
export function layoutChildren(parent: LayoutParent, children: readonly LayoutChild[]): LayoutResult {
  const p = edges(parent.padding);
  const b = edges(parent.border);
  const padBox: Rect = {
    x: b.left,
    y: b.top,
    width: Math.max(0, parent.width - b.left - b.right),
    height: Math.max(0, parent.height - b.top - b.bottom)
  };
  const contentBox: Rect = {
    x: padBox.x + p.left,
    y: padBox.y + p.top,
    width: Math.max(0, padBox.width - p.left - p.right),
    height: Math.max(0, padBox.height - p.top - p.bottom)
  };

  const boxes: Rect[] = new Array(children.length);
  const flow = children
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => parent.axis !== 'overlay' && (c.place ?? 'flow') === 'flow');
  for (const { c, i } of children.map((c, i) => ({ c, i }))) {
    if (parent.axis === 'overlay' || c.place === 'overlay') boxes[i] = placeOverlay(c, padBox);
  }

  let extentMain = 0;
  let extentCross = 0;
  let overflows = false;
  if (parent.axis !== 'overlay') {
    const v = parent.axis === 'column' ? COLUMN : ROW;
    const mainRef = contentBox[v.main];
    const crossRef = contentBox[v.cross];
    const kids = flow.map(({ c }) => c);
    const margins = kids.map((c) => edges(c.margin));
    const gap = parent.gap ?? 0;
    const marginMain = margins.reduce((a, m) => a + m[v.mainEdges[0]] + m[v.mainEdges[1]], 0);
    const gaps = kids.length > 1 ? gap * (kids.length - 1) : 0;

    // A scroll's room is the window too (SCROLLROOM); what does not fit past the fills' floors scrolls
    const main = resolveMain(kids, v.main, mainRef, mainRef, marginMain + gaps, parent.scroll);

    const used = main.reduce((a, s) => a + s, 0) + marginMain + gaps;
    // a scroll aligns `safe`: content longer than the window starts at the start, where scrolling reaches it
    const free = parent.scroll ? Math.max(0, mainRef - used) : mainRef - used;

    // Spacers take the free space first; the parent's alignment only gets what they leave (none, when there is any).
    const spacers = kids.reduce((a, c) => a + (c.spacer?.before ? 1 : 0) + (c.spacer?.after ? 1 : 0), 0);
    let lead = 0;
    let between = 0;
    let spacer = 0;
    const align = parent.mainAlign ?? 'start';
    if (spacers > 0 && free > 0) {
      spacer = free / spacers;
    } else if (kids.length > 0) {
      const n = kids.length;
      // Flexbox §8.2 fallbacks: space-between is start with one child or no room; space-around / -evenly are center.
      if (align === 'center') lead = free / 2;
      else if (align === 'end') lead = free;
      else if (align === 'space-between') {
        if (free > 0 && n > 1) between = free / (n - 1);
      } else if (align === 'space-around') {
        if (free > 0 && n > 1) {
          between = free / n;
          lead = between / 2;
        } else lead = free / 2;
      } else if (align === 'space-evenly') {
        if (free > 0) {
          between = free / (n + 1);
          lead = between;
        } else lead = free / 2;
      }
    }

    let cursor = contentBox[v.main === 'height' ? 'y' : 'x'] + lead;
    const crossStart = contentBox[v.cross === 'width' ? 'x' : 'y'];
    kids.forEach((c, k) => {
      const m = margins[k];
      const marginCross = m[v.crossEdges[0]] + m[v.crossEdges[1]];
      const selfAlign = c.alignSelf ?? parent.crossAlign ?? 'start';
      const cross = crossSize(c, v.cross, crossRef, marginCross, selfAlign === 'stretch' && c[v.cross].kind === 'hug');
      if (c.spacer?.before && spacer > 0) cursor += spacer;
      cursor += m[v.mainEdges[0]];
      const at = cursor;
      cursor += main[k] + m[v.mainEdges[1]];
      if (c.spacer?.after && spacer > 0) cursor += spacer;
      cursor += k < kids.length - 1 ? gap + between : 0;

      const room = crossRef - cross - marginCross;
      const crossAt =
        crossStart +
        m[v.crossEdges[0]] +
        (selfAlign === 'center' ? room / 2 : selfAlign === 'end' ? room : 0);

      extentCross = Math.max(extentCross, crossAt + cross + m[v.crossEdges[1]]);
      boxes[flow[k].i] =
        v.main === 'height'
          ? { x: crossAt, y: at, width: cross, height: main[k] }
          : { x: at, y: crossAt, width: main[k], height: cross };
    });
    extentMain = cursor;
    overflows = used > mainRef + 1e-9;

    const endMain = v.main === 'height' ? p.bottom + b.bottom : p.right + b.right;
    const endCross = v.cross === 'width' ? p.right + b.right : p.bottom + b.bottom;
    extentMain += endMain;
    extentCross += endCross;
    const extent: Size =
      v.main === 'height' ? { width: extentCross, height: extentMain } : { width: extentMain, height: extentCross };
    return finish(parent, children, boxes, padBox, extent, overflows);
  }
  return finish(parent, children, boxes, padBox, { width: parent.width, height: parent.height }, false);
}

function finish(
  parent: LayoutParent,
  children: readonly LayoutChild[],
  boxes: Rect[],
  padBox: Rect,
  extent: Size,
  overflows: boolean
): LayoutResult {
  const clips = Boolean(parent.clip || parent.scroll);
  const out: ChildBox[] = boxes.map((box, i) => {
    const drawn = transformBox(box, children[i].transform);
    return { ...box, drawn, visible: clips ? intersect(drawn, padBox) : drawn };
  });
  const paintOrder = children
    .map((c, i) => ({ z: c.z ?? 0, i }))
    .sort((a, b) => a.z - b.z || a.i - b.i)
    .map((e) => e.i);
  return { children: out, paintOrder, extent, overflows };
}

/**
 * A parent's size on the axes it hugs: its stacked children's outer sizes, the gaps, its padding and its border. A
 * child's percent or fill on a hugged axis has nothing to be a share of, so it counts as its content (and an overlay's
 * children count as their content over the padding box). Pass the axes the parent does NOT hug in `given`.
 */
export function hugSize(
  parent: Omit<LayoutParent, 'width' | 'height'>,
  children: readonly LayoutChild[],
  given: Partial<Size> = {}
): Size {
  const p = edges(parent.padding);
  const b = edges(parent.border);
  const insetW = p.left + p.right + b.left + b.right;
  const insetH = p.top + p.bottom + b.top + b.bottom;
  const refW = given.width === undefined ? undefined : Math.max(0, given.width - insetW);
  const refH = given.height === undefined ? undefined : Math.max(0, given.height - insetH);

  const outer = (c: LayoutChild, dim: Dim, ref: number | undefined) => {
    const m = edges(c.margin);
    const ms = dim === 'width' ? m.left + m.right : m.top + m.bottom;
    const rule = c[dim];
    const size =
      rule.kind === 'length'
        ? resolveLength(rule.length, ref) ?? c.content[dim]
        : rule.kind === 'fill' && ref !== undefined
          ? Math.max(0, ref - ms)
          : c.content[dim];
    return clamp(size, minOf(c, dim, ref), maxOf(c, dim, ref)) + ms;
  };

  let w = 0;
  let h = 0;
  const gap = parent.gap ?? 0;
  const flow = children.filter((c) => parent.axis !== 'overlay' && (c.place ?? 'flow') === 'flow');
  if (parent.axis === 'overlay') {
    for (const c of children) {
      w = Math.max(w, outer(c, 'width', refW));
      h = Math.max(h, outer(c, 'height', refH));
    }
  } else {
    const v = parent.axis === 'column' ? COLUMN : ROW;
    const refMain = v.main === 'width' ? refW : refH;
    const refCross = v.cross === 'width' ? refW : refH;
    const m = flow.map((c) => {
      const marg = edges(c.margin);
      return basisOf(c, v.main, refMain) + marg[v.mainEdges[0]] + marg[v.mainEdges[1]];
    });
    const mainSum = m.reduce((a, x) => a + x, 0) + (flow.length > 1 ? gap * (flow.length - 1) : 0);
    const crossMax = flow.reduce((a, c) => Math.max(a, outer(c, v.cross, refCross)), 0);
    if (v.main === 'height') [w, h] = [crossMax, mainSum];
    else [w, h] = [mainSum, crossMax];
  }
  return {
    width: given.width ?? w + insetW,
    height: given.height ?? h + insetH
  };
}
