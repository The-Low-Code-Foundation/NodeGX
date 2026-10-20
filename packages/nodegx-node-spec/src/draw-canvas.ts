/**
 * P112 OWN-012 step 2 — a canvas text measurer for the drawer (draw.ts): the one input the layout model leaves to the
 * caller is a leaf's content size, and in a page a 2D canvas can measure text in the font the system resolves.
 *
 * It reads what the Text and Button specs' ports say (Text, Font Size, Font Family, Font Weight, Letter Spacing, Line
 * Height, Case, Numerals; a Button's Label and paddings) and nothing else — no CSS, no element. Every value a port
 * leaves open is reported as a need on the node, and every setting the canvas cannot honour as a limit (measured in
 * OWN-012 §6 s1: Numerals tabular-nums is 269.09 px against 258.69 for "24:59" at 104 px — a canvas has no
 * font-feature setting). A node type it does not know returns `undefined`, and the drawer reports the need.
 *
 * Typed against the two members of `CanvasRenderingContext2D` it uses, so this file compiles without the DOM library;
 * pass `document.createElement('canvas').getContext('2d')`.
 */
import type { FileNode, MeasureContent } from './draw';

export interface TextMetricsLike {
  readonly width: number;
  readonly fontBoundingBoxAscent?: number;
  readonly fontBoundingBoxDescent?: number;
}
export interface Canvas2DLike {
  font: string;
  letterSpacing?: string;
  measureText(text: string): TextMetricsLike;
}

export interface CanvasMeasurerOptions {
  readonly context: Canvas2DLike;
  /** A design token's stored value (`--text-sm` → `'14px'`, `--font-semibold` → `'600'`, `--leading-snug` → `'1.375'`). */
  readonly token?: (name: string) => string | number | undefined;
}

const TEXT = 'Text';
const BUTTON = 'net.noodl.controls.button';
const TEXT_INPUT = 'net.noodl.controls.textinput';

/** `var(--x)` → the token's value, else the value as it came. Reports a token it could not resolve. */
function resolve(raw: unknown, token: CanvasMeasurerOptions['token'], why: (r: string) => void): unknown {
  if (typeof raw !== 'string') return raw;
  const m = /^var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)$/.exec(raw.trim());
  if (!m) return raw;
  const v = token?.(m[1]);
  if (v !== undefined) return resolve(v, token, why);
  if (m[2] !== undefined) return resolve(m[2].trim(), token, why);
  why(`the token ${m[1]} has no value here`);
  return undefined;
}

/** A px length: a number, `{ value, unit }`, `"12px"`; a unitless string is a number. */
function pxOf(v: unknown): number | undefined {
  if (v === undefined || v === null || v === '' || v === 'Auto') return undefined;
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  if (typeof v === 'object' && v !== null && 'value' in v) return pxOf((v as { value: unknown }).value);
  if (typeof v === 'string') {
    const m = /^(-?\d*\.?\d+)\s*(px)?$/i.exec(v.trim());
    return m ? Number(m[1]) : undefined;
  }
  return undefined;
}

/** Whether a stored value is a bare number (a line height that multiplies the font size). */
function unitless(v: unknown): boolean {
  if (typeof v === 'number') return true;
  if (typeof v === 'string') return /^\d*\.?\d+$/.test(v.trim());
  if (typeof v === 'object' && v !== null && 'value' in v) return !(v as { unit?: unknown }).unit || (v as { unit?: unknown }).unit === '';
  return false;
}

/** A measurer over one canvas context. */
export function canvasTextMeasurer(options: CanvasMeasurerOptions): MeasureContent {
  const { context } = options;
  return (node: FileNode, read) => {
    if (node.type !== TEXT && node.type !== BUTTON && node.type !== TEXT_INPUT) return undefined;
    const needs: string[] = [];
    const limits: string[] = [];
    const get = (port: string) => resolve(read(port), options.token, (r) => needs.push(`${port}: ${r}`));

    let size = pxOf(get('fontSize'));
    if (size === undefined) {
      size = 16;
      needs.push("Font Size has no default in the spec; 16 px assumed (the browser's)");
    }
    let family = get('fontFamily');
    if (!family || typeof family !== 'string') {
      family = 'system-ui';
      needs.push('Font Family has no default in the spec; system-ui assumed');
    }
    const weightRaw = get('fontWeight');
    const weight = weightRaw === 'Auto' || weightRaw === undefined || weightRaw === '' ? 400 : weightRaw;
    const spacing = pxOf(get('letterSpacing')) ?? 0;

    let text = node.type === TEXT ? String(get('text') ?? '') : node.type === BUTTON ? (get('useLabel') === false ? '' : String(get('label') ?? '')) : String(get('value') ?? get('placeholder') ?? '');
    const tt = get('textTransform');
    if (tt === 'uppercase') text = text.toUpperCase();
    else if (tt === 'lowercase') text = text.toLowerCase();
    else if (tt === 'capitalize') text = text.replace(/\b\p{L}/gu, (c) => c.toUpperCase());
    if (get('fontVariantNumeric') === 'tabular-nums') limits.push('Numerals is tabular-nums: a canvas measures proportional digits (no font-feature setting)');

    context.font = `${weight} ${size}px ${family}`;
    if ('letterSpacing' in context) context.letterSpacing = spacing + 'px';
    const m = context.measureText(text);
    let width = m.width;
    if (!('letterSpacing' in context) && spacing) width += spacing * text.length;

    const lh = get('lineHeight');
    let line: number;
    if (lh === 'Auto' || lh === undefined || lh === '') {
      line = (m.fontBoundingBoxAscent ?? size * 0.95) + (m.fontBoundingBoxDescent ?? size * 0.25);
      needs.push("Line Height Auto is the font's own (its ascent + descent, read from the font by the canvas)");
    } else {
      const n = pxOf(lh) ?? 1.2;
      line = unitless(lh) ? n * size : n;
    }
    needs.push('the text measured by a canvas in the font the system resolves, not by the model');

    if (node.type === TEXT) return { size: { width, height: line }, needs, limits };

    // A control's content is its border box: the label, the paddings its ports name, and its border when it has one.
    const pad = (port: string) => pxOf(get(port)) ?? 0;
    const borderOn = get('borderStyle') !== undefined && get('borderStyle') !== 'none';
    const border = borderOn ? pxOf(get('borderWidth')) ?? 0 : 0;
    if (node.type === BUTTON && get('useIcon') === true) limits.push('Enable Icon is on: the icon and its spacing are not measured');
    let above = 0;
    if (node.type === TEXT_INPUT) {
      if (text === '') needs.push("an empty Text Input's content width is the browser's own (its default size), not measured");
      else needs.push('a Text Input is measured as its text: the browser gives it a width of its own');
      // Enable Label: "a label is drawn above the field" (the spec's useLabel rule), its Spacing between it and the field
      if (get('useLabel') === true) {
        const labelSize = pxOf(get('labelfontSize')) ?? size;
        const lw = get('labelfontWeight');
        const lf = get('labelfontFamily');
        context.font = `${lw === 'Auto' || lw === undefined || lw === '' ? 400 : lw} ${labelSize}px ${typeof lf === 'string' && lf ? lf : family}`;
        const lm = context.measureText(String(get('label') ?? ''));
        const llh = get('labellineHeight');
        const labelLine = llh === 'Auto' || llh === undefined || llh === '' ? (lm.fontBoundingBoxAscent ?? labelSize * 0.95) + (lm.fontBoundingBoxDescent ?? labelSize * 0.25) : unitless(llh) ? (pxOf(llh) ?? 1.2) * labelSize : pxOf(llh) ?? labelSize * 1.2;
        above = labelLine + (pxOf(get('labelSpacing')) ?? 0);
        needs.push("the label above the field: its line is the font's own and its Spacing the port's; the browser draws the field's own line box below it");
      }
    }
    return {
      size: { width: width + pad('paddingLeft') + pad('paddingRight') + 2 * border, height: above + line + pad('paddingTop') + pad('paddingBottom') + 2 * border },
      needs,
      limits
    };
  };
}
