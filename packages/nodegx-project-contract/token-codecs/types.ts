/**
 * P102 CMP-001 — the codec contract every composer type implements.
 *
 * A stored CSS string goes through `decode` into a model, the visual editor edits the model, and
 * `encode` writes it back. The one rule (README §6.1): **`decode` returns `null` unless
 * `encode(decode(v)) === v`.** A `null` opens the composer in text mode; nothing is ever rewritten
 * behind someone's back. Every codec here ends its `decode` with that check, so a spelling the
 * parser tolerated but the writer would change is refused rather than normalised (README §6.2).
 *
 * 🔴 This module is imported by `noodl-mcp` and the census under plain Node. Nothing in
 * `token-codecs/` may import the editor.
 */

export interface TokenPreset {
  name: string;
  value: string;
}

export interface TokenCodec<M> {
  /** `null` = "I can't read this exactly". */
  decode(value: string): M | null;
  encode(model: M): string;
  /** The row's words. */
  describe(model: M): string;
  presets: TokenPreset[];
}

/**
 * A length in `px`, with the spelling it arrived in so that `0` stays `0` and `0px` stays `0px`
 * until a slider writes a new value. `px(n)` is the spelling the defaults use.
 */
export interface PxLength {
  n: number;
  css: string;
}

export function px(n: number): PxLength {
  return { n, css: n === 0 ? '0' : `${n}px` };
}

/**
 * Which preset, if any, a value is. A preset is a value, not a mode (README §6.5): the composer
 * recognises one by comparing the encoded string, never by remembering which tile was pressed.
 */
export function presetNamed(presets: TokenPreset[], value: string): string | null {
  const hit = presets.find((p) => p.value === value);
  return hit ? hit.name : null;
}
