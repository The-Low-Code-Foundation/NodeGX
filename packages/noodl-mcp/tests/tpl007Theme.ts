/**
 * TPL-007 — the look of Rocket School.
 *
 * **The Sticker book** (P87 RKT-002, ruled by Richard 2026-09-13: *"Sticker book design is awesome, but
 * drop the inclined groups and make everything straight please"*). Warm paper, ink outlines 3px thick,
 * hard offset ink shadows, loud tomato / teal / sunshine, Grandstander titles over Nunito. Built as token
 * overrides on `playful`, so every contrast pair the template draws is recomputed by the gate
 * (`tpl007Template.test.ts`, RKT-002), not quoted from this comment.
 *
 * 🔴 **No tomato can be both a button with an ink label and a colour on paper**: an ink label at 4.5:1
 * needs luminance ≥ 0.250; 3:1 on paper needs ≤ 0.248. So tomato is a FILL, and text only when LARGE
 * (3.37 on a card). Selection is a fill (a tomato pill, a sunshine card); every edge is ink.
 *
 * | pair | ratio | floor |
 * |---|---|---|
 * | ink label on tomato (`--primary-foreground` / `--primary`) | 4.60 | 4.5 |
 * | tomato as LARGE text on a card | 3.37 | 3.0 |
 * | ink on paper / on a card / on sunshine | 13.45 / 15.50 / 11.40 | 4.5 |
 * | muted text on paper / card / sunshine | 5.55 / 6.39 / 4.70 | 4.5 |
 * | costly text on paper / card / sunshine | 5.58 / 6.43 / 4.73 | 4.5 |
 * | ink on teal | 5.06 | 4.5 |
 * | teal rocket on a card (UI) | 3.06 | 3.0 |
 *
 * Three roles the game gives to the preset's colours, spelled once:
 *
 * - **`--primary` (tomato)** is *you*: your rocket, your progress, the next key — a fill, or large text.
 * - **`--secondary` (teal)** is *the other one*: the computer's rocket, player two — a fill only.
 * - **`--destructive` (berry)** is *costly*: a wrong answer, a heart gone, the monster.
 * - **`--accent` (sunshine)** is *picked* and *good news*: the chosen player, a correct answer's banner.
 *
 * @module noodl-mcp/tests/tpl007Theme
 */
import { buildStyleVocabulary, getPreset } from '../src/editor-deps';

export const TPL007_PRESET = 'playful';

export const ROLE = {
  you: 'var(--primary)',
  other: 'var(--secondary)',
  costly: 'var(--destructive)',
  good: 'var(--primary)',
  quiet: 'var(--muted-foreground)',
  ink: 'var(--foreground)',
  picked: 'var(--accent)'
} as const;

/** The title and button face, bundled in `tpl007Assets/noodl_modules/rocket-school-fonts` (weight 800 only). */
export const DISPLAY_FONT = 'Grandstander';

/** The sticker's hard ink shadow, as node ports: a CSS class cannot beat the inline style a node writes. */
export const INK_SHADOW = {
  boxShadowEnabled: true,
  boxShadowOffsetX: { value: 4, unit: 'px' },
  boxShadowOffsetY: { value: 5, unit: 'px' },
  boxShadowBlurRadius: { value: 0, unit: 'px' },
  boxShadowColor: 'var(--foreground)'
} as const;

/**
 * P87 RKT-011 — the rocket paints the hangar offers. The token is the only place the colour lives: the shelf (`HANGAR_SHELF`)
 * names the token and says its name, and the template gate checks every shelf paint is one of these and clears contrast.
 */
export const ROCKET_PAINTS: ReadonlyArray<{ token: string; hex: string }> = [
  { token: '--rocket-paint-green', hex: '#2e7d32' },
  { token: '--rocket-paint-blue', hex: '#2f5fd0' },
  { token: '--rocket-paint-purple', hex: '#7b3fc4' },
  { token: '--rocket-paint-berry', hex: '#c2185b' },
  { token: '--rocket-paint-orange', hex: '#c75000' },
  { token: '--rocket-paint-midnight', hex: '#243b6b' }
];

/** Font sizes that count as large text (≥ 24px), where a 3:1 floor applies instead of 4.5:1. */
export const LARGE_TEXT_SIZES = ['var(--text-2xl)', 'var(--text-3xl)', 'var(--text-4xl)', 'var(--text-5xl)', 'var(--display-sm)', 'var(--display-md)', 'var(--display-lg)'] as const;

/** The Sticker book, over `playful`. Every ratio is in the header, and the gate recomputes them. */
export const TPL007_TOKENS: ReadonlyArray<{ name: string; value: string }> = [
  // Grounds — warm paper and white card stock; the ink is a brown-black, never #000.
  { name: '--background', value: '#f6ecd9' },
  { name: '--foreground', value: '#2a211b' },
  { name: '--surface', value: '#fffdf7' },
  { name: '--surface-raised', value: '#fffdf7' },
  { name: '--muted', value: '#efe3cc' },
  { name: '--muted-foreground', value: '#6b5b4d' },
  // You — tomato, with an ink label.
  { name: '--primary', value: '#f5522e' },
  { name: '--primary-hover', value: '#e0441f' },
  { name: '--primary-foreground', value: '#2a211b' },
  // The other one — teal, with an ink label.
  { name: '--secondary', value: '#12a39b' },
  { name: '--secondary-hover', value: '#0e8f88' },
  { name: '--secondary-foreground', value: '#2a211b' },
  // Costly — berry.
  { name: '--destructive', value: '#b3261e' },
  { name: '--destructive-hover', value: '#9a1f18' },
  { name: '--destructive-foreground', value: '#ffffff' },
  // Picked and good news — sunshine. Light enough that small berry text still clears 4.5 on it.
  { name: '--accent', value: '#ffd76a' },
  { name: '--accent-foreground', value: '#2a211b' },
  // Every edge is ink, and a sticker's outline is thick.
  { name: '--border', value: '#2a211b' },
  { name: '--border-subtle', value: '#e4d6bd' },
  { name: '--border-strong', value: '#2a211b' },
  { name: '--border-control', value: '#2a211b' },
  { name: '--ring', value: '#2a211b' },
  { name: '--border-1', value: '3px' },
  // Rounded, not pills: a sticker has corners.
  { name: '--radius-md', value: '12px' },
  { name: '--radius-lg', value: '16px' },
  { name: '--radius-xl', value: '20px' },
  { name: '--radius-2xl', value: '24px' },
  { name: '--radius-3xl', value: '28px' },
  // Type — Nunito, bundled beside the template (s1 named it and never loaded it).
  { name: '--font-sans', value: '"Nunito", ui-rounded, system-ui, sans-serif' },
  // P87 RKT-011 — rocket paints from the hangar. Each is ≥ 3:1 on the paper, the card and the track, and none is tomato
  // (rocket A's own colour) or teal (the computer's). The template gate recomputes them.
  ...ROCKET_PAINTS.map((p) => ({ name: p.token, value: p.hex }))
];

export const VOCABULARY = buildStyleVocabulary({ getMetaData: () => undefined });

const requested = new Set<string>();

export function requestedCompositions(): string[] {
  return [...requested].sort();
}

/** One composition's parameters, by id — throws on an unknown id, naming the ones that exist. */
export function composition(id: string): Record<string, unknown> {
  requested.add(id);
  const found = (VOCABULARY.compositions as Array<{ id: string; parameters: Record<string, unknown> }>).find(
    (c) => c.id === id
  );
  if (!found) {
    const known = (VOCABULARY.compositions as Array<{ id: string }>).map((c) => c.id).join(', ');
    throw new Error(`No style composition "${id}". The vocabulary has: ${known}`);
  }
  return { ...found.parameters };
}

/** Every composition the template asks for — asserted against `requestedCompositions()`. */
export const USED_COMPOSITIONS = [
  'badge',
  'body',
  'card',
  'cardTitle',
  'displayHeadline',
  'eyebrow',
  'lead',
  'meta',
  'outlineButton',
  'primaryButton',
  'sectionHeading',
  'statTile',
  'textField'
] as const;

export function tpl007TokenEntries(): Array<{ name: string; value: string }> {
  const preset = getPreset(TPL007_PRESET);
  if (!preset) throw new Error(`No style preset "${TPL007_PRESET}"`);
  return [...Object.entries(preset.tokens).map(([name, value]) => ({ name, value })), ...TPL007_TOKENS];
}
