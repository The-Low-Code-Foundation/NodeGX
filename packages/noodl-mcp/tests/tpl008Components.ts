/**
 * TPL-008 — the todo list: one list ordered by what you will do next, and a
 * history of everything that ever happened to each task.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * ## The shape, in one paragraph
 *
 * `Logic/Todo data` holds the queries (tasks, next actions, history), and
 * `Pages/Todo` hands what they load to three `Logic/` components that turn it into
 * what the screen draws. The visible parts live in `Todo/`, and `Todo/Dialog flow`
 * asks "what happened?" before a close, reopen, tick or untick. **Everything a
 * person can do is one component in `Commands/`**: a guard `Function` that decides
 * whether there is anything to do, the record write, then `Logic/Write history`.
 * After any command the page asks `Logic/Todo data` to load everything again.
 * Nothing is ever deleted — see the policy.
 *
 * ## 🔴 The traps this file is written against (each one measured on an earlier template)
 *
 * - **A `Variable` is global by name** (D57). The page uses that on purpose for the
 *   selection and the dialog — one of each — and never for anything a row owns.
 *   A row's own state (is its description open?) is a `States` node.
 * - **A value wire with several producers holds whichever published LAST**, not the
 *   one whose signal fired. So "which task is the dialog about" is written by a
 *   separate `Set Variable` per producer — the list's close button and the detail
 *   pane's close button never share a value port.
 * - **A direction is an instance parameter, never a value on a wire** (TPL-005):
 *   `Commands/Move task` is placed three times, as up, down and top.
 * - **A repeater row needs an `id`** or re-runs pile rows up. Every row the `Logic/`
 *   scripts build carries the record's id.
 * - **`Function` `Outputs` publish only on change** — every array is built fresh.
 * - **A `Condition` fed by a signal and a value** gets `runOnChange-condition: false`,
 *   so it tests only when `eval` pulses.
 * - **`States` with transitions on never publishes a colour** (D49):
 *   `useTransitions: false` on every States node here.
 * - **`contentSize` text does not wrap** (`white-space: pre`): anything a person
 *   typed is `contentHeight` at 100% width.
 *
 * @module noodl-mcp/tests/tpl008Components
 */
import {
  composition,
  REMINDERS_TOGGLE_SCRIPT,
  REMINDERS_TURN_OFF_CLASS,
  REMINDERS_TURN_ON_CLASS,
  THEME_BOOT_SCRIPT,
  THEME_FLIP_SCRIPT,
  THEME_TO_DARK_CLASS,
  THEME_TO_LIGHT_CLASS,
  themeCss
} from './tpl008Theme';
import { DATE_PICKER_DESCRIPTION, DATE_PICKER_INPUTS, DATE_PICKER_OUTPUTS, datePickerGraph } from './datePicker';

export const ROUTER = 'Main';
export const APP_COMPONENT = 'App';
/** TPL-008-RC adds `Routine` (a thing that repeats) and `RoutineCheck` (one occurrence ticked off). */
export const COLLECTIONS = ['Task', 'Action', 'Event', 'Routine', 'RoutineCheck'] as const;
/** One row per device with reminders on (s6). Written by the host's script, read by its sender — not part of the list. */
export const REMINDER_COLLECTION = 'PushSubscription';

export interface Tpl008Component {
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
  themeSwitch: '/Todo/Theme switch',
  remindersSwitch: '/Todo/Reminders switch',
  datePicker: '/Todo/Date picker',
  header: '/Todo/Header',
  problem: '/Todo/Problem banner',
  taskRow: '/Todo/Task row',
  taskList: '/Todo/Task list',
  doneRow: '/Todo/Done row',
  doneList: '/Todo/Done list',
  logEntry: '/Todo/Log entry',
  logList: '/Todo/Log list',
  summary: '/Todo/Task summary',
  actionRow: '/Todo/Action row',
  nextActions: '/Todo/Next actions',
  historyEntry: '/Todo/History entry',
  history: '/Todo/History',
  dialog: '/Todo/Note dialog',
  dialogFlow: '/Todo/Dialog flow',
  todoData: '/Logic/Todo data',
  taskRows: '/Logic/Task rows',
  selected: '/Logic/Selected task',
  logRows: '/Logic/Log rows',
  writeHistory: '/Logic/Write history',
  addTask: '/Commands/Add task',
  moveTask: '/Commands/Move task',
  closeTask: '/Commands/Close task',
  reopenTask: '/Commands/Reopen task',
  renameTask: '/Commands/Rename task',
  setDeadline: '/Commands/Set deadline',
  addAction: '/Commands/Add action',
  tickAction: '/Commands/Tick action',
  untickAction: '/Commands/Untick action',
  moveAction: '/Commands/Move action',
  renameAction: '/Commands/Rename action',
  describeAction: '/Commands/Describe action',
  addNote: '/Commands/Add note',
  // TPL-008-RC — Today, and things that repeat
  todayRow: '/Todo/Today row',
  todayList: '/Todo/Today list',
  routineRow: '/Todo/Routine row',
  routineList: '/Todo/Routine list',
  dayChip: '/Todo/Day chip',
  slotChip: '/Todo/Slot chip',
  routineSummary: '/Todo/Routine summary',
  todayRows: '/Logic/Today rows',
  selectedRoutine: '/Logic/Selected routine',
  addRoutine: '/Commands/Add routine',
  renameRoutine: '/Commands/Rename routine',
  setSchedule: '/Commands/Set schedule',
  setRoutineDates: '/Commands/Set routine dates',
  tickRoutine: '/Commands/Tick routine',
  stopRoutine: '/Commands/Stop routine',
  pageTodo: '/Pages/Todo',
  pageSignIn: '/Pages/Sign in'
} as const;

/** The app-wide variables. Global by name, and each is used for exactly one thing. */
export const VAR = {
  selected: 'todoSelected',
  problem: 'todoProblem',
  lastHistory: 'todoLastHistory',
  dialogTask: 'todoDialogTask',
  dialogAction: 'todoDialogAction',
  dialogSubject: 'todoDialogSubject',
  /** s8 — which next action has its description open. One at a time, and never a per-row toggle (see `ACTION_ROW`). */
  openAction: 'todoOpenAction',
  /** RC — which Today row (one occurrence of a routine) the dialog is ticking off. */
  dialogOccurrence: 'todoDialogOccurrence',
  /** RC — the days picked for the next time added to a weekly or monthly schedule, e.g. `"tue,thu"`. */
  slotDays: 'todoSlotDays'
} as const;

/** The one sentence a failed write shows. */
export const PROBLEM_TEXT = 'That change did not save. Check your connection, then try again.';
export const LOAD_PROBLEM_TEXT = 'Your list could not be loaded. Check that the backend is running, then sign in again.';

/**
 * Node comments on the two Variables that live in components drawn more than once (every
 * command places `Logic/Write history`; Move task and Move action are placed 3 and 2 times).
 * Both are app-wide ON PURPOSE, and "shared on purpose" is GAM-005's escape for saying so.
 */
export const SHARED_LAST_LINE =
  'Shared on purpose: every command writes history through here, and a move from the up button then the down button must extend the same line (R5).';
export const SHARED_PROBLEM = 'Shared on purpose: this is the one sentence the Problem banner shows, whichever command failed.';

const FUNCTION = 'JavaScriptFunction';
const STATES = 'States';
const FOR_EACH = 'For Each';
const VARIABLE = 'Variable2';
const SET_VARIABLE = 'Set Variable';
const CONDITION = 'Condition';
const NAVIGATE = 'RouterNavigate';
const BUTTON = 'net.noodl.controls.button';
const TEXT_INPUT = 'net.noodl.controls.textinput';
const QUERY = 'DbCollection2';
const CREATE = 'NewDbModelProperties';
const UPDATE = 'SetDbModelProperties';

const px = (value: number) => ({ value, unit: 'px' });
const pct = (value: number) => ({ value, unit: '%' });
/**
 * 🔴 **D77 — lucide is a library module, and a template ships none.** The icon ports take a
 * `{ class: 'lucide', code }` and the viewer writes `<span class="lucide icon-moon">`: correct
 * markup for a font that is not there, so it is a span of nothing. Measured 2026-09-21 on the
 * shipped `templates/todo-list-demo` — *"17 text elements and not one picture or glyph"*. Every
 * icon button in this template was an empty box, and had been since it was published.
 *
 * So every icon here is a **character** now, at the size the icon was, in the colour the icon
 * was. No module, and it draws in any font on any machine. `tpl008Template.test.ts` fails if a
 * node asks for an icon again — the same gate TPL-010 carries.
 */
const GLYPH: Record<string, string> = {
  'icon-check': '✓',
  'icon-moon': '☾',
  'icon-sun': '☼',
  'icon-align-left': '≡',
  'icon-x': '✕',
  // ⚠️ The one pair with no monochrome character: Unicode has no crossed-out bell outside the
  // emoji block, and the design is *"the crossed-out bell says reminders are off"*. These two
  // render in colour where ☾ and ☼ do not. Worth a word instead if that reads badly in the header.
  'icon-bell-off': '🔕',
  'icon-bell-ring': '🔔'
};

const glyph = (code: string): string => {
  const g = GLYPH[code];
  if (!g) throw new Error(`tpl008: no character stands in for ${code}; add one to GLYPH or use a word`);
  return g;
};

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
  return {
    inputs: ins.map(([n, t]) => port(n, t)),
    outputs: outs.map(([n, t]) => port(n, t))
  };
}

// ── The look, from the product's own compositions ───────────────────────────

const T_META = composition('meta');
const T_BODY = composition('body');
const T_TITLE = composition('cardTitle');
const T_ERROR = { ...composition('fieldError'), color: 'var(--destructive)' };
const T_HEADING = { fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--muted-foreground)' };

const wide = (params: Record<string, unknown>) => ({ ...params, sizeMode: 'contentHeight', width: pct(100) });

const BUTTON_SHAPE = {
  borderRadius: 'var(--radius-md)',
  paddingLeft: 'var(--space-4)',
  paddingRight: 'var(--space-4)',
  paddingTop: 'var(--space-2)',
  paddingBottom: 'var(--space-2)'
};
const BTN_PRIMARY = { ...composition('primaryButton'), ...BUTTON_SHAPE };
const BTN_OUTLINE = { ...composition('outlineButton'), ...BUTTON_SHAPE };
const BTN_GHOST = {
  backgroundColor: 'transparent',
  color: 'var(--foreground)',
  borderStyle: 'none',
  borderRadius: 'var(--radius-md)',
  paddingLeft: 'var(--space-3)',
  paddingRight: 'var(--space-3)',
  paddingTop: 'var(--space-2)',
  paddingBottom: 'var(--space-2)',
  fontSize: 'var(--text-sm)',
  fontWeight: 'var(--font-medium)',
  sizeMode: 'contentSize'
};
/**
 * 🔴 **D72 — a Button has no accessible-name port.** The label IS the name: `Button.tsx`
 * writes it inside the `<button>`, and there is no second port to put a name in. This used
 * to be worked around with `font-size: 0`, which hid the words and let the icon carry the
 * picture — but the icon was never there (D77), so the workaround hid the only thing these
 * buttons had. The glyph is the label now and the name went with it. D72 is the port that
 * would give both back. The drive reads the names back from Chrome's accessibility tree.
 */
/**
 * A ghost button whose whole label is one character (D77).
 *
 * 🔴 **This costs the accessible name.** D72 above is why: the label is the only thing that
 * names a Button, and the label now has to carry the glyph, so a screen reader reads "☾" where
 * it used to read "Use dark theme". That name was being read off a button nobody could see, so
 * this is a trade between two faults, not a regression from a working state — but it is a real
 * cost and D72 is the port that would end it. `name` is kept as the node's editor label.
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
  fontSize: 'var(--text-base)',
  paddingLeft: 'var(--space-2)',
  paddingRight: 'var(--space-2)'
});
/**
 * The round tick box. Its fill and colours are wired, so a done row and an open row share one
 * node — and the tick itself is a character (D77), so `color` is what the row wires where
 * `iconColor` used to be.
 */
const BTN_CHECK = {
  label: glyph('icon-check'),
  fontSize: 'var(--text-sm)',
  color: 'var(--border-control)',
  backgroundColor: 'transparent',
  borderStyle: 'solid',
  borderWidth: 'var(--border-2)',
  borderColor: 'var(--border-control)',
  borderRadius: 'var(--radius-full)',
  sizeMode: 'explicit',
  width: px(26),
  height: px(26),
  paddingLeft: 'var(--space-0)',
  paddingRight: 'var(--space-0)',
  paddingTop: 'var(--space-0)',
  paddingBottom: 'var(--space-0)'
};
const FIELD = {
  ...composition('textField'),
  paddingTop: 'var(--space-2)',
  paddingBottom: 'var(--space-2)'
};
const COLUMN = (gap: string) => ({ flexDirection: 'column', sizeMode: 'contentHeight', width: pct(100), rowGap: gap });
const ROW = (gap: string) => ({ flexDirection: 'row', alignItems: 'center', sizeMode: 'contentHeight', width: pct(100), columnGap: gap });
const RULE_BELOW = { borderBottomStyle: 'solid', borderBottomWidth: 'var(--border-1)', borderBottomColor: 'var(--border-subtle)' };

// ── Shared script helpers ───────────────────────────────────────────────────

/**
 * Dates, as a person reads them. `deadline` is a `YYYY-MM-DD` string read as a LOCAL
 * day — `new Date('2026-09-14')` is UTC midnight and lands a day early west of
 * Greenwich (TPL-001 D25).
 */
export const DATE_FNS = String.raw`function toDay(s) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}
var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function pad(n) { return (n < 10 ? '0' : '') + n; }
function fmtDay(d) { return DOW[d.getDay()] + ' ' + d.getDate() + ' ' + MON[d.getMonth()]; }
function fmtTime(d) { return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
function startOfToday() { var d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }
function when(v) {
  if (v === undefined || v === null || v === '') return null;
  var d = v instanceof Date ? v : new Date(v);
  return isNaN(d.getTime()) ? null : d;
}
function dayLabel(d) {
  var t = startOfToday();
  if (d.getTime() >= t) return 'Today';
  if (d.getTime() >= t - 86400000) return 'Yesterday';
  return fmtDay(d);
}
function due(s) {
  var d = toDay(s);
  if (!d) return { text: '', late: false };
  var n = Math.round((d.getTime() - startOfToday()) / 86400000);
  if (n < 0) return { text: 'Overdue by ' + (-n) + (n === -1 ? ' day' : ' days'), late: true };
  if (n === 0) return { text: 'Due today', late: true };
  if (n === 1) return { text: 'Due tomorrow', late: false };
  if (n <= 7) return { text: 'Due in ' + n + ' days', late: false };
  return { text: 'Due ' + fmtDay(d), late: false };
}
function ago(d) {
  var ms = Date.now() - d.getTime();
  if (ms < 3600000) return 'just now';
  if (ms < 86400000) return Math.round(ms / 3600000) + ' h ago';
  var n = Math.round(ms / 86400000);
  return n === 1 ? 'yesterday' : n + ' days ago';
}
function num(v, fallback) { var n = Number(v); return isFinite(n) ? n : fallback; }
function byPosition(a, b) { return num(a.position, 0) - num(b.position, 0); }
`;

/** Find a row by id in an array the page handed in. */
const FIND_ROW = `function findRow(rows, id) {
  for (var i = 0; i < rows.length; i++) if (rows[i] && rows[i].id === id) return rows[i];
  return null;
}
`;

/**
 * TPL-008-RC — **when a recurring item is due, in one place.** Richard (RC6): *"daily, weekly,
 * monthly options, with multiple slots per selected timescale"*.
 *
 * A `Routine` keeps its schedule as a `cadence` and a string of slots, so a row reads the same in
 * the app, in the demo's store and in the host's SQLite file:
 *
 * - daily — `"08:00,20:00"`;
 * - weekly — `"tue@09:00,thu@09:00"` (`mon` … `sun`);
 * - monthly — `"1@09:00,15@09:00,last@17:00"`. **A 31st in a 30-day month is its last day**, and
 *   a slot that lands on the same time twice that day is one occurrence.
 *
 * 🔴 **The host's push sender carries this block byte for byte** (between its `SCHEDULE_FNS`
 * markers), and `tpl008Template.test.ts` fails when they differ: the phone must buzz on exactly
 * the days the Today tab lists. Plain ES5, no `DATE_FNS` — the sender has none of it.
 */
export const SCHEDULE_FNS = String.raw`var SCHED_DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
var SCHED_WEEK = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
var SCHED_NAMES = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
function schedPad(n) { return (n < 10 ? '0' : '') + n; }
function schedIso(d) { return d.getFullYear() + '-' + schedPad(d.getMonth() + 1) + '-' + schedPad(d.getDate()); }
function schedDate(s) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
  if (!m) return null;
  var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return schedIso(d) === m[0] ? d : null;
}
function schedRank(day) {
  if (day === '') return 0;
  var w = SCHED_WEEK.indexOf(day);
  if (w >= 0) return w;
  return day === 'last' ? 32 : Number(day);
}
function schedSlots(cadence, text) {
  var out = [], seen = {};
  var parts = String(text || '').split(',');
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i].replace(/\s+/g, '').toLowerCase();
    if (p === '') continue;
    var at = p.indexOf('@');
    var day = at >= 0 ? p.slice(0, at) : '';
    var time = at >= 0 ? p.slice(at + 1) : p;
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) continue;
    if (cadence === 'daily') day = '';
    else if (cadence === 'weekly') {
      if (SCHED_WEEK.indexOf(day) < 0) continue;
    } else if (cadence === 'monthly') {
      if (day !== 'last') {
        if (!/^\d{1,2}$/.test(day) || Number(day) < 1 || Number(day) > 31) continue;
        day = String(Number(day));
      }
    } else continue;
    var key = day === '' ? time : day + '@' + time;
    if (seen[key]) continue;
    seen[key] = true;
    out.push({ day: day, time: time, key: key });
  }
  out.sort(function (a, b) { return schedRank(a.day) - schedRank(b.day) || (a.time < b.time ? -1 : a.time > b.time ? 1 : 0); });
  return out;
}
function schedJoin(slots) {
  var keys = [];
  for (var i = 0; i < slots.length; i++) keys.push(slots[i].key);
  return keys.join(',');
}
function schedStopDay(r) {
  if (!r || r.status !== 'stopped') return null;
  var s = r.stoppedAt ? new Date(r.stoppedAt) : null;
  if (!s || isNaN(s.getTime())) return new Date(0);
  s.setHours(0, 0, 0, 0);
  return s;
}
function schedOn(r, d) {
  if (!r) return [];
  var day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  var start = schedDate(r.startDate), end = schedDate(r.endDate), stop = schedStopDay(r);
  if (start && day < start) return [];
  if (end && day > end) return [];
  if (stop && day >= stop) return [];
  var last = new Date(day.getFullYear(), day.getMonth() + 1, 0).getDate();
  var slots = schedSlots(r.cadence, r.slots), out = [], seen = {};
  for (var i = 0; i < slots.length; i++) {
    var s = slots[i], hit = false;
    if (s.day === '') hit = true;
    else if (SCHED_WEEK.indexOf(s.day) >= 0) hit = SCHED_DAYS[day.getDay()] === s.day;
    else if (s.day === 'last') hit = day.getDate() === last;
    else hit = Math.min(Number(s.day), last) === day.getDate();
    if (hit && !seen[s.time]) {
      seen[s.time] = true;
      out.push(s.time);
    }
  }
  out.sort();
  return out;
}
function schedOrdinal(n) {
  var t = n % 100, u = n % 10;
  return n + (t >= 11 && t <= 13 ? 'th' : u === 1 ? 'st' : u === 2 ? 'nd' : u === 3 ? 'rd' : 'th');
}
function schedAnd(list) {
  return list.length < 2 ? list.join('') : list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1];
}
function schedDayName(cadence, day) {
  if (cadence === 'weekly') return SCHED_NAMES[day];
  return day === 'last' ? 'the last day' : 'the ' + schedOrdinal(Number(day));
}
function schedSlotLabel(cadence, s) {
  if (cadence === 'weekly') return SCHED_NAMES[s.day] + ' ' + s.time;
  if (cadence === 'monthly') return (s.day === 'last' ? 'Last day' : schedOrdinal(Number(s.day))) + ' ' + s.time;
  return s.time;
}
function schedDescribe(r) {
  var cadence = String((r && r.cadence) || '');
  var slots = schedSlots(cadence, r && r.slots);
  if (slots.length === 0) return 'No times yet';
  var i, k;
  if (cadence === 'daily') {
    var times = [];
    for (i = 0; i < slots.length; i++) times.push(slots[i].time);
    return 'Every day at ' + schedAnd(times);
  }
  var byDay = {}, order = [];
  for (i = 0; i < slots.length; i++) {
    if (!byDay[slots[i].day]) {
      byDay[slots[i].day] = [];
      order.push(slots[i].day);
    }
    byDay[slots[i].day].push(slots[i].time);
  }
  var same = true;
  for (k = 1; k < order.length; k++) if (byDay[order[k]].join() !== byDay[order[0]].join()) same = false;
  var lead = cadence === 'weekly' ? 'Every ' : 'Every month on ';
  var parts = [];
  if (same) {
    for (k = 0; k < order.length; k++) parts.push(schedDayName(cadence, order[k]));
    return lead + schedAnd(parts) + ' at ' + schedAnd(byDay[order[0]]);
  }
  for (k = 0; k < order.length; k++) parts.push(schedDayName(cadence, order[k]) + ' at ' + schedAnd(byDay[order[k]]));
  return lead + parts.join('; ');
}
function schedTime(text) {
  var t = String(text || '').trim().toLowerCase().replace(/\s+/g, '');
  var m = /^(\d{1,2})(?:[:.h]?(\d{2}))?(am|pm)?$/.exec(t);
  if (!m) return null;
  var h = Number(m[1]), min = m[2] ? Number(m[2]) : 0, ap = m[3] || '';
  if (min > 59) return null;
  if (ap) {
    if (h < 1 || h > 12) return null;
    if (h === 12) h = 0;
    if (ap === 'pm') h += 12;
  }
  if (h > 23) return null;
  return schedPad(h) + ':' + schedPad(min);
}
`;

/**
 * Richard (2026-09-24): *"a little drag and drop handle instead of the up down arrows that works on
 * desktop and mobile"*. **One script, placed once per list** (the open tasks, a task's next actions).
 *
 * The runtime's `Drag` node moves a box freely; it knows nothing of a list's order, and the
 * production engine the hosted sites run predates this checkout. So, the Date picker's way: a
 * `Function` is handed the rows Group (`this` → `getDOMElement()`) and attaches **pointer events**
 * — mouse, finger and pen alike — to it, by delegation, so rows the `For Each` redraws need nothing.
 *
 * - A row is `.todo-drag-row`; its grip is `.todo-drag-handle` (six dots, drawn in CSS — no font, D77).
 *   The grip is `touch-action: none`, so on a phone a finger on the grip drags and a finger anywhere
 *   else scrolls the page as it always did.
 * - While dragging, the row follows the pointer and the rows it passes slide out of its way; near
 *   the top or bottom of the window the page scrolls. **Only the rows at the front with `canMove`
 *   not false can move** (a ticked next action cannot), and a drop lands among them.
 * - On a drop in a new place it says `moved` with the row's `id` and the index it was dropped at,
 *   and keeps drawing the row there until the list arrives in its new order — which is what puts
 *   the drawing right, so there is no jump back and forth while the save is in flight.
 * - **The grip is a button to a keyboard and a screen reader**: focusable, named *Move "…"*, and
 *   the up and down arrow keys move it one place — the buttons it replaces did that, and said less.
 */
export const DRAG_ROW_CLASS = 'todo-drag-row';
export const DRAG_HANDLE_CLASS = 'todo-drag-handle';
export const DRAG_SORT_CSS = String.raw`.todo-drag-handle {
  position: relative; flex: 0 0 auto; cursor: grab; touch-action: none;
  -webkit-user-select: none; user-select: none; -webkit-touch-callout: none;
  border-radius: var(--radius-md, 6px);
}
.todo-drag-handle::before {
  content: ''; position: absolute; left: 50%; top: 50%; width: 10px; height: 16px; transform: translate(-50%, -50%);
  background-image: radial-gradient(circle, var(--muted-foreground, #6b7280) 1.4px, transparent 1.7px);
  background-size: 5px 5.34px;
}
.todo-drag-handle:hover { background-color: var(--muted, #f1f1f1); }
.todo-drag-handle:hover::before, .todo-drag-handle:focus-visible::before {
  background-image: radial-gradient(circle, var(--foreground, #1c1c1c) 1.4px, transparent 1.7px);
}
.todo-drag-handle:focus { outline: none; }
.todo-drag-handle:focus-visible { outline: 2px solid var(--ring, #3b82f6); outline-offset: 1px; }
/* !important: a row paints its own background inline (the selected one's surface), which beats a class. */
.todo-drag-row.todo-dragging {
  position: relative; z-index: 5;
  background-color: var(--surface-raised, var(--background, #ffffff)) !important;
  box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.12), 0 4px 6px -4px rgba(0, 0, 0, 0.1));
}
.todo-drag-row.todo-drag-shift { transition: transform 150ms ease; }
html.todo-drag-active, html.todo-drag-active * { cursor: grabbing !important; -webkit-user-select: none; user-select: none; }`;

export const DRAG_SORT_SCRIPT =
  `var CSS_ID = 'todo-drag-sort-css';\nvar CSS = ${JSON.stringify(DRAG_SORT_CSS)};\n` +
  `var ROW = ${JSON.stringify(DRAG_ROW_CLASS)}, HANDLE = ${JSON.stringify(DRAG_HANDLE_CLASS)};\n` +
  String.raw`var S = this.dragSort || (this.dragSort = {});
S.Outputs = Outputs;
S.rows = Inputs.rows || [];
if (typeof document === 'undefined') return;
if (!document.getElementById(CSS_ID)) {
  var sheet = document.createElement('style');
  sheet.id = CSS_ID;
  sheet.textContent = CSS;
  document.head.appendChild(sheet);
}

if (!S.ready) {
  S.ready = true;
  S.movable = function () {
    var n = 0;
    while (n < S.rows.length && S.rows[n] && S.rows[n].canMove !== false) n++;
    return n;
  };
  S.els = function () {
    return S.host ? Array.prototype.slice.call(S.host.querySelectorAll('.' + ROW)) : [];
  };
  S.name = function () {
    var els = S.els();
    for (var i = 0; i < els.length; i++) {
      var h = els[i].querySelector('.' + HANDLE);
      if (!h) continue;
      h.setAttribute('tabindex', '0');
      h.setAttribute('role', 'button');
      h.setAttribute('aria-label', 'Move “' + String((S.rows[i] && S.rows[i].title) || '') + '”');
      h.setAttribute('title', 'Drag to move, or use the up and down arrow keys');
    }
  };
  S.settle = function (animate) {
    S.pending = false;
    var els = S.els();
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      el.classList.remove('todo-drag-shift', 'todo-dragging');
      el.style.transition = animate ? 'transform 150ms ease' : 'none';
      el.style.transform = '';
    }
    if (!animate) {
      if (els.length) void els[0].offsetHeight;
      for (var j = 0; j < els.length; j++) els[j].style.transition = '';
    } else {
      setTimeout(function () {
        for (var k = 0; k < els.length; k++) els[k].style.transition = '';
      }, 200);
    }
  };
  S.place = function () {
    var d = S.drag;
    if (!d) return;
    var sy = window.scrollY || 0;
    var dy = d.lastClientY + sy - d.startY;
    var n = d.rects.length, me = d.rects[d.from];
    var lo = d.rects[0].top - me.top, hi = d.rects[n - 1].top + d.rects[n - 1].h - (me.top + me.h);
    dy = Math.max(lo, Math.min(hi, dy));
    d.row.style.transform = 'translateY(' + dy + 'px)';
    // Its LEADING edge past a neighbour's middle takes that place — the top edge going up, the bottom
    // going down. 🔴 Not its middle: held against the top of the list, a row as tall as the first one
    // has its middle exactly on the first one's, and could never take first place (measured on a phone).
    var top = me.top + dy, bottom = top + me.h, to = d.from, k;
    for (k = 0; k < d.from; k++) if (top < d.rects[k].top + d.rects[k].h / 2) { to = k; break; }
    for (k = n - 1; k > d.from; k--) if (bottom > d.rects[k].top + d.rects[k].h / 2) { to = k; break; }
    d.to = to;
    for (k = 0; k < n; k++) {
      if (k === d.from) continue;
      var shift = k > d.from && k <= to ? -me.h : k < d.from && k >= to ? me.h : 0;
      d.els[k].style.transform = shift ? 'translateY(' + shift + 'px)' : '';
    }
  };
  S.tick = function () {
    if (!S.drag) return;
    var y = S.drag.lastClientY, edge = 56, v = 0, height = window.innerHeight || 0;
    if (y < edge) v = -Math.ceil((edge - y) / 4);
    else if (y > height - edge) v = Math.ceil((y - (height - edge)) / 4);
    if (v) {
      window.scrollBy(0, v);
      S.place();
    }
  };
  S.down = function (e) {
    if (S.drag || (e.pointerType === 'mouse' && e.button !== 0)) return;
    var h = e.target && e.target.closest ? e.target.closest('.' + HANDLE) : null;
    if (!h || !S.host || !S.host.contains(h)) return;
    var els = S.els(), row = h.closest('.' + ROW), from = els.indexOf(row), n = Math.min(S.movable(), els.length);
    if (from < 0 || from >= n || n < 2) return;
    e.preventDefault();
    try { h.setPointerCapture(e.pointerId); } catch (x) {}
    var sy = window.scrollY || 0, rects = [];
    for (var k = 0; k < n; k++) {
      var r = els[k].getBoundingClientRect();
      rects.push({ top: r.top + sy, h: r.height });
      els[k].style.transition = '';
      if (k !== from) els[k].classList.add('todo-drag-shift');
    }
    S.drag = { pointer: e.pointerId, handle: h, row: row, els: els.slice(0, n), rects: rects, from: from, to: from, startY: e.clientY + sy, lastClientY: e.clientY };
    row.classList.add('todo-dragging');
    document.documentElement.classList.add('todo-drag-active');
    document.addEventListener('pointermove', S.move, { passive: false });
    document.addEventListener('pointerup', S.up);
    document.addEventListener('pointercancel', S.cancel);
    S.scroller = setInterval(S.tick, 16);
  };
  S.move = function (e) {
    if (!S.drag || e.pointerId !== S.drag.pointer) return;
    e.preventDefault();
    S.drag.lastClientY = e.clientY;
    S.place();
  };
  S.finish = function (commit) {
    var d = S.drag;
    if (!d) return;
    S.drag = null;
    clearInterval(S.scroller);
    document.removeEventListener('pointermove', S.move, { passive: false });
    document.removeEventListener('pointerup', S.up);
    document.removeEventListener('pointercancel', S.cancel);
    document.documentElement.classList.remove('todo-drag-active');
    try { d.handle.releasePointerCapture(d.pointer); } catch (x) {}
    d.row.classList.remove('todo-dragging');
    var row = S.rows[d.from];
    if (!commit || d.to === d.from || !row) {
      S.settle(true);
      return;
    }
    // Drawn where it was dropped until the list arrives in its new order (that settles it), or 4s.
    var me = d.rects[d.from], at = d.rects[d.to];
    var top = d.to < d.from ? at.top : at.top + at.h - me.h;
    d.row.style.transition = 'transform 150ms ease';
    d.row.style.transform = 'translateY(' + (top - me.top) + 'px)';
    S.pending = true;
    setTimeout(function () { if (S.pending) S.settle(true); }, 4000);
    S.Outputs.itemId = row.id;
    S.Outputs.toIndex = d.to;
    S.Outputs.moved();
  };
  S.up = function (e) {
    if (S.drag && e.pointerId === S.drag.pointer) S.finish(true);
  };
  S.cancel = function (e) {
    if (S.drag && e.pointerId === S.drag.pointer) S.finish(false);
  };
  S.key = function (e) {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    var h = e.target && e.target.closest ? e.target.closest('.' + HANDLE) : null;
    if (!h || S.drag) return;
    var els = S.els(), i = els.indexOf(h.closest('.' + ROW)), n = Math.min(S.movable(), els.length);
    var j = e.key === 'ArrowUp' ? i - 1 : i + 1;
    if (i < 0 || i >= n || j < 0 || j >= n || !S.rows[i]) return;
    e.preventDefault();
    S.refocus = S.rows[i].id;
    S.Outputs.itemId = S.rows[i].id;
    S.Outputs.toIndex = j;
    S.Outputs.moved();
  };
}

var hostNode = Inputs.host;
var host = hostNode && typeof hostNode.getDOMElement === 'function' ? hostNode.getDOMElement() : null;
if (!S.drawn) {
  /**
   * 🔴 **The rows are drawn AFTER this runs**, by the For Each, in a later turn (measured: the script
   * had the host and all three rows, and not one grip was named). So the host is WATCHED: when rows
   * are drawn or redrawn, the grips are named and a dropped row settles — before the next paint, so the
   * list never flickers back to its old order while the save is in flight.
   */
  S.drawn = function () {
    if (S.settleOnDraw && !S.drag) {
      S.settleOnDraw = false;
      S.settle(false);
    }
    S.name();
    if (!S.refocus) return;
    var at = -1;
    for (var q = 0; q < S.rows.length; q++) if (S.rows[q] && S.rows[q].id === S.refocus) at = q;
    var grip = at >= 0 && S.els()[at] ? S.els()[at].querySelector('.' + HANDLE) : null;
    if (grip) {
      S.refocus = null;
      grip.focus();
    }
  };
}
if (host && S.host !== host) {
  if (S.host) {
    S.host.removeEventListener('pointerdown', S.down);
    S.host.removeEventListener('keydown', S.key);
  }
  if (S.watch) S.watch.disconnect();
  S.host = host;
  host.addEventListener('pointerdown', S.down);
  host.addEventListener('keydown', S.key);
  if (typeof MutationObserver !== 'undefined') {
    S.watch = new MutationObserver(function () { S.drawn(); });
    S.watch.observe(host, { childList: true, subtree: true, characterData: true });
  }
}
// The rows arrived (a save landed, or a remount): whatever the last drop left drawn is spent — once
// they are drawn, or in 800ms if drawing them changed nothing the watch can see.
if (S.drawnFor !== S.rows) {
  S.drawnFor = S.rows;
  if (S.pending) {
    S.settleOnDraw = true;
    setTimeout(function () { if (S.settleOnDraw) S.drawn(); }, 800);
  }
}
if (S.host) S.drawn();`;

/** Its ports, declared on the node: `Outputs.moved` is callable only for a port the saved node says is a signal. */
const DRAG_SORT_PORTS = [
  ...['host', 'mounted', 'rows'].map((n) => ({ name: `in-${n}`, displayName: n, plug: 'input', type: '*', group: 'Inputs' })),
  { name: 'out-itemId', displayName: 'itemId', plug: 'output', type: '*', group: 'Outputs' },
  { name: 'out-toIndex', displayName: 'toIndex', plug: 'output', type: '*', group: 'Outputs' },
  { name: 'out-moved', displayName: 'moved', plug: 'output', type: 'signal', group: 'Outputs' }
];

/** The drag script and its mount counter for one list: `p` is the id prefix, `rowsGroup` the Group the rows are drawn in. */
function dragSort(p: string, rowsGroup: string, rowsFrom: [string, string], out: string): { nodes: unknown[]; connections: unknown[] } {
  return {
    nodes: [
      { ...(logic(`${p}Drag`, FUNCTION, 'Drag a row by its grip to move it', { functionScript: DRAG_SORT_SCRIPT }) as object), ports: DRAG_SORT_PORTS },
      {
        ...(logic(`${p}Mounts`, FUNCTION, 'Count mounts (a remount is a new element to listen on)', { functionScript: 'this.mounts = (this.mounts || 0) + 1;\nOutputs.mounts = this.mounts;' }) as object),
        ports: [{ name: 'out-mounts', displayName: 'mounts', plug: 'output', type: '*', group: 'Outputs' }]
      }
    ],
    connections: [
      wire(rowsGroup, 'this', `${p}Drag`, 'in-host'),
      wire(rowsGroup, 'didMount', `${p}Mounts`, 'run'),
      wire(`${p}Mounts`, 'out-mounts', `${p}Drag`, 'in-mounted'),
      wire(rowsFrom[0], rowsFrom[1], `${p}Drag`, 'in-rows'),
      wire(`${p}Drag`, 'out-itemId', out, 'moveId'),
      wire(`${p}Drag`, 'out-toIndex', out, 'moveTo'),
      wire(`${p}Drag`, 'out-moved', out, 'moved')
    ]
  };
}

/** The grip a row is dragged by: a box the drag script finds by its class, the dots drawn by its CSS. */
const GRIP = (id: string, parent: string, label: string) =>
  group(id, label, parent, { sizeMode: 'explicit', width: px(24), height: px(32), cssClassName: DRAG_HANDLE_CLASS });

// ════════════════════════════════════════════════════════════════════════════
// Todo/ — what you can see
// ════════════════════════════════════════════════════════════════════════════

/**
 * Richard: *"dark and light mode, matching system by default but with a little icon at
 * the top right for changing"*. Two icon buttons — the moon switches to dark, the sun to
 * light — and **the App's stylesheet shows exactly one**, from the same conditions that
 * pick the palette (`themeCss`). So there is no value on a wire saying which theme is
 * showing, and nothing to fall out of step when the system changes at sunset.
 *
 * 🔴 Why not one button with its icon wired: a `Function` publishes an output only when it
 * changes, and "which icon" would have two producers (load and click) — the stale-value
 * trap in this file's header. No `Variable`, so it can be placed on both pages.
 */
const THEME_SWITCH: Tpl008Component = {
  path: 'Todo/Theme switch',
  description:
    'The moon or the sun at the top right. The page follows the system until the person presses it; choosing the system’s own theme again goes back to following the system.',
  nodes: [
    // `th`, not `ts`: node ids are unique across the project, and `Todo/Task summary` owns `ts`.
    group('thRoot', 'Theme switch', undefined, { flexDirection: 'row', alignItems: 'center', sizeMode: 'contentSize' }),
    place('thToDark', BUTTON, 'Use dark theme', 'thRoot', { ...BTN_ICON('icon-moon', 'Use dark theme'), cssClassName: THEME_TO_DARK_CLASS }),
    place('thToLight', BUTTON, 'Use light theme', 'thRoot', { ...BTN_ICON('icon-sun', 'Use light theme'), cssClassName: THEME_TO_LIGHT_CLASS }),
    logic('thFlip', FUNCTION, 'Switch to the other theme', { functionScript: THEME_FLIP_SCRIPT })
  ],
  connections: [wire('thToDark', 'onClick', 'thFlip', 'run'), wire('thToLight', 'onClick', 'thFlip', 'run')]
};

/**
 * Richard (s6): *"push notifications that come when deadlines are coming … at 9am on the day of the
 * deadline"*. The bell beside the theme switch, built the theme switch's way: two icon buttons, and the
 * stylesheet shows at most one — and none unless the host set `data-reminders` (`tpl008Theme.ts`). The
 * crossed-out bell says reminders are off and turns them on; the ringing bell says they are on.
 * Only in the Header: a device's subscription belongs to whoever is signed in.
 */
const REMINDERS_SWITCH: Tpl008Component = {
  path: 'Todo/Reminders switch',
  description:
    'The bell at the top right: turns deadline reminders on or off for this device. Shown only when the server the app is served from can send them.',
  nodes: [
    // `rm`: node ids are unique across the whole project.
    group('rmRoot', 'Reminders switch', undefined, { flexDirection: 'row', alignItems: 'center', sizeMode: 'contentSize' }),
    place('rmTurnOn', BUTTON, 'Turn reminders on', 'rmRoot', { ...BTN_ICON('icon-bell-off', 'Turn reminders on'), cssClassName: REMINDERS_TURN_ON_CLASS }),
    place('rmTurnOff', BUTTON, 'Turn reminders off', 'rmRoot', { ...BTN_ICON('icon-bell-ring', 'Turn reminders off'), cssClassName: REMINDERS_TURN_OFF_CLASS }),
    logic('rmToggle', FUNCTION, 'Ask the host to turn reminders on or off', { functionScript: REMINDERS_TOGGLE_SCRIPT })
  ],
  connections: [wire('rmTurnOn', 'onClick', 'rmToggle', 'run'), wire('rmTurnOff', 'onClick', 'rmToggle', 'run')]
};

/**
 * The deadline field (Richard, 2026-09-16: *"the date field in the task details doesn't have a date
 * picker"*). The library's Date Picker, built from the same source (`datePicker.ts`) so the shelf
 * part and this one cannot drift: a real date input, a calendar on a computer, the phone's own
 * picker on a phone. `dp` ids — unique across the project.
 */
const DATE_PICKER: Tpl008Component = {
  path: 'Todo/Date picker',
  description: DATE_PICKER_DESCRIPTION,
  inputs: DATE_PICKER_INPUTS.map(({ name, type, description }) => ({ name, type, description })),
  outputs: DATE_PICKER_OUTPUTS.map(({ name, type, description }) => ({ name, type, description })),
  ...datePickerGraph('dp')
};

const HEADER: Tpl008Component = {
  path: 'Todo/Header',
  description:
    'The app name, the four views (List, Today, Done, Log), Sign out, the reminders bell and the theme switch. Tab is the view that is showing.',
  instantiates: [C.remindersSwitch, C.themeSwitch],
  ...iface(
    [['tab', 'string'], ['listLabel', 'string'], ['todayLabel', 'string'], ['doneLabel', 'string']],
    [['pickList', 'signal'], ['pickToday', 'signal'], ['pickDone', 'signal'], ['pickLog', 'signal'], ['signOut', 'signal']]
  ),
  nodes: [
    inputs('hdIn', 'The view', [['tab', 'string'], ['listLabel', 'string'], ['todayLabel', 'string'], ['doneLabel', 'string']]),
    outputs('hdOut', 'What was picked', [
      ['pickList', 'signal'], ['pickToday', 'signal'], ['pickDone', 'signal'], ['pickLog', 'signal'], ['signOut', 'signal']
    ]),
    group('hdRoot', 'Header', undefined, { ...ROW('var(--space-4)'), justifyContent: 'space-between', flexWrap: 'wrap' }),
    text('hdTitle', 'App name', 'hdRoot', 'Todo list', { ...T_TITLE, as: 'h1', sizeMode: 'contentSize' }),
    // RC: four views and three controls do not fit one line at 390px (measured: the page was 456px
    // wide), and a content-sized box never wraps — its width IS its content. Capped at its row, it does.
    group('hdNav', 'Views', 'hdRoot', {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      columnGap: 'var(--space-1)',
      sizeMode: 'contentSize',
      styleCss: 'max-width: 100%;'
    }),
    place('hdList', BUTTON, 'List', 'hdNav', { ...BTN_GHOST, label: 'List' }),
    place('hdToday', BUTTON, 'Today', 'hdNav', { ...BTN_GHOST, label: 'Today' }),
    place('hdDone', BUTTON, 'Done', 'hdNav', { ...BTN_GHOST, label: 'Done' }),
    place('hdLog', BUTTON, 'Log', 'hdNav', { ...BTN_GHOST, label: 'Log' }),
    place('hdSignOut', BUTTON, 'Sign out', 'hdNav', { ...BTN_GHOST, label: 'Sign out', color: 'var(--muted-foreground)' }),
    place('hdReminders', C.remindersSwitch, 'Deadline reminders', 'hdNav'),
    place('hdTheme', C.themeSwitch, 'Light or dark', 'hdNav'),
    logic('hdLook', STATES, 'Which view is showing', {
      states: 'list,today,done,log',
      currentState: 'list',
      values: 'listBg,todayBg,doneBg,logBg',
      'type-listBg': 'color',
      'type-todayBg': 'color',
      'type-doneBg': 'color',
      'type-logBg': 'color',
      ...Object.fromEntries(
        ['list', 'today', 'done', 'log'].flatMap((state) =>
          ['list', 'today', 'done', 'log'].map((v) => [`value-${state}-${v}Bg`, state === v ? 'var(--muted)' : 'transparent'])
        )
      ),
      useTransitions: false
    })
  ],
  connections: [
    wire('hdIn', 'tab', 'hdLook', 'currentState'),
    wire('hdIn', 'listLabel', 'hdList', 'label'),
    wire('hdIn', 'doneLabel', 'hdDone', 'label'),
    wire('hdIn', 'todayLabel', 'hdToday', 'label'),
    wire('hdLook', 'listBg', 'hdList', 'backgroundColor'),
    wire('hdLook', 'todayBg', 'hdToday', 'backgroundColor'),
    wire('hdLook', 'doneBg', 'hdDone', 'backgroundColor'),
    wire('hdLook', 'logBg', 'hdLog', 'backgroundColor'),
    wire('hdList', 'onClick', 'hdOut', 'pickList'),
    wire('hdToday', 'onClick', 'hdOut', 'pickToday'),
    wire('hdDone', 'onClick', 'hdOut', 'pickDone'),
    wire('hdLog', 'onClick', 'hdOut', 'pickLog'),
    wire('hdSignOut', 'onClick', 'hdOut', 'signOut')
  ]
};

const PROBLEM_BANNER: Tpl008Component = {
  path: 'Todo/Problem banner',
  description: `Shows the sentence in the "${VAR.problem}" variable when a write or a load failed, with a Dismiss button. Draws nothing otherwise.`,
  nodes: [
    logic('pbVar', VARIABLE, 'The problem, if there is one', { name: VAR.problem }),
    derive('pbShow', 'Is there a problem?', "var p = String(Inputs.problem || '');\nOutputs.show = p !== '';\nOutputs.text = p;"),
    group('pbRoot', 'Problem', undefined, {
      ...ROW('var(--space-3)'),
      justifyContent: 'space-between',
      mounted: false,
      backgroundColor: 'var(--surface)',
      borderStyle: 'solid',
      borderWidth: 'var(--border-1)',
      borderColor: 'var(--destructive)',
      borderRadius: 'var(--radius-md)',
      paddingLeft: 'var(--space-3)',
      paddingRight: 'var(--space-2)',
      paddingTop: 'var(--space-2)',
      paddingBottom: 'var(--space-2)'
    }),
    text('pbText', 'What went wrong', 'pbRoot', '', wide({ ...T_BODY, color: 'var(--destructive)' })),
    place('pbDismiss', BUTTON, 'Dismiss', 'pbRoot', { ...BTN_GHOST, label: 'Dismiss' }),
    logic('pbClear', SET_VARIABLE, 'Forget the problem', { name: VAR.problem, setWith: 'emptyString' })
  ],
  connections: [
    wire('pbVar', 'value', 'pbShow', 'in-problem'),
    wire('pbShow', 'out-show', 'pbRoot', 'mounted'),
    wire('pbShow', 'out-text', 'pbText', 'text'),
    wire('pbDismiss', 'onClick', 'pbClear', 'do')
  ]
};

const TASK_ROW_FIELDS: Array<[string, string]> = [
  ['id', 'string'],
  ['rank', 'string'],
  ['title', 'string'],
  ['meta', 'string'],
  ['hasMeta', 'boolean'],
  ['metaColor', 'string'],
  ['titleWeight', 'number'],
  ['bg', 'string']
];

const TASK_ROW: Tpl008Component = {
  path: 'Todo/Task row',
  description:
    'One open task: the grip it is dragged by (Todo/Task list moves it), its place in the list, its title, its deadline and next action, and the tick that closes it.',
  ...iface(TASK_ROW_FIELDS, [['open', 'signal'], ['close', 'signal'], ['id', 'string'], ['title', 'string']]),
  nodes: [
    inputs('trIn', 'The task', TASK_ROW_FIELDS),
    outputs('trOut', 'What you did to it', [['open', 'signal'], ['close', 'signal'], ['id', 'string'], ['title', 'string']]),
    group('trRow', 'Row', undefined, {
      ...ROW('var(--space-2)'),
      ...RULE_BELOW,
      cssClassName: DRAG_ROW_CLASS,
      paddingLeft: 'var(--space-1)',
      paddingRight: 'var(--space-2)',
      paddingTop: 'var(--space-2)',
      paddingBottom: 'var(--space-2)'
    }),
    GRIP('trGrip', 'trRow', 'Drag to move'),
    text('trRank', 'Its place', 'trRow', '', { ...T_META, sizeMode: 'contentHeight', width: px(20), textAlignX: 'right', fontVariantNumeric: 'tabular-nums' }),
    group('trMain', 'Title and what is next', 'trRow', { ...COLUMN('var(--space-0-5)'), paddingTop: 'var(--space-1)', paddingBottom: 'var(--space-1)' }),
    text('trTitle', 'Title', 'trMain', '', wide(T_BODY)),
    text('trMeta', 'Deadline and next action', 'trMain', '', wide(T_META)),
    place('trClose', BUTTON, 'Close it', 'trRow', { ...BTN_CHECK, marginLeft: 'var(--space-1)' })
  ],
  connections: [
    wire('trIn', 'rank', 'trRank', 'text'),
    wire('trIn', 'title', 'trTitle', 'text'),
    wire('trIn', 'titleWeight', 'trTitle', 'fontWeight'),
    wire('trIn', 'meta', 'trMeta', 'text'),
    wire('trIn', 'hasMeta', 'trMeta', 'mounted'),
    wire('trIn', 'metaColor', 'trMeta', 'color'),
    wire('trIn', 'bg', 'trRow', 'backgroundColor'),
    wire('trIn', 'id', 'trOut', 'id'),
    wire('trIn', 'title', 'trOut', 'title'),
    wire('trMain', 'onClick', 'trOut', 'open'),
    wire('trClose', 'onClick', 'trOut', 'close')
  ]
};

/** Trim what was typed; publish it and pulse Go only if there is something. */
const SUBMIT_SCRIPT = "var t = String(Inputs.text || '').trim();\nif (t === '') return;\nOutputs.text = t;\nOutputs.go();";
const COUNT_SCRIPT = 'Outputs.empty = (Inputs.rows || []).length === 0;';

const TASK_LIST: Tpl008Component = {
  path: 'Todo/Task list',
  description:
    'The open tasks in order, one Task row each, and the box that adds a task at the bottom. A task is moved by dragging its grip (or its grip and the arrow keys): Moved says which one (Move Id) and where it was dropped (Move To, from 0). Clear New empties the box.',
  ...iface(
    [['rows', 'array'], ['placeholder', 'string'], ['clearNew', 'signal']],
    [
      ['open', 'signal'], ['close', 'signal'], ['add', 'signal'], ['moved', 'signal'],
      ['taskId', 'string'], ['taskTitle', 'string'], ['newTitle', 'string'], ['moveId', 'string'], ['moveTo', 'number']
    ]
  ),
  repeats: { source: 'array', rowFields: TASK_ROW_FIELDS.map(([n]) => n) },
  instantiates: [C.taskRow],
  nodes: [
    inputs('tlIn', 'The rows', [['rows', 'array'], ['placeholder', 'string'], ['clearNew', 'signal']]),
    outputs('tlOut', 'What happened in the list', [
      ['open', 'signal'], ['close', 'signal'], ['add', 'signal'], ['moved', 'signal'],
      ['taskId', 'string'], ['taskTitle', 'string'], ['newTitle', 'string'], ['moveId', 'string'], ['moveTo', 'number']
    ]),
    group('tlRoot', 'Task list', undefined, COLUMN('var(--space-3)')),
    group('tlRows', 'The rows', 'tlRoot', { ...COLUMN('var(--space-0)'), borderTopStyle: 'solid', borderTopWidth: 'var(--border-1)', borderTopColor: 'var(--border-subtle)' }),
    place('tlEach', FOR_EACH, 'One row per open task', 'tlRows', { template: C.taskRow, templateType: 'explicit' }),
    text('tlEmpty', 'When there is nothing to do', 'tlRoot', 'Nothing on the list. Add the next thing you need to do.', wide(T_META)),
    group('tlAdd', 'Add a task', 'tlRoot', ROW('var(--space-2)')),
    place('tlField', TEXT_INPUT, 'New task', 'tlAdd', { ...FIELD, placeholder: 'Add a task' }),
    place('tlButton', BUTTON, 'Add', 'tlAdd', { ...BTN_PRIMARY, label: 'Add' }),
    derive('tlCount', 'Is the list empty?', COUNT_SCRIPT),
    script('tlSubmit', 'The title, if one was typed', SUBMIT_SCRIPT, ['text']),
    ...dragSort('tl', 'tlRows', ['tlIn', 'rows'], 'tlOut').nodes
  ],
  connections: [
    wire('tlIn', 'rows', 'tlEach', 'items'),
    wire('tlIn', 'rows', 'tlCount', 'in-rows'),
    wire('tlCount', 'out-empty', 'tlEmpty', 'mounted'),
    wire('tlIn', 'placeholder', 'tlField', 'placeholder'),
    wire('tlIn', 'clearNew', 'tlField', 'clear'),
    wire('tlField', 'onTextChanged', 'tlSubmit', 'in-text'),
    wire('tlField', 'onEnter', 'tlSubmit', 'run'),
    wire('tlButton', 'onClick', 'tlSubmit', 'run'),
    wire('tlSubmit', 'out-text', 'tlOut', 'newTitle'),
    wire('tlSubmit', 'out-go', 'tlOut', 'add'),
    wire('tlEach', 'itemOutputSignal-open', 'tlOut', 'open'),
    wire('tlEach', 'itemOutputSignal-close', 'tlOut', 'close'),
    wire('tlEach', 'itemOutput-id', 'tlOut', 'taskId'),
    wire('tlEach', 'itemOutput-title', 'tlOut', 'taskTitle'),
    ...dragSort('tl', 'tlRows', ['tlIn', 'rows'], 'tlOut').connections
  ]
};

const DONE_ROW_FIELDS: Array<[string, string]> = [['id', 'string'], ['title', 'string'], ['note', 'string'], ['when', 'string'], ['bg', 'string']];

const DONE_ROW: Tpl008Component = {
  path: 'Todo/Done row',
  description: 'One closed task: its title, what happened, and when it was closed.',
  ...iface(DONE_ROW_FIELDS, [['open', 'signal'], ['id', 'string']]),
  nodes: [
    inputs('drIn', 'The closed task', DONE_ROW_FIELDS),
    outputs('drOut', 'Opened', [['open', 'signal'], ['id', 'string']]),
    group('drRow', 'Row', undefined, {
      ...COLUMN('var(--space-0-5)'),
      ...RULE_BELOW,
      paddingLeft: 'var(--space-2)',
      paddingRight: 'var(--space-2)',
      paddingTop: 'var(--space-3)',
      paddingBottom: 'var(--space-3)'
    }),
    text('drTitle', 'Title', 'drRow', '', wide(T_BODY)),
    text('drNote', 'What happened', 'drRow', '', wide({ ...T_META, color: 'var(--foreground)' })),
    text('drWhen', 'When', 'drRow', '', wide(T_META))
  ],
  connections: [
    wire('drIn', 'title', 'drTitle', 'text'),
    wire('drIn', 'note', 'drNote', 'text'),
    wire('drIn', 'when', 'drWhen', 'text'),
    wire('drIn', 'bg', 'drRow', 'backgroundColor'),
    wire('drIn', 'id', 'drOut', 'id'),
    wire('drRow', 'onClick', 'drOut', 'open')
  ]
};

const DONE_LIST: Tpl008Component = {
  path: 'Todo/Done list',
  description: 'Every closed task, newest first, each with what happened.',
  ...iface([['rows', 'array']], [['open', 'signal'], ['taskId', 'string']]),
  repeats: { source: 'array', rowFields: DONE_ROW_FIELDS.map(([n]) => n) },
  instantiates: [C.doneRow],
  nodes: [
    inputs('dlIn', 'The rows', [['rows', 'array']]),
    outputs('dlOut', 'Opened', [['open', 'signal'], ['taskId', 'string']]),
    group('dlRoot', 'Done list', undefined, { ...COLUMN('var(--space-0)'), borderTopStyle: 'solid', borderTopWidth: 'var(--border-1)', borderTopColor: 'var(--border-subtle)' }),
    place('dlEach', FOR_EACH, 'One row per closed task', 'dlRoot', { template: C.doneRow, templateType: 'explicit' }),
    text('dlEmpty', 'When nothing is closed', 'dlRoot', 'Nothing closed yet.', wide({ ...T_META, marginTop: 'var(--space-3)' })),
    derive('dlCount', 'Is it empty?', COUNT_SCRIPT)
  ],
  connections: [
    wire('dlIn', 'rows', 'dlEach', 'items'),
    wire('dlIn', 'rows', 'dlCount', 'in-rows'),
    wire('dlCount', 'out-empty', 'dlEmpty', 'mounted'),
    wire('dlEach', 'itemOutputSignal-open', 'dlOut', 'open'),
    wire('dlEach', 'itemOutput-id', 'dlOut', 'taskId')
  ]
};

const LOG_ENTRY_FIELDS: Array<[string, string]> = [
  ['id', 'string'],
  ['taskId', 'string'],
  ['day', 'string'],
  ['showDay', 'boolean'],
  ['time', 'string'],
  ['taskTitle', 'string'],
  ['summary', 'string'],
  ['body', 'string'],
  ['hasBody', 'boolean']
];

const LOG_ENTRY: Tpl008Component = {
  path: 'Todo/Log entry',
  description: 'One line of history across every task: the day (when it is the first line of that day), the time, which task, what happened and any note.',
  ...iface(LOG_ENTRY_FIELDS, [['open', 'signal'], ['taskId', 'string']]),
  nodes: [
    inputs('leIn', 'The line', LOG_ENTRY_FIELDS),
    outputs('leOut', 'Opened', [['open', 'signal'], ['taskId', 'string']]),
    group('leRoot', 'Log entry', undefined, COLUMN('var(--space-0)')),
    text('leDay', 'Day', 'leRoot', '', wide({ ...T_HEADING, marginTop: 'var(--space-4)', marginBottom: 'var(--space-1)' })),
    group('leLine', 'The line', 'leRoot', { ...COLUMN('var(--space-0-5)'), ...RULE_BELOW, paddingTop: 'var(--space-2)', paddingBottom: 'var(--space-2)' }),
    group('leHead', 'Time and task', 'leLine', { ...ROW('var(--space-2)'), alignItems: 'flex-start' }),
    text('leTime', 'Time', 'leHead', '', { ...T_META, sizeMode: 'contentSize', fontVariantNumeric: 'tabular-nums' }),
    text('leTask', 'Task', 'leHead', '', wide({ ...T_META, color: 'var(--foreground)', fontWeight: 'var(--font-medium)' })),
    text('leSummary', 'What happened', 'leLine', '', wide(T_META)),
    text('leBody', 'The note', 'leLine', '', wide(T_BODY))
  ],
  connections: [
    wire('leIn', 'day', 'leDay', 'text'),
    wire('leIn', 'showDay', 'leDay', 'mounted'),
    wire('leIn', 'time', 'leTime', 'text'),
    wire('leIn', 'taskTitle', 'leTask', 'text'),
    wire('leIn', 'summary', 'leSummary', 'text'),
    wire('leIn', 'body', 'leBody', 'text'),
    wire('leIn', 'hasBody', 'leBody', 'mounted'),
    wire('leIn', 'taskId', 'leOut', 'taskId'),
    wire('leTask', 'onClick', 'leOut', 'open')
  ]
};

const LOG_LIST: Tpl008Component = {
  path: 'Todo/Log list',
  description: 'Everything that happened to every task, newest first.',
  ...iface([['rows', 'array']], [['open', 'signal'], ['taskId', 'string']]),
  repeats: { source: 'array', rowFields: LOG_ENTRY_FIELDS.map(([n]) => n) },
  instantiates: [C.logEntry],
  nodes: [
    inputs('llIn', 'The rows', [['rows', 'array']]),
    outputs('llOut', 'Opened', [['open', 'signal'], ['taskId', 'string']]),
    group('llRoot', 'Log list', undefined, COLUMN('var(--space-0)')),
    place('llEach', FOR_EACH, 'One line per entry', 'llRoot', { template: C.logEntry, templateType: 'explicit' }),
    text('llEmpty', 'When nothing has happened', 'llRoot', 'Nothing has happened yet.', wide(T_META)),
    derive('llCount', 'Is it empty?', COUNT_SCRIPT)
  ],
  connections: [
    wire('llIn', 'rows', 'llEach', 'items'),
    wire('llIn', 'rows', 'llCount', 'in-rows'),
    wire('llCount', 'out-empty', 'llEmpty', 'mounted'),
    wire('llEach', 'itemOutputSignal-open', 'llOut', 'open'),
    wire('llEach', 'itemOutput-taskId', 'llOut', 'taskId')
  ]
};

const SUMMARY_INS: Array<[string, string]> = [
  ['title', 'string'],
  ['rankLine', 'string'],
  ['deadline', 'string'],
  ['dueText', 'string'],
  ['dueColor', 'string'],
  ['deadlineError', 'string'],
  ['hasDeadlineError', 'boolean'],
  ['isOpen', 'boolean'],
  ['isClosed', 'boolean'],
  ['canMakeNext', 'boolean'],
  ['closingNote', 'string'],
  ['narrow', 'boolean']
];
const SUMMARY_OUTS: Array<[string, string]> = [
  ['rename', 'signal'],
  ['setDeadline', 'signal'],
  ['makeNext', 'signal'],
  ['close', 'signal'],
  ['reopen', 'signal'],
  ['back', 'signal'],
  ['newTitle', 'string'],
  ['deadlineText', 'string']
];

const TASK_SUMMARY: Tpl008Component = {
  path: 'Todo/Task summary',
  description:
    'The top of an open task: its title (edit it in place), where it is in the list, its deadline, and Move to #1 / Close task / Reopen. A closed task shows what happened.',
  ...iface(SUMMARY_INS, SUMMARY_OUTS),
  instantiates: [C.datePicker],
  nodes: [
    inputs('tsIn', 'The task', SUMMARY_INS),
    outputs('tsOut', 'What you did', SUMMARY_OUTS),
    group('tsRoot', 'Task summary', undefined, COLUMN('var(--space-3)')),
    place('tsBack', BUTTON, 'Back to the list', 'tsRoot', { ...BTN_GHOST, label: '← Back', mounted: false }),
    place('tsTitle', TEXT_INPUT, 'Title', 'tsRoot', {
      type: 'text',
      sizeMode: 'contentHeight',
      width: pct(100),
      placeholder: 'Task title',
      fontSize: 'var(--text-xl)',
      fontWeight: 'var(--font-semibold)',
      color: 'var(--foreground)',
      backgroundColor: 'transparent',
      borderStyle: 'solid',
      borderWidth: 'var(--border-1)',
      borderColor: 'var(--border-subtle)',
      borderRadius: 'var(--radius-md)',
      paddingLeft: 'var(--space-2)',
      paddingRight: 'var(--space-2)',
      paddingTop: 'var(--space-1)',
      paddingBottom: 'var(--space-1)'
    }),
    text('tsMeta', 'Where it is', 'tsRoot', '', wide(T_META)),
    group('tsBar', 'Deadline and buttons', 'tsRoot', { ...COLUMN('var(--space-3)'), ...RULE_BELOW, paddingBottom: 'var(--space-4)' }),
    group('tsDeadline', 'Deadline', 'tsBar', COLUMN('var(--space-1)')),
    text('tsDeadlineLabel', 'Deadline label', 'tsDeadline', 'Deadline', { ...T_META, sizeMode: 'contentSize' }),
    group('tsDeadlineRow', 'Deadline field', 'tsDeadline', { ...ROW('var(--space-3)'), flexWrap: 'wrap' }),
    place('tsDeadlineField', C.datePicker, 'Deadline field', 'tsDeadlineRow', { Label: 'Deadline', Width: px(200) }),
    text('tsDue', 'How long until it is due', 'tsDeadlineRow', '', { ...T_META, sizeMode: 'contentSize' }),
    text('tsDeadlineError', 'A deadline that is not a date', 'tsDeadline', '', { ...wide(T_ERROR), mounted: false }),
    group('tsButtons', 'Buttons', 'tsBar', { ...ROW('var(--space-2)'), flexWrap: 'wrap' }),
    place('tsMakeNext', BUTTON, 'Move to #1', 'tsButtons', { ...BTN_OUTLINE, label: 'Move to #1', mounted: false }),
    place('tsClose', BUTTON, 'Close task', 'tsButtons', { ...BTN_PRIMARY, label: 'Close task', mounted: false }),
    place('tsReopen', BUTTON, 'Reopen', 'tsButtons', { ...BTN_OUTLINE, label: 'Reopen', mounted: false }),
    group('tsClosing', 'What happened', 'tsRoot', { ...COLUMN('var(--space-1)'), ...RULE_BELOW, paddingBottom: 'var(--space-4)', mounted: false }),
    text('tsClosingLabel', 'What happened label', 'tsClosing', 'What happened', wide(T_META)),
    text('tsClosingNote', 'What happened', 'tsClosing', '', wide(T_BODY))
  ],
  connections: [
    wire('tsIn', 'title', 'tsTitle', 'startValue'),
    wire('tsIn', 'rankLine', 'tsMeta', 'text'),
    wire('tsIn', 'deadline', 'tsDeadlineField', 'Value'),
    wire('tsIn', 'dueText', 'tsDue', 'text'),
    wire('tsIn', 'dueColor', 'tsDue', 'color'),
    wire('tsIn', 'deadlineError', 'tsDeadlineError', 'text'),
    wire('tsIn', 'hasDeadlineError', 'tsDeadlineError', 'mounted'),
    wire('tsIn', 'canMakeNext', 'tsMakeNext', 'mounted'),
    wire('tsIn', 'isOpen', 'tsClose', 'mounted'),
    wire('tsIn', 'isClosed', 'tsReopen', 'mounted'),
    wire('tsIn', 'isClosed', 'tsClosing', 'mounted'),
    wire('tsIn', 'closingNote', 'tsClosingNote', 'text'),
    wire('tsIn', 'narrow', 'tsBack', 'mounted'),
    // 🔴 Enter BLURS, and only blur renames. Wiring Enter to rename as well would
    // rename twice — once on Enter, again on the blur Enter causes.
    wire('tsTitle', 'onTextChanged', 'tsOut', 'newTitle'),
    wire('tsTitle', 'onEnter', 'tsTitle', 'blur'),
    wire('tsTitle', 'onBlur', 'tsOut', 'rename'),
    // The picker commits on a decision (a day picked, Enter, leaving the field), never per keystroke.
    wire('tsDeadlineField', 'Value', 'tsOut', 'deadlineText'),
    wire('tsDeadlineField', 'Changed', 'tsOut', 'setDeadline'),
    wire('tsMakeNext', 'onClick', 'tsOut', 'makeNext'),
    wire('tsClose', 'onClick', 'tsOut', 'close'),
    wire('tsReopen', 'onClick', 'tsOut', 'reopen'),
    wire('tsBack', 'onClick', 'tsOut', 'back')
  ]
};

const ACTION_ROW_FIELDS: Array<[string, string]> = [
  ['id', 'string'],
  ['num', 'string'],
  ['title', 'string'],
  ['titleColor', 'string'],
  ['description', 'string'],
  ['showPreview', 'boolean'],
  ['descriptionOpen', 'boolean'],
  ['noteLine', 'string'],
  ['hasNote', 'boolean'],
  ['done', 'boolean'],
  ['canMove', 'boolean'],
  ['checkBg', 'string'],
  ['checkIconColor', 'string'],
  ['checkBorder', 'string']
];
const ACTION_ROW_OUTS: Array<[string, string]> = [
  ['tick', 'signal'],
  ['untick', 'signal'],
  ['rename', 'signal'],
  ['openDescription', 'signal'],
  ['closeDescription', 'signal'],
  ['describe', 'signal'],
  ['id', 'string'],
  ['title', 'string'],
  ['titleText', 'string'],
  ['descriptionText', 'string']
];

/** A row's title, editable in place — the task title's treatment at body size. */
const ROW_TITLE_FIELD = {
  type: 'text',
  sizeMode: 'contentHeight',
  width: pct(100),
  placeholder: 'Next action',
  fontSize: 'var(--text-base)',
  color: 'var(--foreground)',
  backgroundColor: 'transparent',
  borderStyle: 'solid',
  borderWidth: 'var(--border-1)',
  borderColor: 'var(--border-subtle)',
  borderRadius: 'var(--radius-md)',
  paddingLeft: 'var(--space-2)',
  paddingRight: 'var(--space-2)',
  paddingTop: 'var(--space-1)',
  paddingBottom: 'var(--space-1)'
};

/** Lines up a row's second line with its title: grip (24) + gap (8) + number (20) + gap (8) + tick (26) + gap (8). */
const ACTION_INDENT = 94;

/**
 * 🔴 **s8 — the title is a field, and the box closes when you leave it.** Richard:
 * *"I can't edit a 'next action' title, and when I type a description I can't save or
 * exit the description input field."* Both were one node doing two jobs: the title was a
 * `Text` whose click toggled a per-row `States` fold, so it could not be typed in, and
 * that fold was the only way out of the editor.
 *
 * **Measured before it was changed** (`s8` §0, the demo in headless Chrome): with nothing
 * typed the fold closed on a second click, but with a save in flight it closed on one run
 * and stayed open on another — the blur writes the description, the write refreshes the
 * list, and the rebuild lands between the press and the release often enough to eat the
 * click. **A toggle is not safe on a press that also saves.** So:
 *
 * - the title is a `Text Input` that renames on Enter/blur, exactly as the task's does;
 * - **which next action is open is one value on the page** (`todoOpenAction`), SET by the
 *   Description button and CLEARED by the field's own blur. Nothing here toggles, so there
 *   is no press for a rebuild to eat, and only one description is ever open;
 * - leaving the field both saves and closes, so `Save` never has to be the thing that
 *   works — it is the affordance that says so, and it closes an editor nobody typed in.
 */
const ACTION_ROW: Tpl008Component = {
  path: 'Todo/Action row',
  description:
    'One next action: the grip it is dragged by (Todo/Next actions moves it), its number, a tick box and its title (edit it in place, Enter saves). Description opens a box for what it involves; leaving the box, or Save, writes it and closes it. A ticked action shows what happened instead of a number, and has no grip.',
  ...iface(ACTION_ROW_FIELDS, ACTION_ROW_OUTS),
  nodes: [
    inputs('arIn', 'The next action', ACTION_ROW_FIELDS),
    outputs('arOut', 'What you did to it', ACTION_ROW_OUTS),
    group('arRoot', 'Next action', undefined, {
      ...COLUMN('var(--space-0)'),
      ...RULE_BELOW,
      cssClassName: DRAG_ROW_CLASS,
      paddingTop: 'var(--space-1)',
      paddingBottom: 'var(--space-1)'
    }),
    group('arTop', 'The line', 'arRoot', ROW('var(--space-2)')),
    // A ticked one keeps a gap where the grip was, so its number column still lines up.
    group('arGripSlot', 'Where the grip goes', 'arTop', { sizeMode: 'explicit', width: px(24), height: px(32) }),
    GRIP('arGrip', 'arGripSlot', 'Drag to move'),
    text('arNum', 'Its place', 'arTop', '', { ...T_META, sizeMode: 'contentHeight', width: px(20), textAlignX: 'right', fontVariantNumeric: 'tabular-nums' }),
    place('arCheck', BUTTON, 'Tick box', 'arTop', BTN_CHECK),
    place('arTitle', TEXT_INPUT, 'Title', 'arTop', ROW_TITLE_FIELD),
    place('arDescOpen', BUTTON, 'Open the description', 'arTop', BTN_ICON('icon-align-left', 'Description')),
    group('arPreview', 'Description, folded', 'arRoot', { ...COLUMN('var(--space-0)'), paddingLeft: ACTION_INDENT, mounted: false }),
    text('arPreviewText', 'Description', 'arPreview', '', wide(T_META)),
    group('arEditor', 'Description, open', 'arRoot', { ...COLUMN('var(--space-1)'), paddingLeft: ACTION_INDENT, paddingBottom: 'var(--space-2)', mounted: false }),
    place('arDescField', TEXT_INPUT, 'Description', 'arEditor', { ...FIELD, type: 'textArea', placeholder: 'Add a description' }),
    place('arSave', BUTTON, 'Save the description', 'arEditor', { ...BTN_OUTLINE, label: 'Save', sizeMode: 'contentSize' }),
    text('arNote', 'What happened', 'arRoot', '', { ...wide(T_META), marginLeft: px(ACTION_INDENT), marginBottom: 'var(--space-1)' }),
    logic('arWhich', CONDITION, 'Tick or untick?', signalOnly('condition'))
  ],
  connections: [
    wire('arIn', 'num', 'arNum', 'text'),
    wire('arIn', 'title', 'arTitle', 'startValue'),
    wire('arIn', 'titleColor', 'arTitle', 'color'),
    wire('arIn', 'description', 'arPreviewText', 'text'),
    wire('arIn', 'showPreview', 'arPreview', 'mounted'),
    wire('arIn', 'description', 'arDescField', 'startValue'),
    wire('arIn', 'descriptionOpen', 'arEditor', 'mounted'),
    wire('arIn', 'noteLine', 'arNote', 'text'),
    wire('arIn', 'hasNote', 'arNote', 'mounted'),
    wire('arIn', 'canMove', 'arGrip', 'mounted'),
    wire('arIn', 'checkBg', 'arCheck', 'backgroundColor'),
    wire('arIn', 'checkIconColor', 'arCheck', 'color'),
    wire('arIn', 'checkBorder', 'arCheck', 'borderColor'),
    wire('arIn', 'done', 'arWhich', 'condition'),
    wire('arIn', 'id', 'arOut', 'id'),
    wire('arIn', 'title', 'arOut', 'title'),
    wire('arCheck', 'onClick', 'arWhich', 'eval'),
    wire('arWhich', 'ontrue', 'arOut', 'untick'),
    wire('arWhich', 'onfalse', 'arOut', 'tick'),
    // 🔴 Enter BLURS, and only blur renames. Wiring Enter to rename as well would
    // rename twice — once on Enter, again on the blur Enter causes (the task title's rule).
    wire('arTitle', 'onTextChanged', 'arOut', 'titleText'),
    wire('arTitle', 'onEnter', 'arTitle', 'blur'),
    wire('arTitle', 'onBlur', 'arOut', 'rename'),
    wire('arDescOpen', 'onClick', 'arOut', 'openDescription'),
    wire('arDescField', 'onTextChanged', 'arOut', 'descriptionText'),
    // 🔴 **ONE signal out of a row per update.** `For Each` forwards item signals through a
    // single `scheduleAfterUpdate` (`foreach.tsx`, `itemOutputSignalTriggered`): a second
    // signal in the same update overwrites which one is sent, and the first is LOST. Blur
    // wired to both `describe` and `closeDescription` silently dropped the save — measured,
    // the drive read an empty description after Save. So leaving the box says ONE thing,
    // and the page below does both jobs with it.
    wire('arDescField', 'onBlur', 'arOut', 'describe'),
    // …and Save closes a box nobody typed in, where there is no blur to say it.
    wire('arSave', 'onClick', 'arOut', 'closeDescription')
  ]
};

const NEXT_ACTIONS: Tpl008Component = {
  path: 'Todo/Next actions',
  description:
    'A task’s next actions in order — open ones numbered, ticked ones after — and the box that adds one at the bottom. An open one is moved by dragging its grip (Moved, Move Id, Move To from 0, among the open ones). Which one has its description open is the page’s to hold, so only ever one does.',
  ...iface(
    [['rows', 'array'], ['clearNew', 'signal']],
    [
      ['tick', 'signal'], ['untick', 'signal'], ['moved', 'signal'], ['rename', 'signal'],
      ['openDescription', 'signal'], ['closeDescription', 'signal'], ['describe', 'signal'], ['add', 'signal'],
      ['actionId', 'string'], ['actionTitle', 'string'], ['actionTitleText', 'string'], ['descriptionText', 'string'], ['newTitle', 'string'],
      ['moveId', 'string'], ['moveTo', 'number']
    ]
  ),
  repeats: { source: 'array', rowFields: ACTION_ROW_FIELDS.map(([n]) => n) },
  instantiates: [C.actionRow],
  nodes: [
    inputs('naIn', 'The next actions', [['rows', 'array'], ['clearNew', 'signal']]),
    outputs('naOut', 'What you did', [
      ['tick', 'signal'], ['untick', 'signal'], ['moved', 'signal'], ['rename', 'signal'],
      ['openDescription', 'signal'], ['closeDescription', 'signal'], ['describe', 'signal'], ['add', 'signal'],
      ['actionId', 'string'], ['actionTitle', 'string'], ['actionTitleText', 'string'], ['descriptionText', 'string'], ['newTitle', 'string'],
      ['moveId', 'string'], ['moveTo', 'number']
    ]),
    group('naRoot', 'Next actions', undefined, COLUMN('var(--space-2)')),
    text('naHeading', 'Heading', 'naRoot', 'Next actions', { ...wide(T_HEADING), as: 'h2' }),
    group('naRows', 'The rows', 'naRoot', COLUMN('var(--space-0)')),
    place('naEach', FOR_EACH, 'One row per next action', 'naRows', { template: C.actionRow, templateType: 'explicit' }),
    group('naAdd', 'Add a next action', 'naRoot', ROW('var(--space-2)')),
    place('naField', TEXT_INPUT, 'New next action', 'naAdd', { ...FIELD, placeholder: 'Add a next action' }),
    place('naButton', BUTTON, 'Add', 'naAdd', { ...BTN_OUTLINE, label: 'Add' }),
    script('naSubmit', 'The title, if one was typed', SUBMIT_SCRIPT, ['text']),
    ...dragSort('na', 'naRows', ['naIn', 'rows'], 'naOut').nodes
  ],
  connections: [
    wire('naIn', 'rows', 'naEach', 'items'),
    wire('naIn', 'clearNew', 'naField', 'clear'),
    wire('naField', 'onTextChanged', 'naSubmit', 'in-text'),
    wire('naField', 'onEnter', 'naSubmit', 'run'),
    wire('naButton', 'onClick', 'naSubmit', 'run'),
    wire('naSubmit', 'out-text', 'naOut', 'newTitle'),
    wire('naSubmit', 'out-go', 'naOut', 'add'),
    wire('naEach', 'itemOutputSignal-tick', 'naOut', 'tick'),
    wire('naEach', 'itemOutputSignal-untick', 'naOut', 'untick'),
    wire('naEach', 'itemOutputSignal-rename', 'naOut', 'rename'),
    wire('naEach', 'itemOutputSignal-openDescription', 'naOut', 'openDescription'),
    wire('naEach', 'itemOutputSignal-closeDescription', 'naOut', 'closeDescription'),
    wire('naEach', 'itemOutputSignal-describe', 'naOut', 'describe'),
    wire('naEach', 'itemOutput-id', 'naOut', 'actionId'),
    wire('naEach', 'itemOutput-title', 'naOut', 'actionTitle'),
    wire('naEach', 'itemOutput-titleText', 'naOut', 'actionTitleText'),
    wire('naEach', 'itemOutput-descriptionText', 'naOut', 'descriptionText'),
    ...dragSort('na', 'naRows', ['naIn', 'rows'], 'naOut').connections
  ]
};

const HISTORY_ENTRY_FIELDS: Array<[string, string]> = [['id', 'string'], ['line', 'string'], ['body', 'string'], ['hasBody', 'boolean']];

const HISTORY_ENTRY: Tpl008Component = {
  path: 'Todo/History entry',
  description: 'One line of a task’s history: when and what happened, and the note when there is one.',
  ...iface(HISTORY_ENTRY_FIELDS, []),
  nodes: [
    inputs('heIn', 'The line', HISTORY_ENTRY_FIELDS),
    group('heRoot', 'History entry', undefined, { ...COLUMN('var(--space-0-5)'), ...RULE_BELOW, paddingTop: 'var(--space-2)', paddingBottom: 'var(--space-2)' }),
    text('heLine', 'When and what', 'heRoot', '', wide(T_META)),
    text('heBody', 'The note', 'heRoot', '', wide(T_BODY))
  ],
  connections: [
    wire('heIn', 'line', 'heLine', 'text'),
    wire('heIn', 'body', 'heBody', 'text'),
    wire('heIn', 'hasBody', 'heBody', 'mounted')
  ]
};

const HISTORY: Tpl008Component = {
  path: 'Todo/History',
  description: 'A task’s history, newest first, and the box that adds a note to it.',
  ...iface([['rows', 'array'], ['clearNote', 'signal']], [['addNote', 'signal'], ['noteText', 'string']]),
  repeats: { source: 'array', rowFields: HISTORY_ENTRY_FIELDS.map(([n]) => n) },
  instantiates: [C.historyEntry],
  nodes: [
    inputs('hiIn', 'The history', [['rows', 'array'], ['clearNote', 'signal']]),
    outputs('hiOut', 'A note', [['addNote', 'signal'], ['noteText', 'string']]),
    group('hiRoot', 'History', undefined, COLUMN('var(--space-2)')),
    text('hiHeading', 'Heading', 'hiRoot', 'History', { ...wide(T_HEADING), as: 'h2' }),
    group('hiForm', 'Add a note', 'hiRoot', { ...COLUMN('var(--space-2)'), alignItems: 'flex-end' }),
    place('hiField', TEXT_INPUT, 'New note', 'hiForm', { ...FIELD, type: 'textArea', placeholder: 'Add a note' }),
    place('hiButton', BUTTON, 'Add note', 'hiForm', { ...BTN_OUTLINE, label: 'Add note' }),
    group('hiRows', 'The entries', 'hiRoot', COLUMN('var(--space-0)')),
    place('hiEach', FOR_EACH, 'One line per entry', 'hiRows', { template: C.historyEntry, templateType: 'explicit' }),
    script('hiSubmit', 'The note, if one was typed', SUBMIT_SCRIPT, ['text'])
  ],
  connections: [
    wire('hiIn', 'rows', 'hiEach', 'items'),
    wire('hiIn', 'clearNote', 'hiField', 'clear'),
    wire('hiField', 'onTextChanged', 'hiSubmit', 'in-text'),
    wire('hiButton', 'onClick', 'hiSubmit', 'run'),
    wire('hiSubmit', 'out-text', 'hiOut', 'noteText'),
    wire('hiSubmit', 'out-go', 'hiOut', 'addNote')
  ]
};

const DIALOG_INS: Array<[string, string]> = [
  ['open', 'boolean'], ['subject', 'string'], ['heading', 'string'], ['help', 'string'], ['okLabel', 'string'], ['optional', 'boolean']
];
const DIALOG_OUTS: Array<[string, string]> = [['confirm', 'signal'], ['cancel', 'signal'], ['note', 'string']];

const NOTE_DIALOG: Tpl008Component = {
  path: 'Todo/Note dialog',
  description:
    'The "what happened?" dialog every close, reopen, tick and untick goes through. The OK button stays disabled until something is written, so there is always a note — except where Optional is on (a recurring item ticked off, TPL-008-RC RC3).',
  ...iface(DIALOG_INS, DIALOG_OUTS),
  nodes: [
    inputs('ndIn', 'What to ask', DIALOG_INS),
    outputs('ndOut', 'The answer', DIALOG_OUTS),
    group('ndScrim', 'Dialog backdrop', undefined, {
      position: 'fixed',
      zIndex: 50,
      sizeMode: 'explicit',
      width: pct(100),
      height: pct(100),
      styleCss: 'top: 0; left: 0; background-color: rgba(20, 22, 24, 0.45);',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      paddingLeft: 'var(--space-4)',
      paddingRight: 'var(--space-4)',
      mounted: false
    }),
    group('ndPanel', 'Dialog', 'ndScrim', {
      ...composition('card'),
      maxWidth: px(460),
      rowGap: 'var(--space-3)',
      paddingLeft: 'var(--space-5)',
      paddingRight: 'var(--space-5)',
      paddingTop: 'var(--space-5)',
      paddingBottom: 'var(--space-5)'
    }),
    text('ndSubject', 'Which task', 'ndPanel', '', wide(T_META)),
    text('ndHeading', 'The question', 'ndPanel', '', { ...wide(T_TITLE), as: 'h2' }),
    text('ndHelp', 'Why it asks', 'ndPanel', '', wide(T_META)),
    place('ndField', TEXT_INPUT, 'What happened', 'ndPanel', { ...FIELD, type: 'textArea', placeholder: 'What happened?' }),
    group('ndButtons', 'Buttons', 'ndPanel', { ...ROW('var(--space-2)'), justifyContent: 'flex-end' }),
    place('ndCancel', BUTTON, 'Cancel', 'ndButtons', { ...BTN_OUTLINE, label: 'Cancel' }),
    place('ndOk', BUTTON, 'OK', 'ndButtons', { ...BTN_PRIMARY, label: 'OK', enabled: false }),
    derive('ndCheck', 'Has something been written?', "var t = String(Inputs.text || '').trim();\nOutputs.ok = t !== '' || Inputs.optional === true;\nOutputs.note = t;")
  ],
  connections: [
    wire('ndIn', 'open', 'ndScrim', 'mounted'),
    wire('ndIn', 'subject', 'ndSubject', 'text'),
    wire('ndIn', 'heading', 'ndHeading', 'text'),
    wire('ndIn', 'help', 'ndHelp', 'text'),
    wire('ndIn', 'okLabel', 'ndOk', 'label'),
    // Every time the dialog opens: an empty box, with the cursor in it.
    wire('ndField', 'didMount', 'ndField', 'clear'),
    wire('ndField', 'didMount', 'ndField', 'focus'),
    wire('ndField', 'onTextChanged', 'ndCheck', 'in-text'),
    wire('ndIn', 'optional', 'ndCheck', 'in-optional'),
    wire('ndCheck', 'out-ok', 'ndOk', 'enabled'),
    wire('ndCheck', 'out-note', 'ndOut', 'note'),
    wire('ndOk', 'onClick', 'ndOut', 'confirm'),
    wire('ndCancel', 'onClick', 'ndOut', 'cancel')
  ]
};

// ════════════════════════════════════════════════════════════════════════════
// TPL-008-RC — Today, and things that repeat (what you can see)
// ════════════════════════════════════════════════════════════════════════════

const TODAY_ROW_FIELDS: Array<[string, string]> = [
  ['id', 'string'],
  ['targetId', 'string'],
  ['isRoutine', 'boolean'],
  ['heading', 'string'],
  ['showHeading', 'boolean'],
  ['time', 'string'],
  ['hasTime', 'boolean'],
  ['title', 'string'],
  ['meta', 'string'],
  ['hasMeta', 'boolean'],
  ['metaColor', 'string'],
  ['bg', 'string']
];
const TODAY_ROW_OUTS: Array<[string, string]> = [
  ['open', 'signal'], ['close', 'signal'], ['check', 'signal'], ['id', 'string'], ['targetId', 'string'], ['title', 'string']
];

/**
 * One line of Today: a task (overdue, due today, or in the next 7 days) or one occurrence of
 * something that repeats, with its time. **The tick says one thing per press** (see
 * `Todo/Action row`): a Condition on `isRoutine` sends `check` for an occurrence and `close` for
 * a task, never both, so the page asks the right question.
 */
const TODAY_ROW: Tpl008Component = {
  path: 'Todo/Today row',
  description:
    'One line of Today: the heading when it starts a section, the time for something that repeats, the title, how late or soon it is, and the tick box — which closes a task ("what happened?") or ticks off that one occurrence.',
  ...iface(TODAY_ROW_FIELDS, TODAY_ROW_OUTS),
  nodes: [
    inputs('yrIn', 'The line', TODAY_ROW_FIELDS),
    outputs('yrOut', 'What you did to it', TODAY_ROW_OUTS),
    group('yrRoot', 'Today line', undefined, COLUMN('var(--space-0)')),
    text('yrHeading', 'Section', 'yrRoot', '', wide({ ...T_HEADING, marginTop: 'var(--space-4)', marginBottom: 'var(--space-1)' })),
    group('yrRow', 'Row', 'yrRoot', {
      ...ROW('var(--space-2)'),
      ...RULE_BELOW,
      paddingLeft: 'var(--space-2)',
      paddingRight: 'var(--space-2)',
      paddingTop: 'var(--space-2)',
      paddingBottom: 'var(--space-2)'
    }),
    text('yrTime', 'Time', 'yrRow', '', { ...T_META, sizeMode: 'contentHeight', width: px(44), fontVariantNumeric: 'tabular-nums' }),
    group('yrMain', 'Title and when', 'yrRow', { ...COLUMN('var(--space-0-5)'), paddingTop: 'var(--space-1)', paddingBottom: 'var(--space-1)' }),
    text('yrTitle', 'Title', 'yrMain', '', wide(T_BODY)),
    text('yrMeta', 'How late or soon', 'yrMain', '', wide(T_META)),
    place('yrTick', BUTTON, 'Tick it off', 'yrRow', { ...BTN_CHECK, marginLeft: 'var(--space-1)' }),
    logic('yrWhich', CONDITION, 'Something that repeats, or a task?', signalOnly('condition'))
  ],
  connections: [
    wire('yrIn', 'heading', 'yrHeading', 'text'),
    wire('yrIn', 'showHeading', 'yrHeading', 'mounted'),
    wire('yrIn', 'time', 'yrTime', 'text'),
    wire('yrIn', 'hasTime', 'yrTime', 'mounted'),
    wire('yrIn', 'title', 'yrTitle', 'text'),
    wire('yrIn', 'meta', 'yrMeta', 'text'),
    wire('yrIn', 'hasMeta', 'yrMeta', 'mounted'),
    wire('yrIn', 'metaColor', 'yrMeta', 'color'),
    wire('yrIn', 'bg', 'yrRow', 'backgroundColor'),
    wire('yrIn', 'isRoutine', 'yrWhich', 'condition'),
    wire('yrIn', 'id', 'yrOut', 'id'),
    wire('yrIn', 'targetId', 'yrOut', 'targetId'),
    wire('yrIn', 'title', 'yrOut', 'title'),
    wire('yrMain', 'onClick', 'yrOut', 'open'),
    wire('yrTick', 'onClick', 'yrWhich', 'eval'),
    wire('yrWhich', 'ontrue', 'yrOut', 'check'),
    wire('yrWhich', 'onfalse', 'yrOut', 'close')
  ]
};

const TODAY_LIST: Tpl008Component = {
  path: 'Todo/Today list',
  description:
    'Today, in time order: overdue tasks, what repeats today (by its time), tasks due today, then deadlines in the next 7 days. Something that repeats leaves the list once it is ticked off, until it is next due.',
  ...iface(
    [['rows', 'array']],
    [['open', 'signal'], ['close', 'signal'], ['check', 'signal'], ['rowId', 'string'], ['targetId', 'string'], ['title', 'string']]
  ),
  repeats: { source: 'array', rowFields: TODAY_ROW_FIELDS.map(([n]) => n) },
  instantiates: [C.todayRow],
  nodes: [
    inputs('ylIn', 'The rows', [['rows', 'array']]),
    outputs('ylOut', 'What happened in Today', [
      ['open', 'signal'], ['close', 'signal'], ['check', 'signal'], ['rowId', 'string'], ['targetId', 'string'], ['title', 'string']
    ]),
    group('ylRoot', 'Today', undefined, COLUMN('var(--space-0)')),
    place('ylEach', FOR_EACH, 'One line per thing today', 'ylRoot', { template: C.todayRow, templateType: 'explicit' }),
    text('ylEmpty', 'When there is nothing today', 'ylRoot', 'Nothing due today. Give a task a deadline, or add something that repeats below.', wide(T_META)),
    derive('ylCount', 'Is it empty?', COUNT_SCRIPT)
  ],
  connections: [
    wire('ylIn', 'rows', 'ylEach', 'items'),
    wire('ylIn', 'rows', 'ylCount', 'in-rows'),
    wire('ylCount', 'out-empty', 'ylEmpty', 'mounted'),
    wire('ylEach', 'itemOutputSignal-open', 'ylOut', 'open'),
    wire('ylEach', 'itemOutputSignal-close', 'ylOut', 'close'),
    wire('ylEach', 'itemOutputSignal-check', 'ylOut', 'check'),
    wire('ylEach', 'itemOutput-id', 'ylOut', 'rowId'),
    wire('ylEach', 'itemOutput-targetId', 'ylOut', 'targetId'),
    wire('ylEach', 'itemOutput-title', 'ylOut', 'title')
  ]
};

const ROUTINE_ROW_FIELDS: Array<[string, string]> = [
  ['id', 'string'], ['title', 'string'], ['titleColor', 'string'], ['meta', 'string'], ['bg', 'string']
];

const ROUTINE_ROW: Tpl008Component = {
  path: 'Todo/Routine row',
  description: 'One thing that repeats: its title, when it repeats, and whether it has started, ends, ended or was stopped.',
  ...iface(ROUTINE_ROW_FIELDS, [['open', 'signal'], ['id', 'string']]),
  nodes: [
    inputs('rrIn', 'The thing that repeats', ROUTINE_ROW_FIELDS),
    outputs('rrOut', 'Opened', [['open', 'signal'], ['id', 'string']]),
    group('rrRow', 'Row', undefined, {
      ...COLUMN('var(--space-0-5)'),
      ...RULE_BELOW,
      paddingLeft: 'var(--space-2)',
      paddingRight: 'var(--space-2)',
      paddingTop: 'var(--space-2)',
      paddingBottom: 'var(--space-2)'
    }),
    text('rrTitle', 'Title', 'rrRow', '', wide(T_BODY)),
    text('rrMeta', 'When it repeats', 'rrRow', '', wide(T_META))
  ],
  connections: [
    wire('rrIn', 'title', 'rrTitle', 'text'),
    wire('rrIn', 'titleColor', 'rrTitle', 'color'),
    wire('rrIn', 'meta', 'rrMeta', 'text'),
    wire('rrIn', 'bg', 'rrRow', 'backgroundColor'),
    wire('rrIn', 'id', 'rrOut', 'id'),
    wire('rrRow', 'onClick', 'rrOut', 'open')
  ]
};

const ROUTINE_LIST: Tpl008Component = {
  path: 'Todo/Routine list',
  description: 'Everything that repeats — current first, finished after — and the box that adds one. Clear New empties the box.',
  ...iface([['rows', 'array'], ['clearNew', 'signal']], [['open', 'signal'], ['add', 'signal'], ['routineId', 'string'], ['newTitle', 'string']]),
  repeats: { source: 'array', rowFields: ROUTINE_ROW_FIELDS.map(([n]) => n) },
  instantiates: [C.routineRow],
  nodes: [
    inputs('rlIn', 'The rows', [['rows', 'array'], ['clearNew', 'signal']]),
    outputs('rlOut', 'What happened in the list', [['open', 'signal'], ['add', 'signal'], ['routineId', 'string'], ['newTitle', 'string']]),
    group('rlRoot', 'Things that repeat', undefined, { ...COLUMN('var(--space-3)'), marginTop: 'var(--space-6)' }),
    text('rlHeading', 'Heading', 'rlRoot', 'Things that repeat', { ...wide(T_HEADING), as: 'h2' }),
    group('rlRows', 'The rows', 'rlRoot', { ...COLUMN('var(--space-0)'), borderTopStyle: 'solid', borderTopWidth: 'var(--border-1)', borderTopColor: 'var(--border-subtle)' }),
    place('rlEach', FOR_EACH, 'One row per thing that repeats', 'rlRows', { template: C.routineRow, templateType: 'explicit' }),
    text('rlEmpty', 'When nothing repeats', 'rlRoot', 'Nothing repeats yet. A tablet every morning, a call every Friday: add it here and it shows up in Today on the days it is due.', wide(T_META)),
    group('rlAdd', 'Add one', 'rlRoot', ROW('var(--space-2)')),
    place('rlField', TEXT_INPUT, 'New thing that repeats', 'rlAdd', { ...FIELD, placeholder: 'Add something that repeats' }),
    place('rlButton', BUTTON, 'Add', 'rlAdd', { ...BTN_OUTLINE, label: 'Add' }),
    derive('rlCount', 'Is it empty?', COUNT_SCRIPT),
    script('rlSubmit', 'The title, if one was typed', SUBMIT_SCRIPT, ['text'])
  ],
  connections: [
    wire('rlIn', 'rows', 'rlEach', 'items'),
    wire('rlIn', 'rows', 'rlCount', 'in-rows'),
    wire('rlCount', 'out-empty', 'rlEmpty', 'mounted'),
    wire('rlIn', 'clearNew', 'rlField', 'clear'),
    wire('rlField', 'onTextChanged', 'rlSubmit', 'in-text'),
    wire('rlField', 'onEnter', 'rlSubmit', 'run'),
    wire('rlButton', 'onClick', 'rlSubmit', 'run'),
    wire('rlSubmit', 'out-text', 'rlOut', 'newTitle'),
    wire('rlSubmit', 'out-go', 'rlOut', 'add'),
    wire('rlEach', 'itemOutputSignal-open', 'rlOut', 'open'),
    wire('rlEach', 'itemOutput-id', 'rlOut', 'routineId')
  ]
};

const CHIP_SHAPE = {
  borderStyle: 'solid',
  borderWidth: 'var(--border-1)',
  borderRadius: 'var(--radius-full)',
  fontSize: 'var(--text-sm)',
  fontWeight: 'var(--font-medium)',
  sizeMode: 'contentSize',
  paddingLeft: 'var(--space-3)',
  paddingRight: 'var(--space-3)',
  paddingTop: 'var(--space-1)',
  paddingBottom: 'var(--space-1)'
};

const DAY_CHIP_FIELDS: Array<[string, string]> = [['id', 'string'], ['label', 'string'], ['bg', 'string'], ['color', 'string'], ['border', 'string']];

/** A weekday or a day of the month, picked (filled) or not. Pressing it says which; the page keeps the picks. */
const DAY_CHIP: Tpl008Component = {
  path: 'Todo/Day chip',
  description: 'One day you can pick for the next time you add — Mon to Sun, or 1 to 31 and Last. Filled when it is picked.',
  ...iface(DAY_CHIP_FIELDS, [['pick', 'signal'], ['id', 'string']]),
  nodes: [
    inputs('dcIn', 'The day', DAY_CHIP_FIELDS),
    outputs('dcOut', 'Picked', [['pick', 'signal'], ['id', 'string']]),
    group('dcRoot', 'Day', undefined, { flexDirection: 'row', sizeMode: 'contentSize' }),
    place('dcButton', BUTTON, 'Pick this day', 'dcRoot', {
      ...CHIP_SHAPE,
      label: '',
      backgroundColor: 'transparent',
      color: 'var(--foreground)',
      borderColor: 'var(--border-control)'
    })
  ],
  connections: [
    wire('dcIn', 'label', 'dcButton', 'label'),
    wire('dcIn', 'bg', 'dcButton', 'backgroundColor'),
    wire('dcIn', 'color', 'dcButton', 'color'),
    wire('dcIn', 'border', 'dcButton', 'borderColor'),
    wire('dcIn', 'id', 'dcOut', 'id'),
    wire('dcButton', 'onClick', 'dcOut', 'pick')
  ]
};

const SLOT_CHIP_FIELDS: Array<[string, string]> = [['id', 'string'], ['label', 'string']];

/** One time in the schedule ("Tue 09:00"), and the ✕ that takes it out. */
const SLOT_CHIP: Tpl008Component = {
  path: 'Todo/Slot chip',
  description: 'One time in the schedule, such as "08:00", "Tue 09:00" or "Last day 17:00", with a ✕ that takes it out.',
  ...iface(SLOT_CHIP_FIELDS, [['remove', 'signal'], ['id', 'string']]),
  nodes: [
    inputs('scIn', 'The time', SLOT_CHIP_FIELDS),
    outputs('scOut', 'Taken out', [['remove', 'signal'], ['id', 'string']]),
    group('scRoot', 'Time', undefined, {
      flexDirection: 'row',
      alignItems: 'center',
      sizeMode: 'contentSize',
      columnGap: 'var(--space-1)',
      backgroundColor: 'var(--muted)',
      borderRadius: 'var(--radius-full)',
      paddingLeft: 'var(--space-3)',
      paddingRight: 'var(--space-1)'
    }),
    text('scLabel', 'When', 'scRoot', '', { ...T_BODY, sizeMode: 'contentSize', fontVariantNumeric: 'tabular-nums' }),
    place('scRemove', BUTTON, 'Take this time out', 'scRoot', BTN_ICON('icon-x', 'Take this time out'))
  ],
  connections: [
    wire('scIn', 'label', 'scLabel', 'text'),
    wire('scIn', 'id', 'scOut', 'id'),
    wire('scRemove', 'onClick', 'scOut', 'remove')
  ]
};

const ROUTINE_SUMMARY_INS: Array<[string, string]> = [
  ['title', 'string'],
  ['scheduleLine', 'string'],
  ['statusLine', 'string'],
  ['statusColor', 'string'],
  ['cadence', 'string'],
  ['slotRows', 'array'],
  ['noSlots', 'boolean'],
  ['dayChips', 'array'],
  ['showDays', 'boolean'],
  ['addHint', 'string'],
  ['timeError', 'string'],
  ['hasTimeError', 'boolean'],
  ['startDate', 'string'],
  ['endDate', 'string'],
  ['startError', 'string'],
  ['hasStartError', 'boolean'],
  ['endError', 'string'],
  ['hasEndError', 'boolean'],
  ['canStop', 'boolean'],
  ['isStopped', 'boolean'],
  ['stopNote', 'string'],
  ['narrow', 'boolean'],
  ['clearTime', 'signal']
];
const ROUTINE_SUMMARY_OUTS: Array<[string, string]> = [
  ['rename', 'signal'],
  ['pickDaily', 'signal'],
  ['pickWeekly', 'signal'],
  ['pickMonthly', 'signal'],
  ['removeSlot', 'signal'],
  ['pickDay', 'signal'],
  ['addTime', 'signal'],
  ['setStart', 'signal'],
  ['setEnd', 'signal'],
  ['stop', 'signal'],
  ['back', 'signal'],
  ['newTitle', 'string'],
  ['slotKey', 'string'],
  ['dayKey', 'string'],
  ['timeText', 'string'],
  ['startText', 'string'],
  ['endText', 'string']
];

/**
 * The top of something that repeats: its title (edited in place, like a task's), how often,
 * its times, the days to pick for the next time added, its start and end, and Stop.
 *
 * RC6 — *"daily, weekly, monthly options, with multiple slots per selected timescale"*. The
 * three buttons change the timescale (the times are kept); a weekly or monthly one shows the
 * days to pick, and **one Add puts the typed time on every picked day** — Tuesday and Thursday
 * at 09:00 is two presses of a day and one of Add.
 */
const ROUTINE_SUMMARY: Tpl008Component = {
  path: 'Todo/Routine summary',
  description:
    'The top of something that repeats: its title (edit it in place), how often it repeats (every day, week or month), its times with a ✕ each, the days to pick and a time to add, when it starts and ends, and Stop. A stopped one shows why.',
  ...iface(ROUTINE_SUMMARY_INS, ROUTINE_SUMMARY_OUTS),
  instantiates: [C.slotChip, C.dayChip, C.datePicker],
  nodes: [
    inputs('rsIn', 'The thing that repeats', ROUTINE_SUMMARY_INS),
    outputs('rsOut', 'What you did', ROUTINE_SUMMARY_OUTS),
    group('rsRoot', 'Routine summary', undefined, COLUMN('var(--space-4)')),
    place('rsBack', BUTTON, 'Back', 'rsRoot', { ...BTN_GHOST, label: '← Back', mounted: false }),
    group('rsHead', 'Title and when', 'rsRoot', COLUMN('var(--space-1)')),
    place('rsTitle', TEXT_INPUT, 'Title', 'rsHead', {
      type: 'text',
      sizeMode: 'contentHeight',
      width: pct(100),
      placeholder: 'What repeats',
      fontSize: 'var(--text-xl)',
      fontWeight: 'var(--font-semibold)',
      color: 'var(--foreground)',
      backgroundColor: 'transparent',
      borderStyle: 'solid',
      borderWidth: 'var(--border-1)',
      borderColor: 'var(--border-subtle)',
      borderRadius: 'var(--radius-md)',
      paddingLeft: 'var(--space-2)',
      paddingRight: 'var(--space-2)',
      paddingTop: 'var(--space-1)',
      paddingBottom: 'var(--space-1)'
    }),
    text('rsSchedule', 'How often', 'rsHead', '', wide(T_BODY)),
    text('rsStatus', 'Started, ends, ended or stopped', 'rsHead', '', wide(T_META)),

    group('rsRepeats', 'How often', 'rsRoot', { ...COLUMN('var(--space-2)'), ...RULE_BELOW, paddingBottom: 'var(--space-4)' }),
    text('rsRepeatsLabel', 'How often label', 'rsRepeats', 'Repeats', wide(T_META)),
    group('rsCadence', 'Every day, week or month', 'rsRepeats', { ...ROW('var(--space-1)'), flexWrap: 'wrap' }),
    place('rsDaily', BUTTON, 'Every day', 'rsCadence', { ...BTN_GHOST, label: 'Every day' }),
    place('rsWeekly', BUTTON, 'Every week', 'rsCadence', { ...BTN_GHOST, label: 'Every week' }),
    place('rsMonthly', BUTTON, 'Every month', 'rsCadence', { ...BTN_GHOST, label: 'Every month' }),
    logic('rsLook', STATES, 'Which timescale is on', {
      states: 'daily,weekly,monthly',
      currentState: 'daily',
      values: 'dailyBg,weeklyBg,monthlyBg',
      'type-dailyBg': 'color',
      'type-weeklyBg': 'color',
      'type-monthlyBg': 'color',
      ...Object.fromEntries(
        ['daily', 'weekly', 'monthly'].flatMap((state) =>
          ['daily', 'weekly', 'monthly'].map((v) => [`value-${state}-${v}Bg`, state === v ? 'var(--muted)' : 'transparent'])
        )
      ),
      useTransitions: false
    }),
    text('rsTimesLabel', 'Times label', 'rsRepeats', 'Times', { ...wide(T_META), marginTop: 'var(--space-2)' }),
    group('rsSlots', 'The times', 'rsRepeats', { ...ROW('var(--space-2)'), flexWrap: 'wrap', styleCss: 'row-gap: 8px;' }),
    place('rsSlotEach', FOR_EACH, 'One chip per time', 'rsSlots', { template: C.slotChip, templateType: 'explicit' }),
    text('rsNoSlots', 'When it has no times', 'rsRepeats', 'No times yet, so it never comes up. Add one below.', { ...wide(T_META), mounted: false }),
    text('rsHint', 'What to do to add a time', 'rsRepeats', '', { ...wide(T_META), marginTop: 'var(--space-2)' }),
    group('rsDays', 'Days to pick', 'rsRepeats', { ...ROW('var(--space-1)'), flexWrap: 'wrap', styleCss: 'row-gap: 4px;', mounted: false }),
    place('rsDayEach', FOR_EACH, 'One chip per day', 'rsDays', { template: C.dayChip, templateType: 'explicit' }),
    group('rsAdd', 'Add a time', 'rsRepeats', ROW('var(--space-2)')),
    place('rsTime', TEXT_INPUT, 'Time', 'rsAdd', { ...FIELD, placeholder: 'A time, like 08:00 or 8:30pm' }),
    place('rsAddTime', BUTTON, 'Add time', 'rsAdd', { ...BTN_OUTLINE, label: 'Add time' }),
    text('rsTimeError', 'A time that is not a time', 'rsRepeats', '', { ...wide(T_ERROR), mounted: false }),

    group('rsDates', 'Starts and ends', 'rsRoot', { ...COLUMN('var(--space-2)'), ...RULE_BELOW, paddingBottom: 'var(--space-4)' }),
    group('rsDateRow', 'Both dates', 'rsDates', { ...ROW('var(--space-3)'), flexWrap: 'wrap', alignItems: 'flex-start', styleCss: 'row-gap: 12px;' }),
    group('rsStartBox', 'Starts', 'rsDateRow', { flexDirection: 'column', rowGap: 'var(--space-1)', sizeMode: 'contentSize' }),
    text('rsStartLabel', 'Starts label', 'rsStartBox', 'Starts', { ...T_META, sizeMode: 'contentSize' }),
    place('rsStart', C.datePicker, 'Start date', 'rsStartBox', { Label: 'Starts', Width: px(180) }),
    group('rsEndBox', 'Ends', 'rsDateRow', { flexDirection: 'column', rowGap: 'var(--space-1)', sizeMode: 'contentSize' }),
    text('rsEndLabel', 'Ends label', 'rsEndBox', 'Ends', { ...T_META, sizeMode: 'contentSize' }),
    place('rsEnd', C.datePicker, 'End date', 'rsEndBox', { Label: 'Ends', Width: px(180) }),
    text('rsDatesHint', 'What the end date does', 'rsDates', 'Leave the end empty and it keeps going.', wide(T_META)),
    text('rsStartError', 'A start date it cannot have', 'rsDates', '', { ...wide(T_ERROR), mounted: false }),
    text('rsEndError', 'An end date it cannot have', 'rsDates', '', { ...wide(T_ERROR), mounted: false }),

    group('rsButtons', 'Buttons', 'rsRoot', { ...ROW('var(--space-2)'), flexWrap: 'wrap' }),
    place('rsStop', BUTTON, 'Stop it', 'rsButtons', { ...BTN_OUTLINE, label: 'Stop it', mounted: false }),
    group('rsStopped', 'Why it stopped', 'rsRoot', { ...COLUMN('var(--space-1)'), ...RULE_BELOW, paddingBottom: 'var(--space-4)', mounted: false }),
    text('rsStoppedLabel', 'Why it stopped label', 'rsStopped', 'Why it stopped', wide(T_META)),
    text('rsStoppedNote', 'Why it stopped', 'rsStopped', '', wide(T_BODY))
  ],
  connections: [
    wire('rsIn', 'title', 'rsTitle', 'startValue'),
    wire('rsIn', 'scheduleLine', 'rsSchedule', 'text'),
    wire('rsIn', 'statusLine', 'rsStatus', 'text'),
    wire('rsIn', 'statusColor', 'rsStatus', 'color'),
    wire('rsIn', 'cadence', 'rsLook', 'currentState'),
    wire('rsLook', 'dailyBg', 'rsDaily', 'backgroundColor'),
    wire('rsLook', 'weeklyBg', 'rsWeekly', 'backgroundColor'),
    wire('rsLook', 'monthlyBg', 'rsMonthly', 'backgroundColor'),
    wire('rsIn', 'slotRows', 'rsSlotEach', 'items'),
    wire('rsIn', 'noSlots', 'rsNoSlots', 'mounted'),
    wire('rsIn', 'dayChips', 'rsDayEach', 'items'),
    wire('rsIn', 'showDays', 'rsDays', 'mounted'),
    wire('rsIn', 'addHint', 'rsHint', 'text'),
    wire('rsIn', 'timeError', 'rsTimeError', 'text'),
    wire('rsIn', 'hasTimeError', 'rsTimeError', 'mounted'),
    wire('rsIn', 'clearTime', 'rsTime', 'clear'),
    wire('rsIn', 'startDate', 'rsStart', 'Value'),
    wire('rsIn', 'endDate', 'rsEnd', 'Value'),
    wire('rsIn', 'startError', 'rsStartError', 'text'),
    wire('rsIn', 'hasStartError', 'rsStartError', 'mounted'),
    wire('rsIn', 'endError', 'rsEndError', 'text'),
    wire('rsIn', 'hasEndError', 'rsEndError', 'mounted'),
    wire('rsIn', 'canStop', 'rsStop', 'mounted'),
    wire('rsIn', 'isStopped', 'rsStopped', 'mounted'),
    wire('rsIn', 'stopNote', 'rsStoppedNote', 'text'),
    wire('rsIn', 'narrow', 'rsBack', 'mounted'),
    // 🔴 Enter BLURS, and only blur renames (the task title's rule).
    wire('rsTitle', 'onTextChanged', 'rsOut', 'newTitle'),
    wire('rsTitle', 'onEnter', 'rsTitle', 'blur'),
    wire('rsTitle', 'onBlur', 'rsOut', 'rename'),
    wire('rsDaily', 'onClick', 'rsOut', 'pickDaily'),
    wire('rsWeekly', 'onClick', 'rsOut', 'pickWeekly'),
    wire('rsMonthly', 'onClick', 'rsOut', 'pickMonthly'),
    wire('rsSlotEach', 'itemOutputSignal-remove', 'rsOut', 'removeSlot'),
    wire('rsSlotEach', 'itemOutput-id', 'rsOut', 'slotKey'),
    wire('rsDayEach', 'itemOutputSignal-pick', 'rsOut', 'pickDay'),
    wire('rsDayEach', 'itemOutput-id', 'rsOut', 'dayKey'),
    wire('rsTime', 'onTextChanged', 'rsOut', 'timeText'),
    wire('rsTime', 'onEnter', 'rsOut', 'addTime'),
    wire('rsAddTime', 'onClick', 'rsOut', 'addTime'),
    // The picker commits on a decision (a day picked, Enter, leaving the field), never per keystroke.
    wire('rsStart', 'Value', 'rsOut', 'startText'),
    wire('rsStart', 'Changed', 'rsOut', 'setStart'),
    wire('rsEnd', 'Value', 'rsOut', 'endText'),
    wire('rsEnd', 'Changed', 'rsOut', 'setEnd'),
    wire('rsStop', 'onClick', 'rsOut', 'stop'),
    wire('rsBack', 'onClick', 'rsOut', 'back')
  ]
};

// ════════════════════════════════════════════════════════════════════════════
// Logic/ — the queries, turned into what the screen draws
// ════════════════════════════════════════════════════════════════════════════

export const TASK_ROWS_SCRIPT =
  DATE_FNS +
  String.raw`var tasks = Inputs.tasks || [];
var actions = Inputs.actions || [];
var sel = String(Inputs.selectedId || '');
var open = [], done = [], maxPos = 0;
for (var i = 0; i < tasks.length; i++) {
  var t = tasks[i];
  if (!t) continue;
  var p = num(t.position, 0);
  if (p > maxPos) maxPos = p;
  if (t.status === 'done') done.push(t); else open.push(t);
}
open.sort(byPosition);

// The first open next action of each task, in its own order.
var nextOf = {};
var sortedActions = actions.slice().sort(byPosition);
for (var k = 0; k < sortedActions.length; k++) {
  var a = sortedActions[k];
  if (a && !a.done && nextOf[a.taskId] === undefined) nextOf[a.taskId] = String(a.title || '');
}

var rows = [];
for (var r = 0; r < open.length; r++) {
  var task = open[r];
  var d = due(task.deadline);
  var parts = [];
  if (d.text) parts.push(d.text);
  if (nextOf[task.id]) parts.push('Next: ' + nextOf[task.id]);
  rows.push({
    id: task.id,
    rank: String(r + 1),
    title: String(task.title || ''),
    meta: parts.join(' · '),
    hasMeta: parts.length > 0,
    metaColor: d.late ? 'var(--destructive)' : 'var(--muted-foreground)',
    titleWeight: r === 0 ? 600 : 400,
    bg: task.id === sel ? 'var(--surface)' : 'transparent',
    position: num(task.position, 0)
  });
}

done.sort(function (x, y) { return String(y.closedAt || '').localeCompare(String(x.closedAt || '')); });
var doneRows = [];
for (var q = 0; q < done.length; q++) {
  var c = done[q];
  var cd = when(c.closedAt);
  doneRows.push({
    id: c.id,
    title: String(c.title || ''),
    note: String(c.closingNote || ''),
    when: cd ? 'Closed ' + fmtDay(cd) : 'Closed',
    bg: c.id === sel ? 'var(--surface)' : 'transparent'
  });
}

Outputs.openRows = rows;
Outputs.doneRows = doneRows;
Outputs.listLabel = 'List (' + open.length + ')';
Outputs.doneLabel = 'Done (' + done.length + ')';
Outputs.addPlaceholder = 'Add a task (it goes in at #' + (open.length + 1) + ')';
Outputs.addSummary = 'Added at #' + (open.length + 1);
Outputs.nextPosition = maxPos + 1;
Outputs.nextRank = open.length + 1;`;

const TASK_ROWS: Tpl008Component = {
  path: 'Logic/Task rows',
  description:
    'Turns the Task and Action queries into the open list (in order, with deadline and next action), the Done list (newest first), the tab labels, and where a new task goes.',
  ...iface(
    [['tasks', 'array'], ['actions', 'array'], ['selectedId', 'string']],
    [
      ['openRows', 'array'], ['doneRows', 'array'], ['listLabel', 'string'], ['doneLabel', 'string'],
      ['addPlaceholder', 'string'], ['addSummary', 'string'], ['nextPosition', 'number'], ['nextRank', 'number']
    ]
  ),
  nodes: [
    inputs('rwIn', 'The records', [['tasks', 'array'], ['actions', 'array'], ['selectedId', 'string']]),
    outputs('rwOut', 'The rows', [
      ['openRows', 'array'], ['doneRows', 'array'], ['listLabel', 'string'], ['doneLabel', 'string'],
      ['addPlaceholder', 'string'], ['addSummary', 'string'], ['nextPosition', 'number'], ['nextRank', 'number']
    ]),
    derive('rwBuild', 'Build the rows', TASK_ROWS_SCRIPT)
  ],
  connections: [
    wire('rwIn', 'tasks', 'rwBuild', 'in-tasks'),
    wire('rwIn', 'actions', 'rwBuild', 'in-actions'),
    wire('rwIn', 'selectedId', 'rwBuild', 'in-selectedId'),
    ...['openRows', 'doneRows', 'listLabel', 'doneLabel', 'addPlaceholder', 'addSummary', 'nextPosition', 'nextRank'].map((n) =>
      wire('rwBuild', `out-${n}`, 'rwOut', n)
    )
  ]
};

export const SELECTED_SCRIPT =
  DATE_FNS +
  String.raw`var tasks = Inputs.tasks || [];
var actions = Inputs.actions || [];
var events = Inputs.events || [];
var sel = String(Inputs.selectedId || '');

var task = null, openList = [];
for (var i = 0; i < tasks.length; i++) {
  var t = tasks[i];
  if (!t) continue;
  if (t.id === sel) task = t;
  if (t.status !== 'done') openList.push(t);
}
openList.sort(byPosition);
if (!task) {
  Outputs.found = false;
  Outputs.notFound = true;
  return;
}

var isOpen = task.status !== 'done';
var rank = 0;
for (var r = 0; r < openList.length; r++) if (openList[r].id === sel) rank = r + 1;
var created = when(task.createdAt);
var closed = when(task.closedAt);
var added = created ? ' · added ' + ago(created) : '';
var d = due(task.deadline);

Outputs.found = true;
Outputs.notFound = false;
Outputs.isOpen = isOpen;
Outputs.isClosed = !isOpen;
Outputs.title = String(task.title || '');
Outputs.deadline = String(task.deadline || '');
Outputs.dueText = d.text;
Outputs.dueColor = d.late ? 'var(--destructive)' : 'var(--muted-foreground)';
Outputs.rankLine = (isOpen ? '#' + rank + ' of ' + openList.length : 'Closed' + (closed ? ' ' + fmtDay(closed) : '')) + added;
Outputs.canMakeNext = isOpen && rank > 1;
Outputs.closingNote = String(task.closingNote || '');

// Next actions: open ones in order and numbered, ticked ones after them.
// s8: the page says which one has its description open — a row's own state would
// be a toggle, and a toggle loses the press that also saves (see Todo/Action row).
var openId = String(Inputs.openActionId || '');
var mine = [], maxPos = 0;
for (var k = 0; k < actions.length; k++) {
  var a = actions[k];
  if (!a || a.taskId !== sel) continue;
  mine.push(a);
  if (num(a.position, 0) > maxPos) maxPos = num(a.position, 0);
}
mine.sort(byPosition);
var openA = [], doneA = [];
for (var m = 0; m < mine.length; m++) (mine[m].done ? doneA : openA).push(mine[m]);
function row(x, index, count) {
  var isDone = !!x.done;
  var desc = String(x.description || '');
  var note = String(x.note || '');
  return {
    id: x.id,
    num: isDone ? '' : String(index + 1),
    title: String(x.title || ''),
    titleColor: isDone ? 'var(--muted-foreground)' : 'var(--foreground)',
    description: desc,
    showPreview: desc !== '' && x.id !== openId,
    descriptionOpen: x.id === openId,
    noteLine: note === '' ? '' : 'Done: ' + note,
    hasNote: isDone && note !== '',
    done: isDone,
    canMove: !isDone,
    checkBg: isDone ? 'var(--primary)' : 'transparent',
    checkIconColor: isDone ? 'var(--primary-foreground)' : 'var(--border-control)',
    checkBorder: isDone ? 'var(--primary)' : 'var(--border-control)',
    position: num(x.position, 0)
  };
}
var actionRows = [], openActionRows = [];
for (var o = 0; o < openA.length; o++) {
  var built = row(openA[o], o, openA.length);
  actionRows.push(built);
  openActionRows.push(built);
}
for (var c = 0; c < doneA.length; c++) actionRows.push(row(doneA[c], 0, 0));
Outputs.actionRows = actionRows;
Outputs.openActionRows = openActionRows;
Outputs.nextActionPosition = maxPos + 1;

// History, newest first.
var mineE = [];
for (var e = 0; e < events.length; e++) if (events[e] && events[e].taskId === sel) mineE.push(events[e]);
mineE.sort(function (x, y) { return String(y.at || '').localeCompare(String(x.at || '')); });
var historyRows = [];
for (var h = 0; h < mineE.length; h++) {
  var ev = mineE[h];
  var at = when(ev.at);
  var body = String(ev.body || '');
  historyRows.push({
    id: ev.id,
    line: (at ? dayLabel(at) + ' ' + fmtTime(at) + ' · ' : '') + String(ev.summary || ''),
    body: body,
    hasBody: body !== ''
  });
}
Outputs.historyRows = historyRows;`;

const SELECTED_OUTS: Array<[string, string]> = [
  ['found', 'boolean'],
  ['notFound', 'boolean'],
  ['isOpen', 'boolean'],
  ['isClosed', 'boolean'],
  ['title', 'string'],
  ['deadline', 'string'],
  ['dueText', 'string'],
  ['dueColor', 'string'],
  ['rankLine', 'string'],
  ['canMakeNext', 'boolean'],
  ['closingNote', 'string'],
  ['actionRows', 'array'],
  ['openActionRows', 'array'],
  ['nextActionPosition', 'number'],
  ['historyRows', 'array']
];

const SELECTED_TASK: Tpl008Component = {
  path: 'Logic/Selected task',
  description:
    'Everything the detail pane shows about the selected task: title, where it is, its deadline, its next actions in order and its history, newest first.',
  ...iface(
    [['tasks', 'array'], ['actions', 'array'], ['events', 'array'], ['selectedId', 'string'], ['openActionId', 'string']],
    SELECTED_OUTS
  ),
  nodes: [
    inputs('slIn', 'The records', [
      ['tasks', 'array'], ['actions', 'array'], ['events', 'array'], ['selectedId', 'string'], ['openActionId', 'string']
    ]),
    outputs('slOut', 'The selected task', SELECTED_OUTS),
    derive('slBuild', 'Read the selected task', SELECTED_SCRIPT)
  ],
  connections: [
    wire('slIn', 'tasks', 'slBuild', 'in-tasks'),
    wire('slIn', 'actions', 'slBuild', 'in-actions'),
    wire('slIn', 'events', 'slBuild', 'in-events'),
    wire('slIn', 'selectedId', 'slBuild', 'in-selectedId'),
    wire('slIn', 'openActionId', 'slBuild', 'in-openActionId'),
    ...SELECTED_OUTS.map(([n]) => wire('slBuild', `out-${n}`, 'slOut', n))
  ]
};

export const LOG_ROWS_SCRIPT =
  DATE_FNS +
  String.raw`var events = Inputs.events || [];
var tasks = Inputs.tasks || [];
var routines = Inputs.routines || [];
var titles = {};
for (var i = 0; i < tasks.length; i++) if (tasks[i]) titles[tasks[i].id] = String(tasks[i].title || '');
for (var j = 0; j < routines.length; j++) if (routines[j]) titles[routines[j].id] = String(routines[j].title || '');
var sorted = events.slice().sort(function (x, y) { return String(y.at || '').localeCompare(String(x.at || '')); });
var rows = [], lastDay = '';
for (var k = 0; k < sorted.length; k++) {
  var e = sorted[k];
  if (!e) continue;
  var d = when(e.at);
  var day = d ? dayLabel(d) : '';
  var body = String(e.body || '');
  rows.push({
    id: e.id,
    taskId: String(e.taskId || ''),
    day: day,
    showDay: day !== lastDay,
    time: d ? fmtTime(d) : '',
    taskTitle: titles[e.taskId] || 'A task',
    summary: String(e.summary || ''),
    body: body,
    hasBody: body !== ''
  });
  lastDay = day;
}
Outputs.rows = rows;`;

const LOG_ROWS: Tpl008Component = {
  path: 'Logic/Log rows',
  description: 'Turns the recent history across all tasks (and things that repeat) into log lines, newest first, naming what each line is about.',
  ...iface([['events', 'array'], ['tasks', 'array'], ['routines', 'array']], [['rows', 'array']]),
  nodes: [
    inputs('lrIn', 'The records', [['events', 'array'], ['tasks', 'array'], ['routines', 'array']]),
    outputs('lrOut', 'The lines', [['rows', 'array']]),
    derive('lrBuild', 'Build the lines', LOG_ROWS_SCRIPT)
  ],
  connections: [
    wire('lrIn', 'events', 'lrBuild', 'in-events'),
    wire('lrIn', 'tasks', 'lrBuild', 'in-tasks'),
    wire('lrIn', 'routines', 'lrBuild', 'in-routines'),
    wire('lrBuild', 'out-rows', 'lrOut', 'rows')
  ]
};

/**
 * TPL-008-RC — **Today** (RC2), and the list of everything that repeats.
 *
 * Sections, in this order, each named once: *Overdue* (open tasks past their deadline),
 * *Today* (each occurrence of a routine due today and not yet ticked off, by its time; the
 * heading counts the ones already done), *Due today*, then *Next 7 days*. A task keeps its
 * id as `targetId`; an occurrence's row id is `r:<routine>|<YYYY-MM-DD>|<HH:MM>` — unique
 * even when one routine falls twice in a day, which is what `For Each` needs.
 *
 * `now` is the page's clock (a minute tick, and a wake when the tab comes back), so a slot
 * turns red when its time passes and the list turns over at midnight without a reload.
 */
export const TODAY_ROWS_SCRIPT =
  DATE_FNS +
  SCHEDULE_FNS +
  String.raw`var tasks = Inputs.tasks || [];
var actions = Inputs.actions || [];
var routines = Inputs.routines || [];
var checks = Inputs.checks || [];
var sel = String(Inputs.selectedId || '');
var now = new Date(Number(Inputs.now) || Date.now());
var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
var todayIso = schedIso(today);
var nowTime = schedPad(now.getHours()) + ':' + schedPad(now.getMinutes());
var DAY = 86400000;
var LATE = 'var(--destructive)', QUIET = 'var(--muted-foreground)';

var nextOf = {};
var sortedActions = actions.slice().sort(byPosition);
for (var k = 0; k < sortedActions.length; k++) {
  var a = sortedActions[k];
  if (a && !a.done && nextOf[a.taskId] === undefined) nextOf[a.taskId] = String(a.title || '');
}

var done = {};
for (var c = 0; c < checks.length; c++) {
  var ch = checks[c];
  if (ch) done[ch.routineId + '|' + ch.date + '|' + ch.time] = true;
}

var overdue = [], dueNow = [], soon = [];
for (var i = 0; i < tasks.length; i++) {
  var t = tasks[i];
  if (!t || t.status === 'done') continue;
  var d = toDay(t.deadline);
  if (!d) continue;
  var n = Math.round((d.getTime() - today.getTime()) / DAY);
  if (n < 0) overdue.push(t);
  else if (n === 0) dueNow.push(t);
  else if (n <= 7) soon.push(t);
}
function byDeadline(x, y) { return String(x.deadline).localeCompare(String(y.deadline)) || byPosition(x, y); }
overdue.sort(byDeadline);
dueNow.sort(byPosition);
soon.sort(byDeadline);

var slots = [], doneToday = 0;
for (var r = 0; r < routines.length; r++) {
  var ro = routines[r];
  if (!ro) continue;
  var times = schedOn(ro, today);
  for (var s = 0; s < times.length; s++) {
    if (done[ro.id + '|' + todayIso + '|' + times[s]]) doneToday++;
    else slots.push({ routine: ro, time: times[s] });
  }
}
slots.sort(function (x, y) { return x.time < y.time ? -1 : x.time > y.time ? 1 : String(x.routine.title || '').localeCompare(String(y.routine.title || '')); });

var rows = [], lastHeading = '';
function add(row) {
  row.showHeading = row.heading !== lastHeading;
  lastHeading = row.heading;
  rows.push(row);
}
function taskRow(task, heading) {
  var dd = due(task.deadline);
  var parts = [dd.text];
  if (nextOf[task.id]) parts.push('Next: ' + nextOf[task.id]);
  return {
    id: 't:' + task.id,
    targetId: task.id,
    isRoutine: false,
    heading: heading,
    time: '',
    hasTime: false,
    title: String(task.title || ''),
    meta: parts.join(' · '),
    hasMeta: true,
    metaColor: dd.late ? LATE : QUIET,
    bg: task.id === sel ? 'var(--surface)' : 'transparent'
  };
}
for (var o = 0; o < overdue.length; o++) add(taskRow(overdue[o], 'Overdue'));
var todayHeading = doneToday > 0 ? 'Today · ' + doneToday + ' done' : 'Today';
for (var q = 0; q < slots.length; q++) {
  var sl = slots[q];
  var late = sl.time < nowTime;
  add({
    id: 'r:' + sl.routine.id + '|' + todayIso + '|' + sl.time,
    targetId: sl.routine.id,
    isRoutine: true,
    heading: todayHeading,
    time: sl.time,
    hasTime: true,
    title: String(sl.routine.title || ''),
    meta: late ? 'Not done yet' : '',
    hasMeta: late,
    metaColor: LATE,
    bg: sl.routine.id === sel ? 'var(--surface)' : 'transparent',
    routineId: sl.routine.id,
    date: todayIso
  });
}
for (var u = 0; u < dueNow.length; u++) add(taskRow(dueNow[u], 'Due today'));
for (var v = 0; v < soon.length; v++) add(taskRow(soon[v], 'Next 7 days'));

// Everything that repeats: current ones first (by title), finished ones after.
function state(ro) {
  var start = schedDate(ro.startDate), end = schedDate(ro.endDate);
  if (ro.status === 'stopped') {
    var at = when(ro.stoppedAt);
    return { finished: true, text: 'Stopped' + (at ? ' ' + fmtDay(at) : '') };
  }
  if (end && end < today) return { finished: true, text: 'Ended ' + fmtDay(end) };
  if (start && start > today) return { finished: false, text: 'Starts ' + fmtDay(start) + (end ? ', until ' + fmtDay(end) : '') };
  return { finished: false, text: end ? 'Until ' + fmtDay(end) : '' };
}
var current = [], finished = [];
for (var w = 0; w < routines.length; w++) {
  var rt = routines[w];
  if (!rt) continue;
  var st = state(rt);
  var line = schedDescribe(rt) + (st.text ? ' · ' + st.text : '');
  (st.finished ? finished : current).push({
    id: rt.id,
    title: String(rt.title || ''),
    titleColor: st.finished ? QUIET : 'var(--foreground)',
    meta: line,
    bg: rt.id === sel ? 'var(--surface)' : 'transparent'
  });
}
function byTitle(x, y) { return x.title.localeCompare(y.title); }
current.sort(byTitle);
finished.sort(byTitle);

Outputs.rows = rows;
Outputs.routineRows = current.concat(finished);
Outputs.todayLabel = 'Today (' + (overdue.length + slots.length + dueNow.length) + ')';`;

const TODAY_ROWS_OUTS: Array<[string, string]> = [['rows', 'array'], ['routineRows', 'array'], ['todayLabel', 'string']];
const TODAY_ROWS_INS: Array<[string, string]> = [
  ['tasks', 'array'], ['actions', 'array'], ['routines', 'array'], ['checks', 'array'], ['selectedId', 'string'], ['now', 'number']
];

const TODAY_ROWS: Tpl008Component = {
  path: 'Logic/Today rows',
  description:
    'Turns the tasks, next actions, things that repeat and their ticks into Today (overdue, what repeats today by time, due today, next 7 days), the list of everything that repeats, and the Today tab’s count.',
  ...iface(TODAY_ROWS_INS, TODAY_ROWS_OUTS),
  nodes: [
    inputs('ywIn', 'The records', TODAY_ROWS_INS),
    outputs('ywOut', 'The rows', TODAY_ROWS_OUTS),
    derive('ywBuild', 'Build Today', TODAY_ROWS_SCRIPT)
  ],
  connections: [
    ...TODAY_ROWS_INS.map(([n]) => wire('ywIn', n, 'ywBuild', `in-${n}`)),
    ...TODAY_ROWS_OUTS.map(([n]) => wire('ywBuild', `out-${n}`, 'ywOut', n))
  ]
};

/** How far back a routine's history looks for occurrences nobody ticked (RC4). */
export const MISSED_DAYS = 30;

/**
 * TPL-008-RC — everything the detail pane shows about the selected routine. The history is its
 * `Event` lines (added, schedule, done, notes…) **and, derived here, every occurrence of the last
 * {@link MISSED_DAYS} days that nobody ticked**, read *Missed* (RC4). A missed one is never
 * written: nobody is there to write it, and today's are not missed until today is over.
 */
export const SELECTED_ROUTINE_SCRIPT =
  DATE_FNS +
  SCHEDULE_FNS +
  String.raw`var routines = Inputs.routines || [];
var checks = Inputs.checks || [];
var events = Inputs.events || [];
var sel = String(Inputs.selectedId || '');
var r = null;
for (var i = 0; i < routines.length; i++) if (routines[i] && routines[i].id === sel) r = routines[i];
if (!r) {
  Outputs.found = false;
  return;
}
var now = new Date(Number(Inputs.now) || Date.now());
var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
var cadence = r.cadence === 'weekly' || r.cadence === 'monthly' ? r.cadence : 'daily';
var slots = schedSlots(cadence, r.slots);
var start = schedDate(r.startDate), end = schedDate(r.endDate);
var stopped = r.status === 'stopped';

Outputs.found = true;
Outputs.title = String(r.title || '');
Outputs.cadence = cadence;
Outputs.scheduleLine = schedDescribe({ cadence: cadence, slots: r.slots });
var status, late = false;
if (stopped) {
  var sat = when(r.stoppedAt);
  status = 'Stopped' + (sat ? ' ' + fmtDay(sat) : '');
} else if (end && end < today) status = 'Ended ' + fmtDay(end);
else if (start && start > today) status = 'Starts ' + fmtDay(start) + (end ? ' · ends ' + fmtDay(end) : '');
else status = (start ? 'Since ' + fmtDay(start) : 'Running') + (end ? ' · ends ' + fmtDay(end) : ' · no end date');
if (!stopped && slots.length === 0) {
  status += ' · add a time for it to come up';
  late = true;
}
Outputs.statusLine = status;
Outputs.statusColor = late ? 'var(--destructive)' : 'var(--muted-foreground)';

var slotRows = [];
for (var s = 0; s < slots.length; s++) slotRows.push({ id: slots[s].key, label: schedSlotLabel(cadence, slots[s]) });
Outputs.slotRows = slotRows;
Outputs.noSlots = slotRows.length === 0;

var picked = {};
var dayList = String(Inputs.days || '').split(',');
for (var p = 0; p < dayList.length; p++) if (dayList[p]) picked[dayList[p]] = true;
function chip(key, label) {
  var on = !!picked[key];
  return {
    id: key,
    label: label,
    bg: on ? 'var(--primary)' : 'transparent',
    color: on ? 'var(--primary-foreground)' : 'var(--foreground)',
    border: on ? 'var(--primary)' : 'var(--border-control)'
  };
}
var chips = [];
if (cadence === 'weekly') for (var w = 0; w < SCHED_WEEK.length; w++) chips.push(chip(SCHED_WEEK[w], SCHED_NAMES[SCHED_WEEK[w]]));
if (cadence === 'monthly') {
  for (var m = 1; m <= 31; m++) chips.push(chip(String(m), String(m)));
  chips.push(chip('last', 'Last'));
}
Outputs.dayChips = chips;
Outputs.showDays = chips.length > 0;
Outputs.addHint =
  cadence === 'weekly'
    ? 'Pick the days, then add a time: it goes on every day picked.'
    : cadence === 'monthly'
      ? 'Pick the days of the month, then add a time. A 31st in a shorter month is its last day.'
      : 'Add a time. Add another for twice a day.';
Outputs.startDate = String(r.startDate || '');
Outputs.endDate = String(r.endDate || '');
Outputs.canStop = !stopped && !(end && end < today);
Outputs.isStopped = stopped;
Outputs.stopNote = String(r.stopNote || '');

// History: its lines, and the occurrences of the last days that nobody ticked.
var lines = [];
for (var e = 0; e < events.length; e++) {
  var ev = events[e];
  if (!ev || ev.taskId !== sel) continue;
  var at = when(ev.at);
  var body = String(ev.body || '');
  lines.push({
    id: ev.id,
    at: at ? at.getTime() : 0,
    line: (at ? dayLabel(at) + ' ' + fmtTime(at) + ' · ' : '') + String(ev.summary || ''),
    body: body,
    hasBody: body !== ''
  });
}
var ticked = {};
for (var c = 0; c < checks.length; c++) if (checks[c] && checks[c].routineId === sel) ticked[checks[c].date + '|' + checks[c].time] = true;
var from = new Date(today.getTime());
from.setDate(from.getDate() - ${MISSED_DAYS});
var made = when(r.createdAt);
if (made) {
  made = new Date(made.getFullYear(), made.getMonth(), made.getDate());
  if (made > from) from = made;
}
for (var day = new Date(from.getTime()); day < today; day.setDate(day.getDate() + 1)) {
  var times = schedOn(r, day);
  var iso = schedIso(day);
  for (var t = 0; t < times.length; t++) {
    if (ticked[iso + '|' + times[t]]) continue;
    var hm = times[t].split(':');
    var occ = new Date(day.getFullYear(), day.getMonth(), day.getDate(), Number(hm[0]), Number(hm[1]));
    lines.push({ id: 'missed-' + iso + '-' + times[t], at: occ.getTime(), line: dayLabel(occ) + ' ' + times[t] + ' · Missed', body: '', hasBody: false });
  }
}
lines.sort(function (x, y) { return y.at - x.at; });
var historyRows = [];
for (var h = 0; h < lines.length; h++) historyRows.push({ id: lines[h].id, line: lines[h].line, body: lines[h].body, hasBody: lines[h].hasBody });
Outputs.historyRows = historyRows;`;

const SELECTED_ROUTINE_OUTS: Array<[string, string]> = [
  ['found', 'boolean'],
  ['title', 'string'],
  ['cadence', 'string'],
  ['scheduleLine', 'string'],
  ['statusLine', 'string'],
  ['statusColor', 'string'],
  ['slotRows', 'array'],
  ['noSlots', 'boolean'],
  ['dayChips', 'array'],
  ['showDays', 'boolean'],
  ['addHint', 'string'],
  ['startDate', 'string'],
  ['endDate', 'string'],
  ['canStop', 'boolean'],
  ['isStopped', 'boolean'],
  ['stopNote', 'string'],
  ['historyRows', 'array']
];
const SELECTED_ROUTINE_INS: Array<[string, string]> = [
  ['routines', 'array'], ['checks', 'array'], ['events', 'array'], ['selectedId', 'string'], ['days', 'string'], ['now', 'number']
];

const SELECTED_ROUTINE: Tpl008Component = {
  path: 'Logic/Selected routine',
  description:
    'Everything the detail pane shows about the selected thing that repeats: title, how often, its times, the days to pick, its dates, whether it can be stopped, and its history — with every occurrence of the last 30 days nobody ticked, read Missed.',
  ...iface(SELECTED_ROUTINE_INS, SELECTED_ROUTINE_OUTS),
  nodes: [
    inputs('srIn', 'The records', SELECTED_ROUTINE_INS),
    outputs('srOut', 'The selected thing that repeats', SELECTED_ROUTINE_OUTS),
    derive('srBuild', 'Read the selected thing that repeats', SELECTED_ROUTINE_SCRIPT)
  ],
  connections: [
    ...SELECTED_ROUTINE_INS.map(([n]) => wire('srIn', n, 'srBuild', `in-${n}`)),
    ...SELECTED_ROUTINE_OUTS.map(([n]) => wire('srBuild', `out-${n}`, 'srOut', n))
  ]
};

/**
 * TPL-008-RC — the page's clock. **NodeGX has no ticker** (a `Timer` fires once), so a Function
 * with nothing wired into it — which the runtime runs once when the page loads — starts one: `now`
 * every minute (a slot turns red when its time passes, Today turns over at midnight), and `wake`
 * when the tab or the installed app comes back into view, so a phone left on Today all night
 * reloads the list in the morning. 🔴 Its two outputs are declared on the node: the runtime makes
 * `Outputs.wake` callable only for a port the saved node says is a signal (see `datePicker.ts`).
 */
export const CLOCK_SCRIPT = `if (this.clockStarted) return;
this.clockStarted = true;
function tick() {
  try { Outputs.now = Date.now(); } catch (e) {}
}
tick();
setInterval(tick, 60000);
try {
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible') return;
    tick();
    try { Outputs.wake(); } catch (e) {}
  });
} catch (e) {}`;

/**
 * TPL-008-RC RC5 — a reminder opens Today: the host's push says `/?view=today`, and this is read
 * once the page knows who you are (like `?task=`, TPL-010-L L5).
 */
export const VIEW_LINK_SCRIPT = `var m = /[?&]view=([^&#]*)/.exec((window.location && window.location.search) || '');
if (m && m[1] === 'today') Outputs.today();`;

/** Kinds that extend the previous line instead of adding one, when repeated within two minutes. */
export const MERGING_KINDS = ['moved', 'action-moved', 'deadline', 'action-described', 'schedule', 'routine-dates'] as const;
export const MERGE_WINDOW_MS = 120000;

export const DECIDE_HISTORY_SCRIPT = `var MERGE = ${JSON.stringify(MERGING_KINDS)};
var last = Inputs.last || {};
var now = Date.now();
var kind = String(Inputs.kind || '');
var key = kind + '|' + String(Inputs.taskId || '') + '|' + String(Inputs.mergeKey || '');
var merge = MERGE.indexOf(kind) >= 0 && last.key === key && !!last.id && now - last.at < ${MERGE_WINDOW_MS};
var from = merge && kind === 'moved' ? last.from : Inputs.from;
var summary = String(Inputs.summary || '');
if (kind === 'moved') summary = from === Inputs.to ? 'Moved back to #' + Inputs.to : 'Moved #' + from + ' → #' + Inputs.to;
Outputs.summary = summary;
Outputs.body = String(Inputs.body || '');
Outputs.at = new Date(now).toISOString();
Outputs.mergeId = merge ? last.id : '';
// A fresh object every run: Outputs publish only on change.
Outputs.pending = { key: key, at: now, from: from };
if (merge) Outputs.update(); else Outputs.create();`;

export const REMEMBER_HISTORY_SCRIPT = 'var p = Inputs.pending || {};\nOutputs.value = { key: p.key, at: p.at, from: p.from, id: Inputs.id };\nOutputs.go();';

const WRITE_HISTORY_INS: Array<[string, string]> = [
  ['taskId', 'string'],
  ['kind', 'string'],
  ['summary', 'string'],
  ['body', 'string'],
  ['from', 'number'],
  ['to', 'number'],
  ['mergeKey', 'string'],
  ['do', 'signal']
];

const WRITE_HISTORY: Tpl008Component = {
  path: 'Logic/Write history',
  description:
    'Writes one line of a task’s history to Event, and is the only thing that does. A move, deadline or description change repeated within two minutes extends the previous line instead of adding another.',
  ...iface(WRITE_HISTORY_INS, [['done', 'signal']]),
  nodes: [
    inputs('whIn', 'The line', WRITE_HISTORY_INS),
    outputs('whOut', 'Written', [['done', 'signal']]),
    // 🔴 GAM-005 warns on a Variable in a component drawn more than once — every command
    // places this one. Both names here are app-wide on purpose, and the comment says why.
    { ...(logic('whLast', VARIABLE, 'The last line written', { name: VAR.lastHistory }) as object), comment: SHARED_LAST_LINE },
    script('whDecide', 'A new line, or extend the last one?', DECIDE_HISTORY_SCRIPT, ['taskId', 'kind', 'summary', 'body', 'from', 'to', 'mergeKey', 'last']),
    logic('whCreate', CREATE, 'Add the line', { collectionName: 'Event' }),
    logic('whUpdate', UPDATE, 'Extend the last line', { collectionName: 'Event', idSource: 'explicit' }),
    script('whRemember', 'Remember it, to extend next time', REMEMBER_HISTORY_SCRIPT, ['pending', 'id']),
    logic('whSet', SET_VARIABLE, 'Keep the last line', { name: VAR.lastHistory, setWith: 'object' }),
    { ...(logic('whProblem', SET_VARIABLE, 'Say it did not save', { name: VAR.problem, setWith: 'string', value: PROBLEM_TEXT }) as object), comment: SHARED_PROBLEM }
  ],
  connections: [
    wire('whIn', 'taskId', 'whDecide', 'in-taskId'),
    wire('whIn', 'kind', 'whDecide', 'in-kind'),
    wire('whIn', 'summary', 'whDecide', 'in-summary'),
    wire('whIn', 'body', 'whDecide', 'in-body'),
    wire('whIn', 'from', 'whDecide', 'in-from'),
    wire('whIn', 'to', 'whDecide', 'in-to'),
    wire('whIn', 'mergeKey', 'whDecide', 'in-mergeKey'),
    wire('whLast', 'value', 'whDecide', 'in-last'),
    wire('whIn', 'do', 'whDecide', 'run'),
    wire('whIn', 'taskId', 'whCreate', 'prop-taskId'),
    wire('whIn', 'kind', 'whCreate', 'prop-kind'),
    wire('whDecide', 'out-summary', 'whCreate', 'prop-summary'),
    wire('whDecide', 'out-body', 'whCreate', 'prop-body'),
    wire('whDecide', 'out-at', 'whCreate', 'prop-at'),
    wire('whDecide', 'out-create', 'whCreate', 'store'),
    wire('whDecide', 'out-mergeId', 'whUpdate', 'modelId'),
    wire('whDecide', 'out-summary', 'whUpdate', 'prop-summary'),
    wire('whDecide', 'out-at', 'whUpdate', 'prop-at'),
    wire('whDecide', 'out-update', 'whUpdate', 'store'),
    wire('whDecide', 'out-pending', 'whRemember', 'in-pending'),
    wire('whCreate', 'id', 'whRemember', 'in-id'),
    wire('whUpdate', 'id', 'whRemember', 'in-id'),
    wire('whCreate', 'done', 'whRemember', 'run'),
    wire('whUpdate', 'done', 'whRemember', 'run'),
    wire('whRemember', 'out-value', 'whSet', 'value'),
    wire('whRemember', 'out-go', 'whSet', 'do'),
    wire('whSet', 'done', 'whOut', 'done'),
    wire('whCreate', 'failure', 'whProblem', 'do'),
    wire('whUpdate', 'failure', 'whProblem', 'do')
  ]
};

// ════════════════════════════════════════════════════════════════════════════
// Commands/ — one component for each thing a person can do
// ════════════════════════════════════════════════════════════════════════════

interface CommandSpec {
  path: string;
  description: string;
  ins: Array<[string, string]>;
  extraOuts?: Array<[string, string]>;
  /** The guard/prepare script. Pulses `go` when there is something to write. */
  guard: string;
  guardIns: string[];
  /**
   * Script inputs wired from somewhere other than this component's own inputs.
   * 🔴 They still need Run On Value Change OFF: a connected `run` does NOT stop a
   * value change from running the script (measured — see TPL-008 §7, P78 D71).
   */
  quietIns?: string[];
  /** Nodes between the guard and the history write, and their wires. */
  body: (p: string) => { nodes: unknown[]; connections: unknown[]; historyDo: Array<[string, string]>; failures: Array<[string, string]> };
  /** The history line: its kind, and where each of its inputs comes from. */
  history: { kind: string; taskId: [string, string]; summary?: [string, string]; body?: [string, string]; from?: [string, string]; to?: [string, string]; mergeKey?: [string, string] };
  extraWires?: (p: string) => unknown[];
}

function command(spec: CommandSpec): Tpl008Component {
  const p = spec.path.split('/')[1].replace(/[^A-Za-z]/g, '').slice(0, 10);
  const ins: Array<[string, string]> = [...spec.ins, ['do', 'signal']];
  const outs: Array<[string, string]> = [['done', 'signal'], ...(spec.extraOuts ?? [])];
  const built = spec.body(p);
  const h = spec.history;
  const historyWires: unknown[] = [
    wire(h.taskId[0], h.taskId[1], `${p}History`, 'taskId'),
    ...(h.summary ? [wire(h.summary[0], h.summary[1], `${p}History`, 'summary')] : []),
    ...(h.body ? [wire(h.body[0], h.body[1], `${p}History`, 'body')] : []),
    ...(h.from ? [wire(h.from[0], h.from[1], `${p}History`, 'from')] : []),
    ...(h.to ? [wire(h.to[0], h.to[1], `${p}History`, 'to')] : []),
    ...(h.mergeKey ? [wire(h.mergeKey[0], h.mergeKey[1], `${p}History`, 'mergeKey')] : []),
    ...built.historyDo.map(([id, portName]) => wire(id, portName, `${p}History`, 'do'))
  ];
  return {
    path: spec.path,
    description: spec.description,
    ...iface(ins, outs),
    instantiates: [C.writeHistory],
    nodes: [
      inputs(`${p}In`, 'What to do', ins),
      outputs(`${p}Out`, 'Done', outs),
      script(`${p}Guard`, 'Is there anything to write?', spec.guard, [...spec.guardIns, ...(spec.quietIns ?? [])]),
      ...built.nodes,
      logic(`${p}History`, C.writeHistory, 'Write the history line', { kind: h.kind }),
      { ...(logic(`${p}Problem`, SET_VARIABLE, 'Say it did not save', { name: VAR.problem, setWith: 'string', value: PROBLEM_TEXT }) as object), comment: SHARED_PROBLEM }
    ],
    connections: [
      ...spec.guardIns.map((n) => wire(`${p}In`, n, `${p}Guard`, `in-${n}`)),
      wire(`${p}In`, 'do', `${p}Guard`, 'run'),
      ...built.connections,
      ...historyWires,
      wire(`${p}History`, 'done', `${p}Out`, 'done'),
      ...built.failures.map(([id, portName]) => wire(id, portName, `${p}Problem`, 'do')),
      ...(spec.extraWires ? spec.extraWires(p) : [])
    ]
  };
}

/** One record write fed by named guard outputs. */
function writeNode(
  p: string,
  suffix: string,
  type: string,
  collection: string,
  label: string,
  props: Array<[string, string]>,
  idFrom?: [string, string]
): { nodes: unknown[]; connections: unknown[] } {
  const id = `${p}${suffix}`;
  const params: Record<string, unknown> = { collectionName: collection };
  if (type === UPDATE) params.idSource = 'explicit';
  return {
    nodes: [logic(id, type, label, params)],
    connections: [
      ...props.map(([field, from]) => wire(`${p}Guard`, `out-${from}`, id, `prop-${field}`)),
      ...(idFrom ? [wire(idFrom[0], idFrom[1], id, 'modelId')] : [])
    ]
  };
}

const ADD_TASK = command({
  path: 'Commands/Add task',
  description: 'Adds a task at the bottom of the list, and writes "Added at #n" to its history.',
  ins: [['title', 'string'], ['position', 'number'], ['summary', 'string']],
  guard:
    "var t = String(Inputs.title || '').trim();\nif (t === '') return;\nOutputs.title = t;\nOutputs.position = Number(Inputs.position) || 1;\nOutputs.status = 'open';\nOutputs.empty = '';\nOutputs.summary = String(Inputs.summary || '');\nOutputs.go();",
  guardIns: ['title', 'position', 'summary'],
  body: (p) => {
    const w = writeNode(p, 'Create', CREATE, 'Task', 'Add the task', [
      ['title', 'title'],
      ['position', 'position'],
      ['status', 'status'],
      ['deadline', 'empty'],
      ['closingNote', 'empty'],
      ['closedAt', 'empty']
    ]);
    return {
      nodes: w.nodes,
      connections: [...w.connections, wire(`${p}Guard`, 'out-go', `${p}Create`, 'store')],
      historyDo: [[`${p}Create`, 'done']],
      failures: [[`${p}Create`, 'failure']]
    };
  },
  history: { kind: 'created', taskId: ['AddtaskCreate', 'id'], summary: ['AddtaskGuard', 'out-summary'] }
});

export const MOVE_SCRIPT = `var rows = Inputs.rows || [];
var id = String(Inputs.itemId || '');
var dir = String(Inputs.direction || '');
var i = -1;
for (var k = 0; k < rows.length; k++) if (rows[k] && rows[k].id === id) i = k;
if (i < 0) return;
var j = dir === 'up' ? i - 1 : dir === 'down' ? i + 1 : dir === 'to' ? Math.round(Number(Inputs.toIndex)) : 0;
if (!(j >= 0) || j >= rows.length || j === i) return;
Outputs.firstId = id;
Outputs.from = i + 1;
Outputs.to = j + 1;
function at(n) { return Number(rows[n].position); }
if (dir === 'top') {
  // Above whatever is first now. Nobody else's row is rewritten.
  Outputs.firstPosition = at(0) - 1;
  Outputs.hasSecond = false;
} else if (dir === 'to') {
  // Dropped at j: between its new neighbours, so still nobody else's row is rewritten.
  if (j === 0) Outputs.firstPosition = at(0) - 1;
  else if (j === rows.length - 1) Outputs.firstPosition = at(rows.length - 1) + 1;
  else if (j < i) Outputs.firstPosition = (at(j - 1) + at(j)) / 2;
  else Outputs.firstPosition = (at(j) + at(j + 1)) / 2;
  Outputs.hasSecond = false;
} else {
  // Swap with the neighbour.
  Outputs.firstPosition = Number(rows[j].position);
  Outputs.secondId = rows[j].id;
  Outputs.secondPosition = Number(rows[i].position);
  Outputs.hasSecond = true;
}
Outputs.go();`;

function moveCommand(path: string, description: string, collection: string, itemPort: string, kind: string): Tpl008Component {
  const p = path.split('/')[1].replace(/[^A-Za-z]/g, '').slice(0, 10);
  return command({
    path,
    description,
    ins:
      itemPort === 'taskId'
        ? [['rows', 'array'], ['taskId', 'string'], ['direction', 'string'], ['toIndex', 'number']]
        : [['rows', 'array'], ['taskId', 'string'], [itemPort, 'string'], ['direction', 'string'], ['toIndex', 'number']],
    guard: MOVE_SCRIPT,
    // `toIndex` is where a drag dropped it (Direction `to`); it arrives with the drop's signal.
    guardIns: ['rows', 'direction', 'toIndex'],
    // 🔴 The id arrives from a row the moment ANY row is clicked. With its box
    // ticked, opening or closing a task re-ran this script and moved that task —
    // the first drive caught three moves nobody asked for.
    quietIns: ['itemId'],
    body: (q) => ({
      nodes: [
        logic(`${q}First`, UPDATE, 'Move it', { collectionName: collection, idSource: 'explicit' }),
        logic(`${q}Swap`, CONDITION, 'Is there a neighbour to swap with?', signalOnly('condition')),
        logic(`${q}Second`, UPDATE, 'Move the neighbour', { collectionName: collection, idSource: 'explicit' })
      ],
      connections: [
        wire(`${q}In`, itemPort, `${q}Guard`, 'in-itemId'),
        wire(`${q}Guard`, 'out-firstId', `${q}First`, 'modelId'),
        wire(`${q}Guard`, 'out-firstPosition', `${q}First`, 'prop-position'),
        wire(`${q}Guard`, 'out-go', `${q}First`, 'store'),
        wire(`${q}Guard`, 'out-hasSecond', `${q}Swap`, 'condition'),
        wire(`${q}First`, 'done', `${q}Swap`, 'eval'),
        wire(`${q}Guard`, 'out-secondId', `${q}Second`, 'modelId'),
        wire(`${q}Guard`, 'out-secondPosition', `${q}Second`, 'prop-position'),
        wire(`${q}Swap`, 'ontrue', `${q}Second`, 'store')
      ],
      historyDo: [[`${q}Swap`, 'onfalse'], [`${q}Second`, 'done']],
      failures: [[`${q}First`, 'failure'], [`${q}Second`, 'failure']]
    }),
    history:
      kind === 'moved'
        ? { kind, taskId: [`${p}In`, 'taskId'], from: [`${p}Guard`, 'out-from'], to: [`${p}Guard`, 'out-to'] }
        : { kind, taskId: [`${p}In`, 'taskId'], summary: [`${p}Guard`, 'out-summary'] },
    extraWires: kind === 'moved' ? undefined : () => []
  });
}

const MOVE_TASK = moveCommand(
  'Commands/Move task',
  'Moves a task: to where it was dropped (Direction `to`, with To Index from 0), up or down one place (swapping with its neighbour), or to the top. Place it with Direction set to to, up, down or top.',
  'Task',
  'taskId',
  'moved'
);

/** A next action's move writes one fixed sentence, so the script says it. */
const MOVE_ACTION_BASE = moveCommand(
  'Commands/Move action',
  'Moves a next action: to where it was dropped (Direction `to`, with To Index from 0 among the open ones), or up or down one place. Place it with Direction set to to, up or down.',
  'Action',
  'actionId',
  'action-moved'
);
const MOVE_ACTION: Tpl008Component = {
  ...MOVE_ACTION_BASE,
  nodes: MOVE_ACTION_BASE.nodes.map((n) => {
    const node = n as { id: string; parameters?: Record<string, unknown> };
    if (node.id !== 'MoveactionGuard') return n;
    return {
      ...node,
      parameters: {
        ...node.parameters,
        functionScript: MOVE_SCRIPT.replace('Outputs.go();', "Outputs.summary = 'Next actions reordered';\nOutputs.go();")
      }
    };
  })
};

const CLOSE_TASK = command({
  path: 'Commands/Close task',
  description: 'Closes a task with a note saying what happened. Without a note it does nothing.',
  ins: [['rows', 'array'], ['taskId', 'string'], ['note', 'string']],
  guard: `var rows = Inputs.rows || [];
var id = String(Inputs.taskId || '');
var note = String(Inputs.note || '').trim();
if (id === '' || note === '') return;
var rank = 0;
for (var k = 0; k < rows.length; k++) if (rows[k] && rows[k].id === id) rank = k + 1;
Outputs.status = 'done';
Outputs.note = note;
Outputs.at = new Date().toISOString();
Outputs.summary = rank > 0 ? 'Closed from #' + rank : 'Closed';
Outputs.go();`,
  guardIns: ['rows', 'taskId', 'note'],
  body: (p) => {
    const w = writeNode(p, 'Write', UPDATE, 'Task', 'Close the task', [['status', 'status'], ['closingNote', 'note'], ['closedAt', 'at']], [`${p}In`, 'taskId']);
    return {
      nodes: w.nodes,
      connections: [...w.connections, wire(`${p}Guard`, 'out-go', `${p}Write`, 'store')],
      historyDo: [[`${p}Write`, 'done']],
      failures: [[`${p}Write`, 'failure']]
    };
  },
  history: { kind: 'closed', taskId: ['ClosetaskIn', 'taskId'], summary: ['ClosetaskGuard', 'out-summary'], body: ['ClosetaskGuard', 'out-note'] }
});

const REOPEN_TASK = command({
  path: 'Commands/Reopen task',
  description: 'Puts a closed task back at the bottom of the list, with a note saying why.',
  ins: [['taskId', 'string'], ['note', 'string'], ['position', 'number'], ['rank', 'number']],
  guard: `var id = String(Inputs.taskId || '');
var note = String(Inputs.note || '').trim();
if (id === '' || note === '') return;
Outputs.status = 'open';
Outputs.position = Number(Inputs.position) || 1;
Outputs.empty = '';
Outputs.note = note;
Outputs.summary = 'Reopened at #' + (Number(Inputs.rank) || 1);
Outputs.go();`,
  guardIns: ['taskId', 'note', 'position', 'rank'],
  body: (p) => {
    const w = writeNode(
      p,
      'Write',
      UPDATE,
      'Task',
      'Reopen the task',
      [['status', 'status'], ['position', 'position'], ['closingNote', 'empty'], ['closedAt', 'empty']],
      [`${p}In`, 'taskId']
    );
    return {
      nodes: w.nodes,
      connections: [...w.connections, wire(`${p}Guard`, 'out-go', `${p}Write`, 'store')],
      historyDo: [[`${p}Write`, 'done']],
      failures: [[`${p}Write`, 'failure']]
    };
  },
  history: { kind: 'reopened', taskId: ['ReopentaskIn', 'taskId'], summary: ['ReopentaskGuard', 'out-summary'], body: ['ReopentaskGuard', 'out-note'] }
});

const RENAME_TASK = command({
  path: 'Commands/Rename task',
  description: 'Renames a task, if the new title is different and not empty.',
  ins: [['taskId', 'string'], ['oldTitle', 'string'], ['newTitle', 'string']],
  guard: `var id = String(Inputs.taskId || '');
var old = String(Inputs.oldTitle || '');
var t = String(Inputs.newTitle || '').trim();
if (id === '' || t === '' || t === old) return;
Outputs.title = t;
Outputs.summary = 'Renamed from “' + old + '”';
Outputs.go();`,
  guardIns: ['taskId', 'oldTitle', 'newTitle'],
  body: (p) => {
    const w = writeNode(p, 'Write', UPDATE, 'Task', 'Rename the task', [['title', 'title']], [`${p}In`, 'taskId']);
    return {
      nodes: w.nodes,
      connections: [...w.connections, wire(`${p}Guard`, 'out-go', `${p}Write`, 'store')],
      historyDo: [[`${p}Write`, 'done']],
      failures: [[`${p}Write`, 'failure']]
    };
  },
  history: { kind: 'renamed', taskId: ['RenametaskIn', 'taskId'], summary: ['RenametaskGuard', 'out-summary'] }
});

export const DEADLINE_SCRIPT =
  DATE_FNS +
  String.raw`var raw = String(Inputs.text || '').trim().toLowerCase();
var current = String(Inputs.current || '');
function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
var value = null;
if (raw === '') value = '';
else if (raw === 'today' || raw === 'tomorrow') {
  var d = new Date();
  if (raw === 'tomorrow') d.setDate(d.getDate() + 1);
  value = iso(d);
} else {
  var m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(raw);
  if (m) {
    var y = Number(m[1]), mo = Number(m[2]), da = Number(m[3]);
    var dt = new Date(y, mo - 1, da);
    if (dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === da) value = iso(dt);
  }
}
if (value === null) {
  Outputs.error = 'Use a date like 2026-09-30, or leave it empty.';
  Outputs.hasError = true;
  return;
}
Outputs.error = '';
Outputs.hasError = false;
if (String(Inputs.taskId || '') === '' || value === current) return;
Outputs.value = value;
Outputs.summary = value === '' ? 'Deadline cleared' : 'Deadline set to ' + fmtDay(toDay(value));
Outputs.go();`;

const SET_DEADLINE = command({
  path: 'Commands/Set deadline',
  description: 'Sets or clears a task’s deadline from the date picker (YYYY-MM-DD; "today" and "tomorrow" also work). Anything else is refused with a sentence saying so.',
  ins: [['taskId', 'string'], ['text', 'string'], ['current', 'string']],
  extraOuts: [['error', 'string'], ['hasError', 'boolean']],
  guard: DEADLINE_SCRIPT,
  guardIns: ['taskId', 'text', 'current'],
  body: (p) => {
    const w = writeNode(p, 'Write', UPDATE, 'Task', 'Set the deadline', [['deadline', 'value']], [`${p}In`, 'taskId']);
    return {
      nodes: w.nodes,
      connections: [...w.connections, wire(`${p}Guard`, 'out-go', `${p}Write`, 'store')],
      historyDo: [[`${p}Write`, 'done']],
      failures: [[`${p}Write`, 'failure']]
    };
  },
  history: { kind: 'deadline', taskId: ['SetdeadlinIn', 'taskId'], summary: ['SetdeadlinGuard', 'out-summary'] },
  extraWires: (p) => [wire(`${p}Guard`, 'out-error', `${p}Out`, 'error'), wire(`${p}Guard`, 'out-hasError', `${p}Out`, 'hasError')]
});

const ADD_ACTION = command({
  path: 'Commands/Add action',
  description: 'Adds a next action at the bottom of a task’s next actions.',
  ins: [['taskId', 'string'], ['title', 'string'], ['position', 'number']],
  guard: `var id = String(Inputs.taskId || '');
var t = String(Inputs.title || '').trim();
if (id === '' || t === '') return;
Outputs.taskId = id;
Outputs.title = t;
Outputs.position = Number(Inputs.position) || 1;
Outputs.done = false;
Outputs.empty = '';
Outputs.summary = 'Next action added: “' + t + '”';
Outputs.go();`,
  guardIns: ['taskId', 'title', 'position'],
  body: (p) => {
    const w = writeNode(p, 'Create', CREATE, 'Action', 'Add the next action', [
      ['taskId', 'taskId'],
      ['title', 'title'],
      ['position', 'position'],
      ['done', 'done'],
      ['note', 'empty'],
      ['description', 'empty']
    ]);
    return {
      nodes: w.nodes,
      connections: [...w.connections, wire(`${p}Guard`, 'out-go', `${p}Create`, 'store')],
      historyDo: [[`${p}Create`, 'done']],
      failures: [[`${p}Create`, 'failure']]
    };
  },
  history: { kind: 'action-added', taskId: ['AddactionIn', 'taskId'], summary: ['AddactionGuard', 'out-summary'] }
});

const TICK_ACTION = command({
  path: 'Commands/Tick action',
  description: 'Ticks off a next action with a note saying what happened.',
  ins: [['rows', 'array'], ['taskId', 'string'], ['actionId', 'string'], ['note', 'string']],
  guard:
    FIND_ROW +
    `var row = findRow(Inputs.rows || [], String(Inputs.actionId || ''));
var note = String(Inputs.note || '').trim();
if (!row || note === '') return;
Outputs.done = true;
Outputs.note = note;
Outputs.summary = 'Ticked off “' + row.title + '”';
Outputs.go();`,
  guardIns: ['rows', 'actionId', 'note'],
  body: (p) => {
    const w = writeNode(p, 'Write', UPDATE, 'Action', 'Tick it off', [['done', 'done'], ['note', 'note']], [`${p}In`, 'actionId']);
    return {
      nodes: w.nodes,
      connections: [...w.connections, wire(`${p}Guard`, 'out-go', `${p}Write`, 'store')],
      historyDo: [[`${p}Write`, 'done']],
      failures: [[`${p}Write`, 'failure']]
    };
  },
  history: { kind: 'action-done', taskId: ['TickactionIn', 'taskId'], summary: ['TickactionGuard', 'out-summary'], body: ['TickactionGuard', 'out-note'] }
});

const UNTICK_ACTION = command({
  path: 'Commands/Untick action',
  description: 'Unticks a next action, with a note saying why, and puts it at the bottom of the open ones.',
  ins: [['rows', 'array'], ['taskId', 'string'], ['actionId', 'string'], ['note', 'string'], ['position', 'number']],
  guard:
    FIND_ROW +
    `var row = findRow(Inputs.rows || [], String(Inputs.actionId || ''));
var note = String(Inputs.note || '').trim();
if (!row || note === '') return;
Outputs.done = false;
Outputs.empty = '';
Outputs.position = Number(Inputs.position) || 1;
Outputs.note = note;
Outputs.summary = 'Unticked “' + row.title + '”';
Outputs.go();`,
  guardIns: ['rows', 'actionId', 'note', 'position'],
  body: (p) => {
    const w = writeNode(p, 'Write', UPDATE, 'Action', 'Untick it', [['done', 'done'], ['note', 'empty'], ['position', 'position']], [`${p}In`, 'actionId']);
    return {
      nodes: w.nodes,
      connections: [...w.connections, wire(`${p}Guard`, 'out-go', `${p}Write`, 'store')],
      historyDo: [[`${p}Write`, 'done']],
      failures: [[`${p}Write`, 'failure']]
    };
  },
  history: { kind: 'action-undone', taskId: ['UntickactiIn', 'taskId'], summary: ['UntickactiGuard', 'out-summary'], body: ['UntickactiGuard', 'out-note'] }
});

const RENAME_ACTION = command({
  path: 'Commands/Rename action',
  description: 'Renames a next action, if the new title is different and not empty.',
  ins: [['rows', 'array'], ['taskId', 'string'], ['actionId', 'string'], ['newTitle', 'string']],
  guard:
    FIND_ROW +
    `var row = findRow(Inputs.rows || [], String(Inputs.actionId || ''));
if (!row) return;
var old = String(row.title || '');
var t = String(Inputs.newTitle || '').trim();
if (t === '' || t === old) return;
Outputs.title = t;
Outputs.summary = 'Next action renamed from \u201c' + old + '\u201d';
Outputs.go();`,
  guardIns: ['rows', 'actionId', 'newTitle'],
  body: (p) => {
    const w = writeNode(p, 'Write', UPDATE, 'Action', 'Rename the next action', [['title', 'title']], [`${p}In`, 'actionId']);
    return {
      nodes: w.nodes,
      connections: [...w.connections, wire(`${p}Guard`, 'out-go', `${p}Write`, 'store')],
      historyDo: [[`${p}Write`, 'done']],
      failures: [[`${p}Write`, 'failure']]
    };
  },
  history: { kind: 'action-renamed', taskId: ['RenameactiIn', 'taskId'], summary: ['RenameactiGuard', 'out-summary'] }
});

const DESCRIBE_ACTION = command({
  path: 'Commands/Describe action',
  description: 'Saves a next action’s description when it changed.',
  ins: [['rows', 'array'], ['taskId', 'string'], ['actionId', 'string'], ['text', 'string']],
  guard:
    FIND_ROW +
    `var row = findRow(Inputs.rows || [], String(Inputs.actionId || ''));
if (!row) return;
var t = String(Inputs.text || '').trim();
if (t === String(row.description || '')) return;
Outputs.description = t;
Outputs.summary = 'Description changed on “' + row.title + '”';
Outputs.go();`,
  guardIns: ['rows', 'actionId', 'text'],
  body: (p) => {
    const w = writeNode(p, 'Write', UPDATE, 'Action', 'Save the description', [['description', 'description']], [`${p}In`, 'actionId']);
    return {
      nodes: w.nodes,
      connections: [...w.connections, wire(`${p}Guard`, 'out-go', `${p}Write`, 'store')],
      historyDo: [[`${p}Write`, 'done']],
      failures: [[`${p}Write`, 'failure']]
    };
  },
  history: {
    kind: 'action-described',
    taskId: ['DescribeacIn', 'taskId'],
    summary: ['DescribeacGuard', 'out-summary'],
    mergeKey: ['DescribeacIn', 'actionId']
  }
});

const ADD_NOTE = command({
  path: 'Commands/Add note',
  description: 'Adds a note to a task’s history. A note is only ever added, never edited.',
  ins: [['taskId', 'string'], ['text', 'string']],
  guard: "var id = String(Inputs.taskId || '');\nvar t = String(Inputs.text || '').trim();\nif (id === '' || t === '') return;\nOutputs.body = t;\nOutputs.summary = 'Note';\nOutputs.go();",
  guardIns: ['taskId', 'text'],
  body: (p) => ({ nodes: [], connections: [], historyDo: [[`${p}Guard`, 'out-go']], failures: [] }),
  history: { kind: 'note', taskId: ['AddnoteIn', 'taskId'], summary: ['AddnoteGuard', 'out-summary'], body: ['AddnoteGuard', 'out-body'] }
});

// ── TPL-008-RC — things that repeat ─────────────────────────────────────────

/** A new thing that repeats starts every day at 09:00 from today: open it to give it its own times. */
export const NEW_ROUTINE_SLOTS = '09:00';

const ADD_ROUTINE = command({
  path: 'Commands/Add routine',
  description: 'Adds something that repeats — every day at 09:00 from today until it is given its own times — and writes "Added" to its history. Id is the new one, so the page can open it.',
  ins: [['title', 'string']],
  extraOuts: [['id', 'string']],
  guard:
    SCHEDULE_FNS +
    `var t = String(Inputs.title || '').trim();
if (t === '') return;
Outputs.title = t;
Outputs.cadence = 'daily';
Outputs.slots = ${JSON.stringify(NEW_ROUTINE_SLOTS)};
Outputs.startDate = schedIso(new Date());
Outputs.status = 'active';
Outputs.empty = '';
Outputs.summary = 'Added: ' + schedDescribe({ cadence: 'daily', slots: ${JSON.stringify(NEW_ROUTINE_SLOTS)} }).toLowerCase();
Outputs.go();`,
  guardIns: ['title'],
  body: (p) => {
    const w = writeNode(p, 'Create', CREATE, 'Routine', 'Add the thing that repeats', [
      ['title', 'title'],
      ['cadence', 'cadence'],
      ['slots', 'slots'],
      ['startDate', 'startDate'],
      ['endDate', 'empty'],
      ['status', 'status'],
      ['stoppedAt', 'empty'],
      ['stopNote', 'empty']
    ]);
    return {
      nodes: w.nodes,
      connections: [...w.connections, wire(`${p}Guard`, 'out-go', `${p}Create`, 'store')],
      historyDo: [[`${p}Create`, 'done']],
      failures: [[`${p}Create`, 'failure']]
    };
  },
  history: { kind: 'routine-added', taskId: ['AddroutineCreate', 'id'], summary: ['AddroutineGuard', 'out-summary'] },
  extraWires: (p) => [wire(`${p}Create`, 'id', `${p}Out`, 'id')]
});

const RENAME_ROUTINE = command({
  path: 'Commands/Rename routine',
  description: 'Renames something that repeats, if the new title is different and not empty.',
  ins: [['routines', 'array'], ['routineId', 'string'], ['newTitle', 'string']],
  guard:
    FIND_ROW +
    `var row = findRow(Inputs.routines || [], String(Inputs.routineId || ''));
if (!row) return;
var old = String(row.title || '');
var t = String(Inputs.newTitle || '').trim();
if (t === '' || t === old) return;
Outputs.title = t;
Outputs.summary = 'Renamed from “' + old + '”';
Outputs.go();`,
  guardIns: ['routines', 'routineId', 'newTitle'],
  body: (p) => {
    const w = writeNode(p, 'Write', UPDATE, 'Routine', 'Rename it', [['title', 'title']], [`${p}In`, 'routineId']);
    return {
      nodes: w.nodes,
      connections: [...w.connections, wire(`${p}Guard`, 'out-go', `${p}Write`, 'store')],
      historyDo: [[`${p}Write`, 'done']],
      failures: [[`${p}Write`, 'failure']]
    };
  },
  history: { kind: 'routine-renamed', taskId: ['RenameroutIn', 'routineId'], summary: ['RenameroutGuard', 'out-summary'] }
});

/**
 * RC6. **One command, placed five times** — Change set to `daily`, `weekly`, `monthly`, `add` or
 * `remove` (a direction is an instance parameter, never a value on a wire — TPL-005). Changing the
 * timescale keeps the times and puts them on today's weekday or date; `add` puts the typed time
 * on every day picked; `remove` takes one out. A burst of changes within two minutes is one
 * history line ("Schedule: every Tue and Thu at 09:00"), like a burst of moves (R5).
 */
export const SET_SCHEDULE_SCRIPT =
  SCHEDULE_FNS +
  FIND_ROW +
  String.raw`var row = findRow(Inputs.routines || [], String(Inputs.routineId || ''));
if (!row) return;
var change = String(Inputs.change || '');
var cadence = row.cadence === 'weekly' || row.cadence === 'monthly' ? row.cadence : 'daily';
var slots = schedSlots(cadence, row.slots);
var next = cadence, keys = [], i;
function fail(text) {
  Outputs.error = text;
  Outputs.hasError = true;
}
if (change === 'daily' || change === 'weekly' || change === 'monthly') {
  if (change === cadence) return;
  next = change;
  var times = [], seen = {};
  for (i = 0; i < slots.length; i++) if (!seen[slots[i].time]) { seen[slots[i].time] = true; times.push(slots[i].time); }
  if (times.length === 0) times.push('09:00');
  times.sort();
  var now = new Date();
  var day = next === 'weekly' ? SCHED_DAYS[now.getDay()] : next === 'monthly' ? String(now.getDate()) : '';
  for (i = 0; i < times.length; i++) keys.push(day === '' ? times[i] : day + '@' + times[i]);
} else if (change === 'add') {
  var time = schedTime(Inputs.timeText);
  if (!time) return fail('Type a time like 08:00, 8:30 or 8pm.');
  var picked = [], list = String(Inputs.days || '').split(',');
  for (i = 0; i < list.length; i++) if (list[i]) picked.push(list[i]);
  if (cadence !== 'daily' && picked.length === 0) {
    return fail(cadence === 'weekly' ? 'Pick at least one day first.' : 'Pick at least one day of the month first.');
  }
  for (i = 0; i < slots.length; i++) keys.push(slots[i].key);
  if (cadence === 'daily') keys.push(time);
  else for (i = 0; i < picked.length; i++) keys.push(picked[i] + '@' + time);
} else if (change === 'remove') {
  var gone = String(Inputs.slotKey || '');
  for (i = 0; i < slots.length; i++) if (slots[i].key !== gone) keys.push(slots[i].key);
} else return;
var text = schedJoin(schedSlots(next, keys.join(',')));
if (next === cadence && text === schedJoin(slots)) {
  if (change === 'add') fail('That time is already there.');
  return;
}
Outputs.error = '';
Outputs.hasError = false;
Outputs.cadence = next;
Outputs.slots = text;
var said = schedDescribe({ cadence: next, slots: text });
Outputs.summary = 'Schedule: ' + said.charAt(0).toLowerCase() + said.slice(1);
Outputs.go();`;

const SET_SCHEDULE = command({
  path: 'Commands/Set schedule',
  description:
    'Changes when something repeats. Place it with Change set to daily, weekly or monthly (the timescale — its times are kept), add (the typed time, on every day picked) or remove (the time in Slot Key). A time that is not a time, or a weekly one with no day picked, is refused in words.',
  ins: [['routines', 'array'], ['routineId', 'string'], ['change', 'string'], ['days', 'string'], ['timeText', 'string'], ['slotKey', 'string']],
  extraOuts: [['error', 'string'], ['hasError', 'boolean']],
  guard: SET_SCHEDULE_SCRIPT,
  guardIns: ['routines', 'routineId', 'change', 'days', 'timeText', 'slotKey'],
  body: (p) => {
    const w = writeNode(p, 'Write', UPDATE, 'Routine', 'Save the schedule', [['cadence', 'cadence'], ['slots', 'slots']], [`${p}In`, 'routineId']);
    return {
      nodes: w.nodes,
      connections: [...w.connections, wire(`${p}Guard`, 'out-go', `${p}Write`, 'store')],
      historyDo: [[`${p}Write`, 'done']],
      failures: [[`${p}Write`, 'failure']]
    };
  },
  history: { kind: 'schedule', taskId: ['SetschedulIn', 'routineId'], summary: ['SetschedulGuard', 'out-summary'], mergeKey: ['SetschedulIn', 'routineId'] },
  extraWires: (p) => [wire(`${p}Guard`, 'out-error', `${p}Out`, 'error'), wire(`${p}Guard`, 'out-hasError', `${p}Out`, 'hasError')]
});

/** RC8. Place it twice, Which set to `start` and `end`. A start is required; an end may be cleared; never end before start. */
export const ROUTINE_DATES_SCRIPT =
  DATE_FNS +
  SCHEDULE_FNS +
  FIND_ROW +
  String.raw`var row = findRow(Inputs.routines || [], String(Inputs.routineId || ''));
if (!row) return;
var which = String(Inputs.which || '') === 'end' ? 'end' : 'start';
var raw = String(Inputs.text || '').trim();
var value = raw === '' ? '' : schedDate(raw) ? raw : null;
function fail(text) {
  Outputs.error = text;
  Outputs.hasError = true;
}
if (value === null) return fail('Use a date like 2026-10-06.');
if (which === 'start' && value === '') return fail('It needs a start date — the day it first comes up.');
var start = which === 'start' ? value : String(row.startDate || '');
var end = which === 'end' ? value : String(row.endDate || '');
if (start !== '' && end !== '' && end < start) return fail(which === 'end' ? 'It cannot end before it starts.' : 'It cannot start after it ends.');
Outputs.error = '';
Outputs.hasError = false;
if (value === String((which === 'start' ? row.startDate : row.endDate) || '')) return;
Outputs.startDate = start;
Outputs.endDate = end;
Outputs.summary = which === 'start' ? 'Starts ' + fmtDay(toDay(value)) : value === '' ? 'End date cleared' : 'Ends ' + fmtDay(toDay(value));
Outputs.go();`;

const SET_ROUTINE_DATES = command({
  path: 'Commands/Set routine dates',
  description: 'Sets when something that repeats starts or ends. Place it with Which set to start or end. It cannot end before it starts, and it always has a start.',
  ins: [['routines', 'array'], ['routineId', 'string'], ['which', 'string'], ['text', 'string']],
  extraOuts: [['error', 'string'], ['hasError', 'boolean']],
  guard: ROUTINE_DATES_SCRIPT,
  guardIns: ['routines', 'routineId', 'which', 'text'],
  body: (p) => {
    const w = writeNode(p, 'Write', UPDATE, 'Routine', 'Save the dates', [['startDate', 'startDate'], ['endDate', 'endDate']], [`${p}In`, 'routineId']);
    return {
      nodes: w.nodes,
      connections: [...w.connections, wire(`${p}Guard`, 'out-go', `${p}Write`, 'store')],
      historyDo: [[`${p}Write`, 'done']],
      failures: [[`${p}Write`, 'failure']]
    };
  },
  history: { kind: 'routine-dates', taskId: ['SetroutineIn', 'routineId'], summary: ['SetroutineGuard', 'out-summary'], mergeKey: ['SetroutineIn', 'which'] },
  extraWires: (p) => [wire(`${p}Guard`, 'out-error', `${p}Out`, 'error'), wire(`${p}Guard`, 'out-hasError', `${p}Out`, 'hasError')]
});

/** RC3. One occurrence ticked off: a `RoutineCheck` for that day and time, and a line with the note if there is one. */
export const TICK_ROUTINE_SCRIPT =
  FIND_ROW +
  `var row = findRow(Inputs.rows || [], String(Inputs.rowId || ''));
if (!row || !row.isRoutine || !row.routineId || !row.date || !row.time) return;
Outputs.routineId = row.routineId;
Outputs.date = row.date;
Outputs.time = row.time;
Outputs.doneAt = new Date().toISOString();
Outputs.note = String(Inputs.note || '').trim();
Outputs.summary = 'Done (' + row.time + ')';
Outputs.go();`;

const TICK_ROUTINE = command({
  path: 'Commands/Tick routine',
  description: 'Ticks off one occurrence of something that repeats — that day, that time — with a note if one was written. It comes back the next time it is due.',
  ins: [['rows', 'array'], ['rowId', 'string'], ['note', 'string']],
  guard: TICK_ROUTINE_SCRIPT,
  guardIns: ['rows', 'rowId', 'note'],
  body: (p) => {
    const w = writeNode(p, 'Create', CREATE, 'RoutineCheck', 'Log it as done', [
      ['routineId', 'routineId'],
      ['date', 'date'],
      ['time', 'time'],
      ['doneAt', 'doneAt'],
      ['note', 'note']
    ]);
    return {
      nodes: w.nodes,
      connections: [...w.connections, wire(`${p}Guard`, 'out-go', `${p}Create`, 'store')],
      historyDo: [[`${p}Create`, 'done']],
      failures: [[`${p}Create`, 'failure']]
    };
  },
  history: { kind: 'routine-done', taskId: ['TickroutinGuard', 'out-routineId'], summary: ['TickroutinGuard', 'out-summary'], body: ['TickroutinGuard', 'out-note'] }
});

const STOP_ROUTINE = command({
  path: 'Commands/Stop routine',
  description: 'Stops something repeating from today, with a note saying why. Without a note it does nothing. Nothing it logged is lost.',
  ins: [['routineId', 'string'], ['note', 'string']],
  guard: `var id = String(Inputs.routineId || '');
var note = String(Inputs.note || '').trim();
if (id === '' || note === '') return;
Outputs.status = 'stopped';
Outputs.at = new Date().toISOString();
Outputs.note = note;
Outputs.summary = 'Stopped';
Outputs.go();`,
  guardIns: ['routineId', 'note'],
  body: (p) => {
    const w = writeNode(p, 'Write', UPDATE, 'Routine', 'Stop it', [['status', 'status'], ['stoppedAt', 'at'], ['stopNote', 'note']], [`${p}In`, 'routineId']);
    return {
      nodes: w.nodes,
      connections: [...w.connections, wire(`${p}Guard`, 'out-go', `${p}Write`, 'store')],
      historyDo: [[`${p}Write`, 'done']],
      failures: [[`${p}Write`, 'failure']]
    };
  },
  history: { kind: 'routine-stopped', taskId: ['StoproutinIn', 'routineId'], summary: ['StoproutinGuard', 'out-summary'], body: ['StoproutinGuard', 'out-note'] }
});

// ════════════════════════════════════════════════════════════════════════════
// Pages
// ════════════════════════════════════════════════════════════════════════════

const PAGE_SIGN_IN: Tpl008Component = {
  path: 'Pages/Sign in',
  description: 'Sign in, or create an account with the same two boxes. Someone already signed in goes straight to their list.',
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
      ...composition('card'),
      maxWidth: px(400),
      rowGap: 'var(--space-4)',
      paddingLeft: 'var(--space-6)',
      paddingRight: 'var(--space-6)',
      paddingTop: 'var(--space-6)',
      paddingBottom: 'var(--space-6)'
    }),
    text('siTitle', 'App name', 'siCard', 'Todo list', { ...wide(T_TITLE), as: 'h1' }),
    text('siLead', 'What this is', 'siCard', 'Sign in, or create an account. Your list is kept on your server, so every device you sign in on sees the same one.', wide(T_META)),
    place('siEmail', TEXT_INPUT, 'Email', 'siCard', {
      ...FIELD,
      type: 'email',
      useLabel: true,
      label: 'Email',
      labelSpacing: 6,
      labelfontSize: 'var(--text-sm)',
      labelcolor: 'var(--foreground)'
    }),
    place('siPassword', TEXT_INPUT, 'Password', 'siCard', {
      ...FIELD,
      type: 'password',
      useLabel: true,
      label: 'Password',
      labelSpacing: 6,
      labelfontSize: 'var(--text-sm)',
      labelcolor: 'var(--foreground)'
    }),
    text('siError', 'Why it did not work', 'siCard', '', { ...wide(T_ERROR), mounted: false }),
    group('siButtons', 'Buttons', 'siCard', { ...ROW('var(--space-2)'), flexWrap: 'wrap' }),
    place('siSignIn', BUTTON, 'Sign in', 'siButtons', { ...BTN_PRIMARY, label: 'Sign in' }),
    place('siCreate', BUTTON, 'Create account', 'siButtons', { ...BTN_OUTLINE, label: 'Create account' }),
    logic('siLogIn', 'net.noodl.user.LogIn', 'Sign in'),
    logic('siSignUp', 'net.noodl.user.SignUp', 'Create the account'),
    logic('siErrorGate', CONDITION, 'Show why it did not work', { condition: true, 'runOnChange-condition': false }),
    // 🔴 A constant-true Condition can only ever turn the error ON (P78 D36). This
    // one puts it away when the person tries again, so an old refusal never sits
    // over a new attempt.
    logic('siErrorClear', CONDITION, 'Put the old error away', { condition: false, 'runOnChange-condition': false }),
    logic('siUser', 'net.noodl.user.User', 'Who is signed in'),
    logic('siAlready', CONDITION, 'Already signed in?', signalOnly('condition')),
    logic('siToList', NAVIGATE, 'Go to the list', { router: ROUTER, target: C.pageTodo })
  ],
  connections: [
    wire('siEmail', 'onTextChanged', 'siLogIn', 'username'),
    wire('siPassword', 'onTextChanged', 'siLogIn', 'password'),
    wire('siSignIn', 'onClick', 'siLogIn', 'login'),
    wire('siPassword', 'onEnter', 'siLogIn', 'login'),
    wire('siEmail', 'onTextChanged', 'siSignUp', 'username'),
    wire('siEmail', 'onTextChanged', 'siSignUp', 'email'),
    wire('siPassword', 'onTextChanged', 'siSignUp', 'password'),
    wire('siCreate', 'onClick', 'siSignUp', 'signup'),
    wire('siLogIn', 'error', 'siError', 'text'),
    wire('siSignUp', 'error', 'siError', 'text'),
    wire('siLogIn', 'failure', 'siErrorGate', 'eval'),
    wire('siSignUp', 'failure', 'siErrorGate', 'eval'),
    wire('siErrorGate', 'result', 'siError', 'mounted'),
    wire('siSignIn', 'onClick', 'siErrorClear', 'eval'),
    wire('siCreate', 'onClick', 'siErrorClear', 'eval'),
    wire('siErrorClear', 'result', 'siError', 'mounted'),
    wire('siLogIn', 'done', 'siToList', 'navigate'),
    wire('siSignUp', 'done', 'siToList', 'navigate'),
    wire('siUser', 'authenticated', 'siAlready', 'condition'),
    wire('siPage', 'didMount', 'siAlready', 'eval'),
    wire('siAlready', 'ontrue', 'siToList', 'navigate')
  ]
};

/** The dialog's four questions, as one States node the page moves between. */
const DIALOG_MODES = {
  states: 'none,close,reopen,tick,untick,check,stop',
  currentState: 'none',
  values: 'open,heading,help,ok,optional',
  'type-open': 'boolean',
  'type-heading': 'string',
  'type-help': 'string',
  'type-ok': 'string',
  'type-optional': 'boolean',
  'value-none-open': false,
  'value-none-optional': false,
  'value-close-open': true,
  'value-close-optional': false,
  'value-close-heading': 'What happened?',
  'value-close-help': 'Every task keeps a record. One line is enough, even “not needed, dropping it”.',
  'value-close-ok': 'Close task',
  'value-reopen-open': true,
  'value-reopen-optional': false,
  'value-reopen-heading': 'Why is it back?',
  'value-reopen-help': 'It goes back in at the bottom of the list.',
  'value-reopen-ok': 'Reopen',
  'value-tick-open': true,
  'value-tick-optional': false,
  'value-tick-heading': 'What happened?',
  'value-tick-help': 'A line is enough.',
  'value-tick-ok': 'Tick off',
  'value-untick-open': true,
  'value-untick-optional': false,
  'value-untick-heading': 'Why is it back?',
  'value-untick-help': 'It goes back in at the bottom of the next actions.',
  'value-untick-ok': 'Untick',
  // TPL-008-RC RC3 — a recurring item ticked off: logged either way, a note only if there is one.
  'value-check-open': true,
  'value-check-heading': 'Done. Anything to add?',
  'value-check-help': 'Optional. It is logged either way, and comes back the next time it is due.',
  'value-check-ok': 'Done',
  'value-check-optional': true,
  'value-stop-open': true,
  'value-stop-optional': false,
  'value-stop-heading': 'Why is it stopping?',
  'value-stop-help': 'It stops repeating from today. Everything it logged is kept.',
  'value-stop-ok': 'Stop it',
  useTransitions: false
};

/** Every command the page places: id, component, instance parameters. */
const PAGE_COMMANDS: Array<[string, string, Record<string, unknown>?]> = [
  ['cmdAdd', C.addTask],
  // 2026-09-24: the grip replaced ▲ ▼ — a drag (or the grip's arrow keys) says where to.
  ['cmdDrag', C.moveTask, { direction: 'to' }],
  ['cmdTop', C.moveTask, { direction: 'top' }],
  ['cmdClose', C.closeTask],
  ['cmdReopen', C.reopenTask],
  ['cmdRename', C.renameTask],
  ['cmdDeadline', C.setDeadline],
  ['cmdAddAction', C.addAction],
  ['cmdTick', C.tickAction],
  ['cmdUntick', C.untickAction],
  ['cmdActDrag', C.moveAction, { direction: 'to' }],
  ['cmdRenameAct', C.renameAction],
  ['cmdDescribe', C.describeAction],
  ['cmdNote', C.addNote],
  // TPL-008-RC
  ['cmdAddRoutine', C.addRoutine],
  ['cmdRenameRoutine', C.renameRoutine],
  ['cmdDaily', C.setSchedule, { change: 'daily' }],
  ['cmdWeekly', C.setSchedule, { change: 'weekly' }],
  ['cmdMonthly', C.setSchedule, { change: 'monthly' }],
  ['cmdAddTime', C.setSchedule, { change: 'add' }],
  ['cmdRemoveSlot', C.setSchedule, { change: 'remove' }],
  ['cmdStart', C.setRoutineDates, { which: 'start' }],
  ['cmdEnd', C.setRoutineDates, { which: 'end' }],
  ['cmdCheck', C.tickRoutine],
  ['cmdStop', C.stopRoutine],
  ['cmdRoutineNote', C.addNote]
];

/** The page's selection producers — one Set Variable each (see the module header). */
const SELECTORS = ['tdSelectFromList', 'tdSelectFromDone', 'tdSelectFromLog', 'tdSelectFromLink', 'tdSelectFromToday', 'tdSelectFromRoutines', 'tdSelectNewRoutine'];

const QUERY_OFF = { 'runOnChange-collectionName': false, 'runOnChange-querySettings': false, storageEnableLimit: true };

const DIALOG_FLOW_INS: Array<[string, string]> = [
  ['listTaskId', 'string'], ['listTaskTitle', 'string'], ['listClose', 'signal'],
  ['detailTaskId', 'string'], ['detailTaskTitle', 'string'], ['detailClose', 'signal'], ['detailReopen', 'signal'],
  ['actionId', 'string'], ['actionTitle', 'string'], ['tick', 'signal'], ['untick', 'signal'],
  // TPL-008-RC — a task closed from Today, one occurrence of a routine ticked off, a routine stopped.
  ['todayTaskId', 'string'], ['todayTaskTitle', 'string'], ['todayClose', 'signal'],
  ['occurrenceId', 'string'], ['occurrenceTitle', 'string'], ['check', 'signal'],
  ['routineTitle', 'string'], ['detailStop', 'signal']
];
const DIALOG_FLOW_OUTS: Array<[string, string]> = [
  ['dialogTaskId', 'string'], ['dialogActionId', 'string'], ['dialogOccurrenceId', 'string'], ['note', 'string'],
  ['confirmClose', 'signal'], ['confirmReopen', 'signal'], ['confirmTick', 'signal'], ['confirmUntick', 'signal'],
  ['confirmCheck', 'signal'], ['confirmStop', 'signal']
];

/**
 * Out of `Pages/Todo` in s2, when the page was 70 nodes. Every producer still has its
 * OWN input and its own `Set Variable` — the list's close and the detail pane's close
 * never share a value port (see the module header).
 */
const DIALOG_FLOW: Tpl008Component = {
  path: 'Todo/Dialog flow',
  description:
    'Asks "what happened?" before a close, a reopen, a tick or an untick — and, for things that repeat, before one is ticked off (a note optional) or stopped: remembers which task, next action or occurrence it is about, shows the dialog, and says which question was answered.',
  ...iface(DIALOG_FLOW_INS, DIALOG_FLOW_OUTS),
  instantiates: [C.dialog],
  nodes: [
    inputs('dfIn', 'What was pressed', DIALOG_FLOW_INS),
    outputs('dfOut', 'What was answered', DIALOG_FLOW_OUTS),
    group('dfRoot', 'Dialog', undefined, COLUMN('var(--space-0)')),
    place('dfDialog', C.dialog, 'What happened?', 'dfRoot'),
    logic('dfMode', STATES, 'What the dialog is asking', DIALOG_MODES),
    logic('dfTask', VARIABLE, 'Which task the dialog is about', { name: VAR.dialogTask }),
    logic('dfTaskFromList', SET_VARIABLE, 'From the list', { name: VAR.dialogTask, setWith: 'string' }),
    logic('dfTaskFromDetail', SET_VARIABLE, 'From the detail pane', { name: VAR.dialogTask, setWith: 'string' }),
    logic('dfAction', VARIABLE, 'Which next action', { name: VAR.dialogAction }),
    logic('dfActionSet', SET_VARIABLE, 'From the next actions', { name: VAR.dialogAction, setWith: 'string' }),
    logic('dfSubject', VARIABLE, 'What the dialog names', { name: VAR.dialogSubject }),
    logic('dfSubjectFromList', SET_VARIABLE, 'Name it from the list', { name: VAR.dialogSubject, setWith: 'string' }),
    logic('dfSubjectFromDetail', SET_VARIABLE, 'Name it from the detail pane', { name: VAR.dialogSubject, setWith: 'string' }),
    logic('dfSubjectFromAction', SET_VARIABLE, 'Name the next action', { name: VAR.dialogSubject, setWith: 'string' }),
    logic('dfTaskFromToday', SET_VARIABLE, 'From Today', { name: VAR.dialogTask, setWith: 'string' }),
    logic('dfSubjectFromToday', SET_VARIABLE, 'Name it from Today', { name: VAR.dialogSubject, setWith: 'string' }),
    logic('dfOccurrence', VARIABLE, 'Which occurrence', { name: VAR.dialogOccurrence }),
    logic('dfOccurrenceSet', SET_VARIABLE, 'From Today’s recurring rows', { name: VAR.dialogOccurrence, setWith: 'string' }),
    logic('dfSubjectFromOccurrence', SET_VARIABLE, 'Name the occurrence', { name: VAR.dialogSubject, setWith: 'string' }),
    logic('dfSubjectFromRoutine', SET_VARIABLE, 'Name the routine', { name: VAR.dialogSubject, setWith: 'string' }),
    logic('dfIfClose', CONDITION, 'Was it closing?', signalOnly('condition')),
    logic('dfIfReopen', CONDITION, 'Was it reopening?', signalOnly('condition')),
    logic('dfIfTick', CONDITION, 'Was it ticking?', signalOnly('condition')),
    logic('dfIfUntick', CONDITION, 'Was it unticking?', signalOnly('condition')),
    logic('dfIfCheck', CONDITION, 'Was it ticking off a recurring item?', signalOnly('condition')),
    logic('dfIfStop', CONDITION, 'Was it stopping one?', signalOnly('condition'))
  ],
  connections: [
    // From the list
    wire('dfIn', 'listTaskId', 'dfTaskFromList', 'value'),
    wire('dfIn', 'listClose', 'dfTaskFromList', 'do'),
    wire('dfIn', 'listTaskTitle', 'dfSubjectFromList', 'value'),
    wire('dfIn', 'listClose', 'dfSubjectFromList', 'do'),
    wire('dfIn', 'listClose', 'dfMode', 'to-close'),
    // From the detail pane
    wire('dfIn', 'detailTaskId', 'dfTaskFromDetail', 'value'),
    wire('dfIn', 'detailClose', 'dfTaskFromDetail', 'do'),
    wire('dfIn', 'detailReopen', 'dfTaskFromDetail', 'do'),
    wire('dfIn', 'detailTaskTitle', 'dfSubjectFromDetail', 'value'),
    wire('dfIn', 'detailClose', 'dfSubjectFromDetail', 'do'),
    wire('dfIn', 'detailReopen', 'dfSubjectFromDetail', 'do'),
    wire('dfIn', 'detailClose', 'dfMode', 'to-close'),
    wire('dfIn', 'detailReopen', 'dfMode', 'to-reopen'),
    // From the next actions
    wire('dfIn', 'actionId', 'dfActionSet', 'value'),
    wire('dfIn', 'tick', 'dfActionSet', 'do'),
    wire('dfIn', 'untick', 'dfActionSet', 'do'),
    wire('dfIn', 'actionTitle', 'dfSubjectFromAction', 'value'),
    wire('dfIn', 'tick', 'dfSubjectFromAction', 'do'),
    wire('dfIn', 'untick', 'dfSubjectFromAction', 'do'),
    wire('dfIn', 'tick', 'dfMode', 'to-tick'),
    wire('dfIn', 'untick', 'dfMode', 'to-untick'),
    // From Today (RC): closing a task there is the list's close, on its own inputs
    wire('dfIn', 'todayTaskId', 'dfTaskFromToday', 'value'),
    wire('dfIn', 'todayClose', 'dfTaskFromToday', 'do'),
    wire('dfIn', 'todayTaskTitle', 'dfSubjectFromToday', 'value'),
    wire('dfIn', 'todayClose', 'dfSubjectFromToday', 'do'),
    wire('dfIn', 'todayClose', 'dfMode', 'to-close'),
    wire('dfIn', 'occurrenceId', 'dfOccurrenceSet', 'value'),
    wire('dfIn', 'check', 'dfOccurrenceSet', 'do'),
    wire('dfIn', 'occurrenceTitle', 'dfSubjectFromOccurrence', 'value'),
    wire('dfIn', 'check', 'dfSubjectFromOccurrence', 'do'),
    wire('dfIn', 'check', 'dfMode', 'to-check'),
    // Stopping a routine: its id is the selection, which the detail pane's close already hands in.
    wire('dfIn', 'detailStop', 'dfTaskFromDetail', 'do'),
    wire('dfIn', 'routineTitle', 'dfSubjectFromRoutine', 'value'),
    wire('dfIn', 'detailStop', 'dfSubjectFromRoutine', 'do'),
    wire('dfIn', 'detailStop', 'dfMode', 'to-stop'),

    // Showing the question
    wire('dfMode', 'open', 'dfDialog', 'open'),
    wire('dfMode', 'heading', 'dfDialog', 'heading'),
    wire('dfMode', 'help', 'dfDialog', 'help'),
    wire('dfMode', 'ok', 'dfDialog', 'okLabel'),
    wire('dfMode', 'optional', 'dfDialog', 'optional'),
    wire('dfSubject', 'value', 'dfDialog', 'subject'),
    wire('dfDialog', 'cancel', 'dfMode', 'to-none'),

    // Answering it: test which question it was, THEN close it
    wire('dfMode', 'at-close', 'dfIfClose', 'condition'),
    wire('dfMode', 'at-reopen', 'dfIfReopen', 'condition'),
    wire('dfMode', 'at-tick', 'dfIfTick', 'condition'),
    wire('dfMode', 'at-untick', 'dfIfUntick', 'condition'),
    wire('dfMode', 'at-check', 'dfIfCheck', 'condition'),
    wire('dfMode', 'at-stop', 'dfIfStop', 'condition'),
    ...['dfIfClose', 'dfIfReopen', 'dfIfTick', 'dfIfUntick', 'dfIfCheck', 'dfIfStop'].flatMap((g) => [wire('dfDialog', 'confirm', g, 'eval'), wire(g, 'ontrue', 'dfMode', 'to-none')]),
    wire('dfIfClose', 'ontrue', 'dfOut', 'confirmClose'),
    wire('dfIfReopen', 'ontrue', 'dfOut', 'confirmReopen'),
    wire('dfIfTick', 'ontrue', 'dfOut', 'confirmTick'),
    wire('dfIfUntick', 'ontrue', 'dfOut', 'confirmUntick'),
    wire('dfIfCheck', 'ontrue', 'dfOut', 'confirmCheck'),
    wire('dfIfStop', 'ontrue', 'dfOut', 'confirmStop'),
    wire('dfOccurrence', 'value', 'dfOut', 'dialogOccurrenceId'),
    wire('dfTask', 'value', 'dfOut', 'dialogTaskId'),
    wire('dfAction', 'value', 'dfOut', 'dialogActionId'),
    wire('dfDialog', 'note', 'dfOut', 'note')
  ]
};

const TODO_DATA_INS: Array<[string, string]> = [['refresh', 'signal'], ['loadHistory', 'signal'], ['hasTask', 'boolean']];
const TODO_DATA_OUTS: Array<[string, string]> = [
  ['tasks', 'array'], ['actions', 'array'], ['events', 'array'], ['recent', 'array'], ['routines', 'array'], ['checks', 'array']
];

/** Out of `Pages/Todo` in s2, with the queries' wiring unchanged. */
const TODO_DATA: Tpl008Component = {
  path: 'Logic/Todo data',
  description:
    'The six queries: your tasks, your next actions, the selected task’s (or recurring item’s) history, recent history across all of them, the things that repeat, and the times they were ticked off. Refresh loads them all again; a history is only asked for when something is selected.',
  ...iface(TODO_DATA_INS, TODO_DATA_OUTS),
  nodes: [
    inputs('dtIn', 'When to load', TODO_DATA_INS),
    outputs('dtOut', 'The records', TODO_DATA_OUTS),
    logic('dtSelected', VARIABLE, 'The selected task', { name: VAR.selected }),
    logic('dtTasks', QUERY, 'Your tasks', { collectionName: 'Task', ...QUERY_OFF, storageLimit: 1000, visualSort: [{ property: 'position', order: 'ascending' }] }),
    logic('dtActions', QUERY, 'Your next actions', { collectionName: 'Action', ...QUERY_OFF, storageLimit: 1000, visualSort: [{ property: 'position', order: 'ascending' }] }),
    logic('dtEvents', QUERY, 'The selected task’s history', {
      collectionName: 'Event',
      ...QUERY_OFF,
      // 🔴 A filter parameter has its OWN Run On Value Change box, ticked by default,
      // and the two above do not cover it (`dbcollectionnode2.ts:1145`). Left on, the
      // id arriving at boot fetched history for a signed-out visitor and logged a 403.
      'runOnChange-qp-taskId': false,
      storageLimit: 1000,
      visualFilter: { combinator: 'and', rules: [{ property: 'taskId', operator: 'equal to', input: 'taskId' }] },
      visualSort: [{ property: 'at', order: 'descending' }]
    }),
    logic('dtRecent', QUERY, 'Recent history, all tasks', { collectionName: 'Event', ...QUERY_OFF, storageLimit: 300, visualSort: [{ property: 'at', order: 'descending' }] }),
    // TPL-008-RC. A tablet twice a day is 730 ticks a year: the newest 1,000 is more than a year, and
    // Today and a routine's history (30 days of misses) never look further back than that.
    logic('dtRoutines', QUERY, 'The things that repeat', { collectionName: 'Routine', ...QUERY_OFF, storageLimit: 1000, visualSort: [{ property: 'title', order: 'ascending' }] }),
    logic('dtChecks', QUERY, 'The times they were ticked off', { collectionName: 'RoutineCheck', ...QUERY_OFF, storageLimit: 1000, visualSort: [{ property: 'date', order: 'descending' }] }),
    logic('dtHasTask', CONDITION, 'Is a task selected?', signalOnly('condition')),
    logic('dtLoadProblem', SET_VARIABLE, 'Say the list did not load', { name: VAR.problem, setWith: 'string', value: LOAD_PROBLEM_TEXT })
  ],
  connections: [
    ...['dtTasks', 'dtActions', 'dtRecent', 'dtRoutines', 'dtChecks'].map((q) => wire('dtIn', 'refresh', q, 'storageFetch')),
    // A task's history is only asked for when there is a task to ask about.
    wire('dtIn', 'refresh', 'dtHasTask', 'eval'),
    wire('dtIn', 'hasTask', 'dtHasTask', 'condition'),
    wire('dtHasTask', 'ontrue', 'dtEvents', 'storageFetch'),
    wire('dtIn', 'loadHistory', 'dtEvents', 'storageFetch'),
    // Straight from the variable, as it was on the page: Set Variable's Done fires after
    // every reader has the new value, so `loadHistory` filters on the task just picked.
    wire('dtSelected', 'value', 'dtEvents', 'qp-taskId'),
    wire('dtTasks', 'failure', 'dtLoadProblem', 'do'),
    wire('dtTasks', 'items', 'dtOut', 'tasks'),
    wire('dtActions', 'items', 'dtOut', 'actions'),
    wire('dtEvents', 'items', 'dtOut', 'events'),
    wire('dtRecent', 'items', 'dtOut', 'recent'),
    wire('dtRoutines', 'items', 'dtOut', 'routines'),
    wire('dtChecks', 'items', 'dtOut', 'checks')
  ]
};

/**
 * TPL-010-L L5 — **`?task=<id>` opens that task.** Planning links a block to its task this way.
 * The one change the link needed in this template: two small scripts and one Set Variable, and
 * nothing else in the list changes. The id waits in session storage so a signed-out visitor who
 * signs in first still lands on it.
 */
export const LINK_KEY = 'todo-open-task';
export const LINK_BOOT_SCRIPT = `try {
  var m = /[?&]task=([^&#]*)/.exec(window.location.search || '');
  if (m) window.sessionStorage.setItem(${JSON.stringify(LINK_KEY)}, decodeURIComponent(m[1]));
} catch (e) {}`;
export const LINK_OPEN_SCRIPT = `var id = '';
try {
  id = window.sessionStorage.getItem(${JSON.stringify(LINK_KEY)}) || '';
  window.sessionStorage.removeItem(${JSON.stringify(LINK_KEY)});
} catch (e) {}
if (!id) {
  var m = /[?&]task=([^&#]*)/.exec(window.location.search || '');
  if (m) { try { id = decodeURIComponent(m[1]); } catch (e) { id = ''; } }
}
if (!id) return;
Outputs.taskId = id;
Outputs.open();`;

const PAGE_TODO: Tpl008Component = {
  path: 'Pages/Todo',
  description:
    'The app: the list (or Today, Done, or the Log) beside the selected task or thing that repeats. Holds the selection, places the data and the dialog flow, and wires every button to its command. Signed-out visitors are sent to Sign in.',
  instantiates: [
    C.header, C.problem, C.taskList, C.doneList, C.logList, C.summary, C.nextActions, C.history, C.dialogFlow,
    C.todoData, C.taskRows, C.selected, C.logRows,
    C.todayList, C.routineList, C.routineSummary, C.todayRows, C.selectedRoutine,
    ...new Set(PAGE_COMMANDS.map(([, c]) => c))
  ],
  nodes: [
    { id: 'tdPage', type: 'Page', label: 'Todo', parameters: { title: 'Todo list', urlPath: '' } },
    group('tdRoot', 'Page', 'tdPage', {
      ...COLUMN('var(--space-0)'),
      alignItems: 'center',
      paddingTop: 'var(--space-6)',
      paddingBottom: 'var(--space-12)',
      paddingLeft: 'var(--space-4)',
      paddingRight: 'var(--space-4)'
    }),
    group('tdShell', 'Shell', 'tdRoot', { ...COLUMN('var(--space-5)'), maxWidth: px(1080) }),
    place('tdHeader', C.header, 'Header', 'tdShell'),
    place('tdProblem', C.problem, 'Problem', 'tdShell'),
    // Two panes that sit side by side when there is room for both at 380px, and
    // stack when there is not.
    group('tdMain', 'List and task', 'tdShell', {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'flex-start',
      sizeMode: 'contentHeight',
      width: pct(100),
      columnGap: 'var(--space-6)',
      styleCss: 'row-gap: 24px;'
    }),
    group('tdLeft', 'The list', 'tdMain', { ...COLUMN('var(--space-3)'), styleCss: 'flex: 1 1 380px; min-width: 0;' }),
    // An instance has no `mounted` of its own — only the ports its Component Inputs
    // declare — so each view is gated on a Group around it.
    group('tdListView', 'List view', 'tdLeft', COLUMN('var(--space-0)')),
    place('tdList', C.taskList, 'Open tasks', 'tdListView'),
    group('tdTodayView', 'Today view', 'tdLeft', { ...COLUMN('var(--space-0)'), mounted: false }),
    place('tdToday', C.todayList, 'Today', 'tdTodayView'),
    place('tdRoutines', C.routineList, 'Things that repeat', 'tdTodayView'),
    group('tdDoneView', 'Done view', 'tdLeft', { ...COLUMN('var(--space-0)'), mounted: false }),
    place('tdDone', C.doneList, 'Closed tasks', 'tdDoneView'),
    group('tdLogView', 'Log view', 'tdLeft', { ...COLUMN('var(--space-0)'), mounted: false }),
    place('tdLog', C.logList, 'Everything that happened', 'tdLogView'),
    group('tdRight', 'The selected task', 'tdMain', {
      ...COLUMN('var(--space-6)'),
      styleCss: 'flex: 1 1 380px; min-width: 0;',
      backgroundColor: 'var(--surface)',
      borderStyle: 'solid',
      borderWidth: 'var(--border-1)',
      borderColor: 'var(--border)',
      borderRadius: 'var(--radius-lg)',
      paddingLeft: 'var(--space-6)',
      paddingRight: 'var(--space-6)',
      paddingTop: 'var(--space-5)',
      paddingBottom: 'var(--space-6)'
    }),
    text('tdEmpty', 'When nothing is selected', 'tdRight', 'Select a task, or something that repeats, to see its details.', { ...wide(T_META), textAlignX: 'center' }),
    group('tdDetail', 'Task detail', 'tdRight', { ...COLUMN('var(--space-6)'), mounted: false }),
    place('tdSummary', C.summary, 'Summary', 'tdDetail'),
    place('tdNext', C.nextActions, 'Next actions', 'tdDetail'),
    place('tdHistory', C.history, 'History', 'tdDetail'),
    group('tdRoutineDetail', 'Thing that repeats', 'tdRight', { ...COLUMN('var(--space-6)'), mounted: false }),
    place('tdRoutineSummary', C.routineSummary, 'Summary', 'tdRoutineDetail'),
    place('tdRoutineHistory', C.history, 'Its history', 'tdRoutineDetail'),
    place('tdDialog', C.dialogFlow, 'What happened?', 'tdRoot'),

    // Who you are
    logic('tdUser', 'net.noodl.user.User', 'Who is signed in'),
    logic('tdAuth', CONDITION, 'Signed in?', signalOnly('condition')),
    logic('tdToSignIn', NAVIGATE, 'Go to sign in', { router: ROUTER, target: C.pageSignIn }),
    logic('tdLogOut', 'net.noodl.user.LogOut', 'Sign out'),

    // The records
    logic('tdData', C.todoData, 'Your list, from the backend'),

    // What the screen draws
    logic('tdRows', C.taskRows, 'The rows'),
    logic('tdSel', C.selected, 'The selected task'),
    logic('tdLogRows', C.logRows, 'The log lines'),
    logic('tdTodayRows', C.todayRows, 'Today'),
    logic('tdRoutine', C.selectedRoutine, 'The selected thing that repeats'),
    {
      ...(logic('tdClock', FUNCTION, 'A minute clock, and a wake when the app comes back into view', { functionScript: CLOCK_SCRIPT }) as object),
      ports: [
        { name: 'out-now', displayName: 'now', plug: 'output', type: 'number', group: 'Outputs' },
        { name: 'out-wake', displayName: 'wake', plug: 'output', type: 'signal', group: 'Outputs' }
      ]
    },
    logic('tdScreen', 'Screen Resolution', 'How wide the screen is'),
    // RC: something is found when a task OR a thing that repeats is selected — one selection holds either.
    derive(
      'tdLayout',
      'One pane or two?',
      'var narrow = (Inputs.width || 1200) < 820;\nvar found = !!Inputs.found || !!Inputs.routineFound;\nOutputs.narrow = narrow;\nOutputs.found = found;\nOutputs.nothing = !found;\nOutputs.showLeft = !(narrow && found);\nOutputs.showRight = !narrow || found;'
    ),
    logic('tdTab', STATES, 'Which view', { states: 'list,today,done,log', currentState: 'list', useTransitions: false }),
    // RC5 — a reminder's link opens Today.
    {
      ...(script('tdViewOpen', 'Did the link ask for Today?', VIEW_LINK_SCRIPT, []) as object),
      ports: [{ name: 'out-today', displayName: 'today', plug: 'output', type: 'signal', group: 'Outputs' }]
    },

    // The selection — one Set Variable per producer (see the module header)
    logic('tdSelected', VARIABLE, 'The selected task', { name: VAR.selected }),
    logic('tdSelectFromList', SET_VARIABLE, 'Select from the list', { name: VAR.selected, setWith: 'string' }),
    logic('tdSelectFromDone', SET_VARIABLE, 'Select from Done', { name: VAR.selected, setWith: 'string' }),
    logic('tdSelectFromLog', SET_VARIABLE, 'Select from the log', { name: VAR.selected, setWith: 'string' }),
    logic('tdDeselect', SET_VARIABLE, 'Back to the list', { name: VAR.selected, setWith: 'emptyString' }),
    // L5 — a link to one task (Planning's) selects it once the list is being loaded.
    script('tdLinkOpen', 'Which task did the link ask for?', LINK_OPEN_SCRIPT, []),
    logic('tdSelectFromLink', SET_VARIABLE, 'Select from a link', { name: VAR.selected, setWith: 'string' }),
    // RC — the selection holds a task's id or a routine's; these three pick a routine (or a task from Today).
    logic('tdSelectFromToday', SET_VARIABLE, 'Select from Today', { name: VAR.selected, setWith: 'string' }),
    logic('tdSelectFromRoutines', SET_VARIABLE, 'Select a thing that repeats', { name: VAR.selected, setWith: 'string' }),
    logic('tdSelectNewRoutine', SET_VARIABLE, 'Open the one just added', { name: VAR.selected, setWith: 'string' }),

    // RC6 — the days picked for the next time added. Toggled by a press that saves nothing.
    logic('tdDays', VARIABLE, 'The days picked', { name: VAR.slotDays }),
    script(
      'tdPickDay',
      'Pick or unpick a day',
      "var key = String(Inputs.key || '');\nif (key === '') return;\nvar list = String(Inputs.days || '').split(',').filter(function (d) { return d !== ''; });\nvar at = list.indexOf(key);\nif (at >= 0) list.splice(at, 1); else list.push(key);\nOutputs.days = list.join(',');\nOutputs.go();",
      ['key', 'days']
    ),
    logic('tdSetDays', SET_VARIABLE, 'Keep the days picked', { name: VAR.slotDays, setWith: 'string' }),
    logic('tdClearDays', SET_VARIABLE, 'Forget the days picked', { name: VAR.slotDays, setWith: 'emptyString' }),

    // s8 — which next action has its description open. One value, SET and CLEARED;
    // never a per-row toggle, which loses the press that also saves (Todo/Action row).
    logic('tdOpenAction', VARIABLE, 'Which description is open', { name: VAR.openAction }),
    logic('tdOpenDesc', SET_VARIABLE, 'Open a description', { name: VAR.openAction, setWith: 'string' }),
    logic('tdCloseDesc', SET_VARIABLE, 'Close the description', { name: VAR.openAction, setWith: 'emptyString' }),

    // The commands
    ...PAGE_COMMANDS.map(([id, type, params]) => logic(id, type, id.replace(/^cmd/, ''), params))
  ],
  connections: [
    // Signed in, or sent away
    wire('tdPage', 'didMount', 'tdAuth', 'eval'),
    wire('tdUser', 'authenticated', 'tdAuth', 'condition'),
    wire('tdAuth', 'ontrue', 'tdData', 'refresh'),
    wire('tdAuth', 'ontrue', 'tdLinkOpen', 'run'),
    wire('tdAuth', 'ontrue', 'tdViewOpen', 'run'),
    // The app came back into view (a phone left on Today overnight): check who you are, and load again.
    wire('tdClock', 'out-wake', 'tdAuth', 'eval'),
    wire('tdAuth', 'onfalse', 'tdToSignIn', 'navigate'),
    wire('tdHeader', 'signOut', 'tdLogOut', 'login'),
    wire('tdLogOut', 'done', 'tdToSignIn', 'navigate'),

    // Loading
    wire('tdLayout', 'out-found', 'tdData', 'hasTask'),
    wire('tdData', 'tasks', 'tdRows', 'tasks'),
    wire('tdData', 'tasks', 'tdSel', 'tasks'),
    wire('tdData', 'tasks', 'tdLogRows', 'tasks'),
    wire('tdData', 'actions', 'tdRows', 'actions'),
    wire('tdData', 'actions', 'tdSel', 'actions'),
    wire('tdData', 'events', 'tdSel', 'events'),
    wire('tdData', 'recent', 'tdLogRows', 'events'),
    wire('tdSelected', 'value', 'tdRows', 'selectedId'),
    wire('tdSelected', 'value', 'tdSel', 'selectedId'),
    wire('tdOpenAction', 'value', 'tdSel', 'openActionId'),
    wire('tdData', 'tasks', 'tdTodayRows', 'tasks'),
    wire('tdData', 'actions', 'tdTodayRows', 'actions'),
    wire('tdData', 'routines', 'tdTodayRows', 'routines'),
    wire('tdData', 'checks', 'tdTodayRows', 'checks'),
    wire('tdSelected', 'value', 'tdTodayRows', 'selectedId'),
    wire('tdClock', 'out-now', 'tdTodayRows', 'now'),
    wire('tdData', 'routines', 'tdRoutine', 'routines'),
    wire('tdData', 'checks', 'tdRoutine', 'checks'),
    wire('tdData', 'events', 'tdRoutine', 'events'),
    wire('tdSelected', 'value', 'tdRoutine', 'selectedId'),
    wire('tdDays', 'value', 'tdRoutine', 'days'),
    wire('tdClock', 'out-now', 'tdRoutine', 'now'),
    wire('tdData', 'routines', 'tdLogRows', 'routines'),

    // Views
    wire('tdTab', 'currentState', 'tdHeader', 'tab'),
    wire('tdRows', 'listLabel', 'tdHeader', 'listLabel'),
    wire('tdRows', 'doneLabel', 'tdHeader', 'doneLabel'),
    wire('tdTodayRows', 'todayLabel', 'tdHeader', 'todayLabel'),
    wire('tdHeader', 'pickList', 'tdTab', 'to-list'),
    wire('tdHeader', 'pickToday', 'tdTab', 'to-today'),
    wire('tdViewOpen', 'out-today', 'tdTab', 'to-today'),
    wire('tdHeader', 'pickDone', 'tdTab', 'to-done'),
    wire('tdHeader', 'pickLog', 'tdTab', 'to-log'),
    wire('tdTab', 'at-list', 'tdListView', 'mounted'),
    wire('tdTab', 'at-today', 'tdTodayView', 'mounted'),
    wire('tdTab', 'at-done', 'tdDoneView', 'mounted'),
    wire('tdTab', 'at-log', 'tdLogView', 'mounted'),
    wire('tdScreen', 'width', 'tdLayout', 'in-width'),
    wire('tdSel', 'found', 'tdLayout', 'in-found'),
    wire('tdRoutine', 'found', 'tdLayout', 'in-routineFound'),
    wire('tdLayout', 'out-showLeft', 'tdLeft', 'mounted'),
    wire('tdLayout', 'out-showRight', 'tdRight', 'mounted'),
    wire('tdLayout', 'out-narrow', 'tdSummary', 'narrow'),
    wire('tdLayout', 'out-narrow', 'tdRoutineSummary', 'narrow'),

    // The panes
    wire('tdRows', 'openRows', 'tdList', 'rows'),
    wire('tdRows', 'addPlaceholder', 'tdList', 'placeholder'),
    wire('tdRows', 'doneRows', 'tdDone', 'rows'),
    wire('tdLogRows', 'rows', 'tdLog', 'rows'),
    wire('tdSel', 'found', 'tdDetail', 'mounted'),
    wire('tdLayout', 'out-nothing', 'tdEmpty', 'mounted'),
    wire('tdTodayRows', 'rows', 'tdToday', 'rows'),
    wire('tdTodayRows', 'routineRows', 'tdRoutines', 'rows'),
    wire('tdRoutine', 'found', 'tdRoutineDetail', 'mounted'),
    ...[
      'title', 'scheduleLine', 'statusLine', 'statusColor', 'cadence', 'slotRows', 'noSlots', 'dayChips', 'showDays', 'addHint',
      'startDate', 'endDate', 'canStop', 'isStopped', 'stopNote'
    ].map((n) => wire('tdRoutine', n, 'tdRoutineSummary', n)),
    wire('tdRoutine', 'historyRows', 'tdRoutineHistory', 'rows'),
    ...['title', 'rankLine', 'deadline', 'dueText', 'dueColor', 'isOpen', 'isClosed', 'canMakeNext', 'closingNote'].map((n) =>
      wire('tdSel', n, 'tdSummary', n)
    ),
    wire('tdSel', 'actionRows', 'tdNext', 'rows'),
    wire('tdSel', 'historyRows', 'tdHistory', 'rows'),

    // Selecting
    wire('tdList', 'taskId', 'tdSelectFromList', 'value'),
    wire('tdList', 'open', 'tdSelectFromList', 'do'),
    wire('tdDone', 'taskId', 'tdSelectFromDone', 'value'),
    wire('tdDone', 'open', 'tdSelectFromDone', 'do'),
    wire('tdLog', 'taskId', 'tdSelectFromLog', 'value'),
    wire('tdLog', 'open', 'tdSelectFromLog', 'do'),
    wire('tdSummary', 'back', 'tdDeselect', 'do'),
    wire('tdLinkOpen', 'out-taskId', 'tdSelectFromLink', 'value'),
    wire('tdLinkOpen', 'out-open', 'tdSelectFromLink', 'do'),
    wire('tdToday', 'targetId', 'tdSelectFromToday', 'value'),
    wire('tdToday', 'open', 'tdSelectFromToday', 'do'),
    wire('tdRoutines', 'routineId', 'tdSelectFromRoutines', 'value'),
    wire('tdRoutines', 'open', 'tdSelectFromRoutines', 'do'),
    wire('cmdAddRoutine', 'id', 'tdSelectNewRoutine', 'value'),
    wire('cmdAddRoutine', 'done', 'tdSelectNewRoutine', 'do'),
    wire('tdRoutineSummary', 'back', 'tdDeselect', 'do'),
    ...SELECTORS.map((s) => wire(s, 'done', 'tdData', 'loadHistory')),
    // A description left open belongs to the task you left, so changing task closes it — and the
    // days picked belong to the routine you left.
    ...[...SELECTORS, 'tdDeselect'].map((s) => wire(s, 'done', 'tdCloseDesc', 'do')),
    ...[...SELECTORS, 'tdDeselect'].map((s) => wire(s, 'done', 'tdClearDays', 'do')),
    wire('tdRoutineSummary', 'dayKey', 'tdPickDay', 'in-key'),
    wire('tdDays', 'value', 'tdPickDay', 'in-days'),
    wire('tdRoutineSummary', 'pickDay', 'tdPickDay', 'run'),
    wire('tdPickDay', 'out-days', 'tdSetDays', 'value'),
    wire('tdPickDay', 'out-go', 'tdSetDays', 'do'),
    wire('tdNext', 'actionId', 'tdOpenDesc', 'value'),
    wire('tdNext', 'openDescription', 'tdOpenDesc', 'do'),
    wire('tdNext', 'closeDescription', 'tdCloseDesc', 'do'),
    // Leaving the description box both writes it and shuts it. The row can only say one
    // thing per update (see Todo/Action row), so the page is where the second job lives.
    wire('tdNext', 'describe', 'tdCloseDesc', 'do'),

    // Asking what happened — each producer on its own inputs
    wire('tdList', 'taskId', 'tdDialog', 'listTaskId'),
    wire('tdList', 'taskTitle', 'tdDialog', 'listTaskTitle'),
    wire('tdList', 'close', 'tdDialog', 'listClose'),
    wire('tdSelected', 'value', 'tdDialog', 'detailTaskId'),
    wire('tdSel', 'title', 'tdDialog', 'detailTaskTitle'),
    wire('tdSummary', 'close', 'tdDialog', 'detailClose'),
    wire('tdSummary', 'reopen', 'tdDialog', 'detailReopen'),
    wire('tdNext', 'actionId', 'tdDialog', 'actionId'),
    wire('tdNext', 'actionTitle', 'tdDialog', 'actionTitle'),
    wire('tdNext', 'tick', 'tdDialog', 'tick'),
    wire('tdNext', 'untick', 'tdDialog', 'untick'),
    wire('tdToday', 'targetId', 'tdDialog', 'todayTaskId'),
    wire('tdToday', 'title', 'tdDialog', 'todayTaskTitle'),
    wire('tdToday', 'close', 'tdDialog', 'todayClose'),
    wire('tdToday', 'rowId', 'tdDialog', 'occurrenceId'),
    wire('tdToday', 'title', 'tdDialog', 'occurrenceTitle'),
    wire('tdToday', 'check', 'tdDialog', 'check'),
    wire('tdRoutine', 'title', 'tdDialog', 'routineTitle'),
    wire('tdRoutineSummary', 'stop', 'tdDialog', 'detailStop'),

    // The commands
    wire('tdList', 'newTitle', 'cmdAdd', 'title'),
    wire('tdRows', 'nextPosition', 'cmdAdd', 'position'),
    wire('tdRows', 'addSummary', 'cmdAdd', 'summary'),
    wire('tdList', 'add', 'cmdAdd', 'do'),
    wire('cmdAdd', 'done', 'tdList', 'clearNew'),

    wire('tdRows', 'openRows', 'cmdDrag', 'rows'),
    wire('tdList', 'moveId', 'cmdDrag', 'taskId'),
    wire('tdList', 'moveTo', 'cmdDrag', 'toIndex'),
    wire('tdList', 'moved', 'cmdDrag', 'do'),
    wire('tdRows', 'openRows', 'cmdTop', 'rows'),
    wire('tdSelected', 'value', 'cmdTop', 'taskId'),
    wire('tdSummary', 'makeNext', 'cmdTop', 'do'),

    wire('tdRows', 'openRows', 'cmdClose', 'rows'),
    wire('tdDialog', 'dialogTaskId', 'cmdClose', 'taskId'),
    wire('tdDialog', 'note', 'cmdClose', 'note'),
    wire('tdDialog', 'confirmClose', 'cmdClose', 'do'),

    wire('tdDialog', 'dialogTaskId', 'cmdReopen', 'taskId'),
    wire('tdDialog', 'note', 'cmdReopen', 'note'),
    wire('tdRows', 'nextPosition', 'cmdReopen', 'position'),
    wire('tdRows', 'nextRank', 'cmdReopen', 'rank'),
    wire('tdDialog', 'confirmReopen', 'cmdReopen', 'do'),

    wire('tdSelected', 'value', 'cmdRename', 'taskId'),
    wire('tdSel', 'title', 'cmdRename', 'oldTitle'),
    wire('tdSummary', 'newTitle', 'cmdRename', 'newTitle'),
    wire('tdSummary', 'rename', 'cmdRename', 'do'),

    wire('tdSelected', 'value', 'cmdDeadline', 'taskId'),
    wire('tdSel', 'deadline', 'cmdDeadline', 'current'),
    wire('tdSummary', 'deadlineText', 'cmdDeadline', 'text'),
    wire('tdSummary', 'setDeadline', 'cmdDeadline', 'do'),
    wire('cmdDeadline', 'error', 'tdSummary', 'deadlineError'),
    wire('cmdDeadline', 'hasError', 'tdSummary', 'hasDeadlineError'),

    wire('tdSelected', 'value', 'cmdAddAction', 'taskId'),
    wire('tdNext', 'newTitle', 'cmdAddAction', 'title'),
    wire('tdSel', 'nextActionPosition', 'cmdAddAction', 'position'),
    wire('tdNext', 'add', 'cmdAddAction', 'do'),
    wire('cmdAddAction', 'done', 'tdNext', 'clearNew'),

    wire('tdSel', 'actionRows', 'cmdTick', 'rows'),
    wire('tdSelected', 'value', 'cmdTick', 'taskId'),
    wire('tdDialog', 'dialogActionId', 'cmdTick', 'actionId'),
    wire('tdDialog', 'note', 'cmdTick', 'note'),
    wire('tdDialog', 'confirmTick', 'cmdTick', 'do'),

    wire('tdSel', 'actionRows', 'cmdUntick', 'rows'),
    wire('tdSelected', 'value', 'cmdUntick', 'taskId'),
    wire('tdDialog', 'dialogActionId', 'cmdUntick', 'actionId'),
    wire('tdDialog', 'note', 'cmdUntick', 'note'),
    wire('tdSel', 'nextActionPosition', 'cmdUntick', 'position'),
    wire('tdDialog', 'confirmUntick', 'cmdUntick', 'do'),

    wire('tdSel', 'openActionRows', 'cmdActDrag', 'rows'),
    wire('tdSelected', 'value', 'cmdActDrag', 'taskId'),
    wire('tdNext', 'moveId', 'cmdActDrag', 'actionId'),
    wire('tdNext', 'moveTo', 'cmdActDrag', 'toIndex'),
    wire('tdNext', 'moved', 'cmdActDrag', 'do'),

    wire('tdSel', 'actionRows', 'cmdRenameAct', 'rows'),
    wire('tdSelected', 'value', 'cmdRenameAct', 'taskId'),
    wire('tdNext', 'actionId', 'cmdRenameAct', 'actionId'),
    wire('tdNext', 'actionTitleText', 'cmdRenameAct', 'newTitle'),
    wire('tdNext', 'rename', 'cmdRenameAct', 'do'),

    wire('tdSel', 'actionRows', 'cmdDescribe', 'rows'),
    wire('tdSelected', 'value', 'cmdDescribe', 'taskId'),
    wire('tdNext', 'actionId', 'cmdDescribe', 'actionId'),
    wire('tdNext', 'descriptionText', 'cmdDescribe', 'text'),
    wire('tdNext', 'describe', 'cmdDescribe', 'do'),

    wire('tdSelected', 'value', 'cmdNote', 'taskId'),
    wire('tdHistory', 'noteText', 'cmdNote', 'text'),
    wire('tdHistory', 'addNote', 'cmdNote', 'do'),
    wire('cmdNote', 'done', 'tdHistory', 'clearNote'),

    // TPL-008-RC — things that repeat
    wire('tdRoutines', 'newTitle', 'cmdAddRoutine', 'title'),
    wire('tdRoutines', 'add', 'cmdAddRoutine', 'do'),
    wire('cmdAddRoutine', 'done', 'tdRoutines', 'clearNew'),

    wire('tdData', 'routines', 'cmdRenameRoutine', 'routines'),
    wire('tdSelected', 'value', 'cmdRenameRoutine', 'routineId'),
    wire('tdRoutineSummary', 'newTitle', 'cmdRenameRoutine', 'newTitle'),
    wire('tdRoutineSummary', 'rename', 'cmdRenameRoutine', 'do'),

    ...([
      ['cmdDaily', 'pickDaily'],
      ['cmdWeekly', 'pickWeekly'],
      ['cmdMonthly', 'pickMonthly'],
      ['cmdAddTime', 'addTime'],
      ['cmdRemoveSlot', 'removeSlot']
    ] as const).flatMap(([cmd, signal]) => [
      wire('tdData', 'routines', cmd, 'routines'),
      wire('tdSelected', 'value', cmd, 'routineId'),
      wire('tdRoutineSummary', signal, cmd, 'do')
    ]),
    wire('tdDays', 'value', 'cmdAddTime', 'days'),
    wire('tdRoutineSummary', 'timeText', 'cmdAddTime', 'timeText'),
    wire('cmdAddTime', 'error', 'tdRoutineSummary', 'timeError'),
    wire('cmdAddTime', 'hasError', 'tdRoutineSummary', 'hasTimeError'),
    wire('cmdAddTime', 'done', 'tdRoutineSummary', 'clearTime'),
    wire('tdRoutineSummary', 'slotKey', 'cmdRemoveSlot', 'slotKey'),
    // A new timescale, or a time added to the days picked: the picks are spent.
    ...['cmdDaily', 'cmdWeekly', 'cmdMonthly', 'cmdAddTime'].map((cmd) => wire(cmd, 'done', 'tdClearDays', 'do')),

    wire('tdData', 'routines', 'cmdStart', 'routines'),
    wire('tdSelected', 'value', 'cmdStart', 'routineId'),
    wire('tdRoutineSummary', 'startText', 'cmdStart', 'text'),
    wire('tdRoutineSummary', 'setStart', 'cmdStart', 'do'),
    wire('cmdStart', 'error', 'tdRoutineSummary', 'startError'),
    wire('cmdStart', 'hasError', 'tdRoutineSummary', 'hasStartError'),
    wire('tdData', 'routines', 'cmdEnd', 'routines'),
    wire('tdSelected', 'value', 'cmdEnd', 'routineId'),
    wire('tdRoutineSummary', 'endText', 'cmdEnd', 'text'),
    wire('tdRoutineSummary', 'setEnd', 'cmdEnd', 'do'),
    wire('cmdEnd', 'error', 'tdRoutineSummary', 'endError'),
    wire('cmdEnd', 'hasError', 'tdRoutineSummary', 'hasEndError'),

    wire('tdTodayRows', 'rows', 'cmdCheck', 'rows'),
    wire('tdDialog', 'dialogOccurrenceId', 'cmdCheck', 'rowId'),
    wire('tdDialog', 'note', 'cmdCheck', 'note'),
    wire('tdDialog', 'confirmCheck', 'cmdCheck', 'do'),

    wire('tdDialog', 'dialogTaskId', 'cmdStop', 'routineId'),
    wire('tdDialog', 'note', 'cmdStop', 'note'),
    wire('tdDialog', 'confirmStop', 'cmdStop', 'do'),

    wire('tdSelected', 'value', 'cmdRoutineNote', 'taskId'),
    wire('tdRoutineHistory', 'noteText', 'cmdRoutineNote', 'text'),
    wire('tdRoutineHistory', 'addNote', 'cmdRoutineNote', 'do'),
    wire('cmdRoutineNote', 'done', 'tdRoutineHistory', 'clearNote'),

    // After any change, load everything again
    ...PAGE_COMMANDS.map(([id]) => wire(id, 'done', 'tdData', 'refresh'))
  ]
};

// ════════════════════════════════════════════════════════════════════════════
// The App shell and the order the plan is given
// ════════════════════════════════════════════════════════════════════════════

export const APP_NODES = [
  group('app_root', 'App', undefined, { sizeMode: 'explicit', width: pct(100), height: pct(100), backgroundColor: 'var(--background)', flexDirection: 'column' }),
  { id: 'app_router', type: 'Router', label: 'Main router', parent: 'app_root', parameters: { name: ROUTER } },
  // 🔴 With body scroll on, the App's 100% height is the content's height, so the
  // ground stopped under a short list and the rest of the window was white. Found by
  // LOOKING at the drive's screenshots; no check in either suite could see it.
  // The same stylesheet holds the dark palette and decides which theme icon shows.
  logic('app_css', 'CSS Definition', 'The page ground, the dark palette, which theme icon shows and whether the bell does', { style: themeCss() }),
  // Nothing wired into it, so it runs once at load: a theme the person chose is put back on every page.
  logic('app_theme', FUNCTION, 'Put back the theme the person chose', { functionScript: THEME_BOOT_SCRIPT }),
  // TPL-010-L L5 — the same, for a link to one task: kept before the router moves the page, or
  // the sign-in detour, can drop the query. `Pages/Todo` reads it once it knows who you are.
  logic('app_link', FUNCTION, 'Remember the task a link asked for', { functionScript: LINK_BOOT_SCRIPT })
];
export const APP_WIRES: unknown[] = [];

/**
 * Leaves first, then what places them, then the pages — and `Pages/Todo` before
 * `Pages/Sign in`, because the first page registered becomes the start page and a
 * signed-in person should land on their list.
 */
export const TPL008_COMPONENTS: ReadonlyArray<Tpl008Component> = [
  WRITE_HISTORY,
  ADD_TASK,
  MOVE_TASK,
  CLOSE_TASK,
  REOPEN_TASK,
  RENAME_TASK,
  SET_DEADLINE,
  ADD_ACTION,
  TICK_ACTION,
  UNTICK_ACTION,
  MOVE_ACTION,
  RENAME_ACTION,
  DESCRIBE_ACTION,
  ADD_NOTE,
  ADD_ROUTINE,
  RENAME_ROUTINE,
  SET_SCHEDULE,
  SET_ROUTINE_DATES,
  TICK_ROUTINE,
  STOP_ROUTINE,
  TASK_ROWS,
  SELECTED_TASK,
  LOG_ROWS,
  TODAY_ROWS,
  SELECTED_ROUTINE,
  TODO_DATA,
  THEME_SWITCH,
  REMINDERS_SWITCH,
  DATE_PICKER,
  HEADER,
  PROBLEM_BANNER,
  TASK_ROW,
  TASK_LIST,
  DONE_ROW,
  DONE_LIST,
  LOG_ENTRY,
  LOG_LIST,
  TASK_SUMMARY,
  ACTION_ROW,
  NEXT_ACTIONS,
  HISTORY_ENTRY,
  HISTORY,
  TODAY_ROW,
  TODAY_LIST,
  ROUTINE_ROW,
  ROUTINE_LIST,
  DAY_CHIP,
  SLOT_CHIP,
  ROUTINE_SUMMARY,
  NOTE_DIALOG,
  DIALOG_FLOW,
  PAGE_TODO,
  PAGE_SIGN_IN
];
