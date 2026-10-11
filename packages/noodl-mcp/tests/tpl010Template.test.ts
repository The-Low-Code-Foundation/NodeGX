/**
 * TPL-010 AC1 — the gate for the planner and its demo.
 *
 * What a gate is for here: **the artefact in `templates/` is the build, and the rules the
 * week depends on are checked by running them.** Every section below exists because something
 * it checks was once wrong in a way the graph could not show — the session log in
 * `TPL-010-THE-PLANNER.md` §6 names them one by one.
 *
 * @module noodl-mcp/tests/tpl010Template.test
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { LegacyComponent, LegacyNode } from '../../noodl-editor/src/editor/src/io/ProjectExporter';
import { validateSecurityConfig } from '../../nodegx-backend/src/security/model';

import { C, COLLECTIONS, LOGGED_PREFIX, PLANNED_PREFIX, PLANNER_FNS, SENT_SUMMARY, TPL010_COMPONENTS, VAR } from './tpl010Components';
import { MONEY_FNS } from './tpl010Money';
import {
  ADDED_LATER,
  BACKEND_NODE_TYPES,
  BORROWED,
  DEMO_CHANGED,
  DEMO_EMPTY_ARMED,
  DEMO_EMPTY_LABEL,
  DEMO_EMPTY_SCRIPT,
  DEMO_READ_SCRIPT,
  DEMO_STORAGE_KEY,
  TPL010_DEMO_COMPONENTS
} from './tpl010Demo';
import {
  AuthoredTemplate,
  buildPlannerTemplateProject,
  DEMO_ID,
  POLICY_FILE,
  preparePlannerArtefact,
  preparePlannerDemoArtefact,
  TEMPLATE_ID
} from './tpl010Template';
import { CONTRAST_PAIRS, FONTS_URL, themeCss, TPL010_DARK_TOKENS, TPL010_TOKENS } from './tpl010Theme';

jest.setTimeout(600_000);

const REPO = path.join(__dirname, '..', '..', '..');
const ARTEFACT = path.join(REPO, 'templates', TEMPLATE_ID);
const DEMO_ARTEFACT = path.join(REPO, 'templates', DEMO_ID);
const POLICY_SOURCE = path.join(REPO, 'templates', `${TEMPLATE_ID}.security.json`);

let built: AuthoredTemplate;
let demo: AuthoredTemplate;
let rebuilt = '';
let demoRebuilt = '';

function nodesOf(component: LegacyComponent): LegacyNode[] {
  const out: LegacyNode[] = [];
  const walk = (list: LegacyNode[]) => {
    for (const n of list ?? []) {
      out.push(n);
      if (n.children) walk(n.children);
    }
  };
  walk(component.graph?.roots ?? []);
  return out;
}

function componentsOf(from: AuthoredTemplate): LegacyComponent[] {
  return from.project.components ?? [];
}

function allNodes(from: AuthoredTemplate): Array<{ component: string; node: LegacyNode }> {
  return componentsOf(from).flatMap((c) => nodesOf(c).map((node) => ({ component: c.name, node })));
}

function component(from: AuthoredTemplate, name: string): LegacyComponent {
  const found = componentsOf(from).find((c) => c.name === name);
  if (!found) throw new Error(`no component ${name} in the built project`);
  return found;
}

/** The script that shipped, read out of the built project — never a copy of it. */
function scriptOf(from: AuthoredTemplate, componentName: string, nodeId: string): string {
  const node = nodesOf(component(from, componentName)).find((n) => n.id === nodeId);
  const script = (node?.parameters as { functionScript?: string } | undefined)?.functionScript;
  if (!script) throw new Error(`${componentName} has no Function ${nodeId}`);
  return script;
}

function connectionsOf(from: AuthoredTemplate, componentName: string): Array<Record<string, string>> {
  return (component(from, componentName).graph?.connections ?? []) as unknown as Array<Record<string, string>>;
}

function files(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else out.push(path.relative(dir, p));
    }
  };
  walk(dir);
  return out.sort();
}

/** Run one of the template's own Functions. Signals are recorded by name, values by key. */
function run(script: string, inputs: Record<string, unknown>, self?: object): { outputs: Record<string, unknown>; signals: string[] } {
  const signals: string[] = [];
  const outputs = new Proxy({} as Record<string, unknown>, {
    get(target, key: string) {
      if (key in target) return target[key];
      return () => signals.push(key);
    }
  });
  // eslint-disable-next-line no-new-func
  new Function('Inputs', 'Outputs', script).call(self ?? {}, inputs, outputs);
  return { outputs: { ...outputs }, signals };
}

/**
 * TPL-010-T T3 — a command's guard now also names its history line (`hKind`, `hSummary`, …) and, for
 * Add time, what the todo list is told. The record a guard writes is everything else.
 */
const TOLD = ['becameDone', 'doneNote', 'doneHours'];
function recordOnly(outputs: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(outputs).filter(([k]) => !/^h[A-Z]/.test(k) && !TOLD.includes(k)));
}

beforeAll(async () => {
  built = await buildPlannerTemplateProject();
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tpl010-gate-')), TEMPLATE_ID);
  preparePlannerArtefact(built, out, POLICY_SOURCE);
  rebuilt = out;

  demo = await buildPlannerTemplateProject({ variant: 'demo' });
  const demoOut = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tpl010-demo-gate-')), DEMO_ID);
  preparePlannerDemoArtefact(demo, demoOut);
  demoRebuilt = demoOut;
});

// ── §1 ─────────────────────────────────────────────────────────────────────

describe('§1 the artefact is the build', () => {
  /**
   * `wired-dimension-becomes-grow` is raised on every bar in the template and is the door
   * being right: a percentage on the main axis IS flex-grow. Each one is drawn as a fill and
   * a transparent remainder adding to 100, which is the mockup's own way of drawing a bar.
   */
  it('the door refused nothing, and the only warning it raised is the one the bars are built on', () => {
    const codes = [...new Set(built.diagnostics.filter((d) => d.severity !== 'info').map((d) => d.code))].sort();
    expect(codes).toEqual(['row-cannot-wrap', 'wired-dimension-becomes-grow']);
    // P109 ISL-022 (2026-10-02): `row-cannot-wrap` on `Week/App bar#abRight` is TRUE of the graph — a content-sized
    // row set to wrap, inside the bar's row, never wraps — and only the stylesheet's `.planner-shrink-wrap
    // { max-width: 100% }` rescues it (rendered: 3 lines at 390). The graph's own exit is `maxWidth: pct(100)` on
    // `abRight` and the class rule deleted; then this pin drops the code. Filed P109-S4-ROWWRAP.
    // The builder keeps the step's label, not the node: `Week/App bar` is abRight's component, and `apply` is
    // apply_plan's re-validation of the same node.
    const rowWrap = built.diagnostics.filter((d) => d.code === 'row-cannot-wrap').map((d) => String(d.component).replace(/^\//, ''));
    expect([...new Set(rowWrap)].sort()).toEqual(['Week/App bar', 'apply']);
  });

  it('templates/planning is byte-identical to a fresh build — the same files, the same bytes', () => {
    expect(files(ARTEFACT)).toEqual(files(rebuilt));
    const differing = files(rebuilt).filter((f) => !fs.readFileSync(path.join(ARTEFACT, f)).equals(fs.readFileSync(path.join(rebuilt, f))));
    expect(differing).toEqual([]);
  });

  it('templates/planning-demo is byte-identical to a fresh build, so the demo can never be older than the template', () => {
    expect(files(DEMO_ARTEFACT)).toEqual(files(demoRebuilt));
    const differing = files(demoRebuilt).filter(
      (f) => !fs.readFileSync(path.join(DEMO_ARTEFACT, f)).equals(fs.readFileSync(path.join(demoRebuilt, f)))
    );
    expect(differing).toEqual([]);
  });

  it('every planned component is in the project, and the week is the start page', () => {
    expect(componentsOf(built).map((c) => c.name).sort()).toEqual(['/App', ...TPL010_COMPONENTS.map((c) => `/${c.path}`)].sort());
    const router = allNodes(built).find((n) => n.node.type === 'Router')?.node;
    expect((router?.parameters as { pages?: unknown })?.pages).toEqual({ startPage: C.pageWeek, routes: [C.pageWeek, C.pageSignIn] });
  });

  it('🔴 AC10 / R2.1-5 — every pair the planner draws clears its floor, recomputed in BOTH palettes', () => {
    // The theme's header said a gate recomputed these; until R2.1 none did.
    const lum = (hex: string) => {
      const n = hex.replace('#', '');
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a: string, b: string) => {
      const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };
    const light = new Map(TPL010_TOKENS.map((t) => [t.name, t.value]));
    const dark = new Map([...light, ...TPL010_DARK_TOKENS.map((t) => [t.name, t.value] as [string, string])]);
    const failing: string[] = [];
    for (const [name, set] of [['light', light], ['dark', dark]] as const) {
      for (const { fg, bg, floor } of CONTRAST_PAIRS) {
        const f = set.get(fg);
        const b = set.get(bg);
        expect([fg, f]).toEqual([fg, expect.stringMatching(/^#[0-9a-f]{6}$/i)]);
        expect([bg, b]).toEqual([bg, expect.stringMatching(/^#[0-9a-f]{6}$/i)]);
        const r = ratio(f as string, b as string);
        if (r < floor) failing.push(`${name}: ${fg} on ${bg} = ${r.toFixed(2)} < ${floor}`);
      }
    }
    expect(failing).toEqual([]);
  });

  it('🔴 R13a — the mockup\u2019s three faces: the import is the first rule, and the three tokens are set', () => {
    expect(themeCss().split('\n')[0]).toBe(`@import url("${FONTS_URL}");`);
    const set = new Map(TPL010_TOKENS.map((t) => [t.name, t.value]));
    expect(set.get('--font-sans')).toMatch(/^"Public Sans",/);
    expect(set.get('--font-display')).toMatch(/^"Archivo",/);
    expect(set.get('--font-mono')).toMatch(/^"IBM Plex Mono",/);
  });

  it('🔴 R5b — the page scrolls when the week does not fit, in the template and the demo, and never sideways', () => {
    // 28 of 205 texts were out of reach on a 1423x680 laptop viewport while `bodyScroll` was false (R2.6).
    for (const dir of [ARTEFACT, DEMO_ARTEFACT]) {
      const project = JSON.parse(fs.readFileSync(path.join(dir, 'nodegx.project.json'), 'utf8'));
      expect(project.settings.bodyScroll).toBe(true);
    }
    expect(themeCss()).not.toMatch(/#root/);
    expect(themeCss()).toMatch(/^\.planner-page \{ overflow-x: hidden; \}$/m);
  });
});

// ── §2 ─────────────────────────────────────────────────────────────────────

describe('§2 the policy, on a database holding somebody’s income', () => {
  const policy = JSON.parse(fs.readFileSync(POLICY_SOURCE, 'utf8')) as {
    collections: Record<string, { permissions: Record<string, string>; creatorOwns?: boolean }>;
    signup?: string;
  };

  it('validates', () => {
    expect(validateSecurityConfig(policy)).toEqual([]);
  });

  it('ships inside the artefact byte for byte', () => {
    expect(fs.readFileSync(path.join(ARTEFACT, POLICY_FILE))).toEqual(fs.readFileSync(POLICY_SOURCE));
  });

  it('names exactly the eight collections, keeps every row private, lets nothing but a Block be deleted (M10: ending money keeps it), and lets nothing change the history (T3)', () => {
    expect(Object.keys(policy.collections).sort()).toEqual([...COLLECTIONS].sort());
    for (const [name, rules] of Object.entries(policy.collections)) {
      expect(`${name} creatorOwns=${rules.creatorOwns}`).toBe(`${name} creatorOwns=true`);
      expect(`${name} delete=${rules.permissions.delete}`).toBe(`${name} delete=${name === 'Block' ? 'authenticated' : 'nobody'}`);
      expect(`${name} update=${rules.permissions.update}`).toBe(`${name} update=${name === 'PlanEvent' ? 'nobody' : 'authenticated'}`);
    }
    // 🔴 The one public door, and the START-HERE says to shut it once your account exists.
    expect(policy.signup).toBe('public');
  });
});

// ── §3 ─────────────────────────────────────────────────────────────────────

describe('§3 the rules the week depends on', () => {
  it('only Logic/Planning data reads the backend, and every query it makes is bounded', () => {
    const queries = allNodes(built).filter((n) => n.node.type === 'DbCollection2');
    expect([...new Set(queries.map((q) => q.component))]).toEqual([C.plannerData]);
    for (const q of queries) {
      const p = q.node.parameters as Record<string, unknown>;
      expect(`${q.node.id} limit=${typeof p.storageLimit}`).toBe(`${q.node.id} limit=number`);
      expect(`${q.node.id} enabled=${p.storageEnableLimit}`).toBe(`${q.node.id} enabled=true`);
    }
  });

  it('🔴 nothing deletes anything but a Block (R10 — a project, a plan, a cash event and the settings are not deletable)', () => {
    const deletes = allNodes(built).filter((n) => n.node.type === 'DeleteDbModelProperties');
    expect(deletes.map((d) => `${d.component} ${(d.node.parameters as Record<string, unknown>).collectionName}`)).toEqual([
      `${C.dropBlock} Block`
    ]);
  });

  /**
   * 🔴 Lucide is a module, and this template installs none. An icon port here renders an
   * empty span — which is how the week arrows, the settings, the theme switch, a chip's plus
   * and all three close buttons shipped as 8 × 8 invisible boxes. Every one of them is a
   * character now, and this keeps it that way.
   */
  it('🔴 no node asks for an icon, because the icon font is a module this template does not install', () => {
    const withIcons = allNodes(built).filter((n) => {
      const p = (n.node.parameters ?? {}) as Record<string, unknown>;
      return p.useIcon === true || JSON.stringify(p).includes('"lucide"');
    });
    expect(withIcons.map((n) => `${n.component} ${n.node.id}`)).toEqual([]);
  });

  /**
   * AC4 — Richard's ruling, 2026-09-21: the hours a block really took go in through a modal,
   * not through a field on the week. Two things have to hold for that to work at all: the
   * block has to be pressable, and the sheet has to be filled from the block rather than from
   * whatever the last press left in it.
   */
  it('🔴 AC4 — a block’s words and its hours are buttons that open the block sheet', () => {
    const blk = component(built, C.block);
    const buttons = nodesOf(blk).filter((n) => n.type === 'net.noodl.controls.button');
    expect(buttons.map((n) => n.id).sort()).toEqual(['bkHours', 'bkTick', 'bkWhat', 'bkWho'].sort());
    const wires = connectionsOf(built, C.block);
    // A Button's words are its `label`; wiring them into `text` lands nothing and says nothing.
    expect(wires.filter((w) => w.toId === 'bkWhat' || w.toId === 'bkHours').map((w) => `${w.fromProperty}→${w.toId}.${w.toProperty}`).sort())
      .toEqual(['hoursText→bkHours.label', 'what→bkWhat.label']);
    // TPL-010-L — through a Condition on fromTodo: a task from the todo list opens there instead.
    expect(wires.filter((w) => w.toId === 'bkLogTodo' && w.toProperty === 'eval').map((w) => `${w.fromId}.${w.fromProperty}`).sort())
      .toEqual(['bkHours.onClick', 'bkWhat.onClick']);
    // …and a task's every press opens the sheet too, to be made into a block (L3, 2026-09-23).
    expect(wires.filter((w) => w.toProperty === 'openLog').map((w) => `${w.fromId}.${w.fromProperty}`).sort()).toEqual([
      'bkLogTodo.onfalse', 'bkLogTodo.ontrue', 'bkTickTodo.ontrue', 'bkWhoTodo.ontrue'
    ]);
  });

  it('🔴 AC4 / R2.4 — every box on the week is filled through startValue and read back from onTextChanged', () => {
    // 🔴 `startValue` in, `onTextChanged` out. `text` is the box's OUTPUT: a value wired into
    // it lands nowhere, and reading `startValue` back gives what was PUT there, not what was
    // typed. Setting `startValue` while the box is unfocused re-publishes `onTextChanged`,
    // which is the only reason a sheet can be reused for a second block without carrying
    // the first one's words into it. R2.4's three editors brought fifteen more boxes; this
    // walks every one of them rather than a list that has to be remembered.
    const boxes: string[] = [];
    const wrong: string[] = [];
    for (const c of componentsOf(built).filter((x) => x.name.startsWith('/Week/'))) {
      const wires = connectionsOf(built, c.name);
      for (const n of nodesOf(c).filter((x) => x.type === 'net.noodl.controls.textinput')) {
        boxes.push(`${c.name} ${n.id}`);
        if (!wires.some((w) => w.toId === n.id && w.toProperty === 'startValue')) wrong.push(`${c.name} ${n.id} has no startValue`);
        if (!wires.some((w) => w.fromId === n.id && w.fromProperty === 'onTextChanged')) wrong.push(`${c.name} ${n.id} is never read`);
        if (wires.some((w) => w.toId === n.id && w.toProperty === 'text')) wrong.push(`${c.name} ${n.id} is written through text`);
      }
    }
    expect(wrong).toEqual([]);
    expect(boxes.length).toBeGreaterThanOrEqual(8 + 4 + 9 + 2);
  });

  /**
   * 🔴 R2.4-8 — the defect R2.4 exists for, as a permanent assertion. `Add block`, `Add project`,
   * `Edit project` and `Add cash event` were placed on the week with nothing wired into `do`,
   * so in the hosted app a person could write their settings and a month plan and nothing else.
   */
  it('🔴 R2.4-8 — every command placed on the week is pressed by something', () => {
    const page = component(built, C.pageWeek);
    const wires = connectionsOf(built, C.pageWeek);
    const commands = nodesOf(page).filter((n) => n.type.startsWith('/Commands/'));
    expect(commands.length).toBeGreaterThanOrEqual(12);
    const unpressed = commands.filter((n) => !wires.some((w) => w.toId === n.id && w.toProperty === 'do')).map((n) => `${n.id} ${n.type}`);
    expect(unpressed).toEqual([]);
  });

  /**
   * 🔴 Found by deploying R2.4: the project editor's row wrote its outputs as `Outputs[name]`
   * in a loop. The door declares a Function's ports by reading the script for `Outputs.<name>`,
   * so eight wires into the editor were kept in the file and went nowhere — every gate passed,
   * and only the deploy's wire check said so.
   */
  it('🔴 every wire out of a Function names an output its script actually writes', () => {
    const missing: string[] = [];
    for (const c of componentsOf(built)) {
      const nodes = new Map(nodesOf(c).map((n) => [n.id, n]));
      for (const w of connectionsOf(built, c.name)) {
        const n = nodes.get(w.fromId);
        if (!n || n.type !== 'JavaScriptFunction' || !w.fromProperty.startsWith('out-')) continue;
        const name = w.fromProperty.slice(4);
        const src = String((n.parameters as { functionScript?: string })?.functionScript ?? '');
        if (!new RegExp(`Outputs\\.${name}\\b`).test(src)) missing.push(`${c.name} ${n.id}.${name}`);
      }
    }
    expect(missing).toEqual([]);
  });

  /**
   * 🔴 TPL-010-T, found by the deploy's wire check: the door declares a Function's inputs by reading
   * its script, so a wire into `in-<name>` whose script never reads `Inputs.<name>` goes to a port that
   * does not exist — kept in the file, dropped at run time, and every gate above was green.
   */
  it('🔴 every wire into a Function names an input its script actually reads', () => {
    const missing: string[] = [];
    for (const c of componentsOf(built)) {
      const nodes = new Map(nodesOf(c).map((n) => [n.id, n]));
      for (const w of connectionsOf(built, c.name)) {
        const n = nodes.get(w.toId);
        if (!n || n.type !== 'JavaScriptFunction' || !w.toProperty.startsWith('in-')) continue;
        const name = w.toProperty.slice(3);
        const src = String((n.parameters as { functionScript?: string })?.functionScript ?? '');
        if (!new RegExp(`Inputs\\.${name}\\b`).test(src)) missing.push(`${c.name} ${n.id}.${name}`);
      }
    }
    expect(missing).toEqual([]);
  });

  /**
   * 🔴 Driven, R2.4: a Text Input compares an arriving start value with the last one it was
   * sent, so a sheet opening with '' on a box last sent '' kept the note typed and abandoned
   * last time. Every box in the three editors is cleared as its sheet closes.
   */
  it('🔴 R2.4 / TPL-010-M — every box in the editors and the Money pane is cleared when its sheet closes', () => {
    const unCleared: string[] = [];
    for (const name of [C.blockSheet, C.projectEditor, C.moneyEditor, C.moneyRepeat, C.moneyBalance]) {
      const wires = connectionsOf(built, name);
      for (const n of nodesOf(component(built, name)).filter((x) => x.type === 'net.noodl.controls.textinput')) {
        if (!wires.some((w) => w.toId === n.id && w.toProperty === 'clear' && w.fromProperty === 'out-closed')) unCleared.push(`${name} ${n.id}`);
      }
    }
    expect(unCleared).toEqual([]);
  });

  /**
   * 🔴 Driven, R2.4: the scrim's close heard every click inside the card that was not a button
   * or a box — a sentence, a gap, the words beside a checkbox — and shut the sheet unsaved.
   */
  it('🔴 a click inside a card or a sheet stays inside it', () => {
    const panels: Array<[string, string]> = [
      [C.projectCard, 'pcCard'], [C.shutdownDrawer, 'sdPanel'], [C.settingsSheet, 'stCard'], [C.blockSheet, 'bsCard'], [C.moneySheet, 'msCard']
    ];
    for (const [name, id] of panels) {
      const node = nodesOf(component(built, name)).find((n) => n.id === id);
      expect(`${name} ${id} ${(node?.parameters as Record<string, unknown>)?.clickBubbling}`).toBe(`${name} ${id} never`);
    }
  });

  /** R16a — the tick opens the sheet; nothing logs a block on one press any more. */
  /**
   * R7b — the chip and the card's move box press different commands. One shared Place move took the
   * card’s project and move and the chip’s `placed` and day, so whichever was pressed second could
   * write with the other's inputs.
   */
  it('🔴 R2.3 — the chip keeps its one press (AC3); the card places, moves and takes out with commands of its own', () => {
    const page = component(built, C.pageWeek);
    const wires = connectionsOf(built, C.pageWeek);
    const into = (id: string) => wires.filter((w) => w.toId === id).map((w) => `${w.fromId}.${w.fromProperty}>${w.toProperty}`).sort();
    const typeOf = (id: string) => nodesOf(page).find((n) => n.id === id)?.type;
    expect(into('cmdPlace')).toEqual(['twChip.onfalse>do', 'twDays.firstOpenDay>date', 'twMoves.move>move', 'twMoves.placed>placed', 'twMoves.projectId>projectId']);
    expect(typeOf('cmdPlaceDay')).toBe(C.placeMove);
    expect(into('cmdPlaceDay')).toEqual([
      'twCard.plan>do', 'twCard.planDate>date', 'twCard.planHours>planned', 'twCardRows.move>move', 'twCardRows.placed>placed', 'twCardRows.resolvedId>projectId'
    ]);
    expect(typeOf('cmdMoveBlock')).toBe('/Commands/Move block');
    // TPL-010-T T3 — and the move blocks, so the history line can name the project and the block.
    expect(into('cmdMoveBlock')).toEqual([
      'twCard.moveIt>do', 'twCard.planDate>date', 'twCardRows.placedBlockId>blockId', 'twCardRows.planDate>from', 'twData.moveBlocks>blocks'
    ]);
    expect(typeOf('cmdTakeOut')).toBe(C.dropBlock);
    expect(into('cmdTakeOut')).toEqual(['twCard.takeOut>do', 'twCardRows.placedBlockId>blockId', 'twData.moveBlocks>blocks']);
    // R7c — the strip and the card read the move blocks, not the week's.
    expect(into('twMovesLogic')).toContain('twData.moveBlocks>moveBlocks');
    expect(into('twMovesLogic')).not.toContain('twData.blocks>blocks');
    expect(into('twCardRows')).toContain('twData.moveBlocks>moveBlocks');
  });

  /**
   * 🔴 Found driving R2.3: **Projects opened the card once per page load.** It reached the shared
   * Set Variable through a Function saying ‘*’, which publishes only on a change, so the second
   * press sent nothing. Every way into the card now has a Set Variable of its own.
   */
  it('🔴 every way into the card sets it with a node of its own, and Projects needs no Function to do it', () => {
    const page = component(built, C.pageWeek);
    const wires = connectionsOf(built, C.pageWeek);
    const setters = nodesOf(page).filter((n) => n.type === 'Set Variable' && (n.parameters as Record<string, unknown>).name === 'plannerCardProject');
    const shared = setters
      .map((n) => ({ id: n.id, values: wires.filter((w) => w.toId === n.id && w.toProperty === 'value').length, dos: wires.filter((w) => w.toId === n.id && w.toProperty === 'do').length }))
      // A fixed value (Close the card) can be pressed from anywhere; a wired one must have one source.
      .filter((n) => n.values > 1 || (n.values > 0 && n.dos > 1));
    expect(shared).toEqual([]);
    const all = wires.find((w) => w.fromId === 'twBar' && w.fromProperty === 'openProjects');
    const target = setters.find((n) => n.id === all?.toId);
    expect(`${all?.toProperty} ${(target?.parameters as Record<string, unknown>)?.value}`).toBe('do *');
  });

  it('🔴 R16a — the tick opens the block sheet and writes nothing', () => {
    const wires = connectionsOf(built, C.pageWeek);
    const fromTick = wires.filter((w) => w.fromId === 'twDayEach' && w.fromProperty === 'itemOutputSignal-toggle').map((w) => `${w.toId}.${w.toProperty}`);
    expect(fromTick.sort()).toEqual(['twClearNewDay.do', 'twModeTick.do', 'twSetLog.do']);
    expect(nodesOf(component(built, C.pageWeek)).some((n) => n.type === '/Commands/Log block' || n.type === '/Commands/Unlog block')).toBe(false);
  });

  /**
   * 🔴 Measured, not reasoned: a row field called `fill` put TWO console errors on the week —
   * *"fill is one of a Noodl Object's own names … row.fill reads that and never the data"* —
   * and the day picker's chips were all painted the same. Every row field in the template goes
   * through this list once.
   */
  it('🔴 no row field is named after something a Noodl Object already owns', () => {
    const RESERVED = ['fill', 'id', 'get', 'set', 'setAll', 'on', 'off', 'notify', 'size'];
    const offenders: string[] = [];
    for (const c of componentsOf(built)) {
      for (const n of nodesOf(c)) {
        const p = (n.parameters ?? {}) as Record<string, unknown>;
        for (const key of Object.keys(p)) {
          // A repeater's row fields arrive as `itemOutput-<name>` / `itemOutputSignal-<name>`.
          const m = /^itemOutput(?:Signal)?-(.+)$/.exec(key);
          if (m && RESERVED.includes(m[1]) && m[1] !== 'id') offenders.push(`${c.name} ${n.id} ${m[1]}`);
        }
        for (const w of c.graph?.connections ?? []) {
          const m2 = /^itemOutput(?:Signal)?-(.+)$/.exec(String(w.fromProperty ?? ''));
          if (m2 && RESERVED.includes(m2[1]) && m2[1] !== 'id') offenders.push(`${c.name} ${w.fromId} ${m2[1]}`);
        }
      }
    }
    expect([...new Set(offenders)]).toEqual([]);
  });

  it('🔴 the week does not ask itself to load again — a loaded→refresh wire is an endless fetch', () => {
    const selfFed = connectionsOf(built, C.pageWeek).filter((w) => w.fromId === w.toId);
    expect(selfFed).toEqual([]);
  });

  /**
   * 🔴 A Function publishes an output only when the value CHANGES, so two Functions saying
   * `-1` and `1` moved the week exactly once each. The arrows step a Counter, whose count is
   * different after every press.
   */
  it('🔴 the week arrows step a Counter, not a constant', () => {
    const data = nodesOf(component(built, C.plannerData));
    expect(data.filter((n) => n.type === 'Counter').map((n) => n.id)).toEqual(['pnCount']);
    const wires = connectionsOf(built, C.plannerData);
    expect(wires.filter((w) => w.toId === 'pnCount').map((w) => `${w.fromProperty}→${w.toProperty}`).sort()).toEqual([
      'nextWeek→increase',
      'previousWeek→decrease',
      'thisWeek→reset'
    ]);
  });

  it('🔴 every Function whose run is wired has Run On Value Change OFF on every input wired into it', () => {
    const offenders: string[] = [];
    for (const c of componentsOf(built)) {
      const wires = (c.graph?.connections ?? []) as unknown as Array<Record<string, string>>;
      for (const node of nodesOf(c)) {
        if (node.type !== 'JavaScriptFunction') continue;
        if (!wires.some((w) => w.toId === node.id && w.toProperty === 'run')) continue;
        const params = (node.parameters ?? {}) as Record<string, unknown>;
        for (const w of wires.filter((x) => x.toId === node.id && x.toProperty.startsWith('in-'))) {
          if (params[`runOnChange-${w.toProperty}`] !== false) offenders.push(`${c.name} ${node.id}.${w.toProperty}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

// ── §4 ─────────────────────────────────────────────────────────────────────

const MONDAY = '2026-09-21';

/** Blocks for this month, in the shape the backend stores them. */
function block(date: string, projectId: string, planned: number, done: boolean, actual: number | '' = ''): Record<string, unknown> {
  return { id: `b-${date}-${projectId}-${planned}-${done}`, date, projectId, planned, done, actual, what: 'Work', position: 1 };
}

const PROJECTS = [
  { id: 'p-earn', name: 'Bramble & Co', kind: 'earning', rate: 80, move: 'Offer the add-on', moveDue: '2026-09-25', moveWorth: '+€700 / mo' },
  { id: 'p-build', name: 'Coaching offer', kind: 'building', move: 'Send the email', moveDue: '2026-09-23' },
  { id: 'p-done', name: 'Builder tool', kind: 'building', move: 'Fixes only', moveStop: true },
  { id: 'p-dormant', name: 'Founder A', kind: 'dormant', move: 'Send the offer', moveDue: '2026-09-20' },
  { id: 'p-admin', name: 'Admin', kind: 'admin' }
];

describe('§4 the arithmetic, run rather than read', () => {
  beforeAll(() => {
    // Friday 25 September 2026 leaves five working days in the month (Sundays do not count),
    // which is the week AC2 is written about.
    jest.useFakeTimers({ doNotFake: ['performance'] }).setSystemTime(new Date(2026, 8, 25, 9, 0, 0));
  });
  afterAll(() => jest.useRealTimers());

  const ENVELOPES = () => scriptOf(built, C.envelopes, 'enWork');
  const settings = [{ id: 's', rate: 70, householdNeed: 5000, partnerIncome: 1200, focusHours: 6, openingBalance: 3200 }];

  it('AC2 — 41 h logged against a 55 h month is “2.75 h a day for the 5 days left”, and building is what the ceiling has left over', () => {
    const blocks = [
      block('2026-09-02', 'p-earn', 20, true),
      block('2026-09-09', 'p-earn', 21, true),
      block('2026-09-23', 'p-earn', 8, false) // planned, not logged: it has not been spent
    ];
    // M22 — the target arrives from Logic/Money; the budgets spend it.
    const { outputs } = run(ENVELOPES(), { projects: PROJECTS, blocks, monthPlans: [], settings, weekStart: MONDAY, targetHours: 55 });
    expect(outputs.target).toBe(55);
    expect(outputs.billableUsed).toBe(41);
    expect(outputs.daysLeft).toBe(5);
    expect(outputs.perDay).toBe(2.75);
    expect(outputs.buildingLeft).toBe(16.25);
    const rows = outputs.rows as Array<Record<string, string>>;
    expect(rows[0].say).toBe('2.75 h a day for the 5 days left');
    expect(rows[3].say).toBe('Not budgeted, not counted, not a problem');
  });

  /**
   * 🔴 The defect this whole gate exists for. A logged block whose hours were the hours
   * planned carries `actual: ''` — the commands write emptiness rather than copying the plan
   * in, so that nothing looks measured that was not. `Number('')` is 0, so reading it as a
   * number counted every logged block as nought: the budgets stayed empty however much
   * work went into them, and every block on the week read "0 h".
   */
  it('🔴 a logged block with an empty actual counts for the hours it was planned at', () => {
    const { outputs } = run(ENVELOPES(), {
      projects: PROJECTS,
      blocks: [block('2026-09-02', 'p-earn', 4, true, '')],
      monthPlans: [],
      settings,
      weekStart: MONDAY
    });
    expect(outputs.billableUsed).toBe(4);
  });

  it('a logged block with an actual counts for the actual, and an unlogged one for its plan', () => {
    const { outputs } = run(ENVELOPES(), {
      projects: PROJECTS,
      blocks: [block('2026-09-02', 'p-earn', 2, true, 3.5), block('2026-09-24', 'p-earn', 9, false)],
      monthPlans: [],
      settings,
      weekStart: MONDAY
    });
    expect(outputs.billableUsed).toBe(3.5);
  });

  it('the day columns show a logged block at the hours it counts for, not at nought', () => {
    const { outputs } = run(scriptOf(built, C.dayColumns, 'dlWork'), {
      projects: PROJECTS,
      blocks: [block(MONDAY, 'p-earn', 2, true, ''), block(MONDAY, 'p-earn', 1.5, true, 2.5)],
      weekStart: MONDAY,
      focusHours: 6,
      newBlockId: ''
    });
    const monday = (outputs.columns as Array<Record<string, unknown>>)[0];
    expect((monday.blocks as Array<Record<string, string>>).map((b) => b.hoursText)).toEqual(['2 h', '2.5 h']);
    expect(monday.focusText).toBe('4.5 / 6 h');
  });

  it('R9 — a finished asset is off the strip, an overdue move is first, and a placed one reads as placed', () => {
    const moveBlocks = [{ ...block('2026-09-26', 'p-build', 0.5, false), isMove: true }];
    const { outputs } = run(scriptOf(built, C.moves, 'mvWork'), { projects: PROJECTS, moveBlocks, weekStart: MONDAY });
    const rows = outputs.rows as Array<Record<string, unknown>>;
    expect(rows.map((r) => r.projectId)).toEqual(['p-dormant', 'p-build', 'p-earn']);
    expect(rows[0].late).toBe(true);
    expect(rows[1].placed).toBe(true);
    expect(outputs.unplacedDormant).toBe('Founder A');
    expect(outputs.unsentBuilding).toBe('');
  });

  /**
   * R7c — placed is a live move block on or after today, whichever week is on screen. Today is
   * Friday 25 September here. A move put in next Tuesday reads placed THIS week (R2.3-3), so the chip
   * opens the card rather than writing a second block; a done move block, and one left in the past
   * undone, do not count (R2.3-4).
   */
  it('🔴 R2.3-3 / R2.3-4 — placed is a live move block from today on, not a block in the week on screen', () => {
    const MOVES = scriptOf(built, C.moves, 'mvWork');
    const move = (date: string, projectId: string, done = false) => ({ ...block(date, projectId, 0.5, done), isMove: true });
    const rowsFor = (moveBlocks: unknown[]) =>
      Object.fromEntries(
        (run(MOVES, { projects: PROJECTS, moveBlocks, weekStart: MONDAY }).outputs.rows as Array<Record<string, unknown>>).map((r) => [r.projectId, r])
      );

    const next = rowsFor([move('2026-09-29', 'p-earn'), move('2026-10-08', 'p-build')]);
    expect(next['p-earn'].placed).toBe(true);
    // R7d — the day sits where the tick is: the weekday within six days, the date past that.
    expect(next['p-earn'].tick).toBe('\u2713 Tue');
    expect(next['p-build'].tick).toBe('\u2713 Thu 8');
    expect(next['p-earn'].dotFill).toBe('var(--env-billable)');
    expect(next['p-earn'].chipClass).toBe('planner-chip planner-chip-placed');

    const gone = rowsFor([move('2026-09-24', 'p-earn', true), move('2026-09-22', 'p-build', false)]);
    for (const id of ['p-earn', 'p-build']) {
      expect(`${id} ${gone[id].placed} ${gone[id].tick} ${gone[id].dotFill} ${gone[id].chipClass}`).toBe(`${id} false  transparent planner-chip`);
    }
  });

  /**
   * R7b and R7d in the card: the move box and the list, for both states, from the rows the card draws.
   */
  it('🔴 R2.3-1 / R2.3-5 — the card: a day and hours before, "In the week" after, and the list muted only where placed', () => {
    const CARD = scriptOf(built, '/Logic/Card rows', 'kdWork');
    const ins = { projects: PROJECTS, blocks: [], weekStart: MONDAY, firstOpenDay: '2026-09-26' };
    const listRow = (out: Record<string, unknown>, id: string) =>
      (out.groups as Array<{ rows: Array<Record<string, unknown>> }>).flatMap((g) => g.rows).find((r) => r.projectId === id) as Record<string, unknown>;

    const open = run(CARD, { ...ins, moveBlocks: [], selectedId: 'p-earn' }).outputs;
    expect([open.placed, open.unplaced, open.planDate, open.planHours, open.minDate, open.hasLast]).toEqual([false, true, '2026-09-26', '0.5', '2026-09-25', false]);
    expect(open.placedBlockId).toBe('');
    expect(listRow(open, 'p-earn').moveText).toBe('\u2192 Offer the add-on');
    expect(listRow(open, 'p-earn').moveColor).toBe('var(--foreground)');
    // A late move that is not placed stays red — red is for exactly this (R13).
    expect(listRow(open, 'p-dormant').moveColor).toBe('var(--destructive)');

    const live = { ...block('2026-09-29', 'p-earn', 1, false), id: 'mv1', isMove: true };
    const placed = run(CARD, { ...ins, moveBlocks: [live], selectedId: 'p-earn' }).outputs;
    expect([placed.placed, placed.unplaced, placed.placedBlockId, placed.planDate]).toEqual([true, false, 'mv1', '2026-09-29']);
    expect(placed.placedLine).toBe('In the week: Tue 29 \u00b7 1 h');
    expect(listRow(placed, 'p-earn').moveText).toBe('\u2713 Tue 29 \u00b7 Offer the add-on');
    expect(listRow(placed, 'p-earn').moveColor).toBe('var(--muted-foreground)');
    // The hours box is put back whenever the project or its state changes.
    expect(placed.moveKey).not.toBe(open.moveKey);

    const done = run(CARD, { ...ins, moveBlocks: [{ ...live, date: '2026-09-24', done: true }], selectedId: 'p-earn' }).outputs;
    expect([done.placed, done.unplaced, done.hasLast]).toEqual([false, true, true]);
    expect(done.lastLine).toMatch(/^\u2713 Done Thu 24\./);

    // R9 — "fixes only" has no move box at all.
    const stop = run(CARD, { ...ins, moveBlocks: [], selectedId: 'p-done' }).outputs;
    expect([stop.canPlan, stop.placed, stop.unplaced]).toEqual([false, false, false]);
  });

  it('R2.3-1 / R2.3-2 / R2.3-6 — Place move takes the day and hours chosen, Move block changes only the day', () => {
    const place = scriptOf(built, C.placeMove, 'PlacemoveGuard');
    const ok = { projectId: 'p-earn', move: 'Offer the add-on', date: '2026-09-25' };
    const chosen = run(place, { ...ok, planned: '1' });
    expect(chosen.signals).toEqual(['go']);
    expect([chosen.outputs.date, chosen.outputs.planned, chosen.outputs.isMove]).toEqual(['2026-09-25', 1, true]);
    // AC3, unchanged: the chip sends no hours, and that is half an hour.
    expect(run(place, ok).outputs.planned).toBe(0.5);
    for (const bad of [{ planned: '0' }, { planned: 'lots' }, { placed: true }, { date: '' }]) expect(run(place, { ...ok, ...bad }).signals).toEqual([]);

    const moveIt = scriptOf(built, '/Commands/Move block', 'MoveblockGuard');
    const moved = run(moveIt, { blockId: 'mv1', date: '2026-09-24', from: '2026-09-29' });
    expect(moved.signals).toEqual([]); // the past: a move put there would stop being placed
    const ahead = run(moveIt, { blockId: 'mv1', date: '2026-10-01', from: '2026-09-29' });
    expect(ahead.signals).toEqual(['go']);
    expect(recordOnly(ahead.outputs)).toEqual({ date: '2026-10-01' });
    expect(run(moveIt, { blockId: 'mv1', date: '2026-09-29', from: '2026-09-29' }).signals).toEqual([]);
  });

  /** R23, run: what the block sheet writes about the block itself. */
  it('R2.4-6 — Save block writes the project, the words, the hours and the day, and refuses a block that is not one', () => {
    const guard = scriptOf(built, C.saveBlock, 'SaveblockGuard');
    const moved = run(guard, { blockId: 'b1', projectId: 'p-build', what: '  Security review  ', planned: 1.3, date: '2026-09-24' });
    expect(moved.signals).toEqual(['go']);
    expect(recordOnly(moved.outputs)).toEqual({ projectId: 'p-build', what: 'Security review', planned: 1.25, date: '2026-09-24' });
    // A block with no words, no project, no day or no hours is not a block. Nothing is written at all.
    const ok = { blockId: 'b1', projectId: 'p-earn', what: 'Work', planned: 1, date: '2026-09-24' };
    for (const bad of [{ what: '   ' }, { blockId: '' }, { projectId: '' }, { date: 'Thursday' }, { planned: 0 }]) {
      expect(run(guard, { ...ok, ...bad }).signals).toEqual([]);
    }
  });

  /**
   * R2.4-4 and R2.4-8 — *Add time* three ways. The entries are the proof of work; `actual` is
   * their sum; *Done* is its own decision and is off unless it is ticked.
   */
  it('🔴 R2.4-4 — Add time: no entries, one entry, and one entry with Done', () => {
    const guard = scriptOf(built, C.addTime, 'AddtimeGuard');

    // No entries yet: half an hour with a note is logged, and the block stays open.
    const first = run(guard, { blockId: 'b1', entries: [], actual: '', hours: 0.5, note: ' Login flow ', day: '2026-09-23', logged: false });
    expect(first.signals).toEqual(['go']);
    expect(recordOnly(first.outputs)).toEqual({ entries: [{ day: '2026-09-23', hours: 0.5, note: 'Login flow' }], actual: 0.5, done: false });

    // One entry already: a second half hour with Done ticked appends, sums and closes it.
    const second = run(guard, { blockId: 'b1', entries: first.outputs.entries, actual: 0.5, hours: 0.5, note: 'Sessions', day: '2026-09-24', logged: true });
    expect(second.outputs.entries).toEqual([
      { day: '2026-09-23', hours: 0.5, note: 'Login flow' },
      { day: '2026-09-24', hours: 0.5, note: 'Sessions' }
    ]);
    expect(second.outputs.actual).toBe(1);
    expect(second.outputs.done).toBe(true);

    // 🔴 Done with no hours and no entries still means "as long as it was meant to": '' and
    // NOT nought. A block logged before R22 keeps the hours it was logged at.
    expect(run(guard, { blockId: 'b1', entries: [], actual: '', hours: '', note: '', day: '2026-09-24', logged: true }).outputs.actual).toBe('');
    expect(run(guard, { blockId: 'b1', entries: [], actual: 2.5, hours: '', note: '', day: '2026-09-24', logged: true }).outputs.actual).toBe(2.5);
    // Unticking Done opens the block again; the time already logged stays.
    const reopened = run(guard, { blockId: 'b1', entries: second.outputs.entries, actual: 1, hours: '', note: '', day: '2026-09-24', logged: false });
    expect(reopened.outputs.done).toBe(false);
    expect(reopened.outputs.actual).toBe(1);
    expect(run(guard, { blockId: '', entries: [], actual: '', hours: 1, note: '', day: '2026-09-24', logged: true }).signals).toEqual([]);
  });

  it('🔴 R2.4-4 — an open block with time on it spends that time, and reads “0.5 of 1 h” in its day', () => {
    const open = { ...block(MONDAY, 'p-earn', 1, false), entries: [{ day: MONDAY, hours: 0.5, note: 'Login flow' }], actual: 0.5 };
    const env = run(ENVELOPES(), { projects: PROJECTS, blocks: [open], monthPlans: [], settings, weekStart: MONDAY });
    expect(env.outputs.billableUsed).toBe(0.5);
    const days = run(scriptOf(built, C.dayColumns, 'dlWork'), { projects: PROJECTS, blocks: [open], weekStart: MONDAY, focusHours: 6, newBlockId: '' });
    const monday = (days.outputs.columns as Array<Record<string, unknown>>)[0];
    expect((monday.blocks as Array<Record<string, string>>)[0].hoursText).toBe('0.5 of 1 h');
    // The day still holds the whole hour for it: the ceiling is a plan, and the plan is an hour.
    expect(monday.focusText).toBe('1 / 6 h');
    expect(monday.key).toBe(MONDAY);
  });

  /** R16a and R2.4-5, run against the page's own Function. */
  it('🔴 R2.4-5 — the tick opens the sheet with Done on and what is left of the plan; the words open it with Done off', () => {
    const row = scriptOf(built, C.pageWeek, 'twSheetRow');
    const b: Record<string, unknown> = { ...block(MONDAY, 'p-earn', 1.5, false), entries: [{ day: MONDAY, hours: 0.5, note: 'Login flow' }], actual: 0.5 };
    const ticked = run(row, { id: b.id, newDay: '', mode: 'tick', blocks: [b], projects: PROJECTS }).outputs;
    expect([ticked.shown, ticked.done, ticked.hours, ticked.timeShown]).toEqual([true, true, '1', true]);
    expect(ticked.loggedLine).toBe('0.5 of 1.5 h logged. It stays open until Done is ticked.');
    expect(ticked.entries).toEqual([{ dayText: 'Mon 21 Sep', hoursText: '0.5 h', note: 'Login flow' }]);
    const words = run(row, { id: b.id, newDay: '', mode: '', blocks: [b], projects: PROJECTS }).outputs;
    expect([words.done, words.hours]).toEqual([false, '']);
    const closed = run(row, { id: '', newDay: '', mode: '', blocks: [b], projects: PROJECTS }).outputs;
    expect(closed.shown).toBe(false);
    // The + on a day: a new block on that day, with no time section.
    const fresh = run(row, { id: '', newDay: '2026-09-24', mode: '', blocks: [b], projects: PROJECTS }).outputs;
    expect([fresh.shown, fresh.isNew, fresh.timeShown, fresh.date, fresh.title]).toEqual([true, true, false, '2026-09-24', 'New block · Thursday 24 Sep']);
    expect((fresh.projects as unknown[]).length).toBe(PROJECTS.length);
  });

  it('R2.4-1 / R2.4-2 — a project is born with its move, and editing one writes every field it shows', () => {
    const add = run(scriptOf(built, C.addProject, 'AddprojectGuard'), {
      name: ' Harbour Books ', sub: 'New retainer', kind: 'earning', rate: 75, slot: '3 of 3', rung: '',
      move: 'Send the proposal', moveWorth: '+€600 / mo', moveWhen: 'Friday', moveDue: '2026-09-25', moveStop: false, say: ''
    });
    expect(add.signals).toEqual(['go']);
    expect(add.outputs).toMatchObject({ name: 'Harbour Books', kind: 'earning', rate: 75, move: 'Send the proposal', moveDue: '2026-09-25', moveStop: false });
    const edit = run(scriptOf(built, C.editProject, 'EditprojecGuard'), {
      projectId: 'p-earn', name: 'Bramble & Co', sub: 'Retainer', kind: 'nonsense', rate: '', slot: '', rung: '',
      move: 'Offer the testing add-on', moveWorth: '', moveWhen: '', moveDue: 'Friday', moveStop: true, say: ''
    });
    expect(edit.outputs).toMatchObject({ kind: 'earning', rate: 0, move: 'Offer the testing add-on', moveDue: '', moveStop: true });
    expect(run(scriptOf(built, C.editProject, 'EditprojecGuard'), { projectId: '', name: 'X' }).signals).toEqual([]);
  });

  /**
   * P78-TPL010-MOVEARROW (ruled s45, "fix the old planner now"). A For Each turns each plain row into the record with
   * that row's id and writes every field of the row onto it. The card's project rows wore the Project's id, so its
   * decorated words ("→ ", "✓ Tue 29 · ") went into `Project.move`, one more each time the card's script ran, and a save
   * stored them. Every list the planner draws now gives a row its own id and carries the record's in a field of its own.
   */
  const LISTS: Array<[string, string, string, string, (out: Record<string, unknown>) => Array<Record<string, unknown>>]> = [
    ['the project card', '/Logic/Card rows', 'kdWork', "'card:' + proj.id", (o) => (o.groups as Array<{ rows: Array<Record<string, unknown>> }>).flatMap((g) => g.rows)],
    ['the day columns', C.dayColumns, 'dlWork', "'day:' + blk.id", (o) => (o.columns as Array<{ blocks: Array<Record<string, unknown>> }>).flatMap((c) => c.blocks)],
    ['the shutdown’s carry list', C.shutdown, 'suWork', "'carry:' + cb.id", (o) => o.carryRows as Array<Record<string, unknown>>]
  ];
  const TODAY = '2026-09-25';
  const listInputs = {
    projects: PROJECTS,
    blocks: [block(MONDAY, 'p-earn', 2, false), block(TODAY, 'p-build', 1, false), block(TODAY, 'p-earn', 1, true)],
    moveBlocks: [],
    weekStart: MONDAY,
    firstOpenDay: '2026-09-26',
    selectedId: 'p-earn',
    focusHours: 6,
    newBlockId: '',
    todayKey: TODAY,
    tomorrowKey: '2026-09-26',
    todayLong: 'Friday 25',
    tomorrowLong: 'Saturday',
    target: 55,
    billableUsed: 41,
    billableLeft: 14,
    perDay: 2.75,
    buildingLeft: 16.25,
    daysLeft: 5,
    unplacedDormant: ''
  };
  const recordIds = new Set([...PROJECTS, ...listInputs.blocks].map((r) => String(r.id)));

  it.each(LISTS)('🔴 MOVEARROW — no row %s draws carries a record’s id, and it still names its record', (_label, component, node, own, rowsOf) => {
    const script = scriptOf(built, component, node);
    const rows = rowsOf(run(script, listInputs).outputs);
    // Known-firing: the list drew rows, and each still names the record it stands for.
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.filter((r) => recordIds.has(String(r.id)))).toEqual([]);
    expect(rows.every((r) => recordIds.has(String(node === 'kdWork' ? r.projectId : r.blockId)))).toBe(true);
    // ARM: the row's id back to the record's — this check sees every row.
    expect(script).toContain(`id: ${own},`);
    const record = own.slice(own.indexOf('+ ') + 2);
    const arm = rowsOf(run(script.replace(`id: ${own},`, `id: ${record},`), listInputs).outputs);
    expect(arm.filter((r) => recordIds.has(String(r.id)))).toHaveLength(rows.length);
  });

  it('🔴 MOVEARROW — the block sheet’s next actions: no row carries the todo action’s id, and the press still sends it', () => {
    const acts = [
      { id: 'a-draft', title: 'Draft the invoice' },
      { id: 'a-send', title: 'Send it' }
    ];
    const b = { id: 'todo-t-inv', projectId: '', date: TODAY, what: 'Invoice', planned: 0.25, todoProjected: true, todoTaskId: 't-inv', todoActions: acts };
    const out = run(scriptOf(built, C.pageWeek, 'twSheetRow'), { id: b.id, newDay: '', mode: '', blocks: [b], projects: PROJECTS, todoUrl: '', picked: '', history: [] }).outputs;
    const rows = out.actionRows as Array<Record<string, unknown>>;
    expect(rows.map((r) => r.actionId)).toEqual(['a-draft', 'a-send']);
    expect(rows.filter((r) => r.id === 'a-draft' || r.id === 'a-send')).toEqual([]);
    expect(connectionsOf(built, C.actionPick).some((w) => w.fromId === 'apIn' && w.fromProperty === 'actionId' && w.toId === 'apOut' && w.toProperty === 'id')).toBe(true);
  });

  /**
   * The consequence, on the runtime's own Model and Collection (what a For Each does with its items): the card's script
   * run twice over a project the query holds, its rows set into a list each time.
   */
  function cardTwice(script: string, id: string): { move: string; hoursText: unknown } {
    /* eslint-disable @typescript-eslint/no-var-requires */
    const M = require('../../noodl-runtime/src/model');
    const L = require('../../noodl-runtime/src/collection');
    /* eslint-enable @typescript-eslint/no-var-requires */
    const Model = M.default ?? M;
    const Collection = L.default ?? L;
    const record = Model.create({ id, name: 'Bramble & Co', kind: 'earning', move: 'Offer the add-on', moveDue: '2026-09-25' });
    // One For Each, its items set again each time the script runs (opening the card, then closing it).
    const list = Collection.create();
    Collection.keepPlainRowsApart(list);
    for (let pass = 0; pass < 2; pass++) {
      const projects = [{ ...PROJECTS[0], id, move: record.get('move') }];
      const out = run(script, { ...listInputs, projects, selectedId: id }).outputs;
      list.set((out.groups as Array<{ rows: unknown[] }>).flatMap((g) => g.rows));
    }
    return { move: String(record.get('move')), hoursText: record.get('hoursText') };
  }

  it('🔴 MOVEARROW — opening and closing the card twice leaves the project’s move as it was', () => {
    const script = scriptOf(built, '/Logic/Card rows', 'kdWork');
    expect(cardTwice(script, 'mv-fixed')).toEqual({ move: 'Offer the add-on', hoursText: undefined });
    // ARMS: the row wearing the project's id again — its fields land on the project; and with its words back in `move`,
    // the arrow goes into the project's move, one more each time (the bug as it was found).
    const cut = "id: 'card:' + proj.id,", words = 'moveText: live ?';
    expect([script.includes(cut), script.includes(words)]).toEqual([true, true]);
    const sameId = script.replace(cut, 'id: proj.id,');
    expect(cardTwice(sameId, 'mv-arm-id')).toEqual({ move: 'Offer the add-on', hoursText: '\u2014' });
    expect(cardTwice(sameId.replace(words, 'move: live ?'), 'mv-arm-move').move).toBe('\u2192 \u2192 Offer the add-on');
  });

  it('🔴 MOVEARROW — a move saved with the card’s arrows and days loses them, and a move of its own words is kept', () => {
    const guard = scriptOf(built, C.editProject, 'EditprojecGuard');
    const save = (move: string) => run(guard, { projectId: 'p-earn', name: 'Bramble & Co', kind: 'earning', move }).outputs.move;
    expect(save('\u2192 \u2192 Find out from Joss')).toBe('Find out from Joss');
    expect(save('\u2713 Wed 30 \u00b7 \u2713 Wed 30 \u00b7 Ade work')).toBe('Ade work');
    expect(save('! \u2192 Chase it')).toBe('Chase it');
    expect(save('Find out from Joss \u2192 then call')).toBe('Find out from Joss \u2192 then call');
  });

  /**
   * The phone (Richard, 2026-09-21): **one day column and a day picker**. Six columns are
   * always built; exactly one carries `planner-day-picked`, and the stylesheet under the
   * breakpoint draws that one. Which one has to survive the week arrows — a day picked last
   * week is not in this week, and falling back is the difference between showing today and
   * showing nothing at all.
   */
  it('🔴 the phone’s picked day: exactly one column, and it falls back rather than vanishing', () => {
    const script = scriptOf(built, C.dayColumns, 'dlWork');
    const base = { projects: PROJECTS, blocks: [], weekStart: MONDAY, focusHours: 6, newBlockId: '' };
    const pickedOf = (out: Record<string, unknown>) =>
      (out.columns as Array<Record<string, string>>).filter((c) => / planner-day-picked$/.test(c.columnClass));

    // Nothing picked, and today is not in this week (the clock is held at Friday 25, which IS
    // in it) — so ask for a week that is not the current one.
    const other = run(script, { ...base, weekStart: '2026-10-05', pickedDay: '' });
    expect(pickedOf(other.outputs).map((c) => c.day)).toEqual(['Mon 5']);

    // Nothing picked and today IS in the week: today is the one drawn.
    const thisWeek = run(script, { ...base, pickedDay: '' });
    expect(pickedOf(thisWeek.outputs).map((c) => c.day)).toEqual(['Fri 25']);

    // Picked, and in the week.
    const picked = run(script, { ...base, pickedDay: '2026-09-23' });
    expect(pickedOf(picked.outputs).map((c) => c.day)).toEqual(['Wed 23']);

    // Picked, but the arrows have moved the week past it: back to today, not to nothing.
    const stale = run(script, { ...base, pickedDay: '2026-08-03' });
    expect(pickedOf(stale.outputs).map((c) => c.day)).toEqual(['Fri 25']);

    // Six chips, one of them the picked one, and every column keeps R15's pin.
    const rows = stale.outputs.picker as Array<Record<string, string>>;
    expect(rows.map((r) => r.label)).toEqual(['Mon 21', 'Tue 22', 'Wed 23', 'Thu 24', 'Fri 25', 'Sat 26']);
    expect(rows.filter((r) => r.chipFill !== 'transparent').map((r) => r.label)).toEqual(['Fri 25']);
    for (const c of stale.outputs.columns as Array<Record<string, string>>) {
      expect(c.columnClass.startsWith('planner-pinned planner-day')).toBe(true);
    }
  });

  it('R12 — one concern, and the order it is chosen in', () => {
    const shutdown = scriptOf(built, C.shutdown, 'suWork');
    const base = {
      projects: PROJECTS,
      todayKey: '2026-09-25',
      tomorrowKey: '2026-09-26',
      todayLong: 'Friday 25',
      tomorrowLong: 'Saturday',
      target: 55,
      billableUsed: 41,
      billableLeft: 14,
      perDay: 2.75,
      buildingLeft: 16.25,
      daysLeft: 5,
      focusHours: 6
    };
    const unsent = run(shutdown, { ...base, blocks: [], unplacedDormant: 'Founder A' });
    expect(unsent.outputs.concern).toContain('Founder A');
    const quiet = run(shutdown, { ...base, blocks: [], unplacedDormant: '' });
    expect(quiet.outputs.concern).toBe('No concerns tonight.');
  });

  /**
   * R2.5-1 — **the days a person works are theirs to choose** (R24). Q4 left Saturday optional and
   * the build counted it anyway, because there was nowhere to say otherwise; these are the four
   * readings that matter, including the two defaults that keep an existing row's month the shape
   * it was: no column at all still means Monday to Saturday, and the coach may write the column
   * as text.
   */
  it('R2.5-1 — unticking Saturday takes it out of the days left, and the Billable tile says so', () => {
    const blocks = [block('2026-09-02', 'p-earn', 20, true), block('2026-09-09', 'p-earn', 21, true)];
    const base = { projects: PROJECTS, blocks, monthPlans: [], weekStart: MONDAY, targetHours: 55 };
    const say = (o: Record<string, unknown>) => (o.rows as Array<Record<string, string>>)[0].say;

    const monSat = run(ENVELOPES(), { ...base, settings: [{ ...settings[0], workingDays: [1, 2, 3, 4, 5, 6] }] }).outputs;
    expect([monSat.daysLeft, monSat.perDay]).toEqual([5, 2.75]);
    expect(say(monSat)).toBe('2.75 h a day for the 5 days left');

    const monFri = run(ENVELOPES(), { ...base, settings: [{ ...settings[0], workingDays: [1, 2, 3, 4, 5] }] }).outputs;
    expect([monFri.daysLeft, monFri.perDay]).toEqual([4, 3.5]);
    expect(say(monFri)).toBe('3.5 h a day for the 4 days left');

    // A row written before this sheet existed has no column, and its month must not change shape.
    expect(run(ENVELOPES(), { ...base, settings }).outputs.daysLeft).toBe(5);
    // Nor when the column is text — which is how the coach is likeliest to write it (TPL-010-MCP).
    expect(run(ENVELOPES(), { ...base, settings: [{ ...settings[0], workingDays: '1,2,3,4,5' }] }).outputs.daysLeft).toBe(4);
    // Nobody works no days: an empty list is read as the default rather than as a month with no
    // days in it, which would divide by nothing.
    expect(run(ENVELOPES(), { ...base, settings: [{ ...settings[0], workingDays: [] }] }).outputs.daysLeft).toBe(5);
  });

  /**
   * R2.5-2 / R25 — **the recommendations are rules, printed where they can be disagreed with.**
   * September 2026 has 22 Monday-to-Friday days; at the 6 h ceiling that is 132 h of capacity.
   *
   * 🔴 **The figures are 13.25 and 63.75, not the AC's 13 and 64.** A tenth of 132 h is 13.2 h, and
   * R24 rounds a recommendation *to the quarter hour* — the unit everything else in this app is
   * counted in. The AC's arithmetic was done in whole hours; the ruling wins, and the sum still
   * closes: 55 + 13.25 + 63.75 = 132.
   */
  it('R2.5-2 — 22 working days at 6 h is 132 h: admin 13.25, building 63.75, hobby 0, and Plan this month writes them', () => {
    const monFri = [{ ...settings[0], workingDays: [1, 2, 3, 4, 5] }];
    const { outputs } = run(ENVELOPES(), {
      projects: PROJECTS, blocks: [], monthPlans: [], settings: monFri, weekStart: MONDAY, targetHours: 55
    });
    expect([outputs.workingDaysInMonth, outputs.capacityHours]).toEqual([22, 132]);
    expect([outputs.recBuilding, outputs.recAdmin, outputs.recHobby]).toEqual([63.75, 13.25, 0]);
    expect(outputs.recBuildingLine).toBe('Recommended 63.75 h — 132 h of capacity, less 55 h billable and 13.25 h admin.');
    expect(outputs.recAdminLine).toBe('Recommended 13.25 h — a tenth of capacity, for invoices and asks.');
    expect(outputs.recLabel).toBe('Use 63.75 / 13.25 / 0 h');

    // With no plan and nothing typed: building keeps R3's figure — what the ceiling has left over
    // once the billable day is paid for, which with 55 h over 4 days is nothing — and admin falls
    // back to the recommendation rather than to a nought nobody chose.
    const rows = outputs.rows as Array<Record<string, string>>;
    expect([rows[1].budgetText, rows[2].budgetText, rows[3].budgetText]).toEqual(['0', '13.25', '0']);
    // A split that IS typed is the one the budgets spend, plan or no plan.
    const typed = run(ENVELOPES(), {
      projects: PROJECTS, blocks: [], monthPlans: [], weekStart: MONDAY, targetHours: 55,
      settings: [{ ...monFri[0], buildingHours: 40, adminHours: 8, hobbyHours: 2 }]
    }).outputs;
    const typedRows = typed.rows as Array<Record<string, string>>;
    expect([typedRows[1].budgetText, typedRows[2].budgetText, typedRows[3].budgetText]).toEqual(['40', '8', '2']);

    // *Use the recommendation* hands those three figures to Edit settings — values first, the
    // write last, which is the only ordering this product guarantees.
    const use = run(scriptOf(built, C.pageWeek, 'twUseRec'), { recBuilding: 63.75, recAdmin: 13.25, recHobby: 0 });
    expect(use.outputs).toEqual({ buildingHours: 63.75, adminHours: 13.25, hobbyHours: 0 });
    expect(use.signals).toEqual(['go']);

    // And the boxes show what is stored, falling back to the recommendation while nothing is.
    const unpack = scriptOf(built, C.pageWeek, 'twSettings');
    const blank = run(unpack, { settings: [{ id: 's', focusHours: 6 }], recBuilding: 63.75, recAdmin: 13.25, recHobby: 0 }).outputs;
    expect([blank.buildingHours, blank.adminHours, blank.hobbyHours]).toEqual(['63.75', '13.25', '0']);
    const stored = run(unpack, { settings: [{ id: 's', buildingHours: 40, adminHours: 8, hobbyHours: 2 }], recBuilding: 63.75, recAdmin: 13.25, recHobby: 0 }).outputs;
    expect([stored.buildingHours, stored.adminHours, stored.hobbyHours]).toEqual(['40', '8', '2']);

    // Plan this month writes what the sheet says, and the month's working days with it — never
    // the days that happen to be left.
    const plan = run(scriptOf(built, C.setMonthPlan, 'SetmonthplGuard'), {
      month: '2026-09', billable: 55, building: '63.75', admin: '13.25', hobby: '0', workingDays: 22
    });
    expect(plan.outputs).toEqual({ month: '2026-09', billable: 55, building: 63.75, admin: 13.25, hobby: 0, workingDays: 22 });
    expect(plan.signals).toEqual(['go']);
  });

  /**
   * R2.5-3 — **a guardrail is a sentence, not an alarm** (R1, R4). Five hours of hobby against a
   * three-hour line says so on the Hobby tile, and in the evening once nothing more pressing is
   * owed. Nothing turns red, and the bar is simply full: R4 is *"not budgeted, not counted, not a
   * problem"*, and a line the person themselves drew is the one exception to the silence.
   */
  it('R2.5-3 — 5 h of hobby against a 3 h line is one sentence on the tile and in the evening, and nothing is red', () => {
    const projects = [...PROJECTS, { id: 'p-hobby', name: 'The Jazz Room', kind: 'hobby' }];
    const guarded = [{ ...settings[0], workingDays: [1, 2, 3, 4, 5, 6], hobbyWeekCeiling: 3, buildingWeekCeiling: 12, billableFloorPct: 0 }];
    const base = { projects, monthPlans: [], settings: guarded, weekStart: MONDAY, targetHours: 55 };
    const hobbySentence = 'Hobby is at 5 h this week against your 3 h line. Fine if it was a Saturday.';

    const over = run(ENVELOPES(), { ...base, blocks: [block('2026-09-22', 'p-hobby', 5, true)] }).outputs;
    const rows = over.rows as Array<Record<string, string>>;
    expect(rows[3].say).toBe(hobbySentence);
    expect(rows[3].fillColor).not.toBe('var(--destructive)');
    expect(over.guardConcern).toBe(hobbySentence);

    // Inside the line, the tile says R4's words and the evening has nothing to raise.
    const under = run(ENVELOPES(), { ...base, blocks: [block('2026-09-22', 'p-hobby', 2, true)] }).outputs;
    expect((under.rows as Array<Record<string, string>>)[3].say).toBe('Not budgeted, not counted, not a problem');
    expect(under.guardConcern).toBe('');

    // Building has a line of its own, and it comes second.
    const building = run(ENVELOPES(), {
      ...base,
      blocks: [block('2026-09-22', 'p-hobby', 5, true), block('2026-09-23', 'p-build', 14, true)]
    }).outputs;
    expect((building.rows as Array<Record<string, string>>)[1].say).toBe(
      'Building is at 14 h this week against your 12 h line. Worth knowing before the next one goes in.'
    );
    expect(building.guardConcern).toBe(hobbySentence);

    // R24's floor, read against the hours the week could have held SO FAR — never the whole week,
    // or a Monday morning would always be behind (R1).
    const floor = run(ENVELOPES(), {
      ...base,
      settings: [{ ...guarded[0], hobbyWeekCeiling: 0, billableFloorPct: 50 }],
      blocks: [block('2026-09-21', 'p-earn', 3, true)]
    }).outputs;
    expect(String(floor.guardConcern)).toContain('under your 50% line');
    expect(String(floor.guardConcern)).toContain('30 h this week could have held');

    // The evening: after the building move that is not done, before the dormant project.
    const shutdown = scriptOf(built, C.shutdown, 'suWork');
    const evening = {
      projects, todayKey: '2026-09-25', tomorrowKey: '2026-09-26', todayLong: 'Friday 25', tomorrowLong: 'Saturday',
      target: 55, billableUsed: 41, billableLeft: 14, perDay: 2.75, buildingLeft: 16.25, daysLeft: 5, focusHours: 6
    };
    const raised = run(shutdown, { ...evening, blocks: [], unplacedDormant: 'Founder A', guardConcern: hobbySentence });
    expect(raised.outputs.concern).toBe('One thing: ' + hobbySentence);
    const behindTheMove = run(shutdown, {
      ...evening,
      blocks: [block('2026-09-25', 'p-build', 1, false)],
      unplacedDormant: '',
      guardConcern: hobbySentence
    });
    expect(String(behindTheMove.outputs.concern)).toContain('Coaching offer');
    const noGuard = run(shutdown, { ...evening, blocks: [], unplacedDormant: 'Founder A', guardConcern: '' });
    expect(String(noGuard.outputs.concern)).toContain('Founder A');
  });

  /**
   * R2.5-4 — **every field on the sheet is a column, and nothing is shown that cannot be saved.**
   * The three lists that have to agree are the sheet's boxes, the ports `Edit settings` writes,
   * and the schema note in START-HERE — which is the only description of this database a person
   * who inherits the app will read.
   */
  /**
   * 🔴 **The first day, and the defect R2.7 found.** `Settings` was only ever *updated*: on a
   * database with no settings row — a fresh install from the shelf, the hosted app on its first
   * morning, a demo somebody has emptied — the sheet opened, took every number a person typed, and
   * wrote none of them, because the guard refuses an empty id and says nothing. Save now writes the
   * row when there is none, and the page routes on a boolean rather than on a falsy id.
   */
  it('🔴 a planner with no settings row writes one the first time Save is pressed', () => {
    const unpack = scriptOf(built, C.pageWeek, 'twSettings');
    const fresh = run(unpack, { settings: [], recBuilding: 60, recAdmin: 12, recHobby: 0 }).outputs;
    expect([fresh.id, fresh.isNew]).toEqual(['', true]);
    const existing = run(unpack, { settings: [{ id: 's-1', rate: 70 }], recBuilding: 60, recAdmin: 12, recHobby: 0 }).outputs;
    expect([existing.id, existing.isNew]).toEqual(['s-1', false]);

    // Add settings writes without an id and refuses nothing a person can type.
    const add = run(scriptOf(built, C.addSettings, 'AddsettingGuard'), {
      rate: 50, focusHours: 6, savingsTarget: 500, lowWaterMark: 0, workingDays: [1, 2, 3, 4, 5],
      buildingHours: '', adminHours: '', hobbyHours: '', hobbyWeekCeiling: 3, buildingWeekCeiling: 12,
      billableFloorPct: 50, todoUrl: ''
    });
    expect(add.signals).toEqual(['go']);
    expect(add.outputs.workingDays).toEqual([1, 2, 3, 4, 5]);
    // A blank split stays blank: it means "use the recommendation", and 0 would mean "no hours".
    expect([add.outputs.buildingHours, add.outputs.adminHours, add.outputs.hobbyHours]).toEqual(['', '', '']);

    // The two writers agree field for field, so which one runs cannot change what is stored.
    const props = (name: string, node: string) =>
      connectionsOf(built, name)
        .filter((w) => w.toId === node && w.toProperty.startsWith('prop-'))
        .map((w) => w.toProperty.slice(5))
        .sort();
    expect(props(C.addSettings, 'AddsettingWrite')).toEqual(props(C.editSettings, 'EditsettinWrite'));
    expect(nodesOf(component(built, C.addSettings)).some((n) => n.type === 'NewDbModelProperties')).toBe(true);

    // And the page presses exactly one of them, on the Condition that asks whether a row exists.
    const wires = connectionsOf(built, C.pageWeek);
    expect(wires.some((w) => w.fromId === 'twSettings' && w.fromProperty === 'out-isNew' && w.toId === 'twIsNewSettings')).toBe(true);
    for (const [signal, target] of [['ontrue', 'cmdAddSettings'], ['onfalse', 'cmdSettings']]) {
      expect(wires.some((w) => w.fromId === 'twIsNewSettings' && w.fromProperty === signal && w.toId === target && w.toProperty === 'do')).toBe(true);
    }
    // Nothing else may press either writer, or a save could take a path that skips the question.
    for (const cmd of ['cmdSettings', 'cmdAddSettings']) {
      const pressers = wires.filter((w) => w.toId === cmd && w.toProperty === 'do').map((w) => w.fromId);
      expect(pressers).toEqual(['twIsNewSettings']);
    }
    // Both ways of saving — the button and the recommendation — go through it.
    const asks = wires.filter((w) => w.toId === 'twIsNewSettings' && w.toProperty === 'eval').map((w) => `${w.fromId}.${w.fromProperty}`);
    expect(asks.sort()).toEqual(['twSheet.save', 'twUseRec.out-go']);
  });

  it('R2.5-4 — every box on the settings sheet is written by Edit settings and named in START-HERE', () => {
    const sheet = component(built, C.settingsSheet);
    const sheetWires = connectionsOf(built, C.settingsSheet);
    const boxes = nodesOf(sheet).filter((n) => n.type === 'net.noodl.controls.textinput');
    expect(boxes.length).toBe(11);

    // Every box: filled from the record, read back out of the component, and forgotten on close.
    for (const b of boxes) {
      const out = sheetWires.find((w) => w.fromId === b.id && w.fromProperty === 'onTextChanged');
      expect(out?.toId).toBe('stOut');
      expect(sheetWires.some((w) => w.toId === b.id && w.toProperty === 'startValue' && w.fromId === 'stIn')).toBe(true);
      expect(sheetWires.some((w) => w.toId === b.id && w.toProperty === 'clear' && w.fromProperty === 'out-closed')).toBe(true);
    }
    const fields = boxes.map((b) => sheetWires.find((w) => w.fromId === b.id && w.fromProperty === 'onTextChanged')!.toProperty);

    // The seven ticks, read back as one array.
    const ticks = nodesOf(sheet).filter((n) => n.type === 'net.noodl.controls.checkbox');
    expect(ticks.length).toBe(7);
    for (const t of ticks) {
      expect(sheetWires.some((w) => w.fromId === t.id && w.fromProperty === 'checked' && w.toId === 'stDays')).toBe(true);
      expect(sheetWires.some((w) => w.toId === t.id && w.toProperty === 'check')).toBe(true);
      expect(sheetWires.some((w) => w.toId === t.id && w.toProperty === 'uncheck')).toBe(true);
    }
    expect(sheetWires.some((w) => w.fromId === 'stDays' && w.fromProperty === 'out-workingDays' && w.toId === 'stOut')).toBe(true);

    // Every one of them reaches the one command that writes Settings, and is a prop it writes.
    const pageWires = connectionsOf(built, C.pageWeek);
    // A record write takes its fields as wires, not as parameters: `prop-<field>` into the node.
    const props = connectionsOf(built, C.editSettings)
      .filter((w) => w.toId === 'EditsettinWrite' && w.toProperty.startsWith('prop-'))
      .map((w) => w.toProperty.slice(5));
    for (const field of [...fields, 'workingDays']) {
      expect(props).toContain(field);
      expect(pageWires.some((w) => w.fromId === 'twSheet' && w.fromProperty === field && w.toId === 'cmdSettings')).toBe(true);
    }
    expect(props.sort()).toEqual([...fields, 'workingDays'].sort());

    // And the note a person inherits the database with names every column.
    const note = fs.readFileSync(path.join(ARTEFACT, 'docs', 'START-HERE.md'), 'utf8');
    const row = note.split('\n').find((l) => l.startsWith('| `Settings` |')) ?? '';
    for (const field of [...fields, 'workingDays']) expect(row).toContain(`\`${field}\``);
  });
});

// ── §6 ─────────────────────────────────────────────────────────────────────

/**
 * TPL-010-M — the money, run with the clock held at Fri 25 Sep 2026 (§7's acceptance table). The
 * fixture is §5.9's seed with the dates written out; every figure asserted is one the spec or the
 * approved mockup states.
 */
describe('§6 the money, run rather than read (TPL-010-M)', () => {
  beforeAll(() => {
    jest.useFakeTimers({ doNotFake: ['performance'] }).setSystemTime(new Date(2026, 8, 25, 9, 0, 0));
  });
  afterAll(() => jest.useRealTimers());

  const MPROJECTS = [
    { id: 'bramble', name: 'Bramble & Co', kind: 'earning', billing: 'fixed', termsDays: 7, agreedHours: 14, rate: 80, move: 'Offer the add-on' },
    { id: 'northline', name: 'Northline Languages', kind: 'earning', billing: 'fixed', termsDays: 14 },
    { id: 'salon', name: 'Salon Collective', kind: 'earning', billing: 'hourly', rate: 18, termsDays: 7 },
    { id: 'coaching', name: 'Coaching offer', kind: 'building', move: 'Send the email to the 500-person list' },
    { id: 'jazz', name: 'The Jazz Room', kind: 'hobby', move: 'Ask if the fundraiser is happening' }
  ];
  const ITEMS = [
    { id: 'partner', label: 'Partner’s contract', amount: 1500, repeat: 'monthly', date: '2026-07-28', likelihood: 100 },
    { id: 'house', label: 'Household costs', amount: -4500, repeat: 'monthly', date: '2026-08-01', likelihood: 100 },
    { id: 'tax', label: 'Income tax', amount: -2400, repeat: 'yearly', date: '2026-11-30', likelihood: 100 },
    { id: 'cowork', label: 'Co-working day', amount: -25, repeat: 'weekly', date: '2026-09-05', likelihood: 100 },
    { id: 'bramble', label: 'Bramble & Co', amount: 1120, repeat: 'monthly', date: '2026-08-07', until: '2027-04-07', projectId: 'bramble', billLeadDays: 7, likelihood: 100 },
    { id: 'salon1', label: 'Salon Collective · August', amount: 640, repeat: 'once', date: '2026-09-16', projectId: 'salon', billDate: '2026-09-09', likelihood: 100 },
    { id: 'salon2', label: 'Salon Collective · September', amount: 0, fromHours: true, repeat: 'once', date: '2026-10-07', projectId: 'salon', billDate: '2026-09-30', likelihood: 100 },
    { id: 'north1', label: 'Northline · AI workshop', amount: 1120, repeat: 'once', date: '2026-10-08', projectId: 'northline', billDate: '2026-09-24', likelihood: 100 },
    { id: 'coach', label: 'Coaching, three clients', amount: 1800, repeat: 'monthly', date: '2026-10-29', projectId: 'coaching', likelihood: 40 },
    { id: 'jazz', label: 'The Jazz Room retainer', amount: 2000, repeat: 'monthly', date: '2026-12-01', projectId: 'jazz', likelihood: 30 }
  ];
  const pay = (itemId: string, occurs: string, extra: Record<string, unknown>) => ({ id: `m-${itemId}-${occurs}`, itemId, occurs, ...extra });
  const paidOn = (itemId: string, occurs: string, amount: number, day = occurs) => pay(itemId, occurs, { payments: [{ day, amount }] });
  const MARKS = [
    paidOn('partner', '2026-07-28', 1500), paidOn('partner', '2026-08-28', 1500), pay('partner', '2026-10-28', { amount: 1380 }),
    paidOn('house', '2026-08-01', -4500), paidOn('house', '2026-09-01', -4500),
    paidOn('cowork', '2026-09-05', -25), paidOn('cowork', '2026-09-12', -25), paidOn('cowork', '2026-09-19', -25),
    pay('bramble', '2026-08-07', { sentOn: '2026-07-31', payments: [{ day: '2026-08-12', amount: 1120 }] }),
    pay('bramble', '2026-09-07', { sentOn: '2026-08-31', payments: [{ day: '2026-09-05', amount: 1120 }] }),
    pay('salon1', '2026-09-16', { sentOn: '2026-09-09' })
  ];
  const BLOCKS = [
    { id: 's1', projectId: 'salon', date: '2026-09-12', planned: 18, done: true, actual: '' },
    { id: 's2', projectId: 'salon', date: '2026-09-21', planned: 1, done: true, actual: '' },
    { id: 's3', projectId: 'salon', date: '2026-09-22', planned: 1.5, done: true, actual: '' },
    { id: 's4', projectId: 'salon', date: '2026-09-23', planned: 1.5, done: true, actual: '' },
    { id: 's5', projectId: 'salon', date: '2026-09-28', planned: 2, done: false, actual: '' },
    { id: 'b1', projectId: 'bramble', date: '2026-09-12', planned: 5, done: true, actual: '' },
    { id: 'b2', projectId: 'bramble', date: '2026-09-21', planned: 2, done: true, actual: 2.5 },
    { id: 'b3', projectId: 'bramble', date: '2026-09-22', planned: 2, done: true, actual: '' },
    { id: 'b4', projectId: 'bramble', date: '2026-09-23', planned: 2, done: true, actual: '' }
  ];
  const SETTINGS = [{ id: 's', rate: 50, focusHours: 6, savingsTarget: 500, lowWaterMark: 0 }];
  const READINGS = [{ id: 'r1', date: '2026-09-21', amount: 3200 }];
  const DATA = { items: ITEMS, marks: MARKS, readings: READINGS, projects: MPROJECTS, blocks: BLOCKS, settings: SETTINGS, since: '2025-08-01' };

  const MONEY = () => scriptOf(built, C.money, 'moWork');
  const PANE = () => scriptOf(built, C.moneyView, 'mvpWork');
  const MARK = () => scriptOf(built, C.mark, 'mkWork');
  const money = (over: Record<string, unknown> = {}) => run(MONEY(), { ...DATA, filter: 'up', horizon: 0, sel: '', ...over }).outputs;
  const pane = (over: Record<string, unknown> = {}) => run(PANE(), { ...DATA, open: true, sel: '', mode: '', itemId: '', cardProject: '', ...over }).outputs;
  const rows = (out: Record<string, unknown>): Array<Record<string, string>> =>
    (out.groups as Array<{ name: string; rows: Array<Record<string, string>> }>).flatMap((g) => g.rows.map((r) => ({ ...r, group: g.name })));
  /** Apply what Logic/Mark wrote to the fixture's marks, the way the backend would. */
  const applyMark = (marks: Array<Record<string, unknown>>, out: Record<string, unknown>) => {
    const fields = ['itemId', 'occurs', 'amount', 'date', 'skip', 'payments', 'doneOn', 'doneAmount', 'lostOn', 'sentOn', 'note'];
    const next = Object.fromEntries(fields.map((f) => [f, out[f]]));
    const at = marks.findIndex((m) => m.itemId === out.itemId && m.occurs === out.occurs);
    return at < 0 ? [...marks, { id: 'new', ...next }] : marks.map((m, i) => (i === at ? { ...m, ...next } : m));
  };
  const markRun = (inputs: Record<string, unknown>) => run(MARK(), { ...DATA, ...inputs });
  // eslint-disable-next-line no-new-func
  const fns = (expr: string) => new Function(`${PLANNER_FNS}${MONEY_FNS}\nreturn ${expr};`)();

  it('M-2 — break-even €3,308.33, target €3,808.33, 46 billable hours; a €3,600 tax makes it €3,408.33, €3,908.33 and 48', () => {
    const out = money();
    expect(out.targetHours).toBe(46);
    expect(out.targetLine).toContain('Break-even €3,308.33');
    expect(out.targetLine).toContain('€3,808.33');
    const lines = pane().sumLines as Array<{ label: string; value: string }>;
    expect(lines.find((l) => l.label === 'Billable this month')?.value).toBe('46 h');
    const taxed = money({ items: ITEMS.map((i) => (i.id === 'tax' ? { ...i, amount: -3600 } : i)) });
    expect(taxed.targetHours).toBe(48);
    expect(taxed.targetLine).toContain('Break-even €3,408.33');
    expect(taxed.targetLine).toContain('€3,908.33');
  });

  it('M-3 — the schedules land where §5.3 says: the 31st, the last day, quarterly, weekly, until', () => {
    expect(fns("repeatsOf({ date: '2026-08-31', repeat: 'monthly' }, '2027-02-28')")).toEqual(['2026-08-31', '2026-09-30', '2026-10-31', '2026-11-30', '2026-12-31', '2027-01-31', '2027-02-28']);
    expect(fns("repeatsOf({ date: '2026-01-10', repeat: 'monthly', monthEnd: true }, '2026-04-30')")).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
    expect(fns("repeatsOf({ date: '2026-01-15', repeat: 'quarterly' }, '2026-12-31')")).toEqual(['2026-01-15', '2026-04-15', '2026-07-15', '2026-10-15']);
    expect(fns("repeatsOf({ date: '2026-09-26', repeat: 'weekly' }, '2026-11-06')").length).toBe(6);
    expect(fns("repeatsOf({ date: '2028-02-29', repeat: 'yearly' }, '2030-12-31')")).toEqual(['2028-02-29', '2029-02-28', '2030-02-28']);
    expect(fns("repeatsOf({ date: '2026-09-05', repeat: 'weekly', until: '2026-09-19' }, '2026-12-31')")).toEqual(['2026-09-05', '2026-09-12', '2026-09-19']);
  });

  it('M-4 — October’s €1,380 reads “usually €1,500”; the item going to €1,600 moves September and November and leaves October', () => {
    const oct = pane({ sel: 'partner|2026-10-28|pay' });
    expect(oct.rpAmountText).toBe('+€1,380  · usually €1,500');
    const raised = ITEMS.map((i) => (i.id === 'partner' ? { ...i, amount: 1600 } : i));
    const amounts = rows(money({ items: raised })).filter((r) => r.key.startsWith('partner|')).map((r) => `${r.key} ${r.amountText}`);
    expect(amounts).toEqual(['partner|2026-09-28 +€1,600', 'partner|2026-10-28 +€1,380', 'partner|2026-11-28 +€1,600', 'partner|2026-12-28 +€1,600']);
  });

  it('M-5 — End it keeps what was ticked and shows nothing after the day picked; nothing is deleted', () => {
    const end = pane({ mode: 'end', itemId: 'cowork' });
    expect(end.endShown).toBe(true);
    expect(end.endAt).toBe('2026-09-19');
    expect(end.endText).toContain('The 3 ticked repeats stay in Past');
    const ended = ITEMS.map((i) => (i.id === 'cowork' ? { ...i, until: '2026-09-19' } : i));
    expect(rows(money({ items: ended })).filter((r) => r.key.startsWith('cowork|'))).toEqual([]);
    expect(rows(money({ items: ended, filter: 'past' })).filter((r) => r.key.startsWith('cowork|')).length).toBe(3);
    const guard = scriptOf(built, C.endMoneyItem, 'EndmoneyitGuard');
    expect(run(guard, { itemId: 'cowork', until: '2026-09-19' }).outputs).toEqual({ until: '2026-09-19' });
  });

  it('M-6 — the unticked Salon bill is late: first in Upcoming, first box, the evening’s concern; ticked, it is Past, 9 days late', () => {
    const out = money();
    const first = rows(out)[0];
    expect([first.group, first.key, first.amountText]).toEqual(['Late', 'salon1|2026-09-16', '+€640']);
    expect(first.sub).toContain('due 9 days ago');
    const box = (out.stripRows as Array<Record<string, string>>)[0];
    expect([box.key, box.when]).toEqual(['salon1|2026-09-16', 'Due Wed 16 · late']);
    expect(out.lateConcern).toBe('One thing: Salon Collective’s €640 was due on Wed 16 Sep and is not ticked. Chase it, or tick it.');
    expect([out.lateCount, out.hasLate]).toEqual(['1', true]);

    const tick = markRun({ key: 'salon1|2026-09-16|pay', action: 'tick', tickOn: '2026-09-25', tickAmount: '640', tickRest: 'owed' });
    expect(tick.signals).toEqual(['edit']);
    expect(tick.outputs.payments).toEqual([{ day: '2026-09-25', amount: 640 }]);
    const marks = applyMark(MARKS as Array<Record<string, unknown>>, tick.outputs);
    expect(rows(money({ marks })).some((r) => r.key === 'salon1|2026-09-16')).toBe(false);
    const past = rows(money({ marks, filter: 'past' })).find((r) => r.key === 'salon1|2026-09-16' && r.kind === 'pay');
    expect(past?.sub).toContain('paid Fri 25 · 9 days late');
    // TPL-010-B B7 — with no late money left, the bill that should have gone out yesterday is the concern, and opens its goes-out line.
    const after = money({ marks });
    expect(after.lateConcern).toBe('One thing: Northline Languages’s bill (€1,120) was to go out Thu 24 Sep and isn’t marked sent. Send it and mark it sent, or change its day.');
    expect(after.lateKey).toBe('north1|2026-10-08|bill');
    const sent = applyMark(marks, markRun({ key: 'north1|2026-10-08|bill', action: 'sent', sentOn: '2026-09-25' }).outputs);
    expect(money({ marks: sent }).lateConcern).toBe('');
  });

  it('M-7 — + Add a bill pre-fills the project and a due date its payment terms after the bill; the terms changing changes no bill', () => {
    const bill = pane({ mode: 'newBill', itemId: 'bramble' });
    expect([bill.edShown, bill.edProjectId, bill.edBillDate, bill.edDate, bill.edRepeat]).toEqual([true, 'bramble', '2026-09-25', '2026-10-02', 'once']);
    // The editor's own Function re-fills the due date when the bill date or project changes.
    const shape = scriptOf(built, C.moneyEditor, 'edShape');
    const self = {};
    const signals: string[] = [];
    const outs: Record<string, unknown> = {};
    const proxy = new Proxy(outs, { get: (t, k: string) => (k in t ? t[k] : () => signals.push(k)) });
    const terms = [{ id: 'bramble', name: 'Bramble & Co', billing: 'fixed', terms: 14 }];
    // eslint-disable-next-line no-new-func
    const fn = new Function('Inputs', 'Outputs', shape);
    fn.call(self, { repeat: 'once', projectId: 'bramble', dir: 'in', projectTerms: terms, billDate: '2026-09-25' }, proxy);
    expect(outs.due).toBeUndefined();
    fn.call(self, { repeat: 'once', projectId: 'bramble', dir: 'in', projectTerms: terms, billDate: '2026-09-30' }, proxy);
    expect(outs.due).toBe('2026-10-14');
    expect(outs.dueHint).toBe('Due 14 days after the bill: Bramble & Co’s payment terms.');
  });

  it('M-8 — hoped money is dashed and in no balance; the week reads “Might earn €1,320 more, weighted (€3,800 if all come through)”', () => {
    const out = money();
    expect(out.mightLead).toBe('€1,320 more, weighted (€3,800 if all come through):');
    expect((out.mightRows as Array<Record<string, string>>).map((r) => `${r.projectId} ${r.odds}`)).toEqual(['coaching 40%', 'jazz 30%']);
    const hoped = rows(out).find((r) => r.key === 'coach|2026-10-29') as Record<string, string>;
    expect([hoped.rowEdgeStyle, hoped.afterText]).toEqual(['dashed', '≈ €720 weighted']);
  });

  it('M-9 — Record balance lists exactly what is unticked and due; €2,900 with Salon not yet starts at €2,900 with its €640 counted today', () => {
    const bal = pane({ mode: 'balance' });
    expect((bal.balRows as Array<Record<string, string>>).map((r) => r.key)).toEqual(['salon1|2026-09-16']);
    const guard = scriptOf(built, C.recordBalance, 'RecordbalaGuard');
    const rec = run(guard, { date: '2026-09-25', amount: '2900' });
    expect(rec.outputs).toEqual({ date: '2026-09-25', amount: 2900, note: '' });
    const out = money({ readings: [...READINGS, { id: 'r2', date: '2026-09-25', amount: 2900 }] });
    const late = rows(out)[0];
    expect([late.key, late.afterText]).toEqual(['salon1|2026-09-16', '€3,540']);
    expect(out.stripBalance).toBe('Balance €2,900 · read Fri 25 Sep');
  });

  it('M-10 — the three lines, and red only under the low-water mark', () => {
    const out = money();
    expect(out.monthText).toBe('Break-even €3,308 · target €3,808. Billed €640 so far, €3,276 with the bills still to go out this month · €532 to target, about 11 h.');
    expect(out.lowText).toBe('Lowest in six weeks: €206 on Sun 1 Nov.');
    expect(out.lowColor).toBe('var(--foreground)');
    // Household costs on Thu 1 Oct leave €815: under a €1,000 line, that box is outlined red and nothing else is.
    const tight = money({ settings: [{ ...SETTINGS[0], lowWaterMark: 1000 }] });
    expect(tight.lowColor).toBe('var(--destructive)');
    expect(tight.lowText).toBe('Lowest in six weeks: €206 on Sun 1 Nov, under your €1,000 line.');
    expect((tight.stripRows as Array<Record<string, string>>).filter((r) => r.edge === 'var(--destructive)').map((r) => r.key)).toEqual(['house|2026-10-01']);
  });

  it('M-11 / M-17 — Bramble’s card: fixed, the next bill, this period’s hours and €/h, and the past with days early or late', () => {
    const card = pane({ cardProject: 'bramble' });
    expect(card.billingTerms).toBe('Fixed price · payment terms 7 days · agreed 14 h a month');
    const lines = Object.fromEntries((card.billingRows as Array<{ key: string; text: string }>).map((r) => [r.key, r.text]));
    expect(lines.Next).toBe('goes out Wed 30 Sep · €1,120 · due Wed 7 Oct');
    expect(lines['This period']).toBe('11.5 h logged of 14 agreed · the bill is €1,120 whatever the hours · €97 an hour so far');
    expect(lines.Past).toBe('Sep €1,120, due Mon 7, paid Sat 5, 2 days early\nAug €1,120, due Fri 7, paid Wed 12, 5 days late');
    const salon = pane({ cardProject: 'salon' });
    expect((salon.billingRows as Array<{ key: string; text: string }>).find((r) => r.key === 'This period')?.text).toBe(
      '22 h × €18 = €396 · with what’s planned 24 h, €432 · the next bill fills from these'
    );
  });

  it('M-15 — €400 of €640 with the rest still owed stays late for €240; €240 more closes it; lost takes a repeat out of every balance', () => {
    const part = markRun({ key: 'salon1|2026-09-16|pay', action: 'tick', tickOn: '2026-09-25', tickAmount: '400', tickRest: 'owed' });
    let marks = applyMark(MARKS as Array<Record<string, unknown>>, part.outputs);
    expect(part.outputs.amount).toBe(640);
    const open = rows(money({ marks }))[0];
    expect([open.key, open.amountText]).toEqual(['salon1|2026-09-16', '+€240']);
    expect(open.sub).toContain('€400 of €640 paid');
    const rest = run(MARK(), { ...DATA, marks, key: 'salon1|2026-09-16|pay', action: 'tick', tickOn: '2026-09-26', tickAmount: '240', tickRest: 'owed' });
    marks = applyMark(marks, rest.outputs);
    expect(rest.outputs.doneAmount).toBe(640);
    expect(rows(money({ marks })).some((r) => r.key === 'salon1|2026-09-16')).toBe(false);

    const lost = markRun({ key: 'bramble|2026-10-07|pay', action: 'lost' });
    expect(lost.signals).toEqual(['add']);
    const withLost = applyMark(MARKS as Array<Record<string, unknown>>, lost.outputs);
    expect(rows(money({ marks: withLost })).some((r) => r.key === 'bramble|2026-10-07')).toBe(false);
    expect(rows(money({ marks: withLost, filter: 'past' })).find((r) => r.key === 'bramble|2026-10-07')?.sub).toContain('€1,120 lost');

    // Short, and the rest is lost: the repeat closes with what came in.
    const short = markRun({ key: 'salon1|2026-09-16|pay', action: 'tick', tickOn: '2026-09-25', tickAmount: '400', tickRest: 'lost' });
    expect([short.outputs.lostOn, short.outputs.doneAmount]).toEqual(['2026-09-25', 400]);
  });

  it('M-16 — fixed bills are counted first: Bramble hourly makes it 54 h; hours on a fixed project move no €; hours on Salon move its bill', () => {
    const hourly = MPROJECTS.map((p) => (p.id === 'bramble' ? { ...p, billing: 'hourly' } : p));
    expect(money({ projects: hourly }).targetHours).toBe(54);
    const more = (projectId: string) => [...BLOCKS, { id: 'x', projectId, date: '2026-09-24', planned: 2, done: true, actual: '' }];
    const base = money();
    const bramble = money({ blocks: more('bramble') });
    expect([bramble.targetHours, bramble.monthText]).toEqual([base.targetHours, base.monthText]);
    const salonRow = (out: Record<string, unknown>) => rows(out).find((r) => r.key === 'salon2|2026-10-07' && r.kind === 'pay')?.amountText;
    expect([salonRow(base), salonRow(money({ blocks: more('salon') }))]).toEqual(['+€396', '+€432']);
    // Marked sent, the bill keeps its amount whatever is logged after.
    const sent = markRun({ key: 'salon2|2026-10-07|bill', action: 'sent', sentOn: '2026-09-30', sentAmount: '396' });
    expect([sent.outputs.sentOn, sent.outputs.amount]).toEqual(['2026-09-30', 396]);
    const marks = applyMark(MARKS as Array<Record<string, unknown>>, sent.outputs);
    expect(salonRow(money({ marks, blocks: more('salon') }))).toBe('+€396');
  });

  it('the money item and mark guards: M9’s three fields, the sign from in or out, and nothing half-written', () => {
    const add = scriptOf(built, C.addMoneyItem, 'AddmoneyitGuard');
    const ok = { label: ' Accountant ', dir: 'out', amount: '300', repeat: 'quarterly', date: '2026-10-05', until: '', monthEnd: true, projectId: 'none', billDate: '', billLeadDays: '', fromHours: false, likelihood: '', note: '' };
    const good = run(add, ok);
    expect(good.signals).toEqual(['go']);
    expect(good.outputs).toMatchObject({ label: 'Accountant', amount: -300, repeat: 'quarterly', projectId: '', monthEnd: true, likelihood: 100, billDate: '', billLeadDays: '' });
    for (const bad of [{ label: '  ' }, { date: 'Tuesday' }, { amount: '0' }, { amount: 'lots' }]) expect(run(add, { ...ok, ...bad }).signals).toEqual([]);
    // An hourly client's bill may leave its amount to the hours; nobody else's may.
    const hours = run(add, { ...ok, dir: 'in', amount: '', repeat: 'once', projectId: 'salon', billDate: '2026-09-30', fromHours: true });
    expect(hours.outputs).toMatchObject({ amount: 0, fromHours: true, billDate: '2026-09-30' });
    expect(run(add, { ...ok, amount: '', fromHours: true }).signals).toEqual([]);
    const mark = scriptOf(built, C.editMark, 'EditmarkGuard');
    expect(run(mark, { markId: '', itemId: 'x', occurs: '2026-09-16' }).signals).toEqual([]);
    expect(run(mark, { markId: 'm1', itemId: 'x', occurs: 'soon' }).signals).toEqual([]);
    expect(run(mark, { markId: 'm1', itemId: 'x', occurs: '2026-09-16', payments: [{ day: '2026-09-25', amount: 640 }] }).outputs.payments).toEqual([{ day: '2026-09-25', amount: 640 }]);
  });

  it('M15 — late client money is the drawer’s first concern, before the building move', () => {
    const shutdown = scriptOf(built, C.shutdown, 'suWork');
    const base = {
      projects: PROJECTS, blocks: [], todayKey: '2026-09-25', tomorrowKey: '2026-09-26', todayLong: 'Friday 25', tomorrowLong: 'Saturday',
      target: 46, billableUsed: 40, billableLeft: 6, perDay: 1.25, buildingLeft: 20, daysLeft: 5, focusHours: 6, unplacedDormant: 'Founder A'
    };
    const late = run(shutdown, { ...base, lateConcern: 'One thing: Salon Collective’s €640 was due on Wed 16 Sep and is not ticked. Chase it, or tick it.' }).outputs;
    expect([late.concern, late.chaseShown]).toEqual(['One thing: Salon Collective’s €640 was due on Wed 16 Sep and is not ticked. Chase it, or tick it.', true]);
    const none = run(shutdown, { ...base, lateConcern: '' }).outputs;
    expect([none.chaseShown, String(none.concern)]).toEqual([false, expect.stringContaining('Founder A')]);
  });

  it('🔴 every press that changes a repeat reaches Logic/Mark with its action, and every Logic/Mark reaches both mark commands', () => {
    const wires = connectionsOf(built, C.pageWeek);
    for (const mk of ['twMarkPane', 'twMarkBal']) {
      expect(wires.filter((w) => w.fromId === mk && (w.fromProperty === 'add' || w.fromProperty === 'edit')).map((w) => `${w.fromProperty}>${w.toId}.${w.toProperty}`).sort()).toEqual([
        'add>cmdAddMark.do', 'edit>cmdEditMark.do'
      ]);
    }
    const actions = wires.filter((w) => w.toProperty === 'action').map((w) => `${w.fromId}>${w.toId}`);
    expect(actions.length).toBe(10);
    expect(wires.filter((w) => w.toId === 'twMarkPane' && w.toProperty === 'go').length).toBe(8);
    expect(wires.filter((w) => w.toId === 'twMarkBal' && w.toProperty === 'go').length).toBe(2);
  });

  /**
   * TPL-010-B B5 / B6 — the card says what to do with a bill. Northline's workshop bill has never
   * been sent (the invoice words appear, once per project); Bramble has sent bills before (only
   * the button); Salon's next is sent and late (the payment); a project with no bills says what
   * adding one does.
   */
  it('B-6 — the card’s next-bill button: Mark it until sent, then Tick it, opening that line in Money; the invoice words come once per project', () => {
    const lines = (out: Record<string, unknown>) => Object.fromEntries((out.billingRows as Array<{ key: string; text: string }>).map((r) => [r.key, r.text]));
    const north = pane({ cardProject: 'northline' });
    expect([north.nextBillShown, north.nextBillLabel, north.nextBillSel]).toEqual([true, 'Sent the invoice? Mark it', 'north1|2026-10-08|bill']);
    expect(lines(north)['When it’s done']).toBe('Planning doesn’t make the invoice. Send yours as usual, then mark the bill sent. Tick the payment when the money arrives.');
    expect([north.cardHasBills, north.cardBillsLine]).toEqual([true, 'one bill, €1,120, goes out Thu 24 Sep, due Thu 8 Oct']);
    const bramble = pane({ cardProject: 'bramble' });
    expect([bramble.nextBillLabel, bramble.nextBillSel]).toEqual(['Sent the invoice? Mark it', 'bramble|2026-10-07|bill']);
    expect(lines(bramble)['When it’s done']).toBeUndefined();
    const salon = pane({ cardProject: 'salon' });
    expect([salon.nextBillLabel, salon.nextBillSel]).toEqual(['Been paid? Tick it', 'salon1|2026-09-16|pay']);
    // The line it opens is the one with Mark as sent, and it says who makes the invoice (B6).
    const opened = pane({ sel: 'north1|2026-10-08|bill' });
    expect([opened.rpSendShown, opened.rpBillText]).toEqual([
      true,
      'Goes out Thu 24 Sep. Planning doesn’t make the invoice: send yours as usual, then mark it sent here. The payment is its own tick, due Thu 8 Oct.'
    ]);
    const fresh = pane({ cardProject: 'lx', projects: [...MPROJECTS, { id: 'lx', name: 'LX campus', kind: 'earning', billing: 'fixed', termsDays: 14 }] });
    expect([lines(fresh).Bills, fresh.nextBillShown, fresh.cardHasBills]).toEqual(['None yet. Add the bill, so the month counts its money.', false, false]);
    const wires = connectionsOf(built, C.pageWeek);
    const into = (to: string, port: string) => wires.filter((w) => w.toId === to && w.toProperty === port).map((w) => `${w.fromId}.${w.fromProperty}`);
    expect(into('twSelFromCard', 'value')).toEqual(['twMoneyView.nextBillSel']);
    for (const to of ['twSelFromCard', 'twPaneNone', 'twMoneyOn', 'twClearCard', 'twEditOff']) expect(into(to, 'do')).toContain('twCard.openBill');
    expect(into('twEditRow', 'in-hasBills')).toEqual(['twMoneyView.cardHasBills']);
  });
});

// ── §5 ─────────────────────────────────────────────────────────────────────

describe('§5 the demo is the template with the backend taken out', () => {

  /**
   * R2.7 — **the way out of the invented week.** Richard asked for a button that clears the dummy
   * data so the demo can be used for real. Two presses, because the only way back is somebody
   * else's invented month; and the emptied store keeps every collection as a key, or the reader
   * would decide the store was broken and seed the example back on the next read.
   */
  it('🔴 R2.7 — Empty it arms on the first press and clears on the second, and the emptied store keeps its shape', () => {
    const page = component(demo, C.pageWeek);
    const nodes = nodesOf(page);
    const button = nodes.find((n) => n.id === 'twDemoEmptyBtn');
    expect((button?.parameters as { label?: string })?.label).toBe(DEMO_EMPTY_LABEL);
    const row = nodes.find((n) => n.id === 'twDemoNoticeRow');
    expect((row?.children ?? []).map((c) => c.id)).toEqual(['twDemoNotice', 'twDemoEmptyBtn']);
    const wires = connectionsOf(demo, C.pageWeek);
    for (const [from, fromProp, to, toProp] of [
      ['twDemoEmptyBtn', 'onClick', 'twDemoEmpty', 'run'],
      ['twDemoEmpty', 'out-label', 'twDemoEmptyBtn', 'label'],
      ['twDemoEmpty', 'out-done', 'twData', 'refresh']
    ]) {
      expect(wires.some((w) => w.fromId === from && w.fromProperty === fromProp && w.toId === to && w.toProperty === toProp)).toBe(true);
    }
    // The template has no such button: its database is somebody's income, and nothing there deletes.
    expect(nodesOf(component(built, C.pageWeek)).some((n) => n.id === 'twDemoEmptyBtn')).toBe(false);

    // Run the script the artefact ships, twice, with one `this` — the arming lives in that scope.
    const script = scriptOf(demo, C.pageWeek, 'twDemoEmpty');
    const store: Record<string, string> = { [DEMO_STORAGE_KEY]: JSON.stringify({ Project: [{ id: 'p' }] }) };
    const win = {
      localStorage: {
        getItem: (k: string) => (k in store ? store[k] : null),
        setItem: (k: string, v: string) => {
          store[k] = v;
        },
        removeItem: (k: string) => {
          delete store[k];
        }
      }
    };
    const scope = {};
    const press = () => {
      const signals: string[] = [];
      const outputs = new Proxy({} as Record<string, unknown>, {
        get(target, key: string) {
          if (key in target) return target[key];
          return () => signals.push(key);
        }
      });
      // eslint-disable-next-line no-new-func
      new Function('Inputs', 'Outputs', 'window', script).call(scope, {}, outputs, win);
      return { outputs: { ...outputs }, signals };
    };

    const first = press();
    expect(first.outputs.label).toBe(DEMO_EMPTY_ARMED);
    expect(first.signals).toEqual([]);
    expect(JSON.parse(store[DEMO_STORAGE_KEY]).Project).toHaveLength(1);

    const second = press();
    expect(second.outputs.label).toBe(DEMO_EMPTY_LABEL);
    expect(second.signals).toEqual(['done']);
    const emptied = JSON.parse(store[DEMO_STORAGE_KEY]);
    expect(Object.keys(emptied).sort()).toEqual([...COLLECTIONS, ...BORROWED].sort());
    for (const name of [...COLLECTIONS, ...BORROWED]) expect(emptied[name]).toEqual([]);

    // 🔴 An emptied store must not read as a broken one: the reader seeds the example week back
    // when a collection is MISSING, and every one of them is here, holding nothing.
    expect(DEMO_READ_SCRIPT).toContain('if (!store || !store.Project) whole = false;');
    // A third press arms again rather than clearing twice in a row.
    expect(press().outputs.label).toBe(DEMO_EMPTY_ARMED);
  });
  it('holds no backend node of any kind, and no sign-in page', () => {
    const backend = allNodes(demo).filter((n) => (BACKEND_NODE_TYPES as readonly string[]).includes(n.node.type));
    expect(backend.map((n) => `${n.component} ${n.node.type}`)).toEqual([]);
    expect(componentsOf(demo).map((c) => c.name)).not.toContain(C.pageSignIn);
  });

  it('changes exactly the components it says it changes — every other one is the template’s, untouched', () => {
    expect([...DEMO_CHANGED].sort()).toEqual([
      C.plannerData,
      C.appBar,
      C.pageWeek,
      ...TPL010_COMPONENTS.filter((c) => c.path.startsWith('Commands/')).map((c) => `/${c.path}`)
    ].sort());
  });

  it('every command still writes — to this browser, from a node with the same id', () => {
    for (const c of TPL010_COMPONENTS.filter((x) => x.path.startsWith('Commands/'))) {
      const shipped = TPL010_DEMO_COMPONENTS.find((x) => x.path === c.path);
      const writeIds = (c.nodes as Array<Record<string, string>>)
        .filter((n) => ['NewDbModelProperties', 'SetDbModelProperties', 'DeleteDbModelProperties'].includes(n.type))
        .map((n) => n.id);
      // One write per command, and TPL-010-T T3's history line after it on every block and project command.
      // Add block also tells the todo list (T2); Send to todo writes the task, its line, then the project's
      // (L4, T3); Tell todo ticks the action and writes the task's line (T1b, T2).
      const WRITES: Record<string, number> = {
        'Commands/Add block': 3,
        'Commands/Send to todo': 3,
        'Commands/Tell todo': 2,
        // TPL-010-B — the project, its bill when it was given one, and the history line.
        'Commands/Add project': 3,
        'Commands/Edit project': 3,
        ...Object.fromEntries(
          ['Save block', 'Add time', 'Carry block', 'Drop block', 'Place move', 'Move block'].map((n) => [`Commands/${n}`, 2])
        )
      };
      expect(`${c.path} ${writeIds.length}`).toBe(`${c.path} ${WRITES[c.path] ?? 1}`);
      for (const id of writeIds) {
        const twin = (shipped?.nodes as Array<Record<string, string>>).find((n) => n.id === id);
        expect(`${c.path} ${twin?.type}`).toBe(`${c.path} JavaScriptFunction`);
      }
    }
  });

  it('the app bar offers Reset demo where the app signs out', () => {
    const bar = TPL010_DEMO_COMPONENTS.find((c) => `/${c.path}` === C.appBar);
    expect(bar?.outputs?.map((p) => p.name)).toContain('reset');
    expect(bar?.outputs?.map((p) => p.name)).not.toContain('signOut');
  });

  /** The read is run here the way the browser runs it: seed, then read back through the window. */
  it('seeds an invented week on the first read, and answers the window it is asked for', () => {
    const store: Record<string, string> = {};
    const win = {
      localStorage: {
        getItem: (k: string) => (k in store ? store[k] : null),
        setItem: (k: string, v: string) => {
          store[k] = v;
        },
        removeItem: (k: string) => {
          delete store[k];
        }
      }
    } as unknown as Window;
    // eslint-disable-next-line no-new-func
    const read = new Function('Inputs', 'Outputs', 'window', DEMO_READ_SCRIPT);
    const signals: string[] = [];
    const outputs = new Proxy({} as Record<string, unknown>, {
      get: (t, k: string) => (k in t ? t[k] : () => signals.push(k))
    });
    read.call({}, { from: '2026-09-01', to: '2026-09-30', month: '2026-09', moveSince: '2026-08-01', marksSince: '2025-08-01', openStatus: 'open' }, outputs, win);

    expect(signals).toContain('loaded');
    expect(store[DEMO_STORAGE_KEY]).toBeTruthy();
    const seeded = JSON.parse(store[DEMO_STORAGE_KEY]) as Record<string, unknown[]>;
    expect(Object.keys(seeded).sort()).toEqual([...COLLECTIONS, ...BORROWED].sort());
    // TPL-010-L — the two example tasks come back through the same read, open ones only.
    expect((outputs as Record<string, unknown[]>).tasks.length).toBe(2);
    expect((outputs as Record<string, unknown[]>).projects.length).toBe(seeded.Project.length);
    expect((outputs as Record<string, unknown[]>).settings.length).toBe(1);
    // TPL-010-M — the example money is there: items, their marks, and the reading.
    expect((outputs as Record<string, unknown[]>).moneyItems.length).toBe(seeded.MoneyItem.length);
    expect(seeded.MoneyItem.length).toBeGreaterThanOrEqual(9);
    expect((outputs as Record<string, unknown[]>).moneyMarks.length).toBeGreaterThan(0);
    expect((outputs as Record<string, unknown[]>).balanceReadings.length).toBe(1);

    // The window is honoured: nothing outside the dates it was given comes back.
    const blocks = (outputs as Record<string, Array<Record<string, string>>>).blocks;
    expect(blocks.every((b) => b.date >= '2026-09-01' && b.date <= '2026-09-30')).toBe(true);

    // 🔴 No real money, ever: the seed is invented and the sanitisation rule is a gate.
    const words = JSON.stringify(seeded);
    expect(words).toContain('Bramble & Co');
    expect(words).not.toMatch(/digitalbricks|richard/i);
  });
});

describe('§7 the todo list’s tasks in the week (TPL-010-L)', () => {
  const pad = (n: number) => (n < 10 ? '0' : '') + n;
  const dayFrom = (offset: number) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + offset);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const tasks = [
    { id: 't-late', title: 'Invoice Bramble for September', status: 'open', deadline: dayFrom(-3), position: 4 },
    { id: 't-today', title: 'Call the accountant', status: 'open', deadline: dayFrom(0), position: 2 },
    { id: 't-later', title: '€ chase the Uplift payment', status: 'open', deadline: dayFrom(9), position: 7 },
    { id: 't-sent', title: 'Send the proposal', status: 'open', deadline: dayFrom(-1), position: 3 },
    { id: 't-planned', title: 'Already a block', status: 'open', deadline: dayFrom(0), position: 5 },
    { id: 't-none', title: 'Someday', status: 'open', deadline: '', position: 1 },
    { id: 't-done', title: 'Invoice last month', status: 'done', deadline: dayFrom(-1), position: 9 }
  ];
  const sent = [{ taskId: 't-sent', kind: 'created', summary: SENT_SUMMARY }];
  const stored = [{ id: 'b1', projectId: 'p1', date: dayFrom(0), what: 'Stored work', planned: 2, position: 1 }];
  const earlier = [{ id: 'b0', projectId: 'p1', date: dayFrom(-7), what: 'Already a block', planned: 1, todoTaskId: 't-planned' }];
  const project = (inputs: Record<string, unknown>) => run(scriptOf(built, C.todoTasks, 'ttWork'), inputs).outputs;

  it('L2 — an open task with a deadline is a quarter-hour on its day, a late one at the top of today; one made into a block is not drawn', () => {
    const outputs = project({ tasks, sent, blocks: stored, moveBlocks: earlier, todoUrl: 'https://todo.example.org/' });
    const blocks = outputs.blocks as Array<Record<string, unknown>>;
    expect(blocks[0]).toBe(stored[0]);
    const byTask = Object.fromEntries(blocks.filter((b) => b.todoProjected).map((b) => [b.todoTaskId, b]));
    expect(Object.keys(byTask).sort()).toEqual(['t-late', 't-later', 't-sent', 't-today']);
    expect(byTask['t-late']).toMatchObject({ date: dayFrom(0), todoLate: true, todoDue: dayFrom(-3), planned: 0.25, done: false, todoMoney: true });
    expect(byTask['t-today']).toMatchObject({ date: dayFrom(0), todoLate: false, todoMoney: false });
    expect(byTask['t-later']).toMatchObject({ date: dayFrom(9), todoMoney: true });
    expect(Number(byTask['t-late'].position)).toBeLessThan(Number(byTask['t-today'].position));
    expect(Number(byTask['t-today'].position)).toBeLessThan(1);
    expect(byTask['t-late'].todoHref).toBe('https://todo.example.org/?task=t-late');
  });

  it('L7 — money is a € or Invoice title, or a task Planning sent; AC6 counts the late ones and names the first', () => {
    const outputs = project({ tasks, sent, blocks: [], moveBlocks: [], todoUrl: '' });
    const byTask = Object.fromEntries((outputs.blocks as Array<Record<string, unknown>>).map((b) => [b.todoTaskId, b]));
    expect(byTask['t-sent'].todoMoney).toBe(true);
    expect(outputs.lateMoney).toBe(2);
    expect(outputs.lateMoneyTitle).toBe('Invoice Bramble for September');
    // Without the history line it is a plain task.
    const plain = project({ tasks, sent: [], blocks: [], moveBlocks: [], todoUrl: '' });
    expect(Object.fromEntries((plain.blocks as Array<Record<string, unknown>>).map((b) => [b.todoTaskId, b]))['t-sent'].todoMoney).toBe(false);
  });

  it('the column draws a task as From todo, red only when it is money, first in its day — and a block made from one as a block', () => {
    const projected = project({ tasks, sent, blocks: [...stored, { ...earlier[0], id: 'b2', date: dayFrom(0), position: 2 }], moveBlocks: [], todoUrl: '' });
    const monday = (() => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    })();
    const { outputs } = run(scriptOf(built, C.dayColumns, 'dlWork'), {
      projects: [{ id: 'p1', name: 'Stored project', kind: 'earning' }],
      blocks: projected.blocks,
      weekStart: monday,
      focusHours: 6
    });
    const today = (outputs.columns as Array<{ key: string; blocks: Array<Record<string, unknown>> }>).find((c) => c.key === dayFrom(0));
    if (!today) return; // Sunday is not one of the six columns.
    expect(today.blocks.map((b) => b.id)).toEqual(['todo-t-late', 'todo-t-sent', 'todo-t-today', 'b1', 'b2']);
    expect(today.blocks[0]).toMatchObject({ fromTodo: true, mark: 'var(--destructive)', hoursText: '0.25 h' });
    expect(String(today.blocks[0].projectName)).toMatch(/^From todo · was due /);
    expect(today.blocks[2]).toMatchObject({ fromTodo: true, projectName: 'From todo', mark: 'var(--env-admin)' });
    expect(today.blocks[4]).toMatchObject({ fromTodo: false, projectName: 'Stored project' });
  });

  it('L3 — every press on a task opens the block sheet, never the tick or the card', () => {
    const wires = connectionsOf(built, C.block);
    const from = (id: string, prop: string) => wires.filter((w) => w.fromId === id && w.fromProperty === prop).map((w) => `${w.toId}.${w.toProperty}`).sort();
    expect(from('bkTick', 'onClick')).toEqual(['bkTickTodo.eval']);
    expect(from('bkWho', 'onClick')).toEqual(['bkWhoTodo.eval']);
    for (const g of ['bkTickTodo', 'bkLogTodo', 'bkWhoTodo']) expect(from(g, 'ontrue')).toEqual(['bkOut.openLog']);
    expect(from('bkTickTodo', 'onfalse')).toEqual(['bkOut.toggle']);
    expect(from('bkWhoTodo', 'onfalse')).toEqual(['bkOut.openProject']);
  });

  it('L3 — the sheet opens a task as a new block with its words and day, and saving writes the task’s id on it', () => {
    const row = scriptOf(built, C.pageWeek, 'twSheetRow');
    const projected = project({ tasks, sent, blocks: [], moveBlocks: [], todoUrl: 'https://todo.example.org' }).blocks as Array<Record<string, unknown>>;
    const late = projected.find((b) => b.todoTaskId === 't-late') as Record<string, unknown>;
    const opened = run(row, { id: late.id, newDay: '', mode: 'tick', blocks: projected, projects: [{ id: 'p1', name: 'P' }], todoUrl: 'https://todo.example.org' }).outputs;
    expect(opened).toMatchObject({
      shown: true, isNew: true, timeShown: false, projectId: '', what: 'Invoice Bramble for September', planned: '0.5',
      date: dayFrom(0), saveLabel: 'Make it a block', todoTaskId: 't-late', todoHref: 'https://todo.example.org?task=t-late'
    });
    // A block made from a task links back to it; a plain new block carries no task.
    const madeBlock = { id: 'b9', projectId: 'p1', date: dayFrom(0), what: 'x', planned: 1, todoTaskId: 't-late' };
    const existing = run(row, { id: 'b9', newDay: '', mode: '', blocks: [madeBlock], projects: [], todoUrl: 'https://todo.example.org' }).outputs;
    expect([existing.isNew, existing.todoHref, existing.todoTaskId]).toEqual([false, 'https://todo.example.org?task=t-late', '']);
    const fresh = run(row, { id: '', newDay: dayFrom(1), mode: '', blocks: [], projects: [], todoUrl: 'https://todo.example.org' }).outputs;
    expect([fresh.todoTaskId, fresh.todoHref]).toEqual(['', '']);

    const add = run(scriptOf(built, C.addBlock, 'abQueue'), {
      start: 1, step: 0, projectId: 'p1', date: dayFrom(0), what: 'Invoice Bramble', planned: 0.5, todoTaskId: 't-late', items: [], fromActions: false, projects: []
    });
    expect(add.signals).toEqual(['go']);
    expect(add.outputs.todoTaskId).toBe('t-late');
    const wires = connectionsOf(built, C.addBlock);
    expect(wires.some((w) => w.fromId === 'abQueue' && w.fromProperty === 'out-todoTaskId' && w.toId === 'abWrite' && w.toProperty === 'prop-todoTaskId')).toBe(true);
    const page = connectionsOf(built, C.pageWeek);
    expect(page.some((w) => w.fromId === 'twSheetRow' && w.fromProperty === 'out-todoTaskId' && w.toId === 'cmdAddBlock' && w.toProperty === 'todoTaskId')).toBe(true);
    expect(page.some((w) => w.fromId === 'twTodo' && w.fromProperty === 'blocks' && w.toId === 'twSheetRow')).toBe(true);
  });

  /**
   * L1, as T1b amended it (Richard, 2026-09-23): Planning never closes, renames, moves or deletes a Task.
   * It creates one (Send to todo), writes lines in a task's history (L4, T2), and ticks a next action
   * off when the block made from it is done (T1b) — `done` and its note, nothing else.
   */
  it('L1 / T1b — the planner reads Task, open ones only; it creates tasks and history lines, and only ever ticks an Action', () => {
    const data = nodesOf(component(built, C.plannerData));
    const query = data.find((n) => n.id === 'pnTasks') as { parameters: Record<string, unknown> };
    expect(query.parameters.collectionName).toBe('Task');
    expect(query.parameters.visualFilter).toEqual({ combinator: 'and', rules: [{ property: 'status', operator: 'equal to', input: 'openStatus' }] });
    const writers: string[] = [];
    for (const c of componentsOf(built)) {
      for (const n of nodesOf(c)) {
        const coll = (n.parameters as Record<string, unknown>)?.collectionName;
        if (['NewDbModelProperties', 'SetDbModelProperties', 'DeleteDbModelProperties'].includes(String(n.type)) && ['Task', 'Event', 'Action'].includes(String(coll))) {
          writers.push(`${c.name} ${n.type} ${coll}`);
        }
      }
    }
    expect(writers.sort()).toEqual([
      `${C.addBlock} NewDbModelProperties Event`,
      `${C.sendToTodo} NewDbModelProperties Event`,
      `${C.sendToTodo} NewDbModelProperties Task`,
      `${C.tellTodo} NewDbModelProperties Event`,
      `${C.tellTodo} SetDbModelProperties Action`
    ]);
    // The tick writes the two fields the todo list's own tick writes, and nothing else.
    const tick = connectionsOf(built, C.tellTodo).filter((w) => w.toId === 'ttdAction' && w.toProperty.startsWith('prop-'));
    expect(tick.map((w) => w.toProperty).sort()).toEqual(['prop-done', 'prop-note']);
  });

  it('L4 — the chip says “in todo” once the move is an open task, and only with a todo list', () => {
    const moves = scriptOf(built, C.moves, 'mvWork');
    const projects = [{ id: 'p1', name: 'Bramble & Co', kind: 'earning', move: 'Offer the add-on' }, { id: 'p2', name: 'Uplift', kind: 'earning', move: 'Ask about testing' }];
    const open = [{ id: 't1', title: 'offer the add-on ', status: 'open' }, { id: 't2', title: 'Ask about testing', status: 'done' }];
    const rows = (inputs: Record<string, unknown>) =>
      Object.fromEntries((run(moves, { projects, moveBlocks: [], ...inputs }).outputs.rows as Array<Record<string, unknown>>).map((r) => [r.projectId, r.inTodo]));
    expect(rows({ tasks: open, todoUrl: 'https://todo.example.org' })).toEqual({ p1: true, p2: false });
    expect(rows({ tasks: open, todoUrl: '' })).toEqual({ p1: false, p2: false });
    const chip = connectionsOf(built, C.moveChip);
    expect(chip.some((w) => w.fromProperty === 'inTodo' && w.toId === 'mcInTodo' && w.toProperty === 'mounted')).toBe(true);
  });

  it('L6 — Task and the sent lines are asked for only after the settings arrive with a todo address', () => {
    const wires = connectionsOf(built, C.plannerData);
    for (const q of ['pnTasks', 'pnSent']) {
      expect(wires.filter((w) => w.toId === q && w.toProperty === 'storageFetch').map((w) => `${w.fromId}.${w.fromProperty}`)).toEqual(['pnTodoGate.out-fetch']);
    }
    const gate = scriptOf(built, C.plannerData, 'pnTodoGate');
    expect(run(gate, { settings: [{ todoUrl: 'https://todo.example.org' }] }).signals).toEqual(['fetch']);
    expect(run(gate, { settings: [{ todoUrl: '  ' }] }).signals).toEqual([]);
  });

  it('L4 — Send to todo puts the move after the last open task with its day, once', () => {
    const guard = scriptOf(built, C.sendToTodo, 'tqGuard');
    const sentOnce = run(guard, { title: ' Offer the add-on ', deadline: dayFrom(2), tasks });
    expect(sentOnce.signals).toEqual(['go']);
    expect(sentOnce.outputs).toMatchObject({ title: 'Offer the add-on', position: 8, status: 'open', deadline: dayFrom(2), kind: 'created', summary: SENT_SUMMARY });
    expect(run(guard, { title: 'call the ACCOUNTANT', deadline: '', tasks }).signals).toEqual([]);
    expect(run(guard, { title: 'x', deadline: 'Friday', tasks: [] }).outputs).toMatchObject({ position: 1, deadline: '' });
    const wires = connectionsOf(built, C.sendToTodo);
    expect(wires.some((w) => w.fromId === 'tqTask' && w.fromProperty === 'id' && w.toId === 'tqEvent' && w.toProperty === 'prop-taskId')).toBe(true);
    expect(wires.some((w) => w.fromId === 'tqTask' && w.fromProperty === 'done' && w.toId === 'tqEvent' && w.toProperty === 'store')).toBe(true);
  });

  it('L4 — the card offers Send to todo only with a todo list, and says so once the move is in it', () => {
    const card = scriptOf(built, '/Logic/Card rows', 'kdWork');
    const p = { id: 'p1', name: 'Bramble', kind: 'earning', move: 'Call the accountant', moveDue: dayFrom(2) };
    const base = { projects: [p], blocks: [], moveBlocks: [], weekStart: '', selectedId: 'p1', firstOpenDay: '' };
    const inList = run(card, { ...base, tasks, todoUrl: 'https://todo.example.org' }).outputs;
    expect([inList.inTodo, inList.canSend]).toEqual([true, false]);
    expect(String(inList.todoLine)).toMatch(/^✓ In your todo list, due /);
    const notYet = run(card, { ...base, tasks: [], todoUrl: 'https://todo.example.org' }).outputs;
    expect([notYet.inTodo, notYet.canSend, notYet.sendTitle, notYet.sendDeadline]).toEqual([false, true, 'Call the accountant', dayFrom(2)]);
    const noList = run(card, { ...base, tasks: [], todoUrl: '' }).outputs;
    expect([noList.inTodo, noList.canSend]).toEqual([false, false]);
  });

  it('AC6 — a late money todo is the concern, before any other', () => {
    const shutdown = scriptOf(built, C.shutdown, 'suWork');
    const base = { projects: [], blocks: [], todayKey: dayFrom(0), tomorrowKey: dayFrom(1), todayLong: 'Today', tomorrowLong: 'Tomorrow', focusHours: 6 };
    const one = run(shutdown, { ...base, lateTodoCount: 1, lateTodoTitle: 'Invoice Bramble', lateConcern: 'Salon is late', unplacedDormant: 'Founder A' }).outputs;
    expect(one.concern).toMatch(/^One money todo is overdue: "Invoice Bramble"/);
    expect(one.chaseShown).toBe(false);
    expect(run(shutdown, { ...base, lateTodoCount: 2, lateTodoTitle: 'A' }).outputs.concern).toMatch(/^2 money todos are overdue, the first: "A"/);
    expect(run(shutdown, { ...base, lateTodoCount: 0, lateConcern: 'Salon is late' }).outputs.concern).toBe('Salon is late');
  });
});

// ── §8 ─────────────────────────────────────────────────────────────────────

/**
 * TPL-010-T — next actions into blocks, and a history on both sides. Richard's rulings, 2026-09-23:
 * T1 (a) each ticked next action becomes its own block; T1b finishing it ticks the action in Todo with
 * the block's note; T2 both lines in the task's history; T3 one log, shown on the block and the card.
 */
describe('§8 next actions into blocks, and the history on both sides (TPL-010-T)', () => {
  const pad = (n: number) => (n < 10 ? '0' : '') + n;
  const dayFrom = (offset: number) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + offset);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const task = { id: 't-inv', title: 'Invoice Bramble', status: 'open', deadline: dayFrom(0), position: 1 };
  const actions = [
    { id: 'a-send', taskId: 't-inv', title: 'Send it', position: 2, done: false },
    { id: 'a-draft', taskId: 't-inv', title: 'Draft the invoice', position: 1, done: false },
    { id: 'a-chase', taskId: 't-inv', title: 'Chase in a week', position: 3, done: false },
    { id: 'a-old', taskId: 't-inv', title: 'Ask for the PO number', position: 0, done: true }
  ];
  const PROJECTS = [{ id: 'p-bramble', name: 'Bramble & Co', kind: 'earning' }];
  const project = (inputs: Record<string, unknown>) => run(scriptOf(built, C.todoTasks, 'ttWork'), { sent: [], todoUrl: '', ...inputs }).outputs;
  const projected = (inputs: Record<string, unknown>) => (project(inputs).blocks as Array<Record<string, unknown>>).filter((b) => b.todoProjected);

  it('T1 — a task carries its open next actions, in the todo list’s order; one already a block is not offered again', () => {
    const [one] = projected({ tasks: [task], actions, blocks: [], moveBlocks: [] });
    expect((one.todoActions as Array<Record<string, string>>).map((a) => a.title)).toEqual(['Draft the invoice', 'Send it', 'Chase in a week']);
    const block = { id: 'b1', projectId: 'p-bramble', date: dayFrom(0), what: 'Draft the invoice', planned: 0.5, todoTaskId: 't-inv', todoActionId: 'a-draft' };
    const [after] = projected({ tasks: [task], actions, blocks: [block], moveBlocks: [] });
    expect((after.todoActions as Array<Record<string, string>>).map((a) => a.id)).toEqual(['a-send', 'a-chase']);
  });

  it('T1c — a task leaves the week once every open action is a block; a task with no actions leaves once it is one', () => {
    const blocks = ['a-draft', 'a-send', 'a-chase'].map((a, i) => ({ id: `b${i}`, projectId: 'p-bramble', date: dayFrom(0), what: a, planned: 0.5, todoTaskId: 't-inv', todoActionId: a }));
    expect(projected({ tasks: [task], actions, blocks: blocks.slice(0, 2), moveBlocks: [] })).toHaveLength(1);
    // The four weeks back count too: a block made last week still stands for its action.
    expect(projected({ tasks: [task], actions, blocks: blocks.slice(0, 2), moveBlocks: blocks.slice(2) })).toHaveLength(0);
    const bare = { ...task, id: 't-bare' };
    expect(projected({ tasks: [bare], actions: [], blocks: [], moveBlocks: [] })).toHaveLength(1);
    expect(projected({ tasks: [bare], actions: [], blocks: [{ id: 'b', date: dayFrom(0), todoTaskId: 't-bare' }], moveBlocks: [] })).toHaveLength(0);
    // Every action done in Planning — they are no longer open — and the task still does not come back.
    const allDone = actions.map((a) => ({ ...a, done: true }));
    expect(projected({ tasks: [task], actions: allDone, blocks: blocks, moveBlocks: [] })).toHaveLength(0);
  });

  it('T1 — the sheet lists the actions to tick, the first one ticked; ticks are kept for that task only', () => {
    const row = scriptOf(built, C.pageWeek, 'twSheetRow');
    const blocks = projected({ tasks: [task], actions, blocks: [], moveBlocks: [] });
    const id = String(blocks[0].id);
    const open = (picked: string) => run(row, { id, newDay: '', mode: '', blocks, projects: PROJECTS, todoUrl: '', picked, history: [] }).outputs;
    const fresh = open('');
    expect([fresh.whatShown, fresh.actionsShown, fresh.fromActions, fresh.saveLabel]).toEqual([false, true, true, 'Make it a block']);
    expect((fresh.actionRows as Array<Record<string, string>>).map((r) => r.label)).toEqual(['\u2611 Draft the invoice', '\u2610 Send it', '\u2610 Chase in a week']);
    expect(fresh.items).toEqual([{ what: 'Draft the invoice', todoActionId: 'a-draft' }]);
    expect(fresh.pickedNow).toBe(`${id}|a-draft`);
    // Pressing Send it ticks it too — the toggle writes the variable the sheet reads.
    const toggle = scriptOf(built, C.pageWeek, 'twPickToggle');
    const pressed = run(toggle, { actionId: 'a-send', current: fresh.pickedNow });
    expect(pressed.signals).toEqual(['go']);
    expect(pressed.outputs.value).toBe(`${id}|a-draft,a-send`);
    const two = open(String(pressed.outputs.value));
    expect(two.saveLabel).toBe('Make 2 blocks');
    expect(two.items).toEqual([{ what: 'Draft the invoice', todoActionId: 'a-draft' }, { what: 'Send it', todoActionId: 'a-send' }]);
    // Unticking the last leaves nothing to make, and says so.
    const none = open(`${id}|`);
    expect([none.items, none.saveLabel]).toEqual([[], 'Tick one to plan it']);
    // Ticks left from another task are that task's: this one opens on its own first action.
    expect(open('todo-other|a-send,a-chase').items).toEqual([{ what: 'Draft the invoice', todoActionId: 'a-draft' }]);
    // A task with no actions is the L3a sheet, unchanged: one box for the words.
    const bare = projected({ tasks: [{ ...task, id: 't-bare' }], actions: [], blocks: [], moveBlocks: [] });
    const plain = run(row, { id: bare[0].id, newDay: '', mode: '', blocks: bare, projects: PROJECTS, todoUrl: '', picked: '', history: [] }).outputs;
    expect([plain.whatShown, plain.actionsShown, plain.fromActions, plain.items]).toEqual([true, false, false, []]);
  });

  it('T1 / T2 — Add block writes one block per ticked action, each with its action, a history line and a Planned line in Todo', () => {
    const queue = scriptOf(built, C.addBlock, 'abQueue');
    const self = {};
    const common = { projectId: 'p-bramble', date: '2026-09-23', what: 'Invoice Bramble', planned: 0.5, todoTaskId: 't-inv', fromActions: true, projects: PROJECTS };
    const items = [{ what: 'Draft the invoice', todoActionId: 'a-draft' }, { what: 'Send it', todoActionId: 'a-send' }];
    const first = run(queue, { ...common, items, start: 1, step: 0 }, self);
    expect(first.signals).toEqual(['go']);
    expect(recordOnly(first.outputs)).toMatchObject({ what: 'Draft the invoice', todoActionId: 'a-draft', todoTaskId: 't-inv', planned: 0.5, date: '2026-09-23' });
    expect(first.outputs.tSummary).toBe(`${PLANNED_PREFIX}: Draft the invoice \u2014 Bramble & Co, Wed 23, 0.5 h`);
    expect([first.outputs.hKind, first.outputs.hSummary, first.outputs.hasTodo]).toEqual(['created', 'Made from the todo list \u00b7 Wed 23 \u00b7 0.5 h', true]);
    const second = run(queue, { ...common, items, start: 1, step: 1 }, self);
    expect([second.signals, second.outputs.what, second.outputs.todoActionId]).toEqual([['go'], 'Send it', 'a-send']);
    expect(run(queue, { ...common, items, start: 1, step: 2 }, self).signals).toEqual(['finished']);
    // Nothing ticked on a task with actions: nothing is written, not a block for the whole task.
    expect(run(queue, { ...common, items: [], start: 2, step: 2 }, self).signals).toEqual([]);
    // A plain new block is one block from the words, with no task and so no line in Todo.
    const plain = run(queue, { ...common, todoTaskId: '', fromActions: false, items: [], what: 'Retainer hours', start: 3, step: 2 }, self);
    expect([plain.outputs.what, plain.outputs.todoActionId, plain.outputs.hasTodo, plain.outputs.hSummary]).toEqual(['Retainer hours', '', false, 'Put in Wed 23 \u00b7 0.5 h']);
    // The chain: block, then its line, then — from a task — the todo list's line, then the next.
    const w = connectionsOf(built, C.addBlock).map((x) => `${x.fromId}.${x.fromProperty}>${x.toId}.${x.toProperty}`);
    for (const link of ['abQueue.out-go>abWrite.store', 'abWrite.done>abLog.store', 'abWrite.id>abLog.prop-blockId', 'abLog.done>abRoute.run', 'abRoute.out-todo>abTodo.store', 'abTodo.done>abStep.increase', 'abRoute.out-next>abStep.increase', 'abStep.currentCount>abQueue.in-step', 'abIn.do>abStart.increase', 'abQueue.out-finished>abOut.done']) {
      expect(w).toContain(link);
    }
    // The queue runs on the two counts only; every value it reads is signal-only.
    const q = nodesOf(component(built, C.addBlock)).find((n) => n.id === 'abQueue') as { parameters: Record<string, unknown> };
    expect(q.parameters['runOnChange-in-start']).toBeUndefined();
    expect(q.parameters['runOnChange-in-items']).toBe(false);
  });

  it('T1b / T2 — Add time says when a block has just been done; Tell todo ticks an open action, or writes the Logged line', () => {
    const time = scriptOf(built, C.addTime, 'AddtimeGuard');
    const base = { blockId: 'b1', entries: [], actual: '', hours: 0.5, note: 'sent Tuesday', day: '2026-09-23', planned: 0.5, projectId: 'p-bramble', what: 'Send it' };
    const done = run(time, { ...base, logged: true, wasDone: false }).outputs;
    expect([done.becameDone, done.doneNote, done.doneHours]).toEqual([true, 'sent Tuesday', 0.5]);
    expect([done.hKind, done.hSummary, done.hBody]).toEqual(['done', '0.5 h logged \u00b7 done', 'sent Tuesday']);
    expect(run(time, { ...base, logged: true, wasDone: true }).outputs.becameDone).toBe(false);
    expect(run(time, { ...base, hours: '', note: '', logged: false, wasDone: true }).outputs.hSummary).toBe('Opened again');
    // Done with nothing typed: the plan's hours, and the last sitting's note.
    const quiet = run(time, { ...base, hours: '', note: '', entries: [{ day: '2026-09-22', hours: 1, note: 'first pass' }], actual: 1, logged: true, wasDone: false }).outputs;
    expect([quiet.doneHours, quiet.doneNote]).toEqual([1, 'first pass']);

    const tell = scriptOf(built, C.tellTodo, 'ttdGuard');
    const acts = [{ id: 'a-send', taskId: 't-inv', title: 'Send it', done: false }, { id: 'a-gone', taskId: 't-inv', title: 'Old', done: true }];
    const ticked = run(tell, { taskId: 't-inv', actionId: 'a-send', actions: acts, becameDone: true, note: 'sent Tuesday', hours: 0.5 });
    expect(ticked.signals).toEqual(['tick']);
    expect(ticked.outputs).toMatchObject({ actionId: 'a-send', done: true, actionNote: 'sent Tuesday', kind: 'action-done', taskId: 't-inv', body: 'sent Tuesday' });
    expect(ticked.outputs.summary).toBe('Ticked off \u201cSend it\u201d in Planning \u00b7 0.5 h');
    // No note: the todo list's tick always has an answer, so Planning gives one.
    expect(run(tell, { taskId: 't-inv', actionId: 'a-send', actions: acts, becameDone: true, note: '', hours: 0.5 }).outputs.actionNote).toBe('Done in Planning, 0.5 h.');
    // A block from the task itself, or from an action already ticked in Todo: the Logged line only.
    const whole = run(tell, { taskId: 't-inv', actionId: '', actions: acts, becameDone: true, note: 'sent it', hours: 0.5 });
    expect(whole.signals).toEqual(['line']);
    expect([whole.outputs.kind, whole.outputs.summary, whole.outputs.body]).toEqual(['logged', `${LOGGED_PREFIX}: 0.5 h`, 'sent it']);
    expect(run(tell, { taskId: 't-inv', actionId: 'a-gone', actions: acts, becameDone: true, note: '', hours: 1 }).signals).toEqual(['line']);
    // Not done by this save, or no task: the todo list is told nothing.
    expect(run(tell, { taskId: 't-inv', actionId: 'a-send', actions: acts, becameDone: false, note: '', hours: 1 }).signals).toEqual(['skip']);
    expect(run(tell, { taskId: '', actionId: '', actions: acts, becameDone: true, note: '', hours: 1 }).signals).toEqual(['skip']);
  });

  it('T1b — the sheet saves, logs the time, tells the todo list, and only then closes', () => {
    const page = connectionsOf(built, C.pageWeek).map((x) => `${x.fromId}.${x.fromProperty}>${x.toId}.${x.toProperty}`);
    for (const link of [
      'cmdSave.done>cmdTime.do', 'cmdTime.done>cmdTellTodo.do', 'cmdTellTodo.done>twClearLog.do', 'cmdTellTodo.done>twData.refresh',
      'cmdTime.becameDone>cmdTellTodo.becameDone', 'twSheetRow.out-blockActionId>cmdTellTodo.actionId', 'twSheetRow.out-wasDone>cmdTime.wasDone',
      'twLog.pickAction>twPickToggle.run', 'twPickToggle.out-go>twSetPicked.do', 'twVarPicked.value>twSheetRow.in-picked',
      'twSheetRow.out-items>cmdAddBlock.items', 'twData.history>twSheetRow.in-history', 'twData.history>twCardRows.history'
    ]) {
      expect(page).toContain(link);
    }
    expect(page).not.toContain('cmdTime.done>twClearLog.do');
    const picked = nodesOf(component(built, C.pageWeek)).filter((n) => (n.parameters as Record<string, unknown>)?.name === VAR.pickedActions);
    expect(picked.map((n) => n.type).sort()).toEqual(['Set Variable', 'Variable2']);
  });

  it('T3 — every block and project command writes one line to PlanEvent after its record, and waits for it', () => {
    const logged = ['Add block', 'Save block', 'Add time', 'Carry block', 'Drop block', 'Place move', 'Move block', 'Add project', 'Edit project', 'Send to todo'];
    for (const name of logged) {
      const nodes = nodesOf(component(built, `/Commands/${name}`));
      const logs = nodes.filter((n) => n.type === 'NewDbModelProperties' && (n.parameters as Record<string, unknown>).collectionName === 'PlanEvent');
      expect(`${name} ${logs.length}`).toBe(`${name} 1`);
      const wires = connectionsOf(built, `/Commands/${name}`);
      const fields = wires.filter((x) => x.toId === logs[0].id && x.toProperty.startsWith('prop-')).map((x) => x.toProperty).sort();
      expect(fields).toEqual(expect.arrayContaining(['prop-at', 'prop-kind', 'prop-projectId', 'prop-summary']));
      // Done follows the line (or a line with nothing to say), never the record alone.
      const outNode = nodes.find((n) => n.type === 'Component Outputs') as LegacyNode;
      const intoDone = wires.filter((x) => x.toId === outNode.id && x.toProperty === 'done').map((x) => x.fromId);
      expect(intoDone).not.toContain(nodes.find((n) => n.type === 'NewDbModelProperties' && (n.parameters as Record<string, unknown>).collectionName !== 'PlanEvent' && n.id.endsWith('Write'))?.id ?? '-');
    }
    // Nothing updates or deletes a line, anywhere.
    for (const c of componentsOf(built)) {
      for (const n of nodesOf(c)) {
        if (['SetDbModelProperties', 'DeleteDbModelProperties'].includes(String(n.type))) expect(`${c.name} ${(n.parameters as Record<string, unknown>).collectionName}`).not.toMatch(/PlanEvent$/);
      }
    }
  });

  it('T3 — the lines say what happened: a save names what changed and a save that changed nothing says nothing', () => {
    const save = scriptOf(built, C.saveBlock, 'SaveblockGuard');
    const before = { id: 'b1', projectId: 'p-bramble', date: '2026-09-23', what: 'Draft', planned: 0.5 };
    const same = { blockId: 'b1', projectId: 'p-bramble', what: 'Draft', planned: 0.5, date: '2026-09-23', before, projects: PROJECTS };
    expect(run(save, same).outputs.hSummary).toBe('');
    const moved = run(save, { ...same, date: '2026-09-24' }).outputs;
    expect([moved.hKind, moved.hSummary]).toEqual(['moved', 'Moved Wed 23 \u2192 Thu 24']);
    expect(run(save, { ...same, planned: 1, what: 'Draft it' }).outputs.hSummary).toBe('Planned 0.5 h \u2192 1 h \u00b7 was \u201cDraft\u201d');

    const move = run(scriptOf(built, '/Commands/Move block', 'MoveblockGuard'), { blockId: 'mv', date: dayFrom(2), from: dayFrom(1), blocks: [{ id: 'mv', projectId: 'p-x', what: 'Email' }] }).outputs;
    expect([move.hProjectId, move.hWhat]).toEqual(['p-x', 'Email']);
    const drop = run(scriptOf(built, C.dropBlock, 'DropblockGuard'), { blockId: 'b1', blocks: [{ ...before, done: false }] }).outputs;
    expect(drop.hSummary).toBe('Taken out of the week (it was Wed 23, 0.5 h)');

    const edit = scriptOf(built, C.editProject, 'EditprojecGuard');
    const was = { id: 'p-bramble', name: 'Bramble & Co', kind: 'earning', move: 'Offer the add-on', rate: 80, termsDays: 14 };
    const ins = { projectId: 'p-bramble', name: 'Bramble & Co', kind: 'earning', move: 'Offer the add-on', rate: 80, termsDays: 14, projects: [was] };
    expect(run(edit, ins).outputs.hSummary).toBe('');
    expect(run(edit, { ...ins, move: 'Send the renewal' }).outputs.hSummary).toBe('Next move: \u201cSend the renewal\u201d');
    expect(run(edit, { ...ins, rate: 90 }).outputs.hSummary).toBe('Details changed');
  });

  it('T3 — the block sheet shows its own lines and the card the project’s, newest first, the card naming each block', () => {
    const history = [
      { id: 'h1', blockId: 'b1', projectId: 'p-bramble', what: 'Draft', kind: 'created', summary: 'Put in Wed 23 \u00b7 0.5 h', body: '', at: '2026-09-22T09:00:00.000Z' },
      { id: 'h2', blockId: 'b1', projectId: 'p-bramble', what: 'Draft', kind: 'done', summary: '0.5 h logged \u00b7 done', body: 'first pass', at: '2026-09-23T15:00:00.000Z' },
      { id: 'h3', blockId: 'b2', projectId: 'p-bramble', what: 'Send', kind: 'created', summary: 'Put in Thu 24 \u00b7 0.5 h', body: '', at: '2026-09-23T10:00:00.000Z' },
      { id: 'h4', projectId: 'p-other', kind: 'created', summary: 'Project started', body: '', at: '2026-09-23T11:00:00.000Z' }
    ];
    const row = scriptOf(built, C.pageWeek, 'twSheetRow');
    const b1 = { id: 'b1', projectId: 'p-bramble', date: '2026-09-23', what: 'Draft', planned: 0.5, done: true, todoTaskId: 't-inv', todoActionId: 'a-draft' };
    const sheet = run(row, { id: 'b1', newDay: '', mode: '', blocks: [b1], projects: PROJECTS, todoUrl: '', picked: '', history }).outputs;
    expect(sheet.logShown).toBe(true);
    const lines = sheet.logRows as Array<Record<string, unknown>>;
    expect(lines.map((l) => String(l.line).replace(/^.*? \d\d:\d\d \u00b7 /, ''))).toEqual(['0.5 h logged \u00b7 done', 'Put in Wed 23 \u00b7 0.5 h']);
    expect([lines[0].body, lines[0].hasBody, lines[1].hasBody]).toEqual(['first pass', true, false]);
    expect([sheet.blockTaskId, sheet.blockActionId, sheet.wasDone, sheet.block]).toEqual(['t-inv', 'a-draft', true, b1]);

    const card = run(scriptOf(built, '/Logic/Card rows', 'kdWork'), {
      projects: PROJECTS, blocks: [], moveBlocks: [], weekStart: '2026-09-21', selectedId: 'p-bramble', firstOpenDay: '', tasks: [], todoUrl: '', history
    }).outputs;
    const cardLines = (card.logRows as Array<Record<string, string>>).map((l) => l.line.replace(/^.*? \d\d:\d\d \u00b7 /, ''));
    expect(cardLines).toEqual(['\u201cDraft\u201d \u00b7 0.5 h logged \u00b7 done', '\u201cSend\u201d \u00b7 Put in Thu 24 \u00b7 0.5 h', '\u201cDraft\u201d \u00b7 Put in Wed 23 \u00b7 0.5 h']);
    expect(card.hasLog).toBe(true);
  });

  it('T3 — the history is read newest first and bounded; Action only with a todo list', () => {
    const data = nodesOf(component(built, C.plannerData));
    const q = (id: string) => (data.find((n) => n.id === id) as { parameters: Record<string, unknown> }).parameters;
    expect([q('pnHistory').collectionName, q('pnHistory').storageLimit, q('pnHistory').visualSort]).toEqual(['PlanEvent', 1000, [{ property: 'at', order: 'descending' }]]);
    expect([q('pnActions').collectionName, q('pnActions').storageLimit]).toEqual(['Action', 1000]);
    const wires = connectionsOf(built, C.plannerData);
    expect(wires.filter((w) => w.toId === 'pnActions' && w.toProperty === 'storageFetch').map((w) => `${w.fromId}.${w.fromProperty}`)).toEqual(['pnTodoGate.out-fetch']);
    expect(wires.filter((w) => w.toId === 'pnHistory' && w.toProperty === 'storageFetch').map((w) => `${w.fromId}.${w.fromProperty}`)).toEqual(['pnReady.ontrue']);
  });

  it('T3 — the demo carries the history and the actions, and a week kept before them is not reseeded', () => {
    expect(BORROWED).toContain('Action');
    expect(ADDED_LATER).toEqual(['PlanEvent']);
    const kept = { Project: [{ id: 'mine', name: 'My own project', kind: 'earning' }], Block: [], MonthPlan: [], MoneyItem: [], MoneyMark: [], BalanceReading: [], Settings: [] };
    const store: Record<string, string> = { [DEMO_STORAGE_KEY]: JSON.stringify(kept) };
    const win = { localStorage: { getItem: (k: string) => (k in store ? store[k] : null), setItem: (k: string, v: string) => { store[k] = v; }, removeItem: () => undefined } } as unknown as Window;
    // eslint-disable-next-line no-new-func
    const read = new Function('Inputs', 'Outputs', 'window', DEMO_READ_SCRIPT);
    const outputs = new Proxy({} as Record<string, unknown>, { get: (t, k: string) => (k in t ? t[k] : () => undefined) });
    read.call({}, { from: '2026-09-01', to: '2026-09-30', month: '2026-09', moveSince: '2026-08-01', marksSince: '2025-08-01', openStatus: 'open' }, outputs, win);
    expect((outputs as Record<string, Array<Record<string, string>>>).projects.map((p) => p.id)).toEqual(['mine']);
    expect((outputs as Record<string, unknown[]>).history).toEqual([]);
    expect((outputs as Record<string, unknown[]>).actions).toEqual([]);
  });
});

// ── §9 ─────────────────────────────────────────────────────────────────────

/**
 * TPL-010-B — **the bill is typed where the project is.** Richard's €2,400 fixed job had one home,
 * *+ Add a bill* on the card after saving, and the form pointed everywhere else. These run the
 * shipped scripts: the form's shape and its sentence, what the page opens it with, and the two
 * commands that now write the bill after the project.
 */
describe('§9 billing made clear (TPL-010-B)', () => {
  beforeAll(() => {
    jest.useFakeTimers({ doNotFake: ['performance'] }).setSystemTime(new Date(2026, 8, 23, 18, 0, 0));
  });
  afterAll(() => jest.useRealTimers());

  const SHAPE = () => scriptOf(built, C.projectEditor, 'peShape');
  const shape = (over: Record<string, unknown>) => run(SHAPE(), { kind: 'earning', billing: 'fixed', when: 'once', terms: '14', amount: '', rate: '', billDate: '', until: '', hasBills: false, billsLine: '', ...over }).outputs;
  const LINGUAID = {
    name: 'Linguaid LangueXpert eLearning content', sub: 'Videos and assignments', kind: 'earning', rate: 90, move: '', moveWorth: '', moveWhen: '', moveDue: '', moveStop: false, say: '',
    billing: 'fixed', termsDays: 14, agreedHours: '', billWhen: 'once', billAmount: '2400', billDate: '2026-10-16', billUntil: ''
  };

  it('B-1 / B-2 — the form says what Save will do about the bill, and asks for what is missing', () => {
    const ready = shape({ amount: '2400', billDate: '2026-10-16' });
    expect(ready.plan).toBe(
      'Saving adds the bill: €2,400, goes out Fri 16 Oct, due Fri 30 Oct. The hours you log are a record and never change it. When the work’s done, send your invoice as usual and mark the bill sent on the card.'
    );
    expect([ready.billWhen, ready.billingShown, ready.rateShown, ready.agreedShown, ready.offerShown, ready.amountShown, ready.datesShown, ready.untilShown]).toEqual(['once', true, false, true, true, true, true, false]);
    expect(shape({}).plan).toBe('Type the amount and pick the day the bill goes out, and saving adds the bill.');
    expect(shape({ amount: '2400' }).plan).toBe('Pick the day the bill goes out, and saving adds the bill.');
    expect(shape({ when: 'later' }).plan).toBe('No bill yet. Until it has one, the month doesn’t count this project’s money. You can add it later on the card, under Billing.');
    const monthly = shape({ billing: 'hourly', when: 'monthly', rate: '90', billDate: '2026-09-30' });
    expect([monthly.plan, monthly.dateLabel, monthly.rateShown, monthly.agreedShown, monthly.amountShown, monthly.untilShown]).toEqual([
      'Saving adds a bill every month: filled from the hours you log × €90, the first going out Wed 30 Sep, each due 14 days after it goes out, until you end it in Money.',
      'First bill goes out', true, false, false, true
    ]);
    expect(shape({ billing: 'hourly', when: 'monthly', rate: '90', billDate: '2026-09-30', until: '2027-03-31' }).plan).toContain(', the last going out Wed 31 Mar.');
    expect(shape({}).moveHint).toBe('The next thing to do on it. What it’s worth is a note in words; the money agreed goes in Billing, above.');
  });

  it('B-4 / B-5 — a project with bills, or work that is not Billable, is never offered one', () => {
    const has = shape({ hasBills: true, billsLine: 'one bill, €2,400, goes out Fri 16 Oct, due Fri 30 Oct', amount: '99', billDate: '2026-10-01' });
    expect([has.billWhen, has.offerShown, has.billingShown]).toEqual(['later', false, true]);
    expect(has.plan).toBe('Its bills are on the card, under Billing: one bill, €2,400, goes out Fri 16 Oct, due Fri 30 Oct. Change them there.');
    const building = shape({ kind: 'building', amount: '2400', billDate: '2026-10-16' });
    expect([building.billWhen, building.billingShown, building.rateShown, building.agreedShown, building.plan]).toEqual(['later', false, false, false, '']);
    expect(building.moveHint).toBe('The next thing to do on it, and what it could lead to, in words.');
    // What the page opens the form with: a new project on One bill; an existing one on Not now, whatever it has.
    const EDIT_ROW = scriptOf(built, C.pageWeek, 'twEditRow');
    const projects = [{ id: 'p1', name: 'Bramble & Co', kind: 'earning', billing: 'fixed', termsDays: 7 }];
    const open = (mode: string, over: Record<string, unknown> = {}) => run(EDIT_ROW, { mode, id: 'p1', projects, hasBills: true, billsLine: 'x', ...over }).outputs;
    expect([open('new').billWhen, open('new').hasBills, open('new').billDate]).toEqual(['once', false, '']);
    expect([open('edit').billWhen, open('edit').hasBills, open('edit').billsLine]).toEqual(['later', true, 'x']);
    expect(open('edit', { hasBills: false }).billWhen).toBe('later');
    // 🔴 Closed, the three days are a day nobody picks, so the next opening's '' reaches the picker.
    const closed = open('');
    expect([closed.billDate, closed.billUntil, closed.moveDue]).toEqual(['1900-01-01', '1900-01-01', '1900-01-01']);
    // B9 — no Slot, no Rung.
    const ids = nodesOf(component(built, C.projectEditor)).map((n) => n.id);
    expect(ids).not.toContain('peSlot');
    expect(ids).not.toContain('peRung');
  });

  it('B-1 / B-3 — Add project works out the bill at the press: Richard’s €2,400, an hourly month, and every way of having none', () => {
    const GUARD = () => scriptOf(built, C.addProject, 'AddprojectGuard');
    const add = run(GUARD(), LINGUAID);
    expect(add.signals).toEqual(['go']);
    expect(add.outputs).toMatchObject({
      bill: true, bLabel: 'Linguaid LangueXpert eLearning content', bAmount: 2400, bRepeat: 'once', bDate: '2026-10-30', bBillDate: '2026-10-16',
      bLead: '', bUntil: '', bFromHours: false, bLikelihood: 100, billing: 'fixed', termsDays: 14
    });
    expect(add.outputs.hSummary).toBe('Project started as “Linguaid LangueXpert eLearning content”, with its bill: €2,400, goes out Fri 16 Oct');
    const hourly = run(GUARD(), { ...LINGUAID, billing: 'hourly', termsDays: 7, billWhen: 'monthly', billAmount: '', billDate: '2026-09-30', billUntil: '2027-03-31' }).outputs;
    expect(hourly).toMatchObject({ bill: true, bAmount: 0, bRepeat: 'monthly', bDate: '2026-10-07', bBillDate: '', bLead: 7, bUntil: '2027-04-07', bFromHours: true });
    for (const none of [{ billAmount: '' }, { billDate: '' }, { billWhen: 'later' }, { billWhen: '' }, { kind: 'building' }]) {
      const out = run(GUARD(), { ...LINGUAID, ...none });
      expect(`${JSON.stringify(none)} ${out.outputs.bill} ${out.signals}`).toBe(`${JSON.stringify(none)} false go`);
      expect(out.outputs.hSummary).toBe('Project started as “Linguaid LangueXpert eLearning content”');
    }
    // The project keeps no bill fields and no Slot or Rung; the bill goes to a MoneyItem, after the project.
    const wires = connectionsOf(built, C.addProject);
    const props = (to: string) => wires.filter((w) => w.toId === to && w.toProperty.startsWith('prop-')).map((w) => w.toProperty.slice(5)).sort();
    expect(props('AddprojectWrite').filter((f) => /^bill(?!ing)|slot|rung/.test(f))).toEqual([]);
    expect(props('AddprojectThen')).toEqual(['amount', 'billDate', 'billLeadDays', 'date', 'fromHours', 'label', 'likelihood', 'monthEnd', 'note', 'position', 'projectId', 'repeat', 'until']);
    const from = (to: string, port: string) => wires.filter((w) => w.toId === to && w.toProperty === port).map((w) => `${w.fromId}.${w.fromProperty}`).sort();
    expect(from('AddprojectThen', 'prop-projectId')).toEqual(['AddprojectWrite.id']);
    expect(from('AddprojectThenGate', 'run')).toEqual(['AddprojectWrite.done']);
    expect(from('AddprojectThen', 'store')).toEqual(['AddprojectThenGate.out-yes']);
    expect(from('AddprojectLogGate', 'run')).toEqual(['AddprojectThen.done', 'AddprojectThen.failure', 'AddprojectThenGate.out-no']);
    const collection = nodesOf(component(built, C.addProject)).find((n) => n.id === 'AddprojectThen')?.parameters as Record<string, unknown>;
    expect(collection.collectionName).toBe('MoneyItem');
    expect(connectionsOf(built, C.editProject).filter((w) => w.toId === 'EditprojecThen' && w.toProperty === 'prop-projectId').map((w) => `${w.fromId}.${w.fromProperty}`)).toEqual(['EditprojecIn.projectId']);
  });

  it('B-4 — Edit project adds a bill only when the form sent one, and its history line says so', () => {
    const GUARD = () => scriptOf(built, C.editProject, 'EditprojecGuard');
    const was = { id: 'p-lx', ...LINGUAID, billWhen: undefined, billAmount: undefined, billDate: undefined, billUntil: undefined };
    const added = run(GUARD(), { projectId: 'p-lx', projects: [was], ...LINGUAID });
    expect([added.outputs.bill, added.outputs.hSummary]).toEqual([true, 'Bill added: €2,400, goes out Fri 16 Oct']);
    const renamed = run(GUARD(), { projectId: 'p-lx', projects: [was], ...LINGUAID, name: 'Linguaid Training', billWhen: 'later' });
    expect([renamed.outputs.bill, renamed.outputs.hSummary]).toEqual([false, 'Renamed from “Linguaid LangueXpert eLearning content”']);
    // A project saved with a Slot, edited now: nothing about it changed, so nothing is said.
    const same = run(GUARD(), { projectId: 'p-lx', projects: [{ ...was, slot: '1 of 3', rung: 'r' }], ...LINGUAID, billWhen: 'later' });
    expect(same.outputs.hSummary).toBe('');
  });
});
