/**
 * TPL-011 — the page-designer SPIKE: the smallest NodeGX app that holds tonight's decorated page.
 *
 * Not the journal. One page, a toolbar, the kit's `Journal Page`, and tonight's page kept as ONE
 * record in the app's own backend (`JournalPage`: `day`, `items`), loaded when the page opens. It
 * answers the spike's questions (TPL-011 §3.6, §3.7; DESKTOP §2) on the real tablet, inside the
 * Nightbook shell:
 *
 * - can a child move, resize and turn things with a finger, the pen and the mouse on a 4 GB m3;
 * - do the six display fonts render with no network (bundled, `nightbook-fonts`);
 * - does a photo from the picker, a drop or a paste reach the page, shrunk;
 * - does the page come back exactly after the app is closed and opened again.
 *
 * Authored through the MCP door like every template in this phase, with the kit installed
 * BEFORE authoring (TPL-005's finding: the door refuses a module's node type until the module is
 * in `noodl_modules/`).
 *
 * ── What it deliberately does not do (DESK-4's, not the spike's) ──────────────
 *
 * - **Photos are data: URLs inside `items`.** Every change writes the whole page, photos
 *   included. The JSON body limit is 10 MB (`nodegx-backend/src/server/http-util.ts:18`), so a
 *   page holds a few dozen photos at 1200 px. DESK-4 decides whether photos become files.
 * - **`JournalPage` is `public`** on a backend that listens on 127.0.0.1 only. There is no
 *   sign-in in the journal (the code unlocks the *screen*, D3 encrypts the data); who may write is
 *   DESK-4's question.
 * - **Closed days are not refused yet.** Only today's page is shown.
 *
 * @module noodl-mcp/tests/tpl011Spike
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { resolveKitExtractEntry } from '../src/kitOverlay';
import { createServer } from '../src/server';

import { copyTree } from './templatePins';

export const SPIKE_ID = 'nightbook-spike';
export const SPIKE_NAME = 'Nightbook (page designer spike)';
export const COLLECTION = 'JournalPage';
const KIT_MODULES = path.join(__dirname, '..', '..', '..', 'library', 'modules', 'nightbook-kit', 'project', 'noodl_modules');
export const REQUIRED_MODULES = ['nightbook-kit', 'nightbook-fonts'];

const PAGE = 'nightbook-kit.Page';
const FUNCTION = 'JavaScriptFunction';
const VARIABLE = 'Variable2';
const SET_VARIABLE = 'Set Variable';
const BUTTON = 'net.noodl.controls.button';
const QUERY = 'DbCollection2';
const CREATE = 'NewDbModelProperties';
const UPDATE = 'SetDbModelProperties';
const EXPRESSION = 'Expression';

const px = (value: number) => ({ value, unit: 'px' });
const pct = (value: number) => ({ value, unit: '%' });

const INK = '#F5F1FF';
const NIGHT = '#26244A';
const EDGE = '#413F75';

type Node = Record<string, unknown>;
type Wire = { fromId: string; fromProperty: string; toId: string; toProperty: string };

const wire = (fromId: string, fromProperty: string, toId: string, toProperty: string): Wire => ({ fromId, fromProperty, toId, toProperty });
const group = (id: string, label: string, parent: string, parameters: Record<string, unknown>): Node => ({ id, type: 'Group', label, parent, parameters });
const place = (id: string, type: string, label: string, parent: string, parameters: Record<string, unknown> = {}): Node => ({ id, type, label, parent, parameters });
const logic = (id: string, type: string, label: string, parameters: Record<string, unknown> = {}): Node => ({ id, type, label, parameters });
const quiet = (...names: string[]) => Object.fromEntries(names.map((n) => [`runOnChange-${n}`, false]));

const row = (extra: Record<string, unknown> = {}) => ({
  sizeMode: 'contentHeight',
  width: pct(100),
  flexDirection: 'row',
  flexWrap: 'wrap',
  alignItems: 'center',
  columnGap: px(8),
  rowGap: px(8),
  ...extra
});

/** A toolbar button: 48 px tall at least, the night palette, a clear edge. */
const button = (label: string, extra: Record<string, unknown> = {}) => ({
  label,
  sizeMode: 'contentSize',
  minHeight: px(44),
  paddingLeft: px(12),
  paddingRight: px(12),
  fontSize: px(16),
  color: INK,
  backgroundColor: 'transparent',
  borderStyle: 'solid',
  borderWidth: px(2),
  borderColor: EDGE,
  borderRadius: px(12),
  ...extra
});

/** Local calendar day, which is what "tonight" means (TPL-011 §3.8). */
export const TODAY_SCRIPT = `var d = new Date();
var p = function (n) { return (n < 10 ? '0' : '') + n; };
Outputs.day = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
Outputs.go();`;

/** The query's rows → tonight's items and the record's id. A record reads through get(). */
export const LOAD_SCRIPT = `var rows = Inputs.pages;
var list = [];
if (rows && typeof rows.forEach === 'function') rows.forEach(function (r) { list.push(r); });
var first = list[0];
var read = function (r, k) { return r && typeof r.get === 'function' ? r.get(k) : r && r[k]; };
var items = first ? read(first, 'items') : null;
// A fresh array every run: Outputs publish only on change.
Outputs.items = Array.isArray(items) ? items.slice() : [];
Outputs.id = first ? String((typeof first.getId === 'function' ? first.getId() : first.id) || '') : '';
var bg = first ? read(first, 'background') : '';
Outputs.background = typeof bg === 'string' ? bg : '';
Outputs.loaded();`;

/**
 * One write per change — a change is the kit's Changed OR a new background, because the background
 * is part of the page (measured: kept in a Variable only, it was gone after a restart while every
 * item came back). No record yet: create it, once — a second change while the create is in
 * flight waits, and the create's Done runs this again, which writes the newest page as an update.
 * The same page twice is not written twice.
 */
export const SAVE_SCRIPT = `var S = this.nbSave || (this.nbSave = { creating: false, saved: '' });
var items = Array.isArray(Inputs.items) ? Inputs.items : [];
var background = String(Inputs.background || '');
var json = JSON.stringify([items, background]);
var id = String(Inputs.id || '');
if (!id) {
  if (S.creating) return;
  S.creating = true;
  S.saved = json;
  Outputs.day = String(Inputs.day || '');
  Outputs.items = items.slice();
  Outputs.background = background;
  Outputs.create();
  return;
}
S.creating = false;
if (json === S.saved) return;
S.saved = json;
Outputs.id = id;
Outputs.items = items.slice();
Outputs.background = background;
Outputs.update();`;

const VAR = { font: 'nbFont', color: 'nbColor', effect: 'nbEffect', sticker: 'nbSticker', background: 'nbBackground', pageId: 'nbPageId', status: 'nbStatus' };

export const FONTS: Array<[string, string]> = [
  ['Chewy', 'Chewy'],
  ['Caveat', 'Caveat'],
  ['Bungee', 'Bungee'],
  ['Pacifico', 'Pacifico'],
  ['Cherry Bomb One', 'Cherry Bomb One'],
  ['Rubik Doodle Shadow', 'Rubik Doodle Shadow']
];
const EFFECTS: Array<[string, string]> = [
  ['Plain', 'none'],
  ['Rainbow', 'rainbow'],
  ['Wavy', 'wavy'],
  ['Outline', 'outline'],
  ['Shadow', 'shadow']
];
const COLOURS: Array<[string, string]> = [
  ['Purple', '#7B3FC4'],
  ['Pink', '#E0457B'],
  ['Sea', '#1E88C8'],
  ['Night', '#26244A']
];
const BACKGROUNDS: Array<[string, string]> = [
  ['Paper', '#FFFFFF'],
  ['Pink dots', 'radial-gradient(#FFC2DA 3px, #FFE9F2 3.5px) 0 0 / 14px 14px'],
  ['Stripes', 'repeating-linear-gradient(45deg, #7FE0C4 0 8px, #E8FFF8 8px 16px)'],
  ['Galaxy', 'radial-gradient(#FFFFFF 1px, #26244A 1.5px) 0 0 / 10px 10px']
];
const STICKERS: Array<[string, string]> = [
  ['★', '★'],
  ['♥', '♥'],
  ['ϟ', 'ϟ'],
  ['🌈', '🌈'],
  ['🐱', '🐱']
];

// ── App ─────────────────────────────────────────────────────────────────────

export const APP_NODES: Node[] = [
  { id: 'app_root', type: 'Group', label: 'App', parameters: { sizeMode: 'explicit', width: pct(100), height: pct(100), backgroundColor: NIGHT, flexDirection: 'column' } },
  { id: 'app_router', type: 'Router', label: 'Main router', parent: 'app_root', parameters: { name: 'Main' } },
  // With body scroll on, the App's 100% is the content's height, so the night stopped under the page and the
  // window below it was white (seen on the drive's tablet-size screenshot; the todo list met the same).
  { id: 'app_css', type: 'CSS Definition', label: 'The night behind everything', parameters: { style: `html, body { background: ${NIGHT}; }` } }
];

// ── Pages/Tonight ───────────────────────────────────────────────────────────

export function tonight(): { nodes: Node[]; connections: Wire[] } {
  const nodes: Node[] = [
    { id: 'tnPage', type: 'Page', label: 'Tonight', parameters: { title: 'Nightbook', urlPath: '' } },
    group('tnRoot', 'The page', 'tnPage', { width: pct(100), sizeMode: 'contentHeight', flexDirection: 'column', rowGap: px(12), paddingLeft: px(16), paddingRight: px(16), paddingTop: px(16), paddingBottom: px(24), backgroundColor: NIGHT }),
    place('tnTitle', 'Text', 'Tonight', 'tnRoot', { text: 'Tonight’s page', fontFamily: 'Chewy', fontSize: px(30), color: INK }),
    // The tools beside the page, not above it: on the tablet's 1368 × 912 window, four rows of tools
    // above the paper pushed the page below the fold (seen on the drive's first screenshot).
    group('tnDesk', 'Tools and paper', 'tnRoot', { width: pct(100), sizeMode: 'contentHeight', flexDirection: 'row', alignItems: 'flex-start', columnGap: px(16) }),
    group('tnTools', 'The tools', 'tnDesk', { width: { value: 330, unit: 'px', isFixed: true }, sizeMode: 'contentHeight', flexDirection: 'column', rowGap: px(10) }),
    group('tnAdd', 'Put something on the page', 'tnTools', row()),
    group('tnFonts', 'Letters', 'tnTools', row()),
    group('tnLooks', 'Effects and colours', 'tnTools', row()),
    group('tnGrounds', 'Backgrounds', 'tnTools', row()),
    // Not fixed: the paper takes the rest of the row beside the tools.
    group('tnPaper', 'The paper', 'tnDesk', { width: { value: 100, unit: '%', isFixed: false }, sizeMode: 'contentHeight', flexDirection: 'column' }),
    place('tnJournal', PAGE, 'Tonight’s decorated page', 'tnPaper', {
      pageWidth: 1000,
      pageHeight: 700,
      radius: '16px',
      inkColor: NIGHT,
      emptyTextHint: 'Type here…',
      photoMaxEdge: 1200,
      photoQuality: 0.8
    }),
    group('tnFoot', 'Under the page', 'tnRoot', row({ justifyContent: 'space-between' })),
    place('tnWords', 'Text', 'Words tonight', 'tnFoot', { text: '', fontSize: px(16), color: INK }),
    place('tnStatus', 'Text', 'Saved or not', 'tnFoot', { text: '', fontSize: px(16), color: '#B9B3DD' }),

    logic('tnToday', FUNCTION, 'What day is it?', { functionScript: TODAY_SCRIPT }),
    logic('tnQuery', QUERY, 'Tonight’s page, if there is one', {
      collectionName: COLLECTION,
      'runOnChange-collectionName': false,
      'runOnChange-querySettings': false,
      'runOnChange-qp-day': false,
      storageEnableLimit: true,
      storageLimit: 1,
      visualFilter: { combinator: 'and', rules: [{ property: 'day', operator: 'equal to', input: 'day' }] }
    }),
    logic('tnLoad', FUNCTION, 'Its items and its id', { functionScript: LOAD_SCRIPT }),
    logic('tnPageId', VARIABLE, 'The record tonight’s page is kept in', { name: VAR.pageId }),
    logic('tnKeepId', SET_VARIABLE, 'Remember the record', { name: VAR.pageId, setWith: 'string' }),
    logic('tnKeepBg', SET_VARIABLE, 'Put its background back', { name: VAR.background, setWith: 'string' }),
    logic('tnKeepNewId', SET_VARIABLE, 'Remember the new record', { name: VAR.pageId, setWith: 'string' }),
    logic('tnSave', FUNCTION, 'Write the page', { functionScript: SAVE_SCRIPT, ...quiet('in-items', 'in-id', 'in-day', 'in-background') }),
    logic('tnCreate', CREATE, 'Start tonight’s record', { collectionName: COLLECTION }),
    logic('tnUpdate', UPDATE, 'Keep the page', { collectionName: COLLECTION, idSource: 'explicit' }),
    logic('tnStatusVar', VARIABLE, 'Saved or not', { name: VAR.status }),
    logic('tnSaved', SET_VARIABLE, 'Say it is saved', { name: VAR.status, setWith: 'string', value: 'Saved on this tablet' }),
    logic('tnNotSaved', SET_VARIABLE, 'Say it is not saved', { name: VAR.status, setWith: 'string', value: 'Not saved — the page is still here, try again' }),
    logic('tnWordsLine', EXPRESSION, 'n words tonight', { expression: "(words || 0) + ((words || 0) === 1 ? ' word tonight' : ' words tonight')" }),
    ...(['font', 'color', 'effect', 'sticker', 'background'] as const).map((k) => logic(`tnVar_${k}`, VARIABLE, `The ${k} picked`, { name: VAR[k] }))
  ];
  const connections: Wire[] = [
    // Load: the day, then the query, then the kit.
    wire('tnRoot', 'didMount', 'tnToday', 'run'),
    wire('tnToday', 'out-day', 'tnQuery', 'qp-day'),
    wire('tnToday', 'out-go', 'tnQuery', 'storageFetch'),
    wire('tnQuery', 'items', 'tnLoad', 'in-pages'),
    wire('tnLoad', 'out-items', 'tnJournal', 'items'),
    wire('tnLoad', 'out-id', 'tnKeepId', 'value'),
    wire('tnLoad', 'out-loaded', 'tnKeepId', 'do'),
    wire('tnLoad', 'out-background', 'tnKeepBg', 'value'),
    wire('tnLoad', 'out-loaded', 'tnKeepBg', 'do'),
    wire('tnQuery', 'failure', 'tnNotSaved', 'do'),
    // Save: every Changed, once.
    wire('tnJournal', 'onItems', 'tnSave', 'in-items'),
    wire('tnPageId', 'value', 'tnSave', 'in-id'),
    wire('tnToday', 'out-day', 'tnSave', 'in-day'),
    wire('tnVar_background', 'value', 'tnSave', 'in-background'),
    wire('tnJournal', 'onChanged', 'tnSave', 'run'),
    wire('tnSave', 'out-day', 'tnCreate', 'prop-day'),
    wire('tnSave', 'out-items', 'tnCreate', 'prop-items'),
    wire('tnSave', 'out-background', 'tnCreate', 'prop-background'),
    wire('tnSave', 'out-background', 'tnUpdate', 'prop-background'),
    wire('tnSave', 'out-create', 'tnCreate', 'store'),
    wire('tnSave', 'out-id', 'tnUpdate', 'modelId'),
    wire('tnSave', 'out-items', 'tnUpdate', 'prop-items'),
    wire('tnSave', 'out-update', 'tnUpdate', 'store'),
    wire('tnCreate', 'id', 'tnKeepNewId', 'value'),
    wire('tnCreate', 'done', 'tnKeepNewId', 'do'),
    // The record exists now: write anything that changed while it was being made.
    wire('tnKeepNewId', 'done', 'tnSave', 'run'),
    wire('tnCreate', 'done', 'tnSaved', 'do'),
    wire('tnUpdate', 'done', 'tnSaved', 'do'),
    wire('tnCreate', 'failure', 'tnNotSaved', 'do'),
    wire('tnUpdate', 'failure', 'tnNotSaved', 'do'),
    wire('tnStatusVar', 'value', 'tnStatus', 'text'),
    wire('tnJournal', 'onWords', 'tnWordsLine', 'words'),
    wire('tnWordsLine', 'result', 'tnWords', 'text'),
    // The choice → the kit.
    wire('tnVar_font', 'value', 'tnJournal', 'font'),
    wire('tnVar_color', 'value', 'tnJournal', 'color'),
    wire('tnVar_effect', 'value', 'tnJournal', 'effect'),
    wire('tnVar_sticker', 'value', 'tnJournal', 'sticker'),
    wire('tnVar_background', 'value', 'tnJournal', 'background')
  ];

  const add = (id: string, label: string, signal: string) => {
    nodes.push(place(id, BUTTON, label, 'tnAdd', button(label)));
    connections.push(wire(id, 'onClick', 'tnJournal', signal));
  };
  add('tnAddText', 'Words', 'addText');
  add('tnAddBubble', 'Bubble', 'addBubble');
  add('tnAddPhoto', 'Photo', 'addPhoto');
  // A sticker button sets the sticker FIRST, and its Done adds it: the kit reads the new one.
  STICKERS.forEach(([label, ch], i) => {
    nodes.push(place(`tnSticker${i}`, BUTTON, `Sticker ${label}`, 'tnAdd', button(label, { fontSize: px(22) })));
    nodes.push(logic(`tnSetSticker${i}`, SET_VARIABLE, `Sticker ${label}`, { name: VAR.sticker, setWith: 'string', value: ch }));
    connections.push(wire(`tnSticker${i}`, 'onClick', `tnSetSticker${i}`, 'do'), wire(`tnSetSticker${i}`, 'done', 'tnJournal', 'addSticker'));
  });
  add('tnFront', 'To the front', 'bringToFront');
  add('tnRemove', 'Take it off', 'removePicked');

  const chooser = (parent: string, key: keyof typeof VAR, list: Array<[string, string]>, look: (value: string) => Record<string, unknown>) =>
    list.forEach(([label, value], i) => {
      const id = `tn_${key}${i}`;
      nodes.push(place(id, BUTTON, label, parent, button(label, look(value))));
      nodes.push(logic(`${id}Set`, SET_VARIABLE, `${key}: ${label}`, { name: VAR[key], setWith: 'string', value }));
      connections.push(wire(id, 'onClick', `${id}Set`, 'do'));
    });
  chooser('tnFonts', 'font', FONTS, (f) => ({ fontFamily: f, fontSize: px(18) }));
  chooser('tnLooks', 'effect', EFFECTS, () => ({}));
  chooser('tnLooks', 'color', COLOURS, (c) => ({ backgroundColor: c, color: c === NIGHT ? INK : '#FFFFFF' }));
  chooser('tnGrounds', 'background', BACKGROUNDS, () => ({}));
  // A background is part of the page: its Done writes the page, like the kit's Changed.
  BACKGROUNDS.forEach((_, i) => connections.push(wire(`tn_background${i}Set`, 'done', 'tnSave', 'run')));
  return { nodes, connections };
}

// ── Building it ─────────────────────────────────────────────────────────────

interface ToolResult {
  isError?: boolean;
  content?: Array<{ type: string; text: string }>;
}

export interface BuiltSpike {
  projectDir: string;
  diagnostics: Array<{ component: string; code: string; severity: string; message: string }>;
  registrations: Record<string, unknown>;
}

function writeSkeleton(dir: string): void {
  fs.mkdirSync(path.join(dir, 'components'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'nodegx.project.json'),
    JSON.stringify(
      {
        $schema: 'https://opennoodl.dev/schemas/project-v2.json',
        name: SPIKE_NAME,
        version: '4',
        nodegxVersion: '1.1.0',
        settings: { htmlTitle: 'Nightbook', navigationPathType: 'path', bodyScroll: true },
        structure: { componentsDir: 'components', assetsDir: 'assets' }
      },
      null,
      2
    )
  );
  fs.writeFileSync(
    path.join(dir, 'components', '_registry.json'),
    JSON.stringify(
      { $schema: 'https://opennoodl.dev/schemas/registry-v2.json', version: 1, lastUpdated: '2026-09-26T00:00:00.000Z', components: {}, stats: { totalComponents: 0, totalNodes: 0, totalConnections: 0 } },
      null,
      2
    )
  );
}

/** The backend's rules for this app: one collection, reachable from the page, never deleted. */
export const POLICY = {
  version: 1,
  devOpen: false,
  defaults: { permissions: { find: 'nobody', get: 'nobody', create: 'nobody', update: 'nobody', delete: 'nobody' }, creatorOwns: true },
  collections: {
    [COLLECTION]: { permissions: { find: 'public', get: 'public', create: 'public', update: 'public', delete: 'nobody' }, creatorOwns: false }
  },
  functions: {},
  files: { upload: 'nobody', read: 'nobody', delete: 'nobody' },
  signup: 'nobody'
};

export function installModules(projectDir: string): string[] {
  for (const name of REQUIRED_MODULES) {
    const from = path.join(KIT_MODULES, name);
    if (!fs.existsSync(path.join(from, 'manifest.json'))) throw new Error(`${name} is not built at ${from} — run node library/modules/nightbook-kit/build.mjs`);
    fs.cpSync(from, path.join(projectDir, 'noodl_modules', name), { recursive: true });
  }
  return REQUIRED_MODULES.slice();
}

export async function buildSpike(): Promise<BuiltSpike> {
  process.env.NODEGX_RENDER_DISABLED = '1';
  // 🔴 The door reads a project's kits through packages/noodl-mcp/dist/kit-extract.cjs, a gitignored build output.
  // Without it every kit node is "Unknown node type … ensure the module is installed" — with the module installed
  // (measured on a fresh CI runner, 2026-09-26; P78 D83). Say the real cause instead.
  const extractor = resolveKitExtractEntry();
  if (!extractor.entry) throw new Error(`the kit reader is not built (looked at ${extractor.probed.join(', ')}) — run: npm run build --workspace @noodl/mcp`);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tpl011-spike-'));
  writeSkeleton(dir);
  installModules(dir);

  const { server } = createServer({ projectDir: dir, allowWrites: true });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'tpl011-spike', version: '0.0.0' });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

  const diagnostics: BuiltSpike['diagnostics'] = [];
  const registrations: Record<string, unknown> = {};
  const call = async (name: string, args: Record<string, unknown>, label: string): Promise<Record<string, unknown>> => {
    const res = (await client.callTool({ name, arguments: args })) as ToolResult;
    if (res.isError) throw new Error(`${name} ${label} refused:\n${res.content?.[0]?.text}`);
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(res.content?.[0]?.text ?? '{}') as Record<string, unknown>;
    } catch {
      return {};
    }
    const raised = (payload.validation as { diagnostics?: Array<Record<string, unknown>> } | undefined)?.diagnostics;
    for (const d of raised ?? []) diagnostics.push({ component: label, code: String(d.code ?? ''), severity: String(d.severity ?? ''), message: String(d.message ?? '') });
    if (payload.registeredPages) registrations[label] = payload.registeredPages;
    return payload;
  };

  await call('create_component', { path: 'App', nodes: APP_NODES, connections: [] }, 'App');
  const t = tonight();
  await call('create_component', { path: 'Pages/Tonight', nodes: t.nodes, connections: t.connections }, 'Pages/Tonight');

  await client.close();
  await server.close();
  fs.writeFileSync(path.join(dir, 'nodegx.security.json'), JSON.stringify(POLICY, null, 2) + '\n');
  return { projectDir: dir, diagnostics, registrations };
}

/** Copy the built project to `output` (a directory named `nightbook-spike` or `spike-app`, and nothing else is cleared). */
export function prepareSpike(built: BuiltSpike, output: string): void {
  if (!/^(nightbook-spike|spike-app)$/.test(path.basename(output))) throw new Error(`refusing to clear ${output}`);
  fs.rmSync(output, { recursive: true, force: true });
  copyTree(built.projectDir, output);
  for (const name of REQUIRED_MODULES) {
    if (!fs.existsSync(path.join(output, 'noodl_modules', name, 'manifest.json'))) throw new Error(`refusing: noodl_modules/${name} is missing`);
  }
}
