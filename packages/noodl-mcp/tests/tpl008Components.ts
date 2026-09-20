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
export const COLLECTIONS = ['Task', 'Action', 'Event'] as const;
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
  openAction: 'todoOpenAction'
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
const icon = (code: string) => ({ class: 'lucide', code, codeAsClass: true });

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
 * 🔴 **D72 — a Button has no accessible-name port**, so an icon button with `label: ''`
 * is a `<button>` with no name: silent to a screen reader. The label IS the name —
 * `Button.tsx` writes it inside the `<button>` — and `font-size: 0` on the button hides
 * the words while the icon keeps its own size (`iconSize` is set on the glyph). The
 * drive reads the names back from Chrome's accessibility tree.
 */
const HIDDEN_LABEL = 'font-size: 0;';
/** A ghost button's box without its type size: `font-size: 0` is the only size these carry. */
const BTN_ICON = (code: string, name: string) => ({
  backgroundColor: 'transparent',
  color: 'var(--foreground)',
  borderStyle: 'none',
  borderRadius: 'var(--radius-md)',
  paddingTop: 'var(--space-2)',
  paddingBottom: 'var(--space-2)',
  sizeMode: 'contentSize',
  label: name,
  styleCss: HIDDEN_LABEL,
  useIcon: true,
  iconSourceType: 'icon',
  iconIconSource: icon(code),
  iconSize: 16,
  iconSpacing: 0,
  iconColor: 'var(--muted-foreground)',
  paddingLeft: 'var(--space-2)',
  paddingRight: 'var(--space-2)'
});
/** The round tick box. Its fill and colours are wired, so a done row and an open row share one node. */
const BTN_CHECK = {
  styleCss: HIDDEN_LABEL,
  useIcon: true,
  iconSourceType: 'icon',
  iconIconSource: icon('icon-check'),
  iconSize: 14,
  iconSpacing: 0,
  iconColor: 'var(--border-control)',
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
    'The app name, the three views (List, Done, Log), Sign out, the reminders bell and the theme switch. Tab is the view that is showing.',
  instantiates: [C.remindersSwitch, C.themeSwitch],
  ...iface(
    [['tab', 'string'], ['listLabel', 'string'], ['doneLabel', 'string']],
    [['pickList', 'signal'], ['pickDone', 'signal'], ['pickLog', 'signal'], ['signOut', 'signal']]
  ),
  nodes: [
    inputs('hdIn', 'The view', [['tab', 'string'], ['listLabel', 'string'], ['doneLabel', 'string']]),
    outputs('hdOut', 'What was picked', [['pickList', 'signal'], ['pickDone', 'signal'], ['pickLog', 'signal'], ['signOut', 'signal']]),
    group('hdRoot', 'Header', undefined, { ...ROW('var(--space-4)'), justifyContent: 'space-between', flexWrap: 'wrap' }),
    text('hdTitle', 'App name', 'hdRoot', 'Todo list', { ...T_TITLE, as: 'h1', sizeMode: 'contentSize' }),
    group('hdNav', 'Views', 'hdRoot', { flexDirection: 'row', alignItems: 'center', columnGap: 'var(--space-1)', sizeMode: 'contentSize' }),
    place('hdList', BUTTON, 'List', 'hdNav', { ...BTN_GHOST, label: 'List' }),
    place('hdDone', BUTTON, 'Done', 'hdNav', { ...BTN_GHOST, label: 'Done' }),
    place('hdLog', BUTTON, 'Log', 'hdNav', { ...BTN_GHOST, label: 'Log' }),
    place('hdSignOut', BUTTON, 'Sign out', 'hdNav', { ...BTN_GHOST, label: 'Sign out', color: 'var(--muted-foreground)' }),
    place('hdReminders', C.remindersSwitch, 'Deadline reminders', 'hdNav'),
    place('hdTheme', C.themeSwitch, 'Light or dark', 'hdNav'),
    logic('hdLook', STATES, 'Which view is showing', {
      states: 'list,done,log',
      currentState: 'list',
      values: 'listBg,doneBg,logBg',
      'type-listBg': 'color',
      'type-doneBg': 'color',
      'type-logBg': 'color',
      'value-list-listBg': 'var(--muted)',
      'value-list-doneBg': 'transparent',
      'value-list-logBg': 'transparent',
      'value-done-listBg': 'transparent',
      'value-done-doneBg': 'var(--muted)',
      'value-done-logBg': 'transparent',
      'value-log-listBg': 'transparent',
      'value-log-doneBg': 'transparent',
      'value-log-logBg': 'var(--muted)',
      useTransitions: false
    })
  ],
  connections: [
    wire('hdIn', 'tab', 'hdLook', 'currentState'),
    wire('hdIn', 'listLabel', 'hdList', 'label'),
    wire('hdIn', 'doneLabel', 'hdDone', 'label'),
    wire('hdLook', 'listBg', 'hdList', 'backgroundColor'),
    wire('hdLook', 'doneBg', 'hdDone', 'backgroundColor'),
    wire('hdLook', 'logBg', 'hdLog', 'backgroundColor'),
    wire('hdList', 'onClick', 'hdOut', 'pickList'),
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
  ['bg', 'string'],
  ['canUp', 'boolean'],
  ['canDown', 'boolean']
];

const TASK_ROW: Tpl008Component = {
  path: 'Todo/Task row',
  description: 'One open task: its place in the list, its title, its deadline and next action, and buttons to move it up, move it down or close it.',
  ...iface(TASK_ROW_FIELDS, [['open', 'signal'], ['up', 'signal'], ['down', 'signal'], ['close', 'signal'], ['id', 'string'], ['title', 'string']]),
  nodes: [
    inputs('trIn', 'The task', TASK_ROW_FIELDS),
    outputs('trOut', 'What you did to it', [['open', 'signal'], ['up', 'signal'], ['down', 'signal'], ['close', 'signal'], ['id', 'string'], ['title', 'string']]),
    group('trRow', 'Row', undefined, {
      ...ROW('var(--space-2)'),
      ...RULE_BELOW,
      paddingLeft: 'var(--space-2)',
      paddingRight: 'var(--space-2)',
      paddingTop: 'var(--space-2)',
      paddingBottom: 'var(--space-2)'
    }),
    text('trRank', 'Its place', 'trRow', '', { ...T_META, sizeMode: 'contentHeight', width: px(28), textAlignX: 'right', fontVariantNumeric: 'tabular-nums' }),
    group('trMain', 'Title and what is next', 'trRow', { ...COLUMN('var(--space-0-5)'), paddingTop: 'var(--space-1)', paddingBottom: 'var(--space-1)' }),
    text('trTitle', 'Title', 'trMain', '', wide(T_BODY)),
    text('trMeta', 'Deadline and next action', 'trMain', '', wide(T_META)),
    place('trUp', BUTTON, 'Move up', 'trRow', BTN_ICON('icon-chevron-up', 'Move up')),
    place('trDown', BUTTON, 'Move down', 'trRow', BTN_ICON('icon-chevron-down', 'Move down')),
    place('trClose', BUTTON, 'Close it', 'trRow', { ...BTN_CHECK, label: 'Close this task', marginLeft: 'var(--space-1)' })
  ],
  connections: [
    wire('trIn', 'rank', 'trRank', 'text'),
    wire('trIn', 'title', 'trTitle', 'text'),
    wire('trIn', 'titleWeight', 'trTitle', 'fontWeight'),
    wire('trIn', 'meta', 'trMeta', 'text'),
    wire('trIn', 'hasMeta', 'trMeta', 'mounted'),
    wire('trIn', 'metaColor', 'trMeta', 'color'),
    wire('trIn', 'bg', 'trRow', 'backgroundColor'),
    wire('trIn', 'canUp', 'trUp', 'enabled'),
    wire('trIn', 'canDown', 'trDown', 'enabled'),
    wire('trIn', 'id', 'trOut', 'id'),
    wire('trIn', 'title', 'trOut', 'title'),
    wire('trMain', 'onClick', 'trOut', 'open'),
    wire('trUp', 'onClick', 'trOut', 'up'),
    wire('trDown', 'onClick', 'trOut', 'down'),
    wire('trClose', 'onClick', 'trOut', 'close')
  ]
};

/** Trim what was typed; publish it and pulse Go only if there is something. */
const SUBMIT_SCRIPT = "var t = String(Inputs.text || '').trim();\nif (t === '') return;\nOutputs.text = t;\nOutputs.go();";
const COUNT_SCRIPT = 'Outputs.empty = (Inputs.rows || []).length === 0;';

const TASK_LIST: Tpl008Component = {
  path: 'Todo/Task list',
  description: 'The open tasks in order, one Task row each, and the box that adds a task at the bottom. Clear New empties the box.',
  ...iface(
    [['rows', 'array'], ['placeholder', 'string'], ['clearNew', 'signal']],
    [['open', 'signal'], ['up', 'signal'], ['down', 'signal'], ['close', 'signal'], ['add', 'signal'], ['taskId', 'string'], ['taskTitle', 'string'], ['newTitle', 'string']]
  ),
  repeats: { source: 'array', rowFields: TASK_ROW_FIELDS.map(([n]) => n) },
  instantiates: [C.taskRow],
  nodes: [
    inputs('tlIn', 'The rows', [['rows', 'array'], ['placeholder', 'string'], ['clearNew', 'signal']]),
    outputs('tlOut', 'What happened in the list', [
      ['open', 'signal'], ['up', 'signal'], ['down', 'signal'], ['close', 'signal'], ['add', 'signal'],
      ['taskId', 'string'], ['taskTitle', 'string'], ['newTitle', 'string']
    ]),
    group('tlRoot', 'Task list', undefined, COLUMN('var(--space-3)')),
    group('tlRows', 'The rows', 'tlRoot', { ...COLUMN('var(--space-0)'), borderTopStyle: 'solid', borderTopWidth: 'var(--border-1)', borderTopColor: 'var(--border-subtle)' }),
    place('tlEach', FOR_EACH, 'One row per open task', 'tlRows', { template: C.taskRow, templateType: 'explicit' }),
    text('tlEmpty', 'When there is nothing to do', 'tlRoot', 'Nothing on the list. Add the next thing you need to do.', wide(T_META)),
    group('tlAdd', 'Add a task', 'tlRoot', ROW('var(--space-2)')),
    place('tlField', TEXT_INPUT, 'New task', 'tlAdd', { ...FIELD, placeholder: 'Add a task' }),
    place('tlButton', BUTTON, 'Add', 'tlAdd', { ...BTN_PRIMARY, label: 'Add' }),
    derive('tlCount', 'Is the list empty?', COUNT_SCRIPT),
    script('tlSubmit', 'The title, if one was typed', SUBMIT_SCRIPT, ['text'])
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
    wire('tlEach', 'itemOutputSignal-up', 'tlOut', 'up'),
    wire('tlEach', 'itemOutputSignal-down', 'tlOut', 'down'),
    wire('tlEach', 'itemOutputSignal-close', 'tlOut', 'close'),
    wire('tlEach', 'itemOutput-id', 'tlOut', 'taskId'),
    wire('tlEach', 'itemOutput-title', 'tlOut', 'taskTitle')
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
  ['canUp', 'boolean'],
  ['canDown', 'boolean'],
  ['checkBg', 'string'],
  ['checkIconColor', 'string'],
  ['checkBorder', 'string'],
  ['checkLabel', 'string']
];
const ACTION_ROW_OUTS: Array<[string, string]> = [
  ['tick', 'signal'],
  ['untick', 'signal'],
  ['up', 'signal'],
  ['down', 'signal'],
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

/** Lines up a row's second line with its title: number (20) + gap (8) + tick (26) + gap (8). */
const ACTION_INDENT = 62;

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
    'One next action: its number, a tick box, its title (edit it in place, Enter saves) and the buttons that move it. Description opens a box for what it involves; leaving the box, or Save, writes it and closes it. A ticked action shows what happened instead of a number.',
  ...iface(ACTION_ROW_FIELDS, ACTION_ROW_OUTS),
  nodes: [
    inputs('arIn', 'The next action', ACTION_ROW_FIELDS),
    outputs('arOut', 'What you did to it', ACTION_ROW_OUTS),
    group('arRoot', 'Next action', undefined, { ...COLUMN('var(--space-0)'), ...RULE_BELOW, paddingTop: 'var(--space-1)', paddingBottom: 'var(--space-1)' }),
    group('arTop', 'The line', 'arRoot', ROW('var(--space-2)')),
    text('arNum', 'Its place', 'arTop', '', { ...T_META, sizeMode: 'contentHeight', width: px(20), textAlignX: 'right', fontVariantNumeric: 'tabular-nums' }),
    place('arCheck', BUTTON, 'Tick box', 'arTop', { ...BTN_CHECK, label: 'Mark done' }),
    place('arTitle', TEXT_INPUT, 'Title', 'arTop', ROW_TITLE_FIELD),
    place('arDescOpen', BUTTON, 'Open the description', 'arTop', BTN_ICON('icon-align-left', 'Description')),
    group('arMove', 'Move buttons', 'arTop', { flexDirection: 'row', alignItems: 'center', sizeMode: 'contentSize' }),
    place('arUp', BUTTON, 'Move up', 'arMove', BTN_ICON('icon-chevron-up', 'Move up')),
    place('arDown', BUTTON, 'Move down', 'arMove', BTN_ICON('icon-chevron-down', 'Move down')),
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
    wire('arIn', 'canMove', 'arMove', 'mounted'),
    wire('arIn', 'canUp', 'arUp', 'enabled'),
    wire('arIn', 'canDown', 'arDown', 'enabled'),
    wire('arIn', 'checkBg', 'arCheck', 'backgroundColor'),
    wire('arIn', 'checkIconColor', 'arCheck', 'iconColor'),
    wire('arIn', 'checkBorder', 'arCheck', 'borderColor'),
    wire('arIn', 'checkLabel', 'arCheck', 'label'),
    wire('arIn', 'done', 'arWhich', 'condition'),
    wire('arIn', 'id', 'arOut', 'id'),
    wire('arIn', 'title', 'arOut', 'title'),
    wire('arCheck', 'onClick', 'arWhich', 'eval'),
    wire('arWhich', 'ontrue', 'arOut', 'untick'),
    wire('arWhich', 'onfalse', 'arOut', 'tick'),
    wire('arUp', 'onClick', 'arOut', 'up'),
    wire('arDown', 'onClick', 'arOut', 'down'),
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
    'A task’s next actions in order — open ones numbered, ticked ones after — and the box that adds one at the bottom. Which one has its description open is the page’s to hold, so only ever one does.',
  ...iface(
    [['rows', 'array'], ['clearNew', 'signal']],
    [
      ['tick', 'signal'], ['untick', 'signal'], ['up', 'signal'], ['down', 'signal'], ['rename', 'signal'],
      ['openDescription', 'signal'], ['closeDescription', 'signal'], ['describe', 'signal'], ['add', 'signal'],
      ['actionId', 'string'], ['actionTitle', 'string'], ['actionTitleText', 'string'], ['descriptionText', 'string'], ['newTitle', 'string']
    ]
  ),
  repeats: { source: 'array', rowFields: ACTION_ROW_FIELDS.map(([n]) => n) },
  instantiates: [C.actionRow],
  nodes: [
    inputs('naIn', 'The next actions', [['rows', 'array'], ['clearNew', 'signal']]),
    outputs('naOut', 'What you did', [
      ['tick', 'signal'], ['untick', 'signal'], ['up', 'signal'], ['down', 'signal'], ['rename', 'signal'],
      ['openDescription', 'signal'], ['closeDescription', 'signal'], ['describe', 'signal'], ['add', 'signal'],
      ['actionId', 'string'], ['actionTitle', 'string'], ['actionTitleText', 'string'], ['descriptionText', 'string'], ['newTitle', 'string']
    ]),
    group('naRoot', 'Next actions', undefined, COLUMN('var(--space-2)')),
    text('naHeading', 'Heading', 'naRoot', 'Next actions', { ...wide(T_HEADING), as: 'h2' }),
    group('naRows', 'The rows', 'naRoot', COLUMN('var(--space-0)')),
    place('naEach', FOR_EACH, 'One row per next action', 'naRows', { template: C.actionRow, templateType: 'explicit' }),
    group('naAdd', 'Add a next action', 'naRoot', ROW('var(--space-2)')),
    place('naField', TEXT_INPUT, 'New next action', 'naAdd', { ...FIELD, placeholder: 'Add a next action' }),
    place('naButton', BUTTON, 'Add', 'naAdd', { ...BTN_OUTLINE, label: 'Add' }),
    script('naSubmit', 'The title, if one was typed', SUBMIT_SCRIPT, ['text'])
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
    wire('naEach', 'itemOutputSignal-up', 'naOut', 'up'),
    wire('naEach', 'itemOutputSignal-down', 'naOut', 'down'),
    wire('naEach', 'itemOutputSignal-rename', 'naOut', 'rename'),
    wire('naEach', 'itemOutputSignal-openDescription', 'naOut', 'openDescription'),
    wire('naEach', 'itemOutputSignal-closeDescription', 'naOut', 'closeDescription'),
    wire('naEach', 'itemOutputSignal-describe', 'naOut', 'describe'),
    wire('naEach', 'itemOutput-id', 'naOut', 'actionId'),
    wire('naEach', 'itemOutput-title', 'naOut', 'actionTitle'),
    wire('naEach', 'itemOutput-titleText', 'naOut', 'actionTitleText'),
    wire('naEach', 'itemOutput-descriptionText', 'naOut', 'descriptionText')
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

const DIALOG_INS: Array<[string, string]> = [['open', 'boolean'], ['subject', 'string'], ['heading', 'string'], ['help', 'string'], ['okLabel', 'string']];
const DIALOG_OUTS: Array<[string, string]> = [['confirm', 'signal'], ['cancel', 'signal'], ['note', 'string']];

const NOTE_DIALOG: Tpl008Component = {
  path: 'Todo/Note dialog',
  description:
    'The "what happened?" dialog every close, reopen, tick and untick goes through. The OK button stays disabled until something is written, so there is always a note.',
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
    derive('ndCheck', 'Has something been written?', "var t = String(Inputs.text || '').trim();\nOutputs.ok = t !== '';\nOutputs.note = t;")
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
    wire('ndCheck', 'out-ok', 'ndOk', 'enabled'),
    wire('ndCheck', 'out-note', 'ndOut', 'note'),
    wire('ndOk', 'onClick', 'ndOut', 'confirm'),
    wire('ndCancel', 'onClick', 'ndOut', 'cancel')
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
    canUp: r > 0,
    canDown: r < open.length - 1,
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
    canUp: !isDone && index > 0,
    canDown: !isDone && index < count - 1,
    checkBg: isDone ? 'var(--primary)' : 'transparent',
    checkIconColor: isDone ? 'var(--primary-foreground)' : 'var(--border-control)',
    checkBorder: isDone ? 'var(--primary)' : 'var(--border-control)',
    checkLabel: isDone ? 'Mark not done' : 'Mark done',
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
var titles = {};
for (var i = 0; i < tasks.length; i++) if (tasks[i]) titles[tasks[i].id] = String(tasks[i].title || '');
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
  description: 'Turns the recent history across all tasks into log lines, newest first, naming the task each line is about.',
  ...iface([['events', 'array'], ['tasks', 'array']], [['rows', 'array']]),
  nodes: [
    inputs('lrIn', 'The records', [['events', 'array'], ['tasks', 'array']]),
    outputs('lrOut', 'The lines', [['rows', 'array']]),
    derive('lrBuild', 'Build the lines', LOG_ROWS_SCRIPT)
  ],
  connections: [
    wire('lrIn', 'events', 'lrBuild', 'in-events'),
    wire('lrIn', 'tasks', 'lrBuild', 'in-tasks'),
    wire('lrBuild', 'out-rows', 'lrOut', 'rows')
  ]
};

/** Kinds that extend the previous line instead of adding one, when repeated within two minutes. */
export const MERGING_KINDS = ['moved', 'action-moved', 'deadline', 'action-described'] as const;
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
var j = dir === 'up' ? i - 1 : dir === 'down' ? i + 1 : 0;
if (j < 0 || j >= rows.length || j === i) return;
Outputs.firstId = id;
Outputs.from = i + 1;
Outputs.to = j + 1;
if (dir === 'top') {
  // Above whatever is first now. Nobody else's row is rewritten.
  Outputs.firstPosition = Number(rows[0].position) - 1;
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
    ins: itemPort === 'taskId' ? [['rows', 'array'], ['taskId', 'string'], ['direction', 'string']] : [['rows', 'array'], ['taskId', 'string'], [itemPort, 'string'], ['direction', 'string']],
    guard: MOVE_SCRIPT,
    guardIns: ['rows', 'direction'],
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
  'Moves a task up or down one place (swapping with its neighbour) or to the top. Place it with Direction set to up, down or top.',
  'Task',
  'taskId',
  'moved'
);

/** A next action's move writes one fixed sentence, so the script says it. */
const MOVE_ACTION_BASE = moveCommand(
  'Commands/Move action',
  'Moves a next action up or down one place. Place it with Direction set to up or down.',
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
  states: 'none,close,reopen,tick,untick',
  currentState: 'none',
  values: 'open,heading,help,ok',
  'type-open': 'boolean',
  'type-heading': 'string',
  'type-help': 'string',
  'type-ok': 'string',
  'value-none-open': false,
  'value-close-open': true,
  'value-close-heading': 'What happened?',
  'value-close-help': 'Every task keeps a record. One line is enough, even “not needed, dropping it”.',
  'value-close-ok': 'Close task',
  'value-reopen-open': true,
  'value-reopen-heading': 'Why is it back?',
  'value-reopen-help': 'It goes back in at the bottom of the list.',
  'value-reopen-ok': 'Reopen',
  'value-tick-open': true,
  'value-tick-heading': 'What happened?',
  'value-tick-help': 'A line is enough.',
  'value-tick-ok': 'Tick off',
  'value-untick-open': true,
  'value-untick-heading': 'Why is it back?',
  'value-untick-help': 'It goes back in at the bottom of the next actions.',
  'value-untick-ok': 'Untick',
  useTransitions: false
};

/** Every command the page places: id, component, instance parameters. */
const PAGE_COMMANDS: Array<[string, string, Record<string, unknown>?]> = [
  ['cmdAdd', C.addTask],
  ['cmdUp', C.moveTask, { direction: 'up' }],
  ['cmdDown', C.moveTask, { direction: 'down' }],
  ['cmdTop', C.moveTask, { direction: 'top' }],
  ['cmdClose', C.closeTask],
  ['cmdReopen', C.reopenTask],
  ['cmdRename', C.renameTask],
  ['cmdDeadline', C.setDeadline],
  ['cmdAddAction', C.addAction],
  ['cmdTick', C.tickAction],
  ['cmdUntick', C.untickAction],
  ['cmdActUp', C.moveAction, { direction: 'up' }],
  ['cmdActDown', C.moveAction, { direction: 'down' }],
  ['cmdRenameAct', C.renameAction],
  ['cmdDescribe', C.describeAction],
  ['cmdNote', C.addNote]
];

const QUERY_OFF = { 'runOnChange-collectionName': false, 'runOnChange-querySettings': false, storageEnableLimit: true };

const DIALOG_FLOW_INS: Array<[string, string]> = [
  ['listTaskId', 'string'], ['listTaskTitle', 'string'], ['listClose', 'signal'],
  ['detailTaskId', 'string'], ['detailTaskTitle', 'string'], ['detailClose', 'signal'], ['detailReopen', 'signal'],
  ['actionId', 'string'], ['actionTitle', 'string'], ['tick', 'signal'], ['untick', 'signal']
];
const DIALOG_FLOW_OUTS: Array<[string, string]> = [
  ['dialogTaskId', 'string'], ['dialogActionId', 'string'], ['note', 'string'],
  ['confirmClose', 'signal'], ['confirmReopen', 'signal'], ['confirmTick', 'signal'], ['confirmUntick', 'signal']
];

/**
 * Out of `Pages/Todo` in s2, when the page was 70 nodes. Every producer still has its
 * OWN input and its own `Set Variable` — the list's close and the detail pane's close
 * never share a value port (see the module header).
 */
const DIALOG_FLOW: Tpl008Component = {
  path: 'Todo/Dialog flow',
  description:
    'Asks "what happened?" before a close, a reopen, a tick or an untick: remembers which task or next action it is about, shows the dialog, and says which question was answered.',
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
    logic('dfIfClose', CONDITION, 'Was it closing?', signalOnly('condition')),
    logic('dfIfReopen', CONDITION, 'Was it reopening?', signalOnly('condition')),
    logic('dfIfTick', CONDITION, 'Was it ticking?', signalOnly('condition')),
    logic('dfIfUntick', CONDITION, 'Was it unticking?', signalOnly('condition'))
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

    // Showing the question
    wire('dfMode', 'open', 'dfDialog', 'open'),
    wire('dfMode', 'heading', 'dfDialog', 'heading'),
    wire('dfMode', 'help', 'dfDialog', 'help'),
    wire('dfMode', 'ok', 'dfDialog', 'okLabel'),
    wire('dfSubject', 'value', 'dfDialog', 'subject'),
    wire('dfDialog', 'cancel', 'dfMode', 'to-none'),

    // Answering it: test which question it was, THEN close it
    wire('dfMode', 'at-close', 'dfIfClose', 'condition'),
    wire('dfMode', 'at-reopen', 'dfIfReopen', 'condition'),
    wire('dfMode', 'at-tick', 'dfIfTick', 'condition'),
    wire('dfMode', 'at-untick', 'dfIfUntick', 'condition'),
    ...['dfIfClose', 'dfIfReopen', 'dfIfTick', 'dfIfUntick'].flatMap((g) => [wire('dfDialog', 'confirm', g, 'eval'), wire(g, 'ontrue', 'dfMode', 'to-none')]),
    wire('dfIfClose', 'ontrue', 'dfOut', 'confirmClose'),
    wire('dfIfReopen', 'ontrue', 'dfOut', 'confirmReopen'),
    wire('dfIfTick', 'ontrue', 'dfOut', 'confirmTick'),
    wire('dfIfUntick', 'ontrue', 'dfOut', 'confirmUntick'),
    wire('dfTask', 'value', 'dfOut', 'dialogTaskId'),
    wire('dfAction', 'value', 'dfOut', 'dialogActionId'),
    wire('dfDialog', 'note', 'dfOut', 'note')
  ]
};

const TODO_DATA_INS: Array<[string, string]> = [['refresh', 'signal'], ['loadHistory', 'signal'], ['hasTask', 'boolean']];
const TODO_DATA_OUTS: Array<[string, string]> = [['tasks', 'array'], ['actions', 'array'], ['events', 'array'], ['recent', 'array']];

/** Out of `Pages/Todo` in s2, with the queries' wiring unchanged. */
const TODO_DATA: Tpl008Component = {
  path: 'Logic/Todo data',
  description:
    'The four queries: your tasks, your next actions, the selected task’s history, and recent history across all tasks. Refresh loads them all again; a task’s history is only asked for when a task is selected.',
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
    logic('dtHasTask', CONDITION, 'Is a task selected?', signalOnly('condition')),
    logic('dtLoadProblem', SET_VARIABLE, 'Say the list did not load', { name: VAR.problem, setWith: 'string', value: LOAD_PROBLEM_TEXT })
  ],
  connections: [
    ...['dtTasks', 'dtActions', 'dtRecent'].map((q) => wire('dtIn', 'refresh', q, 'storageFetch')),
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
    wire('dtRecent', 'items', 'dtOut', 'recent')
  ]
};

const PAGE_TODO: Tpl008Component = {
  path: 'Pages/Todo',
  description:
    'The app: the list (or Done, or the Log) beside the selected task. Holds the selection, places the data and the dialog flow, and wires every button to its command. Signed-out visitors are sent to Sign in.',
  instantiates: [
    C.header, C.problem, C.taskList, C.doneList, C.logList, C.summary, C.nextActions, C.history, C.dialogFlow,
    C.todoData, C.taskRows, C.selected, C.logRows,
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
    text('tdEmpty', 'When nothing is selected', 'tdRight', 'Select a task to see its details.', { ...wide(T_META), textAlignX: 'center' }),
    group('tdDetail', 'Task detail', 'tdRight', { ...COLUMN('var(--space-6)'), mounted: false }),
    place('tdSummary', C.summary, 'Summary', 'tdDetail'),
    place('tdNext', C.nextActions, 'Next actions', 'tdDetail'),
    place('tdHistory', C.history, 'History', 'tdDetail'),
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
    logic('tdScreen', 'Screen Resolution', 'How wide the screen is'),
    derive(
      'tdLayout',
      'One pane or two?',
      'var narrow = (Inputs.width || 1200) < 820;\nvar found = !!Inputs.found;\nOutputs.narrow = narrow;\nOutputs.showLeft = !(narrow && found);\nOutputs.showRight = !narrow || found;'
    ),
    logic('tdTab', STATES, 'Which view', { states: 'list,done,log', currentState: 'list', useTransitions: false }),

    // The selection — one Set Variable per producer (see the module header)
    logic('tdSelected', VARIABLE, 'The selected task', { name: VAR.selected }),
    logic('tdSelectFromList', SET_VARIABLE, 'Select from the list', { name: VAR.selected, setWith: 'string' }),
    logic('tdSelectFromDone', SET_VARIABLE, 'Select from Done', { name: VAR.selected, setWith: 'string' }),
    logic('tdSelectFromLog', SET_VARIABLE, 'Select from the log', { name: VAR.selected, setWith: 'string' }),
    logic('tdDeselect', SET_VARIABLE, 'Back to the list', { name: VAR.selected, setWith: 'emptyString' }),

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
    wire('tdAuth', 'onfalse', 'tdToSignIn', 'navigate'),
    wire('tdHeader', 'signOut', 'tdLogOut', 'login'),
    wire('tdLogOut', 'done', 'tdToSignIn', 'navigate'),

    // Loading
    wire('tdSel', 'found', 'tdData', 'hasTask'),
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

    // Views
    wire('tdTab', 'currentState', 'tdHeader', 'tab'),
    wire('tdRows', 'listLabel', 'tdHeader', 'listLabel'),
    wire('tdRows', 'doneLabel', 'tdHeader', 'doneLabel'),
    wire('tdHeader', 'pickList', 'tdTab', 'to-list'),
    wire('tdHeader', 'pickDone', 'tdTab', 'to-done'),
    wire('tdHeader', 'pickLog', 'tdTab', 'to-log'),
    wire('tdTab', 'at-list', 'tdListView', 'mounted'),
    wire('tdTab', 'at-done', 'tdDoneView', 'mounted'),
    wire('tdTab', 'at-log', 'tdLogView', 'mounted'),
    wire('tdScreen', 'width', 'tdLayout', 'in-width'),
    wire('tdSel', 'found', 'tdLayout', 'in-found'),
    wire('tdLayout', 'out-showLeft', 'tdLeft', 'mounted'),
    wire('tdLayout', 'out-showRight', 'tdRight', 'mounted'),
    wire('tdLayout', 'out-narrow', 'tdSummary', 'narrow'),

    // The panes
    wire('tdRows', 'openRows', 'tdList', 'rows'),
    wire('tdRows', 'addPlaceholder', 'tdList', 'placeholder'),
    wire('tdRows', 'doneRows', 'tdDone', 'rows'),
    wire('tdLogRows', 'rows', 'tdLog', 'rows'),
    wire('tdSel', 'found', 'tdDetail', 'mounted'),
    wire('tdSel', 'notFound', 'tdEmpty', 'mounted'),
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
    ...['tdSelectFromList', 'tdSelectFromDone', 'tdSelectFromLog'].map((s) => wire(s, 'done', 'tdData', 'loadHistory')),
    // A description left open belongs to the task you left, so changing task closes it.
    ...['tdSelectFromList', 'tdSelectFromDone', 'tdSelectFromLog', 'tdDeselect'].map((s) => wire(s, 'done', 'tdCloseDesc', 'do')),
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

    // The commands
    wire('tdList', 'newTitle', 'cmdAdd', 'title'),
    wire('tdRows', 'nextPosition', 'cmdAdd', 'position'),
    wire('tdRows', 'addSummary', 'cmdAdd', 'summary'),
    wire('tdList', 'add', 'cmdAdd', 'do'),
    wire('cmdAdd', 'done', 'tdList', 'clearNew'),

    wire('tdRows', 'openRows', 'cmdUp', 'rows'),
    wire('tdList', 'taskId', 'cmdUp', 'taskId'),
    wire('tdList', 'up', 'cmdUp', 'do'),
    wire('tdRows', 'openRows', 'cmdDown', 'rows'),
    wire('tdList', 'taskId', 'cmdDown', 'taskId'),
    wire('tdList', 'down', 'cmdDown', 'do'),
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

    wire('tdSel', 'openActionRows', 'cmdActUp', 'rows'),
    wire('tdSelected', 'value', 'cmdActUp', 'taskId'),
    wire('tdNext', 'actionId', 'cmdActUp', 'actionId'),
    wire('tdNext', 'up', 'cmdActUp', 'do'),
    wire('tdSel', 'openActionRows', 'cmdActDown', 'rows'),
    wire('tdSelected', 'value', 'cmdActDown', 'taskId'),
    wire('tdNext', 'actionId', 'cmdActDown', 'actionId'),
    wire('tdNext', 'down', 'cmdActDown', 'do'),

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
  logic('app_theme', FUNCTION, 'Put back the theme the person chose', { functionScript: THEME_BOOT_SCRIPT })
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
  TASK_ROWS,
  SELECTED_TASK,
  LOG_ROWS,
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
  NOTE_DIALOG,
  DIALOG_FLOW,
  PAGE_TODO,
  PAGE_SIGN_IN
];
