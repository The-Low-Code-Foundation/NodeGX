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
import { PAGE_WORDS, PAGE_WORD_KEYS } from './cg003Content';
import { OLIVE_SCRIPTS, OLIVE_WORD_KEYS } from './cg005Olive';
import { C, CG003_COMPONENTS, LOGIC_COMPONENTS, LOGIC_SPECS, PAGES, REQUIRED_MODULES } from './cg003Components';
import {
  ALL_WORDS_JSON,
  TRY_OLIVE_SCRIPT,
  DRAW_WORLD_SCRIPT,
  GLUE_SCRIPTS,
  ISLAND_ROWS_SCRIPT,
  KIT_PALETTE_SCRIPT,
  OLIVE_STATUS_SCRIPT,
  READ_PROGRAM_SCRIPT,
  RECORD_STEP_SCRIPT,
  START_WORLD_SCRIPT,
  TIDY_LINE_SCRIPT,
  TRANSLATE_ALL_SCRIPT,
  UPDATE_PROFILE_SCRIPT,
  WIN_SUMMARY_SCRIPT
} from './cg003Scripts';
import { AuthoredGarden, buildGardenTemplateProject, prepareGardenArtefact, TEMPLATE_ID } from './cg003Template';
import { GARDEN_CSS, GARDEN_PRESET, GARDEN_TOKENS, tokenValue } from './cg007Look';
import { reducedMotionReport } from './reducedMotion';

jest.setTimeout(600_000);

const REPO = path.join(__dirname, '..', '..', '..');
const OUTPUT = path.join(REPO, 'templates', TEMPLATE_ID);

let built: AuthoredGarden;

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

/** The tulip request, taught by hand (the reference program unrolled), folded, played to the end: AC3 in plain JS. */
function playTulips(scripts: { record?: string; win?: string } = {}) {
  const start = run(START_WORLD_SCRIPT, { requests: REQ_ROWS, requestId: 'tulips-three', nonce: 0 });
  let world = start.world;
  let program: unknown = '[]';
  const taught = ['fwd', 'fwd', 'left', 'water', 'right'];
  const after4: number[] = [];
  for (let k = 0; k < 15; k++) {
    const rec = run(scripts.record ?? RECORD_STEP_SCRIPT, { op: taught[k % 5], program, world, selected: '', lang: 'en', bumps: 0 });
    program = rec.program;
    world = rec.world;
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
  return { start, taughtWorld, after4: after4[0], read, find, fold, ticks, last, goal, summary, done };
}

// ── The artefact ────────────────────────────────────────────────────────────

describe('CG-003 — Bot Garden, the artefact', () => {
  beforeAll(async () => {
    built = await buildGardenTemplateProject();
  });

  it('AC1: every screen of the mockup has its page, authored through one plan, kits installed first', () => {
    expect(built.modules).toEqual(['garden-kit', 'game-kit', 'bot-garden-fonts']);
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
    expect([...new Set(warnings.map((d) => String(d.component).replace(/^\//, '')))].sort()).toEqual(['Garden/Top bar', 'Pages/Profiles', 'Robot/Options', 'apply']);
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
    expect(OLIVE_WORD_KEYS.filter((k) => !WORD_ROWS.some((r) => r.key === k))).toEqual([]);
      for (const k of PAGE_WORD_KEYS) expect({ k, en: !!PAGE_WORDS[k].en, fr: !!PAGE_WORDS[k].fr }).toEqual({ k, en: true, fr: true });
      expect(WORD_ROWS.length).toBe(WORD_KEYS.length + OLIVE_WORD_KEYS.length + PAGE_WORD_KEYS.length);
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

    it('no backtick and no dollar-brace inside any glue script (README §7)', () => {
      for (const g of GLUE_SCRIPTS) expect({ c: g.component, bad: /`|\$\{/.test(g.script) }).toEqual({ c: g.component, bad: false });
      expect(/`/.test(GARDEN_CSS)).toBe(false);
    });

    it('🔴 AC5: at 7–9 no count and no Predict is mounted; the pad keys are 56 px', () => {
      const play = nodesOf(built, C.play);
      const conns = connectionsOf(built, C.play);
      for (const id of ['plCount', 'plPredict']) {
        expect(params(play.find((n) => n.id === id)!).mounted).toBe(false);
        expect(conns.some((c) => c.fromId === 'plIn' && c.fromProperty === 'isOlder' && c.toId === id && c.toProperty === 'mounted')).toBe(true);
      }
      const key = nodesOf(built, C.padKey).find((n) => n.type === 'net.noodl.controls.button')!;
      expect([params(key).width, params(key).height]).toEqual([{ value: 56, unit: 'px' }, { value: 56, unit: 'px' }]);
      expect(GARDEN_CSS).toMatch(/\.bg-key \{ width: 56px !important; height: 56px !important;/);
    });

    it('🔴 AC7: the win card is fixed and centred, every positioning property !important, and its root carries the class', () => {
      const rule = GARDEN_CSS.match(/\.bg-win \{([^}]*)\}/)![1];
      for (const p of ['position: fixed !important', 'left: 0 !important', 'right: 0 !important', 'top: 0 !important', 'bottom: 0 !important', 'place-items: center']) expect(rule).toContain(p);
      const root = nodesOf(built, C.win).find((n) => n.id === 'wnScrim')!;
      expect(String(params(root).cssClassName)).toBe('bg-win');
    });

    it('AC4: the block list scrolls in its own box', () => {
      const box = nodesOf(built, C.play).find((n) => n.id === 'plBlocksBox')!;
      expect(params(box).cssClassName).toBe('bg-blocks-box');
      expect(GARDEN_CSS).toMatch(/\.bg-blocks-box \{ max-height: [^;]+; overflow-y: auto !important;/);
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

    it('AC4: the stored tokens are the mockup’s :root', () => {
      const stored = JSON.parse(fs.readFileSync(path.join(built.projectDir, 'nodegx.project.json'), 'utf8')).metadata?.designTokens;
      const eff = buildEffectiveTokens(stored);
      for (const [name, hex] of [['--paper', '#FFF7E8'], ['--ink', '#2E2A3D'], ['--leaf', '#3FA66B'], ['--coral', '#FF7A59'], ['--violet', '#8F6BFF'], ['--violet-2', '#EEE8FF'], ['--block-motion', '#4C8DFF'], ['--block-control', '#FF9F1C']])
        expect({ name, value: String((eff.get(name) as { value?: string } | string | undefined) && ((eff.get(name) as { value?: string }).value ?? eff.get(name))).toUpperCase() }).toEqual({ name, value: hex });
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

    it('AC6: the contrast of every text on its ground, from the tokens — a readout, the failing pairs named', () => {
      const lum = (hex: string) => {
        const c = hex.replace('#', '').match(/../g)!.map((h) => parseInt(h, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
        return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
      };
      const ratio = (a: string, b: string) => {
        const [x, y] = [lum(tokenValue(a)), lum(tokenValue(b))].sort((p, q) => q - p);
        return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100;
      };
      const PAIRS: Array<[string, string, string]> = [
        ['ink on paper', '--ink', '--paper'],
        ['ink on card', '--ink', '--card'],
        ['ink-2 on paper', '--ink-2', '--paper'],
        ['ink-2 on card', '--ink-2', '--card'],
        ['ink-2 on paper-2 (quiet, tabs)', '--ink-2', '--paper-2'],
        ['eyebrow leaf on paper', '--leaf', '--paper'],
        ['white on leaf (Play)', '--on-fill', '--leaf'],
        ['white on coral (Teach)', '--on-fill', '--coral'],
        ['white on violet (Ask)', '--on-fill', '--violet'],
        ['owl text ink on violet-2', '--ink', '--violet-2'],
        ['owl meta on violet-2', '--violet-meta', '--violet-2'],
        ['white on motion block', '--on-fill', '--block-motion'],
        ['white on action block', '--on-fill', '--block-action'],
        ['white on control block', '--on-fill', '--block-control'],
        ['white on ask block', '--on-fill', '--block-ask']
      ];
      const table = PAIRS.map(([name, fg, bg]) => ({ name, ratio: ratio(fg, bg) }));
      fs.writeFileSync(path.join(os.tmpdir(), 'cg007-contrast.json'), JSON.stringify(table, null, 1));
      // The mockup's white labels on its fills do not reach 4.5:1. Pinned as a readout so a token change shows here;
      // making them pass is restyling the mockup, which is Richard's ruling (CG-007 §7), not this gate's.
      expect(table.filter((t) => t.ratio < 4.5).map((t) => t.name)).toEqual([
        'eyebrow leaf on paper',
        'white on leaf (Play)',
        'white on coral (Teach)',
        'white on violet (Ask)',
        'white on motion block',
        'white on action block',
        'white on control block',
        'white on ask block'
      ]);
    });

    it('the preset under the tokens is Playful, which brings Nunito', () => {
      expect(getPreset(GARDEN_PRESET)).toBeTruthy();
      expect(tokenValue('--font-sans')).toMatch(/^"Nunito"/);
      expect(GARDEN_TOKENS.filter((t) => t.name.startsWith('--block-')).map((t) => t.name)).toEqual(['--block-motion', '--block-action', '--block-control', '--block-ask', '--block-run']);
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

  it('Start world: the tulip request starts where the mockup does; free play is the mockup’s garden; an unknown id is not found', () => {
    const t = run(START_WORLD_SCRIPT, { requests: REQ_ROWS, requestId: 'tulips-three', nonce: 1 });
    expect(t.found).toBe(true);
    expect(t.world.robots).toEqual([{ id: 'me', x: 0, y: 3, d: 1, carry: [] }]);
    expect(t.world.things.filter((x: { kind: string }) => x.kind === 'tulip')).toHaveLength(3);
    expect(t.allowed).toEqual(['fwd', 'left', 'right', 'water', 'repeat']);
    expect(run(START_WORLD_SCRIPT, { requests: REQ_ROWS, requestId: 'free' }).isFree).toBe(true);
    expect(run(START_WORLD_SCRIPT, { requests: REQ_ROWS, requestId: '' }).found).toBe(false);
    expect(run(START_WORLD_SCRIPT, { requests: REQ_ROWS }).found).toBe(false);
  });

  it('Record step: a press appends a block with the next id, and the robot moves by the engine’s own step', () => {
    const t = run(START_WORLD_SCRIPT, { requests: REQ_ROWS, requestId: 'tulips-three' });
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
  });

  it('Draw world: the engine’s things in the kit’s words, the looks on the robot, the real end when a prediction missed', () => {
    const w = { map: ['GGB'], things: [{ kind: 'bowl', x: 0, y: 0, food: 1 }, { kind: 'egg', x: 1, y: 0 }], robots: [{ id: 'me', x: 0, y: 0, d: 1 }] };
    const d = run(DRAW_WORLD_SCRIPT, { world: w, color: '#8F6BFF', eye: 'wink', hat: 'sun', botName: 'Bo', bumps: 1, teachBumps: 2, showEnd: true, endX: 1, endY: 0 });
    expect(d.things).toEqual([
      { kind: 'bowl', x: 0, y: 0, full: true },
      { kind: 'label', x: 1, y: 0, text: '🥚' },
      { kind: 'label', x: 2, y: 0, text: '📮' },
      { kind: 'label', x: 1, y: 0, text: '🏁' }
    ]);
    expect(d.robots).toEqual([{ x: 0, y: 0, d: 1, colour: '#8F6BFF', eyes: 'wink', hat: 'sun', name: 'Bo', bump: 3 }]);
    expect(run(DRAW_WORLD_SCRIPT, { world: w, showEnd: false, endX: 1, endY: 0 }).things).toHaveLength(3);
  });

  it('Update profile: a hat is worn only once it is owned; a language is set', () => {
    const fam = run(ADD_PROFILE_SCRIPT, { name: 'A', band: 1, lang: 'en' }).model;
    const id = fam.island.activeId;
    expect(run(UPDATE_PROFILE_SCRIPT, { model: fam, profileId: id, field: 'hat', value: 'sun' }).changed).toBe(false);
    fam.profiles[0].hats.push('sun');
    expect(run(UPDATE_PROFILE_SCRIPT, { model: fam, profileId: id, field: 'hat', value: 'sun' }).model.profiles[0].robot.hat).toBe('sun');
    expect(run(UPDATE_PROFILE_SCRIPT, { model: fam, profileId: id, field: 'lang', value: 'fr' }).model.profiles[0].lang).toBe('fr');
  });

  it('Island rows: a band sees its requests and below; a request done by either robot is done (D2)', () => {
    const one = run(ISLAND_ROWS_SCRIPT, { requests: REQ_ROWS, band: 1, done: ['tulips-three'], words: WORD_ROWS, lang: 'en' });
    expect(one.rows.map((r: { id: string }) => r.id)).toEqual(REQUESTS.filter((r) => r.band === 1).map((r) => r.id));
    expect(one.rows.find((r: { id: string }) => r.id === 'tulips-three').isDone).toBe(true);
    expect(run(ISLAND_ROWS_SCRIPT, { requests: REQ_ROWS, band: 2, done: [], words: WORD_ROWS, lang: 'en' }).rows).toHaveLength(REQUESTS.length);
  });

  it('🔴 AC3 in plain JS: teach 15 steps (4 blocks after 4), fold, play to the end, the goal met, the hat owned, the trick blooming', () => {
    const r = playTulips();
    expect(r.after4).toBe(4);
    expect(r.read.blocks).toBe(15);
    expect(r.taughtWorld.things.filter((x: { watered?: boolean }) => x.watered)).toHaveLength(3);
    expect([r.find.offer, r.find.len, r.find.count]).toEqual([true, 5, 3]);
    expect(r.fold.program).toHaveLength(1);
    expect(r.fold.program[0].t).toBe('repeat');
    expect(r.fold.program[0].body).toHaveLength(5);
    expect(r.last.done).toBe(true);
    expect(r.goal.met).toBe(true);
    expect(r.summary.bloom).toEqual([1, 2]);
    expect(r.summary.line).toBe('6 blocks. Neat!');
    expect(r.summary.learnText).toBe('Pip learned: repeat');
    expect(r.done.island.done).toEqual(['tulips-three']);
    expect(r.done.profiles[0].hats).toEqual(['sun']);
    expect(r.done.profiles[0].tricks.n2).toBe('bloom');
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
    it('Island rows ignore the band → killed', () => {
      const m = mutate(ISLAND_ROWS_SCRIPT, 'if (!r || Number(r.band) > band) continue;', 'if (!r) continue;');
      expect(run(m, { requests: REQ_ROWS, band: 1, done: [], words: WORD_ROWS }).rows.length).toBeGreaterThan(REQUESTS.filter((r) => r.band === 1).length);
    });
  });
});
