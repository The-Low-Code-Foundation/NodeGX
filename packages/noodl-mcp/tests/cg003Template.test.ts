/**
 * CG-003 / CG-007 — the gate over the Bot Garden artefact.
 *
 * What a drive cannot grade cheaply, graded here on what the plan door writes:
 *
 * - **The door**: the whole template through one plan, the six pages on the router, no warning but the filed one (D50).
 * - **Determinism and drift**: two builds agree byte for byte, and `templates/bot-garden/` is what the generator writes.
 * - **The phase-85 floors**, recomputed, and the measurer script agrees.
 * - **The doctrine**: every `Logic/*` a named utility, every `FUNCTION_SCRIPTS` entry shipped, `States` without
 *   transitions (D49), every `go` Function's value inputs unticked, pages ≤ 32 nodes, page switches only by the router.
 * - **The look (CG-007)**: every colour a token and every token defined, the four buttons filled (never an outlined
 *   pill), the block colours fed to the kit as tokens, the win card fixed (P95 R6), reduced motion stills everything,
 *   Fredoka shipped with its licence, and the contrast table as a READOUT with the failing pairs named.
 * - **The glue, behaviourally**: each page-glue script run on its own, then the whole AC3 path — teach fifteen steps, fold,
 *   play to the end, the goal met, the request completed, the hat owned, the trick blooming — in plain JS, the same
 *   scripts the Functions run. Arms: each rule-bearing glue script mutated in memory, and the check that must kill it.
 *
 * @module noodl-mcp/tests/cg003Template.test
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execSync } from 'child_process';

import type { LegacyConnection, LegacyNode } from '../../noodl-editor/src/editor/src/io/ProjectExporter';

import { buildEffectiveTokens, checkFontFaces, getPreset } from '../src/editor-deps';
import { REQUESTS, WORDS, WORD_KEYS } from './cg002Content';
import { APPLY_DELTA_SCRIPT, COMPLETE_REQUEST_SCRIPT, FIND_REPEAT_SCRIPT, FOLD_SCRIPT, FUNCTION_SCRIPTS, GOAL_SCRIPT, NEW_RUN_SCRIPT, PALETTE_SCRIPT, STEP_SCRIPT, ADD_PROFILE_SCRIPT, TRANSLATE_SCRIPT, portsOf, runScript } from './cg002Scripts';
import { BLOCK_CARDS, IG006_WORDS, IG006_WORD_KEYS, PAGE_WORDS, PAGE_WORD_KEYS } from './cg003Content';
import { OLIVE_SCRIPTS, OLIVE_WORDS, OLIVE_WORD_KEYS } from './cg005Olive';
import { C, CG003_COMPONENTS, GAME_NAME, LOGIC_COMPONENTS, LOGIC_SPECS, PAGES, REQUIRED_MODULES, STORAGE_KEY, TICK_MS } from './cg003Components';
import {
  ALL_WORDS_JSON,
  PAD_KEYS_SCRIPT,
  TRY_OLIVE_SCRIPT,
  DRAW_WORLD_SCRIPT,
  GLUE_SCRIPTS,
  ISLAND_ROWS_SCRIPT,
  KIT_PALETTE_SCRIPT,
  OLIVE_HELD_SCRIPT,
  OLIVE_PLAYED_SCRIPT,
  LESSON_ROWS_SCRIPT,
  CARD_GATE_SCRIPT,
  CARD_SEEN_SCRIPT,
  BLOCK_CARD_SCRIPT,
  HELP_CHIPS_SCRIPT,
  OLIVE_LESSON_SCRIPT,
  CARD_PALETTE,
  OLIVE_STATUS_SCRIPT,
  READ_PROGRAM_SCRIPT,
  RENDERER_CHOICE_SCRIPT,
  RENDERER_SCRIPT,
  RECORD_STEP_SCRIPT,
  START_WORLD_SCRIPT,
  TIDY_LINE_SCRIPT,
  TRANSLATE_ALL_SCRIPT,
  UPDATE_PROFILE_SCRIPT,
  WIN_SUMMARY_SCRIPT,
  TEACH_START_SCRIPT,
  MODE_LINE_SCRIPT,
  CHALLENGE_SCRIPT,
  GLOW_SCRIPT
} from './cg003Scripts';
import { AuthoredGarden, buildGardenTemplateProject, prepareGardenArtefact, START_HERE_FILE, TEMPLATE_ID } from './cg003Template';
import { ROBOT_NAME_MAX } from './cg002Scripts';
import { DARKENED_FILLS, GARDEN_CSS, GARDEN_PRESET, GARDEN_TOKENS, tokenValue } from './cg007Look';
import { reducedMotionReport } from './reducedMotion';
import { RESERVED_ROW_FIELD_NAMES } from '../../noodl-editor/src/editor/src/validation';
import { FAMILY_SCRIPT, ISLAND_PINS_SCRIPT, LOOK_ROWS_SCRIPT, REQUEST_CARD_SCRIPT, SELECT_PROFILE_SCRIPT, SKILL_ROWS_SCRIPT } from './cg003Scripts';
// P106 IG-005: robots for the job.
import { GIFT_LINE_SCRIPT, JOB_ROBOT_SCRIPT, ROBOT_CARDS_SCRIPT } from './cg003Scripts';
import { CHOOSE_HINT_SCRIPT, HINT_LINE_SCRIPT, PREDICT_END_SCRIPT } from './cg002Scripts';
import { HINTS, HINT_KEYS, OLIVE_RUNGS } from './cg002Content';
import { PALETTE_RUNG_IDS } from './cg005Olive';
import { ISLAND_PINS, REQUEST_SUBS } from './cg003Content';

jest.setTimeout(600_000);

const REPO = path.join(__dirname, '..', '..', '..');
const OUTPUT = path.join(REPO, 'templates', TEMPLATE_ID);

let built: AuthoredGarden;
/** The Logic component every page reads the family through. */
const L_FAMILY = 'Logic/Read family';
/** The directory a person is handed, prepared from a build into a temp folder (never over the checked-in one). */
function OUTPUT_OF(b: AuthoredGarden): string {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cg003-look-')), TEMPLATE_ID);
  prepareGardenArtefact(b, out);
  return out;
}

const componentsOf = (b: AuthoredGarden) => b.project.components ?? [];
function nodesOf(b: AuthoredGarden, name: string): LegacyNode[] {
  const found = componentsOf(b).find((c) => c.name === name);
  if (!found) throw new Error(`no component "${name}"`);
  const out: LegacyNode[] = [];
  const walk = (list: LegacyNode[]) => {
    for (const n of list ?? []) {
      out.push(n);
      if (n.children) walk(n.children);
    }
  };
  walk(found.graph?.roots ?? []);
  return out;
}
const connectionsOf = (b: AuthoredGarden, name: string): LegacyConnection[] => componentsOf(b).find((c) => c.name === name)?.graph?.connections ?? [];
const params = (n: LegacyNode) => (n.parameters ?? {}) as Record<string, unknown>;

function tree(dir: string): Map<string, Buffer> {
  const out = new Map<string, Buffer>();
  const walk = (current: string) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else out.set(path.relative(dir, full), fs.readFileSync(full));
    }
  };
  walk(dir);
  return out;
}

// ── Contrast (CG-007 AC6, ruling 5), computed from the tokens — never a hand-typed ratio ──

const srgb = (hex: string) => hex.replace('#', '').match(/../g)!.map((h) => parseInt(h, 16) / 255);
const relLum = (hex: string) => {
  const c = srgb(hex).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a: string, b: string) => {
  const [x, y] = [relLum(a), relLum(b)].sort((p, q) => q - p);
  return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100;
};
/** OKLCH [L, C, h°] of a hex (Björn Ottosson's matrices), for "the same hue, a lower lightness". */
function oklch(hex: string): [number, number, number] {
  const [r, g, b] = srgb(hex).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const q = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * q;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * q;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * q;
  return [L, Math.hypot(A, B), ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360];
}
/** Every text the pages set, on the ground it sits on: [what a person reads, its ink token, its ground token]. */
const CONTRAST_PAIRS: ReadonlyArray<[string, string, string]> = [
  ['ink on paper', '--ink', '--paper'],
  ['ink on card', '--ink', '--card'],
  ['ink on paper-2 (plain buttons, chips, the new-player card)', '--ink', '--paper-2'],
  ['ink-2 on paper (a done request, a seed trick)', '--ink-2', '--paper'],
  ['ink-2 on card', '--ink-2', '--card'],
  ['ink-2 on paper-2 (quiet buttons, the band pill)', '--ink-2', '--paper-2'],
  ['eyebrow leaf on paper', '--leaf', '--paper'],
  ['leaf on card (blooming, ✓ done)', '--leaf', '--card'],
  ['white on leaf (Play, Let’s go)', '--on-fill', '--leaf'],
  ['white on coral (Teach)', '--on-fill', '--coral'],
  ['white on violet (Ask Olive)', '--on-fill', '--violet'],
  ['owl text ink on violet-2', '--ink', '--violet-2'],
  ['owl meta on violet-2', '--violet-meta', '--violet-2'],
  ['violet ink on card (Where will it end?)', '--violet-ink', '--card'],
  ['white on motion block', '--on-fill', '--block-motion'],
  ['white on action block', '--on-fill', '--block-action'],
  ['white on control block (the fold, Skills, tags)', '--on-fill', '--block-control'],
  ['white on ask block', '--on-fill', '--block-ask'],
  ['sprout ink (control) on card', '--block-control', '--card'],
  ['white on ink (a pressed switch, a worn chip)', '--on-fill', '--ink'],
  ['ink on leaf-2 (the lit tab)', '--ink', '--leaf-2'],
  ['ink on the tidy box (the fold offer)', '--ink', '--tidy'],
  ['ink-2 on the tidy box (Not now)', '--ink-2', '--tidy'],
  ['ink on rep (the trick learnt)', '--ink', '--rep'],
  ['ink on sun (an open pin’s badge)', '--ink', '--sun'],
  ['ink on card (a pin’s name)', '--ink', '--card'],
  // CG-005 s3 (lane HOOKS): the owl's tags and the Skills line; a refused slot's reason; the proposal card's words.
  ['violet ink on violet-2 (the owl’s thinking / resting tags, what Olive can’t do here)', '--violet-ink', '--violet-2'],
  ['coral on card (why an ask block cannot be sent yet)', '--coral', '--card']
];
function contrastTable(value: (token: string) => string): Array<{ name: string; ratio: number }> {
  return CONTRAST_PAIRS.map(([name, fg, bg]) => ({ name, ratio: contrast(value(fg), value(bg)) }));
}

// ── The glue, run the way the Function runs it ──────────────────────────────

const WORD_ROWS = JSON.parse(ALL_WORDS_JSON) as Array<{ key: string; en: string; fr: string }>;
const REQ_ROWS = JSON.parse(JSON.stringify(REQUESTS)) as Array<Record<string, any>>;
const run = (script: string, inputs: Record<string, unknown>) => runScript(script, inputs);
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
async function runAsync(script: string, inputs: Record<string, unknown>, fetchImpl: unknown): Promise<Record<string, any>> {
  const outputs: Record<string, any> = {};
  const fn = new AsyncFunction('Inputs', 'Outputs', 'fetch', script);
  await fn(inputs, outputs, fetchImpl);
  return outputs;
}

/**
 * The tulip request, taught by hand (the reference program unrolled), folded, played to the end: AC3 in plain JS.
 * IG-002: the fetch-and-return dance — fill at the pond, turn round, walk, water, step down a row, walk back — ×3.
 */
const TULIP_DANCE = ['fill', 'left', 'left', 'fwd', 'water', 'right', 'fwd', 'right', 'fwd'];
function playTulips(scripts: { record?: string; win?: string } = {}) {
  const start = run(START_WORLD_SCRIPT, { requests: REQ_ROWS, requestId: 'tulips-three', nonce: 0 });
  let world = start.world;
  let program: unknown = '[]';
  const taught = TULIP_DANCE;
  const after4: number[] = [];
  const cans: number[] = [];
  for (let k = 0; k < taught.length * 3; k++) {
    const rec = run(scripts.record ?? RECORD_STEP_SCRIPT, { op: taught[k % taught.length], program, world, selected: '', lang: 'en', bumps: 0 });
    program = rec.program;
    world = rec.world;
    cans.push(world.robots[0].can);
    if (k === 3) after4.push(run(READ_PROGRAM_SCRIPT, { program }).blocks);
  }
  const taughtWorld = world;
  const read = run(READ_PROGRAM_SCRIPT, { program });
  const find = run(FIND_REPEAT_SCRIPT, { program: read.program, band: 2 });
  const fold = run(FOLD_SCRIPT, { program: read.program, i: find.i, len: find.len, count: find.count, containerId: find.containerId });
  const folded = fold.program;
  // Play: a fresh run from the start world, one Step + Apply per tick, until done.
  let r = run(NEW_RUN_SCRIPT, { program: folded, robotId: 'me', lang: 'en' }).run;
  let w = start.world;
  let ticks = 0;
  let last: Record<string, any> = {};
  while (ticks < 400) {
    last = run(STEP_SCRIPT, { run: r, world: w });
    r = last.run;
    w = run(APPLY_DELTA_SCRIPT, { world: w, delta: last.delta }).world;
    ticks++;
    if (last.done) break;
  }
  const goal = run(GOAL_SCRIPT, { world: w, run: r, program: folded, goal: start.goal });
  const summary = run(scripts.win ?? WIN_SUMMARY_SCRIPT, { program: folded, request: start.request, words: WORD_ROWS, lang: 'en', botName: 'Pip' });
  const fam0 = run(ADD_PROFILE_SCRIPT, { model: undefined, name: 'Tester', band: 2, lang: 'en', face: 'Tester', robotName: 'Pip' }).model;
  const done = run(COMPLETE_REQUEST_SCRIPT, { model: fam0, requestId: summary.requestId, profileId: fam0.island.activeId, tricks: summary.bloom, reward: summary.reward }).model;
  return { start, taughtWorld, after4: after4[0], read, find, fold, ticks, last, goal, summary, done, cans, playedWorld: w };
}

// ── The artefact ────────────────────────────────────────────────────────────

describe('CG-003 — Bot Garden, the artefact', () => {
  beforeAll(async () => {
    built = await buildGardenTemplateProject();
  });

  it('AC1: every screen of the mockup has its page, authored through one plan, kits installed first', () => {
    expect(built.modules).toEqual(['garden-kit', 'game-kit', 'garden-3d-kit', 'bot-garden-fonts']);
    expect(built.order).toHaveLength(CG003_COMPONENTS.length + 1);
    expect(componentsOf(built).map((c) => c.name).sort()).toEqual([...CG003_COMPONENTS.map((c) => '/' + c.path), '/' + C.app].sort());
    const router = nodesOf(built, '/' + C.app).find((n) => n.type === 'Router')!;
    const pages = (params(router).pages as { startPage?: string; routes?: string[] }) ?? {};
    expect(pages.startPage).toBe(C.pageProfiles);
    expect([...(pages.routes ?? [])].sort()).toEqual([...PAGES].sort());
    // Profiles, Island, Workshop, My robot, Skills, Grown-ups: the mockup's five screens plus the profile chooser.
    expect(PAGES.map((p) => p.replace('/Pages/', ''))).toEqual(['Profiles', 'Island', 'Workshop', 'My robot', 'Skills', 'Grown-ups']);
  });

  it('AC1: no warning the door did not refuse over but D50’s, pinned by component', () => {
    const warnings = built.diagnostics.filter((d) => d.severity === 'warning' || d.severity === 'error');
    expect([...new Set(warnings.map((d) => d.code))].sort()).toEqual(['uncollapsible-multi-column']);
    // D50 (filed): a wrapped row of fixed-size items is told to become a Columns node. The bar wraps on purpose; the
    // swatches, chips and profile cards are a wrapped row of fixed-size items. `apply` is apply_plan's re-validation.
    // s3: Profiles no longer warns — its row is the cards' repeater and the new-player card, not a wrap of fixed items.
    // P106 IG-005: Robot/Card's colour and hat rows are the same wrapped rows of swatches and chips as Robot/Options'.
    expect([...new Set(warnings.map((d) => String(d.component).replace(/^\//, '')))].sort()).toEqual(['Garden/Top bar', 'Robot/Card', 'Robot/Options', 'apply']);
    const project = JSON.parse(fs.readFileSync(path.join(built.projectDir, 'nodegx.project.json'), 'utf8')) as { settings: { bodyScroll?: boolean } };
    expect(project.settings.bodyScroll).toBe(true);
  });

  it('AC2: two builds agree byte for byte, and the checked-in artefact is what the generator writes today', async () => {
    const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cg003-out-')), TEMPLATE_ID);
    prepareGardenArtefact(built, out);
    const again = await buildGardenTemplateProject();
    const out2 = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cg003-out2-')), TEMPLATE_ID);
    prepareGardenArtefact(again, out2);
    const a = tree(out);
    const b = tree(out2);
    expect([...b.keys()].sort()).toEqual([...a.keys()].sort());
    expect([...a.keys()].filter((f) => !a.get(f)!.equals(b.get(f)!))).toEqual([]);
    const committed = tree(OUTPUT);
    expect([...committed.keys()].sort()).toEqual([...a.keys()].sort());
    expect([...a.keys()].filter((f) => !a.get(f)!.equals(committed.get(f)!))).toEqual([]);
  });

  it('the kits in the artefact are the ones the library ships', () => {
    for (const name of REQUIRED_MODULES) {
      const lib = path.join(REPO, 'library', 'modules', name, 'project', 'noodl_modules', name, 'index.js');
      expect({ name, same: fs.readFileSync(path.join(OUTPUT, 'noodl_modules', name, 'index.js')).equals(fs.readFileSync(lib)) }).toEqual({ name, same: true });
    }
  });

  describe('AC2 — the phase-85 floors, recomputed', () => {
    it('outputs ≥ 50%, flags ≥ 20%, States ≥ 0.15 per component', () => {
      // The measurer's own flag rule (measure-interfaces.py FLAG), verbatim.
      const FLAG = /^(show|hide|use|is|has|can|enable|disable|allow|visible|open|active|checked|selected|disabled|readonly|required|loading)/i;
      let withInterface = 0;
      let withOutputs = 0;
      let withFlag = 0;
      let states = 0;
      for (const comp of componentsOf(built)) {
        const nodes = nodesOf(built, comp.name);
        const conns = connectionsOf(built, comp.name);
        const ci = new Set(nodes.filter((n) => n.type === 'Component Inputs').map((n) => n.id));
        const co = new Set(nodes.filter((n) => n.type === 'Component Outputs').map((n) => n.id));
        const ports = new Set(conns.filter((c) => ci.has(c.fromId)).map((c) => c.fromProperty));
        const outs = new Set(conns.filter((c) => co.has(c.toId)).map((c) => c.toProperty));
        states += nodes.filter((n) => n.type === 'States').length;
        if (ports.size === 0) continue;
        withInterface++;
        if (outs.size > 0) withOutputs++;
        if ([...ports].some((p) => FLAG.test(p))) withFlag++;
      }
      const reading = { components: withInterface, outputs: withOutputs / withInterface, flags: withFlag / withInterface, statesPerComponent: states / withInterface };
      fs.writeFileSync(path.join(os.tmpdir(), 'cg003-floors.json'), JSON.stringify(reading));
      expect(reading.components).toBeGreaterThanOrEqual(40);
      expect(reading.outputs).toBeGreaterThanOrEqual(0.5);
      expect(reading.flags).toBeGreaterThanOrEqual(0.2);
      expect(reading.statesPerComponent).toBeGreaterThanOrEqual(0.15);
    });

    it('the phase-85 measurer agrees', () => {
      const script = path.join(REPO, 'dev-docs', 'tasks', 'phase-85-the-component-is-the-backbone', 'measure-interfaces.py');
      expect(fs.existsSync(script)).toBe(true);
      const out = execSync(`python3 "${script}" v2 "${path.join(OUTPUT, 'components')}"`, { encoding: 'utf8' });
      expect(out).toContain('PASS  publishes outputs');
      expect(out).toContain('PASS  carries a flag port');
      expect(out).toContain('PASS  States per component');
      expect(out).not.toContain('FAIL');
    });
  });

  describe('the doctrine', () => {
    it('every Logic/* is a named utility: Component Inputs → one Function → Component Outputs, with its seam as its name', () => {
      for (const spec of LOGIC_COMPONENTS) {
        const types = nodesOf(built, '/' + spec.path).map((n) => n.type).sort();
        expect({ c: spec.path, types }).toEqual({ c: spec.path, types: ['Component Inputs', 'Component Outputs', 'JavaScriptFunction'] });
        expect(spec.path).toMatch(/^Logic\/[A-Z][a-z]+( [a-zA-Z]+)*$/);
      }
    });

    it('every script CG-002 ships is a Logic/* here, byte for byte (Translate words: the same script over more words)', () => {
      for (const f of FUNCTION_SCRIPTS) {
        const fn = nodesOf(built, '/' + f.component).find((n) => n.type === 'JavaScriptFunction')!;
        const script = String(params(fn).functionScript);
        if (f.component === 'Logic/Translate words') {
          expect(script).toBe(TRANSLATE_ALL_SCRIPT);
          const engine = portsOf(TRANSLATE_SCRIPT);
          const ours = portsOf(TRANSLATE_ALL_SCRIPT);
          expect(engine.outputs.filter((o) => !ours.outputs.includes(o))).toEqual([]);
          expect(ours.inputs).toEqual(engine.inputs);
        } else expect({ c: f.component, same: script === f.script }).toEqual({ c: f.component, same: true });
      }
      for (const g of GLUE_SCRIPTS) expect(LOGIC_SPECS.find((s) => s.path === g.component)?.script).toBe(g.script);
      // CG-005: every Olive script is a Logic/* too, byte for byte.
      for (const o of OLIVE_SCRIPTS) {
        const fn = nodesOf(built, '/' + o.component).find((n) => n.type === 'JavaScriptFunction')!;
        expect({ c: o.component, same: String(params(fn).functionScript) === o.script }).toEqual({ c: o.component, same: true });
      }
    });

    it('a page word never shadows an engine word, and every word has EN and FR', () => {
      expect(PAGE_WORD_KEYS.filter((k) => WORD_KEYS.includes(k) || OLIVE_WORD_KEYS.includes(k))).toEqual([]);
      // P106 IG-006: its page words shadow none of the others either.
      expect(IG006_WORD_KEYS.filter((k) => WORD_KEYS.includes(k) || OLIVE_WORD_KEYS.includes(k) || PAGE_WORD_KEYS.includes(k))).toEqual([]);
    expect(OLIVE_WORD_KEYS.filter((k) => !WORD_ROWS.some((r) => r.key === k))).toEqual([]);
      for (const k of PAGE_WORD_KEYS) expect({ k, en: !!PAGE_WORDS[k].en, fr: !!PAGE_WORDS[k].fr }).toEqual({ k, en: true, fr: true });
      for (const k of IG006_WORD_KEYS) expect({ k, en: !!IG006_WORDS[k].en, fr: !!IG006_WORDS[k].fr, same: IG006_WORDS[k].en === IG006_WORDS[k].fr }).toEqual({ k, en: true, fr: true, same: false });
      expect(WORD_ROWS.length).toBe(WORD_KEYS.length + OLIVE_WORD_KEYS.length + PAGE_WORD_KEYS.length + IG006_WORD_KEYS.length);
    });

    it('🔴 every States node has useTransitions false — D49', () => {
      for (const comp of componentsOf(built)) {
        for (const n of nodesOf(built, comp.name).filter((n) => n.type === 'States')) expect({ c: comp.name, n: n.id, t: params(n).useTransitions }).toEqual({ c: comp.name, n: n.id, t: false });
      }
    });

    it('🔴 a Function driven by Go reads its values only on Go', () => {
      for (const spec of LOGIC_SPECS.filter((s) => s.go)) {
        const fn = nodesOf(built, '/' + spec.path).find((n) => n.type === 'JavaScriptFunction')!;
        for (const input of spec.ins) expect({ c: spec.path, input, v: params(fn)[`runOnChange-in-${input}`] }).toEqual({ c: spec.path, input, v: false });
      }
    });

    it('every page is small: the game is in the parts', () => {
      for (const page of PAGES) expect({ page, small: nodesOf(built, page).length <= 32 }).toEqual({ page, small: true });
    });

    it('🔴 AC8: a page changes only through the router — no script writes the location or the hash', () => {
      for (const spec of LOGIC_SPECS) expect({ c: spec.path, hash: /location|history\.|\.hash\b/.test(spec.script) }).toEqual({ c: spec.path, hash: false });
      const navs = componentsOf(built).flatMap((c) => nodesOf(built, c.name).filter((n) => n.type === 'RouterNavigate'));
      expect(navs.length).toBeGreaterThan(8);
      for (const n of navs) expect(PAGES as readonly string[]).toContain(String(params(n).target));
    });

    it('🔴 a language tap with nobody chosen writes nothing and stays on Profiles (s2 drive: it went to the island)', () => {
      // The bar writes only through its "did it change" gate.
      const bar = connectionsOf(built, C.bar);
      expect(bar.filter((c) => c.toId === 'brOut' && c.toProperty === 'write').map((c) => `${c.fromId}.${c.fromProperty}`)).toEqual(['brChanged.ontrue']);
      // Profiles leaves only through its gate, and the gate opens only on a choice or a player made.
      const pr = connectionsOf(built, C.pageProfiles);
      expect(pr.filter((c) => c.toId === 'prGoIsland').map((c) => `${c.fromId}.${c.fromProperty}`)).toEqual(['prGoGate.ontrue']);
      expect(pr.filter((c) => c.fromId === 'prStore' && c.fromProperty === 'written').map((c) => `${c.toId}.${c.toProperty}`)).toEqual(['prGoGate.eval']);
      expect(pr.filter((c) => c.toId === 'prLeaving' && c.toProperty === 'to-go').map((c) => `${c.fromId}.${c.fromProperty}`).sort()).toEqual(['prAddOk.ontrue', 'prSelect.ran']);
      // And the script says so: a language on an empty family changes nothing.
      expect(run(UPDATE_PROFILE_SCRIPT, { model: undefined, field: 'lang', value: 'fr' }).changed).toBe(false);
      // The bar shows no face with nobody chosen.
      expect(bar.some((c) => c.fromId === 'brIn' && c.fromProperty === 'hasProfile' && c.toId === 'brWho' && c.toProperty === 'mounted')).toBe(true);
    });

    it('AC4: on a phone the tabs wrap inside the bar (content-sized, they made the page 506 px wide)', () => {
      expect(GARDEN_CSS).toMatch(/@media \(max-width: 600px\) \{ \.bg-tabs \{ width: 100% !important;/);
    });

    it('no backtick and no dollar-brace inside any glue script (README §7)', () => {
      for (const g of GLUE_SCRIPTS) expect({ c: g.component, bad: /`|\$\{/.test(g.script) }).toEqual({ c: g.component, bad: false });
      expect(/`/.test(GARDEN_CSS)).toBe(false);
    });

    it('🔴 AC5: at 7–9 no count is mounted (and no Predict: IG-003 moved it into the islander’s challenge, band 10–12); the pad keys are 56 px', () => {
      const play = nodesOf(built, C.play);
      const conns = connectionsOf(built, C.play);
      for (const id of ['plCount']) {
        expect(params(play.find((n) => n.id === id)!).mounted).toBe(false);
        expect(conns.some((c) => c.fromId === 'plIn' && c.fromProperty === 'isOlder' && c.toId === id && c.toProperty === 'mounted')).toBe(true);
      }
      expect(play.some((n) => /^plPredict/.test(String(n.id)))).toBe(false);
      const key = nodesOf(built, C.padKey).find((n) => n.type === 'net.noodl.controls.button')!;
      expect([params(key).width, params(key).height]).toEqual([{ value: 56, unit: 'px' }, { value: 56, unit: 'px' }]);
      expect(GARDEN_CSS).toMatch(/\.bg-key \{ width: 56px !important; height: 56px !important;/);
    });

    it('🔴 AC7: the win card is fixed and centred, every positioning property !important, and its root carries the class', () => {
      const rule = GARDEN_CSS.match(/\.bg-win \{([^}]*)\}/)![1];
      // Both axes, and !important: a Group writes its own alignment inline (s2 drive: the card sat at cy 182 of 912).
      for (const p of ['position: fixed !important', 'left: 0 !important', 'right: 0 !important', 'top: 0 !important', 'bottom: 0 !important', 'height: 100vh !important', 'display: flex !important', 'align-items: center !important', 'justify-content: center !important']) expect(rule).toContain(p);
      const root = nodesOf(built, C.win).find((n) => n.id === 'wnScrim')!;
      expect(String(params(root).cssClassName)).toBe('bg-win');
    });

    it('AC4: the block list scrolls in its own box', () => {
      const box = nodesOf(built, C.play).find((n) => n.id === 'plBlocksBox')!;
      expect(params(box).cssClassName).toBe('bg-blocks-box');
      expect(GARDEN_CSS).toMatch(/\.bg-blocks-box \{ max-height: [^;]+; overflow-y: auto !important;/);
    });
  });

  describe('s3 — the rulings in the graph (one island per kid, the sea with pins, the name)', () => {
    it('🔴 ruling 8: every page writes an older family back as soon as it has read it (an on-load migration owes its own save)', () => {
      for (const page of PAGES) {
        const p = nodesOf(built, page).find((n) => n.type === '/' + L_FAMILY)!.id;
        const conns = connectionsOf(built, page);
        const store = nodesOf(built, page).find((n) => n.type === C.store)!.id;
        const resave = conns.find((c) => c.fromId === p && c.fromProperty === 'migrated')!;
        expect({ page, gate: !!resave }).toEqual({ page, gate: true });
        expect(conns.some((c) => c.fromId === p && c.fromProperty === 'ran' && c.toId === resave.toId && c.toProperty === 'eval')).toBe(true);
        expect(conns.some((c) => c.fromId === resave.toId && c.fromProperty === 'ontrue' && c.toId === store && c.toProperty === 'write')).toBe(true);
        expect(conns.some((c) => c.fromId === p && c.fromProperty === 'model' && c.toId === store && c.toProperty === 'model')).toBe(true);
      }
    });

    it('🔴 IG-004 (R1, supersedes ruling 6): the Island is ONE world on the Workshop’s renderer rule — no sea with pins; the island ticks; a request her robot cannot take opens its plot card', () => {
      const island = nodesOf(built, C.pageIsland);
      // The sea with pins went: no Island/Map, no Island/Pin anywhere in the template.
      expect(componentsOf(built).map((c) => c.name).filter((n) => /Island\/(Map|Pin)$/.test(n))).toEqual([]);
      expect(island.filter((n) => n.type === C.isleWorld).map((n) => n.id)).toEqual(['isWorld']);
      const world = nodesOf(built, C.isleWorld);
      const kit2d = world.filter((n) => n.type === 'garden-kit.Garden');
      const kit3d = world.filter((n) => n.type === 'garden-3d-kit.Garden3D');
      expect([kit2d.map((n) => n.id), kit3d.map((n) => n.id)]).toEqual([['iwGarden'], ['iwGarden3d']]);
      expect(params(kit3d[0])).toMatchObject({ camera: 'island', mounted: false });
      const conns = connectionsOf(built, C.isleWorld);
      const into = (id: string) => conns.filter((c) => c.toId === id).map((c) => `${c.fromId}.${c.fromProperty}>${c.toProperty}`).sort();
      // The same wires into both renderers (IG-007's rule): one of the two is mounted by the stored choice.
      expect(into('iwGarden').filter((w) => !w.endsWith('>mounted'))).toEqual(['iwDraw.map>map', 'iwDraw.robots>robots', 'iwDraw.things>things']);
      expect(into('iwGarden3d').filter((w) => !/>(mounted|focus|camera)$/.test(w))).toEqual(into('iwGarden').filter((w) => !w.endsWith('>mounted')));
      expect([into('iwGarden').find((w) => w.endsWith('>mounted')), into('iwGarden3d').find((w) => w.endsWith('>mounted'))]).toEqual(['iwRenderer.show2d>mounted', 'iwRenderer.show3d>mounted']);
      const states = world.find((n) => n.id === 'iwRenderer')!;
      expect(params(states)).toMatchObject({ states: '2d,3d', useTransitions: false });
      expect(conns.some((c) => c.fromId === 'iwGarden3d' && c.fromProperty === 'onTooSlow' && c.toId === 'iwRendSlow')).toBe(true);
      expect(conns.some((c) => c.fromId === 'iwGarden3d' && c.fromProperty === 'onSupported' && c.toId === 'iwRendOk')).toBe(true);
      // The tick: a Timer of two Step Ms, the state held in ONE Variable by name (only one island on screen), looped.
      const timer = world.find((n) => n.id === 'iwTimer')!;
      expect(params(timer).duration).toBe(760);
      expect(world.filter((n) => n.type === 'Variable2').map((n) => params(n).name)).toEqual(['gardenIsland']);
      expect(into('iwTick')).toEqual(['iwTimer.timerFinished>go', 'iwVar.value>state', 'iwWorld.state>built']);
      expect(into('iwTimer')).toEqual(['iwSetBuilt.done>start', 'iwSetTick.done>start']);
      // A tap on either renderer asks Plot at, then the card; the page's pick opens the same card.
      expect(into('iwAt')).toEqual(['iwGarden.onTileTapped>go', 'iwGarden.onTileX>x', 'iwGarden.onTileY>y', 'iwGarden3d.onTileTapped>go', 'iwGarden3d.onTileX>x', 'iwGarden3d.onTileY>y', 'iwWorld.cards>cards']);
      expect(into('iwChoose').filter((w) => />(go|requestId)$/.test(w))).toEqual(['iwAgain.timerFinished>go', 'iwAt.ran>go', 'iwAt.requestId>requestId', 'iwIn.pick>go', 'iwIn.pickId>requestId']);
      // The Workshop does not tick the island: no Island tick anywhere but here.
      for (const comp of componentsOf(built).filter((c) => c.name !== '/' + C.isleWorld.replace(/^\//, ''))) expect({ c: comp.name, tick: nodesOf(built, comp.name).some((n) => n.type === '/Logic/Island tick') }).toEqual({ c: comp.name, tick: false });
      // The page: a card goes straight to the Workshop only when her robot can take it; a blocked one opens the plot card.
      const page = connectionsOf(built, C.pageIsland);
      expect(page.filter((c) => c.toId === 'isSetReq').map((c) => `${c.fromId}.${c.fromProperty}>${c.toProperty}`).sort()).toEqual(['isBlocked.onfalse>do', 'isEach.itemOutput-id>value', 'isWorld.open>do', 'isWorld.requestId>value']);
      expect(page.filter((c) => c.toId === 'isBlocked').map((c) => `${c.fromId}.${c.fromProperty}>${c.toProperty}`).sort()).toEqual(['isEach.itemOutput-blocked>condition', 'isEach.itemOutputSignal-chosen>eval']);
      expect(page.some((c) => c.fromId === 'isBlocked' && c.fromProperty === 'ontrue' && c.toId === 'isWorld' && c.toProperty === 'pick')).toBe(true);
      for (const f of ['plots', 'robots', 'done', 'band']) expect(page.some((c) => c.fromId === 'isFam' && c.fromProperty === f && c.toId === 'isWorld' && c.toProperty === f)).toBe(true);
      expect(page.some((c) => c.fromId === 'isWorld' && c.fromProperty === 'write' && c.toProperty === 'write')).toBe(true);
      // The look: the island on its sea, a phone scrolls the flat one sideways; the 3D one keeps a 16:10 frame.
      expect(GARDEN_CSS).toContain('.bg-isle-scroll { width: 100% !important; overflow-x: auto !important;');
      expect(GARDEN_CSS).toContain('.bg-isle-scroll .gd-world { max-width: none !important; min-width: 736px;');
      expect(GARDEN_CSS).toContain('.bg-island { display: grid !important; grid-template-columns: minmax(0, 1fr) 360px;');
    });

    it('🔴 IG-004 AC3: the Workshop’s win hands Complete request the program that won (gardenProgram), so the robot is pinned to the plot', () => {
      const ws = connectionsOf(built, C.pageWorkshop);
      const v = nodesOf(built, C.pageWorkshop).find((n) => n.type === 'Variable2' && params(n).name === 'gardenProgram')!;
      expect(ws.some((c) => c.fromId === v.id && c.fromProperty === 'value' && c.toId === 'wsComplete' && c.toProperty === 'program')).toBe(true);
      expect(ws.some((c) => c.fromId === 'wsPlay' && c.fromProperty === 'won' && c.toId === 'wsComplete' && c.toProperty === 'go')).toBe(true);
    });

    it('ruling 7: what a person sees says Olive’s Island; the slugs stay', () => {
      const project = JSON.parse(fs.readFileSync(path.join(built.projectDir, 'nodegx.project.json'), 'utf8'));
      expect([project.name, project.settings.htmlTitle]).toEqual([GAME_NAME, GAME_NAME]);
      for (const page of PAGES) expect({ page, title: params(nodesOf(built, page).find((n) => n.type === 'Page')!).title }).toEqual({ page, title: GAME_NAME });
      expect(params(nodesOf(built, C.bar).find((n) => n.id === 'brName')!).text).toBe(GAME_NAME);
      // The bar still reads the brand WORD (lane CONTENT's): the read is kept.
      expect(connectionsOf(built, C.bar).some((c) => c.fromId === 'brT' && c.fromProperty === 'brand' && c.toId === 'brName')).toBe(true);
      // Nothing a person reads in the graph says Bot Garden (the brand word is CONTENT's, and checked there).
      const shown = componentsOf(built).flatMap((c) => nodesOf(built, c.name).flatMap((n) => ['text', 'label', 'title', 'placeholder'].map((k) => String(params(n)[k] ?? ''))));
      expect(shown.filter((t) => /Bot Garden/.test(t))).toEqual([]);
      const start = fs.readFileSync(path.join(OUTPUT_OF(built), START_HERE_FILE), 'utf8');
      expect(start.split('\n')[0]).toBe(`# ${GAME_NAME}`);
      expect(start).not.toMatch(/Bot Garden/);
      // The slugs a person never reads stay.
      expect([TEMPLATE_ID, STORAGE_KEY]).toEqual(['bot-garden', 'bot-garden']);
    });

    it('item 2: the owl in her own colours (a picture, not the white mask) — on the grown-ups’ Try Olive; the Workshop’s Ask Olive went in IG-001 D8', () => {
      const owl = componentsOf(built).flatMap((c) => nodesOf(built, c.name)).find((n) => String(params(n).cssClassName ?? '').includes('bg-i-owlc'));
      expect(owl && owl.id).toBe('ghAsk');
      expect(nodesOf(built, C.play).some((n) => n.id === 'plAsk')).toBe(false);
      expect(GARDEN_CSS).toMatch(/\.bg-i-owlc::before \{[^}]*background-image: url\("data:image\/svg\+xml/);
      expect(GARDEN_CSS.match(/\.bg-i-owlc::before \{[^}]*\}/)![0]).not.toMatch(/mask/);
    });

    it('item 3: the progress marks are dots a repeater draws from Draw world’s marks, filled as tulips drink', () => {
      const conns = connectionsOf(built, C.play);
      expect(conns.some((c) => c.fromId === 'plDraw' && c.fromProperty === 'marks' && c.toId === 'plMarkEach' && c.toProperty === 'items')).toBe(true);
      expect(nodesOf(built, C.play).find((n) => n.id === 'plMarkEach')!.parameters).toMatchObject({ template: C.mark });
      const states = nodesOf(built, C.mark).find((n) => n.type === 'States')!;
      expect([params(states)['value-dry-ground'], params(states)['value-lit-ground']]).toEqual(['var(--paper-2)', 'var(--tulip-dot)']);
    });

    it('the Profiles page: a card per kid with her robot drawn in its colours and name, the new player as a card', () => {
      const card = nodesOf(built, C.profile);
      expect(card.some((n) => n.type === 'garden-kit.Garden')).toBe(true);
      const conns = connectionsOf(built, C.profile);
      for (const f of ['color', 'eye', 'hat']) expect(conns.some((c) => c.fromId === 'pcIn' && c.fromProperty === f && c.toId === 'pcDraw' && c.toProperty === f)).toBe(true);
      expect(conns.some((c) => c.fromId === 'pcIn' && c.fromProperty === 'robot' && c.toId === 'pcDraw' && c.toProperty === 'botName')).toBe(true);
      const pr = nodesOf(built, C.pageProfiles);
      const list = pr.find((n) => n.id === 'prList')!;
      expect((list.children ?? []).map((n) => n.id)).toEqual(['prEach', 'prNew']);
      expect(String(params(pr.find((n) => n.id === 'prNew')!).cssClassName)).toContain('bg-profile-new');
    });

    it('rename: both name boxes cut at the length the save keeps', () => {
      const op = nodesOf(built, C.options).find((n) => n.id === 'opName')!;
      const pf = nodesOf(built, C.form).find((n) => n.id === 'pfBot')!;
      expect([params(op).maxLength, params(pf).maxLength]).toEqual([ROBOT_NAME_MAX, ROBOT_NAME_MAX]);
      const conns = connectionsOf(built, C.options);
      expect(conns.filter((c) => c.toId === 'opSetName').map((c) => `${c.fromId}.${c.fromProperty}>${c.toProperty}`).sort()).toEqual(['opIn.model>model', 'opIn.profileId>profileId', 'opName.onBlur>go', 'opName.onEnter>go', 'opName.onTextChanged>value']);
      expect(connectionsOf(built, C.pageProfiles).some((c) => c.fromId === 'prForm' && c.fromProperty === 'robotName' && c.toId === 'prAdd' && c.toProperty === 'robotName')).toBe(true);
    });
  });

  describe('s3 — CG-005’s page hooks in the graph (lane HOOKS)', () => {
    const play = () => nodesOf(built, C.play);
    const conns = () => connectionsOf(built, C.play);
    const node = (id: string) => play().find((n) => n.id === id)!;
    const into = (id: string, port?: string) => conns().filter((c) => c.toId === id && (port === undefined || c.toProperty === port)).map((c) => `${c.fromId}.${c.fromProperty}>${c.toProperty}`).sort();
    const has = (from: string, fp: string, to: string, tp: string) => conns().some((c) => c.fromId === from && c.fromProperty === fp && c.toId === to && c.toProperty === tp);

    it('hook 1: the Workshop palette is fed the request’s rungs and this computer’s exam (a rung it failed is withheld, AC5)', () => {
      expect(node('plStatus').type).toBe('/Logic/Olive status');
      expect(into('plPalette', 'rungs')).toEqual(['plStart.rungs>rungs']);
      expect(into('plPalette', 'exam')).toEqual(['plStatus.exam>exam']);
    });

    it('hook 2: the owl row the drives read — the line is .bg-owl-say, the row .bg-owl (its tags inside it)', () => {
      expect([params(node('plOwl')).cssClassName, params(node('plOwlSay')).cssClassName]).toEqual(['bg-owl', 'bg-owl-say']);
      expect(into('plOwlSay', 'text')).toEqual(['plOwlRow.text>text']);
      expect((node('plOwlCol').children ?? []).map((n) => n.id)).toEqual(['plOwlSay', 'plOwlThinking', 'plOwlResting', 'plProposal', 'plOwlMeta']);
    });

    it('hook 3: an ask block Olive cannot be asked with says why, in words, under the block list (AC6)', () => {
      expect(node('plSlots').type).toBe('/Logic/Olive slots');
      expect(into('plSlots')).toEqual(['plBlocks.onSelected>selected', 'plIn.band>band', 'plIn.lang>lang', 'plIn.words>words', 'plRead.program>program']);
      expect([into('plSlotMsg', 'text'), into('plSlotMsg', 'mounted')]).toEqual([['plSlots.message>text'], ['plSlots.show>mounted']]);
      expect(params(node('plSlotMsg')).mounted).toBe(false);
      const right = (node('plRight').children ?? []).map((n) => n.id);
      expect(right.indexOf('plSlotMsg')).toBe(right.indexOf('plBlocksBox') + 1);
    });

    it('🔴 hook 4: the voiced hint — the row’s signature, and ONLY it, asks the second Ask Olive; its answer goes back to the row alone (no loop)', () => {
      expect([node('plVoiceHint').type, node('plAskVoice').type]).toEqual(['/Logic/Voice hint', '/Logic/Ask Olive']);
      expect(into('plVoiceHint')).toEqual(['plOwlRow.voiceSig>sig']);
      expect(into('plAskVoice')).toEqual(['plIn.band>band', 'plVoiceHint.ran>go', 'plVoiceHint.request>request']);
      expect(conns().filter((c) => c.fromId === 'plAskVoice').map((c) => `${c.fromProperty}>${c.toId}.${c.toProperty}`)).toEqual(['answer>plOwlRow.voiced']);
      expect(into('plOwlRow', 'voiced')).toEqual(['plAskVoice.answer>voiced']);
      // The program's Ask Olive stays the runner's: its answer resumes the run and tells the row (resting).
      expect(into('plRunner', 'answer')).toEqual(['plAskOlive.answer>answer']);
    });

    it('hook 5: the thinking and resting tags are the row’s, in violet ink on the owl’s violet', () => {
      for (const [id, flag] of [['plOwlThinking', 'thinking'], ['plOwlResting', 'resting']] as const) {
        expect([into(id, 'mounted'), into(id, 'text')]).toEqual([[`plOwlRow.${flag}>mounted`], [`plOwlRow.${flag}Text>text`]]);
        expect([params(node(id)).mounted, params(node(id)).color]).toEqual([false, 'var(--violet-ink)']);
      }
      expect(GARDEN_CSS).toMatch(/\.bg-owl-thinking::after \{[^}]*animation: bg-dots/);
      expect(GARDEN_CSS).toMatch(/@keyframes bg-dots/);
    });

    it('🔴 hook 6: Olive’s blocks enter the program ONLY through "Use them" (AC1); either answer hides the card', () => {
      expect([node('plPropCard').type, node('plAccept').type, params(node('plAccept')).accept]).toEqual(['/Logic/Proposal card', '/Logic/Accept proposal', true]);
      expect(into('plAccept', 'go')).toEqual(['plUse.onClick>go']);
      expect(into('plAccept', 'proposal')).toEqual(['plPropCard.proposal>proposal']);
      // Every writer of the program, by name: the kit, the pad, the fold, the reset — and Use them.
      const writers = play().filter((n) => n.type === 'Set Variable' && params(n).name === 'gardenProgram').map((n) => n.id).sort();
      expect(writers).toEqual(['plSetProgAccept', 'plSetProgClear', 'plSetProgFold', 'plSetProgKit', 'plSetProgRec']);
      expect([into('plSetProgAccept', 'do'), into('plSetProgAccept', 'value')]).toEqual([['plAccept.ran>do'], ['plAccept.program>value']]);
      expect(into('plSetPropDone', 'do')).toEqual(['plAccept.ran>do', 'plNoThanks.onClick>do']);
      expect(into('plProposal', 'mounted')).toEqual(['plPropCard.show>mounted']);
      expect([into('plUse', 'label'), into('plNoThanks', 'label'), into('plPropH', 'text')]).toEqual([['plT.oliveAccept>label'], ['plT.oliveDecline>label'], ['plT.oliveProposes>text']]);
      expect(into('plPropCard', 'run')).toEqual(['plRunner.run>run']);
    });

    it('hook 7: Skills says what Olive cannot do on this computer, from the status door, for the kid’s band', () => {
      const sk = connectionsOf(built, C.pageSkills);
      expect(nodesOf(built, C.pageSkills).some((n) => n.id === 'skOlive' && n.type === C.skOlive)).toBe(true);
      expect(sk.filter((c) => c.toId === 'skOlive').map((c) => `${c.fromId}.${c.fromProperty}>${c.toProperty}`).sort()).toEqual(['skFam.band>band', 'skFam.botName>botName', 'skFam.lang>lang', 'skWords.words>words']);
      const so = connectionsOf(built, C.skOlive);
      expect(so.some((c) => c.fromId === 'soStatus' && c.fromProperty === 'exam' && c.toId === 'soHeld' && c.toProperty === 'exam')).toBe(true);
      expect(so.some((c) => c.fromId === 'soHeld' && c.fromProperty === 'show' && c.toId === 'soBox' && c.toProperty === 'mounted')).toBe(true);
    });

    it('the pages stay small with the hooks in: every page ≤ 32 nodes, the Workshop’s hooks inside Workshop/Play', () => {
      for (const page of PAGES) expect({ page, n: nodesOf(built, page).length <= 32 }).toEqual({ page, n: true });
      expect(has('plStart', 'rungs', 'plPalette', 'rungs')).toBe(true);
    });
  });

  describe('IG-001 — the fixes in the graph (Phase 106 session 1)', () => {
    const runner = () => nodesOf(built, C.runner);
    const rc = () => connectionsOf(built, C.runner);
    const rnode = (id: string) => runner().find((n) => n.id === id)!;
    const rinto = (id: string, port?: string) => rc().filter((c) => c.toId === id && (port === undefined || c.toProperty === port)).map((c) => `${c.fromId}.${c.fromProperty}>${c.toProperty}`).sort();
    const rfrom = (id: string, port: string) => rc().filter((c) => c.fromId === id && c.fromProperty === port).map((c) => `${c.toId}.${c.toProperty}`).sort();
    const phas = (from: string, fp: string, to: string, tp: string) => connectionsOf(built, C.play).some((c) => c.fromId === from && c.fromProperty === fp && c.toId === to && c.toProperty === tp);

    it('🔴 D1: an answer resumes a LIVE run (playing or paused), never only a playing one; a Step while parked is a no-op; Stop and Play clear the parked state the page reads', () => {
      // The answer's gate tests the mode's live flag, not playing (the whole defect: rnLoop ignored the answer in step mode).
      expect(rinto('rnLoop', 'eval')).toEqual(['rnPark.onfalse>eval']);
      expect(rfrom('rnIn', 'answered')).toEqual(['rnAns.eval']);
      expect(rinto('rnAns', 'condition')).toEqual(['rnMode.live>condition']);
      expect(rfrom('rnAns', 'ontrue')).toEqual(['rnTimer.start']);
      // Parked is a state of the Runner's own: set by the park, cleared by the answer's tick, by Stop and by Play.
      expect(rnode('rnWait').type).toBe('States');
      expect([rfrom('rnPark', 'ontrue'), rfrom('rnPark', 'onfalse')]).toEqual([['rnOut.parked', 'rnWait.to-parked'], ['rnLoop.eval', 'rnWait.to-free']]);
      expect(rfrom('rnIn', 'stop')).toContain('rnWait.to-free');
      expect(rfrom('rnIn', 'play')).toContain('rnWait.to-free');
      expect(rinto('rnOut', 'waiting')).toEqual(['rnWait.parked>waiting']);
      // A Step goes through the parked gate: parked → nothing (the tag stays on, no second ask); free → the live test as before.
      expect(rfrom('rnIn', 'step')).toEqual(['rnParked.eval']);
      expect(rinto('rnParked', 'condition')).toEqual(['rnWait.parked>condition']);
      expect([rfrom('rnParked', 'onfalse'), rfrom('rnParked', 'ontrue')]).toEqual([['rnLive.eval'], []]);
    });

    it('🔴 D2: Stop resets the run (an empty fresh run in gardenRun), and the Workshop re-chooses the hint once the reset has landed', () => {
      expect(rfrom('rnIn', 'stop')).toContain('rnReset.go');
      expect(rnode('rnReset').type).toBe('/Logic/New run');
      expect(params(rnode('rnReset')).program).toBe('[]');
      expect(rinto('rnSetRunReset')).toEqual(['rnReset.ran>do', 'rnReset.run>value']);
      expect(params(rnode('rnSetRunReset')).name).toBe('gardenRun');
      expect(rfrom('rnSetRunReset', 'done')).toEqual(['rnOut.reset']);
      expect(phas('plRunner', 'reset', 'plChoose', 'go')).toBe(true);
      expect(phas('plStart', 'ran', 'plRunner', 'stop')).toBe(true);
    });

    it('🔴 P106 s4 (d): the running ring shows only while a run is live — Stop (Start over, Teach, Drive) and a run that ends take it off, so a new program’s block with the same id never glows', () => {
      // The ring the page draws is the Runner's Glow Id, and that is Glow's answer, not Step's raw one (which Stop never touched).
      expect(rinto('rnOut', 'glowId')).toEqual(['rnGlow.id>glowId']);
      expect(rnode('rnGlow').type).toBe('/Logic/Glow');
      expect(rinto('rnGlow')).toEqual(['rnMode.live>live', 'rnStep.glowId>glowId']);
      expect(phas('plRunner', 'glowId', 'plBlocks', 'runningId')).toBe(true);
      expect(run(GLOW_SCRIPT, { glowId: 3, live: true }).id).toBe('3');
      expect(run(GLOW_SCRIPT, { glowId: 3, live: false }).id).toBe('');
      expect(run(GLOW_SCRIPT, { glowId: null, live: true }).id).toBe('');
      // One step, Start over, One step: the same block id, the ring back on — Live goes false then true, so Glow re-answers.
      expect([run(GLOW_SCRIPT, { glowId: 1, live: true }).id, run(GLOW_SCRIPT, { glowId: 1, live: false }).id, run(GLOW_SCRIPT, { glowId: 1, live: true }).id]).toEqual(['1', '', '1']);
    });

    it('🔴 P106 s4 (c): Choose hint knows the mode, so Drive with a program says Play or Teach', () => {
      expect(phas('plMode', 'mode', 'plChoose', 'mode')).toBe(true);
    });

    it('D3/D4: Choose hint is fed the request’s reference count and whether this is free play', () => {
      expect(phas('plStart', 'referenceCount', 'plChoose', 'referenceCount')).toBe(true);
      expect(phas('plStart', 'isFree', 'plChoose', 'freePlay')).toBe(true);
      // IG-002: counted off the requests' own reference programs (stones: 7, tulips: 10).
      const refOf = (id: string) => {
        const count = (l: Array<{ body?: unknown[] }>): number => l.reduce((n, b) => n + 1 + (Array.isArray(b.body) ? count(b.body as Array<{ body?: unknown[] }>) : 0), 0);
        return count(REQ_ROWS.find((r) => r.id === id)!.referenceProgram as Array<{ body?: unknown[] }>);
      };
      expect([refOf('path-stones'), refOf('tulips-three')]).toEqual([7, 10]);
      expect(run(START_WORLD_SCRIPT, { requests: REQ_ROWS, requestId: 'path-stones' }).referenceCount).toBe(refOf('path-stones'));
      expect(run(START_WORLD_SCRIPT, { requests: REQ_ROWS, requestId: 'tulips-three' }).referenceCount).toBe(refOf('tulips-three'));
      expect(run(START_WORLD_SCRIPT, { requests: REQ_ROWS, requestId: 'free' }).referenceCount).toBe(0);
    });

    const play = () => nodesOf(built, C.play);
    const pnode = (id: string) => play().find((n) => n.id === id)!;
    const pinto = (id: string, port?: string) => connectionsOf(built, C.play).filter((c) => c.toId === id && (port === undefined || c.toProperty === port)).map((c) => `${c.fromId}.${c.fromProperty}>${c.toProperty}`).sort();

    it('🔴 D6: what Olive said reaches Draw world from the Runner and becomes the olive bubble for Step Ms × 3; `say` speaks its line plain; nothing to say leaves the last bubble to the kit’s own timer', () => {
      expect(rinto('rnOut', 'sayText')).toEqual(['rnStep.sayText>sayText']);
      expect(rinto('rnOut', 'sayStyle')).toEqual(['rnStep.sayStyle>sayStyle']);
      expect([pinto('plDraw', 'sayText'), pinto('plDraw', 'sayStyle'), pinto('plDraw', 'stepMs'), pinto('plDraw', 'run')]).toEqual([['plRunner.sayText>sayText'], ['plRunner.sayStyle>sayStyle'], ['plIn.stepMs>stepMs'], ['plRunner.run>run']]);
      const base = { world: run(START_WORLD_SCRIPT, { requests: REQ_ROWS, requestId: 'tulips-three' }).world, words: WORD_ROWS, lang: 'en', botName: 'Pip', stepMs: 380, sayN: 4, run: { runId: 'r1' } };
      expect(run(DRAW_WORLD_SCRIPT, { ...base, sayText: 'Tulla the tulip', sayStyle: 'olive' }).bubble).toEqual({ robot: 0, text: 'Tulla the tulip', style: 'olive', ms: 1140, n: 'r1:4' });
      expect(run(DRAW_WORLD_SCRIPT, { ...base, sayKey: 'thanksMamie' }).bubble).toEqual({ robot: 0, text: WORDS.thanksMamie.en, style: 'plain', n: 'r1:4' });
      expect(run(DRAW_WORLD_SCRIPT, { ...base, sayKey: 'sayDrink', lang: 'fr' }).bubble.text).toBe(WORDS.sayDrink.fr);
      // A free text typed on a say block is spoken as itself.
      expect(run(DRAW_WORLD_SCRIPT, { ...base, sayKey: 'Hello there' }).bubble.text).toBe('Hello there');
      // Nothing to say: the port is left alone (a null would hide the bubble on the very next tick, 420 ms in).
      expect('bubble' in run(DRAW_WORLD_SCRIPT, { ...base })).toBe(false);
      expect('bubble' in run(DRAW_WORLD_SCRIPT, { ...base, sayKey: '', sayText: '' })).toBe(false);
    });

    it('🔴 D7: the picker’s sensors offer "Olive says yes" and "Olive says no", in both languages; the kit’s repeat keeps its number', () => {
      const pal = run(PALETTE_SCRIPT, { band: 2, allowed: [], lang: 'en', words: WORD_ROWS }).palette;
      for (const lang of ['en', 'fr'] as const) {
        const kit = run(KIT_PALETTE_SCRIPT, { palette: pal, band: 2, lang, words: WORD_ROWS }).palette;
        const sensor = kit.find((e: { id: string }) => e.id === 'if').slots.find((s: { key: string }) => s.key === 'sensor');
        const opts = Object.fromEntries(sensor.options.map((o: { value: string; label: string }) => [o.value, o.label]));
        expect({ lang, yes: opts['olive_says:yes'], no: opts['olive_says:no'] }).toEqual({ lang, yes: PAGE_WORDS.sOliveSaysYes[lang], no: PAGE_WORDS.sOliveSaysNo[lang] });
        expect(kit.find((e: { id: string }) => e.id === 'until').slots.find((s: { key: string }) => s.key === 'sensor').options.map((o: { value: string }) => o.value)).toContain('olive_says:yes');
        expect(kit.find((e: { id: string }) => e.id === 'repeat')).toMatchObject({ hasCount: true, slots: [] });
      }
    });

    it('🔴 D8: no Ask Olive on the bar; the hint follows every program edit one step later (a Timer restarted by Read program, then Choose hint)', () => {
      expect(play().some((n) => n.id === 'plAsk')).toBe(false);
      expect((pnode('plControls').children as string[]) ?? []).not.toContain('plAsk');
      expect([pnode('plHintLater').type, params(pnode('plHintLater')).duration]).toEqual(['Timer', TICK_MS]);
      expect(pinto('plHintLater', 'restart')).toEqual(['plRead.ran>restart']);
      expect(pinto('plChoose', 'go')).toContain('plHintLater.timerFinished>go');
      // P106 IG-006 AC1/AC7 (a word boundary: the vendored three.min.js has setMask:function): no ask:<rung> id and no after-run line of a rung 4–18 anywhere in the artefact.
      const oldFamily = [...tree(OUTPUT_OF(built)).entries()].filter(([, buf]) => /\bask:[a-z]|oliveRung(?:[4-9]|1\d)\b/.test(buf.toString('utf8'))).map(([f]) => f);
      expect(oldFamily).toEqual([]);
      // The generated artefact carries no plAsk at all (AC8).
      const withAsk = [...tree(OUTPUT_OF(built)).entries()].filter(([, buf]) => /\bplAsk\b/.test(buf.toString('utf8'))).map(([f]) => f);
      expect(withAsk).toEqual([]);
    });

    it('🔴 D10: the pad draws one key per allowed step — the stones put and no water, the tulips water, free play every step the engine knows', () => {
      const keys = (id: string) => run(PAD_KEYS_SCRIPT, { allowed: run(START_WORLD_SCRIPT, { requests: REQ_ROWS, requestId: id }).allowed }).keys as Array<{ op: string; cls: string; label: string }>;
      // IG-002: the stones mine first (pick), the tulips fill at the pond; free play has every step, fill included.
      expect(keys('path-stones').map((k) => k.op)).toEqual(['fwd', 'left', 'right', 'pick', 'put']);
      expect(keys('tulips-three').map((k) => k.op)).toEqual(['fwd', 'left', 'water', 'right', 'fill']);
      expect(keys('letter-say').map((k) => k.op)).toEqual(['fwd', 'left', 'right', 'pick', 'put']);
      expect(keys('free').map((k) => k.op)).toEqual(['fwd', 'left', 'water', 'right', 'fill', 'pick', 'put']);
      // The first action takes the d-pad's centre, the rest a third row; every key names its op, its place and its icon.
      const at = (id: string, op: string) => keys(id).find((k) => k.op === op)!.cls;
      expect(at('path-stones', 'pick')).toBe('bg-key bg-key-pick bg-key-mid bg-i-pick bg-press');
      expect(at('path-stones', 'put')).toBe('bg-key bg-key-put bg-key-r3a bg-i-put bg-press');
      expect(at('tulips-three', 'water')).toContain('bg-key-mid');
      expect(at('tulips-three', 'fill')).toBe('bg-key bg-key-fill bg-key-r3a bg-i-fill bg-press');
      expect([at('free', 'water'), at('free', 'fill'), at('free', 'pick'), at('free', 'put')].map((c) => c.split(' ')[2])).toEqual(['bg-key-mid', 'bg-key-r3a', 'bg-key-r3b', 'bg-key-r3c']);
      expect(at('free', 'fwd')).toBe('bg-key bg-key-fwd bg-i-fwd bg-press');
      // IG-003: the pad is up from the moment a request opens (Drive); each key is labelled in the child's language.
      const labels = (lang: string) => run(PAD_KEYS_SCRIPT, { allowed: [], words: WORD_ROWS, lang }).keys.map((k: { label: string }) => k.label);
      expect([labels('en')[0], labels('fr')[0], labels('fr')[4]]).toEqual([WORDS.bFwd.en, WORDS.bFwd.fr, WORDS.bFill.fr]);
      expect(connectionsOf(built, C.pad).filter((c) => c.toId === 'pdKeys').map((c) => c.toProperty).sort()).toEqual(['allowed', 'lang', 'words']);
      // The graph: the request's allowed list reaches the pad; the pad's rows come from Logic/Pad keys, not a static table.
      expect(phas('plStart', 'allowed', 'plPad', 'allowed')).toBe(true);
      const pad = nodesOf(built, C.pad);
      expect([pad.some((n) => n.type === '/Logic/Pad keys'), pad.some((n) => n.type === 'Static Data')]).toEqual([true, false]);
      expect(connectionsOf(built, C.pad).some((c) => c.fromId === 'pdKeys' && c.fromProperty === 'keys' && c.toId === 'pdEach' && c.toProperty === 'items')).toBe(true);
      for (const icon of ['pick', 'put', 'fill']) expect(GARDEN_CSS).toContain(`.bg-i-${icon}::before`);
      expect(GARDEN_CSS).toMatch(/\.bg-key-mid \{ grid-column: 2; grid-row: 2; \}/);
      expect(GARDEN_CSS).toMatch(/\.bg-key-r3a \{ grid-column: 1; grid-row: 3; \}/);
      expect(GARDEN_CSS).toMatch(/\.bg-pad \{[^}]*grid-auto-rows: 56px/);
    });

    it('🔴 P106 s4 (b): the pad sits beside the world, not on its tiles — absolute only in the phone rule', () => {
      const unconditional = GARDEN_CSS.split('\n').filter((l) => /^\.bg-pad \{/.test(l));
      expect(unconditional).toHaveLength(1);
      expect(unconditional[0]).not.toMatch(/position: absolute/);
      expect(GARDEN_CSS).toMatch(/\.bg-stage:has\(> \.bg-pad\) \{[^}]*display: flex !important; flex-direction: row !important; flex-wrap: wrap;/);
      expect(GARDEN_CSS).toMatch(/@media \(max-width: 600px\) \{ \.bg-stage:has\(> \.bg-pad\) \{ display: block !important;[^}]*\} \.bg-pad \{ position: absolute !important;/);
    });
  });

  describe('IG-007 — Garden 3D on the Workshop behind the renderer States node; the fallback rule; the Grown-ups switch (P106 s2)', () => {
    const play = () => nodesOf(built, C.play);
    const pc = () => connectionsOf(built, C.play);
    const pnode = (id: string) => play().find((n) => n.id === id)!;
    const into = (id: string, skip: string[] = []) => pc().filter((c) => c.toId === id && !skip.includes(c.toProperty)).map((c) => `${c.fromId}.${c.fromProperty}>${c.toProperty}`).sort();
    const from = (id: string, skip: string[] = []) => pc().filter((c) => c.fromId === id && !skip.includes(c.fromProperty)).map((c) => `${c.fromProperty}>${c.toId}.${c.toProperty}`).sort();
    const WORLD_PORTS_3D_ONLY = ['onSupported', 'onTooSlow', 'onFrameMs', 'onReady'];

    it('🔴 AC6: the template carries garden-3d-kit (three.js beside it, its manifest naming it), installed before authoring', () => {
      expect(built.modules).toContain('garden-3d-kit');
      const dir = path.join(OUTPUT, 'noodl_modules', 'garden-3d-kit');
      expect(JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8')).dependencies).toEqual(['three.min.js']);
      expect(fs.statSync(path.join(dir, 'three.min.js')).size).toBe(651651);
      expect(fs.existsSync(path.join(dir, 'LICENSE.txt'))).toBe(true);
    });

    it('🔴 AC1: Garden 3D sits beside Garden on the stage, under EXACTLY Garden’s wires, in and out, with Garden’s parameters', () => {
      const g2 = pnode('plGarden');
      const g3 = pnode('plGarden3d');
      expect(g3.type).toBe('garden-3d-kit.Garden3D');
      const stage = pnode('plStage');
      expect((stage.children ?? []).map((n) => n.id)).toEqual(['plGarden', 'plGarden3d', 'plRec', 'plPad']);
      expect({ stepMs: params(g3).stepMs, label: params(g3).label }).toEqual({ stepMs: params(g2).stepMs, label: params(g2).label });
      expect(params(g3).camera).toBe('plot');
      // Every wire into Garden goes into Garden 3D too (the renderer's `mounted` apart); every wire out of Garden comes
      // out of Garden 3D to the same place (Garden 3D's own outputs apart — only the rule reads them).
      expect(into('plGarden3d', ['mounted'])).toEqual(into('plGarden', ['mounted']));
      expect(into('plGarden', ['mounted']).length).toBe(4);
      expect(from('plGarden3d', WORLD_PORTS_3D_ONLY)).toEqual(from('plGarden'));
      expect(from('plGarden').length).toBe(3);
    });

    it('🔴 AC1/AC4: the renderer States node (no transitions, 2d then 3d) mounts exactly one of the two, driven by signals from the stored choice', () => {
      const r = pnode('plRenderer');
      expect(r.type).toBe('States');
      expect([params(r).states, params(r).useTransitions]).toEqual(['2d,3d', false]);
      expect([params(r)['value-2d-show2d'], params(r)['value-2d-show3d'], params(r)['value-3d-show2d'], params(r)['value-3d-show3d']]).toEqual([true, false, false, true]);
      expect(into('plGarden', [])).toContain('plRenderer.show2d>mounted');
      expect(into('plGarden3d', [])).toContain('plRenderer.show3d>mounted');
      expect(params(pnode('plGarden3d')).mounted).toBe(false);
      expect(into('plRenderer')).toEqual(['plRendIs3d.onfalse>to-2d', 'plRendIs3d.ontrue>to-3d']);
      expect(into('plRendIs3d')).toEqual(['plRendRead.use3d>condition']);
      expect(pnode('plRendRead').type).toBe('/Logic/Renderer');
      expect(into('plRendRead')).toEqual(['plIn.lang>lang', 'plIn.words>words', 'plRendStore.value>stored']);
      expect([pnode('plRendStore').type, params(pnode('plRendStore')).storeName, params(pnode('plRendStore')).keys]).toEqual(['net.noodl.GlobalStore.Subscribe', 'garden', 'renderer']);
    });

    it('🔴 AC4: the rule — Supported false, or Too Slow, writes 2d with its reason into the store’s renderer key', () => {
      expect(from('plGarden3d').filter((w) => /^on(Supported|TooSlow)/.test(w))).toEqual(['onSupported>plRendOk.condition', 'onTooSlow>plRendSlow.go']);
      expect(from('plRendOk')).toEqual(['onfalse>plRendNoGl.go']);
      expect([pnode('plRendNoGl').type, params(pnode('plRendNoGl')).event, pnode('plRendSlow').type, params(pnode('plRendSlow')).event]).toEqual(['/Logic/Renderer choice', 'unsupported', '/Logic/Renderer choice', 'slow']);
      const w = pnode('plRendWrite');
      expect([w.type, params(w).storeName, params(w).key]).toEqual(['net.noodl.GlobalStore.Set', 'garden', 'renderer']);
      expect(into('plRendWrite')).toEqual(['plRendNoGl.ran>set', 'plRendNoGl.renderer>value', 'plRendSlow.ran>set', 'plRendSlow.renderer>value']);
    });

    it('🔴 AC4: the Grown-ups page names the renderer and holds the switch, written through the same key', () => {
      const page = nodesOf(built, C.pageGrown);
      expect(page.find((n) => n.id === 'guRenderer')!.type).toBe(C.guRenderer);
      const panel = nodesOf(built, C.guRenderer);
      const gc = connectionsOf(built, C.guRenderer);
      const gin = (id: string) => gc.filter((c) => c.toId === id).map((c) => `${c.fromId}.${c.fromProperty}>${c.toProperty}`).sort();
      expect(gin('grdLine')).toEqual(['grdRead.line>text']);
      expect([gin('grd3d'), gin('grd2d')]).toEqual([['grdRead.use3d>isOn', 'grdT.guRend3d>label'], ['grdRead.use2d>isOn', 'grdT.guRend2d>label']]);
      expect(panel.filter((n) => n.type === '/Logic/Renderer choice').map((n) => params(n).event).sort()).toEqual(['use2d', 'use3d']);
      const set = panel.find((n) => n.type === 'net.noodl.GlobalStore.Set')!;
      expect([params(set).storeName, params(set).key]).toEqual(['garden', 'renderer']);
      for (const key of ['guRendH', 'guRend3d', 'guRend2d', 'guRend3dLine', 'guRendSlow', 'guRendNoGl', 'guRendFlat']) {
        const word = PAGE_WORDS[key];
        expect({ key, both: !!word && !!word.en && !!word.fr && word.en !== word.fr }).toEqual({ key, both: true });
      }
    });

    it('🔴 the glue: nothing stored is 3D; each stored reason reads as its own line; each event writes its own choice', () => {
      const words = JSON.parse(ALL_WORDS_JSON);
      const read = (stored: unknown, lang = 'en') => run(RENDERER_SCRIPT, { stored, words, lang });
      expect([read(undefined).use3d, read(undefined).use2d, read(undefined).line]).toEqual([true, false, PAGE_WORDS.guRend3dLine.en]);
      expect(read({ mode: '2d', why: 'slow' }).line).toBe(PAGE_WORDS.guRendSlow.en);
      expect(read({ mode: '2d', why: 'unsupported' }, 'fr').line).toBe(PAGE_WORDS.guRendNoGl.fr);
      expect(read({ mode: '2d', why: 'grown-up' }).line).toBe(PAGE_WORDS.guRendFlat.en);
      expect([read({ mode: '2d' }).use2d, read({ mode: 'junk' }).use3d, read('text').use3d]).toEqual([true, true, true]);
      const choose = (event: string, stored?: unknown) => run(RENDERER_CHOICE_SCRIPT, { event, stored });
      expect(choose('unsupported').renderer).toEqual({ mode: '2d', why: 'unsupported' });
      expect(choose('slow', { mode: '3d', why: 'grown-up' }).renderer).toEqual({ mode: '2d', why: 'slow' });
      expect(choose('use3d', { mode: '2d', why: 'slow' })).toMatchObject({ renderer: { mode: '3d', why: 'grown-up' }, changed: true });
      expect(choose('use2d', { mode: '2d', why: 'grown-up' })).toMatchObject({ renderer: { mode: '2d', why: 'grown-up' }, changed: false });
      expect(choose('', undefined).renderer).toEqual({ mode: '3d', why: '' });
    });
  });

  describe('IG-003 — Drive · Teach · Play on the bar; the Predict challenge; the ? on a placed block (P106 s3)', () => {
    const play = () => nodesOf(built, C.play);
    const pc = () => connectionsOf(built, C.play);
    const pnode = (id: string) => play().find((n) => n.id === id)!;
    const from = (id: string, port: string) => pc().filter((c) => c.fromId === id && c.fromProperty === port).map((c) => `${c.toId}.${c.toProperty}`).sort();
    const into = (id: string, port?: string) => pc().filter((c) => c.toId === id && (port === undefined || c.toProperty === port)).map((c) => `${c.fromId}.${c.fromProperty}`).sort();

    it('🔴 AC4: the bar is Drive · Teach · Play · One step · Start over (Drive’s icon new, Teach’s kept); no Predict button, line, icon or plPredict anywhere in the artefact', () => {
      expect((pnode('plControls').children ?? []).map((n) => n.id)).toEqual(['plDrive', 'plTeach', 'plPlay', 'plStep', 'plReset']);
      const cls = (id: string) => String(params(pnode(id)).cssClassName);
      expect([cls('plDrive'), cls('plTeach'), cls('plPlay'), cls('plStep'), cls('plReset')]).toEqual(['bg-btn bg-i-drive', 'bg-btn bg-i-rec', 'bg-btn bg-i-play', 'bg-btn bg-i-step', 'bg-btn bg-i-reset']);
      expect(params(pnode('plDrive')).backgroundColor).toBe('var(--block-motion)');
      expect([from('plT', 'ig3Drive'), from('plT', 'ig3Teach')]).toEqual([['plDrive.label'], ['plTeach.label']]);
      expect(GARDEN_CSS).toContain('.bg-i-drive::before');
      expect(GARDEN_CSS).not.toContain('bg-i-predict');
      const withPredict = [...tree(OUTPUT_OF(built)).entries()].filter(([, buf]) => /plPredict|bg-i-predict|plStop\b|plTeachMode/.test(buf.toString('utf8'))).map(([f]) => f);
      expect(withPredict).toEqual([]);
    });

    it('🔴 the merge (IG-003 × IG-004): every bg-i-<icon> class the artefact puts on a node has its icon rule — the island’s Find my robots wore Predict’s icon, which IG-003 took away', () => {
      const used = new Set<string>();
      for (const [, buf] of tree(OUTPUT_OF(built)).entries()) for (const m of buf.toString('utf8').matchAll(/\bbg-i-([a-z0-9]+)\b/g)) used.add(m[1]);
      // Known-firing beside the absence: the bar's own icons are among those read.
      expect(['drive', 'rec', 'play', 'step', 'reset'].every((i) => used.has(i))).toBe(true);
      expect([...used].filter((i) => !GARDEN_CSS.includes(`.bg-i-${i}::before`)).sort()).toEqual([]);
      expect(String(params(nodesOf(built, C.isleWorld).find((n) => n.id === 'iwFind')!).cssClassName)).toBe('bg-btn bg-i-find bg-isle-find');
    });

    it('🔴 AC1–3: one States node drive | teach | play (no transitions, opens in Drive); the pad shows in Drive and Teach and records only in Teach; a request and Start over open in Drive', () => {
      const m = pnode('plMode');
      expect([m.type, params(m).states, params(m).useTransitions]).toEqual(['States', 'drive,teach,play', false]);
      const v = (state: string, value: string) => params(m)[`value-${state}-${value}`];
      expect(['drive', 'teach', 'play'].map((st) => [v(st, 'mode'), v(st, 'padShown'), v(st, 'record')])).toEqual([['drive', true, 'no'], ['teach', true, 'yes'], ['play', false, 'no']]);
      // 🔴 Record is a string: a boolean false from the first state never reached Record step, and unset records (the drive's red).
      expect(params(m)['type-record']).toBe('string');
      expect(run(RECORD_STEP_SCRIPT, { op: 'fwd', program: '[]', world: run(START_WORLD_SCRIPT, { requests: REQ_ROWS, requestId: 'free' }).world, record: 'no', lang: 'en' })).toMatchObject({ recorded: false, moved: true, program: '[]' });
      expect([into('plPad', 'show'), into('plRecord', 'record'), into('plRec', 'mounted')]).toEqual([['plMode.padShown'], ['plMode.record'], ['plMode.padShown']]);
      expect(from('plStart', 'ran')).toContain('plMode.to-drive');
      // A Drive press writes no program: the program Variable is set only through the recorded gate (AC1, AC5).
      expect(into('plSetProgRec', 'do')).toEqual(['plRecGate.ontrue']);
      expect([into('plRecGate', 'condition'), into('plRecGate', 'eval')]).toEqual([['plRecord.recorded'], ['plRecord.ran']]);
      // The steps: on the paper with a note while driving; the tag on the world says the mode.
      expect(v('drive', 'boxCls')).toBe('bg-blocks-box bg-driving');
      expect(v('teach', 'boxCls')).toBe('bg-blocks-box');
      expect([into('plBlocksBox', 'cssClassName'), into('plStepsNote', 'mounted'), into('plRecText', 'text')]).toEqual([['plMode.boxCls'], ['plModeWords.driving'], ['plModeWords.badge']]);
      expect(GARDEN_CSS).toMatch(/\.bg-driving \.gd-prog \{[^}]*background: var\(--paper-2\)/);
      expect(GARDEN_CSS).not.toMatch(/\.bg-driving[^{]*\{[^}]*opacity/);
    });

    it('🔴 AC2/AC3/AC5: every transition stops the Runner; Teach (once — a second press changes nothing) empties the run, clears a miss, and puts the robot back at the start and along the steps already there; Drive keeps the program', () => {
      expect(from('plDrive', 'onClick')).toEqual(['plDriveGate.eval', 'plMode.to-drive', 'plRunner.stop']);
      expect(from('plTeach', 'onClick')).toEqual(['plTeachGate.eval']);
      expect(into('plTeachGate', 'condition')).toEqual(['plMode.teaching']);
      expect(from('plTeachGate', 'ontrue')).toEqual([]);
      expect(from('plTeachGate', 'onfalse')).toEqual(['plClearMiss.do', 'plClearOutcome.do', 'plClearTeachBumps.do', 'plMode.to-teach', 'plRunner.stop', 'plTeachStart.go']);
      expect([into('plTeachStart', 'start'), into('plTeachStart', 'program')]).toEqual([['plStart.world'], ['plRead.program']]);
      expect([into('plSetWorldTeach', 'value'), into('plSetWorldTeach', 'do'), params(pnode('plSetWorldTeach')).name]).toEqual([['plTeachStart.world'], ['plTeachStart.ran'], 'gardenWorld']);
      // No transition writes the program: Drive and Teach keep it (only Start over clears it).
      for (const src of ['plDrive', 'plTeachGate', 'plTeachStart']) expect(pc().filter((c) => c.fromId === src && /^plSetProg/.test(c.toId))).toEqual([]);
      // The Runner's own reset re-chooses the hint (IG-001 D2), and Choose hint no longer reads a met goal without a run.
      expect(pc().some((c) => c.fromId === 'plRunner' && c.fromProperty === 'reset' && c.toId === 'plChoose' && c.toProperty === 'go')).toBe(true);
      expect(pnode('plTeachStart').type).toBe('/Logic/Teach start');
      expect(from('plPlay', 'onClick')).toEqual(expect.arrayContaining(['plMode.to-play', 'plRunner.play']));
      expect(from('plStep', 'onClick')).toEqual(expect.arrayContaining(['plMode.to-play', 'plRunner.step']));
    });

    it('🔴 AC4: the challenge — its line on the islander’s card, armed from the request and the band; a tap on EITHER renderer is the guess; a hit ticks the tile and then plays, a miss flags the real end; Play and One step settle it', () => {
      expect([into('plTaskP', 'text'), into('plChallenge', 'cardLine'), into('plChallenge', 'challenge'), into('plChallenge', 'band')]).toEqual([['plChallenge.line'], ['plCard.line'], ['plStart.challenge'], ['plIn.band']]);
      for (const g of ['plGarden', 'plGarden3d']) {
        expect(from(g, 'onTileTapped')).toEqual(['plGuessGate.eval']);
        expect([from(g, 'onTileX'), from(g, 'onTileY')]).toEqual([['plGuessEnd.tapX'], ['plGuessEnd.tapY']]);
      }
      expect(into('plGuessGate', 'condition')).toEqual(['plChallenge.armed']);
      expect(from('plGuessGate', 'ontrue')).toEqual(['plGuessEnd.go']);
      expect([pnode('plGuessEnd').type, into('plGuessEnd', 'world'), into('plGuessEnd', 'program')]).toEqual(['/Logic/Predict end', ['plStart.world'], ['plRead.program']]);
      expect(from('plHitGate', 'ontrue')).toEqual(['plClearMiss.do', 'plGuessWait.start', 'plSetHit.do']);
      expect(from('plGuessWait', 'timerFinished')).toEqual(['plMode.to-play', 'plRunner.play']);
      expect(from('plHitGate', 'onfalse')).toEqual(['plSetMiss.do', 'plSetMissed.do']);
      expect(into('plDraw', 'showTick')).toEqual(['plChallenge.showTick']);
      expect(into('plSetAskedFor', 'do')).toEqual(['plGuessEnd.ran', 'plPlay.onClick', 'plStep.onClick']);
      expect(into('plSetAskedFor', 'value')).toEqual(['plRead.text']);
      // Drive while it is asked: the robot goes back to the start (the question is about Play, which starts there).
      expect([into('plDriveGate', 'condition'), from('plDriveGate', 'ontrue'), into('plSetWorldAsk', 'value')]).toEqual([['plChallenge.armed'], ['plSetWorldAsk.do'], ['plStart.world']]);
    });

    it('🔴 IG-006 deviation 2: a ? on every placed block opens the same card as the palette’s first tap', () => {
      expect(params(pnode('plBlocks')).showHelp).toBe(true);
      expect(params(pnode('plCardEg')).showHelp).toBeUndefined();
      expect([into('plSetCardBlock', 'value'), into('plSetCardBlock', 'do'), params(pnode('plSetCardBlock')).name]).toEqual([['plBlocks.onHelpBlock'], ['plBlocks.onHelp'], 'gardenCardOpen']);
      // The card opens for a block's kind as it is (the chips' help: prefix is not needed).
      for (const t of ['fwd', 'olive:read', 'repeat']) expect(run(BLOCK_CARD_SCRIPT, { cardOpen: t, lang: 'en', band: 2, words: WORD_ROWS })).toMatchObject({ show: true, cardId: t });
    });
  });

  describe('IG-005 — robots for the job in the graph: the Workshop’s robot is the job’s, My robots, the island’s home is the job robot’s (P106 s4)', () => {
    const conns = (name: string) => connectionsOf(built, name);
    const into = (name: string, id: string, port: string) => conns(name).filter((c) => c.toId === id && c.toProperty === port).map((c) => `${c.fromId}.${c.fromProperty}`).sort();
    const nodeIn = (name: string, id: string) => nodesOf(built, name).find((n) => n.id === id)!;

    it('🔴 the Workshop: Job robot reads her robots and the request, and gives the Workshop its robot (name, look, row, key, palette robot, step time); the win pins THAT robot', () => {
      const ws = C.pageWorkshop;
      expect(String(nodeIn(ws, 'wsJob').type)).toBe('/Logic/Job robot');
      expect([into(ws, 'wsJob', 'robots'), into(ws, 'wsJob', 'requestId'), into(ws, 'wsJob', 'requests')]).toEqual([['wsFam.robots'], ['wsReqVar.value'], ['wsRequests.requests']]);
      for (const f of ['botName', 'color', 'eye', 'hat', 'robot', 'robotKey', 'paletteRobot', 'stepMs']) expect({ f, from: into(ws, 'wsPlay', f) }).toEqual({ f, from: [`wsJob.${f}`] });
      expect(into(ws, 'wsComplete', 'robotId')).toEqual(['wsJob.robotId']);
      expect([into(ws, 'wsGift', 'lent'), into(ws, 'wsGift', 'upgraded'), into(ws, 'wsPlay', 'giftText')]).toEqual([['wsComplete.lent'], ['wsComplete.upgraded'], ['wsGift.text']]);
      const pl = C.play;
      expect([into(pl, 'plPalette', 'robot'), into(pl, 'plPalette', 'needs'), into(pl, 'plStart', 'robot'), into(pl, 'plStart', 'robotKey'), into(pl, 'plWin', 'lentText')]).toEqual([['plIn.paletteRobot'], ['plStart.needs'], ['plIn.robot'], ['plIn.robotKey'], ['plIn.giftText']]);
    });

    it('🔴 Start world does not re-run on its Robot input (a win that upgrades the robot never resets the world under the win card); Robot Key does', () => {
      const fn = nodesOf(built, '/Logic/Start world').find((n) => n.type === 'JavaScriptFunction')!;
      expect(params(fn)['runOnChange-in-robot']).toBe(false);
      expect(params(fn)['runOnChange-in-robotKey']).toBeUndefined();
      // Known-firing: an ordinary reactive script sets no such flag.
      expect(Object.keys(params(nodesOf(built, '/Logic/Draw world').find((n) => n.type === 'JavaScriptFunction')!)).filter((k) => k.startsWith('runOnChange-'))).toEqual([]);
    });

    it('🔴 My robots: a card per robot (Robot cards → the fleet), each card’s name, colour and hat written through Update robot with the card’s robot id; the island’s Bring home takes the job robot', () => {
      const rb = C.pageRobot;
      expect(String(nodeIn(rb, 'rbFleetEach').type)).toBe('For Each');
      expect(params(nodeIn(rb, 'rbFleetEach')).template).toBe(C.robotCard);
      expect(into(rb, 'rbFleetEach', 'items')).toEqual(['rbCards.cards']);
      for (const [u, value, signal, field] of [['rbSetName', 'name', 'named', 'name'], ['rbSetColour', 'colour', 'coloured', 'color'], ['rbSetHat', 'hat', 'hatted', 'hat']]) {
        expect({ u, field: params(nodeIn(rb, u)).field, id: into(rb, u, 'robotId'), value: into(rb, u, 'value'), go: into(rb, u, 'go') }).toEqual({ u, field, id: ['rbFleetEach.itemOutput-robotId'], value: [`rbFleetEach.itemOutput-${value}`], go: [`rbFleetEach.itemOutputSignal-${signal}`] });
      }
      // The head: My robots, the right robot for the job.
      expect([into(rb, 'rbHead', 'eyebrow'), into(rb, 'rbHead', 'title')]).toEqual([['rbT.navRobot'], ['rbT.ig5Title']]);
      expect(into(C.isleWorld, 'iwHome', 'robotId')).toEqual(['iwChoose.robotId']);
    });
  });

  describe('CG-007 — the look', () => {
    const colourKeys = /colou?r$|^backgroundColor$|^borderColor$|^fill$|^background$/i;
    const graphParams = () =>
      componentsOf(built).flatMap((c) => nodesOf(built, c.name).flatMap((n) => Object.entries(params(n)).map(([key, value]) => ({ c: c.name, n: n.id, type: String(n.type), key, value }))));

    it('AC4: every colour the graph sets is a token (the kit’s ports too)', () => {
      const bad = graphParams().filter((p) => colourKeys.test(p.key) && !p.key.startsWith('type-') && typeof p.value === 'string' && !/^(var\(--[a-z0-9-]+\)|transparent)$/.test(p.value));
      expect(bad).toEqual([]);
      const blocks = nodesOf(built, C.play).find((n) => n.type === 'garden-kit.BlockList')!;
      expect([params(blocks).motionColor, params(blocks).actionColor, params(blocks).controlColor, params(blocks).askColor]).toEqual(['var(--block-motion)', 'var(--block-action)', 'var(--block-control)', 'var(--block-ask)']);
    });

    it('AC4: every var(--token) the graph and the stylesheet name is defined, and the stylesheet names no colour of its own outside the pictures', () => {
      const stored = JSON.parse(fs.readFileSync(path.join(built.projectDir, 'nodegx.project.json'), 'utf8')).metadata?.designTokens;
      const defined = new Set(buildEffectiveTokens(stored).keys());
      const used = new Set<string>();
      for (const p of graphParams()) for (const m of JSON.stringify(p.value).matchAll(/var\((--[a-z0-9-]+)\)/g)) used.add(m[1]);
      for (const m of GARDEN_CSS.matchAll(/var\((--[a-z0-9-]+)\)/g)) used.add(m[1]);
      expect([...used].filter((t) => !defined.has(t)).sort()).toEqual([]);
      // Outside the data URIs, the sheet's colours are tokens.
      const bare = GARDEN_CSS.replace(/url\("data:[^"]*"\)/g, 'url()');
      expect(bare.match(/#[0-9a-fA-F]{3,6}\b|rgba?\(/g)).toBeNull();
      // Known-firing: the pictures DO carry their own paint.
      expect(GARDEN_CSS).toMatch(/data:image\/svg\+xml/);
    });

    it('AC4: the stored tokens are the mockup’s :root — the fills that carry white words darkened (ruling 5), the rest as drawn', () => {
      const stored = JSON.parse(fs.readFileSync(path.join(built.projectDir, 'nodegx.project.json'), 'utf8')).metadata?.designTokens;
      const eff = buildEffectiveTokens(stored);
      const valueOf = (name: string) => String((eff.get(name) as { value?: string } | string | undefined) && ((eff.get(name) as { value?: string }).value ?? eff.get(name))).toUpperCase();
      for (const [name, hex] of [['--paper', '#FFF7E8'], ['--ink', '#2E2A3D'], ['--violet-2', '#EEE8FF'], ['--ink-2', '#6E6784']]) expect({ name, value: valueOf(name) }).toEqual({ name, value: hex });
      // Every darkened fill is stored as darkened, and differs from the mockup's own (the one-line diff to read).
      for (const f of DARKENED_FILLS) expect({ name: f.token, value: valueOf(f.token), changed: f.value !== f.mockup }).toEqual({ name: f.token, value: f.value, changed: true });
    });

    it('🔴 AC2: no button is an outlined pill — every one has a fill and no border; the mockup’s four are all used', () => {
      const buttons = graphParams().filter((p) => p.type === 'net.noodl.controls.button');
      const byNode = new Map<string, Record<string, unknown>>();
      for (const p of buttons) byNode.set(`${p.c}#${p.n}`, { ...(byNode.get(`${p.c}#${p.n}`) ?? {}), [p.key]: p.value });
      const fills = new Set<string>();
      for (const [id, ps] of byNode) {
        expect({ id, border: ps.borderStyle }).toEqual({ id, border: 'none' });
        expect({ id, hasFill: typeof ps.backgroundColor === 'string' }).toEqual({ id, hasFill: true });
        fills.add(String(ps.backgroundColor));
      }
      for (const f of ['var(--leaf)', 'var(--coral)', 'var(--violet)', 'transparent']) expect(fills).toContain(f);
    });

    it('🔴 AC3: Fredoka travels with the project, with its licence; Nunito comes with the preset; nothing names a face it does not ship', () => {
      const dir = path.join(built.projectDir, 'noodl_modules', 'bot-garden-fonts');
      const css = fs.readFileSync(path.join(dir, 'styles.css'), 'utf8');
      const faces = [...css.matchAll(/url\('([^']+)'\)/g)].map((m) => m[1]);
      expect(faces).toEqual(['fredoka-latin-wght-normal.woff2', 'fredoka-latin-ext-wght-normal.woff2']);
      for (const f of faces) expect(fs.existsSync(path.join(dir, f))).toBe(true);
      expect(fs.existsSync(path.join(dir, 'OFL-Fredoka.txt'))).toBe(true);
      expect(css).not.toMatch(/googleapis|https?:/);
      expect(fs.existsSync(path.join(built.projectDir, 'noodl_modules', 'preset-font-nunito', 'styles.css'))).toBe(true);
      const modules = path.join(built.projectDir, 'noodl_modules');
      const sheets = fs.readdirSync(modules).flatMap((m) => {
        const manifest = path.join(modules, m, 'manifest.json');
        if (!fs.existsSync(manifest)) return [];
        return (JSON.parse(fs.readFileSync(manifest, 'utf8')).browser?.stylesheets ?? []).map((s: string) => fs.readFileSync(path.join(built.projectDir, s), 'utf8'));
      });
      const stored = JSON.parse(fs.readFileSync(path.join(built.projectDir, 'nodegx.project.json'), 'utf8')).metadata?.designTokens;
      const tokens = [...buildEffectiveTokens(stored).values()];
      expect(checkFontFaces({ tokens, stylesheets: sheets, component: '/App' })).toEqual([]);
      // Every Text or Button that names a family names Fredoka or Nunito.
      const families = new Set(graphParams().filter((p) => p.key === 'fontFamily').map((p) => String(p.value)));
      expect([...families].sort()).toEqual(['Fredoka', 'Nunito']);
    });

    it('🔴 AC7: reduced motion stills every animation and transition the sheet starts', () => {
      const report = reducedMotionReport(GARDEN_CSS);
      expect(report.animated.length).toBeGreaterThan(2); // known-firing: the sheet does animate
      const block = GARDEN_CSS.slice(GARDEN_CSS.indexOf('@media (prefers-reduced-motion: reduce)'));
      expect(block).toMatch(/\*, \*::before, \*::after \{ animation: none !important; transition: none !important; \}/);
    });

    it('🔴 AC6 (ruling 5): every text on its ground reaches 4.5:1, computed from the tokens; each darkened fill keeps its hue', () => {
      const table = contrastTable((t) => tokenValue(t));
      fs.writeFileSync(path.join(os.tmpdir(), 'cg007-contrast.json'), JSON.stringify(table, null, 1));
      expect(table.length).toBeGreaterThanOrEqual(24);
      expect(table.filter((t) => t.ratio < 4.5).map((t) => `${t.name} ${t.ratio}`)).toEqual([]);
      // Known-firing beside the absence: the mockup's own fills fail the same table (s2 measured eight pairs under 4.5).
      const mockup = contrastTable((t) => DARKENED_FILLS.find((f) => f.token === t)?.mockup ?? tokenValue(t));
      expect(mockup.filter((t) => t.ratio < 4.5).length).toBeGreaterThanOrEqual(8);
      // Same hue (OKLCH), lower lightness: the ruling's "keep the four block colours as hues".
      for (const f of DARKENED_FILLS) {
        const [l0, , h0] = oklch(f.mockup);
        const [l1, , h1] = oklch(f.value);
        expect({ token: f.token, darker: l1 < l0, hueDrift: Math.abs(h1 - h0) < 1.5 }).toEqual({ token: f.token, darker: true, hueDrift: true });
      }
    });

    it('arm: one fill put back to the mockup’s value is named by the contrast table', () => {
      const table = contrastTable((t) => (t === '--block-control' ? '#FF9F1C' : tokenValue(t)));
      expect(table.filter((t) => t.ratio < 4.5).map((t) => t.name)).toEqual(['white on control block (the fold, Skills, tags)', 'sprout ink (control) on card']);
    });

    it('🔴 AC6: nothing a person reads is faded under 4.5 — done cards and seed cards sit on the paper, not at an opacity', () => {
      expect(GARDEN_CSS).not.toMatch(/\.bg-quest-done|\.bg-notion-seed \{[^}]*opacity/);
      const quest = nodesOf(built, C.quest).find((n) => n.id === 'qcStates')!;
      expect([params(quest)['value-open-ground'], params(quest)['value-done-ground']]).toEqual(['var(--card)', 'var(--paper)']);
      expect(connectionsOf(built, C.quest).some((c) => c.toId === 'qcCard' && c.toProperty === 'opacity')).toBe(false);
    });

    it('the preset under the tokens is Playful, which brings Nunito', () => {
      expect(getPreset(GARDEN_PRESET)).toBeTruthy();
      expect(tokenValue('--font-sans')).toMatch(/^"Nunito"/);
      expect(GARDEN_TOKENS.filter((t) => t.name.startsWith('--block-')).map((t) => t.name)).toEqual(['--block-motion', '--block-action', '--block-control', '--block-ask', '--block-run', '--block-drop']);
    });

    it('🔴 IG-001 D5: the running ring is the ink, ≥ 3:1 on the steps panel and inside a repeat; the drop-line keeps the old yellow, as its own token', () => {
      expect(tokenValue('--block-run')).toBe(tokenValue('--ink'));
      expect(contrast(tokenValue('--block-run'), tokenValue('--card'))).toBeGreaterThanOrEqual(3);
      expect(contrast(tokenValue('--block-run'), tokenValue('--rep'))).toBeGreaterThanOrEqual(3);
      // Known-firing beside it: the ring Richard saw, the sun, fails both grounds with this very arithmetic (1.44, 1.29).
      expect(contrast(tokenValue('--sun'), tokenValue('--card'))).toBeLessThan(3);
      expect(contrast(tokenValue('--sun'), tokenValue('--rep'))).toBeLessThan(3);
      expect(tokenValue('--block-drop')).toBe(tokenValue('--sun'));
      const blocks = nodesOf(built, C.play).find((n) => n.type === 'garden-kit.BlockList')!;
      expect([params(blocks).runColor, params(blocks).dropColor]).toEqual(['var(--block-run)', 'var(--block-drop)']);
    });
  });
});

// ── The glue, behaviourally (no build needed) ───────────────────────────────

describe('CG-003 — the page glue, run as the Functions run it', () => {
  it('every component: ids unique, every wire and child names a node that exists', () => {
    const bad: string[] = [];
    for (const c of CG003_COMPONENTS) {
      const ids = c.nodes.map((n) => String(n.id));
      const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
      if (dup.length) bad.push(`${c.path} dup ${dup}`);
      for (const w of c.connections as Array<{ fromId: string; toId: string }>) {
        if (!ids.includes(w.fromId)) bad.push(`${c.path} from ${w.fromId}`);
        if (!ids.includes(w.toId)) bad.push(`${c.path} to ${w.toId}`);
      }
      for (const n of c.nodes) for (const k of (n.children as string[]) ?? []) if (!ids.includes(k)) bad.push(`${c.path} child ${k}`);
    }
    expect(bad).toEqual([]);
  });

  it('🔴 IG-002 AC5: the Skills page’s trick 1 card names the steps — forward, turn, fill, water, pick, put — in both languages', () => {
    const want = { en: 'forward, turn, fill, water, pick, put', fr: 'avancer, tourner, remplir, arroser, ramasser, poser' };
    for (const lang of ['en', 'fr'] as const) {
      const n1 = run(SKILL_ROWS_SCRIPT, { tricks: {}, words: WORD_ROWS, lang, botName: 'Pip' }).rows.find((r: { id: string }) => r.id === 'n1');
      expect({ lang, has: n1.text.includes(want[lang]), braces: /[{}]/.test(n1.text) }).toEqual({ lang, has: true, braces: false });
    }
  });

  it('Start world: the tulip request starts facing its pond with an empty can (IG-002); free play is the mockup’s garden, no can; an unknown id is not found', () => {
    const t = run(START_WORLD_SCRIPT, { requests: REQ_ROWS, requestId: 'tulips-three', nonce: 1 });
    expect(t.found).toBe(true);
    expect(t.world.robots).toEqual([{ id: 'me', x: 1, y: 1, d: 3, carry: [], can: 0, canMax: 3 }]);
    expect(t.world.things.filter((x: { kind: string }) => x.kind === 'tulip')).toHaveLength(3);
    expect(t.allowed).toEqual(['fwd', 'left', 'right', 'water', 'fill', 'repeat']);
    const free = run(START_WORLD_SCRIPT, { requests: REQ_ROWS, requestId: 'free' });
    expect(free.isFree).toBe(true);
    expect(free.world.robots).toEqual([{ id: 'me', x: 0, y: 3, d: 1, carry: [], can: null, canMax: 3 }]);
    // The stones: an empty basket, a rock of four beside the start.
    const st = run(START_WORLD_SCRIPT, { requests: REQ_ROWS, requestId: 'path-stones' });
    expect([st.world.robots[0].carry, st.world.things]).toEqual([[], [{ kind: 'rock', x: 2, y: 2, left: 4 }]]);
    expect(run(START_WORLD_SCRIPT, { requests: REQ_ROWS, requestId: '' }).found).toBe(false);
    expect(run(START_WORLD_SCRIPT, { requests: REQ_ROWS }).found).toBe(false);
  });

  it('Record step: a press appends a block with the next id, and the robot moves by the engine’s own step', () => {
    // The mockup's garden (free play): the robot walks the path and waters the first tulip. IG-002's tulips below.
    const t = run(START_WORLD_SCRIPT, { requests: REQ_ROWS, requestId: 'free' });
    const a = run(RECORD_STEP_SCRIPT, { op: 'fwd', program: '[]', world: t.world, selected: '', lang: 'en', bumps: 0 });
    expect(JSON.parse(a.program)).toEqual([{ id: 1, t: 'fwd' }]);
    expect([a.world.robots[0].x, a.world.robots[0].y]).toEqual([1, 3]);
    const b = run(RECORD_STEP_SCRIPT, { op: 'fwd', program: a.program, world: a.world, selected: '', lang: 'en', bumps: 0 });
    const c = run(RECORD_STEP_SCRIPT, { op: 'left', program: b.program, world: b.world, selected: '', lang: 'en', bumps: 0 });
    const d = run(RECORD_STEP_SCRIPT, { op: 'water', program: c.program, world: c.world, selected: '', lang: 'en', bumps: 0 });
    expect(d.sayKey).toBe('sayDrink');
    expect(d.world.things.find((x: { kind: string; x: number }) => x.kind === 'tulip' && x.x === 2).watered).toBe(true);
    expect(JSON.parse(d.program).map((x: { id: number }) => x.id)).toEqual([1, 2, 3, 4]);
    // Into the selected container, like a palette tap.
    const inBody = run(RECORD_STEP_SCRIPT, { op: 'fwd', program: JSON.stringify([{ id: 7, t: 'repeat', n: 3, body: [] }]), world: t.world, selected: '7', lang: 'en', bumps: 0 });
    expect(JSON.parse(inBody.program)).toEqual([{ id: 7, t: 'repeat', n: 3, body: [{ id: 8, t: 'fwd' }] }]);
    // A bump counts, and a junk op records nothing.
    const wall = { ...t.world, robots: [{ id: 'me', x: 7, y: 3, d: 1, carry: [] }] };
    expect(run(RECORD_STEP_SCRIPT, { op: 'fwd', program: '[]', world: wall, lang: 'en', bumps: 2 }).bumps).toBe(3);
    expect(run(RECORD_STEP_SCRIPT, { op: 'jump', program: '[]', world: t.world, lang: 'en' }).recorded).toBe(false);
    // IG-002: fill and pick are pad presses too — the can fills at the pond; a stone comes out of the rock.
    const tul = run(START_WORLD_SCRIPT, { requests: REQ_ROWS, requestId: 'tulips-three' });
    const filled = run(RECORD_STEP_SCRIPT, { op: 'fill', program: '[]', world: tul.world, selected: '', lang: 'en', bumps: 0 });
    expect([filled.recorded, filled.sayKey, filled.world.robots[0].can, JSON.parse(filled.program)]).toEqual([true, 'sayFill', 3, [{ id: 1, t: 'fill' }]]);
    const dry = run(RECORD_STEP_SCRIPT, { op: 'water', program: '[]', world: tul.world, selected: '', lang: 'en', bumps: 0 });
    expect([dry.sayKey, dry.world.robots[0].can, dry.bumps]).toEqual(['sayDry', 0, 0]);
    const st = run(START_WORLD_SCRIPT, { requests: REQ_ROWS, requestId: 'path-stones' });
    const faced = run(RECORD_STEP_SCRIPT, { op: 'left', program: '[]', world: st.world, selected: '', lang: 'en', bumps: 0 });
    const mined = run(RECORD_STEP_SCRIPT, { op: 'pick', program: faced.program, world: faced.world, selected: '', lang: 'en', bumps: 0 });
    expect([mined.world.robots[0].carry, mined.world.things]).toEqual([['stone'], [{ kind: 'rock', x: 2, y: 2, left: 3 }]]);
  });

  it('Kit palette: band 7–9 draws the caption, band 10–12 the word; every block has its icon; slots come with options', () => {
    const pal = (band: number) => run(PALETTE_SCRIPT, { band, allowed: [], lang: 'fr', words: WORD_ROWS }).palette;
    const one = run(KIT_PALETTE_SCRIPT, { palette: pal(1), band: 1, lang: 'fr', words: WORD_ROWS }).palette;
    expect(one.find((e: { id: string }) => e.id === 'left').label).toBe(WORDS.cLeft.fr);
    const two = run(KIT_PALETTE_SCRIPT, { palette: pal(2), band: 2, lang: 'fr', words: WORD_ROWS }).palette;
    expect(two.find((e: { id: string }) => e.id === 'left').label).toBe(WORDS.bLeft.fr);
    expect(two.map((e: { icon: string }) => e.icon)).not.toContain(undefined);
    expect(two.find((e: { id: string }) => e.id === 'repeat').icon).toBe('loop');
    const until = two.find((e: { id: string }) => e.id === 'until');
    expect(until.slots[0].key).toBe('sensor');
    expect(until.slots[0].options.map((o: { value: string }) => o.value)).toContain('wall_ahead');
  });

  it('Tidy line: the offer shows until Not now, and again once the program changes', () => {
    const base = { isOffered: true, textKey: 'tidyFound', vars: { n: 3, len: 5 }, sample: 'fwd', words: WORD_ROWS, lang: 'en', botName: 'Pip' };
    expect(run(TIDY_LINE_SCRIPT, { ...base, programText: '[1]', dismissed: '' }).show).toBe(true);
    expect(run(TIDY_LINE_SCRIPT, { ...base, programText: '[1]', dismissed: '[1]' }).show).toBe(false);
    expect(run(TIDY_LINE_SCRIPT, { ...base, programText: '[1,2]', dismissed: '[1]' }).show).toBe(true);
    expect(run(TIDY_LINE_SCRIPT, { ...base, programText: '[1]', dismissed: '' }).text).toBe('I spotted the same 5 steps, 3 times in a row.');
    expect(run(TIDY_LINE_SCRIPT, { ...base, textKey: 'tidyFound1', vars: { n: 4, len: 1 }, programText: '[1]' }).text).toBe('4 × "forward" in a row.');
    expect(run(TIDY_LINE_SCRIPT, { ...base, blocks: 15 }).countText).toBe('15 blocks');
    expect(run(TIDY_LINE_SCRIPT, { ...base, blocks: 1, lang: 'fr' }).countText).toBe('1 bloc');
  });

  it('Draw world: the engine’s things in the kit’s words, the looks on the robot, the real end when a prediction missed', () => {
    const w = { map: ['GGB'], things: [{ kind: 'bowl', x: 0, y: 0, food: 1 }, { kind: 'egg', x: 1, y: 0 }], robots: [{ id: 'me', x: 0, y: 0, d: 1 }] };
    const d = run(DRAW_WORLD_SCRIPT, { world: w, color: '#8F6BFF', eye: 'wink', hat: 'sun', botName: 'Bo', bumps: 1, teachBumps: 2, showEnd: true, endX: 1, endY: 0 });
    // IG-001 D9: an egg, a stone, food and the Predict flag are the kit's sprites, never a label pill; the post box is
    // the B tile itself (the legend), not a thing on top of a path tile.
    expect(d.things).toEqual([
      { kind: 'bowl', x: 0, y: 0, full: true },
      { kind: 'egg', x: 1, y: 0 },
      { kind: 'flag', x: 1, y: 0 }
    ]);
    expect(d.map).toEqual({ rows: ['GGB'], legend: { B: 'postbox' } });
    // IG-002: a robot with no can draws no drops (can null), canMax 3, and carries nothing.
    // IG-005: a robot with no look of its own wears the page's look and Pip's can.
    expect(d.robots).toEqual([{ x: 0, y: 0, d: 1, colour: '#8F6BFF', eyes: 'wink', hat: 'sun', name: 'Bo', bump: 3, can: null, canMax: 3, carry: [], accessory: 'can' }]);
    expect(run(DRAW_WORLD_SCRIPT, { world: w, showEnd: false, endX: 1, endY: 0 }).things).toHaveLength(2);
    const stones = run(START_WORLD_SCRIPT, { requests: REQ_ROWS, requestId: 'path-stones' }).world;
    stones.things.push({ kind: 'stone', x: 3, y: 3 });
    const drawn = run(DRAW_WORLD_SCRIPT, { world: stones }).things;
    expect(drawn).toEqual([{ kind: 'rock', x: 2, y: 2, left: 4 }, { kind: 'stone', x: 3, y: 3 }]);
    // IG-002: the can and the load pass through to the Robots port; a sign and a note keep their text for the renderer.
    const carrying = { map: ['WGG'], things: [{ kind: 'sign', x: 2, y: 0, text: 'Tulips' }, { kind: 'note', x: 1, y: 0, text: 'Red ones' }], robots: [{ id: 'me', x: 1, y: 0, d: 3, can: 2, canMax: 3, carry: ['stone', 'letter'] }] };
    const cd = run(DRAW_WORLD_SCRIPT, { world: carrying });
    expect(cd.robots[0]).toMatchObject({ can: 2, canMax: 3, carry: ['stone', 'letter'] });
    expect(cd.things).toEqual([{ kind: 'sign', x: 2, y: 0, text: 'Tulips' }, { kind: 'note', x: 1, y: 0, text: 'Red ones' }]);
    // IG-006 × IG-002 (the merge): Mamie's note says "the red ones, not the yellow" — the kits get each tulip's colour
    // (their spelling, as the robots'), or the two rows draw alike and the child cannot see which row the note means.
    const mamie = run(START_WORLD_SCRIPT, { requests: REQ_ROWS, requestId: 'mamie-note' }).world;
    const tulipColours = run(DRAW_WORLD_SCRIPT, { world: mamie }).things.filter((t: any) => t.kind === 'tulip').map((t: any) => `${t.x},${t.y}:${t.colour}`);
    expect(tulipColours).toEqual(['2,2:red', '4,2:red', '6,2:red', '2,4:yellow', '4,4:yellow', '6,4:yellow']);
    expect(DRAW_WORLD_SCRIPT).not.toMatch(/GLYPH|🪨|📮|🏁/);
  });

  it('Update profile: a hat is worn only once it is owned; a language is set', () => {
    const fam = run(ADD_PROFILE_SCRIPT, { name: 'A', band: 1, lang: 'en' }).model;
    const id = fam.island.activeId;
    expect(run(UPDATE_PROFILE_SCRIPT, { model: fam, profileId: id, field: 'hat', value: 'sun' }).changed).toBe(false);
    fam.profiles[0].hats.push('sun');
    expect(run(UPDATE_PROFILE_SCRIPT, { model: fam, profileId: id, field: 'hat', value: 'sun' }).model.profiles[0].robot.hat).toBe('sun');
    expect(run(UPDATE_PROFILE_SCRIPT, { model: fam, profileId: id, field: 'lang', value: 'fr' }).model.profiles[0].lang).toBe('fr');
  });

  it('Island rows: a band sees its requests and below; a request done (by this kid) is done', () => {
    const one = run(ISLAND_ROWS_SCRIPT, { requests: REQ_ROWS, band: 1, done: ['tulips-three'], words: WORD_ROWS, lang: 'en' });
    expect(one.rows.map((r: { id: string }) => r.id)).toEqual(REQUESTS.filter((r) => r.band === 1).map((r) => r.id));
    expect(one.rows.find((r: { id: string }) => r.id === 'tulips-three').isDone).toBe(true);
    expect(run(ISLAND_ROWS_SCRIPT, { requests: REQ_ROWS, band: 2, done: [], words: WORD_ROWS, lang: 'en' }).rows).toHaveLength(REQUESTS.length);
  });

  // ── s3: one island per kid (ruling 8), the pins (ruling 6), the look items, the rename ──

  /** Two kids, A then B (B, the newest, is playing); A finishes the tulips. What each one's island says, as the page reads it. */
  function twoIslands(scripts: { family?: string; pins?: string } = {}) {
    let model = run(ADD_PROFILE_SCRIPT, { model: null, name: 'Ada', band: 2, lang: 'en', robotName: 'Pip' }).model;
    model = run(ADD_PROFILE_SCRIPT, { model, name: 'Bo', band: 2, lang: 'en', robotName: 'Rosie', color: '#5FB4E8' }).model;
    const [a, b] = model.profiles.map((p: { id: string }) => p.id);
    const tul = REQ_ROWS.find((r) => r.id === 'tulips-three')!;
    model = run(COMPLETE_REQUEST_SCRIPT, { model, profileId: a, requestId: tul.id, tricks: tul.tricks, reward: tul.reward }).model;
    const stored = () => JSON.parse(JSON.stringify(model));
    const view = (id: string) => {
      const chosen = run(SELECT_PROFILE_SCRIPT, { model: stored(), profileId: id }).model;
      const fam = run(scripts.family ?? FAMILY_SCRIPT, { model: JSON.parse(JSON.stringify(chosen)) });
      const rows = run(ISLAND_ROWS_SCRIPT, { requests: REQ_ROWS, band: fam.band, done: fam.done, words: WORD_ROWS, lang: 'en', botName: fam.botName });
      const pins = run(scripts.pins ?? ISLAND_PINS_SCRIPT, { requests: REQ_ROWS, band: fam.band, done: fam.done, words: WORD_ROWS, lang: 'en', botName: fam.botName });
      return { fam, rows, pins, tulips: rows.rows.find((r: { id: string }) => r.id === 'tulips-three'), mamie: pins.pins.find((p: { id: string }) => p.id === 'mamie') };
    };
    return { A: view(a), B: view(b) };
  }

  it('🔴 ruling 8: A finishes the tulips — A’s island says done, B’s island still offers them (the card and Mamie’s pin)', () => {
    const { A, B } = twoIslands();
    expect(A.fam.done).toEqual(['tulips-three']);
    expect(A.tulips.isDone).toBe(true);
    expect(B.fam.done).toEqual([]);
    expect(B.tulips.isDone).toBe(false);
    expect([B.mamie.isOpen, B.mamie.requestId]).toEqual([true, 'tulip-door']);
    // Mamie's first request B has not done is the first in the list; A's next one is the next she has not done.
    expect(A.mamie.requestId).toBe(REQ_ROWS.find((r) => r.islander === 'mamie' && r.id !== 'tulips-three')!.id);
    // Each kid's robot, not a sibling's: Read family gives the playing kid's look.
    expect([A.fam.botName, B.fam.botName]).toEqual(['Pip', 'Rosie']);
  });

  it('ruling 6: the pins — one per islander with a request, each labelled in the language, open while she has one left for this kid', () => {
    const pins = run(ISLAND_PINS_SCRIPT, { requests: REQ_ROWS, band: 2, done: [], words: WORD_ROWS, lang: 'fr', botName: 'Pip' }).pins;
    expect(pins.map((p: { id: string }) => p.id)).toEqual(ISLAND_PINS.map((p) => p.id));
    for (const p of pins) expect({ id: p.id, label: p.label.length > 0, open: p.isOpen }).toEqual({ id: p.id, label: true, open: true });
    // P106 s4 (e): the sea's pin classes went with the sea — nothing drew them since IG-004's island.
    for (const p of pins) expect(Object.keys(p).sort()).toEqual(['id', 'isOpen', 'label', 'requestId']);
    expect(pins.find((p: { id: string }) => p.id === 'mamie').label).toBe(WORDS.islMamie.fr);
    // Her first request done: the pin opens her next one, not the one done.
    const next = run(ISLAND_PINS_SCRIPT, { requests: REQ_ROWS, band: 2, done: ['tulip-door'], words: WORD_ROWS, lang: 'en' }).pins.find((p: { id: string }) => p.id === 'mamie');
    expect(next.requestId).toBe('tulips-three');
    // Every islander who asks has a pin (a new islander in the requests would have no pin: this names her).
    expect([...new Set(REQ_ROWS.map((r) => r.islander))].filter((i) => !ISLAND_PINS.some((p) => p.islander === i))).toEqual([]);
    // All of Biscuit's done: her pin is shut (no badge, no tap), and the band is honoured (Biscuit asks at band 10–12 only).
    const biscuitAll = REQ_ROWS.filter((r) => r.islander === 'biscuit').map((r) => r.id);
    const shut = run(ISLAND_PINS_SCRIPT, { requests: REQ_ROWS, band: 2, done: biscuitAll, words: WORD_ROWS, lang: 'en' }).pins.find((p: { id: string }) => p.id === 'biscuit');
    expect([shut.isOpen, shut.requestId]).toEqual([false, '']);
    const young = run(ISLAND_PINS_SCRIPT, { requests: REQ_ROWS, band: 1, done: [], words: WORD_ROWS, lang: 'en' }).pins.find((p: { id: string }) => p.id === 'biscuit');
    expect(young.isOpen).toBe(REQ_ROWS.some((r) => r.islander === 'biscuit' && r.band === 1));
  });

  it('item 1: every request has its own line under the Workshop title, in both languages, with the robot’s name in it', () => {
    expect(REQ_ROWS.map((r) => r.id).filter((id) => !REQUEST_SUBS[id])).toEqual([]);
    for (const r of REQ_ROWS) {
      for (const lang of ['en', 'fr']) {
        const card = run(REQUEST_CARD_SCRIPT, { requests: REQ_ROWS, requestId: r.id, words: WORD_ROWS, lang, botName: 'Rosie' });
        const own = String((PAGE_WORDS[REQUEST_SUBS[r.id].key] as Record<string, string>)[lang]).split('{b}').join('Rosie');
        expect({ id: r.id, lang, sub: card.sub }).toEqual({ id: r.id, lang, sub: own });
      }
    }
    // The tulips' line is the mockup's own sentence; free play keeps the island's general one.
    expect(run(REQUEST_CARD_SCRIPT, { requests: REQ_ROWS, requestId: 'tulips-three', words: WORD_ROWS, lang: 'en', botName: 'Pip' }).sub).toBe('Drive Pip yourself first. Pip remembers every step as a block, and then you can tidy the steps up.');
    expect(run(REQUEST_CARD_SCRIPT, { requests: REQ_ROWS, requestId: 'free', words: WORD_ROWS, lang: 'en', botName: 'Pip' }).sub).toBe(WORDS.isSub.en.split('{b}').join('Pip'));
  });

  it('item 3: the marks — one per tulip, lit as each drinks', () => {
    const t = run(START_WORLD_SCRIPT, { requests: REQ_ROWS, requestId: 'tulips-three' });
    expect(run(DRAW_WORLD_SCRIPT, { world: t.world }).marks.map((m: { lit: boolean }) => m.lit)).toEqual([false, false, false]);
    t.world.things.find((x: { kind: string }) => x.kind === 'tulip').watered = true;
    const m = run(DRAW_WORLD_SCRIPT, { world: t.world }).marks;
    expect(m.map((x: { lit: boolean }) => x.lit)).toEqual([true, false, false]);
    expect(m[0].cls).toContain('bg-mark-lit');
  });

  it('🔴 the rename: My robot’s name is kept, cut at the save’s length, and shows on the pin, the Workshop line and a hint', () => {
    const fam = run(ADD_PROFILE_SCRIPT, { name: 'Ada', band: 2, lang: 'en' }).model;
    const renamed = run(UPDATE_PROFILE_SCRIPT, { model: fam, field: 'robotName', value: '  Rosie  ' });
    expect(renamed.changed).toBe(true);
    const read = run(FAMILY_SCRIPT, { model: JSON.parse(JSON.stringify(renamed.model)) });
    expect(read.botName).toBe('Rosie');
    // The pin: the robot drawn with its name (the kit writes it under the robot).
    expect(run(DRAW_WORLD_SCRIPT, { world: { map: ['G'], things: [], robots: [{ id: 'me', x: 0, y: 0, d: 0 }] }, botName: read.botName }).robots[0].name).toBe('Rosie');
    // The Workshop's line and title words, and the owl's hint, fill {b}.
    expect(run(REQUEST_CARD_SCRIPT, { requests: REQ_ROWS, requestId: 'tulips-three', words: WORD_ROWS, lang: 'fr', botName: read.botName }).sub).toContain('Rosie');
    const hintRows = HINT_KEYS.map((key) => ({ key, ...HINTS[key] }));
    const withB = HINT_KEYS.find((k) => HINTS[k].en.includes('{b}'))!;
    expect(run(HINT_LINE_SCRIPT, { hints: hintRows, key: withB, lang: 'en', botName: read.botName, vars: {} }).text).toContain('Rosie');
    // Seventeen characters: kept as sixteen. Blank: the name stays.
    expect(run(UPDATE_PROFILE_SCRIPT, { model: renamed.model, field: 'robotName', value: 'Rosie-the-Robot-2' }).model.profiles[0].robot.name).toBe('Rosie-the-Robot-'.slice(0, ROBOT_NAME_MAX));
    expect(run(UPDATE_PROFILE_SCRIPT, { model: renamed.model, field: 'robotName', value: '   ' }).changed).toBe(false);
  });

  it('🔴 ruling 5 in the kit: white words on a block are never faded or put on a lightened chip; the defaults are the darker fills', () => {
    const kit = fs.readFileSync(path.join(REPO, 'library', 'modules', 'garden-kit', 'src', 'kit.js'), 'utf8');
    const rule = (sel: string) => (kit.match(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\{[^}]*\\}')) ?? [''])[0];
    for (const sel of ['.gd-nctl button', '.gd-slot']) expect({ sel, lightened: /rgba\(255,255,255/.test(rule(sel)), found: rule(sel).length > 0 }).toEqual({ sel, lightened: false, found: true });
    for (const sel of ['.gd-x', '.gd-band1 .gd-blk .gd-n']) expect({ sel, faded: /opacity/.test(rule(sel)), found: rule(sel).length > 0 }).toEqual({ sel, faded: false, found: true });
    expect(rule('.gd-bubble.gd-olive small')).toContain('#6A5AA8');
    for (const [port, token] of [['motionColor', '--block-motion'], ['actionColor', '--block-action'], ['controlColor', '--block-control'], ['askColor', '--block-ask'], ['runColor', '--block-run'], ['dropColor', '--block-drop']]) {
      const m = kit.match(new RegExp(port + ": \\{[^}]*default: '(#[0-9A-F]{6})'"));
      expect({ port, value: m && m[1] }).toEqual({ port, value: tokenValue(token) });
    }
  });

  it('the kit’s own icon: garden-kit no longer ships game-kit’s picture (CG-007 §7.1)', () => {
    const icon = (m: string) => fs.readFileSync(path.join(REPO, 'library', 'modules', m, 'icon.png'));
    const garden = icon('garden-kit');
    expect(garden.equals(icon('game-kit'))).toBe(false);
    // A PNG, 680 × 384 like every module icon in the library.
    expect(garden.subarray(1, 4).toString('latin1')).toBe('PNG');
    expect([garden.readUInt32BE(16), garden.readUInt32BE(20)]).toEqual([680, 384]);
    expect(JSON.parse(fs.readFileSync(path.join(REPO, 'library', 'modules', 'garden-kit', 'library.json'), 'utf8')).description).not.toMatch(/Bot Garden/);
  });

  /** Every list a repeater or the kit is handed: the rows the glue scripts publish, and every Static Data row in the graph. */
  function everyRowList(look = LOOK_ROWS_SCRIPT): Array<{ list: string; rows: Array<Record<string, unknown>> }> {
    const fam = run(ADD_PROFILE_SCRIPT, { name: 'A', band: 2, lang: 'en' }).model;
    fam.profiles[0].hats.push('sun');
    fam.profiles[0].stickers.push('letter');
    const f = run(FAMILY_SCRIPT, { model: fam });
    const lk = run(look, { color: '#FF7A59', eye: 'round', hat: 'none', hats: ['sun'], stickers: ['letter'], words: WORD_ROWS, lang: 'en' });
    const pal = run(PALETTE_SCRIPT, { band: 2, allowed: [], rungs: 'all', lang: 'en', words: WORD_ROWS }).palette;
    const out = [
      { list: 'Read family.profiles', rows: f.profiles },
      { list: 'Island rows.rows', rows: run(ISLAND_ROWS_SCRIPT, { requests: REQ_ROWS, band: 2, done: [], words: WORD_ROWS, lang: 'en' }).rows },
      { list: 'Island pins.pins', rows: run(ISLAND_PINS_SCRIPT, { requests: REQ_ROWS, band: 2, done: [], words: WORD_ROWS, lang: 'en' }).pins },
      { list: 'Draw world.marks', rows: run(DRAW_WORLD_SCRIPT, { world: run(START_WORLD_SCRIPT, { requests: REQ_ROWS, requestId: 'tulips-three' }).world }).marks },
      { list: 'Skill rows.rows', rows: run(SKILL_ROWS_SCRIPT, { tricks: {}, words: WORD_ROWS, lang: 'en' }).rows },
      { list: 'Look rows.paints', rows: lk.paints },
      { list: 'Look rows.eyes', rows: lk.eyes },
      { list: 'Look rows.hats', rows: lk.hats },
      { list: 'Look rows.stickers', rows: lk.stickers },
      { list: 'Kit palette.palette', rows: run(KIT_PALETTE_SCRIPT, { palette: pal, band: 2, lang: 'en', words: WORD_ROWS }).palette }
    ];
    for (const c of CG003_COMPONENTS) {
      for (const n of c.nodes.filter((x) => x.type === 'Static Data')) {
        const parsed = JSON.parse(String((n.parameters as { json: string }).json));
        if (Array.isArray(parsed)) out.push({ list: `${c.path}#${n.id}`, rows: parsed });
      }
    }
    return out;
  }
  const RESERVED = new Set<string>([...(RESERVED_ROW_FIELD_NAMES as Iterable<string>)]);
  const reservedIn = (lists: ReturnType<typeof everyRowList>) =>
    lists.flatMap(({ list, rows }) => [...new Set(rows.flatMap((r) => Object.keys(r ?? {})))].filter((k) => RESERVED.has(k)).map((k) => `${list}: ${k}`));

  it('🔴 no row any list carries has a field named like a Noodl Object\u2019s own member (the s2 drive: `fill`)', () => {
    const lists = everyRowList();
    expect(lists.length).toBeGreaterThan(10);
    expect(lists.every((l) => l.rows.length > 0)).toBe(true);
    expect(reservedIn(lists)).toEqual([]);
    // Known-firing: the name the drive caught is reserved.
    expect(RESERVED.has('fill')).toBe(true);
  });

  it('arm: the paint row field named `fill` again is caught, by list', () => {
    const m = LOOK_ROWS_SCRIPT.replace("paint: 'var(' + PAINTS[i].token + ')'", "fill: 'var(' + PAINTS[i].token + ')'");
    expect(m).not.toBe(LOOK_ROWS_SCRIPT);
    expect(reservedIn(everyRowList(m))).toEqual(['Look rows.paints: fill']);
  });

  it('🔴 AC3 in plain JS: teach the tulips’ fetch-and-return dance ×3 (4 blocks after 4), fold, play to the end, the goal met, the hat owned, the trick blooming', () => {
    const r = playTulips();
    expect(r.after4).toBe(4);
    expect(r.read.blocks).toBe(TULIP_DANCE.length * 3);
    expect(r.taughtWorld.things.filter((x: { watered?: boolean }) => x.watered)).toHaveLength(3);
    // IG-002: the can, press by press — filled to 3 at the pond, one spent per water, filled again on the next pass.
    expect(r.cans.slice(0, 9)).toEqual([3, 3, 3, 3, 2, 2, 2, 2, 2]);
    expect(r.cans[9]).toBe(3);
    expect([r.find.offer, r.find.len, r.find.count]).toEqual([true, TULIP_DANCE.length, 3]);
    expect(r.fold.program).toHaveLength(1);
    expect(r.fold.program[0].t).toBe('repeat');
    expect(r.fold.program[0].body).toHaveLength(TULIP_DANCE.length);
    expect(r.last.done).toBe(true);
    expect(r.goal.met).toBe(true);
    expect(r.playedWorld.robots[0].can).toBe(2);
    expect(r.summary.bloom).toEqual([1, 2]);
    // The reference is ten blocks (over MANY_BLOCKS): the win says Neat, not "it could be shorter" (IG-002).
    expect(r.summary.line).toBe('10 blocks. Neat!');
    expect(r.summary.learnText).toBe('Pip learned: repeat');
    expect(r.done.island.done).toEqual(['tulips-three']);
    expect(r.done.profiles[0].hats).toEqual(['sun']);
    expect(r.done.profiles[0].tricks.n2).toBe('bloom');
  });

  it('s3 hooks: free play offers every block (the palette keeps them to band 10–12); a request offers its own', () => {
    expect(run(START_WORLD_SCRIPT, { requests: REQ_ROWS, requestId: 'free' }).rungs).toBe('all');
    expect(run(START_WORLD_SCRIPT, { requests: REQ_ROWS, requestId: 'bowl-if' }).rungs).toEqual(['is-it-a']);
    expect(run(START_WORLD_SCRIPT, { requests: REQ_ROWS, requestId: 'mamie-note' }).rungs).toEqual(['read']);
    expect(run(START_WORLD_SCRIPT, { requests: REQ_ROWS, requestId: 'wall-until' }).rungs).toEqual([]);
    expect(run(START_WORLD_SCRIPT, { requests: REQ_ROWS, requestId: 'tulips-three' }).rungs).toEqual([]);
    const free = (band: number) => run(PALETTE_SCRIPT, { band, lang: 'en', words: WORD_ROWS, allowed: [], rungs: 'all' }).offered;
    expect([free(1), free(2)]).toEqual([[], ['say-thanks', 'read', 'is-it-a']]);
  });

  it('s3 hooks: the status door hands the exam on; Olive held says what it failed, in words, band 10–12 only', async () => {
    const exam = { passed: 17, failed: 1, rungs: { read: { pass: false }, 'say-thanks': { pass: true } } };
    const up = async () => ({ ok: true, json: async () => ({ model: 'ready', exam }) });
    expect((await runAsync(OLIVE_STATUS_SCRIPT, { nonce: 1 }, up)).exam).toEqual(exam);
    expect((await runAsync(OLIVE_STATUS_SCRIPT, { nonce: 1 }, async () => { throw new Error('no shell'); })).exam).toBe(null);
    const held = (o: Record<string, unknown>) => run(OLIVE_HELD_SCRIPT, { exam, band: 2, lang: 'en', words: WORD_ROWS, botName: 'Pip', ...o });
    expect(held({})).toEqual({ held: ['read'], show: true, text: WORDS.oliveCant.en + ': ' + OLIVE_WORDS.rungRead.en });
    expect(held({ lang: 'fr' }).text).toBe(WORDS.oliveCant.fr + ' : ' + OLIVE_WORDS.rungRead.fr);
    expect(held({ band: 1 })).toEqual({ held: [], show: false, text: '' });
    expect(held({ exam: null }).show).toBe(false);
    expect(held({ exam: { rungs: { 'say-thanks': { pass: true } } } }).show).toBe(false);
  });

  it('s4 / IG-006 AC7: Olive played — the block THIS run asked is Choose hint’s oliveRung (1–3); resting names the block too; a stale answer, a voiced hint say nothing', () => {
    const r = { runId: 'run-a', tick: 3, bumps: 0, puddles: 0 };
    const played = (answer: unknown, runNow: unknown = r) => run(OLIVE_PLAYED_SCRIPT, { answer, run: runNow });
    const rungN = (id: string) => OLIVE_RUNGS.find((x) => x.table.includes(id))?.n;
    for (const id of PALETTE_RUNG_IDS) expect({ id, n: played({ run: 'run-a', sent: true, rung: id, fallback: false }).oliveRung }).toEqual({ id, n: rungN(id) });
    expect(PALETTE_RUNG_IDS.map(rungN)).toEqual([1, 2, 3]);
    expect(played({ run: 'run-a', sent: true, rung: 'is-it-a', fallback: false })).toEqual({ oliveRung: 3, oliveFallback: false });
    expect(played({ run: 'run-a', sent: true, rung: 'read', fallback: true })).toEqual({ oliveRung: 2, oliveFallback: true });
    expect(played({ run: 'run-old', sent: true, rung: 'is-it-a', fallback: true })).toEqual({ oliveRung: 0, oliveFallback: false });
    expect(played({ run: 'run-a', sent: true, rung: 'voice-hint', key: 'hintWet', fallback: true })).toEqual({ oliveRung: 0, oliveFallback: false });
    // A lesson is never a run's (it is asked on Skills), and a cut rung has no number.
    expect(played({ run: 'run-a', sent: true, rung: 'count-tulips', fallback: false }).oliveRung).toBe(0);
    expect(played({ run: 'run-a', sent: true, rung: 'poem', fallback: false }).oliveRung).toBe(0);
    expect(played(null)).toEqual({ oliveRung: 0, oliveFallback: false });
    expect(played({ run: 'run-a', sent: false, rung: 'say-thanks', fallback: true, reason: 'not-in-list' })).toEqual({ oliveRung: 0, oliveFallback: false });
    expect(played({ run: 'run-a', sent: true, rung: 'is-it-a' }, null)).toEqual({ oliveRung: 0, oliveFallback: false });
    const t = run(START_WORLD_SCRIPT, { requests: REQ_ROWS, requestId: 'tulips-three' });
    const choose = (o: Record<string, unknown>) => run(CHOOSE_HINT_SCRIPT, { program: [{ id: 1, t: 'fwd' }], run: r, world: t.world, goalMet: false, ...o }).key;
    expect(choose({})).toBe('hintMissed');
    for (const [rung, n] of [['say-thanks', 1], ['read', 2], ['is-it-a', 3]] as const) {
      expect(choose(played({ run: 'run-a', sent: true, rung, fallback: false }))).toBe('oliveRung' + n);
      expect(choose(played({ run: 'run-a', sent: true, rung, fallback: true }))).toBe('oliveResting' + n);
    }
    expect(choose(played({ run: 'run-old', sent: true, rung: 'is-it-a', fallback: false }))).toBe('hintMissed');
    // The lines name the block: "read the note" / « lire le mot », "is it a…?" / « est-ce un… ? ».
    for (const lang of ['en', 'fr'] as const) {
      expect(HINTS.oliveResting2[lang]).toContain(OLIVE_WORDS.rungRead[lang]);
      expect(HINTS.oliveResting3[lang]).toContain(OLIVE_WORDS.rungIsItA[lang]);
    }
    expect(HINT_KEYS.filter((k) => /^oliveRung([4-9]|1\d)$/.test(k))).toEqual([]);
    const ws = CG003_COMPONENTS.find((c) => c.nodes.some((n) => n.id === 'plChoose'));
    const wires = (ws?.connections ?? []) as Array<{ fromId: string; fromProperty: string; toId: string; toProperty: string }>;
    const has = (f: string, fp: string, to: string, tp: string) => wires.some((w) => w.fromId === f && w.fromProperty === fp && w.toId === to && w.toProperty === tp);
    expect([has('plAskOlive', 'answer', 'plPlayed', 'answer'), has('plRunner', 'run', 'plPlayed', 'run'), has('plPlayed', 'oliveRung', 'plChoose', 'oliveRung'), has('plPlayed', 'oliveFallback', 'plChoose', 'oliveFallback')]).toEqual([true, true, true, true]);
  });

  it('IG-006 AC6: Lesson rows — Olive’s five lessons at band 10–12 (the canned question, Ask Olive, the words the checks need); the withheld one says so; nothing at 7–9', () => {
    const rows = (o: Record<string, unknown>) => run(LESSON_ROWS_SCRIPT, { band: 2, lang: 'en', words: WORD_ROWS, botName: 'Pip', exam: null, ...o });
    const en = rows({});
    expect([en.count, en.show, en.rows.map((r: any) => r.id)]).toEqual([5, true, ['count-tulips', 'maths', 'no-letter-e', 'tall-tales', 'translate']]);
    for (const r of en.rows) expect({ id: r.id, title: !!r.title, lesson: !!r.lesson, q: !!r.question, ask: r.askWord, lang: r.lang, bubble: r.w.oliveSaysBubble }).toEqual({ id: r.id, title: true, lesson: true, q: true, ask: 'Ask Olive', lang: 'en', bubble: 'Olive: {x}' });
    expect(en.rows[0].question).toBe('Mamie’s flowers: tulip, tulip, rose, tulip, daisy, tulip, rose. How many tulips?');
    const fr = rows({ lang: 'fr', exam: { rungs: { maths: { pass: false }, read: { pass: false } } } });
    expect(fr.rows.filter((r: any) => r.isHeld).map((r: any) => [r.id, r.heldText])).toEqual([['maths', WORDS.oliveCant.fr]]);
    expect(fr.rows[1].question).toBe('Combien font 14 + 9 ?');
    expect(rows({ band: 1 })).toEqual({ rows: [], show: false, count: 0 });
  });

  it('🔴 IG-006 AC6: Olive lesson — each canned question sent to the route (never typed), her answer, and the page’s CHECK underneath; no shell → her written answer, still checked', async () => {
    const W = run(LESSON_ROWS_SCRIPT, { band: 2, lang: 'en', words: WORD_ROWS, botName: 'Pip' }).rows[0].w;
    const WF = run(LESSON_ROWS_SCRIPT, { band: 2, lang: 'fr', words: WORD_ROWS, botName: 'Pip' }).rows[0].w;
    const sent: any[] = [];
    const says: Record<string, unknown> = { 'count-tulips': 6, maths: 14, 'no-letter-e': 'The tulip is a lovely red flower.', 'tall-tales': 'Sydney!', translate: 'Les tulipes sont vif.' };
    const shell = async (_url: string, init: { body: string; headers: Record<string, string> }) => {
      const b = JSON.parse(init.body);
      sent.push({ ...b, header: init.headers['x-garden'] });
      const v = says[b.rung];
      return { ok: true, json: async () => ({ ok: true, ...(typeof v === 'number' ? { value: v } : { text: v }) }) };
    };
    const ask = (lesson: string, lang = 'en', f: unknown = shell) => runAsync(OLIVE_LESSON_SCRIPT, { lesson, lang, w: lang === 'en' ? W : WF }, f);
    const count = await ask('count-tulips');
    expect(count.lines).toEqual([{ id: 'count-tulips:l0', q: '', a: 'Olive: 6', check: 'The program counts the word “tulip”: 4.' }]);
    expect(sent[0]).toEqual({ rung: 'count-tulips', slots: { list: 'tulip, tulip, rose, tulip, daisy, tulip, rose' }, lang: 'en', header: '1' });
    expect((await ask('maths')).lines[0]).toMatchObject({ a: 'Olive: 14', check: 'The rule adds them: 14 + 9 = 23.' });
    const e = await ask('no-letter-e');
    const marked = e.letters.filter((x: any) => x.isE);
    expect([e.eCount, marked.length, marked.every((x: any) => x.ground === 'var(--sun)' && /^e$/i.test(x.text))]).toEqual([4, 4, true]);
    expect(e.letters.map((x: any) => x.text).join('').replace(/\u00a0/g, ' ')).toBe('The tulip is a lovely red flower.');
    expect(e.lines[0]).toMatchObject({ a: '', check: 'The page checked every letter: 4 × e.' });
    says['no-letter-e'] = 'A pink bud, soft and round.';
    expect((await ask('no-letter-e')).lines[0].check).toBe('The page checked every letter: no e at all. She kept the rule this time.');
    // é, è and ê are an e too (the exam’s own fold).
    says['no-letter-e'] = 'Un été très doux.';
    expect((await ask('no-letter-e', 'fr')).eCount).toBe(3);
    const tall = await ask('tall-tales');
    expect(tall.lines.map((l: any) => [l.q, l.check])).toEqual([
      ['What is the capital of Australia?', 'In a book: the capital of Australia is Canberra.'],
      ['How much does the Moon weigh?', 'In a book: the Moon weighs about 73 billion billion tonnes, far more than a mountain.'],
      ['Who invented the bicycle?', 'In a book: the first bicycle was made in Germany, by Karl Drais, in 1817.']
    ]);
    expect(new Set([...(await ask('maths')).lines, ...count.lines, ...e.letters].map((x: any) => x.id)).size).toBe(2 + e.letters.length);
    const tr = await ask('translate');
    expect(tr.lines.map((l: any) => [l.q, l.check])).toEqual([
      ['French → English: “Les tulipes ont soif.”', 'In a book: The tulips are thirsty.'],
      ['English → French: “The tulips are thirsty.”', 'In a book: Les tulipes ont soif.']
    ]);
    expect(sent.slice(-2).map((b) => [b.rung, b.lang, b.slots.note])).toEqual([['translate', 'fr', 'Les tulipes ont soif.'], ['translate', 'en', 'The tulips are thirsty.']]);
    // No shell: the written (canned) answers, still checked — the lesson survives with no model.
    const none = await ask('count-tulips', 'fr', async () => { throw new Error('no shell'); });
    expect([none.fallback, none.lines[0].a, none.lines[0].check]).toEqual([true, 'Olive : 6', 'Le programme compte le mot « tulipe » : 4.']);
    const noneE = await ask('no-letter-e', 'en', async () => { throw new Error('no shell'); });
    expect(noneE.eCount).toBeGreaterThan(0);
    expect(OLIVE_LESSON_SCRIPT).not.toMatch(/\bInputs\.(text|typed|prompt)\b/);
  });

  it('🔴 IG-006 AC5: the card gate — a first tap on a block’s kind is held (the program as before, the card named); Got it, and the next tap places it; anything else passes as text', () => {
    const before = [{ id: 1, t: 'fwd' }];
    const tapped = JSON.stringify([{ id: 1, t: 'fwd' }, { id: 2, t: 'olive:read' }]);
    const first = run(CARD_GATE_SCRIPT, { program: tapped, before: JSON.stringify(before), seen: [] });
    expect([first.hold, first.cardId, first.program]).toEqual([true, 'olive:read', before]);
    expect(Array.isArray(first.program)).toBe(true); // a fresh list, so the Variable changes and the kit redraws without it
    const seen = run(CARD_SEEN_SCRIPT, { seen: [], cardId: 'olive:read' }).seen;
    expect(seen).toEqual(['olive:read']);
    expect(run(CARD_SEEN_SCRIPT, { seen, cardId: 'olive:read' }).seen).toEqual(['olive:read']);
    const second = run(CARD_GATE_SCRIPT, { program: tapped, before: JSON.stringify(before), seen });
    expect([second.hold, second.cardId, second.program]).toEqual([false, '', tapped]);
    // Into a container too; a count change, a removal and a drag pass untouched.
    const inRepeat = JSON.stringify([{ id: 1, t: 'repeat', n: 3, body: [{ id: 2, t: 'water' }] }]);
    expect(run(CARD_GATE_SCRIPT, { program: inRepeat, before: [{ id: 1, t: 'repeat', n: 3, body: [] }], seen: ['repeat'] })).toMatchObject({ hold: true, cardId: 'water' });
    for (const [now, was] of [
      [[{ id: 1, t: 'repeat', n: 4, body: [] }], [{ id: 1, t: 'repeat', n: 3, body: [] }]],
      [[], [{ id: 1, t: 'fwd' }]],
      [[{ id: 2, t: 'left' }, { id: 1, t: 'fwd' }], [{ id: 1, t: 'fwd' }, { id: 2, t: 'left' }]]
    ]) expect(run(CARD_GATE_SCRIPT, { program: JSON.stringify(now), before: was, seen: [] })).toMatchObject({ hold: false, program: JSON.stringify(now) });
    // The graph: every kit edit passes the gate before the program Variable; Got it marks the card seen, then closes it.
    const ws = CG003_COMPONENTS.find((c) => c.path === 'Workshop/Play')!;
    const wires = ws.connections as Array<{ fromId: string; fromProperty: string; toId: string; toProperty: string }>;
    const into = (id: string, port: string) => wires.filter((w) => w.toId === id && w.toProperty === port).map((w) => w.fromId + '.' + w.fromProperty).sort();
    expect(into('plSetProgKit', 'value')).toEqual(['plCardGate.program']);
    expect(into('plSetProgKit', 'do')).toEqual(['plCardGate.ran']);
    expect([into('plCardGate', 'program'), into('plCardGate', 'go'), into('plCardGate', 'before'), into('plCardGate', 'seen')]).toEqual([['plBlocks.onProgram'], ['plBlocks.onChanged'], ['plProgVar.value'], ['plSeenVar.value']]);
    expect([into('plSetCardOpen', 'do'), into('plSeenAdd', 'go'), into('plClearCardOpen', 'do'), into('plSetCardHelp', 'do')]).toEqual([['plCardHold.ontrue'], ['plCardOk.onClick'], ['plSetSeen.done'], ['plHelpEach.itemOutputSignal-chosen']]);
  });

  it('IG-006 AC5: EVERY palette block has a card — label, line, an example drawn as blocks — in both languages; the ? chips name each kind placed, once', () => {
    const all = new Set<string>([...run(PALETTE_SCRIPT, { band: 2, allowed: [], lang: 'en', words: WORD_ROWS }).palette.map((e: any) => e.id), ...run(PALETTE_SCRIPT, { band: 2, allowed: [], rungs: 'all', lang: 'en', words: WORD_ROWS }).palette.map((e: any) => e.id)]);
    expect([...all].filter((id) => !BLOCK_CARDS[id])).toEqual([]);
    const types = (list: any[], out = new Set<string>()): Set<string> => { for (const b of list) { out.add(b.t); if (b.body) types(b.body, out); } return out; };
    for (const id of Object.keys(BLOCK_CARDS)) {
      for (const lang of ['en', 'fr'] as const) {
        const c = run(BLOCK_CARD_SCRIPT, { cardOpen: id, lang, band: 2, words: WORD_ROWS, botName: 'Bo' });
        expect({ id, lang, show: c.show, title: !!c.title, line: /\S/.test(c.line) && !c.line.includes('{b}'), got: !!c.gotIt, n: c.example.length > 0 }).toEqual({ id, lang, show: true, title: true, line: true, got: true, n: true });
        for (const t of types(c.example)) expect({ id, t, drawn: c.palette.some((e: any) => e.id === t) }).toEqual({ id, t, drawn: true });
      }
    }
    // The card's title is the palette's own word (band 7–9: the caption).
    expect(run(BLOCK_CARD_SCRIPT, { cardOpen: 'fwd', lang: 'fr', band: 1, words: WORD_ROWS }).title).toBe(WORDS.cFwd.fr);
    expect(run(BLOCK_CARD_SCRIPT, { cardOpen: 'olive:is-it-a', lang: 'en', band: 2, words: WORD_ROWS }).line).toBe(WORDS.or6Line.en.replace('{b}', 'Pip'));
    expect(run(BLOCK_CARD_SCRIPT, { cardOpen: '', lang: 'en', words: WORD_ROWS })).toMatchObject({ show: false, example: [] });
    // Every slot value an example shows is one of its palette entry's options (so the kit prints its word, not the id).
    for (const [id, c] of Object.entries(BLOCK_CARDS)) for (const b of c.example) for (const [k, v] of Object.entries(b.slots ?? {})) {
      const entry = CARD_PALETTE.find((e) => e.id === b.t)!;
      const slot = entry.slots.find((x: any) => x.key === k) as any;
      expect({ id, t: b.t, k, v, shown: !!slot && slot.options.some((o: any) => o.value === v) }).toEqual({ id, t: b.t, k, v, shown: true });
    }
    const chips = run(HELP_CHIPS_SCRIPT, { program: [{ id: 1, t: 'fwd' }, { id: 2, t: 'repeat', n: 2, body: [{ id: 3, t: 'fwd' }, { id: 4, t: 'olive:read' }] }], lang: 'en', band: 2, words: WORD_ROWS });
    expect([chips.show, chips.rows]).toEqual([true, [{ id: 'help:fwd', label: '? forward' }, { id: 'help:repeat', label: '? repeat' }, { id: 'help:olive:read', label: '? read the note' }]]);
    // 🔴 A repeater's row is a Noodl Object, global by id (the s2 drive: five lesson cards showed one card's lines): the
    // chip opens its block's card through the help: id, and each lesson's rows are its own.
    expect(run(BLOCK_CARD_SCRIPT, { cardOpen: 'help:olive:read', lang: 'en', band: 2, words: WORD_ROWS })).toMatchObject({ show: true, cardId: 'olive:read' });
    expect(run(HELP_CHIPS_SCRIPT, { program: [], lang: 'en', words: WORD_ROWS })).toMatchObject({ show: false, rows: [] });
  });

  it('Olive: no shell is the written line and "not running"; an answer is her text', async () => {
    const down = async () => {
      throw new Error('no shell');
    };
    const s = await runAsync(OLIVE_STATUS_SCRIPT, { nonce: 1 }, down);
    expect([s.running, s.stopped, s.hasExam]).toEqual([false, true, false]);
    const up = async () => ({ ok: true, json: async () => ({ model: 'ready', exam: { passed: 19, failed: 1 } }) });
    const u = await runAsync(OLIVE_STATUS_SCRIPT, { nonce: 1 }, up);
    expect([u.running, u.passed, u.total]).toEqual([true, 19, 20]);
    const a = await runAsync(TRY_OLIVE_SCRIPT, { lang: 'en', fallback: 'written' }, down);
    expect([a.text, a.fallback]).toEqual(['written', true]);
    let sent: { headers?: Record<string, string>; body?: string } = {};
    const answers = async (_url: string, init: { headers: Record<string, string>; body: string }) => {
      sent = init;
      return { ok: true, json: async () => ({ ok: true, text: 'Thank you, Mamie Rose!' }) };
    };
    const b = await runAsync(TRY_OLIVE_SCRIPT, { lang: 'en', fallback: 'written', rung: 'say-thanks', slots: { to: 'Mamie Rose' } }, answers);
    expect([b.text, b.ok]).toEqual(['Thank you, Mamie Rose!', true]);
    expect(sent.headers?.['x-garden']).toBe('1');
    expect(Object.keys(JSON.parse(String(sent.body))).sort()).toEqual(['lang', 'rung', 'shape', 'slots', 'temperature']);
  });

  it('🔴 IG-003 AC1–3 in plain JS: four Drive presses move the robot four tiles and record nothing; Teach puts it back at the start and the same presses record four blocks to the same tile; Play from the start ends there; Drive keeps the program', () => {
    const start = run(START_WORLD_SCRIPT, { requests: REQ_ROWS, requestId: 'free' });
    const press = (op: string, program: unknown, world: unknown, record?: boolean) => run(RECORD_STEP_SCRIPT, { op, program, world, selected: '', lang: 'en', bumps: 0, ...(record === undefined ? {} : { record }) });
    let world = start.world;
    const program = '[]';
    for (let k = 0; k < 4; k++) {
      const p = press('fwd', program, world, false);
      expect([p.recorded, p.moved, p.program]).toEqual([false, true, '[]']);
      world = p.world;
    }
    expect([world.robots[0].x, world.robots[0].y]).toEqual([4, 3]);
    // Teach: the start, then the four presses recorded.
    const teach = run(TEACH_START_SCRIPT, { start: start.world, program: [], lang: 'en' });
    expect([teach.world.robots[0].x, teach.world.robots[0].y, teach.blocks, teach.resumed]).toEqual([0, 3, 0, false]);
    let taught: unknown = '[]';
    world = teach.world;
    for (let k = 0; k < 4; k++) {
      const p = press('fwd', taught, world, true);
      expect(p.recorded).toBe(true);
      taught = p.program;
      world = p.world;
    }
    const read = run(READ_PROGRAM_SCRIPT, { program: taught });
    expect([read.blocks, world.robots[0].x, world.robots[0].y]).toEqual([4, 4, 3]);
    // Play replays from the start and ends there.
    const end = run(PREDICT_END_SCRIPT, { program: read.program, world: start.world, lang: 'en' });
    expect([end.x, end.y]).toEqual([4, 3]);
    // Teach → Drive keeps the program; a Drive press leaves it as it is; Teach again resumes where the four blocks end.
    const drove = press('left', taught, world, false);
    expect([drove.recorded, drove.program]).toEqual([false, JSON.stringify(read.program)]);
    const again = run(TEACH_START_SCRIPT, { start: start.world, program: read.program, lang: 'en' });
    expect([again.world.robots[0].x, again.world.robots[0].y, again.world.robots[0].d, again.blocks, again.resumed]).toEqual([4, 3, 1, 4, true]);
    // Unset Record is Teach (the P105 callers).
    expect(press('fwd', '[]', start.world).recorded).toBe(true);
    expect(run(TEACH_START_SCRIPT, { program: [] }).world).toBeNull();
  });

  it('🔴 IG-003: what the mode says — the tag, the line under the world, the steps note — in both languages; Play says none of it', () => {
    const say = (mode: string, blocks = 0, atEntry = 0, lang = 'en') => run(MODE_LINE_SCRIPT, { mode, blocks, atEntry, words: WORD_ROWS, lang, botName: 'Bo' });
    const W = (key: string, lang: 'en' | 'fr' = 'en') => (IG006_WORDS[key] ?? WORDS[key])[lang].split('{b}').join('Bo');
    for (const lang of ['en', 'fr'] as const) {
      expect(say('drive', 0, 0, lang)).toMatchObject({ badge: W('ig3DrivingTag', lang), line: W('ig3Driving', lang), showLine: true, driving: true, note: W('ig3StepsDriving', lang) });
      expect(say('teach', 0, 0, lang)).toMatchObject({ badge: W('recording', lang), line: W('ig3TeachOn', lang), showLine: true, driving: false, note: '' });
      expect(say('teach', 4, 4, lang).line).toBe(W('ig3TeachGoOn', lang));
      expect(say('teach', 5, 4, lang)).toMatchObject({ line: '', showLine: false, badge: W('recording', lang) });
      expect(say('play', 3, 0, lang)).toMatchObject({ badge: '', line: '', showLine: false, driving: false, note: '' });
    }
    expect(W('ig3TeachOn')).toBe('Back to the start. Now show Bo the moves.');
  });

  it('🔴 IG-003 AC4: the challenge — on the tulips at band 10–12 with blocks not yet played it asks; a hit says so and ticks; settled or at band 7–9 or on free play the card keeps its own line', () => {
    const tulips = run(START_WORLD_SCRIPT, { requests: REQ_ROWS, requestId: 'tulips-three' });
    expect([tulips.challenge, run(START_WORLD_SCRIPT, { requests: REQ_ROWS, requestId: 'sami-thanks' }).challenge, run(START_WORLD_SCRIPT, { requests: REQ_ROWS, requestId: 'free' }).challenge, run(START_WORLD_SCRIPT, { requests: REQ_ROWS, requestId: 'mamie-note' }).challenge]).toEqual(['predict', 'predict', '', '']);
    const base = { challenge: 'predict', band: 2, blocks: 3, programText: '[1,2,3]', askedFor: '', outcome: '', live: false, cardLine: 'Mamie’s line', words: WORD_ROWS, lang: 'en', botName: 'Bo' };
    const W = (key: string, lang: 'en' | 'fr' = 'en') => IG006_WORDS[key][lang].split('{b}').join('Bo');
    expect(run(CHALLENGE_SCRIPT, base)).toEqual({ armed: true, showTick: false, line: W('ig3PredictAsk') });
    expect(run(CHALLENGE_SCRIPT, { ...base, lang: 'fr' }).line).toBe(W('ig3PredictAsk', 'fr'));
    expect(W('ig3PredictAsk')).toBe('Before you press Play, tap where Bo will stop.');
    // A right tap: settled for this program, the outcome hit.
    expect(run(CHALLENGE_SCRIPT, { ...base, askedFor: '[1,2,3]', outcome: 'hit' })).toEqual({ armed: false, showTick: true, line: W('ig3PredictRight') });
    // A miss, a Play, a One step: settled, the islander's own line.
    for (const outcome of ['miss', '']) expect(run(CHALLENGE_SCRIPT, { ...base, askedFor: '[1,2,3]', outcome })).toEqual({ armed: false, showTick: false, line: 'Mamie’s line' });
    // The program changed since: asked again.
    expect(run(CHALLENGE_SCRIPT, { ...base, askedFor: '[1,2]', outcome: 'hit' })).toMatchObject({ armed: true, showTick: false });
    // Nothing at band 7–9, with no blocks, while a run is live, or on a request with no challenge.
    for (const extra of [{ band: 1 }, { blocks: 0, programText: '[]' }, { live: true }, { challenge: '' }]) expect(run(CHALLENGE_SCRIPT, { ...base, ...extra })).toEqual({ armed: false, showTick: false, line: 'Mamie’s line' });
    // Draw world puts the tick on the end tile (the flag on a miss, as before).
    const w = { map: ['GGG'], things: [], robots: [{ id: 'me', x: 0, y: 0, d: 1 }] };
    expect(run(DRAW_WORLD_SCRIPT, { world: w, showTick: true, endX: 2, endY: 0 }).things).toEqual([{ kind: 'tick', x: 2, y: 0 }]);
    expect(run(DRAW_WORLD_SCRIPT, { world: w, showTick: false, endX: 2, endY: 0 }).things).toEqual([]);
  });

  describe('arms: each rule-bearing glue script mutated, and the check that kills it', () => {
    const mutate = (script: string, from: string, to: string) => {
      // One place only: an anchor the engine block shares would mutate the engine, not the glue.
      if (script.split(from).length !== 2) throw new Error(`the arm's anchor must occur exactly once: ${from}`);
      return script.replace(from, to);
    };
    it('Record step into the top list, never the selected container → killed', () => {
      const m = mutate(RECORD_STEP_SCRIPT, '(host || prog).push', 'prog.push');
      const t = run(START_WORLD_SCRIPT, { requests: REQ_ROWS, requestId: 'tulips-three' });
      const out = JSON.parse(run(m, { op: 'fwd', program: JSON.stringify([{ id: 7, t: 'repeat', n: 3, body: [] }]), world: t.world, selected: '7', lang: 'en' }).program);
      expect(out[0].body).toHaveLength(0); // the check above expects 1: killed
    });
    it('Record step records but does not move the robot → the AC3 path fails', () => {
      const m = mutate(RECORD_STEP_SCRIPT, 'w = apply(w, st.delta);\n  sayKey', 'sayKey');
      expect(playTulips({ record: m }).taughtWorld.things.filter((x: { watered?: boolean }) => x.watered)).toHaveLength(0);
    });
    it('Kit palette draws the word at band 7–9 → killed', () => {
      const m = mutate(KIT_PALETTE_SCRIPT, 'band === 1 ? String(e.caption || e.label || e.id)', 'band === 9 ? String(e.caption || e.label || e.id)');
      const pal = run(PALETTE_SCRIPT, { band: 1, allowed: [], lang: 'fr', words: WORD_ROWS }).palette;
      expect(run(m, { palette: pal, band: 1, lang: 'fr', words: WORD_ROWS }).palette.find((e: { id: string }) => e.id === 'left').label).not.toBe(WORDS.cLeft.fr);
    });
    it('Olive played counts an answer from another run → killed', () => {
      const m = mutate(OLIVE_PLAYED_SCRIPT, "runId !== '' && String(a.run) === runId && ", '');
      expect(run(m, { answer: { run: 'run-old', sent: true, rung: 'is-it-a', fallback: false }, run: { runId: 'run-a' } }).oliveRung).toBe(3); // the check above expects 0: killed
    });
    it('Lesson rows shows the lessons at band 7–9 → killed', () => {
      const m = mutate(LESSON_ROWS_SCRIPT, 'if (band === 2) for', 'if (true) for');
      expect(run(m, { band: 1, lang: 'en', words: WORD_ROWS, exam: null }).count).toBe(5); // the check above expects 0: killed
    });
    it('Card gate places a first tap → killed', () => {
      const m = mutate(CARD_GATE_SCRIPT, "seen.indexOf(t) === -1;", 'false;');
      expect(run(m, { program: JSON.stringify([{ id: 1, t: 'fwd' }]), before: [], seen: [] }).hold).toBe(false); // the check above expects true: killed
    });
    it('Olive played counts a refused (unsent) ask as resting → killed', () => {
      const m = mutate(OLIVE_PLAYED_SCRIPT, 'a.sent === true && ', '');
      expect(run(m, { answer: { run: 'run-a', sent: false, rung: 'say-thanks', fallback: true }, run: { runId: 'run-a' } }).oliveFallback).toBe(true); // the check above expects false: killed
    });
    it('Tidy line ignores Not now → killed', () => {
      const m = mutate(TIDY_LINE_SCRIPT, '&& program !== dismissed', '');
      expect(run(m, { isOffered: true, textKey: 'tidyFound', vars: {}, programText: '[1]', dismissed: '[1]', words: WORD_ROWS }).show).toBe(true);
    });
    it('Win summary forgets the tricks the program used → the AC3 path fails', () => {
      const m = mutate(WIN_SUMMARY_SCRIPT, 'if (used[asked[t]]) learnt', 'if (false) learnt');
      expect(playTulips({ win: m }).summary.hasLearn).toBe(false);
    });
    it('Update profile wears a hat that is not owned → killed', () => {
      const m = mutate(UPDATE_PROFILE_SCRIPT, "(h === 'none' || p.hats.indexOf(h) !== -1)", '(true)');
      const fam = run(ADD_PROFILE_SCRIPT, { name: 'A' }).model;
      expect(run(m, { model: fam, profileId: fam.island.activeId, field: 'hat', value: 'crown' }).changed).toBe(true);
    });
    it('Start world shares the request’s own things with the world (no copy) → killed', () => {
      const m = mutate(START_WORLD_SCRIPT, 'things: JSON.parse(JSON.stringify(req.things || []))', 'things: req.things');
      const reqs = JSON.parse(JSON.stringify(REQ_ROWS));
      const t = run(m, { requests: reqs, requestId: 'tulips-three' });
      t.world.things[0].watered = true;
      expect(reqs.find((r: { id: string }) => r.id === 'tulips-three').things[0].watered).toBe(true);
    });
    it('Read family gives the FIRST kid’s island, not the playing one’s → the ruling-8 row fails', () => {
      const m = mutate(FAMILY_SCRIPT, 'Outputs.done = active ? active.island.done.slice() : [];', 'Outputs.done = model.profiles.length ? model.profiles[0].island.done.slice() : [];');
      expect(twoIslands({ family: m }).B.tulips.isDone).toBe(true);
    });
    it('Island pins ignore what this kid has done → the pins row fails (the pin opens the request done)', () => {
      const m = mutate(ISLAND_PINS_SCRIPT, '&& done.indexOf(r.id) === -1) requestId', ') requestId');
      expect(run(m, { requests: REQ_ROWS, band: 2, done: ['tulip-door'], words: WORD_ROWS, lang: 'en' }).pins.find((p: { id: string }) => p.id === 'mamie').requestId).toBe('tulip-door');
    });
    it('Island pins open a pin with nothing left → the pins row fails', () => {
      const m = mutate(ISLAND_PINS_SCRIPT, 'isOpen: !!requestId', 'isOpen: true');
      expect(run(m, { requests: REQ_ROWS, band: 2, done: REQ_ROWS.filter((r) => r.islander === 'biscuit').map((r) => r.id), words: WORD_ROWS, lang: 'en' }).pins.find((p: { id: string }) => p.id === 'biscuit').isOpen).toBe(true);
    });
    it('Request card gives every request the general line → the item-1 row fails', () => {
      const m = mutate(REQUEST_CARD_SCRIPT, 'Outputs.sub = (req && SUBS[req.id] && w[SUBS[req.id]]) || w.isSub', 'Outputs.sub = w.isSub');
      expect(run(m, { requests: REQ_ROWS, requestId: 'tulips-three', words: WORD_ROWS, lang: 'en', botName: 'Pip' }).sub).not.toContain('Drive Pip yourself first');
    });
    it('Draw world lights no mark → the item-3 row fails', () => {
      const m = mutate(DRAW_WORLD_SCRIPT, 'lit: d < watered', 'lit: false');
      const t = run(START_WORLD_SCRIPT, { requests: REQ_ROWS, requestId: 'tulips-three' });
      t.world.things.forEach((x: { watered?: boolean }) => (x.watered = true));
      expect(run(m, { world: t.world }).marks.some((x: { lit: boolean }) => x.lit)).toBe(false);
    });
    it('Read family never says a migration is due → nothing writes the older family back', () => {
      const m = mutate(FAMILY_SCRIPT, 'Outputs.migrated = migrationDue(raw);', 'Outputs.migrated = false;');
      const v2 = { v: 2, profiles: [{ id: 'p1', name: 'Sam' }], island: { done: ['tulips-three'], activeId: 'p1' } };
      expect([run(FAMILY_SCRIPT, { model: v2 }).migrated, run(m, { model: v2 }).migrated]).toEqual([true, false]);
    });
    it('Island rows ignore the band → killed', () => {
      const m = mutate(ISLAND_ROWS_SCRIPT, 'if (!r || Number(r.band) > band) continue;', 'if (!r) continue;');
      expect(run(m, { requests: REQ_ROWS, band: 1, done: [], words: WORD_ROWS }).rows.length).toBeGreaterThan(REQUESTS.filter((r) => r.band === 1).length);
    });
  });
  describe('IG-005 — robots for the job, the glue (P106 s4)', () => {
    const kid = (lang = 'en') => run(ADD_PROFILE_SCRIPT, { model: null, name: 'Ada', band: 2, lang, robotName: 'Pip' }).model;
    const win = (model: any, id: string) => run(COMPLETE_REQUEST_SCRIPT, { model, requestId: id, tricks: [], reward: null }).model;
    const robotsOf = (model: any) => run(FAMILY_SCRIPT, { model }).robots;

    it('🔴 Job robot: the stones need Cobble — hers once Sami lent him (his name, look, hod, id); not lent yet, the catalogue’s Cobble, not owned; free play is Pip with no palette filter', () => {
      const lent = robotsOf(win(kid(), 'path-postbox'));
      const job = run(JOB_ROBOT_SCRIPT, { requests: REQ_ROWS, requestId: 'path-stones', robots: lent, lang: 'en', stepMs: TICK_MS });
      expect([job.needs, job.owned, job.robotId, job.botName, job.color, job.accessory, job.stepMs]).toEqual(['cobble', true, 'cobble', 'Cobble', '#7A8CA3', 'hod', TICK_MS]);
      expect(job.paletteRobot).toMatchObject({ kind: 'cobble', palette: ['pick', 'put'] });
      const none = run(JOB_ROBOT_SCRIPT, { requests: REQ_ROWS, requestId: 'path-stones', robots: robotsOf(kid()), lang: 'fr', stepMs: TICK_MS });
      expect([none.owned, none.robotId, none.botName]).toEqual([false, '', 'Cobble']);
      const free = run(JOB_ROBOT_SCRIPT, { requests: REQ_ROWS, requestId: 'free', robots: lent, lang: 'en', stepMs: TICK_MS });
      expect([free.needs, free.robotId, free.botName, free.paletteRobot]).toEqual(['pip', 'r1', 'Pip', null]);
      // Biscuit's boots: Pocket's steps × 0.7.
      let m = win(win(win(kid(), 'path-postbox'), 'bowl-if'), 'wall-until');
      expect(run(JOB_ROBOT_SCRIPT, { requests: REQ_ROWS, requestId: 'eggs-count', robots: robotsOf(m), lang: 'en', stepMs: TICK_MS }).stepMs).toBe(Math.round(TICK_MS * 0.7));
      // The key changes with the look, not with an upgrade (the world is not reset under the win card).
      const k1 = run(JOB_ROBOT_SCRIPT, { requests: REQ_ROWS, requestId: 'path-stones', robots: robotsOf(m), lang: 'en' }).robotKey;
      m = win(m, 'path-stones');
      expect(run(JOB_ROBOT_SCRIPT, { requests: REQ_ROWS, requestId: 'path-stones', robots: robotsOf(m), lang: 'en' }).robotKey).toBe(k1);
    });

    it('🔴 Start world puts the job robot on the world: its can (6 with can+), its basket (8 with basket+), its look for Draw world; and says which robot the request needs', () => {
      let m = win(kid(), 'path-postbox');
      m = win(win(m, 'rows-trick'), 'path-stones');
      const rows = robotsOf(m);
      const pip = rows.find((r: any) => r.kind === 'pip');
      const cobble = rows.find((r: any) => r.kind === 'cobble');
      const tul = run(START_WORLD_SCRIPT, { requests: REQ_ROWS, requestId: 'tulips-three', robot: pip, robotKey: 'k' });
      expect([tul.needs, tul.world.robots[0].can, tul.world.robots[0].canMax, tul.world.robots[0].look.accessory]).toEqual(['pip', 0, 6, 'can']);
      const st = run(START_WORLD_SCRIPT, { requests: REQ_ROWS, requestId: 'path-stones', robot: cobble, robotKey: 'k' });
      expect([st.needs, st.world.robots[0].basket, st.world.robots[0].look]).toEqual(['cobble', 8, { name: 'Cobble', colour: '#7A8CA3', eyes: 'round', hat: 'none', accessory: 'hod' }]);
      const drawn = run(DRAW_WORLD_SCRIPT, { world: st.world, words: WORD_ROWS, lang: 'en', botName: 'Pip', color: '#FF7A59' }).robots[0];
      expect([drawn.name, drawn.colour, drawn.accessory]).toEqual(['Cobble', '#7A8CA3', 'hod']);
      // No robot: the world as before IG-005.
      expect(run(START_WORLD_SCRIPT, { requests: REQ_ROWS, requestId: 'path-stones' }).world.robots[0]).toEqual({ id: 'me', x: 2, y: 3, d: 1, carry: [], basket: 4, can: null, canMax: 3 });
      expect(run(START_WORLD_SCRIPT, { requests: REQ_ROWS, requestId: 'free' }).needs).toBe('');
    });

    it('🔴 Gift line: “Sami lends you Cobble! Cobble lays stones.” and Mamie’s bigger can, in both languages; nothing when nothing was given', () => {
      const en = run(GIFT_LINE_SCRIPT, { lent: ['cobble'], upgraded: [], words: WORD_ROWS, lang: 'en' });
      expect([en.text, en.has]).toEqual(['Sami lends you Cobble! Cobble lays stones.', true]);
      expect(run(GIFT_LINE_SCRIPT, { lent: ['pocket'], upgraded: [], words: WORD_ROWS, lang: 'fr' }).text).toBe('Biscuit te prête Poche ! Poche porte les lettres et la nourriture.');
      expect(run(GIFT_LINE_SCRIPT, { lent: [], upgraded: ['can+'], words: WORD_ROWS, lang: 'en' }).text).toBe('Mamie Rose gives you Bigger can · 6 waters.');
      expect(run(GIFT_LINE_SCRIPT, { lent: [], upgraded: [], words: WORD_ROWS, lang: 'en' })).toMatchObject({ text: '', has: false });
    });

    it('🔴 Robot cards: four robots — hers with her name, colours, hats, blocks, upgrade and where; the others locked with who lends them and after what', () => {
      let m = win(kid(), 'path-postbox');
      m = run(COMPLETE_REQUEST_SCRIPT, { model: m, requestId: 'tulips-three', tricks: [], reward: { kind: 'hat', id: 'sun', from: 'mamie' }, program: '[{"id":1,"t":"fwd"}]' }).model;
      const fam = run(FAMILY_SCRIPT, { model: m });
      const cards = run(ROBOT_CARDS_SCRIPT, { robots: fam.robots, hats: fam.hats, band: 2, lang: 'en', words: WORD_ROWS, requests: REQ_ROWS }).cards;
      expect(cards.map((c: any) => [c.kind, c.name, c.owned, c.tag])).toEqual([['pip', 'Pip', true, 'Yours'], ['cobble', 'Cobble', true, 'Lent by Sami'], ['pocket', 'Pocket', false, 'Locked'], ['echo', 'Echo', false, 'Locked']]);
      expect(cards[0].whereText).toBe('At work on “Water my three tulips”');
      expect(cards[1].whereText).toBe('At home');
      expect(cards[2].whereText).toBe('Biscuit lends Pocket after “Feed me, but only if my bowl is empty”.');
      // Cobble's blocks: the moves, his own, the controls of 10–12 — each in its word and its block colour.
      const LBL: Record<string, string> = { fwd: 'bFwd', left: 'bLeft', right: 'bRight', pick: 'bPick', put: 'bPut', repeat: 'bRepeat', until: 'bUntil', if: 'bIf', when: 'bWhen', count_inc: 'bCountInc' };
      const bare = (id: string) => id.slice(id.lastIndexOf('|') + 1);
      expect(cards[1].abilities.map((a: any) => bare(a.id))).toEqual(['fwd', 'left', 'right', 'pick', 'put', 'repeat', 'until', 'if', 'when', 'count_inc']);
      expect(cards[1].abilities.map((a: any) => a.label)).toEqual(cards[1].abilities.map((a: any) => (WORDS as any)[LBL[bare(a.id)]].en));
      // 🔴 Every nested row id is its card's (a repeater row is global by id): no id is shared between two cards.
      const ids = cards.flatMap((c: any) => [...c.abilities, ...c.paints, ...c.hats].map((r: any) => r.id));
      expect(new Set(ids).size).toBe(ids.length);
      expect(cards.map((c: any) => [c.id, c.robotId])).toEqual([['pip', 'r1'], ['cobble', 'cobble'], ['pocket', ''], ['echo', '']]);
      expect(cards[1].abilities.map((a: any) => a.cls.split(' ').pop())).toEqual(['bg-blk-motion', 'bg-blk-motion', 'bg-blk-motion', 'bg-blk-action', 'bg-blk-action', 'bg-blk-control', 'bg-blk-control', 'bg-blk-control', 'bg-blk-control', 'bg-blk-control']);
      expect(cards[0].abilities.map((a: any) => bare(a.id))).toContain('olive:read');
      expect(cards[0].upgradeText).toBe('Empty slot · Bigger can · 6 waters · from Mamie Rose');
      expect(cards[0].hats.find((h: any) => h.id === 'pip|sun')).toMatchObject({ locked: false });
      expect(cards[2].paints).toEqual([]);
      expect(cards[1].paints.find((p: any) => p.selected).id).toBe('cobble|#7A8CA3');
      // At 7–9 the blocks are the captions and no control or Olive block.
      const young = run(ROBOT_CARDS_SCRIPT, { robots: fam.robots, hats: fam.hats, band: 1, lang: 'en', words: WORD_ROWS, requests: REQ_ROWS }).cards;
      expect(young[0].abilities.map((a: any) => bare(a.id))).toEqual(['fwd', 'left', 'right', 'water', 'fill']);
    });

    it('🔴 Island rows: a request is blocked while she has no robot of its kind, or while that robot works another plot — never for another robot’s work', () => {
      const rowsOf = (m: any) => run(ISLAND_ROWS_SCRIPT, { requests: REQ_ROWS, band: 2, done: [], plots: run(FAMILY_SCRIPT, { model: m }).plots, robots: robotsOf(m), words: WORD_ROWS, lang: 'en' }).rows;
      const blocked = (m: any) => rowsOf(m).filter((r: any) => r.blocked).map((r: any) => r.id).sort();
      expect(blocked(kid())).toEqual(REQUESTS.filter((r) => (r.needs ?? 'pip') !== 'pip').map((r) => r.id).sort());
      const m = run(COMPLETE_REQUEST_SCRIPT, { model: win(kid(), 'path-postbox'), requestId: 'path-stones', tricks: [], reward: null, program: '[{"id":1,"t":"fwd"}]', robotId: 'cobble' }).model;
      // Cobble works the stones: the bowl (his) is blocked; Pip's jobs are not.
      expect(blocked(m)).toEqual(['bowl-if', 'eggs-count', 'letter-say', 'rock-flower', 'sami-thanks']);
      expect(rowsOf(m).find((r: any) => r.id === 'path-stones').doneWord).toBe('✓ ' + WORD_ROWS.find((x) => x.key === 'done')!.en + ' · Cobble works here');
    });
  });
});
