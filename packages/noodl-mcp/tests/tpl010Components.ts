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
 * R2: the unit is **billable hours**. The month target is worked out from the money (TPL-010-M,
 * M22): break-even and the savings target, less the fixed bills going out this month, ÷ the usual
 * hourly rate, plus the fixed projects' agreed hours — `Logic/Money` says it. R3: **six focused
 * hours a day** is the ceiling, the per-day need is `hours left ÷ working days left`, and
 * what the ceiling leaves over is the building budget.
 *
 * @module noodl-mcp/tests/tpl010Components
 */
import { DATE_PICKER_DESCRIPTION, DATE_PICKER_INPUTS, DATE_PICKER_OUTPUTS, datePickerGraph } from './datePicker';
import { MONEY_FNS } from './tpl010Money';
import { composition, ENVELOPE_KEYS, ENVELOPE_NAMES, THEME_BOOT_SCRIPT, THEME_FLIP_SCRIPT, THEME_TO_DARK_CLASS, THEME_TO_LIGHT_CLASS, themeCss } from './tpl010Theme';

export const ROUTER = 'Main';
export const APP_COMPONENT = 'App';

/**
 * R10, §2 of the task file. `Block` is the only one a person can delete (a dropped block).
 * TPL-010-M (M10): `CashEvent` became `MoneyItem` + `MoneyMark` + `BalanceReading`, and nothing
 * in them is deleted — ending an item sets its `until`, so the past keeps its history.
 */
export const COLLECTIONS = ['Project', 'Block', 'MonthPlan', 'MoneyItem', 'MoneyMark', 'BalanceReading', 'Settings'] as const;

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
  moneyRow: '/Week/Money row',
  moneyMonth: '/Week/Money month',
  moneySummary: '/Week/Money summary',
  moneyRepeat: '/Week/Money repeat',
  moneyEnd: '/Week/Money end',
  moneyBalance: '/Week/Money balance',
  moneyEditor: '/Week/Money editor',
  moneySheet: '/Week/Money sheet',
  balanceRow: '/Week/Balance row',
  mightLink: '/Week/Might link',
  keyLine: '/Week/Key line',
  dayPicker: '/Week/Day picker',
  dayPick: '/Week/Day pick',

  plannerData: '/Logic/Planner data',
  envelopes: '/Logic/Envelopes',
  dayColumns: '/Logic/Day columns',
  moves: '/Logic/Moves',
  money: '/Logic/Money',
  moneyView: '/Logic/Money pane',
  mark: '/Logic/Mark',
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
  addMoneyItem: '/Commands/Add money item',
  editMoneyItem: '/Commands/Edit money item',
  endMoneyItem: '/Commands/End money item',
  addMark: '/Commands/Add mark',
  editMark: '/Commands/Edit mark',
  recordBalance: '/Commands/Record balance',
  agreeMoneyItem: '/Commands/Agree money item',
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
  /** M1 — whether the Money modal is open. */
  moneyOpen: 'plannerMoneyOpen',
  /** M1 — the modal's filter: `up`, `past` or `rec`. Empty reads as `up`. */
  moneyFilter: 'plannerMoneyFilter',
  /** The repeat the right-hand pane is showing, as `itemId|occurs|kind` (kind `pay` or `bill`). Empty: the summary. */
  moneySel: 'plannerMoneySel',
  /** What the right-hand pane is: empty (the summary or the picked repeat), `edit` (an item), `new`, `end`, `balance`. */
  moneyMode: 'plannerMoneyMode',
  /** The item the editor or End it is about; empty for a new one. */
  moneyItem: 'plannerMoneyItem',
  /** Where a new item starts from (M5, M16): a JSON preset, or empty. */
  moneyPreset: 'plannerMoneyPreset',
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
  // M1 — Money's own button, beside Projects. A character, like every icon here.
  'icon-euro': '\u20ac',
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
  ['key', 'string'],
  ['when', 'string'],
  ['whenColor', 'string'],
  ['amount', 'string'],
  ['amountColor', 'string'],
  ['label', 'string'],
  ['running', 'string'],
  ['low', 'boolean'],
  ['edge', 'string'],
  ['background', 'string']
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
  description: 'One thing that happens to the money: when it lands, how much, what it is, and what the balance is afterwards. Press it to open it in Money.',
  ...iface(CASH_EVENT_FIELDS, [['pick', 'signal'], ['key', 'string']]),
  nodes: [
    inputs('ceIn', 'The event', CASH_EVENT_FIELDS),
    outputs('ceOut', 'Pressed', [['pick', 'signal'], ['key', 'string']]),
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
    wire('ceIn', 'whenColor', 'ceWhen', 'color'),
    wire('ceIn', 'background', 'ceRoot', 'backgroundColor'),
    // M14 — each box opens the Money modal on that repeat.
    wire('ceIn', 'key', 'ceOut', 'key'),
    wire('ceRoot', 'onClick', 'ceOut', 'pick'),
    wire('ceIn', 'amount', 'ceAmount', 'text'),
    wire('ceIn', 'amountColor', 'ceAmount', 'color'),
    wire('ceIn', 'label', 'ceLabel', 'text'),
    wire('ceIn', 'running', 'ceRunning', 'text'),
    wire('ceIn', 'edge', 'ceRoot', 'borderColor')
  ]
};

// ── TPL-010-M: the money's leaves ───────────────────────────────────────────

const MONEY_ROW_FIELDS: Array<[string, string]> = [
  ['key', 'string'], ['kind', 'string'],
  ['dateText', 'string'], ['dateColor', 'string'],
  ['label', 'string'], ['labelColor', 'string'], ['sub', 'string'], ['subColor', 'string'],
  ['amountText', 'string'], ['amountColor', 'string'], ['afterText', 'string'], ['afterColor', 'string'],
  ['tickShown', 'boolean'], ['tickFill', 'string'], ['tickInk', 'string'],
  ['rowBackground', 'string'], ['rowEdge', 'string'], ['rowEdgeStyle', 'string']
];
const PICKED: Array<[string, string]> = [['pick', 'signal'], ['key', 'string'], ['kind', 'string']];

/**
 * One line in the Money modal (§4.1): the tick, the date, what it is and where it came from, the
 * amount and the balance after it. **The tick opens the pane rather than ticking** (R16a's
 * pattern, M6): the date it happened and the amount that moved are asked every time. A hoped row
 * is dashed and has no balance after it (M7); a bill's "goes out" line has its amount in brackets.
 */
const MONEY_ROW: Tpl010Component = {
  path: 'Week/Money row',
  description: 'One thing that happens to the money, in the Money modal: a tick, its date, what it is and where it came from, the amount, and the balance after it.',
  ...iface(MONEY_ROW_FIELDS, PICKED),
  nodes: [
    inputs('mrIn', 'The line', MONEY_ROW_FIELDS),
    outputs('mrOut', 'Picked', PICKED),
    group('mrRoot', 'One money line', undefined, {
      ...ROW('var(--space-2)'),
      alignItems: 'flex-start',
      borderStyle: 'solid',
      borderWidth: 'var(--border-1)',
      borderRadius: 'var(--radius-md)',
      paddingLeft: 'var(--space-2)',
      paddingRight: 'var(--space-2)',
      paddingTop: 'var(--space-1-5)',
      paddingBottom: 'var(--space-1-5)'
    }),
    place('mrTick', BUTTON, 'Tick it — opens it with the date and amount to confirm', 'mrRoot', BTN_CHECK),
    text('mrDate', 'When', 'mrRoot', '', { ...T_META, sizeMode: 'explicit', width: px(58), cssClassName: 'planner-money-date' }),
    group('mrMain', 'What it is', 'mrRoot', { ...COLUMN('var(--space-0)'), width: pct(100) }),
    text('mrLabel', 'What it is', 'mrMain', '', { ...wide(T_BODY), fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }),
    text('mrSub', 'Where it came from', 'mrMain', '', wide(T_META)),
    group('mrNums', 'How much, and after', 'mrRoot', { ...COLUMN_TIGHT('var(--space-0)'), alignItems: 'flex-end' }),
    text('mrAmount', 'How much', 'mrNums', '', { ...T_NUM, sizeMode: 'contentSize', fontWeight: 'var(--font-semibold)', textAlignX: 'right' }),
    text('mrAfter', 'The balance after it', 'mrNums', '', { ...T_NUM, sizeMode: 'contentSize', fontSize: px(11), textAlignX: 'right' })
  ],
  connections: [
    wire('mrIn', 'dateText', 'mrDate', 'text'),
    wire('mrIn', 'dateColor', 'mrDate', 'color'),
    wire('mrIn', 'label', 'mrLabel', 'text'),
    wire('mrIn', 'labelColor', 'mrLabel', 'color'),
    wire('mrIn', 'sub', 'mrSub', 'text'),
    wire('mrIn', 'subColor', 'mrSub', 'color'),
    wire('mrIn', 'amountText', 'mrAmount', 'text'),
    wire('mrIn', 'amountColor', 'mrAmount', 'color'),
    wire('mrIn', 'afterText', 'mrAfter', 'text'),
    wire('mrIn', 'afterColor', 'mrAfter', 'color'),
    // An item in Recurring and a hoped line have nothing to tick (M7): the box is not drawn.
    wire('mrIn', 'tickShown', 'mrTick', 'mounted'),
    wire('mrIn', 'tickFill', 'mrTick', 'backgroundColor'),
    wire('mrIn', 'tickInk', 'mrTick', 'color'),
    wire('mrIn', 'rowBackground', 'mrRoot', 'backgroundColor'),
    wire('mrIn', 'rowEdge', 'mrRoot', 'borderColor'),
    wire('mrIn', 'rowEdgeStyle', 'mrRoot', 'borderStyle'),
    wire('mrIn', 'key', 'mrOut', 'key'),
    wire('mrIn', 'kind', 'mrOut', 'kind'),
    wire('mrRoot', 'onClick', 'mrOut', 'pick'),
    wire('mrTick', 'onClick', 'mrOut', 'pick')
  ]
};

const MONEY_MONTH_FIELDS: Array<[string, string]> = [['name', 'string'], ['nameColor', 'string'], ['summary', 'string'], ['rows', 'array']];

/** One heading in the Money modal — a month with its in, out, net and the balance at its end; or Late; or a group of the recurring items — and its lines. */
const MONEY_MONTH: Tpl010Component = {
  path: 'Week/Money month',
  description: 'One group of lines in the Money modal: its heading (a month with what comes in and goes out and where it ends, or Late), then a line for each thing in it.',
  ...iface(MONEY_MONTH_FIELDS, PICKED),
  repeats: { source: 'array', rowFields: MONEY_ROW_FIELDS.map(([n]) => n) },
  instantiates: [C.moneyRow],
  nodes: [
    inputs('mmIn', 'The group', MONEY_MONTH_FIELDS),
    outputs('mmOut', 'Picked', PICKED),
    group('mmRoot', 'Money group', undefined, COLUMN('var(--space-0-5)')),
    group('mmHead', 'Heading', 'mmRoot', { ...ROW('var(--space-2)'), justifyContent: 'space-between', flexWrap: 'wrap', paddingTop: 'var(--space-2)', paddingLeft: 'var(--space-2)', paddingRight: 'var(--space-2)' }),
    text('mmName', 'Which month', 'mmHead', '', { ...T_LABEL, sizeMode: 'contentSize', fontWeight: 'var(--font-bold)' }),
    text('mmSummary', 'In, out, net, and where it ends', 'mmHead', '', { ...T_NUM, sizeMode: 'contentSize', fontSize: px(12) }),
    place('mmEach', FOR_EACH, 'One line per thing', 'mmRoot', { template: C.moneyRow, templateType: 'explicit' })
  ],
  connections: [
    wire('mmIn', 'name', 'mmName', 'text'),
    wire('mmIn', 'nameColor', 'mmName', 'color'),
    wire('mmIn', 'summary', 'mmSummary', 'text'),
    wire('mmIn', 'rows', 'mmEach', 'items'),
    wire('mmEach', 'itemOutputSignal-pick', 'mmOut', 'pick'),
    wire('mmEach', 'itemOutput-key', 'mmOut', 'key'),
    wire('mmEach', 'itemOutput-kind', 'mmOut', 'kind')
  ]
};

const BALANCE_ROW_FIELDS: Array<[string, string]> = [['key', 'string'], ['label', 'string'], ['sub', 'string'], ['lostLabel', 'string']];
const BALANCE_ROW_OUTS: Array<[string, string]> = [['happened', 'signal'], ['lost', 'signal'], ['part', 'signal'], ['key', 'string']];

/**
 * M11 — one unticked thing dated on or before today, in *Record balance*: did it happen, did part
 * of it, or is it lost. *Not yet* is doing nothing, and it is then counted as if it happens today.
 * Each answer is written the moment it is pressed, so the list shortens as it is answered.
 */
const BALANCE_ROW: Tpl010Component = {
  path: 'Week/Balance row',
  description: 'One thing that should have happened by now and is not ticked, with the answers: it happened, part of it did, or it is lost.',
  ...iface(BALANCE_ROW_FIELDS, BALANCE_ROW_OUTS),
  nodes: [
    inputs('brIn', 'The thing', BALANCE_ROW_FIELDS),
    outputs('brOut', 'The answer', BALANCE_ROW_OUTS),
    group('brRoot', 'One question', undefined, {
      ...CARD,
      ...COLUMN('var(--space-1)'),
      paddingLeft: 'var(--space-2)',
      paddingRight: 'var(--space-2)',
      paddingTop: 'var(--space-1-5)',
      paddingBottom: 'var(--space-1-5)'
    }),
    text('brLabel', 'What it is', 'brRoot', '', { ...wide(T_BODY), fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }),
    text('brSub', 'How much and when', 'brRoot', '', wide(T_META)),
    group('brButtons', 'The answers', 'brRoot', { ...ROW('var(--space-1-5)'), flexWrap: 'wrap' }),
    place('brHappened', BUTTON, 'It happened', 'brButtons', { ...BTN_OUTLINE, label: 'Happened' }),
    place('brPart', BUTTON, 'Part of it happened', 'brButtons', { ...BTN_GHOST, label: 'Part of it…' }),
    place('brLost', BUTTON, 'It is lost', 'brButtons', { ...BTN_GHOST, label: 'Lost' })
  ],
  connections: [
    wire('brIn', 'label', 'brLabel', 'text'),
    wire('brIn', 'sub', 'brSub', 'text'),
    wire('brIn', 'lostLabel', 'brLost', 'label'),
    wire('brIn', 'key', 'brOut', 'key'),
    wire('brHappened', 'onClick', 'brOut', 'happened'),
    wire('brPart', 'onClick', 'brOut', 'part'),
    wire('brLost', 'onClick', 'brOut', 'lost')
  ]
};

const KEY_LINE_FIELDS: Array<[string, string]> = [['key', 'string'], ['text', 'string']];

/** One line of Billing on a project's card (§4.2): what it is on the left, and what it says. On a phone the two stack. */
const KEY_LINE: Tpl010Component = {
  path: 'Week/Key line',
  description: 'One line of a project’s billing: what it is, and what it says — the bills, the next one, this period, the past.',
  ...iface(KEY_LINE_FIELDS, []),
  nodes: [
    inputs('klIn', 'The line', KEY_LINE_FIELDS),
    group('klRoot', 'One billing line', undefined, { ...ROW('var(--space-2)'), alignItems: 'flex-start', cssClassName: 'planner-money-line' }),
    text('klKey', 'What it is', 'klRoot', '', { ...T_LABEL, sizeMode: 'explicit', width: px(88), cssClassName: 'planner-money-key' }),
    text('klText', 'What it says', 'klRoot', '', { ...wide(T_META), color: 'var(--foreground)' })
  ],
  connections: [wire('klIn', 'key', 'klKey', 'text'), wire('klIn', 'text', 'klText', 'text')]
};

const MIGHT_LINK_FIELDS: Array<[string, string]> = [['projectId', 'string'], ['name', 'string'], ['odds', 'string'], ['move', 'string']];

/** M7, M14 line 2 — one hoped project: its name (opens its card), its odds, and the move that makes it real. */
const MIGHT_LINK: Tpl010Component = {
  path: 'Week/Might link',
  description: 'One project you might earn from: its name, which opens its card, how likely it is, and the move that makes it real.',
  ...iface(MIGHT_LINK_FIELDS, [['open', 'signal'], ['projectId', 'string']]),
  nodes: [
    inputs('mlIn', 'The hoped project', MIGHT_LINK_FIELDS),
    outputs('mlOut', 'Opened', [['open', 'signal'], ['projectId', 'string']]),
    group('mlRoot', 'One hoped project', undefined, { ...ROW('var(--space-1)'), alignItems: 'flex-start' }),
    place('mlName', BUTTON, 'Open its card', 'mlRoot', {
      ...BTN_GHOST,
      borderStyle: 'none',
      borderWidth: undefined,
      borderColor: undefined,
      backgroundColor: 'transparent',
      sizeMode: 'contentSize',
      paddingLeft: 'var(--space-0)',
      paddingRight: 'var(--space-0)',
      paddingTop: 'var(--space-0)',
      paddingBottom: 'var(--space-0)',
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--font-semibold)',
      color: 'var(--foreground)',
      styleCss: 'text-decoration: underline; text-underline-offset: 3px;'
    }),
    text('mlOdds', 'How likely', 'mlRoot', '', { ...T_NUM, sizeMode: 'contentSize', fontSize: 'var(--text-sm)' }),
    text('mlMove', 'The move that makes it real', 'mlRoot', '', { ...wide(T_META), fontSize: 'var(--text-sm)' })
  ],
  connections: [
    wire('mlIn', 'name', 'mlName', 'label'),
    wire('mlIn', 'odds', 'mlOdds', 'text'),
    wire('mlIn', 'move', 'mlMove', 'text'),
    wire('mlIn', 'projectId', 'mlOut', 'projectId'),
    wire('mlName', 'onClick', 'mlOut', 'open')
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
 * **M14 — the bottom of the week page answers "how far off am I".** Three lines and the boxes:
 *
 * 1. **the month** — break-even, target, what is billed so far and with this month's bills
 *    still to go out, and what is left to target in hours (M13, M17, M22). Never red; it is a plan;
 * 2. **might earn** — the hoped money, weighted, each project named (it opens the card) with the
 *    move that makes it real (M7). Only when there is some;
 * 3. **the lowest point** in six weeks — red only under the low-water mark, the one red R10 built
 *    the strip for.
 *
 * Then the six boxes, **late ones first** (M6), each opening the Money modal on its repeat. Weekly
 * items are in every balance and get no box (M18); a line under the boxes names them.
 */
const CASH_STRIP_FIELDS: Array<[string, string]> = [
  ['rows', 'array'], ['balanceText', 'string'], ['monthName', 'string'], ['monthText', 'string'],
  ['mightShown', 'boolean'], ['mightLead', 'string'], ['mightRows', 'array'], ['lowText', 'string'], ['lowColor', 'string'], ['footText', 'string']
];
const CASH_STRIP_OUTS: Array<[string, string]> = [['pick', 'signal'], ['key', 'string'], ['open', 'signal'], ['openProject', 'signal'], ['projectId', 'string']];
const lineKey = (id: string, parent: string, words: string) =>
  text(id, words, parent, words, { ...T_LABEL, sizeMode: 'explicit', width: px(92), cssClassName: 'planner-money-key' });

const CASH_STRIP: Tpl010Component = {
  path: 'Week/Cash strip',
  description: 'The money under the week: how the month stands against break-even and the target, what you might earn and what makes it real, the lowest the balance goes in six weeks, and the next six things that move money — late ones first.',
  ...iface(CASH_STRIP_FIELDS, CASH_STRIP_OUTS),
  repeats: { source: 'array', rowFields: CASH_EVENT_FIELDS.map(([n]) => n) },
  instantiates: [C.cashEvent, C.mightLink],
  nodes: [
    inputs('csIn', 'The money', CASH_STRIP_FIELDS),
    outputs('csOut', 'Pressed', CASH_STRIP_OUTS),
    group('csRoot', 'Cash strip', undefined, {
      ...COLUMN('var(--space-1-5)'),
      ...PINNED,
      ...CARD,
      paddingLeft: 'var(--space-3)',
      paddingRight: 'var(--space-3)',
      paddingTop: 'var(--space-2)',
      paddingBottom: 'var(--space-2)'
    }),
    group('csHead', 'Money, and the balance', 'csRoot', { ...ROW('var(--space-3)'), justifyContent: 'space-between', flexWrap: 'wrap' }),
    text('csTitle', 'What this is', 'csHead', 'Money', { ...T_LABEL, sizeMode: 'contentSize' }),
    group('csNums', 'The balance', 'csHead', { ...ROW_TIGHT('var(--space-3)'), flexWrap: 'wrap', rowGap: 'var(--space-1)', cssClassName: 'planner-shrink-wrap' }),
    text('csBalance', 'The balance', 'csNums', '', { ...T_NUM, sizeMode: 'contentSize' }),
    place('csOpen', BUTTON, 'Open Money', 'csNums', { ...BTN_GHOST, label: 'Open money', paddingTop: 'var(--space-0-5)', paddingBottom: 'var(--space-0-5)' }),
    group('csMonth', 'The month', 'csRoot', { ...ROW('var(--space-2)'), alignItems: 'flex-start', cssClassName: 'planner-money-line' }),
    text('csMonthKey', 'Which month', 'csMonth', '', { ...T_LABEL, sizeMode: 'explicit', width: px(92), cssClassName: 'planner-money-key' }),
    text('csMonthText', 'How the month stands', 'csMonth', '', { ...wide(T_META), fontSize: 'var(--text-sm)', color: 'var(--foreground)' }),
    group('csMight', 'Might earn', 'csRoot', { ...ROW('var(--space-2)'), alignItems: 'flex-start', cssClassName: 'planner-money-line' }),
    lineKey('csMightKey', 'csMight', 'Might earn'),
    group('csMightWords', 'What and from whom', 'csMight', COLUMN('var(--space-0-5)')),
    text('csMightLead', 'How much', 'csMightWords', '', { ...wide(T_META), fontSize: 'var(--text-sm)', color: 'var(--foreground)' }),
    place('csMightEach', FOR_EACH, 'One hoped project', 'csMightWords', { template: C.mightLink, templateType: 'explicit' }),
    group('csLow', 'The lowest point', 'csRoot', { ...ROW('var(--space-2)'), alignItems: 'flex-start', cssClassName: 'planner-money-line' }),
    lineKey('csLowKey', 'csLow', 'Lowest'),
    text('csLowText', 'The lowest point', 'csLow', '', { ...wide(T_META), fontSize: 'var(--text-sm)' }),
    group('csScroll', 'The next six', 'csRoot', { ...SCROLL_X, columnGap: 'var(--space-2)', alignItems: 'stretch' }),
    place('csEach', FOR_EACH, 'One box per event', 'csScroll', { template: C.cashEvent, templateType: 'explicit' }),
    text('csFoot', 'What has no box', 'csRoot', '', { ...wide(T_META), fontSize: px(11) })
  ],
  connections: [
    wire('csIn', 'balanceText', 'csBalance', 'text'),
    wire('csOpen', 'onClick', 'csOut', 'open'),
    wire('csIn', 'monthName', 'csMonthKey', 'text'),
    wire('csIn', 'monthText', 'csMonthText', 'text'),
    wire('csIn', 'mightShown', 'csMight', 'mounted'),
    wire('csIn', 'mightLead', 'csMightLead', 'text'),
    wire('csIn', 'mightRows', 'csMightEach', 'items'),
    wire('csMightEach', 'itemOutputSignal-open', 'csOut', 'openProject'),
    wire('csMightEach', 'itemOutput-projectId', 'csOut', 'projectId'),
    wire('csIn', 'lowText', 'csLowText', 'text'),
    wire('csIn', 'lowColor', 'csLowText', 'color'),
    wire('csIn', 'rows', 'csEach', 'items'),
    wire('csEach', 'itemOutputSignal-pick', 'csOut', 'pick'),
    wire('csEach', 'itemOutput-key', 'csOut', 'key'),
    wire('csIn', 'footText', 'csFoot', 'text')
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
  ['move', 'string'], ['moveWorth', 'string'], ['moveWhen', 'string'], ['moveDue', 'string'], ['moveStop', 'boolean'], ['say', 'string'],
  // M21 and §4.2 — hourly or fixed, the payment terms that pre-fill a bill's due date (M5), and the agreed hours.
  ['billing', 'string'], ['termsDays', 'string'], ['agreedHours', 'string']
];
const PROJECT_EDITOR_FIELDS: Array<[string, string]> = [['shown', 'boolean'], ['title', 'string'], ['kinds', '*'], ['billings', '*'], ...PROJECT_EDIT_VALUES];
const PROJECT_EDITOR_OUTS: Array<[string, string]> = [...PROJECT_EDIT_VALUES, ['save', 'signal'], ['cancel', 'signal']];

/** The typed boxes: `[field, label, id, box type, parent]`. Placed one by one below, because child order is draw order. */
const PROJECT_BOXES: Array<[string, string, string, 'text' | 'number', string]> = [
  ['name', 'Name', 'peName', 'text', 'peRoot'],
  ['sub', 'One line about it', 'peSub', 'text', 'peRoot'],
  ['rate', 'Rate, per hour', 'peRate', 'number', 'peRateBox'],
  ['termsDays', 'Payment terms, days', 'peTerms', 'number', 'peTermsBox'],
  ['agreedHours', 'Agreed hours a month', 'peAgreed', 'number', 'peAgreedBox'],
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
    group('peBillRow', 'Billing', 'peRoot', { ...ROW('var(--space-3)'), alignItems: 'flex-end' }),
    group('peBillingBox', 'Hourly or fixed', 'peBillRow', { ...COLUMN('var(--space-0)'), width: pct(40) }),
    place('peBilling', 'net.noodl.controls.options', 'Hourly or fixed', 'peBillingBox', PICK('Billing')),
    group('peTermsBox', 'Payment terms', 'peBillRow', { ...COLUMN('var(--space-0)'), width: pct(30) }),
    group('peAgreedBox', 'Agreed hours', 'peBillRow', { ...COLUMN('var(--space-0)'), width: pct(30) }),
    peBox('termsDays'),
    peBox('agreedHours'),
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
    wire('peIn', 'billings', 'peBilling', 'items'),
    wire('peIn', 'billing', 'peBilling', 'value'),
    wire('peBilling', 'value', 'peOut', 'billing'),
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

// ── TPL-010-M: the Money modal ──────────────────────────────────────────────

/** A back button for the phone, where the list and the pane take turns (§4.1). Hidden above the breakpoint. */
const PHONE_BACK = (id: string, parent: string) => place(id, BUTTON, 'Back to the list', parent, { ...BTN_GHOST, label: '‹ Money', cssClassName: 'planner-phone-only' });

/**
 * 🔴 Trap 6 (memory: nodegx-sheet-traps). The pane stays mounted while the person moves from one
 * repeat to the next, and its boxes are prefilled with values two repeats can share — so each
 * time what it shows changes, every box is blurred and then Set back to what it was last sent.
 */
const RESET_ON_KEY = "var key = String(Inputs.key || '');\nif (this.key !== undefined && this.key !== key) { Outputs.blur(); Outputs.reset(); }\nthis.key = key;";
const resetBoxes = (resetId: string, boxes: string[]) =>
  boxes.flatMap((b) => [wire(resetId, 'out-blur', b, 'blur'), wire(resetId, 'out-reset', b, 'set')]);

const MONEY_SUMMARY_FIELDS: Array<[string, string]> = [['shown', 'boolean'], ['lines', 'array'], ['note', 'string'], ['balanceLines', 'array']];
const MONEY_SUMMARY_OUTS: Array<[string, string]> = [['recordBalance', 'signal'], ['back', 'signal']];

/**
 * M12, M13, M22 — what the month's target is made of, line by line, and where the balance
 * stands. It is the pane when nothing is picked, so the arithmetic is never hidden (R2's rule).
 */
const MONEY_SUMMARY: Tpl010Component = {
  path: 'Week/Money summary',
  description: 'What this month’s target is made of, line by line — what goes out, what comes in, the fixed bills, the hours — and where the balance stands.',
  ...iface(MONEY_SUMMARY_FIELDS, MONEY_SUMMARY_OUTS),
  repeats: { source: 'array', rowFields: FACT_FIELDS.map(([n]) => n) },
  instantiates: [C.factRow],
  nodes: [
    inputs('msmIn', 'The month', MONEY_SUMMARY_FIELDS),
    outputs('msmOut', 'Pressed', MONEY_SUMMARY_OUTS),
    group('msmRoot', 'This month’s target', undefined, COLUMN('var(--space-3)')),
    PHONE_BACK('msmBack', 'msmRoot'),
    text('msmTitle', 'Title', 'msmRoot', 'This month’s target', { ...wide(T_TITLE), as: 'h3', fontSize: px(19) }),
    text('msmLead', 'Where it comes from', 'msmRoot', 'From the expected money items that belong to no project. Yearly items count a twelfth a month, weekly ones 52 ÷ 12.', wide(T_META)),
    group('msmLines', 'The sum', 'msmRoot', COLUMN('var(--space-1)')),
    place('msmEach', FOR_EACH, 'One line of the sum', 'msmLines', { template: C.factRow, templateType: 'explicit' }),
    text('msmNote', 'What is not in it', 'msmRoot', '', wide(T_META)),
    group('msmBalance', 'The balance', 'msmRoot', {
      ...COLUMN('var(--space-1)'),
      borderTopStyle: 'solid',
      borderTopWidth: 'var(--border-1)',
      borderTopColor: 'var(--border)',
      paddingTop: 'var(--space-3)'
    }),
    text('msmBalLabel', 'Label', 'msmBalance', 'Balance', wide(T_LABEL)),
    place('msmBalEach', FOR_EACH, 'One line about the balance', 'msmBalance', { template: C.factRow, templateType: 'explicit' }),
    place('msmRecord', BUTTON, 'Record what the bank says', 'msmBalance', { ...BTN_OUTLINE, label: 'Record balance' })
  ],
  connections: [
    wire('msmIn', 'shown', 'msmRoot', 'mounted'),
    wire('msmIn', 'lines', 'msmEach', 'items'),
    wire('msmIn', 'note', 'msmNote', 'text'),
    wire('msmIn', 'balanceLines', 'msmBalEach', 'items'),
    wire('msmRecord', 'onClick', 'msmOut', 'recordBalance'),
    wire('msmBack', 'onClick', 'msmOut', 'back')
  ]
};

const MONEY_REPEAT_FIELDS: Array<[string, string]> = [
  ['shown', 'boolean'], ['key', 'string'], ['title', 'string'], ['sub', 'string'], ['subColor', 'string'],
  ['amountText', 'string'], ['amountColor', 'string'], ['detail', 'string'],
  ['tickShown', 'boolean'], ['tickHead', 'string'], ['tickOn', 'string'], ['tickAmount', 'string'], ['remaining', 'number'],
  ['rests', '*'], ['restDefault', 'string'],
  ['changeLabel', 'string'], ['skipShown', 'boolean'], ['lostShown', 'boolean'],
  ['changeShown', 'boolean'], ['chDate', 'string'], ['chAmount', 'string'], ['chNote', 'string'], ['chHint', 'string'], ['resetShown', 'boolean'],
  ['closedShown', 'boolean'], ['closedText', 'string'],
  ['hopedShown', 'boolean'], ['hopedText', 'string'],
  ['billShown', 'boolean'], ['billText', 'string'], ['sendShown', 'boolean'], ['sentOn', 'string'], ['sentAmount', 'string'], ['sentAmountShown', 'boolean'], ['unsendShown', 'boolean'],
  ['fromShown', 'boolean'], ['fromText', 'string'], ['itemLabel', 'string'], ['endShown', 'boolean']
];
const MONEY_REPEAT_OUTS: Array<[string, string]> = [
  ['tick', 'signal'], ['tickOn', 'string'], ['tickAmount', 'string'], ['tickRest', 'string'],
  ['changeOne', 'signal'], ['chDate', 'string'], ['chAmount', 'string'], ['chNote', 'string'], ['saveOne', 'signal'], ['resetOne', 'signal'],
  ['skip', 'signal'], ['lost', 'signal'], ['untick', 'signal'], ['agreed', 'signal'],
  ['markSent', 'signal'], ['sentOn', 'string'], ['sentAmount', 'string'], ['unsend', 'signal'],
  ['changeItem', 'signal'], ['endItem', 'signal'], ['back', 'signal']
];

/**
 * **One repeat, in the right-hand pane** (§4.1): its date, amount and where it came from; the tick
 * (M6) with the day it happened and the amount that moved — and when that is less than was due,
 * what the rest is (M11a: still owed, or lost); *Change this one*, *Skip this one*, *Mark as lost*;
 * for a client bill, *Mark as sent* (with the amount, for a bill filled from the hours — M23);
 * and below a rule, the item it comes from with *Change the item* and *End it* (M4).
 */
const MONEY_REPEAT: Tpl010Component = {
  path: 'Week/Money repeat',
  description: 'One thing that happens to the money, on its own: tick it with the day and the amount, change or skip this one, mark it lost or sent, and change or end the item it comes from.',
  ...iface(MONEY_REPEAT_FIELDS, MONEY_REPEAT_OUTS),
  instantiates: [C.datePicker],
  nodes: [
    inputs('rpIn', 'The repeat', MONEY_REPEAT_FIELDS),
    outputs('rpOut', 'What to do with it', MONEY_REPEAT_OUTS),
    group('rpRoot', 'One repeat', undefined, COLUMN('var(--space-3)')),
    PHONE_BACK('rpBack', 'rpRoot'),
    group('rpHead', 'What it is', 'rpRoot', COLUMN('var(--space-0-5)')),
    text('rpTitle', 'What it is', 'rpHead', '', { ...wide(T_TITLE), as: 'h3', fontSize: px(19) }),
    text('rpSub', 'When', 'rpHead', '', wide(T_META)),
    text('rpAmount', 'How much', 'rpRoot', '', { ...wide(T_NUM), fontSize: px(24), fontWeight: 'var(--font-semibold)' }),
    text('rpDetail', 'More about it', 'rpRoot', '', wide(T_META)),

    group('rpTick', 'Did it happen?', 'rpRoot', {
      ...COLUMN('var(--space-2)'),
      backgroundColor: 'var(--muted)',
      borderRadius: 'var(--radius-md)',
      paddingLeft: 'var(--space-3)',
      paddingRight: 'var(--space-3)',
      paddingTop: 'var(--space-2)',
      paddingBottom: 'var(--space-3)'
    }),
    text('rpTickHead', 'Label', 'rpTick', '', wide(T_LABEL)),
    group('rpTickRow', 'The day and the amount', 'rpTick', { ...ROW('var(--space-3)'), alignItems: 'flex-end' }),
    group('rpTickOnBox', 'The day', 'rpTickRow', { ...COLUMN('var(--space-0)'), width: pct(55) }),
    place('rpTickOn', C.datePicker, 'The day it happened', 'rpTickOnBox', { Label: 'Happened on', 'Show Label': true }),
    group('rpTickAmountBox', 'The amount', 'rpTickRow', { ...COLUMN('var(--space-0)'), width: pct(45) }),
    place('rpTickAmount', TEXT_INPUT, 'The amount that moved', 'rpTickAmountBox', BOX('Amount that moved, €', 'number')),
    derive(
      'rpShort',
      'Is it less than was due?',
      `var typed = String(Inputs.typed === undefined || Inputs.typed === null ? '' : Inputs.typed).trim();
var v = Number(typed), left = Math.abs(Number(Inputs.remaining) || 0);
var short = typed !== '' && isFinite(v) && v >= 0 && v < left - 0.005;
Outputs.short = short;
var rest = Math.round((left - (isFinite(v) ? v : 0)) * 100) / 100;
Outputs.restLine = short ? 'That is \\u20ac' + rest + ' less than was due. The other \\u20ac' + rest + ' is:' : '';`
    ),
    text('rpRestLine', 'How much less', 'rpTick', '', wide(T_META)),
    place('rpRest', 'net.noodl.controls.options', 'What the rest is', 'rpTick', PICK('The rest')),
    place('rpTickIt', BUTTON, 'Tick it', 'rpTick', { ...BTN_PRIMARY, label: 'Tick it' }),

    group('rpActs', 'Other things to do with it', 'rpRoot', { ...ROW('var(--space-2)'), flexWrap: 'wrap' }),
    place('rpChangeOne', BUTTON, 'Change this one', 'rpActs', { ...BTN_OUTLINE }),
    place('rpSkip', BUTTON, 'Skip this one', 'rpActs', { ...BTN_GHOST, label: 'Skip this one' }),
    place('rpLost', BUTTON, 'Mark it as lost', 'rpActs', { ...BTN_GHOST, label: 'Mark as lost' }),

    group('rpChange', 'This one, changed', 'rpRoot', {
      ...COLUMN('var(--space-2)'),
      backgroundColor: 'var(--muted)',
      borderRadius: 'var(--radius-md)',
      paddingLeft: 'var(--space-3)',
      paddingRight: 'var(--space-3)',
      paddingTop: 'var(--space-2)',
      paddingBottom: 'var(--space-3)'
    }),
    group('rpChRow', 'Its day and amount', 'rpChange', { ...ROW('var(--space-3)'), alignItems: 'flex-end' }),
    group('rpChDateBox', 'Its day', 'rpChRow', { ...COLUMN('var(--space-0)'), width: pct(55) }),
    place('rpChDate', C.datePicker, 'Its day', 'rpChDateBox', { Label: 'Date', 'Show Label': true }),
    group('rpChAmountBox', 'Its amount', 'rpChRow', { ...COLUMN('var(--space-0)'), width: pct(45) }),
    place('rpChAmount', TEXT_INPUT, 'Its amount', 'rpChAmountBox', BOX('Amount, €', 'number')),
    place('rpChNote', TEXT_INPUT, 'A note about this one', 'rpChange', BOX('Note')),
    text('rpChHint', 'What changing it does', 'rpChange', '', wide(T_META)),
    group('rpChButtons', 'Buttons', 'rpChange', { ...ROW('var(--space-2)'), flexWrap: 'wrap' }),
    place('rpSaveOne', BUTTON, 'Save this one', 'rpChButtons', { ...BTN_PRIMARY, label: 'Save this one' }),
    place('rpResetOne', BUTTON, 'Back to the item', 'rpChButtons', { ...BTN_GHOST, label: 'Back to the item' }),

    group('rpClosed', 'What happened', 'rpRoot', {
      ...COLUMN('var(--space-2)'),
      backgroundColor: 'var(--muted)',
      borderRadius: 'var(--radius-md)',
      paddingLeft: 'var(--space-3)',
      paddingRight: 'var(--space-3)',
      paddingTop: 'var(--space-2)',
      paddingBottom: 'var(--space-2)'
    }),
    text('rpClosedText', 'What happened', 'rpClosed', '', wide(T_BODY)),
    place('rpUntick', BUTTON, 'Untick it', 'rpClosed', { ...BTN_GHOST, label: 'Untick' }),

    group('rpHoped', 'Hoped money', 'rpRoot', COLUMN('var(--space-2)')),
    text('rpHopedText', 'What hoped means', 'rpHoped', '', wide(T_META)),
    place('rpAgreed', BUTTON, 'It is agreed', 'rpHoped', { ...BTN_OUTLINE, label: 'It’s agreed · set to 100%' }),

    group('rpBill', 'The bill', 'rpRoot', {
      ...COLUMN('var(--space-2)'),
      backgroundColor: 'var(--muted)',
      borderRadius: 'var(--radius-md)',
      paddingLeft: 'var(--space-3)',
      paddingRight: 'var(--space-3)',
      paddingTop: 'var(--space-2)',
      paddingBottom: 'var(--space-3)'
    }),
    text('rpBillText', 'When it goes out', 'rpBill', '', wide(T_META)),
    group('rpSend', 'Sending it', 'rpBill', COLUMN('var(--space-2)')),
    group('rpSendRow', 'The day and the amount', 'rpSend', { ...ROW('var(--space-3)'), alignItems: 'flex-end' }),
    group('rpSentOnBox', 'The day', 'rpSendRow', { ...COLUMN('var(--space-0)'), width: pct(55) }),
    place('rpSentOn', C.datePicker, 'The day it went out', 'rpSentOnBox', { Label: 'Sent on', 'Show Label': true }),
    group('rpSentAmountBox', 'The amount', 'rpSendRow', { ...COLUMN('var(--space-0)'), width: pct(45) }),
    place('rpSentAmount', TEXT_INPUT, 'The amount on the bill', 'rpSentAmountBox', BOX('Amount, €', 'number')),
    place('rpMarkSent', BUTTON, 'Mark it as sent', 'rpSend', { ...BTN_PRIMARY, label: 'Mark as sent' }),
    place('rpUnsend', BUTTON, 'It was not sent after all', 'rpBill', { ...BTN_GHOST, label: 'Not sent after all' }),

    group('rpFrom', 'The item it comes from', 'rpRoot', {
      ...COLUMN('var(--space-2)'),
      borderTopStyle: 'solid',
      borderTopWidth: 'var(--border-1)',
      borderTopColor: 'var(--border)',
      paddingTop: 'var(--space-3)'
    }),
    text('rpFromLabel', 'Label', 'rpFrom', 'Comes from', wide(T_LABEL)),
    text('rpFromText', 'The item', 'rpFrom', '', wide(T_META)),
    group('rpFromButtons', 'Buttons', 'rpFrom', { ...ROW('var(--space-2)'), flexWrap: 'wrap' }),
    place('rpChangeItem', BUTTON, 'Change the item', 'rpFromButtons', { ...BTN_OUTLINE }),
    place('rpEndItem', BUTTON, 'End the item', 'rpFromButtons', { ...BTN_GHOST, label: 'End it' }),

    derive('rpReset', 'Put the boxes back when the repeat changes', RESET_ON_KEY),
    derive('rpClosing', 'Clear the boxes when the pane closes', SHEET_SCRIPT([]))
  ],
  connections: [
    wire('rpIn', 'shown', 'rpRoot', 'mounted'),
    wire('rpIn', 'title', 'rpTitle', 'text'),
    wire('rpIn', 'sub', 'rpSub', 'text'),
    wire('rpIn', 'subColor', 'rpSub', 'color'),
    wire('rpIn', 'amountText', 'rpAmount', 'text'),
    wire('rpIn', 'amountColor', 'rpAmount', 'color'),
    wire('rpIn', 'detail', 'rpDetail', 'text'),
    wire('rpIn', 'tickShown', 'rpTick', 'mounted'),
    wire('rpIn', 'tickHead', 'rpTickHead', 'text'),
    wire('rpIn', 'tickOn', 'rpTickOn', 'Value'),
    wire('rpTickOn', 'Value', 'rpOut', 'tickOn'),
    wire('rpIn', 'tickAmount', 'rpTickAmount', 'startValue'),
    wire('rpTickAmount', 'onTextChanged', 'rpOut', 'tickAmount'),
    wire('rpTickAmount', 'onTextChanged', 'rpShort', 'in-typed'),
    wire('rpIn', 'remaining', 'rpShort', 'in-remaining'),
    wire('rpShort', 'out-short', 'rpRestLine', 'mounted'),
    wire('rpShort', 'out-short', 'rpRest', 'mounted'),
    wire('rpShort', 'out-restLine', 'rpRestLine', 'text'),
    wire('rpIn', 'rests', 'rpRest', 'items'),
    wire('rpIn', 'restDefault', 'rpRest', 'value'),
    wire('rpRest', 'value', 'rpOut', 'tickRest'),
    wire('rpTickIt', 'onClick', 'rpOut', 'tick'),
    wire('rpIn', 'tickShown', 'rpActs', 'mounted'),
    wire('rpIn', 'changeLabel', 'rpChangeOne', 'label'),
    wire('rpChangeOne', 'onClick', 'rpOut', 'changeOne'),
    wire('rpIn', 'skipShown', 'rpSkip', 'mounted'),
    wire('rpSkip', 'onClick', 'rpOut', 'skip'),
    wire('rpIn', 'lostShown', 'rpLost', 'mounted'),
    wire('rpLost', 'onClick', 'rpOut', 'lost'),
    wire('rpIn', 'changeShown', 'rpChange', 'mounted'),
    wire('rpIn', 'chDate', 'rpChDate', 'Value'),
    wire('rpChDate', 'Value', 'rpOut', 'chDate'),
    wire('rpIn', 'chAmount', 'rpChAmount', 'startValue'),
    wire('rpChAmount', 'onTextChanged', 'rpOut', 'chAmount'),
    wire('rpIn', 'chNote', 'rpChNote', 'startValue'),
    wire('rpChNote', 'onTextChanged', 'rpOut', 'chNote'),
    wire('rpIn', 'chHint', 'rpChHint', 'text'),
    wire('rpSaveOne', 'onClick', 'rpOut', 'saveOne'),
    wire('rpIn', 'resetShown', 'rpResetOne', 'mounted'),
    wire('rpResetOne', 'onClick', 'rpOut', 'resetOne'),
    wire('rpIn', 'closedShown', 'rpClosed', 'mounted'),
    wire('rpIn', 'closedText', 'rpClosedText', 'text'),
    wire('rpUntick', 'onClick', 'rpOut', 'untick'),
    wire('rpIn', 'hopedShown', 'rpHoped', 'mounted'),
    wire('rpIn', 'hopedText', 'rpHopedText', 'text'),
    wire('rpAgreed', 'onClick', 'rpOut', 'agreed'),
    wire('rpIn', 'billShown', 'rpBill', 'mounted'),
    wire('rpIn', 'billText', 'rpBillText', 'text'),
    wire('rpIn', 'sendShown', 'rpSend', 'mounted'),
    wire('rpIn', 'sentOn', 'rpSentOn', 'Value'),
    wire('rpSentOn', 'Value', 'rpOut', 'sentOn'),
    wire('rpIn', 'sentAmountShown', 'rpSentAmountBox', 'mounted'),
    wire('rpIn', 'sentAmount', 'rpSentAmount', 'startValue'),
    wire('rpSentAmount', 'onTextChanged', 'rpOut', 'sentAmount'),
    wire('rpMarkSent', 'onClick', 'rpOut', 'markSent'),
    wire('rpIn', 'unsendShown', 'rpUnsend', 'mounted'),
    wire('rpUnsend', 'onClick', 'rpOut', 'unsend'),
    wire('rpIn', 'fromShown', 'rpFrom', 'mounted'),
    wire('rpIn', 'fromText', 'rpFromText', 'text'),
    wire('rpIn', 'itemLabel', 'rpChangeItem', 'label'),
    wire('rpChangeItem', 'onClick', 'rpOut', 'changeItem'),
    wire('rpIn', 'endShown', 'rpEndItem', 'mounted'),
    wire('rpEndItem', 'onClick', 'rpOut', 'endItem'),
    wire('rpBack', 'onClick', 'rpOut', 'back'),
    wire('rpIn', 'key', 'rpReset', 'in-key'),
    ...resetBoxes('rpReset', ['rpTickAmount', 'rpChAmount', 'rpChNote', 'rpSentAmount']),
    wire('rpIn', 'shown', 'rpClosing', 'in-shown'),
    ...['rpTickAmount', 'rpChAmount', 'rpChNote', 'rpSentAmount'].map((id) => wire('rpClosing', 'out-closed', id, 'clear'))
  ]
};

const MONEY_END_FIELDS: Array<[string, string]> = [['shown', 'boolean'], ['title', 'string'], ['text', 'string'], ['choices', '*'], ['at', 'string']];
const MONEY_END_OUTS: Array<[string, string]> = [['at', 'string'], ['go', 'signal'], ['cancel', 'signal'], ['back', 'signal']];

/** M5 / M10 — *End it*: pick the last repeat that happens. Nothing is deleted; the ticked ones stay in Past. */
const MONEY_END: Tpl010Component = {
  path: 'Week/Money end',
  description: 'Ending a money item: pick the last repeat that happens. Nothing is deleted, and the ones already ticked stay in Past.',
  ...iface(MONEY_END_FIELDS, MONEY_END_OUTS),
  nodes: [
    inputs('meIn', 'The item', MONEY_END_FIELDS),
    outputs('meOut', 'Ended', MONEY_END_OUTS),
    group('meRoot', 'End an item', undefined, COLUMN('var(--space-3)')),
    PHONE_BACK('meBack', 'meRoot'),
    text('meTitle', 'Which item', 'meRoot', '', { ...wide(T_TITLE), as: 'h3', fontSize: px(19) }),
    place('meAt', 'net.noodl.controls.options', 'The last one that happens', 'meRoot', PICK('The last one that happens')),
    text('meText', 'What ending it does', 'meRoot', '', wide(T_META)),
    group('meButtons', 'Buttons', 'meRoot', { ...ROW('var(--space-2)'), flexWrap: 'wrap' }),
    place('meGo', BUTTON, 'End it', 'meButtons', { ...BTN_PRIMARY, label: 'End it' }),
    place('meCancel', BUTTON, 'Do not end it', 'meButtons', { ...BTN_OUTLINE, label: 'Cancel' })
  ],
  connections: [
    wire('meIn', 'shown', 'meRoot', 'mounted'),
    wire('meIn', 'title', 'meTitle', 'text'),
    wire('meIn', 'text', 'meText', 'text'),
    wire('meIn', 'choices', 'meAt', 'items'),
    wire('meIn', 'at', 'meAt', 'value'),
    wire('meAt', 'value', 'meOut', 'at'),
    wire('meGo', 'onClick', 'meOut', 'go'),
    wire('meCancel', 'onClick', 'meOut', 'cancel'),
    wire('meBack', 'onClick', 'meOut', 'back')
  ]
};

const MONEY_BALANCE_FIELDS: Array<[string, string]> = [['shown', 'boolean'], ['on', 'string'], ['hint', 'string'], ['rows', 'array'], ['hasRows', 'boolean'], ['note', 'string']];
const MONEY_BALANCE_OUTS: Array<[string, string]> = [
  ['on', 'string'], ['amount', 'string'], ['save', 'signal'], ['cancel', 'signal'],
  ['happened', 'signal'], ['lost', 'signal'], ['part', 'signal'], ['key', 'string'], ['back', 'signal']
];

/**
 * M11 — **recording the balance is the moment of truth.** What the bank says, on a day; and every
 * unticked thing dated on or before today, each answered where it stands (a Balance row).
 */
const MONEY_BALANCE: Tpl010Component = {
  path: 'Week/Money balance',
  description: 'Record what the bank says, and answer for everything that should have happened by now and is not ticked: it happened, part of it did, it is lost, or not yet.',
  ...iface(MONEY_BALANCE_FIELDS, MONEY_BALANCE_OUTS),
  repeats: { source: 'array', rowFields: BALANCE_ROW_FIELDS.map(([n]) => n) },
  instantiates: [C.datePicker, C.balanceRow],
  nodes: [
    inputs('mbIn', 'The reading', MONEY_BALANCE_FIELDS),
    outputs('mbOut', 'Recorded', MONEY_BALANCE_OUTS),
    group('mbRoot', 'Record balance', undefined, COLUMN('var(--space-3)')),
    PHONE_BACK('mbBack', 'mbRoot'),
    text('mbTitle', 'Title', 'mbRoot', 'Record balance', { ...wide(T_TITLE), as: 'h3', fontSize: px(19) }),
    text('mbLead', 'What it is for', 'mbRoot', 'What your bank says. Every projection starts from the latest one.', wide(T_META)),
    group('mbRow', 'The day and the balance', 'mbRoot', { ...ROW('var(--space-3)'), alignItems: 'flex-end' }),
    group('mbOnBox', 'The day', 'mbRow', { ...COLUMN('var(--space-0)'), width: pct(55) }),
    place('mbOn', C.datePicker, 'The day', 'mbOnBox', { Label: 'On', 'Show Label': true }),
    group('mbAmountBox', 'The balance', 'mbRow', { ...COLUMN('var(--space-0)'), width: pct(45) }),
    place('mbAmount', TEXT_INPUT, 'The balance', 'mbAmountBox', BOX('Balance, €', 'number')),
    text('mbHint', 'What the app thinks it is', 'mbRoot', '', wide(T_META)),
    group('mbLate', 'Not ticked yet', 'mbRoot', COLUMN('var(--space-2)')),
    text('mbLateLabel', 'Label', 'mbLate', 'Not ticked yet, dated on or before today', wide(T_LABEL)),
    place('mbEach', FOR_EACH, 'One question per thing', 'mbLate', { template: C.balanceRow, templateType: 'explicit' }),
    text('mbNote', 'What not yet means', 'mbRoot', '', wide(T_META)),
    group('mbButtons', 'Buttons', 'mbRoot', { ...ROW('var(--space-2)'), flexWrap: 'wrap' }),
    place('mbSave', BUTTON, 'Record it', 'mbButtons', { ...BTN_PRIMARY, label: 'Record it' }),
    place('mbCancel', BUTTON, 'Do not record it', 'mbButtons', { ...BTN_OUTLINE, label: 'Cancel' }),
    derive('mbClosing', 'Clear the box when it closes', SHEET_SCRIPT([]))
  ],
  connections: [
    wire('mbIn', 'shown', 'mbRoot', 'mounted'),
    wire('mbIn', 'on', 'mbOn', 'Value'),
    wire('mbOn', 'Value', 'mbOut', 'on'),
    wire('mbIn', 'hint', 'mbAmount', 'startValue'),
    wire('mbAmount', 'onTextChanged', 'mbOut', 'amount'),
    wire('mbIn', 'hasRows', 'mbLate', 'mounted'),
    wire('mbIn', 'rows', 'mbEach', 'items'),
    wire('mbEach', 'itemOutputSignal-happened', 'mbOut', 'happened'),
    wire('mbEach', 'itemOutputSignal-lost', 'mbOut', 'lost'),
    wire('mbEach', 'itemOutputSignal-part', 'mbOut', 'part'),
    wire('mbEach', 'itemOutput-key', 'mbOut', 'key'),
    wire('mbIn', 'note', 'mbNote', 'text'),
    wire('mbSave', 'onClick', 'mbOut', 'save'),
    wire('mbCancel', 'onClick', 'mbOut', 'cancel'),
    wire('mbBack', 'onClick', 'mbOut', 'back'),
    wire('mbIn', 'shown', 'mbClosing', 'in-shown'),
    wire('mbClosing', 'out-closed', 'mbAmount', 'clear')
  ]
};

/** What the item editor holds: every field of a MoneyItem a person types (M9). */
const MONEY_EDIT_VALUES: Array<[string, string]> = [
  ['label', 'string'], ['dir', 'string'], ['amount', 'string'], ['repeat', 'string'], ['date', 'string'], ['until', 'string'],
  ['monthEnd', 'boolean'], ['projectId', 'string'], ['billDate', 'string'], ['billLeadDays', 'string'], ['fromHours', 'boolean'],
  ['likelihood', 'string'], ['note', 'string']
];
const MONEY_EDITOR_FIELDS: Array<[string, string]> = [
  ['shown', 'boolean'], ['key', 'string'], ['title', 'string'], ['sub', 'string'], ['dirs', '*'], ['repeats', '*'], ['projects', '*'],
  // One project per line as { id, billing, terms, rate }, so the form can say what a project changes as it is picked.
  ['projectTerms', 'array'], ['saveLabel', 'string'],
  ...MONEY_EDIT_VALUES
];
const MONEY_EDITOR_OUTS: Array<[string, string]> = [...MONEY_EDIT_VALUES, ['save', 'signal'], ['cancel', 'signal'], ['back', 'signal']];

/**
 * **The item editor** (§4.1, grows out of the cash editor). Label, in or out, amount, schedule
 * (M3's five), the date, the last day of the month, until, project — and for a client: when the
 * bill goes out, with the due date **pre-filled from the project's payment terms** (M5: that is
 * the whole of the automation); for an hourly one, *fill the amount from the hours* (M23);
 * likelihood (M7) and a note. Nothing is required but a label, an amount and a date (M9).
 *
 * The form rearranges itself as it is filled in — a monthly item offers the last day of the month,
 * a client's one-off offers its bill date — so a Function inside it reads what is picked now, not
 * what the pane last sent.
 */
const MONEY_EDITOR: Tpl010Component = {
  path: 'Week/Money editor',
  description: 'One money item as a form: what it is, in or out, how much, how often and from when, until when, which project, when its bill goes out, how likely it is, and a note.',
  ...iface(MONEY_EDITOR_FIELDS, MONEY_EDITOR_OUTS),
  instantiates: [C.datePicker],
  nodes: [
    inputs('edIn', 'The item as it is', MONEY_EDITOR_FIELDS),
    outputs('edOut', 'The item as it should be', MONEY_EDITOR_OUTS),
    group('edRoot', 'Money item editor', undefined, COLUMN('var(--space-3)')),
    PHONE_BACK('edBack', 'edRoot'),
    group('edHead', 'What this form is', 'edRoot', COLUMN('var(--space-0-5)')),
    text('edTitle', 'What this form is', 'edHead', '', { ...wide(T_TITLE), as: 'h3', fontSize: px(19) }),
    text('edSub', 'What saving it changes', 'edHead', '', wide(T_META)),
    place('edLabel', TEXT_INPUT, 'What it is', 'edRoot', BOX('Label')),
    group('edRow1', 'In or out, and how much', 'edRoot', { ...ROW('var(--space-3)'), alignItems: 'flex-end' }),
    group('edDirBox', 'In or out', 'edRow1', { ...COLUMN('var(--space-0)'), width: pct(50) }),
    place('edDir', 'net.noodl.controls.options', 'In or out', 'edDirBox', PICK('In or out')),
    group('edAmountBox', 'How much', 'edRow1', { ...COLUMN('var(--space-0)'), width: pct(50) }),
    place('edAmount', TEXT_INPUT, 'How much', 'edAmountBox', BOX('Amount, €', 'number')),
    group('edRow2', 'How often, and whose', 'edRoot', { ...ROW('var(--space-3)'), alignItems: 'flex-end' }),
    group('edRepeatBox', 'How often', 'edRow2', { ...COLUMN('var(--space-0)'), width: pct(50) }),
    place('edRepeat', 'net.noodl.controls.options', 'How often', 'edRepeatBox', PICK('Happens')),
    group('edProjectBox', 'Whose', 'edRow2', { ...COLUMN('var(--space-0)'), width: pct(50) }),
    place('edProject', 'net.noodl.controls.options', 'Which project, if any', 'edProjectBox', { ...PICK('Project (optional)'), placeholder: 'No project' }),
    group('edRow3', 'The dates', 'edRoot', { ...ROW('var(--space-3)'), alignItems: 'flex-end', flexWrap: 'wrap' }),
    group('edBillBox', 'When the bill goes out', 'edRow3', { ...COLUMN('var(--space-0)'), width: pct(48) }),
    place('edBillDate', C.datePicker, 'When the bill goes out', 'edBillBox', { Label: 'Bill goes out', 'Show Label': true }),
    group('edDateBox', 'The date', 'edRow3', { ...COLUMN('var(--space-0)'), width: pct(48) }),
    place('edDate', C.datePicker, 'The date', 'edDateBox', { 'Show Label': true }),
    group('edUntilBox', 'Until', 'edRow3', { ...COLUMN('var(--space-0)'), width: pct(48) }),
    place('edUntil', C.datePicker, 'The last date', 'edUntilBox', { Label: 'Last date (optional)', 'Show Label': true }),
    text('edDueHint', 'Where the due date came from', 'edRoot', '', wide(T_META)),
    place('edMonthEnd', 'net.noodl.controls.checkbox', 'On the last day of the month', 'edRoot', TICK_BOX('On the last day of the month')),
    place('edLead', TEXT_INPUT, 'Bill goes out this many days before it is due', 'edRoot', BOX('Bill goes out, days before it’s due', 'number')),
    place('edFromHours', 'net.noodl.controls.checkbox', 'Fill the amount from the hours', 'edRoot', TICK_BOX('Fill the amount from the hours logged (hourly)')),
    group('edRow4', 'Likelihood and note', 'edRoot', { ...ROW('var(--space-3)'), alignItems: 'flex-end' }),
    group('edLikeBox', 'How likely', 'edRow4', { ...COLUMN('var(--space-0)'), width: pct(40) }),
    place('edLikelihood', TEXT_INPUT, 'How likely, in percent', 'edLikeBox', BOX('Likelihood, %', 'number')),
    group('edNoteBox', 'A note', 'edRow4', { ...COLUMN('var(--space-0)'), width: pct(60) }),
    place('edNote', TEXT_INPUT, 'A note', 'edNoteBox', BOX('Note (optional)')),
    text('edLikeHint', 'What likelihood means', 'edRoot', '100 is expected. Less is hoped money, which is never in a balance.', wide(T_META)),
    group('edButtons', 'Buttons', 'edRoot', { ...ROW('var(--space-2)'), flexWrap: 'wrap' }),
    place('edSave', BUTTON, 'Save the item', 'edButtons', { ...BTN_PRIMARY }),
    place('edCancel', BUTTON, 'Stop editing the item', 'edButtons', { ...BTN_OUTLINE, label: 'Cancel' }),
    /**
     * The form's own shape, from what is picked NOW. A client's one-off asks for the bill date and
     * pre-fills the due date from the project's terms whenever the bill date or the project changes
     * (M5); a typed due date stays until one of those changes again.
     */
    derive(
      'edShape',
      'Which fields this item needs',
      `var rep = String(Inputs.repeat || 'once');
var pid = String(Inputs.projectId || '');
var dir = String(Inputs.dir || 'in');
var list = Inputs.projectTerms || [];
var p = null;
for (var i = 0; i < list.length; i++) if (list[i] && list[i].id === pid) p = list[i];
var client = !!p && dir === 'in';
Outputs.untilShown = rep !== 'once';
Outputs.monthEndShown = rep === 'monthly' || rep === 'quarterly';
Outputs.billShown = client && rep === 'once';
Outputs.leadShown = client && rep !== 'once';
Outputs.fromHoursShown = client && !!p && p.billing !== 'fixed';
Outputs.dateLabel = client ? (rep === 'once' ? 'Due' : 'First due') : rep === 'once' ? 'Date' : 'First date';
var bill = String(Inputs.billDate || '');
var m = /^(\\d{4})-(\\d{2})-(\\d{2})$/.exec(bill);
var terms = p ? Number(p.terms) : NaN;
var stamp = pid + '|' + bill;
if (this.stamp === undefined) this.stamp = stamp;
if (client && rep === 'once' && m && isFinite(terms) && this.stamp !== stamp) {
  var d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + Math.round(terms)));
  Outputs.due = d.toISOString().slice(0, 10);
}
this.stamp = stamp;
Outputs.dueHint = client && rep === 'once' && isFinite(terms) ? 'Due ' + Math.round(terms) + ' days after the bill: ' + String(p.name || 'the project') + '\\u2019s payment terms.' : '';`
    ),
    derive('edClosing', 'Clear the boxes on close; tick the two boxes to match the item', SHEET_SCRIPT(['monthEnd', 'fromHours'])),
    derive('edReset', 'Put the boxes back when the item changes', RESET_ON_KEY)
  ],
  connections: [
    wire('edIn', 'shown', 'edRoot', 'mounted'),
    wire('edIn', 'title', 'edTitle', 'text'),
    wire('edIn', 'sub', 'edSub', 'text'),
    wire('edIn', 'saveLabel', 'edSave', 'label'),
    ...(
      [['label', 'edLabel'], ['amount', 'edAmount'], ['billLeadDays', 'edLead'], ['likelihood', 'edLikelihood'], ['note', 'edNote']] as Array<[string, string]>
    ).flatMap(([f, id]) => [wire('edIn', f, id, 'startValue'), wire(id, 'onTextChanged', 'edOut', f)]),
    wire('edIn', 'dirs', 'edDir', 'items'),
    wire('edIn', 'dir', 'edDir', 'value'),
    wire('edDir', 'value', 'edOut', 'dir'),
    wire('edIn', 'repeats', 'edRepeat', 'items'),
    wire('edIn', 'repeat', 'edRepeat', 'value'),
    wire('edRepeat', 'value', 'edOut', 'repeat'),
    wire('edIn', 'projects', 'edProject', 'items'),
    wire('edIn', 'projectId', 'edProject', 'value'),
    wire('edProject', 'value', 'edOut', 'projectId'),
    wire('edIn', 'billDate', 'edBillDate', 'Value'),
    wire('edBillDate', 'Value', 'edOut', 'billDate'),
    wire('edIn', 'date', 'edDate', 'Value'),
    wire('edShape', 'out-due', 'edDate', 'Value'),
    wire('edDate', 'Value', 'edOut', 'date'),
    wire('edIn', 'until', 'edUntil', 'Value'),
    wire('edUntil', 'Value', 'edOut', 'until'),
    wire('edRepeat', 'value', 'edShape', 'in-repeat'),
    wire('edProject', 'value', 'edShape', 'in-projectId'),
    wire('edDir', 'value', 'edShape', 'in-dir'),
    wire('edBillDate', 'Value', 'edShape', 'in-billDate'),
    wire('edIn', 'projectTerms', 'edShape', 'in-projectTerms'),
    wire('edShape', 'out-untilShown', 'edUntilBox', 'mounted'),
    wire('edShape', 'out-monthEndShown', 'edMonthEnd', 'mounted'),
    wire('edShape', 'out-billShown', 'edBillBox', 'mounted'),
    wire('edShape', 'out-leadShown', 'edLead', 'mounted'),
    wire('edShape', 'out-fromHoursShown', 'edFromHours', 'mounted'),
    wire('edShape', 'out-dateLabel', 'edDate', 'Label'),
    wire('edShape', 'out-dueHint', 'edDueHint', 'text'),
    wire('edIn', 'shown', 'edClosing', 'in-shown'),
    wire('edIn', 'monthEnd', 'edClosing', 'in-monthEnd'),
    wire('edIn', 'fromHours', 'edClosing', 'in-fromHours'),
    wire('edClosing', 'out-monthEndOn', 'edMonthEnd', 'check'),
    wire('edClosing', 'out-monthEndOff', 'edMonthEnd', 'uncheck'),
    wire('edClosing', 'out-fromHoursOn', 'edFromHours', 'check'),
    wire('edClosing', 'out-fromHoursOff', 'edFromHours', 'uncheck'),
    wire('edMonthEnd', 'checked', 'edOut', 'monthEnd'),
    wire('edFromHours', 'checked', 'edOut', 'fromHours'),
    ...['edLabel', 'edAmount', 'edLead', 'edLikelihood', 'edNote'].map((id) => wire('edClosing', 'out-closed', id, 'clear')),
    wire('edIn', 'key', 'edReset', 'in-key'),
    ...resetBoxes('edReset', ['edLabel', 'edAmount', 'edLead', 'edLikelihood', 'edNote']),
    wire('edSave', 'onClick', 'edOut', 'save'),
    wire('edCancel', 'onClick', 'edOut', 'cancel'),
    wire('edBack', 'onClick', 'edOut', 'back')
  ]
};

/** The pane's four parts and the editor, passed through the sheet under their own prefix (a sheet cannot have two inputs called `shown`). */
const MONEY_PARTS: Array<{ prefix: string; id: string; type: string; label: string; ins: Array<[string, string]>; outs: Array<[string, string]> }> = [
  { prefix: 'sum', id: 'msSum', type: C.moneySummary, label: 'What the target is made of', ins: MONEY_SUMMARY_FIELDS, outs: MONEY_SUMMARY_OUTS },
  { prefix: 'rp', id: 'msRepeat', type: C.moneyRepeat, label: 'The repeat picked', ins: MONEY_REPEAT_FIELDS, outs: MONEY_REPEAT_OUTS },
  { prefix: 'end', id: 'msEnd', type: C.moneyEnd, label: 'Ending an item', ins: MONEY_END_FIELDS, outs: MONEY_END_OUTS },
  { prefix: 'bal', id: 'msBal', type: C.moneyBalance, label: 'Record balance', ins: MONEY_BALANCE_FIELDS, outs: MONEY_BALANCE_OUTS },
  { prefix: 'ed', id: 'msEditor', type: C.moneyEditor, label: 'The item as a form', ins: MONEY_EDITOR_FIELDS, outs: MONEY_EDITOR_OUTS }
];
const MONEY_SHEET_OWN: Array<[string, string]> = [
  ['shown', 'boolean'], ['cardClass', 'string'], ['groups', 'array'], ['empty', 'boolean'], ['emptyText', 'string'], ['moreShown', 'boolean'], ['balanceText', 'string'],
  ['upFill', 'string'], ['upInk', 'string'], ['pastFill', 'string'], ['pastInk', 'string'], ['recFill', 'string'], ['recInk', 'string']
];
const MONEY_SHEET_OWN_OUTS: Array<[string, string]> = [
  ['close', 'signal'], ['showUp', 'signal'], ['showPast', 'signal'], ['showRec', 'signal'], ['more', 'signal'],
  ['add', 'signal'], ['record', 'signal'], ['pick', 'signal'], ['key', 'string'], ['kind', 'string']
];
const MONEY_SHEET_FIELDS: Array<[string, string]> = [...MONEY_SHEET_OWN, ...MONEY_PARTS.flatMap((pt) => pt.ins.map(([n, t]): [string, string] => [under(pt.prefix, n), t]))];
const MONEY_SHEET_OUTS: Array<[string, string]> = [...MONEY_SHEET_OWN_OUTS, ...MONEY_PARTS.flatMap((pt) => pt.outs.map(([n, t]): [string, string] => [under(pt.prefix, n), t]))];

const FILTER_BUTTON = (label: string) => ({
  ...BTN_GHOST,
  borderStyle: 'none',
  borderWidth: undefined,
  borderColor: undefined,
  fontWeight: 'var(--font-semibold)',
  paddingTop: 'var(--space-1)',
  paddingBottom: 'var(--space-1)',
  label
});

/**
 * **M1 — the Money modal**, opened from the € in the app bar. The same frame as the projects card:
 * the list on the left — *Upcoming · Past · Recurring* — and the picked thing on the right. Under
 * the phone breakpoint it fills the screen and the list and the pane take turns (`cardClass`
 * carries `planner-money-pane` while the pane is the one showing).
 */
const MONEY_SHEET: Tpl010Component = {
  path: 'Week/Money sheet',
  description: 'The Money modal: everything that comes in and goes out, as Upcoming, Past or Recurring, with the balance at the top, and whichever one you picked on the right — or the form to add or change one, or to record the balance.',
  ...iface(MONEY_SHEET_FIELDS, MONEY_SHEET_OUTS),
  repeats: { source: 'array', rowFields: MONEY_MONTH_FIELDS.map(([n]) => n) },
  instantiates: [C.moneyMonth, C.moneySummary, C.moneyRepeat, C.moneyEnd, C.moneyBalance, C.moneyEditor],
  nodes: [
    inputs('msIn', 'The money', MONEY_SHEET_FIELDS),
    outputs('msOut', 'What you did in it', MONEY_SHEET_OUTS),
    group('msScrim', 'Behind the modal', undefined, {
      sizeMode: 'explicit',
      width: pct(100),
      height: pct(100),
      position: 'fixed',
      backgroundColor: 'var(--scrim)',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      styleCss: 'z-index: 45;'
    }),
    group('msCard', 'The modal', 'msScrim', {
      cssClassName: 'planner-over planner-money', ...KEEPS_CLICKS,
      ...CARD,
      flexDirection: 'column',
      alignItems: 'stretch',
      sizeMode: 'explicit',
      width: pct(92),
      maxWidth: px(1100),
      height: pct(88),
      styleCss: 'overflow: hidden;'
    }),
    group('msTop', 'Title, filter, balance', 'msCard', {
      ...ROW('var(--space-3)'),
      flexWrap: 'wrap',
      rowGap: 'var(--space-2)',
      paddingLeft: 'var(--space-4)',
      paddingRight: 'var(--space-3)',
      paddingTop: 'var(--space-2-5)',
      paddingBottom: 'var(--space-2-5)',
      borderBottomStyle: 'solid',
      borderBottomWidth: 'var(--border-1)',
      borderBottomColor: 'var(--border)'
    }),
    text('msTitle', 'Money', 'msTop', 'Money', { ...T_TITLE, sizeMode: 'contentSize', as: 'h2' }),
    group('msFilter', 'Which list', 'msTop', {
      ...ROW_TIGHT('var(--space-0-5)'),
      backgroundColor: 'var(--muted)',
      borderRadius: 'var(--radius-md)',
      paddingLeft: 'var(--space-0-5)',
      paddingRight: 'var(--space-0-5)',
      paddingTop: 'var(--space-0-5)',
      paddingBottom: 'var(--space-0-5)'
    }),
    place('msUp', BUTTON, 'Show what is coming', 'msFilter', FILTER_BUTTON('Upcoming')),
    place('msPast', BUTTON, 'Show what has happened', 'msFilter', FILTER_BUTTON('Past')),
    place('msRec', BUTTON, 'Show what repeats', 'msFilter', FILTER_BUTTON('Recurring')),
    group('msGap', 'Room between the filter and the balance', 'msTop', { sizeMode: 'explicit', width: px(1), height: px(1), styleCss: 'flex: 1 1 0;' }),
    text('msBalance', 'The balance', 'msTop', '', { ...T_NUM, sizeMode: 'contentSize', fontSize: 'var(--text-sm)' }),
    place('msClose', BUTTON, 'Close Money', 'msTop', BTN_ICON('icon-x', 'Close')),

    group('msBody', 'The list and the pane', 'msCard', {
      flexDirection: 'row',
      alignItems: 'stretch',
      sizeMode: 'explicit',
      width: pct(100),
      height: pct(100),
      cssClassName: 'planner-money-body',
      styleCss: 'overflow: hidden; min-height: 0; flex: 1 1 0;'
    }),
    group('msList', 'The list', 'msBody', {
      flexDirection: 'column',
      alignItems: 'stretch',
      sizeMode: 'explicit',
      width: pct(60),
      height: pct(100),
      backgroundColor: 'var(--background)',
      borderRightStyle: 'solid',
      borderRightWidth: 'var(--border-1)',
      borderRightColor: 'var(--border)',
      cssClassName: 'planner-over-col planner-money-list'
    }),
    group('msScroll', 'What is in it', 'msList', {
      ...COLUMN('var(--space-1)'),
      paddingLeft: 'var(--space-2)',
      paddingRight: 'var(--space-2)',
      paddingTop: 'var(--space-1)',
      paddingBottom: 'var(--space-3)',
      styleCss: 'overflow: auto; flex: 1 1 0; min-height: 0;'
    }),
    place('msEach', FOR_EACH, 'One group per month', 'msScroll', { template: C.moneyMonth, templateType: 'explicit' }),
    text('msEmpty', 'When there is nothing', 'msScroll', '', { ...wide(T_META), marginLeft: 'var(--space-2)', marginTop: 'var(--space-3)' }),
    place('msMore', BUTTON, 'Show three more months', 'msScroll', { ...BTN_GHOST, label: 'Show three more months' }),
    group('msFoot', 'Add and record', 'msList', {
      ...ROW('var(--space-2)'),
      flexWrap: 'wrap',
      paddingLeft: 'var(--space-3)',
      paddingRight: 'var(--space-3)',
      paddingTop: 'var(--space-2)',
      paddingBottom: 'var(--space-2)',
      borderTopStyle: 'solid',
      borderTopWidth: 'var(--border-1)',
      borderTopColor: 'var(--border)'
    }),
    place('msAdd', BUTTON, 'Add money', 'msFoot', { ...BTN_PRIMARY, label: '+ Add money' }),
    place('msRecord', BUTTON, 'Record the balance', 'msFoot', { ...BTN_OUTLINE, label: 'Record balance' }),
    group('msSide', 'The one picked', 'msBody', {
      ...COLUMN('var(--space-0)'),
      width: pct(40),
      cssClassName: 'planner-over-col planner-money-side',
      paddingLeft: 'var(--space-4)',
      paddingRight: 'var(--space-4)',
      paddingTop: 'var(--space-3)',
      paddingBottom: 'var(--space-4)',
      styleCss: 'overflow: auto; min-height: 0;'
    }),
    ...MONEY_PARTS.map((pt) => place(pt.id, pt.type, pt.label, 'msSide'))
  ],
  connections: [
    wire('msIn', 'shown', 'msScrim', 'mounted'),
    // 🔴 `cssClassName` is one port: the wire REPLACES the parameter, so what it carries includes planner-over.
    wire('msIn', 'cardClass', 'msCard', 'cssClassName'),
    wire('msIn', 'balanceText', 'msBalance', 'text'),
    ...(['up', 'past', 'rec'] as const).flatMap((f) => {
      const id = f === 'up' ? 'msUp' : f === 'past' ? 'msPast' : 'msRec';
      return [wire('msIn', `${f}Fill`, id, 'backgroundColor'), wire('msIn', `${f}Ink`, id, 'color')];
    }),
    wire('msUp', 'onClick', 'msOut', 'showUp'),
    wire('msPast', 'onClick', 'msOut', 'showPast'),
    wire('msRec', 'onClick', 'msOut', 'showRec'),
    wire('msIn', 'groups', 'msEach', 'items'),
    wire('msEach', 'itemOutputSignal-pick', 'msOut', 'pick'),
    wire('msEach', 'itemOutput-key', 'msOut', 'key'),
    wire('msEach', 'itemOutput-kind', 'msOut', 'kind'),
    wire('msIn', 'empty', 'msEmpty', 'mounted'),
    wire('msIn', 'emptyText', 'msEmpty', 'text'),
    wire('msIn', 'moreShown', 'msMore', 'mounted'),
    wire('msMore', 'onClick', 'msOut', 'more'),
    wire('msAdd', 'onClick', 'msOut', 'add'),
    wire('msRecord', 'onClick', 'msOut', 'record'),
    wire('msClose', 'onClick', 'msOut', 'close'),
    // The scrim closes the modal; the modal itself does not (a click inside must not shut it).
    wire('msScrim', 'onClick', 'msOut', 'close'),
    ...MONEY_PARTS.flatMap((pt) => [
      ...pt.ins.map(([n]) => wire('msIn', under(pt.prefix, n), pt.id, n)),
      ...pt.outs.map(([n]) => wire(pt.id, n, 'msOut', under(pt.prefix, n)))
    ])
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
const PROJECT_DETAIL_BASE: Array<[string, string]> = [
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
/**
 * §4.2 — **Billing**, on an earning project's card: hourly or fixed and the terms (M21), the bills
 * it has, the next one, *this period* (M24: a fixed project's hours are a record and its €/h a
 * check on the price; an hourly one's hours are the next bill — M23), and what was paid when.
 * And M16: a move can become hoped money. These come from `Logic/Money pane`, not `Card rows`.
 */
const BILLING_FIELDS: Array<[string, string]> = [
  ['billingShown', 'boolean'], ['billingTerms', 'string'], ['billingRows', 'array'], ['hopeShown', 'boolean'], ['hopedText', 'string'], ['hasHoped', 'boolean']
];
const PROJECT_DETAIL_FIELDS: Array<[string, string]> = [...PROJECT_DETAIL_BASE, ...BILLING_FIELDS];

const PROJECT_DETAIL_OUTS: Array<[string, string]> = [
  ['plan', 'signal'], ['moveIt', 'signal'], ['takeOut', 'signal'], ['edit', 'signal'], ['close', 'signal'],
  ['planDate', 'string'], ['planHours', 'string'], ['addBill', 'signal'], ['addHope', 'signal']
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
  instantiates: [C.sparkline, C.dayBoxes, C.factRow, C.datePicker, C.keyLine],
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
    // M16 — the move can become hoped money, once; after that the card says what is hoped.
    place('pdHope', BUTTON, 'Add the move as hoped money', 'pdMove', { ...BTN_GHOST, label: 'Add as hoped money' }),
    text('pdHoped', 'The hoped money it already has', 'pdMove', '', wide(T_META)),

    group('pdBilling', 'Billing', 'pdRoot', COLUMN('var(--space-1-5)')),
    text('pdBillingLabel', 'Label', 'pdBilling', 'Billing', wide(T_LABEL)),
    text('pdBillingTerms', 'Hourly or fixed, and the terms', 'pdBilling', '', { ...wide(T_META), color: 'var(--foreground)' }),
    place('pdBillingEach', FOR_EACH, 'The bills, the next one, this period, the past', 'pdBilling', { template: C.keyLine, templateType: 'explicit' }),
    place('pdAddBill', BUTTON, 'Add a bill for this project', 'pdBilling', { ...BTN_GHOST, borderStyle: 'dashed', label: '+ Add a bill' }),

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
    wire('pdIn', 'hopeShown', 'pdHope', 'mounted'),
    wire('pdHope', 'onClick', 'pdOut', 'addHope'),
    wire('pdIn', 'hasHoped', 'pdHoped', 'mounted'),
    wire('pdIn', 'hopedText', 'pdHoped', 'text'),
    wire('pdIn', 'billingShown', 'pdBilling', 'mounted'),
    wire('pdIn', 'billingTerms', 'pdBillingTerms', 'text'),
    wire('pdIn', 'billingRows', 'pdBillingEach', 'items'),
    wire('pdAddBill', 'onClick', 'pdOut', 'addBill'),
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
  ['addBill', 'signal'], ['addHope', 'signal'],
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
    wire('pcDetail', 'addBill', 'pcOut', 'addBill'),
    wire('pcDetail', 'addHope', 'pcOut', 'addHope'),
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
  ['chaseShown', 'boolean'],
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
  ...iface(DRAWER_FIELDS, [['carry', 'signal'], ['drop', 'signal'], ['blockId', 'string'], ['close', 'signal'], ['chase', 'signal']]),
  repeats: { source: 'array', rowFields: CARRY_ROW_FIELDS.map(([n]) => n) },
  instantiates: [C.carryRow],
  nodes: [
    inputs('sdIn', 'Tonight', DRAWER_FIELDS),
    outputs('sdOut', 'What you chose', [['carry', 'signal'], ['drop', 'signal'], ['blockId', 'string'], ['close', 'signal'], ['chase', 'signal']]),
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
    // M15 — late client money is the first concern, and the drawer opens it where it can be ticked.
    place('sdChase', BUTTON, 'Open it in Money', 'sdCoach', { ...BTN_OUTLINE, label: 'Open it in Money' }),

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
    wire('sdIn', 'chaseShown', 'sdChase', 'mounted'),
    wire('sdChase', 'onClick', 'sdOut', 'chase'),
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
 * The numbers the week is worked out from, and no money list (M1, M2: money has its own modal
 * now). §4.3: Settings keeps the focus ceiling and three money numbers a money item cannot say —
 * **your usual hourly rate** (what the money still to earn by the hour is divided by, and where a
 * new hourly project starts — M22), the **savings target** added to break-even to make the target
 * (M13), and the **lowest balance before red** (M14). The household need, the partner's money and
 * the four days money moves are money items now.
 *
 * Q3 rules that the month plan is **not** written automatically on the 1st — *Plan this month*
 * writes it, and the week asks for it until it exists.
 */
const SETTINGS_FIELDS: Array<[string, string]> = [
  ['rate', 'string'], ['focusHours', 'string'], ['savingsTarget', 'string'], ['lowWaterMark', 'string'],
  ['targetLine', 'string'], ['planLine', 'string'], ['shown', 'boolean']
];
const SETTINGS_OUTS: Array<[string, string]> = [
  ['rate', 'string'], ['focusHours', 'string'], ['savingsTarget', 'string'], ['lowWaterMark', 'string'],
  ['save', 'signal'], ['planMonth', 'signal'], ['close', 'signal'], ['openMoney', 'signal']
];

const SETTINGS_NUMBERS: Array<[string, string, string]> = [
  ['rate', 'Your usual hourly rate, €', 'stRate'],
  ['focusHours', 'Focused hours a day', 'stFocus'],
  ['savingsTarget', 'Savings target, € a month', 'stSavings'],
  ['lowWaterMark', 'Lowest balance before red, €', 'stLow']
];

const SETTINGS_SHEET: Tpl010Component = {
  path: 'Week/Settings sheet',
  description: 'The numbers the week is worked out from: your usual hourly rate, your focus ceiling, what you want to save a month, and how low the balance may go before it turns red. Money itself is in the Money modal.',
  ...iface(SETTINGS_FIELDS, SETTINGS_OUTS),
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
      maxWidth: px(480),
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
    group('stMoneyRow', 'Where the money went', 'stCard', { ...ROW('var(--space-2)'), flexWrap: 'wrap' }),
    text('stMoneyWords', 'Where the money is now', 'stMoneyRow', 'What comes in and goes out lives in Money now.', wide(T_META)),
    place('stToMoney', BUTTON, 'Open Money', 'stMoneyRow', { ...BTN_GHOST, label: 'Open Money (€)' }),
    text('stTarget', 'What these come to', 'stCard', '', wide(T_META)),
    ...SETTINGS_NUMBERS.map(([, label, id]) => place(id, TEXT_INPUT, label, 'stCard', BOX(label, 'number'))),
    text('stPlanLine', 'Whether this month is planned', 'stCard', '', wide(T_META)),
    group('stButtons', 'Buttons', 'stCard', { ...ROW('var(--space-2)'), flexWrap: 'wrap' }),
    place('stSave', BUTTON, 'Save', 'stButtons', { ...BTN_PRIMARY, label: 'Save' }),
    place('stPlan', BUTTON, 'Plan this month', 'stButtons', { ...BTN_OUTLINE, label: 'Plan this month' })
  ],
  connections: [
    wire('stIn', 'shown', 'stScrim', 'mounted'),
    wire('stIn', 'targetLine', 'stTarget', 'text'),
    wire('stIn', 'planLine', 'stPlanLine', 'text'),
    // 🔴 `text` is the box's OUTPUT. Putting a value INTO it is `startValue`.
    ...SETTINGS_NUMBERS.flatMap(([name, , id]) => [wire('stIn', name, id, 'startValue'), wire(id, 'onTextChanged', 'stOut', name)]),
    wire('stSave', 'onClick', 'stOut', 'save'),
    wire('stPlan', 'onClick', 'stOut', 'planMonth'),
    wire('stToMoney', 'onClick', 'stOut', 'openMoney'),
    wire('stClose', 'onClick', 'stOut', 'close'),
    wire('stScrim', 'onClick', 'stOut', 'close')
  ]
};

// ════════════════════════════════════════════════════════════════════════════
// Logic — the only place a number or a sentence is decided
// ════════════════════════════════════════════════════════════════════════════

const PLANNER_DATA_INS: Array<[string, string]> = [['refresh', 'signal'], ['previousWeek', 'signal'], ['nextWeek', 'signal'], ['thisWeek', 'signal']];
const PLANNER_DATA_OUTS: Array<[string, string]> = [
  ['projects', 'array'], ['blocks', 'array'], ['monthPlans', 'array'], ['moneyItems', 'array'], ['moneyMarks', 'array'],
  ['balanceReadings', 'array'], ['settings', 'array'], ['moveBlocks', 'array'], ['weekStart', 'string'], ['weekLabel', 'string'],
  ['month', 'string'], ['marksSince', 'string'], ['loaded', 'signal']
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
  description: 'The eight queries the week is drawn from: your projects, the blocks in the weeks on screen, the blocks from four weeks back, this month’s plan, your money items, the marks on them from thirteen months back, your balance readings, and your settings.',
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
// M10 — the marks on money items, from thirteen months back: a year of Past, and the month before it.
var since = new Date(startOfToday().getFullYear(), startOfToday().getMonth() - 13, 1);
Outputs.marksSince = dayKey(since);
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
    // M10 — every money item: they are few, and ending one keeps it (its `until`), so it is never deleted.
    logic('pnItems', QUERY, 'Your money items', {
      collectionName: 'MoneyItem',
      ...QUERY_OFF,
      storageLimit: 500,
      visualSort: [{ property: 'position', order: 'ascending' }]
    }),
    // The marks grow for ever — one per tick — so they are asked for from thirteen months back.
    logic('pnMarks', QUERY, 'The marks on them, from thirteen months back', {
      collectionName: 'MoneyMark',
      ...QUERY_OFF,
      'runOnChange-qp-marksSince': false,
      storageLimit: 1000,
      visualFilter: { combinator: 'and', rules: [{ property: 'occurs', operator: 'greater than or equal to', input: 'marksSince' }] },
      visualSort: [{ property: 'occurs', order: 'ascending' }]
    }),
    // M11 — only the latest reading is where a projection starts; a few are kept for the summary.
    logic('pnReadings', QUERY, 'Your latest balance readings', {
      collectionName: 'BalanceReading',
      ...QUERY_OFF,
      storageLimit: 12,
      visualSort: [{ property: 'date', order: 'descending' }]
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
    wire('pnWindow', 'out-marksSince', 'pnMarks', 'qp-marksSince'),
    wire('pnWindow', 'out-marksSince', 'pnOut', 'marksSince'),
    ...['pnProjects', 'pnBlocks', 'pnMoveBlocks', 'pnMonth', 'pnItems', 'pnMarks', 'pnReadings', 'pnSettings'].map((q) => wire('pnReady', 'ontrue', q, 'storageFetch')),

    wire('pnProjects', 'items', 'pnOut', 'projects'),
    wire('pnBlocks', 'items', 'pnOut', 'blocks'),
    wire('pnMoveBlocks', 'items', 'pnOut', 'moveBlocks'),
    wire('pnMonth', 'items', 'pnOut', 'monthPlans'),
    wire('pnItems', 'items', 'pnOut', 'moneyItems'),
    wire('pnMarks', 'items', 'pnOut', 'moneyMarks'),
    wire('pnReadings', 'items', 'pnOut', 'balanceReadings'),
    wire('pnSettings', 'items', 'pnOut', 'settings'),
    wire('pnBlocks', 'fetched', 'pnOut', 'loaded'),
    wire('pnProjects', 'failure', 'pnLoadProblem', 'do')
  ]
};

const ENVELOPES_INS: Array<[string, string]> = [
  ['projects', 'array'], ['blocks', 'array'], ['monthPlans', 'array'], ['settings', 'array'], ['weekStart', 'string'], ['targetHours', 'number']
];
const ENVELOPES_OUTS: Array<[string, string]> = [
  ['rows', 'array'], ['target', 'number'], ['billableUsed', 'number'], ['billableLeft', 'number'],
  ['perDay', 'number'], ['buildingLeft', 'number'], ['daysLeft', 'number'], ['focusHours', 'number'],
  ['hasPlan', 'boolean'], ['planLine', 'string']
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
 * Target is M22's, handed in by `Logic/Money` as `targetHours`. With 55 hours to reach, 41 logged
 * and 5 working days left, `55 − 41 = 14`, and `14 ÷ 5 = 2.8`,
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

var focus = num(settings.focusHours, 6);
// R2 — the month's target is hours, never a project price. M22 — worked out from the money, in Logic/Money.
var target = Math.max(0, Math.round(num(Inputs.targetHours, 0)));

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
  : 'This month has no plan yet. Press Plan this month and the envelopes start from your settings.';`
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

/** What every money Function is handed: the three collections, the projects and their time, the settings. */
const MONEY_DATA_INS: Array<[string, string]> = [
  ['items', 'array'], ['marks', 'array'], ['readings', 'array'], ['projects', 'array'], ['blocks', 'array'], ['settings', 'array'], ['since', 'string']
];
/** The opening lines every money Function shares: the context, the clock, the settings. */
const MONEY_OPEN = `var settings = (Inputs.settings || [])[0] || {};
var today = dayKey(startOfToday());
var ctx = moneyContext(Inputs.items, Inputs.marks, Inputs.projects, Inputs.blocks, today, Inputs.since);
var readings = Inputs.readings || [];
var low = num(settings.lowWaterMark, 0);`;

const MONEY_INS: Array<[string, string]> = [...MONEY_DATA_INS, ['filter', 'string'], ['horizon', 'number'], ['sel', 'string']];
const MONEY_OUTS: Array<[string, string]> = [
  // The modal's list.
  ['groups', 'array'], ['empty', 'boolean'], ['emptyText', 'string'], ['moreShown', 'boolean'], ['modalBalance', 'string'],
  ['upFill', 'string'], ['upInk', 'string'], ['pastFill', 'string'], ['pastInk', 'string'], ['recFill', 'string'], ['recInk', 'string'],
  // The bottom of the week (M14).
  ['stripRows', 'array'], ['stripBalance', 'string'], ['monthName', 'string'], ['monthText', 'string'],
  ['mightShown', 'boolean'], ['mightLead', 'string'], ['mightRows', 'array'], ['lowText', 'string'], ['lowColor', 'string'], ['footText', 'string'],
  // What the rest of the week needs from the money.
  ['targetHours', 'number'], ['targetLine', 'string'], ['lateCount', 'string'], ['hasLate', 'boolean'],
  ['lateConcern', 'string'], ['lateKey', 'string']
];

/**
 * **TPL-010-M — the money, drawn.** Replaces `Logic/Cash line`. From the items, their marks and
 * the latest balance reading (`MONEY_FNS`, run as gates with the clock held), it draws:
 *
 * - **the modal's list** — *Upcoming* (Late first, then month by month to the horizon, each month
 *   with in, out, net and where it ends; a client bill twice, on the day it goes out and the day it
 *   is due; hoped money dashed, with no balance after it), *Past* (what was ticked, newest first,
 *   with days early or late), *Recurring* (in, out, clients, hoped, each with its schedule in words);
 * - **the bottom of the week** (M14) — the month, might earn, the lowest point, the six boxes;
 * - **the Billable target** the envelopes are budgeted from (M22), the **late count** on the €,
 *   and the **late client money** the evening drawer raises first (M15).
 */
const MONEY: Tpl010Component = {
  path: 'Logic/Money',
  description: 'The money, drawn: the Money modal’s list (upcoming, past or recurring), the lines and boxes at the bottom of the week, the month’s billable target, and what is late.',
  ...iface(MONEY_INS, MONEY_OUTS),
  nodes: [
    inputs('moIn', 'The money', MONEY_INS),
    outputs('moOut', 'What to draw', MONEY_OUTS),
    derive(
      'moWork',
      'Draw the money',
      `${PLANNER_FNS}${MONEY_FNS}${MONEY_OPEN}
var filter = String(Inputs.filter || 'up');
var sel = String(Inputs.sel || '');
var MUTED = 'var(--muted-foreground)', INK = 'var(--foreground)', LATE = 'var(--env-hobby-ink)', IN = 'var(--env-billable-ink)';
function amountColor(a) { return a > 0 ? IN : INK; }
function selected(key, kind) { return sel === key + '|' + kind; }
function row(key, kind, x) {
  var on = selected(key, kind);
  return {
    key: key, kind: kind,
    dateText: x.date || '', dateColor: x.late ? LATE : MUTED,
    label: x.label || '', labelColor: x.quiet ? MUTED : INK,
    sub: x.sub || '', subColor: MUTED,
    amountText: x.amount || '', amountColor: x.amountColor || INK,
    afterText: x.after || '', afterColor: x.afterColor || MUTED,
    tickShown: kind !== 'item' && !x.dashed,
    tickFill: x.done ? 'var(--foreground)' : 'transparent', tickInk: x.done ? 'var(--surface)' : 'transparent',
    rowBackground: on ? 'var(--surface)' : 'transparent',
    rowEdge: on ? 'var(--border-strong)' : x.dashed ? 'var(--border-strong)' : 'transparent',
    rowEdgeStyle: x.dashed ? 'dashed' : 'solid'
  };
}
function payRow(o, after, late) {
  var bits = [];
  var pn = projectName(o);
  if (pn && String(o.it.label || '').indexOf(pn) !== 0) bits.push(pn);
  if (o.it.repeat && o.it.repeat !== 'once') bits.push('\\u21bb ' + repeatWord(o.it));
  if (o.changed) bits.push('usually ' + mEur(o.it.amount));
  if (o.moved) bits.push('moved from ' + mShort(o.occurs));
  if (o.paid && !o.closed) bits.push(mEur(o.paid) + ' of ' + mEur(o.amount) + ' paid');
  if (o.hoursBill && !o.sentOn) bits.push(hText(o.hours) + ' h \\u00d7 ' + mEur(o.project ? o.project.rate : 0) + ', from your hours');
  if (o.client && o.sentOn) bits.push('bill sent ' + mShort(o.sentOn));
  if (late) { var d = mBetween(o.date, today); bits.push((o.client ? 'due ' : '') + d + ' day' + (d === 1 ? '' : 's') + ' ago'); }
  if (o.hoped) bits.push('hoped ' + o.likelihood + '%');
  var shown = o.hoped ? o.amount : o.remaining;
  return row(o.key, 'pay', {
    date: mShort(o.date), late: late, label: o.it.label, quiet: o.hoped, sub: bits.join(' \\u00b7 '),
    amount: mEur(shown, true), amountColor: o.hoped ? MUTED : amountColor(shown),
    after: o.hoped ? '\\u2248 ' + mEur(o.amount * o.likelihood / 100) + ' weighted' : after === undefined ? '' : mEur(after),
    afterColor: !o.hoped && after !== undefined && after < low ? 'var(--destructive)' : MUTED,
    dashed: o.hoped
  });
}
function billRow(o, late) {
  return row(o.key, 'bill', {
    date: mShort(o.billOut), late: late, label: o.it.label + ' \\u00b7 bill goes out', quiet: true,
    sub: (late ? 'not sent yet \\u00b7 ' : '') + (o.hoursBill ? hText(o.hours) + ' h \\u00d7 ' + mEur(o.project ? o.project.rate : 0) + ' so far \\u00b7 ' : '') + 'due ' + mDay(o.date),
    amount: '(' + mEur(o.amount) + ')', amountColor: MUTED
  });
}

// ── The modal's list ──
// Three months ahead, and three more each time Show three more months is pressed (a Counter).
var months = 3 + 3 * Math.max(0, Math.round(num(Inputs.horizon, 0)));
var horizon = mMonthEnd(mAddMonths(today.slice(0, 8) + '01', months, false));
var p = projection(ctx, readings, horizon);
var groups = [];
if (filter === 'past') {
  var ev = [];
  for (var i = 0; i < p.occs.length; i++) {
    var o = p.occs[i];
    if (o.payments.length || o.lostOn || o.skip) ev.push({ d: o.lostOn || o.lastOn || o.date, o: o, t: 'pay' });
    if (o.sentOn) ev.push({ d: o.sentOn, o: o, t: 'sent' });
  }
  ev.sort(function (a, b) { return a.d < b.d ? 1 : a.d > b.d ? -1 : 0; });
  var byMonth = {}, order = [];
  for (var e = 0; e < ev.length; e++) {
    var x = ev[e], mk = mMonth(x.d), oo = x.o;
    if (!byMonth[mk]) { byMonth[mk] = []; order.push(mk); }
    if (x.t === 'sent') {
      byMonth[mk].push(row(oo.key, 'bill', { date: mShort(x.d), done: true, label: oo.it.label + ' \\u00b7 bill sent', quiet: true, sub: 'due ' + mDay(oo.date), amount: '(' + mEur(oo.amount) + ')', amountColor: MUTED }));
      continue;
    }
    var sub = [], moved = oo.paid;
    if (oo.skip) { sub.push('skipped'); moved = 0; }
    else if (oo.lostOn) sub.push(oo.paid ? mEur(oo.paid) + ' paid \\u00b7 ' + mEur(oo.amount - oo.paid) + (oo.client ? ' lost' : ' less than expected') : mEur(oo.amount) + (oo.client ? ' lost' : ' did not happen'));
    else if (!oo.closed) sub.push('part paid \\u00b7 ' + mEur(oo.remaining) + ' still ' + (oo.amount > 0 ? 'owed' : 'to pay'));
    if (!oo.skip && oo.lastOn) {
      var late2 = mBetween(oo.date, oo.lastOn);
      if (oo.client) sub.push('paid ' + mShort(oo.lastOn) + ' \\u00b7 ' + (late2 > 0 ? late2 + ' day' + (late2 === 1 ? '' : 's') + ' late' : late2 < 0 ? (-late2) + ' day' + (late2 === -1 ? '' : 's') + ' early' : 'on time'));
      else sub.push((oo.amount > 0 ? 'came in ' : 'paid ') + mShort(oo.lastOn) + (oo.lastOn !== oo.date ? ' \\u00b7 was due ' + mShort(oo.date) : ''));
    }
    if (oo.changed && !oo.lostOn) sub.push('usually ' + mEur(oo.it.amount));
    byMonth[mk].push(row(oo.key, 'pay', { date: mShort(x.d), done: true, label: oo.it.label, sub: sub.join(' \\u00b7 '), amount: moved ? mEur(moved, true) : '\\u2014', amountColor: amountColor(moved) }));
  }
  for (var g = 0; g < order.length; g++) groups.push({ name: MONTH_LONG[Number(order[g].slice(5, 7)) - 1] + ' ' + order[g].slice(0, 4), nameColor: MUTED, summary: '', rows: byMonth[order[g]] });
} else if (filter === 'rec') {
  var sets = [['In', []], ['Out', []], ['Clients', []], ['Hoped', []]];
  for (var r = 0; r < ctx.items.length; r++) {
    var it = ctx.items[r];
    if (!it.repeat || it.repeat === 'once') continue;
    var hoped = num(it.likelihood, 100) < 100;
    var at = hoped ? 3 : isClient(it, ctx.projects) ? 2 : num(it.amount, 0) >= 0 ? 0 : 1;
    sets[at][1].push(it);
  }
  for (var s2 = 0; s2 < sets.length; s2++) {
    var list = sets[s2][1];
    if (!list.length) continue;
    var tot = 0;
    for (var t = 0; t < list.length; t++) if (activeOn(list[t], today)) tot += perMonth(list[t]);
    groups.push({
      name: sets[s2][0], nameColor: MUTED,
      summary: mEur(tot, true) + ' a month' + (sets[s2][0] === 'Hoped' ? ', before the odds' : ''),
      rows: list.map(function (it2) {
        var ended = !activeOn(it2, today);
        return row(it2.id, 'item', {
          date: ended ? 'ended' : repeatWord(it2), quiet: ended, label: it2.label,
          sub: scheduleWords(it2, today) + (num(it2.likelihood, 100) < 100 ? ' \\u00b7 ' + Math.round(num(it2.likelihood, 100)) + '%' : ''),
          amount: it2.fromHours ? 'from hours' : mEur(it2.amount, true), amountColor: amountColor(num(it2.amount, 0)),
          after: it2.repeat === 'monthly' ? '' : mEur(perMonth(it2), true) + ' a month'
        });
      })
    });
  }
} else {
  var lateBills = [], futureBills = [];
  for (var b = 0; b < p.bills.length; b++) (p.bills[b].billOut < today ? lateBills : futureBills).push(p.bills[b]);
  if (p.late.length || lateBills.length) {
    var lateRows = [];
    for (var l = 0; l < p.late.length; l++) lateRows.push(payRow(p.late[l], p.after[p.late[l].key], true));
    for (var lb = 0; lb < lateBills.length; lb++) lateRows.push(billRow(lateBills[lb], true));
    groups.push({ name: 'Late', nameColor: LATE, summary: 'not ticked, counted as if today', rows: lateRows });
  }
  var lines = [];
  for (var f = 0; f < p.future.length; f++) lines.push({ d: p.future[f].date, o: p.future[f], t: 'pay' });
  for (var h = 0; h < p.hoped.length; h++) lines.push({ d: p.hoped[h].date, o: p.hoped[h], t: 'hope' });
  for (var fb = 0; fb < futureBills.length; fb++) lines.push({ d: futureBills[fb].billOut, o: futureBills[fb], t: 'bill' });
  lines.sort(function (a, b2) { return a.d < b2.d ? -1 : a.d > b2.d ? 1 : a.t === 'bill' ? -1 : b2.t === 'bill' ? 1 : 0; });
  var carry = p.late.length ? p.after[p.late[p.late.length - 1].key] : p.now.balance;
  var mks = [];
  for (var m2 = 0; m2 < lines.length; m2++) if (mks.indexOf(mMonth(lines[m2].d)) < 0) mks.push(mMonth(lines[m2].d));
  for (var k = 0; k < mks.length; k++) {
    var inn = 0, out = 0, rows = [];
    for (var z = 0; z < lines.length; z++) {
      var ln = lines[z];
      if (mMonth(ln.d) !== mks[k]) continue;
      if (ln.t === 'bill') { rows.push(billRow(ln.o, false)); continue; }
      if (ln.t === 'pay') { if (ln.o.remaining > 0) inn += ln.o.remaining; else out -= ln.o.remaining; carry = p.after[ln.o.key]; }
      rows.push(payRow(ln.o, ln.t === 'pay' ? p.after[ln.o.key] : undefined, false));
    }
    groups.push({
      name: MONTH_LONG[Number(mks[k].slice(5, 7)) - 1] + (mks[k].slice(0, 4) === today.slice(0, 4) ? '' : ' ' + mks[k].slice(0, 4)),
      nameColor: MUTED,
      summary: 'in ' + mEur(inn) + ' \\u00b7 out ' + mEur(out) + ' \\u00b7 net ' + mEur(inn - out, true) + ' \\u00b7 ends at ' + mEur(carry),
      rows: rows
    });
  }
}
Outputs.groups = groups;
Outputs.empty = groups.length === 0;
Outputs.emptyText = filter === 'past' ? 'Nothing ticked yet. Tick a line in Upcoming when it happens.' : filter === 'rec' ? 'Nothing repeats yet. Add money and choose how often.' : 'Nothing coming in or going out. Add money to start.';
Outputs.moreShown = filter === 'up';
function tab(on) { return on ? 'var(--surface)' : 'transparent'; }
function tabInk(on) { return on ? INK : MUTED; }
Outputs.upFill = tab(filter === 'up'); Outputs.upInk = tabInk(filter === 'up');
Outputs.pastFill = tab(filter === 'past'); Outputs.pastInk = tabInk(filter === 'past');
Outputs.recFill = tab(filter === 'rec'); Outputs.recInk = tabInk(filter === 'rec');
var now = p.now;
var readText = now.hasReading ? 'read ' + mDay(now.readOn) : 'no reading yet';
Outputs.modalBalance = 'Balance ' + mEur(now.balance) + ' \\u00b7 ' + readText + (now.since ? ' + ' + now.since + ' tick' + (now.since === 1 ? '' : 's') : '');

// ── The bottom of the week (M14) ──
var t2 = moneyTargets(ctx, settings);
var ml = monthLine(ctx, t2);
Outputs.stripBalance = 'Balance ' + mEur(now.balance) + ' \\u00b7 ' + readText + (now.since ? ', ' + now.since + ' tick' + (now.since === 1 ? '' : 's') + ' since' : '');
Outputs.monthName = ml.name;
Outputs.monthText = ml.text;
var me = mightEarn(ctx);
Outputs.mightShown = me.nexts.length > 0;
Outputs.mightLead = mEur(me.weighted) + ' more, weighted (' + mEur(me.all) + ' if all come through):';
var might = [];
for (var n = 0; n < me.nexts.length; n++) {
  var mo = me.nexts[n], pr = mo.project;
  var mv = pr && pr.move ? String(pr.move) : '';
  might.push({ projectId: mo.it.projectId || '', name: pr ? String(pr.name || '') : mo.it.label, odds: mo.likelihood + '%', move: mv ? '\\u2192 ' + mv.charAt(0).toLowerCase() + mv.slice(1) : '' });
}
Outputs.mightRows = might;
var lo = lowestPoint(ctx, readings);
var red = lo.balance < low;
Outputs.lowText = 'Lowest in six weeks: ' + mEur(lo.balance) + ' on ' + mDay(lo.date) + (red ? ', under your ' + mEur(low) + ' line.' : '.');
Outputs.lowColor = red ? 'var(--destructive)' : INK;
var six = projection(ctx, readings, mAddDays(today, 42));
var boxes = [], candidates = six.late.concat(six.future.filter(function (x2) { return x2.it.repeat !== 'weekly'; }));
for (var c = 0; c < candidates.length && boxes.length < 6; c++) {
  var bo = candidates[c], isLate = bo.date < today, aft = six.after[bo.key];
  boxes.push({
    key: bo.key,
    when: isLate ? 'Due ' + mShort(bo.date) + ' \\u00b7 late' : mDay(bo.date),
    whenColor: isLate ? LATE : MUTED,
    amount: mEur(bo.remaining, true),
    amountColor: amountColor(bo.remaining),
    label: bo.it.label + (bo.paid && !bo.closed ? ' \\u00b7 the rest of ' + mEur(bo.amount) : ''),
    running: 'after: ' + mEur(aft),
    low: aft < low,
    edge: aft < low ? 'var(--destructive)' : isLate ? 'var(--env-hobby)' : 'var(--border)',
    background: isLate ? 'var(--env-hobby-soft)' : 'var(--background)'
  });
}
Outputs.stripRows = boxes;
var weekly = [];
for (var w = 0; w < ctx.items.length; w++) {
  var wi = ctx.items[w];
  if (wi.repeat === 'weekly' && num(wi.likelihood, 100) >= 100 && activeOn(wi, today)) weekly.push(wi.label + ' ' + mEur(wi.amount));
}
Outputs.footText = weekly.length ? 'Weekly items are in every balance but get no box: ' + weekly.join(', ') + '.' : '';

// ── What the rest of the week needs ──
Outputs.targetHours = t2.hours;
Outputs.targetLine = t2.rate > 0
  ? 'Break-even ' + mEur2(t2.breakEven) + ', and with your ' + mEur(num(settings.savingsTarget, 0)) + ' savings target the month needs ' + mEur2(t2.target) +
    '. The fixed bills going out this month cover ' + mEur(t2.fixedSum) + '; the rest at ' + mEur(t2.rate) + ' an hour is ' + t2.hourly + ' h, and ' +
    (t2.agreed ? 'with ' + t2.agreed + ' agreed hours on fixed work ' : '') + 'that is ' + t2.hours + ' billable hours. Money shows the sum.'
  : 'Put your usual hourly rate in and the month gets a billable target.';
var lateAll = p.late.length;
Outputs.lateCount = String(lateAll);
Outputs.hasLate = lateAll > 0;
var lc = null;
for (var q3 = 0; q3 < p.late.length; q3++) if (p.late[q3].client) { lc = p.late[q3]; break; }
// M15 — late client money is the evening's first concern; a late cost is not (it is almost always paid and not ticked).
Outputs.lateConcern = lc ? 'One thing: ' + (projectName(lc) || lc.it.label) + '\\u2019s ' + mEur(lc.remaining) + (lc.paid ? ' (the rest of the bill)' : '') +
  ' was due on ' + mDay(lc.date) + ' and is not ticked. Chase it, or tick it.' : '';
Outputs.lateKey = lc ? lc.key : '';`
    )
  ],
  connections: [
    ...MONEY_INS.map(([n]) => wire('moIn', n, 'moWork', `in-${n}`)),
    ...MONEY_OUTS.map(([n]) => wire('moWork', `out-${n}`, 'moOut', n))
  ]
};

const PANE_PART_OUTS: Array<[string, string]> = MONEY_PARTS.flatMap((pt) => pt.ins.map(([n, t]): [string, string] => [under(pt.prefix, n), t]));
const MONEY_VIEW_INS: Array<[string, string]> = [...MONEY_DATA_INS, ['open', 'boolean'], ['sel', 'string'], ['mode', 'string'], ['itemId', 'string'], ['cardProject', 'string']];
const MONEY_VIEW_OUTS: Array<[string, string]> = [
  ['cardClass', 'string'], ...PANE_PART_OUTS, ...BILLING_FIELDS,
  ['isNewItem', 'boolean'], ['editItemId', 'string'], ['endItemId', 'string'], ['agreeItemId', 'string'], ['changeKey', 'string'], ['pickedItemId', 'string']
];

/**
 * **TPL-010-M — the right-hand pane, and the project card's Billing.** What is picked decides the
 * pane: nothing is the summary of the month's target (M12, M13, M22); a line is that repeat
 * (§4.1) — its tick, *Change this one*, *Skip*, *Mark as lost*, a bill's *Mark as sent*, and the
 * item it comes from; a mode is the item editor (new, a project's bill — M5 — or its hoped money —
 * M16), *End it*, or *Record balance* (M11). For the card it draws **Billing** (§4.2, M21–M24).
 */
const MONEY_VIEW: Tpl010Component = {
  path: 'Logic/Money pane',
  description: 'What the Money modal’s right-hand side shows — the month’s target, one repeat with what you can do to it, the item editor, ending an item, or recording the balance — and the Billing on a project’s card.',
  ...iface(MONEY_VIEW_INS, MONEY_VIEW_OUTS),
  nodes: [
    inputs('mvpIn', 'What is picked', MONEY_VIEW_INS),
    outputs('mvpOut', 'What to show', MONEY_VIEW_OUTS),
    derive(
      'mvpWork',
      'Fill the pane',
      `${PLANNER_FNS}${MONEY_FNS}${MONEY_OPEN}
var open = Inputs.open === true;
var sel = String(Inputs.sel || ''), mode = String(Inputs.mode || ''), itemArg = String(Inputs.itemId || '');
var parts = sel.split('|');
var MUTED = 'var(--muted-foreground)', INK = 'var(--foreground)', LATE = 'var(--env-hobby-ink)';
function itemById(id) { for (var i = 0; i < ctx.items.length; i++) if (ctx.items[i].id === id) return ctx.items[i]; return null; }
var editing = mode === 'edit' || mode === 'new' || mode === 'newBill' || mode === 'newHope';
var picked = null, kind = parts[2] || 'pay';
if (!editing && mode !== 'end' && mode !== 'balance' && parts.length >= 2) {
  var pit = itemById(parts[0]);
  // Only a repeat that still exists: an item ended before it (M10) has no such repeat any more.
  if (pit && mOk(parts[1]) && repeatsOf(pit, parts[1]).indexOf(parts[1]) >= 0) picked = occOf(ctx, pit, parts[1]);
}
var showSum = open && !editing && mode !== 'end' && mode !== 'balance' && !picked;
Outputs.cardClass = 'planner-over planner-money' + (open && (editing || mode === 'end' || mode === 'balance' || !!picked) ? ' planner-money-pane' : '');

// ── The summary (M12, M13, M22) ──
var t = moneyTargets(ctx, settings);
var lines = [];
function line(label, value) { lines.push({ label: label, value: value }); }
line('Going out, a month', mEur2(t.out));
for (var o1 = 0; o1 < t.outs.length; o1++) line('   ' + t.outs[o1].label + (t.outs[o1].repeat !== 'monthly' ? ' (' + mEur(t.outs[o1].amount) + ' ' + repeatWord(t.outs[o1]) + ')' : ''), mEur2(-perMonth(t.outs[o1])));
line('Coming in, a month', mEur2(t.inn));
for (var i1 = 0; i1 < t.ins.length; i1++) line('   ' + t.ins[i1].label + (t.ins[i1].repeat !== 'monthly' ? ' (' + mEur(t.ins[i1].amount) + ' ' + repeatWord(t.ins[i1]) + ')' : ''), mEur2(perMonth(t.ins[i1])));
line('Break-even', mEur2(t.breakEven));
line('+ savings target (Settings)', mEur(num(settings.savingsTarget, 0)));
line('Target', mEur2(t.target));
for (var f1 = 0; f1 < t.fixed.length; f1++) line('\\u2212 ' + projectName(t.fixed[f1]) + ', fixed, bills ' + mShort(t.fixed[f1].billOut || t.fixed[f1].date), mEur(t.fixed[f1].amount));
line('To earn by the hour', mEur2(t.byHour));
line('\\u00f7 your usual rate, ' + mEur(t.rate) + ' an hour', t.hourly + ' h');
for (var a1 = 0; a1 < t.agreedIds.length; a1++) line('+ ' + String(ctx.projects[t.agreedIds[a1]].name || '') + '\\u2019s agreed hours', num(ctx.projects[t.agreedIds[a1]].agreedHours, 0) + ' h');
line('Billable this month', t.hours + ' h');
Outputs.sumShown = showSum;
Outputs.sumLines = lines;
Outputs.sumNote = 'A fixed bill is covered however long the work takes, so it comes off before the hours are worked out; the hours you agreed still go in the envelope. Client money is what the billable hours turn into. One-off items are not in the target; they show on the cash line on their day.';
var now = balanceNow(ctx, readings);
var lo = lowestPoint(ctx, readings);
Outputs.sumBalanceLines = [
  { label: now.hasReading ? 'Read ' + mDay(now.readOn) : 'No reading yet', value: mEur(now.readAmount) },
  { label: 'Ticked since', value: mEur(now.balance - now.readAmount, true) },
  { label: 'Now', value: mEur(now.balance) },
  { label: 'Lowest in six weeks', value: mEur(lo.balance) + ' \\u00b7 ' + mDay(lo.date) }
];

// ── One repeat (§4.1) ──
var o = picked;
Outputs.rpShown = open && !!o;
Outputs.rpKey = sel + '|' + mode;
var isBill = !!o && kind === 'bill';
var late = !!o && !o.closed && !o.hoped && o.date < today;
var it = o ? o.it : {};
var pn = o ? projectName(o) : '';
Outputs.rpTitle = o ? String(it.label || '') + (isBill ? ' \\u00b7 the bill' : '') : '';
Outputs.rpSub = !o ? '' : isBill ? (pn + ' \\u00b7 ' + mEur(o.amount) + ' \\u00b7 due ' + mDay(o.date))
  : (o.client ? 'Due ' : o.amount > 0 ? 'Comes in ' : 'Goes out ') + mDay(o.date) + (o.moved ? ' (moved from ' + mDay(o.occurs) + ')' : '') +
    (late ? ' \\u00b7 ' + mBetween(o.date, today) + ' days late' : '') + (pn && String(it.label || '').indexOf(pn) !== 0 ? ' \\u00b7 ' + pn : '');
Outputs.rpSubColor = late ? LATE : MUTED;
Outputs.rpAmountText = o ? mEur(o.amount, true) + (o.changed ? '  \\u00b7 usually ' + mEur(it.amount) : '') : '';
Outputs.rpAmountColor = o && o.amount > 0 ? 'var(--env-billable-ink)' : INK;
var detail = [];
if (o && o.hoped) detail.push('Hoped, ' + o.likelihood + '%: about ' + mEur(o.amount * o.likelihood / 100) + ' weighted, and never in a balance.');
if (o && o.hoursBill) detail.push(hText(o.hours) + ' h logged \\u00d7 ' + mEur(o.project ? o.project.rate : 0) + ' an hour, so far. It grows as hours are logged, until the bill is marked sent.');
if (o && o.client && !isBill) detail.push(o.sentOn ? 'Bill sent ' + mDay(o.sentOn) + '.' : o.billOut ? 'Bill goes out ' + mDay(o.billOut) + '.' : '');
if (o && o.m && o.m.note) detail.push(String(o.m.note));
Outputs.rpDetail = detail.filter(function (x) { return !!x; }).join(' ');
var canTick = !!o && !isBill && !o.closed && !o.hoped;
Outputs.rpTickShown = canTick;
Outputs.rpTickHead = o && o.paid ? mEur(o.paid) + ' paid so far \\u00b7 the rest' : 'Did it happen?';
Outputs.rpTickOn = today;
Outputs.rpTickAmount = canTick ? String(Math.abs(o.remaining)) : '';
Outputs.rpRemaining = canTick ? Math.abs(o.remaining) : 0;
var rw = o ? restWords(o) : ['Still owed', 'Lost'];
Outputs.rpRests = [{ Label: rw[0], Value: 'owed' }, { Label: rw[1], Value: 'lost' }];
Outputs.rpRestDefault = 'owed';
Outputs.rpChangeLabel = it.repeat && it.repeat !== 'once' ? 'Change this one' : 'Change the date or amount';
Outputs.rpSkipShown = canTick && !!it.repeat && it.repeat !== 'once';
Outputs.rpLostShown = canTick && o.client;
Outputs.rpChangeShown = !!o && !isBill && !o.closed && mode === 'change';
Outputs.rpChDate = o ? o.date : '';
Outputs.rpChAmount = o ? String(Math.abs(o.amount)) : '';
Outputs.rpChNote = o && o.m && o.m.note ? String(o.m.note) : '';
Outputs.rpChHint = it.repeat && it.repeat !== 'once' ? 'Only this one. The item stays ' + mEur(it.amount) + ', and changing the item later leaves this one alone.' : 'This is the only one.';
Outputs.rpResetShown = !!o && (o.changed || o.moved);
var closedText = '';
if (o && o.closed) {
  if (o.skip) closedText = '\\u2713 Skipped.';
  else if (o.lostOn) closedText = o.paid ? '\\u2713 ' + mEur(o.paid) + ' came in. The other ' + mEur(o.amount - o.paid) + ' was written off on ' + mDay(o.lostOn) + '.' : '\\u2713 Written off on ' + mDay(o.lostOn) + '.';
  else {
    var d0 = mBetween(o.date, o.lastOn);
    closedText = '\\u2713 ' + (o.amount > 0 ? 'Came in' : 'Went out') + ' ' + mDay(o.lastOn) + ': ' + mEur(o.paid) + '.' +
      (o.client ? (d0 > 0 ? ' ' + d0 + ' days late.' : d0 < 0 ? ' ' + (-d0) + ' days early.' : ' On time.') : '') +
      (o.payments.length > 1 ? ' In ' + o.payments.length + ' parts.' : '');
  }
}
Outputs.rpClosedShown = !!o && !isBill && o.closed;
Outputs.rpClosedText = closedText;
Outputs.rpHopedShown = !!o && !isBill && o.hoped && !o.closed;
Outputs.rpHopedText = o && o.hoped ? 'Hoped money is never in a balance. When it is agreed, set it to 100% and it counts.' +
  (o.project && o.project.move ? ' What makes it real: ' + String(o.project.move) + '.' : '') : '';
Outputs.rpBillShown = isBill;
Outputs.rpBillText = isBill ? (o.sentOn ? '\\u2713 Sent ' + mDay(o.sentOn) + '. Due ' + mDay(o.date) + (o.closed ? ', and paid.' : '.') : 'Goes out ' + mDay(o.billOut) + '. Marking it sent records the day it went out; the payment is its own tick on ' + mDay(o.date) + '.') : '';
Outputs.rpSendShown = isBill && !o.sentOn;
Outputs.rpSentOn = today;
Outputs.rpSentAmount = isBill && o.hoursBill ? String(o.amount) : '';
Outputs.rpSentAmountShown = isBill && o.hoursBill;
Outputs.rpUnsendShown = isBill && !!o.sentOn && !o.closed;
Outputs.rpFromShown = !!o;
var hand = 0;
if (o) for (var mk in ctx.marks) if (mk.indexOf(it.id + '|') === 0 && ctx.marks[mk].amount !== '' && ctx.marks[mk].amount !== null && ctx.marks[mk].amount !== undefined) hand++;
Outputs.rpFromText = !o ? '' : it.repeat && it.repeat !== 'once'
  ? String(it.label || '') + ' \\u00b7 ' + (it.fromHours ? 'from the hours' : mEur(it.amount, true)) + ' \\u00b7 ' + scheduleWords(it, today) + (pn ? ' \\u00b7 ' + pn : '') +
    (o.hoped ? ' \\u00b7 hoped ' + o.likelihood + '%' : '') + (hand ? '. ' + hand + ' repeat' + (hand === 1 ? '' : 's') + ' changed by hand; changing the item leaves ' + (hand === 1 ? 'it' : 'them') + ' alone.' : '')
  : (pn ? pn + ' \\u00b7 one bill' : 'A one-off item') + (it.note ? ' \\u00b7 ' + String(it.note) : '');
Outputs.rpItemLabel = it.repeat && it.repeat !== 'once' ? 'Change the item' : 'Change it';
Outputs.rpEndShown = !!o && !!it.repeat && it.repeat !== 'once';
Outputs.changeKey = o ? o.key : '';
Outputs.pickedItemId = o ? String(it.id) : '';

// ── End it (M10: nothing is deleted) ──
var endIt = mode === 'end' ? itemById(itemArg) : null;
Outputs.endShown = open && !!endIt;
Outputs.endItemId = endIt ? endIt.id : '';
var choices = [], def = '', ticked = 0;
if (endIt) {
  var reps = repeatsOf(endIt, mAddMonths(today, 12, false));
  var from = mAddDays(today, -70);
  for (var r = 0; r < reps.length; r++) {
    var mm = ctx.marks[markKey(endIt.id, reps[r])];
    var tk = !!(mm && paymentsOf(mm).length);
    if (tk) ticked++;
    if (reps[r] < today) def = reps[r];
    if (reps[r] >= from && choices.length < 20) choices.push({ Label: mDay(reps[r]) + (tk ? ' \\u00b7 ticked' : ''), Value: reps[r] });
  }
  if (!def && reps.length) def = reps[0];
}
Outputs.endTitle = endIt ? 'End ' + String(endIt.label || '') : '';
Outputs.endText = endIt ? 'Nothing is deleted. ' + (ticked ? 'The ' + ticked + ' ticked repeat' + (ticked === 1 ? ' stays' : 's stay') + ' in Past; ' : '') + 'no repeat shows after the day you pick.' : '';
Outputs.endChoices = choices;
Outputs.endAt = def;

// ── Record balance (M11, M11a) ──
var showBal = open && mode === 'balance';
var pr = projection(ctx, readings, today);
var balRows = [];
for (var b = 0; b < pr.late.length; b++) {
  var lo2 = pr.late[b];
  balRows.push({ key: lo2.key, label: lo2.it.label, sub: mEur(lo2.remaining, true) + ' \\u00b7 ' + mDay(lo2.date) + (lo2.paid ? ' \\u00b7 the rest' : ''), lostLabel: lo2.client ? 'Lost' : lo2.amount > 0 ? 'Won\\u2019t come' : 'Won\\u2019t be paid' });
}
Outputs.balShown = showBal;
Outputs.balOn = today;
Outputs.balHint = '';
Outputs.balRows = balRows;
Outputs.balHasRows = balRows.length > 0;
Outputs.balNote = (balRows.length ? 'Not yet is doing nothing: it is counted as if it happens today, on top of this balance. ' : 'Nothing dated on or before today is unticked. ') +
  'The app has it at ' + mEur(now.balance) + ' now.';

// ── The item editor (§4.1, M5, M9, M16) ──
var target = mode === 'edit' ? itemById(itemArg) : null;
var proj = (mode === 'newBill' || mode === 'newHope') ? ctx.projects[itemArg] || null : null;
var showEd = open && (mode === 'new' || mode === 'newBill' || mode === 'newHope' || !!target);
Outputs.edShown = showEd;
Outputs.edKey = mode + '|' + itemArg + '|' + (open ? 'open' : '');
Outputs.isNewItem = mode === 'new' || mode === 'newBill' || mode === 'newHope';
Outputs.editItemId = target ? target.id : '';
Outputs.edDirs = [{ Label: 'Comes in', Value: 'in' }, { Label: 'Goes out', Value: 'out' }];
Outputs.edRepeats = [
  { Label: 'Once', Value: 'once' }, { Label: 'Every week', Value: 'weekly' }, { Label: 'Every month', Value: 'monthly' },
  { Label: 'Every three months', Value: 'quarterly' }, { Label: 'Once a year', Value: 'yearly' }
];
var plist = [{ Label: 'No project', Value: 'none' }], terms = [];
var allP = Inputs.projects || [];
for (var q1 = 0; q1 < allP.length; q1++) {
  var pp = allP[q1];
  if (!pp || pp.kind === 'admin') continue;
  plist.push({ Label: String(pp.name || ''), Value: String(pp.id) });
  terms.push({ id: String(pp.id), name: String(pp.name || ''), billing: billingOf(pp), terms: num(pp.termsDays, 14), rate: num(pp.rate, 0) });
}
Outputs.edProjects = plist;
Outputs.edProjectTerms = terms;
function str(v) { return v === undefined || v === null ? '' : String(v); }
if (target) {
  var n1 = 0;
  for (var k1 in ctx.marks) if (k1.indexOf(target.id + '|') === 0 && ctx.marks[k1].amount !== '' && ctx.marks[k1].amount !== null && ctx.marks[k1].amount !== undefined) n1++;
  Outputs.edTitle = 'Change ' + str(target.label);
  Outputs.edSub = target.repeat && target.repeat !== 'once' ? 'Changes every repeat you have not changed by hand' + (n1 ? ' (' + n1 + ' changed by hand stay' + (n1 === 1 ? 's' : '') + ' as ' + (n1 === 1 ? 'it is' : 'they are') + ').' : '.') : '';
  Outputs.edSaveLabel = 'Save';
  Outputs.edLabel = str(target.label);
  Outputs.edDir = num(target.amount, 0) < 0 ? 'out' : 'in';
  Outputs.edAmount = target.fromHours ? '' : String(Math.abs(num(target.amount, 0)));
  Outputs.edRepeat = str(target.repeat || 'once');
  Outputs.edDate = str(target.date);
  Outputs.edUntil = mOk(target.until) ? str(target.until) : '';
  Outputs.edMonthEnd = target.monthEnd === true;
  Outputs.edProjectId = target.projectId ? str(target.projectId) : 'none';
  Outputs.edBillDate = mOk(target.billDate) ? str(target.billDate) : '';
  Outputs.edBillLeadDays = target.billLeadDays === null || target.billLeadDays === undefined || target.billLeadDays === '' ? '7' : str(target.billLeadDays);
  Outputs.edFromHours = target.fromHours === true;
  Outputs.edLikelihood = String(Math.round(num(target.likelihood, 100)));
  Outputs.edNote = str(target.note);
} else {
  var hope = mode === 'newHope', bill = mode === 'newBill';
  var tdays = proj ? num(proj.termsDays, 14) : 14;
  Outputs.edTitle = hope ? 'Hoped money from ' + str(proj && proj.name) : bill ? 'A bill for ' + str(proj && proj.name) : showEd ? 'Add money' : '';
  Outputs.edSub = hope ? 'Hoped money is never in a balance. The move and this stay separate; change either without the other.' : 'A label, an amount and a date is all it needs.';
  Outputs.edSaveLabel = 'Add it';
  Outputs.edLabel = proj ? str(proj.name) : '';
  Outputs.edDir = 'in';
  Outputs.edAmount = '';
  Outputs.edRepeat = 'once';
  Outputs.edDate = bill ? mAddDays(today, tdays) : hope ? mAddDays(today, 30) : today;
  Outputs.edUntil = '';
  Outputs.edMonthEnd = false;
  Outputs.edProjectId = proj ? str(proj.id) : 'none';
  Outputs.edBillDate = bill ? today : '';
  Outputs.edBillLeadDays = '7';
  Outputs.edFromHours = bill && !!proj && billingOf(proj) === 'hourly';
  Outputs.edLikelihood = hope ? '25' : '100';
  Outputs.edNote = hope && proj && proj.move ? str(proj.move) : '';
}
Outputs.agreeItemId = o && o.hoped ? it.id : '';

// ── The project card's Billing (§4.2, M21–M24) ──
var cp = ctx.projects[String(Inputs.cardProject || '')] || null;
var earning = !!cp && cp.kind === 'earning';
Outputs.billingShown = earning;
var fixed = billingOf(cp) === 'fixed';
Outputs.billingTerms = !earning ? '' : (fixed ? 'Fixed price' : 'Hourly, ' + mEur(cp.rate) + ' an hour') + ' \\u00b7 payment terms ' + num(cp.termsDays, 14) + ' days' +
  (num(cp.agreedHours, 0) > 0 ? ' \\u00b7 agreed ' + num(cp.agreedHours, 0) + ' h a month' : '');
var mine = [], hopedMine = [];
for (var y = 0; y < ctx.items.length; y++) {
  var ci = ctx.items[y];
  if (!cp || ci.projectId !== cp.id) continue;
  (num(ci.likelihood, 100) < 100 ? hopedMine : mine).push(ci);
}
var bills = [];
for (var y2 = 0; y2 < mine.length; y2++) {
  var bi = mine[y2];
  bills.push(bi.repeat && bi.repeat !== 'once'
    ? '\\u21bb ' + scheduleWords(bi, today).replace('every month on the', 'every month, due on the') + ', ' + (bi.fromHours ? 'from the hours' : mEur(bi.amount))
    : 'one bill, ' + (bi.fromHours ? 'from the hours' : mEur(bi.amount)) + (mOk(bi.billDate) ? ', goes out ' + mDay(bi.billDate) : '') + ', due ' + mDay(bi.date));
}
var brows = [{ key: 'Bills', text: bills.length ? bills.join('\\n') : 'None yet.' }];
var ahead = mAddMonths(today, 12, false), open2 = [], done2 = [];
for (var y3 = 0; y3 < mine.length; y3++) {
  var rr = repeatsOf(mine[y3], ahead);
  for (var y4 = 0; y4 < rr.length; y4++) {
    if (ctx.since && rr[y4] < ctx.since) continue;
    var oc = occOf(ctx, mine[y3], rr[y4]);
    if (oc.closed || oc.paid) done2.push(oc);
    if (!oc.closed) open2.push(oc);
  }
}
open2.sort(function (a, b3) { var x = a.billOut || a.date, z = b3.billOut || b3.date; return x < z ? -1 : x > z ? 1 : 0; });
done2.sort(function (a, b3) { return a.date < b3.date ? 1 : a.date > b3.date ? -1 : 0; });
var nx = open2[0] || null;
if (nx) brows.push({ key: 'Next', text: (nx.billOut && !nx.sentOn ? 'goes out ' + mDay(nx.billOut) + ' \\u00b7 ' : nx.sentOn ? 'sent ' + mDay(nx.sentOn) + ' \\u00b7 ' : '') +
  mEur(nx.remaining) + ' \\u00b7 due ' + mDay(nx.date) + (nx.date < today ? ' \\u00b7 late' : '') });
var since = '';
if (cp) { var pb = previousBillOut(ctx, cp.id, mAddDays(today, 1)); since = pb ? mAddDays(pb, 1) : today.slice(0, 8) + '01'; }
var logged = cp ? hoursBetween(ctx, cp.id, since, today) : 0;
var planned = 0;
if (cp) for (var y5 = 0; y5 < ctx.blocks.length; y5++) { var bk = ctx.blocks[y5]; if (bk && bk.projectId === cp.id && String(bk.date) > today && !bk.done) planned += num(bk.planned, 0); }
var period = '';
if (!earning) period = '';
else if (fixed) {
  var fee = nx ? nx.amount : mine.length ? num(mine[0].amount, 0) : 0;
  var agreed = num(cp.agreedHours, 0);
  // M24 — the hours are a record; the bill does not move. The per-hour figure is a check on the price, never a target.
  period = hText(logged) + ' h logged' + (agreed ? ' of ' + agreed + ' agreed' : '') + (planned ? ', ' + hText(logged + planned) + ' h with what\\u2019s planned' : '') +
    ' \\u00b7 the bill is ' + mEur(fee) + ' whatever the hours' + (logged > 0 && fee ? ' \\u00b7 ' + mEur(fee / logged) + ' an hour so far' : '');
} else {
  var rate = num(cp.rate, 0);
  period = hText(logged) + ' h \\u00d7 ' + mEur(rate) + ' = ' + mEur(logged * rate) + (planned ? ' \\u00b7 with what\\u2019s planned ' + hText(logged + planned) + ' h, ' + mEur((logged + planned) * rate) : '') + ' \\u00b7 the next bill fills from these';
}
var past = [];
for (var y6 = 0; y6 < done2.length && past.length < 4; y6++) {
  var dn = done2[y6];
  var dl = dn.lastOn ? mBetween(dn.date, dn.lastOn) : 0;
  past.push(MON[Number(dn.date.slice(5, 7)) - 1] + ' ' + mEur(dn.amount) + ', due ' + mShort(dn.date) + ', ' +
    (dn.lostOn ? mEur(dn.amount - dn.paid) + ' lost' : dn.lastOn ? 'paid ' + mShort(dn.lastOn) + (dl > 0 ? ', ' + dl + ' days late' : dl < 0 ? ', ' + (-dl) + ' days early' : ', on time') : 'skipped'));
}
if (period) brows.push({ key: 'This period', text: period });
if (past.length) brows.push({ key: 'Past', text: past.join('\\n') });
Outputs.billingRows = earning ? brows : [];
Outputs.hasHoped = hopedMine.length > 0;
Outputs.hopedText = hopedMine.length ? 'Hoped money: ' + hopedMine.map(function (h) { return (h.fromHours ? 'from the hours' : mEur(h.amount)) + (h.repeat && h.repeat !== 'once' ? ' ' + repeatWord(h) : '') + ' \\u00b7 ' + Math.round(num(h.likelihood, 100)) + '%'; }).join(', ') + '. It is in Money.' : '';
Outputs.hopeShown = !!cp && !!cp.move && !cp.moveStop && hopedMine.length === 0;`
    )
  ],
  connections: [
    ...MONEY_VIEW_INS.map(([n]) => wire('mvpIn', n, 'mvpWork', `in-${n}`)),
    ...MONEY_VIEW_OUTS.map(([n]) => wire('mvpWork', `out-${n}`, 'mvpOut', n))
  ]
};

/** Every field a MoneyMark has (M10, M11a): one per repeat that differs from its item or was ticked. */
export const MARK_FIELDS: Array<[string, string]> = [
  ['itemId', 'string'], ['occurs', 'string'], ['amount', '*'], ['date', 'string'], ['skip', 'boolean'], ['payments', 'array'],
  ['doneOn', 'string'], ['doneAmount', '*'], ['lostOn', 'string'], ['sentOn', 'string'], ['note', 'string']
];
const MARK_INS: Array<[string, string]> = [
  ...MONEY_DATA_INS, ['key', 'string'], ['action', 'string'],
  ['tickOn', 'string'], ['tickAmount', 'string'], ['tickRest', 'string'], ['chDate', 'string'], ['chAmount', 'string'], ['chNote', 'string'],
  ['sentOn', 'string'], ['sentAmount', 'string'], ['go', 'signal']
];
const MARK_OUTS: Array<[string, string]> = [['markId', 'string'], ...MARK_FIELDS, ['add', 'signal'], ['edit', 'signal']];

/**
 * **One mark, from one press** (M6, M10, M11, M11a). Every button that changes a repeat — *Tick
 * it*, *Save this one*, *Back to the item*, *Skip*, *Mark as lost*, *Untick*, *Mark as sent*, *Not
 * sent after all*, and *Happened* / *Lost* in Record balance — says its `action` and presses `go`,
 * and this works out the whole mark the repeat should have: the one it has, with that action
 * applied. It then says `add` (no mark yet) or `edit`, so one pair of commands writes them all.
 *
 * - **A tick is a payment** (`payments`, `{ day, amount }` like a block's entries, R22), and
 *   `doneOn` / `doneAmount` are kept in step with the list the way `actual` is with a block's time.
 *   Less than was due asks what the rest is: *still owed* leaves the repeat open for the rest;
 *   *lost* sets `lostOn` (M11a).
 * - *Happened* in Record balance ticks what is left, on the repeat's own day — before the reading,
 *   so it is not counted twice.
 * - Marking an hours bill sent (M23) records its amount on the mark, and from then on it is fixed.
 */
const MARK: Tpl010Component = {
  path: 'Logic/Mark',
  description: 'Works out the mark a repeat should have after one press — a tick, a change to this one, a skip, lost, sent, or undoing one — and says whether it is a new mark or a changed one.',
  ...iface(MARK_INS, MARK_OUTS),
  nodes: [
    inputs('mkIn', 'The press', MARK_INS),
    outputs('mkOut', 'The mark', MARK_OUTS),
    script(
      'mkWork',
      'Work out the mark',
      `${PLANNER_FNS}${MONEY_FNS}${MONEY_OPEN}
var parts = String(Inputs.key || '').split('|');
var it = null;
for (var i = 0; i < ctx.items.length; i++) if (ctx.items[i].id === parts[0]) it = ctx.items[i];
if (!it || !mOk(parts[1])) return;
var o = occOf(ctx, it, parts[1]);
var m = o.m || {};
var pays = paymentsOf(m);
var sign = num(it.amount, 0) < 0 ? -1 : 1;
function blank(v) { return v === undefined || v === null || v === ''; }
function r2(n) { return Math.round(n * 100) / 100; }
var amount = blank(m.amount) || !isFinite(Number(m.amount)) ? '' : num(m.amount, 0);
var date = mOk(m.date) ? String(m.date) : '';
var skip = m.skip === true;
var lostOn = mOk(m.lostOn) ? String(m.lostOn) : '';
var sentOn = mOk(m.sentOn) ? String(m.sentOn) : '';
var note = blank(m.note) ? '' : String(m.note);
var action = String(Inputs.action || '');
if (action === 'tick' || action === 'happened') {
  if (o.closed || o.hoped) return;
  var left = Math.abs(o.remaining);
  var amt = action === 'happened' ? left : Math.abs(num(Inputs.tickAmount, NaN));
  if (!isFinite(amt)) return;
  var day = action === 'happened' ? (o.date <= today ? o.date : today) : (mOk(Inputs.tickOn) ? String(Inputs.tickOn) : today);
  var lose = action === 'tick' && amt < left - 0.005 && String(Inputs.tickRest || '') === 'lost';
  if (amt <= 0 && !lose) return;
  if (amt > 0) pays.push({ day: day, amount: sign * r2(amt) });
  if (lose) lostOn = day;
  // M11a — part of it, and the rest still owed: what was due is kept on the mark, so the rest is still
  // measured against it if the item changes later. A full tick needs nothing kept: it is closed.
  else if (amt < left - 0.005 && blank(amount)) amount = r2(o.amount);
} else if (action === 'change') {
  var ch = Math.abs(num(Inputs.chAmount, NaN));
  if (isFinite(ch)) amount = !it.fromHours && r2(ch) === Math.abs(num(it.amount, 0)) ? '' : sign * r2(ch);
  date = mOk(Inputs.chDate) && String(Inputs.chDate) !== o.occurs ? String(Inputs.chDate) : '';
  note = String(Inputs.chNote || '').trim();
} else if (action === 'reset') {
  amount = it.fromHours && sentOn ? amount : '';
  date = '';
} else if (action === 'skip') {
  if (o.closed) return;
  skip = true;
} else if (action === 'lost') {
  if (o.closed) return;
  lostOn = today;
} else if (action === 'untick') {
  if (lostOn) lostOn = '';
  else if (skip) skip = false;
  else if (pays.length) pays.pop();
  else return;
} else if (action === 'sent') {
  sentOn = mOk(Inputs.sentOn) ? String(Inputs.sentOn) : today;
  if (o.hoursBill) { var sa = Math.abs(num(Inputs.sentAmount, o.amount)); amount = r2(isFinite(sa) ? sa : o.amount); }
} else if (action === 'unsend') {
  if (!sentOn) return;
  sentOn = '';
  if (it.fromHours) amount = '';
} else return;
var total = 0, last = '';
for (var p = 0; p < pays.length; p++) { total += pays[p].amount; if (pays[p].day > last) last = pays[p].day; }
Outputs.markId = o.markId;
Outputs.itemId = String(it.id);
Outputs.occurs = o.occurs;
Outputs.amount = amount;
Outputs.date = date;
Outputs.skip = skip;
Outputs.payments = pays;
Outputs.doneOn = last;
Outputs.doneAmount = pays.length ? r2(total) : '';
Outputs.lostOn = lostOn;
Outputs.sentOn = sentOn;
Outputs.note = note;
if (o.markId) Outputs.edit(); else Outputs.add();`,
      MARK_INS.filter(([, t]) => t !== 'signal').map(([n]) => n)
    )
  ],
  connections: [
    ...MARK_INS.filter(([, t]) => t !== 'signal').map(([n]) => wire('mkIn', n, 'mkWork', `in-${n}`)),
    wire('mkIn', 'go', 'mkWork', 'run'),
    ...MARK_OUTS.map(([n, t]) => wire('mkWork', `out-${n}`, 'mkOut', n))
  ]
};

const SHUTDOWN_INS: Array<[string, string]> = [
  ['projects', 'array'], ['blocks', 'array'], ['todayKey', 'string'], ['tomorrowKey', 'string'],
  ['todayLong', 'string'], ['tomorrowLong', 'string'], ['unplacedDormant', 'string'],
  ['target', 'number'], ['billableUsed', 'number'], ['billableLeft', 'number'], ['perDay', 'number'],
  ['buildingLeft', 'number'], ['daysLeft', 'number'], ['focusHours', 'number'], ['lateConcern', 'string']
];
const SHUTDOWN_OUTS: Array<[string, string]> = [
  ['title', 'string'], ['dayLine', 'string'], ['monthLine', 'string'], ['concern', 'string'], ['chaseShown', 'boolean'],
  ['carryRows', 'array'], ['nothingToCarry', 'boolean'], ['tomorrowTitle', 'string'],
  ['tomorrowList', 'string'], ['tomorrowFocus', 'string'], ['tomorrowFocusColor', 'string']
];

/**
 * R12 — the evening, as **rules over data**. No model runs in the template; the MCP coach is
 * a later task and needs a `Decision` collection this one does not ship.
 *
 * ## One concern, and its order (AC5, and TPL-010-M's M15 in front of it)
 *
 * 0. **Client money that is late and not ticked** (M15) — *"Chase it, or tick it."* A late cost is
 *    not a concern: it is almost always paid and not ticked, and it waits in Money.
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
var lateMoney = String(Inputs.lateConcern || '');
Outputs.chaseShown = lateMoney !== '';
if (lateMoney) {
  Outputs.concern = lateMoney;
} else if (unloggedBuilding) {
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
const CARD_ROWS_OUTS: Array<[string, string]> = [['groups', 'array'], ...PROJECT_DETAIL_BASE, ['resolvedId', 'string'], ['placedBlockId', 'string']];

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
Outputs.say = String(Inputs.say || '').trim();
// M21 — hourly or fixed; §4.2 — the payment terms a new bill's due date is pre-filled from (M5), and the agreed hours.
Outputs.billing = String(Inputs.billing || '') === 'fixed' ? 'fixed' : 'hourly';
Outputs.termsDays = Math.min(120, Math.max(0, Math.round(num(Inputs.termsDays, 14))));
Outputs.agreedHours = Math.max(0, q(num(Inputs.agreedHours, 0)));`;

const PROJECT_INS: Array<[string, string]> = [
  ['name', 'string'], ['sub', 'string'], ['kind', 'string'], ['rate', 'number'], ['slot', 'string'], ['rung', 'string'],
  ['move', 'string'], ['moveWorth', 'string'], ['moveWhen', 'string'], ['moveDue', 'string'], ['moveStop', 'boolean'], ['say', 'string'],
  ['billing', 'string'], ['termsDays', 'number'], ['agreedHours', 'number']
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
  description: 'Writes this month’s plan: what each envelope gets, and how many working days there are.',
  ins: [
    ['month', 'string'], ['billable', 'number'], ['building', 'number'], ['admin', 'number'],
    ['hobby', 'number'], ['workingDays', 'number']
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
Outputs.go();`,
  guardIns: ['month', 'billable', 'building', 'admin', 'hobby', 'workingDays'],
  write: {
    kind: 'create',
    collection: 'MonthPlan',
    label: 'Write this month’s plan',
    props: [
      ['month', 'month'], ['billable', 'billable'], ['building', 'building'], ['admin', 'admin'],
      ['hobby', 'hobby'], ['workingDays', 'workingDays']
    ]
  }
});

const MARK_GUARD = `var id = String(Inputs.itemId || '');
if (id === '' || !/^\\d{4}-\\d{2}-\\d{2}$/.test(String(Inputs.occurs || ''))) return;
var list = Inputs.payments || [];
var pays = [];
for (var i = 0; i < list.length; i++) if (list[i] && isFinite(Number(list[i].amount))) pays.push({ day: String(list[i].day || ''), amount: Number(list[i].amount) });
Outputs.itemId = id;
Outputs.occurs = String(Inputs.occurs);
Outputs.amount = Inputs.amount === undefined || Inputs.amount === null ? '' : Inputs.amount;
Outputs.date = String(Inputs.date || '');
Outputs.skip = Inputs.skip === true;
Outputs.payments = pays;
Outputs.doneOn = String(Inputs.doneOn || '');
Outputs.doneAmount = Inputs.doneAmount === undefined || Inputs.doneAmount === null ? '' : Inputs.doneAmount;
Outputs.lostOn = String(Inputs.lostOn || '');
Outputs.sentOn = String(Inputs.sentOn || '');
Outputs.note = String(Inputs.note || '');
Outputs.go();`;
const MARK_PROPS: Array<[string, string]> = MARK_FIELDS.map(([n]) => [n, n]);

/** M6 / M10 — the first mark on a repeat: written by `Logic/Mark` when the repeat has none. */
const ADD_MARK = command({
  path: 'Commands/Add mark',
  description: 'Writes the first mark on one repeat of a money item: a tick, a change to this one, a skip, lost, or sent.',
  ins: MARK_FIELDS,
  guard: MARK_GUARD,
  guardIns: MARK_FIELDS.map(([n]) => n),
  write: { kind: 'create', collection: 'MoneyMark', label: 'Mark the repeat', props: MARK_PROPS }
});

/** The same, for a repeat that already has a mark. Nothing is deleted: undoing a tick writes the mark without it. */
const EDIT_MARK = command({
  path: 'Commands/Edit mark',
  description: 'Changes the mark on one repeat of a money item: another tick, a change, a skip, lost, sent, or undoing one of them.',
  ins: [['markId', 'string'], ...MARK_FIELDS],
  guard: `if (String(Inputs.markId || '') === '') return;\n${MARK_GUARD}`,
  guardIns: ['markId', ...MARK_FIELDS.map(([n]) => n)],
  write: { kind: 'update', collection: 'MoneyMark', label: 'Change the mark', props: MARK_PROPS, idFromInput: 'markId' }
});

/**
 * M9 — a label, an amount and a date are all an item needs. Everything else is checked here and
 * turned into what the list reads: the amount is signed by in or out; `until`, the last day of the
 * month, the bill date and the days before due are kept only where the schedule and a client make
 * them mean something; an hourly client's bill can leave its amount to the hours (M23).
 */
const MONEY_ITEM_GUARD = `var label = String(Inputs.label || '').trim();
var date = String(Inputs.date || '');
var ok = /^\\d{4}-\\d{2}-\\d{2}$/;
if (label === '' || !ok.test(date)) return;
var repeats = ['once', 'weekly', 'monthly', 'quarterly', 'yearly'];
var repeat = String(Inputs.repeat || 'once');
if (repeats.indexOf(repeat) < 0) repeat = 'once';
var pid = String(Inputs.projectId || '');
if (pid === 'none') pid = '';
var out = String(Inputs.dir || 'in') === 'out';
var client = pid !== '' && !out;
var fromHours = client && Inputs.fromHours === true;
var amount = Math.abs(num(Inputs.amount, NaN));
if (!fromHours && (!isFinite(amount) || amount <= 0)) return;
var until = String(Inputs.until || '');
Outputs.label = label;
Outputs.amount = fromHours ? 0 : (out ? -1 : 1) * Math.round(amount * 100) / 100;
Outputs.repeat = repeat;
Outputs.date = date;
Outputs.until = repeat !== 'once' && ok.test(until) && until >= date ? until : '';
Outputs.monthEnd = (repeat === 'monthly' || repeat === 'quarterly') && Inputs.monthEnd === true;
Outputs.projectId = pid;
Outputs.billDate = client && repeat === 'once' && ok.test(String(Inputs.billDate || '')) ? String(Inputs.billDate) : '';
var lead = Math.round(num(Inputs.billLeadDays, NaN));
Outputs.billLeadDays = client && repeat !== 'once' && isFinite(lead) && lead >= 0 ? lead : '';
Outputs.fromHours = fromHours;
var likeRaw = String(Inputs.likelihood === undefined || Inputs.likelihood === null ? '' : Inputs.likelihood).trim();
var like = likeRaw === '' ? 100 : Math.round(Number(likeRaw));
Outputs.likelihood = isFinite(like) ? Math.max(0, Math.min(100, like)) : 100;
Outputs.note = String(Inputs.note || '').trim();`;

const MONEY_ITEM_INS: Array<[string, string]> = [
  ['label', 'string'], ['dir', 'string'], ['amount', 'string'], ['repeat', 'string'], ['date', 'string'], ['until', 'string'],
  ['monthEnd', 'boolean'], ['projectId', 'string'], ['billDate', 'string'], ['billLeadDays', 'string'], ['fromHours', 'boolean'],
  ['likelihood', 'string'], ['note', 'string']
];
const MONEY_ITEM_PROPS: Array<[string, string]> = [
  ['label', 'label'], ['amount', 'amount'], ['repeat', 'repeat'], ['date', 'date'], ['until', 'until'], ['monthEnd', 'monthEnd'],
  ['projectId', 'projectId'], ['billDate', 'billDate'], ['billLeadDays', 'billLeadDays'], ['fromHours', 'fromHours'],
  ['likelihood', 'likelihood'], ['note', 'note']
];

/** M2 / M3 — everything that happens to money is one of these: once, or on a schedule with a start and an optional end. */
const ADD_MONEY_ITEM = command({
  path: 'Commands/Add money item',
  description: 'Adds something that happens to the money: what it is, in or out, how much, how often and from when, until when, whose it is, and how likely.',
  ins: MONEY_ITEM_INS,
  guard: `${PLANNER_FNS}${MONEY_ITEM_GUARD}
Outputs.position = Date.now();
Outputs.go();`,
  guardIns: MONEY_ITEM_INS.map(([n]) => n),
  write: { kind: 'create', collection: 'MoneyItem', label: 'Add the money item', props: [...MONEY_ITEM_PROPS, ['position', 'position']] }
});

/** M4 — changing the item changes every repeat not changed by hand; the marks are not touched. */
const EDIT_MONEY_ITEM = command({
  path: 'Commands/Edit money item',
  description: 'Changes a money item. Every repeat you have not changed by hand follows it; the ones you have keep what you gave them.',
  ins: [['itemId', 'string'], ...MONEY_ITEM_INS],
  guard: `${PLANNER_FNS}if (String(Inputs.itemId || '') === '') return;
${MONEY_ITEM_GUARD}
Outputs.go();`,
  guardIns: ['itemId', ...MONEY_ITEM_INS.map(([n]) => n)],
  write: { kind: 'update', collection: 'MoneyItem', label: 'Change the money item', props: MONEY_ITEM_PROPS, idFromInput: 'itemId' }
});

/** M10 — *End it* sets the last day a repeat can land on. Nothing is deleted; the past keeps its history. */
const END_MONEY_ITEM = command({
  path: 'Commands/End money item',
  description: 'Ends a money item after the day picked. Nothing is deleted; the repeats already ticked stay.',
  ins: [['itemId', 'string'], ['until', 'string']],
  guard: `var until = String(Inputs.until || '');
if (String(Inputs.itemId || '') === '' || !/^\\d{4}-\\d{2}-\\d{2}$/.test(until)) return;
Outputs.until = until;
Outputs.go();`,
  guardIns: ['itemId', 'until'],
  write: { kind: 'update', collection: 'MoneyItem', label: 'End the item', props: [['until', 'until']], idFromInput: 'itemId' }
});

/** M7 — hoped money becomes expected when it is agreed: its likelihood goes to 100 and it counts. */
const AGREE_MONEY_ITEM = command({
  path: 'Commands/Agree money item',
  description: 'Hoped money that has been agreed: it becomes expected, and counts in every balance from now on.',
  ins: [['itemId', 'string']],
  guard: `if (String(Inputs.itemId || '') === '') return;
Outputs.likelihood = 100;
Outputs.go();`,
  guardIns: ['itemId'],
  write: { kind: 'update', collection: 'MoneyItem', label: 'It is agreed', props: [['likelihood', 'likelihood']], idFromInput: 'itemId' }
});

/** M11 — what the bank says, on a day. The latest one is where every projection starts. */
const RECORD_BALANCE = command({
  path: 'Commands/Record balance',
  description: 'Records what the bank says, on a day. Every projection starts from the latest one.',
  ins: [['date', 'string'], ['amount', 'string']],
  guard: `${PLANNER_FNS}var date = String(Inputs.date || '');
var raw = String(Inputs.amount === undefined || Inputs.amount === null ? '' : Inputs.amount).trim();
var amount = Number(raw);
if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(date) || raw === '' || !isFinite(amount)) return;
Outputs.date = date;
Outputs.amount = Math.round(amount * 100) / 100;
Outputs.note = '';
Outputs.go();`,
  guardIns: ['date', 'amount'],
  write: { kind: 'create', collection: 'BalanceReading', label: 'Record the balance', props: [['date', 'date'], ['amount', 'amount'], ['note', 'note']] }
});

/**
 * 🔴 **One of the commands that writes real money** — with the money items. §4.3: the usual hourly
 * rate, the focus ceiling, the savings target and the lowest balance before red. The template
 * ships invented numbers and the hosted app is the only place the real ones exist.
 */
const EDIT_SETTINGS = command({
  path: 'Commands/Edit settings',
  description: 'Saves the numbers the week is worked out from: your usual hourly rate, your focus ceiling, your savings target, and the lowest balance before red.',
  ins: [['settingsId', 'string'], ['rate', 'number'], ['focusHours', 'number'], ['savingsTarget', 'number'], ['lowWaterMark', 'number']],
  guard: `${PLANNER_FNS}var id = String(Inputs.settingsId || '');
if (id === '') return;
Outputs.rate = Math.max(0, num(Inputs.rate, 0));
// R3 — the ceiling is what makes the plan honest, so it cannot be set to nothing.
Outputs.focusHours = Math.min(16, Math.max(1, num(Inputs.focusHours, 6)));
Outputs.savingsTarget = Math.max(0, num(Inputs.savingsTarget, 0));
Outputs.lowWaterMark = num(Inputs.lowWaterMark, 0);
Outputs.go();`,
  guardIns: ['settingsId', 'rate', 'focusHours', 'savingsTarget', 'lowWaterMark'],
  write: {
    kind: 'update',
    collection: 'Settings',
    label: 'Save the settings',
    props: [['rate', 'rate'], ['focusHours', 'focusHours'], ['savingsTarget', 'savingsTarget'], ['lowWaterMark', 'lowWaterMark']],
    idFromInput: 'settingsId'
  }
});

// ════════════════════════════════════════════════════════════════════════════
// The pages
// ════════════════════════════════════════════════════════════════════════════


const APP_BAR_FIELDS: Array<[string, string]> = [['weekLabel', 'string'], ['lateCount', 'string'], ['hasLate', 'boolean']];

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
    ['previousWeek', 'signal'], ['nextWeek', 'signal'], ['openProjects', 'signal'], ['openMoney', 'signal'],
    ['openSettings', 'signal'], ['shutDown', 'signal'], ['signOut', 'signal']
  ]),
  instantiates: [C.themeSwitch],
  nodes: [
    inputs('abIn', 'Which week', APP_BAR_FIELDS),
    outputs('abOut', 'What was pressed', [
      ['previousWeek', 'signal'], ['nextWeek', 'signal'], ['openProjects', 'signal'], ['openMoney', 'signal'],
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
    // A group as wide as its buttons may still not fit a phone: it wraps rather than running off the edge.
    group('abRight', 'Buttons', 'abRoot', { ...ROW_TIGHT('var(--space-2)'), flexWrap: 'wrap', rowGap: 'var(--space-2)', cssClassName: 'planner-shrink-wrap' }),
    place('abProjects', BUTTON, 'Open the projects', 'abRight', { ...BTN_GHOST, label: 'Projects' }),
    // M1 — Money, same size as the settings button, with how many things are late beside it (M6).
    group('abMoneyBox', 'Money', 'abRight', ROW_TIGHT('var(--space-0-5)')),
    place('abMoney', BUTTON, 'Open Money', 'abMoneyBox', { ...BTN_ICON('icon-euro', 'Money'), color: 'var(--foreground)', fontWeight: 'var(--font-bold)' }),
    group('abLateBox', 'How many are late', 'abMoneyBox', {
      ...ROW_TIGHT('var(--space-0)'),
      backgroundColor: 'var(--env-hobby-soft)',
      borderRadius: 'var(--radius-full)',
      paddingLeft: 'var(--space-1-5)',
      paddingRight: 'var(--space-1-5)'
    }),
    text('abLate', 'How many are late', 'abLateBox', '', { ...T_NUM, sizeMode: 'contentSize', fontSize: px(11), fontWeight: 'var(--font-bold)', color: 'var(--env-hobby-ink)' }),
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
    wire('abMoney', 'onClick', 'abOut', 'openMoney'),
    wire('abIn', 'lateCount', 'abLate', 'text'),
    wire('abIn', 'hasLate', 'abLateBox', 'mounted'),
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
/** `[node, label, action, the pane or balance output that presses it, which Logic/Mark]` */
const MARK_ACTIONS: Array<[string, string, string, string, 'twMarkPane' | 'twMarkBal']> = [
  ['twActTick', 'Tick it', 'tick', 'rpTick', 'twMarkPane'],
  ['twActChange', 'Save this one', 'change', 'rpSaveOne', 'twMarkPane'],
  ['twActReset', 'Back to the item', 'reset', 'rpResetOne', 'twMarkPane'],
  ['twActSkip', 'Skip this one', 'skip', 'rpSkip', 'twMarkPane'],
  ['twActLost', 'Mark as lost', 'lost', 'rpLost', 'twMarkPane'],
  ['twActUntick', 'Untick', 'untick', 'rpUntick', 'twMarkPane'],
  ['twActSent', 'Mark as sent', 'sent', 'rpMarkSent', 'twMarkPane'],
  ['twActUnsend', 'Not sent after all', 'unsend', 'rpUnsend', 'twMarkPane'],
  ['twActHappened', 'It happened (Record balance)', 'happened', 'balHappened', 'twMarkBal'],
  ['twActBalLost', 'It is lost (Record balance)', 'lost', 'balLost', 'twMarkBal']
];

/** Every way into Money resets it to the summary of the month, on its three months. */
const OPEN_MONEY = (from: string, signal: string) => [
  wire(from, signal, 'twMoneyOn', 'do'),
  wire(from, signal, 'twSelClear', 'do'),
  wire(from, signal, 'twPaneNone', 'do'),
  wire(from, signal, 'twHorizon', 'reset')
];
const TO_PANE_NONE = (from: string, signal: string) => [wire(from, signal, 'twSelClear', 'do'), wire(from, signal, 'twPaneNone', 'do')];

/** The Money modal, the strip, the card's Billing and the drawer's late money, wired (TPL-010-M). */
const MONEY_WIRES: unknown[] = [
  // ── Ways in ──
  ...OPEN_MONEY('twBar', 'openMoney'),
  ...OPEN_MONEY('twCash', 'open'),
  // M14 — a box under the week opens Money on its repeat.
  wire('twCash', 'key', 'twStripRoute', 'in-key'),
  wire('twCash', 'pick', 'twStripRoute', 'run'),
  wire('twStripRoute', 'out-sel', 'twSelFromStrip', 'value'),
  wire('twStripRoute', 'out-go', 'twSelFromStrip', 'do'),
  wire('twStripRoute', 'out-go', 'twPaneNone', 'do'),
  wire('twStripRoute', 'out-go', 'twMoneyOn', 'do'),
  // M7 — a hoped project's name opens its card.
  wire('twCash', 'projectId', 'twCardFromMight', 'value'),
  wire('twCash', 'openProject', 'twCardFromMight', 'do'),
  // M15 — the drawer's late money opens where it can be ticked.
  wire('twMoneyLogic', 'lateKey', 'twChaseRoute', 'in-key'),
  wire('twDrawer', 'chase', 'twChaseRoute', 'run'),
  wire('twChaseRoute', 'out-sel', 'twSelFromChase', 'value'),
  wire('twChaseRoute', 'out-go', 'twSelFromChase', 'do'),
  wire('twChaseRoute', 'out-go', 'twPaneNone', 'do'),
  wire('twChaseRoute', 'out-go', 'twMoneyOn', 'do'),
  wire('twChaseRoute', 'out-go', 'twCloseDrawer', 'do'),
  // M5 / M16 — the card's + Add a bill and Add as hoped money open the editor on that project.
  wire('twCardRows', 'resolvedId', 'twItemFromCard', 'value'),
  ...(['addBill', 'addHope'] as const).flatMap((sig) => [
    wire('twCard', sig, 'twItemFromCard', 'do'),
    wire('twCard', sig, sig === 'addBill' ? 'twPaneNewBill' : 'twPaneNewHope', 'do'),
    wire('twCard', sig, 'twSelClear', 'do'),
    wire('twCard', sig, 'twMoneyOn', 'do'),
    wire('twCard', sig, 'twClearCard', 'do'),
    wire('twCard', sig, 'twEditOff', 'do')
  ]),
  // §4.2 — the card's Billing, for the project it is showing.
  wire('twCardRows', 'resolvedId', 'twMoneyView', 'cardProject'),
  ...BILLING_FIELDS.map(([n]) => wire('twMoneyView', n, 'twCard', n)),

  // ── What the modal shows ──
  wire('twVarMoney', 'value', 'twMoneyShown', 'in-open'),
  wire('twMoneyShown', 'out-shown', 'twMoney', 'shown'),
  wire('twMoneyShown', 'out-shown', 'twMoneyView', 'open'),
  wire('twVarFilter', 'value', 'twMoneyLogic', 'filter'),
  wire('twHorizon', 'currentCount', 'twMoneyLogic', 'horizon'),
  wire('twVarSel', 'value', 'twMoneyLogic', 'sel'),
  wire('twVarSel', 'value', 'twMoneyView', 'sel'),
  wire('twVarMoneyMode', 'value', 'twMoneyView', 'mode'),
  wire('twVarMoneyItem', 'value', 'twMoneyView', 'itemId'),
  ...(['groups', 'empty', 'emptyText', 'moreShown', 'upFill', 'upInk', 'pastFill', 'pastInk', 'recFill', 'recInk'] as const).map((n) => wire('twMoneyLogic', n, 'twMoney', n)),
  wire('twMoneyLogic', 'modalBalance', 'twMoney', 'balanceText'),
  wire('twMoneyView', 'cardClass', 'twMoney', 'cardClass'),
  ...PANE_PART_OUTS.map(([n]) => wire('twMoneyView', n, 'twMoney', n)),

  // ── The modal's own presses ──
  wire('twMoney', 'close', 'twMoneyOff', 'do'),
  ...TO_PANE_NONE('twMoney', 'close'),
  wire('twMoney', 'showUp', 'twFilterUp', 'do'),
  wire('twMoney', 'showPast', 'twFilterPast', 'do'),
  wire('twMoney', 'showRec', 'twFilterRec', 'do'),
  wire('twMoney', 'more', 'twHorizon', 'increase'),
  wire('twMoney', 'add', 'twPaneNew', 'do'),
  wire('twMoney', 'add', 'twSelClear', 'do'),
  ...(['record', 'sumRecordBalance'] as const).flatMap((sig) => [wire('twMoney', sig, 'twPaneBalance', 'do'), wire('twMoney', sig, 'twSelClear', 'do')]),
  wire('twMoney', 'key', 'twPickRoute', 'in-key'),
  wire('twMoney', 'kind', 'twPickRoute', 'in-kind'),
  wire('twMoney', 'pick', 'twPickRoute', 'run'),
  wire('twPickRoute', 'out-sel', 'twSelFromList', 'value'),
  wire('twPickRoute', 'out-toRepeat', 'twSelFromList', 'do'),
  wire('twPickRoute', 'out-toRepeat', 'twPaneNone', 'do'),
  wire('twPickRoute', 'out-item', 'twItemFromList', 'value'),
  wire('twPickRoute', 'out-toItem', 'twItemFromList', 'do'),
  wire('twPickRoute', 'out-toItem', 'twPaneEdit', 'do'),
  wire('twPickRoute', 'out-toItem', 'twSelClear', 'do'),
  // The phone's ‹ Money on each part goes back to the list.
  ...(['sumBack', 'rpBack', 'endBack', 'balBack', 'edBack'] as const).flatMap((sig) => TO_PANE_NONE('twMoney', sig)),

  // ── One repeat ──
  wire('twMoney', 'rpChangeOne', 'twPaneChange', 'do'),
  wire('twMoneyView', 'pickedItemId', 'twItemFromPane', 'value'),
  wire('twMoney', 'rpChangeItem', 'twItemFromPane', 'do'),
  wire('twMoney', 'rpChangeItem', 'twPaneEdit', 'do'),
  wire('twMoney', 'rpEndItem', 'twItemFromPane', 'do'),
  wire('twMoney', 'rpEndItem', 'twPaneEnd', 'do'),
  wire('twMoneyView', 'agreeItemId', 'cmdAgreeItem', 'itemId'),
  wire('twMoney', 'rpAgreed', 'cmdAgreeItem', 'do'),
  // Saving or undoing a change to this one closes its form.
  wire('twMoney', 'rpSaveOne', 'twPaneNone', 'do'),
  wire('twMoney', 'rpResetOne', 'twPaneNone', 'do'),
  // Every press that changes a repeat: its action, then Logic/Mark, then one of the two mark commands.
  ...MARK_ACTIONS.flatMap(([id, , , from, markNode]) => [
    wire('twMoney', from, id, 'run'),
    wire(id, 'out-action', markNode, 'action'),
    wire(id, 'out-go', markNode, 'go')
  ]),
  wire('twVarSel', 'value', 'twMarkPane', 'key'),
  ...(['tickOn', 'tickAmount', 'tickRest', 'chDate', 'chAmount', 'chNote', 'sentOn', 'sentAmount'] as const).map((n) => wire('twMoney', under('rp', n), 'twMarkPane', n)),
  wire('twMoney', 'balKey', 'twMarkBal', 'key'),
  ...(['twMarkPane', 'twMarkBal'] as const).flatMap((mk) => [
    ...MARK_FIELDS.flatMap(([n]) => [wire(mk, n, 'cmdAddMark', n), wire(mk, n, 'cmdEditMark', n)]),
    wire(mk, 'markId', 'cmdEditMark', 'markId'),
    wire(mk, 'add', 'cmdAddMark', 'do'),
    wire(mk, 'edit', 'cmdEditMark', 'do')
  ]),

  // ── End it ──
  wire('twMoneyView', 'endItemId', 'cmdEndItem', 'itemId'),
  wire('twMoney', 'endAt', 'cmdEndItem', 'until'),
  wire('twMoney', 'endGo', 'cmdEndItem', 'do'),
  wire('cmdEndItem', 'done', 'twPaneNone', 'do'),
  wire('cmdEndItem', 'done', 'twSelClear', 'do'),
  wire('twMoney', 'endCancel', 'twPaneNone', 'do'),

  // ── The item editor: a new item is Add money item, an existing one Edit money item ──
  wire('twMoneyView', 'isNewItem', 'twIsNewItem', 'condition'),
  wire('twMoney', 'edSave', 'twIsNewItem', 'eval'),
  wire('twIsNewItem', 'ontrue', 'cmdAddItem', 'do'),
  wire('twIsNewItem', 'onfalse', 'cmdEditItem', 'do'),
  wire('twMoneyView', 'editItemId', 'cmdEditItem', 'itemId'),
  ...MONEY_EDIT_VALUES.flatMap(([n]) => [wire('twMoney', under('ed', n), 'cmdAddItem', n), wire('twMoney', under('ed', n), 'cmdEditItem', n)]),
  // The form closes on the WRITE, not the press.
  wire('cmdAddItem', 'done', 'twPaneNone', 'do'),
  wire('cmdEditItem', 'done', 'twPaneNone', 'do'),
  wire('twMoney', 'edCancel', 'twPaneNone', 'do'),

  // ── Record balance (M11) ──
  wire('twMoney', 'balOn', 'cmdRecordBalance', 'date'),
  wire('twMoney', 'balAmount', 'cmdRecordBalance', 'amount'),
  wire('twMoney', 'balSave', 'cmdRecordBalance', 'do'),
  wire('cmdRecordBalance', 'done', 'twPaneNone', 'do'),
  wire('twMoney', 'balCancel', 'twPaneNone', 'do'),
  // Part of it… opens that repeat, where the amount that came in is typed.
  wire('twMoney', 'balKey', 'twPartRoute', 'in-key'),
  wire('twMoney', 'balPart', 'twPartRoute', 'run'),
  wire('twPartRoute', 'out-sel', 'twSelFromPart', 'value'),
  wire('twPartRoute', 'out-go', 'twSelFromPart', 'do'),
  wire('twPartRoute', 'out-go', 'twPaneNone', 'do')
];

const PAGE_WEEK: Tpl010Component = {
  path: 'Pages/Week',
  description: 'The week: the envelopes, the moves, six days of blocks and the money under them, with the projects card, the Money modal and the evening drawer over the top of it.',
  instantiates: [
    C.appBar, C.envelopeTile, C.movesStrip, C.dayColumn, C.cashStrip, C.projectCard, C.shutdownDrawer, C.settingsSheet,
    C.blockSheet, C.dayPicker, C.moneySheet,
    C.plannerData, C.envelopes, C.dayColumns, C.moves, C.money, C.moneyView, C.mark, C.shutdown, '/Logic/Card rows',
    C.addBlock, C.saveBlock, C.addTime, C.carryBlock, C.dropBlock, C.placeMove, C.moveBlock,
    C.addProject, C.editProject, C.setMonthPlan, C.editSettings,
    C.addMoneyItem, C.editMoneyItem, C.endMoneyItem, C.agreeMoneyItem, C.addMark, C.editMark, C.recordBalance
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
    place('twMoney', C.moneySheet, 'Money', 'twRoot'),
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
    logic('twMoneyLogic', C.money, 'The money, drawn'),
    logic('twMoneyView', C.moneyView, 'What the Money pane and the card’s Billing show'),
    logic('twMarkPane', C.mark, 'The mark a press in the pane writes'),
    logic('twMarkBal', C.mark, 'The mark an answer in Record balance writes'),
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
Outputs.billings = [
  { Label: 'Hourly: billed for the hours', Value: 'hourly' },
  { Label: 'Fixed: a set amount for the agreed work', Value: 'fixed' }
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
  Outputs.billing = '';
  Outputs.termsDays = '';
  Outputs.agreedHours = '';
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
// M21 — hourly unless it says fixed; the terms a new bill's due date is pre-filled from (M5).
Outputs.billing = src.billing === 'fixed' ? 'fixed' : 'hourly';
Outputs.termsDays = String(num(src.termsDays, 14));
Outputs.agreedHours = num(src.agreedHours, 0) > 0 ? String(num(src.agreedHours, 0)) : '';
Outputs.title = mode === 'new' ? 'New project' : 'Edit ' + String(p.name || 'the project');`
    ),

    /**
     * **M1 — the Money modal.** What it is showing is five variables: open, the filter, the repeat
     * picked, the pane's mode, and the item the mode is about. Each way in sets them with nodes of
     * its own (memory: nodegx-sheet-traps, trap 5), and every value a press needs travels WITH the
     * press, from a Function that writes it and pulses in the same run (GAM-011's rule).
     */
    logic('twVarMoney', VARIABLE, 'Is Money open?', { name: VAR.moneyOpen }),
    logic('twMoneyOn', SET_VARIABLE, 'Open Money', { name: VAR.moneyOpen, setWith: 'boolean', value: true }),
    logic('twMoneyOff', SET_VARIABLE, 'Close Money', { name: VAR.moneyOpen, setWith: 'boolean', value: false }),
    derive('twMoneyShown', 'Is Money open?', 'Outputs.shown = Inputs.open === true;'),
    logic('twVarFilter', VARIABLE, 'Which list Money shows', { name: VAR.moneyFilter }),
    logic('twFilterUp', SET_VARIABLE, 'Show Upcoming', { name: VAR.moneyFilter, setWith: 'string', value: 'up' }),
    logic('twFilterPast', SET_VARIABLE, 'Show Past', { name: VAR.moneyFilter, setWith: 'string', value: 'past' }),
    logic('twFilterRec', SET_VARIABLE, 'Show Recurring', { name: VAR.moneyFilter, setWith: 'string', value: 'rec' }),
    logic('twHorizon', 'Counter', 'How many more three months to show', { startValue: 0 }),
    logic('twVarSel', VARIABLE, 'The repeat Money has picked', { name: VAR.moneySel }),
    logic('twSelFromList', SET_VARIABLE, 'Pick the line pressed in the list', { name: VAR.moneySel, setWith: 'string' }),
    logic('twSelFromStrip', SET_VARIABLE, 'Pick the box pressed under the week', { name: VAR.moneySel, setWith: 'string' }),
    logic('twSelFromChase', SET_VARIABLE, 'Pick the late money the drawer raised', { name: VAR.moneySel, setWith: 'string' }),
    logic('twSelFromPart', SET_VARIABLE, 'Pick the line answered Part of it', { name: VAR.moneySel, setWith: 'string' }),
    logic('twSelClear', SET_VARIABLE, 'Pick nothing', { name: VAR.moneySel, setWith: 'string', value: '' }),
    logic('twVarMoneyMode', VARIABLE, 'What Money’s pane is', { name: VAR.moneyMode }),
    ...([
      ['twPaneNone', 'The summary, or the line picked', ''],
      ['twPaneChange', 'Change this one', 'change'],
      ['twPaneEdit', 'Change the item', 'edit'],
      ['twPaneNew', 'Add money', 'new'],
      ['twPaneNewBill', 'A bill for the project on the card', 'newBill'],
      ['twPaneNewHope', 'Hoped money from the project on the card', 'newHope'],
      ['twPaneEnd', 'End the item', 'end'],
      ['twPaneBalance', 'Record balance', 'balance']
    ] as Array<[string, string, string]>).map(([id, label, value]) => logic(id, SET_VARIABLE, label, { name: VAR.moneyMode, setWith: 'string', value })),
    logic('twVarMoneyItem', VARIABLE, 'The item Money’s pane is about', { name: VAR.moneyItem }),
    logic('twItemFromList', SET_VARIABLE, 'The item pressed in Recurring', { name: VAR.moneyItem, setWith: 'string' }),
    logic('twItemFromPane', SET_VARIABLE, 'The item the picked line comes from', { name: VAR.moneyItem, setWith: 'string' }),
    logic('twItemFromCard', SET_VARIABLE, 'The project on the card', { name: VAR.moneyItem, setWith: 'string' }),
    logic('twCardFromMight', SET_VARIABLE, 'Show the project you might earn from', { name: VAR.cardProject, setWith: 'string' }),
    /** A line in the list: a repeat opens in the pane; an item in Recurring opens in the editor. */
    script(
      'twPickRoute',
      'A line or an item?',
      `var key = String(Inputs.key || ''), kind = String(Inputs.kind || '');
if (key === '') return;
if (kind === 'item') { Outputs.item = key; Outputs.toItem(); return; }
Outputs.sel = key + '|' + (kind || 'pay');
Outputs.toRepeat();`,
      ['key', 'kind']
    ),
    script('twStripRoute', 'The box pressed, as a line', "var key = String(Inputs.key || '');\nif (key === '') return;\nOutputs.sel = key + '|pay';\nOutputs.go();", ['key']),
    script('twChaseRoute', 'The late money, as a line', "var key = String(Inputs.key || '');\nif (key === '') return;\nOutputs.sel = key + '|pay';\nOutputs.go();", ['key']),
    script('twPartRoute', 'The line answered Part of it', "var key = String(Inputs.key || '');\nif (key === '') return;\nOutputs.sel = key + '|pay';\nOutputs.go();", ['key']),
    // One Function per thing a press does to a repeat: it says which, and presses in the same run.
    ...MARK_ACTIONS.map(([id, label, action]) => script(id, label, `Outputs.action = '${action}';\nOutputs.go();`, [])),
    logic('twIsNewItem', CONDITION, 'Is it a new money item?', signalOnly('condition')),
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
Outputs.focusHours = String(num(s.focusHours, 6));
Outputs.savingsTarget = String(num(s.savingsTarget, 0));
Outputs.lowWaterMark = String(num(s.lowWaterMark, 0));`
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
    logic('cmdSettings', C.editSettings, 'Save the settings'),
    logic('cmdAddItem', C.addMoneyItem, 'Add a money item'),
    logic('cmdEditItem', C.editMoneyItem, 'Change a money item'),
    logic('cmdEndItem', C.endMoneyItem, 'End a money item'),
    logic('cmdAgreeItem', C.agreeMoneyItem, 'Hoped money is agreed'),
    logic('cmdAddMark', C.addMark, 'Mark a repeat for the first time'),
    logic('cmdEditMark', C.editMark, 'Change the mark on a repeat'),
    logic('cmdRecordBalance', C.recordBalance, 'Record the balance')
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
    wire('twKeys', 'out-escape', 'twMoneyOff', 'do'),
    wire('twKeys', 'out-escape', 'twSelClear', 'do'),
    wire('twKeys', 'out-escape', 'twPaneNone', 'do'),
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
    wire('twData', 'settings', 'twSettings', 'in-settings'),
    // The money: the same records into all four money Functions.
    ...(['twMoneyLogic', 'twMoneyView', 'twMarkPane', 'twMarkBal'] as const).flatMap((id) => [
      wire('twData', 'moneyItems', id, 'items'),
      wire('twData', 'moneyMarks', id, 'marks'),
      wire('twData', 'balanceReadings', id, 'readings'),
      wire('twData', 'projects', id, 'projects'),
      // The blocks from four weeks back are what an hours bill is counted from (M23).
      wire('twData', 'moveBlocks', id, 'blocks'),
      wire('twData', 'settings', id, 'settings'),
      wire('twData', 'marksSince', id, 'since')
    ]),
    wire('twMoneyLogic', 'targetHours', 'twEnv', 'targetHours'),

    // The four tiles, the chips, the six columns, the money.
    wire('twEnv', 'rows', 'twEnvEach', 'items'),
    wire('twEnv', 'planLine', 'twPlanLine', 'text'),
    wire('twMovesLogic', 'rows', 'twMoves', 'rows'),
    wire('twMovesLogic', 'empty', 'twMoves', 'empty'),
    wire('twDays', 'columns', 'twDayEach', 'items'),
    // M14 — the bottom of the week.
    wire('twMoneyLogic', 'stripRows', 'twCash', 'rows'),
    wire('twMoneyLogic', 'stripBalance', 'twCash', 'balanceText'),
    ...(['monthName', 'monthText', 'mightShown', 'mightLead', 'mightRows', 'lowText', 'lowColor', 'footText'] as const).map((n) => wire('twMoneyLogic', n, 'twCash', n)),
    wire('twMoneyLogic', 'lateCount', 'twBar', 'lateCount'),
    wire('twMoneyLogic', 'hasLate', 'twBar', 'hasLate'),

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
    wire('twMoneyLogic', 'lateConcern', 'twShutLogic', 'lateConcern'),
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

    wire('twMoneyLogic', 'targetLine', 'twSheet', 'targetLine'),
    wire('twSheet', 'openMoney', 'twCloseSheet', 'do'),
    wire('twSheet', 'openMoney', 'twMoneyOn', 'do'),
    wire('twSheet', 'openMoney', 'twSelClear', 'do'),
    wire('twSheet', 'openMoney', 'twPaneNone', 'do'),
    wire('twEnv', 'planLine', 'twSheet', 'planLine'),
    ...(['rate', 'focusHours', 'savingsTarget', 'lowWaterMark'] as const).flatMap((n) => [
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
    wire('twSheet', 'planMonth', 'cmdMonthPlan', 'do'),

    // The one sentence a failed write shows.
    wire('twVarProblem', 'value', 'twProblem', 'text'),
    wire('twVarProblem', 'value', 'twHasProblem', 'in-text'),
    wire('twHasProblem', 'out-shown', 'twProblem', 'mounted'),

    ...MONEY_WIRES,

    // After any change, load the week again.
    ...['cmdAddBlock', 'cmdSave', 'cmdTime', 'cmdCarry', 'cmdDrop', 'cmdPlace', 'cmdPlaceDay', 'cmdMoveBlock', 'cmdTakeOut', 'cmdAddProject', 'cmdEditProject', 'cmdMonthPlan', 'cmdSettings',
      'cmdAddItem', 'cmdEditItem', 'cmdEndItem', 'cmdAgreeItem', 'cmdAddMark', 'cmdEditMark', 'cmdRecordBalance'].map(
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
  EDIT_SETTINGS,
  ADD_MONEY_ITEM,
  EDIT_MONEY_ITEM,
  END_MONEY_ITEM,
  AGREE_MONEY_ITEM,
  ADD_MARK,
  EDIT_MARK,
  RECORD_BALANCE,
  // Logic: the only places a number or a sentence is decided.
  PLANNER_DATA,
  ENVELOPES,
  DAY_COLUMNS,
  MOVES,
  MONEY,
  MONEY_VIEW,
  MARK,
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
  MONEY_ROW,
  MONEY_MONTH,
  BALANCE_ROW,
  MIGHT_LINK,
  KEY_LINE,
  PROJECT_LIST_ROW,
  PROJECT_GROUP,
  CARRY_ROW,
  MOVES_STRIP,
  DAY_HEADER,
  DAY_COLUMN,
  CASH_STRIP,
  DATE_PICKER,
  ENTRY_ROW,
  PROJECT_DETAIL,
  PROJECT_EDITOR,
  PROJECT_CARD,
  SHUTDOWN_DRAWER,
  SETTINGS_SHEET,
  MONEY_SUMMARY,
  MONEY_REPEAT,
  MONEY_END,
  MONEY_BALANCE,
  MONEY_EDITOR,
  MONEY_SHEET,
  BLOCK_SHEET,
  DAY_PICK,
  DAY_PICKER,
  // The pages.
  PAGE_WEEK,
  PAGE_SIGN_IN
];
