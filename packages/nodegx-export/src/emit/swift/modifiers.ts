/**
 * EXP-022. The shared style layer's CSS declarations as SwiftUI: a stack's axis, alignment and spacing for a group, and
 * the modifier chain for any node.
 *
 * The table is the neutral layout model of P110 R2 read the other way: `computeNodeStyle` already reduced a node's
 * parameters to a short CSS vocabulary (29 properties over story-engine's 45 drawn nodes), and each property here is one
 * SwiftUI idiom or a named loss. A property this table does not know is returned in `unmapped` and the preflight prints
 * it as a web-only look; nothing is approximated silently.
 *
 * @module emit/swift/modifiers
 */

import type { Theme } from './theme';

export interface Decl {
  prop: string;
  value: string;
}

/** How a group lays its children out. */
export interface StackLayout {
  axis: 'column' | 'row';
  wrap: boolean;
  /** SwiftUI's cross-axis alignment: `.leading`/`.center`/`.trailing` for a column, `.top`/`.center`/`.bottom` for a row. */
  alignment: string;
  /** CSS `align-items: stretch` (the default): each child takes the cross axis's full extent. */
  stretch: boolean;
  /** Along the axis (`row-gap` in a column, `column-gap` in a row); a wrap layout reads both. */
  spacing: string;
  crossSpacing: string;
}

export interface SwiftStyle {
  /** Applied innermost-first: content, padding, frame, background, border. */
  modifiers: string[];
  /** The text half (font, color, tracking, leading, case) and the box half (padding, frame, background, border). */
  content: string[];
  box: string[];
  /** The `color` modifier alone, so a bound color can replace it (SwiftUI's innermost foregroundStyle wins). */
  colorModifier?: string;
  stack?: StackLayout;
  /** `prop: value` pairs the table does not carry, for the preflight. */
  unmapped: string[];
  /**
   * P18-EXP022-S6-NOOVERLAY. `position: fixed` at the top left, the whole width and height: the web's modal scrim, drawn
   * over everything. The view prints it as a full-screen cover (`fixedOverlay`); the style here fills what it is given.
   */
  overlay?: true;
}

/**
 * Properties that have no SwiftUI counterpart because SwiftUI already behaves that way, so dropping them loses nothing:
 * text wraps by default, a stack is a flex box, and a margin of zero is no margin.
 */
const NO_OP = new Set(['display:flex', 'margin:0', 'overflow-wrap:anywhere', 'white-space:pre-wrap', 'white-space:normal']);

function sideList(value: string): string[] {
  const parts = value.trim().split(/\s+/);
  if (parts.length === 1) return [parts[0], parts[0], parts[0], parts[0]];
  if (parts.length === 2) return [parts[0], parts[1], parts[0], parts[1]];
  if (parts.length === 3) return [parts[0], parts[1], parts[2], parts[1]];
  return parts.slice(0, 4);
}

/** `1px solid #ccc` → width, color (style other than `solid` is unmapped). */
function readBorder(value: string, theme: Theme): { width: string; color: string } | null {
  const m = /^(\S+)\s+solid\s+(.+)$/.exec(value.trim());
  if (!m) return null;
  const w = theme.read(m[1]);
  const c = theme.read(m[2]);
  if (w.kind !== 'number' || c.kind !== 'color') return null;
  return { width: w.swift, color: c.swift };
}

/**
 * One node's declarations as SwiftUI. `role` decides what a text-ish declaration applies to (a group has no font of
 * its own) and whether `display/flex-direction/align-items/*-gap` describe a stack.
 */
export function swiftStyle(decls: Decl[], role: string, theme: Theme): SwiftStyle {
  const unmapped: string[] = [];
  const by = new Map<string, string>();
  for (const d of decls) by.set(d.prop, d.value);
  const consumed = new Set<string>();
  const take = (prop: string): string | undefined => {
    consumed.add(prop);
    return by.get(prop);
  };
  const num = (prop: string): string | undefined => {
    const raw = take(prop);
    if (raw === undefined) return undefined;
    const v = theme.read(raw);
    if (v.kind === 'number' && v.unit === 'px') return v.swift;
    unmapped.push(`${prop}: ${raw}`);
    return undefined;
  };

  const content: string[] = [];
  const isStack = role === 'group' || role === 'page';
  let stack: StackLayout | undefined;
  if (isStack) {
    take('display');
    const axis = take('flex-direction') === 'row' ? 'row' : 'column';
    const wrap = take('flex-wrap') === 'wrap';
    const align = take('align-items') ?? 'stretch';
    const alignment =
      align === 'center' ? '.center' : align === 'flex-end' ? (axis === 'column' ? '.trailing' : '.bottom') : axis === 'column' ? '.leading' : '.top';
    const gap = (prop: string) => {
      const raw = take(prop);
      if (raw === undefined) return '0';
      const v = theme.read(raw);
      if (v.kind === 'number' && v.unit === 'px') return v.swift;
      unmapped.push(`${prop}: ${raw}`);
      return '0';
    };
    const rowGap = gap('row-gap');
    const columnGap = gap('column-gap');
    stack = {
      axis,
      wrap,
      alignment,
      stretch: align === 'stretch',
      spacing: axis === 'column' ? rowGap : columnGap,
      crossSpacing: axis === 'column' ? columnGap : rowGap
    };
  }

  // Text: font, color, tracking, leading, case.
  const sizeRaw = take('font-size');
  const size = sizeRaw === undefined ? undefined : theme.read(sizeRaw);
  const weightRaw = take('font-weight');
  const weight = weightRaw === undefined ? undefined : theme.read(weightRaw);
  const familyRaw = take('font-family');
  const family = familyRaw === undefined ? undefined : theme.read(familyRaw);
  const sizeSwift = size?.kind === 'number' && size.unit === 'px' ? size.swift : undefined;
  if (sizeRaw !== undefined && sizeSwift === undefined) unmapped.push(`font-size: ${sizeRaw}`);
  if (weightRaw !== undefined && weight?.kind !== 'weight') unmapped.push(`font-weight: ${weightRaw}`);
  if (familyRaw !== undefined && family?.kind !== 'design') unmapped.push(`font-family: ${familyRaw}`);
  if (sizeSwift !== undefined || weight?.kind === 'weight' || family?.kind === 'design') {
    const args = [`size: ${sizeSwift ?? '17'}`];
    if (weight?.kind === 'weight') args.push(`weight: ${weight.swift}`);
    if (family?.kind === 'design') args.push(`design: ${family.swift}`);
    content.push(`.font(.system(${args.join(', ')}))`);
  }
  let colorModifier: string | undefined;
  const color = take('color');
  if (color !== undefined) {
    const c = theme.read(color);
    if (c.kind === 'color') {
      colorModifier = `.foregroundStyle(${c.swift})`;
      content.push(colorModifier);
    }
    else unmapped.push(`color: ${color}`);
  }
  const tracking = take('letter-spacing');
  if (tracking !== undefined) {
    const t = theme.read(tracking);
    if (t.kind === 'number' && t.unit === 'em') content.push(`.tracking(${t.swift} * ${sizeSwift ?? '17'})`);
    else if (t.kind === 'number' && t.unit === 'px') content.push(`.tracking(${t.swift})`);
    else unmapped.push(`letter-spacing: ${tracking}`);
  }
  const leading = take('line-height');
  if (leading !== undefined) {
    const l = theme.read(leading);
    // CSS line-height is the whole line; SwiftUI's lineSpacing is the gap added between lines.
    if (l.kind === 'number' && l.unit === 'unitless') content.push(`.lineSpacing((${l.swift} - 1.2) * ${sizeSwift ?? '17'})`);
    else if (l.kind === 'number' && l.unit === 'px') content.push(`.lineSpacing(${l.swift} - 1.2 * ${sizeSwift ?? '17'})`);
    else unmapped.push(`line-height: ${leading}`);
  }
  const transform = take('text-transform');
  if (transform === 'uppercase') content.push('.textCase(.uppercase)');
  else if (transform === 'lowercase') content.push('.textCase(.lowercase)');
  else if (transform !== undefined) unmapped.push(`text-transform: ${transform}`);
  const whiteSpace = take('white-space');
  // `pre`: the text keeps its own line breaks and does not wrap — one line, as the browser draws a short label.
  if (whiteSpace === 'pre' || whiteSpace === 'nowrap') content.push('.lineLimit(1)', '.fixedSize(horizontal: true, vertical: false)');
  else if (whiteSpace !== undefined && !NO_OP.has(`white-space:${whiteSpace}`)) unmapped.push(`white-space: ${whiteSpace}`);

  // Padding.
  const padding: Record<'top' | 'trailing' | 'bottom' | 'leading', string | undefined> = {
    top: undefined,
    trailing: undefined,
    bottom: undefined,
    leading: undefined
  };
  const all = take('padding');
  if (all !== undefined) {
    const [t, r, b, l] = sideList(all).map((s) => theme.read(s));
    const px = (v: ReturnType<Theme['read']>) => (v.kind === 'number' && v.unit === 'px' ? v.swift : undefined);
    padding.top = px(t);
    padding.trailing = px(r);
    padding.bottom = px(b);
    padding.leading = px(l);
    if ([t, r, b, l].some((v) => px(v) === undefined)) unmapped.push(`padding: ${all}`);
  }
  for (const [prop, side] of [
    ['padding-top', 'top'],
    ['padding-right', 'trailing'],
    ['padding-bottom', 'bottom'],
    ['padding-left', 'leading']
  ] as const) {
    const v = num(prop);
    if (v !== undefined) padding[side] = v;
  }
  const box: string[] = [];
  const sides = Object.entries(padding).filter(([, v]) => v !== undefined) as Array<[string, string]>;
  if (sides.length === 4 && new Set(sides.map(([, v]) => v)).size === 1) box.push(`.padding(${sides[0][1]})`);
  else {
    const h = padding.leading !== undefined && padding.leading === padding.trailing;
    const v = padding.top !== undefined && padding.top === padding.bottom;
    if (h) box.push(`.padding(.horizontal, ${padding.leading})`);
    if (v) box.push(`.padding(.vertical, ${padding.top})`);
    for (const [side, value] of sides) {
      if (h && (side === 'leading' || side === 'trailing')) continue;
      if (v && (side === 'top' || side === 'bottom')) continue;
      box.push(`.padding(.${side}, ${value})`);
    }
  }

  // P18-EXP022-S6-NOOVERLAY. The full-screen scrim idiom, whole: fixed, at 0 0, 100% by 100% (a stacking order beside it
  // has nothing to order on a cover). Any other fixed element stays a named loss.
  const zero = (prop: string) => /^0(px)?$/.test(by.get(prop) ?? '');
  const overlay = by.get('position') === 'fixed' && zero('top') && zero('left') && by.get('width') === '100%' && by.get('height') === '100%';
  if (overlay) for (const prop of ['position', 'top', 'left', 'width', 'height', 'z-index']) take(prop);
  // The frame below centres its content, which is what `justify-content: center` asks of the scrim's column.
  if (overlay && by.get('justify-content') === 'center') take('justify-content');

  // Size. `width: 100%` fills the parent; `max-width` caps it; fixed sizes are fixed.
  const widthRaw = overlay ? undefined : take('width');
  const maxWidth = num('max-width');
  const height = overlay ? undefined : num('height');
  let fill = false;
  let fixedWidth: string | undefined;
  if (widthRaw === '100%') fill = true;
  else if (widthRaw !== undefined) {
    const w = theme.read(widthRaw);
    if (w.kind === 'number' && w.unit === 'px') fixedWidth = w.swift;
    else unmapped.push(`width: ${widthRaw}`);
  }
  const frameAlignment = stack?.alignment === '.center' ? '.center' : '.leading';
  if (fixedWidth !== undefined || height !== undefined) {
    const args = [];
    if (fixedWidth !== undefined) args.push(`width: ${fixedWidth}`);
    if (height !== undefined) args.push(`height: ${height}`);
    box.push(`.frame(${args.join(', ')}, alignment: .topLeading)`);
  }
  if (fill || maxWidth !== undefined) box.push(`.frame(maxWidth: ${maxWidth ?? '.infinity'}, alignment: ${frameAlignment})`);
  if (overlay) box.push('.frame(maxWidth: .infinity, maxHeight: .infinity)');

  // Background and border, sharing a corner radius.
  const radiusRaw = take('border-radius');
  let radius: string | undefined;
  if (radiusRaw !== undefined) {
    const r = theme.read(radiusRaw);
    if (r.kind === 'number' && r.unit === 'px') radius = r.value >= 999 ? '999' : r.swift;
    else unmapped.push(`border-radius: ${radiusRaw}`);
  }
  const shape = radius !== undefined ? `RoundedRectangle(cornerRadius: ${radius})` : 'Rectangle()';
  const bg = take('background-color');
  if (bg !== undefined) {
    const c = theme.read(bg);
    if (c.kind === 'color') {
      if (c.swift !== 'Color.clear') box.push(radius !== undefined ? `.background(${c.swift}, in: ${shape})` : `.background(${c.swift})`);
    } else unmapped.push(`background-color: ${bg}`);
  }
  const border = take('border');
  if (border !== undefined) {
    const b = readBorder(border, theme);
    if (b) box.push(`.overlay(${shape}.strokeBorder(${b.color}, lineWidth: ${b.width}))`);
    else unmapped.push(`border: ${border}`);
  }
  const borderStyle = take('border-style');
  if (borderStyle !== undefined && borderStyle !== 'none') unmapped.push(`border-style: ${borderStyle}`);
  const borderLeft = take('border-left');
  if (borderLeft !== undefined) {
    const b = readBorder(borderLeft, theme);
    if (b) box.push(`.overlay(alignment: .leading) { Rectangle().fill(${b.color}).frame(width: ${b.width}) }`);
    else unmapped.push(`border-left: ${borderLeft}`);
  }

  for (const d of decls) {
    if (consumed.has(d.prop)) continue;
    if (NO_OP.has(`${d.prop}:${d.value}`)) continue;
    unmapped.push(`${d.prop}: ${d.value}`);
  }
  return { modifiers: [...content, ...box], content, box, colorModifier, stack, unmapped, ...(overlay ? { overlay: true as const } : {}) };
}
