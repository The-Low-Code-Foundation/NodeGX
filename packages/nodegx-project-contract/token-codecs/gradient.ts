/**
 * P102 CMP-003 — the gradient codec.
 *
 * Two shapes, the ones the defaults use:
 *
 *   linear-gradient([<direction>, ]<stop>, <stop>[, …])
 *   radial-gradient([<w>% <h>% at <x>% <y>%, ]<stop>, <stop>[, …])
 *
 * A direction (RC-6c) is an angle `<n>deg` or a keyword `to <side>[ <side>]`; the model keeps
 * which spelling it was given and the arrows write that spelling back. A value with no direction
 * is kept as *no direction*. A stop is a colour and an **optional** `<n>%` position (RC-6b); a
 * stop with none encodes with none. Positions may be outside 0–100 (`--gradient-brand` stops at
 * 115%).
 *
 * Refused (`null`, text mode — CMP-003 §3): `conic-`, `repeating-`, a radial with a
 * `circle`/`ellipse` keyword or a named size, a colour-hint stop, a stop with two positions, a
 * `var()` as a position, fewer than two stops, and any spelling the writer would change.
 */
import { ColourValue, decodeColour, describeColour, encodeColour } from './colour';
import { readCssNumber, splitCommaList, splitTopLevel } from './split';
import { presetNamed, TokenCodec, TokenPreset } from './types';

export type GradientSide = 'top' | 'bottom' | 'left' | 'right';

export type GradientDirection =
  | { kind: 'angle'; deg: number }
  | { kind: 'keyword'; sides: [GradientSide] | [GradientSide, GradientSide] };

export interface GradientStop {
  colour: ColourValue;
  /** Percent, may be outside 0–100. Absent = "let the browser space it". */
  position?: number;
}

export interface RadialShape {
  w: number;
  h: number;
  x: number;
  y: number;
}

export type GradientModel =
  | { kind: 'linear'; direction: GradientDirection | null; stops: GradientStop[] }
  | { kind: 'radial'; shape: RadialShape | null; stops: GradientStop[] };

/**
 * The first five are **exactly** the five defaults' values; *Glow* and *Horizon* are built only
 * from project colours and Clear (RC-2).
 */
export const GRADIENT_PRESETS: TokenPreset[] = [
  {
    name: 'Brand',
    value: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 45%, var(--foreground) 115%)'
  },
  { name: 'Deep', value: 'linear-gradient(160deg, var(--foreground) 0%, var(--primary-hover) 100%)' },
  { name: 'Spotlight', value: 'radial-gradient(90% 120% at 20% 0%, var(--primary) 0%, var(--foreground) 70%)' },
  { name: 'Surface', value: 'linear-gradient(180deg, var(--surface) 0%, var(--background) 100%)' },
  { name: 'Scrim', value: 'linear-gradient(180deg, rgb(0 0 0 / 0.15) 0%, rgb(0 0 0 / 0.78) 100%)' },
  { name: 'Glow', value: 'radial-gradient(80% 80% at 50% 50%, var(--primary) 0%, transparent 70%)' },
  { name: 'Horizon', value: 'linear-gradient(180deg, var(--accent) 0%, transparent 60%)' }
];

const SIDES: GradientSide[] = ['top', 'bottom', 'left', 'right'];
const ANGLE = /^(-?[0-9.]+)deg$/;
const PERCENT = /^(-?[0-9.]+)%$/;

function readPercent(text: string): number | null {
  const m = PERCENT.exec(text);
  if (!m) return null;
  return readCssNumber(m[1]);
}

function decodeDirection(text: string): GradientDirection | null {
  const angle = ANGLE.exec(text);
  if (angle) {
    const deg = readCssNumber(angle[1]);
    return deg === null ? null : { kind: 'angle', deg };
  }
  const words = text.split(' ');
  if (words[0] !== 'to' || words.length < 2 || words.length > 3) return null;
  const sides = words.slice(1) as GradientSide[];
  if (!sides.every((s) => SIDES.includes(s))) return null;
  if (sides.length === 2) {
    const vertical = (s: GradientSide) => s === 'top' || s === 'bottom';
    // `to top bottom` is not a corner.
    if (vertical(sides[0]) === vertical(sides[1])) return null;
    return { kind: 'keyword', sides: [sides[0], sides[1]] };
  }
  return { kind: 'keyword', sides: [sides[0]] };
}

export function encodeDirection(direction: GradientDirection): string {
  if (direction.kind === 'angle') return `${direction.deg}deg`;
  return `to ${direction.sides.join(' ')}`;
}

function decodeShape(text: string): RadialShape | null {
  const parts = text.split(' ');
  if (parts.length !== 5 || parts[2] !== 'at') return null;
  const [w, h, , x, y] = parts.map((p, i) => (i === 2 ? 0 : readPercent(p)));
  if (w === null || h === null || x === null || y === null) return null;
  return { w, h, x, y };
}

export function encodeShape(shape: RadialShape): string {
  return `${shape.w}% ${shape.h}% at ${shape.x}% ${shape.y}%`;
}

function decodeStop(text: string): GradientStop | null {
  const parts = splitTopLevel(text, ' ');
  if (!parts || parts.length === 0 || parts.length > 2) return null;
  const colour = decodeColour(parts[0]);
  if (!colour) return null;
  if (parts.length === 1) return { colour };
  const position = readPercent(parts[1]);
  if (position === null) return null;
  return { colour, position };
}

function encodeStop(stop: GradientStop): string {
  const colour = encodeColour(stop.colour);
  return stop.position === undefined ? colour : `${colour} ${stop.position}%`;
}

export function encodeGradient(model: GradientModel): string {
  const stops = model.stops.map(encodeStop);
  if (model.kind === 'linear') {
    const head = model.direction ? [encodeDirection(model.direction)] : [];
    return `linear-gradient(${[...head, ...stops].join(', ')})`;
  }
  const head = model.shape ? [encodeShape(model.shape)] : [];
  return `radial-gradient(${[...head, ...stops].join(', ')})`;
}

export function decodeGradient(value: string): GradientModel | null {
  const m = /^(linear|radial)-gradient\((.*)\)$/.exec(value);
  if (!m) return null;
  const kind = m[1] as 'linear' | 'radial';
  const args = splitCommaList(m[2]);
  if (!args || args.length === 0) return null;

  let model: GradientModel;
  if (kind === 'linear') {
    // The first argument is a direction when it reads as one; otherwise every argument is a stop.
    // A stop that happens to start with `to` cannot be a colour, so there is no ambiguity.
    const direction = decodeDirection(args[0]);
    const stopTexts = direction ? args.slice(1) : args;
    const stops = readStops(stopTexts);
    if (!stops) return null;
    model = { kind, direction, stops };
  } else {
    const shape = decodeShape(args[0]);
    const stopTexts = shape ? args.slice(1) : args;
    const stops = readStops(stopTexts);
    if (!stops) return null;
    model = { kind, shape, stops };
  }

  if (encodeGradient(model) !== value) return null;
  return model;
}

function readStops(texts: string[]): GradientStop[] | null {
  if (texts.length < 2) return null;
  const stops: GradientStop[] = [];
  for (const t of texts) {
    const stop = decodeStop(t);
    if (!stop) return null;
    stops.push(stop);
  }
  return stops;
}

// ─── Words ───────────────────────────────────────────────────────────────────

const TOWARDS: Record<string, string> = {
  top: 'the top',
  'top right': 'the top right',
  right: 'the right',
  'bottom right': 'the bottom right',
  bottom: 'the bottom',
  'bottom left': 'the bottom left',
  left: 'the left',
  'top left': 'the top left'
};

/** The compass name for a direction, or `null` when an angle sits between arrows. */
export function directionArrow(direction: GradientDirection | null): string | null {
  if (!direction) return 'bottom';
  if (direction.kind === 'keyword') {
    const sides = [...direction.sides];
    // Normalise `to right top` → `top right` for the arrow lookup.
    const vertical = sides.find((s) => s === 'top' || s === 'bottom');
    const horizontal = sides.find((s) => s === 'left' || s === 'right');
    return [vertical, horizontal].filter(Boolean).join(' ');
  }
  const deg = ((direction.deg % 360) + 360) % 360;
  const names = ['top', 'top right', 'right', 'bottom right', 'bottom', 'bottom left', 'left', 'top left'];
  if (deg % 45 !== 0) return null;
  return names[deg / 45];
}

/** The angle an arrow stands for, for the Angle slider and for writing an angle back. */
export const ARROW_ANGLES: Record<string, number> = {
  top: 0,
  'top right': 45,
  right: 90,
  'bottom right': 135,
  bottom: 180,
  'bottom left': 225,
  left: 270,
  'top left': 315
};

/** *"glows from the top left"* — where a radial's centre sits, in words. */
export function spotWords(shape: RadialShape | null): string {
  if (!shape) return 'the middle';
  const col = shape.x < 34 ? 'left' : shape.x > 66 ? 'right' : 'centre';
  const row = shape.y < 34 ? 'top' : shape.y > 66 ? 'bottom' : 'middle';
  if (row === 'middle' && col === 'centre') return 'the middle';
  if (row === 'middle') return `the ${col}`;
  if (col === 'centre') return `the ${row}`;
  return `the ${row} ${col}`;
}

function stopWords(stops: GradientStop[]): string {
  const pickable = stops.every((s) => s.colour.kind !== 'literal');
  if (pickable && stops.length <= 3) return stops.map((s) => describeColour(s.colour)).join(' → ');
  return `${stops.length} colours`;
}

/** *"Linear · Primary → Foreground · fades towards the bottom right"*, *"Radial · 2 colours · glows from the top"*. */
export function describeGradient(model: GradientModel): string {
  if (model.kind === 'linear') {
    const arrow = directionArrow(model.direction);
    const towards = arrow ? TOWARDS[arrow] : `${(model.direction as { deg: number }).deg}°`;
    const where = model.direction === null || arrow === 'bottom' ? '' : ` · fades towards ${towards}`;
    return `Linear · ${stopWords(model.stops)}${where}`;
  }
  return `Radial · ${stopWords(model.stops)} · glows from ${spotWords(model.shape)}`;
}

export function gradientPresetName(model: GradientModel): string | null {
  return presetNamed(GRADIENT_PRESETS, encodeGradient(model));
}

export const gradientCodec: TokenCodec<GradientModel> = {
  decode: decodeGradient,
  encode: encodeGradient,
  describe: describeGradient,
  presets: GRADIENT_PRESETS
};
