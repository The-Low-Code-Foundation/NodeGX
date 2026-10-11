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
  LINK_BOOT_SCRIPT,
  LINK_KEY,
  LINK_OPEN_SCRIPT,
  LOG_ROWS_SCRIPT,
  MERGE_WINDOW_MS,
  MOVE_SCRIPT,
  NEXT_FOR_SCRIPT,
  PROJECT_COLLECTIONS,
  PROJECT_ROW_PREFIX,
  PROJECT_ROWS_SCRIPT,
  PROJECTS_CARRY_SCRIPT,
  PROJECTS_FLAG_KEEP_SCRIPT,
  PROJECTS_FLAG_KEY,
  PROJECTS_FLAG_READ_SCRIPT,
  PROJECTS_LOAD_SCRIPT,
  MARK_MONEY_SCRIPT,
  RECORD_BALANCE_SCRIPT,
  REMINDER_COLLECTION,
  ROW_SUBMIT_SCRIPT,
  SAVE_MOVE_SCRIPT,
  // TPL-008-PJ s2
  END_MONEY_ITEM_SCRIPT,
  MONEY_EDITOR_SCRIPT,
  MONEY_LIST_SCRIPT,
  MONEY_SHEET_SCRIPT,
  MOVE_FORM_SCRIPT,
  NEW_FOR_PROJECT_SCRIPT,
  NEXT_PROMPT_FORM_SCRIPT,
  PROJECT_EDITOR_SCRIPT,
  ROW_FORMS_SCRIPT,
  SAVE_MONEY_ITEM_SCRIPT,
  SAVE_PROJECT_SCRIPT,
  SHEET_BACK_SCRIPT,
  TASK_PROJECT_SCRIPT,
  // TPL-008-PJ s3
  LINK_FORM_SCRIPT,
  MOVE_PROJECT_SCRIPT,
  PROJECT_KIND_ROW_PREFIX,
  PROJECTS_ORDER_KEY,
  PROJECTS_ORDER_READ_SCRIPT,
  SET_TASK_PROJECT_SCRIPT,
  projectsOrderKeepScript,
  SELECTED_SCRIPT,
  TASK_ROWS_SCRIPT,
  TOGGLE_PROJECT_SCRIPT,
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

  it('is enforced, names exactly the list’s collections, the projects’ (PJ) and the reminders one, keeps rows private and refuses every delete', () => {
    expect(policy.devOpen).toBe(false);
    expect(Object.keys(policy.collections).sort()).toEqual([...COLLECTIONS, ...PROJECT_COLLECTIONS, REMINDER_COLLECTION].sort());
    // s6: turning reminders off keeps the device's row with `enabled: false`, so nothing needs a delete there either.
    for (const name of [...COLLECTIONS, ...PROJECT_COLLECTIONS, REMINDER_COLLECTION]) {
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

  /**
   * 🔴 **D77 — an icon port in a project with no icon module renders nothing, and nothing says
   * so.** Lucide is a library module; a template ships none. Every one of the buttons below was
   * drawing `<span class="lucide icon-…"></span>` — an empty box — and had been since this
   * template was published to the shelf. Measured 2026-09-21 on `templates/todo-list-demo`:
   * *"17 text elements and not one picture or glyph"*. The glyph is the label now.
   *
   * The control is the list: the rule has to reach every icon button there is — two moves and a
   * tick box per row kind, (s8) the next action's Description button, the theme switch's moon
   * and sun, and (s6) the reminders bell's two.
   */
  it('🔴 no node asks for an icon, and every button that used one draws a character instead (D77)', () => {
    const asking: string[] = [];
    for (const { component, node } of allNodes()) {
      const p = (node.parameters ?? {}) as Record<string, unknown>;
      if (p.useIcon === true || JSON.stringify(p).includes('"lucide"')) asking.push(`${component} ${node.id}`);
    }
    expect(asking).toEqual([]);

    const GLYPH_BUTTONS = [
      '/Todo/Action row arCheck',
      '/Todo/Action row arDescOpen',
      '/Todo/Task row trClose',
      '/Todo/Reminders switch rmTurnOff',
      '/Todo/Reminders switch rmTurnOn',
      '/Todo/Theme switch thToDark',
      '/Todo/Theme switch thToLight',
      // TPL-008-RC: Today's tick box, and the ✕ on a time in a schedule.
      '/Todo/Today row yrTick',
      '/Todo/Slot chip scRemove'
    ].sort();

    const drawn: string[] = [];
    const silent: string[] = [];
    for (const c of componentsOf()) {
      for (const n of nodesOf(c).filter((x) => x.type === 'net.noodl.controls.button')) {
        const key = `${c.name} ${n.id}`;
        if (!GLYPH_BUTTONS.includes(key)) continue;
        drawn.push(key);
        const p = (n.parameters ?? {}) as { label?: string; styleCss?: string };
        const label = String(p.label ?? '');
        // One character, and nothing hiding it: `font-size: 0` was the old workaround and it
        // is what made these buttons invisible once the icon failed to arrive.
        if (label.trim() === '') silent.push(`${key} has no glyph`);
        if (/font-size:\s*0/.test(String(p.styleCss ?? ''))) silent.push(`${key} is hidden by font-size: 0`);
      }
    }
    expect(drawn.sort()).toEqual(GLYPH_BUTTONS);
    expect(silent).toEqual([]);
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
      // D77: the crossed-out bell turns them on, the ringing one turns them off. These were
      // 'Turn reminders on' / 'Turn reminders off' when the label was a hidden name and an
      // icon drew the bell — an icon that was never installed, so nothing drew at all.
      ['rmTurnOn', REMINDERS_TURN_ON_CLASS, '🔕'],
      ['rmTurnOff', REMINDERS_TURN_OFF_CLASS, '🔔']
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
    expect(outputs.nextPosition).toBe(8);
    expect([outputs.listLabel, outputs.doneLabel, outputs.addSummary]).toEqual(['List (3)', 'Done (1)', 'Added at #4']);
  });

  it('Selected task: open actions numbered first, ticked ones after; the rank line counts only open tasks', () => {
    const { outputs } = run(SELECTED_SCRIPT, { tasks, actions, events: [], selectedId: 'a' });
    const rows = outputs.actionRows as Array<Record<string, unknown>>;
    expect(rows.map((r) => [r.id, r.num])).toEqual([['x1', '1'], ['x2', '2'], ['x0', '']]);
    // ⚠️ `checkLabel` is gone: it named the tick box for a screen reader, and the label now
    // has to carry the tick itself (D72 — a Button has no accessible-name port; D77 — the icon
    // that used to carry it is not installed). The colour is what still says done or not.
    expect(rows.map((r) => r.checkIconColor)).toEqual([
      'var(--border-control)',
      'var(--border-control)',
      'var(--primary-foreground)'
    ]);
    expect(rows.every((r) => !('checkLabel' in r))).toBe(true);
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

  it('Move to (a drag): one write, between the new neighbours — to the top, the bottom, up or down the middle', () => {
    const rows = [{ id: 'a', position: 1 }, { id: 'b', position: 2 }, { id: 'c', position: 5 }, { id: 'd', position: 6 }];
    const to = (itemId: string, toIndex: unknown) => run(MOVE_SCRIPT, { rows, itemId, direction: 'to', toIndex });
    expect(to('d', 0).outputs).toMatchObject({ firstId: 'd', firstPosition: 0, hasSecond: false, from: 4, to: 1 });
    expect(to('a', 3).outputs).toMatchObject({ firstPosition: 7, from: 1, to: 4 });
    expect(to('d', 1).outputs).toMatchObject({ firstPosition: 1.5, from: 4, to: 2 }); // up: between a and b
    expect(to('a', 2).outputs).toMatchObject({ firstPosition: 5.5, from: 1, to: 3 }); // down: between c and d
    // Where it already is, off either end, or not a number: nothing is written.
    expect([to('b', 1), to('b', 4), to('b', -1), to('b', 'x'), to('b', undefined)].map((r) => r.signals)).toEqual([[], [], [], [], []]);
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
    expect([ok.outputs.value, ok.outputs.verdict, ok.signals]).toEqual(['2026-09-03', { about: 't', error: '' }, ['go']]);
    expect(run(DEADLINE_SCRIPT, { taskId: 't', text: 'today', current: '' }).outputs.value).toBe(iso(today));
    expect(run(DEADLINE_SCRIPT, { taskId: 't', text: '', current: '2026-09-03' }).outputs.summary).toBe('Deadline cleared');
    const bad = run(DEADLINE_SCRIPT, { taskId: 't', text: '2026-02-30', current: '' });
    expect([bad.outputs.verdict, bad.signals]).toEqual([{ about: 't', error: 'Use a date like 2026-09-30, or leave it empty.' }, []]);
    expect(run(DEADLINE_SCRIPT, { taskId: 't', text: '2026-09-03', current: '2026-09-03' }).signals).toEqual([]);
  });
});

describe('§6 a link to one task (TPL-010-L L5)', () => {
  const browser = (search: string, stored: Record<string, string> = {}) => {
    const store = { ...stored };
    return {
      store,
      window: {
        location: { search },
        sessionStorage: {
          getItem: (k: string) => (k in store ? store[k] : null),
          setItem: (k: string, v: string) => {
            store[k] = v;
          },
          removeItem: (k: string) => {
            delete store[k];
          }
        }
      }
    };
  };
  const runOpen = (win: unknown) => {
    const signals: string[] = [];
    const outputs = new Proxy({} as Record<string, unknown>, { get: (t, k: string) => (k in t ? t[k] : () => signals.push(k)) });
    // eslint-disable-next-line no-new-func
    new Function('Inputs', 'Outputs', 'window', LINK_OPEN_SCRIPT).call({}, {}, outputs, win);
    return { outputs: { ...outputs }, signals };
  };

  it('?task= is kept at load, and read — once — when the list loads', () => {
    const b = browser('?task=abc%20123');
    // eslint-disable-next-line no-new-func
    new Function('window', LINK_BOOT_SCRIPT)(b.window);
    expect(b.store[LINK_KEY]).toBe('abc 123');
    // After the sign-in detour the query is gone; the kept id still opens the task.
    const after = browser('', b.store);
    expect(runOpen(after.window)).toEqual({ outputs: { taskId: 'abc 123' }, signals: ['open'] });
    expect(after.store[LINK_KEY]).toBeUndefined();
    expect(runOpen(browser('').window).signals).toEqual([]);
    expect(runOpen(browser('?task=xyz').window).outputs.taskId).toBe('xyz');
  });

  it('the page selects it through its own Set Variable, and loads its history', () => {
    const page = componentsOf().find((c) => c.name === C.pageTodo) as LegacyComponent;
    const wires = (page.graph?.connections ?? []) as unknown as Array<Record<string, string>>;
    const has = (f: string, fp: string, t: string, tp: string) => wires.some((w) => w.fromId === f && w.fromProperty === fp && w.toId === t && w.toProperty === tp);
    expect(has('tdAuth', 'ontrue', 'tdLinkOpen', 'run')).toBe(true);
    expect(has('tdLinkOpen', 'out-taskId', 'tdSelectFromLink', 'value')).toBe(true);
    expect(has('tdLinkOpen', 'out-open', 'tdSelectFromLink', 'do')).toBe(true);
    expect(has('tdSelectFromLink', 'done', 'tdData', 'loadHistory')).toBe(true);
    // 🔴 The script that shipped, not undefined: declared below the page, it was built empty.
    const open = nodesOf(page).find((n) => n.id === 'tdLinkOpen');
    expect((open?.parameters as { functionScript?: string })?.functionScript).toBe(LINK_OPEN_SCRIPT);
    const app = componentsOf().find((c) => c.name === '/App') as LegacyComponent;
    expect((nodesOf(app).find((n) => n.id === 'app_link')?.parameters as { functionScript?: string })?.functionScript).toBe(LINK_BOOT_SCRIPT);
  });
});

// ── §7 ─────────────────────────────────────────────────────────────────────

/**
 * TPL-008-PJ — Planning, folded in as the Projects tab. The scripts run against a fake records
 * API that keeps rows the way the backend does (plain, with `objectId`), so what each write
 * leaves behind is read back, not assumed.
 */
type Rec = Record<string, unknown>;
function fakeRecords(seed: Record<string, Rec[]> = {}, asRecords = false) {
  const db: Record<string, Rec[]> = {};
  for (const [k, v] of Object.entries(seed)) db[k] = v.map((r) => ({ ...r }));
  let n = 0;
  const writes: string[] = [];
  const Records = {
    // `asRecords`: what a viewer built before HLT-022 returns whatever `plain` says — the record itself.
    query: (cls: string) =>
      Promise.resolve(
        (db[cls] ?? []).map((r) => {
          const copy = JSON.parse(JSON.stringify(r)) as Rec;
          if (!asRecords) return copy;
          const { objectId, ...data } = copy;
          return { data, getId: () => objectId, get: (k: string) => data[k] };
        })
      ),
    create: (cls: string, data: Rec) => {
      const objectId = `${cls.toLowerCase()}${++n}`;
      (db[cls] = db[cls] ?? []).push({ objectId, createdAt: new Date().toISOString(), ...data });
      writes.push(`create ${cls}`);
      return Promise.resolve({ getId: () => objectId });
    },
    save: (id: string, data: Rec, options: { className: string }) => {
      const row = (db[options.className] ?? []).find((r) => r.objectId === id);
      if (!row) return Promise.reject(new Error(`no ${options.className} ${id}`));
      Object.assign(row, data);
      writes.push(`save ${options.className}`);
      return Promise.resolve();
    }
  };
  return { db, writes, Noodl: { Records } };
}
/** Run a script that writes through the records API, and wait for the promises it started. */
async function runWrites(script: string, inputs: Rec, noodl: unknown, self: object = {}) {
  const signals: string[] = [];
  const outputs = new Proxy({} as Rec, { get: (t, k: string) => (k in t ? t[k] : () => signals.push(k)) });
  // eslint-disable-next-line no-new-func
  new Function('Inputs', 'Outputs', 'Noodl', script).call(self, inputs, outputs, noodl);
  await new Promise((r) => setTimeout(r, 0));
  return { outputs: { ...outputs }, signals };
}
const plainWithId = (list: Rec[]) => list.map((r) => ({ ...r, id: r.objectId }));
const dayOffset = (days: number) => iso(new Date(Date.now() + days * 86_400_000));

describe('§7 Projects (TPL-008-PJ)', () => {
  const projects = [
    { id: 'p1', name: 'Salon Collective', kind: 'earning', position: 1 },
    { id: 'p2', name: 'Bramble & Co', kind: 'earning', position: 2 },
    { id: 'p3', name: 'Founder A', kind: 'earning', position: 3 },
    { id: 'p4', name: 'Old thing', kind: 'dormant', position: 4 },
    { id: 'p5', name: 'Admin and asks', kind: 'admin', position: 5 },
    { id: 'p6', name: 'Own course', kind: 'building', position: 6 }
  ];
  const tasks = [
    { id: 't1', title: 'Chase the September invoice', status: 'open', position: 4, projectId: 'p1', deadline: '' },
    { id: 't2', title: 'Send the revised quote', status: 'open', position: 2, projectId: 'p2', deadline: dayOffset(0) },
    { id: 't3', title: 'Sam sends the data access', status: 'open', position: 3, projectId: 'p3', waitingOn: 'Sam', createdAt: new Date(Date.now() - 6 * 86_400_000).toISOString() },
    { id: 't4', title: 'Call the bank', status: 'open', position: 1, deadline: '' },
    { id: 't5', title: 'Wrote the proposal', status: 'done', position: 0, projectId: 'p2', closingNote: 'Sent to Ana', closedAt: new Date(Date.now() - 86_400_000).toISOString() }
  ];
  const items = [
    { id: 'i1', label: 'Salon retainer', amount: 1200, repeat: 'monthly', date: dayOffset(-10), projectId: 'p1', likelihood: 100 },
    { id: 'i2', label: 'Rent', amount: -1500, repeat: 'monthly', date: dayOffset(5), likelihood: 100 },
    { id: 'i3', label: 'Founder A', amount: 2000, repeat: 'monthly', date: dayOffset(20), projectId: 'p3', likelihood: 50 }
  ];
  const readings = [{ id: 'r1', date: dayOffset(-1), amount: 1000 }];
  const rowsOf = (extra: Rec = {}) => run(PROJECT_ROWS_SCRIPT, { tasks, projects, items, marks: [], readings, openId: '', flag: '', ...extra }).outputs;

  it('the morning order: late money first, then a move due today, then the rest; waiting and quiet apart; admin never', () => {
    const out = rowsOf();
    const rows = out.rows as Rec[];
    expect(rows.map((r) => (r.isHeading ? `# ${r.heading}` : r.name))).toEqual([
      '# Your move', 'Salon Collective', 'Bramble & Co', 'Own course',
      '# Waiting on someone', 'Founder A',
      '# Quiet', 'Old thing'
    ]);
    const salon = rows.find((r) => r.name === 'Salon Collective') as Rec;
    expect([salon.moneyText, salon.moneyColor, salon.edge, salon.hasBill]).toEqual(['€1,200 · 10 days late', 'var(--destructive)', 'var(--destructive)', true]);
    const bramble = rows.find((r) => r.name === 'Bramble & Co') as Rec;
    expect([bramble.moveText, bramble.metaText, bramble.doneLabel, bramble.hasHistory]).toEqual(['Send the revised quote', 'Due today', 'Done', true]);
    expect(String(bramble.history)).toMatch(/Done: Wrote the proposal \(Sent to Ana\)$/);
    const founder = rows.find((r) => r.name === 'Founder A') as Rec;
    expect([founder.doneLabel, founder.waitingRaw]).toEqual(['They did it', 'Sam']);
    expect(String(founder.metaText)).toMatch(/^Waiting on Sam · since /);
    expect(String(founder.moneyText)).toMatch(/^€2,000 a month · 50% likely, /);
    const course = rows.find((r) => r.name === 'Own course') as Rec;
    expect([course.moveText, course.hasMove, course.doneLabel, course.moneyText]).toEqual(['No next move yet. Open it to add one.', false, 'Add the next move', 'Building']);
    expect(out.nextPosition).toBe(5);
    expect(out.projectPosition).toBe(7);
  });

  it('🔴 no row the tab draws carries a record’s id (P78-TPL010-MOVEARROW: a For Each writes a row INTO the record with its id)', () => {
    const rows = rowsOf().rows as Rec[];
    const recordIds = new Set([...projects, ...tasks, ...items].map((r) => r.id));
    expect(rows.filter((r) => recordIds.has(r.id as string))).toEqual([]);
    expect(rows.filter((r) => !r.isHeading).every((r) => String(r.id).startsWith(PROJECT_ROW_PREFIX))).toBe(true);
    const money = rowsOf();
    for (const list of [money.bars, money.incomeRows] as Rec[][]) expect(list.filter((r) => recordIds.has(r.id as string))).toEqual([]);
  });

  it('the money: the balance as read, 31 days of bars, the dip named in red, hoped money left out, money due in with Paid', () => {
    const out = rowsOf();
    expect(out.balanceText).toBe('€1,000');
    expect(String(out.balanceWhen)).toMatch(/^in the bank when you last looked, /);
    expect((out.bars as Rec[]).length).toBe(31);
    // 1,000 + the late 1,200 (counted today) − 1,500 rent in five days = 700: no dip.
    expect(out.lowColor).toBe('var(--muted-foreground)');
    expect(String(out.lowText)).toMatch(/^Lowest in the next 30 days: €700, .* Not counting €2,000 hoped for\.$/);
    const tight = rowsOf({ readings: [{ id: 'r1', date: dayOffset(-1), amount: 100 }] });
    expect(String(tight.lowText)).toMatch(/^Dips to −€200 around /);
    expect(tight.lowColor).toBe('var(--destructive)');
    expect((tight.bars as Rec[]).some((b) => b.mark === 'var(--destructive)')).toBe(true);
    const income = out.incomeRows as Rec[];
    expect(income.map((r) => [r.label, r.amount])).toEqual([['Salon Collective', '€1,200']]);
    expect(String(income[0].meta)).toMatch(/10 days late$/);
  });

  it('the tab: on with projects, off when hidden, on when switched on with none — and the way in only while it is off', () => {
    expect([rowsOf().showTab, rowsOf().showTurnOn]).toEqual([true, false]);
    expect(rowsOf({ flag: 'off' }).showTab).toBe(false);
    const none = run(PROJECT_ROWS_SCRIPT, { tasks: [], projects: [], items: [], marks: [], readings: [], flag: '' }).outputs;
    expect([none.showTab, none.showTurnOn, none.noProjects, none.rows]).toEqual([false, true, true, []]);
    expect(run(PROJECT_ROWS_SCRIPT, { tasks: [], projects: [], items: [], marks: [], readings: [], flag: 'on' }).outputs.showTab).toBe(true);
  });

  it('the list: a project’s task says whose it is and who it waits on', () => {
    const names = rowsOf().projectNames as Record<string, string>;
    const rows = run(TASK_ROWS_SCRIPT, { tasks, actions: [], selectedId: '', projectNames: names }).outputs.openRows as Rec[];
    expect(rows.map((r) => r.meta)).toEqual(['', 'Bramble & Co · Due today', 'Founder A · Waiting on Sam', 'Salon Collective']);
  });

  it('carry-over: arrows off, a sent move linked not copied, a new move made a task, the move emptied — and a second run writes nothing', async () => {
    const f = fakeRecords({
      Project: [
        { objectId: 'p1', name: 'Linguaid', move: '→ → Find out from Joss', moveDue: '2026-10-12' },
        { objectId: 'p2', name: 'Clarion', move: '✓ Wed 30 · ✓ Wed 30 · Call Ade', moveDue: null },
        { objectId: 'p3', name: 'Quiet one', move: '' }
      ],
      Task: [
        { objectId: 'x1', title: '→ Find out from Joss', status: 'open', position: 3 },
        { objectId: 'x2', title: '→ Book the dentist', status: 'open', position: 4 },
        { objectId: 'x3', title: '→ Old one', status: 'done', position: 1 }
      ],
      Event: []
    });
    const first = await runWrites(PROJECTS_CARRY_SCRIPT, { projects: plainWithId(f.db.Project) }, f.Noodl);
    expect(first.signals).toEqual(['changed']);
    expect(f.db.Task.map((t) => [t.title, t.projectId ?? '', t.status, t.deadline ?? ''])).toEqual([
      ['Find out from Joss', 'p1', 'open', '2026-10-12'],
      ['Book the dentist', '', 'open', ''],
      ['→ Old one', '', 'done', ''],
      ['Call Ade', 'p2', 'open', '']
    ]);
    expect(f.db.Task[3].position).toBe(5);
    expect(f.db.Project.map((p) => p.move)).toEqual(['', '', '']);
    expect(f.db.Event.map((e) => e.summary)).toEqual([
      'Renamed from “→ Find out from Joss”',
      'Renamed from “→ Book the dentist”',
      'Now the next move for Linguaid',
      'Carried over from Planning: the next move for Clarion'
    ]);
    const second = await runWrites(PROJECTS_CARRY_SCRIPT, { projects: plainWithId(f.db.Project) }, f.Noodl);
    expect([second.signals, f.writes.length]).toEqual([[], 10]);
  });

  it('a move: Done closes it and adds the next (whose, by when); Change rewrites it; a bad date writes nothing', async () => {
    const f = fakeRecords({ Task: [{ objectId: 'm1', title: 'Send the quote', status: 'open', position: 2, projectId: 'p1' }], Event: [] });
    const base = { projectId: 'p1', projectName: 'Bramble', taskId: 'm1', position: 9 };
    const done = await runWrites(SAVE_MOVE_SCRIPT, { ...base, mode: 'done', title: 'Ana signs it off', waitingOn: 'Ana', deadline: '2026-10-20' }, f.Noodl);
    expect(done.signals).toEqual(['done']);
    expect(f.db.Task.map((t) => [t.title, t.status, t.waitingOn ?? '', t.deadline ?? '', t.projectId])).toEqual([
      ['Send the quote', 'done', '', '', 'p1'],
      ['Ana signs it off', 'open', 'Ana', '2026-10-20', 'p1']
    ]);
    expect(f.db.Event.map((e) => [e.kind, e.summary])).toEqual([['closed', 'Closed from Projects'], ['created', 'The next move for Bramble, waiting on Ana']]);
    await runWrites(SAVE_MOVE_SCRIPT, { ...base, taskId: 'task2', mode: 'change', title: 'Ana signs it', waitingOn: '', deadline: '' }, f.Noodl);
    expect([f.db.Task[1].title, f.db.Task[1].waitingOn]).toEqual(['Ana signs it', '']);
    const bad = await runWrites(SAVE_MOVE_SCRIPT, { ...base, mode: 'new', title: 'X', deadline: 'next week' }, f.Noodl);
    expect([bad.signals, f.db.Task.length]).toEqual([[], 2]);
    // Done with nothing next: the move is closed, and nothing is added.
    await runWrites(SAVE_MOVE_SCRIPT, { ...base, taskId: 'task2', mode: 'done', title: '' }, f.Noodl);
    expect([f.db.Task[1].status, f.db.Task.length]).toEqual(['done', 2]);
  });

  it('the row’s box: Change rewrites, Add a task is a new one, Done with no move is the first move — and nothing open writes nothing', () => {
    const r = (i: Rec) => run(ROW_SUBMIT_SCRIPT, i);
    expect(r({ mode: 'done', taskId: 't' })).toEqual({ outputs: { mode: 'done' }, signals: ['go'] });
    expect(r({ mode: 'done', taskId: '' }).outputs.mode).toBe('new');
    expect(r({ mode: 'add', taskId: 't' }).outputs.mode).toBe('new');
    expect(r({ mode: 'change', taskId: 't' }).outputs.mode).toBe('change');
    expect(r({ mode: 'change', taskId: '' }).signals).toEqual([]);
    expect(r({ mode: 'none' }).signals).toEqual([]);
    expect(r({ mode: 'edit', taskId: 't' }).signals).toEqual([]);
  });

  it('s2 the move form: what was typed beats what it opened with, an untouched box keeps its value, a cleared one is empty; no words is refused unless nothing next is an answer', () => {
    const f = (i: Rec) => run(MOVE_FORM_SCRIPT, i);
    // Change, only the deadline picked: the words and who it waits on are what the move said.
    expect(f({ title: 'Call Ade', who: 'Ade', deadline: '', pickedDeadline: '2026-10-20' })).toEqual({
      outputs: { error: '', hasError: false, title: 'Call Ade', waitingOn: 'Ade', deadline: '2026-10-20' },
      signals: ['go']
    });
    expect(f({ title: 'Call Ade', who: 'Ade', deadline: '2026-10-20', typedTitle: ' Call Ade back ', typedWho: '', pickedDeadline: '' }).outputs).toMatchObject({
      title: 'Call Ade back', waitingOn: '', deadline: ''
    });
    expect(f({ title: '', who: '', deadline: '' })).toEqual({ outputs: { error: 'The move needs a few words.', hasError: true }, signals: [] });
    expect(f({ title: '', titleOptional: true }).signals).toEqual(['go']);
    expect(f({ title: 'X', deadline: 'next week' }).outputs.deadline).toBe('');
  });

  it('s2 which form a project draws: one row while it is open, none when it is not, never a record’s id', () => {
    const base = { name: 'Clarion', projectId: 'p2', hasMove: true, moveTitle: 'Call Ade', waitingRaw: 'Ade', deadlineRaw: '2026-10-20', pName: 'Clarion', pKind: 'earning', pBilling: 'fixed', pTerms: '30', pRate: '', pSub: '', pSay: '' };
    const forms = (mode: string, extra: Rec = {}) => run(ROW_FORMS_SCRIPT, { ...base, mode, ...extra }).outputs;
    expect(forms('none')).toEqual({ formRows: [], linkRows: [], editRows: [] });
    expect(forms('change').formRows).toEqual([
      { id: 'mf-change-p2', heading: 'Change the move for Clarion', help: '', title: 'Call Ade', who: 'Ade', deadline: '2026-10-20', saveLabel: 'Save', cancelLabel: 'Cancel', titleOptional: false }
    ]);
    expect(forms('done').formRows).toMatchObject([{ id: 'mf-done-p2', heading: 'Done. What is the next move for Clarion?', title: '', who: '', titleOptional: true }]);
    expect(forms('done', { hasMove: false }).formRows).toMatchObject([{ heading: 'What is the next move for Clarion?', titleOptional: false }]);
    expect(forms('add').formRows).toMatchObject([{ id: 'mf-add-p2', heading: 'Add a task for Clarion', titleOptional: false }]);
    expect(forms('edit')).toEqual({ formRows: [], linkRows: [], editRows: [{ id: 'pe-p2', name: 'Clarion', sub: '', kind: 'earning', billing: 'fixed', termsDays: '30', rate: '', say: '' }] });
    const next = run(NEXT_PROMPT_FORM_SCRIPT, { open: true, projectId: 'p2', name: 'Clarion' }).outputs.formRows as Rec[];
    expect(next).toMatchObject([{ id: 'np-p2', heading: 'Closed. What is the next move for Clarion?', cancelLabel: 'Nothing next for now', titleOptional: false }]);
    expect(run(NEXT_PROMPT_FORM_SCRIPT, { open: false, projectId: 'p2' }).outputs.formRows).toEqual([]);
  });

  it('a new balance: written as today’s, and what was due by today ticked as happened — except a client’s unpaid bill', async () => {
    const f = fakeRecords({ MoneyMark: [], BalanceReading: [] });
    const out = await runWrites(RECORD_BALANCE_SCRIPT, { amount: '€ 2,140', items, marks: [], projects }, f.Noodl);
    expect(out.signals).toEqual(['done']);
    expect(f.db.BalanceReading.map((r) => [r.date, r.amount])).toEqual([[dayOffset(0), 2140]]);
    // Rent is due in five days and Salon's retainer is a client's: nothing to tick.
    expect(f.db.MoneyMark).toEqual([]);
    const lateRent = [...items, { id: 'i4', label: 'Phone', amount: -40, repeat: 'once', date: dayOffset(-3), likelihood: 100 }];
    await runWrites(RECORD_BALANCE_SCRIPT, { amount: '2140', items: lateRent, marks: [], projects }, f.Noodl);
    expect(f.db.MoneyMark.map((m) => [m.itemId, m.occurs, m.payments])).toEqual([['i4', dayOffset(-3), [{ day: dayOffset(-3), amount: -40 }]]]);
    const bad = await runWrites(RECORD_BALANCE_SCRIPT, { amount: 'lots', items, marks: [], projects }, f.Noodl);
    expect([bad.signals, bad.outputs.hasError]).toEqual([[], true]);
  });

  it('Been paid? ticks the whole repeat today; Sent? marks it sent; a closed one writes nothing', async () => {
    const f = fakeRecords({ MoneyMark: [] });
    const key = `i1|${dayOffset(-10)}`;
    await runWrites(MARK_MONEY_SCRIPT, { key, action: 'tick', items, marks: [], projects }, f.Noodl);
    expect(f.db.MoneyMark.map((m) => [m.itemId, m.payments, m.doneOn, m.doneAmount])).toEqual([['i1', [{ day: dayOffset(0), amount: 1200 }], dayOffset(0), 1200]]);
    const marks = plainWithId(f.db.MoneyMark);
    expect((await runWrites(MARK_MONEY_SCRIPT, { key, action: 'tick', items, marks, projects }, f.Noodl)).signals).toEqual([]);
    const after = run(PROJECT_ROWS_SCRIPT, { tasks, projects, items, marks, readings, flag: '' }).outputs.rows as Rec[];
    expect((after.find((r) => r.name === 'Salon Collective') as Rec).edge).toBe('transparent');
    await runWrites(MARK_MONEY_SCRIPT, { key: `i1|${dayOffset(20)}`, action: 'sent', items, marks, projects }, f.Noodl);
    expect(f.db.MoneyMark[1]).toMatchObject({ itemId: 'i1', occurs: dayOffset(20), sentOn: dayOffset(0), payments: [] });
  });

  it('carry-over on a viewer that hands back records, not plain rows (todo.digitalbricks.io runs one)', async () => {
    const f = fakeRecords({ Project: [{ objectId: 'p1', name: 'Linguaid', move: '→ Ring Joss' }], Task: [{ objectId: 'x1', title: '→ Ring Joss', status: 'open', position: 2 }], Event: [] }, true);
    const out = await runWrites(PROJECTS_CARRY_SCRIPT, { projects: [{ id: 'p1', name: 'Linguaid', move: '→ Ring Joss' }] }, f.Noodl);
    expect(out.signals).toEqual(['changed']);
    expect(f.db.Task.map((t) => [t.title, t.projectId])).toEqual([['Ring Joss', 'p1']]);
  });

  it('reading: plain rows with their id; a refused read says failed', async () => {
    const f = fakeRecords({ Project: [{ objectId: 'p1', name: 'A' }], MoneyItem: [], MoneyMark: [], BalanceReading: [] });
    const ok = await runWrites(PROJECTS_LOAD_SCRIPT, {}, f.Noodl);
    expect([ok.signals, ok.outputs.projects]).toEqual([['loaded'], [{ objectId: 'p1', name: 'A', id: 'p1' }]]);
    const old = fakeRecords({ Project: [{ objectId: 'p1', name: 'A' }], MoneyItem: [], MoneyMark: [], BalanceReading: [] }, true);
    expect((await runWrites(PROJECTS_LOAD_SCRIPT, {}, old.Noodl)).outputs.projects).toEqual([{ name: 'A', id: 'p1', objectId: 'p1' }]);
    const refused = await runWrites(PROJECTS_LOAD_SCRIPT, {}, { Records: { query: () => Promise.reject(new Error('403')) } });
    expect(refused.signals).toEqual(['failed']);
  });

  it('the page: a closed project task asks for its next move, a press toggles, and the switch is remembered — the scripts that shipped, not undefined', () => {
    expect(run(NEXT_FOR_SCRIPT, { taskId: 't2', tasks, projectNames: { p2: 'Bramble & Co' } })).toEqual({ outputs: { projectId: 'p2', projectName: 'Bramble & Co' }, signals: ['show'] });
    expect(run(NEXT_FOR_SCRIPT, { taskId: 't4', tasks, projectNames: { p2: 'Bramble & Co' } }).signals).toEqual([]);
    expect(run(TOGGLE_PROJECT_SCRIPT, { id: 'p1', current: '' }).outputs.value).toBe('p1');
    expect(run(TOGGLE_PROJECT_SCRIPT, { id: 'p1', current: 'p1' }).outputs.value).toBe('');
    const store: Record<string, string> = {};
    const win = { localStorage: { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; } } };
    const blocked = { localStorage: { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } } };
    // eslint-disable-next-line no-new-func
    const withWindow = (script: string, inputs: Rec, w: unknown) => { const o: Rec = {}; const s: string[] = []; new Function('Inputs', 'Outputs', 'window', script)(inputs, new Proxy(o, { get: (t, k: string) => (k in t ? t[k] : () => s.push(k)) }), w); return { o, s }; };
    withWindow(PROJECTS_FLAG_KEEP_SCRIPT, { flag: 'off' }, win);
    withWindow(PROJECTS_FLAG_KEEP_SCRIPT, { flag: '' }, win);
    expect(store[PROJECTS_FLAG_KEY]).toBe('off');
    expect(withWindow(PROJECTS_FLAG_READ_SCRIPT, {}, win).o.flag).toBe('off');
    expect(withWindow(PROJECTS_FLAG_READ_SCRIPT, {}, blocked)).toEqual({ o: { flag: '' }, s: ['go'] });
    const page = componentsOf().find((c) => c.name === C.pageTodo) as LegacyComponent;
    const script = (id: string) => (nodesOf(page).find((n) => n.id === id)?.parameters as { functionScript?: string })?.functionScript;
    expect([script('tdNextFor'), script('tdToggleProject'), script('tdFlagRead'), script('tdFlagKeep')]).toEqual([
      NEXT_FOR_SCRIPT, TOGGLE_PROJECT_SCRIPT, PROJECTS_FLAG_READ_SCRIPT, PROJECTS_FLAG_KEEP_SCRIPT
    ]);
    const wires = (page.graph?.connections ?? []) as unknown as Array<Record<string, string>>;
    const has = (f: string, fp: string, t: string, tp: string) => wires.some((w) => w.fromId === f && w.fromProperty === fp && w.toId === t && w.toProperty === tp);
    expect(has('cmdClose', 'done', 'tdNextFor', 'run')).toBe(true);
    expect(has('tdProjects', 'projectNames', 'tdRows', 'projectNames')).toBe(true);
    expect(has('tdProjects', 'changed', 'tdData', 'refresh')).toBe(true);
  });

  // ── s2 — Planning's editing, back (Richard, 2026-10-05: "you've taken out a lot of the basic CRUD") ──

  it('s2 an opened project carries its tasks (move first) and its money items, as rows that are never a record', () => {
    const rows = rowsOf().rows as Rec[];
    const salon = rows.find((r) => r.name === 'Salon Collective') as Rec;
    expect(salon.taskRows).toEqual([{ id: 'pt-t1', taskId: 't1', title: 'Chase the September invoice', meta: 'The next move', metaColor: 'var(--muted-foreground)' }]);
    expect([salon.hasTasks, salon.tasksHeading, salon.hasMoneyRows]).toEqual([true, 'In your list', true]);
    expect((salon.moneyRows as Rec[]).map((m) => [m.id, m.itemKey, m.label])).toEqual([['pm-i1', 'item:i1', 'Salon retainer']]);
    expect(String((salon.moneyRows as Rec[])[0].line)).toMatch(/^\+€1,200 every month on the \d+(st|nd|rd|th), from /);
    const founder = rows.find((r) => r.name === 'Founder A') as Rec;
    expect(String((founder.moneyRows as Rec[])[0].line)).toMatch(/, 50% likely$/);
    expect((founder.taskRows as Rec[])[0].meta).toBe('The next move · Waiting on Sam');
    expect([salon.pName, salon.pKind, salon.pBilling, salon.pTerms, salon.pRate]).toEqual(['Salon Collective', 'earning', 'hourly', '', '']);
    const recordIds = new Set([...projects, ...tasks, ...items].map((r) => r.id));
    const nested = rows.flatMap((r) => [...((r.taskRows as Rec[]) ?? []), ...((r.moneyRows as Rec[]) ?? [])]);
    expect(nested.length).toBeGreaterThan(3);
    expect(nested.filter((r) => recordIds.has(r.id as string))).toEqual([]);
  });

  const listOf = (extra: Rec = {}) => run(MONEY_LIST_SCRIPT, { items, marks: [], projects, ...extra }).outputs;

  it('s2 the money popup: Upcoming (late first, hoped not late), Recurring (every item), Past (ticked) — never a record’s id; a removed item nowhere', () => {
    const out = listOf();
    const up = out.upRows as Rec[];
    expect(up[0]).toMatchObject({ key: `i1|${dayOffset(-10)}`, itemKey: 'item:i1', label: 'Salon retainer · Salon Collective', amount: '+€1,200', canTick: true, metaColor: 'var(--destructive)' });
    expect(String(up[0].meta)).toMatch(/· 10 days late$/);
    expect(up.find((r) => r.itemKey === 'item:i2')).toMatchObject({ label: 'Rent', amount: '−€1,500', canTick: true });
    expect(up.find((r) => r.itemKey === 'item:i3')).toMatchObject({ canTick: false });
    expect(String(up.find((r) => r.itemKey === 'item:i3')?.meta)).toMatch(/50% likely/);
    expect((out.recRows as Rec[]).map((r) => [r.id, r.label, r.amount])).toEqual([
      ['mr-i3', 'Founder A', '+€2,000'],
      ['mr-i2', 'Rent', '−€1,500'],
      ['mr-i1', 'Salon retainer · Salon Collective', '+€1,200']
    ]);
    expect(out.pastRows).toEqual([]);
    const ids = new Set(items.map((i) => i.id));
    for (const list of [out.upRows, out.recRows] as Rec[][]) expect(list.filter((r) => ids.has(r.id as string))).toEqual([]);
    expect(out.projectOptions).toEqual([
      { Label: 'No project', Value: 'none' },
      { Label: 'Bramble & Co', Value: 'p2' }, { Label: 'Founder A', Value: 'p3' }, { Label: 'Old thing', Value: 'p4' },
      { Label: 'Own course', Value: 'p6' }, { Label: 'Salon Collective', Value: 'p1' }
    ]);
    const marks = [{ id: 'k1', itemId: 'i1', occurs: dayOffset(-10), payments: [{ day: dayOffset(-1), amount: 1200 }] }];
    const ticked = listOf({ marks });
    expect((ticked.upRows as Rec[]).some((r) => r.key === `i1|${dayOffset(-10)}`)).toBe(false);
    expect(ticked.pastRows).toMatchObject([{ id: `mp-i1|${dayOffset(-10)}`, amount: '+€1,200', canUntick: true }]);
    const removed = listOf({ items: [...items, { id: 'i9', label: 'Mistake', amount: -50, repeat: 'once', date: dayOffset(3), until: dayOffset(2) }] });
    expect([...(removed.upRows as Rec[]), ...(removed.recRows as Rec[])].some((r) => r.itemKey === 'item:i9')).toBe(false);
  });

  it('s2 the money form: an item opens with what it holds; a new one for a project opens in, for that project; none when it is shut', () => {
    const base = { upRows: [], recRows: [], pastRows: [], projectOptions: [{ Label: 'No project', Value: 'none' }], items, projects };
    const look = (extra: Rec) => run(MONEY_SHEET_SCRIPT, { ...base, ...extra }).outputs;
    expect(look({ editing: false, editKey: 'item:i2' }).formRows).toEqual([]);
    expect(look({ editing: true, editKey: 'item:i2' }).formRows).toMatchObject([
      { id: 'me-i2', key: 'item:i2', heading: 'Change: Rent', label: 'Rent', dir: 'out', amount: '1500', repeat: 'monthly', projectId: 'none', likelihood: '', isNew: false, endLabel: 'End it' }
    ]);
    expect(look({ editing: true, editKey: 'item:i3' }).formRows).toMatchObject([{ dir: 'in', projectId: 'p3', likelihood: '50' }]);
    expect(look({ editing: true, editKey: 'new:p1' }).formRows).toMatchObject([
      { id: 'me-new-p1', key: 'new', heading: 'Add money for Salon Collective', label: 'Salon Collective', dir: 'in', projectId: 'p1', date: dayOffset(0), isNew: true }
    ]);
    expect(look({ editing: true, editKey: 'new' }).formRows).toMatchObject([{ id: 'me-new-none', heading: 'Add money', dir: 'out', repeat: 'once', projectId: 'none' }]);
    expect(look({ filter: 'rec', recRows: [] })).toMatchObject({ empty: true, emptyText: 'Nothing yet. Add money: rent, a retainer, a bill.' });
    expect(run(SHEET_BACK_SCRIPT, { state: 'edit' }).signals).toEqual(['toList']);
    expect(run(SHEET_BACK_SCRIPT, { state: 'editOnly' }).signals).toEqual(['toClosed']);
    expect(run(NEW_FOR_PROJECT_SCRIPT, { projectId: 'p1' })).toEqual({ outputs: { value: 'new:p1' }, signals: ['go'] });
  });

  it('s2 the money form says what is missing, and an untouched box keeps what the item held', () => {
    const start = { label: 'Rent', dir: 'out', amount: '1500', repeat: 'monthly', date: '2026-10-01', until: '', projectId: 'none', likelihood: '', note: '' };
    const ok = run(MONEY_EDITOR_SCRIPT, { ...start, typedAmount: '1600', pickedRepeat: 'monthly' });
    expect(ok).toEqual({ outputs: { error: '', hasError: false, ...start, amount: '1600' }, signals: ['go'] });
    expect(run(MONEY_EDITOR_SCRIPT, { ...start, pickedRepeat: 'once', pickedUntil: '2026-12-01' }).outputs.until).toBe('');
    const bad = (extra: Rec) => run(MONEY_EDITOR_SCRIPT, { ...start, ...extra }).outputs.error;
    expect(bad({ typedLabel: ' ' })).toMatch(/^Say what it is/);
    expect(bad({ typedAmount: 'lots' })).toMatch(/^Type how much/);
    expect(bad({ pickedDate: '' })).toBe('Pick the day it happens.');
    expect(bad({ pickedUntil: '2026-09-01' })).toBe('The last day is before the first.');
    expect(bad({ typedLikelihood: '150' })).toMatch(/^How likely is a number/);
  });

  it('s2 a money item: added (out is negative, no project is none), changed (only what the form shows), refused when it is wrong', async () => {
    const f = fakeRecords({ MoneyItem: [{ objectId: 'm1', label: 'Rent', amount: -900, repeat: 'monthly', date: '2026-10-01', billDate: '2026-09-25', fromHours: false, monthEnd: true }] });
    const add = await runWrites(SAVE_MONEY_ITEM_SCRIPT, { key: 'new', label: ' Tax bill ', dir: 'out', amount: '€ 1,240', repeat: 'once', date: '2026-11-15', until: '2027-01-01', projectId: 'none', likelihood: '', note: '' }, f.Noodl);
    expect(add.signals).toEqual(['done']);
    expect(f.db.MoneyItem[1]).toMatchObject({ label: 'Tax bill', amount: -1240, repeat: 'once', date: '2026-11-15', until: null, projectId: null, likelihood: 100, monthEnd: false, billDate: null });
    await runWrites(SAVE_MONEY_ITEM_SCRIPT, { key: 'item:m1', label: 'Rent', dir: 'out', amount: '950', repeat: 'monthly', date: '2026-10-01', until: '2027-06-30', projectId: 'p1', likelihood: '80', note: 'new lease' }, f.Noodl);
    expect(f.db.MoneyItem[0]).toMatchObject({ amount: -950, until: '2027-06-30', projectId: 'p1', likelihood: 80, note: 'new lease', billDate: '2026-09-25', monthEnd: true });
    const bad = await runWrites(SAVE_MONEY_ITEM_SCRIPT, { key: 'new', label: 'X', dir: 'in', amount: '0', repeat: 'once', date: '2026-11-15' }, f.Noodl);
    expect([bad.signals, bad.outputs.hasError, f.db.MoneyItem.length]).toEqual([[], true, 2]);
  });

  it('s2 End it and Remove it: nothing is deleted — a running repeat stops after today, a one-off or one not yet begun is never counted', async () => {
    const list = [
      { id: 'a', date: dayOffset(-40), repeat: 'monthly' },
      { id: 'b', date: dayOffset(5), repeat: 'once' },
      { id: 'c', date: dayOffset(9), repeat: 'weekly' }
    ];
    const f = fakeRecords({ MoneyItem: list.map((x) => ({ objectId: x.id, ...x })) });
    for (const id of ['a', 'b', 'c']) expect((await runWrites(END_MONEY_ITEM_SCRIPT, { key: `item:${id}`, items: list }, f.Noodl)).signals).toEqual(['done']);
    expect(f.db.MoneyItem.map((m) => m.until)).toEqual([dayOffset(0), dayOffset(4), dayOffset(8)]);
    expect((await runWrites(END_MONEY_ITEM_SCRIPT, { key: 'new', items: list }, f.Noodl)).signals).toEqual([]);
  });

  it('s2 Untick: the repeat is open again and the mark is kept', async () => {
    const key = `i1|${dayOffset(-10)}`;
    const marks = [{ id: 'k1', objectId: 'k1', itemId: 'i1', occurs: dayOffset(-10), payments: [{ day: dayOffset(-1), amount: 1200 }], doneOn: dayOffset(-1), doneAmount: 1200 }];
    const f = fakeRecords({ MoneyMark: marks });
    expect((await runWrites(MARK_MONEY_SCRIPT, { key, action: 'untick', items, marks, projects }, f.Noodl)).signals).toEqual(['done']);
    expect(f.db.MoneyMark).toMatchObject([{ objectId: 'k1', payments: [], doneOn: '', doneAmount: '' }]);
    const after = plainWithId(f.db.MoneyMark);
    expect((await runWrites(MARK_MONEY_SCRIPT, { key, action: 'untick', items, marks: after, projects }, f.Noodl)).signals).toEqual([]);
  });

  it('s2 Edit project: saves what the form says; a project needs a name, and the rate and the terms are numbers', async () => {
    const start = { name: 'Clarion', sub: '', kind: 'earning', billing: 'hourly', rate: '', termsDays: '', say: '' };
    expect(run(PROJECT_EDITOR_SCRIPT, { ...start, typedRate: '85', pickedBilling: 'hourly', pickedKind: 'earning' })).toEqual({
      outputs: { error: '', hasError: false, ...start, rate: '85' },
      signals: ['go']
    });
    expect(run(PROJECT_EDITOR_SCRIPT, { ...start, typedName: '' }).outputs.error).toBe('The project needs a name.');
    expect(run(PROJECT_EDITOR_SCRIPT, { ...start, typedTerms: '2 weeks' }).outputs.error).toMatch(/^Payment terms/);
    const f = fakeRecords({ Project: [{ objectId: 'p1', name: 'Clarion', move: '', position: 2 }] });
    const ok = await runWrites(SAVE_PROJECT_SCRIPT, { projectId: 'p1', name: ' Clarion Ltd ', sub: 'the retainer', kind: 'dormant', billing: 'fixed', rate: '', termsDays: '30', say: 'Ade decides' }, f.Noodl);
    expect(ok.signals).toEqual(['done']);
    expect(f.db.Project[0]).toMatchObject({ name: 'Clarion Ltd', sub: 'the retainer', kind: 'dormant', billing: 'fixed', rate: 0, termsDays: 30, say: 'Ade decides', position: 2 });
    const bad = await runWrites(SAVE_PROJECT_SCRIPT, { projectId: 'p1', name: '', kind: 'earning' }, f.Noodl);
    expect([bad.signals, bad.outputs.hasError]).toEqual([[], true]);
  });

  it('s2 both ways: a project’s task opens in the List, and a task’s pane says its project and opens it — wired on the page', () => {
    const names = { p2: 'Bramble & Co' };
    expect(run(TASK_PROJECT_SCRIPT, { selectedId: 't2', tasks, projectNames: names, showTab: true }).outputs).toEqual({ projectId: 'p2', projectValue: 'p2', showProject: true, hasProject: true });
    expect(run(TASK_PROJECT_SCRIPT, { selectedId: 't2', tasks, projectNames: names, showTab: false }).outputs).toMatchObject({ showProject: false, hasProject: false });
    expect(run(TASK_PROJECT_SCRIPT, { selectedId: 't4', tasks, projectNames: names, showTab: true }).outputs).toEqual({ projectId: '', projectValue: 'none', showProject: true, hasProject: false });
    const page = componentsOf().find((c) => c.name === C.pageTodo) as LegacyComponent;
    const wires = (page.graph?.connections ?? []) as unknown as Array<Record<string, string>>;
    const has = (f: string, fp: string, t: string, tp: string) => wires.some((w) => w.fromId === f && w.fromProperty === fp && w.toId === t && w.toProperty === tp);
    expect([
      has('tdProjectsPane', 'openTask', 'tdSelectFromProject', 'do'),
      has('tdProjectsPane', 'openTask', 'tdTab', 'to-list'),
      has('tdSummary', 'openProject', 'tdOpenFromTask', 'do'),
      has('tdSummary', 'openProject', 'tdTab', 'to-projects'),
      has('tdSelectFromProject', 'done', 'tdData', 'loadHistory')
    ]).toEqual([true, true, true, true, true]);
    const script = (id: string) => (nodesOf(page).find((n) => n.id === id)?.parameters as { functionScript?: string })?.functionScript;
    expect(script('tdTaskProject')).toBe(TASK_PROJECT_SCRIPT);
  });

  // ── s3 — your own order, by kind; and a task's project (Richard, 2026-10-05) ──

  it('s3 by kind: Paying, Building, Hobby, Quiet, each in your own order, its rows draggable and never the urgent list’s models', () => {
    const shuffled = projects.map((p) => (p.id === 'p1' ? { ...p, position: 9 } : p));
    const out = run(PROJECT_ROWS_SCRIPT, { tasks, projects: shuffled, items, marks: [], readings, openId: '', flag: '' }).outputs;
    expect((out.payingRows as Rec[]).map((r) => [r.id, r.name, r.canMove])).toEqual([
      [`${PROJECT_KIND_ROW_PREFIX}p2`, 'Bramble & Co', true],
      [`${PROJECT_KIND_ROW_PREFIX}p3`, 'Founder A', true],
      [`${PROJECT_KIND_ROW_PREFIX}p1`, 'Salon Collective', true]
    ]);
    expect((out.buildingRows as Rec[]).map((r) => r.name)).toEqual(['Own course']);
    expect([out.hobbyRows, out.hasHobby, out.hasQuiet]).toEqual([[], false, true]);
    expect((out.quietRows as Rec[]).map((r) => r.name)).toEqual(['Old thing']);
    // The urgent list keeps its own ids and no grip.
    expect((out.rows as Rec[]).filter((r) => !r.isHeading).every((r) => String(r.id).startsWith(PROJECT_ROW_PREFIX) && r.canMove === false)).toBe(true);
    const recordIds = new Set([...projects, ...tasks, ...items].map((r) => r.id));
    const kindIds = ['payingRows', 'buildingRows', 'hobbyRows', 'quietRows'].flatMap((k) => (out[k] as Rec[]).map((r) => r.id as string));
    expect(kindIds.filter((id) => recordIds.has(id) || id.startsWith(PROJECT_ROW_PREFIX))).toEqual([]);
  });

  it('s3 a project offers every open task that is not its own, saying which project one is in now', () => {
    const rows = rowsOf().rows as Rec[];
    const salon = rows.find((r) => r.name === 'Salon Collective') as Rec;
    expect(salon.otherTasks).toEqual([
      { Label: 'Call the bank', Value: 't4' },
      { Label: 'Send the revised quote (now Bramble & Co)', Value: 't2' },
      { Label: 'Sam sends the data access (now Founder A)', Value: 't3' }
    ]);
    expect(salon.hasOtherTasks).toBe(true);
    const run2 = (mode: string) => run(ROW_FORMS_SCRIPT, { mode, name: 'Salon', projectId: 'p1', otherTasks: salon.otherTasks }).outputs;
    expect(run2('link').linkRows).toEqual([{ id: 'lf-p1', heading: 'Add an existing task to Salon', options: salon.otherTasks }]);
    expect(run2('none').linkRows).toEqual([]);
    expect(run(LINK_FORM_SCRIPT, { picked: 't4' })).toEqual({ outputs: { error: '', hasError: false, taskId: 't4' }, signals: ['go'] });
    expect(run(LINK_FORM_SCRIPT, { picked: '' })).toEqual({ outputs: { error: 'Pick a task first.', hasError: true }, signals: [] });
  });

  it('s3 dragging a project hands its kind’s own places out again in the new order, saving only what moved', async () => {
    const f = fakeRecords({ Project: [{ objectId: 'a', position: 2 }, { objectId: 'b', position: 5 }, { objectId: 'c', position: 7 }] });
    const rows = [{ id: 'pg-a', projectId: 'a', position: 2 }, { id: 'pg-b', projectId: 'b', position: 5 }, { id: 'pg-c', projectId: 'c', position: 7 }];
    expect((await runWrites(MOVE_PROJECT_SCRIPT, { rows, rowId: 'pg-c', toIndex: 0 }, f.Noodl)).signals).toEqual(['done']);
    expect(f.db.Project.map((p) => [p.objectId, p.position])).toEqual([['a', 5], ['b', 7], ['c', 2]]);
    expect(f.writes).toEqual(['save Project', 'save Project', 'save Project']);
    // Places that collide (Planning left some the same) are spread out rather than tied.
    const g = fakeRecords({ Project: [{ objectId: 'a', position: 1 }, { objectId: 'b', position: 1 }] });
    await runWrites(MOVE_PROJECT_SCRIPT, { rows: [{ id: 'pg-a', projectId: 'a', position: 1 }, { id: 'pg-b', projectId: 'b', position: 1 }], rowId: 'pg-b', toIndex: 0 }, g.Noodl);
    expect(g.db.Project.map((p) => [p.objectId, p.position])).toEqual([['a', 2], ['b', 1]]);
    expect((await runWrites(MOVE_PROJECT_SCRIPT, { rows, rowId: 'pg-a', toIndex: 0 }, f.Noodl)).signals).toEqual([]);
  });

  it('s3 a task’s project: set, changed, taken out — each said in its history; the same project again writes nothing', async () => {
    const f = fakeRecords({ Task: [{ objectId: 't4', title: 'Call the bank', projectId: null }], Event: [] });
    const names = { p1: 'Salon', p2: 'Bramble' };
    expect((await runWrites(SET_TASK_PROJECT_SCRIPT, { taskId: 't4', projectId: 'p1', current: 'none', projectNames: names }, f.Noodl)).signals).toEqual(['done']);
    expect((await runWrites(SET_TASK_PROJECT_SCRIPT, { taskId: 't4', projectId: 'p1', current: 'p1', projectNames: names }, f.Noodl)).signals).toEqual([]);
    await runWrites(SET_TASK_PROJECT_SCRIPT, { taskId: 't4', projectId: 'none', current: 'p1', projectNames: names }, f.Noodl);
    expect(f.db.Task[0].projectId).toBeNull();
    expect(f.db.Event.map((e) => [e.taskId, e.kind, e.summary])).toEqual([['t4', 'note', 'Now part of Salon'], ['t4', 'note', 'No longer part of Salon']]);
  });

  it('s3 By kind is the default, Most urgent first is remembered on the device — and only a press writes it', () => {
    const store: Record<string, string> = {};
    const win = { localStorage: { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; } } };
    // eslint-disable-next-line no-new-func
    const go = (script: string) => { const sig: string[] = []; new Function('Inputs', 'Outputs', 'window', script)({}, new Proxy({}, { get: (_t, k: string) => () => sig.push(k) }), win); return sig; };
    expect(go(PROJECTS_ORDER_READ_SCRIPT)).toEqual(['kind']);
    go(projectsOrderKeepScript('urgent'));
    expect([store[PROJECTS_ORDER_KEY], go(PROJECTS_ORDER_READ_SCRIPT)]).toEqual(['urgent', ['urgent']]);
    const view = componentsOf().find((c) => c.name === C.projectsView) as LegacyComponent;
    const wires = (view.graph?.connections ?? []) as unknown as Array<Record<string, string>>;
    // Nothing but the two buttons runs a keep script (the switch's first state is not a choice).
    expect(wires.filter((w) => w.toId === 'pvKeepKind' || w.toId === 'pvKeepUrgent').map((w) => `${w.fromId}.${w.fromProperty}`).sort()).toEqual(['pvByKindBtn.onClick', 'pvByUrgentBtn.onClick']);
    const page = componentsOf().find((c) => c.name === C.pageTodo) as LegacyComponent;
    const pw = (page.graph?.connections ?? []) as unknown as Array<Record<string, string>>;
    const has = (f: string, fp: string, t: string, tp: string) => pw.some((w) => w.fromId === f && w.fromProperty === fp && w.toId === t && w.toProperty === tp);
    expect([has('tdSummary', 'setProject', 'tdSetTaskProject', 'do'), has('tdTaskProject', 'out-projectId', 'tdSetTaskProject', 'current'), has('tdSetTaskProject', 'done', 'tdData', 'refresh')]).toEqual([true, true, true]);
  });
});
