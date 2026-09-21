/**
 * TPL-010 — the planner, component by component.
 *
 * `tpl010Template.ts` is the composition; this file is what the plan door is given.
 * It follows `mockups/envelopes-b.html` (proposal B, approved 2026-09-20) one for one,
 * and every ruling it obeys is named `R1`…`R15` from the task file.
 *
 * ## The one screen
 *
 * R5: **the week is the only main view, and it must fit above the fold on a laptop and
 * never grow.** Top to bottom: an app bar, four envelope tiles, one line of move chips,
 * six day columns, a cash strip. Behind a button: the projects card (R6) and the shutdown
 * drawer (R12). No tabs, no second page, no todo list of its own (R11).
 *
 * ## What the app is allowed to say
 *
 * R1, from the mockup Richard rejected: *"mostly just preachy … only telling you how bad
 * things are"*. **Every sentence this template generates is a plan for the days that are
 * left, never a verdict on the days that are gone.** `Logic/Envelopes` and `Logic/Shutdown`
 * are where sentences are made, and both are rules over data — there is no model in the
 * template. Hobby going over budget is *reported* and never flagged (R4): "not budgeted,
 * not counted, not a problem".
 *
 * ## Hours, not prices
 *
 * R2: the unit is **billable hours**. The month target is
 * `(householdNeed − partnerIncome) ÷ rate`, all three from `Settings`. R3: **six focused
 * hours a day** is the ceiling, the per-day need is `hours left ÷ working days left`, and
 * what the ceiling leaves over is the building budget.
 *
 * @module noodl-mcp/tests/tpl010Components
 */
import { DATE_PICKER_DESCRIPTION, DATE_PICKER_INPUTS, DATE_PICKER_OUTPUTS, datePickerGraph } from './datePicker';
import { composition, ENVELOPE_KEYS, ENVELOPE_NAMES, THEME_BOOT_SCRIPT, THEME_FLIP_SCRIPT, THEME_TO_DARK_CLASS, THEME_TO_LIGHT_CLASS, themeCss } from './tpl010Theme';

export const ROUTER = 'Main';
export const APP_COMPONENT = 'App';

/** R10, §2 of the task file. `Block` is the only one a person can delete (a dropped block). */
export const COLLECTIONS = ['Project', 'Block', 'MonthPlan', 'CashEvent', 'Settings'] as const;

export interface Tpl010Component {
  path: string;
  description: string;
  nodes: unknown[];
  connections: unknown[];
  inputs?: Array<{ name: string; type?: string; description?: string }>;
  outputs?: Array<{ name: string; type?: string; description?: string }>;
  repeats?: { source: 'static' | 'query' | 'variable' | 'array'; rowFields: string[] };
  instantiates?: string[];
}

// ── Names, spelled once ─────────────────────────────────────────────────────

export const C = {
  themeSwitch: '/Week/Theme switch',
  appBar: '/Week/App bar',
  envelopeTile: '/Week/Envelope tile',
  movesStrip: '/Week/Moves strip',
  moveChip: '/Week/Move chip',
  dayColumn: '/Week/Day column',
  dayHeader: '/Week/Day header',
  block: '/Week/Block',
  cashStrip: '/Week/Cash strip',
  cashEvent: '/Week/Cash event',
  shutdownDrawer: '/Week/Shutdown drawer',
  carryRow: '/Week/Carry row',
  projectCard: '/Week/Project card',
  projectListRow: '/Week/Project list row',
  projectDetail: '/Week/Project detail',
  dayBoxes: '/Week/Day boxes',
  sparkline: '/Week/Sparkline',
  sparkBar: '/Week/Spark bar',
  dayBox: '/Week/Day box',
  factRow: '/Week/Fact row',
  projectGroup: '/Week/Project group',
  settingsSheet: '/Week/Settings sheet',
  blockSheet: '/Week/Block sheet',
  entryRow: '/Week/Entry row',
  datePicker: '/Week/Date picker',
  projectEditor: '/Week/Project editor',
  cashEditor: '/Week/Cash editor',
  cashRow: '/Week/Cash row',
  dayPicker: '/Week/Day picker',
  dayPick: '/Week/Day pick',

  plannerData: '/Logic/Planner data',
  envelopes: '/Logic/Envelopes',
  dayColumns: '/Logic/Day columns',
  moves: '/Logic/Moves',
  cashLine: '/Logic/Cash line',
  shutdown: '/Logic/Shutdown',

  addBlock: '/Commands/Add block',
  saveBlock: '/Commands/Save block',
  addTime: '/Commands/Add time',
  carryBlock: '/Commands/Carry block',
  dropBlock: '/Commands/Drop block',
  placeMove: '/Commands/Place move',
  moveBlock: '/Commands/Move block',
  addProject: '/Commands/Add project',
  editProject: '/Commands/Edit project',
  setMonthPlan: '/Commands/Set month plan',
  addCashEvent: '/Commands/Add cash event',
  editCashEvent: '/Commands/Edit cash event',
  editSettings: '/Commands/Edit settings',

  pageWeek: '/Pages/Week',
  pageSignIn: '/Pages/Sign in'
} as const;

/** The app-wide variables. Global by name, and each is used for exactly one thing. */
export const VAR = {
  /** The Monday of the week on screen, `YYYY-MM-DD`. The `‹ ›` nav moves it by seven days (Q1). */
  weekStart: 'plannerWeekStart',
  /** Which project the card is showing. Empty until the card is opened. */
  cardProject: 'plannerCardProject',
  /** The one sentence a failed write shows. */
  problem: 'plannerProblem',
  /** Whether the evening drawer is open. */
  drawerOpen: 'plannerDrawerOpen',
  /** Whether the settings sheet is open. */
  sheetOpen: 'plannerSheetOpen',
  /**
   * Which block the log sheet is showing (AC4). Empty until a block is pressed — the same
   * shape as `cardProject`, and for the same reason: a Function asking "is this empty?"
   * gives a real boolean from the first frame, where a bare Variable gives `undefined`.
   */
  logBlock: 'plannerLogBlock',
  /** How the block sheet was opened: `tick` (R16a — Done starts ticked) or empty (the words or the hours). */
  logMode: 'plannerLogMode',
  /** The day a NEW block goes in, from the + at the foot of a column. Empty unless one is being made. */
  newDay: 'plannerNewDay',
  /** The card's right-hand pane: empty shows the project, `edit` its form, `new` an empty form (R23). */
  cardEdit: 'plannerCardEdit',
  /** The money event being edited in the settings: empty, `new`, or its id (R23). */
  cashEdit: 'plannerCashEdit',
  /** Which day the phone is showing. Empty until the picker is pressed, which means today. */
  phoneDay: 'plannerPhoneDay',
  /** What the backend said when signing in did not work. */
  signInError: 'plannerSignInError'
} as const;

export const PROBLEM_TEXT = 'That change did not save. Check your connection, then try again.';
export const LOAD_PROBLEM_TEXT = 'Your week could not be loaded. Check that the backend is running, then sign in again.';

export const SHARED_PROBLEM = 'Shared on purpose: this is the one sentence the Problem banner shows, whichever command failed.';

const FUNCTION = 'JavaScriptFunction';
const FOR_EACH = 'For Each';
const VARIABLE = 'Variable2';
const SET_VARIABLE = 'Set Variable';
const CONDITION = 'Condition';
const BUTTON = 'net.noodl.controls.button';
const TEXT_INPUT = 'net.noodl.controls.textinput';
const QUERY = 'DbCollection2';
const CREATE = 'NewDbModelProperties';
const UPDATE = 'SetDbModelProperties';
const DELETE = 'DeleteDbModelProperties';

const px = (value: number) => ({ value, unit: 'px' });
const pct = (value: number) => ({ value, unit: '%' });

/**
 * 🔴 prd-001 — the backend clamps any query without a limit to `queries.defaultLimit`
 * (1000) and refuses to go above `maxLimit`. Every query here carries its own explicit
 * limit AND a bounded window, so nothing depends on that default: a planner that has run
 * for three years still asks for two months of blocks.
 */
const QUERY_OFF = { 'runOnChange-collectionName': false, 'runOnChange-querySettings': false, storageEnableLimit: true };

// ── Node helpers ────────────────────────────────────────────────────────────

function port(name: string, type: string, description?: string) {
  return description ? { name, type, description } : { name, type };
}

function text(id: string, label: string, parent: string, value: string, params: Record<string, unknown>): unknown {
  return { id, type: 'Text', label, parent, parameters: { text: value, ...params } };
}

function group(id: string, label: string, parent: string | undefined, params: Record<string, unknown>): unknown {
  const node: Record<string, unknown> = { id, type: 'Group', label, parameters: params };
  if (parent) node.parent = parent;
  return node;
}

function place(id: string, type: string, label: string, parent: string, parameters?: Record<string, unknown>): unknown {
  const node: Record<string, unknown> = { id, type, label, parent };
  if (parameters) node.parameters = parameters;
  return node;
}

function logic(id: string, type: string, label: string, parameters?: Record<string, unknown>): unknown {
  const node: Record<string, unknown> = { id, type, label };
  if (parameters) node.parameters = parameters;
  return node;
}

function inputs(id: string, label: string, ports: Array<[string, string]>): unknown {
  return { id, type: 'Component Inputs', label, ports: ports.map(([name, type]) => ({ name, type, plug: 'output' })) };
}

function outputs(id: string, label: string, ports: Array<[string, string]>): unknown {
  return { id, type: 'Component Outputs', label, ports: ports.map(([name, type]) => ({ name, type, plug: 'input' })) };
}

function wire(fromId: string, fromProperty: string, toId: string, toProperty: string): unknown {
  return { fromId, fromProperty, toId, toProperty };
}

/** Untick Run On Value Change on each named input, so the node runs only on its signal. */
export function signalOnly(...inputNames: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const name of inputNames) out[`runOnChange-${name}`] = false;
  return out;
}

/** A `Function` that runs only when `run` pulses, with every value input ticked off. */
function script(id: string, label: string, source: string, ins: string[]): unknown {
  return logic(id, FUNCTION, label, { functionScript: source, ...signalOnly(...ins.map((n) => `in-${n}`)) });
}

/** A `Function` that re-runs whenever an input changes. */
function derive(id: string, label: string, source: string): unknown {
  return logic(id, FUNCTION, label, { functionScript: source });
}

/** Both halves of a component's interface, declared once for the plan and once as nodes. */
function iface(ins: Array<[string, string]>, outs: Array<[string, string]>) {
  return { inputs: ins.map(([n, t]) => port(n, t)), outputs: outs.map(([n, t]) => port(n, t)) };
}

// ── The look, from the product's own compositions ───────────────────────────

/** R2.1 — the mockup's small line is 12px, not the vocabulary's 14. */
const T_META = { ...composition('meta'), fontSize: 'var(--text-xs)' };
const T_BODY = composition('body');
/** R13a — Archivo, heavy and narrow, for the app's name and every card's heading. */
const T_TITLE = { ...composition('cardTitle'), fontFamily: 'var(--font-display)', fontWeight: 'var(--font-extrabold)', cssClassName: 'planner-display' };
const T_ERROR = { ...composition('fieldError'), color: 'var(--destructive)' };
/** The small uppercase label over a strip or a drawer section. */
const T_LABEL = {
  fontSize: px(11),
  fontWeight: 'var(--font-semibold)',
  color: 'var(--muted-foreground)',
  letterSpacing: { value: 0.06, unit: 'em' },
  textTransform: 'uppercase'
};
/** A number a person compares against another number. Tabular, always. */
const T_NUM = { ...composition('meta'), fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', color: 'var(--foreground)' };

const wide = (params: Record<string, unknown>) => ({ ...params, sizeMode: 'contentHeight', width: pct(100) });

const BUTTON_SHAPE = {
  sizeMode: 'contentSize',
  paddingLeft: 'var(--space-3)',
  paddingRight: 'var(--space-3)',
  paddingTop: 'var(--space-2)',
  paddingBottom: 'var(--space-2)',
  borderRadius: 'var(--radius-md)'
};
const BTN_PRIMARY = { ...composition('primaryButton'), ...BUTTON_SHAPE };
const BTN_OUTLINE = { ...composition('outlineButton'), ...BUTTON_SHAPE };
const BTN_GHOST = {
  ...BUTTON_SHAPE,
  backgroundColor: 'transparent',
  color: 'var(--muted-foreground)',
  borderStyle: 'solid',
  borderWidth: 'var(--border-1)',
  borderColor: 'var(--border)',
  fontSize: 'var(--text-sm)'
};

const FIELD = {
  ...composition('textField'),
  paddingTop: 'var(--space-2)',
  paddingBottom: 'var(--space-2)'
};

const HIDDEN_LABEL = 'font-size: 0;';

/**
 * 🔴 **Lucide is a module, and this template installs none.** The icon ports take a
 * `{ class: 'lucide', code }` and the viewer writes `<span class="lucide icon-chevron-left">`
 * — a span with no glyph in it unless the project has the lucide-icons module, which this one
 * deliberately does not (`copyPinned` refuses a template that ships modules). Every icon
 * button therefore rendered as an **8 × 8 empty box**: the week arrows, the settings, the
 * theme switch, a chip's plus and all three close buttons were invisible and unhittable, and
 * nothing in the graph said so. The approved mockup writes its arrows as the characters
 * `‹` and `›`, and that is what these are now: a character, at the size the icon was, in the
 * colour the icon was. No module, and it draws in any font on any machine.
 */
const GLYPH: Record<string, string> = {
  'icon-chevron-left': '‹',
  'icon-chevron-right': '›',
  'icon-settings': '⚙',
  'icon-moon': '☾',
  'icon-sun': '☼',
  'icon-plus': '+',
  'icon-x': '✕',
  'icon-check': '✓'
};

const glyph = (code: string): string => {
  const g = GLYPH[code];
  if (!g) throw new Error(`tpl010: no character stands in for ${code}; add one to GLYPH or use a word`);
  return g;
};

/**
 * A ghost button whose whole label is one character.
 *
 * 🔴 D72 — a Button has no accessible-name port, so the name a screen reader reads is the
 * label, and the label is the glyph. `name` is kept in the node's own label (what a person
 * sees in the editor) rather than thrown away.
 */
const BTN_ICON = (code: string, _name: string) => ({
  backgroundColor: 'transparent',
  color: 'var(--muted-foreground)',
  borderStyle: 'none',
  borderRadius: 'var(--radius-md)',
  paddingTop: 'var(--space-1)',
  paddingBottom: 'var(--space-1)',
  sizeMode: 'contentSize',
  label: glyph(code),
  fontSize: px(16),
  lineHeight: { value: 16, unit: 'px' },
  paddingLeft: 'var(--space-2)',
  paddingRight: 'var(--space-2)'
});

/**
 * The small square tick on a block. Its border and fill are WIRED to the block's envelope
 * colour, so one node draws a Billable block and a Hobby block (the mockup's `.blk .chk`).
 */
const BTN_CHECK = {
  // The tick is a character for the same reason the arrows are (see GLYPH): a logged block
  // showed an empty square, because the only thing marking it done was an icon that is not
  // installed. `color` is wired per block, so one node draws every envelope's tick.
  label: glyph('icon-check'),
  fontSize: px(11),
  lineHeight: { value: 11, unit: 'px' },
  backgroundColor: 'transparent',
  borderStyle: 'solid',
  borderWidth: 'var(--border-2)',
  borderColor: 'var(--border-control)',
  borderRadius: 'var(--radius-sm)',
  sizeMode: 'explicit',
  width: px(16),
  height: px(16),
  paddingLeft: 'var(--space-0)',
  paddingRight: 'var(--space-0)',
  paddingTop: 'var(--space-0)',
  paddingBottom: 'var(--space-0)'
};

const COLUMN = (gap: string) => ({ flexDirection: 'column', sizeMode: 'contentHeight', width: pct(100), rowGap: gap });
const ROW = (gap: string) => ({ flexDirection: 'row', alignItems: 'center', sizeMode: 'contentHeight', width: pct(100), columnGap: gap });
/**
 * A row exactly as wide as what is in it.
 *
 * 🔴 Not `{ ...ROW(gap), sizeMode: 'contentSize' }`: that leaves ROW's `width: 100%` on a
 * node whose sizeMode means it will never read it, and the door rejects the dead parameter
 * (`inert-dimension`) rather than letting a width sit in the file looking like it does
 * something. So the tight variants never set a width at all.
 */
const ROW_TIGHT = (gap: string) => ({ flexDirection: 'row', alignItems: 'center', sizeMode: 'contentSize', columnGap: gap });
const COLUMN_TIGHT = (gap: string) => ({ flexDirection: 'column', sizeMode: 'contentSize', rowGap: gap });

/**
 * 🔴 R15 — the 5,800px page. A row that scrolls sideways reports its FULL content width to
 * a parent grid unless it is pinned, and on 2026-09-20 that blew the mockup's page to
 * 5,800px wide. Both sideways strips (the moves chips, the cash events) carry this, and
 * `themeCss()` carries the `min-width: 0` half that a parameter cannot express.
 */
const SCROLL_X = { cssClassName: 'planner-scroll-x', sizeMode: 'contentHeight', width: pct(100), flexDirection: 'row', alignItems: 'stretch' };
/** A page-level track that must never be widened by what is inside it. */
const PINNED = { cssClassName: 'planner-pinned', width: pct(100) };
/** The same pinned track, named so the phone breakpoint can reach it (R5's second answer). */
const pinnedAs = (...classes: string[]) => ({ cssClassName: ['planner-pinned', ...classes].join(' '), width: pct(100) });

/**
 * 🔴 **A click inside a card is not a click on the scrim behind it.** Every visual node carries
 * a live Click, and a click bubbles to the ancestors whose Click is wired — so the scrim's
 * *close* heard every press inside the card that was not a button or a box: a sentence, the
 * gap between two fields, and (found driving R2.4) the words beside a checkbox, which closed
 * the block sheet with the time still unsaved. The comments said the card did not shut on a
 * click inside it; nothing made that true until this.
 */
const KEEPS_CLICKS = { clickBubbling: 'never' };

const CARD = {
  backgroundColor: 'var(--surface)',
  borderStyle: 'solid',
  borderWidth: 'var(--border-1)',
  borderColor: 'var(--border)',
  borderRadius: 'var(--radius-lg)'
};

// ── Shared scripts ──────────────────────────────────────────────────────────

/**
 * The arithmetic every screen part agrees on, pasted into the Functions that need it.
 *
 * `hoursOf` is the one rule that matters twice: a block that is done counts the hours it
 * ACTUALLY took (R stands on `actual` when it is set), and a block that is not done counts
 * what it was planned at. Get this wrong and a logged day and its envelope disagree.
 */
export const PLANNER_FNS = String.raw`function num(v, fallback) { var n = Number(v); return isFinite(n) ? n : fallback; }
function hoursOf(b) {
  if (!b) return 0;
  // 🔴 "It took as long as it was meant to" is an EMPTY actual, and the commands write that
  // emptiness as '' — which Number() reads as 0. Testing only for null and undefined, every
  // logged block counted as nought and the envelopes stayed empty however much work went in.
  if (b.done) {
    var a = b.actual;
    if (a === null || a === undefined || a === '') return num(b.planned, 0);
    return num(a, num(b.planned, 0));
  }
  return num(b.planned, 0);
}
/**
 * R22 — the time logged against a block, one entry per sitting: { day, hours, note }.
 * 🔴 Not "on", which the task file wrote: "on" is a Noodl Object's own method, and an entry
 * read back as an Object would answer entry.on with a function.
 */
function entriesOf(b) {
  var list = (b && b.entries) || [];
  var out = [];
  for (var i = 0; i < list.length; i++) if (list[i] && num(list[i].hours, 0) > 0) out.push(list[i]);
  return out;
}
function loggedOf(b) {
  var list = entriesOf(b), t = 0;
  for (var i = 0; i < list.length; i++) t += num(list[i].hours, 0);
  return t;
}
/**
 * What a block has SPENT, which is not what it counts for in its day. A done block spent what
 * hoursOf says; an open block has spent its entries so far — half an hour of a planned hour is
 * half an hour out of the envelope, while the day still holds the whole hour for it (R22).
 */
function spentOf(b) {
  if (!b) return 0;
  if (b.done) return hoursOf(b);
  return loggedOf(b);
}
/** Quarter of an hour is the unit a person plans in; nothing is ever shown finer. */
function q(n) { return Math.round(num(n, 0) * 4) / 4; }
function hText(n) { var v = q(n); return (Math.round(v * 100) / 100).toString(); }
/** R4 — an ask to a dormant client is Admin, so dormant projects spend the Admin envelope. */
function envelopeOf(p) {
  if (!p) return 'admin';
  var k = String(p.kind || '');
  if (k === 'earning') return 'billable';
  if (k === 'building') return 'building';
  if (k === 'hobby') return 'hobby';
  return 'admin';
}
function pad(n) { return (n < 10 ? '0' : '') + n; }
function dayKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function parseDay(s) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
  if (!m) return null;
  var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  d.setHours(0, 0, 0, 0);
  return d;
}
function addDays(d, n) { var x = new Date(d.getTime()); x.setDate(x.getDate() + n); x.setHours(0, 0, 0, 0); return x; }
function startOfToday() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
/** Monday of the week a day falls in. The week runs Mon–Sat (R5, Q4). */
function mondayOf(d) {
  var x = new Date(d.getTime());
  var dow = (x.getDay() + 6) % 7;
  return addDays(x, -dow);
}
var DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
var DOW_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function money(n, symbol) {
  var v = Math.round(num(n, 0));
  var sign = v < 0 ? '-' : '';
  var s = Math.abs(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return sign + (symbol || '€') + s;
}
/**
 * R7c — where a project's move stands. 'live' is the earliest move block on or after today that
 * is not done, wherever the week on screen is: that, and only that, is "placed". 'last' is the
 * latest move block of any kind, so a move whose block was done can say so (R2.3-4).
 */
function moveOf(projectId, moveBlocks, today) {
  var live = null, last = null;
  var list = moveBlocks || [];
  for (var i = 0; i < list.length; i++) {
    var b = list[i];
    if (!b || !b.isMove || b.projectId !== projectId || !parseDay(b.date)) continue;
    if (!last || String(b.date) > String(last.date)) last = b;
    if (b.done || parseDay(b.date).getTime() < today.getTime()) continue;
    if (!live || String(b.date) < String(live.date)) live = b;
  }
  return { live: live, last: last };
}
/** "Thu 24" — the day a move went to, short enough for a chip. */
function shortDay(s) { var d = parseDay(s); return d ? DOW[(d.getDay() + 6) % 7] + ' ' + d.getDate() : ''; }
`;

/** The five envelope keys, and their colour tokens, available to any Function that builds rows. */
export const ENVELOPE_FNS = String.raw`var ENV_KEYS = ${JSON.stringify([...ENVELOPE_KEYS])};
var ENV_NAMES = ${JSON.stringify(ENVELOPE_NAMES)};
function envMark(k) { return 'var(--env-' + k + ')'; }
function envInk(k) { return 'var(--env-' + k + '-ink)'; }
function envSoft(k) { return 'var(--env-' + k + '-soft)'; }
`;

// ════════════════════════════════════════════════════════════════════════════
// The leaves — one row, one tile, one chip, one bar
// ════════════════════════════════════════════════════════════════════════════

/**
 * R13 carries TPL-008's switch over unchanged: the moon switches to dark, the sun to light,
 * and **the App's stylesheet shows exactly one**, from the same conditions that pick the
 * palette. So no value on a wire says which theme is showing, and nothing falls out of step
 * when the system turns dark at sunset.
 */
const THEME_SWITCH: Tpl010Component = {
  path: 'Week/Theme switch',
  description:
    'The moon or the sun in the app bar. The page follows the system until the person presses it; choosing the system’s own theme again goes back to following the system.',
  nodes: [
    group('thRoot', 'Theme switch', undefined, { flexDirection: 'row', alignItems: 'center', sizeMode: 'contentSize' }),
    place('thToDark', BUTTON, 'Use dark theme', 'thRoot', { ...BTN_ICON('icon-moon', 'Use dark theme'), cssClassName: THEME_TO_DARK_CLASS }),
    place('thToLight', BUTTON, 'Use light theme', 'thRoot', { ...BTN_ICON('icon-sun', 'Use light theme'), cssClassName: THEME_TO_LIGHT_CLASS }),
    logic('thFlip', FUNCTION, 'Switch to the other theme', { functionScript: THEME_FLIP_SCRIPT })
  ],
  connections: [wire('thToDark', 'onClick', 'thFlip', 'run'), wire('thToLight', 'onClick', 'thFlip', 'run')]
};

/**
 * 🔴 **A bar is a ratio, not a width.** A percentage on the parent's MAIN axis becomes
 * flex-grow in this layout model, so a lone fill in a track grows to the whole track
 * whatever number it is given. Every bar here is therefore drawn the way the approved
 * mockup draws its day segments: the fill and a transparent remainder, both growing,
 * their two numbers adding to 100. Take the remainder away and the bar reads full always.
 */
const ENVELOPE_TILE_FIELDS: Array<[string, string]> = [
  ['name', 'string'],
  ['leftText', 'string'],
  ['usedText', 'string'],
  ['budgetText', 'string'],
  ['say', 'string'],
  // 🔴 A dimension arriving over a wire as a bare number is read as a PERCENTAGE and, on the
  // parent's main axis, becomes flex-grow — a ratio against its siblings, not a width. So
  // every wired dimension in this template travels as a {value, unit} object.
  ['fillWidth', '*'],
  ['restWidth', '*'],
  ['fillColor', 'string'],
  ['mark', 'string']
];

/**
 * One envelope, budgeted once a month like giving every hour a job (R4).
 *
 * The sentence under the bar is the whole point of the tile and it is built in
 * `Logic/Envelopes`, never here: **Billable says how many hours a day the rest of the month
 * needs, not how far behind you are** (R1). `fillColor` arrives already decided so that
 * going over Billable can be red while going over Hobby is simply the bar full — R4:
 * *"not budgeted, not counted, not a problem"*.
 */
const ENVELOPE_TILE: Tpl010Component = {
  path: 'Week/Envelope tile',
  description: 'One envelope: what it is called, how many hours are left in it, a bar of how much is spent, and the one line that says what to do with the rest.',
  ...iface(ENVELOPE_TILE_FIELDS, []),
  nodes: [
    inputs('etIn', 'The envelope', ENVELOPE_TILE_FIELDS),
    group('etRoot', 'Envelope tile', undefined, {
      ...CARD,
      ...COLUMN('var(--space-1)'),
      borderTopWidth: px(3),
      borderTopStyle: 'solid',
      paddingLeft: 'var(--space-3)',
      paddingRight: 'var(--space-3)',
      paddingTop: 'var(--space-2)',
      paddingBottom: 'var(--space-2)'
    }),
    group('etHead', 'Name and what is left', 'etRoot', {
      ...ROW('var(--space-2)'),
      justifyContent: 'space-between',
      cssClassName: 'planner-env-head'
    }),
    text('etName', 'Envelope name', 'etHead', '', { ...T_META, sizeMode: 'contentSize', fontSize: px(13), color: 'var(--foreground)', fontWeight: 'var(--font-bold)' }),
    text('etLeft', 'Hours left', 'etHead', '', { ...T_NUM, sizeMode: 'contentSize', fontSize: px(13), fontWeight: 'var(--font-semibold)' }),
    group('etTrack', 'The bar', 'etRoot', {
      sizeMode: 'explicit',
      width: pct(100),
      height: px(6),
      backgroundColor: 'var(--muted)',
      borderRadius: 'var(--radius-sm)',
      flexDirection: 'row',
      alignItems: 'stretch'
    }),
    group('etFill', 'How much is spent', 'etTrack', { sizeMode: 'explicit', height: pct(100), borderRadius: 'var(--radius-sm)' }),
    group('etRest', 'What is left in it', 'etTrack', { sizeMode: 'explicit', height: pct(100), backgroundColor: 'transparent' }),
    text('etSay', 'What to do with the rest', 'etRoot', '', wide(T_META))
  ],
  connections: [
    wire('etIn', 'name', 'etName', 'text'),
    wire('etIn', 'mark', 'etRoot', 'borderTopColor'),
    wire('etIn', 'leftText', 'etLeft', 'text'),
    wire('etIn', 'fillWidth', 'etFill', 'width'),
    wire('etIn', 'restWidth', 'etRest', 'width'),
    wire('etIn', 'fillColor', 'etFill', 'backgroundColor'),
    wire('etIn', 'say', 'etSay', 'text')
  ]
};

const MOVE_CHIP_FIELDS: Array<[string, string]> = [
  ['projectId', 'string'],
  ['projectName', 'string'],
  ['move', 'string'],
  ['worth', 'string'],
  ['hasWorth', 'boolean'],
  ['mark', 'string'],
  ['ink', 'string'],
  ['soft', 'string'],
  ['placed', 'boolean'],
  ['late', 'boolean'],
  ['edge', 'string'],
  ['hint', 'string'],
  ['tick', 'string'],
  ['dotFill', 'string'],
  ['chipClass', 'string']
];

/**
 * One move, as a chip on the single line under the envelopes (R7).
 *
 * R8 is why a dormant project gets one too: *"It helps remind you of older projects you might
 * want to follow up with."* Pressing it is a 30-minute block in the first day with room
 * (`Commands/Place move`); pressing it once it is placed opens the card instead of writing a
 * second block, which is AC3's second half.
 */
const MOVE_CHIP: Tpl010Component = {
  path: 'Week/Move chip',
  description: 'One project’s next move as a chip: a dot in its envelope colour, whose move it is, what it is worth, and whether it already has time in the week.',
  ...iface(MOVE_CHIP_FIELDS, [['press', 'signal'], ['projectId', 'string'], ['move', 'string'], ['placed', 'boolean']]),
  nodes: [
    inputs('mcIn', 'The move', MOVE_CHIP_FIELDS),
    // The chip carries what the press needs to act on, so the page never looks the
    // project up again and cannot look up a different one.
    outputs('mcOut', 'Pressed', [['press', 'signal'], ['projectId', 'string'], ['move', 'string'], ['placed', 'boolean']]),
    group('mcRoot', 'Move chip', undefined, {
      ...ROW_TIGHT('var(--space-1-5)'),
      cssClassName: 'planner-chip',
      backgroundColor: 'var(--surface)',
      borderStyle: 'solid',
      borderWidth: 'var(--border-1)',
      borderColor: 'var(--border-strong)',
      borderRadius: 'var(--radius-full)',
      paddingLeft: 'var(--space-2)',
      paddingRight: 'var(--space-1)',
      paddingTop: 'var(--space-0-5)',
      paddingBottom: 'var(--space-0-5)'
    }),
    // R7d — the marker is hollow until the move has a day, and filled once it has one.
    group('mcDot', 'Which envelope', 'mcRoot', {
      sizeMode: 'explicit',
      width: px(8),
      height: px(8),
      borderRadius: 'var(--radius-sm)',
      borderStyle: 'solid',
      borderWidth: px(1.5)
    }),
    text('mcWho', 'Whose move', 'mcRoot', '', { ...T_META, sizeMode: 'contentSize', fontWeight: 'var(--font-semibold)', color: 'var(--foreground)' }),
    text('mcWhat', 'The move', 'mcRoot', '', { ...T_META, sizeMode: 'contentSize', cssClassName: 'planner-chip-what' }),
    text('mcWorth', 'What it is worth', 'mcRoot', '', { ...T_META, sizeMode: 'contentSize', fontWeight: 'var(--font-semibold)' }),
    // Placed reads as done, not as disabled: the chip still opens the card (AC3). R7d: and it says which day.
    text('mcTick', 'Already in the week, and which day', 'mcRoot', '', {
      ...T_META,
      sizeMode: 'contentSize',
      fontWeight: 'var(--font-semibold)',
      cssClassName: 'planner-chip-tick'
    }),
    place('mcPress', BUTTON, 'Put it in the week', 'mcRoot', {
      ...BTN_ICON('icon-plus', 'Put 30 minutes in the week'),
      fontSize: px(13),
      lineHeight: { value: 13, unit: 'px' },
      paddingLeft: 'var(--space-1)',
      paddingRight: 'var(--space-1)',
      paddingTop: 'var(--space-0)',
      paddingBottom: 'var(--space-0)'
    })
  ],
  connections: [
    wire('mcIn', 'mark', 'mcDot', 'borderColor'),
    wire('mcIn', 'dotFill', 'mcDot', 'backgroundColor'),
    wire('mcIn', 'chipClass', 'mcRoot', 'cssClassName'),
    wire('mcIn', 'tick', 'mcTick', 'text'),
    wire('mcIn', 'projectName', 'mcWho', 'text'),
    wire('mcIn', 'move', 'mcWhat', 'text'),
    wire('mcIn', 'worth', 'mcWorth', 'text'),
    wire('mcIn', 'hasWorth', 'mcWorth', 'mounted'),
    wire('mcIn', 'placed', 'mcTick', 'mounted'),
    // R7's red: a move whose date has passed. Red is reserved for exactly this and the ceiling (R13).
    // 🔴 This was `late` (a boolean) wired into a colour port, so a late chip never went red.
    wire('mcIn', 'edge', 'mcRoot', 'borderColor'),
    // 🔴 The hint used to be wired into this button's label, where `font-size: 0` hid it.
    // The label is the `+` now, so wiring a sentence into it would print the sentence in
    // the middle of the chip. What the press does is said by the chip: a placed one shows ✓.
    wire('mcIn', 'projectId', 'mcOut', 'projectId'),
    wire('mcIn', 'move', 'mcOut', 'move'),
    wire('mcIn', 'placed', 'mcOut', 'placed'),
    wire('mcRoot', 'onClick', 'mcOut', 'press'),
    wire('mcPress', 'onClick', 'mcOut', 'press')
  ]
};

const BLOCK_FIELDS: Array<[string, string]> = [
  ['id', 'string'],
  ['projectId', 'string'],
  ['projectName', 'string'],
  ['what', 'string'],
  ['hoursText', 'string'],
  ['done', 'boolean'],
  ['tickFill', 'string'],
  ['tickInk', 'string'],
  ['mark', 'string'],
  ['soft', 'string'],
  ['isNew', 'boolean'],
  ['fromTodo', 'boolean']
];

/**
 * One block of time in one day.
 *
 * The tick opens the block sheet ready to log it (R16a). A logged block shows the hours it
 * ACTUALLY took when they differ from the plan (AC4), an open one with time on it shows
 * *0.5 of 1 h* (R22), and the hours arrive here already resolved — `Logic/Day columns` decides,
 * because the envelope totals and this line must never disagree.
 *
 * `fromTodo` draws the red edge of an overdue money-linked task pushed over from the todo
 * list (R11, TPL-010-L). Nothing in this template writes it; the field is here so the link
 * task has somewhere to land.
 */
const BLOCK: Tpl010Component = {
  path: 'Week/Block',
  description: 'One block of time in a day: a tick to log it, whose project it is, what it is, and how many hours.',
  ...iface(BLOCK_FIELDS, [
    ['toggle', 'signal'], ['openProject', 'signal'], ['openLog', 'signal'],
    ['id', 'string'], ['projectId', 'string'], ['done', 'boolean']
  ]),
  nodes: [
    inputs('bkIn', 'The block', BLOCK_FIELDS),
    outputs('bkOut', 'What you did to it', [
      ['toggle', 'signal'], ['openProject', 'signal'], ['openLog', 'signal'],
      ['id', 'string'], ['projectId', 'string'], ['done', 'boolean']
    ]),
    group('bkRoot', 'Block', undefined, {
      ...ROW('var(--space-1)'),
      alignItems: 'flex-start',
      borderRadius: 'var(--radius-md)',
      borderLeftStyle: 'solid',
      borderLeftWidth: px(3),
      paddingLeft: 'var(--space-1)',
      paddingRight: 'var(--space-1-5)',
      paddingTop: 'var(--space-1)',
      paddingBottom: 'var(--space-1)'
    }),
    place('bkTick', BUTTON, 'Log it', 'bkRoot', BTN_CHECK),
    group('bkMain', 'Whose, and what', 'bkRoot', { ...COLUMN('var(--space-0)'), width: pct(100) }),
    place('bkWho', BUTTON, 'Open the project', 'bkMain', {
      ...BTN_GHOST,
      // borderStyle 'none' would leave BTN_GHOST's width and colour unread, so they go too.
      borderStyle: 'none',
      borderWidth: undefined,
      borderColor: undefined,
      backgroundColor: 'transparent',
      sizeMode: 'contentSize',
      paddingLeft: 'var(--space-0)',
      paddingRight: 'var(--space-0)',
      paddingTop: 'var(--space-0)',
      paddingBottom: 'var(--space-0)',
      fontSize: px(13),
      fontWeight: 'var(--font-semibold)',
      color: 'var(--foreground)',
      styleCss: 'text-align: left; justify-content: flex-start;'
    }),
    place('bkWhat', BUTTON, 'What it is — opens the log sheet', 'bkMain', {
      ...BTN_GHOST,
      borderStyle: 'none',
      borderWidth: undefined,
      borderColor: undefined,
      backgroundColor: 'transparent',
      ...wide(T_META),
      sizeMode: 'contentHeight',
      styleCss: 'text-align: left; justify-content: flex-start;',
      paddingLeft: 'var(--space-0)',
      paddingRight: 'var(--space-0)',
      paddingTop: 'var(--space-0)',
      paddingBottom: 'var(--space-0)'
    }),
    place('bkHours', BUTTON, 'How long — opens the log sheet', 'bkRoot', {
      ...BTN_GHOST,
      borderStyle: 'none',
      borderWidth: undefined,
      borderColor: undefined,
      backgroundColor: 'transparent',
      ...T_NUM,
      sizeMode: 'contentSize',
      paddingLeft: 'var(--space-0)',
      paddingRight: 'var(--space-0)',
      paddingTop: 'var(--space-0)',
      paddingBottom: 'var(--space-0)'
    })
  ],
  connections: [
    wire('bkIn', 'soft', 'bkRoot', 'backgroundColor'),
    wire('bkIn', 'mark', 'bkRoot', 'borderLeftColor'),
    wire('bkIn', 'tickFill', 'bkTick', 'backgroundColor'),
    // Transparent until it is logged, so an empty box is an empty box and not a faint ✓.
    wire('bkIn', 'tickInk', 'bkTick', 'color'),
    wire('bkIn', 'projectName', 'bkWho', 'label'),
    // 🔴 A Button's words are its `label`, not its `text` — `text` is a Text node's port and
    // wiring into it here lands nothing and says nothing.
    wire('bkIn', 'what', 'bkWhat', 'label'),
    wire('bkIn', 'hoursText', 'bkHours', 'label'),
    wire('bkIn', 'id', 'bkOut', 'id'),
    wire('bkIn', 'projectId', 'bkOut', 'projectId'),
    wire('bkIn', 'done', 'bkOut', 'done'),
    wire('bkTick', 'onClick', 'bkOut', 'toggle'),
    wire('bkWho', 'onClick', 'bkOut', 'openProject'),
    // R16a — the tick opens the block sheet with Done ticked (the page routes it); the words and
    // the hours open the same sheet with Done off, for adding a sitting without closing the block.
    wire('bkWhat', 'onClick', 'bkOut', 'openLog'),
    wire('bkHours', 'onClick', 'bkOut', 'openLog')
  ]
};

const CASH_EVENT_FIELDS: Array<[string, string]> = [
  ['when', 'string'],
  ['amount', 'string'],
  ['amountColor', 'string'],
  ['label', 'string'],
  ['running', 'string'],
  ['low', 'boolean'],
  ['edge', 'string']
];

/**
 * One event on the cash strip (R10): when, how much, what it is, and the balance AFTER it.
 *
 * The balance-after is the column that matters, and an event that leaves the balance negative
 * is outlined — `edge` arrives as `var(--destructive)` or the ordinary border, decided in
 * `Logic/Cash line` where the running balance is computed.
 */
const CASH_EVENT: Tpl010Component = {
  path: 'Week/Cash event',
  description: 'One thing that happens to the money: when it lands, how much, what it is, and what the balance is afterwards.',
  ...iface(CASH_EVENT_FIELDS, []),
  nodes: [
    inputs('ceIn', 'The event', CASH_EVENT_FIELDS),
    group('ceRoot', 'Cash event', undefined, {
      ...COLUMN_TIGHT('var(--space-0)'),
      cssClassName: 'planner-cash-ev',
      minWidth: px(110),
      backgroundColor: 'var(--background)',
      borderStyle: 'solid',
      borderWidth: 'var(--border-1)',
      borderRadius: 'var(--radius-md)',
      paddingLeft: 'var(--space-2)',
      paddingRight: 'var(--space-2)',
      paddingTop: 'var(--space-1)',
      paddingBottom: 'var(--space-1)'
    }),
    text('ceWhen', 'When', 'ceRoot', '', wide(T_META)),
    text('ceAmount', 'How much', 'ceRoot', '', { ...wide(T_NUM), fontWeight: 'var(--font-semibold)' }),
    text('ceLabel', 'What it is', 'ceRoot', '', wide(T_META)),
    text('ceRunning', 'The balance after it', 'ceRoot', '', { ...wide(T_META), fontVariantNumeric: 'tabular-nums' })
  ],
  connections: [
    wire('ceIn', 'when', 'ceWhen', 'text'),
    wire('ceIn', 'amount', 'ceAmount', 'text'),
    wire('ceIn', 'amountColor', 'ceAmount', 'color'),
    wire('ceIn', 'label', 'ceLabel', 'text'),
    wire('ceIn', 'running', 'ceRunning', 'text'),
    wire('ceIn', 'edge', 'ceRoot', 'borderColor')
  ]
};

const PROJECT_ROW_FIELDS: Array<[string, string]> = [
  ['id', 'string'],
  ['name', 'string'],
  ['hoursText', 'string'],
  ['move', 'string'],
  ['hasMove', 'boolean'],
  ['moveColor', 'string'],
  ['mark', 'string'],
  ['barWidth', '*'],
  ['barRest', '*'],
  ['rowBackground', 'string']
];

/** One project in the card's left-hand list (R6, the Trello frame). */
const PROJECT_LIST_ROW: Tpl010Component = {
  path: 'Week/Project list row',
  description: 'One project in the card’s list: its name, its hours this week, its next move, and a bar of how much of the week it is taking.',
  ...iface(PROJECT_ROW_FIELDS, [['pick', 'signal'], ['id', 'string']]),
  nodes: [
    inputs('prIn', 'The project', PROJECT_ROW_FIELDS),
    outputs('prOut', 'Picked', [['pick', 'signal'], ['id', 'string']]),
    group('prRoot', 'Project row', undefined, {
      ...COLUMN('var(--space-0-5)'),
      borderRadius: 'var(--radius-md)',
      paddingLeft: 'var(--space-2)',
      paddingRight: 'var(--space-2)',
      paddingTop: 'var(--space-1)',
      paddingBottom: 'var(--space-1)'
    }),
    group('prTop', 'Name and hours', 'prRoot', { ...ROW('var(--space-2)'), justifyContent: 'space-between' }),
    text('prName', 'Project name', 'prTop', '', { ...T_META, sizeMode: 'contentSize', color: 'var(--foreground)', fontWeight: 'var(--font-semibold)' }),
    text('prHours', 'Hours this week', 'prTop', '', { ...T_NUM, sizeMode: 'contentSize' }),
    text('prMove', 'Its next move', 'prRoot', '', wide(T_META)),
    group('prTrack', 'How much of the week', 'prRoot', {
      sizeMode: 'explicit',
      width: pct(100),
      height: px(4),
      backgroundColor: 'var(--muted)',
      borderRadius: 'var(--radius-sm)',
      flexDirection: 'row',
      alignItems: 'stretch'
    }),
    group('prBar', 'Its share', 'prTrack', { sizeMode: 'explicit', height: pct(100), borderRadius: 'var(--radius-sm)' }),
    group('prBarRest', 'The rest of the week', 'prTrack', { sizeMode: 'explicit', height: pct(100), backgroundColor: 'transparent' })
  ],
  connections: [
    wire('prIn', 'name', 'prName', 'text'),
    wire('prIn', 'hoursText', 'prHours', 'text'),
    wire('prIn', 'move', 'prMove', 'text'),
    wire('prIn', 'hasMove', 'prMove', 'mounted'),
    wire('prIn', 'moveColor', 'prMove', 'color'),
    wire('prIn', 'mark', 'prBar', 'backgroundColor'),
    wire('prIn', 'barWidth', 'prBar', 'width'),
    wire('prIn', 'barRest', 'prBarRest', 'width'),
    wire('prIn', 'rowBackground', 'prRoot', 'backgroundColor'),
    wire('prIn', 'id', 'prOut', 'id'),
    wire('prRoot', 'onClick', 'prOut', 'pick')
  ]
};

const CARRY_ROW_FIELDS: Array<[string, string]> = [['id', 'string'], ['projectName', 'string'], ['what', 'string'], ['hoursText', 'string'], ['carryLabel', 'string']];

/**
 * One block that was planned for today and is not done, in the shutdown drawer (R12).
 *
 * Two buttons and no third: **carry** it to tomorrow or **drop** it. AC6 holds the difference —
 * carrying moves the block and tomorrow's total changes before the drawer is closed; dropping
 * deletes it and touches nothing else. `Block` is the only collection with `delete` allowed,
 * and this row is the only thing in the template that asks for it.
 */
const CARRY_ROW: Tpl010Component = {
  path: 'Week/Carry row',
  description: 'One block that did not get done today, with the two things you can do about it: carry it to tomorrow, or drop it.',
  ...iface(CARRY_ROW_FIELDS, [['carry', 'signal'], ['drop', 'signal'], ['id', 'string']]),
  nodes: [
    inputs('crIn', 'The block', CARRY_ROW_FIELDS),
    outputs('crOut', 'What you chose', [['carry', 'signal'], ['drop', 'signal'], ['id', 'string']]),
    group('crRoot', 'Carry row', undefined, { ...ROW('var(--space-2)'), justifyContent: 'space-between', paddingTop: 'var(--space-1)', paddingBottom: 'var(--space-1)' }),
    group('crMain', 'Which block', 'crRoot', { ...COLUMN('var(--space-0)'), width: pct(100) }),
    text('crWho', 'Whose', 'crMain', '', { ...wide(T_META), color: 'var(--foreground)', fontWeight: 'var(--font-semibold)' }),
    text('crWhat', 'What it was', 'crMain', '', wide(T_META)),
    place('crCarry', BUTTON, 'Carry it to tomorrow', 'crRoot', { ...BTN_OUTLINE, label: 'Carry' }),
    place('crDrop', BUTTON, 'Drop it', 'crRoot', { ...BTN_GHOST, label: 'Drop' })
  ],
  connections: [
    wire('crIn', 'projectName', 'crWho', 'text'),
    wire('crIn', 'what', 'crWhat', 'text'),
    wire('crIn', 'carryLabel', 'crCarry', 'label'),
    wire('crIn', 'id', 'crOut', 'id'),
    wire('crCarry', 'onClick', 'crOut', 'carry'),
    wire('crDrop', 'onClick', 'crOut', 'drop')
  ]
};

/**
 * One bar of a sparkline, and one box of the week row.
 *
 * 🔴 These two exist because the door refused the alternative. Six months and six days are
 * fixed-length, so six hand-written siblings looked reasonable — and
 * `repeated-sibling-subtree` rejected it: *"Make one component and instantiate it 6 times."*
 * It is right. Six copies of a subtree is six places to change a colour, and the version
 * where the bars are a repeater is shorter than the version where they are not.
 */
const SPARK_BAR_FIELDS: Array<[string, string]> = [['height', '*'], ['mark', 'string']];

const SPARK_BAR: Tpl010Component = {
  path: 'Week/Spark bar',
  description: 'One month’s bar in a project’s sparkline.',
  ...iface(SPARK_BAR_FIELDS, []),
  nodes: [
    inputs('sbIn', 'The month', SPARK_BAR_FIELDS),
    group('sbBar', 'The bar', undefined, {
      sizeMode: 'explicit',
      width: pct(100),
      borderRadius: 'var(--radius-sm)'
    })
  ],
  connections: [wire('sbIn', 'height', 'sbBar', 'height'), wire('sbIn', 'mark', 'sbBar', 'backgroundColor')]
};

const DAY_BOX_FIELDS: Array<[string, string]> = [['value', 'string'], ['label', 'string'], ['background', 'string']];

const DAY_BOX: Tpl010Component = {
  path: 'Week/Day box',
  description: 'One day in the project card’s week row: this project’s hours on that day.',
  ...iface(DAY_BOX_FIELDS, []),
  nodes: [
    inputs('dxIn', 'The day', DAY_BOX_FIELDS),
    group('dxRoot', 'Day box', undefined, {
      ...COLUMN('var(--space-0)'),
      alignItems: 'center',
      width: pct(16),
      borderRadius: 'var(--radius-sm)',
      borderStyle: 'solid',
      borderWidth: 'var(--border-1)',
      borderColor: 'var(--border-subtle)',
      paddingTop: 'var(--space-1)',
      paddingBottom: 'var(--space-1)'
    }),
    text('dxValue', 'Hours that day', 'dxRoot', '', { ...T_NUM, sizeMode: 'contentSize', fontWeight: 'var(--font-semibold)' }),
    text('dxLabel', 'Which day', 'dxRoot', '', { ...T_META, sizeMode: 'contentSize' })
  ],
  connections: [
    wire('dxIn', 'value', 'dxValue', 'text'),
    wire('dxIn', 'label', 'dxLabel', 'text'),
    wire('dxIn', 'background', 'dxRoot', 'backgroundColor')
  ]
};

const FACT_FIELDS: Array<[string, string]> = [['label', 'string'], ['value', 'string']];

const FACT_ROW: Tpl010Component = {
  path: 'Week/Fact row',
  description: 'One fact about a project: what it is, and what it is.',
  ...iface(FACT_FIELDS, []),
  nodes: [
    inputs('frIn', 'The fact', FACT_FIELDS),
    group('frRoot', 'Fact', undefined, { ...ROW('var(--space-2)'), justifyContent: 'space-between' }),
    text('frLabel', 'What it is', 'frRoot', '', { ...T_META, sizeMode: 'contentSize' }),
    text('frValue', 'What it says', 'frRoot', '', { ...T_META, sizeMode: 'contentSize', color: 'var(--foreground)', fontWeight: 'var(--font-semibold)' })
  ],
  connections: [wire('frIn', 'label', 'frLabel', 'text'), wire('frIn', 'value', 'frValue', 'text')]
};

/**
 * Six months of a project, as bars.
 *
 * The heights arrive as percentages already scaled against **the project's own maximum**, in
 * `Logic/Card rows`. A sparkline scaled against anything else compares two projects that are
 * not comparable: the point of these six bars is "is this going up or down for this client",
 * and a shared scale draws a flat line for a client whose fees doubled.
 */
const SPARKLINE: Tpl010Component = {
  path: 'Week/Sparkline',
  description: 'Six months of a project as six bars, the last one being this month.',
  ...iface([['bars', 'array'], ['firstLabel', 'string'], ['lastLabel', 'string']], []),
  repeats: { source: 'array', rowFields: SPARK_BAR_FIELDS.map(([n]) => n) },
  instantiates: [C.sparkBar],
  nodes: [
    inputs('skIn', 'The six months', [['bars', 'array'], ['firstLabel', 'string'], ['lastLabel', 'string']]),
    group('skRoot', 'Sparkline', undefined, COLUMN('var(--space-0-5)')),
    group('skBars', 'The bars', 'skRoot', {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      columnGap: 'var(--space-1)',
      sizeMode: 'explicit',
      width: pct(100),
      height: px(36)
    }),
    place('skEach', FOR_EACH, 'One bar per month', 'skBars', { template: C.sparkBar, templateType: 'explicit' }),
    group('skAxis', 'First and last month', 'skRoot', { ...ROW('var(--space-2)'), justifyContent: 'space-between' }),
    text('skFirst', 'Six months ago', 'skAxis', '', { ...T_META, sizeMode: 'contentSize' }),
    text('skLast', 'This month', 'skAxis', '', { ...T_META, sizeMode: 'contentSize' })
  ],
  connections: [
    wire('skIn', 'bars', 'skEach', 'items'),
    wire('skIn', 'firstLabel', 'skFirst', 'text'),
    wire('skIn', 'lastLabel', 'skLast', 'text')
  ]
};

/** The six small day totals in the project card. */
const DAY_BOXES: Tpl010Component = {
  path: 'Week/Day boxes',
  description: 'The six days of the week as six small boxes, each with this project’s hours on that day.',
  ...iface([['boxes', 'array']], []),
  repeats: { source: 'array', rowFields: DAY_BOX_FIELDS.map(([n]) => n) },
  instantiates: [C.dayBox],
  nodes: [
    inputs('dbIn', 'The six days', [['boxes', 'array']]),
    group('dbRoot', 'Day boxes', undefined, { ...ROW('var(--space-1)'), justifyContent: 'space-between' }),
    place('dbEach', FOR_EACH, 'One box per day', 'dbRoot', { template: C.dayBox, templateType: 'explicit' })
  ],
  connections: [wire('dbIn', 'boxes', 'dbEach', 'items')]
};

// ════════════════════════════════════════════════════════════════════════════
// The strips and columns that place them
// ════════════════════════════════════════════════════════════════════════════

/**
 * R7 — **one line** of chips, sorted by urgency, dormant projects included (R8).
 *
 * 🔴 R15 lives here. This is the row that blew the mockup's page to 5,800px: a sideways
 * scroller inside a page-level grid reports its whole content width to its parent unless the
 * track is pinned. `SCROLL_X` plus the stylesheet's `min-width: 0` is the fix, and AC8
 * measures it — `document.documentElement.scrollWidth` must equal the viewport width.
 */
const MOVES_STRIP: Tpl010Component = {
  path: 'Week/Moves strip',
  description: 'The one line of next moves under the envelopes, most urgent first, with the dormant projects on it too.',
  ...iface([['rows', 'array'], ['empty', 'boolean']], [['press', 'signal'], ['projectId', 'string'], ['move', 'string'], ['placed', 'boolean']]),
  repeats: { source: 'array', rowFields: MOVE_CHIP_FIELDS.map(([n]) => n) },
  instantiates: [C.moveChip],
  nodes: [
    inputs('msIn', 'The moves', [['rows', 'array'], ['empty', 'boolean']]),
    outputs('msOut', 'A chip was pressed', [['press', 'signal'], ['projectId', 'string'], ['move', 'string'], ['placed', 'boolean']]),
    group('msRoot', 'Moves strip', undefined, {
      ...ROW('var(--space-2)'),
      ...PINNED,
      ...CARD,
      alignItems: 'flex-start',
      paddingLeft: 'var(--space-2-5)',
      paddingRight: 'var(--space-2-5)',
      paddingTop: 'var(--space-1-5)',
      paddingBottom: 'var(--space-1-5)'
    }),

    text('msTitle', 'Moves', 'msLabel', 'Moves', { ...T_META, sizeMode: 'contentSize', color: 'var(--foreground)', fontWeight: 'var(--font-bold)' }),
    text('msBy', 'In what order', 'msLabel', 'by urgency', { ...T_LABEL, sizeMode: 'contentSize' }),
    // R7a — the chips wrap, as the approved mockup does; a wrapping row has no content width
    // to push the page with, so R15's pin is kept only as the class.
    group('msScroll', 'The chips', 'msRoot', { ...ROW('var(--space-1-5)'), ...PINNED, flexWrap: 'wrap', rowGap: 'var(--space-1-5)' }),
    // The label is the first thing IN the wrapping row, not a column beside it: it still sits
    // top-left as the mockup draws it, and every row after the first gets the strip's full
    // width — the 90px a side column took was exactly what kept two chips off one line.
    group('msLabel', 'What this row is', 'msScroll', { ...COLUMN_TIGHT('var(--space-0)'), paddingRight: 'var(--space-1)' }),
    place('msEach', FOR_EACH, 'One chip per move', 'msScroll', { template: C.moveChip, templateType: 'explicit' }),
    text('msEmpty', 'When there is nothing to chase', 'msScroll', 'No moves waiting. Every project has its next step in the week.', wide(T_META))
  ],
  connections: [
    wire('msIn', 'rows', 'msEach', 'items'),
    wire('msIn', 'empty', 'msEmpty', 'mounted'),
    wire('msEach', 'itemOutputSignal-press', 'msOut', 'press'),
    wire('msEach', 'itemOutput-projectId', 'msOut', 'projectId'),
    wire('msEach', 'itemOutput-move', 'msOut', 'move'),
    wire('msEach', 'itemOutput-placed', 'msOut', 'placed')
  ]
};

const DAY_HEADER_FIELDS: Array<[string, string]> = [
  ['day', 'string'],
  ['focusText', 'string'],
  ['focusColor', 'string'],
  ['caption', 'string'],
  ['captionColor', 'string'],
  ['doneWidth', '*'],
  ['plannedWidth', '*'],
  ['restWidth', '*'],
  ['doneColor', 'string'],
  ['plannedColor', 'string']
];

/**
 * The top of one day column: which day, how much focused work is in it against the ceiling,
 * a bar of what is logged against what is only planned, and one caption.
 *
 * R3 is the caption's job: a day over six focused hours says **"Over the focus ceiling.
 * Nothing else goes here."** — which is a plan (put it somewhere else), not a verdict. Red is
 * allowed here and in exactly one other place (R13).
 */
const DAY_HEADER: Tpl010Component = {
  path: 'Week/Day header',
  description: 'The head of one day: the date, the focused hours against the six-hour ceiling, a bar of logged against planned, and what kind of day it is.',
  ...iface(DAY_HEADER_FIELDS, []),
  nodes: [
    inputs('dhIn', 'The day', DAY_HEADER_FIELDS),
    group('dhRoot', 'Day header', undefined, {
      ...COLUMN('var(--space-1)'),
      paddingLeft: 'var(--space-2)',
      paddingRight: 'var(--space-2)',
      paddingTop: 'var(--space-2)',
      paddingBottom: 'var(--space-1)',
      borderBottomStyle: 'solid',
      borderBottomWidth: 'var(--border-1)',
      borderBottomColor: 'var(--border)'
    }),
    group('dhTop', 'Day and hours', 'dhRoot', { ...ROW('var(--space-1)'), justifyContent: 'space-between' }),
    text('dhDay', 'Which day', 'dhTop', '', { ...T_META, sizeMode: 'contentSize', fontSize: 'var(--text-sm)', color: 'var(--foreground)', fontWeight: 'var(--font-bold)' }),
    text('dhFocus', 'Focused hours', 'dhTop', '', { ...T_NUM, sizeMode: 'contentSize' }),
    group('dhTrack', 'Logged against planned', 'dhRoot', {
      sizeMode: 'explicit',
      width: pct(100),
      height: px(4),
      backgroundColor: 'var(--muted)',
      borderRadius: 'var(--radius-sm)',
      flexDirection: 'row',
      alignItems: 'stretch'
    }),
    group('dhDone', 'Logged', 'dhTrack', { sizeMode: 'explicit', height: pct(100), borderRadius: 'var(--radius-sm)' }),
    group('dhPlanned', 'Still planned', 'dhTrack', { sizeMode: 'explicit', height: pct(100), opacity: 0.45, borderRadius: 'var(--radius-sm)' }),
    group('dhRest', 'Room left in the day', 'dhTrack', { sizeMode: 'explicit', height: pct(100), backgroundColor: 'transparent' }),
    text('dhCaption', 'What kind of day', 'dhRoot', '', wide(T_META))
  ],
  connections: [
    wire('dhIn', 'day', 'dhDay', 'text'),
    wire('dhIn', 'focusText', 'dhFocus', 'text'),
    wire('dhIn', 'focusColor', 'dhFocus', 'color'),
    wire('dhIn', 'doneWidth', 'dhDone', 'width'),
    wire('dhIn', 'doneColor', 'dhDone', 'backgroundColor'),
    wire('dhIn', 'plannedWidth', 'dhPlanned', 'width'),
    wire('dhIn', 'restWidth', 'dhRest', 'width'),
    wire('dhIn', 'plannedColor', 'dhPlanned', 'backgroundColor'),
    wire('dhIn', 'caption', 'dhCaption', 'text'),
    wire('dhIn', 'captionColor', 'dhCaption', 'color')
  ]
};

const DAY_COLUMN_FIELDS: Array<[string, string]> = [
  ...DAY_HEADER_FIELDS,
  // The day as YYYY-MM-DD, which is what the + at the foot hands to the block sheet (R23).
  ['key', 'string'],
  ['blocks', 'array'],
  ['isToday', 'boolean'],
  ['columnBackground', 'string'],
  // 🔴 The whole phone answer is this one string. Six columns are always rendered; under the
  // breakpoint the stylesheet shows the one carrying `planner-day-picked` and hides the other five.
  // It has to carry `planner-pinned` too: `cssClassName` is ONE port, so a wire into it REPLACES
  // the parameter rather than adding to it, and R15's pin would go with it.
  ['columnClass', 'string']
];

/** One of the six columns. Saturday is drawn narrow and optional (Q4), which the page decides. */
const DAY_COLUMN: Tpl010Component = {
  path: 'Week/Day column',
  description: 'One day of the week: its head, then every block of time in it, top to bottom.',
  ...iface(DAY_COLUMN_FIELDS, [
    ['toggle', 'signal'], ['openProject', 'signal'], ['openLog', 'signal'],
    ['blockId', 'string'], ['projectId', 'string'], ['done', 'boolean'], ['addBlock', 'signal'], ['dayKey', 'string']
  ]),
  repeats: { source: 'array', rowFields: BLOCK_FIELDS.map(([n]) => n) },
  instantiates: [C.dayHeader, C.block],
  nodes: [
    inputs('dcIn', 'The day and its blocks', DAY_COLUMN_FIELDS),
    outputs('dcOut', 'What happened in the day', [
      ['toggle', 'signal'], ['openProject', 'signal'], ['openLog', 'signal'],
      ['blockId', 'string'], ['projectId', 'string'], ['done', 'boolean'], ['addBlock', 'signal'], ['dayKey', 'string']
    ]),
    group('dcRoot', 'Day column', undefined, {
      ...COLUMN('var(--space-0)'),
      ...pinnedAs('planner-day'),
      alignItems: 'stretch',
      borderRightStyle: 'solid',
      borderRightWidth: 'var(--border-1)',
      borderRightColor: 'var(--border)'
    }),
    place('dcHead', C.dayHeader, 'The head of this day', 'dcRoot'),
    group('dcBody', 'The blocks', 'dcRoot', {
      ...COLUMN('var(--space-1)'),
      paddingLeft: 'var(--space-1)',
      paddingRight: 'var(--space-1)',
      paddingTop: 'var(--space-1)',
      paddingBottom: 'var(--space-2)'
    }),
    place('dcEach', FOR_EACH, 'One block per thing planned', 'dcBody', { template: C.block, templateType: 'explicit' }),
    // R23 — a new block starts from the day it goes in. Quiet on purpose: six of these sit under
    // the week, and none of them is the thing the eye should land on.
    place('dcAdd', BUTTON, 'Put a block in this day', 'dcBody', {
      ...BTN_GHOST,
      borderStyle: 'dashed',
      width: pct(100),
      sizeMode: 'contentHeight',
      paddingTop: 'var(--space-1)',
      paddingBottom: 'var(--space-1)',
      fontSize: 'var(--text-xs)',
      label: '+ Add'
    })
  ],
  connections: [
    ...DAY_HEADER_FIELDS.map(([n]) => wire('dcIn', n, 'dcHead', n)),
    wire('dcIn', 'columnBackground', 'dcRoot', 'backgroundColor'),
    wire('dcIn', 'columnClass', 'dcRoot', 'cssClassName'),
    wire('dcIn', 'blocks', 'dcEach', 'items'),
    wire('dcEach', 'itemOutputSignal-toggle', 'dcOut', 'toggle'),
    wire('dcEach', 'itemOutputSignal-openProject', 'dcOut', 'openProject'),
    wire('dcEach', 'itemOutputSignal-openLog', 'dcOut', 'openLog'),
    wire('dcEach', 'itemOutput-id', 'dcOut', 'blockId'),
    wire('dcEach', 'itemOutput-projectId', 'dcOut', 'projectId'),
    wire('dcEach', 'itemOutput-done', 'dcOut', 'done'),
    wire('dcIn', 'key', 'dcOut', 'dayKey'),
    wire('dcAdd', 'onClick', 'dcOut', 'addBlock')
  ]
};

/**
 * R10 — the next six weeks of money, under the week.
 *
 * The header line carries the three numbers a freelancer checks first: the balance today,
 * what has been invoiced this month so far, and the rule that says when it actually arrives
 * (*"Due by the 7th"*, from `Settings.paymentTermsDays`). The events scroll sideways, so this
 * is the second `SCROLL_X` and the second half of R15.
 */
const CASH_STRIP: Tpl010Component = {
  path: 'Week/Cash strip',
  description: 'The next six weeks of money as a row of events, with the balance today and what has been invoiced this month above it.',
  ...iface([['rows', 'array'], ['balanceText', 'string'], ['invoicedText', 'string'], ['termsText', 'string']], []),
  repeats: { source: 'array', rowFields: CASH_EVENT_FIELDS.map(([n]) => n) },
  instantiates: [C.cashEvent],
  nodes: [
    inputs('csIn', 'The money', [['rows', 'array'], ['balanceText', 'string'], ['invoicedText', 'string'], ['termsText', 'string']]),
    group('csRoot', 'Cash strip', undefined, {
      ...COLUMN('var(--space-1-5)'),
      ...PINNED,
      ...CARD,
      paddingLeft: 'var(--space-3)',
      paddingRight: 'var(--space-3)',
      paddingTop: 'var(--space-2)',
      paddingBottom: 'var(--space-2)'
    }),
    group('csHead', 'The three numbers', 'csRoot', { ...ROW('var(--space-3)'), justifyContent: 'space-between', flexWrap: 'wrap' }),
    text('csTitle', 'What this row is', 'csHead', 'Cash, next six weeks', { ...T_LABEL, sizeMode: 'contentSize' }),
    group('csNums', 'Balance, invoiced, terms', 'csHead', ROW_TIGHT('var(--space-3)')),
    text('csBalance', 'Balance today', 'csNums', '', { ...T_NUM, sizeMode: 'contentSize' }),
    text('csInvoiced', 'Invoiced this month', 'csNums', '', { ...T_NUM, sizeMode: 'contentSize' }),
    text('csTerms', 'When it arrives', 'csNums', '', { ...T_META, sizeMode: 'contentSize' }),
    group('csScroll', 'The events', 'csRoot', { ...SCROLL_X, columnGap: 'var(--space-2)', alignItems: 'stretch' }),
    place('csEach', FOR_EACH, 'One box per event', 'csScroll', { template: C.cashEvent, templateType: 'explicit' })
  ],
  connections: [
    wire('csIn', 'balanceText', 'csBalance', 'text'),
    wire('csIn', 'invoicedText', 'csInvoiced', 'text'),
    wire('csIn', 'termsText', 'csTerms', 'text'),
    wire('csIn', 'rows', 'csEach', 'items')
  ]
};

/**
 * The library's Date Picker, built from the one source TPL-008 uses (`datePicker.ts`), so the
 * block sheet, the project editor and the money events all pick a day the same way — the
 * system picker on a phone, a keyboard-friendly calendar on a computer. R2.3 asked for it in
 * the move box; R2.4's three editors needed it first, so it arrived here.
 */
const DATE_PICKER: Tpl010Component = {
  path: 'Week/Date picker',
  description: DATE_PICKER_DESCRIPTION,
  inputs: DATE_PICKER_INPUTS.map(({ name, type, description }) => ({ name, type, description })),
  outputs: DATE_PICKER_OUTPUTS.map(({ name, type, description }) => ({ name, type, description })),
  ...datePickerGraph('wdp')
};

/**
 * 🔴 **Every box is cleared as its sheet closes.** A Text Input compares an arriving
 * `startValue` with the last one it was SENT, not with what is in the box — so a sheet that
 * opens with `''` on a box that was last sent `''` sends nothing, and the half hour typed and
 * abandoned last time is still there (driven, R2.4: the block sheet opened on the next block
 * with the previous block's note in it). `null` does not help: on a text box it means `''`.
 * `Clear` resets both the box and what it was last sent, so after a close an opening `''` is
 * already true and any other value arrives. Clearing on the CLOSE, not the open, is what keeps
 * it from racing the values the opening sends.
 *
 * A Checkbox has no start value to compare at all, so the same Function ticks or unticks it —
 * whenever the sheet is open and what it should show changes, not only on the edge of opening:
 * the sheet's `shown` and its `done` can arrive in two runs, and a Function that acted only on
 * the first saw an open sheet on a block that was not done yet (driven: the tick opened the
 * sheet with Done unticked).
 */
const SHEET_SCRIPT = (boxes: string[], shownInput = 'shown') =>
  `var shown = Inputs.${shownInput} === true;
if (this.wasShown && !shown) Outputs.closed();
${boxes
  .map(
    (b) => `var ${b}Want = shown ? Inputs.${b} === true : null;
if (${b}Want !== null && (!this.wasShown || this.${b}Last !== ${b}Want)) { if (${b}Want) Outputs.${b}On(); else Outputs.${b}Off(); }
this.${b}Last = ${b}Want;`
  )
  .join('\n')}
this.wasShown = shown;`;

const ENTRY_ROW_FIELDS: Array<[string, string]> = [['dayText', 'string'], ['hoursText', 'string'], ['note', 'string']];

/** R22 — one sitting on a block: the day, how long, and what was done. The line a client can be sent. */
const ENTRY_ROW: Tpl010Component = {
  path: 'Week/Entry row',
  description: 'One sitting logged against a block: which day, how long, and what was done.',
  ...iface(ENTRY_ROW_FIELDS, []),
  nodes: [
    inputs('erIn', 'The sitting', ENTRY_ROW_FIELDS),
    group('erRoot', 'One sitting', undefined, { ...ROW('var(--space-2)'), alignItems: 'flex-start' }),
    text('erDay', 'Which day', 'erRoot', '', { ...T_META, sizeMode: 'contentSize' }),
    text('erHours', 'How long', 'erRoot', '', { ...T_NUM, sizeMode: 'contentSize' }),
    text('erNote', 'What was done', 'erRoot', '', { ...wide(T_META), color: 'var(--foreground)' })
  ],
  connections: [
    wire('erIn', 'dayText', 'erDay', 'text'),
    wire('erIn', 'hoursText', 'erHours', 'text'),
    wire('erIn', 'note', 'erNote', 'text')
  ]
};

/** A labelled box, the one shape every field in the three editors takes. */
const BOX = (label: string, type: 'text' | 'number' | 'textArea' = 'text') => ({
  ...FIELD,
  type,
  useLabel: true,
  label,
  labelSpacing: 6,
  labelfontSize: 'var(--text-sm)',
  labelcolor: 'var(--foreground)'
});

/** A checkbox whose words are its own label, so the words are the click target (TPL-001's finding). */
const TICK_BOX = (label: string) => ({
  checked: false,
  width: px(18),
  height: px(18),
  // The product's default border is #000000, which is no border at all on the dark surface.
  borderColor: 'var(--border-control)',
  borderRadius: 'var(--radius-sm)',
  useLabel: true,
  label,
  labelSpacing: px(8),
  labelfontSize: 'var(--text-sm)',
  labelcolor: 'var(--foreground)'
});

/**
 * A Dropdown drawn as the boxes beside it are: full width, the field's border and ground, and its
 * words as its own label. Left to its defaults it is content-width with a #000000 border, which
 * is a black box on the light palette and no box at all on the dark one.
 */
const PICK = (label: string) => {
  const { type: _type, ...field } = FIELD as Record<string, unknown>;
  return {
    ...field,
    placeholder: 'Pick one',
    useLabel: true,
    label,
    labelSpacing: 6,
    labelfontSize: 'var(--text-sm)',
    labelcolor: 'var(--foreground)'
  };
};

/** The scrim and the card every sheet over the week sits in. */
const sheetFrame = (p: string, width: number, z: number) => [
  group(`${p}Scrim`, 'Behind the sheet', undefined, {
    sizeMode: 'explicit',
    width: pct(100),
    height: pct(100),
    position: 'fixed',
    backgroundColor: 'var(--scrim)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    styleCss: `z-index: ${z};`
  }),
  group(`${p}Card`, 'The sheet', `${p}Scrim`, {
    cssClassName: 'planner-over', ...KEEPS_CLICKS,
    ...CARD,
    ...COLUMN('var(--space-3)'),
    // As tall as what is in it, up to 88% of the window; past that it scrolls inside itself.
    width: pct(50),
    maxWidth: px(width),
    maxHeight: pct(88),
    styleCss: 'overflow: auto;',
    paddingLeft: 'var(--space-4)',
    paddingRight: 'var(--space-4)',
    paddingTop: 'var(--space-4)',
    paddingBottom: 'var(--space-4)'
  })
];

const BLOCK_SHEET_FIELDS: Array<[string, string]> = [
  ['shown', 'boolean'],
  ['title', 'string'],
  // The Dropdown's items are an `optionslist`; `*` so an array of { Label, Value } arrives there.
  ['projects', '*'],
  ['projectId', 'string'],
  ['what', 'string'],
  ['planned', 'string'],
  ['date', 'string'],
  ['timeShown', 'boolean'],
  ['loggedLine', 'string'],
  ['entries', 'array'],
  ['hours', 'string'],
  ['note', 'string'],
  ['done', 'boolean'],
  ['saveLabel', 'string']
];
const BLOCK_SHEET_OUTS: Array<[string, string]> = [
  ['projectId', 'string'], ['what', 'string'], ['planned', 'string'], ['date', 'string'],
  ['hours', 'string'], ['note', 'string'], ['done', 'boolean'], ['save', 'signal'], ['close', 'signal']
];

/**
 * **R23 — the block sheet: everything about one block, and the time that went into it.**
 *
 * It grew out of the log sheet (AC4), which held one number. Richard, after the first hour of
 * use: *"If I work 30 mins on a task that's supposed to take 1 hour, it's not necessarily done …
 * I can't send that kind of detail to a client as proof of what I did."* So:
 *
 * - **the block itself** — whose it is, what it is, the hours it is planned at and its day —
 *   is edited here, and a new block is born here from the **+** at the foot of a day;
 * - **the time** is a list of sittings (R22). *Add time* appends one; the block stays open
 *   unless *Done* is ticked, and *Done* is off by default — except when the tick opened the
 *   sheet (R16a), where it starts ticked with the hours still to go already filled in.
 *
 * The week does not grow (R5): all of this is over it, and none of it is in it.
 */
const BLOCK_SHEET: Tpl010Component = {
  path: 'Week/Block sheet',
  description: 'One block over the week: its project, what it is, its hours and its day; the time logged on it so far; and a line to add the time you just spent.',
  ...iface(BLOCK_SHEET_FIELDS, BLOCK_SHEET_OUTS),
  repeats: { source: 'array', rowFields: ENTRY_ROW_FIELDS.map(([n]) => n) },
  instantiates: [C.entryRow, C.datePicker],
  nodes: [
    inputs('bsIn', 'The block it is showing', BLOCK_SHEET_FIELDS),
    outputs('bsOut', 'What it should become', BLOCK_SHEET_OUTS),
    ...sheetFrame('bs', 480, 60),
    group('bsHead', 'Whose block, and close', 'bsCard', { ...ROW('var(--space-2)'), justifyContent: 'space-between' }),
    text('bsTitle', 'Whose block this is', 'bsHead', '', { ...T_TITLE, sizeMode: 'contentSize', as: 'h2' }),
    place('bsClose', BUTTON, 'Close the sheet', 'bsHead', BTN_ICON('icon-x', 'Close')),

    place('bsProject', 'net.noodl.controls.options', 'Which project', 'bsCard', { ...PICK('Project'), placeholder: 'Pick a project' }),
    place('bsWhat', TEXT_INPUT, 'What it is', 'bsCard', BOX('What it is')),
    group('bsWhen', 'Hours and day', 'bsCard', { ...ROW('var(--space-3)'), alignItems: 'flex-end' }),
    group('bsPlannedBox', 'Hours planned', 'bsWhen', { ...COLUMN('var(--space-0)'), width: pct(40) }),
    place('bsPlanned', TEXT_INPUT, 'Hours planned', 'bsPlannedBox', BOX('Hours planned', 'number')),
    group('bsDateBox', 'Which day', 'bsWhen', { ...COLUMN('var(--space-0)'), width: pct(60) }),
    place('bsDate', C.datePicker, 'Which day', 'bsDateBox', { Label: 'Day', 'Show Label': true }),

    group('bsTime', 'The time on it', 'bsCard', {
      ...COLUMN('var(--space-2)'),
      borderTopStyle: 'solid',
      borderTopWidth: 'var(--border-1)',
      borderTopColor: 'var(--border)',
      paddingTop: 'var(--space-3)'
    }),
    text('bsTimeLabel', 'Label', 'bsTime', 'Time logged', wide(T_LABEL)),
    text('bsLogged', 'How much so far', 'bsTime', '', wide(T_META)),
    place('bsEntries', FOR_EACH, 'One line per sitting', 'bsTime', { template: C.entryRow, templateType: 'explicit' }),
    group('bsAdd', 'Add time', 'bsTime', { ...ROW('var(--space-3)'), alignItems: 'flex-end' }),
    group('bsHoursBox', 'How long', 'bsAdd', { ...COLUMN('var(--space-0)'), width: pct(30) }),
    place('bsHours', TEXT_INPUT, 'Add time, in hours', 'bsHoursBox', BOX('Add time, h', 'number')),
    group('bsNoteBox', 'What you did', 'bsAdd', { ...COLUMN('var(--space-0)'), width: pct(70) }),
    place('bsNote', TEXT_INPUT, 'What you did', 'bsNoteBox', BOX('What you did')),
    place('bsDone', 'net.noodl.controls.checkbox', 'Done', 'bsTime', TICK_BOX('Done — nothing more to do on it')),
    derive('bsOpened', 'Clear the boxes on close; tick Done to match the block', SHEET_SCRIPT(['done'])),

    group('bsButtons', 'Buttons', 'bsCard', { ...ROW('var(--space-2)'), flexWrap: 'wrap' }),
    place('bsSave', BUTTON, 'Save', 'bsButtons', { ...BTN_PRIMARY, label: 'Save' })
  ],
  connections: [
    wire('bsIn', 'shown', 'bsScrim', 'mounted'),
    wire('bsIn', 'title', 'bsTitle', 'text'),
    wire('bsIn', 'projects', 'bsProject', 'items'),
    // Setting the Dropdown from the graph does not fire Changed, and does publish Value.
    wire('bsIn', 'projectId', 'bsProject', 'value'),
    wire('bsProject', 'value', 'bsOut', 'projectId'),
    // 🔴 `text` is a box's OUTPUT. Putting a value INTO it is `startValue`.
    wire('bsIn', 'what', 'bsWhat', 'startValue'),
    wire('bsWhat', 'onTextChanged', 'bsOut', 'what'),
    wire('bsIn', 'planned', 'bsPlanned', 'startValue'),
    wire('bsPlanned', 'onTextChanged', 'bsOut', 'planned'),
    wire('bsIn', 'date', 'bsDate', 'Value'),
    wire('bsDate', 'Value', 'bsOut', 'date'),
    // A new block has no time on it yet: the section is for a block that exists.
    wire('bsIn', 'timeShown', 'bsTime', 'mounted'),
    wire('bsIn', 'loggedLine', 'bsLogged', 'text'),
    wire('bsIn', 'entries', 'bsEntries', 'items'),
    wire('bsIn', 'hours', 'bsHours', 'startValue'),
    wire('bsHours', 'onTextChanged', 'bsOut', 'hours'),
    wire('bsIn', 'note', 'bsNote', 'startValue'),
    wire('bsNote', 'onTextChanged', 'bsOut', 'note'),
    wire('bsIn', 'shown', 'bsOpened', 'in-shown'),
    wire('bsIn', 'done', 'bsOpened', 'in-done'),
    wire('bsOpened', 'out-doneOn', 'bsDone', 'check'),
    wire('bsOpened', 'out-doneOff', 'bsDone', 'uncheck'),
    ...['bsWhat', 'bsPlanned', 'bsHours', 'bsNote'].map((id) => wire('bsOpened', 'out-closed', id, 'clear')),
    wire('bsDone', 'checked', 'bsOut', 'done'),
    wire('bsIn', 'saveLabel', 'bsSave', 'label'),
    wire('bsSave', 'onClick', 'bsOut', 'save'),
    wire('bsClose', 'onClick', 'bsOut', 'close'),
    wire('bsScrim', 'onClick', 'bsOut', 'close')
  ]
};

/** A port passed through a parent component under a prefix, so two children's `name` cannot collide. */
const under = (prefix: string, name: string) => prefix + name[0].toUpperCase() + name.slice(1);

/** What the project editor holds: every field of a Project a person types (R23). */
const PROJECT_EDIT_VALUES: Array<[string, string]> = [
  ['name', 'string'], ['sub', 'string'], ['kind', 'string'], ['rate', 'string'], ['slot', 'string'], ['rung', 'string'],
  ['move', 'string'], ['moveWorth', 'string'], ['moveWhen', 'string'], ['moveDue', 'string'], ['moveStop', 'boolean'], ['say', 'string']
];
const PROJECT_EDITOR_FIELDS: Array<[string, string]> = [['shown', 'boolean'], ['title', 'string'], ['kinds', '*'], ...PROJECT_EDIT_VALUES];
const PROJECT_EDITOR_OUTS: Array<[string, string]> = [...PROJECT_EDIT_VALUES, ['save', 'signal'], ['cancel', 'signal']];

/** The typed boxes: `[field, label, id, box type, parent]`. Placed one by one below, because child order is draw order. */
const PROJECT_BOXES: Array<[string, string, string, 'text' | 'number', string]> = [
  ['name', 'Name', 'peName', 'text', 'peRoot'],
  ['sub', 'One line about it', 'peSub', 'text', 'peRoot'],
  ['rate', 'Rate, per hour', 'peRate', 'number', 'peRateBox'],
  ['slot', 'Slot', 'peSlot', 'text', 'peSlotBox'],
  ['rung', 'Rung', 'peRung', 'text', 'peRungBox'],
  ['move', 'The move', 'peMove', 'text', 'peMoveBox'],
  ['moveWorth', 'What it is worth', 'peWorth', 'text', 'peWorthBox'],
  ['moveWhen', 'When, in words', 'peWhen', 'text', 'peWhenBox'],
  ['say', 'What to remember about it', 'peSay', 'text', 'peRoot']
];
const peBox = (field: string) => {
  const found = PROJECT_BOXES.find(([f]) => f === field);
  if (!found) throw new Error(`tpl010: no project box for ${field}`);
  const [, label, id, type, parent] = found;
  return place(id, TEXT_INPUT, label, parent, BOX(label, type));
};

/**
 * **R23 — the project editor, in the card's right-hand pane.**
 *
 * *"I don't see how you can add a new 'next move' to a project. For that matter, I don't even see
 * how to add a new project."* The commands to do both existed and nothing pressed them. This is
 * what presses them: *Edit* on a project's detail, or **+ New project** at the foot of the list,
 * and the pane the detail was in becomes this form.
 *
 * **A move is edited here and nowhere else.** A project whose move block is done gets its next
 * move by being given a new one here — which is why the move's fields sit in their own box, the
 * same box the detail draws the move in.
 *
 * The billing terms R23 lists belong to R2.2 and arrive with it: the fields they would edit
 * (`invoiceDay`, `termsDays`, `agreedHours`, `cycle`) do not exist until then.
 */
const PROJECT_EDITOR: Tpl010Component = {
  path: 'Week/Project editor',
  description: 'One project as a form: its name, what kind of work it is, its rate, and its next move — what it is, what it is worth and when.',
  ...iface(PROJECT_EDITOR_FIELDS, PROJECT_EDITOR_OUTS),
  instantiates: [C.datePicker],
  nodes: [
    inputs('peIn', 'The project as it is', PROJECT_EDITOR_FIELDS),
    outputs('peOut', 'The project as it should be', PROJECT_EDITOR_OUTS),
    group('peRoot', 'Project editor', undefined, {
      ...COLUMN('var(--space-3)'),
      paddingLeft: 'var(--space-4)',
      paddingRight: 'var(--space-4)',
      paddingTop: 'var(--space-3)',
      paddingBottom: 'var(--space-4)'
    }),
    group('peTop', 'Title and close', 'peRoot', { ...ROW('var(--space-2)'), justifyContent: 'space-between' }),
    text('peTitle', 'What this form is', 'peTop', '', { ...T_TITLE, sizeMode: 'contentSize', as: 'h2' }),
    place('peClose', BUTTON, 'Stop editing', 'peTop', BTN_ICON('icon-x', 'Stop editing')),
    peBox('name'),
    peBox('sub'),
    group('peKindRow', 'Kind and rate', 'peRoot', { ...ROW('var(--space-3)'), alignItems: 'flex-end' }),
    group('peKindBox', 'What kind of work', 'peKindRow', { ...COLUMN('var(--space-0)'), width: pct(60) }),
    place('peKind', 'net.noodl.controls.options', 'What kind of work', 'peKindBox', PICK('What kind of work')),
    group('peRateBox', 'Rate', 'peKindRow', { ...COLUMN('var(--space-0)'), width: pct(40) }),
    peBox('rate'),
    group('peSlotRow', 'Slot and rung', 'peRoot', { ...ROW('var(--space-3)'), alignItems: 'flex-end' }),
    group('peSlotBox', 'Slot', 'peSlotRow', { ...COLUMN('var(--space-0)'), width: pct(50) }),
    group('peRungBox', 'Rung', 'peSlotRow', { ...COLUMN('var(--space-0)'), width: pct(50) }),
    peBox('slot'),
    peBox('rung'),

    group('peMoveBox', 'Its next move', 'peRoot', {
      ...COLUMN('var(--space-2)'),
      backgroundColor: 'var(--muted)',
      borderRadius: 'var(--radius-md)',
      paddingLeft: 'var(--space-3)',
      paddingRight: 'var(--space-3)',
      paddingTop: 'var(--space-2)',
      paddingBottom: 'var(--space-3)'
    }),
    text('peMoveLabel', 'Label', 'peMoveBox', 'Next move', wide(T_LABEL)),
    peBox('move'),
    group('peMoveMeta', 'Worth and when', 'peMoveBox', { ...ROW('var(--space-3)'), alignItems: 'flex-end' }),
    group('peWorthBox', 'Worth', 'peMoveMeta', { ...COLUMN('var(--space-0)'), width: pct(50) }),
    group('peWhenBox', 'When', 'peMoveMeta', { ...COLUMN('var(--space-0)'), width: pct(50) }),
    peBox('moveWorth'),
    peBox('moveWhen'),
    place('peDue', C.datePicker, 'Due by', 'peMoveBox', { Label: 'Due by', 'Show Label': true }),
    place('peStop', 'net.noodl.controls.checkbox', 'Fixes only', 'peMoveBox', TICK_BOX('Fixes only — keep it off the moves strip')),
    derive('peOpened', 'Clear the boxes on close; tick Fixes only to match the project', SHEET_SCRIPT(['moveStop'])),
    peBox('say'),
    group('peButtons', 'Buttons', 'peRoot', { ...ROW('var(--space-2)'), flexWrap: 'wrap' }),
    place('peSave', BUTTON, 'Save the project', 'peButtons', { ...BTN_PRIMARY, label: 'Save' }),
    place('peCancel', BUTTON, 'Stop editing without saving', 'peButtons', { ...BTN_OUTLINE, label: 'Cancel' })
  ],
  connections: [
    wire('peIn', 'shown', 'peRoot', 'mounted'),
    wire('peIn', 'title', 'peTitle', 'text'),
    ...PROJECT_BOXES.flatMap(([field, , id]) => [wire('peIn', field, id, 'startValue'), wire(id, 'onTextChanged', 'peOut', field)]),
    wire('peIn', 'kinds', 'peKind', 'items'),
    wire('peIn', 'kind', 'peKind', 'value'),
    wire('peKind', 'value', 'peOut', 'kind'),
    wire('peIn', 'moveDue', 'peDue', 'Value'),
    wire('peDue', 'Value', 'peOut', 'moveDue'),
    wire('peIn', 'shown', 'peOpened', 'in-shown'),
    wire('peIn', 'moveStop', 'peOpened', 'in-moveStop'),
    wire('peOpened', 'out-moveStopOn', 'peStop', 'check'),
    wire('peOpened', 'out-moveStopOff', 'peStop', 'uncheck'),
    ...PROJECT_BOXES.map(([, , id]) => wire('peOpened', 'out-closed', id, 'clear')),
    wire('peStop', 'checked', 'peOut', 'moveStop'),
    wire('peSave', 'onClick', 'peOut', 'save'),
    wire('peCancel', 'onClick', 'peOut', 'cancel'),
    wire('peClose', 'onClick', 'peOut', 'cancel')
  ]
};

const CASH_ROW_FIELDS: Array<[string, string]> = [['id', 'string'], ['whenText', 'string'], ['label', 'string'], ['amountText', 'string'], ['repeatText', 'string']];

/** One typed money event in the settings: when, what, how much, and whether it repeats. Press it to edit it. */
const CASH_ROW: Tpl010Component = {
  path: 'Week/Cash row',
  description: 'One money event in the settings: when it happens, what it is, how much, and whether it happens every month.',
  ...iface(CASH_ROW_FIELDS, [['pick', 'signal'], ['id', 'string']]),
  nodes: [
    inputs('crIn', 'The event', CASH_ROW_FIELDS),
    outputs('crOut', 'Picked', [['pick', 'signal'], ['id', 'string']]),
    group('crRoot', 'One money event', undefined, {
      ...ROW('var(--space-2)'),
      borderBottomStyle: 'solid',
      borderBottomWidth: 'var(--border-1)',
      borderBottomColor: 'var(--border)',
      paddingTop: 'var(--space-1)',
      paddingBottom: 'var(--space-1)'
    }),
    text('crWhen', 'When', 'crRoot', '', { ...T_NUM, sizeMode: 'contentSize', fontSize: 'var(--text-xs)' }),
    group('crWords', 'What it is', 'crRoot', { ...COLUMN('var(--space-0)'), width: pct(100) }),
    text('crLabel', 'What it is', 'crWords', '', { ...wide(T_BODY), fontSize: 'var(--text-sm)' }),
    text('crRepeat', 'Whether it repeats', 'crWords', '', wide(T_META)),
    text('crAmount', 'How much', 'crRoot', '', { ...T_NUM, sizeMode: 'contentSize' }),
    // The row is not focusable; the button is the keyboard's way in (the chip's + argument, R2.1).
    place('crEdit', BUTTON, 'Edit this event', 'crRoot', { ...BTN_GHOST, label: 'Edit' })
  ],
  connections: [
    wire('crIn', 'whenText', 'crWhen', 'text'),
    wire('crIn', 'label', 'crLabel', 'text'),
    wire('crIn', 'repeatText', 'crRepeat', 'text'),
    wire('crIn', 'amountText', 'crAmount', 'text'),
    wire('crIn', 'id', 'crOut', 'id'),
    wire('crRoot', 'onClick', 'crOut', 'pick'),
    wire('crEdit', 'onClick', 'crOut', 'pick')
  ]
};

const CASH_EDIT_VALUES: Array<[string, string]> = [['date', 'string'], ['amount', 'string'], ['label', 'string'], ['kind', 'string'], ['monthly', 'boolean']];
const CASH_EDITOR_FIELDS: Array<[string, string]> = [['rows', 'array'], ['formShown', 'boolean'], ['formTitle', 'string'], ['kinds', '*'], ...CASH_EDIT_VALUES];
const CASH_EDITOR_OUTS: Array<[string, string]> = [
  ['pick', 'signal'], ['pickId', 'string'], ['add', 'signal'], ...CASH_EDIT_VALUES, ['save', 'signal'], ['cancel', 'signal']
];

/**
 * **R23 — the money events, in the settings sheet.** The partner's contract, the household
 * costs, the one-offs: what the cash strip runs its balance through. Until now they could only
 * be seeded. A list, a press to edit one, and *+ Add a money event* for a new one; the form is
 * only there while something is being edited, so the sheet stays a list you can read.
 */
const CASH_EDITOR: Tpl010Component = {
  path: 'Week/Cash editor',
  description: 'The money events the cash strip is worked out from, as a list you can add to and edit: when, how much, what it is, and whether it happens every month.',
  ...iface(CASH_EDITOR_FIELDS, CASH_EDITOR_OUTS),
  repeats: { source: 'array', rowFields: CASH_ROW_FIELDS.map(([n]) => n) },
  instantiates: [C.cashRow, C.datePicker],
  nodes: [
    inputs('ceIn', 'The money events', CASH_EDITOR_FIELDS),
    outputs('ceOut', 'What to change', CASH_EDITOR_OUTS),
    group('ceRoot', 'Money events', undefined, {
      ...COLUMN('var(--space-2)'),
      borderTopStyle: 'solid',
      borderTopWidth: 'var(--border-1)',
      borderTopColor: 'var(--border)',
      paddingTop: 'var(--space-3)'
    }),
    text('ceLabel', 'Label', 'ceRoot', 'Money coming and going', wide(T_LABEL)),
    text('ceHint', 'What belongs here', 'ceRoot', 'Everything the cash strip counts besides your hours: your partner’s contract, the household costs, one-offs.', wide(T_META)),
    place('ceEach', FOR_EACH, 'One row per event', 'ceRoot', { template: C.cashRow, templateType: 'explicit' }),
    place('ceAdd', BUTTON, 'Add a money event', 'ceRoot', { ...BTN_GHOST, borderStyle: 'dashed', label: '+ Add a money event' }),
    group('ceForm', 'The event being edited', 'ceRoot', {
      ...COLUMN('var(--space-2)'),
      backgroundColor: 'var(--muted)',
      borderRadius: 'var(--radius-md)',
      paddingLeft: 'var(--space-3)',
      paddingRight: 'var(--space-3)',
      paddingTop: 'var(--space-2)',
      paddingBottom: 'var(--space-3)'
    }),
    text('ceFormTitle', 'Which event', 'ceForm', '', { ...wide(T_BODY), fontWeight: 'var(--font-semibold)' }),
    place('ceWhat', TEXT_INPUT, 'What it is', 'ceForm', BOX('What it is')),
    group('ceRow', 'Amount and day', 'ceForm', { ...ROW('var(--space-3)'), alignItems: 'flex-end' }),
    group('ceAmountBox', 'How much', 'ceRow', { ...COLUMN('var(--space-0)'), width: pct(40) }),
    place('ceAmount', TEXT_INPUT, 'How much', 'ceAmountBox', BOX('How much', 'number')),
    group('ceDateBox', 'When', 'ceRow', { ...COLUMN('var(--space-0)'), width: pct(60) }),
    place('ceDate', C.datePicker, 'When', 'ceDateBox', { Label: 'When', 'Show Label': true }),
    place('ceKind', 'net.noodl.controls.options', 'In or out', 'ceForm', PICK('In or out')),
    place('ceMonthly', 'net.noodl.controls.checkbox', 'Every month', 'ceForm', TICK_BOX('Every month, on this day')),
    derive('ceOpened', 'Clear the boxes on close; tick Every month to match the event', SHEET_SCRIPT(['monthly'], 'formShown')),
    group('ceButtons', 'Buttons', 'ceForm', { ...ROW('var(--space-2)'), flexWrap: 'wrap' }),
    place('ceSave', BUTTON, 'Save the event', 'ceButtons', { ...BTN_PRIMARY, label: 'Save' }),
    place('ceCancel', BUTTON, 'Stop editing the event', 'ceButtons', { ...BTN_OUTLINE, label: 'Cancel' })
  ],
  connections: [
    wire('ceIn', 'rows', 'ceEach', 'items'),
    wire('ceEach', 'itemOutputSignal-pick', 'ceOut', 'pick'),
    wire('ceEach', 'itemOutput-id', 'ceOut', 'pickId'),
    wire('ceAdd', 'onClick', 'ceOut', 'add'),
    wire('ceIn', 'formShown', 'ceForm', 'mounted'),
    wire('ceIn', 'formTitle', 'ceFormTitle', 'text'),
    wire('ceIn', 'label', 'ceWhat', 'startValue'),
    wire('ceWhat', 'onTextChanged', 'ceOut', 'label'),
    wire('ceIn', 'amount', 'ceAmount', 'startValue'),
    wire('ceAmount', 'onTextChanged', 'ceOut', 'amount'),
    wire('ceIn', 'date', 'ceDate', 'Value'),
    wire('ceDate', 'Value', 'ceOut', 'date'),
    wire('ceIn', 'kinds', 'ceKind', 'items'),
    wire('ceIn', 'kind', 'ceKind', 'value'),
    wire('ceKind', 'value', 'ceOut', 'kind'),
    wire('ceIn', 'formShown', 'ceOpened', 'in-formShown'),
    wire('ceIn', 'monthly', 'ceOpened', 'in-monthly'),
    wire('ceOpened', 'out-monthlyOn', 'ceMonthly', 'check'),
    wire('ceOpened', 'out-monthlyOff', 'ceMonthly', 'uncheck'),
    ...['ceWhat', 'ceAmount'].map((id) => wire('ceOpened', 'out-closed', id, 'clear')),
    wire('ceMonthly', 'checked', 'ceOut', 'monthly'),
    wire('ceSave', 'onClick', 'ceOut', 'save'),
    wire('ceCancel', 'onClick', 'ceOut', 'cancel')
  ]
};

const DAY_PICK_FIELDS: Array<[string, string]> = [['key', 'string'], ['label', 'string'], ['ink', 'string'], ['chipFill', 'string'], ['edge', 'string']];

/**
 * One day on the phone's day picker.
 *
 * R5 said the week is the only main view and must fit a laptop without scrolling. At 390px it
 * cannot: six columns do not fit, and `bodyScroll: false` means what does not fit is CLIPPED, not
 * scrollable — 53 of 205 texts were on the page and unreachable. Richard's answer (2026-09-21):
 * **one day column and a day picker** under a breakpoint. The week is still the only view; the
 * phone just looks at one day of it at a time.
 */
const DAY_PICK: Tpl010Component = {
  path: 'Week/Day pick',
  description: 'One day on the phone’s day picker: press it and the week shows that day.',
  ...iface(DAY_PICK_FIELDS, [['pick', 'signal'], ['key', 'string']]),
  nodes: [
    inputs('dpIn', 'The day', DAY_PICK_FIELDS),
    outputs('dpOut', 'Which day was pressed', [['pick', 'signal'], ['key', 'string']]),
    place('dpBtn', BUTTON, 'Show this day', undefined, {
      ...BTN_GHOST,
      borderStyle: 'solid',
      borderWidth: 'var(--border-1)',
      borderRadius: 'var(--radius-full)',
      sizeMode: 'contentSize',
      fontSize: 'var(--text-sm)',
      paddingLeft: 'var(--space-2)',
      paddingRight: 'var(--space-2)',
      paddingTop: 'var(--space-1)',
      paddingBottom: 'var(--space-1)'
    })
  ],
  connections: [
    wire('dpIn', 'label', 'dpBtn', 'label'),
    wire('dpIn', 'ink', 'dpBtn', 'color'),
    wire('dpIn', 'chipFill', 'dpBtn', 'backgroundColor'),
    wire('dpIn', 'edge', 'dpBtn', 'borderColor'),
    wire('dpIn', 'key', 'dpOut', 'key'),
    wire('dpBtn', 'onClick', 'dpOut', 'pick')
  ]
};

/**
 * The six day chips. On a laptop the stylesheet hides this whole strip — there is nothing to
 * pick between when all six columns are on screen at once.
 */
const DAY_PICKER: Tpl010Component = {
  path: 'Week/Day picker',
  description: 'Mon to Sat as six chips, for the phone, where the week shows one day at a time.',
  ...iface([['rows', 'array']], [['pick', 'signal'], ['key', 'string']]),
  repeats: { source: 'array', rowFields: DAY_PICK_FIELDS.map(([n]) => n) },
  instantiates: [C.dayPick],
  nodes: [
    inputs('dkIn', 'The six days', [['rows', 'array']]),
    outputs('dkOut', 'Which day was pressed', [['pick', 'signal'], ['key', 'string']]),
    group('dkRoot', 'Day picker', undefined, {
      ...ROW('var(--space-1)'),
      ...pinnedAs('planner-daypicker'),
      alignItems: 'center',
      flexWrap: 'wrap'
    }),
    place('dkEach', FOR_EACH, 'One chip per day', 'dkRoot', { template: C.dayPick, templateType: 'explicit' })
  ],
  connections: [
    wire('dkIn', 'rows', 'dkEach', 'items'),
    wire('dkEach', 'itemOutput-key', 'dkOut', 'key'),
    wire('dkEach', 'itemOutputSignal-pick', 'dkOut', 'pick')
  ]
};

/**
 * The right-hand half of the projects card: one project, whole.
 *
 * R9 is the reason the move card can be missing its button. A building project that is
 * finished says **"fixes only"** (`moveStop`) and gets no move box (R7b), so a
 * done asset stops absorbing hours — the mockup's Builder tool, whose own line is *"Every
 * hour here now is an hour the coaching email does not get."*
 *
 * Four fact slots, not a repeater: `Project.facts` is a short fixed list a person types in
 * the editor (Q2), and no project in the approved mockup carries more than four.
 */
const PROJECT_DETAIL_FIELDS: Array<[string, string]> = [
  ['name', 'string'], ['sub', 'string'],
  ['move', 'string'], ['hasMove', 'boolean'], ['worth', 'string'], ['hasWorth', 'boolean'],
  ['when', 'string'], ['whenColor', 'string'], ['mark', 'string'], ['soft', 'string'],
  // R7b — the move box: a day and hours before it is placed; its day, Move it and Take it out after.
  ['canPlan', 'boolean'], ['placed', 'boolean'], ['unplaced', 'boolean'], ['placedLine', 'string'],
  ['planDate', 'string'], ['planHours', 'string'], ['minDate', 'string'], ['lastLine', 'string'], ['hasLast', 'boolean'],
  ['moveKey', 'string'],
  ['weekText', 'string'], ['sparkTitle', 'string'], ['say', 'string'],
  ['facts', 'array'], ['bars', 'array'], ['boxes', 'array'],
  ['firstLabel', 'string'], ['lastLabel', 'string']
];

const PROJECT_DETAIL_OUTS: Array<[string, string]> = [
  ['plan', 'signal'], ['moveIt', 'signal'], ['takeOut', 'signal'], ['edit', 'signal'], ['close', 'signal'],
  ['planDate', 'string'], ['planHours', 'string']
];

/**
 * **R7b — the move box takes a day and hours.** Richard: *"I'd rather a date picker input where I
 * can pick where I want that activity to go … then see afterwards on each 'next action' which date
 * the action has been set for."* Unplaced, the box is the move, a day (`firstOpenDay`) and hours
 * (0.5) and *Put it in the week*. Placed (R7c: a live move block on or after today) it says
 * *In the week: Thu 24 · 0.5 h*, keeps the day field for *Move it*, and offers *Take it out*.
 *
 * 🔴 **The hours box is reset with `Set`, not cleared.** It stays mounted while the card moves from
 * project to project and its prefill is 0.5 every time — a value it was already sent, so a Text
 * Input would keep the 2 typed on the last project (D78). `Set` writes the last Value back into
 * the box, so each time the project or its state changes the box says 0.5 again — after a Blur, because
 * Set leaves a focused box alone and a press on the list does not move focus. The day field
 * has no `Set`: between two unplaced projects it keeps a picked day, and the day it shows is the
 * day that is written.
 */
const PROJECT_DETAIL: Tpl010Component = {
  path: 'Week/Project detail',
  description: 'One project in full: its next move and what that move is worth, its hours this week, six months of history, its facts, and the one line about it.',
  ...iface(PROJECT_DETAIL_FIELDS, PROJECT_DETAIL_OUTS),
  repeats: { source: 'array', rowFields: FACT_FIELDS.map(([n]) => n) },
  instantiates: [C.sparkline, C.dayBoxes, C.factRow, C.datePicker],
  nodes: [
    inputs('pdIn', 'The project', PROJECT_DETAIL_FIELDS),
    outputs('pdOut', 'What you did', PROJECT_DETAIL_OUTS),
    group('pdRoot', 'Project detail', undefined, { ...COLUMN('var(--space-3)'), paddingLeft: 'var(--space-4)', paddingRight: 'var(--space-4)', paddingTop: 'var(--space-3)', paddingBottom: 'var(--space-4)' }),
    group('pdTop', 'Name and close', 'pdRoot', { ...ROW('var(--space-2)'), alignItems: 'flex-start', justifyContent: 'space-between' }),
    group('pdNames', 'What it is called', 'pdTop', { ...COLUMN('var(--space-0)'), width: pct(100) }),
    text('pdName', 'Project name', 'pdNames', '', { ...wide(T_TITLE), as: 'h2' }),
    text('pdSub', 'One line about it', 'pdNames', '', wide(T_META)),
    group('pdTopButtons', 'Edit and close', 'pdTop', ROW_TIGHT('var(--space-1)')),
    // R23 — the only way into the project editor for a project that exists.
    place('pdEdit', BUTTON, 'Edit this project', 'pdTopButtons', { ...BTN_GHOST, label: 'Edit' }),
    place('pdClose', BUTTON, 'Close the card', 'pdTopButtons', BTN_ICON('icon-x', 'Close')),

    group('pdMove', 'Its next move', 'pdRoot', {
      ...COLUMN('var(--space-1)'),
      borderRadius: 'var(--radius-md)',
      borderLeftStyle: 'solid',
      borderLeftWidth: px(3),
      paddingLeft: 'var(--space-3)',
      paddingRight: 'var(--space-3)',
      paddingTop: 'var(--space-2)',
      paddingBottom: 'var(--space-2)'
    }),
    text('pdMoveLabel', 'Label', 'pdMove', 'Next move', { ...T_LABEL, sizeMode: 'contentSize' }),
    text('pdMoveText', 'The move', 'pdMove', '', { ...wide(T_BODY) }),
    group('pdMoveMeta', 'Worth and when', 'pdMove', { ...ROW('var(--space-2)'), justifyContent: 'space-between' }),
    text('pdWorth', 'What it is worth', 'pdMoveMeta', '', { ...T_META, sizeMode: 'contentSize', fontWeight: 'var(--font-semibold)' }),
    text('pdWhen', 'When to do it', 'pdMoveMeta', '', { ...T_META, sizeMode: 'contentSize' }),
    text('pdPlaced', 'Where the move is in the week', 'pdMove', '', { ...wide(T_BODY), fontWeight: 'var(--font-semibold)' }),
    text('pdLast', 'What happened to the last one', 'pdMove', '', wide(T_META)),
    group('pdPlan', 'Its day and hours', 'pdMove', { ...ROW('var(--space-3)'), alignItems: 'flex-end', paddingTop: 'var(--space-1)' }),
    group('pdDateBox', 'Which day', 'pdPlan', { ...COLUMN('var(--space-0)'), width: pct(55) }),
    place('pdDate', C.datePicker, 'Which day', 'pdDateBox', { Label: 'Day', 'Show Label': true }),
    group('pdHoursBox', 'How long', 'pdPlan', { ...COLUMN('var(--space-0)'), width: pct(45) }),
    place('pdHours', TEXT_INPUT, 'How long, in hours', 'pdHoursBox', BOX('Hours', 'number')),
    derive(
      'pdReset',
      'Put the hours back when the project changes',
      "var key = String(Inputs.key || '');\nif (this.key !== undefined && this.key !== key) { Outputs.blur(); Outputs.reset(); }\nthis.key = key;"
    ),
    group('pdActs', 'What to do with it', 'pdMove', { ...ROW('var(--space-2)'), flexWrap: 'wrap' }),
    place('pdPut', BUTTON, 'Put it in the week', 'pdActs', { ...BTN_PRIMARY, label: 'Put it in the week' }),
    place('pdMoveIt', BUTTON, 'Move it to that day', 'pdActs', { ...BTN_OUTLINE, label: 'Move it' }),
    place('pdTakeOut', BUTTON, 'Take it out of the week', 'pdActs', { ...BTN_GHOST, label: 'Take it out' }),

    group('pdWeek', 'This week', 'pdRoot', COLUMN('var(--space-1)')),
    text('pdWeekLabel', 'How much this week', 'pdWeek', '', wide(T_LABEL)),
    place('pdBoxes', C.dayBoxes, 'The six days', 'pdWeek'),

    group('pdTwo', 'History and facts', 'pdRoot', { ...ROW('var(--space-4)'), alignItems: 'flex-start' }),
    group('pdHistory', 'Six months', 'pdTwo', { ...COLUMN('var(--space-1)'), width: pct(50) }),
    text('pdSparkTitle', 'What the bars are', 'pdHistory', '', wide(T_LABEL)),
    place('pdSpark', C.sparkline, 'The bars', 'pdHistory'),
    group('pdFacts', 'Facts', 'pdTwo', { ...COLUMN('var(--space-1)'), width: pct(50) }),
    text('pdFactsLabel', 'Label', 'pdFacts', 'Facts', wide(T_LABEL)),
    place('pdFactEach', FOR_EACH, 'One row per fact', 'pdFacts', { template: C.factRow, templateType: 'explicit' }),

    // Text draws type and nothing else — it has no padding, background or radius of its
    // own — so the tinted box the one line sits in is a Group around it.
    group('pdSayBox', 'The one line about it', 'pdRoot', {
      ...COLUMN('var(--space-0)'),
      backgroundColor: 'var(--muted)',
      borderRadius: 'var(--radius-md)',
      paddingLeft: 'var(--space-3)',
      paddingRight: 'var(--space-3)',
      paddingTop: 'var(--space-2)',
      paddingBottom: 'var(--space-2)'
    }),
    text('pdSay', 'What to remember about it', 'pdSayBox', '', wide(T_META))
  ],
  connections: [
    wire('pdIn', 'name', 'pdName', 'text'),
    wire('pdIn', 'sub', 'pdSub', 'text'),
    wire('pdIn', 'hasMove', 'pdMove', 'mounted'),
    wire('pdIn', 'mark', 'pdMove', 'borderLeftColor'),
    wire('pdIn', 'soft', 'pdMove', 'backgroundColor'),
    wire('pdIn', 'move', 'pdMoveText', 'text'),
    wire('pdIn', 'worth', 'pdWorth', 'text'),
    wire('pdIn', 'hasWorth', 'pdWorth', 'mounted'),
    wire('pdIn', 'when', 'pdWhen', 'text'),
    wire('pdIn', 'whenColor', 'pdWhen', 'color'),
    // R9 — a finished asset has no button to spend more hours on it.
    wire('pdIn', 'canPlan', 'pdPlan', 'mounted'),
    wire('pdIn', 'canPlan', 'pdActs', 'mounted'),
    wire('pdIn', 'placed', 'pdPlaced', 'mounted'),
    wire('pdIn', 'placedLine', 'pdPlaced', 'text'),
    wire('pdIn', 'hasLast', 'pdLast', 'mounted'),
    wire('pdIn', 'lastLine', 'pdLast', 'text'),
    wire('pdIn', 'planDate', 'pdDate', 'Value'),
    wire('pdIn', 'minDate', 'pdDate', 'Min'),
    wire('pdDate', 'Value', 'pdOut', 'planDate'),
    // Moving a placed move changes its day only (R2.3-2), so the hours are for placing.
    wire('pdIn', 'unplaced', 'pdHoursBox', 'mounted'),
    wire('pdIn', 'planHours', 'pdHours', 'startValue'),
    wire('pdHours', 'onTextChanged', 'pdOut', 'planHours'),
    wire('pdIn', 'moveKey', 'pdReset', 'in-key'),
    // 🔴 Blur first: Set will not write over a box that has focus, and pressing a project in the
    // list does not take focus off it (driven: the 2 typed on Bramble was still there on Northline).
    wire('pdReset', 'out-blur', 'pdHours', 'blur'),
    wire('pdReset', 'out-reset', 'pdHours', 'set'),
    wire('pdIn', 'unplaced', 'pdPut', 'mounted'),
    wire('pdIn', 'placed', 'pdMoveIt', 'mounted'),
    wire('pdIn', 'placed', 'pdTakeOut', 'mounted'),
    wire('pdIn', 'weekText', 'pdWeekLabel', 'text'),
    wire('pdIn', 'sparkTitle', 'pdSparkTitle', 'text'),
    wire('pdIn', 'say', 'pdSay', 'text'),
    wire('pdIn', 'facts', 'pdFactEach', 'items'),
    wire('pdIn', 'bars', 'pdSpark', 'bars'),
    wire('pdIn', 'firstLabel', 'pdSpark', 'firstLabel'),
    wire('pdIn', 'lastLabel', 'pdSpark', 'lastLabel'),
    wire('pdIn', 'boxes', 'pdBoxes', 'boxes'),
    wire('pdPut', 'onClick', 'pdOut', 'plan'),
    wire('pdMoveIt', 'onClick', 'pdOut', 'moveIt'),
    wire('pdTakeOut', 'onClick', 'pdOut', 'takeOut'),
    wire('pdEdit', 'onClick', 'pdOut', 'edit'),
    wire('pdClose', 'onClick', 'pdOut', 'close')
  ]
};

/** One group in the card's list: its name, its hours this week, and its projects. */
const PROJECT_GROUP_FIELDS: Array<[string, string]> = [['name', 'string'], ['hours', 'string'], ['color', 'string'], ['rows', 'array']];

const PROJECT_GROUP: Tpl010Component = {
  path: 'Week/Project group',
  description: 'One group of projects in the card: what the group is, how many hours it has this week, and a row per project.',
  ...iface(PROJECT_GROUP_FIELDS, [['pick', 'signal'], ['id', 'string']]),
  repeats: { source: 'array', rowFields: PROJECT_ROW_FIELDS.map(([n]) => n) },
  instantiates: [C.projectListRow],
  nodes: [
    inputs('pgIn', 'The group', PROJECT_GROUP_FIELDS),
    outputs('pgOut', 'Picked', [['pick', 'signal'], ['id', 'string']]),
    group('pgRoot', 'Project group', undefined, COLUMN('var(--space-1)')),
    group('pgHead', 'Group head', 'pgRoot', { ...ROW('var(--space-2)'), justifyContent: 'space-between' }),
    text('pgName', 'Group name', 'pgHead', '', { ...T_LABEL, sizeMode: 'contentSize' }),
    text('pgHours', 'Hours this week', 'pgHead', '', { ...T_NUM, sizeMode: 'contentSize' }),
    place('pgEach', FOR_EACH, 'One row per project', 'pgRoot', { template: C.projectListRow, templateType: 'explicit' })
  ],
  connections: [
    wire('pgIn', 'name', 'pgName', 'text'),
    wire('pgIn', 'color', 'pgName', 'color'),
    wire('pgIn', 'hours', 'pgHours', 'text'),
    wire('pgIn', 'rows', 'pgEach', 'items'),
    wire('pgEach', 'itemOutputSignal-pick', 'pgOut', 'pick'),
    wire('pgEach', 'itemOutput-id', 'pgOut', 'id')
  ]
};

/**
 * R6 — the projects, **behind a button, as a card over the week**, the Trello frame: a
 * grouped list on the left, one project on the right.
 *
 * Rejected on the way and recorded so nobody rebuilds them: a card grid (*"no mental frame
 * of reference"*), inline expanding rows in a timesheet (*"too long … below the fold gets
 * forgotten"*), and tabs.
 *
 * The four groups are a repeater over `Week/Project group`, not four hand-written sections.
 * They are fixed by R4 and R8, so four copies looked defensible until the door pointed out
 * that four copies is four places to change — and the groups are data anyway, right down to
 * their colour.
 */
/**
 * The editor's ports, passed through the card under `ed…` — the detail beside it has a `name`
 * and a `move` of its own, and a component cannot have two inputs called `name`.
 */
const CARD_EDITOR_INS: Array<[string, string]> = PROJECT_EDITOR_FIELDS.map(([n, t]) => [under('ed', n), t]);
const CARD_EDITOR_OUTS: Array<[string, string]> = PROJECT_EDITOR_OUTS.map(([n, t]) => [under('ed', n), t]);
const PROJECT_CARD_FIELDS: Array<[string, string]> = [
  ['groups', 'array'], ['shown', 'boolean'], ['detailShown', 'boolean'], ...PROJECT_DETAIL_FIELDS, ...CARD_EDITOR_INS
];
const PROJECT_CARD_OUTS: Array<[string, string]> = [
  ['pick', 'signal'], ['projectId', 'string'], ['plan', 'signal'], ['moveIt', 'signal'], ['takeOut', 'signal'],
  ['planDate', 'string'], ['planHours', 'string'], ['close', 'signal'], ['edit', 'signal'], ['newProject', 'signal'],
  ...CARD_EDITOR_OUTS
];

const PROJECT_CARD: Tpl010Component = {
  path: 'Week/Project card',
  description: 'The projects as a card over the week: every project grouped by what it is for on the left, and whichever one you picked on the right — or the form to change it, or to start a new one.',
  ...iface(PROJECT_CARD_FIELDS, PROJECT_CARD_OUTS),
  repeats: { source: 'array', rowFields: PROJECT_GROUP_FIELDS.map(([n]) => n) },
  instantiates: [C.projectGroup, C.projectDetail, C.projectEditor],
  nodes: [
    inputs('pcIn', 'The projects', PROJECT_CARD_FIELDS),
    outputs('pcOut', 'What you did in the card', PROJECT_CARD_OUTS),
    group('pcScrim', 'Behind the card', undefined, {
      sizeMode: 'explicit',
      width: pct(100),
      height: pct(100),
      position: 'fixed',
      backgroundColor: 'var(--scrim)',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      styleCss: 'z-index: 40;'
    }),
    group('pcCard', 'The card', 'pcScrim', {
      cssClassName: 'planner-over', ...KEEPS_CLICKS,
      ...CARD,
      flexDirection: 'row',
      alignItems: 'stretch',
      sizeMode: 'explicit',
      width: pct(88),
      maxWidth: px(1040),
      height: pct(84),
      styleCss: 'overflow: hidden;'
    }),
    group('pcList', 'Every project', 'pcCard', {
      cssClassName: 'planner-over-col',
      ...COLUMN('var(--space-3)'),
      width: pct(38),
      backgroundColor: 'var(--background)',
      borderRightStyle: 'solid',
      borderRightWidth: 'var(--border-1)',
      borderRightColor: 'var(--border)',
      paddingLeft: 'var(--space-2)',
      paddingRight: 'var(--space-2)',
      paddingTop: 'var(--space-3)',
      paddingBottom: 'var(--space-3)',
      styleCss: 'overflow: auto;'
    }),
    place('pcEach', FOR_EACH, 'One section per group', 'pcList', { template: C.projectGroup, templateType: 'explicit' }),
    // R23 — where a project is born. At the foot of the list, because that is where the next one goes.
    place('pcNew', BUTTON, 'Start a new project', 'pcList', {
      ...BTN_GHOST,
      borderStyle: 'dashed',
      width: pct(100),
      sizeMode: 'contentHeight',
      label: '+ New project'
    }),
    group('pcDetailWrap', 'The one you picked', 'pcCard', {
      ...COLUMN('var(--space-0)'),
      width: pct(62),
      cssClassName: 'planner-over-col',
      styleCss: 'overflow: auto;'
    }),
    // Two boxes, one showing: the project as it is, or the form that changes it.
    group('pcDetailBox', 'The project as it is', 'pcDetailWrap', COLUMN('var(--space-0)')),
    place('pcDetail', C.projectDetail, 'That project in full', 'pcDetailBox'),
    place('pcEditor', C.projectEditor, 'That project as a form', 'pcDetailWrap')
  ],
  connections: [
    wire('pcIn', 'shown', 'pcScrim', 'mounted'),
    wire('pcIn', 'groups', 'pcEach', 'items'),
    wire('pcEach', 'itemOutputSignal-pick', 'pcOut', 'pick'),
    wire('pcEach', 'itemOutput-id', 'pcOut', 'projectId'),
    wire('pcIn', 'detailShown', 'pcDetailBox', 'mounted'),
    ...PROJECT_DETAIL_FIELDS.map(([n]) => wire('pcIn', n, 'pcDetail', n)),
    ...(['plan', 'moveIt', 'takeOut', 'planDate', 'planHours'] as const).map((n) => wire('pcDetail', n, 'pcOut', n)),
    wire('pcDetail', 'edit', 'pcOut', 'edit'),
    wire('pcDetail', 'close', 'pcOut', 'close'),
    wire('pcNew', 'onClick', 'pcOut', 'newProject'),
    ...PROJECT_EDITOR_FIELDS.map(([n]) => wire('pcIn', under('ed', n), 'pcEditor', n)),
    ...PROJECT_EDITOR_OUTS.map(([n]) => wire('pcEditor', n, 'pcOut', under('ed', n))),
    // The scrim closes the card; the card itself does not (a click inside must not shut it).
    wire('pcScrim', 'onClick', 'pcOut', 'close')
  ]
};

const DRAWER_FIELDS: Array<[string, string]> = [
  ['title', 'string'],
  ['dayLine', 'string'],
  ['monthLine', 'string'],
  ['concern', 'string'],
  ['carryRows', 'array'],
  ['nothingToCarry', 'boolean'],
  ['tomorrowTitle', 'string'],
  ['tomorrowList', 'string'],
  ['tomorrowFocus', 'string'],
  ['tomorrowFocusColor', 'string'],
  ['shown', 'boolean']
];

/**
 * R12 — the evening. **In the template this is rules over data, not a model**: today's hours,
 * where the month stands, one concern, what to do with what is not done, and tomorrow as it
 * stands. The coach that talks back is a later task and needs a `Decision` collection this
 * template does not ship.
 *
 * **One concern, in one order** (AC5): an unsent building move first, because that is the rung
 * next month's money depends on; then a dormant project with no time in the week (R8); then
 * *"No concerns tonight."* The rule Richard set and this obeys: **a concern is raised once.**
 */
const SHUTDOWN_DRAWER: Tpl010Component = {
  path: 'Week/Shutdown drawer',
  description: 'The evening drawer: what today came to, where the month stands, the one thing worth saying, what to do with what is not done, and tomorrow as it stands.',
  ...iface(DRAWER_FIELDS, [['carry', 'signal'], ['drop', 'signal'], ['blockId', 'string'], ['close', 'signal']]),
  repeats: { source: 'array', rowFields: CARRY_ROW_FIELDS.map(([n]) => n) },
  instantiates: [C.carryRow],
  nodes: [
    inputs('sdIn', 'Tonight', DRAWER_FIELDS),
    outputs('sdOut', 'What you chose', [['carry', 'signal'], ['drop', 'signal'], ['blockId', 'string'], ['close', 'signal']]),
    group('sdScrim', 'Behind the drawer', undefined, {
      sizeMode: 'explicit',
      width: pct(100),
      height: pct(100),
      position: 'fixed',
      backgroundColor: 'var(--scrim)',
      flexDirection: 'row',
      alignItems: 'stretch',
      justifyContent: 'flex-end',
      styleCss: 'z-index: 50;'
    }),
    group('sdPanel', 'The drawer', 'sdScrim', {
      ...KEEPS_CLICKS,
      ...COLUMN('var(--space-3)'),
      backgroundColor: 'var(--surface)',
      sizeMode: 'explicit',
      width: pct(34),
      maxWidth: px(420),
      height: pct(100),
      styleCss: 'overflow: auto;',
      paddingLeft: 'var(--space-4)',
      paddingRight: 'var(--space-4)',
      paddingTop: 'var(--space-4)',
      paddingBottom: 'var(--space-4)'
    }),
    group('sdHead', 'Which evening', 'sdPanel', { ...ROW('var(--space-2)'), justifyContent: 'space-between' }),
    text('sdTitle', 'Shutdown', 'sdHead', '', { ...T_TITLE, sizeMode: 'contentSize', as: 'h2' }),
    place('sdClose', BUTTON, 'Close the drawer', 'sdHead', BTN_ICON('icon-x', 'Close')),

    group('sdCoach', 'What today came to', 'sdPanel', {
      ...COLUMN('var(--space-2)'),
      backgroundColor: 'var(--muted)',
      borderRadius: 'var(--radius-md)',
      paddingLeft: 'var(--space-3)',
      paddingRight: 'var(--space-3)',
      paddingTop: 'var(--space-3)',
      paddingBottom: 'var(--space-3)'
    }),
    text('sdDay', 'Today', 'sdCoach', '', wide(T_BODY)),
    text('sdMonth', 'The month', 'sdCoach', '', wide(T_META)),
    text('sdConcern', 'The one thing', 'sdCoach', '', { ...wide(T_BODY), fontWeight: 'var(--font-semibold)' }),

    group('sdCarrySection', 'Not done today', 'sdPanel', COLUMN('var(--space-1)')),
    text('sdCarryLabel', 'Label', 'sdCarrySection', 'Not done today', wide(T_LABEL)),
    place('sdEach', FOR_EACH, 'One row per block not done', 'sdCarrySection', { template: C.carryRow, templateType: 'explicit' }),
    text('sdAllDone', 'When everything is logged', 'sdCarrySection', 'Everything logged. Nice.', wide(T_META)),

    group('sdTomorrow', 'Tomorrow as it stands', 'sdPanel', COLUMN('var(--space-1)')),
    text('sdTomorrowLabel', 'Label', 'sdTomorrow', '', wide(T_LABEL)),
    text('sdTomorrowList', 'What is in it', 'sdTomorrow', '', wide(T_META)),
    group('sdFocusRow', 'Focus total', 'sdTomorrow', { ...ROW('var(--space-2)'), justifyContent: 'space-between' }),
    text('sdFocusLabel', 'Label', 'sdFocusRow', 'Focus total', { ...T_META, sizeMode: 'contentSize' }),
    text('sdFocus', 'How much', 'sdFocusRow', '', { ...T_NUM, sizeMode: 'contentSize', fontWeight: 'var(--font-semibold)' })
  ],
  connections: [
    wire('sdIn', 'shown', 'sdScrim', 'mounted'),
    wire('sdIn', 'title', 'sdTitle', 'text'),
    wire('sdIn', 'dayLine', 'sdDay', 'text'),
    wire('sdIn', 'monthLine', 'sdMonth', 'text'),
    wire('sdIn', 'concern', 'sdConcern', 'text'),
    wire('sdIn', 'carryRows', 'sdEach', 'items'),
    wire('sdIn', 'nothingToCarry', 'sdAllDone', 'mounted'),
    wire('sdIn', 'tomorrowTitle', 'sdTomorrowLabel', 'text'),
    wire('sdIn', 'tomorrowList', 'sdTomorrowList', 'text'),
    wire('sdIn', 'tomorrowFocus', 'sdFocus', 'text'),
    wire('sdIn', 'tomorrowFocusColor', 'sdFocus', 'color'),
    wire('sdEach', 'itemOutputSignal-carry', 'sdOut', 'carry'),
    wire('sdEach', 'itemOutputSignal-drop', 'sdOut', 'drop'),
    wire('sdEach', 'itemOutput-id', 'sdOut', 'blockId'),
    wire('sdClose', 'onClick', 'sdOut', 'close'),
    wire('sdScrim', 'onClick', 'sdOut', 'close')
  ]
};

/**
 * The only screen that holds money (§2: *"These are the only fields that hold real money in
 * the hosted app"*), and the reason the template ships with invented numbers and the hosted
 * app keeps the real ones.
 *
 * R2's arithmetic is stated on the sheet rather than hidden: the month's billable target is
 * `(what the household needs − what the partner brings) ÷ your rate`. Q3 rules that the month
 * plan is **not** written automatically on the 1st — *Plan this month* writes it, and the week
 * asks for it until it exists.
 */
const SETTINGS_FIELDS: Array<[string, string]> = [
  ['rate', 'string'], ['householdNeed', 'string'], ['partnerIncome', 'string'], ['focusHours', 'string'],
  ['partnerDay', 'string'], ['costsDay', 'string'], ['invoiceDay', 'string'], ['paymentTermsDays', 'string'],
  ['targetLine', 'string'], ['planLine', 'string'], ['shown', 'boolean'],
  // R23 — the money events, passed through to the editor under "cash…".
  ...CASH_EDITOR_FIELDS.map(([n, t]): [string, string] => [under('cash', n), t])
];
const SETTINGS_OUTS: Array<[string, string]> = [
  ['rate', 'string'], ['householdNeed', 'string'], ['partnerIncome', 'string'], ['focusHours', 'string'],
  ['partnerDay', 'string'], ['costsDay', 'string'], ['invoiceDay', 'string'], ['paymentTermsDays', 'string'],
  ['save', 'signal'], ['planMonth', 'signal'], ['close', 'signal'],
  ...CASH_EDITOR_OUTS.map(([n, t]): [string, string] => [under('cash', n), t])
];

const SETTINGS_NUMBERS: Array<[string, string, string]> = [
  ['rate', 'Your rate, per hour', 'stRate'],
  ['householdNeed', 'What the household needs a month', 'stNeed'],
  ['partnerIncome', 'What your partner brings a month', 'stPartner'],
  ['focusHours', 'Focused hours a day', 'stFocus'],
  ['partnerDay', 'Day their contract pays', 'stPartnerDay'],
  ['costsDay', 'Day the household costs go out', 'stCostsDay'],
  ['invoiceDay', 'Day you invoice', 'stInvoiceDay'],
  ['paymentTermsDays', 'Days you give them to pay', 'stTerms']
];

const SETTINGS_SHEET: Tpl010Component = {
  path: 'Week/Settings sheet',
  description: 'The numbers the whole week is worked out from: your rate, what the household needs, what your partner brings, your focus ceiling, the four days money moves, and the money events the cash strip counts.',
  ...iface(SETTINGS_FIELDS, SETTINGS_OUTS),
  instantiates: [C.cashEditor],
  nodes: [
    inputs('stIn', 'What they are now', SETTINGS_FIELDS),
    outputs('stOut', 'What they should be', SETTINGS_OUTS),
    group('stScrim', 'Behind the sheet', undefined, {
      sizeMode: 'explicit',
      width: pct(100),
      height: pct(100),
      position: 'fixed',
      backgroundColor: 'var(--scrim)',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      styleCss: 'z-index: 60;'
    }),
    group('stCard', 'The sheet', 'stScrim', {
      cssClassName: 'planner-over', ...KEEPS_CLICKS,
      ...CARD,
      ...COLUMN('var(--space-3)'),
      sizeMode: 'explicit',
      width: pct(50),
      maxWidth: px(520),
      maxHeight: pct(88),
      styleCss: 'overflow: auto;',
      paddingLeft: 'var(--space-4)',
      paddingRight: 'var(--space-4)',
      paddingTop: 'var(--space-4)',
      paddingBottom: 'var(--space-4)'
    }),
    group('stHead', 'Title and close', 'stCard', { ...ROW('var(--space-2)'), justifyContent: 'space-between' }),
    text('stTitle', 'Settings', 'stHead', 'Settings', { ...T_TITLE, sizeMode: 'contentSize', as: 'h2' }),
    place('stClose', BUTTON, 'Close the sheet', 'stHead', BTN_ICON('icon-x', 'Close')),
    text('stTarget', 'What these come to', 'stCard', '', wide(T_META)),
    ...SETTINGS_NUMBERS.flatMap(([name, label, id]) => [
      place(id, TEXT_INPUT, label, 'stCard', {
        ...FIELD,
        type: 'number',
        useLabel: true,
        label,
        labelSpacing: 6,
        labelfontSize: 'var(--text-sm)',
        labelcolor: 'var(--foreground)'
      })
    ]),
    text('stPlanLine', 'Whether this month is planned', 'stCard', '', wide(T_META)),
    group('stButtons', 'Buttons', 'stCard', { ...ROW('var(--space-2)'), flexWrap: 'wrap' }),
    place('stSave', BUTTON, 'Save', 'stButtons', { ...BTN_PRIMARY, label: 'Save' }),
    place('stPlan', BUTTON, 'Plan this month', 'stButtons', { ...BTN_OUTLINE, label: 'Plan this month' }),
    place('stCash', C.cashEditor, 'The money events', 'stCard')
  ],
  connections: [
    wire('stIn', 'shown', 'stScrim', 'mounted'),
    wire('stIn', 'targetLine', 'stTarget', 'text'),
    wire('stIn', 'planLine', 'stPlanLine', 'text'),
    // 🔴 `text` is the box's OUTPUT. Putting a value INTO it is `startValue`.
    ...SETTINGS_NUMBERS.flatMap(([name, , id]) => [wire('stIn', name, id, 'startValue'), wire(id, 'onTextChanged', 'stOut', name)]),
    wire('stSave', 'onClick', 'stOut', 'save'),
    wire('stPlan', 'onClick', 'stOut', 'planMonth'),
    ...CASH_EDITOR_FIELDS.map(([n]) => wire('stIn', under('cash', n), 'stCash', n)),
    ...CASH_EDITOR_OUTS.map(([n]) => wire('stCash', n, 'stOut', under('cash', n))),
    wire('stClose', 'onClick', 'stOut', 'close'),
    wire('stScrim', 'onClick', 'stOut', 'close')
  ]
};

// ════════════════════════════════════════════════════════════════════════════
// Logic — the only place a number or a sentence is decided
// ════════════════════════════════════════════════════════════════════════════

const PLANNER_DATA_INS: Array<[string, string]> = [['refresh', 'signal'], ['previousWeek', 'signal'], ['nextWeek', 'signal'], ['thisWeek', 'signal']];
const PLANNER_DATA_OUTS: Array<[string, string]> = [
  ['projects', 'array'], ['blocks', 'array'], ['monthPlans', 'array'], ['cashEvents', 'array'], ['settings', 'array'],
  ['moveBlocks', 'array'], ['weekStart', 'string'], ['weekLabel', 'string'], ['month', 'string'], ['loaded', 'signal']
];

/**
 * The only thing in the template that reads the backend.
 *
 * 🔴 **prd-001 and the window.** The backend now clamps a query with no limit to 1,000 rows
 * and says so in a header. Nothing here leans on that: every query carries its own limit,
 * and `Block` — the collection that grows forever — is asked for a **bounded window** that
 * covers both the week on screen and the month it belongs to. The month is needed because an
 * envelope is spent over a month (R4) while the columns draw a week, and the two must never
 * disagree; the window is at most about nine weeks, so a planner three years old asks for
 * the same handful of rows as a new one.
 *
 * 🔴 **The fetch waits for the window.** A saved filter whose value is `undefined` is
 * *dropped*, not failed — that is how an optional filter port returns everything — so firing
 * the Block query before the two dates exist would ask for every block ever written. The
 * `Condition` is what makes the window a precondition rather than a hope.
 *
 * Q1: the week starts as the current week, and `‹ ›` moves it by seven days.
 */
const PLANNER_DATA: Tpl010Component = {
  path: 'Logic/Planner data',
  description: 'The six queries the week is drawn from: your projects, the blocks in the weeks on screen, the move blocks from four weeks back, this month’s plan, the money coming and going, and your settings.',
  ...iface(PLANNER_DATA_INS, PLANNER_DATA_OUTS),
  nodes: [
    inputs('pnIn', 'When to load', PLANNER_DATA_INS),
    outputs('pnOut', 'The records', PLANNER_DATA_OUTS),
    { ...(logic('pnWeek', VARIABLE, 'The Monday on screen', { name: VAR.weekStart }) as object) },
    logic('pnStart', SET_VARIABLE, 'Start on this week', { name: VAR.weekStart, setWith: 'string' }),
    derive(
      'pnThisWeek',
      'Which Monday is today in',
      `${PLANNER_FNS}Outputs.monday = dayKey(mondayOf(startOfToday()));`
    ),
    /**
     * Q1 — `‹ ›` move the week, and this is the third shape it took.
     *
     * 🔴 **A Function publishes an output only when the value CHANGES.** The arrows were two
     * Functions saying `Outputs.step = -1` and `Outputs.step = 1`: the first press of either
     * published, and every press after it published nothing, because -1 was still -1. Driven
     * in a browser, `›` moved the week once and then died. So the arrows now step a
     * **Counter**, whose count is different after every single press, and one Function turns
     * that count into a Monday — counted from today rather than from the week on screen, so
     * there is no path from the variable back into the thing that sets it.
     */
    logic('pnCount', 'Counter', 'How many weeks from this one', { startValue: 0 }),
    derive(
      'pnStep',
      'The Monday that many weeks away',
      `${PLANNER_FNS}Outputs.monday = dayKey(addDays(mondayOf(startOfToday()), num(Inputs.offset, 0) * 7));
// 🔴 The pulse is held back on the first run, which happens when the node mounts and
// nobody has pressed anything: it would set the week — and so start a fetch — for a
// visitor who has not signed in yet. A node's own scope survives its runs.
if (this.moved) Outputs.moved();
this.moved = true;`
    ),
    /**
     * The window, and the six dates the columns draw. One Function so that the query bounds
     * and the day keys can never be computed from two different Mondays.
     */
    derive(
      'pnWindow',
      'The window to ask the backend for',
      `${PLANNER_FNS}var monday = parseDay(Inputs.weekStart) || mondayOf(startOfToday());
var saturday = addDays(monday, 5);
var monthStart = new Date(monday.getFullYear(), monday.getMonth(), 1);
var monthEnd = new Date(saturday.getFullYear(), saturday.getMonth() + 1, 0);
// Whichever is wider: the week, or the month(s) the week touches.
var from = monday.getTime() < monthStart.getTime() ? monday : monthStart;
var to = saturday.getTime() > monthEnd.getTime() ? saturday : monthEnd;
Outputs.from = dayKey(from);
Outputs.to = dayKey(to);
Outputs.month = monday.getFullYear() + '-' + pad(monday.getMonth() + 1);
Outputs.weekStart = dayKey(monday);
var sameMonth = monday.getMonth() === saturday.getMonth();
Outputs.weekLabel = monday.getDate() + (sameMonth ? '' : ' ' + MON[monday.getMonth()]) + ' – ' + saturday.getDate() + ' ' + MON[saturday.getMonth()];
// 🔴 Ready means "somebody asked for this week", not "this script ran". The fallback above
// keeps the labels sensible before anyone has, and this keeps the FETCH from following it:
// a Function runs once when it mounts, and at that moment nobody is signed in yet.
Outputs.ready = !!parseDay(Inputs.weekStart);
// R7c — the move blocks are asked for from four weeks back, whatever week is on screen.
Outputs.moveSince = dayKey(addDays(startOfToday(), -28));
// Last line on purpose: the values above are delivered before the pulse that acts on them,
// so the query parameters a fetch uses are never a week behind the week on screen.
Outputs.fetch();`
    ),
    logic('pnReady', CONDITION, 'Is the window worked out?', signalOnly('condition')),
    logic('pnProjects', QUERY, 'Your projects', {
      collectionName: 'Project',
      ...QUERY_OFF,
      storageLimit: 500,
      visualSort: [{ property: 'position', order: 'ascending' }]
    }),
    logic('pnBlocks', QUERY, 'The blocks in the weeks on screen', {
      collectionName: 'Block',
      ...QUERY_OFF,
      // 🔴 Each filter parameter carries its OWN Run On Value Change box, ticked by default,
      // and the two in QUERY_OFF do not cover them. Left on, a date arriving at boot fetches
      // for a signed-out visitor and logs a 403.
      'runOnChange-qp-from': false,
      'runOnChange-qp-to': false,
      storageLimit: 1000,
      visualFilter: {
        combinator: 'and',
        rules: [
          { property: 'date', operator: 'greater than or equal to', input: 'from' },
          { property: 'date', operator: 'less than or equal to', input: 'to' }
        ]
      },
      visualSort: [{ property: 'position', order: 'ascending' }]
    }),
    /**
     * R7c — **placed means a live move block on or after today**, not "in the week on screen".
     * A move put in next week sits outside the window above whenever next week is next month, and
     * a chip reading *unplaced* there is a chip that writes a second block. So the move blocks
     * have a window of their own: from four weeks back — far enough to say *done* beside the last
     * one (R2.3-4) — to whatever is planned ahead. It filters on the date only; which blocks are
     * moves is read in the scripts, so the demo and the backend compare nothing but a date string.
     */
    logic('pnMoveBlocks', QUERY, 'The move blocks, from four weeks back', {
      collectionName: 'Block',
      ...QUERY_OFF,
      'runOnChange-qp-moveSince': false,
      storageLimit: 1000,
      visualFilter: { combinator: 'and', rules: [{ property: 'date', operator: 'greater than or equal to', input: 'moveSince' }] },
      visualSort: [{ property: 'date', order: 'ascending' }]
    }),
    logic('pnMonth', QUERY, 'This month’s plan', {
      collectionName: 'MonthPlan',
      ...QUERY_OFF,
      'runOnChange-qp-month': false,
      storageLimit: 24,
      visualFilter: { combinator: 'and', rules: [{ property: 'month', operator: 'equal to', input: 'month' }] }
    }),
    logic('pnCash', QUERY, 'The money coming and going', {
      collectionName: 'CashEvent',
      ...QUERY_OFF,
      storageLimit: 500,
      visualSort: [{ property: 'date', order: 'ascending' }]
    }),
    logic('pnSettings', QUERY, 'Your settings', { collectionName: 'Settings', ...QUERY_OFF, storageLimit: 1 }),
    logic('pnLoadProblem', SET_VARIABLE, 'Say the week did not load', { name: VAR.problem, setWith: 'string', value: LOAD_PROBLEM_TEXT })
  ],
  connections: [
    // Where the week starts, and the two arrows (Q1).
    wire('pnThisWeek', 'out-monday', 'pnStart', 'value'),
    wire('pnIn', 'thisWeek', 'pnStart', 'do'),
    wire('pnIn', 'previousWeek', 'pnCount', 'decrease'),
    wire('pnIn', 'nextWeek', 'pnCount', 'increase'),
    wire('pnIn', 'thisWeek', 'pnCount', 'reset'),
    wire('pnCount', 'currentCount', 'pnStep', 'in-offset'),
    wire('pnStep', 'out-monday', 'pnStart', 'value'),
    // The value is set inside the run that pulses this, so the Monday is never a week behind.
    wire('pnStep', 'out-moved', 'pnStart', 'do'),

    wire('pnWeek', 'value', 'pnWindow', 'in-weekStart'),
    wire('pnWindow', 'out-weekStart', 'pnOut', 'weekStart'),
    wire('pnWindow', 'out-weekLabel', 'pnOut', 'weekLabel'),
    wire('pnWindow', 'out-month', 'pnOut', 'month'),

    // The window is a precondition of the fetch, not a hope.
    wire('pnWindow', 'out-ready', 'pnReady', 'condition'),
    wire('pnIn', 'refresh', 'pnReady', 'eval'),
    // Q1 — `‹ ›` rewrites the window, and the window is what asks for the rows. Without this
    // the arrows moved the labels and left last week's blocks on the screen.
    wire('pnWindow', 'out-fetch', 'pnReady', 'eval'),
    wire('pnWindow', 'out-from', 'pnBlocks', 'qp-from'),
    wire('pnWindow', 'out-to', 'pnBlocks', 'qp-to'),
    wire('pnWindow', 'out-month', 'pnMonth', 'qp-month'),
    wire('pnWindow', 'out-moveSince', 'pnMoveBlocks', 'qp-moveSince'),
    ...['pnProjects', 'pnBlocks', 'pnMoveBlocks', 'pnMonth', 'pnCash', 'pnSettings'].map((q) => wire('pnReady', 'ontrue', q, 'storageFetch')),

    wire('pnProjects', 'items', 'pnOut', 'projects'),
    wire('pnBlocks', 'items', 'pnOut', 'blocks'),
    wire('pnMoveBlocks', 'items', 'pnOut', 'moveBlocks'),
    wire('pnMonth', 'items', 'pnOut', 'monthPlans'),
    wire('pnCash', 'items', 'pnOut', 'cashEvents'),
    wire('pnSettings', 'items', 'pnOut', 'settings'),
    wire('pnBlocks', 'fetched', 'pnOut', 'loaded'),
    wire('pnProjects', 'failure', 'pnLoadProblem', 'do')
  ]
};

const ENVELOPES_INS: Array<[string, string]> = [['projects', 'array'], ['blocks', 'array'], ['monthPlans', 'array'], ['settings', 'array'], ['weekStart', 'string']];
const ENVELOPES_OUTS: Array<[string, string]> = [
  ['rows', 'array'], ['target', 'number'], ['billableUsed', 'number'], ['billableLeft', 'number'],
  ['perDay', 'number'], ['buildingLeft', 'number'], ['daysLeft', 'number'], ['focusHours', 'number'],
  ['hasPlan', 'boolean'], ['planLine', 'string'], ['targetLine', 'string'], ['invoicedText', 'string']
];

/**
 * The four tiles, and R1 in one Function.
 *
 * **Every sentence here is about the days that are left.** Billable does not say how far
 * behind the month is; it says how many hours a day the rest of the month needs. That is the
 * whole difference between this template and the mockup Richard rejected as *"preachy"*.
 *
 * ## The arithmetic AC2 pins down
 *
 * Target is R2: `ceil((householdNeed − partnerIncome) ÷ rate)`. With 5000, 1200 and 70 that
 * is 55 hours. With 41 logged and 5 working days left, `55 − 41 = 14`, and `14 ÷ 5 = 2.8`,
 * which is **2.75 h a day** once it is put in quarter hours — the unit a person plans in.
 *
 * R3 then decides Building, and this is the part worth reading twice: **the building budget
 * is what the focus ceiling has left over once billable work is paid for**, not a number
 * somebody typed. `(6 − 2.75) × 5 = 16.25 h`. So a month that needs more billable hours
 * shrinks the building budget by itself, which is the honest trade and the one Richard wanted
 * made deliberate rather than discovered in arrears.
 *
 * R4 on Hobby, verbatim: *"not budgeted, not counted, not a problem."* It is reported. It is
 * never red, and it never shrinks anything else.
 */
const ENVELOPES: Tpl010Component = {
  path: 'Logic/Envelopes',
  description: 'The four envelope tiles: what each one has spent, what is left in it, and the one line that says what to do with the rest of the month.',
  ...iface(ENVELOPES_INS, ENVELOPES_OUTS),
  nodes: [
    inputs('enIn', 'The month so far', ENVELOPES_INS),
    outputs('enOut', 'The tiles', ENVELOPES_OUTS),
    derive(
      'enWork',
      'Work out every envelope',
      `${PLANNER_FNS}${ENVELOPE_FNS}
var projects = Inputs.projects || [];
var blocks = Inputs.blocks || [];
var plans = Inputs.monthPlans || [];
var settings = (Inputs.settings || [])[0] || {};
var monday = parseDay(Inputs.weekStart) || mondayOf(startOfToday());
var month = monday.getFullYear() + '-' + pad(monday.getMonth() + 1);
var plan = null;
for (var i = 0; i < plans.length; i++) if (plans[i] && plans[i].month === month) plan = plans[i];

var rate = num(settings.rate, 0);
var need = num(settings.householdNeed, 0);
var partner = num(settings.partnerIncome, 0);
var focus = num(settings.focusHours, 6);
// R2 — the month's target is hours, never a project price.
var target = rate > 0 ? Math.ceil(Math.max(0, need - partner) / rate) : 0;

var byId = {};
for (var p = 0; p < projects.length; p++) if (projects[p]) byId[projects[p].id] = projects[p];

// Spent this month, per envelope: a done block, and the entries logged on an open one (R22).
var used = { billable: 0, building: 0, admin: 0, hobby: 0 };
for (var b = 0; b < blocks.length; b++) {
  var blk = blocks[b];
  if (!blk) continue;
  var d = parseDay(blk.date);
  if (!d || d.getFullYear() + '-' + pad(d.getMonth() + 1) !== month) continue;
  var env = envelopeOf(byId[blk.projectId]);
  used[env] = used[env] + spentOf(blk);
}

// R3 — working days left in the month, counted from today, Mon–Sat, Saturday included (Q4).
var today = startOfToday();
var monthStart = new Date(monday.getFullYear(), monday.getMonth(), 1);
var monthEnd = new Date(monday.getFullYear(), monday.getMonth() + 1, 0);
// Today counts as a day you can still work. Looking at a week that is not this
// month's, the whole month is still ahead of you.
var cursor = today.getTime() >= monthStart.getTime() && today.getTime() <= monthEnd.getTime() ? new Date(today.getTime()) : monthStart;
var daysLeft = 0;
while (cursor.getTime() <= monthEnd.getTime()) {
  if (cursor.getDay() !== 0) daysLeft++;
  cursor = addDays(cursor, 1);
}

var billableLeft = Math.max(0, target - used.billable);
var perDay = daysLeft > 0 ? q(billableLeft / daysLeft) : 0;
// R3 — what the ceiling leaves over once the billable day is paid for IS the building budget.
var buildingLeft = q(Math.max(0, focus - perDay) * daysLeft);

var budgets = {
  billable: plan ? num(plan.billable, target) : target,
  building: plan ? num(plan.building, buildingLeft) : buildingLeft,
  admin: plan ? num(plan.admin, 12) : 12,
  hobby: plan ? num(plan.hobby, 0) : 0
};

function say(k) {
  var left = budgets[k] - used[k];
  if (k === 'billable') {
    if (billableLeft <= 0) return 'Month covered. Everything else is yours.';
    return hText(perDay) + ' h a day for the ' + daysLeft + ' ' + (daysLeft === 1 ? 'day' : 'days') + ' left';
  }
  if (k === 'building') {
    if (buildingLeft <= 0) return 'Nothing spare this month once the billable hours are in.';
    return hText(buildingLeft) + ' h left to spend on rungs';
  }
  if (k === 'admin') return hText(Math.max(0, left)) + ' h left. Invoices and asks count here';
  // R4, word for word.
  return 'Not budgeted, not counted, not a problem';
}

var rows = [];
var four = ['billable', 'building', 'admin', 'hobby'];
for (var f = 0; f < four.length; f++) {
  var k = four[f];
  var u = used[k];
  var budget = budgets[k];
  var left = k === 'building' ? buildingLeft : Math.max(0, budget - u);
  var over = budget > 0 && u > budget;
  var pctFull = budget > 0 ? Math.min(100, (u / budget) * 100) : (u > 0 ? 100 : 0);
  rows.push({
    name: ENV_NAMES[k],
    leftText: hText(left) + ' h left',
    usedText: hText(u),
    budgetText: hText(budget),
    say: say(k),
    fillWidth: { value: Math.round(pctFull), unit: '%' },
    restWidth: { value: 100 - Math.round(pctFull), unit: '%' },
    // R4 and R13 — going over Billable is red; going over Hobby is simply the bar full.
    fillColor: over && k !== 'hobby' ? 'var(--destructive)' : envMark(k),
    mark: envMark(k)
  });
}

Outputs.rows = rows;
Outputs.target = target;
Outputs.billableUsed = used.billable;
Outputs.billableLeft = billableLeft;
Outputs.perDay = perDay;
Outputs.buildingLeft = buildingLeft;
Outputs.daysLeft = daysLeft;
Outputs.focusHours = focus;
Outputs.hasPlan = !!plan;
Outputs.planLine = plan
  ? 'This month is planned: ' + hText(budgets.billable) + ' h billable, ' + hText(budgets.building) + ' h building.'
  : 'This month has no plan yet. Press Plan this month and the envelopes start from your settings.';
Outputs.targetLine = rate > 0
  ? 'That is ' + target + ' billable hours this month — (' + money(need) + ' − ' + money(partner) + ') ÷ ' + money(rate) + ' an hour.'
  : 'Put your rate in and the month gets a target.';

// What has been invoiced this month so far: logged hours on earning projects, at their rate.
var invoiced = 0;
for (var q2 = 0; q2 < blocks.length; q2++) {
  var bb = blocks[q2];
  if (!bb) continue;
  var dd = parseDay(bb.date);
  if (!dd || dd.getFullYear() + '-' + pad(dd.getMonth() + 1) !== month) continue;
  var pr = byId[bb.projectId];
  if (!pr || pr.kind !== 'earning') continue;
  invoiced += spentOf(bb) * num(pr.rate, rate);
}
Outputs.invoicedText = money(invoiced) + ' invoiced so far';`
    )
  ],
  connections: [
    ...ENVELOPES_INS.map(([n]) => wire('enIn', n, 'enWork', `in-${n}`)),
    ...ENVELOPES_OUTS.map(([n]) => wire('enWork', `out-${n}`, 'enOut', n))
  ]
};

const DAY_COLUMNS_INS: Array<[string, string]> = [
  ['projects', 'array'], ['blocks', 'array'], ['weekStart', 'string'], ['focusHours', 'number'], ['newBlockId', 'string'],
  // Which day the PHONE is showing. Empty means "today, or the Monday if today is not in the
  // week on screen" — the picker never has to be set before the app is usable.
  ['pickedDay', 'string']
];
const DAY_COLUMNS_OUTS: Array<[string, string]> = [
  ['columns', 'array'], ['picker', 'array'], ['todayKey', 'string'], ['tomorrowKey', 'string'], ['todayLong', 'string'], ['tomorrowLong', 'string'], ['firstOpenDay', 'string']
];

/**
 * The six columns, Monday to Saturday (R5, Q4 — Saturday is shown and its hours count in
 * their envelope like any other day's).
 *
 * R3's ceiling is applied here and nowhere else: a day whose **focused** hours — billable
 * plus building, never admin or hobby — pass the ceiling says *"Over the focus ceiling.
 * Nothing else goes here."* That is red, and the only other red in the template is an
 * overdue move (R13).
 *
 * `firstOpenDay` is the day `Commands/Place move` drops a chip into: the first day from today
 * with room under the ceiling (AC3).
 */
const DAY_COLUMNS: Tpl010Component = {
  path: 'Logic/Day columns',
  description: 'The six day columns: every block in each day, the focused hours against the ceiling, and what kind of day each one is.',
  ...iface(DAY_COLUMNS_INS, DAY_COLUMNS_OUTS),
  nodes: [
    inputs('dlIn', 'The week', DAY_COLUMNS_INS),
    outputs('dlOut', 'The columns', DAY_COLUMNS_OUTS),
    derive(
      'dlWork',
      'Build the six columns',
      `${PLANNER_FNS}${ENVELOPE_FNS}
var projects = Inputs.projects || [];
var blocks = Inputs.blocks || [];
var monday = parseDay(Inputs.weekStart) || mondayOf(startOfToday());
var focus = num(Inputs.focusHours, 6);
var newId = String(Inputs.newBlockId || '');
var today = startOfToday();
var todayKey = dayKey(today);

// The phone shows one day. Which one: what the picker last chose, if it is still in the week
// on screen; otherwise today; otherwise the Monday. The arrows move the week, so a day picked
// last week has to fall back rather than leave the phone showing nothing.
var weekKeys = [];
for (var w = 0; w < 6; w++) weekKeys.push(dayKey(addDays(monday, w)));
var picked = String(Inputs.pickedDay || '');
if (weekKeys.indexOf(picked) < 0) picked = weekKeys.indexOf(todayKey) >= 0 ? todayKey : weekKeys[0];

var byId = {};
for (var i = 0; i < projects.length; i++) if (projects[i]) byId[projects[i].id] = projects[i];

/** The bar is drawn against a fixed eight hours so the six days are comparable. */
var SCALE = 8;
var columns = [];
var pickerRows = [];
var firstOpen = '';
for (var d = 0; d < 6; d++) {
  var day = addDays(monday, d);
  var key = dayKey(day);
  var mine = [];
  for (var b = 0; b < blocks.length; b++) if (blocks[b] && blocks[b].date === key) mine.push(blocks[b]);
  mine.sort(function (x, y) { return num(x.position, 0) - num(y.position, 0); });

  var focused = 0, doneH = 0, plannedH = 0;
  var rows = [];
  for (var m = 0; m < mine.length; m++) {
    var blk = mine[m];
    var proj = byId[blk.projectId] || { name: 'Unknown project', kind: 'admin' };
    var env = envelopeOf(proj);
    var h = hoursOf(blk);
    if (env === 'billable' || env === 'building') focused += h;
    if (blk.done) doneH += h; else plannedH += h;
    // The hours on a block are the hours it counts for. Written out a second time here, this
    // read the empty actual of every logged block as nought and put "0 h" on the whole week.
    // R22 — an open block with time logged on it reads "0.5 of 1 h": what has gone in, of what
    // the day is holding for it.
    var logged = blk.done ? 0 : loggedOf(blk);
    rows.push({
      id: blk.id,
      projectId: blk.projectId,
      projectName: proj.name || '',
      what: blk.what || '',
      hoursText: logged > 0 ? hText(logged) + ' of ' + hText(h) + ' h' : hText(h) + ' h',
      done: !!blk.done,
      // R13b — the tick is ink, not the envelope: the left edge is the block's one colour.
      tickFill: blk.done ? 'var(--foreground)' : 'transparent',
      tickInk: blk.done ? 'var(--surface)' : 'transparent',
      mark: envMark(env),
      soft: envSoft(env),
      isNew: !!newId && blk.id === newId,
      fromTodo: !!blk.todoTaskId
    });
  }

  var donePct = Math.round(Math.min(100, (doneH / SCALE) * 100));
  var plannedPct = Math.min(100 - donePct, Math.round(Math.min(100, (plannedH / SCALE) * 100)));
  var over = focused > focus;
  var isToday = key === todayKey;
  var isPast = day.getTime() < today.getTime();
  var caption;
  if (over) caption = 'Over the focus ceiling. Nothing else goes here.';
  else if (isPast) caption = 'Logged';
  else if (isToday) caption = 'In progress';
  else if (d === 5) caption = 'Optional';
  else caption = 'Planned';

  if (!firstOpen && !isPast && focused + 0.5 <= focus) firstOpen = key;

  columns.push({
    key: key,
    day: DOW[d] + ' ' + day.getDate(),
    focusText: hText(focused) + ' / ' + hText(focus) + ' h',
    focusColor: over ? 'var(--destructive)' : 'var(--muted-foreground)',
    caption: caption,
    captionColor: over ? 'var(--destructive)' : 'var(--muted-foreground)',
    doneWidth: { value: donePct, unit: '%' },
    plannedWidth: { value: plannedPct, unit: '%' },
    restWidth: { value: Math.max(0, 100 - donePct - plannedPct), unit: '%' },
    doneColor: over ? 'var(--destructive)' : 'var(--env-billable)',
    plannedColor: over ? 'var(--destructive)' : 'var(--env-building)',
    blocks: rows,
    isToday: isToday,
    columnBackground: isToday ? 'var(--muted)' : 'transparent',
    columnClass: 'planner-pinned planner-day' + (key === picked ? ' planner-day-picked' : '')
  });

  pickerRows.push({
    key: key,
    label: DOW[d] + ' ' + day.getDate(),
    ink: key === picked ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
    chipFill: key === picked ? 'var(--primary)' : 'transparent',
    edge: key === picked ? 'var(--primary)' : 'var(--border)'
  });
}

// Nothing with room this week: the move goes in the last day rather than nowhere.
if (!firstOpen) firstOpen = dayKey(addDays(monday, 4));

Outputs.columns = columns;
Outputs.picker = pickerRows;
Outputs.todayKey = todayKey;
Outputs.tomorrowKey = dayKey(addDays(today, 1));
Outputs.todayLong = DOW_LONG[(today.getDay() + 6) % 7] + ' ' + today.getDate();
Outputs.tomorrowLong = DOW_LONG[(addDays(today, 1).getDay() + 6) % 7];
Outputs.firstOpenDay = firstOpen;`
    )
  ],
  connections: [
    ...DAY_COLUMNS_INS.map(([n]) => wire('dlIn', n, 'dlWork', `in-${n}`)),
    ...DAY_COLUMNS_OUTS.map(([n]) => wire('dlWork', `out-${n}`, 'dlOut', n))
  ]
};

// R7c — no week in: placed is read from today, whichever week is on screen.
const MOVES_INS: Array<[string, string]> = [['projects', 'array'], ['moveBlocks', 'array']];
const MOVES_OUTS: Array<[string, string]> = [['rows', 'array'], ['empty', 'boolean'], ['unplacedDormant', 'string'], ['unsentBuilding', 'string']];

/**
 * R7 — every project's next move on one line, most urgent first, and R8 — **dormant projects
 * are on it too**, because *"It helps remind you of older projects you might want to follow
 * up with."*
 *
 * A move with a date in the past is late and drawn red. A move that already has time in the
 * week reads as placed, and pressing it then opens the card instead of writing a second block
 * (AC3). R9: a project whose move is `moveStop` — a finished asset, *"fixes only"* — is not on
 * the strip at all, because the strip is for things that still want hours.
 */
const MOVES: Tpl010Component = {
  path: 'Logic/Moves',
  description: 'Every project’s next move as a row of chips, the most urgent first, including the dormant projects worth a nudge.',
  ...iface(MOVES_INS, MOVES_OUTS),
  nodes: [
    inputs('mvIn', 'The projects', MOVES_INS),
    outputs('mvOut', 'The chips', MOVES_OUTS),
    derive(
      'mvWork',
      'Sort the moves by urgency',
      `${PLANNER_FNS}${ENVELOPE_FNS}
var projects = Inputs.projects || [];
var today = startOfToday();

var withMove = [];
for (var i = 0; i < projects.length; i++) {
  var p = projects[i];
  // R9 — a finished asset says "fixes only" and stops asking for hours.
  if (!p || !p.move || p.moveStop) continue;
  var due = parseDay(p.moveDue);
  withMove.push({ p: p, due: due, late: !!due && due.getTime() < today.getTime() });
}
// A move with no date is not urgent; it sorts after every dated one.
withMove.sort(function (a, b) {
  if (a.due && b.due) return a.due.getTime() - b.due.getTime();
  if (a.due) return -1;
  if (b.due) return 1;
  return 0;
});

var rows = [];
var unplacedDormant = '';
var unsentBuilding = '';
for (var k = 0; k < withMove.length; k++) {
  var it = withMove[k];
  var p2 = it.p;
  var env = envelopeOf(p2);
  // R7c — placed is a live move block on or after today, whichever week is on screen.
  var live = moveOf(p2.id, Inputs.moveBlocks, today).live;
  var isPlaced = !!live;
  var liveDay = live ? parseDay(live.date) : null;
  // R7d — the day sits where the tick is. Within the next six days the weekday says it; past that
  // the date is needed too, or a Thursday next week reads as this one.
  var soon = liveDay && liveDay.getTime() - today.getTime() < 6 * 86400000;
  rows.push({
    projectId: p2.id,
    projectName: p2.name || '',
    move: p2.move || '',
    worth: p2.moveWorth || '',
    hasWorth: !!p2.moveWorth,
    mark: envMark(env),
    ink: envInk(env),
    soft: isPlaced ? envSoft(env) : 'var(--surface)',
    placed: isPlaced,
    late: it.late,
    edge: it.late ? 'var(--destructive)' : 'var(--border-strong)',
    hint: isPlaced ? 'Already in the week' : 'Put 30 minutes in the week',
    // R7d — hollow marker unplaced, filled placed; a placed chip is the mockup's: faded and struck through.
    tick: isPlaced ? '\u2713 ' + (soon ? DOW[(liveDay.getDay() + 6) % 7] : shortDay(live.date)) : '',
    dotFill: isPlaced ? envMark(env) : 'transparent',
    chipClass: isPlaced ? 'planner-chip planner-chip-placed' : 'planner-chip'
  });
  if (!isPlaced && p2.kind === 'dormant' && !unplacedDormant) unplacedDormant = p2.name || '';
  if (!isPlaced && p2.kind === 'building' && !unsentBuilding) unsentBuilding = p2.name || '';
}

Outputs.rows = rows;
Outputs.empty = rows.length === 0;
Outputs.unplacedDormant = unplacedDormant;
Outputs.unsentBuilding = unsentBuilding;`
    )
  ],
  connections: [
    ...MOVES_INS.map(([n]) => wire('mvIn', n, 'mvWork', `in-${n}`)),
    ...MOVES_OUTS.map(([n]) => wire('mvWork', `out-${n}`, 'mvOut', n))
  ]
};

const CASH_INS: Array<[string, string]> = [['cashEvents', 'array'], ['settings', 'array'], ['invoicedText', 'string']];
const CASH_OUTS: Array<[string, string]> = [['rows', 'array'], ['balanceText', 'string'], ['termsText', 'string']];

/**
 * R10 — the next six weeks, with the balance after each event, and **an event that leaves the
 * balance negative outlined red**. That outline is the whole reason the strip exists: it is
 * the one place the app is allowed to be alarming, and it is alarming about a date in the
 * future, which is still a plan.
 *
 * A `recurring: 'monthly'` row is expanded on read rather than written twelve times, so
 * changing the rent changes every month of it.
 */
const CASH_LINE: Tpl010Component = {
  path: 'Logic/Cash line',
  description: 'The next six weeks of money: every event in order with the balance after it, and a red outline on any that takes you under.',
  ...iface(CASH_INS, CASH_OUTS),
  nodes: [
    inputs('clIn', 'The money', CASH_INS),
    outputs('clOut', 'The strip', CASH_OUTS),
    derive(
      'clWork',
      'Expand the months and run the balance',
      `${PLANNER_FNS}
var events = Inputs.cashEvents || [];
var settings = (Inputs.settings || [])[0] || {};
var today = startOfToday();
var horizon = addDays(today, 42);
var opening = num(settings.openingBalance, 0);

var out = [];
for (var i = 0; i < events.length; i++) {
  var e = events[i];
  if (!e) continue;
  var when = parseDay(e.date);
  if (!when) continue;
  if (e.recurring === 'monthly') {
    // Walk it forward from its own day-of-month until the horizon.
    var cur = new Date(when.getTime());
    while (cur.getTime() < today.getTime()) cur = new Date(cur.getFullYear(), cur.getMonth() + 1, cur.getDate());
    while (cur.getTime() <= horizon.getTime()) {
      out.push({ when: new Date(cur.getTime()), amount: num(e.amount, 0), label: e.label || '', kind: e.kind || 'cost' });
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, cur.getDate());
    }
  } else if (when.getTime() >= today.getTime() && when.getTime() <= horizon.getTime()) {
    out.push({ when: when, amount: num(e.amount, 0), label: e.label || '', kind: e.kind || 'cost' });
  }
}
out.sort(function (a, b) { return a.when.getTime() - b.when.getTime(); });

var running = opening;
var rows = [];
for (var k = 0; k < out.length; k++) {
  var ev = out[k];
  running += ev.amount;
  var low = running < 0;
  var amountText = ev.amount === 0 ? '—' : (ev.amount > 0 ? '+' : '') + money(ev.amount);
  rows.push({
    when: DOW[(ev.when.getDay() + 6) % 7] + ' ' + ev.when.getDate() + ' ' + MON[ev.when.getMonth()],
    amount: amountText,
    amountColor: ev.amount > 0 ? 'var(--env-billable-ink)' : ev.amount < 0 ? 'var(--muted-foreground)' : 'var(--muted-foreground)',
    label: ev.label,
    running: 'after: ' + money(running),
    low: low,
    edge: low ? 'var(--destructive)' : 'var(--border)'
  });
}

Outputs.rows = rows;
Outputs.balanceText = 'Balance today ' + money(opening);
var terms = num(settings.paymentTermsDays, 7);
var invoiceDay = num(settings.invoiceDay, 0);
Outputs.termsText = invoiceDay > 0
  ? 'Invoiced on the ' + invoiceDay + ', due within ' + terms + ' days'
  : 'Due within ' + terms + ' days';`
    )
  ],
  connections: [
    ...CASH_INS.map(([n]) => wire('clIn', n, 'clWork', `in-${n}`)),
    ...CASH_OUTS.map(([n]) => wire('clWork', `out-${n}`, 'clOut', n))
  ]
};

const SHUTDOWN_INS: Array<[string, string]> = [
  ['projects', 'array'], ['blocks', 'array'], ['todayKey', 'string'], ['tomorrowKey', 'string'],
  ['todayLong', 'string'], ['tomorrowLong', 'string'], ['unplacedDormant', 'string'],
  ['target', 'number'], ['billableUsed', 'number'], ['billableLeft', 'number'], ['perDay', 'number'],
  ['buildingLeft', 'number'], ['daysLeft', 'number'], ['focusHours', 'number']
];
const SHUTDOWN_OUTS: Array<[string, string]> = [
  ['title', 'string'], ['dayLine', 'string'], ['monthLine', 'string'], ['concern', 'string'],
  ['carryRows', 'array'], ['nothingToCarry', 'boolean'], ['tomorrowTitle', 'string'],
  ['tomorrowList', 'string'], ['tomorrowFocus', 'string'], ['tomorrowFocusColor', 'string']
];

/**
 * R12 — the evening, as **rules over data**. No model runs in the template; the MCP coach is
 * a later task and needs a `Decision` collection this one does not ship.
 *
 * ## One concern, and its order (AC5)
 *
 * 1. **A building move planned for today and not logged.** First because it is the rung next
 *    month's money depends on, and it is the hour that quietly gets eaten by billable work.
 * 2. **A dormant project with no time in the week** (R8) — the easiest money on the board is
 *    usually somebody who already said yes once.
 * 3. *"No concerns tonight."*
 *
 * **One.** Not a list. The rule Richard set is that a concern is raised once, and an override
 * is logged with a review date and never argued again — so a drawer that reprints five
 * worries every evening is the preachy mockup wearing a different coat (R1).
 *
 * The month line is a plan for the days left, in the same breath as the number: how much is
 * billed, how much to go, over how many days, and what that is a day.
 */
const SHUTDOWN: Tpl010Component = {
  path: 'Logic/Shutdown',
  description: 'What the evening drawer says: what today came to, where the month stands, the one thing worth raising, what did not get done, and tomorrow as it stands.',
  ...iface(SHUTDOWN_INS, SHUTDOWN_OUTS),
  nodes: [
    inputs('suIn', 'Tonight', SHUTDOWN_INS),
    outputs('suOut', 'What to say', SHUTDOWN_OUTS),
    derive(
      'suWork',
      'Work out what tonight says',
      `${PLANNER_FNS}${ENVELOPE_FNS}
var projects = Inputs.projects || [];
var blocks = Inputs.blocks || [];
var todayKey = String(Inputs.todayKey || '');
var tomorrowKey = String(Inputs.tomorrowKey || '');
var todayLong = String(Inputs.todayLong || 'Today');
var tomorrowLong = String(Inputs.tomorrowLong || 'Tomorrow');
var focus = num(Inputs.focusHours, 6);

var byId = {};
for (var i = 0; i < projects.length; i++) if (projects[i]) byId[projects[i].id] = projects[i];

var todayBlocks = [], notDone = [];
for (var b = 0; b < blocks.length; b++) {
  var blk = blocks[b];
  if (!blk || blk.date !== todayKey) continue;
  todayBlocks.push(blk);
  if (!blk.done) notDone.push(blk);
}

var billed = 0, built = 0;
for (var t = 0; t < todayBlocks.length; t++) {
  var tb = todayBlocks[t];
  var env = envelopeOf(byId[tb.projectId]);
  if (env === 'billable') billed += spentOf(tb);
  else if (env === 'building') built += spentOf(tb);
}

Outputs.title = 'Shutdown · ' + todayLong;
Outputs.dayLine = todayLong.split(' ')[0] + ': ' + hText(billed) + ' h billed, ' + hText(built) + ' h building. ' +
  (notDone.length === 0 ? 'Everything logged.' : notDone.length + ' block' + (notDone.length === 1 ? '' : 's') + ' not done.');

var target = num(Inputs.target, 0);
var used = num(Inputs.billableUsed, 0);
var left = num(Inputs.billableLeft, 0);
var perDay = num(Inputs.perDay, 0);
var daysLeft = num(Inputs.daysLeft, 0);
var buildingLeft = num(Inputs.buildingLeft, 0);
// R1 — the month sentence is a plan for the days left, never a verdict on the ones gone.
Outputs.monthLine = left > 0
  ? 'Month: ' + hText(used) + ' of ' + hText(target) + ' billable. ' + hText(left) + ' to go over ' + daysLeft + ' ' +
    (daysLeft === 1 ? 'day' : 'days') + ' is ' + hText(perDay) + ' a day. Building has ' + hText(buildingLeft) + ' h left.'
  : 'Month: the billable envelope is full. Every hour left is yours to put where it grows.';

// AC5 — the one concern, in this order and no other.
var unloggedBuilding = null;
for (var u = 0; u < notDone.length; u++) {
  var nb = notDone[u];
  if (envelopeOf(byId[nb.projectId]) === 'building') { unloggedBuilding = nb; break; }
}
var dormant = String(Inputs.unplacedDormant || '');
if (unloggedBuilding) {
  var who = (byId[unloggedBuilding.projectId] || {}).name || 'That building block';
  Outputs.concern = 'One thing: ' + who + ' — "' + (unloggedBuilding.what || '') + '" — is still not done. ' +
    hText(num(unloggedBuilding.planned, 0)) + ' h, and it is the rung next month leans on. Carry it to ' + tomorrowLong + ', or tell me why not.';
} else if (dormant) {
  Outputs.concern = 'One thing: ' + dormant + ' is on the strip with no time in the week. One email, and it is a yes or a no.';
} else {
  Outputs.concern = 'No concerns tonight.';
}

var carryRows = [];
for (var c = 0; c < notDone.length; c++) {
  var cb = notDone[c];
  carryRows.push({
    id: cb.id,
    projectName: (byId[cb.projectId] || {}).name || '',
    what: cb.what || '',
    hoursText: hText(num(cb.planned, 0)) + ' h',
    carryLabel: 'Carry to ' + tomorrowLong
  });
}
Outputs.carryRows = carryRows;
Outputs.nothingToCarry = carryRows.length === 0;

// AC6 — tomorrow's focus total is read from the same blocks, so carrying changes it at once.
var lines = [], tomorrowFocus = 0;
for (var m = 0; m < blocks.length; m++) {
  var mb = blocks[m];
  if (!mb || mb.date !== tomorrowKey) continue;
  var mp = byId[mb.projectId] || {};
  var menv = envelopeOf(mp);
  if (menv === 'billable' || menv === 'building') tomorrowFocus += hoursOf(mb);
  lines.push((mp.name || '') + ' · ' + (mb.what || '') + '  ' + hText(num(mb.planned, 0)) + ' h');
}
Outputs.tomorrowTitle = tomorrowLong + ' as it stands';
Outputs.tomorrowList = lines.length ? lines.join('\\n') : 'Nothing in it yet.';
Outputs.tomorrowFocus = hText(tomorrowFocus) + ' / ' + hText(focus) + ' h';
Outputs.tomorrowFocusColor = tomorrowFocus > focus ? 'var(--destructive)' : 'var(--foreground)';`
    )
  ],
  connections: [
    ...SHUTDOWN_INS.map(([n]) => wire('suIn', n, 'suWork', `in-${n}`)),
    ...SHUTDOWN_OUTS.map(([n]) => wire('suWork', `out-${n}`, 'suOut', n))
  ]
};

const CARD_ROWS_INS: Array<[string, string]> = [
  ['projects', 'array'], ['blocks', 'array'], ['moveBlocks', 'array'], ['weekStart', 'string'], ['selectedId', 'string'], ['firstOpenDay', 'string']
];
/** The last two are for the commands the card presses, not for the card to draw. */
const CARD_ROWS_OUTS: Array<[string, string]> = [['groups', 'array'], ...PROJECT_DETAIL_FIELDS, ['resolvedId', 'string'], ['placedBlockId', 'string']];

/**
 * The card's four groups and the one project on the right (R6, AC7).
 *
 * Not in the task file's list of six `Logic/` components, and added deliberately: the card
 * needs as much derivation as the week does, and the alternative was `Pages/Week` growing a
 * second brain. Everything else in `Logic/` stays readable because this is here.
 *
 * The Admin project is not in the list. It is a fixed row that exists to hold invoices and
 * email (§2), it has no move and no history worth a sparkline, and putting it among the
 * projects a person is deciding about is how a board stops being a board.
 *
 * 🔴 **The sparkline is scaled against the project's own maximum**, never a shared one:
 * these six bars answer "is this going up or down for *this* client", and scaling Salon
 * Collective against Bramble & Co would draw a flat line for a project that doubled.
 */
const CARD_ROWS: Tpl010Component = {
  path: 'Logic/Card rows',
  description: 'What the projects card draws: the four groups with their hours this week, and every field of whichever project is selected.',
  ...iface(CARD_ROWS_INS, CARD_ROWS_OUTS),
  nodes: [
    inputs('kdIn', 'The projects', CARD_ROWS_INS),
    outputs('kdOut', 'The card', CARD_ROWS_OUTS),
    derive(
      'kdWork',
      'Group them, then open one',
      `${PLANNER_FNS}${ENVELOPE_FNS}
var projects = Inputs.projects || [];
var blocks = Inputs.blocks || [];
var monday = parseDay(Inputs.weekStart) || mondayOf(startOfToday());
var today = startOfToday();
var todayKey = dayKey(today);

var weekKeys = [];
for (var i = 0; i < 6; i++) weekKeys.push(dayKey(addDays(monday, i)));

function hoursFor(projectId, dayKeyWanted) {
  var total = 0;
  for (var b = 0; b < blocks.length; b++) {
    var blk = blocks[b];
    if (!blk || blk.projectId !== projectId) continue;
    if (dayKeyWanted && blk.date !== dayKeyWanted) continue;
    if (!dayKeyWanted && weekKeys.indexOf(blk.date) < 0) continue;
    total += hoursOf(blk);
  }
  return total;
}
// R7c — placed is a live move block on or after today, whichever week is on screen.
function liveMove(projectId) { return moveOf(projectId, Inputs.moveBlocks, today).live; }
function isLate(p) {
  var d = p && p.moveDue ? parseDay(p.moveDue) : null;
  return !!d && d.getTime() < today.getTime();
}

// The four groups, in the order R4 and R8 put them.
var GROUPS = [
  { kind: 'earning', env: 'billable', name: 'Billable' },
  { kind: 'building', env: 'building', name: 'Building' },
  { kind: 'hobby', env: 'hobby', name: 'Hobby' },
  { kind: 'dormant', env: 'dormant', name: ENV_NAMES.dormant }
];

var selected = String(Inputs.selectedId || '');
var found = null;
for (var s2 = 0; s2 < projects.length; s2++) if (projects[s2] && projects[s2].id === selected) found = projects[s2];

var groups = [];
for (var g = 0; g < GROUPS.length; g++) {
  var grp = GROUPS[g];
  var rows = [], groupHours = 0;
  for (var p = 0; p < projects.length; p++) {
    var proj = projects[p];
    // The Admin row is overhead, not a project you decide about.
    if (!proj || proj.kind === 'admin' || proj.kind !== grp.kind) continue;
    var t = hoursFor(proj.id, null);
    groupHours += t;
    if (!found) found = proj;
    var late = isLate(proj);
    var live = liveMove(proj.id);
    rows.push({
      id: proj.id,
      name: proj.name || '',
      hoursText: t > 0 ? hText(t) + ' h' : '\u2014',
      // R7d — the unplaced moves are what the eye should land on here: full strength, and red when
      // late. A placed one goes muted and says its day.
      move: live ? '\u2713 ' + shortDay(live.date) + ' \u00b7 ' + (proj.move || '') : (late ? '! ' : '\u2192 ') + (proj.move || ''),
      hasMove: !!proj.move,
      moveColor: live ? 'var(--muted-foreground)' : late ? 'var(--destructive)' : 'var(--foreground)',
      mark: envMark(grp.env),
      barWidth: { value: Math.round(Math.min(100, (t / 10) * 100)), unit: '%' },
      barRest: { value: 100 - Math.round(Math.min(100, (t / 10) * 100)), unit: '%' },
      rowBackground: proj.id === selected ? 'var(--muted)' : 'transparent'
    });
  }
  groups.push({
    name: grp.name,
    hours: groupHours > 0 ? hText(groupHours) + ' h this week' : 'nothing this week',
    color: envInk(grp.env),
    rows: rows
  });
}
Outputs.groups = groups;

var one = found || {};
var oneEnv = envelopeOf(one);
Outputs.resolvedId = one.id || '';
Outputs.name = one.name || 'No projects yet';
Outputs.sub = one.sub || 'Add a project and it appears here.';
Outputs.move = one.move || '';
Outputs.hasMove = !!one.move;
Outputs.worth = one.moveWorth || '';
Outputs.hasWorth = !!one.moveWorth;
Outputs.when = one.moveWhen || '';
Outputs.whenColor = isLate(one) ? 'var(--destructive)' : 'var(--muted-foreground)';
Outputs.mark = envMark(oneEnv);
Outputs.soft = envSoft(oneEnv);
// R9 — "fixes only" has no button to spend more hours on it.
var canPlan = !!one.move && !one.moveStop;
Outputs.canPlan = canPlan;
// R7b — the move box. Placed: its day and hours, and the day field on that day for Move it.
// Unplaced: the first open day and half an hour, which is what the chip would have done.
var state = one.id ? moveOf(one.id, Inputs.moveBlocks, today) : { live: null, last: null };
var live = state.live;
var liveDay = live ? parseDay(live.date) : null;
Outputs.placed = canPlan && !!live;
Outputs.unplaced = canPlan && !live;
Outputs.placedBlockId = live ? String(live.id) : '';
Outputs.placedLine = live ? 'In the week: ' + shortDay(live.date) + (liveDay.getMonth() !== today.getMonth() ? ' ' + MON[liveDay.getMonth()] : '') + ' \u00b7 ' + hText(hoursOf(live)) + ' h' : '';
var first = parseDay(Inputs.firstOpenDay);
Outputs.planDate = live ? String(live.date) : first && first.getTime() >= today.getTime() ? dayKey(first) : todayKey;
Outputs.planHours = '0.5';
Outputs.minDate = todayKey;
// R2.3-4 — the move whose block was done reads unplaced again, and says when it was last done.
var last = state.last;
Outputs.lastLine = !live && last ? (last.done ? '\u2713 Done ' + shortDay(last.date) + '. Put the next one in, or change the move.' : 'Was in ' + shortDay(last.date) + ', and not done.') : '';
Outputs.hasLast = canPlan && !live && !!last;
// Which project and which state — the hours box is put back to 0.5 whenever this changes.
Outputs.moveKey = (one.id || '') + (live ? ':' + live.id : ':open');

var weekTotal = one.id ? hoursFor(one.id, null) : 0;
var rateText = num(one.rate, 0) > 0 && weekTotal > 0 ? ' \u00b7 ' + money(weekTotal * num(one.rate, 0)) : '';
Outputs.weekText = 'This week \u00b7 ' + (weekTotal > 0 ? hText(weekTotal) + ' h' : 'nothing') + rateText;
Outputs.sparkTitle = num(one.rate, 0) > 0 ? 'Last six months, \u20ac' : 'Last six months, hours';

var facts = [];
var given = one.facts || [];
for (var f = 0; f < given.length; f++) {
  var fact = given[f];
  if (!fact) continue;
  facts.push({ label: String(fact[0] || ''), value: String(fact[1] || '') });
}
Outputs.facts = facts;

// Scaled against this project's own maximum, never a shared one.
var history = one.history || [];
var max = 1;
for (var h = 0; h < history.length; h++) max = Math.max(max, num(history[h], 0));
var bars = [];
for (var h2 = 0; h2 < 6; h2++) {
  var v = num(history[h2], 0);
  bars.push({ height: { value: Math.max(6, Math.round((v / max) * 100)), unit: '%' }, mark: envMark(oneEnv) });
}
Outputs.bars = bars;
var sixAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);
Outputs.firstLabel = MON[sixAgo.getMonth()];
Outputs.lastLabel = MON[today.getMonth()];

var boxes = [];
for (var d = 0; d < 6; d++) {
  var key = weekKeys[d];
  var dv = one.id ? hoursFor(one.id, key) : 0;
  boxes.push({ value: dv > 0 ? hText(dv) : '\u00b7', label: DOW[d], background: key === todayKey ? 'var(--muted)' : 'transparent' });
}
Outputs.boxes = boxes;

Outputs.say = one.say || '';`
    )
  ],
  connections: [
    ...CARD_ROWS_INS.map(([n]) => wire('kdIn', n, 'kdWork', `in-${n}`)),
    ...CARD_ROWS_OUTS.map(([n]) => wire('kdWork', `out-${n}`, 'kdOut', n))
  ]
};

// ════════════════════════════════════════════════════════════════════════════
// Commands — one component per thing a person can do
// ════════════════════════════════════════════════════════════════════════════

interface WriteSpec {
  /** `create`, `update` or `delete`. */
  kind: 'create' | 'update' | 'delete';
  collection: string;
  label: string;
  /** `[field, guardOutputName]` — the guard names every value that is written. */
  props?: Array<[string, string]>;
  /**
   * The command's OWN input port carrying the id of the row being changed.
   * A port name rather than a node id: the node id is derived from the path inside
   * {@link command}, and spelling it again by hand is how four of these were wrong.
   */
  idFromInput?: string;
}

interface CommandSpec {
  path: string;
  description: string;
  ins: Array<[string, string]>;
  /** Pulses `go` when there is something to write, and names every value written. */
  guard: string;
  guardIns: string[];
  write: WriteSpec;
  extraOuts?: Array<[string, string]>;
  extraWires?: (p: string) => unknown[];
}

/**
 * Every command is the same three things and nothing else: **a guard that decides whether
 * there is anything to write, one record write, and one sentence when it fails.**
 *
 * The guard is not decoration. It is where a blank box, a zero, a move on a project that
 * already has one, and a day outside the week are all turned into *nothing happens* — so a
 * button that should do nothing does nothing at the door, rather than writing a row the week
 * then has to explain.
 */
function command(spec: CommandSpec): Tpl010Component {
  const p = spec.path.split('/')[1].replace(/[^A-Za-z]/g, '').slice(0, 10);
  const ins: Array<[string, string]> = [...spec.ins, ['do', 'signal']];
  const outs: Array<[string, string]> = [['done', 'signal'], ...(spec.extraOuts ?? [])];
  const w = spec.write;
  const writeId = `${p}Write`;
  const params: Record<string, unknown> = { collectionName: w.collection };
  if (w.kind === 'update') params.idSource = 'explicit';
  const nodeType = w.kind === 'create' ? CREATE : w.kind === 'update' ? UPDATE : DELETE;
  // 🔴 All three record nodes fire on `store` (shown as "Do"). Delete Record's
  // `storageDelete` is the method behind that port, not the port — wiring to it is
  // accepted by the file format and then dropped by the runtime with
  // "Invalid connection, input doesn't exist", which is a console error and a button
  // that silently does nothing.
  const fireInput = 'store';

  return {
    path: spec.path,
    description: spec.description,
    ...iface(ins, outs),
    nodes: [
      inputs(`${p}In`, 'What to do', ins),
      outputs(`${p}Out`, 'Done', outs),
      script(`${p}Guard`, 'Is there anything to write?', spec.guard, spec.guardIns),
      logic(writeId, nodeType, w.label, params),
      {
        ...(logic(`${p}Problem`, SET_VARIABLE, 'Say it did not save', { name: VAR.problem, setWith: 'string', value: PROBLEM_TEXT }) as object),
        comment: SHARED_PROBLEM
      }
    ],
    connections: [
      ...spec.guardIns.map((n) => wire(`${p}In`, n, `${p}Guard`, `in-${n}`)),
      wire(`${p}In`, 'do', `${p}Guard`, 'run'),
      ...(w.props ?? []).map(([field, from]) => wire(`${p}Guard`, `out-${from}`, writeId, `prop-${field}`)),
      ...(w.idFromInput ? [wire(`${p}In`, w.idFromInput, writeId, 'modelId')] : []),
      wire(`${p}Guard`, 'out-go', writeId, fireInput),
      wire(writeId, 'done', `${p}Out`, 'done'),
      wire(writeId, 'failure', `${p}Problem`, 'do'),
      ...(spec.extraWires ? spec.extraWires(p) : [])
    ]
  };
}

const ADD_BLOCK = command({
  path: 'Commands/Add block',
  description: 'Puts a block of time in a day: which project, what it is, and how many hours.',
  ins: [['projectId', 'string'], ['date', 'string'], ['what', 'string'], ['planned', 'number']],
  guard: `${PLANNER_FNS}var pid = String(Inputs.projectId || '');
var date = String(Inputs.date || '');
var what = String(Inputs.what || '').trim();
var planned = q(num(Inputs.planned, 0));
if (pid === '' || !parseDay(date) || what === '' || planned <= 0) return;
Outputs.projectId = pid;
Outputs.date = date;
Outputs.what = what;
Outputs.planned = planned;
Outputs.done = false;
Outputs.isMove = false;
Outputs.empty = '';
// New blocks go to the bottom of their day, which is the order they were thought of in.
Outputs.position = Date.now();
Outputs.go();`,
  guardIns: ['projectId', 'date', 'what', 'planned'],
  write: {
    kind: 'create',
    collection: 'Block',
    label: 'Put the block in the day',
    props: [
      ['projectId', 'projectId'], ['date', 'date'], ['what', 'what'], ['planned', 'planned'],
      ['actual', 'empty'], ['done', 'done'], ['isMove', 'isMove'], ['todoTaskId', 'empty'], ['position', 'position']
    ]
  }
});

/**
 * R23 — what the block sheet writes about the block itself: whose it is, what it is, the hours
 * it is planned at and its day. Changing the project changes the block's colour and the envelope
 * it counts in; changing the day moves it between columns (R2.4-6). The time that went into it
 * is not this command's: that is `Add time`, which the page runs straight after this one.
 */
const SAVE_BLOCK = command({
  path: 'Commands/Save block',
  description: 'Saves what a block is: which project, what it is, the hours it is planned at, and which day.',
  ins: [['blockId', 'string'], ['projectId', 'string'], ['what', 'string'], ['planned', 'number'], ['date', 'string']],
  guard: `${PLANNER_FNS}var id = String(Inputs.blockId || '');
var pid = String(Inputs.projectId || '');
var what = String(Inputs.what || '').trim();
var date = String(Inputs.date || '');
var planned = q(num(Inputs.planned, 0));
// A block with no words, no project, no day or no hours is not a block — Add block refuses one
// too, and blanking a field here would quietly erase the line the week draws.
if (id === '' || pid === '' || what === '' || !parseDay(date) || planned <= 0) return;
Outputs.projectId = pid;
Outputs.what = what;
Outputs.planned = planned;
Outputs.date = date;
Outputs.go();`,
  guardIns: ['blockId', 'projectId', 'what', 'planned', 'date'],
  write: {
    kind: 'update',
    collection: 'Block',
    label: 'Save what the block is',
    props: [['projectId', 'projectId'], ['what', 'what'], ['planned', 'planned'], ['date', 'date']],
    idFromInput: 'blockId'
  }
});

/**
 * **R22 — time is logged in entries.** *Add time* appends one sitting — `{ day, hours, note }` —
 * and `actual` becomes the sum of them, kept as a column so every `hoursOf` reader is unchanged.
 * *Done* is its own decision, read from the checkbox, and it is **off** unless the person ticks it.
 *
 * 🔴 **An empty box is still "as long as it was meant to".** No entries and *Done* ticked writes
 * `actual` as it already was — `''` for a block nobody measured, so `hoursOf` reads the plan —
 * and never a number nobody measured. A block logged before R22 keeps the hours it was logged at.
 */
const ADD_TIME = command({
  path: 'Commands/Add time',
  description: 'Logs a sitting against a block — how long, and what you did — and says whether the block is now done.',
  ins: [['blockId', 'string'], ['entries', 'array'], ['actual', '*'], ['hours', 'number'], ['note', 'string'], ['day', 'string'], ['logged', 'boolean']],
  guard: `${PLANNER_FNS}var id = String(Inputs.blockId || '');
if (id === '') return;
var list = [];
var before = entriesOf({ entries: Inputs.entries });
for (var i = 0; i < before.length; i++) list.push({ day: String(before[i].day || ''), hours: q(before[i].hours), note: String(before[i].note || '') });
var h = q(num(Inputs.hours, 0));
var day = parseDay(Inputs.day) ? String(Inputs.day) : dayKey(startOfToday());
if (h > 0) list.push({ day: day, hours: h, note: String(Inputs.note || '').trim() });
var done = Inputs.logged === true;
var total = 0;
for (var j = 0; j < list.length; j++) total += list[j].hours;
var was = Inputs.actual;
Outputs.entries = list;
Outputs.actual = list.length ? q(total) : (done && was !== null && was !== undefined && was !== '' && isFinite(Number(was)) ? q(was) : '');
Outputs.done = done;
Outputs.go();`,
  guardIns: ['blockId', 'entries', 'actual', 'hours', 'note', 'day', 'logged'],
  write: {
    kind: 'update',
    collection: 'Block',
    label: 'Log the time',
    props: [['entries', 'entries'], ['actual', 'actual'], ['done', 'done']],
    idFromInput: 'blockId'
  }
});

/** AC6 — carrying moves the block. Nothing is copied, so tomorrow's total changes at once. */
const CARRY_BLOCK = command({
  path: 'Commands/Carry block',
  description: 'Moves a block that did not get done to the next day.',
  ins: [['blockId', 'string'], ['date', 'string']],
  guard: `${PLANNER_FNS}var id = String(Inputs.blockId || '');
var date = String(Inputs.date || '');
if (id === '' || !parseDay(date)) return;
Outputs.date = date;
Outputs.go();`,
  guardIns: ['blockId', 'date'],
  write: {
    kind: 'update',
    collection: 'Block',
    label: 'Move it to tomorrow',
    props: [['date', 'date']],
    idFromInput: 'blockId'
  }
});

/**
 * AC6's other half — dropping deletes the block and nothing else changes.
 *
 * 🔴 **`Block` is the only collection in this template a person can delete**, and this is the
 * only component that asks. Everything else is `delete: "nobody"` in the policy, so a mistake
 * here cannot take a project, a month's plan or the settings with it.
 */
const DROP_BLOCK = command({
  path: 'Commands/Drop block',
  description: 'Drops a block you are not going to do. The block goes; nothing else does.',
  ins: [['blockId', 'string']],
  guard: `var id = String(Inputs.blockId || '');
if (id === '') return;
Outputs.go();`,
  guardIns: ['blockId'],
  write: { kind: 'delete', collection: 'Block', label: 'Drop it', idFromInput: 'blockId' }
});

/**
 * R7 and AC3 — a chip becomes **half an hour in the first day that has room under the
 * ceiling**. Half an hour, because the point of the strip is that a move is small: the whole
 * argument for sending the email is that it costs thirty minutes.
 *
 * R7b — the card's move box sends the day and the hours the person chose. Nothing sent for the
 * hours is the chip's half hour; hours sent that are not more than nought are refused, not rounded
 * up to a half hour nobody asked for.
 */
const PLACE_MOVE = command({
  path: 'Commands/Place move',
  description: 'Puts a project’s next move in the week: on the day and for the hours chosen, or 30 minutes in the first day with room under the focus ceiling.',
  ins: [['projectId', 'string'], ['move', 'string'], ['date', 'string'], ['planned', '*'], ['placed', 'boolean']],
  guard: `${PLANNER_FNS}var pid = String(Inputs.projectId || '');
var move = String(Inputs.move || '').trim();
var date = String(Inputs.date || '');
// Pressing a placed chip opens the card; it never writes a second block (AC3).
if (pid === '' || move === '' || !parseDay(date) || Inputs.placed === true) return;
var given = Inputs.planned;
var planned = given === undefined || given === null || String(given).trim() === '' ? 0.5 : q(num(given, 0));
if (planned <= 0) return;
Outputs.projectId = pid;
Outputs.what = move;
Outputs.date = date;
Outputs.planned = planned;
Outputs.done = false;
Outputs.isMove = true;
Outputs.empty = '';
Outputs.position = Date.now();
Outputs.go();`,
  guardIns: ['projectId', 'move', 'date', 'planned', 'placed'],
  extraOuts: [['blockId', 'string']],
  write: {
    kind: 'create',
    collection: 'Block',
    label: 'Put the move in the week',
    props: [
      ['projectId', 'projectId'], ['date', 'date'], ['what', 'what'], ['planned', 'planned'],
      ['actual', 'empty'], ['done', 'done'], ['isMove', 'isMove'], ['todoTaskId', 'empty'], ['position', 'position']
    ]
  },
  // The page outlines the block that was just written, so a chip press is visibly a block.
  extraWires: (p) => [wire(`${p}Write`, 'id', `${p}Out`, 'blockId')]
});

/**
 * R7b, R2.3-2 — *Move it* changes the move block's day and nothing else. The same shape as
 * `Carry block`, kept apart because carrying is always to tomorrow and this is to any day from
 * today on: a move put in the past would stop being placed (R7c) the moment it was written.
 */
const MOVE_BLOCK = command({
  path: 'Commands/Move block',
  description: 'Moves a block to another day, from today on. Only its day changes.',
  ins: [['blockId', 'string'], ['date', 'string'], ['from', 'string']],
  guard: `${PLANNER_FNS}var id = String(Inputs.blockId || '');
var date = String(Inputs.date || '');
var d = parseDay(date);
if (id === '' || !d || d.getTime() < startOfToday().getTime() || date === String(Inputs.from || '')) return;
Outputs.date = date;
Outputs.go();`,
  guardIns: ['blockId', 'date', 'from'],
  write: {
    kind: 'update',
    collection: 'Block',
    label: 'Move it to that day',
    props: [['date', 'date']],
    idFromInput: 'blockId'
  }
});

/**
 * The fields a person types into a project, checked the same way whether it is new or not —
 * so a project born in the editor and one changed in it can never disagree about what a
 * kind is or what an empty due date means.
 */
const PROJECT_GUARD = `var name = String(Inputs.name || '').trim();
if (name === '') return;
var kind = String(Inputs.kind || 'earning');
var known = ['earning', 'building', 'hobby', 'dormant', 'admin'];
if (known.indexOf(kind) < 0) kind = 'earning';
var due = String(Inputs.moveDue || '');
Outputs.name = name;
Outputs.sub = String(Inputs.sub || '').trim();
Outputs.kind = kind;
Outputs.rate = Math.max(0, num(Inputs.rate, 0));
Outputs.slot = String(Inputs.slot || '').trim();
Outputs.rung = String(Inputs.rung || '').trim();
Outputs.move = String(Inputs.move || '').trim();
Outputs.moveWorth = String(Inputs.moveWorth || '').trim();
Outputs.moveWhen = String(Inputs.moveWhen || '').trim();
Outputs.moveDue = parseDay(due) ? due : '';
Outputs.moveStop = Inputs.moveStop === true;
Outputs.say = String(Inputs.say || '').trim();`;

const PROJECT_INS: Array<[string, string]> = [
  ['name', 'string'], ['sub', 'string'], ['kind', 'string'], ['rate', 'number'], ['slot', 'string'], ['rung', 'string'],
  ['move', 'string'], ['moveWorth', 'string'], ['moveWhen', 'string'], ['moveDue', 'string'], ['moveStop', 'boolean'], ['say', 'string']
];
const PROJECT_PROPS: Array<[string, string]> = PROJECT_INS.map(([n]) => [n, n]);

/** R2.4-1 — a project is born in the editor, with its first move if it has one. */
const ADD_PROJECT = command({
  path: 'Commands/Add project',
  description: 'Adds a project: what it is called, what kind of work it is, its rate, and its first move.',
  ins: PROJECT_INS,
  guard: `${PLANNER_FNS}${PROJECT_GUARD}
Outputs.position = Date.now();
Outputs.go();`,
  guardIns: PROJECT_INS.map(([n]) => n),
  extraOuts: [['projectId', 'string']],
  write: {
    kind: 'create',
    collection: 'Project',
    label: 'Add the project',
    props: [...PROJECT_PROPS, ['position', 'position']]
  },
  // The card opens on the project it just made.
  extraWires: (p) => [wire(`${p}Write`, 'id', `${p}Out`, 'projectId')]
});

/**
 * R9 lives in this command's `moveStop`. A building asset that is finished is edited to *"fixes
 * only"*, and from then on it is off the moves strip and its card has no button to spend more
 * hours on it — which is the mechanism behind *"Done is done."*
 */
const EDIT_PROJECT = command({
  path: 'Commands/Edit project',
  description: 'Changes a project: its name, what kind of work it is, its rate, and what its next move is.',
  ins: [['projectId', 'string'], ...PROJECT_INS],
  guard: `${PLANNER_FNS}if (String(Inputs.projectId || '') === '') return;
${PROJECT_GUARD}
Outputs.go();`,
  guardIns: ['projectId', ...PROJECT_INS.map(([n]) => n)],
  write: {
    kind: 'update',
    collection: 'Project',
    label: 'Change the project',
    props: PROJECT_PROPS,
    idFromInput: 'projectId'
  }
});

/**
 * Q3 — the month's plan is written by pressing *Plan this month*, never automatically on the
 * 1st, and the week says so until it exists. A plan that appeared by itself would be a budget
 * nobody agreed to, which is the opposite of giving every hour a job (R4).
 */
const SET_MONTH_PLAN = command({
  path: 'Commands/Set month plan',
  description: 'Writes this month’s plan: what each envelope gets, how many working days there are, and what the balance starts at.',
  ins: [
    ['month', 'string'], ['billable', 'number'], ['building', 'number'], ['admin', 'number'],
    ['hobby', 'number'], ['workingDays', 'number'], ['openingBalance', 'number']
  ],
  guard: `${PLANNER_FNS}var month = String(Inputs.month || '');
if (!/^\\d{4}-\\d{2}$/.test(month)) return;
Outputs.month = month;
Outputs.billable = q(num(Inputs.billable, 0));
Outputs.building = q(num(Inputs.building, 0));
Outputs.admin = q(num(Inputs.admin, 12));
// R4 — Hobby is budgeted at zero on purpose, and going over it is reported, never flagged.
Outputs.hobby = q(num(Inputs.hobby, 0));
Outputs.workingDays = Math.max(1, Math.round(num(Inputs.workingDays, 22)));
Outputs.openingBalance = num(Inputs.openingBalance, 0);
Outputs.go();`,
  guardIns: ['month', 'billable', 'building', 'admin', 'hobby', 'workingDays', 'openingBalance'],
  write: {
    kind: 'create',
    collection: 'MonthPlan',
    label: 'Write this month’s plan',
    props: [
      ['month', 'month'], ['billable', 'billable'], ['building', 'building'], ['admin', 'admin'],
      ['hobby', 'hobby'], ['workingDays', 'workingDays'], ['openingBalance', 'openingBalance']
    ]
  }
});

/**
 * A money event as typed: a cost is money leaving whichever sign was typed, money in is money
 * arriving, and a note (*"Invoices go out"*) keeps what it was given, usually nothing. Before R2.4
 * the seed wrote `in` and `note` where this command wrote `income` and `invoice-out`, so the two
 * old spellings are read as the new ones rather than turned into a cost.
 */
const CASH_GUARD = `var date = String(Inputs.date || '');
var label = String(Inputs.label || '').trim();
var amount = num(Inputs.amount, NaN);
if (!parseDay(date) || label === '' || !isFinite(amount)) return;
var kind = String(Inputs.kind || 'cost');
if (kind === 'in') kind = 'income';
if (kind === 'note') kind = 'invoice-out';
var known = ['income', 'cost', 'invoice-out', 'invoice-due'];
if (known.indexOf(kind) < 0) kind = 'cost';
if (kind === 'cost') amount = -Math.abs(amount);
if (kind === 'income' || kind === 'invoice-due') amount = Math.abs(amount);
Outputs.date = date;
Outputs.amount = amount;
Outputs.label = label;
Outputs.kind = kind;
Outputs.recurring = Inputs.monthly === true ? 'monthly' : '';`;

const CASH_EVENT_INS: Array<[string, string]> = [['date', 'string'], ['amount', 'number'], ['label', 'string'], ['kind', 'string'], ['monthly', 'boolean']];
const CASH_EVENT_PROPS: Array<[string, string]> = [['date', 'date'], ['amount', 'amount'], ['label', 'label'], ['kind', 'kind'], ['recurring', 'recurring']];

const ADD_CASH_EVENT = command({
  path: 'Commands/Add cash event',
  description: 'Adds something that happens to the money: when, how much, what it is, and whether it happens every month.',
  ins: CASH_EVENT_INS,
  guard: `${PLANNER_FNS}${CASH_GUARD}
Outputs.go();`,
  guardIns: CASH_EVENT_INS.map(([n]) => n),
  write: { kind: 'create', collection: 'CashEvent', label: 'Add the event', props: CASH_EVENT_PROPS }
});

/** R2.4-7 — editing an amount changes every running balance after it, because the strip is read, not stored. */
const EDIT_CASH_EVENT = command({
  path: 'Commands/Edit cash event',
  description: 'Changes something that happens to the money: when, how much, what it is, or whether it happens every month.',
  ins: [['cashId', 'string'], ...CASH_EVENT_INS],
  guard: `${PLANNER_FNS}if (String(Inputs.cashId || '') === '') return;
${CASH_GUARD}
Outputs.go();`,
  guardIns: ['cashId', ...CASH_EVENT_INS.map(([n]) => n)],
  write: { kind: 'update', collection: 'CashEvent', label: 'Change the event', props: CASH_EVENT_PROPS, idFromInput: 'cashId' }
});

/**
 * 🔴 **The only command that writes real money.** §2: `Settings` is the one collection whose
 * fields are a person's actual rate and actual household number, which is why the template
 * ships with invented ones and the hosted app is the only place the real ones exist.
 */
const EDIT_SETTINGS = command({
  path: 'Commands/Edit settings',
  description: 'Saves the numbers the whole week is worked out from: your rate, what the household needs, what your partner brings, and the days money moves.',
  ins: [
    ['settingsId', 'string'], ['rate', 'number'], ['householdNeed', 'number'], ['partnerIncome', 'number'],
    ['focusHours', 'number'], ['partnerDay', 'number'], ['costsDay', 'number'], ['invoiceDay', 'number'], ['paymentTermsDays', 'number']
  ],
  guard: `${PLANNER_FNS}var id = String(Inputs.settingsId || '');
if (id === '') return;
function day(v, fallback) { var n = Math.round(num(v, fallback)); return n < 1 ? fallback : n > 28 ? 28 : n; }
Outputs.rate = Math.max(0, num(Inputs.rate, 0));
Outputs.householdNeed = Math.max(0, num(Inputs.householdNeed, 0));
Outputs.partnerIncome = Math.max(0, num(Inputs.partnerIncome, 0));
// R3 — the ceiling is what makes the plan honest, so it cannot be set to nothing.
Outputs.focusHours = Math.min(16, Math.max(1, num(Inputs.focusHours, 6)));
Outputs.partnerDay = day(Inputs.partnerDay, 28);
Outputs.costsDay = day(Inputs.costsDay, 1);
Outputs.invoiceDay = day(Inputs.invoiceDay, 28);
Outputs.paymentTermsDays = Math.min(90, Math.max(0, Math.round(num(Inputs.paymentTermsDays, 7))));
Outputs.go();`,
  guardIns: ['settingsId', 'rate', 'householdNeed', 'partnerIncome', 'focusHours', 'partnerDay', 'costsDay', 'invoiceDay', 'paymentTermsDays'],
  write: {
    kind: 'update',
    collection: 'Settings',
    label: 'Save the settings',
    props: [
      ['rate', 'rate'], ['householdNeed', 'householdNeed'], ['partnerIncome', 'partnerIncome'], ['focusHours', 'focusHours'],
      ['partnerDay', 'partnerDay'], ['costsDay', 'costsDay'], ['invoiceDay', 'invoiceDay'], ['paymentTermsDays', 'paymentTermsDays']
    ],
    idFromInput: 'settingsId'
  }
});

// ════════════════════════════════════════════════════════════════════════════
// The pages
// ════════════════════════════════════════════════════════════════════════════


const APP_BAR_FIELDS: Array<[string, string]> = [['weekLabel', 'string']];

/**
 * The top line: what this is, which week, and the four things you can press.
 *
 * Its own component because `Pages/Week` was 63 nodes and the door's advice is the right
 * advice — *"a page reads best as a handful of section instances"*. The page is now the
 * week and the things over it, and the bar is somewhere else.
 */
const APP_BAR: Tpl010Component = {
  path: 'Week/App bar',
  description: 'The top line: the app’s name, which week is on screen with an arrow either side, and the buttons for projects, settings, theme, shutting down and signing out.',
  ...iface(APP_BAR_FIELDS, [
    ['previousWeek', 'signal'], ['nextWeek', 'signal'], ['openProjects', 'signal'],
    ['openSettings', 'signal'], ['shutDown', 'signal'], ['signOut', 'signal']
  ]),
  instantiates: [C.themeSwitch],
  nodes: [
    inputs('abIn', 'Which week', APP_BAR_FIELDS),
    outputs('abOut', 'What was pressed', [
      ['previousWeek', 'signal'], ['nextWeek', 'signal'], ['openProjects', 'signal'],
      ['openSettings', 'signal'], ['shutDown', 'signal'], ['signOut', 'signal']
    ]),
    group('abRoot', 'App bar', undefined, {
      ...ROW('var(--space-3)'),
      justifyContent: 'space-between',
      cssClassName: 'planner-appbar'
    }),
    text('abTitle', 'App name', 'abRoot', 'Envelopes', { ...T_TITLE, sizeMode: 'contentSize', as: 'h1' }),
    group('abNav', 'Which week', 'abRoot', ROW_TIGHT('var(--space-1)')),
    place('abPrev', BUTTON, 'The week before', 'abNav', BTN_ICON('icon-chevron-left', 'Previous week')),
    text('abWeekLabel', 'The week on screen', 'abNav', '', { ...T_NUM, sizeMode: 'contentSize', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }),
    place('abNext', BUTTON, 'The week after', 'abNav', BTN_ICON('icon-chevron-right', 'Next week')),
    group('abRight', 'Buttons', 'abRoot', ROW_TIGHT('var(--space-2)')),
    place('abProjects', BUTTON, 'Open the projects', 'abRight', { ...BTN_GHOST, label: 'Projects' }),
    place('abSettings', BUTTON, 'Open the settings', 'abRight', BTN_ICON('icon-settings', 'Settings')),
    place('abTheme', C.themeSwitch, 'Light or dark', 'abRight'),
    place('abShut', BUTTON, 'Shut down for today', 'abRight', { ...BTN_PRIMARY, label: 'Shut down' }),
    place('abSignOut', BUTTON, 'Sign out', 'abRight', { ...BTN_GHOST, label: 'Sign out' })
  ],
  connections: [
    wire('abIn', 'weekLabel', 'abWeekLabel', 'text'),
    wire('abPrev', 'onClick', 'abOut', 'previousWeek'),
    wire('abNext', 'onClick', 'abOut', 'nextWeek'),
    wire('abProjects', 'onClick', 'abOut', 'openProjects'),
    wire('abSettings', 'onClick', 'abOut', 'openSettings'),
    wire('abShut', 'onClick', 'abOut', 'shutDown'),
    wire('abSignOut', 'onClick', 'abOut', 'signOut')
  ]
};

/**
 * R5 — **the only main view.** Everything a person needs on a Monday morning is on this one
 * screen, above the fold, and the two things that are not (the projects, the evening) come
 * over the top of it rather than beside it.
 *
 * The page holds no arithmetic. It places the seven `Logic/` components, hands each one what
 * it needs, and wires every button to its command — so the question *"where does this number
 * come from?"* always has exactly one answer, and it is never "the page".
 *
 * ## The two routed presses
 *
 * A block's tick and a chip's press both mean two different things depending on what is
 * already true, and both are routed by a `Condition` rather than by a script that guesses:
 *
 * - **the tick** — a done block unlogs, a not-done block logs;
 * - **the chip** — a placed move opens the card, an unplaced one writes half an hour (AC3).
 */
const PAGE_WEEK: Tpl010Component = {
  path: 'Pages/Week',
  description: 'The week: the envelopes, the moves, six days of blocks and the cash strip, with the projects card and the evening drawer over the top of it.',
  instantiates: [
    C.appBar, C.envelopeTile, C.movesStrip, C.dayColumn, C.cashStrip, C.projectCard, C.shutdownDrawer, C.settingsSheet,
    C.blockSheet, C.dayPicker,
    C.plannerData, C.envelopes, C.dayColumns, C.moves, C.cashLine, C.shutdown, '/Logic/Card rows',
    C.addBlock, C.saveBlock, C.addTime, C.carryBlock, C.dropBlock, C.placeMove, C.moveBlock,
    C.addProject, C.editProject, C.setMonthPlan, C.addCashEvent, C.editCashEvent, C.editSettings
  ],
  repeats: { source: 'array', rowFields: ENVELOPE_TILE_FIELDS.map(([n]) => n) },
  nodes: [
    { id: 'twPage', type: 'Page', label: 'Week', parameters: { title: 'Envelopes', urlPath: '' } },
    group('twRoot', 'Page', 'twPage', {
      ...COLUMN('var(--space-2-5)'),
      ...pinnedAs('planner-page'),
      paddingTop: 'var(--space-3)',
      paddingBottom: 'var(--space-3)',
      paddingLeft: 'var(--space-4)',
      paddingRight: 'var(--space-4)'
    }),

    // ── The app bar ──
    place('twBar', C.appBar, 'The top line', 'twRoot'),

    text('twProblem', 'When something did not save', 'twRoot', '', { ...wide(T_ERROR), mounted: false }),
    text('twPlanLine', 'Whether this month is planned', 'twRoot', '', wide(T_META)),

    // ── The four envelopes ──
    group('twEnvs', 'The envelopes', 'twRoot', { ...ROW('var(--space-2)'), ...pinnedAs('planner-envs'), alignItems: 'stretch' }),
    place('twEnvEach', FOR_EACH, 'One tile per envelope', 'twEnvs', { template: C.envelopeTile, templateType: 'explicit' }),

    // ── The moves, the week, the money ──
    place('twMoves', C.movesStrip, 'The moves', 'twRoot'),
    place('twPicker', C.dayPicker, 'Which day, on a phone', 'twRoot'),
    group('twWeekRow', 'The six days', 'twRoot', { ...ROW('var(--space-0)'), ...pinnedAs('planner-week'), ...CARD, alignItems: 'stretch' }),
    place('twDayEach', FOR_EACH, 'One column per day', 'twWeekRow', { template: C.dayColumn, templateType: 'explicit' }),
    place('twCash', C.cashStrip, 'The money', 'twRoot'),

    // ── Over the top of it ──
    place('twCard', C.projectCard, 'The projects', 'twRoot'),
    place('twDrawer', C.shutdownDrawer, 'The evening', 'twRoot'),
    place('twSheet', C.settingsSheet, 'The settings', 'twRoot'),
    place('twLog', C.blockSheet, 'One block, and the time on it', 'twRoot'),

    // ── Who you are ──
    logic('twUser', 'net.noodl.user.User', 'Who is signed in'),
    logic('twAuth', CONDITION, 'Signed in?', signalOnly('condition')),
    logic('twToSignIn', 'RouterNavigate', 'Go to sign in', { router: ROUTER, target: C.pageSignIn }),
    logic('twLogOut', 'net.noodl.user.LogOut', 'Sign out'),

    // ── The records, and everything worked out from them ──
    logic('twData', C.plannerData, 'Your week, from the backend'),
    logic('twEnv', C.envelopes, 'The envelopes'),
    logic('twDays', C.dayColumns, 'The six columns'),
    logic('twMovesLogic', C.moves, 'The moves, by urgency'),
    logic('twCashLogic', C.cashLine, 'The money'),
    logic('twShutLogic', C.shutdown, 'What tonight says'),
    logic('twCardRows', '/Logic/Card rows', 'The projects card'),

    // ── What is open ──
    logic('twVarCard', VARIABLE, 'Which project the card is showing', { name: VAR.cardProject }),
    /**
     * 🔴 **One Set Variable per way in.** These were one ‘Show a project’ fed by five sources, and
     * the Projects button reached it through a Function that said ‘*’ — which publishes only when
     * the value CHANGES, so the button opened the card once per page load and never again (driven,
     * R2.3; the same on the build before it). A shared ‘value’ is also whichever source spoke
     * last: a chip pressed twice could open the project picked in the list in between. Each way in
     * now has its own node, fed by nothing but itself.
     */
    logic('twCardFromBlock', SET_VARIABLE, 'Show the block’s project', { name: VAR.cardProject, setWith: 'string' }),
    logic('twCardFromChip', SET_VARIABLE, 'Show the chip’s project', { name: VAR.cardProject, setWith: 'string' }),
    logic('twCardAll', SET_VARIABLE, 'Open the card on no project in particular', { name: VAR.cardProject, setWith: 'string', value: '*' }),
    logic('twCardPick', SET_VARIABLE, 'Show the project picked in the list', { name: VAR.cardProject, setWith: 'string' }),
    logic('twCardNew', SET_VARIABLE, 'Show the project just made', { name: VAR.cardProject, setWith: 'string' }),
    logic('twClearCard', SET_VARIABLE, 'Close the card', { name: VAR.cardProject, setWith: 'string', value: '' }),
    derive('twCardShown', 'Is the card open?', "Outputs.shown = String(Inputs.id || '') !== '';"),

    logic('twVarDrawer', VARIABLE, 'Is the evening drawer open?', { name: VAR.drawerOpen }),
    logic('twOpenDrawer', SET_VARIABLE, 'Open the drawer', { name: VAR.drawerOpen, setWith: 'boolean', value: true }),
    logic('twCloseDrawer', SET_VARIABLE, 'Close the drawer', { name: VAR.drawerOpen, setWith: 'boolean', value: false }),

    logic('twVarPhoneDay', VARIABLE, 'Which day the phone is showing', { name: VAR.phoneDay }),
    logic('twSetPhoneDay', SET_VARIABLE, 'Show that day on the phone', { name: VAR.phoneDay, setWith: 'string' }),

    logic('twVarLog', VARIABLE, 'Which block the sheet is showing', { name: VAR.logBlock }),
    logic('twSetLog', SET_VARIABLE, 'Open the sheet on a block', { name: VAR.logBlock, setWith: 'string' }),
    logic('twClearLog', SET_VARIABLE, 'Close the sheet', { name: VAR.logBlock, setWith: 'string', value: '' }),
    logic('twVarMode', VARIABLE, 'How the sheet was opened', { name: VAR.logMode }),
    logic('twModeTick', SET_VARIABLE, 'Opened by the tick', { name: VAR.logMode, setWith: 'string', value: 'tick' }),
    logic('twModeWords', SET_VARIABLE, 'Opened by the words or the hours', { name: VAR.logMode, setWith: 'string', value: '' }),
    logic('twVarNewDay', VARIABLE, 'Which day a new block goes in', { name: VAR.newDay }),
    logic('twSetNewDay', SET_VARIABLE, 'Start a new block on a day', { name: VAR.newDay, setWith: 'string' }),
    logic('twClearNewDay', SET_VARIABLE, 'Stop making a new block', { name: VAR.newDay, setWith: 'string', value: '' }),

    /**
     * R23 — the block sheet is filled from the block itself, looked up by id, so it always opens
     * on what is actually stored rather than on whatever the last press left behind. With no
     * block and a day, it is a new block on that day.
     */
    derive(
      'twSheetRow',
      'What the block sheet is showing',
      `${PLANNER_FNS}var id = String(Inputs.id || '');
var newDay = String(Inputs.newDay || '');
var blocks = Inputs.blocks || [];
var projects = Inputs.projects || [];
var items = [];
for (var k = 0; k < projects.length; k++) if (projects[k]) items.push({ Label: String(projects[k].name || ''), Value: String(projects[k].id) });
Outputs.projects = items;
var b = null;
if (id !== '') for (var i = 0; i < blocks.length; i++) if (blocks[i] && blocks[i].id === id) { b = blocks[i]; break; }
function longDay(s) {
  var d = parseDay(s);
  return d ? DOW_LONG[(d.getDay() + 6) % 7] + ' ' + d.getDate() + ' ' + MON[d.getMonth()] : String(s || '');
}
if (!b && !parseDay(newDay)) {
  // Closed. The sheet clears its own boxes as it closes (Week/Block sheet), so these are only
  // what a closed sheet holds.
  Outputs.shown = false;
  Outputs.isNew = false;
  Outputs.timeShown = false;
  Outputs.title = '';
  Outputs.projectId = '';
  Outputs.what = '';
  Outputs.planned = '';
  Outputs.date = '';
  Outputs.loggedLine = '';
  Outputs.entries = [];
  Outputs.hours = '';
  Outputs.note = '';
  Outputs.done = false;
  Outputs.saveLabel = 'Save';
  Outputs.before = [];
  Outputs.actual = '';
  return;
}
if (!b) {
  Outputs.shown = true;
  Outputs.isNew = true;
  Outputs.timeShown = false;
  Outputs.title = 'New block · ' + longDay(newDay);
  Outputs.projectId = '';
  Outputs.what = '';
  Outputs.planned = '1';
  Outputs.date = newDay;
  Outputs.loggedLine = '';
  Outputs.entries = [];
  Outputs.hours = '';
  Outputs.note = '';
  Outputs.done = false;
  Outputs.saveLabel = 'Put it in the day';
  Outputs.before = [];
  Outputs.actual = '';
  return;
}
var p = null;
for (var j = 0; j < projects.length; j++) if (projects[j] && projects[j].id === b.projectId) { p = projects[j]; break; }
var planned = num(b.planned, 0);
var list = entriesOf(b);
var logged = loggedOf(b);
var tick = String(Inputs.mode || '') === 'tick';
var rows = [];
for (var e = 0; e < list.length; e++) {
  var ed = parseDay(list[e].day);
  rows.push({
    dayText: ed ? DOW[(ed.getDay() + 6) % 7] + ' ' + ed.getDate() + ' ' + MON[ed.getMonth()] : '',
    hoursText: hText(list[e].hours) + ' h',
    note: String(list[e].note || '')
  });
}
Outputs.shown = true;
Outputs.isNew = false;
Outputs.timeShown = true;
Outputs.title = (p ? String(p.name || '') : 'This block') + ' · ' + longDay(b.date);
Outputs.projectId = String(b.projectId || '');
Outputs.what = String(b.what || '');
Outputs.planned = String(q(planned));
Outputs.date = String(b.date || '');
Outputs.entries = rows;
Outputs.before = list;
Outputs.actual = b.actual === null || b.actual === undefined ? '' : b.actual;
// R16a — the tick opens this with Done ticked and what is left of the plan already in the box,
// so "it took as long as it was meant to" is two presses and the hours are stated, not assumed.
var left = q(Math.max(0, planned - logged));
Outputs.hours = tick && !b.done && left > 0 ? String(left) : '';
Outputs.note = '';
Outputs.done = b.done === true || tick;
if (b.done && list.length === 0) Outputs.loggedLine = 'Done, at ' + hText(hoursOf(b)) + ' h.';
else if (list.length > 0) Outputs.loggedLine = hText(logged) + ' of ' + hText(planned) + ' h logged' + (b.done ? ', and done.' : '. It stays open until Done is ticked.');
else Outputs.loggedLine = 'Nothing logged on it yet.';
Outputs.saveLabel = 'Save';`
    ),

    logic('twVarEdit', VARIABLE, 'What the card’s right-hand pane is showing', { name: VAR.cardEdit }),
    logic('twEditOn', SET_VARIABLE, 'Edit the project', { name: VAR.cardEdit, setWith: 'string', value: 'edit' }),
    logic('twEditNew', SET_VARIABLE, 'Start a new project', { name: VAR.cardEdit, setWith: 'string', value: 'new' }),
    logic('twEditOff', SET_VARIABLE, 'Stop editing', { name: VAR.cardEdit, setWith: 'string', value: '' }),

    /** R23 — the project editor, filled from the project the card is showing, or empty for a new one. */
    derive(
      'twEditRow',
      'What the project editor is showing',
      `${PLANNER_FNS}var mode = String(Inputs.mode || '');
var id = String(Inputs.id || '');
var projects = Inputs.projects || [];
Outputs.kinds = [
  { Label: 'Billable: a client who pays', Value: 'earning' },
  { Label: 'Building: pays later, if it lands', Value: 'building' },
  { Label: 'Hobby', Value: 'hobby' },
  { Label: 'Dormant: a client worth a nudge', Value: 'dormant' },
  { Label: 'Admin', Value: 'admin' }
];
var p = null;
for (var i = 0; i < projects.length; i++) if (projects[i] && projects[i].id === id) { p = projects[i]; break; }
var editing = mode === 'new' || (mode === 'edit' && !!p);
Outputs.editing = editing;
Outputs.detailShown = !editing;
Outputs.isNew = mode === 'new';
// 🔴 Every output spelled out as Outputs.<name>: the door declares a Function's ports by reading
// the script, and a port written as Outputs[name] is a port nobody declared — the wire into
// the editor is kept, and the deploy reports it as going nowhere.
if (!editing) {
  // Closed. The editor clears its own boxes as it closes (Week/Project editor).
  Outputs.name = '';
  Outputs.sub = '';
  Outputs.slot = '';
  Outputs.rung = '';
  Outputs.move = '';
  Outputs.moveWorth = '';
  Outputs.moveWhen = '';
  Outputs.say = '';
  Outputs.rate = '';
  Outputs.kind = '';
  Outputs.moveDue = '';
  Outputs.moveStop = false;
  Outputs.title = '';
  return;
}
var src = mode === 'new' ? {} : p;
function str(v) { return v === undefined || v === null ? '' : String(v); }
Outputs.name = str(src.name);
Outputs.sub = str(src.sub);
Outputs.slot = str(src.slot);
Outputs.rung = str(src.rung);
Outputs.move = str(src.move);
Outputs.moveWorth = str(src.moveWorth);
Outputs.moveWhen = str(src.moveWhen);
Outputs.say = str(src.say);
Outputs.rate = num(src.rate, 0) > 0 ? String(num(src.rate, 0)) : '';
Outputs.kind = String(src.kind || 'earning');
Outputs.moveDue = parseDay(src.moveDue) ? String(src.moveDue) : '';
Outputs.moveStop = src.moveStop === true;
Outputs.title = mode === 'new' ? 'New project' : 'Edit ' + String(p.name || 'the project');`
    ),

    logic('twVarCash', VARIABLE, 'Which money event is being edited', { name: VAR.cashEdit }),
    logic('twSetCash', SET_VARIABLE, 'Edit a money event', { name: VAR.cashEdit, setWith: 'string' }),
    logic('twCashNew', SET_VARIABLE, 'Start a new money event', { name: VAR.cashEdit, setWith: 'string', value: 'new' }),
    logic('twCashOff', SET_VARIABLE, 'Stop editing the money event', { name: VAR.cashEdit, setWith: 'string', value: '' }),

    /** R23 — the typed money events as a list, and the one being edited as a form. */
    derive(
      'twCashForm',
      'The money events, and the one being edited',
      `${PLANNER_FNS}var mode = String(Inputs.mode || '');
var events = Inputs.cashEvents || [];
Outputs.kinds = [
  { Label: 'Money in', Value: 'income' },
  { Label: 'Money out', Value: 'cost' },
  { Label: 'Invoices go out (a marker)', Value: 'invoice-out' },
  { Label: 'An invoice falls due', Value: 'invoice-due' }
];
function kindOf(k) { k = String(k || 'cost'); return k === 'in' ? 'income' : k === 'note' ? 'invoice-out' : k; }
var list = [];
for (var i = 0; i < events.length; i++) if (events[i]) list.push(events[i]);
list.sort(function (a, b) { return String(a.date || '') < String(b.date || '') ? -1 : String(a.date || '') > String(b.date || '') ? 1 : 0; });
var rows = [], found = null;
for (var r = 0; r < list.length; r++) {
  var e = list[r];
  var d = parseDay(e.date);
  var monthly = e.recurring === 'monthly';
  var amt = num(e.amount, 0);
  rows.push({
    id: e.id,
    whenText: d ? (monthly ? 'the ' + d.getDate() + (d.getDate() % 10 === 1 && d.getDate() !== 11 ? 'st' : d.getDate() % 10 === 2 && d.getDate() !== 12 ? 'nd' : d.getDate() % 10 === 3 && d.getDate() !== 13 ? 'rd' : 'th') : d.getDate() + ' ' + MON[d.getMonth()]) : '',
    label: String(e.label || ''),
    amountText: amt === 0 ? '—' : (amt > 0 ? '+' : '') + money(amt),
    repeatText: monthly ? 'Every month' : 'Once'
  });
  if (e.id === mode) found = e;
}
Outputs.rows = rows;
var open = mode === 'new' || !!found;
Outputs.formShown = open;
Outputs.isNew = mode === 'new';
Outputs.id = found ? String(found.id) : '';
if (!open) {
  Outputs.formTitle = '';
  Outputs.label = '';
  Outputs.amount = '';
  Outputs.date = '';
  Outputs.kind = '';
  Outputs.monthly = false;
  return;
}
if (!found) {
  Outputs.formTitle = 'A new money event';
  Outputs.label = '';
  Outputs.amount = '';
  Outputs.date = dayKey(startOfToday());
  Outputs.kind = 'cost';
  Outputs.monthly = false;
  return;
}
Outputs.formTitle = 'Change “' + String(found.label || '') + '”';
Outputs.label = String(found.label || '');
Outputs.amount = String(Math.abs(num(found.amount, 0)));
Outputs.date = String(found.date || '');
Outputs.kind = kindOf(found.kind);
Outputs.monthly = found.recurring === 'monthly';`
    ),

    logic('twVarSheet', VARIABLE, 'Is the settings sheet open?', { name: VAR.sheetOpen }),
    logic('twOpenSheet', SET_VARIABLE, 'Open the settings', { name: VAR.sheetOpen, setWith: 'boolean', value: true }),
    logic('twCloseSheet', SET_VARIABLE, 'Close the settings', { name: VAR.sheetOpen, setWith: 'boolean', value: false }),

    /**
     * 🔴 **Nothing is open until it is opened.** A variable nobody has set yet is `undefined`,
     * and `undefined` is not `false`: fed straight into `shown` it leaves the group at its own
     * default, which is mounted — so the app opened with the settings sheet AND the evening
     * drawer over the week, and the first render of this template was of neither. The card
     * never had the fault because it asks a Function whether its id is empty; these two now
     * ask the same kind of question, and the answer is a real boolean from the first frame.
     */
    derive('twDrawerShown', 'Is the drawer open?', 'Outputs.shown = Inputs.open === true;'),
    derive('twSheetShown', 'Is the settings sheet open?', 'Outputs.shown = Inputs.open === true;'),

    /**
     * AC7 — Escape closes whatever is over the week.
     *
     * 🔴 **There is no keyboard node in this product.** The catalogue has Event Sender and
     * Event Receiver and nothing that hears a key, so the only place a key press can be heard
     * is a Function — the route `Todo/Date picker` already takes for its own Escape. The
     * listener is hung on `document` and keyed on `window`, so re-running this (or the page
     * remounting) replaces it rather than stacking a second one on a dead `Outputs`.
     */
    script(
      'twKeys',
      'Escape closes what is over the week',
      `var fire = function (e) {
  if (e.key !== 'Escape' && e.key !== 'Esc') return;
  Outputs.escape();
};
if (window.__plannerEscape) document.removeEventListener('keydown', window.__plannerEscape);
window.__plannerEscape = fire;
document.addEventListener('keydown', fire);`,
      []
    ),

    logic('twVarProblem', VARIABLE, 'What did not save', { name: VAR.problem }),
    derive('twHasProblem', 'Is there a problem to show?', "Outputs.shown = String(Inputs.text || '') !== '';"),

    // ── The routed presses ──
    logic('twChip', CONDITION, 'Is that move already in the week?', signalOnly('condition')),
    logic('twIsNewBlock', CONDITION, 'Is the sheet making a new block?', signalOnly('condition')),
    logic('twIsNewProject', CONDITION, 'Is the editor making a new project?', signalOnly('condition')),
    logic('twIsNewCash', CONDITION, 'Is it a new money event?', signalOnly('condition')),

    /** The settings row, unpacked once for the sheet and for the commands that write it. */
    derive(
      'twSettings',
      'Your settings, unpacked',
      `${PLANNER_FNS}var s = (Inputs.settings || [])[0] || {};
Outputs.id = s.id || '';
Outputs.rate = String(num(s.rate, 0));
Outputs.householdNeed = String(num(s.householdNeed, 0));
Outputs.partnerIncome = String(num(s.partnerIncome, 0));
Outputs.focusHours = String(num(s.focusHours, 6));
Outputs.partnerDay = String(num(s.partnerDay, 28));
Outputs.costsDay = String(num(s.costsDay, 1));
Outputs.invoiceDay = String(num(s.invoiceDay, 28));
Outputs.paymentTermsDays = String(num(s.paymentTermsDays, 7));
Outputs.openingBalance = num(s.openingBalance, 0);`
    ),

    // ── The commands ──
    logic('cmdAddBlock', C.addBlock, 'Put a block in a day'),
    logic('cmdSave', C.saveBlock, 'Save what a block is'),
    logic('cmdTime', C.addTime, 'Log the time on a block'),
    logic('cmdCarry', C.carryBlock, 'Carry a block to tomorrow'),
    logic('cmdDrop', C.dropBlock, 'Drop a block'),
    logic('cmdPlace', C.placeMove, 'Put a move in the week'),
    // R7b — the card's move box has commands of its own, so a chip press can never send the card's
    // day, or the card's press the chip's.
    logic('cmdPlaceDay', C.placeMove, 'Put a move in the week on the day chosen'),
    logic('cmdMoveBlock', C.moveBlock, 'Move the move to another day'),
    logic('cmdTakeOut', C.dropBlock, 'Take the move out of the week'),
    logic('cmdAddProject', C.addProject, 'Add a project'),
    logic('cmdEditProject', C.editProject, 'Change a project'),
    logic('cmdMonthPlan', C.setMonthPlan, 'Plan this month'),
    logic('cmdCashEvent', C.addCashEvent, 'Add a cash event'),
    logic('cmdEditCash', C.editCashEvent, 'Change a cash event'),
    logic('cmdSettings', C.editSettings, 'Save the settings')
  ],
  connections: [
    // Signed in, or sent away.
    wire('twPage', 'didMount', 'twAuth', 'eval'),
    wire('twUser', 'authenticated', 'twAuth', 'condition'),
    // `thisWeek` is the whole first load: it sets the week, the window follows, and the
    // window asks for the rows. A second `refresh` here would only fetch the same five
    // queries twice.
    wire('twAuth', 'ontrue', 'twData', 'thisWeek'),
    wire('twPage', 'didMount', 'twKeys', 'run'),
    wire('twKeys', 'out-escape', 'twClearCard', 'do'),
    wire('twKeys', 'out-escape', 'twCloseDrawer', 'do'),
    wire('twKeys', 'out-escape', 'twCloseSheet', 'do'),
    wire('twKeys', 'out-escape', 'twClearLog', 'do'),
    wire('twKeys', 'out-escape', 'twClearNewDay', 'do'),
    wire('twKeys', 'out-escape', 'twEditOff', 'do'),
    wire('twKeys', 'out-escape', 'twCashOff', 'do'),
    wire('twAuth', 'onfalse', 'twToSignIn', 'navigate'),
    wire('twBar', 'signOut', 'twLogOut', 'login'),
    wire('twLogOut', 'done', 'twToSignIn', 'navigate'),

    // Which week (Q1).
    wire('twBar', 'previousWeek', 'twData', 'previousWeek'),
    wire('twBar', 'nextWeek', 'twData', 'nextWeek'),
    wire('twData', 'weekLabel', 'twBar', 'weekLabel'),

    // Everything is worked out from the same five arrays.
    ...(['projects', 'blocks', 'monthPlans', 'settings', 'weekStart'] as const).map((n) => wire('twData', n, 'twEnv', n)),
    ...(['projects', 'blocks', 'weekStart'] as const).map((n) => wire('twData', n, 'twDays', n)),
    ...(['projects', 'moveBlocks'] as const).map((n) => wire('twData', n, 'twMovesLogic', n)),
    ...(['projects', 'blocks', 'moveBlocks', 'weekStart'] as const).map((n) => wire('twData', n, 'twCardRows', n)),
    wire('twDays', 'firstOpenDay', 'twCardRows', 'firstOpenDay'),
    wire('twEnv', 'focusHours', 'twDays', 'focusHours'),
    wire('cmdPlace', 'blockId', 'twDays', 'newBlockId'),
    wire('twData', 'cashEvents', 'twCashLogic', 'cashEvents'),
    wire('twData', 'settings', 'twCashLogic', 'settings'),
    wire('twData', 'settings', 'twSettings', 'in-settings'),
    wire('twEnv', 'invoicedText', 'twCashLogic', 'invoicedText'),

    // The four tiles, the chips, the six columns, the money.
    wire('twEnv', 'rows', 'twEnvEach', 'items'),
    wire('twEnv', 'planLine', 'twPlanLine', 'text'),
    wire('twMovesLogic', 'rows', 'twMoves', 'rows'),
    wire('twMovesLogic', 'empty', 'twMoves', 'empty'),
    wire('twDays', 'columns', 'twDayEach', 'items'),
    wire('twCashLogic', 'rows', 'twCash', 'rows'),
    wire('twCashLogic', 'balanceText', 'twCash', 'balanceText'),
    wire('twCashLogic', 'termsText', 'twCash', 'termsText'),
    wire('twEnv', 'invoicedText', 'twCash', 'invoicedText'),

    // R16a — a block's tick opens the block sheet with Done ticked; it never logs by itself.
    wire('twDayEach', 'itemOutputSignal-toggle', 'twModeTick', 'do'),
    wire('twDayEach', 'itemOutputSignal-toggle', 'twClearNewDay', 'do'),
    wire('twDayEach', 'itemOutputSignal-toggle', 'twSetLog', 'do'),

    // A block's project name opens the card on that project (AC7).
    wire('twDayEach', 'itemOutput-projectId', 'twCardFromBlock', 'value'),
    wire('twDayEach', 'itemOutputSignal-openProject', 'twCardFromBlock', 'do'),

    // A chip: placed opens the card, unplaced writes half an hour (AC3).
    wire('twMoves', 'press', 'twChip', 'eval'),
    wire('twMoves', 'placed', 'twChip', 'condition'),
    wire('twMoves', 'projectId', 'twCardFromChip', 'value'),
    wire('twChip', 'ontrue', 'twCardFromChip', 'do'),
    wire('twMoves', 'projectId', 'cmdPlace', 'projectId'),
    wire('twMoves', 'move', 'cmdPlace', 'move'),
    wire('twMoves', 'placed', 'cmdPlace', 'placed'),
    wire('twDays', 'firstOpenDay', 'cmdPlace', 'date'),
    wire('twChip', 'onfalse', 'cmdPlace', 'do'),

    // The card.
    wire('twBar', 'openProjects', 'twCardAll', 'do'),
    wire('twVarCard', 'value', 'twCardRows', 'selectedId'),
    wire('twVarCard', 'value', 'twCardShown', 'in-id'),
    wire('twCardShown', 'out-shown', 'twCard', 'shown'),
    ...CARD_ROWS_OUTS.filter(([n]) => n !== 'resolvedId' && n !== 'placedBlockId').map(([n]) => wire('twCardRows', n, 'twCard', n)),
    wire('twCard', 'projectId', 'twCardPick', 'value'),
    wire('twCard', 'pick', 'twCardPick', 'do'),
    wire('twCard', 'pick', 'twEditOff', 'do'),
    wire('twCard', 'close', 'twClearCard', 'do'),
    wire('twCard', 'close', 'twEditOff', 'do'),

    // R23 — the project editor, in the card's right-hand pane.
    wire('twCard', 'edit', 'twEditOn', 'do'),
    wire('twCard', 'newProject', 'twEditNew', 'do'),
    wire('twCard', 'edCancel', 'twEditOff', 'do'),
    wire('twVarEdit', 'value', 'twEditRow', 'in-mode'),
    wire('twCardRows', 'resolvedId', 'twEditRow', 'in-id'),
    wire('twData', 'projects', 'twEditRow', 'in-projects'),
    wire('twEditRow', 'out-editing', 'twCard', 'edShown'),
    wire('twEditRow', 'out-detailShown', 'twCard', 'detailShown'),
    ...PROJECT_EDITOR_FIELDS.filter(([n]) => n !== 'shown').map(([n]) => wire('twEditRow', `out-${n}`, 'twCard', under('ed', n))),
    wire('twEditRow', 'out-isNew', 'twIsNewProject', 'condition'),
    wire('twCard', 'edSave', 'twIsNewProject', 'eval'),
    wire('twIsNewProject', 'ontrue', 'cmdAddProject', 'do'),
    wire('twIsNewProject', 'onfalse', 'cmdEditProject', 'do'),
    wire('twCardRows', 'resolvedId', 'cmdEditProject', 'projectId'),
    ...PROJECT_EDIT_VALUES.flatMap(([n]) => [wire('twCard', under('ed', n), 'cmdAddProject', n), wire('twCard', under('ed', n), 'cmdEditProject', n)]),
    // The card opens on the project it just made, and the form closes on the WRITE, not the press.
    wire('cmdAddProject', 'projectId', 'twCardNew', 'value'),
    wire('cmdAddProject', 'done', 'twCardNew', 'do'),
    wire('cmdAddProject', 'done', 'twEditOff', 'do'),
    wire('cmdEditProject', 'done', 'twEditOff', 'do'),
    // R7b — the card's move box, on the project it is showing: put it in on the day and hours chosen,
    // move it to another day, or take it out.
    wire('twCardRows', 'resolvedId', 'cmdPlaceDay', 'projectId'),
    wire('twCardRows', 'move', 'cmdPlaceDay', 'move'),
    wire('twCardRows', 'placed', 'cmdPlaceDay', 'placed'),
    wire('twCard', 'planDate', 'cmdPlaceDay', 'date'),
    wire('twCard', 'planHours', 'cmdPlaceDay', 'planned'),
    wire('twCard', 'plan', 'cmdPlaceDay', 'do'),
    wire('twCardRows', 'placedBlockId', 'cmdMoveBlock', 'blockId'),
    wire('twCardRows', 'planDate', 'cmdMoveBlock', 'from'),
    wire('twCard', 'planDate', 'cmdMoveBlock', 'date'),
    wire('twCard', 'moveIt', 'cmdMoveBlock', 'do'),
    wire('twCardRows', 'placedBlockId', 'cmdTakeOut', 'blockId'),
    wire('twCard', 'takeOut', 'cmdTakeOut', 'do'),

    // The evening drawer.
    wire('twBar', 'shutDown', 'twOpenDrawer', 'do'),
    wire('twVarDrawer', 'value', 'twDrawerShown', 'in-open'),
    wire('twDrawerShown', 'out-shown', 'twDrawer', 'shown'),
    wire('twDrawer', 'close', 'twCloseDrawer', 'do'),
    ...(['projects', 'blocks'] as const).map((n) => wire('twData', n, 'twShutLogic', n)),
    ...(['todayKey', 'tomorrowKey', 'todayLong', 'tomorrowLong'] as const).map((n) => wire('twDays', n, 'twShutLogic', n)),
    wire('twMovesLogic', 'unplacedDormant', 'twShutLogic', 'unplacedDormant'),
    ...(['target', 'billableUsed', 'billableLeft', 'perDay', 'buildingLeft', 'daysLeft', 'focusHours'] as const).map((n) =>
      wire('twEnv', n, 'twShutLogic', n)
    ),
    ...SHUTDOWN_OUTS.map(([n]) => wire('twShutLogic', n, 'twDrawer', n)),
    wire('twDrawer', 'blockId', 'cmdCarry', 'blockId'),
    wire('twDays', 'tomorrowKey', 'cmdCarry', 'date'),
    wire('twDrawer', 'carry', 'cmdCarry', 'do'),
    wire('twDrawer', 'blockId', 'cmdDrop', 'blockId'),
    wire('twDrawer', 'drop', 'cmdDrop', 'do'),

    // The phone's day picker. On a laptop the stylesheet hides the strip and shows all six
    // columns, so none of this is reachable and none of it is in the way.
    wire('twDays', 'picker', 'twPicker', 'rows'),
    wire('twPicker', 'key', 'twSetPhoneDay', 'value'),
    wire('twPicker', 'pick', 'twSetPhoneDay', 'do'),
    wire('twVarPhoneDay', 'value', 'twDays', 'pickedDay'),

    // R23 — the block sheet. A block's words or its hours open it with Done off (R22)...
    wire('twDayEach', 'itemOutput-blockId', 'twSetLog', 'value'),
    wire('twDayEach', 'itemOutputSignal-openLog', 'twModeWords', 'do'),
    wire('twDayEach', 'itemOutputSignal-openLog', 'twClearNewDay', 'do'),
    wire('twDayEach', 'itemOutputSignal-openLog', 'twSetLog', 'do'),
    // ...and the + at the foot of a day opens it on a new block in that day.
    wire('twDayEach', 'itemOutput-dayKey', 'twSetNewDay', 'value'),
    wire('twDayEach', 'itemOutputSignal-addBlock', 'twClearLog', 'do'),
    wire('twDayEach', 'itemOutputSignal-addBlock', 'twSetNewDay', 'do'),
    wire('twVarLog', 'value', 'twSheetRow', 'in-id'),
    wire('twVarNewDay', 'value', 'twSheetRow', 'in-newDay'),
    wire('twVarMode', 'value', 'twSheetRow', 'in-mode'),
    wire('twData', 'blocks', 'twSheetRow', 'in-blocks'),
    wire('twData', 'projects', 'twSheetRow', 'in-projects'),
    ...BLOCK_SHEET_FIELDS.map(([n]) => wire('twSheetRow', `out-${n}`, 'twLog', n)),
    // Save: a new block is written by Add block; an existing one by Save block, then Add time.
    wire('twSheetRow', 'out-isNew', 'twIsNewBlock', 'condition'),
    wire('twLog', 'save', 'twIsNewBlock', 'eval'),
    wire('twIsNewBlock', 'ontrue', 'cmdAddBlock', 'do'),
    wire('twIsNewBlock', 'onfalse', 'cmdSave', 'do'),
    ...(['projectId', 'what', 'planned', 'date'] as const).flatMap((n) => [wire('twLog', n, 'cmdAddBlock', n), wire('twLog', n, 'cmdSave', n)]),
    wire('twVarLog', 'value', 'cmdSave', 'blockId'),
    wire('twVarLog', 'value', 'cmdTime', 'blockId'),
    wire('twSheetRow', 'out-before', 'cmdTime', 'entries'),
    wire('twSheetRow', 'out-actual', 'cmdTime', 'actual'),
    wire('twLog', 'hours', 'cmdTime', 'hours'),
    wire('twLog', 'note', 'cmdTime', 'note'),
    wire('twLog', 'done', 'cmdTime', 'logged'),
    wire('twDays', 'todayKey', 'cmdTime', 'day'),
    // Two writes, one after the other: what the block is, then the time on it. Only the second
    // closes the sheet, so a block that did not save stays open with its words still in it.
    wire('cmdSave', 'done', 'cmdTime', 'do'),
    wire('twLog', 'close', 'twClearLog', 'do'),
    wire('twLog', 'close', 'twClearNewDay', 'do'),
    wire('cmdTime', 'done', 'twClearLog', 'do'),
    wire('cmdAddBlock', 'done', 'twClearNewDay', 'do'),

    // The settings sheet.
    wire('twBar', 'openSettings', 'twOpenSheet', 'do'),
    wire('twVarSheet', 'value', 'twSheetShown', 'in-open'),
    wire('twSheetShown', 'out-shown', 'twSheet', 'shown'),
    wire('twSheet', 'close', 'twCloseSheet', 'do'),
    wire('twSheet', 'close', 'twCashOff', 'do'),

    // R23 — the money events, in the settings sheet.
    wire('twSheet', 'cashPickId', 'twSetCash', 'value'),
    wire('twSheet', 'cashPick', 'twSetCash', 'do'),
    wire('twSheet', 'cashAdd', 'twCashNew', 'do'),
    wire('twSheet', 'cashCancel', 'twCashOff', 'do'),
    wire('twVarCash', 'value', 'twCashForm', 'in-mode'),
    wire('twData', 'cashEvents', 'twCashForm', 'in-cashEvents'),
    ...CASH_EDITOR_FIELDS.map(([n]) => wire('twCashForm', `out-${n}`, 'twSheet', under('cash', n))),
    wire('twCashForm', 'out-isNew', 'twIsNewCash', 'condition'),
    wire('twSheet', 'cashSave', 'twIsNewCash', 'eval'),
    wire('twIsNewCash', 'ontrue', 'cmdCashEvent', 'do'),
    wire('twIsNewCash', 'onfalse', 'cmdEditCash', 'do'),
    wire('twCashForm', 'out-id', 'cmdEditCash', 'cashId'),
    ...CASH_EDIT_VALUES.flatMap(([n]) => [wire('twSheet', under('cash', n), 'cmdCashEvent', n), wire('twSheet', under('cash', n), 'cmdEditCash', n)]),
    wire('cmdCashEvent', 'done', 'twCashOff', 'do'),
    wire('cmdEditCash', 'done', 'twCashOff', 'do'),
    wire('twEnv', 'targetLine', 'twSheet', 'targetLine'),
    wire('twEnv', 'planLine', 'twSheet', 'planLine'),
    ...(['rate', 'householdNeed', 'partnerIncome', 'focusHours', 'partnerDay', 'costsDay', 'invoiceDay', 'paymentTermsDays'] as const).flatMap((n) => [
      wire('twSettings', `out-${n}`, 'twSheet', n),
      wire('twSheet', n, 'cmdSettings', n)
    ]),
    wire('twSettings', 'out-id', 'cmdSettings', 'settingsId'),
    wire('twSheet', 'save', 'cmdSettings', 'do'),

    // Plan this month (Q3), from what the settings come to.
    wire('twData', 'month', 'cmdMonthPlan', 'month'),
    wire('twEnv', 'target', 'cmdMonthPlan', 'billable'),
    wire('twEnv', 'buildingLeft', 'cmdMonthPlan', 'building'),
    wire('twEnv', 'daysLeft', 'cmdMonthPlan', 'workingDays'),
    wire('twSettings', 'out-openingBalance', 'cmdMonthPlan', 'openingBalance'),
    wire('twSheet', 'planMonth', 'cmdMonthPlan', 'do'),

    // The one sentence a failed write shows.
    wire('twVarProblem', 'value', 'twProblem', 'text'),
    wire('twVarProblem', 'value', 'twHasProblem', 'in-text'),
    wire('twHasProblem', 'out-shown', 'twProblem', 'mounted'),

    // After any change, load the week again.
    ...['cmdAddBlock', 'cmdSave', 'cmdTime', 'cmdCarry', 'cmdDrop', 'cmdPlace', 'cmdPlaceDay', 'cmdMoveBlock', 'cmdTakeOut', 'cmdAddProject', 'cmdEditProject', 'cmdMonthPlan', 'cmdCashEvent', 'cmdEditCash', 'cmdSettings'].map(
      (id) => wire(id, 'done', 'twData', 'refresh')
    )
  ]
};

/** TPL-008's sign-in screen, with this template's words. */
const PAGE_SIGN_IN: Tpl010Component = {
  path: 'Pages/Sign in',
  description: 'Sign in, or create an account with the same two boxes. Someone already signed in goes straight to their week.',
  instantiates: [C.themeSwitch],
  nodes: [
    { id: 'siPage', type: 'Page', label: 'Sign in', parameters: { title: 'Sign in', urlPath: 'sign-in' } },
    group('siRoot', 'Page', 'siPage', {
      ...COLUMN('var(--space-0)'),
      alignItems: 'center',
      paddingTop: 'var(--space-4)',
      paddingBottom: 'var(--space-16)',
      paddingLeft: 'var(--space-4)',
      paddingRight: 'var(--space-4)'
    }),
    group('siTop', 'Top right', 'siRoot', { ...ROW('var(--space-0)'), justifyContent: 'flex-end', paddingBottom: 'var(--space-12)' }),
    place('siTheme', C.themeSwitch, 'Light or dark', 'siTop'),
    group('siCard', 'Sign-in card', 'siRoot', {
      ...CARD,
      ...COLUMN('var(--space-4)'),
      maxWidth: px(400),
      paddingLeft: 'var(--space-6)',
      paddingRight: 'var(--space-6)',
      paddingTop: 'var(--space-6)',
      paddingBottom: 'var(--space-6)'
    }),
    text('siTitle', 'App name', 'siCard', 'Envelopes', { ...wide(T_TITLE), as: 'h1' }),
    text('siLead', 'What this is', 'siCard', 'Sign in, or create an account. Your week is kept on your server, so every device you sign in on sees the same one.', wide(T_META)),
    place('siEmail', TEXT_INPUT, 'Email', 'siCard', {
      ...FIELD, type: 'email', useLabel: true, label: 'Email', labelSpacing: 6, labelfontSize: 'var(--text-sm)', labelcolor: 'var(--foreground)'
    }),
    place('siPassword', TEXT_INPUT, 'Password', 'siCard', {
      ...FIELD, type: 'password', useLabel: true, label: 'Password', labelSpacing: 6, labelfontSize: 'var(--text-sm)', labelcolor: 'var(--foreground)'
    }),
    text('siError', 'Why it did not work', 'siCard', '', { ...wide(T_ERROR), mounted: false }),
    group('siButtons', 'Buttons', 'siCard', { ...ROW('var(--space-2)'), flexWrap: 'wrap' }),
    place('siSignIn', BUTTON, 'Sign in', 'siButtons', { ...BTN_PRIMARY, label: 'Sign in' }),
    place('siCreate', BUTTON, 'Create account', 'siButtons', { ...BTN_OUTLINE, label: 'Create account' }),
    logic('siLogIn', 'net.noodl.user.LogIn', 'Sign in'),
    logic('siSignUp', 'net.noodl.user.SignUp', 'Create the account'),
    logic('siUser', 'net.noodl.user.User', 'Who is signed in'),
    logic('siAuth', CONDITION, 'Already signed in?', signalOnly('condition')),
    logic('siToWeek', 'RouterNavigate', 'Go to the week', { router: ROUTER, target: C.pageWeek }),
    /**
     * 🔴 `mounted` is a VALUE port, so a signal cannot drive it: a pulse is played as true
     * and then false in the same pass, and the banner would hide itself the instant it
     * appeared. What did not work is held as a value — set from the refusal, cleared when
     * the person tries again — so an old refusal never sits over a new attempt.
     */
    logic('siVarError', VARIABLE, 'What did not work', { name: VAR.signInError }),
    logic('siSetError', SET_VARIABLE, 'Say what did not work', { name: VAR.signInError, setWith: 'string' }),
    logic('siClearError', SET_VARIABLE, 'Put the old error away', { name: VAR.signInError, setWith: 'string', value: '' }),
    derive('siHasError', 'Is there an error to show?', "Outputs.shown = String(Inputs.text || '') !== '';")
  ],
  connections: [
    wire('siPage', 'didMount', 'siAuth', 'eval'),
    wire('siUser', 'authenticated', 'siAuth', 'condition'),
    wire('siAuth', 'ontrue', 'siToWeek', 'navigate'),

    // 🔴 Three port names that are not what they look like: the box's VALUE is
    // `onTextChanged` (`textChanged` is the signal that it changed, and wiring that into a
    // value port lands `false` in it); and signing in reports `done`, not `success`.
    wire('siEmail', 'onTextChanged', 'siLogIn', 'username'),
    wire('siPassword', 'onTextChanged', 'siLogIn', 'password'),
    wire('siEmail', 'onTextChanged', 'siSignUp', 'username'),
    wire('siPassword', 'onTextChanged', 'siSignUp', 'password'),

    wire('siSignIn', 'onClick', 'siClearError', 'do'),
    wire('siCreate', 'onClick', 'siClearError', 'do'),

    wire('siSignIn', 'onClick', 'siLogIn', 'login'),
    wire('siPassword', 'onEnter', 'siLogIn', 'login'),
    wire('siCreate', 'onClick', 'siSignUp', 'signup'),

    wire('siLogIn', 'done', 'siToWeek', 'navigate'),
    wire('siSignUp', 'done', 'siToWeek', 'navigate'),
    wire('siLogIn', 'error', 'siSetError', 'value'),
    wire('siSignUp', 'error', 'siSetError', 'value'),
    wire('siLogIn', 'failure', 'siSetError', 'do'),
    wire('siSignUp', 'failure', 'siSetError', 'do'),
    wire('siVarError', 'value', 'siError', 'text'),
    wire('siVarError', 'value', 'siHasError', 'in-text'),
    wire('siHasError', 'out-shown', 'siError', 'mounted')
  ]
};

// ════════════════════════════════════════════════════════════════════════════
// The App shell and the order the plan is given
// ════════════════════════════════════════════════════════════════════════════

export const APP_NODES = [
  group('app_root', 'App', undefined, {
    sizeMode: 'explicit',
    width: pct(100),
    height: pct(100),
    backgroundColor: 'var(--background)',
    flexDirection: 'column'
  }),
  { id: 'app_router', type: 'Router', label: 'Main router', parent: 'app_root', parameters: { name: ROUTER } },
  // The page ground, both palettes, which theme icon shows, and R15's `min-width: 0`.
  logic('app_css', 'CSS Definition', 'The page ground, the dark palette and which theme icon shows', { style: themeCss() }),
  // Nothing wired into it, so it runs once at load: a theme the person chose is put back.
  logic('app_theme', FUNCTION, 'Put back the theme the person chose', { functionScript: THEME_BOOT_SCRIPT })
];
export const APP_WIRES: unknown[] = [];

/**
 * Leaves first, then what places them, then the pages — and `Pages/Week` before
 * `Pages/Sign in`, because the first page registered becomes the start page and a signed-in
 * person should land on their week.
 */
export const TPL010_COMPONENTS: ReadonlyArray<Tpl010Component> = [
  // Commands: they write, and nothing places them but the page.
  ADD_BLOCK,
  SAVE_BLOCK,
  ADD_TIME,
  CARRY_BLOCK,
  DROP_BLOCK,
  PLACE_MOVE,
  MOVE_BLOCK,
  ADD_PROJECT,
  EDIT_PROJECT,
  SET_MONTH_PLAN,
  ADD_CASH_EVENT,
  EDIT_CASH_EVENT,
  EDIT_SETTINGS,
  // Logic: the only places a number or a sentence is decided.
  PLANNER_DATA,
  ENVELOPES,
  DAY_COLUMNS,
  MOVES,
  CASH_LINE,
  SHUTDOWN,
  CARD_ROWS,
  // Leaves, then what places them.
  THEME_SWITCH,
  APP_BAR,
  SPARK_BAR,
  DAY_BOX,
  FACT_ROW,
  SPARKLINE,
  DAY_BOXES,
  ENVELOPE_TILE,
  MOVE_CHIP,
  BLOCK,
  CASH_EVENT,
  PROJECT_LIST_ROW,
  PROJECT_GROUP,
  CARRY_ROW,
  MOVES_STRIP,
  DAY_HEADER,
  DAY_COLUMN,
  CASH_STRIP,
  DATE_PICKER,
  ENTRY_ROW,
  CASH_ROW,
  PROJECT_DETAIL,
  PROJECT_EDITOR,
  PROJECT_CARD,
  SHUTDOWN_DRAWER,
  CASH_EDITOR,
  SETTINGS_SHEET,
  BLOCK_SHEET,
  DAY_PICK,
  DAY_PICKER,
  // The pages.
  PAGE_WEEK,
  PAGE_SIGN_IN
];
