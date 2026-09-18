/**
 * TPL-007 — the gate over the Rocket School artefact.
 *
 * What a render cannot grade, graded here on the artefact the door writes:
 *
 * - **It builds through the plan door**, deterministically: two builds agree
 *   byte for byte, and the checked-in `templates/rocket-school/` is what the
 *   generator writes today (a drift gate — TPL-001's went red for a day when
 *   the door changed under it).
 * - **The doctrine floors, recomputed** with the same derivation
 *   `measure-interfaces.py` uses: outputs ≥ 50%, flags ≥ 20%, States ≥ 0.15
 *   per component. Phase 85's ledger gets a row from these numbers.
 * - **Every `Logic/*` is a named utility**: Component Inputs → one Function →
 *   Component Outputs, and nothing else (P10).
 * - **Every States node has `useTransitions: false`** (D49) — a colour on a
 *   transitioning States node never publishes, and the board renders perfectly.
 * - **Every colour the graph sets is a token.** Not one hex.
 * - **The engine is data-driven**: rebuilt with a one-skill curriculum, only
 *   `Data/Curriculum` differs (TPL-006 §8's proof, again).
 * - **The kit travels**: `noodl_modules/game-kit/index.js` is in the artefact,
 *   and it is the one the library ships.
 *
 * @module noodl-mcp/tests/tpl007Template.test
 */
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

import type { LegacyConnection, LegacyNode } from '../../noodl-editor/src/editor/src/io/ProjectExporter';

import { CURRICULUM, HANGAR_LOOKS, HANGAR_SHELF, HangarItem, WORDS } from './tpl007Curriculum';
import { APP_CSS, C, CONTENT_SIZED_TEXTS, DATA_COMPONENTS, LOGIC_COMPONENTS, MONSTER_PIXELS, PAGES, REQUIRED_MODULES, TPL007_COMPONENTS } from './tpl007Components';
import { buildEffectiveTokens, checkFontFaces } from '../src/editor-deps';
import { reducedMotionReport } from './reducedMotion';
import { DRAW_HUNT_SCRIPT, MONSTER_LOOKS, runScript } from './tpl007Scripts';
import { AuthoredTemplate, buildRocketTemplateProject, prepareRocketArtefact, TEMPLATE_ID } from './tpl007Template';
import { DISPLAY_FONT, LARGE_TEXT_SIZES, requestedCompositions, ROLE, tpl007TokenEntries, USED_COMPOSITIONS } from './tpl007Theme';

jest.setTimeout(600_000);

const OUTPUT = path.join(__dirname, '..', '..', '..', 'templates', TEMPLATE_ID);
const KIT_BUILT = path.join(__dirname, '..', '..', '..', 'library', 'modules', 'game-kit', 'project', 'noodl_modules', 'game-kit', 'index.js');

let built: AuthoredTemplate;

function componentsOf(b: AuthoredTemplate) {
  return b.project.components ?? [];
}

function nodesOf(b: AuthoredTemplate, name: string): LegacyNode[] {
  const found = componentsOf(b).find((c) => c.name === name);
  if (!found) throw new Error(`no component "${name}" — the project has: ${componentsOf(b).map((c) => c.name).join(', ')}`);
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

/** Every Text that renders `white-space: pre` (content-sized), as `<component>#<node id>`. */
function contentSizedTexts(b: AuthoredTemplate): string[] {
  const out: string[] = [];
  for (const comp of componentsOf(b)) {
    for (const n of nodesOf(b, comp.name)) {
      const mode = (n.parameters as { sizeMode?: string } | undefined)?.sizeMode;
      if (n.type === 'Text' && (mode === 'contentSize' || mode === 'contentWidth')) out.push(`${comp.name}#${n.id}`);
    }
  }
  return out.sort();
}

function connectionsOf(b: AuthoredTemplate, name: string): LegacyConnection[] {
  return componentsOf(b).find((c) => c.name === name)?.graph?.connections ?? [];
}

/** Every file under a directory, relative, with its bytes. */
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

describe('TPL-007 — Rocket School, the artefact', () => {
  beforeAll(async () => {
    built = await buildRocketTemplateProject();
  });

  it('authors every component through one plan, installs the kits first, and registers six pages', () => {
    expect(built.planId).toMatch(/^plan-|\w+/);
    // The kits from the library (Make Ten Merge's arrows are keyboard-shortcuts), then the template's own bundled fonts (RKT-002: s1
    // never loaded its font).
    expect(built.modules).toEqual(['game-kit', 'keyboard-shortcuts', 'rocket-school-fonts']);
    expect(PAGES).toContain(C.pageMerge);
    expect(PAGES).toContain(C.pageHunt);
    expect(built.order).toHaveLength(TPL007_COMPONENTS.length + 1);
    expect(componentsOf(built).map((c) => c.name).sort()).toEqual([...TPL007_COMPONENTS.map((c) => '/' + c.path), '/' + C.app].sort());
    const router = nodesOf(built, '/' + C.app).find((n) => n.type === 'Router')!;
    const pages = (router.parameters as { pages?: { startPage?: string; routes?: string[] } }).pages!;
    expect(pages.startPage).toBe(C.pageProfiles);
    expect([...pages.routes!].sort()).toEqual([...PAGES].sort());
  });

  it('raised no warning the door did not refuse over, except the one it raises about its own plan', () => {
    const warnings = built.diagnostics.filter((d) => d.severity === 'warning');
    const codes = new Set(warnings.map((d) => d.code));
    // P88 GAM-021: `page-cannot-scroll` is gone — the plan door now judges the `bodyScroll` the plan's
    // own `scroll: "page"` leaves, and the artefact HAS it (asserted below).
    expect([...codes].sort()).toEqual(['uncollapsible-multi-column']);
    // P88 GAM-022: Arm B reads the item a `For Each` draws. The content-sized pills of `Game/Choice row` and
    // `Game/Question box` are no longer told to become columns; the two grids of tiles given a width
    // (132px hangar tiles, 150px profile cards) still are. Pinned by component, because the code set alone
    // cannot tell a fixed rule from a broken one. `apply` is the builder's label for `apply_plan`'s
    // re-validation, which raises the same two again.
    const multiColumn = new Set(
      warnings.filter((d) => d.code === 'uncollapsible-multi-column').map((d) => String(d.component).replace(/^\//, ''))
    );
    expect([...multiColumn].sort()).toEqual(['Hangar/Shelf', 'Pages/Profiles', 'apply']);
    const project = JSON.parse(fs.readFileSync(path.join(built.projectDir, 'nodegx.project.json'), 'utf8')) as { settings: { bodyScroll?: boolean } };
    expect(project.settings.bodyScroll).toBe(true);
  });

  it('the checked-in artefact is what the generator writes today, and two builds agree byte for byte', async () => {
    const scratch = fs.mkdtempSync(path.join(require('os').tmpdir(), 'tpl007-out-'));
    const out = path.join(scratch, TEMPLATE_ID);
    prepareRocketArtefact(built, out);
    const again = await buildRocketTemplateProject();
    const out2 = path.join(fs.mkdtempSync(path.join(require('os').tmpdir(), 'tpl007-out2-')), TEMPLATE_ID);
    prepareRocketArtefact(again, out2);
    const a = tree(out);
    const b = tree(out2);
    expect([...b.keys()].sort()).toEqual([...a.keys()].sort());
    for (const [file, bytes] of a) expect({ file, same: bytes.equals(b.get(file)!) }).toEqual({ file, same: true });
    // Drift: the committed directory.
    const committed = tree(OUTPUT);
    expect([...committed.keys()].sort()).toEqual([...a.keys()].sort());
    const differing = [...a.keys()].filter((file) => !a.get(file)!.equals(committed.get(file)!));
    expect(differing).toEqual([]);
  });

  it('the kit in the artefact is the one the library ships', () => {
    const inArtefact = fs.readFileSync(path.join(built.projectDir, 'noodl_modules', 'game-kit', 'index.js'));
    expect(inArtefact.equals(fs.readFileSync(KIT_BUILT))).toBe(true);
    for (const name of REQUIRED_MODULES) expect(fs.existsSync(path.join(OUTPUT, 'noodl_modules', name, 'manifest.json'))).toBe(true);
  });

  describe('the phase-85 floors, recomputed on the artefact', () => {
    it('outputs ≥ 50%, flags ≥ 20%, States ≥ 0.15 per component', () => {
      const FLAG = /^(show|hide|use|is|has|can|enable|disable|allow|visible|open|active|checked|selected|disabled|readonly|required|loading|mounted|timed|sound)/i;
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
      const reading = {
        components: withInterface,
        outputs: withOutputs / withInterface,
        flags: withFlag / withInterface,
        statesPerComponent: states / withInterface
      };
      expect(reading.components).toBeGreaterThanOrEqual(40);
      expect(reading.outputs).toBeGreaterThanOrEqual(0.5);
      expect(reading.flags).toBeGreaterThanOrEqual(0.2);
      expect(reading.statesPerComponent).toBeGreaterThanOrEqual(0.15);
    });

    it('every Logic/* is a named utility: Component Inputs → one Function → Component Outputs', () => {
      for (const spec of LOGIC_COMPONENTS) {
        const nodes = nodesOf(built, '/' + spec.path);
        const types = nodes.map((n) => n.type).sort();
        expect({ component: spec.path, types }).toEqual({ component: spec.path, types: ['Component Inputs', 'Component Outputs', 'JavaScriptFunction'] });
        const fn = nodes.find((n) => n.type === 'JavaScriptFunction')!;
        expect(String((fn.parameters as { functionScript?: string }).functionScript ?? '').length).toBeGreaterThan(20);
        // It publishes, and it has a name that is a job.
        expect(spec.outputs!.length).toBeGreaterThan(1);
        expect(spec.path).toMatch(/^Logic\/[A-Z][a-z]+ [a-z]/);
      }
    });

    it('every page is small: the game is in the parts, not the page', () => {
      for (const page of PAGES) expect({ page, nodes: nodesOf(built, page).length }).toEqual({ page, nodes: expect.any(Number) });
      for (const page of PAGES) expect(nodesOf(built, page).length).toBeLessThanOrEqual(32);
    });
  });

  describe('the runtime rules', () => {
    it('🔴 every States node has useTransitions false — D49', () => {
      for (const comp of componentsOf(built)) {
        for (const n of nodesOf(built, comp.name).filter((n) => n.type === 'States')) {
          expect({ component: comp.name, node: n.id, useTransitions: (n.parameters as { useTransitions?: boolean }).useTransitions }).toEqual({ component: comp.name, node: n.id, useTransitions: false });
        }
      }
    });

    it('every colour the graph sets is a token, and the compositions used are the ones declared', () => {
      const colourKeys = /colou?r|background$|^edge$|^fill$|^bg$|^fg$|^tone$/i;
      for (const comp of componentsOf(built)) {
        for (const n of nodesOf(built, comp.name)) {
          if (String(n.type).startsWith('game-kit.')) continue;
          for (const [key, value] of Object.entries((n.parameters ?? {}) as Record<string, unknown>)) {
            if (typeof value !== 'string' || !colourKeys.test(key) || key.startsWith('type-')) continue;
            expect({ component: comp.name, node: n.id, key, value }).toEqual({ component: comp.name, node: n.id, key, value: expect.stringMatching(/^(var\(--[a-z0-9-]+\)|transparent|inherit|none)$/) });
          }
        }
      }
      expect(requestedCompositions()).toEqual([...USED_COMPOSITIONS].sort());
    });

    it('🔴 RKT-001: a Text sizes to its words only when named — every other Text wraps', () => {
      // A content-sized Text is `white-space: pre` (Text.tsx): it never wraps. Stale entries fail too.
      expect(contentSizedTexts(built)).toEqual(Object.keys(CONTENT_SIZED_TEXTS).sort());
    });

    it('RKT-001 sabotage arm: one sentence put back to content size is caught, by name', () => {
      const doctored = { ...built, project: JSON.parse(JSON.stringify(built.project)) } as AuthoredTemplate;
      const message = nodesOf(doctored, C.banner).find((n) => n.id === 'fbMessage')!;
      (message.parameters as Record<string, unknown>).sizeMode = 'contentSize';
      expect(contentSizedTexts(doctored)).toEqual([...Object.keys(CONTENT_SIZED_TEXTS), `${C.banner}#fbMessage`].sort());
    });

    it('🔴 a Function fed by a value it produces runs only on its signal', () => {
      // Every run-driven Logic/* unticks every value input: the pixel game's loop, avoided by construction.
      for (const spec of LOGIC_COMPONENTS.filter((s) => s.inputs?.some((p) => p.name === 'run'))) {
        const fn = nodesOf(built, '/' + spec.path).find((n) => n.type === 'JavaScriptFunction')!;
        const params = fn.parameters as Record<string, unknown>;
        for (const p of spec.inputs!.filter((p) => p.name !== 'run')) {
          expect({ component: spec.path, input: p.name, unticked: params[`runOnChange-in-${p.name}`] }).toEqual({ component: spec.path, input: p.name, unticked: false });
        }
      }
    });
  });

  describe('RKT-002 — the Sticker book, recomputed from the tokens the generator writes', () => {
    type Entry = { name: string; value: string };
    const tokenValue = (entries: Entry[], name: string) => {
      const found = [...entries].reverse().find((t) => t.name === name);
      if (!found) throw new Error(`no token ${name}`);
      return found.value;
    };
    const luminance = (hex: string) => {
      const h = hex.replace('#', '');
      const channel = (i: number) => {
        const c = parseInt(h.slice(i, i + 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
    };
    const ratio = (a: string, b: string) => {
      const [la, lb] = [luminance(a), luminance(b)];
      return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
    };
    // Every pair the template draws. 3.0 is large text or a UI edge; 4.5 is body text.
    const PAIRS: Array<[string, string, number]> = [
      ['--primary-foreground', '--primary', 4.5],
      ['--primary', '--surface', 3.0],
      ['--foreground', '--background', 4.5],
      ['--foreground', '--surface', 4.5],
      ['--foreground', '--accent', 4.5],
      ['--muted-foreground', '--background', 4.5],
      ['--muted-foreground', '--surface', 4.5],
      ['--muted-foreground', '--accent', 4.5],
      ['--secondary-foreground', '--secondary', 4.5],
      ['--secondary', '--surface', 3.0],
      ['--destructive', '--background', 4.5],
      ['--destructive', '--surface', 4.5],
      ['--destructive', '--accent', 4.5],
      ['--destructive-foreground', '--destructive', 4.5],
      ['--border-control', '--background', 3.0],
      ['--border-control', '--surface', 3.0]
    ];
    const failing = (entries: Entry[]) =>
      PAIRS.filter(([fg, bg, floor]) => ratio(tokenValue(entries, fg), tokenValue(entries, bg)) < floor).map(([fg, bg]) => `${fg} on ${bg}`);

    it('every pair clears its floor', () => {
      expect(failing(tpl007TokenEntries())).toEqual([]);
    });

    it('sabotage arm: a lighter tomato fails the large-text pair, by name', () => {
      expect(failing([...tpl007TokenEntries(), { name: '--primary', value: '#ff8a6b' }])).toContain('--primary on --surface');
    });

    /** Texts coloured tomato or teal — as a parameter, or by a States value wired into `color` — below large size. */
    const smallRoleTexts = (b: AuthoredTemplate): string[] => {
      const role = /^var\(--(primary|secondary)\)$/;
      const out: string[] = [];
      for (const comp of componentsOf(b)) {
        const nodes = nodesOf(b, comp.name);
        const byId = new Map(nodes.map((n) => [n.id, n]));
        for (const n of nodes.filter((n) => n.type === 'Text')) {
          const params = (n.parameters ?? {}) as Record<string, unknown>;
          if ((LARGE_TEXT_SIZES as readonly string[]).includes(String(params.fontSize))) continue;
          const colours: unknown[] = [params.color];
          for (const c of connectionsOf(b, comp.name).filter((c) => c.toId === n.id && c.toProperty === 'color')) {
            const from = byId.get(c.fromId);
            if (from?.type !== 'States') continue;
            const fp = (from.parameters ?? {}) as Record<string, unknown>;
            for (const [key, value] of Object.entries(fp)) if (key.startsWith('value-') && key.endsWith(`-${c.fromProperty}`)) colours.push(value);
          }
          if (colours.some((v) => typeof v === 'string' && role.test(v))) out.push(`${comp.name}#${n.id}`);
        }
      }
      return out.sort();
    };

    it('🔴 tomato and teal colour text only at large sizes (tomato on paper is 2.92, teal on a card 3.06)', () => {
      expect(smallRoleTexts(built)).toEqual([]);
    });

    it('sabotage arm: "whose turn" put back to teal is caught, by name', () => {
      const doctored = { ...built, project: JSON.parse(JSON.stringify(built.project)) } as AuthoredTemplate;
      const turn = nodesOf(doctored, C.racePlay).find((n) => n.id === 'rpTurn')!;
      (turn.parameters as Record<string, unknown>).color = 'var(--secondary)';
      expect(smallRoleTexts(doctored)).toEqual([`${C.racePlay}#rpTurn`]);
    });

    it('🔴 the faces travel with the project: every face the stylesheet names is in the folder, with its licence', () => {
      // P88 GAM-016: Grandstander is the template's own; Nunito comes with the Playful preset's folder.
      for (const [folder, licences, count] of [
        ['rocket-school-fonts', ['OFL-Grandstander.txt'], 2],
        ['preset-font-nunito', ['OFL.txt'], 2]
      ] as const) {
        const dir = path.join(built.projectDir, 'noodl_modules', folder);
        const css = fs.readFileSync(path.join(dir, 'styles.css'), 'utf8');
        const faces = [...css.matchAll(/url\('([^']+)'\)/g)].map((m) => m[1]);
        expect({ folder, faces: faces.length }).toEqual({ folder, faces: count });
        for (const face of faces) expect({ face, there: fs.existsSync(path.join(dir, face)) }).toEqual({ face, there: true });
        for (const licence of licences) expect({ licence, there: fs.existsSync(path.join(dir, licence)) }).toEqual({ licence, there: true });
        expect(JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8')).browser.stylesheets).toEqual([`noodl_modules/${folder}/styles.css`]);
      }
    });

    it('GAM-016: every family token names a face the project ships (validate_project\'s font-face-not-shipped is silent)', () => {
      const modules = path.join(built.projectDir, 'noodl_modules');
      const sheets = fs.readdirSync(modules).flatMap((m) => {
        const manifest = path.join(modules, m, 'manifest.json');
        if (!fs.existsSync(manifest)) return [];
        const listed: string[] = JSON.parse(fs.readFileSync(manifest, 'utf8')).browser?.stylesheets ?? [];
        return listed.map((sheet) => fs.readFileSync(path.join(built.projectDir, sheet), 'utf8'));
      });
      const stored = JSON.parse(fs.readFileSync(path.join(built.projectDir, 'nodegx.project.json'), 'utf8')).metadata?.designTokens;
      const tokens = [...buildEffectiveTokens(stored).values()];
      expect(checkFontFaces({ tokens, stylesheets: sheets, component: '/App' })).toEqual([]);
      // Known-firing: without the stylesheets, Nunito is named.
      expect(checkFontFaces({ tokens, stylesheets: [], component: '/App' }).map((d) => d.message.match(/names "([^"]+)"/)?.[1])).toContain('Nunito');
    });

    it('titles and buttons wear the display face', () => {
      const all = componentsOf(built).flatMap((c) => nodesOf(built, c.name));
      const face = (n: LegacyNode) => (n.parameters as Record<string, unknown> | undefined)?.fontFamily === DISPLAY_FONT;
      expect(nodesOf(built, C.pageProfiles).find((n) => n.id === 'pfTitle')!.parameters).toMatchObject({ fontFamily: DISPLAY_FONT });
      expect(all.filter((n) => n.type === 'net.noodl.controls.button').every(face)).toBe(true);
    });
  });

  describe('RKT-003 — one screen per question, held in the graph', () => {
    it('the prompt steps down by the thresholds the stage drive mirrors (≤ 24 → 4xl, ≤ 60 → 3xl, else xl)', () => {
      const nodes = nodesOf(built, C.questionBox);
      expect((nodes.find((n) => n.id === 'qbLength')!.parameters as Record<string, unknown>).expression).toBe(
        "((prompt || '') + '').length <= 24 ? 'sum' : ((prompt || '') + '').length <= 60 ? 'sentence' : 'long'"
      );
      const size = nodes.find((n) => n.id === 'qbSize')!.parameters as Record<string, unknown>;
      expect([size['value-sum-size'], size['value-sentence-size'], size['value-long-size']]).toEqual(['var(--text-4xl)', 'var(--text-3xl)', 'var(--text-xl)']);
      // 🔴 The drive's worst-case swap bypasses the graph and copies this rule. If one moves, the other must.
      const drive = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'scripts', 'devtools', 'drive-rkt003-stage.js'), 'utf8');
      expect(drive).toContain("worstLength <= 24 ? '--text-4xl' : worstLength <= 60 ? '--text-3xl' : '--text-xl'");
    });

    it('🔴 the way to answer is mounted only while answering, so the verdict takes its place', () => {
      const conns = connectionsOf(built, C.questionBox);
      for (const [target, via] of [['qbTyped', 'qbShowTyped'], ['qbOptions', 'qbShowOptions']]) {
        expect({ target, mountedBy: conns.filter((c) => c.toId === target && c.toProperty === 'mounted').map((c) => c.fromId) }).toEqual({ target, mountedBy: [via] });
        expect({ via, readsEnabled: conns.some((c) => c.fromId === 'qbIn' && c.fromProperty === 'enabled' && c.toId === via) }).toEqual({ via, readsEnabled: true });
      }
    });

    it('the course has a height budget in viewport units', () => {
      const root = nodesOf(built, C.track).find((n) => n.id === 'rtRoot')!.parameters as Record<string, unknown>;
      expect({ height: root.height, maxHeight: root.maxHeight }).toEqual({ height: { value: 30, unit: 'vh' }, maxHeight: { value: 56, unit: 'vw' } });
    });
  });

  describe('RKT-002 AC4 — the reward moments, held in the graph', () => {
    const has = (conns: LegacyConnection[], [fromId, fromProperty, toId, toProperty]: string[]) =>
      conns.some((c) => c.fromId === fromId && c.fromProperty === fromProperty && c.toId === toId && c.toProperty === toProperty);
    const missing = (name: string, wires: string[][]) => wires.filter((w) => !has(connectionsOf(built, name), w)).map((w) => w.join(' → '));

    const ANIMATED = [
      'rkt-bang-a', 'rkt-bang-b', 'rkt-clock-last', 'rkt-join-a', 'rkt-join-b', 'rkt-land-a', 'rkt-land-b',
      'rkt-monster', 'rkt-monster-arrive-a', 'rkt-monster-arrive-b', 'rkt-monster-gone', 'rkt-monster-hit-a', 'rkt-monster-hit-b', 'rkt-monster-lunge-a', 'rkt-monster-lunge-b',
      'rkt-result', 'rkt-result-glyph', 'rkt-shake-a', 'rkt-shake-b', 'rkt-stars', 'rkt-wear-a', 'rkt-wear-b'
    ];

    it('🔴 every animation the app stylesheet starts is stilled for reduced motion', () => {
      expect(reducedMotionReport(APP_CSS)).toEqual({ animated: ANIMATED, unstilled: [] });
    });

    it('sabotage arm: without its reduced-motion block, every animation is named', () => {
      const bare = APP_CSS.replace(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*\}$/, '');
      expect(reducedMotionReport(bare).unstilled).toEqual(ANIMATED);
    });

    it('a right answer that moves rocket A signals its Boost, and the course hands the signal to the kit (P88 GAM-017)', () => {
      expect(
        missing(C.racePlay, [
          ['rpRound', 'correct', 'rpBoostA', 'condition'],
          ['rpGateA', 'ontrue', 'rpBoostA', 'eval'],
          ['rpBoostA', 'ontrue', 'rpBoostsA', 'increase'],
          ['rpBoostA', 'ontrue', 'rpTrack', 'burstA'],
          ['rpBoostB', 'ontrue', 'rpTrack', 'burstB'],
          ['rpResetB', 'done', 'rpBoostsA', 'reset']
        ])
      ).toEqual([]);
      expect(missing(C.track, [['rtIn', 'burstA', 'rtTrack', 'burstA'], ['rtIn', 'burstB', 'rtTrack', 'burstB']])).toEqual([]);
    });

    it('🔴 the result is a screen in the race stage: it takes the round’s slot, the track stays, and the page has no result banner', () => {
      const byId = new Map(nodesOf(built, C.racePlay).map((n) => [n.id, n]));
      const kids = (id: string) => (byId.get(id)?.children ?? []).map((n) => n.id);
      expect({ stage: kids('rpWrap'), slot: kids('rpRoundSlot'), result: byId.get('rpResult')?.type }).toEqual({
        stage: ['rpControls', 'rpTrack', 'rpTurn', 'rpRoundSlot', 'rpTeach', 'rpResult'],
        slot: ['rpRound'],
        result: C.raceResult
      });
      const conns = connectionsOf(built, C.racePlay);
      const mountedBy = (id: string) => conns.filter((c) => c.toId === id && c.toProperty === 'mounted').map((c) => `${c.fromId}.${c.fromProperty}`);
      expect({ slot: mountedBy('rpRoundSlot'), result: mountedBy('rpResult'), teach: mountedBy('rpTeach'), track: mountedBy('rpTrack') }).toEqual({ slot: ['rpPhase.racing'], result: ['rpPhase.over'], teach: ['rpPhase.teaching'], track: [] });
      expect(
        missing(C.racePlay, [
          ['rpSetWinA', 'done', 'rpPhase', 'to-over'],
          ['rpSetWinB', 'done', 'rpPhase', 'to-over'],
          ['rpResult', 'again', 'rpPhase', 'to-racing'],
          ['rpResult', 'again', 'rpResetA', 'do']
        ])
      ).toEqual([]);
      expect(nodesOf(built, C.pageRace).filter((n) => n.type === C.banner).map((n) => n.id)).toEqual([]);
    });

    it('the fanfare follows which rocket landed', () => {
      expect(missing(C.pageRace, [['rcPlay', 'cheer', 'rcSoundsEnd', 'win'], ['rcPlay', 'sigh', 'rcSoundsEnd', 'lose']])).toEqual([]);
      expect(missing(C.racePlay, [['rpSetWinA', 'done', 'rpOut', 'cheer'], ['rpSetWinB', 'done', 'rpBLanded', 'eval'], ['rpBLanded', 'onfalse', 'rpOut', 'sigh']])).toEqual([]);
    });
  });

  describe('RKT-004 — "Show me how" opens the Teach card in the race stage', () => {
    const has = (conns: LegacyConnection[], [fromId, fromProperty, toId, toProperty]: string[]) =>
      conns.some((c) => c.fromId === fromId && c.fromProperty === fromProperty && c.toId === toId && c.toProperty === toProperty);
    const missing = (name: string, wires: string[][]) => wires.filter((w) => !has(connectionsOf(built, name), w)).map((w) => w.join(' → '));
    const param = (name: string, id: string, key: string) => (nodesOf(built, name).find((n) => n.id === id)!.parameters as Record<string, unknown>)[key];

    it('🔴 Show me puts the card where the round was, and Got it asks the next question through the gate Next uses', () => {
      expect(
        missing(C.racePlay, [
          ['rpRound', 'showMe', 'rpPhase', 'to-teaching'],
          ['rpPhase', 'teaching', 'rpTeach', 'mounted'],
          ['rpTeach', 'gotIt', 'rpPhase', 'to-racing'],
          ['rpTeach', 'gotIt', 'rpGoOn', 'eval'],
          ['rpRound', 'next', 'rpGoOn', 'eval']
        ])
      ).toEqual([]);
      expect(nodesOf(built, C.racePlay).find((n) => n.id === 'rpTeach')?.type).toBe(C.teachCard);
    });

    it('the card is the missed skill’s, at the step for its misses in a row, with this question worked through', () => {
      expect(
        missing(C.racePlay, [
          ['rpIn', 'teachCards', 'rpTeachPick', 'cards'],
          ['rpRound', 'teach', 'rpTeachPick', 'teachId'],
          ['rpRound', 'missCount', 'rpStep', 'misses'],
          ['rpStep', 'result', 'rpTeachPick', 'step'],
          ['rpTeachPick', 'title', 'rpTeach', 'title'],
          ['rpTeachPick', 'text', 'rpTeach', 'text'],
          ['rpTeachPick', 'example', 'rpTeach', 'example'],
          ['rpRound', 'worked', 'rpTeach', 'worked'],
          ['rpRound', 'prompt', 'rpTeach', 'prompt']
        ])
      ).toEqual([]);
      expect(param(C.racePlay, 'rpStep', 'expression')).toBe('min(2, max(0, misses - 1))');
      expect(missing(C.raceRound, [['rdGrade', 'missCount', 'rdOut', 'missCount'], ['rdPick', 'worked', 'rdOut', 'worked'], ['rdPick', 'worked', 'rdGrade', 'worked'], ['rdPick', 'prompt', 'rdOut', 'prompt']])).toEqual([]);
      expect(missing(C.pageRace, [['rcTeachCards', 'cards', 'rcPlay', 'teachCards']])).toEqual([]);
    });

    it('🔴 Show me is offered only when there is something to teach: a wrong or timed-out answer, on a skill with a card', () => {
      expect(missing(C.raceRound, [['rdGrade', 'correct', 'rdCanTeach', 'correct'], ['rdPick', 'teach', 'rdCanTeach', 'teach'], ['rdCanTeach', 'result', 'rdBanner', 'canTeach']])).toEqual([]);
      expect(param(C.raceRound, 'rdCanTeach', 'expression')).toBe("correct !== true && ((teach || '') + '').length > 0");
    });

    it('the card’s question steps down when long, by the rule the teach drive’s worst-case swap mirrors', () => {
      expect(param(C.teachCard, 'tcLength', 'expression')).toBe("((prompt || '') + '').length <= 24 ? 'sum' : 'long'");
      const size = nodesOf(built, C.teachCard).find((n) => n.id === 'tcSize')!.parameters as Record<string, unknown>;
      expect([size['value-sum-size'], size['value-long-size']]).toEqual(['var(--text-xl)', 'var(--text-base)']);
      // 🔴 The drive's swap writes text without the graph, so it copies this rule. If one moves, the other must.
      const drive = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'scripts', 'devtools', 'drive-rkt004-teach.js'), 'utf8');
      expect(drive).toContain("promptLength <= 24 ? '--text-xl' : '--text-base'");
    });

    it('🔴 only a new question starts the clock, so an open card cannot time out (AC5, held in the graph)', () => {
      const starts = connectionsOf(built, C.raceRound).filter((c) => c.toId === 'rdClock' && c.toProperty === 'start').map((c) => `${c.fromId}.${c.fromProperty}`);
      expect(starts).toEqual(['rdPick.done']);
    });
  });

  describe('RKT-005 — the answer pad, held in the graph', () => {
    const has = (conns: LegacyConnection[], [fromId, fromProperty, toId, toProperty]: string[]) =>
      conns.some((c) => c.fromId === fromId && c.fromProperty === fromProperty && c.toId === toId && c.toProperty === toProperty);
    const missing = (name: string, wires: string[][]) => wires.filter((w) => !has(connectionsOf(built, name), w)).map((w) => w.join(' → '));

    it('🔴 the question box answers through the kit’s pad: no Text Input and no Check button left to write into while focused', () => {
      const nodes = nodesOf(built, C.questionBox);
      expect(nodes.filter((n) => n.type === 'net.noodl.controls.textinput' || n.type === 'net.noodl.controls.button').map((n) => n.id)).toEqual([]);
      const byId = new Map(nodes.map((n) => [n.id, n]));
      expect({ pad: byId.get('qbPad')?.type, row: (byId.get('qbTyped')?.children ?? []).map((n) => n.id) }).toEqual({ pad: 'game-kit.AnswerPad', row: ['qbPad'] });
      expect(
        missing(C.questionBox, [
          ['qbIn', 'padKeys', 'qbPad', 'keys'],
          ['qbIn', 'numeric', 'qbPad', 'numeric'],
          ['qbIn', 'prompt', 'qbPad', 'question'],
          ['qbIn', 'enabled', 'qbPad', 'enabled'],
          ['qbIn', 'checkWord', 'qbPad', 'submitLabel'],
          ['qbPad', 'onText', 'qbSetTyped', 'value'],
          ['qbPad', 'onSubmit', 'qbSetTyped', 'do'],
          ['qbPad', 'onText', 'qbOut', 'text']
        ])
      ).toEqual([]);
    });

    it('🔴 RKT-012: a typing question hands the pad its word, and the refused keys reach the grader and the keyboard', () => {
      expect((nodesOf(built, C.raceRound).find((n) => n.id === 'rdExpected')!.parameters as Record<string, unknown>).expression).toBe("isTyping === true ? ((answer || '') + '') : ''");
      expect(
        missing(C.raceRound, [
          ['rdPick', 'answer', 'rdExpected', 'answer'],
          ['rdPick', 'isTyping', 'rdExpected', 'isTyping'],
          ['rdExpected', 'result', 'rdBox', 'expected'],
          ['rdBox', 'mistakes', 'rdGrade', 'mistakes'],
          ['rdBox', 'wrongKey', 'rdKeys', 'wrongKey'],
          ['rdBox', 'mistakes', 'rdKeys', 'wrongCount']
        ])
      ).toEqual([]);
      expect(missing(C.questionBox, [['qbIn', 'expected', 'qbPad', 'expected'], ['qbPad', 'onMistakes', 'qbOut', 'mistakes'], ['qbPad', 'onWrongKey', 'qbOut', 'wrongKey']])).toEqual([]);
      expect(missing(C.keyboard, [['kbIn', 'wrongKey', 'kbMap', 'wrongKey'], ['kbIn', 'wrongCount', 'kbMap', 'wrongCount']])).toEqual([]);
    });

    it('the pad’s keys follow the question the picker asked', () => {
      expect(missing(C.raceRound, [['rdPick', 'padKeys', 'rdBox', 'padKeys'], ['rdPick', 'padNumeric', 'rdBox', 'numeric']])).toEqual([]);
    });

    it('🔴 RKT-008: the menu opens from the face and name, and starts closed on a page that never touches it (D55)', () => {
      const panel = nodesOf(built, C.header).find((n) => n.id === 'hdPanel')!.parameters as Record<string, unknown>;
      expect(String(panel.states).split(',')[0]).toBe('closed');
      expect([panel['value-closed-menu'], panel['value-closed-form'], panel['value-closed-open']]).toEqual([false, false, false]);
      const mountedBy = (id: string) => connectionsOf(built, C.header).filter((c) => c.toId === id && c.toProperty === 'mounted').map((c) => `${c.fromId}.${c.fromProperty}`);
      expect(mountedBy('hdMenu')).toEqual(['hdPanel.menu']);
      expect(mountedBy('hdForm')).toEqual(['hdPanel.form']);
      expect(missing(C.header, [['hdWho', 'onClick', 'hdIsOpen', 'eval'], ['hdPanel', 'open', 'hdIsOpen', 'condition'], ['hdIsOpen', 'onfalse', 'hdPanel', 'to-menu'], ['hdIsOpen', 'ontrue', 'hdPanel', 'to-closed']])).toEqual([]);
      // 🔴 Only the group answers a tap. The ▾ inside it is not wired, or one tap would open and close the menu.
      expect(connectionsOf(built, C.header).filter((c) => c.fromId === 'hdOpen')).toEqual([]);
    });

    it('🔴 RKT-008 AC2: the bar is one row — it never wraps, and the name gives way instead of pushing Home off a phone', () => {
      const params = (id: string) => nodesOf(built, C.header).find((n) => n.id === id)!.parameters as Record<string, unknown>;
      expect(params('hdBar')).toMatchObject({ flexDirection: 'row', flexWrap: 'nowrap' });
      expect(params('hdWho')).toMatchObject({ flexDirection: 'row', flexWrap: 'nowrap', width: { value: 100, unit: '%' } });
      expect(params('hdName')).toMatchObject({ sizeMode: 'contentHeight', width: { value: 100, unit: '%' } });
    });

    it('🔴 RKT-008: every menu change reaches the store — a setting at once, the edited player on Save, a deleted one on Yes', () => {
      expect(
        missing(C.header, [
          ['hdLang', 'changed', 'hdSet', 'run'], ['hdKeys', 'changed', 'hdSet', 'run'], ['hdSound', 'changed', 'hdSet', 'run'], ['hdAnswers', 'changed', 'hdSet', 'run'],
          ['hdLang', 'value', 'hdSet', 'lang'], ['hdKeys', 'value', 'hdSet', 'layout'], ['hdSound', 'value', 'hdSet', 'soundMode'], ['hdAnswers', 'value', 'hdSet', 'answerMode'],
          ['hdForm', 'create', 'hdRename', 'run'], ['hdForm', 'name', 'hdRename', 'name'], ['hdForm', 'level', 'hdRename', 'level'],
          ['hdForm', 'delete', 'hdDelete', 'run'],
          ['hdSet', 'done', 'hdOut', 'write'], ['hdRename', 'done', 'hdOut', 'write'], ['hdDelete', 'done', 'hdOut', 'write'], ['hdDelete', 'done', 'hdOut', 'deleted']
        ])
      ).toEqual([]);
      // 🔴 Two scripts, never one: the form's Variables are global by name, so a shared script would write a stale face with a language.
      expect(connectionsOf(built, C.header).filter((c) => c.toId === 'hdSet' && ['name', 'look', 'seed', 'level'].includes(c.toProperty))).toEqual([]);
      for (const [page, p] of [[C.pageHome, 'hm'], [C.pageRace, 'rc'], [C.pageHangar, 'hg'], [C.pageMerge, 'mg']] as const) {
        expect(missing(page, [[`${p}Store`, 'app', `${p}Header`, 'app'], [`${p}Header`, 'app', `${p}Store`, 'app'], [`${p}Header`, 'write', `${p}Store`, 'write'], [`${p}Header`, 'deleted', `${p}GoProfiles`, 'navigate'], [`${p}Me`, 'level', `${p}Header`, 'level'], [`${p}Me`, 'soundMode', `${p}Header`, 'soundMode']])).toEqual([]);
      }
    });

    it('RKT-008: one form, two modes — editing hides the language, shows Delete, and the first tap on Delete only asks', () => {
      const mode = nodesOf(built, C.newPlayer).find((n) => n.id === 'nfMode')!.parameters as Record<string, unknown>;
      expect(String(mode.states).split(',')[0]).toBe('create');
      expect(missing(C.newPlayer, [['nfMode', 'create', 'nfLangWrap', 'mounted'], ['nfMode', 'edit', 'nfDanger', 'mounted'], ['nfDelete', 'onClick', 'nfAskState', 'to-asking'], ['nfYes', 'onClick', 'nfOut', 'delete'], ['nfIn', 'fill', 'nfFillLevel', 'do']])).toEqual([]);
      expect(connectionsOf(built, C.newPlayer).filter((c) => c.fromId === 'nfDelete' && c.toId === 'nfOut')).toEqual([]);
      expect((nodesOf(built, C.header).find((n) => n.id === 'hdForm')!.parameters as Record<string, unknown>).editing).toBe(true);
    });

    it('🔴 RKT-008 AC7: the keyboard follows the keyboard — the pad reports it, the dropdown picks it, and the race page stores both', () => {
      expect(missing(C.questionBox, [['qbPad', 'onLayout', 'qbOut', 'layoutSeen'], ['qbPad', 'onLayoutSeen', 'qbOut', 'layoutSeenNow']])).toEqual([]);
      expect(missing(C.keyboard, [['kbIn', 'layout', 'kbPick', 'value'], ['kbPick', 'value', 'kbOut', 'picked'], ['kbPick', 'onChange', 'kbOut', 'pick'], ['kbShown', 'result', 'kbPick', 'mounted']])).toEqual([]);
      expect(missing(C.raceRound, [['rdBox', 'layoutSeen', 'rdOut', 'layoutSeen'], ['rdBox', 'layoutSeenNow', 'rdOut', 'layoutSeenNow'], ['rdKeys', 'picked', 'rdOut', 'layoutPick'], ['rdKeys', 'pick', 'rdOut', 'layoutPickNow']])).toEqual([]);
      expect(missing(C.racePlay, [['rpRound', 'layoutSeen', 'rpOut', 'layoutSeen'], ['rpRound', 'layoutSeenNow', 'rpOut', 'layoutSeenNow'], ['rpRound', 'layoutPick', 'rpOut', 'layoutPick'], ['rpRound', 'layoutPickNow', 'rpOut', 'layoutPickNow']])).toEqual([]);
      expect(missing(C.pageRace, [['rcPlay', 'layoutSeen', 'rcKeys', 'layoutSeen'], ['rcPlay', 'layoutSeenNow', 'rcKeys', 'run'], ['rcKeys', 'done', 'rcStore', 'write'], ['rcPlay', 'layoutPick', 'rcPick', 'layout'], ['rcPlay', 'layoutPickNow', 'rcPick', 'run'], ['rcPick', 'done', 'rcStore', 'write']])).toEqual([]);
      // 🔴 A report is never a pick, and never runs beside one. Build 7 fed ONE script both: the Dropdown's Value already held the
      // profile's layout, so every key press ran the script with a "pick" in it, and detection never wrote (driven, `detect`).
      const into = (id: string) => connectionsOf(built, C.pageRace).filter((c) => c.toId === id).map((c) => c.toProperty).sort();
      expect(into('rcKeys')).not.toContain('layout');
      expect(into('rcPick')).not.toContain('layoutSeen');
      expect(connectionsOf(built, C.pageRace).filter((c) => c.fromProperty === 'layoutSeen' && c.toProperty === 'layout')).toEqual([]);
      const script = String((nodesOf(built, C.keyboard).find((n) => n.id === 'kbPickItems')!.parameters as Record<string, unknown>).functionScript);
      const items = new Function('Outputs', `${script}; return Outputs.items;`)({}) as Array<{ Label: string; Value: string }>;
      expect(items).toEqual([{ Label: 'FR', Value: 'azerty' }, { Label: 'UK', Value: 'qwerty-uk' }, { Label: 'US', Value: 'qwerty' }]);
      expect(missing(C.keyboard, [['kbRoot', 'didMount', 'kbPickItems', 'run'], ['kbPickItems', 'out-items', 'kbPick', 'items']])).toEqual([]);
    });

    it('🔴 a typing race’s course is compact (18vh, not 30vh) for the whole race, so the keyboard fits under it', () => {
      const budget = nodesOf(built, C.track).find((n) => n.id === 'rtBudget')!.parameters as Record<string, unknown>;
      expect([budget['value-full-height'], budget['value-compact-height']]).toEqual([30, 18]);
      expect(missing(C.track, [['rtIn', 'compact', 'rtCompact', 'compact'], ['rtCompact', 'result', 'rtBudget', 'currentState'], ['rtBudget', 'height', 'rtRoot', 'height']])).toEqual([]);
      expect(missing(C.racePlay, [['rpIn', 'mode', 'rpTyping', 'mode'], ['rpTyping', 'result', 'rpTrack', 'compact']])).toEqual([]);
      expect((nodesOf(built, C.racePlay).find((n) => n.id === 'rpTyping')!.parameters as Record<string, unknown>).expression).toBe("mode === 'typing'");
    });
  });

  describe('RKT-006 — restart from inside the race, held in the graph', () => {
    const has = (conns: LegacyConnection[], [fromId, fromProperty, toId, toProperty]: string[]) =>
      conns.some((c) => c.fromId === fromId && c.fromProperty === fromProperty && c.toId === toId && c.toProperty === toProperty);
    const missing = (name: string, wires: string[][]) => wires.filter((w) => !has(connectionsOf(built, name), w)).map((w) => w.join(' → '));

    it('🔴 Restart goes through the reset Start and Play again use: rockets, rounds and bursts to zero, then a new question', () => {
      expect(
        missing(C.racePlay, [
          ['rpRestart', 'onClick', 'rpPhase', 'to-racing'],
          ['rpRestart', 'onClick', 'rpResetA', 'do'],
          ['rpResetA', 'done', 'rpResetB', 'do'],
          ['rpResetB', 'done', 'rpRounds', 'reset'],
          ['rpResetB', 'done', 'rpBoostsA', 'reset'],
          ['rpResetB', 'done', 'rpRound', 'ask']
        ])
      ).toEqual([]);
      // The new question closes the banner and RESTARTS the deadline (a Delay's Restart drops the countdown it replaces).
      expect(missing(C.raceRound, [['rdIn', 'ask', 'rdBanner', 'hide'], ['rdPick', 'done', 'rdClock', 'start']])).toEqual([]);
      expect(missing(C.countdown, [['cdSetEmpty', 'done', 'cdDeadline', 'restart']])).toEqual([]);
    });

    it('🔴 Change the race stops the round’s clock, because no new question will (AC5: an abandoned race never grades)', () => {
      expect(missing(C.racePlay, [['rpSettings', 'onClick', 'rpRound', 'abandon'], ['rpSettings', 'onClick', 'rpOut', 'changeRace']])).toEqual([]);
      expect(missing(C.raceRound, [['rdIn', 'abandon', 'rdClock', 'stop']])).toEqual([]);
      expect(missing(C.countdown, [['cdIn', 'stop', 'cdDeadline', 'stop']])).toEqual([]);
      expect(missing(C.pageRace, [['rcPlay', 'changeRace', 'rcSetDone', 'do']])).toEqual([]);
    });

    it('the controls show while racing or teaching and step aside for the result screen, in the child’s language', () => {
      const phase = nodesOf(built, C.racePlay).find((n) => n.id === 'rpPhase')!.parameters as Record<string, unknown>;
      expect([phase['value-racing-controls'], phase['value-teaching-controls'], phase['value-over-controls']]).toEqual([true, true, false]);
      const mountedBy = connectionsOf(built, C.racePlay).filter((c) => c.toId === 'rpControls' && c.toProperty === 'mounted').map((c) => `${c.fromId}.${c.fromProperty}`);
      expect(mountedBy).toEqual(['rpPhase.controls']);
      expect(missing(C.racePlay, [['rpIn', 'restartWord', 'rpRestart', 'label'], ['rpIn', 'otherRaceWord', 'rpSettings', 'label']])).toEqual([]);
      expect(missing(C.pageRace, [['rcT', 'restart', 'rcPlay', 'restartWord']])).toEqual([]);
    });

    it('🔴 the bar refills before it glides: full and empty a frame apart, or the Animate sees only the last (session 6’s deploy: 0.50–0.63 at a new question)', () => {
      expect(
        missing(C.countdown, [
          ['cdOne', 'result', 'cdSetDur0', 'value'],
          ['cdSetFull', 'done', 'cdKick', 'restart'],
          ['cdKick', 'timerFinished', 'cdSetDur', 'do'],
          ['cdIn', 'stop', 'cdKick', 'stop']
        ])
      ).toEqual([]);
      expect(connectionsOf(built, C.countdown).filter((c) => c.fromId === 'cdSetFull' && c.toId === 'cdSetDur').length).toBe(0);
      const byId = new Map(nodesOf(built, C.countdown).map((n) => [n.id, n]));
      const kick = byId.get('cdKick')!;
      expect(kick.type).toBe('Timer');
      // At least one frame, so the full target is delivered on its own.
      expect(Number((kick.parameters as Record<string, unknown>).duration)).toBeGreaterThanOrEqual(17);
      expect((byId.get('cdOne')!.parameters as Record<string, unknown>).expression).toBe('1');
    });

    it('🔴 in a live race the page’s bar gives its row to the race’s controls, and every other page keeps its bar', () => {
      expect(missing(C.pageRace, [['rcPlaying', 'value', 'rcHeader', 'hideBar']])).toEqual([]);
      expect(missing(C.header, [['hdIn', 'hideBar', 'hdHide', 'hide'], ['hdHide', 'result', 'hdBarRoom', 'currentState'], ['hdBarRoom', 'on', 'hdRoot', 'mounted']])).toEqual([]);
      // 🔴 An Expression wired straight into the bar's Mounted hid Home's whole bar in builds 3 AND 4 (driven), whatever the port's
      // name. The bar is mounted only by a States node, and its FIRST state must be `shown`, because Home never feeds it. (RKT-008: the
      // root holds the bar and the menu, so the menu goes with it in a live race.)
      const mountedBy = connectionsOf(built, C.header).filter((c) => c.toId === 'hdRoot' && c.toProperty === 'mounted').map((c) => `${c.fromId}.${c.fromProperty}`);
      expect(mountedBy).toEqual(['hdBarRoom.on']);
      const room = nodesOf(built, C.header).find((n) => n.id === 'hdBarRoom')!.parameters as Record<string, unknown>;
      expect({ states: room.states, shown: room['value-shown-on'], hidden: room['value-hidden-on'] }).toEqual({ states: 'shown,hidden', shown: true, hidden: false });
      const headerInputs = nodesOf(built, C.header).find((n) => n.type === 'Component Inputs') as unknown as { ports?: Array<{ name: string }> } | undefined;
      expect((headerInputs?.ports ?? []).map((p) => p.name)).toContain('hideBar');
      expect((headerInputs?.ports ?? []).map((p) => p.name)).not.toContain('mounted');
      for (const page of [C.pageHome, C.pageProfiles]) {
        expect(connectionsOf(built, page).filter((c) => c.toProperty === 'hideBar')).toEqual([]);
      }
    });

    it('🔴 the setup writes its defaults once, so coming back to it keeps the child’s choices (AC3)', () => {
      expect(
        missing(C.raceSetup, [
          ['rsSeeded', 'seeded', 'rsFirst', 'condition'],
          ['rsCard', 'didMount', 'rsFirst', 'eval'],
          ['rsFirst', 'onfalse', 'rsInitMode', 'do'],
          ['rsInitTimed', 'done', 'rsSeeded', 'to-seeded']
        ])
      ).toEqual([]);
      // The mount must not reach the defaults any other way.
      const initBy = connectionsOf(built, C.raceSetup).filter((c) => c.toId === 'rsInitMode' && c.toProperty === 'do').map((c) => `${c.fromId}.${c.fromProperty}`);
      expect(initBy).toEqual(['rsFirst.onfalse']);
      // A States node starts in its FIRST state, so `fresh` must be it.
      const seeded = nodesOf(built, C.raceSetup).find((n) => n.id === 'rsSeeded')!.parameters as Record<string, unknown>;
      expect({ states: seeded.states, fresh: seeded['value-fresh-seeded'], done: seeded['value-seeded-seeded'] }).toEqual({ states: 'fresh,seeded', fresh: false, done: true });
      // Player two's name: typing never writes a Text Input's Start Value, which is what a remount shows, so it is handed back.
      expect(missing(C.raceSetup, [['rsNameB', 'onTextChanged', 'rsNameKeep', 'value'], ['rsNameKeep', 'value', 'rsNameB', 'startValue']])).toEqual([]);
    });
  });

  describe('RKT-007 — the clock and the boost explain themselves, held in the graph', () => {
    const has = (conns: LegacyConnection[], [fromId, fromProperty, toId, toProperty]: string[]) =>
      conns.some((c) => c.fromId === fromId && c.fromProperty === fromProperty && c.toId === toId && c.toProperty === toProperty);
    const missing = (name: string, wires: string[][]) => wires.filter((w) => !has(connectionsOf(built, name), w)).map((w) => w.join(' → '));
    const param = (name: string, id: string, key: string) => (nodesOf(built, name).find((n) => n.id === id)!.parameters as Record<string, unknown>)[key];

    it('🔴 AC1: the banner shows the grader’s boost and speed as sent, and nothing between them works out a boost of its own', () => {
      expect(missing(C.raceRound, [['rdGrade', 'boost', 'rdBanner', 'boost'], ['rdGrade', 'boostPct', 'rdBanner', 'boostPct']])).toEqual([]);
      expect(
        missing(C.banner, [
          ['fbIn', 'boost', 'fbBoost', 'text'],
          ['fbIn', 'boostPct', 'fbMeterOn', 'p'],
          ['fbMeterOn', 'result', 'fbMeter', 'mounted']
        ])
      ).toEqual([]);
      // 🔴 The fill's Width comes straight from the grader's number. An Expression in between seeded Width {value: null} (builds 1 and 2).
      const widthBy = connectionsOf(built, C.banner).filter((c) => c.toId === 'fbMeterFill' && c.toProperty === 'width').map((c) => `${c.fromId}.${c.fromProperty}`);
      expect(widthBy).toEqual(['fbIn.boostPct']);
      // No second formula: no part reads the answer time, and the fluent window reaches the grader only.
      for (const name of [C.raceRound, C.banner, C.racePlay, C.pageRace]) {
        expect({ name, readsElapsed: connectionsOf(built, name).filter((c) => c.fromProperty === 'elapsedMs').map((c) => `${c.fromId} → ${c.toId}`) }).toEqual({ name, readsElapsed: [] });
      }
      expect(connectionsOf(built, C.raceRound).filter((c) => c.fromProperty === 'fluentMs').map((c) => `${c.fromId}.${c.fromProperty} → ${c.toId}.${c.toProperty}`)).toEqual(['rdPick.fluentMs → rdGrade.fluentMs']);
      const bannerExpressions = nodesOf(built, C.banner).filter((n) => n.type === 'Expression').map((n) => String((n.parameters as Record<string, unknown>).expression));
      // Identifiers that carry time. (`/fluent/` alone read the headline's `fluentWord`, which is a word, not a formula.)
      expect(bannerExpressions.filter((e) => /\b(elapsed\w*|fluentMs|limit\w*|shownAt)\b/.test(e))).toEqual([]);
      // Known-firing: the same pattern sees the grader's own formula, so an empty list above is not a blind probe.
      expect(/\b(elapsed\w*|fluentMs|limit\w*|shownAt)\b/.test('1 - (elapsed - fluentMs) / (2 * fluentMs)')).toBe(true);
      // The fill is a percentage of the meter, so Boost Pct 100 fills it.
      expect([param(C.banner, 'fbMeter', 'width'), param(C.banner, 'fbMeterFill', 'width')]).toEqual([{ value: 48, unit: 'px' }, { value: 100, unit: '%' }]);
    });

    it('🔴 the boost shares the glyph’s row, so the banner is no taller (RKT-006 measured what one more row costs)', () => {
      const byId = new Map(nodesOf(built, C.banner).map((n) => [n.id, n]));
      const kids = (id: string) => (byId.get(id)?.children ?? []).map((n) => n.id);
      expect({ card: kids('fbCard'), top: kids('fbTop') }).toEqual({ card: ['fbTop', 'fbTitle', 'fbMessage', 'fbRow'], top: ['fbGlyph', 'fbBoost', 'fbMeter'] });
    });

    it('🔴 AC2: the seconds are read off the bar’s own Animate: one Animate, one deadline, one kick, and no clock of their own', () => {
      const nodes = nodesOf(built, C.countdown);
      expect({ animates: nodes.filter((n) => n.type === 'net.noodl.animatetovalue').map((n) => n.id), timers: nodes.filter((n) => n.type === 'Timer').map((n) => n.id).sort() }).toEqual({ animates: ['cdAnim'], timers: ['cdDeadline', 'cdKick'] });
      expect(
        missing(C.countdown, [
          ['cdAnim', 'currentValue', 'cdSecsText', 'v'],
          ['cdIn', 'limitMs', 'cdSecsText', 'limit'],
          ['cdSecsText', 'result', 'cdSecs', 'text'],
          ['cdSecsText', 'result', 'cdSecsLast', 'text'],
          ['cdAnim', 'currentValue', 'cdSecsNearly', 'v'],
          ['cdSecsNearly', 'result', 'cdSecsMode', 'currentState']
        ])
      ).toEqual([]);
      expect(param(C.countdown, 'cdSecsText', 'expression')).toBe("'' + ceil(v * limit / 100000)");
      // A States node starts in its FIRST state: an unfed clock is calm, never pulsing.
      const mode = nodesOf(built, C.countdown).find((n) => n.id === 'cdSecsMode')!.parameters as Record<string, unknown>;
      expect({ states: mode.states, calm: [mode['value-calm-calm'], mode['value-calm-last']], last: [mode['value-last-calm'], mode['value-last-last']] }).toEqual({ states: 'calm,last', calm: [true, false], last: [false, true] });
      const mountedBy = (id: string) => connectionsOf(built, C.countdown).filter((c) => c.toId === id && c.toProperty === 'mounted').map((c) => `${c.fromId}.${c.fromProperty}`);
      expect({ secs: mountedBy('cdSecs'), last: mountedBy('cdSecsLast') }).toEqual({ secs: ['cdSecsMode.calm'], last: ['cdSecsMode.last'] });
      expect(param(C.countdown, 'cdSecsLast', 'cssClassName')).toBe('rkt-clock-last');
    });

    it('AC4 in the graph: the whole clock row is mounted only when the race is timed; the 300×12 track the drives read is kept', () => {
      const mountedBy = connectionsOf(built, C.countdown).filter((c) => c.toProperty === 'mounted' && ['cdRow', 'cdTrack'].includes(c.toId)).map((c) => `${c.fromId}.${c.fromProperty} → ${c.toId}`);
      expect(mountedBy).toEqual(['cdShown.result → cdRow']);
      expect(param(C.countdown, 'cdShown', 'expression')).toBe('enabled === true');
      expect([param(C.countdown, 'cdTrack', 'width'), param(C.countdown, 'cdTrack', 'height')]).toEqual([{ value: 300, unit: 'px' }, { value: 12, unit: 'px' }]);
    });

    it('an answer freezes the bar where it is, so the numeral does not count down under the verdict', () => {
      expect(
        missing(C.countdown, [
          ['cdIn', 'stop', 'cdSetDurHold', 'do'],
          ['cdOne', 'result', 'cdSetDurHold', 'value'],
          ['cdSetDurHold', 'done', 'cdSetHold', 'do'],
          ['cdAnim', 'currentValue', 'cdSetHold', 'value']
        ])
      ).toEqual([]);
      expect([param(C.countdown, 'cdSetDurHold', 'name'), param(C.countdown, 'cdSetHold', 'name')]).toEqual(['countdownDuration', 'countdownTarget']);
    });

    it('AC2: the setup says the chosen mode’s rule, in the child’s language', () => {
      expect(
        missing(C.raceSetup, [
          ['rsTimedVar', 'value', 'rsRuleText', 'timed'],
          ['rsIn', 'practiceRuleWord', 'rsRuleText', 'practice'],
          ['rsIn', 'challengeRuleWord', 'rsRuleText', 'challenge'],
          ['rsRuleText', 'result', 'rsRule', 'text']
        ])
      ).toEqual([]);
      expect(param(C.raceSetup, 'rsRuleText', 'expression')).toBe("timed === 'challenge' ? challenge : practice");
      expect(missing(C.pageRace, [['rcT', 'practiceRule', 'rcSetup', 'practiceRuleWord'], ['rcT', 'challengeRule', 'rcSetup', 'challengeRuleWord']])).toEqual([]);
      // What happens at zero is said before the first question.
      expect(WORDS.challengeRule.en).toMatch(/stays put/);
      expect(WORDS.challengeRule.fr).toMatch(/ne bouge pas/);
    });

    it('the course hands the kit where each rocket is heading, so it can light the stretch just gained', () => {
      expect(missing(C.track, [['rtIn', 'progressA', 'rtTrack', 'targetA'], ['rtIn', 'progressB', 'rtTrack', 'targetB']])).toEqual([]);
    });
  });

  describe('RKT-010 — stars that add up, held in the graph', () => {
    const has = (conns: LegacyConnection[], [fromId, fromProperty, toId, toProperty]: string[]) =>
      conns.some((c) => c.fromId === fromId && c.fromProperty === fromProperty && c.toId === toId && c.toProperty === toProperty);
    const missing = (name: string, wires: string[][]) => wires.filter((w) => !has(connectionsOf(built, name), w)).map((w) => w.join(' → '));
    /** Every place inside a component that names stars: a node (its label, parameters, ports) or a wire. `/stars/` never matches "start". */
    const starBindings = (nodes: LegacyNode[], conns: LegacyConnection[]) => [
      ...nodes.filter((n) => /stars|⭐/i.test(JSON.stringify({ ...n, children: undefined }))).map((n) => `node ${n.id}`),
      ...conns.filter((c) => /stars/i.test(`${c.fromProperty} ${c.toProperty}`)).map((c) => `${c.fromId}.${c.fromProperty} → ${c.toId}.${c.toProperty}`)
    ];

    it('🔴 AC6: no star number is bound anywhere inside Game/Profile card, where siblings’ cards sit side by side', () => {
      expect(starBindings(nodesOf(built, C.profileCard), connectionsOf(built, C.profileCard))).toEqual([]);
      // Known-firing: the same probe finds Home's reading.
      expect(starBindings(nodesOf(built, C.pageHome), connectionsOf(built, C.pageHome))).toEqual(expect.arrayContaining(['hmMe.stars → hmStarsText.n']));
    });

    it('AC6 sabotage arm: a star wired into the card is named', () => {
      const conns = [...connectionsOf(built, C.profileCard), { fromId: 'pcIn', fromProperty: 'stars', toId: 'pcDue', toProperty: 'text' } as LegacyConnection];
      expect(starBindings(nodesOf(built, C.profileCard), conns)).toEqual(['pcIn.stars → pcDue.text']);
    });

    it('🔴 every way into a race mints its id on the one reset path, and a landing by either rocket finishes it, out through Model and Graded', () => {
      expect(
        missing(C.racePlay, [
          ['rpResetA', 'done', 'rpMint', 'run'],
          ['rpMint', 'out-raceId', 'rpRound', 'raceId'],
          ['rpMint', 'out-raceId', 'rpFinish', 'raceId'],
          ['rpSetWinA', 'done', 'rpFinish', 'run'],
          ['rpSetWinB', 'done', 'rpFinish', 'run'],
          ['rpRound', 'model', 'rpFinish', 'model'],
          ['rpIn', 'timed', 'rpFinish', 'timed'],
          ['rpFinish', 'model', 'rpOut', 'model'],
          ['rpFinish', 'done', 'rpOut', 'graded'],
          ['rpFinish', 'starsText', 'rpResult', 'stars'],
          ['rpFinish', 'why', 'rpResult', 'why']
        ])
      ).toEqual([]);
      const conns = connectionsOf(built, C.racePlay);
      // Start, Play again and Restart are the three ways into rpResetA. Change the race is not one of them, so it mints nothing.
      expect(conns.filter((c) => c.toId === 'rpResetA' && c.toProperty === 'do').map((c) => `${c.fromId}.${c.fromProperty}`).sort()).toEqual(['rpIn.start', 'rpRestart.onClick', 'rpResult.again']);
      expect(conns.filter((c) => c.toId === 'rpMint').map((c) => `${c.fromId}.${c.fromProperty}`)).toEqual(['rpResetA.done']);
      expect(missing(C.pageRace, [['rcPlay', 'model', 'rcSave', 'model'], ['rcPlay', 'graded', 'rcSave', 'run']])).toEqual([]);
    });

    it('🔴 the grader is told the race and whose turn it is, so player two’s answers pay nothing into this profile (D63)', () => {
      expect(missing(C.racePlay, [['rpTurnIsB', 'result', 'rpRound', 'forB']])).toEqual([]);
      expect(missing(C.raceRound, [['rdIn', 'raceId', 'rdGrade', 'raceId'], ['rdIn', 'forB', 'rdGrade', 'forB']])).toEqual([]);
    });

    it('the result screen says the race’s stars and why, with a class reduced motion stills; Home shows the total', () => {
      expect(missing(C.raceResult, [['rrIn', 'stars', 'rrStars', 'text'], ['rrIn', 'why', 'rrWhy', 'text'], ['rrHasStars', 'result', 'rrStars', 'mounted']])).toEqual([]);
      expect((nodesOf(built, C.raceResult).find((n) => n.id === 'rrStars')!.parameters as Record<string, unknown>).cssClassName).toBe('rkt-stars');
      expect(missing(C.pageHome, [['hmMe', 'stars', 'hmStarsText', 'n'], ['hmStarsText', 'result', 'hmStars', 'value'], ['hmT', 'stars', 'hmStars', 'label']])).toEqual([]);
    });
  });

  describe('RKT-011 — the hangar, held in the graph', () => {
    const REPO = path.join(__dirname, '..', '..', '..');
    const has = (conns: LegacyConnection[], [fromId, fromProperty, toId, toProperty]: string[]) =>
      conns.some((c) => c.fromId === fromId && c.fromProperty === fromProperty && c.toId === toId && c.toProperty === toProperty);
    const missing = (name: string, wires: string[][]) => wires.filter((w) => !has(connectionsOf(built, name), w)).map((w) => w.join(' → '));
    const params = (component: string, id: string) => (nodesOf(built, component).find((n) => n.id === id)!.parameters ?? {}) as Record<string, any>;

    /** A DiceBear collection's option schema, read from the installed package, never from a copied list. */
    const schemas = new Map<string, Record<string, any>>();
    const schemaOf = (look: string) => {
      if (!schemas.has(look)) {
        const text = fs.readFileSync(path.join(REPO, 'node_modules', '@dicebear', look, 'lib', 'schema.js'), 'utf8');
        const marker = 'export const schema =';
        const body = text.slice(text.indexOf(marker) + marker.length).trim().replace(/;\s*$/, '');
        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        schemas.set(look, (new Function(`return (${body});`)() as { properties: Record<string, any> }).properties);
      }
      return schemas.get(look)!;
    };
    /**
     * Every face row naming a part or a value its face does not have, by name.
     *
     * 🔴 PLY-001: a DiceBear part is one of two shapes, and the gate has to know which. A CHOICE part (`hat`, `glasses`,
     * `accessories`, `features`, `hair`) carries an enum, and the value must be in it. A COLOUR part (`hairColor`) carries
     * no enum at all — it takes any 6-digit hex — so the enum check reported every hair colour as a part the face "has
     * no such value" for. It is checked against the schema's own pattern instead, and the part must still EXIST.
     */
    const unknownParts = (rows: ReadonlyArray<HangarItem>) => {
      const out: string[] = [];
      for (const item of rows.filter((i) => i.kind === 'face')) {
        if (!item.faces || Object.keys(item.faces).length === 0) out.push(`${item.id}: fits no face`);
        for (const [look, { part, value, prob }] of Object.entries(item.faces ?? {})) {
          const schema = schemaOf(look);
          const spec = schema[part];
          if (!spec) {
            out.push(`${item.id}: the ${look} face has no ${part} at all`);
            continue;
          }
          const values: string[] | undefined = spec.items?.enum;
          if (values) {
            if (!values.includes(value)) out.push(`${item.id}: the ${look} face has no ${part} "${value}"`);
          } else if (!/^(transparent|[a-fA-F0-9]{6})$/.test(value)) {
            out.push(`${item.id}: ${part} takes a colour, and "${value}" is not one`);
          }
          // 🔴 PLY-001 §3.3: `prob` must say exactly what the installed schema says. A part that is OPTIONAL and not
          // forced to 100 leaves the seed to decide whether the thing the child bought is drawn at all; a part that is
          // not optional has no such property and forcing it would be a lie in the data.
          const optional = Object.prototype.hasOwnProperty.call(schema, `${part}Probability`);
          if (!!prob !== optional) out.push(`${item.id}: ${look}/${part} is ${optional ? 'optional and needs' : 'always drawn and must not have'} prob`);
        }
      }
      return out;
    };
    const luminance = (hex: string) => {
      const h = hex.replace('#', '');
      const channel = (i: number) => {
        const c = parseInt(h.slice(i, i + 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
    };
    const ratio = (a: string, b: string) => {
      const [la, lb] = [luminance(a), luminance(b)];
      return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
    };
    /** Every paint that is not a --rocket-paint-* token the generator writes, or that is under 3:1 on a ground the rocket flies over. */
    const paintFaults = (rows: ReadonlyArray<HangarItem>, entries: Array<{ name: string; value: string }>) => {
      const value = (name: string) => [...entries].reverse().find((t) => t.name === name)?.value;
      const out: string[] = [];
      // PLY-002: a rocket item is EITHER a paint or a decal. A decal is not a colour and has no contrast to clear.
      for (const item of rows.filter((i) => i.kind === 'rocket' && !i.pattern)) {
        const token = /^var\((--rocket-paint-[a-z]+)\)$/.exec(item.paint ?? '')?.[1];
        const hex = token ? value(token) : undefined;
        if (!token || !hex) {
          out.push(`${item.id}: "${item.paint}" is not a rocket paint token`);
          continue;
        }
        for (const ground of ['--surface', '--surface-raised', '--background', '--muted']) {
          const r = ratio(hex, value(ground)!);
          if (r < 3) out.push(`${item.id} on ${ground}: ${r.toFixed(2)}`);
        }
      }
      return out;
    };

    it('🔴 AC4: every face row names a part and value its face really has, in the installed DiceBear', () => {
      expect(unknownParts(HANGAR_SHELF)).toEqual([]);
      // Known-firing: the schema was read, and the looks the shelf names each offer parts.
      expect(schemaOf('big-smile').accessories.items.enum).toContain('sailormoonCrown');
    });

    it('AC4 sabotage arm: a hat that does not exist is named', () => {
      const doctored = HANGAR_SHELF.map((i) => (i.id === 'cap' ? { ...i, faces: { 'pixel-art': { part: 'hat', value: 'variant99', prob: true } } } : i));
      expect(unknownParts(doctored)).toEqual(['cap: the pixel-art face has no hat "variant99"']);
      // PLY-001 §3.3 sabotage: drop the probability from an optional part and the gate names it.
      const noProb = HANGAR_SHELF.map((i) => (i.id === 'cap' ? { ...i, faces: { 'pixel-art': { part: 'hat', value: 'variant01' } } } : i));
      expect(unknownParts(noProb)).toEqual(['cap: pixel-art/hat is optional and needs prob']);
    });

    it('🔴 AC4: every paint is a token the generator writes, and clears 3:1 on every ground the rocket is drawn over', () => {
      expect(paintFaults(HANGAR_SHELF, tpl007TokenEntries())).toEqual([]);
      expect(HANGAR_SHELF.filter((i) => i.kind === 'rocket' && !i.pattern).length).toBe(6);
      // 🔴 PLY-002: white reads on every paint a decal is drawn over. (That the KIT can draw each decal is the kit
      // gate's clause — it is the only one that has the built kit in front of it.)
      expect(HANGAR_SHELF.filter((i) => i.pattern).length).toBeGreaterThanOrEqual(7);
      const token = (name: string) => [...tpl007TokenEntries()].reverse().find((t) => t.name === name)?.value;
      for (const item of HANGAR_SHELF.filter((i) => i.kind === 'rocket' && i.paint)) {
        const hex = token(/^var\((--rocket-paint-[a-z]+)\)$/.exec(item.paint!)![1])!;
        expect({ paint: item.id, white: Number(ratio('#ffffff', hex).toFixed(2)) >= 3 }).toEqual({ paint: item.id, white: true });
      }
    });

    it('AC4 sabotage arm: a pale paint, and a paint that is not a token, are named', () => {
      const pale = paintFaults(HANGAR_SHELF, [...tpl007TokenEntries(), { name: '--rocket-paint-green', value: '#8fd694' }]);
      expect(pale).toEqual(expect.arrayContaining(['paint-green on --surface: 1.69']));
      const raw = paintFaults(HANGAR_SHELF.map((i) => (i.id === 'paint-blue' ? { ...i, paint: '#2f5fd0' } : i)), tpl007TokenEntries());
      expect(raw).toEqual(['paint-blue: "#2f5fd0" is not a rocket paint token']);
    });

    it('three items are everyone’s from the start, and every face that can wear anything has one of them; the shelf in the graph is the shelf', () => {
      expect(HANGAR_SHELF.filter((i) => i.free).map((i) => i.id)).toEqual(['glasses', 'paint-green', 'paint-blue']);
      // PLY-002: a free item costs nothing, and nothing else costs nothing.
      for (const item of HANGAR_SHELF) expect({ id: item.id, ok: (item.cost === 0) === (item.free === true) }).toEqual({ id: item.id, ok: true });
      const wearable = [...new Set(HANGAR_SHELF.flatMap((i) => Object.keys(i.faces ?? {})))].sort();
      expect(wearable).toEqual(['adventurer', 'big-smile', 'pixel-art']);
      for (const look of wearable) expect({ look, free: HANGAR_SHELF.some((i) => i.free && i.faces?.[look]) }).toEqual({ look, free: true });
      expect(JSON.parse(params(C.hangarData, 'datahangarData').json)).toEqual(JSON.parse(JSON.stringify(HANGAR_SHELF)));
    });

    /**
     * 🔴 D64 — the names a Static Data row field cannot have. The runtime hands each row to a Function as a Model, and the Model's proxy
     * answers any name that is one of its own members with the member (`model.ts`, `_modelProxyHandler.get`), so the data under that
     * name is unreachable. Read from the runtime's own Model, never copied: its prototype's members, plus the `data` field it keeps the
     * record in. `id` is the Model's id and reads back the row's own id, so it is safe.
     */
    /**
     * 🔒 R28 (Richard, 2026-09-17, GAM-007 AC7): *"Follow new reserved name list."* This used to build its own set by walking the
     * Model's prototypes and **stopping before `Object.prototype`**, so every name a Model answers for through Object — `toString`,
     * `hasOwnProperty`, `constructor` — was missing from the list this gate checked against. It now asks the product the same
     * question the door asks (`Model.isReservedFieldName`, GAM-007 AC2), so the gate and the door cannot drift apart.
     */
    const isReservedRowName = (name: string): boolean => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const loaded = require('../../noodl-runtime/src/model');
      const RuntimeModel = loaded.default ?? loaded;
      return RuntimeModel.isReservedFieldName(name) === true;
    };
    const rowNameClashes = (sources: Array<{ path: string; rows: unknown[] }>) =>
      sources.flatMap(({ path: p, rows }) => [...new Set(rows.flatMap((r) => (r && typeof r === 'object' ? Object.keys(r) : [])))].filter(isReservedRowName).map((k) => `${p}: ${k}`));

    it('🔴 D64: no Data/* row carries a field the runtime Model answers for itself (session 10: `on` read as its event method, and no tile drew)', () => {
      // Known-firing: the product answers for the name that bit, for the members a Model is used through, and for the
      // `Object.prototype` name the old hand-walk in this gate could not see (R28). `id` reads the row's own id, so it is safe.
      expect(
        ['on', 'get', 'data', 'hasOwnProperty', 'toString', 'id'].map(isReservedRowName)
      ).toEqual([true, true, true, true, true, false]);
      const sources = DATA_COMPONENTS.map((d) => ({ path: d.path, rows: JSON.parse(params('/' + d.path, `${d.path.replace(/\W/g, '').toLowerCase()}Data`).json) as unknown[] }));
      expect(sources.map((s) => s.rows.length > 0)).toEqual(DATA_COMPONENTS.map(() => true));
      expect(rowNameClashes(sources)).toEqual([]);
    });

    it('D64 sabotage arm: the shelf with its old field name is named', () => {
      const doctored = HANGAR_SHELF.map((i) => {
        if (!i.faces) return i;
        const { faces, ...rest } = i;
        return { ...rest, on: faces };
      });
      expect(rowNameClashes([{ path: 'Data/Hangar', rows: doctored }])).toEqual(['Data/Hangar: on']);
    });

    it('🔴 rocket A wears the hangar’s choices in the race, and every face the child sees wears them too', () => {
      expect(missing(C.pageRace, [['rcMe', 'faceOptions', 'rcPlay', 'optionsA'], ['rcMe', 'paint', 'rcPlay', 'paintA'], ['rcMe', 'faceOptions', 'rcHeader', 'options']])).toEqual([]);
      expect(missing(C.racePlay, [['rpIn', 'optionsA', 'rpTrack', 'optionsA'], ['rpIn', 'paintA', 'rpTrack', 'paintA']])).toEqual([]);
      expect(missing(C.track, [['rtIn', 'optionsA', 'rtTrack', 'optionsA'], ['rtIn', 'paintA', 'rtTrack', 'colorA']])).toEqual([]);
      expect(missing(C.header, [['hdIn', 'options', 'hdFace', 'options']])).toEqual([]);
      expect(missing(C.face, [['fcIn', 'options', 'fcAvatar', 'options']])).toEqual([]);
      expect(missing(C.profileCard, [['pcIn', 'faceOptions', 'pcFace', 'options']])).toEqual([]);
      expect(missing(C.pageHome, [['hmMe', 'faceOptions', 'hmHeader', 'options']])).toEqual([]);
      expect(missing(C.pageHangar, [['hgMe', 'faceOptions', 'hgHeader', 'options'], ['hgMe', 'faceOptions', 'hgPreview', 'options'], ['hgMe', 'paint', 'hgPreview', 'paint']])).toEqual([]);
      // Unpainted, the rocket keeps the role colour: only the wire changes it.
      expect(params(C.track, 'rtTrack').colorA).toBe(ROLE.you);
    });

    it('🔴 a race that crosses a milestone offers the pick on the result screen, beside Play again, which keeps the focus', () => {
      expect(missing(C.racePlay, [['rpFinish', 'earnedPick', 'rpResult', 'hasPick'], ['rpIn', 'pickWord', 'rpResult', 'pickWord'], ['rpIn', 'hangarWord', 'rpResult', 'hangarWord'], ['rpResult', 'hangar', 'rpOut', 'hangar']])).toEqual([]);
      expect(missing(C.raceResult, [['rrIn', 'hasPick', 'rrPick', 'mounted'], ['rrIn', 'hasPick', 'rrHangar', 'mounted'], ['rrHangar', 'onClick', 'rrOut', 'hangar'], ['rrAgain', 'didMount', 'rrAgain', 'focus']])).toEqual([]);
      expect(missing(C.pageRace, [['rcT', 'earnedPick', 'rcPlay', 'pickWord'], ['rcT', 'toHangar', 'rcPlay', 'hangarWord'], ['rcPlay', 'hangar', 'rcGoHangar', 'navigate']])).toEqual([]);
      expect(params(C.pageRace, 'rcGoHangar').target).toBe(C.pageHangar);
    });

    it('🔴 the hangar is not a game: Home shows the way to the next pick, and the hangar is a tap on that bar or in the player menu, never a card among the games', () => {
      expect(missing(C.pageHome, [['hmMe', 'nextText', 'hmNext', 'text'], ['hmMe', 'nextPct', 'hmNext', 'percent'], ['hmMe', 'hasPicks', 'hmNext', 'hasPicks'], ['hmNext', 'open', 'hmGoHangar', 'navigate'], ['hmHeader', 'hangar', 'hmGoHangar', 'navigate']])).toEqual([]);
      // Richard, 2026-09-14: "move the hangar to somewhere out of the game type menu".
      expect((nodesOf(built, C.pageHome).find((n) => n.id === 'hmGames')!.children ?? []).map((n) => n.id)).toEqual(['hmRace', 'hmMerge', 'hmHunt', 'hmMonster']);
      // Known-firing beside that absence: the menu's way in, shown on every page but the hangar itself, and each page follows it.
      expect(missing(C.header, [['hdHangar', 'onClick', 'hdOut', 'hangar'], ['hdIn', 'showHangar', 'hdHangar', 'mounted'], ['hdT', 'menuHangar', 'hdHangar', 'label']])).toEqual([]);
      for (const [page, id, shown] of [[C.pageHome, 'hmHeader', true], [C.pageRace, 'rcHeader', true], [C.pageMerge, 'mgHeader', true], [C.pageHangar, 'hgHeader', false]] as const) {
        expect({ page, showHangar: params(page, id).showHangar }).toEqual({ page, showHangar: shown });
      }
      expect(missing(C.pageRace, [['rcHeader', 'hangar', 'rcGoHangar', 'navigate']])).toEqual([]);
      expect(missing(C.pageMerge, [['mgHeader', 'hangar', 'mgGoHangar', 'navigate']])).toEqual([]);
      expect(missing(C.nextPick, [['npIn', 'percent', 'npFill', 'width']])).toEqual([]);
      expect(params(C.nextPick, 'npFill').width).toEqual({ value: 0, unit: '%' });
      expect(params(C.pageHome, 'hmGoHangar').target).toBe(C.pageHangar);
    });

    it('🔴 a tile answers a tap once: only the card fires, through Pick or Wear, never the face as well (a Wear sent twice puts it on and takes it off)', () => {
      expect(connectionsOf(built, C.hangarTile).filter((c) => c.fromId === 'htFace').map((c) => `${c.fromProperty} → ${c.toId}`)).toEqual([]);
      expect(missing(C.hangarTile, [['htCard', 'onClick', 'htCanPick', 'eval'], ['htCard', 'onClick', 'htCanWear', 'eval'], ['htCanPick', 'ontrue', 'htOut', 'pick'], ['htCanWear', 'ontrue', 'htOut', 'wear']])).toEqual([]);
      expect(
        missing(C.pageHangar, [
          ['hgShelf', 'wear', 'hgWear', 'run'],
          ['hgShelf', 'itemId', 'hgPick', 'itemId'],
          ['hgShelf', 'itemId', 'hgWear', 'itemId'],
          ['hgItems', 'items', 'hgPick', 'shelf'],
          ['hgItems', 'items', 'hgWear', 'shelf'],
          ['hgPick', 'done', 'hgStore', 'write'],
          ['hgWear', 'done', 'hgStore', 'write'],
          ['hgPick', 'done', 'hgPreview', 'changed'],
          // 🔴 PLY-002: the tap ASKS, and only Yes buys. This is the "auto-buy" Richard found, encoded.
          ['hgShelf', 'pick', 'hgAsk', 'to-asking'],
          ['hgConfirm', 'yes', 'hgPick', 'run'],
          ['hgConfirm', 'no', 'hgAsk', 'to-idle'],
          ['hgAsk', 'idle', 'hgShelfBox', 'mounted'],
          ['hgAsk', 'asking', 'hgConfirm', 'mounted']
        ])
      ).toEqual([]);
      // 🔴 And nothing wires a tap straight to the purchase any more.
      expect(
        connectionsOf(built, C.pageHangar).filter((w) => w.fromId === 'hgShelf' && w.fromProperty === 'pick' && w.toId === 'hgPick')
      ).toEqual([]);
    });

    it('🔴 the preview keeps the face and the course on one line, so a phone sees the first row of tiles (build 3: 882 on an 844 screen)', () => {
      expect(params(C.hangarPreview, 'pvPop')).toMatchObject({ flexDirection: 'row', flexWrap: 'nowrap' });
      // The course is what gives way: a percentage width in a row grows and shrinks, and the face is content-sized.
      expect(params(C.hangarPreview, 'pvTrackBox').width).toEqual({ value: 100, unit: '%' });
    });

    it('the preview pops by swapping between two classes that the reduced-motion block stills', () => {
      const report = reducedMotionReport(APP_CSS);
      expect(report.animated).toEqual(expect.arrayContaining(['rkt-wear-a', 'rkt-wear-b']));
      expect(report.unstilled).toEqual([]);
      const st = params(C.hangarPreview, 'pvPopState');
      expect([st['value-still-cls'], st['value-a-cls'], st['value-b-cls']]).toEqual(['rkt-preview', 'rkt-preview rkt-wear-a', 'rkt-preview rkt-wear-b']);
      expect(missing(C.hangarPreview, [['pvPopState', 'cls', 'pvPop', 'cssClassName'], ['pvIn', 'changed', 'pvChanges', 'increase']])).toEqual([]);
    });
  });

  describe('TPL-007 §12.1 — Make Ten Merge, held in the graph', () => {
    const has = (conns: LegacyConnection[], [fromId, fromProperty, toId, toProperty]: string[]) =>
      conns.some((c) => c.fromId === fromId && c.fromProperty === fromProperty && c.toId === toId && c.toProperty === toProperty);
    const missing = (name: string, wires: string[][]) => wires.filter((w) => !has(connectionsOf(built, name), w)).map((w) => w.join(' → '));
    const params = (name: string, id: string) => nodesOf(built, name).find((n) => n.id === id)!.parameters as Record<string, unknown>;
    const DIRS = [['Up', 'up'], ['Left', 'left'], ['Down', 'down'], ['Right', 'right']] as const;

    it('Home’s Merge card opens the Merge page, and all four games are playable', () => {
      expect(missing(C.pageHome, [['hmMerge', 'chosen', 'hmGoMerge', 'navigate'], ['hmRace', 'chosen', 'hmGoRace', 'navigate']])).toEqual([]);
      expect(params(C.pageHome, 'hmGoMerge').target).toBe(C.pageMerge);
      expect([params(C.pageHome, 'hmRace').enabled, params(C.pageHome, 'hmMerge').enabled, params(C.pageHome, 'hmHunt').enabled, params(C.pageHome, 'hmMonster').enabled]).toEqual([true, true, true, true]);
    });

    it('🔴 one slide rule, placed once per direction with the direction as a parameter; each arrow key and each arrow button runs its own', () => {
      for (const [id, dir] of DIRS) {
        const slide = nodesOf(built, C.mergePlay).find((n) => n.id === `mpSlide${id}`)!;
        expect({ id, type: slide.type, dir: (slide.parameters as Record<string, unknown>).dir, key: params(C.mergePlay, `mpKey${id}`).shortcut }).toEqual({ id, type: '/Logic/Slide and merge', dir, key: dir });
        expect(
          missing(C.mergePlay, [
            [`mpKey${id}`, 'pressed', `mpSlide${id}`, 'run'],
            [`mpBtn${id}`, 'onClick', `mpSlide${id}`, 'run'],
            ['mpGame', 'value', `mpSlide${id}`, 'game'],
            [`mpSlide${id}`, 'game', 'mpSetGame', 'value'],
            [`mpSlide${id}`, 'done', 'mpSetGame', 'do'],
            ['mpPhase', 'playing', `mpKey${id}`, 'enabled']
          ])
        ).toEqual([]);
      }
      // A direction on a wire is whatever published last (TPL-005's bug), so no wire carries one.
      expect(connectionsOf(built, C.mergePlay).filter((c) => c.toProperty === 'dir')).toEqual([]);
    });

    it('🔴 one Variable is the whole game: a new board and every slide write it, and the squares, the score and the phase are drawn from it', () => {
      expect(params(C.mergePlay, 'mpGame').name).toBe(params(C.mergePlay, 'mpSetGame').name);
      expect(
        missing(C.mergePlay, [
          ['mpNewBoard', 'game', 'mpSetGame', 'value'], ['mpNewBoard', 'done', 'mpSetGame', 'do'],
          ['mpRoot', 'didMount', 'mpNewBoard', 'run'], ['mpNew', 'onClick', 'mpNewBoard', 'run'], ['mpResult', 'again', 'mpNewBoard', 'run'],
          ['mpIn', 'level', 'mpNewBoard', 'level'], ['mpIn', 'model', 'mpNewBoard', 'model'],
          ['mpGame', 'value', 'mpDraw', 'game'], ['mpDraw', 'rows', 'mpRows', 'items'], ['mpDraw', 'scoreLine', 'mpScore', 'text'], ['mpDraw', 'phase', 'mpPhase', 'currentState']
        ])
      ).toEqual([]);
      // `playing` FIRST (D55): the arrows show before the first board is drawn.
      expect(String(params(C.mergePlay, 'mpPhase').states).split(',')[0]).toBe('playing');
      expect([params(C.mergePlay, 'mpRows').template, params(C.mergeRow, 'mwCells').template]).toEqual([C.mergeRow, C.mergeTile]);
      expect(missing(C.mergeRow, [['mwIn', 'cells', 'mwCells', 'items']])).toEqual([]);
      expect(missing(C.mergeTile, [['mtIn', 'word', 'mtWord', 'text'], ['mtIn', 'kind', 'mtKind', 'currentState'], ['mtKind', 'ground', 'mtCell', 'backgroundColor'], ['mtKind', 'edge', 'mtCell', 'borderColor'], ['mtIn', 'fx', 'mtCell', 'cssClassName']])).toEqual([]);
      expect(String(params(C.mergeTile, 'mtKind').states).split(',')).toEqual(['empty', 'unit', 'ten', 'tens', 'big']);
    });

    it('🔴 a board is paid only when it locks: the end screen takes the arrows’ place, and no key, button or New game reaches Finish', () => {
      expect(
        missing(C.mergePlay, [
          ['mpDraw', 'over', 'mpIsOver', 'condition'], ['mpIsOver', 'ontrue', 'mpFinish', 'run'],
          ['mpGame', 'value', 'mpFinish', 'game'], ['mpIn', 'model', 'mpFinish', 'model'], ['mpIn', 'lang', 'mpFinish', 'lang'],
          ['mpFinish', 'model', 'mpOut', 'model'], ['mpFinish', 'done', 'mpOut', 'graded'],
          ['mpPhase', 'over', 'mpResult', 'mounted'], ['mpPhase', 'playing', 'mpControls', 'mounted'],
          ['mpFinish', 'headline', 'mpResult', 'headline'], ['mpFinish', 'line', 'mpResult', 'line'], ['mpFinish', 'starsText', 'mpResult', 'stars'], ['mpFinish', 'why', 'mpResult', 'why'], ['mpFinish', 'earnedPick', 'mpResult', 'hasPick'],
          ['mpResult', 'hangar', 'mpOut', 'hangar'], ['mpResult', 'other', 'mpOut', 'home']
        ])
      ).toEqual([]);
      expect(connectionsOf(built, C.mergePlay).filter((c) => c.toId === 'mpFinish' && c.toProperty === 'run').map((c) => `${c.fromId}.${c.fromProperty}`)).toEqual(['mpIsOver.ontrue']);
      // 🔴 Build 1, FR 390×844: New game ended below the fold. It is brought on screen once the card holds its words, never before.
      expect(missing(C.mergePlay, [['mpFinish', 'done', 'mpEndInView', 'run'], ['mpIn', 'newGameWord', 'mpEndInView', 'in-word']])).toEqual([]);
      // Build 2's phone: New game on screen, and Home, the next button in the row, cut off. The whole row comes on screen.
      expect(String(params(C.mergePlay, 'mpEndInView').functionScript)).toMatch(/querySelectorAll\('button'\)\.length < 2\) row = row\.parentElement;\s*\(row \|\| button\)\.scrollIntoView\(\{ block: 'nearest', behavior: 'auto' \}\)/);
      expect(
        missing(C.pageMerge, [
          ['mgMe', 'level', 'mgPlay', 'level'], ['mgMe', 'model', 'mgPlay', 'model'], ['mgMe', 'lang', 'mgPlay', 'lang'],
          ['mgPlay', 'model', 'mgSave', 'model'], ['mgPlay', 'graded', 'mgSave', 'run'], ['mgSave', 'app', 'mgStore', 'app'], ['mgSave', 'done', 'mgStore', 'write'],
          ['mgPlay', 'hangar', 'mgGoHangar', 'navigate'], ['mgPlay', 'home', 'mgGoHome', 'navigate'], ['mgHeader', 'home', 'mgGoHome', 'navigate']
        ])
      ).toEqual([]);
    });

    it('🔴 Easy or Hard: the chosen pill is the player’s mode, and a tap starts a new board in it and is kept; a full board hints, a locked one greys', () => {
      expect(
        missing(C.mergePlay, [
          ['mpIn', 'mergeMode', 'mpMode', 'value'], ['mpModeItems', 'out-items', 'mpMode', 'items'],
          ['mpMode', 'value', 'mpNewBoard', 'mode'], ['mpIn', 'mergeMode', 'mpNewBoard', 'mode'], ['mpMode', 'changed', 'mpNewBoard', 'run'],
          ['mpMode', 'value', 'mpOut', 'mergeMode'], ['mpMode', 'changed', 'mpOut', 'modeChanged'],
          ['mpDraw', 'fullness', 'mpFull', 'currentState'], ['mpFull', 'rule', 'mpRule', 'mounted'], ['mpFull', 'hint', 'mpHintBox', 'mounted'], ['mpIn', 'fullWord', 'mpHint', 'text'],
          ['mpPhase', 'boardOpacity', 'mpBoard', 'opacity']
        ])
      ).toEqual([]);
      expect(missing(C.pageMerge, [['mgMe', 'mergeMode', 'mgPlay', 'mergeMode'], ['mgPlay', 'mergeMode', 'mgMode', 'mergeMode'], ['mgPlay', 'modeChanged', 'mgMode', 'run'], ['mgMode', 'done', 'mgStore', 'write'], ['mgT', 'mergeFull', 'mgPlay', 'fullWord'], ['mgT', 'mergeEasy', 'mgPlay', 'easyWord'], ['mgT', 'mergeHard', 'mgPlay', 'hardWord']])).toEqual([]);
      const script = String(params(C.mergePlay, 'mpModeItems').functionScript);
      expect(new Function('Inputs', 'Outputs', `${script}; return Outputs.items;`)({ easy: 'Easy', hard: 'Hard' }, {})).toEqual([{ label: 'Easy', value: 'easy' }, { label: 'Hard', value: 'hard' }]);
      // `roomy` and `playing` FIRST (D55): the rule and a full-strength board until the game says otherwise.
      const phase = params(C.mergePlay, 'mpPhase');
      expect([String(params(C.mergePlay, 'mpFull').states).split(',')[0], phase['value-playing-boardOpacity'], phase['value-over-boardOpacity'], params(C.mergePlay, 'mpHintBox').mounted]).toEqual(['roomy', 1, 0.45, false]);
      expect(params(C.mergePlay, 'mpBoard').cssClassName).toBe('rkt-merge-board');
      expect(APP_CSS).toMatch(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*\.rkt-merge-board \{ transition: none; \}/);
    });
  });

  describe('TPL-007 §12.2 — Number Hunt, held in the graph', () => {
    const has = (conns: LegacyConnection[], [fromId, fromProperty, toId, toProperty]: string[]) =>
      conns.some((c) => c.fromId === fromId && c.fromProperty === fromProperty && c.toId === toId && c.toProperty === toProperty);
    const missing = (name: string, wires: string[][]) => wires.filter((w) => !has(connectionsOf(built, name), w)).map((w) => w.join(' → '));
    const params = (name: string, id: string) => nodesOf(built, name).find((n) => n.id === id)!.parameters as Record<string, unknown>;
    const MOVES = [['hpTap', 'tap'], ['hpShowWay', 'show'], ['hpNextGrid', 'next']] as const;

    it('Home’s Hunt card opens the Hunt page', () => {
      expect(missing(C.pageHome, [['hmHunt', 'chosen', 'hmGoHunt', 'navigate']])).toEqual([]);
      expect([params(C.pageHome, 'hmGoHunt').target, params(C.pageHome, 'hmHunt').enabled]).toEqual([C.pageHunt, true]);
    });

    it('🔴 one move rule, placed once per action with the action as a parameter; a tap on a number, Show me one and Next grid each run their own', () => {
      for (const [id, action] of MOVES) {
        const node = nodesOf(built, C.huntPlay).find((n) => n.id === id)!;
        expect({ id, type: node.type, action: (node.parameters as Record<string, unknown>).action }).toEqual({ id, type: '/Logic/Hunt move', action });
        expect(missing(C.huntPlay, [['hpGame', 'value', id, 'game'], [id, 'game', 'hpSetGame', 'value'], [id, 'done', 'hpSetGame', 'do']])).toEqual([]);
      }
      expect(missing(C.huntPlay, [['hpRows', 'itemOutput-at', 'hpTap', 'index'], ['hpShow', 'onClick', 'hpShowWay', 'run'], ['hpNext', 'onClick', 'hpNextGrid', 'run']])).toEqual([]);
      // An action on a wire is whatever published last (TPL-005's bug), so no wire carries one; and each move runs on its one signal.
      expect(connectionsOf(built, C.huntPlay).filter((c) => c.toProperty === 'action')).toEqual([]);
      expect(MOVES.map(([id]) => connectionsOf(built, C.huntPlay).filter((c) => c.toId === id && c.toProperty === 'run').map((c) => `${c.fromId}.${c.fromProperty}`))).toEqual([['hpRows.itemOutputSignal-tapped'], ['hpShow.onClick'], ['hpNext.onClick']]);
    });

    it('🔴 a tap climbs out of the nested repeaters with its square (Tile → Row → Play), and the row fields the draw script writes are the tile’s inputs', () => {
      expect([params(C.huntPlay, 'hpRows').template, params(C.huntRow, 'hwCells').template]).toEqual([C.huntRow, C.huntTile]);
      expect(missing(C.huntRow, [['hwIn', 'cells', 'hwCells', 'items'], ['hwCells', 'itemOutput-at', 'hwOut', 'at'], ['hwCells', 'itemOutputSignal-tapped', 'hwOut', 'tapped']])).toEqual([]);
      expect(
        missing(C.huntTile, [
          ['hnBtn', 'onClick', 'hnOut', 'tapped'], ['hnIn', 'at', 'hnOut', 'at'], ['hnIn', 'word', 'hnBtn', 'label'], ['hnIn', 'kind', 'hnKind', 'currentState'],
          ['hnKind', 'ground', 'hnBtn', 'backgroundColor'], ['hnKind', 'edge', 'hnBtn', 'borderColor'], ['hnIn', 'fx', 'hnBtn', 'cssClassName']
        ])
      ).toEqual([]);
      expect(String(params(C.huntTile, 'hnKind').states).split(',')).toEqual(['idle', 'picked', 'found', 'shown', 'wrong']);
      // Known-firing beside it: every id this file wrote for the tile is the id the door kept.
      expect(nodesOf(built, C.huntTile).map((n) => n.id).sort()).toEqual(['hnBtn', 'hnCell', 'hnIn', 'hnKind', 'hnOut']);
      const cell = runScript(DRAW_HUNT_SCRIPT, { game: {} }).rows[0].cells[0];
      const tile = TPL007_COMPONENTS.find((c) => '/' + c.path === C.huntTile)!;
      expect(Object.keys(cell).filter((k) => k !== 'id').sort()).toEqual(tile.inputs!.map((p) => p.name).sort());
    });

    it('🔴 one Variable is the whole hunt, drawn from it; a hunt is paid only when its last grid is cleared, and the page stores what it pays', () => {
      expect([params(C.huntPlay, 'hpGame').name, params(C.huntPlay, 'hpSetGame').name]).toEqual(['huntGame', 'huntGame']);
      expect(params(C.huntPlay, 'hpGame').name).not.toBe(params(C.mergePlay, 'mpGame').name);
      expect(
        missing(C.huntPlay, [
          ['hpNewHunt', 'game', 'hpSetGame', 'value'], ['hpNewHunt', 'done', 'hpSetGame', 'do'],
          ['hpRoot', 'didMount', 'hpNewHunt', 'run'], ['hpNew', 'onClick', 'hpNewHunt', 'run'], ['hpResult', 'again', 'hpNewHunt', 'run'], ['hpIn', 'level', 'hpNewHunt', 'level'],
          ['hpGame', 'value', 'hpDraw', 'game'], ['hpIn', 'lang', 'hpDraw', 'lang'], ['hpDraw', 'rows', 'hpRows', 'items'], ['hpDraw', 'instruction', 'hpTask', 'text'],
          ['hpDraw', 'progress', 'hpProgress', 'text'], ['hpDraw', 'note', 'hpNote', 'text'], ['hpDraw', 'noteKind', 'hpTone', 'currentState'], ['hpDraw', 'phase', 'hpPhase', 'currentState'],
          ['hpDraw', 'over', 'hpIsOver', 'condition'], ['hpIsOver', 'ontrue', 'hpFinish', 'run'], ['hpGame', 'value', 'hpFinish', 'game'], ['hpIn', 'model', 'hpFinish', 'model'], ['hpIn', 'lang', 'hpFinish', 'lang'],
          ['hpFinish', 'model', 'hpOut', 'model'], ['hpFinish', 'done', 'hpOut', 'graded'], ['hpPhase', 'over', 'hpResult', 'mounted'], ['hpPhase', 'going', 'hpControls', 'mounted'],
          ['hpFinish', 'headline', 'hpResult', 'headline'], ['hpFinish', 'line', 'hpResult', 'line'], ['hpFinish', 'starsText', 'hpResult', 'stars'], ['hpFinish', 'why', 'hpResult', 'why'], ['hpFinish', 'earnedPick', 'hpResult', 'hasPick'],
          ['hpFinish', 'done', 'hpEndInView', 'run'], ['hpIn', 'newGameWord', 'hpEndInView', 'in-word'], ['hpResult', 'hangar', 'hpOut', 'hangar'], ['hpResult', 'other', 'hpOut', 'home']
        ])
      ).toEqual([]);
      expect(connectionsOf(built, C.huntPlay).filter((c) => c.toId === 'hpFinish' && c.toProperty === 'run').map((c) => `${c.fromId}.${c.fromProperty}`)).toEqual(['hpIsOver.ontrue']);
      expect(
        missing(C.pageHunt, [
          ['nhMe', 'level', 'nhPlay', 'level'], ['nhMe', 'model', 'nhPlay', 'model'], ['nhMe', 'lang', 'nhPlay', 'lang'],
          ['nhPlay', 'model', 'nhSave', 'model'], ['nhPlay', 'graded', 'nhSave', 'run'], ['nhSave', 'app', 'nhStore', 'app'], ['nhSave', 'done', 'nhStore', 'write'],
          ['nhPlay', 'hangar', 'nhGoHangar', 'navigate'], ['nhPlay', 'home', 'nhGoHome', 'navigate'], ['nhHeader', 'home', 'nhGoHome', 'navigate'], ['nhHeader', 'hangar', 'nhGoHangar', 'navigate'],
          ['nhT', 'huntNextGrid', 'nhPlay', 'nextGridWord'], ['nhT', 'huntShowWay', 'nhPlay', 'showWayWord'], ['nhT', 'newGame', 'nhPlay', 'newGameWord']
        ])
      ).toEqual([]);
    });

    it('Show me one waits for the misses, Next grid waits for every way and takes the focus; the note is ink on its tone; a wrong pick’s shake is stilled for reduced motion', () => {
      expect(
        missing(C.huntPlay, [
          ['hpDraw', 'canShow', 'hpShow', 'mounted'], ['hpPhase', 'found', 'hpNextRow', 'mounted'], ['hpNext', 'didMount', 'hpNext', 'focus'],
          ['hpTone', 'ground', 'hpNoteBox', 'backgroundColor'], ['hpTone', 'edge', 'hpNoteBox', 'borderColor']
        ])
      ).toEqual([]);
      // `playing` and `quiet` FIRST (D55); Show me one and Next grid start unmounted.
      expect([params(C.huntPlay, 'hpShow').mounted, params(C.huntPlay, 'hpNextRow').mounted, String(params(C.huntPlay, 'hpPhase').states).split(',')[0], String(params(C.huntPlay, 'hpTone').states).split(',')[0]]).toEqual([false, false, 'playing', 'quiet']);
      expect([params(C.huntPlay, 'hpNote').color, connectionsOf(built, C.huntPlay).filter((c) => c.toId === 'hpNote' && c.toProperty === 'color')]).toEqual([ROLE.ink, []]);
      expect(reducedMotionReport(APP_CSS)).toMatchObject({ unstilled: [] });
      expect(reducedMotionReport(APP_CSS).animated).toEqual(expect.arrayContaining(['rkt-shake-a', 'rkt-shake-b']));
    });
  });

  describe('P95 — what PLY-005 and PLY-006 wired into the graph', () => {
    it('🔴 PLY-006: the race tells the grader the gap, and it tells it from the rocket that is ANSWERING', () => {
      // Race/Round hands the gap and the armed turbo straight to the grader — nothing downstream recomputes any of it.
      expect(connectionsOf(built, C.raceRound)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ fromId: 'rdIn', fromProperty: 'myAt', toId: 'rdGrade', toProperty: 'myAt' }),
          expect.objectContaining({ fromId: 'rdIn', fromProperty: 'cpuAt', toId: 'rdGrade', toProperty: 'cpuAt' }),
          expect.objectContaining({ fromId: 'rdArmed', fromProperty: 'on', toId: 'rdGrade', toProperty: 'useTurbo' })
        ])
      );
      // 🔴 The armed turbo is per instance. Race/Round is placed twice (Race/Play and Monster/Play), so a Variable
      // would have been one flag shared between a race and a monster game — the door says so, and this holds it.
      const armed = nodesOf(built, C.raceRound).find((n) => n.id === 'rdArmed')!;
      expect(armed.type).toBe('States');
      expect(nodesOf(built, C.raceRound).filter((n) => n.type === 'Variable' || n.type === 'Set Variable')).toEqual([]);
      // 🔴 And the pair is SWAPPED on player two's turn: B's "behind" is behind A, not behind the computer.
      const play = nodesOf(built, C.racePlay);
      expect(play.find((n) => n.id === 'rpMineAt')!.parameters!.expression).toBe('isB ? b : a');
      expect(play.find((n) => n.id === 'rpTheirsAt')!.parameters!.expression).toBe('isB ? a : b');
      expect(connectionsOf(built, C.racePlay)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ fromId: 'rpMineAt', toId: 'rpRound', toProperty: 'myAt' }),
          expect.objectContaining({ fromId: 'rpTheirsAt', toId: 'rpRound', toProperty: 'cpuAt' }),
          expect.objectContaining({ fromId: 'rpTurnIsB', toId: 'rpMineAt', toProperty: 'isB' })
        ])
      );
      // 🔴 Monster Gate wires NO gap, so the comeback is a race feature and cannot leak into a monster game.
      const monsterWires = connectionsOf(built, C.monsterPlay).filter((w) => w.toId === 'zpRound' && (w.toProperty === 'myAt' || w.toProperty === 'cpuAt'));
      expect(monsterWires).toEqual([]);
    });

    it('🔴 PLY-005: every face the chooser shows comes from one place, and nothing else writes the seed', () => {
      const form = nodesOf(built, C.newPlayer);
      // One Logic/Roll face per action, and no other action.
      const placements = form.filter((n) => n.type === '/Logic/Roll face');
      expect(placements.map((n) => n.parameters!.action).sort()).toEqual(['back', 'forward', 'roll', 'set']);
      // 🔴 The seed is written by exactly one node, and it is fed by the roll-face placements. Before PLY-005 the Roll
      // button wrote it directly, which is precisely why nothing could be walked back to.
      const setters = form.filter((n) => n.type === 'Set Variable' && n.parameters!.name === 'newSeed');
      expect(setters.map((n) => n.id)).toEqual(['nfSetSeed']);
      const intoSeed = connectionsOf(built, C.newPlayer).filter((w) => w.toId === 'nfSetSeed' && w.toProperty === 'value');
      expect(intoSeed.map((w) => w.fromId).sort()).toEqual(['nfRollBack', 'nfRollFwd', 'nfRollRoll', 'nfRollSet']);
      // The two arrows show only when they lead somewhere.
      expect(connectionsOf(built, C.newPlayer)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ fromId: 'nfCanBack', toId: 'nfBack', toProperty: 'mounted' }),
          expect.objectContaining({ fromId: 'nfCanFwd', toId: 'nfForward', toProperty: 'mounted' })
        ])
      );
    });

    it('🔴 PLY-001 R3: the chooser offers the faces that can wear things, plus the player’s own if it is not one of them', () => {
      const items = nodesOf(built, C.newPlayer).find((n) => n.id === 'nfLookItems')!;
      // It is computed, not a fixed list: an existing thumbs player has to be able to keep their face.
      expect(items.type).toBe('JavaScriptFunction');
      const run = new Function('Inputs', 'Outputs', String(items.parameters!.functionScript));
      const offered = (look: string) => {
        const out: Record<string, any> = {};
        run({ look }, out);
        return out.items.map((i: { value: string }) => i.value);
      };
      expect(offered('')).toEqual([...HANGAR_LOOKS]);
      expect(offered('pixel-art')).toEqual([...HANGAR_LOOKS]);
      // 🔴 Nobody NEW lands in a dead end; nobody already in one is pushed out of their own face.
      expect(offered('thumbs')).toEqual([...HANGAR_LOOKS, 'thumbs']);
      expect(offered('fun-emoji')).toEqual([...HANGAR_LOOKS, 'fun-emoji']);
      // And every face it offers as a new choice really can wear something.
      for (const look of HANGAR_LOOKS) expect({ look, wearable: HANGAR_SHELF.some((i) => i.faces?.[look]) }).toEqual({ look, wearable: true });
    });
  });

  describe('TPL-007 §16 — Monster Gate, held in the graph', () => {
    const has = (conns: LegacyConnection[], [fromId, fromProperty, toId, toProperty]: string[]) =>
      conns.some((c) => c.fromId === fromId && c.fromProperty === fromProperty && c.toId === toId && c.toProperty === toProperty);
    const missing = (name: string, wires: string[][]) => wires.filter((w) => !has(connectionsOf(built, name), w)).map((w) => w.join(' → '));
    const params = (name: string, id: string) => nodesOf(built, name).find((n) => n.id === id)!.parameters as Record<string, unknown>;

    it('Home’s Monster card opens the Monster page, and Home is still a small page', () => {
      expect(missing(C.pageHome, [['hmMonster', 'chosen', 'hmGoMonster', 'navigate']])).toEqual([]);
      expect([params(C.pageHome, 'hmGoMonster').target, params(C.pageHome, 'hmMonster').enabled]).toEqual([C.pageMonster, true]);
      expect(nodesOf(built, C.pageHome).length).toBeLessThanOrEqual(32);
    });

    it('🔴 every id this file wrote for the game is the id the door kept (the door renames a clash without a word)', () => {
      for (const comp of [C.monster, C.monsterLane, C.monsterSetup, C.monsterPlay, C.pageMonster]) {
        const authored = TPL007_COMPONENTS.find((c) => '/' + c.path === comp)!.nodes.map((n) => (n as { id: string }).id).sort();
        expect({ comp, ids: nodesOf(built, comp).map((n) => n.id).sort() }).toEqual({ comp, ids: authored });
      }
    });

    it('🔴 the race’s parts hear Monster Gate and the race is as it was: the round hands a clock scale to the picker, a game to the grader, and the bar’s own position out', () => {
      expect(missing(C.raceRound, [['rdIn', 'limitScale', 'rdPick', 'limitScale'], ['rdIn', 'game', 'rdGrade', 'game'], ['rdClock', 'left', 'rdOut', 'clockLeft']])).toEqual([]);
      expect(missing(C.countdown, [['cdAnim', 'currentValue', 'cdOut', 'left']])).toEqual([]);
      // The race sends neither, so its clock and its words are the race's.
      expect(connectionsOf(built, C.racePlay).filter((c) => c.toId === 'rpRound' && (c.toProperty === 'limitScale' || c.toProperty === 'game'))).toEqual([]);
    });

    it('🔴 one move rule, placed once per action with the action as a parameter: a graded round runs answer, Next runs next, and no wire carries an action', () => {
      for (const [id, action] of [['zpAnswer', 'answer'], ['zpArrive', 'next']] as const) {
        const node = nodesOf(built, C.monsterPlay).find((n) => n.id === id)!;
        expect({ id, type: node.type, action: (node.parameters as Record<string, unknown>).action }).toEqual({ id, type: '/Logic/Monster move', action });
        expect(missing(C.monsterPlay, [['zpGame', 'value', id, 'game'], [id, 'game', 'zpSetGame', 'value'], [id, 'done', 'zpSetGame', 'do']])).toEqual([]);
      }
      expect(connectionsOf(built, C.monsterPlay).filter((c) => c.toProperty === 'action')).toEqual([]);
      expect(['zpAnswer', 'zpArrive'].map((id) => connectionsOf(built, C.monsterPlay).filter((c) => c.toId === id && c.toProperty === 'run').map((c) => `${c.fromId}.${c.fromProperty}`))).toEqual([['zpRound.graded'], ['zpRound.next']]);
      expect(missing(C.monsterPlay, [['zpRound', 'outcome', 'zpAnswer', 'outcome'], ['zpRound', 'gain', 'zpAnswer', 'gain'], ['zpRound', 'cpuGain', 'zpAnswer', 'cpuGain']])).toEqual([]);
    });

    it('🔴 one Variable is the whole game, drawn into the lane; every way into a game makes a new one, whose id grades the answers and whose clock scale the round hears before it asks', () => {
      expect([params(C.monsterPlay, 'zpGame').name, params(C.monsterPlay, 'zpSetGame').name]).toEqual(['monsterGame', 'monsterGame']);
      expect(new Set([params(C.monsterPlay, 'zpGame').name, params(C.huntPlay, 'hpGame').name, params(C.mergePlay, 'mpGame').name]).size).toBe(3);
      expect(
        missing(C.monsterPlay, [
          ['zpIn', 'start', 'zpNew', 'run'], ['zpRestart', 'onClick', 'zpNew', 'run'], ['zpResult', 'again', 'zpNew', 'run'],
          ['zpIn', 'style', 'zpNew', 'style'], ['zpIn', 'timed', 'zpNew', 'timed'],
          ['zpNew', 'game', 'zpSetGame', 'value'], ['zpNew', 'done', 'zpSetGame', 'do'],
          ['zpNew', 'id', 'zpRound', 'raceId'], ['zpNew', 'timeScale', 'zpRound', 'limitScale'], ['zpAnswer', 'timeScale', 'zpRound', 'limitScale'], ['zpNew', 'done', 'zpRound', 'ask'],
          ['zpIn', 'style', 'zpRound', 'game'], ['zpIn', 'timed', 'zpRound', 'timed'],
          ['zpGame', 'value', 'zpDraw', 'game'], ['zpIn', 'lang', 'zpDraw', 'lang'],
          ...['hearts', 'line', 'note', 'pips', 'monsterClass', 'laneClass', 'rest', 'walkFrom'].map((p) => ['zpDraw', p, 'zpLane', p]),
          ['zpWalking', 'value', 'zpLane', 'walking'], ['zpRound', 'clockLeft', 'zpLane', 'left']
        ])
      ).toEqual([]);
      // 🔴 PLY-004: was `.toBe('maths')`, a literal on the placement, and it was the whole reason Monster Gate had no
      // typing version. The mode now arrives from the setup, and no node may pin it again.
      expect(params(C.monsterPlay, 'zpRound').mode).toBeUndefined();
      expect(connectionsOf(built, C.monsterPlay)).toEqual(expect.arrayContaining([expect.objectContaining({ fromId: 'zpIn', fromProperty: 'mode', toId: 'zpRound', toProperty: 'mode' })]));
      expect(connectionsOf(built, C.pageMonster)).toEqual(expect.arrayContaining([expect.objectContaining({ fromId: 'zgSetup', fromProperty: 'mode', toId: 'zgPlay', toProperty: 'mode' })]));
    });

    it('🔴 a game is paid only when it is over, from the round’s latest model; the end card waits for Next, and the page stores both the answers and the finish', () => {
      expect(
        missing(C.monsterPlay, [
          ['zpDraw', 'over', 'zpIsOver', 'condition'], ['zpIsOver', 'ontrue', 'zpFinish', 'run'], ['zpGame', 'value', 'zpFinish', 'game'], ['zpRound', 'model', 'zpFinish', 'model'], ['zpIn', 'lang', 'zpFinish', 'lang'],
          ['zpRound', 'model', 'zpOut', 'model'], ['zpRound', 'graded', 'zpOut', 'graded'], ['zpFinish', 'model', 'zpOut', 'model'], ['zpFinish', 'done', 'zpOut', 'graded'],
          ['zpRound', 'next', 'zpGoOn', 'eval'], ['zpDraw', 'over', 'zpGoOn', 'condition'], ['zpGoOn', 'onfalse', 'zpRound', 'ask'], ['zpGoOn', 'ontrue', 'zpPhase', 'to-over'],
          ['zpPhase', 'over', 'zpResult', 'mounted'], ['zpPhase', 'playing', 'zpRoundSlot', 'mounted'], ['zpPhase', 'teaching', 'zpTeach', 'mounted'], ['zpPhase', 'controls', 'zpControls', 'mounted'],
          ['zpFinish', 'headline', 'zpResult', 'headline'], ['zpFinish', 'line', 'zpResult', 'line'], ['zpFinish', 'starsText', 'zpResult', 'stars'], ['zpFinish', 'why', 'zpResult', 'why'], ['zpFinish', 'earnedPick', 'zpResult', 'hasPick'], ['zpFinish', 'won', 'zpResult', 'won'],
          ['zpResult', 'hangar', 'zpOut', 'hangar'], ['zpResult', 'other', 'zpOut', 'changeGame'], ['zpChange', 'onClick', 'zpRound', 'abandon'], ['zpChange', 'onClick', 'zpOut', 'changeGame'],
          ['zpRound', 'showMe', 'zpPhase', 'to-teaching'], ['zpTeach', 'gotIt', 'zpPhase', 'to-playing'], ['zpTeach', 'gotIt', 'zpGoOn', 'eval']
        ])
      ).toEqual([]);
      expect(connectionsOf(built, C.monsterPlay).filter((c) => c.toId === 'zpFinish' && c.toProperty === 'run').map((c) => `${c.fromId}.${c.fromProperty}`)).toEqual(['zpIsOver.ontrue']);
      expect(String(params(C.monsterPlay, 'zpPhase').states).split(',')[0]).toBe('playing');
      expect(
        missing(C.pageMonster, [
          ['zgMe', 'level', 'zgPlay', 'level'], ['zgMe', 'model', 'zgPlay', 'model'], ['zgMe', 'lang', 'zgPlay', 'lang'], ['zgCurriculum', 'skills', 'zgPlay', 'curriculum'],
          ['zgSetup', 'style', 'zgPlay', 'style'], ['zgSetup', 'timed', 'zgPlay', 'timed'], ['zgSetup', 'start', 'zgSetPlaying', 'do'], ['zgSetPlaying', 'done', 'zgPlay', 'start'],
          ['zgPlay', 'model', 'zgSave', 'model'], ['zgPlay', 'graded', 'zgSave', 'run'], ['zgSave', 'app', 'zgStore', 'app'], ['zgSave', 'done', 'zgStore', 'write'],
          ['zgPlay', 'changeGame', 'zgSetDone', 'do'], ['zgPlay', 'hangar', 'zgGoHangar', 'navigate'], ['zgHeader', 'home', 'zgGoHome', 'navigate'], ['zgPlaying', 'value', 'zgHeader', 'hideBar'],
          ['zgT', 'monsterChange', 'zgPlay', 'changeWord'], ['zgT', 'newGame', 'zgPlay', 'againWord']
        ])
      ).toEqual([]);
    });

    it('🔴 the monster walks off the round’s own clock: only in a live Challenge question of the gate way, from where it stands to the gate as the bar empties; between answers it glides to where it rests', () => {
      expect(
        missing(C.monsterPlay, [
          ['zpNew', 'done', 'zpWalkDelay', 'restart'], ['zpGoOn', 'onfalse', 'zpWalkDelay', 'restart'], ['zpWalkDelay', 'timerFinished', 'zpWalkOn', 'do'],
          ['zpRound', 'graded', 'zpWalkOff', 'do'], ['zpRound', 'graded', 'zpWalkDelay', 'stop'], ['zpChange', 'onClick', 'zpWalkOff', 'do'], ['zpRestart', 'onClick', 'zpWalkOff', 'do']
        ])
      ).toEqual([]);
      expect(
        missing(C.monsterLane, [
          ['zlIn', 'walking', 'zlWalk', 'in-walking'], ['zlIn', 'walkFrom', 'zlWalk', 'in-walkFrom'], ['zlIn', 'left', 'zlWalk', 'in-left'], ['zlIn', 'rest', 'zlWalk', 'in-rest'],
          ['zlWalk', 'out-width', 'zlMover', 'width'], ['zlWalk', 'out-moverClass', 'zlMover', 'cssClassName'], ['zlIn', 'monsterClass', 'zlMonster', 'monsterClass'], ['zlIn', 'laneClass', 'zlLane', 'cssClassName']
        ])
      ).toEqual([]);
      const walk = (inputs: Record<string, unknown>) => runScript(String(params(C.monsterLane, 'zlWalk').functionScript), inputs);
      expect(walk({ walking: true, walkFrom: 0.5, left: 50, rest: 0.5 })).toEqual({ width: 25, moverClass: 'rkt-mover' });
      expect(walk({ walking: true, walkFrom: 1, left: 100, rest: 1 })).toEqual({ width: 100, moverClass: 'rkt-mover' });
      // Not walking (between answers, Practice, Push it back): where it rests, gliding there.
      expect([walk({ walking: false, walkFrom: 0.5, left: 50, rest: 0.75 }), walk({ walking: true, walkFrom: 0, left: 50, rest: 0.4 }), walk({ rest: 1 })]).toEqual([
        { width: 75, moverClass: 'rkt-mover rkt-mover-glide' },
        { width: 40, moverClass: 'rkt-mover rkt-mover-glide' },
        { width: 100, moverClass: 'rkt-mover rkt-mover-glide' }
      ]);
      expect(params(C.monsterLane, 'zlMover').justifyContent).toBe('flex-end');
    });

    it('the setup offers both ways and both paces, opens on Beat it to the gate and Practice (ruling 3), writes those once, and says the chosen pair’s rule', () => {
      expect([params(C.monsterSetup, 'zsDefStyle').expression, params(C.monsterSetup, 'zsDefTimed').expression]).toEqual(["'gate'", "'practice'"]);
      expect(
        missing(C.monsterSetup, [
          ['zsCard', 'didMount', 'zsFirst', 'eval'], ['zsInitStyle', 'done', 'zsInitTimed', 'do'], ['zsInitTimed', 'done', 'zsSeeded', 'to-seeded'],
          ['zsStart', 'onClick', 'zsOut', 'start'], ['zsStyleVar', 'value', 'zsOut', 'style'], ['zsIsTimed', 'result', 'zsOut', 'timed'], ['zsRuleText', 'result', 'zsRule', 'text'],
          // PLY-004: and the maths/typing row, written once like the other two.
          ['zsFirst', 'onfalse', 'zsInitMode', 'do'], ['zsInitMode', 'done', 'zsInitStyle', 'do'], ['zsModeVar', 'value', 'zsOut', 'mode']
        ])
      ).toEqual([]);
      const items = (id: string, inputs: Record<string, unknown>) => new Function('Inputs', 'Outputs', `${String(params(C.monsterSetup, id).functionScript)}; return Outputs.items;`)(inputs, {});
      expect(items('zsStyleItems', { gate: 'G', push: 'P' })).toEqual([{ label: 'G', value: 'gate' }, { label: 'P', value: 'push' }]);
      expect(items('zsTimedItems', { practice: 'Pr', challenge: 'Ch' })).toEqual([{ label: 'Pr', value: 'practice' }, { label: 'Ch', value: 'challenge' }]);
      expect(String(params(C.monsterSetup, 'zsRuleText').expression)).toBe("style === 'push' ? (timed === 'challenge' ? pushChallenge : pushPractice) : (timed === 'challenge' ? gateChallenge : gatePractice)");
      expect(
        missing(C.pageMonster, [
          ['zgT', 'monsterGate', 'zgSetup', 'gateWord'], ['zgT', 'monsterPush', 'zgSetup', 'pushWord'], ['zgT', 'practice', 'zgSetup', 'practiceWord'], ['zgT', 'challenge', 'zgSetup', 'challengeWord'],
          ['zgT', 'monsterGatePractice', 'zgSetup', 'gatePracticeWord'], ['zgT', 'monsterGateChallenge', 'zgSetup', 'gateChallengeWord'], ['zgT', 'monsterPushPractice', 'zgSetup', 'pushPracticeWord'], ['zgT', 'monsterPushChallenge', 'zgSetup', 'pushChallengeWord']
        ])
      ).toEqual([]);
      expect([WORDS.monsterGate.fr, WORDS.monsterPush.fr]).toEqual(['Plus rapide que le monstre', 'Repousse-le']);
    });

    it('🔴 ruling 5: three monsters, three shapes, three colours — each a 13 × 13 pixel map drawn by one box-shadow in tokens; every animation the game adds is stilled for reduced motion', () => {
      expect(Object.keys(MONSTER_PIXELS)).toEqual([...MONSTER_LOOKS]);
      const shapes = new Set<string>();
      for (const look of MONSTER_LOOKS) {
        const { rows, body } = MONSTER_PIXELS[look];
        expect({ look, widths: rows.map((r) => r.length), height: rows.length }).toEqual({ look, widths: Array(13).fill(13), height: 13 });
        expect(rows.join('')).toMatch(/^[.KBWY]+$/);
        shapes.add(rows.join('|').replace(/[BWY]/g, 'X'));
        expect(APP_CSS).toContain(`.rkt-monster-${look}::before { box-shadow: `);
        expect(body).toMatch(/^var\(--[a-z0-9-]+\)$/);
      }
      expect(shapes.size).toBe(3);
      expect(new Set(MONSTER_LOOKS.map((l) => MONSTER_PIXELS[l].body)).size).toBe(3);
      // Every colour the game's stylesheet names is a token.
      const monsterCss = APP_CSS.slice(APP_CSS.indexOf('/* TPL-007 §16'));
      expect(monsterCss.length).toBeGreaterThan(1000);
      expect(monsterCss.match(/#[0-9a-f]{3,6}\b/gi)).toBeNull();
      expect(reducedMotionReport(APP_CSS)).toMatchObject({ unstilled: [] });
      expect(reducedMotionReport(APP_CSS).animated).toEqual(expect.arrayContaining(['rkt-monster', 'rkt-monster-hit-a', 'rkt-monster-hit-b', 'rkt-monster-lunge-a', 'rkt-monster-lunge-b', 'rkt-monster-arrive-a', 'rkt-monster-arrive-b', 'rkt-monster-gone', 'rkt-bang-a', 'rkt-bang-b']));
      expect(APP_CSS).toMatch(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*\.rkt-mover-glide \{ transition: none; \}/);
    });

    it('🔴 the bob lives on the pixels, not the box: a hit, a lunge or an arrival animates the box, and on the same element it replaced the bob for the rest of the game', () => {
      // Richard, 2026-09-14: "The monsters bounced around on my first try … then after the first question they just slide towards the door".
      expect(APP_CSS).toMatch(/\.rkt-monster::before \{[^}]*animation: rkt-bob /);
      expect(APP_CSS).not.toMatch(/\.rkt-monster \{[^}]*animation/);
      for (const fx of ['rkt-monster-hit-a', 'rkt-monster-lunge-a', 'rkt-monster-arrive-a', 'rkt-monster-gone']) expect(APP_CSS).toMatch(new RegExp(`\\.${fx} \\{ animation: `));
      // The reduced-motion block stills the element that bobs (the checker reads a class name, so it cannot tell the box from its pixels).
      expect(APP_CSS).toMatch(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*\.rkt-monster::before, \.rkt-monster-hit-a/);
    });
  });

  it('🔴 the engine is data-driven: rebuilt with one skill, only Data/Curriculum differs', async () => {
    const one = CURRICULUM.slice(0, 1);
    const swapped = TPL007_COMPONENTS.map((c) =>
      c.path === 'Data/Curriculum'
        ? { ...c, nodes: c.nodes.map((n) => ((n as { id: string }).id === 'datacurriculumData' ? { ...(n as object), parameters: { type: 'json', json: JSON.stringify(one, null, 2) } } : n)) }
        : c
    );
    const other = await buildRocketTemplateProject({ components: swapped });
    const a = componentsOf(built);
    const b = componentsOf(other);
    expect(b.map((c) => c.name).sort()).toEqual(a.map((c) => c.name).sort());
    const differing = a.filter((c) => JSON.stringify(c.graph) !== JSON.stringify(b.find((x) => x.name === c.name)!.graph)).map((c) => c.name);
    expect(differing).toEqual(['/Data/Curriculum']);
    expect(DATA_COMPONENTS.map((d) => d.path)).toContain('Data/Curriculum');
  });

  it('the phase-85 measurer agrees with the recomputation', () => {
    const script = path.join(__dirname, '..', '..', '..', 'dev-docs', 'tasks', 'phase-85-the-component-is-the-backbone', 'measure-interfaces.py');
    if (!fs.existsSync(script)) return;
    const out = execSync(`python3 "${script}" v2 "${path.join(OUTPUT, 'components')}"`, { encoding: 'utf8' });
    expect(out).toContain('PASS  publishes outputs');
    expect(out).toContain('PASS  carries a flag port');
    expect(out).toContain('PASS  States per component');
    expect(out).not.toContain('FAIL');
  });
});
