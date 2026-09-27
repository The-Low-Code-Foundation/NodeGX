/**
 * TPL-010 — the look of the planner, and nothing else.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * ## TPL-008's tokens, plus four colours that carry data
 *
 * R13 rules the base: TPL-008's palette token for token — one faintly warm grey
 * ground, white surfaces, near-black text, three type sizes, light and dark with a
 * switch. Red stays reserved for an overdue move and a day over the focus ceiling.
 *
 * The addition is the envelopes. **Their colours are data, not decoration**: blue is
 * Billable wherever it appears, violet is Building, grey is Admin, amber is Hobby, and
 * a fifth grey-blue marks a dormant project in the card. A person reads the week by
 * colour before they read a word of it, so these five are held to the same standard a
 * chart's categorical palette is held to, in BOTH palettes.
 *
 * ## 🔴 Two hexes differ from the approved mockup, and both were forced by measurement
 *
 * R13 says *"keep the hexes"*. Two could not be kept, and the ruling's own reason is why:
 * it claims the four were *"validated for colour-vision deficiency in both modes"*. Three
 * of the four were. These two were not, and the gate recomputes both claims from this file.
 *
 * 1. **Light Hobby `#c98500` → `#bf7e00`.** As drawn it is a 3px border and a track fill
 *    on its own soft ground — a non-text mark, so WCAG 1.4.11 asks 3:1. It measured
 *    **2.73** on `--env-hobby-soft`. Darkened until it clears 3, and no further.
 *
 * 2. **Dark Building `#9085e9` → `#a66bb8`.** Under **protanopia** the mockup's dark violet
 *    and its dark billable blue `#3987e5` are the same colour: ΔE **4.6**, where 15 is the
 *    floor this file holds. The two envelopes a freelancer is actually trading off — the
 *    hours that pay now against the hours that pay later — were indistinguishable for a
 *    protanope at night. Moved off blue toward mauve: worst pair across normal, deuteran,
 *    protan and tritan is now ΔE **22.0**. Its soft fill moved with it (`#2a2547` →
 *    `#33254a`) so the fill still belongs to the mark that sits on it.
 *
 * Light Building, light/dark Admin, dark Hobby and both Billables are the mockup's own.
 *
 * ## Two grades of every envelope colour
 *
 * The mockup paints these as **marks** almost everywhere — a tile's top border, a track
 * fill, a chip's dot, a block's left border and tick box, a progress bar, a sparkline —
 * and as **text** in exactly one place, the group label in the projects card
 * (`envelopes-b.html:114`, 11px uppercase). A mark needs 3:1; 11px text needs 4.5:1, which
 * no mark colour in this palette reaches on every ground it sits on. So each envelope has
 * two tokens and the difference is not cosmetic:
 *
 * - `--env-<k>` — the mark. Floor **3.0** on `--surface`, on `--background` and on its own soft.
 * - `--env-<k>-ink` — the same hue as text. Floor **4.5** on those same three grounds.
 * - `--env-<k>-soft` — the fill a block sits on.
 *
 * Where the two are equal (light Building, dark Admin, dark Hobby) the mark already cleared
 * 4.5 and nothing was invented to make a pair.
 *
 * @module noodl-mcp/tests/tpl010Theme
 */
import { buildStyleVocabulary } from '../src/editor-deps';

export const TPL010_PRESET = 'minimal';

/** The five envelopes, in the order the week draws them. `dormant` is a card group, not a budget (R4, R8). */
export const ENVELOPE_KEYS = ['billable', 'building', 'admin', 'hobby', 'dormant'] as const;
export type EnvelopeKey = (typeof ENVELOPE_KEYS)[number];

/** What each envelope is called on screen. R4: Hobby is budgeted at zero and reported, never flagged. */
export const ENVELOPE_NAMES: Record<EnvelopeKey, string> = {
  billable: 'Billable',
  building: 'Building',
  admin: 'Admin and asks',
  hobby: 'Hobby',
  dormant: 'Dormant, worth a nudge'
};

interface EnvelopeColour {
  /** The mark: borders, fills, dots, bars. Floor 3.0 (WCAG 1.4.11). */
  mark: string;
  /** The same hue as text. Floor 4.5 (WCAG AA). */
  ink: string;
  /** The ground a block of this envelope sits on. */
  soft: string;
}

/** Measured, not chosen. Every value here is recomputed by the gate from the pairs below. */
export const ENVELOPE_LIGHT: Record<EnvelopeKey, EnvelopeColour> = {
  billable: { mark: '#2a78d6', ink: '#256bbf', soft: '#e3eefb' },
  building: { mark: '#4a3aa7', ink: '#4a3aa7', soft: '#ece9f8' },
  admin: { mark: '#6b7680', ink: '#636d76', soft: '#eceff2' },
  hobby: { mark: '#bf7e00', ink: '#966300', soft: '#fbf1d9' },
  dormant: { mark: '#7d8893', ink: '#65707a', soft: '#f0f2f4' }
};

export const ENVELOPE_DARK: Record<EnvelopeKey, EnvelopeColour> = {
  billable: { mark: '#3987e5', ink: '#5d9dea', soft: '#1d3350' },
  building: { mark: '#a66bb8', ink: '#b381c3', soft: '#33254a' },
  admin: { mark: '#98a3ad', ink: '#98a3ad', soft: '#22272c' },
  hobby: { mark: '#e2a93a', ink: '#e2a93a', soft: '#3a2e12' },
  dormant: { mark: '#818c97', ink: '#848f99', soft: '#22272c' }
};

function envelopeTokens(set: Record<EnvelopeKey, EnvelopeColour>): Array<{ name: string; value: string }> {
  return ENVELOPE_KEYS.flatMap((k) => [
    { name: `--env-${k}`, value: set[k].mark },
    { name: `--env-${k}-ink`, value: set[k].ink },
    { name: `--env-${k}-soft`, value: set[k].soft }
  ]);
}

/** TPL-008's light palette (R13), then the envelopes. */
export const TPL010_TOKENS: ReadonlyArray<{ name: string; value: string }> = [
  { name: '--background', value: '#f5f5f3' },
  { name: '--foreground', value: '#1d1f21' },
  { name: '--surface', value: '#ffffff' },
  { name: '--surface-raised', value: '#ffffff' },
  { name: '--muted', value: '#ecedea' },
  { name: '--muted-foreground', value: '#5f6469' },
  { name: '--primary', value: '#2f5bc8' },
  { name: '--primary-hover', value: '#2749a3' },
  { name: '--primary-foreground', value: '#ffffff' },
  { name: '--ring', value: '#2f5bc8' },
  { name: '--destructive', value: '#b3261e' },
  { name: '--destructive-hover', value: '#8f1e18' },
  { name: '--destructive-foreground', value: '#ffffff' },
  { name: '--secondary', value: '#ecedea' },
  { name: '--secondary-hover', value: '#e2e3df' },
  { name: '--secondary-foreground', value: '#1d1f21' },
  { name: '--accent', value: '#e8eefb' },
  { name: '--accent-foreground', value: '#2749a3' },
  { name: '--border', value: '#e1e2df' },
  { name: '--border-subtle', value: '#e9eae7' },
  { name: '--border-strong', value: '#c9cbc6' },
  { name: '--border-control', value: '#7b8085' },
  { name: '--radius-sm', value: '4px' },
  { name: '--radius-md', value: '6px' },
  { name: '--radius-lg', value: '8px' },
  { name: '--radius-xl', value: '8px' },
  { name: '--radius-2xl', value: '10px' },
  // R13a (2026-09-21) — the approved mockup's three faces, loaded by the @import at the top of
  // themeCss(). Offline, each stack falls through to the system's own and nothing breaks.
  { name: '--font-sans', value: '"Public Sans", system-ui, -apple-system, "Segoe UI", sans-serif' },
  { name: '--font-display', value: '"Archivo", "Public Sans", system-ui, sans-serif' },
  { name: '--font-mono', value: '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace' },
  // What the card and the drawer sit on. A token, not a literal, so the two dim the page
  // by the same amount and a re-theme reaches them.
  { name: '--scrim', value: 'rgba(20, 26, 32, 0.45)' },
  ...envelopeTokens(ENVELOPE_LIGHT)
];

/**
 * The same palette at night. **Every colour token the light set overrides is overridden
 * here**, by name — the gate fails on a name in one set and not the other.
 */
export const TPL010_DARK_TOKENS: ReadonlyArray<{ name: string; value: string }> = [
  { name: '--background', value: '#161718' },
  { name: '--foreground', value: '#e7e7e4' },
  { name: '--surface', value: '#1f2022' },
  { name: '--surface-raised', value: '#25272a' },
  { name: '--muted', value: '#2b2d30' },
  { name: '--muted-foreground', value: '#a4a8ac' },
  { name: '--primary', value: '#8aa9f2' },
  { name: '--primary-hover', value: '#a6bef6' },
  { name: '--primary-foreground', value: '#10141f' },
  { name: '--ring', value: '#8aa9f2' },
  { name: '--destructive', value: '#f0877e' },
  { name: '--destructive-hover', value: '#f4a49d' },
  { name: '--destructive-foreground', value: '#1b100f' },
  { name: '--secondary', value: '#2b2d30' },
  { name: '--secondary-hover', value: '#34373a' },
  { name: '--secondary-foreground', value: '#e7e7e4' },
  { name: '--accent', value: '#1e2941' },
  { name: '--accent-foreground', value: '#b8cbf8' },
  { name: '--border', value: '#323437' },
  { name: '--border-subtle', value: '#2a2c2f' },
  { name: '--border-strong', value: '#474a4e' },
  { name: '--border-control', value: '#83878c' },
  // Heavier at night: the same 45% over an ink ground barely separates the card from it.
  { name: '--scrim', value: 'rgba(0, 0, 0, 0.62)' },
  ...envelopeTokens(ENVELOPE_DARK)
];

/**
 * The pairs this template actually draws, recomputed by the gate from the token sets
 * above against BOTH palettes (AC10). `floor` is 4.5 for text, 3 for a control's edge
 * and for a mark that carries meaning.
 */
export const CONTRAST_PAIRS: ReadonlyArray<{ fg: string; bg: string; floor: number }> = [
  { fg: '--foreground', bg: '--background', floor: 4.5 },
  { fg: '--foreground', bg: '--surface', floor: 4.5 },
  { fg: '--muted-foreground', bg: '--background', floor: 4.5 },
  { fg: '--muted-foreground', bg: '--surface', floor: 4.5 },
  { fg: '--muted-foreground', bg: '--muted', floor: 4.5 },
  { fg: '--primary-foreground', bg: '--primary', floor: 4.5 },
  { fg: '--primary', bg: '--surface', floor: 4.5 },
  { fg: '--destructive', bg: '--background', floor: 4.5 },
  { fg: '--destructive', bg: '--surface', floor: 4.5 },
  { fg: '--border-control', bg: '--background', floor: 3 },
  { fg: '--border-control', bg: '--surface', floor: 3 },
  // The envelopes: the mark on every ground it is drawn on, then the same hue as text.
  // R13b — a block's words are ink now, not the envelope's colour, and they sit on its soft fill.
  ...ENVELOPE_KEYS.flatMap((k) => [
    { fg: '--foreground', bg: `--env-${k}-soft`, floor: 4.5 },
    { fg: '--muted-foreground', bg: `--env-${k}-soft`, floor: 4.5 },
    { fg: `--env-${k}`, bg: '--surface', floor: 3 },
    { fg: `--env-${k}`, bg: '--background', floor: 3 },
    { fg: `--env-${k}`, bg: `--env-${k}-soft`, floor: 3 },
    { fg: `--env-${k}-ink`, bg: '--surface', floor: 4.5 },
    { fg: `--env-${k}-ink`, bg: '--background', floor: 4.5 },
    { fg: `--env-${k}-ink`, bg: `--env-${k}-soft`, floor: 4.5 }
  ])
];

/**
 * The floor the five envelope marks hold against EACH OTHER, in CIELAB ΔE, under normal
 * vision and under all three dichromacies. 15 is the separation a categorical palette
 * needs before two categories start being read as one; the mockup's dark set measured
 * 4.6 and is corrected in {@link ENVELOPE_DARK}.
 */
export const CVD_DELTA_E_FLOOR = 15;

// ── Dark, and the switch between them ───────────────────────────────────────

/** Where the person's choice is kept. Absent = follow the system. */
export const THEME_STORAGE_KEY = 'nodegx-planner-theme';

/** The two icon buttons. CSS shows exactly one: the theme you would switch TO. */
export const THEME_TO_DARK_CLASS = 'planner-theme-to-dark';
export const THEME_TO_LIGHT_CLASS = 'planner-theme-to-light';

/**
 * The App's stylesheet: the page ground, the dark tokens under both conditions, and which
 * switch icon shows.
 *
 * 🔴 **The project's token block is `:root { … }`, so the dark block is a CSS rule on a
 * MORE specific selector, not a second token set.** Nothing in the runtime knows about dark
 * mode; this stylesheet carries both rules, and `data-theme` is written only when the choice
 * DIFFERS from the system, so choosing the system's own theme forgets the choice.
 *
 * 🔴 **R15, the 5,800px page.** A scroll container inside a page-level grid reports its full
 * content width unless the track is pinned, so the two strips that scroll sideways — the moves
 * chips and the cash events — get `min-width: 0` here rather than in a parameter somebody can
 * clear. The week must fit above the fold and never grow (R5).
 */
/**
 * The phone breakpoint. 700px rather than 390px: the week needs six columns' worth of room,
 * and a narrow laptop window or a tablet in portrait is as unable to give it as a phone is.
 */
export const PHONE_MAX_WIDTH = 700;

/** R5a — the mockup's 1060px plus the page's own 16px gutters, rounded. */
export const PAGE_MAX_WIDTH = 1100;

/** R13a — the three families and the weights the mockup asks for, and nothing else. */
export const FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@90,600;90,700;90,800' +
  '&family=Public+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap';
/** The day picker exists only under the breakpoint; this is the class that hides it above. */
export const PHONE_PICKER_CLASS = 'planner-daypicker';

export function themeCss(): string {
  const tokens = TPL010_DARK_TOKENS.map((t) => `    ${t.name}: ${t.value};`).join('\n');
  const hide = (cls: string) => `.${cls} { display: none !important; }`;
  return [
    // R13a — must be the first rule in the stylesheet, or the browser ignores it.
    `@import url("${FONTS_URL}");`,
    'html, body { background-color: var(--background); }',
    '',
    '/* R5a — the week is designed at the mockup\u2019s width; above it the page shows ground either side. */',
    `.planner-page { max-width: ${PAGE_MAX_WIDTH}px; margin-left: auto; margin-right: auto; }`,
    '/* R13a — Archivo is drawn at 90% width in the mockup; no port sets font-stretch. */',
    '.planner-display { font-stretch: 90%; letter-spacing: -0.01em; }',
    '/* R2.1 — the six days are one box with a line between each, as the mockup draws them. */',
    '.planner-week { overflow: hidden; }',
    '.planner-week > .planner-day:last-child { border-right-width: 0 !important; }',
    '/* R2.1 — six cash events fill the strip rather than stopping at 60% of it. */',
    '.planner-cash-ev { flex: 1 1 110px !important; }',
    '/* R7a — a chip is never wider than its strip: the move\u2019s words give way, as the mockup\u2019s do.',
    '   On a laptop no chip reaches it; on a phone the 685px Founder A chip ends in an ellipsis. */',
    '.planner-chip { max-width: 100%; min-width: 0; overflow: hidden; }',
    '.planner-chip-what { flex: 0 1 auto !important; min-width: 0 !important; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }',
    // R7d — a placed chip is the mockup's: faded, its move struck through, the tick and its day not.
    '.planner-chip-placed { opacity: 0.55; }',
    '.planner-chip-placed .planner-chip-what { text-decoration: line-through; }',
    '.planner-chip-tick { flex: none !important; white-space: nowrap; }',
    '',
    '/* TPL-010-M — the money lines: a fixed key column, words that wrap; the modal\u2019s back buttons are for the phone. */',
    '.planner-money-key { flex: none !important; }',
    '.planner-money-date { flex: none !important; }',
    '.planner-phone-only { display: none !important; }',
    '.planner-shrink-wrap { max-width: 100%; }',
    '',
    '/* R15 — a sideways strip inside the page grid must not widen the page. */',
    '.planner-scroll-x { min-width: 0; overflow-x: auto; }',
    '.planner-pinned { min-width: 0; }',
    '/* R5b — the page scrolls down when the week does not fit, never sideways. */',
    '.planner-page { overflow-x: hidden; }',
    '',
    '/* The phone shows one day (2026-09-21). Six columns do not fit at 390px, and the page',
    '   does not scroll sideways by ruling — so the picked column is the only one drawn and',
    '   the day picker chooses it. Above the breakpoint the picker is the thing that is gone. */',
    `.${PHONE_PICKER_CLASS} { display: none !important; }`,
    `@media (max-width: ${PHONE_MAX_WIDTH}px) {`,
    `  .${PHONE_PICKER_CLASS} { display: flex !important; }`,
    '  .planner-day { display: none !important; }',
    '  .planner-day-picked { display: flex !important; width: 100% !important; }',
    '  .planner-envs { flex-wrap: wrap; }',
    '  .planner-envs > * { flex: 1 1 45% !important; min-width: 0 !important; }',
    '  /* Two tiles to a line leaves about 170px, and "ADMIN AND ASKS" beside "5.25 h left"',
    '     does not fit in it — the hours were cut off mid-number. The head wraps instead. */',
    '  .planner-env-head { flex-wrap: wrap !important; }',
    '  /* What opens over the week is sized for a laptop: 50% of 390px is a 195px sheet, and',
    '     the projects card is two columns of 148px and 242px. On a phone they take the room. */',
    '  .planner-over { width: 96% !important; max-width: none !important; max-height: 92% !important; }',
    '  .planner-over-col { width: 100% !important; }',
    '  .planner-over { flex-direction: column !important; }',
    '  /* The app bar is one row of five controls; at 390px the last three fall off the end',
    '     of it, and one of them is Shut down — the evening the whole app is built around. */',
    '  .planner-appbar { flex-wrap: wrap !important; row-gap: var(--space-2) !important; }',
    '  /* M1 — Money is the whole screen on a phone, and the list and the pane take turns: the pane',
    '     is showing while planner-money-pane is on the card, and its \u2039 Money goes back. */',
    '  .planner-money { width: 100% !important; height: 100% !important; max-height: none !important; border-radius: 0 !important; }',
    '  .planner-money-side { display: none !important; }',
    '  .planner-money-pane .planner-money-list { display: none !important; }',
    '  .planner-money-pane .planner-money-side { display: flex !important; }',
    '  .planner-phone-only { display: inline-flex !important; }',
    '  .planner-money-line { flex-direction: column !important; row-gap: 0 !important; }',
    '}',
    '',
    '/* Dark: the system asks for it and the person has not chosen light. */',
    '@media (prefers-color-scheme: dark) {',
    '  :root:not([data-theme="light"]) {',
    '    color-scheme: dark;',
    tokens,
    '  }',
    `  :root:not([data-theme="light"]) ${hide(THEME_TO_DARK_CLASS)}`,
    '}',
    '',
    '/* Dark: the person chose it on a light system. */',
    ':root[data-theme="dark"] {',
    '  color-scheme: dark;',
    tokens.replace(/^ {2}/gm, ''),
    '}',
    `:root[data-theme="dark"] ${hide(THEME_TO_DARK_CLASS)}`,
    '',
    '/* Light shows the moon; dark shows the sun. */',
    '@media not all and (prefers-color-scheme: dark) {',
    `  :root:not([data-theme="dark"]) ${hide(THEME_TO_LIGHT_CLASS)}`,
    '}',
    `:root[data-theme="light"] ${hide(THEME_TO_LIGHT_CLASS)}`
  ].join('\n');
}

/** Shared by the two theme scripts: what the system wants, what the person chose, and applying it. */
const THEME_FNS = `var KEY = ${JSON.stringify(THEME_STORAGE_KEY)};
function systemTheme() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
function chosenTheme() {
  var v = null;
  try { v = window.localStorage.getItem(KEY); } catch (e) { v = window.__plannerTheme || null; }
  return v === 'dark' || v === 'light' ? v : null;
}
function remember(v) {
  window.__plannerTheme = v;
  try { if (v) window.localStorage.setItem(KEY, v); else window.localStorage.removeItem(KEY); } catch (e) {}
}
function applyTheme(v) {
  if (v) document.documentElement.setAttribute('data-theme', v);
  else document.documentElement.removeAttribute('data-theme');
}
`;

/** On load (a Function with nothing wired runs once): put back what the person chose, if anything. */
export const THEME_BOOT_SCRIPT = `${THEME_FNS}applyTheme(chosenTheme());`;

/** The switch: the other theme from the one showing. */
export const THEME_FLIP_SCRIPT = `${THEME_FNS}var showing = chosenTheme() || systemTheme();
var next = showing === 'dark' ? 'light' : 'dark';
var keep = next === systemTheme() ? null : next;
remember(keep);
applyTheme(keep);`;

export const VOCABULARY = buildStyleVocabulary({ getMetaData: () => undefined });

const requested = new Set<string>();

/** Every composition id this template asked for — recorded, not listed. */
export function requestedCompositions(): string[] {
  return [...requested].sort();
}

/** One composition's parameters, by id. Throws on an unknown id, naming the ones that exist. */
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
