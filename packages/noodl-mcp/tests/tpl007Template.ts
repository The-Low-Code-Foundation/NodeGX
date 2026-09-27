/**
 * TPL-007 — Rocket School as a project a person can start from.
 *
 * `tpl007Components.ts` is what the door is given; this file is the
 * composition. It authors the whole template into an empty project through the
 * real MCP server — **through the plan door** (`create_plan` →
 * `stage_plan_operation` × N → `apply_plan`), which is the route THE ORDER
 * names for anything bigger than a two-node fix, and which no earlier template
 * exercised. Every operation declares its interface (`inputs`, `outputs`,
 * `repeats`, `instantiates`) up front, so the plan validates the tree before a
 * node is written — and a component placed by a sibling that the plan did not
 * declare is a refusal, not a silent hole.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * ## 🔴 The kit is installed BEFORE authoring (TPL-005's measurement)
 *
 * The door validates every node type against the catalog, and a kit's nodes are
 * not in it until the kit is in the project's `noodl_modules/`. So
 * {@link installModules} runs before `create_plan`, and the same files are what
 * make the zip work on a machine that never installed `game-kit`.
 *
 * ## 🔴 The render is off, deliberately, and the reason is written down
 *
 * `apply_plan` refuses `render: "off"` for a visual plan unless
 * `NODEGX_RENDER_DISABLED=1` — a graph is a claim and a render is evidence. This
 * builder runs inside jest and `ts-node`, where the ~8s render per apply is
 * paid by every gate run; the evidence is collected once, by the drive script
 * against the built artefact, not by every regeneration. The env var is set
 * here, for this process, and named in the task file.
 *
 * ## Prepared, not embedded
 *
 * Richard's ruling (2026-09-12): the homepage demo and the zip. No `content.json`
 * compiled into the editor, no shelf row (`game` is none of the six ruled
 * category slugs, P78 T3).
 *
 * @module noodl-mcp/tests/tpl007Template
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
import { CURRICULUM, TEACH_CARDS } from './tpl007Curriculum';
import { APP_NODES, APP_WIRES, C, EDIT, PAGES, REQUIRED_MODULES, TPL007_COMPONENTS, Tpl007Component } from './tpl007Components';
import { TPL007_PRESET, TPL007_TOKENS } from './tpl007Theme';

export const TEMPLATE_ID = 'rocket-school';
export const TEMPLATE_PROJECT_NAME = 'Rocket School';
export const TEMPLATE_EPOCH = '2026-09-12T00:00:00.000Z';
export const START_HERE_FILE = 'docs/START-HERE.md';

const MODULE_LIBRARY = path.join(__dirname, '..', '..', '..', 'library', 'modules');

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
  modules: string[];
  /** What apply_plan reported, verbatim, for a caller that wants to assert on it. */
  applied: Record<string, unknown>;
}

function writeSkeleton(dir: string): void {
  fs.mkdirSync(path.join(dir, 'components'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'nodegx.project.json'),
    JSON.stringify(
      {
        $schema: 'https://opennoodl.dev/schemas/project-v2.json',
        name: TEMPLATE_PROJECT_NAME,
        version: '4',
        nodegxVersion: '1.1.0',
        settings: { htmlTitle: TEMPLATE_PROJECT_NAME, navigationPathType: 'path' },
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

/** Modules only this template ships (its bundled fonts), beside the template's source. */
export const TEMPLATE_MODULES = path.join(__dirname, 'tpl007Assets', 'noodl_modules');

/** Copy the required kits from `library/modules/<name>/project/noodl_modules/`, then the template's own modules, into the project. */
export function installModules(projectDir: string): string[] {
  const installed: string[] = [];
  const copyFrom = (from: string) => {
    for (const inner of fs.readdirSync(from)) {
      const target = path.join(projectDir, 'noodl_modules', inner);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.cpSync(path.join(from, inner), target, { recursive: true });
      installed.push(inner);
    }
  };
  for (const name of REQUIRED_MODULES) {
    const from = path.join(MODULE_LIBRARY, name, 'project', 'noodl_modules');
    if (!fs.existsSync(from)) throw new Error(`library module "${name}" is not at ${from}`);
    copyFrom(from);
  }
  // 🔴 RKT-002: the template's own fonts. Not a library card: nothing but this template uses them.
  copyFrom(TEMPLATE_MODULES);
  return installed;
}

export interface BuildOptions {
  /** Author with a different curriculum — the §8-style proof that the engine is data-driven. */
  components?: ReadonlyArray<Tpl007Component>;
  omitModules?: boolean;
}

/** Author the whole template through the plan door and read it back. */
export async function buildRocketTemplateProject(options: BuildOptions = {}): Promise<AuthoredTemplate> {
  process.env.NODEGX_RENDER_DISABLED = '1';
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tpl007-template-'));
  writeSkeleton(dir);
  const modules = options.omitModules ? [] : installModules(dir);
  const components = options.components ?? TPL007_COMPONENTS;

  const { server } = createServer({ projectDir: dir, allowWrites: true });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'tpl007-template', version: '0.0.0' });
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
      diagnostics.push({ component: label, code: String(d.code ?? ''), severity: String(d.severity ?? ''), message: String(d.message ?? '') });
    }
    return payload;
  };

  // The look first.
  await call('find_tools', { group: 'theme' }, 'theme:reveal');
  await call('set_style_preset', { preset_id: TPL007_PRESET }, 'theme:preset');
  if (TPL007_TOKENS.length) await call('set_project_tokens', { tokens: [...TPL007_TOKENS] }, 'theme:tokens');

  // The App shell, written directly: it is the router's home and the plan's pages register into it.
  const app = await call('create_component', { path: C.app, nodes: APP_NODES, connections: APP_WIRES }, C.app);
  order.push(C.app);
  if (app.registeredPages) registrations[C.app] = app.registeredPages as AuthoredTemplate['registrations'][string];

  // The plan: one operation per component, interfaces declared, then staged, then applied at once.
  const plan = await call(
    'create_plan',
    {
      request: 'Rocket School — a maths and typing game for 8-12 year olds, EN and FR, profiles in localStorage, no backend.',
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
    if (!found) throw new Error(`the plan has no operation for ${componentPath}; it has ${operations.map((o) => o.target).join(', ')}`);
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

  await client.close();
  await server.close();

  return { project: readAsLegacyProject(dir), order, planId, registrations, projectDir: dir, diagnostics, modules, applied };
}

// ── Preparing the directory a person is handed ───────────────────────────────

export function prepareRocketArtefact(built: AuthoredTemplate, output: string): void {
  pinRunOnValueChangeDefaultsInDirectory(built.projectDir);
  pinComponentFiles(built.projectDir, 'tpl007', TEMPLATE_EPOCH);
  pinRegistry(built.projectDir, TEMPLATE_EPOCH);

  if (path.basename(output) !== TEMPLATE_ID) throw new Error(`refusing to clear ${output}`);
  fs.rmSync(output, { recursive: true, force: true });
  copyTree(built.projectDir, output);

  if (fs.existsSync(path.join(output, 'components', '__cloud__'))) {
    throw new Error('refusing to write: this template ships no backend, and a __cloud__ component was authored');
  }
  for (const name of REQUIRED_MODULES) {
    if (!fs.existsSync(path.join(output, 'noodl_modules', name, 'index.js'))) {
      throw new Error(`refusing to write: noodl_modules/${name} is missing — the game would have no faces, no track, no sound`);
    }
  }

  writeStartHere(output);
  pinRootNode(output, C.app);
  pinProjectModified(output);
}

/** The project file carries a per-run `modified`; two builds must agree byte for byte. */
function pinProjectModified(output: string): void {
  const file = path.join(output, 'nodegx.project.json');
  const doc = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
  doc.modified = TEMPLATE_EPOCH;
  fs.writeFileSync(file, `${JSON.stringify(doc, null, 2)}\n`);
}

function writeStartHere(output: string): void {
  const traps = CURRICULUM.filter((s) => s.trap).length;
  const lines = [
    `# ${TEMPLATE_PROJECT_NAME}`,
    '',
    'Maths and typing practice for 8–12 year olds, in English and French, built entirely out of',
    'NodeGX nodes. Press **Run**, make a player, and race the computer to the planet.',
    '',
    'There is no backend. Profiles and progress live in this browser (localStorage), and every',
    'player has a **save code** to carry their progress to another computer.',
    '',
    '## The first thing to change',
    '',
    `Open **Data/Curriculum** and find the node labelled **"${EDIT}the skills — this list IS the school"**.`,
    'It is a `Static Data` node holding a JSON array; one entry is one skill:',
    '',
    '```json',
    '{',
    '  "id": "table-8", "level": "CE2", "strand": "calc",',
    '  "generator": "table", "params": { "table": 8, "min": 1, "max": 10, "bothWays": true },',
    '  "answer": "typed", "fluentMs": 3500, "diff": 0.6,',
    '  "name": { "en": "8 times table", "fr": "Table de 8" },',
    '  "strategy": { "en": "Times 8 is double, double, double.", "fr": "Fois 8, c’est doubler trois fois." },',
    '  "teach": "tables"',
    '}',
    '```',
    '',
    `Add an entry and every game can ask about it. ${CURRICULUM.length} skills ship, for CE2, CM1, CM2`,
    `and 6e — ${traps} of them built to catch a misconception (230 million written as 200,300,000;`,
    '0.25 "bigger" than 0.7; 52 − 38 = 26). The explainer a wrong answer opens is one entry in',
    `**Data/Teach cards** (${TEACH_CARDS.length} ship), and every word of the interface is one row in **Data/Words**.`,
    '',
    '## How the game works, in the graph',
    '',
    '- **`Logic/*` are the named utilities.** `Pick next question`, `Grade answer`, `Encode save code`',
    '  — each is a `Component Inputs` → one Function → `Component Outputs`. A page places them; no',
    '  page grows its own anonymous Function.',
    '- **The learner model is Elo.** `Grade answer` moves a rating up on a right answer (more when it',
    '  was fast), down on a wrong one, doubles a skill’s review interval on a right answer and halves',
    '  it on a miss. `Pick next question` serves a due review first, then a skill the player is',
    '  predicted to get right about three times in four. Mastery climbs new → familiar → solid →',
    '  mastered, and drops after two misses.',
    '- **Speed never scores without accuracy.** A wrong answer moves nothing, however fast.',
    '- **There is no clock node, and no game loop.** The rockets glide with `Animate To Value`; the',
    '  countdown is one `Delay` and one `Animate To Value` (`Game/Countdown bar`).',
    '- **Every decision is a `Condition`.** Right or wrong, whose turn, did a rocket land, is the',
    '  race over — each one is a gate you can open and follow.',
    '',
    '## A library module travels with this project',
    '',
    '`noodl_modules/game-kit` draws the faces, the race track and the keyboard, and plays the',
    'sounds. It is already here — nothing to install. **Do not delete it.** Faces are DiceBear',
    '(MIT; three of the five styles are CC BY 4.0 artwork — see the kit’s README).',
    '`noodl_modules/keyboard-shortcuts` turns the arrow keys into Make Ten Merge’s slides.',
    '',
    '## What is here, and what is next',
    '',
    'Profiles, Home, the **Rocket Race** (maths or typing, one player against the computer or two',
    'taking turns, practice or timed challenge), **Make Ten Merge** (slide with the arrows or the',
    'buttons; two tiles join only when they make 10, 20, 30…), **Number Hunt** (five grids of',
    'numbers; tap the ones that make the target, and find every way), **Monster Gate** (three monsters',
    'at your gate, three hearts: beat each one to the gate with right answers, or push it back into its',
    'cave; every number of its rules is `MONSTER` in one script) and the Hangar. The Teach cards page,',
    'Progress with the save code, and the question-set editor are the next pages; the parts they share',
    'are already in `Game/` and `Logic/`.'
  ];
  const file = path.join(output, START_HERE_FILE);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, lines.join('\n') + '\n');
}

export const PAGE_COUNT = PAGES.length;
