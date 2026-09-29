/**
 * P106 s3 (lane F, item b) — the colour a DRY tulip's petal reaches the screen as, read from the 2D kit's own
 * artefact (its CSS and its sprite table), for the two kit gates. Mamie's note asks the child to tell the red row
 * from the yellow one BEFORE watering, so a dry red and a dry yellow must stay in their hue families.
 *
 * The 2D kit draws the petal with its sprite fill, then `.gd-tulip.gd-dry` fades it (`opacity`) over the bed cell's
 * background; a CSS `filter` on that rule is applied before the fade (the CSS Filter Effects `saturate()` matrix is
 * modelled; any other filter is reported so the gate can refuse it). The 3D kit has no opacity: its dry petal is a
 * material colour, which the 3D gate pins to this composite, so the two renderers show the same dry colour.
 *
 * @module noodl-mcp/tests/dryTulipLook
 */

export type Rgb = [number, number, number];

export const hexToRgb = (h: string): Rgb => {
  const s = h.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)) as Rgb;
};
export const rgbToHex = (c: Rgb): string => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

/** CSS `saturate(s)` (Filter Effects Module, the feColorMatrix saturate values). */
export function saturate([r, g, b]: Rgb, s: number): Rgb {
  const out: Rgb = [
    (0.213 + 0.787 * s) * r + (0.715 - 0.715 * s) * g + (0.072 - 0.072 * s) * b,
    (0.213 - 0.213 * s) * r + (0.715 + 0.285 * s) * g + (0.072 - 0.072 * s) * b,
    (0.213 - 0.213 * s) * r + (0.715 - 0.715 * s) * g + (0.072 + 0.928 * s) * b
  ];
  return out.map((v) => Math.max(0, Math.min(255, v))) as Rgb;
}

export const over = (c: Rgb, alpha: number, bg: Rgb): Rgb => c.map((v, i) => v * alpha + bg[i] * (1 - alpha)) as Rgb;

/** Hue in degrees (HSL). */
export function hue([r, g, b]: Rgb): number {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const mx = Math.max(R, G, B);
  const mn = Math.min(R, G, B);
  if (mx === mn) return 0;
  const d = mx - mn;
  const h = mx === R ? (G - B) / d + (G < B ? 6 : 0) : mx === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return h * 60;
}
/** The shorter way round the colour wheel between two hues. */
export const hueGap = (a: number, b: number): number => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

function lab(c: Rgb): [number, number, number] {
  const lin = (v: number) => {
    const x = v / 255;
    return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = c.map(lin);
  const X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
/** CIE76 ΔE: about 2 is a just-noticeable difference, 20 "a related colour", 40+ "a different colour". */
export const deltaE = (a: Rgb, b: Rgb): number => {
  const A = lab(a);
  const B = lab(b);
  return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
};

type Sprite = { shapes: Array<[string, Record<string, unknown>]> };

/** The petal's fill in a tulip sprite: the shape drawn from M10 12 (the stem, the leaves and the midrib are the rest). */
export function petalFill(sprite: Sprite): string {
  const petal = sprite.shapes.find(([, a]) => typeof a.d === 'string' && (a.d as string).startsWith('M10 12'));
  if (!petal) throw new Error('no petal shape in the tulip sprite');
  return String(petal[1].fill);
}

export interface DryLook {
  rule: string;
  opacity: number;
  filters: string[];
  bed: string;
  wet: { red: string; yellow: string };
  dry: { red: string; yellow: string };
}

/** The dry look, from the 2D kit's CSS and sprites: the rule, its fade, its filters, and the two dry petals composited on the bed. */
export function dryLook(css: string, sprites: Record<string, Sprite>): DryLook {
  const rule = (css.match(/\.gd-tulip\.gd-dry\{[^}]*\}/) ?? [''])[0];
  const opacity = Number((/opacity:([\d.]+)/.exec(rule) ?? [])[1] ?? 1);
  const filter = (/filter:([^;}]+)/.exec(rule) ?? [])[1] ?? '';
  const filters = filter.match(/[a-z-]+\([^)]*\)/g) ?? [];
  const bed = (/\.gd-bed\{background:(#[0-9A-Fa-f]{6})/.exec(css) ?? [])[1] ?? '';
  const wet = { red: petalFill(sprites.tulip), yellow: petalFill(sprites.tulipYellow) };
  const dryOf = (fill: string): string => {
    let c = hexToRgb(fill);
    for (const f of filters) {
      const m = /^saturate\(([\d.]+)(%?)\)$/.exec(f);
      if (m) c = saturate(c, Number(m[1]) / (m[2] ? 100 : 1));
    }
    return rgbToHex(over(c, opacity, hexToRgb(bed)));
  };
  return { rule, opacity, filters, bed, wet, dry: { red: dryOf(wet.red), yellow: dryOf(wet.yellow) } };
}
