/**
 * TPL-008 — the gate over the todo list's artefact.
 *
 * What a browser does with the template is graded by the drive,
 * `packages/nodegx-backend/tests/tpl008-todo-drive.test.ts`. This file grades what
 * is true of the directory a person receives, and runs the engine's scripts
 * against fixtures — the decisions that are invisible in a screenshot:
 *
 * - §1 two builds agree byte for byte, and the artefact on disk is that build;
 * - §2 the policy validates, keeps every row private and refuses every delete;
 * - §3 every command writes history, and nothing else writes `Event`;
 * - §4 the look Richard approved: three type sizes, contrast recomputed;
 * - §5 the scripts: ordering, the history merge, moves, deadlines.
 *
 * @module noodl-mcp/tests/tpl008Template.test
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { LegacyComponent, LegacyNode } from '../../noodl-editor/src/editor/src/io/ProjectExporter';
import { validateSecurityConfig } from '../../nodegx-backend/src/security/model';

import {
  C,
  COLLECTIONS,
  DECIDE_HISTORY_SCRIPT,
  DEADLINE_SCRIPT,
  LOG_ROWS_SCRIPT,
  MERGE_WINDOW_MS,
  MOVE_SCRIPT,
  REMINDER_COLLECTION,
  SELECTED_SCRIPT,
  TASK_ROWS_SCRIPT,
  TPL008_COMPONENTS
} from './tpl008Components';
import { AuthoredTemplate, buildTodoTemplateProject, POLICY_FILE, prepareTodoArtefact, TEMPLATE_ID } from './tpl008Template';
import {
  CONTRAST_PAIRS,
  REMINDERS_ATTRIBUTE,
  REMINDERS_TOGGLE_SCRIPT,
  REMINDERS_TURN_OFF_CLASS,
  REMINDERS_TURN_ON_CLASS,
  THEME_BOOT_SCRIPT,
  THEME_FLIP_SCRIPT,
  THEME_STORAGE_KEY,
  THEME_TO_DARK_CLASS,
  THEME_TO_LIGHT_CLASS,
  themeCss,
  TPL008_DARK_TOKENS,
  TPL008_TOKENS
} from './tpl008Theme';

jest.setTimeout(300_000);

const REPO = path.join(__dirname, '..', '..', '..');
const ARTEFACT = path.join(REPO, 'templates', TEMPLATE_ID);
const POLICY_SOURCE = path.join(REPO, 'templates', `${TEMPLATE_ID}.security.json`);

let built: AuthoredTemplate;
let rebuilt = '';

function componentsOf(): LegacyComponent[] {
  return built.project.components ?? [];
}

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

function allNodes(): Array<{ component: string; node: LegacyNode }> {
  return componentsOf().flatMap((c) => nodesOf(c).map((node) => ({ component: c.name, node })));
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

beforeAll(async () => {
  built = await buildTodoTemplateProject();
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tpl008-gate-')), TEMPLATE_ID);
  prepareTodoArtefact(built, out, POLICY_SOURCE);
  rebuilt = out;
});

// ── §1 ─────────────────────────────────────────────────────────────────────

describe('§1 the artefact is the build', () => {
  it('the door refused nothing and raised no warning or error', () => {
    const loud = built.diagnostics.filter((d) => d.severity !== 'info');
    expect(loud).toEqual([]);
  });

  it('templates/todo-list is byte-identical to a fresh build — the same files, the same bytes', () => {
    expect(files(ARTEFACT)).toEqual(files(rebuilt));
    const differing = files(rebuilt).filter(
      (f) => !fs.readFileSync(path.join(ARTEFACT, f)).equals(fs.readFileSync(path.join(rebuilt, f)))
    );
    expect(differing).toEqual([]);
  });

  it('every planned component is in the project, and both pages are routed with the list as the start page', () => {
    const names = componentsOf().map((c) => c.name).sort();
    expect(names).toEqual(['/App', ...TPL008_COMPONENTS.map((c) => `/${c.path}`)].sort());
    const router = allNodes().find((n) => n.node.type === 'Router')?.node;
    expect((router?.parameters as { pages?: unknown })?.pages).toEqual({ startPage: C.pageTodo, routes: [C.pageTodo, C.pageSignIn] });
  });
});

// ── §2 ─────────────────────────────────────────────────────────────────────

describe('§2 the policy', () => {
  const policy = JSON.parse(fs.readFileSync(POLICY_SOURCE, 'utf8')) as {
    devOpen: boolean;
    collections: Record<string, { permissions: Record<string, unknown>; creatorOwns: boolean }>;
    functions: Record<string, unknown>;
  };

  it('validates — with a control showing the validator rejects a broken one', () => {
    expect(validateSecurityConfig(policy)).toEqual([]);
    expect(validateSecurityConfig({ ...policy, signup: 'everybody' })).not.toEqual([]);
  });

  it('ships inside the artefact byte for byte', () => {
    expect(fs.readFileSync(path.join(ARTEFACT, POLICY_FILE), 'utf8')).toBe(fs.readFileSync(POLICY_SOURCE, 'utf8'));
  });

  it('is enforced, names exactly the three collections and the reminders one, keeps rows private and refuses every delete', () => {
    expect(policy.devOpen).toBe(false);
    expect(Object.keys(policy.collections).sort()).toEqual([...COLLECTIONS, REMINDER_COLLECTION].sort());
    // s6: turning reminders off keeps the device's row with `enabled: false`, so nothing needs a delete there either.
    for (const name of [...COLLECTIONS, REMINDER_COLLECTION]) {
      expect(`${name} creatorOwns:${policy.collections[name].creatorOwns}`).toBe(`${name} creatorOwns:true`);
      expect(`${name} delete:${policy.collections[name].permissions.delete}`).toBe(`${name} delete:nobody`);
      expect(`${name} find:${policy.collections[name].permissions.find}`).toBe(`${name} find:authenticated`);
    }
    expect(policy.functions).toEqual({});
  });
});

// ── §3 ─────────────────────────────────────────────────────────────────────

describe('§3 the history is not optional', () => {
  const RECORD_WRITES = ['NewDbModelProperties', 'SetDbModelProperties'];

  it('no node anywhere can delete a record', () => {
    expect(allNodes().filter((n) => n.node.type === 'DeleteDbModelProperties').map((n) => n.component)).toEqual([]);
  });

  it('every command places Logic/Write history, and every record it writes is followed by it', () => {
    const commands = componentsOf().filter((c) => c.name.startsWith('/Commands/'));
    // Counted off the SOURCES, never typed: a command added without its history writer
    // must redden the rule below, not this line.
    expect(commands).toHaveLength(TPL008_COMPONENTS.filter((c) => c.path.startsWith('Commands/')).length);
    for (const c of commands) {
      const history = nodesOf(c).filter((n) => n.type === C.writeHistory);
      expect(`${c.name} history nodes:${history.length}`).toBe(`${c.name} history nodes:1`);
      const into = (c.graph?.connections ?? []).filter((w) => w.toId === history[0].id && w.toProperty === 'do');
      expect(`${c.name} wires into history.do:${into.length > 0}`).toBe(`${c.name} wires into history.do:true`);
    }
  });

  it('only Logic/Write history writes Event — and it both creates and extends', () => {
    const eventWriters = allNodes().filter(
      (n) => RECORD_WRITES.includes(String(n.node.type)) && (n.node.parameters as { collectionName?: string })?.collectionName === 'Event'
    );
    expect([...new Set(eventWriters.map((n) => n.component))]).toEqual([C.writeHistory]);
    expect(eventWriters.map((n) => n.node.type).sort()).toEqual(RECORD_WRITES);
  });

  it('🔴 every Function whose run is wired has Run On Value Change OFF on every input wired into it', () => {
    // A wired `run` does not stop a value change from running the script. The first
    // drive caught a move command re-running — and moving a task — whenever a row
    // was clicked, because one input had been wired from outside the guard's list.
    const loud: string[] = [];
    for (const c of componentsOf()) {
      const wires = c.graph?.connections ?? [];
      for (const n of nodesOf(c).filter((x) => x.type === 'JavaScriptFunction')) {
        if (!wires.some((w) => w.toId === n.id && w.toProperty === 'run')) continue;
        for (const w of wires.filter((x) => x.toId === n.id && String(x.toProperty).startsWith('in-'))) {
          if ((n.parameters as Record<string, unknown>)?.[`runOnChange-${w.toProperty}`] !== false) {
            loud.push(`${c.name} ${n.id}.${w.toProperty}`);
          }
        }
      }
    }
    expect(loud).toEqual([]);
  });

  it('every States node has transitions OFF (D49: with them on it never publishes a colour)', () => {
    const on = allNodes().filter((n) => n.node.type === 'States' && (n.node.parameters as { useTransitions?: boolean })?.useTransitions !== false);
    expect(on.map((n) => `${n.component} ${n.node.id}`)).toEqual([]);
  });
});

// ── §4 ─────────────────────────────────────────────────────────────────────

describe('§4 the look Richard approved', () => {
  it('uses three type sizes and no fourth', () => {
    const sizes = new Set<string>();
    for (const { node } of allNodes()) {
      for (const [k, v] of Object.entries(node.parameters ?? {})) {
        if (/fontSize$/i.test(k)) sizes.add(JSON.stringify(v));
      }
    }
    expect([...sizes].sort()).toEqual(['"var(--text-base)"', '"var(--text-sm)"', '"var(--text-xl)"']);
  });

  it('🔴 every icon button has a name a screen reader can say, and hides the words (D72: Button has no accessible-name port)', () => {
    // The label is the name; `font-size: 0` hides the words and the icon keeps its own size.
    const seen: string[] = [];
    const loud: string[] = [];
    for (const c of componentsOf()) {
      const wires = c.graph?.connections ?? [];
      for (const n of nodesOf(c).filter((x) => x.type === 'net.noodl.controls.button')) {
        const p = (n.parameters ?? {}) as { useIcon?: boolean; label?: string; styleCss?: string };
        if (!p.useIcon) continue;
        seen.push(`${c.name} ${n.id}`);
        const named = String(p.label ?? '').trim() !== '' || wires.some((w) => w.toId === n.id && w.toProperty === 'label');
        if (!named) loud.push(`${c.name} ${n.id} has no name`);
        if (!/font-size:\s*0/.test(String(p.styleCss ?? ''))) loud.push(`${c.name} ${n.id} shows its words`);
      }
    }
    // The control: the rule reached every icon button there is — two moves and a tick box per
    // row kind, (s8) the next action's Description button, the theme switch's moon and sun,
    // and (s6) the reminders bell's two.
    expect(seen.sort()).toEqual(
      [
        '/Todo/Action row arCheck',
        '/Todo/Action row arDescOpen',
        '/Todo/Action row arDown',
        '/Todo/Action row arUp',
        '/Todo/Task row trClose',
        '/Todo/Task row trDown',
        '/Todo/Task row trUp',
        '/Todo/Reminders switch rmTurnOff',
        '/Todo/Reminders switch rmTurnOn',
        '/Todo/Theme switch thToDark',
        '/Todo/Theme switch thToLight'
      ].sort()
    );
    expect(loud).toEqual([]);
  });

  it('every pair it draws passes WCAG AA in BOTH palettes, recomputed from the tokens', () => {
    const lum = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a: string, b: string) => {
      const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
      return (x + 0.05) / (y + 0.05);
    };
    const failing: unknown[] = [];
    let measured = 0;
    for (const [palette, set] of [['light', TPL008_TOKENS], ['dark', TPL008_DARK_TOKENS]] as const) {
      const token = (name: string) => {
        const found = set.find((t) => t.name === name);
        if (!found) throw new Error(`no ${palette} token ${name}`);
        return found.value;
      };
      for (const p of CONTRAST_PAIRS) {
        measured++;
        const r = Math.round(ratio(token(p.fg), token(p.bg)) * 100) / 100;
        if (r < p.floor) failing.push({ palette, ...p, ratio: r });
      }
    }
    expect(measured).toBe(CONTRAST_PAIRS.length * 2);
    expect(failing).toEqual([]);
  });
});

// ── §4b ────────────────────────────────────────────────────────────────────

describe('§4b light and dark — following the system, and the switch at the top right', () => {
  const component = (name: string) => {
    const found = componentsOf().find((c) => c.name === name);
    if (!found) throw new Error(`no component ${name}`);
    return found;
  };

  it('the dark palette overrides exactly the colour tokens the light one does', () => {
    const colours = (set: ReadonlyArray<{ name: string; value: string }>) => set.filter((t) => /^#[0-9a-f]{6}$/i.test(t.value)).map((t) => t.name).sort();
    expect(colours(TPL008_TOKENS).length).toBeGreaterThan(0);
    expect(TPL008_DARK_TOKENS.map((t) => t.name).sort()).toEqual(colours(TPL008_TOKENS));
  });

  it('App carries every dark token under BOTH conditions, and puts a remembered choice back at load', () => {
    const app = component('/App');
    const css = nodesOf(app).find((n) => n.type === 'CSS Definition');
    const style = String((css?.parameters as { style?: string })?.style ?? '');
    expect(style).toBe(themeCss());
    const twice = TPL008_DARK_TOKENS.filter((t) => style.split(`${t.name}: ${t.value};`).length - 1 !== 2).map((t) => t.name);
    expect(twice).toEqual([]);
    expect(style).toContain('@media (prefers-color-scheme: dark)');
    expect(style).toContain(':root[data-theme="dark"]');
    // 🔴 A Function runs at load only while its Run is NOT wired.
    const boot = nodesOf(app).find((n) => n.type === 'JavaScriptFunction');
    expect((boot?.parameters as { functionScript?: string })?.functionScript).toBe(THEME_BOOT_SCRIPT);
    expect((app.graph?.connections ?? []).filter((w) => w.toId === boot?.id)).toEqual([]);
  });

  it('the switch is two icon buttons the stylesheet chooses between, both running the one flip — placed on both pages', () => {
    const sw = component(C.themeSwitch);
    const buttons = nodesOf(sw).filter((n) => n.type === 'net.noodl.controls.button');
    expect(buttons.map((b) => [b.id, (b.parameters as { cssClassName?: string }).cssClassName])).toEqual([
      ['thToDark', THEME_TO_DARK_CLASS],
      ['thToLight', THEME_TO_LIGHT_CLASS]
    ]);
    const flip = nodesOf(sw).find((n) => n.type === 'JavaScriptFunction');
    expect((flip?.parameters as { functionScript?: string })?.functionScript).toBe(THEME_FLIP_SCRIPT);
    expect(
      (sw.graph?.connections ?? []).filter((w) => w.toId === flip?.id).map((w) => `${w.fromId}.${w.fromProperty} → ${w.toProperty}`).sort()
    ).toEqual(['thToDark.onClick → run', 'thToLight.onClick → run']);
    const placedIn = allNodes().filter((n) => n.node.type === C.themeSwitch).map((n) => n.component).sort();
    expect(placedIn).toEqual([C.header, C.pageSignIn].sort());
  });

  it('s6: the reminders bell is two icon buttons that only hand the press to the host, placed only in the Header, hidden without a host', () => {
    const sw = component(C.remindersSwitch);
    const buttons = nodesOf(sw).filter((n) => n.type === 'net.noodl.controls.button');
    expect(
      buttons.map((b) => {
        const p = b.parameters as { cssClassName?: string; label?: string };
        return [b.id, p.cssClassName, p.label];
      })
    ).toEqual([
      ['rmTurnOn', REMINDERS_TURN_ON_CLASS, 'Turn reminders on'],
      ['rmTurnOff', REMINDERS_TURN_OFF_CLASS, 'Turn reminders off']
    ]);
    const toggle = nodesOf(sw).find((n) => n.type === 'JavaScriptFunction');
    expect((toggle?.parameters as { functionScript?: string })?.functionScript).toBe(REMINDERS_TOGGLE_SCRIPT);
    expect(
      (sw.graph?.connections ?? []).filter((w) => w.toId === toggle?.id).map((w) => `${w.fromId}.${w.fromProperty} → ${w.toProperty}`).sort()
    ).toEqual(['rmTurnOff.onClick → run', 'rmTurnOn.onClick → run']);
    // A subscription belongs to whoever is signed in, so not on Sign in.
    expect(allNodes().filter((n) => n.node.type === C.remindersSwitch).map((n) => n.component)).toEqual([C.header]);

    // Which bell shows is the stylesheet's: none without the host's attribute; `on` hides "turn on"; anything else hides "turn off".
    const style = themeCss();
    const hide = (root: string, cls: string) => `${root} .${cls} { display: none !important; }`;
    expect(style).toContain(hide(`:root:not([${REMINDERS_ATTRIBUTE}])`, REMINDERS_TURN_ON_CLASS));
    expect(style).toContain(hide(`:root:not([${REMINDERS_ATTRIBUTE}="on"])`, REMINDERS_TURN_OFF_CLASS));
    expect(style).toContain(hide(`:root[${REMINDERS_ATTRIBUTE}="on"]`, REMINDERS_TURN_ON_CLASS));

    // The press: nothing where there is no host (the demo, the editor), one hand-over where there is.
    const calls: string[] = [];
    const press = (win: unknown) => new Function('window', REMINDERS_TOGGLE_SCRIPT)(win);
    press({});
    press({ todoReminders: {} });
    press({ todoReminders: { toggle: () => calls.push('toggle') } });
    expect(calls).toEqual(['toggle']);
  });

  it('the scripts: the other theme, remembered only when it differs from the system, and working with storage blocked', () => {
    /** A browser: a system setting, a storage that may throw, and a fresh document per page load. */
    const browser = (systemDark: boolean, blocked = false) => {
      const map = new Map<string, string>();
      const guard = () => {
        if (blocked) throw new Error('storage is blocked');
      };
      const win: Record<string, unknown> = {
        matchMedia: (q: string) => ({ matches: q === '(prefers-color-scheme: dark)' && systemDark }),
        localStorage: {
          getItem: (k: string) => (guard(), map.has(k) ? (map.get(k) as string) : null),
          setItem: (k: string, v: string) => (guard(), void map.set(k, v)),
          removeItem: (k: string) => (guard(), void map.delete(k))
        }
      };
      let attrs = new Map<string, string>();
      const doc = {
        documentElement: {
          setAttribute: (k: string, v: string) => void attrs.set(k, v),
          removeAttribute: (k: string) => void attrs.delete(k)
        }
      };
      // eslint-disable-next-line no-new-func
      const run = (script: string) => new Function('window', 'document', script)(win, doc);
      const read = () => `${attrs.get('data-theme') ?? '-'}/${blocked ? 'blocked' : map.get(THEME_STORAGE_KEY) ?? '-'}`;
      return {
        map,
        boot: () => ((attrs = new Map()), run(THEME_BOOT_SCRIPT), read()),
        flip: () => (run(THEME_FLIP_SCRIPT), read())
      };
    };

    const light = browser(false);
    const dark = browser(true);
    const blocked = browser(false, true);
    const odd = browser(false);
    odd.map.set(THEME_STORAGE_KEY, 'purple');
    expect({
      light: [light.boot(), light.flip(), light.boot(), light.flip(), light.boot()],
      dark: [dark.boot(), dark.flip(), dark.boot(), dark.flip()],
      blocked: [blocked.boot(), blocked.flip(), blocked.boot(), blocked.flip()],
      odd: [odd.boot()]
    }).toEqual({
      // Nothing chosen → dark is chosen and remembered → a new page keeps it → light again forgets it.
      light: ['-/-', 'dark/dark', 'dark/dark', '-/-', '-/-'],
      dark: ['-/-', 'light/light', 'light/light', '-/-'],
      // No storage: the choice still holds for the visit.
      blocked: ['-/blocked', 'dark/blocked', 'dark/blocked', '-/blocked'],
      // A stored value that is not a theme is ignored, and left alone.
      odd: ['-/purple']
    });
  });
});

// ── §5 ─────────────────────────────────────────────────────────────────────

/** Run a Function node's script the way the runtime does: `Inputs` in, `Outputs` out, signals as calls. */
function run(script: string, inputs: Record<string, unknown>): { outputs: Record<string, unknown>; signals: string[] } {
  const signals: string[] = [];
  const outputs = new Proxy({} as Record<string, unknown>, {
    get(target, key: string) {
      if (key in target) return target[key];
      return () => signals.push(key);
    }
  });
  // eslint-disable-next-line no-new-func
  new Function('Inputs', 'Outputs', script)(inputs, outputs);
  return { outputs: { ...outputs }, signals };
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

describe('§5 the scripts', () => {
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  const tasks = [
    { id: 'b', title: 'Second', position: 2, status: 'open', deadline: iso(yesterday) },
    { id: 'a', title: 'First', position: 1, status: 'open', deadline: '' },
    { id: 'z', title: 'Closed one', position: 7, status: 'done', closingNote: 'Did it.', closedAt: today.toISOString() },
    { id: 'c', title: 'Third', position: 3, status: 'open', deadline: '' }
  ];
  const actions = [
    { id: 'x2', taskId: 'a', title: 'Later step', position: 2, done: false },
    { id: 'x1', taskId: 'a', title: 'First step', position: 1, done: false },
    { id: 'x0', taskId: 'a', title: 'Done step', position: 0, done: true, note: 'ok' }
  ];

  it('Task rows: open tasks by position, ids kept, the next OPEN action shown, overdue in the destructive colour', () => {
    const { outputs } = run(TASK_ROWS_SCRIPT, { tasks, actions, selectedId: 'b' });
    const rows = outputs.openRows as Array<Record<string, unknown>>;
    expect(rows.map((r) => [r.id, r.rank, r.title])).toEqual([['a', '1', 'First'], ['b', '2', 'Second'], ['c', '3', 'Third']]);
    expect(rows[0].meta).toBe('Next: First step');
    expect(rows[1].meta).toBe('Overdue by 1 day');
    expect(rows[1].metaColor).toBe('var(--destructive)');
    expect(rows[1].bg).toBe('var(--surface)');
    expect([rows[0].canUp, rows[2].canDown]).toEqual([false, false]);
    expect(outputs.nextPosition).toBe(8);
    expect([outputs.listLabel, outputs.doneLabel, outputs.addSummary]).toEqual(['List (3)', 'Done (1)', 'Added at #4']);
  });

  it('Selected task: open actions numbered first, ticked ones after; the rank line counts only open tasks', () => {
    const { outputs } = run(SELECTED_SCRIPT, { tasks, actions, events: [], selectedId: 'a' });
    const rows = outputs.actionRows as Array<Record<string, unknown>>;
    expect(rows.map((r) => [r.id, r.num])).toEqual([['x1', '1'], ['x2', '2'], ['x0', '']]);
    expect(rows.map((r) => r.checkLabel)).toEqual(['Mark done', 'Mark done', 'Mark not done']);
    expect((outputs.openActionRows as unknown[]).length).toBe(2);
    expect(String(outputs.rankLine)).toMatch(/^#1 of 3/);
    expect(outputs.nextActionPosition).toBe(3);
    expect(run(SELECTED_SCRIPT, { tasks, actions, events: [], selectedId: 'nope' }).outputs.found).toBe(false);
  });

  it('Log rows: newest first, the day named once per day, the task named by title', () => {
    // Both "today" stamps taken NOW: the describe-scope `today` is older than the
    // build this file waits for, which put e3 after e2 in the first run.
    const now = Date.now();
    const events = [
      { id: 'e1', taskId: 'a', kind: 'created', summary: 'Added at #1', at: yesterday.toISOString() },
      { id: 'e2', taskId: 'a', kind: 'note', summary: 'Note', body: 'hi', at: new Date(now).toISOString() },
      { id: 'e3', taskId: 'b', kind: 'created', summary: 'Added at #2', at: new Date(now - 1000).toISOString() }
    ];
    const rows = run(LOG_ROWS_SCRIPT, { events, tasks }).outputs.rows as Array<Record<string, unknown>>;
    expect(rows.map((r) => [r.id, r.showDay, r.taskTitle])).toEqual([['e2', true, 'First'], ['e3', false, 'Second'], ['e1', true, 'First']]);
  });

  it('Move: up swaps positions with the neighbour; top goes above the first; the ends do nothing', () => {
    const rows = [{ id: 'a', position: 1 }, { id: 'b', position: 2 }, { id: 'c', position: 5 }];
    const up = run(MOVE_SCRIPT, { rows, itemId: 'c', direction: 'up' });
    expect(up.outputs).toMatchObject({ firstId: 'c', firstPosition: 2, secondId: 'b', secondPosition: 5, hasSecond: true, from: 3, to: 2 });
    expect(up.signals).toEqual(['go']);
    const top = run(MOVE_SCRIPT, { rows, itemId: 'c', direction: 'top' });
    expect(top.outputs).toMatchObject({ firstId: 'c', firstPosition: 0, hasSecond: false, from: 3, to: 1 });
    expect(run(MOVE_SCRIPT, { rows, itemId: 'a', direction: 'up' }).signals).toEqual([]);
    expect(run(MOVE_SCRIPT, { rows, itemId: 'c', direction: 'down' }).signals).toEqual([]);
  });

  it('Write history: a second move of the same task within the window EXTENDS the line, keeping where it started', () => {
    const first = run(DECIDE_HISTORY_SCRIPT, { taskId: 't', kind: 'moved', from: 3, to: 2, last: {} });
    expect(first.signals).toEqual(['create']);
    expect(first.outputs.summary).toBe('Moved #3 → #2');
    const last = { ...(first.outputs.pending as object), id: 'ev1' };
    const second = run(DECIDE_HISTORY_SCRIPT, { taskId: 't', kind: 'moved', from: 2, to: 1, last });
    expect(second.signals).toEqual(['update']);
    expect([second.outputs.mergeId, second.outputs.summary]).toEqual(['ev1', 'Moved #3 → #1']);
    // A different task, a different kind, or an old line: a new line.
    expect(run(DECIDE_HISTORY_SCRIPT, { taskId: 'u', kind: 'moved', from: 2, to: 1, last }).signals).toEqual(['create']);
    expect(run(DECIDE_HISTORY_SCRIPT, { taskId: 't', kind: 'note', summary: 'Note', last }).signals).toEqual(['create']);
    const stale = { ...last, at: Date.now() - MERGE_WINDOW_MS - 1 };
    expect(run(DECIDE_HISTORY_SCRIPT, { taskId: 't', kind: 'moved', from: 2, to: 1, last: stale }).signals).toEqual(['create']);
  });

  it('Set deadline: ISO dates, "today" and "" are accepted; anything else is refused in words; an unchanged date writes nothing', () => {
    const ok = run(DEADLINE_SCRIPT, { taskId: 't', text: '2026-9-3', current: '' });
    expect([ok.outputs.value, ok.outputs.hasError, ok.signals]).toEqual(['2026-09-03', false, ['go']]);
    expect(run(DEADLINE_SCRIPT, { taskId: 't', text: 'today', current: '' }).outputs.value).toBe(iso(today));
    expect(run(DEADLINE_SCRIPT, { taskId: 't', text: '', current: '2026-09-03' }).outputs.summary).toBe('Deadline cleared');
    const bad = run(DEADLINE_SCRIPT, { taskId: 't', text: '2026-02-30', current: '' });
    expect([bad.outputs.hasError, bad.signals]).toEqual([true, []]);
    expect(run(DEADLINE_SCRIPT, { taskId: 't', text: '2026-09-03', current: '2026-09-03' }).signals).toEqual([]);
  });
});
