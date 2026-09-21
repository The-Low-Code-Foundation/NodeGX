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

import { C, COLLECTIONS, PLANNER_FNS, TPL010_COMPONENTS } from './tpl010Components';
import { MONEY_FNS } from './tpl010Money';
import { BACKEND_NODE_TYPES, DEMO_CHANGED, DEMO_READ_SCRIPT, DEMO_STORAGE_KEY, TPL010_DEMO_COMPONENTS } from './tpl010Demo';
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
function run(script: string, inputs: Record<string, unknown>): { outputs: Record<string, unknown>; signals: string[] } {
  const signals: string[] = [];
  const outputs = new Proxy({} as Record<string, unknown>, {
    get(target, key: string) {
      if (key in target) return target[key];
      return () => signals.push(key);
    }
  });
  // eslint-disable-next-line no-new-func
  new Function('Inputs', 'Outputs', script).call({}, inputs, outputs);
  return { outputs: { ...outputs }, signals };
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
    expect(codes).toEqual(['wired-dimension-becomes-grow']);
  });

  it('templates/planner is byte-identical to a fresh build — the same files, the same bytes', () => {
    expect(files(ARTEFACT)).toEqual(files(rebuilt));
    const differing = files(rebuilt).filter((f) => !fs.readFileSync(path.join(ARTEFACT, f)).equals(fs.readFileSync(path.join(rebuilt, f))));
    expect(differing).toEqual([]);
  });

  it('templates/planner-demo is byte-identical to a fresh build, so the demo can never be older than the template', () => {
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

  it('names exactly the seven collections, keeps every row private, and lets nothing but a Block be deleted (M10: ending money keeps it)', () => {
    expect(Object.keys(policy.collections).sort()).toEqual([...COLLECTIONS].sort());
    for (const [name, rules] of Object.entries(policy.collections)) {
      expect(`${name} creatorOwns=${rules.creatorOwns}`).toBe(`${name} creatorOwns=true`);
      expect(`${name} delete=${rules.permissions.delete}`).toBe(`${name} delete=${name === 'Block' ? 'authenticated' : 'nobody'}`);
    }
    // 🔴 The one public door, and the START-HERE says to shut it once your account exists.
    expect(policy.signup).toBe('public');
  });
});

// ── §3 ─────────────────────────────────────────────────────────────────────

describe('§3 the rules the week depends on', () => {
  it('only Logic/Planner data reads the backend, and every query it makes is bounded', () => {
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
    expect(wires.filter((w) => w.toProperty === 'openLog').map((w) => w.fromId).sort()).toEqual(['bkHours', 'bkWhat']);
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
    expect(into('cmdMoveBlock')).toEqual(['twCard.moveIt>do', 'twCard.planDate>date', 'twCardRows.placedBlockId>blockId', 'twCardRows.planDate>from']);
    expect(typeOf('cmdTakeOut')).toBe(C.dropBlock);
    expect(into('cmdTakeOut')).toEqual(['twCard.takeOut>do', 'twCardRows.placedBlockId>blockId']);
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
    // M22 — the target arrives from Logic/Money; the envelopes spend it.
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
   * number counted every logged block as nought: the envelopes stayed empty however much
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
      (out.groups as Array<{ rows: Array<Record<string, unknown>> }>).flatMap((g) => g.rows).find((r) => r.id === id) as Record<string, unknown>;

    const open = run(CARD, { ...ins, moveBlocks: [], selectedId: 'p-earn' }).outputs;
    expect([open.placed, open.unplaced, open.planDate, open.planHours, open.minDate, open.hasLast]).toEqual([false, true, '2026-09-26', '0.5', '2026-09-25', false]);
    expect(open.placedBlockId).toBe('');
    expect(listRow(open, 'p-earn').move).toBe('\u2192 Offer the add-on');
    expect(listRow(open, 'p-earn').moveColor).toBe('var(--foreground)');
    // A late move that is not placed stays red — red is for exactly this (R13).
    expect(listRow(open, 'p-dormant').moveColor).toBe('var(--destructive)');

    const live = { ...block('2026-09-29', 'p-earn', 1, false), id: 'mv1', isMove: true };
    const placed = run(CARD, { ...ins, moveBlocks: [live], selectedId: 'p-earn' }).outputs;
    expect([placed.placed, placed.unplaced, placed.placedBlockId, placed.planDate]).toEqual([true, false, 'mv1', '2026-09-29']);
    expect(placed.placedLine).toBe('In the week: Tue 29 \u00b7 1 h');
    expect(listRow(placed, 'p-earn').move).toBe('\u2713 Tue 29 \u00b7 Offer the add-on');
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
    expect(ahead.outputs).toEqual({ date: '2026-10-01' });
    expect(run(moveIt, { blockId: 'mv1', date: '2026-09-29', from: '2026-09-29' }).signals).toEqual([]);
  });

  /** R23, run: what the block sheet writes about the block itself. */
  it('R2.4-6 — Save block writes the project, the words, the hours and the day, and refuses a block that is not one', () => {
    const guard = scriptOf(built, C.saveBlock, 'SaveblockGuard');
    const moved = run(guard, { blockId: 'b1', projectId: 'p-build', what: '  Security review  ', planned: 1.3, date: '2026-09-24' });
    expect(moved.signals).toEqual(['go']);
    expect(moved.outputs).toEqual({ projectId: 'p-build', what: 'Security review', planned: 1.25, date: '2026-09-24' });
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
    expect(first.outputs).toEqual({ entries: [{ day: '2026-09-23', hours: 0.5, note: 'Login flow' }], actual: 0.5, done: false });

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
    const b = { ...block(MONDAY, 'p-earn', 1.5, false), entries: [{ day: MONDAY, hours: 0.5, note: 'Login flow' }], actual: 0.5 };
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
    expect(money({ marks }).lateConcern).toBe('');
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
});

// ── §5 ─────────────────────────────────────────────────────────────────────

describe('§5 the demo is the template with the backend taken out', () => {
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
      expect(writeIds.length).toBe(1);
      const twin = (shipped?.nodes as Array<Record<string, string>>).find((n) => n.id === writeIds[0]);
      expect(`${c.path} ${twin?.type}`).toBe(`${c.path} JavaScriptFunction`);
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
    read.call({}, { from: '2026-09-01', to: '2026-09-30', month: '2026-09', moveSince: '2026-08-01', marksSince: '2025-08-01' }, outputs, win);

    expect(signals).toContain('loaded');
    expect(store[DEMO_STORAGE_KEY]).toBeTruthy();
    const seeded = JSON.parse(store[DEMO_STORAGE_KEY]) as Record<string, unknown[]>;
    expect(Object.keys(seeded).sort()).toEqual([...COLLECTIONS].sort());
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
