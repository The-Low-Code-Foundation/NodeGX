/**
 * TPL-007 — Rocket School: the components, in the shape the door's plan takes.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * ## The shape, and why it is this shape
 *
 * Phase 85's doctrine, followed rather than quoted: **a named section is a
 * component, a named utility is a component however small, every component
 * has a deliberate interface, and a page is a handful of instances.** So:
 *
 * - `Data/*` — four sources, each one `Static Data` node with `Component
 *   Outputs`. The curriculum, the Teach cards, the words, the typing words.
 *   Adding a skill is adding an entry to `Data/Curriculum`. (TPL-006's move.)
 * - `Logic/*` — every Function script from `tpl007Scripts.ts` as a **named
 *   utility**: `Component Inputs` → one Function → `Component Outputs`. A page
 *   places `Logic/Grade answer`; it never grows its own anonymous Function.
 *   Plus `Logic/App store` (the persisted store, wrapped once) and
 *   `Logic/Play sounds` (the kit's Sound nodes, wrapped once).
 * - `Game/*` — the visual parts, each with a placement contract (`mounted`),
 *   flags, and outputs: a face, a profile card, a choice row, a question box,
 *   a countdown, the race track, the feedback banner, the keyboard.
 * - `Race/*` — the Rocket Race's three sections: setup, one round, the play.
 * - `Merge/*` — Make Ten Merge's square, row, and the game itself.
 * - `Hunt/*` — Number Hunt's number, row, and the game itself.
 * - `Pages/*` — Profiles, Home, Race, Hangar, Merge, Hunt. Each a `Page` node, a header,
 *   and instances. Monster, Teach, Progress and Sets are the next
 *   sessions' pages; the parts they share are already here.
 *
 * ## 🔴 Three runtime rules every component here obeys
 *
 * 1. **A `States` node carrying a colour has `useTransitions: false`** (D49) or
 *    it publishes nothing. `withStates()` sets it; nothing here writes a
 *    States node any other way.
 * 2. **A Function fed by the value it produces is signal-driven** — every such
 *    input is unticked with `signalOnly`, and the node runs on `run`. Otherwise
 *    it is a loop that renders perfectly (TPL-005).
 * 3. **Values before signals.** Anything a signal "carries" is written to a
 *    Variable whose `done` fires the signal — the pixel game's sequencing
 *    primitive. A signal that arrives before its value is read one step late.
 *
 * @module noodl-mcp/tests/tpl007Components
 */
import { CURRICULUM_JSON, HANGAR_SHELF_JSON, LEVELS, TEACH_CARDS_JSON, WORDS_JSON, WORD_LISTS_JSON } from './tpl007Curriculum';
import {
  ACTIVE_PROFILE_SCRIPT,
  BUILD_HUNT_SCRIPT,
  CHECK_HUNT_SCRIPT,
  CREATE_PROFILE_SCRIPT,
  DECODE_SAVE_SCRIPT,
  DELETE_PROFILE_SCRIPT,
  DELETE_SET_SCRIPT,
  DRAW_HUNT_SCRIPT,
  DRAW_MERGE_SCRIPT,
  DRAW_MONSTER_SCRIPT,
  ENCODE_SAVE_SCRIPT,
  FINISH_HUNT_SCRIPT,
  FINISH_MERGE_SCRIPT,
  FINISH_MONSTER_SCRIPT,
  FINISH_RACE_SCRIPT,
  GRADE_ANSWER_SCRIPT,
  HANGAR_SHELF_SCRIPT,
  HUNT_MOVE_SCRIPT,
  LIST_PROFILES_SCRIPT,
  LIST_SETS_SCRIPT,
  MARK_SELECTED_SCRIPT,
  MONSTER_LOOKS,
  MONSTER_MOVE_SCRIPT,
  NEW_BOARD_SCRIPT,
  NEW_HUNT_SCRIPT,
  NEW_MONSTER_SCRIPT,
  PARSE_SET_SCRIPT,
  PICK_ITEM_SCRIPT,
  PICK_QUESTION_SCRIPT,
  SAVE_MODEL_SCRIPT,
  SELECT_PROFILE_SCRIPT,
  SLIDE_MERGE_SCRIPT,
  TEACH_CARD_SCRIPT,
  TOGGLE_INDEX_SCRIPT,
  TRANSLATE_SCRIPT,
  UPDATE_SETTINGS_SCRIPT,
  UPSERT_SET_SCRIPT,
  WEAR_ITEM_SCRIPT,
  portsOf
} from './tpl007Scripts';
import { DISPLAY_FONT, INK_SHADOW, ROLE, composition } from './tpl007Theme';

export const ROUTER = 'Main';
export const EDIT = 'EDIT — ';
export const STORE_NAME = 'rocket';
export const STORAGE_KEY = 'rocket-school';

/** One component, in the shape a plan operation is staged with. */
export interface Tpl007Component {
  path: string;
  description: string;
  nodes: unknown[];
  connections: unknown[];
  /** The plan declaration: the ports instances will set / read, and what it instantiates. */
  inputs?: Array<{ name: string; type?: string; description?: string }>;
  outputs?: Array<{ name: string; type?: string; description?: string }>;
  repeats?: { source: 'static' | 'query' | 'variable' | 'array'; rowFields: string[] };
  instantiates?: string[];
}

// ── Node type names ─────────────────────────────────────────────────────────

const FUNCTION_NODE = 'JavaScriptFunction';
const STATES_NODE = 'States';
const STATIC_DATA_NODE = 'Static Data';
const FOR_EACH_NODE = 'For Each';
const VARIABLE_NODE = 'Variable2';
const SET_VARIABLE_NODE = 'Set Variable';
const EXPRESSION_NODE = 'Expression';
const CONDITION_NODE = 'Condition';
const COUNTER_NODE = 'Counter';
const NAVIGATE_NODE = 'RouterNavigate';
const TIMER_NODE = 'Timer';
const ANIMATE_NODE = 'net.noodl.animatetovalue';
const TEXT_INPUT_NODE = 'net.noodl.controls.textinput';
const BUTTON_NODE = 'net.noodl.controls.button';
const GLOBAL_STORE_NODE = 'net.noodl.GlobalStore';
const STORE_SET_NODE = 'net.noodl.GlobalStore.Set';
const STORE_SUBSCRIBE_NODE = 'net.noodl.GlobalStore.Subscribe';
const CSS_NODE = 'CSS Definition';
const KIT_AVATAR = 'game-kit.Avatar';
const KIT_TRACK = 'game-kit.RaceTrack';
const KIT_KEYBOARD = 'game-kit.KeyboardMap';
const KIT_PAD = 'game-kit.AnswerPad';
const KIT_SOUND = 'game-kit.Sound';
const KIT_KEEP = 'game-kit.KeepStorage';

// ── Component names, spelled once ───────────────────────────────────────────

export const C = {
  app: 'App',
  curriculum: '/Data/Curriculum',
  teachCards: '/Data/Teach cards',
  words: '/Data/Words',
  wordLists: '/Data/Word lists',
  store: '/Logic/App store',
  sounds: '/Logic/Play sounds',
  face: '/Game/Face',
  profileCard: '/Game/Profile card',
  choice: '/Game/Choice',
  choiceRow: '/Game/Choice row',
  gameCard: '/Game/Game card',
  header: '/Game/Header',
  stat: '/Game/Stat',
  questionBox: '/Game/Question box',
  optionButton: '/Game/Option button',
  countdown: '/Game/Countdown bar',
  track: '/Game/Race track',
  banner: '/Game/Feedback banner',
  teachCard: '/Game/Teach card',
  keyboard: '/Game/Keyboard',
  newPlayer: '/Profiles/New player form',
  raceSetup: '/Race/Setup',
  raceRound: '/Race/Round',
  racePlay: '/Race/Play',
  raceResult: '/Race/Result',
  pageProfiles: '/Pages/Profiles',
  pageHome: '/Pages/Home',
  pageRace: '/Pages/Race',
  // P87 RKT-011 — the hangar.
  hangarData: '/Data/Hangar',
  nextPick: '/Game/Next pick',
  hangarTile: '/Hangar/Tile',
  hangarPreview: '/Hangar/Preview',
  hangarShelf: '/Hangar/Shelf',
  pageHangar: '/Pages/Hangar',
  // TPL-007 §12.1 — Make Ten Merge, the second game.
  mergeTile: '/Merge/Tile',
  mergeRow: '/Merge/Row',
  mergePlay: '/Merge/Play',
  pageMerge: '/Pages/Merge',
  // TPL-007 §12.2 — Number Hunt, the third game.
  huntTile: '/Hunt/Tile',
  huntRow: '/Hunt/Row',
  huntPlay: '/Hunt/Play',
  pageHunt: '/Pages/Hunt',
  // TPL-007 §16 — Monster Gate, the fourth game.
  monster: '/Game/Monster',
  monsterLane: '/Monster/Lane',
  monsterSetup: '/Monster/Setup',
  monsterPlay: '/Monster/Play',
  pageMonster: '/Pages/Monster'
} as const;

/** The arrow keys, from the `keyboard-shortcuts` library module (TPL-005 vendored it for the same job). */
const KEYBOARD_SHORTCUT_NODE = 'keyboard-shortcuts.KeyboardShortcut';

export const logicName = (component: string) => '/' + component;

/**
 * 🔴 RKT-001 — every Text that sizes to its words, and why it may. Anything else wraps.
 * Keyed `<component>#<node id>`; the template gate asserts the built artefact matches this list exactly.
 */
export const CONTENT_SIZED_TEXTS: Readonly<Record<string, string>> = {
  '/Game/Profile card#pcLevel': 'a class code (CM1) inside a pill that sizes to it',
  '/Game/Choice#chText': 'a pill label; the pill sizes to it, and the row of pills wraps instead',
  '/Game/Game card#gcGlyph': 'one emoji',
  '/Game/Stat#stValue': 'a number',
  '/Game/Feedback banner#fbGlyph': 'one emoji',
  '/Game/Feedback banner#fbBoost': 'a short line beside the glyph: seconds and a percentage, at most "Ta fusée ne bouge pas"',
  '/Game/Countdown bar#cdSecs': 'a number of seconds',
  '/Game/Countdown bar#cdSecsLast': 'a number of seconds',
  '/Race/Result#rrGlyph': 'one emoji',
  '/Merge/Tile#mtWord': 'a number on a square, at most four digits',
  '/Monster/Lane#zlHearts': 'three heart emoji',
  '/Monster/Lane#zlLine': 'which monster of three: "Monstre 2 sur 3" at most',
  '/Monster/Lane#zlPips': 'four dots: the hits a monster has left'
};

// ── Helpers ─────────────────────────────────────────────────────────────────

const px = (value: number) => ({ value, unit: 'px' });
const pct = (value: number) => ({ value, unit: '%' });

/**
 * A Text. 🔴 RKT-001: it takes its width from its parent and its height from its words
 * (`contentHeight`), so a sentence wraps. `contentSize` renders as `white-space: pre` and never
 * wraps — ask for it with `WORD`, only for a name, a number or a glyph, and name the node in
 * `CONTENT_SIZED_TEXTS` (the gate holds the two lists together).
 */
function text(id: string, label: string, parent: string, value: string, params: Record<string, unknown> = {}): unknown {
  return { id, type: 'Text', label, parent, parameters: { text: value, sizeMode: 'contentHeight', ...params } };
}

/** For a Text that must size to its one word: spread it into the params, and list the node below. */
const WORD = { sizeMode: 'contentSize' } as const;

function group(id: string, label: string, parent: string | undefined, params: Record<string, unknown>, children?: string[]): unknown {
  const node: Record<string, unknown> = { id, type: 'Group', label, parameters: params };
  if (parent) node.parent = parent;
  if (children) node.children = children;
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

/** Untick Run On Value Change on the named inputs — the node runs only on its signal. */
export function signalOnly(...inputNames: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const name of inputNames) out[`runOnChange-${name}`] = false;
  return out;
}

function gate(id: string, label: string): unknown {
  return logic(id, CONDITION_NODE, label, { ...signalOnly('condition') });
}

/** A reactive Condition: tests whenever its value changes. */
function watch(id: string, label: string): unknown {
  return logic(id, CONDITION_NODE, label, {});
}

/**
 * A `States` node. 🔴 `useTransitions: false` always — D49: with transitions on
 * (the default) a colour value never publishes.
 */
function withStates(id: string, label: string, states: string[], values: Record<string, { type: string; by: Record<string, unknown> }>): unknown {
  const params: Record<string, unknown> = { states: states.join(','), values: Object.keys(values).join(','), useTransitions: false };
  for (const [value, spec] of Object.entries(values)) {
    params[`type-${value}`] = spec.type;
    for (const state of states) params[`value-${state}-${value}`] = spec.by[state];
  }
  return logic(id, STATES_NODE, label, params);
}

const column = (params: Record<string, unknown> = {}) => ({
  width: pct(100),
  sizeMode: 'contentHeight',
  flexDirection: 'column',
  ...params
});
const row = (params: Record<string, unknown> = {}) => ({
  sizeMode: 'contentSize',
  flexDirection: 'row',
  alignItems: 'center',
  flexWrap: 'wrap',
  columnGap: 'var(--space-3)',
  rowGap: 'var(--space-3)',
  ...params
});

// RKT-002: titles and buttons wear the display face; an eyebrow is small, so it is ink, never a role colour.
const DISPLAY = { fontFamily: DISPLAY_FONT, fontWeight: 'var(--font-extrabold)' };
const T_TITLE = { ...composition('displayHeadline'), as: 'h1', fontSize: 'var(--text-4xl)', ...DISPLAY };
const T_SECTION = { ...composition('sectionHeading'), as: 'h2', ...DISPLAY };
const T_CARD = { ...composition('cardTitle'), as: 'h3', ...DISPLAY };
const T_EYEBROW = { ...composition('eyebrow'), as: 'span', color: 'var(--foreground)' };
const T_LEAD = composition('lead');
const T_BODY = composition('body');
const T_META = composition('meta');
// RKT-002, the Sticker book: a button is a sticker — ink outline, hard ink shadow, corners, the display face.
const STICKER_BUTTON = { ...DISPLAY, borderRadius: 'var(--radius-lg)', borderStyle: 'solid', borderWidth: 'var(--border-1)', borderColor: 'var(--foreground)', ...INK_SHADOW };
const BTN_PRIMARY = { ...composition('primaryButton'), ...STICKER_BUTTON };
const BTN_OUTLINE = { ...composition('outlineButton'), ...STICKER_BUTTON, backgroundColor: 'var(--surface)' };
const CARD = { ...composition('card'), ...INK_SHADOW };
const BADGE = composition('badge');
const FIELD = composition('textField');
const STAT_TILE = { ...composition('statTile'), ...INK_SHADOW };

const port = (name: string, type: string, description?: string) => (description ? { name, type, description } : { name, type });

// ── Data/* — the four sources ───────────────────────────────────────────────

function source(path: string, label: string, json: string, outputName: string, description: string): Tpl007Component {
  const id = path.replace(/\W/g, '').toLowerCase();
  return {
    path,
    description,
    outputs: [port(outputName, 'array'), port('count', 'number')],
    nodes: [
      { id: `${id}Data`, type: STATIC_DATA_NODE, label: `${EDIT}${label}`, parameters: { type: 'json', json } },
      outputs(`${id}Out`, 'What this source publishes', [[outputName, 'array'], ['count', 'number']])
    ],
    connections: [wire(`${id}Data`, 'items', `${id}Out`, outputName), wire(`${id}Data`, 'count', `${id}Out`, 'count')]
  };
}

export const DATA_COMPONENTS: ReadonlyArray<Tpl007Component> = [
  source('Data/Curriculum', 'the skills — this list IS the school', CURRICULUM_JSON, 'skills', 'Every skill the game can ask about, for every level, in both languages. Add a row to add a skill to every game.'),
  source('Data/Teach cards', 'the explainers, one per idea', TEACH_CARDS_JSON, 'cards', 'The faded worked examples a wrong answer opens: three steps each, shorter every time.'),
  source('Data/Words', 'every word of the interface, EN and FR', WORDS_JSON, 'words', 'The interface strings as { key, en, fr } rows. Logic/Translate words publishes each key in the chosen language.'),
  source('Data/Word lists', 'the typing words, per language', WORD_LISTS_JSON, 'lists', 'The words the typing skills draw from, per language. Add your own.'),
  source('Data/Hangar', 'the hangar shelf — what a 🎁 pick can become', HANGAR_SHELF_JSON, 'items', 'Everything the hangar offers (RKT-011): face items as DiceBear parts per face they fit, and rocket paints as tokens. A free item is everyone’s from the start. Add a row to add an item.')
];

// ── Logic/* — the named utilities ───────────────────────────────────────────

/** How one script becomes a component: its ports, and whether it runs on a signal. */
interface LogicSpec {
  name: string;
  script: string;
  description: string;
  /** Value inputs, typed. Every `Inputs.x` the script reads must be here or it has no port. */
  ins: Array<[string, string]>;
  outs: Array<[string, string]>;
  /** Signal-driven: a `run` input, every value input unticked. Otherwise reactive. */
  run?: boolean;
  /** Reactive, but only these inputs re-run it (a nudge); the rest are unticked. */
  triggers?: string[];
}

const LOGIC_SPECS: ReadonlyArray<LogicSpec> = [
  {
    name: 'Logic/Pick next question', script: PICK_QUESTION_SCRIPT, triggers: ['nonce'],
    description: 'Which skill is due for this profile, and one question on it. Re-runs when Nonce changes — wire a Counter to it and pulse the Counter to ask.',
    ins: [['nonce', 'number'], ['curriculum', 'array'], ['model', 'object'], ['level', 'string'], ['lang', 'string'], ['layout', 'string'], ['mode', 'string'], ['answerMode', 'string'], ['customSet', 'array'], ['wordLists', 'array'], ['limitScale', 'number']],
    outs: [['skillId', 'string'], ['skillName', 'string'], ['prompt', 'string'], ['answer', 'string'], ['options', 'array'], ['optionValues', 'array'], ['choices', 'array'], ['kind', 'string'], ['isTyping', 'boolean'], ['nextKey', 'string'], ['fluentMs', 'number'], ['limitMs', 'number'], ['strategy', 'string'], ['teach', 'string'], ['itemDiff', 'number'], ['predicted', 'number'], ['shownAt', 'number'], ['worked', 'string'], ['padKeys', 'string'], ['padNumeric', 'boolean']]
  },
  {
    name: 'Logic/Grade answer', script: GRADE_ANSWER_SCRIPT, run: true,
    description: 'Was it right, was it fast, and what the learner model now believes. Publishes the new model — store it.',
    ins: [['model', 'object'], ['skillId', 'string'], ['level', 'string'], ['lang', 'string'], ['timedOut', 'boolean'], ['answer', 'string'], ['typed', 'string'], ['fluentMs', 'number'], ['itemDiff', 'number'], ['shownAt', 'number'], ['elapsedOverride', 'number'], ['wasDue', 'boolean'], ['strategy', 'string'], ['worked', 'string'], ['raceId', 'string'], ['forB', 'boolean'], ['mistakes', 'number'], ['game', 'string']],
    outs: [['correct', 'boolean'], ['fluent', 'boolean'], ['outcome', 'string'], ['elapsedMs', 'number'], ['model', 'object'], ['gain', 'number'], ['speed', 'number'], ['boost', 'string'], ['boostPct', 'number'], ['cpuGain', 'number'], ['message', 'string'], ['mastery', 'number'], ['ratingDelta', 'number'], ['streak', 'number'], ['missCount', 'number'], ['starsEarned', 'number'], ['stars', 'number']]
  },
  {
    name: 'Logic/Slide and merge', script: SLIDE_MERGE_SCRIPT, run: true,
    description: 'The Make Ten board after a slide in Dir: tiles move, two that make a multiple of ten join, and one new tile lands from the pool. Takes and publishes the whole Game (the board, its totals, its id, and the squares that joined and landed). Board is for a bare board with no game.',
    ins: [['game', 'object'], ['dir', 'string'], ['pool', 'array'], ['board', 'array'], ['helper', 'number']],
    outs: [['game', 'object'], ['board', 'array'], ['moved', 'boolean'], ['score', 'number'], ['merges', 'number'], ['biggest', 'number'], ['gameOver', 'boolean']]
  },
  {
    name: 'Logic/New merge board', script: NEW_BOARD_SCRIPT, run: true,
    description: 'A fresh Make Ten game: two tiles, a new id, and the pool new tiles come from, by the profile’s bonds (single numbers at CE2; teens, then fives to 95, as the class or the mastery grows; the weakest group twice as often). Pool overrides it.',
    ins: [['level', 'string'], ['model', 'object'], ['pool', 'array'], ['mode', 'string']],
    outs: [['game', 'object'], ['board', 'array'], ['pool', 'array'], ['mode', 'string']]
  },
  {
    name: 'Logic/Draw merge board', script: DRAW_MERGE_SCRIPT,
    description: 'The Make Ten game as the graph draws it: four rows of four squares (id, word, kind, fx) for the nested repeaters, the score line in the child’s language, and Phase (playing or over).',
    ins: [['game', 'object'], ['lang', 'string']],
    outs: [['rows', 'array'], ['scoreLine', 'string'], ['phase', 'string'], ['over', 'boolean'], ['score', 'number'], ['made', 'number'], ['biggest', 'number'], ['fullness', 'string']]
  },
  {
    name: 'Logic/Finish merge', script: FINISH_MERGE_SCRIPT, run: true,
    description: 'What a finished Make Ten board pays: a star a join (capped) and the five a landing pays, once per board id. Publishes the model (store it), the take and why, whether it crossed a 🎁 milestone, and the end screen’s words.',
    ins: [['model', 'object'], ['game', 'object'], ['lang', 'string']],
    outs: [['model', 'object'], ['paid', 'boolean'], ['starsEarned', 'number'], ['stars', 'number'], ['starsText', 'string'], ['why', 'string'], ['earnedPick', 'boolean'], ['won', 'boolean'], ['headline', 'string'], ['line', 'string']]
  },
  {
    name: 'Logic/Build number hunt', script: BUILD_HUNT_SCRIPT, triggers: ['nonce'],
    description: 'A 4×4 grid and a target with a known number of solutions, for the level.',
    ins: [['nonce', 'number'], ['level', 'string'], ['lang', 'string']],
    outs: [['cells', 'array'], ['target', 'number'], ['count', 'number'], ['kind', 'string'], ['solutions', 'number'], ['instruction', 'string']]
  },
  {
    name: 'Logic/Check hunt pick', script: CHECK_HUNT_SCRIPT,
    description: 'Do the picked tiles make the target?',
    ins: [['cells', 'array'], ['selected', 'array'], ['count', 'number'], ['target', 'number'], ['kind', 'string']],
    outs: [['value', 'number'], ['picked', 'number'], ['complete', 'boolean'], ['correct', 'boolean']]
  },
  {
    name: 'Logic/Toggle index', script: TOGGLE_INDEX_SCRIPT, run: true,
    description: 'The list with one index added or removed, capped.',
    ins: [['list', 'array'], ['index', 'number'], ['max', 'number']],
    outs: [['list', 'array'], ['count', 'number']]
  },
  {
    name: 'Logic/New hunt', script: NEW_HUNT_SCRIPT, run: true,
    description: 'A fresh Number Hunt: the first of five grids for the level (sixteen numbers, a target, and one to three ways to make it), and a new id, so the hunt is paid once. Publishes the whole Game: hold it in one Variable.',
    ins: [['level', 'string']],
    outs: [['game', 'object'], ['rounds', 'number']]
  },
  {
    name: 'Logic/Hunt move', script: HUNT_MOVE_SCRIPT, run: true,
    description: 'The hunt after one move. Action is a parameter, placed once per action: tap (the square Index joins or leaves the pick, and a full pick is checked at once), show (one way not found yet, after two misses on this grid; it pays nothing) or next (the next grid, once every way on this one is found). A move that does not apply changes nothing. Takes and publishes the whole Game.',
    ins: [['game', 'object'], ['action', 'string'], ['index', 'number']],
    outs: [['game', 'object'], ['changed', 'boolean'], ['note', 'string']]
  },
  {
    name: 'Logic/Draw hunt', script: DRAW_HUNT_SCRIPT,
    description: 'The hunt as the graph draws it: four rows of four numbers (id, at, word, kind, fx) for the nested repeaters, the instruction, the progress, a note on the last pick and its kind (quiet, right, wrong, shown), Phase (playing, found or over), and Can Show once two misses are on the grid.',
    ins: [['game', 'object'], ['lang', 'string']],
    outs: [['rows', 'array'], ['instruction', 'string'], ['progress', 'string'], ['note', 'string'], ['noteKind', 'string'], ['phase', 'string'], ['over', 'boolean'], ['canShow', 'boolean'], ['made', 'number'], ['helped', 'number'], ['round', 'number']]
  },
  {
    name: 'Logic/Finish hunt', script: FINISH_HUNT_SCRIPT, run: true,
    description: 'What a finished Number Hunt pays: a star a way the child found (capped; a way shown pays nothing) and the five a landing pays, once per hunt id. Publishes the model (store it), the take and why, whether it crossed a 🎁 milestone, and the end screen’s words.',
    ins: [['model', 'object'], ['game', 'object'], ['lang', 'string']],
    outs: [['model', 'object'], ['paid', 'boolean'], ['starsEarned', 'number'], ['stars', 'number'], ['starsText', 'string'], ['why', 'string'], ['earnedPick', 'boolean'], ['won', 'boolean'], ['headline', 'string'], ['line', 'string']]
  },
  {
    name: 'Logic/New monster game', script: NEW_MONSTER_SCRIPT, run: true,
    description: 'A fresh Monster Gate game in Style (gate: Beat it to the gate; push: Push it back) and pace (Timed): three hearts, the first of three monsters, and a new Id, which the round grades the answers under and the finish pays once for. Publishes the whole Game: hold it in one Variable.',
    ins: [['style', 'string'], ['timed', 'boolean']],
    outs: [['game', 'object'], ['id', 'string'], ['timeScale', 'number']]
  },
  {
    name: 'Logic/Monster move', script: MONSTER_MOVE_SCRIPT, run: true,
    description: 'The Monster Gate game after one move. Action is a parameter, placed once per action: answer (the round was graded: Outcome, Gain and Cpu Gain as the grader wrote them — a hit, a creep closer, a push, a step, a heart gone, a monster beaten, a heart back) or next (the next monster arrives). Time Scale is the next question\'s clock as a share of the skill\'s: the walk from where the monster stands. Takes and publishes the whole Game.',
    ins: [['game', 'object'], ['action', 'string'], ['outcome', 'string'], ['gain', 'number'], ['cpuGain', 'number']],
    outs: [['game', 'object'], ['changed', 'boolean'], ['event', 'string'], ['timeScale', 'number']]
  },
  {
    name: 'Logic/Draw monster', script: DRAW_MONSTER_SCRIPT,
    description: 'The Monster Gate game as the lane draws it: the hearts, which monster of three, its hits left, what just happened in words, the monster\'s class and the lane\'s, where the monster stands between answers (Rest: 0 the gate, 1 the far side), Walk From (where a Challenge walk starts, 0 when nothing walks), and Phase (playing or over).',
    ins: [['game', 'object'], ['lang', 'string']],
    outs: [['hearts', 'string'], ['heartsLeft', 'number'], ['line', 'string'], ['note', 'string'], ['pips', 'string'], ['look', 'string'], ['monsterClass', 'string'], ['laneClass', 'string'], ['rest', 'number'], ['walkFrom', 'number'], ['phase', 'string'], ['over', 'boolean'], ['won', 'boolean'], ['beaten', 'number'], ['right', 'number']]
  },
  {
    name: 'Logic/Finish monster', script: FINISH_MONSTER_SCRIPT, run: true,
    description: 'What a finished Monster Gate game pays beyond its answers (already paid as they were graded): a landing\'s five, win or lose, once per game id. Publishes the model (store it), the game\'s whole take and why, whether it crossed a 🎁 milestone, and the end screen\'s words.',
    ins: [['model', 'object'], ['game', 'object'], ['lang', 'string']],
    outs: [['model', 'object'], ['paid', 'boolean'], ['starsEarned', 'number'], ['stars', 'number'], ['starsText', 'string'], ['why', 'string'], ['earnedPick', 'boolean'], ['won', 'boolean'], ['headline', 'string'], ['line', 'string']]
  },
  {
    name: 'Logic/List profiles', script: LIST_PROFILES_SCRIPT,
    description: 'The profiles in the store, decorated with what is due and how many days this week.',
    ins: [['app', 'object']],
    outs: [['profiles', 'array'], ['count', 'number'], ['canAdd', 'boolean'], ['hasActive', 'boolean']]
  },
  {
    name: 'Logic/Create profile', script: CREATE_PROFILE_SCRIPT, run: true,
    description: 'The store with one more profile, made active.',
    ins: [['app', 'object'], ['name', 'string'], ['look', 'string'], ['seed', 'string'], ['level', 'string'], ['lang', 'string'], ['layout', 'string'], ['answerMode', 'string']],
    outs: [['app', 'object'], ['profileId', 'string'], ['created', 'boolean']]
  },
  {
    name: 'Logic/Select profile', script: SELECT_PROFILE_SCRIPT, run: true,
    description: 'The store with a different active profile.',
    ins: [['app', 'object'], ['profileId', 'string']],
    outs: [['app', 'object']]
  },
  {
    name: 'Logic/Delete profile', script: DELETE_PROFILE_SCRIPT, run: true,
    description: 'The store with one profile removed.',
    ins: [['app', 'object'], ['profileId', 'string']],
    outs: [['app', 'object']]
  },
  {
    name: 'Logic/Active profile', script: ACTIVE_PROFILE_SCRIPT,
    description: 'The active profile, field by field, and an honest hasProfile=false when there is none. RKT-011: what the face and rocket wear, the 🎁 picks waiting, and the way to the next one.',
    ins: [['app', 'object']],
    outs: [['hasProfile', 'boolean'], ['profileId', 'string'], ['name', 'string'], ['look', 'string'], ['seed', 'string'], ['level', 'string'], ['lang', 'string'], ['layout', 'string'], ['sound', 'boolean'], ['soundMode', 'string'], ['answerMode', 'string'], ['mergeMode', 'string'], ['model', 'object'], ['due', 'number'], ['days7', 'number'], ['answered', 'number'], ['stars', 'number'], ['faceOptions', 'object'], ['paint', 'string'], ['picks', 'number'], ['hasPicks', 'boolean'], ['nextAt', 'number'], ['nextPct', 'number'], ['nextText', 'string'], ['sets', 'array']]
  },
  {
    name: 'Logic/Save model', script: SAVE_MODEL_SCRIPT, run: true,
    description: 'The store with the profile\'s learner model replaced and today recorded as a practice day.',
    ins: [['app', 'object'], ['profileId', 'string'], ['model', 'object']],
    outs: [['app', 'object']]
  },
  {
    name: 'Logic/Finish race', script: FINISH_RACE_SCRIPT, run: true,
    description: 'The stars a race pays that are not answers: the landing, win or lose, and a new personal best. Once per race id. Publishes the model (store it), the race\'s whole take and why.',
    ins: [['model', 'object'], ['raceId', 'string'], ['timed', 'boolean'], ['lang', 'string']],
    outs: [['model', 'object'], ['starsEarned', 'number'], ['raceStars', 'number'], ['starsText', 'string'], ['why', 'string'], ['newBest', 'boolean'], ['stars', 'number'], ['earnedPick', 'boolean']]
  },
  {
    name: 'Logic/Update settings', script: UPDATE_SETTINGS_SCRIPT, run: true,
    description: 'The store with a profile\'s name, language, layout, level, sound, answer mode or face changed. A name is trimmed to 24 characters, and an empty one is refused.',
    ins: [['app', 'object'], ['profileId', 'string'], ['name', 'string'], ['lang', 'string'], ['layout', 'string'], ['layoutSeen', 'string'], ['level', 'string'], ['sound', 'boolean'], ['soundMode', 'string'], ['answerMode', 'string'], ['look', 'string'], ['seed', 'string'], ['mergeMode', 'string']],
    outs: [['app', 'object']]
  },
  {
    name: 'Logic/Pick item', script: PICK_ITEM_SCRIPT, run: true,
    description: 'RKT-011: the store with one 🎁 pick spent on a shelf item, and the item worn at once. Refused, with nothing changed, when the item is free or already owned, does not fit the face, or no pick is left (Why says which).',
    ins: [['app', 'object'], ['profileId', 'string'], ['itemId', 'string'], ['shelf', 'array']],
    outs: [['app', 'object'], ['picked', 'boolean'], ['why', 'string']]
  },
  {
    name: 'Logic/Wear item', script: WEAR_ITEM_SCRIPT, run: true,
    description: 'RKT-011: the store with an item the child has (owned, or free) put on, or taken off when it was already on.',
    ins: [['app', 'object'], ['profileId', 'string'], ['itemId', 'string'], ['shelf', 'array']],
    outs: [['app', 'object'], ['worn', 'boolean'], ['changed', 'boolean']]
  },
  {
    name: 'Logic/Hangar shelf', script: HANGAR_SHELF_SCRIPT,
    description: 'RKT-011: one tab of the shelf (face or rocket) as the active player sees it. Every item is a row, owned, wearable or still to pick, with what a tap would do.',
    ins: [['app', 'object'], ['shelf', 'array'], ['tab', 'string']],
    outs: [['rows', 'array'], ['count', 'number'], ['picks', 'number'], ['hasPicks', 'boolean']]
  },
  {
    name: 'Logic/Parse question set', script: PARSE_SET_SCRIPT,
    description: 'Editor rows or pasted JSON into a clean list of { q, a, opts } questions.',
    ins: [['json', 'string'], ['rows', 'array']],
    outs: [['items', 'array'], ['count', 'number'], ['error', 'string'], ['valid', 'boolean']]
  },
  {
    name: 'Logic/Save question set', script: UPSERT_SET_SCRIPT, run: true,
    description: 'The store with a question set added or replaced.',
    ins: [['app', 'object'], ['setId', 'string'], ['name', 'string'], ['items', 'array']],
    outs: [['app', 'object'], ['setId', 'string']]
  },
  {
    name: 'Logic/Delete question set', script: DELETE_SET_SCRIPT, run: true,
    description: 'The store with a question set removed.',
    ins: [['app', 'object'], ['setId', 'string']],
    outs: [['app', 'object']]
  },
  {
    name: 'Logic/List question sets', script: LIST_SETS_SCRIPT,
    description: 'The question sets, and the chosen one with its items.',
    ins: [['app', 'object'], ['setId', 'string']],
    outs: [['sets', 'array'], ['count', 'number'], ['hasSets', 'boolean'], ['chosenId', 'string'], ['chosenName', 'string'], ['chosenItems', 'array'], ['chosenJson', 'string']]
  },
  {
    name: 'Logic/Encode save code', script: ENCODE_SAVE_SCRIPT,
    description: 'A profile and its skills as a short code a child can copy.',
    ins: [['app', 'object'], ['profileId', 'string']],
    outs: [['code', 'string'], ['length', 'number']]
  },
  {
    name: 'Logic/Decode save code', script: DECODE_SAVE_SCRIPT, run: true,
    description: 'A save code back into a profile in the store; refuses a bad code without touching anything.',
    ins: [['app', 'object'], ['code', 'string']],
    outs: [['app', 'object'], ['ok', 'boolean'], ['error', 'string'], ['profileId', 'string']]
  },
  {
    name: 'Logic/Translate words', script: TRANSLATE_SCRIPT,
    description: 'Every interface word in the chosen language, one output per word.',
    ins: [['lang', 'string'], ['words', 'array']],
    outs: [['lang', 'string'], ['isFr', 'boolean'], ...portsOf(TRANSLATE_SCRIPT).outputs.filter((o) => o !== 'lang' && o !== 'isFr').map((o) => [o, 'string'] as [string, string])]
  },
  {
    name: 'Logic/Mark selected', script: MARK_SELECTED_SCRIPT,
    description: 'Rows with the chosen one flagged selected — what a segmented control repeats over.',
    ins: [['items', 'array'], ['value', 'string']],
    outs: [['rows', 'array'], ['count', 'number']]
  },
  {
    name: 'Logic/Teach card', script: TEACH_CARD_SCRIPT,
    description: 'One Teach card at one fading step, in the chosen language.',
    ins: [['cards', 'array'], ['teachId', 'string'], ['lang', 'string'], ['step', 'number']],
    outs: [['found', 'boolean'], ['title', 'string'], ['text', 'string'], ['example', 'string'], ['step', 'number'], ['isFaded', 'boolean']]
  }
];

function logicComponent(spec: LogicSpec): Tpl007Component {
  const id = spec.name.replace(/^Logic\//, '').replace(/\W+/g, '').toLowerCase().slice(0, 12);
  const fnId = `${id}Fn`;
  const inPorts: Array<[string, string]> = [...spec.ins];
  if (spec.run) inPorts.unshift(['run', 'signal']);
  const outPorts: Array<[string, string]> = [...spec.outs, ['done', 'signal']];
  const unticked = spec.run ? spec.ins.map(([n]) => `in-${n}`) : spec.triggers ? spec.ins.filter(([n]) => !spec.triggers!.includes(n)).map(([n]) => `in-${n}`) : [];
  const nodes = [
    inputs(`${id}In`, 'What the caller gives', inPorts),
    logic(fnId, FUNCTION_NODE, spec.name.replace(/^Logic\//, ''), { functionScript: spec.script, ...signalOnly(...unticked) }),
    outputs(`${id}Out`, 'What it answers', outPorts)
  ];
  const connections: unknown[] = [];
  for (const [name] of spec.ins) connections.push(wire(`${id}In`, name, fnId, `in-${name}`));
  if (spec.run) connections.push(wire(`${id}In`, 'run', fnId, 'run'));
  for (const [name] of spec.outs) connections.push(wire(fnId, `out-${name}`, `${id}Out`, name));
  connections.push(wire(fnId, 'success', `${id}Out`, 'done'));
  return {
    path: spec.name,
    description: spec.description,
    inputs: inPorts.map(([n, t]) => port(n, t)),
    outputs: outPorts.map(([n, t]) => port(n, t)),
    nodes,
    connections
  };
}

export const LOGIC_COMPONENTS: ReadonlyArray<Tpl007Component> = LOGIC_SPECS.map(logicComponent);

/** The store, wrapped once: persisted, subscribed, and written through one signal. */
const APP_STORE: Tpl007Component = {
  path: 'Logic/App store',
  description: 'The one persisted store (localStorage, key rocket-school): publishes the app object, writes it back on Write, and says when it changed.',
  inputs: [port('write', 'signal'), port('app', 'object')],
  outputs: [port('app', 'object'), port('changed', 'signal'), port('written', 'signal'), port('ready', 'signal'), port('error', 'string')],
  nodes: [
    inputs('asIn', 'A write', [['write', 'signal'], ['app', 'object']]),
    logic('asStore', GLOBAL_STORE_NODE, 'The persisted store', { storeName: STORE_NAME, persist: true, storageKey: STORAGE_KEY }),
    logic('asRead', STORE_SUBSCRIBE_NODE, 'Read the app object', { storeName: STORE_NAME, keys: 'app' }),
    logic('asWrite', STORE_SET_NODE, 'Write the app object', { storeName: STORE_NAME, key: 'app', merge: false }),
    // Asked once per page: keeps the site off the browser's eviction list.
    logic('asKeep', KIT_KEEP, 'Ask the browser to keep the storage'),
    outputs('asOut', 'The store, read', [['app', 'object'], ['changed', 'signal'], ['written', 'signal'], ['ready', 'signal'], ['error', 'string']])
  ],
  connections: [
    wire('asIn', 'app', 'asWrite', 'value'),
    wire('asIn', 'write', 'asWrite', 'set'),
    wire('asWrite', 'done', 'asOut', 'written'),
    wire('asWrite', 'done', 'asKeep', 'request'),
    wire('asRead', 'value', 'asOut', 'app'),
    wire('asRead', 'changed', 'asOut', 'changed'),
    wire('asStore', 'ready', 'asOut', 'ready'),
    wire('asStore', 'error', 'asOut', 'error')
  ]
};

const SOUND_NAMES = ['correct', 'wrong', 'win', 'lose', 'heart', 'tick', 'pop'] as const;

/** The kit's Sound nodes, wrapped once, with one mute. */
const PLAY_SOUNDS: Tpl007Component = {
  path: 'Logic/Play sounds',
  description: 'One signal per game sound, and one Enabled flag that mutes them all — the profile\'s sound setting wires here.',
  inputs: [port('enabled', 'boolean'), ...SOUND_NAMES.map((s) => port(s, 'signal'))],
  outputs: [port('ended', 'signal')],
  nodes: [
    inputs('psIn', 'Which sound', [['enabled', 'boolean'], ...SOUND_NAMES.map((s) => [s, 'signal'] as [string, string])]),
    ...SOUND_NAMES.map((s) => logic(`ps_${s}`, KIT_SOUND, `Sound: ${s}`, { sound: s, volume: 0.4 })),
    outputs('psOut', 'When a sound ends', [['ended', 'signal']])
  ],
  connections: SOUND_NAMES.flatMap((s) => [
    wire('psIn', 'enabled', `ps_${s}`, 'enabled'),
    wire('psIn', s, `ps_${s}`, 'play'),
    wire(`ps_${s}`, 'ended', 'psOut', 'ended')
  ])
};

// ── Game/* — the visual parts ───────────────────────────────────────────────

/** A face: the kit's Avatar with a ring when chosen. */
const FACE: Tpl007Component = {
  path: 'Game/Face',
  description: 'A profile\'s face: the same Look and Seed always draw the same picture. Selected puts a ring on it. Publishes Clicked.',
  inputs: [port('look', 'string'), port('seed', 'string'), port('size', 'number'), port('selected', 'boolean'), port('options', 'object', 'RKT-011: what the face wears, as the kit Avatar’s DiceBear options')],
  outputs: [port('clicked', 'signal')],
  nodes: [
    inputs('fcIn', 'Whose face', [['look', 'string'], ['seed', 'string'], ['size', 'number'], ['selected', 'boolean'], ['options', 'object']]),
    watch('fcIsOn', 'Is it selected?'),
    // 🔴 `off` FIRST: a States node starts in its first state, and `selected` is optional —
    // an instance that never sets it must show no ring.
    withStates('fcStates', 'Ringed or not', ['off', 'on'], { ring: { type: 'number', by: { on: 4, off: 0 } } }),
    // 🔴 A Group root, with the kit node inside it. A kit React node as a component's ROOT
    // renders nothing when the component is placed (measured on the deployed page, 2026-09-12);
    // a Group root draws, and the kit node draws as its child.
    // 🔒 R28 (Richard, 2026-09-17, GAM-014 AC6): the Group around the kit node STAYS. GAM-014 fixed the cause (a kit-rooted
    // component drew nothing, because a deploy never loaded the kit and its root read as an unknown type), so the wrap is a
    // size decision now, not a workaround: it is what `contentSize` is declared on. `Game/Keyboard`'s `kbRoot` stays for the
    // same reason, and `Game/Race track`'s carries the 30vh / 56vw budget until GAM-017's size half. No gate pins these three
    // wraps (checked: the gate pins their wires, not their roots), so there was nothing to update.
    group('fcRoot', 'The face', undefined, { sizeMode: 'contentSize' }, ['fcAvatar']),
    place('fcAvatar', KIT_AVATAR, 'The picture', 'fcRoot', { look: 'pixel-art', seed: 'Rocket', size: 64, ringColor: ROLE.you }),
    outputs('fcOut', 'Tapped', [['clicked', 'signal']])
  ],
  connections: [
    wire('fcIn', 'look', 'fcAvatar', 'look'),
    wire('fcIn', 'seed', 'fcAvatar', 'seed'),
    wire('fcIn', 'size', 'fcAvatar', 'size'),
    wire('fcIn', 'options', 'fcAvatar', 'options'),
    wire('fcIn', 'selected', 'fcIsOn', 'condition'),
    wire('fcIsOn', 'ontrue', 'fcStates', 'to-on'),
    wire('fcIsOn', 'onfalse', 'fcStates', 'to-off'),
    wire('fcStates', 'ring', 'fcAvatar', 'ringWidth'),
    wire('fcAvatar', 'onClick', 'fcOut', 'clicked')
  ]
};

/** One profile in the list. Row fields from Logic/List profiles. */
const PROFILE_CARD: Tpl007Component = {
  path: 'Game/Profile card',
  description: 'One player in the who-is-playing list: face, name, class, what is due. Selected changes the border. Publishes Chosen with the profile id.',
  inputs: [port('id', 'string'), port('name', 'string'), port('look', 'string'), port('seed', 'string'), port('level', 'string'), port('selected', 'boolean'), port('due', 'number'), port('faceOptions', 'object', 'RKT-011: what the face wears. Wearing is fine here; the star count never is')],
  outputs: [port('chosen', 'signal'), port('id', 'string')],
  instantiates: [C.face],
  nodes: [
    inputs('pcIn', 'The row', [['id', 'string'], ['name', 'string'], ['look', 'string'], ['seed', 'string'], ['level', 'string'], ['selected', 'boolean'], ['due', 'number'], ['faceOptions', 'object']]),
    group('pcCard', 'The card', undefined, {
      ...CARD,
      width: px(150),
      sizeMode: 'contentHeight',
      alignItems: 'center',
      rowGap: 'var(--space-2)',
      paddingTop: 'var(--space-4)',
      paddingBottom: 'var(--space-4)',
      paddingLeft: 'var(--space-3)',
      paddingRight: 'var(--space-3)',
      borderWidth: px(3),
      cssClassName: 'pressable'
    }, ['pcFace', 'pcName', 'pcLevelPill', 'pcDue']),
    place('pcFace', C.face, 'The face', 'pcCard', { size: 72 }),
    text('pcName', 'The name', 'pcCard', '', { ...T_CARD, textAlignX: 'center' }),
    // A Text has no box: the pill is a Group, the class is the Text inside it.
    group('pcLevelPill', 'The class pill', 'pcCard', { ...BADGE, backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }, ['pcLevel']),
    text('pcLevel', 'The class', 'pcLevelPill', '', { ...T_META, ...WORD }),
    text('pcDue', 'What is due', 'pcCard', '', { ...T_META, color: ROLE.costly, textAlignX: 'center' }),
    logic('pcDueText', EXPRESSION_NODE, 'A clock when something is due', { expression: "due > 0 ? '⏰ ' + due : ''" }),
    watch('pcSelected', 'Is this the one?'),
    // RKT-002: the chosen player is a sunshine card; the edge stays ink (tomato on paper is 2.92).
    withStates('pcStates', 'Chosen or not', ['off', 'on'], {
      edge: { type: 'color', by: { on: ROLE.ink, off: 'var(--border)' } },
      ground: { type: 'color', by: { on: ROLE.picked, off: 'var(--surface)' } }
    }),
    outputs('pcOut', 'Tapped', [['chosen', 'signal'], ['id', 'string']])
  ],
  connections: [
    wire('pcIn', 'look', 'pcFace', 'look'),
    wire('pcIn', 'seed', 'pcFace', 'seed'),
    wire('pcIn', 'faceOptions', 'pcFace', 'options'),
    wire('pcIn', 'selected', 'pcFace', 'selected'),
    wire('pcIn', 'name', 'pcName', 'text'),
    wire('pcIn', 'level', 'pcLevel', 'text'),
    wire('pcIn', 'due', 'pcDueText', 'due'),
    wire('pcDueText', 'result', 'pcDue', 'text'),
    wire('pcIn', 'selected', 'pcSelected', 'condition'),
    wire('pcSelected', 'ontrue', 'pcStates', 'to-on'),
    wire('pcSelected', 'onfalse', 'pcStates', 'to-off'),
    wire('pcStates', 'edge', 'pcCard', 'borderColor'),
    wire('pcStates', 'ground', 'pcCard', 'backgroundColor'),
    wire('pcCard', 'onClick', 'pcOut', 'chosen'),
    wire('pcFace', 'clicked', 'pcOut', 'chosen'),
    wire('pcIn', 'id', 'pcOut', 'id')
  ]
};

/** One option in a segmented control. Row fields from Logic/Mark selected. */
const CHOICE: Tpl007Component = {
  path: 'Game/Choice',
  description: 'One option in a choice row: a pill that fills when Selected. Publishes Picked with its value.',
  inputs: [port('label', 'string'), port('value', 'string'), port('selected', 'boolean')],
  outputs: [port('picked', 'signal'), port('value', 'string')],
  nodes: [
    inputs('chIn', 'The option', [['label', 'string'], ['value', 'string'], ['selected', 'boolean']]),
    group('chPill', 'The pill', undefined, {
      ...BADGE,
      cssClassName: 'pressable',
      backgroundColor: 'var(--surface)',
      borderColor: 'var(--border-control)',
      borderWidth: px(2)
    }, ['chText']),
    text('chText', 'The label', 'chPill', '', { ...T_BODY, fontWeight: 'var(--font-semibold)', ...WORD }),
    watch('chIsOn', 'Is it selected?'),
    withStates('chStates', 'Filled or not', ['off', 'on'], {
      bg: { type: 'color', by: { on: ROLE.you, off: 'var(--surface)' } },
      fg: { type: 'color', by: { on: 'var(--primary-foreground)', off: 'var(--foreground)' } },
      edge: { type: 'color', by: { on: ROLE.ink, off: 'var(--border-control)' } }
    }),
    outputs('chOut', 'Tapped', [['picked', 'signal'], ['value', 'string']])
  ],
  connections: [
    wire('chIn', 'label', 'chText', 'text'),
    wire('chIn', 'selected', 'chIsOn', 'condition'),
    wire('chIsOn', 'ontrue', 'chStates', 'to-on'),
    wire('chIsOn', 'onfalse', 'chStates', 'to-off'),
    wire('chStates', 'bg', 'chPill', 'backgroundColor'),
    wire('chStates', 'edge', 'chPill', 'borderColor'),
    wire('chStates', 'fg', 'chText', 'color'),
    wire('chPill', 'onClick', 'chOut', 'picked'),
    wire('chIn', 'value', 'chOut', 'value')
  ]
};

/** A segmented control: a controlled value in, the value and Changed out. */
const CHOICE_ROW: Tpl007Component = {
  path: 'Game/Choice row',
  description: 'A row of pills, one selected. Items is [{ label, value }]. Value in, Value and Changed out — hold the value in a Variable and wire it back.',
  inputs: [port('items', 'array'), port('value', 'string'), port('label', 'string')],
  outputs: [port('value', 'string'), port('changed', 'signal')],
  repeats: { source: 'array', rowFields: ['label', 'value', 'selected'] },
  instantiates: [C.choice, logicName('Logic/Mark selected')],
  nodes: [
    inputs('crIn', 'The options and the value', [['items', 'array'], ['value', 'string'], ['label', 'string']]),
    group('crWrap', 'The control', undefined, column({ rowGap: 'var(--space-2)' }), ['crLabel', 'crRow']),
    text('crLabel', 'What is being chosen', 'crWrap', '', { ...T_META, fontWeight: 'var(--font-semibold)' }),
    // 🔴 RKT-001: a content-sized row never wraps (its width IS its pills), so on a phone the French
    // pills ran 43px past the screen. The row takes the control's width, and then it wraps.
    group('crRow', 'The pills', 'crWrap', row({ width: pct(100), sizeMode: 'contentHeight' }), ['crEach']),
    logic('crEach', FOR_EACH_NODE, 'One pill per option', { template: C.choice, templateType: 'explicit' }),
    logic('crMark', logicName('Logic/Mark selected'), 'Flag the chosen one'),
    outputs('crOut', 'What was chosen', [['value', 'string'], ['changed', 'signal']])
  ],
  connections: [
    wire('crIn', 'label', 'crLabel', 'text'),
    wire('crIn', 'items', 'crMark', 'items'),
    wire('crIn', 'value', 'crMark', 'value'),
    wire('crMark', 'rows', 'crEach', 'items'),
    // 🔴 No Variable here: a Variable is GLOBAL by name, and a page holds several of these rows.
    // The repeater publishes the row's value BEFORE its signal (measured, TPL-006), so the
    // item ports go straight to the outputs.
    wire('crEach', 'itemOutput-value', 'crOut', 'value'),
    wire('crEach', 'itemOutputSignal-picked', 'crOut', 'changed')
  ]
};

/** A game on the home screen. */
const GAME_CARD: Tpl007Component = {
  path: 'Game/Game card',
  description: 'One game on the home screen: a glyph, a title, a line. Enabled false greys it out for a game that is not built yet. Publishes Chosen.',
  inputs: [port('title', 'string'), port('blurb', 'string'), port('glyph', 'string'), port('enabled', 'boolean')],
  outputs: [port('chosen', 'signal')],
  nodes: [
    inputs('gcIn', 'The game', [['title', 'string'], ['blurb', 'string'], ['glyph', 'string'], ['enabled', 'boolean']]),
    group('gcCard', 'The card', undefined, {
      ...CARD,
      cssClassName: 'pressable game-card',
      rowGap: 'var(--space-2)',
      paddingTop: 'var(--space-5)',
      paddingBottom: 'var(--space-5)',
      paddingLeft: 'var(--space-5)',
      paddingRight: 'var(--space-5)'
    }, ['gcGlyph', 'gcTitle', 'gcBlurb']),
    text('gcGlyph', 'The glyph', 'gcCard', '🚀', { fontSize: 'var(--text-4xl)', ...WORD }),
    text('gcTitle', 'The title', 'gcCard', '', T_CARD),
    text('gcBlurb', 'The line', 'gcCard', '', T_META),
    watch('gcOn', 'Is it playable?'),
    withStates('gcStates', 'Playable or not yet', ['on', 'off'], {
      opacity: { type: 'number', by: { on: 1, off: 0.45 } },
      edge: { type: 'color', by: { on: 'var(--border)', off: 'var(--border-subtle)' } }
    }),
    gate('gcGate', 'Only a playable one answers a tap'),
    outputs('gcOut', 'Tapped', [['chosen', 'signal']])
  ],
  connections: [
    wire('gcIn', 'title', 'gcTitle', 'text'),
    wire('gcIn', 'blurb', 'gcBlurb', 'text'),
    wire('gcIn', 'glyph', 'gcGlyph', 'text'),
    wire('gcIn', 'enabled', 'gcOn', 'condition'),
    wire('gcOn', 'ontrue', 'gcStates', 'to-on'),
    wire('gcOn', 'onfalse', 'gcStates', 'to-off'),
    wire('gcStates', 'opacity', 'gcCard', 'opacity'),
    wire('gcStates', 'edge', 'gcCard', 'borderColor'),
    wire('gcIn', 'enabled', 'gcGate', 'condition'),
    wire('gcCard', 'onClick', 'gcGate', 'eval'),
    wire('gcGate', 'ontrue', 'gcOut', 'chosen')
  ]
};

/**
 * The bar across the top of every signed-in page, and the player menu (RKT-008).
 *
 * 🔴 Finding 10 was a language row on every screen, and on a phone the bar stacked into three rows (≈200px before Home's first
 * reading). Now the bar is one row: the face and name, which open the menu, and Home. The menu holds everything a child changes
 * rarely. Its scripts live here, not on the page (a page is capped at 32 nodes): the page hands in the store and writes what comes back.
 */
const HEADER: Tpl007Component = {
  path: 'Game/Header',
  description: 'The top bar: one row with the player\'s face and name, which opens the player menu, and Home. The menu opens the hangar, edits the player (or deletes them), sets language, keyboard, sound and answers, and switches player. Every change is written through App in, then App and Write out. Hide Bar takes the bar and the menu away in a live race; Show Hangar false leaves the hangar out of the menu (on the hangar itself). Publishes Home, Hangar, Switch Player and Deleted.',
  inputs: [port('app', 'object'), port('profileId', 'string'), port('name', 'string'), port('look', 'string'), port('seed', 'string'), port('level', 'string'), port('lang', 'string'), port('layout', 'string'), port('soundMode', 'string'), port('answerMode', 'string'), port('showHome', 'boolean'), port('hideBar', 'boolean'), port('options', 'object', 'RKT-011: what the face wears'), port('showHangar', 'boolean', 'the hangar in the player menu; false on the hangar itself')],
  outputs: [port('home', 'signal'), port('switchPlayer', 'signal'), port('app', 'object'), port('write', 'signal'), port('deleted', 'signal'), port('hangar', 'signal')],
  instantiates: [C.face, C.choiceRow, C.newPlayer, C.words, logicName('Logic/Translate words'), logicName('Logic/Update settings'), logicName('Logic/Delete profile')],
  nodes: [
    inputs('hdIn', 'Who, and the store', [['app', 'object'], ['profileId', 'string'], ['name', 'string'], ['look', 'string'], ['seed', 'string'], ['level', 'string'], ['lang', 'string'], ['layout', 'string'], ['soundMode', 'string'], ['answerMode', 'string'], ['showHome', 'boolean'], ['hideBar', 'boolean'], ['options', 'object'], ['showHangar', 'boolean']]),
    group('hdRoot', 'The bar and its menu', undefined, column({ rowGap: 'var(--space-3)' }), ['hdBar', 'hdMenu', 'hdForm']),
    // 🔴 AC2: one row at every width. It never wraps: the name takes what Home leaves, and wraps inside its own space.
    group('hdBar', 'The bar', 'hdRoot', { ...column(), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', columnGap: 'var(--space-4)', flexWrap: 'nowrap' }, ['hdWho', 'hdHome']),
    group('hdWho', 'The player, which opens the menu', 'hdBar', { width: pct(100), sizeMode: 'contentHeight', flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap', columnGap: 'var(--space-3)', cssClassName: 'pressable' }, ['hdFace', 'hdName', 'hdOpen']),
    place('hdFace', C.face, 'The face', 'hdWho', { size: 40 }),
    // A percentage width in a row grows and shrinks (layout.ts), so a 24-character name gives way to Home instead of pushing it off.
    text('hdName', 'The name', 'hdWho', '', { ...T_BODY, fontWeight: 'var(--font-bold)', width: pct(100) }),
    // 🔴 Not wired: a tap on it reaches hdWho's Click (a click bubbles), so wiring both would open and close the menu in one tap. It is
    // here to say "this opens", and to take the keyboard's focus; Enter on a focused button is a click too.
    place('hdOpen', BUTTON_NODE, 'Opens the menu', 'hdWho', { ...BTN_OUTLINE, label: '▾' }),
    place('hdHome', BUTTON_NODE, 'Home', 'hdBar', { ...BTN_OUTLINE, label: 'Home' }),
    // The menu. The ruling (2026-09-13): switch player and language on Home and before a race, never inside a live race; hdBarRoom
    // takes the whole root away in a live race, so the menu goes with the bar.
    group('hdMenu', 'The player menu', 'hdRoot', { ...CARD, rowGap: 'var(--space-4)', paddingTop: 'var(--space-5)', paddingBottom: 'var(--space-5)', paddingLeft: 'var(--space-5)', paddingRight: 'var(--space-5)', maxWidth: px(480) }, ['hdHangar', 'hdEdit', 'hdLang', 'hdKeys', 'hdSound', 'hdAnswers', 'hdActions']),
    // Richard, 2026-09-14: the hangar is not a game, so it left Home's games for the player's own menu (and Home's bar to the next pick).
    place('hdHangar', BUTTON_NODE, 'The hangar', 'hdMenu', { ...BTN_PRIMARY, label: '🎁 Hangar' }),
    place('hdEdit', BUTTON_NODE, 'Edit player', 'hdMenu', { ...BTN_OUTLINE, label: 'Edit player' }),
    place('hdLang', C.choiceRow, 'Language', 'hdMenu'),
    place('hdKeys', C.choiceRow, 'Keyboard', 'hdMenu'),
    place('hdSound', C.choiceRow, 'Sound', 'hdMenu'),
    place('hdAnswers', C.choiceRow, 'Answers', 'hdMenu'),
    group('hdActions', 'Switch, or close', 'hdMenu', row({ width: pct(100), sizeMode: 'contentHeight', columnGap: 'var(--space-2)' }), ['hdSwitch', 'hdClose']),
    place('hdSwitch', BUTTON_NODE, 'Switch player', 'hdActions', { ...BTN_OUTLINE, label: 'Switch player' }),
    place('hdClose', BUTTON_NODE, 'Close', 'hdActions', { ...BTN_OUTLINE, label: 'Close' }),
    // Edit player is the New player form in edit mode: one form, two modes.
    place('hdForm', C.newPlayer, 'Edit the player', 'hdRoot', { editing: true }),
    logic('hdWords', C.words, 'The words'),
    logic('hdT', logicName('Logic/Translate words'), 'In their language'),
    // RKT-006: the race page hides the whole bar in a live race. 🔴 An Expression wired straight into the bar's Mounted hid Home's
    // WHOLE bar (EN, FR and Switch player all 0, both cells), whatever the port was called (`mounted` in build 3, `hideBar` in build 4):
    // Home never feeds it, and the wire seeded Mounted with the unevaluated result. Session 6's pattern instead: a States node whose
    // FIRST state is `shown`, so a page that never says "hide" keeps its bar.
    // 🔒 R28 (Richard, 2026-09-17, GAM-001 AC6): KEPT DELIBERATELY, and no longer because of D55 — GAM-001 fixed the unset-input
    // cause. A States node says what each page means (`shown` / `hidden`) where a boolean would say nothing on the canvas.
    logic('hdHide', EXPRESSION_NODE, 'Hide the bar?', { expression: "hide === true ? 'hidden' : 'shown'" }),
    withStates('hdBarRoom', 'The bar, or the race’s own row', ['shown', 'hidden'], { on: { type: 'boolean', by: { shown: true, hidden: false } } }),
    // `closed` FIRST: a States node starts in its first state, so a page that never touches the menu shows it closed.
    // 🔒 R28 (Richard, 2026-09-17, GAM-001 AC6): KEPT DELIBERATELY. It began as a D55 workaround — an unset input reached its
    // target — and GAM-001 fixed that cause, so this is a template choice now: the first state is the one a page that says
    // nothing should get. D55 is no longer the reason.
    withStates('hdPanel', 'Closed, the menu, or editing the player', ['closed', 'menu', 'editing'], {
      open: { type: 'boolean', by: { closed: false, menu: true, editing: true } },
      menu: { type: 'boolean', by: { closed: false, menu: true, editing: false } },
      form: { type: 'boolean', by: { closed: false, menu: false, editing: true } }
    }),
    gate('hdIsOpen', 'Open already?'),
    { id: 'hdLangItems', type: STATIC_DATA_NODE, label: 'The two languages', parameters: { type: 'json', json: JSON.stringify([{ label: 'English', value: 'en' }, { label: 'Français', value: 'fr' }]) } },
    { id: 'hdKeyItems', type: STATIC_DATA_NODE, label: 'The two keyboards', parameters: { type: 'json', json: JSON.stringify([{ label: 'FR · AZERTY', value: 'azerty' }, { label: 'UK · QWERTY', value: 'qwerty-uk' }, { label: 'US · QWERTY', value: 'qwerty' }]) } },
    logic('hdSoundItems', FUNCTION_NODE, 'On or off, in words', { functionScript: "Outputs.items = [{ label: Inputs.on, value: 'on' }, { label: Inputs.off, value: 'off' }];" }),
    logic('hdAnswerItems', FUNCTION_NODE, 'Type, buttons or auto, in words', { functionScript: "Outputs.items = [{ label: Inputs.typed, value: 'typed' }, { label: Inputs.options, value: 'options' }, { label: Inputs.auto, value: 'auto' }];" }),
    // 🔴 Two Update settings, never one: the form's Variables are global by name, so one script fed by both would write a stale face or
    // class whenever the language changed.
    logic('hdSet', logicName('Logic/Update settings'), 'Write a setting, at once'),
    logic('hdRename', logicName('Logic/Update settings'), 'Write the edited player, on Save'),
    logic('hdDelete', logicName('Logic/Delete profile'), 'Delete the player, on Yes'),
    outputs('hdOut', 'What was pressed, and the store to write', [['home', 'signal'], ['switchPlayer', 'signal'], ['app', 'object'], ['write', 'signal'], ['deleted', 'signal'], ['hangar', 'signal']])
  ],
  connections: [
    wire('hdWords', 'words', 'hdT', 'words'),
    wire('hdIn', 'lang', 'hdT', 'lang'),
    wire('hdIn', 'name', 'hdName', 'text'),
    wire('hdIn', 'look', 'hdFace', 'look'),
    wire('hdIn', 'seed', 'hdFace', 'seed'),
    wire('hdIn', 'options', 'hdFace', 'options'),
    wire('hdT', 'home', 'hdHome', 'label'),
    wire('hdIn', 'showHome', 'hdHome', 'mounted'),
    wire('hdHome', 'onClick', 'hdOut', 'home'),
    wire('hdIn', 'hideBar', 'hdHide', 'hide'),
    wire('hdHide', 'result', 'hdBarRoom', 'currentState'),
    wire('hdBarRoom', 'on', 'hdRoot', 'mounted'),
    // Open and close: a tap on the face or name toggles, Close closes.
    wire('hdPanel', 'open', 'hdIsOpen', 'condition'),
    wire('hdWho', 'onClick', 'hdIsOpen', 'eval'),
    wire('hdIsOpen', 'ontrue', 'hdPanel', 'to-closed'),
    wire('hdIsOpen', 'onfalse', 'hdPanel', 'to-menu'),
    wire('hdClose', 'onClick', 'hdPanel', 'to-closed'),
    wire('hdPanel', 'menu', 'hdMenu', 'mounted'),
    wire('hdPanel', 'form', 'hdForm', 'mounted'),
    // The menu's words.
    wire('hdT', 'editPlayer', 'hdEdit', 'label'),
    wire('hdT', 'language', 'hdLang', 'label'),
    wire('hdT', 'keyboard', 'hdKeys', 'label'),
    wire('hdT', 'soundOn', 'hdSound', 'label'),
    wire('hdT', 'answersLabel', 'hdAnswers', 'label'),
    wire('hdT', 'switchPlayer', 'hdSwitch', 'label'),
    wire('hdT', 'closeMenu', 'hdClose', 'label'),
    wire('hdLangItems', 'items', 'hdLang', 'items'),
    wire('hdKeyItems', 'items', 'hdKeys', 'items'),
    wire('hdT', 'soundYes', 'hdSoundItems', 'in-on'),
    wire('hdT', 'soundNo', 'hdSoundItems', 'in-off'),
    wire('hdSoundItems', 'out-items', 'hdSound', 'items'),
    wire('hdT', 'answersTyped', 'hdAnswerItems', 'in-typed'),
    wire('hdT', 'answersOptions', 'hdAnswerItems', 'in-options'),
    wire('hdT', 'answersAuto', 'hdAnswerItems', 'in-auto'),
    wire('hdAnswerItems', 'out-items', 'hdAnswers', 'items'),
    // Each row shows the profile's value, and a tap writes it at once.
    wire('hdIn', 'lang', 'hdLang', 'value'),
    wire('hdIn', 'layout', 'hdKeys', 'value'),
    wire('hdIn', 'soundMode', 'hdSound', 'value'),
    wire('hdIn', 'answerMode', 'hdAnswers', 'value'),
    wire('hdIn', 'app', 'hdSet', 'app'),
    wire('hdIn', 'profileId', 'hdSet', 'profileId'),
    wire('hdLang', 'value', 'hdSet', 'lang'),
    wire('hdKeys', 'value', 'hdSet', 'layout'),
    wire('hdSound', 'value', 'hdSet', 'soundMode'),
    wire('hdAnswers', 'value', 'hdSet', 'answerMode'),
    wire('hdLang', 'changed', 'hdSet', 'run'),
    wire('hdKeys', 'changed', 'hdSet', 'run'),
    wire('hdSound', 'changed', 'hdSet', 'run'),
    wire('hdAnswers', 'changed', 'hdSet', 'run'),
    wire('hdSet', 'app', 'hdOut', 'app'),
    wire('hdSet', 'done', 'hdOut', 'write'),
    wire('hdSwitch', 'onClick', 'hdOut', 'switchPlayer'),
    // The hangar, from the menu: the page navigates, and the menu closes behind it.
    wire('hdT', 'menuHangar', 'hdHangar', 'label'),
    wire('hdIn', 'showHangar', 'hdHangar', 'mounted'),
    wire('hdHangar', 'onClick', 'hdPanel', 'to-closed'),
    wire('hdHangar', 'onClick', 'hdOut', 'hangar'),
    // Edit player: the form, filled with who they are.
    wire('hdEdit', 'onClick', 'hdPanel', 'to-editing'),
    wire('hdEdit', 'onClick', 'hdForm', 'fill'),
    wire('hdIn', 'name', 'hdForm', 'name0'),
    wire('hdIn', 'look', 'hdForm', 'look0'),
    wire('hdIn', 'seed', 'hdForm', 'seed0'),
    wire('hdIn', 'level', 'hdForm', 'level0'),
    wire('hdT', 'yourName', 'hdForm', 'nameWord'),
    wire('hdT', 'pickAvatar', 'hdForm', 'faceWord'),
    wire('hdT', 'rollAvatar', 'hdForm', 'rollWord'),
    wire('hdT', 'yourLevel', 'hdForm', 'levelWord'),
    wire('hdT', 'language', 'hdForm', 'langWord'),
    wire('hdT', 'saveChanges', 'hdForm', 'createWord'),
    wire('hdT', 'cancel', 'hdForm', 'cancelWord'),
    wire('hdT', 'deleteProfile', 'hdForm', 'deleteWord'),
    wire('hdT', 'deleteAsk', 'hdForm', 'askWord'),
    wire('hdT', 'deleteYes', 'hdForm', 'yesWord'),
    wire('hdT', 'deleteNo', 'hdForm', 'noWord'),
    wire('hdForm', 'cancel', 'hdPanel', 'to-menu'),
    wire('hdIn', 'app', 'hdRename', 'app'),
    wire('hdIn', 'profileId', 'hdRename', 'profileId'),
    wire('hdForm', 'name', 'hdRename', 'name'),
    wire('hdForm', 'look', 'hdRename', 'look'),
    wire('hdForm', 'seed', 'hdRename', 'seed'),
    wire('hdForm', 'level', 'hdRename', 'level'),
    wire('hdForm', 'create', 'hdRename', 'run'),
    wire('hdRename', 'app', 'hdOut', 'app'),
    wire('hdRename', 'done', 'hdOut', 'write'),
    wire('hdRename', 'done', 'hdPanel', 'to-menu'),
    // Delete: only after the form has asked, by name.
    wire('hdIn', 'app', 'hdDelete', 'app'),
    wire('hdIn', 'profileId', 'hdDelete', 'profileId'),
    wire('hdForm', 'delete', 'hdDelete', 'run'),
    wire('hdDelete', 'app', 'hdOut', 'app'),
    wire('hdDelete', 'done', 'hdOut', 'write'),
    wire('hdDelete', 'done', 'hdPanel', 'to-closed'),
    wire('hdDelete', 'done', 'hdOut', 'deleted')
  ]
};

/** One reading. */
const STAT: Tpl007Component = {
  path: 'Game/Stat',
  description: 'One reading: a small label and a big number, in a tone. Tabular numerals so a column does not rag.',
  inputs: [port('label', 'string'), port('value', 'string'), port('tone', 'color')],
  outputs: [],
  nodes: [
    inputs('stIn', 'The reading', [['label', 'string'], ['value', 'string'], ['tone', 'color']]),
    group('stTile', 'The tile', undefined, { ...STAT_TILE, width: px(150), alignItems: 'center' }, ['stValue', 'stLabel']),
    text('stValue', 'The number', 'stTile', '0', { fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-bold)', fontVariantNumeric: 'tabular-nums', color: ROLE.you, ...WORD }),
    text('stLabel', 'The word', 'stTile', '', { ...T_META, textAlignX: 'center' })
  ],
  connections: [
    wire('stIn', 'label', 'stLabel', 'text'),
    wire('stIn', 'value', 'stValue', 'text'),
    wire('stIn', 'tone', 'stValue', 'color')
  ]
};

/** One of the four answer buttons. Row fields from the picker's `choices`. */
const OPTION_BUTTON: Tpl007Component = {
  path: 'Game/Option button',
  description: 'One answer button. Publishes Picked with its value.',
  inputs: [port('label', 'string'), port('value', 'string')],
  outputs: [port('picked', 'signal'), port('value', 'string')],
  nodes: [
    inputs('obIn', 'The option', [['label', 'string'], ['value', 'string']]),
    place('obBtn', BUTTON_NODE, 'The button', undefined as unknown as string, { ...BTN_OUTLINE, label: '?', fontSize: 'var(--text-xl)', paddingLeft: 'var(--space-8)', paddingRight: 'var(--space-8)', paddingTop: 'var(--space-4)', paddingBottom: 'var(--space-4)', minWidth: px(96) }),
    outputs('obOut', 'Tapped', [['picked', 'signal'], ['value', 'string']])
  ],
  connections: [
    wire('obIn', 'label', 'obBtn', 'label'),
    wire('obBtn', 'onClick', 'obOut', 'picked'),
    wire('obIn', 'value', 'obOut', 'value')
  ]
};
delete (OPTION_BUTTON.nodes[1] as Record<string, unknown>).parent;

/**
 * TPL-007 §16 — Race/Round is placed on two pages now (the race's and Monster Gate's), so the Variables inside its question box and its
 * clock are shared by name between the two copies (GAM-005's warning). They are shared on purpose, and it is safe: a page is one route, so
 * only one round is ever on screen; the clock writes all three of its values at every Start before it reads them, and the box writes
 * its answer before it fires Answered.
 */
const SHARED_ROUND = 'Shared on purpose: only one round is ever on screen (the race page\'s or Monster Gate\'s), and each question writes this before it is read.';

/** Put the cursor in the rendered answer field, on the next frame: the row has only just mounted. */
const FOCUS_ANSWER_SCRIPT = `if (typeof document !== 'undefined') {
  requestAnimationFrame(() => {
    const field = document.querySelector('.rkt-answer input');
    if (field && !field.disabled) field.focus();
  });
}`;

/** The question and the way to answer it. */
const QUESTION_BOX: Tpl007Component = {
  path: 'Game/Question box',
  description: 'The question, big, and the way to answer it: the kit\'s answer pad (Kind = typed) or four buttons (Kind = options). RKT-005: the pad draws Pad Keys to tap; a Numeric pad reads digits by key code, so AZERTY needs no Shift, and opens no soft keyboard on a touch screen. While Enabled is false the way to answer is gone, so a verdict can take its place without the screen growing. Publishes Answered with the answer, and Text as it is entered. RKT-012: Expected (a typing word) makes the pad refuse a key that does not continue it and draw ⌫ beside the box; Mistakes and Wrong Key say what it refused.',
  inputs: [port('prompt', 'string'), port('kind', 'string'), port('choices', 'array'), port('enabled', 'boolean'), port('placeholder', 'string'), port('checkWord', 'string'), port('skillName', 'string'), port('padKeys', 'string'), port('numeric', 'boolean'), port('expected', 'string', 'RKT-012: the word being typed; empty for maths')],
  outputs: [port('answered', 'signal'), port('answer', 'string'), port('text', 'string'), port('layoutSeen', 'string', 'RKT-008 AC7: the keyboard a key press reported'), port('layoutSeenNow', 'signal'), port('mistakes', 'number', 'RKT-012: keys refused on this question'), port('wrongKey', 'string', 'RKT-012: the last refused key')],
  repeats: { source: 'array', rowFields: ['label', 'value'] },
  instantiates: [C.optionButton],
  nodes: [
    inputs('qbIn', 'The question', [['prompt', 'string'], ['kind', 'string'], ['choices', 'array'], ['enabled', 'boolean'], ['placeholder', 'string'], ['checkWord', 'string'], ['skillName', 'string'], ['padKeys', 'string'], ['numeric', 'boolean'], ['expected', 'string']]),
    group('qbWrap', 'The box', undefined, { ...CARD, alignItems: 'center', rowGap: 'var(--space-4)', paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-6)', paddingLeft: 'var(--space-6)', paddingRight: 'var(--space-6)' }, ['qbSkill', 'qbPrompt', 'qbTyped', 'qbOptions']),
    text('qbSkill', 'Which skill', 'qbWrap', '', { ...T_EYEBROW, textAlignX: 'center' }),
    text('qbPrompt', 'The question', 'qbWrap', '', { fontSize: 'var(--text-4xl)', fontWeight: 'var(--font-bold)', textAlignX: 'center', color: 'var(--foreground)', lineHeight: 'var(--leading-tight)' }),
    // 🔴 RKT-005: the kit's pad, not a Text Input and a Check button. A Text Input's Set abstains while it has focus, so a pad
    // writing into one is dropped exactly while the child has the caret in it; and no port can ask a tablet for no keyboard (D60).
    group('qbTyped', 'Answer it', 'qbWrap', column({ alignItems: 'center', cssClassName: 'rkt-answer' }), ['qbPad']),
    place('qbPad', KIT_PAD, 'The answer pad', 'qbTyped', { keySize: 48, fieldWidth: 220, fieldFontSize: 'var(--text-2xl)', fontFamily: DISPLAY_FONT, radius: 'var(--radius-lg)', placeholder: '…' }),
    group('qbOptions', 'Pick one', 'qbWrap', row({ justifyContent: 'center' }), ['qbEach']),
    logic('qbEach', FOR_EACH_NODE, 'One button per option', { template: C.optionButton, templateType: 'explicit' }),
    // The variant selector: Kind ("typed" | "options") wired straight into currentState.
    withStates('qbStates', 'Typed or options', ['typed', 'options'], {
      showTyped: { type: 'boolean', by: { typed: true, options: false } },
      showOptions: { type: 'boolean', by: { typed: false, options: true } }
    }),
    // 🔴 RKT-003: while the box is not answering, the way to answer is gone and the verdict stands in its place.
    logic('qbShowTyped', EXPRESSION_NODE, 'Type it, while answering', { expression: 'show === true && enabled !== false' }),
    logic('qbShowOptions', EXPRESSION_NODE, 'Pick one, while answering', { expression: 'show === true && enabled !== false' }),
    // RKT-003: the skill's name is for the child answering; once the verdict is up it gives its line to the correction.
    logic('qbSkillShown', EXPRESSION_NODE, 'Name the skill while answering', { expression: 'enabled !== false' }),
    logic('qbFocusBox', FUNCTION_NODE, 'Put the cursor back in the box', { functionScript: FOCUS_ANSWER_SCRIPT }),
    // 🔴 RKT-003: the prompt steps down a size as it gets longer. At the 4xl a sum wears, the longest real prompt (a
    // nine-digit number in words, 118 characters) runs six lines on a phone and pushes the verdict off the screen.
    logic('qbLength', EXPRESSION_NODE, 'A sum, a sentence, or a long sentence?', { expression: "((prompt || '') + '').length <= 24 ? 'sum' : ((prompt || '') + '').length <= 60 ? 'sentence' : 'long'" }),
    withStates('qbSize', 'Big for a sum, smaller for a sentence', ['sum', 'sentence', 'long'], {
      size: { type: 'string', by: { sum: 'var(--text-4xl)', sentence: 'var(--text-3xl)', long: 'var(--text-xl)' } }
    }),
    // Values before signals: the answer is written, then Answered fires.
    logic('qbSetTyped', SET_VARIABLE_NODE, 'The typed answer', { name: 'questionAnswer' }),
    logic('qbSetPicked', SET_VARIABLE_NODE, 'The picked answer', { name: 'questionAnswer' }),
    { ...(logic('qbAnswer', VARIABLE_NODE, 'The answer', { name: 'questionAnswer' }) as object), comment: SHARED_ROUND },
    outputs('qbOut', 'The answer', [['answered', 'signal'], ['answer', 'string'], ['text', 'string'], ['layoutSeen', 'string'], ['layoutSeenNow', 'signal'], ['mistakes', 'number'], ['wrongKey', 'string']])
  ],
  connections: [
    wire('qbIn', 'skillName', 'qbSkill', 'text'),
    wire('qbIn', 'enabled', 'qbSkillShown', 'enabled'),
    wire('qbSkillShown', 'result', 'qbSkill', 'mounted'),
    wire('qbIn', 'prompt', 'qbPrompt', 'text'),
    wire('qbIn', 'prompt', 'qbLength', 'prompt'),
    wire('qbLength', 'result', 'qbSize', 'currentState'),
    wire('qbSize', 'size', 'qbPrompt', 'fontSize'),
    wire('qbIn', 'placeholder', 'qbPad', 'placeholder'),
    wire('qbIn', 'checkWord', 'qbPad', 'submitLabel'),
    wire('qbIn', 'enabled', 'qbPad', 'enabled'),
    wire('qbIn', 'padKeys', 'qbPad', 'keys'),
    wire('qbIn', 'numeric', 'qbPad', 'numeric'),
    // A new question clears the pad.
    wire('qbIn', 'prompt', 'qbPad', 'question'),
    wire('qbIn', 'kind', 'qbStates', 'currentState'),
    wire('qbStates', 'showTyped', 'qbShowTyped', 'show'),
    wire('qbIn', 'enabled', 'qbShowTyped', 'enabled'),
    wire('qbShowTyped', 'result', 'qbTyped', 'mounted'),
    wire('qbStates', 'showOptions', 'qbShowOptions', 'show'),
    wire('qbIn', 'enabled', 'qbShowOptions', 'enabled'),
    wire('qbShowOptions', 'result', 'qbOptions', 'mounted'),
    wire('qbIn', 'choices', 'qbEach', 'items'),
    // 🔴 RKT-003: the box comes back with the next question. The field's own Focus signal, sent on the row's didMount, left
    // it unfocused in 13 of 13 keyboard rounds (measured), so a Function focuses the rendered field on the next frame.
    wire('qbTyped', 'didMount', 'qbFocusBox', 'run'),
    // Typed: Enter or the pad's check key commits what is in the box.
    wire('qbPad', 'onText', 'qbSetTyped', 'value'),
    wire('qbPad', 'onSubmit', 'qbSetTyped', 'do'),
    // Options: the button's value.
    wire('qbEach', 'itemOutput-value', 'qbSetPicked', 'value'),
    wire('qbEach', 'itemOutputSignal-picked', 'qbSetPicked', 'do'),
    wire('qbAnswer', 'value', 'qbOut', 'answer'),
    wire('qbSetTyped', 'done', 'qbOut', 'answered'),
    wire('qbSetPicked', 'done', 'qbOut', 'answered'),
    wire('qbPad', 'onText', 'qbOut', 'text'),
    // RKT-008 AC7: the pad hears every key, so it is what tells the keyboard.
    wire('qbPad', 'onLayout', 'qbOut', 'layoutSeen'),
    wire('qbPad', 'onLayoutSeen', 'qbOut', 'layoutSeenNow'),
    // RKT-012: a typing word makes the pad refuse the keys that do not continue it; what it refused goes up to the grader and the keyboard.
    wire('qbIn', 'expected', 'qbPad', 'expected'),
    wire('qbPad', 'onMistakes', 'qbOut', 'mistakes'),
    wire('qbPad', 'onWrongKey', 'qbOut', 'wrongKey')
  ]
};

/** The clock, without a ticker: one Delay for the deadline, one Animate To Value for the bar. */
const COUNTDOWN: Tpl007Component = {
  path: 'Game/Countdown bar',
  description: 'A bar that empties over Limit ms after Start, with the whole seconds left beside it, and publishes Expired when it is empty. No ticker: a Delay is the deadline and an Animate To Value is the bar, and the seconds are read off the bar, so the two cannot disagree. The last three seconds pulse. Stop freezes the bar where it is. Enabled false makes it inert and unmounted (practice mode). Left is the bar itself, 100 full to 0 empty: TPL-007 §16 walks the monster off it, so the walk and the clock cannot disagree.',
  inputs: [port('limitMs', 'number'), port('start', 'signal'), port('stop', 'signal'), port('enabled', 'boolean')],
  outputs: [port('expired', 'signal'), port('isExpired', 'boolean'), port('running', 'boolean'), port('left', 'number')],
  nodes: [
    inputs('cdIn', 'The deadline', [['limitMs', 'number'], ['start', 'signal'], ['stop', 'signal'], ['enabled', 'boolean']]),
    // RKT-007: the seconds left sit beside the bar. The track keeps its 300×12 box, which the restart and stage drives read.
    group('cdRow', 'The clock', undefined, row({ justifyContent: 'center', columnGap: 'var(--space-3)', cssClassName: 'rkt-clock' }), ['cdTrack', 'cdSecs', 'cdSecsLast']),
    group('cdTrack', 'The track', 'cdRow', { width: px(300), height: px(12), sizeMode: 'explicit', backgroundColor: 'var(--surface-raised)', borderRadius: 'var(--radius-full)', borderStyle: 'solid', borderWidth: 'var(--border-1)', borderColor: 'var(--border)', clip: true }, ['cdFill']),
    group('cdFill', 'What is left', 'cdTrack', { width: px(300), height: px(12), sizeMode: 'explicit', backgroundColor: ROLE.you, borderRadius: 'var(--radius-full)' }),
    gate('cdGate', 'Timed at all?'),
    logic('cdDeadline', TIMER_NODE, 'The deadline'),
    // 🔴 RKT-006: "full" and "empty" were written in one burst, so the Animate saw one target only and the bar never refilled: a
    // question reached by Next showed a bar at 0.50–0.63 (session 6's deploy, measured). Empty now follows full a frame later, and the jump
    // takes 1 ms, because an Animate's duration of 0 is not a jump.
    logic('cdKick', TIMER_NODE, 'A frame after full: then glide', { duration: 40 }),
    logic('cdOne', EXPRESSION_NODE, 'One millisecond', { expression: '1' }),
    // The bar: jump to full (duration 0), then glide to empty over the limit.
    { ...(logic('cdDur', VARIABLE_NODE, 'How long the glide takes', { name: 'countdownDuration' }) as object), comment: SHARED_ROUND },
    { ...(logic('cdTarget', VARIABLE_NODE, 'Where the bar is heading', { name: 'countdownTarget' }) as object), comment: SHARED_ROUND },
    logic('cdSetDur0', SET_VARIABLE_NODE, 'No glide', { name: 'countdownDuration' }),
    logic('cdSetFull', SET_VARIABLE_NODE, 'Full', { name: 'countdownTarget' }),
    logic('cdSetDur', SET_VARIABLE_NODE, 'Glide over the limit', { name: 'countdownDuration' }),
    logic('cdSetEmpty', SET_VARIABLE_NODE, 'Empty', { name: 'countdownTarget' }),
    logic('cdAnim', ANIMATE_NODE, 'The bar, gliding', { easingCurve: 'linear' }),
    logic('cdWidth', EXPRESSION_NODE, 'Pixels of bar', { expression: 'round(v * 3)' }),
    logic('cdLevel', EXPRESSION_NODE, 'Nearly out?', { expression: "v < 30 ? 'low' : 'ok'" }),
    withStates('cdStates', 'Calm or urgent', ['ok', 'low'], { fill: { type: 'color', by: { ok: ROLE.you, low: ROLE.costly } } }),
    // Expired is a value written BEFORE the signal, so the grader reads it right.
    { ...(logic('cdExpired', VARIABLE_NODE, 'Has it run out?', { name: 'countdownExpired' }) as object), comment: SHARED_ROUND },
    logic('cdSetExpired', SET_VARIABLE_NODE, 'It ran out', { name: 'countdownExpired' }),
    logic('cdSetFresh', SET_VARIABLE_NODE, 'Not yet', { name: 'countdownExpired' }),
    logic('cdZero', EXPRESSION_NODE, 'Zero', { expression: '0' }),
    logic('cdHundred', EXPRESSION_NODE, 'A hundred', { expression: '100' }),
    logic('cdTrue', EXPRESSION_NODE, 'True', { expression: 'true' }),
    logic('cdShown', EXPRESSION_NODE, 'Only when timed', { expression: 'enabled === true' }),
    logic('cdFalse', EXPRESSION_NODE, 'False', { expression: 'false' }),
    // 🔴 RKT-007: the seconds are read off the bar's own Animate (0–100 of Limit), never a second clock. RKT-006 found the bar
    // had never refilled; a numeral on a clock of its own would have hidden that.
    text('cdSecs', 'Seconds left', 'cdRow', '', { ...T_BODY, fontWeight: 'var(--font-bold)', fontVariantNumeric: 'tabular-nums', lineHeight: 'var(--leading-tight)', cssClassName: 'rkt-clock-secs', ...WORD }),
    text('cdSecsLast', 'Seconds left, nearly out', 'cdRow', '', { ...T_BODY, fontWeight: 'var(--font-bold)', fontVariantNumeric: 'tabular-nums', lineHeight: 'var(--leading-tight)', color: ROLE.costly, cssClassName: 'rkt-clock-last', ...WORD }),
    logic('cdSecsText', EXPRESSION_NODE, 'Whole seconds left', { expression: "'' + ceil(v * limit / 100000)" }),
    logic('cdSecsNearly', EXPRESSION_NODE, 'The last three seconds?', { expression: "v * limit / 100000 > 0 && v * limit / 100000 <= 3 ? 'last' : 'calm'" }),
    // A States node starts in its first state, so an unfed clock is calm, never pulsing.
    withStates('cdSecsMode', 'Calm, or the last three seconds', ['calm', 'last'], {
      calm: { type: 'boolean', by: { calm: true, last: false } },
      last: { type: 'boolean', by: { calm: false, last: true } }
    }),
    // RKT-007: an answer stops the clock, and now the bar too. It glided on under the verdict, and a numeral counting down
    // (and pulsing) while the child reads the correction says there is still something to hurry for.
    logic('cdSetDurHold', SET_VARIABLE_NODE, 'Stop gliding', { name: 'countdownDuration' }),
    logic('cdSetHold', SET_VARIABLE_NODE, 'Stay where it is', { name: 'countdownTarget' }),
    outputs('cdOut', 'Time', [['expired', 'signal'], ['isExpired', 'boolean'], ['running', 'boolean'], ['left', 'number']])
  ],
  connections: [
    wire('cdIn', 'enabled', 'cdGate', 'condition'),
    wire('cdIn', 'start', 'cdGate', 'eval'),
    wire('cdIn', 'enabled', 'cdShown', 'enabled'),
    wire('cdShown', 'result', 'cdRow', 'mounted'),
    wire('cdAnim', 'currentValue', 'cdSecsText', 'v'),
    wire('cdIn', 'limitMs', 'cdSecsText', 'limit'),
    wire('cdAnim', 'currentValue', 'cdSecsNearly', 'v'),
    wire('cdIn', 'limitMs', 'cdSecsNearly', 'limit'),
    wire('cdSecsNearly', 'result', 'cdSecsMode', 'currentState'),
    wire('cdSecsMode', 'calm', 'cdSecs', 'mounted'),
    wire('cdSecsMode', 'last', 'cdSecsLast', 'mounted'),
    wire('cdSecsText', 'result', 'cdSecs', 'text'),
    wire('cdSecsText', 'result', 'cdSecsLast', 'text'),
    // Start: fresh, full, then glide.
    wire('cdFalse', 'result', 'cdSetFresh', 'value'),
    wire('cdGate', 'ontrue', 'cdSetFresh', 'do'),
    wire('cdOne', 'result', 'cdSetDur0', 'value'),
    wire('cdSetFresh', 'done', 'cdSetDur0', 'do'),
    wire('cdHundred', 'result', 'cdSetFull', 'value'),
    wire('cdSetDur0', 'done', 'cdSetFull', 'do'),
    wire('cdIn', 'limitMs', 'cdSetDur', 'value'),
    wire('cdSetFull', 'done', 'cdKick', 'restart'),
    wire('cdKick', 'timerFinished', 'cdSetDur', 'do'),
    wire('cdIn', 'stop', 'cdKick', 'stop'),
    wire('cdZero', 'result', 'cdSetEmpty', 'value'),
    wire('cdSetDur', 'done', 'cdSetEmpty', 'do'),
    wire('cdSetEmpty', 'done', 'cdDeadline', 'restart'),
    wire('cdIn', 'limitMs', 'cdDeadline', 'duration'),
    wire('cdIn', 'stop', 'cdDeadline', 'stop'),
    // Stop: the bar stays where it is (a 1 ms glide to its own current value).
    wire('cdOne', 'result', 'cdSetDurHold', 'value'),
    wire('cdIn', 'stop', 'cdSetDurHold', 'do'),
    wire('cdAnim', 'currentValue', 'cdSetHold', 'value'),
    wire('cdSetDurHold', 'done', 'cdSetHold', 'do'),
    // The bar follows the two variables.
    wire('cdTarget', 'value', 'cdAnim', 'targetValue'),
    wire('cdDur', 'value', 'cdAnim', 'duration'),
    wire('cdAnim', 'currentValue', 'cdWidth', 'v'),
    wire('cdWidth', 'result', 'cdFill', 'width'),
    wire('cdAnim', 'currentValue', 'cdLevel', 'v'),
    wire('cdLevel', 'result', 'cdStates', 'currentState'),
    wire('cdStates', 'fill', 'cdFill', 'backgroundColor'),
    // The deadline: value, then signal.
    wire('cdTrue', 'result', 'cdSetExpired', 'value'),
    wire('cdDeadline', 'timerFinished', 'cdSetExpired', 'do'),
    wire('cdSetExpired', 'done', 'cdOut', 'expired'),
    wire('cdExpired', 'value', 'cdOut', 'isExpired'),
    wire('cdIn', 'enabled', 'cdOut', 'running'),
    // TPL-007 §16: the bar itself, out, so Monster Gate walks its monster off this clock and never a second one.
    wire('cdAnim', 'currentValue', 'cdOut', 'left')
  ]
};

/** The course with two rockets, animated between the values the graph sends. */
const RACE_TRACK: Tpl007Component = {
  path: 'Game/Race track',
  description: 'The course, the planet and two rockets. Progress A and B (0..1) glide to their new values; ReachedA / ReachedB fire when a rocket lands on the planet. RKT-002: Burst A / B going up bursts sparks from that rocket, and the kit rings the planet on a landing.',
  inputs: [port('progressA', 'number'), port('progressB', 'number'), port('nameA', 'string'), port('nameB', 'string'), port('lookA', 'string'), port('seedA', 'string'), port('lookB', 'string'), port('seedB', 'string'), port('showB', 'boolean'), port('burstA', 'signal'), port('burstB', 'signal'), port('compact', 'boolean', 'A shorter course (18% of the screen height, not 30%), so the typing keyboard fits under it'), port('optionsA', 'object', 'RKT-011: what rocket A’s face wears'), port('paintA', 'string', 'RKT-011: rocket A’s paint, a colour token; unfed, it stays tomato')],
  outputs: [port('reachedA', 'signal'), port('reachedB', 'signal')],
  nodes: [
    inputs('rtIn', 'Who is where', [['progressA', 'number'], ['progressB', 'number'], ['nameA', 'string'], ['nameB', 'string'], ['lookA', 'string'], ['seedA', 'string'], ['lookB', 'string'], ['seedB', 'string'], ['showB', 'boolean'], ['burstA', 'signal'], ['burstB', 'signal'], ['compact', 'boolean'], ['optionsA', 'object'], ['paintA', 'string']]),
    // 🔴 RKT-005 (RKT-003 §3's unbuilt half): in a typing race the on-screen keyboard ended at 793 on a 768px screen and 779 on 720.
    // The course gives it room. A number reaching a units port keeps the port's unit, so 18 stays vh.
    logic('rtCompact', EXPRESSION_NODE, 'Full or compact?', { expression: "compact === true ? 'compact' : 'full'" }),
    withStates('rtBudget', 'How much of the screen the course takes', ['full', 'compact'], { height: { type: 'number', by: { full: 30, compact: 18 } } }),
    logic('rtAnimA', ANIMATE_NODE, 'Rocket A glides', { duration: 700, easingCurve: 'easeOut' }),
    logic('rtAnimB', ANIMATE_NODE, 'Rocket B glides', { duration: 700, easingCurve: 'easeOut' }),
    // 🔴 RKT-003: the course has a height budget — 30% of the screen's height, never taller than 56% of its width (a
    // phone). The kit fits a course to this box and draws a rocket at least 44px long inside it.
    group('rtRoot', 'The course', undefined, column({ sizeMode: 'explicit', height: { value: 30, unit: 'vh' }, maxHeight: { value: 56, unit: 'vw' } }), ['rtTrack']),
    place('rtTrack', KIT_TRACK, 'The kit’s track', 'rtRoot', { colorA: ROLE.you, colorB: ROLE.other, aspect: 'auto', rocketSize: 44 }),
    logic('rtLandedA', EXPRESSION_NODE, 'A at the planet?', { expression: 'p >= 1' }),
    logic('rtLandedB', EXPRESSION_NODE, 'B at the planet?', { expression: 'p >= 1' }),
    gate('rtGateA', 'Did A land?'),
    gate('rtGateB', 'Did B land?'),
    outputs('rtOut', 'Landings', [['reachedA', 'signal'], ['reachedB', 'signal']])
  ],
  connections: [
    wire('rtIn', 'compact', 'rtCompact', 'compact'),
    wire('rtCompact', 'result', 'rtBudget', 'currentState'),
    wire('rtBudget', 'height', 'rtRoot', 'height'),
    wire('rtIn', 'progressA', 'rtAnimA', 'targetValue'),
    wire('rtIn', 'progressB', 'rtAnimB', 'targetValue'),
    wire('rtAnimA', 'currentValue', 'rtTrack', 'progressA'),
    wire('rtAnimB', 'currentValue', 'rtTrack', 'progressB'),
    wire('rtIn', 'nameA', 'rtTrack', 'nameA'),
    wire('rtIn', 'nameB', 'rtTrack', 'nameB'),
    wire('rtIn', 'lookA', 'rtTrack', 'styleA'),
    wire('rtIn', 'seedA', 'rtTrack', 'seedA'),
    wire('rtIn', 'optionsA', 'rtTrack', 'optionsA'),
    wire('rtIn', 'paintA', 'rtTrack', 'colorA'),
    wire('rtIn', 'lookB', 'rtTrack', 'styleB'),
    wire('rtIn', 'seedB', 'rtTrack', 'seedB'),
    wire('rtIn', 'showB', 'rtTrack', 'showB'),
    // RKT-002 AC4: a count going up is a burst of sparks from that rocket.
    wire('rtIn', 'burstA', 'rtTrack', 'burstA'),
    wire('rtIn', 'burstB', 'rtTrack', 'burstB'),
    // RKT-007: the kit lights the stretch a move just gained, from the value each rocket is heading to (not the glide).
    wire('rtIn', 'progressA', 'rtTrack', 'targetA'),
    wire('rtIn', 'progressB', 'rtTrack', 'targetB'),
    // A landing is judged when the glide ends, on the value it was gliding to.
    wire('rtIn', 'progressA', 'rtLandedA', 'p'),
    wire('rtLandedA', 'result', 'rtGateA', 'condition'),
    wire('rtAnimA', 'atTargetValue', 'rtGateA', 'eval'),
    wire('rtGateA', 'ontrue', 'rtOut', 'reachedA'),
    wire('rtIn', 'progressB', 'rtLandedB', 'p'),
    wire('rtLandedB', 'result', 'rtGateB', 'condition'),
    wire('rtAnimB', 'atTargetValue', 'rtGateB', 'eval'),
    wire('rtGateB', 'ontrue', 'rtOut', 'reachedB')
  ]
};

/** Focus the visible button labelled Inputs.word, on the next frame: it has only just mounted. */
/** What just happened, and the two things to do about it. */
const FEEDBACK_BANNER: Tpl007Component = {
  path: 'Game/Feedback banner',
  description: 'What just happened — fluent, correct, wrong or out of time — with the correction and its strategy, a Next button and a Show-me button. RKT-007: beside the glyph, the grader\'s Boost line (how fast, and how much of a step it earned) and a small meter filled to that same Boost Pct. Show opens it; Next and ShowMe close it and publish.',
  inputs: [port('outcome', 'string'), port('message', 'string'), port('show', 'signal'), port('hide', 'signal'), port('canTeach', 'boolean'), port('fluentWord', 'string'), port('correctWord', 'string'), port('wrongWord', 'string'), port('timeUpWord', 'string'), port('nextWord', 'string'), port('showMeWord', 'string'), port('boost', 'string'), port('boostPct', 'number')],
  outputs: [port('next', 'signal'), port('showMe', 'signal'), port('isOpen', 'boolean')],
  nodes: [
    inputs('fbIn', 'What happened', [['outcome', 'string'], ['message', 'string'], ['show', 'signal'], ['hide', 'signal'], ['canTeach', 'boolean'], ['fluentWord', 'string'], ['correctWord', 'string'], ['wrongWord', 'string'], ['timeUpWord', 'string'], ['nextWord', 'string'], ['showMeWord', 'string'], ['boost', 'string'], ['boostPct', 'number']]),
    // RKT-003: tighter than a card, because it shares one screen with the track and the question.
    group('fbCard', 'The banner', undefined, { ...CARD, alignItems: 'center', rowGap: 'var(--space-2)', paddingTop: 'var(--space-4)', paddingBottom: 'var(--space-4)', paddingLeft: 'var(--space-5)', paddingRight: 'var(--space-5)', borderWidth: px(3), mounted: false }, ['fbTop', 'fbTitle', 'fbMessage', 'fbRow']),
    // 🔴 RKT-007: the boost shares the glyph's row, so it costs the stage no height (RKT-006 measured what one more row costs: Next off a 1280×720 screen).
    group('fbTop', 'What happened, and the boost', 'fbCard', row({ justifyContent: 'center', columnGap: 'var(--space-3)', maxWidth: pct(100) }), ['fbGlyph', 'fbBoost', 'fbMeter']),
    text('fbGlyph', 'The glyph', 'fbTop', '', { fontSize: 'var(--text-2xl)', ...WORD }),
    text('fbBoost', 'The boost', 'fbTop', '', { ...T_META, fontWeight: 'var(--font-bold)', color: ROLE.ink, fontVariantNumeric: 'tabular-nums', cssClassName: 'rkt-boost', ...WORD }),
    group('fbMeter', 'The boost, as a bar', 'fbTop', { width: px(48), height: px(10), sizeMode: 'explicit', backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-full)', borderStyle: 'solid', borderWidth: 'var(--border-1)', borderColor: 'var(--foreground)', clip: true, cssClassName: 'rkt-boost-meter' }, ['fbMeterFill']),
    // The fill's width is a percentage, and Boost Pct arrives as a bare number, which keeps the port's unit.
    group('fbMeterFill', 'How much of a step', 'fbMeter', { width: pct(100), height: px(10), sizeMode: 'explicit', backgroundColor: ROLE.you }),
    text('fbTitle', 'The headline', 'fbCard', '', { ...T_SECTION, textAlignX: 'center' }),
    text('fbMessage', 'The correction', 'fbCard', '', { ...T_BODY, textAlignX: 'center', maxWidth: px(560) }),
    group('fbRow', 'The two buttons', 'fbCard', row({ justifyContent: 'center' }), ['fbNext', 'fbTeach']),
    place('fbNext', BUTTON_NODE, 'Next', 'fbRow', { ...BTN_PRIMARY, label: 'Next' }),
    place('fbTeach', BUTTON_NODE, 'Show me how', 'fbRow', { ...BTN_OUTLINE, label: 'Show me how' }),
    logic('fbTitleText', EXPRESSION_NODE, 'The word for what happened', { expression: "outcome === 'fluent' ? fluentWord : outcome === 'correct' ? correctWord : outcome === 'timeout' ? timeUpWord : wrongWord" }),
    // The variant selector: Outcome wired straight into currentState.
    withStates('fbStates', 'What kind of news', ['fluent', 'correct', 'wrong', 'timeout'], {
      // RKT-002: good news is ink on sunshine (a tomato headline on sunshine is 2.2); bad news is berry on the card.
      tone: { type: 'color', by: { fluent: ROLE.ink, correct: ROLE.ink, wrong: ROLE.costly, timeout: ROLE.costly } },
      ground: { type: 'color', by: { fluent: ROLE.picked, correct: ROLE.picked, wrong: 'var(--surface)', timeout: 'var(--surface)' } },
      glyph: { type: 'string', by: { fluent: '🚀', correct: '✅', wrong: '❌', timeout: '⏰' } }
    }),
    logic('fbHasMessage', EXPRESSION_NODE, 'Anything to say?', { expression: "((message || '') + '').length > 0" }),
    // RKT-007: the banner never recomputes the boost. The line and the meter are the grader's `boost` and `speed`, as sent.
    logic('fbHasBoost', EXPRESSION_NODE, 'A boost line to show?', { expression: "((boost || '') + '').length > 0" }),
    // 🔴 Builds 1 and 2: an Expression between the speed and the fill's Width sent {value: null} in 8 of 8 cells, even as
    // `round((s || 0) * 48)`. A new wire seeds its target with the source's current value, and an Expression's result is null
    // until it first evaluates (`node.ts` connectInput). The grader's Boost Pct reads undefined until it runs, which seeds nothing.
    logic('fbMeterOn', EXPRESSION_NODE, 'Any boost at all?', { expression: '(p || 0) > 0' }),
    // 🔴 Open/closed is a States node, NOT a Variable: a Variable is global by name, and the
    // race page holds two banners (the round's, the result's) — one Variable opened both.
    withStates('fbOpen', 'Open or closed', ['closed', 'open'], { isOpen: { type: 'boolean', by: { closed: false, open: true } } }),
    // RKT-003: Next takes the keyboard, so Enter, Enter plays on. P88 GAM-010: a Button has a Focus action now, so Next
    // focuses itself as it mounts (every time the banner opens) — no script looking for a button by its label.
    outputs('fbOut', 'What was pressed', [['next', 'signal'], ['showMe', 'signal'], ['isOpen', 'boolean']])
  ],
  connections: [
    wire('fbIn', 'outcome', 'fbTitleText', 'outcome'),
    wire('fbIn', 'fluentWord', 'fbTitleText', 'fluentWord'),
    wire('fbIn', 'correctWord', 'fbTitleText', 'correctWord'),
    wire('fbIn', 'wrongWord', 'fbTitleText', 'wrongWord'),
    wire('fbIn', 'timeUpWord', 'fbTitleText', 'timeUpWord'),
    wire('fbTitleText', 'result', 'fbTitle', 'text'),
    wire('fbIn', 'outcome', 'fbStates', 'currentState'),
    wire('fbStates', 'tone', 'fbTitle', 'color'),
    wire('fbStates', 'tone', 'fbCard', 'borderColor'),
    wire('fbStates', 'ground', 'fbCard', 'backgroundColor'),
    wire('fbStates', 'glyph', 'fbGlyph', 'text'),
    wire('fbIn', 'message', 'fbMessage', 'text'),
    wire('fbIn', 'message', 'fbHasMessage', 'message'),
    wire('fbHasMessage', 'result', 'fbMessage', 'mounted'),
    wire('fbIn', 'boost', 'fbBoost', 'text'),
    wire('fbIn', 'boost', 'fbHasBoost', 'boost'),
    wire('fbHasBoost', 'result', 'fbBoost', 'mounted'),
    wire('fbIn', 'boostPct', 'fbMeterFill', 'width'),
    wire('fbIn', 'boostPct', 'fbMeterOn', 'p'),
    wire('fbMeterOn', 'result', 'fbMeter', 'mounted'),
    wire('fbIn', 'nextWord', 'fbNext', 'label'),
    wire('fbIn', 'showMeWord', 'fbTeach', 'label'),
    wire('fbIn', 'canTeach', 'fbTeach', 'mounted'),
    wire('fbIn', 'show', 'fbOpen', 'to-open'),
    wire('fbIn', 'hide', 'fbOpen', 'to-closed'),
    wire('fbNext', 'onClick', 'fbOpen', 'to-closed'),
    wire('fbTeach', 'onClick', 'fbOpen', 'to-closed'),
    wire('fbOpen', 'isOpen', 'fbCard', 'mounted'),
    wire('fbNext', 'didMount', 'fbNext', 'focus'),
    wire('fbOpen', 'isOpen', 'fbOut', 'isOpen'),
    wire('fbNext', 'onClick', 'fbOut', 'next'),
    wire('fbTeach', 'onClick', 'fbOut', 'showMe')
  ]
};

/** RKT-004: a boxed line inside the Teach card — the worked question, or the card's example. */
const TEACH_BOX = { width: pct(100), sizeMode: 'contentHeight', flexDirection: 'column', alignItems: 'center', rowGap: 'var(--space-1)', borderRadius: 'var(--radius-md)', borderStyle: 'solid', borderWidth: 'var(--border-1)', borderColor: 'var(--foreground)', paddingTop: 'var(--space-2)', paddingBottom: 'var(--space-2)', paddingLeft: 'var(--space-4)', paddingRight: 'var(--space-4)', mounted: false };

/** RKT-004 — the trick for the question just missed, drawn in the race stage in the round's place. */
const TEACH_CARD: Tpl007Component = {
  path: 'Game/Teach card',
  description: 'The Teach card for the question just missed, in the race stage where the round was: the idea, the step for how many times in a row this skill was missed, the child\'s own question and how to work it (the card\'s example when there is none), and Got it, focused so Enter plays on. Publishes GotIt.',
  inputs: [port('mounted', 'boolean'), port('title', 'string'), port('text', 'string'), port('example', 'string'), port('prompt', 'string'), port('worked', 'string'), port('anExampleWord', 'string'), port('gotItWord', 'string')],
  outputs: [port('gotIt', 'signal')],
  nodes: [
    inputs('tcIn', 'The card', [['mounted', 'boolean'], ['title', 'string'], ['text', 'string'], ['example', 'string'], ['prompt', 'string'], ['worked', 'string'], ['anExampleWord', 'string'], ['gotItWord', 'string']]),
    group('tcCard', 'The card', undefined, { ...CARD, alignItems: 'center', rowGap: 'var(--space-2)', paddingTop: 'var(--space-4)', paddingBottom: 'var(--space-4)', paddingLeft: 'var(--space-4)', paddingRight: 'var(--space-4)', borderWidth: px(3), maxWidth: px(640), mounted: false }, ['tcTitle', 'tcText', 'tcWorkedBox', 'tcExampleBox', 'tcRow']),
    // Build 3's cardWorst: the display-size title took two ~40px lines on a phone. xl keeps the face and gives back a line's worth.
    text('tcTitle', 'The idea', 'tcCard', '', { ...T_SECTION, fontSize: 'var(--text-xl)', lineHeight: 'var(--leading-tight)', textAlignX: 'center' }),
    text('tcText', 'The step', 'tcCard', '', { ...T_BODY, textAlignX: 'center', maxWidth: px(560) }),
    // The child's own question, worked: a sunshine sticker. Without one (typing, a custom set), the card's example instead.
    group('tcWorkedBox', 'Your question, worked', 'tcCard', { ...TEACH_BOX, backgroundColor: ROLE.picked }, ['tcPrompt', 'tcWorked']),
    // Looked at, build 1: the box showed the working and never the question it works.
    text('tcPrompt', 'The question', 'tcWorkedBox', '', { fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)', color: ROLE.ink, textAlignX: 'center', lineHeight: 'var(--leading-tight)' }),
    text('tcWorked', 'Worked through', 'tcWorkedBox', '', { ...T_BODY, color: ROLE.ink, fontWeight: 'var(--font-bold)', textAlignX: 'center', fontVariantNumeric: 'tabular-nums' }),
    group('tcExampleBox', 'An example', 'tcCard', { ...TEACH_BOX, backgroundColor: 'var(--background)' }, ['tcExampleLabel', 'tcExample']),
    text('tcExampleLabel', 'An example', 'tcExampleBox', '', { ...T_EYEBROW, textAlignX: 'center' }),
    text('tcExample', 'The example', 'tcExampleBox', '', { ...T_BODY, color: ROLE.ink, textAlignX: 'center', fontVariantNumeric: 'tabular-nums' }),
    group('tcRow', 'The way on', 'tcCard', row({ justifyContent: 'center' }), ['tcGotIt']),
    place('tcGotIt', BUTTON_NODE, 'Got it', 'tcRow', { ...BTN_PRIMARY, label: 'Got it' }),
    // 🔴 The longest real question (a nine-digit number spelled out, 118 characters) pushed Got it 12px off a 1366×768 screen at xl.
    // The teach drive's worst-case swap mirrors this rule, and the template gate holds the two together.
    logic('tcLength', EXPRESSION_NODE, 'A sum, or a sentence?', { expression: "((prompt || '') + '').length <= 24 ? 'sum' : 'long'" }),
    withStates('tcSize', 'Big for a sum, body size for a sentence', ['sum', 'long'], { size: { type: 'string', by: { sum: 'var(--text-xl)', long: 'var(--text-base)' } } }),
    logic('tcHasWorked', EXPRESSION_NODE, 'This question, worked?', { expression: "((worked || '') + '').length > 0" }),
    logic('tcNoWorked', EXPRESSION_NODE, 'If not, the card’s example', { expression: "((worked || '') + '').length === 0" }),
    outputs('tcOut', 'Understood', [['gotIt', 'signal']])
  ],
  connections: [
    wire('tcIn', 'mounted', 'tcCard', 'mounted'),
    wire('tcIn', 'title', 'tcTitle', 'text'),
    wire('tcIn', 'text', 'tcText', 'text'),
    wire('tcIn', 'prompt', 'tcPrompt', 'text'),
    wire('tcIn', 'prompt', 'tcLength', 'prompt'),
    wire('tcLength', 'result', 'tcSize', 'currentState'),
    wire('tcSize', 'size', 'tcPrompt', 'fontSize'),
    wire('tcIn', 'worked', 'tcWorked', 'text'),
    wire('tcIn', 'worked', 'tcHasWorked', 'worked'),
    wire('tcHasWorked', 'result', 'tcWorkedBox', 'mounted'),
    wire('tcIn', 'anExampleWord', 'tcExampleLabel', 'text'),
    wire('tcIn', 'example', 'tcExample', 'text'),
    wire('tcIn', 'worked', 'tcNoWorked', 'worked'),
    wire('tcNoWorked', 'result', 'tcExampleBox', 'mounted'),
    wire('tcIn', 'gotItWord', 'tcGotIt', 'label'),
    wire('tcGotIt', 'didMount', 'tcGotIt', 'focus'),
    wire('tcGotIt', 'onClick', 'tcOut', 'gotIt')
  ]
};

/** The on-screen keyboard, shown for typing. */
const KEYBOARD: Tpl007Component = {
  path: 'Game/Keyboard',
  description: 'The on-screen keyboard from the kit, AZERTY or QWERTY, with the next key lit. Show false hides it (maths questions). RKT-008 AC7: a small FR / UK / US dropdown sits at its corner, so a child whose keyboard is not the one drawn fixes it where they are looking; it publishes Picked with the layout chosen. RKT-012: Wrong Key flashes red each time Wrong Count goes up, and the next key stays lit.',
  inputs: [port('layout', 'string'), port('nextKey', 'string'), port('show', 'boolean'), port('wrongKey', 'string'), port('wrongCount', 'number')],
  outputs: [port('picked', 'string'), port('pick', 'signal')],
  nodes: [
    inputs('kbIn', 'Which key', [['layout', 'string'], ['nextKey', 'string'], ['show', 'boolean'], ['wrongKey', 'string'], ['wrongCount', 'number']]),
    // A column, the dropdown on top at the right: beside the map it would widen a phone's typing screen past the edge.
    group('kbRoot', 'The keyboard', undefined, { sizeMode: 'contentSize', flexDirection: 'column', alignItems: 'flex-end', rowGap: 'var(--space-2)' }, ['kbPick', 'kbMap']),
    place('kbPick', 'net.noodl.controls.options', 'FR, UK or US', 'kbRoot'),
    place('kbMap', KIT_KEYBOARD, 'The kit’s keyboard', 'kbRoot', { keySize: 34 }),
    logic('kbShown', EXPRESSION_NODE, 'Only when asked', { expression: 'show === true' }),
    // A Function, not Static Data: the Dropdown's Items is an `optionslist`, and the door warns an `array` may not arrive there
    // (type-incompatible-connection, build 7). A plain array of { Label, Value } is what Select.tsx reads.
    logic('kbPickItems', FUNCTION_NODE, 'The three keyboards', { functionScript: "Outputs.items = [{ Label: 'FR', Value: 'azerty' }, { Label: 'UK', Value: 'qwerty-uk' }, { Label: 'US', Value: 'qwerty' }];" }),
    outputs('kbOut', 'The keyboard chosen', [['picked', 'string'], ['pick', 'signal']])
  ],
  connections: [
    wire('kbIn', 'layout', 'kbMap', 'layout'),
    wire('kbIn', 'nextKey', 'kbMap', 'nextKey'),
    wire('kbIn', 'wrongKey', 'kbMap', 'wrongKey'),
    wire('kbIn', 'wrongCount', 'kbMap', 'wrongCount'),
    wire('kbIn', 'show', 'kbShown', 'show'),
    wire('kbShown', 'result', 'kbMap', 'mounted'),
    wire('kbShown', 'result', 'kbPick', 'mounted'),
    // A Function with no inputs runs only when told (every other one here is run by a didMount), so the keyboard's mount runs it.
    wire('kbRoot', 'didMount', 'kbPickItems', 'run'),
    wire('kbPickItems', 'out-items', 'kbPick', 'items'),
    // The profile's layout shows as chosen; setting it from the graph does not fire Changed (options.ts).
    wire('kbIn', 'layout', 'kbPick', 'value'),
    wire('kbPick', 'value', 'kbOut', 'picked'),
    wire('kbPick', 'onChange', 'kbOut', 'pick')
  ]
};

// ── Profiles/New player form ────────────────────────────────────────────────

const LOOK_ITEMS = JSON.stringify([
  { label: 'Pixel', value: 'pixel-art' },
  { label: 'Emoji', value: 'fun-emoji' },
  { label: 'Thumbs', value: 'thumbs' },
  { label: 'Smile', value: 'big-smile' },
  { label: 'Adventurer', value: 'adventurer' }
]);
const LEVEL_ITEMS = JSON.stringify(LEVELS.map((l) => ({ label: l, value: l })));
const LANG_ITEMS = JSON.stringify([{ label: 'English', value: 'en' }, { label: 'Français', value: 'fr' }]);

/**
 * GAM-005's warning, answered: the form is drawn by Pages/Profiles and by every page's Game/Header (Edit player), so its four draft
 * Variables are app-wide. That is on purpose: only one form is ever on screen (Profiles has no header), and every opening rewrites the
 * draft — Reset (New player) sets look, level and language; Fill (Edit player) sets look, level and seed.
 */
const SHARED_DRAFT = 'Shared on purpose: one player draft at a time. New player resets it and Edit player fills it each time the form opens, and only one form is ever on screen.';

const NEW_PLAYER_FORM: Tpl007Component = {
  path: 'Profiles/New player form',
  description: 'The player form: a name, a face (five styles, re-rollable), a class and a language. Publishes Create with every field, or Cancel. RKT-008: with Editing, it is the same form for a player who exists. Fill puts their name, face and class in, the language row steps aside (the menu has it), and Delete asks by name before it publishes Delete.',
  inputs: [port('mounted', 'boolean'), port('nameWord', 'string'), port('faceWord', 'string'), port('rollWord', 'string'), port('levelWord', 'string'), port('langWord', 'string'), port('createWord', 'string'), port('cancelWord', 'string'), port('reset', 'signal'), port('editing', 'boolean'), port('fill', 'signal'), port('name0', 'string'), port('look0', 'string'), port('seed0', 'string'), port('level0', 'string'), port('deleteWord', 'string'), port('askWord', 'string'), port('yesWord', 'string'), port('noWord', 'string')],
  outputs: [port('create', 'signal'), port('cancel', 'signal'), port('name', 'string'), port('look', 'string'), port('seed', 'string'), port('level', 'string'), port('lang', 'string'), port('delete', 'signal')],
  instantiates: [C.face, C.choiceRow],
  nodes: [
    inputs('nfIn', 'The words', [['mounted', 'boolean'], ['nameWord', 'string'], ['faceWord', 'string'], ['rollWord', 'string'], ['levelWord', 'string'], ['langWord', 'string'], ['createWord', 'string'], ['cancelWord', 'string'], ['reset', 'signal'], ['editing', 'boolean'], ['fill', 'signal'], ['name0', 'string'], ['look0', 'string'], ['seed0', 'string'], ['level0', 'string'], ['deleteWord', 'string'], ['askWord', 'string'], ['yesWord', 'string'], ['noWord', 'string']]),
    group('nfCard', 'The form', undefined, { ...CARD, rowGap: 'var(--space-5)', paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-6)', paddingLeft: 'var(--space-6)', paddingRight: 'var(--space-6)', maxWidth: px(560) }, ['nfNameLabel', 'nfName', 'nfFaceRow', 'nfLook', 'nfLevel', 'nfLangWrap', 'nfActions', 'nfDanger']),
    text('nfNameLabel', 'Your name', 'nfCard', '', { ...T_META, fontWeight: 'var(--font-semibold)' }),
    place('nfName', TEXT_INPUT_NODE, 'The name box', 'nfCard', { ...FIELD, fontSize: 'var(--text-xl)' }),
    group('nfFaceRow', 'The face and the roll', 'nfCard', row({ columnGap: 'var(--space-4)' }), ['nfFace', 'nfRoll']),
    place('nfFace', C.face, 'The face so far', 'nfFaceRow', { size: 96 }),
    place('nfRoll', BUTTON_NODE, 'Roll again', 'nfFaceRow', { ...BTN_OUTLINE, label: 'Roll again' }),
    place('nfLook', C.choiceRow, 'Which style', 'nfCard'),
    place('nfLevel', C.choiceRow, 'Which class', 'nfCard'),
    // RKT-008: a Group, so editing can take the row away (a Choice row instance has no Mounted of its own).
    group('nfLangWrap', 'The language, for a new player', 'nfCard', column(), ['nfLang']),
    place('nfLang', C.choiceRow, 'Which language', 'nfLangWrap'),
    group('nfActions', 'The two buttons', 'nfCard', row(), ['nfCreate', 'nfCancel']),
    place('nfCreate', BUTTON_NODE, 'Create', 'nfActions', { ...BTN_PRIMARY, label: 'Let’s go!' }),
    place('nfCancel', BUTTON_NODE, 'Cancel', 'nfActions', { ...BTN_OUTLINE, label: 'Cancel' }),
    { id: 'nfLookItems', type: STATIC_DATA_NODE, label: 'The five styles', parameters: { type: 'json', json: LOOK_ITEMS } },
    { id: 'nfLevelItems', type: STATIC_DATA_NODE, label: 'The four classes', parameters: { type: 'json', json: LEVEL_ITEMS } },
    { id: 'nfLangItems', type: STATIC_DATA_NODE, label: 'The two languages', parameters: { type: 'json', json: LANG_ITEMS } },
    // The four choices, each held in a Variable and wired back (P2, the controlled value).
    { ...(logic('nfLookVar', VARIABLE_NODE, 'The chosen style', { name: 'newLook' }) as object), comment: SHARED_DRAFT },
    logic('nfSetLook', SET_VARIABLE_NODE, 'Choose a style', { name: 'newLook' }),
    { ...(logic('nfLevelVar', VARIABLE_NODE, 'The chosen class', { name: 'newLevel' }) as object), comment: SHARED_DRAFT },
    logic('nfSetLevel', SET_VARIABLE_NODE, 'Choose a class', { name: 'newLevel' }),
    { ...(logic('nfLangVar', VARIABLE_NODE, 'The chosen language', { name: 'newLang' }) as object), comment: SHARED_DRAFT },
    logic('nfSetLang', SET_VARIABLE_NODE, 'Choose a language', { name: 'newLang' }),
    { ...(logic('nfSeedVar', VARIABLE_NODE, 'The face seed', { name: 'newSeed' }) as object), comment: SHARED_DRAFT },
    logic('nfSetSeed', SET_VARIABLE_NODE, 'Roll a seed', { name: 'newSeed' }),
    logic('nfRandom', EXPRESSION_NODE, 'Six random letters', { expression: 'random().toString(36).slice(2, 8)' }),
    // Defaults, applied on Reset (the page fires it when the form opens).
    logic('nfDefaultLook', EXPRESSION_NODE, 'pixel-art', { expression: "'pixel-art'" }),
    logic('nfDefaultLevel', EXPRESSION_NODE, 'CE2', { expression: "'CE2'" }),
    logic('nfDefaultLang', EXPRESSION_NODE, 'en', { expression: "'en'" }),
    logic('nfResetLook', SET_VARIABLE_NODE, 'Back to pixel-art', { name: 'newLook' }),
    logic('nfResetLevel', SET_VARIABLE_NODE, 'Back to CE2', { name: 'newLevel' }),
    logic('nfResetLang', SET_VARIABLE_NODE, 'Back to English', { name: 'newLang' }),
    logic('nfShown', EXPRESSION_NODE, 'Only when opened', { expression: 'm === true' }),
    // RKT-008: editing a player who exists. 🔴 `create` FIRST (D55): the Profiles page never feeds Editing, so this Expression never
    // evaluates there, and the form stays a new-player form.
    logic('nfEditing', EXPRESSION_NODE, 'New, or editing?', { expression: "editing === true ? 'edit' : 'create'" }),
    withStates('nfMode', 'A new player, or one who exists', ['create', 'edit'], {
      create: { type: 'boolean', by: { create: true, edit: false } },
      edit: { type: 'boolean', by: { create: false, edit: true } }
    }),
    group('nfDanger', 'Deleting this player', 'nfCard', column({ rowGap: 'var(--space-3)' }), ['nfDelete', 'nfAsk']),
    place('nfDelete', BUTTON_NODE, 'Delete this player', 'nfDanger', { ...BTN_OUTLINE, label: 'Delete this player' }),
    group('nfAsk', 'Are you sure?', 'nfDanger', column({ rowGap: 'var(--space-3)' }), ['nfAskText', 'nfAskButtons']),
    text('nfAskText', 'Delete them, by name?', 'nfAsk', '', { ...T_BODY, fontWeight: 'var(--font-semibold)' }),
    group('nfAskButtons', 'Keep or delete', 'nfAsk', row({ width: pct(100), sizeMode: 'contentHeight' }), ['nfNo', 'nfYes']),
    // Keeping them is the loud button; deleting is the quiet one.
    place('nfNo', BUTTON_NODE, 'No, keep them', 'nfAskButtons', { ...BTN_PRIMARY, label: 'No, keep' }),
    place('nfYes', BUTTON_NODE, 'Yes, delete them', 'nfAskButtons', { ...BTN_OUTLINE, label: 'Yes, delete' }),
    withStates('nfAskState', 'Asked yet?', ['idle', 'asking'], {
      idle: { type: 'boolean', by: { idle: true, asking: false } },
      asking: { type: 'boolean', by: { idle: false, asking: true } }
    }),
    logic('nfAskLine', FUNCTION_NODE, 'The question, with their name', { functionScript: "Outputs.line = String(Inputs.word || '').replace('{name}', String(Inputs.name || ''));" }),
    logic('nfFillLook', SET_VARIABLE_NODE, 'Their style', { name: 'newLook' }),
    logic('nfFillLevel', SET_VARIABLE_NODE, 'Their class', { name: 'newLevel' }),
    logic('nfFillSeed', SET_VARIABLE_NODE, 'Their face seed', { name: 'newSeed' }),
    outputs('nfOut', 'The new player', [['create', 'signal'], ['cancel', 'signal'], ['name', 'string'], ['look', 'string'], ['seed', 'string'], ['level', 'string'], ['lang', 'string'], ['delete', 'signal']])
  ],
  connections: [
    wire('nfIn', 'mounted', 'nfShown', 'm'),
    wire('nfShown', 'result', 'nfCard', 'mounted'),
    wire('nfIn', 'nameWord', 'nfNameLabel', 'text'),
    wire('nfIn', 'nameWord', 'nfName', 'placeholder'),
    wire('nfIn', 'rollWord', 'nfRoll', 'label'),
    wire('nfIn', 'faceWord', 'nfLook', 'label'),
    wire('nfIn', 'levelWord', 'nfLevel', 'label'),
    wire('nfIn', 'langWord', 'nfLang', 'label'),
    wire('nfIn', 'createWord', 'nfCreate', 'label'),
    wire('nfIn', 'cancelWord', 'nfCancel', 'label'),
    wire('nfLookItems', 'items', 'nfLook', 'items'),
    wire('nfLevelItems', 'items', 'nfLevel', 'items'),
    wire('nfLangItems', 'items', 'nfLang', 'items'),
    // Each choice row: value in from the variable, changes written back.
    wire('nfLookVar', 'value', 'nfLook', 'value'),
    wire('nfLook', 'value', 'nfSetLook', 'value'),
    wire('nfLook', 'changed', 'nfSetLook', 'do'),
    wire('nfLevelVar', 'value', 'nfLevel', 'value'),
    wire('nfLevel', 'value', 'nfSetLevel', 'value'),
    wire('nfLevel', 'changed', 'nfSetLevel', 'do'),
    wire('nfLangVar', 'value', 'nfLang', 'value'),
    wire('nfLang', 'value', 'nfSetLang', 'value'),
    wire('nfLang', 'changed', 'nfSetLang', 'do'),
    // The face: the chosen style, the rolled seed.
    wire('nfLookVar', 'value', 'nfFace', 'look'),
    wire('nfSeedVar', 'value', 'nfFace', 'seed'),
    wire('nfRoll', 'onClick', 'nfRandom', 'run'),
    wire('nfRandom', 'result', 'nfSetSeed', 'value'),
    wire('nfRoll', 'onClick', 'nfSetSeed', 'do'),
    // Reset: defaults, and a fresh seed.
    wire('nfDefaultLook', 'result', 'nfResetLook', 'value'),
    wire('nfIn', 'reset', 'nfResetLook', 'do'),
    wire('nfDefaultLevel', 'result', 'nfResetLevel', 'value'),
    wire('nfResetLook', 'done', 'nfResetLevel', 'do'),
    wire('nfDefaultLang', 'result', 'nfResetLang', 'value'),
    wire('nfResetLevel', 'done', 'nfResetLang', 'do'),
    wire('nfResetLang', 'done', 'nfRandom', 'run'),
    wire('nfResetLang', 'done', 'nfSetSeed', 'do'),
    wire('nfIn', 'reset', 'nfName', 'clear'),
    // Out.
    wire('nfName', 'onTextChanged', 'nfOut', 'name'),
    wire('nfLookVar', 'value', 'nfOut', 'look'),
    wire('nfSeedVar', 'value', 'nfOut', 'seed'),
    wire('nfLevelVar', 'value', 'nfOut', 'level'),
    wire('nfLangVar', 'value', 'nfOut', 'lang'),
    wire('nfCreate', 'onClick', 'nfOut', 'create'),
    wire('nfCancel', 'onClick', 'nfOut', 'cancel'),
    // RKT-008: editing. The language row steps aside, and Delete shows.
    wire('nfIn', 'editing', 'nfEditing', 'editing'),
    wire('nfEditing', 'result', 'nfMode', 'currentState'),
    wire('nfMode', 'create', 'nfLangWrap', 'mounted'),
    wire('nfMode', 'edit', 'nfDanger', 'mounted'),
    // Fill: their face, class and seed into the form's Variables, and their name into the box.
    wire('nfIn', 'look0', 'nfFillLook', 'value'),
    wire('nfIn', 'fill', 'nfFillLook', 'do'),
    wire('nfIn', 'level0', 'nfFillLevel', 'value'),
    wire('nfIn', 'fill', 'nfFillLevel', 'do'),
    wire('nfIn', 'seed0', 'nfFillSeed', 'value'),
    wire('nfIn', 'fill', 'nfFillSeed', 'do'),
    // 🔴 `startValue`, the Text Input's Value. Build 6 wired `text`, a port it does not have: the door passed it (D66), the box opened
    // empty, and only the console said "Invalid connection, input doesn't exist". Fill pulses Set too, so a reopened form shows the name.
    wire('nfIn', 'name0', 'nfName', 'startValue'),
    wire('nfIn', 'fill', 'nfName', 'set'),
    // Delete: the first tap only asks, by name. 🔴 Nothing wires the first tap to Delete.
    wire('nfIn', 'deleteWord', 'nfDelete', 'label'),
    wire('nfIn', 'yesWord', 'nfYes', 'label'),
    wire('nfIn', 'noWord', 'nfNo', 'label'),
    wire('nfIn', 'askWord', 'nfAskLine', 'in-word'),
    wire('nfIn', 'name0', 'nfAskLine', 'in-name'),
    wire('nfAskLine', 'out-line', 'nfAskText', 'text'),
    wire('nfAskState', 'idle', 'nfDelete', 'mounted'),
    wire('nfAskState', 'asking', 'nfAsk', 'mounted'),
    wire('nfDelete', 'onClick', 'nfAskState', 'to-asking'),
    wire('nfNo', 'onClick', 'nfAskState', 'to-idle'),
    wire('nfIn', 'fill', 'nfAskState', 'to-idle'),
    wire('nfYes', 'onClick', 'nfAskState', 'to-idle'),
    wire('nfYes', 'onClick', 'nfOut', 'delete')
  ]
};

// ── Race/* — the Rocket Race ────────────────────────────────────────────────

const RACE_SETUP: Tpl007Component = {
  path: 'Race/Setup',
  description: 'Before a race: maths or typing, one player or two, practice or challenge, and the second player\'s name. Publishes Start with the four choices.',
  inputs: [port('mounted', 'boolean'), port('mathsWord', 'string'), port('typingWord', 'string'), port('onePlayerWord', 'string'), port('twoPlayersWord', 'string'), port('practiceWord', 'string'), port('challengeWord', 'string'), port('startWord', 'string'), port('nameWord', 'string'), port('practiceRuleWord', 'string'), port('challengeRuleWord', 'string')],
  outputs: [port('start', 'signal'), port('mode', 'string'), port('players', 'number'), port('timed', 'boolean'), port('nameB', 'string')],
  instantiates: [C.choiceRow],
  nodes: [
    inputs('rsIn', 'The words', [['mounted', 'boolean'], ['mathsWord', 'string'], ['typingWord', 'string'], ['onePlayerWord', 'string'], ['twoPlayersWord', 'string'], ['practiceWord', 'string'], ['challengeWord', 'string'], ['startWord', 'string'], ['nameWord', 'string'], ['practiceRuleWord', 'string'], ['challengeRuleWord', 'string']]),
    group('rsCard', 'The setup', undefined, { ...CARD, rowGap: 'var(--space-5)', paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-6)', paddingLeft: 'var(--space-6)', paddingRight: 'var(--space-6)', maxWidth: px(560) }, ['rsMode', 'rsPlayers', 'rsTimed', 'rsRule', 'rsNameB', 'rsStart']),
    place('rsMode', C.choiceRow, 'Maths or typing', 'rsCard'),
    place('rsPlayers', C.choiceRow, 'One or two', 'rsCard'),
    place('rsTimed', C.choiceRow, 'Practice or challenge', 'rsCard'),
    // RKT-007: two bare words on a pill row said nothing about the clock. The chosen mode says what it rewards and what happens at zero.
    text('rsRule', 'What this mode rewards', 'rsCard', '', T_META),
    place('rsNameB', TEXT_INPUT_NODE, 'Player two\'s name', 'rsCard', { ...FIELD, placeholder: 'Player 2' }),
    place('rsStart', BUTTON_NODE, 'Start', 'rsCard', { ...BTN_PRIMARY, label: 'Start', fontSize: 'var(--text-lg)' }),
    logic('rsModeItems', FUNCTION_NODE, 'The two modes, in words', { functionScript: "Outputs.items = [{ label: Inputs.maths, value: 'maths' }, { label: Inputs.typing, value: 'typing' }];" }),
    logic('rsPlayerItems', FUNCTION_NODE, 'One or two, in words', { functionScript: "Outputs.items = [{ label: Inputs.one, value: '1' }, { label: Inputs.two, value: '2' }];" }),
    logic('rsTimedItems', FUNCTION_NODE, 'Practice or challenge, in words', { functionScript: "Outputs.items = [{ label: Inputs.practice, value: 'practice' }, { label: Inputs.challenge, value: 'challenge' }];" }),
    logic('rsModeVar', VARIABLE_NODE, 'The mode', { name: 'raceMode' }),
    logic('rsSetMode', SET_VARIABLE_NODE, 'Choose a mode', { name: 'raceMode' }),
    logic('rsPlayersVar', VARIABLE_NODE, 'How many', { name: 'racePlayers' }),
    logic('rsSetPlayers', SET_VARIABLE_NODE, 'Choose how many', { name: 'racePlayers' }),
    logic('rsTimedVar', VARIABLE_NODE, 'Timed?', { name: 'raceTimed' }),
    logic('rsSetTimed', SET_VARIABLE_NODE, 'Choose timed', { name: 'raceTimed' }),
    // 🔴 RKT-006: a Text Input mounts from Start Value, and typing never writes Start Value, so the name came back empty every time
    // the setup did (RKT-006 build 2, 4 of 4). What was typed is kept here and handed back; a focused field is never fought (`setText`).
    logic('rsNameKeep', VARIABLE_NODE, 'Player two’s name, kept', { name: 'raceNameB' }),
    logic('rsIsTwo', EXPRESSION_NODE, 'Two players?', { expression: "players === '2'" }),
    logic('rsPlayersNum', EXPRESSION_NODE, 'As a number', { expression: "players === '2' ? 2 : 1" }),
    logic('rsIsTimed', EXPRESSION_NODE, 'Challenge?', { expression: "timed === 'challenge'" }),
    logic('rsRuleText', EXPRESSION_NODE, 'The chosen mode’s rule, in words', { expression: "timed === 'challenge' ? challenge : practice" }),
    logic('rsShown', EXPRESSION_NODE, 'Shown unless told not to', { expression: 'm !== false' }),
    // The defaults, written when the card first appears: maths, one player, practice.
    logic('rsDefMode', EXPRESSION_NODE, 'maths', { expression: "'maths'" }),
    logic('rsDefPlayers', EXPRESSION_NODE, 'one', { expression: "'1'" }),
    logic('rsDefTimed', EXPRESSION_NODE, 'practice', { expression: "'practice'" }),
    logic('rsInitMode', SET_VARIABLE_NODE, 'Start on maths', { name: 'raceMode' }),
    logic('rsInitPlayers', SET_VARIABLE_NODE, 'Start solo', { name: 'racePlayers' }),
    logic('rsInitTimed', SET_VARIABLE_NODE, 'Start untimed', { name: 'raceTimed' }),
    // 🔴 RKT-006: the card remounts every time the setup comes back, and it wrote the defaults on every mount, so "Change the race"
    // put a Défi two-player race back to practice and solo (measured, RKT-006 build 1, 4 of 4 cells). The defaults are written once.
    withStates('rsSeeded', 'Defaults written yet?', ['fresh', 'seeded'], { seeded: { type: 'boolean', by: { fresh: false, seeded: true } } }),
    gate('rsFirst', 'The first time the setup shows?'),
    outputs('rsOut', 'Go', [['start', 'signal'], ['mode', 'string'], ['players', 'number'], ['timed', 'boolean'], ['nameB', 'string']])
  ],
  connections: [
    wire('rsIn', 'mounted', 'rsShown', 'm'),
    wire('rsShown', 'result', 'rsCard', 'mounted'),
    wire('rsDefMode', 'result', 'rsInitMode', 'value'),
    wire('rsSeeded', 'seeded', 'rsFirst', 'condition'),
    wire('rsCard', 'didMount', 'rsFirst', 'eval'),
    wire('rsFirst', 'onfalse', 'rsInitMode', 'do'),
    wire('rsDefPlayers', 'result', 'rsInitPlayers', 'value'),
    wire('rsInitMode', 'done', 'rsInitPlayers', 'do'),
    wire('rsDefTimed', 'result', 'rsInitTimed', 'value'),
    wire('rsInitPlayers', 'done', 'rsInitTimed', 'do'),
    wire('rsInitTimed', 'done', 'rsSeeded', 'to-seeded'),
    wire('rsIn', 'mathsWord', 'rsModeItems', 'in-maths'),
    wire('rsIn', 'typingWord', 'rsModeItems', 'in-typing'),
    wire('rsIn', 'onePlayerWord', 'rsPlayerItems', 'in-one'),
    wire('rsIn', 'twoPlayersWord', 'rsPlayerItems', 'in-two'),
    wire('rsIn', 'practiceWord', 'rsTimedItems', 'in-practice'),
    wire('rsIn', 'challengeWord', 'rsTimedItems', 'in-challenge'),
    wire('rsTimedVar', 'value', 'rsRuleText', 'timed'),
    wire('rsIn', 'practiceRuleWord', 'rsRuleText', 'practice'),
    wire('rsIn', 'challengeRuleWord', 'rsRuleText', 'challenge'),
    wire('rsRuleText', 'result', 'rsRule', 'text'),
    wire('rsIn', 'startWord', 'rsStart', 'label'),
    wire('rsIn', 'nameWord', 'rsNameB', 'placeholder'),
    wire('rsNameB', 'onTextChanged', 'rsNameKeep', 'value'),
    wire('rsNameKeep', 'value', 'rsNameB', 'startValue'),
    wire('rsModeItems', 'out-items', 'rsMode', 'items'),
    wire('rsPlayerItems', 'out-items', 'rsPlayers', 'items'),
    wire('rsTimedItems', 'out-items', 'rsTimed', 'items'),
    wire('rsModeVar', 'value', 'rsMode', 'value'),
    wire('rsMode', 'value', 'rsSetMode', 'value'),
    wire('rsMode', 'changed', 'rsSetMode', 'do'),
    wire('rsPlayersVar', 'value', 'rsPlayers', 'value'),
    wire('rsPlayers', 'value', 'rsSetPlayers', 'value'),
    wire('rsPlayers', 'changed', 'rsSetPlayers', 'do'),
    wire('rsTimedVar', 'value', 'rsTimed', 'value'),
    wire('rsTimed', 'value', 'rsSetTimed', 'value'),
    wire('rsTimed', 'changed', 'rsSetTimed', 'do'),
    wire('rsPlayersVar', 'value', 'rsIsTwo', 'players'),
    wire('rsIsTwo', 'result', 'rsNameB', 'mounted'),
    wire('rsModeVar', 'value', 'rsOut', 'mode'),
    wire('rsPlayersVar', 'value', 'rsPlayersNum', 'players'),
    wire('rsPlayersNum', 'result', 'rsOut', 'players'),
    wire('rsTimedVar', 'value', 'rsIsTimed', 'timed'),
    wire('rsIsTimed', 'result', 'rsOut', 'timed'),
    wire('rsNameB', 'onTextChanged', 'rsOut', 'nameB'),
    wire('rsStart', 'onClick', 'rsOut', 'start')
  ]
};

/** One question: asked, answered or timed out, graded, and shown. */
const RACE_ROUND: Tpl007Component = {
  path: 'Race/Round',
  description: 'One question of a race: Ask picks it, the box or the clock answers it, the grader scores it, the banner shows it. Publishes Graded with the gains and the new model, then Next or ShowMe when the banner is dismissed. Abandon stops the clock, so a question left behind never grades.',
  inputs: [port('ask', 'signal'), port('abandon', 'signal'), port('raceId', 'string'), port('forB', 'boolean'), port('level', 'string'), port('lang', 'string'), port('layout', 'string'), port('mode', 'string'), port('answerMode', 'string'), port('model', 'object'), port('curriculum', 'array'), port('wordLists', 'array'), port('timed', 'boolean'), port('soundOn', 'boolean'), port('placeholder', 'string'), port('checkWord', 'string'), port('fluentWord', 'string'), port('correctWord', 'string'), port('wrongWord', 'string'), port('timeUpWord', 'string'), port('nextWord', 'string'), port('showMeWord', 'string'), port('limitScale', 'number', 'TPL-007 §16: the clock as a share of the skill’s; the race sends none'), port('game', 'string', 'TPL-007 §16: gate or push, so the verdict says a hit or a push; the race sends none')],
  outputs: [port('graded', 'signal'), port('correct', 'boolean'), port('gain', 'number'), port('cpuGain', 'number'), port('model', 'object'), port('outcome', 'string'), port('teach', 'string'), port('next', 'signal'), port('showMe', 'signal'), port('isTyping', 'boolean'), port('nextKey', 'string'), port('missCount', 'number'), port('worked', 'string'), port('prompt', 'string'), port('layoutSeen', 'string'), port('layoutSeenNow', 'signal'), port('layoutPick', 'string'), port('layoutPickNow', 'signal'), port('clockLeft', 'number')],
  instantiates: [C.questionBox, C.countdown, C.banner, C.keyboard, logicName('Logic/Pick next question'), logicName('Logic/Grade answer'), C.sounds],
  nodes: [
    inputs('rdIn', 'The profile and the words', [['ask', 'signal'], ['abandon', 'signal'], ['raceId', 'string'], ['forB', 'boolean'], ['level', 'string'], ['lang', 'string'], ['layout', 'string'], ['mode', 'string'], ['answerMode', 'string'], ['model', 'object'], ['curriculum', 'array'], ['wordLists', 'array'], ['timed', 'boolean'], ['soundOn', 'boolean'], ['placeholder', 'string'], ['checkWord', 'string'], ['fluentWord', 'string'], ['correctWord', 'string'], ['wrongWord', 'string'], ['timeUpWord', 'string'], ['nextWord', 'string'], ['showMeWord', 'string'], ['limitScale', 'number'], ['game', 'string']]),
    group('rdWrap', 'The round', undefined, column({ alignItems: 'center', rowGap: 'var(--space-3)' }), ['rdClock', 'rdBox', 'rdBanner', 'rdKeys']),
    place('rdClock', C.countdown, 'The clock', 'rdWrap'),
    place('rdBox', C.questionBox, 'The question', 'rdWrap'),
    place('rdBanner', C.banner, 'What happened', 'rdWrap'),
    place('rdKeys', C.keyboard, 'The keyboard', 'rdWrap'),
    logic('rdNonce', COUNTER_NODE, 'How many asked', { startValue: 0 }),
    logic('rdPick', logicName('Logic/Pick next question'), 'Pick the next question'),
    logic('rdGrade', logicName('Logic/Grade answer'), 'Grade the answer'),
    logic('rdSounds', C.sounds, 'The sounds'),
    // The live typing feeds the lit key: the next character of the answer.
    logic('rdNextKey', EXPRESSION_NODE, 'The next key to press', { expression: "((answer || '') + '').charAt(((typed || '') + '').length)" }),
    // 🔴 RKT-012: the pad is told the word, so it refuses a wrong key. Before, the lit key counted characters, not letters: three wrong
    // keys lit the fourth letter as if all was well. Maths gets '' and accepts every key.
    logic('rdExpected', EXPRESSION_NODE, 'The word the pad checks each key against', { expression: "isTyping === true ? ((answer || '') + '') : ''" }),
    logic('rdShowKeys', EXPRESSION_NODE, 'Show the keyboard?', { expression: 'isTyping === true && !open' }),
    logic('rdBoxOn', EXPRESSION_NODE, 'The box answers until the banner is up', { expression: '!open' }),
    // RKT-004: Show me only after a wrong or timed-out answer, on a skill that has a card. It showed after "Fast and correct!" too.
    logic('rdCanTeach', EXPRESSION_NODE, 'Something to teach?', { expression: "correct !== true && ((teach || '') + '').length > 0" }),
    gate('rdRight', 'Right or wrong?'),
    outputs('rdOut', 'The verdict', [['graded', 'signal'], ['correct', 'boolean'], ['gain', 'number'], ['cpuGain', 'number'], ['model', 'object'], ['outcome', 'string'], ['teach', 'string'], ['next', 'signal'], ['showMe', 'signal'], ['isTyping', 'boolean'], ['nextKey', 'string'], ['missCount', 'number'], ['worked', 'string'], ['prompt', 'string'], ['layoutSeen', 'string'], ['layoutSeenNow', 'signal'], ['layoutPick', 'string'], ['layoutPickNow', 'signal'], ['clockLeft', 'number']])
  ],
  connections: [
    // Ask: nudge the picker.
    wire('rdIn', 'ask', 'rdNonce', 'increase'),
    wire('rdNonce', 'currentCount', 'rdPick', 'nonce'),
    wire('rdIn', 'curriculum', 'rdPick', 'curriculum'),
    wire('rdIn', 'model', 'rdPick', 'model'),
    wire('rdIn', 'level', 'rdPick', 'level'),
    wire('rdIn', 'lang', 'rdPick', 'lang'),
    wire('rdIn', 'layout', 'rdPick', 'layout'),
    wire('rdIn', 'mode', 'rdPick', 'mode'),
    wire('rdIn', 'answerMode', 'rdPick', 'answerMode'),
    wire('rdIn', 'wordLists', 'rdPick', 'wordLists'),
    // TPL-007 §16: a monster that crept closer arrives sooner. The race wires no scale, and the picker hears none.
    wire('rdIn', 'limitScale', 'rdPick', 'limitScale'),
    // The question, shown.
    wire('rdPick', 'prompt', 'rdBox', 'prompt'),
    wire('rdPick', 'kind', 'rdBox', 'kind'),
    wire('rdPick', 'choices', 'rdBox', 'choices'),
    wire('rdPick', 'skillName', 'rdBox', 'skillName'),
    wire('rdIn', 'placeholder', 'rdBox', 'placeholder'),
    wire('rdIn', 'checkWord', 'rdBox', 'checkWord'),
    // RKT-005: the pad's keys follow the question — digits and this language's decimal point, or the word list's accents.
    wire('rdPick', 'padKeys', 'rdBox', 'padKeys'),
    wire('rdPick', 'padNumeric', 'rdBox', 'numeric'),
    wire('rdBanner', 'isOpen', 'rdBoxOn', 'open'),
    wire('rdBoxOn', 'result', 'rdBox', 'enabled'),
    // The clock starts with the question, in challenge mode.
    wire('rdPick', 'limitMs', 'rdClock', 'limitMs'),
    wire('rdIn', 'timed', 'rdClock', 'enabled'),
    wire('rdPick', 'done', 'rdClock', 'start'),
    // The keyboard.
    wire('rdIn', 'layout', 'rdKeys', 'layout'),
    wire('rdPick', 'answer', 'rdNextKey', 'answer'),
    wire('rdBox', 'text', 'rdNextKey', 'typed'),
    wire('rdNextKey', 'result', 'rdKeys', 'nextKey'),
    wire('rdPick', 'answer', 'rdExpected', 'answer'),
    wire('rdPick', 'isTyping', 'rdExpected', 'isTyping'),
    wire('rdExpected', 'result', 'rdBox', 'expected'),
    wire('rdBox', 'wrongKey', 'rdKeys', 'wrongKey'),
    wire('rdBox', 'mistakes', 'rdKeys', 'wrongCount'),
    wire('rdBox', 'mistakes', 'rdGrade', 'mistakes'),
    wire('rdPick', 'isTyping', 'rdShowKeys', 'isTyping'),
    wire('rdBanner', 'isOpen', 'rdShowKeys', 'open'),
    wire('rdShowKeys', 'result', 'rdKeys', 'show'),
    // Grading: the answer, or the clock.
    wire('rdIn', 'model', 'rdGrade', 'model'),
    wire('rdIn', 'level', 'rdGrade', 'level'),
    wire('rdIn', 'lang', 'rdGrade', 'lang'),
    wire('rdPick', 'skillId', 'rdGrade', 'skillId'),
    wire('rdPick', 'answer', 'rdGrade', 'answer'),
    wire('rdPick', 'fluentMs', 'rdGrade', 'fluentMs'),
    wire('rdPick', 'itemDiff', 'rdGrade', 'itemDiff'),
    wire('rdPick', 'shownAt', 'rdGrade', 'shownAt'),
    wire('rdPick', 'strategy', 'rdGrade', 'strategy'),
    wire('rdPick', 'worked', 'rdGrade', 'worked'),
    // RKT-010: the race this answer belongs to, and whether it is player two's (whose answers pay no stars into this profile, D63).
    wire('rdIn', 'raceId', 'rdGrade', 'raceId'),
    wire('rdIn', 'forB', 'rdGrade', 'forB'),
    // TPL-007 §16: Monster Gate says a hit or a push. The race wires no Game, and the grader keeps the rocket's words.
    wire('rdIn', 'game', 'rdGrade', 'game'),
    wire('rdBox', 'answer', 'rdGrade', 'typed'),
    wire('rdClock', 'isExpired', 'rdGrade', 'timedOut'),
    wire('rdBox', 'answered', 'rdGrade', 'run'),
    wire('rdClock', 'expired', 'rdGrade', 'run'),
    wire('rdBox', 'answered', 'rdClock', 'stop'),
    // RKT-006: a race left for the setup must not grade its last question when that question's deadline passes.
    wire('rdIn', 'abandon', 'rdClock', 'stop'),
    // The banner.
    wire('rdGrade', 'outcome', 'rdBanner', 'outcome'),
    wire('rdGrade', 'message', 'rdBanner', 'message'),
    // RKT-007: why the rocket went as far as it did, as the grader said it.
    wire('rdGrade', 'boost', 'rdBanner', 'boost'),
    wire('rdGrade', 'boostPct', 'rdBanner', 'boostPct'),
    wire('rdGrade', 'done', 'rdBanner', 'show'),
    wire('rdIn', 'fluentWord', 'rdBanner', 'fluentWord'),
    wire('rdIn', 'correctWord', 'rdBanner', 'correctWord'),
    wire('rdIn', 'wrongWord', 'rdBanner', 'wrongWord'),
    wire('rdIn', 'timeUpWord', 'rdBanner', 'timeUpWord'),
    wire('rdIn', 'nextWord', 'rdBanner', 'nextWord'),
    wire('rdIn', 'showMeWord', 'rdBanner', 'showMeWord'),
    wire('rdIn', 'ask', 'rdBanner', 'hide'),
    wire('rdGrade', 'correct', 'rdCanTeach', 'correct'),
    wire('rdPick', 'teach', 'rdCanTeach', 'teach'),
    wire('rdCanTeach', 'result', 'rdBanner', 'canTeach'),
    // A sound for each.
    wire('rdIn', 'soundOn', 'rdSounds', 'enabled'),
    wire('rdGrade', 'correct', 'rdRight', 'condition'),
    wire('rdGrade', 'done', 'rdRight', 'eval'),
    wire('rdRight', 'ontrue', 'rdSounds', 'correct'),
    wire('rdRight', 'onfalse', 'rdSounds', 'wrong'),
    // Out.
    wire('rdGrade', 'done', 'rdOut', 'graded'),
    // RKT-008 AC7: the keyboard a key press reports, and the one the child picks beside the map, go up to the page that stores them.
    wire('rdBox', 'layoutSeen', 'rdOut', 'layoutSeen'),
    wire('rdBox', 'layoutSeenNow', 'rdOut', 'layoutSeenNow'),
    wire('rdKeys', 'picked', 'rdOut', 'layoutPick'),
    wire('rdKeys', 'pick', 'rdOut', 'layoutPickNow'),
    wire('rdGrade', 'correct', 'rdOut', 'correct'),
    wire('rdGrade', 'gain', 'rdOut', 'gain'),
    wire('rdGrade', 'cpuGain', 'rdOut', 'cpuGain'),
    wire('rdGrade', 'model', 'rdOut', 'model'),
    wire('rdGrade', 'outcome', 'rdOut', 'outcome'),
    wire('rdPick', 'teach', 'rdOut', 'teach'),
    wire('rdBanner', 'next', 'rdOut', 'next'),
    wire('rdBanner', 'showMe', 'rdOut', 'showMe'),
    wire('rdPick', 'isTyping', 'rdOut', 'isTyping'),
    wire('rdNextKey', 'result', 'rdOut', 'nextKey'),
    wire('rdGrade', 'missCount', 'rdOut', 'missCount'),
    wire('rdPick', 'worked', 'rdOut', 'worked'),
    wire('rdPick', 'prompt', 'rdOut', 'prompt'),
    // TPL-007 §16: the bar's own position, for the monster's walk.
    wire('rdClock', 'left', 'rdOut', 'clockLeft')
  ]
};

/** RKT-002 AC4 — the end of a race is a screen in the race stage, not a banner under the setup. */
const RACE_RESULT: Tpl007Component = {
  path: 'Race/Result',
  description: 'The end of a race, drawn in the race stage under the track the rocket landed on: a glyph, who got there, how many were right, the stars this race earned and why (RKT-010), Play again (focused, so Enter plays on) and Change the race. Won picks a cheer or a consolation. Publishes Again and Other.',
  inputs: [port('mounted', 'boolean'), port('won', 'boolean'), port('headline', 'string'), port('line', 'string'), port('stars', 'string'), port('why', 'string'), port('againWord', 'string'), port('otherWord', 'string'), port('hasPick', 'boolean', 'RKT-011: this race crossed a milestone'), port('pickWord', 'string'), port('hangarWord', 'string')],
  outputs: [port('again', 'signal'), port('other', 'signal'), port('hangar', 'signal')],
  nodes: [
    inputs('rrIn', 'How it ended', [['mounted', 'boolean'], ['won', 'boolean'], ['headline', 'string'], ['line', 'string'], ['stars', 'string'], ['why', 'string'], ['againWord', 'string'], ['otherWord', 'string'], ['hasPick', 'boolean'], ['pickWord', 'string'], ['hangarWord', 'string']]),
    // 🔴 The two classes carry motion only, and APP_CSS stills both for reduced motion. The template gate holds them together.
    group('rrCard', 'The result', undefined, { ...CARD, alignItems: 'center', rowGap: 'var(--space-3)', paddingTop: 'var(--space-5)', paddingBottom: 'var(--space-5)', paddingLeft: 'var(--space-5)', paddingRight: 'var(--space-5)', borderWidth: px(3), maxWidth: px(560), cssClassName: 'rkt-result', mounted: false }, ['rrGlyph', 'rrTitle', 'rrLine', 'rrStars', 'rrWhy', 'rrPick', 'rrRow']),
    text('rrGlyph', 'The glyph', 'rrCard', '', { fontSize: 'var(--text-4xl)', cssClassName: 'rkt-result-glyph', ...WORD }),
    text('rrTitle', 'Who got there', 'rrCard', '', { ...T_SECTION, fontSize: 'var(--text-3xl)', textAlignX: 'center' }),
    text('rrLine', 'How many were right', 'rrCard', '', { ...T_LEAD, textAlignX: 'center' }),
    // RKT-010: "+18 ⭐" pops in after the card, and one quiet line says where the stars came from. APP_CSS stills it for reduced motion.
    text('rrStars', 'The stars this race earned', 'rrCard', '', { ...T_LEAD, ...DISPLAY, fontSize: 'var(--text-2xl)', textAlignX: 'center', cssClassName: 'rkt-stars' }),
    text('rrWhy', 'Where the stars came from', 'rrCard', '', { ...T_META, textAlignX: 'center' }),
    // RKT-011: a race that crossed a milestone says so, and offers the hangar beside Play again (which keeps the focus).
    text('rrPick', 'A 🎁 pick was earned', 'rrCard', '', { ...T_LEAD, ...DISPLAY, textAlignX: 'center', mounted: false }),
    group('rrRow', 'The ways on', 'rrCard', row({ justifyContent: 'center' }), ['rrAgain', 'rrHangar', 'rrOther']),
    place('rrAgain', BUTTON_NODE, 'Play again', 'rrRow', { ...BTN_PRIMARY, label: 'Play again' }),
    place('rrHangar', BUTTON_NODE, 'To the hangar', 'rrRow', { ...BTN_OUTLINE, label: 'To the hangar', mounted: false }),
    place('rrOther', BUTTON_NODE, 'Change the race', 'rrRow', { ...BTN_OUTLINE, label: 'Change the race' }),
    watch('rrIsWon', 'Won?'),
    // `lost` FIRST: a States node starts in its first state, and a consolation must never open with a cheer.
    withStates('rrTone', 'A cheer or a consolation', ['lost', 'won'], {
      ground: { type: 'color', by: { won: ROLE.picked, lost: 'var(--surface)' } },
      glyph: { type: 'string', by: { won: '🏆', lost: '🚀' } }
    }),
    logic('rrHasLine', EXPRESSION_NODE, 'Anything to count?', { expression: "((line || '') + '').length > 0" }),
    logic('rrHasStars', EXPRESSION_NODE, 'Any stars to say?', { expression: "((s || '') + '').length > 0" }),
    outputs('rrOut', 'Which way on', [['again', 'signal'], ['other', 'signal'], ['hangar', 'signal']])
  ],
  connections: [
    wire('rrIn', 'mounted', 'rrCard', 'mounted'),
    wire('rrIn', 'won', 'rrIsWon', 'condition'),
    wire('rrIsWon', 'ontrue', 'rrTone', 'to-won'),
    wire('rrIsWon', 'onfalse', 'rrTone', 'to-lost'),
    wire('rrTone', 'ground', 'rrCard', 'backgroundColor'),
    wire('rrTone', 'glyph', 'rrGlyph', 'text'),
    wire('rrIn', 'headline', 'rrTitle', 'text'),
    wire('rrIn', 'line', 'rrLine', 'text'),
    wire('rrIn', 'line', 'rrHasLine', 'line'),
    wire('rrHasLine', 'result', 'rrLine', 'mounted'),
    wire('rrIn', 'stars', 'rrStars', 'text'),
    wire('rrIn', 'why', 'rrWhy', 'text'),
    wire('rrIn', 'stars', 'rrHasStars', 's'),
    wire('rrHasStars', 'result', 'rrStars', 'mounted'),
    wire('rrHasStars', 'result', 'rrWhy', 'mounted'),
    wire('rrIn', 'againWord', 'rrAgain', 'label'),
    wire('rrIn', 'otherWord', 'rrOther', 'label'),
    wire('rrAgain', 'didMount', 'rrAgain', 'focus'),
    wire('rrAgain', 'onClick', 'rrOut', 'again'),
    wire('rrOther', 'onClick', 'rrOut', 'other'),
    wire('rrIn', 'hasPick', 'rrPick', 'mounted'),
    wire('rrIn', 'hasPick', 'rrHangar', 'mounted'),
    wire('rrIn', 'pickWord', 'rrPick', 'text'),
    wire('rrIn', 'hangarWord', 'rrHangar', 'label'),
    wire('rrHangar', 'onClick', 'rrOut', 'hangar')
  ]
};

/**
 * RKT-010: a race's id, minted on the one reset that Start, Play again and Restart all pass through. It must differ across
 * reloads, because the model remembers the last race it paid a landing for.
 */
const MINT_RACE_SCRIPT = "Outputs.raceId = 'r' + Date.now().toString(36) + Math.floor(Math.random() * 1000000).toString(36);";

/** The race: two rockets, rounds until one lands. */
const RACE_PLAY: Tpl007Component = {
  path: 'Race/Play',
  description: 'The race itself: rounds until a rocket reaches the planet. One player races the computer (its speed follows the player\'s rating); two players take turns on one keyboard. Publishes Finished with the winner, and the model after every round. RKT-002: a right answer bursts sparks from the rocket it moved; when a rocket lands, Race/Result takes the round\'s place under the track, Cheer or Sigh says which fanfare, and ChangeRace hands back to setup. RKT-004: Show me puts the missed skill\'s Teach card where the round was, and Got it asks the next question. RKT-006: Restart (while racing or teaching) sends both rockets home through the same reset as Start, and Change the race stops the clock and hands back to setup. The rockets\' progress lives in the Variables raceProgressA/B, global by name (D57): harmless with one race per page. RKT-010: every start mints a race id; answers pay stars as they are graded (none on player two\'s turns), and a landing runs Logic/Finish race once, whose model goes out through Model and Graded like a round\'s, and whose take the result screen shows.',
  inputs: [port('start', 'signal'), port('level', 'string'), port('lang', 'string'), port('layout', 'string'), port('mode', 'string'), port('answerMode', 'string'), port('model', 'object'), port('curriculum', 'array'), port('wordLists', 'array'), port('timed', 'boolean'), port('players', 'number'), port('soundOn', 'boolean'), port('nameA', 'string'), port('lookA', 'string'), port('seedA', 'string'), port('nameB', 'string'), port('mounted', 'boolean'), port('placeholder', 'string'), port('checkWord', 'string'), port('fluentWord', 'string'), port('correctWord', 'string'), port('wrongWord', 'string'), port('timeUpWord', 'string'), port('nextWord', 'string'), port('showMeWord', 'string'), port('yourTurnWord', 'string'), port('youWinWord', 'string'), port('computerWinsWord', 'string'), port('winsWord', 'string'), port('againWord', 'string'), port('otherRaceWord', 'string'), port('rightAnswersWord', 'string'), port('teachCards', 'array'), port('anExampleWord', 'string'), port('gotItWord', 'string'), port('restartWord', 'string'), port('optionsA', 'object'), port('paintA', 'string'), port('pickWord', 'string'), port('hangarWord', 'string')],
  outputs: [port('finished', 'signal'), port('winner', 'string'), port('model', 'object'), port('graded', 'signal'), port('rounds', 'number'), port('showMe', 'signal'), port('teach', 'string'), port('cheer', 'signal'), port('sigh', 'signal'), port('changeRace', 'signal'), port('hangar', 'signal'), port('layoutSeen', 'string'), port('layoutSeenNow', 'signal'), port('layoutPick', 'string'), port('layoutPickNow', 'signal')],
  instantiates: [C.raceRound, C.track, C.raceResult, C.teachCard, logicName('Logic/Teach card'), logicName('Logic/Finish race')],
  nodes: [
    inputs('rpIn', 'The race', [['start', 'signal'], ['level', 'string'], ['lang', 'string'], ['layout', 'string'], ['mode', 'string'], ['answerMode', 'string'], ['model', 'object'], ['curriculum', 'array'], ['wordLists', 'array'], ['timed', 'boolean'], ['players', 'number'], ['soundOn', 'boolean'], ['nameA', 'string'], ['lookA', 'string'], ['seedA', 'string'], ['nameB', 'string'], ['mounted', 'boolean'], ['placeholder', 'string'], ['checkWord', 'string'], ['fluentWord', 'string'], ['correctWord', 'string'], ['wrongWord', 'string'], ['timeUpWord', 'string'], ['nextWord', 'string'], ['showMeWord', 'string'], ['yourTurnWord', 'string'], ['youWinWord', 'string'], ['computerWinsWord', 'string'], ['winsWord', 'string'], ['againWord', 'string'], ['otherRaceWord', 'string'], ['rightAnswersWord', 'string'], ['teachCards', 'array'], ['anExampleWord', 'string'], ['gotItWord', 'string'], ['restartWord', 'string'], ['optionsA', 'object'], ['paintA', 'string'], ['pickWord', 'string'], ['hangarWord', 'string']]),
    group('rpWrap', 'The race', undefined, column({ alignItems: 'center', rowGap: 'var(--space-3)' }), ['rpControls', 'rpTrack', 'rpTurn', 'rpRoundSlot', 'rpTeach', 'rpResult']),
    // RKT-006: the way out of a race that is going badly, above the course and away from the answer and Next.
    group('rpControls', 'Restart, or change the race', 'rpWrap', row({ width: pct(100), sizeMode: 'contentHeight', justifyContent: 'flex-end', columnGap: 'var(--space-2)' }), ['rpRestart', 'rpSettings']),
    place('rpRestart', BUTTON_NODE, 'Restart', 'rpControls', { ...BTN_OUTLINE, label: 'Restart', fontSize: 'var(--text-sm)' }),
    place('rpSettings', BUTTON_NODE, 'Change the race', 'rpControls', { ...BTN_OUTLINE, label: 'Change the race', fontSize: 'var(--text-sm)' }),
    place('rpTrack', C.track, 'The course', 'rpWrap'),
    text('rpTurn', 'Whose turn', 'rpWrap', '', { ...T_LEAD, color: ROLE.ink, textAlignX: 'center' }),
    // RKT-002 AC4: the round and the result take turns in one slot of the stage, and the track stays for both.
    group('rpRoundSlot', 'While racing', 'rpWrap', column({ alignItems: 'center' }), ['rpRound']),
    place('rpRound', C.raceRound, 'This question', 'rpRoundSlot'),
    // RKT-004: Show me's card takes the round's slot too, and the track stays.
    place('rpTeach', C.teachCard, 'Show me how', 'rpWrap'),
    place('rpResult', C.raceResult, 'How it ended', 'rpWrap'),
    logic('rpA', VARIABLE_NODE, 'Rocket A', { name: 'raceProgressA' }),
    logic('rpB', VARIABLE_NODE, 'Rocket B', { name: 'raceProgressB' }),
    logic('rpSetA', SET_VARIABLE_NODE, 'Move rocket A', { name: 'raceProgressA' }),
    logic('rpSetB', SET_VARIABLE_NODE, 'Move rocket B', { name: 'raceProgressB' }),
    logic('rpResetA', SET_VARIABLE_NODE, 'A to the start', { name: 'raceProgressA' }),
    logic('rpResetB', SET_VARIABLE_NODE, 'B to the start', { name: 'raceProgressB' }),
    logic('rpZero', EXPRESSION_NODE, 'Zero', { expression: '0' }),
    logic('rpRounds', COUNTER_NODE, 'Rounds played', { startValue: 0 }),
    logic('rpTurnIsB', EXPRESSION_NODE, 'Is it B\'s turn? (two players, odd rounds)', { expression: 'players === 2 && rounds % 2 === 1' }),
    logic('rpTurnText', EXPRESSION_NODE, 'Whose turn, in words', { expression: "players === 2 ? (isB ? nameB : nameA) + ' — ' + word : ''" }),
    logic('rpNextA', EXPRESSION_NODE, 'Where A would be', { expression: 'min(1, a + gain)' }),
    logic('rpNextB', EXPRESSION_NODE, 'Where B would be', { expression: 'min(1, b + (players === 2 ? gain : cpu))' }),
    // Who moves this round: A (solo, or A's turn), and B (the computer, or B's turn).
    logic('rpAMoves', EXPRESSION_NODE, 'Does A move?', { expression: '!isB' }),
    logic('rpBMoves', EXPRESSION_NODE, 'Does B move?', { expression: 'players === 1 || isB' }),
    gate('rpGateA', 'Move A?'),
    gate('rpGateB', 'Move B?'),
    logic('rpOver', EXPRESSION_NODE, 'Is it over?', { expression: 'a >= 1 || b >= 1' }),
    gate('rpGoOn', 'Another round?'),
    logic('rpWinner', VARIABLE_NODE, 'Who won', { name: 'raceWinner' }),
    logic('rpSetWinA', SET_VARIABLE_NODE, 'A won', { name: 'raceWinner' }),
    logic('rpSetWinB', SET_VARIABLE_NODE, 'B won', { name: 'raceWinner' }),
    logic('rpNameAExpr', EXPRESSION_NODE, "'A'", { expression: "'A'" }),
    logic('rpNameBExpr', EXPRESSION_NODE, "'B'", { expression: "'B'" }),
    logic('rpIsTwo', EXPRESSION_NODE, 'Two players?', { expression: 'players === 2' }),
    logic('rpShown', EXPRESSION_NODE, 'Only while racing', { expression: 'm === true' }),
    // RKT-005: a typing race shows the keyboard under every question, so its course is compact for the whole race (not per round, or it jumps at every verdict).
    logic('rpTyping', EXPRESSION_NODE, 'A typing race? Then the keyboard takes the course’s room', { expression: "mode === 'typing'" }),
    // RKT-002 AC4 — the reward moments.
    withStates('rpPhase', 'Racing, the result, or a Teach card', ['racing', 'over', 'teaching'], {
      racing: { type: 'boolean', by: { racing: true, over: false, teaching: false } },
      over: { type: 'boolean', by: { racing: false, over: true, teaching: false } },
      teaching: { type: 'boolean', by: { racing: false, over: false, teaching: true } },
      // RKT-006: the result screen has its own two ways on, so the race's controls step aside.
      controls: { type: 'boolean', by: { racing: true, over: false, teaching: true } }
    }),
    // RKT-004 — the card for the skill just missed. Each miss in a row says less: step 1, then 2, then 3 (the grader resets the count on a right answer).
    logic('rpTeachPick', logicName('Logic/Teach card'), 'The card for the skill just missed'),
    logic('rpStep', EXPRESSION_NODE, 'Which step: less each miss in a row', { expression: 'min(2, max(0, misses - 1))' }),
    logic('rpBoostsA', COUNTER_NODE, 'Right answers that moved A', { startValue: 0 }),
    gate('rpBoostA', 'Was A right?'),
    logic('rpBRight', EXPRESSION_NODE, 'Was player two right?', { expression: 'players === 2 && correct === true' }),
    gate('rpBoostB', 'Burst B?'),
    gate('rpBLanded', 'B landed: a friend, or the computer?'),
    logic('rpWon', EXPRESSION_NODE, 'Something to cheer?', { expression: "players === 2 || winner === 'A'" }),
    logic('rpResultText', EXPRESSION_NODE, 'The result, in words', { expression: "players === 2 ? (winner === 'A' ? nameA : nameB) + ' ' + winsWord : winner === 'A' ? youWin : computerWins" }),
    logic('rpResultLine', EXPRESSION_NODE, 'How many were right', { expression: "players === 2 ? '' : right + ' / ' + rounds + ' ' + word" }),
    // RKT-010 — the stars.
    logic('rpMint', FUNCTION_NODE, 'A new race id', { functionScript: MINT_RACE_SCRIPT }),
    logic('rpFinish', logicName('Logic/Finish race'), 'Pay the landing, and a new best'),
    outputs('rpOut', 'How it went', [['finished', 'signal'], ['winner', 'string'], ['model', 'object'], ['graded', 'signal'], ['rounds', 'number'], ['showMe', 'signal'], ['teach', 'string'], ['cheer', 'signal'], ['sigh', 'signal'], ['changeRace', 'signal'], ['hangar', 'signal'], ['layoutSeen', 'string'], ['layoutSeenNow', 'signal'], ['layoutPick', 'string'], ['layoutPickNow', 'signal']])
  ],
  connections: [
    wire('rpIn', 'mounted', 'rpShown', 'm'),
    wire('rpShown', 'result', 'rpWrap', 'mounted'),
    // Start: both rockets to the start, the round count to zero, then ask.
    wire('rpZero', 'result', 'rpResetA', 'value'),
    wire('rpIn', 'start', 'rpResetA', 'do'),
    wire('rpZero', 'result', 'rpResetB', 'value'),
    wire('rpResetA', 'done', 'rpResetB', 'do'),
    wire('rpResetB', 'done', 'rpRounds', 'reset'),
    wire('rpResetB', 'done', 'rpRound', 'ask'),
    // The round gets the profile.
    wire('rpIn', 'level', 'rpRound', 'level'),
    wire('rpIn', 'lang', 'rpRound', 'lang'),
    wire('rpIn', 'layout', 'rpRound', 'layout'),
    wire('rpIn', 'mode', 'rpRound', 'mode'),
    wire('rpIn', 'answerMode', 'rpRound', 'answerMode'),
    wire('rpIn', 'model', 'rpRound', 'model'),
    wire('rpIn', 'curriculum', 'rpRound', 'curriculum'),
    wire('rpIn', 'wordLists', 'rpRound', 'wordLists'),
    wire('rpIn', 'timed', 'rpRound', 'timed'),
    wire('rpIn', 'soundOn', 'rpRound', 'soundOn'),
    wire('rpIn', 'placeholder', 'rpRound', 'placeholder'),
    wire('rpIn', 'checkWord', 'rpRound', 'checkWord'),
    wire('rpIn', 'fluentWord', 'rpRound', 'fluentWord'),
    wire('rpIn', 'correctWord', 'rpRound', 'correctWord'),
    wire('rpIn', 'wrongWord', 'rpRound', 'wrongWord'),
    wire('rpIn', 'timeUpWord', 'rpRound', 'timeUpWord'),
    wire('rpIn', 'nextWord', 'rpRound', 'nextWord'),
    wire('rpIn', 'showMeWord', 'rpRound', 'showMeWord'),
    // The track.
    wire('rpA', 'value', 'rpTrack', 'progressA'),
    wire('rpB', 'value', 'rpTrack', 'progressB'),
    wire('rpIn', 'nameA', 'rpTrack', 'nameA'),
    wire('rpIn', 'nameB', 'rpTrack', 'nameB'),
    wire('rpIn', 'lookA', 'rpTrack', 'lookA'),
    wire('rpIn', 'seedA', 'rpTrack', 'seedA'),
    // RKT-011: rocket A wears what the child chose in the hangar.
    wire('rpIn', 'optionsA', 'rpTrack', 'optionsA'),
    wire('rpIn', 'paintA', 'rpTrack', 'paintA'),
    wire('rpIn', 'mode', 'rpTyping', 'mode'),
    wire('rpTyping', 'result', 'rpTrack', 'compact'),
    // Whose turn.
    wire('rpIn', 'players', 'rpTurnIsB', 'players'),
    wire('rpRounds', 'currentCount', 'rpTurnIsB', 'rounds'),
    wire('rpIn', 'players', 'rpTurnText', 'players'),
    wire('rpTurnIsB', 'result', 'rpTurnText', 'isB'),
    wire('rpIn', 'nameA', 'rpTurnText', 'nameA'),
    wire('rpIn', 'nameB', 'rpTurnText', 'nameB'),
    wire('rpIn', 'yourTurnWord', 'rpTurnText', 'word'),
    wire('rpTurnText', 'result', 'rpTurn', 'text'),
    wire('rpIsTwo', 'result', 'rpTurn', 'mounted'),
    wire('rpIn', 'players', 'rpIsTwo', 'players'),
    // A round is graded: move the rockets, in order, then count it.
    wire('rpA', 'value', 'rpNextA', 'a'),
    wire('rpRound', 'gain', 'rpNextA', 'gain'),
    wire('rpB', 'value', 'rpNextB', 'b'),
    wire('rpRound', 'gain', 'rpNextB', 'gain'),
    wire('rpRound', 'cpuGain', 'rpNextB', 'cpu'),
    wire('rpIn', 'players', 'rpNextB', 'players'),
    wire('rpTurnIsB', 'result', 'rpAMoves', 'isB'),
    wire('rpTurnIsB', 'result', 'rpBMoves', 'isB'),
    wire('rpIn', 'players', 'rpBMoves', 'players'),
    wire('rpAMoves', 'result', 'rpGateA', 'condition'),
    wire('rpRound', 'graded', 'rpGateA', 'eval'),
    wire('rpNextA', 'result', 'rpSetA', 'value'),
    wire('rpGateA', 'ontrue', 'rpSetA', 'do'),
    wire('rpBMoves', 'result', 'rpGateB', 'condition'),
    wire('rpRound', 'graded', 'rpGateB', 'eval'),
    wire('rpNextB', 'result', 'rpSetB', 'value'),
    wire('rpGateB', 'ontrue', 'rpSetB', 'do'),
    wire('rpRound', 'graded', 'rpRounds', 'increase'),
    // Next: another round unless someone has landed.
    wire('rpA', 'value', 'rpOver', 'a'),
    wire('rpB', 'value', 'rpOver', 'b'),
    wire('rpOver', 'result', 'rpGoOn', 'condition'),
    wire('rpRound', 'next', 'rpGoOn', 'eval'),
    wire('rpGoOn', 'onfalse', 'rpRound', 'ask'),
    // A landing: name the winner, then say it is over.
    wire('rpNameAExpr', 'result', 'rpSetWinA', 'value'),
    wire('rpTrack', 'reachedA', 'rpSetWinA', 'do'),
    wire('rpNameBExpr', 'result', 'rpSetWinB', 'value'),
    wire('rpTrack', 'reachedB', 'rpSetWinB', 'do'),
    wire('rpSetWinA', 'done', 'rpOut', 'finished'),
    wire('rpSetWinB', 'done', 'rpOut', 'finished'),
    wire('rpWinner', 'value', 'rpOut', 'winner'),
    // RKT-002 AC4: a right answer bursts sparks from the rocket it moved — a signal into the kit's Boost (P88 GAM-017). A's
    // count stays, because the result line reads how many right answers moved A.
    wire('rpRound', 'correct', 'rpBoostA', 'condition'),
    wire('rpGateA', 'ontrue', 'rpBoostA', 'eval'),
    wire('rpBoostA', 'ontrue', 'rpBoostsA', 'increase'),
    wire('rpBoostA', 'ontrue', 'rpTrack', 'burstA'),
    wire('rpIn', 'players', 'rpBRight', 'players'),
    wire('rpRound', 'correct', 'rpBRight', 'correct'),
    wire('rpBRight', 'result', 'rpBoostB', 'condition'),
    wire('rpGateB', 'ontrue', 'rpBoostB', 'eval'),
    wire('rpBoostB', 'ontrue', 'rpTrack', 'burstB'),
    wire('rpResetB', 'done', 'rpBoostsA', 'reset'),
    // When a rocket lands, the result takes the round's slot. Play again puts the round back and starts over.
    wire('rpIn', 'start', 'rpPhase', 'to-racing'),
    wire('rpSetWinA', 'done', 'rpPhase', 'to-over'),
    wire('rpSetWinB', 'done', 'rpPhase', 'to-over'),
    wire('rpPhase', 'racing', 'rpRoundSlot', 'mounted'),
    wire('rpPhase', 'over', 'rpResult', 'mounted'),
    wire('rpResult', 'again', 'rpPhase', 'to-racing'),
    wire('rpResult', 'again', 'rpResetA', 'do'),
    wire('rpResult', 'other', 'rpOut', 'changeRace'),
    // RKT-004: Show me puts the card in the round's place. The round keeps its state and the clock stays stopped, because only a
    // new question starts it. Got it goes back to racing and asks through the same gate as Next, so a landed race still ends.
    wire('rpRound', 'showMe', 'rpPhase', 'to-teaching'),
    wire('rpPhase', 'teaching', 'rpTeach', 'mounted'),
    wire('rpTeach', 'gotIt', 'rpPhase', 'to-racing'),
    wire('rpTeach', 'gotIt', 'rpGoOn', 'eval'),
    // RKT-006: Restart is Play again from inside the race: the same reset (rockets, rounds, bursts) and a new question, which
    // closes the banner and restarts the clock. Change the race stops the clock first, because no new question will.
    wire('rpPhase', 'controls', 'rpControls', 'mounted'),
    wire('rpIn', 'restartWord', 'rpRestart', 'label'),
    wire('rpIn', 'otherRaceWord', 'rpSettings', 'label'),
    wire('rpRestart', 'onClick', 'rpPhase', 'to-racing'),
    wire('rpRestart', 'onClick', 'rpResetA', 'do'),
    wire('rpSettings', 'onClick', 'rpRound', 'abandon'),
    wire('rpSettings', 'onClick', 'rpOut', 'changeRace'),
    wire('rpIn', 'teachCards', 'rpTeachPick', 'cards'),
    wire('rpIn', 'lang', 'rpTeachPick', 'lang'),
    wire('rpRound', 'teach', 'rpTeachPick', 'teachId'),
    wire('rpRound', 'missCount', 'rpStep', 'misses'),
    wire('rpStep', 'result', 'rpTeachPick', 'step'),
    wire('rpTeachPick', 'title', 'rpTeach', 'title'),
    wire('rpTeachPick', 'text', 'rpTeach', 'text'),
    wire('rpTeachPick', 'example', 'rpTeach', 'example'),
    wire('rpRound', 'prompt', 'rpTeach', 'prompt'),
    wire('rpRound', 'worked', 'rpTeach', 'worked'),
    wire('rpIn', 'anExampleWord', 'rpTeach', 'anExampleWord'),
    wire('rpIn', 'gotItWord', 'rpTeach', 'gotItWord'),
    wire('rpIn', 'players', 'rpWon', 'players'),
    wire('rpWinner', 'value', 'rpWon', 'winner'),
    wire('rpWon', 'result', 'rpResult', 'won'),
    wire('rpIn', 'players', 'rpResultText', 'players'),
    wire('rpWinner', 'value', 'rpResultText', 'winner'),
    wire('rpIn', 'nameA', 'rpResultText', 'nameA'),
    wire('rpIn', 'nameB', 'rpResultText', 'nameB'),
    wire('rpIn', 'winsWord', 'rpResultText', 'winsWord'),
    wire('rpIn', 'youWinWord', 'rpResultText', 'youWin'),
    wire('rpIn', 'computerWinsWord', 'rpResultText', 'computerWins'),
    wire('rpResultText', 'result', 'rpResult', 'headline'),
    wire('rpIn', 'players', 'rpResultLine', 'players'),
    wire('rpBoostsA', 'currentCount', 'rpResultLine', 'right'),
    wire('rpRounds', 'currentCount', 'rpResultLine', 'rounds'),
    wire('rpIn', 'rightAnswersWord', 'rpResultLine', 'word'),
    wire('rpResultLine', 'result', 'rpResult', 'line'),
    wire('rpIn', 'againWord', 'rpResult', 'againWord'),
    wire('rpIn', 'otherRaceWord', 'rpResult', 'otherWord'),
    // The fanfare: A landing is a cheer. B landing is a cheer for a friend, and a sigh when B is the computer.
    wire('rpSetWinA', 'done', 'rpOut', 'cheer'),
    wire('rpIsTwo', 'result', 'rpBLanded', 'condition'),
    wire('rpSetWinB', 'done', 'rpBLanded', 'eval'),
    wire('rpBLanded', 'ontrue', 'rpOut', 'cheer'),
    wire('rpBLanded', 'onfalse', 'rpOut', 'sigh'),
    // Out.
    wire('rpRound', 'model', 'rpOut', 'model'),
    wire('rpRound', 'graded', 'rpOut', 'graded'),
    // RKT-008 AC7: the keyboard, up to the page.
    wire('rpRound', 'layoutSeen', 'rpOut', 'layoutSeen'),
    wire('rpRound', 'layoutSeenNow', 'rpOut', 'layoutSeenNow'),
    wire('rpRound', 'layoutPick', 'rpOut', 'layoutPick'),
    wire('rpRound', 'layoutPickNow', 'rpOut', 'layoutPickNow'),
    wire('rpRounds', 'currentCount', 'rpOut', 'rounds'),
    wire('rpRound', 'showMe', 'rpOut', 'showMe'),
    wire('rpRound', 'teach', 'rpOut', 'teach'),
    // RKT-010: Start, Play again and Restart all enter rpResetA, so each gets a new id there, before the first question is asked.
    // Change the race does not enter it, and starts no race. A restarted race never lands, so it never pays a landing.
    wire('rpResetA', 'done', 'rpMint', 'run'),
    wire('rpMint', 'out-raceId', 'rpRound', 'raceId'),
    wire('rpMint', 'out-raceId', 'rpFinish', 'raceId'),
    wire('rpTurnIsB', 'result', 'rpRound', 'forB'),
    // The round's model is the store's plus the answer that landed the rocket. Both rockets landing in one round finish twice
    // from that same model, so the second save replaces the first with the same stars.
    wire('rpRound', 'model', 'rpFinish', 'model'),
    wire('rpIn', 'timed', 'rpFinish', 'timed'),
    wire('rpIn', 'lang', 'rpFinish', 'lang'),
    wire('rpSetWinA', 'done', 'rpFinish', 'run'),
    wire('rpSetWinB', 'done', 'rpFinish', 'run'),
    wire('rpFinish', 'model', 'rpOut', 'model'),
    wire('rpFinish', 'done', 'rpOut', 'graded'),
    wire('rpFinish', 'starsText', 'rpResult', 'stars'),
    wire('rpFinish', 'why', 'rpResult', 'why'),
    // RKT-011: a landing whose take crossed a milestone offers the pick, and the hangar is one tap from the result.
    wire('rpFinish', 'earnedPick', 'rpResult', 'hasPick'),
    wire('rpIn', 'pickWord', 'rpResult', 'pickWord'),
    wire('rpIn', 'hangarWord', 'rpResult', 'hangarWord'),
    wire('rpResult', 'hangar', 'rpOut', 'hangar')
  ]
};

// ── The hangar's parts (P87 RKT-011) ────────────────────────────────────────

/** Home's line to the next 🎁 pick, under the stars. */
const NEXT_PICK: Tpl007Component = {
  path: 'Game/Next pick',
  description: 'The way to the next 🎁 pick: one line ("Next 🎁 in 12 ⭐", or the picks waiting) over a bar filled Percent of the way from the last milestone. Has picks turns the bar tomato. Publishes Open when tapped.',
  inputs: [port('text', 'string'), port('percent', 'number'), port('hasPicks', 'boolean')],
  outputs: [port('open', 'signal')],
  nodes: [
    inputs('npIn', 'How far to the next pick', [['text', 'string'], ['percent', 'number'], ['hasPicks', 'boolean']]),
    group('npCard', 'The line and the bar', undefined, { ...CARD, rowGap: 'var(--space-2)', paddingTop: 'var(--space-3)', paddingBottom: 'var(--space-3)', paddingLeft: 'var(--space-4)', paddingRight: 'var(--space-4)', cssClassName: 'pressable' }, ['npText', 'npBar']),
    text('npText', 'The next pick, in words', 'npCard', '', { ...T_BODY, fontWeight: 'var(--font-bold)' }),
    group('npBar', 'The bar', 'npCard', { width: pct(100), height: px(14), sizeMode: 'explicit', backgroundColor: 'var(--surface-raised)', borderRadius: 'var(--radius-full)', borderStyle: 'solid', borderWidth: 'var(--border-1)', borderColor: 'var(--border)', clip: true }, ['npFill']),
    // A number reaching a units port keeps the port's unit, so the width stays a percentage.
    group('npFill', 'How far', 'npBar', { width: pct(0), height: pct(100), sizeMode: 'explicit', backgroundColor: ROLE.picked }),
    watch('npReady', 'A pick waiting?'),
    withStates('npTone', 'Saving up, or a pick waiting', ['saving', 'ready'], { fill: { type: 'color', by: { saving: ROLE.picked, ready: ROLE.you } } }),
    outputs('npOut', 'Tapped', [['open', 'signal']])
  ],
  connections: [
    wire('npIn', 'text', 'npText', 'text'),
    wire('npIn', 'percent', 'npFill', 'width'),
    wire('npIn', 'hasPicks', 'npReady', 'condition'),
    wire('npReady', 'ontrue', 'npTone', 'to-ready'),
    wire('npReady', 'onfalse', 'npTone', 'to-saving'),
    wire('npTone', 'fill', 'npFill', 'backgroundColor'),
    wire('npCard', 'onClick', 'npOut', 'open')
  ]
};

/** One item on the hangar shelf. Row fields from Logic/Hangar shelf. */
const HANGAR_TILE: Tpl007Component = {
  path: 'Hangar/Tile',
  description: 'One shelf item: the child’s own face wearing it (or the paint as a swatch), its name, and what a tap does. Worn fills it sunshine; Dim greys an item that does not fit today’s face or is still locked, and its note says why. Publishes Pick (a pick to spend on it) or Wear (theirs to put on or take off), with the item id.',
  inputs: [port('id', 'string'), port('label', 'string'), port('note', 'string'), port('isFace', 'boolean'), port('look', 'string'), port('seed', 'string'), port('options', 'object'), port('paint', 'string'), port('worn', 'boolean'), port('canWear', 'boolean'), port('canPick', 'boolean'), port('dim', 'boolean')],
  outputs: [port('pick', 'signal'), port('wear', 'signal'), port('id', 'string')],
  instantiates: [C.face],
  nodes: [
    inputs('htIn', 'The item', [['id', 'string'], ['label', 'string'], ['note', 'string'], ['isFace', 'boolean'], ['look', 'string'], ['seed', 'string'], ['options', 'object'], ['paint', 'string'], ['worn', 'boolean'], ['canWear', 'boolean'], ['canPick', 'boolean'], ['dim', 'boolean']]),
    group('htCard', 'The tile', undefined, { ...CARD, width: px(132), sizeMode: 'contentHeight', alignItems: 'center', rowGap: 'var(--space-2)', paddingTop: 'var(--space-3)', paddingBottom: 'var(--space-3)', paddingLeft: 'var(--space-2)', paddingRight: 'var(--space-2)', borderWidth: px(3), cssClassName: 'pressable rkt-tile' }, ['htFaceBox', 'htSwatch', 'htLabel', 'htNote']),
    // A placed component has no Mounted of its own, so the face sits in a Group that has one.
    group('htFaceBox', 'The face, wearing it', 'htCard', { sizeMode: 'contentSize' }, ['htFace']),
    place('htFace', C.face, 'The face', 'htFaceBox', { size: 64 }),
    group('htSwatch', 'The paint', 'htCard', { width: px(64), height: px(64), sizeMode: 'explicit', backgroundColor: ROLE.you, borderRadius: 'var(--radius-full)', borderStyle: 'solid', borderWidth: 'var(--border-1)', borderColor: 'var(--foreground)', mounted: false }),
    text('htLabel', 'Its name', 'htCard', '', { ...T_BODY, fontWeight: 'var(--font-bold)', textAlignX: 'center' }),
    text('htNote', 'What a tap does', 'htCard', '', { ...T_META, textAlignX: 'center' }),
    logic('htKindOf', EXPRESSION_NODE, 'A face or a paint?', { expression: "isFace === false ? 'paint' : 'face'" }),
    withStates('htKind', 'A face or a paint', ['face', 'paint'], { face: { type: 'boolean', by: { face: true, paint: false } }, swatch: { type: 'boolean', by: { face: false, paint: true } } }),
    logic('htToneOf', EXPRESSION_NODE, 'Worn, plain or greyed?', { expression: "worn === true ? 'worn' : dim === true ? 'dim' : 'plain'" }),
    withStates('htTone', 'Worn, plain or greyed', ['plain', 'worn', 'dim'], {
      ground: { type: 'color', by: { plain: 'var(--surface)', worn: ROLE.picked, dim: 'var(--muted)' } },
      opacity: { type: 'number', by: { plain: 1, worn: 1, dim: 0.8 } }
    }),
    gate('htCanPick', 'A pick to spend on it?'),
    gate('htCanWear', 'Theirs to put on or take off?'),
    outputs('htOut', 'Tapped', [['pick', 'signal'], ['wear', 'signal'], ['id', 'string']])
  ],
  connections: [
    wire('htIn', 'look', 'htFace', 'look'),
    wire('htIn', 'seed', 'htFace', 'seed'),
    wire('htIn', 'options', 'htFace', 'options'),
    wire('htIn', 'paint', 'htSwatch', 'backgroundColor'),
    wire('htIn', 'label', 'htLabel', 'text'),
    wire('htIn', 'note', 'htNote', 'text'),
    wire('htIn', 'isFace', 'htKindOf', 'isFace'),
    wire('htKindOf', 'result', 'htKind', 'currentState'),
    wire('htKind', 'face', 'htFaceBox', 'mounted'),
    wire('htKind', 'swatch', 'htSwatch', 'mounted'),
    wire('htIn', 'worn', 'htToneOf', 'worn'),
    wire('htIn', 'dim', 'htToneOf', 'dim'),
    wire('htToneOf', 'result', 'htTone', 'currentState'),
    wire('htTone', 'ground', 'htCard', 'backgroundColor'),
    wire('htTone', 'opacity', 'htCard', 'opacity'),
    // 🔴 Only the card answers a tap. The face publishes Clicked too, and a Wear sent twice puts an item on and takes it straight off.
    wire('htIn', 'canPick', 'htCanPick', 'condition'),
    wire('htIn', 'canWear', 'htCanWear', 'condition'),
    wire('htCard', 'onClick', 'htCanPick', 'eval'),
    wire('htCard', 'onClick', 'htCanWear', 'eval'),
    wire('htCanPick', 'ontrue', 'htOut', 'pick'),
    wire('htCanWear', 'ontrue', 'htOut', 'wear'),
    wire('htIn', 'id', 'htOut', 'id')
  ]
};

/** The top of the hangar: the face and the rocket as they will race. */
const HANGAR_PREVIEW: Tpl007Component = {
  path: 'Hangar/Preview',
  description: 'The child’s face and rocket as they will race, wearing what is on, and one line about picks. Changed (a signal) pops the pair, and reduced motion stills it. Publishes Clicked.',
  inputs: [port('name', 'string'), port('look', 'string'), port('seed', 'string'), port('options', 'object'), port('paint', 'string'), port('line', 'string'), port('changed', 'signal')],
  outputs: [port('clicked', 'signal')],
  instantiates: [C.face],
  nodes: [
    inputs('pvIn', 'Who, wearing what', [['name', 'string'], ['look', 'string'], ['seed', 'string'], ['options', 'object'], ['paint', 'string'], ['line', 'string'], ['changed', 'signal']]),
    group('pvCard', 'The preview', undefined, { ...CARD, alignItems: 'center', rowGap: 'var(--space-3)', paddingTop: 'var(--space-4)', paddingBottom: 'var(--space-4)', paddingLeft: 'var(--space-4)', paddingRight: 'var(--space-4)' }, ['pvPop', 'pvLine']),
    // 🔴 One line at every width. Wrapped, the face took a line of its own on a phone and pushed the first row of tiles to 882 on an
    // 844-tall screen (build 3, FR 390×844). A content-sized face never shrinks, and the course's 100% width is what gives way.
    // Spelled out, not `row()`: a row that never wraps never reads `rowGap`, and the door warns about the one `row()` carries
    // (inactive-conditional-parameter, build 4).
    group('pvPop', 'What pops', 'pvCard', { width: pct(100), sizeMode: 'contentHeight', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', columnGap: 'var(--space-4)', flexWrap: 'nowrap', cssClassName: 'rkt-preview' }, ['pvFace', 'pvTrackBox']),
    place('pvFace', C.face, 'The face', 'pvPop', { size: 96 }),
    // A kit React node takes no size of its own: the Group gives the course its box.
    group('pvTrackBox', 'The rocket', 'pvPop', { width: pct(100), maxWidth: px(420), height: px(120), sizeMode: 'explicit' }, ['pvTrack']),
    place('pvTrack', KIT_TRACK, 'The rocket on a short course', 'pvTrackBox', { progressA: 0.5, showB: false, celebrate: false, aspect: 'auto', rocketSize: 44, colorA: ROLE.you }),
    text('pvLine', 'Picks, in words', 'pvCard', '', { ...T_BODY, fontWeight: 'var(--font-bold)', textAlignX: 'center' }),
    logic('pvChanges', COUNTER_NODE, 'Changes so far', { startValue: 0 }),
    logic('pvWhich', EXPRESSION_NODE, 'Which pop', { expression: "n > 0 ? (n % 2 === 1 ? 'a' : 'b') : 'still'" }),
    withStates('pvPopState', 'Still, or popping', ['still', 'a', 'b'], { cls: { type: 'string', by: { still: 'rkt-preview', a: 'rkt-preview rkt-wear-a', b: 'rkt-preview rkt-wear-b' } } }),
    outputs('pvOut', 'Tapped', [['clicked', 'signal']])
  ],
  connections: [
    wire('pvIn', 'look', 'pvFace', 'look'),
    wire('pvIn', 'seed', 'pvFace', 'seed'),
    wire('pvIn', 'options', 'pvFace', 'options'),
    wire('pvIn', 'look', 'pvTrack', 'styleA'),
    wire('pvIn', 'seed', 'pvTrack', 'seedA'),
    wire('pvIn', 'options', 'pvTrack', 'optionsA'),
    wire('pvIn', 'paint', 'pvTrack', 'colorA'),
    wire('pvIn', 'name', 'pvTrack', 'nameA'),
    wire('pvIn', 'line', 'pvLine', 'text'),
    wire('pvIn', 'changed', 'pvChanges', 'increase'),
    wire('pvChanges', 'currentCount', 'pvWhich', 'n'),
    wire('pvWhich', 'result', 'pvPopState', 'currentState'),
    wire('pvPopState', 'cls', 'pvPop', 'cssClassName'),
    wire('pvFace', 'clicked', 'pvOut', 'clicked')
  ]
};

/** The shelf: two tabs and a tile per item. */
const HANGAR_SHELF_PART: Tpl007Component = {
  path: 'Hangar/Shelf',
  description: 'Tabs for Face and Rocket, and a tile for every item on the chosen tab, as Logic/Hangar shelf says the active player sees it. Publishes Pick or Wear with the item id, and whether a pick is waiting.',
  inputs: [port('app', 'object'), port('shelf', 'array'), port('faceWord', 'string'), port('rocketWord', 'string')],
  outputs: [port('pick', 'signal'), port('wear', 'signal'), port('itemId', 'string'), port('hasPicks', 'boolean')],
  repeats: { source: 'array', rowFields: ['id', 'label', 'note', 'isFace', 'look', 'seed', 'options', 'paint', 'worn', 'canWear', 'canPick', 'dim'] },
  instantiates: [C.choiceRow, C.hangarTile, logicName('Logic/Hangar shelf')],
  nodes: [
    inputs('hsIn', 'The store and the shelf', [['app', 'object'], ['shelf', 'array'], ['faceWord', 'string'], ['rocketWord', 'string']]),
    group('hsWrap', 'The shelf', undefined, column({ alignItems: 'center', rowGap: 'var(--space-4)' }), ['hsTabs', 'hsGrid']),
    place('hsTabs', C.choiceRow, 'Face or rocket', 'hsWrap'),
    group('hsGrid', 'The items', 'hsWrap', row({ width: pct(100), sizeMode: 'contentHeight', justifyContent: 'center', alignItems: 'stretch' }), ['hsEach']),
    logic('hsEach', FOR_EACH_NODE, 'One tile per item', { template: C.hangarTile, templateType: 'explicit' }),
    logic('hsList', logicName('Logic/Hangar shelf'), 'This tab, as the player sees it'),
    logic('hsTabItems', FUNCTION_NODE, 'The two tabs, in words', { functionScript: "Outputs.items = [{ label: Inputs.face, value: 'face' }, { label: Inputs.rocket, value: 'rocket' }];" }),
    // A Variable is global by name; there is one shelf per page.
    logic('hsTab', VARIABLE_NODE, 'The tab', { name: 'hangarTab' }),
    logic('hsSetTab', SET_VARIABLE_NODE, 'Choose a tab', { name: 'hangarTab' }),
    logic('hsFirstTab', EXPRESSION_NODE, 'face', { expression: "'face'" }),
    logic('hsInitTab', SET_VARIABLE_NODE, 'Open on the face tab', { name: 'hangarTab' }),
    outputs('hsOut', 'What was tapped', [['pick', 'signal'], ['wear', 'signal'], ['itemId', 'string'], ['hasPicks', 'boolean']])
  ],
  connections: [
    wire('hsFirstTab', 'result', 'hsInitTab', 'value'),
    wire('hsWrap', 'didMount', 'hsInitTab', 'do'),
    wire('hsIn', 'faceWord', 'hsTabItems', 'in-face'),
    wire('hsIn', 'rocketWord', 'hsTabItems', 'in-rocket'),
    wire('hsTabItems', 'out-items', 'hsTabs', 'items'),
    wire('hsTab', 'value', 'hsTabs', 'value'),
    wire('hsTabs', 'value', 'hsSetTab', 'value'),
    wire('hsTabs', 'changed', 'hsSetTab', 'do'),
    wire('hsIn', 'app', 'hsList', 'app'),
    wire('hsIn', 'shelf', 'hsList', 'shelf'),
    wire('hsTab', 'value', 'hsList', 'tab'),
    wire('hsList', 'rows', 'hsEach', 'items'),
    wire('hsList', 'hasPicks', 'hsOut', 'hasPicks'),
    // The repeater publishes the row's value before its signal (measured, TPL-006).
    wire('hsEach', 'itemOutput-id', 'hsOut', 'itemId'),
    wire('hsEach', 'itemOutputSignal-pick', 'hsOut', 'pick'),
    wire('hsEach', 'itemOutputSignal-wear', 'hsOut', 'wear')
  ]
};

// ── App and the pages ───────────────────────────────────────────────────────

/**
 * TPL-007 §16, ruling 5 — the three monsters, in the order they come: a shape and a colour each, 13 × 13 pixels. Each is drawn by ONE
 * box-shadow on a 5 px square (`::before` on Game/Monster's box), so a monster is a stylesheet rule, not an image, and every colour is a
 * token. K is ink, W the card, Y sunshine, B the body.
 */
export const MONSTER_PIXELS: Readonly<Record<(typeof MONSTER_LOOKS)[number], { body: string; rows: string[] }>> = {
  horns: {
    body: 'var(--destructive)',
    rows: ['.K.........K.', 'KBK.......KBK', 'KBBK.....KBBK', '.KBBKKKKKBBK.', '.KBBBBBBBBBK.', 'KBBWWBBBWWBBK', 'KBBKWBBBKWBBK', 'KBBBBBBBBBBBK', 'KBBKKKKKKKBBK', 'KBBKWKWKWKBBK', '.KBBBBBBBBBK.', '..KBK...KBK..', '..KKK...KKK..']
  },
  eye: {
    body: 'var(--rocket-paint-purple)',
    rows: ['......K......', '.....KYK.....', '......K......', '...KKKKKKK...', '..KBBBBBBBK..', '.KBBKKKKKBBK.', '.KBKWWWWWKBK.', 'KBBKWKKWWKBBK', 'KBBKWKKWWKBBK', 'KBBBKKKKKBBBK', 'KBBBBBBBBBBBK', '.KBBKBBBKBBK.', '.KKK.KKK.KKK.']
  },
  spikes: {
    body: 'var(--rocket-paint-orange)',
    rows: ['..K..K..K..K.', '.KBKKBKKBKKBK', '.KBBBBBBBBBBK', 'KBBBBBBBBBBBK', 'KBWWKBBBWWKBK', 'KBWKKBBBWKKBK', 'KBBBBBBBBBBBK', 'KBKWKWKWKWKBK', 'KBBKKKKKKKBBK', '.KBBBBBBBBBK.', '.KBK.KBK.KBK.', '.KK..KK..KK..', '.............']
  }
};

/** One pixel of a monster, in CSS px. Game/Monster's box is 13 of them square. */
const MONSTER_PX = 5;

function monsterShadow(look: (typeof MONSTER_LOOKS)[number]): string {
  const { body, rows } = MONSTER_PIXELS[look];
  const colour: Record<string, string> = { K: 'var(--foreground)', B: body, W: 'var(--surface)', Y: 'var(--accent)' };
  const out: string[] = [];
  rows.forEach((line, y) => [...line].forEach((ch, x) => colour[ch] && out.push(`${x * MONSTER_PX}px ${y * MONSTER_PX}px 0 0 ${colour[ch]}`)));
  return out.join(', ');
}

/** Monster Gate's lane and monsters: what a node port cannot draw. Spliced into APP_CSS before its reduced-motion block, which stills every animation here. */
const MONSTER_CSS = `/* TPL-007 §16 Monster Gate. The lane: a sunshine gate with tomato bands on the left, the ground along the bottom, and (Push it back) the cave on the right. */
.rkt-lane { position: relative; background-image: linear-gradient(to top, var(--border-subtle) 0, var(--border-subtle) 21px, var(--foreground) 21px, var(--foreground) 24px, transparent 24px); }
.rkt-lane::before { content: ''; position: absolute; left: 12px; bottom: 21px; width: 62px; height: 104px; box-sizing: border-box; border: 3px solid var(--foreground); border-radius: 31px 31px 4px 4px; background: linear-gradient(var(--primary), var(--primary)) 0 30px / 100% 7px no-repeat, linear-gradient(var(--primary), var(--primary)) 0 66px / 100% 7px no-repeat, repeating-linear-gradient(90deg, var(--accent) 0, var(--accent) 12px, var(--foreground) 12px, var(--foreground) 14px); transform-origin: 50% 100%; }
.rkt-lane-push::after { content: ''; position: absolute; right: -10px; bottom: 21px; width: 70px; height: 86px; background: var(--foreground); border-radius: 44px 0 0 0; }
/* A bang shakes the gate. Two names, so the next bang shakes it again. */
@keyframes rkt-bang-a { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-7deg); } 60% { transform: rotate(5deg); } }
@keyframes rkt-bang-b { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-7deg); } 60% { transform: rotate(5deg); } }
.rkt-bang-a::before { animation: rkt-bang-a 420ms ease-out both; }
.rkt-bang-b::before { animation: rkt-bang-b 420ms ease-out both; }
/* The walk is the round's own clock, written on the mover's width every frame; between answers the mover glides to where the monster rests. */
.rkt-mover-glide { transition: width 450ms cubic-bezier(0.2, 0.9, 0.3, 1.2); }
/* Near the gate the mover is narrower than the monster, which then overhangs it to the left: it must never be squeezed instead. */
.rkt-mover > * { flex-shrink: 0 !important; }
/* A monster: its pixels in one box-shadow on a 5 px square. It bobs while it waits; a hit knocks it back, a lunge is a step closer, a beaten one runs off, and the next one walks in. */
@keyframes rkt-bob { 0% { transform: translateY(0); } 100% { transform: translateY(-4px); } }
.rkt-monster { position: relative; }
/* 🔴 The bob is on the pixels (::before), never the box. A hit, a lunge and an arrival animate the box, and an animation on the same element
   replaced the bob for the rest of the game (Richard, 2026-09-14: "after the first question they just slide towards the door"). */
.rkt-monster::before { content: ''; position: absolute; left: 0; top: 0; width: ${MONSTER_PX}px; height: ${MONSTER_PX}px; animation: rkt-bob 560ms steps(2, jump-none) infinite; }
${MONSTER_LOOKS.map((look) => `.rkt-monster-${look}::before { box-shadow: ${monsterShadow(look)}; }`).join('\n')}
@keyframes rkt-monster-hit-a { 0% { transform: translateX(0); filter: brightness(1.9); } 35% { transform: translateX(16px) rotate(9deg); } 70% { transform: translateX(-4px) rotate(-3deg); filter: none; } 100% { transform: translateX(0); } }
@keyframes rkt-monster-hit-b { 0% { transform: translateX(0); filter: brightness(1.9); } 35% { transform: translateX(16px) rotate(9deg); } 70% { transform: translateX(-4px) rotate(-3deg); filter: none; } 100% { transform: translateX(0); } }
@keyframes rkt-monster-lunge-a { 0%, 100% { transform: translateX(0); } 40% { transform: translateX(-12px) scale(1.08); } }
@keyframes rkt-monster-lunge-b { 0%, 100% { transform: translateX(0); } 40% { transform: translateX(-12px) scale(1.08); } }
@keyframes rkt-monster-arrive-a { 0% { transform: translateX(48px); opacity: 0; } 100% { transform: translateX(0); opacity: 1; } }
@keyframes rkt-monster-arrive-b { 0% { transform: translateX(48px); opacity: 0; } 100% { transform: translateX(0); opacity: 1; } }
@keyframes rkt-monster-gone { 0% { transform: translateX(0); opacity: 1; } 30% { transform: translateY(-10px) scaleX(-1); opacity: 1; } 100% { transform: translateX(90px) scaleX(-1); opacity: 0; } }
.rkt-monster-hit-a { animation: rkt-monster-hit-a 420ms ease-out both; }
.rkt-monster-hit-b { animation: rkt-monster-hit-b 420ms ease-out both; }
.rkt-monster-lunge-a { animation: rkt-monster-lunge-a 380ms ease-in-out both; }
.rkt-monster-lunge-b { animation: rkt-monster-lunge-b 380ms ease-in-out both; }
.rkt-monster-arrive-a { animation: rkt-monster-arrive-a 520ms ease-out both; }
.rkt-monster-arrive-b { animation: rkt-monster-arrive-b 520ms ease-out both; }
.rkt-monster-gone { animation: rkt-monster-gone 760ms ease-in both; }`;

export const APP_CSS = `/* Rocket School — the few things a node port cannot say. */
html, body { background: var(--background); }
.pressable { cursor: pointer; }
.pressable, .game-card { transition: transform 90ms ease-out; }
.game-card:hover { transform: translateY(-2px); }
.pressable:active { transform: translate(2px, 3px); }
/* RKT-002 AC4: the result screen pops in and its glyph cheers. The burst and the landing are the kit's own. */
@keyframes rkt-pop { 0% { transform: scale(0.7); opacity: 0; } 60% { transform: scale(1.05); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
@keyframes rkt-cheer { 0%, 100% { transform: rotate(0deg) scale(1); } 30% { transform: rotate(-14deg) scale(1.25); } 65% { transform: rotate(10deg) scale(1.15); } }
.rkt-result { animation: rkt-pop 480ms cubic-bezier(0.2, 0.9, 0.3, 1.25) both; }
.rkt-result-glyph { animation: rkt-cheer 900ms ease-in-out 400ms 2 both; }
/* RKT-007: the last three seconds of a Défi question pulse. Under reduced motion only their colour says so. */
@keyframes rkt-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.3); } }
.rkt-clock-last { display: inline-block; animation: rkt-pulse 1000ms ease-in-out infinite; }
/* RKT-010: the race's stars pop in a beat after the result card. Under reduced motion the number is simply there. */
.rkt-stars { animation: rkt-pop 480ms cubic-bezier(0.2, 0.9, 0.3, 1.25) 700ms both; }
/* RKT-011: the hangar's preview pops when something goes on. Two names, so the class swap on each change restarts it. */
@keyframes rkt-wear-a { 0%, 100% { transform: scale(1); } 45% { transform: scale(1.12); } }
@keyframes rkt-wear-b { 0%, 100% { transform: scale(1); } 45% { transform: scale(1.12); } }
.rkt-wear-a { animation: rkt-wear-a 420ms ease-out both; }
.rkt-wear-b { animation: rkt-wear-b 420ms ease-out both; }
/* TPL-007 Make Ten Merge: a square that just joined pops, and a new one grows in. Two names each, so the same square pops again on the next move. */
@keyframes rkt-join-a { 0%, 100% { transform: scale(1); } 45% { transform: scale(1.16); } }
@keyframes rkt-join-b { 0%, 100% { transform: scale(1); } 45% { transform: scale(1.16); } }
@keyframes rkt-land-a { 0% { transform: scale(0.3); } 100% { transform: scale(1); } }
@keyframes rkt-land-b { 0% { transform: scale(0.3); } 100% { transform: scale(1); } }
.rkt-join-a { animation: rkt-join-a 240ms ease-out both; }
.rkt-join-b { animation: rkt-join-b 240ms ease-out both; }
.rkt-land-a { animation: rkt-land-a 200ms ease-out both; }
.rkt-land-b { animation: rkt-land-b 200ms ease-out both; }
/* The lock: the board greys out (its opacity comes from the graph) over a short fade. */
.rkt-merge-board { transition: opacity 400ms ease-out; }
/* TPL-007 Number Hunt: a wrong pick shakes (a way found pops with rkt-join-a/b). Two names, so the next wrong pick shakes again. */
@keyframes rkt-shake-a { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
@keyframes rkt-shake-b { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
.rkt-shake-a { animation: rkt-shake-a 320ms ease-in-out both; }
.rkt-shake-b { animation: rkt-shake-b 320ms ease-in-out both; }
${MONSTER_CSS}
@media (prefers-reduced-motion: reduce) {
  .pressable, .game-card { transition: none; }
  .game-card:hover, .pressable:active { transform: none; }
  .rkt-result, .rkt-result-glyph, .rkt-clock-last, .rkt-stars, .rkt-wear-a, .rkt-wear-b, .rkt-join-a, .rkt-join-b, .rkt-land-a, .rkt-land-b, .rkt-shake-a, .rkt-shake-b { animation: none; }
  .rkt-merge-board { transition: none; }
  .rkt-monster::before, .rkt-monster-hit-a, .rkt-monster-hit-b, .rkt-monster-lunge-a, .rkt-monster-lunge-b, .rkt-monster-arrive-a, .rkt-monster-arrive-b, .rkt-bang-a::before, .rkt-bang-b::before { animation: none; }
  .rkt-monster-gone { animation: none; opacity: 0.35; }
  .rkt-mover-glide { transition: none; }
}`;

export const APP_NODES = [
  group('app_root', 'App', undefined, { sizeMode: 'explicit', width: pct(100), height: pct(100), backgroundColor: 'var(--background)' }, ['app_router']),
  { id: 'app_router', type: 'Router', label: 'Main router', parent: 'app_root', parameters: { name: ROUTER } },
  logic('app_css', CSS_NODE, 'The page ground and the pointer', { style: APP_CSS })
];
export const APP_WIRES: unknown[] = [];

/** The nodes every signed-in page starts with: the store, the profile, the words. */
function pageCommon(p: string): { nodes: unknown[]; connections: unknown[] } {
  return {
    nodes: [
      logic(`${p}Store`, C.store, 'The store'),
      logic(`${p}Me`, logicName('Logic/Active profile'), 'Who is playing'),
      logic(`${p}Words`, C.words, 'The words'),
      logic(`${p}T`, logicName('Logic/Translate words'), 'In their language'),
      logic(`${p}Curriculum`, C.curriculum, 'The skills'),
      logic(`${p}WordLists`, C.wordLists, 'The typing words')
    ],
    connections: [
      wire(`${p}Store`, 'app', `${p}Me`, 'app'),
      wire(`${p}Words`, 'words', `${p}T`, 'words'),
      wire(`${p}Me`, 'lang', `${p}T`, 'lang')
    ]
  };
}

/**
 * RKT-008: what a page gives Game/Header, and what it does with what the menu writes. The menu's scripts live in the header, so a page
 * spends no node on them: the store goes in, and the header hands back the store to write.
 */
function headerWires(p: string, { hangar = true }: { hangar?: boolean } = {}): unknown[] {
  const h = `${p}Header`;
  return [
    // The menu's way to the hangar, on every page but the hangar itself (which places the header with Show Hangar false).
    ...(hangar ? [wire(h, 'hangar', `${p}GoHangar`, 'navigate')] : []),
    ...(['name', 'look', 'seed', 'lang', 'level', 'layout', 'soundMode', 'answerMode', 'profileId'] as const).map((field) => wire(`${p}Me`, field, h, field)),
    wire(`${p}Me`, 'faceOptions', h, 'options'),
    wire(`${p}Store`, 'app', h, 'app'),
    wire(h, 'app', `${p}Store`, 'app'),
    wire(h, 'write', `${p}Store`, 'write'),
    wire(h, 'switchPlayer', `${p}GoProfiles`, 'navigate'),
    wire(h, 'deleted', `${p}GoProfiles`, 'navigate')
  ];
}

const PAGE_PROFILES: Tpl007Component = {
  path: 'Pages/Profiles',
  description: 'Who is playing: the profiles in this browser as cards, and the new-player form. Choosing one goes Home.',
  instantiates: [C.profileCard, C.newPlayer, C.store, logicName('Logic/List profiles'), logicName('Logic/Select profile'), logicName('Logic/Create profile'), logicName('Logic/Translate words'), C.words],
  repeats: { source: 'array', rowFields: ['id', 'name', 'look', 'seed', 'level', 'selected', 'due', 'faceOptions'] },
  nodes: [
    { id: 'pfPage', type: 'Page', label: 'Profiles', parameters: { title: 'Rocket School', urlPath: '' }, children: ['pfWrap'] },
    group('pfWrap', 'The screen', 'pfPage', column({ alignItems: 'center', rowGap: 'var(--space-6)', paddingTop: 'var(--space-10)', paddingBottom: 'var(--space-10)', paddingLeft: 'var(--space-4)', paddingRight: 'var(--space-4)' }), ['pfEyebrow', 'pfTitle', 'pfLead', 'pfList', 'pfNew', 'pfForm']),
    text('pfEyebrow', 'Eyebrow', 'pfWrap', 'Rocket School', { ...T_EYEBROW, textAlignX: 'center' }),
    text('pfTitle', 'Who is playing?', 'pfWrap', '', { ...T_TITLE, textAlignX: 'center' }),
    text('pfLead', 'The tagline', 'pfWrap', '', { ...T_LEAD, textAlignX: 'center' }),
    group('pfList', 'The players', 'pfWrap', row({ justifyContent: 'center', columnGap: 'var(--space-4)', rowGap: 'var(--space-4)' }), ['pfEach']),
    logic('pfEach', FOR_EACH_NODE, 'One card per player', { template: C.profileCard, templateType: 'explicit' }),
    place('pfNew', BUTTON_NODE, 'New player', 'pfWrap', { ...BTN_PRIMARY, label: 'New player' }),
    place('pfForm', C.newPlayer, 'The form', 'pfWrap'),
    logic('pfStore', C.store, 'The store'),
    logic('pfList2', logicName('Logic/List profiles'), 'The profiles'),
    logic('pfSelect', logicName('Logic/Select profile'), 'Choose one'),
    logic('pfCreate', logicName('Logic/Create profile'), 'Make one'),
    logic('pfWords', C.words, 'The words'),
    logic('pfT', logicName('Logic/Translate words'), 'In English until a player is chosen'),
    logic('pfFormOpen', VARIABLE_NODE, 'Is the form open?', { name: 'profileFormOpen' }),
    logic('pfOpenForm', SET_VARIABLE_NODE, 'Open the form', { name: 'profileFormOpen' }),
    logic('pfCloseForm', SET_VARIABLE_NODE, 'Close the form', { name: 'profileFormOpen' }),
    logic('pfTrue', EXPRESSION_NODE, 'True', { expression: 'true' }),
    logic('pfFalse', EXPRESSION_NODE, 'False', { expression: 'false' }),
    logic('pfNewShown', EXPRESSION_NODE, 'Show the button?', { expression: 'canAdd && !open' }),
    logic('pfGoHome', NAVIGATE_NODE, 'Go home', { router: ROUTER, target: C.pageHome })
  ],
  connections: [
    // The form starts closed: the Variable is written on mount, not left undefined.
    wire('pfPage', 'didMount', 'pfCloseForm', 'do'),
    wire('pfT', 'whoIsPlaying', 'pfTitle', 'text'),
    wire('pfT', 'tagline', 'pfLead', 'text'),
    wire('pfT', 'newProfile', 'pfNew', 'label'),
    wire('pfWords', 'words', 'pfT', 'words'),
    wire('pfStore', 'app', 'pfList2', 'app'),
    wire('pfList2', 'profiles', 'pfEach', 'items'),
    // Choose: write the choice, then go home once it is written.
    wire('pfStore', 'app', 'pfSelect', 'app'),
    wire('pfEach', 'itemOutput-id', 'pfSelect', 'profileId'),
    wire('pfEach', 'itemOutputSignal-chosen', 'pfSelect', 'run'),
    wire('pfSelect', 'app', 'pfStore', 'app'),
    wire('pfSelect', 'done', 'pfStore', 'write'),
    // Create: the same, from the form.
    wire('pfStore', 'app', 'pfCreate', 'app'),
    wire('pfForm', 'name', 'pfCreate', 'name'),
    wire('pfForm', 'look', 'pfCreate', 'look'),
    wire('pfForm', 'seed', 'pfCreate', 'seed'),
    wire('pfForm', 'level', 'pfCreate', 'level'),
    wire('pfForm', 'lang', 'pfCreate', 'lang'),
    wire('pfForm', 'create', 'pfCreate', 'run'),
    wire('pfCreate', 'app', 'pfStore', 'app'),
    wire('pfCreate', 'done', 'pfStore', 'write'),
    wire('pfStore', 'written', 'pfGoHome', 'navigate'),
    // The form opens and closes.
    wire('pfTrue', 'result', 'pfOpenForm', 'value'),
    wire('pfNew', 'onClick', 'pfOpenForm', 'do'),
    wire('pfNew', 'onClick', 'pfForm', 'reset'),
    wire('pfFalse', 'result', 'pfCloseForm', 'value'),
    wire('pfForm', 'cancel', 'pfCloseForm', 'do'),
    wire('pfFormOpen', 'value', 'pfForm', 'mounted'),
    wire('pfList2', 'canAdd', 'pfNewShown', 'canAdd'),
    wire('pfFormOpen', 'value', 'pfNewShown', 'open'),
    wire('pfNewShown', 'result', 'pfNew', 'mounted'),
    wire('pfT', 'yourName', 'pfForm', 'nameWord'),
    wire('pfT', 'pickAvatar', 'pfForm', 'faceWord'),
    wire('pfT', 'rollAvatar', 'pfForm', 'rollWord'),
    wire('pfT', 'yourLevel', 'pfForm', 'levelWord'),
    wire('pfT', 'language', 'pfForm', 'langWord'),
    wire('pfT', 'create', 'pfForm', 'createWord'),
    wire('pfT', 'cancel', 'pfForm', 'cancelWord')
  ]
};

const GAMES: ReadonlyArray<{ id: string; glyph: string; title: string; blurb: string; target?: string }> = [
  { id: 'Race', glyph: '🚀', title: 'gameRace', blurb: 'gameRaceBlurb', target: C.pageRace },
  // Richard, 2026-09-14: the hangar is not a game, so it is not a card here. It is Home's bar to the next pick, and the player menu.
  { id: 'Merge', glyph: '🔟', title: 'gameMerge', blurb: 'gameMergeBlurb', target: C.pageMerge },
  { id: 'Hunt', glyph: '🔍', title: 'gameHunt', blurb: 'gameHuntBlurb', target: C.pageHunt },
  { id: 'Monster', glyph: '👾', title: 'gameMonster', blurb: 'gameMonsterBlurb', target: C.pageMonster }
];

const PAGE_HOME: Tpl007Component = {
  path: 'Pages/Home',
  description: 'Home: who you are, what is due, the days this week, the stars earned (RKT-010), and the four games. A game that is not built yet is greyed out.',
  instantiates: [C.header, C.gameCard, C.stat, C.nextPick, C.store, logicName('Logic/Active profile'), logicName('Logic/Translate words'), C.words],
  nodes: [
    { id: 'hmPage', type: 'Page', label: 'Home', parameters: { title: 'Rocket School', urlPath: 'home' }, children: ['hmOuter'] },
    group('hmOuter', 'The ground', 'hmPage', column({ alignItems: 'center' }), ['hmWrap']),
    group('hmWrap', 'The screen', 'hmOuter', column({ alignItems: 'stretch', rowGap: 'var(--space-6)', paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-10)', paddingLeft: 'var(--space-4)', paddingRight: 'var(--space-4)', maxWidth: px(960) }), ['hmHeader', 'hmStats', 'hmNext', 'hmTitle', 'hmGames']),
    place('hmHeader', C.header, 'The bar', 'hmWrap', { showHome: false, showHangar: true }),
    group('hmStats', 'The readings', 'hmWrap', row(), ['hmDue', 'hmDays', 'hmStars']),
    place('hmDue', C.stat, 'Due today', 'hmStats', { tone: ROLE.costly }),
    place('hmDays', C.stat, 'Days this week', 'hmStats', { tone: ROLE.you }),
    // 🔴 RKT-010: the total is shown here, to the player it belongs to, and never on Game/Profile card, where siblings' cards sit side by side.
    place('hmStars', C.stat, 'Stars earned', 'hmStats', { tone: ROLE.you }),
    // RKT-011: the bar to the next 🎁, under the stars. A tap on it opens the hangar.
    place('hmNext', C.nextPick, 'The way to the next pick', 'hmWrap'),
    text('hmTitle', 'Play', 'hmWrap', '', T_SECTION),
    group('hmGames', 'The four games', 'hmWrap', { ...column(), flexDirection: 'row', flexWrap: 'wrap', columnGap: 'var(--space-4)', rowGap: 'var(--space-4)' }, GAMES.map((g) => `hm${g.id}`)),
    ...GAMES.map((g) => place(`hm${g.id}`, C.gameCard, g.title, 'hmGames', { glyph: g.glyph, enabled: !!g.target })),
    ...pageCommon('hm').nodes,
    logic('hmNoOne', EXPRESSION_NODE, 'Nobody signed in?', { expression: 'has === false' }),
    gate('hmGuard', 'Send them to the profiles?'),
    logic('hmGoProfiles', NAVIGATE_NODE, 'To the profiles', { router: ROUTER, target: C.pageProfiles }),
    logic('hmGoRace', NAVIGATE_NODE, 'To the race', { router: ROUTER, target: C.pageRace }),
    logic('hmGoMerge', NAVIGATE_NODE, 'To Make Ten Merge', { router: ROUTER, target: C.pageMerge }),
    logic('hmGoHunt', NAVIGATE_NODE, 'To Number Hunt', { router: ROUTER, target: C.pageHunt }),
    // 🔴 Home's 32nd node: a page holds 32, so this is the last navigate that fits.
    logic('hmGoMonster', NAVIGATE_NODE, 'To Monster Gate', { router: ROUTER, target: C.pageMonster }),
    logic('hmGoHangar', NAVIGATE_NODE, 'To the hangar', { router: ROUTER, target: C.pageHangar }),
    logic('hmDueText', EXPRESSION_NODE, 'As text', { expression: "'' + n" }),
    logic('hmDaysText', EXPRESSION_NODE, 'As text', { expression: "'' + n" }),
    logic('hmStarsText', EXPRESSION_NODE, 'As text', { expression: "'' + n" })
  ],
  connections: [
    ...pageCommon('hm').connections,
    // The guard: no profile, no home.
    wire('hmMe', 'hasProfile', 'hmNoOne', 'has'),
    wire('hmNoOne', 'result', 'hmGuard', 'condition'),
    wire('hmPage', 'didMount', 'hmGuard', 'eval'),
    wire('hmGuard', 'ontrue', 'hmGoProfiles', 'navigate'),
    // The bar, and what its menu writes (RKT-008).
    ...headerWires('hm'),
    // The readings.
    wire('hmMe', 'due', 'hmDueText', 'n'),
    wire('hmDueText', 'result', 'hmDue', 'value'),
    wire('hmT', 'dueToday', 'hmDue', 'label'),
    wire('hmMe', 'days7', 'hmDaysText', 'n'),
    wire('hmDaysText', 'result', 'hmDays', 'value'),
    wire('hmT', 'daysThisWeek', 'hmDays', 'label'),
    wire('hmMe', 'stars', 'hmStarsText', 'n'),
    wire('hmStarsText', 'result', 'hmStars', 'value'),
    wire('hmT', 'stars', 'hmStars', 'label'),
    wire('hmT', 'play', 'hmTitle', 'text'),
    // The games.
    ...GAMES.flatMap((g) => [wire('hmT', g.title, `hm${g.id}`, 'title'), wire('hmT', g.blurb, `hm${g.id}`, 'blurb')]),
    wire('hmRace', 'chosen', 'hmGoRace', 'navigate'),
    wire('hmMerge', 'chosen', 'hmGoMerge', 'navigate'),
    wire('hmHunt', 'chosen', 'hmGoHunt', 'navigate'),
    wire('hmMonster', 'chosen', 'hmGoMonster', 'navigate'),
    // RKT-011: the hangar, from the bar to the next pick (and from the player menu, through headerWires).
    wire('hmMe', 'nextText', 'hmNext', 'text'),
    wire('hmMe', 'nextPct', 'hmNext', 'percent'),
    wire('hmMe', 'hasPicks', 'hmNext', 'hasPicks'),
    wire('hmNext', 'open', 'hmGoHangar', 'navigate')
  ]
};

const PAGE_RACE: Tpl007Component = {
  path: 'Pages/Race',
  description: 'The Rocket Race page: setup, then the race and its result screen (both in Race/Play), with the model saved after every round.',
  instantiates: [C.header, C.raceSetup, C.racePlay, C.store, logicName('Logic/Active profile'), logicName('Logic/Translate words'), logicName('Logic/Save model'), logicName('Logic/Update settings'), C.words, C.curriculum, C.wordLists, C.teachCards],
  nodes: [
    { id: 'rcPage', type: 'Page', label: 'Race', parameters: { title: 'Rocket Race', urlPath: 'race' }, children: ['rcOuter'] },
    group('rcOuter', 'The ground', 'rcPage', column({ alignItems: 'center' }), ['rcWrap']),
    group('rcWrap', 'The screen', 'rcOuter', column({ alignItems: 'stretch', rowGap: 'var(--space-4)', paddingTop: 'var(--space-4)', paddingBottom: 'var(--space-6)', paddingLeft: 'var(--space-4)', paddingRight: 'var(--space-4)', maxWidth: px(960) }), ['rcHeader', 'rcTitle', 'rcSetup', 'rcPlay']),
    place('rcHeader', C.header, 'The bar', 'rcWrap', { showHome: true, showHangar: true }),
    text('rcTitle', 'Rocket Race', 'rcWrap', '', T_SECTION),
    place('rcSetup', C.raceSetup, 'Before the race', 'rcWrap'),
    place('rcPlay', C.racePlay, 'The race', 'rcWrap'),
    ...pageCommon('rc').nodes,
    logic('rcSave', logicName('Logic/Save model'), 'Remember what was learned'),
    // 🔴 Two, never one (build 7, driven): the Dropdown's Value already holds the profile's layout, so one script fed both a report and a
    // pick read that value as a pick on every key press, marked the layout picked, and detection never wrote.
    logic('rcKeys', logicName('Logic/Update settings'), 'Keep the keyboard a key press reports'),
    logic('rcPick', logicName('Logic/Update settings'), 'Keep the keyboard picked beside the map'),
    logic('rcNoOne', EXPRESSION_NODE, 'Nobody signed in?', { expression: 'has === false' }),
    gate('rcGuard', 'Send them to the profiles?'),
    logic('rcGoProfiles', NAVIGATE_NODE, 'To the profiles', { router: ROUTER, target: C.pageProfiles }),
    logic('rcGoHome', NAVIGATE_NODE, 'Home', { router: ROUTER, target: C.pageHome }),
    logic('rcGoHangar', NAVIGATE_NODE, 'To the hangar', { router: ROUTER, target: C.pageHangar }),
    logic('rcPlaying', VARIABLE_NODE, 'Racing?', { name: 'racePlaying' }),
    logic('rcSetPlaying', SET_VARIABLE_NODE, 'Racing now', { name: 'racePlaying' }),
    logic('rcSetDone', SET_VARIABLE_NODE, 'Not racing', { name: 'racePlaying' }),
    logic('rcInitDone', SET_VARIABLE_NODE, 'Not racing yet (on load)', { name: 'racePlaying' }),
    logic('rcTrue', EXPRESSION_NODE, 'True', { expression: 'true' }),
    logic('rcFalse', EXPRESSION_NODE, 'False', { expression: 'false' }),
    logic('rcNotPlaying', EXPRESSION_NODE, 'Setting up?', { expression: '!playing' }),
    logic('rcNameB', EXPRESSION_NODE, 'Player two, or the computer', { expression: "players === 2 && ((nameB || '') + '').trim() ? nameB : 'CPU'" }),
    logic('rcSoundsEnd', C.sounds, 'The fanfare'),
    logic('rcTeachCards', C.teachCards, 'The Teach cards')
  ],
  connections: [
    ...pageCommon('rc').connections,
    // Not racing until Start: the Variable is written on mount, not left undefined.
    wire('rcFalse', 'result', 'rcInitDone', 'value'),
    wire('rcPage', 'didMount', 'rcInitDone', 'do'),
    wire('rcMe', 'hasProfile', 'rcNoOne', 'has'),
    wire('rcNoOne', 'result', 'rcGuard', 'condition'),
    wire('rcPage', 'didMount', 'rcGuard', 'eval'),
    wire('rcGuard', 'ontrue', 'rcGoProfiles', 'navigate'),
    // The bar, and what its menu writes (RKT-008).
    ...headerWires('rc'),
    wire('rcHeader', 'home', 'rcGoHome', 'navigate'),
    wire('rcT', 'gameRace', 'rcTitle', 'text'),
    // Setup words.
    wire('rcT', 'mathsMode', 'rcSetup', 'mathsWord'),
    wire('rcT', 'typingMode', 'rcSetup', 'typingWord'),
    wire('rcT', 'onePlayer', 'rcSetup', 'onePlayerWord'),
    wire('rcT', 'twoPlayers', 'rcSetup', 'twoPlayersWord'),
    wire('rcT', 'practice', 'rcSetup', 'practiceWord'),
    wire('rcT', 'challenge', 'rcSetup', 'challengeWord'),
    wire('rcT', 'practiceRule', 'rcSetup', 'practiceRuleWord'),
    wire('rcT', 'challengeRule', 'rcSetup', 'challengeRuleWord'),
    wire('rcT', 'start', 'rcSetup', 'startWord'),
    wire('rcT', 'yourName', 'rcSetup', 'nameWord'),
    wire('rcNotPlaying', 'result', 'rcSetup', 'mounted'),
    // RKT-003: while racing, the stage has the screen — no heading, and a one-row header.
    wire('rcNotPlaying', 'result', 'rcTitle', 'mounted'),
    // 🔴 RKT-006: the race's own controls (Restart, Change the race) cost the stage a 56px row, which put Next 23px below a
    // 1280×720 screen and Got it 23px below a phone (RKT-006 build 2, measured). In a live race the page's bar goes instead: the child's
    // face is on their rocket, and Home is one tap past Change the race.
    wire('rcPlaying', 'value', 'rcHeader', 'hideBar'),
    wire('rcPlaying', 'value', 'rcNotPlaying', 'playing'),
    // Start: racing, then the race starts.
    wire('rcTrue', 'result', 'rcSetPlaying', 'value'),
    wire('rcSetup', 'start', 'rcSetPlaying', 'do'),
    wire('rcSetPlaying', 'done', 'rcPlay', 'start'),
    wire('rcPlaying', 'value', 'rcPlay', 'mounted'),
    // The race gets the profile and the words.
    wire('rcMe', 'level', 'rcPlay', 'level'),
    wire('rcMe', 'lang', 'rcPlay', 'lang'),
    wire('rcMe', 'layout', 'rcPlay', 'layout'),
    wire('rcMe', 'answerMode', 'rcPlay', 'answerMode'),
    wire('rcMe', 'model', 'rcPlay', 'model'),
    wire('rcMe', 'sound', 'rcPlay', 'soundOn'),
    wire('rcMe', 'name', 'rcPlay', 'nameA'),
    wire('rcMe', 'look', 'rcPlay', 'lookA'),
    wire('rcMe', 'seed', 'rcPlay', 'seedA'),
    wire('rcMe', 'faceOptions', 'rcPlay', 'optionsA'),
    wire('rcMe', 'paint', 'rcPlay', 'paintA'),
    wire('rcCurriculum', 'skills', 'rcPlay', 'curriculum'),
    wire('rcWordLists', 'lists', 'rcPlay', 'wordLists'),
    wire('rcSetup', 'mode', 'rcPlay', 'mode'),
    wire('rcSetup', 'players', 'rcPlay', 'players'),
    wire('rcSetup', 'timed', 'rcPlay', 'timed'),
    wire('rcSetup', 'players', 'rcNameB', 'players'),
    wire('rcSetup', 'nameB', 'rcNameB', 'nameB'),
    wire('rcNameB', 'result', 'rcPlay', 'nameB'),
    wire('rcT', 'typeAnswer', 'rcPlay', 'placeholder'),
    wire('rcT', 'check', 'rcPlay', 'checkWord'),
    wire('rcT', 'fluent', 'rcPlay', 'fluentWord'),
    wire('rcT', 'correct', 'rcPlay', 'correctWord'),
    wire('rcT', 'wrong', 'rcPlay', 'wrongWord'),
    wire('rcT', 'timeUp', 'rcPlay', 'timeUpWord'),
    wire('rcT', 'next', 'rcPlay', 'nextWord'),
    wire('rcT', 'showMe', 'rcPlay', 'showMeWord'),
    wire('rcTeachCards', 'cards', 'rcPlay', 'teachCards'),
    wire('rcT', 'anExample', 'rcPlay', 'anExampleWord'),
    wire('rcT', 'gotIt', 'rcPlay', 'gotItWord'),
    wire('rcT', 'yourTurn', 'rcPlay', 'yourTurnWord'),
    // Every round: the model goes into the store.
    wire('rcStore', 'app', 'rcSave', 'app'),
    wire('rcMe', 'profileId', 'rcSave', 'profileId'),
    wire('rcPlay', 'model', 'rcSave', 'model'),
    wire('rcPlay', 'graded', 'rcSave', 'run'),
    wire('rcSave', 'app', 'rcStore', 'app'),
    wire('rcSave', 'done', 'rcStore', 'write'),
    // 🔴 RKT-008 AC7 (Richard, on a French MacBook, saw QWERTY): the keyboard follows the keyboard. A key press reports it, and the script
    // keeps it only while the child has picked none; the FR / UK / US dropdown beside the map is a pick.
    wire('rcStore', 'app', 'rcKeys', 'app'),
    wire('rcMe', 'profileId', 'rcKeys', 'profileId'),
    wire('rcPlay', 'layoutSeen', 'rcKeys', 'layoutSeen'),
    wire('rcPlay', 'layoutSeenNow', 'rcKeys', 'run'),
    wire('rcKeys', 'app', 'rcStore', 'app'),
    wire('rcKeys', 'done', 'rcStore', 'write'),
    wire('rcStore', 'app', 'rcPick', 'app'),
    wire('rcMe', 'profileId', 'rcPick', 'profileId'),
    wire('rcPlay', 'layoutPick', 'rcPick', 'layout'),
    wire('rcPlay', 'layoutPickNow', 'rcPick', 'run'),
    wire('rcPick', 'app', 'rcStore', 'app'),
    wire('rcPick', 'done', 'rcStore', 'write'),
    // RKT-002 AC4: the end is Race/Play's result screen, in the stage. The page plays the fanfare, and Change the race is
    // setup again. 🔴 The fanfare's Condition used to read the winner's LETTER, and a Condition is `!!value`, so 'B' cheered too.
    wire('rcT', 'youWin', 'rcPlay', 'youWinWord'),
    wire('rcT', 'computerWins', 'rcPlay', 'computerWinsWord'),
    wire('rcT', 'playerWins', 'rcPlay', 'winsWord'),
    wire('rcT', 'again', 'rcPlay', 'againWord'),
    wire('rcT', 'otherRace', 'rcPlay', 'otherRaceWord'),
    wire('rcT', 'restart', 'rcPlay', 'restartWord'),
    wire('rcT', 'rightAnswers', 'rcPlay', 'rightAnswersWord'),
    // RKT-011: the result's way to the hangar.
    wire('rcT', 'earnedPick', 'rcPlay', 'pickWord'),
    wire('rcT', 'toHangar', 'rcPlay', 'hangarWord'),
    wire('rcPlay', 'hangar', 'rcGoHangar', 'navigate'),
    wire('rcFalse', 'result', 'rcSetDone', 'value'),
    wire('rcPlay', 'changeRace', 'rcSetDone', 'do'),
    wire('rcMe', 'sound', 'rcSoundsEnd', 'enabled'),
    wire('rcPlay', 'cheer', 'rcSoundsEnd', 'win'),
    wire('rcPlay', 'sigh', 'rcSoundsEnd', 'lose')
  ]
};

/** RKT-011 — the hangar: the face and rocket on top, the shelf under them. */
const PAGE_HANGAR: Tpl007Component = {
  path: 'Pages/Hangar',
  description: 'The hangar (RKT-011): the child’s face and rocket as they will race, then the shelf. Each 🎁 pick a milestone gives becomes any item that fits; what is theirs goes on or off with a tap. Nothing here is random, time-limited or paid, and nothing is ever taken away.',
  instantiates: [C.header, C.hangarPreview, C.hangarShelf, C.hangarData, C.store, logicName('Logic/Active profile'), logicName('Logic/Translate words'), logicName('Logic/Pick item'), logicName('Logic/Wear item'), C.words],
  nodes: [
    { id: 'hgPage', type: 'Page', label: 'Hangar', parameters: { title: 'Rocket School', urlPath: 'hangar' }, children: ['hgOuter'] },
    group('hgOuter', 'The ground', 'hgPage', column({ alignItems: 'center' }), ['hgWrap']),
    group('hgWrap', 'The screen', 'hgOuter', column({ alignItems: 'stretch', rowGap: 'var(--space-4)', paddingTop: 'var(--space-4)', paddingBottom: 'var(--space-8)', paddingLeft: 'var(--space-4)', paddingRight: 'var(--space-4)', maxWidth: px(960) }), ['hgHeader', 'hgTitle', 'hgPreview', 'hgShelf']),
    place('hgHeader', C.header, 'The bar', 'hgWrap', { showHome: true, showHangar: false }),
    text('hgTitle', 'Hangar', 'hgWrap', '', T_SECTION),
    place('hgPreview', C.hangarPreview, 'Your face and rocket', 'hgWrap'),
    place('hgShelf', C.hangarShelf, 'The shelf', 'hgWrap'),
    ...pageCommon('hg').nodes,
    logic('hgItems', C.hangarData, 'What the shelf offers'),
    logic('hgPick', logicName('Logic/Pick item'), 'Spend a pick'),
    logic('hgWear', logicName('Logic/Wear item'), 'Put it on, or take it off'),
    logic('hgNoOne', EXPRESSION_NODE, 'Nobody signed in?', { expression: 'has === false' }),
    gate('hgGuard', 'Send them to the profiles?'),
    logic('hgGoProfiles', NAVIGATE_NODE, 'To the profiles', { router: ROUTER, target: C.pageProfiles }),
    logic('hgGoHome', NAVIGATE_NODE, 'Home', { router: ROUTER, target: C.pageHome })
  ],
  connections: [
    ...pageCommon('hg').connections,
    wire('hgMe', 'hasProfile', 'hgNoOne', 'has'),
    wire('hgNoOne', 'result', 'hgGuard', 'condition'),
    wire('hgPage', 'didMount', 'hgGuard', 'eval'),
    wire('hgGuard', 'ontrue', 'hgGoProfiles', 'navigate'),
    // The bar, and what its menu writes (RKT-008).
    ...headerWires('hg', { hangar: false }),
    wire('hgHeader', 'home', 'hgGoHome', 'navigate'),
    wire('hgT', 'hangar', 'hgTitle', 'text'),
    // The preview: what the next race will show.
    wire('hgMe', 'name', 'hgPreview', 'name'),
    wire('hgMe', 'look', 'hgPreview', 'look'),
    wire('hgMe', 'seed', 'hgPreview', 'seed'),
    wire('hgMe', 'faceOptions', 'hgPreview', 'options'),
    wire('hgMe', 'paint', 'hgPreview', 'paint'),
    wire('hgMe', 'nextText', 'hgPreview', 'line'),
    // The shelf.
    wire('hgStore', 'app', 'hgShelf', 'app'),
    wire('hgItems', 'items', 'hgShelf', 'shelf'),
    wire('hgT', 'faceTab', 'hgShelf', 'faceWord'),
    wire('hgT', 'rocketTab', 'hgShelf', 'rocketWord'),
    // A pick: spent and worn, written, and the preview pops.
    wire('hgStore', 'app', 'hgPick', 'app'),
    wire('hgMe', 'profileId', 'hgPick', 'profileId'),
    wire('hgShelf', 'itemId', 'hgPick', 'itemId'),
    wire('hgItems', 'items', 'hgPick', 'shelf'),
    wire('hgShelf', 'pick', 'hgPick', 'run'),
    wire('hgPick', 'app', 'hgStore', 'app'),
    wire('hgPick', 'done', 'hgStore', 'write'),
    wire('hgPick', 'done', 'hgPreview', 'changed'),
    // On or off: the same.
    wire('hgStore', 'app', 'hgWear', 'app'),
    wire('hgMe', 'profileId', 'hgWear', 'profileId'),
    wire('hgShelf', 'itemId', 'hgWear', 'itemId'),
    wire('hgItems', 'items', 'hgWear', 'shelf'),
    wire('hgShelf', 'wear', 'hgWear', 'run'),
    wire('hgWear', 'app', 'hgStore', 'app'),
    wire('hgWear', 'done', 'hgStore', 'write'),
    wire('hgWear', 'done', 'hgPreview', 'changed')
  ]
};

// ── Make Ten Merge (TPL-007 §2.2 B, §12.1) ─────────────────────────────────

/** The arrows. Each is the one slide rule placed with its direction as a parameter (TPL-005's move rule, placed four times). */
const MERGE_DIRS = [
  { id: 'Up', dir: 'up', glyph: '↑', label: 'Slide up' },
  { id: 'Left', dir: 'left', glyph: '←', label: 'Slide left' },
  { id: 'Down', dir: 'down', glyph: '↓', label: 'Slide down' },
  { id: 'Right', dir: 'right', glyph: '→', label: 'Slide right' }
] as const;

/**
 * 🔴 Driven on build 1 (FR 390×844): the end card sits under the board on a phone, and it grows after Race/Result has focused New game
 * (the stars, the why and the 🎁 lines arrive with Finish merge), so New game ended below the fold and a child had to scroll to go on.
 * Once the card holds its words, its row of ways on is brought on screen: the nearest scroll that shows all of it, never a smooth one.
 */
const BRING_BUTTON_INTO_VIEW_SCRIPT = `if (typeof document !== 'undefined') {
  const word = String(Inputs.word || '').trim();
  setTimeout(() => {
    const button = Array.from(document.querySelectorAll('button')).find((b) => b.getClientRects().length > 0 && b.innerText.trim() === word);
    if (!button) return;
    // The whole row of ways on (New game, the hangar, Home), not New game alone: build 2's phone showed New game and cut Home off.
    let row = button.parentElement;
    while (row && row.querySelectorAll('button').length < 2) row = row.parentElement;
    (row || button).scrollIntoView({ block: 'nearest', behavior: 'auto' });
  }, 250);
}`;

/** One square of the board. Row fields from Logic/Draw merge board. */
const MERGE_TILE: Tpl007Component = {
  path: 'Merge/Tile',
  description: 'One square of the Make Ten board: its number, and a colour for the kind of number it is: empty, a single number, a ten (sunshine), tens (tomato), or a hundred and over (teal). Fx is its class, so a square that just joined pops and one that just landed grows in.',
  inputs: [port('word', 'string'), port('kind', 'string'), port('fx', 'string')],
  outputs: [],
  nodes: [
    inputs('mtIn', 'The square', [['word', 'string'], ['kind', 'string'], ['fx', 'string']]),
    group('mtCell', 'The square', undefined, { width: px(72), height: px(72), sizeMode: 'explicit', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--muted)', borderRadius: 'var(--radius-md)', borderStyle: 'solid', borderWidth: 'var(--border-1)', borderColor: 'var(--border-subtle)', cssClassName: 'rkt-merge-tile' }, ['mtWord']),
    text('mtWord', 'The number', 'mtCell', '', { ...DISPLAY, fontSize: 'var(--text-2xl)', fontVariantNumeric: 'tabular-nums', color: ROLE.ink, ...WORD }),
    // `empty` FIRST (D55): a square nothing has filled yet is an empty one. Every label is ink, which clears 4.5 on every ground here.
    withStates('mtKind', 'Empty, a number, a ten, tens, or a hundred and over', ['empty', 'unit', 'ten', 'tens', 'big'], {
      ground: { type: 'color', by: { empty: 'var(--muted)', unit: 'var(--surface)', ten: ROLE.picked, tens: ROLE.you, big: ROLE.other } },
      edge: { type: 'color', by: { empty: 'var(--border-subtle)', unit: ROLE.ink, ten: ROLE.ink, tens: ROLE.ink, big: ROLE.ink } }
    })
  ],
  connections: [
    wire('mtIn', 'word', 'mtWord', 'text'),
    wire('mtIn', 'kind', 'mtKind', 'currentState'),
    wire('mtKind', 'ground', 'mtCell', 'backgroundColor'),
    wire('mtKind', 'edge', 'mtCell', 'borderColor'),
    wire('mtIn', 'fx', 'mtCell', 'cssClassName')
  ]
};

/** One row of the board: TPL-005's nested repeaters, so the board lays out with the product's own nodes and no CSS grid. */
const MERGE_ROW: Tpl007Component = {
  path: 'Merge/Row',
  description: 'One row of the Make Ten board: a Merge/Tile per cell in Cells.',
  inputs: [port('cells', 'array')],
  outputs: [],
  instantiates: [C.mergeTile],
  nodes: [
    inputs('mwIn', 'The row', [['cells', 'array']]),
    group('mwRow', 'One row', undefined, { sizeMode: 'contentSize', flexDirection: 'row', alignItems: 'center', columnGap: 'var(--space-2)' }, ['mwCells']),
    logic('mwCells', FOR_EACH_NODE, 'One square per cell', { template: C.mergeTile, templateType: 'explicit' })
  ],
  connections: [wire('mwIn', 'cells', 'mwCells', 'items')]
};

/** The game: the score, the board, and beside it the arrows or, once the board locks, its end. */
const MERGE_PLAY: Tpl007Component = {
  path: 'Merge/Play',
  description: 'Make Ten Merge itself. A new board on mount and on New game. The arrow keys or the four arrow buttons slide it, through Logic/Slide and merge placed once per direction, and two tiles join only when they make a multiple of ten. The whole game is one Variable (mergeGame, global by name: one board per page). When the board locks, Logic/Finish merge pays it once and Race/Result takes the arrows\' place. Publishes Model and Graded (store the model), Home, Hangar and Cheer.',
  inputs: [port('level', 'string'), port('lang', 'string'), port('model', 'object'), port('ruleWord', 'string'), port('newGameWord', 'string'), port('homeWord', 'string'), port('pickWord', 'string'), port('hangarWord', 'string'), port('mergeMode', 'string', 'easy or hard, from the player'), port('modeWord', 'string'), port('easyWord', 'string'), port('hardWord', 'string'), port('fullWord', 'string')],
  outputs: [port('model', 'object'), port('graded', 'signal'), port('home', 'signal'), port('hangar', 'signal'), port('cheer', 'signal'), port('mergeMode', 'string'), port('modeChanged', 'signal')],
  instantiates: [C.choiceRow, C.mergeRow, C.raceResult, logicName('Logic/New merge board'), logicName('Logic/Slide and merge'), logicName('Logic/Draw merge board'), logicName('Logic/Finish merge')],
  nodes: [
    inputs('mpIn', 'The player, and the words', [['level', 'string'], ['lang', 'string'], ['model', 'object'], ['ruleWord', 'string'], ['newGameWord', 'string'], ['homeWord', 'string'], ['pickWord', 'string'], ['hangarWord', 'string'], ['mergeMode', 'string'], ['modeWord', 'string'], ['easyWord', 'string'], ['hardWord', 'string'], ['fullWord', 'string']]),
    group('mpRoot', 'The game', undefined, column({ alignItems: 'center', rowGap: 'var(--space-3)' }), ['mpMode', 'mpScore', 'mpStage']),
    // Richard, 2026-09-14: "it's bloody hard … can we make an easy and hard mode?" Easy is the default (MERGE_MODES).
    place('mpMode', C.choiceRow, 'Easy or Hard', 'mpRoot'),
    text('mpScore', 'The score', 'mpRoot', '', { ...T_BODY, fontWeight: 'var(--font-bold)', textAlignX: 'center' }),
    // The board and its side: side by side where there is room (a laptop, a tablet), one under the other on a phone.
    group('mpStage', 'The board, and what goes beside it', 'mpRoot', { width: pct(100), sizeMode: 'contentHeight', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start', columnGap: 'var(--space-6)', rowGap: 'var(--space-4)' }, ['mpBoard', 'mpSide']),
    group('mpBoard', 'The board', 'mpStage', { sizeMode: 'contentSize', flexDirection: 'column', rowGap: 'var(--space-2)', paddingTop: 'var(--space-3)', paddingBottom: 'var(--space-3)', paddingLeft: 'var(--space-3)', paddingRight: 'var(--space-3)', backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-xl)', borderStyle: 'solid', borderWidth: 'var(--border-1)', borderColor: 'var(--foreground)', cssClassName: 'rkt-merge-board', ...INK_SHADOW }, ['mpRows']),
    logic('mpRows', FOR_EACH_NODE, 'One row per row of the board', { template: C.mergeRow, templateType: 'explicit' }),
    group('mpSide', 'The arrows, or the end of the board', 'mpStage', { width: px(300), maxWidth: pct(100), sizeMode: 'contentHeight', flexDirection: 'column', alignItems: 'center', rowGap: 'var(--space-4)' }, ['mpControls', 'mpResult']),
    group('mpControls', 'The rule, the arrows, and New game', 'mpSide', column({ alignItems: 'center', rowGap: 'var(--space-4)' }), ['mpRule', 'mpHintBox', 'mpPad', 'mpNew']),
    text('mpRule', 'How it works', 'mpControls', '', { ...T_BODY, textAlignX: 'center' }),
    // A full board with a join still there says so, in the rule's place, on sunshine (ink on it clears 11:1).
    group('mpHintBox', 'The board is full, but a join is still there', 'mpControls', { width: pct(100), sizeMode: 'contentHeight', alignItems: 'center', paddingTop: 'var(--space-2)', paddingBottom: 'var(--space-2)', paddingLeft: 'var(--space-3)', paddingRight: 'var(--space-3)', backgroundColor: ROLE.picked, borderRadius: 'var(--radius-md)', borderStyle: 'solid', borderWidth: 'var(--border-1)', borderColor: 'var(--foreground)', mounted: false }, ['mpHint']),
    text('mpHint', 'Full, and what to do', 'mpHintBox', '', { ...T_BODY, fontWeight: 'var(--font-bold)', textAlignX: 'center' }),
    group('mpPad', 'The arrows', 'mpControls', { sizeMode: 'contentSize', flexDirection: 'column', alignItems: 'center', rowGap: 'var(--space-2)' }, ['mpPadTop', 'mpPadLow']),
    group('mpPadTop', 'Up', 'mpPad', { sizeMode: 'contentSize', flexDirection: 'row' }, ['mpBtnUp']),
    group('mpPadLow', 'Left, down and right', 'mpPad', { sizeMode: 'contentSize', flexDirection: 'row', columnGap: 'var(--space-2)' }, ['mpBtnLeft', 'mpBtnDown', 'mpBtnRight']),
    ...MERGE_DIRS.map((d) => place(`mpBtn${d.id}`, BUTTON_NODE, d.label, d.id === 'Up' ? 'mpPadTop' : 'mpPadLow', { ...BTN_OUTLINE, label: d.glyph, fontSize: 'var(--text-2xl)', minWidth: px(64), paddingTop: 'var(--space-3)', paddingBottom: 'var(--space-3)' })),
    place('mpNew', BUTTON_NODE, 'New game', 'mpControls', { ...BTN_OUTLINE, label: 'New game', fontSize: 'var(--text-sm)' }),
    place('mpResult', C.raceResult, 'How the board ended', 'mpSide'),
    logic('mpNewBoard', logicName('Logic/New merge board'), 'A fresh board'),
    ...MERGE_DIRS.map((d) => logic(`mpSlide${d.id}`, logicName('Logic/Slide and merge'), d.label, { dir: d.dir })),
    // 🔴 Allow Auto-Repeat off: a held arrow is one slide, not a board emptied in a second.
    ...MERGE_DIRS.map((d) => logic(`mpKey${d.id}`, KEYBOARD_SHORTCUT_NODE, `The ${d.dir} arrow`, { shortcut: d.dir, allowRepeat: false, preventDefault: true, ignoreInTextFields: true })),
    logic('mpGame', VARIABLE_NODE, 'The game as it stands', { name: 'mergeGame' }),
    logic('mpSetGame', SET_VARIABLE_NODE, 'The game after a move', { name: 'mergeGame' }),
    logic('mpDraw', logicName('Logic/Draw merge board'), 'The board, drawn'),
    // `playing` FIRST (D55): the arrows show before the first board is drawn.
    withStates('mpPhase', 'Playing, or no more moves', ['playing', 'over'], {
      playing: { type: 'boolean', by: { playing: true, over: false } },
      over: { type: 'boolean', by: { playing: false, over: true } },
      // The lock is a moment: the board greys out as the end card pops in.
      boardOpacity: { type: 'number', by: { playing: 1, over: 0.45 } }
    }),
    // `roomy` FIRST (D55): the rule shows until a board is full.
    withStates('mpFull', 'Room left, or full with a join still there', ['roomy', 'full'], {
      rule: { type: 'boolean', by: { roomy: true, full: false } },
      hint: { type: 'boolean', by: { roomy: false, full: true } }
    }),
    logic('mpModeItems', FUNCTION_NODE, 'Easy or Hard, in words', { functionScript: "Outputs.items = [{ label: Inputs.easy, value: 'easy' }, { label: Inputs.hard, value: 'hard' }];" }),
    watch('mpIsOver', 'No more moves?'),
    logic('mpFinish', logicName('Logic/Finish merge'), 'Pay the board, once'),
    logic('mpEndInView', FUNCTION_NODE, 'Bring New game on screen', { functionScript: BRING_BUTTON_INTO_VIEW_SCRIPT, ...signalOnly('in-word') }),
    outputs('mpOut', 'What the board did', [['model', 'object'], ['graded', 'signal'], ['home', 'signal'], ['hangar', 'signal'], ['cheer', 'signal'], ['mergeMode', 'string'], ['modeChanged', 'signal']])
  ],
  connections: [
    // A new board: on mount, on New game, and on the end screen's New game.
    wire('mpIn', 'level', 'mpNewBoard', 'level'),
    wire('mpIn', 'model', 'mpNewBoard', 'model'),
    wire('mpRoot', 'didMount', 'mpNewBoard', 'run'),
    wire('mpNew', 'onClick', 'mpNewBoard', 'run'),
    wire('mpResult', 'again', 'mpNewBoard', 'run'),
    wire('mpNewBoard', 'game', 'mpSetGame', 'value'),
    wire('mpNewBoard', 'done', 'mpSetGame', 'do'),
    // Easy or Hard: the player's mode is the chosen pill. A tap starts a new board in that mode (the board left pays nothing), and the
    // page keeps the choice on the player.
    wire('mpIn', 'modeWord', 'mpMode', 'label'),
    wire('mpIn', 'easyWord', 'mpModeItems', 'in-easy'),
    wire('mpIn', 'hardWord', 'mpModeItems', 'in-hard'),
    wire('mpModeItems', 'out-items', 'mpMode', 'items'),
    wire('mpIn', 'mergeMode', 'mpMode', 'value'),
    wire('mpIn', 'mergeMode', 'mpNewBoard', 'mode'),
    wire('mpMode', 'value', 'mpNewBoard', 'mode'),
    wire('mpMode', 'changed', 'mpNewBoard', 'run'),
    wire('mpMode', 'value', 'mpOut', 'mergeMode'),
    wire('mpMode', 'changed', 'mpOut', 'modeChanged'),
    // A slide: its key or its button runs the rule for its direction on the game as it stands, and the game after it is written.
    ...MERGE_DIRS.flatMap((d) => [
      wire('mpGame', 'value', `mpSlide${d.id}`, 'game'),
      wire(`mpKey${d.id}`, 'pressed', `mpSlide${d.id}`, 'run'),
      wire(`mpBtn${d.id}`, 'onClick', `mpSlide${d.id}`, 'run'),
      wire(`mpSlide${d.id}`, 'game', 'mpSetGame', 'value'),
      wire(`mpSlide${d.id}`, 'done', 'mpSetGame', 'do'),
      wire('mpPhase', 'playing', `mpKey${d.id}`, 'enabled')
    ]),
    // The squares, the score and the phase, drawn from the game.
    wire('mpGame', 'value', 'mpDraw', 'game'),
    wire('mpIn', 'lang', 'mpDraw', 'lang'),
    wire('mpDraw', 'rows', 'mpRows', 'items'),
    wire('mpDraw', 'scoreLine', 'mpScore', 'text'),
    wire('mpDraw', 'phase', 'mpPhase', 'currentState'),
    wire('mpPhase', 'playing', 'mpControls', 'mounted'),
    wire('mpPhase', 'over', 'mpResult', 'mounted'),
    wire('mpPhase', 'boardOpacity', 'mpBoard', 'opacity'),
    // Richard: a full board "doesn't say anything". Full with a join still there, the rule gives way to the hint.
    wire('mpDraw', 'fullness', 'mpFull', 'currentState'),
    wire('mpFull', 'rule', 'mpRule', 'mounted'),
    wire('mpFull', 'hint', 'mpHintBox', 'mounted'),
    wire('mpIn', 'fullWord', 'mpHint', 'text'),
    wire('mpIn', 'ruleWord', 'mpRule', 'text'),
    wire('mpIn', 'newGameWord', 'mpNew', 'label'),
    // 🔴 A board is paid only when it locks, and once (the script keeps its id). New game abandons a board and pays nothing.
    wire('mpDraw', 'over', 'mpIsOver', 'condition'),
    wire('mpIsOver', 'ontrue', 'mpFinish', 'run'),
    wire('mpGame', 'value', 'mpFinish', 'game'),
    wire('mpIn', 'model', 'mpFinish', 'model'),
    wire('mpIn', 'lang', 'mpFinish', 'lang'),
    wire('mpFinish', 'model', 'mpOut', 'model'),
    wire('mpFinish', 'done', 'mpOut', 'graded'),
    wire('mpFinish', 'done', 'mpOut', 'cheer'),
    wire('mpIn', 'newGameWord', 'mpEndInView', 'in-word'),
    wire('mpFinish', 'done', 'mpEndInView', 'run'),
    // The end of a board is Race/Result: the take and why, New game (focused, so Enter plays on), Home, and the hangar when a pick was earned.
    wire('mpFinish', 'won', 'mpResult', 'won'),
    wire('mpFinish', 'headline', 'mpResult', 'headline'),
    wire('mpFinish', 'line', 'mpResult', 'line'),
    wire('mpFinish', 'starsText', 'mpResult', 'stars'),
    wire('mpFinish', 'why', 'mpResult', 'why'),
    wire('mpFinish', 'earnedPick', 'mpResult', 'hasPick'),
    wire('mpIn', 'newGameWord', 'mpResult', 'againWord'),
    wire('mpIn', 'homeWord', 'mpResult', 'otherWord'),
    wire('mpIn', 'pickWord', 'mpResult', 'pickWord'),
    wire('mpIn', 'hangarWord', 'mpResult', 'hangarWord'),
    wire('mpResult', 'other', 'mpOut', 'home'),
    wire('mpResult', 'hangar', 'mpOut', 'hangar')
  ]
};

/** TPL-007 §12.1 — Make Ten Merge's page: the bar, the title, and the game. */
const PAGE_MERGE: Tpl007Component = {
  path: 'Pages/Merge',
  description: 'Make Ten Merge (TPL-007 §2.2 B): Richard\'s 2048, where two tiles join only when they make 10, 20, 30… The game is Merge/Play. The page gives it the player and the words, saves the model a finished board pays into, and plays the fanfare.',
  instantiates: [C.header, C.mergePlay, C.store, C.sounds, logicName('Logic/Active profile'), logicName('Logic/Translate words'), logicName('Logic/Save model'), C.words],
  nodes: [
    { id: 'mgPage', type: 'Page', label: 'Merge', parameters: { title: 'Make Ten Merge', urlPath: 'merge' }, children: ['mgOuter'] },
    group('mgOuter', 'The ground', 'mgPage', column({ alignItems: 'center' }), ['mgWrap']),
    group('mgWrap', 'The screen', 'mgOuter', column({ alignItems: 'stretch', rowGap: 'var(--space-4)', paddingTop: 'var(--space-4)', paddingBottom: 'var(--space-8)', paddingLeft: 'var(--space-4)', paddingRight: 'var(--space-4)', maxWidth: px(960) }), ['mgHeader', 'mgTitle', 'mgPlay']),
    place('mgHeader', C.header, 'The bar', 'mgWrap', { showHome: true, showHangar: true }),
    text('mgTitle', 'Make Ten Merge', 'mgWrap', '', T_SECTION),
    place('mgPlay', C.mergePlay, 'The game', 'mgWrap'),
    ...pageCommon('mg').nodes,
    logic('mgSave', logicName('Logic/Save model'), 'Remember the stars'),
    logic('mgNoOne', EXPRESSION_NODE, 'Nobody signed in?', { expression: 'has === false' }),
    gate('mgGuard', 'Send them to the profiles?'),
    logic('mgGoProfiles', NAVIGATE_NODE, 'To the profiles', { router: ROUTER, target: C.pageProfiles }),
    logic('mgGoHome', NAVIGATE_NODE, 'Home', { router: ROUTER, target: C.pageHome }),
    logic('mgGoHangar', NAVIGATE_NODE, 'To the hangar', { router: ROUTER, target: C.pageHangar }),
    logic('mgSounds', C.sounds, 'The fanfare'),
    logic('mgMode', logicName('Logic/Update settings'), 'Keep Easy or Hard on the player')
  ],
  connections: [
    ...pageCommon('mg').connections,
    wire('mgMe', 'hasProfile', 'mgNoOne', 'has'),
    wire('mgNoOne', 'result', 'mgGuard', 'condition'),
    wire('mgPage', 'didMount', 'mgGuard', 'eval'),
    wire('mgGuard', 'ontrue', 'mgGoProfiles', 'navigate'),
    // The bar, what its menu writes (RKT-008), and its way to the hangar.
    ...headerWires('mg'),
    wire('mgHeader', 'home', 'mgGoHome', 'navigate'),
    wire('mgT', 'gameMerge', 'mgTitle', 'text'),
    // The game gets the player and the words.
    wire('mgMe', 'level', 'mgPlay', 'level'),
    wire('mgMe', 'lang', 'mgPlay', 'lang'),
    wire('mgMe', 'model', 'mgPlay', 'model'),
    wire('mgT', 'mergeRule', 'mgPlay', 'ruleWord'),
    wire('mgT', 'newGame', 'mgPlay', 'newGameWord'),
    wire('mgT', 'home', 'mgPlay', 'homeWord'),
    wire('mgT', 'earnedPick', 'mgPlay', 'pickWord'),
    wire('mgT', 'toHangar', 'mgPlay', 'hangarWord'),
    wire('mgMe', 'mergeMode', 'mgPlay', 'mergeMode'),
    wire('mgT', 'mergeModeLabel', 'mgPlay', 'modeWord'),
    wire('mgT', 'mergeEasy', 'mgPlay', 'easyWord'),
    wire('mgT', 'mergeHard', 'mgPlay', 'hardWord'),
    wire('mgT', 'mergeFull', 'mgPlay', 'fullWord'),
    // Easy or Hard is kept on the player.
    wire('mgStore', 'app', 'mgMode', 'app'),
    wire('mgMe', 'profileId', 'mgMode', 'profileId'),
    wire('mgPlay', 'mergeMode', 'mgMode', 'mergeMode'),
    wire('mgPlay', 'modeChanged', 'mgMode', 'run'),
    wire('mgMode', 'app', 'mgStore', 'app'),
    wire('mgMode', 'done', 'mgStore', 'write'),
    // A finished board: its model into the store.
    wire('mgStore', 'app', 'mgSave', 'app'),
    wire('mgMe', 'profileId', 'mgSave', 'profileId'),
    wire('mgPlay', 'model', 'mgSave', 'model'),
    wire('mgPlay', 'graded', 'mgSave', 'run'),
    wire('mgSave', 'app', 'mgStore', 'app'),
    wire('mgSave', 'done', 'mgStore', 'write'),
    wire('mgPlay', 'home', 'mgGoHome', 'navigate'),
    wire('mgPlay', 'hangar', 'mgGoHangar', 'navigate'),
    wire('mgMe', 'sound', 'mgSounds', 'enabled'),
    wire('mgPlay', 'cheer', 'mgSounds', 'win')
  ]
};

// ── Number Hunt (TPL-007 §2.2 C, §12.2) ────────────────────────────────────

/** One number of the hunt's grid. Row fields from Logic/Draw hunt. */
const HUNT_TILE: Tpl007Component = {
  path: 'Hunt/Tile',
  description: 'One number in the Number Hunt grid, as a button a tap, a click or Enter presses. Kind colours it for where it stands: idle, picked (sunshine), found (teal), shown (a teal edge), or a wrong pick (a berry edge). Fx is its class, so a way just found pops and a wrong pick shakes. Publishes Tapped with At, its square.',
  inputs: [port('word', 'string'), port('kind', 'string'), port('fx', 'string'), port('at', 'number')],
  outputs: [port('tapped', 'signal'), port('at', 'number')],
  // 🔴 `hn`, not `ht`: Hangar/Tile already uses `htIn`, `htKind` and `htOut`, and the door renames a clashing id (`htIn-2`), so a gate
  // naming the id this file wrote finds no wire (build 1).
  nodes: [
    inputs('hnIn', 'The number', [['word', 'string'], ['kind', 'string'], ['fx', 'string'], ['at', 'number']]),
    group('hnCell', 'The square', undefined, { sizeMode: 'contentSize', alignItems: 'center', justifyContent: 'center' }, ['hnBtn']),
    place('hnBtn', BUTTON_NODE, 'The number', 'hnCell', { ...BTN_OUTLINE, label: '', sizeMode: 'explicit', width: px(72), height: px(72), paddingLeft: 'var(--space-1)', paddingRight: 'var(--space-1)', paddingTop: 'var(--space-1)', paddingBottom: 'var(--space-1)', fontSize: 'var(--text-2xl)', cssClassName: 'rkt-hunt-tile' }),
    // `idle` FIRST (D55): a square nothing has touched is an idle one. Every label is ink, which clears 4.5 on every ground here.
    withStates('hnKind', 'Idle, picked, found, shown, or a wrong pick', ['idle', 'picked', 'found', 'shown', 'wrong'], {
      ground: { type: 'color', by: { idle: 'var(--surface)', picked: ROLE.picked, found: ROLE.other, shown: 'var(--muted)', wrong: 'var(--surface)' } },
      edge: { type: 'color', by: { idle: ROLE.ink, picked: ROLE.ink, found: ROLE.ink, shown: ROLE.other, wrong: ROLE.costly } }
    }),
    outputs('hnOut', 'Tapped', [['tapped', 'signal'], ['at', 'number']])
  ],
  connections: [
    wire('hnIn', 'word', 'hnBtn', 'label'),
    wire('hnIn', 'kind', 'hnKind', 'currentState'),
    wire('hnKind', 'ground', 'hnBtn', 'backgroundColor'),
    wire('hnKind', 'edge', 'hnBtn', 'borderColor'),
    wire('hnIn', 'fx', 'hnBtn', 'cssClassName'),
    wire('hnIn', 'at', 'hnOut', 'at'),
    wire('hnBtn', 'onClick', 'hnOut', 'tapped')
  ]
};

/** One row of the grid: Make Ten's nested repeaters, and the tap passed up with its square. */
const HUNT_ROW: Tpl007Component = {
  path: 'Hunt/Row',
  description: 'One row of the Number Hunt grid: a Hunt/Tile per cell in Cells. Publishes Tapped with At, the square of the number that was tapped.',
  inputs: [port('cells', 'array')],
  outputs: [port('tapped', 'signal'), port('at', 'number')],
  instantiates: [C.huntTile],
  nodes: [
    inputs('hwIn', 'The row', [['cells', 'array']]),
    group('hwRow', 'One row', undefined, { sizeMode: 'contentSize', flexDirection: 'row', alignItems: 'center', columnGap: 'var(--space-2)' }, ['hwCells']),
    logic('hwCells', FOR_EACH_NODE, 'One number per cell', { template: C.huntTile, templateType: 'explicit' }),
    outputs('hwOut', 'A number was tapped', [['tapped', 'signal'], ['at', 'number']])
  ],
  connections: [
    wire('hwIn', 'cells', 'hwCells', 'items'),
    // The repeater publishes the row's value BEFORE its signal (measured, TPL-006), so At is in place when Tapped fires.
    wire('hwCells', 'itemOutput-at', 'hwOut', 'at'),
    wire('hwCells', 'itemOutputSignal-tapped', 'hwOut', 'tapped')
  ]
};

/** The game: what to find, the grid, and beside it the note and the next thing to do or, once the last grid is cleared, the end. */
const HUNT_PLAY: Tpl007Component = {
  path: 'Hunt/Play',
  description: 'Number Hunt itself (§2.2 C). A new hunt on mount and on New game: five grids of sixteen numbers, each with a target and one to three ways to make it, and the child is told how many. A tap on a number runs Logic/Hunt move (tap), and a full pick is checked at once: a right one stays teal, a wrong one shakes and says its sum. After two misses on a grid, Show me one reveals a way (it pays nothing). When every way is found, Next grid (focused) brings the next. Untimed. The whole hunt is one Variable (huntGame, global by name: one hunt per page). When the last grid is cleared, Logic/Finish hunt pays it once and Race/Result takes the buttons\' place. Publishes Model and Graded (store the model), Home, Hangar and Cheer.',
  inputs: [port('level', 'string'), port('lang', 'string'), port('model', 'object'), port('newGameWord', 'string'), port('homeWord', 'string'), port('pickWord', 'string'), port('hangarWord', 'string'), port('nextGridWord', 'string'), port('showWayWord', 'string')],
  outputs: [port('model', 'object'), port('graded', 'signal'), port('home', 'signal'), port('hangar', 'signal'), port('cheer', 'signal')],
  instantiates: [C.huntRow, C.raceResult, logicName('Logic/New hunt'), logicName('Logic/Hunt move'), logicName('Logic/Draw hunt'), logicName('Logic/Finish hunt')],
  nodes: [
    inputs('hpIn', 'The player, and the words', [['level', 'string'], ['lang', 'string'], ['model', 'object'], ['newGameWord', 'string'], ['homeWord', 'string'], ['pickWord', 'string'], ['hangarWord', 'string'], ['nextGridWord', 'string'], ['showWayWord', 'string']]),
    group('hpRoot', 'The game', undefined, column({ alignItems: 'center', rowGap: 'var(--space-3)' }), ['hpTask', 'hpProgress', 'hpStage']),
    text('hpTask', 'What to find', 'hpRoot', '', { ...T_CARD, fontSize: 'var(--text-2xl)', textAlignX: 'center' }),
    text('hpProgress', 'Which grid, and how many ways found', 'hpRoot', '', { ...T_META, fontWeight: 'var(--font-semibold)', textAlignX: 'center' }),
    // The grid and its side: side by side where there is room (a laptop, a tablet), one under the other on a phone.
    group('hpStage', 'The grid, and what goes beside it', 'hpRoot', { width: pct(100), sizeMode: 'contentHeight', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start', columnGap: 'var(--space-6)', rowGap: 'var(--space-4)' }, ['hpBoard', 'hpSide']),
    group('hpBoard', 'The grid', 'hpStage', { sizeMode: 'contentSize', flexDirection: 'column', rowGap: 'var(--space-2)', paddingTop: 'var(--space-3)', paddingBottom: 'var(--space-3)', paddingLeft: 'var(--space-3)', paddingRight: 'var(--space-3)', backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-xl)', borderStyle: 'solid', borderWidth: 'var(--border-1)', borderColor: 'var(--foreground)', cssClassName: 'rkt-hunt-board', ...INK_SHADOW }, ['hpRows']),
    logic('hpRows', FOR_EACH_NODE, 'One row per row of the grid', { template: C.huntRow, templateType: 'explicit' }),
    group('hpSide', 'The note and the buttons, or the end of the hunt', 'hpStage', { width: px(300), maxWidth: pct(100), sizeMode: 'contentHeight', flexDirection: 'column', alignItems: 'center', rowGap: 'var(--space-4)' }, ['hpControls', 'hpResult']),
    group('hpControls', 'The note, and what to do next', 'hpSide', column({ alignItems: 'center', rowGap: 'var(--space-4)' }), ['hpNoteBox', 'hpNextRow', 'hpShow', 'hpNew']),
    group('hpNoteBox', 'What the last pick made', 'hpControls', { width: pct(100), sizeMode: 'contentHeight', alignItems: 'center', paddingTop: 'var(--space-2)', paddingBottom: 'var(--space-2)', paddingLeft: 'var(--space-3)', paddingRight: 'var(--space-3)', backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-md)', borderStyle: 'solid', borderWidth: px(2), borderColor: 'var(--border-subtle)' }, ['hpNote']),
    text('hpNote', 'The note', 'hpNoteBox', '', { ...T_BODY, fontWeight: 'var(--font-bold)', textAlignX: 'center' }),
    group('hpNextRow', 'Every way on this grid found', 'hpControls', { sizeMode: 'contentSize', mounted: false }, ['hpNext']),
    place('hpNext', BUTTON_NODE, 'Next grid', 'hpNextRow', { ...BTN_PRIMARY, label: 'Next grid' }),
    place('hpShow', BUTTON_NODE, 'Show me one', 'hpControls', { ...BTN_OUTLINE, label: 'Show me one', mounted: false }),
    place('hpNew', BUTTON_NODE, 'New game', 'hpControls', { ...BTN_OUTLINE, label: 'New game', fontSize: 'var(--text-sm)' }),
    place('hpResult', C.raceResult, 'How the hunt ended', 'hpSide'),
    logic('hpNewHunt', logicName('Logic/New hunt'), 'A fresh hunt'),
    // The one move rule, placed once per action with the action as a parameter: a wire carrying an action is whatever published last.
    logic('hpTap', logicName('Logic/Hunt move'), 'A number tapped', { action: 'tap' }),
    logic('hpShowWay', logicName('Logic/Hunt move'), 'Show one way', { action: 'show' }),
    logic('hpNextGrid', logicName('Logic/Hunt move'), 'The next grid', { action: 'next' }),
    logic('hpGame', VARIABLE_NODE, 'The hunt as it stands', { name: 'huntGame' }),
    logic('hpSetGame', SET_VARIABLE_NODE, 'The hunt after a move', { name: 'huntGame' }),
    logic('hpDraw', logicName('Logic/Draw hunt'), 'The hunt, drawn'),
    // `playing` FIRST (D55): the note and New game show before the first grid is drawn.
    withStates('hpPhase', 'Playing, every way on the grid found, or the hunt over', ['playing', 'found', 'over'], {
      going: { type: 'boolean', by: { playing: true, found: true, over: false } },
      found: { type: 'boolean', by: { playing: false, found: true, over: false } },
      over: { type: 'boolean', by: { playing: false, found: false, over: true } }
    }),
    // `quiet` FIRST (D55). The note is always ink; only its ground and edge say what kind of news it is.
    withStates('hpTone', 'Quiet, right, wrong, or a way shown', ['quiet', 'right', 'wrong', 'shown'], {
      ground: { type: 'color', by: { quiet: 'var(--surface)', right: ROLE.picked, wrong: 'var(--surface)', shown: 'var(--muted)' } },
      edge: { type: 'color', by: { quiet: 'var(--border-subtle)', right: ROLE.ink, wrong: ROLE.costly, shown: ROLE.other } }
    }),
    watch('hpIsOver', 'Every grid cleared?'),
    logic('hpFinish', logicName('Logic/Finish hunt'), 'Pay the hunt, once'),
    logic('hpEndInView', FUNCTION_NODE, 'Bring New game on screen', { functionScript: BRING_BUTTON_INTO_VIEW_SCRIPT, ...signalOnly('in-word') }),
    outputs('hpOut', 'What the hunt did', [['model', 'object'], ['graded', 'signal'], ['home', 'signal'], ['hangar', 'signal'], ['cheer', 'signal']])
  ],
  connections: [
    // A new hunt: on mount, on New game, and on the end screen's New game.
    wire('hpIn', 'level', 'hpNewHunt', 'level'),
    wire('hpRoot', 'didMount', 'hpNewHunt', 'run'),
    wire('hpNew', 'onClick', 'hpNewHunt', 'run'),
    wire('hpResult', 'again', 'hpNewHunt', 'run'),
    wire('hpNewHunt', 'game', 'hpSetGame', 'value'),
    wire('hpNewHunt', 'done', 'hpSetGame', 'do'),
    // A move: a tap on a number, Show me one, or Next grid runs the rule for its action on the hunt as it stands, and the hunt after it
    // is written.
    ...['hpTap', 'hpShowWay', 'hpNextGrid'].flatMap((id) => [wire('hpGame', 'value', id, 'game'), wire(id, 'game', 'hpSetGame', 'value'), wire(id, 'done', 'hpSetGame', 'do')]),
    wire('hpRows', 'itemOutput-at', 'hpTap', 'index'),
    wire('hpRows', 'itemOutputSignal-tapped', 'hpTap', 'run'),
    wire('hpShow', 'onClick', 'hpShowWay', 'run'),
    wire('hpNext', 'onClick', 'hpNextGrid', 'run'),
    // The numbers, the words and the phase, drawn from the hunt.
    wire('hpGame', 'value', 'hpDraw', 'game'),
    wire('hpIn', 'lang', 'hpDraw', 'lang'),
    wire('hpDraw', 'rows', 'hpRows', 'items'),
    wire('hpDraw', 'instruction', 'hpTask', 'text'),
    wire('hpDraw', 'progress', 'hpProgress', 'text'),
    wire('hpDraw', 'note', 'hpNote', 'text'),
    wire('hpDraw', 'noteKind', 'hpTone', 'currentState'),
    wire('hpTone', 'ground', 'hpNoteBox', 'backgroundColor'),
    wire('hpTone', 'edge', 'hpNoteBox', 'borderColor'),
    wire('hpDraw', 'phase', 'hpPhase', 'currentState'),
    wire('hpPhase', 'going', 'hpControls', 'mounted'),
    wire('hpPhase', 'found', 'hpNextRow', 'mounted'),
    wire('hpPhase', 'over', 'hpResult', 'mounted'),
    wire('hpDraw', 'canShow', 'hpShow', 'mounted'),
    wire('hpIn', 'nextGridWord', 'hpNext', 'label'),
    wire('hpIn', 'showWayWord', 'hpShow', 'label'),
    wire('hpIn', 'newGameWord', 'hpNew', 'label'),
    // Every way found: Next grid takes the keyboard, so Enter plays on.
    // P88 GAM-010: Next grid focuses itself as its row appears.
    wire('hpNext', 'didMount', 'hpNext', 'focus'),
    // 🔴 A hunt is paid only when its last grid is cleared, and once (the script keeps its id). New game abandons a hunt and pays nothing.
    wire('hpDraw', 'over', 'hpIsOver', 'condition'),
    wire('hpIsOver', 'ontrue', 'hpFinish', 'run'),
    wire('hpGame', 'value', 'hpFinish', 'game'),
    wire('hpIn', 'model', 'hpFinish', 'model'),
    wire('hpIn', 'lang', 'hpFinish', 'lang'),
    wire('hpFinish', 'model', 'hpOut', 'model'),
    wire('hpFinish', 'done', 'hpOut', 'graded'),
    wire('hpFinish', 'done', 'hpOut', 'cheer'),
    // Make Ten's phone finding, kept: the end card grows after it is focused, so its row of ways on is brought on screen.
    wire('hpIn', 'newGameWord', 'hpEndInView', 'in-word'),
    wire('hpFinish', 'done', 'hpEndInView', 'run'),
    // The end of a hunt is Race/Result: the take and why, New game (focused, so Enter plays on), Home, and the hangar when a pick was earned.
    wire('hpFinish', 'won', 'hpResult', 'won'),
    wire('hpFinish', 'headline', 'hpResult', 'headline'),
    wire('hpFinish', 'line', 'hpResult', 'line'),
    wire('hpFinish', 'starsText', 'hpResult', 'stars'),
    wire('hpFinish', 'why', 'hpResult', 'why'),
    wire('hpFinish', 'earnedPick', 'hpResult', 'hasPick'),
    wire('hpIn', 'newGameWord', 'hpResult', 'againWord'),
    wire('hpIn', 'homeWord', 'hpResult', 'otherWord'),
    wire('hpIn', 'pickWord', 'hpResult', 'pickWord'),
    wire('hpIn', 'hangarWord', 'hpResult', 'hangarWord'),
    wire('hpResult', 'other', 'hpOut', 'home'),
    wire('hpResult', 'hangar', 'hpOut', 'hangar')
  ]
};

/** TPL-007 §12.2 — Number Hunt's page: the bar, the title, and the game. */
const PAGE_HUNT: Tpl007Component = {
  path: 'Pages/Hunt',
  description: 'Number Hunt (TPL-007 §2.2 C): five grids of numbers, each with a target and a known number of ways to make it, untimed. The game is Hunt/Play. The page gives it the player and the words, saves the model a finished hunt pays into, and plays the fanfare.',
  instantiates: [C.header, C.huntPlay, C.store, C.sounds, logicName('Logic/Active profile'), logicName('Logic/Translate words'), logicName('Logic/Save model'), C.words],
  nodes: [
    { id: 'nhPage', type: 'Page', label: 'Hunt', parameters: { title: 'Number Hunt', urlPath: 'hunt' }, children: ['nhOuter'] },
    group('nhOuter', 'The ground', 'nhPage', column({ alignItems: 'center' }), ['nhWrap']),
    group('nhWrap', 'The screen', 'nhOuter', column({ alignItems: 'stretch', rowGap: 'var(--space-4)', paddingTop: 'var(--space-4)', paddingBottom: 'var(--space-8)', paddingLeft: 'var(--space-4)', paddingRight: 'var(--space-4)', maxWidth: px(960) }), ['nhHeader', 'nhTitle', 'nhPlay']),
    place('nhHeader', C.header, 'The bar', 'nhWrap', { showHome: true, showHangar: true }),
    text('nhTitle', 'Number Hunt', 'nhWrap', '', T_SECTION),
    place('nhPlay', C.huntPlay, 'The game', 'nhWrap'),
    ...pageCommon('nh').nodes,
    logic('nhSave', logicName('Logic/Save model'), 'Remember the stars'),
    logic('nhNoOne', EXPRESSION_NODE, 'Nobody signed in?', { expression: 'has === false' }),
    gate('nhGuard', 'Send them to the profiles?'),
    logic('nhGoProfiles', NAVIGATE_NODE, 'To the profiles', { router: ROUTER, target: C.pageProfiles }),
    logic('nhGoHome', NAVIGATE_NODE, 'Home', { router: ROUTER, target: C.pageHome }),
    logic('nhGoHangar', NAVIGATE_NODE, 'To the hangar', { router: ROUTER, target: C.pageHangar }),
    logic('nhSounds', C.sounds, 'The fanfare')
  ],
  connections: [
    ...pageCommon('nh').connections,
    wire('nhMe', 'hasProfile', 'nhNoOne', 'has'),
    wire('nhNoOne', 'result', 'nhGuard', 'condition'),
    wire('nhPage', 'didMount', 'nhGuard', 'eval'),
    wire('nhGuard', 'ontrue', 'nhGoProfiles', 'navigate'),
    // The bar, what its menu writes (RKT-008), and its way to the hangar.
    ...headerWires('nh'),
    wire('nhHeader', 'home', 'nhGoHome', 'navigate'),
    wire('nhT', 'gameHunt', 'nhTitle', 'text'),
    // The game gets the player and the words.
    wire('nhMe', 'level', 'nhPlay', 'level'),
    wire('nhMe', 'lang', 'nhPlay', 'lang'),
    wire('nhMe', 'model', 'nhPlay', 'model'),
    wire('nhT', 'newGame', 'nhPlay', 'newGameWord'),
    wire('nhT', 'home', 'nhPlay', 'homeWord'),
    wire('nhT', 'earnedPick', 'nhPlay', 'pickWord'),
    wire('nhT', 'toHangar', 'nhPlay', 'hangarWord'),
    wire('nhT', 'huntNextGrid', 'nhPlay', 'nextGridWord'),
    wire('nhT', 'huntShowWay', 'nhPlay', 'showWayWord'),
    // A finished hunt: its model into the store.
    wire('nhStore', 'app', 'nhSave', 'app'),
    wire('nhMe', 'profileId', 'nhSave', 'profileId'),
    wire('nhPlay', 'model', 'nhSave', 'model'),
    wire('nhPlay', 'graded', 'nhSave', 'run'),
    wire('nhSave', 'app', 'nhStore', 'app'),
    wire('nhSave', 'done', 'nhStore', 'write'),
    wire('nhPlay', 'home', 'nhGoHome', 'navigate'),
    wire('nhPlay', 'hangar', 'nhGoHangar', 'navigate'),
    wire('nhMe', 'sound', 'nhSounds', 'enabled'),
    wire('nhPlay', 'cheer', 'nhSounds', 'win')
  ]
};

// ── Monster Gate (TPL-007 §2.2 D, §16) ─────────────────────────────────────

/** One monster. What it looks like and what it is doing are the class Logic/Draw monster writes; the stylesheet draws it (MONSTER_PIXELS). */
const MONSTER: Tpl007Component = {
  path: 'Game/Monster',
  description: 'One Monster Gate monster, drawn by the stylesheet: Monster Class names its look (rkt-monster-horns, -eye or -spikes, a shape and a colour each, pixel art in one box-shadow) and what it is doing (a hit, a lunge closer, running away, arriving). 65 px square.',
  inputs: [port('monsterClass', 'string')],
  nodes: [
    inputs('zmIn', 'Which monster, doing what', [['monsterClass', 'string']]),
    group('zmBody', 'The monster', undefined, { sizeMode: 'explicit', width: px(65), height: px(65), cssClassName: 'rkt-monster rkt-monster-horns' })
  ],
  connections: [wire('zmIn', 'monsterClass', 'zmBody', 'cssClassName')]
};

/**
 * Where the monster stands, as the mover's width (a percentage of the lane between the gate and the far side). While Walking in a
 * Challenge question of the gate way (Walk From > 0), it is Walk From × Left: the round's own clock bar, 100 full to 0 empty, so the
 * monster reaches the gate exactly when the question times out. Otherwise it is Rest, and the mover glides there.
 */
const MONSTER_WALK_SCRIPT = `var from = Number(Inputs.walkFrom) || 0;
var left = Number(Inputs.left);
var walking = Inputs.walking === true && from > 0 && left >= 0 && left <= 100;
var at = walking ? from * left / 100 : Number(Inputs.rest);
if (!(at >= 0)) at = 1;
Outputs.width = Math.round(Math.min(1, at) * 1000) / 10;
Outputs.moverClass = walking ? 'rkt-mover' : 'rkt-mover rkt-mover-glide';`;

const MONSTER_LANE: Tpl007Component = {
  path: 'Monster/Lane',
  description: 'Monster Gate\'s lane: the hearts, which monster of three and its hits left, over the lane; the Lane Class draws the gate (left), the ground and, in Push it back, the cave (right). The monster stands at Rest (0 the gate, 1 the far side), gliding there between answers, or, while Walking, walks from Walk From to the gate as the round\'s clock (Left, 100 to 0) empties. The note under the lane says what just happened.',
  inputs: [port('hearts', 'string'), port('line', 'string'), port('note', 'string'), port('pips', 'string'), port('monsterClass', 'string'), port('laneClass', 'string'), port('rest', 'number'), port('walkFrom', 'number'), port('walking', 'boolean'), port('left', 'number')],
  instantiates: [C.monster],
  nodes: [
    inputs('zlIn', 'The game, drawn', [['hearts', 'string'], ['line', 'string'], ['note', 'string'], ['pips', 'string'], ['monsterClass', 'string'], ['laneClass', 'string'], ['rest', 'number'], ['walkFrom', 'number'], ['walking', 'boolean'], ['left', 'number']]),
    group('zlCard', 'The lane, and what is said over and under it', undefined, column({ alignItems: 'stretch', rowGap: 'var(--space-2)', maxWidth: px(640) }), ['zlTop', 'zlLane', 'zlNote']),
    group('zlTop', 'The hearts, which monster, and its hits left', 'zlCard', row({ width: pct(100), sizeMode: 'contentHeight', justifyContent: 'space-between' }), ['zlHearts', 'zlLine', 'zlPips']),
    text('zlHearts', 'The hearts', 'zlTop', '❤️ ❤️ ❤️', { fontSize: 'var(--text-xl)', lineHeight: 'var(--leading-tight)', ...WORD }),
    text('zlLine', 'Which monster of three', 'zlTop', '', { ...T_META, fontWeight: 'var(--font-bold)', color: ROLE.ink, ...WORD }),
    text('zlPips', 'The hits it has left', 'zlTop', '', { ...T_BODY, fontWeight: 'var(--font-bold)', color: ROLE.costly, lineHeight: 'var(--leading-tight)', ...WORD }),
    // The gate is drawn in the lane's left padding (APP_CSS `.rkt-lane::before`), and at Rest 0 the monster stands just right of it.
    // 🔴 A COLUMN, not a row (build 1, the door's `wired-dimension-becomes-grow`): a wired percentage width on a row's own axis is
    // flex-grow, so the mover would never have moved. Across a column, the percentage is a width; the mover sits along the bottom.
    group('zlLane', 'The lane: the gate, the ground, and the cave', 'zlCard', { width: pct(100), height: px(150), sizeMode: 'explicit', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'flex-start', backgroundColor: 'var(--muted)', borderRadius: 'var(--radius-xl)', borderStyle: 'solid', borderWidth: 'var(--border-1)', borderColor: 'var(--foreground)', clip: true, paddingLeft: px(150), paddingRight: 'var(--space-4)', paddingBottom: 'var(--space-6)', cssClassName: 'rkt-lane rkt-lane-gate' }, ['zlMover']),
    // The mover's width is where the monster stands, and the monster sits at its right end (overhanging it at 0).
    group('zlMover', 'Where the monster stands', 'zlLane', { width: pct(100), height: px(65), sizeMode: 'explicit', flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-end', cssClassName: 'rkt-mover rkt-mover-glide' }, ['zlMonster']),
    place('zlMonster', C.monster, 'The monster', 'zlMover'),
    text('zlNote', 'What just happened', 'zlCard', '', { ...T_BODY, fontWeight: 'var(--font-bold)', color: ROLE.ink, textAlignX: 'center' }),
    logic('zlWalk', FUNCTION_NODE, 'Where the monster stands now: walking off the clock, or resting', { functionScript: MONSTER_WALK_SCRIPT }),
    logic('zlHasPips', EXPRESSION_NODE, 'Hits to count?', { expression: "((p || '') + '').length > 0" })
  ],
  connections: [
    wire('zlIn', 'hearts', 'zlHearts', 'text'),
    wire('zlIn', 'line', 'zlLine', 'text'),
    wire('zlIn', 'pips', 'zlPips', 'text'),
    wire('zlIn', 'pips', 'zlHasPips', 'p'),
    wire('zlHasPips', 'result', 'zlPips', 'mounted'),
    wire('zlIn', 'note', 'zlNote', 'text'),
    wire('zlIn', 'laneClass', 'zlLane', 'cssClassName'),
    wire('zlIn', 'monsterClass', 'zlMonster', 'monsterClass'),
    wire('zlIn', 'walking', 'zlWalk', 'in-walking'),
    wire('zlIn', 'walkFrom', 'zlWalk', 'in-walkFrom'),
    wire('zlIn', 'left', 'zlWalk', 'in-left'),
    wire('zlIn', 'rest', 'zlWalk', 'in-rest'),
    // The width is a percentage: a bare number keeps the port's unit (Game/Feedback banner's meter).
    wire('zlWalk', 'out-width', 'zlMover', 'width'),
    wire('zlWalk', 'out-moverClass', 'zlMover', 'cssClassName')
  ]
};

const MONSTER_SETUP: Tpl007Component = {
  path: 'Monster/Setup',
  description: 'Before a Monster Gate game: the way to play (Beat it to the gate, or Push it back) and the pace (Practice or Challenge), the chosen pair\'s rule in one line, and Start. Opens on Beat it to the gate and Practice (§16 ruling 3), written once, so coming back keeps the child\'s choices. Publishes Start with Style and Timed.',
  inputs: [port('mounted', 'boolean'), port('gateWord', 'string'), port('pushWord', 'string'), port('practiceWord', 'string'), port('challengeWord', 'string'), port('startWord', 'string'), port('gatePracticeWord', 'string'), port('gateChallengeWord', 'string'), port('pushPracticeWord', 'string'), port('pushChallengeWord', 'string')],
  outputs: [port('start', 'signal'), port('style', 'string'), port('timed', 'boolean')],
  instantiates: [C.choiceRow],
  nodes: [
    inputs('zsIn', 'The words', [['mounted', 'boolean'], ['gateWord', 'string'], ['pushWord', 'string'], ['practiceWord', 'string'], ['challengeWord', 'string'], ['startWord', 'string'], ['gatePracticeWord', 'string'], ['gateChallengeWord', 'string'], ['pushPracticeWord', 'string'], ['pushChallengeWord', 'string']]),
    group('zsCard', 'The setup', undefined, { ...CARD, rowGap: 'var(--space-5)', paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-6)', paddingLeft: 'var(--space-6)', paddingRight: 'var(--space-6)', maxWidth: px(560) }, ['zsStyle', 'zsTimed', 'zsRule', 'zsStart']),
    place('zsStyle', C.choiceRow, 'The way to play', 'zsCard'),
    place('zsTimed', C.choiceRow, 'Practice or challenge', 'zsCard'),
    text('zsRule', 'What the chosen way and pace do', 'zsCard', '', T_META),
    place('zsStart', BUTTON_NODE, 'Start', 'zsCard', { ...BTN_PRIMARY, label: 'Start', fontSize: 'var(--text-lg)' }),
    logic('zsStyleItems', FUNCTION_NODE, 'The two ways, in words', { functionScript: "Outputs.items = [{ label: Inputs.gate, value: 'gate' }, { label: Inputs.push, value: 'push' }];" }),
    logic('zsTimedItems', FUNCTION_NODE, 'Practice or challenge, in words', { functionScript: "Outputs.items = [{ label: Inputs.practice, value: 'practice' }, { label: Inputs.challenge, value: 'challenge' }];" }),
    logic('zsStyleVar', VARIABLE_NODE, 'The way to play', { name: 'monsterStyle' }),
    logic('zsSetStyle', SET_VARIABLE_NODE, 'Choose a way', { name: 'monsterStyle' }),
    logic('zsTimedVar', VARIABLE_NODE, 'Practice or challenge?', { name: 'monsterTimed' }),
    logic('zsSetTimed', SET_VARIABLE_NODE, 'Choose the pace', { name: 'monsterTimed' }),
    logic('zsIsTimed', EXPRESSION_NODE, 'Challenge?', { expression: "timed === 'challenge'" }),
    logic('zsRuleText', EXPRESSION_NODE, 'The chosen pair’s rule, in words', { expression: "style === 'push' ? (timed === 'challenge' ? pushChallenge : pushPractice) : (timed === 'challenge' ? gateChallenge : gatePractice)" }),
    logic('zsShown', EXPRESSION_NODE, 'Shown unless told not to', { expression: 'm !== false' }),
    // Ruling 3: the setup opens on Practice. The defaults are written once (RKT-006: a remount wrote them over the child's choices).
    logic('zsDefStyle', EXPRESSION_NODE, 'gate', { expression: "'gate'" }),
    logic('zsDefTimed', EXPRESSION_NODE, 'practice', { expression: "'practice'" }),
    logic('zsInitStyle', SET_VARIABLE_NODE, 'Start on Beat it to the gate', { name: 'monsterStyle' }),
    logic('zsInitTimed', SET_VARIABLE_NODE, 'Start on Practice', { name: 'monsterTimed' }),
    withStates('zsSeeded', 'Defaults written yet?', ['fresh', 'seeded'], { seeded: { type: 'boolean', by: { fresh: false, seeded: true } } }),
    gate('zsFirst', 'The first time the setup shows?'),
    outputs('zsOut', 'Go', [['start', 'signal'], ['style', 'string'], ['timed', 'boolean']])
  ],
  connections: [
    wire('zsIn', 'mounted', 'zsShown', 'm'),
    wire('zsShown', 'result', 'zsCard', 'mounted'),
    wire('zsDefStyle', 'result', 'zsInitStyle', 'value'),
    wire('zsSeeded', 'seeded', 'zsFirst', 'condition'),
    wire('zsCard', 'didMount', 'zsFirst', 'eval'),
    wire('zsFirst', 'onfalse', 'zsInitStyle', 'do'),
    wire('zsDefTimed', 'result', 'zsInitTimed', 'value'),
    wire('zsInitStyle', 'done', 'zsInitTimed', 'do'),
    wire('zsInitTimed', 'done', 'zsSeeded', 'to-seeded'),
    wire('zsIn', 'gateWord', 'zsStyleItems', 'in-gate'),
    wire('zsIn', 'pushWord', 'zsStyleItems', 'in-push'),
    wire('zsIn', 'practiceWord', 'zsTimedItems', 'in-practice'),
    wire('zsIn', 'challengeWord', 'zsTimedItems', 'in-challenge'),
    wire('zsStyleItems', 'out-items', 'zsStyle', 'items'),
    wire('zsTimedItems', 'out-items', 'zsTimed', 'items'),
    wire('zsStyleVar', 'value', 'zsStyle', 'value'),
    wire('zsStyle', 'value', 'zsSetStyle', 'value'),
    wire('zsStyle', 'changed', 'zsSetStyle', 'do'),
    wire('zsTimedVar', 'value', 'zsTimed', 'value'),
    wire('zsTimed', 'value', 'zsSetTimed', 'value'),
    wire('zsTimed', 'changed', 'zsSetTimed', 'do'),
    wire('zsStyleVar', 'value', 'zsRuleText', 'style'),
    wire('zsTimedVar', 'value', 'zsRuleText', 'timed'),
    wire('zsIn', 'gatePracticeWord', 'zsRuleText', 'gatePractice'),
    wire('zsIn', 'gateChallengeWord', 'zsRuleText', 'gateChallenge'),
    wire('zsIn', 'pushPracticeWord', 'zsRuleText', 'pushPractice'),
    wire('zsIn', 'pushChallengeWord', 'zsRuleText', 'pushChallenge'),
    wire('zsRuleText', 'result', 'zsRule', 'text'),
    wire('zsIn', 'startWord', 'zsStart', 'label'),
    wire('zsTimedVar', 'value', 'zsIsTimed', 'timed'),
    wire('zsIsTimed', 'result', 'zsOut', 'timed'),
    wire('zsStyleVar', 'value', 'zsOut', 'style'),
    wire('zsStart', 'onClick', 'zsOut', 'start')
  ]
};

const MONSTER_PLAY_INPUTS: Array<[string, string]> = [
  ['start', 'signal'], ['style', 'string'], ['timed', 'boolean'], ['level', 'string'], ['lang', 'string'], ['layout', 'string'], ['answerMode', 'string'], ['model', 'object'], ['curriculum', 'array'], ['wordLists', 'array'], ['soundOn', 'boolean'], ['mounted', 'boolean'],
  ['placeholder', 'string'], ['checkWord', 'string'], ['fluentWord', 'string'], ['correctWord', 'string'], ['wrongWord', 'string'], ['timeUpWord', 'string'], ['nextWord', 'string'], ['showMeWord', 'string'],
  ['teachCards', 'array'], ['anExampleWord', 'string'], ['gotItWord', 'string'], ['restartWord', 'string'], ['changeWord', 'string'], ['againWord', 'string'], ['pickWord', 'string'], ['hangarWord', 'string']
];
const MONSTER_PLAY_OUTPUTS: Array<[string, string]> = [['model', 'object'], ['graded', 'signal'], ['changeGame', 'signal'], ['hangar', 'signal'], ['cheer', 'signal'], ['sigh', 'signal']];

/** The game: the lane over the race's question, one move per graded answer, and the end card after Next once it is over. */
const MONSTER_PLAY: Tpl007Component = {
  path: 'Monster/Play',
  description: 'Monster Gate itself (§2.2 D, ruled in §16): three monsters come at the gate one at a time, and three hearts keep it. The questions are the race\'s: Race/Round asks, grades (the answers pay stars and move the learner model as a race\'s do, under the game\'s id) and shows the verdict, and Logic/Monster move (answer) turns each graded answer into a hit, a creep closer, a push, a step, a heart gone or a monster beaten; Next runs Logic/Monster move (next) and asks again. In Beat it to the gate with Challenge, the monster walks off the round\'s own clock. Show me how opens the Teach card in the round\'s place. When the game is over, Logic/Finish monster pays it once and Next brings Race/Result. Restart starts a new game; Change the game hands back to setup. The whole game is one Variable (monsterGame, global by name: one game per page). Publishes Model and Graded (store the model), ChangeGame, Hangar, Cheer and Sigh.',
  inputs: MONSTER_PLAY_INPUTS.map(([n, t]) => port(n, t)),
  outputs: MONSTER_PLAY_OUTPUTS.map(([n, t]) => port(n, t)),
  instantiates: [C.monsterLane, C.raceRound, C.teachCard, C.raceResult, logicName('Logic/New monster game'), logicName('Logic/Monster move'), logicName('Logic/Draw monster'), logicName('Logic/Finish monster'), logicName('Logic/Teach card')],
  nodes: [
    inputs('zpIn', 'The game, the player and the words', MONSTER_PLAY_INPUTS),
    group('zpWrap', 'The game', undefined, column({ alignItems: 'center', rowGap: 'var(--space-3)' }), ['zpControls', 'zpLane', 'zpRoundSlot', 'zpTeach', 'zpResult']),
    // RKT-006's controls, above the lane and away from the answer and Next.
    group('zpControls', 'Restart, or change the game', 'zpWrap', row({ width: pct(100), sizeMode: 'contentHeight', justifyContent: 'flex-end', columnGap: 'var(--space-2)' }), ['zpRestart', 'zpChange']),
    place('zpRestart', BUTTON_NODE, 'Restart', 'zpControls', { ...BTN_OUTLINE, label: 'Restart', fontSize: 'var(--text-sm)' }),
    place('zpChange', BUTTON_NODE, 'Change the game', 'zpControls', { ...BTN_OUTLINE, label: 'Change the game', fontSize: 'var(--text-sm)' }),
    place('zpLane', C.monsterLane, 'The lane', 'zpWrap'),
    // The round, the Teach card and the end card take turns in one slot under the lane, as they do under the race's track.
    group('zpRoundSlot', 'While playing', 'zpWrap', column({ alignItems: 'center' }), ['zpRound']),
    place('zpRound', C.raceRound, 'This question', 'zpRoundSlot', { mode: 'maths' }),
    place('zpTeach', C.teachCard, 'Show me how', 'zpWrap'),
    place('zpResult', C.raceResult, 'How it ended', 'zpWrap'),
    logic('zpNew', logicName('Logic/New monster game'), 'A new game'),
    // The one move rule, placed once per action with the action as a parameter: a wire carrying an action is whatever published last.
    logic('zpAnswer', logicName('Logic/Monster move'), 'An answer, graded', { action: 'answer' }),
    logic('zpArrive', logicName('Logic/Monster move'), 'The next monster', { action: 'next' }),
    logic('zpGame', VARIABLE_NODE, 'The game as it stands', { name: 'monsterGame' }),
    logic('zpSetGame', SET_VARIABLE_NODE, 'The game after a move', { name: 'monsterGame' }),
    logic('zpDraw', logicName('Logic/Draw monster'), 'The game, drawn'),
    // `playing` FIRST (D55): the round's slot shows before the first question is asked.
    withStates('zpPhase', 'Playing, the end card, or a Teach card', ['playing', 'over', 'teaching'], {
      playing: { type: 'boolean', by: { playing: true, over: false, teaching: false } },
      over: { type: 'boolean', by: { playing: false, over: true, teaching: false } },
      teaching: { type: 'boolean', by: { playing: false, over: false, teaching: true } },
      controls: { type: 'boolean', by: { playing: true, over: false, teaching: true } }
    }),
    watch('zpIsOver', 'Game over?'),
    logic('zpFinish', logicName('Logic/Finish monster'), 'Pay the game, once'),
    gate('zpGoOn', 'Another question, or the end card?'),
    gate('zpCheer', 'The gate held, or it got in?'),
    logic('zpTeachPick', logicName('Logic/Teach card'), 'The card for the skill just missed'),
    logic('zpStep', EXPRESSION_NODE, 'Which step: less each miss in a row', { expression: 'min(2, max(0, misses - 1))' }),
    // The walk starts once the question is up and its clock has refilled (the bar jumps full, then glides a frame later), and stops the
    // moment the answer is graded, so between answers the monster glides to where it rests.
    logic('zpWalking', VARIABLE_NODE, 'Walking?', { name: 'monsterWalking' }),
    logic('zpWalkOn', SET_VARIABLE_NODE, 'It walks', { name: 'monsterWalking' }),
    logic('zpWalkOff', SET_VARIABLE_NODE, 'It stops', { name: 'monsterWalking' }),
    logic('zpWalkDelay', TIMER_NODE, 'Once the clock has refilled', { duration: 150 }),
    logic('zpTrue', EXPRESSION_NODE, 'True', { expression: 'true' }),
    logic('zpFalse', EXPRESSION_NODE, 'False', { expression: 'false' }),
    logic('zpShown', EXPRESSION_NODE, 'Only while playing', { expression: 'm === true' }),
    outputs('zpOut', 'How it went', MONSTER_PLAY_OUTPUTS)
  ],
  connections: [
    wire('zpIn', 'mounted', 'zpShown', 'm'),
    wire('zpShown', 'result', 'zpWrap', 'mounted'),
    wire('zpTrue', 'result', 'zpWalkOn', 'value'),
    wire('zpFalse', 'result', 'zpWalkOff', 'value'),
    wire('zpWrap', 'didMount', 'zpWalkOff', 'do'),
    // A new game: Start, Restart, and the end card's New game. Its id and clock scale are values the round holds before the ask.
    wire('zpIn', 'start', 'zpPhase', 'to-playing'),
    wire('zpIn', 'start', 'zpNew', 'run'),
    wire('zpRestart', 'onClick', 'zpPhase', 'to-playing'),
    wire('zpRestart', 'onClick', 'zpNew', 'run'),
    wire('zpRestart', 'onClick', 'zpWalkOff', 'do'),
    wire('zpRestart', 'onClick', 'zpWalkDelay', 'stop'),
    wire('zpResult', 'again', 'zpPhase', 'to-playing'),
    wire('zpResult', 'again', 'zpNew', 'run'),
    wire('zpIn', 'style', 'zpNew', 'style'),
    wire('zpIn', 'timed', 'zpNew', 'timed'),
    wire('zpNew', 'game', 'zpSetGame', 'value'),
    wire('zpNew', 'done', 'zpSetGame', 'do'),
    wire('zpNew', 'id', 'zpRound', 'raceId'),
    wire('zpNew', 'timeScale', 'zpRound', 'limitScale'),
    wire('zpNew', 'done', 'zpRound', 'ask'),
    wire('zpNew', 'done', 'zpWalkDelay', 'restart'),
    // The round gets the player and the words, and is told which game it grades for.
    ...(['level', 'lang', 'layout', 'answerMode', 'model', 'curriculum', 'wordLists', 'timed', 'soundOn', 'placeholder', 'checkWord', 'fluentWord', 'correctWord', 'wrongWord', 'timeUpWord', 'nextWord', 'showMeWord'] as const).map((p) => wire('zpIn', p, 'zpRound', p)),
    wire('zpIn', 'style', 'zpRound', 'game'),
    // A graded answer: the walk stops, and the move turns the verdict into the game after it.
    wire('zpRound', 'graded', 'zpWalkDelay', 'stop'),
    wire('zpRound', 'graded', 'zpWalkOff', 'do'),
    wire('zpGame', 'value', 'zpAnswer', 'game'),
    wire('zpRound', 'outcome', 'zpAnswer', 'outcome'),
    wire('zpRound', 'gain', 'zpAnswer', 'gain'),
    wire('zpRound', 'cpuGain', 'zpAnswer', 'cpuGain'),
    wire('zpRound', 'graded', 'zpAnswer', 'run'),
    wire('zpAnswer', 'game', 'zpSetGame', 'value'),
    wire('zpAnswer', 'done', 'zpSetGame', 'do'),
    wire('zpAnswer', 'timeScale', 'zpRound', 'limitScale'),
    wire('zpRound', 'model', 'zpOut', 'model'),
    wire('zpRound', 'graded', 'zpOut', 'graded'),
    // Next: the next monster arrives (when one was beaten), then another question, or, once the game is over, the end card.
    wire('zpGame', 'value', 'zpArrive', 'game'),
    wire('zpRound', 'next', 'zpArrive', 'run'),
    wire('zpArrive', 'game', 'zpSetGame', 'value'),
    wire('zpArrive', 'done', 'zpSetGame', 'do'),
    wire('zpDraw', 'over', 'zpGoOn', 'condition'),
    wire('zpRound', 'next', 'zpGoOn', 'eval'),
    wire('zpGoOn', 'onfalse', 'zpRound', 'ask'),
    wire('zpGoOn', 'onfalse', 'zpWalkDelay', 'restart'),
    wire('zpGoOn', 'ontrue', 'zpPhase', 'to-over'),
    wire('zpWalkDelay', 'timerFinished', 'zpWalkOn', 'do'),
    // The lane, drawn from the game, and walked off the round's clock.
    wire('zpGame', 'value', 'zpDraw', 'game'),
    wire('zpIn', 'lang', 'zpDraw', 'lang'),
    ...(['hearts', 'line', 'note', 'pips', 'monsterClass', 'laneClass', 'rest', 'walkFrom'] as const).map((p) => wire('zpDraw', p, 'zpLane', p)),
    wire('zpWalking', 'value', 'zpLane', 'walking'),
    wire('zpRound', 'clockLeft', 'zpLane', 'left'),
    // The slot under the lane, and the controls.
    wire('zpPhase', 'playing', 'zpRoundSlot', 'mounted'),
    wire('zpPhase', 'over', 'zpResult', 'mounted'),
    wire('zpPhase', 'teaching', 'zpTeach', 'mounted'),
    wire('zpPhase', 'controls', 'zpControls', 'mounted'),
    wire('zpIn', 'restartWord', 'zpRestart', 'label'),
    wire('zpIn', 'changeWord', 'zpChange', 'label'),
    wire('zpChange', 'onClick', 'zpRound', 'abandon'),
    wire('zpChange', 'onClick', 'zpWalkOff', 'do'),
    wire('zpChange', 'onClick', 'zpWalkDelay', 'stop'),
    wire('zpChange', 'onClick', 'zpOut', 'changeGame'),
    // RKT-004: Show me how puts the card in the round's place; Got it asks through the gate Next uses, so an ended game still ends.
    wire('zpRound', 'showMe', 'zpPhase', 'to-teaching'),
    wire('zpTeach', 'gotIt', 'zpPhase', 'to-playing'),
    wire('zpTeach', 'gotIt', 'zpGoOn', 'eval'),
    wire('zpIn', 'teachCards', 'zpTeachPick', 'cards'),
    wire('zpIn', 'lang', 'zpTeachPick', 'lang'),
    wire('zpRound', 'teach', 'zpTeachPick', 'teachId'),
    wire('zpRound', 'missCount', 'zpStep', 'misses'),
    wire('zpStep', 'result', 'zpTeachPick', 'step'),
    wire('zpTeachPick', 'title', 'zpTeach', 'title'),
    wire('zpTeachPick', 'text', 'zpTeach', 'text'),
    wire('zpTeachPick', 'example', 'zpTeach', 'example'),
    wire('zpRound', 'prompt', 'zpTeach', 'prompt'),
    wire('zpRound', 'worked', 'zpTeach', 'worked'),
    wire('zpIn', 'anExampleWord', 'zpTeach', 'anExampleWord'),
    wire('zpIn', 'gotItWord', 'zpTeach', 'gotItWord'),
    // 🔴 A game is paid only when it is over, and once (the script keeps its id), from the round's model: the store's may not have the last answer yet.
    wire('zpDraw', 'over', 'zpIsOver', 'condition'),
    wire('zpIsOver', 'ontrue', 'zpFinish', 'run'),
    wire('zpGame', 'value', 'zpFinish', 'game'),
    wire('zpRound', 'model', 'zpFinish', 'model'),
    wire('zpIn', 'lang', 'zpFinish', 'lang'),
    wire('zpFinish', 'model', 'zpOut', 'model'),
    wire('zpFinish', 'done', 'zpOut', 'graded'),
    wire('zpFinish', 'won', 'zpCheer', 'condition'),
    wire('zpFinish', 'done', 'zpCheer', 'eval'),
    wire('zpCheer', 'ontrue', 'zpOut', 'cheer'),
    wire('zpCheer', 'onfalse', 'zpOut', 'sigh'),
    // The end card is Race/Result: the take and why, New game (focused), the hangar when a pick was earned, and Change the game.
    wire('zpFinish', 'won', 'zpResult', 'won'),
    wire('zpFinish', 'headline', 'zpResult', 'headline'),
    wire('zpFinish', 'line', 'zpResult', 'line'),
    wire('zpFinish', 'starsText', 'zpResult', 'stars'),
    wire('zpFinish', 'why', 'zpResult', 'why'),
    wire('zpFinish', 'earnedPick', 'zpResult', 'hasPick'),
    wire('zpIn', 'againWord', 'zpResult', 'againWord'),
    wire('zpIn', 'changeWord', 'zpResult', 'otherWord'),
    wire('zpIn', 'pickWord', 'zpResult', 'pickWord'),
    wire('zpIn', 'hangarWord', 'zpResult', 'hangarWord'),
    wire('zpResult', 'other', 'zpOut', 'changeGame'),
    wire('zpResult', 'hangar', 'zpOut', 'hangar')
  ]
};

/** TPL-007 §16 — Monster Gate's page: the bar, the title, the setup, and the game. */
const PAGE_MONSTER: Tpl007Component = {
  path: 'Pages/Monster',
  description: 'Monster Gate (TPL-007 §2.2 D, §16): the setup, then the game and its end card (both in Monster/Play), with the model saved after every answer and at the finish. While playing, the page\'s bar gives its row to the game\'s controls, as the race\'s does.',
  instantiates: [C.header, C.monsterSetup, C.monsterPlay, C.store, C.sounds, logicName('Logic/Active profile'), logicName('Logic/Translate words'), logicName('Logic/Save model'), C.words, C.curriculum, C.wordLists, C.teachCards],
  nodes: [
    { id: 'zgPage', type: 'Page', label: 'Monster', parameters: { title: 'Monster Gate', urlPath: 'monster' }, children: ['zgOuter'] },
    group('zgOuter', 'The ground', 'zgPage', column({ alignItems: 'center' }), ['zgWrap']),
    group('zgWrap', 'The screen', 'zgOuter', column({ alignItems: 'stretch', rowGap: 'var(--space-4)', paddingTop: 'var(--space-4)', paddingBottom: 'var(--space-6)', paddingLeft: 'var(--space-4)', paddingRight: 'var(--space-4)', maxWidth: px(960) }), ['zgHeader', 'zgTitle', 'zgSetup', 'zgPlay']),
    place('zgHeader', C.header, 'The bar', 'zgWrap', { showHome: true, showHangar: true }),
    text('zgTitle', 'Monster Gate', 'zgWrap', '', T_SECTION),
    place('zgSetup', C.monsterSetup, 'Before the game', 'zgWrap'),
    place('zgPlay', C.monsterPlay, 'The game', 'zgWrap'),
    ...pageCommon('zg').nodes,
    logic('zgSave', logicName('Logic/Save model'), 'Remember what was learned'),
    logic('zgNoOne', EXPRESSION_NODE, 'Nobody signed in?', { expression: 'has === false' }),
    gate('zgGuard', 'Send them to the profiles?'),
    logic('zgGoProfiles', NAVIGATE_NODE, 'To the profiles', { router: ROUTER, target: C.pageProfiles }),
    logic('zgGoHome', NAVIGATE_NODE, 'Home', { router: ROUTER, target: C.pageHome }),
    logic('zgGoHangar', NAVIGATE_NODE, 'To the hangar', { router: ROUTER, target: C.pageHangar }),
    logic('zgPlaying', VARIABLE_NODE, 'Playing?', { name: 'monsterPlaying' }),
    logic('zgSetPlaying', SET_VARIABLE_NODE, 'Playing now', { name: 'monsterPlaying' }),
    logic('zgSetDone', SET_VARIABLE_NODE, 'Not playing', { name: 'monsterPlaying' }),
    logic('zgInitDone', SET_VARIABLE_NODE, 'Not playing yet (on load)', { name: 'monsterPlaying' }),
    logic('zgTrue', EXPRESSION_NODE, 'True', { expression: 'true' }),
    logic('zgFalse', EXPRESSION_NODE, 'False', { expression: 'false' }),
    logic('zgNotPlaying', EXPRESSION_NODE, 'Setting up?', { expression: '!playing' }),
    logic('zgSounds', C.sounds, 'The fanfare'),
    logic('zgTeachCards', C.teachCards, 'The Teach cards')
  ],
  connections: [
    ...pageCommon('zg').connections,
    // Not playing until Start: the Variable is written on mount, not left undefined.
    wire('zgFalse', 'result', 'zgInitDone', 'value'),
    wire('zgPage', 'didMount', 'zgInitDone', 'do'),
    wire('zgMe', 'hasProfile', 'zgNoOne', 'has'),
    wire('zgNoOne', 'result', 'zgGuard', 'condition'),
    wire('zgPage', 'didMount', 'zgGuard', 'eval'),
    wire('zgGuard', 'ontrue', 'zgGoProfiles', 'navigate'),
    // The bar, what its menu writes (RKT-008), and its way to the hangar.
    ...headerWires('zg'),
    wire('zgHeader', 'home', 'zgGoHome', 'navigate'),
    wire('zgT', 'gameMonster', 'zgTitle', 'text'),
    // The setup's words.
    wire('zgT', 'monsterGate', 'zgSetup', 'gateWord'),
    wire('zgT', 'monsterPush', 'zgSetup', 'pushWord'),
    wire('zgT', 'practice', 'zgSetup', 'practiceWord'),
    wire('zgT', 'challenge', 'zgSetup', 'challengeWord'),
    wire('zgT', 'monsterGatePractice', 'zgSetup', 'gatePracticeWord'),
    wire('zgT', 'monsterGateChallenge', 'zgSetup', 'gateChallengeWord'),
    wire('zgT', 'monsterPushPractice', 'zgSetup', 'pushPracticeWord'),
    wire('zgT', 'monsterPushChallenge', 'zgSetup', 'pushChallengeWord'),
    wire('zgT', 'start', 'zgSetup', 'startWord'),
    wire('zgNotPlaying', 'result', 'zgSetup', 'mounted'),
    wire('zgNotPlaying', 'result', 'zgTitle', 'mounted'),
    // RKT-006's finding, kept: while playing, the page's bar gives its row to the game's own controls.
    wire('zgPlaying', 'value', 'zgHeader', 'hideBar'),
    wire('zgPlaying', 'value', 'zgNotPlaying', 'playing'),
    // Start: playing, then the game starts.
    wire('zgTrue', 'result', 'zgSetPlaying', 'value'),
    wire('zgSetup', 'start', 'zgSetPlaying', 'do'),
    wire('zgSetPlaying', 'done', 'zgPlay', 'start'),
    wire('zgPlaying', 'value', 'zgPlay', 'mounted'),
    wire('zgSetup', 'style', 'zgPlay', 'style'),
    wire('zgSetup', 'timed', 'zgPlay', 'timed'),
    // The game gets the player and the words.
    ...(['level', 'lang', 'layout', 'answerMode', 'model'] as const).map((field) => wire('zgMe', field, 'zgPlay', field)),
    wire('zgMe', 'sound', 'zgPlay', 'soundOn'),
    wire('zgCurriculum', 'skills', 'zgPlay', 'curriculum'),
    wire('zgWordLists', 'lists', 'zgPlay', 'wordLists'),
    wire('zgTeachCards', 'cards', 'zgPlay', 'teachCards'),
    wire('zgT', 'typeAnswer', 'zgPlay', 'placeholder'),
    wire('zgT', 'check', 'zgPlay', 'checkWord'),
    wire('zgT', 'fluent', 'zgPlay', 'fluentWord'),
    wire('zgT', 'correct', 'zgPlay', 'correctWord'),
    wire('zgT', 'wrong', 'zgPlay', 'wrongWord'),
    wire('zgT', 'timeUp', 'zgPlay', 'timeUpWord'),
    wire('zgT', 'next', 'zgPlay', 'nextWord'),
    wire('zgT', 'showMe', 'zgPlay', 'showMeWord'),
    wire('zgT', 'anExample', 'zgPlay', 'anExampleWord'),
    wire('zgT', 'gotIt', 'zgPlay', 'gotItWord'),
    wire('zgT', 'restart', 'zgPlay', 'restartWord'),
    wire('zgT', 'monsterChange', 'zgPlay', 'changeWord'),
    wire('zgT', 'newGame', 'zgPlay', 'againWord'),
    wire('zgT', 'earnedPick', 'zgPlay', 'pickWord'),
    wire('zgT', 'toHangar', 'zgPlay', 'hangarWord'),
    // Every graded answer, and the finish: the model into the store.
    wire('zgStore', 'app', 'zgSave', 'app'),
    wire('zgMe', 'profileId', 'zgSave', 'profileId'),
    wire('zgPlay', 'model', 'zgSave', 'model'),
    wire('zgPlay', 'graded', 'zgSave', 'run'),
    wire('zgSave', 'app', 'zgStore', 'app'),
    wire('zgSave', 'done', 'zgStore', 'write'),
    wire('zgPlay', 'hangar', 'zgGoHangar', 'navigate'),
    wire('zgFalse', 'result', 'zgSetDone', 'value'),
    wire('zgPlay', 'changeGame', 'zgSetDone', 'do'),
    wire('zgMe', 'sound', 'zgSounds', 'enabled'),
    wire('zgPlay', 'cheer', 'zgSounds', 'win'),
    wire('zgPlay', 'sigh', 'zgSounds', 'lose')
  ]
};

/** Every component, in the order the plan creates them — a component before anything that places it. */
export const TPL007_COMPONENTS: ReadonlyArray<Tpl007Component> = [
  ...DATA_COMPONENTS,
  ...LOGIC_COMPONENTS,
  APP_STORE,
  PLAY_SOUNDS,
  FACE,
  PROFILE_CARD,
  CHOICE,
  CHOICE_ROW,
  GAME_CARD,
  // RKT-008: the header places the form (Edit player), so the form comes first.
  NEW_PLAYER_FORM,
  HEADER,
  STAT,
  OPTION_BUTTON,
  QUESTION_BOX,
  COUNTDOWN,
  RACE_TRACK,
  FEEDBACK_BANNER,
  TEACH_CARD,
  KEYBOARD,
  NEXT_PICK,
  HANGAR_TILE,
  HANGAR_PREVIEW,
  HANGAR_SHELF_PART,
  RACE_SETUP,
  RACE_ROUND,
  RACE_RESULT,
  RACE_PLAY,
  MERGE_TILE,
  MERGE_ROW,
  MERGE_PLAY,
  HUNT_TILE,
  HUNT_ROW,
  HUNT_PLAY,
  MONSTER,
  MONSTER_LANE,
  MONSTER_SETUP,
  MONSTER_PLAY,
  PAGE_PROFILES,
  PAGE_HOME,
  PAGE_RACE,
  PAGE_HANGAR,
  PAGE_MERGE,
  PAGE_HUNT,
  PAGE_MONSTER
];

/** The library modules the door must find installed before authoring. */
export const REQUIRED_MODULES = ['game-kit', 'keyboard-shortcuts'] as const;

/** The pages, for the gate and the start page. */
export const PAGES = [C.pageProfiles, C.pageHome, C.pageRace, C.pageHangar, C.pageMerge, C.pageHunt, C.pageMonster] as const;
