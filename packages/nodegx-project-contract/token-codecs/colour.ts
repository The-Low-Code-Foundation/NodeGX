/**
 * P102 CMP-001 / RC-2 / RC-6a — a colour as a shadow layer or a gradient stop holds it.
 *
 * The composer can **pick** four kinds (RC-2): a project token, black at a strength, white at a
 * strength, and clear. Anything else it can read as one colour token it **keeps** (RC-6a): the
 * literal is stored as written and written back byte-for-byte, the chip reads *Custom*, and every
 * other control on the layer still works. The codec refuses (`null`) only when the text is not a
 * single colour-shaped token at all.
 *
 * 🔴 Black and white are recognised only in the spelling the defaults use, `rgb(0 0 0 / 0.1)`,
 * and only when `String(alpha)` reproduces the alpha as written. `rgb(0 0 0 / .1)`,
 * `rgba(0,0,0,0.1)` and `#0000001a` are the same colour and are all kept as literals — a Strength
 * slider on them would have to re-serialise the text, and that is where a rewrite creeps in
 * (CMP-002 §3).
 */

export type ColourValue =
  | { kind: 'token'; name: string }
  | { kind: 'black'; alpha: number }
  | { kind: 'white'; alpha: number }
  | { kind: 'clear' }
  | { kind: 'literal'; css: string };

const TOKEN_REF = /^var\((--[\w-]+)\)$/;
const BLACK = /^rgb\(0 0 0 \/ ([0-9.]+)\)$/;
const WHITE = /^rgb\(255 255 255 \/ ([0-9.]+)\)$/;
const FUNCTIONAL = /^[a-zA-Z-]+\(.*\)$/;
const HEX = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const NAMED = /^[a-zA-Z]+$/;

/** Alpha in `0`–`1`, spelled the way `String()` spells it. */
function readAlpha(text: string): number | null {
  const n = Number(text);
  if (!Number.isFinite(n) || n < 0 || n > 1) return null;
  if (String(n) !== text) return null;
  return n;
}

export function decodeColour(text: string): ColourValue | null {
  const token = TOKEN_REF.exec(text);
  if (token) return { kind: 'token', name: token[1] };

  if (text === 'transparent') return { kind: 'clear' };

  const black = BLACK.exec(text);
  if (black) {
    const alpha = readAlpha(black[1]);
    if (alpha !== null) return { kind: 'black', alpha };
  }
  const white = WHITE.exec(text);
  if (white) {
    const alpha = readAlpha(white[1]);
    if (alpha !== null) return { kind: 'white', alpha };
  }

  // One colour token of a shape we can see is a colour, without reading it.
  if (FUNCTIONAL.test(text) && balanced(text)) return { kind: 'literal', css: text };
  if (HEX.test(text)) return { kind: 'literal', css: text };
  if (NAMED.test(text)) return { kind: 'literal', css: text };

  return null;
}

export function encodeColour(colour: ColourValue): string {
  switch (colour.kind) {
    case 'token':
      return `var(${colour.name})`;
    case 'black':
      return `rgb(0 0 0 / ${colour.alpha})`;
    case 'white':
      return `rgb(255 255 255 / ${colour.alpha})`;
    case 'clear':
      return 'transparent';
    case 'literal':
      return colour.css;
  }
}

/** True when the composer offers a control for this colour (RC-2). */
export function isPickable(colour: ColourValue): boolean {
  return colour.kind !== 'literal';
}

/** Whether a Strength slider applies: only black and white carry one in this phase. */
export function hasStrength(colour: ColourValue): colour is Extract<ColourValue, { kind: 'black' | 'white' }> {
  return colour.kind === 'black' || colour.kind === 'white';
}

/** The words a row uses for a colour: *Primary*, *10% dark*, *20% light*, *clear*, *custom colour*. */
export function describeColour(colour: ColourValue): string {
  switch (colour.kind) {
    case 'token':
      return tokenWords(colour.name);
    case 'black':
      return `${percent(colour.alpha)}% dark`;
    case 'white':
      return `${percent(colour.alpha)}% light`;
    case 'clear':
      return 'clear';
    case 'literal':
      return 'custom colour';
  }
}

/** `--primary-hover` → *Primary hover*. */
export function tokenWords(name: string): string {
  const bare = name.replace(/^--/, '').replace(/-/g, ' ');
  return bare.charAt(0).toUpperCase() + bare.slice(1);
}

function percent(alpha: number): number {
  return Math.round(alpha * 100);
}

function balanced(text: string): boolean {
  let depth = 0;
  for (const ch of text) {
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth < 0) return false;
    }
  }
  return depth === 0;
}
