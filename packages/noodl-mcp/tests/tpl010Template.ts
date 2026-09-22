/**
 * TPL-010 — the planner as a project a person can start from.
 *
 * `tpl010Components.ts` is what the door is given; this file is the composition. It authors
 * the template into an empty project through the real MCP server — the App shell with
 * `create_component`, everything else **through the plan door** (`create_plan` →
 * `stage_plan_operation` × N → `apply_plan`), the route TPL-007 established and TPL-008
 * followed — reads the result back, and prepares the directory.
 *
 * ## 🔴 The template whose data is a person's income
 *
 * `Settings` holds a real rate and a real household number, and `Block` holds where the
 * hours actually went. So:
 *
 * - every collection is `creatorOwns` — a row carries a private ACL for whoever wrote it,
 *   and nobody else's rows exist from where you stand;
 * - **`delete` is `nobody` everywhere except `Block`.** A dropped block is deleted because a
 *   half hour you decided against is noise; a project, a month's plan, a money item, a mark, a
 *   balance reading and the settings are not deletable by anything in this app, and the backend
 *   would refuse. Ending a money item keeps it (TPL-010-M, M10).
 *
 * The policy is hand-authored at `templates/planner.security.json` and copied in last,
 * because this module clears the output directory.
 *
 * ## Render off, deliberately
 *
 * `apply_plan` refuses `render: "off"` for a visual plan unless `NODEGX_RENDER_DISABLED=1`.
 * The evidence that the pages draw is the headless render AC8 demands against the built
 * artefact, not a render on every regeneration.
 *
 * @module noodl-mcp/tests/tpl010Template
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import type { LegacyProject } from '../../noodl-editor/src/editor/src/io/ProjectExporter';
import { createServer } from '../src/server';

import { pinRunOnValueChangeDefaultsInDirectory, readAsLegacyProject } from './templateArtefact';
import { copyTree, pinComponentFiles, pinRegistry, pinRootNode } from './templatePins';
import { APP_COMPONENT, APP_NODES, APP_WIRES, COLLECTIONS, TPL010_COMPONENTS, Tpl010Component } from './tpl010Components';
import { DEMO_STORAGE_KEY, TPL010_DEMO_COMPONENTS } from './tpl010Demo';
import { TPL010_PRESET, TPL010_TOKENS } from './tpl010Theme';

export const TEMPLATE_ID = 'planner';
export const TEMPLATE_PROJECT_NAME = 'Planner';
/** AC9 — the browser-only demo nodegx.io serves, generated from the same sources (R9). */
export const DEMO_ID = 'planner-demo';
export const DEMO_PROJECT_NAME = 'Planner demo';
export const TEMPLATE_EPOCH = '2026-09-20T00:00:00.000Z';
export const START_HERE_FILE = 'docs/START-HERE.md';
export const POLICY_FILE = 'nodegx.security.json';

interface ToolResult {
  isError?: boolean;
  content?: Array<{ type: string; text: string }>;
}

export interface AuthoredTemplate {
  project: LegacyProject;
  order: string[];
  planId: string;
  registrations: Record<string, { router: string; added: string[]; startPage?: string }>;
  projectDir: string;
  diagnostics: Array<{ component: string; code: string; severity: string; message: string }>;
  applied: Record<string, unknown>;
}

function writeSkeleton(dir: string, name: string): void {
  fs.mkdirSync(path.join(dir, 'components'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'nodegx.project.json'),
    JSON.stringify(
      {
        $schema: 'https://opennoodl.dev/schemas/project-v2.json',
        name,
        version: '4',
        nodegxVersion: '1.1.0',
        // R5b (2026-09-21) — the week fits a laptop as a design target; when it does not
        // (a 1,423x800 window, a phone) the PAGE scrolls, so nothing is ever out of reach.
        settings: { htmlTitle: name, navigationPathType: 'path', bodyScroll: true },
        structure: { componentsDir: 'components', assetsDir: 'assets' }
      },
      null,
      2
    )
  );
  fs.writeFileSync(
    path.join(dir, 'components', '_registry.json'),
    JSON.stringify(
      {
        $schema: 'https://opennoodl.dev/schemas/registry-v2.json',
        version: 1,
        lastUpdated: TEMPLATE_EPOCH,
        components: {},
        stats: { totalComponents: 0, totalNodes: 0, totalConnections: 0 }
      },
      null,
      2
    )
  );
}

export interface BuildOptions {
  components?: ReadonlyArray<Tpl010Component>;
  /** `demo` authors the browser-only demo (AC9) instead of the template. */
  variant?: 'template' | 'demo';
}

/** Author the whole template (or its demo) and read it back. */
export async function buildPlannerTemplateProject(options: BuildOptions = {}): Promise<AuthoredTemplate> {
  process.env.NODEGX_RENDER_DISABLED = '1';
  const demo = options.variant === 'demo';
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), demo ? 'tpl010-demo-' : 'tpl010-template-'));
  writeSkeleton(dir, demo ? DEMO_PROJECT_NAME : TEMPLATE_PROJECT_NAME);
  const components = options.components ?? (demo ? TPL010_DEMO_COMPONENTS : TPL010_COMPONENTS);

  const { server } = createServer({ projectDir: dir, allowWrites: true });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: demo ? 'tpl010-demo' : 'tpl010-template', version: '0.0.0' });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

  const order: string[] = [];
  const registrations: AuthoredTemplate['registrations'] = {};
  const diagnostics: AuthoredTemplate['diagnostics'] = [];

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
    for (const d of raised ?? []) {
      diagnostics.push({
        component: label,
        code: String(d.code ?? ''),
        severity: String(d.severity ?? ''),
        message: String(d.message ?? '')
      });
    }
    return payload;
  };

  try {
    await call('find_tools', { group: 'theme' }, 'theme:reveal');
    await call('set_style_preset', { preset_id: TPL010_PRESET }, 'theme:preset');
    await call('set_project_tokens', { tokens: [...TPL010_TOKENS] }, 'theme:tokens');

    const app = await call('create_component', { path: APP_COMPONENT, nodes: APP_NODES, connections: APP_WIRES }, APP_COMPONENT);
    order.push(APP_COMPONENT);
    if (app.registeredPages) registrations[APP_COMPONENT] = app.registeredPages as AuthoredTemplate['registrations'][string];

    const plan = await call(
      'create_plan',
      {
        request: demo
          ? 'A demo of a week planner for a freelancer, in hours rather than project prices. Four envelopes — billable, building, ' +
            'admin and hobby — budgeted once a month, six day columns of blocks, one line of next moves sorted by urgency, and the ' +
            'next six weeks of cash. An invented week, kept in this browser, with no sign in and no backend.'
          : 'A week planner for a freelancer, in hours rather than project prices. Four envelopes — billable, building, admin and hobby — ' +
            'budgeted once a month, six day columns of blocks, one line of next moves sorted by urgency, and the next six weeks of cash. ' +
            `Stored in the NodeGX backend (${COLLECTIONS.join(', ')}), private to whoever signed in.`,
        // R5b — the page scrolls when the week does not fit (`bodyScroll: true` above).
        scroll: 'page',
        operations: components.map((c) => ({
          kind: 'create',
          target: c.path,
          intent: c.description,
          ...(c.inputs?.length ? { inputs: c.inputs } : {}),
          ...(c.outputs?.length ? { outputs: c.outputs } : {}),
          ...(c.repeats ? { repeats: c.repeats } : {}),
          ...(c.instantiates?.length ? { instantiates: c.instantiates.map((n) => n.replace(/^\//, '')) } : {})
        }))
      },
      'plan'
    );
    const planId = String(plan.planId);
    const operations = plan.operations as Array<{ id: string; target: string }>;
    const opFor = (componentPath: string): string => {
      const found = operations.find((op) => op.target === componentPath);
      if (!found) {
        throw new Error(`the plan has no operation for ${componentPath}; it has ${operations.map((o) => o.target).join(', ')}`);
      }
      return found.id;
    };

    for (const c of components) {
      await call(
        'stage_plan_operation',
        { plan_id: planId, operation_id: opFor(c.path), nodes: c.nodes, connections: c.connections, description: c.description },
        c.path
      );
      order.push(c.path);
    }

    const applied = await call('apply_plan', { plan_id: planId, render: 'off' }, 'apply');
    for (const [key, value] of Object.entries((applied.registeredPages as Record<string, unknown>) ?? {})) {
      registrations[key] = value as AuthoredTemplate['registrations'][string];
    }

    return { project: readAsLegacyProject(dir), order, planId, registrations, projectDir: dir, diagnostics, applied };
  } finally {
    await client.close();
    await server.close();
  }
}

// ── Preparing the directory a person is handed ───────────────────────────────

function copyPinned(built: AuthoredTemplate, output: string, id: string, namespace: string): void {
  pinRunOnValueChangeDefaultsInDirectory(built.projectDir);
  pinComponentFiles(built.projectDir, namespace, TEMPLATE_EPOCH);
  pinRegistry(built.projectDir, TEMPLATE_EPOCH);

  if (path.basename(output) !== id) throw new Error(`refusing to clear ${output}`);
  fs.rmSync(output, { recursive: true, force: true });
  copyTree(built.projectDir, output);

  // 🔴 Browser-only: every write is a record node under the signed-in person's session, and
  // the policy is what keeps rows private. A cloud function would run as the system and
  // bypass it — on a collection holding somebody's income.
  if (fs.existsSync(path.join(output, 'components', '__cloud__'))) {
    throw new Error('refusing to write: this template ships no cloud functions, and a __cloud__ component was authored');
  }
  const modulesDir = path.join(output, 'noodl_modules');
  if (fs.existsSync(modulesDir) && fs.readdirSync(modulesDir).length > 0) {
    throw new Error(`refusing to write: this template installs no modules and ${modulesDir} holds ${fs.readdirSync(modulesDir).join(', ')}`);
  }
}

export function preparePlannerArtefact(built: AuthoredTemplate, output: string, policySource: string): void {
  if (!fs.existsSync(policySource)) throw new Error(`refusing to write: no security policy at ${policySource}`);
  copyPinned(built, output, TEMPLATE_ID, 'tpl010');
  fs.copyFileSync(policySource, path.join(output, POLICY_FILE));
  writeStartHere(output);
  pinRootNode(output, APP_COMPONENT);
  pinProjectModified(output);
}

/** The demo: no policy (there is no backend to hold one), its own START-HERE. */
export function preparePlannerDemoArtefact(built: AuthoredTemplate, output: string): void {
  copyPinned(built, output, DEMO_ID, 'tpl010-demo');
  writeDemoStartHere(output);
  pinRootNode(output, APP_COMPONENT);
  pinProjectModified(output);
}

function pinProjectModified(output: string): void {
  const file = path.join(output, 'nodegx.project.json');
  const doc = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
  doc.modified = TEMPLATE_EPOCH;
  fs.writeFileSync(file, `${JSON.stringify(doc, null, 2)}\n`);
}

function writeStartHere(output: string): void {
  const commands = TPL010_COMPONENTS.filter((c) => c.path.startsWith('Commands/')).map((c) => c.path.slice('Commands/'.length));
  const lines = [
    `# ${TEMPLATE_PROJECT_NAME}`,
    '',
    'One screen that says what this week is for. It is a planner for someone who sells their hours,',
    'and its unit is **hours**, not project prices.',
    '',
    '- **Four envelopes**, budgeted once a month: Billable, Building, Admin and asks, Hobby. Every hour',
    '  gets a job before the month starts.',
    '- **Billable** does not tell you how far behind you are. It tells you how many hours a day the rest',
    '  of the month needs. That is the only kind of sentence this app makes.',
    '- **Building** is what your focus ceiling has left over once the billable day is paid for. A month',
    '  that needs more billable hours shrinks it by itself, which is the trade made visible.',
    '- **Hobby** is budgeted at zero and going over it is reported, never flagged. Not budgeted, not',
    '  counted, not a problem.',
    '- **The moves strip** is one line of next steps, most urgent first, dormant clients included.',
    '  Pressing one puts half an hour in the first day with room under the ceiling.',
    '- **The evening drawer** says what today came to, where the month stands, and **one** thing worth',
    '  raising — never a list. Carry what did not get done, or drop it.',
    '- **Money** (the € in the app bar) is every money item — your partner’s contract, the household',
    '  costs, tax, each client’s bills — once, weekly, monthly, every three months or yearly, each repeat',
    '  changeable on its own. **Nothing happened until you tick it**; an unticked one whose day has passed',
    '  is late. Hoped money carries a likelihood and is never in a balance. The bottom of the week says',
    '  break-even, the target, what you might earn and the lowest point in six weeks.',
    '',
    '## It needs a backend',
    '',
    'Your week lives in the NodeGX backend, so every device you sign in on sees the same one. In the',
    'editor, open **Backend Services**, start a local backend and connect this project to it, then press',
    '**Run**. The first screen asks you to sign in or create an account.',
    '',
    `⚠️ **Use a new backend for this project.** A backend installs \`${POLICY_FILE}\` only when it has no`,
    'security settings of its own yet, so one you have already used keeps its old rules.',
    '',
    `The access rules ship as \`${POLICY_FILE}\`:`,
    '',
    `- \`${COLLECTIONS.join('`, `')}\` can be read and written by anyone signed in, and **creator owns** is`,
    '  on, so each row is private to the person who made it.',
    '- `delete` is `nobody` on everything except `Block`. A block you drop is deleted; a project, a',
    '  month’s plan, a money item, a mark, a balance reading and your settings are not deletable by this',
    '  app or by the backend. Ending a money item sets the last day it happens and keeps its history.',
    '- 🔴 **`signup` is `public`**, so that you can make your account. If you deploy this for yourself,',
    '  create your account first and then set `signup` to `nobody`, or anyone who finds the address can',
    '  make one (they would only ever see their own week, but it is your server).',
    '',
    '🔴 **`MoneyItem`, `MoneyMark` and `BalanceReading` hold your actual income, costs and bank balance**,',
    '`Settings` your actual rate, and `Block` where your hours actually went. That is the reason for every',
    'rule above.',
    '',
    '## How it is built',
    '',
    `- **\`Commands/\`** — one component for each thing a person can do: ${commands.join(', ')}.`,
    '  Each one is a guard that decides whether there is anything to write, one record write, and one',
    '  sentence when it fails. Read one and you have read the pattern.',
    '- **`Logic/`** — the only places a number or a sentence is decided. `Planner data` is the only',
    '  thing that reads the backend; `Envelopes` works out the four tiles; `Day columns` the six days;',
    '  `Moves` the strip; `Money` the money and `Money pane` its right-hand side; `Mark` what a tick writes;',
    '  `Shutdown` the evening; `Card rows` the projects card.',
    '- **`Week/`** — everything you can see. **`Pages/Week`** places it all and holds no arithmetic of',
    '  its own, so "where does this number come from?" always has one answer.',
    '- **Light and dark.** The page follows your system until you press the moon or sun in the app bar.',
    '  Both palettes are in `App`’s CSS Definition; `App` also puts your choice back when the app opens.',
    '- **The envelope colours carry data**, so they are held to a categorical palette’s standard in both',
    '  palettes: blue is Billable wherever it appears, violet Building, grey Admin, amber Hobby.',
    '',
    '## Getting started',
    '',
    '1. Open **Settings** in the app bar. **Capacity**: your focused hours a day and the days you work',
    '   (Saturday is ticked to start with; untick it and every sentence on the week changes with it).',
    '   **Money**: your usual hourly rate, what you want to save a month, and how low the balance may go',
    '   before it turns red.',
    '2. Open **Money** (€), **Record balance** with what your bank says, and add what comes in and goes',
    '   out: the household costs, a partner’s contract, tax once a year. The month’s billable target',
    '   follows from those.',
    '3. Add your projects — hourly or fixed, with their payment terms — and give each one a **next move**.',
    '   From a project’s card, **+ Add a bill** puts its bills in Money with the due date pre-filled.',
    '4. Back in Settings, **the split**: building, admin and hobby hours for the month, each with the',
    '   recommendation beside it — admin is a tenth of your capacity, building is what is left once',
    '   billable and admin are paid for, hobby is nothing. *Use the recommendation* takes all three.',
    '   Then press **Plan this month**: the envelopes start from what the split says, and nothing is',
    '   written for you on the 1st, because a budget nobody agreed to is not a budget.',
    '5. **Guardrails**, last: hours of hobby and of building a week, and the least of the week that',
    '   should be billable. Crossing one is a sentence on that tile and one line in the evening. Never a',
    '   colour, never twice.',
    '',
    '## The data',
    '',
    '| collection | fields |',
    '|---|---|',
    '| `Project` | `name`, `sub`, `kind` (`earning`/`building`/`hobby`/`dormant`/`admin`), `billing` (`hourly`/`fixed`), `rate`, `termsDays`, `agreedHours`, `slot`, `rung`, `move`, `moveWorth`, `moveWhen`, `moveDue`, `moveStop`, `facts`, `history`, `say`, `position` |',
    '| `Block` | `projectId`, `date` (`YYYY-MM-DD`), `what`, `planned`, `actual`, `entries`, `done`, `isMove`, `todoTaskId`, `position` |',
    '| `MonthPlan` | `month` (`YYYY-MM`), `billable`, `building`, `admin`, `hobby`, `workingDays` |',
    '| `MoneyItem` | `label`, `amount` (signed: + in, − out), `repeat` (`once`/`weekly`/`monthly`/`quarterly`/`yearly`), `date`, `until`, `monthEnd`, `projectId`, `billDate`, `billLeadDays`, `fromHours`, `likelihood` (100 = expected), `note`, `position` |',
    '| `MoneyMark` | `itemId`, `occurs` (the scheduled date), `amount` and `date` (this repeat changed), `skip`, `payments` (`[{ day, amount }]`), `doneOn`, `doneAmount`, `lostOn`, `sentOn`, `note` |',
    '| `BalanceReading` | `date`, `amount`, `note` |',
    '| `Settings` | `rate` (your usual hourly rate), `focusHours`, `workingDays` (`[1…6, 0]`, empty means Mon–Sat), `savingsTarget`, `lowWaterMark`, `buildingHours`, `adminHours`, `hobbyHours` (blank means use the recommendation), `hobbyWeekCeiling`, `buildingWeekCeiling`, `billableFloorPct`, `todoUrl` |',
    ''
  ];
  const file = path.join(output, START_HERE_FILE);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, lines.join('\n') + '\n');
}

function writeDemoStartHere(output: string): void {
  const lines = [
    `# ${DEMO_PROJECT_NAME}`,
    '',
    'The planner with the backend taken out, which is what nodegx.io serves. It is the same app as',
    '`templates/planner/` — the same envelopes, the same week, the same evening drawer — reading and',
    'writing an invented week in the browser instead of a database.',
    '',
    '🔴 **Do not start a project from this one.** It cannot keep anything: close the tab on another',
    'machine and the week is not there. Start from **Planner**, which stores your week in the NodeGX',
    'backend, and read `docs/START-HERE.md` there.',
    '',
    '## What is different, and nothing else is',
    '',
    'Every component here is *computed* from the template when `npm run template:planner` runs, so the',
    'demo can never be older than the template. The transform lives in',
    '`packages/noodl-mcp/tests/tpl010Demo.ts` and changes exactly this:',
    '',
    `- **\`Logic/Planner data\`** reads the week from this browser's local storage (\`${DEMO_STORAGE_KEY}\`),`,
    '  and puts the example week there the first time it finds none. It keeps the template’s own week',
    '  window and arrows, so `‹ ›` moves through the weeks the way the app does.',
    '- **Every command writes to that same store.** Each record node became one Function with the same',
    '  id, the same fields and the same `done` / `failure` outputs.',
    '- **There is no sign in.** The week loads when the page opens. **Reset demo** in the app bar (where',
    '  the app has Sign out) puts the example week back.',
    '',
    '## The week in it',
    '',
    'Invented, and dated from the day you open it: the days behind you are logged, today is half done,',
    'the rest is planned. The clients, the figures, the rates and the cash are all made up — no real',
    'income appears anywhere in this repository.',
    ''
  ];
  const file = path.join(output, START_HERE_FILE);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, lines.join('\n') + '\n');
}
