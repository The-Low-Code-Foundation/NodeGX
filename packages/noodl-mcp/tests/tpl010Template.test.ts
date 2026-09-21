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

import { C, COLLECTIONS, TPL010_COMPONENTS } from './tpl010Components';
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

  it('names exactly the five collections, keeps every row private, and lets nothing but a Block be deleted', () => {
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
  it('🔴 AC4 — a block’s words and its hours are buttons that open the log sheet', () => {
    const blk = component(built, C.block);
    const buttons = nodesOf(blk).filter((n) => n.type === 'net.noodl.controls.button');
    expect(buttons.map((n) => n.id).sort()).toEqual(['bkHours', 'bkTick', 'bkWhat', 'bkWho'].sort());
    const wires = connectionsOf(built, C.block);
    // A Button's words are its `label`; wiring them into `text` lands nothing and says nothing.
    expect(wires.filter((w) => w.toId === 'bkWhat' || w.toId === 'bkHours').map((w) => `${w.fromProperty}→${w.toId}.${w.toProperty}`).sort())
      .toEqual(['hoursText→bkHours.label', 'what→bkWhat.label']);
    expect(wires.filter((w) => w.toProperty === 'openLog').map((w) => w.fromId).sort()).toEqual(['bkHours', 'bkWhat']);
  });

  it('🔴 AC4 — the log sheet’s two boxes are filled from the block, and read back from the box', () => {
    const wires = connectionsOf(built, C.logSheet);
    // 🔴 `startValue` in, `onTextChanged` out. `text` is the box's OUTPUT: a value wired into
    // it lands nowhere, and reading `startValue` back gives what was PUT there, not what was
    // typed. Setting `startValue` while the box is unfocused re-publishes `onTextChanged`,
    // which is the only reason the sheet can be reused for a second block without carrying
    // the first one's words into it.
    for (const [id, field] of [['lgWhat', 'what'], ['lgActual', 'actual']] as const) {
      expect(wires.some((w) => w.toId === id && w.toProperty === 'startValue' && w.fromProperty === field)).toBe(true);
      expect(wires.some((w) => w.fromId === id && w.fromProperty === 'onTextChanged' && w.toProperty === field)).toBe(true);
      expect(wires.some((w) => w.toId === id && w.toProperty === 'text')).toBe(false);
    }
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
    const { outputs } = run(ENVELOPES(), { projects: PROJECTS, blocks, monthPlans: [], settings, weekStart: MONDAY });
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
    const blocks = [{ ...block('2026-09-23', 'p-build', 0.5, false), isMove: true }];
    const { outputs } = run(scriptOf(built, C.moves, 'mvWork'), { projects: PROJECTS, blocks, weekStart: MONDAY });
    const rows = outputs.rows as Array<Record<string, unknown>>;
    expect(rows.map((r) => r.projectId)).toEqual(['p-dormant', 'p-build', 'p-earn']);
    expect(rows[0].late).toBe(true);
    expect(rows[1].placed).toBe(true);
    expect(outputs.unplacedDormant).toBe('Founder A');
    expect(outputs.unsentBuilding).toBe('');
  });

  it('the cash strip expands a monthly event over the six weeks ahead and runs the balance through it', () => {
    const { outputs } = run(scriptOf(built, C.cashLine, 'clWork'), {
      cashEvents: [
        { id: 'c1', date: '2026-08-28', amount: 1500, label: 'Partner’s contract', kind: 'in', recurring: 'monthly' },
        { id: 'c2', date: '2026-10-01', amount: -4500, label: 'Household costs', kind: 'cost', recurring: '' }
      ],
      settings,
      invoicedText: ''
    });
    const rows = outputs.rows as Array<Record<string, unknown>>;
    expect(rows.map((r) => r.label)).toEqual(['Partner’s contract', 'Household costs', 'Partner’s contract']);
    expect(rows.map((r) => r.running)).toEqual(['after: €4,700', 'after: €200', 'after: €1,700']);
    expect(rows.some((r) => r.low === true)).toBe(false);
  });

  /** AC4, run: what the sheet writes for each of the three things a person can do in it. */
  it('🔴 AC4 — Save block writes the words, and an empty hours box still means “as long as it was meant to”', () => {
    const guard = scriptOf(built, C.saveBlock, 'SaveblockGuard');

    const logged = run(guard, { blockId: 'b1', what: '  Security review  ', actual: 3.5, logged: true });
    expect(logged.signals).toEqual(['go']);
    expect(logged.outputs.what).toBe('Security review');
    expect(logged.outputs.done).toBe(true);
    expect(logged.outputs.actual).toBe(3.5);

    // 🔴 The whole point: nothing typed in the hours box writes '' and NOT nought. hoursOf
    // reads an empty actual as the plan, and a measured-looking number nobody measured is the
    // lie the envelopes would then be built on.
    const noHours = run(guard, { blockId: 'b1', what: 'Security review', actual: '', logged: true });
    expect(noHours.outputs.actual).toBe('');
    expect(noHours.outputs.done).toBe(true);

    const putBack = run(guard, { blockId: 'b1', what: 'Security review', actual: 3.5, logged: false });
    expect(putBack.outputs.done).toBe(false);
    expect(putBack.outputs.actual).toBe('');

    // A block with no words is not a block, and blanking the field would erase the line the
    // week draws. Nothing is written at all.
    expect(run(guard, { blockId: 'b1', what: '   ', actual: 2, logged: true }).signals).toEqual([]);
    expect(run(guard, { blockId: '', what: 'Work', actual: 2, logged: true }).signals).toEqual([]);
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
    read.call({}, { from: '2026-09-01', to: '2026-09-30', month: '2026-09' }, outputs, win);

    expect(signals).toContain('loaded');
    expect(store[DEMO_STORAGE_KEY]).toBeTruthy();
    const seeded = JSON.parse(store[DEMO_STORAGE_KEY]) as Record<string, unknown[]>;
    expect(Object.keys(seeded).sort()).toEqual([...COLLECTIONS].sort());
    expect((outputs as Record<string, unknown[]>).projects.length).toBe(seeded.Project.length);
    expect((outputs as Record<string, unknown[]>).settings.length).toBe(1);

    // The window is honoured: nothing outside the dates it was given comes back.
    const blocks = (outputs as Record<string, Array<Record<string, string>>>).blocks;
    expect(blocks.every((b) => b.date >= '2026-09-01' && b.date <= '2026-09-30')).toBe(true);

    // 🔴 No real money, ever: the seed is invented and the sanitisation rule is a gate.
    const words = JSON.stringify(seeded);
    expect(words).toContain('Bramble & Co');
    expect(words).not.toMatch(/digitalbricks|richard/i);
  });
});
