/**
 * CG-003 — Bot Garden: the components, in the shape the plan door takes (TPL-007's shape, TPL-011's declaration).
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * ## The shape
 *
 * - `Data/*` — the requests, the hints, the words (the engine's and the pages', one table). One `Static Data` each.
 * - `Logic/*` — **generated**: one per entry of CG-002's `FUNCTION_SCRIPTS` and CG-005's `OLIVE_SCRIPTS` (so a script
 *   either adds arrives with no edit here), one per page-glue script of `cg003Scripts.ts`, and the store. Each is `Component Inputs` → one
 *   Function → `Component Outputs`. A signal-driven one takes `go` and answers `ran` (the engine's scripts already use
 *   `run` and `done` as DATA: the run object, the done flag).
 * - `Garden/*` — the bar, a tab, a segment button, a page head: what every screen shares.
 * - `Workshop/*` — the bench: the runner (the tick loop), the pad, the win card, and `Workshop/Play`, the section that
 *   holds the whole workshop so the page stays a handful of instances.
 * - `Island/*`, `Robot/*`, `Skills/*`, `Profiles/*`, `Grown/*` — each page's parts.
 * - `Pages/*` — Profiles, Island, Workshop, My robot, Skills, Grown-ups. Each a `Page`, the bar and instances.
 *
 * ## 🔴 The runtime rules every component obeys
 *
 * 1. A `States` node has `useTransitions: false` (D49) — {@link withStates} sets it.
 * 2. A Function fed by a value it produces is signal-driven (`go`), every value input unticked.
 * 3. Values before signals: a value a signal "carries" is published first (a Function's outputs before `ran`, a
 *    repeater's item output before its item signal).
 * 4. A `Variable` is global by NAME (D57): every Variable here is named `garden…`, and only one Workshop is ever on screen.
 * 5. No `Expression` (D54/D55): a constant is a parameter, a derived flag comes out of a script.
 * 6. A kit React node is never a component's root (D53).
 *
 * @module noodl-mcp/tests/cg003Components
 */
import { HINTS_JSON, REQUESTS_JSON } from './cg002Content';
import { FUNCTION_SCRIPTS, portsOf } from './cg002Scripts';
import { OLIVE_SCRIPTS } from './cg005Olive';
import { PAD_KEYS } from './cg003Content';
import { ALL_WORDS_JSON, GLUE_SCRIPTS, TRANSLATE_ALL_SCRIPT } from './cg003Scripts';
import { DISPLAY_FONT, GARDEN_CSS } from './cg007Look';

export const ROUTER = 'Main';
export const STORE_NAME = 'garden';
export const STORAGE_KEY = 'bot-garden';
/** The glide the kit animates (the mockup's .38s) and the tick the runner waits between steps (the mockup's 420 ms). */
export const STEP_MS = 380;
export const TICK_MS = 420;

export interface CgComponent {
  path: string;
  description: string;
  nodes: Array<Record<string, unknown>>;
  connections: unknown[];
  repeats?: { source: 'static' | 'query' | 'variable' | 'array'; rowFields: string[] };
}

// ── Node types ──────────────────────────────────────────────────────────────

const FUNCTION_NODE = 'JavaScriptFunction';
const STATES_NODE = 'States';
const STATIC_DATA_NODE = 'Static Data';
const FOR_EACH_NODE = 'For Each';
const VARIABLE_NODE = 'Variable2';
const SET_VARIABLE_NODE = 'Set Variable';
const CONDITION_NODE = 'Condition';
const COUNTER_NODE = 'Counter';
const NAVIGATE_NODE = 'RouterNavigate';
const TIMER_NODE = 'Timer';
const TEXT_INPUT_NODE = 'net.noodl.controls.textinput';
const BUTTON_NODE = 'net.noodl.controls.button';
const GLOBAL_STORE_NODE = 'net.noodl.GlobalStore';
const STORE_SET_NODE = 'net.noodl.GlobalStore.Set';
const STORE_SUBSCRIBE_NODE = 'net.noodl.GlobalStore.Subscribe';
const CSS_NODE = 'CSS Definition';
export const KIT_GARDEN = 'garden-kit.Garden';
export const KIT_BLOCKS = 'garden-kit.BlockList';
const KIT_AVATAR = 'game-kit.Avatar';
const KIT_KEEP = 'game-kit.KeepStorage';

// ── Names, spelled once ─────────────────────────────────────────────────────

export const C = {
  app: 'App',
  requests: '/Data/Requests',
  hints: '/Data/Hints',
  words: '/Data/Words',
  store: '/Logic/App store',
  tab: '/Garden/Tab',
  seg: '/Garden/Seg',
  bar: '/Garden/Top bar',
  head: '/Garden/Page head',
  padKey: '/Workshop/Pad key',
  pad: '/Workshop/Pad',
  runner: '/Workshop/Runner',
  win: '/Workshop/Win card',
  play: '/Workshop/Play',
  quest: '/Island/Request card',
  swatch: '/Robot/Swatch',
  chip: '/Robot/Chip',
  sticker: '/Robot/Sticker',
  options: '/Robot/Options',
  skill: '/Skills/Card',
  profile: '/Profiles/Card',
  form: '/Profiles/Form',
  guOlive: '/Grown/Olive panel',
  guRules: '/Grown/Rules panel',
  guHouse: '/Grown/House panel',
  pageProfiles: '/Pages/Profiles',
  pageIsland: '/Pages/Island',
  pageWorkshop: '/Pages/Workshop',
  pageRobot: '/Pages/My robot',
  pageSkills: '/Pages/Skills',
  pageGrown: '/Pages/Grown-ups'
} as const;

export const L = (name: string) => '/Logic/' + name;

// ── Helpers ─────────────────────────────────────────────────────────────────

const px = (value: number) => ({ value, unit: 'px' });
const pct = (value: number) => ({ value, unit: '%' });

type N = Record<string, unknown>;

function text(id: string, label: string, parent: string, value: string, params: N = {}): N {
  return { id, type: 'Text', label, parent, parameters: { text: value, sizeMode: 'contentHeight', ...params } };
}
function group(id: string, label: string, parent: string | undefined, params: N, children?: string[]): N {
  const node: N = { id, type: 'Group', label, parameters: params };
  if (parent) node.parent = parent;
  if (children) node.children = children;
  return node;
}
function place(id: string, type: string, label: string, parent: string, parameters?: N): N {
  const node: N = { id, type, label, parent };
  if (parameters) node.parameters = parameters;
  return node;
}
function logic(id: string, type: string, label: string, parameters?: N): N {
  const node: N = { id, type, label };
  if (parameters) node.parameters = parameters;
  return node;
}
function inputs(id: string, ports: Array<[string, string]>): N {
  return { id, type: 'Component Inputs', label: 'What the caller gives', ports: ports.map(([name, type]) => ({ name, type, plug: 'output' })) };
}
function outputs(id: string, ports: Array<[string, string]>): N {
  return { id, type: 'Component Outputs', label: 'What it answers', ports: ports.map(([name, type]) => ({ name, type, plug: 'input' })) };
}
function wire(fromId: string, fromProperty: string, toId: string, toProperty: string): unknown {
  return { fromId, fromProperty, toId, toProperty };
}
export function signalOnly(...inputNames: string[]): N {
  const out: N = {};
  for (const name of inputNames) out[`runOnChange-${name}`] = false;
  return out;
}
/** A Condition that tests only when told (`eval`). */
function gate(id: string, label: string): N {
  return logic(id, CONDITION_NODE, label, signalOnly('condition'));
}
/** A `States` node. 🔴 `useTransitions: false` always (D49). The first state is where it starts. */
function withStates(id: string, label: string, states: string[], values: Record<string, { type: string; by: Record<string, unknown> }>): N {
  const params: N = { states: states.join(','), values: Object.keys(values).join(','), useTransitions: false };
  for (const [value, spec] of Object.entries(values)) {
    params[`type-${value}`] = spec.type;
    for (const state of states) params[`value-${state}-${value}`] = spec.by[state];
  }
  return logic(id, STATES_NODE, label, params);
}
function variable(id: string, name: string, label: string): N {
  return logic(id, VARIABLE_NODE, label, { name });
}
function setVariable(id: string, name: string, label: string, extra: N = {}): N {
  return logic(id, SET_VARIABLE_NODE, label, { name, ...extra });
}
function navigate(id: string, target: string, label: string): N {
  return logic(id, NAVIGATE_NODE, label, { router: ROUTER, target });
}

const column = (params: N = {}): N => ({ width: pct(100), sizeMode: 'contentHeight', flexDirection: 'column', ...params });
const row = (params: N = {}): N => {
  const out: N = { sizeMode: 'contentSize', flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: sp(8), rowGap: sp(8), ...params };
  // A row that never wraps has no second line, so a row gap there is never read (inactive-conditional-parameter).
  if (out.flexWrap === 'nowrap') delete out.rowGap;
  return out;
};
/** The spacing scale's token for a px value (the door warns on a literal the scale spells), else the px itself. */
const SPACE: Readonly<Record<number, string>> = { 0: '0', 2: '0-5', 4: '1', 6: '1-5', 8: '2', 10: '2-5', 12: '3', 14: '3-5', 16: '4', 20: '5', 24: '6', 28: '7', 32: '8', 36: '9', 40: '10' };
const sp = (v: number): unknown => (SPACE[v] !== undefined ? `var(--space-${SPACE[v]})` : px(v));
const pad = (v: number, h = v): N => ({ paddingTop: sp(v), paddingBottom: sp(v), paddingLeft: sp(h), paddingRight: sp(h) });

// The type ramp, the mockup's sizes.
const DISPLAY = { fontFamily: DISPLAY_FONT };
const T_H1: N = { ...DISPLAY, as: 'h1', fontSize: px(34), fontWeight: '600', color: 'var(--ink)', lineHeight: 1.15 };
const T_H2: N = { ...DISPLAY, as: 'h2', fontSize: px(22), fontWeight: '600', color: 'var(--ink)', lineHeight: 1.2 };
const T_H3: N = { ...DISPLAY, as: 'h3', fontSize: px(18), fontWeight: '600', color: 'var(--ink)', lineHeight: 1.2 };
const T_EYEBROW: N = { fontSize: px(12), fontWeight: '800', color: 'var(--leaf)', cssClassName: 'bg-eyebrow' };
const T_BODY: N = { fontSize: px(16), color: 'var(--ink)' };
const T_MUTED: N = { fontSize: px(16), color: 'var(--ink-2)' };
const T_SMALL: N = { fontSize: px(14), color: 'var(--ink-2)' };
const T_STRONG: N = { fontSize: px(16), fontWeight: '800', color: 'var(--ink)' };

/** A card: the mockup's .panel. */
const PANEL: N = { backgroundColor: 'var(--card)', borderRadius: 'var(--radius-card)', cssClassName: 'bg-panel', ...pad(14) };

/**
 * The mockup's four buttons (AC2): a pill with a FILL and no border. `kind` picks the fill; `icon` a mask class.
 * Every one is a Button node with the fill as a parameter, so no default outline can survive.
 */
type BtnKind = 'primary' | 'teach' | 'ask' | 'plain' | 'quiet' | 'fold';
const FILL: Record<BtnKind, [string, string]> = {
  primary: ['var(--leaf)', 'var(--on-fill)'],
  teach: ['var(--coral)', 'var(--on-fill)'],
  ask: ['var(--violet)', 'var(--on-fill)'],
  plain: ['var(--paper-2)', 'var(--ink)'],
  quiet: ['transparent', 'var(--ink-2)'],
  fold: ['var(--block-control)', 'var(--on-fill)']
};
export function btn(kind: BtnKind, icon = '', extra: N = {}): N {
  const [bg, fg] = FILL[kind];
  return {
    backgroundColor: bg,
    color: fg,
    borderStyle: 'none',
    borderRadius: px(999),
    ...pad(11, 18),
    fontSize: px(16),
    fontWeight: '800',
    fontFamily: 'Nunito',
    sizeMode: 'contentSize',
    cssClassName: `bg-btn${icon ? ` bg-i-${icon}` : ''}${extra.cssClassName ? ` ${extra.cssClassName}` : ''}`,
    ...Object.fromEntries(Object.entries(extra).filter(([k]) => k !== 'cssClassName'))
  };
}

/** The kit's block colours, as tokens (CG-007 AC4). */
const BLOCK_COLOURS: N = {
  motionColor: 'var(--block-motion)',
  actionColor: 'var(--block-action)',
  controlColor: 'var(--block-control)',
  askColor: 'var(--block-ask)',
  runColor: 'var(--block-run)'
};

// ── Data/* ──────────────────────────────────────────────────────────────────

function source(path: string, label: string, json: string, out: string, description: string): CgComponent {
  const id = path.replace(/\W/g, '').toLowerCase();
  return {
    path,
    description,
    nodes: [
      { id: `${id}Data`, type: STATIC_DATA_NODE, label, parameters: { type: 'json', json } },
      outputs(`${id}Out`, [[out, 'array'], ['count', 'number']])
    ],
    connections: [wire(`${id}Data`, 'items', `${id}Out`, out), wire(`${id}Data`, 'count', `${id}Out`, 'count')]
  };
}

export const DATA_COMPONENTS: ReadonlyArray<CgComponent> = [
  source('Data/Requests', 'EDIT — the requests: this list IS the island', REQUESTS_JSON, 'requests', 'Every request an islander can ask, with its map, its goal, its palette and its reward (CG-002’s schema). Add a row to add a request.'),
  source('Data/Hints', 'EDIT — the hint table, EN and FR', HINTS_JSON, 'hints', 'The owl’s written lines by key. The game chooses the key; Olive may only voice the line.'),
  source('Data/Words', 'EDIT — every word of the game, EN and FR', ALL_WORDS_JSON, 'words', 'The interface strings as { key, en, fr } rows: the engine’s and the pages’. Logic/Translate words publishes each key in the chosen language.')
];

// ── Logic/* — generated ─────────────────────────────────────────────────────

/** How a script is driven. Anything not listed is reactive (it runs when an input changes). */
const DRIVE: Readonly<Record<string, 'go'>> = {
  'Logic/New run': 'go',
  'Logic/Step': 'go',
  'Logic/Apply delta': 'go',
  'Logic/Goal met': 'go',
  'Logic/Fold': 'go',
  'Logic/Unfold': 'go',
  'Logic/Predict end': 'go',
  'Logic/Choose hint': 'go',
  'Logic/Add profile': 'go',
  'Logic/Complete request': 'go',
  'Logic/Decode save code': 'go',
  'Logic/Record step': 'go',
  'Logic/Update profile': 'go',
  'Logic/Select profile': 'go',
  'Logic/Ask Olive': 'go',
  'Logic/Accept proposal': 'go',
  'Logic/Try Olive': 'go'
};

/** Port types by name; anything else is `*` (the engine passes objects, arrays and text through the same names). */
const TYPE: Readonly<Record<string, string>> = {
  requests: 'array', hints: 'array', words: 'array', rows: 'array', profiles: 'array', paints: 'array', eyes: 'array',
  stickers: 'array', allowed: 'array', bloom: 'array', missing: 'array', things: 'array', robots: 'array',
  lang: 'string', botName: 'string', text: 'string', key: 'string', requestId: 'string', profileId: 'string', code: 'string',
  field: 'string', op: 'string', name: 'string', islander: 'string', who: 'string', title: 'string', line: 'string',
  eyebrow: 'string', faceClass: 'string', sayKey: 'string', textKey: 'string', sample: 'string', error: 'string',
  band: 'number', blocks: 'number', count: 'number', nonce: 'number', tick: 'number', bumps: 'number', puddles: 'number',
  world: 'object', run: 'object', delta: 'object', model: 'object', vars: 'object', request: 'object', reward: 'object',
  found: 'boolean', offer: 'boolean', met: 'boolean', ok: 'boolean', hasProfile: 'boolean', older: 'boolean',
  younger: 'boolean', show: 'boolean', changed: 'boolean', recorded: 'boolean', empty: 'boolean', hit: 'boolean',
  asked: 'boolean', waiting: 'boolean', folded: 'boolean', canAdd: 'boolean', isEmpty: 'boolean', isFree: 'boolean'
};
const typeOf = (name: string) => TYPE[name] ?? '*';

/** The Logic components: the engine's (Translate words carries every word, the pages' too) and the glue. */
export interface LogicSpec {
  path: string;
  script: string;
  seam: string;
  go: boolean;
  ins: string[];
  outs: string[];
  from: 'engine' | 'olive' | 'glue';
}

export const LOGIC_SPECS: ReadonlyArray<LogicSpec> = [
  ...FUNCTION_SCRIPTS.map((f) => ({ ...f, from: 'engine' as const })),
  // CG-005: Olive's scripts, beside the engine's (kept out of FUNCTION_SCRIPTS: Ask Olive calls fetch, CG-002 AC6).
  ...OLIVE_SCRIPTS.map((f) => ({ component: f.component, script: f.script, seam: f.seam, from: 'olive' as const })),
  ...GLUE_SCRIPTS.map((f) => ({ ...f, from: 'glue' as const }))
].map((f) => {
  // 🔴 The one override: the engine's Translate words knows the engine's words only; the pages need theirs too.
  // TRANSLATE_ALL_SCRIPT is the same script over every key (the gate checks it is a superset, port for port).
  const script = f.component === 'Logic/Translate words' ? TRANSLATE_ALL_SCRIPT : f.script;
  const ports = portsOf(script);
  return { path: f.component, script, seam: f.seam, go: DRIVE[f.component] === 'go', ins: ports.inputs, outs: ports.outputs, from: f.from };
});

function logicComponent(spec: LogicSpec): CgComponent {
  const id = spec.path.replace(/^Logic\//, '').replace(/\W+/g, '').toLowerCase().slice(0, 14);
  const fn = `${id}Fn`;
  const inPorts: Array<[string, string]> = spec.ins.map((n) => [n, typeOf(n)]);
  if (spec.go) inPorts.unshift(['go', 'signal']);
  const outPorts: Array<[string, string]> = [...spec.outs.map((n) => [n, typeOf(n)] as [string, string]), ['ran', 'signal']];
  const unticked = spec.go ? spec.ins.map((n) => `in-${n}`) : [];
  const connections: unknown[] = [];
  for (const n of spec.ins) connections.push(wire(`${id}In`, n, fn, `in-${n}`));
  if (spec.go) connections.push(wire(`${id}In`, 'go', fn, 'run'));
  for (const n of spec.outs) connections.push(wire(fn, `out-${n}`, `${id}Out`, n));
  connections.push(wire(fn, 'success', `${id}Out`, 'ran'));
  return {
    path: spec.path,
    description: `${spec.seam[0].toUpperCase()}${spec.seam.slice(1)}.${spec.go ? ' Runs on Go; answers Ran once its outputs are set.' : ' Runs when an input changes; Ran after each run.'}`,
    nodes: [inputs(`${id}In`, inPorts), logic(fn, FUNCTION_NODE, spec.path.replace(/^Logic\//, ''), { functionScript: spec.script, ...signalOnly(...unticked) }), outputs(`${id}Out`, outPorts)],
    connections
  };
}

export const LOGIC_COMPONENTS: ReadonlyArray<CgComponent> = LOGIC_SPECS.map(logicComponent);

/** The family, persisted once: localStorage under `bot-garden`, written through one signal. */
const APP_STORE: CgComponent = {
  path: 'Logic/App store',
  description: 'The one persisted store (this computer only, key bot-garden): publishes the family model, writes it back on Write.',
  nodes: [
    inputs('asIn', [['write', 'signal'], ['model', 'object']]),
    logic('asStore', GLOBAL_STORE_NODE, 'The persisted store', { storeName: STORE_NAME, persist: true, storageKey: STORAGE_KEY }),
    logic('asRead', STORE_SUBSCRIBE_NODE, 'Read the family', { storeName: STORE_NAME, keys: 'model' }),
    logic('asWrite', STORE_SET_NODE, 'Write the family', { storeName: STORE_NAME, key: 'model', merge: false }),
    logic('asKeep', KIT_KEEP, 'Ask the browser to keep it'),
    outputs('asOut', [['model', 'object'], ['changed', 'signal'], ['written', 'signal'], ['ready', 'signal'], ['error', 'string']])
  ],
  connections: [
    wire('asIn', 'model', 'asWrite', 'value'),
    wire('asIn', 'write', 'asWrite', 'set'),
    wire('asWrite', 'done', 'asOut', 'written'),
    wire('asWrite', 'done', 'asKeep', 'request'),
    wire('asRead', 'value', 'asOut', 'model'),
    wire('asRead', 'changed', 'asOut', 'changed'),
    wire('asStore', 'ready', 'asOut', 'ready'),
    wire('asStore', 'error', 'asOut', 'error')
  ]
};

// ── Garden/* — what every screen shares ─────────────────────────────────────

const TAB: CgComponent = {
  path: 'Garden/Tab',
  description: 'One screen on the bar: a pill, lit when Selected (the mockup’s .tab). Publishes Clicked.',
  nodes: [
    inputs('tbIn', [['label', 'string'], ['selected', 'boolean']]),
    group('tbPill', 'The pill', undefined, { sizeMode: 'contentSize', ...pad(9, 14), borderRadius: px(999), backgroundColor: 'transparent', cssClassName: 'bg-tab bg-press' }, ['tbText']),
    text('tbText', 'The word', 'tbPill', '', { sizeMode: 'contentSize', fontSize: px(16), fontWeight: '800', color: 'var(--ink-2)' }),
    logic('tbIsOn', CONDITION_NODE, 'Is it this screen?'),
    withStates('tbStates', 'Lit or not', ['off', 'on'], {
      bg: { type: 'color', by: { off: 'transparent', on: 'var(--leaf-2)' } },
      fg: { type: 'color', by: { off: 'var(--ink-2)', on: 'var(--ink)' } }
    }),
    outputs('tbOut', [['clicked', 'signal']])
  ],
  connections: [
    wire('tbIn', 'label', 'tbText', 'text'),
    wire('tbIn', 'selected', 'tbIsOn', 'condition'),
    wire('tbIsOn', 'ontrue', 'tbStates', 'to-on'),
    wire('tbIsOn', 'onfalse', 'tbStates', 'to-off'),
    wire('tbStates', 'bg', 'tbPill', 'backgroundColor'),
    wire('tbStates', 'fg', 'tbText', 'color'),
    wire('tbPill', 'onClick', 'tbOut', 'clicked')
  ]
};

const SEG: CgComponent = {
  path: 'Garden/Seg',
  description: 'One half of a two-way switch on the bar (band, language): ink when Is On (the mockup’s .seg button). Publishes Clicked.',
  nodes: [
    inputs('sgIn', [['label', 'string'], ['isOn', 'boolean']]),
    group('sgPill', 'The half', undefined, { sizeMode: 'contentSize', ...pad(6, 12), borderRadius: px(999), backgroundColor: 'transparent', cssClassName: 'bg-seg-btn bg-press' }, ['sgText']),
    text('sgText', 'The word', 'sgPill', '', { sizeMode: 'contentSize', fontSize: px(14), fontWeight: '800', color: 'var(--ink-2)' }),
    logic('sgIsOn', CONDITION_NODE, 'Is it pressed?'),
    withStates('sgStates', 'Pressed or not', ['off', 'on'], {
      bg: { type: 'color', by: { off: 'transparent', on: 'var(--ink)' } },
      fg: { type: 'color', by: { off: 'var(--ink-2)', on: 'var(--on-fill)' } }
    }),
    outputs('sgOut', [['clicked', 'signal']])
  ],
  connections: [
    wire('sgIn', 'label', 'sgText', 'text'),
    wire('sgIn', 'isOn', 'sgIsOn', 'condition'),
    wire('sgIsOn', 'ontrue', 'sgStates', 'to-on'),
    wire('sgIsOn', 'onfalse', 'sgStates', 'to-off'),
    wire('sgStates', 'bg', 'sgPill', 'backgroundColor'),
    wire('sgStates', 'fg', 'sgText', 'color'),
    wire('sgPill', 'onClick', 'sgOut', 'clicked')
  ]
};

const TABS: ReadonlyArray<{ id: string; word: string; target: string; on: string }> = [
  { id: 'island', word: 'navIsland', target: C.pageIsland, on: 'islandOn' },
  { id: 'workshop', word: 'navWorkshop', target: C.pageWorkshop, on: 'workshopOn' },
  { id: 'robot', word: 'navRobot', target: C.pageRobot, on: 'robotOn' },
  { id: 'skills', word: 'navSkills', target: C.pageSkills, on: 'skillsOn' },
  { id: 'grown', word: 'navGrown', target: C.pageGrown, on: 'grownOn' }
];

/**
 * The bar on every screen (the mockup's .top): the brand, the five screens, the band and the language (per profile, so
 * a switch writes the family), and who is playing (a tap goes back to Profiles). Page changes are the router's (AC8).
 * Picked En / Picked Fr also fire, so the Profiles screen can set the language before anyone is chosen (`gardenLang`, written there only: one bar is drawn per page, and a Variable in the bar would be one value for every copy).
 */
const BAR: CgComponent = {
  path: 'Garden/Top bar',
  description: 'The top bar: brand, the five screens, band 7–9 / 10–12, EN / FR, and who is playing. Page is which tab is lit. A band or language tap writes the family through Model and Write. Show Tabs false and Show Band false for the Profiles screen.',
  nodes: [
    inputs('brIn', [['page', 'string'], ['band', 'number'], ['lang', 'string'], ['name', 'string'], ['face', 'string'], ['words', 'array'], ['botName', 'string'], ['model', 'object'], ['profileId', 'string'], ['showTabs', 'boolean'], ['showBand', 'boolean']]),
    group('brBar', 'The bar', undefined, { ...row({ width: pct(100), sizeMode: 'contentHeight', columnGap: sp(14), rowGap: sp(10) }), backgroundColor: 'var(--card)', borderRadius: 'var(--radius-bar)', ...pad(10, 14), cssClassName: 'bg-top' }, ['brBrand', 'brTabs', 'brBandSeg', 'brLangSeg', 'brWho']),
    group('brBrand', 'The brand', 'brBar', row({ columnGap: sp(10) }), ['brMark', 'brName']),
    group('brMark', 'The tulip', 'brBrand', { sizeMode: 'explicit', width: px(38), height: px(38), cssClassName: 'bg-brand-mark bg-sp-tulip' }),
    text('brName', 'Bot Garden', 'brBrand', 'Bot Garden', { sizeMode: 'contentSize', ...DISPLAY, fontSize: px(24), fontWeight: '700', color: 'var(--ink)', cssClassName: 'bg-brand' }),
    group('brTabs', 'The five screens', 'brBar', { ...row({ columnGap: sp(4), rowGap: sp(4) }), cssClassName: 'bg-tabs' }, TABS.map((t) => `brTab_${t.id}`)),
    ...TABS.map((t) => place(`brTab_${t.id}`, C.tab, `Tab: ${t.id}`, 'brTabs')),
    group('brBandSeg', 'Age band', 'brBar', { ...row({ columnGap: sp(0) }), backgroundColor: 'var(--paper-2)', borderRadius: px(999), ...pad(3), cssClassName: 'bg-seg' }, ['brBand1', 'brBand2']),
    place('brBand1', C.seg, '7–9', 'brBandSeg', { label: '7–9' }),
    place('brBand2', C.seg, '10–12', 'brBandSeg', { label: '10–12' }),
    group('brLangSeg', 'Language', 'brBar', { ...row({ columnGap: sp(0) }), backgroundColor: 'var(--paper-2)', borderRadius: px(999), ...pad(3), cssClassName: 'bg-seg' }, ['brEn', 'brFr']),
    place('brEn', C.seg, 'EN', 'brLangSeg', { label: 'EN' }),
    place('brFr', C.seg, 'FR', 'brLangSeg', { label: 'FR' }),
    group('brWho', 'Who is playing', 'brBar', { ...row({ columnGap: sp(8) }), cssClassName: 'bg-press' }, ['brFace', 'brWhoName']),
    place('brFace', KIT_AVATAR, 'The face', 'brWho', { look: 'fun-emoji', seed: 'Pip', size: 34, background: 'var(--sun)' }),
    text('brWhoName', 'The name', 'brWho', '', { sizeMode: 'contentSize', ...T_STRONG }),
    logic('brT', L('Translate words'), 'In their language'),
    logic('brLit', L('Bar state'), 'What is lit'),
    logic('brSetEn', L('Update profile'), 'English', { field: 'lang', value: 'en' }),
    logic('brSetFr', L('Update profile'), 'French', { field: 'lang', value: 'fr' }),
    logic('brSetB1', L('Update profile'), 'Band 7–9', { field: 'band', value: 1 }),
    logic('brSetB2', L('Update profile'), 'Band 10–12', { field: 'band', value: 2 }),
    ...TABS.map((t) => navigate(`brGo_${t.id}`, t.target, `To ${t.id}`)),
    navigate('brGoProfiles', C.pageProfiles, 'To the profiles'),
    outputs('brOut', [['model', 'object'], ['write', 'signal'], ['pickedEn', 'signal'], ['pickedFr', 'signal']])
  ],
  connections: [
    wire('brIn', 'words', 'brT', 'words'),
    wire('brIn', 'lang', 'brT', 'lang'),
    wire('brIn', 'botName', 'brT', 'botName'),
    wire('brIn', 'page', 'brLit', 'page'),
    wire('brIn', 'band', 'brLit', 'band'),
    wire('brIn', 'lang', 'brLit', 'lang'),
    wire('brIn', 'showTabs', 'brTabs', 'mounted'),
    wire('brIn', 'showBand', 'brBandSeg', 'mounted'),
    wire('brIn', 'name', 'brWhoName', 'text'),
    wire('brIn', 'face', 'brFace', 'seed'),
    wire('brT', 'brand', 'brName', 'text'),
    ...TABS.flatMap((t) => [wire('brT', t.word, `brTab_${t.id}`, 'label'), wire('brLit', t.on, `brTab_${t.id}`, 'selected'), wire(`brTab_${t.id}`, 'clicked', `brGo_${t.id}`, 'navigate')]),
    wire('brLit', 'band1On', 'brBand1', 'isOn'),
    wire('brLit', 'band2On', 'brBand2', 'isOn'),
    wire('brLit', 'enOn', 'brEn', 'isOn'),
    wire('brLit', 'frOn', 'brFr', 'isOn'),
    wire('brWho', 'onClick', 'brGoProfiles', 'navigate'),
    ...(['brSetEn', 'brSetFr', 'brSetB1', 'brSetB2'] as const).flatMap((u) => [wire('brIn', 'model', u, 'model'), wire('brIn', 'profileId', u, 'profileId'), wire(u, 'model', 'brOut', 'model'), wire(u, 'ran', 'brOut', 'write')]),
    wire('brEn', 'clicked', 'brSetEn', 'go'),
    wire('brEn', 'clicked', 'brOut', 'pickedEn'),
    wire('brFr', 'clicked', 'brSetFr', 'go'),
    wire('brFr', 'clicked', 'brOut', 'pickedFr'),
    wire('brBand1', 'clicked', 'brSetB1', 'go'),
    wire('brBand2', 'clicked', 'brSetB2', 'go')
  ]
};

const HEAD: CgComponent = {
  path: 'Garden/Page head',
  description: 'A screen’s head (the mockup’s .head): an eyebrow, the one title, a line under it.',
  nodes: [
    inputs('hdIn', [['eyebrow', 'string'], ['title', 'string'], ['sub', 'string']]),
    group('hdWrap', 'The head', undefined, column({ rowGap: sp(2), maxWidth: px(760) }), ['hdEyebrow', 'hdTitle', 'hdSub']),
    text('hdEyebrow', 'Eyebrow', 'hdWrap', '', T_EYEBROW),
    text('hdTitle', 'Title', 'hdWrap', '', T_H1),
    text('hdSub', 'The line', 'hdWrap', '', T_MUTED)
  ],
  connections: [wire('hdIn', 'eyebrow', 'hdEyebrow', 'text'), wire('hdIn', 'title', 'hdTitle', 'text'), wire('hdIn', 'sub', 'hdSub', 'text')]
};

// ── Workshop/* ──────────────────────────────────────────────────────────────

const PAD_KEY: CgComponent = {
  path: 'Workshop/Pad key',
  description: 'One key of the Teach pad: a 56 px square with its arrow (AC5). Publishes Pressed with its Op.',
  nodes: [
    inputs('pkIn', [['op', 'string'], ['cls', 'string'], ['label', 'string']]),
    { id: 'pkKey', type: BUTTON_NODE, label: 'The key', parameters: { backgroundColor: 'var(--card)', color: 'var(--ink)', borderStyle: 'none', borderRadius: px(14), sizeMode: 'explicit', width: px(56), height: px(56), label: '' } },
    outputs('pkOut', [['pressed', 'signal'], ['op', 'string']])
  ],
  connections: [wire('pkIn', 'cls', 'pkKey', 'cssClassName'), wire('pkIn', 'label', 'pkKey', 'label'), wire('pkKey', 'onClick', 'pkOut', 'pressed'), wire('pkIn', 'op', 'pkOut', 'op')]
};

const PAD: CgComponent = {
  path: 'Workshop/Pad',
  description: 'The Teach pad over the world’s corner (the mockup’s .pad): forward, left, water, right. Publishes Pressed with the Op, the op first.',
  repeats: { source: 'static', rowFields: ['op', 'cls', 'label'] },
  nodes: [
    inputs('pdIn', [['show', 'boolean']]),
    group('pdBox', 'The pad', undefined, { sizeMode: 'contentSize', cssClassName: 'bg-pad', mounted: false }, ['pdEach']),
    { id: 'pdKeys', type: STATIC_DATA_NODE, label: 'The four keys', parameters: { type: 'json', json: JSON.stringify(PAD_KEYS.map((k) => ({ op: k.op, cls: k.cls, label: k.op }))) } },
    { ...logic('pdEach', FOR_EACH_NODE, 'One key per row', { template: C.padKey, templateType: 'explicit' }), parent: 'pdBox' },
    outputs('pdOut', [['op', 'string'], ['pressed', 'signal']])
  ],
  connections: [
    wire('pdIn', 'show', 'pdBox', 'mounted'),
    wire('pdKeys', 'items', 'pdEach', 'items'),
    wire('pdEach', 'itemOutput-op', 'pdOut', 'op'),
    wire('pdEach', 'itemOutputSignal-pressed', 'pdOut', 'pressed')
  ]
};

/**
 * The tick loop. Play: a fresh run from the program and the world reset to its start, then one engine step per tick
 * (Step → Apply delta), a Timer between ticks, until the run says done. One step: the next tick of a live run, or a
 * fresh run's first tick. The run and the world live in two Variables (`gardenRun`, `gardenWorld`) — the world one is
 * the same one the Teach pad and Start over write, so there is one world on the page.
 */
const RUNNER: CgComponent = {
  path: 'Workshop/Runner',
  description: 'Runs a program on the world, one engine step per tick: Play runs it to the end, Step one tick (starting a fresh run when none is live), Stop halts. A run parked on Olive fires Parked with the Request and waits; Answered (the Answer set first) resumes it. Finished fires once the run is done.',
  nodes: [
    inputs('rnIn', [['program', '*'], ['start', 'object'], ['answer', 'object'], ['lang', 'string'], ['stepMs', 'number'], ['play', 'signal'], ['step', 'signal'], ['stop', 'signal'], ['answered', 'signal']]),
    logic('rnNew', L('New run'), 'A fresh run', { robotId: 'me' }),
    setVariable('rnSetRunNew', 'gardenRun', 'Hold the fresh run'),
    setVariable('rnSetWorldStart', 'gardenWorld', 'The world back at its start'),
    variable('rnRunVar', 'gardenRun', 'The run'),
    variable('rnWorldVar', 'gardenWorld', 'The world'),
    logic('rnStep', L('Step'), 'One tick'),
    logic('rnApply', L('Apply delta'), 'The world after it'),
    setVariable('rnSetRunStep', 'gardenRun', 'Hold the run after the tick'),
    setVariable('rnSetWorldApply', 'gardenWorld', 'Hold the world after the tick'),
    gate('rnEnd', 'Is the run done?'),
    gate('rnLoop', 'Still playing?'),
    gate('rnLive', 'Is a run live?'),
    gate('rnPark', 'Parked on Olive?'),
    logic('rnTimer', TIMER_NODE, 'The wait between ticks', { duration: TICK_MS }),
    withStates('rnMode', 'Idle, playing or paused', ['idle', 'playing', 'paused'], {
      playing: { type: 'boolean', by: { idle: false, playing: true, paused: false } },
      live: { type: 'boolean', by: { idle: false, playing: true, paused: true } },
      idle: { type: 'boolean', by: { idle: true, playing: false, paused: true } }
    }),
    outputs('rnOut', [['world', 'object'], ['run', 'object'], ['glowId', '*'], ['running', 'boolean'], ['idle', 'boolean'], ['live', 'boolean'], ['done', 'boolean'], ['bumps', 'number'], ['puddles', 'number'], ['sayKey', 'string'], ['tick', 'number'], ['waiting', 'boolean'], ['request', 'object'], ['proposal', 'object'], ['ticked', 'signal'], ['finished', 'signal'], ['started', 'signal'], ['parked', 'signal']])
  ],
  connections: [
    wire('rnIn', 'program', 'rnNew', 'program'),
    wire('rnIn', 'lang', 'rnNew', 'lang'),
    wire('rnIn', 'start', 'rnSetWorldStart', 'value'),
    wire('rnIn', 'stepMs', 'rnTimer', 'duration'),
    // Play: always fresh.
    wire('rnIn', 'play', 'rnMode', 'to-playing'),
    wire('rnIn', 'play', 'rnSetWorldStart', 'do'),
    wire('rnIn', 'play', 'rnNew', 'go'),
    wire('rnNew', 'run', 'rnSetRunNew', 'value'),
    wire('rnNew', 'ran', 'rnSetRunNew', 'do'),
    wire('rnSetRunNew', 'done', 'rnTimer', 'start'),
    wire('rnSetRunNew', 'done', 'rnOut', 'started'),
    // One tick: Step reads the run and the world, Apply writes the world.
    wire('rnTimer', 'timerFinished', 'rnStep', 'go'),
    wire('rnRunVar', 'value', 'rnStep', 'run'),
    wire('rnWorldVar', 'value', 'rnStep', 'world'),
    wire('rnIn', 'answer', 'rnStep', 'answer'),
    wire('rnStep', 'run', 'rnSetRunStep', 'value'),
    wire('rnStep', 'ran', 'rnSetRunStep', 'do'),
    wire('rnWorldVar', 'value', 'rnApply', 'world'),
    wire('rnStep', 'delta', 'rnApply', 'delta'),
    wire('rnStep', 'ran', 'rnApply', 'go'),
    wire('rnApply', 'world', 'rnSetWorldApply', 'value'),
    wire('rnApply', 'ran', 'rnSetWorldApply', 'do'),
    // Done, or the next tick when playing.
    wire('rnStep', 'done', 'rnEnd', 'condition'),
    wire('rnSetWorldApply', 'done', 'rnEnd', 'eval'),
    wire('rnSetWorldApply', 'done', 'rnOut', 'ticked'),
    wire('rnEnd', 'ontrue', 'rnMode', 'to-idle'),
    wire('rnEnd', 'ontrue', 'rnOut', 'finished'),
    wire('rnMode', 'playing', 'rnLoop', 'condition'),
    // Parked on Olive (CG-005): no next tick until an answer arrives, so the question is asked once, not once a tick.
    wire('rnStep', 'waiting', 'rnPark', 'condition'),
    wire('rnEnd', 'onfalse', 'rnPark', 'eval'),
    wire('rnPark', 'ontrue', 'rnOut', 'parked'),
    wire('rnPark', 'onfalse', 'rnLoop', 'eval'),
    wire('rnIn', 'answered', 'rnLoop', 'eval'),
    wire('rnLoop', 'ontrue', 'rnTimer', 'start'),
    // One step: the next tick of a live run, or a fresh run's first. The mode moves only after the test.
    wire('rnMode', 'live', 'rnLive', 'condition'),
    wire('rnIn', 'step', 'rnLive', 'eval'),
    wire('rnLive', 'ontrue', 'rnMode', 'to-paused'),
    wire('rnLive', 'ontrue', 'rnTimer', 'start'),
    wire('rnLive', 'onfalse', 'rnMode', 'to-paused'),
    wire('rnLive', 'onfalse', 'rnSetWorldStart', 'do'),
    wire('rnLive', 'onfalse', 'rnNew', 'go'),
    // Stop.
    wire('rnIn', 'stop', 'rnTimer', 'stop'),
    wire('rnIn', 'stop', 'rnMode', 'to-idle'),
    // What the page reads.
    wire('rnWorldVar', 'value', 'rnOut', 'world'),
    wire('rnRunVar', 'value', 'rnOut', 'run'),
    wire('rnStep', 'glowId', 'rnOut', 'glowId'),
    wire('rnStep', 'done', 'rnOut', 'done'),
    wire('rnStep', 'bumps', 'rnOut', 'bumps'),
    wire('rnStep', 'puddles', 'rnOut', 'puddles'),
    wire('rnStep', 'sayKey', 'rnOut', 'sayKey'),
    wire('rnStep', 'tick', 'rnOut', 'tick'),
    wire('rnStep', 'waiting', 'rnOut', 'waiting'),
    wire('rnStep', 'request', 'rnOut', 'request'),
    wire('rnStep', 'proposal', 'rnOut', 'proposal'),
    wire('rnMode', 'playing', 'rnOut', 'running'),
    wire('rnMode', 'idle', 'rnOut', 'idle'),
    wire('rnMode', 'live', 'rnOut', 'live')
  ]
};

/** The win card: fixed and centred over whatever is scrolled (AC7), the islander, the reward, the trick learnt. */
const WIN: CgComponent = {
  path: 'Workshop/Win card',
  description: 'The win card (the mockup’s .win): fixed and centred, so it meets the child wherever the block list is scrolled. Publishes Island (back to the island) or Stay (keep tinkering).',
  nodes: [
    inputs('wnIn', [['show', 'boolean'], ['faceClass', 'string'], ['thanks', 'string'], ['line', 'string'], ['rewardText', 'string'], ['hasReward', 'boolean'], ['learnText', 'string'], ['hasLearn', 'boolean'], ['islandWord', 'string'], ['stayWord', 'string']]),
    group('wnScrim', 'Over the page', undefined, { width: pct(100), sizeMode: 'contentHeight', cssClassName: 'bg-win', mounted: false }, ['wnCard']),
    group('wnCard', 'The card', 'wnScrim', { ...column({ alignItems: 'center', rowGap: sp(8) }), backgroundColor: 'var(--card)', borderRadius: 'var(--radius-bar)', ...pad(22, 26), maxWidth: px(380), cssClassName: 'bg-win-card' }, ['wnFace', 'wnThanks', 'wnLine', 'wnRewards', 'wnButtons']),
    group('wnFace', 'The islander', 'wnCard', { sizeMode: 'explicit', width: px(72), height: px(72) }),
    text('wnThanks', 'Thank you', 'wnCard', '', { ...T_H3, fontSize: px(26), textAlignX: 'center' }),
    text('wnLine', 'How many blocks', 'wnCard', '', { ...T_MUTED, fontWeight: '700', textAlignX: 'center' }),
    group('wnRewards', 'What was earned', 'wnCard', row({ justifyContent: 'center' }), ['wnReward', 'wnLearn']),
    group('wnReward', 'The reward', 'wnRewards', { ...row(), backgroundColor: 'var(--paper-2)', ...pad(8, 14), cssClassName: 'bg-reward', mounted: false }, ['wnRewardText']),
    text('wnRewardText', 'The reward', 'wnReward', '', { sizeMode: 'contentSize', ...T_STRONG }),
    group('wnLearn', 'The trick learnt', 'wnRewards', { ...row(), backgroundColor: 'var(--rep)', ...pad(8, 14), cssClassName: 'bg-reward', mounted: false }, ['wnLearnText']),
    text('wnLearnText', 'The trick', 'wnLearn', '', { sizeMode: 'contentSize', ...T_STRONG }),
    group('wnButtons', 'The two ways on', 'wnCard', row({ justifyContent: 'center' }), ['wnIsland', 'wnStay']),
    place('wnIsland', BUTTON_NODE, 'Back to the island', 'wnButtons', { ...btn('primary'), label: 'Back to the island' }),
    place('wnStay', BUTTON_NODE, 'Keep tinkering', 'wnButtons', { ...btn('plain'), label: 'Keep tinkering' }),
    outputs('wnOut', [['island', 'signal'], ['stay', 'signal']])
  ],
  connections: [
    wire('wnIn', 'show', 'wnScrim', 'mounted'),
    wire('wnIn', 'faceClass', 'wnFace', 'cssClassName'),
    wire('wnIn', 'thanks', 'wnThanks', 'text'),
    wire('wnIn', 'line', 'wnLine', 'text'),
    wire('wnIn', 'rewardText', 'wnRewardText', 'text'),
    wire('wnIn', 'hasReward', 'wnReward', 'mounted'),
    wire('wnIn', 'learnText', 'wnLearnText', 'text'),
    wire('wnIn', 'hasLearn', 'wnLearn', 'mounted'),
    wire('wnIn', 'islandWord', 'wnIsland', 'label'),
    wire('wnIn', 'stayWord', 'wnStay', 'label'),
    wire('wnIsland', 'onClick', 'wnOut', 'island'),
    wire('wnStay', 'onClick', 'wnOut', 'stay')
  ]
};

/**
 * The whole workshop (the mockup's #s-workshop): the request's head, the task card, the world with the pad over it,
 * the controls, the owl, the steps with the fold offer, and the win card. Everything that changes lives here; the page
 * hands in the request, the family's looks and the words, and stores what Won hands back.
 */
const PLAY: CgComponent = {
  path: 'Workshop/Play',
  description: 'The workshop: teach the robot by driving it, see the steps as blocks, fold the repetition, play, and win. Request Id picks the request (free for free play). Won fires with Bloom, Reward and Won Request set; Island asks for the island; Found says whether the request exists (a reload has none).',
  nodes: [
    inputs('plIn', [['requestId', 'string'], ['requests', 'array'], ['hints', 'array'], ['words', 'array'], ['lang', 'string'], ['band', 'number'], ['isOlder', 'boolean'], ['botName', 'string'], ['color', 'string'], ['eye', 'string'], ['hat', 'string'], ['stepMs', 'number']]),
    // ── What the child sees ──
    group('plRoot', 'The workshop', undefined, column({ rowGap: sp(12) }), ['plHead', 'plWs', 'plWin']),
    group('plHead', 'The head', 'plRoot', column({ rowGap: sp(2) }), ['plEyebrow', 'plTitle', 'plSub']),
    text('plEyebrow', 'Whose request', 'plHead', '', T_EYEBROW),
    text('plTitle', 'The request', 'plHead', '', T_H1),
    text('plSub', 'How it works', 'plHead', '', { ...T_MUTED, maxWidth: px(640) }),
    group('plWs', 'World and steps', 'plRoot', { width: pct(100), sizeMode: 'contentHeight', cssClassName: 'bg-ws' }, ['plLeft', 'plRight']),
    group('plLeft', 'The world side', 'plWs', { ...column({ rowGap: sp(12) }), ...PANEL }, ['plTask', 'plStage', 'plPredictLine', 'plControls', 'plOwl']),
    group('plTask', 'The task', 'plLeft', row({ width: pct(100), sizeMode: 'contentHeight', columnGap: sp(14), flexWrap: 'nowrap' }), ['plFace', 'plTaskText', 'plDots']),
    group('plFace', 'The islander', 'plTask', { sizeMode: 'explicit', width: px(56), height: px(56) }),
    group('plTaskText', 'Who and what', 'plTask', { ...column({ rowGap: sp(2) }), cssClassName: 'bg-grow' }, ['plTaskH', 'plTaskP']),
    text('plTaskH', 'The islander', 'plTaskText', '', T_H2),
    text('plTaskP', 'What they said', 'plTaskText', '', T_MUTED),
    text('plDots', 'Tulips watered', 'plTask', '', { sizeMode: 'contentSize', fontSize: px(18), color: 'var(--ink-2)', mounted: false }),
    group('plStage', 'The world', 'plLeft', { width: pct(100), sizeMode: 'contentHeight', cssClassName: 'bg-stage' }, ['plGarden', 'plRec', 'plPad']),
    place('plGarden', KIT_GARDEN, 'The garden', 'plStage', { stepMs: STEP_MS, label: 'The garden' }),
    group('plRec', 'Pip is learning', 'plStage', { ...row({ columnGap: sp(0) }), backgroundColor: 'var(--card)', borderRadius: px(999), ...pad(6, 12), cssClassName: 'bg-rec', mounted: false }, ['plRecText']),
    text('plRecText', 'Recording', 'plRec', '', { sizeMode: 'contentSize', fontSize: px(14), fontWeight: '800', color: 'var(--ink)' }),
    place('plPad', C.pad, 'The Teach pad', 'plStage'),
    text('plPredictLine', 'Where will it end?', 'plLeft', '', { ...T_STRONG, color: 'var(--violet-ink)', mounted: false }),
    group('plControls', 'The controls', 'plLeft', { ...row({ width: pct(100), sizeMode: 'contentHeight' }), cssClassName: 'bg-controls' }, ['plTeach', 'plStop', 'plPlay', 'plStep', 'plReset', 'plPredict', 'plAsk']),
    place('plTeach', BUTTON_NODE, 'Teach', 'plControls', { ...btn('teach', 'rec'), label: 'Teach Pip' }),
    place('plStop', BUTTON_NODE, 'Done teaching', 'plControls', { ...btn('primary', 'rec'), label: 'Done teaching', mounted: false }),
    place('plPlay', BUTTON_NODE, 'Play', 'plControls', { ...btn('primary', 'play'), label: 'Play' }),
    place('plStep', BUTTON_NODE, 'One step', 'plControls', { ...btn('plain', 'step'), label: 'One step' }),
    place('plReset', BUTTON_NODE, 'Start over', 'plControls', { ...btn('plain', 'reset'), label: 'Start over' }),
    place('plPredict', BUTTON_NODE, 'Predict', 'plControls', { ...btn('plain', 'predict'), label: 'Predict', mounted: false }),
    place('plAsk', BUTTON_NODE, 'Ask Olive', 'plControls', { ...btn('ask', 'owl', { cssClassName: 'bg-ask-push' }), label: 'Ask Olive' }),
    group('plOwl', 'The owl', 'plLeft', { width: pct(100), sizeMode: 'contentHeight', backgroundColor: 'var(--violet-2)', borderRadius: px(16), ...pad(12), cssClassName: 'bg-owl' }, ['plOwlPic', 'plOwlCol']),
    group('plOwlPic', 'Olive', 'plOwl', { sizeMode: 'explicit', width: px(64), height: px(64), cssClassName: 'bg-owl-pic bg-sp-owl' }),
    group('plOwlCol', 'What she says', 'plOwl', column({ rowGap: sp(4) }), ['plOwlSay', 'plOwlMeta']),
    text('plOwlSay', 'The hint', 'plOwlCol', '', { ...T_BODY, fontWeight: '700', cssClassName: 'bg-owl-say' }),
    text('plOwlMeta', 'Where she lives', 'plOwlCol', '', { fontSize: px(12), color: 'var(--violet-meta)', cssClassName: 'bg-owl-meta' }),
    group('plRight', 'The steps side', 'plWs', { ...column({ rowGap: sp(10) }), ...PANEL }, ['plStepsHead', 'plBlocksBox', 'plTidy']),
    group('plStepsHead', 'The steps’ head', 'plRight', row({ width: pct(100), sizeMode: 'contentHeight', justifyContent: 'space-between', flexWrap: 'nowrap' }), ['plStepsH', 'plCount']),
    text('plStepsH', 'Pip’s steps', 'plStepsHead', '', { ...T_H2, fontSize: px(20) }),
    text('plCount', 'How many blocks', 'plStepsHead', '', { sizeMode: 'contentSize', fontSize: px(13), fontWeight: '800', color: 'var(--ink-2)', mounted: false }),
    group('plBlocksBox', 'The steps, scrolling in their own box', 'plRight', { width: pct(100), sizeMode: 'contentHeight', cssClassName: 'bg-blocks-box' }, ['plBlocks']),
    place('plBlocks', KIT_BLOCKS, 'The blocks', 'plBlocksBox', { ...BLOCK_COLOURS }),
    group('plTidy', 'The fold offer', 'plRight', { ...row({ width: pct(100), sizeMode: 'contentHeight', columnGap: sp(10) }), backgroundColor: 'var(--tidy)', borderStyle: 'solid', borderWidth: px(2), borderColor: 'var(--tidy-edge)', borderRadius: px(14), ...pad(10, 12), cssClassName: 'bg-tidy', mounted: false }, ['plTidyText', 'plFoldBtn', 'plNotNow']),
    text('plTidyText', 'What was spotted', 'plTidy', '', { ...T_BODY, fontWeight: '700' }),
    place('plFoldBtn', BUTTON_NODE, 'Fold it', 'plTidy', { ...btn('fold', 'tidy', { ...pad(8, 14), fontSize: px(14) }), label: 'Fold it' }),
    place('plNotNow', BUTTON_NODE, 'Not now', 'plTidy', { ...btn('quiet', '', { ...pad(8, 14), fontSize: px(14) }), label: 'Not now' }),
    place('plWin', C.win, 'The win card', 'plRoot'),
    // ── The words ──
    logic('plT', L('Translate words'), 'In their language'),
    logic('plCard', L('Request card'), 'Who asks, and what'),
    logic('plLine', L('Hint line'), 'The owl’s line'),
    logic('plOwlRow', L('Owl row'), 'The written line, voiced only for the same key'),
    logic('plAskOlive', L('Ask Olive'), 'Ask Olive for a parked run'),
    // ── The world, the program, the run ──
    logic('plStart', L('Start world'), 'The world this request starts from'),
    logic('plNonce', COUNTER_NODE, 'Start over, counted', { startValue: 0 }),
    variable('plWorldVar', 'gardenWorld', 'The world'),
    setVariable('plSetWorld', 'gardenWorld', 'The world at its start'),
    setVariable('plSetWorldRec', 'gardenWorld', 'The world after a pad press'),
    variable('plProgVar', 'gardenProgram', 'The program'),
    logic('plRead', L('Read program'), 'The program as a list'),
    setVariable('plSetProgKit', 'gardenProgram', 'What the block list edited'),
    setVariable('plSetProgRec', 'gardenProgram', 'What the pad recorded'),
    setVariable('plSetProgFold', 'gardenProgram', 'What the fold made'),
    setVariable('plSetProgClear', 'gardenProgram', 'No steps', { setWith: 'string', value: '[]' }),
    variable('plTeachBumpsVar', 'gardenTeachBumps', 'Bumps while teaching'),
    setVariable('plSetTeachBumps', 'gardenTeachBumps', 'Count a bump'),
    setVariable('plClearTeachBumps', 'gardenTeachBumps', 'No bumps', { setWith: 'number', value: 0 }),
    logic('plRecord', L('Record step'), 'A pad press, recorded and driven'),
    logic('plRunner', C.runner, 'The runner'),
    logic('plDraw', L('Draw world'), 'The world in the kit’s words'),
    logic('plPalette', L('Palette'), 'The blocks this band may use'),
    logic('plKitPal', L('Kit palette'), 'In the kit’s shape'),
    // ── Teach, predict, fold ──
    withStates('plTeachMode', 'Teaching or not', ['idle', 'teach'], {
      teaching: { type: 'boolean', by: { idle: false, teach: true } },
      notTeaching: { type: 'boolean', by: { idle: true, teach: false } }
    }),
    withStates('plPredictMode', 'Waiting for a tap or not', ['off', 'on'], { predicting: { type: 'boolean', by: { off: false, on: true } } }),
    gate('plPredictGate', 'Was the tap a prediction?'),
    logic('plPredictEnd', L('Predict end'), 'Where the robot really ends'),
    gate('plHitGate', 'Did the tap hit?'),
    variable('plMissVar', 'gardenPredictMiss', 'A missed prediction on show'),
    setVariable('plSetMiss', 'gardenPredictMiss', 'Show the real end', { setWith: 'boolean', value: true }),
    setVariable('plClearMiss', 'gardenPredictMiss', 'Hide it', { setWith: 'boolean', value: false }),
    logic('plFind', L('Find repeat'), 'The same steps, over and over?'),
    logic('plTidyLine', L('Tidy line'), 'The fold offer in words'),
    variable('plDismissVar', 'gardenTidyNo', 'The program the child said Not now to'),
    setVariable('plSetDismiss', 'gardenTidyNo', 'Not now'),
    logic('plFold', L('Fold'), 'Fold it'),
    // ── Hints and the win ──
    logic('plChoose', L('Choose hint'), 'Which hint'),
    logic('plGoal', L('Goal met'), 'Was the request done?'),
    gate('plMetGate', 'Done?'),
    variable('plWonVar', 'gardenWon', 'The win card up'),
    setVariable('plSetWon', 'gardenWon', 'Show it', { setWith: 'boolean', value: true }),
    setVariable('plClearWon', 'gardenWon', 'Hide it', { setWith: 'boolean', value: false }),
    logic('plWinSum', L('Win summary'), 'The win in words'),
    outputs('plOut', [['won', 'signal'], ['bloom', 'array'], ['reward', 'object'], ['wonRequest', 'string'], ['island', 'signal'], ['found', 'boolean'], ['blocks', 'number'], ['running', 'boolean']])
  ],
  connections: [
    // Words.
    wire('plIn', 'words', 'plT', 'words'),
    wire('plIn', 'lang', 'plT', 'lang'),
    wire('plIn', 'botName', 'plT', 'botName'),
    wire('plIn', 'requests', 'plCard', 'requests'),
    wire('plIn', 'requestId', 'plCard', 'requestId'),
    wire('plIn', 'words', 'plCard', 'words'),
    wire('plIn', 'lang', 'plCard', 'lang'),
    wire('plIn', 'botName', 'plCard', 'botName'),
    wire('plCard', 'eyebrow', 'plEyebrow', 'text'),
    wire('plCard', 'title', 'plTitle', 'text'),
    wire('plT', 'isSub', 'plSub', 'text'),
    wire('plCard', 'faceClass', 'plFace', 'cssClassName'),
    wire('plCard', 'who', 'plTaskH', 'text'),
    wire('plCard', 'line', 'plTaskP', 'text'),
    wire('plT', 'recording', 'plRecText', 'text'),
    wire('plT', 'teach', 'plTeach', 'label'),
    wire('plT', 'teachStop', 'plStop', 'label'),
    wire('plT', 'play', 'plPlay', 'label'),
    wire('plT', 'step', 'plStep', 'label'),
    wire('plT', 'reset', 'plReset', 'label'),
    wire('plT', 'predict', 'plPredict', 'label'),
    wire('plT', 'predictAsk', 'plPredictLine', 'text'),
    wire('plT', 'ask', 'plAsk', 'label'),
    wire('plT', 'owlMeta', 'plOwlMeta', 'text'),
    wire('plT', 'scriptH', 'plStepsH', 'text'),
    wire('plT', 'tidyGo', 'plFoldBtn', 'label'),
    wire('plT', 'tidyNo', 'plNotNow', 'label'),
    wire('plT', 'winIsland', 'plWin', 'islandWord'),
    wire('plT', 'winStay', 'plWin', 'stayWord'),
    // Band 10–12 only: Predict and the block count (AC5: no count at 7–9).
    wire('plIn', 'isOlder', 'plPredict', 'mounted'),
    wire('plIn', 'isOlder', 'plCount', 'mounted'),
    wire('plRead', 'blocks', 'plCount', 'text'),
    // The request: its world is the reset. A new request, Start over, or a mount: one path.
    wire('plIn', 'requests', 'plStart', 'requests'),
    wire('plIn', 'requestId', 'plStart', 'requestId'),
    wire('plNonce', 'currentCount', 'plStart', 'nonce'),
    wire('plReset', 'onClick', 'plNonce', 'increase'),
    wire('plStart', 'world', 'plSetWorld', 'value'),
    wire('plStart', 'ran', 'plSetWorld', 'do'),
    wire('plStart', 'ran', 'plSetProgClear', 'do'),
    wire('plStart', 'ran', 'plClearTeachBumps', 'do'),
    wire('plStart', 'ran', 'plClearWon', 'do'),
    wire('plStart', 'ran', 'plClearMiss', 'do'),
    wire('plStart', 'ran', 'plTeachMode', 'to-idle'),
    wire('plStart', 'ran', 'plPredictMode', 'to-off'),
    wire('plStart', 'ran', 'plRunner', 'stop'),
    wire('plStart', 'ran', 'plChoose', 'go'),
    wire('plStart', 'found', 'plOut', 'found'),
    // The program: one Variable, four writers (the kit, the pad, the fold, the reset).
    wire('plProgVar', 'value', 'plRead', 'program'),
    wire('plProgVar', 'value', 'plBlocks', 'program'),
    wire('plBlocks', 'onProgram', 'plSetProgKit', 'value'),
    wire('plBlocks', 'onChanged', 'plSetProgKit', 'do'),
    wire('plRecord', 'program', 'plSetProgRec', 'value'),
    wire('plRecord', 'ran', 'plSetProgRec', 'do'),
    wire('plFold', 'program', 'plSetProgFold', 'value'),
    wire('plFold', 'ran', 'plSetProgFold', 'do'),
    wire('plRead', 'blocks', 'plOut', 'blocks'),
    // The block list.
    wire('plKitPal', 'palette', 'plBlocks', 'palette'),
    wire('plIn', 'band', 'plBlocks', 'band'),
    wire('plIn', 'lang', 'plBlocks', 'language'),
    wire('plRunner', 'glowId', 'plBlocks', 'runningId'),
    wire('plRunner', 'running', 'plBlocks', 'locked'),
    wire('plIn', 'band', 'plPalette', 'band'),
    wire('plStart', 'allowed', 'plPalette', 'allowed'),
    wire('plStart', 'rungs', 'plPalette', 'rungs'),
    wire('plIn', 'lang', 'plPalette', 'lang'),
    wire('plIn', 'words', 'plPalette', 'words'),
    wire('plPalette', 'palette', 'plKitPal', 'palette'),
    wire('plIn', 'band', 'plKitPal', 'band'),
    wire('plIn', 'lang', 'plKitPal', 'lang'),
    wire('plIn', 'words', 'plKitPal', 'words'),
    wire('plIn', 'botName', 'plKitPal', 'botName'),
    // Teach: the pad shows, each press is a block AND a step of the robot (the engine's step, not a copy of it).
    wire('plTeach', 'onClick', 'plTeachMode', 'to-teach'),
    wire('plTeach', 'onClick', 'plRunner', 'stop'),
    wire('plStop', 'onClick', 'plTeachMode', 'to-idle'),
    wire('plStop', 'onClick', 'plChoose', 'go'),
    wire('plTeachMode', 'teaching', 'plPad', 'show'),
    wire('plTeachMode', 'teaching', 'plRec', 'mounted'),
    wire('plTeachMode', 'teaching', 'plStop', 'mounted'),
    wire('plTeachMode', 'notTeaching', 'plTeach', 'mounted'),
    wire('plPad', 'op', 'plRecord', 'op'),
    wire('plPad', 'pressed', 'plRecord', 'go'),
    wire('plRead', 'program', 'plRecord', 'program'),
    wire('plWorldVar', 'value', 'plRecord', 'world'),
    wire('plBlocks', 'onSelected', 'plRecord', 'selected'),
    wire('plIn', 'lang', 'plRecord', 'lang'),
    wire('plTeachBumpsVar', 'value', 'plRecord', 'bumps'),
    wire('plRecord', 'world', 'plSetWorldRec', 'value'),
    wire('plRecord', 'ran', 'plSetWorldRec', 'do'),
    wire('plRecord', 'bumps', 'plSetTeachBumps', 'value'),
    wire('plRecord', 'ran', 'plSetTeachBumps', 'do'),
    // Play, One step: the runner. Play ends teaching and any prediction.
    wire('plRead', 'program', 'plRunner', 'program'),
    wire('plStart', 'world', 'plRunner', 'start'),
    wire('plIn', 'lang', 'plRunner', 'lang'),
    wire('plIn', 'stepMs', 'plRunner', 'stepMs'),
    wire('plPlay', 'onClick', 'plRunner', 'play'),
    wire('plPlay', 'onClick', 'plTeachMode', 'to-idle'),
    wire('plPlay', 'onClick', 'plPredictMode', 'to-off'),
    wire('plPlay', 'onClick', 'plClearMiss', 'do'),
    wire('plStep', 'onClick', 'plRunner', 'step'),
    wire('plStep', 'onClick', 'plTeachMode', 'to-idle'),
    wire('plRunner', 'idle', 'plTeach', 'enabled'),
    wire('plRunner', 'idle', 'plStep', 'enabled'),
    wire('plRunner', 'idle', 'plReset', 'enabled'),
    wire('plRunner', 'running', 'plOut', 'running'),
    // The world as the kit draws it.
    wire('plWorldVar', 'value', 'plDraw', 'world'),
    wire('plIn', 'botName', 'plDraw', 'botName'),
    wire('plIn', 'color', 'plDraw', 'color'),
    wire('plIn', 'eye', 'plDraw', 'eye'),
    wire('plIn', 'hat', 'plDraw', 'hat'),
    wire('plRunner', 'bumps', 'plDraw', 'bumps'),
    wire('plTeachBumpsVar', 'value', 'plDraw', 'teachBumps'),
    wire('plRunner', 'sayKey', 'plDraw', 'sayKey'),
    wire('plRunner', 'tick', 'plDraw', 'sayN'),
    wire('plIn', 'words', 'plDraw', 'words'),
    wire('plIn', 'lang', 'plDraw', 'lang'),
    wire('plPredictEnd', 'x', 'plDraw', 'endX'),
    wire('plPredictEnd', 'y', 'plDraw', 'endY'),
    wire('plMissVar', 'value', 'plDraw', 'showEnd'),
    wire('plDraw', 'map', 'plGarden', 'map'),
    wire('plDraw', 'things', 'plGarden', 'things'),
    wire('plDraw', 'robots', 'plGarden', 'robots'),
    wire('plDraw', 'bubble', 'plGarden', 'bubble'),
    wire('plDraw', 'dots', 'plDots', 'text'),
    wire('plDraw', 'hasTulips', 'plDots', 'mounted'),
    // Predict (band 10–12, AC6): a tap before Play. A hit plays; a miss shows the real end and a hint — never a score.
    wire('plPredict', 'onClick', 'plPredictMode', 'to-on'),
    wire('plPredictMode', 'predicting', 'plPredictLine', 'mounted'),
    wire('plPredictMode', 'predicting', 'plPredictGate', 'condition'),
    wire('plGarden', 'onTileTapped', 'plPredictGate', 'eval'),
    wire('plPredictGate', 'ontrue', 'plPredictMode', 'to-off'),
    wire('plPredictGate', 'ontrue', 'plPredictEnd', 'go'),
    wire('plRead', 'program', 'plPredictEnd', 'program'),
    wire('plStart', 'world', 'plPredictEnd', 'world'),
    wire('plGarden', 'onTileX', 'plPredictEnd', 'tapX'),
    wire('plGarden', 'onTileY', 'plPredictEnd', 'tapY'),
    wire('plIn', 'lang', 'plPredictEnd', 'lang'),
    wire('plPredictEnd', 'hit', 'plHitGate', 'condition'),
    wire('plPredictEnd', 'ran', 'plHitGate', 'eval'),
    wire('plHitGate', 'ontrue', 'plRunner', 'play'),
    wire('plHitGate', 'onfalse', 'plSetMiss', 'do'),
    wire('plSetMiss', 'done', 'plChoose', 'go'),
    // The fold (band 10–12): offered, never applied without "Fold it".
    wire('plRead', 'program', 'plFind', 'program'),
    wire('plIn', 'band', 'plFind', 'band'),
    wire('plFind', 'offer', 'plTidyLine', 'isOffered'),
    wire('plFind', 'textKey', 'plTidyLine', 'textKey'),
    wire('plFind', 'vars', 'plTidyLine', 'vars'),
    wire('plFind', 'sample', 'plTidyLine', 'sample'),
    wire('plRead', 'text', 'plTidyLine', 'programText'),
    wire('plDismissVar', 'value', 'plTidyLine', 'dismissed'),
    wire('plIn', 'words', 'plTidyLine', 'words'),
    wire('plIn', 'lang', 'plTidyLine', 'lang'),
    wire('plIn', 'botName', 'plTidyLine', 'botName'),
    wire('plTidyLine', 'show', 'plTidy', 'mounted'),
    wire('plTidyLine', 'text', 'plTidyText', 'text'),
    wire('plRead', 'text', 'plSetDismiss', 'value'),
    wire('plNotNow', 'onClick', 'plSetDismiss', 'do'),
    wire('plRead', 'program', 'plFold', 'program'),
    wire('plFind', 'i', 'plFold', 'i'),
    wire('plFind', 'len', 'plFold', 'len'),
    wire('plFind', 'count', 'plFold', 'count'),
    wire('plFind', 'containerId', 'plFold', 'containerId'),
    wire('plFoldBtn', 'onClick', 'plFold', 'go'),
    wire('plFold', 'ran', 'plChoose', 'go'),
    // Hints: asked for, never waited on.
    wire('plRead', 'program', 'plChoose', 'program'),
    wire('plRunner', 'run', 'plChoose', 'run'),
    wire('plWorldVar', 'value', 'plChoose', 'world'),
    wire('plGoal', 'met', 'plChoose', 'goalMet'),
    wire('plMissVar', 'value', 'plChoose', 'predictAsked'),
    wire('plAsk', 'onClick', 'plChoose', 'go'),
    wire('plIn', 'hints', 'plLine', 'hints'),
    wire('plChoose', 'key', 'plLine', 'key'),
    wire('plChoose', 'vars', 'plLine', 'vars'),
    wire('plIn', 'lang', 'plLine', 'lang'),
    wire('plIn', 'botName', 'plLine', 'botName'),
    wire('plLine', 'text', 'plOwlRow', 'written'),
    wire('plChoose', 'key', 'plOwlRow', 'hintKey'),
    wire('plChoose', 'vars', 'plOwlRow', 'vars'),
    wire('plIn', 'lang', 'plOwlRow', 'lang'),
    wire('plIn', 'words', 'plOwlRow', 'words'),
    wire('plIn', 'botName', 'plOwlRow', 'botName'),
    wire('plRunner', 'waiting', 'plOwlRow', 'waiting'),
    wire('plAskOlive', 'answer', 'plOwlRow', 'answer'),
    wire('plOwlRow', 'text', 'plOwlSay', 'text'),
    // A run parked on an ask block: Olive is asked once; her answer (or the written one) resumes it.
    wire('plRunner', 'request', 'plAskOlive', 'request'),
    wire('plRunner', 'run', 'plAskOlive', 'run'),
    wire('plIn', 'band', 'plAskOlive', 'band'),
    wire('plRunner', 'parked', 'plAskOlive', 'go'),
    wire('plAskOlive', 'answer', 'plRunner', 'answer'),
    wire('plAskOlive', 'ran', 'plRunner', 'answered'),
    // The end of a run: was the goal met? A win shows the card and tells the page.
    wire('plRunner', 'finished', 'plGoal', 'go'),
    wire('plWorldVar', 'value', 'plGoal', 'world'),
    wire('plRunner', 'run', 'plGoal', 'run'),
    wire('plRead', 'program', 'plGoal', 'program'),
    wire('plStart', 'goal', 'plGoal', 'goal'),
    wire('plGoal', 'met', 'plMetGate', 'condition'),
    wire('plGoal', 'ran', 'plMetGate', 'eval'),
    wire('plGoal', 'ran', 'plChoose', 'go'),
    wire('plMetGate', 'ontrue', 'plSetWon', 'do'),
    wire('plMetGate', 'ontrue', 'plOut', 'won'),
    wire('plWonVar', 'value', 'plWin', 'show'),
    wire('plRead', 'program', 'plWinSum', 'program'),
    wire('plStart', 'request', 'plWinSum', 'request'),
    wire('plIn', 'words', 'plWinSum', 'words'),
    wire('plIn', 'lang', 'plWinSum', 'lang'),
    wire('plIn', 'botName', 'plWinSum', 'botName'),
    wire('plCard', 'faceClass', 'plWin', 'faceClass'),
    wire('plWinSum', 'thanks', 'plWin', 'thanks'),
    wire('plWinSum', 'line', 'plWin', 'line'),
    wire('plWinSum', 'rewardText', 'plWin', 'rewardText'),
    wire('plWinSum', 'hasReward', 'plWin', 'hasReward'),
    wire('plWinSum', 'learnText', 'plWin', 'learnText'),
    wire('plWinSum', 'hasLearn', 'plWin', 'hasLearn'),
    wire('plWinSum', 'bloom', 'plOut', 'bloom'),
    wire('plWinSum', 'reward', 'plOut', 'reward'),
    wire('plWinSum', 'requestId', 'plOut', 'wonRequest'),
    wire('plWin', 'stay', 'plClearWon', 'do'),
    wire('plWin', 'island', 'plClearWon', 'do'),
    wire('plWin', 'island', 'plOut', 'island')
  ]
};

// ── Island/* ────────────────────────────────────────────────────────────────

const QUEST: CgComponent = {
  path: 'Island/Request card',
  description: 'One request on the island (the mockup\u2019s .quest): the islander\u2019s face, what they ask, the trick as a coloured tag, or ✓ done. Publishes Chosen with the Id.',
  nodes: [
    inputs('qcIn', [['id', 'string'], ['who', 'string'], ['title', 'string'], ['trick', 'string'], ['faceClass', 'string'], ['tagClass', 'string'], ['isDone', 'boolean'], ['doneWord', 'string']]),
    group('qcCard', 'The card', undefined, { width: pct(100), sizeMode: 'contentHeight', backgroundColor: 'var(--card)', borderRadius: px(16), ...pad(12), cssClassName: 'bg-quest bg-press' }, ['qcFace', 'qcText', 'qcSide']),
    group('qcFace', 'The islander', 'qcCard', { sizeMode: 'explicit', width: px(52), height: px(52) }),
    group('qcText', 'Who and what', 'qcCard', column({ rowGap: sp(2) }), ['qcWho', 'qcTitle']),
    text('qcWho', 'Who asks', 'qcText', '', { ...T_H3, fontSize: px(17) }),
    text('qcTitle', 'What they ask', 'qcText', '', T_SMALL),
    group('qcSide', 'The trick, or done', 'qcCard', { sizeMode: 'contentSize' }, ['qcTag', 'qcDone']),
    // The tag's fill is its class (bg-tag-motion / -control / -ask, each a block token): a parameter would beat the class.
    group('qcTag', 'The trick', 'qcSide', { sizeMode: 'contentSize', ...pad(4, 9), cssClassName: 'bg-tag bg-tag-control' }, ['qcTagText']),
    text('qcTagText', 'The trick', 'qcTag', '', { sizeMode: 'contentSize', fontSize: px(12), fontWeight: '800', color: 'var(--on-fill)' }),
    text('qcDone', 'Done', 'qcSide', '', { sizeMode: 'contentSize', fontSize: px(14), fontWeight: '800', color: 'var(--leaf)', mounted: false }),
    logic('qcIsDone', CONDITION_NODE, 'Done already?'),
    withStates('qcStates', 'Open or done', ['open', 'done'], {
      tagShown: { type: 'boolean', by: { open: true, done: false } },
      doneShown: { type: 'boolean', by: { open: false, done: true } },
      opacity: { type: 'number', by: { open: 1, done: 0.7 } }
    }),
    outputs('qcOut', [['chosen', 'signal'], ['id', 'string']])
  ],
  connections: [
    wire('qcIn', 'faceClass', 'qcFace', 'cssClassName'),
    wire('qcIn', 'tagClass', 'qcTag', 'cssClassName'),
    wire('qcIn', 'who', 'qcWho', 'text'),
    wire('qcIn', 'title', 'qcTitle', 'text'),
    wire('qcIn', 'trick', 'qcTagText', 'text'),
    wire('qcIn', 'doneWord', 'qcDone', 'text'),
    wire('qcIn', 'isDone', 'qcIsDone', 'condition'),
    wire('qcIsDone', 'ontrue', 'qcStates', 'to-done'),
    wire('qcIsDone', 'onfalse', 'qcStates', 'to-open'),
    wire('qcStates', 'tagShown', 'qcTag', 'mounted'),
    wire('qcStates', 'doneShown', 'qcDone', 'mounted'),
    wire('qcStates', 'opacity', 'qcCard', 'opacity'),
    wire('qcCard', 'onClick', 'qcOut', 'chosen'),
    wire('qcIn', 'id', 'qcOut', 'id')
  ]
};

// ── Robot/* ─────────────────────────────────────────────────────────────────

const SWATCH: CgComponent = {
  path: 'Robot/Swatch',
  description: 'One paint for the robot (the mockup’s .sw button): a round swatch in its token, ringed when Selected. Publishes Picked with the Id (the paint).',
  nodes: [
    inputs('swIn', [['id', 'string'], ['fill', 'string'], ['label', 'string'], ['selected', 'boolean']]),
    group('swDot', 'The swatch', undefined, { sizeMode: 'explicit', width: px(44), height: px(44), borderRadius: px(999), backgroundColor: 'var(--robot-coral)', cssClassName: 'bg-swatch bg-press' }),
    logic('swIsOn', CONDITION_NODE, 'Is it worn?'),
    withStates('swStates', 'Ringed or not', ['off', 'on'], { ring: { type: 'number', by: { off: 0, on: 4 } } }),
    outputs('swOut', [['picked', 'signal'], ['id', 'string']])
  ],
  connections: [
    wire('swIn', 'fill', 'swDot', 'backgroundColor'),
    wire('swIn', 'selected', 'swIsOn', 'condition'),
    wire('swIsOn', 'ontrue', 'swStates', 'to-on'),
    wire('swIsOn', 'onfalse', 'swStates', 'to-off'),
    wire('swStates', 'ring', 'swDot', 'borderWidth'),
    wire('swDot', 'onClick', 'swOut', 'picked'),
    wire('swIn', 'id', 'swOut', 'id')
  ]
};

const CHIP: CgComponent = {
  path: 'Robot/Chip',
  description: 'One choice for the robot (eyes, a hat): a pill, ink when Selected, faded and deaf when Locked (a hat still to earn). Publishes Picked with the Id.',
  nodes: [
    inputs('cpIn', [['id', 'string'], ['label', 'string'], ['selected', 'boolean'], ['locked', 'boolean']]),
    group('cpPill', 'The pill', undefined, { sizeMode: 'contentSize', ...pad(8, 14), backgroundColor: 'var(--paper-2)', borderRadius: px(999), cssClassName: 'bg-chip bg-press' }, ['cpText']),
    text('cpText', 'The word', 'cpPill', '', { sizeMode: 'contentSize', fontSize: px(16), fontWeight: '800', color: 'var(--ink)' }),
    logic('cpIsOn', CONDITION_NODE, 'Is it worn?'),
    withStates('cpStates', 'Worn or not', ['off', 'on'], {
      bg: { type: 'color', by: { off: 'var(--paper-2)', on: 'var(--ink)' } },
      fg: { type: 'color', by: { off: 'var(--ink)', on: 'var(--on-fill)' } }
    }),
    logic('cpIsLocked', CONDITION_NODE, 'Still to earn?'),
    withStates('cpLock', 'Earned or not', ['open', 'locked'], { opacity: { type: 'number', by: { open: 1, locked: 0.5 } } }),
    gate('cpGate', 'Only an earned one answers'),
    outputs('cpOut', [['picked', 'signal'], ['id', 'string']])
  ],
  connections: [
    wire('cpIn', 'label', 'cpText', 'text'),
    wire('cpIn', 'selected', 'cpIsOn', 'condition'),
    wire('cpIsOn', 'ontrue', 'cpStates', 'to-on'),
    wire('cpIsOn', 'onfalse', 'cpStates', 'to-off'),
    wire('cpStates', 'bg', 'cpPill', 'backgroundColor'),
    wire('cpStates', 'fg', 'cpText', 'color'),
    wire('cpIn', 'locked', 'cpIsLocked', 'condition'),
    wire('cpIsLocked', 'ontrue', 'cpLock', 'to-locked'),
    wire('cpIsLocked', 'onfalse', 'cpLock', 'to-open'),
    wire('cpLock', 'opacity', 'cpPill', 'opacity'),
    wire('cpIn', 'locked', 'cpGate', 'condition'),
    wire('cpPill', 'onClick', 'cpGate', 'eval'),
    wire('cpGate', 'onfalse', 'cpOut', 'picked'),
    wire('cpIn', 'id', 'cpOut', 'id')
  ]
};

const STICKER: CgComponent = {
  path: 'Robot/Sticker',
  description: 'One sticker on the robot’s shell (the mockup’s .stickers span).',
  nodes: [
    inputs('stIn', [['label', 'string']]),
    group('stBox', 'The sticker', undefined, { sizeMode: 'contentSize', backgroundColor: 'var(--card)', ...pad(6, 10), cssClassName: 'bg-sticker' }, ['stText']),
    text('stText', 'The sticker', 'stBox', '', { sizeMode: 'contentSize', fontSize: px(14), fontWeight: '800', color: 'var(--ink)' })
  ],
  connections: [wire('stIn', 'label', 'stText', 'text')]
};

/** A labelled row of repeated choices, for the options panel. */
function choiceRow(p: string, key: string, parentId: string, label: string, template: string): N[] {
  return [
    text(`${p}${key}L`, label, parentId, '', { ...T_H3, fontSize: px(16) }),
    group(`${p}${key}Row`, `${label}: the choices`, parentId, row({ width: pct(100), sizeMode: 'contentHeight', columnGap: sp(10) }), [`${p}${key}Each`]),
    { ...logic(`${p}${key}Each`, FOR_EACH_NODE, `One per ${label.toLowerCase()}`, { template, templateType: 'explicit' }), parent: `${p}${key}Row` }
  ];
}

const OPTIONS: CgComponent = {
  path: 'Robot/Options',
  description: 'The My robot panel (the mockup’s .opts): the name, the paint, the eyes, the hat (a gift from the islander it came from), the stickers. Every change is written through Model and Write.',
  nodes: [
    inputs('opIn', [['model', 'object'], ['profileId', 'string'], ['botName', 'string'], ['color', 'string'], ['eye', 'string'], ['hat', 'string'], ['hats', '*'], ['stickers', '*'], ['words', 'array'], ['lang', 'string']]),
    group('opPanel', 'The options', undefined, { ...column({ rowGap: sp(8) }), ...PANEL }, ['opNameL', 'opName', 'opColourL', 'opColourRow', 'opEyesL', 'opEyesRow', 'opHatL', 'opHatRow', 'opStickL', 'opStickRow', 'opNoStick']),
    text('opNameL', 'Name', 'opPanel', '', { ...T_H3, fontSize: px(16) }),
    place('opName', TEXT_INPUT_NODE, 'The robot’s name', 'opPanel', { sizeMode: 'contentHeight', width: pct(100), maxWidth: px(320), fontSize: px(22), fontWeight: '800', color: 'var(--ink)', backgroundColor: 'var(--card)', borderStyle: 'solid', borderWidth: px(2), borderColor: 'var(--line)', borderRadius: px(14), ...pad(10, 14), maxLength: 14 }),
    ...choiceRow('op', 'Colour', 'opPanel', 'Colour', C.swatch),
    ...choiceRow('op', 'Eyes', 'opPanel', 'Eyes', C.chip),
    ...choiceRow('op', 'Hat', 'opPanel', 'Hat', C.chip),
    ...choiceRow('op', 'Stick', 'opPanel', 'Stickers', C.sticker),
    text('opNoStick', 'No stickers yet', 'opPanel', '', { ...T_SMALL, mounted: false }),
    logic('opT', L('Translate words'), 'In their language'),
    logic('opRows', L('Look rows'), 'What there is to wear'),
    logic('opSetName', L('Update profile'), 'The name', { field: 'robotName' }),
    logic('opSetColour', L('Update profile'), 'The paint', { field: 'color' }),
    logic('opSetEye', L('Update profile'), 'The eyes', { field: 'eye' }),
    logic('opSetHat', L('Update profile'), 'The hat', { field: 'hat' }),
    outputs('opOut', [['model', 'object'], ['write', 'signal']])
  ],
  connections: [
    wire('opIn', 'words', 'opT', 'words'),
    wire('opIn', 'lang', 'opT', 'lang'),
    wire('opIn', 'botName', 'opT', 'botName'),
    wire('opT', 'rbName', 'opNameL', 'text'),
    wire('opT', 'rbColour', 'opColourL', 'text'),
    wire('opT', 'rbEyes', 'opEyesL', 'text'),
    wire('opT', 'rbHat', 'opHatL', 'text'),
    wire('opT', 'rbStickers', 'opStickL', 'text'),
    wire('opT', 'stickersNone', 'opNoStick', 'text'),
    wire('opIn', 'botName', 'opName', 'startValue'),
    ...(['color', 'eye', 'hat', 'hats', 'stickers', 'words', 'lang', 'botName'] as const).map((f) => wire('opIn', f, 'opRows', f)),
    wire('opRows', 'paints', 'opColourEach', 'items'),
    wire('opRows', 'eyes', 'opEyesEach', 'items'),
    wire('opRows', 'hats', 'opHatEach', 'items'),
    wire('opRows', 'stickers', 'opStickEach', 'items'),
    wire('opRows', 'noStickers', 'opNoStick', 'mounted'),
    ...(['opSetName', 'opSetColour', 'opSetEye', 'opSetHat'] as const).flatMap((u) => [wire('opIn', 'model', u, 'model'), wire('opIn', 'profileId', u, 'profileId'), wire(u, 'model', 'opOut', 'model'), wire(u, 'ran', 'opOut', 'write')]),
    wire('opName', 'onTextChanged', 'opSetName', 'value'),
    wire('opName', 'onBlur', 'opSetName', 'go'),
    wire('opName', 'onEnter', 'opSetName', 'go'),
    wire('opColourEach', 'itemOutput-id', 'opSetColour', 'value'),
    wire('opColourEach', 'itemOutputSignal-picked', 'opSetColour', 'go'),
    wire('opEyesEach', 'itemOutput-id', 'opSetEye', 'value'),
    wire('opEyesEach', 'itemOutputSignal-picked', 'opSetEye', 'go'),
    wire('opHatEach', 'itemOutput-id', 'opSetHat', 'value'),
    wire('opHatEach', 'itemOutputSignal-picked', 'opSetHat', 'go')
  ]
};

// ── Skills/* ────────────────────────────────────────────────────────────────

const SKILL: CgComponent = {
  path: 'Skills/Card',
  description: 'One trick (the mockup\u2019s .notion): seed, sprouted or blooming, its block, what it does, where it sits in the programme. No score; nothing wilts.',
  nodes: [
    inputs('skIn', [['id', 'string'], ['cardClass', 'string'], ['stateClass', 'string'], ['stateText', 'string'], ['title', 'string'], ['text', 'string'], ['blockWord', 'string'], ['blockClass', 'string'], ['prog', 'string'], ['isBlooming', 'boolean']]),
    group('skCard', 'The card', undefined, { ...column({ rowGap: sp(8) }), backgroundColor: 'var(--card)', borderRadius: 'var(--radius-card)', ...pad(14), cssClassName: 'bg-notion' }, ['skState', 'skTitle', 'skBlockRow', 'skText', 'skProg']),
    // The state's colour and the block's fill are classes (bg-st-*, bg-blk-*): a parameter would beat them.
    text('skState', 'How far it grew', 'skCard', '', { fontSize: px(12), fontWeight: '800', cssClassName: 'bg-caps' }),
    text('skTitle', 'The trick', 'skCard', '', T_H3),
    group('skBlockRow', 'Its block', 'skCard', row(), ['skBlock']),
    group('skBlock', 'The block', 'skBlockRow', { sizeMode: 'contentSize', ...pad(8, 12), cssClassName: 'bg-blk' }, ['skBlockText']),
    text('skBlockText', 'The block\u2019s word', 'skBlock', '', { sizeMode: 'contentSize', fontSize: px(15), fontWeight: '800', color: 'var(--on-fill)' }),
    text('skText', 'What it does', 'skCard', '', T_SMALL),
    text('skProg', 'In the programme', 'skCard', '', { fontSize: px(12), color: 'var(--ink-2)', cssClassName: 'bg-prog' }),
    logic('skIsBloom', CONDITION_NODE, 'Blooming?'),
    withStates('skGrowth', 'Grown or not', ['seed', 'bloom'], { weight: { type: 'string', by: { seed: '600', bloom: '800' } } }),
    outputs('skOut', [['clicked', 'signal']])
  ],
  connections: [
    wire('skIn', 'cardClass', 'skCard', 'cssClassName'),
    wire('skIn', 'stateClass', 'skState', 'cssClassName'),
    wire('skIn', 'stateText', 'skState', 'text'),
    wire('skIn', 'title', 'skTitle', 'text'),
    wire('skIn', 'blockClass', 'skBlock', 'cssClassName'),
    wire('skIn', 'blockWord', 'skBlockText', 'text'),
    wire('skIn', 'text', 'skText', 'text'),
    wire('skIn', 'prog', 'skProg', 'text'),
    wire('skIn', 'isBlooming', 'skIsBloom', 'condition'),
    wire('skIsBloom', 'ontrue', 'skGrowth', 'to-bloom'),
    wire('skIsBloom', 'onfalse', 'skGrowth', 'to-seed'),
    wire('skGrowth', 'weight', 'skTitle', 'fontWeight'),
    wire('skCard', 'onClick', 'skOut', 'clicked')
  ]
};

// ── Profiles/* ──────────────────────────────────────────────────────────────

const PROFILE: CgComponent = {
  path: 'Profiles/Card',
  description: 'One player (the only "login"): a face, a name, the band and the robot’s name. Selected rings it. Publishes Chosen with the Id.',
  nodes: [
    inputs('pcIn', [['id', 'string'], ['name', 'string'], ['face', 'string'], ['band', 'string'], ['robot', 'string'], ['selected', 'boolean']]),
    group('pcCard', 'The card', undefined, { ...column({ alignItems: 'center', rowGap: sp(6) }), width: px(160), backgroundColor: 'var(--card)', borderRadius: 'var(--radius-card)', ...pad(16, 12), borderStyle: 'solid', borderWidth: px(3), borderColor: 'transparent', cssClassName: 'bg-profile bg-press' }, ['pcFace', 'pcName', 'pcBand', 'pcRobot']),
    place('pcFace', KIT_AVATAR, 'The face', 'pcCard', { look: 'fun-emoji', seed: 'Pip', size: 72, background: 'var(--sun)' }),
    text('pcName', 'The name', 'pcCard', '', { ...T_H3, textAlignX: 'center' }),
    text('pcBand', 'The band', 'pcCard', '', { ...T_SMALL, textAlignX: 'center' }),
    text('pcRobot', 'The robot', 'pcCard', '', { ...T_SMALL, textAlignX: 'center' }),
    logic('pcIsOn', CONDITION_NODE, 'The one playing?'),
    withStates('pcStates', 'Chosen or not', ['off', 'on'], { edge: { type: 'color', by: { off: 'transparent', on: 'var(--leaf)' } } }),
    outputs('pcOut', [['chosen', 'signal'], ['id', 'string']])
  ],
  connections: [
    wire('pcIn', 'face', 'pcFace', 'seed'),
    wire('pcIn', 'name', 'pcName', 'text'),
    wire('pcIn', 'band', 'pcBand', 'text'),
    wire('pcIn', 'robot', 'pcRobot', 'text'),
    wire('pcIn', 'selected', 'pcIsOn', 'condition'),
    wire('pcIsOn', 'ontrue', 'pcStates', 'to-on'),
    wire('pcIsOn', 'onfalse', 'pcStates', 'to-off'),
    wire('pcStates', 'edge', 'pcCard', 'borderColor'),
    wire('pcCard', 'onClick', 'pcOut', 'chosen'),
    wire('pcFace', 'onClick', 'pcOut', 'chosen'),
    wire('pcIn', 'id', 'pcOut', 'id')
  ]
};

/**
 * A new player: a name, the band, the language, the robot's name. The choices are held in Variables (one form is ever
 * on screen) and written with their defaults each time it opens (Reset), so an unopened form never reads undefined.
 */
const FORM: CgComponent = {
  path: 'Profiles/Form',
  description: 'The new-player form: a name, the age band, the language and the robot’s name. Reset writes the defaults (band 10–12, the current language, Pip). Publishes Create with every field, or Cancel.',
  nodes: [
    inputs('pfIn', [['open', 'boolean'], ['reset', 'signal'], ['lang', 'string'], ['words', 'array']]),
    group('pfCard', 'The form', undefined, { ...column({ rowGap: sp(12) }), ...PANEL, maxWidth: px(520), mounted: false }, ['pfNameL', 'pfName', 'pfBandL', 'pfBandRow', 'pfLangL', 'pfLangRow', 'pfBotL', 'pfBot', 'pfButtons']),
    text('pfNameL', 'Your name', 'pfCard', '', { ...T_H3, fontSize: px(16) }),
    place('pfName', TEXT_INPUT_NODE, 'The name', 'pfCard', { sizeMode: 'contentHeight', width: pct(100), fontSize: px(20), fontWeight: '800', color: 'var(--ink)', backgroundColor: 'var(--card)', borderStyle: 'solid', borderWidth: px(2), borderColor: 'var(--line)', borderRadius: px(14), ...pad(10, 14), maxLength: 24 }),
    text('pfBandL', 'Your age', 'pfCard', '', { ...T_H3, fontSize: px(16) }),
    group('pfBandRow', 'The two bands', 'pfCard', { ...row({ columnGap: sp(0) }), backgroundColor: 'var(--paper-2)', borderRadius: px(999), ...pad(3), cssClassName: 'bg-seg' }, ['pfB1', 'pfB2']),
    place('pfB1', C.seg, '7–9', 'pfBandRow', { label: '7–9' }),
    place('pfB2', C.seg, '10–12', 'pfBandRow', { label: '10–12' }),
    text('pfLangL', 'Language', 'pfCard', '', { ...T_H3, fontSize: px(16) }),
    group('pfLangRow', 'The two languages', 'pfCard', { ...row({ columnGap: sp(0) }), backgroundColor: 'var(--paper-2)', borderRadius: px(999), ...pad(3), cssClassName: 'bg-seg' }, ['pfEn', 'pfFr']),
    place('pfEn', C.seg, 'English', 'pfLangRow', { label: 'English' }),
    place('pfFr', C.seg, 'Français', 'pfLangRow', { label: 'Français' }),
    text('pfBotL', 'Your robot’s name', 'pfCard', '', { ...T_H3, fontSize: px(16) }),
    place('pfBot', TEXT_INPUT_NODE, 'The robot’s name', 'pfCard', { sizeMode: 'contentHeight', width: pct(100), fontSize: px(20), fontWeight: '800', color: 'var(--ink)', backgroundColor: 'var(--card)', borderStyle: 'solid', borderWidth: px(2), borderColor: 'var(--line)', borderRadius: px(14), ...pad(10, 14), maxLength: 14, startValue: 'Pip' }),
    group('pfButtons', 'Go or not', 'pfCard', row(), ['pfGo', 'pfCancel']),
    place('pfGo', BUTTON_NODE, 'Let’s go', 'pfButtons', { ...btn('primary', 'play'), label: 'Let’s go!' }),
    place('pfCancel', BUTTON_NODE, 'Cancel', 'pfButtons', { ...btn('quiet'), label: 'Cancel' }),
    logic('pfT', L('Translate words'), 'In their language'),
    logic('pfLit', L('Bar state'), 'Which is pressed'),
    variable('pfBandVar', 'gardenNewBand', 'The chosen band'),
    setVariable('pfSetB1', 'gardenNewBand', 'Band 7–9', { setWith: 'number', value: 1 }),
    setVariable('pfSetB2', 'gardenNewBand', 'Band 10–12', { setWith: 'number', value: 2 }),
    variable('pfLangVar', 'gardenNewLang', 'The chosen language'),
    setVariable('pfSetEn', 'gardenNewLang', 'English', { setWith: 'string', value: 'en' }),
    setVariable('pfSetFr', 'gardenNewLang', 'French', { setWith: 'string', value: 'fr' }),
    setVariable('pfSetLangNow', 'gardenNewLang', 'The language on screen'),
    outputs('pfOut', [['create', 'signal'], ['cancel', 'signal'], ['name', 'string'], ['band', 'number'], ['lang', 'string'], ['robotName', 'string']])
  ],
  connections: [
    wire('pfIn', 'open', 'pfCard', 'mounted'),
    wire('pfIn', 'words', 'pfT', 'words'),
    wire('pfIn', 'lang', 'pfT', 'lang'),
    wire('pfT', 'yourName', 'pfNameL', 'text'),
    wire('pfT', 'yourBand', 'pfBandL', 'text'),
    wire('pfT', 'language', 'pfLangL', 'text'),
    wire('pfT', 'robotName', 'pfBotL', 'text'),
    wire('pfT', 'create', 'pfGo', 'label'),
    wire('pfT', 'cancel', 'pfCancel', 'label'),
    // Reset: the defaults, written, so nothing reads undefined.
    wire('pfIn', 'reset', 'pfSetB2', 'do'),
    wire('pfIn', 'lang', 'pfSetLangNow', 'value'),
    wire('pfIn', 'reset', 'pfSetLangNow', 'do'),
    wire('pfB1', 'clicked', 'pfSetB1', 'do'),
    wire('pfB2', 'clicked', 'pfSetB2', 'do'),
    wire('pfEn', 'clicked', 'pfSetEn', 'do'),
    wire('pfFr', 'clicked', 'pfSetFr', 'do'),
    wire('pfBandVar', 'value', 'pfLit', 'band'),
    wire('pfLangVar', 'value', 'pfLit', 'lang'),
    wire('pfLit', 'band1On', 'pfB1', 'isOn'),
    wire('pfLit', 'band2On', 'pfB2', 'isOn'),
    wire('pfLit', 'enOn', 'pfEn', 'isOn'),
    wire('pfLit', 'frOn', 'pfFr', 'isOn'),
    wire('pfName', 'onTextChanged', 'pfOut', 'name'),
    wire('pfBot', 'onTextChanged', 'pfOut', 'robotName'),
    wire('pfIn', 'reset', 'pfName', 'clear'),
    wire('pfBandVar', 'value', 'pfOut', 'band'),
    wire('pfLangVar', 'value', 'pfOut', 'lang'),
    wire('pfGo', 'onClick', 'pfOut', 'create'),
    wire('pfCancel', 'onClick', 'pfOut', 'cancel')
  ]
};

// ── Grown/* ─────────────────────────────────────────────────────────────────

const GU_OLIVE: CgComponent = {
  path: 'Grown/Olive panel',
  description: 'Where Olive lives (from the shell\u2019s status door): this computer\u2019s small model, awake or not, and her exam here. With no shell, the game says she uses her written lines.',
  nodes: [
    inputs('goIn', [['words', 'array'], ['lang', 'string'], ['botName', 'string']]),
    group('goPanel', 'Where Olive lives', undefined, { ...column({ rowGap: sp(8) }), ...PANEL }, ['goH', 'goModel', 'goNone', 'goExam', 'goNoExam']),
    text('goH', 'Where Olive lives', 'goPanel', '', T_H3),
    group('goModel', 'This computer', 'goPanel', { ...row({ width: pct(100), sizeMode: 'contentHeight', columnGap: sp(10), flexWrap: 'nowrap' }), backgroundColor: 'var(--paper-2)', borderRadius: px(12), ...pad(10) }, ['goDot', 'goModelText']),
    group('goDot', 'Awake or not', 'goModel', { sizeMode: 'explicit', width: px(10), height: px(10), backgroundColor: 'var(--off)', cssClassName: 'bg-dot' }),
    group('goModelText', 'The model', 'goModel', column({ rowGap: sp(2) }), ['goModelH', 'goModelOn', 'goModelOff']),
    text('goModelH', 'This computer', 'goModelText', '', T_STRONG),
    text('goModelOn', 'Awake', 'goModelText', '', { ...T_SMALL, mounted: false }),
    text('goModelOff', 'Not running', 'goModelText', '', T_SMALL),
    group('goNone', 'No model at all', 'goPanel', { ...row({ width: pct(100), sizeMode: 'contentHeight', columnGap: sp(10), flexWrap: 'nowrap' }), backgroundColor: 'var(--paper-2)', borderRadius: px(12), ...pad(10) }, ['goNoneDot', 'goNoneText']),
    group('goNoneDot', 'Off', 'goNone', { sizeMode: 'explicit', width: px(10), height: px(10), backgroundColor: 'var(--off)', cssClassName: 'bg-dot' }),
    text('goNoneText', 'No model at all', 'goNone', '', T_SMALL),
    text('goExam', 'Her exam here', 'goPanel', '', { ...T_SMALL, mounted: false }),
    text('goNoExam', 'No exam yet', 'goPanel', '', T_SMALL),
    logic('goT', L('Translate words'), 'In their language'),
    logic('goStatus', L('Olive status'), 'Ask the shell', { nonce: 1 }),
    // The exam line through the same line filler the owl uses: a { key, en, fr } table, a key, the vars.
    logic('goExamLine', L('Hint line'), 'The exam in words', { key: 'guExam' }),
    logic('goIsOn', CONDITION_NODE, 'Is she awake?'),
    withStates('goStates', 'Awake or not', ['off', 'on'], {
      dot: { type: 'color', by: { off: 'var(--off)', on: 'var(--ok)' } },
      awake: { type: 'boolean', by: { off: false, on: true } },
      asleep: { type: 'boolean', by: { off: true, on: false } }
    })
  ],
  connections: [
    wire('goIn', 'words', 'goT', 'words'),
    wire('goIn', 'lang', 'goT', 'lang'),
    wire('goIn', 'botName', 'goT', 'botName'),
    wire('goT', 'guWhereH', 'goH', 'text'),
    wire('goT', 'guHere', 'goModelH', 'text'),
    wire('goT', 'guHereOn', 'goModelOn', 'text'),
    wire('goT', 'guHereOff', 'goModelOff', 'text'),
    wire('goT', 'guNoModel', 'goNoneText', 'text'),
    wire('goT', 'guExamNone', 'goNoExam', 'text'),
    wire('goStatus', 'running', 'goIsOn', 'condition'),
    wire('goIsOn', 'ontrue', 'goStates', 'to-on'),
    wire('goIsOn', 'onfalse', 'goStates', 'to-off'),
    wire('goStates', 'dot', 'goDot', 'backgroundColor'),
    wire('goStates', 'awake', 'goModelOn', 'mounted'),
    wire('goStates', 'asleep', 'goModelOff', 'mounted'),
    wire('goStatus', 'hasExam', 'goExam', 'mounted'),
    wire('goStatus', 'noExam', 'goNoExam', 'mounted'),
    wire('goIn', 'words', 'goExamLine', 'hints'),
    wire('goIn', 'lang', 'goExamLine', 'lang'),
    wire('goIn', 'botName', 'goExamLine', 'botName'),
    wire('goStatus', 'examVars', 'goExamLine', 'vars'),
    wire('goExamLine', 'text', 'goExam', 'text')
  ]
};

const RULES = ['guR1', 'guR2', 'guR3', 'guR4'];
const HOUSE = ['guD1', 'guD2', 'guD3'];

const GU_RULES: CgComponent = {
  path: 'Grown/Rules panel',
  description: 'What Olive is allowed to do: four lines, the same in the shell’s own checks (CG-004).',
  nodes: [
    inputs('grIn', [['words', 'array'], ['lang', 'string']]),
    group('grPanel', 'What Olive may do', undefined, { ...column({ rowGap: sp(6) }), ...PANEL }, ['grH', ...RULES.map((r) => `gr_${r}`)]),
    text('grH', 'What Olive is allowed to do', 'grPanel', '', T_H3),
    ...RULES.map((r) => text(`gr_${r}`, r, 'grPanel', '', { ...T_MUTED, cssClassName: 'bg-li' })),
    logic('grT', L('Translate words'), 'In their language')
  ],
  connections: [wire('grIn', 'words', 'grT', 'words'), wire('grIn', 'lang', 'grT', 'lang'), wire('grT', 'guRulesH', 'grH', 'text'), ...RULES.map((r) => wire('grT', r, `gr_${r}`, 'text'))]
};

const GU_HOUSE: CgComponent = {
  path: 'Grown/House panel',
  description: 'Nothing leaves the house: three lines, Try Olive (a thank-you rung, slots only; the written line when she does not answer) and the save code.',
  nodes: [
    inputs('ghIn', [['words', 'array'], ['lang', 'string'], ['botName', 'string'], ['model', 'object']]),
    group('ghPanel', 'Nothing leaves the house', undefined, { ...column({ rowGap: sp(6) }), ...PANEL }, ['ghH', ...HOUSE.map((r) => `gh_${r}`), 'ghTryH', 'ghTryRow', 'ghOut', 'ghCodeH', 'ghCodeLine', 'ghCode']),
    text('ghH', 'Nothing leaves the house', 'ghPanel', '', T_H3),
    ...HOUSE.map((r) => text(`gh_${r}`, r, 'ghPanel', '', { ...T_MUTED, cssClassName: 'bg-li' })),
    text('ghTryH', 'Try Olive', 'ghPanel', '', { ...T_H3, marginTop: sp(8) }),
    group('ghTryRow', 'The ask', 'ghPanel', row({ width: pct(100), sizeMode: 'contentHeight' }), ['ghPrompt', 'ghAsk']),
    text('ghPrompt', 'What she is asked', 'ghTryRow', '', { ...T_BODY, fontWeight: '700' }),
    place('ghAsk', BUTTON_NODE, 'Ask', 'ghTryRow', { ...btn('ask', 'owl'), label: 'Ask' }),
    group('ghOut', 'Her reply', 'ghPanel', { ...column({ rowGap: sp(2) }), backgroundColor: 'var(--violet-2)', borderRadius: px(12), ...pad(10, 12) }, ['ghNote', 'ghReply']),
    text('ghNote', 'Where it came from', 'ghOut', '', { fontSize: px(12), fontWeight: '700', color: 'var(--violet-meta)' }),
    text('ghReply', 'The reply', 'ghOut', '—', { ...T_BODY, fontWeight: '700' }),
    text('ghCodeH', 'Save code', 'ghPanel', '', { ...T_H3, marginTop: sp(8) }),
    text('ghCodeLine', 'What it is for', 'ghPanel', '', T_SMALL),
    text('ghCode', 'The code', 'ghPanel', '', { fontSize: px(13), color: 'var(--ink)', cssClassName: 'bg-code' }),
    logic('ghT', L('Translate words'), 'In their language'),
    // The rung and its slots are parameters: who is thanked and for what, from the rung table's own lists (olive-templates.json).
    logic('ghAskOlive', L('Try Olive'), 'Ask her', { rung: 'say-thanks', slots: { to: 'Mamie Rose', deed: 'watered her three tulips' } }),
    logic('ghEncode', L('Encode save code'), 'The family as a code')
  ],
  connections: [
    wire('ghIn', 'words', 'ghT', 'words'),
    wire('ghIn', 'lang', 'ghT', 'lang'),
    wire('ghIn', 'botName', 'ghT', 'botName'),
    wire('ghT', 'guDataH', 'ghH', 'text'),
    ...HOUSE.map((r) => wire('ghT', r, `gh_${r}`, 'text')),
    wire('ghT', 'guTryH', 'ghTryH', 'text'),
    wire('ghT', 'guTryPrompt', 'ghPrompt', 'text'),
    wire('ghT', 'guTryGo', 'ghAsk', 'label'),
    wire('ghT', 'guTryNote', 'ghNote', 'text'),
    wire('ghT', 'saveCodeH', 'ghCodeH', 'text'),
    wire('ghT', 'guSaveLine', 'ghCodeLine', 'text'),
    wire('ghIn', 'lang', 'ghAskOlive', 'lang'),
    wire('ghT', 'thanksMamie', 'ghAskOlive', 'fallback'),
    wire('ghAsk', 'onClick', 'ghAskOlive', 'go'),
    wire('ghAskOlive', 'text', 'ghReply', 'text'),
    wire('ghIn', 'model', 'ghEncode', 'model'),
    wire('ghEncode', 'code', 'ghCode', 'text')
  ]
};

// ── The App ─────────────────────────────────────────────────────────────────

export const APP_NODES = [
  group('app_root', 'App', undefined, { sizeMode: 'explicit', width: pct(100), height: pct(100), backgroundColor: 'var(--paper)' }, ['app_router']),
  { id: 'app_router', type: 'Router', label: 'Main router', parent: 'app_root', parameters: { name: ROUTER } },
  logic('app_css', CSS_NODE, 'The look (CG-007)', { style: GARDEN_CSS })
];
export const APP_WIRES: unknown[] = [];

// ── Pages ───────────────────────────────────────────────────────────────────

/** What every page starts with: the Page, the ground, the bar, the store, the family, the words. */
function pageCommon(p: string, title: string, urlPath: string, page: string, main: string[], opts: { tabs?: boolean; band?: boolean } = {}): { nodes: N[]; connections: unknown[] } {
  return {
    nodes: [
      { id: `${p}Page`, type: 'Page', label: title, parameters: { title: 'Bot Garden', urlPath }, children: [`${p}Wrap`] },
      group(`${p}Wrap`, 'The screen', `${p}Page`, { ...column({ rowGap: sp(14), maxWidth: px(1360) }), ...pad(12, 16), paddingBottom: sp(40) }, [`${p}Bar`, ...main]),
      place(`${p}Bar`, C.bar, 'The bar', `${p}Wrap`, { page, showTabs: opts.tabs !== false, showBand: opts.band !== false }),
      logic(`${p}Store`, C.store, 'The family, stored'),
      logic(`${p}Fam`, L('Read family'), 'Who is playing'),
      variable(`${p}LangVar`, 'gardenLang', 'The language before anyone is chosen'),
      logic(`${p}Words`, C.words, 'The words'),
      logic(`${p}T`, L('Translate words'), 'In their language')
    ],
    connections: [
      wire(`${p}Store`, 'model', `${p}Fam`, 'model'),
      wire(`${p}LangVar`, 'value', `${p}Fam`, 'fallbackLang'),
      wire(`${p}Words`, 'words', `${p}T`, 'words'),
      wire(`${p}Fam`, 'lang', `${p}T`, 'lang'),
      wire(`${p}Fam`, 'botName', `${p}T`, 'botName'),
      wire(`${p}Fam`, 'band', `${p}Bar`, 'band'),
      wire(`${p}Fam`, 'lang', `${p}Bar`, 'lang'),
      wire(`${p}Fam`, 'name', `${p}Bar`, 'name'),
      wire(`${p}Fam`, 'face', `${p}Bar`, 'face'),
      wire(`${p}Fam`, 'botName', `${p}Bar`, 'botName'),
      wire(`${p}Fam`, 'profileId', `${p}Bar`, 'profileId'),
      wire(`${p}Words`, 'words', `${p}Bar`, 'words'),
      wire(`${p}Store`, 'model', `${p}Bar`, 'model'),
      wire(`${p}Bar`, 'model', `${p}Store`, 'model'),
      wire(`${p}Bar`, 'write', `${p}Store`, 'write')
    ]
  };
}

/** A page with a head (eyebrow, title, line). */
function headWires(p: string, eyebrow: string, title: string, sub: string): unknown[] {
  return [wire(`${p}T`, eyebrow, `${p}Head`, 'eyebrow'), wire(`${p}T`, title, `${p}Head`, 'title'), wire(`${p}T`, sub, `${p}Head`, 'sub')];
}

const PAGE_PROFILES: CgComponent = (() => {
  const base = pageCommon('pr', 'Profiles', '', 'profiles', ['prHead', 'prList', 'prFull', 'prNew', 'prForm'], { tabs: false, band: false });
  return {
    path: 'Pages/Profiles',
    description: 'Who is playing: the family’s players as cards (up to six), and the new-player form. Choosing one is the only login; it goes to the island.',
    repeats: { source: 'array', rowFields: ['id', 'name', 'face', 'band', 'robot', 'selected'] },
    nodes: [
      ...base.nodes,
      place('prHead', C.head, 'The head', 'prWrap'),
      group('prList', 'The players', 'prWrap', row({ width: pct(100), sizeMode: 'contentHeight', columnGap: sp(14), rowGap: sp(14) }), ['prEach']),
      { ...logic('prEach', FOR_EACH_NODE, 'One card per player', { template: C.profile, templateType: 'explicit' }), parent: 'prList' },
      text('prFull', 'The family is full', 'prWrap', '', { ...T_SMALL, mounted: false }),
      place('prNew', BUTTON_NODE, 'New player', 'prWrap', { ...btn('primary'), label: 'New player' }),
      place('prForm', C.form, 'The form', 'prWrap'),
      logic('prSelect', L('Select profile'), 'Choose one'),
      logic('prAdd', L('Add profile'), 'Make one'),
      withStates('prFormMode', 'The form open or not', ['closed', 'open'], {
        open: { type: 'boolean', by: { closed: false, open: true } },
        closed: { type: 'boolean', by: { closed: true, open: false } }
      }),
      navigate('prGoIsland', C.pageIsland, 'To the island'),
      setVariable('prLangEn', 'gardenLang', 'English before anyone is chosen', { setWith: 'string', value: 'en' }),
      setVariable('prLangFr', 'gardenLang', 'French before anyone is chosen', { setWith: 'string', value: 'fr' })
    ],
    connections: [
      ...base.connections,
      ...headWires('pr', 'brand', 'whoIsPlaying', 'pickProfile'),
      wire('prFam', 'profiles', 'prEach', 'items'),
      wire('prT', 'familyFull', 'prFull', 'text'),
      wire('prT', 'newProfile', 'prNew', 'label'),
      // Choose: write the choice, then the island once it is written.
      wire('prStore', 'model', 'prSelect', 'model'),
      wire('prEach', 'itemOutput-id', 'prSelect', 'profileId'),
      wire('prEach', 'itemOutputSignal-chosen', 'prSelect', 'go'),
      wire('prSelect', 'model', 'prStore', 'model'),
      wire('prSelect', 'ran', 'prStore', 'write'),
      // Create.
      wire('prNew', 'onClick', 'prFormMode', 'to-open'),
      wire('prNew', 'onClick', 'prForm', 'reset'),
      wire('prFormMode', 'open', 'prForm', 'open'),
      wire('prFam', 'lang', 'prForm', 'lang'),
      wire('prWords', 'words', 'prForm', 'words'),
      wire('prForm', 'cancel', 'prFormMode', 'to-closed'),
      wire('prStore', 'model', 'prAdd', 'model'),
      wire('prForm', 'name', 'prAdd', 'name'),
      wire('prForm', 'name', 'prAdd', 'face'),
      wire('prForm', 'band', 'prAdd', 'band'),
      wire('prForm', 'lang', 'prAdd', 'lang'),
      wire('prForm', 'robotName', 'prAdd', 'robotName'),
      wire('prForm', 'create', 'prAdd', 'go'),
      wire('prAdd', 'model', 'prStore', 'model'),
      wire('prAdd', 'ran', 'prStore', 'write'),
      wire('prFam', 'canAdd', 'prNew', 'mounted'),
      wire('prStore', 'written', 'prGoIsland', 'navigate'),
      wire('prBar', 'pickedEn', 'prLangEn', 'do'),
      wire('prBar', 'pickedFr', 'prLangFr', 'do')
    ]
  };
})();

const PAGE_ISLAND: CgComponent = (() => {
  const base = pageCommon('is', 'Island', 'island', 'island', ['isHead', 'isGrid']);
  return {
    path: 'Pages/Island',
    description: 'The island: the map with every robot of the family on it (D2), and the islanders’ open requests tagged with the trick they teach, then free play. Nothing is timed; nothing is counted.',
    repeats: { source: 'array', rowFields: ['id', 'who', 'title', 'trick', 'faceClass', 'tagClass', 'isDone', 'doneWord'] },
    nodes: [
      ...base.nodes,
      place('isHead', C.head, 'The head', 'isWrap'),
      group('isGrid', 'Map and requests', 'isWrap', { width: pct(100), sizeMode: 'contentHeight', cssClassName: 'bg-island' }, ['isMap', 'isQuests']),
      group('isMap', 'The map', 'isGrid', { width: pct(100), sizeMode: 'contentHeight', cssClassName: 'bg-map' }, ['isGarden']),
      place('isGarden', KIT_GARDEN, 'The island', 'isMap', { stepMs: STEP_MS, label: 'The island' }),
      group('isQuests', 'The requests', 'isGrid', column({ rowGap: sp(10) }), ['isReqL', 'isList', 'isFreeL', 'isFree']),
      text('isReqL', 'Requests', 'isQuests', '', T_EYEBROW),
      group('isList', 'The open requests', 'isQuests', column({ rowGap: sp(10) }), ['isEach']),
      { ...logic('isEach', FOR_EACH_NODE, 'One card per request', { template: C.quest, templateType: 'explicit' }), parent: 'isList' },
      text('isFreeL', 'Free play', 'isQuests', '', { ...T_EYEBROW, marginTop: sp(8) }),
      place('isFree', C.quest, 'Free play', 'isQuests', { id: 'free', faceClass: 'bg-face bg-sp-owl', tagClass: 'bg-tag bg-tag-motion', isDone: false, doneWord: '' }),
      logic('isRequests', C.requests, 'The requests'),
      logic('isRows', L('Island rows'), 'Who needs a hand'),
      logic('isWorld', L('Island world'), 'The island and its robots'),
      setVariable('isSetReq', 'gardenRequestId', 'This request'),
      setVariable('isSetFree', 'gardenRequestId', 'Free play', { setWith: 'string', value: 'free' }),
      navigate('isGoWorkshop', C.pageWorkshop, 'To the workshop')
    ],
    connections: [
      ...base.connections,
      ...headWires('is', 'isEyebrow', 'isTitle', 'isSub'),
      wire('isT', 'isReq', 'isReqL', 'text'),
      wire('isT', 'isFree', 'isFreeL', 'text'),
      wire('isT', 'sandH', 'isFree', 'who'),
      wire('isT', 'sandP', 'isFree', 'title'),
      wire('isT', 'isFree', 'isFree', 'trick'),
      wire('isRequests', 'requests', 'isRows', 'requests'),
      wire('isFam', 'done', 'isRows', 'done'),
      wire('isFam', 'band', 'isRows', 'band'),
      wire('isWords', 'words', 'isRows', 'words'),
      wire('isFam', 'lang', 'isRows', 'lang'),
      wire('isFam', 'botName', 'isRows', 'botName'),
      wire('isRows', 'rows', 'isEach', 'items'),
      wire('isStore', 'model', 'isWorld', 'model'),
      wire('isWords', 'words', 'isWorld', 'words'),
      wire('isFam', 'lang', 'isWorld', 'lang'),
      wire('isWorld', 'map', 'isGarden', 'map'),
      wire('isWorld', 'things', 'isGarden', 'things'),
      wire('isWorld', 'robots', 'isGarden', 'robots'),
      wire('isEach', 'itemOutput-id', 'isSetReq', 'value'),
      wire('isEach', 'itemOutputSignal-chosen', 'isSetReq', 'do'),
      wire('isSetReq', 'done', 'isGoWorkshop', 'navigate'),
      wire('isFree', 'chosen', 'isSetFree', 'do'),
      wire('isSetFree', 'done', 'isGoWorkshop', 'navigate')
    ]
  };
})();

/** A reload has no request in hand (`gardenRequestId` lives in memory): the workshop sends it to the island (AC8). */
const PAGE_WORKSHOP: CgComponent = (() => {
  const base = pageCommon('ws', 'Workshop', 'workshop', 'workshop', ['wsPlay']);
  return {
    path: 'Pages/Workshop',
    description: 'The workshop for the chosen request: the robot, the blocks and the owl on one screen. A win is stored for the profile that earned it (the hat, the tricks) and for the island (done for both robots, D2). With no request (a reload), the island.',
    nodes: [
      ...base.nodes,
      place('wsPlay', C.play, 'The workshop', 'wsWrap', { stepMs: TICK_MS }),
      variable('wsReqVar', 'gardenRequestId', 'The chosen request'),
      logic('wsRequests', C.requests, 'The requests'),
      logic('wsHints', C.hints, 'The hints'),
      logic('wsComplete', L('Complete request'), 'Done: the island, the tricks, the reward'),
      logic('wsGuardWait', TIMER_NODE, 'A moment for the request to arrive', { duration: 600 }),
      gate('wsGuard', 'Is there a request?'),
      navigate('wsGoIsland', C.pageIsland, 'To the island')
    ],
    connections: [
      ...base.connections,
      wire('wsReqVar', 'value', 'wsPlay', 'requestId'),
      wire('wsRequests', 'requests', 'wsPlay', 'requests'),
      wire('wsHints', 'hints', 'wsPlay', 'hints'),
      wire('wsWords', 'words', 'wsPlay', 'words'),
      ...(['lang', 'band', 'botName', 'color', 'eye', 'hat'] as const).map((f) => wire('wsFam', f, 'wsPlay', f)),
      wire('wsFam', 'older', 'wsPlay', 'isOlder'),
      // A win: stored, and the island marks it done.
      wire('wsStore', 'model', 'wsComplete', 'model'),
      wire('wsPlay', 'wonRequest', 'wsComplete', 'requestId'),
      wire('wsFam', 'profileId', 'wsComplete', 'profileId'),
      wire('wsPlay', 'bloom', 'wsComplete', 'tricks'),
      wire('wsPlay', 'reward', 'wsComplete', 'reward'),
      wire('wsPlay', 'won', 'wsComplete', 'go'),
      wire('wsComplete', 'model', 'wsStore', 'model'),
      wire('wsComplete', 'ran', 'wsStore', 'write'),
      wire('wsPlay', 'island', 'wsGoIsland', 'navigate'),
      // AC8: no request after a moment (a reload, a typed URL) → the island, the profile kept (it is stored).
      wire('wsPage', 'didMount', 'wsGuardWait', 'start'),
      wire('wsPlay', 'found', 'wsGuard', 'condition'),
      wire('wsGuardWait', 'timerFinished', 'wsGuard', 'eval'),
      wire('wsGuard', 'onfalse', 'wsGoIsland', 'navigate')
    ]
  };
})();

/** The robot on its stage: a one-tile garden, the kit's own robot at its size (never a second drawing of it). */
const STAGE_WORLD = { map: ['G'], things: [], robots: [{ id: 'me', x: 0, y: 0, d: 0, carry: [] }], events: [], schedule: [] };

const PAGE_ROBOT: CgComponent = (() => {
  const base = pageCommon('rb', 'My robot', 'robot', 'robot', ['rbHead', 'rbGrid']);
  return {
    path: 'Pages/My robot',
    description: 'My robot: the robot big on its stage, and the name, paint, eyes, hat (gifts, never bought) and stickers.',
    nodes: [
      ...base.nodes,
      place('rbHead', C.head, 'The head', 'rbWrap'),
      group('rbGrid', 'Stage and options', 'rbWrap', { width: pct(100), sizeMode: 'contentHeight', cssClassName: 'bg-robo' }, ['rbStage', 'rbOptions']),
      group('rbStage', 'The stage', 'rbGrid', { width: pct(100), sizeMode: 'contentHeight', cssClassName: 'bg-robo-stage' }, ['rbGarden']),
      place('rbGarden', KIT_GARDEN, 'The robot', 'rbStage', { stepMs: STEP_MS, label: 'My robot' }),
      logic('rbDraw', L('Draw world'), 'The robot in its looks', { world: STAGE_WORLD }),
      place('rbOptions', C.options, 'The options', 'rbGrid')
    ],
    connections: [
      ...base.connections,
      ...headWires('rb', 'navRobot', 'rbTitle', 'rbSub'),
      ...(['botName', 'color', 'eye', 'hat'] as const).map((f) => wire('rbFam', f, 'rbDraw', f)),
      wire('rbDraw', 'map', 'rbGarden', 'map'),
      wire('rbDraw', 'robots', 'rbGarden', 'robots'),
      wire('rbStore', 'model', 'rbOptions', 'model'),
      ...(['profileId', 'botName', 'color', 'eye', 'hat', 'hats', 'stickers', 'lang'] as const).map((f) => wire('rbFam', f, 'rbOptions', f)),
      wire('rbWords', 'words', 'rbOptions', 'words'),
      wire('rbOptions', 'model', 'rbStore', 'model'),
      wire('rbOptions', 'write', 'rbStore', 'write')
    ]
  };
})();

const PAGE_SKILLS: CgComponent = (() => {
  const base = pageCommon('sk', 'Skills', 'skills', 'skills', ['skHead', 'skPath']);
  return {
    path: 'Pages/Skills',
    description: 'Skills: the seven tricks, each a block, seed / sprouted / blooming, with where it sits in the programme. No score; nothing wilts.',
    repeats: { source: 'array', rowFields: ['id', 'cardClass', 'stateClass', 'stateText', 'title', 'text', 'blockWord', 'blockClass', 'prog', 'isBlooming'] },
    nodes: [
      ...base.nodes,
      place('skHead', C.head, 'The head', 'skWrap'),
      group('skPath', 'The seven tricks', 'skWrap', { width: pct(100), sizeMode: 'contentHeight', cssClassName: 'bg-path' }, ['skEach']),
      { ...logic('skEach', FOR_EACH_NODE, 'One card per trick', { template: C.skill, templateType: 'explicit' }), parent: 'skPath' },
      logic('skRows', L('Skill rows'), 'The tricks, grown or not')
    ],
    connections: [
      ...base.connections,
      ...headWires('sk', 'ntEyebrow', 'ntTitle', 'ntSub'),
      wire('skFam', 'tricks', 'skRows', 'tricks'),
      wire('skWords', 'words', 'skRows', 'words'),
      wire('skFam', 'lang', 'skRows', 'lang'),
      wire('skFam', 'botName', 'skRows', 'botName'),
      wire('skRows', 'rows', 'skEach', 'items')
    ]
  };
})();

const PAGE_GROWN: CgComponent = (() => {
  const base = pageCommon('gu', 'Grown-ups', 'grown-ups', 'grown', ['guHead', 'guGrid']);
  return {
    path: 'Pages/Grown-ups',
    description: 'For grown-ups: where Olive runs, what she may do, that nothing leaves the house, Try Olive, and the save code.',
    nodes: [
      ...base.nodes,
      place('guHead', C.head, 'The head', 'guWrap'),
      group('guGrid', 'Three panels', 'guWrap', { width: pct(100), sizeMode: 'contentHeight', cssClassName: 'bg-gu' }, ['guOlive', 'guRules', 'guHouse']),
      place('guOlive', C.guOlive, 'Where Olive lives', 'guGrid'),
      place('guRules', C.guRules, 'What she may do', 'guGrid'),
      place('guHouse', C.guHouse, 'Nothing leaves the house', 'guGrid')
    ],
    connections: [
      ...base.connections,
      ...headWires('gu', 'guEyebrow', 'guTitle', 'guSub'),
      ...(['guOlive', 'guRules', 'guHouse'] as const).flatMap((g) => [wire('guWords', 'words', g, 'words'), wire('guFam', 'lang', g, 'lang')]),
      wire('guFam', 'botName', 'guOlive', 'botName'),
      wire('guFam', 'botName', 'guHouse', 'botName'),
      wire('guStore', 'model', 'guHouse', 'model')
    ]
  };
})();

export const CG003_COMPONENTS: ReadonlyArray<CgComponent> = [
  ...DATA_COMPONENTS,
  ...LOGIC_COMPONENTS,
  APP_STORE,
  TAB,
  SEG,
  BAR,
  HEAD,
  PAD_KEY,
  PAD,
  RUNNER,
  WIN,
  PLAY,
  QUEST,
  SWATCH,
  CHIP,
  STICKER,
  OPTIONS,
  SKILL,
  PROFILE,
  FORM,
  GU_OLIVE,
  GU_RULES,
  GU_HOUSE,
  PAGE_PROFILES,
  PAGE_ISLAND,
  PAGE_WORKSHOP,
  PAGE_ROBOT,
  PAGE_SKILLS,
  PAGE_GROWN
];

export const REQUIRED_MODULES = ['garden-kit', 'game-kit'] as const;

export const PAGES = [C.pageProfiles, C.pageIsland, C.pageWorkshop, C.pageRobot, C.pageSkills, C.pageGrown] as const;
