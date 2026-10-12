/**
 * NSP-016 AC4 step 2 (R18) — the mapping: each layout input of a visual node onto the layout model (layout.ts).
 *
 * A visual spec's port carries a `layout` role beside its `portability` (spec.ts `PortMeta`): which field of the model
 * the setting feeds. {@link layoutOf} reads a placed node's settings through those roles and writes the model the way the
 * runtime turns them into a box (`noodl-viewer-react/src/layout.ts` `Layout.size` / `Layout.align`, the Group's
 * `flexDirection` / `clip` / `scrollEnabled`). Every rule below cites the runtime line it follows; step 5 grades them.
 *
 * The roles are a vocabulary of the MODEL, not of the runtime's names, so a target that names its ports differently can
 * carry the same roles. {@link LAYOUT_ROLES} is the table by port name that the specs were stamped from: the runtime's
 * shared port definitions (`node-shared-port-definitions.ts`) name a setting the same on every visual node, so one table
 * serves all nineteen. `tests/layout-map.test.ts` holds the specs to it, and holds every `layout-shared` port to having a
 * role (R18: "a check that fails an unmapped shared input"). A `layout-not-shared` or `web-only` port never has one: it is
 * listed in a result's `outside` when it is set, never mapped.
 *
 * This file reads values as a project stores them (`{ value, unit }`, `"12px"`, `"var(--space-4)"`), so it knows units
 * and token syntax; the model it writes knows neither (R11 / R12).
 */

import type { InputDecl, Portability } from './spec';
import type {
  CrossAlign,
  Edges,
  LayoutAxis,
  LayoutChild,
  LayoutParent,
  LayoutTransform,
  Length,
  MainAlign,
  OverlayAlign,
  Size,
  SizeRule
} from './layout';

/**
 * Which field of the layout model a setting feeds.
 *  - As a PARENT: `axis`, `main-align`, `cross-align`, `gap-row`, `gap-column`, `padding-*`, `border-*`, `clip`, `scroll`.
 *  - As a CHILD: `size-mode`, `width`, `height`, `diameter` (both at once), `min-*` / `max-*`, `align-x`, `align-y`,
 *    `margin-*`, `place`, `present`, `translate-*`, `rotation`, `scale`, `origin-*`.
 *  - `content`: lays out what is INSIDE the node (a label's spacing, an icon's side, text alignment, how a picture fits).
 *    The model takes a node's content size as given, so these shape that input and move no box of their own.
 *  - `drawn-only`: drawn over the box, moving nothing (a scrollbar that overlays).
 */
export type LayoutRole =
  | 'axis'
  | 'main-align'
  | 'cross-align'
  | 'gap-row'
  | 'gap-column'
  | 'padding-top'
  | 'padding-right'
  | 'padding-bottom'
  | 'padding-left'
  | 'border-width'
  | 'border-top-width'
  | 'border-right-width'
  | 'border-bottom-width'
  | 'border-left-width'
  | 'border-style'
  | 'border-top-style'
  | 'border-right-style'
  | 'border-bottom-style'
  | 'border-left-style'
  | 'clip'
  | 'scroll'
  | 'size-mode'
  | 'width'
  | 'height'
  | 'diameter'
  | 'min-width'
  | 'max-width'
  | 'min-height'
  | 'max-height'
  | 'align-x'
  | 'align-y'
  | 'margin-top'
  | 'margin-right'
  | 'margin-bottom'
  | 'margin-left'
  | 'place'
  | 'present'
  | 'translate-x'
  | 'translate-y'
  | 'rotation'
  | 'scale'
  | 'origin-x'
  | 'origin-y'
  | 'content'
  | 'drawn-only';

/**
 * The roles by port name, for the nineteen visual nodes. `layout-expressible` ports left out (`scrollSnapEnabled`,
 * `scrollSnapToEveryItem`: where a scroll comes to rest, not a box at rest; the Columns' breakpoints: the Columns lays
 * its children out by its own `layoutString`, which is not shared) are listed by `layoutOf` when set.
 */
export const LAYOUT_ROLES: Readonly<Record<string, LayoutRole>> = {
  flexDirection: 'axis',
  justifyContent: 'main-align',
  alignItems: 'cross-align',
  rowGap: 'gap-row',
  columnGap: 'gap-column',
  paddingTop: 'padding-top',
  paddingRight: 'padding-right',
  paddingBottom: 'padding-bottom',
  paddingLeft: 'padding-left',
  borderWidth: 'border-width',
  borderTopWidth: 'border-top-width',
  borderRightWidth: 'border-right-width',
  borderBottomWidth: 'border-bottom-width',
  borderLeftWidth: 'border-left-width',
  borderStyle: 'border-style',
  borderTopStyle: 'border-top-style',
  borderRightStyle: 'border-right-style',
  borderBottomStyle: 'border-bottom-style',
  borderLeftStyle: 'border-left-style',
  clip: 'clip',
  scrollEnabled: 'scroll',
  sizeMode: 'size-mode',
  width: 'width',
  height: 'height',
  size: 'diameter',
  minWidth: 'min-width',
  maxWidth: 'max-width',
  minHeight: 'min-height',
  maxHeight: 'max-height',
  alignX: 'align-x',
  alignY: 'align-y',
  marginTop: 'margin-top',
  marginRight: 'margin-right',
  marginBottom: 'margin-bottom',
  marginLeft: 'margin-left',
  position: 'place',
  mounted: 'present',
  transformX: 'translate-x',
  transformY: 'translate-y',
  transformRotation: 'rotation',
  transformScale: 'scale',
  transformOriginX: 'origin-x',
  transformOriginY: 'origin-y',
  labelSpacing: 'content',
  iconPlacement: 'content',
  iconSpacing: 'content',
  textAlignX: 'content',
  textAlignY: 'content',
  objectFit: 'content',
  showScrollbar: 'drawn-only'
};

/** The classes whose ports never carry a role: the model cannot say them (RESEARCH-LAYOUT-SEMANTICS.md §2). */
export const UNMAPPED_CLASSES: readonly Portability[] = ['layout-not-shared', 'web-only'];

/**
 * Unmapped ports MEASURED to move no box of their own, so a node that sets one is still graded. Each carries its evidence.
 * They keep no role and stay `web-only`: what they change is the content size the model takes as given.
 */
export const BOX_NEUTRAL: Readonly<Record<string, string>> = {
  as:
    "the Tag: the runtime's sheet resets a Text's margins (`.ndl-visual-text { margin: 0 }`), and a Group's section, nav or span lays out as its div does; " +
    'an h1–h6 changes only the browser font, the Text content (layout-fixtures/measured/tags.json, s71)'
};

export interface LayoutOfOptions {
  /**
   * How the node's parent stacks it: the runtime's `parentLayout`. `undefined` is a node whose parent gave none (the
   * runtime then keeps a percent a plain percent on both axes, `Layout.size`'s last branch never runs for it).
   */
  readonly parentAxis?: LayoutAxis;
  /** For `vw` / `vh`. */
  readonly viewport?: Size;
  /** A design token's value in px (`var(--space-4)` → `token('--space-4')`). */
  readonly token?: (name: string) => number | undefined;
}

export interface NodeLayout {
  /** `false`: Mounted is off — the node has no box. */
  readonly present: boolean;
  /** The node in its parent's layout; `content` is the caller's (measured, or `hugSize` of its children). */
  readonly child: Omit<LayoutChild, 'content'>;
  /** The node as a parent; absent on a node with no `axis` role. */
  readonly parent?: Omit<LayoutParent, 'width' | 'height'>;
  /**
   * Settings on this node the model does not speak, each with why: a `layout-not-shared` or `web-only` input that is set,
   * a value the model cannot read (an `em`, a token it was not given), a placement it does not have (`fixed`, `sticky`).
   * A node with anything here is reported, not graded, by step 5.
   */
  readonly outside: readonly string[];
}

type Decls = Readonly<Record<string, InputDecl>>;

/** A stored value as a length: `{ value, unit }`, a number in the port's default unit, `"12px"`, `"50%"`, a token. */
function readLength(
  raw: unknown,
  defaultUnit: '%' | 'px',
  options: LayoutOfOptions,
  why: (reason: string) => void
): Length | undefined {
  let value: number;
  let unit: string;
  if (raw === undefined || raw === null || raw === '') return undefined;
  if (typeof raw === 'number') {
    value = raw;
    unit = defaultUnit;
  } else if (typeof raw === 'object' && raw !== null && 'value' in raw) {
    const o = raw as { value: unknown; unit?: unknown };
    value = Number(o.value);
    unit = typeof o.unit === 'string' && o.unit !== '' ? o.unit : defaultUnit;
  } else if (typeof raw === 'string') {
    const token = /^var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)$/.exec(raw.trim());
    if (token) {
      const px = options.token?.(token[1]);
      if (px !== undefined) return { px };
      if (token[2] !== undefined) return readLength(token[2].trim(), defaultUnit, options, why);
      why(`the token ${token[1]} has no value here`);
      return undefined;
    }
    const m = /^(-?\d*\.?\d+)\s*([a-z%]*)$/i.exec(raw.trim());
    if (!m) {
      why(`"${raw}" is not a length`);
      return undefined;
    }
    value = Number(m[1]);
    unit = m[2] === '' ? defaultUnit : m[2].toLowerCase();
  } else {
    why(`${JSON.stringify(raw)} is not a length`);
    return undefined;
  }
  if (!Number.isFinite(value)) {
    why(`${JSON.stringify(raw)} is not a number`);
    return undefined;
  }
  if (unit === 'px') return { px: value };
  if (unit === '%') return { percent: value };
  if ((unit === 'vw' || unit === 'vh') && options.viewport) {
    return { px: (value / 100) * (unit === 'vw' ? options.viewport.width : options.viewport.height) };
  }
  why(`the unit "${unit}" is not in the model${unit === 'vw' || unit === 'vh' ? ' without a viewport' : ''}`);
  return undefined;
}

function pxOf(length: Length | undefined, name: string, why: (r: string) => void): number {
  if (!length) return 0;
  if (length.percent) {
    why(`${name} in percent is not in the model`);
    return 0;
  }
  return length.px ?? 0;
}

/** A plain number as stored: a number, a numeric string, or `{ value }` (a rotation's `deg`). */
function numberOf(raw: unknown): number | undefined {
  const v = typeof raw === 'object' && raw !== null && 'value' in raw ? (raw as { value: unknown }).value : raw;
  if (v === undefined || v === null || v === '') return undefined;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : undefined;
}

const MAIN_ALIGN: Record<string, MainAlign> = {
  'flex-start': 'start',
  'flex-end': 'end',
  center: 'center',
  'space-between': 'space-between',
  'space-around': 'space-around',
  'space-evenly': 'space-evenly'
};
const CROSS_ALIGN: Record<string, CrossAlign> = { 'flex-start': 'start', 'flex-end': 'end', center: 'center', stretch: 'stretch' };
const SELF_ALIGN: Record<string, CrossAlign> = { left: 'start', top: 'start', center: 'center', right: 'end', bottom: 'end' };
const OVERLAY_ALIGN: Record<string, OverlayAlign> = { left: 'start', top: 'start', center: 'center', right: 'end', bottom: 'end' };

/** A placed node's layout settings, read through its spec's roles, as the layout model. */
export function layoutOf(spec: { readonly inputs: Decls }, params: Readonly<Record<string, unknown>>, options: LayoutOfOptions = {}): NodeLayout {
  const outside: string[] = [];
  const byRole = new Map<LayoutRole, string>();
  for (const [name, decl] of Object.entries(spec.inputs)) {
    const role = (decl as { layout?: LayoutRole }).layout;
    if (role) byRole.set(role, name);
    const cls = (decl as { portability?: Portability }).portability;
    const set = params[name] !== undefined && params[name] !== (decl as { default?: unknown }).default;
    if (set && cls && !role && !(name in BOX_NEUTRAL) && (UNMAPPED_CLASSES.includes(cls) || cls === 'layout-expressible')) {
      outside.push(`${name} (${cls}) is set`);
    }
  }
  const has = (role: LayoutRole) => byRole.has(role);
  const value = (role: LayoutRole): unknown => {
    const name = byRole.get(role);
    if (name === undefined) return undefined;
    return params[name] !== undefined ? params[name] : (spec.inputs[name] as { default?: unknown }).default;
  };
  const length = (role: LayoutRole, unit: '%' | 'px') =>
    readLength(value(role), unit, options, (r) => outside.push(`${byRole.get(role)}: ${r}`));
  const px = (role: LayoutRole) => pxOf(length(role, 'px'), byRole.get(role) ?? role, (r) => outside.push(r));

  // ---- the node in its parent (`Layout.size` / `Layout.align`) ----
  const present = value('present') !== false;

  const position = value('place');
  if (position === 'fixed' || position === 'sticky') outside.push(`position is ${position}`);
  const parentAxis = options.parentAxis;
  const overlay = parentAxis === 'overlay' || position === 'absolute' || position === 'fixed';

  const margin: Edges = {
    top: px('margin-top'),
    right: px('margin-right'),
    bottom: px('margin-bottom'),
    left: px('margin-left')
  };

  // Size Mode (`Layout.size` :58-75): which of Width / Height the runtime assigns; the other hugs. A spec with no Size
  // Mode (the Circle, the Icon) assigns what it has.
  const mode = has('size-mode') ? String(value('size-mode')) : 'explicit';
  const assigns = {
    width: mode === 'explicit' || mode === 'contentHeight',
    height: mode === 'explicit' || mode === 'contentWidth'
  };

  const sizeRule = (dim: 'width' | 'height'): SizeRule => {
    if (has('diameter')) {
      const d = length('diameter', 'px');
      return d ? { kind: 'length', length: d } : { kind: 'hug' };
    }
    if (!has(dim) || !assigns[dim]) return { kind: 'hug' };
    const l = length(dim, '%');
    if (!l) return { kind: 'hug' };
    if (!l.percent) return { kind: 'length', length: l };
    // A percent (`Layout.size` :84-108): along the parent's stacking axis it is a basis AND a grow weight (flexGrow =
    // the percent, flexShrink 1) — unless the value is marked fixed; across it, and in an overlay, it is the percent
    // less this node's own margins on that axis (`calc(p% - m1 - m2)`); with no parent layout, a plain percent.
    const fixed = Boolean((params[byRole.get(dim) ?? ''] as { isFixed?: boolean } | undefined)?.isFixed);
    const along = (parentAxis === 'row' && dim === 'width') || (parentAxis === 'column' && dim === 'height');
    const lessMargins = dim === 'width' ? margin.left + margin.right : margin.top + margin.bottom;
    if (!overlay && along && !fixed) return { kind: 'fill', weight: l.percent, basis: { percent: l.percent } };
    if (parentAxis === undefined && !overlay) return { kind: 'length', length: l };
    return { kind: 'length', length: lessMargins ? { percent: l.percent, px: -lessMargins } : { percent: l.percent } };
  };

  const child: {
    -readonly [K in keyof Omit<LayoutChild, 'content'>]: Omit<LayoutChild, 'content'>[K];
  } = { width: sizeRule('width'), height: sizeRule('height'), margin };

  for (const [role, key] of [
    ['min-width', 'minWidth'],
    ['max-width', 'maxWidth'],
    ['min-height', 'minHeight'],
    ['max-height', 'maxHeight']
  ] as const) {
    const l = has(role) ? length(role, '%') : undefined;
    if (l) child[key] = l;
  }

  // Align X / Y (`Layout.align` :116-206).
  const alignX = value('align-x') as string | undefined;
  const alignY = value('align-y') as string | undefined;
  if (overlay) {
    child.place = 'overlay';
    child.overlayAlign = { x: OVERLAY_ALIGN[alignX ?? 'left'] ?? 'start', y: OVERLAY_ALIGN[alignY ?? 'top'] ?? 'start' };
  } else if (parentAxis !== undefined) {
    // On the stacking axis an alignment is an automatic margin — a spacer — on the side the runtime leaves `auto`, and
    // only where that margin is not set (`style.marginRight ? style.marginRight : 'auto'`: 0 counts as not set).
    // Across it, it is the node's own cross alignment.
    const [mainAlign, crossAlign, before, after] =
      parentAxis === 'row'
        ? [alignX, alignY, margin.left, margin.right]
        : [alignY, alignX, margin.top, margin.bottom];
    const startish = parentAxis === 'row' ? 'left' : 'top';
    const endish = parentAxis === 'row' ? 'right' : 'bottom';
    if (mainAlign === startish && !after) child.spacer = { after: true };
    else if (mainAlign === 'center') child.spacer = { before: !before, after: !after };
    else if (mainAlign === endish && !before) child.spacer = { before: true };
    if (crossAlign && SELF_ALIGN[crossAlign]) child.alignSelf = SELF_ALIGN[crossAlign];
  }

  // The transform (`updateTransform` / `updateTransformOrigin`): translate, rotate, scale, about an origin.
  const transform: { -readonly [K in keyof LayoutTransform]: LayoutTransform[K] } = {};
  const tx = has('translate-x') ? length('translate-x', 'px') : undefined;
  const ty = has('translate-y') ? length('translate-y', 'px') : undefined;
  if (tx && (tx.px || tx.percent)) transform.x = tx;
  if (ty && (ty.px || ty.percent)) transform.y = ty;
  const rotation = has('rotation') ? numberOf(value('rotation')) : undefined;
  if (rotation) transform.rotation = rotation;
  const scale = has('scale') ? numberOf(value('scale')) : undefined;
  if (scale !== undefined && scale !== 1) transform.scale = scale;
  if (Object.keys(transform).length > 0) {
    const ox = has('origin-x') ? length('origin-x', '%') : undefined;
    const oy = has('origin-y') ? length('origin-y', '%') : undefined;
    if (ox) transform.originX = ox;
    if (oy) transform.originY = oy;
    child.transform = transform;
  }

  // ---- the node as a parent (the Group: `flexDirection`, `alignItems`, `justifyContent`, gaps, `clip`, scroll) ----
  let parent: Omit<LayoutParent, 'width' | 'height'> | undefined;
  if (has('axis')) {
    const dir = value('axis');
    const axis: LayoutAxis = dir === 'row' ? 'row' : dir === 'none' ? 'overlay' : 'column';
    const borderSide = (side: 'top' | 'right' | 'bottom' | 'left') => {
      const style = (has(`border-${side}-style` as LayoutRole) ? value(`border-${side}-style` as LayoutRole) : undefined) ?? value('border-style');
      if (style === undefined || style === 'none') return 0;
      const w = has(`border-${side}-width` as LayoutRole) && value(`border-${side}-width` as LayoutRole) !== undefined
        ? px(`border-${side}-width` as LayoutRole)
        : px('border-width');
      return w;
    };
    const gap = axis === 'row' ? (has('gap-column') ? px('gap-column') : 0) : axis === 'column' ? (has('gap-row') ? px('gap-row') : 0) : 0;
    parent = {
      axis,
      mainAlign: MAIN_ALIGN[String(value('main-align') ?? 'flex-start')] ?? 'start',
      crossAlign: CROSS_ALIGN[String(value('cross-align') ?? 'flex-start')] ?? 'start',
      gap,
      padding: { top: px('padding-top'), right: px('padding-right'), bottom: px('padding-bottom'), left: px('padding-left') },
      border: { top: borderSide('top'), right: borderSide('right'), bottom: borderSide('bottom'), left: borderSide('left') },
      clip: value('clip') === true,
      scroll: value('scroll') === true
    };
  }

  return { present, child, parent, outside };
}
