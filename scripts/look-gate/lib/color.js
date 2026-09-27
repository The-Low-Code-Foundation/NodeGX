/**
 * CHR-004 — the colour arithmetic, in one plain-JS home.
 *
 * Every number the look gate reports about a fill, an edge or a piece of text comes from here:
 * parse the four spellings a stylesheet and `getComputedStyle` between them produce, composite a
 * translucent value onto what is under it, and score the pair with WCAG 2.x.
 *
 * ## Why this file exists rather than a fifth copy
 *
 * The formula was already written four times when CHR-004 started —
 * `tests-unit/support/themeTokens.ts` (NAT-001's token gate), `scripts/devtools/icon-contrast.js`
 * (the rendered-pixel sampler), `scripts/devtools/deploy-from-disk.cjs` and the canvas's
 * `CanvasTheme.ts`. A ruled number with five homes is the shape this phase already paid for once
 * (`--property-label-column` lived in five stylesheets, three of them commenting "must match").
 * `themeTokens.ts` now re-exports these, so the token gate and the rendered gate cannot disagree
 * about what 3:1 means. `CanvasTheme.ts` is deliberately NOT rewired: it is product code with its
 * own headless fallbacks, and it is graded by its own spec.
 *
 * ## Plain CommonJS on purpose
 *
 * This module is required from three places that share no build step: a `tests-unit` spec
 * (ts-jest, plain Node), a devtools script (`node scripts/…`), and — via `collect.js` — the body
 * of a CDP `Runtime.evaluate` inside the editor's renderer. Anything needing a transpile would be
 * reachable from one of the three and not the others.
 */

/** @typedef {[number, number, number]} Rgb */
/** @typedef {[number, number, number, number]} Rgba */

/**
 * `#abc`, `#aabbcc`, `#aabbccdd`, `rgb(…)`, `rgba(…)` — with the alpha channel kept.
 *
 * 🔴 Alpha is the channel a contrast gate gets wrong. `--theme-color-primary-bg` is
 * `rgba(77, 163, 255, 0.13)`; read as opaque azure it scores a comfortable ratio against text
 * that in reality sits on a ground 87% made of whatever is underneath, and CHR-012's first drive
 * reported `primary` vs `primary-bg` at **1:1** for exactly that reason. Callers composite with
 * `composite()`; a caller that cannot name what is underneath must refuse to grade the pair
 * rather than guess.
 *
 * The 8-digit hex spelling is here because `#RRGGBBAA` is what CHR-009 §20 found the colour
 * field storing — a stored shadow colour reaches this module with its alpha in the string.
 *
 * @param {string | undefined | null} value
 * @returns {Rgba | null}
 */
function parseColorAlpha(value) {
  if (!value) return null;
  const text = String(value).trim();

  if (text === 'transparent') return [0, 0, 0, 0];

  const hex = text.match(/^#([0-9a-f]{3,8})$/i);
  if (hex) {
    const digits = hex[1];
    if (digits.length === 3 || digits.length === 4) {
      const channels = digits.split('').map((d) => parseInt(d + d, 16));
      return [channels[0], channels[1], channels[2], channels.length === 4 ? channels[3] / 255 : 1];
    }
    if (digits.length === 6 || digits.length === 8) {
      const channels = [0, 2, 4, 6].slice(0, digits.length / 2).map((i) => parseInt(digits.slice(i, i + 2), 16));
      return [channels[0], channels[1], channels[2], channels.length === 4 ? channels[3] / 255 : 1];
    }
    return null;
  }

  // `rgb(12 34 56 / 40%)` and `rgba(12, 34, 56, 0.4)` are the same colour spelled two ways, and
  // Chromium's `getComputedStyle` has shipped both. Splitting on the union of their separators
  // reads either; the `%` on an alpha is scaled here rather than by the caller.
  const rgb = text.match(/^rgba?\(([^)]+)\)$/i);
  if (rgb) {
    const parts = rgb[1]
      .split(/[\s,/]+/)
      .filter(Boolean)
      .map((part) => (part.endsWith('%') ? parseFloat(part) / 100 : parseFloat(part)));
    if (parts.length < 3 || parts.some((part) => Number.isNaN(part))) return null;
    return [parts[0], parts[1], parts[2], parts.length > 3 ? parts[3] : 1];
  }

  return null;
}

/**
 * Source-over compositing of a translucent colour onto an opaque one.
 *
 * @param {Rgba} top
 * @param {Rgb} under
 * @returns {Rgb}
 */
function composite(top, under) {
  const alpha = top[3];
  return [0, 1, 2].map((i) => Math.round(top[i] * alpha + under[i] * (1 - alpha)));
}

/**
 * Flatten a stack of colours — nearest first, as the DOM gives them walking up from an element —
 * onto the first opaque one found.
 *
 * Returns `null` when the stack never reaches an opaque colour, which is the honest answer: the
 * ground is off the end of what was collected, and a number invented for it would be a made-up
 * number. Callers report it as a refusal, not a pass.
 *
 * @param {ReadonlyArray<string>} stack painted colours, nearest first
 * @returns {Rgb | null}
 */
function flattenGround(stack) {
  /** @type {Rgba[]} */
  const layers = [];
  for (const entry of stack) {
    const colour = parseColorAlpha(entry);
    if (!colour) continue;
    if (colour[3] === 0) continue; // A fully transparent layer paints nothing at all.
    layers.push(colour);
    if (colour[3] === 1) break; // Everything below an opaque layer is invisible.
  }

  if (!layers.length || layers[layers.length - 1][3] !== 1) return null;

  let ground = [layers[layers.length - 1][0], layers[layers.length - 1][1], layers[layers.length - 1][2]];
  for (let i = layers.length - 2; i >= 0; i--) ground = composite(layers[i], ground);
  return ground;
}

/** `[12, 34, 56]` → `#0c2238`, so a failure names the colour actually graded. */
function toHex(colour) {
  return `#${colour
    .slice(0, 3)
    .map((channel) => Math.round(channel).toString(16).padStart(2, '0'))
    .join('')}`;
}

function relativeLuminance(colour) {
  const [r, g, b] = colour.slice(0, 3).map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * WCAG 2.x contrast ratio, 1–21.
 *
 * @param {Rgb} a
 * @param {Rgb} b
 */
function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

module.exports = {
  parseColorAlpha,
  composite,
  flattenGround,
  toHex,
  relativeLuminance,
  contrastRatio
};
