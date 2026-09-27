/**
 * P102 CMP-002 — the shadow codec.
 *
 * Reads a `box-shadow` value into layers and writes it back byte-identical. One layer is
 * `[inset] <x> <y> [<blur> [<spread>]] <colour>`, in that order, lengths in `px` (or a bare `0`),
 * the colour last and exactly one of it. Layers are joined by `, `. `none` is zero layers.
 *
 * Refused (`null`, text mode — CMP-002 §3): `em`/`rem`/`%` lengths, the colour before the
 * lengths, more than four lengths, two colours, a layer with no colour, `inset` anywhere but
 * first, anything unbalanced, and any value whose spelling the writer would change.
 *
 * Kept (RC-6a): a colour that is not black, white, clear or a token — the Playful Look's
 * `rgb(139 92 246 / 0.15)`, a `#hex`, an `rgba(0,0,0,.1)` — rides through as a literal.
 */
import { ColourValue, decodeColour, describeColour, encodeColour } from './colour';
import { readPxLength, writePxLength } from './length';
import { splitCommaList, splitTopLevel } from './split';
import { presetNamed, px, PxLength, TokenCodec, TokenPreset } from './types';

export interface ShadowLayer {
  inset: boolean;
  x: PxLength;
  y: PxLength;
  /** Absent when the value gave two lengths only. */
  blur?: PxLength;
  /** Absent when the value gave three lengths or fewer. */
  spread?: PxLength;
  colour: ColourValue;
}

export interface ShadowModel {
  layers: ShadowLayer[];
}

/**
 * The first seven are **exactly** the seven defaults' values (`--shadow-none` … `--shadow-inner`),
 * so a default token opens with its tile lit. *Glow* is one layer in a project colour.
 */
export const SHADOW_PRESETS: TokenPreset[] = [
  { name: 'None', value: 'none' },
  { name: 'Subtle', value: '0 1px 2px 0 rgb(0 0 0 / 0.05)' },
  { name: 'Soft', value: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' },
  { name: 'Lifted', value: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' },
  { name: 'Floating', value: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' },
  { name: 'Dramatic', value: '0 25px 50px -12px rgb(0 0 0 / 0.25)' },
  { name: 'Inner', value: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)' },
  { name: 'Glow', value: '0 0 24px 0 var(--primary)' }
];

function decodeLayer(text: string): ShadowLayer | null {
  const parts = splitTopLevel(text, ' ');
  if (!parts || parts.length === 0) return null;

  let inset = false;
  if (parts[0] === 'inset') {
    inset = true;
    parts.shift();
  }
  // `inset` anywhere else is a shape this codec does not write.
  if (parts.includes('inset')) return null;

  if (parts.length < 3 || parts.length > 5) return null;

  const colourText = parts[parts.length - 1];
  const lengthTexts = parts.slice(0, -1);
  const lengths: PxLength[] = [];
  for (const t of lengthTexts) {
    const l = readPxLength(t);
    if (!l) return null;
    lengths.push(l);
  }
  const colour = decodeColour(colourText);
  if (!colour) return null;

  return {
    inset,
    x: lengths[0],
    y: lengths[1],
    ...(lengths[2] ? { blur: lengths[2] } : {}),
    ...(lengths[3] ? { spread: lengths[3] } : {}),
    colour
  };
}

function encodeLayer(layer: ShadowLayer): string {
  const parts: string[] = [];
  if (layer.inset) parts.push('inset');
  parts.push(writePxLength(layer.x), writePxLength(layer.y));
  if (layer.blur) parts.push(writePxLength(layer.blur));
  if (layer.spread) {
    // A spread needs a blur before it to be read as a spread.
    if (!layer.blur) parts.push('0');
    parts.push(writePxLength(layer.spread));
  }
  parts.push(encodeColour(layer.colour));
  return parts.join(' ');
}

export function encodeShadow(model: ShadowModel): string {
  if (model.layers.length === 0) return 'none';
  return model.layers.map(encodeLayer).join(', ');
}

export function decodeShadow(value: string): ShadowModel | null {
  if (value === 'none') return { layers: [] };
  const parts = splitCommaList(value);
  if (!parts) return null;
  const layers: ShadowLayer[] = [];
  for (const p of parts) {
    const layer = decodeLayer(p);
    if (!layer) return null;
    layers.push(layer);
  }
  const model = { layers };
  // README §6.1 — the round-trip check is the codec's last word, not the parser's.
  if (encodeShadow(model) !== value) return null;
  return model;
}

/** *"falls 4px down · soft · 10% dark"* — one layer in words. */
export function describeShadowLayer(layer: ShadowLayer): string {
  const y = layer.y.n;
  const x = layer.x.n;
  const dir = y > 0 ? `falls ${y}px down` : y < 0 ? `rises ${-y}px` : x !== 0 ? 'falls sideways' : 'all the way round';
  const blur = layer.blur ? layer.blur.n : 0;
  const soft = blur <= 3 ? 'crisp' : blur <= 12 ? 'soft' : blur <= 30 ? 'very soft' : 'hazy';
  return `${layer.inset ? 'inside · ' : ''}${dir} · ${soft} · ${describeColour(layer.colour)}`;
}

/** *"Shadow · soft · 2 layers"*, *"Shadow · inside the box"*, *"No shadow"*. */
export function describeShadow(model: ShadowModel): string {
  if (model.layers.length === 0) return 'No shadow';
  const preset = presetNamed(SHADOW_PRESETS, encodeShadow(model));
  const count = model.layers.length === 1 ? '' : ` · ${model.layers.length} layers`;
  if (preset === 'Inner') return 'Shadow · inside the box';
  if (preset) return `Shadow · ${preset.toLowerCase()}${count}`;
  const first = model.layers[0];
  if (first.inset && model.layers.length === 1) return `Shadow · inside the box · ${describeColour(first.colour)}`;
  return `Shadow · ${describeShadowLayer(first)}${count}`;
}

/** A fresh layer for *Add layer*: soft, a little below, 12% dark. */
export function newShadowLayer(): ShadowLayer {
  return { inset: false, x: px(0), y: px(6), blur: px(12), spread: px(-2), colour: { kind: 'black', alpha: 0.12 } };
}

export const shadowCodec: TokenCodec<ShadowModel> = {
  decode: decodeShadow,
  encode: encodeShadow,
  describe: describeShadow,
  presets: SHADOW_PRESETS
};
