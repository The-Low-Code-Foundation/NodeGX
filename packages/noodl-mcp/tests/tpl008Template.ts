/**
 * TPL-008 — the todo list as a project a person can start from.
 *
 * `tpl008Components.ts` is what the door is given; this file is the composition.
 * It authors the template into an empty project through the real MCP server —
 * the App shell with `create_component`, everything else **through the plan
 * door** (`create_plan` → `stage_plan_operation` × N → `apply_plan`), the route
 * TPL-007 established — reads the result back, and prepares the directory.
 *
 * ## 🔴 The first template on the shelf whose data is only in the backend
 *
 * TPL-001 has a backend too, but its product is a policy about who may read what.
 * This one's product is the opposite claim: **the list is yours, it is on every
 * device you sign in on, and nothing in it can ever be silently lost.** So:
 *
 * - every collection is `creatorOwns` — a row carries a private ACL for the person
 *   who wrote it, and nobody else's rows exist from where you stand;
 * - **`delete` is `nobody` on all three collections.** There is no delete button
 *   in the app and the backend would refuse one if somebody built it. A task ends
 *   by being closed with a note.
 *
 * The policy is hand-authored at `templates/todo-list.security.json` and copied
 * in last, because this module clears the output directory.
 *
 * ## The demo (AC10, R9)
 *
 * `variant: 'demo'` authors `TPL008_DEMO_COMPONENTS` — the same components with the
 * backend taken out (`tpl008Demo.ts`) — through the same door, and
 * `prepareTodoDemoArtefact` writes it to `templates/todo-list-demo/`, the project
 * nodegx.io serves. It is generated with the template, never edited by hand.
 *
 * ## Render off, deliberately
 *
 * `apply_plan` refuses `render: "off"` for a visual plan unless
 * `NODEGX_RENDER_DISABLED=1`. The evidence that the pages draw is the drive
 * against the built artefact, not a render on every regeneration.
 *
 * @module noodl-mcp/tests/tpl008Template
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
import { APP_COMPONENT, APP_NODES, APP_WIRES, COLLECTIONS, TPL008_COMPONENTS, Tpl008Component } from './tpl008Components';
import { DEMO_STORAGE_KEY, TPL008_DEMO_COMPONENTS } from './tpl008Demo';
import { TPL008_PRESET, TPL008_TOKENS } from './tpl008Theme';

export const TEMPLATE_ID = 'todo-list';
export const TEMPLATE_PROJECT_NAME = 'Todo list';
export const TEMPLATE_EPOCH = '2026-09-14T00:00:00.000Z';
export const START_HERE_FILE = 'docs/START-HERE.md';
export const POLICY_FILE = 'nodegx.security.json';

/** AC10 — the browser-only demo nodegx.io serves, generated from the same sources (R9). */
export const DEMO_ID = 'todo-list-demo';
export const DEMO_PROJECT_NAME = 'Todo list demo';

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
        // A long history scrolls the page, not a box inside it.
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
  components?: ReadonlyArray<Tpl008Component>;
  /** `demo` authors the browser-only demo (AC10) instead of the template. */
  variant?: 'template' | 'demo';
}

/** Author the whole template (or its demo) and read it back. */
export async function buildTodoTemplateProject(options: BuildOptions = {}): Promise<AuthoredTemplate> {
  process.env.NODEGX_RENDER_DISABLED = '1';
  const demo = options.variant === 'demo';
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), demo ? 'tpl008-demo-' : 'tpl008-template-'));
  writeSkeleton(dir, demo ? DEMO_PROJECT_NAME : TEMPLATE_PROJECT_NAME);
  const components = options.components ?? (demo ? TPL008_DEMO_COMPONENTS : TPL008_COMPONENTS);

  const { server } = createServer({ projectDir: dir, allowWrites: true });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: demo ? 'tpl008-demo' : 'tpl008-template', version: '0.0.0' });
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
    await call('set_style_preset', { preset_id: TPL008_PRESET }, 'theme:preset');
    await call('set_project_tokens', { tokens: [...TPL008_TOKENS] }, 'theme:tokens');

    const app = await call('create_component', { path: APP_COMPONENT, nodes: APP_NODES, connections: APP_WIRES }, APP_COMPONENT);
    order.push(APP_COMPONENT);
    if (app.registeredPages) registrations[APP_COMPONENT] = app.registeredPages as AuthoredTemplate['registrations'][string];

    const plan = await call(
      'create_plan',
      {
        request: demo
          ? 'A demo of a todo list you can only order by what you will do next, where every change leaves a line of history. ' +
            `It has no backend and no sign in: the list (${COLLECTIONS.join(', ')}) is kept in this browser's local storage, starting from an example list.`
          : 'A todo list you can only order by what you will do next. Every change — a move, a note, a close — leaves a line of history. ' +
            `Stored in the NodeGX backend (${COLLECTIONS.join(', ')}), private to whoever signed in.`,
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

  // 🔴 Browser-only: every write is a record node under the signed-in person's
  // session (or, in the demo, a Function writing to this browser), and the policy is
  // what keeps rows private. A cloud function would run as the system and bypass it.
  if (fs.existsSync(path.join(output, 'components', '__cloud__'))) {
    throw new Error('refusing to write: this template ships no cloud functions, and a __cloud__ component was authored');
  }
  const modulesDir = path.join(output, 'noodl_modules');
  if (fs.existsSync(modulesDir) && fs.readdirSync(modulesDir).length > 0) {
    throw new Error(`refusing to write: this template installs no modules and ${modulesDir} holds ${fs.readdirSync(modulesDir).join(', ')}`);
  }
}

export function prepareTodoArtefact(built: AuthoredTemplate, output: string, policySource: string): void {
  if (!fs.existsSync(policySource)) throw new Error(`refusing to write: no security policy at ${policySource}`);
  copyPinned(built, output, TEMPLATE_ID, 'tpl008');
  fs.copyFileSync(policySource, path.join(output, POLICY_FILE));
  writeStartHere(output);
  pinRootNode(output, APP_COMPONENT);
  pinProjectModified(output);
}

/** The demo: no policy (there is no backend to hold one), its own START-HERE. */
export function prepareTodoDemoArtefact(built: AuthoredTemplate, output: string): void {
  copyPinned(built, output, DEMO_ID, 'tpl008-demo');
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
  const commands = TPL008_COMPONENTS.filter((c) => c.path.startsWith('Commands/')).map((c) => c.path.slice('Commands/'.length));
  const lines = [
    `# ${TEMPLATE_PROJECT_NAME}`,
    '',
    'The simplest todo list there is. There are no tags, projects, colours or due-date sorting. There is',
    'one list, and its order is **what you are going to do next** — which only you decide.',
    '',
    '- A new task goes in at the bottom. Move it up if it matters more.',
    '- Open a task to give it a deadline, next actions (in the same kind of order) and notes.',
    '- **Nothing is ever deleted.** You close a task by writing what happened — even',
    '  "not needed, dropping it" — and every move, note, rename, tick and close is kept in its history.',
    '',
    '## It needs a backend',
    '',
    'Your list lives in the NodeGX backend, so every device you sign in on sees the same one. In the',
    'editor, open **Backend Services**, start a local backend and connect this project to it, then press',
    '**Run**. The first screen asks you to sign in or create an account.',
    '',
    `⚠️ **Use a new backend for this project.** A backend installs \`${POLICY_FILE}\` only when it has no`,
    'security settings of its own yet, so one you have already used keeps its old rules.',
    '',
    `The access rules ship as \`${POLICY_FILE}\`:`,
    '',
    '- `Task`, `Action` and `Event` can be read and written by anyone signed in, and **creator owns** is on,',
    '  so each row is private to the person who made it.',
    '- `delete` is `nobody` on all three. The app has no delete button, and the backend refuses one.',
    '- 🔴 **`signup` is `public`**, so that you can make your account. If you deploy this for yourself,',
    '  create your account first and then set `signup` to `nobody`, or anyone who finds the address can',
    '  make one (they would only ever see their own list, but it is your server).',
    '',
    '## How it is built',
    '',
    `- **\`Commands/\`** — one component for each thing a person can do: ${commands.join(', ')}.`,
    '  Each one checks its input, writes the record, then writes a line of history. Read one and you have',
    '  read the pattern.',
    '- **`Logic/Write history`** is the only thing that writes to `Event`. Moving the same task several',
    '  times within two minutes updates one line ("Moved #5 → #2") rather than adding one per click.',
    '- **`Logic/Todo data`** holds the queries. **`Logic/Task rows`**, **`Logic/Selected task`** and',
    '  **`Logic/Log rows`** turn what they load into what the screen draws.',
    '- **`Todo/`** is everything you can see. **`Todo/Dialog flow`** asks "What happened?" before a close,',
    '  reopen, tick or untick. **`Pages/Todo`** places it all and wires the commands to it.',
    '- **Light and dark.** The page follows your system until you press the moon or sun at the top right',
    '  (`Todo/Theme switch`). Pick the theme your system already uses and it goes back to following it.',
    '  Both palettes are in `App`\'s CSS Definition; `App` also puts your choice back when the app opens.',
    '- **Deadline reminders.** `Todo/Reminders switch` is a bell that shows only when the page the app is served',
    '  from sets `data-reminders` on the root and provides `window.todoReminders` — a service worker, a push key',
    '  and a server that sends at 9am on the day a task is due. This project sends nothing by itself, so without',
    '  that host there is no bell. The host keeps each device in `PushSubscription`.',
    '- **The deadline field** is `Todo/Date picker`, the same part as the library\'s Date Picker: a real date',
    '  input with a calendar that drops down on a computer, and the device\'s own date picker on a phone. It',
    '  hands `Commands/Set deadline` a `YYYY-MM-DD` day when a date is picked, typed (on Enter or leaving the',
    '  field) or cleared.',
    '',
    '## The data',
    '',
    '| collection | fields |',
    '|---|---|',
    '| `Task` | `title`, `position` (lower = sooner), `status` (`open`/`done`), `deadline` (`YYYY-MM-DD`), `closingNote`, `closedAt` |',
    '| `Action` | `taskId`, `title`, `position`, `done`, `note`, `description` |',
    '| `Event` | `taskId`, `kind`, `summary`, `body`, `at` |',
    '| `PushSubscription` | `endpoint`, `p256dh`, `auth`, `timeZone`, `enabled`, `device` — one per device with reminders on |',
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
    `The **${TEMPLATE_PROJECT_NAME}** template with its backend taken out, so it can run on a web page with no server`,
    'and no account. It starts with an example list, and everything a visitor does stays in their own browser.',
    '',
    `🔴 **Generated — do not edit it by hand.** \`npm run template:todo\` writes it from the template's own`,
    'components beside `templates/todo-list/`. Change the template and regenerate, and the demo follows.',
    '',
    '## What is different from the template',
    '',
    `- **\`Logic/Todo data\`** reads the list from this browser's local storage (\`${DEMO_STORAGE_KEY}\`), and puts`,
    '  the example list there the first time it finds none.',
    '- **Every record write** in `Commands/` and `Logic/Write history` is a `Function` at the same place in the',
    '  graph, writing to that same storage. The commands, rows, dialog and history rules are the template\'s.',
    '- **There is no sign in.** The page reads the list when it opens. **Reset demo** in the header puts the',
    '  example list back.',
    '',
    `To keep a list on your phone and your computer, start from the **${TEMPLATE_PROJECT_NAME}** template, which keeps`,
    'it in the NodeGX backend.',
    ''
  ];
  const file = path.join(output, START_HERE_FILE);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, lines.join('\n') + '\n');
}
