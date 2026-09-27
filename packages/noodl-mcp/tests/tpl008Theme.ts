/**
 * TPL-008 — the look of the todo list, and nothing else.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * ## Plain on purpose
 *
 * Richard, reviewing the first mockup (2026-09-14): *"The style looks like it's
 * trying too hard for what the app actually is, can you clean and simplify it
 * please? Less font sizes, colours, distracting elements."* The second mockup is
 * what he approved, and this file is that mockup's palette, token for token:
 *
 * - one faintly warm grey ground, white surfaces, near-black text, one grey for
 *   everything secondary;
 * - **one** accent (a calm blue) for the primary button and a ticked box;
 * - red **only** for an overdue deadline and a write that did not save.
 *
 * 🔴 **Three type sizes and no more**: `--text-sm` for meta, `--text-base` for
 * everything a person reads, `--text-xl` for the two titles. `tpl008Template.test.ts`
 * counts the distinct `fontSize` values in the artefact and fails on a fourth.
 *
 * ⚠️ Starts from `minimal` — the shipped preset `tpl001Theme.ts` measured as
 * passing AA on its own primary button — and overrides the grounds, so every
 * ratio the preset was measured at is re-measured by the gate from these tokens.
 *
 * @module noodl-mcp/tests/tpl008Theme
 */
import { buildStyleVocabulary } from '../src/editor-deps';

export const TPL008_PRESET = 'minimal';

export const TPL008_TOKENS: ReadonlyArray<{ name: string; value: string }> = [
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
  { name: '--font-sans', value: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }
];

/**
 * The pairs this template actually draws, recomputed by the gate from
 * {@link TPL008_TOKENS}. `floor` is WCAG AA: 4.5 for text, 3 for a control's edge.
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
  { fg: '--border-control', bg: '--surface', floor: 3 }
];

// ── Dark, and the switch between them ───────────────────────────────────────

/**
 * Richard (2026-09-14): *"can we have dark and light mode, matching system by default
 * but with a little icon at the top right for changing?"*
 *
 * The same palette at night: one ink ground a step darker than the surfaces, one grey
 * for everything secondary, the accent lifted to a light blue (the primary button's
 * words go dark on it), red lifted just enough to read. **Every colour token the light
 * set overrides is overridden here**, by name — the gate fails on a name in one set and
 * not the other — and {@link CONTRAST_PAIRS} is recomputed against this set too.
 *
 * 🔴 **The project's token block is `:root { … }` (`ProjectTokenCss`), so the dark block
 * is a CSS rule on a MORE specific selector, not a second token set.** Nothing in the
 * runtime knows about dark mode; the App's `CSS Definition` carries both rules:
 *
 * - `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { … } }` —
 *   the system decides, live, with no script;
 * - `:root[data-theme="dark"] { … }` — the person chose dark on a light system.
 *
 * `data-theme` is written only when the choice DIFFERS from the system, so choosing
 * the system's own theme again forgets the choice and the page follows the system from
 * then on (`THEME_FLIP_SCRIPT`).
 */
export const TPL008_DARK_TOKENS: ReadonlyArray<{ name: string; value: string }> = [
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
  { name: '--border-control', value: '#83878c' }
];

/** Where the person's choice is kept. Absent = follow the system. */
export const THEME_STORAGE_KEY = 'nodegx-todo-list-theme';

/** The two icon buttons. CSS shows exactly one: the theme you would switch TO. */
export const THEME_TO_DARK_CLASS = 'todo-theme-to-dark';
export const THEME_TO_LIGHT_CLASS = 'todo-theme-to-light';

/**
 * Deadline reminders (s6). The template draws a bell and nothing else: what turns reminders on
 * belongs to the HOST — a service worker, a push key and a server that sends at 9am — so the bell
 * shows only when the page it is served in says it can, by setting `data-reminders` on the root
 * (`off`, `on`, or `install` on an iPhone that has not added the app to its Home Screen) and
 * providing `window.todoReminders`. The demo, the editor and a server with no sender set neither,
 * so none of them draws a bell that does nothing.
 */
export const REMINDERS_ATTRIBUTE = 'data-reminders';
export const REMINDERS_TURN_ON_CLASS = 'todo-reminders-turn-on';
export const REMINDERS_TURN_OFF_CLASS = 'todo-reminders-turn-off';
/** The press hands over to the host. Where there is no host there is no bell to press. */
export const REMINDERS_TOGGLE_SCRIPT = `if (window.todoReminders && typeof window.todoReminders.toggle === 'function') window.todoReminders.toggle();`;

/**
 * The App's stylesheet: the page ground, the dark tokens under both conditions, and
 * which switch icon shows. Which icon shows is decided by the SAME conditions as the
 * palette, so a system that turns dark at sunset changes the icon with the colours,
 * with no script listening.
 */
export function themeCss(): string {
  const tokens = TPL008_DARK_TOKENS.map((t) => `    ${t.name}: ${t.value};`).join('\n');
  const hide = (cls: string) => `.${cls} { display: none !important; }`;
  return [
    'html, body { background-color: var(--background); }',
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
    `:root[data-theme="light"] ${hide(THEME_TO_LIGHT_CLASS)}`,
    '',
    '/* Reminders: no bell unless the host can send them; then the one that changes the state. */',
    `:root:not([${REMINDERS_ATTRIBUTE}]) ${hide(REMINDERS_TURN_ON_CLASS)}`,
    `:root:not([${REMINDERS_ATTRIBUTE}="on"]) ${hide(REMINDERS_TURN_OFF_CLASS)}`,
    `:root[${REMINDERS_ATTRIBUTE}="on"] ${hide(REMINDERS_TURN_ON_CLASS)}`
  ].join('\n');
}

/** Shared by the two theme scripts: what the system wants, what the person chose, and applying it. */
const THEME_FNS = `var KEY = ${JSON.stringify(THEME_STORAGE_KEY)};
function systemTheme() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
function chosenTheme() {
  var v = null;
  try { v = window.localStorage.getItem(KEY); } catch (e) { v = window.__todoTheme || null; }
  return v === 'dark' || v === 'light' ? v : null;
}
function remember(v) {
  window.__todoTheme = v;
  try { if (v) window.localStorage.setItem(KEY, v); else window.localStorage.removeItem(KEY); } catch (e) {}
}
function applyTheme(v) {
  if (v) document.documentElement.setAttribute('data-theme', v);
  else document.documentElement.removeAttribute('data-theme');
}
`;

/** On load (a Function with nothing wired runs once): put back what the person chose, if anything. */
export const THEME_BOOT_SCRIPT = `${THEME_FNS}applyTheme(chosenTheme());`;

/**
 * The switch: the other theme from the one showing. Choosing the system's own theme
 * forgets the choice, so the page follows the system again.
 */
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
