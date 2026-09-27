/**
 * P102 CMP-004 — the easing and duration codecs.
 *
 * Easing: `linear`, or `cubic-bezier(a, b, c, d)` in the spacing the defaults use. `ease`,
 * `ease-in`, `steps()` and the rest refuse to text mode. Duration: `<n>ms`; `s` refuses (CMP-006
 * counts it; if common, the codec learns to write `s` back as `s`).
 */
import { readCssNumber } from './split';
import { presetNamed, TokenCodec, TokenPreset } from './types';

// ─── Easing ──────────────────────────────────────────────────────────────────

export type EasingModel = { kind: 'linear' } | { kind: 'bezier'; points: [number, number, number, number] };

/** Exactly the five defaults' values, plus *Natural*. */
export const EASING_PRESETS: TokenPreset[] = [
  { name: 'Steady', value: 'linear' },
  { name: 'Speeds up', value: 'cubic-bezier(0.4, 0, 1, 1)' },
  { name: 'Slows at the end', value: 'cubic-bezier(0, 0, 0.2, 1)' },
  { name: 'Smooth both ends', value: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  { name: 'Bouncy', value: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)' },
  { name: 'Natural', value: 'cubic-bezier(0.25, 0.1, 0.25, 1)' }
];

const EASING_WORDS: Record<string, string> = {
  Steady: 'the same speed all the way',
  'Speeds up': 'starts slow, leaves quickly',
  'Slows at the end': 'starts fast, eases into place',
  'Smooth both ends': 'eases in and eases out',
  Bouncy: 'overshoots a little, then settles',
  Natural: 'a gentle start and a soft landing'
};

const BEZIER = /^cubic-bezier\((.*)\)$/;

export function decodeEasing(value: string): EasingModel | null {
  if (value === 'linear') return { kind: 'linear' };
  const m = BEZIER.exec(value);
  if (!m) return null;
  const parts = m[1].split(', ');
  if (parts.length !== 4) return null;
  const nums = parts.map(readCssNumber);
  if (nums.some((n) => n === null)) return null;
  const points = nums as [number, number, number, number];
  // The x control points must be inside 0–1 for a bezier to be a timing function at all.
  if (points[0] < 0 || points[0] > 1 || points[2] < 0 || points[2] > 1) return null;
  const model: EasingModel = { kind: 'bezier', points };
  if (encodeEasing(model) !== value) return null;
  return model;
}

export function encodeEasing(model: EasingModel): string {
  if (model.kind === 'linear') return 'linear';
  return `cubic-bezier(${model.points.join(', ')})`;
}

export function easingPresetName(model: EasingModel): string | null {
  return presetNamed(EASING_PRESETS, encodeEasing(model));
}

/** *"Slows at the end · starts fast, eases into place"*, or *"Your own curve"*. */
export function describeEasing(model: EasingModel): string {
  const preset = easingPresetName(model);
  if (preset) return `${preset} · ${EASING_WORDS[preset]}`;
  return 'Your own curve';
}

/** The control points a tile draws, `linear` included. */
export function easingPoints(model: EasingModel): [number, number, number, number] {
  return model.kind === 'linear' ? [0, 0, 1, 1] : model.points;
}

export const easingCodec: TokenCodec<EasingModel> = {
  decode: decodeEasing,
  encode: encodeEasing,
  describe: describeEasing,
  presets: EASING_PRESETS
};

// ─── Duration ────────────────────────────────────────────────────────────────

export interface DurationModel {
  ms: number;
}

export const DURATION_PRESETS: TokenPreset[] = [
  { name: 'Instant', value: '75ms' },
  { name: 'Quick', value: '150ms' },
  { name: 'Normal', value: '300ms' },
  { name: 'Slow', value: '500ms' },
  { name: 'Leisurely', value: '1000ms' }
];

const MS = /^([0-9.]+)ms$/;

export function decodeDuration(value: string): DurationModel | null {
  const m = MS.exec(value);
  if (!m) return null;
  const ms = readCssNumber(m[1]);
  if (ms === null || ms < 0) return null;
  const model = { ms };
  if (encodeDuration(model) !== value) return null;
  return model;
}

export function encodeDuration(model: DurationModel): string {
  return `${model.ms}ms`;
}

/** *"Feels instant."* and what that speed is good for. */
export function durationFeel(ms: number): { feel: string; use: string } {
  if (ms <= 100) return { feel: 'Feels instant.', use: 'Good for tiny changes, like a colour on hover.' };
  if (ms <= 200)
    return { feel: 'Quick.', use: 'Good for buttons, toggles and hovers: you see it move, but never wait for it.' };
  if (ms <= 400) return { feel: 'Noticeable.', use: 'Good for menus, panels and things sliding in.' };
  if (ms <= 700) return { feel: 'Slow.', use: 'Good for page changes and big reveals.' };
  return { feel: 'Very slow.', use: 'People will wait for this. Save it for moments of emphasis.' };
}

/** *"Quick · 150 ms"*, or *"325 ms · noticeable"*. */
export function describeDuration(model: DurationModel): string {
  const preset = presetNamed(DURATION_PRESETS, encodeDuration(model));
  if (preset) return `${preset} · ${model.ms} ms`;
  const feel = durationFeel(model.ms).feel.replace(/\.$/, '').toLowerCase();
  return `${model.ms} ms · ${feel}`;
}

export const durationCodec: TokenCodec<DurationModel> = {
  decode: decodeDuration,
  encode: encodeDuration,
  describe: describeDuration,
  presets: DURATION_PRESETS
};
