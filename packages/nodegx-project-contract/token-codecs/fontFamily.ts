/**
 * P102 CMP-005 — the font-family codec.
 *
 * A family token is a **lead font** and a **tail**, split on top-level commas and rejoined with
 * `', '`. The composer edits the lead only; the tail is kept exactly, quotes and emoji fonts
 * included. A stack that *starts* with a generic (`ui-serif`, `ui-monospace`, `system-ui`) has
 * no lead of its own: it reads as *System serif* / *System mono* / *System sans*.
 *
 * Refused: an empty entry, and any spelling the writer would change (`a,b` with no space). A
 * single family with no tail is read (UPG-003 mints those); its kind is inferred from the name.
 */
import { splitCommaList } from './split';
import { TokenCodec, TokenPreset } from './types';

export type FontKind = 'sans' | 'serif' | 'mono';

export interface FontFamilyModel {
  /** The first entry, spelled as it came (quotes included). */
  lead: string;
  /** Every entry after the first, spelled as they came. */
  tail: string[];
}

/** The tails the three defaults carry, used when a kind change swaps the tail (CMP-005 §3). */
export const FONT_TAILS: Record<FontKind, string[]> = {
  sans: ['ui-sans-serif', 'system-ui', 'sans-serif', "'Apple Color Emoji'", "'Segoe UI Emoji'"],
  serif: ['ui-serif', 'Georgia', 'Cambria', "'Times New Roman'", 'Times', 'serif'],
  mono: ['ui-monospace', 'SFMono-Regular', "'SF Mono'", 'Menlo', 'Consolas', 'monospace']
};

const GENERIC_KIND: Record<string, FontKind> = {
  'ui-sans-serif': 'sans',
  'system-ui': 'sans',
  'sans-serif': 'sans',
  'ui-serif': 'serif',
  serif: 'serif',
  'ui-monospace': 'mono',
  monospace: 'mono',
  'ui-rounded': 'sans'
};

export const SYSTEM_LEADS: Record<FontKind, string> = {
  sans: 'System sans',
  serif: 'System serif',
  mono: 'System mono'
};

/** Fonts the composer lists, each with its kind. Drawn in itself when the editor can load it. */
export const KNOWN_FONTS: { name: string; kind: FontKind }[] = [
  { name: 'Inter', kind: 'sans' },
  { name: 'DM Sans', kind: 'sans' },
  { name: 'Manrope', kind: 'sans' },
  { name: 'Nunito', kind: 'sans' },
  { name: 'Quicksand', kind: 'sans' },
  { name: 'Space Grotesk', kind: 'sans' },
  { name: 'Roboto', kind: 'sans' },
  { name: 'Open Sans', kind: 'sans' },
  { name: 'Lato', kind: 'sans' },
  { name: 'Poppins', kind: 'sans' },
  { name: 'Montserrat', kind: 'sans' },
  { name: 'Arial', kind: 'sans' },
  { name: 'Helvetica', kind: 'sans' },
  { name: 'Verdana', kind: 'sans' },
  { name: 'Tahoma', kind: 'sans' },
  { name: 'Trebuchet MS', kind: 'sans' },
  { name: 'Arial Black', kind: 'sans' },
  { name: 'Impact', kind: 'sans' },
  { name: 'Lora', kind: 'serif' },
  { name: 'Playfair Display', kind: 'serif' },
  { name: 'Merriweather', kind: 'serif' },
  { name: 'Fraunces', kind: 'serif' },
  { name: 'Source Serif 4', kind: 'serif' },
  { name: 'Georgia', kind: 'serif' },
  { name: 'Times New Roman', kind: 'serif' },
  { name: 'Garamond', kind: 'serif' },
  { name: 'JetBrains Mono', kind: 'mono' },
  { name: 'IBM Plex Mono', kind: 'mono' },
  { name: 'Fira Code', kind: 'mono' },
  { name: 'Source Code Pro', kind: 'mono' },
  { name: 'Menlo', kind: 'mono' },
  { name: 'Consolas', kind: 'mono' },
  { name: 'Courier New', kind: 'mono' },
  { name: 'Lucida Console', kind: 'mono' }
];

export const FONT_PRESETS: TokenPreset[] = [
  { name: 'Inter', value: `Inter, ${FONT_TAILS.sans.join(', ')}` },
  { name: 'System serif', value: FONT_TAILS.serif.join(', ') },
  { name: 'System mono', value: FONT_TAILS.mono.join(', ') }
];

/** Strip one pair of matching quotes. */
export function unquoteFont(entry: string): string {
  const m = /^(['"])(.*)\1$/.exec(entry);
  return m ? m[2] : entry;
}

/** Quote a name only when it has a space, in the style the tail already uses (default `'`). */
export function quoteFont(name: string, tail: string[]): string {
  if (!/\s/.test(name)) return name;
  const style = tail.find((t) => /^['"]/.test(t))?.[0] ?? "'";
  return `${style}${name}${style}`;
}

export function isGenericFamily(entry: string): boolean {
  return Object.prototype.hasOwnProperty.call(GENERIC_KIND, entry);
}

/** The kind of a stack: from its lead if known, else from the first generic in its tail. */
export function fontKind(model: FontFamilyModel): FontKind {
  const lead = unquoteFont(model.lead);
  if (isGenericFamily(lead)) return GENERIC_KIND[lead];
  const known = KNOWN_FONTS.find((f) => f.name.toLowerCase() === lead.toLowerCase());
  if (known) return known.kind;
  for (const t of model.tail) if (isGenericFamily(t)) return GENERIC_KIND[t];
  return 'sans';
}

export function decodeFontFamily(value: string): FontFamilyModel | null {
  const entries = splitCommaList(value);
  if (!entries || entries.length === 0) return null;
  const [lead, ...tail] = entries;
  // A single family with no tail is a shape 0.3.0's own upgrade writes: UPG-003 mints
  // `--title-large-family: 'Inter'` from every text style. Read as a lead with an empty tail;
  // picking a font of the same kind keeps the tail empty, a kind change adds that kind's tail.
  const model = { lead, tail };
  if (encodeFontFamily(model) !== value) return null;
  return model;
}

export function encodeFontFamily(model: FontFamilyModel): string {
  return [model.lead, ...model.tail].join(', ');
}

/** The name a person sees for the lead: *Inter*, or *System serif* for a generic lead. */
export function fontLeadName(model: FontFamilyModel): string {
  const lead = unquoteFont(model.lead);
  if (isGenericFamily(lead)) return SYSTEM_LEADS[GENERIC_KIND[lead]];
  return lead;
}

const KIND_WORDS: Record<FontKind, string> = { sans: 'sans serif', serif: 'serif', mono: 'monospace' };

/** *"Inter · sans serif"*, *"System serif"*. */
export function describeFontFamily(model: FontFamilyModel): string {
  const lead = fontLeadName(model);
  if (isGenericFamily(unquoteFont(model.lead))) return lead;
  return `${lead} · ${KIND_WORDS[fontKind(model)]}`;
}

/**
 * The model after picking a font (CMP-005 §3): the same kind keeps the tail; a different kind
 * takes that kind's default tail, and that is a rewrite the composer says so about before Apply.
 */
export function withLeadFont(
  model: FontFamilyModel,
  name: string,
  kind: FontKind
): { model: FontFamilyModel; tailChanged: boolean } {
  const currentKind = fontKind(model);
  if (kind === currentKind) {
    return { model: { lead: quoteFont(name, model.tail), tail: model.tail }, tailChanged: false };
  }
  const tail = FONT_TAILS[kind];
  return { model: { lead: quoteFont(name, tail), tail }, tailChanged: true };
}

/** The model for a *System …* lead: the whole default stack of that kind. */
export function systemStack(kind: FontKind): FontFamilyModel {
  const [lead, ...tail] = FONT_TAILS[kind];
  return { lead, tail };
}

export const fontFamilyCodec: TokenCodec<FontFamilyModel> = {
  decode: decodeFontFamily,
  encode: encodeFontFamily,
  describe: describeFontFamily,
  presets: FONT_PRESETS
};
