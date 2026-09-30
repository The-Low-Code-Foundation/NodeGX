/**
 * CG-007 — the look of Olive's Island (slug bot-garden), as the mockup draws it (`tpl-012-mockups/bot-garden.html`): warm paper, white cards
 * with a soft shadow, pill buttons in four fills (leaf, coral, violet, quiet), Fredoka titles over Nunito, the owl's
 * violet card, the four block colours. Ported, not restyled: every value below is the mockup's `:root` or one of its
 * component rules, and the comment beside a value says which when it is not obvious.
 *
 * ## What lives where
 *
 * - **Tokens** ({@link GARDEN_TOKENS}) — the mockup's `:root`, written as project tokens over the Playful preset (which
 *   brings Nunito). A colour the graph sets is `var(--token)`, never a hex (the template gate walks every parameter).
 *   The four block colours and the owl's violet are tokens, and the kit is fed `var(--block-*)` on its colour ports, so
 *   a token change re-skins the blocks too (AC4).
 * - **One stylesheet** ({@link GARDEN_CSS}), in App's `CSS Definition` node, reached by `cssClassName`. A node writes its
 *   own parameters INLINE, so a rule that must beat a parameter says `!important` (TPL-011's lesson), and every
 *   positioning property of an overlay is `!important` too (a Group writes `position` inline, P95 R6).
 * - **Sprites** — the mockup's `<symbol>`s (the islanders, the owl, the tulip, the tree, the house, the rock) as CSS
 *   background images, and its button icons as CSS masks painted in `currentColor`. A graph node cannot hold an inline
 *   `<svg>`, and an `Icon` component renders an empty span; a class can carry a picture.
 * - **Fonts** — Fredoka bundled in `cg007Assets/noodl_modules/bot-garden-fonts` (OFL, beside its licence); Nunito from
 *   the Playful preset's own module. Nothing is fetched (the mockup's Google Fonts link is the trap AC3 names).
 *
 * 🔴 NO BACKTICKS anywhere inside {@link GARDEN_CSS}: it is a template literal, and a backtick in one of its comments
 * ends the string early and the error names something two files away (README §7).
 *
 * @module noodl-mcp/tests/cg007Look
 */


/** The preset the tokens sit on. Playful ships Nunito (P88 GAM-016), the mockup's body face. */
export const GARDEN_PRESET = 'playful';

/** The title face, bundled in `bot-garden-fonts` (a variable font, weights 300–700). */
export const DISPLAY_FONT = 'Fredoka';

/** The robot paints the My robot page offers: the mockup's `COLORS`, each a token so the swatch never carries a hex. */
export const ROBOT_PAINTS: ReadonlyArray<{ token: string; hex: string; name: { en: string; fr: string } }> = [
  { token: '--robot-coral', hex: '#FF7A59', name: { en: 'coral', fr: 'corail' } },
  { token: '--robot-orange', hex: '#FFB347', name: { en: 'orange', fr: 'orange' } },
  { token: '--robot-sun', hex: '#FFD166', name: { en: 'sunny', fr: 'soleil' } },
  { token: '--robot-leaf', hex: '#3FA66B', name: { en: 'leaf', fr: 'feuille' } },
  { token: '--robot-sky', hex: '#5FB4E8', name: { en: 'sky', fr: 'ciel' } },
  { token: '--robot-violet', hex: '#8F6BFF', name: { en: 'violet', fr: 'violet' } },
  { token: '--robot-pink', hex: '#F06BA8', name: { en: 'pink', fr: 'rose' } },
  { token: '--robot-slate', hex: '#7A8CA3', name: { en: 'slate', fr: 'ardoise' } }
];

/**
 * The fills that carry white words, darkened (ruling 5, "darker fills, white text"): each is the mockup's colour at the
 * same OKLCH hue and chroma with a lower lightness, stepped down until white on it reaches 4.5:1 (4.6 aimed, for the
 * rounding) — and the leaf, which is also the eyebrow's ink on the paper, until it reaches 4.5:1 there too. The control
 * orange loses some chroma on the way down (sRGB has no darker orange that saturated). The mockup's own value is kept
 * beside each so the change is one line to read. `$SCRATCH/darken-oklch.js` is the instrument that chose them.
 */
export const DARKENED_FILLS: ReadonlyArray<{ token: string; mockup: string; value: string }> = [
  { token: '--leaf', mockup: '#3FA66B', value: '#058149' },
  { token: '--primary', mockup: '#3FA66B', value: '#058149' },
  { token: '--coral', mockup: '#FF7A59', value: '#CB4A2A' },
  { token: '--secondary', mockup: '#FF7A59', value: '#CB4A2A' },
  { token: '--violet', mockup: '#8F6BFF', value: '#8059EC' },
  { token: '--block-motion', mockup: '#4C8DFF', value: '#3170E0' },
  { token: '--block-action', mockup: '#3FA66B', value: '#058149' },
  { token: '--block-control', mockup: '#FF9F1C', value: '#A86501' },
  { token: '--block-ask', mockup: '#8F6BFF', value: '#8059EC' }
];
const darkened = (token: string): string => {
  const found = DARKENED_FILLS.find((f) => f.token === token);
  if (!found) throw new Error(`no darkened fill ${token}`);
  return found.value;
};

/**
 * The mockup's `:root`, as tokens. The standard names (`--background`, `--foreground`, `--primary` …) carry the same
 * values so the preset's own compositions and the contrast gate read the garden's colours, not Playful's.
 */
export const GARDEN_TOKENS: ReadonlyArray<{ name: string; value: string }> = [
  // The standard roles, pointed at the mockup.
  { name: '--background', value: '#FFF7E8' },
  { name: '--foreground', value: '#2E2A3D' },
  { name: '--surface', value: '#FFFFFF' },
  { name: '--surface-raised', value: '#FFFFFF' },
  { name: '--muted', value: '#FFF0D3' },
  { name: '--muted-foreground', value: '#6E6784' },
  { name: '--border', value: '#EBDFC4' },
  { name: '--border-subtle', value: '#EBDFC4' },
  { name: '--border-control', value: '#6E6784' },
  { name: '--ring', value: '#5FB4E8' },
  { name: '--primary', value: darkened('--primary') },
  { name: '--primary-hover', value: '#04703F' },
  { name: '--primary-foreground', value: '#FFFFFF' },
  { name: '--secondary', value: darkened('--secondary') },
  { name: '--secondary-hover', value: '#B43C1E' },
  { name: '--secondary-foreground', value: '#FFFFFF' },
  { name: '--accent', value: '#FFD166' },
  { name: '--accent-foreground', value: '#2E2A3D' },
  { name: '--font-sans', value: '"Nunito", system-ui, sans-serif' },
  // The mockup's own names.
  { name: '--paper', value: '#FFF7E8' },
  { name: '--paper-2', value: '#FFF0D3' },
  { name: '--card', value: '#FFFFFF' },
  { name: '--ink', value: '#2E2A3D' },
  { name: '--ink-2', value: '#6E6784' },
  { name: '--line', value: '#EBDFC4' },
  { name: '--leaf', value: darkened('--leaf') },
  { name: '--leaf-2', value: '#DDF3E4' },
  { name: '--leaf-3', value: '#BFE8CC' },
  { name: '--soil', value: '#C79A63' },
  { name: '--sand', value: '#F1DFB5' },
  { name: '--pond', value: '#7CC6F0' },
  { name: '--pond-2', value: '#4FA7DC' },
  { name: '--coral', value: darkened('--coral') },
  { name: '--sun', value: '#FFD166' },
  { name: '--violet', value: darkened('--violet') },
  { name: '--violet-2', value: '#EEE8FF' },
  // The bubble's and the owl row's text on violet-2 (the mockup's #4A2FA6 and #6a5aa8).
  { name: '--violet-ink', value: '#4A2FA6' },
  { name: '--violet-meta', value: '#6A5AA8' },
  { name: '--sky', value: '#5FB4E8' },
  // The "she is awake" dot: a mark, not a ground for words — the mockup's bright green stays.
  { name: '--ok', value: '#3FA66B' },
  { name: '--off', value: '#CFC6B3' },
  { name: '--on-fill', value: '#FFFFFF' },
  // The four block colours (the mockup's --motion --action --control --ask, darkened for white words). The kit is fed these by name.
  { name: '--block-motion', value: darkened('--block-motion') },
  { name: '--block-action', value: darkened('--block-action') },
  { name: '--block-control', value: darkened('--block-control') },
  { name: '--block-ask', value: darkened('--block-ask') },
  // IG-001 D5 (P106 s1): the running ring is the ink (#2E2A3D = --ink), 13:1 on the panel and 12:1 inside a repeat; the
  // sun it was (1.44:1 on white) stays only as the drag drop-line's own token.
  { name: '--block-run', value: '#2E2A3D' },
  { name: '--block-drop', value: '#FFD166' },
  // The tidy box, the repeat's ground, a watered tulip's dot, the pad's water key (mockup literals, named once).
  { name: '--tidy', value: '#FFF4E0' },
  { name: '--tidy-edge', value: '#FFD9A3' },
  { name: '--rep', value: '#FFF0DA' },
  { name: '--tulip-dot', value: '#FFD9E2' },
  { name: '--water-key', value: '#E4F4FF' },
  { name: '--stage-top', value: '#FFF3DE' },
  { name: '--stage-bottom', value: '#FFE7BE' },
  { name: '--sea-top', value: '#9FD9F3' },
  { name: '--sea-bottom', value: '#7CC6F0' },
  // The island's land, its inner edge and the sand under it (the mockup's .land literals, named once).
  { name: '--land', value: '#C8EBD2' },
  { name: '--land-edge', value: '#B4E1C2' },
  { name: '--shore', value: '#E9D9A8' },
  { name: '--shadow-soft', value: '0 6px 18px rgba(72, 52, 20, 0.10)' },
  { name: '--shadow-key', value: '0 4px 10px rgba(0, 0, 0, 0.15)' },
  { name: '--shadow-press', value: 'inset 0 -4px 0 rgba(0, 0, 0, 0.15)' },
  { name: '--shadow-block', value: 'inset 0 -3px 0 rgba(0, 0, 0, 0.18)' },
  { name: '--world-edge', value: '#A8D9B4' },
  { name: '--radius-card', value: '18px' },
  { name: '--radius-bar', value: '22px' },
  ...ROBOT_PAINTS.map((p) => ({ name: p.token, value: p.hex }))
];

/** A token's value, for the gate and for the contrast table. */
export function tokenValue(name: string): string {
  const found = GARDEN_TOKENS.find((t) => t.name === name);
  if (!found) throw new Error(`no garden token ${name}`);
  return found.value;
}

// ── The sprites: the mockup's <symbol>s, verbatim, as data URIs ──────────────

const svg = (viewBox: string, body: string) => `<svg xmlns='http://www.w3.org/2000/svg' viewBox='${viewBox}'>${body}</svg>`;
const uri = (s: string) => `url("data:image/svg+xml,${encodeURIComponent(s)}")`;

/** Pictures drawn as a background (their own colours). */
export const SPRITES: Readonly<Record<string, string>> = {
  tulip: svg('0 0 48 64', "<path d='M24 62V30' stroke='#3FA66B' stroke-width='4' stroke-linecap='round'/><path d='M24 48c-6-2-10-8-12-14 6 0 11 4 12 8-1-4 6-8 12-8-2 6-6 12-12 14z' fill='#3FA66B'/><path d='M10 12c0 14 6 22 14 24 8-2 14-10 14-24-4 4-8 6-14 2-6 4-10 2-14-2z' fill='#FF6B9A'/><path d='M24 14v22' stroke='#E04E7E' stroke-width='2'/>"),
  tree: svg('0 0 64 64', "<rect x='28' y='40' width='8' height='18' rx='3' fill='#A9773F'/><circle cx='32' cy='26' r='16' fill='#3E9B62'/><circle cx='20' cy='34' r='11' fill='#48AF70'/><circle cx='44' cy='34' r='11' fill='#48AF70'/><circle cx='26' cy='20' r='3' fill='#FFD166'/><circle cx='40' cy='30' r='3' fill='#FFD166'/>"),
  house: svg('0 0 64 64', "<path d='M8 30L32 8l24 22v28H8z' fill='#FFE3B3'/><path d='M4 32L32 6l28 26-4 4L32 14 8 36z' fill='#E86A5E'/><rect x='26' y='38' width='12' height='18' rx='2' fill='#8B5A2B'/><rect x='12' y='36' width='9' height='9' rx='2' fill='#7CC6F0'/><rect x='43' y='36' width='9' height='9' rx='2' fill='#7CC6F0'/>"),
  granny: svg('0 0 64 64', "<circle cx='32' cy='30' r='18' fill='#F7D3B5'/><path d='M14 26c0-14 36-14 36 0 0 4-2 6-4 6-4-8-24-8-28 0-2 0-4-2-4-6z' fill='#E9E4EF'/><circle cx='25' cy='30' r='2.5' fill='#2E2A3D'/><circle cx='39' cy='30' r='2.5' fill='#2E2A3D'/><circle cx='25' cy='30' r='5' fill='none' stroke='#2E2A3D' stroke-width='1.5'/><circle cx='39' cy='30' r='5' fill='none' stroke='#2E2A3D' stroke-width='1.5'/><path d='M30 30h4' stroke='#2E2A3D' stroke-width='1.5'/><path d='M26 38q6 5 12 0' stroke='#C0574A' stroke-width='2' fill='none' stroke-linecap='round'/><path d='M14 62c2-12 34-12 36 0z' fill='#8F6BFF'/>"),
  cat: svg('0 0 64 64', "<path d='M14 30l4-16 10 8h8l10-8 4 16z' fill='#F3B76A'/><ellipse cx='32' cy='38' rx='18' ry='16' fill='#F3B76A'/><circle cx='25' cy='36' r='3' fill='#2E2A3D'/><circle cx='39' cy='36' r='3' fill='#2E2A3D'/><path d='M29 43h6l-3 3z' fill='#E06B8A'/><path d='M10 40h10M10 46h10M44 40h10M44 46h10' stroke='#2E2A3D' stroke-width='1.5'/>"),
  postie: svg('0 0 64 64', "<circle cx='32' cy='28' r='16' fill='#C98A5E'/><path d='M14 24c2-12 34-12 36 0z' fill='#3E63C8'/><rect x='10' y='20' width='44' height='6' rx='3' fill='#3E63C8'/><circle cx='26' cy='30' r='2.5' fill='#2E2A3D'/><circle cx='38' cy='30' r='2.5' fill='#2E2A3D'/><path d='M27 37q5 4 10 0' stroke='#7A3F2D' stroke-width='2' fill='none' stroke-linecap='round'/><path d='M14 62c2-12 34-12 36 0z' fill='#3E63C8'/>"),
  owl: svg('0 0 64 64', "<ellipse cx='32' cy='36' rx='22' ry='24' fill='#8F6BFF'/><path d='M12 18l8 8h24l8-8-6 2-4-4-6 4-6-4-4 4z' fill='#8F6BFF'/><ellipse cx='32' cy='42' rx='14' ry='14' fill='#EEE8FF'/><circle cx='24' cy='32' r='8' fill='#fff'/><circle cx='40' cy='32' r='8' fill='#fff'/><circle cx='25' cy='33' r='4' fill='#2E2A3D'/><circle cx='39' cy='33' r='4' fill='#2E2A3D'/><path d='M32 38l-4 5h8z' fill='#FFB347'/><path d='M26 58l-3 4M38 58l3 4' stroke='#FFB347' stroke-width='3' stroke-linecap='round'/>"),
  rock: svg('0 0 64 64', "<path d='M12 48l6-18 14-8 16 6 6 16-8 6H20z' fill='#9C9AA6'/><path d='M20 40l6-10 12-2 8 8-4 8H24z' fill='#B7B5C2'/>")
};

/** Icons painted in the button's own text colour (a mask), the mockup's `i-*` symbols. */
export const ICONS: Readonly<Record<string, string>> = {
  fwd: svg('0 0 24 24', "<path d='M12 4l7 8h-4v8H9v-8H5z'/>"),
  left: svg('0 0 24 24', "<path d='M9 6L3 11l6 5v-3h6a4 4 0 010 8h-2v-3h2a1 1 0 000-2H9v3z' transform='scale(1,-1) translate(0,-24)'/>"),
  right: svg('0 0 24 24', "<path d='M15 6l6 5-6 5v-3H9a4 4 0 000 8h2v-3H9a1 1 0 010-2h6v3z' transform='scale(1,-1) translate(0,-24)'/>"),
  water: svg('0 0 24 24', "<path d='M12 3s6 7 6 11a6 6 0 01-12 0c0-4 6-11 6-11z'/>"),
  play: svg('0 0 24 24', "<path d='M7 4l13 8-13 8z'/>"),
  step: svg('0 0 24 24', "<path d='M5 4l10 8-10 8z'/><rect x='17' y='4' width='3' height='16'/>"),
  rec: svg('0 0 24 24', "<circle cx='12' cy='12' r='7'/>"),
  reset: svg('0 0 24 24', "<path d='M12 5a7 7 0 106.3 4H16l4-5 2 5h-1.6A9 9 0 1112 3z'/>"),
  tidy: svg('0 0 24 24', "<path d='M4 6h16v3H4zm0 5h10v3H4zm0 5h6v3H4z'/><path d='M17 12l4 4-4 4v-3h-3v-2h3z'/>"),
  // P106 IG-003: Drive (the mockup's i-drive: a wheel). Predict left the bar with its icon.
  drive: svg('0 0 24 24', "<circle cx='12' cy='12' r='8' fill='none' stroke='black' stroke-width='3'/><circle cx='12' cy='12' r='2.5'/><path d='M12 4v5M4 12h5M12 20v-5M20 12h-5' stroke='black' stroke-width='3'/>"),
  // The merge of P106 s3 (IG-003 × IG-004): the island's Find my robots — a map pin (Predict's old icon, which left the bar).
  find: svg('0 0 24 24', "<path d='M12 2a7 7 0 017 7c0 5-7 13-7 13S5 14 5 9a7 7 0 017-7zm0 4a3 3 0 100 6 3 3 0 000-6z'/>"),
  // IG-001 D10: the pad's action keys beyond water — pick up (up off the ground), put down (down onto it), fill (a drop into the can).
  pick: svg('0 0 24 24', "<path d='M12 3l6 7h-4v6h-4v-6H6z'/><path d='M4 19h16v2H4z'/>"),
  put: svg('0 0 24 24', "<path d='M12 17l6-7h-4V4h-4v6H6z'/><path d='M4 19h16v2H4z'/>"),
  fill: svg('0 0 24 24', "<path d='M5 10h11v9a2 2 0 01-2 2H7a2 2 0 01-2-2z'/><path d='M16 12l4-3v7l-4-2z'/><path d='M10.5 2s3 3.2 3 5.2a3 3 0 01-6 0c0-2 3-5.2 3-5.2z'/>"),
  owl: svg('0 0 64 64', "<ellipse cx='32' cy='36' rx='22' ry='24'/><path d='M12 18l8 8h24l8-8-6 2-4-4-6 4-6-4-4 4z'/>"),
  // P108 IW-001 F1: Stop (a square); F7: the pad's say (a speech bubble) and read (an open note).
  stop: svg('0 0 24 24', "<rect x='5' y='5' width='14' height='14' rx='2'/>"),
  say: svg('0 0 24 24', "<path d='M4 4h16a2 2 0 012 2v9a2 2 0 01-2 2h-9l-5 4v-4H4a2 2 0 01-2-2V6a2 2 0 012-2z'/>"),
  read: svg('0 0 24 24', "<path d='M2 5c3-1 6-1 9 1v14c-3-2-6-2-9-1z'/><path d='M13 6c3-2 6-2 9-1v14c-3-1-6-1-9 1z'/>")
};

const spriteRules = Object.entries(SPRITES)
  .map(([name, s]) => `.bg-sp-${name} { background-image: ${uri(s)}; background-repeat: no-repeat; background-position: center; background-size: 78% 78%; }`)
  .join('\n');
/** The owl glyph in her own colours on Ask Olive (CG-007 §7.1 item 2): a picture, not a white mask. */
const owlColourRule = `.bg-i-owlc::before { content: ''; display: inline-block; flex: none; width: 24px; height: 24px; margin-right: 8px; background-image: ${uri(SPRITES.owl)}; background-repeat: no-repeat; background-position: center; background-size: contain; }`;
const iconRules = Object.entries(ICONS)
  .map(([name, s]) => `.bg-i-${name}::before { content: ''; display: inline-block; flex: none; width: 20px; height: 20px; margin-right: 8px; background-color: currentColor; -webkit-mask: ${uri(s)} center / contain no-repeat; mask: ${uri(s)} center / contain no-repeat; }`)
  .join('\n');

/** Every class the graph names, in one sheet. Colours are `var(--token)`; the sprites keep their own paint. */
export const GARDEN_CSS = `/* Olive's Island, the look (P105 CG-007). The mockup's rules, ported; prefixed bg- so nothing collides with a kit's gd- classes. */
html, body { background: var(--paper); }
body { margin: 0; color: var(--ink); font-family: 'Nunito', system-ui, sans-serif; font-size: 16px; line-height: 1.45; -webkit-font-smoothing: antialiased; }
h1, h2, h3 { font-family: 'Fredoka', 'Nunito', sans-serif; letter-spacing: 0.005em; text-wrap: balance; }
button, input { font-family: inherit; }
button:focus-visible, input:focus-visible, .bg-press:focus-visible { outline: 3px solid var(--sky) !important; outline-offset: 2px; }

/* The top bar: one white rounded card (the mockup's .top). */
.bg-top { box-shadow: var(--shadow-soft); border-radius: var(--radius-bar); }
.bg-brand { font-family: 'Fredoka', sans-serif; font-weight: 700; }
.bg-brand-mark { width: 38px; min-width: 38px; height: 38px; }
.bg-tabs { margin-left: auto; }
/* A phone: the five tabs wrap inside the bar. Content-sized, they measured 506 px wide and the whole page shrank to fit (s2 drive at 390: innerWidth 506). */
@media (max-width: 600px) { .bg-tabs { width: 100% !important; max-width: 100% !important; margin-left: 0 !important; flex-wrap: wrap !important; } .bg-tab { padding-left: 10px !important; padding-right: 10px !important; } }
/*
 * AC4 on a phone: the world, the controls and the owl without scrolling to find Play. Measured at a true 390 x 844
 * (s2 drive, FR): Play's bottom at 849, the owl's top at 965. So, under 600 px only: the bar is two rows (the tulip,
 * the switches and the face; then the tabs, smaller), the workshop's title is 26 px and its general line is dropped
 * (the task card below says what the islander wants), and the controls are a little tighter.
 */
@media (max-width: 600px) {
  .bg-brand { display: none !important; }
  .bg-tabs { order: 5; }
  .bg-tab { padding-top: 6px !important; padding-bottom: 6px !important; padding-left: 8px !important; padding-right: 8px !important; }
  .bg-tab * { font-size: 14px !important; }
  .bg-ws-title { font-size: 26px !important; }
  .bg-ws-sub { display: none !important; }
  .bg-controls .bg-btn { padding: 9px 14px !important; font-size: 15px !important; }
}
.bg-press { cursor: pointer; user-select: none; transition: transform 100ms, filter 100ms; }
.bg-press:active { transform: scale(0.97); }
.bg-tab { border-radius: 999px; }
.bg-seg { border-radius: 999px; }
.bg-seg-btn { border-radius: 999px; }
.bg-who-face { width: 34px; min-width: 34px; height: 34px; border-radius: 50%; }

/* Page heads (the mockup's .head, .eyebrow). */
.bg-eyebrow { text-transform: uppercase; letter-spacing: 0.08em; }

/* Buttons: pills with a fill, never an outline (AC2). The fill and the ink are node ports; the class is the shape, the press and the icon. */
.bg-btn { cursor: pointer; display: inline-flex !important; align-items: center; white-space: nowrap; transition: transform 100ms, filter 100ms; }
.bg-btn:active { transform: scale(0.97); }
.bg-btn:hover { filter: brightness(1.05); }
.bg-btn[disabled], .bg-btn:disabled { opacity: 0.45; cursor: default; }
${iconRules}
${owlColourRule}

/* Cards (the mockup's .panel). */
.bg-panel { box-shadow: var(--shadow-soft); }
.bg-grow { flex: 1 1 0 !important; min-width: 0 !important; width: auto !important; }
.bg-face { border-radius: 50%; background-color: var(--paper-2); }

/* The workshop: world and steps side by side, one column under 980px (the mockup's .ws). */
/* P108 IW-004: the steps column is the Blockly workspace (the drawer inside it) — IW-000's right half, as Richard graded it:
   clamp(440px, 50vw, 780px). */
.bg-ws { display: grid !important; grid-template-columns: minmax(0, 1fr) clamp(440px, 50vw, 780px); gap: 16px; align-items: start; }
@media (max-width: 980px) { .bg-ws { grid-template-columns: minmax(0, 1fr); } }
.bg-stage { position: relative !important; width: 100%; max-width: 640px; margin: 0 auto; }
/* P106 s4 (b): with the pad on (Drive, Teach) the stage is the world and the pad side by side, so no key hides a tile (s3:
   the pad sat on the plot's lower-right tiles — a rock, a tree, the path's end). The world keeps 640 px where it fits and
   gives way down to 300 (1024 × 768: 352 px, the pad and the bar still on the first screen; at a 400 basis the pad
   wrapped under the world and off it); only then does the pad wrap under it. A phone keeps the pad over the corner (the
   media rule under the pad's): there is no room beside, and under the world it would push Play off the first screen
   (CG-003 AC4). */
.bg-stage:has(> .bg-pad) { max-width: 836px; display: flex !important; flex-direction: row !important; flex-wrap: wrap; align-items: flex-end; justify-content: center; gap: 16px; }
.bg-stage:has(> .bg-pad) > :not(.bg-pad):not(.bg-rec) { flex: 1 1 300px; max-width: 640px; min-width: 0; }
.bg-stage .gd-world { border: 4px solid var(--world-edge); border-radius: 16px; }
.bg-rec { position: absolute !important; left: 10px !important; top: 10px !important; z-index: 6; box-shadow: var(--shadow-soft); pointer-events: none; }
.bg-rec::before { content: ''; width: 10px; height: 10px; border-radius: 50%; background: var(--coral); margin-right: 8px; animation: bg-blink 1s infinite; }
@keyframes bg-blink { 50% { opacity: 0.2; } }
/* P106 IG-003: Drive · Teach · Play. The mode on is ringed (the mockup's aria-pressed ring: ink, then white); the tag on
   the world is blue and still while driving; the steps sit on the paper while driving, never faded (ruling 5). */
.bg-mode-on { box-shadow: 0 0 0 3px var(--ink), 0 0 0 6px var(--card) !important; }
.bg-rec-drive::before { background: var(--block-motion); animation: none; }
.bg-driving .gd-bk .blocklyMainBackground { fill: var(--paper-2); }
.bg-steps-note { font-weight: 700; }
/* The pad (the mockup's .pad), beside the world (P106 s4 (b), above), each key 56 px for a finger (AC5). On a phone it sits
   over the world's corner, as it did (the mockup's). */
.bg-pad { position: relative !important; flex: none; z-index: 6; display: grid !important; grid-template-columns: repeat(3, 56px); grid-template-rows: repeat(2, 56px); grid-auto-rows: 56px; gap: 6px; }
@media (max-width: 600px) { .bg-stage:has(> .bg-pad) { display: block !important; max-width: 640px; } .bg-pad { position: absolute !important; right: 10px !important; bottom: 10px !important; } }
.bg-key { width: 56px !important; height: 56px !important; min-width: 56px; min-height: 56px; border-radius: 14px; box-shadow: var(--shadow-key); display: grid !important; place-items: center; cursor: pointer; font-size: 0 !important; }
.bg-key::before { margin: 0 !important; width: 26px !important; height: 26px !important; }
.bg-key:active { transform: scale(0.94); }
/* IG-001 D10: the places on the pad — the motions fixed, the first allowed action in the centre, more on a third row. */
.bg-key-fwd { grid-column: 2; grid-row: 1; }
.bg-key-left { grid-column: 1; grid-row: 2; }
.bg-key-mid { grid-column: 2; grid-row: 2; }
.bg-key-r3a { grid-column: 1; grid-row: 3; }
.bg-key-r3b { grid-column: 2; grid-row: 3; }
.bg-key-r3c { grid-column: 3; grid-row: 3; }
/* P108 IW-001 F7: a fourth row for the drawer's other actions (say, Olive's read: violet, her colour). */
.bg-key-r4a { grid-column: 1; grid-row: 4; }
.bg-key-r4b { grid-column: 2; grid-row: 4; }
.bg-key-r4c { grid-column: 3; grid-row: 4; }
.bg-key-olive-read { color: var(--violet-ink); background-color: var(--violet-2) !important; }
.bg-key-water { color: var(--pond-2); background-color: var(--water-key) !important; }
.bg-key-right { grid-column: 3; grid-row: 2; }
.bg-controls { margin-top: 12px; }
.bg-ask-push { margin-left: auto !important; }
@media (max-width: 480px) { .bg-ask-push { margin-left: 0 !important; } }

/* The owl row (the mockup's .owl). */
.bg-owl { display: grid !important; grid-template-columns: 64px minmax(0, 1fr); gap: 12px; align-items: start; }
.bg-owl-pic { width: 64px; height: 64px; }
.bg-owl-meta::before { content: ''; display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--ok); margin-right: 6px; }
/* The owl's two tags (CG-005 s3): thinking — three dots that fill in turn, no clock — and resting, still. */
.bg-owl-tag { letter-spacing: 0.01em; }
.bg-owl-thinking::after { content: '...'; display: inline-block; overflow: hidden; vertical-align: bottom; width: 0; animation: bg-dots 1.2s steps(4, end) infinite; }
@keyframes bg-dots { to { width: 1.1em; } }
/* Olive's proposal (CG-005 s3, AC1): a white card in her row, her blocks in words, Use them / No thanks. */
.bg-proposal { box-shadow: var(--shadow-soft); animation: bg-pop 300ms cubic-bezier(0.34, 1.56, 0.64, 1) both; }
.bg-prop-blocks { font-weight: 700; }

/* The steps (the mockup's .script). P108 IW-004: the program is ONE Blockly workspace (garden-kit.Blocks) with the drawer
   inside it on its left edge, always open (Scratch's side), and the program taking the rest; Blockly scrolls and zooms it
   (the node's + − ⤢). Beside the world (over 980 px) the steps panel is a screen tall — never shorter than the world's
   column (contain: size, so a long program never makes the row, and the page, taller) — and the workspace takes all its
   height down to the bar (IW-001 F6's box, now Blockly's); under 980 px it is most of a screen tall under the world. */
.bg-blocks-box { display: flex !important; flex-direction: column; min-height: 0; }
.bg-blocks-box > .gd-bk { flex: 1 1 auto; height: 70vh; min-height: 440px; }
@media (min-width: 981px) {
  .bg-steps { align-self: stretch !important; contain: size; min-height: calc(100vh - 16px); display: flex !important; flex-direction: column !important; }
  .bg-steps > .bg-blocks-box { flex: 1 1 0 !important; min-height: 0 !important; }
  .bg-blocks-box > .gd-bk { height: 100%; min-height: 420px; }
}
/* IW-004: what the robot remembers (set / change), one line under the world, the monitor's violet. */
.bg-vars { color: var(--violet-ink) !important; }
/* An ask block Olive cannot be asked with yet (CG-005 AC6): the reason, in words, under the block list. */
.bg-slot-msg::before { content: '!'; display: inline-block; width: 18px; height: 18px; margin-right: 6px; border-radius: 50%; background: var(--coral); color: var(--on-fill); font-size: 12px; line-height: 18px; text-align: center; }
.bg-tidy { animation: bg-pop 300ms cubic-bezier(0.34, 1.56, 0.64, 1) both; }

/* The win card: fixed, centred, over whatever is scrolled (AC7; P95 R6: every positioning property !important). */
/* A Group writes its own flex alignment INLINE: every centring property here is !important too, or the card sits at the top (s2 drive: cy 182 of 912). */
.bg-win { position: fixed !important; left: 0 !important; right: 0 !important; top: 0 !important; bottom: 0 !important; width: 100vw !important; height: 100vh !important; z-index: 50 !important; display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important; background: color-mix(in srgb, var(--paper) 72%, transparent); backdrop-filter: blur(2px); padding: 16px; }
.bg-win-card { box-shadow: var(--shadow-soft); animation: bg-pop 350ms cubic-bezier(0.34, 1.56, 0.64, 1) both; max-width: 380px; }
@keyframes bg-pop { from { transform: scale(0.2); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.bg-reward { border-radius: 999px; }

/* The island page's two columns, then .quest, .tag (P106 s4: the P105 sea with pins went with IG-004's island). */
.bg-island { display: grid !important; grid-template-columns: minmax(0, 1fr) 360px; gap: 16px; align-items: start; }
@media (max-width: 980px) { .bg-island { grid-template-columns: minmax(0, 1fr); } }
/* The robot on the Profiles card: the kit draws only the robot, on no ground, and its name as its label. A drawing, not a
   board: a press on the robot is a press on its card. */
.bg-profile-stage .gd-world { width: 100% !important; max-width: none !important; border: 0 !important; background: transparent !important; overflow: visible !important; border-radius: 0 !important; }
.bg-profile-stage .gd-cell { background: transparent !important; cursor: default; }
.bg-profile-stage .gd-world { pointer-events: none; }
.bg-profile-stage .gd-name { top: 100% !important; font-size: 13px !important; padding: 3px 10px !important; box-shadow: var(--shadow-soft) !important; }
.bg-quest { box-shadow: var(--shadow-soft); display: grid !important; grid-template-columns: 52px minmax(0, 1fr) auto; gap: 12px; align-items: center; cursor: pointer; }
.bg-tag { border-radius: 999px; }
.bg-tag-motion { background-color: var(--block-motion); }
.bg-tag-control { background-color: var(--block-control); }
.bg-tag-ask { background-color: var(--block-ask); }
/* The mockup's .go: free play's green arrow on the card, no fill. */
.bg-go { background-color: transparent !important; padding: 0 4px !important; }
.bg-go * { color: var(--leaf) !important; font-size: 22px !important; }
/* P106 IG-004 (lane E): the island as one world — the island on its sea (the flat one scrolls sideways on a phone, the 3D
   one frames itself), "find my robots" over its corner, the plot card under it (the mockup's violet note). */
.bg-isle { position: relative !important; width: 100% !important; box-sizing: border-box; padding: 12px !important; border-radius: 22px; background: linear-gradient(180deg, var(--sea-top), var(--sea-bottom)); }
.bg-isle-scroll { width: 100% !important; overflow-x: auto !important; overflow-y: hidden !important; border-radius: 16px; -webkit-overflow-scrolling: touch; }
.bg-isle-scroll .gd-world { max-width: none !important; min-width: 736px; border: 4px solid var(--world-edge); }
.bg-isle-scroll .gd3-world { max-width: none !important; aspect-ratio: 16 / 10 !important; }
.bg-isle-find { position: absolute !important; top: 20px !important; right: 20px !important; z-index: 7; box-shadow: var(--shadow-soft); }
.bg-isle-tap { position: absolute !important; left: 20px !important; top: 20px !important; z-index: 7; background: var(--card); border-radius: 999px; padding: 4px 12px; box-shadow: var(--shadow-soft); pointer-events: none; }
.bg-isle-found .gd-bot { animation: bg-found 700ms ease-in-out 3; }
@keyframes bg-found { 50% { filter: drop-shadow(0 0 6px var(--sun)) drop-shadow(0 0 2px var(--ink)); } }
.bg-plot-card { background-color: var(--violet-2) !important; }
.bg-plot-card .bg-plot-line { color: var(--violet-ink) !important; }
@media (max-width: 600px) { .bg-isle { padding: 8px !important; } .bg-isle-tap { display: none !important; } .bg-isle-find { position: static !important; margin-top: 8px; } }

/* My robot (the mockup's .robo, .stage, .sw, .hats). */
.bg-robo { display: grid !important; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 16px; }
@media (max-width: 820px) { .bg-robo { grid-template-columns: minmax(0, 1fr); } }
.bg-robo-stage { background: linear-gradient(180deg, var(--stage-top), var(--stage-bottom)); border-radius: 22px; aspect-ratio: 1 / 1; max-height: 520px; display: grid !important; place-items: center; }
.bg-robo-stage .gd-world { width: 62% !important; background: transparent; }
.bg-robo-stage .gd-cell { background: transparent !important; }
.bg-swatch { width: 44px !important; height: 44px !important; min-width: 44px; border-radius: 50%; box-shadow: var(--shadow-press); cursor: pointer; }
.bg-swatch-on { outline: 4px solid var(--ink); outline-offset: 3px; }
.bg-chip { border-radius: 999px; cursor: pointer; }
.bg-chip-lock { opacity: 0.5; cursor: default; }
.bg-sticker { box-shadow: var(--shadow-soft); border-radius: 12px; }

/* Skills (the mockup's .path, .notion). A seed sits flat on the paper — never faded (a faded card's words fall under 4.5:1). */
.bg-path { display: grid !important; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 12px; }
.bg-notion { box-shadow: var(--shadow-soft); }
.bg-notion-seed { background-color: var(--paper) !important; box-shadow: none; }
.bg-blk { border-radius: 12px; box-shadow: var(--shadow-block); }
.bg-blk-motion { background-color: var(--block-motion); }
.bg-blk-action { background-color: var(--block-action); }
.bg-blk-control { background-color: var(--block-control); }
.bg-blk-ask { background-color: var(--block-ask); }
.bg-st-bloom { color: var(--leaf); }
.bg-st-sprout { color: var(--block-control); }
.bg-st-seed { color: var(--ink-2); }
.bg-prog { border-top: 1px solid var(--line); padding-top: 8px; margin-top: auto; }
.bg-caps { text-transform: uppercase; letter-spacing: 0.06em; }

/* Grown-ups (the mockup's .gu, .model, .out). */
.bg-gu { display: grid !important; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 14px; align-items: start; }
.bg-dot { width: 10px; min-width: 10px; height: 10px; border-radius: 50%; }
.bg-li::before { content: '•'; margin-right: 8px; color: var(--ink-2); }
.bg-code { font-family: ui-monospace, Menlo, monospace; word-break: break-all; }

/* Profiles (the design pass): a white card per kid, her robot on the My robot stage's warm ground, then her face,
   name and band; the new player is an empty card with a plus. */
.bg-profiles { align-items: stretch !important; }
.bg-profile { box-shadow: var(--shadow-soft); cursor: pointer; }
.bg-profile-stage { background: linear-gradient(180deg, var(--stage-top), var(--stage-bottom)); display: grid !important; place-items: center; padding: 10px 0 22px; }
.bg-profile-stage .gd-world { width: 88px !important; }
.bg-profile-band { background: var(--paper-2); border-radius: 999px; padding: 2px 9px; align-self: flex-start; }
.bg-profile-new { border: 2px dashed var(--line) !important; display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important; gap: 10px; cursor: pointer; box-shadow: none; }
.bg-profile-new::before { content: '+'; width: 56px; height: 56px; border-radius: 50%; background: var(--card); color: var(--leaf); font-size: 34px; font-weight: 700; line-height: 54px; text-align: center; box-shadow: var(--shadow-soft); }
@media (max-width: 480px) { .bg-profile, .bg-profile-new { width: calc(50% - 7px) !important; min-width: 0 !important; } }

/* The workshop's progress marks (the mockup's .tulips .d): round, filled with a tulip once it drank. */
.bg-marks { margin-left: auto; flex: none; }
.bg-mark { border-radius: 50%; flex: none; }
.bg-mark-lit { background-size: 62% 62% !important; }

/* P106 IG-005 (lane B): My robots (the mockup's 09-robots) — a card per robot in a row that wraps, its drawing on the
   stage's warm ground, whose it is as a small tag (mint yours, violet lent, grey locked), its blocks as chips in their
   block colours, the upgrade slot dashed while empty; a robot not lent yet sits on the paper. The win card's lent line. */
.bg-robots { align-items: stretch !important; }
.bg-robot-card { width: 300px !important; min-width: 0 !important; box-shadow: var(--shadow-soft); }
@media (max-width: 480px) { .bg-robot-card { width: 100% !important; } }
.bg-robot-locked { background-color: var(--paper-2) !important; box-shadow: none; }
.bg-robot-stage { background: linear-gradient(180deg, var(--stage-top), var(--stage-bottom)); display: grid !important; place-items: center; flex: none; }
.bg-robot-stage .gd-world { width: 64px !important; max-width: none !important; border: 0 !important; background: transparent !important; overflow: visible !important; border-radius: 0 !important; pointer-events: none; }
.bg-robot-stage .gd-cell { background: transparent !important; cursor: default; }
.bg-robot-stage .gd-name { display: none !important; }
.bg-robot-tag { flex: none; }
.bg-robot-tag-yours { background-color: var(--leaf-2); }
.bg-robot-tag-lent { background-color: var(--violet-2); }
.bg-robot-tag-locked { background-color: var(--line); }
.bg-robot-up { background-color: var(--paper-2); border: 2px dashed var(--line); }
.bg-robot-up-on { border-style: solid; border-color: transparent; background-color: var(--leaf-2); }
.bg-ability { box-shadow: none !important; }
.bg-win-lent { background-color: var(--violet-2); border-radius: 14px; padding: 8px 12px; }

${spriteRules}

/* Reduced motion: the mockup's own rule. Every animation and transition stops; the tulip still reads by opacity and pose. */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
`;
